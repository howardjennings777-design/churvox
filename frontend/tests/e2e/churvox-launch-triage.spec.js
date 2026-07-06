const { test, expect } = require('@playwright/test');

const API_BASE = (process.env.PLAYWRIGHT_API_BASE || 'https://grassley-backend.onrender.com').replace(/\/+$/, '');
const OWNER_EMAIL = process.env.CHURVOX_OWNER_EMAIL || '';
const OWNER_PASSWORD = process.env.CHURVOX_OWNER_PASSWORD || '';
const WORKER_EMAIL = process.env.CHURVOX_WORKER_EMAIL || '';
const MUTATE = /^(1|true|yes)$/i.test(process.env.CHURVOX_E2E_MUTATE || '');

function stamp() {
  return new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
}

function apiUrl(path) {
  return `${API_BASE}${path.startsWith('/api') ? path : `/api${path}`}`;
}

function textHas(value, token) {
  return JSON.stringify(value || {}).toLowerCase().includes(String(token || '').toLowerCase());
}


function listFrom(payload, keys = []) {
  const data = payload?.data?.data ?? payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  for (const key of [...keys, 'items', 'records', 'results', 'jobs', 'clients', 'workers', 'team', 'members', 'data']) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

function idOf(value) {
  return String(value?.id || value?._id || value?.worker_id || value?.user_id || value?.job_id || '');
}

async function authedGet(request, token, path) {
  const res = await request.get(apiUrl(path), {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 15000,
  });
  const body = await res.json().catch(async () => ({ text: await res.text().catch(() => '') }));
  return { ok: res.ok(), status: res.status(), body };
}

async function authedPost(request, token, path, data) {
  const res = await request.post(apiUrl(path), {
    headers: { Authorization: `Bearer ${token}` },
    data,
    timeout: 15000,
  });
  const body = await res.json().catch(async () => ({ text: await res.text().catch(() => '') }));
  return { ok: res.ok(), status: res.status(), body };
}

async function findWorker(request, token) {
  for (const endpoint of ['/api/team/workers', '/api/team', '/api/workers', '/api/worker/live-status']) {
    const res = await authedGet(request, token, `${endpoint}?ts=${Date.now()}`);
    if (!res.ok) continue;

    const workers = listFrom(res.body, ['workers', 'team', 'members']);
    const wanted = workers.find((worker) => String(worker.email || worker.worker_email || '').toLowerCase() === WORKER_EMAIL.toLowerCase());

    if (wanted) return wanted;
  }

  throw new Error(`Could not find worker email ${WORKER_EMAIL} in owner team endpoints.`);
}

async function ownerLogin(request) {
  const res = await request.post(apiUrl('/api/auth/login'), {
    data: { email: OWNER_EMAIL, password: OWNER_PASSWORD },
    timeout: 15000,
  });

  const body = await res.json().catch(async () => ({ text: await res.text().catch(() => '') }));
  const token = body.token || body.access_token || body.data?.token || body.user?.token || '';

  expect(res.ok(), `owner login failed ${res.status()}: ${JSON.stringify(body).slice(0, 700)}`).toBeTruthy();
  expect(token, 'owner login should return token').toBeTruthy();

  return token;
}

test.describe('Churvox launch triage', () => {
  test.setTimeout(60000);

  test('owner API login works', async ({ request }) => {
    if (!OWNER_EMAIL || !OWNER_PASSWORD) throw new Error('Set owner email/password env vars.');
    await ownerLogin(request);
  });

  test('client API create and list works', async ({ request }) => {
    if (!MUTATE) throw new Error('Set CHURVOX_E2E_MUTATE=1.');
    const token = await ownerLogin(request);
    const clientName = `Triage Client ${stamp()}`;

    const create = await request.post(apiUrl('/api/clients'), {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: clientName,
        phone: '0210000000',
        email: `${clientName.toLowerCase().replace(/[^a-z0-9]/g, '')}@example.com`,
        address: '25 Eastern Hutt Road, Lower Hutt',
        service: 'Lawn mowing',
        price: 149,
        schedule: 'Weekly',
        source: 'launch_triage',
      },
      timeout: 15000,
    });

    const createBody = await create.json().catch(async () => ({ text: await create.text().catch(() => '') }));
    expect(create.ok(), `client create failed ${create.status()}: ${JSON.stringify(createBody).slice(0, 700)}`).toBeTruthy();

    const list = await request.get(apiUrl(`/api/clients?ts=${Date.now()}`), {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 15000,
    });

    const listBody = await list.json().catch(async () => ({ text: await list.text().catch(() => '') }));
    expect(list.ok(), `client list failed ${list.status()}: ${JSON.stringify(listBody).slice(0, 700)}`).toBeTruthy();
    expect(textHas(listBody, clientName), `client list should contain ${clientName}`).toBeTruthy();
  });

  test('owner clients page opens', async ({ page, request }) => {
    const token = await ownerLogin(request);

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.evaluate((value) => {
      localStorage.setItem('token', value);
      localStorage.setItem('authToken', value);
    }, token);

    await page.goto('/dashboard#clients', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const body = await page.locator('body').innerText({ timeout: 10000 });
    expect(body).toMatch(/Clients|Add client|Client/i);
    expect(body).not.toMatch(/Something went wrong|Application error|Cannot read properties/i);
  });

  test('supplied worker exists in owner team', async ({ request }) => {
    if (!WORKER_EMAIL) throw new Error('Set CHURVOX_WORKER_EMAIL.');
    const token = await ownerLogin(request);
    const worker = await findWorker(request, token);

    expect(idOf(worker), `worker should have id: ${JSON.stringify(worker).slice(0, 700)}`).toBeTruthy();
  });

  test('assigned job API create and list works', async ({ request }) => {
    if (!MUTATE) throw new Error('Set CHURVOX_E2E_MUTATE=1.');
    if (!WORKER_EMAIL) throw new Error('Set CHURVOX_WORKER_EMAIL.');

    const token = await ownerLogin(request);
    const worker = await findWorker(request, token);

    const id = stamp();
    const clientName = `Triage Job Client ${id}`;
    const jobName = `Triage Job ${id}`;
    const workerId = idOf(worker);
    const workerName = worker.name || worker.full_name || worker.display_name || worker.email || WORKER_EMAIL;

    await authedPost(request, token, '/api/clients', {
      name: clientName,
      phone: '0210000000',
      email: `${clientName.toLowerCase().replace(/[^a-z0-9]/g, '')}@example.com`,
      address: '25 Eastern Hutt Road, Lower Hutt',
      service: 'Lawn mowing',
      price: 149,
      schedule: 'Weekly',
      source: 'launch_triage_job',
    });

    const createJob = await authedPost(request, token, '/api/jobs', {
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
      instructions: `Triage instructions for ${jobName}`,
      notes: `Triage instructions for ${jobName}`,
      status: 'assigned',
      source: 'launch_triage_job',
    });

    expect(createJob.ok, `job create failed ${createJob.status}: ${JSON.stringify(createJob.body).slice(0, 900)}`).toBeTruthy();

    const list = await authedGet(request, token, `/api/jobs?ts=${Date.now()}`);
    expect(list.ok, `job list failed ${list.status}: ${JSON.stringify(list.body).slice(0, 700)}`).toBeTruthy();
    expect(textHas(list.body, jobName), `job list should contain ${jobName}`).toBeTruthy();
  });

});
