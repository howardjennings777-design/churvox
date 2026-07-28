const { test, expect } = require('@playwright/test');

function json(body, status = 200) {
  return { status, contentType: 'application/json', body: JSON.stringify(body) };
}

function owner(overrides = {}) {
  return {
    id: 'login-owner',
    business_id: 'login-owner',
    email: 'owner@login.test',
    role: 'owner',
    plan: 'pro',
    ui_plan: 'operator',
    subscription_status: 'active',
    stripe_subscription_id: 'sub_login_owner',
    has_app_access: true,
    email_verified: true,
    ...overrides,
  };
}

function worker(overrides = {}) {
  return {
    id: 'login-worker',
    business_id: 'login-owner',
    email: 'worker@login.test',
    role: 'worker',
    user_role: 'worker',
    worker_role: 'worker',
    worker_id: 'login-worker',
    is_worker: true,
    plan: 'worker',
    subscription_status: 'worker',
    has_app_access: true,
    email_verified: true,
    ...overrides,
  };
}

async function installLoginApi(page, options = {}) {
  const calls = [];
  let loggedIn = Boolean(options.initialUser);
  let currentUser = options.initialUser || null;
  let loginFailures = Number(options.loginFailures || 0);
  let postLoginMeFailures = Number(options.postLoginMeFailures || 0);
  const failPostLoginMeAlways = Boolean(options.failPostLoginMeAlways);

  if (options.initialUser) {
    await page.addInitScript((user) => {
      localStorage.setItem('token', 'existing-session-token');
      localStorage.setItem('churvox_auth_session_snapshot_v1', JSON.stringify({ at: Date.now(), token: 'existing-session-token', user }));
      localStorage.setItem('churvox:stable-current-plan:v1', 'command');
      localStorage.setItem('churvox:addon:accounting_sync', 'true');
    }, options.initialUser);
  }

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    let payload = {};
    try { payload = request.postDataJSON() || {}; } catch {}
    calls.push({ path, method: request.method(), payload });

    if (path === '/api/auth/login') {
      if (loginFailures > 0) {
        loginFailures -= 1;
        return route.fulfill(json({ detail: 'Temporary Render service failure' }, 503));
      }
      if (options.loginStatus) return route.fulfill(json(options.loginBody || { detail: 'Login failed' }, options.loginStatus));
      currentUser = options.loginUser || owner({ email: String(payload.email || '').toLowerCase() });
      loggedIn = true;
      return route.fulfill(json({ success: true, token: 'fresh-login-token', version: 'churvox-login-paid-launch-final-20260712', user: currentUser, ...currentUser }));
    }
    if (path === '/api/worker/auth/login') {
      currentUser = options.workerUser || worker({ email: String(payload.email || '').toLowerCase() });
      loggedIn = true;
      return route.fulfill(json({ success: true, token: 'fresh-worker-token', user: currentUser, ...currentUser }));
    }
    if (/\/api\/auth\/(?:me|check|session)$/.test(path)) {
      if (!loggedIn) return route.fulfill(json({ detail: 'Not authenticated' }, 401));
      if (failPostLoginMeAlways || postLoginMeFailures > 0) {
        if (postLoginMeFailures > 0) postLoginMeFailures -= 1;
        return route.fulfill(json({ detail: 'Session service unavailable' }, 503));
      }
      return route.fulfill(json({ success: true, user: currentUser, ...currentUser }));
    }
    if (path === '/api/auth/logout') {
      loggedIn = false;
      currentUser = null;
      return route.fulfill(json({ success: true }));
    }
    if (path === '/api/auth/resend-verification') {
      if (options.resendFails) return route.fulfill(json({ success: false, email_verification_sent: false, detail: 'Provider did not confirm delivery' }, 502));
      if (options.alreadyVerifiedOnResend) {
        currentUser = { ...currentUser, email_verified: true, has_app_access: true };
        return route.fulfill(json({ success: true, email_verified: true, email_verification_sent: false }));
      }
      return route.fulfill(json({ success: true, email_verification_sent: true, email_verification_provider: 'postmark' }));
    }
    if (path === '/api/auth/reset-password') return route.fulfill(json({ success: true, sessions_revoked: true }));
    if (path === '/api/platform/visit') return route.fulfill(json({ ok: true }));
    if (path === '/api/healthz') return route.fulfill(json({ ok: true }));
    return route.fulfill(json({ success: true, items: [], rows: [], data: [], decisions: [], audit: [], counts: {} }));
  });

  return { calls };
}

async function signIn(page, email = 'owner@login.test') {
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('LongEnough8');
  await page.getByRole('button', { name: 'Open Churvox', exact: true }).click();
}

test.describe('Paid-launch login and recovery', () => {
  test('owner returns to the exact safe dashboard section requested', async ({ page }) => {
    await installLoginApi(page);
    await page.goto('/login?next=%2Fdashboard%23clients', { waitUntil: 'domcontentloaded' });
    await signIn(page);
    await expect.poll(() => page.url()).toMatch(/\/dashboard#clients$/);
    await expect(page.locator('.cvOwnerReady')).toBeVisible();
  });

  test('external return URLs are ignored', async ({ page }) => {
    await installLoginApi(page);
    await page.goto('/login?next=https%3A%2F%2Fevil.example%2Fsteal', { waitUntil: 'domcontentloaded' });
    await signIn(page);
    await expect.poll(() => page.url()).toMatch(/\/dashboard(?:#(?:today|smart))?$/);
    expect(page.url()).not.toContain('evil.example');
  });

  test('first-time worker can sign in through the main login form', async ({ page }) => {
    await installLoginApi(page, { loginUser: worker() });
    await page.goto('/login?worker=1', { waitUntil: 'domcontentloaded' });
    await signIn(page, 'worker@login.test');
    await expect.poll(() => page.url()).toMatch(/\/worker\/today/);
  });

  test('owner login retries transient Render failures without worker fallback', async ({ page }) => {
    const api = await installLoginApi(page, { loginFailures: 2 });
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await signIn(page);
    await expect.poll(() => page.url(), {
      timeout: 90_000,
      intervals: [300, 600, 1000, 1800, 3000, 5000],
    }).toMatch(/\/dashboard/);
    expect(api.calls.filter((call) => call.path === '/api/auth/login').length).toBeGreaterThanOrEqual(3);
    expect(api.calls.filter((call) => call.path === '/api/worker/auth/login')).toHaveLength(0);
  });

  test('owner login service outage never calls worker login', async ({ page }) => {
    const api = await installLoginApi(page, {
      loginStatus: 503,
      loginBody: { detail: 'Churvox protected API access is paused because the production JWT secret is not safely configured.' },
    });
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await signIn(page);
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('alert')).toContainText(/restarting|temporarily unavailable|try again/i, { timeout: 20_000 });
    expect(api.calls.filter((call) => call.path === '/api/worker/auth/login')).toHaveLength(0);
  });

  test('unverified owner is sent to verification pending and resend is confirmed', async ({ page }) => {
    await installLoginApi(page, { loginUser: owner({ email_verified: false, has_app_access: false }) });
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await signIn(page);
    await expect.poll(() => page.url()).toMatch(/\/verify-email\?pending=1/);
    await expect(page.getByRole('heading', { name: 'Verify your email' })).toBeVisible();
    await page.getByRole('button', { name: 'Resend verification email' }).click();
    await expect(page.getByText(/Verification email sent/i)).toBeVisible();
  });

  test('unverified owner refreshing a protected page is sent to verification, not Plans', async ({ page }) => {
    await installLoginApi(page, { initialUser: owner({ email_verified: false, has_app_access: false }) });
    await page.goto('/dashboard#clients', { waitUntil: 'domcontentloaded' });
    await expect.poll(() => page.url()).toMatch(/\/verify-email\?pending=1/);
    await expect(page.getByRole('heading', { name: 'Verify your email' })).toBeVisible();
    expect(page.url()).not.toMatch(/\/plans/);
  });

  test('verification page does not claim delivery when provider fails', async ({ page }) => {
    await installLoginApi(page, { initialUser: owner({ email_verified: false, has_app_access: false }), resendFails: true });
    await page.goto('/verify-email?pending=1&email=owner%40login.test', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Verify your email' })).toBeVisible();
    await page.getByRole('button', { name: 'Resend verification email' }).click();
    await expect(page.getByText(/Provider did not confirm delivery|could not be confirmed/i)).toBeVisible();
    await expect(page.getByText(/Verification email sent/i)).toHaveCount(0);
  });

  test('resend opens the account when another tab already verified the email', async ({ page }) => {
    await installLoginApi(page, { initialUser: owner({ email_verified: false, has_app_access: false }), alreadyVerifiedOnResend: true });
    await page.goto('/verify-email?pending=1&email=owner%40login.test', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Resend verification email' }).click();
    await expect(page.getByRole('heading', { name: 'Email verified' })).toBeVisible();
    await expect.poll(() => page.url()).toMatch(/\/dashboard/);
  });

  test('login retries a temporary session confirmation outage', async ({ page }) => {
    await installLoginApi(page, { postLoginMeFailures: 1 });
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await signIn(page);
    await expect.poll(() => page.url()).toMatch(/\/dashboard/);
  });

  test('login does not navigate when the new session cannot be confirmed', async ({ page }) => {
    await installLoginApi(page, { failPostLoginMeAlways: true });
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await signIn(page);
    await expect(page).toHaveURL(/\/login/);
    await expect.poll(async () => {
      return (await page.locator('[role="alert"]').textContent().catch(() => '')) || '';
    }, {
      timeout: 120_000,
      intervals: [300, 600, 1000, 1800, 3000, 5000],
    }).toMatch(/session could not be confirmed/i);
  });

  test('friendly lockout message is shown', async ({ page }) => {
    await installLoginApi(page, { loginStatus: 429, loginBody: { detail: 'Too many failed attempts. Try again in 15 minutes.' } });
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await signIn(page);
    await expect(page.getByRole('alert')).toContainText(/15 minutes/i);
  });

  test('reset page stays reachable while already signed in and clears old browser auth', async ({ page }) => {
    await installLoginApi(page, { initialUser: owner() });
    await page.goto('/reset-password?token=valid-reset-token', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Set a new password.' })).toBeVisible();
    await page.getByTestId('reset-new-password-input').fill('NewPassword9');
    await page.getByTestId('reset-confirm-password-input').fill('NewPassword9');
    await page.getByTestId('reset-password-submit-button').click();
    await expect(page.getByTestId('reset-password-success')).toBeVisible();
    await expect.poll(() => page.evaluate(() => localStorage.getItem('token'))).toBeNull();
    await expect.poll(() => page.evaluate(() => localStorage.getItem('churvox:stable-current-plan:v1'))).toBeNull();
    await expect.poll(() => page.evaluate(() => localStorage.getItem('churvox:addon:accounting_sync'))).toBeNull();
  });
});
