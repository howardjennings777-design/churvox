const fs = require('fs');
const live = fs.readFileSync('backend/churvox_paid_launch_live_patch.py', 'utf8');
const wrapper = fs.readFileSync('backend/server/__init__.py', 'utf8');
const v3 = fs.readFileSync('backend/churvox_command_human_mimic_v3_routes.py', 'utf8');

const checks = [
  ['live patch imports v3 router', live.includes('build_command_human_mimic_v3_router')],
  ['live patch no longer builds v2 guard router', !live.includes('build_command_human_mimic_guard_router')],
  ['live fast scan defaults to v3 source', live.includes('human-mimic-intelligence-v3')],
  ['live fast scan defaults to strict v3 guard', live.includes('human-mimic-strict-preflight-v3')],
  ['v3 scan has bounded 25-second background deadline', live.includes('guarded_scan(request=request, payload=payload or {}), 25')],
  ['live backend v3 marker exists', live.includes('churvox-command-v3-live-backend-20260713g')],
  ['live wrapper v3 marker exists', wrapper.includes('churvox-command-v3-server-wrapper-20260713g')],
  ['wrapper still force-installs final patch', wrapper.includes('command_patch.install(legacy, force=True)')],
  ['v3 checks eight roles', v3.includes('ROLE_NAMES = [') && v3.includes('"Operations Manager"') && v3.includes('"Office Manager"')],
  ['v3 reports roles checked', v3.includes('"roles_checked": ROLE_NAMES')],
  ['v3 reports incomplete source scans', v3.includes('"scan_complete": not scan_errors') && v3.includes('"scan_errors": scan_errors')],
  ['v3 fixes percent GST rates', v3.includes('if number > 1:') && v3.includes('number = number / 100.0')],
  ['v3 rejects false incomplete completion', v3.includes('false_complete = "incomplete" in words')],
  ['v3 uses explicit or evidence-based recurrence', v3.includes('def robust_cycle(job, jobs):') && v3.includes('stable median')],
  ['owner approval safety remains', v3.includes('Owner approval required. Nothing was sent, synced, charged or changed.')],
];

let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
console.log('LIVE_COMMAND_V3_BRIDGE_CONTRACT_PASS');
