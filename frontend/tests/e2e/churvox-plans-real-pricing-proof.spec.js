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

test('plans page is proper pricing and saves backend plan proof', async ({ page }) => {
  await page.goto(url('/login'));
  await wait(page);

  await page.getByLabel(/email/i).fill(EMAIL);
  await page.getByLabel(/password/i).fill(PASS);
  await page.getByRole('button', { name: /sign in|log in|login/i }).click();
  await page.waitForURL(/dashboard|plans|setup|guide|#/i, { timeout: 30000 }).catch(() => null);
  await wait(page);

  const before = await page.request.get(api('/billing/subscription-status'));
  const beforeText = await before.text().catch(() => '{}');
  const beforeJson = JSON.parse(beforeText || '{}');
  const originalPlan = beforeJson.plan || 'solo';

  console.log('PLANS_API_BASE=' + API_BASE);
  console.log('PLANS_STATUS_BEFORE=' + before.status());
  console.log('PLANS_ORIGINAL_PLAN=' + originalPlan);

  expect(before.status()).toBeLessThan(400);

  const save = await page.request.patch(api('/user/plan'), { data: { plan: 'pro' } });
  console.log('PLANS_SAVE_STATUS=' + save.status());
  expect(save.status()).toBeLessThan(400);

  const after = await page.request.get(api('/billing/subscription-status'));
  const afterText = await after.text().catch(() => '{}');
  const afterJson = JSON.parse(afterText || '{}');
  console.log('PLANS_STATUS_AFTER=' + after.status());
  console.log('PLANS_BACKEND_PLAN_AFTER=' + (afterJson.plan || ''));

  expect(after.status()).toBeLessThan(400);
  expect(afterJson.plan).toBe('pro');

  await page.goto(url('/dashboard#plans'));
  await wait(page);

  await expect(page.locator('body')).toContainText('Pick the plan that fits', { timeout: 30000 });
  await expect(page.locator('body')).toContainText('Current backend plan', { timeout: 30000 });
  await expect(page.locator('body')).toContainText('Operator', { timeout: 30000 });
  await expect(page.locator('body')).toContainText('Start $39', { timeout: 30000 });
  await expect(page.locator('body')).toContainText('Command Growth Pack', { timeout: 30000 });

  const pageText = await page.locator('body').innerText();
  console.log('PLANS_FOUND_PROPER_HERO=' + pageText.includes('Pick the plan that fits'));
  console.log('PLANS_FOUND_BACKEND_CURRENT=' + pageText.includes('Current backend plan'));
  console.log('PLANS_FOUND_OPERATOR=' + pageText.includes('Operator'));
  console.log('PLANS_PREVIEW_TEXT_ON_PAGE=' + pageText.includes('Current preview plan'));

  expect(pageText).not.toContain('Current preview plan');

  const restore = await page.request.patch(api('/user/plan'), { data: { plan: originalPlan } });
  console.log('PLANS_RESTORE_STATUS=' + restore.status());
  expect(restore.status()).toBeLessThan(400);
});
