const { test, expect } = require('@playwright/test');

const AUTH_EMAIL = process.env.CHURVOX_TEST_EMAIL || process.env.TEST_EMAIL || '';
const AUTH_PASSWORD = process.env.CHURVOX_TEST_PASSWORD || process.env.TEST_PASSWORD || '';
const HAS_AUTH = Boolean(AUTH_EMAIL && AUTH_PASSWORD);

const runStamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
const TEST = {
  clientName: `PW E2E Client ${runStamp}`,
  clientEmail: `pw-e2e-${runStamp}@example.com`,
  clientPhone: '021 555 0199',
  address: `1 Playwright Test Street, Wellington ${runStamp}`,
  jobTitle: `PW E2E Job ${runStamp}`,
  quoteDescription: `PW E2E quote service ${runStamp}`,
  invoiceDescription: `PW E2E invoice service ${runStamp}`,
  price: '250',
};

const CORE_APP_PAGES = [
  ['/dashboard', /Command Board|Today|approval|review/i],
  ['/jobs', /Jobs|Open jobs|Keep every job moving/i],
  ['/crew-map', /Crew|working|Active jobs/i],
  ['/clients', /Clients|Client|Customer/i],
  ['/quotes', /Quotes|Open quotes|booked work/i],
  ['/invoices', /Invoices|Open invoices|paid invoices/i],
  ['/team', /Team|Team members|crew/i],
  ['/dispatch', /Assign|Dispatch|Jobs|Worker|Crew/i],
  ['/money-desk', /Money|Invoice|Paid|Overdue/i],
  ['/plans', /Start|Crew|Operator|Command|admin Churvox/i],
  ['/settings', /Settings|business details|Payment setup/i],
  ['/support', /Support|blocking you|Support request/i],
];

const BANNED_COPY = /blocking launch|REAL SUPPORT|Review slip|Open full-screen slip|Full screen slips live|No skinny popups|work slip|Settings Command|Invoices Command|Quotes Command|Team Command|your-payment-link\.com|example\.com\/pay|dummy payment|test-payment|igyg|iygg/i;

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function attachProblemCollectors(page) {
  const problems = [];

  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (/favicon|manifest|ResizeObserver loop|chrome-extension|analytics|google-analytics|Failed to load resource: the server responded with a status of 401|Failed to load resource: the server responded with a status of 403/i.test(text)) return;
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

async function expectNoProblems(problems, label) {
  const bad = unique(problems).filter((item) => !/401|403|unauthorized|forbidden|net::ERR_ABORTED/i.test(item));
  expect(bad, `${label} browser/server problems`).toEqual([]);
}

async function waitUsable(page, label = 'page') {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);

  await expect.poll(async () => {
    const text = await page.locator('body').innerText().catch(() => '');
    return text.trim().length;
  }, { message: `${label} should render readable page text`, timeout: 15000 }).toBeGreaterThan(30);

  const text = (await page.locator('body').innerText().catch(() => '')).trim();
  expect(text, `${label} should not show crash text`).not.toMatch(/Unexpected token|Failed to compile|Cannot read properties|Minified React error|Application error|Failed to compile/i);
  expect(text, `${label} should not show old launch/internal copy`).not.toMatch(BANNED_COPY);
}

async function assertNoHorizontalOverflow(page, label) {
  const size = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body ? document.body.scrollWidth : 0,
  }));
  const maxWidth = Math.max(size.scrollWidth, size.bodyScrollWidth);
  expect(maxWidth, `${label} horizontal overflow: ${JSON.stringify(size)}`).toBeLessThanOrEqual(size.innerWidth + 32);
}

async function assertTheme(page, label) {
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
    const isDarkBlue = (c) => c && c[0] < 50 && c[1] < 95 && c[2] < 135;
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
      .filter((el) => isWhite(rgb(getComputedStyle(el).backgroundColor)))
      .map((el) => el.innerText.trim().replace(/\s+/g, ' '));
    const yellowStrips = [...document.querySelectorAll('main *')]
      .filter((el) => visible(el))
      .filter((el) => {
        const rect = el.getBoundingClientRect();
        const c = rgb(getComputedStyle(el).backgroundColor);
        return isYellowStrip(c) && rect.width > 320 && rect.height < 92;
      })
      .map((el) => (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 120));
    return { darkPanels, whiteActiveSidebar, yellowStrips };
  });
  expect(result.darkPanels, `${label} should use Command Desk dark panels`).toBeGreaterThanOrEqual(1);
  expect(result.whiteActiveSidebar, `${label} should not have white active sidebar pills`).toEqual([]);
  expect(result.yellowStrips, `${label} should not show old yellow strip`).toEqual([]);
}

async function signIn(page) {
  await page.goto('/login');
  await waitUsable(page, 'login');
  await page.locator('input[type="email"], input[name*="email" i], input[placeholder*="email" i]').first().fill(AUTH_EMAIL);
  await page.locator('input[type="password"]').first().fill(AUTH_PASSWORD);
  const submit = page.getByRole('button', { name: /log in|login|sign in|continue/i }).first();
  if (await submit.count()) await submit.click();
  else await page.locator('input[type="password"]').first().press('Enter');
  await page.waitForURL((url) => !/\/login/i.test(url.pathname), { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1200);
  expect(page.url(), 'valid test account should leave login').not.toMatch(/\/login/i);
}

async function fillFirstVisible(page, locators, value, label) {
  for (const locator of locators) {
    const count = await locator.count().catch(() => 0);
    for (let i = 0; i < count; i += 1) {
      const item = locator.nth(i);
      if (await item.isVisible().catch(() => false)) {
        await item.fill(value);
        return;
      }
    }
  }
  throw new Error(`Could not find visible field for ${label}`);
}

async function clickFirstVisible(page, locators, label) {
  for (const locator of locators) {
    const count = await locator.count().catch(() => 0);
    for (let i = 0; i < count; i += 1) {
      const item = locator.nth(i);
      if (await item.isVisible().catch(() => false)) {
        await item.click();
        return;
      }
    }
  }
  throw new Error(`Could not find visible button/link for ${label}`);
}

async function selectOptionIfPossible(page, labelText, optionLabel) {
  const selects = page.locator('label').filter({ hasText: labelText }).locator('select');
  const count = await selects.count().catch(() => 0);
  for (let i = 0; i < count; i += 1) {
    const select = selects.nth(i);
    if (!(await select.isVisible().catch(() => false))) continue;
    const options = await select.locator('option').allTextContents().catch(() => []);
    const match = options.find((option) => option.trim().toLowerCase().includes(optionLabel.toLowerCase()));
    if (match) {
      await select.selectOption({ label: match });
      return true;
    }
  }
  return false;
}

async function createClient(page) {
  await page.goto('/clients/new');
  await waitUsable(page, 'new client');
  await fillFirstVisible(page, [page.getByTestId('client-name-input'), page.getByLabel(/Client name/i), page.locator('input').first()], TEST.clientName, 'client name');
  await fillFirstVisible(page, [page.getByTestId('client-email-input'), page.getByLabel(/^Email$/i), page.locator('input[type="email"]').first()], TEST.clientEmail, 'client email');
  await fillFirstVisible(page, [page.getByTestId('client-phone-input'), page.getByLabel(/Phone/i)], TEST.clientPhone, 'client phone');
  await fillFirstVisible(page, [page.getByTestId('client-address-input'), page.getByLabel(/Site address|Address/i)], TEST.address, 'client address');
  const notes = page.getByTestId('client-notes-input');
  if (await notes.count()) await notes.fill(`Created by Playwright full workflow audit ${runStamp}`);
  await clickFirstVisible(page, [page.getByTestId('save-client-button'), page.getByRole('button', { name: /Create client|Save client|Update client/i })], 'save client');
  await page.waitForTimeout(1500);
  await expect(page.locator('body')).toContainText(TEST.clientName, { timeout: 12000 });
}

async function createJob(page) {
  await page.goto('/jobs/new');
  await waitUsable(page, 'new job');
  await fillFirstVisible(page, [page.getByLabel(/Job title/i), page.locator('input').first()], TEST.jobTitle, 'job title');
  await fillFirstVisible(page, [page.getByLabel(/Notes|description/i), page.locator('textarea').first()], `Audit job notes ${runStamp}`, 'job notes');
  await selectOptionIfPossible(page, /Client/i, TEST.clientName);
  await fillFirstVisible(page, [page.getByLabel(/Customer email/i), page.locator('input[type="email"]').first()], TEST.clientEmail, 'job customer email').catch(() => {});
  await fillFirstVisible(page, [page.getByLabel(/Customer phone/i)], TEST.clientPhone, 'job customer phone').catch(() => {});
  await fillFirstVisible(page, [page.getByLabel(/^Address$/i), page.getByLabel(/Site address/i)], TEST.address, 'job address');
  await selectOptionIfPossible(page, /Region|State/i, 'Wellington');
  await fillFirstVisible(page, [page.getByLabel(/Fixed price|Price/i), page.locator('input[type="number"]').first()], TEST.price, 'job fixed price').catch(() => {});
  await clickFirstVisible(page, [page.getByRole('button', { name: /Create Job|Create job|Create first job/i })], 'create job');
  await page.waitForTimeout(1800);
  await expect(page.locator('body')).toContainText(/Job created|Job|Open jobs|Edit Job|Every job/i, { timeout: 15000 });
}

async function createQuote(page) {
  await page.goto('/quotes/new');
  await waitUsable(page, 'new quote');
  await selectOptionIfPossible(page, /Client/i, TEST.clientName);
  await fillFirstVisible(page, [page.getByLabel(/Customer Name/i), page.locator('input').nth(1)], TEST.clientName, 'quote customer name');
  await fillFirstVisible(page, [page.getByLabel(/Customer Email/i), page.locator('input[type="email"]').first()], TEST.clientEmail, 'quote customer email').catch(() => {});
  await fillFirstVisible(page, [page.getByLabel(/^Address/i)], TEST.address, 'quote address');
  await fillFirstVisible(page, [page.getByLabel(/Job Description/i), page.locator('textarea').first()], TEST.quoteDescription, 'quote description');
  await fillFirstVisible(page, [page.getByLabel(/Rate/i), page.locator('input[type="number"]').last()], TEST.price, 'quote rate or price');
  await fillFirstVisible(page, [page.getByLabel(/Total quote price|Price/i)], TEST.price, 'quote total').catch(() => {});
  await clickFirstVisible(page, [page.getByRole('button', { name: /Create quote/i })], 'create quote');
  await page.waitForTimeout(1800);
  await expect(page.locator('body')).toContainText(/Quote created|Quote|Review quote|Edit Quote|Untitled quote/i, { timeout: 15000 });
}

async function createInvoice(page) {
  await page.goto('/invoices/new');
  await waitUsable(page, 'new invoice');

  await page.waitForSelector('[data-testid="stable-invoice-form"]', { state: 'visible', timeout: 25000 });
  await page.waitForTimeout(1200);

  await selectOptionIfPossible(page, /Saved client|Client/i, TEST.clientName);
  await selectOptionIfPossible(page, /Linked job/i, TEST.jobTitle);

  await fillFirstVisible(page, [
    page.getByTestId('invoice-customer-name-input'),
    page.getByLabel(/Customer name/i),
    page.locator('[data-testid="stable-invoice-form"] input').first()
  ], TEST.clientName, 'invoice customer name');

  await fillFirstVisible(page, [
    page.getByTestId('invoice-customer-email-input'),
    page.getByLabel(/Customer email/i)
  ], TEST.clientEmail, 'invoice customer email').catch(() => {});

  await fillFirstVisible(page, [
    page.getByTestId('invoice-site-address-input'),
    page.getByLabel(/Site|job address|Billing address/i)
  ], TEST.address, 'invoice address').catch(() => {});

  await fillFirstVisible(page, [
    page.getByTestId('invoice-line-description-0'),
    page.getByLabel(/^Description$/i)
  ], TEST.invoiceDescription, 'invoice line description').catch(() => {});

  await fillFirstVisible(page, [
    page.getByTestId('invoice-line-unit-price-0'),
    page.getByLabel(/Unit price/i)
  ], TEST.price, 'invoice unit price');

  await fillFirstVisible(page, [
    page.getByTestId('invoice-line-total-0'),
    page.getByLabel(/Line total/i)
  ], TEST.price, 'invoice line total').catch(() => {});

  const publicNotes = page.getByTestId('invoice-public-notes-input');
  if (await publicNotes.count()) {
    await publicNotes.fill(`Invoice prepared by Playwright workflow audit ${runStamp}`);
  }

  await clickFirstVisible(page, [page.getByRole('button', { name: /Create invoice/i })], 'create invoice');
  await page.waitForTimeout(2500);
  await expect(page.locator('body')).toContainText(/Invoice created|Invoice|Amount due|Review invoice|Edit invoice/i, { timeout: 20000 });
}

async function saveSettings(page) {
  await page.goto('/settings');
  await waitUsable(page, 'settings');
  const tone = page.getByLabel(/Customer message tone/i);
  if (await tone.count()) await tone.fill(`Friendly, clear and professional. Audit checked ${runStamp}.`);
  const trade = page.getByLabel(/Trade|industry/i);
  if (await trade.count()) await trade.fill('General trade service');
  await clickFirstVisible(page, [page.getByRole('button', { name: /Save settings/i })], 'save settings');
  await page.waitForTimeout(1800);
  await expect(page.locator('body')).toContainText(/saved|Settings|business details/i, { timeout: 10000 });
}

async function supportFormSmoke(page) {
  await page.goto('/support');
  await waitUsable(page, 'support');
  await fillFirstVisible(page, [page.getByLabel(/Subject/i)], `PW E2E support check ${runStamp}`, 'support subject');
  await fillFirstVisible(page, [page.getByLabel(/Message/i)], `Playwright full business-flow audit checked the support form fields at ${runStamp}.`, 'support message');
  await clickFirstVisible(page, [page.getByRole('button', { name: /Add current page/i })], 'add current page');
  await expect(page.getByLabel(/Page|screen/i)).toHaveValue(/support/i);
}

test.describe('Churvox full real business-flow launch audit', () => {
  test.skip(!HAS_AUTH, 'Set CHURVOX_TEST_EMAIL and CHURVOX_TEST_PASSWORD to run the full real business-flow audit.');

  test('owner can run the core Churvox workflow end to end', async ({ page }) => {
    test.setTimeout(180000);
    const problems = attachProblemCollectors(page);
    await signIn(page);

    await test.step('All core app pages load, use launch wording and match theme', async () => {
      for (const [path, expected] of CORE_APP_PAGES) {
        await page.goto(path);
        await waitUsable(page, path);
        await expect(page.locator('body')).toContainText(expected);
        await assertNoHorizontalOverflow(page, path);
        await assertTheme(page, path);
      }
    });

    await test.step('Settings can save business context safely', async () => {
      await saveSettings(page);
    });

    await test.step('Client can be created and reopened', async () => {
      await createClient(page);
      await page.goto('/clients');
      await waitUsable(page, 'clients after create');
      await expect(page.locator('body')).toContainText(TEST.clientName, { timeout: 15000 });
    });

    await test.step('Job can be created with client, address and pricing', async () => {
      await createJob(page);
      await page.goto('/jobs');
      await waitUsable(page, 'jobs after create');
      await expect(page.locator('body')).toContainText(TEST.jobTitle, { timeout: 15000 });
    });

    await test.step('Quote can be created and appears in quote list', async () => {
      await createQuote(page);
      await page.goto('/quotes');
      await waitUsable(page, 'quotes after create');
      await expect(page.locator('body')).toContainText(TEST.clientName, { timeout: 15000 });
    });

    await test.step('Invoice can be created and appears in invoice list', async () => {
      await createInvoice(page);
      await page.goto('/invoices');
      await waitUsable(page, 'invoices after create');
      await expect(page.locator('body')).toContainText(TEST.clientName, { timeout: 15000 });
    });

    await test.step('Review buttons open real detail views', async () => {
      for (const [path, buttonName] of [['/jobs', /Review job/i], ['/quotes', /Review quote/i], ['/invoices', /Review invoice/i], ['/team', /Review member/i]]) {
        await page.goto(path);
        await waitUsable(page, `${path} review`);
        const button = page.getByRole('button', { name: buttonName }).first();
        await expect(button, `${path} has review button`).toBeVisible({ timeout: 10000 });
        await button.click();
        await page.waitForTimeout(800);
        await expect(page.locator('body')).toContainText(/Review|details|Status|Customer|Client|Worker|Amount|Owner/i);
        await expect(page.locator('body')).not.toContainText(/Review slip|work slip|skinny popup/i);
        const close = page.getByRole('button', { name: /Close|Back to/i }).first();
        if (await close.count()) await close.click();
      }
    });

    await test.step('Plans are safe for launch and SMS is not active', async () => {
      await page.goto('/plans');
      await waitUsable(page, 'plans SMS safety');
      await expect(page.locator('body')).toContainText(/SMS credit blocks/i);
      await expect(page.locator('body')).toContainText(/Coming soon/i);
      await expect(page.locator('body')).not.toContainText(/Buy credits/i);
      const smsButtons = page.getByRole('button', { name: /Coming soon/i });
      expect(await smsButtons.count()).toBeGreaterThanOrEqual(1);
      for (let i = 0; i < await smsButtons.count(); i += 1) await expect(smsButtons.nth(i)).toBeDisabled();
    });

    await test.step('Support form works without internal launch wording', async () => {
      await supportFormSmoke(page);
    });

    await test.step('Mobile viewport does not break the main owner pages', async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      for (const [path] of CORE_APP_PAGES.filter(([p]) => ['/dashboard', '/jobs', '/clients', '/quotes', '/invoices', '/settings', '/support'].includes(p))) {
        await page.goto(path);
        await waitUsable(page, `${path} mobile`);
        await assertNoHorizontalOverflow(page, `${path} mobile`);
      }
    });

    await expectNoProblems(problems, 'full real business-flow audit');
  });
});
