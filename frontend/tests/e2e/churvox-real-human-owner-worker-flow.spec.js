const { test, expect } = require('@playwright/test');

const BASE_URL = (process.env.PLAYWRIGHT_BASE_URL || 'https://www.churvox.com').replace(/\/+$/, '');
const API_BASE = (process.env.PLAYWRIGHT_API_BASE || 'https://grassley-backend.onrender.com').replace(/\/+$/, '');
const OWNER_EMAIL = process.env.CHURVOX_OWNER_EMAIL || '';
const OWNER_PASSWORD = process.env.CHURVOX_OWNER_PASSWORD || '';
const WORKER_EMAIL = process.env.CHURVOX_WORKER_EMAIL || '';
const WORKER_PASSWORD = process.env.CHURVOX_WORKER_PASSWORD || '';

function stamp() {
  return new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
}

function apiUrl(path) {
  return `${API_BASE}${path.startsWith('/api') ? path : `/api${path}`}`;
}

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function todayPlus(days) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

function textHas(value, token) {
  return JSON.stringify(value || {}).toLowerCase().includes(String(token || '').toLowerCase());
}

function rowsFrom(payload) {
  const data = payload?.data?.data ?? payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  for (const key of ['items', 'records', 'results', 'workers', 'team', 'members', 'jobs', 'clients', 'quotes', 'invoices', 'messages', 'actions', 'notifications', 'data']) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

function idOf(value) {
  if (!value) return '';
  const raw = value.id || value._id || value.job_id || value.client_id || value.worker_id || value.user_id || value.quote_id || value.invoice_id || '';
  if (typeof raw === 'object') return String(raw.$oid || raw.oid || raw.id || raw._id || '');
  return String(raw || '');
}

async function bodyOf(response) {
  return response.json().catch(async () => ({ text: await response.text().catch(() => '') }));
}

async function apiLogin(request, email, password, label) {
  const response = await request.post(apiUrl('/api/auth/login'), {
    data: { email, password },
    timeout: 30_000,
  });
  const body = await bodyOf(response);
  const token = body.token || body.access_token || body.auth_token || body.jwt || body.data?.token || body.user?.token || '';
  expect(response.ok(), `${label} API login failed ${response.status()}: ${JSON.stringify(body).slice(0, 900)}`).toBeTruthy();
  expect(token, `${label} API login should return a token`).toBeTruthy();
  return token;
}

async function authedGet(request, token, path) {
  const response = await request.get(apiUrl(path), {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 30_000,
  });
  return { ok: response.ok(), status: response.status(), body: await bodyOf(response) };
}

async function authedWrite(request, token, method, path, data) {
  const options = {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 30_000,
  };
  if (data !== undefined) options.data = data;
  const response = await request[method](apiUrl(path), options);
  return { ok: response.ok(), status: response.status(), body: await bodyOf(response) };
}

async function findWorker(request, ownerToken) {
  for (const endpoint of ['/api/team/workers', '/api/team', '/api/workers']) {
    const result = await authedGet(request, ownerToken, `${endpoint}?ts=${Date.now()}`);
    if (!result.ok) continue;
    const worker = rowsFrom(result.body).find((row) => String(row.email || row.worker_email || row.user_email || '').toLowerCase() === WORKER_EMAIL.toLowerCase());
    if (worker) return worker;
  }
  throw new Error(`Could not find linked worker ${WORKER_EMAIL}.`);
}

async function newHumanContext(browser) {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  await context.addInitScript(() => {
    try {
      navigator.serviceWorker?.getRegistrations?.().then((registrations) => registrations.forEach((registration) => registration.unregister()));
    } catch {}
    try {
      caches?.keys?.().then((keys) => keys.forEach((key) => caches.delete(key)));
    } catch {}
  });
  return context;
}

async function clearSession(page) {
  await page.goto(`${BASE_URL}/?e2e=${Date.now()}`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

async function uiLogin(page, email, password, label) {
  await clearSession(page);
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel(/email/i).first().fill(email);
  await page.getByLabel(/password/i).first().fill(password);
  await page.getByRole('button', { name: /sign in|log in/i }).first().click();
  await page.waitForFunction(() => Boolean(localStorage.getItem('token')), null, { timeout: 30_000 });
  const token = await page.evaluate(() => localStorage.getItem('token') || '');
  expect(token, `${label} login did not create an authenticated session`).toBeTruthy();
  await expect.poll(() => page.url(), { timeout: 20_000 }).not.toMatch(/\/login(?:[?#]|$)/i);
  return token;
}

async function gotoOwnerSection(page, name) {
  await page.goto(`${BASE_URL}/dashboard#today`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  const direct = page.getByRole('button', { name: new RegExp(`^${name}(?:\\s+\\d+)?$`, 'i') }).first();
  if (await direct.isVisible().catch(() => false)) {
    await direct.click();
  } else {
    const more = page.getByRole('button', { name: /^More$/i }).first();
    if (await more.isVisible().catch(() => false)) {
      if ((await more.getAttribute('aria-expanded')) !== 'true') await more.click();
      const menuItem = page.getByRole('menuitem', { name: new RegExp(`^${name}$`, 'i') }).first();
      if (await menuItem.isVisible().catch(() => false)) await menuItem.click();
      else await page.goto(`${BASE_URL}/dashboard#${name.toLowerCase()}`, { waitUntil: 'domcontentloaded' });
    } else {
      await page.goto(`${BASE_URL}/dashboard#${name.toLowerCase()}`, { waitUntil: 'domcontentloaded' });
    }
  }

  await page.waitForTimeout(900);
  const body = clean(await page.locator('body').innerText({ timeout: 15_000 }));
  expect(body, `${name} page should not be the login screen`).not.toMatch(/WELCOME BACK|Sign in to see|Forgot password/i);
  expect(body, `${name} page should not crash`).not.toMatch(/Something went wrong|Application error|Cannot read properties|Minified React error/i);
  return body;
}

async function clickButton(page, label, scope = page) {
  const button = scope.getByRole('button', { name: label }).first();
  await expect(button, `button ${label} should exist`).toBeVisible({ timeout: 20_000 });
  await button.click();
  await page.waitForTimeout(400);
}

async function visibleForm(page) {
  const form = page.locator('.cvxDrawerLayer:visible, [role="dialog"]:visible, .cvxDrawer:visible').first();
  await expect(form, 'working drawer/form should open').toBeVisible({ timeout: 20_000 });
  return form;
}

async function fillField(name, value, scope) {
  const field = scope.getByLabel(new RegExp(`^${name}$`, 'i')).first();
  await expect(field, `field ${name} should be visible`).toBeVisible({ timeout: 15_000 });
  const tag = await field.evaluate((element) => element.tagName.toLowerCase());
  if (tag === 'select') {
    const options = await field.locator('option').allTextContents();
    const exact = options.find((option) => clean(option).toLowerCase() === clean(value).toLowerCase());
    const partial = options.find((option) => clean(option).toLowerCase().includes(clean(value).toLowerCase()));
    await field.selectOption({ label: exact || partial || options[0] });
  } else {
    await field.fill(String(value));
  }
}

async function saveDrawer(page, endpointPattern, label) {
  const responsePromise = page.waitForResponse(
    (response) => endpointPattern.test(response.url()) && ['POST', 'PATCH', 'PUT'].includes(response.request().method()),
    { timeout: 30_000 }
  );
  await clickButton(page, /Create record|Save record|Save/i);
  const response = await responsePromise;
  const body = await bodyOf(response);
  expect(response.ok(), `${label} save failed ${response.status()}: ${JSON.stringify(body).slice(0, 900)}`).toBeTruthy();
  await page.waitForTimeout(1000);
  return body;
}

async function expectBodyHas(page, token, label) {
  await expect.poll(async () => clean(await page.locator('body').innerText()), {
    timeout: 20_000,
    message: `${label} should appear on page`,
  }).toContain(token);
}

async function waitForApiText(request, token, path, wanted, label) {
  let last = null;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    last = await authedGet(request, token, `${path}?ts=${Date.now()}`);
    if (last.ok && textHas(last.body, wanted)) return last.body;
    await new Promise((resolve) => setTimeout(resolve, 800));
  }
  throw new Error(`${label} did not contain ${wanted}. Last: ${JSON.stringify(last).slice(0, 1200)}`);
}

async function createClient(page, data) {
  await gotoOwnerSection(page, 'Clients');
  await clickButton(page, /Add client/i);
  const form = await visibleForm(page);
  await fillField('Name', data.clientName, form);
  await fillField('Phone', '0210000000', form);
  await fillField('Email', data.clientEmail, form);
  await fillField('Address', data.address, form);
  await fillField('Preferred service', 'Lawn mowing', form);
  await fillField('Saved price', data.amount, form);
  await fillField('Preferred schedule', 'Weekly', form);
  await fillField('Access notes', `Human test access notes ${data.id}`, form);
  await saveDrawer(page, /\/api\/clients(?:\/create)?(?:\?|$)/, 'client UI create');
  await gotoOwnerSection(page, 'Clients');
  await expectBodyHas(page, data.clientName, 'new client');
}

async function createJob(page, data) {
  await gotoOwnerSection(page, 'Jobs');
  await clickButton(page, /Add job/i);
  const form = await visibleForm(page);
  await fillField('Job name', data.jobName, form);
  await fillField('Client', data.clientName, form);
  await fillField('Site address', data.address, form);
  await fillField('Service', 'Lawn mowing', form);
  await fillField('Assigned worker', data.workerName, form);
  await fillField('Scheduled date', todayPlus(1), form);
  await fillField('Start time', '09:00', form);
  await fillField('Price NZD', data.amount, form);
  await fillField('Billing type', 'Fixed price', form);
  await fillField('Frequency', 'Weekly', form);
  await fillField('Status', 'assigned', form);
  await fillField('Proof/photos', 'Required before finish', form);
  await fillField('Job notes', `Human test job notes ${data.id}`, form);
  const body = await saveDrawer(page, /\/api\/jobs(?:\/create)?(?:\?|$)/, 'job UI create');
  data.jobId = idOf(body.job || body.data?.job || body.data || body);
  await gotoOwnerSection(page, 'Jobs');
  await expectBodyHas(page, data.jobName, 'new job');
  expect(data.jobId, `job save should return id: ${JSON.stringify(body).slice(0, 900)}`).toBeTruthy();
}

async function createQuote(page, data) {
  await gotoOwnerSection(page, 'Quotes');
  await clickButton(page, /Add quote|New quote|Create quote/i);
  const form = await visibleForm(page);
  await fillField('Quote', data.quoteName, form);
  await fillField('Client', data.clientName, form);
  await fillField('Amount', data.amount, form);
  await fillField('Status', 'Ready', form);
  await fillField('Scope', `Human quote scope ${data.id}`, form);
  await fillField('Terms', 'Valid for 14 days', form);
  await fillField('Follow-up', todayPlus(3), form);
  await fillField('Next step', 'Owner review in Command', form);
  await saveDrawer(page, /\/api\/quotes(?:\/create)?(?:\?|$)/, 'quote UI create');
  await gotoOwnerSection(page, 'Quotes');
  await expectBodyHas(page, data.quoteName, 'new quote');
}

async function createInvoice(page, data) {
  await gotoOwnerSection(page, 'Invoices');
  await clickButton(page, /Add invoice|New invoice|Create invoice/i);
  const form = await visibleForm(page);
  await fillField('Invoice', data.invoiceNumber, form);
  await fillField('Client', data.clientName, form);
  await fillField('Job', data.jobName, form);
  await fillField('Amount', data.amount, form);
  await fillField('Due date', todayPlus(7), form);
  await fillField('Status', 'Draft', form);
  await fillField('Xero/MYOB status', 'Command approval', form);
  await fillField('Line item', `Human invoice line ${data.id}`, form);
  await fillField('Evidence', `Human invoice evidence ${data.id}`, form);
  await saveDrawer(page, /\/api\/invoices(?:\/create)?(?:\?|$)/, 'invoice UI create');
  await gotoOwnerSection(page, 'Invoices');
  await expectBodyHas(page, data.invoiceNumber, 'new invoice');
}

async function selectWorkerJob(page, jobName) {
  await page.goto(`${BASE_URL}/worker/jobs`, { waitUntil: 'domcontentloaded' });
  const job = page.getByRole('button', { name: new RegExp(jobName, 'i') }).first();
  await expect(job, 'worker should see the assigned job in the real queue').toBeVisible({ timeout: 30_000 });
  await job.click();
  await expect(page.locator('body')).toContainText(jobName, { timeout: 15_000 });
}

async function clickWorkerStatus(page, label, endpoint) {
  const responsePromise = page.waitForResponse(
    (response) => new RegExp(`/api/worker/jobs/[^/]+/${endpoint}(?:\\?|$)`).test(response.url()) && response.request().method() === 'POST',
    { timeout: 30_000 }
  );
  await page.getByRole('button', { name: new RegExp(`^${label}$`, 'i') }).click();
  const response = await responsePromise;
  expect(response.ok(), `${label} should update the live assigned job`).toBeTruthy();
}

async function workerDoesJob(page, data) {
  await uiLogin(page, WORKER_EMAIL, WORKER_PASSWORD, 'worker');
  await selectWorkerJob(page, data.jobName);

  await clickWorkerStatus(page, 'Acknowledge', 'acknowledge');
  await clickWorkerStatus(page, 'Start', 'start');

  const note = page.getByPlaceholder(/What changed on this job/i).first();
  await expect(note, 'worker job-note input should exist beside proof controls').toBeVisible({ timeout: 15_000 });
  await note.fill(data.proofText);

  const fileInput = page.locator('input[type="file"]').first();
  await expect(fileInput, 'worker proof photo input should exist').toBeAttached();
  await fileInput.setInputFiles({
    name: `human-proof-${data.id}.png`,
    mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=', 'base64'),
  });

  const proofResponse = page.waitForResponse(
    (response) => /\/api\/worker\/field-slip(?:\?|$)/.test(response.url()) && response.request().method() === 'POST',
    { timeout: 30_000 }
  );
  await page.getByRole('button', { name: /Send .*proof|Send proof note/i }).first().click();
  expect((await proofResponse).ok(), 'worker proof should reach the live field-slip endpoint').toBeTruthy();

  const coach = page.getByRole('region', { name: /Worker Proof Coach/i }).first();
  if (await coach.isVisible().catch(() => false)) {
    const confirmations = coach.locator('input[type="checkbox"]');
    for (let index = 0; index < await confirmations.count(); index += 1) {
      const checkbox = confirmations.nth(index);
      if (!(await checkbox.isChecked())) await checkbox.check();
    }
  }

  await clickWorkerStatus(page, 'Complete', 'complete');

  await page.goto(`${BASE_URL}/worker/messages`, { waitUntil: 'domcontentloaded' });
  const message = `Worker to boss message ${data.id}`;
  await page.getByPlaceholder(/What changed/i).fill(message);
  const messageResponse = page.waitForResponse(
    (response) => /\/api\/worker\/field-slip(?:\?|$)/.test(response.url()) && response.request().method() === 'POST',
    { timeout: 30_000 }
  );
  await page.getByRole('button', { name: /Send to Command/i }).click();
  expect((await messageResponse).ok(), 'worker message should reach Command').toBeTruthy();
  data.workerMessage = message;
}

async function ownerChecksWorkerUpdates(page, data) {
  const commandBody = await gotoOwnerSection(page, 'Command');
  expect(commandBody, 'Command should remain the owner approval desk').toMatch(/Command|Approval|Approve|Park|owner/i);
  expect(commandBody, 'Command should receive worker proof or message').toMatch(new RegExp(`${data.proofText}|${data.workerMessage}|job_proof|worker_message|Worker`, 'i'));

  await gotoOwnerSection(page, 'Jobs');
  await expectBodyHas(page, data.jobName, 'owner jobs after worker completion');

  const workersBody = await gotoOwnerSection(page, 'Workers');
  expect(workersBody, 'Workers page should show the field team area').toMatch(/Workers|GPS|Proof|Field/i);

  const xeroBody = await gotoOwnerSection(page, 'Xero');
  expect(xeroBody, 'Xero page should keep draft sync only').toMatch(/Draft sync only/i);
  expect(xeroBody, 'Xero page should keep owner approval').toMatch(/Owner-approved|Owner approved/i);
  expect(xeroBody, 'Xero must not imply automatic tax or payouts').toMatch(/No automatic invoice sending|No tax filing|No bank payout files|No payout files/i);
}

async function cleanupCoreRecords(request, ownerToken, data) {
  const resources = [
    ['invoices', '/api/invoices', data.invoiceNumber],
    ['quotes', '/api/quotes', data.quoteName],
    ['jobs', '/api/jobs', data.jobName],
    ['clients', '/api/clients', data.clientName],
  ];
  const failures = [];
  for (const [kind, listPath, marker] of resources) {
    const listed = await authedGet(request, ownerToken, `${listPath}?limit=500&ts=${Date.now()}`);
    if (!listed.ok) continue;
    for (const row of rowsFrom(listed.body).filter((item) => textHas(item, marker))) {
      const id = idOf(row);
      if (!id) continue;
      let result = await authedWrite(request, ownerToken, 'delete', `${listPath}/${encodeURIComponent(id)}`);
      if (!result.ok && kind === 'jobs') {
        result = await authedWrite(request, ownerToken, 'post', `/api/jobs/${encodeURIComponent(id)}/archive`, {
          archived: true,
          archive_reason: 'real human owner-worker flow cleanup',
        });
      }
      if (!result.ok && result.status !== 404) failures.push(`${kind}:${id}:${result.status}`);
    }
  }
  expect(failures, 'human flow should clean its core live records').toEqual([]);
}

test.describe('Churvox real human owner-worker flow', () => {
  test.setTimeout(420_000);

  test('human clicks owner forms, worker proof controls, completion and Command loop', async ({ browser, request }) => {
    if (!OWNER_EMAIL || !OWNER_PASSWORD) throw new Error('Set owner email/password env vars.');
    if (!WORKER_EMAIL || !WORKER_PASSWORD) throw new Error('Set worker email/password env vars.');

    const ownerToken = await apiLogin(request, OWNER_EMAIL, OWNER_PASSWORD, 'owner support');
    const worker = await findWorker(request, ownerToken);
    const workerName = clean(worker.name || worker.full_name || worker.display_name || worker.email || WORKER_EMAIL);
    const id = stamp();
    const data = {
      id,
      workerName,
      amount: '149',
      address: '25 Eastern Hutt Road, Lower Hutt',
      clientName: `Human Client ${id}`,
      clientEmail: `humanclient${id}@example.com`,
      jobName: `Human Job ${id}`,
      quoteName: `Human Quote ${id}`,
      invoiceNumber: `HUMAN-INV-${id}`,
      proofText: `Human worker proof ${id}`,
      workerMessage: '',
      jobId: '',
    };

    const ownerContext = await newHumanContext(browser);
    const workerContext = await newHumanContext(browser);
    const ownerPage = await ownerContext.newPage();
    const workerPage = await workerContext.newPage();

    try {
      await uiLogin(ownerPage, OWNER_EMAIL, OWNER_PASSWORD, 'owner');
      await ownerPage.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
      await expect(ownerPage.locator('body')).toContainText(/Today|Command|Churvox/i, { timeout: 20_000 });

      await createClient(ownerPage, data);
      await waitForApiText(request, ownerToken, '/api/clients', data.clientName, 'clients API after UI create');

      await createJob(ownerPage, data);
      await waitForApiText(request, ownerToken, '/api/jobs', data.jobName, 'jobs API after UI create');

      await createQuote(ownerPage, data);
      await waitForApiText(request, ownerToken, '/api/quotes', data.quoteName, 'quotes API after UI create');

      await createInvoice(ownerPage, data);
      await waitForApiText(request, ownerToken, '/api/invoices', data.invoiceNumber, 'invoices API after UI create');

      await workerDoesJob(workerPage, data);
      await ownerChecksWorkerUpdates(ownerPage, data);
    } finally {
      await cleanupCoreRecords(request, ownerToken, data).catch((error) => console.error(error));
      await workerContext.close();
      await ownerContext.close();
    }
  });
});
