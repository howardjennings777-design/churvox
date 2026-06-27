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

  const sidebar = page.locator('.freshSide');
  await expect(sidebar).toContainText('Smart Hub');
  await expect(sidebar).toContainText('Jobs');
  await expect(sidebar).toContainText('Clients');
  await expect(sidebar).toContainText('Quotes');
  await expect(sidebar).toContainText('Invoices');
  await expect(sidebar).toContainText('Settings');
  await expect(sidebar).toContainText('Plans');
  await expect(sidebar).toContainText('Help');

  const mainSidebarText = await sidebar.innerText();
  expect(mainSidebarText).not.toMatch(/Recurring/);
  expect(mainSidebarText).not.toMatch(/MYOB/);

  if (/Command/.test(mainSidebarText)) {
    expect(mainSidebarText).toMatch(/Messages/);
  }

  if (/Team/.test(mainSidebarText)) {
    expect(mainSidebarText).toMatch(/Worker View/);
  }
});
