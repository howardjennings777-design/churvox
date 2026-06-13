const { test, expect } = require('@playwright/test');

const API_BASE = (process.env.CHURVOX_API_BASE || process.env.REACT_APP_BACKEND_URL || process.env.VITE_BACKEND_URL || 'https://grassley-backend.onrender.com').replace(/\/$/, '');
const PUBLIC_BASE = (process.env.CHURVOX_PUBLIC_BASE || process.env.PLAYWRIGHT_BASE_URL || 'https://www.churvox.com').replace(/\/$/, '');
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

function invoiceId(payload) {
  const data = payload?.data || payload || {};
  return String(data.id || data._id || data.invoice_id || data.invoice?.id || data.invoice?._id || '');
}

async function backendLogin(request, email, password, label) {
  const res = await request.post(api('/auth/login'), { data: { email, password } });
  const payload = await readJson(res);
  console.log(`${label}_LOGIN_STATUS=${res.status()}`);
  console.log(`${label}_LOGIN_EMAIL=${payload.json?.user?.email || payload.json?.email || ''}`);
  expect(res.status()).toBeLessThan(400);
}

test('public invoice link customer page proof', async ({ request, page }) => {
  test.setTimeout(120000);

  if (!OWNER_EMAIL || !OWNER_PASS) {
    throw new Error('Set CHURVOX_E2E_EMAIL and CHURVOX_E2E_PASSWORD');
  }

  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const customer = `Public Invoice Proof Client ${stamp}`;
  const description = `Public Invoice Proof Work ${stamp}`;

  console.log(`PUBLIC_INVOICE_API_BASE=${API_BASE}`);
  console.log(`PUBLIC_INVOICE_PUBLIC_BASE=${PUBLIC_BASE}`);
  console.log(`PUBLIC_INVOICE_CUSTOMER=${customer}`);

  await backendLogin(request, OWNER_EMAIL, OWNER_PASS, 'OWNER');

  const createRes = await request.post(api('/invoices'), {
    data: {
      customer_name: customer,
      customer_email: `public.invoice.${stamp}@example.com`,
      address: '1 Public Invoice Street, Wellington',
      description,
      subtotal: 100,
      gst_rate: 15,
      notes: 'Public invoice proof. Safe to ignore.',
    },
  });

  const createPayload = await readJson(createRes);
  const id = invoiceId(createPayload.json);

  console.log(`PUBLIC_INVOICE_CREATE_STATUS=${createRes.status()}`);
  console.log(`PUBLIC_INVOICE_ID=${id}`);
  console.log(`PUBLIC_INVOICE_CREATED_TOKEN=${createPayload.json?.public_token || ''}`);
  console.log(`PUBLIC_INVOICE_CREATE_TOTAL=${createPayload.json?.total || ''}`);

  expect(createRes.status()).toBeLessThan(400);
  expect(id).toBeTruthy();

  const sendRes = await request.post(api(`/invoices/${id}/send`));
  const sendPayload = await readJson(sendRes);
  const token = sendPayload.json?.public_token || createPayload.json?.public_token;
  const publicUrl = sendPayload.json?.public_url || `${PUBLIC_BASE}/public/invoice/${token}`;

  console.log(`PUBLIC_INVOICE_SEND_STATUS=${sendRes.status()}`);
  console.log(`PUBLIC_INVOICE_SEND_STATUS_VALUE=${sendPayload.json?.status || ''}`);
  console.log(`PUBLIC_INVOICE_TOKEN=${token || ''}`);
  console.log(`PUBLIC_INVOICE_URL=${publicUrl}`);

  expect(sendRes.status()).toBeLessThan(400);
  expect(String(sendPayload.json?.status || '').toLowerCase()).toBe('sent');
  expect(token).toBeTruthy();

  const publicRes = await request.get(api(`/public/invoice/${token}`));
  const publicPayload = await readJson(publicRes);

  console.log(`PUBLIC_INVOICE_API_GET_STATUS=${publicRes.status()}`);
  console.log(`PUBLIC_INVOICE_API_CUSTOMER=${publicPayload.json?.invoice?.customer_name || ''}`);
  console.log(`PUBLIC_INVOICE_API_DESCRIPTION=${publicPayload.json?.invoice?.description || ''}`);

  expect(publicRes.status()).toBeLessThan(400);
  expect(publicPayload.json?.invoice?.customer_name).toBe(customer);
  expect(publicPayload.json?.invoice?.description).toBe(description);

  await page.goto(publicUrl, { waitUntil: 'domcontentloaded' });

  await expect(page.getByText(customer).first()).toBeVisible();
  await expect(page.getByText(description).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /print/i })).toBeVisible();

  console.log(`PUBLIC_INVOICE_PAGE_URL=${page.url()}`);
  console.log('PUBLIC_INVOICE_PAGE_RENDERED=true');

  const paidRes = await request.post(api(`/invoices/${id}/mark-paid`));
  const paidPayload = await readJson(paidRes);

  console.log(`PUBLIC_INVOICE_MARK_PAID_STATUS=${paidRes.status()}`);
  console.log(`PUBLIC_INVOICE_AFTER_PAID_STATE=${paidPayload.json?.status || ''}`);

  expect(paidRes.status()).toBeLessThan(400);
  expect(String(paidPayload.json?.status || '').toLowerCase()).toBe('paid');

  console.log('PUBLIC_INVOICE_PROOF=passed');
});
