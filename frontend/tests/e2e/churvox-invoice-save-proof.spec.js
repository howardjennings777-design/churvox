const { test, expect } = require('@playwright/test');

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'https://www.churvox.com';
const EMAIL = process.env.CHURVOX_E2E_EMAIL || '';
const PASS = process.env.CHURVOX_E2E_PASSWORD || '';
const url = (path) => new URL(path, BASE).toString();
const stamp = () => new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);

async function wait(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(800);
}

test('invoice save proof', async ({ page }) => {
  const invoiceName = `PW Invoice Proof ${stamp()}`;

  await page.goto(url('/login'));
  await wait(page);

  await page.getByLabel(/email/i).fill(EMAIL);
  await page.getByLabel(/password/i).fill(PASS);
  await page.getByRole('button', { name: /sign in|log in|login/i }).click();
  await page.waitForURL(/dashboard|plans|setup|guide|#/i, { timeout: 30000 }).catch(() => null);
  await wait(page);

  await page.goto(url('/invoices/new'));
  await wait(page);

  await page.getByTestId('invoice-customer-name-input').fill(invoiceName);
  await page.getByTestId('invoice-billing-address-input').fill('1 Invoice Proof Street');
  await page.getByTestId('invoice-site-address-input').fill('1 Invoice Proof Street');

  await page.getByTestId('invoice-line-description-0').fill(invoiceName);
  await page.getByTestId('invoice-line-quantity-0').fill('1');
  await page.getByTestId('invoice-line-unit-price-0').fill('150');
  await page.getByTestId('invoice-line-total-0').fill('150');

  await page.getByTestId('invoice-public-notes-input').fill(`Proof notes for ${invoiceName}`);

  const invoiceSave = page.waitForResponse(
    (res) => res.url().includes('/api/invoices') && ['POST', 'PATCH'].includes(res.request().method()),
    { timeout: 30000 }
  );

  await page.getByRole('button', { name: /create invoice|save invoice|update invoice|save|create/i }).click();

  const response = await invoiceSave;
  const body = await response.text().catch(() => '');

  console.log('INVOICE_SAVE_NAME=' + invoiceName);
  console.log('INVOICE_SAVE_STATUS=' + response.status());
  console.log('INVOICE_SAVE_BODY=' + body.slice(0, 1000));

  expect(response.status()).toBeLessThan(400);

  await page.waitForTimeout(1500);
  await page.goto(url('/dashboard#invoices'));
  await wait(page);

  await expect(page.locator('body')).toContainText(invoiceName, { timeout: 30000 });

  const pageText = await page.locator('body').innerText();
  console.log('INVOICE_FOUND_ON_PAGE=' + pageText.includes(invoiceName));
});
