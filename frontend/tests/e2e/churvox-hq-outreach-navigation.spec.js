const { test, expect } = require('@playwright/test');

const owner = {
  id: 'platform-owner-outreach-test',
  business_id: 'platform-owner-outreach-test',
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

async function installApi(page) {
  await page.route('**/api/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (/\/auth\/(?:me|check|session)$/i.test(pathname)) {
      return route.fulfill(json({ success: true, user: owner, ...owner }));
    }
    if (pathname === '/api/admin/owner/paid-launch-report') {
      return route.fulfill(json({
        success: true,
        ready_to_take_payments: true,
        counts: {
          users_total: 0,
          internal_users_excluded: 1,
          businesses_total: 0,
          verified_paid_users: 0,
          verified_trial_users: 0,
          tester_users: 0,
          billing_needs_verification: 0,
        },
        billing: {
          actual_mrr_nzd: 0,
          estimated_mrr_nzd: 0,
          verified_paid_users: [],
          verified_trial_users: [],
          tester_users: [],
          needs_verification: [],
          stripe: { available: true },
        },
        collections: { connected: true, counts: {}, names: [], latest: {} },
        launch_checks: [],
      }));
    }
    if (pathname === '/api/admin/owner-overview') return route.fulfill(json({ success: true, lists: { all_users: [], businesses: [], events: [] } }));
    if (pathname === '/api/admin/owner/growth-report') return route.fulfill(json({ success: true, counts: { unique_total: 0, new_unique_today: 0 } }));
    if (pathname === '/api/admin/owner/connection') return route.fulfill(json({ success: true, database_connected: true, collections_seen: [] }));
    if (pathname === '/api/admin/owner/plan-report') return route.fulfill(json({ success: true }));
    if (pathname === '/api/admin/owner/control-log') return route.fulfill(json({ success: true, items: [] }));
    if (pathname === '/api/admin/owner/retention-email-status') return route.fulfill(json({ success: true }));
    if (pathname === '/api/admin/owner/testers') return route.fulfill(json({ success: true, counts: { total: 0 }, testers: [], invited_testers: [], accepted_testers: [], active_testers: [] }));
    if (pathname === '/api/admin/owner/tester-outreach') {
      return route.fulfill(json({
        success: true,
        counts: { total: 0, drafts: 0, sent: 0, replied: 0, interested: 0, active: 0, converted: 0 },
        prospects: [],
        messages: [],
        config: { send_ready: false, reply_capture_ready: false },
      }));
    }
    if (pathname === '/api/platform/visit') return route.fulfill(json({ ok: true }));
    return route.fulfill(json({ success: true, items: [], rows: [], data: [] }));
  });
}

test('HQ outreach controls survive React tab rerenders', async ({ page }) => {
  await installApi(page);
  await page.goto('/admin', { waitUntil: 'domcontentloaded' });

  await expect(page.getByText('Connected My HQ', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '7 of 7 platform read sources confirmed', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Refresh HQ', exact: true })).toBeVisible();
  await expect(page.locator('[data-version^="CHURVOX_HQ_SYSTEM"]')).toBeVisible();

  const outreach = page.getByRole('button', { name: /^Outreach/ });
  const importer = page.getByRole('button', { name: 'Import drafts', exact: true });
  await expect(outreach).toBeVisible();
  await expect(importer).toBeVisible();

  for (const tab of ['Launch', 'Users', 'Testers', 'System']) {
    await page.getByRole('button', { name: tab, exact: true }).click();
    await expect(page.getByRole('heading', { name: tab, exact: true })).toBeVisible();
    await expect(outreach).toBeVisible();
    await expect(importer).toBeVisible();
  }

  await outreach.click();
  await expect(page.locator('#churvox-hq-tester-outreach-root')).toHaveClass(/open/);
  await expect(page.locator('#churvox-hq-tester-outreach-root h2')).toContainText(/outreach/i);
  await page.locator('#churvox-hq-tester-outreach-root button[data-hto-close]').click();

  await importer.click();
  await expect(page.getByRole('heading', { name: 'Assistant Draft Import', exact: true })).toBeVisible();
  await page.locator('#churvox-hq-assistant-draft-import-root button[data-adi-close]').click();
  await expect(page.locator('#churvox-hq-assistant-draft-import-root')).not.toHaveClass(/open/);
});
