#!/usr/bin/env node
'use strict';

const { startTunnel } = require('../src/tunnel');
const display          = require('../src/display');

const args = process.argv.slice(2);

function parseArgs(argv) {
  const result = { port: null, password: null, qr: false, command: null };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === 'status' || a === 'stop' || a === 'help' || a === '--help' || a === '-h') {
      result.command = a.replace('--', '');
    } else if ((a === '--port' || a === '-p') && argv[i + 1]) {
      result.port = parseInt(argv[++i], 10);
    } else if (a === '--password' && argv[i + 1]) {
      result.password = argv[++i];
    } else if (a === '--password') {
      // prompt for password or set a default
      result.password = process.env.KSHARE_PASSWORD || 'changeme';
    } else if (a === '--qr') {
      result.qr = true;
    } else if (/^\d+$/.test(a)) {
      result.port = parseInt(a, 10);
    }
  }

  return result;
}

async function main() {
  const { port, password, qr, command } = parseArgs(args);

  if (command === 'help' || args.length === 0) {
    await display.printHelp();
    process.exit(0);
  }

  if (command === 'status') {
    const { load } = require('../src/config');
    const cfg = load();
    if (!cfg.activeTunnels || cfg.activeTunnels.length === 0) {
      console.log('  No active tunnels');
    } else {
      cfg.activeTunnels.forEach((t) => console.log(`  ${t.url}  (port ${t.port})`));
    }
    process.exit(0);
  }

  if (command === 'stop') {
    console.log('  Stopping tunnels — close your kshare sessions with Ctrl+C');
    process.exit(0);
  }

  if (!port || isNaN(port) || port < 1 || port > 65535) {
    await display.printError('Provide a valid port number.  Example: kshare --port 3000');
    process.exit(1);
  }

  // Graceful shutdown — cross-platform (SIGINT covers macOS/Linux/Windows)
  const shutdown = async () => {
    console.log('');
    await display.printInfo('Tunnel closed');
    process.exit(0);
  };
  process.on('SIGINT',  shutdown);
  process.on('SIGTERM', shutdown);
  // Windows: handle Ctrl+Break
  if (process.platform === 'win32') {
    process.on('SIGBREAK', shutdown);
  }

  await startTunnel({ port, password, showQR: qr });
}

main().catch(async (err) => {
  await display.printError(err.message);
  process.exit(1);
});
