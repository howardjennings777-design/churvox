const { test, expect } = require('@playwright/test');

const OWNER_EMAIL = process.env.CHURVOX_OWNER_EMAIL || process.env.CHURVOX_E2E_EMAIL || process.env.CHURVOX_E2E_OWNER_EMAIL || process.env.E2E_EMAIL || '';
const OWNER_PASSWORD = process.env.CHURVOX_OWNER_PASSWORD || process.env.CHURVOX_E2E_PASSWORD || process.env.CHURVOX_E2E_OWNER_PASSWORD || process.env.E2E_PASSWORD || '';
const WORKER_EMAIL = process.env.CHURVOX_WORKER_EMAIL || process.env.CHURVOX_E2E_WORKER_EMAIL || process.env.E2E_WORKER_EMAIL || '';
const WORKER_PASSWORD = process.env.CHURVOX_WORKER_PASSWORD || process.env.CHURVOX_E2E_WORKER_PASSWORD || process.env.E2E_WORKER_PASSWORD || '';
const API_BASE = (process.env.PLAYWRIGHT_API_BASE || 'https://grassley-backend.onrender.com').replace(/\/+$/, '');
const REQUIRE_AUTH_AUDIT = /^(1|true|yes)$/i.test(process.env.CHURVOX_REQUIRE_AUTH_AUDIT || '');

const publicRoutes = ['/', '/features', '/pricing', '/login', '/signup', '/privacy', '/terms'];
const ownerHashes = [
  'setupassistant', 'command', 'aioperator', 'quickcreateai', 'planday',
  'jobs', 'recurring', 'dispatch', 'routes', 'areas', 'clients', 'quotes',
  'quoteai', 'invoices', 'invoicecheck', 'payments', 'team', 'payroll',
  'time', 'xero', 'integrations', 'reports', 'profit', 'expenses', 'photos',
  'documents', 'automation', 'launchcontrol', 'security', 'settings', 'support',
];

const blockedVisibleWords = [
  /\bdemo data\b/i,
  /\bmock data\b/i,
  /\bdummy\b/i,
  /\bfake customer\b/i,
  /\bfake job\b/i,
  /\bplaceholder\b/i,
  /\blorem\b/i,
  /\btemporary copy\b/i,
  /\bdebug mode\b/i,
  /\btodo\b/i,
];

function apiUrl(path) {
  return `${API_BASE}${path.startsWith('/api') ? path : `/api${path}`}`;
}

function tokenFrom(data = {}) {
  return data?.token || data?.access_token || data?.auth_token || data?.jwt || data?.accessToken
    || data?.user?.token || data?.user?.access_token || data?.user?.accessToken
    || data?.data?.token || data?.data?.access_token || data?.data?.user?.token || '';
}

function accountEmail(data = {}) {
  return String(data?.email || data?.user?.email || data?.data?.email || data?.data?.user?.email || '').trim().toLowerCase();
}

function idOf(value) {
  if (!value) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  const raw = value.id || value._id || value.$oid || value.oid || value.worker_id || value.user_id || value.team_member_id || value.job_id || '';
  if (raw && typeof raw === 'object') return String(raw.$oid || raw.oid || raw.id || '');
  return String(raw || '');
}

function listFrom(payload, keys = []) {
  const data = payload?.data?.data ?? payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  for (const key of keys) if (Array.isArray(data?.[key])) return data[key];
  for (const key of ['workers', 'team', 'members', 'jobs', 'items', 'records', 'results', 'data']) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

function textHas(value, token) {
  return JSON.stringify(value || {}).toLowerCase().includes(String(token || '').toLowerCase());
}

async function waitStable(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);
}

async function collectVisibleText(page) {
  return page.evaluate(() => {
    const skip = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG']);
    const chunks = [];
    const els = [...document.querySelectorAll('body *')];
    for (const el of els) {
      if (skip.has(el.tagName)) continue;
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity || '1') < 0.08) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) continue;
      const text = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
      if (!text || text.length > 180) continue;
      chunks.push(text);
    }
    return [...new Set(chunks)].join('\n');
  });
}

async function expectNoLaunchLanguage(page, label) {
  const visibleText = await collectVisibleText(page);
  const hits = blockedVisibleWords
    .filter((pattern) => pattern.test(visibleText))
    .map((pattern) => pattern.toString());
  expect(hits, `${label} contains customer-facing internal launch words. Visible text:\n${visibleText.slice(0, 2500)}`).toEqual([]);
}

async function expectBasics(page, label) {
  await waitStable(page);
  const result = await page.evaluate(() => {
    const issues = [];
    const body = document.body;
    const vw = document.documentElement.clientWidth;
    const scrollW = Math.max(document.documentElement.scrollWidth, body?.scrollWidth || 0);
    if (!body) issues.push('missing body');
    if (scrollW - vw > 8) issues.push(`horizontal overflow ${scrollW - vw}px`);
    const controls = [...document.querySelectorAll('button, a[href], [role="button"]')].filter((el) => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 1 && rect.height > 1 && style.display !== 'none' && style.visibility !== 'hidden';
    });
    controls.forEach((el, index) => {
      const name = (el.innerText || el.getAttribute('aria-label') || el.getAttribute('title') || '').trim();
      if (!name) issues.push(`visible control ${index + 1} has no label`);
    });
    return { issues: issues.slice(0, 40) };
  });
  expect(result.issues, `${label} page basics`).toEqual([]);
  await expectNoLaunchLanguage(page, label);
}

async function fillByLabelOrPlaceholder(page, words, value) {
  for (const word of Array.isArray(words) ? words : [words]) {
    const byLabel = page.getByLabel(new RegExp(word, 'i')).first();
    if (await byLabel.count().catch(() => 0) && await byLabel.isVisible().catch(() => false)) {
      await byLabel.fill(value);
      return true;
    }
    const byPlaceholder = page.getByPlaceholder(new RegExp(word, 'i')).first();
    if (await byPlaceholder.count().catch(() => 0) && await byPlaceholder.isVisible().catch(() => false)) {
      await byPlaceholder.fill(value);
      return true;
    }
  }
  return false;
}

async function clickLogin(page) {
  for (const name of [/open churvox/i, /sign in/i, /log in/i, /login/i]) {
    const button = page.getByRole('button', { name }).first();
    if (await button.count().catch(() => 0) && await button.isVisible().catch(() => false)) {
      await button.click();
      return;
    }
  }
  await page.keyboard.press('Enter');
}

function requireOrSkip(condition, message) {
  if (condition) return;
  if (REQUIRE_AUTH_AUDIT) throw new Error(message);
  test.skip(true, message);
}

async function readJson(response) {
  return response.json().catch(async () => ({ text: await response.text().catch(() => '') }));
}

async function requestJson(page, token, method, path, data) {
  const options = {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    timeout: 30_000,
  };
  if (data !== undefined) options.data = data;
  const response = await page.request[method](apiUrl(path), options);
  const body = await readJson(response);
  return { ok: response.ok(), status: response.status(), body };
}

async function verifyIdentity(page, token, email, role) {
  const result = await requestJson(page, token, 'get', '/api/auth/me');
  expect(result.ok, `${role} auth/me failed with ${result.status}: ${JSON.stringify(result.body).slice(0, 400)}`).toBeTruthy();
  const returnedEmail = accountEmail(result.body);
  if (returnedEmail) expect(returnedEmail, `${role} auth/me returned a different account`).toBe(email.toLowerCase());
}

async function fetchLoginToken(page, email, password, role) {
  const paths = role === 'worker' ? ['/api/auth/login', '/api/worker/auth/login'] : ['/api/auth/login'];
  const attempts = [];
  for (const path of paths) {
    const response = await page.request.post(apiUrl(path), {
      data: { email, password },
      timeout: 30_000,
    });
    const body = await readJson(response);
    const token = tokenFrom(body);
    attempts.push({ path, status: response.status(), token: Boolean(token) });
    if (!response.ok() || body?.success === false || !token) continue;
    await verifyIdentity(page, token, email, role);
    return token;
  }
  throw new Error(`${role} API login failed: ${JSON.stringify(attempts)}`);
}

async function seedVerifiedSession(page, token, email, role) {
  await page.context().addInitScript(({ tokenValue, emailValue, roleValue }) => {
    sessionStorage.removeItem('churvox:logged-out');
    localStorage.setItem('token', tokenValue);
    localStorage.setItem('authToken', tokenValue);
    localStorage.setItem('access_token', tokenValue);
    localStorage.setItem('churvox_auth_session_snapshot_v1', JSON.stringify({
      at: Date.now(),
      token: tokenValue,
      user: {
        email: emailValue,
        role: roleValue,
        has_app_access: true,
        email_verified: true,
      },
    }));
  }, { tokenValue: token, emailValue: email, roleValue: role });
}

async function apiLogin(page, email, password, role) {
  const token = await fetchLoginToken(page, email, password, role);
  await seedVerifiedSession(page, token, email, role);
  return token;
}

async function uiLogin(page, email, password, role) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await waitStable(page);
  const emailFilled = await fillByLabelOrPlaceholder(page, 'email', email);
  const passwordFilled = await fillByLabelOrPlaceholder(page, 'password', password);
  expect(emailFilled, `${role} login email field was not found`).toBeTruthy();
  expect(passwordFilled, `${role} login password field was not found`).toBeTruthy();
  await clickLogin(page);
  await page.waitForFunction(() => Boolean(localStorage.getItem('token')), null, { timeout: 30_000 });
  const token = await page.evaluate(() => localStorage.getItem('token') || '');
  expect(token, `${role} login form did not create an authenticated token`).toBeTruthy();
  await verifyIdentity(page, token, email, role);
  await page.waitForURL((url) => !/\/login(?:[?#]|$)/i.test(url.pathname), { timeout: 15_000 }).catch(() => null);
  expect(page.url(), `${role} login did not leave the login page`).not.toMatch(/\/login(?:[?#]|$)/i);
}

async function findLinkedWorker(page, ownerToken) {
  for (const endpoint of ['/api/team/workers', '/api/team', '/api/workers']) {
    const result = await requestJson(page, ownerToken, 'get', `${endpoint}?ts=${Date.now()}`);
    if (!result.ok) continue;
    const worker = listFrom(result.body, ['workers', 'team', 'members'])
      .find((row) => String(row.email || row.worker_email || row.user_email || '').trim().toLowerCase() === WORKER_EMAIL.toLowerCase());
    if (worker) return worker;
  }
  throw new Error('Could not find the authenticated linked worker in Team.');
}

async function createAssignedWorkerJob(page) {
  const ownerToken = await fetchLoginToken(page, OWNER_EMAIL, OWNER_PASSWORD, 'owner');
  const worker = await findLinkedWorker(page, ownerToken);
  const workerId = idOf(worker);
  expect(workerId, 'linked worker id').toBeTruthy();

  const marker = `Full launch worker detail ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const workerName = worker.name || worker.full_name || worker.email || WORKER_EMAIL;
  const created = await requestJson(page, ownerToken, 'post', '/api/jobs', {
    title: marker,
    job_title: marker,
    job_type: 'other',
    client_name: 'Churvox launch audit',
    customer_name: 'Churvox launch audit',
    address: '1 Test Street, Wellington',
    scheduled_date: new Date().toISOString().slice(0, 10),
    scheduled_time: '09:00',
    estimated_duration: 30,
    status: 'assigned',
    price: 0,
    assigned_worker_id: workerId,
    worker_id: workerId,
    worker_email: WORKER_EMAIL,
    assigned_worker_name: workerName,
    worker_instructions: marker,
    notes: marker,
    source: 'full-launch-worker-detail-audit',
  });
  expect(created.ok, `owner could not create assigned worker audit job: ${created.status} ${JSON.stringify(created.body).slice(0, 500)}`).toBeTruthy();

  let job = created.body?.job || created.body?.data?.job || created.body?.data || created.body;
  let jobId = idOf(job);
  if (!jobId) {
    const listed = await requestJson(page, ownerToken, 'get', `/api/jobs?ts=${Date.now()}`);
    job = listFrom(listed.body, ['jobs']).find((row) => textHas(row, marker));
    jobId = idOf(job);
  }
  expect(jobId, 'created assigned worker audit job id').toBeTruthy();
  return { ownerToken, jobId, marker };
}

async function cleanupAssignedWorkerJob(page, fixture) {
  if (!fixture?.jobId || !fixture?.ownerToken) return;
  const archived = await requestJson(page, fixture.ownerToken, 'post', `/api/jobs/${encodeURIComponent(fixture.jobId)}/archive`, {
    archived: true,
    archive_reason: 'full launch worker detail audit cleanup',
  });
  const deleted = await requestJson(page, fixture.ownerToken, 'delete', `/api/jobs/${encodeURIComponent(fixture.jobId)}`);
  const cleaned = archived.ok || archived.status === 404 || deleted.ok || deleted.status === 404;
  expect(cleaned, `audit job cleanup failed: archive ${archived.status}, delete ${deleted.status}`).toBeTruthy();
}

test.describe('Churvox full launch public audit', () => {
  for (const route of publicRoutes) {
    test(`public page is readable and launch-clean: ${route}`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await expectBasics(page, route);
    });
  }
});

test.describe('Churvox authenticated login entry', () => {
  test('owner login form creates the correct authenticated session', async ({ page }) => {
    requireOrSkip(Boolean(OWNER_EMAIL && OWNER_PASSWORD), 'Set CHURVOX_OWNER_EMAIL and CHURVOX_OWNER_PASSWORD.');
    await uiLogin(page, OWNER_EMAIL, OWNER_PASSWORD, 'owner');
  });

  test('worker login form creates the correct authenticated session', async ({ page }) => {
    requireOrSkip(Boolean(WORKER_EMAIL && WORKER_PASSWORD), 'Set CHURVOX_WORKER_EMAIL and CHURVOX_WORKER_PASSWORD.');
    await uiLogin(page, WORKER_EMAIL, WORKER_PASSWORD, 'worker');
  });
});

test.describe('Churvox full launch owner audit', () => {
  test.beforeEach(async ({ page }) => {
    requireOrSkip(Boolean(OWNER_EMAIL && OWNER_PASSWORD), 'Set CHURVOX_OWNER_EMAIL and CHURVOX_OWNER_PASSWORD.');
    await apiLogin(page, OWNER_EMAIL, OWNER_PASSWORD, 'owner');
  });

  for (const hash of ownerHashes) {
    test(`owner area opens and is launch-clean: ${hash}`, async ({ page }) => {
      await page.goto(`/dashboard#${hash}`, { waitUntil: 'domcontentloaded' });
      expect(page.url(), `dashboard#${hash} redirected out of the authenticated owner area`).toMatch(/\/dashboard(?:[/?#]|$)/i);
      await expect(page.locator('body')).toContainText(/Churvox|Command|Job|Client|Quote|Invoice|Payroll|Xero|Help|Settings/i);
      await expectBasics(page, `dashboard#${hash}`);
    });
  }

  test('owner navigation keeps every current Studio area', async ({ page, isMobile }) => {
  await page.goto('/dashboard#command', { waitUntil: 'domcontentloaded' });
  expect(page.url(), 'owner navigation audit redirected out of dashboard').toMatch(/\/dashboard(?:[/?#]|$)/i);
  await waitStable(page);
  await expect(page.locator('[data-churvox-layout="fresh-studio"]'), 'Studio owner shell did not load').toBeVisible();

  const studioAreas = ['Today', 'Work', 'Clients', 'Money', 'Team', 'Messages', 'Command'];
  if (isMobile) {
    const dock = page.locator('.cvsMobileDock');
    for (const item of ['Today', 'Work', 'Command', 'Messages', 'More']) {
      await expect(dock.getByRole('button').filter({ hasText: new RegExp(`^\s*${item}\b`, 'i') }).first(), `missing mobile Studio navigation: ${item}`).toBeVisible();
    }

    await dock.getByRole('button').filter({ hasText: /^\s*More\b/i }).first().click();
    const morePanel = page.locator('.cvsMobileMore section');
    await expect(morePanel, 'mobile Studio More panel did not open').toBeVisible();
    for (const item of studioAreas) {
      await expect(morePanel.getByRole('button').filter({ hasText: new RegExp(`^\s*${item}\b`, 'i') }).first(), `missing mobile Studio area: ${item}`).toBeVisible();
    }
    for (const item of ['Settings', 'Plans & billing', 'Help']) {
      await expect(morePanel.getByRole('button').filter({ hasText: new RegExp(`^\s*${item}\b`, 'i') }).first(), `missing mobile account area: ${item}`).toBeVisible();
    }
  } else {
    const nav = page.getByRole('navigation', { name: /Main Churvox navigation/i });
    await expect(nav, 'desktop Studio navigation did not load').toBeVisible();
    for (const item of studioAreas) {
      await expect(nav.getByRole('button').filter({ hasText: new RegExp(`^\s*${item}\b`, 'i') }).first(), `missing desktop Studio area: ${item}`).toBeVisible();
    }

    await page.locator('.cvsProfileWrap > button.profile').click();
    const profileMenu = page.locator('.cvsProfileMenu');
    await expect(profileMenu, 'desktop account menu did not open').toBeVisible();
    for (const item of ['Settings', 'Plans & billing', 'Help']) {
      await expect(profileMenu.getByRole('button').filter({ hasText: new RegExp(item, 'i') }).first(), `missing desktop account area: ${item}`).toBeVisible();
    }
  }
});
});

test.describe('Churvox full launch worker audit', () => {
  test.beforeEach(async ({ page }) => {
    requireOrSkip(Boolean(WORKER_EMAIL && WORKER_PASSWORD), 'Set CHURVOX_WORKER_EMAIL and CHURVOX_WORKER_PASSWORD.');
    await apiLogin(page, WORKER_EMAIL, WORKER_PASSWORD, 'worker');
  });

  test('worker jobs page is launch-clean and worker-scoped', async ({ page }) => {
    await page.goto('/worker/jobs', { waitUntil: 'domcontentloaded' });
    expect(page.url(), 'worker jobs audit redirected out of worker area').toMatch(/\/worker(?:[/?#]|$)/i);
    await expect(page.locator('body')).toContainText(/Today|Work|Job|Waiting|Assigned|Refresh/i);
    await expectBasics(page, 'worker jobs');
    await expect(page.locator('body')).not.toContainText(/Owner workspace|Platform Admin|Billing|Reports/i);
  });

  test('worker job detail has real field controls for an assigned job', async ({ page, isMobile }) => {
    test.setTimeout(120_000);
    const fixture = await createAssignedWorkerJob(page);
    try {
      await page.goto('/worker/jobs', { waitUntil: 'domcontentloaded' });
      expect(page.url(), 'worker detail audit redirected out of worker area').toMatch(/\/worker(?:[/?#]|$)/i);

      const assignedJob = page.getByRole('button', { name: new RegExp(fixture.marker, 'i') }).first();
      await expect(assignedJob, 'created assigned job did not appear in the worker queue').toBeVisible({ timeout: 30_000 });
      await assignedJob.click();
      await expect(page.locator('body')).toContainText(fixture.marker, { timeout: 15_000 });

      for (const control of ['Acknowledge', 'Start', 'Pause', 'Resume', 'Complete']) {
        await expect(page.getByRole('button', { name: new RegExp(`^${control}$`, 'i') }).first(), `missing worker control: ${control}`).toBeVisible();
      }
      await expect(page.getByText('Photo proof', { exact: true }).first(), 'missing Photo proof control').toBeVisible();
      await expect(page.getByRole('button', { name: /^Send proof note$/i }).first(), 'missing Send proof note control').toBeVisible();
      await expect(page.getByRole('button', { name: /^Timer note$/i }).first(), 'missing Timer note control').toBeVisible();
      if (!isMobile) {
        await expect(page.getByText('Office link', { exact: true }).first(), 'missing desktop Office link control').toBeVisible();
      }
      await expectBasics(page, 'worker job detail');
    } finally {
      await cleanupAssignedWorkerJob(page, fixture);
    }
  });
});
