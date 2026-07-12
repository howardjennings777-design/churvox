const { test, expect } = require('@playwright/test');

const RUN_SIGNUP = /^(1|true|yes)$/i.test(process.env.CHURVOX_E2E_SIGNUP || '');
const BASE_EMAIL = process.env.CHURVOX_E2E_SIGNUP_BASE_EMAIL || 'howardjennings777@gmail.com';

function uniqueEmail() {
  const [name, domain] = BASE_EMAIL.split('@');
  return `${name || 'churvox.e2e'}+signup-${Date.now()}@${domain || 'gmail.com'}`.toLowerCase();
}

async function fillFirst(page, selectors, value) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (await locator.isVisible().catch(() => false)) {
      await locator.fill(value);
      return true;
    }
  }
  return false;
}

async function clickText(page, texts) {
  for (const value of texts) {
    const locator = page.getByText(value, { exact: false }).first();
    if (await locator.isVisible().catch(() => false)) {
      await locator.click();
      return true;
    }
  }
  return false;
}

function isStripeCheckoutUrl(url) {
  return /https:\/\/checkout\.stripe\.com\//i.test(String(url || ''));
}

test.describe('Fresh customer signup to Stripe launch path', () => {
  test('new owner keeps the chosen plan, reaches Plans, and opens Stripe checkout', async ({ page }) => {
    test.skip(!RUN_SIGNUP, 'Set CHURVOX_E2E_SIGNUP=1 because this creates a real test owner account.');

    const billingRequests = [];
    page.on('request', (request) => {
      const url = request.url();
      if (!url.includes('/billing/') && !url.includes('stripe')) return;
      let payload = null;
      try { payload = request.postDataJSON(); } catch {}
      billingRequests.push({ method: request.method(), url, payload });
    });

    const email = uniqueEmail();
    const secret = `Churvox${Date.now()}!`;
    const businessName = `Playwright Signup ${Date.now()}`;

    await page.goto('/signup?plan=operator&country=NZ', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toContainText(/Create your Churvox account|Create account/i);
    await expect(page.locator('body')).toContainText(/Selected plan:\s*Operator/i);

    expect(await fillFirst(page, ['input[name="name"]', 'input[autocomplete="name"]'], 'Playwright Signup Owner')).toBeTruthy();
    expect(await fillFirst(page, ['input[name="email"]', 'input[type="email"]'], email)).toBeTruthy();
    await fillFirst(page, ['input[name="business_name"]', 'input[autocomplete="organization"]'], businessName);

    const passwordInputs = page.locator('input[type="password"]');
    await expect(passwordInputs).toHaveCount(2);
    await passwordInputs.nth(0).fill(secret);
    await passwordInputs.nth(1).fill(secret);

    expect(await clickText(page, ['Create account and choose plan', 'Create account'])).toBeTruthy();
    await page.waitForURL(/\/plans/i, { timeout: 45000 });
    await page.waitForLoadState('domcontentloaded');

    const body = page.locator('body');
    await expect(body).toContainText(/Churvox pricing|Current plan|14-day trial/i, { timeout: 30000 });
    await expect(body).toContainText(/Selected\s*Operator|Operator/i);
    await expect(body).not.toContainText(/Checkout trace|Non-JSON response|Plans need attention/i);

    const beforeClickUrl = page.url();
    const stripeNavigation = page.waitForURL(/checkout\.stripe\.com/i, { timeout: 45000 }).then(() => true).catch(() => false);
    expect(await clickText(page, ['Start free trial'])).toBeTruthy();

    const reachedStripeByWait = await stripeNavigation;
    const afterClickUrl = page.url();
    const reachedStripe = reachedStripeByWait || isStripeCheckoutUrl(afterClickUrl);

    const checkoutRequest = billingRequests.find((item) => item.method === 'POST' && item.url.includes('/billing/create-checkout-session'));
    expect(checkoutRequest, `Expected checkout request. Seen: ${JSON.stringify(billingRequests.slice(-20), null, 2)}`).toBeTruthy();
    expect(String(checkoutRequest?.payload?.plan || '')).toMatch(/pro|operator/i);
    expect(String(checkoutRequest?.payload?.selected_plan || '')).toMatch(/operator/i);
    expect(String(checkoutRequest?.payload?.country || '')).toBe('NZ');

    if (!reachedStripe) {
      const visibleText = await page.locator('body').innerText({ timeout: 5000 }).catch(() => 'Could not read page body');
      throw new Error([
        'Stripe checkout did not open.',
        `Before click URL: ${beforeClickUrl}`,
        `After click URL: ${afterClickUrl}`,
        `Billing requests: ${JSON.stringify(billingRequests.slice(-20), null, 2)}`,
        `Visible body: ${String(visibleText).slice(0, 1400)}`,
      ].join('\n'));
    }

    expect(page.url()).toMatch(/checkout\.stripe\.com/i);
    await expect(page.locator('body')).toContainText(/Churvox|trial|subscribe|start/i, { timeout: 30000 });
  });
});
