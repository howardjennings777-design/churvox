const { test, expect } = require('@playwright/test');
const { createErrorMonitor, loginIfPossible } = require('./_helpers');

test('role-safe smoke without credentials', async ({ page }, testInfo) => {
  const monitor = createErrorMonitor(page, testInfo);
  const authed = await loginIfPossible(page);
  if (!authed) {
    await expect(page).toHaveURL(/login/);
    await expect(page.locator('body')).toContainText(/login|sign in|email/i);
  }
  await monitor.assertHealthy();
});
