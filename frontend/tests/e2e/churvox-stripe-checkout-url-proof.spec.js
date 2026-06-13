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

async function tryCheckout(request, label, candidates) {
  const attempts = [];

  for (const candidate of candidates) {
    const res = await request.post(api(candidate.path), { data: candidate.data });
    const payload = await readJson(res);
    const url = payload.json?.checkout_url || payload.json?.url || '';

    attempts.push({
      path: candidate.path,
      status: res.status(),
      url,
      body: payload.text.slice(0, 400),
    });

    console.log(`${label}_TRY_PATH=${candidate.path}`);
    console.log(`${label}_TRY_STATUS=${res.status()}`);
    console.log(`${label}_TRY_URL=${url}`);

    if (res.status() < 400 && url) {
      return { res, payload, path: candidate.path, url, attempts };
    }
  }

  console.log(`${label}_ATTEMPTS=${JSON.stringify(attempts)}`);
  throw new Error(`${label} no working checkout endpoint`);
}

test('Stripe checkout URL is created for plan upgrade', async ({ request }) => {
  test.setTimeout(120000);

  if (!OWNER_EMAIL || !OWNER_PASS) {
    throw new Error('Set CHURVOX_E2E_EMAIL and CHURVOX_E2E_PASSWORD');
  }

  console.log(`STRIPE_CHECKOUT_URL_API_BASE=${API_BASE}`);

  const loginRes = await request.post(api('/auth/login'), {
    data: { email: OWNER_EMAIL, password: OWNER_PASS },
  });
  const loginPayload = await readJson(loginRes);

  console.log(`STRIPE_CHECKOUT_URL_LOGIN_STATUS=${loginRes.status()}`);
  console.log(`STRIPE_CHECKOUT_URL_LOGIN_EMAIL=${loginPayload.json?.user?.email || loginPayload.json?.email || ''}`);

  expect(loginRes.status()).toBeLessThan(400);

  const beforeRes = await request.get(api('/billing/subscription-status'));
  const beforePayload = await readJson(beforeRes);
  const beforePlan = beforePayload.json?.plan || '';

  console.log(`STRIPE_CHECKOUT_URL_BEFORE_STATUS=${beforeRes.status()}`);
  console.log(`STRIPE_CHECKOUT_URL_BEFORE_PLAN=${beforePlan}`);

  expect(beforeRes.status()).toBeLessThan(400);

  const checkout = await tryCheckout(request, 'STRIPE_CHECKOUT_URL', [
    {
      path: '/billing/create-checkout-session',
      data: { plan: 'pro', country: 'NZ' },
    },
    {
      path: '/stripe/create-checkout-session',
      data: { plan: 'pro', plan_type: 'pro', country: 'NZ' },
    },
    {
      path: '/billing/create-checkout-session',
      data: { plan: 'enterprise', country: 'NZ' },
    },
    {
      path: '/stripe/create-checkout-session',
      data: { plan: 'enterprise', plan_type: 'enterprise', country: 'NZ' },
    },
  ]);

  console.log(`STRIPE_CHECKOUT_URL_STATUS=${checkout.res.status()}`);
  console.log(`STRIPE_CHECKOUT_URL_PATH=${checkout.path}`);
  console.log(`STRIPE_CHECKOUT_URL_VALUE=${checkout.url}`);
  console.log(`STRIPE_CHECKOUT_URL_IS_STRIPE=${checkout.url.includes('stripe.com') || checkout.url.includes('checkout.stripe')}`);

  expect(checkout.res.status()).toBeLessThan(400);
  expect(checkout.url).toBeTruthy();
  expect(checkout.url).toMatch(/stripe|checkout/i);

  const afterRes = await request.get(api('/billing/subscription-status'));
  const afterPayload = await readJson(afterRes);
  const afterPlan = afterPayload.json?.plan || '';

  console.log(`STRIPE_CHECKOUT_URL_AFTER_STATUS=${afterRes.status()}`);
  console.log(`STRIPE_CHECKOUT_URL_AFTER_PLAN=${afterPlan}`);

  expect(afterRes.status()).toBeLessThan(400);
  expect(afterPlan).toBe(beforePlan);

  console.log('STRIPE_CHECKOUT_URL_PROOF=passed');
});
