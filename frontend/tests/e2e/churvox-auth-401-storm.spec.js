const { test, expect } = require('@playwright/test');

const API_PATHS_ALLOWED_BEFORE_AUTH = new Set([
  '/api/auth/me',
  '/api/platform/visit',
  '/api/platform/telemetry',
]);

test.describe('Churvox stale-session authentication guard', () => {
  test('cached owner data without a valid session never mounts protected screens or floods protected APIs', async ({ page }) => {
    const protectedCalls = [];

    await page.addInitScript(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('authToken');
      localStorage.removeItem('access_token');
      localStorage.setItem('churvox_auth_session_snapshot_v1', JSON.stringify({
        at: Date.now(),
        token: '',
        user: {
          id: 'stale-owner',
          business_id: 'stale-owner',
          email: 'stale-owner@example.com',
          role: 'owner',
          has_app_access: true,
          email_verified: true,
        },
      }));
    });

    await page.route('**/api/**', async (route) => {
      const url = new URL(route.request().url());
      const path = url.pathname;
      if (path === '/api/auth/me') {
        return route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ detail: 'Not authenticated' }) });
      }
      if (API_PATHS_ALLOWED_BEFORE_AUTH.has(path)) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
      }
      protectedCalls.push(`${route.request().method()} ${path}`);
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, items: [], slips: [], audit: [] }) });
    });

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/login(?:\?|$)/, { timeout: 15000 });
    await page.waitForTimeout(1800);

    expect(protectedCalls, `Protected calls escaped before auth resolved: ${protectedCalls.join(', ')}`).toEqual([]);
    await expect(page.locator('.cvOwnerReady')).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('churvox_auth_session_snapshot_v1'))).toBeNull();
    expect(await page.evaluate(() => window.__CHURVOX_AUTH_STATE__?.status)).toBe('anonymous');
  });
});
