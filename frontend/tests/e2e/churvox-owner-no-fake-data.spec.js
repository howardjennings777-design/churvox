const { test, expect } = require('@playwright/test');

const OWNER_SCREENS = ['today', 'command', 'jobs', 'schedule', 'recurring', 'clients', 'messages', 'crew', 'field', 'timesheets', 'access', 'quotes', 'invoices', 'money', 'accounting', 'settings', 'plans', 'support'];
const FORBIDDEN_SAMPLE_COPY = /Example preview records|Starter structure|Sample workspace|Example client|Belmont Villas|Northwood|Cam added a note|Jay asked|Monthly cleaning quote|Local Property Services/i;
const OLD_INJECTED_UI = '#churvox-paid-launch-stable-owner-text, #churvox-paid-launch-client-form, [id^="churvox-paid-launch-fallback-"], .cvxPaidLaunchFallbackForm';

function json(body, status = 200) {
  return { status, contentType: 'application/json', body: JSON.stringify(body) };
}

async function installEmptyOwnerApi(page) {
  const owner = {
    id: 'owner-safe-test',
    business_id: 'business-safe-test',
    email: 'owner-safe-test@churvox.test',
    role: 'owner',
    plan: 'operator',
    subscription_status: 'active',
    has_app_access: true,
    stripe_customer_id: 'cus_safe_test',
  };

  await page.addInitScript(() => {
    sessionStorage.removeItem('churvox:logged-out');
    localStorage.setItem('token', 'owner-safe-token');
    localStorage.setItem('authToken', 'owner-safe-token');
    localStorage.setItem('access_token', 'owner-safe-token');
  });

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    const method = request.method();

    if (/\/auth\/(?:me|check|session)$/i.test(pathname)) {
      await route.fulfill(json({ success: true, user: owner, ...owner }));
      return;
    }
    if (/\/command\/human-mimic-marker/i.test(pathname)) {
      await route.fulfill(json({ success: true, version: 'human-mimic-intelligence-v3', roles: new Array(8).fill('role'), safety: 'Nothing was sent, synced, charged or changed.' }));
      return;
    }
    if (/\/command\/scan/i.test(pathname)) {
      await route.fulfill(json({ success: true, source: 'human-mimic-intelligence-v3', slips: [], existing: [], created_count: 0, existing_count: 0, roles_checked: [], role_counts: {}, safety: 'Nothing was sent, synced, charged or changed.' }));
      return;
    }
    if (/\/command\/(?:slips|events|audit)/i.test(pathname) && method === 'GET') {
      await route.fulfill(json({ success: true, slips: [], events: [], audit: [] }));
      return;
    }
    if (/\/logic\/business-profile/i.test(pathname)) {
      await route.fulfill(json({ success: true, profile: {}, business_profile: {} }));
      return;
    }
    if (/\/industry\/(?:profiles|context)/i.test(pathname)) {
      await route.fulfill(json({ success: true, profiles: [], context: {} }));
      return;
    }
    if (/\/xero\/status|\/accounting\/status/i.test(pathname)) {
      await route.fulfill(json({ success: true, connected: false, status: 'disconnected', tenant_name: '' }));
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
      events: [],
      audit: [],
      profile: {},
      context: {},
    }));
  });
}

async function openScreen(page, screen) {
  await page.goto(screen === 'today' ? '/dashboard' : `/dashboard#${screen}`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 1500 }).catch(() => null);
  await expect(page.locator('[data-churvox-layout="fresh-studio"]')).toBeVisible();
  await expect(page.locator('.cvsWorkspace')).toBeVisible();
  await expect(page.locator(`.cvsStudio.page-${screen}`)).toBeVisible();
  await page.waitForTimeout(250);
}

test.describe('Live owner dashboard truthfulness', () => {
  test.beforeEach(async ({ page }) => {
    await installEmptyOwnerApi(page);
  });

  test('empty live business never receives preview or fallback records', async ({ page }) => {
    test.setTimeout(150_000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error' && !/favicon|manifest|ResizeObserver|AbortError|net::ERR_ABORTED/i.test(message.text())) errors.push(message.text());
    });

    for (const screen of OWNER_SCREENS) {
      await openScreen(page, screen);
      const text = (await page.locator('.cvsWorkspace').innerText()).replace(/\s+/g, ' ').trim();
      expect(text, `${screen} exposed sample/fallback business data`).not.toMatch(FORBIDDEN_SAMPLE_COPY);
      await expect(page.locator(OLD_INJECTED_UI), `${screen} exposed injected fallback UI`).toHaveCount(0);
    }

    expect(errors, 'owner empty-state crawl must not produce runtime errors').toEqual([]);
  });
});
