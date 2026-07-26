const { test, expect } = require('@playwright/test');

const OWNER = Object.freeze({
  id: 'logout-readable-owner',
  email: 'owner-test@churvox.invalid',
  role: 'owner',
  user_role: 'owner',
  email_verified: true,
  has_app_access: true,
  subscription_status: 'active',
  plan: 'command',
  business_id: 'logout-readable-business',
  stripe_subscription_id: 'sub_safe_test',
});

function json(body, status = 200) {
  return { status, contentType: 'application/json', body: JSON.stringify(body) };
}

async function installOwnerApi(page) {
  let loggedOut = false;
  let logoutRequests = 0;

  await page.addInitScript(() => {
    localStorage.setItem('token', 'safe-owner-token');
    localStorage.setItem('authToken', 'safe-owner-token');
    localStorage.setItem('churvox:stable-current-plan:v1', 'command');
  });

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;

    if (pathname === '/api/auth/logout') {
      loggedOut = true;
      logoutRequests += 1;
      await route.fulfill(json({ success: true }));
      return;
    }

    if (pathname === '/api/auth/me') {
      await route.fulfill(loggedOut
        ? json({ success: false, user: null }, 401)
        : json({ success: true, user: OWNER, ...OWNER }));
      return;
    }

    if (/\/command\/(?:scan|slips|events|audit|decisions)/i.test(pathname)) {
      await route.fulfill(json({ success: true, slips: [], decisions: [], events: [], audit: [], safety: 'Nothing was sent, synced, charged or changed.' }));
      return;
    }

    await route.fulfill(json({
      success: true,
      data: [],
      items: [],
      rows: [],
      records: [],
      jobs: [],
      clients: [],
      customers: [],
      workers: [],
      team: [],
      quotes: [],
      invoices: [],
      messages: [],
      slips: [],
      decisions: [],
      events: [],
      audit: [],
      profile: {},
      context: {},
      safety: 'Nothing was sent, synced, charged or changed.',
    }));
  });

  return { logoutCount: () => logoutRequests };
}

async function visibleLogout(page) {
  const native = page.locator('.cvSiteLogout:visible, [data-churvox-native-logout="true"]:visible').first();
  if (await native.isVisible().catch(() => false)) return native;
  return page.locator('[data-churvox-visible-logout="true"]:visible, [data-churvox-emergency-logout="true"]:visible').first();
}

for (const route of ['/dashboard', '/dashboard#settings']) {
  test(`owner can always see and use Log out on ${route}`, async ({ page }) => {
    const api = await installOwnerApi(page);
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.cvOwnerReady')).toBeVisible();

    const logout = await visibleLogout(page);
    await expect(logout).toBeVisible();
    await expect(logout).toContainText(/log out/i);

    const logoutMetrics = await logout.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        width: rect.width,
        height: rect.height,
        fontSize: parseFloat(style.fontSize),
        pointerEvents: style.pointerEvents,
        opacity: Number(style.opacity || 1),
        insideViewport: rect.left >= -1 && rect.top >= -1 && rect.right <= innerWidth + 1 && rect.bottom <= innerHeight + 1,
      };
    });

    expect(logoutMetrics.width).toBeGreaterThanOrEqual(112);
    expect(logoutMetrics.height).toBeGreaterThanOrEqual(48);
    expect(logoutMetrics.fontSize).toBeGreaterThanOrEqual(16);
    expect(logoutMetrics.pointerEvents).not.toBe('none');
    expect(logoutMetrics.opacity).toBeGreaterThan(0.9);
    expect(logoutMetrics.insideViewport).toBe(true);

    const typography = await page.evaluate(() => {
      const visible = (element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0.05 && rect.width > 1 && rect.height > 1;
      };
      const sizes = (selector) => [...document.querySelectorAll(selector)]
        .filter(visible)
        .map((element) => parseFloat(getComputedStyle(element).fontSize))
        .filter(Number.isFinite);
      return {
        navigation: sizes('.cvOwnerPrimaryNav button, .cvOwnerMore > button, .cvOwnerUtilityNav button'),
        paragraphs: sizes('.cvOwnerReady p'),
        supporting: sizes('.cvOwnerReady small'),
        cacheResetVersion: localStorage.getItem('churvox:owner-ui-cache-reset'),
      };
    });

    expect(typography.navigation.length).toBeGreaterThan(2);
    expect(Math.min(...typography.navigation)).toBeGreaterThanOrEqual(16);
    expect(typography.paragraphs.length).toBeGreaterThan(0);
    expect(Math.min(...typography.paragraphs)).toBeGreaterThanOrEqual(17);
    if (typography.supporting.length) expect(Math.min(...typography.supporting)).toBeGreaterThanOrEqual(15);
    expect(typography.cacheResetVersion).toBe('owner-readable-logout-20260724-v4');

    await logout.click();
    await page.waitForURL(/\/login\?logged_out=1/, { timeout: 10_000 });
    expect(api.logoutCount()).toBe(1);

    const authState = await page.evaluate(() => ({
      token: localStorage.getItem('token'),
      authToken: localStorage.getItem('authToken'),
      plan: localStorage.getItem('churvox:stable-current-plan:v1'),
      logoutLock: sessionStorage.getItem('churvox:logged-out'),
    }));
    expect(authState.token).toBeNull();
    expect(authState.authToken).toBeNull();
    expect(authState.plan).toBeNull();
    expect(authState.logoutLock).toBeTruthy();
  });
}
