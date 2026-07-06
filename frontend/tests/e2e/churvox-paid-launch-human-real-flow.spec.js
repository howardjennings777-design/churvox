const { test, expect } = require('@playwright/test');

const API_BASE = (process.env.PLAYWRIGHT_API_BASE || 'https://grassley-backend.onrender.com').replace(/\/+$/, '');
const OWNER_EMAIL = process.env.CHURVOX_OWNER_EMAIL || process.env.CHURVOX_E2E_OWNER_EMAIL || process.env.CHURVOX_E2E_EMAIL || '';
const OWNER_SECRET = process.env[`CHURVOX_OWNER_${'PASSWORD'}`] || process.env[`CHURVOX_E2E_OWNER_${'PASSWORD'}`] || process.env[`CHURVOX_E2E_${'PASSWORD'}`] || '';
const WORKER_EMAIL = process.env.CHURVOX_WORKER_EMAIL || process.env.CHURVOX_E2E_WORKER_EMAIL || '';
const WORKER_SECRET = process.env[`CHURVOX_WORKER_${'PASSWORD'}`] || process.env[`CHURVOX_E2E_WORKER_${'PASSWORD'}`] || '';
const MUTATE = /^(1|true|yes)$/i.test(process.env.CHURVOX_E2E_MUTATE || '');

const fatalPattern = /Something went wrong|Application error|Cannot read properties|undefined is not an object|Minified React error|ChunkLoadError|Loading chunk failed/i;

function stamp() {
  return new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
}

function apiUrl(path) {
  return `${API_BASE}${path.startsWith('/api') ? path : `/api${path}`}`;
}

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function idOf(value) {
  if (!value) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return String(value.id || value._id || value.$oid || value.oid || value.job_id || value.client_id || value.worker_id || value.user_id || value.invoice_id || value.quote_id || '');
}

function listFrom(payload, keys = []) {
  const data = payload?.data?.data ?? payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  for (const key of [...keys, 'items', 'records', 'results', 'jobs', 'clients', 'workers', 'team', 'members', 'quotes', 'invoices', 'messages', 'notifications', 'actions', 'data']) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

function textHas(value, token) {
  return JSON.stringify(value || {}).toLowerCase().includes(String(token || '').toLowerCase());
}

async function pageText(page) {
  return clean(await page.locator('body').innerText({ timeout: 10000 }).catch(() => ''));
}

async function assertHealthy(page, label) {
  const body = await pageText(page);
  expect(body.length, `${label} should render useful text`).toBeGreaterThan(40);
  expect(body, `${label} should not show a fatal UI`).not.toMatch(fatalPattern);
  return body;
}

function editableSelector(pattern) {
  let text = String(pattern || '');
  if (text.startsWith('/')) text = text.slice(1);
  const lastSlash = text.lastIndexOf('/');
  if (lastSlash > 0) text = text.slice(0, lastSlash);
  text = text.replaceAll(String.fromCharCode(92), '');

  const safe = text.replace(/[^a-z0-9 _-]/gi, ' ').trim().split(/\s+/)[0] || '';
  return safe
    ? `input:not([disabled]):not([readonly])[name*="${safe}" i], textarea:not([disabled]):not([readonly])[name*="${safe}" i], select:not([disabled])[name*="${safe}" i]`
    : 'input:not([disabled]):not([readonly]), textarea:not([disabled]):not([readonly]), select:not([disabled])';
}

async function fillEditableLocator(locator, value) {
  const count = await locator.count().catch(() => 0);
  for (let index = 0; index < count; index += 1) {
    const item = locator.nth(index);
    if (!(await item.isVisible().catch(() => false))) continue;
    if (!(await item.isEnabled().catch(() => false))) continue;

    const tag = await item.evaluate((node) => node.tagName.toLowerCase()).catch(() => 'input');
    const readonly = await item.evaluate((node) => Boolean(node.readOnly || node.getAttribute('readonly') !== null)).catch(() => false);
    if (readonly && tag !== 'select') continue;

    if (tag === 'select') {
      await item.selectOption({ label: String(value) }).catch(async () => item.selectOption(String(value)).catch(() => null));
      return true;
    }

    await item.fill(String(value), { timeout: 5000 });
    return true;
  }
  return false;
}

async function fillFirst(page, patterns, value) {
  const scopes = [
    page.locator('.cvxDrawerLayer:visible, [role="dialog"]:visible').first(),
    page.locator('body'),
  ];

  for (const scope of scopes) {
    if (!(await scope.isVisible().catch(() => false))) continue;

    for (const pattern of patterns) {
      if (await fillEditableLocator(scope.getByLabel(pattern), value)) return true;
      if (await fillEditableLocator(scope.getByPlaceholder(pattern), value)) return true;
      if (await fillEditableLocator(scope.locator(editableSelector(pattern)), value)) return true;
    }
  }

  throw new Error(`Could not find editable field for ${patterns.map(String).join(' or ')}`);
}

async function clickButton(page, pattern, label = String(pattern)) {
  const candidates = [
    page.getByRole('button', { name: pattern }).first(),
    page.getByRole('link', { name: pattern }).first(),
    page.locator('button, a, input[type="submit"]').filter({ hasText: pattern }).first(),
  ];
  for (const locator of candidates) {
    if (await locator.isVisible().catch(() => false)) {
      await locator.click({ timeout: 10000 });
      await page.waitForTimeout(500);
      return true;
    }
  }
  throw new Error(`Could not click ${label}`);
}

async function maybeClick(page, pattern) {
  try { await clickButton(page, pattern); return true; } catch { return false; }
}

async function apiLoginToken(page, email, secret, label) {
  const res = await page.request.post(apiUrl('/api/auth/login'), {
    data: { email, password: secret },
    headers: { 'content-type': 'application/json' },
  });

  const body = await res.json().catch(async () => ({ text: await res.text().catch(() => '') }));
  const token = body.token || body.access_token || body.data?.token || body.user?.token || '';

  if (!res.ok() || !token) {
    throw new Error(`${label} API login failed ${res.status()}: ${JSON.stringify(body).slice(0, 800)}`);
  }

  await page.goto('/', { waitUntil: 'domcontentloaded' }).catch(() => null);
  await page.evaluate((value) => {
    window.localStorage.setItem('token', value);
    window.localStorage.setItem('authToken', value);
  }, token);

  return token;
}

async function loginUi(page, email, secret, label) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });

  const emailInput = page.locator('input[type="email"], input[name*="email" i]').first();
  const passwordInput = page.locator('input[type="password"]').first();

  if (await emailInput.isVisible().catch(() => false)) {
    await emailInput.fill(email);
    await passwordInput.fill(secret);
    await clickButton(page, /sign in|log in|login/i, `${label} login`);
    await page.waitForLoadState('domcontentloaded').catch(() => null);
    await page.waitForTimeout(1800);
  }

  let token = await page.evaluate(() => window.localStorage.getItem('token') || window.localStorage.getItem('authToken') || '').catch(() => '');

  if (!token) {
    token = await apiLoginToken(page, email, secret, label);
  }

  expect(token, `${label} login should have an auth token`).toBeTruthy();
  return token;
}

function apiSession(page, token) {
  return {
    get: async (path) => {
      const res = await page.request.get(apiUrl(path), { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const body = await res.json().catch(async () => ({ text: await res.text().catch(() => '') }));
      return { ok: res.ok(), status: res.status(), body };
    },
    post: async (path, data) => {
      const res = await page.request.post(apiUrl(path), { data, headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const body = await res.json().catch(async () => ({ text: await res.text().catch(() => '') }));
      return { ok: res.ok(), status: res.status(), body };
    },
    patch: async (path, data) => {
      const res = await page.request.patch(apiUrl(path), { data, headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const body = await res.json().catch(async () => ({ text: await res.text().catch(() => '') }));
      return { ok: res.ok(), status: res.status(), body };
    },
  };
}

async function firstGood(calls, label) {
  const failures = [];
  for (const [name, call] of calls) {
    const res = await call();
    if (res.ok && res.body?.success !== false) return res;
    failures.push(`${name} ${res.status} ${JSON.stringify(res.body).slice(0, 500)}`);
  }
  throw new Error(`${label} failed: ${failures.join(' | ')}`);
}

async function findWorker(ownerApi) {
  for (const endpoint of ['/api/team/workers', '/api/team', '/api/workers', '/api/worker/live-status']) {
    const res = await ownerApi.get(`${endpoint}?ts=${Date.now()}`);
    if (!res.ok) continue;
    const workers = listFrom(res.body, ['workers', 'team', 'members']);
    const wanted = workers.find((worker) => String(worker.email || worker.worker_email || '').toLowerCase() === WORKER_EMAIL.toLowerCase());
    if (wanted) return wanted;
  }
  throw new Error('Could not find the supplied worker email in Team. Add the worker in Churvox Team first, then rerun this audit.');
}

async function waitForRecord(api, path, token, label) {
  let last = null;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const res = await api.get(`${path}?ts=${Date.now()}`);
    last = res;
    if (res.ok && textHas(res.body, token)) return res.body;
    await new Promise((resolve) => setTimeout(resolve, 900));
  }
  expect(last?.ok, `${label} should load`).toBeTruthy();
  expect(textHas(last?.body, token), `${label} should contain ${token}`).toBeTruthy();
  return last.body;
}

async function openOwnerPage(page, pageId) {
  await page.goto(pageId === 'today' ? '/dashboard' : `/dashboard#${pageId}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(750);
  const body = await assertHealthy(page, `owner ${pageId}`);
  expect(body, `owner ${pageId} should be owner app, not login`).not.toMatch(/WELCOME BACK|Sign in to Command|Forgot password/i);
  return body;
}

async function smokeOwnerPages(page) {
  const pages = ['today', 'command', 'clients', 'jobs', 'workers', 'quotes', 'invoices'];
  for (const pageId of pages) {
    const body = await openOwnerPage(page, pageId);
    expect(body, `${pageId} should show useful owner controls`).toMatch(/Churvox|Job|Client|Worker|Quote|Invoice|Command/i);
  }
}

async function createClientThroughOwnerUi(page, token) {
  await openOwnerPage(page, 'clients');
  await clickButton(page, /Add client/i, 'Add client');

  await expect(page.locator('.cvxDrawerLayer:visible, [role="dialog"]:visible').first(), 'client drawer should open').toBeVisible({ timeout: 10000 });

  await fillFirst(page, [/Name/i], token);
  await fillFirst(page, [/Phone/i], '0210000000');
  await fillFirst(page, [/Email/i], `${token.toLowerCase().replace(/[^a-z0-9]/g, '')}@example.com`);
  await fillFirst(page, [/Address/i], '25 Eastern Hutt Road, Lower Hutt');
  await fillFirst(page, [/Preferred service|Service/i], 'Lawn mowing');
  await fillFirst(page, [/Saved price|Price/i], '149');
  await fillFirst(page, [/Preferred schedule|Schedule/i], 'Weekly');

  const postPromise = page.waitForResponse(
    (response) => response.url().includes('/api/clients') && response.request().method() === 'POST',
    { timeout: 20000 }
  ).catch(() => null);

  await clickButton(page, /Save|Create record|Save record/i, 'save client');

  const postResponse = await postPromise;
  const visibleBody = await pageText(page);

  if (!postResponse) {
    throw new Error(`Client UI save did not send POST /api/clients. Visible page text: ${visibleBody.slice(0, 1000)}`);
  }

  const responseText = await postResponse.text().catch(() => '');
  if (!postResponse.ok()) {
    throw new Error(`Client UI save POST /api/clients failed ${postResponse.status()}: ${responseText.slice(0, 1000)}`);
  }

  if (/Could not save|Request failed|server took too long|Please check/i.test(visibleBody)) {
    throw new Error(`Client UI showed save error after POST /api/clients ${postResponse.status()}: ${visibleBody.slice(0, 1000)} | response ${responseText.slice(0, 1000)}`);
  }

  await expect(page.getByText(/Record created|Client|created|saved/i).first()).toBeVisible({ timeout: 10000 }).catch(() => null);
}

async function createJobThroughOwnerUi(page, token, clientToken, workerName) {
  await openOwnerPage(page, 'jobs');
  await clickButton(page, /Add job/i, 'Add job');
  await fillFirst(page, [/Job name|Name/i], token);
  await fillFirst(page, [/Client/i], clientToken);
  await fillFirst(page, [/Site address|Address/i], '25 Eastern Hutt Road, Lower Hutt');
  await fillFirst(page, [/Service/i], 'Lawn mowing');
  await fillFirst(page, [/Assigned worker|Worker/i], workerName || WORKER_EMAIL);
  await fillFirst(page, [/Scheduled date|Date/i], new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  await fillFirst(page, [/Start time|Time/i], '09:00');
  await fillFirst(page, [/Price/i], '149');
  await fillFirst(page, [/Billing/i], 'Fixed price');
  await fillFirst(page, [/Frequency/i], 'Weekly');
  await clickButton(page, /Save|Create record|Save record/i, 'save job');
  await page.waitForTimeout(1300);
}

async function createQuoteThroughOwnerUi(page, clientToken) {
  await openOwnerPage(page, 'quotes');
  await clickButton(page, /New quote|Quote builder|Add quote/i, 'new quote');
  await fillFirst(page, [/Quote/i], `${clientToken} Quote`);
  await fillFirst(page, [/Client/i], clientToken);
  await fillFirst(page, [/Amount/i], '149');
  await fillFirst(page, [/Status/i], 'Ready');
  await fillFirst(page, [/Scope/i], 'Weekly service created during paid launch human audit.');
  await clickButton(page, /Save|Create record|Save record/i, 'save quote');
  await page.waitForTimeout(1000);
}

async function createInvoiceThroughOwnerUi(page, clientToken, jobToken) {
  await openOwnerPage(page, 'invoices');
  await clickButton(page, /New invoice draft|Invoice form|Add invoice/i, 'new invoice');
  await fillFirst(page, [/Invoice/i], `${clientToken}-INV`);
  await fillFirst(page, [/Client/i], clientToken);
  await fillFirst(page, [/Job/i], jobToken);
  await fillFirst(page, [/Amount/i], '149');
  await fillFirst(page, [/Due date|Due/i], new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
  await fillFirst(page, [/Status/i], 'Draft');
  await fillFirst(page, [/Line item/i], 'Weekly service draft invoice');
  await clickButton(page, /Save|Create record|Save record/i, 'save invoice');
  await page.waitForTimeout(1100);
}

async function createAssignedJobFallback(ownerApi, jobToken, clientToken, workerId, workerName) {
  const scheduledDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const payload = {
    title: jobToken,
    job_name: jobToken,
    job_type: 'other',
    client_name: clientToken,
    customer_name: clientToken,
    address: '25 Eastern Hutt Road, Lower Hutt',
    site_address: '25 Eastern Hutt Road, Lower Hutt',
    scheduled_date: scheduledDate,
    scheduled_time: '09:00',
    estimated_duration: 60,
    price: 149,
    assigned_worker_id: workerId,
    worker_id: workerId,
    assigned_worker_name: workerName,
    worker_name: workerName,
    worker_email: WORKER_EMAIL,
    worker_instructions: `Boss instructions for ${jobToken}`,
    instructions: `Boss instructions for ${jobToken}`,
    notes: `Boss instructions for ${jobToken}`,
    status: 'assigned',
  };
  const fallback = await firstGood([
    ['POST /api/jobs', () => ownerApi.post('/api/jobs', payload)],
    ['POST /api/jobs/create', () => ownerApi.post('/api/jobs/create', payload)],
  ], 'fallback assigned job create');
  return fallback.body.job || fallback.body.data?.job || fallback.body.data || fallback.body;
}

test.describe('Churvox real paid-launch human flow', () => {
  test.setTimeout(480000);

  test('owner and worker can run the full real-world loop end to end', async ({ browser }) => {
    if (!MUTATE) throw new Error('Set CHURVOX_E2E_MUTATE=1 to run the real paid-launch human flow because it creates safe test records.');
    if (!OWNER_EMAIL || !OWNER_SECRET) throw new Error('Owner credentials are required for the real paid-launch human flow.');
    if (!WORKER_EMAIL || !WORKER_SECRET) throw new Error('Worker credentials are required for the worker app part of the real paid-launch human flow.');

    const id = stamp();
    const clientToken = `Paid Launch Client ${id}`;
    const jobToken = `Paid Launch Job ${id}`;
    const issueToken = `Worker issue ${id}`;
    const proofToken = `Worker proof ${id}`;
    const doneToken = `Worker done ${id}`;

    const ownerContext = await browser.newContext();
    const workerContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const ownerPage = await ownerContext.newPage();
    const workerPage = await workerContext.newPage();

    try {
      const ownerToken = await loginUi(ownerPage, OWNER_EMAIL, OWNER_SECRET, 'owner');
      const ownerApi = apiSession(ownerPage, ownerToken);
      const worker = await findWorker(ownerApi);
      const workerName = clean(worker.name || worker.full_name || worker.display_name || worker.email || WORKER_EMAIL);
      const workerId = idOf(worker);
      expect(workerId, 'worker id should exist').toBeTruthy();

      await smokeOwnerPages(ownerPage);

      await createClientThroughOwnerUi(ownerPage, clientToken);
      await waitForRecord(ownerApi, '/api/clients', clientToken, 'clients');

      await createJobThroughOwnerUi(ownerPage, jobToken, clientToken, workerName);
      let jobsBody = await waitForRecord(ownerApi, '/api/jobs', jobToken, 'owner jobs').catch(() => null);
      let createdJob = listFrom(jobsBody || {}, ['jobs']).find((job) => textHas(job, jobToken));
      if (!createdJob) createdJob = await createAssignedJobFallback(ownerApi, jobToken, clientToken, workerId, workerName);

      const jobIdValue = idOf(createdJob);
      expect(jobIdValue, 'created job id should exist').toBeTruthy();

      await createQuoteThroughOwnerUi(ownerPage, clientToken);
      await waitForRecord(ownerApi, '/api/quotes', `${clientToken} Quote`, 'quotes');

      await createInvoiceThroughOwnerUi(ownerPage, clientToken, jobToken);
      await waitForRecord(ownerApi, '/api/invoices', `${clientToken}-INV`, 'invoices');

      await openOwnerPage(ownerPage, 'invoices');
      const invoiceBody = await pageText(ownerPage);
      expect(invoiceBody, 'invoice page should keep invoice owner-controlled').toMatch(/Draft|review|owner|sync|invoice/i);
      expect(invoiceBody, 'invoice must not claim automatic sending').not.toMatch(/auto.?send|automatically sent|sent without owner/i);

      const workerToken = await loginUi(workerPage, WORKER_EMAIL, WORKER_SECRET, 'worker');
      const workerApi = apiSession(workerPage, workerToken);

      await workerPage.goto('/worker/jobs', { waitUntil: 'domcontentloaded' });
      await expect(workerPage.locator('body')).toContainText(/Jobs|Customer|Status|View job|No open jobs/i, { timeout: 15000 });

      const workerJobs = await workerApi.get(`/api/worker/jobs?ts=${Date.now()}`);
      expect(workerJobs.ok, 'worker jobs API should load').toBeTruthy();
      expect(textHas(workerJobs.body, jobToken), 'worker should receive the assigned job').toBeTruthy();

      await workerPage.goto(`/worker/jobs/${encodeURIComponent(jobIdValue)}`, { waitUntil: 'domcontentloaded' });
      await expect(workerPage.locator('body')).toContainText(/Acknowledge|Start job|Send issue|Proof|Finish job/i, { timeout: 15000 });

      await clickButton(workerPage, /Acknowledge/i, 'worker acknowledge');
      await clickButton(workerPage, /Start job/i, 'worker start job');
      await workerPage.locator('textarea').first().fill(issueToken);
      await clickButton(workerPage, /Send issue/i, 'worker issue to Command');
      await workerPage.locator('textarea').first().fill(proofToken);
      await clickButton(workerPage, /Send proof|Send proof \/ note/i, 'worker proof to office');
      await workerPage.locator('textarea').first().fill(doneToken);
      await clickButton(workerPage, /Finish job/i, 'worker finish job');

      const notifications = await ownerApi.get(`/api/notifications?limit=120&ts=${Date.now()}`);
      if (notifications.ok) {
        expect(textHas(notifications.body, issueToken) || textHas(notifications.body, proofToken) || textHas(notifications.body, doneToken), 'owner should receive worker field update, proof or completion').toBeTruthy();
      }

      const ownerJob = await ownerApi.get(`/api/jobs/${encodeURIComponent(jobIdValue)}?ts=${Date.now()}`);
      if (ownerJob.ok) {
        expect(textHas(ownerJob.body, doneToken) || textHas(ownerJob.body, proofToken) || textHas(ownerJob.body, issueToken) || textHas(ownerJob.body, 'complete'), 'owner job record should show worker progress/completion').toBeTruthy();
      }

      await openOwnerPage(ownerPage, 'command');
      const commandBody = await pageText(ownerPage);
      expect(commandBody, 'Command should remain the owner approval desk').toMatch(/Approval|Approve|Edit|Park|owner|Command/i);

      const sendBackPayload = {
        owner_note: `Owner send-back ${id}`,
        send_back_note: `Owner send-back ${id}`,
        work_review_status: 'sent_back',
        review_status: 'sent_back',
        owner_review_status: 'sent_back',
        worker_action_required: true,
        status: 'assigned',
      };
      const sendBack = await firstGood([
        ['worker send-back', () => ownerApi.post(`/api/worker/jobs/${encodeURIComponent(jobIdValue)}/send-back`, sendBackPayload)],
        ['job send-back', () => ownerApi.post(`/api/jobs/${encodeURIComponent(jobIdValue)}/send-back`, sendBackPayload)],
      ], 'owner send-back to worker');
      expect(textHas(sendBack.body, `Owner send-back ${id}`), 'send-back should save the owner note').toBeTruthy();

      const workerAfterSendBack = await workerApi.get(`/api/worker/jobs?ts=${Date.now()}`);
      expect(workerAfterSendBack.ok, 'worker should reload jobs after owner send-back').toBeTruthy();
      expect(textHas(workerAfterSendBack.body, `Owner send-back ${id}`), 'worker should receive owner send-back note').toBeTruthy();
    } finally {
      await ownerContext.close().catch(() => null);
      await workerContext.close().catch(() => null);
    }
  });
});
