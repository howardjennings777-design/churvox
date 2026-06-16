const { test, expect } = require('@playwright/test');

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const reviewKeys = [
  'churvox:review-inbox:v1',
  'churvox:fresh-command-inbox:v1',
  'churvox:review-archive:v1',
];

if (process.env.PLAYWRIGHT_STORAGE_STATE) {
  test.use({ storageState: process.env.PLAYWRIGHT_STORAGE_STATE });
}

async function openTellChurvox(page) {
  await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'domcontentloaded' });

  const loginVisible = await page.getByRole('button', { name: /log in|sign in/i }).first().isVisible().catch(() => false);
  if (loginVisible || /login/i.test(page.url())) {
    test.skip(true, 'Login is required. Run with PLAYWRIGHT_STORAGE_STATE pointing to a logged-in state file.');
  }

  const tellNav = page.getByRole('button', { name: /Tell Churvox|Tell/i }).first();
  if (await tellNav.isVisible().catch(() => false)) {
    await tellNav.click();
  } else {
    await page.goto(`${baseUrl}/dashboard#quickcreateai`, { waitUntil: 'domcontentloaded' });
  }

  await expect(page.getByRole('heading', { name: /Say what you want done/i })).toBeVisible({ timeout: 15000 });
}

test('saving a Tell Churvox item shows it in Owner Review', async ({ page }) => {
  await openTellChurvox(page);
  await page.evaluate((keys) => keys.forEach((key) => window.localStorage.removeItem(key)), reviewKeys);

  await page.getByRole('button', { name: 'Add client' }).click();
  await expect(page.locator('textarea')).toHaveValue(/add client Sarah Johnson/i);

  await page.getByRole('button', { name: /Open approval pop-up/i }).first().click();
  await expect(page.getByRole('dialog')).toContainText(/Create Client/i);
  await page.getByRole('button', { name: /Save to Review/i }).click();
  await expect(page.getByText(/Saved to Review/i)).toBeVisible({ timeout: 10000 });

  await page.goto(`${baseUrl}/command-board`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /Approve what Churvox prepared/i })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/Create Client ready for review/i)).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/Sarah Johnson/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /Open review/i }).first()).toBeVisible();
});
