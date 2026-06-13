const { test, expect, devices } = require('@playwright/test');

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

async function tapMobileNav(page, label, expectedNeedle) {
  const nav = page.locator('.cvxMobileNav');
  await expect(nav).toBeVisible({ timeout: 30000 });

  const link = nav.locator('a', { hasText: label }).first();
  await expect(link).toBeVisible({ timeout: 30000 });

  await link.evaluate((el) => el.scrollIntoView({ block: 'nearest', inline: 'center' }));
  await page.waitForTimeout(300);

  const box = await link.boundingBox();
  console.log(`MOBILE_NAV_${key(label)}_BOX=` + JSON.stringify(box));

  await link.click({ timeout: 15000 });
  await wait(page);

  const current = page.url();
  console.log(`MOBILE_NAV_TAPPED_${key(label)}=` + current);
  expect(current.toLowerCase()).toContain(expectedNeedle.toLowerCase());
}

test.use({
  ...devices['iPhone 13'],
});

test('mobile command nav taps are not blocked by overlays', async ({ page }) => {
  await loginThroughBrowser(page);

  await page.goto(url('/dashboard'));
  await wait(page);

  await expect(page.locator('.cvxMobileNav')).toBeVisible({ timeout: 30000 });
  console.log('MOBILE_NAV_VISIBLE=true');

  await tapMobileNav(page, 'Jobs', 'jobs');
  await tapMobileNav(page, 'Clients', 'clients');
  await tapMobileNav(page, 'Quotes', 'quotes');
  await tapMobileNav(page, 'Invoices', 'invoices');
  await tapMobileNav(page, 'Team', 'team');
  await tapMobileNav(page, 'Plans', 'plans');
  await tapMobileNav(page, 'Settings', 'settings');

  console.log('MOBILE_NAV_TAP_PROOF=passed');
});
