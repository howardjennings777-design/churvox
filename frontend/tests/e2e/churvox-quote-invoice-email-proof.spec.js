const { test, expect } = require('@playwright/test');

const API_BASE = (process.env.CHURVOX_API_BASE || 'https://grassley-backend.onrender.com').replace(/\/$/, '');
const CUSTOMER_EMAIL = process.env.CHURVOX_PROOF_CUSTOMER_EMAIL || process.env.CHURVOX_E2E_EMAIL;
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

function pickId(payload, key) {
  return payload?.id || payload?._id || payload?.[key]?.id || payload?.[key]?._id || payload?.data?.id || payload?.data?._id || '';
}

test('quote and invoice send trigger customer emails', async ({ request }) => {
  test.setTimeout(120000);

  if (!OWNER_EMAIL || !OWNER_PASS) throw new Error('Set CHURVOX_E2E_EMAIL and CHURVOX_E2E_PASSWORD');
  if (!CUSTOMER_EMAIL) throw new Error('Set CHURVOX_PROOF_CUSTOMER_EMAIL or CHURVOX_E2E_EMAIL');

  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const customerName = `Email Send Proof Client ${stamp}`;

  console.log(`QUOTE_INVOICE_EMAIL_API_BASE=${API_BASE}`);
  console.log(`QUOTE_INVOICE_EMAIL_TO=${CUSTOMER_EMAIL}`);

  const loginRes = await request.post(api('/auth/login'), {
    data: { email: OWNER_EMAIL, password: OWNER_PASS },
  });
  const loginPayload = await readJson(loginRes);

  console.log(`QUOTE_INVOICE_EMAIL_LOGIN_STATUS=${loginRes.status()}`);
  console.log(`QUOTE_INVOICE_EMAIL_LOGIN_EMAIL=${loginPayload.json?.user?.email || loginPayload.json?.email || ''}`);

  expect(loginRes.status()).toBeLessThan(400);

  const quoteRes = await request.post(api('/quotes'), {
    data: {
      customer_name: customerName,
      customer_email: CUSTOMER_EMAIL,
      address: '1 Email Proof Street',
      job_description: `Quote email proof work ${stamp}`,
      job_type: 'other',
      price: 99,
      pricing_type: 'fixed',
      notes: 'Quote email trigger proof',
    },
  });
  const quotePayload = await readJson(quoteRes);
  const quoteId = pickId(quotePayload.json, 'quote');

  console.log(`QUOTE_EMAIL_CREATE_STATUS=${quoteRes.status()}`);
  console.log(`QUOTE_EMAIL_ID=${quoteId}`);

  expect(quoteRes.status()).toBeLessThan(400);
  expect(quoteId).toBeTruthy();

  const quoteSendRes = await request.post(api(`/quotes/${quoteId}/send`));
  const quoteSendPayload = await readJson(quoteSendRes);

  console.log(`QUOTE_EMAIL_SEND_STATUS=${quoteSendRes.status()}`);
  console.log(`QUOTE_EMAIL_SEND_STATE=${quoteSendPayload.json?.status || ''}`);
  console.log(`QUOTE_EMAIL_ATTEMPTED=${quoteSendPayload.json?.email_attempted}`);
  console.log(`QUOTE_EMAIL_SENT=${quoteSendPayload.json?.email_sent}`);
  console.log(`QUOTE_EMAIL_PROVIDER=${quoteSendPayload.json?.email_provider || ''}`);
  console.log(`QUOTE_EMAIL_ID_VALUE=${quoteSendPayload.json?.email_id || ''}`);
  console.log(`QUOTE_EMAIL_ERROR=${quoteSendPayload.json?.email_error || ''}`);
  console.log(`QUOTE_PUBLIC_URL=${quoteSendPayload.json?.public_url || ''}`);

  expect(quoteSendRes.status()).toBeLessThan(400);
  expect(String(quoteSendPayload.json?.status || '').toLowerCase()).toBe('sent');
  expect(quoteSendPayload.json?.public_url || '').toContain('/public/quote/');
  expect(quoteSendPayload.json?.email_attempted).toBeTruthy();
  expect(quoteSendPayload.json?.email_sent).toBeTruthy();

  const invoiceRes = await request.post(api('/invoices'), {
    data: {
      customer_name: customerName,
      customer_email: CUSTOMER_EMAIL,
      address: '1 Email Proof Street',
      description: `Invoice email proof work ${stamp}`,
      subtotal: 115,
      notes: 'Invoice email trigger proof',
    },
  });
  const invoicePayload = await readJson(invoiceRes);
  const invoiceId = pickId(invoicePayload.json, 'invoice');

  console.log(`INVOICE_EMAIL_CREATE_STATUS=${invoiceRes.status()}`);
  console.log(`INVOICE_EMAIL_ID=${invoiceId}`);

  expect(invoiceRes.status()).toBeLessThan(400);
  expect(invoiceId).toBeTruthy();

  const invoiceSendRes = await request.post(api(`/invoices/${invoiceId}/send`));
  const invoiceSendPayload = await readJson(invoiceSendRes);

  console.log(`INVOICE_EMAIL_SEND_STATUS=${invoiceSendRes.status()}`);
  console.log(`INVOICE_EMAIL_SEND_STATE=${invoiceSendPayload.json?.status || ''}`);
  console.log(`INVOICE_EMAIL_ATTEMPTED=${invoiceSendPayload.json?.email_attempted}`);
  console.log(`INVOICE_EMAIL_SENT=${invoiceSendPayload.json?.email_sent}`);
  console.log(`INVOICE_EMAIL_PROVIDER=${invoiceSendPayload.json?.email_provider || ''}`);
  console.log(`INVOICE_EMAIL_ID_VALUE=${invoiceSendPayload.json?.email_id || ''}`);
  console.log(`INVOICE_EMAIL_ERROR=${invoiceSendPayload.json?.email_error || ''}`);
  console.log(`INVOICE_PUBLIC_URL=${invoiceSendPayload.json?.public_url || ''}`);

  expect(invoiceSendRes.status()).toBeLessThan(400);
  expect(String(invoiceSendPayload.json?.status || '').toLowerCase()).toBe('sent');
  expect(invoiceSendPayload.json?.public_url || '').toContain('/public/invoice/');
  expect(invoiceSendPayload.json?.email_attempted).toBeTruthy();
  expect(invoiceSendPayload.json?.email_sent).toBeTruthy();

  console.log('QUOTE_INVOICE_EMAIL_PROOF=passed');
});
