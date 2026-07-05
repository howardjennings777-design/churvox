const { test, expect } = require('@playwright/test');

const OWNER_EMAIL = process.env.CHURVOX_OWNER_EMAIL || process.env.CHURVOX_E2E_OWNER_EMAIL || process.env.CHURVOX_E2E_EMAIL || '';
const OWNER_PASSWORD = process.env.CHURVOX_OWNER_PASSWORD || process.env.CHURVOX_E2E_OWNER_PASSWORD || process.env.CHURVOX_E2E_PASSWORD || '';
const API_BASE = (process.env.PLAYWRIGHT_API_BASE || 'https://grassley-backend.onrender.com').replace(/\/+$/, '');

function apiUrl(path) { return `${API_BASE}${path.startsWith('/api') ? path : `/api${path}`}`; }
function tokenFrom(data = {}) { return data?.token || data?.access_token || data?.auth_token || data?.user?.token || data?.user?.access_token || ''; }
function stamp() { return new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14); }
async function wait(page, ms = 700) { await page.waitForLoadState('domcontentloaded').catch(() => null); await page.waitForTimeout(ms); }
async function bodyText(page) { return (await page.locator('body').innerText({ timeout: 10000 }).catch(() => '')).replace(/\s+/g, ' ').trim(); }

async function login(page) {
  if (!OWNER_EMAIL || !OWNER_PASSWORD) throw new Error('Set CHURVOX_OWNER_EMAIL and CHURVOX_OWNER_PASSWORD.');
  const res = await page.request.post(apiUrl('/api/auth/login'), { data: { email: OWNER_EMAIL, password: OWNER_PASSWORD }, timeout: 25000 });
  const json = await res.json().catch(async () => ({ text: await res.text().catch(() => '') }));
  if (!res.ok() || json?.success === false) throw new Error(`owner login failed ${res.status()} ${JSON.stringify(json).slice(0, 500)}`);
  const token = tokenFrom(json);
  await page.goto('/');
  await page.evaluate((t) => { if (t) localStorage.setItem('token', t); }, token);
  return token;
}

async function apiCreate(page, endpoint, token, payload) {
  const authToken = await page.evaluate(() => localStorage.getItem('token') || '').catch(() => token || '');
  const res = await page.request.post(apiUrl(endpoint), { headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}, data: payload, timeout: 25000 }).catch((error) => ({ error }));
  if (res?.error) return { endpoint, error: String(res.error) };
  const text = await res.text().catch(() => '');
  return { endpoint, status: res.status(), ok: res.ok(), text: text.slice(0, 900) };
}

test.describe('Churvox paid launch diagnostics', () => {
  test.setTimeout(180000);

  test('diagnose live owner layout and create route wiring', async ({ page }) => {
    const token = await login(page);

    await page.goto('/dashboard#aiguide');
    await wait(page, 1500);
    const layout = await page.evaluate(() => {
      const visible = (id) => {
        const el = document.getElementById(id);
        if (!el) return false;
        const s = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 1 && r.height > 1;
      };
      return {
        url: location.href,
        hash: location.hash,
        title: document.title,
        properExists: Boolean(document.getElementById('churvox-owner-proper-page-layout')),
        properVisible: visible('churvox-owner-proper-page-layout'),
        oldGuideExists: Boolean(document.getElementById('churvox-guide-command-proper-layout')),
        oldGuideVisible: visible('churvox-guide-command-proper-layout'),
        saveBridgeLoaded: Boolean(window.__CHURVOX_LAUNCH_CREATE_SAVE_BRIDGE__),
        aiGuardLoaded: Boolean(window.__CHURVOX_AI_GUIDE_STABILITY_GUARD__),
        workflowBridgeLoaded: Boolean(window.__CHURVOX_OWNER_WORKFLOW_SYNC_BRIDGE__),
        text: (document.body?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 1400),
      };
    });
    console.log('OWNER_LAYOUT_DIAGNOSTIC', JSON.stringify(layout, null, 2));

    const id = stamp();
    const creates = [];
    creates.push(await apiCreate(page, '/api/clients', token, { name: `Diagnostic Client ${id}`, email: `diag-${id}@example.com`, phone: '0210000000', address: 'Diagnostic Street' }));
    creates.push(await apiCreate(page, '/api/jobs', token, { title: `Diagnostic Job ${id}`, client_name: `Diagnostic Client ${id}`, site_address: 'Diagnostic Street', price: 95 }));
    creates.push(await apiCreate(page, '/api/quotes', token, { title: `Diagnostic Quote ${id}`, client_name: `Diagnostic Client ${id}`, total: 145 }));
    creates.push(await apiCreate(page, '/api/invoices', token, { title: `Diagnostic Invoice ${id}`, client_name: `Diagnostic Client ${id}`, amount: 95 }));
    console.log('CREATE_ROUTE_DIAGNOSTIC', JSON.stringify(creates, null, 2));

    await page.goto('/clients/new');
    await wait(page, 1200);
    const createPage = await page.evaluate(() => ({
      url: location.href,
      saveBridgeLoaded: Boolean(window.__CHURVOX_LAUNCH_CREATE_SAVE_BRIDGE__),
      buttons: [...document.querySelectorAll('button, input[type="submit"], a, [role="button"]')].map((el) => (el.innerText || el.value || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 40),
      text: (document.body?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 1400),
    }));
    console.log('CREATE_PAGE_DIAGNOSTIC', JSON.stringify(createPage, null, 2));

    expect(layout.text.length, 'Owner page should load enough text').toBeGreaterThan(80);
    expect(creates, 'At least one create endpoint should answer instead of all failing').toEqual(expect.arrayContaining([expect.objectContaining({ ok: true })]));
  });
});
