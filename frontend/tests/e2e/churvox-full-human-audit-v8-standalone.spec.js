const { test, expect } = require('@playwright/test');

async function go(page, route) {
  await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForLoadState('networkidle', { timeout: 1000 }).catch(() => null);
  await page.waitForTimeout(200);
}

async function bodyText(page) {
  return (await page.locator('body').innerText({ timeout: 5000 })).replace(/\s+/g, ' ').trim();
}

test.describe('Churvox worker live route contract', () => {
  test('worker Today and Jobs live URLs are never blank', async ({ page }) => {
    await go(page, '/worker/today');
    let text = await bodyText(page);
    expect(text).toMatch(/Today/i);
    expect(text).toMatch(/schedule|info|messages|jobs/i);
    expect(text).not.toMatch(/Start job/i);

    await go(page, '/worker/jobs');
    text = await bodyText(page);
    expect(text).toMatch(/Jobs/i);
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
