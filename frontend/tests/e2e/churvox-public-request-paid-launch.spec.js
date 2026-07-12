const { test, expect } = require('@playwright/test');

function json(body, status = 200) {
  return { status, contentType: 'application/json', body: JSON.stringify(body) };
}

test.describe('Public customer request paid-launch flow', () => {
  test('generic request page cannot save customer details without a business target', async ({ page }) => {
    await page.route('**/api/**', (route) => route.fulfill(json({ detail: 'Not authenticated' }, 401)));
    await page.goto('/request', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Request link incomplete')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Business link required' })).toBeDisabled();
  });

  test('verified business request submits a clean owner-review payload', async ({ page }) => {
    let submitted = null;
    await page.route('**/api/**', async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === '/api/public/customer-request') {
        submitted = route.request().postDataJSON();
        return route.fulfill(json({ success: true, message: 'Request sent to the business for owner review.', status: 'waiting_owner_review' }));
      }
      if (/\/api\/auth\/(?:me|check|session)$/.test(url.pathname)) return route.fulfill(json({ detail: 'Not authenticated' }, 401));
      return route.fulfill(json({ ok: true }));
    });

    await page.goto('/request?owner=Owner@Real.test', { waitUntil: 'domcontentloaded' });
    await page.getByLabel('Name').fill('Real Customer');
    await page.getByLabel('Email').fill('customer@example.com');
    await page.getByLabel('Address').fill('1 Customer Street');
    await page.getByLabel('Work needed').fill('Lawn mowing and garden tidy');
    await page.getByLabel('Details').fill('Gate is on the left. Dog is inside.');
    await page.getByRole('button', { name: 'Send request' }).click();

    await expect(page.getByRole('heading', { name: /the business has your request/i })).toBeVisible();
    expect(submitted).toBeTruthy();
    expect(submitted.owner_email).toBe('owner@real.test');
    expect(submitted.customer_name).toBe('Real Customer');
    expect(submitted.customer_email).toBe('customer@example.com');
    expect(submitted.service_needed).toBe('Lawn mowing and garden tidy');
    expect(submitted.source).toBe('public_customer_request');
    expect(submitted).not.toHaveProperty('business_id');
    expect(submitted).not.toHaveProperty('status');
  });

  test('invalid owner email cannot activate the form', async ({ page }) => {
    await page.route('**/api/**', (route) => route.fulfill(json({ detail: 'Not authenticated' }, 401)));
    await page.goto('/request?owner=not-an-email', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: 'Business link required' })).toBeDisabled();
  });
});
