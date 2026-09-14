#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const backend = String(
  process.env.CHURVOX_BACKEND_URL ||
  process.env.BACKEND_URL ||
  process.env.REACT_APP_BACKEND_URL ||
  ''
).replace(/\/+$/, '');

if (!backend) {
  console.error('CHURVOX_FLY_BACKEND_URL_MISSING: set CHURVOX_BACKEND_URL for the Fly frontend app.');
  process.exit(1);
}

const serverPath = path.resolve(__dirname, '..', 'server.cjs');
const original = fs.readFileSync(serverPath, 'utf8');
const marker = /const DEFAULT_BACKEND_URL = "[^"]+";/;

if (!marker.test(original)) {
  console.error('CHURVOX_FLY_PROXY_MARKER_MISSING: frontend/server.cjs backend marker was not found.');
  process.exit(1);
}

const patched = original.replace(
  marker,
  `const DEFAULT_BACKEND_URL = ${JSON.stringify(backend)};`
);

fs.writeFileSync(serverPath, patched, 'utf8');
console.log(`CHURVOX_FLY_PROXY_TARGET_READY ${backend}`);

require('./start-production.cjs');
