const { test, expect } = require('@playwright/test');

function json(body, status = 200) {
  return { status, contentType: 'application/json', body: JSON.stringify(body) };
}

async function bootOwnerPlans(page, { checkoutFails = false } = {}) {
  const user = {
    id: 'billing-truth-owner',
    business_id: 'billing-truth-owner',
    email: 'billing-truth@example.test',
    role: 'owner',
    plan: 'pro',
    ui_plan: 'operator',
    subscription_status: 'active',
    has_app_access: true,
    email_verified: true,
  };
  let addonCheckoutCalls = 0;
  let planCheckoutCalls = 0;

  await page.addInitScript((snapshotUser) => {
    localStorage.setItem('token', 'billing-truth-token');
    localStorage.setItem('authToken', 'billing-truth-token');
    localStorage.setItem('churvox:stable-current-plan:v1', 'operator');
    localStorage.setItem('churvox:selected-plan', 'command');
    localStorage.setItem('churvox:billing-plan', 'command');
    localStorage.setItem('churvox_auth_session_snapshot_v1', JSON.stringify({
      at: Date.now(),
      token: 'billing-truth-token',
      user: snapshotUser,
    }));
  }, user);

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;

    if (/\/api\/auth\/(?:me|check|session)$/.test(path)) return route.fulfill(json({ success: true, user, ...user }));
    if (path === '/api/billing/subscription-status') {
      return route.fulfill(json({ success: true, current_plan: 'operator', plan: 'pro', subscription_status: 'active' }));
    }
    if (path === '/api/plan/usage') {
      return route.fulfill(json({ success: true, plan: 'operator', current_plan: 'operator' }));
    }
    if (path === '/api/billing/addons') return route.fulfill(json({ success: true, growth_packs: 0 }));
    if (path === '/api/billing/create-addon-checkout-session') {
      addonCheckoutCalls += 1;
      return route.fulfill(json({ success: false, detail: 'Command plan required' }, 403));
    }
    if ([
      '/api/billing/create-checkout-session',
      '/api/stripe/create-checkout-session',
      '/api/billing/checkout',
      '/api/stripe/checkout',
    ].includes(path)) {
      planCheckoutCalls += 1;
      return route.fulfill(checkoutFails
        ? json({ success: false, detail: 'Checkout unavailable for test' }, 503)
        : json({ success: true, url: 'https://checkout.stripe.com/c/pay/billing-truth-test' }));
    }
    if (path === '/api/platform/visit') return route.fulfill(json({ ok: true }));
    return route.fulfill(json({ success: true, items: [], data: [] }));
  });

  await page.goto('/dashboard#plans', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Choose the level of control Churvox runs for the business.' })).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole('button', { name: 'Select Command to buy packs' })).toBeVisible({ timeout: 10000 });

  return {
    addonCheckoutCalls: () => addonCheckoutCalls,
    planCheckoutCalls: () => planCheckoutCalls,
  };
}

test.describe('Billing plan truth', () => {
  test('ignores stale selected-plan storage and keeps Growth Packs locked to confirmed Command', async ({ page }) => {
    const calls = await bootOwnerPlans(page);

    await expect.poll(() => page.evaluate(() => ({
      selected: localStorage.getItem('churvox:selected-plan'),
      billing: localStorage.getItem('churvox:billing-plan'),
      confirmed: localStorage.getItem('churvox:stable-current-plan:v1'),
    }))).toEqual({ selected: null, billing: null, confirmed: 'operator' });

    await page.getByRole('button', { name: 'Select Command to buy packs' }).click();
    await expect(page.getByText('Growth Packs are only available with Command.')).toBeVisible();
    expect(calls.addonCheckoutCalls()).toBe(0);
  });

  test('failed plan checkout clears pending state and never promotes the selected plan', async ({ page }) => {
    const calls = await bootOwnerPlans(page, { checkoutFails: true });

    await page.locator('.cvPlansGrid button').filter({ hasText: 'Command' }).click();
    await page.getByRole('button', { name: 'Continue to secure checkout' }).click();

    await expect(page.getByRole('alert')).toContainText('Checkout unavailable for test');
    expect(calls.planCheckoutCalls()).toBe(4);

    const storage = await page.evaluate(() => ({
      pending: localStorage.getItem('churvox:pending-checkout:v1'),
      selected: localStorage.getItem('churvox:selected-plan'),
      billing: localStorage.getItem('churvox:billing-plan'),
      confirmed: localStorage.getItem('churvox:stable-current-plan:v1'),
    }));
    expect(storage).toEqual({ pending: null, selected: null, billing: null, confirmed: 'operator' });
  });
});
