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

test('public client portal opens and approves completed work', async ({ page }) => {
  test.setTimeout(120000);

  if (!OWNER_EMAIL || !OWNER_PASS) {
    throw new Error('Set CHURVOX_E2E_EMAIL and CHURVOX_E2E_PASSWORD');
  }

  const request = page.context().request;
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const token = `portal_proof_${stamp}`;
  const clientName = `Portal Proof Client ${stamp}`;
  const jobTitle = `Portal Proof Work ${stamp}`;
  const description = `Public client portal proof completed work ${stamp}`;

  console.log(`CLIENT_PORTAL_API_BASE=${API_BASE}`);
  console.log(`CLIENT_PORTAL_APP_BASE=${APP_BASE}`);
  console.log(`CLIENT_PORTAL_TOKEN=${token}`);

  const loginRes = await request.post(api('/auth/login'), {
    data: { email: OWNER_EMAIL, password: OWNER_PASS },
  });
  const loginPayload = await readJson(loginRes);

  console.log(`CLIENT_PORTAL_LOGIN_STATUS=${loginRes.status()}`);
  console.log(`CLIENT_PORTAL_LOGIN_EMAIL=${loginPayload.json?.user?.email || loginPayload.json?.email || ''}`);

  expect(loginRes.status()).toBeLessThan(400);

  const clientRes = await request.post(api('/clients'), {
    data: {
      name: clientName,
      email: `portal-proof-${stamp}@example.com`,
      phone: '0210000000',
      address: '1 Portal Proof Street',
      notes: 'Public client portal proof client',
    },
  });
  const clientPayload = await readJson(clientRes);

  console.log(`CLIENT_PORTAL_CREATE_CLIENT_STATUS=${clientRes.status()}`);

  expect(clientRes.status()).toBeLessThan(400);

  const clientId = clientPayload.json?.id || clientPayload.json?._id || clientPayload.json?.client?.id || clientPayload.json?.client?._id || clientPayload.json?.data?.id || clientPayload.json?.data?._id || '';

  const jobRes = await request.post(api('/jobs'), {
    data: {
      title: jobTitle,
      description,
      notes: description,
      client_id: clientId,
      client_name: clientName,
      customer_name: clientName,
      address: '1 Portal Proof Street',
      status: 'completed',
      job_status: 'completed',
      workflow_status: 'completed',
      completed: true,
      completed_at: new Date().toISOString(),
      client_portal_token: token,
      public_portal_token: token,
      portal_token: token,
      photos: [],
    },
  });
  const jobPayload = await readJson(jobRes);

  console.log(`CLIENT_PORTAL_CREATE_JOB_STATUS=${jobRes.status()}`);

  expect(jobRes.status()).toBeLessThan(400);

  const jobId = jobPayload.json?.id || jobPayload.json?._id || jobPayload.json?.job?.id || jobPayload.json?.job?._id || jobPayload.json?.data?.id || jobPayload.json?.data?._id || '';

  console.log(`CLIENT_PORTAL_JOB_ID=${jobId}`);

  const publicApiRes = await request.get(api(`/public/client-portal/${token}`));
  const publicApiPayload = await readJson(publicApiRes);

  console.log(`CLIENT_PORTAL_API_GET_STATUS=${publicApiRes.status()}`);
  console.log(`CLIENT_PORTAL_API_CUSTOMER=${publicApiPayload.json?.portal?.customer_name || ''}`);
  console.log(`CLIENT_PORTAL_API_TITLE=${publicApiPayload.json?.portal?.job_title || ''}`);

  expect(publicApiRes.status()).toBe(200);
  expect(publicApiPayload.json?.portal?.customer_name).toContain(clientName);
  expect(publicApiPayload.json?.portal?.job_title).toContain(jobTitle);

  const publicUrl = `${APP_BASE}/client-portal/${token}?cacheReset=1`;
  await page.goto(publicUrl, { waitUntil: 'domcontentloaded' });

  await expect(page.getByText(clientName).first()).toBeVisible();
  await expect(page.getByText(jobTitle).first()).toBeVisible();
  await expect(page.getByText(/approve completed work/i).first()).toBeVisible();

  console.log(`CLIENT_PORTAL_PAGE_URL=${page.url()}`);
  console.log('CLIENT_PORTAL_PAGE_RENDERED=true');

  const approveRes = await request.post(api(`/public/client-portal/${token}/approve-work`));
  const approvePayload = await readJson(approveRes);

  console.log(`CLIENT_PORTAL_APPROVE_STATUS=${approveRes.status()}`);
  console.log(`CLIENT_PORTAL_APPROVE_BODY=${approvePayload.text}`);

  expect(approveRes.status()).toBeLessThan(400);
  expect(approvePayload.json?.success).toBeTruthy();

  const afterApproveRes = await request.get(api(`/public/client-portal/${token}`));
  const afterApprovePayload = await readJson(afterApproveRes);
  const afterStatus = String(afterApprovePayload.json?.portal?.approval_status || afterApprovePayload.json?.portal?.status || '').toLowerCase();

  console.log(`CLIENT_PORTAL_AFTER_APPROVE_STATUS=${afterStatus}`);

  expect(afterApproveRes.status()).toBe(200);
  expect(afterStatus).toContain('approved');

  console.log('PUBLIC_CLIENT_PORTAL_PROOF=passed');
});
