'use strict';

require('dotenv').config();

const http          = require('http');
const { WebSocketServer } = require('ws');
const redis         = require('./redis');
const tunnelManager = require('./tunnel-manager');
const proxy         = require('./proxy');

const PORT      = parseInt(process.env.PORT      || '4000', 10);
const BASE_DOMAIN = process.env.BASE_DOMAIN || 'yourdomain.com';
const API_DOMAIN  = process.env.API_DOMAIN  || `api.${BASE_DOMAIN}`;

const RATE_LIMIT_WINDOW  = parseInt(process.env.RATE_LIMIT_WINDOW_MS    || '60000', 10);
const RATE_LIMIT_MAX     = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '200',   10);
const MAX_TUNNELS_PER_IP = parseInt(process.env.MAX_TUNNELS_PER_IP || '5', 10);

const ipTunnelCount = new Map();

function clientIP(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

// ── Main HTTP server ─────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const host = (req.headers.host || '').split(':')[0];
  const ip   = clientIP(req);

  // Rate limiting
  const reqCount = await redis.incrementIP(ip, RATE_LIMIT_WINDOW).catch(() => 0);
  if (reqCount > RATE_LIMIT_MAX) {
    res.writeHead(429, { 'Content-Type': 'text/plain', 'Retry-After': '60' });
    res.end('Too many requests');
    return;
  }

  // Health check
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', tunnels: tunnelManager.count() }));
    return;
  }

  // Only respond to known domains
  if (!host.endsWith(BASE_DOMAIN)) {
    res.writeHead(400);
    res.end('Bad request');
    return;
  }

  const subdomain = host.replace(`.${BASE_DOMAIN}`, '');

  // API domain — public status endpoint
  if (subdomain === 'api' || host === API_DOMAIN) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const statusMatch = req.url.match(/^\/api\/status\/([a-z0-9]+)$/);
    if (statusMatch && req.method === 'GET') {
      const target = statusMatch[1];
      const tunnel = await redis.getTunnel(target).catch(() => null);
      if (!tunnel) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Tunnel not found or expired' }));
        return;
      }
      const active    = !!tunnelManager.getSocket(target);
      const protocol  = process.env.NODE_ENV === 'production' ? 'https' : 'http';
      res.writeHead(200);
      res.end(JSON.stringify({
        subdomain:    target,
        url:          `${protocol}://${target}.${BASE_DOMAIN}`,
        active,
        expiresAt:    tunnel.expiresAt,
        requestCount: tunnel.requestCount || 0,
        createdAt:    tunnel.createdAt,
      }));
      return;
    }

    res.writeHead(200);
    res.end(JSON.stringify({ service: 'kshare', tunnels: tunnelManager.count() }));
    return;
  }

  // Tunnel proxy
  await proxy.handle(req, res, subdomain);
});

// ── WebSocket — tunnel registration ─────────────────────────────────────────
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', async (req, socket, head) => {
  const ip = clientIP(req);

  if (req.url !== '/connect') {
    socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
    socket.destroy();
    return;
  }

  const current = ipTunnelCount.get(ip) || 0;
  if (current >= MAX_TUNNELS_PER_IP) {
    socket.write('HTTP/1.1 429 Too Many Tunnels\r\n\r\n');
    socket.destroy();
    return;
  }

  wss.handleUpgrade(req, socket, head, async (ws) => {
    ipTunnelCount.set(ip, (ipTunnelCount.get(ip) || 0) + 1);

    ws.once('close', () => {
      const n = ipTunnelCount.get(ip) || 1;
      if (n <= 1) ipTunnelCount.delete(ip);
      else ipTunnelCount.set(ip, n - 1);
    });

    ws.once('message', async (raw) => {
      let msg;
      try { msg = JSON.parse(raw); } catch {
        ws.close(1008, 'Invalid message');
        return;
      }

      if (msg.type !== 'register' || !msg.port) {
        ws.close(1008, 'Expected register message');
        return;
      }

      const port = parseInt(msg.port, 10);
      if (isNaN(port) || port < 1 || port > 65535) {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid port number' }));
        ws.close();
        return;
      }

      await tunnelManager.register(ws, {
        port,
        password:        msg.password        || null,
        resumeSubdomain: msg.resumeSubdomain || null,
        ip,
      });
    });
  });
});

// ── Startup ──────────────────────────────────────────────────────────────────
async function start() {
  await redis.connect();
  server.listen(PORT, () => {
    console.log(`[kshare] tunnel server on port ${PORT} — domain: ${BASE_DOMAIN}`);
  });
}

start().catch((err) => {
  console.error('[kshare] fatal startup error:', err.message);
  process.exit(1);
});
