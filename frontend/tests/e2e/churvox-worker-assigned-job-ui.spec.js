const { test, expect } = require('@playwright/test');

const WORKER_EMAIL = process.env.CHURVOX_WORKER_EMAIL || '';
const WORKER_PASSWORD = process.env.CHURVOX_WORKER_PASSWORD || '';
const RUN_ID = process.env.GITHUB_RUN_ID || `local-${process.pid}`;
const API_BASE = (process.env.PLAYWRIGHT_API_BASE || 'https://grassley-backend.onrender.com').replace(/\/+$/, '');

function apiUrl(path) {
  return `${API_BASE}${path.startsWith('/api') ? path : `/api${path}`}`;
}

function tokenFrom(body = {}) {
  return body.token || body.access_token || body.auth_token || body.jwt || body.accessToken
    || body.user?.token || body.user?.access_token || body.data?.token
    || body.data?.access_token || body.data?.user?.token || '';
}

function rowsFrom(payload, keys = []) {
  const data = payload?.data?.data ?? payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  for (const key of keys) if (Array.isArray(data?.[key])) return data[key];
  for (const key of ['jobs', 'items', 'records', 'results', 'data']) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

async function readJson(response) {
  const text = await response.text().catch(() => '');
  try { return JSON.parse(text || '{}'); } catch { return { text: text.slice(0, 500) }; }
}

async function loginWorker(page) {
  const attempts = [];
  for (const path of ['/api/auth/login', '/api/worker/auth/login']) {
    const response = await page.request.post(apiUrl(path), {
      data: { email: WORKER_EMAIL, password: WORKER_PASSWORD },
      timeout: 30_000,
    });
    const body = await readJson(response);
    const token = tokenFrom(body);
    attempts.push(`${path}:${response.status()}:${Boolean(token)}`);
    if (response.ok() && body?.success !== false && token) return token;
  }
  throw new Error(`worker login failed: ${attempts.join(', ')}`);
}

async function establishWorkerBrowserSession(page, token) {
  await page.addInitScript(({ seededToken }) => {
    localStorage.setItem('token', seededToken);
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('churvox:logged-out');
  }, { seededToken: token });
}

test('current worker queue renders assigned work and real field controls without mutating live records', async ({ page }) => {
  test.setTimeout(120_000);
  expect(WORKER_EMAIL && WORKER_PASSWORD, 'worker launch credentials').toBeTruthy();

  const workerToken = await loginWorker(page);

  // Prove the authenticated worker-scoped backend is live and returns a valid
  // jobs collection. It may legitimately be empty, so UI rendering is checked
  // below with a controlled response instead of creating production fixtures.
  const liveResponse = await page.request.get(apiUrl(`/api/worker/jobs?ts=${Date.now()}`), {
    headers: { Authorization: `Bearer ${workerToken}`, Accept: 'application/json' },
    timeout: 30_000,
  });
  const liveBody = await readJson(liveResponse);
  expect(liveResponse.ok(), `worker jobs API failed with HTTP ${liveResponse.status()}: ${JSON.stringify(liveBody).slice(0, 500)}`).toBeTruthy();
  expect(Array.isArray(rowsFrom(liveBody, ['jobs'])), 'worker jobs API did not return a jobs collection').toBeTruthy();

  const marker = `Worker UI contract run-${RUN_ID}`;
  const syntheticJob = {
    id: `ui-contract-${RUN_ID}`,
    title: marker,
    job_title: marker,
    customer_name: 'Churvox UI contract',
    client_name: 'Churvox UI contract',
    address: '1 Test Street, Wellington',
    scheduled_date: new Date().toISOString(),
    scheduled_time: '09:00',
    status: 'assigned',
    job_status: 'assigned',
    workflow_status: 'assigned',
    assigned_worker_email: WORKER_EMAIL,
    worker_email: WORKER_EMAIL,
    notes: 'Controlled browser-only worker UI contract. No live record is created.',
  };

  await page.route('**/api/worker/jobs**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, jobs: [syntheticJob] }),
    });
  });

  await establishWorkerBrowserSession(page, workerToken);
  await page.goto('/worker/jobs', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => Boolean(localStorage.getItem('token')) && window.__CHURVOX_AUTH_STATE__?.status === 'authenticated',
    null,
    { timeout: 30_000 },
  );
  expect(page.url(), 'worker audit redirected out of worker area').toMatch(/\/worker(?:[/?#]|$)/i);

  const queue = page.getByRole('region', { name: 'Assigned worker jobs' });
  await expect(queue).toBeVisible({ timeout: 30_000 });
  const jobButton = queue.getByRole('button').filter({ hasText: marker }).first();
  await expect(jobButton, 'controlled assigned job did not appear in the current worker queue').toBeVisible({ timeout: 30_000 });
  await jobButton.click();

  await expect(page.locator('.cvWorkerRouteJob').first(), 'selected worker job did not open in the field card').toContainText(marker, { timeout: 15_000 });
  for (const control of ['Acknowledge', 'Start', 'Pause', 'Resume', 'Complete']) {
    const button = page.getByRole('button', { name: new RegExp(`^${control}$`, 'i') }).first();
    await expect(button, `missing worker control: ${control}`).toBeVisible();
    await expect(button, `disabled worker control: ${control}`).toBeEnabled();
  }

  await expect(page.getByPlaceholder('What changed on this job?').first(), 'missing worker note field').toBeVisible();
  await expect(page.getByText('Photo proof', { exact: true }).first(), 'missing worker photo proof control').toBeVisible();
  await expect(page.getByRole('button', { name: /^Send proof note$/i }).first(), 'missing proof send control').toBeEnabled();
  await expect(page.getByRole('button', { name: /^Timer note$/i }).first(), 'missing timer note control').toBeEnabled();
});
