'use strict';

require('dotenv').config();

const http          = require('http');
const { WebSocketServer } = require('ws');
const redis         = require('./redis');
const tunnelManager = require('./tunnel-manager');
const proxy         = require('./proxy');

const FAVICON_SVG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%23080808'/%3E%3Cpolyline points='7,7 17,16 7,25' stroke='%23ffffff' stroke-width='2.5' stroke-opacity='.18' stroke-linecap='round' stroke-linejoin='round' fill='none'/%3E%3Cpolyline points='13,6 26,16 13,26' stroke='%23a3e635' stroke-width='4.5' stroke-linecap='round' stroke-linejoin='round' fill='none'/%3E%3C/svg%3E";

function homePage(domain) {
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const siteUrl  = `${protocol}://${domain}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>KShare — Share localhost instantly. By KODELYTH.</title>
  <meta name="description" content="Turn any localhost port into a public HTTPS link in one command. No signup. No config. Self-hostable. KShare by KODELYTH.">
  <meta name="keywords" content="localhost tunnel, ngrok alternative, port forwarding, developer tools, self-hosted tunnel, kshare, kodelyth">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="${siteUrl}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${siteUrl}">
  <meta property="og:title" content="KShare — Share localhost instantly">
  <meta property="og:description" content="Turn any localhost port into a public HTTPS link in one command. No signup. No config. Self-hostable.">
  <meta property="og:site_name" content="KShare by KODELYTH">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="KShare — Share localhost instantly">
  <meta name="twitter:description" content="One command. A public HTTPS link in seconds. No signup, no config, no cloud account.">
  <link rel="icon" type="image/svg+xml" href="${FAVICON_SVG}">
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"SoftwareApplication","name":"KShare","applicationCategory":"DeveloperApplication","operatingSystem":"Windows, macOS, Linux","description":"Turn any localhost port into a public HTTPS link in one command.","url":"${siteUrl}","author":{"@type":"Organization","name":"KODELYTH"},"license":"https://opensource.org/licenses/MIT","offers":{"@type":"Offer","price":"0","priceCurrency":"USD"}}</script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    :root{
      --bg:#080808;--surface:#0f0f0f;--border:#1c1c1c;
      --text:#f1f5f9;--text2:#64748b;--muted:#334155;
      --lime:#a3e635;--lime-dim:rgba(163,230,53,.08);--lime-border:rgba(163,230,53,.2);
      --blue:#60a5fa;--mono:'JetBrains Mono','Courier New',monospace;
      --sans:system-ui,-apple-system,'Segoe UI',sans-serif;
    }
    html,body{background:var(--bg);color:var(--text);font-family:var(--sans);
      -webkit-font-smoothing:antialiased;min-height:100vh}
    a{color:inherit;text-decoration:none}

    /* layout */
    .page{max-width:680px;margin:0 auto;padding:3.5rem 1.5rem 5rem}

    /* nav */
    nav{display:flex;align-items:center;justify-content:space-between;
        padding:1.25rem 1.5rem;border-bottom:1px solid var(--border);
        position:sticky;top:0;background:rgba(8,8,8,.92);backdrop-filter:blur(8px);z-index:10}
    .brand{display:flex;align-items:center;gap:9px}
    .brand-name{font-size:.88rem;font-weight:700;letter-spacing:.12em;color:#fff}
    .brand-by{font-size:.58rem;font-weight:500;letter-spacing:.14em;color:var(--muted);text-transform:uppercase;margin-top:2px}
    .nav-link{font-size:.78rem;color:var(--text2);letter-spacing:.03em;
              border:1px solid var(--border);padding:.3rem .75rem;border-radius:6px;
              transition:border-color .15s,color .15s}
    .nav-link:hover{border-color:#2e2e2e;color:var(--text)}

    /* hero */
    .badge{display:inline-flex;align-items:center;gap:7px;
           border:1px solid var(--lime-border);background:var(--lime-dim);
           border-radius:99px;padding:.25rem .85rem;margin-bottom:2rem}
    .badge-dot{width:6px;height:6px;border-radius:50%;background:var(--lime);
               box-shadow:0 0 6px var(--lime);animation:blink 2s ease-in-out infinite}
    @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
    .badge-text{font-size:.72rem;font-weight:500;letter-spacing:.06em;color:var(--lime)}
    h1{font-size:clamp(2.2rem,6vw,3.4rem);font-weight:800;letter-spacing:-.03em;line-height:1.1;margin-bottom:1.25rem}
    h1 span{color:var(--lime)}
    .tagline{font-size:1.05rem;color:var(--text2);line-height:1.65;margin-bottom:2.5rem;max-width:520px}

    /* command */
    .cmd-wrap{background:var(--surface);border:1.5px solid var(--lime-border);
              border-radius:10px;padding:1rem 1.25rem;display:flex;align-items:center;
              gap:12px;margin-bottom:3rem;font-family:var(--mono);font-size:.9rem}
    .cmd-dollar{color:#475569}
    .cmd-npx{color:#94a3b8}
    .cmd-pkg{color:var(--text)}
    .cmd-flag{color:var(--lime)}

    /* features */
    .features{display:grid;gap:.75rem;margin-bottom:3rem}
    .feat{display:flex;align-items:flex-start;gap:12px;
          border:1px solid var(--border);border-radius:8px;padding:.9rem 1rem}
    .feat-dot{width:6px;height:6px;border-radius:50%;background:var(--lime);flex-shrink:0;margin-top:5px}
    .feat-label{font-size:.85rem;color:var(--text2);line-height:1.5}
    .feat-label strong{color:var(--text);font-weight:600}

    /* install options */
    .section-title{font-size:.65rem;font-weight:700;letter-spacing:.12em;
                   text-transform:uppercase;color:var(--muted);margin-bottom:.75rem}
    .code-block{background:var(--surface);border:1px solid var(--border);border-radius:8px;
                padding:.85rem 1.1rem;font-family:var(--mono);font-size:.82rem;
                color:var(--text2);margin-bottom:2rem}
    .code-block .hl{color:var(--lime)}
    .code-block .cm{color:#374151}

    /* footer */
    footer{padding:2rem 1.5rem;border-top:1px solid var(--border);
           display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem}
    .footer-brand{font-size:.72rem;color:var(--muted);letter-spacing:.06em}
    .footer-links{display:flex;gap:1.5rem}
    .footer-links a{font-size:.72rem;color:var(--muted);letter-spacing:.03em;
                    transition:color .15s}
    .footer-links a:hover{color:var(--text2)}
  </style>
</head>
<body>

<nav>
  <div class="brand">
    <svg viewBox="42 28 60 64" width="22" height="22" style="display:block;flex-shrink:0" aria-hidden="true">
      <polyline points="49,38 68,60 49,82" stroke="#fff" stroke-width="3.5" stroke-opacity=".18" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <polyline points="64,35 95,60 64,85" stroke="#a3e635" stroke-width="11" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    </svg>
    <div>
      <div class="brand-name">KSHARE</div>
      <div class="brand-by">by KODELYTH</div>
    </div>
  </div>
  <a class="nav-link" href="https://github.com/sifxprime/kshare" target="_blank" rel="noopener">GitHub</a>
</nav>

<div class="page">

  <div class="badge">
    <span class="badge-dot"></span>
    <span class="badge-text">Open source &nbsp;&middot;&nbsp; Free &nbsp;&middot;&nbsp; Self-hostable</span>
  </div>

  <h1>Share localhost.<br><span>Instantly.</span></h1>

  <p class="tagline">
    One command turns any local port into a public HTTPS link.
    No signup, no config, no cloud account required.
    Works with React, Next.js, Django, Rails, Laravel — any app.
  </p>

  <div class="cmd-wrap" aria-label="Install command">
    <span class="cmd-dollar">$</span>
    <span class="cmd-npx">npx</span>
    <span class="cmd-pkg">&nbsp;@sifxprime/kshare</span>
    <span class="cmd-flag">&nbsp;--port 3000</span>
  </div>

  <div class="features">
    <div class="feat">
      <span class="feat-dot"></span>
      <span class="feat-label"><strong>HTTPS by default</strong> — Every tunnel gets a valid TLS certificate. Share with clients and webhooks without any extra setup.</span>
    </div>
    <div class="feat">
      <span class="feat-dot"></span>
      <span class="feat-label"><strong>Same URL on reconnect</strong> — Your subdomain is reserved for 24 hours. Disconnect and reconnect; the URL stays the same.</span>
    </div>
    <div class="feat">
      <span class="feat-dot"></span>
      <span class="feat-label"><strong>Local dashboard</strong> — A live request inspector runs at <code style="font-family:var(--mono);font-size:.8em;color:var(--blue)">localhost:4040</code> so you can see every hit in real time.</span>
    </div>
    <div class="feat">
      <span class="feat-dot"></span>
      <span class="feat-label"><strong>Password protection</strong> — Add <code style="font-family:var(--mono);font-size:.8em;color:var(--lime)">--password secret</code> to restrict access to your tunnel.</span>
    </div>
    <div class="feat">
      <span class="feat-dot"></span>
      <span class="feat-label"><strong>Self-hostable</strong> — Deploy the server on your own VPS in minutes. You own the domain, you own the data.</span>
    </div>
    <div class="feat">
      <span class="feat-dot"></span>
      <span class="feat-label"><strong>Zero dependencies at runtime</strong> — The CLI uses only <code style="font-family:var(--mono);font-size:.8em;color:var(--blue)">ws</code> and <code style="font-family:var(--mono);font-size:.8em;color:var(--blue)">chalk</code>. Fast install, small footprint.</span>
    </div>
  </div>

  <div class="section-title">Quick start</div>
  <div class="code-block">
    <div class="cm"># share port 3000</div>
    <div><span class="hl">npx @sifxprime/kshare --port 3000</span></div>
    <br>
    <div class="cm"># with a password</div>
    <div><span class="hl">npx @sifxprime/kshare --port 8080 --password mySecret</span></div>
    <br>
    <div class="cm"># install globally</div>
    <div>npm install -g @sifxprime/kshare</div>
    <div>kshare --port 3000</div>
  </div>

  <div class="section-title">Self-hosting</div>
  <div class="code-block">
    <div class="cm"># point a wildcard subdomain at your VPS, then:</div>
    <div>git clone https://github.com/sifxprime/kshare</div>
    <div>cd kshare/packages/server</div>
    <div>cp .env.example .env &amp;&amp; <span class="hl">nano .env</span></div>
    <div>npm install &amp;&amp; npm start</div>
    <br>
    <div class="cm"># then use your own server from the CLI:</div>
    <div>kshare --port 3000 --server <span class="hl">wss://api.yourdomain.com</span></div>
  </div>

</div>

<footer>
  <span class="footer-brand">KODELYTH &mdash; Build Everything</span>
  <div class="footer-links">
    <a href="https://github.com/sifxprime/kshare" target="_blank" rel="noopener">GitHub</a>
    <a href="https://www.npmjs.com/package/@sifxprime/kshare" target="_blank" rel="noopener">npm</a>
    <a href="https://github.com/sifxprime/kshare/blob/main/docs/vps-setup.md" target="_blank" rel="noopener">Self-host guide</a>
  </div>
</footer>

</body>
</html>`;
}

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

  // Root domain homepage (kodelyth.net or www.kodelyth.net)
  if (host === BASE_DOMAIN || subdomain === 'www') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(homePage(BASE_DOMAIN));
    return;
  }

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
