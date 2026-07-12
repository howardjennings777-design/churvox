const { test, expect } = require('@playwright/test');

const API_BASE = String(process.env.PLAYWRIGHT_API_BASE || process.env.CHURVOX_API_BASE || 'https://grassley-backend.onrender.com').replace(/\/$/, '');

async function read(response) {
  const text = await response.text();
  try { return { text, body: text ? JSON.parse(text) : {} }; } catch { return { text, body: {} }; }
}

test.describe('Paid-launch live infrastructure', () => {
  test('backend health, Command marker and production secrets are ready', async ({ request }) => {
    const health = await request.get(`${API_BASE}/api/healthz`, { timeout: 30000 });
    const healthPayload = await read(health);
    expect(health.status(), `Health failed: ${healthPayload.text}`).toBe(200);
    expect(healthPayload.body?.ok).toBeTruthy();

    const marker = await request.get(`${API_BASE}/api/command/live-smoke-marker`, { timeout: 30000 });
    const markerPayload = await read(marker);
    expect(marker.status(), `Command marker failed: ${markerPayload.text}`).toBe(200);
    expect(markerPayload.body?.success).toBeTruthy();
    expect(String(markerPayload.body?.marker || '')).toMatch(/command-live-smoke/i);

    const security = await request.get(`${API_BASE}/api/security/launch-status`, { timeout: 30000 });
    const securityPayload = await read(security);
    expect(security.status(), `Security launch status failed: ${securityPayload.text}`).toBe(200);
    expect(securityPayload.body?.success).toBeTruthy();
    expect(securityPayload.body?.ready_for_paid_launch, `Critical configuration failures: ${JSON.stringify(securityPayload.body?.critical_failures || [])}`).toBe(true);
    for (const [name, result] of Object.entries(securityPayload.body?.checks || {})) {
      expect(result?.ok, `${name}: ${result?.detail || 'not ready'}`).toBe(true);
    }
  });

  test('final login, verification and recovery stack is mounted live', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/auth/launch-status`, { timeout: 30000 });
    const payload = await read(response);
    expect(response.status(), `Auth launch marker failed: ${payload.text}`).toBe(200);
    expect(payload.body?.success).toBeTruthy();
    expect(payload.body?.ready_for_paid_login, `Auth stack is incomplete: ${JSON.stringify({ checks: payload.body?.checks, routes: payload.body?.routes, versions: payload.body?.versions })}`).toBe(true);
    expect(String(payload.body?.version || '')).toMatch(/auth-launch-status/i);
    for (const [name, mounted] of Object.entries(payload.body?.checks || {})) expect(mounted, `Missing auth patch: ${name}`).toBe(true);
    for (const [name, mounted] of Object.entries(payload.body?.routes || {})) expect(mounted, `Missing auth route: ${name}`).toBe(true);
  });

  test('signed Stripe webhook route is mounted and configured', async ({ request }) => {
    const status = await request.get(`${API_BASE}/api/billing/webhook-status`, { timeout: 30000 });
    const payload = await read(status);
    expect(status.status(), `Webhook status failed: ${payload.text}`).toBe(200);
    expect(payload.body?.success).toBeTruthy();
    expect(payload.body?.configured, 'Set the Stripe endpoint signing secret in Render before launch.').toBe(true);
    expect(String(payload.body?.version || '')).toMatch(/stripe-webhook-paid-launch/i);

    const unsigned = await request.post(`${API_BASE}/api/billing/webhook`, {
      data: { id: 'evt_unsigned_launch_probe', type: 'checkout.session.completed' },
      timeout: 30000,
    });
    const unsignedPayload = await read(unsigned);
    expect(unsigned.status(), `Unsigned webhook returned the wrong status: ${unsignedPayload.text}`).toBe(400);
    expect(String(unsignedPayload.body?.detail || '')).toMatch(/stripe-signature/i);
  });

  test('public invoice holders cannot mark invoices paid', async ({ request }) => {
    const response = await request.post(`${API_BASE}/api/public/invoice/launch-security-probe-token/mark-paid`, {
      data: { paid: true },
      timeout: 30000,
    });
    const payload = await read(response);
    expect(response.status(), `Public mark-paid must be forbidden: ${payload.text}`).toBe(403);
    expect(String(payload.body?.detail || '')).toMatch(/cannot mark an invoice paid|verified payment provider/i);
  });

  test('public customer requests require a verified business target', async ({ request }) => {
    const response = await request.post(`${API_BASE}/api/public/customer-request`, {
      data: {
        customer_name: 'Launch Probe',
        customer_email: 'probe@example.invalid',
        service_needed: 'Non-mutating launch check',
      },
      timeout: 30000,
    });
    const payload = await read(response);
    expect(response.status(), `Untargeted public request should be rejected: ${payload.text}`).toBe(400);
    expect(String(payload.body?.detail || '')).toMatch(/not connected to a valid business/i);
  });

  test('HQ control-access is mounted but rejects unauthenticated calls', async ({ request }) => {
    const response = await request.post(`${API_BASE}/api/admin/owner/control-access`, {
      data: { identifier: 'launch-probe@example.invalid', action: 'revoke' },
      timeout: 30000,
    });
    const payload = await read(response);
    expect([401, 403], `HQ control route should be protected, not missing: ${payload.text}`).toContain(response.status());
  });
});
