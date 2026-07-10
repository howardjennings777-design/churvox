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
  expect(report.source).toBe('live_database_and_stripe_v1');
  expect(report.truth?.sample_records_included).toBe(false);
  expect(report.truth?.paid_definition).toBe('active_or_paid_with_stripe_subscription_id');
  expect(report.truth?.estimate_is_separate).toBe(true);
  expect(typeof report.counts?.verified_paid_users).toBe('number');
  expect(typeof report.counts?.verified_trial_users).toBe('number');
  expect(typeof report.counts?.tester_users).toBe('number');
  expect(typeof report.counts?.billing_needs_verification).toBe('number');
  expect(report.collections?.connected).toBe(true);
  expect(Array.isArray(report.collections?.names)).toBe(true);
  expect(Array.isArray(report.launch_checks)).toBe(true);
  expect(report.launch_checks.length).toBeGreaterThan(2);

  const generatedAt = new Date(report.generated_at).getTime();
  expect(Number.isFinite(generatedAt)).toBe(true);
  expect(Date.now() - generatedAt, 'HQ report must be freshly generated').toBeLessThan(10 * 60 * 1000);

  for (const row of report.billing?.verified_paid_users || []) {
    expect(['active', 'paid']).toContain(String(row.subscription_status || '').toLowerCase());
    expect(String(row.stripe_subscription_id || '').trim(), `verified paid row lacks Stripe proof: ${row.email}`).not.toBe('');
    expect(String(row.email || '').toLowerCase()).not.toMatch(/example\.com|mailinator|tempmail/);
  }
  for (const row of report.billing?.verified_trial_users || []) {
    expect(['trial', 'trialing']).toContain(String(row.subscription_status || '').toLowerCase());
    expect(String(row.stripe_subscription_id || '').trim(), `verified trial row lacks Stripe proof: ${row.email}`).not.toBe('');
  }
  for (const row of report.billing?.needs_verification || []) {
    expect(String(row.stripe_subscription_id || '').trim(), `unverified row unexpectedly has Stripe proof: ${row.email}`).toBe('');
  }
  for (const row of report.billing?.tester_users || []) {
    expect(String(row.email || '').toLowerCase()).not.toMatch(/example\.com|mailinator|tempmail/);
  }

  const actualMrr = report.billing?.actual_mrr_nzd;
  expect(actualMrr === null || typeof actualMrr === 'number').toBe(true);
  expect(typeof report.billing?.estimated_mrr_nzd).toBe('number');
}

function expectedMoney(value) {
  if (value === null || value === undefined || value === '') return 'Unavailable';
  return Number(value).toLocaleString('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 2 });
}

test.describe('Live authenticated paid-launch HQ', () => {
  test.setTimeout(150_000);

  test('real backend report and /admin display agree without inferred billing', async ({ page }) => {
    const token = await login(page);
    const report = await getReport(page, token);
    assertBillingTruth(report);

    await page.goto('/admin', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-version="CHURVOX_REAL_PAID_LAUNCH_HQ_20260711"]')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('live_database_and_stripe_v1')).toBeVisible();
    await expect(page.getByText('active_or_paid_with_stripe_subscription_id')).toBeVisible();
    await expect(page.getByText('Excluded', { exact: true })).toBeVisible();

    const paidMetric = page.locator('.plhqMetric').filter({ hasText: 'Verified paid' }).first();
    await expect(paidMetric.locator('strong')).toHaveText(Number(report.counts.verified_paid_users).toLocaleString('en-NZ'));

    const mrrMetric = page.locator('.plhqMetric').filter({ hasText: 'Actual Stripe MRR' }).first();
    await expect(mrrMetric.locator('strong')).toHaveText(expectedMoney(report.billing.actual_mrr_nzd));

    const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
    expect(body).not.toMatch(/Belmont Villas|Example client|Sample workspace|Starter structure/i);

    await page.getByRole('button', { name: 'System' }).click();
    await expect(page.getByText('paid-launch-report', { exact: false })).toBeVisible();
    await expect(page.getByText(report.collections.connected ? 'connected' : 'unavailable', { exact: false })).toBeVisible();
  });
});
