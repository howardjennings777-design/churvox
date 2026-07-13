const fs = require('fs');
const patch = fs.readFileSync('backend/churvox_final_owner_messages_route_patch.py', 'utf8');
const wrapper = fs.readFileSync('backend/server/__init__.py', 'utf8');
const smoke = fs.readFileSync('scripts/churvox-paid-launch-live-smoke-v2.cjs', 'utf8');
const marker = fs.readFileSync('frontend/public/churvox-paid-launch-build.json', 'utf8');
const proof = fs.readFileSync('.github/workflows/churvox-worker-command-scope-diagnostic.yml', 'utf8');
const checks = [
  ['v17 marker aligned', patch.includes('churvox-final-owner-messages-v17-20260714') && wrapper.includes('churvox-final-owner-messages-v17-20260714') && smoke.includes('churvox-final-owner-messages-v17-20260714') && marker.includes('churvox-final-owner-messages-v17-20260714')],
  ['FastAPI Request is globally resolvable', patch.includes('from fastapi import Request') && patch.includes('async def list_messages(request: Request):')],
  ['bad local Request dependency removed', !patch.includes('Request = getattr(module, "Request", None)') && !patch.includes('ObjectId is None or Request is None')],
  ['logical completion dedupe retained', patch.includes('job_completion:') && patch.includes('rows = dedupe(rows)[:200]')],
  ['final route ownership retained', patch.includes('remove_route(app, "/api/messages", "GET")') && wrapper.includes('messages_patch.install(legacy, force=True)')],
  ['live smoke requires v17 route', smoke.includes('expectedOwnerMessages') && smoke.includes('final_owner_messages_wrapper')],
  ['exact proof requires v17 and 1/1/0', proof.includes('churvox-final-owner-messages-v17-20260714') && proof.includes('notifications.matches === 1') && proof.includes('messages.matches === 1') && proof.includes('command.matches === 0')],
  ['v15 protections remain', marker.includes('active-worker-jobs-only') && marker.includes('worker-job-queue-bounded-with-show-all')],
  ['owner approval safety remains', marker.includes('Owner approval remains required')],
];
let failed = false;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failed = true; }
if (failed) process.exit(1);
console.log('CHURVOX_FINAL_OWNER_MESSAGES_V17_CONTRACT_PASS');
