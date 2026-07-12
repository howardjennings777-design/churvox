const { test, expect } = require('@playwright/test');

const BASE_URL = (process.env.PLAYWRIGHT_BASE_URL || 'https://www.churvox.com').replace(/\/+$/, '');
const PROTECTED_PATHS = [
  '/api/billing/addons',
  '/api/plan/usage',
  '/api/nav/attention-counts',
  '/api/command/scan',
  '/api/command/slips',
  '/api/command/audit',
  '/api/industry/context',
];

test('live expired owner session redirects cleanly without a protected 401 storm', async ({ page }) => {
  const failedProtected = [];
  const allProtected = [];
  const authMe = [];

  await page.addInitScript(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    localStorage.removeItem('access_token');
    localStorage.setItem('churvox_auth_session_snapshot_v1', JSON.stringify({
      at: Date.now(),
      token: '',
      user: {
        id: 'expired-live-owner',
        business_id: 'expired-live-owner',
        email: 'expired-live-owner@example.com',
        role: 'owner',
        has_app_access: true,
        email_verified: true,
      },
    }));
  });

  page.on('response', (response) => {
    let path = '';
    try { path = new URL(response.url()).pathname; } catch {}
    if (path === '/api/auth/me') authMe.push(response.status());
    if (PROTECTED_PATHS.includes(path)) {
      allProtected.push(`${response.request().method()} ${path} ${response.status()}`);
      if (response.status() === 401) failedProtected.push(path);
    }
  });

  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/login(?:\?|$)/, { timeout: 20000 });
  await page.waitForTimeout(2500);

  expect(authMe.length, 'auth/me should be checked once or not needed').toBeLessThanOrEqual(1);
  expect(failedProtected, `Protected 401 storm remained: ${allProtected.join(', ')}`).toEqual([]);
  expect(allProtected, `Protected calls escaped before auth resolved: ${allProtected.join(', ')}`).toEqual([]);
  expect(await page.evaluate(() => localStorage.getItem('churvox_auth_session_snapshot_v1'))).toBeNull();
  expect(await page.evaluate(() => window.__CHURVOX_AUTH_STATE__?.status)).toBe('anonymous');
});
