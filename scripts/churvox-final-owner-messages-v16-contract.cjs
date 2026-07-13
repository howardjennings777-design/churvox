const fs = require('fs');
const patch = fs.readFileSync('backend/churvox_final_owner_messages_route_patch.py', 'utf8');
const wrapper = fs.readFileSync('backend/server/__init__.py', 'utf8');
const smoke = fs.readFileSync('scripts/churvox-paid-launch-live-smoke-v2.cjs', 'utf8');
const marker = fs.readFileSync('frontend/public/churvox-paid-launch-build.json', 'utf8');
const checks = [
  ['v16 marker aligned', patch.includes('churvox-final-owner-messages-v16-20260713') && marker.includes('churvox-final-owner-messages-v16-20260713')],
  ['runtime helpers are defined', patch.includes('def text(value):') && patch.includes('def lower(value):')],
  ['completion key collapses four collections', patch.includes('job_completion:') && patch.includes('COLLECTIONS = ["notifications", "approved_notifications", "worker_messages", "worker_field_slips"]')],
  ['dedupe happens before response cutoff', patch.includes('rows = dedupe(rows)[:200]')],
  ['route installer removes stale owners', patch.includes('remove_route(app, "/api/messages", "GET")') && patch.includes('app.add_api_route("/api/messages", list_messages')],
  ['wrapper force-installs final messages route', wrapper.includes('_force_install_final_owner_messages_patch()') && wrapper.includes('messages_patch.install(legacy, force=True)')],
  ['wrapper marker exposes route ownership', wrapper.includes("'/api/messages/readiness'") && wrapper.includes("'owner_messages_patch_installed'")],
  ['live smoke verifies readiness and final owner', smoke.includes('/api/messages/readiness') && smoke.includes("final_owner_messages_wrapper") && smoke.includes('expectedOwnerMessages')],
  ['existing safety and v15 markers retained', marker.includes('active-worker-jobs-only') && marker.includes('single-owner-completion-per-message-channel')],
];
let failed = false;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failed = true; }
if (failed) process.exit(1);
console.log('CHURVOX_FINAL_OWNER_MESSAGES_V16_CONTRACT_PASS');
