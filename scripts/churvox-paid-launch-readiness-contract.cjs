#!/usr/bin/env node
const fs = require('fs');

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

const backendRoutes = read('backend/churvox_paid_launch_readiness_routes.py');
const backendUsercustomize = read('backend/usercustomize.py');
const rootUsercustomize = read('usercustomize.py');
const workerLogin = read('backend/churvox_worker_login_bridge_patch.py');
const mimic = read('backend/churvox_command_human_mimic_routes.py');
const strictMimic = read('backend/churvox_command_human_mimic_v3_routes.py');
const commandApi = read('frontend/src/churvox-office-lab/OfficeTeamCommandApi.js');
const ownerSite = read('frontend/src/churvox-office-lab/OfficeTeamLabSite.jsx');
const officeApi = read('frontend/src/churvox-office-lab/officeTeamApi.js');
const app = read('frontend/src/App.js');
const plans = read('frontend/src/churvox-office-lab/OfficeTeamPlansScreen.jsx');

const checks = [
  ['paid launch deployment marker exists', app.includes('churvox-paid-launch-readiness-20260713a')],
  ['payroll GET routes exist', backendRoutes.includes('@router.get("/payroll")') && backendRoutes.includes('@router.get("/payroll/summary")')],
  ['payroll is owner-only', backendRoutes.includes('Only owners/admins can review payroll')],
  ['payroll cannot pay or file', backendRoutes.includes('"no_tax_filing": True') && backendRoutes.includes('"no_government_submission": True') && backendRoutes.includes('"no_bank_file": True') && backendRoutes.includes('"no_payment": True')],
  ['backend startup registers paid launch routes', backendUsercustomize.includes('build_paid_launch_readiness_router') && backendUsercustomize.includes('build_command_human_mimic_guard_router')],
  ['root startup matches current mimic stack', rootUsercustomize.includes('build_paid_launch_readiness_router') && rootUsercustomize.includes('build_command_human_mimic_guard_router') && rootUsercustomize.includes('build_command_human_mimic_router')],
  ['worker login retries database reads', workerLogin.includes('for attempt in range(3)') && workerLogin.includes('asyncio.wait_for')],
  ['worker login distinguishes outage from bad credentials', workerLogin.includes('Worker login service is temporarily unavailable') && workerLogin.includes('Worker account not found')],
  ['worker login has concrete FastAPI annotations', workerLogin.includes('worker_login.__annotations__') && workerLogin.includes('"request": Request')],
  ['mimic no longer treats incomplete as complete', mimic.includes('if "incomplete" in words') && mimic.includes('return bool(words & {"complete", "completed", "done", "finished", "closed"})')],
  ['strict mimic excludes unresolved completion from assignment', strictMimic.includes('unresolved_completion = (') && strictMimic.includes('if unresolved_completion:') && strictMimic.includes('"pending completion", "awaiting completion"')],
  ['mimic reports scan health', mimic.includes('"scan_complete": not scan_errors') && mimic.includes('"scan_errors": list(dict.fromkeys(scan_errors))')],
  ['Command requests retry transient backend failures', commandApi.includes('async function fetchWithRetry') && commandApi.includes('response.status >= 500')],
  ['Command maps scan health', commandApi.includes('scanComplete: body?.scan_complete !== false') && commandApi.includes('scanErrors: Array.isArray(body?.scan_errors)')],
  ['owner sees incomplete brain warning', ownerSite.includes('Command check incomplete') && ownerSite.includes('do not treat an empty queue as all clear')],
  ['owner live row reads retry', officeApi.includes('for (let attempt = 1; attempt <= 3; attempt += 1)') && officeApi.includes('response.status >= 500')],
  ['pricing remains locked', plans.includes('price: 39') && plans.includes('price: 89') && plans.includes('price: 149') && plans.includes('price: 299') && plans.includes('price: 99')],
  ['Growth Pack checkout remains wired', plans.includes('Buy Growth Packs') && plans.includes('/billing/create-addon-checkout-session') && plans.includes('command_growth_pack')],
];

let failed = 0;
for (const [name, ok] of checks) {
  if (ok) console.log(`PASS — ${name}`);
  else {
    console.error(`FAIL — ${name}`);
    failed += 1;
  }
}
if (failed) process.exit(1);
console.log(`PASS — ${checks.length} paid-launch readiness contracts`);
