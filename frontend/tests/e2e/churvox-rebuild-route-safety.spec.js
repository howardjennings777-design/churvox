const { test, expect } = require('@playwright/test');

test.describe('new Churvox rebuild route safety', () => {
  test('public hidden lab remains reachable for safe audit', async ({ page }) => {
    await page.goto('/office-team-lab#today', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.cvOfficeSite')).toBeVisible();
    await expect(page.getByText(/Hidden internal website|owner approval locked/i).first()).toBeVisible();
  });

  test('owner app routes stay behind login when signed out', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/login/i);

    await page.goto('/jobs', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/login/i);

    await page.goto('/clients', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/login/i);
  });

  test('worker app routes stay behind worker login when signed out', async ({ page }) => {
    await page.goto('/worker/today', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/login\?worker=1/i);

    await page.goto('/worker/messages', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/login\?worker=1/i);
  });

  test('legacy fallbacks remain protected and available', async ({ page }) => {
    await page.goto('/legacy-dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/login/i);

    await page.goto('/legacy-worker/today', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/login\?worker=1/i);
  });
});
