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

function json(route, body) {
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
}

async function installOwnerApi(page) {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'plans-hq-owner-token');
  });

  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;

    if (path === '/api/auth/me') {
      await json(route, { success: true, user: OWNER, ...OWNER });
      return;
    }

    if (path === '/api/billing/subscription-status') {
      await json(route, { success: true, data: { plan: 'enterprise', stripe_customer_id: 'cus_current_shell' } });
      return;
    }

    if (path === '/api/plan/usage') {
      await json(route, {
        success: true,
        data: {
          plan_label: 'Command',
          usage_verified: true,
          limit_source: 'locked_paid_launch_limits_current_shell',
          used: { active_team_members: 2, clients: 8, jobs_this_month: 14, ai_actions: 6 },
          limits: { active_team_members: 50, clients: 10000, jobs_per_month: 1500, ai_actions: 2000 },
        },
      });
      return;
    }

    if (path === '/api/billing/addons') {
      await json(route, { success: true, data: { active: [] } });
      return;
    }

    if (path === '/api/admin/owner/paid-launch-report') {
      await json(route, {
        success: true,
        ready_to_take_payments: true,
        counts: {
          users_total: 24,
          businesses_total: 8,
          verified_paid_users: 3,
          verified_trial_users: 2,
          tester_users: 5,
          billing_needs_verification: 1,
          internal_users_excluded: 2,
        },
        billing: {
          actual_mrr_nzd: 338,
          estimated_mrr_nzd: 447,
          verified_paid_users: [],
          verified_trial_users: [],
          tester_users: [],
          needs_verification: [],
          stripe: { available: true },
        },
        collections: { connected: true, counts: { users: 24, jobs: 42, clients: 18 }, latest: {} },
        launch_checks: [{ key: 'database', label: 'Database', status: 'pass', detail: 'Live' }],
      });
      return;
    }

    if (path === '/api/admin/owner-overview') {
      await json(route, {
        success: true,
        data: {
          metrics: {
            total_users: 24,
            total_businesses: 8,
            active_today: 6,
            total_jobs: 42,
            total_invoices: 19,
            total_clients: 18,
          },
          lists: { all_users: [], businesses: [], events: [], jobs: [], invoices: [], clients: [] },
        },
      });
      return;
    }

    if (path === '/api/admin/owner/growth-report') {
      await json(route, {
        success: true,
        counts: {
          unique_total: 310,
          new_unique_today: 12,
          signups_total: 7,
          accepted_testers: 4,
          pageviews_total: 1280,
        },
        visitors: [],
      });
      return;
    }

    if (path === '/api/admin/owner/connection' || path === '/api/platform/hq/connection' || path === '/api/platform/hq') {
      await json(route, {
        success: true,
        connected: true,
        database_connected: true,
        collections_seen: Array.from({ length: 16 }, (_, index) => `collection_${index + 1}`),
        counts: { users: 24, jobs: 42, clients: 18 },
        message: 'HQ is connected to the owner backend and database.',
      });
      return;
    }

    if (path === '/api/admin/owner/plan-report') {
      await json(route, {
        success: true,
        paid_count: 3,
        trial_count: 2,
        free_tester_count: 5,
        no_plan_count: 4,
        monthly_revenue_estimate: 447,
        paid_users: [],
        trial_users: [],
        free_testers: [],
        no_plan_users: [],
      });
      return;
    }

    if (path === '/api/admin/owner/control-log') {
      await json(route, {
        success: true,
        count: 9,
        items: [{ action: 'tester_intake', created_at: new Date().toISOString() }],
        testers: [{ email: 'tester@business.co.nz', status: 'accepted' }],
      });
      return;
    }

    if (path === '/api/admin/owner/testers') {
      await json(route, {
        success: true,
        counts: { total: 5, accepted: 4, active: 3, invited_not_accepted: 1, revoked: 0 },
        testers: [],
        accepted_testers: [],
        active_testers: [],
        invited_testers: [],
        revoked_testers: [],
      });
      return;
    }

    if (path === '/api/admin/owner/retention-email-status') {
      await json(route, { success: true, state: { running: false }, templates: [] });
      return;
    }

    await json(route, { success: true, data: [], items: [], records: [] });
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

test('HQ shows useful live platform information before the deeper controls', async ({ page }) => {
  await page.goto('/admin', { waitUntil: 'domcontentloaded' });

  await expect(page.locator('#CHURVOX_HQ_SYSTEM')).toBeVisible();
  await expect(page.getByText('Connected to live HQ controls', { exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: /HQ platform tools/i }).getByRole('link', { name: /Owner app/i })).toBeVisible();
  await expect(page.getByRole('navigation', { name: /HQ platform tools/i }).getByRole('link', { name: /^Usage$/i })).toBeVisible();
  await expect(page.getByRole('navigation', { name: /HQ platform tools/i }).getByRole('link', { name: /Platform tools/i })).toBeVisible();

  const summary = page.locator('.cvMyHqAtAGlance');
  await expect(summary).toBeVisible();
  await expect(summary).toContainText('Live platform picture');
  await expect(summary).toContainText('24');
  await expect(summary).toContainText('8');
  await expect(summary).toContainText('310');
  await expect(summary).toContainText('42');
  await expect(summary).toContainText('3');
  await expect(summary).toContainText('$338.00');
  await expect(summary).toContainText('6 active today');
  await expect(summary).toContainText('7 sign-ups');
  await expect(summary).toContainText('12 new today');
  await expect(summary).toContainText('19 invoices');
  await expect(summary).toContainText('2 verified trials');
  await expect(summary).toContainText('1 need checking');

  const sourceGrid = page.locator('.cvMyHqSourceGrid');
  await expect(sourceGrid.locator('article')).toHaveCount(7);
  await expect(page.getByText('7 connected sources', { exact: false })).toBeVisible();
  await expect(sourceGrid).toContainText('Ready to sell');
  await expect(sourceGrid).toContainText('24 registered users');
  await expect(sourceGrid).toContainText('310 public visitors');
  await expect(sourceGrid).toContainText('Database live');
  await expect(sourceGrid).toContainText('3 paid plans');
  await expect(sourceGrid).toContainText('9 owner actions');
  await expect(sourceGrid).toContainText('5 testers');
});
