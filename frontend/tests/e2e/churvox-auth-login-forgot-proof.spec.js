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

test('auth login me forgot password logout proof', async ({ page }) => {
  console.log('AUTH_API_BASE=' + API_BASE);

  await page.goto(url('/login'));
  await wait(page);

  await page.getByLabel(/email/i).fill(EMAIL);
  await page.getByLabel(/password/i).fill(PASS);
  await page.getByRole('button', { name: /sign in|log in|login/i }).click();
  await page.waitForURL(/dashboard|plans|setup|guide|#/i, { timeout: 30000 }).catch(() => null);
  await wait(page);

  const me = await page.request.get(api('/auth/me'));
  const meText = await me.text().catch(() => '{}');
  const meJson = JSON.parse(meText || '{}');

  console.log('AUTH_ME_STATUS=' + me.status());
  console.log('AUTH_ME_EMAIL=' + (meJson.email || ''));

  expect(me.status()).toBeLessThan(400);
  expect(String(meJson.email || '').toLowerCase()).toBe(EMAIL.toLowerCase());

  const forgot = await page.request.post(api('/auth/forgot-password'), {
    data: { email: EMAIL },
  });
  const forgotText = await forgot.text().catch(() => '');

  console.log('AUTH_FORGOT_STATUS=' + forgot.status());
  console.log('AUTH_FORGOT_BODY=' + forgotText);

  expect(forgot.status()).toBeLessThan(400);
  expect(forgotText).toContain('If the email exists');

  const logout = await page.request.post(api('/auth/logout'));
  console.log('AUTH_LOGOUT_STATUS=' + logout.status());
  expect(logout.status()).toBeLessThan(400);

  const afterLogout = await page.request.get(api('/auth/me'));
  console.log('AUTH_ME_AFTER_LOGOUT_STATUS=' + afterLogout.status());
  expect(afterLogout.status()).toBe(401);
});
