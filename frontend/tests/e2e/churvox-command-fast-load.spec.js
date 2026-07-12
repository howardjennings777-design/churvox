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
function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

test('Command shows its saved queue before the background brain scan and audit finish', async ({ page }) => {
  const calls = [];
  const auditGate = deferred();
  const scanGate = deferred();
  let slipsFulfilledAt = 0;

  await page.addInitScript(({ user }) => {
    localStorage.setItem('token', 'command-fast-load-token');
    localStorage.setItem('churvox_auth_session_snapshot_v1', JSON.stringify({
      at: Date.now(),
      token: 'command-fast-load-token',
      user: { ...user, token: 'command-fast-load-token' },
    }));
  }, { user: USER });

  page.on('request', (request) => {
    if (request.url().includes('/api/')) {
      try { calls.push({ name: 'observed', method: request.method(), path: new URL(request.url()).pathname, at: Date.now() }); } catch {}
    }
  });

  // One API router avoids overlapping Playwright mocks and makes request order explicit.
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;

    if (path.replace(/\/+$/, '') === '/api/auth/me') {
      calls.push({ name: 'auth-me', at: Date.now() });
      return json(route, { success: true, user: USER });
    }

    if (path.replace(/\/+$/, '') === '/api/command/slips' && request.method() === 'GET') {
      calls.push({ name: 'slips', at: Date.now() });
      await pause(120);
      slipsFulfilledAt = Date.now();
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
    }

    if (path.replace(/\/+$/, '') === '/api/command/audit') {
      calls.push({ name: 'audit', at: Date.now() });
      await auditGate.promise;
      return json(route, { success: true, audit: [] });
    }

    if (path.replace(/\/+$/, '') === '/api/command/scan') {
      calls.push({ name: 'scan', at: Date.now() });
      await scanGate.promise;
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
    }

    return json(route, { success: true, items: [], data: [], counts: {} });
  });

  await page.goto('/dashboard#command', { waitUntil: 'domcontentloaded' });

  const queueDeadline = Date.now() + 12000;
  while (!calls.some((call) => call.name === 'slips') && Date.now() < queueDeadline) await pause(150);
  if (!calls.some((call) => call.name === 'slips')) {
    const body = await page.locator('body').innerText().catch(() => 'body unavailable');
    throw new Error(`Command queue was never requested. URL=${page.url()} API=${JSON.stringify(calls.slice(-40))} BODY=${String(body).slice(0,1600)}`);
  }

  await expect.poll(() => slipsFulfilledAt > 0, { timeout: 3000 }).toBe(true);
  const responseAt = slipsFulfilledAt;

  await expect(page.getByText('Fast queue decision', { exact: true }).first()).toBeVisible({ timeout: 2000 });
  expect(Date.now() - responseAt).toBeLessThan(2000);

  // The scan begins only after the current queue request, and both scan and audit
  // are still deliberately unresolved when the saved decision is already visible.
  await expect.poll(() => calls.some((call) => call.name === 'scan'), { timeout: 3000 }).toBe(true);
  const scanCall = calls.find((call) => call.name === 'scan');
  expect(scanCall).toBeTruthy();
  expect(scanCall.at).toBeGreaterThanOrEqual(slipsFulfilledAt);
  expect(calls.some((call) => call.name === 'audit')).toBe(true);

  auditGate.resolve();
  scanGate.resolve();
  await pause(100);
});
