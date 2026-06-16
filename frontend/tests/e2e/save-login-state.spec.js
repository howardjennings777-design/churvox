const { test, expect } = require('@playwright/test');

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'https://www.churvox.com';
const storagePath = process.env.PLAYWRIGHT_STORAGE_STATE || 'tests/e2e/.auth/churvox-owner.json';

test('save logged-in Churvox owner state', async ({ page }) => {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });

  console.log('\nLog in manually in the opened browser window.');
  console.log('After the dashboard loads, this test will save the session to:');
  console.log(storagePath);

  await page.waitForURL(/dashboard|command-board|plans|jobs|invoices/i, { timeout: 180000 });

  await expect(page.getByText(/Tell Churvox|Today|Review|Jobs|Invoices/i).first()).toBeVisible({ timeout: 30000 });
  await page.context().storageState({ path: storagePath });
});
