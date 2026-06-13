const { test, expect } = require('@playwright/test');

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'https://www.churvox.com';
const API_BASE = (process.env.CHURVOX_API_BASE || process.env.REACT_APP_BACKEND_URL || process.env.VITE_BACKEND_URL || 'https://grassley-backend.onrender.com').replace(/\/$/, '');
const EMAIL = process.env.CHURVOX_E2E_EMAIL || '';
const PASS = process.env.CHURVOX_E2E_PASSWORD || '';
const url = (path) => new URL(path, BASE).toString();
const api = (path) => `${API_BASE}/api${path}`;

async function wait(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(900);
}

test('settings loads and saves real business settings proof', async ({ page }) => {
  await page.goto(url('/login'));
  await wait(page);

  await page.getByLabel(/email/i).fill(EMAIL);
  await page.getByLabel(/password/i).fill(PASS);
  await page.getByRole('button', { name: /sign in|log in|login/i }).click();
  await page.waitForURL(/dashboard|plans|setup|guide|#/i, { timeout: 30000 }).catch(() => null);
  await wait(page);

  const before = await page.request.get(api('/auth/me'));
  const beforeText = await before.text().catch(() => '{}');
  const beforeJson = JSON.parse(beforeText || '{}');
  const originalGst = Number(beforeJson.gst_rate ?? 15);
  const originalTrade = beforeJson.trade_type || 'other';

  console.log('SETTINGS_API_BASE=' + API_BASE);
  console.log('SETTINGS_AUTH_ME_STATUS=' + before.status());
  console.log('SETTINGS_BUSINESS_NAME=' + (beforeJson.business_name || ''));
  console.log('SETTINGS_ORIGINAL_GST=' + originalGst);
  console.log('SETTINGS_ORIGINAL_TRADE=' + originalTrade);

  expect(before.status()).toBeLessThan(400);

  const gstUpdate = await page.request.patch(api('/user/gst'), { data: { gst_rate: 15 } });
  const tradeUpdate = await page.request.patch(api('/user/trade'), { data: { trade_type: 'electrical' } });

  console.log('SETTINGS_GST_SAVE_STATUS=' + gstUpdate.status());
  console.log('SETTINGS_TRADE_SAVE_STATUS=' + tradeUpdate.status());

  expect(gstUpdate.status()).toBeLessThan(400);
  expect(tradeUpdate.status()).toBeLessThan(400);

  await page.goto(url('/dashboard#settings'));
  await wait(page);

  await expect(page.locator('body')).toContainText('Settings', { timeout: 30000 });
  await expect(page.locator('body')).toContainText('Real business setup', { timeout: 30000 });
  await expect(page.locator('body')).toContainText('Electrical', { timeout: 30000 });
  await expect(page.locator('body')).toContainText('15%', { timeout: 30000 });

  const pageText = await page.locator('body').innerText();
  console.log('SETTINGS_FOUND_ON_PAGE=' + pageText.includes('Electrical'));
  console.log('SETTINGS_DEMO_BUSINESS_ON_PAGE=' + pageText.includes('Churvox Demo Business'));
  console.log('SETTINGS_LOCAL_ONLY_TEXT_ON_PAGE=' + pageText.includes('Auto-saved locally'));

  expect(pageText).not.toContain('Churvox Demo Business');
  expect(pageText).not.toContain('Auto-saved locally');

  const restoreGst = await page.request.patch(api('/user/gst'), { data: { gst_rate: originalGst } });
  const restoreTrade = await page.request.patch(api('/user/trade'), { data: { trade_type: originalTrade } });

  console.log('SETTINGS_RESTORE_GST_STATUS=' + restoreGst.status());
  console.log('SETTINGS_RESTORE_TRADE_STATUS=' + restoreTrade.status());

  expect(restoreGst.status()).toBeLessThan(400);
  expect(restoreTrade.status()).toBeLessThan(400);
});
