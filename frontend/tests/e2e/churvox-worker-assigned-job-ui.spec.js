const { test, expect } = require('@playwright/test');

const OWNER_EMAIL = process.env.CHURVOX_OWNER_EMAIL || '';
const OWNER_PASSWORD = process.env.CHURVOX_OWNER_PASSWORD || '';
const WORKER_EMAIL = process.env.CHURVOX_WORKER_EMAIL || '';
const WORKER_PASSWORD = process.env.CHURVOX_WORKER_PASSWORD || '';
const SITE_BASE = (process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '');
const API_BASE = (process.env.PLAYWRIGHT_API_BASE || 'https://grassley-backend.onrender.com').replace(/\/+$/, '');

function apiUrl(path) {
  return `${API_BASE}${path.startsWith('/api') ? path : `/api${path}`}`;
}

function siteUrl(path) {
  return `${SITE_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

function tokenFrom(body = {}) {
  return body.token || body.access_token || body.auth_token || body.jwt || body.accessToken
    || body.user?.token || body.user?.access_token || body.data?.token
    || body.data?.access_token || body.data?.user?.token || '';
}

function idOf(row = {}) {
  const raw = row.id || row._id || row.$oid || row.oid || row.worker_id || row.user_id || row.team_member_id || row.job_id || '';
  return typeof raw === 'object' ? String(raw.$oid || raw.oid || raw.id || '') : String(raw || '');
}

function rowsFrom(payload, keys = []) {
  const data = payload?.data?.data ?? payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  for (const key of keys) if (Array.isArray(data?.[key])) return data[key];
  for (const key of ['workers', 'team', 'members', 'jobs', 'items', 'records', 'results', 'data']) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

function textHas(row, marker) {
  return JSON.stringify(row || {}).toLowerCase().includes(String(marker || '').toLowerCase());
}

async function readJson(response) {
  const text = await response.text().catch(() => '');
  try { return JSON.parse(text || '{}'); } catch { return { text: text.slice(0, 500) }; }
}

async function requestJson(page, token, method, path, data) {
  const options = {
    headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    timeout: 30_000,
  };
  if (data !== undefined) options.data = data;
  const response = await page.request[method](apiUrl(path), options);
  return { ok: response.ok(), status: response.status(), body: await readJson(response) };
}

async function loginToken(page, email, password, role) {
  const paths = role === 'worker' ? ['/api/auth/login', '/api/worker/auth/login'] : ['/api/auth/login'];
  const attempts = [];
  for (const path of paths) {
    const result = await requestJson(page, '', 'post', path, { email, password });
    const token = tokenFrom(result.body);
    attempts.push(`${path}:${result.status}:${Boolean(token)}`);
    if (result.ok && result.body?.success !== false && token) return token;
  }
  throw new Error(`${role} login failed: ${attempts.join(', ')}`);
}

async function establishWorkerBrowserSession(page, token) {
  await page.addInitScript(({ seededToken }) => {
    localStorage.setItem('token', seededToken);
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('churvox:logged-out');
  }, { seededToken: token });

  await page.goto('/worker/jobs', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => Boolean(localStorage.getItem('token')) && window.__CHURVOX_AUTH_STATE__?.status === 'authenticated',
    null,
    { timeout: 30_000 },
  );
}

async function findLinkedWorker(page, ownerToken) {
  for (const endpoint of ['/api/team/workers', '/api/team', '/api/workers']) {
    const result = await requestJson(page, ownerToken, 'get', `${endpoint}?ts=${Date.now()}`);
    if (!result.ok) continue;
    const worker = rowsFrom(result.body, ['workers', 'team', 'members'])
      .find((row) => String(row.email || row.worker_email || row.user_email || '').trim().toLowerCase() === WORKER_EMAIL.toLowerCase());
    if (worker) return worker;
  }
  throw new Error('Could not find the authenticated linked worker in Team.');
}

async function createAssignedJob(page, ownerToken, workerToken) {
  const worker = await findLinkedWorker(page, ownerToken);
  const workerId = idOf(worker);
  expect(workerId, 'linked worker id').toBeTruthy();

  const marker = `Full launch worker detail ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const workerName = String(worker.name || worker.full_name || worker.worker_name || '').trim();
  const created = await requestJson(page, ownerToken, 'post', '/api/jobs', {
    title: marker,
    job_type: 'other',
    customer_name: 'Churvox launch audit',
    address: '1 Test Street, Wellington',
    scheduled_date: new Date().toISOString(),
    scheduled_time: '09:00',
    estimated_duration: 30,
    price: 0,
    status: 'assigned',
    assigned_worker_id: workerId,
    worker_id: workerId,
    assigned_to: workerId,
    assigned_worker_email: WORKER_EMAIL,
    worker_email: WORKER_EMAIL,
    assigned_worker_name: workerName,
    worker_name: workerName,
    worker_instructions: marker,
    notes: marker,
  });
  expect(created.ok, `owner could not create assigned worker audit job: ${created.status} ${JSON.stringify(created.body).slice(0, 500)}`).toBeTruthy();

  let job = created.body?.job || created.body?.data?.job || created.body?.data || created.body;
  let jobId = idOf(job);
  if (!jobId) {
    const listed = await requestJson(page, ownerToken, 'get', `/api/jobs?ts=${Date.now()}`);
    job = rowsFrom(listed.body, ['jobs']).find((row) => textHas(row, marker));
    jobId = idOf(job);
  }
  expect(jobId, 'created assigned worker audit job id').toBeTruthy();

  await expect.poll(async () => {
    const result = await requestJson(page, workerToken, 'get', `/api/worker/jobs?ts=${Date.now()}`);
    return result.ok && rowsFrom(result.body, ['jobs']).some((row) => textHas(row, marker));
  }, {
    message: 'created job never reached the authenticated worker-scoped API',
    timeout: 45_000,
    intervals: [500, 1000, 2000],
  }).toBeTruthy();

  return { marker, jobId };
}

async function cleanupAssignedJob(page, ownerToken, jobId) {
  if (!jobId) return;
  const archived = await requestJson(page, ownerToken, 'post', `/api/jobs/${encodeURIComponent(jobId)}/archive`, {
    archived: true,
    status: 'archived',
    archive_reason: 'full launch worker detail audit cleanup',
  });
  if (archived.ok || archived.status === 404) return;
  const deleted = await requestJson(page, ownerToken, 'delete', `/api/jobs/${encodeURIComponent(jobId)}`);
  expect(deleted.ok || deleted.status === 404, `audit job cleanup failed: archive ${archived.status}, delete ${deleted.status}`).toBeTruthy();
}

test('current worker queue opens an assigned job and shows real field controls', async ({ page }) => {
  test.setTimeout(180_000);
  expect(OWNER_EMAIL && OWNER_PASSWORD, 'owner launch credentials').toBeTruthy();
  expect(WORKER_EMAIL && WORKER_PASSWORD, 'worker launch credentials').toBeTruthy();

  const ownerToken = await loginToken(page, OWNER_EMAIL, OWNER_PASSWORD, 'owner');
  const workerToken = await loginToken(page, WORKER_EMAIL, WORKER_PASSWORD, 'worker');
  const fixture = await createAssignedJob(page, ownerToken, workerToken);

  try {
    await establishWorkerBrowserSession(page, workerToken);
    expect(page.url(), 'worker audit redirected out of worker area').toMatch(/\/worker(?:[/?#]|$)/i);

    const jobCard = page.locator('.fieldJobCard').filter({ hasText: fixture.marker }).first();
    if (!await jobCard.isVisible().catch(() => false)) {
      const refresh = page.getByRole('button', { name: /refresh/i }).first();
      if (await refresh.isVisible().catch(() => false)) await refresh.click();
    }
    await expect(jobCard, 'created assigned job card did not appear in the worker queue').toBeVisible({ timeout: 30_000 });
    await jobCard.getByRole('link', { name: /view job|open job|open|start first job/i }).first().click();

    await expect(page.locator('body')).toContainText(fixture.marker, { timeout: 15_000 });
    for (const control of ['Acknowledge', 'Start job', 'Pause', 'Resume', 'Finish job']) {
      await expect(page.getByRole('button', { name: new RegExp(`^${control}$`, 'i') }).first(), `missing worker control: ${control}`).toBeVisible();
    }
    await expect(page.getByText('Photos and note', { exact: true }).first(), 'missing proof area').toBeVisible();
    await expect(page.getByRole('button', { name: /^Upload proof to office$/i }).first(), 'missing proof upload control').toBeVisible();
    await expect(page.getByText('One tap to Command', { exact: true }).first(), 'missing issue-to-Command control').toBeVisible();
  } finally {
    await cleanupAssignedJob(page, ownerToken, fixture.jobId);
  }
});
