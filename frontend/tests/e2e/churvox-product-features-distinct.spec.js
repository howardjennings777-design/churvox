const { test, expect } = require('@playwright/test');
const crypto = require('crypto');

async function open(page, route) {
  const response = await page.goto(route, { waitUntil: 'networkidle' });
  expect(response?.status(), `${route} should load`).toBe(200);
  await page.waitForTimeout(500);
  const overflow = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
  expect(overflow, `${route} should not overflow horizontally`).toBeLessThanOrEqual(2);
}

function digest(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

test('Product and Features are genuinely different public pages', async ({ page }, testInfo) => {
  await open(page, '/product/');
  await expect(page.locator('main[data-room="product"]')).toBeVisible();
  await expect(page.locator('h1').first()).toContainText('Every part of the job');
  await expect(page.locator('.cvProductSpine')).toBeVisible();
  const product = await page.screenshot({ fullPage: true });

  await open(page, '/features/');
  await expect(page.locator('main[data-room="features"]')).toBeVisible();
  await expect(page.locator('h1').first()).toContainText('What Churvox actually does');
  await expect(page.locator('.cpfBoard')).toBeVisible();
  await expect(page.locator('.cpfFeature')).toHaveCount(6);
  await expect(page.locator('.cpfFeatureStage')).toContainText('Capture');
  await expect(page.locator('.cpfFeatureStage')).toContainText('Command');
  await expect(page.locator('.cpfFeatureStage')).toContainText('Handoff');
  const features = await page.screenshot({ fullPage: true });

  expect(digest(features), 'Product and Features full-page screenshots must differ').not.toBe(digest(product));
  await testInfo.attach(`${testInfo.project.name}-product.png`, { body: product, contentType: 'image/png' });
  await testInfo.attach(`${testInfo.project.name}-features.png`, { body: features, contentType: 'image/png' });
});

test('Features has working conversion and navigation paths', async ({ page }) => {
  await open(page, '/features/');
  await expect(page.locator('a[href="/demo/"]').first()).toBeVisible();
  await expect(page.locator('a[href="/signup/?plan=operator"]').first()).toBeVisible();
  await expect(page.locator('footer a[href="/product/"]')).toHaveText(/Product overview/i);
  await expect(page.locator('footer a[href="/features/"]')).toHaveText(/Features/i);
  await expect(page.locator('footer a[href="/pricing/"]')).toBeVisible();

  const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
  expect(canonical).toBe('https://www.churvox.com/features/');
  await expect(page).toHaveTitle(/Churvox features/i);
});

test('Features remains readable and compact on mobile', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'), 'Mobile visual proof only');
  await open(page, '/features/');
  await expect(page.locator('.cpWorldTopbar .cp26NavActions .cp26Button')).toBeVisible();
  await expect(page.locator('.cpfFlowRail a')).toHaveCount(6);
  const featureBoxes = await page.locator('.cpfFeature').evaluateAll((items) => items.map((item) => {
    const box = item.getBoundingClientRect();
    return { width: box.width, left: box.left, right: box.right };
  }));
  const viewport = page.viewportSize();
  for (const box of featureBoxes) {
    expect(box.left).toBeGreaterThanOrEqual(-1);
    expect(box.right).toBeLessThanOrEqual((viewport?.width || 0) + 1);
    expect(box.width).toBeGreaterThan(250);
  }
});
