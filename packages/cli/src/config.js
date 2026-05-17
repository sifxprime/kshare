'use strict';

const os   = require('os');
const path = require('path');
const fs   = require('fs');

const CONFIG_DIR  = path.join(os.homedir(), '.kshare');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

function load() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
  } catch {
    // malformed config — return defaults
  }
  return {};
}

function save(data) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  const current = load();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify({ ...current, ...data }, null, 2));
}

function get(key) {
  return load()[key];
}

// Server URL — override with env var KSHARE_SERVER for self-hosting
const DEFAULT_SERVER = 'wss://api.kodelyth.net';

function serverUrl() {
  return process.env.KSHARE_SERVER || get('server') || DEFAULT_SERVER;
}

module.exports = { load, save, get, serverUrl, CONFIG_DIR };
