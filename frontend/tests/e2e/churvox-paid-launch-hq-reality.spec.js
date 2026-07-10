const { test, expect } = require('@playwright/test');

const owner = {
  id: 'platform-owner-test',
  business_id: 'platform-owner-test',
  email: 'hello@churvox.com',
  role: 'platform_owner',
  plan: 'enterprise',
  subscription_status: 'active',
  has_app_access: true,
  is_platform_owner: true,
  stripe_customer_id: 'cus_owner_test',
  stripe_subscription_id: 'sub_owner_test',
};

function json(body, status = 200) {
  return { status, contentType: 'application/json', body: JSON.stringify(body) };
}

function launchPayload(overrides = {}) {
  const base = {
    success: true,
    source: 'live_database_and_stripe_v1',
    generated_at: '2026-07-11T01:00:00+00:00',
    owner_only: 'hello@churvox.com',
    ready_to_take_payments: true,
    truth: {
      sample_records_included: false,
      paid_definition: 'active_or_paid_with_stripe_subscription_id',
      trial_definition: 'trialing_with_stripe_subscription_id',
      mrr_source: 'stripe_subscription_api',
      estimate_is_separate: true,
    },
    counts: {
      users_total: 5,
      internal_users_excluded: 2,
      businesses_total: 3,
      businesses_source: 'businesses_collection',
      verified_paid_users: 1,
      verified_trial_users: 1,
      tester_users: 1,
      billing_needs_verification: 1,
      active_today: 2,
      active_30d: 4,
    },
    billing: {
      actual_mrr_nzd: 188,
      estimated_mrr_nzd: 238,
      verified_paid_users: [{
        id: 'paid-1',
        email: 'paid@real.test',
        business_name: 'Real Paid Business',
        plan: 'team',
        subscription_status: 'active',
        stripe_customer_id: 'cus_paid',
        stripe_subscription_id: 'sub_paid',
        last_active: '2026-07-11T00:50:00+00:00',
      }],
      verified_trial_users: [{
        id: 'trial-1',
        email: 'trial@real.test',
        business_name: 'Real Trial Business',
        plan: 'pro',
        subscription_status: 'trialing',
        stripe_customer_id: 'cus_trial',
        stripe_subscription_id: 'sub_trial',
        last_active: '2026-07-10T22:00:00+00:00',
      }],
      tester_users: [{
        id: 'tester-1',
        email: 'tester@real.test',
        business_name: 'Real Tester Business',
        plan: 'pro',
        subscription_status: 'tester_free',
        stripe_customer_id: '',
        stripe_subscription_id: '',
        last_active: '2026-07-10T20:00:00+00:00',
      }],
      needs_verification: [{
        id: 'verify-1',
        email: 'verify@real.test',
        business_name: 'Needs Verification Ltd',
        plan: 'solo',
        subscription_status: 'active',
        stripe_customer_id: 'cus_verify',
        stripe_subscription_id: '',
        last_active: '2026-07-10T19:00:00+00:00',
      }],
      stripe: {
        configured: true,
        available: true,
        source: 'stripe_subscription_api',
        generated_at: '2026-07-11T01:00:00+00:00',
        subscriptions_checked: 2,
        mrr_by_currency: { nzd: 188 },
        active_subscriptions: [{
          subscription_id: 'sub_paid',
          customer_id: 'cus_paid',
          status: 'active',
          mrr_by_currency: { nzd: 188 },
        }],
        errors: [],
      },
    },
    collections: {
      connected: true,
      names: ['users', 'businesses', 'jobs', 'clients', 'quotes', 'invoices', 'stripe_webhook_events'],
      counts: {
        users: 7,
        businesses: 3,
        jobs: 11,
        clients: 8,
        quotes: 4,
        invoices: 6,
        team_members: 2,
        workers: 2,
        platform_visits: 40,
        platform_unique_visitors: 12,
        support_messages: 1,
        stripe_webhook_events: 5,
        lifecycle_emails: 9,
        command_slips: 0,
        command_audit: 3,
      },
      latest: {
        stripe_webhook: { created_at: '2026-07-11T00:40:00+00:00', event: 'invoice.paid' },
        support_message: { created_at: '2026-07-10T21:00:00+00:00' },
        lifecycle_email: { created_at: '2026-07-10T20:00:00+00:00' },
      },
    },
    launch_checks: [
      { key: 'database', label: 'Database', status: 'pass', detail: '7 collections visible' },
      { key: 'owner_lock', label: 'HQ access', status: 'pass', detail: 'Owner-only data' },
      { key: 'stripe', label: 'Stripe', status: 'pass', detail: '2 subscriptions checked' },
      { key: 'billing_truth', label: 'Billing truth', status: 'warn', detail: '1 active record needs Stripe verification' },
      { key: 'webhooks', label: 'Stripe webhooks', status: 'pass', detail: 'Webhook event collection is present' },
      { key: 'email', label: 'Lifecycle email', status: 'pass', detail: 'Postmark configuration is present' },
    ],
  };

  return {
    ...base,
    ...overrides,
    truth: { ...base.truth, ...(overrides.truth || {}) },
    counts: { ...base.counts, ...(overrides.counts || {}) },
    billing: { ...base.billing, ...(overrides.billing || {}) },
    collections: { ...base.collections, ...(overrides.collections || {}) },
  };
}

async function installHqApi(page, options = {}) {
  const actions = [];
  const launch = options.launch || launchPayload();

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    const method = request.method();

    if (/\/auth\/(?:me|check|session)$/i.test(pathname)) {
      await route.fulfill(json({ success: true, user: owner, ...owner }));
      return;
    }
    if (pathname === '/api/admin/owner/paid-launch-report') {
      if (options.launchFailure) await route.fulfill(json({ success: false, detail: 'Paid launch report unavailable' }, 503));
      else await route.fulfill(json(launch));
      return;
    }
    if (pathname === '/api/admin/owner-overview') {
      await route.fulfill(json({
        ok: true,
        generated_at: '2026-07-11T01:00:00+00:00',
        metrics: { total_users: 99, paid_users: 99, monthly_revenue_estimate: 9999 },
        lists: {
          all_users: [
            ...launch.billing.verified_paid_users,
            ...launch.billing.verified_trial_users,
            ...launch.billing.tester_users,
            ...launch.billing.needs_verification,
          ],
          businesses: [
            { id: 'business-1', email: 'paid@real.test', business_name: 'Real Paid Business', plan: 'team', subscription_status: 'active', stripe_subscription_id: 'sub_paid' },
            { id: 'business-2', email: 'trial@real.test', business_name: 'Real Trial Business', plan: 'pro', subscription_status: 'trialing', stripe_subscription_id: 'sub_trial' },
          ],
          events: [{ id: 'event-1', title: 'Real user signed in', kind: 'user', meta: 'live activity', at: '2026-07-11T00:30:00+00:00' }],
        },
      }));
      return;
    }
    if (pathname === '/api/admin/owner/growth-report') {
      await route.fulfill(json({ success: true, source: 'platform_unique_visitors_real_public', counts: { unique_total: 12, new_unique_today: 2 }, visitors: [], tester_pipeline: { accepted: [], pending: [], expired: [] } }));
      return;
    }
    if (pathname === '/api/admin/owner/connection') {
      await route.fulfill(json({ success: true, connected: true, database_connected: true, collections_seen: launch.collections.names, counts: launch.collections.counts }));
      return;
    }
    if (pathname === '/api/admin/owner/plan-report') {
      await route.fulfill(json({ success: true, paid_count: 99, monthly_revenue_estimate: 9999, paid_users: [], trial_users: [], free_testers: [] }));
      return;
    }
    if (pathname === '/api/admin/owner/control-log') {
      await route.fulfill(json({ success: true, items: [{ id: 'control-1', title: 'Real access update', action: 'grant', created_at: '2026-07-11T00:20:00+00:00' }] }));
      return;
    }
    if (pathname === '/api/admin/owner/retention-email-status') {
      await route.fulfill(json({ success: true, state: { running: false }, templates: ['welcome'] }));
      return;
    }
    if (pathname === '/api/admin/owner/control-access' && method === 'POST') {
      actions.push({ type: 'control', payload: request.postDataJSON() });
      await route.fulfill(json({ success: true, message: 'Access updated from safe test' }));
      return;
    }
    if (pathname === '/api/admin/owner/tester-intake' && method === 'POST') {
      actions.push({ type: 'tester', payload: request.postDataJSON() });
      await route.fulfill(json({ success: true, message: 'Tester saved from safe test' }));
      return;
    }
    if (pathname === '/api/platform/visit') {
      await route.fulfill(json({ ok: true }));
      return;
    }
    await route.fulfill(json({ success: true, items: [], rows: [], data: [] }));
  });

  return actions;
}

async function openHq(page) {
  await page.goto('/admin', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-version="CHURVOX_REAL_PAID_LAUNCH_HQ_20260711"]')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
}

function metric(page, label) {
  return page.locator('.plhqMetric').filter({ hasText: label });
}

test.describe('Real paid-launch HQ', () => {
  test('authoritative report drives paid counts and keeps estimates separate', async ({ page }) => {
    await installHqApi(page);
    await openHq(page);

    await expect(metric(page, 'Verified paid').locator('strong')).toHaveText('1');
    await expect(metric(page, 'Actual Stripe MRR').locator('strong')).toContainText('$188.00');
    await expect(page.getByText('$238.00', { exact: false })).toBeVisible();
    await expect(page.getByText('separate estimate', { exact: false })).toBeVisible();
    await expect(page.getByText('99', { exact: true })).toHaveCount(0);
    await expect(page.getByText('live_database_and_stripe_v1')).toBeVisible();
    await expect(page.getByText('active_or_paid_with_stripe_subscription_id')).toBeVisible();
    await expect(page.getByText('Excluded', { exact: true })).toBeVisible();
  });

  test('true zero and unavailable values are never replaced by old inferred totals', async ({ page }) => {
    await installHqApi(page, {
      launch: launchPayload({
        ready_to_take_payments: false,
        counts: { verified_paid_users: 0, billing_needs_verification: 0 },
        billing: {
          actual_mrr_nzd: null,
          estimated_mrr_nzd: 0,
          verified_paid_users: [],
          needs_verification: [],
          stripe: { configured: false, available: false, subscriptions_checked: 0, errors: ['STRIPE_SECRET_KEY is not configured'] },
        },
        launch_checks: [{ key: 'stripe', label: 'Stripe', status: 'fail', detail: 'STRIPE_SECRET_KEY is not configured' }],
      }),
    });
    await openHq(page);

    await expect(metric(page, 'Verified paid').locator('strong')).toHaveText('0');
    await expect(metric(page, 'Actual Stripe MRR').locator('strong')).toHaveText('Unavailable');
    await expect(metric(page, 'Launch state').locator('strong')).toHaveText('Check required');
    await expect(page.getByText('99', { exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Paid launch' }).click();
    await expect(page.getByText('STRIPE_SECRET_KEY is not configured')).toBeVisible();
  });

  test('all HQ areas render and safe owner controls perform real requests', async ({ page }) => {
    const actions = await installHqApi(page);
    await openHq(page);

    for (const tab of ['Paid launch', 'Users', 'Billing', 'Testers', 'Businesses', 'Activity', 'System', 'Data']) {
      await page.getByRole('button', { name: tab }).click();
      await expect(page.getByRole('heading', { name: tab })).toBeVisible();
    }

    await page.getByRole('button', { name: 'Users' }).click();
    await page.getByRole('button', { name: 'Grant' }).first().click();
    await expect(page.getByText('Access updated from safe test')).toBeVisible();

    await page.getByRole('button', { name: 'Testers' }).click();
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill('newtester@real.test');
    await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Real Tester');
    await page.getByRole('textbox', { name: 'Business', exact: true }).fill('Real Tester Business');
    await page.getByRole('button', { name: 'Grant tester access' }).click();
    await expect(page.getByText('Tester saved from safe test')).toBeVisible();

    expect(actions.some((item) => item.type === 'control' && item.payload.action === 'grant')).toBeTruthy();
    expect(actions.some((item) => item.type === 'tester' && item.payload.email === 'newtester@real.test')).toBeTruthy();
  });

  test('endpoint failure stays visible and mobile controls remain usable', async ({ page }, testInfo) => {
    await installHqApi(page, { launchFailure: true });
    await openHq(page);

    await expect(page.getByText('live HQ endpoint failed', { exact: false })).toBeVisible();
    await expect(metric(page, 'Verified paid').locator('strong')).toHaveText('Unavailable');
    await page.getByRole('button', { name: 'System' }).click();
    const launchEndpoint = page.locator('.plhqEndpoint').filter({ hasText: 'launch' });
    await expect(launchEndpoint).toContainText('Paid launch report unavailable');

    if (testInfo.project.name.includes('mobile')) {
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(2);
      const buttons = page.locator('.plhqSide nav button:visible');
      const count = await buttons.count();
      for (let index = 0; index < count; index += 1) {
        const box = await buttons.nth(index).boundingBox();
        expect(box && box.height, `mobile HQ tab ${index} is too small`).toBeGreaterThanOrEqual(44);
      }
    }
  });
});
