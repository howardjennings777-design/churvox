const { test, expect } = require('@playwright/test');

const API_BASE = (process.env.CHURVOX_API_BASE || 'https://grassley-backend.onrender.com').replace(/\/$/, '');
const OWNER_EMAIL = process.env.CHURVOX_E2E_EMAIL;
const OWNER_PASS = process.env.CHURVOX_E2E_PASSWORD;

function api(path) {
  return `${API_BASE}/api${path.startsWith('/') ? path : `/${path}`}`;
}

async function readText(res) {
  return await res.text();
}

test('proof helper routes are blocked in production', async ({ request }) => {
  test.setTimeout(120000);

  if (!OWNER_EMAIL || !OWNER_PASS) {
    throw new Error('Set CHURVOX_E2E_EMAIL and CHURVOX_E2E_PASSWORD');
  }

  console.log(`PROOF_HELPER_GUARD_API_BASE=${API_BASE}`);

  const loginRes = await request.post(api('/auth/login'), {
    data: { email: OWNER_EMAIL, password: OWNER_PASS },
  });

  console.log(`PROOF_HELPER_GUARD_LOGIN_STATUS=${loginRes.status()}`);
  expect(loginRes.status()).toBeLessThan(400);

  const proofJobRes = await request.post(api('/client-portal/proof-job'), {
    data: {
      customer_name: 'Blocked Proof Helper',
      address: 'Blocked Proof Address',
      title: 'Blocked Proof Job',
    },
  });
  const proofJobBody = await readText(proofJobRes);

  console.log(`PROOF_HELPER_GUARD_CLIENT_PORTAL_PROOF_JOB_STATUS=${proofJobRes.status()}`);
  console.log(`PROOF_HELPER_GUARD_CLIENT_PORTAL_PROOF_JOB_BODY=${proofJobBody.slice(0, 300)}`);

  expect([403, 404, 405]).toContain(proofJobRes.status());

  const smsTestRes = await request.post(api('/sms/test'), {
    data: {
      phone: '+64210000000',
      message: 'Blocked proof helper test',
    },
  });
  const smsTestBody = await readText(smsTestRes);

  console.log(`PROOF_HELPER_GUARD_SMS_TEST_STATUS=${smsTestRes.status()}`);
  console.log(`PROOF_HELPER_GUARD_SMS_TEST_BODY=${smsTestBody.slice(0, 300)}`);

  expect([403, 404, 405]).toContain(smsTestRes.status());

  console.log('PROOF_HELPER_GUARD_PROOF=passed');
});
