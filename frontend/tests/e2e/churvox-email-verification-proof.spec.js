const { test, expect } = require('@playwright/test');

const API_BASE = (process.env.PLAYWRIGHT_API_BASE || process.env.CHURVOX_API_BASE || 'https://grassley-backend.onrender.com').replace(/\/$/, '');
const BASE_EMAIL = process.env.CHURVOX_E2E_EMAIL;
const PASSWORD = process.env.CHURVOX_E2E_PASSWORD;
const RUN_SIGNUP = /^(1|true|yes)$/i.test(process.env.CHURVOX_E2E_SIGNUP || '');

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

function plusEmail(email, stamp) {
  const [name, domain] = String(email || '').split('@');
  if (!name || !domain) throw new Error('CHURVOX_E2E_EMAIL must be a real email');
  return `${name}+verifyproof${stamp}@${domain}`.toLowerCase();
}

test('signup sends a real verification email and authenticated resend works', async ({ request }) => {
  test.setTimeout(120000);
  test.skip(!RUN_SIGNUP, 'Set CHURVOX_E2E_SIGNUP=1 because this creates a real production test account and sends email.');
  test.skip(!BASE_EMAIL || !PASSWORD, 'Set CHURVOX_E2E_EMAIL and CHURVOX_E2E_PASSWORD for verification proof.');

  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const email = plusEmail(BASE_EMAIL, stamp);

  const registerRes = await request.post(api('/auth/register'), {
    data: {
      email,
      password: PASSWORD,
      name: `Verify Proof ${stamp}`,
      business_name: `Verify Proof Business ${stamp}`,
      selected_plan: 'operator',
      plan_choice: 'operator',
      billing_country: 'NZ',
      source: 'churvox_email_verification_proof',
    },
    timeout: 30000,
  });

  const registerPayload = await readJson(registerRes);
  expect(registerRes.status(), registerPayload.text).toBeLessThan(400);
  expect(registerPayload.json?.email_verification_sent, registerPayload.json?.email_verification_error || 'Verification email was not sent').toBeTruthy();
  expect(registerPayload.json?.email_verification_provider).toBe('postmark');
  expect(registerPayload.json?.email_verification_email_id || '').toBeTruthy();

  const resendRes = await request.post(api('/auth/resend-verification'), { timeout: 30000 });
  const resendPayload = await readJson(resendRes);
  expect(resendRes.status(), resendPayload.text).toBeLessThan(400);
  expect(resendPayload.json?.email_verification_sent, resendPayload.json?.email_verification_error || 'Verification resend was not sent').toBeTruthy();
  expect(resendPayload.json?.email_verification_provider).toBe('postmark');
  expect(resendPayload.json?.email_verification_email_id || '').toBeTruthy();
});
