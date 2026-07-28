const { test, expect } = require('@playwright/test');

const BASE_URL = (process.env.PLAYWRIGHT_BASE_URL || 'https://www.churvox.com').replace(/\/+$/, '');
const API_BASE = (process.env.PLAYWRIGHT_API_BASE || 'https://grassley-backend.onrender.com').replace(/\/+$/, '');
const OWNER_EMAIL = String(process.env.CHURVOX_OWNER_EMAIL || '').trim().toLowerCase();
const OWNER_PASSWORD = process.env.CHURVOX_OWNER_PASSWORD || '';
const WORKER_EMAIL = String(process.env.CHURVOX_WORKER_EMAIL || '').trim().toLowerCase();
const WORKER_PASSWORD = process.env.CHURVOX_WORKER_PASSWORD || process.env.CHURVOX_OWNER_PASSWORD || '';

const OWNER_PAGES = [
  ['today', /today|owner command floor|churvox/i],
  ['command', /command|approval|owner/i],
  ['work', /jobs|work/i],
  ['clients', /clients/i],
  ['worker', /team|people|workers|field/i],
  ['quotes', /quotes/i],
  ['invoices', /invoices/i],
  ['schedule', /schedule/i],
  ['messages', /messages/i],
  ['payroll', /time|timesheet|hours|team status/i],
  ['integrations', /xero|accounting/i],
  ['office-team', /how churvox works|team/i],
  ['settings', /settings/i],
  ['plans', /plans|pricing/i],
  ['help', /help/i],
];

const WORKER_PATHS = [
  ['/worker/today', /today|current job|assigned/i],
  ['/worker/jobs', /jobs|assigned jobs|job queue/i],
  ['/worker/messages', /messages|update the boss|send one clear update/i],
  ['/worker/help', /help|field rules/i],
  ['/worker/settings', /worker access|field tools|worker/i],
];

const LEGACY_PATH = /\/(?:plans|legacy-dashboard|fresh|office-team-lab|office-lab|new-command-lab)(?:[/?#]|$)/i;
const FATAL_TEXT = /something went wrong|application error|cannot read properties|failed to render|unexpected error|minified react error/i;

function apiUrl(path) {
  return `${API_BASE}${path.startsWith('/api') ? path : `/api${path}`}`;
}

function tokenFrom(body = {}) {
  return body?.token || body?.access_token || body?.auth_token || body?.jwt || body?.accessToken
    || body?.user?.token || body?.user?.access_token || body?.data?.token || body?.data?.access_token || body?.data?.user?.token || '';
}

function accountEmail(body = {}) {
  return String(body?.email || body?.user?.email || body?.data?.email || body?.data?.user?.email || '').trim().toLowerCase();
}

async function responseBody(response) {
  return response.json().catch(async () => ({ text: await response.text().catch(() => '') }));
}

async function newCleanContext(browser, viewport) {
  const context = await browser.newContext({ serviceWorkers: 'block', viewport });
  await context.addInitScript(() => {
    try {
      navigator.serviceWorker?.getRegistrations?.().then((registrations) => registrations.forEach((registration) => registration.unregister()));
    } catch {}
    try { caches?.keys?.().then((keys) => keys.forEach((key) => caches.delete(key))); } catch {}
  });
  return context;
}

async function uiLogin(page, email, password, role) {
  await page.goto(`${BASE_URL}/login${role === 'worker' ? '?worker=1' : ''}`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel(/email/i).first().fill(email);
  await page.getByLabel(/password/i).first().fill(password);
  await page.getByRole('button', { name: /open churvox|sign in|log in/i }).first().click();
  await expect.poll(() => page.url(), {
    message: `${role} stayed on login`,
    timeout: 60_000,
    intervals: [300, 600, 1000, 1800, 3000, 5000],
  }).not.toMatch(/\/login(?:[?#]|$)/);

  const token = await page.evaluate(() => localStorage.getItem('token') || localStorage.getItem('authToken') || '');
  expect(token, `${role} browser login did not store a token`).toBeTruthy();
  let me;
  let body = {};
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    try {
      me = await page.request.get(apiUrl('/api/auth/me'), {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 60_000,
      });
      body = await responseBody(me);
      if (me.status() === 200 || ![408, 425, 429, 500, 502, 503, 504].includes(me.status()) || attempt === 6) break;
    } catch (error) {
      if (attempt === 6) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, Math.min(1200 * attempt, 6000)));
  }
  expect(me?.status(), `${role} /api/auth/me failed: ${JSON.stringify(body).slice(0, 700)}`).toBe(200);
  expect(accountEmail(body), `${role} /api/auth/me returned the wrong account`).toBe(email);
  return token;
}

async function apiSession(page, email, password, role) {
  let response;
  let body = {};
  let lastError;
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    try {
      response = await page.request.post(apiUrl('/api/auth/login'), {
        data: { email, password },
        timeout: 60_000,
      });
      body = await responseBody(response);
      if (response.ok() || ![408, 425, 429, 500, 502, 503, 504].includes(response.status()) || attempt === 6) break;
    } catch (error) {
      lastError = error;
      if (attempt === 6) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
  }
  if (!response) throw lastError || new Error(`${role} API session login produced no response`);
  expect(response.ok(), `${role} API session login failed ${response.status()}: ${JSON.stringify(body).slice(0, 700)}`).toBeTruthy();
  const token = tokenFrom(body);
  expect(token, `${role} API session login returned no token`).toBeTruthy();
  if (accountEmail(body)) expect(accountEmail(body), `${role} API session returned the wrong account`).toBe(email);

  let me;
  let meBody = {};
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    try {
      me = await page.request.get(apiUrl('/api/auth/me'), {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 60_000,
      });
      meBody = await responseBody(me);
      if (me.status() === 200 || ![408, 425, 429, 500, 502, 503, 504].includes(me.status()) || attempt === 6) break;
    } catch (error) {
      if (attempt === 6) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, Math.min(1200 * attempt, 6000)));
  }
  expect(me?.status(), `${role} API session /api/auth/me failed: ${JSON.stringify(meBody).slice(0, 700)}`).toBe(200);
  expect(accountEmail(meBody), `${role} API session /api/auth/me returned the wrong account`).toBe(email);
  const verifiedUser = meBody?.user || meBody?.data?.user || meBody?.data || meBody || {};

  await page.context().addInitScript(({ tokenValue, userValue, emailValue, roleValue }) => {
    localStorage.setItem('token', tokenValue);
    localStorage.setItem('authToken', tokenValue);
    localStorage.setItem('access_token', tokenValue);
    localStorage.setItem('churvox_auth_session_snapshot_v1', JSON.stringify({
      at: Date.now(),
      token: tokenValue,
      user: { ...userValue, email: emailValue, role: userValue?.role || userValue?.user_role || roleValue },
    }));
  }, { tokenValue: token, userValue: verifiedUser, emailValue: email, roleValue: role });
  await page.goto(`${BASE_URL}${role === 'worker' ? '/worker/today' : '/dashboard#today'}`, { waitUntil: 'domcontentloaded' });
  return token;
}

async function settle(page, label) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle', { timeout: 3500 }).catch(() => null);
  await expect(page.locator('body'), `${label} body missing`).toBeVisible({ timeout: 15_000 });
  await expect.poll(async () => {
    const text = await page.locator('body').innerText().catch(() => '');
    return text.replace(/\s+/g, ' ').trim().length;
  }, {
    message: `${label} stayed blank or on a loading shell`,
    timeout: 20_000,
    intervals: [250, 500, 900, 1500, 2500],
  }).toBeGreaterThan(80);
}

async function assertHealthy(page, label, marker) {
  await settle(page, label);
  const text = (await page.locator('body').innerText()).replace(/\s+/g, ' ').trim();
  expect(text, `${label} rendered a fatal error`).not.toMatch(FATAL_TEXT);
  expect(text, `${label} does not identify its purpose`).toMatch(marker);
  expect(page.url(), `${label} opened a legacy route`).not.toMatch(LEGACY_PATH);
  const oldHandoffs = await page.locator('a[href], button').evaluateAll((elements) => elements
    .map((element) => ({
      label: String(element.innerText || element.getAttribute('aria-label') || '').trim(),
      href: element instanceof HTMLAnchorElement ? element.getAttribute('href') || '' : '',
      action: element.getAttribute('data-href') || element.getAttribute('formaction') || '',
    }))
    .filter((item) => /\/(?:legacy-dashboard|fresh|office-team-lab|office-lab|new-command-lab)(?:[/?#]|$)/i.test(`${item.href} ${item.action}`)));
  expect(oldHandoffs, `${label} contains old-site handoffs: ${JSON.stringify(oldHandoffs)}`).toEqual([]);
}

async function openOwnerHash(page, hash, marker) {
  await page.goto(`${BASE_URL}/dashboard#${hash}`, { waitUntil: 'domcontentloaded' });
  await expect.poll(() => page.url(), {
    message: `Owner route ${hash} did not stay in the new dashboard`,
    timeout: 15_000,
    intervals: [250, 500, 900, 1500],
  }).toMatch(new RegExp(`/dashboard(?:\\?[^#]*)?#${hash}$`, 'i'));
  await expect(page.locator('.cvOwnerReady'), `Owner shell missing on ${hash}`).toBeVisible({ timeout: 20_000 });
  await assertHealthy(page, `owner ${hash}`, marker);
}

async function ensureMoreOpen(page) {
  const trigger = page.getByRole('button', { name: 'More', exact: true }).first();
  await expect(trigger).toBeVisible({ timeout: 15_000 });
  if (await trigger.getAttribute('aria-expanded') !== 'true') await trigger.click();
  const menu = page.getByRole('menu', { name: /More tools/i });
  await expect(menu).toBeVisible({ timeout: 10_000 });
  const box = await menu.boundingBox();
  const viewport = page.viewportSize();
  expect(box, 'More menu has no visible box').toBeTruthy();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
  return menu;
}

async function closeMore(page) {
  const trigger = page.getByRole('button', { name: 'More', exact: true }).first();
  if (!(await trigger.count()) || await trigger.getAttribute('aria-expanded') !== 'true') return;
  const close = page.getByRole('button', { name: 'Close More menu' }).last();
  if (await close.count() && await close.isVisible().catch(() => false)) await close.click();
  else await page.keyboard.press('Escape');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
}

async function auditVisibleControls(page, label) {
  const problems = await page.evaluate(() => {
    const visible = (element) => {
      if (!(element instanceof HTMLElement)) return false;
      const style = getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
      const rect = element.getBoundingClientRect();
      return rect.width > 1 && rect.height > 1 && rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight;
    };
    const controls = [...document.querySelectorAll('button, a[href], input:not([type="hidden"]), textarea, select')].filter(visible);
    return {
      horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      disabledNavigation: controls.filter((element) => element.matches('a[href], nav button') && element.hasAttribute('disabled')).map((element) => String(element.innerText || element.getAttribute('aria-label') || '').trim()).filter(Boolean),
      nameless: controls.filter((element) => !String(element.innerText || element.getAttribute('aria-label') || element.getAttribute('title') || element.getAttribute('placeholder') || element.getAttribute('name') || '').trim()).slice(0, 12).map((element) => element.outerHTML.slice(0, 180)),
    };
  });
  expect(problems.horizontalOverflow, `${label} has horizontal overflow`).toBeLessThanOrEqual(3);
  expect(problems.disabledNavigation, `${label} has disabled navigation`).toEqual([]);
  expect(problems.nameless, `${label} has nameless visible controls`).toEqual([]);
}

function watchApiFailures(page, role) {
  const failures = [];
  page.on('response', (response) => {
    let url;
    try { url = new URL(response.url()); } catch { return; }
    if (url.origin !== new URL(API_BASE).origin || !url.pathname.startsWith('/api/')) return;
    const status = response.status();
    if (status >= 500 || status === 401 || status === 403) {
      failures.push({ role, status, method: response.request().method(), path: url.pathname });
    }
  });
  return failures;
}

function unexpectedApiFailures(failures, role) {
  return failures.filter((item) => {
    if (role === 'owner') return true;
    if (/\/api\/admin\/owner\/paid-launch-report$/.test(item.path) && [401, 403].includes(item.status)) return false;
    return true;
  });
}

test.describe('Churvox live launch human audit v2', () => {
  test.setTimeout(420_000);

  test('owner uses every current new-OS page and no control hands off to the old site', async ({ browser }, testInfo) => {
    if (!OWNER_EMAIL || !OWNER_PASSWORD) throw new Error('Owner credentials are required; this audit never skips.');
    const mobile = /mobile/i.test(testInfo.project.name);
    const context = await newCleanContext(browser, mobile ? { width: 390, height: 844 } : { width: 1440, height: 960 });
    const page = await context.newPage();
    if (mobile) await apiSession(page, OWNER_EMAIL, OWNER_PASSWORD, 'owner');
    else await uiLogin(page, OWNER_EMAIL, OWNER_PASSWORD, 'owner');
    const failures = watchApiFailures(page, 'owner');
    for (const [hash, marker] of OWNER_PAGES) {
      await openOwnerHash(page, hash, marker);
      await auditVisibleControls(page, `owner ${hash}`);
    }

    await openOwnerHash(page, 'today', /today|churvox/i);
    const menu = await ensureMoreOpen(page);
    const labels = (await menu.getByRole('menuitem').allTextContents()).map((value) => value.replace(/\s+/g, ' ').trim()).filter(Boolean);
    expect(labels.length, 'More menu opened without any tools').toBeGreaterThan(0);
    await closeMore(page);
    for (const label of labels) {
      await openOwnerHash(page, 'today', /today|churvox/i);
      const reopened = await ensureMoreOpen(page);
      const item = reopened.getByRole('menuitem', { name: label, exact: true });
      await expect(item, `More item ${label} missing`).toBeVisible();
      await item.click();
      await settle(page, `More → ${label}`);
      expect(page.url(), `More → ${label} opened old site`).not.toMatch(LEGACY_PATH);
    }

    await page.goto(`${BASE_URL}/plans`, { waitUntil: 'domcontentloaded' });
    await expect.poll(() => page.url(), { timeout: 15_000 }).toMatch(/\/dashboard(?:\?[^#]*)?#plans$/);
    await assertHealthy(page, 'typed /plans redirect', /plans|pricing/i);

    await page.goto(`${BASE_URL}/legacy-dashboard`, { waitUntil: 'domcontentloaded' });
    await expect.poll(() => page.url(), { timeout: 15_000 }).toMatch(/\/dashboard(?:[?#]|$)/);
    expect(page.url()).not.toMatch(/legacy-dashboard/i);

    expect(unexpectedApiFailures(failures, 'owner'), `Owner pages produced auth/server failures: ${JSON.stringify(failures)}`).toEqual([]);
    await context.close();
  });

  test('worker uses every worker page, never loads owner tools, and logs out cleanly', async ({ browser }, testInfo) => {
    if (!WORKER_EMAIL || !WORKER_PASSWORD) throw new Error('Worker credentials are required; this audit never skips.');
    const mobile = /mobile/i.test(testInfo.project.name);
    const context = await newCleanContext(browser, mobile ? { width: 390, height: 844 } : { width: 1440, height: 960 });
    const page = await context.newPage();
    if (mobile) await apiSession(page, WORKER_EMAIL, WORKER_PASSWORD, 'worker');
    else await uiLogin(page, WORKER_EMAIL, WORKER_PASSWORD, 'worker');
    const failures = watchApiFailures(page, 'worker');
    for (const [path, marker] of WORKER_PATHS) {
      await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
      await expect.poll(() => page.url(), { timeout: 15_000 }).toMatch(new RegExp(`${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:[?#]|$)`));
      await expect(page.locator(`[data-worker-view]`), `Worker shell missing on ${path}`).toBeVisible({ timeout: 20_000 });
      await assertHealthy(page, `worker ${path}`, marker);
      await auditVisibleControls(page, `worker ${path}`);
      const text = await page.locator('body').innerText();
      expect(text, `${path} exposed owner billing/admin`).not.toMatch(/Continue to secure checkout|Choose billing country|Owner command floor|Delete account|Current plan billing/i);
    }

    for (const ownerPath of ['/dashboard#today', '/dashboard#command', '/dashboard#plans', '/plans', '/legacy-dashboard']) {
      await page.goto(`${BASE_URL}${ownerPath}`, { waitUntil: 'domcontentloaded' });
      await expect.poll(() => page.url(), {
        message: `Worker remained on forbidden owner route ${ownerPath}`,
        timeout: 15_000,
        intervals: [250, 500, 900, 1500, 2500],
      }).toMatch(/\/worker\/|\/login/);
    }

    expect(unexpectedApiFailures(failures, 'worker'), `Worker pages produced auth/server failures: ${JSON.stringify(failures)}`).toEqual([]);

    await page.goto(`${BASE_URL}/worker/settings`, { waitUntil: 'domcontentloaded' });
    const logout = page.getByRole('button', { name: 'Log out', exact: true });
    await expect(logout, 'Worker has no real logout button').toBeVisible({ timeout: 15_000 });
    await logout.click();
    await expect.poll(() => page.url(), { timeout: 15_000 }).toMatch(/\/login/);
    expect(await page.evaluate(() => localStorage.getItem('token') || localStorage.getItem('authToken') || '')).toBe('');

    await context.close();
  });
});
