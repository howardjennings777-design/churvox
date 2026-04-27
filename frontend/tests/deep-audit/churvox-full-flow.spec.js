const { test, expect } = require('@playwright/test');

const OWNER_EMAIL = process.env.CHURVOX_AUDIT_EMAIL || '';
const OWNER_PASSWORD = process.env.CHURVOX_AUDIT_PASSWORD || '';
const APP_OWNER_EMAIL = process.env.CHURVOX_APP_OWNER_EMAIL || 'hello@churvox.com';
const APP_OWNER_PASSWORD = process.env.CHURVOX_APP_OWNER_PASSWORD || OWNER_PASSWORD;

const PUBLIC_ROUTES = [
  '/login',
  '/signup',
  '/forgot-password',
  '/privacy',
  '/terms',
  '/privacy-policy',
  '/terms-of-service',
  '/account-deletion',
];

const OWNER_ROUTES = [
  { path: '/dashboard', name: 'Smart Hub' },
  { path: '/jobs', name: 'Jobs' },
  { path: '/schedule', name: 'Schedule' },
  { path: '/clients', name: 'Clients' },
  { path: '/quotes', name: 'Quotes' },
  { path: '/invoices', name: 'Invoices' },
  { path: '/team', name: 'Team' },
  { path: '/automation', name: 'Automation' },
  { path: '/payroll', name: 'Payroll' },
  { path: '/reports', name: 'Reports' },
  { path: '/integrations', name: 'Document Studio / Integrations' },
  { path: '/settings', name: 'Settings' },
  { path: '/notifications', name: 'Notifications' },
];

const CREATE_ENTRY_POINTS = [
  { from: '/clients', texts: ['Add Client', 'New Client', 'Create Client'] },
  { from: '/jobs', texts: ['New Job', 'Add Job', 'Create Job'] },
  { from: '/quotes', texts: ['New Quote', 'Create Quote'] },
  { from: '/invoices', texts: ['New Invoice', 'Create Invoice'] },
  { from: '/team', texts: ['Invite', 'Add Worker', 'Add Team Member'] },
  { from: '/automation', texts: ['New workflow', 'Build workflow', 'Templates'] },
  { from: '/payroll', texts: ['Create pay run', 'Payroll settings'] },
];

function envLoginReady() {
  return Boolean(OWNER_EMAIL && OWNER_PASSWORD);
}

async function fillByFallback(page, testId, label, value) {
  const byTestId = page.getByTestId(testId);
  if (await byTestId.count()) {
    await byTestId.first().fill(value);
    return;
  }

  const byLabel = page.getByLabel(label, { exact: false });
  if (await byLabel.count()) {
    await byLabel.first().fill(value);
    return;
  }

  const selector = label.toLowerCase().includes('password')
    ? 'input[type="password"]'
    : 'input[type="email"], input[name="email"]';
  await page.locator(selector).first().fill(value);
}

async function clickByFallback(page, testId, names) {
  const byTestId = page.getByTestId(testId);
  if (await byTestId.count()) {
    await byTestId.first().click();
    return true;
  }

  for (const name of names) {
    const candidate = page.getByRole('button', { name: new RegExp(name, 'i') });
    if (await candidate.count()) {
      await candidate.first().click();
      return true;
    }
  }

  return false;
}

async function login(page, email = OWNER_EMAIL, password = OWNER_PASSWORD) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toBeVisible();
  await fillByFallback(page, 'login-email-input', 'email', email);
  await fillByFallback(page, 'login-password-input', 'password', password);
  await clickByFallback(page, 'login-submit-button', ['sign in', 'login']);
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1200);
  await dismissGuideIfPresent(page);
  await assertHealthyPage(page, 'after login');
}

async function dismissGuideIfPresent(page) {
  const guide = page.getByTestId('first-run-guide');
  if (!(await guide.count())) return;

  const doNotShow = page.getByRole('button', { name: /do not show again/i });
  if (await doNotShow.count()) {
    await doNotShow.first().click();
    await expect(guide).toHaveCount(0, { timeout: 6000 }).catch(() => {});
    return;
  }

  const stop = page.getByRole('button', { name: /stop tour|skip|finish/i });
  if (await stop.count()) {
    await stop.first().click();
    await expect(guide).toHaveCount(0, { timeout: 6000 }).catch(() => {});
  }
}

async function assertHealthyPage(page, label) {
  await expect(page.locator('body')).toBeVisible();
  const bodyText = (await page.locator('body').innerText({ timeout: 10_000 })).trim();
  expect(bodyText.length, `${label} should not be blank`).toBeGreaterThan(20);

  const fatalPatterns = [
    /white screen/i,
    /application error/i,
    /cannot read properties/i,
    /is not defined/i,
    /uncaught/i,
    /failed to compile/i,
    /module not found/i,
    /something went wrong/i,
  ];

  for (const pattern of fatalPatterns) {
    expect(bodyText, `${label} should not show ${pattern}`).not.toMatch(pattern);
  }
}

async function openHelpAndCheck(page) {
  const help = page.getByTestId('help-dropdown-button');
  if (!(await help.count())) return;
  await help.first().click();
  const panel = page.getByTestId('help-dropdown-panel');
  await expect(panel).toBeVisible({ timeout: 8000 });

  const panelBox = await panel.boundingBox();
  const viewport = page.viewportSize();
  if (panelBox && viewport) {
    expect(panelBox.x, 'Help panel should stay inside left viewport').toBeGreaterThanOrEqual(0);
    expect(panelBox.x + panelBox.width, 'Help panel should stay inside right viewport').toBeLessThanOrEqual(viewport.width + 1);
  }

  const close = page.getByRole('button', { name: /close help/i });
  if (await close.count()) await close.first().click();
}

async function checkRoute(page, route) {
  await page.goto(route.path, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await dismissGuideIfPresent(page);
  await assertHealthyPage(page, route.name);
  expect(page.url(), `${route.name} should not bounce to login`).not.toContain('/login');
  await openHelpAndCheck(page);
}

test.describe('Churvox full app deep audit', () => {
  test('public pages load without fatal errors', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    for (const route of PUBLIC_ROUTES) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle').catch(() => {});
      await assertHealthyPage(page, `public ${route}`);
    }

    const fatalConsole = consoleErrors.filter((msg) => /failed to compile|module not found|is not defined|cannot read properties/i.test(msg));
    expect(fatalConsole, fatalConsole.join('\n')).toEqual([]);
  });

  test('owner login, main routes, help, and core nav are wired', async ({ page }) => {
    test.skip(!envLoginReady(), 'Set CHURVOX_AUDIT_EMAIL and CHURVOX_AUDIT_PASSWORD to run owner audit.');

    const failedResponses = [];
    const consoleErrors = [];

    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('/api/') && response.status() >= 500) {
        failedResponses.push(`${response.status()} ${url}`);
      }
    });

    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await login(page);

    for (const route of OWNER_ROUTES) {
      await checkRoute(page, route);
    }

    const fatalConsole = consoleErrors.filter((msg) => /failed to compile|module not found|is not defined|cannot read properties/i.test(msg));
    expect(fatalConsole, fatalConsole.join('\n')).toEqual([]);
    expect(failedResponses, failedResponses.join('\n')).toEqual([]);
  });

  test('core create entry buttons are present where expected', async ({ page }) => {
    test.skip(!envLoginReady(), 'Set CHURVOX_AUDIT_EMAIL and CHURVOX_AUDIT_PASSWORD to run create-entry audit.');
    await login(page);

    const missing = [];
    for (const item of CREATE_ENTRY_POINTS) {
      await page.goto(item.from, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle').catch(() => {});
      await dismissGuideIfPresent(page);
      await assertHealthyPage(page, item.from);

      let found = false;
      for (const text of item.texts) {
        const button = page.getByRole('button', { name: new RegExp(text, 'i') });
        const link = page.getByRole('link', { name: new RegExp(text, 'i') });
        if ((await button.count()) > 0 || (await link.count()) > 0) {
          found = true;
          break;
        }
      }
      if (!found) missing.push(`${item.from}: ${item.texts.join(' / ')}`);
    }

    expect(missing, `Missing create/action buttons:\n${missing.join('\n')}`).toEqual([]);
  });

  test('first-run guide can be navigated, stopped, and finished', async ({ page }) => {
    test.skip(!envLoginReady(), 'Set CHURVOX_AUDIT_EMAIL and CHURVOX_AUDIT_PASSWORD to run onboarding audit.');
    await login(page);

    await page.evaluate(() => {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('churvox_first_run_guide_done_')) localStorage.removeItem(key);
      });
      sessionStorage.removeItem('churvox_first_run_guide_paused');
    });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    await expect(page.getByTestId('first-run-guide')).toBeVisible({ timeout: 8000 });

    await expect(page.getByText(/guided setup/i)).toBeVisible();
    await page.getByRole('button', { name: /next popup/i }).click();
    await expect(page.getByText(/add your first client/i)).toBeVisible();
    await page.getByRole('button', { name: /back/i }).click();
    await expect(page.getByText(/welcome to churvox/i)).toBeVisible();
    await page.getByRole('button', { name: /stop tour/i }).click();
    await expect(page.getByTestId('first-run-guide')).toHaveCount(0, { timeout: 8000 });
  });

  test('mobile layout opens more menu and help without overlap', async ({ page }, testInfo) => {
    test.skip(!envLoginReady(), 'Set CHURVOX_AUDIT_EMAIL and CHURVOX_AUDIT_PASSWORD to run mobile audit.');
    test.skip(!testInfo.project.name.toLowerCase().includes('mobile'), 'Mobile-only check.');

    await login(page);
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    await dismissGuideIfPresent(page);
    await assertHealthyPage(page, 'mobile dashboard');

    const more = page.getByTestId('mobile-more-button');
    await expect(more).toBeVisible();
    await more.click();
    await expect(page.getByTestId('mobile-more-menu')).toBeVisible();
    await openHelpAndCheck(page);
  });

  test('app-owner dashboard loads and logout exists', async ({ page }) => {
    test.skip(!APP_OWNER_EMAIL || !APP_OWNER_PASSWORD, 'Set CHURVOX_APP_OWNER_EMAIL and CHURVOX_APP_OWNER_PASSWORD to run app-owner audit.');

    await login(page, APP_OWNER_EMAIL, APP_OWNER_PASSWORD);
    await page.goto('/admin', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    await assertHealthyPage(page, 'app owner dashboard');
    await expect(page.getByText(/owner command centre/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('app-owner-logout')).toBeVisible();
  });
});
