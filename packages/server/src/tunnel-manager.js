'use strict';

const redis      = require('./redis');
const subdomains = require('./subdomains');

const TTL_HOURS = parseInt(process.env.TUNNEL_TTL_HOURS || '24', 10);
const TTL_SEC   = TTL_HOURS * 3600;

// In-memory maps — Redis holds persistent state; memory holds live state
const socketMap  = new Map(); // subdomain → ws
const dataMap    = new Map(); // subdomain → tunnelData (cached, avoids Redis per-request)
const pendingMap = new Map(); // requestId → callback

async function register(ws, { port, password, ip, resumeSubdomain }) {
  let subdomain;
  let tunnelData;
  let remainingMs;

  // Try to resume the previous subdomain if the client requests it
  if (resumeSubdomain && !subdomains.isReserved(resumeSubdomain)) {
    const existing = await redis.getTunnel(resumeSubdomain);
    if (existing && existing.ip === ip) {
      subdomain   = resumeSubdomain;
      remainingMs = existing.expiresAt - Date.now();

      if (remainingMs > 0) {
        // Reuse existing tunnel — update socket, keep original expiry
        tunnelData = { ...existing, port };
        await redis.setTunnel(subdomain, tunnelData, Math.ceil(remainingMs / 1000));
        socketMap.set(subdomain, ws);
        dataMap.set(subdomain, tunnelData);

        const baseDomain = process.env.BASE_DOMAIN || 'yourdomain.com';
        const protocol   = process.env.NODE_ENV === 'production' ? 'https' : 'http';
        const url        = `${protocol}://${subdomain}.${baseDomain}`;

        ws.send(JSON.stringify({
          type:      'registered',
          subdomain,
          url,
          expiresAt: existing.expiresAt,
          resumed:   true,
        }));

        attachHandlers(ws, subdomain, remainingMs);
        console.log(`[tunnel] resumed: ${url} → localhost:${port} (ip: ${ip})`);
        return;
      }
    }
  }

  // No valid resume — allocate a new subdomain
  let attempts = 0;
  do {
    subdomain = subdomains.generate();
    attempts++;
    if (attempts > 20) {
      ws.send(JSON.stringify({ type: 'error', message: 'Could not allocate subdomain. Try again.' }));
      ws.close();
      return;
    }
  } while (subdomains.isReserved(subdomain) || socketMap.has(subdomain));

  const baseDomain = process.env.BASE_DOMAIN || 'yourdomain.com';
  const protocol   = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const url        = `${protocol}://${subdomain}.${baseDomain}`;
  const expiresAt  = Date.now() + TTL_SEC * 1000;

  tunnelData = {
    subdomain,
    port,
    ip,
    password:  password || null,
    createdAt: Date.now(),
    expiresAt,
    requestCount: 0,
  };

  await redis.setTunnel(subdomain, tunnelData, TTL_SEC);
  socketMap.set(subdomain, ws);
  dataMap.set(subdomain, tunnelData);

  ws.send(JSON.stringify({ type: 'registered', subdomain, url, expiresAt }));

  attachHandlers(ws, subdomain, TTL_SEC * 1000);
  console.log(`[tunnel] registered: ${url} → localhost:${port} (ip: ${ip})`);
}

function attachHandlers(ws, subdomain, ttlMs) {
  const expireTimer = setTimeout(async () => {
    ws.send(JSON.stringify({ type: 'expired' }));
    await cleanup(subdomain);
    ws.close();
  }, ttlMs);

  ws.on('message', (raw) => handleMessage(raw));

  ws.on('close', async () => {
    clearTimeout(expireTimer);
    // Keep Redis entry for resume; remove live maps
    socketMap.delete(subdomain);
    dataMap.delete(subdomain);
    console.log(`[tunnel] disconnected: ${subdomain}`);
  });

  ws.on('error', () => {
    clearTimeout(expireTimer);
    socketMap.delete(subdomain);
    dataMap.delete(subdomain);
  });
}

function handleMessage(raw) {
  let msg;
  try { msg = JSON.parse(raw); } catch { return; }

  if (msg.type === 'response' && msg.id) {
    const resolve = pendingMap.get(msg.id);
    if (resolve) {
      pendingMap.delete(msg.id);
      resolve(msg);
    }
  }
}

function getSocket(subdomain) {
  return socketMap.get(subdomain) || null;
}

function addPending(id, resolve) {
  pendingMap.set(id, resolve);
}

function removePending(id) {
  pendingMap.delete(id);
}

function getTunnelData(subdomain) {
  return dataMap.get(subdomain) || null;
}

async function cleanup(subdomain) {
  socketMap.delete(subdomain);
  dataMap.delete(subdomain);
  await redis.deleteTunnel(subdomain).catch(() => {});
}

function count() {
  return socketMap.size;
}

module.exports = { register, getSocket, getTunnelData, addPending, removePending, count };
