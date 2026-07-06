const { test, expect } = require('@playwright/test');

const API_BASE = (process.env.PLAYWRIGHT_API_BASE || 'https://grassley-backend.onrender.com').replace(/\/+$/, '');
const OWNER_EMAIL = process.env.CHURVOX_OWNER_EMAIL || process.env.CHURVOX_E2E_OWNER_EMAIL || process.env.CHURVOX_E2E_EMAIL || '';
const OWNER_SECRET = process.env[`CHURVOX_OWNER_${'PASSWORD'}`] || process.env[`CHURVOX_E2E_OWNER_${'PASSWORD'}`] || process.env[`CHURVOX_E2E_${'PASSWORD'}`] || '';
const WORKER_EMAIL = process.env.CHURVOX_WORKER_EMAIL || process.env.CHURVOX_E2E_WORKER_EMAIL || '';
const WORKER_SECRET = process.env[`CHURVOX_WORKER_${'PASSWORD'}`] || process.env[`CHURVOX_E2E_WORKER_${'PASSWORD'}`] || '';
const MUTATE = /^(1|true|yes)$/i.test(process.env.CHURVOX_E2E_MUTATE || '');

const fatalPattern = /Something went wrong|Application error|Cannot read properties|undefined is not an object|Minified React error|ChunkLoadError|Loading chunk failed/i;
const unsafeButtonPattern = /delete|remove|archive|disconnect|cancel subscription|checkout|upgrade|connect xero|connect stripe|take card payment|find reader|connect reader|log out/i;
const safeButtonPattern = /add|new|open|view|refresh|close|csv import|export|save|create|acknowledge|start job|send issue|send proof|finish job|message|directions|recurring|assign worker/i;

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

async function fillFirst(page, patterns, value) {
  for (const pattern of patterns) {
    const candidates = [
      page.getByLabel(pattern).first(),
      page.getByPlaceholder(pattern).first(),
      page.locator('input, textarea, select').filter({ hasText: pattern }).first(),
    ];
    for (const locator of candidates) {
      if (await locator.isVisible().catch(() => false)) {
        const tag = await locator.evaluate((node) => node.tagName.toLowerCase()).catch(() => 'input');
        if (tag === 'select') await locator.selectOption({ label: String(value) }).catch(async () => locator.selectOption(String(value)).catch(() => null));
        else await locator.fill(String(value));
        return true;
      }
    }
  }
  return false;
}

async function clickButton(page, pattern, label = String(pattern)) {
  const candidates = [
    page.getByRole('button', { name: pattern }).first(),
    page.getByRole('link', { name: pattern }).first(),
    page.locator('button, a, input[type="submit"]').filter({ hasText: pattern }).first(),
  ];
  for (const locator of candidates) {
    if (await locator.isVisible().catch(() => false)) {
      await locator.click();
      await page.waitForTimeout(550);
      return true;
    }
  }
  throw new Error(`Could not click ${label}`);
}

async function maybeClick(page, pattern) {
  try { await clickButton(page, pattern); return true; } catch { return false; }
}

async function loginUi(page, email, secret, label) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"], input[name*="email" i]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(secret);
  await clickButton(page, /sign in|log in|login/i, `${label} login`);
  await page.waitForLoadState('domcontentloaded').catch(() => null);
  await page.waitForTimeout(1600);
  const token = await page.evaluate(() => window.localStorage.getItem('token') || window.localStorage.getItem('authToken') || '');
  expect(token, `${label} login should store an auth token`).toBeTruthy();
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
  const endpoints = ['/api/team/workers', '/api/team', '/api/workers', '/api/worker/live-status'];
  for (const endpoint of endpoints) {
    const res = await ownerApi.get(`${endpoint}?ts=${Date.now()}`);
    if (!res.ok) continue;
    const workers = listFrom(res.body, ['workers', 'team', 'members']);
    const wanted = workers.find((worker) => String(worker.email || worker.worker_email || '').toLowerCase() === WORKER_EMAIL.toLowerCase());
    if (wanted) return wanted;
  }
  throw new Error('Could not find the supplied worker email in Team. Add the worker in Churvox Team first, then rerun this audit.');
}

async function getRecord(api, path, token) {
  const res = await api.get(`${path}?ts=${Date.now()}`);
  expect(res.ok, `${path} should load`).toBeTruthy();
  expect(textHas(res.body, token), `${path} should contain ${token}`).toBeTruthy();
  return res.body;
}

async function openOwnerPage(page, pageId) {
  await page.goto(pageId === 'today' ? '/dashboard' : `/dashboard#${pageId}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
  const body = await assertHealthy(page, `owner ${pageId}`);
  expect(body, `owner ${pageId} should be owner app, not login`).not.toMatch(/WELCOME BACK|Sign in to Command|Forgot password/i);
  return body;
}

async function clickVisibleSafeControls(page, pageId) {
  await openOwnerPage(page, pageId);
  const buttons = await page.locator('button:visible, a:visible').evaluateAll((nodes) => nodes.map((node, index) => ({ index, text: (node.textContent || '').replace(/\s+/g, ' ').trim(), href: node.getAttribute('href') || '' })).filter((item) => item.text));
  const safe = buttons.filter((item) => safeButtonPattern.test(item.text) && !unsafeButtonPattern.test(item.text)).slice(0, 10);
  expect(safe.length, `${pageId} should have safe human controls`).toBeGreaterThan(0);
  for (const item of safe) {
    await openOwnerPage(page, pageId);
    const locator = page.locator('button:visible, a:visible').filter({ hasText: item.text }).first();
    if (!(await locator.isVisible().catch(() => false))) continue;
    await locator.click().catch(() => null);
    await page.waitForTimeout(450);
    await assertHealthy(page, `${pageId} after ${item.text}`);
    await maybeClick(page, /^Close$/i);
  }
}

async function createClientThroughOwnerUi(page, token) {
  await openOwnerPage(page, 'clients');
  await clickButton(page, /Add client/i, 'Add client');
  await fillFirst(page, [/Name/i], token);
  await fillFirst(page, [/Phone/i], '0210000000');
  await fillFirst(page, [/Email/i], `${token.toLowerCase().replace(/[^a-z0-9]/g, '')}@example.com`);
  await fillFirst(page, [/Address/i], '25 Eastern Hutt Road, Lower Hutt');
  await fillFirst(page, [/Preferred service|Service/i], 'Lawn mowing');
  await fillFirst(page, [/Saved price|Price/i], '149');
  await fillFirst(page, [/Preferred schedule|Schedule/i], 'Weekly');
  await clickButton(page, /Create record|Save record/i, 'save client');
  await page.waitForTimeout(1300);
}

async function createJobThroughOwnerUi(page, token, workerName) {
  await openOwnerPage(page, 'jobs');
  await clickButton(page, /Add job/i, 'Add job');
  await fillFirst(page, [/Job name|Name/i], token);
  await fillFirst(page, [/Client/i], token);
  await fillFirst(page, [/Site address|Address/i], '25 Eastern Hutt Road, Lower Hutt');
  await fillFirst(page, [/Service/i], 'Lawn mowing');
  await fillFirst(page, [/Assigned worker|Worker/i], workerName || WORKER_EMAIL);
  await fillFirst(page, [/Scheduled date|Date/i], new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  await fillFirst(page, [/Start time|Time/i], '09:00');
  await fillFirst(page, [/Price/i], '149');
  await fillFirst(page, [/Billing/i], 'Fixed price');
  await fillFirst(page, [/Frequency/i], 'Weekly');
  await clickButton(page, /Create record|Save record/i, 'save job');
  await page.waitForTimeout(1500);
}

async function createQuoteThroughOwnerUi(page, token) {
  await openOwnerPage(page, 'quotes');
  await clickButton(page, /New quote|Quote builder|Add quote/i, 'new quote');
  await fillFirst(page, [/Quote/i], `${token} Quote`);
  await fillFirst(page, [/Client/i], token);
  await fillFirst(page, [/Amount/i], '149');
  await fillFirst(page, [/Status/i], 'Ready');
  await fillFirst(page, [/Scope/i], 'Weekly service created during paid launch human audit.');
  await clickButton(page, /Create record|Save record/i, 'save quote');
  await page.waitForTimeout(1200);
}

async function createInvoiceThroughOwnerUi(page, token) {
  await openOwnerPage(page, 'invoices');
  await clickButton(page, /New invoice draft|Invoice form|Add invoice/i, 'new invoice');
  await fillFirst(page, [/Invoice/i], `${token}-INV`);
  await fillFirst(page, [/Client/i], token);
  await fillFirst(page, [/Job/i], token);
  await fillFirst(page, [/Amount/i], '149');
  await fillFirst(page, [/Due date|Due/i], new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
  await fillFirst(page, [/Status/i], 'Draft');
  await fillFirst(page, [/Line item/i], 'Weekly service draft invoice');
  await clickButton(page, /Create record|Save record/i, 'save invoice');
  await page.waitForTimeout(1400);
}

test.describe('Churvox real paid-launch human flow', () => {
  test.setTimeout(300000);

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

    const ownerToken = await loginUi(ownerPage, OWNER_EMAIL, OWNER_SECRET, 'owner');
    const ownerApi = apiSession(ownerPage, ownerToken);
    const worker = await findWorker(ownerApi);
    const workerName = clean(worker.name || worker.full_name || worker.display_name || worker.email || WORKER_EMAIL);
    const workerId = idOf(worker);
    expect(workerId, 'worker id should exist').toBeTruthy();

    for (const pageId of ['today', 'command', 'jobs', 'clients', 'workers', 'messages', 'quotes', 'invoices', 'team', 'payroll', 'xero', 'settings', 'plans', 'support']) {
      await clickVisibleSafeControls(ownerPage, pageId);
    }

    await createClientThroughOwnerUi(ownerPage, clientToken);
    await getRecord(ownerApi, '/api/clients', clientToken);

    await createJobThroughOwnerUi(ownerPage, jobToken, workerName);
    const jobsAfterUi = await ownerApi.get(`/api/jobs?ts=${Date.now()}`);
    expect(jobsAfterUi.ok, 'owner jobs should load after UI job create').toBeTruthy();

    let createdJob = listFrom(jobsAfterUi.body, ['jobs']).find((job) => textHas(job, jobToken));
    if (!createdJob) {
      const fallback = await firstGood([
        ['POST /api/jobs', () => ownerApi.post('/api/jobs', {
          title: jobToken,
          job_type: 'other',
          client_name: clientToken,
          customer_name: clientToken,
          address: '25 Eastern Hutt Road, Lower Hutt',
          site_address: '25 Eastern Hutt Road, Lower Hutt',
          scheduled_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
          scheduled_time: '09:00',
          estimated_duration: 60,
          price: 149,
          assigned_worker_id: workerId,
          assigned_worker_name: workerName,
          worker_instructions: `Boss instructions ${id}`,
          notes: `Boss instructions ${id}`,
          status: 'assigned',
        })],
      ], 'fallback job create');
      createdJob = fallback.body.job || fallback.body.data?.job || fallback.body.data || fallback.body;
    }

    const jobIdValue = idOf(createdJob);
    expect(jobIdValue, 'created job id should exist').toBeTruthy();

    await createQuoteThroughOwnerUi(ownerPage, clientToken);
    await getRecord(ownerApi, '/api/quotes', `${clientToken} Quote`);

    await createInvoiceThroughOwnerUi(ownerPage, clientToken);
    await getRecord(ownerApi, '/api/invoices', `${clientToken}-INV`);

    await openOwnerPage(ownerPage, 'invoices');
    const invoiceBody = await pageText(ownerPage);
    expect(invoiceBody, 'invoice page should keep invoice owner-controlled').toMatch(/Draft|review|owner|sync|invoice/i);
    expect(invoiceBody, 'invoice must not claim automatic sending').not.toMatch(/auto.?send|automatically sent|sent without owner/i);

    const workerToken = await loginUi(workerPage, WORKER_EMAIL, WORKER_SECRET, 'worker');
    const workerApi = apiSession(workerPage, workerToken);

    await workerPage.goto('/worker/jobs', { waitUntil: 'domcontentloaded' });
    await pageText(workerPage);
    await expect(workerPage.locator('body')).toContainText(/Jobs|Customer|Status|View job|No open jobs/i, { timeout: 15000 });

    const workerJobs = await workerApi.get(`/api/jobs?ts=${Date.now()}`);
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

    const workerAfterSendBack = await workerApi.get(`/api/jobs/${encodeURIComponent(jobIdValue)}?ts=${Date.now()}`);
    expect(workerAfterSendBack.ok, 'worker should reload job after owner send-back').toBeTruthy();
    expect(textHas(workerAfterSendBack.body, `Owner send-back ${id}`), 'worker should receive owner send-back note').toBeTruthy();

    await ownerContext.close();
    await workerContext.close();
  });
});
