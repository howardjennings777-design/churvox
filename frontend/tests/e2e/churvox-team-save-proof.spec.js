const { test, expect } = require('@playwright/test');

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'https://www.churvox.com';
const API_BASE = (process.env.CHURVOX_API_BASE || process.env.REACT_APP_BACKEND_URL || process.env.VITE_BACKEND_URL || 'https://grassley-backend.onrender.com').replace(/\/$/, '');
const EMAIL = process.env.CHURVOX_E2E_EMAIL || '';
const PASS = process.env.CHURVOX_E2E_PASSWORD || '';
const url = (path) => new URL(path, BASE).toString();
const api = (path) => `${API_BASE}/api${path}`;
const stamp = () => new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);

async function wait(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(900);
}

test('team worker save proof', async ({ page }) => {
  const teamName = `PW Team Proof ${stamp()}`;
  const teamEmail = `pw.team.proof.${stamp()}@example.com`;

  await page.goto(url('/login'));
  await wait(page);

  await page.getByLabel(/email/i).fill(EMAIL);
  await page.getByLabel(/password/i).fill(PASS);
  await page.getByRole('button', { name: /sign in|log in|login/i }).click();
  await page.waitForURL(/dashboard|plans|setup|guide|#/i, { timeout: 30000 }).catch(() => null);
  await wait(page);

  const create = await page.request.post(api('/team/workers'), {
    data: {
      name: teamName,
      email: teamEmail,
      phone: '0274109999',
    },
  });

  const createText = await create.text().catch(() => '');

  console.log('TEAM_API_BASE=' + API_BASE);
  console.log('TEAM_SAVE_NAME=' + teamName);
  console.log('TEAM_SAVE_EMAIL=' + teamEmail);
  console.log('TEAM_SAVE_STATUS=' + create.status());
  console.log('TEAM_SAVE_BODY=' + createText.slice(0, 1500));

  expect(create.status()).toBeLessThan(400);

  const list = await page.request.get(api('/team/workers'));
  const listText = await list.text().catch(() => '');

  console.log('TEAM_LIST_STATUS=' + list.status());
  console.log('TEAM_LIST_BODY=' + listText.slice(0, 2000));
  console.log('TEAM_FOUND_IN_API_LIST=' + listText.includes(teamName));

  expect(list.status()).toBeLessThan(400);
  expect(listText).toContain(teamName);

  await page.goto(url('/dashboard#team'));
  await wait(page);

  const pageText = await page.locator('body').innerText();
  console.log('TEAM_FOUND_ON_PAGE=' + pageText.includes(teamName));

  await expect(page.locator('body')).toContainText(teamName, { timeout: 30000 });
});
