const { test, expect } = require('@playwright/test');

const RUN_SIGNUP = /^(1|true|yes)$/i.test(process.env.CHURVOX_E2E_SIGNUP || '');
const BASE_EMAIL = process.env.CHURVOX_E2E_SIGNUP_BASE_EMAIL || process.env.CHURVOX_E2E_EMAIL || '';

function uniqueEmail() {
  const [name, domain] = String(BASE_EMAIL || '').split('@');
  if (!name || !domain) throw new Error('Set CHURVOX_E2E_SIGNUP_BASE_EMAIL or CHURVOX_E2E_EMAIL to a real plus-address capable inbox.');
  return `${name}+paidlaunch-${Date.now()}@${domain}`.toLowerCase();
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

function isStripeCheckoutUrl(url) {
  return /https:\/\/checkout\.stripe\.com\//i.test(String(url || ''));
}

test('real owner signup records consent, preserves Operator and opens Stripe', async ({ page }) => {
  test.setTimeout(120000);
  test.skip(!RUN_SIGNUP, 'Set CHURVOX_E2E_SIGNUP=1 because this creates a real production test owner.');
  test.skip(!BASE_EMAIL, 'Set a real signup email base.');

  const email = uniqueEmail();
  const password = `Churvox-${Date.now()}-Owner`;
  const registerResponses = [];
  const checkoutRequests = [];

  page.on('response', async (response) => {
    if (!response.url().includes('/api/auth/register')) return;
    let body = {};
    try { body = await response.json(); } catch {}
    registerResponses.push({ status: response.status(), body });
  });
  page.on('request', (request) => {
    if (!request.url().includes('/billing/create-checkout-session') || request.method() !== 'POST') return;
    let payload = {};
    try { payload = request.postDataJSON(); } catch {}
    checkoutRequests.push(payload);
  });

  await page.goto('/signup?plan=operator&country=NZ', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(/Selected plan:\s*Operator/i)).toBeVisible();

  expect(await fillFirst(page, ['input[name="name"]'], 'Paid Launch Signup Owner')).toBeTruthy();
  expect(await fillFirst(page, ['input[name="email"]'], email)).toBeTruthy();
  await fillFirst(page, ['input[name="business_name"]'], `Paid Launch Business ${Date.now()}`);

  const passwords = page.locator('input[type="password"]');
  await expect(passwords).toHaveCount(2);
  await passwords.nth(0).fill(password);
  await passwords.nth(1).fill(password);
  await page.locator('input[name="termsAccepted"]').check();
  await page.getByRole('button', { name: 'Create account and choose plan' }).click();

  await page.waitForURL(/\/plans/i, { timeout: 45000 });
  await expect(page.locator('body')).toContainText(/Selected\s*Operator|Operator/i);
  expect(registerResponses.length, 'Expected a registration response.').toBeGreaterThan(0);
  const registration = registerResponses.at(-1);
  expect(registration.status, JSON.stringify(registration.body)).toBeLessThan(400);
  expect(registration.body?.email_verification_sent, registration.body?.email_verification_error || 'Verification email did not send').toBeTruthy();
  expect(registration.body?.email_verification_provider).toBe('postmark');

  const stripeNavigation = page.waitForURL(/checkout\.stripe\.com/i, { timeout: 45000 }).then(() => true).catch(() => false);
  await page.getByRole('button', { name: 'Start free trial' }).click();
  const reachedStripe = await stripeNavigation;
  expect(checkoutRequests.length, 'Expected checkout request.').toBeGreaterThan(0);
  const checkout = checkoutRequests.at(-1);
  expect(String(checkout.plan || '')).toMatch(/pro|operator/i);
  expect(String(checkout.selected_plan || '')).toBe('operator');
  expect(String(checkout.country || '')).toBe('NZ');
  expect(reachedStripe || isStripeCheckoutUrl(page.url()), `Stripe did not open. URL: ${page.url()}`).toBeTruthy();
});
