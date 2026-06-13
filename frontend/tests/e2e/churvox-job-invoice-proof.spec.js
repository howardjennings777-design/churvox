const { test, expect } = require('@playwright/test');

const API_BASE = (process.env.CHURVOX_API_BASE || process.env.REACT_APP_BACKEND_URL || process.env.VITE_BACKEND_URL || 'https://grassley-backend.onrender.com').replace(/\/$/, '');
const OWNER_EMAIL = process.env.CHURVOX_E2E_EMAIL;
const OWNER_PASS = process.env.CHURVOX_E2E_PASSWORD;

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

function normalizeId(value) {
  if (!value) return '';
  if (typeof value === 'object') return String(value.$oid || value.id || value._id || '');
  return String(value);
}

function createdId(payload) {
  const data = payload?.data || payload || {};
  const item = data.job || data.invoice || data.item || data.record || data;
  return normalizeId(data.id || data._id || item.id || item._id || item.job_id || item.invoice_id || payload.id || payload._id);
}

function listFrom(payload) {
  const data = payload?.data || payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.invoices)) return data.invoices;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function statusOf(item) {
  return String(item?.status || item?.invoice_status || '').toLowerCase();
}

async function backendLogin(request, email, password, label) {
  const res = await request.post(api('/auth/login'), { data: { email, password } });
  const payload = await readJson(res);
  console.log(`${label}_LOGIN_STATUS=${res.status()}`);
  console.log(`${label}_LOGIN_EMAIL=${payload.json?.user?.email || payload.json?.email || ''}`);
  expect(res.status()).toBeLessThan(400);
  return payload.json;
}

test('job to invoice sent paid proof', async ({ request }) => {
  test.setTimeout(120000);

  if (!OWNER_EMAIL || !OWNER_PASS) {
    throw new Error('Set CHURVOX_E2E_EMAIL and CHURVOX_E2E_PASSWORD');
  }

  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const jobTitle = `Invoice Proof Job ${stamp}`;
  const customerName = `Invoice Proof Client ${stamp}`;
  const customerEmail = `invoice.proof.${stamp}@example.com`;
  const subtotal = 123.45;

  console.log(`JOB_INVOICE_API_BASE=${API_BASE}`);
  console.log(`JOB_INVOICE_JOB_TITLE=${jobTitle}`);
  console.log(`JOB_INVOICE_CUSTOMER=${customerName}`);

  await backendLogin(request, OWNER_EMAIL, OWNER_PASS, 'OWNER');

  const scheduled = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const jobRes = await request.post(api('/jobs'), {
    data: {
      title: jobTitle,
      job_type: 'other',
      customer_name: customerName,
      customer_email: customerEmail,
      address: '1 Invoice Proof Street, Wellington',
      scheduled_date: scheduled,
      estimated_duration: 60,
      price: subtotal,
      pricing_type: 'fixed',
      notes: 'Job to invoice proof job. Safe to ignore.',
      status: 'assigned',
    },
  });
  const jobPayload = await readJson(jobRes);
  const jobId = createdId(jobPayload.json);

  console.log(`JOB_INVOICE_CREATE_JOB_STATUS=${jobRes.status()}`);
  console.log(`JOB_INVOICE_JOB_ID=${jobId}`);

  expect(jobRes.status()).toBeLessThan(400);
  expect(jobId).toBeTruthy();

  const completeRes = await request.post(api(`/jobs/${jobId}/complete`), {
    data: { worker_notes: 'Invoice proof completed.' },
  });
  const completePayload = await readJson(completeRes);

  console.log(`JOB_INVOICE_COMPLETE_JOB_STATUS=${completeRes.status()}`);
  console.log(`JOB_INVOICE_COMPLETE_JOB_BODY=${completePayload.text.slice(0, 240)}`);

  expect(completeRes.status()).toBeLessThan(400);

  const invoiceRes = await request.post(api('/invoices'), {
    data: {
      job_id: jobId,
      customer_name: customerName,
      customer_email: customerEmail,
      address: '1 Invoice Proof Street, Wellington',
      description: `Invoice for ${jobTitle}`,
      subtotal,
      gst_rate: 15,
      notes: 'Job to invoice proof invoice. Safe to ignore.',
    },
  });
  const invoicePayload = await readJson(invoiceRes);
  const invoiceId = createdId(invoicePayload.json);

  console.log(`JOB_INVOICE_CREATE_INVOICE_STATUS=${invoiceRes.status()}`);
  console.log(`JOB_INVOICE_INVOICE_ID=${invoiceId}`);
  console.log(`JOB_INVOICE_CREATE_INVOICE_NUMBER=${invoicePayload.json?.invoice_number || ''}`);
  console.log(`JOB_INVOICE_CREATE_INVOICE_STATE=${statusOf(invoicePayload.json)}`);
  console.log(`JOB_INVOICE_CREATE_TOTAL=${Number(invoicePayload.json?.total || 0)}`);

  expect(invoiceRes.status()).toBeLessThan(400);
  expect(invoiceId).toBeTruthy();
  expect(statusOf(invoicePayload.json)).toBe('draft');
  expect(Number(invoicePayload.json?.total || 0)).toBeGreaterThan(subtotal);

  const getRes = await request.get(api(`/invoices/${invoiceId}`));
  const getPayload = await readJson(getRes);

  console.log(`JOB_INVOICE_GET_INVOICE_STATUS=${getRes.status()}`);
  console.log(`JOB_INVOICE_GET_INVOICE_STATE=${statusOf(getPayload.json)}`);

  expect(getRes.status()).toBeLessThan(400);
  expect(statusOf(getPayload.json)).toBe('draft');
  expect(normalizeId(getPayload.json?.job_id)).toBe(jobId);

  const listRes = await request.get(api('/invoices'));
  const listPayload = await readJson(listRes);
  const invoices = listFrom(listPayload.json);
  const listed = invoices.find((invoice) => normalizeId(invoice.id || invoice._id) === invoiceId);

  console.log(`JOB_INVOICE_LIST_STATUS=${listRes.status()}`);
  console.log(`JOB_INVOICE_LIST_FOUND=${Boolean(listed)}`);

  expect(listRes.status()).toBeLessThan(400);
  expect(Boolean(listed)).toBeTruthy();

  const sendRes = await request.post(api(`/invoices/${invoiceId}/send`));
  const sendPayload = await readJson(sendRes);

  console.log(`JOB_INVOICE_SEND_STATUS=${sendRes.status()}`);
  console.log(`JOB_INVOICE_AFTER_SEND_STATE=${statusOf(sendPayload.json)}`);

  expect(sendRes.status()).toBeLessThan(400);
  expect(statusOf(sendPayload.json)).toBe('sent');

  const paidRes = await request.post(api(`/invoices/${invoiceId}/mark-paid`));
  const paidPayload = await readJson(paidRes);

  console.log(`JOB_INVOICE_MARK_PAID_STATUS=${paidRes.status()}`);
  console.log(`JOB_INVOICE_AFTER_PAID_STATE=${statusOf(paidPayload.json)}`);

  expect(paidRes.status()).toBeLessThan(400);
  expect(statusOf(paidPayload.json)).toBe('paid');

  console.log('JOB_INVOICE_PROOF=passed');
});
