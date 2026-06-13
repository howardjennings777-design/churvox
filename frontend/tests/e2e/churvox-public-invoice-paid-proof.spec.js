const { test, expect } = require('@playwright/test');

const API_BASE = (process.env.CHURVOX_API_BASE || 'https://grassley-backend.onrender.com').replace(/\/$/, '');
const APP_BASE = (process.env.CHURVOX_APP_BASE || 'https://www.churvox.com').replace(/\/$/, '');
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

function plusEmail(email, tag) {
  const [name, domain] = String(email || '').split('@');
  if (!name || !domain) throw new Error('CHURVOX_E2E_EMAIL must be a real email');
  return `${name}+${tag}@${domain}`;
}

function tokenFromPublicInvoiceUrl(url) {
  const match = String(url || '').match(/\/public\/invoice\/([^/?#]+)/);
  return match ? match[1] : '';
}

async function postFirstOk(request, label, attempts) {
  const tried = [];

  for (const attempt of attempts) {
    const res = await request.post(api(attempt.path), attempt.options || {});
    const payload = await readJson(res);

    tried.push({
      path: attempt.path,
      status: res.status(),
      body: payload.text.slice(0, 300),
    });

    console.log(`${label}_TRY_PATH=${attempt.path}`);
    console.log(`${label}_TRY_STATUS=${res.status()}`);
    console.log(`${label}_TRY_BODY=${payload.text.slice(0, 300)}`);

    if (res.status() < 400) {
      return { ...attempt, res, payload };
    }
  }

  throw new Error(`${label} no successful endpoint: ${JSON.stringify(tried)}`);
}

test('customer can mark public invoice paid and owner sees paid', async ({ request, page }) => {
  test.setTimeout(180000);

  if (!OWNER_EMAIL || !OWNER_PASS) {
    throw new Error('Set CHURVOX_E2E_EMAIL and CHURVOX_E2E_PASSWORD');
  }

  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const customerEmail = plusEmail(OWNER_EMAIL, `paidcustomer${stamp}`);

  console.log(`PUBLIC_PAID_API_BASE=${API_BASE}`);
  console.log(`PUBLIC_PAID_APP_BASE=${APP_BASE}`);
  console.log(`PUBLIC_PAID_OWNER_EMAIL=${OWNER_EMAIL}`);
  console.log(`PUBLIC_PAID_CUSTOMER_EMAIL=${customerEmail}`);

  const ownerLoginRes = await request.post(api('/auth/login'), {
    data: { email: OWNER_EMAIL, password: OWNER_PASS },
  });
  const ownerLoginPayload = await readJson(ownerLoginRes);

  console.log(`PUBLIC_PAID_OWNER_LOGIN_STATUS=${ownerLoginRes.status()}`);
  console.log(`PUBLIC_PAID_OWNER_PLAN=${ownerLoginPayload.json?.plan || ownerLoginPayload.json?.user?.plan || ''}`);

  expect(ownerLoginRes.status()).toBeLessThan(400);

  const clientRes = await request.post(api('/clients'), {
    data: {
      name: `Public Paid Client ${stamp}`,
      email: customerEmail,
      phone: '+64210000007',
      address: `4 Public Paid Street ${stamp}`,
      notes: 'Public invoice paid proof client',
    },
  });
  const clientPayload = await readJson(clientRes);
  const clientId = clientPayload.json?.id || clientPayload.json?._id;

  console.log(`PUBLIC_PAID_CLIENT_CREATE_STATUS=${clientRes.status()}`);
  console.log(`PUBLIC_PAID_CLIENT_ID=${clientId || ''}`);

  expect(clientRes.status()).toBeLessThan(400);
  expect(clientId).toBeTruthy();

  const invoiceRes = await request.post(api('/invoices'), {
    data: {
      customer_name: `Public Paid Client ${stamp}`,
      customer_email: customerEmail,
      client_id: clientId,
      description: `Public paid invoice proof ${stamp}`,
      subtotal: 100,
      gst_rate: 15,
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
  });
  const invoicePayload = await readJson(invoiceRes);
  const invoiceId = invoicePayload.json?.id || invoicePayload.json?._id;

  console.log(`PUBLIC_PAID_INVOICE_CREATE_STATUS=${invoiceRes.status()}`);
  console.log(`PUBLIC_PAID_INVOICE_ID=${invoiceId || ''}`);
  console.log(`PUBLIC_PAID_INVOICE_NUMBER=${invoicePayload.json?.invoice_number || ''}`);
  console.log(`PUBLIC_PAID_INVOICE_TOTAL=${invoicePayload.json?.total ?? ''}`);

  expect(invoiceRes.status()).toBeLessThan(400);
  expect(invoiceId).toBeTruthy();

  const sendRes = await request.post(api(`/invoices/${invoiceId}/send`));
  const sendPayload = await readJson(sendRes);
  const publicUrl = sendPayload.json?.public_url || '';
  const publicToken = tokenFromPublicInvoiceUrl(publicUrl);

  console.log(`PUBLIC_PAID_SEND_STATUS=${sendRes.status()}`);
  console.log(`PUBLIC_PAID_SEND_STATE=${sendPayload.json?.status || ''}`);
  console.log(`PUBLIC_PAID_EMAIL_SENT=${sendPayload.json?.email_sent}`);
  console.log(`PUBLIC_PAID_EMAIL_PROVIDER=${sendPayload.json?.email_provider || ''}`);
  console.log(`PUBLIC_PAID_EMAIL_ID=${sendPayload.json?.email_id || ''}`);
  console.log(`PUBLIC_PAID_PUBLIC_URL=${publicUrl}`);
  console.log(`PUBLIC_PAID_PUBLIC_TOKEN=${publicToken}`);

  expect(sendRes.status()).toBeLessThan(400);
  expect(String(sendPayload.json?.status || '').toLowerCase()).toBe('sent');
  expect(publicToken).toBeTruthy();

  const publicGetRes = await request.get(api(`/public/invoice/${publicToken}`));
  const publicGetPayload = await readJson(publicGetRes);

  console.log(`PUBLIC_PAID_PUBLIC_GET_STATUS=${publicGetRes.status()}`);
  console.log(`PUBLIC_PAID_PUBLIC_CUSTOMER=${publicGetPayload.json?.invoice?.customer_name || ''}`);
  console.log(`PUBLIC_PAID_PUBLIC_STATUS_BEFORE=${publicGetPayload.json?.invoice?.status || ''}`);

  expect(publicGetRes.status()).toBeLessThan(400);
  expect(String(publicGetPayload.json?.invoice?.status || '').toLowerCase()).toMatch(/sent|viewed/);

  await page.goto(publicUrl, { waitUntil: 'domcontentloaded' });

  await expect(page.locator('body')).toContainText(`Public Paid Client ${stamp}`, { timeout: 30000 });
  await expect(page.locator('body')).toContainText(/invoice/i, { timeout: 30000 });

  const pageText = await page.locator('body').innerText();

  console.log(`PUBLIC_PAID_PAGE_URL=${page.url()}`);
  console.log(`PUBLIC_PAID_PAGE_HAS_CUSTOMER=${pageText.includes(`Public Paid Client ${stamp}`)}`);
  console.log(`PUBLIC_PAID_PAGE_HAS_INVOICE=${/invoice/i.test(pageText)}`);

  const paidResult = await postFirstOk(request, 'PUBLIC_PAID_MARK_PAID', [
    { path: `/public/invoice/${publicToken}/mark-paid` },
    { path: `/public/invoice/${publicToken}/paid` },
    { path: `/public/invoice/${publicToken}/pay` },
    { path: `/public/invoices/${publicToken}/mark-paid` },
    { path: `/invoices/public/${publicToken}/mark-paid` },
    {
      path: `/public/invoice/${publicToken}/mark-paid`,
      options: { data: { payment_method: 'manual', note: 'Public paid proof' } },
    },
    {
      path: `/public/invoice/${publicToken}/paid`,
      options: { data: { payment_method: 'manual', note: 'Public paid proof' } },
    },
  ]);

  console.log(`PUBLIC_PAID_MARK_PAID_PATH=${paidResult.path}`);
  console.log(`PUBLIC_PAID_MARK_PAID_STATUS=${paidResult.res.status()}`);
  console.log(`PUBLIC_PAID_MARK_PAID_BODY=${paidResult.payload.text.slice(0, 500)}`);

  const publicAfterRes = await request.get(api(`/public/invoice/${publicToken}`));
  const publicAfterPayload = await readJson(publicAfterRes);

  console.log(`PUBLIC_PAID_PUBLIC_AFTER_STATUS=${publicAfterRes.status()}`);
  console.log(`PUBLIC_PAID_PUBLIC_STATUS_AFTER=${publicAfterPayload.json?.invoice?.status || ''}`);

  expect(publicAfterRes.status()).toBeLessThan(400);
  expect(String(publicAfterPayload.json?.invoice?.status || '').toLowerCase()).toBe('paid');

  const ownerInvoiceRes = await request.get(api(`/invoices/${invoiceId}`));
  const ownerInvoicePayload = await readJson(ownerInvoiceRes);

  console.log(`PUBLIC_PAID_OWNER_INVOICE_GET_STATUS=${ownerInvoiceRes.status()}`);
  console.log(`PUBLIC_PAID_OWNER_INVOICE_STATUS=${ownerInvoicePayload.json?.status || ''}`);
  console.log(`PUBLIC_PAID_OWNER_INVOICE_PAID_AT=${ownerInvoicePayload.json?.paid_at || ''}`);

  expect(ownerInvoiceRes.status()).toBeLessThan(400);
  expect(String(ownerInvoicePayload.json?.status || '').toLowerCase()).toBe('paid');

  console.log('PUBLIC_INVOICE_PAID_PROOF=passed');
});
