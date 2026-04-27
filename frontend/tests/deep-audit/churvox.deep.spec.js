const { test, expect } = require('@playwright/test');

const EMAIL = process.env.CHURVOX_AUDIT_EMAIL || '';
const PASSWORD = process.env.CHURVOX_AUDIT_PASSWORD || '';
const stamp = `Deep Audit ${Date.now()}`;
const clientName = `${stamp} Client`;
const jobTitle = `${stamp} Job`;
const quoteName = `${stamp} Quote Customer`;
const invoiceName = `${stamp} Invoice Customer`;

const corePages = [
  ['/dashboard', 'Dashboard / Smart Hub'],
  ['/jobs', 'Jobs'],
  ['/schedule', 'Schedule'],
  ['/clients', 'Clients'],
  ['/team', 'Team'],
  ['/quotes', 'Quotes'],
  ['/invoices', 'Invoices'],
  ['/follow-ups', 'Follow-ups'],
  ['/automation', 'Automation'],
  ['/automation/runs', 'Automation runs'],
  ['/payroll', 'Payroll'],
  ['/reports', 'Reports'],
  ['/settings', 'Settings'],
  ['/integrations', 'Integrations'],
  ['/notifications', 'Notifications'],
];

function auditBag() {
  return { consoleErrors: [], pageErrors: [], apiFailures: [] };
}

function attachWatchers(page, audit) {
  page.on('console', (msg) => {
    const text = msg.text();
    const allowed = [
      'ResizeObserver loop',
      'Non-Error promise rejection captured',
      'Failed to load resource: the server responded with a status of 404',
    ];
    if (msg.type() === 'error' && !allowed.some((part) => text.includes(part))) {
      audit.consoleErrors.push(`${msg.type()}: ${text}`);
    }
  });

  page.on('pageerror', (err) => audit.pageErrors.push(err.message));

  page.on('response', (response) => {
    const url = response.url();
    const status = response.status();
    if (url.includes('/api/') && status >= 500) {
      audit.apiFailures.push(`${status} ${url}`);
    }
  });
}

async function login(page) {
  await page.goto('/login');
  await expect(page.locator('body')).toBeVisible();

  if (!EMAIL || !PASSWORD) {
    test.skip(true, 'Missing CHURVOX_AUDIT_EMAIL or CHURVOX_AUDIT_PASSWORD');
  }

  await page.locator('input[type="email"], input[name="email"], [data-testid="email-input"]').first().fill(EMAIL);
  await page.locator('input[type="password"], input[name="password"], [data-testid="password-input"]').first().fill(PASSWORD);
  await page.locator('button[type="submit"], [data-testid="login-button"]').first().click();

  await page.waitForURL(/\/(dashboard|overview|admin|worker\/jobs|jobs|plans|payroll|settings)(\/|$|\?)/, { timeout: 25_000 });
}

async function textOfPage(page) {
  return (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
}

async function assertAlive(page, label) {
  await expect(page.locator('body')).toBeVisible();
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(900);
  const text = await textOfPage(page);
  expect(text.length, `${label} should not be blank`).toBeGreaterThan(30);
  await expect(page.locator('text=/Loading\.\.\.|Please wait/i')).toHaveCount(0, { timeout: 12_000 }).catch(() => {});
}

async function open(page, path, label) {
  await page.goto(path);
  await assertAlive(page, label);
}

async function fill(page, selector, value, label = selector) {
  const input = page.locator(selector).first();
  await expect(input, `${label} should be visible`).toBeVisible();
  await input.fill(value);
}

async function clickVisible(page, selectors, label) {
  for (const selector of selectors) {
    const item = page.locator(selector).first();
    if (await item.isVisible().catch(() => false)) {
      await item.click();
      return true;
    }
  }
  throw new Error(`Could not find ${label}`);
}

async function maybeClickVisible(page, selectors) {
  for (const selector of selectors) {
    const item = page.locator(selector).first();
    if (await item.isVisible().catch(() => false)) {
      await item.click();
      return true;
    }
  }
  return false;
}

async function selectFirstRealOption(page, selector) {
  const select = page.locator(selector).first();
  if (!(await select.isVisible().catch(() => false))) return false;
  const values = await select.locator('option').evaluateAll((options) => options.map((option) => option.value).filter(Boolean));
  if (values.length === 0) return false;
  await select.selectOption(values[0]);
  return true;
}

async function submitAndExpectList(page, submitSelector, listUrl, visibleText, label) {
  await page.locator(submitSelector).first().click();
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(1600);

  const bodyText = await textOfPage(page);
  const stillOnForm = /required|failed|error|invalid/i.test(bodyText) && !page.url().includes(listUrl);
  expect(stillOnForm, `${label} save should not show a validation or save failure`).toBeFalsy();

  if (!page.url().includes(listUrl)) {
    await page.goto(listUrl);
  }
  await assertAlive(page, `${label} list after save`);
  await expect(page.locator('body')).toContainText(visibleText, { timeout: 12_000 });
}

async function assertNoAuditFailures(audit) {
  expect(audit.pageErrors, `Page errors:\n${audit.pageErrors.join('\n')}`).toEqual([]);
  expect(audit.apiFailures, `API 500s:\n${audit.apiFailures.join('\n')}`).toEqual([]);
  expect(audit.consoleErrors.slice(0, 15), `Console errors:\n${audit.consoleErrors.join('\n')}`).toEqual([]);
}

test.describe('Churvox true launch certification audit', () => {
  test('all launch-critical pages load on desktop and mobile', async ({ page }) => {
    const audit = auditBag();
    attachWatchers(page, audit);
    await login(page);

    for (const [path, label] of corePages) {
      await open(page, path, label);
    }

    await expect(page.locator('a[href="/dispatch"], a[href="/calendar"]')).toHaveCount(0);
    await assertNoAuditFailures(audit);
  });

  test('real create/save workflow: client, job, quote, invoice', async ({ page }) => {
    const audit = auditBag();
    attachWatchers(page, audit);
    await login(page);

    // Client create and save
    await open(page, '/clients/new', 'New client form');
    await fill(page, '[data-testid="client-name-input"], input[name="name"]', clientName, 'client name');
    await fill(page, '[data-testid="client-email-input"], input[name="email"]', 'deep-audit@example.com', 'client email');
    await fill(page, '[data-testid="client-phone-input"], input[name="phone"]', '0210000000', 'client phone');
    await fill(page, '[data-testid="client-address-input"], input[name="address"]', '1 Deep Audit Street, Wellington', 'client address');
    await page.locator('[data-testid="client-notes-input"], textarea[name="notes"]').first().fill('Created by automated Churvox true launch certification audit.');
    await submitAndExpectList(page, '[data-testid="save-client-button"], button[type="submit"]', '/clients', clientName, 'Client');

    // Job create and save
    await open(page, '/jobs/new', 'New job form');
    await fill(page, '#title, input[name="title"]', jobTitle, 'job title');
    await selectFirstRealOption(page, '#client_id');
    await fill(page, '#address, input[name="address"]', '1 Deep Audit Street, Wellington', 'job address');
    await page.locator('#scheduled_date, input[type="datetime-local"]').first().fill('2026-12-18T09:00');
    await page.locator('#job-region').selectOption('Wellington').catch(() => {});
    await fill(page, '#price, input[name="price"]', '120', 'job price');
    await page.locator('#notes, textarea[name="notes"]').first().fill('Created by automated Churvox true launch certification audit.');
    await submitAndExpectList(page, 'button[type="submit"]', '/jobs', jobTitle, 'Job');

    // Quote create and save
    await open(page, '/quotes/new', 'New quote form');
    await maybeClickVisible(page, ['[data-testid="quote-client-select"]']);
    await fill(page, '[data-testid="quote-customer-name"]', quoteName, 'quote customer name');
    await fill(page, '[data-testid="quote-customer-email"]', 'deep-audit@example.com', 'quote customer email');
    await fill(page, '[data-testid="quote-address"]', '1 Deep Audit Street, Wellington', 'quote address');
    await page.locator('[data-testid="quote-description"]').fill('Deep audit quote workflow test.');
    await fill(page, '[data-testid="quote-price"]', '140', 'quote price');
    await page.locator('[data-testid="quote-notes"]').fill('Created by automated Churvox true launch certification audit.');
    await submitAndExpectList(page, '[data-testid="submit-quote-button"], button[type="submit"]', '/quotes', quoteName, 'Quote');

    // Invoice create and save
    await open(page, '/invoices/new', 'New invoice form');
    await selectFirstRealOption(page, '[data-testid="invoice-client-select"], #client_id');
    await fill(page, '[data-testid="invoice-customer-name-input"], input[name="customer_name"]', invoiceName, 'invoice customer name');
    await fill(page, '[data-testid="invoice-customer-email-input"], input[name="customer_email"]', 'deep-audit@example.com', 'invoice customer email');
    await fill(page, '[data-testid="invoice-address-input"], input[name="address"]', '1 Deep Audit Street, Wellington', 'invoice address');
    await page.locator('[data-testid="invoice-description-input"], textarea[name="description"]').first().fill('Deep audit invoice workflow test.');
    await fill(page, '[data-testid="invoice-subtotal-input"], input[name="subtotal"]', '160', 'invoice subtotal');
    await page.locator('[data-testid="invoice-notes-input"], textarea[name="notes"]').first().fill('Created by automated Churvox true launch certification audit.');
    await submitAndExpectList(page, '[data-testid="save-invoice-button"], button[type="submit"]', '/invoices', invoiceName, 'Invoice');

    await assertNoAuditFailures(audit);
  });

  test('automation, buttons, and safe interactions work', async ({ page }) => {
    const audit = auditBag();
    attachWatchers(page, audit);
    await login(page);

    await open(page, '/automation', 'Automation');
    await maybeClickVisible(page, ['text=/Templates/i']);
    await page.waitForTimeout(700);
    await assertAlive(page, 'Automation templates toggle');

    await maybeClickVisible(page, ['text=/Recent runs/i']);
    await page.waitForTimeout(700);
    await assertAlive(page, 'Automation recent runs toggle');

    const sweepButton = page.locator('button').filter({ hasText: /sweep/i }).first();
    if (await sweepButton.isVisible().catch(() => false)) {
      await sweepButton.click();
      await page.waitForTimeout(1800);
      await assertAlive(page, 'Automation after run sweep');
    }

    await open(page, '/settings', 'Settings');
    await maybeClickVisible(page, ['text=/Save|Update|Refresh/i']);
    await page.waitForTimeout(900);
    await assertAlive(page, 'Settings after safe action');

    await open(page, '/notifications', 'Notifications');
    await maybeClickVisible(page, ['text=/Mark all read|Refresh/i']);
    await page.waitForTimeout(900);
    await assertAlive(page, 'Notifications after safe action');

    await assertNoAuditFailures(audit);
  });

  test('public customer quote and invoice pages fail safely on bad token', async ({ page }) => {
    const audit = auditBag();
    attachWatchers(page, audit);

    await open(page, '/public/quote/not-a-real-token-true-launch-certification', 'Public quote bad token');
    await open(page, '/public/invoice/not-a-real-token-true-launch-certification', 'Public invoice bad token');

    await assertNoAuditFailures(audit);
  });
});
