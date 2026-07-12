const { test, expect } = require('@playwright/test');

const BASE_URL = (process.env.PLAYWRIGHT_BASE_URL || 'https://www.churvox.com').replace(/\/+$/, '');
const API_BASE = (process.env.PLAYWRIGHT_API_BASE || 'https://grassley-backend.onrender.com').replace(/\/+$/, '');
const OWNER_EMAIL = String(process.env.CHURVOX_OWNER_EMAIL || '').trim().toLowerCase();
const OWNER_PASSWORD = process.env.CHURVOX_OWNER_PASSWORD || '';
const WORKER_EMAIL = String(process.env.CHURVOX_WORKER_EMAIL || '').trim().toLowerCase();
const WORKER_PASSWORD = process.env.CHURVOX_WORKER_PASSWORD || process.env.CHURVOX_OWNER_PASSWORD || '';

const OWNER_ROUTES = [
  ['today', /today|churvox/i],
  ['command', /command|decision|approval/i],
  ['work', /jobs|work/i],
  ['clients', /clients/i],
  ['worker', /workers|field|worker/i],
  ['quotes', /quotes/i],
  ['invoices', /invoices/i],
  ['schedule', /schedule|calendar/i],
  ['messages', /messages/i],
  ['payroll', /payroll|hours|wages/i],
  ['integrations', /xero|integration|accounting/i],
  ['team', /how churvox works|office team|roles/i],
  ['activity', /activity|history|record/i],
  ['settings', /settings/i],
  ['plans', /plans|billing|checkout/i],
  ['help', /help|support/i],
];

const WORKER_ROUTES = [
  ['/worker/today', /today|job|worker/i],
  ['/worker/jobs', /jobs|assigned|work/i],
  ['/worker/messages', /messages|boss|office/i],
  ['/worker/help', /help|support|issue/i],
];

const FORBIDDEN_FINAL_URL = /\/(?:legacy-dashboard|fresh|office-team-lab|office-lab|new-command-lab|smart-hub|cockpit|jobs-board)(?:[/?#]|$)|\/plans(?:[/?#]|$)/i;
const FORBIDDEN_HREF = /\/(?:legacy-dashboard|fresh|office-team-lab|office-lab|new-command-lab|smart-hub|cockpit|jobs-board)(?:[/?#]|$)|\/plans(?:[/?#]|$)/i;
const FORBIDDEN_SELECTORS = [
  '.churvoxOptionC',
  '.freshPricingPage',
  '.cv3Product',
  '#option-f-plans-pricing-desk',
  '[data-legacy-dashboard]',
];
const FATAL_TEXT = /something went wrong|application error|cannot read properties|failed to render|minified react error|unexpected error|page not found/i;
const UNSAFE_CONTROL = /delete|remove|trash|archive|send|approve|charge|pay|payment|start job|pause|resume|complete|finish|acknowledge|save|create|add |new |invite|upload|import|export|sync|disconnect|connect xero|submit|mark paid|open stripe|secure checkout|billing portal|manage billing|log out|sign out/i;

function apiUrl(path) {
  return `${API_BASE}${path.startsWith('/api') ? path : `/api${path}`}`;
}

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function tokenFrom(payload = {}) {
  return payload?.token || payload?.access_token || payload?.auth_token || payload?.jwt || payload?.accessToken
    || payload?.user?.token || payload?.user?.access_token || payload?.user?.accessToken
    || payload?.data?.token || payload?.data?.access_token || payload?.data?.user?.token || '';
}

function emailFrom(payload = {}) {
  return String(payload?.email || payload?.user?.email || payload?.data?.email || payload?.data?.user?.email || '').trim().toLowerCase();
}

async function clearBrowser(page) {
  await page.goto(`${BASE_URL}/?human_audit_clear=${Date.now()}`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(async () => {
    localStorage.clear();
    sessionStorage.clear();
    try {
      const registrations = await navigator.serviceWorker?.getRegistrations?.();
      await Promise.all((registrations || []).map((registration) => registration.unregister()));
    } catch {}
    try {
      const keys = await caches?.keys?.();
      await Promise.all((keys || []).map((key) => caches.delete(key)));
    } catch {}
  });
}

async function loginThroughScreen(page, email, password, role) {
  if (!email || !password) throw new Error(`Missing real ${role} credentials. This audit fails rather than skipping.`);
  await clearBrowser(page);
  const loginUrl = role === 'worker' ? `${BASE_URL}/login?worker=1` : `${BASE_URL}/login`;
  await page.goto(loginUrl, { waitUntil: 'domcontentloaded' });
  await expect(page.getByLabel(/email/i).first()).toBeVisible({ timeout: 20_000 });
  await page.getByLabel(/email/i).first().fill(email);
  await page.getByLabel(/password/i).first().fill(password);
  await page.getByRole('button', { name: /sign in|log in/i }).first().click();
  await expect.poll(async () => clean(await page.locator('body').innerText().catch(() => '')), {
    message: `${role} stayed on the login screen`,
    timeout: 25_000,
    intervals: [300, 600, 1000, 1800, 3000],
  }).not.toMatch(/welcome back|sign in to see|forgot password/i);
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(900);
  return verifyCurrentAccount(page, email, role);
}

async function verifyCurrentAccount(page, expectedEmail, role) {
  const token = await page.evaluate(() => localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('access_token') || '');
  expect(token, `${role} browser login did not persist a token`).toBeTruthy();
  const response = await page.request.get(apiUrl('/api/auth/me'), {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 30_000,
  });
  const body = await response.json().catch(async () => ({ text: await response.text().catch(() => '') }));
  expect(response.status(), `${role} /api/auth/me failed: ${JSON.stringify(body).slice(0, 600)}`).toBe(200);
  expect(emailFrom(body), `${role} login returned the wrong account`).toBe(expectedEmail);
  return { token, body };
}

async function waitForRealContent(page, label) {
  await expect(page.locator('body')).toBeVisible({ timeout: 20_000 });
  await expect.poll(async () => clean(await page.locator('body').innerText().catch(() => '')).length, {
    message: `${label} stayed blank or on a loading shell`,
    timeout: 25_000,
    intervals: [250, 500, 900, 1500, 2500],
  }).toBeGreaterThan(90);
}

async function assertNoLegacy(page, label, expectedMarker = null) {
  await waitForRealContent(page, label);
  const current = page.url();
  expect(current, `${label} opened an old or standalone route`).not.toMatch(FORBIDDEN_FINAL_URL);
  const body = clean(await page.locator('body').innerText());
  expect(body, `${label} rendered a fatal/error boundary`).not.toMatch(FATAL_TEXT);
  if (expectedMarker) expect(body, `${label} did not render its own purpose`).toMatch(expectedMarker);

  for (const selector of FORBIDDEN_SELECTORS) {
    await expect(page.locator(selector), `${label} rendered legacy UI selector ${selector}`).toHaveCount(0);
  }

  const badLinks = await page.evaluate((source) => {
    const forbidden = new RegExp(source, 'i');
    return Array.from(document.querySelectorAll('a[href]'))
      .map((node) => ({ text: String(node.textContent || node.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim(), href: node.href }))
      .filter((item) => item.href && item.href.startsWith(location.origin) && forbidden.test(new URL(item.href).pathname));
  }, FORBIDDEN_HREF.source);
  expect(badLinks, `${label} contains links back to old routes: ${JSON.stringify(badLinks)}`).toEqual([]);
}

async function clickVisibleNavigation(page, label) {
  const control = page.getByRole('button', { name: new RegExp(`^${label}$`, 'i') }).first();
  if (!(await control.count())) return false;
  await expect(control, `${label} navigation should be visible`).toBeVisible({ timeout: 12_000 });
  await control.click();
  await page.waitForTimeout(450);
  await assertNoLegacy(page, `navigation ${label}`);
  return true;
}

async function safeControlSweep(page, routeLabel, limit = 18) {
  const candidates = await page.locator('button:visible, a[href]:visible').evaluateAll((nodes) => nodes.map((node, index) => ({
    index,
    tag: node.tagName.toLowerCase(),
    text: String(node.textContent || node.getAttribute('aria-label') || node.getAttribute('title') || '').replace(/\s+/g, ' ').trim(),
  })));
  const unique = [];
  const seen = new Set();
  for (const item of candidates) {
    const key = item.text.toLowerCase();
    if (!item.text || item.text.length > 90 || seen.has(key) || UNSAFE_CONTROL.test(item.text)) continue;
    seen.add(key);
    unique.push(item.text);
    if (unique.length >= limit) break;
  }

  let clicked = 0;
  for (const text of unique) {
    const target = page.getByRole('button', { name: text, exact: true }).or(page.getByRole('link', { name: text, exact: true })).first();
    if (!(await target.count()) || !(await target.isVisible().catch(() => false))) continue;
    const before = page.url();
    await target.click({ timeout: 8_000 }).catch(() => null);
    await page.waitForTimeout(300);
    await assertNoLegacy(page, `${routeLabel} control “${text}”`);
    clicked += 1;
    if (page.url() !== before && !page.url().includes('/dashboard') && !page.url().includes('/worker/')) {
      throw new Error(`${routeLabel} control “${text}” left the new app: ${page.url()}`);
    }
  }
  return clicked;
}

function attachRuntimeTraps(page, errors) {
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (/favicon|manifest|net::ERR_ABORTED|ResizeObserver loop/i.test(text)) return;
    errors.push(`console: ${text}`);
  });
  page.on('response', (response) => {
    const status = response.status();
    if (status < 500) return;
    errors.push(`HTTP ${status}: ${response.request().method()} ${response.url()}`);
  });
}

async function openOwnerHash(page, hash, marker) {
  await page.goto(`${BASE_URL}/dashboard#${hash}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(650);
  await assertNoLegacy(page, `owner ${hash}`, marker);
  await expect(page.locator('.cvOwnerReady'), `owner ${hash} is not the new owner OS`).toBeVisible({ timeout: 20_000 });
}

async function openWorkerPath(page, path, marker) {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(650);
  await assertNoLegacy(page, `worker ${path}`, marker);
  await expect(page.locator('[data-worker-view]'), `worker ${path} is not the strict Worker View`).toBeVisible({ timeout: 20_000 });
}

test.describe('Live hardcore human everything and no-legacy audit', () => {
  test.setTimeout(720_000);

  test('real owner: every new page, navigation group, safe control, refresh and logout stay in the new OS', async ({ browser }, testInfo) => {
    const context = await browser.newContext({ serviceWorkers: 'block' });
    const page = await context.newPage();
    const runtimeErrors = [];
    attachRuntimeTraps(page, runtimeErrors);

    await loginThroughScreen(page, OWNER_EMAIL, OWNER_PASSWORD, 'owner');
    await page.goto(`${BASE_URL}/dashboard#today`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.cvOwnerMainNavigation'), 'latest fixed owner navigation is not deployed').toBeVisible({ timeout: 25_000 });

    let auditedControls = 0;
    for (const [hash, marker] of OWNER_ROUTES) {
      await test.step(`owner page ${hash}`, async () => {
        await openOwnerHash(page, hash, marker);
        auditedControls += await safeControlSweep(page, `owner ${hash}`, /mobile/i.test(testInfo.project.name) ? 8 : 14);
      });
    }

    await openOwnerHash(page, 'today', /today|churvox/i);
    for (const label of ['Today', 'Command', 'Jobs', 'Clients', 'Workers', 'Quotes', 'Invoices']) {
      await clickVisibleNavigation(page, label);
    }

    await openOwnerHash(page, 'today', /today|churvox/i);
    await clickVisibleNavigation(page, 'More');
    const moreMenu = page.getByRole('menu', { name: /More tools/i });
    await expect(moreMenu).toBeVisible({ timeout: 10_000 });
    const box = await moreMenu.boundingBox();
    expect(box, 'More menu has no visible box').toBeTruthy();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual((await page.viewportSize()).width + 1);
    for (const item of await moreMenu.getByRole('menuitem').allTextContents()) {
      await openOwnerHash(page, 'today', /today|churvox/i);
      await clickVisibleNavigation(page, 'More');
      const menuItem = page.getByRole('menuitem', { name: clean(item), exact: true });
      await expect(menuItem).toBeVisible();
      await menuItem.click();
      await page.waitForTimeout(400);
      await assertNoLegacy(page, `More → ${clean(item)}`);
    }

    for (const label of ['Settings', 'Plans', 'Help']) {
      await openOwnerHash(page, 'today', /today|churvox/i);
      await clickVisibleNavigation(page, label);
    }

    await openOwnerHash(page, 'plans', /plans|billing|checkout/i);
    await expect(page.getByRole('button', { name: /Continue to secure checkout/i }), 'new in-app Stripe button is not deployed').toBeVisible();
    await expect(page.getByRole('button', { name: /^Open secure billing$/i }), 'old billing handoff button still exists').toHaveCount(0);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await assertNoLegacy(page, 'owner refresh persistence', /plans|billing|checkout/i);
    await verifyCurrentAccount(page, OWNER_EMAIL, 'owner after refresh');

    expect(auditedControls, `Too few owner controls were human-clicked on ${testInfo.project.name}`).toBeGreaterThan(/mobile/i.test(testInfo.project.name) ? 25 : 40);
    expect(runtimeErrors, `Owner runtime failures:\n${runtimeErrors.join('\n')}`).toEqual([]);

    await page.getByRole('button', { name: /Log out/i }).first().click();
    await expect.poll(() => page.url(), { timeout: 15_000 }).toMatch(/\/login/);
    const tokenAfter = await page.evaluate(() => localStorage.getItem('token') || localStorage.getItem('authToken') || '');
    expect(tokenAfter, 'owner logout left browser token behind').toBe('');
    await context.close();
  });

  test('real worker: every field page, safe control, role boundary, refresh and logout stay in Worker View', async ({ browser }, testInfo) => {
    const context = await browser.newContext({ serviceWorkers: 'block' });
    const page = await context.newPage();
    const runtimeErrors = [];
    attachRuntimeTraps(page, runtimeErrors);

    await loginThroughScreen(page, WORKER_EMAIL, WORKER_PASSWORD, 'worker');
    let auditedControls = 0;
    for (const [path, marker] of WORKER_ROUTES) {
      await test.step(`worker page ${path}`, async () => {
        await openWorkerPath(page, path, marker);
        auditedControls += await safeControlSweep(page, `worker ${path}`, /mobile/i.test(testInfo.project.name) ? 8 : 12);
      });
    }

    await page.goto(`${BASE_URL}/dashboard#today`, { waitUntil: 'domcontentloaded' });
    await expect.poll(() => page.url(), {
      message: 'worker remained inside owner dashboard',
      timeout: 15_000,
      intervals: [250, 500, 900, 1500],
    }).toMatch(/\/worker\//);
    await assertNoLegacy(page, 'worker blocked from owner dashboard');

    await openWorkerPath(page, '/worker/today', /today|job|worker/i);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await assertNoLegacy(page, 'worker refresh persistence', /today|job|worker/i);
    await verifyCurrentAccount(page, WORKER_EMAIL, 'worker after refresh');

    expect(auditedControls, `Too few worker controls were human-clicked on ${testInfo.project.name}`).toBeGreaterThan(/mobile/i.test(testInfo.project.name) ? 6 : 8);
    expect(runtimeErrors, `Worker runtime failures:\n${runtimeErrors.join('\n')}`).toEqual([]);

    const logout = page.getByRole('button', { name: /Log out/i }).first();
    await expect(logout).toBeVisible();
    await logout.click();
    await expect.poll(() => page.url(), { timeout: 15_000 }).toMatch(/\/login/);
    const tokenAfter = await page.evaluate(() => localStorage.getItem('token') || localStorage.getItem('authToken') || '');
    expect(tokenAfter, 'worker logout left browser token behind').toBe('');
    await context.close();
  });

  test('real role isolation: owner cannot enter Worker View and worker cannot enter owner, billing or HQ pages', async ({ browser }) => {
    const ownerContext = await browser.newContext({ serviceWorkers: 'block' });
    const ownerPage = await ownerContext.newPage();
    await loginThroughScreen(ownerPage, OWNER_EMAIL, OWNER_PASSWORD, 'owner');
    await ownerPage.goto(`${BASE_URL}/worker/today`, { waitUntil: 'domcontentloaded' });
    await expect.poll(() => ownerPage.url(), { timeout: 15_000 }).not.toMatch(/\/worker\/today(?:$|[?#])/);
    await assertNoLegacy(ownerPage, 'owner blocked from Worker View');
    await ownerContext.close();

    const workerContext = await browser.newContext({ serviceWorkers: 'block' });
    const workerPage = await workerContext.newPage();
    const { token } = await loginThroughScreen(workerPage, WORKER_EMAIL, WORKER_PASSWORD, 'worker');
    for (const path of ['/dashboard#today', '/dashboard#plans', '/plans', '/admin']) {
      await workerPage.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
      await pageSleep(500);
      expect(workerPage.url(), `worker reached forbidden owner route ${path}`).toMatch(/\/worker\/|\/login/);
      expect(workerPage.url(), `worker was sent to legacy route from ${path}`).not.toMatch(FORBIDDEN_FINAL_URL);
    }
    const hq = await workerPage.request.get(apiUrl('/api/admin/owner/paid-launch-report'), {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 30_000,
    });
    expect([401, 403], `worker reached owner-only HQ API with ${hq.status()}`).toContain(hq.status());
    await workerContext.close();
  });
});

function pageSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
