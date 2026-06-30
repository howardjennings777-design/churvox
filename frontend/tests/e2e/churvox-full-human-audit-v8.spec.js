const { test, expect } = require('@playwright/test');

const WORKER_EMAIL = process.env.CHURVOX_WORKER_EMAIL || process.env.CHURVOX_E2E_WORKER_EMAIL || '';
const WORKER_PASSWORD = process.env.CHURVOX_WORKER_PASSWORD || process.env.CHURVOX_E2E_WORKER_PASSWORD || '';

async function gotoFast(page, route) {
  await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(async () => {
    await page.evaluate((target) => { window.location.href = target; }, route).catch(() => null);
  });
}

async function bodyText(page) {
  return (await page.locator('body').innerText({ timeout: 5000 }).catch(() => '')).replace(/\s+/g, ' ').trim();
}

async function fillAny(page, name, value) {
  const locators = [
    page.getByLabel(new RegExp(name, 'i')).first(),
    page.getByPlaceholder(new RegExp(name, 'i')).first(),
    page.locator(`input[name*="${name}" i]`).first(),
  ];
  for (const locator of locators) {
    if (await locator.isVisible().catch(() => false)) {
      await locator.fill(String(value));
      return true;
    }
  }
  return false;
}

test.describe('Churvox full human audit v8 smoke', () => {
  test('public pages render on mobile without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 412, height: 915 });
    for (const route of ['/', '/features', '/pricing', '/login', '/signup']) {
      await gotoFast(page, route);
      await page.waitForTimeout(300);
      const result = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        const sw = Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0);
        const text = (document.body?.innerText || '').replace(/\s+/g, ' ').trim();
        return { overflow: sw - vw, length: text.length, text: text.slice(0, 300) };
      });
      expect(result.length, `${route} should have text`).toBeGreaterThan(80);
      expect(result.overflow, `${route} should fit mobile width`).toBeLessThanOrEqual(12);
      expect(result.text).not.toMatch(/Something went wrong|Application error|Cannot read properties|undefined is not an object/i);
    }
  });

  test('worker login reaches a worker screen when credentials are supplied', async ({ page }) => {
    test.skip(!WORKER_EMAIL || !WORKER_PASSWORD, 'Worker credentials not supplied.');
    await gotoFast(page, '/login');
    await fillAny(page, 'email', WORKER_EMAIL);
    await fillAny(page, 'password', WORKER_PASSWORD);
    const submit = page.locator('form button[type="submit"], button[type="submit"], input[type="submit"]').first();
    if (await submit.isVisible().catch(() => false)) await submit.click();
    else await page.getByRole('button', { name: /log in|login|sign in/i }).first().click();
    await page.waitForURL(/worker|dashboard|plans|setup|guide/i, { timeout: 40000 }).catch(() => null);
    if (!/worker/i.test(page.url())) await gotoFast(page, '/worker/today');
    await page.waitForTimeout(600);
    const text = await bodyText(page);
    expect(text).toMatch(/Worker|Today|Jobs|Messages|Help/i);
    expect(text).not.toMatch(/invalid|incorrect|wrong|failed|try again|required|not found/i);
  });
});
