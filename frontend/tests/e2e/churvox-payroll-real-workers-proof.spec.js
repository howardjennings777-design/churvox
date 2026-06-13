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

test('payroll shows real workers proof', async ({ page }) => {
  const workerName = `PW Payroll Proof ${stamp()}`;
  const workerEmail = `pw.payroll.proof.${stamp()}@example.com`;

  await page.goto(url('/login'));
  await wait(page);

  await page.getByLabel(/email/i).fill(EMAIL);
  await page.getByLabel(/password/i).fill(PASS);
  await page.getByRole('button', { name: /sign in|log in|login/i }).click();
  await page.waitForURL(/dashboard|plans|setup|guide|#/i, { timeout: 30000 }).catch(() => null);
  await wait(page);

  const create = await page.request.post(api('/team/workers'), {
    data: {
      name: workerName,
      email: workerEmail,
      phone: '0274108888',
    },
  });

  const createText = await create.text().catch(() => '');

  console.log('PAYROLL_API_BASE=' + API_BASE);
  console.log('PAYROLL_WORKER_NAME=' + workerName);
  console.log('PAYROLL_WORKER_EMAIL=' + workerEmail);
  console.log('PAYROLL_WORKER_SAVE_STATUS=' + create.status());
  console.log('PAYROLL_WORKER_SAVE_BODY=' + createText.slice(0, 1000));

  expect(create.status()).toBeLessThan(400);

  await page.goto(url('/dashboard#payroll'));
  await wait(page);

  await expect(page.locator('body')).toContainText('Payroll', { timeout: 30000 });
  await expect(page.locator('body')).toContainText('Payroll safety rule', { timeout: 30000 });
  await expect(page.locator('body')).toContainText(workerName, { timeout: 30000 });

  const pageText = await page.locator('body').innerText();
  console.log('PAYROLL_FOUND_ON_PAGE=' + pageText.includes(workerName));
  console.log('PAYROLL_DEMO_MATIU_ON_PAGE=' + pageText.includes('Matiu Rangi'));
  console.log('PAYROLL_DEMO_ANA_ON_PAGE=' + pageText.includes('Ana Williams'));
  console.log('PAYROLL_DEMO_TAMA_ON_PAGE=' + pageText.includes('Tama Smith'));

  expect(pageText).not.toContain('Matiu Rangi');
  expect(pageText).not.toContain('Ana Williams');
  expect(pageText).not.toContain('Tama Smith');
});
