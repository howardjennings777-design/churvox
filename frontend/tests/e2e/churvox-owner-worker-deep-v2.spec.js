const { test, expect } = require('@playwright/test');

const OWNER_EMAIL = process.env.CHURVOX_OWNER_EMAIL || '';
const OWNER_PASSWORD = process.env.CHURVOX_OWNER_PASSWORD || '';
const WORKER_EMAIL = process.env.CHURVOX_WORKER_EMAIL || '';
const WORKER_PASSWORD = process.env.CHURVOX_WORKER_PASSWORD || '';

async function dismissModals(page) {
  for (let i = 0; i < 4; i += 1) {
    const overlay = page.locator('.v3-modal-backdrop, .v4-modal-backdrop').first();
    if (!(await overlay.isVisible().catch(() => false))) return;
    const close = page.locator('.v3-icon-button, .v4-modal-head button, button[aria-label="Close"]').first();
    if (await close.isVisible().catch(() => false)) await close.click({ force: true }).catch(() => {});
    else await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(250);
  }
}

async function login(page, email, password) {
  await page.goto('/login');
  await expect(page.locator('input').first()).toBeVisible({ timeout: 15000 });
  await page.locator('input').nth(0).fill(email);
  await page.locator('input').nth(1).fill(password);
  await page.getByRole('button', { name: /log in|login|sign in/i }).first().click();
  await page.waitForLoadState('networkidle').catch(() => {});
  await dismissModals(page);
}

async function clickAny(page, patterns, label, required = true) {
  await dismissModals(page);
  for (const pattern of patterns) {
    const target = page.getByRole('button', { name: pattern }).or(page.getByRole('link', { name: pattern })).first();
    if (await target.isVisible().catch(() => false)) {
      await target.click({ timeout: 12000 });
      await page.waitForTimeout(350);
      return true;
    }
  }
  if (required) throw new Error(`Missing control: ${label}`);
  test.info().annotations.push({ type: 'missing-control', description: label });
  return false;
}

async function fillAny(page, names, value) {
  await dismissModals(page);
  for (const name of names) {
    const byLabel = page.getByLabel(name, { exact: false }).first();
    if (await byLabel.isVisible().catch(() => false)) { await byLabel.fill(value); return true; }
    const byPlaceholder = page.getByPlaceholder(name, { exact: false }).first();
    if (await byPlaceholder.isVisible().catch(() => false)) { await byPlaceholder.fill(value); return true; }
  }
  return false;
}

async function assertNoCrash(page) {
  await expect(page.locator('body')).not.toContainText(/application error|cannot read properties|undefined is not|failed to compile/i);
}

test.describe('Churvox deep owner and worker audit V2', () => {
  test('owner V4 navigation, CSV buttons, V3 workspaces and trial block', async ({ page }) => {
    test.skip(!OWNER_EMAIL || !OWNER_PASSWORD, 'Set owner env vars to run owner audit.');
    await login(page, OWNER_EMAIL, OWNER_PASSWORD);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle').catch(() => {});
    await dismissModals(page);
    await expect(page.getByText(/Churvox AI Trade OS|Smart Hub|AI trade command/i).first()).toBeVisible({ timeout: 20000 });

    for (const name of ['Smart Hub','AI Operator','Decisions','Jobs','Dispatch','Clients','Quotes','Invoices','Team','Payroll','Auto Rules','Reports','Messages','Sync','Settings']) {
      await clickAny(page, [new RegExp(`^${name}$`, 'i'), new RegExp(name, 'i')], `owner nav ${name}`);
      await dismissModals(page);
      await assertNoCrash(page);
    }

    await clickAny(page, [/Clients/i], 'clients nav');
    await expect(page.getByRole('button', { name: /Import clients CSV/i })).toBeVisible({ timeout: 10000 });
    await clickAny(page, [/Team/i], 'team nav');
    await expect(page.getByRole('button', { name: /Import workers CSV/i })).toBeVisible({ timeout: 10000 });

    for (const path of ['/v3/clients','/v3/jobs','/v3/quotes','/v3/invoices','/v3/team']) {
      await page.goto(path);
      await page.waitForLoadState('networkidle').catch(() => {});
      await dismissModals(page);
      await assertNoCrash(page);
      await expect(page.locator('body')).toContainText(new RegExp(path.split('/').pop(), 'i'), { timeout: 15000 });
    }
  });

  test('owner add client, job, quote, invoice and worker controls open without crash', async ({ page }) => {
    test.skip(!OWNER_EMAIL || !OWNER_PASSWORD, 'Set owner env vars to run owner create audit.');
    await login(page, OWNER_EMAIL, OWNER_PASSWORD);
    const checks = [
      ['/v3/clients', [/new client/i, /add client/i, /create client/i], /client/i],
      ['/v3/jobs', [/new job/i, /add job/i, /create job/i], /job/i],
      ['/v3/quotes', [/new quote/i, /add quote/i, /create quote/i], /quote/i],
      ['/v3/invoices', [/new invoice/i, /add invoice/i, /create invoice/i], /invoice/i],
      ['/v3/team', [/invite/i, /add worker/i, /import workers csv/i], /team|crew|worker/i],
    ];
    for (const [path, buttons, text] of checks) {
      await page.goto(path);
      await page.waitForLoadState('networkidle').catch(() => {});
      await dismissModals(page);
      await expect(page.getByText(text).first()).toBeVisible({ timeout: 15000 });
      await clickAny(page, buttons, `${path} create/import button`, false);
      await assertNoCrash(page);
      await dismissModals(page);
    }
  });

  test('owner can attempt add client and add job with safe data', async ({ page }) => {
    test.skip(!OWNER_EMAIL || !OWNER_PASSWORD, 'Set owner env vars to run create data audit.');
    await login(page, OWNER_EMAIL, OWNER_PASSWORD);
    const suffix = Date.now();
    const clientName = `Playwright Test Client ${suffix}`;

    await page.goto('/v3/clients');
    await page.waitForLoadState('networkidle').catch(() => {});
    await dismissModals(page);
    if (await clickAny(page, [/new client/i, /add client/i, /create client/i], 'add client', false)) {
      await fillAny(page, [/name/i, /client/i], clientName);
      await fillAny(page, [/email/i], `playwright-${suffix}@example.com`);
      await fillAny(page, [/phone/i, /mobile/i], '0210000000');
      await fillAny(page, [/address/i], '1 Test Street, Wellington');
      await clickAny(page, [/save/i, /create/i, /add client/i], 'save client', false);
      await assertNoCrash(page);
    }

    await page.goto('/v3/jobs');
    await page.waitForLoadState('networkidle').catch(() => {});
    await dismissModals(page);
    if (await clickAny(page, [/new job/i, /add job/i, /create job/i], 'add job', false)) {
      await fillAny(page, [/title/i, /job/i], `Playwright Test Job ${suffix}`);
      await fillAny(page, [/customer/i, /client/i], clientName);
      await fillAny(page, [/address/i], '1 Test Street, Wellington');
      await fillAny(page, [/notes/i, /description/i, /instructions/i], 'Playwright deep audit test job. Safe to delete.');
      await clickAny(page, [/save/i, /create/i, /add job/i], 'save job', false);
      await assertNoCrash(page);
    }
  });

  test('worker field deck is worker-safe and exposes workflow controls', async ({ page }) => {
    test.skip(!WORKER_EMAIL || !WORKER_PASSWORD, 'Set worker env vars to run real worker audit.');
    await login(page, WORKER_EMAIL, WORKER_PASSWORD);
    await page.goto('/worker/jobs');
    await page.waitForLoadState('networkidle').catch(() => {});
    await dismissModals(page);
    await expect(page.getByText(/Today’s field deck|Churvox Worker|Field Deck/i).first()).toBeVisible({ timeout: 20000 });
    await expect(page.locator('body')).not.toContainText(/subtotal|hourly rate|owner billing|invoice value/i);
    await clickAny(page, [/Active/i], 'worker active tab', false);
    await clickAny(page, [/Needs proof/i], 'worker proof tab', false);
    await clickAny(page, [/Completed/i], 'worker completed tab', false);
    await clickAny(page, [/Refresh/i], 'worker refresh', false);
    if (await clickAny(page, [/Open job/i, /assigned|acknowledged|in progress|paused/i], 'open worker job', false)) {
      await expect(page.getByText(/Worker field card|Proof photos|Worker notes|Office help/i).first()).toBeVisible({ timeout: 10000 });
      await expect(page.locator('input[type="file"]').first()).toHaveCount(1);
    }
  });

  test('mock expired 14-day trial owner is blocked to plans', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('token', 'expired-trial-test-token'));
    await page.route('**/api/auth/me', async (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ email: 'expired-owner@example.com', role: 'owner', plan: 'team', plan_status: 'trialing', subscription_status: 'trialing', trial_started_at: '2020-01-01T00:00:00.000Z' }),
    }));
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page).toHaveURL(/\/v3\/plans|\/plans/);
  });
});
