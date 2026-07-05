const { test, expect } = require('@playwright/test');

const OWNER_EMAIL = process.env.CHURVOX_OWNER_EMAIL || process.env.CHURVOX_E2E_OWNER_EMAIL || process.env.CHURVOX_E2E_EMAIL || '';
const OWNER_PASSWORD = process.env.CHURVOX_OWNER_PASSWORD || process.env.CHURVOX_E2E_OWNER_PASSWORD || process.env.CHURVOX_E2E_PASSWORD || '';
const WORKER_EMAIL = process.env.CHURVOX_WORKER_EMAIL || process.env.CHURVOX_E2E_WORKER_EMAIL || '';
const WORKER_PASSWORD = process.env.CHURVOX_WORKER_PASSWORD || process.env.CHURVOX_E2E_WORKER_PASSWORD || '';
const API_BASE = (process.env.PLAYWRIGHT_API_BASE || 'https://grassley-backend.onrender.com').replace(/\/+$/, '');
const MUTATE = /^(1|true|yes)$/i.test(process.env.CHURVOX_E2E_MUTATE || '');

const ownerPages = ['aiguide','command','jobs','clients','workers','quotes','invoices','messages','team','payroll','xero','settings','plans','support'];
const keepIds = ['churvox-owner-proper-page-layout','churvox-owner-record-engine-panel','churvox-owner-workflow-automation-panel','churvox-owner-timeline-panel','churvox-owner-data-quality-panel','churvox-paid-launch-readiness-panel'];

function apiUrl(path) { return `${API_BASE}${path.startsWith('/api') ? path : `/api${path}`}`; }
function stamp() { return new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14); }
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
  const finalText = await bodyText(page);
  if (/\/login\b/i.test(page.url()) || /WELCOME BACK|Sign in to Command/i.test(finalText)) throw new Error(`owner UI login did not reach app, still at ${page.url()}`);
}
async function loginWorker(page) {
  if (!WORKER_EMAIL || !WORKER_PASSWORD) throw new Error('worker credentials missing');
  await page.goto('/login');
  await page.locator('input[type="email"], input[name*="email" i]').first().fill(WORKER_EMAIL).catch(() => null);
  await page.locator('input[type="password"], input[name*="password" i]').first().fill(WORKER_PASSWORD).catch(() => null);
  const button = page.getByRole('button', { name: /login|log in|sign in/i }).first();
  if (await button.isVisible().catch(() => false)) await button.click();
  else await page.locator('button[type="submit"], input[type="submit"]').first().click();
  await waitHuman(page, 1000);
}
async function assertNoFatal(page, label) {
  const text = await bodyText(page);
  expect(text.length, `${label} visible text`).toBeGreaterThan(80);
  expect(text, `${label} fatal UI`).not.toMatch(/Something went wrong|Application error|Cannot read properties|undefined is not an object|Minified React error|ChunkLoadError|Maximum update depth exceeded/i);
  return text;
}
async function snap(page) {
  return page.evaluate((ids) => {
    const visible = (el) => { if (!el) return false; const s = getComputedStyle(el); const r = el.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity || '1') > 0.04 && r.width > 1 && r.height > 1; };
    const body = document.body;
    const text = (body?.innerText || '').replace(/\s+/g, ' ').trim();
    const vw = document.documentElement.clientWidth;
    const sw = Math.max(document.documentElement.scrollWidth, body?.scrollWidth || 0);
    const hiddenKeep = ids.filter((id) => { const n = document.getElementById(id); return n && (!visible(n) || n.hasAttribute('data-proper-hidden') || n.hasAttribute('data-core-hidden') || n.hasAttribute('data-lite-hidden')); });
    const controls = [...document.querySelectorAll('button,a[href],input,textarea,select,[role="button"],summary')].filter(visible).map((el, i) => { const r = el.getBoundingClientRect(); const label = (el.innerText || el.textContent || el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.getAttribute('name') || el.getAttribute('title') || '').replace(/\s+/g, ' ').trim(); return { i, label, tag: el.tagName, w: r.width, h: r.height, pe: getComputedStyle(el).pointerEvents }; });
    const badControls = controls.filter((c) => (!c.label && !['INPUT','TEXTAREA','SELECT'].includes(c.tag)) || c.pe === 'none' || c.w < 14 || c.h < 14).slice(0, 30);
    return { textLength: text.length, overflow: sw - vw, hiddenKeep, badControls, controlCount: controls.length, oldGuideVisible: visible(document.getElementById('churvox-guide-command-proper-layout')), properVisible: visible(document.getElementById('churvox-owner-proper-page-layout')) };
  }, keepIds);
}
async function fillAny(page, names, value) {
  for (const name of names) {
    const locators = [page.getByLabel(new RegExp(name, 'i')).first(), page.getByPlaceholder(new RegExp(name, 'i')).first(), page.locator(`input[name*="${name}" i], textarea[name*="${name}" i], select[name*="${name}" i]`).first(), page.locator(`input[id*="${name}" i], textarea[id*="${name}" i], select[id*="${name}" i]`).first()];
    for (const loc of locators) { if (await loc.isVisible().catch(() => false)) { await loc.fill(String(value)).catch(async () => { await loc.click({ force: true }).catch(() => null); await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A').catch(() => null); await page.keyboard.type(String(value)).catch(() => null); }); return true; } }
  }
  return false;
}
async function save(page) {
  for (const re of [/save/i,/create/i,/add/i,/done/i,/submit/i]) { const b = page.getByRole('button', { name: re }).first(); if (await b.isVisible().catch(() => false)) { await b.click(); await waitHuman(page, 1000); return true; } }
  const submit = page.locator('button[type="submit"],input[type="submit"]').first(); if (await submit.isVisible().catch(() => false)) { await submit.click(); await waitHuman(page, 1000); return true; }
  return false;
}
async function apiHas(page, endpoint, token) {
  const authToken = await page.evaluate(() => localStorage.getItem('token') || '').catch(() => '');
  const res = await page.request.get(apiUrl(endpoint), { headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}, timeout: 20000 }).catch(() => null);
  if (!res || !res.ok()) return false;
  return JSON.stringify(await res.json().catch(() => ({}))).includes(token);
}
async function pageHas(page, url, token) { await page.goto(url); await waitHuman(page, 900); return (await bodyText(page)).includes(token); }
async function createRecord(page, flow) {
  const id = stamp();
  const token = `${flow.title} ${id}`;
  await page.goto(flow.newUrl);
  await waitHuman(page, 900);
  await assertNoFatal(page, `${flow.kind} create`);
  const fields = [[['name','title','job','client','customer'], token], [['email'], `audit-${id}@example.com`], [['phone','mobile'], '0210000000'], [['address','site'], `${id} Real Deal Street, Wellington`], [['worker','assigned'], 'Real Deal Worker'], [['date','scheduled'], '2026-08-20T09:30'], [['time','start'], '09:30'], [['price','amount','total'], '95'], [['notes','description','scope','service'], `Real deal paid launch audit ${id}. Do not send.`]];
  let filled = 0;
  for (const [names, value] of fields) if (await fillAny(page, names, value)) filled += 1;
  expect(filled, `${flow.kind} should accept useful fields`).toBeGreaterThanOrEqual(2);
  expect(await save(page), `${flow.kind} should save/create`).toBeTruthy();
  await assertNoFatal(page, `${flow.kind} after save`);
  const found = await expect.poll(async () => {
    const api = await apiHas(page, flow.api, token);
    const list = api ? true : await pageHas(page, flow.listUrl, token);
    return { api, list, found: api || list, url: page.url(), text: (await bodyText(page)).slice(0, 500) };
  }, { timeout: 30000, intervals: [800, 1200, 2000, 3000], message: `${flow.kind} should appear after save` }).toMatchObject({ found: true });
  await page.goto('/dashboard#command'); await waitHuman(page, 900); await assertNoFatal(page, `Command after ${flow.kind}`);
  expect(await apiHas(page, flow.api, token) || await pageHas(page, flow.listUrl, token), `${flow.kind} should still exist after navigation`).toBeTruthy();
  return found;
}

test.describe('Churvox real deal paid launch audit', () => {
  test.setTimeout(360000);

  test('owner pages are launch ready, stable, not cut out, and controls are usable', async ({ page }) => {
    await loginOwner(page);
    for (const hash of ownerPages) {
      await page.goto(`/dashboard#${hash}`); await waitHuman(page, 800);
      const text = await assertNoFatal(page, hash);
      expect(text).toMatch(/Churvox|Command|Job|Client|Worker|Quote|Invoice|Plan|Support|Settings|AI Guide/i);
      const first = await snap(page);
      await page.waitForTimeout(hash === 'aiguide' ? 4200 : 1200);
      const second = await snap(page);
      expect(second.overflow, `${hash} horizontal overflow`).toBeLessThanOrEqual(18);
      expect(second.badControls, `${hash} bad controls`).toEqual([]);
      expect(second.controlCount, `${hash} should have controls`).toBeGreaterThan(0);
      if (hash === 'aiguide') {
        expect(second.properVisible, 'AI Guide proper layout visible').toBeTruthy();
        expect(second.oldGuideVisible, 'old AI Guide layout hidden').toBeFalsy();
        expect(second.hiddenKeep, 'AI Guide must not cut key panels').toEqual([]);
        expect(second.textLength, 'AI Guide should not lose visible content after waiting').toBeGreaterThanOrEqual(first.textLength - 450);
      }
    }
  });

  test('actually creates client, job, quote and invoice and verifies they stick', async ({ page }) => {
    if (!MUTATE) throw new Error('Set CHURVOX_E2E_MUTATE=1. This real-deal audit intentionally creates safe client/job/quote/invoice test records.');
    await loginOwner(page);
    const flows = [
      { kind: 'client', title: 'Real Deal Client', newUrl: '/clients/new', listUrl: '/dashboard#clients', api: '/api/clients' },
      { kind: 'job', title: 'Real Deal Job', newUrl: '/jobs/new', listUrl: '/dashboard#jobs', api: '/api/jobs' },
      { kind: 'quote', title: 'Real Deal Quote', newUrl: '/quotes/new', listUrl: '/dashboard#quotes', api: '/api/quotes' },
      { kind: 'invoice', title: 'Real Deal Invoice', newUrl: '/invoices/new', listUrl: '/dashboard#invoices', api: '/api/invoices' },
    ];
    for (const flow of flows) {
      await test.step(`create ${flow.kind}`, async () => { await createRecord(page, flow); });
    }
    await page.goto('/dashboard#aiguide'); await waitHuman(page, 1200);
    expect(await bodyText(page)).toMatch(/record engine|workflow|timeline|data quality|paid launch|Command/i);
  });

  test('worker app is mobile safe and does not show owner-only decisions', async ({ page }) => {
    await page.setViewportSize({ width: 412, height: 915 });
    for (const route of ['/worker/today','/worker/jobs','/worker/messages','/worker/help']) {
      await page.goto(route); await waitHuman(page, 700);
      const text = await assertNoFatal(page, route);
      expect(text).toMatch(/Worker|Today|Jobs|Messages|Help|Sign in|Login|Payment|proof|status/i);
      expect(text).not.toMatch(/Approve invoice|Send invoice now|File tax|bank payout|automatic invoice sending|Approve quote/i);
      expect((await snap(page)).overflow, `${route} mobile overflow`).toBeLessThanOrEqual(18);
    }
  });

  test('worker login reaches jobs and messages when worker credentials exist', async ({ page }) => {
    test.skip(!WORKER_EMAIL || !WORKER_PASSWORD, 'Worker credentials not supplied.');
    await loginWorker(page);
    for (const route of ['/worker/jobs','/worker/messages']) { await page.goto(route); await waitHuman(page, 900); expect(await assertNoFatal(page, route)).toMatch(/Worker|Jobs|Messages|Today|Help|proof|status|reply/i); }
  });
});
