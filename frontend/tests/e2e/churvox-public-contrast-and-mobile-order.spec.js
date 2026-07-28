const { test, expect } = require('@playwright/test');

function brightness(color) {
  const values = String(color || '').match(/[\d.]+/g)?.slice(0, 3).map(Number) || [];
  if (values.length !== 3) return 0;
  return (values[0] * 0.2126) + (values[1] * 0.7152) + (values[2] * 0.0722);
}

async function expectReadableText(page, selector, minimumBrightness = 145) {
  const locator = page.locator(selector).filter({ visible: true }).first();
  await expect(locator, `${selector} should be visible`).toBeVisible();
  const result = await locator.evaluate((element) => {
    const style = window.getComputedStyle(element);
    return {
      color: style.color,
      fill: style.webkitTextFillColor || '',
      text: String(element.textContent || '').replace(/\s+/g, ' ').trim(),
    };
  });
  expect(result.text, `${selector} should contain useful copy`).not.toBe('');
  const measured = brightness(result.fill && result.fill !== 'rgba(0, 0, 0, 0)' ? result.fill : result.color);
  expect(measured, `${selector} is too dark on the premium public shell: ${JSON.stringify(result)}`).toBeGreaterThanOrEqual(minimumBrightness);
}

async function openPublicPage(page, route) {
  const response = await page.goto(route, { waitUntil: 'networkidle' });
  expect(response?.status(), `${route} should load`).toBe(200);
  await page.waitForTimeout(450);
}

const readablePages = [
  {
    name: 'home',
    route: '/',
    checks: [
      ['.cvSignalStage .cvSceneIntro h2', 185],
      ['.cvSignalStage .cvSceneIntro p', 145],
      ['.cvControlStage .cvSceneIntro h2', 185],
      ['.cvControlLine p', 140],
    ],
  },
  {
    name: 'product',
    route: '/product/',
    checks: [
      ['.cvProductSpine .cvSceneIntro h2', 185],
      ['.cvRoomEntry p', 140],
      ['.cvFieldCopy .cvSceneIntro h2', 185],
      ['.cvHandoffLine p', 140],
    ],
  },
  {
    name: 'pricing',
    route: '/pricing/',
    checks: [
      ['.cvPlanStage .cvSceneIntro h2', 185],
      ['.cvPlanDetail h2', 185],
      ['.cvPlanSummary', 145],
      ['.cvPlanFeatures li', 155],
      ['.cvAddonRail p', 140],
    ],
  },
  {
    name: 'signup',
    route: '/signup/?plan=operator',
    checks: [
      ['.cvPublicAuthCard h1', 185],
      ['.cvPublicAuthCard .cvPublicAuthIntro', 145],
      ['.cvPublicAuthCard label', 155],
      ['.cvPublicAuthBottom', 145],
    ],
  },
  {
    name: 'privacy',
    route: '/legal/privacy/',
    checks: [
      ['.cp26LegalWorld article h1', 185],
      ['.cp26LegalWorld article h2', 185],
      ['.cp26LegalWorld article header p', 145],
      ['.cp26LegalWorld article section p', 145],
    ],
  },
  {
    name: 'terms',
    route: '/legal/terms/',
    checks: [
      ['.cp26LegalWorld article h1', 185],
      ['.cp26LegalWorld article h2', 185],
      ['.cp26LegalWorld article header p', 145],
      ['.cp26LegalWorld article section p', 145],
    ],
  },
];

for (const item of readablePages) {
  test(`${item.name} keeps important public copy readable`, async ({ page }, testInfo) => {
    await openPublicPage(page, item.route);
    for (const [selector, minimum] of item.checks) await expectReadableText(page, selector, minimum);
    await testInfo.attach(`${testInfo.project.name}-${item.name}.png`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });
  });
}

test('signup puts the form before reassurance on mobile', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'), 'Mobile order only');
  await openPublicPage(page, '/signup/?plan=operator');
  const positions = await page.evaluate(() => {
    const card = document.querySelector('.cvPublicAuthCard')?.getBoundingClientRect();
    const panel = document.querySelector('.cvPublicAuthPanel')?.getBoundingClientRect();
    return { cardTop: card?.top ?? 999999, panelTop: panel?.top ?? -1 };
  });
  expect(positions.cardTop, JSON.stringify(positions)).toBeLessThan(positions.panelTop);
});

test('mobile public header keeps trial action visible beside Menu', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'), 'Mobile navigation only');
  const routes = ['/', '/product/', '/pricing/', '/demo/', '/security/', '/contact/'];
  for (const route of routes) {
    await openPublicPage(page, route);
    const header = page.locator('.cpWorldTopbar');
    const cta = header.locator('.cp26NavActions .cp26Button');
    const menu = header.locator('.cpWorldMenu');
    await expect(cta, `${route} should keep Start free trial visible`).toBeVisible();
    await expect(cta).toHaveText(/Start free trial/i);
    await expect(menu).toBeVisible();
    const box = await cta.boundingBox();
    const viewport = page.viewportSize();
    expect(box?.height || 0, `${route} CTA should remain tappable`).toBeGreaterThanOrEqual(40);
    expect((box?.x || 0) + (box?.width || 0), `${route} CTA should stay inside the phone viewport`).toBeLessThanOrEqual((viewport?.width || 0) + 1);
    await menu.click();
    await expect(header.locator('.cpWorldNavLinks.open')).toBeVisible();
    await menu.click();
  }
});
