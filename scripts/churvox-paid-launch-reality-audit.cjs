#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const failures = [];
const checks = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function expect(name, ok, detail) {
  checks.push({ name, ok: Boolean(ok), detail });
  if (!ok) failures.push(`${name}: ${detail}`);
}

const backend = read('backend/churvox_hq_paid_launch_report_patch.py');
const connection = read('backend/churvox_hq_connection_status_patch.py');
const hq = read('frontend/src/pages/PaidLaunchHQ.jsx');
const hqEntry = read('frontend/src/pages/ChurvoxHQPage.jsx');
const hqCss = read('frontend/src/pages/PaidLaunchHQ.css');
const adminRoute = read('frontend/src/components/admin/PlatformAdminRoute.jsx');
const browserTest = read('frontend/tests/e2e/churvox-paid-launch-hq-reality.spec.js');
const behaviorTest = read('scripts/churvox_hq_paid_launch_behavior_test.py');
const behaviorRunner = read('scripts/churvox-hq-paid-launch-behavior.cjs');
const rootPackage = JSON.parse(read('package.json'));
const frontendPackage = JSON.parse(read('frontend/package.json'));
const pythonSyntax = read('scripts/churvox-command-python-syntax.cjs');

expect(
  'backend exposes an owner-only paid launch report',
  backend.includes('/api/admin/owner/paid-launch-report')
    && backend.includes('async def require_owner')
    && backend.includes('raise HTTPException(status_code=403')
    && backend.includes('"source": "live_database_and_stripe_v1"')
    && backend.includes('"sample_records_included": False'),
  'The report must be owner-only, live-sourced and explicitly exclude sample records',
);

expect(
  'paid users require Stripe subscription proof',
  backend.includes('def _verified_paid')
    && backend.includes('_status(doc) in {"active", "paid"}')
    && backend.includes('bool(_subscription_id(doc))')
    && backend.includes('def _billing_needs_verification')
    && backend.includes('and not _subscription_id(doc)'),
  'Active status alone must never be counted as verified paid',
);

expect(
  'Stripe MRR is calculated from recurring subscription price items',
  backend.includes('stripe.Subscription.retrieve(subscription_id)')
    && backend.includes('def _monthly_amount')
    && backend.includes('"mrr_by_currency"')
    && backend.includes('"actual_mrr_nzd": actual_mrr_nzd')
    && backend.includes('"estimated_mrr_nzd": estimated_mrr_nzd')
    && backend.includes('"estimate_is_separate": True'),
  'Actual Stripe MRR and the plan-price estimate must remain separate fields',
);

expect(
  'HQ collection counts and freshness come from the database',
  backend.includes('count_documents({})')
    && backend.includes('"collections": {')
    && backend.includes('"latest": {')
    && backend.includes('"stripe_webhook": await latest("stripe_webhook_events")')
    && backend.includes('"support_message": await latest("support_messages")'),
  'HQ must expose real collection counts and latest backend records',
);

expect(
  'connection patch installs and advertises the paid launch report',
  connection.includes('from churvox_hq_paid_launch_report_patch import install as install_paid_launch_report')
    && connection.includes('install_paid_launch_report(module)')
    && connection.includes('"paid_launch_report": "/api/admin/owner/paid-launch-report"'),
  'The backend wrapper must install the route during normal Render startup',
);

expect(
  'HQ route uses the new real-data React screen',
  hqEntry.includes('export { default } from "./PaidLaunchHQ"')
    && hq.includes('CHURVOX_REAL_PAID_LAUNCH_HQ_20260711')
    && hq.includes('launch: "/api/admin/owner/paid-launch-report"')
    && hq.includes('actual_mrr_nzd')
    && hq.includes('verified_paid_users')
    && hq.includes('billing_needs_verification'),
  'The /admin screen must consume the authoritative paid-launch endpoint',
);

expect(
  'HQ does not silently replace verified values with old inferred totals',
  !hq.includes('metrics.paid_users ||')
    && !hq.includes('paid.length')
    && !hq.includes('monthly_revenue_estimate ||')
    && hq.includes('hasValue(actualMrr)')
    && hq.includes('numberText(launchCounts.verified_paid_users)')
    && hq.includes('Not replaced by an estimate'),
  'Zero and unavailable values must remain truthful',
);

expect(
  'HQ includes real system, billing and control surfaces',
  [
    '"Paid launch"',
    '"Users"',
    '"Billing"',
    '"Testers"',
    '"Businesses"',
    '"Activity"',
    '"System"',
    '"Data"',
    'apiPost("/api/admin/owner/control-access"',
    'apiPost("/api/admin/owner/tester-intake"',
    '<RemoveCustomerDataCard />',
  ].every((value) => hq.includes(value)),
  'Paid launch HQ must retain real owner operations without sample records',
);

expect(
  'platform owner frontend access matches protected backend owner identities',
  adminRoute.includes('PLATFORM_OWNER_EMAILS')
    && adminRoute.includes('hello@churvox.com')
    && adminRoute.includes('howardjennings77@gmail.com')
    && adminRoute.includes('platform_owner')
    && !adminRoute.includes('const PLATFORM_OWNER_EMAIL = "hello@churvox.com";'),
  'Known platform-owner identities and explicit owner roles must reach HQ',
);

expect(
  'HQ layout is responsive and mobile controls are tappable',
  hqCss.includes('@media (max-width: 820px)')
    && hqCss.includes('@media (max-width: 560px)')
    && hqCss.includes('min-height: 46px')
    && hqCss.includes('.plhqSide nav')
    && hqCss.includes('overflow-x: auto'),
  'HQ must work on desktop and mobile without tiny controls',
);

let browserSyntaxOk = true;
try { new Function(browserTest); } catch { browserSyntaxOk = false; }
expect(
  'paid launch browser test proves authoritative counts, controls, failures and mobile',
  browserSyntaxOk
    && browserTest.includes('authoritative report drives paid counts and keeps estimates separate')
    && browserTest.includes('true zero and unavailable values are never replaced by old inferred totals')
    && browserTest.includes('all HQ areas render and safe owner controls perform real requests')
    && browserTest.includes('endpoint failure stays visible and mobile controls remain usable')
    && browserTest.includes('metrics: { total_users: 99, paid_users: 99, monthly_revenue_estimate: 9999 }')
    && !/\btest\.(?:skip|only)\b|\bdescribe\.only\b/.test(browserTest),
  'The browser proof must actively challenge old fallback counts and cannot be skipped',
);

expect(
  'backend behavior test executes verified, unverified, tester, trial and owner-lock cases',
  behaviorTest.includes('assert report["counts"]["verified_paid_users"] == 1')
    && behaviorTest.includes('assert report["counts"]["billing_needs_verification"] == 1')
    && behaviorTest.includes('assert report["counts"]["tester_users"] == 1')
    && behaviorTest.includes('assert report["counts"]["verified_trial_users"] == 1')
    && behaviorTest.includes('assert report["counts"]["internal_users_excluded"] == 2')
    && behaviorTest.includes('assert exc.status_code == 403')
    && behaviorRunner.includes('scripts/churvox_hq_paid_launch_behavior_test.py'),
  'The real endpoint logic must be executed against a controlled database, not only scanned as text',
);

for (const name of ['test:ui:full', 'test:ui:desktop', 'test:ui:mobile']) {
  const command = String(frontendPackage.scripts?.[name] || '');
  expect(
    `${name} includes the paid launch HQ proof`,
    command.includes('churvox-paid-launch-hq-reality.spec.js'),
    `${name} must run the paid launch HQ reality browser spec`,
  );
}

const readiness = String(rootPackage.scripts?.['test:readiness'] || '');
expect(
  'readiness includes paid launch source and backend behavior audits',
  readiness.includes('churvox-paid-launch-reality-audit.cjs')
    && readiness.includes('churvox-hq-paid-launch-behavior.cjs')
    && rootPackage.scripts?.['test:paid-launch:reality'] === 'node scripts/churvox-paid-launch-reality-audit.cjs'
    && rootPackage.scripts?.['test:hq:behavior'] === 'node scripts/churvox-hq-paid-launch-behavior.cjs',
  'Root readiness must run both audits and expose direct commands',
);

expect(
  'Python syntax gate includes new HQ backend and behavior files',
  pythonSyntax.includes('backend/churvox_hq_paid_launch_report_patch.py')
    && pythonSyntax.includes('backend/churvox_hq_connection_status_patch.py')
    && pythonSyntax.includes('scripts/churvox_hq_paid_launch_behavior_test.py'),
  'The new backend report, installer and behavior test must be AST parsed before launch',
);

for (const check of checks) console.log(`${check.ok ? '✓' : '✗'} ${check.name}${check.ok ? '' : ` — ${check.detail}`}`);
if (failures.length) {
  console.error(`\nPaid launch reality audit failed: ${failures.length} issue(s).`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`\nPaid launch reality audit passed: ${checks.length} truth, billing, HQ, backend behavior, control and browser contracts checked.`);
