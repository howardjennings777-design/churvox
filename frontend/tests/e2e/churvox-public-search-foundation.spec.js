const { test, expect } = require('@playwright/test');

const INDUSTRY_SLUGS = [
  'lawn-care',
  'landscaping',
  'cleaning',
  'property-maintenance',
  'handyman',
  'painting',
  'plumbing-electrical-hvac',
  'pest-control',
  'barber-hairdresser',
];

test('homepage still explains Churvox when JavaScript is unavailable', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();

  await page.goto(baseURL || 'http://127.0.0.1:3000/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Your business handled');
  await expect(page.getByText('Churvox prepares jobs, worker updates, messages, quotes, invoices and follow-ups.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Become a tester' })).toHaveAttribute('href', '/testers/');
  await expect(page.getByRole('link', { name: 'Lawn and garden' })).toHaveAttribute('href', '/industries/lawn-care');

  await context.close();
});

test('industry pages publish specific title, description and canonical metadata', async ({ page }) => {
  await page.route('**/api/**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data: [], items: [], records: [] }),
  }));

  await page.goto('/industries/cleaning');
  await expect(page).toHaveTitle(/Cleaning job management software \| Churvox/);

  const description = page.locator('meta[name="description"]');
  await expect(description).toHaveAttribute('content', /site checklists, key\/access notes, cleaner updates/i);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://www.churvox.com/industries/cleaning');
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', 'https://www.churvox.com/industries/cleaning');
});

test('industry and pricing pages stay specific when JavaScript is unavailable', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();

  await page.goto(`${baseURL || 'http://127.0.0.1:3000'}/industries/cleaning`);
  await expect(page).toHaveTitle('Cleaning job management software | Churvox');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('recurring visits');
  await expect(page.getByText(/site checklists, key and access notes/i)).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://www.churvox.com/industries/cleaning');

  await page.goto(`${baseURL || 'http://127.0.0.1:3000'}/pricing`);
  await expect(page).toHaveTitle(/Churvox pricing/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('level of admin');
  await expect(page.getByText('Operator — $149 + GST')).toBeVisible();

  await page.goto(`${baseURL || 'http://127.0.0.1:3000'}/login`);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);

  await context.close();
});

test('sitemap exposes the useful public and industry pages', async ({ request }) => {
  const response = await request.get('/sitemap.xml');
  expect(response.ok()).toBeTruthy();
  const xml = await response.text();

  expect(xml).toContain('https://www.churvox.com/testers/');
  expect(xml).toContain('https://www.churvox.com/product');
  expect(xml).toContain('https://www.churvox.com/demo');
  for (const slug of INDUSTRY_SLUGS) {
    expect(xml).toContain(`https://www.churvox.com/industries/${slug}`);
  }
});
