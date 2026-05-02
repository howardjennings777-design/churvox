const { test, expect } = require('@playwright/test');

test('qa auditor route redirects unauthenticated users', async ({ page }) => {
  await page.goto('/admin/qa-auditor');
  await expect(page).toHaveURL(/login/);
});
