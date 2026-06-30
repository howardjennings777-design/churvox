const { test, expect } = require('@playwright/test');

async function go(page, route) {
  await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForLoadState('networkidle', { timeout: 1000 }).catch(() => null);
  await page.waitForTimeout(200);
}

async function bodyText(page) {
  return (await page.locator('body').innerText({ timeout: 5000 })).replace(/\s+/g, ' ').trim();
}

async function liveText(request, route) {
  const res = await request.get(route, { timeout: 15000 });
  expect(res.ok(), `${route} should respond`).toBeTruthy();
  return (await res.text()).replace(/\s+/g, ' ').trim();
}

test.describe('Churvox worker route contract', () => {
  test('worker live URLs respond and stable worker pages render', async ({ page, request }) => {
    let text = await liveText(request, '/worker/today');
    expect(text).toMatch(/Today/i);
    expect(text).toMatch(/schedule|info|messages|jobs/i);
    expect(text).not.toMatch(/Start job/i);

    text = await liveText(request, '/worker/jobs');
    expect(text).toMatch(/Jobs/i);
    expect(text).toMatch(/one job at a time|all jobs done|no open jobs/i);

    await go(page, '/worker/today/index.html');
    text = await bodyText(page);
    expect(text).toMatch(/Today/i);

    await go(page, '/worker/jobs/index.html');
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
