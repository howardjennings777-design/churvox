const { test, expect } = require('@playwright/test');

const API_BASE = (process.env.CHURVOX_API_BASE || process.env.REACT_APP_BACKEND_URL || process.env.VITE_BACKEND_URL || 'https://grassley-backend.onrender.com').replace(/\/$/, '');
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

async function postFirstWorking(request, label, candidates) {
  const attempts = [];

  for (const candidate of candidates) {
    const res = await request.post(api(candidate.path), { data: candidate.data });
    const payload = await readJson(res);

    attempts.push({
      path: candidate.path,
      status: res.status(),
      body: payload.text.slice(0, 300),
    });

    console.log(`${label}_TRY_PATH=${candidate.path}`);
    console.log(`${label}_TRY_STATUS=${res.status()}`);

    if (res.status() < 400) {
      return { path: candidate.path, res, payload, attempts };
    }
  }

  console.log(`${label}_ATTEMPTS=${JSON.stringify(attempts)}`);
  throw new Error(`${label} no working endpoint found`);
}

test('forgot password and worker invite email triggers work', async ({ request }) => {
  test.setTimeout(120000);

  if (!OWNER_EMAIL || !OWNER_PASS) {
    throw new Error('Set CHURVOX_E2E_EMAIL and CHURVOX_E2E_PASSWORD');
  }

  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const workerEmail = `worker-email-proof-${stamp}@example.com`;
  const workerName = `Email Proof Worker ${stamp}`;

  console.log(`EMAIL_TRIGGER_API_BASE=${API_BASE}`);

  const forgot = await postFirstWorking(request, 'FORGOT_PASSWORD_EMAIL', [
    { path: '/auth/forgot-password', data: { email: OWNER_EMAIL } },
    { path: '/forgot-password', data: { email: OWNER_EMAIL } },
    { path: '/auth/password/forgot', data: { email: OWNER_EMAIL } },
  ]);

  console.log(`FORGOT_PASSWORD_EMAIL_STATUS=${forgot.res.status()}`);
  console.log(`FORGOT_PASSWORD_EMAIL_PATH=${forgot.path}`);
  console.log(`FORGOT_PASSWORD_EMAIL_BODY=${forgot.payload.text.slice(0, 300)}`);

  expect(forgot.res.status()).toBeLessThan(400);

  const loginRes = await request.post(api('/auth/login'), {
    data: { email: OWNER_EMAIL, password: OWNER_PASS },
  });
  const loginPayload = await readJson(loginRes);

  console.log(`EMAIL_TRIGGER_LOGIN_STATUS=${loginRes.status()}`);
  console.log(`EMAIL_TRIGGER_LOGIN_EMAIL=${loginPayload.json?.user?.email || loginPayload.json?.email || ''}`);

  expect(loginRes.status()).toBeLessThan(400);

  const invite = await postFirstWorking(request, 'WORKER_INVITE_EMAIL', [
    {
      path: '/workers/invite',
      data: {
        name: workerName,
        full_name: workerName,
        email: workerEmail,
        role: 'worker',
        hourly_rate: 30,
      },
    },
    {
      path: '/team/invite',
      data: {
        name: workerName,
        full_name: workerName,
        email: workerEmail,
        role: 'worker',
        hourly_rate: 30,
      },
    },
    {
      path: '/workers',
      data: {
        name: workerName,
        full_name: workerName,
        email: workerEmail,
        role: 'worker',
        hourly_rate: 30,
        send_invite: true,
      },
    },
    {
      path: '/team',
      data: {
        name: workerName,
        full_name: workerName,
        email: workerEmail,
        role: 'worker',
        hourly_rate: 30,
        send_invite: true,
      },
    },
  ]);

  console.log(`WORKER_INVITE_EMAIL_STATUS=${invite.res.status()}`);
  console.log(`WORKER_INVITE_EMAIL_PATH=${invite.path}`);
  console.log(`WORKER_INVITE_EMAIL_ADDRESS=${workerEmail}`);
  console.log(`WORKER_INVITE_EMAIL_BODY=${invite.payload.text.slice(0, 500)}`);

  expect(invite.res.status()).toBeLessThan(400);

  console.log('EMAIL_TRIGGER_PROOF=passed');
});
