const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.CHURVOX_BASE_URL || 'https://www.churvox.com';
const EMAIL = process.env.CHURVOX_TEST_EMAIL || '';
const PASSWORD = process.env.CHURVOX_TEST_PASSWORD || '';

test.setTimeout(90000);

test('Churvox smoke test - login and core AI pages open', async ({ page }) => {
  if (!EMAIL || !PASSWORD) {
    throw new Error('Set CHURVOX_TEST_EMAIL and CHURVOX_TEST_PASSWORD first.');
  }

  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });

  await page.locator('input[type="email"], input[name="email"]').first().fill(EMAIL);
  await page.locator('input[type="password"], input[name="password"]').first().fill(PASSWORD);

  await page.getByRole('button', { name: /log in|login|sign in/i }).first().click();
  await page.waitForTimeout(4000);

  await page.screenshot({ path: 'frontend/test-results/01-after-login.png', fullPage: true });

  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toContainText(/Churvox|AI Trade OS|Owner Decisions|Prepare/i, { timeout: 20000 });
  await page.screenshot({ path: 'frontend/test-results/02-dashboard.png', fullPage: true });

  await page.goto(`${BASE_URL}/v3/jobs`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toContainText(/AI Run Sheet|Create job|Field work/i, { timeout: 20000 });
  await page.screenshot({ path: 'frontend/test-results/03-ai-run-sheet.png', fullPage: true });

  await page.goto(`${BASE_URL}/v3/dispatch`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toContainText(/Crew Match|worker|dispatch/i, { timeout: 20000 });
  await page.screenshot({ path: 'frontend/test-results/04-crew-match.png', fullPage: true });

  await page.goto(`${BASE_URL}/v3/invoices`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toContainText(/Money Board|invoice|Create invoice/i, { timeout: 20000 });
  await page.screenshot({ path: 'frontend/test-results/05-money-board.png', fullPage: true });

  await page.goto(`${BASE_URL}/v3/proof`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toContainText(/Proof-to-Paid|proof|completed/i, { timeout: 20000 });
  await page.screenshot({ path: 'frontend/test-results/06-proof-to-paid.png', fullPage: true });
});
