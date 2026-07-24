const { test, expect } = require('@playwright/test');

function json(body, status = 200) {
  return { status, contentType: 'application/json', body: JSON.stringify(body) };
}

async function bootPlans(page, usageResponse) {
  const user = {
    id: 'plans-usage-owner',
    business_id: 'plans-usage-owner',
    email: 'plans-usage@example.test',
    role: 'owner',
    plan: 'pro',
    ui_plan: 'operator',
    subscription_status: 'active',
    stripe_subscription_id: 'sub_plans_usage',
    has_app_access: true,
    email_verified: true,
  };

  await page.addInitScript((snapshotUser) => {
    localStorage.setItem('token', 'plans-usage-token');
    localStorage.setItem('authToken', 'plans-usage-token');
    localStorage.setItem('churvox:stable-current-plan:v1', 'operator');
    localStorage.setItem('churvox_auth_session_snapshot_v1', JSON.stringify({ at: Date.now(), token: 'plans-usage-token', user: snapshotUser }));
  }, user);

  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (/\/api\/auth\/(?:me|check|session)$/.test(path)) return route.fulfill(json({ success: true, user, ...user }));
    if (path === '/api/billing/subscription-status') return route.fulfill(json({ success: true, plan: 'pro', current_plan: 'operator', subscription_status: 'active', stripe_subscription_id: 'sub_plans_usage', has_app_access: true }));
    if (path === '/api/plan/usage') return route.fulfill(json(usageResponse.body, usageResponse.status || 200));
    if (path === '/api/platform/visit') return route.fulfill(json({ ok: true }));
    return route.fulfill(json({ success: true, items: [], data: [] }));
  });

  await page.goto('/dashboard#plans', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.cvOwnerReady')).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole('heading', { name: 'See your current access before comparing anything.' })).toBeVisible();
}

async function bootNewOwnerPlans(page) {
  const user = {
    id: 'new-plans-owner',
    business_id: 'new-plans-owner',
    email: 'owner@example.test',
    role: 'owner',
    plan: 'pro',
    ui_plan: 'operator',
    subscription_status: 'active',
    stripe_subscription_id: 'sub_new_plans',
    has_app_access: true,
    email_verified: true,
  };
  let checkoutPayload = null;

  await page.addInitScript((snapshotUser) => {
    localStorage.setItem('token', 'new-plans-token');
    localStorage.setItem('authToken', 'new-plans-token');
    localStorage.setItem('churvox_auth_session_snapshot_v1', JSON.stringify({ at: Date.now(), token: 'new-plans-token', user: snapshotUser }));
  }, user);

  await page.route('https://checkout.stripe.com/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>Stripe checkout test</body></html>' });
  });

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (/\/api\/auth\/(?:me|check|session)$/.test(path)) return route.fulfill(json({ success: true, user, ...user }));
    if (path === '/api/billing/create-checkout-session') {
      checkoutPayload = request.postDataJSON();
      return route.fulfill(json({ success: true, url: 'https://checkout.stripe.com/c/pay/churvox-new-plans-test' }));
    }
    if (path === '/api/platform/visit') return route.fulfill(json({ ok: true }));
    return route.fulfill(json({ success: true, items: [], decisions: [], audit: [], data: [] }));
  });

  await page.goto('/dashboard#plans', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'See your current access before comparing anything.' })).toBeVisible();
  return () => checkoutPayload;
}

test.describe('Plans live usage truth', () => {
  test('shows verified real counts and exact locked limits', async ({ page }) => {
    await bootPlans(page, {
      body: {
        success: true,
        plan: 'operator',
        current_plan: 'operator',
        limits: { clients: 3000, jobs_per_month: 500, ai_actions: 500, active_team_members: 15 },
        used: { clients: 42, jobs_this_month: 18, ai_actions: 73, active_team_members: 4 },
        slots_left: { clients: 2958, jobs_this_month: 482, ai_actions: 427, active_team_members: 11 },
        usage_verified: true,
        usage_errors: {},
        limit_source: 'locked_paid_launch_limits_2026_07_12',
        guarded_at: '2026-07-12T02:00:00Z',
      },
    });

    const panel = page.locator('#churvox-plan-live-usage');
    await expect(panel).toBeVisible({ timeout: 10000 });
    await expect(panel.getByRole('heading', { name: 'Operator usage' })).toBeVisible();
    await expect(panel).toContainText('4 / 15');
    await expect(panel).toContainText('42 / 3,000');
    await expect(panel).toContainText('18 / 500');
    await expect(panel).toContainText('73 / 500');
    await expect(panel).toContainText('Verified from live business records');
    await expect(page.getByText('Usage count hidden here')).toHaveCount(0);
  });

  test('never turns an unavailable counter into zero usage', async ({ page }) => {
    await bootPlans(page, {
      body: {
        success: true,
        plan: 'operator',
        limits: { clients: 3000, jobs_per_month: 500, ai_actions: 500, active_team_members: 15 },
        used: { clients: null, jobs_this_month: null, ai_actions: null, active_team_members: null },
        usage_verified: false,
        usage_errors: { clients: 'Database count failed' },
        limit_source: 'locked_paid_launch_limits_2026_07_12',
      },
    });

    const panel = page.locator('#churvox-plan-live-usage');
    await expect(panel).toBeVisible({ timeout: 10000 });
    await expect(panel.getByRole('heading', { name: 'Live usage is unavailable' })).toBeVisible();
    await expect(panel).toContainText('No usage number has been assumed');
    await expect(panel.locator('.cvUsageCard')).toHaveCount(0);
    await expect(panel).not.toContainText('0 /');
  });

  test('rejects an outdated backend limit source', async ({ page }) => {
    await bootPlans(page, {
      body: {
        success: true,
        plan: 'operator',
        usage_verified: true,
        used: { clients: 0, jobs_this_month: 0, ai_actions: 0, active_team_members: 0 },
        limits: { clients: 2000, jobs_per_month: 300, ai_actions: 300, active_team_members: 10 },
        limit_source: 'legacy_limits',
      },
    });

    const panel = page.locator('#churvox-plan-live-usage');
    await expect(panel).toBeVisible({ timeout: 10000 });
    await expect(panel.getByRole('heading', { name: 'Live usage is unavailable' })).toBeVisible();
    await expect(panel).toContainText('outdated plan-limit source');
    await expect(panel.locator('.cvUsageCard')).toHaveCount(0);
  });

  test('Control Board secure checkout opens Stripe from the exact plan card', async ({ page }) => {
    const getCheckoutPayload = await bootNewOwnerPlans(page);

    const commandCard = page.locator('[data-plan-card][data-stripe-plan="Command"]');
    const growthCard = page.locator('[data-plan-card][data-stripe-plan="Command Growth Pack"]');
    await expect(commandCard.getByRole('button', { name: 'Start Command', exact: true })).toBeVisible();
    await expect(growthCard.getByRole('button', { name: 'Add growth pack', exact: true })).toBeVisible();

    await commandCard.getByRole('button', { name: 'Start Command', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Command Stripe checkout' });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Owner email').fill('owner@example.test');
    await dialog.getByRole('button', { name: 'Continue to Stripe' }).click();
    await expect(page).toHaveURL(/checkout\.stripe\.com\/c\/pay\/churvox-new-plans-test/);

    const payload = getCheckoutPayload();
    expect(payload).toBeTruthy();
    expect(payload.plan).toBe('enterprise');
    expect(payload.plan_key).toBe('command');
    expect(payload.selected_plan).toBe('command');
    expect(payload.email).toBe('owner@example.test');
    expect(payload.success_url).toContain('/billing/success?plan=command&country=NZ');
    expect(payload.cancel_url).toContain('/plans?checkout=cancelled&plan=command');
  });
});
