const { test, expect } = require('@playwright/test');

const OWNER_EMAIL = process.env.CHURVOX_OWNER_EMAIL || process.env.CHURVOX_E2E_EMAIL || '';
const OWNER_PASSWORD = process.env.CHURVOX_OWNER_PASSWORD || process.env.CHURVOX_E2E_PASSWORD || '';
const API_BASE = (process.env.PLAYWRIGHT_API_BASE || 'https://grassley-backend.onrender.com').replace(/\/+$/, '');

async function login(page) {
  test.skip(!OWNER_EMAIL || !OWNER_PASSWORD, 'Owner login env required for dashboard checks.');

  const response = await page.request.post(`${API_BASE}/api/auth/login`, {
    data: { email: OWNER_EMAIL, password: OWNER_PASSWORD },
  });

  expect(response.ok()).toBeTruthy();
  const body = await response.json().catch(() => ({}));
  const token = body.token || body.access_token || body.data?.token || '';

  await page.addInitScript((authToken) => {
    if (authToken) {
      window.localStorage.setItem('token', authToken);
      window.localStorage.setItem('authToken', authToken);
    }
  }, token);
}

test('plans show simple powerful tier direction', async ({ page }) => {
  await page.goto('/plans');
  await expect(page.getByText(/Looks simple\. Works hard underneath/i).first()).toBeVisible();
  await expect(page.getByText(/Simple outside\. Powerful underneath/i).first()).toBeVisible();
  await expect(page.getByText(/Recurring jobs included/i).first()).toBeVisible();
  await expect(page.getByText(/Xero Sync Add-on/i).first()).toBeVisible();
  await expect(page.getByText(/MYOB/i)).toHaveCount(0);
});

test('smart hub explains the simple track', async ({ page }) => {
  await login(page);
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: /Smart Hub/i }).first()).toBeVisible();
  await expect(page.getByText(/Your simple track for the day/i).first()).toBeVisible();
  await expect(page.getByText(/Run today's work/i).first()).toBeVisible();
  await expect(page.getByText(/Churvox spots admin/i).first()).toBeVisible();
});

test('command explains approval system or locked plan path', async ({ page }) => {
  await login(page);
  await page.goto('/dashboard#command');
  const locked = page.getByText(/Command is not in/i).first();
  const memory = page.getByText(/Last time this client paid \$85/i).first();
  await expect(locked.or(memory)).toBeVisible();
});
