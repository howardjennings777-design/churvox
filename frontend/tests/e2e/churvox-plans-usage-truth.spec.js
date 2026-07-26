const { test, expect } = require('@playwright/test');

function json(body, status = 200) {
  return { status, contentType: 'application/json', body: JSON.stringify(body) };
}

async function bootPlans(page, options = {}) {
  const user = {
    id: 'plans-owner',
    business_id: 'plans-owner',
    email: 'owner@example.test',
    role: 'owner',
    plan: 'pro',
    ui_plan: 'operator',
    subscription_status: 'active',
    stripe_subscription_id: 'sub_plans_usage',
    has_app_access: true,
    email_verified: true,
  };

  await page.addInitScript((snapshotUser) => {
    localStorage.setItem('token', 'plans-token');
    localStorage.setItem('authToken', 'plans-token');
    localStorage.setItem('churvox:stable-current-plan:v1', 'operator');
    localStorage.setItem('churvox:billing-country', 'NZ');
    localStorage.setItem('churvox_auth_session_snapshot_v1', JSON.stringify({ at: Date.now(), token: 'plans-token', user: snapshotUser }));
  }, user);

  let usageRequests = 0;
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (/\/api\/auth\/(?:me|check|session)$/.test(path)) return route.fulfill(json({ success: true, user, ...user }));
    if (path === '/api/billing/subscription-status') {
      if (options.subscriptionError) return route.fulfill(json({ success: false, detail: 'Billing profile unavailable' }, 503));
      return route.fulfill(json({ success: true, plan: 'pro', current_plan: 'operator', subscription_status: 'active', stripe_subscription_id: 'sub_plans_usage', has_app_access: true }));
    }
    if (path === '/api/plan/usage') {
      usageRequests += 1;
      return route.fulfill(json({ success: false, detail: 'Standalone Plans does not display unverified live usage.' }, 410));
    }
    if (path === '/api/billing/start-checkout-form') {
      return route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>Stripe checkout handoff</body></html>' });
    }
    if (path === '/api/platform/visit') return route.fulfill(json({ ok: true }));
    return route.fulfill(json({ success: true, items: [], data: [] }));
  });

  await page.goto('/plans?country=NZ', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.cvStandalonePlansRoute')).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole('heading', { name: 'Churvox does the admin. You approve.' })).toBeVisible();
  await expect(page.locator('.cvPlanSelect select')).toHaveValue('NZ');
  return { user, usageRequestCount: () => usageRequests };
}

async function openFromDashboard(page) {
  await page.goto('/dashboard#plans', { waitUntil: 'domcontentloaded' });
  await expect.poll(() => page.url(), { timeout: 10000 }).toMatch(/\/plans(?:[?#]|$)/i);
  await expect(page.locator('.cvStandalonePlansRoute')).toBeVisible({ timeout: 10000 });
}

test.describe('Standalone Plans billing truth', () => {
  test('dashboard Plans entry opens the standalone billing page', async ({ page }) => {
    await bootPlans(page);
    await openFromDashboard(page);
  });

  test('shows the current Operator plan and exact locked allowances in NZD', async ({ page }) => {
    await bootPlans(page);

    const current = page.locator('.cvPlanCurrentBox');
    await expect(current).toContainText('Operator');

    const panel = page.locator('.cvPlanPanel');
    await expect(panel.getByRole('heading', { name: 'Operator allowances' })).toBeVisible();
    await expect(panel).toContainText('Active workers');
    await expect(panel).toContainText('15 included');
    await expect(panel).toContainText('Clients');
    await expect(panel).toContainText('3000 included');
    await expect(panel).toContainText('Jobs/month');
    await expect(panel).toContainText('500 included');
    await expect(panel).toContainText('AI actions/month');
    await expect(panel).toContainText('500 included');
    await expect(panel.getByText('Usage count hidden here')).toHaveCount(4);

    const cards = page.locator('.cvPlanCards');
    await expect(cards).toContainText('$39/month + GST');
    await expect(cards).toContainText('$89/month + GST');
    await expect(cards).toContainText('$149/month + GST');
    await expect(cards).toContainText('$299/month + GST');
    await expect(page.getByText('USD price set in Stripe')).toHaveCount(0);
  });

  test('does not invent live usage when counters are unavailable', async ({ page }) => {
    const state = await bootPlans(page, { subscriptionError: true });

    await expect(page.locator('.cvPlanPanel')).toContainText('Usage count hidden here');
    await expect(page.locator('.cvPlansPage')).not.toContainText(/\b0\s*\/\s*(?:15|500|3000)\b/);
    expect(state.usageRequestCount(), 'Standalone Plans should not request or display unverified live usage counters').toBe(0);
  });

  test('secure checkout submits the selected Command plan with NZ billing', async ({ page }) => {
    await bootPlans(page);

    const commandCard = page.locator('.cvPlanCard').filter({ hasText: 'Command' }).last();
    await expect(commandCard).toBeVisible();
    await commandCard.click();
    await expect(page.locator('.cvPlanSelected').getByRole('heading', { name: 'Command' })).toBeVisible();

    const requestPromise = page.waitForRequest((request) => new URL(request.url()).pathname === '/api/billing/start-checkout-form');
    await page.locator('.cvPlanCheckout').getByRole('button', { name: 'Buy selected plan' }).click();
    const request = await requestPromise;
    const payload = new URLSearchParams(request.postData() || '');

    expect(payload.get('plan')).toBe('enterprise');
    expect(payload.get('ui_plan')).toBe('enterprise');
    expect(payload.get('country')).toBe('NZ');
    expect(payload.get('accounting_sync')).toBe('1');
    expect(payload.get('growth_packs')).toBe('0');
    expect(payload.get('token')).toBe('plans-token');
  });
});
