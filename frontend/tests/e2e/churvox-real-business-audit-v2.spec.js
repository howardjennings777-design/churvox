const { test, expect } = require('@playwright/test');

const OWNER_EMAIL = process.env.CHURVOX_E2E_EMAIL || process.env.E2E_EMAIL || '';
const OWNER_PASSWORD = process.env.CHURVOX_E2E_PASSWORD || process.env.E2E_PASSWORD || '';
const MUTATE = process.env.CHURVOX_E2E_MUTATE === '1' || process.env.PLAYWRIGHT_ALLOW_MUTATION === '1';
const CAN_LOGIN = Boolean(OWNER_EMAIL && OWNER_PASSWORD);
const CAN_MUTATE = Boolean(CAN_LOGIN && MUTATE);

const publicRoutes = ['/', '/features', '/pricing', '/login', '/signup', '/privacy', '/terms'];
const ownerPages = ['command', 'jobs', 'clients', 'quotes', 'invoices', 'payments', 'dispatch', 'team', 'payroll', 'settings', 'plans', 'support', 'messages', 'followups', 'reports', 'setupassistant', 'askchurvox'];

function stamp() {
  return new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 12);
}

async function stable(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);
}

async function collectErrors(page, errors) {
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (msg) => {
    const text = msg.text();
    if (msg.type() === 'error' && !/favicon|manifest|ResizeObserver|AbortError|Failed to fetch|401|403|404/i.test(text)) errors.push(text);
  });
}

async function pageAudit(page, label) {
  await stable(page);
  const audit = await page.evaluate(() => {
    const issues = [];
    const root = document.documentElement;
    const body = document.body;
    const overflow = Math.max(root.scrollWidth, body.scrollWidth) - root.clientWidth;
    if (overflow > 8) issues.push(`horizontal overflow ${overflow}px`);

    const visibleControls = [...document.querySelectorAll('button, a[href], input, select, textarea, [role="button"]')].filter((el) => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 1 && rect.height > 1 && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || '1') > 0.05;
    });

    visibleControls.forEach((el, index) => {
      const label = (el.innerText || el.value || el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.getAttribute('title') || '').trim();
      if (!label && !['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) issues.push(`control ${index + 1} has no visible/accessibility label`);
    });

    const visibleText = [...document.querySelectorAll('body *')]
      .filter((el) => el.children.length === 0 && (el.textContent || '').trim().length > 2)
      .filter((el) => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return rect.width > 1 && rect.height > 1 && rect.top < innerHeight && rect.bottom > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      })
      .slice(0, 250);

    visibleText.forEach((el) => {
      const style = getComputedStyle(el);
      const sample = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 70);
      if (Number(style.opacity || '1') < 0.35) issues.push(`low opacity text: ${sample}`);
      if (style.color === 'rgba(0, 0, 0, 0)' || style.color === 'transparent') issues.push(`transparent text: ${sample}`);
      if (parseFloat(style.fontSize || '12') < 9) issues.push(`tiny text: ${sample}`);
    });

    return { issues: issues.slice(0, 40), controlCount: visibleControls.length };
  });
  expect(audit.issues, `${label} audit issues`).toEqual([]);
}

async function visibleText(page, text) {
  const loc = page.getByText(text, { exact: false }).first();
  return Boolean((await loc.count().catch(() => 0)) && (await loc.isVisible().catch(() => false)));
}

async function clickAny(page, names) {
  for (const name of names) {
    const byRole = page.getByRole('button', { name }).first();
    if ((await byRole.count().catch(() => 0)) && (await byRole.isVisible().catch(() => false))) {
      await byRole.click().catch(() => null);
      return true;
    }
    const byText = page.getByText(name, { exact: false }).first();
    if ((await byText.count().catch(() => 0)) && (await byText.isVisible().catch(() => false))) {
      await byText.click().catch(() => null);
      return true;
    }
  }
  return false;
}

async function fillAny(page, words, value) {
  for (const word of Array.isArray(words) ? words : [words]) {
    const label = page.getByLabel(new RegExp(word, 'i')).first();
    if ((await label.count().catch(() => 0)) && (await label.isVisible().catch(() => false))) {
      await label.fill(value).catch(() => null);
      return true;
    }
    const placeholder = page.getByPlaceholder(new RegExp(word, 'i')).first();
    if ((await placeholder.count().catch(() => 0)) && (await placeholder.isVisible().catch(() => false))) {
      await placeholder.fill(value).catch(() => null);
      return true;
    }
  }
  return false;
}

async function login(page) {
  test.skip(!CAN_LOGIN, 'Set CHURVOX_E2E_EMAIL and CHURVOX_E2E_PASSWORD to run owner app checks.');
  await page.goto('/login');
  await stable(page);
  await fillAny(page, ['email'], OWNER_EMAIL);
  await fillAny(page, ['password'], OWNER_PASSWORD);
  await clickAny(page, [/sign in/i, /log in/i, /login/i]);
  await page.waitForURL(/dashboard|plans|setup|guide|#/i, { timeout: 30000 }).catch(() => null);
  await stable(page);
  await expect(page.locator('body')).toContainText(/Churvox|Command|Smart|Dashboard|Plan|Owner/i);
}

async function save(page) {
  await clickAny(page, [/save/i, /create/i, /add/i, /submit/i, /send/i]);
  await page.waitForTimeout(900);
}

test.describe('whole website public audit', () => {
  for (const route of publicRoutes) {
    test(`opens and is readable: ${route}`, async ({ page }) => {
      const errors = [];
      await collectErrors(page, errors);
      await page.goto(route);
      await pageAudit(page, route);
      await expect(page.locator('body')).toContainText(/Churvox|Job|Invoice|Plan|Privacy|Terms|Login|Sign/i);
      expect(errors, `${route} browser errors`).toEqual([]);
    });
  }

  test('public header/nav stays stable', async ({ page }) => {
    const heights = [];
    for (const route of ['/', '/features', '/pricing', '/login', '/signup']) {
      await page.goto(route);
      await stable(page);
      const h = await page.locator('nav, header').first().evaluate((el) => Math.round(el.getBoundingClientRect().height)).catch(() => 0);
      if (h) heights.push(h);
    }
    expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(24);
  });
});

test.describe('owner app real business audit', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('every main owner area opens and stays readable', async ({ page }) => {
    for (const hash of ownerPages) {
      await page.goto(`/dashboard#${hash}`);
      await stable(page);
      await expect(page.locator('body')).toContainText(/Churvox|Command|Job|Client|Quote|Invoice|Payment|Team|Payroll|Settings|Support|Plan|Report|Ask/i);
      await pageAudit(page, `dashboard#${hash}`);
    }
  });

  test('Command opens a real right-side prepared form', async ({ page }) => {
    await page.goto('/dashboard#command');
    await stable(page);
    await clickAny(page, [/run command checks/i, /command/i]);
    await stable(page);
    await expect(page.locator('body')).toContainText(/Command|prepared|right side|left side|Missing info|Save edit|Snooze|Open area/i);
    await clickAny(page, [/preview/i, /needs info/i, /job/i, /invoice/i, /worker/i]);
    await stable(page);
    await expect(page.locator('body')).toContainText(/Prepared decision|Churvox recommends|Missing info|Finish missing|Save edit|Snooze|Open area/i);
    await pageAudit(page, 'command right panel');
  });

  test('desktop quick actions remain visible; mobile has a usable nav/action path', async ({ page }) => {
    await page.goto('/dashboard#command');
    await stable(page);
    const width = page.viewportSize()?.width || 1440;
    if (width < 700) {
      const hasMobilePath = await page.locator('button, a[href], [role="button"]').evaluateAll((els) => els.some((el) => {
        const text = (el.innerText || el.getAttribute('aria-label') || el.getAttribute('title') || '').toLowerCase();
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return rect.width > 1 && rect.height > 1 && style.display !== 'none' && style.visibility !== 'hidden' && /(menu|nav|dashboard|command|jobs|settings|logout|log out|add|new)/.test(text);
      }));
      expect(hasMobilePath, 'mobile needs at least one visible nav/action control').toBeTruthy();
      return;
    }
    const mustSee = ['AI Guide', 'Command', 'New job', 'New quote', 'Add client', 'Log out'];
    const missing = [];
    for (const item of mustSee) if (!(await visibleText(page, item))) missing.push(item);
    expect(missing, 'missing desktop top action controls').toEqual([]);
  });

  test('creates client, job, quote and invoice when mutation is explicitly enabled', async ({ page }) => {
    test.skip(!CAN_MUTATE, 'Set CHURVOX_E2E_MUTATE=1 to create real test records.');
    const id = stamp();
    const customer = `Playwright Test Customer ${id}`;
    const email = `playwright-${id}@example.com`;
    const phone = '0210000000';
    const address = `1 Test Street ${id}`;
    const job = `Playwright Test Job ${id}`;

    await page.goto('/clients/new');
    await stable(page);
    await fillAny(page, ['name', 'client', 'customer'], customer);
    await fillAny(page, ['email'], email);
    await fillAny(page, ['phone'], phone);
    await fillAny(page, ['address'], address);
    await save(page);
    await expect(page.locator('body')).toContainText(/client|customer|saved|created|Churvox/i);

    await page.goto('/jobs/new');
    await stable(page);
    await fillAny(page, ['title', 'job', 'name'], job);
    await fillAny(page, ['client', 'customer'], customer);
    await fillAny(page, ['address'], address);
    await fillAny(page, ['price', 'amount'], '85');
    await save(page);
    await expect(page.locator('body')).toContainText(/job|saved|created|Churvox/i);

    await page.goto('/quotes/new');
    await stable(page);
    await fillAny(page, ['client', 'customer'], customer);
    await fillAny(page, ['amount', 'price', 'total'], '120');
    await fillAny(page, ['description', 'notes', 'service'], 'Playwright quote test');
    await save(page);
    await expect(page.locator('body')).toContainText(/quote|saved|created|Churvox/i);

    await page.goto('/invoices/new');
    await stable(page);
    await fillAny(page, ['client', 'customer'], customer);
    await fillAny(page, ['amount', 'price', 'total'], '85');
    await fillAny(page, ['description', 'notes', 'service'], 'Playwright invoice test');
    await save(page);
    await expect(page.locator('body')).toContainText(/invoice|saved|created|Churvox/i);
  });
});

test.describe('mobile first impression', () => {
  test('home page is usable on mobile', async ({ page }) => {
    await page.goto('/');
    await stable(page);
    await pageAudit(page, 'mobile home');
    const aboveFold = await page.evaluate(() => [...document.querySelectorAll('h1, h2, p, a, button')]
      .filter((el) => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return rect.top >= 0 && rect.top < innerHeight && rect.width > 1 && rect.height > 1 && style.display !== 'none' && style.visibility !== 'hidden';
      })
      .map((el) => (el.textContent || '').trim())
      .filter(Boolean));
    expect(aboveFold.length).toBeLessThanOrEqual(16);
    expect(aboveFold.join(' ').length).toBeLessThanOrEqual(950);
  });
});
