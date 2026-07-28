const { test, expect } = require('@playwright/test');

const BASE_URL = (process.env.PLAYWRIGHT_BASE_URL || 'https://www.churvox.com').replace(/\/+$/, '');
const API_BASE = (process.env.PLAYWRIGHT_API_BASE || 'https://grassley-backend.onrender.com').replace(/\/+$/, '');
const OWNER_EMAIL = String(process.env.CHURVOX_OWNER_EMAIL || '').trim().toLowerCase();
const OWNER_PASSWORD = process.env.CHURVOX_OWNER_PASSWORD || '';
const WORKER_EMAIL = String(process.env.CHURVOX_WORKER_EMAIL || '').trim().toLowerCase();
const WORKER_PASSWORD = process.env.CHURVOX_WORKER_PASSWORD || process.env.CHURVOX_OWNER_PASSWORD || '';

function apiUrl(path) {
  return `${API_BASE}${path.startsWith('/api') ? path : `/api${path}`}`;
}

function tokenFrom(body = {}) {
  return body?.token || body?.access_token || body?.auth_token || body?.jwt || body?.accessToken
    || body?.user?.token || body?.user?.access_token || body?.data?.token || body?.data?.access_token || body?.data?.user?.token || '';
}

function emailFrom(body = {}) {
  return String(body?.email || body?.user?.email || body?.data?.email || body?.data?.user?.email || '').trim().toLowerCase();
}

function idOf(row = {}) {
  const raw = row?.id || row?._id || row?.client_id || row?.job_id || row?.worker_id || row?.user_id || row?.action_id || row?.source_id || '';
  if (raw && typeof raw === 'object') return String(raw.$oid || raw.oid || raw.id || '');
  return String(raw || '');
}

function rowsFrom(payload) {
  const body = payload?.data?.data ?? payload?.data ?? payload;
  if (Array.isArray(body)) return body;
  for (const key of ['items', 'records', 'results', 'clients', 'workers', 'team', 'members', 'jobs', 'slips', 'actions', 'data']) {
    if (Array.isArray(body?.[key])) return body[key];
  }
  return [];
}

function contains(value, token) {
  return JSON.stringify(value || {}).toLowerCase().includes(String(token || '').toLowerCase());
}

function statusOf(job = {}) {
  return String(job.status || job.job_status || job.workflow_status || job.state || '').trim().toLowerCase();
}

async function bodyOf(response) {
  return response.json().catch(async () => ({ text: await response.text().catch(() => '') }));
}

async function apiLogin(request, email, password, label) {
  const { response, body } = await api(request, 'post', '/api/auth/login', '', { email, password });
  expect(response.ok(), `${label} login failed ${response.status()}: ${JSON.stringify(body).slice(0, 700)}`).toBeTruthy();
  const token = tokenFrom(body);
  expect(token, `${label} login returned no token`).toBeTruthy();
  if (emailFrom(body)) expect(emailFrom(body), `${label} login returned wrong account`).toBe(email);
  return token;
}

async function api(request, method, path, token, data) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await request[method](apiUrl(path), {
        headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        ...(data === undefined ? {} : { data }),
        timeout: 60_000,
      });
      const body = await bodyOf(response);
      if (response.ok() || ![429, 500, 502, 503, 504].includes(response.status()) || attempt === 3) return { response, body };
    } catch (error) {
      lastError = error;
      if (attempt === 3) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
  }
  throw lastError || new Error(`${method.toUpperCase()} ${path} produced no response`);
}

async function uiLogin(page, email, password, role) {
  await page.goto(`${BASE_URL}/login${role === 'worker' ? '?worker=1' : ''}`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel(/email/i).first().fill(email);
  await page.getByLabel(/password/i).first().fill(password);
  await page.getByRole('button', { name: /open churvox|sign in|log in/i }).first().click();
  await expect.poll(() => page.url(), {
    message: `${role} stayed on login`,
    timeout: 25_000,
    intervals: [300, 600, 1000, 1800, 3000],
  }).not.toMatch(/\/login(?:[?#]|$)/);
  const token = await page.evaluate(() => localStorage.getItem('token') || '');
  expect(token, `${role} login did not persist token`).toBeTruthy();
  const me = await page.request.get(apiUrl('/api/auth/me'), { headers: { Authorization: `Bearer ${token}` }, timeout: 30_000 });
  const body = await bodyOf(me);
  expect(me.status(), `${role} /api/auth/me failed: ${JSON.stringify(body).slice(0, 600)}`).toBe(200);
  expect(emailFrom(body), `${role} /api/auth/me returned wrong account`).toBe(email);
  return token;
}

async function seedVerifiedSession(page, token, email, role) {
  await page.context().addInitScript(({ tokenValue, emailValue, roleValue }) => {
    localStorage.setItem('token', tokenValue);
    localStorage.setItem('authToken', tokenValue);
    localStorage.setItem('access_token', tokenValue);
    localStorage.setItem('churvox_auth_session_snapshot_v1', JSON.stringify({
      at: Date.now(),
      token: tokenValue,
      user: { email: emailValue, role: roleValue, has_app_access: true, email_verified: true },
    }));
  }, { tokenValue: token, emailValue: email, roleValue: role });
  await page.goto(`${BASE_URL}${role === 'worker' ? '/worker/today' : '/dashboard#today'}`, { waitUntil: 'domcontentloaded' });
  const me = await page.request.get(apiUrl('/api/auth/me'), { headers: { Authorization: `Bearer ${token}` }, timeout: 30_000 });
  const body = await bodyOf(me);
  expect(me.status(), `${role} seeded /api/auth/me failed: ${JSON.stringify(body).slice(0, 600)}`).toBe(200);
  expect(emailFrom(body), `${role} seeded /api/auth/me returned wrong account`).toBe(email);
}

async function findWorker(request, ownerToken) {
  for (const endpoint of ['/api/team/workers', '/api/team', '/api/workers']) {
    const { response, body } = await api(request, 'get', endpoint, ownerToken);
    if (!response.ok()) continue;
    const worker = rowsFrom(body).find((row) => String(row.email || row.worker_email || row.user_email || '').trim().toLowerCase() === WORKER_EMAIL);
    if (worker) return worker;
  }
  throw new Error(`Linked worker ${WORKER_EMAIL} was not found in owner team endpoints.`);
}

async function createAssignedJob(request, ownerToken, worker, run) {
  const workerId = idOf(worker);
  expect(workerId, 'Linked worker has no stable id').toBeTruthy();
  const title = `HUMAN CURRENT JOB ${run}`;
  const instruction = `Human current instruction ${run}: check access, send proof and report extra work.`;
  const { response, body } = await api(request, 'post', '/api/jobs', ownerToken, {
    title,
    job_title: title,
    job_type: 'other',
    client_name: `HUMAN CURRENT CLIENT ${run}`,
    customer_name: `HUMAN CURRENT CLIENT ${run}`,
    address: '1 Human Audit Street, Wellington',
    scheduled_date: new Date().toISOString().slice(0, 10),
    scheduled_time: '09:00',
    status: 'assigned',
    price: 0,
    assigned_worker_id: workerId,
    worker_id: workerId,
    worker_email: WORKER_EMAIL,
    assigned_worker_name: worker.name || worker.full_name || worker.email || WORKER_EMAIL,
    worker_instructions: instruction,
    notes: instruction,
    source: 'human-current-owner-worker-test',
  });
  expect(response.ok(), `Owner could not create assigned test job ${response.status()}: ${JSON.stringify(body).slice(0, 900)}`).toBeTruthy();
  const record = body.job || body.record || body.data?.job || body.data?.record || body.data || body;
  let jobId = idOf(record);
  if (!jobId) {
    await expect.poll(async () => {
      const listed = await api(request, 'get', `/api/jobs?ts=${Date.now()}`, ownerToken);
      const found = rowsFrom(listed.body).find((row) => contains(row, title));
      jobId = idOf(found);
      return Boolean(jobId);
    }, { timeout: 20_000, intervals: [500, 900, 1500, 2500] }).toBe(true);
  }
  return { jobId, title, instruction };
}

async function waitForJobStatus(request, token, jobId, title, expected, label) {
  await expect.poll(async () => {
    for (const path of [`/api/jobs/${encodeURIComponent(jobId)}`, `/api/worker/jobs/${encodeURIComponent(jobId)}`, `/api/jobs?ts=${Date.now()}`, `/api/worker/jobs?ts=${Date.now()}`]) {
      const result = await api(request, 'get', path, token);
      if (!result.response.ok()) continue;
      const direct = result.body?.job || result.body?.data?.job || result.body?.data;
      const job = direct && !Array.isArray(direct) && contains(direct, title)
        ? direct
        : rowsFrom(result.body).find((row) => idOf(row) === jobId || contains(row, title));
      if (job && expected.test(`${statusOf(job)} ${job.worker_last_action || ''}`)) return true;
    }
    return false;
  }, { message: label, timeout: 25_000, intervals: [500, 900, 1500, 2500] }).toBe(true);
}

async function createCurrentClient(ownerPage, request, ownerToken, clientName) {
  await ownerPage.goto(`${BASE_URL}/dashboard#clients`, { waitUntil: 'domcontentloaded' });
  await expect(ownerPage.locator('.cvOwnerReady')).toBeVisible({ timeout: 20_000 });
  await ownerPage.getByRole('button', { name: 'Create a record', exact: true }).click();
  const createMenu = ownerPage.getByRole('dialog', { name: 'Create in Churvox' });
  await expect(createMenu).toBeVisible({ timeout: 10_000 });
  await createMenu.getByRole('button', { name: /Client/i }).click();
  const dialog = ownerPage.getByRole('dialog', { name: /Create client/i });
  await expect(dialog).toBeVisible({ timeout: 10_000 });
  await dialog.getByLabel('Name', { exact: true }).fill(clientName);
  await dialog.getByLabel('Phone', { exact: true }).fill('021 555 0101');
  await dialog.getByLabel('Email', { exact: true }).fill(`human-current-${Date.now()}@example.com`);
  await dialog.getByLabel('Address', { exact: true }).fill('1 Human Audit Street, Wellington');
  await dialog.getByLabel('Access notes', { exact: true }).fill(`Human audit access note ${clientName}`);
  const responsePromise = ownerPage.waitForResponse(
    (response) => /\/api\/clients(?:\/create)?$/.test(new URL(response.url()).pathname) && response.request().method() === 'POST',
    { timeout: 25_000 },
  );
  await dialog.getByRole('button', { name: 'Create record', exact: true }).click();
  const response = await responsePromise;
  const body = await bodyOf(response);
  expect(response.ok(), `Current client drawer failed ${response.status()}: ${JSON.stringify(body).slice(0, 900)}`).toBeTruthy();
  let clientId = idOf(body.client || body.record || body.result?.client || body.result?.record || body.data?.client || body.data?.record || body.data || body) || String(body.client_id || body.data?.client_id || body.result?.client_id || '');
  if (!clientId) {
    await expect.poll(async () => {
      const listed = await api(request, 'get', `/api/clients?ts=${Date.now()}`, ownerToken);
      const found = rowsFrom(listed.body).find((row) => contains(row, clientName));
      clientId = idOf(found);
      return Boolean(clientId);
    }, { timeout: 45_000, intervals: [500, 900, 1500, 2500, 4000] }).toBe(true);
  }
  await expect(ownerPage.getByText(clientName).first()).toBeVisible({ timeout: 20_000 });
  return clientId;
}

async function clickWorkerStep(workerPage, request, workerToken, jobId, title, label, expected) {
  const responsePromise = workerPage.waitForResponse(
    (response) => response.request().method() === 'POST' && new RegExp(`/api/worker/jobs/${jobId}/${label.toLowerCase() === 'acknowledge' ? 'acknowledge' : label.toLowerCase()}`).test(response.url()),
    { timeout: 25_000 },
  );
  await workerPage.getByRole('button', { name: new RegExp(`^${label}$`, 'i') }).click();
  const response = await responsePromise;
  expect(response.ok(), `${label} UI request failed with ${response.status()}`).toBeTruthy();
  await waitForJobStatus(request, workerToken, jobId, title, expected, `Worker API sees ${label}`);
}

async function closeAuditCommandItems(request, ownerToken, tokens) {
  const listed = await api(request, 'get', `/api/command/slips?ts=${Date.now()}`, ownerToken);
  if (!listed.response.ok()) return;
  const slips = rowsFrom(listed.body).filter((row) => tokens.some((token) => contains(row, token)));
  for (const slip of slips) {
    const id = idOf(slip);
    if (!id) continue;
    const normal = await api(request, 'post', `/api/command/slips/${encodeURIComponent(id)}/ignore`, ownerToken, { action: 'Ignore', note: 'Human audit cleanup' });
    if (normal.response.ok()) continue;
    await api(request, 'post', `/api/command/field-slips/${encodeURIComponent(id)}/dismiss`, ownerToken, { note: 'Human audit cleanup' });
  }
}

async function cleanupClient(request, ownerToken, clientId, clientName) {
  let id = clientId;
  if (!id) {
    const listed = await api(request, 'get', `/api/clients?ts=${Date.now()}`, ownerToken);
    id = idOf(rowsFrom(listed.body).find((row) => contains(row, clientName)));
  }
  if (!id) return;
  let result = await api(request, 'delete', `/api/clients/${encodeURIComponent(id)}`, ownerToken);
  if (result.response.ok() || result.response.status() === 404) return;
  result = await api(request, 'patch', `/api/clients/${encodeURIComponent(id)}`, ownerToken, { archived: true, status: 'archived', archive_reason: 'human current audit cleanup' });
  expect(result.response.ok() || result.response.status() === 404, `Could not clean test client: ${result.response.status()} ${JSON.stringify(result.body).slice(0, 500)}`).toBeTruthy();
}

async function cleanupJob(request, ownerToken, jobId) {
  if (!jobId) return;
  let result = await api(request, 'delete', `/api/jobs/${encodeURIComponent(jobId)}`, ownerToken);
  if (result.response.ok() || result.response.status() === 404) return;
  result = await api(request, 'post', `/api/jobs/${encodeURIComponent(jobId)}/archive`, ownerToken, { archived: true, archive_reason: 'human current audit cleanup' });
  if (result.response.ok() || result.response.status() === 404) return;
  result = await api(request, 'patch', `/api/jobs/${encodeURIComponent(jobId)}`, ownerToken, { archived: true, status: 'archived', archive_reason: 'human current audit cleanup' });
  expect(result.response.ok() || result.response.status() === 404, `Could not clean test job: ${result.response.status()} ${JSON.stringify(result.body).slice(0, 500)}`).toBeTruthy();
}

test.describe('Current Churvox human owner-worker flow', () => {
  test.setTimeout(480_000);

  test('owner prepares, worker performs every field step, owner receives proof/problem, and cleanup succeeds', async ({ browser, request }) => {
    if (!OWNER_EMAIL || !OWNER_PASSWORD || !WORKER_EMAIL || !WORKER_PASSWORD) throw new Error('Real owner and worker credentials are required; this test never skips.');

    const ownerToken = await apiLogin(request, OWNER_EMAIL, OWNER_PASSWORD, 'owner');
    const workerToken = await apiLogin(request, WORKER_EMAIL, WORKER_PASSWORD, 'worker');
    const worker = await findWorker(request, ownerToken);
    const run = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    const preparedToken = `HUMAN CURRENT CLIENT ${run}`;
    const issueToken = `HUMAN CURRENT WORKER ISSUE ${run}: extra work needs owner decision`;
    let jobId = '';
    let clientId = '';

    const ownerContext = await browser.newContext({ serviceWorkers: 'block' });
    const workerContext = await browser.newContext({ serviceWorkers: 'block' });
    const ownerPage = await ownerContext.newPage();
    const workerPage = await workerContext.newPage();

    try {
      await test.step('Owner logs in and creates a real client through the current drawer', async () => {
        await seedVerifiedSession(ownerPage, ownerToken, OWNER_EMAIL, 'owner');
        clientId = await createCurrentClient(ownerPage, request, ownerToken, preparedToken);
      });

      const job = await test.step('Owner creates one isolated live job assigned to the discovered worker', async () => createAssignedJob(request, ownerToken, worker, run));
      jobId = job.jobId;

      await test.step('Worker logs in and sees the real assigned job in Worker View', async () => {
        await seedVerifiedSession(workerPage, workerToken, WORKER_EMAIL, 'worker');
        await workerPage.goto(`${BASE_URL}/worker/jobs`, { waitUntil: 'domcontentloaded' });
        await expect(workerPage.getByText(job.title).first(), 'Worker did not see assigned live job').toBeVisible({ timeout: 25_000 });
        const jobButton = workerPage.locator('.cvWorkerRouteQueue button').filter({ hasText: job.title }).first();
        if (await jobButton.count()) await jobButton.click();
      });

      await test.step('Worker adds real proof through the worker UI', async () => {
        const fileInput = workerPage.locator('input[type="file"]').first();
        await expect(fileInput).toBeAttached();
        await fileInput.setInputFiles({
          name: `human-current-${run}.png`,
          mimeType: 'image/png',
          buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=', 'base64'),
        });
        const responsePromise = workerPage.waitForResponse(
          (response) => /\/api\/worker\/field-slip$/.test(new URL(response.url()).pathname) && response.request().method() === 'POST',
          { timeout: 25_000 },
        );
        await workerPage.getByRole('button', { name: /Send 1 proof item/i }).click();
        const response = await responsePromise;
        expect(response.ok(), `Worker proof request failed with ${response.status()}`).toBeTruthy();
      });

      await test.step('Worker taps Acknowledge, Start, Pause, Resume and Complete and live status changes each time', async () => {
        await clickWorkerStep(workerPage, request, workerToken, jobId, job.title, 'Acknowledge', /acknowledged|acknowledge/);
        await clickWorkerStep(workerPage, request, workerToken, jobId, job.title, 'Start', /in_progress|started|start/);
        await clickWorkerStep(workerPage, request, workerToken, jobId, job.title, 'Pause', /paused|pause/);
        await clickWorkerStep(workerPage, request, workerToken, jobId, job.title, 'Resume', /in_progress|resumed|resume/);
        await clickWorkerStep(workerPage, request, workerToken, jobId, job.title, 'Complete', /completed|complete/);
      });

      await test.step('Worker sends a real judgement issue and owner receives it in Command', async () => {
        await workerPage.goto(`${BASE_URL}/worker/messages`, { waitUntil: 'domcontentloaded' });
        await workerPage.getByPlaceholder('What changed?', { exact: true }).fill(issueToken);
        const responsePromise = workerPage.waitForResponse(
          (response) => /\/api\/worker\/field-slip$/.test(new URL(response.url()).pathname) && response.request().method() === 'POST',
          { timeout: 25_000 },
        );
        await workerPage.getByRole('button', { name: 'Send to Command', exact: true }).click();
        const response = await responsePromise;
        expect(response.ok(), `Worker issue failed with ${response.status()}`).toBeTruthy();

        await ownerPage.goto(`${BASE_URL}/dashboard#command`, { waitUntil: 'domcontentloaded' });
        await expect.poll(async () => (await ownerPage.locator('body').innerText()).includes(issueToken), {
          message: 'Worker issue did not appear in owner Command',
          timeout: 30_000,
          intervals: [700, 1200, 2200, 3500],
        }).toBe(true);
      });

      await test.step('Owner sees the completed job and worker can log out cleanly', async () => {
        await ownerPage.goto(`${BASE_URL}/dashboard#work`, { waitUntil: 'domcontentloaded' });
        await expect(ownerPage.getByText(job.title).first()).toBeVisible({ timeout: 25_000 });
        await workerPage.getByRole('button', { name: 'Log out', exact: true }).click();
        await expect.poll(() => workerPage.url(), { timeout: 15_000 }).toMatch(/\/login/);
        expect(await workerPage.evaluate(() => localStorage.getItem('token') || '')).toBe('');
      });
    } finally {
      await closeAuditCommandItems(request, ownerToken, [preparedToken, issueToken, `HUMAN CURRENT JOB ${run}`]);
      await cleanupClient(request, ownerToken, clientId, preparedToken);
      await cleanupJob(request, ownerToken, jobId);
      await workerContext.close();
      await ownerContext.close();
    }
  });
});
