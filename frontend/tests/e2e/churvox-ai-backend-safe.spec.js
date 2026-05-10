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
  return token ? { Authorization: `Bearer ${token}` } : {};
}

test('safe AI backend endpoints work without approving actions', async ({ page }) => {
  await login(page);

  const headers = await authHeaders(page);
  expect(headers.Authorization, 'Login token should exist').toBeTruthy();

  const status = await page.request.get(`${API_URL}/ai/operator/v3/strong/status`, { headers });
  console.log('AI status code:', status.status());
  expect(status.status()).toBeLessThan(500);

  const statusJson = await status.json().catch(() => ({}));
  console.log('AI status:', JSON.stringify(statusJson, null, 2));

  expect(String(statusJson.primary_model || '')).toMatch(/gpt/i);

  const queue = await page.request.get(`${API_URL}/ai/operator/v3/strong/queue`, { headers });
  console.log('AI queue code:', queue.status());
  expect(queue.status()).toBeLessThan(500);

  const queueJson = await queue.json().catch(() => ({}));
  console.log('AI queue count:', Array.isArray(queueJson.actions) ? queueJson.actions.length : 'unknown');

  const ask = await page.request.post(`${API_URL}/ai/operator/v3/strong/ask`, {
    headers: { ...headers, 'Content-Type': 'application/json' },
    data: {
      question: 'What are the top owner decisions waiting in Churvox today? Keep it short.',
    },
  });

  console.log('AI ask code:', ask.status());
  expect(ask.status()).toBeLessThan(500);

  const askJson = await ask.json().catch(() => ({}));
  console.log('AI ask answer:', askJson.answer || askJson.message || askJson.detail || askJson);

  expect(JSON.stringify(askJson)).toMatch(/answer|decision|owner|AI|Churvox|not configured|model/i);

  const prepare = await page.request.post(`${API_URL}/ai/operator/v3/strong/prepare-today`, {
    headers: { ...headers, 'Content-Type': 'application/json' },
    data: {},
  });

  console.log('AI prepare code:', prepare.status());
  expect(prepare.status()).toBeLessThan(500);

  const prepareJson = await prepare.json().catch(() => ({}));
  console.log('AI prepare result:', JSON.stringify({
    message: prepareJson.message,
    actionCount: Array.isArray(prepareJson.actions) ? prepareJson.actions.length : 'unknown',
  }, null, 2));

  await page.goto(`${BASE_URL}/v3/decisions`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toContainText(/Owner Decisions|Prepared|Approve|AI/i, { timeout: 20000 });

  await page.screenshot({ path: 'frontend/test-results/ai-backend-safe-decisions.png', fullPage: true });
});
