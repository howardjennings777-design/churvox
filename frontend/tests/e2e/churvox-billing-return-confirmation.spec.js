const { test, expect } = require('@playwright/test');

function json(body, status = 200) {
  return { status, contentType: 'application/json', body: JSON.stringify(body) };
}

test('Stripe return stays pending until billing reports the requested plan', async ({ page }) => {
  let confirmedPlan = 'operator';
  const user = {
    id: 'billing-return-owner',
    business_id: 'billing-return-owner',
    email: 'billing-return@example.test',
    role: 'owner',
    plan: 'pro',
    ui_plan: 'operator',
    subscription_status: 'active',
    stripe_customer_id: 'cus_billing_return_test',
    stripe_subscription_id: 'sub_billing_return_test',
    has_app_access: true,
    email_verified: true,
  };

  await page.addInitScript((snapshotUser) => {
    localStorage.setItem('token', 'billing-return-token');
    localStorage.setItem('authToken', 'billing-return-token');
    localStorage.setItem('churvox:stable-current-plan:v1', 'operator');
    localStorage.setItem('churvox:pending-checkout:v1', JSON.stringify({
      type: 'plan',
      ui_plan: 'command',
      plan: 'enterprise',
      saved_at: Date.now(),
    }));
    localStorage.setItem('churvox_auth_session_snapshot_v1', JSON.stringify({
      at: Date.now(),
      token: 'billing-return-token',
      user: snapshotUser,
    }));
  }, user);

  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    const plan = confirmedPlan;
    if (/\/api\/auth\/(?:me|check|session)$/.test(path)) {
      return route.fulfill(json({ success: true, user, ...user }));
    }
    if (path === '/api/billing/subscription-status') {
      return route.fulfill(json({
        success: true,
        current_plan: plan,
        ui_plan: plan,
        subscription_status: 'active',
        stripe_customer_id: 'cus_billing_return_test',
        stripe_subscription_id: 'sub_billing_return_test',
      }));
    }
    if (path === '/api/plan/usage') {
      return route.fulfill(json({ success: true, plan, current_plan: plan }));
    }
    if (path === '/api/billing/addons') {
      return route.fulfill(json({ success: true, growth_packs: 0 }));
    }
    if (path === '/api/platform/visit') return route.fulfill(json({ ok: true }));
    return route.fulfill(json({ success: true, items: [], data: [] }));
  });

  await page.goto('/dashboard?checkout=success&plan=command#plans', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Choose the level of control Churvox runs for the business.' })).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole('status')).toContainText('Waiting for billing to confirm Command');
  await expect(page.getByRole('status')).toContainText('confirmed plan is still Operator');
  await expect(page.getByRole('button', { name: 'Select Command to buy packs' })).toBeVisible();

  const pendingBeforeConfirmation = await page.evaluate(() => JSON.parse(localStorage.getItem('churvox:pending-checkout:v1') || 'null'));
  expect(pendingBeforeConfirmation?.ui_plan).toBe('command');
  expect(await page.evaluate(() => localStorage.getItem('churvox:stable-current-plan:v1'))).toBe('operator');
  expect(new URL(page.url()).searchParams.get('checkout')).toBe('success');

  confirmedPlan = 'command';
  await page.reload({ waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('status')).toContainText('Command is confirmed from the billing account.');
  await expect(page.getByRole('button', { name: 'Buy 1 Growth Pack' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('churvox:pending-checkout:v1'))).toBe(null);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('churvox:stable-current-plan:v1'))).toBe('command');
  await expect.poll(() => new URL(page.url()).searchParams.get('checkout')).toBe(null);
});
