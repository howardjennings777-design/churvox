const { test, expect } = require('@playwright/test');

const OWNER_EMAIL = process.env.CHURVOX_OWNER_EMAIL || process.env.CHURVOX_E2E_OWNER_EMAIL || process.env.CHURVOX_E2E_EMAIL || '';
const OWNER_PASSWORD = process.env.CHURVOX_OWNER_PASSWORD || process.env.CHURVOX_E2E_OWNER_PASSWORD || process.env.CHURVOX_E2E_PASSWORD || '';
const API_BASE = (process.env.PLAYWRIGHT_API_BASE || 'https://grassley-backend.onrender.com').replace(/\/+$/, '');
const ownerPages = ['aiguide','command','jobs','clients','workers','quotes','invoices','messages','team','payroll','xero','settings','plans','support'];

function apiUrl(path) { return `${API_BASE}${path.startsWith('/api') ? path : `/api${path}`}`; }
function tokenFrom(data = {}) { return data?.token || data?.access_token || data?.auth_token || data?.user?.token || data?.user?.access_token || ''; }
async function waitHuman(page, ms = 500) { await page.waitForLoadState('domcontentloaded').catch(() => null); await page.waitForLoadState('networkidle', { timeout: 1800 }).catch(() => null); await page.waitForTimeout(ms); }
async function bodyText(page) { return (await page.locator('body').innerText({ timeout: 12000 }).catch(() => '')).replace(/\s+/g, ' ').trim(); }
async function loginThroughUi(page) {
  await page.goto('/login');
  await waitHuman(page, 700);
  await page.locator('input[type="email"], input[name*="email" i]').first().fill(OWNER_EMAIL);
  await page.locator('input[type="password"], input[name*="password" i]').first().fill(OWNER_PASSWORD);
  const button = page.getByRole('button', { name: /sign in|login|log in/i }).first();
  if (await button.isVisible().catch(() => false)) await button.click();
  else await page.locator('button[type="submit"], input[type="submit"]').first().click();
  await waitHuman(page, 1600);
}
async function loginOwner(page) {
  if (!OWNER_EMAIL || !OWNER_PASSWORD) throw new Error('Set CHURVOX_OWNER_EMAIL and CHURVOX_OWNER_PASSWORD.');
  const res = await page.request.post(apiUrl('/api/auth/login'), { data: { email: OWNER_EMAIL, password: OWNER_PASSWORD }, timeout: 25000 });
  const json = await res.json().catch(async () => ({ text: await res.text().catch(() => '') }));
  if (!res.ok() || json?.success === false) throw new Error(`owner login failed ${res.status()} ${JSON.stringify(json).slice(0, 500)}`);
  const token = tokenFrom(json);
  await page.goto('/');
  await page.evaluate((t) => { if (t) localStorage.setItem('token', t); }, token);
  await page.goto('/dashboard#aiguide');
  await waitHuman(page, 1000);
  const text = await bodyText(page);
  if (/\/login\b/i.test(page.url()) || /WELCOME BACK|Sign in to Command/i.test(text)) {
    await loginThroughUi(page);
    await page.goto('/dashboard#aiguide');
    await waitHuman(page, 1200);
  }
}
async function snap(page) {
  return page.evaluate(() => {
    const proper = document.getElementById('churvox-owner-proper-page-layout');
    const rect = proper?.getBoundingClientRect?.();
    const panels = ['churvox-owner-record-engine-panel','churvox-owner-workflow-automation-panel','churvox-owner-timeline-panel','churvox-owner-data-quality-panel','churvox-paid-launch-readiness-panel'];
    const scrollables = [...document.querySelectorAll('.churvoxOptionC .workspace, .churvoxOptionC .cocPage, .churvoxOptionC .cocRows, .churvoxOptionC .scroll, .churvoxOptionC .ledgerList, .churvoxOptionC .jobCards, .churvoxOptionC .workerCards, .churvoxOptionC .workCards')].map((el, index) => {
      const r = el.getBoundingClientRect();
      return { index, cls: String(el.className || ''), top: Math.round(r.top), height: Math.round(r.height), scrollTop: Math.round(el.scrollTop || 0), scrollHeight: Math.round(el.scrollHeight || 0), clientHeight: Math.round(el.clientHeight || 0) };
    });
    return {
      url: location.href,
      scrollY: window.scrollY,
      bodyHeight: Math.max(document.body?.scrollHeight || 0, document.documentElement.scrollHeight || 0),
      properTop: rect ? Math.round(rect.top) : null,
      properHeight: rect ? Math.round(rect.height) : null,
      workspaceScrollTop: document.querySelector('.churvoxOptionC .workspace')?.scrollTop || 0,
      workspaceHeight: document.querySelector('.churvoxOptionC .workspace')?.scrollHeight || 0,
      scrollables,
      hiddenPanels: panels.filter((id) => {
        const el = document.getElementById(id);
        if (!el) return false;
        const s = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return el.hasAttribute('data-proper-hidden') || el.hasAttribute('data-core-hidden') || el.hasAttribute('data-lite-hidden') || s.display === 'none' || s.visibility === 'hidden' || r.height < 1;
      }),
      textLength: (document.body?.innerText || '').replace(/\s+/g, ' ').trim().length,
    };
  });
}
function maxScrollDelta(a, b) {
  const byKey = new Map((a.scrollables || []).map((item) => [`${item.index}:${item.cls}`, item]));
  let max = 0;
  for (const item of (b.scrollables || [])) {
    const old = byKey.get(`${item.index}:${item.cls}`);
    if (!old) continue;
    max = Math.max(max, Math.abs((item.scrollTop || 0) - (old.scrollTop || 0)));
  }
  return max;
}

test.describe('Churvox owner page jump audit', () => {
  test.setTimeout(360000);

  test('owner pages do not jump or hide engine panels after settling', async ({ page }) => {
    await loginOwner(page);
    const results = [];
    for (const hash of ownerPages) {
      await page.goto(`/dashboard#${hash}`);
      await waitHuman(page, 1200);
      await page.evaluate(() => {
        const workspace = document.querySelector('.churvoxOptionC .workspace');
        if (workspace) workspace.scrollTop = Math.min(260, Math.max(0, workspace.scrollHeight - workspace.clientHeight - 20));
        else window.scrollTo(0, Math.min(260, Math.max(0, document.body.scrollHeight - window.innerHeight - 20)));
      });
      await page.waitForTimeout(300);
      const samples = [];
      for (let i = 0; i < 16; i += 1) { samples.push(await snap(page)); await page.waitForTimeout(350); }
      const a = samples[0];
      const b = samples[samples.length - 1];
      const result = {
        hash,
        start: a,
        end: b,
        scrollDelta: Math.abs((b.scrollY || 0) - (a.scrollY || 0)),
        workspaceScrollDelta: Math.abs((b.workspaceScrollTop || 0) - (a.workspaceScrollTop || 0)),
        maxInternalScrollDelta: maxScrollDelta(a, b),
        properTopDelta: a.properTop == null || b.properTop == null ? 0 : Math.abs(b.properTop - a.properTop),
        heightDelta: Math.abs((b.bodyHeight || 0) - (a.bodyHeight || 0)),
        sampleSummary: samples.map((s) => ({ properTop: s.properTop, properHeight: s.properHeight, workspaceScrollTop: s.workspaceScrollTop, workspaceHeight: s.workspaceHeight, hiddenPanels: s.hiddenPanels, textLength: s.textLength })),
      };
      results.push(result);
      expect(b.hiddenPanels, `${hash} should not hide protected panels`).toEqual([]);
      expect(result.scrollDelta, `${hash} window scroll jumped`).toBeLessThanOrEqual(90);
      expect(result.workspaceScrollDelta, `${hash} workspace scroll jumped`).toBeLessThanOrEqual(90);
      expect(result.maxInternalScrollDelta, `${hash} internal list scroll jumped`).toBeLessThanOrEqual(90);
      expect(result.properTopDelta, `${hash} top layout shifted`).toBeLessThanOrEqual(80);
      expect(result.heightDelta, `${hash} page height changed too much`).toBeLessThanOrEqual(900);
      expect(b.textLength, `${hash} visible text should remain stable`).toBeGreaterThanOrEqual(Math.max(80, a.textLength - 500));
    }
    console.log('OWNER_PAGE_JUMP_AUDIT_RESULTS', JSON.stringify(results, null, 2));
  });
});
