#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const checks = [];
const warnings = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function expect(name, condition, detail) {
  checks.push({ name, ok: Boolean(condition), detail });
}

function includesAll(text, needles) {
  return needles.every((needle) => text.includes(needle));
}

const site = read('frontend/src/churvox-office-lab/OfficeTeamLabSite.jsx');
const today = read('frontend/src/churvox-office-lab/OfficeTeamTodayScreen.jsx');
const todayVision = read('frontend/src/churvox-office-lab/OfficeTeamTodayVision.css');
const ownerNav = read('frontend/src/churvox-office-lab/OfficeTeamOwnerNavigation.jsx');
const contextStrip = read('frontend/src/churvox-office-lab/OfficeTeamContextStrip.jsx');
const visionCss = read('frontend/src/churvox-office-lab/OfficeTeamVisionPolish.css');
const guard = read('backend/churvox_command_human_mimic_guard_routes.py');
const liveWrapper = read('backend/server/__init__.py');
const settings = read('frontend/src/churvox-office-lab/OfficeTeamSiteSettings.jsx');
const liveSmoke = read('scripts/churvox-live-command-smoke.cjs');
const operational = read('frontend/src/churvox-office-lab/OfficeTeamOperationalScreens.jsx');
const extra = read('frontend/src/churvox-office-lab/OfficeTeamExtraScreens.jsx');
const jobs = read('frontend/src/churvox-office-lab/OfficeTeamJobsWorkspace.jsx');
const clients = read('frontend/src/churvox-office-lab/OfficeTeamClientsWorkspace.jsx');
const quotes = read('frontend/src/churvox-office-lab/OfficeTeamQuotesWorkspace.jsx');
const invoices = read('frontend/src/churvox-office-lab/OfficeTeamInvoicesWorkspace.jsx');
const workers = read('frontend/src/churvox-office-lab/OfficeTeamWorkerPhoneView.jsx');
const identityCss = read('frontend/src/churvox-office-lab/OfficeTeamCorePageIdentity.css');

expect(
  'owner queue has one source of truth',
  includesAll(site, [
    'const snapshotPromise = isOwnerApp ? Promise.resolve({ source: "skip", decisions: [] })',
    'const draftPromise = isOwnerApp ? Promise.resolve([])',
    'if (isOwnerApp) return backendDecisions;',
    'Command could not be confirmed. No fallback or browser-only decisions are being shown.',
    'item?.raw?.source !== "backend_command_slip"',
    'That item is not a confirmed live Command slip',
  ]),
  'The owner app must never merge Admin Brain, starter cards, old drafts or local browser queues into live Command',
);

expect(
  'routine admin is visually behind the owner decision flow',
  includesAll(site, [
    'screen === "today"',
    '<OfficeTeamContextStrip',
    'Churvox handles the admin. You handle the decisions.',
    'Only the decisions that need the owner',
  ])
    && includesAll(contextStrip, ['waiting in Command', 'Open Command'])
    && todayVision.includes('.cvOwnerReady[data-screen="today"] > .cvSiteStatus'),
  'Today should have one owner briefing; other pages need a compact owner context instead of a repeated hero',
);

expect(
  'owner navigation reduces first-level choices',
  includesAll(ownerNav, [
    '["today", "Today"]', '["command", "Command"]', '["work", "Jobs"]', '["clients", "Clients"]',
    '["worker", "Workers"]', '["quotes", "Quotes"]', '["invoices", "Invoices"]',
    '["settings", "Settings"]', '["plans", "Plans"]', '["help", "Help"]',
    'Office and oversight', 'cvOwnerNavCount',
  ]) && !ownerNav.includes('["money", "Money"]') && !ownerNav.includes('["staff", "Staff"]'),
  'The top bar should expose core owner work and group secondary oversight instead of showing every engine area',
);

expect(
  'Today is a decision screen instead of an app directory',
  today.includes('const ownerShortcuts = ["command", "work", "clients", "worker", "quotes", "invoices"]')
    && includesAll(today, ['preparedWaiting = ownerRoute ? top', 'backendAudit = []', 'Routine admin stays in the background'])
    && !today.includes('const ownerShortcuts = ["command", "work", "schedule"')
    && !today.includes('<span>Next decisions</span>'),
  'Today should offer a small core path and one Command handover, not sixteen shortcuts or duplicate decision panels',
);

expect(
  'Command never invents business facts',
  includesAll(site, ['const MISSING_VALUE = "Not found — owner must enter"', 'Every value must come from the record or stay visibly unresolved'])
    && !/Every 3 weeks|Base service \+ extra green waste|Long timer flagged|Repeat client"\)|Xero \/ MYOB"\)/.test(site),
  'Missing dates, cycles, amounts, workers, tax systems and notes must remain unresolved instead of being guessed',
);

expect(
  'owner does not operate pretend office-role switches',
  includesAll(site, ['ownerMode ? <section className="cvOwnerRoleTruth"', 'You should not have to operate the office team', 'Role behaviour is not changed from this explanation page'])
    && site.includes(': <OfficeTeamRoleControls roles={roles} />'),
  'Role-mode controls may remain in the lab but must not look like live engine controls in the owner workspace',
);

expect(
  'Activity is grounded in Command rather than browser-only trails',
  includesAll(site, ['A truthful record of what Churvox did', 'backendAudit.length', 'Browser-only preview activity and raw record IDs are not shown'])
    && !site.includes('<small>{id}</small>'),
  'The owner activity page must show live Command truth and avoid raw internal IDs or local-only history',
);

expect(
  'human judgement guard covers false completion duplicate invoices and premature reminders',
  includesAll(guard, [
    'def status_words(row):',
    'retire_false_completion_slips',
    'linked_invoice_exists',
    'The source job is not actually complete',
    'A separate invoice already links to this job',
    'retire_early_or_invalid_payment_followups',
    'The invoice due date is still in the future',
    'paid_or_closed = bool(words & {"paid", "settled"})',
    'human-mimic-scan-guard-v2',
  ]) && !guard.includes('any(marker in status for marker in ["paid"'),
  'The scanner must understand whole status words and retire false decisions without treating unpaid as paid',
);

expect(
  'owner settings save real profile and industry context',
  includesAll(settings, [
    'api.get("/logic/business-profile"',
    'api.get("/industry/profiles"',
    'api.get("/industry/context"',
    'api.post("/logic/business-profile"',
    'api.post("/industry/context"',
    'Save live business settings',
    'Core safety cannot be weakened here',
    'Clicking save is the owner’s explicit instruction',
    'Live settings not confirmed',
  ])
    && includesAll(liveWrapper, [
      "BUSINESS_PROFILE_ROUTE_VERSION = 'business-profile-live-v1'",
      "_remove('/api/logic/business-profile', 'GET')",
      "_remove('/api/logic/business-profile', 'POST')",
      "app.add_api_route('/api/logic/business-profile', _get_profile, methods=['GET'])",
      "app.add_api_route('/api/logic/business-profile', _save_profile, methods=['POST'])",
      "app.add_api_route('/api/settings/live-marker'",
      'owner = await _owner_doc(user)',
      'await db.users.update_one(',
    ])
    && !liveWrapper.includes('await db.users.update_many(')
    && includesAll(liveSmoke, ['EXPECTED_SETTINGS', '/api/settings/live-marker', '/api/logic/business-profile']),
  'Settings must save authenticated backend data, mirror only onto the owner account, replace the old read-only route, and fail smoke on a stale/405 deployment',
);

expect(
  'core owner pages have separate purpose-built structures',
  includesAll(operational, [
    'import OfficeTeamJobsWorkspace',
    'import OfficeTeamClientsWorkspace',
    'return <OfficeTeamJobsWorkspace',
    'return <OfficeTeamClientsWorkspace',
  ])
    && includesAll(extra, [
      'import OfficeTeamQuotesWorkspace',
      'import OfficeTeamInvoicesWorkspace',
      'return <OfficeTeamQuotesWorkspace',
      'return <OfficeTeamInvoicesWorkspace',
    ])
    && includesAll(jobs, ['cvJobsRunBoard', 'JobLane', 'cvJobSheet', 'Job intake'])
    && includesAll(clients, ['cvClientDirectory', 'cvClientMemoryBoard', 'cvClientHistoryPath', 'Client intake'])
    && includesAll(workers, ['cvFieldRoster', 'cvFieldControlRoom', 'cvFieldFlowMap', 'Open protected worker app'])
    && includesAll(quotes, ['cvQuotePipeline', 'cvQuoteStage', 'cvQuoteScopeSheet', 'Quote builder'])
    && includesAll(invoices, ['cvInvoiceAgingStrip', 'cvInvoiceLedger', 'cvInvoiceCollectionDesk', 'Invoice preparation'])
    && includesAll(identityCss, ['.cvJobsRunBoard', '.cvClientBookLayout', '.cvFieldOpsLayout', '.cvQuotePipeline', '.cvInvoiceLedgerLayout', '@media(max-width:640px)']),
  'Jobs, Clients, Workers, Quotes and Invoices must each have a different owner workflow and responsive layout rather than one generic template',
);

expect(
  'distinct pages retain truthful owner controls',
  [jobs, clients, workers, quotes, invoices].every((text) => text.includes('OfficeTeamSafeControls'))
    && [jobs, clients, quotes, invoices].every((text) => text.includes('OfficeTeamWorkForms'))
    && [jobs, clients, workers, quotes, invoices].every((text) => text.includes('allowFallback = appMode !== "owner" && !ownerRoute')),
  'Unique layouts must still use live rows, hide starter data from owners and route changes through Command',
);

expect(
  'vision shell and core workspaces are responsive',
  includesAll(visionCss, ['.cvOwnerNavigation', '.cvOwnerMoreMenu', '.cvOwnerContextStrip', '.cvOwnerRoleTruth', '@media (max-width: 640px)'])
    && includesAll(identityCss, ['@media(max-width:1200px)', '@media(max-width:900px)', '@media(max-width:640px)']),
  'The reduced owner shell and all five distinct workspaces must work on desktop and phone',
);

const failed = checks.filter((check) => !check.ok);
for (const check of checks) {
  console.log(`${check.ok ? '✓' : '✗'} ${check.name}${check.ok ? '' : ` — ${check.detail}`}`);
}
for (const warning of warnings) {
  console.warn(`⚠ ${warning}`);
}

if (failed.length) {
  console.error(`\nChurvox vision audit failed: ${failed.length} core issue(s).`);
  process.exit(1);
}

console.log(`\nChurvox vision audit passed: ${checks.length} core checks, ${warnings.length} design warning(s).`);
