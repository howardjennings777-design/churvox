const { test, expect } = require('@playwright/test');

async function go(page, route) {
  await page.goto(route, { waitUntil: 'commit', timeout: 12000 });
  await page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => null);
  await page.waitForLoadState('networkidle', { timeout: 1000 }).catch(() => null);
  await page.waitForTimeout(200);
}

async function bodyText(page) {
  return (await page.locator('body').innerText({ timeout: 5000 })).replace(/\s+/g, ' ').trim();
}

async function assertWorkerPage(page, route, pattern, label) {
  await go(page, route);
  let text = await bodyText(page).catch(() => '');
  if (!pattern.test(text) && !route.endsWith('/')) {
    await go(page, `${route}/`);
    text = await bodyText(page).catch(() => '');
  }
  expect(text, `${label} should not be blank`).toMatch(pattern);
  return text;
}

test.describe('Churvox worker live route contract', () => {
  test('worker Today and Jobs live URLs are never blank', async ({ page }) => {
    let text = await assertWorkerPage(page, '/worker/today', /Today/i, 'worker today');
    expect(text).toMatch(/schedule|info|messages|jobs/i);
    expect(text).not.toMatch(/Start job/i);

    text = await assertWorkerPage(page, '/worker/jobs', /Jobs/i, 'worker jobs');
    expect(text).toMatch(/one job at a time|all jobs done|no open jobs/i);
  });
});

test.describe('Churvox public mobile contract', () => {
  for (const route of ['/', '/features', '/pricing', '/login', '/signup']) {
    test(`public mobile page has readable content and no horizontal overflow: ${route}`, async ({ page }) => {
      await go(page, route);
      const text = await bodyText(page);
      expect(text.length).toBeGreaterThan(60);
      const overflow = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - window.innerWidth));
      expect(overflow).toBeLessThan(8);
    });
  }
});
