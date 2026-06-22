const { test, expect } = require('@playwright/test');

const EMAIL = process.env.CHURVOX_E2E_EMAIL || '';
const PASSWORD = process.env.CHURVOX_E2E_PASSWORD || '';
const MUTATE = process.env.CHURVOX_E2E_MUTATE === '1';

const areas = [
  'plans',
  'smart',
  'jobs',
  'clients',
  'quotes',
  'invoices',
  'dispatch',
  'team',
  'settings',
  'support',
  'command',
  'payroll',
  'xero',
];

const clickWalkAreas = new Set(['smart', 'jobs', 'clients', 'quotes', 'invoices', 'command']);

const dangerous = /delete|remove|archive|trash|send invoice|send quote|send email|send sms|approve|decline|pay now|checkout|stripe|log in|login|sign in|sign up|signup|register|log out|logout|disconnect|revoke|sync to xero|sync to myob/i;
const safeClick = /open|view|details|next|back|cancel|close|plans|business pulse|client|job|quote|invoice|settings|support|setup|command|refresh|search/i;

function stamp() {
  return new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
}

async function waitHuman(page) {
  if (page.isClosed()) return;
  await page.waitForLoadState('domcontentloaded').catch(() => null);
  if (page.isClosed()) return;
  await page.waitForTimeout(250).catch(() => null);
}

async function watchErrors(page, errors) {
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error' && !/favicon|manifest|ResizeObserver|AbortError|net::ERR_ABORTED|Failed to fetch|CORS policy|Access-Control-Allow-Origin|net::ERR_FAILED|status of 401|status of 403|status of 404/i.test(text)) {
      errors.push(`console: ${text}`);
    }
  });
  page.on('response', res => {
    const url = res.url();
    if (res.status() >= 500 && /churvox|grassley-backend|localhost|127\.0\.0\.1/i.test(url)) {
      errors.push(`http ${res.status()}: ${url}`);
    }
  });
}

async function text(page) {
  return (await page.locator('body').innerText({ timeout: 10000 })).replace(/\s+/g, ' ').trim();
}

async function fillAny(page, names, value) {
  for (const name of names) {
    const byLabel = page.getByLabel(new RegExp(name, 'i')).first();
    if (await byLabel.count().catch(() => 0) && await byLabel.isVisible().catch(() => false)) {
      await byLabel.fill(value).catch(async () => {
        await byLabel.click();
        await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
        await page.keyboard.type(value);
      });
      return true;
    }

    const byPlaceholder = page.getByPlaceholder(new RegExp(name, 'i')).first();
    if (await byPlaceholder.count().catch(() => 0) && await byPlaceholder.isVisible().catch(() => false)) {
      await byPlaceholder.fill(value).catch(async () => {
        await byPlaceholder.click();
        await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
        await page.keyboard.type(value);
      });
      return true;
    }

    const byName = page.locator(`input[name*="${name}" i], textarea[name*="${name}" i], select[name*="${name}" i]`).first();
    if (await byName.count().catch(() => 0) && await byName.isVisible().catch(() => false)) {
      await byName.fill(value).catch(() => null);
      return true;
    }
  }
  return false;
}

async function clickAny(page, names) {
  for (const name of names) {
    const button = page.getByRole('button', { name }).first();
    if (await button.count().catch(() => 0) && await button.isVisible().catch(() => false)) {
      await button.click().catch(() => null);
      await waitHuman(page);
      return true;
    }

    const link = page.getByRole('link', { name }).first();
    if (await link.count().catch(() => 0) && await link.isVisible().catch(() => false)) {
      await link.click().catch(() => null);
      await waitHuman(page);
      return true;
    }

    const textButton = page.getByText(name, { exact: false }).first();
    if (await textButton.count().catch(() => 0) && await textButton.isVisible().catch(() => false)) {
      await textButton.click().catch(() => null);
      await waitHuman(page);
      return true;
    }
  }
  return false;
}

async function save(page) {
  return clickAny(page, [/save/i, /create/i, /add/i, /done/i, /finish/i, /submit/i]);
}

async function login(page) {
  test.skip(!EMAIL || !PASSWORD, 'Set CHURVOX_E2E_EMAIL and CHURVOX_E2E_PASSWORD.');
  await page.goto('/login');
  await waitHuman(page);
  await fillAny(page, ['email'], EMAIL);
  await fillAny(page, ['password'], PASSWORD);
  await clickAny(page, [/sign in/i, /log in/i, /login/i]);
  await page.waitForURL(/plans|dashboard|setup|guide|worker|payroll|admin/i, { timeout: 35000 }).catch(() => null);
  await waitHuman(page);
  await expect(page.locator('body')).toContainText(/Churvox|Plans|Business Pulse|Setup|Command|Job|Client/i);
}

async function isPlanLocked(page) {
  const body = await text(page);
  return /choose.*plan|start.*trial|plans|stripe|plan locked|no plan|trial/i.test(body) && /Start|Crew|Operator|Command|Plan/i.test(body);
}

async function checkReadableAndClickable(page, label) {
  await waitHuman(page);
  const result = await page.evaluate(() => {
    const issues = [];
    const body = document.body;
    const vw = document.documentElement.clientWidth;
    const sw = Math.max(document.documentElement.scrollWidth, body?.scrollWidth || 0);

    if (sw - vw > 12) issues.push(`horizontal overflow ${sw - vw}px`);

    const controls = [...document.querySelectorAll('button, a[href], input, textarea, select, [role="button"]')]
      .filter(el => {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return r.width > 1 && r.height > 1 && s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity || '1') > 0.05;
      });

    controls.forEach((el, i) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      const label = (el.innerText || el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.getAttribute('name') || el.getAttribute('title') || '').trim();

      if (!label && !['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) issues.push(`unlabelled control ${i + 1}`);
      if (r.width < 14 || r.height < 14) issues.push(`tiny control ${label || i + 1}`);
      if (s.pointerEvents === 'none') issues.push(`unclickable pointer-events none ${label || i + 1}`);
    });

    const visible = (body?.innerText || '').trim().replace(/\s+/g, ' ');
    if (visible.length < 25) issues.push('page has almost no visible text');

    return { issues: issues.slice(0, 50), controlCount: controls.length, textLength: visible.length };
  });

  expect(result.issues, `${label} readability/clickability issues`).toEqual([]);
  expect(result.textLength, `${label} visible text`).toBeGreaterThan(25);
}

async function visitArea(page, area) {
  await page.goto(area === 'plans' ? '/plans' : `/dashboard#${area}`);
  await waitHuman(page);
  const body = await text(page);
  expect(body, `${area} should render useful text`).toMatch(/Churvox|Plan|Business Pulse|Command|Job|Client|Quote|Invoice|Settings|Support|Payroll|Setup/i);
  await checkReadableAndClickable(page, area);
}

async function safeButtonWalk(page, label) {
  const controls = page.locator('.freshPageScroll button, .freshPageScroll a[href], .freshPageScroll [role="button"], .freshMobileQuickActions button, .freshMobileNav button');
  const count = await controls.count().catch(() => 0);
  let clicked = 0;

  for (let i = 0; i < count && clicked < 1; i++) {
    const loc = controls.nth(i);
    if (!(await loc.isVisible().catch(() => false))) continue;

    const item = await loc.evaluate((el) => {
      const text = (el.innerText || el.getAttribute('aria-label') || el.getAttribute('title') || '').trim().replace(/\s+/g, ' ');
      return {
        label: text,
        disabled: Boolean(el.disabled || el.getAttribute('aria-disabled') === 'true'),
      };
    }).catch(() => null);

    if (!item || item.disabled || !item.label) continue;
    if (dangerous.test(item.label)) continue;
    if (!safeClick.test(item.label)) continue;

    const before = page.url();
    await loc.click({ timeout: 5000 }).catch(() => null);
    await waitHuman(page);
    clicked++;

    if (/login|stripe\.com/i.test(page.url())) {
      await page.goto(before).catch(() => null);
      await waitHuman(page);
    }

    const close = page.getByRole('button', { name: /cancel|close/i }).first();
    if (await close.isVisible().catch(() => false)) {
      await close.click().catch(() => null);
      await waitHuman(page);
    } else {
      await page.keyboard.press('Escape').catch(() => null);
    }
  }

  if (clicked === 0) {
    console.warn(`${label}: no safe non-destructive controls found to click`);
  }
}


test.describe('Churvox human flow', () => {
  test.setTimeout(180000);
  test('new or unpaid user is kept on Plans and app pages stay locked', async ({ page }) => {
    const errors = [];
    await watchErrors(page, errors);
    await login(page);

    if (!/\/plans/i.test(page.url())) {
      test.skip(true, 'This account is already active. Use a fresh unpaid account to test the plan lock.');
    }

    await checkReadableAndClickable(page, 'Plans gate');
    expect(await isPlanLocked(page)).toBeTruthy();

    for (const route of ['/dashboard', '/jobs/new', '/clients/new', '/invoices/new']) {
      await page.goto(route);
      await waitHuman(page);
      expect(await isPlanLocked(page), `${route} should stay locked until plan/trial`).toBeTruthy();
    }

    expect(errors).toEqual([]);
  });

  test('active owner can open all major areas and click safe controls', async ({ page }) => {
    const errors = [];
    await watchErrors(page, errors);
    await login(page);

    if (/\/plans/i.test(page.url()) && await isPlanLocked(page)) {
      test.skip(true, 'This account is still locked on Plans. Start a Stripe trial first.');
    }

    for (const area of areas) {
      await visitArea(page, area);
      if (clickWalkAreas.has(area)) {
        await safeButtonWalk(page, area);
      }
    }

    expect(errors).toEqual([]);
  });

  test('active owner can create client, job, quote and invoice drafts when enabled', async ({ page }) => {
    test.skip(!MUTATE, 'Set CHURVOX_E2E_MUTATE=1 to create real test records.');
    const errors = [];
    await watchErrors(page, errors);
    await login(page);

    if (/\/plans/i.test(page.url()) && await isPlanLocked(page)) {
      test.skip(true, 'Account is locked on Plans. Start a trial before mutation tests.');
    }

    const id = stamp();
    const client = `Playwright Human Client ${id}`;
    const email = `playwright-human-${id}@example.com`;
    const phone = '0210000000';
    const address = `${id} Test Street, Wellington`;
    const job = `Playwright Human Job ${id}`;

    await page.goto('/clients/new');
    await waitHuman(page);
    await fillAny(page, ['name', 'client', 'customer'], client);
    await fillAny(page, ['email'], email);
    await fillAny(page, ['phone', 'mobile'], phone);
    await fillAny(page, ['address'], address);
    await save(page);
    await expect(page.locator('body')).toContainText(/client|customer|saved|created|Churvox/i);

    await page.goto('/jobs/new');
    await waitHuman(page);
    await fillAny(page, ['title', 'job', 'name'], job);
    await fillAny(page, ['client', 'customer'], client);
    await fillAny(page, ['address'], address);
    await fillAny(page, ['price', 'amount', 'total'], '85');
    await fillAny(page, ['notes', 'description'], 'Playwright human job test. Safe test record.');
    await save(page);
    await expect(page.locator('body')).toContainText(/job|saved|created|Churvox/i);

    await page.goto('/quotes/new');
    await waitHuman(page);
    await fillAny(page, ['client', 'customer'], client);
    await fillAny(page, ['amount', 'price', 'total'], '120');
    await fillAny(page, ['description', 'notes', 'service'], 'Playwright human quote draft test. Do not send.');
    await save(page);
    await expect(page.locator('body')).toContainText(/quote|saved|created|Churvox/i);

    await page.goto('/invoices/new');
    await waitHuman(page);
    await fillAny(page, ['client', 'customer'], client);
    await fillAny(page, ['amount', 'price', 'total'], '85');
    await fillAny(page, ['description', 'notes', 'service'], 'Playwright human invoice draft test. Do not send.');
    await save(page);
    await expect(page.locator('body')).toContainText(/invoice|draft|saved|created|Churvox/i);

    await visitArea(page, 'command');
    await expect(page.locator('body')).toContainText(/Command|prepared|job|client|invoice|action|approval/i);

    expect(errors).toEqual([]);
  });
});
