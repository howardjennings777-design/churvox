const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.CHURVOX_BASE_URL || 'https://www.churvox.com';
const API_URL = process.env.CHURVOX_API_URL || 'https://grassley-backend.onrender.com/api';
const EMAIL = process.env.CHURVOX_TEST_EMAIL || '';
const PASSWORD = process.env.CHURVOX_TEST_PASSWORD || '';

test.setTimeout(120000);

async function login(page) {
  if (!EMAIL || !PASSWORD) throw new Error('Missing CHURVOX_TEST_EMAIL or CHURVOX_TEST_PASSWORD');

  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"], input[name="email"]').first().fill(EMAIL);
  await page.locator('input[type="password"], input[name="password"]').first().fill(PASSWORD);
  await page.getByRole('button', { name: /log in|login|sign in/i }).first().click();
  await page.waitForTimeout(4000);
}

async function authHeaders(page) {
  const token = await page.evaluate(() => localStorage.getItem('token') || '');
  if (!token) throw new Error('No auth token found after login');
  return { Authorization: `Bearer ${token}` };
}

function pickArray(payload, keys) {
  if (Array.isArray(payload)) return payload;
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
    if (Array.isArray(payload?.data?.[key])) return payload.data[key];
  }
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

test('billing page and public quote/invoice links are reachable', async ({ page }) => {
  await login(page);

  await page.goto(`${BASE_URL}/v3/plans`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toContainText(/Billing|Current plan|SMS credits|Enterprise|Plan/i, { timeout: 20000 });
  await page.screenshot({ path: 'frontend/test-results/billing-page.png', fullPage: true });

  const headers = await authHeaders(page);

  const billing = await page.request.get(`${API_URL}/billing/v3/status`, { headers });
  console.log('Billing status code:', billing.status());
  expect(billing.status()).toBeLessThan(500);

  const billingJson = await billing.json().catch(() => ({}));
  console.log('Billing status:', JSON.stringify(billingJson.billing || billingJson, null, 2));

  const quotesResp = await page.request.get(`${API_URL}/quotes`, { headers });
  console.log('Quotes status code:', quotesResp.status());
  expect(quotesResp.status()).toBeLessThan(500);

  const quotesJson = await quotesResp.json().catch(() => ({}));
  const quotes = pickArray(quotesJson, ['quotes']);
  console.log('Quote count:', quotes.length);

  const invoicesResp = await page.request.get(`${API_URL}/invoices`, { headers });
  console.log('Invoices status code:', invoicesResp.status());
  expect(invoicesResp.status()).toBeLessThan(500);

  const invoicesJson = await invoicesResp.json().catch(() => ({}));
  const invoices = pickArray(invoicesJson, ['invoices']);
  console.log('Invoice count:', invoices.length);

  const quoteWithPublic =
    quotes.find((q) => q.public_url || q.public_quote_url || q.public_token || q.token) || quotes[0];

  const invoiceWithPublic =
    invoices.find((i) => i.public_url || i.public_invoice_url || i.public_token || i.token) || invoices[0];

  if (quoteWithPublic) {
    console.log('Sample quote:', JSON.stringify({
      id: quoteWithPublic.id || quoteWithPublic._id,
      public_url: quoteWithPublic.public_url || quoteWithPublic.public_quote_url,
      public_token: quoteWithPublic.public_token || quoteWithPublic.token,
      customer_name: quoteWithPublic.customer_name,
    }, null, 2));

    const quoteUrl =
      quoteWithPublic.public_url ||
      quoteWithPublic.public_quote_url ||
      (quoteWithPublic.public_token ? `${BASE_URL}/public/quote/${quoteWithPublic.public_token}` : null) ||
      (quoteWithPublic.token ? `${BASE_URL}/public/quote/${quoteWithPublic.token}` : null);

    if (quoteUrl) {
      const qPublic = await page.request.get(quoteUrl);
      console.log('Public quote status:', qPublic.status(), quoteUrl);
      expect(qPublic.status()).toBeLessThan(500);
    } else {
      console.log('No public quote URL/token exposed in quote payload.');
    }
  } else {
    console.log('No quotes available to test public quote link.');
  }

  if (invoiceWithPublic) {
    console.log('Sample invoice:', JSON.stringify({
      id: invoiceWithPublic.id || invoiceWithPublic._id,
      public_url: invoiceWithPublic.public_url || invoiceWithPublic.public_invoice_url,
      public_token: invoiceWithPublic.public_token || invoiceWithPublic.token,
      customer_name: invoiceWithPublic.customer_name,
    }, null, 2));

    const invoiceUrl =
      invoiceWithPublic.public_url ||
      invoiceWithPublic.public_invoice_url ||
      (invoiceWithPublic.public_token ? `${BASE_URL}/public/invoice/${invoiceWithPublic.public_token}` : null) ||
      (invoiceWithPublic.token ? `${BASE_URL}/public/invoice/${invoiceWithPublic.token}` : null);

    if (invoiceUrl) {
      const iPublic = await page.request.get(invoiceUrl);
      console.log('Public invoice status:', iPublic.status(), invoiceUrl);
      expect(iPublic.status()).toBeLessThan(500);
    } else {
      console.log('No public invoice URL/token exposed in invoice payload.');
    }
  } else {
    console.log('No invoices available to test public invoice link.');
  }

  await page.goto(`${BASE_URL}/v3/invoices`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toContainText(/Money Board|Invoices|Create invoice/i, { timeout: 20000 });
  await page.screenshot({ path: 'frontend/test-results/money-board-after-public-link-check.png', fullPage: true });
});
