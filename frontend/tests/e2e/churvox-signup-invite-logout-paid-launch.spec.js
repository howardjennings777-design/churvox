const { test, expect } = require('@playwright/test');

function json(body, status = 200) {
  return { status, contentType: 'application/json', body: JSON.stringify(body) };
}

function owner(overrides = {}) {
  return {
    id: 'lifecycle-owner',
    business_id: 'lifecycle-owner',
    email: 'owner@lifecycle.test',
    role: 'owner',
    plan: 'pro',
    ui_plan: 'operator',
    subscription_status: 'active',
    stripe_subscription_id: 'sub_lifecycle_owner',
    has_app_access: true,
    email_verified: true,
    ...overrides,
  };
}

async function routeLifecycleApi(page, options = {}) {
  const calls = [];
  let loggedIn = Boolean(options.initialUser);
  let currentUser = options.initialUser || null;
  let logoutCalled = false;

  if (options.initialUser) {
    await page.addInitScript((user) => {
      localStorage.setItem('token', 'lifecycle-access-token');
      localStorage.setItem('authToken', 'lifecycle-access-token');
      localStorage.setItem('churvox_auth_session_snapshot_v1', JSON.stringify({ at: Date.now(), token: 'lifecycle-access-token', user }));
      localStorage.setItem('churvox:stable-current-plan:v1', 'command');
      localStorage.setItem('churvox:plan-override', 'command');
      localStorage.setItem('churvox:addon:accounting_sync', 'true');
      localStorage.setItem('churvox:addon:command_growth_pack', '4');
      localStorage.setItem('churvox:billing-plan', 'command');
    }, options.initialUser);
  }

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    let payload = {};
    try { payload = request.postDataJSON() || {}; } catch {}
    calls.push({ path, method: request.method(), payload });

    if (path === '/api/auth/register') {
      if (options.registerStatus) return route.fulfill(json(options.registerBody || { detail: 'Registration failed' }, options.registerStatus));
      currentUser = {
        id: 'new-owner',
        business_id: 'new-owner',
        email: String(payload.email || '').toLowerCase(),
        name: payload.name,
        role: 'employer',
        plan: 'none',
        selected_plan: payload.selected_plan,
        subscription_status: 'none',
        email_verified: false,
        has_app_access: false,
        billing_lock_reason: 'verify_email_and_choose_plan',
      };
      loggedIn = true;
      return route.fulfill(json({
        success: true,
        token: 'new-account-token',
        consent_recorded: true,
        email_verification_sent: true,
        version: 'churvox-registration-verification-paid-launch-20260712',
        user: currentUser,
        ...currentUser,
      }));
    }
    if (path === '/api/auth/login') {
      currentUser = options.loginUser || owner({ email: String(payload.email || '').toLowerCase() });
      loggedIn = true;
      return route.fulfill(json({ success: true, token: 'new-login-token', user: currentUser, ...currentUser }));
    }
    if (/\/api\/auth\/(?:me|check|session)$/.test(path)) {
      if (options.alwaysRestoreOwner) return route.fulfill(json({ success: true, user: options.alwaysRestoreOwner, ...options.alwaysRestoreOwner }));
      if (!loggedIn) return route.fulfill(json({ detail: 'Not authenticated' }, 401));
      return route.fulfill(json({ success: true, user: currentUser, ...currentUser }));
    }
    if (path === '/api/auth/logout') {
      logoutCalled = true;
      if (!options.keepServerSessionAfterLogout) {
        loggedIn = false;
        currentUser = null;
      }
      return route.fulfill(json({ success: true, revoked: ['access', 'refresh'], version: 'churvox-token-revocation-paid-launch-20260712' }));
    }
    if (path.startsWith('/api/invite/verify/')) {
      if (options.invalidInvite) return route.fulfill(json({ detail: 'Invalid or expired invite link' }, 400));
      return route.fulfill(json({ success: true, valid: true, email: 'worker@lifecycle.test', name: 'Worker One', role: 'worker', is_worker: true, business_name: 'Lifecycle Lawns', version: 'churvox-invite-security-paid-launch-20260712' }));
    }
    if (path === '/api/invite/accept') {
      if (options.inviteAcceptStatus) return route.fulfill(json(options.inviteAcceptBody || { detail: 'Invalid or expired invite link' }, options.inviteAcceptStatus));
      return route.fulfill(json({ success: true, email: 'worker@lifecycle.test', name: payload.name, role: 'worker', is_worker: true, version: 'churvox-invite-security-paid-launch-20260712' }));
    }
    if (path === '/api/platform/visit') return route.fulfill(json({ ok: true }));
    if (path === '/api/healthz') return route.fulfill(json({ ok: true }));
    return route.fulfill(json({ success: true, items: [], rows: [], data: [], decisions: [], audit: [], counts: {} }));
  });

  return { calls, logoutCalled: () => logoutCalled };
}

test.describe('Paid-launch signup, invite and logout lifecycle', () => {
  test('signup requires consent and sends the complete consent payload', async ({ page }) => {
    const api = await routeLifecycleApi(page);
    await page.goto('/signup?plan=operator&industry=lawn_care&country=NZ', { waitUntil: 'domcontentloaded' });

    await page.getByLabel('Full name').fill('New Owner');
    await page.getByLabel('Email').fill('NEW@EXAMPLE.TEST');
    await page.getByLabel('Business name').fill('New Lawns');
    await page.getByLabel('Password', { exact: true }).fill('StrongPass9');
    await page.getByLabel('Confirm password').fill('StrongPass9');
    await page.getByRole('button', { name: 'Create account', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText(/Terms of Service and Privacy Policy/i);
    expect(api.calls.filter((call) => call.path === '/api/auth/register')).toHaveLength(0);

    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Create account', exact: true }).click();
    await expect.poll(() => page.url()).toMatch(/\/verify-email\?pending=1/);

    const register = api.calls.find((call) => call.path === '/api/auth/register');
    expect(register).toBeTruthy();
    expect(register.payload.email).toBe('new@example.test');
    expect(register.payload.terms_accepted).toBe(true);
    expect(register.payload.privacy_accepted).toBe(true);
    expect(register.payload.terms_version).toBe('2026-07-12');
    expect(register.payload.privacy_version).toBe('2026-07-12');
    expect(register.payload.selected_plan).toBe('operator');
    expect(register.payload.trade_industry_type).toBeTruthy();
  });

  test('registration claim conflict gives a useful account-safe message', async ({ page }) => {
    await routeLifecycleApi(page, { registerStatus: 409, registerBody: { detail: 'Account creation is already in progress for this email.' } });
    await page.goto('/signup', { waitUntil: 'domcontentloaded' });
    await page.getByLabel('Full name').fill('New Owner');
    await page.getByLabel('Email').fill('new@example.test');
    await page.getByLabel('Password', { exact: true }).fill('StrongPass9');
    await page.getByLabel('Confirm password').fill('StrongPass9');
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Create account', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText(/already in progress/i);
  });

  test('valid worker invite enforces password length and completes once', async ({ page }) => {
    const api = await routeLifecycleApi(page);
    await page.goto('/invite/setup/valid-worker-token', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Set up your worker account' })).toBeVisible();
    await page.getByTestId('invite-setup-password-input').fill('short');
    await page.getByTestId('invite-setup-confirm-password-input').fill('short');
    await page.getByTestId('invite-setup-submit-button').click();
    await expect(page.getByRole('alert')).toContainText(/at least 8/i);
    expect(api.calls.filter((call) => call.path === '/api/invite/accept')).toHaveLength(0);

    await page.getByTestId('invite-setup-password-input').fill('WorkerPass9');
    await page.getByTestId('invite-setup-confirm-password-input').fill('WorkerPass9');
    await page.getByTestId('invite-setup-submit-button').click();
    await expect(page.getByTestId('invite-success-page')).toBeVisible();
    expect(api.calls.filter((call) => call.path === '/api/invite/accept')).toHaveLength(1);
    await page.getByTestId('invite-success-login-button').click();
    await expect.poll(() => page.url()).toMatch(/\/login\?worker=1&email=worker%40lifecycle\.test/);
  });

  test('used or expired invite never opens setup form', async ({ page }) => {
    await routeLifecycleApi(page, { invalidInvite: true });
    await page.goto('/invite/setup/used-token', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('invite-error-page')).toBeVisible();
    await expect(page.getByRole('alert')).toContainText(/invalid, expired, or has already been used/i);
    await expect(page.getByTestId('invite-setup-submit-button')).toHaveCount(0);
  });

  test('explicit logout clears account state and blocks stale cookie restoration', async ({ page }) => {
    const staleOwner = owner();
    const api = await routeLifecycleApi(page, { initialUser: staleOwner, keepServerSessionAfterLogout: true, alwaysRestoreOwner: staleOwner });
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.cvOwnerReady')).toBeVisible();

    const profile = page.locator('.cv7Profile');
    await profile.click();
    const logout = page.getByRole('button', { name: 'Log out', exact: true });
    await expect(logout).toBeVisible({ timeout: 8000 });
    await logout.click();
    await expect.poll(() => page.url()).toMatch(/\/login/);
    expect(api.logoutCalled()).toBe(true);

    for (const key of ['token', 'authToken', 'churvox_auth_session_snapshot_v1', 'churvox:stable-current-plan:v1', 'churvox:plan-override', 'churvox:addon:accounting_sync', 'churvox:addon:command_growth_pack', 'churvox:billing-plan']) {
      await expect.poll(() => page.evaluate((name) => localStorage.getItem(name), key)).toBeNull();
    }
  });

  test('deliberate login clears the signed-out lock and confirms a new account', async ({ page }) => {
    await routeLifecycleApi(page);
    await page.addInitScript(() => sessionStorage.setItem('churvox:logged-out', String(Date.now())));
    await page.goto('/login?logged_out=1', { waitUntil: 'domcontentloaded' });
    await page.getByLabel('Email').fill('second@lifecycle.test');
    await page.getByLabel('Password').fill('StrongPass9');
    await page.getByRole('button', { name: 'Open Churvox', exact: true }).click();
    await expect.poll(() => page.url()).toMatch(/\/dashboard/);
    await expect.poll(() => page.evaluate(() => sessionStorage.getItem('churvox:logged-out'))).toBeNull();
  });

  test('/admin/login uses the hardened shared login entry point', async ({ page }) => {
    await routeLifecycleApi(page);
    await page.goto('/admin/login', { waitUntil: 'domcontentloaded' });
    await expect.poll(() => page.url()).toMatch(/\/login\?.*admin=1/);
    await expect(page.getByRole('heading', { name: 'Open the right room.' })).toBeVisible();
  });
});
