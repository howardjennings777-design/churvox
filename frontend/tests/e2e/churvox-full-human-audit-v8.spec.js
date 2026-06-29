const { test, expect } = require('@playwright/test');

require('./churvox-full-human-audit-v7.spec.js');

const WORKER_EMAIL = process.env.CHURVOX_WORKER_EMAIL || process.env.CHURVOX_E2E_WORKER_EMAIL || '';
const WORKER_PASSWORD = process.env.CHURVOX_WORKER_PASSWORD || process.env.CHURVOX_E2E_WORKER_PASSWORD || '';
const MUTATE = process.env.CHURVOX_E2E_MUTATE === '1';

const oldWorkerClutter = /proof passport|worker protection controls|photo safe queue|worker note becomes owner admin|made for workers, not office clutter|proof, gps and time are clear|0\/6 ready for owner approval|field proof|fair gps|photo thumbnails will show|worker controls ready|route to command, not jobs|6 proof checks left/i;
const adminWordsOnWorker = /command slip|owner admin|sync to xero|sync to myob|bank payout|file tax/i;

async function waitSettled(page) {
  await page.waitForLoadState('domcontentloaded').catch(() => null);
  await page.waitForLoadState('networkidle', { timeout: 1500 }).catch(() => null);
  await page.waitForTimeout(250).catch(() => null);
}

async function bodyText(page) {
  return (await page.locator('body').innerText({ timeout: 10000 }).catch(() => '')).replace(/\s+/g, ' ').trim();
}

async function fillAny(page, names, value) {
  for (const name of names) {
    const candidates = [
      page.getByLabel(new RegExp(name, 'i')).first(),
      page.getByPlaceholder(new RegExp(name, 'i')).first(),
      page.locator(`input[name*="${name}" i], textarea[name*="${name}" i]`).first(),
    ];
    for (const locator of candidates) {
      if (await locator.isVisible().catch(() => false)) {
        await locator.fill(String(value)).catch(async () => {
          await locator.click();
          await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
          await page.keyboard.type(String(value));
        });
        return true;
      }
    }
  }
  return false;
}

async function loginWorker(page) {
  if (!WORKER_EMAIL || !WORKER_PASSWORD) throw new Error('Missing CHURVOX_WORKER_EMAIL/CHURVOX_WORKER_PASSWORD. Full human audit must use the real worker login.');
  await page.goto('/login');
  await waitSettled(page);
  await fillAny(page, ['email'], WORKER_EMAIL);
  await fillAny(page, ['password'], WORKER_PASSWORD);
  const submit = page.locator('form button[type="submit"], button[type="submit"], input[type="submit"]').first();
  if (await submit.isVisible().catch(() => false)) await submit.click();
  else await page.getByRole('button', { name: /log in|login|sign in/i }).first().click();
  await page.waitForURL(/worker|dashboard|plans|setup|guide/i, { timeout: 40000 }).catch(() => null);
  await waitSettled(page);
  const text = await bodyText(page);
  expect(text, 'worker login should not show auth error').not.toMatch(/invalid|incorrect|wrong|failed|try again|required|not found/i);
  if (!/worker/i.test(page.url())) await page.goto('/worker/today');
  await waitSettled(page);
}

async function assertNoOldWorkerClutter(page, label) {
  const text = await bodyText(page);
  expect(text, `${label}: old worker proof/GPS/control clutter must not be visible`).not.toMatch(oldWorkerClutter);
  expect(text, `${label}: worker app must not expose office/admin language`).not.toMatch(adminWordsOnWorker);
}

async function clickVisible(page, regex, label) {
  const button = page.getByRole('button', { name: regex }).first();
  if (await button.isVisible().catch(() => false)) {
    await button.scrollIntoViewIfNeeded().catch(() => null);
    await button.click();
    await waitSettled(page);
    return true;
  }
  const link = page.getByRole('link', { name: regex }).first();
  if (await link.isVisible().catch(() => false)) {
    await link.scrollIntoViewIfNeeded().catch(() => null);
    await link.click();
    await waitSettled(page);
    return true;
  }
  throw new Error(`Could not find ${label}`);
}

test.describe('Churvox full human audit v8 - worker no-fuss contract', () => {
  test('worker Today is info only and Jobs works one at a time without old proof clutter', async ({ page }, testInfo) => {
    test.setTimeout(180000);
    if (!MUTATE) throw new Error('Missing CHURVOX_E2E_MUTATE=1. This audit must safely start/finish the worker job or fail.');

    await loginWorker(page);

    await page.goto('/worker/today');
    await waitSettled(page);
    let text = await bodyText(page);
    expect(text, 'Today should identify the schedule/info page').toMatch(/Today/i);
    expect(text, 'Today should mention schedule/info, not old proof flow').toMatch(/schedule|info|messages|jobs/i);
    expect(text, 'Today should not show Start job as the main work action').not.toMatch(/Start job/i);
    await assertNoOldWorkerClutter(page, 'worker today');

    await page.goto('/worker/jobs');
    await waitSettled(page);
    text = await bodyText(page);
    expect(text, 'Jobs should be a one-job queue').toMatch(/one job at a time|start current job|all jobs done/i);
    await assertNoOldWorkerClutter(page, 'worker jobs before start');

    if (/all jobs done|no open jobs/i.test(text)) {
      testInfo.annotations.push({ type: 'warning', description: 'Worker had no open jobs to mutate; route/layout contract still checked.' });
      return;
    }

    await clickVisible(page, /start current job|open job/i, 'current worker job link');
    await assertNoOldWorkerClutter(page, 'worker job detail before start');

    await clickVisible(page, /^start job$/i, 'Start job button');
    text = await bodyText(page);
    expect(text, 'After Start job, page should stay clean and show Finish job').toMatch(/Finish job/i);
    await assertNoOldWorkerClutter(page, 'worker job detail after start');

    await clickVisible(page, /^finish job$/i, 'Finish job button');
    text = await bodyText(page);
    expect(text, 'Finish should only ask the simple proof/note question').toMatch(/need to add anything|send to office/i);
    await assertNoOldWorkerClutter(page, 'worker finish check');

    await clickVisible(page, /no, finish job|send to office/i, 'simple finish action');
    if (await page.getByRole('button', { name: /send to office/i }).first().isVisible().catch(() => false)) {
      await clickVisible(page, /send to office/i, 'send to office');
    }
    await waitSettled(page);
    await expect(page).toHaveURL(/\/worker\/(jobs|today)/i);
    await assertNoOldWorkerClutter(page, 'worker after finish returns to queue');
  });
});

test.describe('Churvox full human audit v8 - public mobile contract', () => {
  for (const route of ['/', '/features', '/pricing', '/login', '/signup']) {
    test(`public mobile page has readable content and no horizontal overflow: ${route}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: 412, height: 915 });
      await page.goto(route);
      await waitSettled(page);
      const result = await page.evaluate(() => {
        const body = document.body;
        const vw = document.documentElement.clientWidth;
        const sw = Math.max(document.documentElement.scrollWidth, body?.scrollWidth || 0);
        const text = (body?.innerText || '').replace(/\s+/g, ' ').trim();
        return { vw, sw, overflow: sw - vw, text: text.slice(0, 500), length: text.length };
      });
      await testInfo.attach(`public-mobile-${route.replace(/\W+/g, '-')}.json`, { body: JSON.stringify(result, null, 2), contentType: 'application/json' });
      expect(result.length, `${route} should have visible text`).toBeGreaterThan(80);
      expect(result.overflow, `${route} should not horizontally overflow on mobile`).toBeLessThanOrEqual(12);
      expect(result.text, `${route} should not render a blank/crash page`).not.toMatch(/Something went wrong|Application error|Cannot read properties|undefined is not an object/i);
    });
  }
});
