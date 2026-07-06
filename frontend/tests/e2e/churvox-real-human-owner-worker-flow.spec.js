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

async function bodyOf(res) {
  return res.json().catch(async () => ({ text: await res.text().catch(() => '') }));
}

async function apiLogin(request, email, password, label) {
  const res = await request.post(apiUrl('/api/auth/login'), {
    data: { email, password },
    timeout: 15000,
  });
  const body = await bodyOf(res);
  const token = body.token || body.access_token || body.data?.token || body.user?.token || '';
  expect(res.ok(), `${label} API login failed ${res.status()}: ${JSON.stringify(body).slice(0, 900)}`).toBeTruthy();
  expect(token, `${label} API login should return token`).toBeTruthy();
  return token;
}

async function authedGet(request, token, path) {
  const res = await request.get(apiUrl(path), {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 15000,
  });
  return { ok: res.ok(), status: res.status(), body: await bodyOf(res) };
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

async function findWorker(request, ownerToken) {
  for (const endpoint of ['/api/team/workers', '/api/team', '/api/workers']) {
    const res = await authedGet(request, ownerToken, `${endpoint}?ts=${Date.now()}`);
    if (!res.ok) continue;
    const workers = rowsFrom(res.body);
    const found = workers.find((worker) => String(worker.email || worker.worker_email || '').toLowerCase() === WORKER_EMAIL.toLowerCase());
    if (found) return found;
  }
  throw new Error(`Could not find worker ${WORKER_EMAIL}. Add the worker first, then rerun.`);
}


async function newHumanContext(browser) {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  await context.addInitScript(() => {
    try {
      navigator.serviceWorker?.getRegistrations?.().then((registrations) => {
        registrations.forEach((registration) => registration.unregister());
      });
    } catch {}
    try {
      caches?.keys?.().then((keys) => {
        keys.forEach((key) => caches.delete(key));
      });
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

  await Promise.all([
    page.waitForLoadState('domcontentloaded').catch(() => {}),
    page.getByRole('button', { name: /sign in|log in/i }).first().click(),
  ]);

  await page.waitForTimeout(2500);

  const body = clean(await page.locator('body').innerText({ timeout: 15000 }));
  expect(body, `${label} should not still be on login page`).not.toMatch(/WELCOME BACK|Sign in to see|Forgot password/i);

  return body;
}

async function gotoOwnerSection(page, name) {
  const button = page.getByRole('button', { name: new RegExp(`^${name}\\b|${name}`, 'i') }).first();
  if (await button.count()) {
    await button.click();
  } else {
    await page.goto(`${BASE_URL}/dashboard#${name.toLowerCase()}`, { waitUntil: 'domcontentloaded' });
  }
  await page.waitForTimeout(1200);

  const body = clean(await page.locator('body').innerText({ timeout: 10000 }));
  expect(body, `${name} page should not be login page`).not.toMatch(/WELCOME BACK|Sign in to see|Forgot password/i);
  expect(body, `${name} page should not crash`).not.toMatch(/Something went wrong|Application error|Cannot read properties|Minified React error/i);
  return body;
}

async function clickButton(page, label, scope = page) {
  const button = scope.getByRole('button', { name: label }).first();
  await expect(button, `button ${label} should exist`).toBeVisible({ timeout: 15000 });
  await button.click();
  await page.waitForTimeout(500);
}

async function visibleForm(page) {
  const form = page.locator('.cvxDrawerLayer:visible, [role="dialog"]:visible, .cvxDrawer:visible').first();
  await expect(form, 'working drawer/form should open').toBeVisible({ timeout: 15000 });
  return form;
}

async function fillField(page, name, value, scope = null) {
  const root = scope || await visibleForm(page);
  const field = root.getByLabel(new RegExp(`^${name}$`, 'i')).first();
  await expect(field, `field ${name} should be visible`).toBeVisible({ timeout: 10000 });

  const tag = await field.evaluate((el) => el.tagName.toLowerCase());
  if (tag === 'select') {
    const wanted = String(value);
    const options = await field.locator('option').allTextContents();
    const exact = options.find((option) => clean(option).toLowerCase() === clean(wanted).toLowerCase());
    const partial = options.find((option) => clean(option).toLowerCase().includes(clean(wanted).toLowerCase()));
    await field.selectOption({ label: exact || partial || options[0] });
  } else {
    await field.fill(String(value));
  }
}

async function saveDrawer(page, endpointPattern, label) {
  const responsePromise = page.waitForResponse(
    (res) => endpointPattern.test(res.url()) && ['POST', 'PATCH', 'PUT'].includes(res.request().method()),
    { timeout: 20000 }
  ).catch(() => null);

  await clickButton(page, /Create record|Save record|Save/i);

  const response = await responsePromise;
  expect(response, `${label} should send a real save request`).toBeTruthy();

  const body = await bodyOf(response);
  expect(response.ok(), `${label} save failed ${response.status()}: ${JSON.stringify(body).slice(0, 900)}`).toBeTruthy();

  await page.waitForTimeout(1600);
  return body;
}

async function expectBodyHas(page, token, label) {
  await expect.poll(async () => clean(await page.locator('body').innerText()), {
    timeout: 15000,
    message: `${label} should appear on page`,
  }).toContain(token);
}

async function waitForApiText(request, token, path, wanted, label) {
  let last = null;
  for (let i = 0; i < 8; i += 1) {
    last = await authedGet(request, token, `${path}?ts=${Date.now()}`);
    if (last.ok && textHas(last.body, wanted)) return last.body;
    await pageSleep(800);
  }
  throw new Error(`${label} did not contain ${wanted}. Last: ${JSON.stringify(last).slice(0, 1200)}`);
}

function pageSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createClientByHumanClicking(page, data) {
  await gotoOwnerSection(page, 'Clients');
  await clickButton(page, /Add client/i);

  const form = await visibleForm(page);
  await fillField(page, 'Name', data.clientName, form);
  await fillField(page, 'Phone', '0210000000', form);
  await fillField(page, 'Email', data.clientEmail, form);
  await fillField(page, 'Address', data.address, form);
  await fillField(page, 'Preferred service', 'Lawn mowing', form);
  await fillField(page, 'Saved price', data.amount, form);
  await fillField(page, 'Preferred schedule', 'Weekly', form);
  await fillField(page, 'Access notes', `Human test access notes ${data.id}`, form);

  await saveDrawer(page, /\/api\/clients(\/create)?$/, 'client UI create');
  await gotoOwnerSection(page, 'Clients');
  await expectBodyHas(page, data.clientName, 'new client');
}

async function createJobByHumanClicking(page, data) {
  await gotoOwnerSection(page, 'Jobs');
  await clickButton(page, /Add job/i);

  const form = await visibleForm(page);
  await fillField(page, 'Job name', data.jobName, form);
  await fillField(page, 'Client', data.clientName, form);
  await fillField(page, 'Site address', data.address, form);
  await fillField(page, 'Service', 'Lawn mowing', form);
  await fillField(page, 'Assigned worker', data.workerName, form);
  await fillField(page, 'Scheduled date', todayPlus(1), form);
  await fillField(page, 'Start time', '09:00', form);
  await fillField(page, 'Price NZD', data.amount, form);
  await fillField(page, 'Billing type', 'Fixed price', form);
  await fillField(page, 'Frequency', 'Weekly', form);
  await fillField(page, 'Status', 'assigned', form);
  await fillField(page, 'Proof/photos', 'Required before finish', form);
  await fillField(page, 'Job notes', `Human test job notes ${data.id}`, form);

  const body = await saveDrawer(page, /\/api\/jobs(\/create)?$/, 'job UI create');
  const created = body.job || body.data?.job || body.data || body;
  data.jobId = idOf(created);

  await gotoOwnerSection(page, 'Jobs');
  await expectBodyHas(page, data.jobName, 'new job');
  expect(data.jobId, `job save should return id: ${JSON.stringify(body).slice(0, 900)}`).toBeTruthy();
}

async function createQuoteByHumanClicking(page, data) {
  await gotoOwnerSection(page, 'Quotes');
  await clickButton(page, /Add quote|New quote|Create quote/i);

  const form = await visibleForm(page);
  await fillField(page, 'Quote', data.quoteName, form);
  await fillField(page, 'Client', data.clientName, form);
  await fillField(page, 'Amount', data.amount, form);
  await fillField(page, 'Status', 'Ready', form);
  await fillField(page, 'Scope', `Human quote scope ${data.id}`, form);
  await fillField(page, 'Terms', 'Valid for 14 days', form);
  await fillField(page, 'Follow-up', todayPlus(3), form);
  await fillField(page, 'Next step', 'Owner review in Command', form);

  await saveDrawer(page, /\/api\/quotes(\/create)?$/, 'quote UI create');
  await gotoOwnerSection(page, 'Quotes');
  await expectBodyHas(page, data.quoteName, 'new quote');
}

async function createInvoiceByHumanClicking(page, data) {
  await gotoOwnerSection(page, 'Invoices');
  await clickButton(page, /Add invoice|New invoice|Create invoice/i);

  const form = await visibleForm(page);
  await fillField(page, 'Invoice', data.invoiceNumber, form);
  await fillField(page, 'Client', data.clientName, form);
  await fillField(page, 'Job', data.jobName, form);
  await fillField(page, 'Amount', data.amount, form);
  await fillField(page, 'Due date', todayPlus(7), form);
  await fillField(page, 'Status', 'Draft', form);
  await fillField(page, 'Xero/MYOB status', 'Command approval', form);
  await fillField(page, 'Line item', `Human invoice line ${data.id}`, form);
  await fillField(page, 'Evidence', `Human invoice evidence ${data.id}`, form);

  await saveDrawer(page, /\/api\/invoices(\/create)?$/, 'invoice UI create');
  await gotoOwnerSection(page, 'Invoices');
  await expectBodyHas(page, data.invoiceNumber, 'new invoice');
}

async function createOwnerMessageByHumanClicking(page, data) {
  await gotoOwnerSection(page, 'Messages');

  const add = page.getByRole('button', { name: /Add message|New message|Create message|Draft reply|Message/i }).first();
  await expect(add, 'owner Messages page should have a real create-message button').toBeVisible({ timeout: 15000 });
  await add.click();

  const form = await visibleForm(page);
  await fillField(page, 'From', OWNER_EMAIL, form);
  await fillField(page, 'Channel', 'Internal', form);
  await fillField(page, 'Client', data.clientName, form);
  await fillField(page, 'Job', data.jobName, form);
  await fillField(page, 'Subject', data.ownerMessageSubject, form);
  await fillField(page, 'Priority', 'Normal', form);
  await fillField(page, 'Message', data.ownerMessageBody, form);
  await fillField(page, 'Drafted reply', `Worker instruction: ${data.ownerMessageBody}`, form);

  await saveDrawer(page, /\/api\/messages|\/api\/command\/execute-approved/, 'owner message UI create');
  await gotoOwnerSection(page, 'Messages');
  await expectBodyHas(page, data.ownerMessageSubject, 'owner message');
}

async function workerDoesJobLikeHuman(workerPage, data) {
  await uiLogin(workerPage, WORKER_EMAIL, WORKER_PASSWORD, 'worker');

  await workerPage.goto(`${BASE_URL}/worker/jobs`, { waitUntil: 'domcontentloaded' });
  await workerPage.waitForTimeout(2500);

  await expect(workerPage.getByText(data.jobName).first(), 'worker should see assigned job').toBeVisible({ timeout: 20000 });

  const jobCard = workerPage.locator('.swJob').filter({ hasText: data.jobName }).first();
  const openLink = jobCard.getByRole('link', { name: /View job|Open job/i }).first();
  await expect(openLink, 'worker job card should have View/Open job').toBeVisible({ timeout: 10000 });
  await openLink.click();

  await workerPage.waitForTimeout(1600);
  await expect(workerPage.getByText(data.jobName).first(), 'worker job detail should open').toBeVisible({ timeout: 15000 });

  await Promise.all([
    workerPage.waitForResponse((res) => /\/api\/jobs\/[^/]+\/acknowledge|\/api\/worker\/field-slip/.test(res.url()) && res.request().method() === 'POST', { timeout: 20000 }),
    workerPage.getByRole('button', { name: /Acknowledge/i }).click(),
  ]);

  const note = workerPage.getByPlaceholder(/What happened|Access issue|extra work|completed proof|customer note/i).first();
  await expect(note, 'worker note textarea should exist').toBeVisible({ timeout: 10000 });

  await note.fill(data.issueText);
  await Promise.all([
    workerPage.waitForResponse((res) => /\/api\/jobs\/[^/]+\/start|\/api\/worker\/field-slip/.test(res.url()) && res.request().method() === 'POST', { timeout: 20000 }),
    workerPage.getByRole('button', { name: /Start job/i }).click(),
  ]);

  await note.fill(data.issueText);
  await Promise.all([
    workerPage.waitForResponse((res) => /\/api\/worker\/field-slip/.test(res.url()) && res.request().method() === 'POST', { timeout: 20000 }),
    workerPage.getByRole('button', { name: /Send issue to Command/i }).click(),
  ]);

  const fileInput = workerPage.locator('input[type="file"]').first();
  await expect(fileInput, 'worker proof photo input should exist').toBeAttached({ timeout: 10000 });
  await fileInput.setInputFiles({
    name: `human-proof-${data.id}.png`,
    mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=', 'base64'),
  });

  await note.fill(data.proofText);
  await Promise.all([
    workerPage.waitForResponse((res) => /\/api\/worker\/field-slip/.test(res.url()) && res.request().method() === 'POST', { timeout: 20000 }),
    workerPage.getByRole('button', { name: /Send proof \/ note/i }).click(),
  ]);

  await note.fill(data.doneText);
  await Promise.all([
    workerPage.waitForResponse((res) => /\/api\/jobs\/[^/]+\/complete|\/api\/worker\/field-slip/.test(res.url()) && res.request().method() === 'POST', { timeout: 20000 }),
    workerPage.getByRole('button', { name: /Finish job/i }).click(),
  ]);

  await workerPage.waitForTimeout(2000);

  await workerPage.goto(`${BASE_URL}/worker/messages`, { waitUntil: 'domcontentloaded' });
  await workerPage.waitForTimeout(1000);

  const workerMessage = `Worker to boss message ${data.id}`;
  await workerPage.getByPlaceholder(/Type message/i).fill(workerMessage);
  await Promise.all([
    workerPage.waitForResponse((res) => /\/api\/worker\/field-slip/.test(res.url()) && res.request().method() === 'POST', { timeout: 20000 }),
    workerPage.getByRole('button', { name: /^Send$/i }).click(),
  ]);

  data.workerMessage = workerMessage;
}

async function ownerChecksWorkerUpdates(ownerPage, data) {
  await gotoOwnerSection(ownerPage, 'Command');
  const commandBody = clean(await ownerPage.locator('body').innerText({ timeout: 10000 }));
  expect(commandBody, 'Command should be real owner approval desk').toMatch(/Command|Approval|Approve|Park|owner/i);
  expect(commandBody, 'Command should receive worker issue or proof/message').toMatch(new RegExp(`${data.issueText}|${data.proofText}|${data.workerMessage}|job_issue|job_proof|worker_message|Worker`, 'i'));

  await gotoOwnerSection(ownerPage, 'Jobs');
  await expectBodyHas(ownerPage, data.jobName, 'owner jobs after worker finish');

  await gotoOwnerSection(ownerPage, 'Workers');
  const workersBody = clean(await ownerPage.locator('body').innerText({ timeout: 10000 }));
  expect(workersBody, 'Workers page should show field team area').toMatch(/Workers|GPS|Proof|Field/i);

  await gotoOwnerSection(ownerPage, 'Xero');
  const xeroBody = clean(await ownerPage.locator('body').innerText({ timeout: 10000 }));
  expect(xeroBody, 'Xero page should keep draft sync only').toMatch(/Draft sync only/i);
  expect(xeroBody, 'Xero page should keep owner approval').toMatch(/Owner-approved|Owner approved/i);
  expect(xeroBody, 'Xero page should block auto sending/tax/payout').toMatch(/No automatic invoice sending, tax filing or payout files|No tax filing|No bank payout files|No payout files/i);
}

test.describe('Churvox real human owner-worker flow', () => {
  test.setTimeout(360000);

  test('human clicks owner app, worker app, forms, buttons, messages and Command', async ({ browser, request }) => {
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
      ownerMessageSubject: `Boss to worker ${id}`,
      ownerMessageBody: `Please check gate code and send proof ${id}`,
      issueText: `Human worker issue ${id}`,
      proofText: `Human worker proof ${id}`,
      doneText: `Human worker completed ${id}`,
      workerMessage: '',
      jobId: '',
    };

    const ownerContext = await newHumanContext(browser);
    const ownerPage = await ownerContext.newPage();

    await test.step('Owner logs in through the real login screen', async () => {
      await uiLogin(ownerPage, OWNER_EMAIL, OWNER_PASSWORD, 'owner');
      await ownerPage.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
      await expect(ownerPage.locator('body'), 'owner dashboard should load').toContainText(/Owner command floor|Today|Command/i, { timeout: 20000 });
    });

    await test.step('Owner clicks Clients and creates a client through the real drawer', async () => {
      await createClientByHumanClicking(ownerPage, data);
      await waitForApiText(request, ownerToken, '/api/clients', data.clientName, 'clients API after UI create');
    });

    await test.step('Owner clicks Jobs and creates/assigns a job through the real drawer', async () => {
      await createJobByHumanClicking(ownerPage, data);
      await waitForApiText(request, ownerToken, '/api/jobs', data.jobName, 'jobs API after UI create');
    });

    await test.step('Owner clicks Quotes and creates a quote through the real drawer', async () => {
      await createQuoteByHumanClicking(ownerPage, data);
      await waitForApiText(request, ownerToken, '/api/quotes', data.quoteName, 'quotes API after UI create');
    });

    await test.step('Owner clicks Invoices and creates a draft invoice through the real drawer', async () => {
      await createInvoiceByHumanClicking(ownerPage, data);
      await waitForApiText(request, ownerToken, '/api/invoices', data.invoiceNumber, 'invoices API after UI create');
    });

    await test.step('Owner clicks Messages and creates a boss-side message record', async () => {
      await createOwnerMessageByHumanClicking(ownerPage, data);
      await waitForApiText(request, ownerToken, '/api/messages', data.ownerMessageSubject, 'messages API after UI create');
    });

    const workerContext = await newHumanContext(browser);
    const workerPage = await workerContext.newPage();

    await test.step('Worker logs in through real login and taps job controls', async () => {
      await workerDoesJobLikeHuman(workerPage, data);
    });

    await test.step('Owner goes back to Command/Jobs/Workers and checks worker updates came back', async () => {
      await ownerChecksWorkerUpdates(ownerPage, data);
    });

    await workerContext.close();
    await ownerContext.close();
  });
});
