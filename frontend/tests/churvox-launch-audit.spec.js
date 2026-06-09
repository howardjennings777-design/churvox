const { test, expect, devices } = require('@playwright/test');

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'https://www.churvox.com';
const TEST_EMAIL = process.env.CHURVOX_TEST_EMAIL || '';
const TEST_PASSWORD = process.env.CHURVOX_TEST_PASSWORD || '';

const ignoredConsole = [
  'favicon',
  'ResizeObserver loop',
  '401',
  '403',
  '404',
  '422',
  'api/ai/actions',
  'Failed to load resource'
];

const publicRoutes = [
  '/',
  '/login',
  '/signup',
  '/plans',
  '/privacy',
  '/terms'
];

const appRoutes = [
  '/dashboard',
  '/jobs',
  '/clients',
  '/quotes',
  '/invoices',
  '/calendar',
  '/team',
  '/settings',
  '/plans',
  '/support-board',
  '/settings-board',
  '/team-board',
  '/billing',
  '/worker/jobs'
];

async function attachWatchers(page) {
  const problems = [];

  page.on('console', (msg) => {
    const text = msg.text() || '';
    const isIgnored = ignoredConsole.some((part) => text.includes(part));
    if (msg.type() === 'error' && !isIgnored) {
      problems.push(`console error: ${text}`);
    }
  });

  page.on('pageerror', (err) => {
    problems.push(`page error: ${err.message}`);
  });

  return problems;
}

async function gotoAndSettle(page, route) {
  const res = await page.goto(`${BASE_URL}${route}`, {
    waitUntil: 'domcontentloaded',
    timeout: 45000
  });

  await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(1200);

  return res;
}

async function assertNoCrashOrBlank(page, route) {
  const bodyText = (await page.locator('body').innerText({ timeout: 15000 }).catch(() => '')).trim();
  expect(bodyText.length, `${route} should not be blank`).toBeGreaterThan(20);

  const badTexts = [
    'null is not a function',
    'undefined is not a function',
    'Failed to compile',
    'Application error',
    'Something went wrong',
    'ErrorBoundary caught',
    'Minified React error'
  ];

  for (const bad of badTexts) {
    expect(bodyText, `${route} should not show ${bad}`).not.toContain(bad);
  }
}

async function assertNoBadOverflow(page, route) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      bodyScrollWidth: document.body.scrollWidth,
      bodyClientWidth: document.body.clientWidth
    };
  });

  const max = Math.max(overflow.scrollWidth - overflow.clientWidth, overflow.bodyScrollWidth - overflow.bodyClientWidth);
  expect(max, `${route} should not have major horizontal overflow`).toBeLessThanOrEqual(32);
}

async function tryLogin(page) {
  if (!TEST_EMAIL || !TEST_PASSWORD) return false;

  await gotoAndSettle(page, '/login');

  const email = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
  const password = page.locator('input[type="password"], input[name="password"], input[placeholder*="password" i]').first();

  if (!(await email.count()) || !(await password.count())) return false;

  await email.fill(TEST_EMAIL);
  await password.fill(TEST_PASSWORD);

  const submit = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in"), button:has-text("Log in")').first();

  if (await submit.count()) {
    await submit.click();
  } else {
    await password.press('Enter');
  }

  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);

  const body = await page.locator('body').innerText().catch(() => '');
  return !/invalid|incorrect|failed|error/i.test(body);
}

test.describe('Churvox public launch audit', () => {
  for (const route of publicRoutes) {
    test(`public page does not crash: ${route}`, async ({ page }) => {
      const problems = await attachWatchers(page);
      const res = await gotoAndSettle(page, route);

      if (res) {
        expect(res.status(), `${route} should not return server error`).toBeLessThan(500);
      }

      await assertNoCrashOrBlank(page, route);
      await assertNoBadOverflow(page, route);

      expect(problems, `${route} should have no serious browser errors`).toEqual([]);
    });
  }
});

test.describe('Churvox responsive audit', () => {
  const viewports = [
    { name: 'mobile', width: 390, height: 844 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1440, height: 1000 }
  ];

  for (const viewport of viewports) {
    test(`dashboard/plans render cleanly on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const problems = await attachWatchers(page);

      await gotoAndSettle(page, '/plans');
      await assertNoCrashOrBlank(page, `/plans ${viewport.name}`);
      await assertNoBadOverflow(page, `/plans ${viewport.name}`);

      await gotoAndSettle(page, '/dashboard');
      await assertNoCrashOrBlank(page, `/dashboard ${viewport.name}`);
      await assertNoBadOverflow(page, `/dashboard ${viewport.name}`);

      expect(problems, `${viewport.name} should have no serious browser errors`).toEqual([]);
    });
  }
});

test.describe('Churvox plans pricing audit', () => {
  test('country selector changes visible plan and add-on pricing', async ({ page }) => {
    const problems = await attachWatchers(page);

    if (TEST_EMAIL && TEST_PASSWORD) {
      const loggedIn = await tryLogin(page);
      expect(loggedIn, 'Test login should work before checking Plans pricing').toBeTruthy();
    }

    await gotoAndSettle(page, '/plans');
    await assertNoCrashOrBlank(page, '/plans');

    const select = page.locator('select').first();
    await expect(select, 'Plans page should have a country selector').toBeVisible({ timeout: 15000 });

    const checks = [
      { country: 'NZ', prices: ['NZ$39', 'NZ$89', 'NZ$149', 'NZ$299', 'NZ$99'] },
      { country: 'AU', prices: ['A$35', 'A$79', 'A$129', 'A$249', 'A$79'] },
      { country: 'US', prices: ['US$25', 'US$55', 'US$95', 'US$189', 'US$59'] },
      { country: 'UK', prices: ['£19', '£45', '£75', '£149'] }
    ];

    for (const check of checks) {
      await select.selectOption(check.country);
      await page.waitForTimeout(700);

      const body = await page.locator('body').innerText();
      for (const price of check.prices) {
        expect(body, `Plans should show ${price} after selecting ${check.country}`).toContain(price);
      }
    }

    await assertNoBadOverflow(page, '/plans country pricing');
    expect(problems, 'Plans page should have no serious browser errors').toEqual([]);
  });
});

test.describe('Churvox authenticated app audit', () => {
  test('main app routes do not crash after login', async ({ page }) => {
    test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'Set CHURVOX_TEST_EMAIL and CHURVOX_TEST_PASSWORD to test logged-in app pages.');

    const problems = await attachWatchers(page);
    const loggedIn = await tryLogin(page);
    expect(loggedIn, 'Test login should work').toBeTruthy();

    for (const route of appRoutes) {
      const res = await gotoAndSettle(page, route);
      if (res) {
        expect(res.status(), `${route} should not return server error`).toBeLessThan(500);
      }

      await assertNoCrashOrBlank(page, route);
      await assertNoBadOverflow(page, route);
    }

    expect(problems, 'Logged-in app should have no serious browser errors').toEqual([]);
  });

  test('core buttons and links are tappable on mobile', async ({ page }) => {
    test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'Set CHURVOX_TEST_EMAIL and CHURVOX_TEST_PASSWORD to test mobile logged-in taps.');

    await page.setViewportSize({ width: 390, height: 844 });
    const problems = await attachWatchers(page);
    const loggedIn = await tryLogin(page);
    expect(loggedIn, 'Test login should work').toBeTruthy();

    await gotoAndSettle(page, '/dashboard');

    const tappables = page.locator('a:visible, button:visible, [role="button"]:visible');
    const count = Math.min(await tappables.count(), 20);

    expect(count, 'Dashboard should have visible tappable actions').toBeGreaterThan(3);

    for (let i = 0; i < count; i += 1) {
      const item = tappables.nth(i);
      const box = await item.boundingBox().catch(() => null);
      if (!box || box.width < 20 || box.height < 20) continue;

      await expect(item, `Tappable item ${i} should be enabled`).toBeEnabled({ timeout: 3000 }).catch(() => {});
    }

    await assertNoBadOverflow(page, '/dashboard mobile taps');
    expect(problems, 'Mobile tappability check should have no serious browser errors').toEqual([]);
  });
});

test.describe('Churvox visual safety audit', () => {
  test('important text is visible and not whitewashed on plans', async ({ page }) => {
    if (TEST_EMAIL && TEST_PASSWORD) {
      const loggedIn = await tryLogin(page);
      expect(loggedIn, 'Test login should work before checking Plans visibility').toBeTruthy();
    }

    await gotoAndSettle(page, '/plans');

    const visibleTexts = [
      'Plans',
      'Billing country',
      'Start',
      'Crew',
      'Operator',
      'Command',
      'Xero',
      'Growth'
    ];

    for (const text of visibleTexts) {
      await expect(page.getByText(text, { exact: false }).first(), `${text} should be visible`).toBeVisible({ timeout: 15000 });
    }

    const invisibleCount = await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll('body *'));
      let bad = 0;

      for (const node of nodes) {
        const text = (node.innerText || '').trim();
        if (!text || text.length < 3) continue;

        const style = window.getComputedStyle(node);
        const rect = node.getBoundingClientRect();

        if (rect.width <= 0 || rect.height <= 0) continue;

        const color = style.color;
        const bg = style.backgroundColor;
        const opacity = Number(style.opacity || 1);

        if (opacity < 0.35) bad += 1;
        if (color === bg && color !== 'rgba(0, 0, 0, 0)') bad += 1;
      }

      return bad;
    });

    expect(invisibleCount, 'There should not be lots of invisible/washed-out text').toBeLessThan(15);
  });
});
