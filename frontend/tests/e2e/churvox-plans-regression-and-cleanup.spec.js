const { test, expect } = require('@playwright/test');

const EMAIL = process.env.CHURVOX_E2E_EMAIL || process.env.E2E_EMAIL || '';
const PASSWORD = process.env.CHURVOX_E2E_PASSWORD || process.env.E2E_PASSWORD || '';
const CLEANUP = process.env.CHURVOX_E2E_CLEANUP === '1';
const BACKEND = process.env.CHURVOX_E2E_BACKEND || 'https://grassley-backend.onrender.com';

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

async function login(page) {
  test.skip(!EMAIL || !PASSWORD, 'Set CHURVOX_E2E_EMAIL and CHURVOX_E2E_PASSWORD.');
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');
  await fillFirst(page, ['input[type="email"]', 'input[name="email"]', 'input[placeholder*="email" i]'], EMAIL);
  await fillFirst(page, ['input[type="password"]', 'input[name="password"]', 'input[placeholder*="password" i]'], PASSWORD);
  const clicked = await clickText(page, ['Log in', 'Login', 'Sign in']);
  expect(clicked, 'login button should be clickable').toBeTruthy();
  await page.waitForURL(/dashboard|plans|setup|guide|#/i, { timeout: 30000 }).catch(() => null);
  await page.waitForLoadState('domcontentloaded');
  await expect(page.locator('body')).toContainText(/Churvox|Plans|Command|Smart|Dashboard/i);
}

test.describe('Plans regression and live test cleanup', () => {
  test('Plans page loads billing JSON from backend, not frontend HTML', async ({ page }) => {
    await login(page);

    const statusResponse = page.waitForResponse(
      (res) => res.url().includes('/api/billing/subscription-status'),
      { timeout: 30000 }
    ).catch(() => null);

    await page.goto('/plans?debug=1');
    await page.waitForLoadState('domcontentloaded');

    const response = await statusResponse;
    expect(response, 'Plans should call subscription-status API').toBeTruthy();
    expect(response.status(), `subscription-status returned ${response && response.status()}`).toBe(200);

    const body = page.locator('body');
    await expect(body).toContainText(/Current plan|Churvox pricing/i);
    await expect(body).not.toContainText(/Non-JSON response/i);
    await expect(body).not.toContainText(/Plans need attention/i);

    const reload = await clickText(page, ['Reload current plan']);
    expect(reload, 'Reload current plan should be visible').toBeTruthy();

    const reloadResponse = await page.waitForResponse(
      (res) => res.url().includes('/api/billing/subscription-status'),
      { timeout: 30000 }
    ).catch(() => null);

    expect(reloadResponse, 'Reload should call subscription-status API').toBeTruthy();
    expect(reloadResponse.status(), `reload subscription-status returned ${reloadResponse && reloadResponse.status()}`).toBe(200);
    await expect(body).not.toContainText(/Non-JSON response/i);
  });

  test('cleanup live Playwright test records when explicitly enabled', async ({ page }) => {
    test.skip(!CLEANUP, 'Set CHURVOX_E2E_CLEANUP=1 to delete only Playwright test records.');
    await login(page);

    const result = await page.evaluate(async ({ backend }) => {
      const token = localStorage.getItem('token') || '';
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const api = backend.replace(/\/+$/, '') + '/api';

      const isTestRecord = (row) => {
        const values = [
          row.name,
          row.customer_name,
          row.client_name,
          row.title,
          row.job_title,
          row.description,
          row.notes,
          row.email,
          row.customer_email,
          row.address,
          row.invoice_number,
          row.quote_number,
        ].map((x) => String(x || '').toLowerCase());
        return values.some((x) => x.includes('playwright test') || x.includes('playwright-'));
      };

      async function get(path) {
        const res = await fetch(api + path, { credentials: 'include', headers });
        if (!res.ok) return [];
        const body = await res.json().catch(() => []);
        return Array.isArray(body) ? body : (body.items || body.data || []);
      }

      async function del(path) {
        const res = await fetch(api + path, { method: 'DELETE', credentials: 'include', headers });
        return { ok: res.ok || res.status === 404, status: res.status };
      }

      const invoices = (await get('/invoices')).filter(isTestRecord);
      const quotes = (await get('/quotes')).filter(isTestRecord);
      const jobs = (await get('/jobs')).filter(isTestRecord);
      const clients = (await get('/clients')).filter(isTestRecord);

      const deleted = { invoices: 0, quotes: 0, jobs: 0, clients: 0, errors: [] };

      for (const row of invoices) {
        const id = row.id || row._id;
        if (!id) continue;
        const r = await del('/invoices/' + id);
        if (r.ok) deleted.invoices += 1; else deleted.errors.push(['invoice', id, r.status]);
      }

      for (const row of quotes) {
        const id = row.id || row._id;
        if (!id) continue;
        const r = await del('/quotes/' + id);
        if (r.ok) deleted.quotes += 1; else deleted.errors.push(['quote', id, r.status]);
      }

      for (const row of jobs) {
        const id = row.id || row._id;
        if (!id) continue;
        const r = await del('/jobs/' + id);
        if (r.ok) deleted.jobs += 1; else deleted.errors.push(['job', id, r.status]);
      }

      for (const row of clients) {
        const id = row.id || row._id;
        if (!id) continue;
        const r = await del('/clients/' + id);
        if (r.ok) deleted.clients += 1; else deleted.errors.push(['client', id, r.status]);
      }

      return deleted;
    }, { backend: BACKEND });

    console.log('Cleanup result:', JSON.stringify(result, null, 2));
    expect(result.errors, 'cleanup delete errors').toEqual([]);
  });
});
