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

test('HQ shows tracked tester applications without contact or access actions', async ({ page }) => {
  await page.route('**/api/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;

    if (/\/auth\/(?:me|check|session)$/i.test(pathname)) {
      return route.fulfill(json({ success: true, user: owner, ...owner }));
    }
    if (pathname === '/api/admin/owner/tester-applications') {
      return route.fulfill(json({
        success: true,
        count: 2,
        applications: [
          {
            id: 'application-1',
            name: 'Aroha Test',
            business_name: 'Aroha Lawn Care',
            trade: 'Lawn care',
            team_size: '2-5',
            email: 'aroha@example.test',
            status: 'new',
            source: 'facebook',
            utm_source: 'facebook',
            utm_medium: 'social',
            utm_campaign: 'founding_10',
            created_at: '2026-07-20T01:00:00Z',
            locale: 'en-NZ',
          },
          {
            id: 'application-2',
            name: 'Sam Test',
            business_name: 'Sam Property Services',
            trade: 'Property maintenance',
            team_size: '6-10',
            email: 'sam@example.test',
            status: 'reviewed',
            source: 'linkedin',
            utm_source: 'linkedin',
            utm_medium: 'social',
            utm_campaign: 'founding_10',
            created_at: '2026-07-20T02:00:00Z',
            locale: 'en-AU',
          },
        ],
      }));
    }
    if (pathname === '/api/admin/owner-overview') {
      return route.fulfill(json({ success: true, lists: { all_users: [], businesses: [], events: [] } }));
    }
    if (pathname === '/api/admin/owner/paid-launch-report') {
      return route.fulfill(json({ success: true, counts: {}, billing: {}, collections: { connected: true, counts: {}, latest: {} }, launch_checks: [] }));
    }
    if (pathname === '/api/admin/owner/connection') {
      return route.fulfill(json({ success: true, database_connected: true, collections_seen: [], counts: {} }));
    }
    if (pathname === '/api/platform/visit') return route.fulfill(json({ ok: true }));
    return route.fulfill(json({ success: true, counts: {}, items: [], rows: [], testers: [], invited_testers: [], accepted_testers: [], active_testers: [] }));
  });

  await page.goto('/admin', { waitUntil: 'domcontentloaded' });
  const launcher = page.getByRole('button', { name: /Open tester applications, 1 new/i });
  await expect(launcher).toBeVisible();
  await expect(launcher).toContainText('2');
  await launcher.click();

  const dialog = page.getByRole('dialog', { name: 'Tester application inbox' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Tester applications' })).toBeVisible();
  await expect(dialog.getByText('Nothing is sent and no access is granted from this inbox.')).toBeVisible();
  await expect(dialog.getByText('Aroha Lawn Care')).toBeVisible();
  await expect(dialog.getByText('facebook · social · founding_10')).toBeVisible();
  await expect(dialog.locator('a[href^="mailto:"]')).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: /send|contact|grant/i })).toHaveCount(0);

  await dialog.getByPlaceholder('Search business, trade, email or source…').fill('linkedin');
  await expect(dialog.getByText('Sam Property Services')).toBeVisible();
  await expect(dialog.getByText('Aroha Lawn Care')).toHaveCount(0);
});
