const { test, expect } = require('@playwright/test');

const EMAIL = process.env.CHURVOX_E2E_EMAIL || process.env.E2E_EMAIL || '';
const PASSWORD = process.env.CHURVOX_E2E_PASSWORD || process.env.E2E_PASSWORD || '';

async function login(page) {
  test.skip(!EMAIL || !PASSWORD, 'Set CHURVOX_E2E_EMAIL and CHURVOX_E2E_PASSWORD.');
  await page.goto('/login');
  await page.locator('input[type="email"], input[name="email"]').first().fill(EMAIL);
  await page.locator('input[type="password"], input[name="password"]').first().fill(PASSWORD);
  await page.getByRole('button', { name: /sign in|log in|login/i }).first().click();
  await page.waitForURL(/dashboard|plans|setup|guide/i, { timeout: 30000 });
  await page.goto('/dashboard');
  await page.waitForLoadState('domcontentloaded');
  await expect(page.locator('.cv7Product')).toBeVisible({ timeout: 30000 });
}

test.describe('Churvox Control Board V7', () => {
  test('owner lands on a self-explaining live control board', async ({ page }) => {
    await login(page);

    await expect(page.locator('nav[aria-label="Churvox main navigation"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Today', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Work', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clients', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Money', exact: true })).toBeVisible();

    await expect(page.locator('body')).toContainText(/Business under control|things? need you/i);
    await expect(page.locator('body')).toContainText(/Needs you/i);
    await expect(page.locator('body')).toContainText(/Business flow/i);
    await expect(page.getByRole('button', { name: /Create/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Search/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Notifications/i })).toBeVisible();

    await expect(page.locator('.cv3NavGroup')).toHaveCount(0);
    await expect(page.locator('.cv6PageLens')).toHaveCount(0);
  });

  test('daily areas expose visible sub-workspaces rather than grouped dropdowns', async ({ page }) => {
    await login(page);

    await page.getByRole('button', { name: 'Work', exact: true }).click();
    await expect(page.locator('nav[aria-label="work navigation"]')).toContainText('Jobs');
    await expect(page.locator('nav[aria-label="work navigation"]')).toContainText('Schedule');
    await expect(page.locator('nav[aria-label="work navigation"]')).toContainText('Recurring');

    await page.getByRole('button', { name: 'Money', exact: true }).click();
    await expect(page.locator('nav[aria-label="money navigation"]')).toContainText('Overview');
    await expect(page.locator('nav[aria-label="money navigation"]')).toContainText('Quotes');
    await expect(page.locator('nav[aria-label="money navigation"]')).toContainText('Invoices');
  });

  test('global create opens real record choices', async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: /Create/i }).click();
    await expect(page.getByRole('dialog', { name: 'Create in Churvox' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Job Book, assign and price work/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Client Create a customer file/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Quote Prepare scope and price/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Invoice Create an owner-reviewed draft/i })).toBeVisible();
  });
});
