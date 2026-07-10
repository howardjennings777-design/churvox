#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const checks = [];
const PLATFORM_OWNER_EMAIL = 'hello@churvox.com';
const OLD_OWNER_EMAILS = /howardjennings77@gmail\.com|howardjennings777@gmail\.com/;

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function json(relativePath) {
  return JSON.parse(read(relativePath));
}

function pass(name) {
  checks.push({ name, ok: true });
}

function fail(name, detail) {
  checks.push({ name, ok: false, detail });
}

function expect(name, condition, detail) {
  if (condition) pass(name);
  else fail(name, detail);
}

function includesAll(text, needles) {
  return needles.every((needle) => text.includes(needle));
}

function hasAny(text, needles) {
  return needles.some((needle) => text.includes(needle));
}

function hasOwnerConstant(text) {
  return text.includes(`PLATFORM_OWNER_EMAIL = "${PLATFORM_OWNER_EMAIL}"`);
}

const rootPackage = json('package.json');
const frontendPackage = json('frontend/package.json');
const app = read('frontend/src/App.js');
const platformAdminRoute = read('frontend/src/components/admin/PlatformAdminRoute.jsx');
const hqExtraOwnerPatch = read('backend/churvox_hq_extra_owner_email_patch.py');
const hqOwnerAccessPatch = read('backend/churvox_hq_owner_access_fix_patch.py');
const hqGrowthPatch = read('backend/churvox_hq_growth_report_patch.py');
const labSite = read('frontend/src/churvox-office-lab/OfficeTeamLabSite.jsx');
const labPolish = read('frontend/src/churvox-office-lab/OfficeTeamPremiumPolish.css');
const logicPolish = read('frontend/src/churvox-office-lab/OfficeTeamLogicPolish.css');
const navPolish = read('frontend/src/churvox-office-lab/OfficeTeamNavPolish.css');
const todayScreen = read('frontend/src/churvox-office-lab/OfficeTeamTodayScreen.jsx');
const operationalScreens = read('frontend/src/churvox-office-lab/OfficeTeamOperationalScreens.jsx');
const extraScreens = read('frontend/src/churvox-office-lab/OfficeTeamExtraScreens.jsx');
const messagesDesk = read('frontend/src/churvox-office-lab/OfficeTeamMessagesDesk.jsx');
const workerPhone = read('frontend/src/churvox-office-lab/OfficeTeamWorkerPhoneView.jsx');
const backOfficeScreens = read('frontend/src/churvox-office-lab/OfficeTeamBackOfficeScreens.jsx');
const commandApi = read('frontend/src/churvox-office-lab/OfficeTeamCommandApi.js');
const safeControls = read('frontend/src/churvox-office-lab/OfficeTeamSafeControls.jsx');
const workerRoute = read('frontend/src/churvox-office-lab/OfficeTeamWorkerRoute.jsx');
const officeTeamApi = read('frontend/src/churvox-office-lab/officeTeamApi.js');
const commandRoutes = read('backend/churvox_command_routes.py');
const usercustomize = read('backend/usercustomize.py');
const plans = read('frontend/src/churvox-office-lab/OfficeTeamPlansScreen.jsx');
const plansCss = read('frontend/src/churvox-office-lab/OfficeTeamPlansScreen.css');
const loginPage = read('frontend/src/pages/auth/LoginPage.js');
const loginPolish = read('frontend/src/pages/auth/ChurvoxLoginPolish.css');

const visibleAppCopy = [
  labSite,
  labPolish,
  logicPolish,
  navPolish,
  todayScreen,
  operationalScreens,
  extraScreens,
  messagesDesk,
  workerPhone,
  workerRoute,
  backOfficeScreens,
  plans,
  plansCss,
  loginPage,
  loginPolish,
].join('\n');

const roughVisibleSnippets = [
  'Hidden internal website',
  'Hidden owner build',
  'HIDDEN OWNER BUILD',
  'Demo preview',
  'Demo mode',
  'demo mode',
  'fake demo',
  'No demo rows',
  'No demo messages',
  'No demo worker',
  'local preview',
  'phone preview',
  'safe preview',
  'hidden build',
  'hidden site',
  'Office admin stays hidden',
  'Pricing is locked. The build is what changes.',
  'This screen keeps the rebuild honest',
  'How this becomes the real owner app',
];

const rootScripts = rootPackage.scripts || {};
const frontendScripts = frontendPackage.scripts || {};

expect('root build script exists', Boolean(rootScripts.build), 'package.json needs scripts.build');
expect('root office lab script forwards to frontend', rootScripts['test:office-lab'] === 'npm --prefix frontend run test:office-lab', 'root test:office-lab must forward to frontend');
expect('root route safety script forwards to frontend', rootScripts['test:rebuild:routes'] === 'npm --prefix frontend run test:rebuild:routes', 'root test:rebuild:routes must forward to frontend');
expect('root script sanity is exposed', rootScripts['test:root-scripts'] === 'node scripts/churvox-root-script-sanity.cjs', 'root test:root-scripts missing');
expect('frontend office lab script exists', Boolean(frontendScripts['test:office-lab']), 'frontend test:office-lab missing');
expect('frontend route safety script exists', Boolean(frontendScripts['test:rebuild:routes']), 'frontend test:rebuild:routes missing');

expect('platform owner redirect uses hello email only', hasOwnerConstant(app) && app.includes('return email === PLATFORM_OWNER_EMAIL') && !OLD_OWNER_EMAILS.test(app) && !/platform_admin|super_admin|is_platform_admin|is_super_admin|is_admin/.test(app), 'App.js platform owner redirect allows wrong owner access');
expect('platform admin route uses hello email only', hasOwnerConstant(platformAdminRoute) && platformAdminRoute.includes('return userEmail === PLATFORM_OWNER_EMAIL') && !OLD_OWNER_EMAILS.test(platformAdminRoute) && !/platform_admin|super_admin|is_platform_admin|is_super_admin|is_admin/.test(platformAdminRoute), 'PlatformAdminRoute allows wrong owner access');
expect('login platform-owner redirect uses hello email only', hasOwnerConstant(loginPage) && loginPage.includes('const isPlatformOwner = email === PLATFORM_OWNER_EMAIL') && !OLD_OWNER_EMAILS.test(loginPage) && !/is_platform_owner|is_admin/.test(loginPage), 'LoginPage platform owner redirect allows wrong owner access');
expect('HQ extra owner patch uses hello email only', hasOwnerConstant(hqExtraOwnerPatch) && hqExtraOwnerPatch.includes('return email == PLATFORM_OWNER_EMAIL') && !OLD_OWNER_EMAILS.test(hqExtraOwnerPatch) && !/platform_admin|super_admin|is_platform_admin|is_super_admin|is_admin/.test(hqExtraOwnerPatch), 'extra HQ owner patch allows wrong owner access');
expect('HQ owner APIs use hello email only', hasOwnerConstant(hqOwnerAccessPatch) && hqOwnerAccessPatch.includes('return {PLATFORM_OWNER_EMAIL}') && hqOwnerAccessPatch.includes('Churvox HQ is locked to') && !OLD_OWNER_EMAILS.test(hqOwnerAccessPatch) && !/platform_admin|super_admin|is_platform_admin|is_super_admin|is_admin/.test(hqOwnerAccessPatch), 'HQ owner APIs allow wrong owner access');
expect('HQ growth API uses hello email only', hasOwnerConstant(hqGrowthPatch) && hqGrowthPatch.includes('Churvox HQ growth report is locked to') && !OLD_OWNER_EMAILS.test(hqGrowthPatch) && !/platform_admin|super_admin|is_platform_admin|is_super_admin|is_admin/.test(hqGrowthPatch), 'HQ growth report allows wrong owner access');

expect('hidden lab route remains available', app.includes('path="/office-team-lab"') && app.includes('<OfficeTeamLab />'), 'hidden lab route missing');
expect('owner dashboard uses new office app under auth', app.includes('const OwnerOfficeApp = () => <OfficeTeamLab appMode="owner" />') && app.includes('path="/dashboard"') && app.includes('<FreshBusinessRoute><OwnerOfficeApp /></FreshBusinessRoute>'), 'dashboard not wired to owner office app under FreshBusinessRoute');
expect('worker app route remains protected', app.includes('path="/worker/today"') && app.includes('<WorkerRoute><WorkerOfficeApp /></WorkerRoute>'), 'worker route protection missing');
expect('public marketing routes still point to marketing pages', includesAll(app, ['path="/" element={<HomePage />}', 'path="/pricing" element={<PricingPage />}', 'path="/contact" element={<ContactPage />}']), 'public route wiring changed unexpectedly');

expect('premium office polish is loaded', labSite.includes('import "./OfficeTeamPremiumPolish.css";'), 'premium polish CSS is not imported');
expect('visible app copy has no rough build/demo terms', !hasAny(visibleAppCopy, roughVisibleSnippets), 'rough visible copy term found in owner/office/worker/login screens');
expect('shell badge copy is product-ready', labPolish.includes('CHURVOX CONTROL') && navPolish.includes('Churvox control') && labPolish.includes('OWNER WORKSPACE'), 'shell badge copy still uses old wording');
expect('mobile owner workspace is simplified', includesAll(labPolish, ['@media (max-width: 640px)', '.cvSiteStatus article {', 'display: none;', '.cvSiteTopbar button', 'min-height: 42px', '.cvSiteDecisionCard footer']), 'mobile workspace polish missing');
expect('public login uses new Churvox control design', includesAll(loginPage, ['cvChurvoxLogin', 'cvLoginControlPanel', 'Admin prepared. Owner approved.', 'ChurvoxLoginPolish.css']) && includesAll(loginPolish, ['.cvChurvoxLoginShell', '.cvLoginControlPanel', '.cvLoginCommandPreview', '@media (max-width: 760px)']), 'new public login polish missing');
expect('plans page has country pricing controls', includesAll(plans, ['const COUNTRIES', 'Choose billing country', 'GST is shown before checkout', 'Sales tax, if required, is handled at checkout', 'priceParts(meta, item.price)']), 'country pricing controls missing');
expect('plans page shows included and locked features', includesAll(plans, ['Included in this plan', 'Locked until upgrade', 'FeatureList', 'Command Growth Pack', 'price: 99']), 'included/locked plan structure missing');
expect('plans CSS supports logical plan locks and growth pack', includesAll(plansCss, ['.cvPlanCountryCard', '.cvPlanFeatureList.included', '.cvPlanFeatureList.locked', '.cvGrowthPackCard', '.cvPlanPrice']), 'plan lock/growth pack CSS missing');

expect('owner Command reads backend slips', includesAll(labSite, ['fetchBackendCommandDecisions', 'backendCommand']), 'owner Command backend slip wiring missing');
expect('owner Command runs office engine before loading slips', includesAll(labSite, ['runBackendOfficeEngineScan', 'Churvox prepared', 'Open the first slip']), 'owner app does not run the office engine before Command loads');
expect('owner Command reads backend audit', includesAll(labSite, ['fetchBackendCommandAudit', 'backendAudit']), 'owner Activity backend audit wiring missing');
expect('owner app suppresses all fallback decisions', includesAll(labSite, ['if (isOwnerApp) return backendDecisions;', 'const snapshotPromise = isOwnerApp ? Promise.resolve({ source: "skip", decisions: [] })', 'const draftPromise = isOwnerApp ? Promise.resolve([])']), 'owner app can fall back to starter, Admin Brain, draft or local decisions');
expect('backend Command event refresh wired', labSite.includes('BACKEND_COMMAND_EVENT') && labSite.includes('window.addEventListener(BACKEND_COMMAND_EVENT'), 'backend Command refresh event missing');
expect('office team roles have real duties', includesAll(labSite, ['role("Receptionist"', 'role("Bookkeeper"', 'role("Accountant"', 'role("Payroll Clerk"', 'role("Client Memory"', 'role("Quality Checker"', 'role("Operations Manager"', 'Does not file tax', 'Does not pay staff']), 'office team roles are missing real duties or guardrails');

expect('frontend Command API has slips and audit endpoints', includesAll(commandApi, ['/api/command/slips', '/api/command/audit', 'createBackendCommandSlip', 'recordBackendCommandDecision']), 'frontend Command API missing endpoint wiring');
expect('frontend Command API has office engine scan helper', includesAll(commandApi, ['runBackendOfficeEngineScan', '/api/command/scan', 'backend-office-engine', 'createdCount', 'existingCount']), 'frontend office engine scan helper missing');
expect('frontend Command API maps Accountant tray', includesAll(commandApi, ['return "Accounting"', 'return "Accountant"', '/accounting|gst|tax|xero|myob|ledger|export/']), 'frontend command mapping does not route accounting slips');
expect('frontend Command API preserves safety flags', includesAll(commandApi, ['prepared_only: true', 'owner_review_only: true', 'no_auto_send: true', 'no_auto_sync: true', 'no_auto_charge: true', 'no_auto_record_change: true']), 'frontend Command safety flags missing');
expect('owner safe controls create backend slips', includesAll(safeControls, ['createBackendCommandSlip', 'ownerRoute', 'isOwnerRoute()', 'createOfficeTeamLocalCommand']), 'safe controls do not split owner backend vs lab local behaviour');
expect('safe controls keep no-send copy', safeControls.includes('no send, no sync, no charge, no record change') && safeControls.includes('Nothing was sent, synced, charged or changed'), 'safe controls safety copy missing');

expect('worker route has safe payment link panel', includesAll(workerRoute, ['Take payment', 'Open pay page', 'Copy link', 'Request link', 'No card is charged inside Worker View']), 'worker payment link panel missing or unsafe');
expect('worker route sends payment requests to backend Command first', includesAll(workerRoute, ['createBackendWorkerPaymentRequest', 'Payment link request sent to Command', 'createOfficeTeamLocalCommand']), 'worker payment request does not use backend Command with local fallback');
expect('worker route sends normal updates to backend Command first', includesAll(workerRoute, ['createBackendWorkerUpdateRequest', 'Boss update sent to Command', 'createOfficeTeamLocalCommand']), 'worker update request does not use backend Command with local fallback');
expect('worker route cannot create direct card charge', !/(stripe\.checkout|stripe\.payment|payment_intent|terminal|reader|charge card|create charge)/i.test(workerRoute), 'worker route appears to create direct card charges');
expect('worker rows expose payment metadata safely', includesAll(officeTeamApi, ['payment_link', 'payment_url', 'stripe_payment_url', 'paymentMeta', 'amount_due', 'balance_due']), 'worker payment metadata extraction missing');
expect('frontend worker payment API helper is safe', includesAll(commandApi, ['/api/command/worker-payment-request', 'createBackendWorkerPaymentRequest', 'prepared_only: true', 'owner_review_only: true']), 'worker payment backend helper missing');
expect('frontend worker update API helper is safe', includesAll(commandApi, ['/api/command/worker-update-request', 'createBackendWorkerUpdateRequest', 'prepared_only: true', 'owner_review_only: true']), 'worker update backend helper missing');

expect('backend Command router exposes expected endpoints', includesAll(commandRoutes, ['@router.get("/command/slips")', '@router.post("/command/slips")', '@router.post("/command/worker-payment-request")', '@router.post("/command/worker-update-request")', '@router.post("/command/scan")', '@router.patch("/command/slips/{slip_id}/edit")', '@router.post("/command/slips/{slip_id}/approve")', '@router.post("/command/slips/{slip_id}/snooze")', '@router.post("/command/slips/{slip_id}/ignore")', '@router.get("/command/events")', '@router.get("/command/audit")']), 'backend Command endpoints missing');
expect('backend office engine creates role slips', includesAll(commandRoutes, ['prepare_office_engine_slips', 'create_engine_slip_once', 'Receptionist', 'Bookkeeper', 'Accountant', 'Payroll Clerk', 'Client Memory', 'Quality Checker', 'Operations Manager', 'Office Manager', 'office_engine_prepared']), 'backend office engine role scanning missing');
expect('backend office engine reads real collections', includesAll(commandRoutes, ['"jobs"', '"invoices"', '"clients"', '"messages"', '"time_entries"', '"business_settings"']), 'backend office engine does not read expected collections');
expect('backend office engine returns scan counts safely', includesAll(commandRoutes, ['created_count', 'existing_count', 'Office team prepared', 'No real records were changed']), 'backend office engine scan response missing counts/safety');
expect('backend worker payment request is Command-only', includesAll(commandRoutes, ['worker_payment_request', 'Worker payment link request', 'No card was charged', 'Nothing was sent, synced, charged or changed']), 'backend worker payment request safety missing');
expect('backend worker update request is Command-only', includesAll(commandRoutes, ['worker_update_request', 'Worker update sent to Command', 'Nothing was sent, synced, charged or changed']), 'backend worker update request safety missing');
expect('backend Command approve is record-only', includesAll(commandRoutes, ['"status": "approved_recorded"', '"stored_only": True', 'SAFE_RESULT = "Owner approval recorded. Nothing was sent, synced, charged or changed."']), 'backend approve is not clearly record-only');
expect('backend Command does not write business records', !/(db\.(jobs|clients|quotes|invoices|xero_sync_queue|approved_notifications)\.(insert_one|update_one|delete_one)|send_email|send_sms|stripe)/.test(commandRoutes), 'backend Command route appears to touch real business records or send/sync systems');
expect('backend Command uses Python-compatible optional typing', commandRoutes.includes('from typing import Any, Dict, Optional') && !commandRoutes.includes('Dict[str, Any] | None'), 'backend Command uses newer union typing');
expect('backend autoload includes Command router', includesAll(usercustomize, ['from churvox_command_routes import build_command_router', 'build_command_router(local_db, local_get_current_user, ObjectId)']), 'Command router not autoloaded');

expect('base pricing remains unchanged', includesAll(plans, ['price: 39', 'price: 89', 'price: 149', 'price: 299', 'price: 99']), 'base pricing changed');

const failed = checks.filter((check) => !check.ok);
for (const check of checks) {
  const icon = check.ok ? '✓' : '✗';
  console.log(`${icon} ${check.name}${check.ok ? '' : ` — ${check.detail}`}`);
}

if (failed.length) {
  console.error(`\nReadiness sweep failed: ${failed.length} issue(s).`);
  process.exit(1);
}

console.log(`\nReadiness sweep passed: ${checks.length} checks.`);
