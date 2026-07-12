const { test, expect } = require('@playwright/test');

function json(body, status = 200) {
  return { status, contentType: 'application/json', body: JSON.stringify(body) };
}

async function mockPublicApi(page) {
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/public/invoice/noindex-token') {
      return route.fulfill(json({
        success: true,
        invoice: {
          invoice_number: 'INV-NOINDEX',
          customer_name: 'Private Customer',
          description: 'Private invoice',
          total: 115,
          amount_due: 115,
          status: 'sent',
          line_items: [{ description: 'Private service', quantity: 1, unit_price: 115, amount: 115 }],
          business_snapshot: { business_name: 'Private Business', currency: 'NZD' },
        },
      }));
    }
    if (/\/api\/auth\/(?:me|check|session)$/.test(path)) return route.fulfill(json({ detail: 'Not authenticated' }, 401));
    if (path === '/api/platform/visit') return route.fulfill(json({ ok: true }));
    return route.fulfill(json({ success: true, data: [] }));
  });
}

test.describe('Paid-launch indexing and public metadata', () => {
  test('marketing home is indexable with a clean canonical', async ({ page }) => {
    await mockPublicApi(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /index, follow/i);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /https?:\/\/[^/]+\/$/i);
  });

  test('tokenised customer documents are noindex and have no canonical URL', async ({ page }) => {
    await mockPublicApi(page);
    await page.goto('/invoice/noindex-token', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('INV-NOINDEX')).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex, nofollow, noarchive/i);
    await expect(page.locator('link[rel="canonical"]')).not.toHaveAttribute('href', /.+/);
  });

  test('login and admin routes are noindex', async ({ page }) => {
    await mockPublicApi(page);
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/i);

    await page.goto('/admin', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/i);
  });

  test('robots, sitemap and security contact are published', async ({ request }) => {
    const base = String(process.env.PLAYWRIGHT_BASE_URL || 'https://www.churvox.com').replace(/\/$/, '');

    const robots = await request.get(`${base}/robots.txt`);
    expect(robots.status()).toBe(200);
    expect(await robots.text()).toMatch(/Disallow:\s*\/admin/i);

    const sitemap = await request.get(`${base}/sitemap.xml`);
    expect(sitemap.status()).toBe(200);
    expect(await sitemap.text()).toMatch(/https:\/\/www\.churvox\.com\/pricing/i);

    const security = await request.get(`${base}/.well-known/security.txt`);
    expect(security.status()).toBe(200);
    expect(await security.text()).toMatch(/mailto:hello@churvox\.com/i);
  });
});
