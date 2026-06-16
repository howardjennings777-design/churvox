const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'https://www.churvox.com';
const storagePath = process.env.PLAYWRIGHT_STORAGE_STATE || 'tests/e2e/.auth/churvox-owner.json';
const loginEmail = process.env.CHURVOX_EMAIL || process.env.PLAYWRIGHT_LOGIN_EMAIL || '';
const loginPassword = process.env.CHURVOX_PASSWORD || process.env.PLAYWRIGHT_LOGIN_PASSWORD || '';
const manualLogin = process.env.PLAYWRIGHT_MANUAL_LOGIN === '1';

test('save logged-in Churvox owner state', async ({ page }) => {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });

  if (loginEmail && loginPassword) {
    await page.getByLabel(/email/i).fill(loginEmail);
    await page.getByLabel(/password/i).fill(loginPassword);
    await page.getByRole('button', { name: /log in|sign in|login/i }).click();
  } else if (manualLogin) {
    console.log('\nLog in manually in the opened browser window.');
    console.log('After the dashboard loads, this test will save the session to:');
    console.log(storagePath);
  } else {
    throw new Error(
      'No login method provided. In Codespaces, run headless with CHURVOX_EMAIL and CHURVOX_PASSWORD. For manual local login, run with PLAYWRIGHT_MANUAL_LOGIN=1 and --headed on a machine with a display.'
    );
  }

  await page.waitForURL(/dashboard|command-board|plans|jobs|invoices/i, { timeout: 180000 });
  await expect(page.getByText(/Tell Churvox|Today|Review|Jobs|Invoices/i).first()).toBeVisible({ timeout: 30000 });
  fs.mkdirSync(path.dirname(storagePath), { recursive: true });
  await page.context().storageState({ path: storagePath });
});
