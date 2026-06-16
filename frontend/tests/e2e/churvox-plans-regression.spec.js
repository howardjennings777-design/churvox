const { test, expect } = require('@playwright/test');

const EMAIL = process.env.CHURVOX_E2E_EMAIL || '';
const PASSWORD = process.env.CHURVOX_E2E_PASSWORD || '';

async function waitSmall(page) {
  await page.waitForLoadState('domcontentloaded').catch(() => null);
  await page.waitForTimeout(350).catch(() => null);
}

async function fillAny(page, names, value) {
  for (const name of names) {
    const label = page.getByLabel(new RegExp(name, 'i')).first();
    if (await label.count().catch(() => 0) && await label.isVisible().catch(() => false)) {
      await label.fill(value);
      return true;
    }
    const placeholder = page.getByPlaceholder(new RegExp(name, 'i')).first();
    if (await placeholder.count().catch(() => 0) && await placeholder.isVisible().catch(() => false)) {
      await placeholder.fill(value);
      return true;
    }
  }
  return false;
}

async function clickAny(page, names) {
  for (const name of names) {
    const button = page.getByRole('button', { name }).first();
    if (await button.count().catch(() => 0) && await button.isVisible().catch(() => false)) {
      await button.click();
      await waitSmall(page);
      return true;
    }
    const text = page.getByText(name, { exact: false }).first();
    if (await text.count().catch(() => 0) && await text.isVisible().catch(() => false)) {
      await text.click();
      await waitSmall(page);
      return true;
    }
  }
  return false;
}

async function login(page) {
  test.skip(!EMAIL || !PASSWORD, 'Set CHURVOX_E2E_EMAIL and CHURVOX_E2E_PASSWORD.');
  await page.goto('/login');
  await waitSmall(page);
  await fillAny(page, ['email'], EMAIL);
  await fillAny(page, ['password'], PASSWORD);
  await clickAny(page, [/sign in/i, /log in/i, /login/i]);
  await page.waitForURL(/dashboard|plans|setup|guide|payroll|worker|admin/i, { timeout: 35_000 }).catch(() => null);
  await waitSmall(page);
}

test.describe('Churvox plans regression', () => {
  test('Plans loads current plan from backend billing JSON, not frontend HTML', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', (msg) => {
      const text = msg.text();
      if (msg.type() === 'error' && !/favicon|ResizeObserver|AbortError|status of 401/i.test(text)) {
        consoleErrors.push(text);
      }
    });

    await login(page);

    const statusResponsePromise = page.waitForResponse(
      (res) => res.url().includes('/api/billing/subscription-status'),
      { timeout: 30_000 }
    ).catch(() => null);

    await page.goto('/plans?debug=1');
    await waitSmall(page);

    const statusResponse = await statusResponsePromise;
    expect(statusResponse, 'Plans should request billing status from the backend API').toBeTruthy();
    expect(statusResponse.status(), `unexpected billing status ${statusResponse && statusResponse.status()}`).toBeLessThan(500);
    expect(statusResponse.headers()['content-type'] || '').toMatch(/json/i);

    const body = await page.locator('body').innerText({ timeout: 10_000 });
    expect(body).toContain('Current plan');
    expect(body).toMatch(/Start|Crew|Operator|Command|No plan chosen|Loaded from billing profile/i);
    expect(body).not.toContain('Non-JSON response');
    expect(body).not.toContain('website page');

    await expect(page.locator('[data-checkout-trace="checkout-return-current-plan-v33"]')).toHaveCount(1);

    const reloadResponsePromise = page.waitForResponse(
      (res) => res.url().includes('/api/billing/subscription-status'),
      { timeout: 30_000 }
    ).catch(() => null);
    await clickAny(page, [/Reload current plan/i]);
    const reloadResponse = await reloadResponsePromise;
    expect(reloadResponse, 'Reload current plan should hit backend billing status').toBeTruthy();
    expect(reloadResponse.status()).toBeLessThan(500);

    const afterReload = await page.locator('body').innerText({ timeout: 10_000 });
    expect(afterReload).not.toContain('Non-JSON response');
    expect(consoleErrors).toEqual([]);
  });
});
