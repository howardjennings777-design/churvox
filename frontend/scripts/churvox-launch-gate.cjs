#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const root = process.cwd();
const reportDir = path.join(root, 'test-results');
const reportPath = path.join(reportDir, 'churvox-launch-gate-report.txt');

fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(reportPath, `Churvox launch gate\nStarted: ${new Date().toISOString()}\n\n`);

const env = {
  ...process.env,
  CHURVOX_E2E_MUTATE: process.env.CHURVOX_E2E_MUTATE || '1',
  PLAYWRIGHT_BASE_URL: process.env.PLAYWRIGHT_BASE_URL || 'https://www.churvox.com',
  PLAYWRIGHT_API_BASE: process.env.PLAYWRIGHT_API_BASE || 'https://grassley-backend.onrender.com',
};

function log(line = '') {
  process.stdout.write(`${line}\n`);
  fs.appendFileSync(reportPath, `${line}\n`);
}

function missingOwnerCredentials() {
  return !env.CHURVOX_OWNER_EMAIL && !env.CHURVOX_E2E_EMAIL || !env.CHURVOX_OWNER_PASSWORD && !env.CHURVOX_E2E_PASSWORD;
}

function runStep(step) {
  return new Promise((resolve) => {
    log('');
    log(`===== ${step.name} =====`);
    log(`$ ${step.command} ${step.args.join(' ')}`);
    const started = Date.now();
    const child = spawn(step.command, step.args, { cwd: root, env, shell: process.platform === 'win32' });

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
      log(`===== ${step.name} ${code === 0 ? 'PASSED' : 'FAILED'} in ${seconds}s =====`);
      resolve({ ...step, code, seconds });
    });
  });
}

async function main() {
  log(`Base URL: ${env.PLAYWRIGHT_BASE_URL}`);
  log(`API URL: ${env.PLAYWRIGHT_API_BASE}`);
  log(`Report: ${reportPath}`);

  if (missingOwnerCredentials()) {
    log('');
    log('Missing owner login env. Set CHURVOX_OWNER_EMAIL and CHURVOX_OWNER_PASSWORD before running this launch gate.');
    log('Example: export CHURVOX_OWNER_EMAIL=howardjennings777@gmail.com');
    process.exit(2);
  }

  const steps = [
    { name: 'Production build', command: 'npm', args: ['run', 'build'] },
    { name: 'Command OS contract', command: 'npx', args: ['playwright', 'test', 'tests/e2e/churvox-command-os-contract.spec.js', '--reporter=line'] },
    { name: 'Deep human logic audit', command: 'npx', args: ['playwright', 'test', 'tests/e2e/churvox-deep-human-logic-audit.spec.js', '--reporter=line'] },
    { name: 'Full human launch audit', command: 'npx', args: ['playwright', 'test', 'tests/e2e/churvox-full-human-audit-v7.spec.js', '--reporter=line'] },
  ];

  const results = [];
  for (const step of steps) {
    const result = await runStep(step);
    results.push(result);
    if (step.name === 'Production build' && result.code !== 0) break;
  }

  log('');
  log('===== LAUNCH GATE SUMMARY =====');
  for (const result of results) {
    log(`${result.code === 0 ? 'PASS' : 'FAIL'} - ${result.name} (${result.seconds}s)`);
  }

  const failed = results.filter((result) => result.code !== 0);
  log('');
  log(failed.length ? `LAUNCH GATE FAILED: ${failed.length} step(s) need fixing.` : 'LAUNCH GATE PASSED: build and launch audits passed.');
  log(`Finished: ${new Date().toISOString()}`);
  log(`Saved report: ${reportPath}`);

  process.exit(failed.length ? 1 : 0);
}

main().catch((error) => {
  log('');
  log(`Launch gate crashed: ${error?.stack || error}`);
  process.exit(1);
});
