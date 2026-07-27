const { test, expect } = require('@playwright/test');

const BASE_URL = (process.env.PLAYWRIGHT_BASE_URL || 'https://www.churvox.com').replace(/\/+$/, '');
const REQUEST_BASE = (process.env.PLAYWRIGHT_REQUEST_BASE || BASE_URL).replace(/\/+$/, '');
const OWNER_EMAIL = String(process.env.CHURVOX_OWNER_EMAIL || '').trim().toLowerCase();
const OWNER_PASSWORD = process.env.CHURVOX_OWNER_PASSWORD || '';
const WORKER_EMAIL = String(process.env.CHURVOX_WORKER_EMAIL || '').trim().toLowerCase();
const WORKER_PASSWORD = process.env.CHURVOX_WORKER_PASSWORD || OWNER_PASSWORD;
const RUN_ID = String(process.env.GITHUB_RUN_ID || `local-${process.pid}`);

function apiUrl(path) {
  return `${REQUEST_BASE}${path.startsWith('/api') ? path : `/api${path}`}`;
}

function idOf(row = {}) {
  const raw = row.id || row._id || row.job_id || row.worker_id || row.client_id || row.invoice_id || row.quote_id || row.source_id || '';
  return typeof raw === 'object' ? String(raw.$oid || raw.oid || raw.id || '') : String(raw || '');
}

function rowsFrom(payload) {
  const body = payload?.data?.data ?? payload?.data ?? payload;
  if (Array.isArray(body)) return body;
  for (const key of ['items', 'records', 'results', 'workers', 'team', 'members', 'jobs', 'clients', 'quotes', 'invoices', 'slips', 'data']) {
    if (Array.isArray(body?.[key])) return body[key];
  }
  return [];
}

function tokenFrom(body = {}) {
  return body.token || body.access_token || body.auth_token || body.user?.token || body.data?.token || body.data?.user?.token || '';
}

function contains(row, token) {
  return JSON.stringify(row || {}).toLowerCase().includes(String(token || '').toLowerCase());
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function bodyOf(response) {
  return response.json().catch(async () => ({ text: await response.text().catch(() => '') }));
}

async function login(request, email, password, label) {
  const failures = [];
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await request.post(apiUrl('/api/auth/login'), { data: { email, password }, timeout: 60_000 });
      const body = await bodyOf(response);
      if (response.ok()) {
        const token = tokenFrom(body);
        if (token) return token;
      }
      failures.push(`attempt ${attempt}: HTTP ${response.status()} ${JSON.stringify(body).slice(0, 300)}`);
    } catch (error) {
      failures.push(`attempt ${attempt}: ${error?.message || error}`);
    }
    if (attempt < 4) await sleep(1000 * attempt);
  }
  throw new Error(`${label} login failed after 4 attempts via ${REQUEST_BASE}: ${failures.join(' | ')}`);
}

async function api(request, method, path, token, data) {
  const response = await request[method](apiUrl(path), {
    headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(data === undefined ? {} : { data }),
    timeout: 60_000,
  });
  return { response, body: await bodyOf(response) };
}

async function firstGood(calls, label) {
  const failures = [];
  for (const [name, call] of calls) {
    const result = await call();
    if (result.response.ok() && result.body?.success !== false) return result;
    failures.push(`${name} ${result.response.status()} ${JSON.stringify(result.body).slice(0, 500)}`);
  }
  throw new Error(`${label} failed: ${failures.join(' | ')}`);
}

async function seed(context, token, email, role) {
  await context.addInitScript(({ tokenValue, emailValue, roleValue }) => {
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

async function linkedWorker(request, ownerToken) {
  for (const endpoint of ['/api/team/workers', '/api/team', '/api/workers']) {
    const result = await api(request, 'get', endpoint, ownerToken);
    if (!result.response.ok()) continue;
    const found = rowsFrom(result.body).find((row) => String(row.email || row.worker_email || row.user_email || '').trim().toLowerCase() === WORKER_EMAIL);
    if (found) return found;
  }
  throw new Error(`Linked worker ${WORKER_EMAIL} was not found.`);
}

async function createClientByHuman(page, run) {
  const name = `STUDIO HUMAN CLIENT ${run}`;
  await page.goto(`${BASE_URL}/dashboard#clients`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-churvox-layout="fresh-studio"]')).toBeVisible({ timeout: 25_000 });
  await page.getByRole('button', { name: /^Create$/i }).click();
  const menu = page.getByRole('dialog', { name: /Create in Churvox/i });
  await expect(menu).toBeVisible();
  const clientButton = menu.getByRole('button', { name: /02 Client Create a complete relationship/i });
  await expect(clientButton, 'Current Create menu did not expose Client').toBeVisible();
  await clientButton.click();

  const drawer = page.getByRole('dialog', { name: /Create client/i });
  await expect(drawer).toBeVisible();
  await drawer.getByLabel('Name', { exact: true }).fill(name);
  await drawer.getByLabel('Phone', { exact: true }).fill('021 555 0199');
  await drawer.getByLabel('Email', { exact: true }).fill(`studio-human-${run.replace(/[^a-z0-9]/gi, '')}@example.com`);
  await drawer.getByLabel('Address', { exact: true }).fill('1 Studio Audit Street, Wellington');
  await drawer.getByLabel('Access notes', { exact: true }).fill(`STUDIO HUMAN access note ${run}`);

  const responsePromise = page.waitForResponse(
    (response) => /\/api\/clients(?:\/create)?$/.test(new URL(response.url()).pathname) && response.request().method() === 'POST',
    { timeout: 60_000 },
  );
  await drawer.getByRole('button', { name: /Create record/i }).click();
  const response = await responsePromise;
  expect(response.ok(), `Client creation failed with ${response.status()}`).toBeTruthy();
  await expect(page.getByText(/Record created/i).first()).toBeVisible({ timeout: 15_000 });
  return name;
}

async function createQuoteAndConvertByHuman(page, request, ownerToken, workerToken, worker, run, clientName) {
  const workerId = idOf(worker);
  expect(workerId, 'Linked worker has no stable id').toBeTruthy();
  const quoteTitle = `STUDIO HUMAN QUOTE ${run}`;
  const quoteCreate = await firstGood([
    ['POST /api/quotes', () => api(request, 'post', '/api/quotes', ownerToken, {
      title: quoteTitle,
      quote_title: quoteTitle,
      client_name: clientName,
      customer_name: clientName,
      customer_email: `studio-human-${run.replace(/[^a-z0-9]/gi, '')}@example.com`,
      amount: 149,
      total: 149,
      status: 'Draft',
      scope: `STUDIO HUMAN quote scope ${run}`,
      description: `STUDIO HUMAN quote scope ${run}`,
      terms: 'Valid for 14 days',
      source: 'studio-human-commercial-loop-v4',
    })],
    ['POST /api/quotes/create', () => api(request, 'post', '/api/quotes/create', ownerToken, {
      title: quoteTitle,
      quote_title: quoteTitle,
      client_name: clientName,
      customer_name: clientName,
      amount: 149,
      status: 'Draft',
      scope: `STUDIO HUMAN quote scope ${run}`,
      source: 'studio-human-commercial-loop-v4',
    })],
  ], 'quote creation');

  let quoteId = idOf(quoteCreate.body.quote || quoteCreate.body.record || quoteCreate.body.data?.quote || quoteCreate.body.data || quoteCreate.body);
  if (!quoteId) {
    await expect.poll(async () => {
      const listed = await api(request, 'get', `/api/quotes?ts=${Date.now()}`, ownerToken);
      quoteId = idOf(rowsFrom(listed.body).find((row) => contains(row, quoteTitle)));
      return Boolean(quoteId);
    }, { timeout: 45_000, intervals: [500, 1000, 2000, 4000] }).toBe(true);
  }

  await page.goto(`${BASE_URL}/dashboard#quotes`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(quoteTitle).first()).toBeVisible({ timeout: 45_000 });
  await page.locator('button').filter({ hasText: quoteTitle }).first().click();
  const drawer = page.getByRole('dialog', { name: /Open quote/i });
  await expect(drawer).toBeVisible();

  await drawer.getByRole('button', { name: /Mark accepted/i }).click();
  await expect.poll(async () => {
    try {
      const listed = await api(request, 'get', `/api/quotes?ts=${Date.now()}`, ownerToken);
      const quote = rowsFrom(listed.body).find((row) => idOf(row) === quoteId || contains(row, quoteTitle));
      return /accepted/i.test(String(quote?.status || quote?.state || ''));
    } catch {
      return false;
    }
  }, {
    timeout: 90_000,
    intervals: [700, 1200, 2500, 5000],
    message: 'Mark accepted did not persist the quote as Accepted',
  }).toBe(true);

  const convertResponsePromise = page.waitForResponse(
    (response) => response.request().method() === 'POST' && response.ok() && new RegExp(`/api/quotes/${quoteId}/convert(?:-to-job)?$`).test(new URL(response.url()).pathname),
    { timeout: 60_000 },
  );
  const convertButton = drawer.getByRole('button', { name: /Convert to job/i });
  await expect(convertButton).toBeVisible({ timeout: 30_000 });
  await convertButton.click();
  const convertResponse = await convertResponsePromise;
  const convertBody = await bodyOf(convertResponse);

  let jobId = idOf(convertBody.job || convertBody.record || convertBody.data?.job || convertBody.data?.record || convertBody.data || convertBody);
  let jobRow = null;
  await expect.poll(async () => {
    const listed = await api(request, 'get', `/api/jobs?ts=${Date.now()}`, ownerToken);
    jobRow = rowsFrom(listed.body).find((row) => idOf(row) === jobId || contains(row, quoteTitle) || (contains(row, clientName) && contains(row, '149')));
    if (!jobId) jobId = idOf(jobRow);
    return Boolean(jobId && jobRow);
  }, { timeout: 60_000, intervals: [700, 1200, 2500, 5000], message: 'Converted quote did not create a linked job' }).toBe(true);

  const jobTitle = String(jobRow.title || jobRow.job_title || jobRow.name || quoteTitle);
  const assignmentPayload = {
    assigned_worker_id: workerId,
    worker_id: workerId,
    assigned_worker_name: worker.name || worker.full_name || worker.email || WORKER_EMAIL,
    worker_name: worker.name || worker.full_name || worker.email || WORKER_EMAIL,
    worker_email: WORKER_EMAIL,
    scheduled_date: new Date().toISOString().slice(0, 10),
    scheduled_time: '09:00',
    status: 'assigned',
    worker_instructions: `STUDIO HUMAN instruction ${run}: complete, attach proof and report extra work.`,
    notes: `STUDIO HUMAN instruction ${run}`,
  };
  await firstGood([
    ['PATCH converted job', () => api(request, 'patch', `/api/jobs/${jobId}`, ownerToken, assignmentPayload)],
    ['POST converted job assign', () => api(request, 'post', `/api/jobs/${jobId}/assign`, ownerToken, assignmentPayload)],
  ], 'converted job assignment');

  await expect.poll(async () => {
    const listed = await api(request, 'get', `/api/worker/jobs?ts=${Date.now()}`, workerToken);
    return listed.response.ok() && rowsFrom(listed.body).some((row) => idOf(row) === jobId || contains(row, jobTitle));
  }, { timeout: 60_000, intervals: [700, 1200, 2500, 5000], message: 'Assigned converted job did not reach worker queue' }).toBe(true);

  return { id: jobId, title: jobTitle, quoteId, quoteTitle };
}

async function workerAction(page, jobId, label) {
  const endpoint = label.toLowerCase();
  const responsePromise = page.waitForResponse(
    (response) => response.request().method() === 'POST' && response.ok() && new RegExp(`/api/worker/jobs/${jobId}/${endpoint}`).test(response.url()),
    { timeout: 60_000 },
  );
  await page.getByRole('button', { name: new RegExp(`^${label}$`, 'i') }).click();
  await responsePromise;
}

test.describe('Current Studio real commercial and owner-worker mutation v4', () => {
  test.setTimeout(900_000);

  test('quote becomes assigned job, worker completes it, Command receives issue and owner prepares linked invoice', async ({ browser, request }) => {
    if (!OWNER_EMAIL || !OWNER_PASSWORD || !WORKER_EMAIL || !WORKER_PASSWORD) throw new Error('Real owner and worker credentials are required.');

    const ownerToken = await login(request, OWNER_EMAIL, OWNER_PASSWORD, 'owner');
    const workerToken = await login(request, WORKER_EMAIL, WORKER_PASSWORD, 'worker');
    const worker = await linkedWorker(request, ownerToken);
    const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    const run = `run-${RUN_ID}-${timestamp}`;
    const issue = `STUDIO HUMAN ISSUE ${run}: extra work needs owner judgement`;

    const ownerContext = await browser.newContext({ serviceWorkers: 'block' });
    const workerContext = await browser.newContext({ serviceWorkers: 'block' });
    await seed(ownerContext, ownerToken, OWNER_EMAIL, 'owner');
    await seed(workerContext, workerToken, WORKER_EMAIL, 'worker');
    const ownerPage = await ownerContext.newPage();
    const workerPage = await workerContext.newPage();

    try {
      const clientName = await test.step('Owner creates client through Studio UI', () => createClientByHuman(ownerPage, run));
      const job = await test.step('Owner accepts quote, converts it to a job and assigns the worker', () => createQuoteAndConvertByHuman(ownerPage, request, ownerToken, workerToken, worker, run, clientName));

      await test.step('Worker attaches proof and completes every field state', async () => {
        await workerPage.goto(`${BASE_URL}/worker/jobs`, { waitUntil: 'domcontentloaded' });
        await expect(workerPage.getByText(job.title).first()).toBeVisible({ timeout: 60_000 });
        const jobButton = workerPage.locator('.cvWorkerRouteQueue button').filter({ hasText: job.title }).first();
        if (await jobButton.count()) await jobButton.click();

        const input = workerPage.locator('input[type="file"]').first();
        await expect(input).toBeAttached();
        await input.setInputFiles({
          name: `studio-human-${run}.png`,
          mimeType: 'image/png',
          buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=', 'base64'),
        });
        const proofPromise = workerPage.waitForResponse(
          (response) => /\/api\/worker\/field-slip$/.test(new URL(response.url()).pathname) && response.request().method() === 'POST' && response.ok(),
          { timeout: 60_000 },
        );
        await workerPage.getByRole('button', { name: /Send 1 proof item/i }).click();
        await proofPromise;

        for (const label of ['Acknowledge', 'Start', 'Pause', 'Resume', 'Complete']) {
          await workerAction(workerPage, job.id, label);
        }
      });

      await test.step('Worker sends issue to Command and owner sees it', async () => {
        await workerPage.goto(`${BASE_URL}/worker/messages`, { waitUntil: 'domcontentloaded' });
        await workerPage.getByPlaceholder('What changed?', { exact: true }).fill(issue);
        const responsePromise = workerPage.waitForResponse(
          (response) => /\/api\/worker\/field-slip$/.test(new URL(response.url()).pathname) && response.request().method() === 'POST' && response.ok(),
          { timeout: 60_000 },
        );
        await workerPage.getByRole('button', { name: 'Send to Command', exact: true }).click();
        await responsePromise;

        await ownerPage.goto(`${BASE_URL}/dashboard#command`, { waitUntil: 'domcontentloaded' });
        await expect.poll(async () => (await ownerPage.locator('body').innerText()).includes(issue), {
          timeout: 60_000,
          intervals: [700, 1200, 2500, 5000],
          message: 'Owner Command did not receive worker issue',
        }).toBe(true);
      });

      await test.step('Owner prepares invoice from completed converted job', async () => {
        await ownerPage.goto(`${BASE_URL}/dashboard#jobs`, { waitUntil: 'domcontentloaded' });
        await expect(ownerPage.getByText(job.title).first()).toBeVisible({ timeout: 60_000 });
        await ownerPage.locator('button').filter({ hasText: job.title }).first().click();
        const drawer = ownerPage.getByRole('dialog', { name: /Open job/i });
        await expect(drawer).toBeVisible();
        const prepare = drawer.getByRole('button', { name: /Prepare invoice/i });
        await expect(prepare).toBeVisible({ timeout: 30_000 });
        const responsePromise = ownerPage.waitForResponse(
          (response) => {
            if (response.request().method() !== 'POST' || !response.ok()) return false;
            const path = new URL(response.url()).pathname;
            return path === '/api/invoices' || new RegExp(`/api/jobs/${job.id}/(?:create-invoice-draft|invoice-draft)$`).test(path);
          },
          { timeout: 60_000 },
        );
        await prepare.click();
        await responsePromise;
        await expect(ownerPage.getByText(/Draft invoice prepared/i).first()).toBeVisible({ timeout: 15_000 });

        await expect.poll(async () => {
          const listed = await api(request, 'get', `/api/invoices?ts=${Date.now()}`, ownerToken);
          if (!listed.response.ok()) return false;
          return rowsFrom(listed.body).some((invoice) => (contains(invoice, job.id) || contains(invoice, job.title)) && /draft/i.test(JSON.stringify(invoice)));
        }, {
          timeout: 60_000,
          intervals: [700, 1200, 2500, 5000],
          message: 'Prepared draft invoice was not linked to the completed converted job',
        }).toBe(true);
      });
    } finally {
      await workerContext.close();
      await ownerContext.close();
    }
  });
});
