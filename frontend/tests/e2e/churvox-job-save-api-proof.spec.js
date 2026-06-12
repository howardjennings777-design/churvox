const { test, expect } = require('@playwright/test');

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'https://www.churvox.com';
const EMAIL = process.env.CHURVOX_E2E_EMAIL || '';
const PASS = process.env.CHURVOX_E2E_PASSWORD || '';

const url = (path) => new URL(path, BASE).toString();
const stamp = () => new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);

async function wait(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(800);
}

test('job save API proof', async ({ page }) => {
  const clientName = `PW Job Client ${stamp()}`;
  const jobName = `PW Job Proof ${stamp()}`;

  await page.goto(url('/login'));
  await wait(page);

  await page.getByLabel(/email/i).fill(EMAIL);
  await page.getByLabel(/password/i).fill(PASS);
  await page.getByRole('button', { name: /sign in|log in|login/i }).click();
  await page.waitForURL(/dashboard|plans|setup|guide|#/i, { timeout: 30000 }).catch(() => null);
  await wait(page);

  await page.goto(url('/clients/new'));
  await wait(page);
  await page.getByTestId('client-name-input').fill(clientName);

  const clientSave = page.waitForResponse(
    (res) => res.url().includes('/api/clients') && res.request().method() === 'POST',
    { timeout: 30000 }
  );

  await page.getByRole('button', { name: /create client|save client|save|create/i }).click();
  await clientSave;
  await wait(page);

  await page.goto(url('/jobs/new'));
  await wait(page);

  await page.getByTestId('job-title-input').fill(jobName);
  await page.getByTestId('job-address-input').fill('1 Job Proof Street');
  await page.getByTestId('job-scheduled-date-input').fill('2026-06-20T09:00');
  await page.getByTestId('job-fixed-price-input').fill('85');
  await page.getByTestId('job-notes-input').fill(`Proof notes for ${jobName}`);

  const clientSelect = page.getByTestId('job-client-select');
  if (await clientSelect.isVisible().catch(() => false)) {
    const value = await clientSelect.evaluate((el, target) => {
      const option = [...el.options].find((o) => (o.textContent || '').includes(target));
      return option ? option.value : '';
    }, clientName);
    if (value) await clientSelect.selectOption(value);
  }

  const jobSave = page.waitForResponse(
    (res) => res.url().includes('/api/jobs') && ['POST', 'PATCH'].includes(res.request().method()),
    { timeout: 30000 }
  );

  await page.getByRole('button', { name: /create job|save job|save|create/i }).click();

  const jobResponse = await jobSave;
  const status = jobResponse.status();
  const body = await jobResponse.text().catch(() => '');

  console.log('JOB_SAVE_NAME=' + jobName);
  console.log('JOB_SAVE_STATUS=' + status);
  console.log('JOB_SAVE_BODY=' + body.slice(0, 1000));

  expect(status, 'job save HTTP status').toBeLessThan(400);

  await page.waitForTimeout(1500);
  await page.goto(url('/dashboard#jobs'));
  await wait(page);

  await expect(page.locator('body')).toContainText(jobName, { timeout: 30000 });

  const bodyText = await page.locator('body').innerText();
  console.log('JOB_FOUND_ON_PAGE=' + bodyText.includes(jobName));
});
