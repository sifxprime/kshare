'use strict';

const { createClient } = require('redis');

let client = null;

async function connect() {
  const options = {
    socket: {
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
    },
  };

  if (process.env.REDIS_PASSWORD) {
    options.password = process.env.REDIS_PASSWORD;
  }

  client = createClient(options);

  client.on('error', (err) => {
    console.error('[redis] error:', err.message);
  });

  await client.connect();
  console.log('[redis] connected');
  return client;
}

function get() {
  if (!client) throw new Error('Redis not connected — call connect() first');
  return client;
}

// Tunnel state: subdomain → { socketId, port, createdAt, expiresAt, requestCount }
async function setTunnel(subdomain, data, ttlSeconds) {
  await get().set(`tunnel:${subdomain}`, JSON.stringify(data), { EX: ttlSeconds });
}

async function getTunnel(subdomain) {
  const raw = await get().get(`tunnel:${subdomain}`);
  return raw ? JSON.parse(raw) : null;
}

async function deleteTunnel(subdomain) {
  await get().del(`tunnel:${subdomain}`);
}

async function listTunnels() {
  const keys = await get().keys('tunnel:*');
  if (!keys.length) return [];
  const values = await get().mGet(keys);
  return keys.map((k, i) => ({
    subdomain: k.replace('tunnel:', ''),
    ...(values[i] ? JSON.parse(values[i]) : {}),
  }));
}

// Rate limiting: track requests per IP
async function incrementIP(ip, windowMs) {
  const key = `rate:${ip}`;
  const count = await get().incr(key);
  if (count === 1) {
    await get().pExpire(key, windowMs);
  }
  return count;
}

async function incrementTunnelRequests(subdomain) {
  await get().incr(`tunnel_reqs:${subdomain}`);
}

async function getTunnelRequestCount(subdomain) {
  const val = await get().get(`tunnel_reqs:${subdomain}`);
  return parseInt(val || '0', 10);
}

module.exports = {
  connect,
  get,
  setTunnel,
  getTunnel,
  deleteTunnel,
  listTunnels,
  incrementIP,
  incrementTunnelRequests,
  getTunnelRequestCount,
};
