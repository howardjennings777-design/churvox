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

const labSite = read('frontend/src/churvox-office-lab/OfficeTeamLabSite.jsx');
const commandApi = read('frontend/src/churvox-office-lab/OfficeTeamCommandApi.js');
const mimicRoutes = read('backend/churvox_command_mimic_intelligence_routes.py');
const applyRoutes = read('backend/churvox_command_apply_routes.py');
const usercustomize = read('backend/usercustomize.py');
const liveSmoke = read('scripts/churvox-live-command-smoke.cjs');

expect(
  'full Command slip passes edited fields and shows the real executor result',
  includesAll(labSite, [
    'fields: Array.isArray(detail.fields) ? detail.fields : []',
    'formTitle: detail.formTitle || makeSlipFormTitle(item)',
    'commandResult?.result?.execution?.applied',
    'commandResult?.safety',
    'owner-approved internal draft',
    'Open the full slip to edit and record the owner decision',
  ]),
  'OfficeTeamLabSite must submit the edited form and truthfully distinguish an applied draft from a record-only direction',
);

expect(
  'frontend sends edited fields to the real approval executor',
  includesAll(commandApi, [
    'function approvalFields(fields = [])',
    'function finalActionsForSlip(slip = {})',
    '!/\\bedit\\b/i.test(clean(action))',
    ': "approve"',
    'fields: approvalFields(approval.fields)',
    'form_title: clean(approval.formTitle || approval.form_title',
    'no_auto_record_change: true',
  ]),
  'OfficeTeamCommandApi must send the approved form to /approve and keep edit-only actions inside the form',
);

expect(
  'Command intelligence prepares evidence-backed forms',
  includesAll(mimicRoutes, [
    '"evidence": evidence_rows',
    '"missing": missing',
    '"confidence": confidence_data',
    '"prepared_form": form_flat',
    '"field_sources": prepared_form',
    '"prepared_only": True',
    '"owner_review_only": True',
  ]),
  'mimic intelligence must show evidence, missing values, confidence and field sources',
);

expect(
  'approval executor consumes edited fields and creates owner-approved drafts only',
  includesAll(applyRoutes, [
    'def form_from_request(payload):',
    'fields = payload.get("fields")',
    'if should_apply(action):',
    'status = "approved_applied" if applied else "approved_recorded"',
    '"status": "draft_approved"',
    '"source": "command_owner_approval"',
    '"used_edited_form": bool(form_from_request(request_payload))',
    '"no_auto_send": True',
    '"no_auto_sync": True',
    '"no_auto_charge": True',
    '"no_auto_file_tax": True',
  ]),
  'approval executor must use edited fields while keeping send, sync, charge and tax filing locked',
);

expect(
  'approval executor is idempotent and keeps memory drafts separate',
  includesAll(applyRoutes, [
    'slip.get("status") == "approved_applied"',
    '"idempotent": True',
    'return "client_memory_reviews", "client_memory_review"',
  ]),
  'Repeated approvals must not create duplicate drafts and client memory must not create duplicate clients',
);

expect(
  'non-approval directions remain record-only',
  includesAll(applyRoutes, [
    'def should_apply(action):',
    '"park"', '"ignore"', '"snooze"', '"ask"', '"edit"', '"review later"', '"later"', '"call"', '"handle personally"', '"clear anyway"',
    'return False',
    'execution = {"applied": False, "message": RECORD_ONLY_RESULT}',
  ]),
  'ask, park, edit, later, call and owner-handle actions must not create or change business drafts',
);

expect(
  'approval executor cannot send, sync, charge, file tax or pay anyone',
  !/(send_email|send_sms|stripe\.|payment_intent|charge\(|xero[^\n]*sync|myob[^\n]*sync|file_tax\(|submit[^\n]*tax|bank_file\(|bank payout|payroll_payment)/i.test(applyRoutes),
  'approval executor appears to trigger an external send, sync, charge, filing or payment',
);

expect(
  'real Command routers load in safe order',
  usercustomize.indexOf('build_command_mimic_intelligence_router') < usercustomize.indexOf('build_command_apply_router')
    && usercustomize.indexOf('build_command_apply_router') < usercustomize.indexOf('build_command_router'),
  'mimic intelligence and approval executor must register before older Command routes',
);

expect(
  'live smoke checks the real approval executor route',
  liveSmoke.includes('/api/command/slips/000000000000000000000000/approve'),
  'live Command smoke must fail if the deployed /approve route is missing or unprotected',
);

const failed = checks.filter((check) => !check.ok);
for (const check of checks) {
  console.log(`${check.ok ? '✓' : '✗'} ${check.name}${check.ok ? '' : ` — ${check.detail}`}`);
}

if (failed.length) {
  console.error(`\nCommand approval readiness failed: ${failed.length} issue(s).`);
  process.exit(1);
}

console.log(`\nCommand approval readiness passed: ${checks.length} checks.`);
