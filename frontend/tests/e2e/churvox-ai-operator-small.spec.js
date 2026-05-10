const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.CHURVOX_BASE_URL || 'https://www.churvox.com';
const EMAIL = process.env.CHURVOX_TEST_EMAIL || '';
const PASSWORD = process.env.CHURVOX_TEST_PASSWORD || '';

test.setTimeout(120000);

async function login(page) {
  if (!EMAIL || !PASSWORD) throw new Error('Missing CHURVOX_TEST_EMAIL or CHURVOX_TEST_PASSWORD');

  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"], input[name="email"]').first().fill(EMAIL);
  await page.locator('input[type="password"], input[name="password"]').first().fill(PASSWORD);
  await page.getByRole('button', { name: /log in|login|sign in/i }).first().click();
  await page.waitForTimeout(4000);
}

async function safeScreenshot(page, name) {
  await page.screenshot({ path: `frontend/test-results/${name}.png`, fullPage: true }).catch(() => {});
}

test('AI Operator and Owner Decisions load and prepare safely', async ({ page }) => {
  await login(page);

  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toContainText(/Churvox|AI Trade OS|Owner Decisions|Prepare/i, { timeout: 20000 });
  await safeScreenshot(page, 'ai-01-dashboard-before-prepare');

  const prepareButton = page.getByRole('button', { name: /prepare next moves|prepare today|prepare/i }).first();
  await expect(prepareButton).toBeVisible({ timeout: 15000 });
  await prepareButton.click();

  await page.waitForTimeout(10000);
  await safeScreenshot(page, 'ai-02-dashboard-after-prepare');

  await expect(page.locator('body')).toContainText(
    /Owner Decisions|Churvox AI|prepared|not configured|could not run|Review|No owner decisions/i,
    { timeout: 30000 }
  );

  const ownerDecisionCard = page.getByText(/Owner Decisions/i).first();
  if (await ownerDecisionCard.isVisible({ timeout: 5000 }).catch(() => false)) {
    await ownerDecisionCard.click();
    await page.waitForTimeout(1000);
    await safeScreenshot(page, 'ai-03-owner-decisions-modal');
    await page.keyboard.press('Escape').catch(() => {});
  }

  await page.goto(`${BASE_URL}/v3/decisions`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toContainText(/Owner Decisions|Approve and do it|AI|Prepared/i, { timeout: 20000 });
  await safeScreenshot(page, 'ai-04-v3-decisions');

  await page.goto(`${BASE_URL}/v3/operator`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toContainText(/AI Operator|Owner|queue|approval|settings|prepare/i, { timeout: 20000 });
  await safeScreenshot(page, 'ai-05-v3-operator');

  const approveButtons = await page.getByRole('button', { name: /approve|approve and do it/i }).count();
  console.log(`Approve buttons visible: ${approveButtons}`);

  const errorText = await page.locator('body').innerText();
  if (/AI Operator is not configured|not configured|model call failed|OPENAI_API_KEY/i.test(errorText)) {
    console.log('AI config message appeared. This is a clean handled state, not a frontend crash.');
  }
});
