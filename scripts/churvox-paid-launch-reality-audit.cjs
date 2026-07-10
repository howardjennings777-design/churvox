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
const filter = read('backend/churvox_hq_paid_launch_filter_patch.py');
const postguard = read('backend/churvox_hq_paid_launch_postguard_patch.py');
const connection = read('backend/churvox_hq_connection_status_patch.py');
const hq = read('frontend/src/pages/PaidLaunchHQ.jsx');
const hqEntry = read('frontend/src/pages/ChurvoxHQPage.jsx');
const hqCss = read('frontend/src/pages/PaidLaunchHQ.css');
const adminRoute = read('frontend/src/components/admin/PlatformAdminRoute.jsx');
const browserTest = read('frontend/tests/e2e/churvox-paid-launch-hq-reality.spec.js');
const liveHqTest = read('frontend/tests/e2e/churvox-hq-live-real-data.spec.js');
const ownerWorkerTest = read('frontend/tests/e2e/churvox-live-owner-worker-readonly.spec.js');
const behaviorTest = read('scripts/churvox_hq_paid_launch_behavior_test.py');
const behaviorRunner = read('scripts/churvox-hq-paid-launch-behavior.cjs');
const liveHqRunner = read('scripts/churvox-live-hq-real-data.cjs');
const ownerWorkerRunner = read('scripts/churvox-live-owner-worker-readonly.cjs');
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
  'The base report must be owner-only, live-sourced and explicitly exclude sample records',
);

expect(
  'candidate billing rows require a stored Stripe subscription ID',
  backend.includes('def _verified_paid')
    && backend.includes('_status(doc) in {"active", "paid"}')
    && backend.includes('bool(_subscription_id(doc))')
    && backend.includes('def _billing_needs_verification')
    && backend.includes('and not _subscription_id(doc)'),
  'Active status alone must never enter the Stripe-confirmation candidate set',
);

expect(
  'precise internal filtering keeps legitimate testers visible',
  filter.includes('def is_internal_record')
    && filter.includes('SYNTHETIC_LOCALS')
    && filter.includes('SYNTHETIC_DOMAINS')
    && filter.includes('real tester accounts must stay visible')
    && !filter.includes('any(marker in hay for marker in INTERNAL_MARKERS)'),
  'The production filter must use exact synthetic patterns, not a broad test substring',
);

expect(
  'postguard requires live Stripe active/trialing status',
  postguard.includes('"paid_definition": "stripe_subscription_status_active"')
    && postguard.includes('"trial_definition": "stripe_subscription_status_trialing"')
    && postguard.includes('"subscription_id_alone_is_not_paid": True')
    && postguard.includes('active_by_id.get(_text(row.get("stripe_subscription_id"))) == "active"')
    && postguard.includes('active_by_id.get(_text(row.get("stripe_subscription_id"))) == "trialing"')
    && postguard.includes('report["source"] = "live_database_and_stripe_v2"'),
  'A stored subscription ID must not be displayed as verified paid without live Stripe status',
);

expect(
  'actual MRR includes active Stripe subscriptions only',
  backend.includes('stripe.Subscription.retrieve(subscription_id)')
    && backend.includes('def _monthly_amount')
    && postguard.includes('if _low(item.get("status")) != "active"')
    && postguard.includes('stripe["paid_mrr_by_currency"] = paid_mrr_by_currency')
    && postguard.includes('billing["actual_mrr_nzd"] = paid_mrr_by_currency.get("nzd")')
    && postguard.includes('"mrr_definition": "active_stripe_subscription_price_items_only"')
    && backend.includes('"estimate_is_separate": True'),
  'Trials and plan-price estimates must never inflate actual paid MRR',
);

expect(
  'payment launch gate requires Stripe, all price IDs and webhook verification',
  ['STRIPE_PRICE_SOLO', 'STRIPE_PRICE_TEAM', 'STRIPE_PRICE_PRO', 'STRIPE_PRICE_ENTERPRISE'].every((value) => postguard.includes(`"${value}"`))
    && postguard.includes('STRIPE_WEBHOOK_SECRET')
    && postguard.includes('"label": "Stripe plan prices"')
    && postguard.includes('"label": "Stripe webhooks"')
    && postguard.includes('status": "fail" if missing_prices else "pass"')
    && postguard.includes('status": "pass" if webhook_secret else "fail"')
    && postguard.includes('report["ready_to_take_payments"] = all(item.get("status") != "fail"'),
  'HQ must never show paid-ready while Stripe credentials, a paid plan price, webhook signing or billing truth is missing',
);

expect(
  'filtered business metrics and raw collection counts stay distinct',
  backend.includes('count_documents({})')
    && backend.includes('"collections": {')
    && postguard.includes('async def filtered_business_count')
    && postguard.includes('counts["businesses_source"] = "filtered_businesses_collection"')
    && backend.includes('"stripe_webhook": await latest("stripe_webhook_events")')
    && backend.includes('"support_message": await latest("support_messages")'),
  'HQ must expose raw database counts while filtering the customer/business headline metric',
);

expect(
  'connection patch installs filter, report and postguard in order',
  connection.includes('from churvox_hq_paid_launch_filter_patch import install as install_paid_launch_filter')
    && connection.includes('install_paid_launch_filter(module)')
    && connection.includes('from churvox_hq_paid_launch_report_patch import install as install_paid_launch_report')
    && connection.includes('install_paid_launch_report(module)')
    && connection.includes('from churvox_hq_paid_launch_postguard_patch import install as install_paid_launch_postguard')
    && connection.includes('install_paid_launch_postguard(module)')
    && connection.indexOf('install_paid_launch_filter(module)') < connection.indexOf('install_paid_launch_report(module)')
    && connection.indexOf('install_paid_launch_report(module)') < connection.indexOf('install_paid_launch_postguard(module)')
    && connection.includes('"paid_launch_report": "/api/admin/owner/paid-launch-report"'),
  'Normal Render startup must install the precise filter and Stripe-confirmation guard around the report',
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
let liveHqSyntaxOk = true;
let ownerWorkerSyntaxOk = true;
try { new Function(browserTest); } catch { browserSyntaxOk = false; }
try { new Function(liveHqTest); } catch { liveHqSyntaxOk = false; }
try { new Function(ownerWorkerTest); } catch { ownerWorkerSyntaxOk = false; }
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
  'authenticated live HQ smoke requires report v2 and Stripe-confirmed rows',
  liveHqSyntaxOk
    && liveHqTest.includes("expect(report.source).toBe('live_database_and_stripe_v2')")
    && liveHqTest.includes("expect(report.truth?.paid_definition).toBe('stripe_subscription_status_active')")
    && liveHqTest.includes("expect(report.truth?.mrr_definition).toBe('active_stripe_subscription_price_items_only')")
    && liveHqTest.includes('Stripe did not confirm active status')
    && liveHqTest.includes("page.goto('/admin'")
    && liveHqRunner.includes('tests/e2e/churvox-hq-live-real-data.spec.js')
    && liveHqRunner.includes('CHURVOX_OWNER_EMAIL')
    && !/\btest\.(?:skip|only)\b|\bdescribe\.only\b/.test(liveHqTest),
  'After deployment the real backend and rendered /admin values must be compared under authenticated owner access',
);

expect(
  'read-only live owner and worker smoke covers business, billing, team and worker routes',
  ownerWorkerSyntaxOk
    && ownerWorkerTest.includes('Live read-only owner and worker operations')
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
    && ownerWorkerRunner.includes('CHURVOX_WORKER_PASSWORD')
    && ownerWorkerRunner.includes('No POST/PATCH/DELETE business operations are performed after login.')
    && !/request\.(?:patch|put|delete)\(/.test(ownerWorkerTest)
    && !/\btest\.(?:skip|only)\b|\bdescribe\.only\b/.test(ownerWorkerTest),
  'The default deployed gate must prove the real worker account and owner business without creating or changing records',
);

expect(
  'backend behavior test executes Stripe confirmation, payment config, filtering and owner-lock cases',
  behaviorTest.includes('assert report["source"] == "live_database_and_stripe_v2"')
    && behaviorTest.includes('assert report["truth"]["paid_definition"] == "stripe_subscription_status_active"')
    && behaviorTest.includes('assert report["truth"]["mrr_definition"] == "active_stripe_subscription_price_items_only"')
    && behaviorTest.includes('assert report["counts"]["verified_paid_users"] == 1')
    && behaviorTest.includes('assert report["counts"]["billing_needs_verification"] == 1')
    && behaviorTest.includes('assert report["counts"]["tester_users"] == 1')
    && behaviorTest.includes('assert report["counts"]["verified_trial_users"] == 1')
    && behaviorTest.includes('assert report["counts"]["internal_users_excluded"] == 2')
    && behaviorTest.includes('assert report["counts"]["businesses_source"] == "filtered_businesses_collection"')
    && behaviorTest.includes('assert check_by_key["prices"]["status"] == "pass"')
    && behaviorTest.includes('assert check_by_key["webhooks"]["status"] == "pass"')
    && behaviorTest.includes('assert exc.status_code == 403')
    && behaviorRunner.includes('scripts/churvox_hq_paid_launch_behavior_test.py'),
  'The real endpoint and postguard logic must execute against controlled database, Stripe, price and webhook conditions',
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
    && rootPackage.scripts?.['test:hq:behavior'] === 'node scripts/churvox-hq-paid-launch-behavior.cjs'
    && rootPackage.scripts?.['test:hq:live-real'] === 'node scripts/churvox-live-hq-real-data.cjs'
    && rootPackage.scripts?.['test:owner-worker:live-readonly'] === 'node scripts/churvox-live-owner-worker-readonly.cjs'
    && rootPackage.scripts?.['test:paid-launch:live'] === 'npm run test:truth:live && npm run test:live-command && npm run test:hq:live-real && npm run test:owner-worker:live-readonly',
  'Root readiness and deployed tooling must expose source, behavior, HQ and read-only owner/worker checks',
);

expect(
  'Python syntax gate includes all new HQ backend and behavior files',
  pythonSyntax.includes('backend/churvox_hq_paid_launch_filter_patch.py')
    && pythonSyntax.includes('backend/churvox_hq_paid_launch_report_patch.py')
    && pythonSyntax.includes('backend/churvox_hq_paid_launch_postguard_patch.py')
    && pythonSyntax.includes('backend/churvox_hq_connection_status_patch.py')
    && pythonSyntax.includes('scripts/churvox_hq_paid_launch_behavior_test.py'),
  'The filter, report, postguard, installer and behavior test must be AST parsed before launch',
);

for (const check of checks) console.log(`${check.ok ? '✓' : '✗'} ${check.name}${check.ok ? '' : ` — ${check.detail}`}`);
if (failures.length) {
  console.error(`\nPaid launch reality audit failed: ${failures.length} issue(s).`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`\nPaid launch reality audit passed: ${checks.length} payment, Stripe-confirmed billing, HQ, backend behavior, owner, worker and live-auth contracts checked.`);
