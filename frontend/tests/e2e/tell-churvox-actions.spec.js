const { test, expect } = require('@playwright/test');

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

if (process.env.PLAYWRIGHT_STORAGE_STATE) {
  test.use({ storageState: process.env.PLAYWRIGHT_STORAGE_STATE });
}

const actions = [
  { label: 'Add job', expectedTitle: /Create Job/i, expectedText: /bob 16 taita drive/i },
  { label: 'Add client', expectedTitle: /Create Client/i, expectedText: /add client Sarah Johnson/i },
  { label: 'Add quote', expectedTitle: /Create Quote/i, expectedText: /quote Sarah hedge trim/i },
  { label: 'Add invoice', expectedTitle: /Create Invoice/i, expectedText: /invoice Sarah hedge trim/i },
  { label: 'Add worker', expectedTitle: /Create Worker/i, expectedText: /add worker Mike/i },
  { label: 'Find record', expectedTitle: /Find records/i, expectedText: /find Sarah/i },
  { label: 'Move job', expectedTitle: /Reschedule job/i, expectedText: /move bob to next week/i },
  { label: 'Complete job', expectedTitle: /Complete job/i, expectedText: /mark bob complete/i },
  { label: 'Update price', expectedTitle: /Update job/i, expectedText: /change bob to \$70/i },
  { label: 'Invoice job', expectedTitle: /Create draft invoice/i, expectedText: /invoice bob completed job/i },
  { label: 'Invoice jobs', expectedTitle: /Draft invoices for completed jobs/i, expectedText: /invoice completed jobs/i },
  { label: 'Chase invoices', expectedTitle: /Prepare invoice follow-ups/i, expectedText: /chase unpaid invoices/i },
];

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

test.describe('Tell Churvox daily action pills', () => {
  test.beforeEach(async ({ page }) => {
    await openTellChurvox(page);
  });

  for (const action of actions) {
    test(`${action.label} opens the right approval preview`, async ({ page }) => {
      await page.getByRole('button', { name: action.label }).click();
      await expect(page.locator('textarea')).toHaveValue(action.expectedText);

      await page.getByRole('button', { name: /Open approval pop-up/i }).first().click();
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 15000 });
      await expect(page.getByRole('dialog')).toContainText(action.expectedTitle);
      await expect(page.getByRole('dialog')).toContainText(/Owner approval|Safe rule/i);

      await page.getByRole('button', { name: /Cancel/i }).last().click();
      await expect(page.getByRole('dialog')).toBeHidden({ timeout: 10000 });
    });
  }
});
