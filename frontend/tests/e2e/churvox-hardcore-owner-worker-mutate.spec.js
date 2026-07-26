const { test, expect } = require('@playwright/test');

const CONSENT = 'I_UNDERSTAND_LIVE_DATA_WILL_CHANGE';
const OWNER_EMAIL = process.env.CHURVOX_OWNER_EMAIL || process.env.CHURVOX_E2E_OWNER_EMAIL || process.env.CHURVOX_E2E_EMAIL || '';
const OWNER_PASSWORD = process.env.CHURVOX_OWNER_PASSWORD || process.env.CHURVOX_E2E_OWNER_PASSWORD || process.env.CHURVOX_E2E_PASSWORD || '';
const WORKER_EMAIL = process.env.CHURVOX_WORKER_EMAIL || process.env.CHURVOX_E2E_WORKER_EMAIL || '';
const WORKER_PASSWORD = process.env.CHURVOX_WORKER_PASSWORD || process.env.CHURVOX_E2E_WORKER_PASSWORD || '';
const API_BASE = (process.env.PLAYWRIGHT_API_BASE || 'https://grassley-backend.onrender.com').replace(/\/+$/, '');

function apiUrl(path) {
  return `${API_BASE}${path.startsWith('/api') ? path : `/api${path}`}`;
}

function stamp() {
  return new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
}

function idOf(value) {
  if (!value) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return String(value.id || value._id || value.$oid || value.oid || value.job_id || value.worker_id || value.user_id || value.team_member_id || '');
}

function tokenFrom(data = {}) {
  return data?.token || data?.access_token || data?.auth_token || data?.jwt || data?.accessToken
    || data?.user?.token || data?.user?.access_token || data?.user?.accessToken
    || data?.data?.token || data?.data?.access_token || data?.data?.user?.token || '';
}

function accountEmail(data = {}) {
  return String(data?.email || data?.user?.email || data?.data?.email || data?.data?.user?.email || '').trim().toLowerCase();
}

function listFrom(payload, keys = []) {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  for (const key of keys) if (Array.isArray(data?.[key])) return data[key];
  for (const key of ['items', 'records', 'results', 'jobs', 'workers', 'team', 'members', 'messages', 'notifications', 'slips', 'audit', 'data']) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

function contains(value, token) {
  return JSON.stringify(value || {}).toLowerCase().includes(String(token || '').toLowerCase());
}

function statusOf(job = {}) {
  return String(job.status || job.job_status || job.workflow_status || job.state || '').trim().toLowerCase();
}

function eventKind(row = {}) {
  return String(row.kind || row.type || row.event_type || '').trim().toLowerCase();
}

function eventText(row = {}) {
  return String(row.message || row.body || row.detail || row.summary || row.note || '').replace(/\s+/g, ' ').trim();
}

function eventJobId(row = {}) {
  return String(row.job_id || row.source_id || row.record_id || '').trim();
}

function completionRows(rows, titleToken) {
  return rows.filter((row) => contains(row, titleToken) && /job_complete|job_completed|finished the job|complete/i.test(JSON.stringify(row)));
}

async function loginApi(page, email, password, label) {
  if (!email || !password) throw new Error(`Missing ${label} credentials. Hardcore mutation fails rather than skips.`);
  const paths = label === 'worker' ? ['/api/auth/login', '/api/worker/auth/login'] : ['/api/auth/login'];
  const attempts = [];
  for (const path of paths) {
    const response = await page.request.post(apiUrl(path), { data: { email, password }, timeout: 30_000 });
    const body = await response.json().catch(async () => ({ text: await response.text().catch(() => '') }));
    attempts.push({ path, status: response.status(), body: JSON.stringify(body).slice(0, 180) });
    if (!response.ok() || body?.success === false) continue;
    const token = tokenFrom(body);
    if (!token) continue;
    const returnedEmail = accountEmail(body);
    if (returnedEmail && returnedEmail !== email.toLowerCase()) throw new Error(`${label} login returned a different account.`);
    return token;
  }
  throw new Error(`${label} login failed: ${JSON.stringify(attempts)}`);
}

async function json(page, method, path, token, data) {
  const options = {
    headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    timeout: 30_000,
    ...(data === undefined ? {} : { data }),
  };
  const response = await page.request[method](apiUrl(path), options);
  const text = await response.text();
  let body = null;
  try { body = JSON.parse(text); } catch {}
  return { ok: response.ok() && body?.success !== false, status: response.status(), body, text };
}

async function firstWorking(page, method, paths, token, data, label) {
  const attempts = [];
  for (const path of paths) {
    const result = await json(page, method, path, token, data);
    attempts.push({ path, status: result.status, body: result.text.slice(0, 180) });
    if (result.ok) return { path, ...result };
  }
  throw new Error(`${label} failed: ${JSON.stringify(attempts)}`);
}

async function findWorker(page, ownerToken) {
  const result = await firstWorking(page, 'get', ['/api/team/workers', '/api/team', '/api/workers'], ownerToken, undefined, 'owner team lookup');
  const worker = listFrom(result.body, ['workers', 'team', 'members']).find((row) => String(row.email || row.worker_email || row.user_email || '').toLowerCase() === WORKER_EMAIL.toLowerCase());
  expect(worker, `Configured worker ${WORKER_EMAIL} is not linked to the owner team`).toBeTruthy();
  return worker;
}

async function getJob(page, token, jobId, titleToken = '') {
  for (const path of [`/api/jobs/${encodeURIComponent(jobId)}`, `/api/worker/jobs/${encodeURIComponent(jobId)}`]) {
    const direct = await json(page, 'get', path, token);
    if (!direct.ok) continue;
    const candidate = direct.body?.job || direct.body?.data?.job || direct.body?.data || direct.body;
    if (idOf(candidate) === String(jobId) || contains(candidate, titleToken || jobId)) return candidate;
  }
  for (const path of [`/api/worker/jobs?ts=${Date.now()}`, `/api/jobs?ts=${Date.now()}`]) {
    const result = await json(page, 'get', path, token);
    if (!result.ok) continue;
    const candidate = listFrom(result.body, ['jobs']).find((row) => idOf(row) === String(jobId) || contains(row, titleToken));
    if (candidate) return candidate;
  }
  return null;
}

async function waitForJob(page, token, jobId, titleToken, predicate, label) {
  let latest = null;
  await expect.poll(async () => {
    latest = await getJob(page, token, jobId, titleToken);
    return Boolean(latest && predicate(latest));
  }, { message: label, timeout: 25_000, intervals: [500, 900, 1500, 2500] }).toBe(true);
  return latest;
}

async function rowsAt(page, token, path) {
  const result = await json(page, 'get', `${path}${path.includes('?') ? '&' : '?'}ts=${Date.now()}`, token);
  return result.ok ? listFrom(result.body) : [];
}

async function corpus(page, token, paths) {
  const rows = [];
  for (const path of paths) rows.push(...await rowsAt(page, token, path));
  return rows;
}

async function cleanupJob(page, ownerToken, jobId, cleanupToken) {
  const attempts = [
    ['delete', `/api/jobs/${encodeURIComponent(jobId)}`, undefined],
    ['post', `/api/jobs/${encodeURIComponent(jobId)}/archive`, { archived: true, archive_reason: cleanupToken }],
    ['patch', `/api/jobs/${encodeURIComponent(jobId)}`, { archived: true, status: 'archived', archive_reason: cleanupToken }],
  ];
  for (const [method, path, data] of attempts) {
    const result = await json(page, method, path, ownerToken, data);
    if (result.ok || result.status === 404) return { ok: true, method, path, status: result.status };
  }
  return { ok: false, attempts: attempts.map(([, path]) => path) };
}

test.describe('Hardcore live boss-worker mutation loop', () => {
  test.setTimeout(360_000);

  test('Acknowledge Start Pause Resume Complete — worker reaches boss once per channel and boss send-back reaches worker', async ({ browser }) => {
    if (process.env.CHURVOX_HARDCORE_MUTATE !== CONSENT) {
      throw new Error(`Set CHURVOX_HARDCORE_MUTATE=${CONSENT} to run this live-data test.`);
    }

    const context = await browser.newContext();
    const page = await context.newPage();
    const ownerToken = await loginApi(page, OWNER_EMAIL, OWNER_PASSWORD, 'owner');
    const workerToken = await loginApi(page, WORKER_EMAIL, WORKER_PASSWORD, 'worker');
    const worker = await findWorker(page, ownerToken);
    const workerId = idOf(worker);
    expect(workerId, 'Configured worker has no stable id').toBeTruthy();

    const run = stamp();
    const titleToken = `HARDCORE boss-worker ${run}`;
    const instructionToken = `Boss instruction ${run}: check gate, send proof, report any extra work.`;
    const issueToken = `Worker issue ${run}: extra work needs owner decision.`;
    const cleanupToken = `HARDCORE cleanup ${run}`;
    let jobId = '';
    const cleanupFailures = [];

    try {
      const created = await json(page, 'post', '/api/jobs', ownerToken, {
        title: titleToken,
        job_title: titleToken,
        job_type: 'other',
        client_name: `Hardcore Test Client ${run}`,
        customer_name: `Hardcore Test Client ${run}`,
        address: '1 Test Street, Wellington',
        scheduled_date: new Date().toISOString(),
        scheduled_time: '09:00',
        estimated_duration: 60,
        price: 0,
        assigned_worker_id: workerId,
        worker_id: workerId,
        worker_email: WORKER_EMAIL,
        worker_instructions: instructionToken,
        notes: instructionToken,
        source: 'hardcore-owner-worker-test',
      });
      expect(created.ok, `Owner could not create assigned test job: ${created.status} ${created.text.slice(0, 500)}`).toBeTruthy();
      const createdJob = created.body?.job || created.body?.data?.job || created.body?.data || created.body;
      jobId = idOf(createdJob);
      if (!jobId) {
        const found = await waitForJob(page, ownerToken, '', titleToken, (job) => contains(job, titleToken), 'owner sees created job');
        jobId = idOf(found);
      }
      expect(jobId, 'Created test job has no id').toBeTruthy();

      const ownerCreated = await waitForJob(page, ownerToken, jobId, titleToken, (job) => contains(job, instructionToken), 'owner sees boss instructions on created job');
      expect(contains(ownerCreated, instructionToken), 'owner sees boss instruction').toBeTruthy();
      const workerCreated = await waitForJob(page, workerToken, jobId, titleToken, (job) => contains(job, instructionToken), 'worker sees assigned job and boss instruction');
      expect(contains(workerCreated, instructionToken), 'worker sees boss instruction').toBeTruthy();

      for (const [label, endpoint, expected] of [
        ['Acknowledge', 'acknowledge', /acknowledged|acknowledge/],
        ['Start', 'start', /in_progress|started|start/],
        ['Pause', 'pause', /paused|pause/],
        ['Resume', 'resume', /in_progress|resumed|resume/],
      ]) {
        const note = `${label} ${run}`;
        const result = await json(page, 'post', `/api/worker/jobs/${encodeURIComponent(jobId)}/${endpoint}`, workerToken, { worker_notes: note, note, source: 'hardcore-owner-worker-test' });
        expect(result.ok, `${label} button endpoint failed: ${result.status} ${result.text.slice(0, 500)}`).toBeTruthy();
        const ownerJob = await waitForJob(page, ownerToken, jobId, titleToken, (job) => expected.test(`${statusOf(job)} ${job.worker_last_action || ''}`), `owner sees ${label}`);
        expect(`${statusOf(ownerJob)} ${ownerJob.worker_last_action || ''}`, `owner sees ${label}`).toMatch(expected);
        const workerJob = await waitForJob(page, workerToken, jobId, titleToken, (job) => expected.test(`${statusOf(job)} ${job.worker_last_action || ''}`), `worker sees ${label}`);
        expect(`${statusOf(workerJob)} ${workerJob.worker_last_action || ''}`, `worker sees ${label}`).toMatch(expected);
      }

      const issue = await json(page, 'post', '/api/worker/field-slip', workerToken, {
        type: 'worker_problem', kind: 'worker_problem', job_id: jobId, job_title: titleToken,
        client_name: `Hardcore Test Client ${run}`, text: issueToken, note: issueToken, summary: issueToken,
        problem_key: 'extra_work', source: 'hardcore-owner-worker-test',
      });
      expect(issue.ok, `Worker issue did not reach office backend: ${issue.status} ${issue.text.slice(0, 500)}`).toBeTruthy();
      await expect.poll(async () => {
        const ownerRows = await corpus(page, ownerToken, ['/api/notifications?limit=120', '/api/command/slips', '/api/command/audit', '/api/messages?limit=120']);
        return ownerRows.some((row) => contains(row, issueToken));
      }, { message: 'owner sees worker issue in Command/notifications/messages', timeout: 25_000, intervals: [700, 1200, 2200] }).toBe(true);

      const completeNote = `Complete ${run} with proof`;
      const completed = await json(page, 'post', `/api/worker/jobs/${encodeURIComponent(jobId)}/complete`, workerToken, {
        worker_notes: completeNote,
        note: completeNote,
        proof_photo_names: [`hardcore-${run}.jpg`],
        proof_photo_count: 1,
        source: 'hardcore-owner-worker-test',
      });
      expect(completed.ok, `Complete button endpoint failed: ${completed.status} ${completed.text.slice(0, 500)}`).toBeTruthy();

      const ownerComplete = await waitForJob(page, ownerToken, jobId, titleToken, (job) => /complete/.test(statusOf(job)) && Number(job.proof_photo_count || 0) === 1, 'owner sees Complete and proof');
      expect(statusOf(ownerComplete), 'owner sees Complete').toMatch(/complete/);
      expect(Number(ownerComplete.proof_photo_count || 0), 'owner sees proof count').toBe(1);
      expect(ownerComplete.needs_owner_review, 'completion returns to owner review').toBeTruthy();
      const workerComplete = await waitForJob(page, workerToken, jobId, titleToken, (job) => /complete/.test(statusOf(job)), 'worker sees Complete');
      expect(statusOf(workerComplete), 'worker sees Complete').toMatch(/complete/);

      await expect.poll(async () => completionRows(await rowsAt(page, ownerToken, '/api/notifications?limit=160'), titleToken).length,
        { message: 'exactly one completion notification reaches the owner', timeout: 20_000, intervals: [700, 1300, 2400] }).toBe(1);
      await expect.poll(async () => completionRows(await rowsAt(page, ownerToken, '/api/messages?limit=160'), titleToken).length,
        { message: 'exactly one completion message reaches the owner', timeout: 20_000, intervals: [700, 1300, 2400] }).toBe(1);

      const notification = completionRows(await rowsAt(page, ownerToken, '/api/notifications?limit=160'), titleToken)[0];
      const message = completionRows(await rowsAt(page, ownerToken, '/api/messages?limit=160'), titleToken)[0];
      expect(eventJobId(notification), 'notification is linked to the completed job').toBe(jobId);
      expect(eventJobId(message), 'message is linked to the completed job').toBe(jobId);
      expect(eventKind(notification), 'notification reports completion').toMatch(/job_complete|job_completed/);
      expect(eventKind(message), 'message reports completion').toMatch(/job_complete|job_completed/);
      expect(eventText(notification), 'notification and message carry the same worker completion note').toBe(completeNote);
      expect(eventText(message), 'notification and message carry the same worker completion note').toBe(completeNote);

      const sendBackNote = `Boss sent back ${run}: confirm the proof note.`;
      const sendBack = await firstWorking(page, 'post', [
        `/api/worker/jobs/${encodeURIComponent(jobId)}/send-back`,
        `/api/jobs/${encodeURIComponent(jobId)}/send-back`,
      ], ownerToken, {
        owner_note: sendBackNote,
        boss_note: sendBackNote,
        send_back_note: sendBackNote,
        work_review_status: 'sent_back',
        review_status: 'sent_back',
        owner_review_status: 'sent_back',
        worker_action_required: true,
        status: 'assigned',
      }, 'owner send-back');
      expect(sendBack.ok, 'Owner send-back failed').toBeTruthy();
      const workerSentBack = await waitForJob(page, workerToken, jobId, titleToken, (job) => contains(job, sendBackNote), 'worker sees boss send-back');
      expect(contains(workerSentBack, sendBackNote), 'worker sees boss send-back').toBeTruthy();
    } finally {
      if (jobId) {
        const cleanup = await cleanupJob(page, ownerToken, jobId, cleanupToken);
        if (!cleanup.ok) cleanupFailures.push(cleanup);
      }
      await context.close();
    }

    expect(cleanupFailures, `Live test cleanup failed: ${JSON.stringify(cleanupFailures)}`).toEqual([]);
  });
});
