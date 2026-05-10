const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.CHURVOX_BASE_URL || 'https://www.churvox.com';
const EMAIL = process.env.CHURVOX_TEST_EMAIL || '';
const PASSWORD = process.env.CHURVOX_TEST_PASSWORD || '';
const stamp = Date.now();

test.setTimeout(120000);

async function login(page) {
  if (!EMAIL || !PASSWORD) throw new Error('Missing test login env vars');

  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"], input[name="email"]').first().fill(EMAIL);
  await page.locator('input[type="password"], input[name="password"]').first().fill(PASSWORD);
  await page.getByRole('button', { name: /log in|login|sign in/i }).first().click();
  await page.waitForTimeout(4000);
}

async function submitModal(page) {
  const modal = page.locator('.v3-modal').last();
  await expect(modal).toBeVisible({ timeout: 10000 });

  const submit = modal.locator('form button[type="submit"], button[type="submit"]').last();
  await expect(submit).toBeVisible({ timeout: 10000 });

  await submit.scrollIntoViewIfNeeded();
  await submit.click({ force: true });
  await page.waitForTimeout(2500);
}

test('create client and job', async ({ page }) => {
  const clientName = `PW Client ${stamp}`;
  const jobTitle = `PW Job ${stamp}`;

  await login(page);

  await page.goto(`${BASE_URL}/v3/clients`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toContainText(/Clients|Add client/i, { timeout: 20000 });

  await page.getByRole('button', { name: /add client/i }).first().click();

  const clientModal = page.locator('.v3-modal').last();
  await expect(clientModal).toBeVisible({ timeout: 10000 });

  await clientModal.getByLabel(/client name/i).fill(clientName);
  await clientModal.getByLabel(/email/i).fill(`pw-client-${stamp}@example.com`);
  await clientModal.getByLabel(/phone/i).fill('0210000000');
  await clientModal.getByLabel(/address/i).fill('1 Playwright Street, Wellington');
  await clientModal.getByLabel(/notes/i).fill('Created by Playwright test');

  await page.screenshot({ path: 'frontend/test-results/create-client-modal-fixed.png', fullPage: true });
  await submitModal(page);

  await expect(page.locator('body')).toContainText(clientName, { timeout: 20000 });
  await page.screenshot({ path: 'frontend/test-results/client-created-fixed.png', fullPage: true });

  await page.goto(`${BASE_URL}/v3/jobs`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toContainText(/AI Run Sheet|Create job/i, { timeout: 20000 });

  await page.getByRole('button', { name: /create job/i }).first().click();

  const jobModal = page.locator('.v3-modal').last();
  await expect(jobModal).toBeVisible({ timeout: 10000 });

  await jobModal.getByLabel(/job title/i).fill(jobTitle);
  await jobModal.getByLabel(/customer name/i).fill(clientName);
  await jobModal.getByLabel(/job address/i).fill('1 Playwright Street, Wellington');
  await jobModal.getByLabel(/job type/i).fill('other');
  await jobModal.getByLabel(/^price$/i).fill('125');
  await jobModal.getByLabel(/notes/i).fill('Created by Playwright test');

  await page.screenshot({ path: 'frontend/test-results/create-job-modal-fixed.png', fullPage: true });
  await submitModal(page);

  await expect(page.locator('body')).toContainText(jobTitle, { timeout: 20000 });
  await page.screenshot({ path: 'frontend/test-results/job-created-fixed.png', fullPage: true });
});
