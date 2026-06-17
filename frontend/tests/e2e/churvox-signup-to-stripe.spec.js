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

function isStripeCheckoutUrl(url) {
  return /https:\/\/checkout\.stripe\.com\//i.test(String(url || ''));
}

test.describe('Fresh customer signup to Stripe launch path', () => {
  test('new owner can sign up, land on Plans, and open Stripe checkout', async ({ page }) => {
    test.skip(!RUN_SIGNUP, 'Set CHURVOX_E2E_SIGNUP=1 because this creates a real test owner account.');

    const checkoutEvents = [];
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/billing/') || url.includes('stripe')) {
        checkoutEvents.push({ type: 'request', method: request.method(), url });
      }
    });
    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('/billing/') || url.includes('stripe')) {
        checkoutEvents.push({ type: 'response', status: response.status(), url });
      }
    });

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

    const beforeClickUrl = page.url();
    const stripeNavigation = page
      .waitForURL(/checkout\.stripe\.com/i, { timeout: 45000 })
      .then(() => true)
      .catch(() => false);

    const opened = await clickText(page, ['Start Stripe checkout']);
    expect(opened, 'Start Stripe checkout should be clickable').toBeTruthy();

    const reachedStripeByWait = await stripeNavigation;
    const afterClickUrl = page.url();
    const reachedStripe = reachedStripeByWait || isStripeCheckoutUrl(afterClickUrl);

    if (!reachedStripe) {
      await page.waitForTimeout(2500).catch(() => {});
      const finalUrl = page.url();
      const visibleText = await page.locator('body').innerText({ timeout: 5000 }).catch(() => 'Could not read page body');
      throw new Error([
        'Stripe checkout did not open.',
        `Before click URL: ${beforeClickUrl}`,
        `After click URL: ${afterClickUrl}`,
        `Final URL: ${finalUrl}`,
        `Checkout events: ${JSON.stringify(checkoutEvents.slice(-20), null, 2)}`,
        `Visible body: ${String(visibleText).slice(0, 1200)}`,
      ].join('\n'));
    }

    expect(page.url()).toMatch(/checkout\.stripe\.com/i);
    await expect(page.locator('body')).toContainText(/Start for free|Churvox|trial/i, { timeout: 30000 });
  });
});
