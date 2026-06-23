const { test, expect } = require('@playwright/test');

const OWNER_EMAIL = process.env.CHURVOX_OWNER_EMAIL || process.env.CHURVOX_E2E_EMAIL || '';
const OWNER_PASSWORD = process.env.CHURVOX_OWNER_PASSWORD || process.env.CHURVOX_E2E_PASSWORD || '';
const WORKER_EMAIL = process.env.CHURVOX_WORKER_EMAIL || process.env.CHURVOX_E2E_WORKER_EMAIL || '';
const WORKER_PASSWORD = process.env.CHURVOX_WORKER_PASSWORD || process.env.CHURVOX_E2E_WORKER_PASSWORD || '';
const API_BASE = (process.env.PLAYWRIGHT_API_BASE || 'https://grassley-backend.onrender.com').replace(/\/+$/, '');
const MUTATE = process.env.CHURVOX_E2E_MUTATE === '1';
const DANGEROUS_GUARD_CLICKS = process.env.CHURVOX_FULL_AUDIT_DANGEROUS === '1';

const ownerRoutes = [
  '/dashboard', '/dashboard#smart', '/dashboard#jobs', '/jobs', '/jobs/new',
  '/dashboard#clients', '/clients', '/clients/new', '/dashboard#quotes', '/quotes', '/quotes/new',
  '/dashboard#invoices', '/invoices', '/invoices/new', '/dashboard#dispatch', '/calendar',
  '/dashboard#team', '/team', '/dashboard#command', '/dashboard#payroll', '/payroll',
  '/dashboard#automation', '/automation', '/dashboard#xero', '/settings', '/plans', '/support', '/help',
];

const workerRoutes = ['/worker', '/worker/jobs', '/worker/today', '/worker/messages', '/worker/profile', '/worker/settings'];

const hardDanger = /delete|remove|archive|trash|clear|pay now|checkout|stripe|send invoice|send quote|send email|send sms|approve|decline|disconnect|revoke|sync to xero|sync to myob|file tax|bank payout|log out|logout/i;
const allowedDangerProbe = /delete|remove|archive|trash|clear|approve|decline|disconnect|revoke/i;
const uselessControl = /^(|x|menu|open menu|close menu)$/i;

function apiUrl(url) {
  return `${API_BASE}${url.startsWith('/api') ? url : `/api${url}`}`;
}

function stamp() {
  return new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
}

function idOf(value) {
  if (!value) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return String(value.id || value._id || value.$oid || value.oid || value.worker_id || value.user_id || value.job_id || '');
}

function listFrom(payload, keys = []) {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  for (const key of keys) if (Array.isArray(data?.[key])) return data[key];
  for (const key of ['workers', 'team', 'members', 'jobs', 'notifications', 'items', 'records', 'results', 'data']) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

function textHas(value, token) {
  return JSON.stringify(value || {}).toLowerCase().includes(String(token || '').toLowerCase());
}

async function waitSettled(page) {
  if (page.isClosed()) return;
  await page.waitForLoadState('domcontentloaded').catch(() => null);
  await page.waitForLoadState('networkidle', { timeout: 1200 }).catch(() => null);
  await page.waitForTimeout(120).catch(() => null);
}

async function pageText(page) {
  return (await page.locator('body').innerText({ timeout: 8000 }).catch(() => '')).replace(/\s+/g, ' ').trim();
}

async function fillAny(page, names, value) {
  for (const name of names) {
    const byLabel = page.getByLabel(new RegExp(name, 'i')).first();
    if (await byLabel.isVisible().catch(() => false)) {
      await byLabel.fill(String(value)).catch(async () => {
        await byLabel.click();
        await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
        await page.keyboard.type(String(value));
      });
      return true;
    }

    const byPlaceholder = page.getByPlaceholder(new RegExp(name, 'i')).first();
    if (await byPlaceholder.isVisible().catch(() => false)) {
      await byPlaceholder.fill(String(value)).catch(async () => {
        await byPlaceholder.click();
        await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
        await page.keyboard.type(String(value));
      });
      return true;
    }

    const byName = page.locator(`input[name*="${name}" i], textarea[name*="${name}" i], select[name*="${name}" i]`).first();
    if (await byName.isVisible().catch(() => false)) {
      await byName.fill(String(value)).catch(() => null);
      return true;
    }
  }
  return false;
}

async function clickLogin(page) {
  const submit = page.locator('form button[type="submit"], button[type="submit"], input[type="submit"]').first();
  if (await submit.isVisible().catch(() => false)) {
    await submit.click();
    await waitSettled(page);
    return;
  }
  const button = page.getByRole('button', { name: /log in|login|sign in/i }).first();
  if (await button.isVisible().catch(() => false)) {
    await button.click();
    await waitSettled(page);
    return;
  }
  throw new Error('No login submit button found');
}

async function login(page, email, password, label) {
  test.skip(!email || !password, `Set ${label} email/password env vars.`);
  await page.goto('/login');
  await waitSettled(page);
  await fillAny(page, ['email'], email);
  await fillAny(page, ['password'], password);
  await clickLogin(page);
  await page.waitForURL(/dashboard|plans|setup|guide|worker|admin/i, { timeout: 40000 }).catch(() => null);
  await waitSettled(page);
  const body = await pageText(page);
  const token = await page.evaluate(() => window.localStorage.getItem('token') || '').catch(() => '');
  const stillOnLogin = /\/login(?:$|[?#])/i.test(new URL(page.url()).pathname);
  const hasLoginError = /invalid|incorrect|wrong|failed|try again|required|not found/i.test(body);
  expect(body, `${label} login should render app text`).toMatch(/Churvox|Plan|Dashboard|Business|Worker|Job|Client|Command/i);
  expect(!stillOnLogin || Boolean(token), `${label} login should leave login screen or create token. URL=${page.url()} BODY=${body.slice(0, 500)}`).toBeTruthy();
  expect(hasLoginError, `${label} login should not show an auth error. URL=${page.url()} BODY=${body.slice(0, 500)}`).toBeFalsy();
}

async function attachReport(testInfo, name, data) {
  await testInfo.attach(name, { body: JSON.stringify(data, null, 2), contentType: 'application/json' });
}

async function watchPage(page, report) {
  page.on('pageerror', error => report.errors.push({ type: 'pageerror', message: error.message }));
  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error' && !/favicon|manifest|ResizeObserver|AbortError|net::ERR_ABORTED|401|403|404/i.test(text)) {
      report.errors.push({ type: 'console', message: text.slice(0, 800) });
    }
  });
  page.on('response', response => {
    const url = response.url();
    if (response.status() >= 500 && /churvox|grassley-backend|onrender|localhost|127\.0\.0\.1/i.test(url)) {
      report.errors.push({ type: 'http', status: response.status(), url });
    }
  });
}

async function tagControls(page) {
  return page.evaluate(() => {
    const nodes = [...document.querySelectorAll('button, a[href], input[type="button"], input[type="submit"], input[type="reset"], [role="button"], summary')];
    const controls = [];
    let index = 0;
    for (const el of nodes) {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      const visible = rect.width > 1 && rect.height > 1 && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || '1') > 0.03;
      if (!visible) continue;
      if (typeof el.checkVisibility === 'function' && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
      if (el.closest('[hidden], [aria-hidden="true"]')) continue;
      const label = (el.innerText || el.textContent || el.getAttribute('aria-label') || el.getAttribute('title') || el.getAttribute('name') || el.getAttribute('value') || el.getAttribute('href') || '').trim().replace(/\s+/g, ' ');
      const href = el.getAttribute('href') || '';
      const id = `qa-control-${index}`;
      el.setAttribute('data-churvox-qa-control', id);
      controls.push({ id, index, tag: el.tagName, label: label.slice(0, 140), href, disabled: Boolean(el.disabled || el.getAttribute('aria-disabled') === 'true'), pointerEvents: style.pointerEvents, size: `${Math.round(rect.width)}x${Math.round(rect.height)}` });
      index += 1;
    }
    return controls;
  });
}

async function closeOverlays(page) {
  const close = page.getByRole('button', { name: /cancel|close|no|dismiss|back/i }).first();
  if (await close.isVisible().catch(() => false)) await close.click().catch(() => null);
  else await page.keyboard.press('Escape').catch(() => null);
  await waitSettled(page);
}

async function assertLayoutHealth(page, route, routeReport) {
  const health = await page.evaluate(() => {
    const body = document.body;
    const vw = document.documentElement.clientWidth;
    const sw = Math.max(document.documentElement.scrollWidth, body?.scrollWidth || 0);
    const text = (body?.innerText || '').trim().replace(/\s+/g, ' ');
    const issues = [];
    if (sw - vw > 12) issues.push(`horizontal overflow ${sw - vw}px`);
    if (text.length < 25) issues.push('almost no visible page text');
    for (const el of document.querySelectorAll('button, a[href], [role="button"], input, textarea, select')) {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      const visible = rect.width > 1 && rect.height > 1 && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || '1') > 0.03;
      if (!visible) continue;
      if (typeof el.checkVisibility === 'function' && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
      const label = (el.innerText || el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.getAttribute('name') || el.getAttribute('title') || '').trim().replace(/\s+/g, ' ');
      if (!label && !['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) issues.push(`unlabelled ${el.tagName}`);
      if (rect.width < 14 || rect.height < 14) issues.push(`tiny control "${label || el.tagName}" ${Math.round(rect.width)}x${Math.round(rect.height)}`);
      if (style.pointerEvents === 'none') issues.push(`pointer-events none "${label || el.tagName}"`);
    }
    return { textLength: text.length, issues: issues.slice(0, 80) };
  });
  routeReport.layout = health;
  expect(health.textLength, `${route} visible text`).toBeGreaterThan(25);
  expect(health.issues, `${route} layout/control issues`).toEqual([]);
}

function controlKey(control) {
  return `${control.tag}|${control.href}|${control.label}`;
}

async function findControl(page, wanted) {
  const controls = await tagControls(page);
  return controls.find(control => controlKey(control) === controlKey(wanted)) || controls[wanted.index] || null;
}

async function clickControl(page, route, control, routeReport) {
  const label = control.label || `${control.tag} ${control.index}`;
  const match = await findControl(page, control);
  if (!match) {
    routeReport.unavailableSkipped.push({ label, href: control.href, reason: 'not found after reload' });
    return;
  }
  if (match.disabled || match.pointerEvents === 'none') {
    routeReport.unavailableSkipped.push({ label, href: control.href, reason: 'disabled or pointer-events none after reload' });
    return;
  }

  const locator = page.locator(`[data-churvox-qa-control="${match.id}"]`).first();
  if (!(await locator.isVisible().catch(() => false))) {
    routeReport.unavailableSkipped.push({ label, href: control.href, reason: 'locator not visible after reload' });
    return;
  }

  await locator.scrollIntoViewIfNeeded({ timeout: 2500 }).catch(() => null);
  await page.waitForTimeout(80).catch(() => null);

  const beforeUrl = page.url();
  const beforeText = await pageText(page);
  let popup = null;
  page.once('popup', p => { popup = p; });

  try {
    await locator.click({ trial: true, timeout: 2000 });
    await locator.click({ timeout: 4000 });
    await waitSettled(page);
    if (popup) await popup.close().catch(() => null);
    const afterUrl = page.url();
    const afterText = await pageText(page);
    const openedDialog = await page.locator('[role="dialog"], dialog, .modal, [aria-modal="true"]').first().isVisible().catch(() => false);
    const isDanger = hardDanger.test(label);
    routeReport.clicked.push({ label, href: control.href, beforeUrl, afterUrl, openedDialog, changedText: beforeText !== afterText, dangerProbe: isDanger });
    if (/stripe\.com|checkout/i.test(afterUrl)) throw new Error(`unexpected external checkout navigation from ${label}`);
    if (isDanger) expect(openedDialog || /confirm|are you sure|cancel/i.test(afterText), `${route} dangerous control "${label}" should show a guard`).toBeTruthy();
    await closeOverlays(page);
  } catch (error) {
    routeReport.failedClicks.push({ control: match, reason: error.message });
  }
}

async function sweepRoute(page, route, report) {
  const routeReport = { route, controls: [], clicked: [], dangerousSkipped: [], unavailableSkipped: [], failedClicks: [], missingLabels: [] };
  report.routes.push(routeReport);
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await waitSettled(page);
  await assertLayoutHealth(page, route, routeReport);
  const initialControls = await tagControls(page);
  routeReport.controls = initialControls;
  routeReport.missingLabels = initialControls.filter(c => !c.label && !['INPUT', 'TEXTAREA', 'SELECT'].includes(c.tag));

  const seen = new Set();
  for (const control of initialControls) {
    const label = control.label || `${control.tag} ${control.index}`;
    const key = controlKey(control);
    if (seen.has(key)) continue;
    seen.add(key);
    if (control.disabled || control.pointerEvents === 'none') continue;
    if (uselessControl.test(label)) continue;
    const isDanger = hardDanger.test(label);
    if (isDanger && (!DANGEROUS_GUARD_CLICKS || !allowedDangerProbe.test(label))) {
      routeReport.dangerousSkipped.push(control);
      continue;
    }
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await waitSettled(page);
    await clickControl(page, route, control, routeReport);
  }

  await attachReport(test.info(), `${report.account || 'flow'}-${route.replace(/[^a-z0-9]+/gi, '-')}-${test.info().project.name}.json`, routeReport);
  expect(routeReport.missingLabels, `${route} controls need labels`).toEqual([]);
  expect(routeReport.failedClicks, `${route} click failures`).toEqual([]);
}

async function apiSession(page) {
  const token = await page.evaluate(() => window.localStorage.getItem('token') || '');
  return { request: page.context().request, token };
}

function apiOptions(session, extra = {}) {
  return { ...extra, headers: { ...(extra.headers || {}), ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}) } };
}

async function getJson(session, url) {
  const res = await session.request.get(apiUrl(url), apiOptions(session));
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok(), status: res.status(), body };
}

async function postJson(session, url, data) {
  const res = await session.request.post(apiUrl(url), apiOptions(session, { data }));
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok(), status: res.status(), body };
}

async function patchJson(session, url, data) {
  const res = await session.request.patch(apiUrl(url), apiOptions(session, { data }));
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok(), status: res.status(), body };
}

async function findWorker(ownerSession) {
  const endpoints = ['/api/team/workers', '/api/team', '/api/workers', '/api/worker/live-status'];
  for (const endpoint of endpoints) {
    const res = await getJson(ownerSession, `${endpoint}?ts=${Date.now()}`);
    if (!res.ok) continue;
    const workers = listFrom(res.body, ['workers', 'team', 'members']);
    const wanted = workers.find(worker => String(worker.email || worker.worker_email || '').toLowerCase() === WORKER_EMAIL.toLowerCase());
    if (wanted) return wanted;
  }
  throw new Error(`Could not find worker ${WORKER_EMAIL}. Add/invite this worker before running the full loop.`);
}

async function getJob(session, jobId, token) {
  if (jobId) {
    const direct = await getJson(session, `/api/jobs/${encodeURIComponent(jobId)}`);
    if (direct.ok && textHas(direct.body, jobId)) return direct.body.job || direct.body.data?.job || direct.body.data || direct.body;
  }
  const list = await getJson(session, `/api/jobs?ts=${Date.now()}`);
  const jobs = listFrom(list.body, ['jobs']);
  return jobs.find(job => idOf(job) === String(jobId) || textHas(job, token)) || null;
}

test.describe('Churvox full human audit v3', () => {
  for (const route of ownerRoutes) {
    test(`owner route ${route} renders and visible safe controls click`, async ({ page }, testInfo) => {
      test.setTimeout(240000);
      const report = { account: 'owner', project: testInfo.project.name, route, errors: [] };
      await watchPage(page, report);
      await login(page, OWNER_EMAIL, OWNER_PASSWORD, 'owner');
      await sweepRoute(page, route, report);
      expect(report.errors, `${route} browser/page/backend errors`).toEqual([]);
    });
  }

  for (const route of workerRoutes) {
    test(`worker route ${route} renders and visible safe controls click`, async ({ page }, testInfo) => {
      test.setTimeout(240000);
      const report = { account: 'worker', project: testInfo.project.name, route, errors: [] };
      await watchPage(page, report);
      await login(page, WORKER_EMAIL, WORKER_PASSWORD, 'worker');
      await sweepRoute(page, route, report);
      expect(report.errors, `${route} browser/page/backend errors`).toEqual([]);
    });
  }

  test('owner and worker: full boss-to-worker and worker-to-boss message loop', async ({ browser }, testInfo) => {
    test.setTimeout(240000);
    test.skip(!MUTATE, 'Set CHURVOX_E2E_MUTATE=1 to create a safe test job and verify the real worker/employer loop.');
    const report = { project: testInfo.project.name, flow: [], errors: [] };
    const ownerContext = await browser.newContext();
    const workerContext = await browser.newContext();
    const ownerPage = await ownerContext.newPage();
    const workerPage = await workerContext.newPage();
    await watchPage(ownerPage, report);
    await watchPage(workerPage, report);
    const id = stamp();
    const bossToken = `Boss to worker full audit ${id}`;
    const workerHelpToken = `Worker to boss full audit ${id}`;
    const workerDoneToken = `Worker finished full audit ${id}`;

    await login(ownerPage, OWNER_EMAIL, OWNER_PASSWORD, 'owner');
    const ownerSession = await apiSession(ownerPage);
    const worker = await findWorker(ownerSession);
    const workerId = idOf(worker);
    expect(workerId, 'worker id').toBeTruthy();
    report.flow.push({ step: 'found worker', workerId, workerEmail: WORKER_EMAIL });

    const createJob = await postJson(ownerSession, '/api/jobs', {
      title: `Playwright full worker message job ${id}`,
      job_type: 'other', customer_name: 'Playwright Full Audit Customer', address: '1 Test Street, Wellington',
      scheduled_date: new Date().toISOString(), scheduled_time: '09:00', estimated_duration: 60, price: 0,
      assigned_worker_id: workerId, worker_instructions: bossToken, notes: bossToken,
    });
    report.flow.push({ step: 'owner created assigned job', status: createJob.status, body: createJob.body });
    expect(createJob.ok, `owner can create assigned worker job: ${JSON.stringify(createJob.body)}`).toBeTruthy();
    let job = createJob.body.job || createJob.body.data?.job || createJob.body.data || createJob.body;
    let jobId = idOf(job);
    if (!jobId) {
      job = await getJob(ownerSession, '', bossToken);
      jobId = idOf(job);
    }
    expect(jobId, 'created job id').toBeTruthy();

    await login(workerPage, WORKER_EMAIL, WORKER_PASSWORD, 'worker');
    const workerSession = await apiSession(workerPage);
    const workerSeesJob = await getJob(workerSession, jobId, bossToken);
    report.flow.push({ step: 'worker loaded assigned job', job: workerSeesJob });
    expect(workerSeesJob, 'worker can load assigned job').toBeTruthy();
    expect(textHas(workerSeesJob, bossToken), 'worker receives boss instructions').toBeTruthy();
    await workerPage.goto(`/worker/jobs/${encodeURIComponent(jobId)}`);
    await waitSettled(workerPage);
    expect(await pageText(workerPage), 'worker job detail shows boss instructions').toContain(bossToken);

    const office = await postJson(workerSession, '/api/worker/contact-office', { message: workerHelpToken, job_id: jobId, job_title: `Playwright full worker message job ${id}` });
    report.flow.push({ step: 'worker contacted office', status: office.status, body: office.body });
    expect(office.ok && office.body?.success !== false, `worker contact-office succeeds: ${JSON.stringify(office.body)}`).toBeTruthy();
    const notifications = await getJson(ownerSession, `/api/notifications?limit=100&ts=${Date.now()}`);
    report.flow.push({ step: 'owner notifications after worker message', status: notifications.status, body: notifications.body });
    expect(notifications.ok, 'owner notifications load').toBeTruthy();
    expect(textHas(notifications.body, workerHelpToken), 'owner receives worker help message in notifications').toBeTruthy();

    const fieldUpdate = await patchJson(workerSession, `/api/worker/jobs/${encodeURIComponent(jobId)}/field-update`, { worker_notes: workerDoneToken });
    report.flow.push({ step: 'worker saved field update', status: fieldUpdate.status, body: fieldUpdate.body });
    expect(fieldUpdate.ok && fieldUpdate.body?.success !== false, `worker field update succeeds: ${JSON.stringify(fieldUpdate.body)}`).toBeTruthy();
    const complete = await postJson(workerSession, `/api/worker/jobs/${encodeURIComponent(jobId)}/complete`, {
      worker_notes: workerDoneToken, photos: [], completed_by_worker: true,
      work_review_status: 'ready_for_review', review_status: 'ready_for_review', owner_review_status: 'ready_for_review',
    });
    report.flow.push({ step: 'worker completed job for owner review', status: complete.status, body: complete.body });
    expect(complete.ok && complete.body?.success !== false, `worker complete succeeds: ${JSON.stringify(complete.body)}`).toBeTruthy();
    const ownerSeesDone = await getJob(ownerSession, jobId, workerDoneToken);
    report.flow.push({ step: 'owner loaded completed worker message', job: ownerSeesDone });
    expect(textHas(ownerSeesDone, workerDoneToken), 'owner receives worker completion message').toBeTruthy();
    await attachReport(testInfo, `worker-employer-full-loop-v3-${testInfo.project.name}.json`, report);
    await ownerContext.close();
    await workerContext.close();
    expect(report.errors, 'browser/page/backend errors').toEqual([]);
  });
});
