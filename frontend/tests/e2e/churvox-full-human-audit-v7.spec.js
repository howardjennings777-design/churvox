const fs = require('fs');
const path = require('path');
const Module = require('module');

const v6Path = path.join(__dirname, 'churvox-full-human-audit-v6.spec.js');
const v7Path = __filename;

let source = fs.readFileSync(v6Path, 'utf8');

source = source
  .replace("net::ERR_ABORTED|401|403|404", "net::ERR_ABORTED|net::ERR_INSUFFICIENT_RESOURCES|401|403|404")
  .replace("Churvox full human audit v6", "Churvox full human audit v7")
  .replace("worker-employer-full-loop-v6-", "worker-employer-full-loop-v7-")
  .replace(
    `    await locator.click({ trial: true, timeout: 2500 }).catch(async error => {
      await closeTransientUI(page);
      await centerControl(page, locator);
      throw error;
    });`,
    `    try {
      await locator.click({ trial: true, timeout: 2500 });
    } catch (error) {
      await closeTransientUI(page);
      await centerControl(page, locator);
      await locator.click({ trial: true, timeout: 2500 });
    }`
  )
  .replace(
    "test.skip(!email || !password, `Set ${label} email/password env vars.`);",
    "if (!email || !password) throw new Error(`Missing ${label} email/password env vars. This audit must fail instead of skipping because skipped tests prove nothing.`);"
  )
  .replace(
    "test.skip(!MUTATE, 'Set CHURVOX_E2E_MUTATE=1 to create a safe test job and verify the real worker/employer loop.');",
    "if (!MUTATE) throw new Error('Missing CHURVOX_E2E_MUTATE=1. This audit must create the safe test job or fail instead of skipping.');"
  );

source = source.replace(
  `async function findWorker(ownerSession) {
  const endpoints = ['/api/team/workers', '/api/team', '/api/workers', '/api/worker/live-status'];
  for (const endpoint of endpoints) {
    const res = await getJson(ownerSession, `${endpoint}?ts=${Date.now()}`);
    if (!res.ok) continue;
    const workers = listFrom(res.body, ['workers', 'team', 'members']);
    const wanted = workers.find(worker => String(worker.email || worker.worker_email || '').toLowerCase() === WORKER_EMAIL.toLowerCase());
    if (wanted) return wanted;
  }
  throw new Error(`Could not find worker ${WORKER_EMAIL}. Add/invite this worker before running the full loop.`);
}`,
  `async function findWorker(ownerSession) {
  const workerEmail = WORKER_EMAIL.toLowerCase();
  const emailOf = (worker) => String(worker?.email || worker?.worker_email || worker?.user_email || worker?.invite_email || worker?.contact_email || '').toLowerCase();
  const teamEndpoints = ['/api/team/workers', '/api/team', '/api/workers'];

  async function findIn(endpoints) {
    for (const endpoint of endpoints) {
      const res = await getJson(ownerSession, `${endpoint}?ts=${Date.now()}`);
      if (!res.ok) continue;
      const workers = listFrom(res.body, ['workers', 'team', 'members']);
      const wanted = workers.find(worker => emailOf(worker) === workerEmail);
      if (wanted) return wanted;
    }
    return null;
  }

  const existing = await findIn(teamEndpoints);
  if (existing) return existing;

  const payload = {
    name: 'Playwright Audit Worker',
    full_name: 'Playwright Audit Worker',
    email: WORKER_EMAIL,
    worker_email: WORKER_EMAIL,
    role: 'worker',
    access: 'worker',
    status: 'active',
    send_invite: false,
    source: 'playwright_full_human_audit',
  };

  for (const endpoint of ['/api/team/workers', '/api/team', '/api/workers', '/api/team/invite', '/api/workers/invite']) {
    await postJson(ownerSession, endpoint, payload).catch(() => null);
    const created = await findIn(teamEndpoints);
    if (created) return created;
  }

  const liveOnly = await findIn(['/api/worker/live-status']);
  if (liveOnly) {
    throw new Error(`Worker ${WORKER_EMAIL} exists as a login but is not attached to this owner team. Add/invite that worker from Team, then rerun.`);
  }

  throw new Error(`Could not find or create worker ${WORKER_EMAIL} in this owner team.`);
}`
);

source = source.replace(
  "assigned_worker_id: workerId, worker_instructions: bossToken",
  "assigned_worker_id: workerId, worker_id: workerId, assigned_worker_email: WORKER_EMAIL, worker_email: WORKER_EMAIL, worker_instructions: bossToken"
);

const compiled = new Module(v7Path, module.parent || module);
compiled.filename = v7Path;
compiled.paths = Module._nodeModulePaths(__dirname);
compiled._compile(source, v7Path);
