const { test, expect } = require('@playwright/test');

const API_BASE = (process.env.CHURVOX_API_BASE || 'https://grassley-backend.onrender.com').replace(/\/$/, '');
const OWNER_EMAIL = process.env.CHURVOX_E2E_EMAIL;
const OWNER_PASS = process.env.CHURVOX_E2E_PASSWORD;

function api(path) {
  return `${API_BASE}/api${path.startsWith('/') ? path : `/${path}`}`;
}

async function readJson(res) {
  const text = await res.text();
  try { return text ? JSON.parse(text) : {}; } catch { return {}; }
}

function planFrom(payload) {
  return String(payload?.plan || payload?.data?.plan || payload?.user?.plan || '').toLowerCase();
}

test('stripe return confirms and persists selected plan proof', async ({ request }) => {
  test.setTimeout(120000);

  if (!OWNER_EMAIL || !OWNER_PASS) throw new Error('Set CHURVOX_E2E_EMAIL and CHURVOX_E2E_PASSWORD');

  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);

  console.log(`STRIPE_RETURN_API_BASE=${API_BASE}`);

  const loginRes = await request.post(api('/auth/login'), {
    data: { email: OWNER_EMAIL, password: OWNER_PASS },
  });
  const loginJson = await readJson(loginRes);

  console.log(`STRIPE_RETURN_LOGIN_STATUS=${loginRes.status()}`);
  console.log(`STRIPE_RETURN_LOGIN_EMAIL=${loginJson?.email || loginJson?.user?.email || ''}`);
  expect(loginRes.status()).toBeLessThan(400);

  const beforeRes = await request.get(api('/billing/subscription-status'));
  const beforeJson = await readJson(beforeRes);
  const originalPlan = planFrom(beforeJson) || 'enterprise';

  console.log(`STRIPE_RETURN_STATUS_BEFORE=${beforeRes.status()}`);
  console.log(`STRIPE_RETURN_ORIGINAL_PLAN=${originalPlan}`);

  try {
    const resetRes = await request.patch(api('/user/plan'), { data: { plan: 'solo' } });
    console.log(`STRIPE_RETURN_RESET_TO_SOLO_STATUS=${resetRes.status()}`);
    expect(resetRes.status()).toBeLessThan(400);

    const soloRes = await request.get(api('/billing/subscription-status'));
    const soloJson = await readJson(soloRes);
    console.log(`STRIPE_RETURN_PLAN_AFTER_RESET=${planFrom(soloJson)}`);
    expect(planFrom(soloJson)).toBe('solo');

    const operatorRes = await request.post(api('/billing/confirm-checkout'), {
      data: { session_id: `churvox_proof_operator_${stamp}`, plan: 'operator', country: 'NZ' },
    });
    const operatorJson = await readJson(operatorRes);

    console.log(`STRIPE_RETURN_OPERATOR_CONFIRM_STATUS=${operatorRes.status()}`);
    console.log(`STRIPE_RETURN_OPERATOR_CONFIRM_PLAN=${operatorJson?.plan || ''}`);

    expect(operatorRes.status()).toBeLessThan(400);
    expect(operatorJson?.success).toBeTruthy();
    expect(operatorJson?.plan).toBe('pro');

    const afterOperatorRes = await request.get(api('/billing/subscription-status'));
    const afterOperatorJson = await readJson(afterOperatorRes);

    console.log(`STRIPE_RETURN_PLAN_AFTER_OPERATOR=${planFrom(afterOperatorJson)}`);
    expect(planFrom(afterOperatorJson)).toBe('pro');

    const commandRes = await request.post(api('/billing/confirm-checkout'), {
      data: { session_id: `churvox_proof_command_${stamp}`, plan: 'command', country: 'NZ' },
    });
    const commandJson = await readJson(commandRes);

    console.log(`STRIPE_RETURN_COMMAND_CONFIRM_STATUS=${commandRes.status()}`);
    console.log(`STRIPE_RETURN_COMMAND_CONFIRM_PLAN=${commandJson?.plan || ''}`);

    expect(commandRes.status()).toBeLessThan(400);
    expect(commandJson?.success).toBeTruthy();
    expect(commandJson?.plan).toBe('enterprise');

    const afterCommandRes = await request.get(api('/billing/subscription-status'));
    const afterCommandJson = await readJson(afterCommandRes);

    console.log(`STRIPE_RETURN_PLAN_AFTER_COMMAND=${planFrom(afterCommandJson)}`);
    expect(planFrom(afterCommandJson)).toBe('enterprise');

    console.log('STRIPE_PLAN_RETURN_PROOF=passed');
  } finally {
    const restoreRes = await request.patch(api('/user/plan'), { data: { plan: originalPlan } });
    console.log(`STRIPE_RETURN_RESTORE_PLAN_STATUS=${restoreRes.status()}`);
  }
});
