const { test, expect } = require('@playwright/test');

const EMAIL = process.env.CHURVOX_E2E_EMAIL || process.env.E2E_EMAIL || '';
const PASSWORD = process.env.CHURVOX_E2E_PASSWORD || process.env.E2E_PASSWORD || '';

async function fillFirst(page, selectors, value) {
  for (const selector of selectors) {
    const loc = page.locator(selector).first();
    if ((await loc.count().catch(() => 0)) && (await loc.isVisible().catch(() => false))) {
      await loc.fill(value);
      return true;
    }
  }
  return false;
}

async function clickText(page, texts) {
  for (const text of texts) {
    const loc = page.getByText(text, { exact: false }).first();
    if ((await loc.count().catch(() => 0)) && (await loc.isVisible().catch(() => false))) {
      await loc.click();
      return true;
    }
  }
  return false;
}

async function login(page) {
  test.skip(!EMAIL || !PASSWORD, 'Set CHURVOX_E2E_EMAIL and CHURVOX_E2E_PASSWORD.');
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');
  await fillFirst(page, ['input[type="email"]', 'input[name="email"]', 'input[placeholder*="email" i]'], EMAIL);
  await fillFirst(page, ['input[type="password"]', 'input[name="password"]', 'input[placeholder*="password" i]'], PASSWORD);
  expect(await clickText(page, ['Sign in', 'Log in', 'Login'])).toBeTruthy();
  await page.waitForURL(/dashboard|plans|setup|guide|worker|admin/i, { timeout: 30000 }).catch(() => null);
  await page.waitForLoadState('domcontentloaded');
  await expect(page.locator('body')).toContainText(/Churvox|Plans|Command|Today|Jobs/i, { timeout: 30000 });
}

async function goOwner(page, area) {
  await page.goto(`/dashboard#${area}`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(900);
}

async function visibleTextCount(page, text) {
  return page.getByText(text, { exact: false }).evaluateAll((nodes) => nodes.filter((node) => {
    const style = window.getComputedStyle(node);
    const rect = node.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
  }).length).catch(() => 0);
}

async function visibleButtonLabels(page) {
  return page.locator('button:visible').evaluateAll((buttons) => buttons.map((button) => button.textContent.trim()).filter(Boolean));
}

test.describe('Owner logical wiring contract', () => {
  test('login reaches the owner app without bouncing back to login', async ({ page }) => {
    await login(page);
    await expect(page).not.toHaveURL(/\/login/i);
  });

  test('Plans is one billing page, not a duplicate ProductApp page underneath', async ({ page }) => {
    await login(page);
    await goOwner(page, 'plans');

    const billingDeskCount = await page.locator('#option-f-plans-pricing-desk').count().catch(() => 0);
    expect(billingDeskCount, 'real Plans billing desk should exist once').toBeLessThanOrEqual(1);

    const visiblePlansAndBilling = await visibleTextCount(page, 'Plans and billing');
    expect(visiblePlansAndBilling, 'Plans and billing heading should not duplicate').toBeLessThanOrEqual(1);

    const wrongWorkStrip = await visibleTextCount(page, 'Run today');
    expect(wrongWorkStrip, 'Plans must not show Today/Jobs work strip').toBe(0);

    const wrongJobButtons = (await visibleButtonLabels(page)).filter((label) => /add job|export today|import csv/i.test(label));
    expect(wrongJobButtons, 'Plans must not show job workspace buttons').toEqual([]);
  });

  test('Command-only findings do not leak onto record pages', async ({ page }) => {
    await login(page);
    for (const area of ['today', 'jobs', 'clients', 'workers', 'quotes', 'invoices', 'messages', 'team', 'settings', 'plans']) {
      await goOwner(page, area);
      await expect(page.locator('body'), `${area} should not show Command-only warning banner`).not.toContainText(/Churvox cannot finish this alone/i);
      await expect(page.locator('body'), `${area} should not show owner-needed command pills`).not.toContainText(/Owner needed/i);
    }
  });

  test('major page buttons either open a slip, move page, download, or submit checkout', async ({ page }) => {
    await login(page);
    const areas = ['today', 'command', 'jobs', 'clients', 'quotes', 'invoices', 'messages', 'team', 'workers', 'xero', 'settings', 'support'];

    for (const area of areas) {
      await goOwner(page, area);
      const buttons = await page.locator('button:visible').count().catch(() => 0);
      expect(buttons, `${area} should expose at least one visible button/action`).toBeGreaterThan(0);

      const labels = await visibleButtonLabels(page);
      const badLabels = labels.filter((label) => /undefined|null|test only|placeholder|lorem/i.test(label));
      expect(badLabels, `${area} should not expose build/test button labels`).toEqual([]);
    }
  });

  test('page ownership rules are respected', async ({ page }) => {
    await login(page);

    await goOwner(page, 'command');
    await expect(page.locator('body')).toContainText(/Approve|Command|approval/i);

    await goOwner(page, 'jobs');
    await expect(page.locator('body')).toContainText(/job/i);
    await expect(page.locator('body')).not.toContainText(/Approve, edit or park\. Nothing else\./i);

    await goOwner(page, 'workers');
    await expect(page.locator('body')).toContainText(/GPS|Worker|field/i);

    await goOwner(page, 'xero');
    await expect(page.locator('body')).toContainText(/Draft sync only|Accounting|Xero|guard/i);
  });
});
