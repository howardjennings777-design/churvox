#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const failures = [];
const checks = [];

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function check(name, condition, detail) {
  const passed = Boolean(condition);
  checks.push({ name, passed });
  if (!passed) failures.push(`${name}: ${detail}`);
}

function all(text, tokens) {
  return tokens.every((token) => text.includes(token));
}

const app = read('frontend/src/App.js');
const fresh = read('frontend/src/churvox-fresh/FreshApp.jsx');
const studio = read('frontend/src/churvox-studio/ChurvoxStudioApp.jsx');
const drawer = read('frontend/src/churvox-studio/StudioRecordDrawer.jsx');
const model = read('frontend/src/churvox-studio/studioModel.js');
const data = read('frontend/src/churvox-product/controlBoardData.js');
const login = read('frontend/src/pages/auth/LoginPage.js');
const worker = read('frontend/src/churvox-office-lab/OfficeTeamWorkerRoute.jsx');
const workerCss = read('frontend/src/churvox-office-lab/OfficeTeamWorkerRoute.css');
const fieldLoop = read('backend/churvox_field_loop_patch.py');

check(
  'protected owner and worker routes remain explicit',
  all(app, ['<Route path="/dashboard"', '<Route path="/worker/today"', '<Route path="/worker/jobs"', '<Route path="/worker/messages"', '<WorkerRoute><WorkerOfficeApp /></WorkerRoute>']),
  'Owner and worker workspaces must remain behind their role guards.',
);

check(
  'owner route serves the current Studio',
  fresh.includes('ChurvoxStudioApp') && studio.includes('data-churvox-layout="fresh-studio"') && studio.includes('CHURVOX_FRESH_STUDIO_20260725'),
  'The authenticated owner route must render the current Studio shell, not a retired office layout.',
);

check(
  'Studio has current primary business areas',
  all(model, ['label: "Today"', 'label: "Jobs"', 'label: "Clients"', 'label: "Money"', 'label: "Team"', 'label: "Messages"', 'label: "Command"']),
  'The current owner navigation must expose every main business area.',
);

check(
  'Studio supports desktop and mobile navigation',
  all(studio, ['aria-label="Main Churvox navigation"', 'cvsMobileDock', 'cvsMobileMore', 'Plans & billing', 'Help']),
  'Desktop and phone navigation must both expose core and account areas.',
);

check(
  'Studio uses authenticated live business endpoints without fake records',
  studio.includes('useControlBoardData(Boolean(user))')
    && all(data, ['api.get("/jobs")', 'api.get("/clients")', 'api.get("/team")', 'api.get("/quotes")', 'api.get("/invoices")', 'api.get("/messages")', 'api.get("/ai/actions")'])
    && !studio.includes('Belmont Villas')
    && !data.includes('Belmont Villas'),
  'Owner pages must load the signed-in business endpoints rather than sample records.',
);

check(
  'global create opens real connected records',
  all(studio, ['blankRecord(type, data)', '["job", "Job"', '["client", "Client"', '["quote", "Quote"', '["invoice", "Invoice"', '["worker", "Worker"']),
  'Create must open the real record drawer for each supported record type.',
);

check(
  'record drawer writes to live endpoints',
  all(model, ['api.post("/jobs"', 'api.post("/clients"', 'api.post("/quotes"', 'api.post("/invoices"', 'api.post("/team/workers"', 'api.post("/messages"']),
  'Creating a record must make a real API request rather than browser-only state.',
);

check(
  'owner-controlled money and sending actions remain explicit',
  all(drawer, ['Approve invoice', 'Send invoice', 'Send reminder', 'Mark paid', 'owner_approved: true', 'Prepare invoice']),
  'Quotes, invoices, reminders and payment recording must require an explicit owner click.',
);

check(
  'job lifecycle and invoice handoff remain connected',
  all(drawer, ['Start job', 'Pause', 'Resume', 'Complete & prepare admin', 'create-invoice-draft']),
  'The owner must be able to move work through completion into a draft invoice.',
);

check(
  'login waits for startup auth and opens the role-aware workspace',
  all(login, ['loading: authLoading', 'if (submitting || authLoading) return;', 'Open Churvox', 'postLoginPath', 'if (looksWorker(user, payload)) return "/worker/today"', 'return getDefaultRoute(role) || "/dashboard"']),
  'Login must avoid startup-session races and route owners and workers correctly.',
);

check(
  'worker route blocks non-workers and owner route blocks workers',
  /function WorkerRoute\(\{ children \}\)[\s\S]*if \(!isWorker\)/.test(app) && app.includes('if (user && isWorker) return <Navigate to="/worker/today" replace />;'),
  'Role isolation must remain enforced by the protected routes.',
);

check(
  'worker UI includes the full field lifecycle',
  all(worker, ['"Acknowledge"', '"Start"', '"Pause"', '"Resume"', '"Complete"']) && all(worker, ['return "acknowledge"', 'return "start"', 'return "pause"', 'return "resume"', 'return "complete"']),
  'Workers need real acknowledge, timer and completion actions.',
);

check(
  'worker writes include proof and notes',
  all(worker, ['worker_notes:', 'proof_photo_names:', 'proof_photo_count:', 'Choose at least one photo or add a proof note first.']),
  'Worker evidence must be attached to the live job update.',
);

check(
  'backend transitions and owner review metadata are complete',
  all(fieldLoop, ['"acknowledge": "acknowledged"', '"start": "in_progress"', '"pause": "paused"', '"resume": "in_progress"', '"complete": "completed"', '"needs_owner_review": True', '"proof_photo_count"']),
  'Every worker action must persist a deterministic state and completion review metadata.',
);

check(
  'worker updates are business isolated',
  all(fieldLoop, ['def business_filter', 'find_job(db, user', '"business_id"', '"owner_business_id"']) && fieldLoop.includes('if not job: raise HTTPException(status_code=404'),
  'A worker must never update another business job by guessing an ID.',
);

check(
  'worker field updates fan out to the office loop',
  all(fieldLoop, ['await create_activity', 'await create_owner_notification', 'await create_worker_message', 'await create_command_slip']),
  'Worker updates must reach activity, owner notifications, messages and Command when judgement is required.',
);

check(
  'mobile worker controls retain usable touch targets',
  workerCss.includes('.cvWorkerRouteSteps button') && /\.cvWorkerRouteSteps button\s*\{[\s\S]*min-height:\s*(6[0-9]|7[0-9])px/.test(workerCss),
  'Primary worker actions must remain comfortable on a phone.',
);

for (const item of checks) console.log(`${item.passed ? '✓' : '✗'} ${item.name}`);

if (failures.length) {
  console.error(`\nStudio owner/worker audit failed: ${failures.length} issue(s).`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`\nStudio owner/worker audit passed: ${checks.length}/${checks.length}.`);
