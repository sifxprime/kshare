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
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{
  --bg:#0d0d0d;
  --panel:#111111;
  --sidebar:#0f0f0f;
  --card:#141414;
  --border:#1f1f1f;
  --border2:#222222;
  --text:#e2e8f0;
  --text2:#94a3b8;
  --muted:#444;
  --dim:#2a2a2a;
  --lime:#a3e635;
  --green:#22c55e;
  --blue:#60a5fa;
  --yellow:#fbbf24;
  --red:#f87171;
  --orange:#fb923c;
  --cyan:#06b6d4;
  --mono:'JetBrains Mono',monospace;
}
html,body{
  background:var(--bg);
  color:var(--text);
  font-family:var(--mono);
  font-size:12px;
  line-height:1.5;
  height:100%;
  overflow:hidden;
  -webkit-font-smoothing:antialiased;
}

/* ── Shell ── */
.shell{display:flex;flex-direction:column;height:100vh;overflow:hidden}

/* ── Title bar ── */
.titlebar{
  height:46px;
  background:var(--panel);
  border-bottom:1px solid var(--border);
  display:flex;
  align-items:center;
  padding:0 20px;
  flex-shrink:0;
  position:relative;
}
.traffic-lights{display:flex;align-items:center;gap:6px;flex-shrink:0}
.tl{width:10px;height:10px;border-radius:50%}
.tl-r{background:#f87171;opacity:.8}
.tl-y{background:#fbbf24;opacity:.8}
.tl-g{background:#a3e635;opacity:.8}
.titlebar-label{
  position:absolute;left:50%;transform:translateX(-50%);
  font-size:11px;color:var(--muted);letter-spacing:.03em;white-space:nowrap;
}

/* ── Body ── */
.body{display:flex;flex:1;overflow:hidden}

/* ── Sidebar ── */
.sidebar{
  width:200px;flex-shrink:0;
  background:var(--sidebar);
  border-right:1px solid var(--border);
  display:flex;flex-direction:column;
}
.sb-top{padding:18px 16px 10px}
.sb-brand{display:flex;align-items:center;gap:10px}
.sb-name{font-size:13px;font-weight:700;color:var(--text);display:block}
.sb-sub{font-size:8px;color:#333;letter-spacing:.08em;text-transform:uppercase;margin-top:2px;display:block}
.sb-nav{padding:6px 12px;flex:1}
.nav-item{
  display:flex;align-items:center;gap:10px;
  padding:8px 10px;border-radius:6px;
  cursor:default;position:relative;margin-bottom:2px;
}
.nav-item.active{background:#0f1a0f}
.nav-item.active::before{
  content:'';position:absolute;left:0;top:5px;bottom:5px;
  width:3px;border-radius:1.5px;background:var(--lime);
}
.nav-dot{width:8px;height:8px;border-radius:50%;background:var(--muted);flex-shrink:0}
.nav-item.active .nav-dot{background:var(--lime)}
.nav-label{font-size:11px;color:var(--muted)}
.nav-item.active .nav-label{color:var(--lime)}
.sb-footer{padding:12px}
.status-card{
  background:#0a0a0a;border:1px solid var(--border);
  border-radius:8px;padding:12px 14px;
}
.status-card.live{background:#0a1a0a;border-color:#1a2e1a}
.sc-row{display:flex;align-items:center;gap:8px;margin-bottom:5px}
.sc-dot{
  width:8px;height:8px;border-radius:50%;
  background:var(--muted);flex-shrink:0;
}
.sc-dot.live{background:var(--lime);box-shadow:0 0 6px var(--lime);animation:blink 2s ease-in-out infinite}
.sc-label{font-size:10px;font-weight:600;letter-spacing:.06em;color:var(--muted)}
.sc-label.live{color:var(--lime)}
.sc-expiry{font-size:9px;color:var(--muted)}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}

/* ── Main ── */
.main{flex:1;overflow:hidden;display:flex;flex-direction:column}

/* ── URL + Port row ── */
.top-row{
  display:flex;gap:12px;padding:12px;
  flex-shrink:0;border-bottom:1px solid var(--border);
}
.url-card{
  flex:1;background:var(--card);border:1px solid var(--border2);
  border-top:3px solid var(--green);border-radius:8px;padding:12px 16px;
}
.card-label{
  font-size:9px;color:var(--muted);
  letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px;
}
.url-inner{display:flex;align-items:center;gap:8px}
.tunnel-url{
  font-size:13px;font-weight:600;color:var(--cyan);
  text-decoration:none;flex:1;min-width:0;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
  transition:opacity .15s;
}
.tunnel-url:hover{opacity:.8}
.tunnel-url.empty{color:var(--muted);font-size:10px;font-weight:400}
.copy-btn{
  font-size:9px;color:var(--cyan);
  background:#1a2a2a;border:1px solid #1f3f3f;
  border-radius:4px;padding:3px 10px;cursor:pointer;
  font-family:var(--mono);white-space:nowrap;flex-shrink:0;
  transition:opacity .15s;
}
.copy-btn:hover{opacity:.75}
.copy-btn.copied{color:var(--lime);border-color:rgba(163,230,53,.3);background:rgba(163,230,53,.08)}
.port-card{
  width:186px;flex-shrink:0;
  background:var(--card);border:1px solid var(--border2);
  border-radius:8px;padding:12px 16px;
}
.port-big{font-size:26px;font-weight:700;color:var(--text);line-height:1;margin-bottom:3px}
.port-sub{font-size:9px;color:#333}

/* ── Stats row ── */
.stats-row{
  display:flex;gap:12px;padding:12px;
  flex-shrink:0;border-bottom:1px solid var(--border);
}
.stat-card{
  flex:1;background:var(--card);border:1px solid var(--border2);
  border-radius:8px;padding:12px 16px;
}
.stat-big{font-size:26px;font-weight:700;color:var(--text);line-height:1}
.stat-big.lime{color:var(--lime)}
.stat-unit{font-size:11px;color:var(--muted)}
.stat-note{font-size:9px;color:var(--green);margin-top:3px}

/* ── Log ── */
.log-section{flex:1;overflow:hidden;display:flex;flex-direction:column}
.log-header-bar{
  padding:7px 16px;display:flex;align-items:center;
  justify-content:space-between;border-bottom:1px solid var(--border);
  flex-shrink:0;background:var(--card);
}
.log-title-row{display:flex;align-items:center;gap:8px}
.log-title{font-size:9px;color:var(--muted);letter-spacing:.1em;text-transform:uppercase;font-weight:600}
.live-dot{
  width:6px;height:6px;border-radius:50%;
  background:var(--lime);box-shadow:0 0 4px var(--lime);
  animation:blink 2s ease-in-out infinite;
}
.log-count{
  font-size:9px;color:var(--muted);
  background:#1a1a1a;border:1px solid var(--border2);
  padding:1px 6px;border-radius:4px;
}
.clear-btn{
  font-size:9px;color:var(--muted);background:none;border:none;
  cursor:pointer;font-family:var(--mono);padding:2px 6px;border-radius:4px;
  transition:color .15s,background .15s;
}
.clear-btn:hover{color:var(--text2);background:#1a1a1a}
.table-head{
  display:grid;
  grid-template-columns:64px 1fr 52px 80px 48px;
  padding:5px 16px;border-bottom:1px solid var(--border);flex-shrink:0;
}
.th{font-size:9px;color:#333;letter-spacing:.08em;text-transform:uppercase}
.log-body{flex:1;overflow-y:auto;overflow-x:hidden}
.log-row{
  display:grid;
  grid-template-columns:64px 1fr 52px 80px 48px;
  align-items:center;padding:6px 16px;
  border-bottom:1px solid var(--border);
  transition:background .1s;
}
.log-row:nth-child(odd){background:rgba(15,31,15,.3)}
.log-row:hover{background:var(--card)}
.method-badge{
  display:inline-flex;align-items:center;justify-content:center;
  padding:2px 0;border-radius:3px;font-size:9px;font-weight:600;
  width:52px;text-align:center;
}
.m-GET   {background:#1a2e1a;color:var(--green)}
.m-POST  {background:#1a1a2e;color:var(--blue)}
.m-PUT   {background:#2e2a1a;color:var(--yellow)}
.m-PATCH {background:#2e201a;color:var(--orange)}
.m-DELETE{background:#2e1a1a;color:var(--red)}
.m-OTHER {background:#1a1a1a;color:var(--text2)}
.path-cell{
  color:var(--text2);overflow:hidden;text-overflow:ellipsis;
  white-space:nowrap;font-size:10px;padding-right:8px;
}
.status-ok {font-size:10px;font-weight:600;color:var(--green)}
.status-3xx{font-size:10px;font-weight:600;color:var(--cyan)}
.status-4xx{font-size:10px;font-weight:600;color:var(--yellow)}
.status-5xx{font-size:10px;font-weight:600;color:var(--red)}
.status-dim{font-size:10px;color:var(--muted)}
.time-cell{font-size:9px;color:var(--muted)}
.ms-cell  {font-size:9px;color:var(--muted)}
.empty-state{
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  height:100%;gap:8px;
}
.empty-icon{width:28px;height:28px;opacity:.2;margin-bottom:4px}
.empty-title{font-size:11px;color:var(--muted)}
.empty-sub{font-size:9px;color:var(--dim)}
.log-body::-webkit-scrollbar{width:4px}
.log-body::-webkit-scrollbar-track{background:transparent}
.log-body::-webkit-scrollbar-thumb{background:var(--border2);border-radius:2px}
.log-body::-webkit-scrollbar-thumb:hover{background:#2e2e2e}
</style>
</head>
<body>
<div class="shell">

  <!-- Title bar -->
  <div class="titlebar">
    <div class="traffic-lights">
      <div class="tl tl-r"></div>
      <div class="tl tl-y"></div>
      <div class="tl tl-g"></div>
    </div>
    <span class="titlebar-label" id="titlebar-label">KShare Dashboard — localhost:4040</span>
  </div>

  <!-- Body -->
  <div class="body">

    <!-- Sidebar -->
    <div class="sidebar">
      <div class="sb-top">
        <div class="sb-brand">
          <svg viewBox="42 28 60 64" width="20" height="20" style="display:block;flex-shrink:0" aria-hidden="true">
            <polyline points="49,38 68,60 49,82" stroke="#fff" stroke-width="3.5" stroke-opacity=".15" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            <polyline points="64,35 95,60 64,85" stroke="#fff" stroke-width="11" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          </svg>
          <div>
            <span class="sb-name">KShare</span>
            <span class="sb-sub">by KODELYTH</span>
          </div>
        </div>
      </div>

      <div class="sb-nav">
        <div class="nav-item active">
          <div class="nav-dot"></div>
          <span class="nav-label">Overview</span>
        </div>
        <div class="nav-item">
          <div class="nav-dot"></div>
          <span class="nav-label">Requests</span>
        </div>
        <div class="nav-item">
          <div class="nav-dot"></div>
          <span class="nav-label">Settings</span>
        </div>
      </div>

      <div class="sb-footer">
        <div class="status-card" id="status-card">
          <div class="sc-row">
            <div class="sc-dot" id="sc-dot"></div>
            <span class="sc-label" id="sc-label">CONNECTING</span>
          </div>
          <div class="sc-expiry" id="sc-expiry">&mdash;</div>
        </div>
      </div>
    </div>

    <!-- Main -->
    <div class="main">

      <!-- URL + Port -->
      <div class="top-row">
        <div class="url-card">
          <div class="card-label">Public URL</div>
          <div class="url-inner">
            <a class="tunnel-url empty" id="url-link" href="#" target="_blank">Waiting for connection&hellip;</a>
            <button class="copy-btn" id="copy-btn" onclick="copyUrl()">copy</button>
          </div>
        </div>
        <div class="port-card">
          <div class="card-label">Local Port</div>
          <div class="port-big" id="port-big">&mdash;</div>
          <div class="port-sub" id="port-sub"></div>
        </div>
      </div>

      <!-- Stats -->
      <div class="stats-row">
        <div class="stat-card">
          <div class="card-label">Total Requests</div>
          <div class="stat-big" id="stat-total">0</div>
          <div class="stat-note" id="stat-note" style="visibility:hidden">+0 last min</div>
        </div>
        <div class="stat-card">
          <div class="card-label">Avg Response Time</div>
          <div class="stat-big" id="stat-avg">&mdash;<span class="stat-unit"></span></div>
        </div>
        <div class="stat-card">
          <div class="card-label">Error Rate</div>
          <div class="stat-big lime" id="stat-err">0.0<span class="stat-unit">%</span></div>
        </div>
      </div>

      <!-- Log -->
      <div class="log-section">
        <div class="log-header-bar">
          <div class="log-title-row">
            <span class="log-title">Live Request Log</span>
            <div class="live-dot"></div>
            <span class="log-count" id="log-count">0</span>
          </div>
          <button class="clear-btn" onclick="clearLog()">Clear</button>
        </div>

        <div class="table-head">
          <div class="th">Method</div>
          <div class="th">Path</div>
          <div class="th">Status</div>
          <div class="th">Time</div>
          <div class="th">MS</div>
        </div>

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

    </div><!-- /main -->
  </div><!-- /body -->
</div><!-- /shell -->

<script>
const state = { url: null, connected: false, expiresAt: null, port: null };
let totalReqs = 0;
let rowCount  = 0;
let errorCount = 0;
let totalMs   = 0;
let msCount   = 0;

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

function statusClass(s) {
  if (!s) return 'status-dim';
  if (s >= 500) return 'status-5xx';
  if (s >= 400) return 'status-4xx';
  if (s >= 300) return 'status-3xx';
  return 'status-ok';
}

function applyState(s) {
  if (s.url       !== undefined) state.url       = s.url;
  if (s.connected !== undefined) state.connected = s.connected;
  if (s.expiresAt !== undefined) state.expiresAt = s.expiresAt;
  if (s.port      !== undefined) state.port      = s.port;

  const dot   = document.getElementById('sc-dot');
  const label = document.getElementById('sc-label');
  const card  = document.getElementById('status-card');
  if (state.connected) {
    dot.className   = 'sc-dot live';
    label.className = 'sc-label live';
    label.textContent = 'CONNECTED';
    card.className  = 'status-card live';
  } else {
    dot.className   = 'sc-dot';
    label.className = 'sc-label';
    label.textContent = 'CONNECTING';
    card.className  = 'status-card';
  }

  updateExpiry();

  const link = document.getElementById('url-link');
  if (state.url) {
    link.textContent = state.url;
    link.href        = state.url;
    link.className   = 'tunnel-url';
  } else {
    link.textContent = 'Waiting for connection…';
    link.href        = '#';
    link.className   = 'tunnel-url empty';
  }

  if (state.port) {
    document.getElementById('port-big').textContent = state.port;
    document.getElementById('port-sub').textContent = 'localhost:' + state.port;
    document.getElementById('titlebar-label').textContent = 'KShare Dashboard — localhost:4040';
  }

  if (s.log && s.log.length) {
    [...s.log].reverse().forEach(entry => addRow(entry, false));
  }
}

function updateExpiry() {
  if (!state.expiresAt) { document.getElementById('sc-expiry').textContent = '—'; return; }
  const rem = state.expiresAt - Date.now();
  document.getElementById('sc-expiry').textContent = 'Expires in ' + dur(rem);
}

function addRow(entry, live) {
  const empty = document.getElementById('empty-state');
  if (empty) empty.remove();

  const body = document.getElementById('log-body');
  const row  = document.createElement('div');
  row.className = 'log-row';

  const safePath = entry.path.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const statusVal = entry.status ? String(entry.status) : '—';
  const msVal     = entry.ms != null ? entry.ms + 'ms' : '—';

  row.innerHTML =
    '<div><span class="method-badge ' + mClass(entry.method) + '">' + entry.method + '</span></div>' +
    '<div class="path-cell">' + safePath + '</div>' +
    '<div class="' + statusClass(entry.status) + '">' + statusVal + '</div>' +
    '<div class="time-cell">' + ts(entry.ts) + '</div>' +
    '<div class="ms-cell">' + msVal + '</div>';

  body.insertBefore(row, body.firstChild);
  rowCount++;

  if (live) {
    totalReqs++;
    document.getElementById('stat-total').textContent = totalReqs;

    if (entry.status >= 400) errorCount++;
    const errPct = totalReqs > 0 ? ((errorCount / totalReqs) * 100).toFixed(1) : '0.0';
    document.getElementById('stat-err').innerHTML = errPct + '<span class="stat-unit">%</span>';

    if (entry.ms != null) {
      totalMs += entry.ms;
      msCount++;
      const avg = Math.round(totalMs / msCount);
      document.getElementById('stat-avg').innerHTML = avg + '<span class="stat-unit">ms</span>';
    }
  }

  document.getElementById('log-count').textContent = rowCount;
  if (rowCount > 200) { body.removeChild(body.lastChild); rowCount--; }
}

function copyUrl() {
  if (!state.url) return;
  navigator.clipboard.writeText(state.url).then(() => {
    const btn = document.getElementById('copy-btn');
    btn.className = 'copy-btn copied';
    btn.textContent = 'copied!';
    setTimeout(() => { btn.className = 'copy-btn'; btn.textContent = 'copy'; }, 2000);
  });
}

function clearLog() {
  document.getElementById('log-body').innerHTML =
    '<div class="empty-state" id="empty-state">' +
    '<svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
    '<div class="empty-title">No requests yet</div>' +
    '<div class="empty-sub">Incoming traffic will appear here</div></div>';
  rowCount = 0; totalReqs = 0; errorCount = 0; totalMs = 0; msCount = 0;
  document.getElementById('log-count').textContent = '0';
  document.getElementById('stat-total').textContent = '0';
  document.getElementById('stat-err').innerHTML = '0.0<span class="stat-unit">%</span>';
  document.getElementById('stat-avg').innerHTML = '—<span class="stat-unit"></span>';
}

setInterval(updateExpiry, 30000);

const es = new EventSource('/events');
es.addEventListener('state',   e => applyState(JSON.parse(e.data)));
es.addEventListener('request', e => addRow(JSON.parse(e.data), true));
es.onerror = () => {
  document.getElementById('sc-dot').style.background = 'var(--red)';
  document.getElementById('sc-label').textContent = 'DISCONNECTED';
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

  function logRequest(method, path, status, ms) {
    const entry = { method, path, ts: Date.now() };
    if (status != null) entry.status = status;
    if (ms     != null) entry.ms     = ms;
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
