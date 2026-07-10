#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const checks = [];

const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const all = (text, needles) => needles.every((needle) => text.includes(needle));
const expect = (name, ok, detail) => checks.push({ name, ok: Boolean(ok), detail });

function buttonOpenings(text) {
  const openings = [];
  let cursor = 0;
  while (cursor < text.length) {
    const start = text.indexOf('<button', cursor);
    if (start < 0) break;
    let quote = '';
    let braces = 0;
    let index = start + 7;
    for (; index < text.length; index += 1) {
      const char = text[index];
      const previous = text[index - 1];
      if (quote) {
        if (char === quote && previous !== '\\') quote = '';
        continue;
      }
      if (char === '"' || char === "'" || char === '`') { quote = char; continue; }
      if (char === '{') { braces += 1; continue; }
      if (char === '}') { braces = Math.max(0, braces - 1); continue; }
      if (char === '>' && braces === 0) break;
    }
    openings.push(text.slice(start, Math.min(index + 1, text.length)));
    cursor = Math.max(index + 1, start + 7);
  }
  return openings;
}

const human = read('backend/churvox_command_human_mimic_routes.py');
const strict = read('backend/churvox_command_human_mimic_v3_routes.py');
const liveView = read('backend/churvox_command_human_mimic_live_routes.py');
const marker = read('backend/churvox_command_human_mimic_marker_routes.py');
const apply = read('backend/churvox_command_apply_routes.py');
const liveInstaller = read('backend/churvox_owner_access_safety_patch.py');
const fullTest = read('scripts/churvox_mimic_full_test.py');
const fullRunner = read('scripts/churvox_mimic_full_test_runner.py');
const rootPackage = JSON.parse(read('package.json'));
const site = read('frontend/src/churvox-office-lab/OfficeTeamLabSite.jsx');
const commandApi = read('frontend/src/churvox-office-lab/OfficeTeamCommandApi.js');
const safeControls = read('frontend/src/churvox-office-lab/OfficeTeamSafeControls.jsx');
const settings = read('frontend/src/churvox-office-lab/OfficeTeamSiteSettings.jsx');
const xero = read('frontend/src/churvox-office-lab/OfficeTeamXeroScreen.jsx');
const worker = read('frontend/src/churvox-office-lab/OfficeTeamWorkerRoute.jsx');
const ownerWorker = read('frontend/src/churvox-office-lab/OfficeTeamWorkerPhoneView.jsx');
const workForms = read('frontend/src/churvox-office-lab/OfficeTeamWorkForms.jsx');
const plans = read('frontend/src/churvox-office-lab/OfficeTeamPlansScreen.jsx');
const help = read('frontend/src/churvox-office-lab/OfficeTeamExtraScreens.jsx');
const liveSmoke = read('scripts/churvox-live-command-smoke.cjs');

expect(
  'all eight office roles still have dedicated reasoning builders',
  all(human, [
    '"Office Manager"', '"Receptionist"', '"Bookkeeper"', '"Accountant"', '"Payroll Clerk"', '"Client Memory"', '"Quality Checker"', '"Operations Manager"',
    'build_invoice_slip', 'build_booking_slip', 'build_payment_followup_slip', 'build_reply_slip', 'build_hours_slip', 'build_quality_slip', 'build_client_memory_slip', 'build_accounting_slip', 'build_operations_slip', 'build_office_manager_brief',
  ]),
  'Each role needs its own evidence-backed builder before strict validation',
);

expect(
  'strict v3 preflight rejects guessing and weak evidence',
  all(strict, [
    'HUMAN_MIMIC_VERSION = "human-mimic-intelligence-v3"',
    'HUMAN_MIMIC_GUARD = "human-mimic-strict-preflight-v3"',
    'historical extra field only; history is reference, never a charge',
    'At least three visits required for inferred cycle',
    'exact time never inferred',
    'Invoice total not substituted for balance',
    'Acknowledgement-only messages suppressed',
    'likely access codes redacted',
    'Only explicit rate keys accepted',
    'median requires at least three same-worker entries',
    'One-off mixed issues do not become a process rule',
    'strict_preflight_passed',
    'evidence_fingerprint',
  ]),
  'Money, recurrence, messages, memory, tax, timers and operations need strict source-based rules',
);

expect(
  'strict scanner captures before writing and refreshes changed evidence',
  all(strict, [
    'class _CaptureDB',
    'capture_db.capture.get("command_slips", [])',
    'await retire_legacy(user_business_id)',
    'existing_fingerprint == current_fingerprint',
    'The live source evidence changed',
    'await db.command_slips.insert_one(doc)',
  ])
    && all(liveView, [
      'payload.human_mimic_intelligence_v3',
      '{"$ne": True}',
      'build_command_human_mimic_live_router',
      '_StrictLiveDBView',
    ]),
  'Legacy reasoning may propose candidates, but only strict v3 may write and compare current fingerprints',
);

expect(
  'Render boot directly installs the strict live router',
  all(liveInstaller, [
    'from churvox_command_human_mimic_marker_routes import build_command_human_mimic_marker_router',
    'from churvox_command_human_mimic_live_routes import build_command_human_mimic_live_router',
    'remove_route(app, "/api/command/human-mimic-marker", "GET")',
    'remove_route(app, "/api/command/scan", "POST")',
    'app.include_router(build_command_human_mimic_marker_router(), prefix="/api")',
    'app.include_router(build_command_human_mimic_live_router(db, get_current_user, ObjectId), prefix="/api")',
    'app.state.churvox_human_mimic_version = "human-mimic-intelligence-v3"',
  ]),
  'The live backend must not depend on the old indirect Xero/include-router hook',
);

expect(
  'marker and live smoke prove all strict protections',
  all(marker, [
    'HUMAN_MIMIC_VERSION = "human-mimic-intelligence-v3"',
    'HUMAN_MIMIC_GUARD = "human-mimic-strict-preflight-v3"',
    '"source_validation": True',
    '"historical_money_reference_only": True',
    '"required_fields_block_approval": True',
    '"secret_redaction": True',
  ])
    && all(liveSmoke, [
      "EXPECTED_HUMAN_MIMIC = 'human-mimic-intelligence-v3'",
      "EXPECTED_GUARD = 'human-mimic-strict-preflight-v3'",
      'preflight.source_validation',
      'preflight.required_fields_block_approval',
      'roles.length === 8',
    ]),
  'The public marker must prove the actual strict build, not merely route presence',
);

expect(
  'approval executor blocks unresolved and unsafe mimic decisions',
  all(apply, [
    'UNRESOLVED_MARKERS',
    'def unresolved_requirements',
    'def assert_strict_mimic_safe',
    'strict_preflight_passed',
    'Complete these required fields before approval',
    'slip.get("status") not in OPEN_STATUSES',
    'slip.get("status") == "approved_applied"',
    '"idempotent": True',
    '"status": "draft_approved"',
    '"no_auto_send": True',
    '"no_auto_sync": True',
    '"no_auto_charge": True',
    '"no_auto_file_tax": True',
    'return "client_memory_reviews", "client_memory_review"',
  ]),
  'Required fields, safety flags and slip state must be valid before one internal draft is created',
);

expect(
  'full behavioural test exercises every major failure mode',
  all(fullTest, [
    'historical extra never became a charge',
    'linked invoice prevents duplicate draft',
    'incomplete status is not treated as complete',
    'foreign business records stay isolated',
    'Receptionist does not infer from one gap',
    'outbound message never creates reply',
    'acknowledgement-only message is suppressed',
    'future-due invoice does not create follow-up',
    'generic GST amount is not misread as tax rate',
    'one-hour seconds timer is not a false anomaly',
    'likely access code is redacted',
    'second scan is idempotent',
    'changed source evidence replaces stale decision',
    'unresolved required fields block approval',
    'approval execution is idempotent',
    'superseded decisions cannot be applied',
    'worker cannot run owner intelligence',
  ])
    && fullRunner.includes('only the two past visits are eligible history')
    && rootPackage.scripts['test:mimic:full'] === 'node scripts/churvox-mimic-full-test.cjs'
    && rootPackage.scripts['test:readiness'].includes('churvox-mimic-full-test.cjs'),
  'Readiness must execute a real in-memory scan and approval flow, not only source-string checks',
);

expect(
  'intelligence and executor never perform unsafe external actions',
  !/(send_email|send_sms|stripe\.|payment_intent|charge\(|xero[^\n]*sync\(|myob[^\n]*sync\(|file_tax\(|submit[^\n]*tax|bank_file\(|bank payout|payroll_payment)/i.test(`${human}\n${strict}\n${apply}`),
  'The office engine may prepare internal drafts and audit only',
);

expect(
  'owner app uses only confirmed backend Command decisions',
  all(site, ['if (isOwnerApp) return backendDecisions;', 'Command could not be confirmed. No fallback or browser-only decisions are being shown.', 'item?.raw?.source !== "backend_command_slip"', 'That item is not a confirmed live Command slip']),
  'Owner approval must never fall back to Admin Brain, starter cards, old drafts or local browser queues',
);

expect(
  'Command exposes evidence and unresolved values honestly',
  all(commandApi, ['function reasoningForSlip', 'Evidence used:', 'Confidence:', 'Owner must check:', 'Owner question:'])
    && site.includes('const MISSING_VALUE = "Not found — owner must enter"')
    && !/Every 3 weeks|Base service \+ extra green waste|Long timer flagged/.test(site),
  'The owner must see evidence and missing facts rather than invented values',
);

expect(
  'working owner pages retain real destinations and safe preparation',
  all(safeControls, ['createBackendCommandSlip', 'safeActions.map', 'Every button prepares a real Command slip'])
    && all(xero, ['/xero/status', '/xero/connect/start', '/xero/disconnect', '/api/accounting/export/pack?system=both'])
    && all(worker, ['/jobs/${encodeURIComponent(jobId)}/${endpoint}', '/worker/field-slip', 'proof_photo_names'])
    && all(ownerWorker, ['Open protected worker app', 'This is owner oversight—not a fake worker phone.', 'This owner screen does not simulate or change them.'])
    && all(help, ['mailto:hello@churvox.com', 'goToScreen(screen)'])
    && all(plans, ['Open secure billing', 'Nothing is charged from this comparison screen']),
  'Owner and worker controls must use real routes or prepare Command work',
);

expect(
  'forms preserve CSV rows and settings save live data',
  all(workForms, ['csv_rows: rows', 'sourcePayload', 'The actual parsed rows stay attached'])
    && all(settings, [
      'api.get("/logic/business-profile"',
      'api.get("/industry/profiles"',
      'api.get("/industry/context"',
      'api.post("/logic/business-profile"',
      'api.post("/industry/context"',
      'Save live business settings',
      'Core safety cannot be weakened here',
      'Live settings not confirmed',
    ]),
  'CSV evidence and authenticated settings saves must remain real and owner-controlled',
);

const buttonFiles = [
  'frontend/src/churvox-office-lab/OfficeTeamLabSite.jsx',
  'frontend/src/churvox-office-lab/OfficeTeamOwnerNavigation.jsx',
  'frontend/src/churvox-office-lab/OfficeTeamContextStrip.jsx',
  'frontend/src/churvox-office-lab/OfficeTeamSafeControls.jsx',
  'frontend/src/churvox-office-lab/OfficeTeamOperationalScreens.jsx',
  'frontend/src/churvox-office-lab/OfficeTeamBackOfficeScreens.jsx',
  'frontend/src/churvox-office-lab/OfficeTeamExtraScreens.jsx',
  'frontend/src/churvox-office-lab/OfficeTeamJobsWorkspace.jsx',
  'frontend/src/churvox-office-lab/OfficeTeamClientsWorkspace.jsx',
  'frontend/src/churvox-office-lab/OfficeTeamQuotesWorkspace.jsx',
  'frontend/src/churvox-office-lab/OfficeTeamInvoicesWorkspace.jsx',
  'frontend/src/churvox-office-lab/OfficeTeamXeroScreen.jsx',
  'frontend/src/churvox-office-lab/OfficeTeamSiteSettings.jsx',
  'frontend/src/churvox-office-lab/OfficeTeamPlansScreen.jsx',
  'frontend/src/churvox-office-lab/OfficeTeamWorkerPhoneView.jsx',
  'frontend/src/churvox-office-lab/OfficeTeamWorkerRoute.jsx',
  'frontend/src/churvox-office-lab/OfficeTeamMessagesDesk.jsx',
  'frontend/src/churvox-office-lab/OfficeTeamWorkForms.jsx',
];

const deadButtons = [];
for (const file of buttonFiles) {
  for (const opening of buttonOpenings(read(file))) {
    const handled = /\bonClick\s*=/.test(opening) || /\btype\s*=\s*["']submit["']/.test(opening) || /\bformAction\s*=/.test(opening);
    if (!handled) deadButtons.push(`${file}: ${opening.replace(/\s+/g, ' ').slice(0, 150)}`);
  }
}
expect('visible buttons have handlers', deadButtons.length === 0, deadButtons.join('\n') || 'No dead buttons found');

const failed = checks.filter((check) => !check.ok);
for (const check of checks) {
  console.log(`${check.ok ? '✓' : '✗'} ${check.name}${check.ok ? '' : ` — ${check.detail}`}`);
}
if (failed.length) {
  console.error(`\nHuman office product audit failed: ${failed.length} issue(s).`);
  process.exit(1);
}
console.log(`\nHuman office product audit passed: ${checks.length} checks.`);
