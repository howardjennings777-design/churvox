const { test, expect } = require('@playwright/test');

const API_BASE = (process.env.CHURVOX_API_BASE || process.env.REACT_APP_BACKEND_URL || process.env.VITE_BACKEND_URL || 'https://grassley-backend.onrender.com').replace(/\/$/, '');
const APP_BASE = (process.env.CHURVOX_PUBLIC_BASE || process.env.PLAYWRIGHT_BASE_URL || 'https://www.churvox.com').replace(/\/$/, '');
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

function planFrom(payload) {
  return String(payload?.plan || payload?.data?.plan || payload?.user?.plan || '').toLowerCase();
}

test('stripe return confirms and persists selected plan proof', async ({ page }) => {
  test.setTimeout(120000);

  if (!OWNER_EMAIL || !OWNER_PASS) {
    throw new Error('Set CHURVOX_E2E_EMAIL and CHURVOX_E2E_PASSWORD');
  }

  const apiRequest = page.context().request;
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const proofSession = `churvox_proof_${stamp}`;

  console.log(`STRIPE_RETURN_API_BASE=${API_BASE}`);
  console.log(`STRIPE_RETURN_APP_BASE=${APP_BASE}`);
  console.log(`STRIPE_RETURN_SESSION=${proofSession}`);

  const loginRes = await apiRequest.post(api('/auth/login'), {
    data: { email: OWNER_EMAIL, password: OWNER_PASS },
  });
  const loginPayload = await readJson(loginRes);

  console.log(`STRIPE_RETURN_LOGIN_STATUS=${loginRes.status()}`);
  console.log(`STRIPE_RETURN_LOGIN_EMAIL=${loginPayload.json?.user?.email || loginPayload.json?.email || ''}`);

  expect(loginRes.status()).toBeLessThan(400);

  const beforeRes = await apiRequest.get(api('/billing/subscription-status'));
  const beforePayload = await readJson(beforeRes);
  const originalPlan = planFrom(beforePayload.json) || 'enterprise';

  console.log(`STRIPE_RETURN_STATUS_BEFORE=${beforeRes.status()}`);
  console.log(`STRIPE_RETURN_ORIGINAL_PLAN=${originalPlan}`);

  try {
    const resetRes = await apiRequest.patch(api('/user/plan'), { data: { plan: 'solo' } });
    console.log(`STRIPE_RETURN_RESET_TO_SOLO_STATUS=${resetRes.status()}`);
    expect(resetRes.status()).toBeLessThan(400);

    const soloRes = await apiRequest.get(api('/billing/subscription-status'));
    const soloPayload = await readJson(soloRes);

    console.log(`STRIPE_RETURN_PLAN_AFTER_RESET=${planFrom(soloPayload.json)}`);
    expect(planFrom(soloPayload.json)).toBe('solo');

    await page.goto(`${APP_BASE}/login`, { waitUntil: 'domcontentloaded' });

    const browserLogin = await page.evaluate(async ({ apiBase, email, password }) => {
      const res = await fetch(`${apiBase}/api/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const text = await res.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch {}
      return { status: res.status, email: data?.email || data?.user?.email || '' };
    }, { apiBase: API_BASE, email: OWNER_EMAIL, password: OWNER_PASS });

    console.log(`STRIPE_RETURN_BROWSER_LOGIN_STATUS=${browserLogin.status}`);
    console.log(`STRIPE_RETURN_BROWSER_LOGIN_EMAIL=${browserLogin.email}`);

    expect(browserLogin.status).toBeLessThan(400);

    const returnUrl = `${APP_BASE}/billing/success?session_id=${encodeURIComponent(proofSession)}&plan=operator&country=NZ`;
    await page.goto(returnUrl, { waitUntil: 'domcontentloaded' });

    await expect(page.getByText(/billing return/i).first()).toBeVisible();
    await expect(page.getByText(/plan/i).first()).toBeVisible();

    console.log(`STRIPE_RETURN_PAGE_URL=${page.url()}`);
    console.log('STRIPE_RETURN_PAGE_RENDERED=true');

    const afterRes = await apiRequest.get(api('/billing/subscription-status'));
    const afterPayload = await readJson(afterRes);
    const afterPlan = planFrom(afterPayload.json);

    console.log(`STRIPE_RETURN_STATUS_AFTER=${afterRes.status()}`);
    console.log(`STRIPE_RETURN_PLAN_AFTER=${afterPlan}`);

    expect(afterRes.status()).toBeLessThan(400);
    expect(afterPlan).toBe('pro');

    const confirmRes = await apiRequest.post(api('/billing/confirm-checkout'), {
      data: {
        session_id: `churvox_proof_direct_${stamp}`,
        plan: 'command',
        country: 'NZ',
      },
    });
    const confirmPayload = await readJson(confirmRes);

    console.log(`STRIPE_RETURN_DIRECT_CONFIRM_STATUS=${confirmRes.status()}`);
    console.log(`STRIPE_RETURN_DIRECT_CONFIRM_PLAN=${confirmPayload.json?.plan || ''}`);

    expect(confirmRes.status()).toBeLessThan(400);
    expect(confirmPayload.json?.success).toBeTruthy();
    expect(String(confirmPayload.json?.plan || '')).toBe('enterprise');

    console.log('STRIPE_PLAN_RETURN_PROOF=passed');
  } finally {
    const restoreRes = await apiRequest.patch(api('/user/plan'), { data: { plan: originalPlan } });
    console.log(`STRIPE_RETURN_RESTORE_PLAN_STATUS=${restoreRes.status()}`);
  }
});
