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

function idOf(row = {}) {
  const raw = row?.id || row?._id || row?.job_id || row?.worker_id || row?.client_id || row?.invoice_id || row?.source_id || '';
  if (raw && typeof raw === 'object') return String(raw.$oid || raw.oid || raw.id || '');
  return String(raw || '');
}

function rowsFrom(payload) {
  const body = payload?.data?.data ?? payload?.data ?? payload;
  if (Array.isArray(body)) return body;
  for (const key of ['items', 'records', 'results', 'workers', 'team', 'members', 'jobs', 'clients', 'invoices', 'slips', 'data']) {
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
  const response = await request.post(apiUrl('/api/auth/login'), { data: { email, password }, timeout: 30_000 });
  const body = await bodyOf(response);
  expect(response.ok(), `${label} login failed ${response.status()}: ${JSON.stringify(body).slice(0, 700)}`).toBeTruthy();
  const token = tokenFrom(body);
  expect(token, `${label} login returned no token`).toBeTruthy();
  return token;
}

async function api(request, method, path, token, data) {
  const response = await request[method](apiUrl(path), {
    headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(data === undefined ? {} : { data }),
    timeout: 30_000,
  });
  return { response, body: await bodyOf(response) };
}

async function seedVerifiedSession(page, token, email, role) {
  await page.context().addInitScript(({ tokenValue, emailValue, roleValue }) => {
    sessionStorage.removeItem('churvox:logged-out');
    localStorage.setItem('token', tokenValue);
    localStorage.setItem('authToken', tokenValue);
    localStorage.setItem('access_token', tokenValue);
    localStorage.setItem('churvox_auth_session_snapshot_v1', JSON.stringify({
      at: Date.now(),
      token: tokenValue,
      user: { email: emailValue, role: roleValue, has_app_access: true, email_verified: true },
    }));
  }, { tokenValue: token, emailValue: email, roleValue: role });
}

async function findWorker(request, ownerToken) {
  for (const endpoint of ['/api/team/workers', '/api/team', '/api/workers']) {
    const result = await api(request, 'get', endpoint, ownerToken);
    if (!result.response.ok()) continue;
    const worker = rowsFrom(result.body).find((row) => String(row.email || row.worker_email || row.user_email || '').trim().toLowerCase() === WORKER_EMAIL);
    if (worker) return worker;
  }
  throw new Error(`Linked worker ${WORKER_EMAIL} was not found in owner team endpoints.`);
}

async function createAssignedJob(request, ownerToken, worker, run) {
  const workerId = idOf(worker);
  expect(workerId, 'Linked worker has no stable id').toBeTruthy();
  const title = `STUDIO HUMAN JOB ${run}`;
  const instruction = `Studio human instruction ${run}: complete the work, attach proof and report any extra work.`;
  const result = await api(request, 'post', '/api/jobs', ownerToken, {
    title,
    job_title: title,
    job_type: 'other',
    client_name: `STUDIO HUMAN CLIENT ${run}`,
    customer_name: `STUDIO HUMAN CLIENT ${run}`,
    address: '1 Studio Audit Street, Wellington',
    scheduled_date: new Date().toISOString().slice(0, 10),
    scheduled_time: '09:00',
    estimated_duration: 30,
    status: 'assigned',
    price: 0,
    assigned_worker_id: workerId,
    worker_id: workerId,
    worker_email: WORKER_EMAIL,
    assigned_worker_name: worker.name || worker.full_name || worker.email || WORKER_EMAIL,
    worker_instructions: instruction,
    notes: instruction,
    source: 'studio-human-owner-worker-test',
  });
  expect(result.response.ok(), `Owner could not create assigned test job ${result.response.status()}: ${JSON.stringify(result.body).slice(0, 900)}`).toBeTruthy();
  const record = result.body.job || result.body.record || result.body.data?.job || result.body.data?.record || result.body.data || result.body;
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

async function createClientThroughStudio(ownerPage, run) {
  const name = `STUDIO HUMAN CLIENT ${run}`;
  await ownerPage.goto(`${BASE_URL}/dashboard#clients`, { waitUntil: 'domcontentloaded' });
  await expect(ownerPage.locator('[data-churvox-layout="fresh-studio"]')).toBeVisible({ timeout: 25_000 });
  await ownerPage.getByRole('button', { name: /^Create$/i }).click();
  const createMenu = ownerPage.getByRole('dialog', { name: /Create in Churvox/i });
  await expect(createMenu).toBeVisible();
  await createMenu.getByRole('button').filter({ hasText: /^\s*\d+\s*Client\b/i }).click();
  const drawer = ownerPage.getByRole('dialog', { name: /Create client/i });
  await expect(drawer).toBeVisible();
  await drawer.getByLabel('Name', { exact: true }).fill(name);
  await drawer.getByLabel('Phone', { exact: true }).fill('021 555 0199');
  await drawer.getByLabel('Email', { exact: true }).fill(`studio-human-${run}@example.com`);
  await drawer.getByLabel('Address', { exact: true }).fill('1 Studio Audit Street, Wellington');
  await drawer.getByLabel('Access notes', { exact: true }).fill(`Created through the current Studio UI ${run}`);
  const responsePromise = ownerPage.waitForResponse(
    (response) => /\/api\/clients(?:\/create)?$/.test(new URL(response.url()).pathname) && response.request().method() === 'POST',
    { timeout: 25_000 },
  );
  await drawer.getByRole('button', { name: /Create record/i }).click();
  const response = await responsePromise;
  const body = await bodyOf(response);
  expect(response.ok(), `Studio client creation failed ${response.status()}: ${JSON.stringify(body).slice(0, 900)}`).toBeTruthy();
  await expect(ownerPage.getByText(/Record created/i).first()).toBeVisible({ timeout: 10_000 });
  return { name, id: idOf(body.client || body.record || body.data?.client || body.data?.record || body.data || body) };
}

async function clickWorkerStep(workerPage, request, workerToken, jobId, title, label, expected) {
  const endpoint = label.toLowerCase() === 'acknowledge' ? 'acknowledge' : label.toLowerCase();
  const responsePromise = workerPage.waitForResponse(
    (response) => response.request().method() === 'POST' && new RegExp(`/api/worker/jobs/${jobId}/${endpoint}`).test(response.url()),
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
    const normal = await api(request, 'post', `/api/command/slips/${encodeURIComponent(id)}/ignore`, ownerToken, { action: 'Ignore', note: 'Studio human audit cleanup' });
    if (normal.response.ok()) continue;
    await api(request, 'post', `/api/command/field-slips/${encodeURIComponent(id)}/dismiss`, ownerToken, { note: 'Studio human audit cleanup' });
  }
}

async function cleanupRecord(request, ownerToken, kind, id, token) {
  if (!id && !token) return;
  if (!id && token) {
    const listed = await api(request, 'get', `/api/${kind}?ts=${Date.now()}`, ownerToken);
    const found = rowsFrom(listed.body).find((row) => contains(row, token));
    id = idOf(found);
  }
  if (!id) return;
  let result = await api(request, 'delete', `/api/${kind}/${encodeURIComponent(id)}`, ownerToken);
  if (result.response.ok() || result.response.status() === 404) return;
  result = await api(request, 'post', `/api/${kind}/${encodeURIComponent(id)}/archive`, ownerToken, { archived: true, archive_reason: 'studio human audit cleanup' });
  if (result.response.ok() || result.response.status() === 404) return;
  await api(request, 'patch', `/api/${kind}/${encodeURIComponent(id)}`, ownerToken, { archived: true, status: 'archived', archive_reason: 'studio human audit cleanup' });
}

test.describe('Current Studio human owner-worker flow', () => {
  test.setTimeout(600_000);

  test('owner creates a client, worker completes the real field loop, owner sees Command and prepares an invoice', async ({ browser, request }) => {
    if (!OWNER_EMAIL || !OWNER_PASSWORD || !WORKER_EMAIL || !WORKER_PASSWORD) throw new Error('Real owner and worker credentials are required; this test never skips.');

    const ownerToken = await apiLogin(request, OWNER_EMAIL, OWNER_PASSWORD, 'owner');
    const workerToken = await apiLogin(request, WORKER_EMAIL, WORKER_PASSWORD, 'worker');
    const worker = await findWorker(request, ownerToken);
    const run = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    const issueToken = `STUDIO HUMAN WORKER ISSUE ${run}: extra work needs owner judgement`;
    let client = { id: '', name: `STUDIO HUMAN CLIENT ${run}` };
    let job = { jobId: '', title: `STUDIO HUMAN JOB ${run}` };
    let invoiceId = '';

    const ownerContext = await browser.newContext({ serviceWorkers: 'block' });
    const workerContext = await browser.newContext({ serviceWorkers: 'block' });
    const ownerPage = await ownerContext.newPage();
    const workerPage = await workerContext.newPage();

    try {
      await seedVerifiedSession(ownerPage, ownerToken, OWNER_EMAIL, 'owner');
      await seedVerifiedSession(workerPage, workerToken, WORKER_EMAIL, 'worker');

      await test.step('Owner creates a real client through the current Studio drawer', async () => {
        client = await createClientThroughStudio(ownerPage, run);
      });

      job = await test.step('Owner creates one isolated assigned job for the linked worker', async () => createAssignedJob(request, ownerToken, worker, run));

      await test.step('Worker sees the assigned job and attaches proof', async () => {
        await workerPage.goto(`${BASE_URL}/worker/jobs`, { waitUntil: 'domcontentloaded' });
        await expect(workerPage.getByText(job.title).first(), 'Worker did not see assigned live job').toBeVisible({ timeout: 25_000 });
        const jobButton = workerPage.locator('.cvWorkerRouteQueue button').filter({ hasText: job.title }).first();
        if (await jobButton.count()) await jobButton.click();
        const fileInput = workerPage.locator('input[type="file"]').first();
        await expect(fileInput).toBeAttached();
        await fileInput.setInputFiles({
          name: `studio-human-${run}.png`,
          mimeType: 'image/png',
          buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=', 'base64'),
        });
        const responsePromise = workerPage.waitForResponse(
          (response) => /\/api\/worker\/field-slip$/.test(new URL(response.url()).pathname) && response.request().method() === 'POST',
          { timeout: 25_000 },
        );
        await workerPage.getByRole('button', { name: /Send 1 proof item/i }).click();
        expect((await responsePromise).ok(), 'Worker proof request failed').toBeTruthy();
      });

      await test.step('Worker taps every lifecycle button and each state persists', async () => {
        await clickWorkerStep(workerPage, request, workerToken, job.jobId, job.title, 'Acknowledge', /acknowledged|acknowledge/);
        await clickWorkerStep(workerPage, request, workerToken, job.jobId, job.title, 'Start', /in_progress|started|start/);
        await clickWorkerStep(workerPage, request, workerToken, job.jobId, job.title, 'Pause', /paused|pause/);
        await clickWorkerStep(workerPage, request, workerToken, job.jobId, job.title, 'Resume', /in_progress|resumed|resume/);
        await clickWorkerStep(workerPage, request, workerToken, job.jobId, job.title, 'Complete', /completed|complete/);
      });

      await test.step('Worker sends a judgement issue and owner sees it in Command', async () => {
        await workerPage.goto(`${BASE_URL}/worker/messages`, { waitUntil: 'domcontentloaded' });
        await workerPage.getByPlaceholder('What changed?', { exact: true }).fill(issueToken);
        const responsePromise = workerPage.waitForResponse(
          (response) => /\/api\/worker\/field-slip$/.test(new URL(response.url()).pathname) && response.request().method() === 'POST',
          { timeout: 25_000 },
        );
        await workerPage.getByRole('button', { name: 'Send to Command', exact: true }).click();
        expect((await responsePromise).ok(), 'Worker issue request failed').toBeTruthy();

        await ownerPage.goto(`${BASE_URL}/dashboard#command`, { waitUntil: 'domcontentloaded' });
        await expect(ownerPage.locator('[data-churvox-layout="fresh-studio"]')).toBeVisible({ timeout: 25_000 });
        await expect.poll(async () => (await ownerPage.locator('body').innerText()).includes(issueToken), {
          message: 'Worker issue did not appear in owner Command',
          timeout: 30_000,
          intervals: [700, 1200, 2200, 3500],
        }).toBe(true);
      });

      await test.step('Owner opens the completed job and prepares the invoice through Studio', async () => {
        await ownerPage.goto(`${BASE_URL}/dashboard#jobs`, { waitUntil: 'domcontentloaded' });
        await expect(ownerPage.getByText(job.title).first()).toBeVisible({ timeout: 30_000 });
        await ownerPage.locator('button').filter({ hasText: job.title }).first().click();
        const drawer = ownerPage.getByRole('dialog', { name: /Open job/i });
        await expect(drawer).toBeVisible();
        const prepare = drawer.getByRole('button', { name: /Prepare invoice/i });
        await expect(prepare).toBeVisible({ timeout: 15_000 });
        const responsePromise = ownerPage.waitForResponse(
          (response) => new RegExp(`/api/jobs/${job.jobId}/(?:create-invoice-draft|invoice-draft)$`).test(new URL(response.url()).pathname) && response.request().method() === 'POST',
          { timeout: 25_000 },
        );
        await prepare.click();
        const response = await responsePromise;
        const body = await bodyOf(response);
        expect(response.ok(), `Invoice preparation failed ${response.status()}: ${JSON.stringify(body).slice(0, 800)}`).toBeTruthy();
        invoiceId = idOf(body.invoice || body.record || body.data?.invoice || body.data?.record || body.data || body);
        await expect(ownerPage.getByText(/Draft invoice prepared/i).first()).toBeVisible({ timeout: 10_000 });
      });

      await test.step('Owner can see the prepared invoice and worker can log out cleanly', async () => {
        await ownerPage.goto(`${BASE_URL}/dashboard#invoices`, { waitUntil: 'domcontentloaded' });
        await expect(ownerPage.locator('[data-churvox-layout="fresh-studio"]')).toBeVisible({ timeout: 25_000 });
        await expect.poll(async () => {
          const text = await ownerPage.locator('body').innerText();
          return text.includes(client.name) || text.includes(job.title) || /Draft/.test(text);
        }, { timeout: 25_000, intervals: [700, 1200, 2200] }).toBe(true);

        await workerPage.getByRole('button', { name: 'Log out', exact: true }).click();
        await expect.poll(() => workerPage.url(), { timeout: 15_000 }).toMatch(/\/login/);
        expect(await workerPage.evaluate(() => localStorage.getItem('token') || '')).toBe('');
      });
    } finally {
      await closeAuditCommandItems(request, ownerToken, [issueToken, job.title, client.name]);
      await cleanupRecord(request, ownerToken, 'invoices', invoiceId, client.name);
      await cleanupRecord(request, ownerToken, 'jobs', job.jobId, job.title);
      await cleanupRecord(request, ownerToken, 'clients', client.id, client.name);
      await workerContext.close();
      await ownerContext.close();
    }
  });
});
