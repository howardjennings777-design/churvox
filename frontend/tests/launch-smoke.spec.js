const { test, expect } = require('@playwright/test');

const E2E_EMAIL = process.env.E2E_EMAIL;
const E2E_PASSWORD = process.env.E2E_PASSWORD;
const hasAuthCreds = Boolean(E2E_EMAIL && E2E_PASSWORD);

async function expectNotBlank(page) {
  await expect(page.locator('body')).toBeVisible();
  const bodyText = (await page.locator('body').innerText()).trim();
  expect(bodyText.length).toBeGreaterThan(0);
}

async function login(page) {
  await page.goto('/login');
  await expectNotBlank(page);

  const emailField = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
  const passwordField = page.locator('input[type="password"], input[name="password"]').first();
  await emailField.fill(E2E_EMAIL);
  await passwordField.fill(E2E_PASSWORD);

  const submitButton = page.getByRole('button', { name: /log\s?in|sign\s?in/i }).first();
  await submitButton.click();

  await page.waitForURL(/\/jobs|\/plans|\/timesheets|\/worker\/jobs/, { timeout: 30000 });
}

async function assertRouteLoads(page, path, textMatcher) {
  await page.goto(path);
  await expectNotBlank(page);
  if (textMatcher) {
    await expect(page.getByText(textMatcher).first()).toBeVisible();
  }
}

test.describe('Launch smoke - public routes', () => {
  test('/login loads with login form', async ({ page }) => {
    await page.goto('/login');
    await expectNotBlank(page);

    const hasEmail = await page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first().isVisible();
    const hasPassword = await page.locator('input[type="password"], input[name="password"]').first().isVisible();
    expect(hasEmail || hasPassword).toBeTruthy();
  });

  for (const route of ['/privacy', '/terms', '/privacy-policy', '/terms-of-service']) {
    test(`${route} loads`, async ({ page }) => {
      await page.goto(route);
      await expectNotBlank(page);
    });
  }

  test('/public/quote/:token with fake token does not blank', async ({ page }) => {
    await page.goto('/public/quote/fake-token-for-smoke-test');
    await expectNotBlank(page);
  });

  test('/public/invoice/:token with fake token does not blank', async ({ page }) => {
    await page.goto('/public/invoice/fake-token-for-smoke-test');
    await expectNotBlank(page);
  });
});

test.describe('Launch smoke - authenticated routes', () => {
  test.skip(!hasAuthCreds, 'Skipping authenticated tests because E2E_EMAIL or E2E_PASSWORD is not set.');

  test('authenticated route smoke checks', async ({ page }) => {
    await login(page);

    if (!/\/jobs/.test(page.url())) {
      await page.goto('/jobs');
    }

    await assertRouteLoads(page, '/jobs');
    await assertRouteLoads(page, '/smart-hub', /Smart Hub/i);
    await expect(page.getByText(/AI Business Assistant/i).first()).toBeVisible();
    await expect(page.getByText(/Assistant response/i).first()).toBeVisible();
    await assertRouteLoads(page, '/reports', /Reports/i);
    await assertRouteLoads(page, '/sms', /Communications|SMS/i);
    await assertRouteLoads(page, '/integrations', /MYOB|Integrations/i);
    await assertRouteLoads(page, '/automation');
    await assertRouteLoads(page, '/automation/runs');
    await assertRouteLoads(page, '/launch-check', /Launch Check/i);
    await assertRouteLoads(page, '/clients');
    await assertRouteLoads(page, '/quotes');
    await assertRouteLoads(page, '/invoices');

    await page.goto('/team');
    await expectNotBlank(page);
    await expect(page).toHaveURL(/\/team|\/jobs|\/plans|\/login|\/worker\/jobs|\/timesheets/);

    await page.goto('/timesheets');
    await expectNotBlank(page);
    await expect(page).toHaveURL(/\/timesheets|\/jobs|\/plans|\/login|\/worker\/jobs/);
  });
});
