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
};

function json(body, status = 200) {
  return { status, contentType: 'application/json', body: JSON.stringify(body) };
}

function launchPayload(overrides = {}) {
  const base = {
    success: true,
    source: 'live_database_and_stripe_v3',
    generated_at: new Date().toISOString(),
    owner_only: 'hello@churvox.com',
    ready_to_take_payments: true,
    truth: {
      sample_records_included: false,
      paid_definition: 'stripe_subscription_status_active',
      trial_definition: 'stripe_subscription_status_trialing',
      mrr_definition: 'active_stripe_subscription_price_items_only',
      estimate_is_separate: true,
    },
    counts: {
      users_total: 5,
      internal_users_excluded: 2,
      businesses_total: 3,
      verified_paid_users: 1,
      verified_trial_users: 1,
      tester_users: 1,
      billing_needs_verification: 1,
    },
    billing: {
      actual_mrr_nzd: 188,
      estimated_mrr_nzd: 238,
      verified_paid_users: [{ id: 'paid-1', email: 'paid@real.test', business_name: 'Real Paid Business', plan: 'team', subscription_status: 'active', stripe_subscription_id: 'sub_paid', last_active: new Date().toISOString() }],
      verified_trial_users: [{ id: 'trial-1', email: 'trial@real.test', business_name: 'Real Trial Business', plan: 'pro', subscription_status: 'trialing', stripe_subscription_id: 'sub_trial', last_active: new Date().toISOString() }],
      tester_users: [{ id: 'tester-1', email: 'tester@real.test', business_name: 'Real Tester Business', plan: 'pro', subscription_status: 'pending_signup', status: 'pending_signup', last_active: new Date().toISOString() }],
      needs_verification: [{ id: 'verify-1', email: 'verify@real.test', business_name: 'Needs Verification Ltd', plan: 'solo', subscription_status: 'active', stripe_subscription_id: '', last_active: new Date().toISOString() }],
      stripe: { configured: true, available: true, credential_verified: true, account_id: 'acct_live_truth', paid_mrr_by_currency: { nzd: 188 }, active_subscriptions: [] },
    },
    collections: {
      connected: true,
      names: ['users', 'businesses', 'jobs', 'clients', 'quotes', 'invoices', 'stripe_webhook_events'],
      counts: { users: 7, businesses: 3, jobs: 11, clients: 8, quotes: 4, invoices: 6, platform_visits: 40 },
    },
    launch_checks: [
      { key: 'database', label: 'Database', status: 'pass', detail: '7 collections visible' },
      { key: 'owner_lock', label: 'HQ access', status: 'pass', detail: 'Owner-only data' },
      { key: 'stripe', label: 'Stripe', status: 'pass', detail: 'Stripe account confirmed' },
      { key: 'prices', label: 'Stripe plan prices', status: 'pass', detail: 'Four live monthly NZD prices match' },
      { key: 'billing_truth', label: 'Billing truth', status: 'warn', detail: '1 active record needs Stripe verification' },
      { key: 'webhooks', label: 'Stripe webhooks', status: 'pass', detail: 'Signing secret configured' },
      { key: 'email', label: 'Lifecycle email', status: 'pass', detail: 'Postmark configured' },
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
  const tester = launch.billing.tester_users[0];

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    const method = request.method();

    if (/\/auth\/(?:me|check|session)$/i.test(pathname)) return route.fulfill(json({ success: true, user: owner, ...owner }));
    if (pathname === '/api/admin/owner/paid-launch-report') {
      return options.launchFailure
        ? route.fulfill(json({ success: false, detail: 'Paid launch report unavailable' }, 503))
        : route.fulfill(json(launch));
    }
    if (pathname === '/api/admin/owner-overview') return route.fulfill(json({
      success: true,
      metrics: { total_users: launch.counts.users_total, total_businesses: launch.counts.businesses_total, total_jobs: 11, total_clients: 8, total_invoices: 6, active_today: 2 },
      lists: {
        all_users: [...launch.billing.verified_paid_users, ...launch.billing.verified_trial_users, ...launch.billing.tester_users, ...launch.billing.needs_verification],
        businesses: [{ id: 'business-1', email: 'paid@real.test', business_name: 'Real Paid Business', plan: 'team', subscription_status: 'active' }],
        events: [{ id: 'event-1', title: 'Real user signed in', kind: 'user', meta: 'live activity', at: new Date().toISOString() }],
      },
    }));
    if (pathname === '/api/admin/owner/growth-report') return route.fulfill(json({ success: true, counts: { unique_total: 12, new_unique_today: 2, pageviews_total: 40, signups_total: 5 }, visitors: [{ visitor_key: 'visitor-1', last_path: '/pricing', last_source: 'google', last_seen: new Date().toISOString(), status: 'active' }], tester_pipeline: { accepted: [], pending: [], expired: [] } }));
    if (pathname === '/api/admin/owner/connection') return route.fulfill(json({ success: true, database_connected: true, collections_seen: launch.collections.names, counts: launch.collections.counts }));
    if (pathname === '/api/admin/owner/plan-report') return route.fulfill(json({ success: true, paid_count: 1, free_testers: tester ? [tester] : [] }));
    if (pathname === '/api/admin/owner/control-log') return route.fulfill(json({ success: true, items: [{ id: 'control-1', title: 'Real access update', action: 'grant', created_at: new Date().toISOString() }] }));
    if (pathname === '/api/admin/owner/retention-email-status') return route.fulfill(json({ success: true, state: { running: false }, templates: ['welcome'] }));
    if (pathname === '/api/admin/owner/testers') return route.fulfill(json({ success: true, counts: { total: tester ? 1 : 0, accepted: 0, active: 0, invited_not_accepted: tester ? 1 : 0 }, testers: tester ? [tester] : [], invited_testers: tester ? [tester] : [], accepted_testers: [], active_testers: [], revoked_testers: [] }));
    if (pathname === '/api/admin/owner/control-access' && method === 'POST') {
      const payload = request.postDataJSON();
      actions.push({ type: 'control', payload });
      return route.fulfill(json({ success: true, message: payload.action === 'revoke' ? 'Tester access revoked' : 'Access updated from safe test' }));
    }
    if (pathname === '/api/admin/owner/tester-intake' && method === 'POST') {
      const payload = request.postDataJSON();
      actions.push({ type: 'tester', payload });
      return route.fulfill(json({ success: true, message: 'Tester saved from safe test' }));
    }
    if (pathname === '/api/platform/visit') return route.fulfill(json({ ok: true }));
    return route.fulfill(json({ success: true, items: [], rows: [], data: [] }));
  });

  return actions;
}

async function openHq(page) {
  await page.goto('/admin', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('main#CHURVOX_HQ_SYSTEM.hqOne')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();
}

function metric(page, label) {
  return page.locator('.hqOneMetric').filter({ hasText: label });
}

test.describe('Single rebuilt Churvox HQ', () => {
  test('authoritative report drives billing metrics and keeps estimates out of the live total', async ({ page }) => {
    await installHqApi(page);
    await openHq(page);

    await expect(metric(page, 'Verified paid').locator('strong')).toHaveText('1');
    await expect(metric(page, 'Stripe MRR').locator('strong')).toContainText('$188.00');
    await expect(metric(page, 'Needs checking').locator('strong')).toHaveText('1');
    await expect(page.getByText('$238.00', { exact: true })).toHaveCount(0);

    await page.getByRole('button', { name: 'Billing', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Billing', exact: true })).toBeVisible();
    await expect(metric(page, 'Actual MRR').locator('strong')).toContainText('$188.00');
    await expect(page.getByText('Needs Verification Ltd')).toBeVisible();
  });

  test('true zero MRR is rendered as $0.00 rather than unavailable', async ({ page }) => {
    const launch = launchPayload({
      counts: { verified_paid_users: 0, verified_trial_users: 0, billing_needs_verification: 0 },
      billing: { actual_mrr_nzd: 0, estimated_mrr_nzd: 0, verified_paid_users: [], verified_trial_users: [], needs_verification: [] },
    });
    await installHqApi(page, { launch });
    await openHq(page);

    await expect(metric(page, 'Verified paid').locator('strong')).toHaveText('0');
    await expect(metric(page, 'Stripe MRR').locator('strong')).toContainText('$0.00');
    await page.getByRole('button', { name: 'Billing', exact: true }).click();
    await expect(metric(page, 'Actual MRR').locator('strong')).toContainText('$0.00');
  });

  test('one navigation owns every HQ area and tester actions use the final routes', async ({ page }) => {
    const actions = await installHqApi(page);
    await openHq(page);

    const nav = page.getByRole('navigation', { name: 'Churvox HQ navigation' });
    await expect(nav.getByRole('button')).toHaveCount(8);
    await expect(page.locator('.hq2, .cvMyHq, #churvox-hq-tester-outreach-root')).toHaveCount(0);

    for (const tab of ['Users', 'Businesses', 'Billing', 'Testers', 'Visitors', 'Activity', 'System', 'Overview']) {
      await nav.getByRole('button', { name: tab, exact: true }).click();
      await expect(page.getByRole('heading', { name: tab, exact: true })).toBeVisible();
    }

    await nav.getByRole('button', { name: 'Testers', exact: true }).click();
    await expect(page.getByText('Real Tester Business', { exact: true })).toBeVisible();
    await page.getByRole('textbox', { name: /^email$/i }).fill('NewTester@Real.test');
    await page.getByRole('textbox', { name: /^name$/i }).fill('Real Tester');
    await page.getByRole('textbox', { name: /^business$/i }).fill('Real Tester Business');
    await page.getByRole('button', { name: 'Grant tester access' }).click();
    await expect(page.getByText('Tester saved from safe test')).toBeVisible();

    await page.getByRole('button', { name: 'Grant', exact: true }).first().click();
    await expect(page.getByText('Access updated from safe test')).toBeVisible();
    await page.getByRole('button', { name: 'Revoke', exact: true }).first().click();
    await expect(page.getByText('Tester access revoked')).toBeVisible();

    expect(actions.some((item) => item.type === 'control' && item.payload.action === 'grant')).toBeTruthy();
    expect(actions.some((item) => item.type === 'control' && item.payload.action === 'revoke' && item.payload.identifier === 'tester@real.test')).toBeTruthy();
    expect(actions.some((item) => item.type === 'tester' && item.payload.email === 'NewTester@Real.test')).toBeTruthy();
  });

  test('endpoint failure stays visible and mobile navigation remains usable', async ({ page }, testInfo) => {
    await installHqApi(page, { launchFailure: true });
    await openHq(page);

    await expect(page.getByText('Billing and launch', { exact: true }).first()).toBeVisible();
    await page.getByRole('button', { name: 'System', exact: true }).click();
    const launchEndpoint = page.locator('.hqOneEndpointGrid article').filter({ hasText: 'Billing and launch' });
    await expect(launchEndpoint).toContainText('Paid launch report unavailable');

    if (testInfo.project.name.includes('mobile')) {
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(18);
      const buttons = page.locator('.hqOneNav button:visible');
      const count = await buttons.count();
      for (let index = 0; index < count; index += 1) {
        const box = await buttons.nth(index).boundingBox();
        expect(box && box.height, `mobile HQ tab ${index} is too small`).toBeGreaterThanOrEqual(40);
      }
    }
  });
});
