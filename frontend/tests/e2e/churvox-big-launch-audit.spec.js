const { test, expect } = require('@playwright/test');

const PUBLIC_ROUTES = ['/', '/pricing', '/features', '/login', '/signup', '/privacy-policy', '/terms-of-service'];
const PROTECTED_ROUTES = ['/dashboard', '/jobs', '/clients', '/invoices', '/quotes', '/team', '/plans', '/admin/usage'];
const APP_NAV_LABELS = ['Command', 'Jobs', 'Crew', 'Clients', 'Money', 'Plans', 'Quotes'];

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

async function collectProblems(page) {
  const problems = [];

  page.on('console', (msg) => {
    const text = msg.text();
    if (msg.type() !== 'error') return;
    if (/favicon|manifest|ResizeObserver loop|chrome-extension|Failed to load resource.*analytics/i.test(text)) return;
    problems.push(`console error: ${text}`);
  });

  page.on('pageerror', (err) => {
    problems.push(`page error: ${err.message}`);
  });

  page.on('response', (res) => {
    const url = res.url();
    const status = res.status();
    if (status >= 500) problems.push(`server ${status}: ${url}`);
    if (status === 404 && /\.(js|css|png|svg|ico|webmanifest|json)(\?|$)/i.test(url)) {
      problems.push(`asset 404: ${url}`);
    }
  });

  return problems;
}

async function waitUsable(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1400);
  await expect(page.locator('body')).toBeVisible();
  const bodyText = (await page.locator('body').innerText().catch(() => '')).trim();
  expect(bodyText.length, 'page should not be blank').toBeGreaterThan(20);
}

async function assertNoHugeHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body ? document.body.scrollWidth : 0,
  }));
  const maxWidth = Math.max(overflow.scrollWidth, overflow.bodyScrollWidth);
  expect(maxWidth, `horizontal overflow too large: ${JSON.stringify(overflow)}`).toBeLessThanOrEqual(overflow.innerWidth + 28);
}

async function assertNoBadProblems(problems, label) {
  const bad = unique(problems).filter((item) => !/401|403|unauthorized|forbidden/i.test(item));
  expect(bad, label).toEqual([]);
}

test.describe('Public website launch audit', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`public route loads cleanly: ${route}`, async ({ page }) => {
      const problems = await collectProblems(page);
      await page.goto(route);
      await waitUsable(page);
      await expect(page.locator('body')).toContainText(/Churvox|Privacy|Terms|Login|Sign|Plan|Feature|Jobs/i);
      await assertNoHugeHorizontalOverflow(page);
      await assertNoBadProblems(problems, `problems on ${route}`);
    });
  }

  test('homepage is fullscreen and has key CTAs', async ({ page }) => {
    const problems = await collectProblems(page);
    await page.goto('/');
    await waitUsable(page);

    await expect(page.getByText(/Jobs done/i).first()).toBeVisible();
    await expect(page.getByText(/Admin lined up/i).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Start free/i }).first()).toBeVisible();

    const heroWidth = await page.evaluate(() => {
      const hero = document.querySelector('.cvp-hero, .cvx-command-hero, main');
      return hero ? Math.round(hero.getBoundingClientRect().width) : 0;
    });
    expect(heroWidth, 'public hero should use most of desktop width').toBeGreaterThan(900);

    await assertNoHugeHorizontalOverflow(page);
    await assertNoBadProblems(problems, 'homepage problems');
  });
});

test.describe('Auth pages audit', () => {
  test('login page has usable email/password controls', async ({ page }) => {
    const problems = await collectProblems(page);
    await page.goto('/login');
    await waitUsable(page);

    const email = page.locator('input[type="email"], input[name*="email" i], input[placeholder*="email" i]').first();
    const password = page.locator('input[type="password"]').first();
    await expect(email).toBeVisible();
    await expect(password).toBeVisible();

    await email.fill('test@example.com');
    await password.fill('WrongPassword123!');
    await expect(email).toHaveValue(/test@example.com/);
    await assertNoHugeHorizontalOverflow(page);
    await assertNoBadProblems(problems, 'login problems');
  });

  test('signup page has visible signup controls', async ({ page }) => {
    const problems = await collectProblems(page);
    await page.goto('/signup');
    await waitUsable(page);
    const inputs = await page.locator('input').count();
    expect(inputs, 'signup should expose form fields').toBeGreaterThanOrEqual(2);
    await assertNoHugeHorizontalOverflow(page);
    await assertNoBadProblems(problems, 'signup problems');
  });
});

test.describe('Protected route blank-screen audit', () => {
  for (const route of PROTECTED_ROUTES) {
    test(`protected route does not hard crash: ${route}`, async ({ page }) => {
      const problems = await collectProblems(page);
      await page.goto(route);
      await waitUsable(page);
      const text = await page.locator('body').innerText();
      expect(text.trim().length).toBeGreaterThan(20);
      await assertNoHugeHorizontalOverflow(page);
      await assertNoBadProblems(problems, `problems on ${route}`);
    });
  }
});

test.describe('App shell visual audit', () => {
  test('plans page scrolls and has plan/add-on actions when accessible', async ({ page }) => {
    const problems = await collectProblems(page);
    await page.goto('/plans');
    await waitUsable(page);

    const bodyText = await page.locator('body').innerText();
    if (/Plans|Choose how much admin|Growth Pack|SMS credit|Start|Crew|Operator|Command/i.test(bodyText)) {
      await expect(page.locator('body')).toContainText(/Start|Crew|Operator|Command|Growth Pack|SMS/i);
      const before = await page.evaluate(() => window.scrollY);
      await page.mouse.wheel(0, 1200);
      await page.waitForTimeout(500);
      const after = await page.evaluate(() => window.scrollY);
      expect(after, 'plans page should allow vertical scrolling').toBeGreaterThanOrEqual(before);
      const actions = await page.locator('button, a').filter({ hasText: /Buy|Choose|Start free|Current|checkout/i }).count();
      expect(actions, 'plans should expose action buttons').toBeGreaterThan(0);
    }

    await assertNoHugeHorizontalOverflow(page);
    await assertNoBadProblems(problems, 'plans problems');
  });

  test('dashboard bottom nav is compact when visible', async ({ page }) => {
    const problems = await collectProblems(page);
    await page.goto('/dashboard');
    await waitUsable(page);

    const nav = page.locator('.xcf10-dock, .xcf-bottom-nav').first();
    if (await nav.count()) {
      await expect(nav).toBeVisible();
      const navText = await nav.innerText();
      for (const label of APP_NAV_LABELS) expect(navText, `nav includes ${label}`).toContain(label);
      expect(navText).not.toMatch(/Client Workbench|Plan Command|Quote Press/i);
      const box = await nav.boundingBox();
      if (box) {
        expect(box.width, 'nav width should fit laptop screen').toBeLessThanOrEqual(790);
        expect(box.height, 'nav should stay slim').toBeLessThanOrEqual(76);
      }
    }

    await assertNoBadProblems(problems, 'dashboard problems');
  });

  test('jobs page has next move panel when accessible', async ({ page }) => {
    const problems = await collectProblems(page);
    await page.goto('/jobs');
    await waitUsable(page);

    const body = await page.locator('body').innerText();
    if (/Jobs|REAL JOB PAGE|Jobs that can be created/i.test(body)) {
      const panel = page.locator('.xcf-jobs-next-panel').first();
      if (await panel.count()) {
        await expect(panel).toBeVisible();
        await expect(panel).toContainText(/Next move|Job command/i);
        await expect(panel).toContainText(/Open jobs|Need worker|Ready invoice|Missing price/i);
      }
    }

    await assertNoHugeHorizontalOverflow(page);
    await assertNoBadProblems(problems, 'jobs problems');
  });
});

test.describe('Public navigation click audit', () => {
  test('main public CTAs navigate without crashing', async ({ page }) => {
    const problems = await collectProblems(page);
    await page.goto('/');
    await waitUsable(page);

    for (const name of [/Plans/i, /Log in/i, /Start free/i]) {
      await page.goto('/');
      await waitUsable(page);
      const link = page.getByRole('link', { name }).first();
      if (await link.count()) {
        await expect(link).toBeVisible();
        await link.click();
        await waitUsable(page);
      }
    }

    await assertNoBadProblems(problems, 'public nav click problems');
  });
});
