#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const all = (text, values) => values.every((value) => text.includes(value));
const checks = [];
const expect = (name, ok, detail) => checks.push({ name, ok: Boolean(ok), detail });

const normalizer = read('backend/churvox_command_human_mimic_source_normalizer.py');
const strict = read('backend/churvox_command_human_mimic_v3_routes.py');
const roleSchema = read('backend/churvox_command_human_mimic_role_schema_guard.py');
const finalizer = read('backend/churvox_command_human_mimic_queue_finalizer.py');
const live = read('backend/churvox_command_human_mimic_live_routes.py');
const marker = read('backend/churvox_command_human_mimic_marker_routes.py');
const apply = read('backend/churvox_command_apply_routes.py');
const fullTest = read('scripts/churvox_mimic_full_test.py');
const fullRunner = read('scripts/churvox_mimic_full_test_runner.py');
const liveSmoke = read('scripts/churvox-live-command-smoke.cjs');

expect(
  'legacy source normalisation is narrow and explicit',
  all(normalizer, [
    'FALSE_COMPLETE_STATUSES',
    '"incomplete"',
    '"pending completion"',
    'item["_source_status_original"] = raw_status',
    'item["status"] = "open"',
    'duration_minutes',
    'duration_seconds',
    'item["duration_hours"] = hours',
    'item["_duration_normalized_from"] = source',
  ]),
  'False-complete legacy statuses and timer units must be normalised without inventing other fields',
);

expect(
  'strict preflight captures candidates before real Command writes',
  all(strict, [
    'class _CaptureDB',
    'capture_db.capture.get("command_slips", [])',
    'strict_preflight_passed',
    'required_fields',
    'approval_blocked',
    'evidence_fingerprint',
    'existing_fingerprint == current_fingerprint',
    'The live source evidence changed',
  ]),
  'The legacy builders may reason, but strict v3 must validate before insert and replace changed evidence',
);

expect(
  'every operational mimic has a required evidence schema',
  all(roleSchema, [
    'ROLE_SCHEMA_GUARD = "role-required-evidence-v1"',
    'if action == "prepare_invoice"',
    'elif action == "prepare_recurring_next_date"',
    'elif action == "complete_job_setup"',
    'elif action == "prepare_overdue_followup"',
    'elif action == "prepare_customer_reply"',
    'elif action == "review_odd_hours"',
    'elif action == "request_completion_proof"',
    'elif action == "prepare_client_memory"',
    'elif action == "review_accounting_export"',
    'payload["required_fields"] = required',
    'payload["approval_blocked"] = blocked',
    'payload["role_schema_guard"] = ROLE_SCHEMA_GUARD',
  ]),
  'Each mimic must require the client, amount, date, message, worker, proof or tax evidence appropriate to its role',
);

expect(
  'manager mimics use only the surviving strict queue',
  all(finalizer, [
    'SUMMARY_GUARD = "strict-surviving-queue-summary-v1"',
    'core = [item for item in all_items',
    'role_counts = _role_counts(core)',
    'Only strict surviving decisions counted',
    'Cause not proven.',
    'Suggested order',
    'payload.get("summary_guard") == SUMMARY_GUARD',
    'if unchanged:',
    'return False',
  ]),
  'Office Manager ranking and Operations Manager causes must be grounded and idempotent',
);

expect(
  'live route executes every guard in order',
  all(live, [
    'normalized_db = normalize_mimic_source_db(db)',
    'build_command_human_mimic_v3_router(_StrictLiveDBView(normalized_db)',
    'A live invoice already links to this job',
    'result["post_guard"] = POST_GUARD',
    'result["source_normalization"] = "legacy-job-status-and-timer-units-v1"',
    'result = await enforce_role_schema(db, result, ObjectId)',
    'result = await finalize_strict_queue(db, user, result, ObjectId)',
  ]),
  'Source normalisation, strict validation, duplicate recheck, role schemas and manager finalisation must all execute',
);

expect(
  'marker and smoke require the same complete chain',
  all(marker, [
    'HUMAN_MIMIC_SOURCE_NORMALIZATION = "legacy-job-status-and-timer-units-v1"',
    'HUMAN_MIMIC_ROLE_SCHEMA_GUARD = "role-required-evidence-v1"',
    'HUMAN_MIMIC_SUMMARY_GUARD = "strict-surviving-queue-summary-v1"',
    '"source_normalization": True',
    '"role_specific_required_evidence": True',
    '"linked_invoice_postguard": True',
    '"manager_summaries_use_strict_queue": True',
  ]) && all(liveSmoke, [
    "EXPECTED_SOURCE_NORMALIZATION = 'legacy-job-status-and-timer-units-v1'",
    "EXPECTED_ROLE_SCHEMA_GUARD = 'role-required-evidence-v1'",
    "EXPECTED_SUMMARY_GUARD = 'strict-surviving-queue-summary-v1'",
    'preflight.source_normalization',
    'preflight.role_specific_required_evidence',
    'preflight.manager_summaries_use_strict_queue',
  ]),
  'Live smoke must fail when any strict-chain layer is stale or missing',
);

expect(
  'approval remains blocked until required evidence is resolved',
  all(apply, [
    'def assert_strict_mimic_safe',
    'def unresolved_requirements',
    'Complete these required fields before approval',
    'slip.get("status") not in OPEN_STATUSES',
    '"no_auto_send": True',
    '"no_auto_sync": True',
    '"no_auto_charge": True',
    '"no_auto_file_tax": True',
  ]),
  'Strict decisions cannot apply unresolved, closed or externally actionable work',
);

expect(
  'full execution test covers strict chain behavior',
  all(fullTest, [
    'historical extra never became a charge',
    'linked invoice prevents duplicate draft',
    'one-hour seconds timer is not a false anomaly',
    'changed source evidence replaces stale decision',
    'unresolved required fields block approval',
    'superseded decisions cannot be applied',
    'worker cannot run owner intelligence',
  ]) && all(fullRunner, [
    'legacy incomplete status is normalized before reasoning',
    'legacy seconds timer is normalized to hours',
    'deployment marker proves linked-invoice post-guard',
  ]),
  'Readiness must execute both good and bad evidence paths',
);

expect(
  'behavioural test installs dependency-free runtime before backend imports',
  all(fullRunner, [
    'def install_test_runtime_stubs():',
    'sys.modules["bson"] = bson_module',
    'sys.modules["fastapi"] = fastapi_module',
    'install_test_runtime_stubs()',
    'import churvox_mimic_full_test as suite',
    'dependency-free test runtime is active',
  ]) && fullRunner.indexOf('install_test_runtime_stubs()') < fullRunner.indexOf('import churvox_mimic_full_test as suite'),
  'The full test must run in a normal Codespace without globally installed FastAPI or BSON',
);

expect(
  'strict-chain files contain no external action implementation',
  !/(send_email\s*\(|send_sms\s*\(|payment_intent\s*\(|create_charge\s*\(|file_tax\s*\(|submit_tax\s*\(|create_bank_file\s*\()/i.test(`${normalizer}\n${strict}\n${roleSchema}\n${finalizer}\n${live}\n${apply}`),
  'Strict mimic code must prepare internal work only',
);

const failed = checks.filter((check) => !check.ok);
for (const check of checks) {
  console.log(`${check.ok ? '✓' : '✗'} ${check.name}${check.ok ? '' : ` — ${check.detail}`}`);
}
if (failed.length) {
  console.error(`\nStrict mimic v3 chain audit failed: ${failed.length} issue(s).`);
  process.exit(1);
}
console.log(`\nStrict mimic v3 chain audit passed: ${checks.length} checks.`);
