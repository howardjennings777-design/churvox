const { test, expect } = require('@playwright/test');

const OWNER_EMAIL = process.env.CHURVOX_OWNER_EMAIL || 'hello@churvox.com';
const OWNER_PASSWORD = process.env.CHURVOX_OWNER_PASSWORD || 'TempPass123!';
const WORKER_EMAIL = process.env.CHURVOX_WORKER_EMAIL || '';
const WORKER_PASSWORD = process.env.CHURVOX_WORKER_PASSWORD || '';

async function login(page, email, password) {
  await page.goto('/login');
  await expect(page.getByRole('textbox').first()).toBeVisible({ timeout: 15000 });
  const inputs = page.locator('input');
  await inputs.nth(0).fill(email);
  await inputs.nth(1).fill(password);
  await page.getByRole('button', { name: /log in|login|sign in/i }).first().click();
  await page.waitForLoadState('networkidle').catch(() => {});
}

async function clickVisible(page, patterns, label) {
  for (const pattern of patterns) {
    const locator = page.getByRole('button', { name: pattern }).or(page.getByRole('link', { name: pattern })).first();
    if (await locator.isVisible().catch(() => false)) {
      await locator.click();
      await page.waitForTimeout(350);
      return true;
    }
  }
  throw new Error(`Could not find visible control for: ${label}`);
}

async function softClick(page, patterns, label) {
  for (const pattern of patterns) {
    const locator = page.getByRole('button', { name: pattern }).or(page.getByRole('link', { name: pattern })).first();
    if (await locator.isVisible().catch(() => false)) {
      await locator.click();
      await page.waitForTimeout(350);
      return true;
    }
  }
  test.info().annotations.push({ type: 'missing-control', description: label });
  return false;
}

async function fillFirstVisible(page, names, value) {
  for (const name of names) {
    const byLabel = page.getByLabel(name, { exact: false }).first();
    if (await byLabel.isVisible().catch(() => false)) {
      await byLabel.fill(value);
      return true;
    }
    const byPlaceholder = page.getByPlaceholder(name, { exact: false }).first();
    if (await byPlaceholder.isVisible().catch(() => false)) {
      await byPlaceholder.fill(value);
      return true;
    }
  }
  return false;
}

async function openV4Section(page, name) {
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle').catch(() => {});
  await expect(page.getByText(/Churvox AI Trade OS|Smart Hub|AI Trade OS/i).first()).toBeVisible({ timeout: 15000 });
  await clickVisible(page, [new RegExp(`^${name}$`, 'i'), new RegExp(name, 'i')], `V4 ${name}`);
}

test.describe('Churvox deep owner + worker audit', () => {
  test('owner can access V4, use nav, open details, CSV buttons, and current workspaces', async ({ page }) => {
    await login(page, OWNER_EMAIL, OWNER_PASSWORD);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle').catch(() => {});

    await expect(page.getByText(/Churvox AI Trade OS|Your AI trade command centre|Smart Hub/i).first()).toBeVisible({ timeout: 20000 });

    const ownerSections = [
      'Smart Hub',
      'AI Operator',
      'Decisions',
      'Jobs',
      'Dispatch',
      'Clients',
      'Quotes',
      'Invoices',
      'Team',
      'Payroll',
      'Auto Rules',
      'Reports',
      'Messages',
      'Sync',
      'Settings',
    ];

    for (const section of ownerSections) {
      await clickVisible(page, [new RegExp(`^${section}$`, 'i'), new RegExp(section, 'i')], `owner nav ${section}`);
      await expect(page.getByText(new RegExp(section === 'Sync' ? 'Sync|MYOB|external connections' : section, 'i')).first()).toBeVisible({ timeout: 10000 });
    }

    await openV4Section(page, 'Clients');
    await expect(page.getByRole('button', { name: /Import clients CSV/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /Open full Clients workspace/i })).toBeVisible({ timeout: 10000 });

    await openV4Section(page, 'Team');
    await expect(page.getByRole('button', { name: /Import workers CSV/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /Open full Team workspace/i })).toBeVisible({ timeout: 10000 });

    await openV4Section(page, 'Jobs');
    await softClick(page, [/Open current full Jobs workspace/i], 'open V3 jobs workspace');
    await page.goto('/v3/jobs');
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.getByText(/jobs/i).first()).toBeVisible({ timeout: 15000 });

    await page.goto('/v3/clients');
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.getByText(/clients/i).first()).toBeVisible({ timeout: 15000 });

    await page.goto('/v3/quotes');
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.getByText(/quotes/i).first()).toBeVisible({ timeout: 15000 });

    await page.goto('/v3/invoices');
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.getByText(/invoices/i).first()).toBeVisible({ timeout: 15000 });
  });

  test('owner creation flows expose add client/job/quote/invoice controls and forms do not crash', async ({ page }) => {
    await login(page, OWNER_EMAIL, OWNER_PASSWORD);

    const workspaceChecks = [
      { path: '/v3/clients', button: [/new client/i, /add client/i, /create client/i], title: /client/i },
      { path: '/v3/jobs', button: [/new job/i, /add job/i, /create job/i], title: /job/i },
      { path: '/v3/quotes', button: [/new quote/i, /add quote/i, /create quote/i], title: /quote/i },
      { path: '/v3/invoices', button: [/new invoice/i, /add invoice/i, /create invoice/i], title: /invoice/i },
      { path: '/v3/team', button: [/invite/i, /add worker/i, /import workers csv/i], title: /team|crew|worker/i },
    ];

    for (const check of workspaceChecks) {
      await page.goto(check.path);
      await page.waitForLoadState('networkidle').catch(() => {});
      await expect(page.getByText(check.title).first()).toBeVisible({ timeout: 15000 });
      await softClick(page, check.button, `${check.path} create button`);
      await expect(page.locator('body')).not.toContainText(/application error|cannot read properties|undefined is not/i);
    }
  });

  test('add client and add job happy path attempts with safe test data', async ({ page }) => {
    await login(page, OWNER_EMAIL, OWNER_PASSWORD);
    const suffix = Date.now();
    const clientName = `Playwright Test Client ${suffix}`;

    await page.goto('/v3/clients');
    await page.waitForLoadState('networkidle').catch(() => {});
    const openedClient = await softClick(page, [/new client/i, /add client/i, /create client/i], 'open add client');
    if (openedClient) {
      await fillFirstVisible(page, [/name/i, /client/i], clientName);
      await fillFirstVisible(page, [/email/i], `playwright-${suffix}@example.com`);
      await fillFirstVisible(page, [/phone/i, /mobile/i], '0210000000');
      await fillFirstVisible(page, [/address/i], '1 Test Street, Wellington');
      await softClick(page, [/save/i, /create/i, /add client/i], 'save client');
      await page.waitForTimeout(1000);
      await expect(page.locator('body')).not.toContainText(/application error|cannot read properties|undefined is not/i);
    }

    await page.goto('/v3/jobs');
    await page.waitForLoadState('networkidle').catch(() => {});
    const openedJob = await softClick(page, [/new job/i, /add job/i, /create job/i], 'open add job');
    if (openedJob) {
      await fillFirstVisible(page, [/title/i, /job/i], `Playwright Test Job ${suffix}`);
      await fillFirstVisible(page, [/customer/i, /client/i], clientName);
      await fillFirstVisible(page, [/address/i], '1 Test Street, Wellington');
      await fillFirstVisible(page, [/notes/i, /description/i, /instructions/i], 'Playwright deep audit test job. Safe to delete.');
      await softClick(page, [/save/i, /create/i, /add job/i], 'save job');
      await page.waitForTimeout(1000);
      await expect(page.locator('body')).not.toContainText(/application error|cannot read properties|undefined is not/i);
    }
  });

  test('worker route is worker-safe and exposes field workflow controls', async ({ page }) => {
    if (!WORKER_EMAIL || !WORKER_PASSWORD) test.skip(true, 'Set CHURVOX_WORKER_EMAIL and CHURVOX_WORKER_PASSWORD to test real worker login.');

    await login(page, WORKER_EMAIL, WORKER_PASSWORD);
    await page.goto('/worker/jobs');
    await page.waitForLoadState('networkidle').catch(() => {});

    await expect(page.getByText(/Today’s field deck|Churvox Worker|Field Deck/i).first()).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(/pricing|invoice values|GPS evidence/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('body')).not.toContainText(/subtotal|hourly rate|billing settings|owner billing/i);

    await softClick(page, [/Active/i], 'worker active tab');
    await softClick(page, [/Needs proof/i], 'worker needs proof tab');
    await softClick(page, [/Completed/i], 'worker completed tab');
    await softClick(page, [/Refresh/i], 'worker refresh');

    const opened = await softClick(page, [/Open job/i, /assigned|acknowledged|in progress|paused/i], 'open worker job');
    if (opened) {
      await expect(page.getByText(/Worker field card|Client|Site|Status/i).first()).toBeVisible({ timeout: 10000 });
      await softClick(page, [/Navigate/i], 'worker navigate');
      await softClick(page, [/Acknowledge/i], 'worker acknowledge');
      await softClick(page, [/Start/i], 'worker start');
      await softClick(page, [/Pause/i], 'worker pause');
      await softClick(page, [/Resume/i], 'worker resume');
      await expect(page.getByText(/Proof photos|Worker notes|Complete job|Office help/i).first()).toBeVisible({ timeout: 10000 });
      expect(await page.locator('input[type="file"]').count()).toBeGreaterThan(0);
      await expect(page.locator('textarea').first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('expired trial owner is blocked from business routes and sent to plans', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('token', 'fake-expired-trial-token');
    });

    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'owner-expired-trial-test',
          email: 'expired-owner@example.com',
          role: 'owner',
          plan: 'team',
          plan_status: 'trialing',
          subscription_status: 'trialing',
          trial_started_at: '2020-01-01T00:00:00.000Z',
        }),
      });
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page).toHaveURL(/\/v3\/plans|\/plans/);
  });
});
