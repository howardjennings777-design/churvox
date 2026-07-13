const fs = require('fs');

const field = fs.readFileSync('backend/churvox_field_truth_fix_patch.py', 'utf8');
const live = fs.readFileSync('backend/churvox_paid_launch_live_patch.py', 'utf8');
const workerUi = fs.readFileSync('frontend/src/churvox-office-lab/OfficeTeamWorkerRoute.jsx', 'utf8');

const checks = [
  ['bridge build marker', field.includes('churvox-worker-field-command-bridge-v7-20260713')],
  ['problem-only classification', field.includes('def _needs_command(kind)') && field.includes('"problem"') && field.includes('"issue"')],
  ['proof remains outside Command', field.includes('"excludes": ["job_proof", "routine_worker_message"]')],
  ['deduplicated command upsert', field.includes('db.command_slips.update_one') && field.includes('"$setOnInsert": command_doc') && field.includes('upsert=True')],
  ['business scoped mirror', field.includes('"business_id": business_id') && field.includes('"source_type": "worker_field_problem"')],
  ['owner review safety fields', field.includes('"owner_review_only": True') && field.includes('"no_auto_send": True') && field.includes('"no_auto_sync": True') && field.includes('"no_auto_charge": True')],
  ['command cache invalidated after problem', field.includes('_invalidate_command_cache(business_id)')],
  ['shared queue invalidator exists', live.includes('def invalidate_command_queue(business_id: str)') && live.includes('COMMAND_QUEUE_CACHES')],
  ['readiness endpoint exists', field.includes('/api/worker/field-command-readiness')],
  ['worker problem route remains field slip', workerUi.includes('sendFieldSlip(needsDecision ? "worker_problem" : "worker_message"')],
  ['owner approval statement remains', field.includes('owner must approve, edit, park or dismiss')],
];

let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
console.log('WORKER_FIELD_COMMAND_BRIDGE_CONTRACT_PASS');
