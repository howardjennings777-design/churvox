const { test, expect } = require('@playwright/test');

const BASE_URL = (process.env.PLAYWRIGHT_BASE_URL || 'https://www.churvox.com').replace(/\/+$/, '');
const API_BASE = (process.env.PLAYWRIGHT_API_BASE || 'https://grassley-backend.onrender.com').replace(/\/+$/, '');
const OWNER_EMAIL = process.env.CHURVOX_OWNER_EMAIL || '';
const OWNER_PASSWORD = process.env.CHURVOX_OWNER_PASSWORD || '';
const WORKER_EMAIL = process.env.CHURVOX_WORKER_EMAIL || '';
const WORKER_PASSWORD = process.env.CHURVOX_WORKER_PASSWORD || '';

function apiUrl(path) {
  return `${API_BASE}${path.startsWith('/api') ? path : `/api${path}`}`;
}

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
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
  expect(res.ok(), `${label} login failed ${res.status()}`).toBeTruthy();
  expect(token, `${label} token missing`).toBeTruthy();
  return token;
}

async function apiGet(request, token, path) {
  const res = await request.get(apiUrl(path), {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 20000,
  });
  return { ok: res.ok(), status: res.status(), body: await bodyOf(res) };
}

async function apiPost(request, token, path, data) {
  const res = await request.post(apiUrl(path), {
    headers: { Authorization: `Bearer ${token}` },
    data,
    timeout: 20000,
  });
  return { ok: res.ok(), status: res.status(), body: await bodyOf(res) };
}

async function newHumanContext(browser) {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  await context.addInitScript(() => {
    try {
      navigator.serviceWorker?.getRegistrations?.().then((regs) => regs.forEach((r) => r.unregister()));
    } catch {}
    try {
      caches?.keys?.().then((keys) => keys.forEach((key) => caches.delete(key)));
    } catch {}
  });
  return context;
}

async function uiLogin(page, email, password) {
  await page.goto(`${BASE_URL}/login?ledger=${Date.now()}`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto(`${BASE_URL}/login?ledger=${Date.now()}`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel(/email/i).first().fill(email);
  await page.getByLabel(/password/i).first().fill(password);
  await page.getByRole('button', { name: /sign in|log in/i }).first().click();
  await page.waitForTimeout(2500);
  const body = clean(await page.locator('body').innerText({ timeout: 15000 }));
  expect(body).not.toMatch(/WELCOME BACK|Sign in to see|Forgot password/i);
}

test.describe('Churvox true Admin Ledger', () => {
  test.setTimeout(240000);

  test('ledger brain audits jobs, worker updates, invoices, country pack and owner guardrails', async ({ request, browser }) => {
    if (!OWNER_EMAIL || !OWNER_PASSWORD) throw new Error('Set owner email/password env vars.');
    if (!WORKER_EMAIL || !WORKER_PASSWORD) throw new Error('Set worker email/password env vars.');

    const ownerToken = await apiLogin(request, OWNER_EMAIL, OWNER_PASSWORD, 'owner');
    const workerToken = await apiLogin(request, WORKER_EMAIL, WORKER_PASSWORD, 'worker');
    const id = Date.now();

    const messyClientName = `Ledger Messy Client ${id}`;
    const cleanClientName = `Ledger Clean Client ${id}`;
    const messyJobName = `Ledger Missing Job ${id}`;
    const completeJobName = `Ledger Complete Job ${id}`;
    const invoiceNumber = `LEDGER-INV-${id}`;

    let res = await apiPost(request, ownerToken, '/api/clients', {
      name: messyClientName,
      phone: '0210000000',
      email: `ledger-messy-${id}@example.com`,
      address: '',
      service: 'Lawn mowing',
      price: '',
      schedule: 'Weekly',
      notes: 'Created by true Admin Ledger audit.',
    });
    expect(res.ok, `messy client create ${res.status} ${JSON.stringify(res.body).slice(0, 500)}`).toBeTruthy();

    res = await apiPost(request, ownerToken, '/api/clients', {
      name: cleanClientName,
      phone: '0210000001',
      email: `ledger-clean-${id}@example.com`,
      address: '25 Eastern Hutt Road, Lower Hutt',
      service: 'Lawn mowing',
      price: 149,
      schedule: 'Weekly',
      notes: 'Created by true Admin Ledger audit.',
    });
    expect(res.ok, `clean client create ${res.status} ${JSON.stringify(res.body).slice(0, 500)}`).toBeTruthy();

    res = await apiPost(request, ownerToken, '/api/jobs', {
      title: messyJobName,
      client_name: messyClientName,
      address: '',
      service: 'Lawn mowing',
      assigned_worker_name: 'Unassigned',
      scheduled_date: '',
      scheduled_time: '',
      price: '',
      recurring: 'Weekly',
      status: 'assigned',
      proof_required: 'Required',
      notes: 'This should go to Missing info.',
    });
    expect(res.ok, `messy job create ${res.status} ${JSON.stringify(res.body).slice(0, 500)}`).toBeTruthy();

    res = await apiPost(request, ownerToken, '/api/jobs', {
      title: completeJobName,
      client_name: cleanClientName,
      address: '25 Eastern Hutt Road, Lower Hutt',
      service: 'Lawn mowing',
      assigned_worker_email: WORKER_EMAIL,
      assigned_worker_name: WORKER_EMAIL,
      scheduled_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      scheduled_time: '09:00',
      price: 149,
      recurring: 'Weekly',
      status: 'completed',
      proof: 'photo uploaded',
      proof_photo_count: 1,
      invoice_status: 'Draft',
      notes: 'This should go to Money waiting.',
    });
    expect(res.ok, `complete job create ${res.status} ${JSON.stringify(res.body).slice(0, 500)}`).toBeTruthy();

    res = await apiPost(request, ownerToken, '/api/invoices', {
      invoice_number: invoiceNumber,
      client_name: cleanClientName,
      job_title: completeJobName,
      amount: 149,
      currency: 'NZD',
      tax_name: 'GST',
      tax_rate: '15',
      invoice_title: 'Taxable supply information',
      business_id_value: '6a307b3df87c45bcc854770e',
      due_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      status: 'Draft',
      accounting_status: 'Not synced',
      line_item: completeJobName,
      evidence: 'photo uploaded',
      auto_sent: false,
    });
    expect(res.ok, `invoice create ${res.status} ${JSON.stringify(res.body).slice(0, 500)}`).toBeTruthy();

    res = await apiPost(request, workerToken, '/api/worker/field-slip', {
      type: 'worker_problem',
      kind: 'worker_problem',
      problem_key: 'access',
      problem_label: 'Access blocked',
      job_title: completeJobName,
      client_name: cleanClientName,
      text: `Ledger worker problem ${id}`,
      note: `Ledger worker problem ${id}`,
      summary: `Access blocked: ${completeJobName}`,
      source: 'true-admin-ledger-test',
    });
    expect(res.ok, `worker problem slip ${res.status} ${JSON.stringify(res.body).slice(0, 500)}`).toBeTruthy();

    res = await apiPost(request, workerToken, '/api/worker/field-slip', {
      type: 'job_proof',
      kind: 'job_proof',
      job_title: completeJobName,
      client_name: cleanClientName,
      text: `Ledger worker proof ${id}`,
      note: `Ledger worker proof ${id}`,
      photo_count: 1,
      photo_names: [`ledger-proof-${id}.png`],
      source: 'true-admin-ledger-test',
    });
    expect(res.ok, `worker proof slip ${res.status} ${JSON.stringify(res.body).slice(0, 500)}`).toBeTruthy();

    const audit = await apiGet(request, ownerToken, '/api/admin-ledger/audit');
    expect(audit.ok, `audit endpoint ${audit.status} ${JSON.stringify(audit.body).slice(0, 800)}`).toBeTruthy();
    expect(audit.body.ledger_version).toBe('true-admin-ledger-v1');
    expect(audit.body.owner_controlled).toBeTruthy();
    expect(audit.body.auto_invoice_sending).toBe(false);
    expect(audit.body.tax_filing).toBe(false);
    expect(audit.body.bank_payout_files).toBe(false);
    expect(audit.body.country.currency).toBeTruthy();
    expect(audit.body.country.tax_name).toBeTruthy();
    expect(audit.body.guardrails.join(' ')).toMatch(/No automatic invoice sending|No tax filing|No bank payout files/i);

    const actionsText = JSON.stringify(audit.body.actions);
    expect(actionsText).toContain(messyJobName);
    expect(actionsText).toContain(completeJobName);
    expect(actionsText).toContain(invoiceNumber);
    expect(actionsText).toMatch(/Worker problems/i);
    expect(actionsText).toMatch(/Missing info/i);
    expect(actionsText).toMatch(/Money waiting/i);
    expect(actionsText).toMatch(/Owner approval|required|Review in Command/i);

    const messyLedger = audit.body.audit.jobs.find((job) => JSON.stringify(job).includes(messyJobName));
    expect(messyLedger, 'messy job should be audited').toBeTruthy();
    expect(messyLedger.score, 'messy job should score below ready').toBeLessThan(100);
    expect(messyLedger.missing.join(' ')).toMatch(/Address|Worker|Date|Time|Price/i);

    const invoiceLedger = audit.body.audit.invoices.find((invoice) => JSON.stringify(invoice).includes(invoiceNumber));
    expect(invoiceLedger, 'invoice should be audited').toBeTruthy();
    expect(invoiceLedger.score, 'invoice should be mostly ready').toBeGreaterThanOrEqual(80);

    const command = await apiGet(request, ownerToken, '/api/command/actions');
    expect(command.ok, `command actions ${command.status} ${JSON.stringify(command.body).slice(0, 800)}`).toBeTruthy();
    expect(command.body.ledger_version).toBe('true-admin-ledger-v1');
    expect(JSON.stringify(command.body.actions)).toMatch(/Worker problems|Missing info|Money waiting|Day close/i);

    const context = await newHumanContext(browser);
    const page = await context.newPage();

    await uiLogin(page, OWNER_EMAIL, OWNER_PASSWORD);
    await page.goto(`${BASE_URL}/dashboard?ledger=${Date.now()}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    await expect(page.locator('.cvxWorldLedgerTab'), 'Admin Ledger tab should exist').toBeVisible({ timeout: 15000 });
    await page.locator('.cvxWorldLedgerTab').click();
    await expect(page.locator('body')).toContainText(/Country presets|Business country pack|No automatic invoice sending|No tax filing|No bank payout files/i, { timeout: 15000 });

    await page.getByRole('button', { name: /Quotes/i }).first().click();
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: /Add quote|New quote|Create quote/i }).first().click();
    await expect(page.getByLabel(/^Currency$/i).first(), 'quote currency field').toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel(/^Tax name$/i).first(), 'quote tax name field').toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel(/^Tax rate$/i).first(), 'quote tax rate field').toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel(/^Country pack$/i).first(), 'quote country pack field').toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /Close/i }).first().click();

    await page.getByRole('button', { name: /Invoices/i }).first().click();
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: /Add invoice|New invoice|Create invoice/i }).first().click();
    await expect(page.getByLabel(/^Invoice title$/i).first(), 'invoice title field').toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel(/^Currency$/i).first(), 'invoice currency field').toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel(/^Tax name$/i).first(), 'invoice tax name field').toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel(/^Tax rate$/i).first(), 'invoice tax rate field').toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel(/^Business ID$/i).first(), 'invoice business ID field').toBeVisible({ timeout: 10000 });

    await context.close();
  });
});
