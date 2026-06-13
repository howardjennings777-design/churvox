const { test, expect } = require('@playwright/test');

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'https://www.churvox.com';
const API_BASE = (process.env.CHURVOX_API_BASE || process.env.REACT_APP_BACKEND_URL || process.env.VITE_BACKEND_URL || 'https://grassley-backend.onrender.com').replace(/\/$/, '');
const OWNER_EMAIL = process.env.CHURVOX_E2E_EMAIL || '';
const OWNER_PASS = process.env.CHURVOX_E2E_PASSWORD || '';

const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
const WORKER_NAME = `Worker Invite Proof ${stamp}`;
const WORKER_EMAIL = `worker.invite.proof.${stamp}@example.com`;
const WORKER_PASS = `Churvox${stamp}!`;

const url = (path) => new URL(path, BASE).toString();
const api = (path) => `${API_BASE}/api${path}`;

async function wait(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(900);
}

async function backendLogin(page, email, password, label) {
  const loginRes = await page.request.post(api('/auth/login'), {
    data: { email, password },
  });
  const loginText = await loginRes.text().catch(() => '{}');
  let loginJson = {};
  try { loginJson = JSON.parse(loginText || '{}'); } catch { loginJson = {}; }

  console.log(`${label}_LOGIN_STATUS=` + loginRes.status());
  console.log(`${label}_LOGIN_EMAIL=` + (loginJson.email || ''));

  expect(loginRes.status()).toBeLessThan(400);
  expect(String(loginJson.email || '').toLowerCase()).toBe(String(email || '').toLowerCase());

  return loginJson;
}

test('worker invite setup and worker login proof', async ({ page }) => {
  console.log('WORKER_INVITE_API_BASE=' + API_BASE);
  console.log('WORKER_INVITE_NAME=' + WORKER_NAME);
  console.log('WORKER_INVITE_EMAIL=' + WORKER_EMAIL);

  await backendLogin(page, OWNER_EMAIL, OWNER_PASS, 'OWNER');

  const ownerMe = await page.request.get(api('/auth/me'));
  const ownerMeText = await ownerMe.text().catch(() => '{}');
  const ownerMeJson = JSON.parse(ownerMeText || '{}');
  const originalPlan = ownerMeJson.plan || 'solo';

  console.log('WORKER_INVITE_OWNER_ME_STATUS=' + ownerMe.status());
  console.log('WORKER_INVITE_OWNER_EMAIL=' + (ownerMeJson.email || ''));
  console.log('WORKER_INVITE_ORIGINAL_PLAN=' + originalPlan);

  expect(ownerMe.status()).toBeLessThan(400);
  expect(String(ownerMeJson.email || '').toLowerCase()).toBe(OWNER_EMAIL.toLowerCase());

  const planSave = await page.request.patch(api('/user/plan'), { data: { plan: 'enterprise' } });
  console.log('WORKER_INVITE_PLAN_SAVE_STATUS=' + planSave.status());
  expect(planSave.status()).toBeLessThan(400);

  const createWorker = await page.request.post(api('/team/workers'), {
    data: {
      name: WORKER_NAME,
      email: WORKER_EMAIL,
      phone: '0270000000',
    },
  });
  const createText = await createWorker.text().catch(() => '{}');
  const createJson = JSON.parse(createText || '{}');

  console.log('WORKER_INVITE_CREATE_STATUS=' + createWorker.status());
  console.log('WORKER_INVITE_CREATE_BODY=' + createText);
  console.log('WORKER_INVITE_LINK_RETURNED=' + Boolean(createJson.invite_link));

  expect(createWorker.status()).toBeLessThan(400);
  expect(createJson.invite_link).toBeTruthy();

  const invitePath = new URL(createJson.invite_link).pathname;
  await page.goto(url(invitePath));
  await wait(page);

  await expect(page.getByTestId('invite-setup-page')).toBeVisible({ timeout: 30000 });
  await expect(page.locator('body')).toContainText(WORKER_EMAIL, { timeout: 30000 });

  await page.getByTestId('invite-setup-name-input').fill(WORKER_NAME);
  await page.getByTestId('invite-setup-password-input').fill(WORKER_PASS);
  await page.getByTestId('invite-setup-confirm-password-input').fill(WORKER_PASS);
  await page.getByTestId('invite-setup-submit-button').click();

  await expect(page.getByTestId('invite-success-page')).toBeVisible({ timeout: 30000 });
  console.log('WORKER_INVITE_ACCEPTED=true');

  await page.request.post(api('/auth/logout')).catch(() => null);
  await backendLogin(page, WORKER_EMAIL, WORKER_PASS, 'WORKER');

  const workerMe = await page.request.get(api('/auth/me'));
  const workerMeText = await workerMe.text().catch(() => '{}');
  const workerMeJson = JSON.parse(workerMeText || '{}');

  console.log('WORKER_LOGIN_ME_STATUS=' + workerMe.status());
  console.log('WORKER_LOGIN_EMAIL=' + (workerMeJson.email || ''));
  console.log('WORKER_LOGIN_ROLE=' + (workerMeJson.role || ''));

  expect(workerMe.status()).toBeLessThan(400);
  expect(String(workerMeJson.email || '').toLowerCase()).toBe(WORKER_EMAIL.toLowerCase());
  expect(String(workerMeJson.role || '').toLowerCase()).toBe('worker');

  await page.goto(url('/worker/jobs'));
  await wait(page);

  const workerPageText = await page.locator('body').innerText();
  console.log('WORKER_PAGE_HAS_TODAYS_WORK=' + workerPageText.includes("Today's Work"));
  console.log('WORKER_PAGE_HAS_WAITING_DISPATCH=' + workerPageText.includes('Waiting for dispatch'));

  await expect(page.locator('body')).toContainText("Today's Work", { timeout: 30000 });

  await page.request.post(api('/auth/logout')).catch(() => null);
  await backendLogin(page, OWNER_EMAIL, OWNER_PASS, 'OWNER_RESTORE');
  const restorePlan = await page.request.patch(api('/user/plan'), { data: { plan: originalPlan } });
  console.log('WORKER_INVITE_RESTORE_PLAN_STATUS=' + restorePlan.status());
  expect(restorePlan.status()).toBeLessThan(400);
});
