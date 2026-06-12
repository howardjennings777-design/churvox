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

test('quote save proof', async ({ page }) => {
  const quoteName = `PW Quote Proof ${stamp()}`;

  await page.goto(url('/login'));
  await wait(page);

  await page.getByLabel(/email/i).fill(EMAIL);
  await page.getByLabel(/password/i).fill(PASS);
  await page.getByRole('button', { name: /sign in|log in|login/i }).click();
  await page.waitForURL(/dashboard|plans|setup|guide|#/i, { timeout: 30000 }).catch(() => null);
  await wait(page);

  await page.goto(url('/quotes/new'));
  await wait(page);

  await page.getByTestId('quote-customer-name-input').fill(quoteName);
  await page.getByTestId('quote-address-input').fill('1 Quote Proof Street');
  await page.getByTestId('quote-job-description-input').fill(quoteName);
  await page.getByTestId('quote-total-price-input').fill('120');
  await page.getByTestId('quote-notes-input').fill(`Proof notes for ${quoteName}`);

  const quoteSave = page.waitForResponse(
    (res) => res.url().includes('/api/quotes') && ['POST', 'PATCH'].includes(res.request().method()),
    { timeout: 30000 }
  );

  await page.getByRole('button', { name: /create quote|save quote|save|create/i }).click();

  const response = await quoteSave;
  const body = await response.text().catch(() => '');

  console.log('QUOTE_SAVE_NAME=' + quoteName);
  console.log('QUOTE_SAVE_STATUS=' + response.status());
  console.log('QUOTE_SAVE_BODY=' + body.slice(0, 1000));

  expect(response.status()).toBeLessThan(400);

  await page.waitForTimeout(1500);
  await page.goto(url('/dashboard#quotes'));
  await wait(page);

  await expect(page.locator('body')).toContainText(quoteName, { timeout: 30000 });

  const pageText = await page.locator('body').innerText();
  console.log('QUOTE_FOUND_ON_PAGE=' + pageText.includes(quoteName));
});
