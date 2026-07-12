const { test, expect } = require('@playwright/test');

const USER = {
  id: '507f1f77bcf86cd799439011',
  business_id: '507f1f77bcf86cd799439011',
  email: 'owner@example.com',
  role: 'owner',
  email_verified: true,
  has_app_access: true,
  subscription_status: 'active',
  plan: 'command',
};

function json(route, body, status = 200) {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

function pause(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

test('Command shows its saved queue before the background brain scan and audit finish', async ({ page }) => {
  const calls = [];

  await page.addInitScript(({ user }) => {
    localStorage.setItem('token', 'command-fast-load-token');
    localStorage.setItem('churvox_auth_session_snapshot_v1', JSON.stringify({
      at: Date.now(),
      token: 'command-fast-load-token',
      user: { ...user, token: 'command-fast-load-token' },
    }));
  }, { user: USER });

  // Generic safe response first; specific handlers registered later take precedence.
  await page.route('**/api/**', (route) => json(route, { success: true, items: [], data: [], counts: {} }));

  await page.route('**/api/auth/me', (route) => json(route, { success: true, user: USER }));

  await page.route('**/api/command/slips', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    calls.push({ name: 'slips', at: Date.now() });
    await pause(120);
    return json(route, {
      success: true,
      source: 'paid-launch-fast-command-v2',
      slips: [{
        id: 'fast-load-slip-1',
        business_id: USER.business_id,
        source_type: 'jobs',
        action_type: 'owner_review',
        title: 'Fast queue decision',
        found: 'A saved owner decision is already waiting.',
        prepared: 'Prepared for owner review.',
        why: 'The owner must decide.',
        urgency: 'Owner review',
        status: 'open',
        payload: {
          office_role: 'Office Manager',
          prepared_form: { Decision: 'Review this saved item' },
          actions: ['Approve record', 'Snooze', 'Ignore'],
          owner_review_only: true,
          prepared_only: true,
        },
      }],
      safety: 'Owner approval required. Nothing was sent, synced, charged, filed or paid.',
    });
  });

  await page.route('**/api/command/audit', async (route) => {
    calls.push({ name: 'audit', at: Date.now() });
    await pause(4000);
    return json(route, { success: true, audit: [] });
  });

  await page.route('**/api/command/scan', async (route) => {
    calls.push({ name: 'scan', at: Date.now() });
    await pause(4000);
    return json(route, {
      success: true,
      source: 'human-mimic-intelligence-v2',
      guard: 'human-mimic-scan-guard-v2',
      slips: [],
      existing: [],
      created_count: 0,
      existing_count: 1,
      scan_complete: true,
      scan_errors: [],
    });
  });

  const started = Date.now();
  await page.goto('/dashboard#command', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Fast queue decision', { exact: true })).toBeVisible({ timeout: 2500 });
  const visibleAfter = Date.now() - started;
  expect(visibleAfter).toBeLessThan(2500);

  await expect.poll(() => calls.some((call) => call.name === 'scan'), { timeout: 2500 }).toBe(true);
  const slipsIndex = calls.findIndex((call) => call.name === 'slips');
  const scanIndex = calls.findIndex((call) => call.name === 'scan');
  expect(slipsIndex).toBeGreaterThanOrEqual(0);
  expect(scanIndex).toBeGreaterThan(slipsIndex);

  // The delayed audit and scan are still pending, proving neither blocks the visible queue.
  expect(calls.some((call) => call.name === 'audit')).toBe(true);
});
