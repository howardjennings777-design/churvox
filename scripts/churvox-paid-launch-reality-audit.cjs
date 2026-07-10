#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const failures = [];
const checks = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function check(name, ok, detail) {
  const passed = Boolean(ok);
  checks.push({ name, passed });
  if (!passed) failures.push(`${name}: ${detail}`);
}

function validJs(source) {
  try { new Function(source); return true; } catch { return false; }
}

const baseReport = read('backend/churvox_hq_paid_launch_report_patch.py');
const filterPatch = read('backend/churvox_hq_paid_launch_filter_patch.py');
const postguard = read('backend/churvox_hq_paid_launch_postguard_patch.py');
const installer = read('backend/churvox_hq_connection_status_patch.py');
const hq = read('frontend/src/pages/PaidLaunchHQ.jsx');
const hqCss = read('frontend/src/pages/PaidLaunchHQ.css');
const hqEntry = read('frontend/src/pages/ChurvoxHQPage.jsx');
const adminRoute = read('frontend/src/components/admin/PlatformAdminRoute.jsx');
const mockedHqTest = read('frontend/tests/e2e/churvox-paid-launch-hq-reality.spec.js');
const liveHqTest = read('frontend/tests/e2e/churvox-hq-live-real-data.spec.js');
const ownerWorkerTest = read('frontend/tests/e2e/churvox-live-owner-worker-readonly.spec.js');
const behaviorTest = read('scripts/churvox_hq_paid_launch_behavior_test.py');
const behaviorRunner = read('scripts/churvox-hq-paid-launch-behavior.cjs');
const liveHqRunner = read('scripts/churvox-live-hq-real-data.cjs');
const ownerWorkerRunner = read('scripts/churvox-live-owner-worker-readonly.cjs');
const pythonSyntax = read('scripts/churvox-command-python-syntax.cjs');
const rootPackage = JSON.parse(read('package.json'));
const frontendPackage = JSON.parse(read('frontend/package.json'));

check(
  'owner-only live HQ route exists',
  baseReport.includes('/api/admin/owner/paid-launch-report')
    && baseReport.includes('async def require_owner')
    && baseReport.includes('raise HTTPException(status_code=403')
    && baseReport.includes('"sample_records_included": False'),
  'Paid-launch data must be protected and sample records explicitly excluded',
);

check(
  'synthetic filtering is precise rather than broad',
  filterPatch.includes('def is_internal_record')
    && filterPatch.includes('SYNTHETIC_DOMAINS')
    && filterPatch.includes('real tester accounts must stay visible')
    && !filterPatch.includes('any(marker in hay for marker in INTERNAL_MARKERS)'),
  'Legitimate testers must remain visible while explicit demo/sample records are excluded',
);

check(
  'every subscription candidate is checked against live Stripe',
  postguard.includes('async def billing_population')
    && postguard.includes('rows = await db.users.find({})')
    && postguard.includes('if subscription_id:')
    && postguard.includes('stripe = _stripe_snapshot([row.get("stripe_subscription_id") for row in subscription_candidates])')
    && postguard.includes('live_status_by_id')
    && postguard.includes('if live_status == "active"')
    && postguard.includes('elif live_status == "trialing"')
    && postguard.includes('"database_status_is_not_billing_truth": True'),
  'Mongo status cannot decide paid/trial classification; Stripe must classify every non-tester subscription ID',
);

check(
  'paid counts and MRR are Stripe-confirmed only',
  postguard.includes('"paid_definition": "stripe_subscription_status_active"')
    && postguard.includes('"trial_definition": "stripe_subscription_status_trialing"')
    && postguard.includes('"subscription_id_alone_is_not_paid": True')
    && postguard.includes('if _low(item.get("status")) != "active"')
    && postguard.includes('billing["actual_mrr_nzd"] = paid_mrr_by_currency.get("nzd")')
    && postguard.includes('"mrr_definition": "active_stripe_subscription_price_items_only"')
    && postguard.includes('report["source"] = "live_database_and_stripe_v2"'),
  'Trials, stored IDs and estimates must not inflate verified paid users or actual MRR',
);

check(
  'hard payment launch checks are enforced',
  ['STRIPE_PRICE_SOLO', 'STRIPE_PRICE_TEAM', 'STRIPE_PRICE_PRO', 'STRIPE_PRICE_ENTERPRISE'].every((key) => postguard.includes(`"${key}"`))
    && postguard.includes('STRIPE_WEBHOOK_SECRET')
    && postguard.includes('"label": "Stripe plan prices"')
    && postguard.includes('"label": "Stripe webhooks"')
    && postguard.includes('"label": "Billing truth"')
    && postguard.includes('report["ready_to_take_payments"] = all(item.get("status") != "fail"'),
  'Missing Stripe access, a price ID, webhook signing or unresolved billing must block paid-ready status',
);

check(
  'raw database counts and filtered customer metrics remain separate',
  baseReport.includes('count_documents({})')
    && baseReport.includes('"collections": {')
    && postguard.includes('async def filtered_business_count')
    && postguard.includes('counts["businesses_source"] = "filtered_businesses_collection"')
    && baseReport.includes('"stripe_webhook": await latest("stripe_webhook_events")'),
  'HQ should show raw collection totals while excluding internal/sample businesses from customer headlines',
);

check(
  'normal backend startup installs filter, report and postguard in order',
  installer.includes('install_paid_launch_filter(module)')
    && installer.includes('install_paid_launch_report(module)')
    && installer.includes('install_paid_launch_postguard(module)')
    && installer.indexOf('install_paid_launch_filter(module)') < installer.indexOf('install_paid_launch_report(module)')
    && installer.indexOf('install_paid_launch_report(module)') < installer.indexOf('install_paid_launch_postguard(module)'),
  'Render startup must install the full real-data chain in the correct order',
);

check(
  'HQ screen consumes authoritative report without inferred fallbacks',
  hqEntry.includes('export { default } from "./PaidLaunchHQ"')
    && hq.includes('CHURVOX_REAL_PAID_LAUNCH_HQ_20260711')
    && hq.includes('launch: "/api/admin/owner/paid-launch-report"')
    && hq.includes('numberText(launchCounts.verified_paid_users)')
    && hq.includes('hasValue(actualMrr)')
    && hq.includes('Not replaced by an estimate')
    && !hq.includes('metrics.paid_users ||')
    && !hq.includes('monthly_revenue_estimate ||'),
  'True zeroes and unavailable values must not be replaced by old overview estimates',
);

check(
  'HQ retains real operations and responsive design',
  ['"Paid launch"', '"Users"', '"Billing"', '"Testers"', '"Businesses"', '"Activity"', '"System"', '"Data"'].every((value) => hq.includes(value))
    && hq.includes('apiPost("/api/admin/owner/control-access"')
    && hq.includes('apiPost("/api/admin/owner/tester-intake"')
    && hq.includes('<RemoveCustomerDataCard />')
    && hqCss.includes('@media (max-width: 820px)')
    && hqCss.includes('@media (max-width: 560px)'),
  'HQ must keep real owner controls and work on desktop/mobile',
);

check(
  'platform-owner frontend access matches protected backend access',
  adminRoute.includes('PLATFORM_OWNER_EMAILS')
    && adminRoute.includes('hello@churvox.com')
    && adminRoute.includes('howardjennings77@gmail.com')
    && adminRoute.includes('platform_owner'),
  'Known owner identities and explicit platform-owner roles must reach /admin',
);

check(
  'safe HQ browser proof challenges fake fallback numbers',
  validJs(mockedHqTest)
    && mockedHqTest.includes('metrics: { total_users: 99, paid_users: 99, monthly_revenue_estimate: 9999 }')
    && mockedHqTest.includes('true zero and unavailable values are never replaced by old inferred totals')
    && mockedHqTest.includes('all HQ areas render and safe owner controls perform real requests')
    && mockedHqTest.includes('endpoint failure stays visible and mobile controls remain usable')
    && !/\btest\.(?:skip|only)\b|\bdescribe\.only\b/.test(mockedHqTest),
  'The desktop/mobile HQ test must challenge old totals, zeroes, failures and controls without being skipped',
);

check(
  'authenticated live HQ smoke compares backend and rendered values',
  validJs(liveHqTest)
    && liveHqTest.includes("expect(report.source).toBe('live_database_and_stripe_v2')")
    && liveHqTest.includes("expect(report.truth?.paid_definition).toBe('stripe_subscription_status_active')")
    && liveHqTest.includes("expect(report.truth?.mrr_definition).toBe('active_stripe_subscription_price_items_only')")
    && liveHqTest.includes("for (const key of ['database', 'owner_lock', 'stripe', 'prices', 'billing_truth', 'webhooks', 'email'])")
    && liveHqTest.includes("page.goto('/admin'")
    && liveHqRunner.includes('CHURVOX_OWNER_EMAIL')
    && !/\btest\.(?:skip|only)\b|\bdescribe\.only\b/.test(liveHqTest),
  'After deployment the real report, hard launch checks and /admin values must agree under owner auth',
);

check(
  'backend behavior proof executes real classification and launch gates',
  behaviorTest.includes('assert report["source"] == "live_database_and_stripe_v2"')
    && behaviorTest.includes('assert report["truth"]["paid_definition"] == "stripe_subscription_status_active"')
    && behaviorTest.includes('assert report["truth"]["mrr_definition"] == "active_stripe_subscription_price_items_only"')
    && behaviorTest.includes('assert report["billing"]["stripe"]["paid_mrr_by_currency"]["nzd"] == 89.0')
    && behaviorTest.includes('assert check_by_key["prices"]["status"] == "pass"')
    && behaviorTest.includes('assert check_by_key["webhooks"]["status"] == "pass"')
    && behaviorTest.includes('assert report["counts"]["businesses_source"] == "filtered_businesses_collection"')
    && behaviorTest.includes('assert exc.status_code == 403')
    && behaviorRunner.includes('scripts/churvox_hq_paid_launch_behavior_test.py'),
  'The real backend route must execute with controlled database, Stripe, pricing, webhook and owner-lock cases',
);

check(
  'read-only deployed owner/worker smoke covers real operational surfaces',
  validJs(ownerWorkerTest)
    && ownerWorkerTest.includes("'/api/auth/login'")
    && ownerWorkerTest.includes("'/api/worker/auth/login'")
    && ownerWorkerTest.includes("'/api/billing/subscription-status'")
    && ownerWorkerTest.includes("['jobs', '/api/jobs']")
    && ownerWorkerTest.includes("['clients', '/api/clients']")
    && ownerWorkerTest.includes("['quotes', '/api/quotes']")
    && ownerWorkerTest.includes("['invoices', '/api/invoices']")
    && ownerWorkerTest.includes('Team does not contain configured worker')
    && ownerWorkerTest.includes("'/worker/today'")
    && ownerWorkerTest.includes("'/worker/jobs'")
    && ownerWorkerTest.includes("'/worker/help'")
    && ownerWorkerRunner.includes('CHURVOX_WORKER_EMAIL')
    && ownerWorkerRunner.includes('No POST/PATCH/DELETE business operations are performed after login.')
    && !/request\.(?:patch|put|delete)\(/.test(ownerWorkerTest)
    && !/\btest\.(?:skip|only)\b|\bdescribe\.only\b/.test(ownerWorkerTest),
  'The default deployed gate must prove owner billing/data and the linked worker account without business mutations',
);

for (const name of ['test:ui:full', 'test:ui:desktop', 'test:ui:mobile']) {
  const command = String(frontendPackage.scripts?.[name] || '');
  check(`${name} includes paid-launch HQ browser proof`, command.includes('churvox-paid-launch-hq-reality.spec.js'), `${name} is missing the HQ reality spec`);
}

const scripts = rootPackage.scripts || {};
check(
  'one-command predeploy and deployed paid-launch gates are wired',
  scripts['test:hq:behavior'] === 'node scripts/churvox-hq-paid-launch-behavior.cjs'
    && scripts['test:paid-launch:reality'] === 'node scripts/churvox-paid-launch-reality-audit.cjs'
    && scripts['test:paid-launch:full'] === 'npm run test:prelive:full'
    && scripts['test:hq:live-real'] === 'node scripts/churvox-live-hq-real-data.cjs'
    && scripts['test:owner-worker:live-readonly'] === 'node scripts/churvox-live-owner-worker-readonly.cjs'
    && scripts['test:paid-launch:live'] === 'npm run test:truth:live && npm run test:live-command && npm run test:hq:live-real && npm run test:owner-worker:live-readonly'
    && String(scripts['test:readiness'] || '').includes('churvox-hq-paid-launch-behavior.cjs')
    && String(scripts['test:readiness'] || '').includes('churvox-paid-launch-reality-audit.cjs'),
  'The full launch must not depend on remembering separate commands',
);

check(
  'Python syntax gate includes the complete HQ backend chain',
  ['backend/churvox_hq_paid_launch_filter_patch.py', 'backend/churvox_hq_paid_launch_report_patch.py', 'backend/churvox_hq_paid_launch_postguard_patch.py', 'backend/churvox_hq_connection_status_patch.py', 'scripts/churvox_hq_paid_launch_behavior_test.py'].every((value) => pythonSyntax.includes(value)),
  'All new Python files must be AST parsed before browser tests',
);

for (const item of checks) console.log(`${item.passed ? '✓' : '✗'} ${item.name}`);
if (failures.length) {
  console.error(`\nPaid launch reality audit failed: ${failures.length} issue(s).`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`\nPaid launch reality audit passed: ${checks.length} payment, billing, HQ, owner, worker and live-auth contracts checked.`);
