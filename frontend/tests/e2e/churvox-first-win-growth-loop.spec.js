const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

function json(body, status = 200) {
  return { status, contentType: 'application/json', body: JSON.stringify(body) };
}

function invoice({ paid = false } = {}) {
  return {
    invoice_number: 'INV-1001',
    customer_name: 'Alex Morgan',
    customer_email: 'alex@example.test',
    description: 'Property maintenance visit',
    line_items: [{ description: 'Property maintenance visit', quantity: 1, unit_price: 340, amount: 340 }],
    subtotal: 295.65,
    gst_rate: 15,
    gst_amount: 44.35,
    total: 340,
    amount_paid: paid ? 340 : 0,
    amount_due: paid ? 0 : 340,
    status: paid ? 'paid' : 'sent',
    payment_link: paid ? '' : 'https://checkout.stripe.com/c/pay/cs_test_first_win',
    business_snapshot: { business_name: "Sarah's Property Maintenance", currency: 'NZD' },
  };
}

test.describe('Churvox first-win growth loop', () => {
  test('Stripe return confirms the invoice through the public payment-status route', async ({ page }) => {
    await page.route('**/api/**', async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === '/api/platform/visit') return route.fulfill(json({ ok: true }));
      if (url.pathname === '/api/public/invoice/pay-token/payment-status') return route.fulfill(json({ success: true, paid: true, invoice: invoice({ paid: true }) }));
      if (url.pathname === '/api/public/invoice/pay-token') return route.fulfill(json({ success: true, invoice: invoice() }));
      if (/\/api\/auth\/(?:me|check|session)$/.test(url.pathname)) return route.fulfill(json({ detail: 'Not authenticated' }, 401));
      return route.fulfill(json({ success: true }));
    });

    await page.goto('/invoice/pay-token?payment=success&session_id=cs_test_first_win', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Payment confirmed. Thank you.')).toBeVisible();
    await expect(page.getByText('Paid', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /pay securely/i })).toHaveCount(0);
  });

  test('customer payment starts only through the approved public checkout endpoint', async ({ page }) => {
    let checkoutRequested = false;
    await page.route('https://checkout.stripe.com/**', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<h1>Secure Stripe checkout</h1>' }));
    await page.route('**/api/**', async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === '/api/platform/visit') return route.fulfill(json({ ok: true }));
      if (url.pathname === '/api/public/invoice/pay-token/checkout') {
        checkoutRequested = route.request().method() === 'POST';
        return route.fulfill(json({ success: true, paid: false, checkout_url: 'https://checkout.stripe.com/c/pay/cs_test_first_win' }));
      }
      if (url.pathname === '/api/public/invoice/pay-token') return route.fulfill(json({ success: true, invoice: invoice() }));
      if (/\/api\/auth\/(?:me|check|session)$/.test(url.pathname)) return route.fulfill(json({ detail: 'Not authenticated' }, 401));
      return route.fulfill(json({ success: true }));
    });

    await page.goto('/invoice/pay-token', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Pay securely', exact: true }).last().click();
    await expect(page.getByRole('heading', { name: 'Secure Stripe checkout' })).toBeVisible();
    expect(checkoutRequested).toBe(true);
  });

  test('public demo explains Sarah’s complete request-to-paid journey', async ({ page }) => {
    await page.route('**/api/**', async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === '/api/platform/visit') return route.fulfill(json({ ok: true }));
      if (/\/api\/auth\/(?:me|check|session)$/.test(url.pathname)) return route.fulfill(json({ detail: 'Not authenticated' }, 401));
      return route.fulfill(json({ success: true }));
    });

    await page.goto('/demo?industry=property-maintenance', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Sarah’s Property Maintenance').first()).toBeVisible();
    await page.getByRole('button', { name: /7 Paid/i }).click();
    await expect(page.getByText('The customer pays and Churvox verifies it')).toBeVisible();
    await expect(page.getByText('Stripe verified · invoice marked paid')).toBeVisible();
  });

  test('source contracts keep payment truth verified and onboarding real', async () => {
    const root = path.resolve(__dirname, '../../..');
    const checkout = fs.readFileSync(path.join(root, 'backend/churvox_invoice_checkout_patch.py'), 'utf8');
    const onboarding = fs.readFileSync(path.join(root, 'backend/churvox_first_win_onboarding_patch.py'), 'utf8');
    const guide = fs.readFileSync(path.join(root, 'frontend/src/runtime/churvoxFirstWinGuideEntryRuntime.js'), 'utf8');
    const invoicePage = fs.readFileSync(path.join(root, 'frontend/src/pages/public/PublicInvoicePage.js'), 'utf8');
    const webhook = fs.readFileSync(path.join(root, 'backend/churvox_stripe_payment_webhook_patch.py'), 'utf8');
    const core = fs.readFileSync(path.join(root, 'backend/churvox_payment_core.py'), 'utf8');

    expect(webhook).toContain('stripe.Webhook.construct_event');
    expect(core).toContain('STRIPE_WEBHOOK_SECRET');
    expect(webhook).toContain('checkout.session.async_payment_succeeded');
    expect(checkout).toContain('owner_approved');
    expect(checkout).toContain('stripe_account=account_id');
    expect(onboarding).toContain('"first_payment"');
    expect(onboarding).toContain('manual_acknowledged');
    expect(onboarding).not.toContain('$addToSet": {"manual_done"');
    expect(guide).toContain('One clear next step.');
    expect(guide).toContain("import('./churvoxFirstWinFeedbackRuntime')");
    expect(invoicePage).toContain('/payment-status?session_id=');
    expect(invoicePage).toContain('/checkout');
  });
});
