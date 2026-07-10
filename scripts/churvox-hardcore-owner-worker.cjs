#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const frontend = path.join(root, 'frontend');
const playwright = path.join(frontend, 'node_modules', '.bin', process.platform === 'win32' ? 'playwright.cmd' : 'playwright');
const consent = 'I_UNDERSTAND_LIVE_DATA_WILL_CHANGE';

if (!fs.existsSync(playwright)) {
  console.error('Playwright is not installed. Run npm --prefix frontend install --legacy-peer-deps first.');
  process.exit(1);
}

const required = [
  ['CHURVOX_OWNER_EMAIL', process.env.CHURVOX_OWNER_EMAIL || process.env.CHURVOX_E2E_OWNER_EMAIL || process.env.CHURVOX_E2E_EMAIL],
  ['CHURVOX_OWNER_PASSWORD', process.env.CHURVOX_OWNER_PASSWORD || process.env.CHURVOX_E2E_OWNER_PASSWORD || process.env.CHURVOX_E2E_PASSWORD],
  ['CHURVOX_WORKER_EMAIL', process.env.CHURVOX_WORKER_EMAIL || process.env.CHURVOX_E2E_WORKER_EMAIL],
  ['CHURVOX_WORKER_PASSWORD', process.env.CHURVOX_WORKER_PASSWORD || process.env.CHURVOX_E2E_WORKER_PASSWORD],
];
const missing = required.filter(([, value]) => !value).map(([name]) => name);
if (missing.length) {
  console.error(`Missing hardcore live credentials: ${missing.join(', ')}. Load them in the terminal; do not paste passwords into chat.`);
  process.exit(1);
}

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'https://www.churvox.com';
const apiBase = process.env.PLAYWRIGHT_API_BASE || 'https://grassley-backend.onrender.com';
const mutate = process.env.CHURVOX_HARDCORE_MUTATE === consent;

function run(args, label) {
  console.log(`\n=== ${label} ===`);
  const result = spawnSync(playwright, args, {
    cwd: frontend,
    stdio: 'inherit',
    env: {
      ...process.env,
      PLAYWRIGHT_BASE_URL: baseURL,
      PLAYWRIGHT_API_BASE: apiBase,
    },
  });
  if (result.error) {
    console.error(`${label} could not start: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(typeof result.status === 'number' ? result.status : 1);
}

console.log(`Hardcore owner/worker target: ${baseURL}`);
console.log(`Backend: ${apiBase}`);
console.log('Visual truth, permissions, route purpose, touch targets, box density and explanation length will be challenged.');
console.log(mutate
  ? 'LIVE MUTATION ENABLED: a uniquely named job will be created, exercised through the complete field loop, and cleanup must pass.'
  : `Read-only mode. Set CHURVOX_HARDCORE_MUTATE=${consent} only when you intentionally want the live job mutation test.`);

run([
  'test',
  'tests/e2e/churvox-hardcore-owner-worker-visual.spec.js',
  '--config=playwright.config.js',
  '--project=desktop-chromium',
  '--project=mobile-chromium',
  '--workers=1',
  '--reporter=line',
], 'Hardcore read-only owner/worker and visual gauntlet');

if (mutate) {
  run([
    'test',
    'tests/e2e/churvox-hardcore-owner-worker-mutate.spec.js',
    '--config=playwright.config.js',
    '--project=desktop-chromium',
    '--workers=1',
    '--reporter=line',
  ], 'Hardcore live boss-worker mutation loop');
}

console.log('\nHardcore owner/worker gauntlet passed.');
