const { test, expect } = require('@playwright/test');

const OWNER_EMAIL = process.env.CHURVOX_OWNER_EMAIL || process.env.CHURVOX_E2E_EMAIL || '';
const OWNER_PASSWORD = process.env.CHURVOX_OWNER_PASSWORD || process.env.CHURVOX_E2E_PASSWORD || '';
const API_BASE = (process.env.PLAYWRIGHT_API_BASE || 'https://grassley-backend.onrender.com').replace(/\/+$/, '');

async function login(page) {
  test.skip(!OWNER_EMAIL || !OWNER_PASSWORD, 'Owner login env required.');
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

test('main app navigation stays simple and tier driven', async ({ page }) => {
  await login(page);
  await page.goto('/dashboard');

  const nav = page.locator('.cvxNav, .freshSide').first();
  await expect(nav).toBeVisible();
  await expect(nav).toContainText(/Today|Smart Hub/);
  await expect(nav).toContainText('Jobs');
  await expect(nav).toContainText('Clients');
  await expect(nav).toContainText('Quotes');
  await expect(nav).toContainText('Invoices');
  await expect(nav).toContainText('Settings');
  await expect(nav).toContainText('Plans');
  await expect(nav).toContainText(/Help|Support/);

  const navText = await nav.innerText();
  expect(navText).not.toMatch(/Recurring/);

  if (/Command/.test(navText)) {
    expect(navText).toMatch(/Messages/);
  }

  if (/Team/.test(navText)) {
    expect(navText).toMatch(/Workers|Worker View/);
  }
});
