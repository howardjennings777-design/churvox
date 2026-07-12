const { test, expect } = require('@playwright/test');

function json(body, status = 200) {
  return { status, contentType: 'application/json', body: JSON.stringify(body) };
}

async function installCheckoutApi(page, { verified }) {
  const user = {
    id: 'checkout-owner',
    business_id: 'checkout-owner',
    email: 'owner@real.test',
    role: 'owner',
    plan: 'pro',
    subscription_status: 'trialing',
    stripe_customer_id: 'cus_checkout',
    stripe_subscription_id: 'sub_checkout',
    has_app_access: verified,
    email_verified: verified,
  };
  const calls = [];

  await page.addInitScript((snapshot) => {
    window.localStorage.setItem('token', 'checkout-token');
    window.localStorage.setItem('churvox_auth_session_snapshot_v1', JSON.stringify({ at: Date.now(), token: 'checkout-token', user: snapshot }));
  }, user);

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    calls.push({ path, method: request.method() });

    if (/\/api\/auth\/(?:me|check|session)$/.test(path)) return route.fulfill(json({ success: true, user, ...user }));
    if (path === '/api/billing/confirm-checkout') return route.fulfill(json({ success: true, plan: 'pro', subscription_status: 'trialing', stripe_customer_id: 'cus_checkout', stripe_subscription_id: 'sub_checkout' }));
    if (path === '/api/billing/subscription-status') return route.fulfill(json({ success: true, ...user }));
    if (path === '/api/auth/resend-verification') return route.fulfill(json({ success: true, email_verification_sent: true, email_verification_provider: 'postmark' }));
    if (path === '/api/platform/visit') return route.fulfill(json({ ok: true }));
    return route.fulfill(json({ success: true, data: [] }));
  });

  return { calls, user };
}

test.describe('Billing return email verification gate', () => {
  test('confirmed checkout stays on verification screen until email is verified', async ({ page }) => {
    const api = await installCheckoutApi(page, { verified: false });
    await page.goto('/billing/success?session_id=cs_test_verified_gate&plan=pro&country=NZ', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: 'Verify your email' })).toBeVisible();
    await expect(page.getByText(/subscription is safe/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open setup now' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Resend verification email' })).toBeVisible();

    await page.getByRole('button', { name: 'Resend verification email' }).click();
    await expect(page.getByText(/Verification email sent/i)).toBeVisible();
    expect(api.calls.some((item) => item.path === '/api/auth/resend-verification')).toBe(true);
  });

  test('verified checkout opens setup path', async ({ page }) => {
    await installCheckoutApi(page, { verified: true });
    await page.goto('/billing/success?session_id=cs_test_verified_owner&plan=pro&country=NZ', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: 'Plan active' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open setup now' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Resend verification email' })).toHaveCount(0);
  });
});
