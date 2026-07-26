const { test, expect } = require('@playwright/test');

test('homepage publishes NZ and Australia search metadata', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle('Job management software NZ & Australia | Churvox');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /New Zealand and Australian service businesses/i);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://www.churvox.com/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Job management software');
  await expect(page.getByRole('link', { name: 'Job management software for New Zealand' })).toHaveAttribute('href', '/industries/new-zealand');
  await expect(page.getByRole('link', { name: 'Job management software for Australia' })).toHaveAttribute('href', '/industries/australia');
});

test('regional landing pages are crawlable without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  const root = baseURL || 'http://127.0.0.1:3000';

  await page.goto(`${root}/industries/new-zealand`);
  await expect(page).toHaveTitle('Job management software New Zealand | Churvox');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('New Zealand service businesses');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://www.churvox.com/industries/new-zealand');
  await expect(page.getByText(/available worldwide/i).first()).toBeVisible();

  await page.goto(`${root}/industries/australia`);
  await expect(page).toHaveTitle('Job management software Australia | Churvox');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Australian service businesses');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://www.churvox.com/industries/australia');
  await expect(page.getByText(/available worldwide/i).first()).toBeVisible();

  await context.close();
});

test('sitemap includes both regional landing pages', async ({ request }) => {
  const response = await request.get('/sitemap.xml');
  expect(response.ok()).toBeTruthy();
  const xml = await response.text();

  expect(xml).toContain('https://www.churvox.com/industries/new-zealand');
  expect(xml).toContain('https://www.churvox.com/industries/australia');
});
