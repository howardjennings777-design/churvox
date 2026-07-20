const { test, expect } = require('@playwright/test');

test.describe('Churvox Founding 10 landing page', () => {
  test('shows the offer and submits campaign tracking with the application', async ({ page }) => {
    let submittedPayload = null;

    await page.route('**/api/public/tester-applications', async (route) => {
      submittedPayload = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Application received', confirmation_sent: true }),
      });
    });

    await page.goto('/testers/?utm_source=facebook&utm_medium=social&utm_campaign=founding_10&utm_content=nz_launch');

    await expect(page).toHaveTitle(/Churvox Founding Tester/i);
    await expect(page.getByRole('heading', { name: /Help shape Churvox/i })).toBeVisible();
    await expect(page.getByText('No card or contract')).toBeVisible();
    await expect(page.getByText('Email support only')).toBeVisible();

    await page.getByLabel('Full name').fill('Test Owner');
    await page.getByLabel('Business name').fill('Test Property Services');
    await page.getByLabel('Trade').selectOption({ label: 'Property maintenance' });
    await page.getByLabel('Team size').selectOption('2-5');
    await page.getByLabel('Email').fill('owner@example.com');
    await page.getByRole('button', { name: 'Apply for a tester place' }).click();

    await expect(page.getByRole('heading', { name: 'Your application is in.' })).toBeVisible();
    expect(submittedPayload).toMatchObject({
      name: 'Test Owner',
      business_name: 'Test Property Services',
      trade: 'Property maintenance',
      email: 'owner@example.com',
      team_size: '2-5',
      source: 'facebook',
      utm_source: 'facebook',
      utm_medium: 'social',
      utm_campaign: 'founding_10',
      utm_content: 'nz_launch',
    });
    expect(submittedPayload.landing_path).toContain('/testers/');
  });

  test('keeps the application usable on a phone-sized screen', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/testers/');

    await expect(page.getByRole('heading', { name: /Help shape Churvox/i })).toBeVisible();
    await expect(page.getByLabel('Full name')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Apply for a tester place' })).toBeVisible();
  });
});
