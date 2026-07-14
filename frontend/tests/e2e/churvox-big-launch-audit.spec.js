const { test, expect } = require('@playwright/test');

const OWNER_EMAIL = process.env.CHURVOX_OWNER_EMAIL || process.env.CHURVOX_E2E_EMAIL || process.env.CHURVOX_E2E_OWNER_EMAIL || process.env.E2E_EMAIL || '';
const OWNER_PASSWORD = process.env.CHURVOX_OWNER_PASSWORD || process.env.CHURVOX_E2E_PASSWORD || process.env.CHURVOX_E2E_OWNER_PASSWORD || process.env.E2E_PASSWORD || '';
const WORKER_EMAIL = process.env.CHURVOX_WORKER_EMAIL || process.env.CHURVOX_E2E_WORKER_EMAIL || process.env.E2E_WORKER_EMAIL || '';
const WORKER_PASSWORD = process.env.CHURVOX_WORKER_PASSWORD || process.env.CHURVOX_E2E_WORKER_PASSWORD || process.env.E2E_WORKER_PASSWORD || '';
const API_BASE = (process.env.PLAYWRIGHT_API_BASE || 'https://grassley-backend.onrender.com').replace(/\/+$/, '');
const REQUIRE_AUTH_AUDIT = /^(1|true|yes)$/i.test(process.env.CHURVOX_REQUIRE_AUTH_AUDIT || '');

const publicRoutes = ['/', '/features', '/pricing', '/login', '/signup', '/privacy', '/terms'];
const ownerHashes = [
  'setupassistant', 'command', 'aioperator', 'quickcreateai', 'planday',
  'jobs', 'recurring', 'dispatch', 'routes', 'areas', 'clients', 'quotes',
  'quoteai', 'invoices', 'invoicecheck', 'payments', 'team', 'payroll',
  'time', 'xero', 'integrations', 'reports', 'profit', 'expenses', 'photos',
  'documents', 'automation', 'launchcontrol', 'security', 'settings', 'support',
];

const blockedVisibleWords = [
  /\bdemo data\b/i,
  /\bmock data\b/i,
  /\bdummy\b/i,
  /\bfake customer\b/i,
  /\bfake job\b/i,
  /\bplaceholder\b/i,
  /\blorem\b/i,
  /\btemporary copy\b/i,
  /\bdebug mode\b/i,
  /\btodo\b/i,
];

function apiUrl(path) {
  return `${API_BASE}${path.startsWith('/api') ? path : `/api${path}`}`;
}

function tokenFrom(data = {}) {
  return data?.token || data?.access_token || data?.auth_token || data?.jwt || data?.accessToken
    || data?.user?.token || data?.user?.access_token || data?.user?.accessToken
    || data?.data?.token || data?.data?.access_token || data?.data?.user?.token || '';
}

function accountEmail(data = {}) {
  return String(data?.email || data?.user?.email || data?.data?.email || data?.data?.user?.email || '').trim().toLowerCase();
}

async function waitStable(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);
}

async function collectVisibleText(page) {
  return page.evaluate(() => {
    const skip = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG']);
    const chunks = [];
    const els = [...document.querySelectorAll('body *')];
    for (const el of els) {
      if (skip.has(el.tagName)) continue;
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity || '1') < 0.08) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) continue;
      const text = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
      if (!text || text.length > 180) continue;
      chunks.push(text);
    }
    return [...new Set(chunks)].join('\n');
  });
}

async function anyVisibleText(page, text) {
  return page.evaluate((needle) => {
    const wanted = String(needle || '').toLowerCase();
    const els = [...document.querySelectorAll('body *')];
    return els.some((el) => {
      const value = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
      if (!value.includes(wanted)) return false;
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity || '1') < 0.08) return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 1 && rect.height > 1;
    });
  }, text);
}

async function expectNoLaunchLanguage(page, label) {
  const visibleText = await collectVisibleText(page);
  const hits = blockedVisibleWords
    .filter((pattern) => pattern.test(visibleText))
    .map((pattern) => pattern.toString());
  expect(hits, `${label} contains customer-facing internal launch words. Visible text:\n${visibleText.slice(0, 2500)}`).toEqual([]);
}

async function expectBasics(page, label) {
  await waitStable(page);
  const result = await page.evaluate(() => {
    const issues = [];
    const body = document.body;
    const vw = document.documentElement.clientWidth;
    const scrollW = Math.max(document.documentElement.scrollWidth, body?.scrollWidth || 0);
    if (!body) issues.push('missing body');
    if (scrollW - vw > 8) issues.push(`horizontal overflow ${scrollW - vw}px`);
    const controls = [...document.querySelectorAll('button, a[href], [role="button"]')].filter((el) => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 1 && rect.height > 1 && style.display !== 'none' && style.visibility !== 'hidden';
    });
    controls.forEach((el, index) => {
      const name = (el.innerText || el.getAttribute('aria-label') || el.getAttribute('title') || '').trim();
      if (!name) issues.push(`visible control ${index + 1} has no label`);
    });
    return { issues: issues.slice(0, 40) };
  });
  expect(result.issues, `${label} page basics`).toEqual([]);
  await expectNoLaunchLanguage(page, label);
}

async function fillByLabelOrPlaceholder(page, words, value) {
  for (const word of Array.isArray(words) ? words : [words]) {
    const byLabel = page.getByLabel(new RegExp(word, 'i')).first();
    if (await byLabel.count().catch(() => 0) && await byLabel.isVisible().catch(() => false)) {
      await byLabel.fill(value);
      return true;
    }
    const byPlaceholder = page.getByPlaceholder(new RegExp(word, 'i')).first();
    if (await byPlaceholder.count().catch(() => 0) && await byPlaceholder.isVisible().catch(() => false)) {
      await byPlaceholder.fill(value);
      return true;
    }
  }
  return false;
}

async function clickLogin(page) {
  for (const name of [/sign in/i, /log in/i, /login/i]) {
    const button = page.getByRole('button', { name }).first();
    if (await button.count().catch(() => 0) && await button.isVisible().catch(() => false)) {
      await button.click();
      return;
    }
  }
  await page.keyboard.press('Enter');
}

function requireOrSkip(condition, message) {
  if (condition) return;
  if (REQUIRE_AUTH_AUDIT) throw new Error(message);
  test.skip(true, message);
}

async function readJson(response) {
  return response.json().catch(async () => ({ text: await response.text().catch(() => '') }));
}

async function verifyIdentity(page, token, email, role) {
  const response = await page.request.get(apiUrl('/api/auth/me'), {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    timeout: 30_000,
  });
  const body = await readJson(response);
  expect(response.ok(), `${role} auth/me failed with ${response.status()}: ${JSON.stringify(body).slice(0, 400)}`).toBeTruthy();
  const returnedEmail = accountEmail(body);
  if (returnedEmail) expect(returnedEmail, `${role} auth/me returned a different account`).toBe(email.toLowerCase());
}

async function apiLogin(page, email, password, role) {
  const paths = role === 'worker' ? ['/api/auth/login', '/api/worker/auth/login'] : ['/api/auth/login'];
  const attempts = [];
  for (const path of paths) {
    const response = await page.request.post(apiUrl(path), {
      data: { email, password },
      timeout: 30_000,
    });
    const body = await readJson(response);
    const token = tokenFrom(body);
    attempts.push({ path, status: response.status(), token: Boolean(token) });
    if (!response.ok() || body?.success === false || !token) continue;
    await verifyIdentity(page, token, email, role);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.evaluate((value) => localStorage.setItem('token', value), token);
    return token;
  }
  throw new Error(`${role} API login failed: ${JSON.stringify(attempts)}`);
}

async function uiLogin(page, email, password, role) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await waitStable(page);
  const emailFilled = await fillByLabelOrPlaceholder(page, 'email', email);
  const passwordFilled = await fillByLabelOrPlaceholder(page, 'password', password);
  expect(emailFilled, `${role} login email field was not found`).toBeTruthy();
  expect(passwordFilled, `${role} login password field was not found`).toBeTruthy();
  await clickLogin(page);
  await page.waitForFunction(() => Boolean(localStorage.getItem('token')), null, { timeout: 30_000 });
  const token = await page.evaluate(() => localStorage.getItem('token') || '');
  expect(token, `${role} login form did not create an authenticated token`).toBeTruthy();
  await verifyIdentity(page, token, email, role);
  await page.waitForURL((url) => !/\/login(?:[?#]|$)/i.test(url.pathname), { timeout: 15_000 }).catch(() => null);
  expect(page.url(), `${role} login did not leave the login page`).not.toMatch(/\/login(?:[?#]|$)/i);
}

test.describe('Churvox full launch public audit', () => {
  for (const route of publicRoutes) {
    test(`public page is readable and launch-clean: ${route}`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await expectBasics(page, route);
    });
  }
});

test.describe('Churvox authenticated login entry', () => {
  test('owner login form creates the correct authenticated session', async ({ page }) => {
    requireOrSkip(Boolean(OWNER_EMAIL && OWNER_PASSWORD), 'Set CHURVOX_OWNER_EMAIL and CHURVOX_OWNER_PASSWORD.');
    await uiLogin(page, OWNER_EMAIL, OWNER_PASSWORD, 'owner');
  });

  test('worker login form creates the correct authenticated session', async ({ page }) => {
    requireOrSkip(Boolean(WORKER_EMAIL && WORKER_PASSWORD), 'Set CHURVOX_WORKER_EMAIL and CHURVOX_WORKER_PASSWORD.');
    await uiLogin(page, WORKER_EMAIL, WORKER_PASSWORD, 'worker');
  });
});

test.describe('Churvox full launch owner audit', () => {
  test.beforeEach(async ({ page }) => {
    requireOrSkip(Boolean(OWNER_EMAIL && OWNER_PASSWORD), 'Set CHURVOX_OWNER_EMAIL and CHURVOX_OWNER_PASSWORD.');
    await apiLogin(page, OWNER_EMAIL, OWNER_PASSWORD, 'owner');
  });

  for (const hash of ownerHashes) {
    test(`owner area opens and is launch-clean: ${hash}`, async ({ page }) => {
      await page.goto(`/dashboard#${hash}`, { waitUntil: 'domcontentloaded' });
      expect(page.url(), `dashboard#${hash} redirected out of the authenticated owner area`).toMatch(/\/dashboard(?:[/?#]|$)/i);
      await expect(page.locator('body')).toContainText(/Churvox|Command|Job|Client|Quote|Invoice|Payroll|Xero|Support|Settings/i);
      await expectBasics(page, `dashboard#${hash}`);
    });
  }

  test('sidebar keeps full launch feature navigation', async ({ page, isMobile }) => {
    await page.goto('/dashboard#command');
    expect(page.url(), 'owner sidebar audit redirected out of dashboard').toMatch(/\/dashboard(?:[/?#]|$)/i);
    await waitStable(page);
    if (isMobile) {
      await page.getByRole('button', { name: /more/i }).click().catch(() => null);
      await waitStable(page);
    }
    const required = ['AI Guide', 'Command', 'Jobs', 'Clients', 'Quotes', 'Invoices', 'Team', 'Payroll', 'Xero', 'Settings', 'Support'];
    const missing = [];
    for (const item of required) {
      const found = await anyVisibleText(page, item);
      if (!found) missing.push(item);
    }
    expect(missing, 'missing launch nav items').toEqual([]);
  });
});

test.describe('Churvox full launch worker audit', () => {
  test.beforeEach(async ({ page }) => {
    requireOrSkip(Boolean(WORKER_EMAIL && WORKER_PASSWORD), 'Set CHURVOX_WORKER_EMAIL and CHURVOX_WORKER_PASSWORD.');
    await apiLogin(page, WORKER_EMAIL, WORKER_PASSWORD, 'worker');
  });

  test('worker jobs page is launch-clean and worker-scoped', async ({ page }) => {
    await page.goto('/worker/jobs', { waitUntil: 'domcontentloaded' });
    expect(page.url(), 'worker jobs audit redirected out of worker area').toMatch(/\/worker(?:[/?#]|$)/i);
    await expect(page.locator('body')).toContainText(/Today|Work|Job|Waiting|Assigned|Refresh/i);
    await expectBasics(page, 'worker jobs');
    await expect(page.locator('body')).not.toContainText(/Owner workspace|Platform Admin|Billing|Reports/i);
  });

  test('worker job detail has real field controls when a job is assigned', async ({ page }) => {
    await page.goto('/worker/jobs', { waitUntil: 'domcontentloaded' });
    expect(page.url(), 'worker detail audit redirected out of worker area').toMatch(/\/worker(?:[/?#]|$)/i);
    await waitStable(page);
    const firstJob = page.locator('a[href^="/worker/jobs/"]').first();
    const jobCount = await firstJob.count().catch(() => 0);
    requireOrSkip(jobCount > 0, 'No assigned worker job available for the required detail audit.');
    await firstJob.click();
    await waitStable(page);
    await expect(page.locator('body')).toContainText(/Job checklist|Work timer|Job notes|Photos|Finish job/i);
    await expectBasics(page, 'worker job detail');
  });
});
