const { test, expect } = require('@playwright/test');

const API_BASE = String(process.env.PLAYWRIGHT_API_BASE || process.env.CHURVOX_API_BASE || 'https://grassley-backend.onrender.com').replace(/\/$/, '');
const BASE_EMAIL = process.env.CHURVOX_E2E_EMAIL || process.env.CHURVOX_E2E_SIGNUP_BASE_EMAIL || '';
const PASSWORD = process.env.CHURVOX_E2E_PASSWORD || '';
const RUN_SIGNUP = /^(1|true|yes)$/i.test(process.env.CHURVOX_E2E_SIGNUP || '');

function uniqueEmail() {
  const [name, domain] = String(BASE_EMAIL || '').split('@');
  if (!name || !domain) throw new Error('Set CHURVOX_E2E_EMAIL to a real plus-address capable inbox.');
  return `${name}+verify-${Date.now()}@${domain}`.toLowerCase();
}

async function read(response) {
  const text = await response.text();
  try { return { text, body: text ? JSON.parse(text) : {} }; } catch { return { text, body: {} }; }
}

test('direct registration requires consent and sends verification through Postmark', async ({ request }) => {
  test.setTimeout(120000);
  test.skip(!RUN_SIGNUP, 'Set CHURVOX_E2E_SIGNUP=1 because this creates a real production test account.');
  test.skip(!BASE_EMAIL || !PASSWORD, 'Set CHURVOX_E2E_EMAIL and CHURVOX_E2E_PASSWORD.');

  const email = uniqueEmail();
  const missingConsent = await request.post(`${API_BASE}/api/auth/register`, {
    data: {
      email,
      password: PASSWORD,
      name: 'Missing Consent Probe',
      business_name: 'Missing Consent Probe',
      selected_plan: 'operator',
    },
    timeout: 30000,
  });
  const missingPayload = await read(missingConsent);
  expect(missingConsent.status(), missingPayload.text).toBe(400);
  expect(String(missingPayload.body?.detail || '')).toMatch(/terms of service and privacy policy acceptance is required/i);

  const registered = await request.post(`${API_BASE}/api/auth/register`, {
    data: {
      email,
      password: PASSWORD,
      name: `Verification Proof ${Date.now()}`,
      business_name: `Verification Business ${Date.now()}`,
      selected_plan: 'operator',
      plan_choice: 'operator',
      billing_country: 'NZ',
      terms_accepted: true,
      terms_version: '2026-07-12',
      privacy_accepted: true,
      privacy_version: '2026-07-12',
      consent_recorded_at: new Date().toISOString(),
    },
    timeout: 30000,
  });
  const payload = await read(registered);
  expect(registered.status(), payload.text).toBeLessThan(400);
  expect(payload.body?.email_verification_sent, payload.body?.email_verification_error || 'Verification email was not sent').toBeTruthy();
  expect(payload.body?.email_verification_provider).toBe('postmark');
  expect(payload.body?.email_verification_email_id || '').toBeTruthy();
});
