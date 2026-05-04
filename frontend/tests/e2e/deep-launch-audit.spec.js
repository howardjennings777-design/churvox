const { test, expect } = require('@playwright/test');

const coreRoutes = [
  { path: '/dashboard', mustContain: /Smart Hub|AI|Approval|Operator/i },
  { path: '/clients', mustContain: /Client|Customer|Relationship/i },
  { path: '/jobs', mustContain: /Job|Dispatch|Assigned|Unassigned/i },
  { path: '/dispatch', mustContain: /Dispatch|Calendar|Job|Schedule/i },
  { path: '/quotes', mustContain: /Quote|Estimate|Pipeline/i },
  { path: '/invoices', mustContain: /Invoice|Billing|Paid|Outstanding/i },
  { path: '/team', mustContain: /Team|Worker|Crew|Invite/i },
  { path: '/automation', mustContain: /Automation|Rule|Trigger|Run/i },
  { path: '/payroll', mustContain: /Payroll|Pay|Timesheet|Hours/i },
  { path: '/reports', mustContain: /Report|Export|Analytics|Summary/i },
  { path: '/integrations', mustContain: /Integration|MYOB|Connect|Accounting/i },
  { path: '/sms', mustContain: /SMS|Communication|Message|Credit/i },
  { path: '/settings', mustContain: /Settings|Profile|Business|Account/i },
  { path: '/notifications', mustContain: /Notification|Alert|Activity/i },
];

const createRoutes = [
  { path: '/clients/new', label: /Client|Customer|Name|Create/i },
  { path: '/jobs/new', label: /Job|Client|Address|Create|Save/i },
  { path: '/quotes/new', label: /Quote|Client|Amount|Create|Save/i },
  { path: '/invoices/new', label: /Invoice|Client|Amount|Create|Save/i },
];

async function assertPageIsNotBroken(page, label) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(400);
  const body = page.locator('body');
  const bodyText = (await body.innerText({ timeout: 15000 })).trim();
  expect(bodyText, `${label} should not be blank`).not.toHaveLength(0);
  await expect(body, `${label} should not show runtime crash`).not.toContainText(/application error|script error|failed to compile|module not found|cannot read properties|is not defined|minified react error|uncaught|typeerror|referenceerror/i);
  await expect(body, `${label} should not show backend stack trace`).not.toContainText(/traceback|internal server error|500 server error|502 bad gateway|503 service unavailable/i);
}

async function login(page) {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  test.skip(!email || !password, 'Set CHURVOX_E2E_EMAIL and CHURVOX_E2E_PASSWORD secrets for deep logged-in audit.');

  await page.goto('/login');
  await assertPageIsNotBroken(page, 'login page');

  const emailInput = page.getByTestId('login-email-input').or(page.locator('input[type="email"], input[name="email"]').first());
  const passwordInput = page.getByTestId('login-password-input').or(page.locator('input[type="password"], input[name="password"]').first());
  await emailInput.fill(email);
  await passwordInput.fill(password);

  const submit = page.getByTestId('login-submit-button').or(page.getByRole('button', { name: /log in|login|sign in/i }).first());
  await submit.click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 25000 });
  await assertPageIsNotBroken(page, 'after login');
}

async function softClickVisible(page, nameRegex, label) {
  const target = page.getByRole('button', { name: nameRegex }).or(page.getByRole('link', { name: nameRegex })).first();
  if (await target.isVisible().catch(() => false)) {
    await target.click();
    await page.waitForTimeout(500);
    await assertPageIsNotBroken(page, label);
    return true;
  }
  return false;
}

test.describe('deep authenticated launch audit', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('all core authenticated pages load with expected content', async ({ page }) => {
    for (const route of coreRoutes) {
      await page.goto(route.path);
      await assertPageIsNotBroken(page, route.path);
      await expect(page.locator('body'), `${route.path} should show expected page content`).toContainText(route.mustContain);
    }
  });

  test('create/edit entry pages open without breaking', async ({ page }) => {
    for (const route of createRoutes) {
      await page.goto(route.path);
      await assertPageIsNotBroken(page, route.path);
      await expect(page.locator('body'), `${route.path} should show create form content`).toContainText(route.label);
      const fields = await page.locator('input, textarea, select, [role="combobox"]').count();
      expect(fields, `${route.path} should expose at least one form control`).toBeGreaterThan(0);
    }
  });

  test('Smart Hub actions, approval centre, settings, and workspace dock do not crash', async ({ page }) => {
    await page.goto('/dashboard');
    await assertPageIsNotBroken(page, 'Smart Hub');

    await expect(page.locator('body')).toContainText(/Approval|Operator|AI/i);

    await softClickVisible(page, /Open Command Queue/i, 'Open Command Queue');
    await softClickVisible(page, /Open Approval Centre/i, 'Open Approval Centre');
    await softClickVisible(page, /Run today's AI plan/i, 'Run AI plan');
    await softClickVisible(page, /Open AI Settings|AI Settings/i, 'AI Settings');

    const workspaceButtons = [/Jobs/i, /Clients/i, /Invoices/i, /Quotes/i, /Crew/i, /Approvals/i, /AI Dispatch/i];
    for (const name of workspaceButtons) {
      await page.goto('/dashboard');
      await assertPageIsNotBroken(page, 'Smart Hub before workspace click');
      await softClickVisible(page, name, `workspace ${name}`);
    }
  });

  test('navigation links from sidebar or mobile nav are usable', async ({ page, isMobile }) => {
    await page.goto('/dashboard');
    await assertPageIsNotBroken(page, 'dashboard before navigation audit');

    const navLabels = [/Smart Hub/i, /Jobs/i, /Dispatch/i, /Clients/i, /Quotes/i, /Invoices/i, /Team/i, /Automation/i, /Settings/i];
    for (const label of navLabels) {
      if (isMobile) {
        const more = page.getByTestId('mobile-more-button');
        if (await more.isVisible().catch(() => false)) await more.click();
      }
      const navItem = page.getByRole('link', { name: label }).first();
      if (await navItem.isVisible().catch(() => false)) {
        await navItem.click();
        await assertPageIsNotBroken(page, `nav ${label}`);
      }
    }
  });

  test('mobile layout has tappable core navigation and no blank screens', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile-specific audit runs only on mobile project.');
    await page.goto('/dashboard');
    await assertPageIsNotBroken(page, 'mobile dashboard');

    const more = page.getByTestId('mobile-more-button');
    if (await more.isVisible().catch(() => false)) {
      await more.click();
      await assertPageIsNotBroken(page, 'mobile more menu');
    }

    for (const path of ['/jobs', '/clients', '/quotes', '/invoices', '/settings']) {
      await page.goto(path);
      await assertPageIsNotBroken(page, `mobile ${path}`);
    }
  });
});
