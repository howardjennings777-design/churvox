#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const frontend = path.join(__dirname, '..');
const staged = path.join(frontend, '.premium-studio');
const target = path.join(frontend, 'src', 'churvox-product', 'ProductAppV5.jsx');
const payload = [1, 2, 3, 4, 5]
  .map((part) => fs.readFileSync(path.join(staged, `v5.part${part}`), 'utf8').trim())
  .join('');
const source = zlib.gunzipSync(Buffer.from(payload, 'base64')).toString('utf8');

if (!source.includes('CHURVOX_PREMIUM_STUDIO_V5_20260725')) {
  throw new Error('Premium studio payload does not contain the expected release marker.');
}
if (!source.includes('export default function ProductAppV5')) {
  throw new Error('Premium studio payload does not export ProductAppV5.');
}

if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== source) {
  fs.writeFileSync(target, source);
}

console.log('Churvox premium owner studio materialized.');
