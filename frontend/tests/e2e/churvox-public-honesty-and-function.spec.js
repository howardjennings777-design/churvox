const { test, expect } = require('@playwright/test');

const PUBLIC_ROUTES = [
  '/',
  '/product',
  '/features',
  '/industries/lawn-care',
  '/demo',
  '/pricing',
  '/request',
  '/contact',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/privacy',
  '/terms',
  '/legal/privacy',
  '/legal/terms',
  '/delete-account',
  '/app',
  '/quote/test-token',
  '/invoice/test-token',
  '/client/test-token',
  '/proof/test-token',
];

const PRIMARY_MARKETING_ROUTES = ['/', '/product', '/features', '/industries/lawn-care', '/demo', '/pricing', '/request', '/contact'];
const DISHONEST_COPY = /trusted by\s+\d|five[- ]star|5[- ]star|guaranteed results?|zero bugs?|fully automatic|live customer data|real customer activity|thousands of customers/i;
const EXAMPLE_RECORD_COPY = /sample data only|clearly labelled sample records|example workspace|example client|sample business|example records|configuration examples|demo names, amounts and jobs are examples/i;
const EXAMPLE_DISCLOSURE = /sample data only|clearly labelled sample records|example workspace|preview only|demo names, amounts and jobs are examples|configuration examples|interactive product sample|examples only/i;
const OLD_RUNTIME_SELECTORS = [
  '#churvox-paid-launch-stable-owner-text',
  '#churvox-paid-launch-client-form',
  '[id^="churvox-paid-launch-fallback-"]',
  '.cvxPaidLaunchFallbackForm',
];

function json(body, status = 200) {
  return { status, contentType: 'application/json', body: JSON.stringify(body) };
}

async function installSafePublicApi(page) {
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (/\/public\/customer-request$/i.test(pathname) && request.method() === 'POST') {
      await route.fulfill(json({ success: true, request_id: 'safe-public-test' }));
      return;
    }
    if (/\/(?:quote|invoice|client|proof)\//i.test(pathname)) {
      await route.fulfill(json({ success: false, detail: 'Test record not found' }, 404));
      return;
    }
    if (/\/auth\/(?:me|check|session)/i.test(pathname)) {
      await route.fulfill(json({ success: false, user: null }, 401));
      return;
    }
    await route.fulfill(json({ success: true, data: [], items: [], records: [] }));
  });
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

async function settle(page) {
  await page.waitForLoadState('domcontentloaded').catch(() => null);
  await page.waitForLoadState('networkidle', { timeout: 1400 }).catch(() => null);
  await page.waitForTimeout(220);
}

async function pageHealth(page, mobile) {
  return page.evaluate(({ mobile, oldSelectors }) => {
    const root = document.documentElement;
    const body = document.body;
    const visible = (element) => {
      if (!element || element.closest('[hidden], [aria-hidden="true"]')) return false;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0.03 && rect.width > 1 && rect.height > 1;
    };
    const issues = [];
    const text = String(body?.innerText || '').replace(/\s+/g, ' ').trim();
    if (text.length < 25) issues.push(`blank/short page (${text.length} chars)`);
    if (/application error|something went wrong|cannot read propert|undefined is not a function/i.test(text)) issues.push('fatal error copy visible');
    const overflow = Math.max(root.scrollWidth, body?.scrollWidth || 0) - root.clientWidth;
    if (overflow > 14) issues.push(`horizontal overflow ${overflow}px`);
    for (const selector of oldSelectors) {
      if ([...document.querySelectorAll(selector)].some(visible)) issues.push(`old injected runtime UI visible: ${selector}`);
    }
    const controls = [...document.querySelectorAll('button, a[href], input, textarea, select, summary, [role="button"]')].filter(visible);
    for (const control of controls) {
      const rect = control.getBoundingClientRect();
      const label = String(control.innerText || control.textContent || control.getAttribute('aria-label') || control.getAttribute('placeholder') || control.getAttribute('name') || '').trim().replace(/\s+/g, ' ');
      if (!label && !['INPUT', 'TEXTAREA', 'SELECT'].includes(control.tagName)) issues.push(`unlabelled ${control.tagName.toLowerCase()}`);
      if (!control.disabled && mobile && !['INPUT'].includes(control.tagName) && (rect.height < 28 || rect.width < 28)) issues.push(`tiny mobile control ${label || control.tagName}`);
      if (getComputedStyle(control).pointerEvents === 'none' && !control.disabled) issues.push(`untappable control ${label || control.tagName}`);
      if (control.tagName === 'A') {
        const href = String(control.getAttribute('href') || '').trim();
        if (!href || href === '#' || /^javascript:/i.test(href)) issues.push(`dead link ${label || '(unlabelled)'}`);
      }
    }
    const ids = new Set();
    for (const element of document.querySelectorAll('[id]')) {
      if (ids.has(element.id)) issues.push(`duplicate id ${element.id}`);
      ids.add(element.id);
    }
    return { issues: [...new Set(issues)].slice(0, 80), text, controls: controls.length };
  }, { mobile, oldSelectors: OLD_RUNTIME_SELECTORS });
}

async function openPublic(page, pathname) {
  await page.goto(pathname, { waitUntil: 'domcontentloaded' });
  await settle(page);
  await expect(page.locator('body')).toBeVisible();
}

test.describe('Churvox public honesty and functionality', () => {
  test.beforeEach(async ({ page }) => {
    await installSafePublicApi(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  });

  test('every public, auth, legal and public-record route renders safely', async ({ page }, testInfo) => {
    test.setTimeout(150_000);
    const errors = watchRuntime(page);
    const mobile = /mobile/i.test(testInfo.project.name);

    for (const pathname of PUBLIC_ROUTES) {
      await openPublic(page, pathname);
      const result = await pageHealth(page, mobile);
      expect(result.issues, `${pathname} health problems`).toEqual([]);
    }

    expect(errors, 'runtime errors during complete public route crawl').toEqual([]);
  });

  test('marketing claims stay honest and all displayed records are clearly labelled', async ({ page }) => {
    for (const pathname of PRIMARY_MARKETING_ROUTES) {
      await openPublic(page, pathname);
      await page.waitForTimeout(2400);
      const text = (await page.locator('body').innerText()).replace(/\s+/g, ' ').trim();
      expect(text, `${pathname} contains an unsupported marketing claim`).not.toMatch(DISHONEST_COPY);

      if (EXAMPLE_RECORD_COPY.test(text) && pathname !== '/pricing') {
        expect(text, `${pathname} shows example records without an honesty label`).toMatch(EXAMPLE_DISCLOSURE);
      }

      for (const selector of OLD_RUNTIME_SELECTORS) {
        await expect(page.locator(selector), `${pathname} must not show injected fallback UI`).toHaveCount(0);
      }
    }

    await openPublic(page, '/demo');
    await expect(page.getByText(/clearly labelled sample records/i)).toBeVisible();
    await expect(page.getByText(/Sample business/i)).toBeVisible();
    await expect(page.getByText(/Nothing from this sample is copied into the account/i)).toBeVisible();
  });

  test('all visible internal marketing links resolve to real pages', async ({ page }) => {
    const links = new Set();
    for (const pathname of PRIMARY_MARKETING_ROUTES) {
      await openPublic(page, pathname);
      const hrefs = await page.locator('a[href^="/"]:visible').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href')).filter(Boolean));
      hrefs.forEach((href) => {
        const clean = String(href).split('#')[0];
        if (clean && !clean.includes(':token')) links.add(clean);
      });
    }

    expect(links.size, 'public navigation should expose a useful internal link graph').toBeGreaterThan(8);
    for (const href of links) {
      await openPublic(page, href);
      const text = (await page.locator('body').innerText()).replace(/\s+/g, ' ').trim();
      expect(text.length, `${href} resolved to a blank page`).toBeGreaterThan(25);
      expect(text, `${href} resolved to an application failure`).not.toMatch(/application error|something went wrong|page not found/i);
    }
  });

  test('footer legal links and contact actions are real', async ({ page }) => {
    await openPublic(page, '/');
    const privacy = page.getByRole('link', { name: 'Privacy' }).last();
    const terms = page.getByRole('link', { name: 'Terms' }).last();
    await expect(privacy).toHaveAttribute('href', '/legal/privacy');
    await expect(terms).toHaveAttribute('href', '/legal/terms');

    await privacy.click();
    await expect(page).toHaveURL(/\/legal\/privacy$/);
    await expect(page.locator('body')).toContainText(/privacy/i);

    await openPublic(page, '/contact');
    const email = page.locator('a[href="mailto:hello@churvox.com"]').first();
    await expect(email).toBeVisible();
  });

  test('public request form validates and sends a real payload to the safe API', async ({ page }) => {
    let posted = null;
    await page.unroute('**/api/**');
    await page.route('**/api/**', async (route) => {
      const request = route.request();
      const pathname = new URL(request.url()).pathname;
      if (/\/public\/customer-request$/i.test(pathname) && request.method() === 'POST') {
        posted = request.postDataJSON();
        await route.fulfill(json({ success: true, request_id: 'safe-public-test' }));
        return;
      }
      await route.fulfill(json({ success: true, data: [] }));
    });

    await openPublic(page, '/request?owner=owner%40safe.test');
    await page.getByRole('button', { name: /Send request/i }).click();
    await expect(page.getByText(/Please add your name/i)).toBeVisible();

    await page.getByPlaceholder('Your name').fill('Public Test Person');
    await page.getByPlaceholder('Phone number').fill('0210000000');
    await page.getByPlaceholder(/Lawn mowing, garden tidy/i).fill('Example lawn tidy request');
    await page.getByRole('button', { name: /Send request/i }).click();

    await expect(page.getByText(/Request sent/i).first()).toBeVisible();
    expect(posted).toMatchObject({
      customer_name: 'Public Test Person',
      customer_phone: '0210000000',
      service_needed: 'Example lawn tidy request',
      owner_email: 'owner@safe.test',
      source: 'public_customer_request',
    });
  });
});
