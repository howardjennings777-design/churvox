#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const root = process.cwd();
const repoRoot = path.resolve(root, '..');
const reportDir = process.env.CHURVOX_LAUNCH_GATE_REPORT_DIR || path.join(os.tmpdir(), 'churvox-paid-launch-final');
const reportPath = path.join(reportDir, 'paid-launch-final-report.txt');
const enabled = (value) => /^(1|true|yes)$/i.test(String(value || ''));

fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(reportPath, `Churvox final paid-launch gate\nStarted: ${new Date().toISOString()}\n\n`);

const env = {
  ...process.env,
  CHURVOX_E2E_MUTATE: process.env.CHURVOX_E2E_MUTATE || '0',
  CHURVOX_E2E_SIGNUP: process.env.CHURVOX_E2E_SIGNUP || '0',
  PLAYWRIGHT_BASE_URL: process.env.PLAYWRIGHT_BASE_URL || 'https://www.churvox.com',
  PLAYWRIGHT_API_BASE: process.env.PLAYWRIGHT_API_BASE || 'https://grassley-backend.onrender.com',
};

const backendFiles = [
  'backend/churvox_paid_launch_guard_patch.py',
  'backend/churvox_stripe_webhook_paid_launch_patch.py',
  'backend/churvox_public_documents_paid_launch_guard.py',
  'backend/churvox_public_invoice_balance_fix.py',
  'backend/churvox_public_customer_request_paid_launch.py',
  'backend/churvox_production_launch_security.py',
  'backend/churvox_email_links_paid_launch_patch.py',
  'backend/churvox_auth_paid_launch_hardening.py',
];

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
    const child = spawn(step.command, step.args, {
      cwd: step.cwd || root,
      env,
      shell: process.platform === 'win32',
    });
    child.stdout.on('data', (chunk) => { process.stdout.write(chunk); fs.appendFileSync(reportPath, chunk); });
    child.stderr.on('data', (chunk) => { process.stderr.write(chunk); fs.appendFileSync(reportPath, chunk); });
    child.on('error', (error) => {
      fs.appendFileSync(reportPath, `${error.stack || error}\n`);
    });
    child.on('close', (code) => {
      const seconds = Math.round((Date.now() - started) / 1000);
      log(`===== ${step.name} ${code === 0 ? 'PASSED' : 'FAILED'} in ${seconds}s =====`);
      resolve({ ...step, code: Number.isInteger(code) ? code : 1, seconds });
    });
  });
}

function playwright(name, files, project = 'desktop-chromium') {
  return {
    name,
    command: 'npx',
    args: ['playwright', 'test', ...files, `--project=${project}`, '--workers=1', '--reporter=line'],
  };
}

function pythonSyntaxStep() {
  const quoted = backendFiles.map((file) => JSON.stringify(path.join(repoRoot, file))).join(', ');
  const script = [
    'import py_compile, sys',
    `files = [${quoted}]`,
    'failed = []',
    'for file in files:',
    '    try:',
    '        py_compile.compile(file, doraise=True)',
    '        print("PASS", file)',
    '    except Exception as exc:',
    '        failed.append((file, str(exc)))',
    '        print("FAIL", file, exc)',
    'sys.exit(1 if failed else 0)',
  ].join('\n');
  return { name: 'Backend paid-launch Python syntax', command: process.env.PYTHON || 'python', args: ['-c', script], cwd: repoRoot };
}

async function main() {
  log(`Frontend: ${env.PLAYWRIGHT_BASE_URL}`);
  log(`Backend: ${env.PLAYWRIGHT_API_BASE}`);
  log(`Production mutation: ${enabled(env.CHURVOX_E2E_MUTATE) ? 'ENABLED' : 'disabled'}`);
  log(`Real signup: ${enabled(env.CHURVOX_E2E_SIGNUP) ? 'ENABLED' : 'disabled'}`);
  log(`Owner credentials: ${hasOwnerCredentials() ? 'available' : 'missing'}`);
  log(`Worker credentials: ${hasWorkerCredentials() ? 'available' : 'missing'}`);
  log(`Report: ${reportPath}`);

  const steps = [
    { name: 'Production frontend build', command: 'npm', args: ['run', 'build'] },
    pythonSyntaxStep(),
    playwright('Live infrastructure, secrets, webhook and protected routes', ['tests/e2e/churvox-infrastructure-paid-launch.spec.js']),
    playwright('Signup consent, password and role contract', ['tests/e2e/churvox-auth-paid-launch-contract.spec.js']),
    playwright('Customer quote, invoice, portal and proof safety', ['tests/e2e/churvox-public-documents-paid-launch.spec.js']),
    playwright('Public work-request owner-review flow', ['tests/e2e/churvox-public-request-paid-launch.spec.js']),
    playwright('Public trust, auth, billing return and tester-route audit', ['tests/e2e/churvox-paid-launch-full-audit.spec.js']),
    playwright('Paid-launch owner contract', ['tests/e2e/churvox-paid-launch-own-it-audit.spec.js']),
    playwright('Rebuilt HQ, tester invite and revoke', ['tests/e2e/churvox-paid-launch-hq-reality.spec.js']),
    playwright('Public honesty and functional routes', ['tests/e2e/churvox-public-honesty-and-function.spec.js']),
    playwright('Owner wiring and tier restrictions', ['tests/e2e/churvox-owner-logical-wiring-contract.spec.js', 'tests/e2e/churvox-sidebar-tier-contract.spec.js']),
    playwright('Mobile public and auth contract', ['tests/e2e/churvox-paid-launch-full-audit.spec.js', 'tests/e2e/churvox-auth-paid-launch-contract.spec.js'], 'mobile-chromium'),
  ];

  if (hasWorkerCredentials()) {
    steps.push(playwright('Worker message and field loop', ['tests/e2e/churvox-worker-message-flow.spec.js']));
  } else {
    log('SKIP - worker authenticated flow: worker credentials not supplied.');
  }

  if (enabled(env.CHURVOX_E2E_SIGNUP)) {
    steps.push(playwright('Real signup, consent, Stripe and verification delivery', [
      'tests/e2e/churvox-real-signup-paid-launch-v2.spec.js',
      'tests/e2e/churvox-email-verification-paid-launch-v2.spec.js',
    ]));
  } else {
    log('SKIP - real production signup: set CHURVOX_E2E_SIGNUP=1 deliberately.');
  }

  if (enabled(env.CHURVOX_E2E_MUTATE)) {
    steps.push(playwright('Real owner records and customer portal mutation', [
      'tests/e2e/churvox-real-deal-paid-launch-audit.spec.js',
      'tests/e2e/churvox-public-client-portal-proof.spec.js',
    ]));
  } else {
    log('SKIP - real production record creation: set CHURVOX_E2E_MUTATE=1 deliberately.');
  }

  const results = [];
  for (const step of steps) {
    const result = await runStep(step);
    results.push(result);
    if (result.code !== 0 && ['Production frontend build', 'Backend paid-launch Python syntax'].includes(step.name)) break;
  }

  log('');
  log('===== FINAL PAID-LAUNCH SUMMARY =====');
  results.forEach((result) => log(`${result.code === 0 ? 'PASS' : 'FAIL'} - ${result.name} (${result.seconds}s)`));
  const failures = results.filter((result) => result.code !== 0);
  log('');
  log(failures.length ? `NOT READY: ${failures.length} enabled gate(s) failed.` : 'ALL ENABLED PAID-LAUNCH GATES PASSED.');
  if (!hasOwnerCredentials()) log('WARNING: owner-authenticated live tests may have skipped.');
  if (!hasWorkerCredentials()) log('WARNING: worker-authenticated live tests were skipped.');
  log(`Finished: ${new Date().toISOString()}`);
  log(`Report: ${reportPath}`);
  process.exit(failures.length ? 1 : 0);
}

main().catch((error) => {
  log(`Gate crashed: ${error?.stack || error}`);
  process.exit(1);
});
