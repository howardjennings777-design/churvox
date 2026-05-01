const { test, expect } = require('@playwright/test');

const E2E_EMAIL = process.env.E2E_EMAIL;
const E2E_PASSWORD = process.env.E2E_PASSWORD;
const hasAuthCreds = Boolean(E2E_EMAIL && E2E_PASSWORD);

async function expectNotBlank(page) {
  await expect(page.locator('body')).toBeVisible();
  const bodyText = (await page.locator('body').innerText()).trim();
  const rootVisible = await page.locator('#root :scope > *, main :scope > *').first().isVisible().catch(() => false);
  expect(bodyText.length > 20 || rootVisible).toBeTruthy();
  await expect(page.getByText(/Cannot read properties of|Minified React error|Unhandled Runtime Error/i)).toHaveCount(0);
}

async function login(page) {
  await page.goto('/login');
  await expectNotBlank(page);
  await page.locator('input[type="email"], input[name="email"]').first().fill(E2E_EMAIL);
  await page.locator('input[type="password"], input[name="password"]').first().fill(E2E_PASSWORD);
  await page.getByRole('button', { name: /log\s?in|sign\s?in/i }).first().click();
  await page.waitForURL(/\/jobs|\/worker\/jobs|\/plans|\/timesheets/, { timeout: 30000 });
}

async function assertRouteLoads(page, path, maybeText) {
  await page.goto(path);
  await expectNotBlank(page);
  if (maybeText) {
    const onPage = await page.getByText(maybeText).first().isVisible().catch(() => false);
    if (!onPage) {
      await expect(page.getByText(/access|permission|protected|not authorized|unauthorized/i).first()).toBeVisible();
    }
  }
}

test.describe('Launch smoke public', () => {
  test('/login renders with form', async ({ page }) => {
    await page.goto('/login');
    await expectNotBlank(page);
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /log\s?in|sign\s?in/i }).first()).toBeVisible();
  });

  for (const route of ['/privacy', '/terms', '/privacy-policy', '/terms-of-service']) {
    test(`${route} does not blank`, async ({ page }) => {
      await page.goto(route);
      await expectNotBlank(page);
    });
  }

  test('public quote fake token does not blank', async ({ page }) => {
    await page.goto('/public/quote/fake-token-launch-smoke');
    await expectNotBlank(page);
  });

  test('public invoice fake token does not blank', async ({ page }) => {
    await page.goto('/public/invoice/fake-token-launch-smoke');
    await expectNotBlank(page);
  });
});

test.describe('Launch smoke authenticated', () => {
  test.skip(!hasAuthCreds, 'Skipping authenticated tests because E2E_EMAIL or E2E_PASSWORD missing');

  test('auth routes smoke', async ({ page }) => {
    await login(page);
    await assertRouteLoads(page, '/jobs');
    await assertRouteLoads(page, '/smart-hub', /Smart Hub/i);
    await assertRouteLoads(page, '/reports', /Reports/i);
    await assertRouteLoads(page, '/sms', /Communications|SMS/i);
    await assertRouteLoads(page, '/integrations', /Integrations|MYOB/i);
    await assertRouteLoads(page, '/automation');
    await assertRouteLoads(page, '/automation/runs');
    await assertRouteLoads(page, '/launch-check', /Launch Check/i);
    await assertRouteLoads(page, '/clients', /Clients/i);
    await assertRouteLoads(page, '/quotes', /Quotes/i);
    await assertRouteLoads(page, '/invoices', /Invoices/i);
    await assertRouteLoads(page, '/team', /Team/i);
    await assertRouteLoads(page, '/timesheets', /Timesheets|Payroll/i);
    await assertRouteLoads(page, '/worker/jobs', /Jobs|Worker/i);
  });
});
