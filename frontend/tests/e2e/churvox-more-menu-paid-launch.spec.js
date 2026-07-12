const { test, expect } = require('@playwright/test');

function json(body, status = 200) {
  return { status, contentType: 'application/json', body: JSON.stringify(body) };
}

async function bootOwner(page, plan = 'command', hash = '', cachedPlan = plan) {
  const aliases = { start: 'solo', crew: 'team', operator: 'pro', command: 'enterprise' };
  const user = {
    id: `more-${plan}-owner`,
    business_id: `more-${plan}-owner`,
    email: `${plan}@more-menu.test`,
    role: 'owner',
    plan: aliases[plan] || plan,
    current_plan: plan,
    ui_plan: plan,
    subscription_status: 'active',
    stripe_subscription_id: `sub_more_${plan}`,
    has_app_access: true,
    email_verified: true,
  };

  await page.addInitScript(({ selectedPlan }) => {
    window.localStorage.setItem('token', 'more-menu-paid-launch-token');
    window.localStorage.setItem('authToken', 'more-menu-paid-launch-token');
    window.localStorage.setItem('churvox:stable-current-plan:v1', selectedPlan);
    window.localStorage.setItem('churvox:plan-override', selectedPlan);
    window.localStorage.setItem('churvox:addon:accounting_sync', 'true');
    window.localStorage.setItem('churvox:addon:command_growth_pack', '9');
  }, { selectedPlan: cachedPlan });

  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (/\/api\/auth\/(?:me|check|session)$/.test(path)) return route.fulfill(json({ success: true, user, ...user }));
    if (path === '/api/platform/visit') return route.fulfill(json({ ok: true }));
    if (path === '/api/healthz') return route.fulfill(json({ ok: true }));
    if (path.includes('/api/command/')) return route.fulfill(json({ success: true, source: 'backend-command-clear', decisions: [], audit: [], items: [] }));
    return route.fulfill(json({ success: true, items: [], rows: [], data: [], decisions: [], audit: [], counts: {} }));
  });

  await page.goto(`/dashboard${hash}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.cvOwnerReady')).toBeVisible();
  return user;
}

function ownerNav(page) {
  return page.locator('.cvOwnerNavigation');
}

function moreTrigger(page) {
  return ownerNav(page).getByRole('button', { name: 'More', exact: true });
}

test.describe('Paid-launch dashboard More navigation', () => {
  test('Start shows only included owner pages and More tools', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await bootOwner(page, 'start');

    const nav = ownerNav(page);
    await expect(nav).toHaveAttribute('data-plan', 'start');
    await expect(nav.getByRole('button', { name: 'Today', exact: true })).toBeVisible();
    await expect(nav.getByRole('button', { name: 'Jobs', exact: true })).toBeVisible();
    await expect(nav.getByRole('button', { name: 'Clients', exact: true })).toBeVisible();
    await expect(nav.getByRole('button', { name: 'Quotes', exact: true })).toBeVisible();
    await expect(nav.getByRole('button', { name: 'Invoices', exact: true })).toBeVisible();
    await expect(nav.getByRole('button', { name: 'Command', exact: true })).toHaveCount(0);
    await expect(nav.getByRole('button', { name: 'Workers', exact: true })).toHaveCount(0);

    const trigger = moreTrigger(page);
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await trigger.click();
    const menu = page.getByRole('menu', { name: 'More tools for start' });
    await expect(menu).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(menu.getByRole('menuitem', { name: 'Schedule' })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'How Churvox works' })).toBeVisible();

    for (const locked of ['Messages', 'Payroll', 'Xero', 'Activity']) {
      await expect(menu.getByRole('menuitem', { name: locked })).toHaveCount(0);
    }
  });

  test('authenticated Start beats cached Command, Xero add-on and Growth Pack values', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await bootOwner(page, 'start', '', 'command');

    const nav = ownerNav(page);
    await expect(nav).toHaveAttribute('data-plan', 'start');
    await expect(nav.getByRole('button', { name: 'Command', exact: true })).toHaveCount(0);
    await expect(nav.getByRole('button', { name: 'Workers', exact: true })).toHaveCount(0);

    await moreTrigger(page).click();
    const menu = page.getByRole('menu', { name: 'More tools for start' });
    await expect(menu).toBeVisible();
    for (const locked of ['Messages', 'Payroll', 'Xero', 'Activity']) {
      await expect(menu.getByRole('menuitem', { name: locked })).toHaveCount(0);
    }
  });

  test('Crew More includes Messages but not Operator or Command tools', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await bootOwner(page, 'crew');
    await moreTrigger(page).click();
    const menu = page.getByRole('menu', { name: 'More tools for crew' });
    await expect(menu.getByRole('menuitem', { name: 'Schedule' })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'Messages' })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'Payroll' })).toHaveCount(0);
    await expect(menu.getByRole('menuitem', { name: 'Activity' })).toHaveCount(0);
    await expect(menu.getByRole('menuitem', { name: 'Xero' })).toHaveCount(0);
  });

  test('Operator More includes Payroll and Activity but not Xero without the add-on', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await bootOwner(page, 'operator');
    await moreTrigger(page).click();
    const menu = page.getByRole('menu', { name: 'More tools for operator' });
    await expect(menu.getByRole('menuitem', { name: 'Messages' })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'Payroll' })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'Activity' })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'Xero' })).toHaveCount(0);
  });

  test('desktop More supports keyboard navigation, Escape and focus return', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await bootOwner(page, 'command');

    const trigger = moreTrigger(page);
    await trigger.focus();
    await page.keyboard.press('ArrowDown');
    const menu = page.getByRole('menu', { name: 'More tools for command' });
    await expect(menu).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(menu.getByRole('menuitem').first()).toBeFocused();

    await page.keyboard.press('ArrowDown');
    await expect(menu.getByRole('menuitem').nth(1)).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0);
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toBeFocused();
  });

  test('mobile More has a backdrop and reliable close controls', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await bootOwner(page, 'command');

    const trigger = moreTrigger(page);
    await trigger.click();
    const menu = page.getByRole('menu', { name: 'More tools for command' });
    await expect(menu).toBeVisible();
    await expect(page.locator('.cvOwnerMoreBackdrop')).toBeVisible();
    await expect(menu.getByRole('button', { name: 'Close More menu' })).toBeVisible();

    await page.locator('.cvOwnerMoreBackdrop').click({ position: { x: 5, y: 5 } });
    await expect(menu).toHaveCount(0);
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await trigger.click();
    await expect(page.getByRole('menu', { name: 'More tools for command' })).toBeVisible();
    await page.getByRole('menu', { name: 'More tools for command' }).getByRole('button', { name: 'Close More menu' }).click();
    await expect(page.getByRole('menu', { name: 'More tools for command' })).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test('typing a locked hash sends Start to Plans instead of rendering Payroll', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await bootOwner(page, 'start', '#payroll');

    await expect.poll(() => page.url()).toMatch(/\/dashboard(?:\?[^#]*)?#plans$/);
    await expect(page.locator('.cvOwnerReady')).toHaveAttribute('data-screen', 'plans');
    await expect(page.getByRole('alert')).toContainText(/Operator required|Payroll opens on Operator/i);
    await expect(page.getByText(/Payroll review only/i)).toHaveCount(0);
  });
});
