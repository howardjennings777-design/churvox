const { test, expect } = require('@playwright/test');

const API_BASE = (process.env.PLAYWRIGHT_API_BASE || 'https://grassley-backend.onrender.com').replace(/\/+$/, '');
const OWNER_EMAIL = process.env.CHURVOX_OWNER_EMAIL || process.env.CHURVOX_E2E_EMAIL || '';
const OWNER_PASSWORD = process.env.CHURVOX_OWNER_PASSWORD || process.env.CHURVOX_E2E_PASSWORD || '';
const WORKER_EMAIL = process.env.CHURVOX_WORKER_EMAIL || process.env.CHURVOX_E2E_WORKER_EMAIL || '';
const WORKER_PASSWORD = process.env.CHURVOX_WORKER_PASSWORD || process.env.CHURVOX_E2E_WORKER_PASSWORD || '';
const MUTATE = process.env.CHURVOX_E2E_MUTATE === '1';

const publicRoutes = ['/', '/pricing', '/login', '/signup', '/forgot-password'];
const appRoutes = [
  { name: 'Dashboard', url: '/dashboard' },
  { name: 'Command', url: '/dashboard#command' },
  { name: 'Jobs', url: '/dashboard#jobs' },
  { name: 'Clients', url: '/dashboard#clients' },
  { name: 'Workers', url: '/dashboard#workers' },
  { name: 'Messages', url: '/dashboard#messages' },
  { name: 'Quotes', url: '/dashboard#quotes' },
  { name: 'Invoices', url: '/dashboard#invoices' },
  { name: 'Settings', url: '/dashboard#settings' },
  { name: 'Plans', url: '/plans' },
];
const protectedBusinessEndpoints = [
  '/api/business/autopilot-score',
  '/api/office/live-feed',
  '/api/command/reason-cards',
  '/api/jobs/proof-pack',
  '/api/client-memory',
  '/api/owner/daily-closeout',
  '/api/industry/context',
  '/api/nav/attention-counts',
];
const protectedHqEndpoints = [
  '/api/admin/owner/business-logic-health',
  '/api/admin/owner/tester-friction',
  '/api/admin/owner/testers',
  '/api/admin/owner/unique-visitors',
];

function apiUrl(endpoint) {
  return `${API_BASE}${endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`}`;
}
function stamp() {
  return new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
}
function tokenFrom(data = {}) {
  return data?.token || data?.access_token || data?.auth_token || data?.jwt || data?.user?.token || data?.user?.access_token || '';
}
function userFrom(data = {}) {
  return data?.user || data?.data?.user || data?.data || data || {};
}
function safeJson(data = {}) {
  return JSON.stringify(data, (key, value) => /password|token|secret|hash/i.test(key) ? '[hidden]' : value).slice(0, 1400);
}
function selectorText(candidate) {
  return String(candidate instanceof RegExp ? candidate.source : candidate).replace(/[^a-z0-9_-]/gi, '').slice(0, 40);
}
async function waitHuman(page) {
  await page.waitForLoadState('domcontentloaded').catch(() => null);
  await page.waitForLoadState('networkidle', { timeout: 2500 }).catch(() => null);
  await page.waitForTimeout(350).catch(() => null);
}
async function bodyText(page) {
  return (await page.locator('body').innerText({ timeout: 12000 }).catch(() => '')).replace(/\s+/g, ' ').trim();
}
function installErrorWatch(page, errors) {
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (/favicon|manifest|ResizeObserver|AbortError|net::ERR_ABORTED|401|403|404|422|platform\/visit|Failed to fetch|NetworkError/i.test(text)) return;
    errors.push(`console: ${text.slice(0, 900)}`);
  });
  page.on('response', (response) => {
    const url = response.url();
    if (response.status() >= 500 && /churvox|grassley|onrender|localhost|127\.0\.0\.1/i.test(url)) errors.push(`http ${response.status()}: ${url}`);
  });
}
async function assertHumanPage(page, label, options = {}) {
  const result = await page.evaluate(() => {
    const visibleToHuman = (el) => {
      if (!el || el.closest('[hidden], [aria-hidden="true"]')) return false;
      if (typeof el.checkVisibility === 'function' && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 2 && rect.height > 2 && rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || '1') > 0.05;
    };
    const body = document.body;
    const text = (body?.innerText || '').replace(/\s+/g, ' ').trim();
    const scrollWidth = Math.max(document.documentElement.scrollWidth, body?.scrollWidth || 0);
    const viewportWidth = document.documentElement.clientWidth;
    const controls = [...document.querySelectorAll('button, a[href], input, textarea, select, [role="button"], summary')].filter(visibleToHuman);
    const tiny = controls.map((el) => {
      const rect = el.getBoundingClientRect();
      const labelText = (el.innerText || el.textContent || el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.getAttribute('name') || el.getAttribute('title') || '').replace(/\s+/g, ' ').trim();
      const type = (el.getAttribute('type') || '').toLowerCase();
      const okSmall = el.tagName === 'INPUT' && /checkbox|radio/.test(type);
      if (!okSmall && (rect.width < 14 || rect.height < 14)) return `${labelText || el.tagName} ${Math.round(rect.width)}x${Math.round(rect.height)}`;
      return null;
    }).filter(Boolean).slice(0, 20);
    const disabledPointer = controls.filter((el) => getComputedStyle(el).pointerEvents === 'none').map((el) => (el.innerText || el.getAttribute('aria-label') || el.tagName || '').replace(/\s+/g, ' ').trim()).slice(0, 20);
    return { text, textLength: text.length, controlCount: controls.length, overflow: scrollWidth - viewportWidth, tiny, disabledPointer };
  });

  expect(result.textLength, `${label} should not be blank. URL=${page.url()} TEXT=${result.text.slice(0, 500)}`).toBeGreaterThan(options.minText || 90);
  expect(result.controlCount, `${label} should have visible human controls`).toBeGreaterThan(options.minControls ?? 1);
  expect(result.overflow, `${label} should not horizontally overflow`).toBeLessThanOrEqual(options.maxOverflow ?? 18);
  expect(result.tiny, `${label} should not have tiny visible controls`).toEqual([]);
  expect(result.disabledPointer, `${label} should not show dead clickable controls`).toEqual([]);
  expect(result.text, `${label} must not show old fake business/example pollution`).not.toMatch(/ECB Property Maintenance|Focus Landscaping|Grassly|sample business|fake business|demo business/i);
  expect(result.text, `${label} should not be stuck loading`).not.toMatch(/loading your run sheet\s*$|loading\s*$|please wait\s*$/i);
}
async function assertSafeClickableControls(page, label) {
  const controls = await page.evaluate(() => {
    const visibleToHuman = (el) => {
      if (!el || el.closest('[hidden], [aria-hidden="true"]')) return false;
      if (typeof el.checkVisibility === 'function' && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 2 && rect.height > 2 && rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || '1') > 0.05;
    };
    return [...document.querySelectorAll('button, a[href], [role="button"], summary')].map((el, index) => {
      if (!visibleToHuman(el)) return null;
      const labelText = (el.innerText || el.textContent || el.getAttribute('aria-label') || el.getAttribute('title') || '').replace(/\s+/g, ' ').trim();
      const id = `human-gauntlet-control-${index}`;
      el.setAttribute('data-human-gauntlet-control', id);
      return { id, label: labelText, disabled: Boolean(el.disabled || el.getAttribute('aria-disabled') === 'true') };
    }).filter(Boolean).slice(0, 65);
  });
  const failures = [];
  for (const control of controls) {
    if (control.disabled) continue;
    if (/log out|logout|delete|remove|archive|trash|disconnect|revoke|checkout|stripe|pay now|send invoice|send quote|send email|send sms|confirm|approve|decline/i.test(control.label)) continue;
    const locator = page.locator(`[data-human-gauntlet-control="${control.id}"]`).first();
    if (!(await locator.isVisible().catch(() => false))) continue;
    await locator.scrollIntoViewIfNeeded().catch(() => null);
    await locator.click({ trial: true, timeout: 4500 }).catch((error) => failures.push(`${control.label || control.id}: ${error.message.split('\n')[0]}`));
  }
  expect(failures, `${label} visible safe controls should be physically clickable`).toEqual([]);
}
async function loginOwner(page) {
  if (!OWNER_EMAIL || !OWNER_PASSWORD) throw new Error('Missing CHURVOX_OWNER_EMAIL/CHURVOX_OWNER_PASSWORD for human business gauntlet owner tests.');
  const response = await page.request.post(apiUrl('/api/auth/login'), { data: { email: OWNER_EMAIL, password: OWNER_PASSWORD }, timeout: 25000 });
  const payload = await response.json().catch(async () => ({ text: await response.text().catch(() => '') }));
  if (!response.ok() || payload?.success === false) throw new Error(`Owner API login failed: ${response.status()} ${safeJson(payload)}`);
  const token = tokenFrom(payload);
  const user = userFrom(payload);
  await page.goto('/');
  await waitHuman(page);
  await page.evaluate(({ tokenValue, userValue }) => {
    if (tokenValue) window.localStorage.setItem('token', tokenValue);
    if (userValue?.email) window.localStorage.setItem('churvox_auth_session_snapshot_v1', JSON.stringify({ at: Date.now(), token: tokenValue, user: { ...userValue, token: tokenValue } }));
  }, { tokenValue: token, userValue: user });
  return { token, user };
}
async function fillFirstVisible(page, candidates, value) {
  for (const candidate of candidates) {
    const cssNeedle = selectorText(candidate);
    const locators = [
      page.getByLabel(candidate, { exact: false }).first(),
      page.getByPlaceholder(candidate, { exact: false }).first(),
      cssNeedle ? page.locator(`input[name*="${cssNeedle}" i], textarea[name*="${cssNeedle}" i], input[id*="${cssNeedle}" i], textarea[id*="${cssNeedle}" i]`).first() : null,
    ].filter(Boolean);
    for (const locator of locators) {
      if (!(await locator.isVisible().catch(() => false))) continue;
      await locator.fill(value).catch(async () => {
        await locator.click({ force: true }).catch(() => null);
        await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A').catch(() => null);
        await page.keyboard.type(value).catch(() => null);
      });
      return true;
    }
  }
  return false;
}
async function submitFirstVisible(page, labels = [/sign up/i, /create account/i, /start/i, /continue/i, /next/i]) {
  const submit = page.locator('button[type="submit"], input[type="submit"]').last();
  if (await submit.isVisible().catch(() => false)) {
    await submit.click().catch(() => null);
    await waitHuman(page);
    return true;
  }
  for (const label of labels) {
    const button = page.getByRole('button', { name: label }).first();
    if (await button.isVisible().catch(() => false)) {
      await button.click().catch(() => null);
      await waitHuman(page);
      return true;
    }
  }
  return false;
}
async function assertProtectedEndpointExists(page, endpoint, token = '') {
  const response = await page.request.get(apiUrl(endpoint), { headers: token ? { Authorization: `Bearer ${token}` } : {}, timeout: 20000 }).catch((error) => ({ status: () => 0, text: async () => String(error) }));
  const status = response.status();
  const body = await response.text().catch(() => '');
  expect(status, `${endpoint} should exist and not 500. Body=${body.slice(0, 600)}`).not.toBe(404);
  expect(status, `${endpoint} should not server-error. Body=${body.slice(0, 600)}`).toBeLessThan(500);
  return { status, body };
}

test.describe('Churvox full human business gauntlet', () => {
  test.setTimeout(300000);

  test('public website behaves like a real business front door', async ({ page }) => {
    const errors = [];
    installErrorWatch(page, errors);
    for (const route of publicRoutes) {
      await page.goto(route);
      await waitHuman(page);
      await assertHumanPage(page, `public ${route}`, { minText: route === '/forgot-password' ? 50 : 120 });
      await assertSafeClickableControls(page, `public ${route}`);
      const text = await bodyText(page);
      if (route === '/pricing') expect(text, 'pricing should show actual Churvox plans/prices').toMatch(/Start|Crew|Operator|Command|\$39|\$89|\$149|\$299/i);
      if (route === '/login') expect(text, 'login should have email/password path').toMatch(/email|password|log in|login/i);
      if (route === '/signup') expect(text, 'signup should push plan/trial business flow').toMatch(/trial|plan|start|account|business|email/i);
    }
    expect(errors).toEqual([]);
  });

  test('protected business-system endpoints exist and fail cleanly before login', async ({ page }) => {
    for (const endpoint of [...protectedBusinessEndpoints, ...protectedHqEndpoints]) {
      const result = await assertProtectedEndpointExists(page, endpoint);
      expect([200, 401, 403, 405].includes(result.status), `${endpoint} should be protected or readable, not broken`).toBeTruthy();
    }
  });

  test('normal signup stays on plan/Stripe gate, not free dashboard bypass', async ({ page }) => {
    test.skip(!MUTATE, 'Set CHURVOX_E2E_MUTATE=1 to run the signup-to-plan gate test with a safe unique test account.');
    const errors = [];
    installErrorWatch(page, errors);
    const id = stamp();
    const email = `human-gauntlet-${id}@example.com`;
    await page.goto('/signup');
    await waitHuman(page);
    await fillFirstVisible(page, [/business/i, /company/i, /name/i], `Human Gauntlet ${id}`);
    await fillFirstVisible(page, [/email/i], email);
    await fillFirstVisible(page, [/phone/i, /mobile/i], '0210000000');
    await fillFirstVisible(page, [/password/i], `Gauntlet-${id}!`);
    await submitFirstVisible(page);
    await page.waitForURL(/plans|pricing|checkout|stripe|signup|dashboard/i, { timeout: 30000 }).catch(() => null);
    await waitHuman(page);
    const url = page.url();
    const text = await bodyText(page);
    expect(`${url} ${text}`, 'fresh normal signup must be sent to plan/Stripe path before app access').toMatch(/plans|pricing|checkout|stripe|choose plan|Start|Crew|Operator|Command/i);
    expect(url, 'fresh normal signup must not land directly in dashboard').not.toMatch(/\/dashboard(?:$|[?#])/i);
    expect(text, 'fresh normal signup should not show owner app as unlocked').not.toMatch(/Autopilot, field feed and closeout|Office live feed|Command does the admin/i);
    expect(errors).toEqual([]);
  });

  test('owner dashboard loads like a real app and new business suite is present', async ({ page }) => {
    const errors = [];
    installErrorWatch(page, errors);
    const { token } = await loginOwner(page);
    for (const area of appRoutes) {
      await page.goto(area.url);
      await waitHuman(page);
      await assertHumanPage(page, area.name, { minText: 80 });
      await assertSafeClickableControls(page, area.name);
    }
    await page.goto('/dashboard');
    await waitHuman(page);
    await expect(page.locator('.cvsLoading')).toHaveCount(0, { timeout: 45000 });
    await expect(page.locator('[data-churvox-layout="fresh-studio"]')).toBeVisible();
    const text = await bodyText(page);
    expect(text, 'dashboard should expose the live Churvox Studio owner workspace').toMatch(/Today|Live records|Owner-controlled actions|Live business data/i);
    expect(text, 'dashboard should finish building the live business picture').not.toMatch(/Building the live business picture/i);
    for (const endpoint of protectedBusinessEndpoints) {
      const result = await assertProtectedEndpointExists(page, endpoint, token);
      expect([200, 401, 403].includes(result.status), `${endpoint} should be available or intentionally protected`).toBeTruthy();
    }
    expect(errors).toEqual([]);
  });

  test('HQ loads compact cards and tester/business health panels', async ({ page }) => {
    const errors = [];
    installErrorWatch(page, errors);
    const { token, user } = await loginOwner(page);
    const email = String(user?.email || OWNER_EMAIL || '').toLowerCase();
    if (email !== 'hello@churvox.com') throw new Error(`HQ gauntlet requires hello@churvox.com platform owner, got ${email}`);
    await page.goto('/admin');
    await waitHuman(page);
    await assertHumanPage(page, 'HQ admin', { minText: 100 });
    const text = await bodyText(page);
    expect(text, 'HQ should show unique/tester/business logic cards').toMatch(/Unique visitors|Tester invites|Business logic|Tester feedback|Accepted|Invited/i);
    for (const endpoint of protectedHqEndpoints) {
      const result = await assertProtectedEndpointExists(page, endpoint, token);
      expect([200, 401, 403].includes(result.status), `${endpoint} should be available or intentionally protected`).toBeTruthy();
    }
    expect(errors).toEqual([]);
  });

  test('worker app route loads on desktop and mobile without getting stuck', async ({ page }, testInfo) => {
    const errors = [];
    installErrorWatch(page, errors);
    const mobile = /mobile/i.test(testInfo.project.name || '');
    if (WORKER_EMAIL && WORKER_PASSWORD) {
      const response = await page.request.post(apiUrl('/api/worker/auth/login'), { data: { email: WORKER_EMAIL, password: WORKER_PASSWORD }, timeout: 20000 }).catch(() => null);
      const payload = response ? await response.json().catch(() => ({})) : {};
      const workerToken = tokenFrom(payload);
      await page.goto('/');
      await page.evaluate(({ tokenValue }) => { if (tokenValue) window.localStorage.setItem('token', tokenValue); }, { tokenValue: workerToken }).catch(() => null);
    }
    await page.goto('/worker');
    await waitHuman(page);
    await assertHumanPage(page, `worker app ${mobile ? 'mobile' : 'desktop'}`, { minText: 40, minControls: 1, maxOverflow: mobile ? 12 : 18 });
    const text = await bodyText(page);
    expect(text, 'worker app should show field/job/messaging UI or login, not hang forever').toMatch(/worker|today|jobs|messages|help|login|email|password|run sheet|field/i);
    expect(errors).toEqual([]);
  });
});
