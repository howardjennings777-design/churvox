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
    source: 'live_database_and_stripe_v3',
    generated_at: '2026-07-18T01:00:00+00:00',
    owner_only: 'hello@churvox.com',
    ready_to_take_payments: true,
    truth: {
      sample_records_included: false,
      paid_definition: 'stripe_subscription_status_active',
      trial_definition: 'stripe_subscription_status_trialing',
      mrr_definition: 'active_stripe_subscription_price_items_only',
      price_definition: 'active_nzd_monthly_prices_matching_locked_plan_amounts',
      subscription_id_alone_is_not_paid: true,
      database_status_is_not_billing_truth: true,
      stripe_credentials_verified: true,
      prices_live_verified: true,
      zero_mrr_is_zero: true,
      testers_excluded_from_billing: true,
      estimate_is_separate: true,
    },
    counts: {
      users_total: 5,
      internal_users_excluded: 2,
      businesses_total: 3,
      businesses_source: 'filtered_businesses_collection',
      verified_paid_users: 1,
      verified_trial_users: 1,
      tester_users: 1,
      billing_needs_verification: 1,
    },
    billing: {
      actual_mrr_nzd: 188,
      estimated_mrr_nzd: 238,
      verified_paid_users: [{ id: 'paid-1', email: 'paid@real.test', business_name: 'Real Paid Business', plan: 'team', subscription_status: 'active', stripe_subscription_id: 'sub_paid', last_active: '2026-07-18T00:50:00+00:00' }],
      verified_trial_users: [{ id: 'trial-1', email: 'trial@real.test', business_name: 'Real Trial Business', plan: 'pro', subscription_status: 'trialing', stripe_subscription_id: 'sub_trial', last_active: '2026-07-17T22:00:00+00:00' }],
      tester_users: [{ id: 'tester-1', email: 'tester@real.test', display_email: 'Tester@Real.test', business_name: 'Real Tester Business', plan: 'pro', subscription_status: 'pending_signup', status: 'pending_signup', source: 'billing report', last_active: '2026-07-17T20:00:00+00:00' }],
      needs_verification: [{ id: 'verify-1', email: 'verify@real.test', business_name: 'Needs Verification Ltd', plan: 'solo', subscription_status: 'active', stripe_subscription_id: '', last_active: '2026-07-17T19:00:00+00:00' }],
      stripe: {
        configured: true,
        available: true,
        credential_verified: true,
        account_id: 'acct_live_truth',
        source: 'stripe_account_and_subscription_api',
        subscriptions_checked: 2,
        paid_mrr_by_currency: { nzd: 188 },
        active_subscriptions: [
          { subscription_id: 'sub_paid', status: 'active', mrr_by_currency: { nzd: 188 } },
          { subscription_id: 'sub_trial', status: 'trialing', mrr_by_currency: { nzd: 149 } },
        ],
        errors: [],
      },
      stripe_price_validation: {
        configured: true,
        available: true,
        valid: true,
        checked: 4,
        expected: 4,
        missing: [],
        errors: [],
        prices: [
          { plan: 'Start', valid: true },
          { plan: 'Crew', valid: true },
          { plan: 'Operator', valid: true },
          { plan: 'Command', valid: true },
        ],
      },
    },
    collections: {
      connected: true,
      names: ['users', 'businesses', 'jobs', 'clients', 'quotes', 'invoices', 'stripe_webhook_events'],
      counts: { users: 7, businesses: 3, jobs: 11, clients: 8, quotes: 4, invoices: 6, team_members: 2, workers: 2, platform_visits: 40, platform_unique_visitors: 12, support_messages: 1, stripe_webhook_events: 5, lifecycle_emails: 9, command_slips: 0, command_audit: 3 },
      latest: { stripe_webhook: { created_at: '2026-07-18T00:40:00+00:00' }, support_message: { created_at: '2026-07-17T21:00:00+00:00' }, lifecycle_email: { created_at: '2026-07-17T20:00:00+00:00' } },
    },
    launch_checks: [
      { key: 'database', label: 'Database', status: 'pass', detail: '7 collections visible' },
      { key: 'owner_lock', label: 'HQ access', status: 'pass', detail: 'Owner-only data' },
      { key: 'stripe', label: 'Stripe', status: 'pass', detail: 'Stripe account confirmed; 2 candidates checked' },
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
      lists: {
        all_users: [...launch.billing.verified_paid_users, ...launch.billing.verified_trial_users, ...launch.billing.tester_users, ...launch.billing.needs_verification],
        businesses: [{ id: 'business-1', email: 'paid@real.test', business_name: 'Real Paid Business', plan: 'team', subscription_status: 'active', stripe_subscription_id: 'sub_paid' }],
        events: [{ id: 'event-1', title: 'Real user signed in', kind: 'user', meta: 'live activity', at: '2026-07-18T00:30:00+00:00' }],
      },
    }));
    if (pathname === '/api/admin/owner/growth-report') return route.fulfill(json({ success: true, counts: { unique_total: 12, new_unique_today: 2 }, visitors: [] }));
    if (pathname === '/api/admin/owner/connection') return route.fulfill(json({ success: true, database_connected: true, collections_seen: launch.collections.names, counts: launch.collections.counts }));
    if (pathname === '/api/admin/owner/plan-report') return route.fulfill(json({ success: true, paid_count: 1, free_testers: tester ? [tester] : [] }));
    if (pathname === '/api/admin/owner/control-log') return route.fulfill(json({ success: true, items: [{ id: 'control-1', title: 'Real access update', action: 'grant', created_at: '2026-07-18T00:20:00+00:00' }] }));
    if (pathname === '/api/admin/owner/retention-email-status') return route.fulfill(json({ success: true, state: { running: false }, templates: ['welcome'] }));
    if (pathname === '/api/admin/owner/testers') return route.fulfill(json({ success: true, counts: { total: tester ? 1 : 0, accepted: 0, active: 0, invited_not_accepted: tester ? 1 : 0 }, testers: tester ? [tester] : [], invited_testers: tester ? [tester] : [], accepted_testers: [], active_testers: [] }));
    if (pathname === '/api/admin/owner/control-access' && method === 'POST') {
      const payload = request.postDataJSON();
      actions.push({ type: 'control', payload });
      return route.fulfill(json({ success: true, message: payload.action === 'revoke' ? 'Tester access revoked' : 'Access updated from safe test' }));
    }
    if (pathname === '/api/admin/owner/tester-intake' && method === 'POST') {
      const payload = request.postDataJSON();
      actions.push({ type: 'tester', payload });
      return route.fulfill(json({ success: true, message: 'Tester saved from safe test', tester: { ...payload, email: String(payload.email || '').toLowerCase(), display_email: payload.display_email, status: 'pending_signup', source: 'tester endpoint' } }));
    }
    if (pathname === '/api/platform/visit') return route.fulfill(json({ ok: true }));
    return route.fulfill(json({ success: true, items: [], rows: [], data: [] }));
  });

  return actions;
}

async function openHq(page) {
  await page.goto('/admin', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-version^="CHURVOX_HQ_SYSTEM"]')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Command', exact: true })).toBeVisible();
}

function metric(page, label) {
  return page.locator('.hq2Metric').filter({ hasText: label });
}

test.describe('Rebuilt paid-launch HQ', () => {
  test('authoritative report drives launch metrics and keeps estimates separate', async ({ page }) => {
    await installHqApi(page);
    await openHq(page);

    await expect(metric(page, 'Verified paid').locator('strong')).toHaveText('1');
    await expect(metric(page, 'Stripe MRR').locator('strong')).toContainText('$188.00');
    await expect(metric(page, 'Needs check').locator('strong')).toHaveText('1');
    await expect(page.getByText('99', { exact: true })).toHaveCount(0);

    await page.getByRole('button', { name: 'Launch', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Launch', exact: true })).toBeVisible();
    await expect(metric(page, 'Actual MRR').locator('strong')).toContainText('$188.00');
    await expect(metric(page, 'Estimated MRR').locator('strong')).toContainText('$238.00');
    await expect(page.getByText('Needs Verification Ltd')).toBeVisible();
  });

  test('true zero MRR is rendered as $0.00 rather than unavailable', async ({ page }) => {
    const launch = launchPayload({
      counts: { verified_paid_users: 0, verified_trial_users: 0, billing_needs_verification: 0 },
      billing: { actual_mrr_nzd: 0, estimated_mrr_nzd: 0, verified_paid_users: [], verified_trial_users: [], needs_verification: [] },
      launch_checks: launchPayload().launch_checks.map((item) => item.key === 'billing_truth' ? { ...item, status: 'pass', detail: 'No unresolved billing records' } : item),
    });
    await installHqApi(page, { launch });
    await openHq(page);

    await expect(metric(page, 'Verified paid').locator('strong')).toHaveText('0');
    await expect(metric(page, 'Stripe MRR').locator('strong')).toContainText('$0.00');
    await page.getByRole('button', { name: 'Launch', exact: true }).click();
    await expect(metric(page, 'Actual MRR').locator('strong')).toContainText('$0.00');
    await expect(metric(page, 'Estimated MRR').locator('strong')).toContainText('$0.00');
    await expect(page.getByText('Unavailable', { exact: true })).toHaveCount(0);
  });

  test('all HQ areas render and tester grant/revoke requests use the final routes', async ({ page }) => {
    const actions = await installHqApi(page);
    await openHq(page);

    for (const tab of ['Launch', 'Users', 'Billing', 'Testers', 'Businesses', 'Activity', 'System', 'Data']) {
      await page.getByRole('button', { name: tab, exact: true }).click();
      await expect(page.getByRole('heading', { name: tab, exact: true })).toBeVisible();
    }

    await page.getByRole('button', { name: 'Users', exact: true }).click();
    await page.getByRole('button', { name: 'Grant', exact: true }).first().click();
    await expect(page.getByText('Access updated from safe test')).toBeVisible();

    await page.getByRole('button', { name: 'Testers', exact: true }).click();
    await expect(page.getByText('Tester@Real.test', { exact: true }).first()).toBeVisible();
    await page.getByRole('textbox', { name: /^email$/i }).fill('NewTester@Real.test');
    await page.getByRole('textbox', { name: /^name$/i }).fill('Real Tester');
    await page.getByRole('textbox', { name: /^business$/i }).fill('Real Tester Business');
    await page.getByRole('button', { name: 'Grant tester access' }).click();
    await expect(page.getByText('NewTester@Real.test', { exact: true }).first()).toBeVisible();

    const pendingRow = page.locator('tr').filter({ has: page.getByText('Tester@Real.test', { exact: true }) }).filter({ has: page.getByRole('button', { name: 'Revoke', exact: true }) }).first();
    await pendingRow.getByRole('button', { name: 'Revoke', exact: true }).click();
    await expect(page.getByText('Tester access revoked')).toBeVisible();
    await expect(page.getByText('Revoked / locked testers')).toBeVisible();

    expect(actions.some((item) => item.type === 'control' && item.payload.action === 'grant')).toBeTruthy();
    expect(actions.some((item) => item.type === 'control' && item.payload.action === 'revoke' && item.payload.identifier === 'tester@real.test')).toBeTruthy();
    expect(actions.some((item) => item.type === 'tester' && item.payload.email === 'NewTester@Real.test' && item.payload.canonical_email === 'newtester@real.test')).toBeTruthy();
  });

  test('endpoint failure stays visible and mobile controls remain usable', async ({ page }, testInfo) => {
    await installHqApi(page, { launchFailure: true });
    await openHq(page);

    await expect(page.getByText(/HQ endpoint failed/i)).toBeVisible();
    await expect(metric(page, 'Launch state').locator('strong')).toHaveText('Unknown');
    await page.getByRole('button', { name: 'System', exact: true }).click();
    const launchEndpoint = page.locator('.hq2Endpoint').filter({ hasText: 'launch' });
    await expect(launchEndpoint).toContainText('Paid launch report unavailable');

    if (testInfo.project.name.includes('mobile')) {
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(18);
      const buttons = page.locator('.hq2Side nav button:visible');
      const count = await buttons.count();
      for (let index = 0; index < count; index += 1) {
        const box = await buttons.nth(index).boundingBox();
        expect(box && box.height, `mobile HQ tab ${index} is too small`).toBeGreaterThanOrEqual(40);
      }
    }
  });
});
