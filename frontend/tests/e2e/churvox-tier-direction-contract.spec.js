const { test, expect } = require('@playwright/test');

test('plans explain simple surface powerful underneath direction', async ({ page }) => {
  await page.goto('/plans');
  await expect(page.getByText(/Looks simple\. Works hard underneath/i)).toBeVisible();
  await expect(page.getByText(/Recurring jobs included/i)).toBeVisible();
  await expect(page.getByText(/Xero Sync Add-on/i)).toBeVisible();
  await expect(page.getByText(/Command Approval System/i)).toBeVisible();
});

test('dashboard keeps simple main track visible', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByText(/Smart Hub/i).first()).toBeVisible();
  await expect(page.getByText(/Jobs/i).first()).toBeVisible();
  await expect(page.getByText(/Invoices|Money/i).first()).toBeVisible();
});
