const { test, expect } = require('@playwright/test');

const publicRoutes = [
  { path: '/login', name: 'Login' },
  { path: '/signup', name: 'Signup' },
  { path: '/forgot-password', name: 'Forgot password' },
  { path: '/privacy', name: 'Privacy' },
  { path: '/terms', name: 'Terms' },
  { path: '/privacy-policy', name: 'Privacy policy' },
  { path: '/terms-of-service', name: 'Terms of service' },
  { path: '/account-deletion', name: 'Account deletion' },
];

const protectedRoutes = [
  '/dashboard',
  '/jobs',
  '/clients',
  '/quotes',
  '/invoices',
  '/team',
  '/payroll',
  '/settings',
  '/automation',
  '/reports',
  '/integrations',
  '/sms',
  '/notifications',
];

const authenticatedRoutes = [
  '/dashboard',
  '/jobs',
  '/clients',
  '/quotes',
  '/invoices',
  '/team',
  '/payroll',
  '/settings',
  '/automation',
  '/reports',
  '/integrations',
  '/sms',
  '/notifications',
];

async function assertPageIsNotBroken(page, label) {
  await page.waitForLoadState('domcontentloaded');
  const bodyText = (await page.locator('body').innerText({ timeout: 10000 })).trim();
  expect(bodyText, `${label} should not be blank`).not.toHaveLength(0);
  await expect(page.locator('body'), `${label} should not show a generic runtime crash`).not.toContainText(/application error|script error|failed to compile|module not found|cannot read properties|is not defined/i);
  await expect(page.locator('body'), `${label} should not show React runtime crash text`).not.toContainText(/minified react error|uncaught|typeerror|referenceerror/i);
}

async function loginIfSecretsExist(page) {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  test.skip(!email || !password, 'Set CHURVOX_E2E_EMAIL and CHURVOX_E2E_PASSWORD repository secrets to run authenticated tests.');

  await page.goto('/login');
  await page.getByTestId('login-email-input').fill(email);
  await page.getByTestId('login-password-input').fill(password);
  await page.getByTestId('login-submit-button').click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20000 });
}

test.describe('public site smoke checks', () => {
  for (const route of publicRoutes) {
    test(`${route.name} route loads`, async ({ page }) => {
      await page.goto(route.path);
      await assertPageIsNotBroken(page, route.path);
    });
  }
});

test.describe('unauthenticated route protection', () => {
  for (const path of protectedRoutes) {
    test(`${path} redirects unauthenticated users to login`, async ({ page }) => {
      await page.goto(path);
      await page.waitForURL(/\/login/, { timeout: 15000 });
      await assertPageIsNotBroken(page, `${path} login redirect`);
    });
  }
});

test.describe('authenticated full app checks', () => {
  test.beforeEach(async ({ page }) => {
    await loginIfSecretsExist(page);
  });

  for (const path of authenticatedRoutes) {
    test(`${path} loads after login`, async ({ page }) => {
      await page.goto(path);
      await assertPageIsNotBroken(page, path);
    });
  }

  test('Smart Hub core actions are visible and clickable', async ({ page }) => {
    await page.goto('/dashboard');
    await assertPageIsNotBroken(page, 'Smart Hub dashboard');

    await expect(page.getByText(/AI Operator Control Centre/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/AI Approval Centre/i)).toBeVisible({ timeout: 15000 });

    const commandQueue = page.getByRole('button', { name: /Open Command Queue/i });
    if (await commandQueue.isVisible().catch(() => false)) {
      await commandQueue.click();
      await assertPageIsNotBroken(page, 'Command Queue after click');
    }

    const approvalCentre = page.getByRole('button', { name: /Open Approval Centre/i });
    if (await approvalCentre.isVisible().catch(() => false)) {
      await approvalCentre.click();
      await assertPageIsNotBroken(page, 'Approval Centre after click');
    }
  });
});
