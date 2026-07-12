const { test, expect } = require('@playwright/test');

const API_BASE = String(process.env.PLAYWRIGHT_API_BASE || process.env.CHURVOX_API_BASE || 'https://grassley-backend.onrender.com').replace(/\/$/, '');
const EMAIL = process.env.CHURVOX_OWNER_EMAIL || process.env.CHURVOX_E2E_EMAIL || '';
const PASSWORD = process.env.CHURVOX_OWNER_PASSWORD || process.env.CHURVOX_E2E_PASSWORD || '';

const BASE_LIMITS = {
  start: { clients: 250, jobs_per_month: 50, ai_actions: 25, active_team_members: 1 },
  crew: { clients: 1000, jobs_per_month: 150, ai_actions: 100, active_team_members: 5 },
  operator: { clients: 3000, jobs_per_month: 500, ai_actions: 500, active_team_members: 15 },
  command: { clients: 10000, jobs_per_month: 1500, ai_actions: 2000, active_team_members: 50 },
};

async function read(response) {
  const text = await response.text();
  try { return { text, body: text ? JSON.parse(text) : {} }; } catch { return { text, body: {} }; }
}

test('live plan usage uses locked limits and real non-fake counters', async ({ request }) => {
  test.skip(!EMAIL || !PASSWORD, 'Set owner credentials to verify live plan usage.');

  const login = await request.post(`${API_BASE}/api/auth/login`, {
    data: { email: EMAIL, password: PASSWORD },
    timeout: 30000,
  });
  const loginPayload = await read(login);
  expect(login.status(), loginPayload.text).toBeLessThan(400);
  const token = loginPayload.body?.token || loginPayload.body?.access_token || '';

  const usage = await request.get(`${API_BASE}/api/plan/usage`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    timeout: 30000,
  });
  const payload = await read(usage);
  expect(usage.status(), payload.text).toBe(200);
  expect(payload.body?.success).toBeTruthy();
  expect(payload.body?.limit_source).toBe('locked_paid_launch_limits_2026_07_12');
  expect(payload.body?.usage_verified, JSON.stringify(payload.body?.usage_errors || {})).toBe(true);

  const plan = String(payload.body?.plan || '').toLowerCase();
  expect(Object.keys(BASE_LIMITS)).toContain(plan);
  const expected = { ...BASE_LIMITS[plan] };
  const packs = plan === 'command' ? Number(payload.body?.addons?.command_growth_pack || 0) : 0;
  if (packs > 0) {
    expected.jobs_per_month += packs * 1500;
    expected.ai_actions += packs * 1000;
    expected.active_team_members += packs * 50;
  }
  expect(payload.body?.limits).toEqual(expected);

  for (const key of ['clients', 'jobs_this_month', 'ai_actions', 'active_team_members']) {
    expect(Number.isInteger(payload.body?.used?.[key]), `${key} must be a real integer, not a placeholder`).toBe(true);
    expect(payload.body.used[key]).toBeGreaterThanOrEqual(0);
  }
});
