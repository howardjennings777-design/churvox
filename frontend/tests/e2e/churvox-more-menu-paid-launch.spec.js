const { test, expect } = require('@playwright/test');

function json(body, status = 200) {
  return { status, contentType: 'application/json', body: JSON.stringify(body) };
}

async function bootOwner(page, plan = 'command') {
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
  }, { selectedPlan: plan });

  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (/\/api\/auth\/(?:me|check|session)$/.test(path)) return route.fulfill(json({ success: true, user, ...user }));
    if (path === '/api/platform/visit') return route.fulfill(json({ ok: true }));
    if (path === '/api/healthz') return route.fulfill(json({ ok: true }));
    return route.fulfill(json({ success: true, items: [], rows: [], data: [], counts: {} }));
  });

  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.freshApp')).toBeVisible();
  return user;
}

async function detailsOpen(details) {
  return details.evaluate((node) => node.open === true);
}

test.describe('Paid-launch More navigation', () => {
  test('desktop More tools stays under user control across app re-renders', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await bootOwner(page, 'command');

    const details = page.locator('.freshNavMore');
    const summary = details.locator(':scope > summary');
    await expect(details).toBeVisible();
    await expect(summary).toHaveAttribute('aria-haspopup', 'true');
    await expect(summary).toHaveAttribute('aria-expanded', 'false');

    await summary.click();
    await expect.poll(() => detailsOpen(details)).toBe(true);
    await expect(summary).toHaveAttribute('aria-expanded', 'true');

    await page.evaluate(() => {
      window.dispatchEvent(new Event('churvox:plan-updated'));
      window.dispatchEvent(new Event('churvox:fresh-data-updated'));
    });
    await page.waitForTimeout(200);
    await expect.poll(() => detailsOpen(details)).toBe(true);

    await summary.click();
    await expect.poll(() => detailsOpen(details)).toBe(false);
    await expect(summary).toHaveAttribute('aria-expanded', 'false');
  });

  test('desktop More tools stays open when its current page is active', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await bootOwner(page, 'command');

    const details = page.locator('.freshNavMore');
    const payroll = details.getByRole('button', { name: 'Payroll' });
    const summary = details.locator(':scope > summary');
    await summary.click();
    await payroll.click();

    await expect(payroll).toHaveClass(/active/);
    await expect.poll(() => detailsOpen(details)).toBe(true);
    await expect(summary).toHaveAttribute('aria-expanded', 'true');
  });

  test('mobile More opens as an accessible modal and closes by Escape or backdrop', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await bootOwner(page, 'command');

    const more = page.locator('.freshMobileNav').getByRole('button', { name: 'More' });
    await expect(more).toBeVisible();
    await expect(more).toHaveAttribute('aria-expanded', 'false');

    await more.click();
    const dialog = page.getByRole('dialog', { name: 'More Churvox tools' });
    await expect(dialog).toBeVisible();
    await expect(more).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('button', { name: 'Close More tools' })).toBeVisible();
    await expect(page.locator('.freshMobileMoreBackdrop')).toBeVisible();
    await expect(page.locator('body')).toHaveAttribute('data-churvox-more-open', 'true');

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(page.locator('.freshMobileMoreBackdrop')).toHaveCount(0);
    await expect(more).toHaveAttribute('aria-expanded', 'false');

    await more.click();
    await expect(page.getByRole('dialog', { name: 'More Churvox tools' })).toBeVisible();
    await page.locator('.freshMobileMoreBackdrop').click({ position: { x: 5, y: 5 } });
    await expect(page.getByRole('dialog', { name: 'More Churvox tools' })).toHaveCount(0);
    await expect(more).toHaveAttribute('aria-expanded', 'false');
  });

  test('Start plan More menu does not expose higher-tier tools', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await bootOwner(page, 'start');

    const more = page.locator('.freshMobileNav').getByRole('button', { name: 'More' });
    await more.click();
    const dialog = page.getByRole('dialog', { name: 'More Churvox tools' });
    await expect(dialog).toBeVisible();

    await expect(dialog.getByRole('button', { name: 'Clients' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Quotes' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Settings' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Plans' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Help' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Setup Coach' })).toBeVisible();

    for (const restricted of ['Command', 'Messages', 'Team', 'Worker View', 'Time Approval', 'Proof Packs', 'Payroll', 'Control Score', 'Imports', 'Exports']) {
      await expect(dialog.getByRole('button', { name: restricted })).toHaveCount(0);
    }
  });
});
