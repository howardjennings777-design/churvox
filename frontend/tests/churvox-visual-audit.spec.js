const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'https://www.churvox.com';
const TEST_EMAIL = process.env.CHURVOX_TEST_EMAIL || '';
const TEST_PASSWORD = process.env.CHURVOX_TEST_PASSWORD || '';

const publicPages = [
  ['home', '/'],
  ['login', '/login'],
  ['signup', '/signup'],
  ['plans-public', '/plans'],
  ['privacy', '/privacy'],
  ['terms', '/terms']
];

const appPages = [
  ['dashboard', '/dashboard'],
  ['jobs', '/jobs'],
  ['jobs-board', '/jobs-board'],
  ['clients', '/clients'],
  ['quotes', '/quotes'],
  ['invoices', '/invoices'],
  ['calendar', '/calendar'],
  ['team', '/team'],
  ['payroll', '/payroll'],
  ['reports', '/reports'],
  ['plans-auth', '/plans'],
  ['settings', '/settings'],
  ['settings-board', '/settings-board'],
  ['support-board', '/support-board'],
  ['billing', '/billing'],
  ['worker-jobs', '/worker/jobs']
];

const viewports = [
  ['desktop', { width: 1440, height: 1000 }],
  ['tablet', { width: 768, height: 1024 }],
  ['mobile', { width: 390, height: 844 }]
];

const actionWords = /view|details|review|open|edit|create|add|prepare|approve|invoice|quote|save|choose|help|support/i;

function slug(value) {
  return String(value || 'item')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70) || 'item';
}

async function settle(page) {
  await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(900);
}

async function gotoPage(page, route) {
  try {
    await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  } catch (err) {
    const msg = String(err?.message || err || '');
    if (!msg.includes('ERR_ABORTED') && !msg.includes('frame was detached')) throw err;
    await page.waitForTimeout(1000);
    await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => null);
  }
  await settle(page);
}

async function assertPageHealthy(page, label) {
  const bodyText = (await page.locator('body').innerText({ timeout: 20000 }).catch(() => '')).trim();
  expect(bodyText.length, `${label} should not be blank`).toBeGreaterThan(20);

  for (const bad of ['Failed to compile', 'Application error', 'Something went wrong', 'Minified React error', 'undefined is not a function', 'null is not a function']) {
    expect(bodyText, `${label} should not show ${bad}`).not.toContain(bad);
  }

  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return Math.max(doc.scrollWidth - doc.clientWidth, document.body.scrollWidth - document.body.clientWidth);
  });
  expect(overflow, `${label} should not have major horizontal overflow`).toBeLessThanOrEqual(48);
}

async function login(page) {
  if (!TEST_EMAIL || !TEST_PASSWORD) return false;

  await gotoPage(page, '/login');
  const email = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
  const password = page.locator('input[type="password"], input[name="password"], input[placeholder*="password" i]').first();

  if (!(await email.count()) || !(await password.count())) return false;

  await email.fill(TEST_EMAIL);
  await password.fill(TEST_PASSWORD);

  const submit = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in"), button:has-text("Log in")').first();
  if (await submit.count()) await submit.click();
  else await password.press('Enter');

  await settle(page);
  await gotoPage(page, '/dashboard');

  const body = await page.locator('body').innerText().catch(() => '');
  const stillOnLogin = /sign in to the command floor|forgot password|owner approval access/i.test(body) || page.url().includes('/login');
  return !stillOnLogin;
}

async function closeSlip(page) {
  const candidates = [
    page.getByRole('button', { name: /close/i }).first(),
    page.getByRole('button', { name: /cancel/i }).first(),
    page.locator('button[aria-label*="close" i]').first()
  ];

  for (const button of candidates) {
    if (await button.count()) {
      await button.click({ timeout: 1500 }).catch(() => {});
      await page.waitForTimeout(400);
      return;
    }
  }

  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(400);
}

async function screenshotPageAndActions(page, viewportName, pageName, route) {
  await gotoPage(page, route);
  await assertPageHealthy(page, `${viewportName}-${pageName}`);

  await page.screenshot({
    path: `test-results/visual-audit/${viewportName}/${pageName}/page.png`,
    fullPage: true
  });

  const actions = page.locator('button:visible, a:visible, [role="button"]:visible');
  const count = Math.min(await actions.count(), 35);
  let captured = 0;

  for (let i = 0; i < count && captured < 8; i += 1) {
    const action = actions.nth(i);
    const label = ((await action.innerText().catch(() => '')) || '').trim();
    if (!label || !actionWords.test(label)) continue;

    const box = await action.boundingBox().catch(() => null);
    if (!box || box.width < 24 || box.height < 24) continue;

    const beforeUrl = page.url();
    await action.click({ timeout: 3000 }).catch(() => null);
    await settle(page);

    await page.screenshot({
      path: `test-results/visual-audit/${viewportName}/${pageName}/action-${captured + 1}-${slug(label)}.png`,
      fullPage: true
    });
    captured += 1;

    if (page.url() !== beforeUrl) {
      await page.goto(beforeUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
      await settle(page);
    } else {
      await closeSlip(page);
    }
  }
}

test.describe('Churvox visual audit for pages and slips', () => {
  test.setTimeout(420000);

  test('screenshots public pages, app pages and common slips', async ({ page }) => {
    const browserErrors = [];

    page.on('pageerror', (err) => browserErrors.push(err.message));
    page.on('console', (msg) => {
      const text = msg.text() || '';
      const ignored = ['favicon', 'Failed to load resource', '401', '403', '404', '422'].some((part) => text.includes(part));
      if (msg.type() === 'error' && !ignored) browserErrors.push(text);
    });

    for (const [viewportName, viewport] of viewports) {
      await page.setViewportSize(viewport);

      for (const [pageName, route] of publicPages) {
        await screenshotPageAndActions(page, viewportName, pageName, route);
      }

      const loggedIn = await login(page);
      expect(loggedIn, 'Visual audit login should work').toBeTruthy();

      for (const [pageName, route] of appPages) {
        await screenshotPageAndActions(page, viewportName, pageName, route);
      }
    }

    expect(browserErrors, 'Visual audit should not find serious browser errors').toEqual([]);
  });
});
