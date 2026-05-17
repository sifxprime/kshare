'use strict';

const jwt = require('jsonwebtoken');

const JWT_SECRET     = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const ADMIN_SECRET   = process.env.ADMIN_SECRET;

function requireEnvSecrets() {
  if (!JWT_SECRET)   throw new Error('JWT_SECRET env var is required');
  if (!ADMIN_SECRET) throw new Error('ADMIN_SECRET env var is required');
}

function signUserToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verifyUserToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function extractBearer(req) {
  const header = req.headers['authorization'] || '';
  const match  = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

function middlewareUserAuth(req, res) {
  const token = extractBearer(req);
  if (!token) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unauthorized' }));
    return null;
  }
  try {
    return verifyUserToken(token);
  } catch {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid or expired token' }));
    return null;
  }
}

function middlewareAdminAuth(req, res) {
  const provided = req.headers['x-admin-secret'] || '';
  if (!ADMIN_SECRET || provided !== ADMIN_SECRET) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Forbidden' }));
    return false;
  }
  return true;
}

module.exports = {
  requireEnvSecrets,
  signUserToken,
  verifyUserToken,
  middlewareUserAuth,
  middlewareAdminAuth,
};
