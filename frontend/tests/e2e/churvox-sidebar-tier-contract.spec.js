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

test('main app navigation stays simple and tier driven', async ({ page }) => {
  await login(page);

  const nav = page.locator('.cvxNav, .freshSide, nav[aria-label*="Churvox" i]').first();
  await expect(nav).toBeVisible();
  const navText = (await nav.innerText()).replace(/\s+/g, ' ').trim();

  expect(navText).toMatch(/Today|Smart Hub/);
  expect(navText).toMatch(/Jobs/);
  expect(navText).toMatch(/Clients/);
  expect(navText).toMatch(/Quotes/);
  expect(navText).toMatch(/Invoices/);
  expect(navText).toMatch(/Settings/);
  expect(navText).toMatch(/Plans/);
  expect(navText).toMatch(/Help|Support/);
  expect(navText).not.toMatch(/Recurring/);

  if (/Command/.test(navText)) {
    expect(navText).toMatch(/Messages/);
  }

  if (/Team/.test(navText)) {
    expect(navText).toMatch(/Workers|Worker View/);
  }
});
