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

test('team page, worker invite, and route protection work', async ({ page }) => {
  await login(page);

  await page.goto(`${BASE_URL}/v3/team`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toContainText(/Crew|Invite crew|worker|team/i, { timeout: 20000 });
  await page.screenshot({ path: 'frontend/test-results/team-page-before-invite.png', fullPage: true });

  const workerName = `PW Worker ${stamp}`;
  const workerEmail = `pw-worker-${stamp}@example.com`;

  await page.getByRole('button', { name: /invite crew|invite worker/i }).first().click();

  const modal = page.locator('.v3-modal').last();
  await expect(modal).toBeVisible({ timeout: 10000 });

  await modal.getByLabel(/worker name/i).fill(workerName);
  await modal.getByLabel(/worker email/i).fill(workerEmail);

  const phoneInput = modal.getByLabel(/phone/i);
  if (await phoneInput.isVisible().catch(() => false)) {
    await phoneInput.fill('0210000001');
  }

  await page.screenshot({ path: 'frontend/test-results/invite-worker-modal.png', fullPage: true });

  const submit = modal.locator('form button[type="submit"], button[type="submit"]').last();
  await submit.scrollIntoViewIfNeeded();
  await submit.click({ force: true });
  await page.waitForTimeout(4000);

  await expect(page.locator('body')).toContainText(workerName, { timeout: 20000 });
  await page.screenshot({ path: 'frontend/test-results/worker-invited.png', fullPage: true });

  const headers = await authHeaders(page);
  const workersResp = await page.request.get(`${API_URL}/team/workers`, { headers });
  console.log('Workers API status:', workersResp.status());
  expect(workersResp.status()).toBeLessThan(500);

  const workersJson = await workersResp.json().catch(() => ({}));
  const body = JSON.stringify(workersJson);
  console.log('Worker invite found in API:', body.includes(workerEmail));
  expect(body).toContain(workerEmail);

  await page.goto(`${BASE_URL}/worker/jobs`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  console.log('After owner tried /worker/jobs:', page.url());
  expect(page.url()).not.toContain('/worker/jobs');

  await page.goto(`${BASE_URL}/v3/payroll`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toContainText(/Pay Run|Payroll|review/i, { timeout: 20000 });
  await page.screenshot({ path: 'frontend/test-results/payroll-route-owner.png', fullPage: true });
});
