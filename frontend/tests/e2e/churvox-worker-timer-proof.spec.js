const { test, expect } = require('@playwright/test');

const API_BASE = (process.env.CHURVOX_API_BASE || process.env.REACT_APP_BACKEND_URL || process.env.VITE_BACKEND_URL || 'https://grassley-backend.onrender.com').replace(/\/$/, '');
const OWNER_EMAIL = process.env.CHURVOX_E2E_EMAIL || '';
const OWNER_PASS = process.env.CHURVOX_E2E_PASSWORD || '';

const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
const WORKER_NAME = `Worker Timer Proof ${stamp}`;
const WORKER_EMAIL = `worker.timer.proof.${stamp}@example.com`;
const WORKER_PASS = `Churvox${stamp}!`;
const JOB_TITLE = `Worker Timer Proof Job ${stamp}`;

const api = (path) => `${API_BASE}/api${path}`;

function safeJson(text) {
  try { return JSON.parse(text || '{}'); } catch { return {}; }
}

function normalizeId(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') return normalizeId(value.$oid || value.oid || value.id || value._id || value.worker_id || value.job_id || '');
  const text = String(value || '');
  return text === '[object Object]' ? '' : text;
}

function createdId(payload) {
  const data = payload?.data || payload || {};
  const item = data.job || data.worker || data.item || data.record || data;
  return normalizeId(data.id || data._id || item.id || item._id || item.job_id || item.worker_id || payload.id || payload._id);
}

function statusOf(job) {
  return String(job?.status || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
}

async function readJson(response) {
  const text = await response.text().catch(() => '{}');
  return { text, json: safeJson(text) };
}

async function backendLogin(request, email, password, label) {
  const res = await request.post(api('/auth/login'), { data: { email, password } });
  const { text, json } = await readJson(res);

  console.log(`${label}_LOGIN_STATUS=` + res.status());
  console.log(`${label}_LOGIN_EMAIL=` + (json.email || ''));
  if (res.status() >= 400) console.log(`${label}_LOGIN_BODY=` + text);

  expect(res.status()).toBeLessThan(400);
  expect(String(json.email || '').toLowerCase()).toBe(String(email || '').toLowerCase());
  return json;
}

async function getJob(request, jobId, label) {
  const res = await request.get(api(`/jobs/${encodeURIComponent(jobId)}`));
  const { text, json } = await readJson(res);
  const job = json.job || json.data?.job || json.data || json;
  console.log(`${label}_GET_JOB_STATUS=` + res.status());
  console.log(`${label}_JOB_STATUS=` + statusOf(job));
  if (res.status() >= 400) console.log(`${label}_GET_JOB_BODY=` + text);
  expect(res.status()).toBeLessThan(400);
  return job;
}

async function postAction(request, jobId, endpoint, label, data = {}) {
  const res = await request.post(api(`/jobs/${encodeURIComponent(jobId)}${endpoint}`), { data });
  const { text } = await readJson(res);
  console.log(`${label}_STATUS=` + res.status());
  if (res.status() >= 400) console.log(`${label}_BODY=` + text);
  expect(res.status()).toBeLessThan(400);
}

test('worker timer start pause resume complete proof', async ({ page }) => {
  const request = page.request;
  console.log('WORKER_TIMER_API_BASE=' + API_BASE);
  console.log('WORKER_TIMER_WORKER_EMAIL=' + WORKER_EMAIL);
  console.log('WORKER_TIMER_JOB_TITLE=' + JOB_TITLE);

  const owner = await backendLogin(request, OWNER_EMAIL, OWNER_PASS, 'OWNER');
  const originalPlan = owner.plan || 'solo';
  console.log('WORKER_TIMER_ORIGINAL_PLAN=' + originalPlan);

  const planSave = await request.patch(api('/user/plan'), { data: { plan: 'enterprise' } });
  console.log('WORKER_TIMER_PLAN_SAVE_STATUS=' + planSave.status());
  expect(planSave.status()).toBeLessThan(400);

  const createWorker = await request.post(api('/team/workers'), {
    data: { name: WORKER_NAME, email: WORKER_EMAIL, phone: '0270000001' },
  });
  const createdWorker = await readJson(createWorker);
  console.log('WORKER_TIMER_CREATE_WORKER_STATUS=' + createWorker.status());
  console.log('WORKER_TIMER_INVITE_LINK_RETURNED=' + Boolean(createdWorker.json.invite_link));
  if (createWorker.status() >= 400) console.log('WORKER_TIMER_CREATE_WORKER_BODY=' + createdWorker.text);
  expect(createWorker.status()).toBeLessThan(400);
  expect(createdWorker.json.invite_link).toBeTruthy();

  const workerId = createdId(createdWorker.json);
  console.log('WORKER_TIMER_WORKER_ID=' + workerId);
  expect(workerId).toBeTruthy();

  const token = new URL(createdWorker.json.invite_link).pathname.split('/').filter(Boolean).pop();
  const accept = await request.post(api('/invite/accept'), {
    data: { token, name: WORKER_NAME, password: WORKER_PASS },
  });
  const acceptText = await accept.text().catch(() => '');
  console.log('WORKER_TIMER_INVITE_ACCEPT_STATUS=' + accept.status());
  if (accept.status() >= 400) console.log('WORKER_TIMER_INVITE_ACCEPT_BODY=' + acceptText);
  expect(accept.status()).toBeLessThan(400);

  const scheduled = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
  const createJob = await request.post(api('/jobs'), {
    data: {
      title: JOB_TITLE,
      job_type: 'other',
      customer_name: 'Timer Proof Client',
      address: '1 Timer Proof Street, Wellington',
      scheduled_date: scheduled,
      estimated_duration: 60,
      price: 0,
      pricing_type: 'fixed',
      notes: 'Worker timer proof job. Safe to ignore.',
      status: 'assigned',
    },
  });
  const createdJob = await readJson(createJob);
  console.log('WORKER_TIMER_CREATE_JOB_STATUS=' + createJob.status());
  if (createJob.status() >= 400) console.log('WORKER_TIMER_CREATE_JOB_BODY=' + createdJob.text);
  expect(createJob.status()).toBeLessThan(400);

  const jobId = createdId(createdJob.json);
  console.log('WORKER_TIMER_JOB_ID=' + jobId);
  expect(jobId).toBeTruthy();

  const assign = await request.post(api(`/jobs/${encodeURIComponent(jobId)}/assign`), { data: { worker_id: workerId } });
  const assignText = await assign.text().catch(() => '');
  console.log('WORKER_TIMER_ASSIGN_STATUS=' + assign.status());
  if (assign.status() >= 400) console.log('WORKER_TIMER_ASSIGN_BODY=' + assignText);
  expect(assign.status()).toBeLessThan(400);

  await request.post(api('/auth/logout')).catch(() => null);
  await backendLogin(request, WORKER_EMAIL, WORKER_PASS, 'WORKER');

  await getJob(request, jobId, 'WORKER_TIMER_INITIAL');

  await postAction(request, jobId, '/acknowledge', 'WORKER_TIMER_ACKNOWLEDGE');
  const acknowledged = await getJob(request, jobId, 'WORKER_TIMER_AFTER_ACKNOWLEDGE');
  expect(['acknowledged', 'assigned'].includes(statusOf(acknowledged))).toBeTruthy();

  await postAction(request, jobId, '/timer/start', 'WORKER_TIMER_START');
  const started = await getJob(request, jobId, 'WORKER_TIMER_AFTER_START');
  expect(statusOf(started)).toBe('in_progress');

  await postAction(request, jobId, '/timer/pause', 'WORKER_TIMER_PAUSE');
  const paused = await getJob(request, jobId, 'WORKER_TIMER_AFTER_PAUSE');
  expect(statusOf(paused)).toBe('paused');

  await postAction(request, jobId, '/timer/resume', 'WORKER_TIMER_RESUME');
  const resumed = await getJob(request, jobId, 'WORKER_TIMER_AFTER_RESUME');
  expect(statusOf(resumed)).toBe('in_progress');

  await postAction(request, jobId, '/complete', 'WORKER_TIMER_COMPLETE', { worker_notes: 'Timer proof completed.' });
  const completed = await getJob(request, jobId, 'WORKER_TIMER_AFTER_COMPLETE');
  expect(statusOf(completed)).toBe('completed');

  console.log('WORKER_TIMER_PROOF=passed');

  await request.post(api('/auth/logout')).catch(() => null);
  await backendLogin(request, OWNER_EMAIL, OWNER_PASS, 'OWNER_RESTORE');
  const restorePlan = await request.patch(api('/user/plan'), { data: { plan: originalPlan } });
  console.log('WORKER_TIMER_RESTORE_PLAN_STATUS=' + restorePlan.status());
  expect(restorePlan.status()).toBeLessThan(400);
});
