const { test, expect } = require('@playwright/test');

const OWNER_EMAIL = process.env.CHURVOX_E2E_EMAIL || process.env.E2E_EMAIL || '';
const OWNER_PASSWORD = process.env.CHURVOX_E2E_PASSWORD || process.env.E2E_PASSWORD || '';
const ALLOW_AI_PREPARE = process.env.CHURVOX_E2E_AI_PREPARE === '1';
const ALLOW_AI_APPROVE = process.env.CHURVOX_E2E_AI_APPROVE === '1';

async function waitStable(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);
}

async function fillByLabelOrPlaceholder(page, labelWords, value) {
  const words = Array.isArray(labelWords) ? labelWords : [labelWords];
  for (const word of words) {
    const byLabel = page.getByLabel(new RegExp(word, 'i')).first();
    if (await byLabel.count().catch(() => 0) && await byLabel.isVisible().catch(() => false)) {
      await byLabel.fill(value);
      return true;
    }
    const byPlaceholder = page.getByPlaceholder(new RegExp(word, 'i')).first();
    if (await byPlaceholder.count().catch(() => 0) && await byPlaceholder.isVisible().catch(() => false)) {
      await byPlaceholder.fill(value);
      return true;
    }
  }
  return false;
}

async function clickByText(page, candidates) {
  for (const candidate of candidates) {
    const byButton = page.getByRole('button', { name: candidate }).first();
    if (await byButton.count().catch(() => 0) && await byButton.isVisible().catch(() => false)) {
      await byButton.click();
      return true;
    }
    const byText = page.getByText(candidate, { exact: false }).first();
    if (await byText.count().catch(() => 0) && await byText.isVisible().catch(() => false)) {
      await byText.click();
      return true;
    }
  }
  return false;
}

async function login(page) {
  test.skip(!OWNER_EMAIL || !OWNER_PASSWORD, 'Set CHURVOX_E2E_EMAIL and CHURVOX_E2E_PASSWORD to run real AI loop tests.');
  await page.goto('/login');
  await waitStable(page);
  await fillByLabelOrPlaceholder(page, ['email'], OWNER_EMAIL);
  await fillByLabelOrPlaceholder(page, ['password'], OWNER_PASSWORD);
  const clicked = await clickByText(page, [/sign in/i, /log in/i, /login/i]);
  expect(clicked, 'login button should be clickable').toBeTruthy();
  await page.waitForURL(/dashboard|plans|guide|setup|#/i, { timeout: 30_000 }).catch(() => null);
  await waitStable(page);
  await expect(page.locator('body')).toContainText(/Churvox|Today|Plan|Dashboard|Owner/i);
}

async function localReviewInbox(page) {
  return page.evaluate(() => ({
    review: window.localStorage.getItem('churvox:review-inbox:v1'),
    oldReview: window.localStorage.getItem('churvox:fresh-command-inbox:v1'),
  }));
}

test.describe('Churvox real AI loop', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Tell Churvox is backend-AI only and does not create fake local review slips', async ({ page }) => {
    await page.goto('/dashboard#quickcreateai');
    await waitStable(page);

    const body = page.locator('body');
    await expect(body).toContainText(/prepares it for Review|nothing changes until you approve|backend Review|safe backend parser|Backend AI|Review item/i);

    await page.locator('textarea').first().fill('Playwright check: create a job for 16 Taita Drive $60 next Friday');

    const prepareResponsePromise = page.waitForResponse((res) => res.url().includes('/api/tell-churvox/prepare'), { timeout: 70_000 }).catch(() => null);
    const clicked = await clickByText(page, [/prepare for review/i, /prepare with real ai/i]);
    expect(clicked, 'Prepare with real AI button should be clickable').toBeTruthy();
    const prepareResponse = await prepareResponsePromise;

    expect(prepareResponse, 'Tell Churvox should call the backend prepare endpoint').toBeTruthy();
    const status = prepareResponse.status();
    expect([200, 400, 401, 403, 422, 503], `unexpected prepare status ${status}`).toContain(status);

    if (status !== 200) {
      await expect(body).toContainText(/Real AI did not run|AI provider is not configured|not configured|Backend AI is not ready|No fake preview/i);
      const inbox = await localReviewInbox(page);
      expect(inbox.review, 'new localStorage review inbox must not be created when backend AI fails').toBeFalsy();
      expect(inbox.oldReview, 'old localStorage review inbox must not be created when backend AI fails').toBeFalsy();
      return;
    }

    await expect(body).toContainText(/Saved to Review|backend Review work|Review prepared work/i);
    const inbox = await localReviewInbox(page);
    expect(inbox.review, 'Tell Churvox must not use localStorage review inbox after successful backend AI').toBeFalsy();
    expect(inbox.oldReview, 'Tell Churvox must not use old localStorage inbox after successful backend AI').toBeFalsy();
  });

  test('backend Review list is the source of truth', async ({ page }) => {
    await page.goto('/dashboard#command');
    const listResponsePromise = page.waitForResponse((res) => res.url().includes('/api/ai-review-items'), { timeout: 30_000 }).catch(() => null);
    await waitStable(page);
    const body = page.locator('body');

    await expect(body).toContainText(/Backend-owned Review only|backend Review|Approve what Churvox AI prepared/i);
    const listResponse = await listResponsePromise;
    expect(listResponse, 'Review should request backend AI review items').toBeTruthy();
    expect([200, 401, 403], `unexpected review list status ${listResponse && listResponse.status()}`).toContain(listResponse.status());

    const inbox = await localReviewInbox(page);
    expect(inbox.review, 'Review page must not load localStorage review inbox').toBeFalsy();
    expect(inbox.oldReview, 'Review page must not load old localStorage review inbox').toBeFalsy();
  });

  test('full backend AI prepare to Review path can run when explicitly enabled', async ({ page }) => {
    test.skip(!ALLOW_AI_PREPARE, 'Set CHURVOX_E2E_AI_PREPARE=1 to create a real backend AI Review item.');

    const instruction = `Playwright AI prepare ${Date.now()}: create client Test AI Customer with job at 16 Taita Drive for $60 next Friday`;
    await page.goto('/dashboard#quickcreateai');
    await waitStable(page);
    await page.locator('textarea').first().fill(instruction);

    const prepareResponsePromise = page.waitForResponse((res) => res.url().includes('/api/tell-churvox/prepare'), { timeout: 70_000 });
    await clickByText(page, [/prepare for review/i, /prepare with real ai/i]);
    const prepareResponse = await prepareResponsePromise;
    expect(prepareResponse.status(), 'Tell Churvox prepare should succeed with backend AI or safe backend parser').toBe(200);
    const prepareBody = await prepareResponse.json();
    const item = prepareBody.item || prepareBody.data?.item;
    expect(item?.id, 'backend prepare should return a persisted review item id').toBeTruthy();

    await page.goto('/dashboard#command');
    await waitStable(page);
    await expect(page.locator('body')).toContainText(/Backend-owned Review only|Approve what Churvox AI prepared/i);
    await expect(page.locator('body')).toContainText((item.title || item.summary || '').slice(0, 30));

    if (!ALLOW_AI_APPROVE) return;

    const approveResponsePromise = page.waitForResponse((res) => res.url().includes(`/api/ai-review-items/${item.id}/approve`), { timeout: 70_000 });
    await clickByText(page, [/approve backend action/i, /^approve$/i]);
    const approveResponse = await approveResponsePromise;
    expect(approveResponse.status(), 'backend approval should succeed').toBe(200);
    await expect(page.locator('body')).toContainText(/Approved|executed|Backend executed/i);
  });
});
