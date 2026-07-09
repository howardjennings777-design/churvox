const { test, expect } = require('@playwright/test');

async function expectOwnerAppNotExposed(page, path) {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  await expect(page.locator('.cvOfficeSite')).toHaveCount(0);
  await expect(page.getByText(/Churvox runs the office\. The owner approves the decisions\./i)).toHaveCount(0);
  await expect(page.getByText(/Owner app ·|New owner app/i)).toHaveCount(0);
}

async function expectWorkerAppNotExposed(page, path) {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/login\?worker=1/i);
}

test.describe('new Churvox rebuild route safety', () => {
  test('public hidden lab remains reachable for safe audit', async ({ page }) => {
    await page.goto('/office-team-lab#today', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.cvOfficeSite')).toBeVisible();
    await expect(page.getByText(/Hidden internal website|owner approval locked/i).first()).toBeVisible();
  });

  test('owner app routes do not expose owner UI when signed out', async ({ page }) => {
    await expectOwnerAppNotExposed(page, '/dashboard');
    await expectOwnerAppNotExposed(page, '/jobs');
    await expectOwnerAppNotExposed(page, '/clients');
  });

  test('worker app routes stay behind worker login when signed out', async ({ page }) => {
    await expectWorkerAppNotExposed(page, '/worker/today');
    await expectWorkerAppNotExposed(page, '/worker/messages');
  });

  test('legacy fallbacks remain protected and available', async ({ page }) => {
    await expectOwnerAppNotExposed(page, '/legacy-dashboard');
    await expectWorkerAppNotExposed(page, '/legacy-worker/today');
  });
});
