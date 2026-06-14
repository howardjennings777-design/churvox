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

function tokenFromUrl(url, type) {
  const match = String(url || '').match(new RegExp(`/public/${type}/([^/?#]+)`));
  return match ? match[1] : '';
}

async function expectPageLoads(page, url, label, expectedTextRegex) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).not.toContainText(/application error|cannot get|not found/i, { timeout: 15000 });

  const body = await page.locator('body').innerText({ timeout: 15000 });
  console.log(`${label}_URL=${page.url()}`);
  console.log(`${label}_BODY_HAS_TEXT=${body.trim().length > 20}`);
  console.log(`${label}_BODY_HEAD=${body.slice(0, 160).replace(/\s+/g, ' ')}`);

  expect(body.trim().length).toBeGreaterThan(20);
  if (expectedTextRegex) expect(body).toMatch(expectedTextRegex);
}

test('final launch smoke: public pages, auth APIs, dashboard, public quote and invoice load', async ({ request, page }) => {
  test.setTimeout(240000);

  if (!OWNER_EMAIL || !OWNER_PASS) {
    throw new Error('Set CHURVOX_E2E_EMAIL and CHURVOX_E2E_PASSWORD');
  }

  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const customerEmail = plusEmail(OWNER_EMAIL, `smokecustomer${stamp}`);

  console.log(`FINAL_SMOKE_API_BASE=${API_BASE}`);
  console.log(`FINAL_SMOKE_APP_BASE=${APP_BASE}`);
  console.log(`FINAL_SMOKE_OWNER_EMAIL=${OWNER_EMAIL}`);
  console.log(`FINAL_SMOKE_CUSTOMER_EMAIL=${customerEmail}`);

  await expectPageLoads(page, `${APP_BASE}/`, 'FINAL_SMOKE_HOME', /Churvox|job|invoice|admin/i);
  await expectPageLoads(page, `${APP_BASE}/login`, 'FINAL_SMOKE_LOGIN', /login|sign in|email/i);
  await expectPageLoads(page, `${APP_BASE}/privacy`, 'FINAL_SMOKE_PRIVACY', /privacy|data/i);
  await expectPageLoads(page, `${APP_BASE}/terms`, 'FINAL_SMOKE_TERMS', /terms|service/i);

  const loginRes = await request.post(api('/auth/login'), {
    data: {
      email: OWNER_EMAIL,
      password: OWNER_PASS,
    },
  });
  const loginPayload = await readJson(loginRes);

  console.log(`FINAL_SMOKE_LOGIN_STATUS=${loginRes.status()}`);
  console.log(`FINAL_SMOKE_LOGIN_EMAIL=${loginPayload.json?.email || loginPayload.json?.user?.email || ''}`);
  console.log(`FINAL_SMOKE_LOGIN_PLAN=${loginPayload.json?.plan || loginPayload.json?.user?.plan || ''}`);

  expect(loginRes.status()).toBeLessThan(400);

  const meRes = await request.get(api('/auth/me'));
  const mePayload = await readJson(meRes);

  console.log(`FINAL_SMOKE_ME_STATUS=${meRes.status()}`);
  console.log(`FINAL_SMOKE_ME_EMAIL=${mePayload.json?.email || ''}`);
  console.log(`FINAL_SMOKE_ME_ROLE=${mePayload.json?.role || ''}`);

  expect(meRes.status()).toBeLessThan(400);
  expect(mePayload.json?.email).toBe(OWNER_EMAIL);

  const statusRes = await request.get(api('/billing/subscription-status'));
  const statusPayload = await readJson(statusRes);

  console.log(`FINAL_SMOKE_PLAN_STATUS=${statusRes.status()}`);
  console.log(`FINAL_SMOKE_PLAN_VALUE=${statusPayload.json?.plan || ''}`);

  expect(statusRes.status()).toBeLessThan(400);

  const statsRes = await request.get(api('/dashboard/stats'));
  const statsPayload = await readJson(statsRes);

  console.log(`FINAL_SMOKE_DASHBOARD_STATUS=${statsRes.status()}`);
  console.log(`FINAL_SMOKE_DASHBOARD_STATS=${JSON.stringify(statsPayload.json).slice(0, 500)}`);

  expect(statsRes.status()).toBeLessThan(400);
  expect(statsPayload.json).toBeTruthy();

  const coreChecks = [
    ['/clients', 'FINAL_SMOKE_CLIENTS_API'],
    ['/jobs', 'FINAL_SMOKE_JOBS_API'],
    ['/quotes', 'FINAL_SMOKE_QUOTES_API'],
    ['/invoices', 'FINAL_SMOKE_INVOICES_API'],
    ['/team/workers', 'FINAL_SMOKE_TEAM_API'],
  ];

  for (const [path, label] of coreChecks) {
    const res = await request.get(api(path));
    const payload = await readJson(res);
    console.log(`${label}_STATUS=${res.status()}`);
    console.log(`${label}_IS_ARRAY=${Array.isArray(payload.json)}`);
    expect(res.status()).toBeLessThan(400);
  }

  const clientRes = await request.post(api('/clients'), {
    data: {
      name: `Final Smoke Client ${stamp}`,
      email: customerEmail,
      phone: '+64210000011',
      address: `7 Final Smoke Street ${stamp}`,
      notes: 'Final launch smoke client',
    },
  });
  const clientPayload = await readJson(clientRes);
  const clientId = clientPayload.json?.id || clientPayload.json?._id;

  console.log(`FINAL_SMOKE_CREATE_CLIENT_STATUS=${clientRes.status()}`);
  console.log(`FINAL_SMOKE_CLIENT_ID=${clientId || ''}`);

  expect(clientRes.status()).toBeLessThan(400);
  expect(clientId).toBeTruthy();

  const quoteRes = await request.post(api('/quotes'), {
    data: {
      customer_name: `Final Smoke Client ${stamp}`,
      customer_email: customerEmail,
      client_id: clientId,
      address: `7 Final Smoke Street ${stamp}`,
      job_description: `Final smoke quote ${stamp}`,
      job_type: 'lawn_mowing',
      price: 150,
      pricing_type: 'fixed',
      notes: 'Final launch smoke quote',
    },
  });
  const quotePayload = await readJson(quoteRes);
  const quoteId = quotePayload.json?.id || quotePayload.json?._id;

  console.log(`FINAL_SMOKE_CREATE_QUOTE_STATUS=${quoteRes.status()}`);
  console.log(`FINAL_SMOKE_QUOTE_ID=${quoteId || ''}`);

  expect(quoteRes.status()).toBeLessThan(400);
  expect(quoteId).toBeTruthy();

  const quoteSendRes = await request.post(api(`/quotes/${quoteId}/send`));
  const quoteSendPayload = await readJson(quoteSendRes);
  const quoteUrl = quoteSendPayload.json?.public_url || '';
  const quoteToken = tokenFromUrl(quoteUrl, 'quote');

  console.log(`FINAL_SMOKE_SEND_QUOTE_STATUS=${quoteSendRes.status()}`);
  console.log(`FINAL_SMOKE_QUOTE_EMAIL_SENT=${quoteSendPayload.json?.email_sent}`);
  console.log(`FINAL_SMOKE_QUOTE_URL=${quoteUrl}`);
  console.log(`FINAL_SMOKE_QUOTE_TOKEN=${quoteToken}`);

  expect(quoteSendRes.status()).toBeLessThan(400);
  expect(quoteToken).toBeTruthy();

  await page.goto(quoteUrl, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toContainText(`Final Smoke Client ${stamp}`, { timeout: 30000 });

  const publicQuoteText = await page.locator('body').innerText();

  console.log(`FINAL_SMOKE_PUBLIC_QUOTE_LOADS=${publicQuoteText.includes(`Final Smoke Client ${stamp}`)}`);

  expect(publicQuoteText).toMatch(/quote/i);

  const invoiceRes = await request.post(api('/invoices'), {
    data: {
      customer_name: `Final Smoke Client ${stamp}`,
      customer_email: customerEmail,
      client_id: clientId,
      description: `Final smoke invoice ${stamp}`,
      subtotal: 100,
      gst_rate: 15,
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
  });
  const invoicePayload = await readJson(invoiceRes);
  const invoiceId = invoicePayload.json?.id || invoicePayload.json?._id;

  console.log(`FINAL_SMOKE_CREATE_INVOICE_STATUS=${invoiceRes.status()}`);
  console.log(`FINAL_SMOKE_INVOICE_ID=${invoiceId || ''}`);
  console.log(`FINAL_SMOKE_INVOICE_TOTAL=${invoicePayload.json?.total ?? ''}`);

  expect(invoiceRes.status()).toBeLessThan(400);
  expect(invoiceId).toBeTruthy();

  const invoiceSendRes = await request.post(api(`/invoices/${invoiceId}/send`));
  const invoiceSendPayload = await readJson(invoiceSendRes);
  const invoiceUrl = invoiceSendPayload.json?.public_url || '';
  const invoiceToken = tokenFromUrl(invoiceUrl, 'invoice');

  console.log(`FINAL_SMOKE_SEND_INVOICE_STATUS=${invoiceSendRes.status()}`);
  console.log(`FINAL_SMOKE_INVOICE_EMAIL_SENT=${invoiceSendPayload.json?.email_sent}`);
  console.log(`FINAL_SMOKE_INVOICE_PROVIDER=${invoiceSendPayload.json?.email_provider || ''}`);
  console.log(`FINAL_SMOKE_INVOICE_URL=${invoiceUrl}`);
  console.log(`FINAL_SMOKE_INVOICE_TOKEN=${invoiceToken}`);

  expect(invoiceSendRes.status()).toBeLessThan(400);
  expect(invoiceToken).toBeTruthy();

  await page.goto(invoiceUrl, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toContainText(`Final Smoke Client ${stamp}`, { timeout: 30000 });

  const publicInvoiceText = await page.locator('body').innerText();

  console.log(`FINAL_SMOKE_PUBLIC_INVOICE_LOADS=${publicInvoiceText.includes(`Final Smoke Client ${stamp}`)}`);

  expect(publicInvoiceText).toMatch(/invoice/i);

  await page.setViewportSize({ width: 390, height: 844 });
  await expectPageLoads(page, `${APP_BASE}/login`, 'FINAL_SMOKE_MOBILE_LOGIN', /login|sign in|email/i);

  console.log('FINAL_LAUNCH_SMOKE_PROOF=passed');
});
