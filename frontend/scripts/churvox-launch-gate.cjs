#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const root = process.cwd();
const reportDir = process.env.CHURVOX_LAUNCH_GATE_REPORT_DIR || path.join(os.tmpdir(), 'churvox-launch-gate');
const reportPath = path.join(reportDir, 'churvox-launch-gate-report.txt');
const enabled = (value) => /^(1|true|yes)$/i.test(String(value || ''));

fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(reportPath, `Churvox paid-launch gate\nStarted: ${new Date().toISOString()}\n\n`);

const env = {
  ...process.env,
  CHURVOX_E2E_MUTATE: process.env.CHURVOX_E2E_MUTATE || '0',
  CHURVOX_E2E_SIGNUP: process.env.CHURVOX_E2E_SIGNUP || '0',
  PLAYWRIGHT_BASE_URL: process.env.PLAYWRIGHT_BASE_URL || 'https://www.churvox.com',
  PLAYWRIGHT_API_BASE: process.env.PLAYWRIGHT_API_BASE || 'https://grassley-backend.onrender.com',
};

function log(line = '') {
  process.stdout.write(`${line}\n`);
  fs.appendFileSync(reportPath, `${line}\n`);
}

function hasOwnerCredentials() {
  return Boolean((env.CHURVOX_OWNER_EMAIL || env.CHURVOX_E2E_EMAIL) && (env.CHURVOX_OWNER_PASSWORD || env.CHURVOX_E2E_PASSWORD));
}

function hasWorkerCredentials() {
  return Boolean((env.CHURVOX_WORKER_EMAIL || env.CHURVOX_E2E_WORKER_EMAIL) && (env.CHURVOX_WORKER_PASSWORD || env.CHURVOX_E2E_WORKER_PASSWORD));
}

function runStep(step) {
  return new Promise((resolve) => {
    log('');
    log(`===== ${step.name} =====`);
    log(`$ ${step.command} ${step.args.join(' ')}`);
    const started = Date.now();
    const child = spawn(step.command, step.args, { cwd: root, env, shell: process.platform === 'win32' });
    child.stdout.on('data', (chunk) => { process.stdout.write(chunk); fs.appendFileSync(reportPath, chunk); });
    child.stderr.on('data', (chunk) => { process.stderr.write(chunk); fs.appendFileSync(reportPath, chunk); });
    child.on('close', (code) => {
      const seconds = Math.round((Date.now() - started) / 1000);
      log(`===== ${step.name} ${code === 0 ? 'PASSED' : 'FAILED'} in ${seconds}s =====`);
      resolve({ ...step, code, seconds });
    });
  });
}

function playwright(name, files, extra = []) {
  return {
    name,
    command: 'npx',
    args: ['playwright', 'test', ...files, '--project=desktop-chromium', '--workers=1', '--reporter=line', ...extra],
  };
}

async function main() {
  log(`Base URL: ${env.PLAYWRIGHT_BASE_URL}`);
  log(`API URL: ${env.PLAYWRIGHT_API_BASE}`);
  log(`Safe mutation mode: ${enabled(env.CHURVOX_E2E_MUTATE) ? 'ENABLED' : 'disabled'}`);
  log(`Real signup mode: ${enabled(env.CHURVOX_E2E_SIGNUP) ? 'ENABLED' : 'disabled'}`);
  log(`Owner credentials: ${hasOwnerCredentials() ? 'available' : 'missing — authenticated tests may skip'}`);
  log(`Worker credentials: ${hasWorkerCredentials() ? 'available' : 'missing — worker login tests may skip'}`);
  log(`Report: ${reportPath}`);

  const steps = [
    { name: 'Production build', command: 'npm', args: ['run', 'build'] },
    playwright('Live backend, webhook and route security gate', ['tests/e2e/churvox-infrastructure-paid-launch.spec.js']),
    playwright('Public customer document safety and payment state', ['tests/e2e/churvox-public-documents-paid-launch.spec.js']),
    playwright('Public trust, auth, billing return and tester route audit', ['tests/e2e/churvox-paid-launch-full-audit.spec.js']),
    playwright('Paid-launch owner contract audit', ['tests/e2e/churvox-paid-launch-own-it-audit.spec.js']),
    playwright('Rebuilt HQ reality audit', ['tests/e2e/churvox-paid-launch-hq-reality.spec.js']),
    playwright('Public honesty and route function audit', ['tests/e2e/churvox-public-honesty-and-function.spec.js']),
    playwright('Owner route and tier wiring audit', ['tests/e2e/churvox-owner-logical-wiring-contract.spec.js', 'tests/e2e/churvox-sidebar-tier-contract.spec.js']),
  ];

  if (hasWorkerCredentials()) {
    steps.push(playwright('Worker message and field loop audit', ['tests/e2e/churvox-worker-message-flow.spec.js']));
  } else {
    log('SKIP - Worker message login audit: worker credentials not supplied.');
  }

  if (enabled(env.CHURVOX_E2E_SIGNUP)) {
    steps.push(playwright('Real signup to Stripe checkout audit', ['tests/e2e/churvox-signup-to-stripe.spec.js']));
  } else {
    log('SKIP - Real signup creation: set CHURVOX_E2E_SIGNUP=1 when you deliberately want a new production test account.');
  }

  if (enabled(env.CHURVOX_E2E_MUTATE)) {
    steps.push(playwright('Safe production record mutation audit', ['tests/e2e/churvox-real-deal-paid-launch-audit.spec.js', 'tests/e2e/churvox-public-client-portal-proof.spec.js']));
  } else {
    log('SKIP - Production record creation: set CHURVOX_E2E_MUTATE=1 only for a deliberate mutation run.');
  }

  const results = [];
  for (const step of steps) {
    const result = await runStep(step);
    results.push(result);
    if (step.name === 'Production build' && result.code !== 0) break;
  }

  log('');
  log('===== PAID-LAUNCH GATE SUMMARY =====');
  results.forEach((result) => log(`${result.code === 0 ? 'PASS' : 'FAIL'} - ${result.name} (${result.seconds}s)`));
  const failed = results.filter((result) => result.code !== 0);
  log('');
  log(failed.length ? `PAID-LAUNCH GATE FAILED: ${failed.length} step(s) need fixing.` : 'PAID-LAUNCH GATE PASSED for every enabled step.');
  if (!hasOwnerCredentials()) log('WARNING: owner-authenticated live coverage was incomplete because owner credentials were not supplied.');
  if (!hasWorkerCredentials()) log('WARNING: worker-authenticated live coverage was incomplete because worker credentials were not supplied.');
  log(`Finished: ${new Date().toISOString()}`);
  log(`Saved report: ${reportPath}`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((error) => {
  log('');
  log(`Launch gate crashed: ${error?.stack || error}`);
  process.exit(1);
});
