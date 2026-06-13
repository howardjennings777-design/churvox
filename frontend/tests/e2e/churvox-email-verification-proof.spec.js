const { test, expect } = require('@playwright/test');

const API_BASE = (process.env.CHURVOX_API_BASE || 'https://grassley-backend.onrender.com').replace(/\/$/, '');
const BASE_EMAIL = process.env.CHURVOX_E2E_EMAIL;
const PASSWORD = process.env.CHURVOX_E2E_PASSWORD || 'VerifyProof123!';

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
  return `${name}+verifyproof${stamp}@${domain}`;
}

test('signup sends verification email and resend works', async ({ request }) => {
  test.setTimeout(120000);

  if (!BASE_EMAIL) throw new Error('Set CHURVOX_E2E_EMAIL');

  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const email = plusEmail(BASE_EMAIL, stamp);

  console.log(`EMAIL_VERIFICATION_API_BASE=${API_BASE}`);
  console.log(`EMAIL_VERIFICATION_SIGNUP_EMAIL=${email}`);

  const registerRes = await request.post(api('/auth/register'), {
    data: {
      email,
      password: PASSWORD,
      name: `Verify Proof ${stamp}`,
      business_name: `Verify Proof Business ${stamp}`,
    },
  });

  const registerPayload = await readJson(registerRes);

  console.log(`EMAIL_VERIFICATION_REGISTER_STATUS=${registerRes.status()}`);
  console.log(`EMAIL_VERIFICATION_SENT=${registerPayload.json?.email_verification_sent}`);
  console.log(`EMAIL_VERIFICATION_PROVIDER=${registerPayload.json?.email_verification_provider || ''}`);
  console.log(`EMAIL_VERIFICATION_EMAIL_ID=${registerPayload.json?.email_verification_email_id || ''}`);
  console.log(`EMAIL_VERIFICATION_ERROR=${registerPayload.json?.email_verification_error || ''}`);

  expect(registerRes.status()).toBeLessThan(400);
  expect(registerPayload.json?.email_verification_sent).toBeTruthy();
  expect(registerPayload.json?.email_verification_provider).toBe('postmark');
  expect(registerPayload.json?.email_verification_email_id || '').toBeTruthy();

  const resendRes = await request.post(api('/auth/resend-verification'));
  const resendPayload = await readJson(resendRes);

  console.log(`EMAIL_VERIFICATION_RESEND_STATUS=${resendRes.status()}`);
  console.log(`EMAIL_VERIFICATION_RESEND_SENT=${resendPayload.json?.email_verification_sent}`);
  console.log(`EMAIL_VERIFICATION_RESEND_PROVIDER=${resendPayload.json?.email_verification_provider || ''}`);
  console.log(`EMAIL_VERIFICATION_RESEND_EMAIL_ID=${resendPayload.json?.email_verification_email_id || ''}`);
  console.log(`EMAIL_VERIFICATION_RESEND_ERROR=${resendPayload.json?.email_verification_error || ''}`);

  expect(resendRes.status()).toBeLessThan(400);
  expect(resendPayload.json?.email_verification_sent).toBeTruthy();
  expect(resendPayload.json?.email_verification_provider).toBe('postmark');
  expect(resendPayload.json?.email_verification_email_id || '').toBeTruthy();

  console.log('EMAIL_VERIFICATION_PROOF=passed');
});
