const { test, expect } = require('@playwright/test');

const API_BASE = (process.env.CHURVOX_API_BASE || process.env.REACT_APP_BACKEND_URL || process.env.VITE_BACKEND_URL || 'https://grassley-backend.onrender.com').replace(/\/$/, '');
const APP_BASE = (process.env.CHURVOX_PUBLIC_BASE || process.env.PLAYWRIGHT_BASE_URL || 'https://www.churvox.com').replace(/\/$/, '');
const OWNER_EMAIL = process.env.CHURVOX_E2E_EMAIL || process.env.CHURVOX_OWNER_EMAIL;
const OWNER_PASS = process.env.CHURVOX_E2E_PASSWORD || process.env.CHURVOX_OWNER_PASSWORD;
const MUTATE = /^(1|true|yes)$/i.test(process.env.CHURVOX_E2E_MUTATE || '');

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

function leakedPrivateField(value) {
  const text = JSON.stringify(value || {}).toLowerCase();
  return [
    'contractor_id', 'business_id', 'worker_id', 'user_id', 'created_by', 'updated_by',
    'stripe_customer_id', 'stripe_subscription_id', 'password_hash', 'access_token', 'refresh_token',
    'private_notes', 'internal_notes', 'public_token', 'portal_token', 'proof_token',
  ].find((key) => text.includes(`"${key}"`));
}

test('public client portal exposes only customer-safe fields and approves completed work once', async ({ page }) => {
  test.setTimeout(120000);
  test.skip(!MUTATE, 'Set CHURVOX_E2E_MUTATE=1 because this creates real client/job test records.');
  test.skip(!OWNER_EMAIL || !OWNER_PASS, 'Set owner E2E credentials for the production mutation test.');

  const request = page.context().request;
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const token = `portal_proof_${stamp}_${Math.random().toString(36).slice(2, 12)}`;
  const clientName = `Portal Proof Client ${stamp}`;
  const jobTitle = `Portal Proof Work ${stamp}`;
  const description = `Public client portal proof completed work ${stamp}`;

  const loginRes = await request.post(api('/auth/login'), { data: { email: OWNER_EMAIL, password: OWNER_PASS } });
  expect(loginRes.status()).toBeLessThan(400);

  const clientRes = await request.post(api('/clients'), {
    data: {
      name: clientName,
      email: `portal-proof-${stamp}@example.com`,
      phone: '0210000000',
      address: '1 Portal Proof Street',
      notes: 'E2E public portal record',
    },
  });
  const clientPayload = await readJson(clientRes);
  expect(clientRes.status()).toBeLessThan(400);
  const clientId = clientPayload.json?.id || clientPayload.json?._id || clientPayload.json?.client?.id || clientPayload.json?.client?._id || clientPayload.json?.data?.id || clientPayload.json?.data?._id || '';

  const jobRes = await request.post(api('/client-portal/proof-job'), {
    data: {
      title: jobTitle,
      job_title: jobTitle,
      description,
      customer_summary: description,
      summary_approved: true,
      client_id: clientId,
      client_name: clientName,
      customer_name: clientName,
      address: '1 Portal Proof Street',
      status: 'completed',
      job_status: 'completed',
      completed_at: new Date().toISOString(),
      token,
      photos: [],
    },
  });
  expect(jobRes.status()).toBeLessThan(400);

  const publicApiRes = await request.get(api(`/public/client-portal/${token}`));
  const publicApiPayload = await readJson(publicApiRes);
  expect(publicApiRes.status()).toBe(200);
  expect(publicApiPayload.json?.portal?.customer_name).toContain(clientName);
  expect(publicApiPayload.json?.portal?.job_title).toContain(jobTitle);
  expect(leakedPrivateField(publicApiPayload.json)).toBeFalsy();

  await page.goto(`${APP_BASE}/client/${token}?cacheReset=1`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(clientName).first()).toBeVisible();
  await expect(page.getByText(jobTitle).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /approve completed work/i }).first()).toBeVisible();

  const approveRes = await request.post(api(`/public/client-portal/${token}/approve-work`), { data: { approved: true } });
  const approvePayload = await readJson(approveRes);
  expect(approveRes.status()).toBeLessThan(400);
  expect(approvePayload.json?.success).toBeTruthy();
  expect(leakedPrivateField(approvePayload.json)).toBeFalsy();

  const secondApproveRes = await request.post(api(`/public/client-portal/${token}/approve-work`), { data: { approved: true } });
  const secondApprovePayload = await readJson(secondApproveRes);
  expect(secondApproveRes.status()).toBe(200);
  expect(secondApprovePayload.json?.success).toBeTruthy();

  const afterApproveRes = await request.get(api(`/public/client-portal/${token}`));
  const afterApprovePayload = await readJson(afterApproveRes);
  const afterStatus = String(afterApprovePayload.json?.portal?.approval_status || '').toLowerCase();
  expect(afterApproveRes.status()).toBe(200);
  expect(afterStatus).toContain('approved');
  expect(leakedPrivateField(afterApprovePayload.json)).toBeFalsy();
});
