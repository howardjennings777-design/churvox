const { test, expect } = require('@playwright/test');

const EMAIL = process.env.CHURVOX_AUDIT_EMAIL || '';
const PASSWORD = process.env.CHURVOX_AUDIT_PASSWORD || '';
const stamp = `Deep Audit ${Date.now()}`;
const auditErrors = () => ({ consoleErrors: [], pageErrors: [], apiFailures: [] });

function attachWatchers(page, audit) {
  page.on('console', (msg) => {
    const text = msg.text();
    if (msg.type() === 'error' && !text.includes('ResizeObserver') && !text.includes('404')) {
      audit.consoleErrors.push(`${msg.type()}: ${text}`);
    }
  });
  page.on('pageerror', (err) => audit.pageErrors.push(err.message));
  page.on('response', (response) => {
    const url = response.url();
    const status = response.status();
    if (url.includes('/api/') && status >= 500) audit.apiFailures.push(`${status} ${url}`);
  });
}

async function login(page) {
  await page.goto('/login');
  await expect(page.locator('input[type="email"], input[name="email"], [data-testid="email-input"]').first()).toBeVisible();
  if (!EMAIL || !PASSWORD) test.skip(true, 'Missing CHURVOX_AUDIT_EMAIL or CHURVOX_AUDIT_PASSWORD');
  await page.locator('input[type="email"], input[name="email"], [data-testid="email-input"]').first().fill(EMAIL);
  await page.locator('input[type="password"], input[name="password"], [data-testid="password-input"]').first().fill(PASSWORD);
  await page.locator('button[type="submit"], [data-testid="login-button"]').first().click();
  await page.waitForURL(/\/(dashboard|overview|admin|worker\/jobs|jobs|plans|payroll|settings)(\/|$|\?)/, { timeout: 25_000 });
}

async function pageText(page) {
  return (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
}

async function assertAlive(page, label) {
  await expect(page.locator('body')).toBeVisible();
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(900);
  const text = await pageText(page);
  expect(text.length, `${label} should have visible content`).toBeGreaterThan(30);
}

async function open(page, path, label) {
  await page.goto(path);
  await assertAlive(page, label);
}

async function clickFirstVisible(page, selectors, label) {
  for (const selector of selectors) {
    const item = page.locator(selector).first();
    if (await item.isVisible().catch(() => false)) {
      await item.click();
      return true;
    }
  }
  throw new Error(`Could not find ${label}`);
}

async function fillFirstVisible(page, selectors, value) {
  for (const selector of selectors) {
    const item = page.locator(selector).first();
    if (await item.isVisible().catch(() => false)) {
      await item.fill(value);
      return true;
    }
  }
  return false;
}

async function checkCreateRoute(page, openPath, createSelectors, expectedCreateUrl, label) {
  await open(page, openPath, `${label} list`);
  await clickFirstVisible(page, createSelectors, `${label} create button`);
  await page.waitForURL(expectedCreateUrl, { timeout: 12_000 }).catch(() => {});
  await assertAlive(page, `${label} create page`);
}

test.describe('Churvox deep launch audit', () => {
  test('deep authenticated workflow sweep', async ({ page }) => {
    const audit = auditErrors();
    attachWatchers(page, audit);
    await login(page);

    const pages = [
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

    for (const [path, label] of pages) {
      await open(page, path, label);
    }

    await checkCreateRoute(page, '/clients', ['a[href="/clients/new"]', 'text=/Add client|New client|Create client/i'], /\/clients\/new/, 'Client');
    await fillFirstVisible(page, ['input[name="name"]', 'input[placeholder*="name" i]', 'input[type="text"]'], `${stamp} Client`);
    await fillFirstVisible(page, ['input[name="email"]', 'input[type="email"]'], 'deep-audit@example.com');
    await fillFirstVisible(page, ['input[name="phone"]', 'input[placeholder*="phone" i]'], '0210000000');

    await checkCreateRoute(page, '/jobs', ['a[href="/jobs/new"]', 'text=/Add job|New job|Create job/i'], /\/jobs\/new/, 'Job');
    await checkCreateRoute(page, '/quotes', ['a[href="/quotes/new"]', 'text=/Add quote|New quote|Create quote/i'], /\/quotes\/new/, 'Quote');
    await checkCreateRoute(page, '/invoices', ['a[href="/invoices/new"]', 'text=/Add invoice|New invoice|Create invoice/i'], /\/invoices\/new/, 'Invoice');

    await open(page, '/automation', 'Automation');
    const sweepButton = page.locator('button').filter({ hasText: /sweep/i }).first();
    if (await sweepButton.isVisible().catch(() => false)) {
      await sweepButton.click();
      await page.waitForTimeout(1600);
      await assertAlive(page, 'Automation after run sweep');
    }

    await expect(page.locator('a[href="/dispatch"], a[href="/calendar"]')).toHaveCount(0);

    expect(audit.pageErrors, `Page errors:\n${audit.pageErrors.join('\n')}`).toEqual([]);
    expect(audit.apiFailures, `API 500s:\n${audit.apiFailures.join('\n')}`).toEqual([]);
    expect(audit.consoleErrors.slice(0, 12), `Console errors:\n${audit.consoleErrors.join('\n')}`).toEqual([]);
  });
});
