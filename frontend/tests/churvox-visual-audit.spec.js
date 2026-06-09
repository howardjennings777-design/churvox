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

const slipPages = [
  ['dashboard', '/dashboard'],
  ['jobs-board', '/jobs-board'],
  ['jobs', '/jobs'],
  ['clients', '/clients'],
  ['quotes', '/quotes'],
  ['invoices', '/invoices'],
  ['team', '/team'],
  ['plans-auth', '/plans'],
  ['settings', '/settings']
];

const viewports = [
  ['desktop', { width: 1440, height: 1000 }],
  ['tablet', { width: 768, height: 1024 }],
  ['mobile', { width: 390, height: 844 }]
];

const actionWords = /view|details|review|open|edit|create|add|prepare|approve|invoice|quote|choose|help|support/i;

function slug(value) {
  return String(value || 'item')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'item';
}

async function settle(page) {
  await page.waitForLoadState('networkidle', { timeout: 7000 }).catch(() => {});
  await page.waitForTimeout(500);
}

async function hideHelpBubble(page) {
  await page.addStyleTag({
    content: `
      .cv-help-fab,
      [class*="help-fab"],
      [class*="HelpFab"],
      button[aria-label*="help" i] {
        display: none !important;
        pointer-events: none !important;
        opacity: 0 !important;
      }
    `
  }).catch(() => {});
}

async function gotoPage(page, route) {
  await page.goto(`${BASE_URL}${route}`, {
    waitUntil: 'domcontentloaded',
    timeout: 35000
  }).catch(async (err) => {
    const msg = String(err?.message || err || '');
    if (!msg.includes('ERR_ABORTED') && !msg.includes('frame was detached')) {
      throw err;
    }
  });

  await hideHelpBubble(page);
  await settle(page);
}

async function assertHealthy(page, label) {
  const bodyText = (await page.locator('body').innerText({ timeout: 12000 }).catch(() => '')).trim();
  expect(bodyText.length, `${label} should not be blank`).toBeGreaterThan(20);

  for (const bad of [
    'Failed to compile',
    'Application error',
    'Something went wrong',
    'Minified React error',
    'undefined is not a function',
    'null is not a function'
  ]) {
    expect(bodyText, `${label} should not show ${bad}`).not.toContain(bad);
  }

  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return Math.max(
      doc.scrollWidth - doc.clientWidth,
      document.body.scrollWidth - document.body.clientWidth
    );
  });

  expect(overflow, `${label} should not have major horizontal overflow`).toBeLessThanOrEqual(90);
}

async function login(page) {
  test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'Set CHURVOX_TEST_EMAIL and CHURVOX_TEST_PASSWORD.');

  await gotoPage(page, '/login?cacheReset=1');

  const email = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
  const password = page.locator('input[type="password"], input[name="password"], input[placeholder*="password" i]').first();

  await expect(email, 'login email input should exist').toBeVisible({ timeout: 15000 });
  await expect(password, 'login password input should exist').toBeVisible({ timeout: 15000 });

  await email.fill(TEST_EMAIL);
  await password.fill(TEST_PASSWORD);

  await hideHelpBubble(page);

  const submit = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in"), button:has-text("Log in")').first();

  if (await submit.count()) {
    await submit.click({ force: true, timeout: 8000 }).catch(async () => {
      await password.press('Enter');
    });
  } else {
    await password.press('Enter');
  }

  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2000);

  await gotoPage(page, '/dashboard');

  const body = await page.locator('body').innerText().catch(() => '');
  const stillOnLogin =
    /sign in to the command floor|forgot password|owner approval access/i.test(body) ||
    page.url().includes('/login');

  expect(stillOnLogin, `login should reach dashboard, current URL: ${page.url()}`).toBeFalsy();
}

async function capturePage(page, viewportName, pageName, route) {
  await gotoPage(page, route);
  await assertHealthy(page, `${viewportName}-${pageName}`);

  await page.screenshot({
    path: `test-results/visual-audit/${viewportName}/${pageName}/page.png`,
    fullPage: false,
    timeout: 15000
  });
}

async function closeAnySlip(page) {
  const buttons = [
    page.getByRole('button', { name: /close/i }).first(),
    page.getByRole('button', { name: /cancel/i }).first(),
    page.locator('button[aria-label*="close" i]').first()
  ];

  for (const button of buttons) {
    if (await button.count()) {
      await button.click({ timeout: 1200 }).catch(() => {});
      await page.waitForTimeout(300);
      return;
    }
  }

  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(300);
}

async function captureDesktopActions(page, pageName, route) {
  await gotoPage(page, route);

  const actions = page.locator('button:visible, a:visible, [role="button"]:visible');
  const count = Math.min(await actions.count(), 18);
  let captured = 0;

  for (let i = 0; i < count && captured < 2; i += 1) {
    const action = actions.nth(i);
    const label = ((await action.innerText().catch(() => '')) || '').trim();

    if (!label || !actionWords.test(label)) continue;

    const box = await action.boundingBox().catch(() => null);
    if (!box || box.width < 24 || box.height < 24) continue;

    const beforeUrl = page.url();

    await action.click({ timeout: 2000 }).catch(() => null);
    await settle(page);

    await page.screenshot({
      path: `test-results/visual-audit/desktop/${pageName}/action-${captured + 1}-${slug(label)}.png`,
      fullPage: false,
      timeout: 15000
    }).catch(() => null);

    captured += 1;

    if (page.url() !== beforeUrl) {
      await page.goto(beforeUrl, { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
      await settle(page);
    } else {
      await closeAnySlip(page);
    }
  }
}

test.describe('Churvox visual audit', () => {
  test.setTimeout(300000);

  test('screenshots public pages on desktop tablet mobile', async ({ page }) => {
    for (const [viewportName, viewport] of viewports) {
      await page.setViewportSize(viewport);

      for (const [pageName, route] of publicPages) {
        await capturePage(page, viewportName, pageName, route);
      }
    }
  });

  test('screenshots logged-in app pages on desktop tablet mobile', async ({ browser }) => {
    const page = await browser.newPage();

    await login(page);

    for (const [viewportName, viewport] of viewports) {
      await page.setViewportSize(viewport);

      for (const [pageName, route] of appPages) {
        await capturePage(page, viewportName, pageName, route);
      }
    }

    await page.close();
  });

  test('screenshots common desktop slips and action states', async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

    await login(page);

    for (const [pageName, route] of slipPages) {
      await captureDesktopActions(page, pageName, route);
    }

    await page.close();
  });
});
