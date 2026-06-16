const { test, expect } = require('@playwright/test');

const EMAIL = process.env.CHURVOX_E2E_EMAIL || '';
const PASSWORD = process.env.CHURVOX_E2E_PASSWORD || '';
const CLEANUP = process.env.CHURVOX_E2E_CLEANUP === '1';
const API_BASE = (process.env.CHURVOX_E2E_API_BASE || 'https://grassley-backend.onrender.com').replace(/\/+$/, '');

async function waitSmall(page) {
  await page.waitForLoadState('domcontentloaded').catch(() => null);
  await page.waitForTimeout(300).catch(() => null);
}

async function fillAny(page, names, value) {
  for (const name of names) {
    const label = page.getByLabel(new RegExp(name, 'i')).first();
    if (await label.count().catch(() => 0) && await label.isVisible().catch(() => false)) {
      await label.fill(value);
      return true;
    }
    const placeholder = page.getByPlaceholder(new RegExp(name, 'i')).first();
    if (await placeholder.count().catch(() => 0) && await placeholder.isVisible().catch(() => false)) {
      await placeholder.fill(value);
      return true;
    }
  }
  return false;
}

async function clickAny(page, names) {
  for (const name of names) {
    const button = page.getByRole('button', { name }).first();
    if (await button.count().catch(() => 0) && await button.isVisible().catch(() => false)) {
      await button.click();
      await waitSmall(page);
      return true;
    }
    const text = page.getByText(name, { exact: false }).first();
    if (await text.count().catch(() => 0) && await text.isVisible().catch(() => false)) {
      await text.click();
      await waitSmall(page);
      return true;
    }
  }
  return false;
}

async function login(page) {
  test.skip(!EMAIL || !PASSWORD, 'Set CHURVOX_E2E_EMAIL and CHURVOX_E2E_PASSWORD.');
  await page.goto('/login');
  await waitSmall(page);
  await fillAny(page, ['email'], EMAIL);
  await fillAny(page, ['password'], PASSWORD);
  await clickAny(page, [/sign in/i, /log in/i, /login/i]);
  await page.waitForURL(/dashboard|plans|setup|guide|payroll|worker|admin/i, { timeout: 35_000 }).catch(() => null);
  await waitSmall(page);
}

function looksLikePlaywrightRecord(item = {}) {
  const values = [
    item.name,
    item.title,
    item.customer_name,
    item.client_name,
    item.job_title,
    item.job_description,
    item.description,
    item.notes,
    item.email,
    item.customer_email,
    item.invoice_number,
    item.quote_number,
  ].map((value) => String(value || ''));

  return values.some((value) =>
    /^Playwright\s+(Test|Human)\b/i.test(value) ||
    /\bPlaywright\s+(Test|Human)\b/i.test(value) ||
    /^playwright[-_]/i.test(value) ||
    /@example\.com$/i.test(value)
  );
}

test.describe('Churvox safe test-data cleanup', () => {
  test('deletes only obvious Playwright-created records', async ({ page }) => {
    test.skip(!CLEANUP, 'Set CHURVOX_E2E_CLEANUP=1 to delete obvious Playwright test records.');
    await login(page);

    const result = await page.evaluate(async ({ apiBase }) => {
      const token = localStorage.getItem('token') || '';
      const headers = token ? { Authorization: `Bearer ${token}`, Accept: 'application/json' } : { Accept: 'application/json' };
      const jsonHeaders = token
        ? { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' }
        : { Accept: 'application/json', 'Content-Type': 'application/json' };

      const out = { invoices: 0, quotesSkipped: 0, jobs: 0, clients: 0, failures: [] };

      const isTestRecord = (item = {}) => {
        const values = [
          item.name,
          item.title,
          item.customer_name,
          item.client_name,
          item.job_title,
          item.job_description,
          item.description,
          item.notes,
          item.email,
          item.customer_email,
          item.invoice_number,
          item.quote_number,
        ].map((value) => String(value || ''));
        return values.some((value) => /^Playwright\s+(Test|Human)\b/i.test(value) || /\bPlaywright\s+(Test|Human)\b/i.test(value) || /^playwright[-_]/i.test(value) || /@example\.com$/i.test(value));
      };

      const list = async (path) => {
        const res = await fetch(`${apiBase}/api${path}`, { headers, credentials: 'include' });
        if (!res.ok) throw new Error(`${path} list failed ${res.status}`);
        const body = await res.json();
        return Array.isArray(body) ? body : (Array.isArray(body?.data) ? body.data : []);
      };

      const del = async (path) => {
        const res = await fetch(`${apiBase}/api${path}`, { method: 'DELETE', headers, credentials: 'include' });
        return { ok: res.ok, status: res.status, text: await res.text().catch(() => '') };
      };

      const patch = async (path, body) => {
        const res = await fetch(`${apiBase}/api${path}`, { method: 'PATCH', headers: jsonHeaders, credentials: 'include', body: JSON.stringify(body) });
        return { ok: res.ok, status: res.status, text: await res.text().catch(() => '') };
      };

      const cleanupList = async (kind, path, deletePath) => {
        const rows = await list(path);
        const testRows = rows.filter(isTestRecord);
        for (const row of testRows) {
          const id = row.id || row._id;
          if (!id) continue;
          const res = await del(`${deletePath}/${id}`);
          if (res.ok || res.status === 404) out[kind] += 1;
          else out.failures.push(`${kind} ${id} delete failed ${res.status}: ${res.text.slice(0, 160)}`);
        }
      };

      await cleanupList('invoices', '/invoices', '/invoices');

      const quotes = await list('/quotes');
      for (const quote of quotes.filter(isTestRecord)) {
        const id = quote.id || quote._id;
        if (!id) continue;
        const res = await del(`/quotes/${id}`);
        if (res.ok || res.status === 404) out.quotesSkipped += 0;
        else {
          await patch(`/quotes/${id}`, { status: 'declined', notes: 'Playwright test record cleanup marked as declined. Safe test record only.' }).catch(() => null);
          out.quotesSkipped += 1;
        }
      }

      await cleanupList('jobs', '/jobs', '/jobs');
      await cleanupList('clients', '/clients', '/clients');

      return out;
    }, { apiBase: API_BASE });

    expect(result.failures, `cleanup failures: ${JSON.stringify(result, null, 2)}`).toEqual([]);
    console.log('Playwright cleanup result:', JSON.stringify(result, null, 2));

    const remaining = await page.evaluate(async ({ apiBase }) => {
      const token = localStorage.getItem('token') || '';
      const headers = token ? { Authorization: `Bearer ${token}`, Accept: 'application/json' } : { Accept: 'application/json' };
      const kinds = ['/clients', '/jobs', '/invoices'];
      const results = {};
      const isTestRecord = (item = {}) => {
        const values = [item.name, item.title, item.customer_name, item.client_name, item.description, item.notes, item.email, item.customer_email].map((value) => String(value || ''));
        return values.some((value) => /^Playwright\s+(Test|Human)\b/i.test(value) || /\bPlaywright\s+(Test|Human)\b/i.test(value) || /^playwright[-_]/i.test(value) || /@example\.com$/i.test(value));
      };
      for (const path of kinds) {
        const res = await fetch(`${apiBase}/api${path}`, { headers, credentials: 'include' });
        const body = await res.json();
        const rows = Array.isArray(body) ? body : [];
        results[path] = rows.filter(isTestRecord).length;
      }
      return results;
    }, { apiBase: API_BASE });

    expect(remaining, 'remaining obvious Playwright records after cleanup').toEqual({ '/clients': 0, '/jobs': 0, '/invoices': 0 });

    // Keep this local test helper honest: the predicate must not match ordinary real-looking data.
    expect(looksLikePlaywrightRecord({ name: 'Smith Lawn Care', email: 'owner@realbusiness.co.nz' })).toBe(false);
  });
});
