const { test, expect } = require('@playwright/test');

const RUN_SIGNUP = process.env.CHURVOX_E2E_SIGNUP === '1';
const BASE_EMAIL = process.env.CHURVOX_E2E_SIGNUP_BASE_EMAIL || 'howardjennings777@gmail.com';

function uniqueEmail() {
  const [name, domain] = BASE_EMAIL.split('@');
  return `${name || 'churvox.e2e'}+signup-${Date.now()}@${domain || 'gmail.com'}`.toLowerCase();
}

async function fillFirst(page, selectors, value) {
  for (const selector of selectors) {
    const loc = page.locator(selector).first();
    if (await loc.count().catch(() => 0)) {
      if (await loc.isVisible().catch(() => false)) {
        await loc.fill(value);
        return true;
      }
    }
  }
  return false;
}

async function clickText(page, texts) {
  for (const text of texts) {
    const loc = page.getByText(text, { exact: false }).first();
    if (await loc.count().catch(() => 0)) {
      if (await loc.isVisible().catch(() => false)) {
        await loc.click();
        return true;
      }
    }
  }
  return false;
}

test.describe('Fresh customer signup to Stripe launch path', () => {
  test('new owner can sign up, land on Plans, and open Stripe checkout', async ({ page }) => {
    test.skip(!RUN_SIGNUP, 'Set CHURVOX_E2E_SIGNUP=1 because this creates a real test owner account.');

    const email = uniqueEmail();
    const secret = `Churvox${Date.now()}!`;
    const businessName = `Playwright Signup ${Date.now()}`;

    await page.goto('/signup');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('body')).toContainText(/Create account|Start your Churvox trial/i);

    await fillFirst(page, ['input[name="name"]', 'input[autocomplete="name"]', 'input[placeholder*="name" i]'], 'Playwright Signup Owner');
    await fillFirst(page, ['input[name="email"]', 'input[type="email"]', 'input[placeholder*="email" i]'], email);
    await fillFirst(page, ['input[name="business_name"]', 'input[autocomplete="organization"]', 'input[placeholder*="business" i]'], businessName);

    const passInputs = page.locator('input[type="password"]');
    await expect(passInputs).toHaveCount(2);
    await passInputs.nth(0).fill(secret);
    await passInputs.nth(1).fill(secret);

    const created = await clickText(page, ['Create account and choose plan', 'Create account']);
    expect(created, 'signup submit should be clickable').toBeTruthy();

    await page.waitForURL(/plans/i, { timeout: 45000 });
    await page.waitForLoadState('domcontentloaded');

    const body = page.locator('body');
    await expect(body).toContainText(/Churvox pricing|Current plan|Start your 14-day trial/i, { timeout: 30000 });
    await expect(body).not.toContainText(/Non-JSON response/i);
    await expect(body).not.toContainText(/Plans need attention/i);

    const trace = await page.locator('[data-checkout-trace]').first().getAttribute('data-checkout-trace').catch(() => '');
    expect(trace || '', 'live Plans bundle should include latest auth recovery marker').toContain('auth-recover');

    const stripePromise = page.waitForURL(/checkout\.stripe\.com|stripe\.com/i, { timeout: 45000 }).catch(() => null);
    const opened = await clickText(page, ['Start Stripe checkout']);
    expect(opened, 'Start Stripe checkout should be clickable').toBeTruthy();

    const stripeUrl = await stripePromise;
    expect(stripeUrl, 'new signup should reach Stripe Checkout without completing payment').toBeTruthy();
    expect(page.url()).toMatch(/checkout\.stripe\.com|stripe\.com/i);
  });
});
