const { test, expect } = require('@playwright/test');

function json(body, status = 200) {
  return { status, contentType: 'application/json', body: JSON.stringify(body) };
}

async function installPublicApi(page) {
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;

    if (/\/api\/auth\/(?:me|check|session)$/.test(path)) return route.fulfill(json({ detail: 'Not authenticated' }, 401));
    if (path === '/api/platform/visit') return route.fulfill(json({ ok: true }));

    if (path === '/api/public/invoice/paid-token') {
      return route.fulfill(json({
        success: true,
        invoice: {
          invoice_number: 'INV-PAID-1',
          customer_name: 'Paid Customer',
          description: 'Completed service',
          line_items: [{ description: 'Completed service', quantity: 1, unit_price: 115, amount: 115 }],
          subtotal: 100,
          gst_rate: 15,
          gst_amount: 15,
          total: 115,
          amount_paid: 115,
          amount_due: 0,
          status: 'paid',
          payment_link: 'https://example.com/should-not-show',
          business_snapshot: { business_name: 'Proof Business', currency: 'NZD' },
        },
      }));
    }

    if (path === '/api/public/invoice/missing-token') return route.fulfill(json({ detail: 'Invoice not found' }, 404));

    if (path === '/api/public/quote/accepted-token') {
      return route.fulfill(json({
        success: true,
        quote: {
          quote_number: 'QUO-ACCEPTED-1',
          customer_name: 'Accepted Customer',
          job_description: 'Accepted work',
          line_items: [{ description: 'Accepted work', quantity: 1, unit_price: 230, amount: 230 }],
          subtotal: 200,
          gst_rate: 15,
          gst_amount: 30,
          total: 230,
          status: 'accepted',
          business_snapshot: { business_name: 'Quote Business', currency: 'NZD' },
        },
      }));
    }

    if (path === '/api/public/client-portal/not-ready-token') {
      return route.fulfill(json({
        success: true,
        portal: {
          customer_name: 'Portal Customer',
          job_title: 'Work in progress',
          work_status: 'in_progress',
          approval_status: '',
          customer_summary: 'The business has not marked this complete.',
          photos: [],
          business_snapshot: { business_name: 'Portal Business' },
        },
      }));
    }

    if (path === '/api/public/proof/proof-token') {
      return route.fulfill(json({
        success: true,
        proof_pack: {
          job_title: 'Completed lawn service',
          customer_name: 'Proof Customer',
          customer_summary: 'Lawn service complete.',
          customer_message: 'Thanks for your business.',
          invoice_id: 'internal-invoice-object-id-123',
          invoice_number: 'INV-100',
          total: 95,
          currency: 'NZD',
          photos: [],
          business_snapshot: { business_name: 'Proof Business' },
        },
      }));
    }

    return route.fulfill(json({ success: true, data: [] }));
  });
}

test.describe('Public customer documents paid-launch behaviour', () => {
  test.beforeEach(async ({ page }) => installPublicApi(page));

  test('paid invoice shows zero due and no payment control', async ({ page }) => {
    await page.goto('/invoice/paid-token', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('INV-PAID-1')).toBeVisible();
    await expect(page.getByText('Paid', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('$0.00', { exact: true }).last()).toBeVisible();
    await expect(page.getByRole('link', { name: /pay securely/i })).toHaveCount(0);
  });

  test('accepted quote is final and cannot be accepted or declined again', async ({ page }) => {
    await page.goto('/quote/accepted-token', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('QUO-ACCEPTED-1')).toBeVisible();
    await expect(page.getByText('Accepted', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Accepted', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Decline', exact: true })).toBeDisabled();
    await expect(page.getByText(/Your response is recorded as accepted/i)).toBeVisible();
  });

  test('client portal does not allow approval before completion', async ({ page }) => {
    await page.goto('/client/not-ready-token', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Work in progress')).toBeVisible();
    await expect(page.getByText('Not ready for approval')).toBeVisible();
    await expect(page.getByRole('button', { name: /approve completed work/i })).toHaveCount(0);
  });

  test('proof page does not display raw internal record identifiers', async ({ page }) => {
    await page.goto('/proof/proof-token', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Completed lawn service')).toBeVisible();
    await expect(page.getByText('Invoice attached to the business record')).toBeVisible();
    await expect(page.getByText('internal-invoice-object-id-123')).toHaveCount(0);
  });

  test('invalid invoice link gives a useful support path', async ({ page }) => {
    await page.goto('/invoice/missing-token', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Invoice unavailable' })).toBeVisible();
    await expect(page.getByRole('link', { name: /contact Churvox support/i })).toHaveAttribute('href', /mailto:hello@churvox\.com/i);
  });
});
