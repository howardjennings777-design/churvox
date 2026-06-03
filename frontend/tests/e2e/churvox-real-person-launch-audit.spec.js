const { test, expect } = require('@playwright/test');

const AUTH_EMAIL = process.env.CHURVOX_TEST_EMAIL || process.env.TEST_EMAIL || '';
const AUTH_PASSWORD = process.env.CHURVOX_TEST_PASSWORD || process.env.TEST_PASSWORD || '';
const HAS_AUTH = Boolean(AUTH_EMAIL && AUTH_PASSWORD);

const PUBLIC_PAGES = [
  { path: '/', name: 'Marketing home', must: [/Churvox/i] },
  { path: '/pricing', name: 'Pricing', must: [/Start|Crew|Operator|Command|Pricing|Plan/i] },
  { path: '/features', name: 'Features', must: [/Feature|Jobs|Invoices|Quotes|Churvox/i] },
  { path: '/login', name: 'Login', must: [/Log in|Login|Email/i] },
  { path: '/signup', name: 'Signup', must: [/Sign up|Create|Email/i] },
  { path: '/privacy-policy', name: 'Privacy', must: [/Privacy|data|information/i] },
  { path: '/terms-of-service', name: 'Terms', must: [/Terms|service|Churvox/i] },
];

const APP_PAGES = [
  { path: '/dashboard', name: 'Command Board', must: [/Command Board|Today|approval|review/i] },
  { path: '/jobs', name: 'Jobs', must: [/Keep every job moving|Open jobs|Jobs/i], review: /Review job/i },
  { path: '/crew-map', name: 'Crew Map', must: [/See who is working right now|Active jobs only|Crew working now/i] },
  { path: '/clients', name: 'Clients', must: [/Clients|Customer|Client/i] },
  { path: '/quotes', name: 'Quotes', must: [/Turn quotes into booked work|Open quotes|Quotes/i], review: /Review quote/i },
  { path: '/invoices', name: 'Invoices', must: [/Turn completed work into paid invoices|Open invoices|Invoices/i], review: /Review invoice/i },
  { path: '/team', name: 'Team', must: [/Keep your crew organised|Team members|Team/i], review: /Review member/i },
  { path: '/dispatch', name: 'Assign Jobs', must: [/Assign|Jobs|Worker|Crew/i] },
  { path: '/money-desk', name: 'Money Desk', must: [/Money|Invoice|Paid|Overdue/i] },
  { path: '/plans', name: 'Plans', must: [/Choose how much admin Churvox handles|Start|Crew|Operator|Command/i] },
  { path: '/settings', name: 'Settings', must: [/Set your business details once|Settings|Payment setup/i] },
  { path: '/support', name: 'Support', must: [/Tell us what’s blocking you|Tell us what's blocking you|Support request/i] },
];

const BANNED_COPY = [
  /blocking launch/i,
  /REAL SUPPORT/i,
  /Review slip/i,
  /Open full-screen slip/i,
  /Full screen slips live/i,
  /No skinny popups/i,
  /work slip/i,
  /Settings Command/i,
  /Invoices Command/i,
  /Quotes Command/i,
  /Team Command/i,
  /your-payment-link\.com/i,
  /example\.com\/pay/i,
  /dummy payment/i,
  /test-payment/i,
  /igyg|iygg/i,
];

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function attachProblemCollectors(page) {
  const problems = [];

  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (/favicon|manifest|ResizeObserver loop|chrome-extension|analytics|google-analytics/i.test(text)) return;
    problems.push(`console error: ${text}`);
  });

  page.on('pageerror', (err) => problems.push(`page error: ${err.message}`));

  page.on('response', (res) => {
    const status = res.status();
    const url = res.url();
    if (status >= 500) problems.push(`server ${status}: ${url}`);
    if (status === 404 && /\.(js|css|png|svg|ico|webmanifest|json)(\?|$)/i.test(url)) problems.push(`asset 404: ${url}`);
  });

  return problems;
}

async function waitUsable(page, label = 'page') {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1200);
  await expect(page.locator('body'), `${label} body visible`).toBeVisible();
  const text = (await page.locator('body').innerText().catch(() => '')).trim();
  expect(text.length, `${label} should not be blank`).toBeGreaterThan(30);
  expect(text, `${label} should not show React crash text`).not.toMatch(/Unexpected token|Failed to compile|Cannot read properties|Minified React error|Application error/i);
}

async function assertNoBadBrowserProblems(problems, label) {
  const bad = unique(problems).filter((item) => !/401|403|unauthorized|forbidden|net::ERR_ABORTED/i.test(item));
  expect(bad, `${label} browser/server problems`).toEqual([]);
}

async function assertNoHorizontalOverflow(page, label) {
  const size = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body ? document.body.scrollWidth : 0,
  }));
  const maxWidth = Math.max(size.scrollWidth, size.bodyScrollWidth);
  expect(maxWidth, `${label} horizontal overflow: ${JSON.stringify(size)}`).toBeLessThanOrEqual(size.innerWidth + 28);
}

async function assertExpectedCopy(page, pageSpec) {
  const text = await page.locator('body').innerText();
  for (const pattern of pageSpec.must || []) {
    expect(text, `${pageSpec.name} should include expected launch wording ${pattern}`).toMatch(pattern);
  }
  for (const pattern of BANNED_COPY) {
    expect(text, `${pageSpec.name} should not contain old/internal wording ${pattern}`).not.toMatch(pattern);
  }
}

async function assertCommandTheme(page, label) {
  const result = await page.evaluate(() => {
    const visible = (el) => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 12 && rect.height > 12 && style.visibility !== 'hidden' && style.display !== 'none' && Number(style.opacity || 1) > 0.05;
    };

    const rgb = (value) => {
      const m = String(value || '').match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
      return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
    };

    const isWhite = (c) => c && c[0] > 245 && c[1] > 245 && c[2] > 245;
    const isDarkBlue = (c) => c && c[0] < 35 && c[1] < 70 && c[2] < 105;
    const isCyan = (c) => c && c[1] > 160 && c[2] > 175 && c[0] < 150;
    const isYellowStrip = (c) => c && c[0] > 215 && c[1] > 185 && c[2] < 150;

    const darkPanels = [...document.querySelectorAll('main section, main article, main form, main div, aside')]
      .filter((el) => visible(el))
      .filter((el) => {
        const rect = el.getBoundingClientRect();
        const c = rgb(getComputedStyle(el).backgroundColor);
        return isDarkBlue(c) && rect.width * rect.height > 3000;
      }).length;

    const whiteActiveSidebar = [...document.querySelectorAll('aside a')]
      .filter((el) => visible(el))
      .filter((el) => {
        const text = el.innerText || '';
        const c = rgb(getComputedStyle(el).backgroundColor);
        return isWhite(c) && /Command|Jobs|Crew|Clients|Quotes|Invoices|Team|Plans|Settings|Support|Assign/i.test(text);
      })
      .map((el) => el.innerText.trim().replace(/\s+/g, ' '));

    const yellowStrips = [...document.querySelectorAll('main *')]
      .filter((el) => visible(el))
      .filter((el) => {
        const rect = el.getBoundingClientRect();
        const c = rgb(getComputedStyle(el).backgroundColor);
        return isYellowStrip(c) && rect.width > 320 && rect.height < 92;
      })
      .map((el) => (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 120));

    const cyanActiveSidebar = [...document.querySelectorAll('aside a')]
      .filter((el) => visible(el))
      .filter((el) => isCyan(rgb(getComputedStyle(el).backgroundColor)))
      .map((el) => el.innerText.trim().replace(/\s+/g, ' '));

    return { darkPanels, whiteActiveSidebar, yellowStrips, cyanActiveSidebar };
  });

  expect(result.darkPanels, `${label} should have dark Command Desk panels`).toBeGreaterThanOrEqual(2);
  expect(result.whiteActiveSidebar, `${label} should not use white active sidebar pills`).toEqual([]);
  expect(result.yellowStrips, `${label} should not show the old yellow warning strip`).toEqual([]);
}

async function signIn(page) {
  await page.goto('/login');
  await waitUsable(page, 'login');

  const email = page.locator('input[type="email"], input[name*="email" i], input[placeholder*="email" i]').first();
  const password = page.locator('input[type="password"]').first();
  await expect(email, 'login email field').toBeVisible();
  await expect(password, 'login password field').toBeVisible();

  await email.fill(AUTH_EMAIL);
  await password.fill(AUTH_PASSWORD);

  const submit = page.getByRole('button', { name: /log in|login|sign in|continue/i }).first();
  if (await submit.count()) await submit.click();
  else await password.press('Enter');

  await page.waitForTimeout(2500);
  const body = await page.locator('body').innerText().catch(() => '');
  expect(page.url(), 'should leave login after valid test credentials').not.toMatch(/\/login/i);
  expect(body, 'login should not show invalid credentials').not.toMatch(/invalid|incorrect|failed/i);
}

async function openPage(page, pageSpec) {
  const problems = attachProblemCollectors(page);
  await page.goto(pageSpec.path);
  await waitUsable(page, pageSpec.name);
  await assertExpectedCopy(page, pageSpec);
  await assertNoHorizontalOverflow(page, pageSpec.name);
  await assertCommandTheme(page, pageSpec.name);
  await assertNoBadBrowserProblems(problems, pageSpec.name);
}

test.describe('Real person public launch audit', () => {
  for (const pageSpec of PUBLIC_PAGES) {
    test(`${pageSpec.name} loads, reads right and does not break`, async ({ page }) => {
      const problems = attachProblemCollectors(page);
      await page.goto(pageSpec.path);
      await waitUsable(page, pageSpec.name);
      await assertExpectedCopy(page, pageSpec);
      await assertNoHorizontalOverflow(page, pageSpec.name);
      await assertNoBadBrowserProblems(problems, pageSpec.name);
    });
  }

  test('public CTAs navigate like a real visitor', async ({ page }) => {
    const problems = attachProblemCollectors(page);
    await page.goto('/');
    await waitUsable(page, 'home');

    for (const label of [/pricing|plans/i, /features/i, /log in|login/i, /start free|start trial|sign up/i]) {
      await page.goto('/');
      await waitUsable(page, `home before ${label}`);
      const link = page.getByRole('link', { name: label }).first();
      if (await link.count()) {
        await expect(link).toBeVisible();
        await link.click();
        await waitUsable(page, `target after ${label}`);
      }
    }

    await assertNoBadBrowserProblems(problems, 'public CTA audit');
  });
});

test.describe('Real person logged-in app launch audit', () => {
  test.skip(!HAS_AUTH, 'Set CHURVOX_TEST_EMAIL and CHURVOX_TEST_PASSWORD to run the full logged-in launch audit.');

  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  for (const pageSpec of APP_PAGES) {
    test(`${pageSpec.name} page is usable, themed and has launch wording`, async ({ page }) => {
      await openPage(page, pageSpec);
    });
  }

  test('sidebar navigation works like a real owner clicking every page', async ({ page }) => {
    const problems = attachProblemCollectors(page);
    await page.goto('/dashboard');
    await waitUsable(page, 'dashboard');

    const navTargets = ['Command Board', 'Jobs', 'Crew Map', 'Clients', 'Quotes', 'Invoices', 'Team', 'Plans', 'Settings', 'Support'];
    for (const label of navTargets) {
      const link = page.locator('aside a').filter({ hasText: label }).first();
      if (!(await link.count())) continue;
      await expect(link, `${label} nav link visible`).toBeVisible();
      await link.click();
      await waitUsable(page, `${label} from sidebar`);
      await assertNoHorizontalOverflow(page, `${label} from sidebar`);
      await assertCommandTheme(page, `${label} from sidebar`);
    }

    await assertNoBadBrowserProblems(problems, 'sidebar navigation');
  });

  test('review buttons open full usable details and close cleanly', async ({ page }) => {
    const problems = attachProblemCollectors(page);
    const pagesWithReviews = APP_PAGES.filter((p) => p.review);

    for (const pageSpec of pagesWithReviews) {
      await page.goto(pageSpec.path);
      await waitUsable(page, pageSpec.name);
      const button = page.getByRole('button', { name: pageSpec.review }).first();
      if (!(await button.count())) continue;

      await expect(button, `${pageSpec.name} review button`).toBeVisible();
      await button.click();
      await page.waitForTimeout(800);

      const body = await page.locator('body').innerText();
      expect(body, `${pageSpec.name} review should open useful detail`).toMatch(/Review|details|Status|Customer|Client|Worker|Amount|Owner/i);
      expect(body, `${pageSpec.name} review should not use old slip wording`).not.toMatch(/Review slip|work slip|skinny popup/i);

      const close = page.getByRole('button', { name: /close|back to/i }).first();
      if (await close.count()) {
        await close.click();
        await page.waitForTimeout(400);
      }
    }

    await assertNoBadBrowserProblems(problems, 'review detail audit');
  });

  test('Plans page does not sell SMS before SMS is ready', async ({ page }) => {
    const problems = attachProblemCollectors(page);
    await page.goto('/plans');
    await waitUsable(page, 'Plans');

    const text = await page.locator('body').innerText();
    expect(text).toMatch(/SMS credit blocks/i);
    expect(text).toMatch(/Coming soon/i);
    expect(text).not.toMatch(/Buy credits/i);

    const smsButtons = page.getByRole('button', { name: /Coming soon/i });
    expect(await smsButtons.count(), 'SMS coming soon buttons').toBeGreaterThanOrEqual(1);
    for (let i = 0; i < await smsButtons.count(); i += 1) {
      await expect(smsButtons.nth(i), 'SMS button should be disabled').toBeDisabled();
    }

    await assertNoBadBrowserProblems(problems, 'plans SMS safety');
  });

  test('Settings page has no fake payment or bank launch data', async ({ page }) => {
    const problems = attachProblemCollectors(page);
    await page.goto('/settings');
    await waitUsable(page, 'Settings');

    const body = await page.locator('body').innerText();
    expect(body).toMatch(/Set your business details once|Payment setup|Invoice & quote identity/i);
    expect(body).not.toMatch(/your-payment-link\.com|example\.com\/pay|igyg|iygg|dummy|test-payment/i);

    await assertNoBadBrowserProblems(problems, 'settings fake payment data');
  });

  test('Support form can be filled without internal launch wording', async ({ page }) => {
    const problems = attachProblemCollectors(page);
    await page.goto('/support');
    await waitUsable(page, 'Support');

    await expect(page.locator('body')).toContainText(/Tell us what’s blocking you|Tell us what's blocking you/i);
    await expect(page.locator('body')).not.toContainText(/blocking launch|REAL SUPPORT|Launch blocker/i);

    await page.getByLabel(/Subject/i).fill('Playwright launch audit test message');
    await page.getByLabel(/Message/i).fill('Testing the support form fields only. Do not treat this as a real support issue.');
    await page.getByRole('button', { name: /Add current page/i }).click();
    await expect(page.getByLabel(/Page|screen/i)).toHaveValue(/support/i);

    await assertNoBadBrowserProblems(problems, 'support form');
  });
});
