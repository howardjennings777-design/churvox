const fs = require('fs');
const backend = fs.readFileSync('backend/churvox_worker_jobs_read_patch.py', 'utf8');
const api = fs.readFileSync('frontend/src/churvox-office-lab/officeTeamApi.js', 'utf8');
const route = fs.readFileSync('frontend/src/churvox-office-lab/OfficeTeamWorkerRoute.jsx', 'utf8');
const smoke = fs.readFileSync('scripts/churvox-paid-launch-live-smoke-v2.cjs', 'utf8');
const marker = fs.readFileSync('frontend/public/churvox-paid-launch-build.json', 'utf8');
const gate = fs.readFileSync('.github/workflows/churvox-paid-launch-final-gate-v2.yml', 'utf8');
const checks = [
  ['v15 build marker', marker.includes('churvox-final-pass-v15-20260713')],
  ['worker API version', backend.includes('worker-jobs-active-only-v5-20260713')],
  ['backend excludes inactive assignments', backend.includes('def _inactive(job):') && backend.includes('_assigned(job, current_user) and not _inactive(job)')],
  ['frontend filters inactive assignments', api.includes('function workerRecordActive(item = {})') && api.includes('sourceRecords.filter(workerRecordActive)')],
  ['worker queue defaults to eight rows', route.includes('rows.slice(0, 8)') && route.includes('Show all ${rows.length} jobs')],
  ['desktop queue is summary not duplicate list', route.includes('active job{rows.length === 1 ? "" : "s"} assigned') && !route.includes('<aside className="cvWorkerRouteDesk"><span>Office link</span><h2>{view.title}</h2><p>{view.copy}</p><strong>{hasWork ? live.label : "No live assigned work found"}</strong><section><h3>Worker queue</h3>{hasWork ? rows.map')],
  ['safe Command timeout retry is bounded', smoke.includes('attempt <= 4') && smoke.includes('/timed out safely/i') && smoke.includes('attempt === 4')],
  ['persistent Command scan failure still blocks', smoke.includes('assert(scan?.response?.status === 200 && scan?.body?.success === true')],
  ['marker records all v15 protections', marker.includes('active-worker-jobs-only') && marker.includes('worker-job-queue-bounded-with-show-all') && marker.includes('bounded-command-scan-safe-timeout-retries')],
  ['full gate runs v15 contract', gate.includes('churvox-final-pass-v15-contract.cjs') && gate.includes('backend/churvox_worker_jobs_read_patch.py')],
];
let failed = false;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failed = true; }
if (failed) process.exit(1);
console.log('CHURVOX_FINAL_PASS_V15_CONTRACT_PASS');
