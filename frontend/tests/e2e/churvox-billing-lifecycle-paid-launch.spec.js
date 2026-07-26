const { test, expect } = require('@playwright/test');

function json(body, status = 200) {
  return { status, contentType: 'application/json', body: JSON.stringify(body) };
}

async function installPaidOwnerApi(page) {
  const owner = {
    id: 'billing-owner',
    business_id: 'billing-owner',
    email: 'owner@real.test',
    role: 'owner',
    plan: 'pro',
    subscription_status: 'active',
    stripe_customer_id: 'cus_paid_launch',
    stripe_subscription_id: 'sub_paid_launch',
    has_app_access: true,
    email_verified: true,
  };
  const calls = [];

  await page.addInitScript((user) => {
    window.localStorage.setItem('token', 'paid-owner-token');
    window.localStorage.setItem('churvox_auth_session_snapshot_v1', JSON.stringify({ at: Date.now(), token: 'paid-owner-token', user }));
  }, owner);

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    let payload = null;
    try { payload = request.postDataJSON(); } catch {}
    calls.push({ path, method: request.method(), payload });

    if (/\/api\/auth\/(?:me|check|session)$/.test(path)) return route.fulfill(json({ success: true, user: owner, ...owner }));
    if (path === '/api/billing/subscription-status') return route.fulfill(json({ success: true, ...owner }));
    if (path === '/api/billing/create-portal-session') return route.fulfill(json({ success: true, url: 'https://billing.stripe.com/p/session-test' }));
    if (path === '/api/platform/visit') return route.fulfill(json({ ok: true }));
    return route.fulfill(json({ success: true, items: [], rows: [], data: [] }));
  });

  return { calls, owner };
}

test.describe('Paid customer billing lifecycle', () => {
  test('Plans exposes secure billing management for a Stripe-backed account', async ({ page }) => {
    const api = await installPaidOwnerApi(page);
    await page.goto('/plans', { waitUntil: 'domcontentloaded' });

    const desktopNavigation = page.locator('.freshSide');
    await expect(desktopNavigation).toBeVisible();
    await expect(desktopNavigation.getByRole('button', { name: 'Plans', exact: true })).toHaveClass(/active/);
    await expect(desktopNavigation.getByRole('button', { name: 'Smart Hub', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Manage billing' })).toBeVisible();

    const navigation = page.waitForURL(/billing\.stripe\.com/i, { timeout: 10000 }).catch(() => null);
    await page.getByRole('button', { name: 'Manage billing' }).click();
    await navigation;

    const portalCall = api.calls.find((item) => item.path === '/api/billing/create-portal-session');
    expect(portalCall).toBeTruthy();
    expect(portalCall.method).toBe('POST');
  });

  test('billing cancellation return explains no plan change occurred', async ({ page }) => {
    await page.route('**/api/**', async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (/\/api\/auth\/(?:me|check|session)$/.test(path)) return route.fulfill(json({ detail: 'Not authenticated' }, 401));
      if (path === '/api/platform/visit') return route.fulfill(json({ ok: true }));
      return route.fulfill(json({ success: true }));
    });
    await page.goto('/billing/cancelled?plan=operator&country=NZ', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Checkout cancelled/i })).toBeVisible();
    await expect(page.getByText(/No plan or add-on changes were made/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Back to Plans/i })).toBeVisible();
  });

  test('live billing and deletion routes are mounted but protected', async ({ request }) => {
    test.skip(process.env.CHURVOX_RUN_LIVE_ROUTE_CHECKS !== '1', 'Deployment checks run in the credential-free live audit after Render deploys the current main head.');
    const apiBase = String(process.env.PLAYWRIGHT_API_BASE || 'https://grassley-backend.onrender.com').replace(/\/$/, '');

    const portal = await request.post(`${apiBase}/api/billing/create-portal-session`, { data: {}, timeout: 30000 });
    expect([401, 403]).toContain(portal.status());

    const deletion = await request.delete(`${apiBase}/api/account/self-delete`, {
      data: { confirmation: 'DELETE MY ACCOUNT' },
      timeout: 30000,
    });
    expect([401, 403]).toContain(deletion.status());
  });
});
