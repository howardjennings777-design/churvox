const { test, expect } = require('@playwright/test');

const OWNER_EMAIL = process.env.CHURVOX_OWNER_EMAIL || process.env.CHURVOX_E2E_OWNER_EMAIL || '';
const OWNER_PASSWORD = process.env.CHURVOX_OWNER_PASSWORD || process.env.CHURVOX_E2E_OWNER_PASSWORD || '';
const WORKER_EMAIL = process.env.CHURVOX_WORKER_EMAIL || process.env.CHURVOX_E2E_WORKER_EMAIL || '';
const WORKER_PASSWORD = process.env.CHURVOX_WORKER_PASSWORD || process.env.CHURVOX_E2E_WORKER_PASSWORD || '';
const RUN_MUTATION = /^(1|true|yes)$/i.test(process.env.CHURVOX_E2E_MUTATE || '');
const TESTER_EMAIL = process.env.CHURVOX_TESTER_EMAIL || process.env.CHURVOX_E2E_TESTER_EMAIL || `tester-${Date.now()}@example.com`;

async function gotoFast(page, route) {
  await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(async () => {
    await page.evaluate((target) => { window.location.href = target; }, route).catch(() => null);
  });
}

async function bodyText(page) {
  return (await page.locator('body').innerText({ timeout: 8000 }).catch(() => '')).replace(/\s+/g, ' ').trim();
}

async function noFatalUi(page, label = page.url()) {
  const text = await bodyText(page);
  expect(text.length, `${label} should render useful text`).toBeGreaterThan(40);
  expect(text, `${label} should not show fatal UI`).not.toMatch(/Something went wrong|Application error|Cannot read properties|undefined is not an object|Minified React error|ChunkLoadError|Script error/i);
  return text;
}

async function fillAny(page, name, value) {
  const locators = [
    page.getByLabel(new RegExp(name, 'i')).first(),
    page.getByPlaceholder(new RegExp(name, 'i')).first(),
    page.locator(`input[name*="${name}" i], textarea[name*="${name}" i]`).first(),
  ];
  for (const locator of locators) {
    if (await locator.isVisible().catch(() => false)) {
      await locator.fill(String(value));
      return true;
    }
  }
  return false;
}

async function clickButtonLike(page, matcher) {
  const candidates = [
    page.getByRole('button', { name: matcher }).first(),
    page.getByRole('link', { name: matcher }).first(),
    page.locator('button, a, input[type="submit"]').filter({ hasText: matcher }).first(),
  ];
  for (const locator of candidates) {
    if (await locator.isVisible().catch(() => false)) {
      await locator.click();
      return true;
    }
  }
  return false;
}

async function login(page, email, password) {
  await gotoFast(page, '/login');
  await fillAny(page, 'email', email);
  await fillAny(page, 'password', password);
  const clicked = await clickButtonLike(page, /sign in|log in|login/i);
  if (!clicked) await page.locator('form button[type="submit"], button[type="submit"], input[type="submit"]').first().click();
  await page.waitForLoadState('domcontentloaded').catch(() => null);
  await page.waitForTimeout(1200);
}

async function browserApiGet(page, path) {
  return page.evaluate(async (urlPath) => {
    const token = window.localStorage.getItem('token') || '';
    const response = await fetch(urlPath, {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const text = await response.text();
    return { status: response.status, text };
  }, path);
}

async function mobileFit(page, route) {
  await page.setViewportSize({ width: 412, height: 915 });
  await gotoFast(page, route);
  await page.waitForTimeout(350);
  const result = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const sw = Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0);
    const text = (document.body?.innerText || '').replace(/\s+/g, ' ').trim();
    return { overflow: sw - vw, text };
  });
  expect(result.text.length, `${route} should render text`).toBeGreaterThan(60);
  expect(result.overflow, `${route} should not horizontally overflow mobile`).toBeLessThanOrEqual(16);
  expect(result.text).not.toMatch(/Something went wrong|Application error|Cannot read properties|undefined is not an object/i);
  return result.text;
}

test.describe('Churvox paid launch full audit', () => {
  test('public trust, contact, pricing, auth and setup routes render cleanly on desktop and mobile', async ({ page }) => {
    for (const route of ['/', '/features', '/pricing', '/about', '/security', '/contact', '/support', '/refunds-cancellations', '/login', '/signup', '/setup-guide?first_setup=1']) {
      await gotoFast(page, route);
      const text = await noFatalUi(page, route);
      if (route === '/contact') expect(text).toMatch(/hello@churvox\.com|support|billing|setup/i);
      if (route === '/security') expect(text).toMatch(/Owner approval|Stripe|card data|accounting/i);
      if (route === '/refunds-cancellations') expect(text).toMatch(/trial|cancellation|refund|billing/i);
    }

    for (const route of ['/contact', '/support', '/signup?tester=1&email=mobile-tester%40example.com', '/worker/today']) {
      await mobileFit(page, route);
    }
  });

  test('tester signup link is tester-specific, locks the invited email, and avoids normal plan-choice copy', async ({ page }) => {
    const invited = 'tester-audit@example.com';
    await gotoFast(page, `/signup?tester=1&email=${encodeURIComponent(invited)}`);
    const text = await noFatalUi(page, 'tester signup');
    expect(text).toMatch(/Tester access|Create your tester account|No Stripe checkout needed|unlock your tester access/i);
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    await expect(emailInput).toHaveValue(invited);
    await expect(emailInput).toHaveJSProperty('readOnly', true);
    expect(text).not.toMatch(/Create account and choose plan/i);
  });

  test('billing return and help path never strand a user inside locked support', async ({ page }) => {
    await gotoFast(page, '/billing/cancel');
    let text = await noFatalUi(page, 'billing cancel');
    expect(text).toMatch(/Checkout cancelled|Plan setup|Back to Plans|Need help/i);

    const help = page.getByRole('link', { name: /Need help/i }).first();
    if (await help.isVisible().catch(() => false)) {
      await help.click();
      await page.waitForLoadState('domcontentloaded').catch(() => null);
      expect(new URL(page.url()).pathname).toBe('/contact');
      text = await noFatalUi(page, 'billing help contact');
      expect(text).toMatch(/hello@churvox\.com|Contact Churvox|support/i);
    }
  });

  test('worker public shell and payment card area are safe without exposing owner actions', async ({ page }) => {
    await gotoFast(page, '/worker/today');
    const text = await noFatalUi(page, 'worker route');
    expect(text).toMatch(/Worker|Today|Jobs|Messages|Help|Sign in|Login/i);
    expect(text).not.toMatch(/Approve invoice|Send invoice now|File tax|bank payout|automatic invoice sending/i);
  });

  test('owner login can reach app owner cockpit and tester controls when credentials are supplied', async ({ page }) => {
    test.skip(!OWNER_EMAIL || !OWNER_PASSWORD, 'Owner credentials not supplied.');
    await login(page, OWNER_EMAIL, OWNER_PASSWORD);
    await gotoFast(page, '/admin');
    const text = await noFatalUi(page, 'app owner cockpit');
    expect(text).toMatch(/Tester|Control|Owner|Cockpit|Churvox/i);
    expect(text).not.toMatch(/Something went wrong|Application error|failed to fetch/i);
  });

  test('owner can add a tester when mutation mode is explicitly enabled', async ({ page }) => {
    test.skip(!RUN_MUTATION, 'Mutation test disabled. Set CHURVOX_E2E_MUTATE=1 to actually add a tester.');
    test.skip(!OWNER_EMAIL || !OWNER_PASSWORD, 'Owner credentials not supplied.');

    await login(page, OWNER_EMAIL, OWNER_PASSWORD);
    await gotoFast(page, '/admin');
    await noFatalUi(page, 'app owner cockpit before tester add');

    await fillAny(page, 'email', TESTER_EMAIL);
    await fillAny(page, 'name', 'Paid Launch Tester');
    await fillAny(page, 'business', 'Paid Launch Test Business');
    await clickButtonLike(page, /Add tester|Save tester|Grant|Send/i);
    await page.waitForTimeout(2200);
    const text = await noFatalUi(page, 'app owner cockpit after tester add');
    expect(text).toMatch(new RegExp(TESTER_EMAIL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
    expect(text).toMatch(/Tester email sent|Tester access granted|Tester saved|access/i);
  });

  test('worker login reaches worker jobs and payment wording when credentials are supplied', async ({ page }) => {
    test.skip(!WORKER_EMAIL || !WORKER_PASSWORD, 'Worker credentials not supplied.');
    await login(page, WORKER_EMAIL, WORKER_PASSWORD);
    await gotoFast(page, '/worker/jobs');
    const text = await noFatalUi(page, 'worker jobs');
    expect(text).toMatch(/Worker|Jobs|Today|Messages|Help|Payment|card|reader|Locked|Take card payment/i);
    expect(text).not.toMatch(/Approve|tax filing|bank payout/i);
  });

  test('backend paid-launch routes answer when owner credentials are supplied', async ({ page }) => {
    test.skip(!OWNER_EMAIL || !OWNER_PASSWORD, 'Owner credentials not supplied.');
    await login(page, OWNER_EMAIL, OWNER_PASSWORD);

    const checks = [
      { path: '/api/billing/subscription-status', ok: /plan|subscription_status|has_app_access|free_tester_access/i },
      { path: '/api/payments/on-site/status', ok: /terminal_ready|stripe_configured|worker_can_change_bank|required_plan/i },
      { path: '/api/command/recovery-sweep', ok: /success|created|items|message/i },
    ];

    for (const item of checks) {
      const response = await browserApiGet(page, item.path);
      expect(response.status, `${item.path} should not server-error`).toBeLessThan(500);
      expect(response.text, `${item.path} should return expected shape`).toMatch(item.ok);
    }
  });
});
