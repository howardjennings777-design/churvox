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

  const submit = modal
    .getByRole('button', { name: /save|create|add/i })
    .last();

  await expect(submit).toBeVisible({ timeout: 10000 });
  await submit.scrollIntoViewIfNeeded();
  await submit.click({ force: true });
  await page.waitForTimeout(2500);
}

test('create quote and invoice', async ({ page }) => {
  const quoteClient = `PW Quote Client ${stamp}`;
  const invoiceClient = `PW Invoice Client ${stamp}`;

  await login(page);

  await page.goto(`${BASE_URL}/v3/quotes`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toContainText(/Quote Desk|Create quote|Quotes/i, { timeout: 20000 });

  await page.getByRole('button', { name: /create quote/i }).first().click();

  const quoteModal = page.locator('.v3-modal').last();
  await expect(quoteModal).toBeVisible({ timeout: 10000 });

  await quoteModal.getByLabel(/customer name/i).fill(quoteClient);
  await quoteModal.getByLabel(/customer email/i).fill(`pw-quote-${stamp}@example.com`);
  await quoteModal.getByLabel(/^address$/i).fill('2 Playwright Quote Street, Wellington');
  await quoteModal.getByLabel(/job description/i).fill('Playwright quote test work');
  await quoteModal.getByLabel(/quote price/i).fill('250');

  await page.screenshot({ path: 'frontend/test-results/create-quote-modal.png', fullPage: true });
  await submitModal(page);

  await expect(page.locator('body')).toContainText(quoteClient, { timeout: 20000 });
  await page.screenshot({ path: 'frontend/test-results/quote-created.png', fullPage: true });

  await page.goto(`${BASE_URL}/v3/invoices`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toContainText(/Money Board|Create invoice|Invoices/i, { timeout: 20000 });

  await page.getByRole('button', { name: /create invoice/i }).first().click();

  const invoiceModal = page.locator('.v3-modal').last();
  await expect(invoiceModal).toBeVisible({ timeout: 10000 });

  await invoiceModal.getByLabel(/customer name/i).fill(invoiceClient);
  await invoiceModal.getByLabel(/customer email/i).fill(`pw-invoice-${stamp}@example.com`);
  await invoiceModal.getByLabel(/^address$/i).fill('3 Playwright Invoice Street, Wellington');
  await invoiceModal.getByLabel(/invoice description/i).fill('Playwright invoice test work');
  await invoiceModal.getByLabel(/subtotal/i).fill('300');

  await page.screenshot({ path: 'frontend/test-results/create-invoice-modal.png', fullPage: true });
  await submitModal(page);

  await expect(page.locator('body')).toContainText(invoiceClient, { timeout: 20000 });
  await page.screenshot({ path: 'frontend/test-results/invoice-created.png', fullPage: true });
});
