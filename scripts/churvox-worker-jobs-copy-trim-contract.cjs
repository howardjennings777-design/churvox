const fs = require('fs');
const route = fs.readFileSync('frontend/src/churvox-office-lab/OfficeTeamWorkerRoute.jsx', 'utf8');
const audit = fs.readFileSync('scripts/churvox-hardcore-owner-worker-audit.cjs', 'utf8');
const marker = fs.readFileSync('frontend/public/churvox-paid-launch-build.json', 'utf8');
const checks = [
  ['build marker', marker.includes('churvox-worker-jobs-copy-trim-v14-20260713')],
  ['short assigned-work copy', route.includes('Only your assigned work appears.')],
  ['short payment safety copy', route.includes('Worker View never charges cards. Use an approved invoice link.')],
  ['old verbose assignment copy removed', !route.includes('Only work assigned to this worker appears here.')],
  ['old verbose payment copy removed', !route.includes('Payment happens through an approved secure invoice link.')],
  ['worker controls retained', route.includes('const statusSteps = ["Acknowledge", "Start", "Pause", "Resume", "Complete"]')],
  ['payment owner approval retained', route.includes('Payment request sent to owner Command')],
  ['no-charge audit accepts concise equivalent', audit.includes("worker.includes('Worker View never charges cards')")],
  ['provider audit accepts approved-link equivalent', audit.includes("worker.includes('Use an approved invoice link')") && audit.includes('only mark paid after the real provider confirms it')],
  ['marker records visual limit repair', marker.includes('worker-jobs-under-hardcore-word-limit')],
];
let failed = false;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failed = true; }
if (failed) process.exit(1);
console.log('WORKER_JOBS_COPY_TRIM_CONTRACT_PASS');
