'use strict';

const http             = require('http');
const zlib             = require('zlib');
const { promisify }    = require('util');
const WebSocket        = require('ws');
const display          = require('./display');
const config           = require('./config');
const localDashboard   = require('./local-dashboard');

const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECTS     = 10;
const REQUEST_TIMEOUT_MS = 30000;

const gunzip           = promisify(zlib.gunzip);
const inflate          = promisify(zlib.inflate);
const brotliDecompress = promisify(zlib.brotliDecompress);

const REWRITABLE_TYPES = /text\/html|text\/css|application\/javascript|text\/javascript|application\/json|text\/plain|image\/svg\+xml/;

async function decompress(buffer, encoding) {
  if (!encoding) return buffer;
  const enc = encoding.toLowerCase();
  if (enc === 'gzip')    return gunzip(buffer);
  if (enc === 'deflate') return inflate(buffer);
  if (enc === 'br')      return brotliDecompress(buffer);
  return buffer;
}

function rewriteText(text, port, publicUrl) {
  const publicWs = publicUrl.replace(/^https?:\/\//, 'wss://');
  const origins = [
    [`wss://localhost:${port}`,   publicWs],
    [`ws://localhost:${port}`,    publicWs],
    [`wss://127.0.0.1:${port}`,  publicWs],
    [`ws://127.0.0.1:${port}`,   publicWs],
    [`https://localhost:${port}`, publicUrl],
    [`http://localhost:${port}`,  publicUrl],
    [`https://127.0.0.1:${port}`, publicUrl],
    [`http://127.0.0.1:${port}`,  publicUrl],
    [`//localhost:${port}`,       publicUrl.replace(/^https?:/, '')],
    [`//127.0.0.1:${port}`,       publicUrl.replace(/^https?:/, '')],
  ];
  let out = text;
  for (const [from, to] of origins) out = out.split(from).join(to);
  return out;
}

function rewriteHeaders(headers, port, publicUrl) {
  const out = { ...headers };

  // Rewrite redirect Location header
  if (out['location']) {
    out['location'] = rewriteText(out['location'], port, publicUrl);
  }

  // Fix Set-Cookie: strip Domain=localhost so cookies bind to tunnel domain
  if (out['set-cookie']) {
    const cookies = Array.isArray(out['set-cookie']) ? out['set-cookie'] : [out['set-cookie']];
    out['set-cookie'] = cookies.map(c =>
      c.replace(/;\s*Domain=localhost/gi, '')
       .replace(/;\s*Domain=127\.0\.0\.1/gi, '')
    );
  }

  return out;
}

async function forwardToLocal(port, requestData, publicUrl) {
  return new Promise((resolve) => {
    let body = null;
    if (requestData.body) {
      body = Buffer.from(requestData.body, 'base64');
    }

    const options = {
      hostname: '127.0.0.1',
      port,
      path:    requestData.path,
      method:  requestData.method,
      headers: { ...requestData.headers, host: `localhost:${port}` },
    };

    const req = http.request(options, async (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', async () => {
        let responseBody  = Buffer.concat(chunks);
        let headers       = rewriteHeaders(res.headers, port, publicUrl);
        const contentType = headers['content-type'] || '';
        const encoding    = headers['content-encoding'] || '';

        if (publicUrl && REWRITABLE_TYPES.test(contentType)) {
          try {
            const decoded   = await decompress(responseBody, encoding);
            const rewritten = rewriteText(decoded.toString('utf8'), port, publicUrl);
            responseBody    = Buffer.from(rewritten, 'utf8');
            delete headers['content-encoding'];
            headers['content-length'] = String(responseBody.length);
          } catch {
            // decompress/rewrite failed — send original unchanged
          }
        }

        resolve({
          status:  res.statusCode,
          headers,
          body:    responseBody.length ? responseBody.toString('base64') : null,
        });
      });
    });

    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      req.destroy();
      resolve({ status: 504, headers: {}, body: null });
    });

    req.on('error', () => {
      resolve({
        status: 502,
        headers: { 'content-type': 'text/plain' },
        body: Buffer.from('Local server not responding').toString('base64'),
      });
    });

    if (body) req.write(body);
    req.end();
  });
}

async function startTunnel({ port, password, showQR }) {
  await display.printBanner();

  let reconnects        = 0;
  let publicUrl         = null;
  let assignedSubdomain = null;
  let dashboard         = null;

  // Start local web dashboard (non-fatal if port is busy)
  localDashboard.start(4040).then((d) => {
    dashboard = d;
    if (dashboard) dashboard.setState({ port });
  });

  function connect() {
    const serverUrl = config.serverUrl();
    const ws = new WebSocket(`${serverUrl}/connect`);

    ws.on('open', () => {
      reconnects = 0;
      ws.send(JSON.stringify({
        type:             'register',
        port,
        password:         password || null,
        resumeSubdomain:  assignedSubdomain || null,
      }));
    });

    ws.on('message', async (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw);
      } catch {
        return;
      }

      if (msg.type === 'registered') {
        publicUrl         = msg.url;
        assignedSubdomain = msg.subdomain;
        await display.printConnected({
          url: msg.url, port, expiresAt: msg.expiresAt,
          resumed: msg.resumed, subdomain: msg.subdomain,
          dashboardPort: dashboard?.port || null,
        });
        if (showQR) await display.printQR(msg.url);

        if (dashboard) {
          dashboard.setState({ url: msg.url, connected: true, expiresAt: msg.expiresAt, port });
        }

        const warnIn = msg.expiresAt - Date.now() - 5 * 60 * 1000;
        if (warnIn > 0) {
          setTimeout(() => display.printInfo('Tunnel expires in 5 minutes'), warnIn);
        }
        return;
      }

      if (msg.type === 'request') {
        const t0       = Date.now();
        const response = await forwardToLocal(port, msg, publicUrl);
        const elapsed  = Date.now() - t0;
        display.printRequest(msg.method, msg.path, response.status, elapsed);
        if (dashboard) dashboard.logRequest(msg.method, msg.path, response.status);
        ws.send(JSON.stringify({ type: 'response', id: msg.id, ...response }));
        return;
      }

      if (msg.type === 'expired') {
        await display.printExpired();
        ws.close();
        process.exit(0);
        return;
      }

      if (msg.type === 'error') {
        await display.printError(msg.message);
      }
    });

    ws.on('close', () => {
      if (dashboard) dashboard.setState({ connected: false });
      if (reconnects >= MAX_RECONNECTS) {
        display.printError('Lost connection to server. Max retries reached.');
        process.exit(1);
      }
      reconnects++;
      display.printInfo(`Connection lost. Reconnecting in ${RECONNECT_DELAY_MS / 1000}s...`);
      setTimeout(connect, RECONNECT_DELAY_MS);
    });

    ws.on('error', (err) => {
      display.printError(`Cannot reach tunnel server: ${err.message}`);
    });
  }

  connect();
}

module.exports = { startTunnel };
