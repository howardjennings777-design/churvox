#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const failures = [];
const checks = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function compact(value) {
  return String(value || '').replace(/\s+/g, '');
}

function check(name, ok, detail) {
  const passed = Boolean(ok);
  checks.push({ name, passed });
  if (!passed) failures.push(`${name}: ${detail}`);
}

function validJs(source) {
  try {
    new Function(source);
    return true;
  } catch {
    return false;
  }
}

const baseReport = read('backend/churvox_hq_paid_launch_report_patch.py');
const filterPatch = read('backend/churvox_hq_paid_launch_filter_patch.py');
const stripeSnapshot = read('backend/churvox_hq_stripe_snapshot_patch.py');
const postguard = read('backend/churvox_hq_paid_launch_postguard_patch.py');
const installer = read('backend/churvox_hq_connection_status_patch.py');
const hq = read('frontend/src/pages/ChurvoxHQPage.jsx');
const hqCss = read('frontend/src/pages/ChurvoxHQPage.css');
const index = read('frontend/src/index.js');
const adminRoute = read('frontend/src/components/admin/PlatformAdminRoute.jsx');
const mockedHqTest = read('frontend/tests/e2e/churvox-paid-launch-hq-reality.spec.js');
const currentShellTest = read('frontend/tests/e2e/churvox-plans-hq-current-shell.spec.js');
const liveHqTest = read('frontend/tests/e2e/churvox-hq-live-real-data.spec.js');
const behaviorTest = read('scripts/churvox_hq_paid_launch_behavior_test.py');
const pythonSyntax = read('scripts/churvox-command-python-syntax.cjs');
const rootPackage = JSON.parse(read('package.json'));
const frontendPackage = JSON.parse(read('frontend/package.json'));
const compactCss = compact(hqCss);

check(
  'owner-only paid-launch report remains protected and sample-free',
  baseReport.includes('/api/admin/owner/paid-launch-report')
    && baseReport.includes('async def require_owner')
    && baseReport.includes('raise HTTPException(status_code=403')
    && baseReport.includes('"sample_records_included": False'),
  'The paid-launch report must stay owner protected and explicitly exclude sample records',
);

check(
  'synthetic filtering preserves real tester accounts',
  filterPatch.includes('def is_internal_record')
    && filterPatch.includes('SYNTHETIC_DOMAINS')
    && filterPatch.includes('real tester accounts must stay visible'),
  'Explicit demo records must be excluded without hiding real testers',
);

check(
  'Stripe credentials and active subscription truth remain authoritative',
  stripeSnapshot.includes('stripe.Account.retrieve()')
    && stripeSnapshot.includes('"credential_verified": True')
    && postguard.includes('"paid_definition": "stripe_subscription_status_active"')
    && postguard.includes('"trial_definition": "stripe_subscription_status_trialing"')
    && postguard.includes('"mrr_definition": "active_stripe_subscription_price_items_only"')
    && postguard.includes('"zero_mrr_is_zero": True')
    && postguard.includes('report["source"] = "live_database_and_stripe_v3"'),
  'Stored Mongo status or subscription IDs alone must not decide paid users or MRR',
);

check(
  'locked NZD monthly plan prices are validated live',
  postguard.includes('stripe.Price.retrieve(price_id)')
    && postguard.includes('"amount_minor": 3900')
    && postguard.includes('"amount_minor": 8900')
    && postguard.includes('"amount_minor": 14900')
    && postguard.includes('"amount_minor": 29900')
    && postguard.includes('currency == "nzd"')
    && postguard.includes('interval == "month"'),
  'All four live Stripe prices must match the locked monthly NZD values',
);

check(
  'backend startup installs the complete billing truth chain',
  installer.includes('install_paid_launch_filter(module)')
    && installer.includes('install_stripe_snapshot(module)')
    && installer.includes('install_paid_launch_report(module)')
    && installer.includes('install_paid_launch_postguard(module)')
    && installer.includes('paid_launch_endpoint.__annotations__["request"] = Request'),
  'Render startup must install the complete owner billing chain',
);

check(
  'admin route is one rebuilt HQ with no nested legacy components',
  hq.includes('CHURVOX_HQ_ONE_CONSOLE_20260727')
    && hq.includes('data-version="CHURVOX_HQ_ONE_CONSOLE_20260727"')
    && hq.includes('aria-label="Churvox HQ navigation"')
    && !hq.includes('PaidLaunchHQSystem')
    && !hq.includes('TesterApplicationsInbox')
    && !hq.includes('ChurvoxPromotionCentre')
    && !hq.includes('cvMyHq')
    && !hq.includes('hq2'),
  'The /admin route must render one new console rather than wrapping older HQ pages',
);

check(
  'single HQ reads all owner data sources directly',
  [
    '/api/admin/owner-overview',
    '/api/admin/owner/paid-launch-report',
    '/api/admin/owner/growth-report',
    '/api/admin/owner/testers',
    '/api/admin/owner/plan-report',
    '/api/admin/owner/control-log',
    '/api/admin/owner/connection',
    '/api/admin/owner/retention-email-status',
  ].every((value) => hq.includes(value))
    && hq.includes('/api/admin/owner/tester-intake')
    && hq.includes('/api/admin/owner/control-access'),
  'The one console must be wired to overview, billing, growth, testers, plans, activity, connection and retention routes',
);

check(
  'single HQ retains the complete owner navigation and useful live totals',
  ['Overview', 'Users', 'Businesses', 'Billing', 'Testers', 'Visitors', 'Activity', 'System'].every((value) => hq.includes(`label: "${value}"`))
    && hq.includes('actual_mrr_nzd')
    && hq.includes('verified_paid_users')
    && hq.includes('billing_needs_verification')
    && hq.includes('total_jobs')
    && hq.includes('unique_total'),
  'The rebuilt HQ must expose the whole platform picture without inferred billing',
);

check(
  'legacy HQ runtime overlays are disabled',
  index.includes('const hqRuntimeImports = [];')
    && !index.includes("import('./runtime/churvoxHqTesterOutreachRuntime')")
    && !index.includes("import('./runtime/churvoxHqAssistantDraftImportRuntime')")
    && !index.includes("import('./runtime/churvoxHqVerifiedSmallBusinessOutreachRuntime')"),
  'No runtime may inject duplicate HQ navigation or overlays after React renders',
);

check(
  'new HQ is responsive on desktop and mobile',
  compactCss.includes('@media(max-width:1180px)')
    && compactCss.includes('@media(max-width:820px)')
    && compactCss.includes('@media(max-width:600px)')
    && compactCss.includes('.hqOneNav')
    && compactCss.includes('.hqOneMetrics')
    && compactCss.includes('.hqOneTableWrap'),
  'One-console layout must remain usable across desktop and mobile widths',
);

check(
  'frontend and backend owner access remain aligned',
  adminRoute.includes('PLATFORM_OWNER_EMAILS')
    && adminRoute.includes('hello@churvox.com')
    && adminRoute.includes('howardjennings77@gmail.com')
    && adminRoute.includes('platform_owner'),
  'Known platform-owner identities and roles must reach /admin',
);

check(
  'safe browser proof rejects duplicate HQs and covers controls',
  validJs(mockedHqTest)
    && mockedHqTest.includes('Single rebuilt Churvox HQ')
    && mockedHqTest.includes('CHURVOX_HQ_ONE_CONSOLE_20260727')
    && mockedHqTest.includes("page.locator('.hq2, .cvMyHq, #churvox-hq-tester-outreach-root')")
    && mockedHqTest.includes('tester actions use the final routes')
    && mockedHqTest.includes('endpoint failure stays visible')
    && !/\btest\.(?:skip|only)\b|\bdescribe\.only\b/.test(mockedHqTest),
  'Desktop/mobile tests must prove one HQ, real totals, tester actions and visible failures',
);

check(
  'current shell proof checks exactly one HQ root and eight tabs',
  validJs(currentShellTest)
    && currentShellTest.includes('HQ is one clean console wired to all live owner sources')
    && currentShellTest.includes("toHaveCount(1)")
    && currentShellTest.includes("toHaveCount(8)")
    && currentShellTest.includes('8 of 8 live sources')
    && currentShellTest.includes('$338.00'),
  'The release browser contract must prove one root, one navigation and useful live metrics',
);

check(
  'authenticated live HQ proof matches the single console',
  validJs(liveHqTest)
    && liveHqTest.includes("expect(report.source).toBe('live_database_and_stripe_v3')")
    && liveHqTest.includes('CHURVOX_HQ_ONE_CONSOLE_20260727')
    && liveHqTest.includes("page.locator('.hqOneMetric')")
    && liveHqTest.includes("page.goto('/admin'")
    && !/\btest\.(?:skip|only)\b|\bdescribe\.only\b/.test(liveHqTest),
  'The deployed report and the visible single-console billing metrics must agree',
);

check(
  'backend behavior proof covers strict billing cases',
  behaviorTest.includes('assert report["source"] == "live_database_and_stripe_v3"')
    && behaviorTest.includes('assert report["truth"]["stripe_credentials_verified"] is True')
    && behaviorTest.includes('assert empty_report["billing"]["actual_mrr_nzd"] == 0.0')
    && behaviorTest.includes('assert exc.status_code == 403'),
  'Controlled backend proof must cover credentials, zero MRR and owner lock',
);

for (const name of ['test:ui:full', 'test:ui:desktop', 'test:ui:mobile']) {
  const command = String(frontendPackage.scripts?.[name] || '');
  check(
    `${name} includes the single HQ browser proof`,
    command.includes('churvox-paid-launch-hq-reality.spec.js'),
    `${name} is missing churvox-paid-launch-hq-reality.spec.js`,
  );
}

const scripts = rootPackage.scripts || {};
check(
  'normal readiness and live gates still include HQ truth checks',
  scripts['test:hq:behavior'] === 'node scripts/churvox-hq-paid-launch-behavior.cjs'
    && scripts['test:paid-launch:reality'] === 'node scripts/churvox-paid-launch-reality-audit.cjs'
    && scripts['test:hq:live-real'] === 'node scripts/churvox-live-hq-real-data.cjs'
    && String(scripts['test:readiness'] || '').includes('churvox-paid-launch-reality-audit.cjs'),
  'HQ truth checks must remain part of normal readiness commands',
);

check(
  'Python syntax gate includes the billing truth chain',
  [
    'backend/churvox_hq_paid_launch_filter_patch.py',
    'backend/churvox_hq_stripe_snapshot_patch.py',
    'backend/churvox_hq_paid_launch_report_patch.py',
    'backend/churvox_hq_paid_launch_postguard_patch.py',
    'backend/churvox_hq_connection_status_patch.py',
  ].every((value) => pythonSyntax.includes(value)),
  'Every billing-truth Python file must be parsed before browser tests',
);

for (const item of checks) console.log(`${item.passed ? '✓' : '✗'} ${item.name}`);
if (failures.length) {
  console.error(`\nPaid launch reality audit failed: ${failures.length} issue(s).`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`\nPaid launch reality audit passed: ${checks.length} billing, single-HQ and live-auth contracts checked.`);
