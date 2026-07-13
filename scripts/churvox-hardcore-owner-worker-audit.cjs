#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const failures = [];
const warnings = [];
const checks = [];

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function check(name, ok, detail, severity = 'fail') {
  const passed = Boolean(ok);
  checks.push({ name, passed, severity });
  if (!passed) (severity === 'warn' ? warnings : failures).push(`${name}: ${detail}`);
}

function all(text, needles) {
  return needles.every((needle) => text.includes(needle));
}

const app = read('frontend/src/App.js');
const worker = read('frontend/src/churvox-office-lab/OfficeTeamWorkerRoute.jsx');
const workerCss = read('frontend/src/churvox-office-lab/OfficeTeamWorkerRoute.css');
const liveRows = read('frontend/src/churvox-office-lab/OfficeTeamLiveRows.js');
const officeApi = read('frontend/src/churvox-office-lab/officeTeamApi.js');
const commandApi = read('frontend/src/churvox-office-lab/OfficeTeamCommandApi.js');
const ownerSite = read('frontend/src/churvox-office-lab/OfficeTeamLabSite.jsx');
const fieldLoop = read('backend/churvox_field_loop_patch.py');
const strict = read('backend/churvox_command_human_mimic_v3_routes.py');
const liveReadonly = read('frontend/tests/e2e/churvox-live-owner-worker-readonly.spec.js');
const messageLoop = read('frontend/tests/e2e/churvox-worker-message-flow.spec.js');
const hardcoreVisual = read('frontend/tests/e2e/churvox-hardcore-owner-worker-visual.spec.js');
const hardcoreMutate = read('frontend/tests/e2e/churvox-hardcore-owner-worker-mutate.spec.js');
const runner = read('scripts/churvox-hardcore-owner-worker.cjs');
const liveLaunchV2 = read('frontend/tests/e2e/churvox-live-launch-human-audit-v2.spec.js');
const currentHumanFlow = read('frontend/tests/e2e/churvox-current-human-owner-worker-flow.spec.js');
const launchV2Workflow = read('.github/workflows/churvox-live-human-launch-audit-v2.yml');
const rootPackage = JSON.parse(read('package.json'));

check(
  'active owner and worker routes are explicit',
  all(app, [
    '<Route path="/dashboard"',
    '<Route path="/worker/today"',
    '<Route path="/worker/jobs"',
    '<Route path="/worker/messages"',
    '<Route path="/worker/help"',
    '<WorkerRoute><WorkerOfficeApp /></WorkerRoute>',
  ]),
  'The real owner and field routes must be mounted through protected routes',
);

check(
  'worker UI route rejects non-worker accounts',
  /function WorkerRoute\(\{ children \}\)[\s\S]*\bisWorker\b[\s\S]*if \(!isWorker\)/.test(app),
  'Being signed in is not enough; owner, payroll and client accounts must not enter Worker View',
);

check(
  'worker account is redirected away from owner dashboard',
  app.includes('if (user && isWorker) return <Navigate to="/worker/today" replace />;'),
  'A worker must never land in owner pages or billing/admin controls',
);

check(
  'active worker screen understands its route',
  /useLocation|location\.pathname|window\.location\.pathname/.test(worker),
  '/worker/today, /worker/jobs, /worker/messages and /worker/help must not silently render an identical screen',
);

check(
  'worker status flow includes the full field lifecycle',
  all(worker, ['"Acknowledge"', '"Start"', '"Pause"', '"Resume"', '"Complete"'])
    && all(worker, ['return "acknowledge"', 'return "start"', 'return "pause"', 'return "resume"', 'return "complete"']),
  'A paused job needs a real Resume action rather than forcing Start or Complete',
);

check(
  'worker action wording is human and grammatically safe',
  !worker.includes('${step.toLowerCase()}ed')
    && /actionCopy|stepCopy|workerActionText|statusCopy/.test(worker),
  'Generated strings such as acknowledgeed, pauseed and completeed are not acceptable owner messages',
);

check(
  'direct worker status writes use the real job endpoint',
  all(worker, [
    'post(`/worker/jobs/${encodeURIComponent(jobId)}/${endpoint}`',
    'worker_notes:',
    'proof_photo_names:',
    'proof_photo_count:',
  ]),
  'Buttons must update the actual assigned job rather than only changing browser state',
);

check(
  'worker completion does not create a duplicate field slip',
  !/if \(step === "Complete"\) await sendFieldSlip\(/.test(worker),
  'The backend status endpoint already records the completion event; a second field-slip POST duplicates messages and Command work',
);

check(
  'backend status transitions are complete and deterministic',
  all(fieldLoop, [
    '"acknowledge": "acknowledged"',
    '"start": "in_progress"',
    '"pause": "paused"',
    '"resume": "in_progress"',
    '"complete": "completed"',
    'worker_last_action',
    'worker_last_action_at',
  ]),
  'Every field action must leave a clear live status and audit timestamp',
);

check(
  'completion returns to owner with proof metadata',
  all(fieldLoop, [
    '"needs_owner_review": True',
    '"proof_photo_names"',
    '"proof_photo_count"',
    '"completed_at"',
  ]),
  'Completion is not finished office work until the owner can review the worker evidence',
);

check(
  'worker writes are business isolated',
  all(fieldLoop, ['def business_filter', 'find_job(db, user', '"business_id"', '"owner_business_id"'])
    && fieldLoop.includes('if not job: raise HTTPException(status_code=404'),
  'A worker must never update a job from another business by guessing an ID',
);

check(
  'worker write endpoints enforce worker role',
  (fieldLoop.match(/if not is_field\(user\): raise HTTPException\(status_code=403/g) || []).length >= 3,
  'Field-slip, message and job-action endpoints must all reject non-worker identities',
);

check(
  'worker update fans out to both sides of the office loop',
  all(fieldLoop, [
    'await create_activity',
    'await create_owner_notification',
    'await create_worker_message',
    'await create_command_slip',
  ]),
  'A field update needs an owner-visible event, a worker-visible message record and Command only when judgement is required',
);

check(
  'routine updates and judgement calls route differently',
  all(fieldLoop, [
    'if kind == "worker_message": return "/dashboard#messages"',
    'if needs_owner_review(kind): return "/dashboard#command"',
    'return "/dashboard#jobs"',
  ]),
  'Messages belong in Messages, exceptions in Command and routine status in Jobs',
);

check(
  'Command is not polluted by every worker tap',
  fieldLoop.includes('if not needs_owner_review(kind): return None')
    && fieldLoop.includes('"worker_problem"')
    && fieldLoop.includes('"job_completed"')
    && !/return kind in \{[^}]*job_start[^}]*\}/s.test(fieldLoop),
  'Acknowledge, start and pause should notify the office without creating owner decisions',
);

check(
  'active worker payment path cannot charge a card',
  all(worker, [
    'createBackendWorkerPaymentRequest',
    'Worker cannot charge a card without an approved link',
  ])
    && (worker.includes('No card is charged inside Worker View') || worker.includes('Worker View never charges cards'))
    && !/payment-intent|StripeTerminal|processPayment|collectPaymentMethod/.test(worker),
  'Worker View may request or open an approved invoice link but must not create/process a direct charge',
);

check(
  'payment truth waits for provider confirmation',
  (worker.includes('Payment happens through an approved secure invoice link') || worker.includes('Use an approved invoice link'))
    && worker.includes('only mark paid after the real provider confirms it'),
  'Opening or copying a link is not proof that payment succeeded',
);

check(
  'worker proof requires actual evidence or a note',
  all(worker, [
    'if (!proofNames.length && !String(note || "").trim())',
    'Choose at least one photo or add a proof note first.',
    'sendFieldSlip("job_proof"',
  ]),
  'An empty proof tap must not create false completion evidence',
);

check(
  'live owner and worker screens never inject sample records',
  liveRows.includes('const allowFallback = isOfficeTeamPreviewRoute()')
    && (
      liveRows.includes('source: rows.length ? "live" : allowFallback ? "preview" : "empty"')
      || liveRows.includes('source: nextRows.length ? "live" : allowFallback ? "preview" : "empty"')
    )
    && liveRows.includes('rows: [],')
    && officeApi.includes('worker: ["/api/worker/jobs"]')
    && officeApi.includes('staff: ["/api/team/workers", "/api/team", "/api/workers"]'),
  'Fallback rows are acceptable only in the explicit lab routes',
);

check(
  'owner Command uses confirmed backend decisions only',
  all(ownerSite, [
    'if (isOwnerApp) return backendDecisions;',
    'item?.raw?.source !== "backend_command_slip"',
    'No fallback or browser-only decisions are being shown',
  ]),
  'Worker exceptions must not be mixed with starter cards or browser-only queues in the owner app',
);

check(
  'Command reasoning exposes evidence and missing facts',
  all(commandApi, [
    'Evidence used:',
    'Confidence:',
    'Owner must check:',
    'Owner question:',
    'no_auto_send: true',
    'no_auto_charge: true',
  ]),
  'Brainy means evidence, uncertainty and safe actions—not confident invented copy',
);

check(
  'strict reasoning blocks guessing and stale evidence',
  all(strict, [
    'history is reference, never a charge',
    'At least three visits required for inferred cycle',
    'exact time never inferred',
    'Invoice total not substituted for balance',
    'likely access codes redacted',
    'evidence_fingerprint',
  ]),
  'The office engine must reject weak patterns, stale records and sensitive-data guesses',
);

check(
  'live read-only proof checks the actual linked worker',
  all(currentHumanFlow, [
    "const worker = await findWorker(request, ownerToken);",
    "await seedVerifiedSession(ownerPage, ownerToken, OWNER_EMAIL, 'owner');",
    "await seedVerifiedSession(workerPage, workerToken, WORKER_EMAIL, 'worker');",
    "['/api/team/workers', '/api/team', '/api/workers']",
    "expect(emailFrom(body), `${role} /api/auth/me returned wrong account`).toBe(email);",
  ])
    && launchV2Workflow.includes('Discover linked active worker using masked shared password'),
  'The current live flow must prove the configured owner and worker are linked and authenticated',
);

check(
  'existing mutation test covers both directions',
  all(messageLoop, [
    'boss to worker and worker to boss messages arrive',
    'worker receives boss instructions',
    'boss receives worker help message',
    'boss receives worker completion message',
    'worker receives boss sent-back message',
  ]),
  'The old message test must still prove boss→worker and worker→boss',
);

check(
  'hardcore live mutation has guaranteed cleanup',
  all(hardcoreMutate, [
    'try {',
    'finally {',
    'cleanupJob',
    'cleanupFailures',
    'expect(cleanupFailures',
  ]),
  'A hardcore live test may create a uniquely named job only if it also proves cleanup',
);

check(
  'hardcore mutation proves each status on both accounts',
  all(hardcoreMutate, [
    'Acknowledge',
    'Start',
    'Pause',
    'Resume',
    'Complete',
    'owner sees',
    'worker sees',
    'exactly one completion',
  ]),
  'A button click is not enough; both owner and worker must read the resulting state',
);

check(
  'hardcore visual audit measures density rather than taking screenshots only',
  all(hardcoreVisual, [
    'boxedElements',
    'longParagraphs',
    'duplicateBlocks',
    'nestedBoxDepth',
    'oversizedEmptyBoxes',
    'touchProblems',
    'horizontalOverflow',
  ]),
  'Visual QA must detect box soup, walls of copy, repetition, empty panels, tiny taps and overflow',
);

check(
  'hardcore visual audit covers owner and worker on desktop and phone',
  all(liveLaunchV2, [
    "['today', /today|owner command floor|churvox/i]",
    "['command', /command|approval|owner/i]",
    "['work', /jobs|work/i]",
    "['/worker/today'",
    "['/worker/jobs'",
    "['/worker/messages'",
    "['/worker/help'",
  ])
    && all(launchV2Workflow, ['--project=desktop-chromium', '--project=mobile-chromium']),
  'The current live audit must judge both roles in both form factors',
);

check(
  'worker mobile design removes explanatory desktop furniture',
  /@media \(max-width: 900px\)[\s\S]*\.cvWorkerRouteDesk[\s\S]*display:\s*none/.test(workerCss)
    && /@media \(max-width: 520px\)[\s\S]*\.cvWorkerHero[\s\S]*(display:\s*none|padding:\s*1[0-4]px)/.test(workerCss),
  'A phone worker should see the job and actions—not a large sales-style hero plus an explanatory desk',
);

check(
  'worker controls retain usable touch targets',
  workerCss.includes('.cvWorkerRouteSteps button')
    && /\.cvWorkerRouteSteps button\s*\{[\s\S]*min-height:\s*(6[0-9]|7[0-9])px/.test(workerCss)
    && /\.cvWorkerPaymentActions button[\s\S]*padding:\s*12px/.test(workerCss),
  'Primary worker actions need comfortable phone targets',
);

check(
  'hardcore runner requires real credentials and explicit mutation consent',
  all(runner, [
    'CHURVOX_OWNER_EMAIL',
    'CHURVOX_OWNER_PASSWORD',
    'CHURVOX_WORKER_EMAIL',
    'CHURVOX_WORKER_PASSWORD',
    'CHURVOX_HARDCORE_MUTATE',
    'I_UNDERSTAND_LIVE_DATA_WILL_CHANGE',
  ]),
  'The read-only gauntlet must fail without credentials and live mutation must require an unmistakable opt-in',
);

const scripts = rootPackage.scripts || {};
check(
  'root exposes one-command hardcore gates',
  scripts['test:hardcore:logic'] === 'node scripts/churvox-hardcore-owner-worker-audit-runner.cjs'
    && scripts['test:hardcore:live'] === 'node scripts/churvox-hardcore-owner-worker.cjs'
    && scripts['test:hardcore:mutate'] === 'CHURVOX_HARDCORE_MUTATE=I_UNDERSTAND_LIVE_DATA_WILL_CHANGE node scripts/churvox-hardcore-owner-worker.cjs'
    && scripts['test:hardcore:all'] === 'npm run test:hardcore:logic && npm run test:hardcore:live',
  'The user should not need to remember a pile of separate commands',
);

for (const item of checks) {
  console.log(`${item.passed ? '✓' : item.severity === 'warn' ? '⚠' : '✗'} ${item.name}`);
}

if (warnings.length) {
  console.warn(`\nHardcore audit warnings: ${warnings.length}`);
  for (const warning of warnings) console.warn(`- ${warning}`);
}

if (failures.length) {
  console.error(`\nHardcore owner/worker audit failed: ${failures.length} real issue(s).`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`\nHardcore owner/worker audit passed: ${checks.length} logic, safety, collaboration and visual contracts checked.`);
