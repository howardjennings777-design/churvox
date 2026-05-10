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
  await page.waitForTimeout(4000);
}

test('owner has visible logout and can log out', async ({ page }) => {
  await login(page);

  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toContainText(/Churvox|AI Trade OS|Owner Decisions|Prepare/i, { timeout: 20000 });

  const logout = page.getByRole('button', { name: /log out/i }).first();
  await expect(logout).toBeVisible({ timeout: 15000 });

  await page.screenshot({ path: 'frontend/test-results/owner-visible-logout.png', fullPage: true });

  await logout.click();
  await page.waitForTimeout(2000);

  await expect(page).toHaveURL(/login/i);
  await expect(page.locator('body')).toContainText(/login|sign in|email/i, { timeout: 20000 });
});
