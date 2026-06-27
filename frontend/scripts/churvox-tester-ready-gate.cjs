#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const reportDir = path.join(os.tmpdir(), 'churvox-tester-ready');
const reportPath = path.join(reportDir, 'tester-ready-report.txt');
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(reportPath, `Churvox tester-ready gate\nStarted: ${new Date().toISOString()}\n\n`);

const env = {
  ...process.env,
  PLAYWRIGHT_BASE_URL: process.env.PLAYWRIGHT_BASE_URL || 'https://www.churvox.com',
  PLAYWRIGHT_API_BASE: process.env.PLAYWRIGHT_API_BASE || 'https://grassley-backend.onrender.com',
};

function log(line = '') {
  process.stdout.write(line + '\n');
  fs.appendFileSync(reportPath, line + '\n');
}

function run(name, command, args) {
  return new Promise((resolve) => {
    log('');
    log('===== ' + name + ' =====');
    log('$ ' + command + ' ' + args.join(' '));
    const started = Date.now();
    const child = spawn(command, args, { cwd: process.cwd(), env, shell: process.platform === 'win32' });

    child.stdout.on('data', (chunk) => {
      process.stdout.write(chunk);
      fs.appendFileSync(reportPath, chunk);
    });

    child.stderr.on('data', (chunk) => {
      process.stderr.write(chunk);
      fs.appendFileSync(reportPath, chunk);
    });

    child.on('close', (code) => {
      const seconds = Math.round((Date.now() - started) / 1000);
      log(`===== ${name} ${code === 0 ? 'PASSED' : 'FAILED'} in ${seconds}s =====`);
      resolve({ name, code, seconds });
    });
  });
}

(async () => {
  const missingLogin = !env.CHURVOX_OWNER_EMAIL && !env.CHURVOX_E2E_EMAIL || !env.CHURVOX_OWNER_PASSWORD && !env.CHURVOX_E2E_PASSWORD;
  if (missingLogin) {
    log('Missing owner login env. Set CHURVOX_OWNER_EMAIL and CHURVOX_OWNER_PASSWORD.');
    process.exit(2);
  }

  const steps = [
    ['Build', 'npm', ['run', 'build']],
    ['Direction', 'npm', ['run', 'test:direction']],
    ['Sidebar tier', 'npm', ['run', 'test:sidebar:tier']],
    ['Accounting wording', 'npm', ['run', 'test:accounting:wording']],
  ];

  const results = [];
  for (const step of steps) {
    const result = await run(...step);
    results.push(result);
    if (result.code !== 0) break;
  }

  log('');
  log('===== TESTER READY SUMMARY =====');
  results.forEach((result) => log(`${result.code === 0 ? 'PASS' : 'FAIL'} - ${result.name}`));
  log('Saved report: ' + reportPath);

  process.exit(results.some((result) => result.code !== 0) ? 1 : 0);
})();
