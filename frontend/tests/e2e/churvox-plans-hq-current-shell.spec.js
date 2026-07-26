const { test, expect } = require('@playwright/test');

const OWNER = {
  id: 'plans-hq-owner',
  email: 'hello@churvox.com',
  role: 'platform_owner',
  email_verified: true,
  has_app_access: true,
  subscription_status: 'active',
  plan: 'enterprise',
  business_id: 'plans-hq-business',
  business_name: 'Churvox',
};

async function installOwnerApi(page) {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'plans-hq-owner-token');
  });

  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;

    if (path === '/api/auth/me') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, user: OWNER, ...OWNER }),
      });
      return;
    }

    if (path === '/api/billing/subscription-status') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { plan: 'enterprise', stripe_customer_id: 'cus_current_shell' } }),
      });
      return;
    }

    if (path === '/api/plan/usage') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            plan_label: 'Command',
            usage_verified: true,
            limit_source: 'locked_paid_launch_limits_current_shell',
            used: { active_team_members: 2, clients: 8, jobs_this_month: 14, ai_actions: 6 },
            limits: { active_team_members: 50, clients: 10000, jobs_per_month: 1500, ai_actions: 2000 },
          },
        }),
      });
      return;
    }

    if (path === '/api/billing/addons') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { active: [] } }) });
      return;
    }

    if (path.startsWith('/api/admin/owner') || path.startsWith('/api/platform/hq')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { count: 3, message: 'Live nested HQ source', lists: { all_users: [], businesses: [], events: [] } } }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [], items: [], records: [] }),
    });
  });
}

test.beforeEach(async ({ page }) => {
  await installOwnerApi(page);
});

test('Plans uses the current owner shell and explains every tier clearly', async ({ page }) => {
  await page.goto('/plans', { waitUntil: 'domcontentloaded' });

  await expect(page.locator('main[data-churvox-layout="fresh-studio"]')).toBeVisible();
  const nav = page.getByRole('navigation', { name: /Main Churvox navigation/i });
  await expect(nav).toBeVisible();
  await expect(nav.getByRole('button', { name: /^Jobs$/i })).toBeVisible();
  await expect(nav.getByRole('button', { name: /^Work$/i })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /Choose the plan that matches how your business actually runs/i })).toBeVisible();
  const plans = page.locator('.cvReleasePlansRoot');
  await expect(plans).toBeVisible();
  await expect(plans.locator('.cvReleaseCurrentPlan')).toBeVisible();
  await expect(page.locator('.cvPlansPage')).toHaveCount(0);

  const start = plans.locator('[data-plan-card][data-stripe-plan="Start"]');
  await expect(start).toHaveCount(1);
  await expect(start).toContainText('Jobs with recurring work inside Jobs');
  await expect(start).toContainText('Team workspace, worker app and messages');
  await expect(start).toContainText('50 jobs/month');

  const crew = plans.locator('[data-plan-card][data-stripe-plan="Crew"]');
  await expect(crew).toHaveCount(1);
  await expect(crew).toContainText('Time capture with owner approval');
  await expect(crew).toContainText('Proof packs and Worker Proof Coach');
  await expect(crew).toContainText('5 active team members');

  const operator = plans.locator('[data-plan-card][data-stripe-plan="Operator"]');
  await expect(operator).toHaveCount(1);
  await expect(operator).toContainText('Churvox does the admin. You approve.');
  await expect(operator).toContainText('Payroll review and timesheets workspace');
  await expect(operator).toContainText('Accounting Sync — available as a $39 add-on');
  await expect(operator).toContainText('15 active team members');

  const command = plans.locator('[data-plan-card][data-stripe-plan="Command"]');
  await expect(command).toHaveCount(1);
  await expect(command).toContainText('Payroll review and timesheets workspace');
  await expect(command).toContainText('Accounting Sync included');
  await expect(command).toContainText('No Churvox feature is tier-locked');
  await expect(command).toContainText('50 active team members');
  const price = command.locator('.cvReleasePlanPrice');
  await expect(price).toBeVisible();
  await expect(price).toContainText('$299/month + GST');
  const priceVisibility = await price.evaluate((node) => {
    const style = getComputedStyle(node);
    const rect = node.getBoundingClientRect();
    return { opacity: Number(style.opacity), width: rect.width, height: rect.height, color: style.color };
  });
  expect(priceVisibility.opacity).toBeGreaterThanOrEqual(0.95);
  expect(priceVisibility.width).toBeGreaterThan(120);
  expect(priceVisibility.height).toBeGreaterThan(25);
  expect(priceVisibility.color).not.toBe('rgba(0, 0, 0, 0)');
});

test('HQ shows real source results and useful navigation', async ({ page }) => {
  await page.goto('/admin', { waitUntil: 'domcontentloaded' });

  await expect(page.locator('#CHURVOX_HQ_SYSTEM')).toBeVisible();
  await expect(page.getByText('Connected to live HQ controls', { exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: /HQ platform tools/i }).getByRole('link', { name: /Owner app/i })).toBeVisible();
  await expect(page.getByRole('navigation', { name: /HQ platform tools/i }).getByRole('link', { name: /^Usage$/i })).toBeVisible();
  await expect(page.getByRole('navigation', { name: /HQ platform tools/i }).getByRole('link', { name: /Platform tools/i })).toBeVisible();
  await expect(page.locator('.cvMyHqSourceGrid article')).toHaveCount(7);
  await expect(page.getByText('7 connected sources', { exact: false })).toBeVisible();
  await expect(page.getByText('Live nested HQ source').first()).toBeVisible();
});
