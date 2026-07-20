const { test, expect } = require('@playwright/test');

const owner = {
  id: 'platform-owner-test',
  business_id: 'platform-owner-test',
  email: 'hello@churvox.com',
  role: 'platform_owner',
  plan: 'enterprise',
  subscription_status: 'active',
  has_app_access: true,
  is_platform_owner: true,
};

function json(body, status = 200) {
  return { status, contentType: 'application/json', body: JSON.stringify(body) };
}

test('HQ promotion centre copies tracked content without publishing or sending', async ({ page }) => {
  const externalRequests = [];

  await page.addInitScript(() => {
    window.__CHURVOX_TEST_COPIES__ = [];
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (value) => { window.__CHURVOX_TEST_COPIES__.push(String(value)); },
      },
    });
  });

  page.on('request', (request) => {
    const url = request.url();
    if (/facebook\.com|linkedin\.com|instagram\.com/i.test(url)) externalRequests.push(url);
  });

  await page.route('**/api/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (/\/auth\/(?:me|check|session)$/i.test(pathname)) return route.fulfill(json({ success: true, user: owner, ...owner }));
    if (pathname === '/api/admin/owner/tester-applications') return route.fulfill(json({ success: true, count: 0, applications: [] }));
    if (pathname === '/api/admin/owner-overview') return route.fulfill(json({ success: true, lists: { all_users: [], businesses: [], events: [] } }));
    if (pathname === '/api/admin/owner/paid-launch-report') return route.fulfill(json({ success: true, counts: {}, billing: {}, collections: { connected: true, counts: {}, latest: {} }, launch_checks: [] }));
    if (pathname === '/api/admin/owner/connection') return route.fulfill(json({ success: true, database_connected: true, collections_seen: [], counts: {} }));
    if (pathname === '/api/platform/visit') return route.fulfill(json({ ok: true }));
    return route.fulfill(json({ success: true, counts: {}, items: [], rows: [], testers: [], invited_testers: [], accepted_testers: [], active_testers: [] }));
  });

  await page.goto('/admin', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Open Churvox promotion centre' }).click();

  const dialog = page.getByRole('dialog', { name: 'Churvox promotion centre' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Promotion Centre' })).toBeVisible();
  await expect(dialog.getByText('This screen copies content only—it never publishes or sends anything.')).toBeVisible();
  await expect(dialog.getByText(/utm_source=facebook/)).toBeVisible();
  await expect(dialog.getByRole('button', { name: /publish|send/i })).toHaveCount(0);

  await dialog.getByRole('button', { name: 'Copy full post' }).click();
  await expect(dialog.getByText('Post copied')).toBeVisible();
  const copied = await page.evaluate(() => window.__CHURVOX_TEST_COPIES__);
  expect(copied).toHaveLength(1);
  expect(copied[0]).toContain('utm_source=facebook');
  expect(copied[0]).toContain('utm_campaign=founding_10');

  await dialog.getByRole('button', { name: /LinkedIn Professional introduction/i }).click();
  await expect(dialog.getByText(/utm_source=linkedin/)).toBeVisible();

  await dialog.getByRole('button', { name: /Day 1 Post the Facebook founder story/i }).click();
  await expect(dialog.getByText('1/7 done')).toBeVisible();
  const savedPlan = await page.evaluate(() => JSON.parse(localStorage.getItem('churvox:hq-promotion-plan:v1') || '[]'));
  expect(savedPlan).toContain('day-1');
  expect(externalRequests).toEqual([]);
});
