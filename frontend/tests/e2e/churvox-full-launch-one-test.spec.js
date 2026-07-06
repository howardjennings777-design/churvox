const { test, expect } = require('@playwright/test');

const API_BASE = (process.env.PLAYWRIGHT_API_BASE || 'https://grassley-backend.onrender.com').replace(/\/+$/, '');
const OWNER_EMAIL = process.env.CHURVOX_OWNER_EMAIL || '';
const OWNER_PASSWORD = process.env.CHURVOX_OWNER_PASSWORD || '';
const WORKER_EMAIL = process.env.CHURVOX_WORKER_EMAIL || '';
const WORKER_PASSWORD = process.env.CHURVOX_WORKER_PASSWORD || '';
const MUTATE = /^(1|true|yes)$/i.test(process.env.CHURVOX_E2E_MUTATE || '');

function stamp() {
  return new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
}

function apiUrl(path) {
  return `${API_BASE}${path.startsWith('/api') ? path : `/api${path}`}`;
}

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function textHas(value, token) {
  return JSON.stringify(value || {}).toLowerCase().includes(String(token || '').toLowerCase());
}

function listFrom(payload, keys = []) {
  const data = payload?.data?.data ?? payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  for (const key of [...keys, 'items', 'records', 'results', 'jobs', 'clients', 'workers', 'team', 'members', 'quotes', 'invoices', 'messages', 'notifications', 'actions', 'data']) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

function idOf(value) {
  if (!value) return '';
  return String(value.id || value._id || value.$oid || value.oid || value.job_id || value.client_id || value.worker_id || value.user_id || value.invoice_id || value.quote_id || '');
}

async function bodyOf(res) {
  return res.json().catch(async () => ({ text: await res.text().catch(() => '') }));
}

async function login(request, email, password, label) {
  const res = await request.post(apiUrl('/api/auth/login'), {
    data: { email, password },
    timeout: 15000,
  });

  const body = await bodyOf(res);
  const token = body.token || body.access_token || body.data?.token || body.user?.token || '';

  expect(res.ok(), `${label} login failed ${res.status()}: ${JSON.stringify(body).slice(0, 900)}`).toBeTruthy();
  expect(token, `${label} login should return token`).toBeTruthy();

  return token;
}

function api(request, token) {
  const headers = { Authorization: `Bearer ${token}` };

  return {
    get: async (path) => {
      const res = await request.get(apiUrl(path), { headers, timeout: 15000 });
      return { ok: res.ok(), status: res.status(), body: await bodyOf(res) };
    },
    post: async (path, data) => {
      const res = await request.post(apiUrl(path), { headers, data, timeout: 15000 });
      return { ok: res.ok(), status: res.status(), body: await bodyOf(res) };
    },
    patch: async (path, data) => {
      const res = await request.patch(apiUrl(path), { headers, data, timeout: 15000 });
      return { ok: res.ok(), status: res.status(), body: await bodyOf(res) };
    },
  };
}

async function firstGood(calls, label) {
  const failures = [];

  for (const [name, call] of calls) {
    const res = await call().catch((error) => ({ ok: false, status: 'error', body: { error: String(error?.message || error) } }));
    if (res.ok && res.body?.success !== false) return res;
    failures.push(`${name} ${res.status} ${JSON.stringify(res.body).slice(0, 700)}`);
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

  throw new Error(`Could not find worker email ${WORKER_EMAIL} in owner team endpoints.`);
}

async function waitForList(apiClient, path, token, label) {
  let last = null;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    last = await apiClient.get(`${path}?ts=${Date.now()}`).catch((error) => ({
      ok: false,
      status: 'request-error',
      body: { error: String(error?.message || error) },
    }));

    if (last.ok && textHas(last.body, token)) return last.body;
    await new Promise((resolve) => setTimeout(resolve, 800));
  }

  throw new Error(`${label} did not contain ${token}. Last response: ${JSON.stringify(last).slice(0, 1200)}`);
}

async function setToken(page, token, email = OWNER_EMAIL) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await page.evaluate(({ value, emailValue }) => {
    const user = {
      id: emailValue,
      _id: emailValue,
      email: emailValue,
      role: 'owner',
      user_role: 'owner',
      plan: 'command',
      current_plan: 'command',
      subscription_status: 'active',
      billing_status: 'active',
      has_app_access: true,
      business_id: emailValue,
      token: value,
    };

    localStorage.setItem('token', value);
    localStorage.setItem('authToken', value);
    localStorage.setItem('access_token', value);
    localStorage.setItem('churvox_token', value);
    localStorage.setItem('churvox_auth_token', value);
    localStorage.removeItem('churvox_plan_choice_required');

    localStorage.setItem(
      'churvox_auth_session_snapshot_v1',
      JSON.stringify({ at: Date.now(), token: value, user })
    );
  }, { value: token, emailValue: email });
}

async function openOwnerApp(page, token) {
  await setToken(page, token, OWNER_EMAIL);
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

  await page.waitForFunction(() => {
    const body = document.body?.innerText || '';
    return !/WELCOME BACK|Sign in to see|Start trial/i.test(body);
  }, null, { timeout: 20000 }).catch(() => {});

  await page.waitForTimeout(1200);
}

async function pageText(page, path, token) {
  await openOwnerApp(page, token);

  const hash = path.includes('#') ? path.slice(path.indexOf('#')) : '';
  if (hash) {
    await page.evaluate((value) => {
      window.location.hash = value.replace(/^#/, '');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }, hash);
    await page.waitForTimeout(1500);
  } else {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
  }

  const body = clean(await page.locator('body').innerText({ timeout: 10000 }));

  if (/WELCOME BACK|Sign in to see|Start trial/i.test(body)) {
    throw new Error(`Owner app is still on public login page for ${path}. Auth snapshot did not load.`);
  }

  return body;
}
test.describe('Churvox full launch one-test audit', () => {
  test.setTimeout(240000);

  test('owner worker client job quote invoice command full loop', async ({ request, browser }) => {
    if (!MUTATE) throw new Error('Set CHURVOX_E2E_MUTATE=1.');
    if (!OWNER_EMAIL || !OWNER_PASSWORD) throw new Error('Set owner email/password env vars.');
    if (!WORKER_EMAIL || !WORKER_PASSWORD) throw new Error('Set worker email/password env vars.');

    const id = stamp();
    const clientName = `Full Launch Client ${id}`;
    const jobName = `Full Launch Job ${id}`;
    const quoteName = `${clientName} Quote`;
    const invoiceNumber = `${clientName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 18)}-INV`;
    const issueToken = `Worker issue ${id}`;
    const proofToken = `Worker proof ${id}`;
    const doneToken = `Worker done ${id}`;

    const ownerToken = await login(request, OWNER_EMAIL, OWNER_PASSWORD, 'owner');
    const workerToken = await login(request, WORKER_EMAIL, WORKER_PASSWORD, 'worker');

    const ownerApi = api(request, ownerToken);
    const workerApi = api(request, workerToken);

    const worker = await findWorker(ownerApi);
    const workerId = idOf(worker);
    const workerName = worker.name || worker.full_name || worker.display_name || worker.email || WORKER_EMAIL;
    expect(workerId, `worker should have id: ${JSON.stringify(worker).slice(0, 700)}`).toBeTruthy();

    const clientCreate = await firstGood([
      ['POST /api/clients', () => ownerApi.post('/api/clients', {
        name: clientName,
        phone: '0210000000',
        email: `${clientName.toLowerCase().replace(/[^a-z0-9]/g, '')}@example.com`,
        address: '25 Eastern Hutt Road, Lower Hutt',
        service: 'Lawn mowing',
        price: 149,
        schedule: 'Weekly',
        source: 'full_launch_one_test',
      })],
      ['POST /api/clients/create', () => ownerApi.post('/api/clients/create', {
        name: clientName,
        phone: '0210000000',
        address: '25 Eastern Hutt Road, Lower Hutt',
        service: 'Lawn mowing',
        price: 149,
        schedule: 'Weekly',
        source: 'full_launch_one_test',
      })],
    ], 'client create');

    expect(clientCreate.ok).toBeTruthy();
    await waitForList(ownerApi, '/api/clients', clientName, 'clients list');

    const jobCreate = await firstGood([
      ['POST /api/jobs', () => ownerApi.post('/api/jobs', {
        title: jobName,
        job_name: jobName,
        client_name: clientName,
        customer_name: clientName,
        address: '25 Eastern Hutt Road, Lower Hutt',
        site_address: '25 Eastern Hutt Road, Lower Hutt',
        service: 'Lawn mowing',
        scheduled_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
        scheduled_time: '09:00',
        estimated_duration: 60,
        price: 149,
        assigned_worker_id: workerId,
        worker_id: workerId,
        assigned_worker_name: workerName,
        worker_name: workerName,
        worker_email: WORKER_EMAIL,
        instructions: `Full launch instructions for ${jobName}`,
        notes: `Full launch instructions for ${jobName}`,
        status: 'assigned',
        source: 'full_launch_one_test',
      })],
      ['POST /api/jobs/create', () => ownerApi.post('/api/jobs/create', {
        title: jobName,
        job_name: jobName,
        client_name: clientName,
        worker_id: workerId,
        worker_email: WORKER_EMAIL,
        status: 'assigned',
        source: 'full_launch_one_test',
      })],
    ], 'assigned job create');

    const createdJob = jobCreate.body.job || jobCreate.body.data?.job || jobCreate.body.data || jobCreate.body;
    const jobId = idOf(createdJob);
    expect(jobId, `created job should have id: ${JSON.stringify(jobCreate.body).slice(0, 900)}`).toBeTruthy();

    await waitForList(ownerApi, '/api/jobs', jobName, 'owner jobs list');

    let workerSawJob = false;
    let workerLast = null;
    for (const endpoint of ['/api/worker/jobs', '/api/worker/my-jobs', '/api/jobs']) {
      const res = await workerApi.get(`${endpoint}?ts=${Date.now()}`);
      workerLast = { endpoint, ...res };
      if (res.ok && textHas(res.body, jobName)) {
        workerSawJob = true;
        break;
      }
    }

    expect(workerSawJob, `worker should see assigned job ${jobName}. Last: ${JSON.stringify(workerLast).slice(0, 1200)}`).toBeTruthy();

    await firstGood([
      [`POST /api/jobs/${jobId}/acknowledge`, () => workerApi.post(`/api/jobs/${jobId}/acknowledge`, {})],
      ['POST /api/worker/field-slip acknowledge', () => workerApi.post('/api/worker/field-slip', {
        job_id: jobId,
        jobId,
        type: 'job_acknowledged',
        kind: 'job_acknowledged',
        message: `Acknowledged ${jobName}`,
      })],
    ], 'worker acknowledge');

    await firstGood([
      [`POST /api/jobs/${jobId}/start`, () => workerApi.post(`/api/jobs/${jobId}/start`, {})],
      ['POST /api/worker/field-slip start', () => workerApi.post('/api/worker/field-slip', {
        job_id: jobId,
        jobId,
        type: 'job_started',
        kind: 'job_started',
        message: `Started ${jobName}`,
      })],
    ], 'worker start');

    await firstGood([
      ['POST /api/worker/field-slip issue', () => workerApi.post('/api/worker/field-slip', {
        job_id: jobId,
        jobId,
        type: 'job_issue',
        kind: 'job_issue',
        message: issueToken,
        note: issueToken,
      })],
    ], 'worker issue');

    await firstGood([
      ['POST /api/worker/field-slip proof', () => workerApi.post('/api/worker/field-slip', {
        job_id: jobId,
        jobId,
        type: 'job_proof',
        kind: 'job_proof',
        message: proofToken,
        note: proofToken,
      })],
    ], 'worker proof');

    await firstGood([
      [`POST /api/jobs/${jobId}/complete`, () => workerApi.post(`/api/jobs/${jobId}/complete`, {
        note: doneToken,
        proof: proofToken,
      })],
      ['POST /api/worker/field-slip complete', () => workerApi.post('/api/worker/field-slip', {
        job_id: jobId,
        jobId,
        type: 'job_completed',
        kind: 'job_completed',
        message: doneToken,
        note: doneToken,
        proof: proofToken,
      })],
    ], 'worker complete');

    const quoteCreate = await firstGood([
      ['POST /api/quotes', () => ownerApi.post('/api/quotes', {
        title: quoteName,
        quote_title: quoteName,
        client_name: clientName,
        amount: 149,
        status: 'Draft',
        scope: 'Weekly service created by full launch one-test audit.',
        source: 'full_launch_one_test',
      })],
      ['POST /api/quotes/create', () => ownerApi.post('/api/quotes/create', {
        title: quoteName,
        client_name: clientName,
        amount: 149,
        scope: 'Weekly service created by full launch one-test audit.',
        source: 'full_launch_one_test',
      })],
    ], 'quote create');

    expect(quoteCreate.ok).toBeTruthy();
    await waitForList(ownerApi, '/api/quotes', quoteName, 'quotes list');

    const invoiceCreate = await firstGood([
      ['POST /api/invoices', () => ownerApi.post('/api/invoices', {
        invoice_number: invoiceNumber,
        number: invoiceNumber,
        client_name: clientName,
        job_title: jobName,
        job_id: jobId,
        amount: 149,
        due_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        status: 'Draft',
        accounting_status: 'Command approval',
        line_item: 'Weekly service draft invoice',
        evidence: proofToken,
        source: 'full_launch_one_test',
      })],
      ['POST /api/invoices/create', () => ownerApi.post('/api/invoices/create', {
        invoice_number: invoiceNumber,
        client_name: clientName,
        amount: 149,
        status: 'Draft',
        source: 'full_launch_one_test',
      })],
    ], 'invoice create');

    expect(invoiceCreate.ok).toBeTruthy();
    await waitForList(ownerApi, '/api/invoices', invoiceNumber, 'invoices list');

    const context = await browser.newContext();
    const ownerPage = await context.newPage();

    for (const [label, path, mustMatch] of [
      ['clients', '/dashboard#clients', /Clients|Add client|Client/i],
      ['jobs', '/dashboard#jobs', /Jobs|Add job|Run sheet|Job/i],
      ['workers', '/dashboard#workers', /Workers|GPS|Worker|Field/i],
      ['quotes', '/dashboard#quotes', /Quotes|Quote/i],
      ['invoices', '/dashboard#invoices', /Invoices|Draft|Invoice/i],
      ['command', '/dashboard#command', /Command|Approve|Edit|Park|approval/i],
      ['xero', '/dashboard#xero', /Xero|MYOB|sync|draft|accounting/i],
    ]) {
      const body = await pageText(ownerPage, path, ownerToken);
      expect(body, `${label} page should open`).toMatch(mustMatch);
      expect(body, `${label} page should not crash`).not.toMatch(/Something went wrong|Application error|Cannot read properties|Minified React error/i);
    }

    const invoicesBody = await pageText(ownerPage, '/dashboard#invoices', ownerToken);
    expect(invoicesBody, 'invoice page must not claim automatic sending').not.toMatch(/auto.?send|automatically sent|sent without owner/i);

    const xeroBody = await pageText(ownerPage, '/dashboard#xero', ownerToken);
    expect(xeroBody, 'xero page should say draft sync only').toMatch(/Draft sync only/i);
    expect(xeroBody, 'xero page should say owner approved').toMatch(/Owner-approved|Owner approved/i);
    expect(xeroBody, 'xero page should block automatic sending').toMatch(/No automatic invoice sending/i);
    expect(xeroBody, 'xero page should block tax filing').toMatch(/No automatic invoice sending, tax filing or payout files|No tax filing/i);
    expect(xeroBody, 'xero page should block payout files').toMatch(/No automatic invoice sending, tax filing or payout files|No bank payout files|No payout files/i);

    const workerPage = await context.newPage();
    await pageText(workerPage, '/worker/jobs', workerToken);
    const workerBody = clean(await workerPage.locator('body').innerText({ timeout: 10000 }));
    expect(workerBody, 'worker app should open').toMatch(/Job|Today|Worker|Start|Complete|Acknowledge/i);
    expect(workerBody, 'worker app should not crash').not.toMatch(/Something went wrong|Application error|Cannot read properties|Minified React error/i);

    await context.close();
  });
});
