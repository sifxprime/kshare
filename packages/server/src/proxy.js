'use strict';

const tunnelManager = require('./tunnel-manager');

const TIMEOUT_MS      = parseInt(process.env.PROXY_TIMEOUT_MS || '30000', 10);
const MAX_BODY_BYTES   = parseInt(process.env.MAX_BODY_SIZE_MB || '10', 10) * 1024 * 1024;

// Simple ID generator — no external dep
let _reqSeq = 0;
function nextId() {
  return `r${Date.now()}_${(++_reqSeq).toString(36)}`;
}

function expiredPage(subdomain) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Link expired — KShare</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%23080808'/%3E%3Cpolyline points='7,7 17,16 7,25' stroke='%23ffffff' stroke-width='2.5' stroke-opacity='.18' stroke-linecap='round' stroke-linejoin='round' fill='none'/%3E%3Cpolyline points='13,6 26,16 13,26' stroke='%23a3e635' stroke-width='4.5' stroke-linecap='round' stroke-linejoin='round' fill='none'/%3E%3C/svg%3E">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Space Grotesk',-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
         background:#080808;color:#94a3b8;
         display:flex;align-items:center;justify-content:center;min-height:100vh;
         -webkit-font-smoothing:antialiased}
    .card{text-align:center;padding:3rem 2rem;max-width:420px}
    .brand{display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:2.5rem}
    .brand-text{text-align:left;line-height:1}
    .brand-name{display:block;font-size:.95rem;font-weight:700;letter-spacing:.12em;color:#fff}
    .brand-by{display:block;font-size:.58rem;font-weight:500;letter-spacing:.14em;color:#475569;margin-top:2px}
    h1{font-size:1.2rem;font-weight:600;color:#e2e8f0;margin-bottom:.75rem}
    p{font-size:.88rem;line-height:1.65}
    code{background:#111;border:1px solid #1f2937;padding:.15rem .45rem;border-radius:.25rem;font-size:.82rem;color:#60a5fa;font-family:'JetBrains Mono',monospace}
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">
      <svg viewBox="42 28 60 64" width="32" height="32" style="display:block;flex-shrink:0" aria-hidden="true">
        <polyline points="49,38 68,60 49,82" stroke="#ffffff" stroke-width="3.5" stroke-opacity="0.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <polyline points="64,35 95,60 64,85" stroke="#ffffff" stroke-width="11" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      </svg>
      <div class="brand-text">
        <span class="brand-name">KSHARE</span>
        <span class="brand-by">by KODELYTH</span>
      </div>
    </div>
    <h1>This link has expired</h1>
    <p>Tunnel <code>${subdomain}</code> no longer exists.<br>
    Links expire after 24 hours automatically.</p>
  </div>
</body>
</html>`;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        req.destroy();
        reject(new Error('Request body too large'));
        return;
      }
      chunks.push(chunk);
    });

    req.on('end',   () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function sanitizeRequestHeaders(headers) {
  const out = { ...headers };
  // Remove hop-by-hop headers
  delete out['host'];
  delete out['connection'];
  delete out['keep-alive'];
  delete out['proxy-authenticate'];
  delete out['proxy-authorization'];
  delete out['te'];
  delete out['trailers'];
  delete out['transfer-encoding'];
  delete out['upgrade'];
  return out;
}

function sanitizeResponseHeaders(headers) {
  const out = { ...headers };
  delete out['connection'];
  delete out['keep-alive'];
  delete out['transfer-encoding'];
  // Remove any server-identifying headers
  delete out['x-powered-by'];
  return out;
}

async function handle(req, res, subdomain) {
  const ws = tunnelManager.getSocket(subdomain);

  if (!ws) {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(expiredPage(subdomain));
    return;
  }

  // Check password protection — use in-memory cache, no Redis round-trip
  const tunnelData = tunnelManager.getTunnelData(subdomain);
  if (tunnelData?.password) {
    const authHeader = req.headers['authorization'] || '';
    const provided   = Buffer.from(authHeader.replace('Basic ', ''), 'base64').toString();
    const expected   = `:${tunnelData.password}`;

    if (provided !== expected) {
      res.writeHead(401, {
        'WWW-Authenticate': `Basic realm="KShare: ${subdomain}"`,
        'Content-Type': 'text/plain',
      });
      res.end('Password required');
      return;
    }
  }

  // Read body
  let body;
  try {
    body = await readBody(req);
  } catch {
    res.writeHead(413);
    res.end('Request too large');
    return;
  }

  const id = nextId();

  const requestMsg = {
    type:    'request',
    id,
    method:  req.method,
    path:    req.url,
    headers: sanitizeRequestHeaders(req.headers),
    body:    body.length ? body.toString('base64') : null,
  };

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      tunnelManager.removePending(id);
      if (!res.headersSent) {
        res.writeHead(504, { 'Content-Type': 'text/plain' });
        res.end('Tunnel timeout — local server did not respond in time');
      }
      resolve();
    }, TIMEOUT_MS);

    tunnelManager.addPending(id, (response) => {
      clearTimeout(timer);
      // fire-and-forget — don't hold the response
      tunnelManager.incrementRequests && tunnelManager.incrementRequests(subdomain);

      if (!res.headersSent) {
        res.writeHead(response.status, sanitizeResponseHeaders(response.headers || {}));
        if (response.body) {
          res.end(Buffer.from(response.body, 'base64'));
        } else {
          res.end();
        }
      }
      resolve();
    });

    ws.send(JSON.stringify(requestMsg));
  });
}

module.exports = { handle };
