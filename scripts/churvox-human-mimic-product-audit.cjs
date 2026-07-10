#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const checks = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function expect(name, condition, detail) {
  checks.push({ name, ok: Boolean(condition), detail });
}

function includesAll(text, needles) {
  return needles.every((needle) => text.includes(needle));
}

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

const humanMimic = read('backend/churvox_command_human_mimic_routes.py');
const mimicGuard = read('backend/churvox_command_human_mimic_guard_routes.py');
const mimicMarker = read('backend/churvox_command_human_mimic_marker_routes.py');
const applyRoutes = read('backend/churvox_command_apply_routes.py');
const usercustomize = read('backend/usercustomize.py');
const commandApi = read('frontend/src/churvox-office-lab/OfficeTeamCommandApi.js');
const safeControls = read('frontend/src/churvox-office-lab/OfficeTeamSafeControls.jsx');
const roleControls = read('frontend/src/churvox-office-lab/OfficeTeamRoleControls.jsx');
const settings = read('frontend/src/churvox-office-lab/OfficeTeamSiteSettings.jsx');
const extraScreens = read('frontend/src/churvox-office-lab/OfficeTeamExtraScreens.jsx');
const xeroScreen = read('frontend/src/churvox-office-lab/OfficeTeamXeroScreen.jsx');
const workerRoute = read('frontend/src/churvox-office-lab/OfficeTeamWorkerRoute.jsx');
const workerOwner = read('frontend/src/churvox-office-lab/OfficeTeamWorkerPhoneView.jsx');
const backOffice = read('frontend/src/churvox-office-lab/OfficeTeamBackOfficeScreens.jsx');
const plans = read('frontend/src/churvox-office-lab/OfficeTeamPlansScreen.jsx');
const workForms = read('frontend/src/churvox-office-lab/OfficeTeamWorkForms.jsx');
const ownerSite = read('frontend/src/churvox-office-lab/OfficeTeamLabSite.jsx');
const ownerNav = read('frontend/src/churvox-office-lab/OfficeTeamOwnerNavigation.jsx');
const contextStrip = read('frontend/src/churvox-office-lab/OfficeTeamContextStrip.jsx');
const liveSmoke = read('scripts/churvox-live-command-smoke.cjs');

expect(
  'all eight office roles have human-like builders',
  includesAll(humanMimic, [
    '"Office Manager"', '"Receptionist"', '"Bookkeeper"', '"Accountant"', '"Payroll Clerk"', '"Client Memory"', '"Quality Checker"', '"Operations Manager"',
    'build_invoice_slip', 'build_booking_slip', 'build_payment_followup_slip', 'build_reply_slip', 'build_hours_slip', 'build_quality_slip', 'build_client_memory_slip', 'build_accounting_slip', 'build_operations_slip', 'build_office_manager_brief',
  ]),
  'Every role must have a specific evidence-backed reasoning path, including Operations and Office Manager',
);

expect(
  'booking role uses real rules and history instead of a fixed cycle',
  includesAll(humanMimic, ['explicit_cycle_days', 'inferred_cycle_days', 'median(gaps)', 'roll_forward', 'It did not assume a three-week cycle'])
    && !humanMimic.includes('Every 3 weeks'),
  'Recurring booking intelligence must not hard-code a three-week pattern',
);

expect(
  'invoice role handles inclusive and exclusive tax safely',
  includesAll(humanMimic, ['normalized_rate', 'tax_inclusive', 'subtotal * rate / (1 + rate)', 'subtotal * rate', 'GST/tax treatment needs owner confirmation']),
  'Tax logic must normalize percentage formats and avoid double-adding inclusive GST',
);

expect(
  'bookkeeper separates overdue follow-up from new invoice creation',
  includesAll(humanMimic, ['build_payment_followup_slip', 'Days overdue', 'Bookkeeper escalation rule', 'Prepared reminder', 'prepare_overdue_followup']),
  'Overdue invoices need a client follow-up judgement, not a second invoice draft',
);

expect(
  'payroll role compares workers with their own history',
  includesAll(humanMimic, ['worker_baseline', 'median(values[-12:])', 'baseline * 1.75', 'Normal worker baseline']),
  'Odd-hours checks must use worker-specific history and missing clock-off evidence',
);

expect(
  'client memory checks sensitivity and duplicates',
  includesAll(humanMimic, ['existing_client_memory', 'Sensitive access/safety detail', 'Possible duplicate found', 'appropriate to retain']),
  'Client memory must not blindly copy sensitive or duplicate notes',
);

expect(
  'office slips expose evidence confidence missing facts and owner question',
  includesAll(humanMimic, ['"evidence": evidence_rows', '"missing": missing', '"confidence": confidence_data', '"field_sources": prepared_form', '"owner_question": owner_question'])
    && includesAll(commandApi, ['function reasoningForSlip', 'Evidence used:', 'Confidence:', 'Owner must check:', 'Owner question:', 'reasoning.summary']),
  'The owner must be able to see why each role made its judgement',
);

expect(
  'guarded office scan is registered before every older scanner',
  includesAll(usercustomize, ['build_command_human_mimic_marker_router', 'build_command_human_mimic_guard_router', 'build_command_human_mimic_router', 'build_command_mimic_intelligence_router', 'build_command_apply_router'])
    && usercustomize.indexOf('build_command_human_mimic_marker_router') < usercustomize.indexOf('build_command_human_mimic_guard_router')
    && usercustomize.indexOf('build_command_human_mimic_guard_router') < usercustomize.indexOf('build_command_human_mimic_router')
    && usercustomize.indexOf('build_command_human_mimic_router') < usercustomize.indexOf('build_command_mimic_intelligence_router')
    && usercustomize.indexOf('build_command_mimic_intelligence_router') < usercustomize.indexOf('build_command_apply_router'),
  'The guarded scan must own /command/scan while unguarded v2 and v1 scanners remain compatibility fallbacks only',
);

expect(
  'office guard retires stale false and premature decisions safely',
  includesAll(mimicGuard, [
    'retire_old_engine_slips', 'payload.human_mimic_intelligence_v2', 'retire_outbound_reply_false_positives',
    'Message direction is outbound', 'retire_false_completion_slips', 'linked_invoice_exists',
    'retire_early_or_invalid_payment_followups', 'status_words', 'paid_or_closed = bool(words & {"paid", "settled"})',
    'retire_stale_briefs', 'current_day = now().date().isoformat()', 'status": "superseded"',
    'human-mimic-scan-guard-v2', 'No business record, message, payment or accounting record changed',
  ]) && !mimicGuard.includes('any(marker in status for marker in ["paid"'),
  'Old cards, outbound messages, false completion, duplicate invoices, early reminders and stale briefings must leave the owner queue',
);

expect(
  'live deployment marker proves roles guard and owner shell',
  includesAll(mimicMarker, [
    'HUMAN_MIMIC_VERSION = "human-mimic-intelligence-v2"',
    'HUMAN_MIMIC_GUARD = "human-mimic-scan-guard-v2"',
    'OWNER_SHELL_VERSION = "owner-vision-shell-v1"',
    '"Office Manager"', '"Receptionist"', '"Bookkeeper"', '"Accountant"', '"Payroll Clerk"', '"Client Memory"', '"Quality Checker"', '"Operations Manager"',
  ]) && includesAll(liveSmoke, ['/api/command/human-mimic-marker', 'EXPECTED_HUMAN_MIMIC', 'EXPECTED_GUARD', 'EXPECTED_OWNER_SHELL', 'roles.length === 8']),
  'Live smoke must prove the guarded office build and owner vision shell reached Render',
);

expect(
  'scanner and guard never send sync charge file tax or pay staff',
  !/(send_email|send_sms|stripe\.|payment_intent|charge\(|xero[^\n]*sync\(|myob[^\n]*sync\(|file_tax\(|submit[^\n]*tax|bank_file\(|bank payout|payroll_payment)/i.test(`${humanMimic}\n${mimicGuard}`),
  'Office intelligence may only prepare, filter and audit Command slips',
);

expect(
  'approval executor remains draft-only idempotent and memory-safe',
  includesAll(applyRoutes, [
    '"status": "draft_approved"', '"no_auto_send": True', '"no_auto_sync": True', '"no_auto_charge": True', '"no_auto_file_tax": True',
    'slip.get("status") == "approved_applied"', '"idempotent": True', 'return "client_memory_reviews", "client_memory_review"',
  ]),
  'Owner approval may create one internal draft only; repeated clicks and client memory must not create duplicates',
);

expect(
  'owner workspace uses only confirmed backend Command decisions',
  includesAll(ownerSite, [
    'if (isOwnerApp) return backendDecisions;',
    'Command could not be confirmed. No fallback or browser-only decisions are being shown.',
    'item?.raw?.source !== "backend_command_slip"',
    'That item is not a confirmed live Command slip',
  ]),
  'Owner approvals must never fall back to starter cards, Admin Brain, old drafts or local browser queues',
);

expect(
  'owner shell reduces thinking and hides routine machinery',
  includesAll(ownerSite, ['OfficeTeamOwnerNavigation', 'OfficeTeamContextStrip', 'Churvox handles the admin. You handle the decisions.', 'Only the decisions that need the owner'])
    && includesAll(ownerNav, ['Office and oversight', 'cvOwnerNavCount'])
    && includesAll(contextStrip, ['waiting in Command', 'Open Command']),
  'The owner should see a compact core path while secondary office oversight remains available',
);

expect(
  'Command fallback fields never invent business facts',
  ownerSite.includes('const MISSING_VALUE = "Not found — owner must enter"')
    && !/Every 3 weeks|Base service \+ extra green waste|Long timer flagged|Xero \/ MYOB"\)/.test(ownerSite),
  'Missing cycles, amounts, workers and accounting systems must remain visibly unresolved',
);

expect(
  'every reusable owner safe control prepares real Command work',
  includesAll(safeControls, ['safeActions.map', 'createBackendCommandSlip', 'prepared_form: preparedForm', 'Every button prepares a real Command slip'])
    && !safeControls.includes('if (action === command)'),
  'Primary and secondary buttons must not be browser-only messages',
);

expect(
  'settings and office role modes are approval-backed drafts',
  includesAll(settings, ['createBackendCommandSlip', 'Prepare settings in Command', 'Current settings remain unchanged'])
    && includesAll(roleControls, ['createBackendCommandSlip', 'Prepare role modes in Command', 'No live role behaviour changed']),
  'Settings-looking controls must not pretend localStorage is a live business setting',
);

expect(
  'Xero owner page has real status connection export and Command actions',
  includesAll(xeroScreen, ['/xero/status', '/accounting/health', '/xero/connect/start', '/xero/disconnect', '/api/accounting/export/pack?system=both', 'Prepare sync review in Command']),
  'Xero buttons must have real destinations and remain owner controlled',
);

expect(
  'Help opens real pages and real support email',
  includesAll(extraScreens, ['goToScreen(screen)', 'mailto:hello@churvox.com', 'Use Churvox without guessing', 'Open {title}']),
  'Help must not render fake fallback records or no-op support buttons',
);

expect(
  'worker route performs real status proof and Command fallback',
  includesAll(workerRoute, ['/jobs/${encodeURIComponent(jobId)}/${endpoint}', '/worker/field-slip', 'createBackendWorkerUpdateRequest', 'Boss update sent to Command', 'proof_photo_names', 'Send proof note']),
  'Worker status and proof controls must not only change local text',
);

expect(
  'owner worker page cannot impersonate live worker actions',
  includesAll(workerOwner, ['This owner page shows live worker records', 'Open protected worker app', 'cvWorkerFlowStep'])
    && !workerOwner.includes('onClick={() => setStatus(step)}'),
  'Owner worker oversight should link to the protected worker route rather than fake job updates',
);

expect(
  'Schedule and Payroll have working preparation forms',
  includesAll(backOffice, ['formArea="work"', 'formArea="payroll"', '<OfficeTeamWorkForms area={formArea}']),
  'Back-office pages need a real next action, not status cards only',
);

expect(
  'Plans comparison hands off to real billing route',
  includesAll(plans, ['function openBilling()', 'window.location.assign(`/plans?', 'Open secure billing', 'Nothing is charged from this comparison screen']),
  'Selecting a plan card must not look like a billing change without a real billing action',
);

expect(
  'CSV preparation preserves real rows for the approval executor',
  includesAll(workForms, ['csv_rows: rows', 'sourcePayload', '...(sourcePayload || {})', 'The actual parsed rows stay attached']),
  'CSV review must carry the parsed row objects, not only a preview sentence',
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
  'frontend/src/churvox-office-lab/OfficeTeamRoleControls.jsx',
  'frontend/src/churvox-office-lab/OfficeTeamPlansScreen.jsx',
  'frontend/src/churvox-office-lab/OfficeTeamWorkerPhoneView.jsx',
  'frontend/src/churvox-office-lab/OfficeTeamWorkerRoute.jsx',
  'frontend/src/churvox-office-lab/OfficeTeamMessagesDesk.jsx',
  'frontend/src/churvox-office-lab/OfficeTeamWorkForms.jsx',
];

const deadButtons = [];
for (const file of buttonFiles) {
  for (const opening of buttonOpenings(read(file))) {
    const hasAction = /\bonClick\s*=/.test(opening) || /\btype\s*=\s*["']submit["']/.test(opening) || /\bformAction\s*=/.test(opening);
    if (!hasAction) deadButtons.push(`${file}: ${opening.replace(/\s+/g, ' ').slice(0, 150)}`);
  }
}
expect(
  'visible owner and worker buttons have real handlers',
  deadButtons.length === 0,
  deadButtons.length ? `Buttons without onClick/submit handlers:\n${deadButtons.join('\n')}` : 'No dead buttons found',
);

const failed = checks.filter((check) => !check.ok);
for (const check of checks) {
  console.log(`${check.ok ? '✓' : '✗'} ${check.name}${check.ok ? '' : ` — ${check.detail}`}`);
}

if (failed.length) {
  console.error(`\nHuman office product audit failed: ${failed.length} issue(s).`);
  process.exit(1);
}

console.log(`\nHuman office product audit passed: ${checks.length} checks.`);
