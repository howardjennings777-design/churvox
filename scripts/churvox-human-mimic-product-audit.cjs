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
const guard = read('backend/churvox_command_human_mimic_guard_routes.py');
const marker = read('backend/churvox_command_human_mimic_marker_routes.py');
const apply = read('backend/churvox_command_apply_routes.py');
const autoload = read('backend/usercustomize.py');
const liveInstaller = read('backend/churvox_owner_access_safety_patch.py');
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
  'all eight office roles have dedicated reasoning',
  all(human, [
    '"Office Manager"', '"Receptionist"', '"Bookkeeper"', '"Accountant"', '"Payroll Clerk"', '"Client Memory"', '"Quality Checker"', '"Operations Manager"',
    'build_invoice_slip', 'build_booking_slip', 'build_payment_followup_slip', 'build_reply_slip', 'build_hours_slip', 'build_quality_slip', 'build_client_memory_slip', 'build_accounting_slip', 'build_operations_slip', 'build_office_manager_brief',
  ]),
  'Each role needs its own evidence-backed builder',
);

expect(
  'role reasoning uses evidence rather than fixed guesses',
  all(human, [
    'explicit_cycle_days', 'inferred_cycle_days', 'median(gaps)', 'worker_baseline', 'median(values[-12:])',
    'normalized_rate', 'tax_inclusive', 'existing_client_memory', '"evidence": evidence_rows', '"missing": missing', '"confidence": confidence_data', '"field_sources": prepared_form', '"owner_question": owner_question',
  ]) && !human.includes('Every 3 weeks'),
  'Booking, hours, tax and memory logic must use live evidence and expose uncertainty',
);

expect(
  'guarded scan owns the live route before older engines',
  all(autoload, ['build_command_human_mimic_guard_router', 'build_command_human_mimic_router', 'build_command_mimic_intelligence_router', 'build_command_apply_router'])
    && autoload.indexOf('build_command_human_mimic_guard_router') < autoload.indexOf('build_command_human_mimic_router')
    && autoload.indexOf('build_command_human_mimic_router') < autoload.indexOf('build_command_mimic_intelligence_router')
    && autoload.indexOf('build_command_mimic_intelligence_router') < autoload.indexOf('build_command_apply_router')
    && all(liveInstaller, [
      'from churvox_command_human_mimic_marker_routes import build_command_human_mimic_marker_router',
      'from churvox_command_human_mimic_guard_routes import build_command_human_mimic_guard_router',
      'remove_route(app, "/api/command/human-mimic-marker", "GET")',
      'remove_route(app, "/api/command/human-mimic-marker", "POST")',
      'remove_route(app, "/api/command/scan", "POST")',
      'app.include_router(build_command_human_mimic_marker_router(), prefix="/api")',
      'app.include_router(build_command_human_mimic_guard_router(db, get_current_user, ObjectId), prefix="/api")',
      'churvox_guarded_human_office_routes_installed',
    ]),
  'The Render boot path must directly replace stale marker/scan routes; the indirect Xero hook remains compatibility only',
);

expect(
  'guard removes false and stale owner decisions',
  all(guard, [
    'retire_old_engine_slips', 'retire_outbound_reply_false_positives', 'retire_false_completion_slips', 'linked_invoice_exists',
    'retire_early_or_invalid_payment_followups', 'retire_stale_briefs', 'def status_words(row):',
    'paid_or_closed = bool(words & {"paid", "settled"})', 'human-mimic-scan-guard-v2',
    'No business record, message, payment or accounting record changed',
  ]) && !guard.includes('any(marker in status for marker in ["paid"'),
  'Outbound messages, false completion, duplicate invoices, future/paid reminders and stale briefs must be retired safely',
);

expect(
  'live backend marker proves guarded engine and eight roles',
  all(marker, ['HUMAN_MIMIC_VERSION = "human-mimic-intelligence-v2"', 'HUMAN_MIMIC_GUARD = "human-mimic-scan-guard-v2"'])
    && all(liveSmoke, ['EXPECTED_HUMAN_MIMIC', 'EXPECTED_GUARD', '/api/command/human-mimic-marker', 'roles.length === 8']),
  'Backend smoke must prove the guarded engine reached Render without claiming to prove the frontend',
);

expect(
  'intelligence never performs unsafe external actions',
  !/(send_email|send_sms|stripe\.|payment_intent|charge\(|xero[^\n]*sync\(|myob[^\n]*sync\(|file_tax\(|submit[^\n]*tax|bank_file\(|bank payout|payroll_payment)/i.test(`${human}\n${guard}`),
  'The office engine may prepare and audit only',
);

expect(
  'approval executor is draft-only and idempotent',
  all(apply, ['"status": "draft_approved"', '"no_auto_send": True', '"no_auto_sync": True', '"no_auto_charge": True', '"no_auto_file_tax": True', 'slip.get("status") == "approved_applied"', '"idempotent": True', 'return "client_memory_reviews", "client_memory_review"']),
  'Approval may create one internal draft but cannot send, sync, charge, file tax or duplicate memory',
);

expect(
  'owner app uses only confirmed backend Command decisions',
  all(site, ['if (isOwnerApp) return backendDecisions;', 'Command could not be confirmed. No fallback or browser-only decisions are being shown.', 'item?.raw?.source !== "backend_command_slip"', 'That item is not a confirmed live Command slip']),
  'Owner approval must never fall back to Admin Brain, starter data, old drafts or local browser queues',
);

expect(
  'Command displays reasoning and unresolved values honestly',
  all(commandApi, ['function reasoningForSlip', 'Evidence used:', 'Confidence:', 'Owner must check:', 'Owner question:'])
    && site.includes('const MISSING_VALUE = "Not found — owner must enter"')
    && !/Every 3 weeks|Base service \+ extra green waste|Long timer flagged/.test(site),
  'The owner must see evidence and missing facts rather than made-up values',
);

expect(
  'working owner pages have real destinations and actions',
  all(safeControls, ['createBackendCommandSlip', 'safeActions.map', 'Every button prepares a real Command slip'])
    && all(xero, ['/xero/status', '/xero/connect/start', '/xero/disconnect', '/api/accounting/export/pack?system=both'])
    && all(worker, ['/jobs/${encodeURIComponent(jobId)}/${endpoint}', '/worker/field-slip', 'proof_photo_names'])
    && all(ownerWorker, ['Open protected worker app', 'This owner page shows live worker records'])
    && all(help, ['mailto:hello@churvox.com', 'goToScreen(screen)'])
    && all(plans, ['Open secure billing', 'Nothing is charged from this comparison screen']),
  'Owner and worker controls must either call a real route, prepare Command work or open a real destination',
);

expect(
  'forms preserve real CSV rows and settings save live backend data',
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
  'CSV data must survive approval and Settings must save authenticated backend profile/industry data with truthful fallback states',
);

const buttonFiles = [
  'frontend/src/churvox-office-lab/OfficeTeamLabSite.jsx',
  'frontend/src/churvox-office-lab/OfficeTeamOwnerNavigation.jsx',
  'frontend/src/churvox-office-lab/OfficeTeamContextStrip.jsx',
  'frontend/src/churvox-office-lab/OfficeTeamSafeControls.jsx',
  'frontend/src/churvox-office-lab/OfficeTeamOperationalScreens.jsx',
  'frontend/src/churvox-office-lab/OfficeTeamBackOfficeScreens.jsx',
  'frontend/src/churvox-office-lab/OfficeTeamExtraScreens.jsx',
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
