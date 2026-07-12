#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const frontendRoot = process.cwd();
const repoRoot = path.resolve(frontendRoot, '..');
const reportDir = process.env.CHURVOX_LAUNCH_GATE_REPORT_DIR || path.join(os.tmpdir(), 'churvox-paid-launch-release');
const reportPath = path.join(reportDir, 'churvox-paid-launch-release-report.txt');
const enabled = (value) => /^(1|true|yes)$/i.test(String(value || ''));

fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(reportPath, `Churvox paid-launch release gate\nStarted: ${new Date().toISOString()}\n\n`);

const env = {
  ...process.env,
  PLAYWRIGHT_BASE_URL: process.env.PLAYWRIGHT_BASE_URL || 'https://www.churvox.com',
  PLAYWRIGHT_API_BASE: process.env.PLAYWRIGHT_API_BASE || 'https://grassley-backend.onrender.com',
  CHURVOX_E2E_SIGNUP: process.env.CHURVOX_E2E_SIGNUP || '0',
  CHURVOX_E2E_MUTATE: process.env.CHURVOX_E2E_MUTATE || '0',
};

const pythonFiles = [
  'backend/sitecustomize.py',
  'backend/usercustomize.py',
  'backend/churvox_paid_launch_guard_patch.py',
  'backend/churvox_stripe_webhook_paid_launch_patch.py',
  'backend/churvox_public_documents_paid_launch_guard.py',
  'backend/churvox_public_invoice_balance_fix.py',
  'backend/churvox_public_customer_request_paid_launch.py',
  'backend/churvox_production_launch_security.py',
  'backend/churvox_email_links_paid_launch_patch.py',
  'backend/churvox_auth_paid_launch_hardening.py',
  'backend/churvox_password_recovery_paid_launch_patch.py',
  'backend/churvox_checkout_token_session_guard.py',
  'backend/churvox_login_paid_launch_final_patch.py',
  'backend/churvox_feature_tier_paid_launch_guard.py',
  'backend/churvox_plan_usage_guard_patch.py',
  'backend/churvox_billing_portal_paid_launch.py',
  'backend/churvox_account_deletion_paid_launch.py',
];

function log(line = '') {
  process.stdout.write(`${line}\n`);
  fs.appendFileSync(reportPath, `${line}\n`);
}

function credentials(prefix) {
  return Boolean(env[`${prefix}_EMAIL`] && env[`${prefix}_PASSWORD`]);
}

function run(step) {
  return new Promise((resolve) => {
    log('');
    log(`===== ${step.name} =====`);
    log(`$ ${step.command} ${step.args.join(' ')}`);
    const started = Date.now();
    const child = spawn(step.command, step.args, {
      cwd: step.cwd || frontendRoot,
      env,
      shell: process.platform === 'win32',
    });
    child.stdout.on('data', (chunk) => { process.stdout.write(chunk); fs.appendFileSync(reportPath, chunk); });
    child.stderr.on('data', (chunk) => { process.stderr.write(chunk); fs.appendFileSync(reportPath, chunk); });
    child.on('close', (code) => {
      const seconds = Math.round((Date.now() - started) / 1000);
      const result = { ...step, code: Number.isInteger(code) ? code : 1, seconds };
      log(`===== ${step.name} ${result.code === 0 ? 'PASSED' : 'FAILED'} in ${seconds}s =====`);
      resolve(result);
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

function pythonSyntax() {
  const files = pythonFiles.map((file) => path.join(repoRoot, file));
  const code = [
    'import py_compile, sys',
    `files = ${JSON.stringify(files)}`,
    'failed = False',
    'for file in files:',
    '    try:',
    '        py_compile.compile(file, doraise=True)',
    '        print("PASS", file)',
    '    except Exception as exc:',
    '        failed = True',
    '        print("FAIL", file, exc)',
    'sys.exit(1 if failed else 0)',
  ].join('\n');
  return { name: 'Backend paid-launch syntax', command: process.env.PYTHON || 'python', args: ['-c', code], cwd: repoRoot };
}

function backendContracts() {
  return {
    name: 'Backend tier, login and recovery contracts',
    command: process.env.PYTHON || 'python',
    args: [
      '-m', 'unittest',
      'backend.test_churvox_feature_tier_paid_launch_guard',
      'backend.test_churvox_login_paid_launch_final_patch',
      'backend.test_churvox_password_recovery_paid_launch_patch',
    ],
    cwd: repoRoot,
  };
}

async function main() {
  const ownerAvailable = credentials('CHURVOX_OWNER') || credentials('CHURVOX_E2E');
  const workerAvailable = credentials('CHURVOX_WORKER') || credentials('CHURVOX_E2E_WORKER');

  log(`Frontend: ${env.PLAYWRIGHT_BASE_URL}`);
  log(`Backend: ${env.PLAYWRIGHT_API_BASE}`);
  log(`Owner credentials: ${ownerAvailable ? 'available' : 'missing'}`);
  log(`Worker credentials: ${workerAvailable ? 'available' : 'missing'}`);
  log(`Real signup: ${enabled(env.CHURVOX_E2E_SIGNUP) ? 'enabled' : 'disabled'}`);
  log(`Production mutation: ${enabled(env.CHURVOX_E2E_MUTATE) ? 'enabled' : 'disabled'}`);
  log(`Report: ${reportPath}`);

  const steps = [
    { name: 'Frontend production build', command: 'npm', args: ['run', 'build'] },
    pythonSyntax(),
    backendContracts(),
    playwright('Live configuration, security, webhook and route mount', ['tests/e2e/churvox-infrastructure-paid-launch.spec.js']),
    playwright('Live plan limits and real usage counts', ['tests/e2e/churvox-plan-usage-live.spec.js']),
    playwright('Authentication, login confirmation, recovery and role boundaries', [
      'tests/e2e/churvox-auth-paid-launch-contract.spec.js',
      'tests/e2e/churvox-login-recovery-paid-launch.spec.js',
    ]),
    playwright('Plans shows verified usage and never assumes zero', ['tests/e2e/churvox-plans-usage-truth.spec.js']),
    playwright('Billing portal, cancellation and deletion lifecycle', ['tests/e2e/churvox-billing-lifecycle-paid-launch.spec.js']),
    playwright('Customer quote, invoice, client portal and proof safety', ['tests/e2e/churvox-public-documents-paid-launch.spec.js']),
    playwright('Public customer request owner-review contract', ['tests/e2e/churvox-public-request-paid-launch.spec.js']),
    playwright('Dashboard More menu, tier visibility and locked hashes', ['tests/e2e/churvox-more-menu-paid-launch.spec.js']),
    playwright('Public trust, billing return and tester route audit', ['tests/e2e/churvox-paid-launch-full-audit.spec.js']),
    playwright('Owner paid-launch product contract', ['tests/e2e/churvox-paid-launch-own-it-audit.spec.js']),
    playwright('HQ, tester invite and revoke reality', ['tests/e2e/churvox-paid-launch-hq-reality.spec.js']),
    playwright('Public honesty and functional routes', ['tests/e2e/churvox-public-honesty-and-function.spec.js']),
    playwright('Owner wiring and tier boundaries', ['tests/e2e/churvox-owner-logical-wiring-contract.spec.js', 'tests/e2e/churvox-sidebar-tier-contract.spec.js']),
    playwright('Mobile login, More menu, public and billing lifecycle', [
      'tests/e2e/churvox-login-recovery-paid-launch.spec.js',
      'tests/e2e/churvox-more-menu-paid-launch.spec.js',
      'tests/e2e/churvox-public-documents-paid-launch.spec.js',
      'tests/e2e/churvox-public-request-paid-launch.spec.js',
      'tests/e2e/churvox-billing-lifecycle-paid-launch.spec.js',
    ], 'mobile-chromium'),
  ];

  if (workerAvailable) {
    steps.push(playwright('Worker messages and field loop', ['tests/e2e/churvox-worker-message-flow.spec.js']));
  } else {
    log('SKIP - worker-authenticated field loop: worker credentials are missing.');
  }

  if (enabled(env.CHURVOX_E2E_SIGNUP)) {
    steps.push(playwright('Real signup, consent, Stripe and verification delivery', [
      'tests/e2e/churvox-real-signup-paid-launch-v2.spec.js',
      'tests/e2e/churvox-email-verification-paid-launch-v2.spec.js',
    ]));
  } else {
    log('SKIP - real production signup. Set CHURVOX_E2E_SIGNUP=1 only for a deliberate account-creation run.');
  }

  if (enabled(env.CHURVOX_E2E_MUTATE)) {
    steps.push(playwright('Real production record and client-portal mutation', [
      'tests/e2e/churvox-real-deal-paid-launch-audit.spec.js',
      'tests/e2e/churvox-public-client-portal-proof.spec.js',
    ]));
  } else {
    log('SKIP - real production record creation. Set CHURVOX_E2E_MUTATE=1 only for a deliberate mutation run.');
  }

  const results = [];
  for (const step of steps) {
    const result = await run(step);
    results.push(result);
    if (result.code !== 0 && ['Frontend production build', 'Backend paid-launch syntax', 'Backend tier, login and recovery contracts'].includes(step.name)) break;
  }

  log('');
  log('===== RELEASE DECISION =====');
  results.forEach((result) => log(`${result.code === 0 ? 'PASS' : 'FAIL'} - ${result.name} (${result.seconds}s)`));
  const failed = results.filter((result) => result.code !== 0);
  log('');
  log(failed.length ? `BLOCK PAID LAUNCH: ${failed.length} enabled gate(s) failed.` : 'ALL ENABLED RELEASE GATES PASSED.');
  if (!ownerAvailable) log('WARNING: owner-authenticated live coverage may have skipped.');
  if (!workerAvailable) log('WARNING: worker-authenticated live coverage was skipped.');
  log(`Finished: ${new Date().toISOString()}`);
  log(`Report: ${reportPath}`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((error) => {
  log(`Release gate crashed: ${error?.stack || error}`);
  process.exit(1);
});
