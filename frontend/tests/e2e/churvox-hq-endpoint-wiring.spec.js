const { test, expect } = require('@playwright/test');

const OWNER = {
  id: 'hq-wiring-owner',
  email: 'hello@churvox.com',
  role: 'platform_owner',
  email_verified: true,
  has_app_access: true,
  subscription_status: 'active',
  plan: 'enterprise',
  business_id: 'hq-wiring-business',
  business_name: 'Churvox',
};

const HQ_READ_PATHS = [
  '/api/admin/owner-overview',
  '/api/admin/owner/paid-launch-report',
  '/api/admin/owner/growth-report',
  '/api/admin/owner/testers',
  '/api/admin/owner/plan-report',
  '/api/admin/owner/control-log',
  '/api/admin/owner/connection',
  '/api/admin/owner/retention-email-status',
];

function json(route, body, status = 200) {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

test('the single HQ calls every owner source through the authenticated same-origin API and writes tester controls', async ({ page }) => {
  const requests = [];

  await page.addInitScript(() => {
    localStorage.setItem('token', 'hq-wiring-owner-token');
  });

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();
    const authorization = request.headers().authorization || '';
    let payload = null;
    try { payload = request.postDataJSON(); } catch {}

    requests.push({ method, path, origin: url.origin, authorization, payload });

    if (/\/api\/auth\/(?:me|check|session)$/i.test(path)) {
      await json(route, { success: true, user: OWNER, ...OWNER });
      return;
    }

    if (path === '/api/admin/owner-overview') {
      await json(route, {
        success: true,
        metrics: { total_users: 9, total_businesses: 4, active_today: 2, total_jobs: 16, total_clients: 7, total_invoices: 5 },
        lists: {
          all_users: [{ email: 'owner@realtrade.co.nz', business_name: 'Real Trade', plan: 'pro', subscription_status: 'active' }],
          businesses: [{ email: 'owner@realtrade.co.nz', business_name: 'Real Trade', plan: 'pro', subscription_status: 'active' }],
          events: [{ title: 'Real Trade signed in', action: 'login', created_at: new Date().toISOString() }],
        },
      });
      return;
    }

    if (path === '/api/admin/owner/paid-launch-report') {
      await json(route, {
        success: true,
        source: 'live_database_and_stripe_v3',
        ready_to_take_payments: true,
        counts: { users_total: 9, businesses_total: 4, verified_paid_users: 2, verified_trial_users: 1, tester_users: 1, billing_needs_verification: 0 },
        billing: {
          actual_mrr_nzd: 238,
          estimated_mrr_nzd: 238,
          verified_paid_users: [{ email: 'paid@realtrade.co.nz', business_name: 'Paid Trade', plan: 'team', subscription_status: 'active', stripe_subscription_id: 'sub_live_paid' }],
          verified_trial_users: [],
          tester_users: [],
          needs_verification: [],
          stripe: { available: true, credential_verified: true },
        },
        collections: { connected: true, counts: { users: 9, businesses: 4, jobs: 16, clients: 7, invoices: 5 } },
        launch_checks: [{ key: 'database', label: 'Database', status: 'pass', detail: 'Connected' }],
      });
      return;
    }

    if (path === '/api/admin/owner/growth-report') {
      await json(route, {
        success: true,
        counts: { unique_total: 44, pageviews_total: 121, new_unique_today: 3, signups_total: 9, accepted_testers: 1 },
        visitors: [{ visitor_key: 'real-visitor', last_path: '/pricing', last_source: 'google', last_seen: new Date().toISOString(), status: 'active' }],
        tester_pipeline: { accepted: [], pending: [], expired: [] },
      });
      return;
    }

    if (path === '/api/admin/owner/testers') {
      await json(route, {
        success: true,
        counts: { total: 1, accepted: 1, active: 1, invited_not_accepted: 0, revoked: 0 },
        testers: [{ email: 'tester@realtrade.co.nz', business_name: 'Tester Trade', name: 'Tester Owner', plan: 'pro', status: 'accepted' }],
        accepted_testers: [], active_testers: [], invited_testers: [], revoked_testers: [],
      });
      return;
    }

    if (path === '/api/admin/owner/plan-report') {
      await json(route, { success: true, paid_count: 2, trial_count: 1, free_tester_count: 1, no_plan_count: 2, monthly_revenue_estimate: 238 });
      return;
    }

    if (path === '/api/admin/owner/control-log') {
      await json(route, { success: true, count: 1, items: [{ action: 'tester_intake', title: 'Tester invited', created_at: new Date().toISOString() }] });
      return;
    }

    if (path === '/api/admin/owner/connection') {
      await json(route, { success: true, connected: true, database_connected: true, collections_seen: ['users', 'businesses', 'jobs'], counts: { users: 9, businesses: 4, jobs: 16, clients: 7 } });
      return;
    }

    if (path === '/api/admin/owner/retention-email-status') {
      await json(route, { success: true, state: { running: false }, interval_seconds: 21600, batch_limit: 25, templates: ['welcome'] });
      return;
    }

    if (path === '/api/admin/owner/tester-intake' && method === 'POST') {
      await json(route, { success: true, message: 'Tester saved through the protected owner route' });
      return;
    }

    if (path === '/api/admin/owner/control-access' && method === 'POST') {
      await json(route, { success: true, message: payload?.action === 'revoke' ? 'Tester access revoked through the protected owner route' : 'Tester access granted through the protected owner route' });
      return;
    }

    if (path === '/api/platform/visit') {
      await json(route, { ok: true });
      return;
    }

    await json(route, { success: true, data: [], items: [] });
  });

  await page.goto('/admin', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('main#CHURVOX_HQ_SYSTEM.hqOne')).toHaveCount(1);
  await expect(page.getByText('8 of 8 live sources', { exact: false })).toBeVisible();

  const pageOrigin = new URL(page.url()).origin;
  for (const path of HQ_READ_PATHS) {
    const hit = requests.find((request) => request.method === 'GET' && request.path === path);
    expect(hit, `HQ never requested ${path}`).toBeTruthy();
    expect(hit.origin, `${path} bypassed the same-origin frontend API proxy`).toBe(pageOrigin);
    expect(hit.authorization, `${path} did not include the platform-owner bearer token`).toBe('Bearer hq-wiring-owner-token');
  }

  const nav = page.getByRole('navigation', { name: 'Churvox HQ navigation' });
  await nav.getByRole('button', { name: 'Testers', exact: true }).click();
  await page.getByRole('textbox', { name: /^email$/i }).fill('NewTester@RealTrade.co.nz');
  await page.getByRole('textbox', { name: /^name$/i }).fill('New Tester');
  await page.getByRole('textbox', { name: /^business$/i }).fill('New Tester Trade');
  await page.getByRole('button', { name: 'Grant tester access' }).click();
  await expect(page.getByText('Tester saved through the protected owner route', { exact: true })).toBeVisible();

  const intake = requests.find((request) => request.method === 'POST' && request.path === '/api/admin/owner/tester-intake');
  expect(intake).toBeTruthy();
  expect(intake.origin).toBe(pageOrigin);
  expect(intake.authorization).toBe('Bearer hq-wiring-owner-token');
  expect(intake.payload.email).toBe('NewTester@RealTrade.co.nz');
  expect(intake.payload.days).toBe(90);

  await page.getByRole('button', { name: 'Grant', exact: true }).first().click();
  await expect.poll(() => requests.filter((request) => request.method === 'POST' && request.path === '/api/admin/owner/control-access' && request.payload?.action === 'grant').length).toBeGreaterThan(0);
  await expect(page.getByRole('button', { name: 'Revoke', exact: true }).first()).toBeEnabled();
  await page.getByRole('button', { name: 'Revoke', exact: true }).first().click();
  await expect.poll(() => requests.filter((request) => request.method === 'POST' && request.path === '/api/admin/owner/control-access' && request.payload?.action === 'revoke').length).toBeGreaterThan(0);

  const controls = requests.filter((request) => request.method === 'POST' && request.path === '/api/admin/owner/control-access');
  expect(controls.some((request) => request.authorization === 'Bearer hq-wiring-owner-token' && request.origin === pageOrigin && request.payload?.action === 'grant' && request.payload?.identifier === 'tester@realtrade.co.nz')).toBeTruthy();
  expect(controls.some((request) => request.authorization === 'Bearer hq-wiring-owner-token' && request.origin === pageOrigin && request.payload?.action === 'revoke' && request.payload?.identifier === 'tester@realtrade.co.nz')).toBeTruthy();
});
