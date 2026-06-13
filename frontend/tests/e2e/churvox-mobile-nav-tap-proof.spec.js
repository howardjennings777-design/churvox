const { test, expect } = require('@playwright/test');

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'https://www.churvox.com';
const EMAIL = process.env.CHURVOX_E2E_EMAIL || '';
const PASS = process.env.CHURVOX_E2E_PASSWORD || '';

const url = (path) => new URL(path, BASE).toString();

async function wait(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(900);
}

async function loginThroughBrowser(page) {
  await page.goto(url('/login'));
  await wait(page);

  await page.getByLabel(/email/i).first().fill(EMAIL);
  await page.getByLabel(/password/i).first().fill(PASS);
  await page.getByRole('button', { name: /sign in|log in|login/i }).click();

  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1600);

  console.log('MOBILE_NAV_LOGIN_URL=' + page.url());
}

function key(label) {
  return label.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
}

async function tapMainMobileNav(page, label, expectedHash) {
  const nav = page.locator('.freshMobileNav');
  await expect(nav).toBeVisible({ timeout: 30000 });

  const button = nav.locator('button', { hasText: label }).first();
  await expect(button).toBeVisible({ timeout: 30000 });

  const box = await button.boundingBox();
  console.log(`MOBILE_NAV_${key(label)}_BOX=` + JSON.stringify(box));

  await button.click({ timeout: 15000 });
  await wait(page);

  const current = page.url();
  console.log(`MOBILE_NAV_TAPPED_${key(label)}=` + current);
  expect(current.toLowerCase()).toContain(`#${expectedHash}`.toLowerCase());
}

async function tapMoreMobileNav(page, label, expectedHash) {
  const nav = page.locator('.freshMobileNav');
  await expect(nav).toBeVisible({ timeout: 30000 });

  const moreButton = nav.locator('button', { hasText: 'More' }).first();
  await expect(moreButton).toBeVisible({ timeout: 30000 });
  await moreButton.click({ timeout: 15000 });
  await wait(page);

  const more = page.locator('.freshMobileMore');
  await expect(more).toBeVisible({ timeout: 30000 });

  const button = more.locator('button', { hasText: label }).first();
  await expect(button).toBeVisible({ timeout: 30000 });

  const box = await button.boundingBox();
  console.log(`MOBILE_MORE_${key(label)}_BOX=` + JSON.stringify(box));

  await button.click({ timeout: 15000 });
  await wait(page);

  const current = page.url();
  console.log(`MOBILE_MORE_TAPPED_${key(label)}=` + current);
  expect(current.toLowerCase()).toContain(`#${expectedHash}`.toLowerCase());
}

test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 3,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36',
});

test('mobile command nav taps are not blocked by overlays', async ({ page }) => {
  await loginThroughBrowser(page);

  await page.goto(url('/dashboard'));
  await wait(page);

  await expect(page.locator('.freshMobileNav')).toBeVisible({ timeout: 30000 });
  console.log('MOBILE_NAV_VISIBLE=true');

  await tapMainMobileNav(page, 'Jobs', 'jobs');
  await tapMainMobileNav(page, 'Command', 'command');

  await tapMoreMobileNav(page, 'Clients', 'clients');
  await tapMoreMobileNav(page, 'Quotes', 'quotes');
  await tapMoreMobileNav(page, 'Invoices', 'invoices');
  await tapMoreMobileNav(page, 'Team', 'team');
  await tapMoreMobileNav(page, 'Plans', 'plans');
  await tapMoreMobileNav(page, 'Settings', 'settings');

  console.log('MOBILE_NAV_TAP_PROOF=passed');
});
