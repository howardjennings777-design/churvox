const { test, expect } = require('@playwright/test');

const API_BASE = (process.env.CHURVOX_API_BASE || 'https://grassley-backend.onrender.com').replace(/\/$/, '');
const BASE_EMAIL = process.env.CHURVOX_E2E_EMAIL;
const OWNER_PASSWORD = process.env.CHURVOX_E2E_PASSWORD || 'FreshOwnerWorkerProof123!';

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

test('fresh Start owner is blocked from team invite until upgrade', async ({ request }) => {
  test.setTimeout(120000);

  if (!BASE_EMAIL) throw new Error('Set CHURVOX_E2E_EMAIL');

  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const ownerEmail = plusEmail(BASE_EMAIL, `freshworkerowner${stamp}`);
  const workerEmail = plusEmail(BASE_EMAIL, `freshworker${stamp}`);

  console.log(`FRESH_WORKER_BLOCK_API_BASE=${API_BASE}`);
  console.log(`FRESH_WORKER_BLOCK_OWNER_EMAIL=${ownerEmail}`);
  console.log(`FRESH_WORKER_BLOCK_WORKER_EMAIL=${workerEmail}`);

  const registerRes = await request.post(api('/auth/register'), {
    data: {
      email: ownerEmail,
      password: OWNER_PASSWORD,
      name: `Fresh Worker Owner ${stamp}`,
      business_name: `Fresh Worker Business ${stamp}`,
    },
  });
  const registerPayload = await readJson(registerRes);

  console.log(`FRESH_WORKER_BLOCK_REGISTER_STATUS=${registerRes.status()}`);
  console.log(`FRESH_WORKER_BLOCK_PLAN=${registerPayload.json?.plan || ''}`);
  console.log(`FRESH_WORKER_BLOCK_VERIFY_EMAIL_SENT=${registerPayload.json?.email_verification_sent}`);

  expect(registerRes.status()).toBeLessThan(400);
  expect(registerPayload.json?.plan).toBe('solo');

  const workerCreateRes = await request.post(api('/team/workers'), {
    data: {
      name: `Fresh Worker ${stamp}`,
      email: workerEmail,
      phone: '+64210000002',
      role_title: 'Worker',
      hourly_rate: 30,
    },
  });
  const workerCreatePayload = await readJson(workerCreateRes);

  console.log(`FRESH_WORKER_BLOCK_INVITE_STATUS=${workerCreateRes.status()}`);
  console.log(`FRESH_WORKER_BLOCK_INVITE_BODY=${workerCreatePayload.text.slice(0, 500)}`);

  expect(workerCreateRes.status()).toBe(403);
  expect(workerCreatePayload.text).toMatch(/team management|upgrade/i);

  console.log('FRESH_START_TEAM_BLOCK_PROOF=passed');
});
