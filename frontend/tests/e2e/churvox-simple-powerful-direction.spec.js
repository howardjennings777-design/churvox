const { test, expect } = require('@playwright/test');

test('plans show simple powerful tier direction', async ({ page }) => {
  await page.goto('/plans');
  await expect(page.getByText(/Looks simple\. Works hard underneath/i).first()).toBeVisible();
  await expect(page.getByText(/Simple outside\. Powerful underneath/i).first()).toBeVisible();
  await expect(page.getByText(/Recurring jobs included/i).first()).toBeVisible();
  await expect(page.getByText(/Xero Sync Add-on/i).first()).toBeVisible();
  await expect(page.getByText(/MYOB/i)).toHaveCount(0);
});

test('smart hub explains the simple track', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: /Smart Hub/i }).first()).toBeVisible();
  await expect(page.getByText(/Your simple track for the day/i).first()).toBeVisible();
  await expect(page.getByText(/Run today's work/i).first()).toBeVisible();
  await expect(page.getByText(/Churvox spots admin/i).first()).toBeVisible();
});

test('command explains approval system when available', async ({ page }) => {
  await page.goto('/dashboard#command');
  const locked = page.getByText(/Command is not in/i).first();
  const memory = page.getByText(/Last time this client paid \$85/i).first();
  await expect(locked.or(memory)).toBeVisible();
});
