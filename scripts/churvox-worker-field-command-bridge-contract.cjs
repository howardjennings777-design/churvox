const fs = require('fs');

const field = fs.readFileSync('backend/churvox_field_truth_fix_patch.py', 'utf8');
const guard = fs.readFileSync('backend/churvox_paid_launch_guard_patch.py', 'utf8');
const live = fs.readFileSync('backend/churvox_paid_launch_live_patch.py', 'utf8');
const workerUi = fs.readFileSync('frontend/src/churvox-office-lab/OfficeTeamWorkerRoute.jsx', 'utf8');
const site = fs.readFileSync('frontend/src/churvox-office-lab/OfficeTeamLabSite.jsx', 'utf8');
const ownerCss = fs.readFileSync('frontend/src/churvox-office-lab/OfficeTeamOwnerReady.css', 'utf8');
const marker = fs.readFileSync('frontend/public/churvox-paid-launch-build.json', 'utf8');

const checks = [
  ['bridge build marker', field.includes('churvox-worker-field-command-bridge-v10-20260713') && marker.includes('churvox-worker-field-command-bridge-v10-20260713')],
  ['problem-only classification', field.includes('def _needs_command(kind)') && field.includes('"problem"') && field.includes('"issue"')],
  ['proof remains outside Command', field.includes('"excludes": ["job_proof", "routine_worker_message"]')],
  ['deduplicated command upsert', field.includes('db.command_slips.update_one') && field.includes('"$setOnInsert": command_doc') && field.includes('upsert=True')],
  ['business scoped mirror', field.includes('"business_id": business_id') && field.includes('"source_type": "worker_field_problem"')],
  ['owner review safety fields', field.includes('"owner_review_only": True') && field.includes('"no_auto_send": True') && field.includes('"no_auto_sync": True') && field.includes('"no_auto_charge": True')],
  ['bridge failure is not reported as success', field.includes('raise RuntimeError("Worker problem could not be prepared in Command')],
  ['command cache invalidated after problem', field.includes('_invalidate_command_cache(business_id)')],
  ['every loaded Command cache alias invalidated', field.includes('seen = set()') && field.includes('invalidated += 1') && !field.includes('invalidate(business_id)\n                return')],
  ['shared queue invalidator exists', live.includes('def invalidate_command_queue(business_id: str)') && live.includes('COMMAND_QUEUE_CACHES')],
  ['final route delegates to bridge', guard.includes('field_truth_fix.fixed_create_field_slip') && guard.includes('paid_launch_guard_bridge')],
  ['final readiness owns live route', guard.includes('/api/worker/field-command-readiness') && guard.includes('FINAL_WORKER_FIELD_BRIDGE_BUILD')],
  ['paid launch readiness marker aligned', live.includes('churvox-worker-field-command-bridge-v10-20260713')],
  ['worker problem route remains field slip', workerUi.includes('sendFieldSlip(needsDecision ? "worker_problem" : "worker_message"')],
  ['mobile open-slip target is at least 48px', ownerCss.includes('.cvOwnerReady .cvSiteDecisionCard footer button') && ownerCss.includes('min-height: 48px')],
  ['worker problems rank ahead of routine Command items', field.includes('worker_field_problem') && marker.includes('worker-problems-ranked-before-routine-command-items')],
  ['open Command refreshes live without rerunning scan', site.includes('screen !== \"command\"') && site.includes('window.setInterval(refreshOpenCommand, 5000)') && site.includes('force: true') && marker.includes('command-screen-bounded-five-second-refresh')],
  ['fresh manual owner slips rank before routine items', site.includes('[\"manual_form\", \"quick_intake\", \"csv_import\"]') && site.includes('return 95') && marker.includes('fresh-owner-created-slips-ranked-before-routine-command-items')],
  ['owner approval statement remains', field.includes('owner must approve, edit, park or dismiss')],
];

let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
console.log('WORKER_FIELD_COMMAND_BRIDGE_CONTRACT_PASS');
