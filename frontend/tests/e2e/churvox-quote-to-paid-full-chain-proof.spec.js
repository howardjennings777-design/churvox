const { test, expect } = require('@playwright/test');

const API_BASE = (process.env.CHURVOX_API_BASE || 'https://grassley-backend.onrender.com').replace(/\/$/, '');
const APP_BASE = (process.env.CHURVOX_APP_BASE || 'https://www.churvox.com').replace(/\/$/, '');
const OWNER_EMAIL = process.env.CHURVOX_E2E_EMAIL;
const OWNER_PASS = process.env.CHURVOX_E2E_PASSWORD;
const WORKER_PASSWORD = process.env.CHURVOX_WORKER_PROOF_PASSWORD || 'WorkerProof123!';

function api(path) {
  return `${API_BASE}/api${path.startsWith('/') ? path : `/${path}`}`;
}

async function readJson(res) {
  const text = await res.text();
  try {
    return { text, json: text ? JSON.parse(text) : {} };
  } catch {
    return { text, json: {} };
  }
}

function plusEmail(email, tag) {
  const [name, domain] = String(email || '').split('@');
  if (!name || !domain) throw new Error('CHURVOX_E2E_EMAIL must be a real email');
  return `${name}+${tag}@${domain}`;
}

function tokenFromUrl(url, type) {
  const match = String(url || '').match(new RegExp(`/public/${type}/([^/?#]+)`));
  return match ? match[1] : '';
}

function inviteToken(link) {
  const match = String(link || '').match(/\/invite\/setup\/([^/?#]+)/);
  return match ? match[1] : '';
}

async function postFirstOk(request, label, paths) {
  const tried = [];
  for (const path of paths) {
    const res = await request.post(api(path));
    const payload = await readJson(res);
    tried.push({ path, status: res.status(), body: payload.text.slice(0, 250) });

    console.log(`${label}_TRY_PATH=${path}`);
    console.log(`${label}_TRY_STATUS=${res.status()}`);

    if (res.status() < 400) return { path, res, payload };
  }
  throw new Error(`${label} no successful endpoint: ${JSON.stringify(tried)}`);
}

test('quote accepted becomes assigned worker job then paid invoice', async ({ request, browser, page }) => {
  test.setTimeout(240000);

  if (!OWNER_EMAIL || !OWNER_PASS) {
    throw new Error('Set CHURVOX_E2E_EMAIL and CHURVOX_E2E_PASSWORD');
  }

  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const workerEmail = plusEmail(OWNER_EMAIL, `fullworker${stamp}`);
  const customerEmail = plusEmail(OWNER_EMAIL, `fullcustomer${stamp}`);

  console.log(`FULL_CHAIN_API_BASE=${API_BASE}`);
  console.log(`FULL_CHAIN_APP_BASE=${APP_BASE}`);
  console.log(`FULL_CHAIN_OWNER_EMAIL=${OWNER_EMAIL}`);
  console.log(`FULL_CHAIN_WORKER_EMAIL=${workerEmail}`);
  console.log(`FULL_CHAIN_CUSTOMER_EMAIL=${customerEmail}`);

  const ownerLoginRes = await request.post(api('/auth/login'), {
    data: { email: OWNER_EMAIL, password: OWNER_PASS },
  });
  const ownerLoginPayload = await readJson(ownerLoginRes);

  console.log(`FULL_CHAIN_OWNER_LOGIN_STATUS=${ownerLoginRes.status()}`);
  console.log(`FULL_CHAIN_OWNER_PLAN=${ownerLoginPayload.json?.plan || ownerLoginPayload.json?.user?.plan || ''}`);

  expect(ownerLoginRes.status()).toBeLessThan(400);

  const planRes = await request.get(api('/billing/subscription-status'));
  const planPayload = await readJson(planRes);
  const plan = planPayload.json?.plan || '';

  console.log(`FULL_CHAIN_PLAN_STATUS=${planRes.status()}`);
  console.log(`FULL_CHAIN_PLAN_VALUE=${plan}`);

  expect(planRes.status()).toBeLessThan(400);
  expect(['team', 'pro', 'enterprise']).toContain(plan);

  const workerRes = await request.post(api('/team/workers'), {
    data: {
      name: `Full Chain Worker ${stamp}`,
      email: workerEmail,
      phone: '+64210000009',
      role_title: 'Worker',
      hourly_rate: 35,
    },
  });
  const workerPayload = await readJson(workerRes);

  const workerId =
    workerPayload.json?.id ||
    workerPayload.json?.worker_id ||
    workerPayload.json?.worker?.id ||
    workerPayload.json?.worker?._id ||
    '';
  const workerInviteToken = inviteToken(workerPayload.json?.invite_link || workerPayload.json?.worker?.invite_link || '');

  console.log(`FULL_CHAIN_WORKER_INVITE_STATUS=${workerRes.status()}`);
  console.log(`FULL_CHAIN_WORKER_ID=${workerId}`);
  console.log(`FULL_CHAIN_WORKER_INVITE_TOKEN=${workerInviteToken}`);

  expect(workerRes.status()).toBeLessThan(400);
  expect(workerId).toBeTruthy();
  expect(workerInviteToken).toBeTruthy();

  const acceptWorkerRes = await request.post(api('/invite/accept'), {
    data: {
      token: workerInviteToken,
      password: WORKER_PASSWORD,
      name: `Full Chain Worker ${stamp}`,
    },
  });

  console.log(`FULL_CHAIN_WORKER_ACCEPT_STATUS=${acceptWorkerRes.status()}`);
  expect(acceptWorkerRes.status()).toBeLessThan(400);

  const clientRes = await request.post(api('/clients'), {
    data: {
      name: `Full Chain Client ${stamp}`,
      email: customerEmail,
      phone: '+64210000010',
      address: `6 Full Chain Street ${stamp}`,
      notes: 'Full quote to paid chain proof client',
    },
  });
  const clientPayload = await readJson(clientRes);
  const clientId = clientPayload.json?.id || clientPayload.json?._id;

  console.log(`FULL_CHAIN_CLIENT_STATUS=${clientRes.status()}`);
  console.log(`FULL_CHAIN_CLIENT_ID=${clientId || ''}`);

  expect(clientRes.status()).toBeLessThan(400);
  expect(clientId).toBeTruthy();

  const quoteRes = await request.post(api('/quotes'), {
    data: {
      customer_name: `Full Chain Client ${stamp}`,
      customer_email: customerEmail,
      client_id: clientId,
      address: `6 Full Chain Street ${stamp}`,
      job_description: `Full chain quote job ${stamp}`,
      job_type: 'lawn_mowing',
      price: 160,
      pricing_type: 'fixed',
      notes: 'Full quote accept to paid proof',
    },
  });
  const quotePayload = await readJson(quoteRes);
  const quoteId = quotePayload.json?.id || quotePayload.json?._id;

  console.log(`FULL_CHAIN_QUOTE_CREATE_STATUS=${quoteRes.status()}`);
  console.log(`FULL_CHAIN_QUOTE_ID=${quoteId || ''}`);

  expect(quoteRes.status()).toBeLessThan(400);
  expect(quoteId).toBeTruthy();

  const sendQuoteRes = await request.post(api(`/quotes/${quoteId}/send`));
  const sendQuotePayload = await readJson(sendQuoteRes);
  const quoteUrl = sendQuotePayload.json?.public_url || '';
  const quoteToken = tokenFromUrl(quoteUrl, 'quote');

  console.log(`FULL_CHAIN_QUOTE_SEND_STATUS=${sendQuoteRes.status()}`);
  console.log(`FULL_CHAIN_QUOTE_EMAIL_SENT=${sendQuotePayload.json?.email_sent}`);
  console.log(`FULL_CHAIN_QUOTE_URL=${quoteUrl}`);
  console.log(`FULL_CHAIN_QUOTE_TOKEN=${quoteToken}`);

  expect(sendQuoteRes.status()).toBeLessThan(400);
  expect(quoteToken).toBeTruthy();

  await page.goto(quoteUrl, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toContainText(`Full Chain Client ${stamp}`, { timeout: 30000 });

  const acceptQuoteRes = await request.post(api(`/public/quote/${quoteToken}/accept`), {
    data: { accepted_by: `Full Chain Client ${stamp}` },
  });
  const acceptQuotePayload = await readJson(acceptQuoteRes);
  const createdJobId = acceptQuotePayload.json?.job_id || '';

  console.log(`FULL_CHAIN_QUOTE_ACCEPT_STATUS=${acceptQuoteRes.status()}`);
  console.log(`FULL_CHAIN_QUOTE_ACCEPT_JOB_ID=${createdJobId}`);

  expect(acceptQuoteRes.status()).toBeLessThan(400);
  expect(createdJobId).toBeTruthy();

  const assignRes = await request.post(api(`/jobs/${createdJobId}/assign`), {
    data: { worker_id: workerId },
  });
  const assignPayload = await readJson(assignRes);

  console.log(`FULL_CHAIN_ASSIGN_STATUS=${assignRes.status()}`);
  console.log(`FULL_CHAIN_ASSIGN_WORKER_ID=${assignPayload.json?.assigned_worker_id || ''}`);
  console.log(`FULL_CHAIN_ASSIGN_JOB_STATUS=${assignPayload.json?.status || ''}`);

  expect(assignRes.status()).toBeLessThan(400);
  expect(String(assignPayload.json?.assigned_worker_id || '')).toBe(String(workerId));

  const workerContext = await browser.newContext({ baseURL: APP_BASE });
  const workerApi = workerContext.request;

  const workerLoginRes = await workerApi.post(api('/auth/login'), {
    data: { email: workerEmail, password: WORKER_PASSWORD },
  });
  const workerLoginPayload = await readJson(workerLoginRes);

  console.log(`FULL_CHAIN_WORKER_LOGIN_STATUS=${workerLoginRes.status()}`);
  console.log(`FULL_CHAIN_WORKER_ROLE=${workerLoginPayload.json?.role || workerLoginPayload.json?.user?.role || ''}`);

  expect(workerLoginRes.status()).toBeLessThan(400);

  const workerJobsRes = await workerApi.get(api('/jobs'));
  const workerJobsPayload = await readJson(workerJobsRes);
  const workerJobs = Array.isArray(workerJobsPayload.json) ? workerJobsPayload.json : [];
  const workerHasJob = workerJobs.some((j) => String(j.id || j._id) === String(createdJobId));

  console.log(`FULL_CHAIN_WORKER_JOBS_STATUS=${workerJobsRes.status()}`);
  console.log(`FULL_CHAIN_WORKER_HAS_JOB=${workerHasJob}`);

  expect(workerJobsRes.status()).toBeLessThan(400);
  expect(workerHasJob).toBeTruthy();

  const ackRes = await workerApi.post(api(`/jobs/${createdJobId}/acknowledge`));
  const ackPayload = await readJson(ackRes);

  console.log(`FULL_CHAIN_WORKER_ACK_STATUS=${ackRes.status()}`);
  console.log(`FULL_CHAIN_WORKER_ACK_STATE=${ackPayload.json?.status || ''}`);

  expect(ackRes.status()).toBeLessThan(400);

  const start = await postFirstOk(workerApi, 'FULL_CHAIN_TIMER_START', [
    `/jobs/${createdJobId}/timer/start`,
    `/jobs/${createdJobId}/time/start`,
    `/jobs/${createdJobId}/start-timer`,
    `/time-tracking/${createdJobId}/start`,
    `/jobs/${createdJobId}/start`,
  ]);

  console.log(`FULL_CHAIN_TIMER_START_PATH=${start.path}`);

  await new Promise((resolve) => setTimeout(resolve, 2500));

  const complete = await postFirstOk(workerApi, 'FULL_CHAIN_WORKER_COMPLETE', [
    `/jobs/${createdJobId}/complete`,
    `/jobs/${createdJobId}/timer/complete`,
    `/jobs/${createdJobId}/finish`,
  ]);

  console.log(`FULL_CHAIN_WORKER_COMPLETE_PATH=${complete.path}`);
  console.log(`FULL_CHAIN_WORKER_COMPLETE_STATUS_VALUE=${complete.payload.json?.status || ''}`);
  console.log(`FULL_CHAIN_WORKER_COMPLETE_SECONDS=${complete.payload.json?.total_time_seconds ?? ''}`);

  await workerContext.close();

  const ownerJobRes = await request.get(api(`/jobs/${createdJobId}`));
  const ownerJobPayload = await readJson(ownerJobRes);

  console.log(`FULL_CHAIN_OWNER_JOB_GET_STATUS=${ownerJobRes.status()}`);
  console.log(`FULL_CHAIN_OWNER_JOB_FINAL_STATUS=${ownerJobPayload.json?.status || ''}`);
  console.log(`FULL_CHAIN_OWNER_JOB_SECONDS=${ownerJobPayload.json?.total_time_seconds ?? ''}`);

  expect(ownerJobRes.status()).toBeLessThan(400);
  expect(String(ownerJobPayload.json?.status || '').toLowerCase()).toBe('completed');

  const invoiceRes = await request.post(api('/invoices'), {
    data: {
      customer_name: `Full Chain Client ${stamp}`,
      customer_email: customerEmail,
      client_id: clientId,
      job_id: createdJobId,
      description: `Invoice for full chain job ${stamp}`,
      subtotal: 160,
      gst_rate: 15,
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
  });
  const invoicePayload = await readJson(invoiceRes);
  const invoiceId = invoicePayload.json?.id || invoicePayload.json?._id;

  console.log(`FULL_CHAIN_INVOICE_CREATE_STATUS=${invoiceRes.status()}`);
  console.log(`FULL_CHAIN_INVOICE_ID=${invoiceId || ''}`);
  console.log(`FULL_CHAIN_INVOICE_TOTAL=${invoicePayload.json?.total ?? ''}`);

  expect(invoiceRes.status()).toBeLessThan(400);
  expect(invoiceId).toBeTruthy();

  const sendInvoiceRes = await request.post(api(`/invoices/${invoiceId}/send`));
  const sendInvoicePayload = await readJson(sendInvoiceRes);
  const invoiceUrl = sendInvoicePayload.json?.public_url || '';
  const invoiceToken = tokenFromUrl(invoiceUrl, 'invoice');

  console.log(`FULL_CHAIN_INVOICE_SEND_STATUS=${sendInvoiceRes.status()}`);
  console.log(`FULL_CHAIN_INVOICE_EMAIL_SENT=${sendInvoicePayload.json?.email_sent}`);
  console.log(`FULL_CHAIN_INVOICE_PROVIDER=${sendInvoicePayload.json?.email_provider || ''}`);
  console.log(`FULL_CHAIN_INVOICE_URL=${invoiceUrl}`);
  console.log(`FULL_CHAIN_INVOICE_TOKEN=${invoiceToken}`);

  expect(sendInvoiceRes.status()).toBeLessThan(400);
  expect(sendInvoicePayload.json?.email_sent).toBeTruthy();
  expect(invoiceToken).toBeTruthy();

  await page.goto(invoiceUrl, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toContainText(`Full Chain Client ${stamp}`, { timeout: 30000 });

  const markPaidRes = await request.post(api(`/public/invoice/${invoiceToken}/mark-paid`), {
    data: { payment_method: 'manual', note: 'Full chain paid proof' },
  });
  const markPaidPayload = await readJson(markPaidRes);

  console.log(`FULL_CHAIN_MARK_PAID_STATUS=${markPaidRes.status()}`);
  console.log(`FULL_CHAIN_MARK_PAID_VALUE=${markPaidPayload.json?.status || ''}`);

  expect(markPaidRes.status()).toBeLessThan(400);
  expect(String(markPaidPayload.json?.status || '').toLowerCase()).toBe('paid');

  const ownerInvoiceRes = await request.get(api(`/invoices/${invoiceId}`));
  const ownerInvoicePayload = await readJson(ownerInvoiceRes);

  console.log(`FULL_CHAIN_OWNER_INVOICE_GET_STATUS=${ownerInvoiceRes.status()}`);
  console.log(`FULL_CHAIN_OWNER_INVOICE_STATUS=${ownerInvoicePayload.json?.status || ''}`);
  console.log(`FULL_CHAIN_OWNER_INVOICE_PAID_AT=${ownerInvoicePayload.json?.paid_at || ''}`);

  expect(ownerInvoiceRes.status()).toBeLessThan(400);
  expect(String(ownerInvoicePayload.json?.status || '').toLowerCase()).toBe('paid');

  console.log('QUOTE_ACCEPT_TO_WORKER_JOB_TO_PAID_INVOICE_PROOF=passed');
});
