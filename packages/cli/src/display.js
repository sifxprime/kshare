'use strict';

// Cross-platform color support — chalk detects terminal capabilities automatically
// Works on macOS, Linux, and Windows (PowerShell, Windows Terminal, CMD)
let chalk;

async function loadChalk() {
  if (!chalk) {
    chalk = (await import('chalk')).default;
  }
  return chalk;
}

function formatDuration(ms) {
  if (ms <= 0) return 'expired';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const SEP = '─'.repeat(46);

async function printBanner() {
  const c = await loadChalk();
  console.log('');
  console.log('  ' + c.bold.white('KShare') + c.dim('  by KODELYTH'));
  console.log('');
}

async function printConnected({ url, port, expiresAt, resumed, subdomain, dashboardPort }) {
  const c         = await loadChalk();
  const remaining = expiresAt - Date.now();
  const status    = resumed
    ? c.bold.green('  Reconnected') + c.dim(' — same URL restored')
    : c.bold.green('  Connected');

  const pad = (label) => label.padEnd(13);

  console.log(status);
  console.log('');
  console.log('  ' + c.dim(SEP));
  console.log('');
  console.log('  ' + c.dim(pad('Public URL')) + c.bold.cyan(url));
  if (dashboardPort) {
    console.log('  ' + c.dim(pad('Dashboard'))  + c.blue(`http://localhost:${dashboardPort}`));
  }
  console.log('  ' + c.dim(pad('Expires'))     + c.yellow(formatDuration(remaining)));
  console.log('  ' + c.dim(pad('Local'))       + `localhost:${port}`);
  console.log('');
  console.log('  ' + c.dim(SEP));
  console.log('');
  console.log(c.dim('  Press Ctrl+C to stop'));
  console.log('');
}

async function printRequest(method, path, status, ms) {
  const c = await loadChalk();

  const methodColor = {
    GET:    c.green,
    POST:   c.blue,
    PUT:    c.yellow,
    PATCH:  c.yellow,
    DELETE: c.red,
    HEAD:   c.cyan,
    OPTIONS: c.cyan,
  }[method] || c.white;

  let statusColor = c.dim;
  if (status !== undefined) {
    if (status >= 500) statusColor = c.red;
    else if (status >= 400) statusColor = c.yellow;
    else if (status >= 300) statusColor = c.cyan;
    else statusColor = c.green;
  }

  const methodStr = methodColor(method.padEnd(7));
  const pathStr   = c.white(path.length > 52 ? path.slice(0, 50) + '..' : path);
  const statusStr = status !== undefined ? statusColor(String(status)) : '';
  const msStr     = ms !== undefined ? c.dim(` ${ms}ms`) : '';

  process.stdout.write('  ' + methodStr + ' ' + pathStr + '  ' + statusStr + msStr + '\n');
}

async function printError(msg) {
  const c = await loadChalk();
  console.error('');
  console.error('  ' + c.red.bold('Error') + '  ' + c.red(msg));
  console.error('');
}

async function printInfo(msg) {
  const c = await loadChalk();
  console.log(c.dim('  ' + msg));
}

async function printExpired() {
  const c = await loadChalk();
  console.log('');
  console.log('  ' + c.yellow.bold('Tunnel expired'));
  console.log(c.dim('  The 24-hour limit has been reached.'));
  console.log(c.dim('  Run kshare again to get a new link.'));
  console.log('');
}

async function printQR(url) {
  const qrcode = require('qrcode-terminal');
  console.log('');
  qrcode.generate(url, { small: true });
  console.log('');
}

async function printHelp() {
  const c = await loadChalk();
  const line = c.dim('─'.repeat(38));
  console.log('');
  console.log('  ' + c.bold.white('KShare') + c.dim(' by KODELYTH'));
  console.log('  ' + c.dim('Share localhost. Instantly.'));
  console.log('');
  console.log('  ' + c.bold('Usage'));
  console.log('  ' + line);
  console.log('  kshare --port ' + c.cyan('<number>') + '         share a local port');
  console.log('  kshare ' + c.cyan('<number>') + '                short form: kshare 3000');
  console.log('  kshare --port 3000 ' + c.dim('--password') + '  password-protect');
  console.log('  kshare --port 3000 ' + c.dim('--qr') + '        show QR code');
  console.log('  kshare status                   active tunnels');
  console.log('  kshare help                     show this');
  console.log('');
  console.log('  ' + c.bold('Examples'));
  console.log('  ' + line);
  console.log('  kshare ' + c.cyan('3000'));
  console.log('  kshare ' + c.cyan('5173') + ' --qr');
  console.log('  kshare ' + c.cyan('8080') + ' --password ' + c.cyan('mysecret'));
  console.log('');
  console.log('  ' + c.dim('https://github.com/sifxprime/kshare'));
  console.log('');
}

module.exports = {
  printBanner,
  printConnected,
  printRequest,
  printError,
  printInfo,
  printExpired,
  printQR,
  printHelp,
};
