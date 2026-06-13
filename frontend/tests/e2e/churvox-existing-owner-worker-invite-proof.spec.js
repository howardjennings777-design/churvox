const { test, expect } = require('@playwright/test');

const API_BASE = (process.env.CHURVOX_API_BASE || 'https://grassley-backend.onrender.com').replace(/\/$/, '');
const APP_BASE = (process.env.CHURVOX_APP_BASE || 'https://www.churvox.com').replace(/\/$/, '');
const OWNER_EMAIL = process.env.CHURVOX_E2E_EMAIL;
const OWNER_PASS = process.env.CHURVOX_E2E_PASSWORD;
const WORKER_PASSWORD = process.env.CHURVOX_WORKER_PROOF_PASSWORD || 'WorkerProof123!';

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

function plusEmail(email, tag) {
  const [name, domain] = String(email || '').split('@');
  if (!name || !domain) throw new Error('CHURVOX_E2E_EMAIL must be a real email');
  return `${name}+${tag}@${domain}`;
}

function tokenFromInviteLink(link) {
  const match = String(link || '').match(/\/invite\/setup\/([^/?#]+)/);
  return match ? match[1] : '';
}

test('existing paid owner can invite worker and worker can accept/login', async ({ request, browser }) => {
  test.setTimeout(180000);

  if (!OWNER_EMAIL || !OWNER_PASS) {
    throw new Error('Set CHURVOX_E2E_EMAIL and CHURVOX_E2E_PASSWORD');
  }

  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const workerEmail = plusEmail(OWNER_EMAIL, `existingworker${stamp}`);

  console.log(`EXISTING_WORKER_API_BASE=${API_BASE}`);
  console.log(`EXISTING_WORKER_APP_BASE=${APP_BASE}`);
  console.log(`EXISTING_WORKER_OWNER_EMAIL=${OWNER_EMAIL}`);
  console.log(`EXISTING_WORKER_EMAIL=${workerEmail}`);

  const loginRes = await request.post(api('/auth/login'), {
    data: {
      email: OWNER_EMAIL,
      password: OWNER_PASS,
    },
  });
  const loginPayload = await readJson(loginRes);

  console.log(`EXISTING_WORKER_OWNER_LOGIN_STATUS=${loginRes.status()}`);
  console.log(`EXISTING_WORKER_OWNER_LOGIN_EMAIL=${loginPayload.json?.email || loginPayload.json?.user?.email || ''}`);
  console.log(`EXISTING_WORKER_OWNER_PLAN=${loginPayload.json?.plan || loginPayload.json?.user?.plan || ''}`);

  expect(loginRes.status()).toBeLessThan(400);

  const statusRes = await request.get(api('/billing/subscription-status'));
  const statusPayload = await readJson(statusRes);
  const plan = statusPayload.json?.plan || '';

  console.log(`EXISTING_WORKER_OWNER_PLAN_STATUS=${statusRes.status()}`);
  console.log(`EXISTING_WORKER_OWNER_PLAN_VALUE=${plan}`);

  expect(statusRes.status()).toBeLessThan(400);
  expect(['team', 'pro', 'enterprise']).toContain(plan);

  const workerCreateRes = await request.post(api('/team/workers'), {
    data: {
      name: `Existing Worker ${stamp}`,
      email: workerEmail,
      phone: '+64210000002',
      role_title: 'Worker',
      hourly_rate: 30,
    },
  });
  const workerCreatePayload = await readJson(workerCreateRes);

  console.log(`EXISTING_WORKER_INVITE_STATUS=${workerCreateRes.status()}`);
  console.log(`EXISTING_WORKER_INVITE_BODY=${workerCreatePayload.text.slice(0, 500)}`);

  expect(workerCreateRes.status()).toBeLessThan(400);

  const workerId =
    workerCreatePayload.json?.id ||
    workerCreatePayload.json?.worker_id ||
    workerCreatePayload.json?.worker?.id ||
    workerCreatePayload.json?.worker?._id ||
    '';

  const inviteLink =
    workerCreatePayload.json?.invite_link ||
    workerCreatePayload.json?.worker?.invite_link ||
    '';

  const inviteToken = tokenFromInviteLink(inviteLink);

  console.log(`EXISTING_WORKER_ID=${workerId}`);
  console.log(`EXISTING_WORKER_INVITE_LINK_RETURNED=${Boolean(inviteLink)}`);
  console.log(`EXISTING_WORKER_INVITE_TOKEN=${inviteToken}`);

  expect(workerId).toBeTruthy();
  expect(inviteToken).toBeTruthy();

  const verifyInviteRes = await request.get(api(`/invite/verify/${inviteToken}`));
  const verifyInvitePayload = await readJson(verifyInviteRes);

  console.log(`EXISTING_WORKER_INVITE_VERIFY_STATUS=${verifyInviteRes.status()}`);
  console.log(`EXISTING_WORKER_INVITE_VERIFY_BODY=${verifyInvitePayload.text.slice(0, 500)}`);

  expect(verifyInviteRes.status()).toBeLessThan(400);

  const acceptRes = await request.post(api('/invite/accept'), {
    data: {
      token: inviteToken,
      password: WORKER_PASSWORD,
      name: `Existing Worker ${stamp}`,
    },
  });
  const acceptPayload = await readJson(acceptRes);

  console.log(`EXISTING_WORKER_INVITE_ACCEPT_STATUS=${acceptRes.status()}`);
  console.log(`EXISTING_WORKER_INVITE_ACCEPT_BODY=${acceptPayload.text.slice(0, 500)}`);

  expect(acceptRes.status()).toBeLessThan(400);

  const workerContext = await browser.newContext({ baseURL: APP_BASE });
  const workerApi = workerContext.request;

  const workerLoginRes = await workerApi.post(api('/auth/login'), {
    data: {
      email: workerEmail,
      password: WORKER_PASSWORD,
    },
  });
  const workerLoginPayload = await readJson(workerLoginRes);

  console.log(`EXISTING_WORKER_LOGIN_STATUS=${workerLoginRes.status()}`);
  console.log(`EXISTING_WORKER_LOGIN_EMAIL=${workerLoginPayload.json?.email || workerLoginPayload.json?.user?.email || ''}`);
  console.log(`EXISTING_WORKER_LOGIN_ROLE=${workerLoginPayload.json?.role || workerLoginPayload.json?.user?.role || ''}`);

  expect(workerLoginRes.status()).toBeLessThan(400);

  const workerMeRes = await workerApi.get(api('/auth/me'));
  const workerMePayload = await readJson(workerMeRes);

  console.log(`EXISTING_WORKER_ME_STATUS=${workerMeRes.status()}`);
  console.log(`EXISTING_WORKER_ME_ROLE=${workerMePayload.json?.role || ''}`);
  console.log(`EXISTING_WORKER_ME_BUSINESS_ID=${workerMePayload.json?.business_id || ''}`);

  expect(workerMeRes.status()).toBeLessThan(400);
  expect(workerMePayload.json?.role).toBe('worker');

  await workerContext.close();

  const teamRes = await request.get(api('/team/workers'));
  const teamPayload = await readJson(teamRes);
  const workers = Array.isArray(teamPayload.json) ? teamPayload.json : [];
  const foundWorker = workers.find((w) => String(w.email || '').toLowerCase() === workerEmail.toLowerCase());

  console.log(`EXISTING_WORKER_TEAM_LIST_STATUS=${teamRes.status()}`);
  console.log(`EXISTING_WORKER_FOUND_IN_TEAM=${Boolean(foundWorker)}`);
  console.log(`EXISTING_WORKER_TEAM_STATUS=${foundWorker?.status || ''}`);

  expect(teamRes.status()).toBeLessThan(400);
  expect(foundWorker).toBeTruthy();
  expect(String(foundWorker.status || '').toLowerCase()).toMatch(/active|accepted|setup|complete/);

  console.log('EXISTING_OWNER_WORKER_INVITE_PROOF=passed');
});
