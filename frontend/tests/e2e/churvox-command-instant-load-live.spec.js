const { test, expect } = require('@playwright/test');

const BASE_URL = (process.env.PLAYWRIGHT_BASE_URL || 'https://www.churvox.com').replace(/\/+$/, '');
const API_BASE = (process.env.PLAYWRIGHT_API_BASE || 'https://grassley-backend.onrender.com').replace(/\/+$/, '');
const OWNER_EMAIL = String(process.env.CHURVOX_OWNER_EMAIL || '').trim().toLowerCase();
const OWNER_PASSWORD = process.env.CHURVOX_OWNER_PASSWORD || '';
const BUILD_MARKER = 'churvox-command-instant-load-20260713d';
const CACHE_KEY = 'churvox:command:confirmed-queue:v1';

function apiUrl(path) {
  return `${API_BASE}${path.startsWith('/api') ? path : `/api${path}`}`;
}

function tokenFrom(body = {}) {
  return body.token || body.access_token || body.auth_token || body.jwt || body.accessToken
    || body.user?.token || body.user?.access_token || body.data?.token || body.data?.access_token || body.data?.user?.token || '';
}

async function responseBody(response) {
  return response.json().catch(async () => ({ text: await response.text().catch(() => '') }));
}

async function authenticatedOwner(page) {
  expect(OWNER_EMAIL, 'CHURVOX_OWNER_EMAIL is required').toBeTruthy();
  expect(OWNER_PASSWORD, 'CHURVOX_OWNER_PASSWORD is required').toBeTruthy();

  const login = await page.request.post(apiUrl('/api/auth/login'), {
    data: { email: OWNER_EMAIL, password: OWNER_PASSWORD },
    timeout: 30_000,
  });
  const loginBody = await responseBody(login);
  expect(login.ok(), `Owner login failed ${login.status()}: ${JSON.stringify(loginBody).slice(0, 600)}`).toBeTruthy();
  const token = tokenFrom(loginBody);
  expect(token, 'Owner login returned no token').toBeTruthy();

  const me = await page.request.get(apiUrl('/api/auth/me'), {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 30_000,
  });
  const meBody = await responseBody(me);
  expect(me.status(), `/api/auth/me failed: ${JSON.stringify(meBody).slice(0, 600)}`).toBe(200);
  const user = meBody.user || meBody.data?.user || meBody.data || meBody || {};

  await page.context().addInitScript(({ tokenValue, userValue, emailValue }) => {
    localStorage.setItem('token', tokenValue);
    localStorage.setItem('authToken', tokenValue);
    localStorage.setItem('access_token', tokenValue);
    localStorage.setItem('churvox_auth_session_snapshot_v1', JSON.stringify({
      at: Date.now(),
      token: tokenValue,
      user: { ...userValue, email: emailValue, token: tokenValue },
    }));
  }, { tokenValue: token, userValue: user, emailValue: OWNER_EMAIL });
}

async function waitForQueueOutcome(page, timeout = 5_000) {
  await expect.poll(() => page.evaluate(() => {
    const state = window.__CHURVOX_COMMAND_LOAD_STATE__ || {};
    return Boolean(state.queueResolvedAt || state.queueError);
  }), {
    timeout,
    intervals: [100, 180, 300, 500, 800],
    message: 'Command foreground queue did not resolve or fail within its speed budget',
  }).toBe(true);
}

test('live Command opens promptly and repeat-open uses the confirmed queue cache', async ({ page }) => {
  await authenticatedOwner(page);

  const failures = [];
  page.on('response', (response) => {
    let url;
    try { url = new URL(response.url()); } catch { return; }
    if (url.origin !== new URL(API_BASE).origin || !url.pathname.startsWith('/api/')) return;
    if (response.status() >= 500 || response.status() === 401 || response.status() === 403) {
      failures.push({ status: response.status(), method: response.request().method(), path: url.pathname });
    }
  });

  const firstStart = Date.now();
  await page.goto(`${BASE_URL}/dashboard#command`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.cvOwnerReady')).toBeVisible({ timeout: 15_000 });
  await expect.poll(() => page.evaluate(() => window.__CHURVOX_COMMAND_FAST_LOAD_BUILD__ || ''), {
    timeout: 15_000,
    message: 'The exact instant-load Command module did not execute',
  }).toBe(BUILD_MARKER);
  await expect(page.locator('.cvSiteDecisionGrid')).toBeVisible({ timeout: 15_000 });
  await waitForQueueOutcome(page, 5_000);
  await expect(page.locator('.cvSiteDecisionGrid')).not.toContainText('Opening current decisions', { timeout: 5_000 });
  const firstMs = Date.now() - firstStart;
  expect(firstMs, `First Command queue took ${firstMs}ms`).toBeLessThan(6_000);

  const cached = await page.evaluate((key) => localStorage.getItem(key), CACHE_KEY);
  expect(cached, 'A successful confirmed queue was not cached for repeat-open').toBeTruthy();

  await page.goto(`${BASE_URL}/dashboard#today`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.cvOwnerReady')).toBeVisible({ timeout: 15_000 });

  const repeatStart = Date.now();
  await page.goto(`${BASE_URL}/dashboard#command`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.cvSiteDecisionGrid')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('.cvSiteDecisionGrid')).not.toContainText('Opening current decisions', { timeout: 1_800 });
  const repeatMs = Date.now() - repeatStart;
  expect(repeatMs, `Cached Command repeat-open took ${repeatMs}ms`).toBeLessThan(2_500);

  expect(failures, `Command produced protected/server failures: ${JSON.stringify(failures)}`).toEqual([]);
});
