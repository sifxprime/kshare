'use strict';

// No ambiguous chars: removed 0, O, 1, l, I
const CHARSET = 'abcdefghjkmnpqrstuvwxyz23456789';
const LENGTH  = 6;

function generate() {
  let result = '';
  for (let i = 0; i < LENGTH; i++) {
    result += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return result;
}

// Reserved — never assign these as tunnel subdomains
const RESERVED = new Set([
  'www', 'api', 'dash', 'admin', 'mail', 'smtp', 'ftp',
  'cdn', 'static', 'assets', 'app', 'dev', 'staging',
  'help', 'docs', 'status', 'blog',
]);

function isReserved(sub) {
  return RESERVED.has(sub.toLowerCase());
}

module.exports = { generate, isReserved };
