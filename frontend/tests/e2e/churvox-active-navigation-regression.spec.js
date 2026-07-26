const { test, expect } = require('@playwright/test');

const OWNER = {
  id: 'active-navigation-owner',
  email: 'hello@churvox.com',
  role: 'platform_owner',
  email_verified: true,
  has_app_access: true,
  subscription_status: 'active',
  plan: 'command',
  business_id: 'active-navigation-business',
  business_name: 'Navigation Test Business',
};

async function installSafeOwnerApi(page) {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'safe-active-navigation-token');
  });

  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/auth/me') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, user: OWNER, ...OWNER }) });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [],
        items: [],
        records: [],
        jobs: [],
        clients: [],
        workers: [],
        team: [],
        invoices: [],
        quotes: [],
        messages: [],
        actions: [],
        limits: { active_team_members: 50, clients: 10000, jobs_per_month: 1500, ai_actions: 2000 },
        used: { active_team_members: 0, clients: 0, jobs_this_month: 0, ai_actions: 0 },
        usage_verified: true,
        limit_source: 'locked_paid_launch_limits_navigation_test',
      }),
    });
  });
}

test.beforeEach(async ({ page }) => {
  await installSafeOwnerApi(page);
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-churvox-layout="fresh-studio"]')).toBeVisible();
});

test('active owner navigation uses Jobs and complete mobile destinations', async ({ page, isMobile }) => {
  if (!isMobile) {
    const nav = page.getByRole('navigation', { name: /Main Churvox navigation/i });
    await expect(nav.getByRole('button', { name: /^Jobs$/i })).toBeVisible();
    await expect(nav.getByRole('button', { name: /^Work$/i })).toHaveCount(0);
    return;
  }

  const dock = page.locator('.cvsMobileDock');
  await expect(dock.getByRole('button', { name: /^Jobs$/i })).toBeVisible();
  await dock.getByRole('button', { name: /^More$/i }).click();
  const more = page.locator('.cvsMobileMore');
  for (const label of ['Clients', 'Money', 'Team', 'Settings', 'Plans', 'Help']) {
    await expect(more.getByRole('button', { name: new RegExp(`^${label}$`, 'i') }).first()).toBeVisible();
  }
});

test('Today has a stable page heading contract', async ({ page, isMobile }) => {
  if (isMobile) {
    await expect(page.getByRole('heading', { level: 1, name: /^Today$/i }).first()).toBeVisible();
    return;
  }
  await expect(page.locator('.cvsContextIdentity [role="heading"][aria-level="1"]')).toContainText(/^Today$/i);
});
