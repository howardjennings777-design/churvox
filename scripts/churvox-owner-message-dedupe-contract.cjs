const fs = require('fs');
const backend = fs.readFileSync('backend/churvox_owner_data_visibility_patch.py', 'utf8');
const marker = fs.readFileSync('frontend/public/churvox-paid-launch-build.json', 'utf8');
const checks = [
  ['v13 logical-dedupe implementation retained', backend.includes('churvox-owner-message-completion-dedupe-v13-20260713')],
  ['logical completion key', backend.includes('job_completion:') && backend.includes('job_complete') && backend.includes('job_completed')],
  ['dedupe runs before 200 row cutoff', backend.includes('rows = dedupe_owner_messages(rows)[:200]')],
  ['generic job-event duplicates collapse', backend.includes('return f"{job_id}:{kind}:{body}"')],
  ['messages response exposes safe strategy', backend.includes('"dedupe_strategy": "logical_job_event"')],
  ['historical readiness contract retained', backend.includes('/api/messages/readiness') && backend.includes('"route_owner": "owner_data_visibility"')],
  ['notification source remains available', backend.includes('"notifications", "approved_notifications", "worker_messages", "worker_field_slips"')],
  ['current paid-launch marker keeps single completion rule', marker.includes('single-owner-completion-per-message-channel')],
  ['current build retains a message dedupe owner', marker.includes('owner_message_dedupe') || marker.includes('owner_messages_final_route')],
];
let failed = false;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failed = true; }
if (failed) process.exit(1);
console.log('OWNER_MESSAGE_DEDUPE_CONTRACT_PASS');
