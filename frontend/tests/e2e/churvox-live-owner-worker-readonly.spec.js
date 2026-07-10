const { test, expect } = require('@playwright/test');

const OWNER_EMAIL = process.env.CHURVOX_OWNER_EMAIL || process.env.CHURVOX_E2E_OWNER_EMAIL || process.env.CHURVOX_E2E_EMAIL || '';
const OWNER_PASSWORD = process.env.CHURVOX_OWNER_PASSWORD || process.env.CHURVOX_E2E_OWNER_PASSWORD || process.env.CHURVOX_E2E_PASSWORD || '';
const WORKER_EMAIL = process.env.CHURVOX_WORKER_EMAIL || process.env.CHURVOX_E2E_WORKER_EMAIL || '';
const WORKER_PASSWORD = process.env.CHURVOX_WORKER_PASSWORD || process.env.CHURVOX_E2E_WORKER_PASSWORD || '';
const API_BASE = (process.env.PLAYWRIGHT_API_BASE || 'https://grassley-backend.onrender.com').replace(/\/+$/, '');

function apiUrl(path) {
  return `${API_BASE}${path.startsWith('/api') ? path : `/api${path}`}`;
}

function tokenFrom(data = {}) {
  return data?.token || data?.access_token || data?.auth_token || data?.user?.token || data?.user?.access_token || '';
}

function listFrom(payload, keys = []) {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  for (const key of keys) if (Array.isArray(data?.[key])) return data[key];
  for (const key of ['items', 'records', 'results', 'jobs', 'clients', 'quotes', 'invoices', 'workers', 'team', 'members', 'data']) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

async function login(page, email, password, label) {
  if (!email || !password) throw new Error(`Missing ${label} credentials. This launch smoke must fail rather than skip.`);
  const response = await page.request.post(apiUrl('/api/auth/login'), {
    data: { email, password },
    timeout: 30_000,
  });
  const contentType = response.headers()['content-type'] || '';
  const body = await response.json().catch(async () => ({ text: await response.text().catch(() => '') }));
  expect(contentType, `${label} login returned non-JSON content`).toContain('application/json');
  expect(response.ok(), `${label} login failed ${response.status()} ${JSON.stringify(body).slice(0, 300)}`).toBeTruthy();
  expect(body?.success, `${label} login explicitly failed`).not.toBe(false);
  const token = tokenFrom(body);
  expect(token, `${label} login did not return a token`).not.toBe('');
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate((value) => localStorage.setItem('token', value), token);
  return token;
}

async function getJson(page, path, token) {
  const response = await page.request.get(apiUrl(path), {
    headers: token ? { Authorization: `Bearer ${token}`, Accept: 'application/json' } : { Accept: 'application/json' },
    timeout: 30_000,
  });
  const contentType = response.headers()['content-type'] || '';
  const text = await response.text();
  let body = null;
  try { body = JSON.parse(text); } catch {}
  return { response, contentType, text, body };
}

function assertSafeJson(result, label, accepted = [200]) {
  expect(result.response.status(), `${label} returned ${result.response.status()}: ${result.text.slice(0, 250)}`).toBeLessThan(500);
  expect(accepted, `${label} unexpected status ${result.response.status()}`).toContain(result.response.status());
  expect(result.contentType, `${label} returned frontend HTML instead of JSON`).toContain('application/json');
  expect(result.body, `${label} did not return valid JSON`).not.toBeNull();
  expect(result.text).not.toMatch(/<!doctype|<html|you need to enable javascript/i);
}

async function firstWorkingJson(page, paths, token, label) {
  const attempts = [];
  for (const path of paths) {
    const result = await getJson(page, path, token);
    attempts.push({ path, status: result.response.status() });
    if (result.response.ok() && result.contentType.includes('application/json') && result.body) return { path, ...result };
  }
  throw new Error(`${label} had no working JSON endpoint: ${JSON.stringify(attempts)}`);
}

function emailOf(row = {}) {
  return String(row.email || row.worker_email || row.user_email || '').trim().toLowerCase();
}

async function assertRouteHealthy(page, path, marker) {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 2500 }).catch(() => null);
  await expect(page.locator('body')).toBeVisible();
  const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ').trim();
  expect(body.length, `${path} rendered a blank/short page`).toBeGreaterThan(80);
  expect(body, `${path} rendered an error boundary`).not.toMatch(/something went wrong|application error|cannot read properties|failed to render/i);
  if (marker) expect(body, `${path} did not render expected worker/app copy`).toMatch(marker);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, `${path} has horizontal page overflow`).toBeLessThanOrEqual(2);
}

test.describe('Live read-only owner and worker operations', () => {
  test.setTimeout(180_000);

  test('owner business, billing and team endpoints are real JSON and dashboard routes render', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const token = await login(page, OWNER_EMAIL, OWNER_PASSWORD, 'owner');

    const me = await getJson(page, '/api/auth/me', token);
    assertSafeJson(me, 'owner auth/me');
    expect(String(me.body?.email || me.body?.user?.email || '').toLowerCase()).toBe(OWNER_EMAIL.toLowerCase());

    const billing = await firstWorkingJson(page, [
      '/api/billing/subscription-status',
      '/api/subscription/status',
      '/api/billing/status',
    ], token, 'owner billing status');
    assertSafeJson(billing, 'owner billing status');

    for (const [label, path] of [
      ['jobs', '/api/jobs'],
      ['clients', '/api/clients'],
      ['quotes', '/api/quotes'],
      ['invoices', '/api/invoices'],
    ]) {
      const result = await getJson(page, `${path}?ts=${Date.now()}`, token);
      assertSafeJson(result, `owner ${label}`);
      expect(Array.isArray(listFrom(result.body, [label])) || typeof result.body === 'object').toBeTruthy();
    }

    const team = await firstWorkingJson(page, [
      `/api/team/workers?ts=${Date.now()}`,
      `/api/team?ts=${Date.now()}`,
      `/api/workers?ts=${Date.now()}`,
    ], token, 'owner team');
    const workers = listFrom(team.body, ['workers', 'team', 'members']);
    const configuredWorker = workers.find((row) => emailOf(row) === WORKER_EMAIL.toLowerCase());
    expect(configuredWorker, `Team does not contain configured worker ${WORKER_EMAIL}`).toBeTruthy();

    await assertRouteHealthy(page, '/dashboard#today', /Churvox|Today|Command/i);
    await assertRouteHealthy(page, '/dashboard#work', /Jobs|Work|Churvox/i);
    await assertRouteHealthy(page, '/dashboard#clients', /Clients|Churvox/i);
    await assertRouteHealthy(page, '/dashboard#invoices', /Invoices|Churvox/i);

    await context.close();
  });

  test('worker identity, assigned-job reads and worker routes work without mutations', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const token = await login(page, WORKER_EMAIL, WORKER_PASSWORD, 'worker');

    const me = await getJson(page, '/api/auth/me', token);
    assertSafeJson(me, 'worker auth/me');
    expect(String(me.body?.email || me.body?.user?.email || '').toLowerCase()).toBe(WORKER_EMAIL.toLowerCase());

    const jobs = await firstWorkingJson(page, [
      `/api/jobs?ts=${Date.now()}`,
      `/api/worker/jobs?ts=${Date.now()}`,
    ], token, 'worker jobs');
    assertSafeJson(jobs, 'worker jobs');
    expect(Array.isArray(listFrom(jobs.body, ['jobs'])) || typeof jobs.body === 'object').toBeTruthy();

    const status = await firstWorkingJson(page, [
      `/api/worker/live-status?ts=${Date.now()}`,
      `/api/auth/me?ts=${Date.now()}`,
    ], token, 'worker status');
    assertSafeJson(status, 'worker status');

    await assertRouteHealthy(page, '/worker/today', /Today|Worker|Jobs|Churvox/i);
    await assertRouteHealthy(page, '/worker/jobs', /Jobs|Worker|Churvox/i);
    await assertRouteHealthy(page, '/worker/help', /Help|Worker|Churvox/i);

    await context.close();
  });
});
