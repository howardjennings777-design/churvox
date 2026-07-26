const { test, expect } = require('@playwright/test');

function json(body, status = 200) {
  return { status, contentType: 'application/json', body: JSON.stringify(body) };
}

async function bootOwner(page, plan = 'command', hash = '', cachedPlan = plan) {
  const aliases = { start: 'solo', crew: 'team', operator: 'pro', command: 'enterprise' };
  const user = {
    id: `control-${plan}-owner`,
    business_id: `control-${plan}-owner`,
    email: `${plan}@control-board.test`,
    role: 'owner',
    plan: aliases[plan] || plan,
    current_plan: plan,
    ui_plan: plan,
    subscription_status: 'active',
    stripe_subscription_id: `sub_control_${plan}`,
    has_app_access: true,
    email_verified: true,
  };

  await page.addInitScript(({ selectedPlan, snapshotUser }) => {
    window.localStorage.setItem('token', 'control-board-paid-launch-token');
    window.localStorage.setItem('authToken', 'control-board-paid-launch-token');
    window.localStorage.setItem('churvox:stable-current-plan:v1', selectedPlan);
    window.localStorage.setItem('churvox:plan-override', selectedPlan);
    window.localStorage.setItem('churvox:addon:accounting_sync', 'true');
    window.localStorage.setItem('churvox:addon:command_growth_pack', '9');
    window.localStorage.setItem('churvox_auth_session_snapshot_v1', JSON.stringify({ at: Date.now(), token: 'control-board-paid-launch-token', user: snapshotUser }));
  }, { selectedPlan: cachedPlan, snapshotUser: user });

  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (/\/api\/auth\/(?:me|check|session)$/.test(path)) return route.fulfill(json({ success: true, user, ...user }));
    if (path === '/api/platform/visit') return route.fulfill(json({ ok: true }));
    if (path === '/api/healthz') return route.fulfill(json({ ok: true }));
    if (path.includes('/api/command/')) return route.fulfill(json({ success: true, source: 'backend-command-clear', decisions: [], audit: [], items: [] }));
    return route.fulfill(json({ success: true, items: [], rows: [], data: [], decisions: [], audit: [], counts: {} }));
  });

  await page.goto(`/dashboard${hash}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.cvOwnerReady')).toBeVisible({ timeout: 10000 });
  return user;
}

function ownerNav(page) {
  return page.locator('.cvOwnerNavigation');
}

async function openArea(page, name) {
  await ownerNav(page).getByRole('button', { name, exact: true }).click();
}

test.describe('Paid-launch Control Board navigation', () => {
  test('Start exposes only the four included daily areas', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await bootOwner(page, 'start');

    const nav = ownerNav(page);
    await expect(nav).toHaveAttribute('data-plan', 'start');
    for (const included of ['Today', 'Jobs', 'Clients', 'Money']) {
      await expect(nav.getByRole('button', { name: included, exact: true })).toBeVisible();
    }
    for (const locked of ['Team', 'Messages', 'Command']) {
      await expect(nav.getByRole('button', { name: locked, exact: true })).toHaveCount(0);
    }

    await openArea(page, 'Jobs');
    const workTabs = page.getByRole('navigation', { name: 'work navigation' });
    await expect(workTabs).toBeVisible();
    for (const tab of ['Jobs', 'Schedule', 'Recurring']) {
      await expect(workTabs.getByRole('button', { name: tab, exact: true })).toBeVisible();
    }
  });

  test('authenticated Start beats cached Command and add-on values', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await bootOwner(page, 'start', '', 'command');

    const nav = ownerNav(page);
    await expect(nav).toHaveAttribute('data-plan', 'start');
    await expect(nav.getByRole('button', { name: 'Team', exact: true })).toHaveCount(0);
    await expect(nav.getByRole('button', { name: 'Messages', exact: true })).toHaveCount(0);
    await expect(nav.getByRole('button', { name: 'Command', exact: true })).toHaveCount(0);
  });

  test('Crew adds Team and Messages without owner Command', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await bootOwner(page, 'crew');

    const nav = ownerNav(page);
    await expect(nav.getByRole('button', { name: 'Team', exact: true })).toBeVisible();
    await expect(nav.getByRole('button', { name: 'Messages', exact: true })).toBeVisible();
    await expect(nav.getByRole('button', { name: 'Command', exact: true })).toHaveCount(0);

    await openArea(page, 'Team');
    const teamTabs = page.getByRole('navigation', { name: 'team navigation' });
    for (const tab of ['Team', 'Team status', 'Access']) {
      await expect(teamTabs.getByRole('button', { name: tab, exact: true })).toBeVisible();
    }
    await expect(teamTabs.getByRole('button', { name: 'Timesheets', exact: true })).toBeHidden();
  });

  test('Operator adds Command but keeps Command-only payroll hidden', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await bootOwner(page, 'operator');

    const nav = ownerNav(page);
    for (const included of ['Team', 'Messages', 'Command']) {
      await expect(nav.getByRole('button', { name: included, exact: true })).toBeVisible();
    }

    await openArea(page, 'Team');
    await expect(page.getByRole('navigation', { name: 'team navigation' }).getByRole('button', { name: 'Timesheets', exact: true })).toBeHidden();
    await openArea(page, 'Money');
    await expect(page.getByRole('navigation', { name: 'money navigation' }).getByRole('button', { name: 'Accounting', exact: true })).toHaveCount(0);
  });

  test('Command exposes payroll review and guarded accounting', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await bootOwner(page, 'command');

    await openArea(page, 'Team');
    await expect(page.getByRole('navigation', { name: 'team navigation' }).getByRole('button', { name: 'Timesheets', exact: true })).toBeVisible();
    await openArea(page, 'Money');
    await expect(page.getByRole('navigation', { name: 'money navigation' }).getByRole('button', { name: 'Accounting', exact: true })).toBeVisible();
  });

  test('mobile keeps daily actions simple and More closes reliably', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await bootOwner(page, 'command');

    const mobile = page.locator('.cv7MobileNav');
    for (const item of ['Today', 'Jobs', 'Command', 'Messages', 'More']) {
      await expect(mobile.getByRole('button', { name: item, exact: true })).toBeVisible();
    }

    await mobile.getByRole('button', { name: 'More', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Settings', exact: true })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Plans', exact: true })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Help', exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(dialog).toHaveCount(0);
  });

  test('typing a locked hash sends Start to Plans', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await bootOwner(page, 'start', '#timesheets');

    await expect.poll(() => page.url()).toMatch(/\/dashboard(?:\?[^#]*)?#plans$/);
    await expect(page.locator('.cvOwnerReady')).toHaveAttribute('data-screen', 'plans');
    await expect(page.getByRole('heading', { name: 'Churvox does the admin. You approve.' })).toBeVisible();
  });
});
