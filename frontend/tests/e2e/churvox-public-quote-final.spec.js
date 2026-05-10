const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.CHURVOX_BASE_URL || 'https://www.churvox.com';
const API_URL = process.env.CHURVOX_API_URL || 'https://grassley-backend.onrender.com/api';
const EMAIL = process.env.CHURVOX_TEST_EMAIL || '';
const PASSWORD = process.env.CHURVOX_TEST_PASSWORD || '';
const stamp = Date.now();

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

test('public quote token/link is exposed and public quote opens', async ({ page }) => {
  await login(page);
  const headers = await authHeaders(page);

  const customerName = `PW Public Quote ${stamp}`;

  const create = await page.request.post(`${API_URL}/quotes`, {
    headers: { ...headers, 'Content-Type': 'application/json' },
    data: {
      customer_name: customerName,
      customer_email: `pw-public-quote-${stamp}@example.com`,
      address: '4 Public Quote Street, Wellington',
      job_description: 'Public quote link Playwright test',
      price: 444,
      status: 'draft',
      job_type: 'other',
      pricing_type: 'fixed',
    },
  });

  console.log('Create quote status:', create.status());
  expect(create.status()).toBeLessThan(500);

  const list = await page.request.get(`${API_URL}/quotes`, { headers });
  console.log('List quotes status:', list.status());
  expect(list.status()).toBe(200);

  const listJson = await list.json().catch(() => ({}));
  const quotes = pickArray(listJson, ['quotes']);
  const quote = quotes.find((q) => q.customer_name === customerName) || quotes[0];

  expect(quote, 'Quote should exist after creation').toBeTruthy();

  const publicUrl =
    quote.public_url ||
    quote.public_quote_url ||
    (quote.public_token ? `${BASE_URL}/public/quote/${quote.public_token}` : null) ||
    (quote.token ? `${BASE_URL}/public/quote/${quote.token}` : null) ||
    (quote.quote_token ? `${BASE_URL}/public/quote/${quote.quote_token}` : null);

  console.log('Public quote URL:', publicUrl);
  expect(publicUrl, 'Quote API should expose public URL or token').toBeTruthy();

  const publicPage = await page.request.get(publicUrl);
  console.log('Public quote status:', publicPage.status());
  expect(publicPage.status()).toBeLessThan(500);

  await page.goto(publicUrl, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toContainText(/Quote|Accept quote|Decline quote|Customer/i, { timeout: 20000 });
  await page.screenshot({ path: 'frontend/test-results/public-quote-final.png', fullPage: true });
});
