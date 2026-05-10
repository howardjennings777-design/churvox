const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.CHURVOX_BASE_URL || 'https://www.churvox.com';
const EMAIL = process.env.CHURVOX_TEST_EMAIL || '';
const PASSWORD = process.env.CHURVOX_TEST_PASSWORD || '';

test.setTimeout(90000);

async function login(page) {
  if (!EMAIL || !PASSWORD) throw new Error('Missing CHURVOX_TEST_EMAIL or CHURVOX_TEST_PASSWORD');

  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"], input[name="email"]').first().fill(EMAIL);
  await page.locator('input[type="password"], input[name="password"]').first().fill(PASSWORD);
  await page.getByRole('button', { name: /log in|login|sign in/i }).first().click();
  await page.waitForTimeout(3500);
}

test('owner is still blocked from worker field app', async ({ page }) => {
  await login(page);

  await page.goto(`${BASE_URL}/worker/jobs`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  console.log('URL after owner tries worker app:', page.url());
  expect(page.url()).not.toContain('/worker/jobs');

  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toContainText(/Churvox|AI Trade OS|Owner Decisions|Prepare/i, { timeout: 20000 });
});
