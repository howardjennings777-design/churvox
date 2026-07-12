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
  CHURVOX_E2E_MUTATE: '0',
  CHURVOX_E2E_SIGNUP: '0',
};

function log(line = '') {
  process.stdout.write(`${line}\n`);
  fs.appendFileSync(reportPath, `${line}\n`);
}

function run(name, command, args) {
  return new Promise((resolve) => {
    log('');
    log(`===== ${name} =====`);
    log(`$ ${command} ${args.join(' ')}`);
    const started = Date.now();
    const child = spawn(command, args, { cwd: process.cwd(), env, shell: process.platform === 'win32' });
    child.stdout.on('data', (chunk) => { process.stdout.write(chunk); fs.appendFileSync(reportPath, chunk); });
    child.stderr.on('data', (chunk) => { process.stderr.write(chunk); fs.appendFileSync(reportPath, chunk); });
    child.on('close', (code) => {
      const seconds = Math.round((Date.now() - started) / 1000);
      log(`===== ${name} ${code === 0 ? 'PASSED' : 'FAILED'} in ${seconds}s =====`);
      resolve({ name, code, seconds });
    });
  });
}

function testStep(name, files, project = 'desktop-chromium') {
  return [name, 'npx', ['playwright', 'test', ...files, `--project=${project}`, '--workers=1', '--reporter=line']];
}

(async () => {
  const steps = [
    ['Production build', 'npm', ['run', 'build']],
    testStep('Public signup, tester link and support routes', ['tests/e2e/churvox-paid-launch-full-audit.spec.js']),
    testStep('Rebuilt HQ tester controls', ['tests/e2e/churvox-paid-launch-hq-reality.spec.js']),
    testStep('Tier and navigation contract', ['tests/e2e/churvox-sidebar-tier-contract.spec.js']),
    testStep('Public honesty and no fake account data', ['tests/e2e/churvox-public-honesty-and-function.spec.js', 'tests/e2e/churvox-owner-no-fake-data.spec.js']),
    testStep('Mobile tester-facing routes', ['tests/e2e/churvox-paid-launch-full-audit.spec.js'], 'mobile-chromium'),
  ];

  const results = [];
  for (const step of steps) {
    const result = await run(...step);
    results.push(result);
    if (result.code !== 0) break;
  }

  log('');
  log('===== TESTER READY SUMMARY =====');
  results.forEach((result) => log(`${result.code === 0 ? 'PASS' : 'FAIL'} - ${result.name} (${result.seconds}s)`));
  log(`Saved report: ${reportPath}`);
  process.exit(results.some((result) => result.code !== 0) ? 1 : 0);
})().catch((error) => {
  log(`Tester-ready gate crashed: ${error?.stack || error}`);
  process.exit(1);
});
