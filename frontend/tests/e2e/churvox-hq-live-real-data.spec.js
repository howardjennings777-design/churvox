const { test, expect } = require('@playwright/test');

const OWNER_EMAIL = process.env.CHURVOX_OWNER_EMAIL || process.env.CHURVOX_E2E_OWNER_EMAIL || process.env.CHURVOX_E2E_EMAIL || '';
const OWNER_PASSWORD = process.env.CHURVOX_OWNER_PASSWORD || process.env.CHURVOX_E2E_OWNER_PASSWORD || process.env.CHURVOX_E2E_PASSWORD || '';
const API_BASE = (process.env.PLAYWRIGHT_API_BASE || 'https://grassley-backend.onrender.com').replace(/\/+$/, '');

function apiUrl(path) {
  return `${API_BASE}${path.startsWith('/api') ? path : `/api${path}`}`;
}

function tokenFrom(data = {}) {
  return data?.token || data?.access_token || data?.auth_token || data?.user?.token || data?.user?.access_token || '';
}

async function login(page) {
  if (!OWNER_EMAIL || !OWNER_PASSWORD) {
    throw new Error('Set CHURVOX_OWNER_EMAIL and CHURVOX_OWNER_PASSWORD for the authenticated HQ live smoke.');
  }
  const response = await page.request.post(apiUrl('/api/auth/login'), {
    data: { email: OWNER_EMAIL, password: OWNER_PASSWORD },
    timeout: 30_000,
  });
  const body = await response.json().catch(async () => ({ text: await response.text().catch(() => '') }));
  if (!response.ok() || body?.success === false) {
    throw new Error(`HQ owner login failed ${response.status()} ${JSON.stringify(body).slice(0, 500)}`);
  }
  const token = tokenFrom(body);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate((value) => { if (value) localStorage.setItem('token', value); }, token);
  return token;
}

async function getReport(page, token) {
  const response = await page.request.get(apiUrl('/api/admin/owner/paid-launch-report'), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    timeout: 45_000,
  });
  const body = await response.json().catch(async () => ({ text: await response.text().catch(() => '') }));
  expect(response.ok(), `paid-launch report failed ${response.status()} ${JSON.stringify(body).slice(0, 600)}`).toBeTruthy();
  expect(body?.success).toBe(true);
  return body;
}

function assertBillingTruth(report) {
  expect(report.source).toBe('live_database_and_stripe_v3');
  expect(report.truth?.sample_records_included).toBe(false);
  expect(report.truth?.paid_definition).toBe('stripe_subscription_status_active');
  expect(report.truth?.trial_definition).toBe('stripe_subscription_status_trialing');
  expect(report.truth?.mrr_definition).toBe('active_stripe_subscription_price_items_only');
  expect(report.truth?.price_definition).toBe('active_nzd_monthly_prices_matching_locked_plan_amounts');
  expect(report.truth?.subscription_id_alone_is_not_paid).toBe(true);
  expect(report.truth?.database_status_is_not_billing_truth).toBe(true);
  expect(report.truth?.stripe_credentials_verified).toBe(true);
  expect(report.truth?.prices_live_verified).toBe(true);
  expect(report.truth?.zero_mrr_is_zero).toBe(true);
  expect(report.truth?.testers_excluded_from_billing).toBe(true);
  expect(report.truth?.estimate_is_separate).toBe(true);
  expect(typeof report.counts?.verified_paid_users).toBe('number');
  expect(typeof report.counts?.verified_trial_users).toBe('number');
  expect(typeof report.counts?.tester_users).toBe('number');
  expect(typeof report.counts?.billing_needs_verification).toBe('number');
  expect(report.collections?.connected).toBe(true);
  expect(Array.isArray(report.collections?.names)).toBe(true);
  expect(Array.isArray(report.launch_checks)).toBe(true);
  expect(report.launch_checks.length).toBeGreaterThan(5);

  const generatedAt = new Date(report.generated_at).getTime();
  expect(Number.isFinite(generatedAt)).toBe(true);
  expect(Date.now() - generatedAt, 'HQ report must be freshly generated').toBeLessThan(10 * 60 * 1000);

  const checks = new Map(report.launch_checks.map((item) => [item.key, item]));
  for (const key of ['database', 'owner_lock', 'stripe', 'prices', 'billing_truth', 'webhooks', 'email']) {
    expect(checks.has(key), `paid-launch report is missing ${key} check`).toBe(true);
    expect(['pass', 'warn', 'fail']).toContain(checks.get(key).status);
  }
  const hardFailures = ['database', 'owner_lock', 'stripe', 'prices', 'billing_truth', 'webhooks']
    .filter((key) => checks.get(key)?.status === 'fail');
  expect(report.ready_to_take_payments).toBe(hardFailures.length === 0);

  expect(report.billing?.stripe?.credential_verified).toBe(true);
  expect(String(report.billing?.stripe?.account_id || '')).not.toBe('');
  expect(report.billing?.stripe_price_validation?.valid).toBe(true);
  expect(report.billing?.stripe_price_validation?.checked).toBe(4);
  for (const price of report.billing?.stripe_price_validation?.prices || []) {
    expect(price.valid, `${price.plan || price.env_key} live Stripe price is not the locked monthly NZD amount`).toBe(true);
  }

  const stripeStatuses = new Map((report.billing?.stripe?.active_subscriptions || []).map((item) => [
    String(item.subscription_id || '').trim(),
    String(item.status || '').toLowerCase(),
  ]));
  const verifiedKeys = new Set();

  for (const row of report.billing?.verified_paid_users || []) {
    const subscriptionId = String(row.stripe_subscription_id || '').trim();
    expect(String(row.subscription_status || '').toLowerCase()).toBe('active');
    expect(subscriptionId, `verified paid row lacks Stripe proof: ${row.email}`).not.toBe('');
    expect(stripeStatuses.get(subscriptionId), `Stripe did not confirm active status for ${row.email}`).toBe('active');
    expect(String(row.email || '').toLowerCase()).not.toMatch(/example\.com|mailinator|tempmail/);
    verifiedKeys.add(subscriptionId || String(row.email || '').toLowerCase());
  }
  for (const row of report.billing?.verified_trial_users || []) {
    const subscriptionId = String(row.stripe_subscription_id || '').trim();
    expect(String(row.subscription_status || '').toLowerCase()).toBe('trialing');
    expect(subscriptionId, `verified trial row lacks Stripe proof: ${row.email}`).not.toBe('');
    expect(stripeStatuses.get(subscriptionId), `Stripe did not confirm trialing status for ${row.email}`).toBe('trialing');
    verifiedKeys.add(subscriptionId || String(row.email || '').toLowerCase());
  }
  for (const row of report.billing?.needs_verification || []) {
    const key = String(row.stripe_subscription_id || '').trim() || String(row.email || '').toLowerCase();
    expect(verifiedKeys.has(key), `unverified row is also counted as verified: ${row.email}`).toBe(false);
  }
  for (const row of report.billing?.tester_users || []) {
    expect(String(row.email || '').toLowerCase()).not.toMatch(/example\.com|mailinator|tempmail/);
    const key = String(row.stripe_subscription_id || '').trim() || String(row.email || '').toLowerCase();
    expect(verifiedKeys.has(key), `tester is also counted as paid/trial: ${row.email}`).toBe(false);
  }

  expect(report.counts.verified_paid_users).toBe((report.billing?.verified_paid_users || []).length);
  expect(report.counts.verified_trial_users).toBe((report.billing?.verified_trial_users || []).length);
  expect(report.counts.tester_users).toBe((report.billing?.tester_users || []).length);
  expect(report.counts.billing_needs_verification).toBe((report.billing?.needs_verification || []).length);

  const actualMrr = report.billing?.actual_mrr_nzd;
  expect(typeof actualMrr).toBe('number');
  expect(typeof report.billing?.estimated_mrr_nzd).toBe('number');
  expect(actualMrr).toBe(report.billing?.stripe?.paid_mrr_by_currency?.nzd || 0);
  if (report.counts.verified_paid_users === 0) expect(actualMrr).toBe(0);
}

function expectedMoney(value) {
  if (value === null || value === undefined || value === '') return 'Unavailable';
  return Number(value).toLocaleString('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 2 });
}

test.describe('Live authenticated paid-launch HQ', () => {
  test.setTimeout(150_000);

  test('real backend report and current /admin display agree without inferred billing', async ({ page }) => {
    const token = await login(page);
    const report = await getReport(page, token);
    assertBillingTruth(report);

    await page.goto('/admin', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-version="CHURVOX_HQ_SYSTEM_TESTER_REVOKE_FIXED_20260712"]')).toBeVisible({ timeout: 30_000 });

    const paidMetric = page.locator('.hq2Metric').filter({ hasText: 'Verified paid' }).first();
    await expect(paidMetric.locator('strong')).toHaveText(Number(report.counts.verified_paid_users).toLocaleString('en-NZ'));

    const mrrMetric = page.locator('.hq2Metric').filter({ hasText: 'Stripe MRR' }).first();
    await expect(mrrMetric.locator('strong')).toHaveText(expectedMoney(report.billing.actual_mrr_nzd));

    const stateMetric = page.locator('.hq2Metric').filter({ hasText: 'Launch state' }).first();
    await expect(stateMetric.locator('strong')).toHaveText(report.ready_to_take_payments ? 'Confirmed' : 'Check');

    for (const check of report.launch_checks) {
      await expect(page.getByText(check.label, { exact: true }).first()).toBeVisible();
    }

    const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
    expect(body).not.toMatch(/Belmont Villas|Example client|Sample workspace|Starter structure/i);

    await page.getByRole('button', { name: 'System', exact: true }).click();
    await expect(page.getByText('paid-launch-report', { exact: false })).toBeVisible();
    await expect(page.getByText(report.collections.connected ? 'connected' : 'unavailable', { exact: false })).toBeVisible();
  });
});
