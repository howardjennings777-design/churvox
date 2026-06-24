const { test, expect } = require('@playwright/test');

const OWNER_EMAIL = process.env.CHURVOX_OWNER_EMAIL || process.env.CHURVOX_E2E_EMAIL || process.env.E2E_EMAIL || '';
const OWNER_PASSWORD = process.env.CHURVOX_OWNER_PASSWORD || process.env.CHURVOX_E2E_PASSWORD || process.env.E2E_PASSWORD || '';
const ALLOW_APPROVE = process.env.CHURVOX_E2E_AI_APPROVE === '1';

const badOpenText = /AI prepared admin work|AI reviewed the live business records|needs_clarification|needs clarification|needs preparation|not prepared|needs concrete draft|this card does not include|came from the instruction/i;

async function waitStable(page) {
  await page.waitForLoadState('domcontentloaded').catch(() => null);
  await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => null);
  await page.waitForTimeout(500);
}

async function fillAny(page, names, value) {
  for (const name of names) {
    const byLabel = page.getByLabel(new RegExp(name, 'i')).first();
    if (await byLabel.isVisible().catch(() => false)) {
      await byLabel.fill(String(value));
      return true;
    }

    const byPlaceholder = page.getByPlaceholder(new RegExp(name, 'i')).first();
    if (await byPlaceholder.isVisible().catch(() => false)) {
      await byPlaceholder.fill(String(value));
      return true;
    }

    const byName = page.locator(`input[name*="${name}" i], textarea[name*="${name}" i]`).first();
    if (await byName.isVisible().catch(() => false)) {
      await byName.fill(String(value));
      return true;
    }
  }
  return false;
}

async function clickButton(page, name) {
  const button = page.getByRole('button', { name }).first();
  expect(await button.isVisible().catch(() => false), `button should be visible: ${name}`).toBeTruthy();
  await button.click();
  await waitStable(page);
}

async function login(page) {
  test.skip(!OWNER_EMAIL || !OWNER_PASSWORD, 'Set CHURVOX_OWNER_EMAIL and CHURVOX_OWNER_PASSWORD.');

  await page.goto('/login');
  await waitStable(page);
  await fillAny(page, ['email'], OWNER_EMAIL);
  await fillAny(page, ['password'], OWNER_PASSWORD);

  const submit = page.locator('form button[type="submit"], button[type="submit"]').first();
  if (await submit.isVisible().catch(() => false)) await submit.click();
  else await clickButton(page, /sign in|log in|login/i);

  await page.waitForURL(/dashboard|setup|guide|plans|admin/i, { timeout: 40000 }).catch(() => null);
  await waitStable(page);

  const body = await page.locator('body').innerText({ timeout: 10000 }).catch(() => '');
  expect(body, `owner login should land in the app. URL=${page.url()} BODY=${body.slice(0, 500)}`).toMatch(/Churvox|Plan My Day|Ready for approval|Jobs|Clients|Command/i);
  expect(body, 'owner login should not show auth errors').not.toMatch(/invalid email or password|incorrect password|login failed/i);
}

async function localReviewInbox(page) {
  return page.evaluate(() => ({
    review: window.localStorage.getItem('churvox:review-inbox:v1'),
    fresh: window.localStorage.getItem('churvox:fresh-command-inbox:v1'),
  }));
}

async function visibleOpenText(page) {
  await clickButton(page, /^Open/i);
  return (await page.locator('body').innerText({ timeout: 10000 })).replace(/\s+/g, ' ').trim();
}

test.describe.serial('Command AI approval flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Command loads backend review items and keeps Open clean', async ({ page }) => {
    const listResponsePromise = page.waitForResponse((res) => res.url().includes('/api/ai-review-items'), { timeout: 40000 }).catch(() => null);

    await page.goto('/dashboard#command');
    await waitStable(page);

    const body = await page.locator('body').innerText({ timeout: 10000 });
    expect(body).toMatch(/Ready for approval|Your approval queue|Check for work|Only clear, ready-to-approve work appears in Open/i);

    const listResponse = await listResponsePromise;
    expect(listResponse, 'Command should request backend review items').toBeTruthy();
    expect([200, 204], `review list should be available, got ${listResponse && listResponse.status()}`).toContain(listResponse.status());

    const inbox = await localReviewInbox(page);
    expect(inbox.review, 'Command must not use old local review inbox').toBeFalsy();
    expect(inbox.fresh, 'Command must not depend on local fake review inbox').toBeFalsy();

    const openText = await visibleOpenText(page);
    expect(openText, 'Open queue should not show generic/fake AI cards').not.toMatch(badOpenText);
  });

  test('Check for work calls backend AI prepare and does not leak fake slips into Open', async ({ page }) => {
    await page.goto('/dashboard#command');
    await waitStable(page);

    const prepareResponsePromise = page.waitForResponse((res) => res.url().includes('/api/tell-churvox/prepare') && res.request().method() === 'POST', { timeout: 70000 }).catch(() => null);
    await clickButton(page, /^Check for work$/i);
    const prepareResponse = await prepareResponsePromise;

    expect(prepareResponse, 'Check for work should call backend prepare endpoint').toBeTruthy();
    expect([200, 202, 204], `AI prepare should succeed, got ${prepareResponse && prepareResponse.status()}`).toContain(prepareResponse.status());

    await page.waitForResponse((res) => res.url().includes('/api/ai-review-items'), { timeout: 40000 }).catch(() => null);
    await waitStable(page);

    const openText = await visibleOpenText(page);
    expect(openText, 'After AI prepare, Open should still contain only approval-ready work').not.toMatch(badOpenText);
    expect(openText).toMatch(/Ready for approval|Waiting for approval|Nothing waiting|item|decision|approve|edit|ignore/i);
  });

  test('optional approval path is guarded by explicit env flag', async ({ page }) => {
    test.skip(!ALLOW_APPROVE, 'Set CHURVOX_E2E_AI_APPROVE=1 only when you intentionally want to approve one live Command item.');

    await page.goto('/dashboard#command');
    await waitStable(page);
    await clickButton(page, /^Open/i);

    const approveButton = page.getByRole('button', { name: /^Approve$/i }).first();
    expect(await approveButton.isEnabled().catch(() => false), 'Approve should only be enabled for a concrete prepared action').toBeTruthy();

    const approveResponsePromise = page.waitForResponse((res) => /\/api\/ai-review-items\/[^/]+\/approve/.test(res.url()) && res.request().method() === 'POST', { timeout: 70000 });
    await approveButton.click();
    const approveResponse = await approveResponsePromise;
    expect(approveResponse.status(), 'approval endpoint should succeed').toBe(200);

    await waitStable(page);
    await expect(page.locator('body')).toContainText(/Approved|handled|decision|ready|waiting/i);
  });
});
