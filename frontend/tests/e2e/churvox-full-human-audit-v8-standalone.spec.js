const { test, expect } = require('@playwright/test');

const WORKER_EMAIL = process.env.CHURVOX_WORKER_EMAIL || '';
const WORKER_PASSWORD = process.env.CHURVOX_WORKER_PASSWORD || '';
const MUTATE = process.env.CHURVOX_E2E_MUTATE === '1';

async function go(page, route) {
  await page.goto('about:blank', { waitUntil: 'commit', timeout: 5000 }).catch(() => null);
  await page.goto(route, { waitUntil: 'commit', timeout: 15000 }).catch(() => null);
  await page.waitForTimeout(500).catch(() => null);
}

async function settle(page) {
  await page.waitForLoadState('domcontentloaded', { timeout: 4000 }).catch(() => null);
  await page.waitForLoadState('networkidle', { timeout: 800 }).catch(() => null);
  await page.waitForTimeout(250).catch(() => null);
}

async function text(page) {
  return (await page.locator('body').innerText({ timeout: 3000 }).catch(() => '')).replace(/\s+/g, ' ').trim();
}

async function debug(page) {
  return {
    url: page.url(),
    title: await page.title().catch(() => ''),
    ready: await page.evaluate(() => document.readyState).catch(() => 'unknown'),
    body: await page.locator('body').evaluate((b) => b.innerHTML.slice(0, 500)).catch(() => 'NO_BODY'),
    root: await page.locator('#root').evaluate((r) => r.innerHTML.slice(0, 500)).catch(() => 'NO_ROOT'),
  };
}

async function fill(page, names, value) {
  for (const name of names) {
    for (const input of [
      page.getByLabel(new RegExp(name, 'i')).first(),
      page.getByPlaceholder(new RegExp(name, 'i')).first(),
      page.locator(`input[name*="${name}" i]`).first(),
    ]) {
      if (await input.isVisible().catch(() => false)) {
        await input.fill(value);
        return true;
      }
    }
  }
  return false;
}

async function loginWorker(page) {
  if (!WORKER_EMAIL || !WORKER_PASSWORD) throw new Error('Missing worker login env.');
  await go(page, '/login');
  await settle(page);
  await fill(page, ['email'], WORKER_EMAIL);
  await fill(page, ['password'], WORKER_PASSWORD);
  const submit = page.locator('form button[type="submit"], button[type="submit"]').first();
  if (await submit.isVisible().catch(() => false)) await submit.click();
  else await page.getByRole('button', { name: /log in|login|sign in/i }).first().click();
  await page.waitForTimeout(1200).catch(() => null);
}

async function expectWorkerText(page, route, pattern, label) {
  for (let i = 0; i < 4; i += 1) {
    await go(page, route);
    await settle(page);
    for (let j = 0; j < 10; j += 1) {
      const body = await text(page);
      if (pattern.test(body)) return body;
      await page.waitForTimeout(250).catch(() => null);
    }
  }
  throw new Error(`${label} missing. debug=${JSON.stringify(await debug(page))}`);
}

test.describe('Churvox full human audit v8 standalone - worker no-fuss contract', () => {
  test('worker Today is info only and Jobs works one at a time', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    if (!MUTATE) throw new Error('Missing CHURVOX_E2E_MUTATE=1.');
    await loginWorker(page);

    let body = await expectWorkerText(page, '/worker/today', /Today/i, 'worker today');
    expect(body).toMatch(/schedule|info|messages|jobs/i);
    expect(body).not.toMatch(/Start job/i);

    body = await expectWorkerText(page, '/worker/jobs', /one job at a time|start current job|all jobs done|no open jobs/i, 'worker jobs');
    if (/all jobs done|no open jobs/i.test(body)) {
      testInfo.annotations.push({ type: 'warning', description: 'Worker had no open jobs to mutate.' });
      return;
    }

    const open = page.getByRole('link', { name: /start current job|open job/i }).first();
    if (await open.isVisible().catch(() => false)) await open.click();
    const start = page.getByRole('button', { name: /^start job$/i }).first();
    if (await start.isVisible().catch(() => false)) {
      await start.click();
      await expect(page.locator('body')).toContainText(/Finish job/i, { timeout: 10000 });
    }
  });
});

test.describe('Churvox full human audit v8 standalone - public mobile contract', () => {
  for (const route of ['/', '/features', '/pricing', '/login', '/signup']) {
    test(`public mobile page has readable content and no horizontal overflow: ${route}`, async ({ page }) => {
      await go(page, route);
      await settle(page);
      const body = await text(page);
      expect(body.length, `${route} should have readable text`).toBeGreaterThan(60);
      const overflow = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - window.innerWidth));
      expect(overflow, `${route} should not have horizontal overflow`).toBeLessThan(8);
    });
  }
});
