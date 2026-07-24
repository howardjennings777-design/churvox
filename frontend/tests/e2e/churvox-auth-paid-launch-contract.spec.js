const { test, expect } = require('@playwright/test');

function json(body, status = 200) {
  return { status, contentType: 'application/json', body: JSON.stringify(body) };
}

async function installAuthApi(page, options = {}) {
  const requests = [];
  const owner = {
    id: 'auth-owner',
    business_id: 'auth-owner',
    email: 'owner@real.test',
    role: 'owner',
    plan: 'pro',
    subscription_status: 'active',
    stripe_subscription_id: 'sub_auth_owner',
    has_app_access: true,
    email_verified: true,
  };
  let currentUser = owner;

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    let payload = null;
    try { payload = request.postDataJSON(); } catch {}
    requests.push({ pathname, method: request.method(), payload });

    if (pathname === '/api/auth/register') {
      currentUser = { ...owner, email: payload.email, has_app_access: false, subscription_status: 'none', stripe_subscription_id: '', email_verified: false };
      return route.fulfill(json({ success: true, token: 'signup-token', user: currentUser, email_verification_sent: true, email_verification_provider: 'postmark' }));
    }
    if (pathname === '/api/auth/login') {
      currentUser = owner;
      return route.fulfill(json({ success: true, token: 'login-token', user: owner }));
    }
    if (/\/api\/auth\/(?:me|check|session)$/.test(pathname)) {
      if (options.initiallyLoggedOut && !requests.some((item) => item.pathname === '/api/auth/login')) return route.fulfill(json({ detail: 'Not authenticated' }, 401));
      return route.fulfill(json({ success: true, user: currentUser, ...currentUser }));
    }
    if (pathname === '/api/lifecycle/welcome') return route.fulfill(json({ success: true }));
    if (pathname === '/api/platform/visit') return route.fulfill(json({ ok: true }));
    return route.fulfill(json({ success: true, items: [], rows: [], data: [] }));
  });

  return { requests, owner };
}

async function fillSignup(page, password) {
  await page.getByLabel('Full name').fill('Paid Launch Owner');
  await page.getByLabel('Email').fill('paidlaunch@example.com');
  await page.getByLabel('Business name').fill('Paid Launch Business');
  const passwords = page.locator('input[type="password"]');
  await passwords.nth(0).fill(password);
  await passwords.nth(1).fill(password);
}

function createAccountButton(page) {
  return page.getByRole('button', { name: /^Create account(?: and choose plan)?$/i });
}

test.describe('Paid-launch auth contract', () => {
  test('signup blocks short passwords and missing policy consent', async ({ page }) => {
    await installAuthApi(page);
    await page.goto('/signup?plan=operator&country=NZ', { waitUntil: 'domcontentloaded' });

    await fillSignup(page, 'short7');
    await page.locator('input[name="termsAccepted"]').check();
    await createAccountButton(page).click();
    await expect(page.getByText('Password must be at least 8 characters.')).toBeVisible();

    await page.locator('input[type="password"]').nth(0).fill('LongEnough8');
    await page.locator('input[type="password"]').nth(1).fill('LongEnough8');
    await page.locator('input[name="termsAccepted"]').uncheck();
    await createAccountButton(page).click();
    await expect(page.getByText(/Agree to the Terms of Service and Privacy Policy/i)).toBeVisible();
  });

  test('signup records consent and carries the selected plan into verification', async ({ page }) => {
    const api = await installAuthApi(page);
    await page.goto('/signup?plan=operator&country=NZ', { waitUntil: 'domcontentloaded' });
    await fillSignup(page, 'LongEnough8');
    await page.locator('input[name="termsAccepted"]').check();
    await createAccountButton(page).click();
    await page.waitForURL(/\/verify-email\?.*plan=operator/i);
    await expect(page.getByRole('heading', { name: 'Verify your email' })).toBeVisible();

    const registration = api.requests.find((item) => item.pathname === '/api/auth/register');
    expect(registration).toBeTruthy();
    expect(registration.payload.selected_plan).toBe('operator');
    expect(registration.payload.terms_accepted).toBe(true);
    expect(registration.payload.privacy_accepted).toBe(true);
    expect(registration.payload.terms_version).toBe('2026-07-12');
    expect(registration.payload.privacy_version).toBe('2026-07-12');
  });

  test('login honours a safe Plans return path', async ({ page }) => {
    await installAuthApi(page, { initiallyLoggedOut: true });
    await page.goto('/login?next=%2Fplans%3Fplan%3Doperator', { waitUntil: 'domcontentloaded' });
    await page.getByLabel('Email').fill('owner@real.test');
    await page.getByLabel('Password').fill('LongEnough8');
    await page.getByRole('button', { name: 'Open Churvox' }).click();
    await page.waitForURL(/\/plans\?plan=operator/i);
  });

  test('normal owner cannot open the worker app', async ({ page }) => {
    await installAuthApi(page);
    await page.goto('/worker/today', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/dashboard/i);
    expect(page.url()).not.toContain('/worker/');
  });
});
