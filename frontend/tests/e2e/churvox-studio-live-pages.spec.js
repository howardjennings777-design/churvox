const { test, expect } = require('@playwright/test');

const BASE_URL = (process.env.PLAYWRIGHT_BASE_URL || 'https://www.churvox.com').replace(/\/+$/, '');
const API_BASE = (process.env.PLAYWRIGHT_API_BASE || 'https://grassley-backend.onrender.com').replace(/\/+$/, '');
const OWNER_EMAIL = String(process.env.CHURVOX_OWNER_EMAIL || '').trim().toLowerCase();
const OWNER_PASSWORD = process.env.CHURVOX_OWNER_PASSWORD || '';
const WORKER_EMAIL = String(process.env.CHURVOX_WORKER_EMAIL || '').trim().toLowerCase();
const WORKER_PASSWORD = process.env.CHURVOX_WORKER_PASSWORD || process.env.CHURVOX_OWNER_PASSWORD || '';

const OWNER_PAGES = ['today', 'command', 'parked', 'completed', 'jobs', 'schedule', 'recurring', 'clients', 'messages', 'crew', 'field', 'timesheets', 'access', 'quotes', 'invoices', 'money', 'accounting', 'settings', 'plans', 'support'];
const WORKER_ROUTES = ['/worker/today', '/worker/jobs', '/worker/messages', '/worker/help'];
const PUBLIC_ROUTES = ['/', '/pricing', '/login'];

function apiUrl(path) {
  return `${API_BASE}${path.startsWith('/api') ? path : `/api${path}`}`;
}

function tokenFrom(body = {}) {
  return body?.token || body?.access_token || body?.auth_token || body?.jwt || body?.accessToken
    || body?.user?.token || body?.user?.access_token || body?.data?.token || body?.data?.access_token || body?.data?.user?.token || '';
}

async function bodyOf(response) {
  return response.json().catch(async () => ({ text: await response.text().catch(() => '') }));
}

async function apiLogin(request, email, password, label) {
  const response = await request.post(apiUrl('/api/auth/login'), { data: { email, password }, timeout: 30_000 });
  const body = await bodyOf(response);
  expect(response.ok(), `${label} API login failed ${response.status()}: ${JSON.stringify(body).slice(0, 700)}`).toBeTruthy();
  const token = tokenFrom(body);
  expect(token, `${label} login returned no token`).toBeTruthy();
  return token;
}

async function seedSession(context, token, email, role) {
  await context.addInitScript(({ tokenValue, emailValue, roleValue }) => {
    sessionStorage.removeItem('churvox:logged-out');
    localStorage.setItem('token', tokenValue);
    localStorage.setItem('authToken', tokenValue);
    localStorage.setItem('access_token', tokenValue);
    localStorage.setItem('churvox_auth_session_snapshot_v1', JSON.stringify({
      at: Date.now(),
      token: tokenValue,
      user: { email: emailValue, role: roleValue, has_app_access: true, email_verified: true },
    }));
  }, { tokenValue: token, emailValue: email, roleValue: role });
}

function watchRuntime(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (/favicon|manifest|ResizeObserver|AbortError|net::ERR_ABORTED|Failed to load resource.*(?:401|404)/i.test(text)) return;
    errors.push(`console: ${text.slice(0, 500)}`);
  });
  page.on('response', (response) => {
    if (response.status() >= 500) errors.push(`http ${response.status()}: ${response.url()}`);
  });
  return errors;
}

async function assertHealthy(page, label, { owner = false, worker = false } = {}) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);
  if (owner) await expect(page.locator('[data-churvox-layout="fresh-studio"]'), `${label} did not load current Studio`).toBeVisible({ timeout: 20_000 });
  if (worker) await expect(page.locator('.cvWorkerRouteShell, .cvWorkerNoFuss, [data-churvox-worker]'), `${label} did not load Worker View`).toBeVisible({ timeout: 20_000 });

  const result = await page.evaluate(() => {
    const visible = (element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 1 && rect.height > 1 && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0.04;
    };
    const root = document.documentElement;
    const body = document.body;
    const text = String(body?.innerText || '').replace(/\s+/g, ' ').trim();
    const issues = [];
    const overflow = Math.max(root.scrollWidth, body?.scrollWidth || 0) - root.clientWidth;
    if (text.length < 30) issues.push(`blank/short page (${text.length})`);
    if (overflow > 12) issues.push(`horizontal overflow ${overflow}px`);
    for (const control of [...document.querySelectorAll('button, a[href], input, textarea, select, [role="button"]')].filter(visible)) {
      const name = String(control.innerText || control.textContent || control.getAttribute('aria-label') || control.getAttribute('placeholder') || control.getAttribute('name') || '').trim();
      if (!name && !['INPUT', 'TEXTAREA', 'SELECT'].includes(control.tagName)) issues.push(`unlabelled ${control.tagName.toLowerCase()}`);
      if (getComputedStyle(control).pointerEvents === 'none' && !control.disabled) issues.push(`untappable ${name || control.tagName}`);
    }
    return { text, issues: [...new Set(issues)].slice(0, 30) };
  });
  expect(result.issues, `${label} health problems`).toEqual([]);
  expect(result.text).not.toMatch(/demo data|mock data|dummy|fake customer|fake job|lorem|debug mode|todo/i);
}

async function uiLogin(page, email, password, role) {
  await page.goto(`${BASE_URL}/login${role === 'worker' ? '?worker=1' : ''}`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel(/email/i).first().fill(email);
  await page.getByLabel(/password/i).first().fill(password);
  const submit = page.getByRole('button', { name: /open churvox|preparing secure entry|sign in|log in/i }).first();
  await expect(submit, 'login did not finish its startup session check').toBeEnabled({ timeout: 20_000 });
  await submit.click();
  await expect.poll(async () => ({ url: page.url(), error: await page.locator('[role="alert"]').first().textContent().catch(() => '') }), {
    timeout: 35_000,
    intervals: [400, 800, 1500, 2500],
    message: `The ${role} login did not leave the login page`,
  }).toMatchObject({ url: expect.not.stringMatching(/\/login(?:[?#]|$)/i) });
  expect(page.url()).toMatch(role === 'worker' ? /\/worker(?:[/?#]|$)/i : /\/dashboard(?:[/?#]|$)|\/plans(?:[/?#]|$)/i);
}

test.describe('Current Studio public and login entry', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`public route is readable and healthy: ${route}`, async ({ page }) => {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' });
      await assertHealthy(page, route);
    });
  }

  test('owner login opens the owner workspace', async ({ page }) => {
    if (!OWNER_EMAIL || !OWNER_PASSWORD) throw new Error('Owner credential is required.');
    await uiLogin(page, OWNER_EMAIL, OWNER_PASSWORD, 'owner');
  });

  test('worker login opens Worker View', async ({ page }) => {
    if (!WORKER_EMAIL || !WORKER_PASSWORD) throw new Error('Worker credential is required.');
    await uiLogin(page, WORKER_EMAIL, WORKER_PASSWORD, 'worker');
  });
});

test.describe('Current Studio owner desktop and phone crawl', () => {
  test('every current owner page opens cleanly with live controls', async ({ browser, request }) => {
    if (!OWNER_EMAIL || !OWNER_PASSWORD) throw new Error('Owner credential is required.');
    const token = await apiLogin(request, OWNER_EMAIL, OWNER_PASSWORD, 'owner');
    const context = await browser.newContext({ serviceWorkers: 'block' });
    await seedSession(context, token, OWNER_EMAIL, 'owner');
    const page = await context.newPage();
    const errors = watchRuntime(page);
    try {
      for (const screen of OWNER_PAGES) {
        await page.goto(`${BASE_URL}/dashboard${screen === 'today' ? '' : `#${screen}`}`, { waitUntil: 'domcontentloaded' });
        expect(page.url(), `${screen} redirected out of owner workspace`).toMatch(/\/dashboard(?:[/?#]|$)/i);
        await assertHealthy(page, `owner ${screen}`, { owner: true });
        await expect(page.locator(`.cvsStudio.page-${screen}`), `${screen} did not become the active Studio page`).toBeVisible();
      }
      expect(errors, 'runtime errors across owner crawl').toEqual([]);
    } finally {
      await context.close();
    }
  });

  test('responsive owner navigation exposes every current area', async ({ browser, request, isMobile }) => {
    if (!OWNER_EMAIL || !OWNER_PASSWORD) throw new Error('Owner credential is required.');
    const token = await apiLogin(request, OWNER_EMAIL, OWNER_PASSWORD, 'owner');
    const context = await browser.newContext({ serviceWorkers: 'block' });
    await seedSession(context, token, OWNER_EMAIL, 'owner');
    const page = await context.newPage();
    try {
      await page.goto(`${BASE_URL}/dashboard#command`, { waitUntil: 'domcontentloaded' });
      await assertHealthy(page, 'owner navigation', { owner: true });
      if (isMobile) {
        const dock = page.locator('.cvsMobileDock');
        for (const item of ['Today', 'Jobs', 'Command', 'Messages', 'More']) await expect(dock.locator('button').filter({ hasText: new RegExp(item, 'i') }).first(), `missing mobile ${item}`).toBeVisible();
        await dock.locator('button').filter({ hasText: /More/i }).first().click();
        const more = page.locator('.cvsMobileMore section');
        await expect(more).toBeVisible();
        for (const item of ['Today', 'Jobs', 'Clients', 'Money', 'Team', 'Messages', 'Command', 'Settings', 'Plans & billing', 'Help']) await expect(more.locator('button').filter({ hasText: new RegExp(item, 'i') }).first(), `missing mobile ${item}`).toBeVisible();
      } else {
        const nav = page.locator('.cvsWorkstream');
        await expect(nav, 'desktop Studio workstream did not render').toBeVisible();
        for (const item of ['Today', 'Jobs', 'Clients', 'Money', 'Team', 'Messages', 'Command']) await expect(nav.locator('button').filter({ hasText: new RegExp(item, 'i') }).first(), `missing desktop ${item}`).toBeVisible();
        await page.locator('.cvsProfileWrap > button.profile').click();
        for (const item of ['Settings', 'Plans & billing', 'Help', 'Log out']) await expect(page.locator('.cvsProfileMenu').locator('button').filter({ hasText: new RegExp(item, 'i') }).first()).toBeVisible();
      }
    } finally {
      await context.close();
    }
  });
});

test.describe('Current Worker View and role boundaries', () => {
  test('worker routes are clean and worker-scoped', async ({ browser, request }) => {
    if (!WORKER_EMAIL || !WORKER_PASSWORD) throw new Error('Worker credential is required.');
    const token = await apiLogin(request, WORKER_EMAIL, WORKER_PASSWORD, 'worker');
    const context = await browser.newContext({ serviceWorkers: 'block' });
    await seedSession(context, token, WORKER_EMAIL, 'worker');
    const page = await context.newPage();
    const errors = watchRuntime(page);
    try {
      for (const route of WORKER_ROUTES) {
        await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' });
        expect(page.url(), `${route} redirected out of Worker View`).toMatch(/\/worker(?:[/?#]|$)/i);
        await assertHealthy(page, route, { worker: true });
        await expect(page.locator('body')).not.toContainText(/Plans & billing|Platform Admin|Owner workspace/i);
      }
      expect(errors, 'runtime errors across worker crawl').toEqual([]);
    } finally {
      await context.close();
    }
  });

  test('owner and worker cannot enter each other’s protected rooms', async ({ browser, request }) => {
    if (!OWNER_EMAIL || !OWNER_PASSWORD || !WORKER_EMAIL || !WORKER_PASSWORD) throw new Error('Owner and worker credentials are required.');
    const ownerToken = await apiLogin(request, OWNER_EMAIL, OWNER_PASSWORD, 'owner');
    const workerToken = await apiLogin(request, WORKER_EMAIL, WORKER_PASSWORD, 'worker');
    const ownerContext = await browser.newContext({ serviceWorkers: 'block' });
    const workerContext = await browser.newContext({ serviceWorkers: 'block' });
    await seedSession(ownerContext, ownerToken, OWNER_EMAIL, 'owner');
    await seedSession(workerContext, workerToken, WORKER_EMAIL, 'worker');
    const ownerPage = await ownerContext.newPage();
    const workerPage = await workerContext.newPage();
    try {
      await ownerPage.goto(`${BASE_URL}/worker/jobs`, { waitUntil: 'domcontentloaded' });
      await expect.poll(() => ownerPage.url(), { timeout: 20_000, intervals: [300, 700, 1200, 2200] }).not.toMatch(/\/worker\/jobs(?:[?#]|$)/i);
      for (const route of ['/dashboard', '/dashboard#plans', '/admin']) {
        await workerPage.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' });
        await expect.poll(() => workerPage.url(), { timeout: 20_000, intervals: [300, 700, 1200, 2200] }).not.toMatch(/\/dashboard(?:[/?#]|$)|\/admin(?:[/?#]|$)/i);
      }
    } finally {
      await ownerContext.close();
      await workerContext.close();
    }
  });
});
