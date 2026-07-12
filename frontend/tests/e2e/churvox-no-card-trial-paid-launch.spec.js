const { test, expect } = require('@playwright/test');

const RUN_SIGNUP = /^(1|true|yes)$/i.test(process.env.CHURVOX_E2E_SIGNUP || '');
const BASE_EMAIL = process.env.CHURVOX_E2E_SIGNUP_BASE_EMAIL || process.env.CHURVOX_E2E_EMAIL || '';

function uniqueEmail() {
  const [name, domain] = String(BASE_EMAIL || '').split('@');
  if (!name || !domain) throw new Error('Set a real plus-address capable signup email.');
  return `${name}+nocard-${Date.now()}@${domain}`.toLowerCase();
}

async function fillSignup(page, email, password) {
  await page.getByLabel('Full name').fill('No Card Trial Proof');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Business name').fill(`No Card Trial ${Date.now()}`);
  const passwords = page.locator('input[type="password"]');
  await passwords.nth(0).fill(password);
  await passwords.nth(1).fill(password);
  await page.locator('input[name="termsAccepted"]').check();
}

function visibleCardInputs(page) {
  return page.locator([
    'input[autocomplete="cc-number"]',
    'input[name*="card" i]',
    'input[id*="card" i]',
    '[data-testid*="card" i] input',
  ].join(','));
}

test('live 14-day trial reaches Stripe without requiring card details', async ({ page }) => {
  test.setTimeout(150000);
  test.skip(!RUN_SIGNUP, 'Set CHURVOX_E2E_SIGNUP=1 because this creates a real production test owner.');
  test.skip(!BASE_EMAIL, 'Set a real signup email base.');

  const email = uniqueEmail();
  const password = `NoCard-${Date.now()}-Owner`;

  await page.goto('/signup?plan=operator&country=NZ', { waitUntil: 'domcontentloaded' });
  await fillSignup(page, email, password);
  await page.getByRole('button', { name: 'Create account and choose plan' }).click();
  await page.waitForURL(/\/plans/i, { timeout: 45000 });

  await page.getByRole('button', { name: 'Start free trial' }).click();
  await page.waitForURL(/checkout\.stripe\.com/i, { timeout: 45000 });
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2500);

  const body = page.locator('body');
  await expect(body).toContainText(/14[- ]day|trial/i);
  await expect(visibleCardInputs(page), 'The published trial promises no card upfront. Stripe must not render card-entry fields.').toHaveCount(0);

  const paymentText = await body.innerText().catch(() => '');
  expect(paymentText).not.toMatch(/card number|credit card|debit card|payment method required/i);
});
