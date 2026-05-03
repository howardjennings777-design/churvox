const { test, expect } = require('@playwright/test');
const { createErrorMonitor } = require('./_helpers');

const routes = ['/dashboard', '/jobs', '/clients', '/quotes', '/invoices', '/team', '/dispatch', '/automation', '/communications', '/settings'];

for (const route of routes) {
  test(`core route renders safely: ${route}`, async ({ page }, testInfo) => {
    const monitor = createErrorMonitor(page, testInfo);
    await page.goto(route);
    await expect(page.locator('body')).toBeVisible();
    const text = await page.locator('body').innerText();
    expect(text.trim().length).toBeGreaterThan(0);
    await monitor.assertHealthy();
  });
}
