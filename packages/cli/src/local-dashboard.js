'use strict';

const http = require('http');

const MAX_LOG = 200;

function buildHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>KShare — Dashboard</title>
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%23080808'/%3E%3Cpolyline points='7,7 17,16 7,25' stroke='%23ffffff' stroke-width='2.5' stroke-opacity='.18' stroke-linecap='round' stroke-linejoin='round' fill='none'/%3E%3Cpolyline points='13,6 26,16 13,26' stroke='%23a3e635' stroke-width='4.5' stroke-linecap='round' stroke-linejoin='round' fill='none'/%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{
  --bg:#080808;
  --surface:#0f0f0f;
  --surface2:#141414;
  --surface3:#1a1a1a;
  --border:#1c1c1c;
  --border2:#252525;
  --border3:#2e2e2e;
  --text:#f2f2f2;
  --text2:#a0a0a0;
  --muted:#555;
  --dim:#2e2e2e;
  --lime:#a3e635;
  --lime-dim:rgba(163,230,53,.12);
  --lime-glow:rgba(163,230,53,.08);
  --blue:#60a5fa;
  --yellow:#fbbf24;
  --red:#f87171;
  --orange:#fb923c;
  --mono:'JetBrains Mono',monospace;
  --sans:'Space Grotesk',system-ui,sans-serif;
  --radius:8px;
}

html,body{
  background:var(--bg);
  color:var(--text);
  font-family:var(--sans);
  font-size:13px;
  line-height:1.5;
  -webkit-font-smoothing:antialiased;
  height:100%;
  overflow:hidden;
}

/* ── Layout ── */
.shell{display:flex;flex-direction:column;height:100vh;overflow:hidden}

/* ── Header ── */
header{
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding:0 20px;
  height:52px;
  border-bottom:1px solid var(--border);
  flex-shrink:0;
  background:var(--surface);
}
.brand{display:flex;align-items:center;gap:10px}
.brand-mark{display:flex;align-items:center;flex-shrink:0}
.brand-text{display:flex;flex-direction:column;gap:0px;line-height:1}
.brand-name{
  font-size:.9rem;
  font-weight:700;
  letter-spacing:.12em;
  color:#fff;
}
.brand-by{
  font-size:.58rem;
  font-weight:500;
  letter-spacing:.14em;
  color:var(--muted);
  text-transform:uppercase;
  margin-top:1px;
}
.header-right{display:flex;align-items:center;gap:12px}
.local-port-pill{
  font-family:var(--mono);
  font-size:.72rem;
  color:var(--text2);
  background:var(--surface2);
  border:1px solid var(--border2);
  padding:.2rem .6rem;
  border-radius:99px;
  letter-spacing:.02em;
}
.status-pill{
  display:flex;
  align-items:center;
  gap:6px;
  font-size:.7rem;
  font-weight:500;
  letter-spacing:.06em;
  text-transform:uppercase;
  color:var(--muted);
  background:var(--surface2);
  border:1px solid var(--border2);
  padding:.2rem .65rem;
  border-radius:99px;
  transition:color .2s,border-color .2s;
}
.status-pill.live{color:var(--lime);border-color:rgba(163,230,53,.25)}
.status-dot{
  width:6px;height:6px;
  border-radius:50%;
  background:var(--muted);
  flex-shrink:0;
  transition:background .2s;
}
.status-pill.live .status-dot{
  background:var(--lime);
  box-shadow:0 0 6px var(--lime);
  animation:blink 2s ease-in-out infinite;
}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}

/* ── URL Hero ── */
.url-hero{
  padding:20px;
  border-bottom:1px solid var(--border);
  background:var(--surface);
  flex-shrink:0;
}
.url-label{
  font-size:.65rem;
  font-weight:600;
  letter-spacing:.12em;
  text-transform:uppercase;
  color:var(--muted);
  margin-bottom:8px;
}
.url-row{display:flex;align-items:center;gap:10px}
.tunnel-url{
  font-family:var(--mono);
  font-size:1rem;
  font-weight:500;
  color:var(--lime);
  text-decoration:none;
  flex:1;
  min-width:0;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
  letter-spacing:.01em;
  transition:opacity .15s;
}
.tunnel-url:hover{opacity:.8}
.tunnel-url.empty{color:var(--muted);font-size:.85rem}
.copy-btn{
  display:flex;
  align-items:center;
  gap:6px;
  font-family:var(--sans);
  font-size:.72rem;
  font-weight:600;
  letter-spacing:.04em;
  color:var(--text2);
  background:var(--surface3);
  border:1px solid var(--border2);
  padding:.35rem .85rem;
  border-radius:6px;
  cursor:pointer;
  white-space:nowrap;
  transition:color .15s,border-color .15s,background .15s;
  flex-shrink:0;
}
.copy-btn:hover{color:var(--text);border-color:var(--border3);background:#1f1f1f}
.copy-btn.copied{color:var(--lime);border-color:rgba(163,230,53,.3);background:var(--lime-dim)}

/* ── Stats row ── */
.stats{
  display:grid;
  grid-template-columns:repeat(3,1fr);
  border-bottom:1px solid var(--border);
  flex-shrink:0;
}
.stat{
  padding:12px 20px;
  border-right:1px solid var(--border);
}
.stat:last-child{border-right:none}
.stat-label{
  font-size:.62rem;
  font-weight:600;
  letter-spacing:.1em;
  text-transform:uppercase;
  color:var(--muted);
  margin-bottom:4px;
}
.stat-val{
  font-size:1.15rem;
  font-weight:700;
  color:var(--text);
  font-variant-numeric:tabular-nums;
  letter-spacing:-.01em;
}
.stat-val.lime{color:var(--lime)}

/* ── Expiry bar ── */
.expiry-wrap{
  padding:10px 20px;
  border-bottom:1px solid var(--border);
  display:flex;
  align-items:center;
  gap:12px;
  flex-shrink:0;
  background:var(--surface);
}
.expiry-track{
  flex:1;
  height:3px;
  background:var(--surface3);
  border-radius:99px;
  overflow:hidden;
}
.expiry-fill{
  height:100%;
  background:var(--lime);
  border-radius:99px;
  transition:width 1s linear;
  box-shadow:0 0 8px rgba(163,230,53,.4);
}
.expiry-fill.warn{background:var(--yellow);box-shadow:0 0 8px rgba(251,191,36,.4)}
.expiry-fill.crit{background:var(--red);box-shadow:0 0 8px rgba(248,113,113,.4)}
.expiry-label{
  font-size:.67rem;
  color:var(--text2);
  white-space:nowrap;
  font-variant-numeric:tabular-nums;
}

/* ── Log ── */
.log-header{
  padding:8px 20px;
  display:flex;
  justify-content:space-between;
  align-items:center;
  border-bottom:1px solid var(--border);
  flex-shrink:0;
}
.log-title{
  font-size:.62rem;
  font-weight:700;
  letter-spacing:.12em;
  text-transform:uppercase;
  color:var(--muted);
}
.log-count{
  font-family:var(--mono);
  font-size:.62rem;
  color:var(--muted);
  background:var(--surface3);
  border:1px solid var(--border2);
  padding:.1rem .45rem;
  border-radius:4px;
  margin-left:8px;
}
.log-actions{display:flex;align-items:center;gap:8px}
.clear-btn{
  font-size:.65rem;
  font-weight:500;
  color:var(--muted);
  background:none;
  border:none;
  cursor:pointer;
  font-family:var(--sans);
  letter-spacing:.04em;
  padding:.15rem .4rem;
  border-radius:4px;
  transition:color .15s,background .15s;
}
.clear-btn:hover{color:var(--text2);background:var(--surface3)}

.log-body{flex:1;overflow-y:auto;overflow-x:hidden}

.log-row{
  display:grid;
  grid-template-columns:64px 1fr auto;
  align-items:baseline;
  gap:12px;
  padding:7px 20px;
  border-bottom:1px solid var(--border);
  font-family:var(--mono);
  font-size:.78rem;
  transition:background .1s;
}
.log-row:hover{background:var(--surface)}
.log-row:first-child{border-top:none}

.method{font-weight:500;letter-spacing:.03em}
.m-GET   {color:var(--lime)}
.m-POST  {color:var(--blue)}
.m-PUT   {color:var(--yellow)}
.m-PATCH {color:var(--orange)}
.m-DELETE{color:var(--red)}
.m-OTHER {color:var(--text2)}

.path{
  color:var(--text2);
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
  font-size:.76rem;
}
.log-time{
  color:var(--muted);
  flex-shrink:0;
  font-size:.7rem;
  letter-spacing:.02em;
}

.empty-state{
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  height:100%;
  gap:8px;
  color:var(--muted);
}
.empty-icon{
  width:32px;height:32px;
  opacity:.3;
  margin-bottom:4px;
}
.empty-title{font-size:.78rem;font-weight:500;color:var(--muted)}
.empty-sub{font-size:.7rem;color:var(--dim)}

/* ── Scrollbar ── */
.log-body::-webkit-scrollbar{width:4px}
.log-body::-webkit-scrollbar-track{background:transparent}
.log-body::-webkit-scrollbar-thumb{background:var(--border2);border-radius:2px}
.log-body::-webkit-scrollbar-thumb:hover{background:var(--border3)}
</style>
</head>
<body>
<div class="shell">

  <!-- Header -->
  <header>
    <div class="brand">
      <div class="brand-mark">
        <svg viewBox="42 28 60 64" width="26" height="26" style="display:block;flex-shrink:0" aria-hidden="true">
          <polyline points="49,38 68,60 49,82" stroke="#ffffff" stroke-width="3.5" stroke-opacity="0.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          <polyline points="64,35 95,60 64,85" stroke="#ffffff" stroke-width="11" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        </svg>
      </div>
      <div class="brand-text">
        <span class="brand-name">KSHARE</span>
        <span class="brand-by">by Kodelyth</span>
      </div>
    </div>
    <div class="header-right">
      <span class="local-port-pill" id="port-label" style="display:none"></span>
      <div class="status-pill" id="status-pill">
        <span class="status-dot" id="status-dot"></span>
        <span id="status-text">Connecting</span>
      </div>
    </div>
  </header>

  <!-- URL Hero -->
  <div class="url-hero">
    <div class="url-label">Public URL</div>
    <div class="url-row">
      <a class="tunnel-url empty" id="url-link" href="#" target="_blank">Waiting for connection...</a>
      <button class="copy-btn" id="copy-btn" onclick="copyUrl()">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="5" y="5" width="9" height="9" rx="1.5"/>
          <path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-6A1.5 1.5 0 0 0 2 3.5v6A1.5 1.5 0 0 0 3.5 11H5"/>
        </svg>
        Copy
      </button>
    </div>
  </div>

  <!-- Stats -->
  <div class="stats">
    <div class="stat">
      <div class="stat-label">Local port</div>
      <div class="stat-val" id="stat-port">—</div>
    </div>
    <div class="stat">
      <div class="stat-label">Requests</div>
      <div class="stat-val lime" id="stat-reqs">0</div>
    </div>
    <div class="stat">
      <div class="stat-label">Expires in</div>
      <div class="stat-val" id="stat-expiry">—</div>
    </div>
  </div>

  <!-- Expiry bar -->
  <div class="expiry-wrap">
    <div class="expiry-track">
      <div class="expiry-fill" id="expiry-fill" style="width:0%"></div>
    </div>
    <span class="expiry-label" id="expiry-label">—</span>
  </div>

  <!-- Log header -->
  <div class="log-header">
    <div style="display:flex;align-items:center">
      <span class="log-title">Request Log</span>
      <span class="log-count" id="log-count">0</span>
    </div>
    <div class="log-actions">
      <button class="clear-btn" onclick="clearLog()">Clear</button>
    </div>
  </div>

  <!-- Log body -->
  <div class="log-body" id="log-body">
    <div class="empty-state" id="empty-state">
      <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <div class="empty-title">No requests yet</div>
      <div class="empty-sub">Incoming traffic will appear here</div>
    </div>
  </div>

</div>
<script>
const state = { url: null, connected: false, expiresAt: null, port: null };
let totalReqs = 0;
let rowCount  = 0;

function dur(ms) {
  if (ms <= 0) return 'Expired';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return h + 'h ' + m + 'm';
  if (m > 0) return m + 'm';
  return '<1m';
}

function ts(t) {
  return new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function mClass(m) {
  return { GET:'m-GET', POST:'m-POST', PUT:'m-PUT', PATCH:'m-PATCH', DELETE:'m-DELETE' }[m] || 'm-OTHER';
}

function applyState(s) {
  if (s.url       !== undefined) state.url       = s.url;
  if (s.connected !== undefined) state.connected = s.connected;
  if (s.expiresAt !== undefined) state.expiresAt = s.expiresAt;
  if (s.port      !== undefined) state.port      = s.port;

  // Status pill
  const pill = document.getElementById('status-pill');
  const dot  = document.getElementById('status-dot');
  const txt  = document.getElementById('status-text');
  if (state.connected) {
    pill.className = 'status-pill live';
    txt.textContent = 'Live';
  } else {
    pill.className = 'status-pill';
    txt.textContent = 'Connecting';
  }

  // URL
  const link = document.getElementById('url-link');
  if (state.url) {
    link.textContent = state.url;
    link.href        = state.url;
    link.className   = 'tunnel-url';
  } else {
    link.textContent = 'Waiting for connection...';
    link.href        = '#';
    link.className   = 'tunnel-url empty';
  }

  // Port pill in header + stat
  const portPill = document.getElementById('port-label');
  if (state.port) {
    portPill.textContent = 'localhost:' + state.port;
    portPill.style.display = '';
  } else {
    portPill.style.display = 'none';
  }
  document.getElementById('stat-port').textContent = state.port ? ':' + state.port : '—';

  updateExpiry();

  if (s.log && s.log.length) {
    [...s.log].reverse().forEach(entry => addRow(entry, false));
  }
}

function updateExpiry() {
  if (!state.expiresAt) return;
  const rem = state.expiresAt - Date.now();
  const pct = Math.max(0, Math.min(100, rem / (24 * 3600000) * 100));
  const fill = document.getElementById('expiry-fill');
  fill.style.width = pct + '%';
  // Color transitions: lime → yellow (< 2h) → red (< 30m)
  fill.className = 'expiry-fill' + (rem < 1800000 ? ' crit' : rem < 7200000 ? ' warn' : '');
  const label = dur(rem);
  document.getElementById('expiry-label').textContent = label;
  document.getElementById('stat-expiry').textContent  = label;
}

function addRow(entry, live = true) {
  const empty = document.getElementById('empty-state');
  if (empty) empty.remove();

  const body = document.getElementById('log-body');
  const row  = document.createElement('div');
  row.className = 'log-row';

  // Escape path to prevent XSS
  const safePath = entry.path.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  row.innerHTML =
    '<span class="method ' + mClass(entry.method) + '">' + entry.method + '</span>' +
    '<span class="path">' + safePath + '</span>' +
    '<span class="log-time">' + ts(entry.ts) + '</span>';

  body.insertBefore(row, body.firstChild);
  rowCount++;

  if (live) {
    totalReqs++;
    document.getElementById('stat-reqs').textContent = totalReqs;
  }
  document.getElementById('log-count').textContent = rowCount;

  if (rowCount > 200) {
    body.removeChild(body.lastChild);
    rowCount--;
  }
}

function copyUrl() {
  if (!state.url) return;
  navigator.clipboard.writeText(state.url).then(() => {
    const btn = document.getElementById('copy-btn');
    btn.className = 'copy-btn copied';
    btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="2 8 6 12 14 4"/></svg> Copied';
    setTimeout(() => {
      btn.className = 'copy-btn';
      btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="5" width="9" height="9" rx="1.5"/><path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-6A1.5 1.5 0 0 0 2 3.5v6A1.5 1.5 0 0 0 3.5 11H5"/></svg> Copy';
    }, 2000);
  });
}

function clearLog() {
  const body = document.getElementById('log-body');
  body.innerHTML = '<div class="empty-state" id="empty-state"><svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><div class="empty-title">No requests yet</div><div class="empty-sub">Incoming traffic will appear here</div></div>';
  rowCount = 0;
  document.getElementById('log-count').textContent = '0';
}

setInterval(updateExpiry, 30000);

const es = new EventSource('/events');
es.addEventListener('state',   e => applyState(JSON.parse(e.data)));
es.addEventListener('request', e => addRow(JSON.parse(e.data), true));
es.onerror = () => {
  const pill = document.getElementById('status-pill');
  pill.className = 'status-pill';
  document.getElementById('status-text').textContent = 'Disconnected';
  document.getElementById('status-dot').style.background = 'var(--red)';
};
</script>
</body>
</html>`;
}

function start(preferredPort = 4040) {
  const sseClients = new Set();
  const requestLog = [];

  let currentState = {
    url: null, connected: false, expiresAt: null, port: null,
  };

  function broadcast(event, data) {
    const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of sseClients) {
      try { res.write(msg); } catch { sseClients.delete(res); }
    }
  }

  function setState(patch) {
    Object.assign(currentState, patch);
    broadcast('state', patch);
  }

  function logRequest(method, path) {
    const entry = { method, path, ts: Date.now() };
    requestLog.unshift(entry);
    if (requestLog.length > MAX_LOG) requestLog.pop();
    broadcast('request', entry);
  }

  const server = http.createServer((req, res) => {
    if (req.url === '/events') {
      res.writeHead(200, {
        'Content-Type':  'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection':    'keep-alive',
      });
      res.write(`event: state\ndata: ${JSON.stringify({ ...currentState, log: requestLog })}\n\n`);
      sseClients.add(res);
      req.on('close', () => sseClients.delete(res));
      return;
    }

    if (req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(buildHTML());
      return;
    }

    res.writeHead(404);
    res.end();
  });

  return new Promise((resolve) => {
    function tryListen(port) {
      server.once('error', (err) => {
        if (err.code === 'EADDRINUSE' && port < preferredPort + 10) {
          tryListen(port + 1);
        } else {
          resolve(null);
        }
      });
      server.listen(port, '127.0.0.1', () => {
        resolve({ port, setState, logRequest });
      });
    }
    tryListen(preferredPort);
  });
}

module.exports = { start };
