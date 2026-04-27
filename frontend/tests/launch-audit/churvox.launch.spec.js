const { test, expect } = require('@playwright/test');

const EMAIL = process.env.CHURVOX_AUDIT_EMAIL || '';
const PASSWORD = process.env.CHURVOX_AUDIT_PASSWORD || '';
const seriousConsole = ['error'];
const allowedConsoleSnippets = [
  'ResizeObserver loop',
  'Non-Error promise rejection captured',
  'Failed to load resource: the server responded with a status of 404',
];

async function login(page) {
  await page.goto('/login');
  await expect(page.locator('body')).toBeVisible();
  if (!EMAIL || !PASSWORD) test.skip(true, 'Set CHURVOX_AUDIT_EMAIL and CHURVOX_AUDIT_PASSWORD to run authenticated launch audit.');

  const emailInput = page.locator('input[type="email"], input[name="email"], [data-testid="email-input"]').first();
  const passwordInput = page.locator('input[type="password"], input[name="password"], [data-testid="password-input"]').first();
  await expect(emailInput).toBeVisible();
  await emailInput.fill(EMAIL);
  await passwordInput.fill(PASSWORD);
  await page.locator('button[type="submit"], [data-testid="login-button"]').first().click();
  await page.waitForURL(/\/(dashboard|admin|worker\/jobs|plans)/, { timeout: 20_000 });
}

function attachFailureWatchers(page, audit) {
  page.on('console', (msg) => {
    const text = msg.text();
    if (seriousConsole.includes(msg.type()) && !allowedConsoleSnippets.some((s) => text.includes(s))) {
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

async function assertNotBlank(page, label) {
  await expect(page.locator('body')).toBeVisible();
  const bodyText = (await page.locator('body').innerText()).trim();
  expect(bodyText.length, `${label} should not be blank`).toBeGreaterThan(20);
  await expect(page.locator('text=/Loading\.\.\.|Loading|Please wait/i')).toHaveCount(0, { timeout: 12_000 }).catch(() => {});
}

async function openAndCheck(page, path, label) {
  await page.goto(path);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(900);
  await assertNotBlank(page, label);
}

test.describe('Churvox launch audit', () => {
  test('authenticated app pages load and core wiring is alive', async ({ page }) => {
    const audit = { consoleErrors: [], pageErrors: [], apiFailures: [] };
    attachFailureWatchers(page, audit);

    await login(page);

    const pages = [
      ['/dashboard', 'Dashboard / Smart Hub'],
      ['/jobs', 'Jobs'],
      ['/clients', 'Clients'],
      ['/team', 'Team'],
      ['/quotes', 'Quotes'],
      ['/invoices', 'Invoices'],
      ['/automation', 'Automation'],
      ['/payroll', 'Payroll'],
      ['/reports', 'Reports'],
      ['/settings', 'Settings'],
    ];

    for (const [path, label] of pages) {
      await openAndCheck(page, path, label);
    }

    await page.goto('/dispatch');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/jobs/);
    await assertNotBlank(page, 'Old dispatch redirect');

    await page.goto('/calendar');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/jobs/);
    await assertNotBlank(page, 'Old calendar redirect');

    await expect(page.locator('a[href="/dispatch"], a[href="/calendar"]')).toHaveCount(0);

    expect(audit.pageErrors, `Page errors:\n${audit.pageErrors.join('\n')}`).toEqual([]);
    expect(audit.apiFailures, `API 500s:\n${audit.apiFailures.join('\n')}`).toEqual([]);
    expect(audit.consoleErrors.slice(0, 10), `Console errors:\n${audit.consoleErrors.join('\n')}`).toEqual([]);
  });

  test('public customer quote/invoice pages do not crash on missing token', async ({ page }) => {
    const audit = { consoleErrors: [], pageErrors: [], apiFailures: [] };
    attachFailureWatchers(page, audit);

    await openAndCheck(page, '/public/quote/not-a-real-token-launch-audit', 'Public quote missing-token state');
    await openAndCheck(page, '/public/invoice/not-a-real-token-launch-audit', 'Public invoice missing-token state');

    expect(audit.pageErrors, `Page errors:\n${audit.pageErrors.join('\n')}`).toEqual([]);
  });
});
