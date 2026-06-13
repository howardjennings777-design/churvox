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

function tokenFromInviteLink(link) {
  const match = String(link || '').match(/\/invite\/setup\/([^/?#]+)/);
  return match ? match[1] : '';
}

function tokenFromPublicInvoiceUrl(url) {
  const match = String(url || '').match(/\/public\/invoice\/([^/?#]+)/);
  return match ? match[1] : '';
}

async function postFirstOk(request, label, paths) {
  const attempts = [];

  for (const path of paths) {
    const res = await request.post(api(path));
    const payload = await readJson(res);

    attempts.push({ path, status: res.status(), body: payload.text.slice(0, 300) });

    console.log(`${label}_TRY_PATH=${path}`);
    console.log(`${label}_TRY_STATUS=${res.status()}`);
    console.log(`${label}_TRY_BODY=${payload.text.slice(0, 300)}`);

    if (res.status() < 400) {
      return { path, res, payload };
    }
  }

  throw new Error(`${label} no successful endpoint: ${JSON.stringify(attempts)}`);
}

test('completed worker job can become emailed public invoice', async ({ request, browser }) => {
  test.setTimeout(180000);

  if (!OWNER_EMAIL || !OWNER_PASS) {
    throw new Error('Set CHURVOX_E2E_EMAIL and CHURVOX_E2E_PASSWORD');
  }

  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const workerEmail = plusEmail(OWNER_EMAIL, `invoiceworker${stamp}`);
  const customerEmail = plusEmail(OWNER_EMAIL, `invoicecustomer${stamp}`);

  console.log(`WORKER_INVOICE_API_BASE=${API_BASE}`);
  console.log(`WORKER_INVOICE_APP_BASE=${APP_BASE}`);
  console.log(`WORKER_INVOICE_OWNER_EMAIL=${OWNER_EMAIL}`);
  console.log(`WORKER_INVOICE_WORKER_EMAIL=${workerEmail}`);
  console.log(`WORKER_INVOICE_CUSTOMER_EMAIL=${customerEmail}`);

  const ownerLoginRes = await request.post(api('/auth/login'), {
    data: {
      email: OWNER_EMAIL,
      password: OWNER_PASS,
    },
  });
  const ownerLoginPayload = await readJson(ownerLoginRes);

  console.log(`WORKER_INVOICE_OWNER_LOGIN_STATUS=${ownerLoginRes.status()}`);
  console.log(`WORKER_INVOICE_OWNER_PLAN=${ownerLoginPayload.json?.plan || ownerLoginPayload.json?.user?.plan || ''}`);

  expect(ownerLoginRes.status()).toBeLessThan(400);

  const planRes = await request.get(api('/billing/subscription-status'));
  const planPayload = await readJson(planRes);
  const plan = planPayload.json?.plan || '';

  console.log(`WORKER_INVOICE_OWNER_PLAN_STATUS=${planRes.status()}`);
  console.log(`WORKER_INVOICE_OWNER_PLAN_VALUE=${plan}`);

  expect(planRes.status()).toBeLessThan(400);
  expect(['team', 'pro', 'enterprise']).toContain(plan);

  const workerCreateRes = await request.post(api('/team/workers'), {
    data: {
      name: `Invoice Worker ${stamp}`,
      email: workerEmail,
      phone: '+64210000005',
      role_title: 'Worker',
      hourly_rate: 32,
    },
  });
  const workerCreatePayload = await readJson(workerCreateRes);

  console.log(`WORKER_INVOICE_INVITE_STATUS=${workerCreateRes.status()}`);
  console.log(`WORKER_INVOICE_INVITE_BODY=${workerCreatePayload.text.slice(0, 500)}`);

  expect(workerCreateRes.status()).toBeLessThan(400);

  const workerId =
    workerCreatePayload.json?.id ||
    workerCreatePayload.json?.worker_id ||
    workerCreatePayload.json?.worker?.id ||
    workerCreatePayload.json?.worker?._id ||
    '';

  const inviteLink =
    workerCreatePayload.json?.invite_link ||
    workerCreatePayload.json?.worker?.invite_link ||
    '';

  const inviteToken = tokenFromInviteLink(inviteLink);

  console.log(`WORKER_INVOICE_WORKER_ID=${workerId}`);
  console.log(`WORKER_INVOICE_INVITE_LINK_RETURNED=${Boolean(inviteLink)}`);
  console.log(`WORKER_INVOICE_INVITE_TOKEN=${inviteToken}`);

  expect(workerId).toBeTruthy();
  expect(inviteToken).toBeTruthy();

  const acceptRes = await request.post(api('/invite/accept'), {
    data: {
      token: inviteToken,
      password: WORKER_PASSWORD,
      name: `Invoice Worker ${stamp}`,
    },
  });
  const acceptPayload = await readJson(acceptRes);

  console.log(`WORKER_INVOICE_INVITE_ACCEPT_STATUS=${acceptRes.status()}`);
  console.log(`WORKER_INVOICE_INVITE_ACCEPT_BODY=${acceptPayload.text.slice(0, 500)}`);

  expect(acceptRes.status()).toBeLessThan(400);

  const clientRes = await request.post(api('/clients'), {
    data: {
      name: `Worker Invoice Client ${stamp}`,
      email: customerEmail,
      phone: '+64210000006',
      address: `3 Worker Invoice Street ${stamp}`,
      notes: 'Completed worker job to invoice proof client',
    },
  });
  const clientPayload = await readJson(clientRes);
  const clientId = clientPayload.json?.id || clientPayload.json?._id;

  console.log(`WORKER_INVOICE_CLIENT_CREATE_STATUS=${clientRes.status()}`);
  console.log(`WORKER_INVOICE_CLIENT_ID=${clientId || ''}`);

  expect(clientRes.status()).toBeLessThan(400);
  expect(clientId).toBeTruthy();

  const jobRes = await request.post(api('/jobs'), {
    data: {
      title: `Worker Invoice Job ${stamp}`,
      job_type: 'lawn_mowing',
      customer_name: `Worker Invoice Client ${stamp}`,
      client_id: clientId,
      assigned_worker_id: workerId,
      address: `3 Worker Invoice Street ${stamp}`,
      price: 125,
      pricing_type: 'fixed',
      notes: 'Completed worker job to invoice proof',
      scheduled_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
  });
  const jobPayload = await readJson(jobRes);
  const jobId = jobPayload.json?.id || jobPayload.json?._id;

  console.log(`WORKER_INVOICE_JOB_CREATE_STATUS=${jobRes.status()}`);
  console.log(`WORKER_INVOICE_JOB_ID=${jobId || ''}`);
  console.log(`WORKER_INVOICE_JOB_ASSIGNED_WORKER_ID=${jobPayload.json?.assigned_worker_id || ''}`);

  expect(jobRes.status()).toBeLessThan(400);
  expect(jobId).toBeTruthy();
  expect(String(jobPayload.json?.assigned_worker_id || '')).toBe(String(workerId));

  const workerContext = await browser.newContext({ baseURL: APP_BASE });
  const workerApi = workerContext.request;

  const workerLoginRes = await workerApi.post(api('/auth/login'), {
    data: {
      email: workerEmail,
      password: WORKER_PASSWORD,
    },
  });
  const workerLoginPayload = await readJson(workerLoginRes);

  console.log(`WORKER_INVOICE_WORKER_LOGIN_STATUS=${workerLoginRes.status()}`);
  console.log(`WORKER_INVOICE_WORKER_LOGIN_ROLE=${workerLoginPayload.json?.role || workerLoginPayload.json?.user?.role || ''}`);

  expect(workerLoginRes.status()).toBeLessThan(400);

  const workerJobsRes = await workerApi.get(api('/jobs'));
  const workerJobsPayload = await readJson(workerJobsRes);
  const jobs = Array.isArray(workerJobsPayload.json) ? workerJobsPayload.json : [];
  const foundJob = jobs.find((j) => String(j.id || j._id) === String(jobId));

  console.log(`WORKER_INVOICE_WORKER_LIST_STATUS=${workerJobsRes.status()}`);
  console.log(`WORKER_INVOICE_JOB_FOUND_FOR_WORKER=${Boolean(foundJob)}`);

  expect(workerJobsRes.status()).toBeLessThan(400);
  expect(foundJob).toBeTruthy();

  const acknowledgeRes = await workerApi.post(api(`/jobs/${jobId}/acknowledge`));
  const acknowledgePayload = await readJson(acknowledgeRes);

  console.log(`WORKER_INVOICE_ACKNOWLEDGE_STATUS=${acknowledgeRes.status()}`);
  console.log(`WORKER_INVOICE_ACKNOWLEDGE_STATE=${acknowledgePayload.json?.status || ''}`);

  expect(acknowledgeRes.status()).toBeLessThan(400);

  const start = await postFirstOk(workerApi, 'WORKER_INVOICE_TIMER_START', [
    `/jobs/${jobId}/timer/start`,
    `/jobs/${jobId}/time/start`,
    `/jobs/${jobId}/start-timer`,
    `/time-tracking/${jobId}/start`,
    `/jobs/${jobId}/start`,
  ]);

  console.log(`WORKER_INVOICE_TIMER_START_PATH=${start.path}`);

  await new Promise((resolve) => setTimeout(resolve, 2500));

  const complete = await postFirstOk(workerApi, 'WORKER_INVOICE_COMPLETE', [
    `/jobs/${jobId}/complete`,
    `/jobs/${jobId}/timer/complete`,
    `/jobs/${jobId}/finish`,
  ]);

  console.log(`WORKER_INVOICE_COMPLETE_PATH=${complete.path}`);
  console.log(`WORKER_INVOICE_COMPLETE_STATUS_VALUE=${complete.payload.json?.status || ''}`);
  console.log(`WORKER_INVOICE_COMPLETE_TOTAL_SECONDS=${complete.payload.json?.total_time_seconds ?? ''}`);

  await workerContext.close();

  const ownerJobRes = await request.get(api(`/jobs/${jobId}`));
  const ownerJobPayload = await readJson(ownerJobRes);

  console.log(`WORKER_INVOICE_OWNER_JOB_GET_STATUS=${ownerJobRes.status()}`);
  console.log(`WORKER_INVOICE_OWNER_JOB_FINAL_STATUS=${ownerJobPayload.json?.status || ''}`);
  console.log(`WORKER_INVOICE_OWNER_JOB_TOTAL_SECONDS=${ownerJobPayload.json?.total_time_seconds ?? ''}`);

  expect(ownerJobRes.status()).toBeLessThan(400);
  expect(String(ownerJobPayload.json?.status || '').toLowerCase()).toBe('completed');

  const invoiceRes = await request.post(api('/invoices'), {
    data: {
      customer_name: `Worker Invoice Client ${stamp}`,
      customer_email: customerEmail,
      client_id: clientId,
      job_id: jobId,
      description: `Invoice for completed worker job ${stamp}`,
      subtotal: 125,
      gst_rate: 15,
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
  });
  const invoicePayload = await readJson(invoiceRes);
  const invoiceId = invoicePayload.json?.id || invoicePayload.json?._id;

  console.log(`WORKER_INVOICE_CREATE_INVOICE_STATUS=${invoiceRes.status()}`);
  console.log(`WORKER_INVOICE_INVOICE_ID=${invoiceId || ''}`);
  console.log(`WORKER_INVOICE_INVOICE_NUMBER=${invoicePayload.json?.invoice_number || ''}`);
  console.log(`WORKER_INVOICE_TOTAL=${invoicePayload.json?.total ?? ''}`);

  expect(invoiceRes.status()).toBeLessThan(400);
  expect(invoiceId).toBeTruthy();

  const sendInvoiceRes = await request.post(api(`/invoices/${invoiceId}/send`));
  const sendInvoicePayload = await readJson(sendInvoiceRes);
  const publicUrl = sendInvoicePayload.json?.public_url || '';
  const publicToken = tokenFromPublicInvoiceUrl(publicUrl);

  console.log(`WORKER_INVOICE_SEND_STATUS=${sendInvoiceRes.status()}`);
  console.log(`WORKER_INVOICE_SEND_STATE=${sendInvoicePayload.json?.status || ''}`);
  console.log(`WORKER_INVOICE_EMAIL_ATTEMPTED=${sendInvoicePayload.json?.email_attempted}`);
  console.log(`WORKER_INVOICE_EMAIL_SENT=${sendInvoicePayload.json?.email_sent}`);
  console.log(`WORKER_INVOICE_EMAIL_PROVIDER=${sendInvoicePayload.json?.email_provider || ''}`);
  console.log(`WORKER_INVOICE_EMAIL_ID=${sendInvoicePayload.json?.email_id || ''}`);
  console.log(`WORKER_INVOICE_EMAIL_ERROR=${sendInvoicePayload.json?.email_error || ''}`);
  console.log(`WORKER_INVOICE_PUBLIC_URL=${publicUrl}`);
  console.log(`WORKER_INVOICE_PUBLIC_TOKEN=${publicToken}`);

  expect(sendInvoiceRes.status()).toBeLessThan(400);
  expect(String(sendInvoicePayload.json?.status || '').toLowerCase()).toBe('sent');
  expect(sendInvoicePayload.json?.email_attempted).toBeTruthy();
  expect(sendInvoicePayload.json?.email_sent).toBeTruthy();
  expect(sendInvoicePayload.json?.email_provider).toBe('postmark');
  expect(publicToken).toBeTruthy();

  const publicInvoiceRes = await request.get(api(`/public/invoice/${publicToken}`));
  const publicInvoicePayload = await readJson(publicInvoiceRes);

  console.log(`WORKER_INVOICE_PUBLIC_GET_STATUS=${publicInvoiceRes.status()}`);
  console.log(`WORKER_INVOICE_PUBLIC_CUSTOMER=${publicInvoicePayload.json?.invoice?.customer_name || ''}`);
  console.log(`WORKER_INVOICE_PUBLIC_STATUS=${publicInvoicePayload.json?.invoice?.status || ''}`);
  console.log(`WORKER_INVOICE_PUBLIC_TOTAL=${publicInvoicePayload.json?.invoice?.total ?? ''}`);

  expect(publicInvoiceRes.status()).toBeLessThan(400);
  expect(publicInvoicePayload.json?.invoice?.customer_name).toContain('Worker Invoice Client');
  expect(String(publicInvoicePayload.json?.invoice?.status || '').toLowerCase()).toMatch(/sent|viewed|paid/);

  console.log('WORKER_JOB_TO_PUBLIC_INVOICE_PROOF=passed');
});
