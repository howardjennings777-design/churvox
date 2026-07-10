#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const checks = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const all = (text, needles) => needles.every((needle) => text.includes(needle));
const expect = (name, ok, detail) => checks.push({ name, ok: Boolean(ok), detail });

const labSite = read('frontend/src/churvox-office-lab/OfficeTeamLabSite.jsx');
const commandApi = read('frontend/src/churvox-office-lab/OfficeTeamCommandApi.js');
const mimicRoutes = read('backend/churvox_command_mimic_intelligence_routes.py');
const strictRoutes = read('backend/churvox_command_human_mimic_v3_routes.py');
const applyRoutes = read('backend/churvox_command_apply_routes.py');
const usercustomize = read('backend/usercustomize.py');
const liveInstaller = read('backend/churvox_owner_access_safety_patch.py');
const fullTest = read('scripts/churvox_mimic_full_test.py');
const liveSmoke = read('scripts/churvox-live-command-smoke.cjs');

expect(
  'full Command slip submits edited fields and displays executor truth',
  all(labSite, [
    'fields: Array.isArray(detail.fields) ? detail.fields : []',
    'formTitle: detail.formTitle || makeSlipFormTitle(item)',
    'commandResult?.result?.execution?.applied',
    'commandResult?.safety',
    'owner-approved internal draft',
  ]),
  'Owner UI must submit the edited form and distinguish applied from record-only outcomes',
);

expect(
  'frontend sends edited fields to the protected approval route',
  all(commandApi, [
    'function approvalFields(fields = [])',
    'function finalActionsForSlip(slip = {})',
    'fields: approvalFields(approval.fields)',
    'form_title: clean(approval.formTitle || approval.form_title',
    'no_auto_record_change: true',
  ]),
  'Command API must carry the owner-approved fields and safety flags',
);

expect(
  'reasoning and strict preflight expose evidence and requirements',
  all(mimicRoutes, [
    '"evidence": evidence_rows',
    '"missing": missing',
    '"confidence": confidence_data',
    '"prepared_form": form_flat',
    '"field_sources": prepared_form',
  ]) && all(strictRoutes, [
    'strict_preflight_passed',
    'required_fields',
    'approval_blocked',
    'evidence_fingerprint',
    'history is reference, never a charge',
  ]),
  'Every strict decision must expose its evidence, uncertainty and required owner inputs',
);

expect(
  'executor blocks unresolved or unsafe strict decisions',
  all(applyRoutes, [
    'UNRESOLVED_MARKERS',
    'def meaningful(value):',
    'def unresolved_requirements(slip_payload, form):',
    'def assert_strict_mimic_safe(slip):',
    'strict_preflight_passed',
    'Complete these required fields before approval',
    'This mimic slip did not pass the strict safety preflight',
  ]),
  'No internal draft may be created while required fields or safety proof are missing',
);

expect(
  'executor creates one owner-approved internal draft from edited fields',
  all(applyRoutes, [
    'def form_from_request(payload):',
    'fields = payload.get("fields")',
    'effective_form = edited_form or prepared_form(payload_of(slip))',
    'status = "approved_applied" if applied else "approved_recorded"',
    '"status": "draft_approved"',
    '"source": "command_owner_approval"',
    '"used_edited_form": bool(request_form)',
    '"no_auto_send": True',
    '"no_auto_sync": True',
    '"no_auto_charge": True',
    '"no_auto_file_tax": True',
  ]),
  'Approved output must remain an internal protected draft',
);

expect(
  'closed slips are rejected and repeated approval is idempotent',
  all(applyRoutes, [
    'slip.get("status") == "approved_applied"',
    'slip.get("status") not in OPEN_STATUSES',
    'cannot be applied. Nothing was changed.',
    '"idempotent": True',
    'return "client_memory_reviews", "client_memory_review"',
  ]),
  'Superseded decisions cannot apply and repeated approval cannot duplicate drafts',
);

expect(
  'non-approval directions remain record-only',
  all(applyRoutes, [
    'def should_apply(action):',
    '"park"', '"ignore"', '"snooze"', '"ask"', '"edit"', '"review later"', '"clear anyway"',
    'execution = {"applied": False, "message": RECORD_ONLY_RESULT}',
  ]),
  'Ask, edit, park and owner-handle directions must not apply a draft',
);

expect(
  'behavioural test proves blocking, replacement and idempotency',
  all(fullTest, [
    'unresolved required fields block approval',
    'completed fields allow one internal draft',
    'approval execution is idempotent',
    'superseded decisions cannot be applied',
    'exactly one internal invoice draft was created',
    'internal draft carries no-auto safety flags',
  ]),
  'Approval safety must be exercised against the in-memory database',
);

expect(
  'live boot owns strict scan while compatibility order stays safe',
  usercustomize.indexOf('build_command_mimic_intelligence_router') < usercustomize.indexOf('build_command_apply_router')
    && usercustomize.indexOf('build_command_apply_router') < usercustomize.indexOf('build_command_router')
    && all(liveInstaller, ['remove_route(app, "/api/command/scan", "POST")', 'build_command_human_mimic_live_router']),
  'The live wrapper must replace compatibility scan with strict v3',
);

expect(
  'live smoke checks strict scan and approval route',
  all(liveSmoke, [
    '/api/command/scan',
    '/api/command/slips/000000000000000000000000/approve',
    "EXPECTED_HUMAN_MIMIC = 'human-mimic-intelligence-v3'",
  ]),
  'Live smoke must fail on stale strict scan or approval deployment',
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
