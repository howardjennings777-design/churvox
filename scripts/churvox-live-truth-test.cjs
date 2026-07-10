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

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'https://www.churvox.com';
const specs = [
  'tests/e2e/churvox-public-honesty-and-function.spec.js',
  'tests/e2e/churvox-owner-no-fake-data.spec.js',
  'tests/e2e/churvox-paid-launch-hq-reality.spec.js',
];
const forwarded = process.argv.slice(2);
const hasWorkers = forwarded.some((value) => /^--workers(?:=|$)/.test(value));

console.log(`Running Churvox live truth tests against ${baseURL}`);
console.log('Using frontend/playwright.config.js with safe mocked business and HQ APIs.');

const result = spawnSync(
  playwrightBin,
  [
    'test',
    ...specs,
    '--config=playwright.config.js',
    ...(hasWorkers ? [] : ['--workers=1']),
    ...forwarded,
  ],
  {
    cwd: frontend,
    stdio: 'inherit',
    env: {
      ...process.env,
      PLAYWRIGHT_BASE_URL: baseURL,
    },
  },
);

if (result.error) {
  console.error(`Could not start Playwright: ${result.error.message}`);
  process.exit(1);
}

process.exit(typeof result.status === 'number' ? result.status : 1);
