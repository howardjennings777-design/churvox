const { test, expect } = require('@playwright/test');

const BASE_URL = (process.env.PLAYWRIGHT_BASE_URL || 'https://www.churvox.com').replace(/\/+$/, '');
const API_BASE = (process.env.PLAYWRIGHT_API_BASE || 'https://grassley-backend.onrender.com').replace(/\/+$/, '');
const OWNER_EMAIL = String(process.env.CHURVOX_OWNER_EMAIL || '').trim().toLowerCase();
const OWNER_PASSWORD = process.env.CHURVOX_OWNER_PASSWORD || '';
const WORKER_EMAIL = String(process.env.CHURVOX_WORKER_EMAIL || '').trim().toLowerCase();
const WORKER_PASSWORD = process.env.CHURVOX_WORKER_PASSWORD || process.env.CHURVOX_OWNER_PASSWORD || '';

const OWNER_ROUTES = [
  ['today', /today|churvox/i],
  ['intelligence', /intelligence|money left|promise|what happens/i],
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

const MAIN_NAV = ['Today', 'Intelligence', 'Command', 'Jobs', 'Clients', 'Workers', 'Quotes', 'Invoices'];
const MORE_NAV = ['Schedule', 'Messages', 'Payroll', 'Xero', 'How Churvox works', 'Activity'];
const ACCOUNT_NAV = ['Settings', 'Plans', 'Help'];
const WORKER_ROUTES = [
  ['/worker/today', /today|job|worker/i],
  ['/worker/jobs', /jobs|assigned|work/i],
  ['/worker/messages', /messages|boss|office/i],
  ['/worker/help', /help|support|issue/i],
  ['/worker/settings', /worker access|field tools|me/i],
];

const FORBIDDEN_FINAL_URL = /\/(?:legacy-dashboard|fresh|office-team-lab|office-lab|new-command-lab|smart-hub|cockpit|jobs-board)(?:[/?#]|$)|\/plans(?:[/?#]|$)/i;
const FORBIDDEN_HREF = /\/(?:legacy-dashboard|fresh|office-team-lab|office-lab|new-command-lab|smart-hub|cockpit|jobs-board)(?:[/?#]|$)|\/plans(?:[/?#]|$)/i;
const FORBIDDEN_SELECTORS = ['.churvoxOptionC', '.freshPricingPage', '.cv3Product', '#option-f-plans-pricing-desk', '[data-legacy-dashboard]'];
const FATAL_TEXT = /something went wrong|application error|cannot read properties|failed to render|minified react error|unexpected error|page not found/i;
const UNSAFE_CONTROL = /delete|remove|trash|archive|send|approve|charge|pay|payment|start|pause|resume|complete|finish|acknowledge|save|create|add |new |invite|upload|import|export|sync|disconnect|connect xero|submit|mark paid|open stripe|secure checkout|billing portal|manage billing|log out|sign out/i;

function apiUrl(path) {
  return `${API_BASE}${path.startsWith('/api') ? path : `/api${path}`}`;
}

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
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

async function loginThroughScreen(page, email, password, role) {
  if (!email || !password) throw new Error(`Missing real ${role} credentials. This audit fails rather than skipping.`);
  await clearBrowser(page);
  await page.goto(role === 'worker' ? `${BASE_URL}/login?worker=1` : `${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel(/email/i).first().fill(email);
  await page.getByLabel(/password/i).first().fill(password);
  await page.getByRole('button', { name: /sign in|log in/i }).first().click();
  await page.waitForFunction(() => Boolean(localStorage.getItem('token')), null, { timeout: 30_000 });
  await expect.poll(() => page.url(), { timeout: 20_000 }).not.toMatch(/\/login(?:[?#]|$)/i);
  await page.waitForTimeout(700);
  return verifyCurrentAccount(page, email, role);
}

async function waitForRealContent(page, label) {
  await expect(page.locator('body')).toBeVisible({ timeout: 20_000 });
  await expect.poll(async () => clean(await page.locator('body').innerText().catch(() => '')).length, {
    message: `${label} stayed blank or on a loading shell`,
    timeout: 25_000,
  }).toBeGreaterThan(90);
}

async function assertNoLegacy(page, label, expectedMarker = null) {
  await waitForRealContent(page, label);
  expect(page.url(), `${label} opened an old or standalone route`).not.toMatch(FORBIDDEN_FINAL_URL);
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

async function openOwnerHash(page, hash, marker) {
  await page.goto(`${BASE_URL}/dashboard#${hash}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(650);
  await expect(page.locator('.cvOwnerReady'), `owner ${hash} is not the new owner OS`).toBeVisible({ timeout: 20_000 });
  await assertNoLegacy(page, `owner ${hash}`, marker);
}

async function openWorkerPath(page, path, marker) {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(650);
  await expect(page.locator('[data-worker-view]'), `worker ${path} is not the strict Worker View`).toBeVisible({ timeout: 20_000 });
  await assertNoLegacy(page, `worker ${path}`, marker);
}

async function openMore(page) {
  const trigger = page.getByRole('button', { name: /^More$/i }).first();
  await expect(trigger, 'More navigation should be visible').toBeVisible({ timeout: 12_000 });
  if ((await trigger.getAttribute('aria-expanded')) !== 'true') await trigger.click();
  const menu = page.getByRole('menu', { name: /More tools/i });
  await expect(menu, 'More tools menu should open').toBeVisible({ timeout: 10_000 });
  return menu;
}

async function clickResponsiveOwnerNavigation(page, label) {
  const direct = page.getByRole('button', { name: new RegExp(`^${label}(?:\\s+\\d+)?$`, 'i') }).first();
  if (await direct.isVisible().catch(() => false)) {
    await direct.click();
    await page.waitForTimeout(450);
    await assertNoLegacy(page, `navigation ${label}`);
    return true;
  }

  const menu = await openMore(page);
  const menuItem = menu.getByRole('menuitem', { name: new RegExp(`^${label}$`, 'i') }).first();
  if (await menuItem.isVisible().catch(() => false)) {
    await menuItem.click();
    await page.waitForTimeout(450);
    await assertNoLegacy(page, `More navigation ${label}`);
    return true;
  }

  const accountNav = page.getByRole('navigation', { name: /Account and help pages/i });
  const accountButton = accountNav.getByRole('button', { name: new RegExp(`^${label}$`, 'i') }).first();
  if (await accountButton.isVisible().catch(() => false)) {
    await page.keyboard.press('Escape').catch(() => {});
    await accountButton.click();
    await page.waitForTimeout(450);
    await assertNoLegacy(page, `account navigation ${label}`);
    return true;
  }

  return false;
}

async function safeControlSweep(page, routeLabel, limit = 16) {
  const labels = await page.locator('button:visible, a[href]:visible').evaluateAll((nodes) => nodes.map((node) =>
    String(node.textContent || node.getAttribute('aria-label') || node.getAttribute('title') || '').replace(/\s+/g, ' ').trim()
  ));
  const unique = [...new Set(labels)].filter((text) => text && text.length <= 90 && !UNSAFE_CONTROL.test(text)).slice(0, limit);

  let clicked = 0;
  for (const text of unique) {
    const target = page.getByRole('button', { name: text, exact: true }).or(page.getByRole('link', { name: text, exact: true })).first();
    if (!(await target.isVisible().catch(() => false))) continue;
    const before = page.url();
    await target.click({ timeout: 8_000 }).catch(() => null);
    await page.waitForTimeout(250);
    await assertNoLegacy(page, `${routeLabel} control “${text}”`);
    if (page.url() !== before && !page.url().includes('/dashboard') && !page.url().includes('/worker/')) {
      throw new Error(`${routeLabel} control “${text}” left the new app: ${page.url()}`);
    }
    clicked += 1;
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
    if (response.status() >= 500) errors.push(`HTTP ${response.status()}: ${response.request().method()} ${response.url()}`);
  });
}

async function logout(page) {
  let button = page.getByRole('button', { name: /Log out/i }).first();
  if (!(await button.isVisible().catch(() => false))) {
    await openMore(page).catch(() => null);
    button = page.getByRole('button', { name: /Log out/i }).first();
  }
  await expect(button, 'Log out should remain reachable').toBeVisible({ timeout: 10_000 });
  await button.click();
  await expect.poll(() => page.url(), { timeout: 15_000 }).toMatch(/\/login/);
  expect(await page.evaluate(() => localStorage.getItem('token') || localStorage.getItem('authToken') || ''), 'logout left browser token behind').toBe('');
}

test.describe('Live hardcore human everything and no-legacy audit', () => {
  test.setTimeout(720_000);

  test('real owner: every current page, responsive navigation, safe controls, refresh and logout stay in the new OS', async ({ browser }, testInfo) => {
    const context = await browser.newContext({ serviceWorkers: 'block' });
    const page = await context.newPage();
    const runtimeErrors = [];
    attachRuntimeTraps(page, runtimeErrors);

    await loginThroughScreen(page, OWNER_EMAIL, OWNER_PASSWORD, 'owner');
    await page.goto(`${BASE_URL}/dashboard#today`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.cvOwnerMainNavigation'), 'latest owner navigation is not deployed').toBeVisible({ timeout: 25_000 });

    let auditedControls = 0;
    for (const [hash, marker] of OWNER_ROUTES) {
      await test.step(`owner page ${hash}`, async () => {
        await openOwnerHash(page, hash, marker);
        auditedControls += await safeControlSweep(page, `owner ${hash}`, /mobile/i.test(testInfo.project.name) ? 6 : 10);
      });
    }

    for (const label of MAIN_NAV) {
      await openOwnerHash(page, 'today', /today|churvox/i);
      expect(await clickResponsiveOwnerNavigation(page, label), `current owner navigation is missing ${label}`).toBeTruthy();
    }

    await openOwnerHash(page, 'today', /today|churvox/i);
    const menu = await openMore(page);
    const box = await menu.boundingBox();
    const viewport = page.viewportSize();
    expect(box, 'More menu has no visible box').toBeTruthy();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);

    for (const label of MORE_NAV) {
      await openOwnerHash(page, 'today', /today|churvox/i);
      expect(await clickResponsiveOwnerNavigation(page, label), `More navigation is missing ${label}`).toBeTruthy();
    }

    for (const label of ACCOUNT_NAV) {
      await openOwnerHash(page, 'today', /today|churvox/i);
      expect(await clickResponsiveOwnerNavigation(page, label), `responsive account navigation is missing ${label}`).toBeTruthy();
    }

    await openOwnerHash(page, 'plans', /plans|billing|checkout/i);
    await expect(page.getByRole('button', { name: /Continue to secure checkout/i }), 'current in-app Stripe button is not deployed').toBeVisible();
    await expect(page.getByRole('button', { name: /^Open secure billing$/i }), 'old billing handoff button still exists').toHaveCount(0);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await assertNoLegacy(page, 'owner refresh persistence', /plans|billing|checkout/i);
    await verifyCurrentAccount(page, OWNER_EMAIL, 'owner after refresh');

    expect(auditedControls, `Too few owner controls were human-clicked on ${testInfo.project.name}`).toBeGreaterThan(/mobile/i.test(testInfo.project.name) ? 18 : 30);
    expect(runtimeErrors, `Owner runtime failures:\n${runtimeErrors.join('\n')}`).toEqual([]);
    await logout(page);
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
        auditedControls += await safeControlSweep(page, `worker ${path}`, /mobile/i.test(testInfo.project.name) ? 6 : 10);
      });
    }

    await page.goto(`${BASE_URL}/dashboard#today`, { waitUntil: 'domcontentloaded' });
    await expect.poll(() => page.url(), { timeout: 15_000 }).toMatch(/\/worker\//);
    await assertNoLegacy(page, 'worker blocked from owner dashboard');

    await openWorkerPath(page, '/worker/today', /today|job|worker/i);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await assertNoLegacy(page, 'worker refresh persistence', /today|job|worker/i);
    await verifyCurrentAccount(page, WORKER_EMAIL, 'worker after refresh');

    expect(auditedControls, `Too few worker controls were human-clicked on ${testInfo.project.name}`).toBeGreaterThan(/mobile/i.test(testInfo.project.name) ? 5 : 7);
    expect(runtimeErrors, `Worker runtime failures:\n${runtimeErrors.join('\n')}`).toEqual([]);
    await logout(page);
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
      await workerPage.waitForTimeout(500);
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
