const { test, expect } = require('@playwright/test');

const OWNER_EMAIL = process.env.CHURVOX_OWNER_EMAIL || process.env.CHURVOX_E2E_EMAIL || '';
const OWNER_PASSWORD = process.env.CHURVOX_OWNER_PASSWORD || process.env.CHURVOX_E2E_PASSWORD || '';
const API_BASE = (process.env.PLAYWRIGHT_API_BASE || 'https://grassley-backend.onrender.com').replace(/\/+$/, '');

async function bodyText(page) {
  return (await page.locator('body').innerText({ timeout: 12000 }).catch(() => '')).replace(/\s+/g, ' ').trim();
}

async function login(page) {
  test.skip(!OWNER_EMAIL || !OWNER_PASSWORD, 'Owner login env required.');
  const response = await page.request.post(`${API_BASE}/api/auth/login`, {
    data: { email: OWNER_EMAIL, password: OWNER_PASSWORD },
  });
  expect(response.ok()).toBeTruthy();
  const body = await response.json().catch(() => ({}));
  const token = body.token || body.access_token || body.user?.token || body.data?.token || '';
  await page.goto('/');
  await page.evaluate((authToken) => {
    if (authToken) {
      window.localStorage.setItem('token', authToken);
      window.localStorage.setItem('authToken', authToken);
    }
  }, token);
  await page.goto('/dashboard');
  await page.waitForTimeout(1500);
  const copy = await bodyText(page);
  if (/WELCOME BACK|Sign in to Command|Forgot password/i.test(copy)) {
    await page.goto('/login');
    await page.locator('input[type="email"], input[name*="email" i]').first().fill(OWNER_EMAIL);
    await page.locator('input[type="password"], input[name*="password" i]').first().fill(OWNER_PASSWORD);
    const button = page.getByRole('button', { name: /sign in|login|log in/i }).first();
    if (await button.isVisible().catch(() => false)) await button.click();
    else await page.locator('button[type="submit"], input[type="submit"]').first().click();
    await page.waitForTimeout(1800);
    await page.goto('/dashboard');
    await page.waitForTimeout(1200);
  }
}

test('Control Board navigation stays simple, honest and tier driven', async ({ page }) => {
  await login(page);

  const nav = page.locator('nav[aria-label="Churvox main navigation"]');
  await expect(nav).toBeVisible();
  const navText = (await nav.innerText()).replace(/\s+/g, ' ').trim();

  expect(navText).toMatch(/Today/);
  expect(navText).toMatch(/Work/);
  expect(navText).toMatch(/Clients/);
  expect(navText).toMatch(/Money/);
  expect(navText).not.toMatch(/Recurring|Schedule|Quotes|Invoices|Settings|Plans|Help/);

  if (/Team/.test(navText)) expect(navText).toMatch(/Messages/);
  if (/Command/.test(navText)) expect(navText).toMatch(/Messages/);

  const profile = page.locator('.cv7Profile');
  await expect(profile).toBeVisible();
  await profile.click();
  const menu = page.locator('.cv7ProfileMenu');
  await expect(menu).toBeVisible();
  await expect(menu).toContainText(/Plans and billing/);
  await expect(menu).toContainText(/Help/);

  await page.goto('/dashboard#recurring');
  await expect(page.locator('nav[aria-label="work navigation"]')).toContainText(/Jobs/);
  await expect(page.locator('nav[aria-label="work navigation"]')).toContainText(/Schedule/);
  await expect(page.locator('nav[aria-label="work navigation"]')).toContainText(/Recurring/);
});
