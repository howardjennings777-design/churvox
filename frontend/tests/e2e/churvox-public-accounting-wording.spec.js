const { test, expect } = require('@playwright/test');

test('public pricing keeps accounting wording to Xero until MYOB access exists', async ({ page }) => {
  await page.goto('/plans');
  await expect(page.getByText(/Xero Sync Add-on/i).first()).toBeVisible();
  await expect(page.getByText(/MYOB/i)).toHaveCount(0);
});
