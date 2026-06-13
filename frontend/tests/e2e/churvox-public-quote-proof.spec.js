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

function quoteId(payload) {
  const data = payload?.data || payload || {};
  return String(data.id || data._id || data.quote_id || data.quote?.id || data.quote?._id || '');
}

async function backendLogin(request, email, password, label) {
  const res = await request.post(api('/auth/login'), { data: { email, password } });
  const payload = await readJson(res);
  console.log(`${label}_LOGIN_STATUS=${res.status()}`);
  console.log(`${label}_LOGIN_EMAIL=${payload.json?.user?.email || payload.json?.email || ''}`);
  expect(res.status()).toBeLessThan(400);
}

test('public quote link customer page proof', async ({ request, page }) => {
  test.setTimeout(120000);

  if (!OWNER_EMAIL || !OWNER_PASS) {
    throw new Error('Set CHURVOX_E2E_EMAIL and CHURVOX_E2E_PASSWORD');
  }

  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const customer = `Public Quote Proof Client ${stamp}`;
  const description = `Public Quote Proof Work ${stamp}`;

  console.log(`PUBLIC_QUOTE_API_BASE=${API_BASE}`);
  console.log(`PUBLIC_QUOTE_PUBLIC_BASE=${PUBLIC_BASE}`);
  console.log(`PUBLIC_QUOTE_CUSTOMER=${customer}`);

  await backendLogin(request, OWNER_EMAIL, OWNER_PASS, 'OWNER');

  const createRes = await request.post(api('/quotes'), {
    data: {
      customer_name: customer,
      customer_email: `public.quote.${stamp}@example.com`,
      address: '1 Public Quote Street, Wellington',
      job_description: description,
      job_type: 'other',
      price: 123.45,
      pricing_type: 'fixed',
      notes: 'Public quote proof. Safe to ignore.',
    },
  });

  const createPayload = await readJson(createRes);
  const id = quoteId(createPayload.json);

  console.log(`PUBLIC_QUOTE_CREATE_STATUS=${createRes.status()}`);
  console.log(`PUBLIC_QUOTE_ID=${id}`);
  console.log(`PUBLIC_QUOTE_CREATED_TOKEN=${createPayload.json?.public_token || ''}`);

  expect(createRes.status()).toBeLessThan(400);
  expect(id).toBeTruthy();

  const sendRes = await request.post(api(`/quotes/${id}/send`));
  const sendPayload = await readJson(sendRes);
  const token = sendPayload.json?.public_token || createPayload.json?.public_token;
  const publicUrl = sendPayload.json?.public_url || `${PUBLIC_BASE}/public/quote/${token}`;

  console.log(`PUBLIC_QUOTE_SEND_STATUS=${sendRes.status()}`);
  console.log(`PUBLIC_QUOTE_SEND_STATUS_VALUE=${sendPayload.json?.status || ''}`);
  console.log(`PUBLIC_QUOTE_TOKEN=${token || ''}`);
  console.log(`PUBLIC_QUOTE_URL=${publicUrl}`);

  expect(sendRes.status()).toBeLessThan(400);
  expect(String(sendPayload.json?.status || '').toLowerCase()).toBe('sent');
  expect(token).toBeTruthy();

  const publicRes = await request.get(api(`/public/quote/${token}`));
  const publicPayload = await readJson(publicRes);

  console.log(`PUBLIC_QUOTE_API_GET_STATUS=${publicRes.status()}`);
  console.log(`PUBLIC_QUOTE_API_CUSTOMER=${publicPayload.json?.quote?.customer_name || ''}`);
  console.log(`PUBLIC_QUOTE_API_DESCRIPTION=${publicPayload.json?.quote?.job_description || ''}`);

  expect(publicRes.status()).toBeLessThan(400);
  expect(publicPayload.json?.quote?.customer_name).toBe(customer);
  expect(publicPayload.json?.quote?.job_description).toBe(description);

  await page.goto(publicUrl, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(customer).first()).toBeVisible();
  await expect(page.getByText(description).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /accept quote/i })).toBeVisible();

  console.log(`PUBLIC_QUOTE_PAGE_URL=${page.url()}`);
  console.log('PUBLIC_QUOTE_PAGE_RENDERED=true');

  const acceptRes = await request.post(api(`/public/quote/${token}/accept`));
  const acceptPayload = await readJson(acceptRes);

  console.log(`PUBLIC_QUOTE_ACCEPT_STATUS=${acceptRes.status()}`);
  console.log(`PUBLIC_QUOTE_ACCEPT_BODY=${acceptPayload.text}`);

  expect(acceptRes.status()).toBeLessThan(400);
  expect(acceptPayload.json?.success).toBeTruthy();
  expect(String(acceptPayload.json?.status || '').toLowerCase()).toBe('accepted');

  console.log('PUBLIC_QUOTE_PROOF=passed');
});
