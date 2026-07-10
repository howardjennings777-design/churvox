#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const frontend = path.join(root, 'frontend');
const playwrightBin = path.join(
  frontend,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'playwright.cmd' : 'playwright',
);

if (!fs.existsSync(playwrightBin)) {
  console.error('Playwright is not installed in frontend/node_modules. Run npm --prefix frontend install --legacy-peer-deps first.');
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
  console.error(`Missing live read-only credentials: ${missing.join(', ')}. Add them as Codespace secrets; do not paste passwords into chat.`);
  process.exit(1);
}

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'https://www.churvox.com';
const apiBase = process.env.PLAYWRIGHT_API_BASE || 'https://grassley-backend.onrender.com';
const forwarded = process.argv.slice(2);
const hasProject = forwarded.some((value) => /^--project(?:=|$)/.test(value));
const hasWorkers = forwarded.some((value) => /^--workers(?:=|$)/.test(value));

console.log(`Running read-only owner/worker launch smoke against ${baseURL}`);
console.log(`Backend: ${apiBase}`);
console.log('No POST/PATCH/DELETE business operations are performed after login.');

const result = spawnSync(
  playwrightBin,
  [
    'test',
    'tests/e2e/churvox-live-owner-worker-readonly.spec.js',
    '--config=playwright.config.js',
    ...(hasProject ? [] : ['--project=desktop-chromium']),
    ...(hasWorkers ? [] : ['--workers=1']),
    ...forwarded,
  ],
  {
    cwd: frontend,
    stdio: 'inherit',
    env: {
      ...process.env,
      PLAYWRIGHT_BASE_URL: baseURL,
      PLAYWRIGHT_API_BASE: apiBase,
    },
  },
);

if (result.error) {
  console.error(`Could not start read-only owner/worker smoke: ${result.error.message}`);
  process.exit(1);
}
process.exit(typeof result.status === 'number' ? result.status : 1);
