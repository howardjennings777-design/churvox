const { test, expect } = require('@playwright/test');

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'https://www.churvox.com';
const EMAIL = process.env.CHURVOX_E2E_EMAIL || '';
const PASS = process.env.CHURVOX_E2E_PASSWORD || '';
const url = (path) => new URL(path, BASE).toString();
const stamp = () => new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);

async function wait(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);
}

test('job API list proof', async ({ page }) => {
  const jobName = `PW Job API ${stamp()}`;

  await page.goto(url('/login'));
  await wait(page);

  await page.getByLabel(/email/i).fill(EMAIL);
  await page.getByLabel(/password/i).fill(PASS);
  await page.getByRole('button', { name: /sign in|log in|login/i }).click();
  await page.waitForURL(/dashboard|plans|setup|guide|#/i, { timeout: 30000 }).catch(() => null);
  await wait(page);

  await page.goto(url('/jobs/new'));
  await wait(page);

  await page.getByTestId('job-title-input').fill(jobName);
  await page.getByTestId('job-address-input').fill('1 Job API Proof Street');
  await page.getByTestId('job-scheduled-date-input').fill('2026-06-20T09:00');
  await page.getByTestId('job-fixed-price-input').fill('85');
  await page.getByTestId('job-notes-input').fill(`Proof notes for ${jobName}`);

  const jobSave = page.waitForResponse(
    (res) => res.url().includes('/api/jobs') && ['POST', 'PATCH'].includes(res.request().method()),
    { timeout: 30000 }
  );

  await page.getByRole('button', { name: /create job|save job|save|create/i }).click();

  const saveResponse = await jobSave;
  const saveBody = await saveResponse.text().catch(() => '');

  console.log('JOB_SAVE_NAME=' + jobName);
  console.log('JOB_SAVE_STATUS=' + saveResponse.status());
  console.log('JOB_SAVE_BODY=' + saveBody.slice(0, 1000));

  expect(saveResponse.status()).toBeLessThan(400);

  await page.waitForTimeout(2000);

  const apiList = await page.request.get(url('/api/jobs'), {
    headers: { accept: 'application/json' },
  });
  const apiText = await apiList.text();

  console.log('JOB_LIST_STATUS=' + apiList.status());
  console.log('JOB_FOUND_IN_API=' + apiText.includes(jobName));
  console.log('JOB_LIST_BODY=' + apiText.slice(0, 1500));

  await page.goto(url('/dashboard#jobs'));
  const jobsGet = page.waitForResponse(
    (res) => res.url().includes('/api/jobs') && res.request().method() === 'GET',
    { timeout: 30000 }
  ).catch((err) => err);

  const getResult = await jobsGet;
  if (getResult && getResult.status) {
    console.log('PAGE_GET_JOBS_STATUS=' + getResult.status());
    console.log('PAGE_GET_JOBS_BODY=' + (await getResult.text()).slice(0, 1500));
  } else {
    console.log('PAGE_GET_JOBS_STATUS=NO_RESPONSE');
  }

  await page.waitForTimeout(5000);
  const pageText = await page.locator('body').innerText();

  console.log('JOB_FOUND_ON_PAGE=' + pageText.includes(jobName));
  console.log('PAGE_HAS_LOADING=' + pageText.includes('Loading real jobs'));

  expect(apiText).toContain(jobName);
});
