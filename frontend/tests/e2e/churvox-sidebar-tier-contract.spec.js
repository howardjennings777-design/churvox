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

test('sidebar keeps main app simple and tier-driven', async ({ page }) => {
  await login(page);
  await page.goto('/dashboard');

  await expect(page.locator('.freshSide')).toContainText('Smart Hub');
  await expect(page.locator('.freshSide')).toContainText('Jobs');
  await expect(page.locator('.freshSide')).toContainText('Recurring');
  await expect(page.locator('.freshSide')).toContainText('Clients');
  await expect(page.locator('.freshSide')).toContainText('Quotes');
  await expect(page.locator('.freshSide')).toContainText('Invoices');

  const mainSidebarText = await page.locator('.freshSide').innerText();
  expect(mainSidebarText).not.toMatch(/MYOB/);
});
