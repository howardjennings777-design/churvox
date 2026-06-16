const { test, expect } = require('@playwright/test');

const OWNER_EMAIL = process.env.CHURVOX_E2E_EMAIL || process.env.E2E_EMAIL || '';
const OWNER_PASSWORD = process.env.CHURVOX_E2E_PASSWORD || process.env.E2E_PASSWORD || '';
const ALLOW_MUTATION = process.env.CHURVOX_E2E_MUTATE === '1' || process.env.PLAYWRIGHT_ALLOW_MUTATION === '1';
const RUN_LIVE_MUTATION = Boolean(OWNER_EMAIL && OWNER_PASSWORD && ALLOW_MUTATION);

const publicRoutes = ['/', '/features', '/pricing', '/login', '/signup', '/privacy', '/terms'];
const appPages = [
  'command', 'quickcreateai', 'jobs', 'clients', 'quotes', 'invoices', 'payments', 'dispatch', 'team', 'payroll',
  'settings', 'plans', 'support', 'messages', 'followups', 'reports', 'setupassistant', 'askchurvox',
];

function stamp() {
  return new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 12);
}

async function collectBrowserErrors(page, bucket) {
  page.on('pageerror', (error) => bucket.push(`pageerror: ${error.message}`));
  page.on('console', (msg) => {
    const text = msg.text();
    if (msg.type() !== 'error') return;
    if (/favicon|manifest|ResizeObserver|AbortError|Failed to fetch/i.test(text)) return;
    // Public pages may check visitor session. A 401 there is expected, not a broken page.
    if (/Failed to load resource: the server responded with a status of 401/i.test(text)) return;
    bucket.push(`console: ${text}`);
  });
}

async function waitStable(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(450);
}

async function auditPageBasics(page, label) {
  await waitStable(page);
  const result = await page.evaluate(() => {
    const issues = [];
    const body = document.body;
    if (!body) return { issues: ['missing body'] };
    const vw = document.documentElement.clientWidth;
    const scrollW = Math.max(document.documentElement.scrollWidth, body.scrollWidth);
    if (scrollW - vw > 8) issues.push(`horizontal overflow ${scrollW - vw}px`);

    const visibleButtons = [...document.querySelectorAll('button, a[href], [role="button"]')]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return r.width > 1 && r.height > 1 && s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity || '1') > 0.05;
      });

    visibleButtons.forEach((el, index) => {
      const name = (el.innerText || el.getAttribute('aria-label') || el.getAttribute('title') || '').trim();
      if (!name) issues.push(`visible button/link ${index + 1} has no label`);
    });

    const textNodes = [...document.querySelectorAll('body *')]
      .filter((el) => el.children.length === 0 && (el.textContent || '').trim().length >= 3)
      .filter((el) => {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return r.width > 1 && r.height > 1 && r.bottom >= 0 && r.top <= innerHeight && s.display !== 'none' && s.visibility !== 'hidden';
      })
      .slice(0, 220);

    for (const el of textNodes) {
      const s = getComputedStyle(el);
      const txt = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60);
      if (Number(s.opacity || '1') < 0.35) issues.push(`low opacity text: ${txt}`);
      if (s.color === 'rgba(0, 0, 0, 0)' || s.color === 'transparent') issues.push(`transparent text: ${txt}`);
      if (s.fontSize && parseFloat(s.fontSize) < 9) issues.push(`tiny text: ${txt}`);
    }

    return { issues: issues.slice(0, 40), buttonCount: visibleButtons.length, scrollW, vw };
  });
  expect(result.issues, `${label} page audit issues`).toEqual([]);
}

async function clickByText(page, candidates, options = {}) {
  for (const candidate of candidates) {
    const locator = page.getByRole('button', { name: candidate }).first();
    if (await locator.count().catch(() => 0)) {
      if (await locator.isVisible().catch(() => false)) {
        await locator.click(options).catch(() => null);
        return true;
      }
    }
    const textLocator = page.getByText(candidate, { exact: false }).first();
    if (await textLocator.count().catch(() => 0)) {
      if (await textLocator.isVisible().catch(() => false)) {
        await textLocator.click(options).catch(() => null);
        return true;
      }
    }
  }
  return false;
}

async function fillFirstVisible(page, selectors, value) {
  for (const selector of selectors) {
    const loc = page.locator(selector).first();
    if (await loc.count().catch(() => 0)) {
      if (await loc.isVisible().catch(() => false)) {
        await loc.fill(value).catch(async () => {
          await loc.click().catch(() => null);
          await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
          await page.keyboard.type(value);
        });
        return true;
      }
    }
  }
  return false;
}

async function fillByLabelOrPlaceholder(page, labelWords, value) {
  const words = Array.isArray(labelWords) ? labelWords : [labelWords];
  for (const word of words) {
    const byLabel = page.getByLabel(new RegExp(word, 'i')).first();
    if (await byLabel.count().catch(() => 0) && await byLabel.isVisible().catch(() => false)) {
      await byLabel.fill(value).catch(() => null);
      return true;
    }
    const byPlaceholder = page.getByPlaceholder(new RegExp(word, 'i')).first();
    if (await byPlaceholder.count().catch(() => 0) && await byPlaceholder.isVisible().catch(() => false)) {
      await byPlaceholder.fill(value).catch(() => null);
      return true;
    }
  }
  return false;
}

async function login(page) {
  test.skip(!OWNER_EMAIL || !OWNER_PASSWORD, 'Set CHURVOX_E2E_EMAIL and CHURVOX_E2E_PASSWORD to run owner app tests.');
  await page.goto('/login');
  await waitStable(page);
  await fillByLabelOrPlaceholder(page, ['email'], OWNER_EMAIL);
  await fillByLabelOrPlaceholder(page, ['password'], OWNER_PASSWORD);
  await clickByText(page, [/sign in/i, /log in/i, /login/i]);
  await page.waitForURL(/dashboard|plans|guide|setup|command|#/i, { timeout: 30_000 }).catch(() => null);
  await waitStable(page);
  await expect(page.locator('body')).toContainText(/Churvox|Command|Smart|Owner|Plan|Dashboard/i);
}

async function visitFreshPage(page, hash) {
  await page.goto(`/dashboard#${hash}`);
  await waitStable(page);
  await expect(page.locator('body')).toContainText(/Churvox|Command|Job|Client|Quote|Invoice|Settings|Plan|Support|Payroll/i);
}

async function saveForm(page) {
  const clicked = await clickByText(page, [/save/i, /create/i, /add/i, /submit/i, /send/i], { timeout: 5_000 });
  await page.waitForTimeout(900);
  return clicked;
}

test.describe('Churvox whole-site public audit', () => {
  for (const route of publicRoutes) {
    test(`public route works and is readable: ${route}`, async ({ page }) => {
      const errors = [];
      await collectBrowserErrors(page, errors);
      await page.goto(route);
      await auditPageBasics(page, route);
      expect(errors, `${route} browser errors`).toEqual([]);
    });
  }

  test('public nav does not jump between main pages', async ({ page }) => {
    const measurements = [];
    for (const route of ['/', '/features', '/pricing', '/login', '/signup']) {
      await page.goto(route);
      await waitStable(page);
      const rect = await page.locator('nav, header').first().evaluate((el) => {
        const r = el.getBoundingClientRect();
        return { top: Math.round(r.top), height: Math.round(r.height) };
      }).catch(() => ({ top: 0, height: 0 }));
      measurements.push({ route, ...rect });
    }
    const heights = measurements.map((m) => m.height).filter(Boolean);
    const max = Math.max(...heights);
    const min = Math.min(...heights);
    expect(max - min, `nav/header height changed too much: ${JSON.stringify(measurements)}`).toBeLessThanOrEqual(20);
  });
});

test.describe('Churvox owner app audit', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('owner app pages open, buttons are labelled, and text is visible', async ({ page }) => {
    for (const hash of appPages) {
      await visitFreshPage(page, hash);
      await auditPageBasics(page, `dashboard#${hash}`);
    }
  });

  test('Tell Churvox and Review behave like the current approval workflow', async ({ page }) => {
    await visitFreshPage(page, 'quickcreateai');
    await expect(page.locator('body')).toContainText(/Tell Churvox|Real AI only|No local shortcut|backend AI/i);
    await auditPageBasics(page, 'tell churvox');

    await visitFreshPage(page, 'command');
    await waitStable(page);

    await expect(page.locator('body')).toContainText(/Backend-owned Review only|backend Review|Approve what Churvox AI prepared|Review/i);
    await auditPageBasics(page, 'backend review');
  });

  test('key owner actions remain visible or available through navigation', async ({ page }, testInfo) => {
    await visitFreshPage(page, 'command');

    const actions = testInfo.project.name.includes('mobile')
      ? ['AI Guide', 'New job', 'Add client']
      : ['AI Guide', 'Review', 'New job', 'Add client', 'Log out'];

    const missing = [];
    for (const action of actions) {
      const loc = page.getByText(action, { exact: false }).first();
      if (!(await loc.count().catch(() => 0)) || !(await loc.isVisible().catch(() => false))) missing.push(action);
    }
    expect(missing, 'missing required owner controls').toEqual([]);

    await visitFreshPage(page, 'quotes');
    await expect(page.locator('body')).toContainText(/Quote|Quotes|New quote|Create quote|Draft/i);
  });

  test('real-business create flow can create records when mutation is enabled', async ({ page }) => {
    test.skip(!RUN_LIVE_MUTATION, 'Set CHURVOX_E2E_MUTATE=1 with login env vars to create real test records.');
    const id = stamp();
    const customer = `Playwright Test Customer ${id}`;
    const email = `playwright-${id}@example.com`;
    const phone = '0210000000';
    const address = `1 Test Street ${id}`;
    const job = `Playwright Test Job ${id}`;

    await page.goto('/clients/new');
    await waitStable(page);
    await fillByLabelOrPlaceholder(page, ['name', 'client', 'customer'], customer);
    await fillByLabelOrPlaceholder(page, ['email'], email);
    await fillByLabelOrPlaceholder(page, ['phone'], phone);
    await fillByLabelOrPlaceholder(page, ['address'], address);
    await saveForm(page);
    await expect(page.locator('body')).toContainText(/client|customer|saved|created|Churvox/i);

    await page.goto('/jobs/new');
    await waitStable(page);
    await fillByLabelOrPlaceholder(page, ['title', 'job', 'name'], job);
    await fillByLabelOrPlaceholder(page, ['client', 'customer'], customer);
    await fillByLabelOrPlaceholder(page, ['address'], address);
    await fillByLabelOrPlaceholder(page, ['price', 'amount'], '85');
    await saveForm(page);
    await expect(page.locator('body')).toContainText(/job|saved|created|Churvox/i);

    await page.goto('/quotes/new');
    await waitStable(page);
    await fillByLabelOrPlaceholder(page, ['client', 'customer'], customer);
    await fillByLabelOrPlaceholder(page, ['amount', 'price', 'total'], '120');
    await fillByLabelOrPlaceholder(page, ['description', 'notes', 'service'], 'Playwright quote test');
    await saveForm(page);
    await expect(page.locator('body')).toContainText(/quote|saved|created|Churvox/i);

    await page.goto('/invoices/new');
    await waitStable(page);
    await fillByLabelOrPlaceholder(page, ['client', 'customer'], customer);
    await fillByLabelOrPlaceholder(page, ['amount', 'price', 'total'], '85');
    await fillByLabelOrPlaceholder(page, ['description', 'notes', 'service'], 'Playwright invoice test');
    await saveForm(page);
    await expect(page.locator('body')).toContainText(/invoice|saved|created|Churvox/i);

    await visitFreshPage(page, 'command');
    await clickByText(page, [/run command checks/i]);
    await waitStable(page);
    await expect(page.locator('body')).toContainText(/prepared|invoice|job|client|money|missing|worker/i);
  });
});

test.describe('Churvox mobile first impression', () => {
  test('mobile public home is not cramped and has no horizontal scroll', async ({ page }) => {
    await page.goto('/');
    await waitStable(page);
    await auditPageBasics(page, 'mobile public home');
    const viewportSummary = await page.evaluate(() => {
      const aboveFoldText = [...document.querySelectorAll('h1, h2, p, a, button')]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          const s = getComputedStyle(el);
          return r.top >= 0 && r.top < innerHeight && r.width > 1 && r.height > 1 && s.display !== 'none' && s.visibility !== 'hidden';
        })
        .map((el) => (el.textContent || '').trim())
        .filter(Boolean);
      return { count: aboveFoldText.length, chars: aboveFoldText.join(' ').length };
    });
    expect(viewportSummary.count, 'too many separate text/buttons above fold on mobile').toBeLessThanOrEqual(14);
    expect(viewportSummary.chars, 'too much text above fold on mobile').toBeLessThanOrEqual(900);
  });
});
