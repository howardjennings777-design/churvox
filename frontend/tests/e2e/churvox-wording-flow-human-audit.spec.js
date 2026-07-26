const { test, expect } = require('@playwright/test');

const SITE_BASE = (process.env.PLAYWRIGHT_BASE_URL || 'https://www.churvox.com').replace(/\/+$/, '');
const API_BASE = (process.env.PLAYWRIGHT_API_BASE || 'https://grassley-backend.onrender.com').replace(/\/+$/, '');
const OWNER_EMAIL = process.env.CHURVOX_OWNER_EMAIL || '';
const OWNER_PASSWORD = process.env.CHURVOX_OWNER_PASSWORD || '';
const WORKER_EMAIL = process.env.CHURVOX_WORKER_EMAIL || '';
const WORKER_PASSWORD = process.env.CHURVOX_WORKER_PASSWORD || '';
const HQ_EMAIL = process.env.CHURVOX_HQ_EMAIL || 'hello@churvox.com';
const HQ_PASSWORD = process.env.CHURVOX_HQ_PASSWORD || OWNER_PASSWORD;

const publicRoutes = ['/', '/features', '/pricing', '/login', '/signup', '/support', '/contact', '/privacy', '/terms'];
const ownerRoutes = [
  ['/dashboard', 'Today'],
  ['/dashboard#command', 'Command'],
  ['/dashboard#work', 'Jobs'],
  ['/dashboard#clients', 'Clients'],
  ['/dashboard#quotes', 'Quotes'],
  ['/dashboard#invoices', 'Invoices'],
  ['/dashboard#messages', 'Messages'],
  ['/dashboard#staff', 'Team'],
  ['/dashboard#schedule', 'Schedule'],
  ['/dashboard#settings', 'Settings'],
  ['/dashboard#plans', 'Plans'],
  ['/dashboard#help', 'Help'],
];
const workerRoutes = ['/worker/today', '/worker/jobs', '/worker/messages', '/worker/help', '/worker/settings'];

function apiUrl(path) {
  return `${API_BASE}${path.startsWith('/api') ? path : `/api${path}`}`;
}

function siteUrl(path) {
  return `${SITE_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

function tokenFrom(body = {}) {
  return body.token || body.access_token || body.auth_token || body.jwt || body.accessToken
    || body.user?.token || body.user?.access_token || body.data?.token
    || body.data?.access_token || body.data?.user?.token || '';
}

function accountFrom(body = {}) {
  return body.user || body.data?.user || body.data || body || {};
}

async function readJson(response) {
  const text = await response.text().catch(() => '');
  try { return JSON.parse(text || '{}'); } catch { return { text: text.slice(0, 700) }; }
}

async function establishSession(page, email, password, role) {
  if (!email || !password) throw new Error(`Missing ${role} credentials for required wording and flow audit.`);
  const paths = role === 'worker' ? ['/api/auth/login', '/api/worker/auth/login'] : ['/api/auth/login'];
  const attempts = [];
  let loginBody = null;

  for (const path of paths) {
    const response = await page.request.post(apiUrl(path), { data: { email, password }, timeout: 30_000 });
    const body = await readJson(response);
    const token = tokenFrom(body);
    attempts.push({ path, status: response.status(), token: Boolean(token), detail: body.detail || body.message || '' });
    if (!response.ok() || body?.success === false || !token) continue;
    loginBody = body;
    break;
  }

  if (!loginBody) throw new Error(`${role} API login failed: ${JSON.stringify(attempts)}`);
  const token = tokenFrom(loginBody);
  const account = accountFrom(loginBody);

  for (const path of paths) {
    const response = await page.request.post(siteUrl(path), { data: { email, password }, timeout: 30_000 });
    const body = await readJson(response);
    if (response.ok() && body?.success !== false) break;
  }

  await page.addInitScript(({ seededToken, seededAccount }) => {
    localStorage.setItem('token', seededToken);
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('churvox:logged-out');
    if (seededAccount?.email) {
      localStorage.setItem('churvox_auth_session_snapshot_v1', JSON.stringify({
        at: Date.now(),
        token: seededToken,
        user: { ...seededAccount, token: seededToken },
      }));
    }
  }, { seededToken: token, seededAccount: account });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => Boolean(localStorage.getItem('token')) && window.__CHURVOX_AUTH_STATE__?.status === 'authenticated',
    null,
    { timeout: 30_000 },
  );
}

async function settle(page) {
  await page.waitForLoadState('domcontentloaded').catch(() => null);
  await page.waitForLoadState('networkidle', { timeout: 2500 }).catch(() => null);
  await page.waitForTimeout(650);
  await page.evaluate(() => window.churvoxFixVisibleControlText?.()).catch(() => null);
  await page.waitForTimeout(100);
}

async function auditVisibleWords(page, label, { blockPreviewLanguage = false } = {}) {
  const result = await page.evaluate(() => {
    const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const colour = (value) => {
      const match = String(value || '').match(/rgba?\(([^)]+)\)/i);
      if (!match) return null;
      const parts = match[1].split(',').map((part) => Number(String(part).trim()));
      if (parts.length < 3 || parts.some((part, index) => index < 3 && !Number.isFinite(part))) return null;
      return { r: parts[0], g: parts[1], b: parts[2], a: Number.isFinite(parts[3]) ? parts[3] : 1 };
    };
    const channel = (value) => {
      const next = Math.max(0, Math.min(255, Number(value || 0))) / 255;
      return next <= 0.03928 ? next / 12.92 : Math.pow((next + 0.055) / 1.055, 2.4);
    };
    const luminance = (value) => (0.2126 * channel(value.r)) + (0.7152 * channel(value.g)) + (0.0722 * channel(value.b));
    const contrast = (first, second) => {
      if (!first || !second) return 21;
      const high = Math.max(luminance(first), luminance(second));
      const low = Math.min(luminance(first), luminance(second));
      return (high + 0.05) / (low + 0.05);
    };
    const background = (element) => {
      let node = element;
      while (node && node !== document.documentElement) {
        const style = getComputedStyle(node);
        const value = colour(style.backgroundColor);
        if (value && value.a > 0.35) return value;
        if (String(style.backgroundImage || 'none') !== 'none') {
          const hint = `${node.className || ''} ${node.id || ''}`;
          return /dark|hero|header|nav|sidebar|shell|command|hq|worker|owner/i.test(hint)
            ? { r: 17, g: 24, b: 39, a: 1 }
            : { r: 247, g: 243, b: 234, a: 1 };
        }
        node = node.parentElement;
      }
      return colour(getComputedStyle(document.body).backgroundColor) || { r: 247, g: 243, b: 234, a: 1 };
    };
    const visible = (element) => {
      if (!element || element.closest('[hidden], [aria-hidden="true"]')) return false;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return rect.width > 2
        && rect.height > 2
        && style.display !== 'none'
        && style.visibility !== 'hidden'
        && Number(style.opacity || '1') > 0.02;
    };
    const classText = (element) => `${element.className || ''} ${element.parentElement?.className || ''}`;
    const pillLike = (element) => /pill|badge|chip|tag|status|filter|segment|tab|count|notice|current|health/i.test(classText(element))
      || element.matches('button.active, button.selected, button.is-active, button[aria-pressed="true"], button[aria-current="true"]');

    const issues = [];
    const controls = [...document.querySelectorAll('button, a[href], [role="button"], input, select, textarea')].filter(visible);
    for (const [index, element] of controls.entries()) {
      const name = clean(element.innerText || element.textContent || element.getAttribute('aria-label') || element.getAttribute('placeholder') || element.getAttribute('title') || element.getAttribute('name'));
      if (!name) issues.push(`visible control ${index + 1} has no readable name`);
    }

    const pillCandidates = [...document.querySelectorAll('button, a[href], span, small, strong, b, em, [role="button"]')]
      .filter((element) => visible(element) && pillLike(element));
    for (const element of pillCandidates) {
      const name = clean(element.innerText || element.textContent || element.getAttribute('aria-label') || element.getAttribute('title') || element.getAttribute('data-cv-visible-label'));
      if (!name) continue;
      const descendants = [element, ...element.querySelectorAll('span, small, strong, b, em, label')];
      const hasReadableNode = descendants.some((node) => {
        const text = clean(node.innerText || node.textContent || node.getAttribute?.('data-cv-visible-label'));
        if (!text) return false;
        const style = getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        const size = Number.parseFloat(style.fontSize || '0');
        const foreground = colour(style.color);
        const clipped = style.overflow === 'hidden' && node.clientWidth > 0 && node.scrollWidth > node.clientWidth + 6;
        return rect.width > 1
          && rect.height > 1
          && style.display !== 'none'
          && style.visibility !== 'hidden'
          && Number(style.opacity || '1') >= 0.5
          && (!foreground || foreground.a >= 0.5)
          && contrast(foreground, background(node)) >= 2.35
          && (!Number.isFinite(size) || size === 0 || size >= 9)
          && !clipped;
      });
      if (!hasReadableNode) issues.push(`pill text not human-visible: ${name.slice(0, 80)}`);
    }

    const body = document.body;
    const text = clean(body?.innerText || '');
    const scrollWidth = Math.max(document.documentElement.scrollWidth, body?.scrollWidth || 0);
    const viewportWidth = document.documentElement.clientWidth;
    const headings = [...document.querySelectorAll('h1, h2')].filter(visible).map((item) => clean(item.innerText)).filter(Boolean);
    return {
      issues: [...new Set(issues)].slice(0, 50),
      text,
      headings,
      overflow: scrollWidth - viewportWidth,
      controls: controls.length,
    };
  });

  expect(result.text.length, `${label} rendered too little usable wording`).toBeGreaterThan(60);
  expect(result.controls, `${label} has no usable controls`).toBeGreaterThan(0);
  expect(result.headings.length, `${label} has no visible page heading`).toBeGreaterThan(0);
  expect(result.overflow, `${label} horizontally overflows`).toBeLessThanOrEqual(18);
  expect(result.issues, `${label} has invisible pill wording or unnamed controls`).toEqual([]);
  expect(result.text, `${label} shows broken/internal wording`).not.toMatch(/\bundefined\b|\bnull\b|\[object Object\]|lorem ipsum|temporary copy|todo:/i);
  if (blockPreviewLanguage) {
    expect(result.text, `${label} is a live page but still presents itself as sample/demo/preview data`).not.toMatch(/sample records|sample businesses|sample account|preview uses sample|private rebuild preview|demo data|mock data/i);
  }
}

async function auditRoute(page, route, label, options) {
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await settle(page);
  await auditVisibleWords(page, label, options);
}

test.describe('Churvox wording, page and flow human audit', () => {
  test.setTimeout(540_000);

  test('public pages use clear visible wording and usable controls', async ({ page }) => {
    for (const route of publicRoutes) {
      await auditRoute(page, route, `public ${route}`, { blockPreviewLanguage: true });
    }
  });

  test('owner can move through the whole working site without invisible pills', async ({ page }) => {
    await establishSession(page, OWNER_EMAIL, OWNER_PASSWORD, 'owner');
    for (const [route, label] of ownerRoutes) {
      await auditRoute(page, route, `owner ${label}`, { blockPreviewLanguage: true });
    }
  });

  test('worker can move through field pages with every action word visible', async ({ page }) => {
    await establishSession(page, WORKER_EMAIL, WORKER_PASSWORD, 'worker');
    for (const route of workerRoutes) {
      await auditRoute(page, route, `worker ${route}`, { blockPreviewLanguage: true });
      expect(page.url(), `${route} redirected outside worker app`).toMatch(/\/worker(?:[/?#]|$)/i);
    }
  });

  test('My HQ is live, organised and each workspace is usable', async ({ page }) => {
    await establishSession(page, HQ_EMAIL, HQ_PASSWORD, 'platform owner');
    await auditRoute(page, '/admin', 'My HQ live control', { blockPreviewLanguage: true });
    await expect(page.getByRole('heading', { name: /Your live Churvox control room/i })).toBeVisible();
    await expect(page.getByText('Connected to live HQ controls', { exact: true })).toBeVisible();

    for (const workspace of ['Live control', 'Outreach', 'Tester applications']) {
      const button = page.getByRole('button', { name: new RegExp(`^${workspace}$`, 'i') }).first();
      await expect(button, `missing My HQ workspace: ${workspace}`).toBeVisible();
      await button.click();
      await settle(page);
      await auditVisibleWords(page, `My HQ ${workspace}`, { blockPreviewLanguage: true });
    }
  });

  test('private HQ rebuild is wired to the same live My HQ', async ({ page }) => {
    await establishSession(page, HQ_EMAIL, HQ_PASSWORD, 'platform owner');
    await auditRoute(page, '/new-command-lab?surface=hq', 'private connected My HQ', { blockPreviewLanguage: true });
    await expect(page.locator('[data-live-hq-workspace="true"]')).toBeVisible();
    await expect(page.locator('[data-live-hq="true"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /^Live control$/i })).toBeVisible();
  });
});
