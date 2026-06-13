const { test, expect } = require('@playwright/test');

const API_BASE = (process.env.CHURVOX_API_BASE || 'https://grassley-backend.onrender.com').replace(/\/$/, '');
const OWNER_EMAIL = process.env.CHURVOX_E2E_EMAIL;
const OWNER_PASS = process.env.CHURVOX_E2E_PASSWORD;

function api(path) {
  return `${API_BASE}/api${path.startsWith('/') ? path : `/${path}`}`;
}

async function readJson(res) {
  const text = await res.text();
  try {
    return { text, json: text ? JSON.parse(text) : {} };
  } catch {
    return { text, json: {} };
  }
}

test('fake checkout cannot change plan', async ({ request }) => {
  test.setTimeout(120000);

  if (!OWNER_EMAIL || !OWNER_PASS) {
    throw new Error('Set CHURVOX_E2E_EMAIL and CHURVOX_E2E_PASSWORD');
  }

  console.log(`LOCK_FAKE_PLAN_API_BASE=${API_BASE}`);

  const loginRes = await request.post(api('/auth/login'), {
    data: { email: OWNER_EMAIL, password: OWNER_PASS },
  });
  const loginPayload = await readJson(loginRes);

  console.log(`LOCK_FAKE_PLAN_LOGIN_STATUS=${loginRes.status()}`);
  console.log(`LOCK_FAKE_PLAN_LOGIN_EMAIL=${loginPayload.json?.user?.email || loginPayload.json?.email || ''}`);

  expect(loginRes.status()).toBeLessThan(400);

  const beforeRes = await request.get(api('/billing/subscription-status'));
  const beforePayload = await readJson(beforeRes);
  const beforePlan = beforePayload.json?.plan || '';

  console.log(`LOCK_FAKE_PLAN_BEFORE_STATUS=${beforeRes.status()}`);
  console.log(`LOCK_FAKE_PLAN_BEFORE_PLAN=${beforePlan}`);

  expect(beforeRes.status()).toBeLessThan(400);
  expect(beforePlan).toBeTruthy();

  const fakeRes = await request.post(api('/billing/confirm-checkout'), {
    data: {
      session_id: `churvox_proof_fake_${Date.now()}`,
      plan: beforePlan === 'enterprise' ? 'solo' : 'enterprise',
      country: 'NZ',
    },
  });
  const fakePayload = await readJson(fakeRes);

  console.log(`LOCK_FAKE_PLAN_CONFIRM_STATUS=${fakeRes.status()}`);
  console.log(`LOCK_FAKE_PLAN_CONFIRM_BODY=${fakePayload.text.slice(0, 500)}`);

  expect(fakeRes.status()).toBeGreaterThanOrEqual(400);

  const afterRes = await request.get(api('/billing/subscription-status'));
  const afterPayload = await readJson(afterRes);
  const afterPlan = afterPayload.json?.plan || '';

  console.log(`LOCK_FAKE_PLAN_AFTER_STATUS=${afterRes.status()}`);
  console.log(`LOCK_FAKE_PLAN_AFTER_PLAN=${afterPlan}`);

  expect(afterRes.status()).toBeLessThan(400);
  expect(afterPlan).toBe(beforePlan);

  const directPlanRoutes = [
    ['/user/plan', { plan: 'enterprise' }],
    ['/plans/save', { plan: 'enterprise' }],
    ['/billing/plan', { plan: 'enterprise' }],
  ];

  for (const [path, body] of directPlanRoutes) {
    const res = await request.post(api(path), { data: body });
    const payload = await readJson(res);
    console.log(`LOCK_FAKE_PLAN_DIRECT_${path.replace(/[^a-zA-Z0-9]/g, '_')}_STATUS=${res.status()}`);
    console.log(`LOCK_FAKE_PLAN_DIRECT_${path.replace(/[^a-zA-Z0-9]/g, '_')}_BODY=${payload.text.slice(0, 180)}`);
    expect(res.status()).toBeGreaterThanOrEqual(400);
  }

  const finalRes = await request.get(api('/billing/subscription-status'));
  const finalPayload = await readJson(finalRes);
  const finalPlan = finalPayload.json?.plan || '';

  console.log(`LOCK_FAKE_PLAN_FINAL_STATUS=${finalRes.status()}`);
  console.log(`LOCK_FAKE_PLAN_FINAL_PLAN=${finalPlan}`);

  expect(finalPlan).toBe(beforePlan);

  console.log('LOCK_FAKE_PLAN_PROOF=passed');
});
