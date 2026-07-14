const { test, expect } = require('@playwright/test');

const LAB_SCREENS = [
  'today', 'command', 'work', 'schedule', 'clients', 'messages', 'worker', 'quotes', 'invoices', 'money',
  'staff', 'payroll', 'team', 'playbooks', 'integrations', 'activity', 'automation', 'branding', 'settings',
  'plans', 'help', 'readiness', 'safety',
];

const INTERACTIVE_SCREENS = [
  'today', 'command', 'work', 'schedule', 'clients', 'messages', 'worker', 'quotes', 'invoices', 'money',
  'staff', 'payroll', 'team', 'integrations', 'automation', 'branding', 'settings', 'plans', 'help', 'readiness',
];

const PUBLIC_PAGES = ['/', '/pricing', '/contact', '/login'];
const SAFETY = 'Nothing was sent, synced, charged or changed.';
const PLATFORM_OWNER = Object.freeze({
  id: 'safe-platform-owner',
  email: 'hello@churvox.com',
  role: 'owner',
  user_role: 'owner',
  email_verified: true,
  has_app_access: true,
  subscription_status: 'active',
  plan: 'command',
  business_id: 'safe-platform-owner-business',
});

function json(body, status = 200, headers = {}) {
  return { status, contentType: 'application/json', headers, body: JSON.stringify(body) };
}

async function installSafeApi(page) {
  await page.addInitScript(() => {
    window.__cvClipboardWrites = [];
    try {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async (value) => { window.__cvClipboardWrites.push(String(value)); },
          readText: async () => window.__cvClipboardWrites.at(-1) || '',
        },
      });
    } catch {}
  });

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;
    const method = request.method();

    if (pathname === '/api/auth/me') {
      const currentPath = new URL(page.url()).pathname;
      const labRoute = ['/office-team-lab', '/office-lab', '/new-command-lab'].includes(currentPath);
      await route.fulfill(labRoute
        ? json({ success: true, user: PLATFORM_OWNER, ...PLATFORM_OWNER })
        : json({ success: false, user: null }, 401));
      return;
    }

    if (/\/accounting\/export\/pack/i.test(pathname)) {
      await route.fulfill({ status: 200, contentType: 'application/zip', body: 'CHURVOX-SAFE-TEST-EXPORT' });
      return;
    }
    if (/\/command\/human-mimic-marker/i.test(pathname)) {
      await route.fulfill(json({ success: true, version: 'human-mimic-intelligence-v3', roles: new Array(8).fill('role'), safety: SAFETY }));
      return;
    }
    if (/\/command\/scan/i.test(pathname)) {
      await route.fulfill(json({ success: true, source: 'human-mimic-intelligence-v3', slips: [], existing: [], created_count: 0, existing_count: 0, role_counts: {}, safety: SAFETY }));
      return;
    }
    if (/\/command\/(?:slips|events|audit)/i.test(pathname) && method === 'GET') {
      await route.fulfill(json({ success: true, slips: [], events: [], audit: [], safety: SAFETY }));
      return;
    }
    if (/\/command\//i.test(pathname) && method !== 'GET') {
      await route.fulfill(json({ success: true, slip: { id: 'safe-test-slip', status: 'open' }, result: { execution: { applied: false } }, safety: SAFETY }));
      return;
    }
    if (/\/xero\/status|\/accounting\/status/i.test(pathname)) {
      await route.fulfill(json({ success: true, connected: false, status: 'disconnected', tenant_name: '', safety: SAFETY }));
      return;
    }
    if (/\/xero\/connect\/start/i.test(pathname)) {
      await route.fulfill(json({ success: true, url: '/office-team-lab#integrations', safety: SAFETY }));
      return;
    }
    if (/\/logic\/business-profile/i.test(pathname)) {
      await route.fulfill(json({ success: true, profile: {}, business_profile: {}, safety: SAFETY }));
      return;
    }
    if (/\/industry\/(?:profiles|context)/i.test(pathname)) {
      await route.fulfill(json({ success: true, profiles: [], context: {}, safety: SAFETY }));
      return;
    }

    await route.fulfill(json({
      success: true,
      data: [], items: [], rows: [], records: [], jobs: [], clients: [], customers: [], workers: [], team: [],
      quotes: [], invoices: [], messages: [], audit: [], events: [], slips: [], profile: {}, context: {},
      safety: SAFETY,
    }));
  });
}

function watchRuntime(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (/favicon|manifest|ResizeObserver|AbortError|net::ERR_ABORTED|Failed to load resource.*(?:401|404)/i.test(text)) return;
    errors.push(`console: ${text.slice(0, 700)}`);
  });
  page.on('response', (response) => {
    if (response.status() >= 500) errors.push(`http ${response.status()}: ${response.url()}`);
  });
  return errors;
}

async function settle(page) {
  await page.waitForLoadState('domcontentloaded').catch(() => null);
  await page.waitForLoadState('networkidle', { timeout: 1200 }).catch(() => null);
  await page.waitForTimeout(160);
}

async function lab(page, screen) {
  await page.goto(`/office-team-lab#${screen}`, { waitUntil: 'domcontentloaded' });
  await settle(page);
  await expect(page.locator('.cvOfficeSite')).toBeVisible();
  await expect(page.locator('.cvSiteScreen')).toBeVisible();
  await expect(page.locator('.cvOfficeSite')).toHaveAttribute('data-screen', screen);
}

async function health(page, { mobile = false, publicPage = false } = {}) {
  return page.evaluate(({ mobile, publicPage }) => {
    const visible = (element) => {
      if (!element || element.closest('[hidden], [aria-hidden="true"]')) return false;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0.03 && rect.width > 1 && rect.height > 1;
    };
    const label = (element) => String(
      element.innerText || element.textContent || element.getAttribute('aria-label') || element.getAttribute('title')
      || element.getAttribute('placeholder') || element.getAttribute('name') || element.getAttribute('value') || ''
    ).trim().replace(/\s+/g, ' ');
    const hasHorizontalScroller = (element) => {
      let current = element.parentElement;
      while (current && current !== document.body) {
        const style = getComputedStyle(current);
        if (/auto|scroll/.test(style.overflowX) && current.scrollWidth > current.clientWidth + 2) return true;
        current = current.parentElement;
      }
      return false;
    };
    const issues = [];
    const body = document.body;
    const root = document.documentElement;
    const text = String(body?.innerText || '').trim().replace(/\s+/g, ' ');
    const overflow = Math.max(root.scrollWidth, body?.scrollWidth || 0) - root.clientWidth;
    if (text.length < (publicPage ? 20 : 60)) issues.push(`blank/short page (${text.length} chars)`);
    if (overflow > 14) issues.push(`horizontal overflow ${overflow}px`);

    const mains = [...document.querySelectorAll('main')].filter(visible);
    if (!publicPage && mains.length !== 1) issues.push(`expected one visible main landmark, found ${mains.length}`);

    const ids = new Set();
    for (const element of document.querySelectorAll('[id]')) {
      if (ids.has(element.id)) issues.push(`duplicate id ${element.id}`);
      ids.add(element.id);
    }

    const controls = [...document.querySelectorAll('button, a[href], input, textarea, select, summary, [role="button"]')].filter(visible);
    for (const element of controls) {
      const rect = element.getBoundingClientRect();
      const textLabel = label(element);
      const tag = element.tagName;
      const type = String(element.getAttribute('type') || '').toLowerCase();
      const nativeChoice = tag === 'INPUT' && /^(checkbox|radio|hidden)$/.test(type);
      if (!textLabel && !['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) issues.push(`unlabelled ${tag.toLowerCase()}`);
      const minimum = mobile ? 28 : 18;
      if (!nativeChoice && !element.disabled && (rect.width < minimum || rect.height < minimum)) {
        issues.push(`tiny control ${textLabel || tag} ${Math.round(rect.width)}x${Math.round(rect.height)}`);
      }
      if (getComputedStyle(element).pointerEvents === 'none' && !element.disabled) issues.push(`untappable control ${textLabel || tag}`);
      if ((rect.left < -3 || rect.right > root.clientWidth + 3) && !hasHorizontalScroller(element)) issues.push(`control outside viewport ${textLabel || tag}`);
      if (tag === 'A') {
        const href = String(element.getAttribute('href') || '').trim();
        if (!href || href === '#' || /^javascript:/i.test(href)) issues.push(`dead link ${textLabel || '(unlabelled)'}`);
        if (element.target === '_blank' && !/noopener|noreferrer/.test(element.rel || '')) issues.push(`unsafe target blank ${textLabel}`);
      }
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) && type !== 'hidden') {
        const id = element.id;
        const associated = Boolean(
          element.getAttribute('aria-label') || element.getAttribute('aria-labelledby') || element.getAttribute('placeholder')
          || element.getAttribute('name') || (id && document.querySelector(`label[for="${CSS.escape(id)}"]`)) || element.closest('label')
        );
        if (!associated) issues.push(`unlabelled field ${tag.toLowerCase()}`);
      }
    }

    for (const form of document.querySelectorAll('form')) {
      if (!visible(form)) continue;
      if (!form.querySelector('button[type="submit"], input[type="submit"]')) issues.push('form has no visible submit control');
    }

    const busy = [...document.querySelectorAll('[aria-busy="true"]')].filter(visible);
    if (busy.length) issues.push(`${busy.length} control(s) remained busy`);
    return { issues: [...new Set(issues)].slice(0, 100), controls: controls.length, textLength: text.length };
  }, { mobile, publicPage });
}

async function stateSnapshot(page) {
  if (page.isClosed()) return { closed: true };
  return page.evaluate(() => {
    const target = document.querySelector('.cvSiteScreen') || document.body;
    const source = target?.innerHTML || '';
    let hash = 2166136261;
    for (let index = 0; index < source.length; index += 1) {
      hash ^= source.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    const storage = {};
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      storage[`l:${key}`] = localStorage.getItem(key);
    }
    for (let index = 0; index < sessionStorage.length; index += 1) {
      const key = sessionStorage.key(index);
      storage[`s:${key}`] = sessionStorage.getItem(key);
    }
    return {
      url: location.href,
      hash: String(hash >>> 0),
      text: String(target?.innerText || '').replace(/\s+/g, ' ').trim(),
      storage: JSON.stringify(storage),
      clipboard: JSON.stringify(window.__cvClipboardWrites || []),
      dialogs: document.querySelectorAll('[role="dialog"]:not([hidden]), dialog[open]').length,
    };
  });
}

function changed(before, after) {
  if (!before || !after) return false;
  return before.closed !== after.closed
    || before.url !== after.url
    || before.hash !== after.hash
    || before.text !== after.text
    || before.storage !== after.storage
    || before.clipboard !== after.clipboard
    || before.dialogs !== after.dialogs;
}

async function actionDescriptors(page) {
  return page.locator('.cvSiteScreen button:visible').evaluateAll((buttons) => buttons.map((button, index) => {
    const label = String(button.innerText || button.textContent || button.getAttribute('aria-label') || button.title || '').trim().replace(/\s+/g, ' ');
    const current = button.matches('.active, .selected, [aria-current="page"], [aria-pressed="true"]')
      || Boolean(button.closest('.active, .selected'));
    const contextualNoOp = /^(?:close|cancel|clear|reset|back)$/i.test(label);
    return { index, label, disabled: Boolean(button.disabled), current, contextualNoOp };
  }).filter((item) => item.label && !item.disabled && !item.current && !item.contextualNoOp));
}

async function clickOutcome(page, screen, descriptor) {
  await lab(page, screen);
  const buttons = page.locator('.cvSiteScreen button:visible');
  const button = buttons.nth(descriptor.index);
  if (!(await button.isVisible().catch(() => false))) return { skipped: true, reason: 'button no longer visible' };
  if (await button.isDisabled().catch(() => false)) return { skipped: true, reason: 'button disabled' };

  await button.scrollIntoViewIfNeeded();
  const before = await stateSnapshot(page);
  let requests = 0;
  let popup = false;
  let download = false;
  let chooser = false;
  let nativeDialog = false;
  const requestHandler = (request) => {
    if (['xhr', 'fetch', 'document'].includes(request.resourceType())) requests += 1;
  };
  const dialogHandler = async (dialog) => { nativeDialog = true; await dialog.dismiss().catch(() => null); };
  page.on('request', requestHandler);
  page.on('dialog', dialogHandler);
  const popupPromise = page.waitForEvent('popup', { timeout: 350 }).then(() => { popup = true; }).catch(() => null);
  const downloadPromise = page.waitForEvent('download', { timeout: 350 }).then(() => { download = true; }).catch(() => null);
  const chooserPromise = page.waitForEvent('filechooser', { timeout: 350 }).then(() => { chooser = true; }).catch(() => null);

  let clickError = '';
  try {
    await button.click({ timeout: 7000 });
  } catch (error) {
    clickError = error.message;
  }
  await page.waitForTimeout(260).catch(() => null);
  await Promise.all([popupPromise, downloadPromise, chooserPromise]);
  page.off('request', requestHandler);
  page.off('dialog', dialogHandler);
  const after = await stateSnapshot(page).catch(() => ({ closed: page.isClosed() }));
  const outcome = changed(before, after) || requests > 0 || popup || download || chooser || nativeDialog;
  return { outcome, requests, popup, download, chooser, nativeDialog, clickError, before, after };
}

test.describe('Full Churvox UI logic and button gauntlet', () => {
  test.beforeEach(async ({ page }) => {
    await installSafeApi(page);
    await page.goto('/office-team-lab#today', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  });

  test('every app screen and public entry page has healthy layout and controls', async ({ page }, testInfo) => {
    const errors = watchRuntime(page);
    const mobile = /mobile/i.test(testInfo.project.name);

    for (const screen of LAB_SCREENS) {
      await lab(page, screen);
      const result = await health(page, { mobile });
      expect(result.issues, `${screen} UI health problems`).toEqual([]);
      expect(result.controls, `${screen} should expose usable controls`).toBeGreaterThan(0);
    }

    for (const pathname of PUBLIC_PAGES) {
      await page.goto(pathname, { waitUntil: 'domcontentloaded' });
      await settle(page);
      const result = await health(page, { mobile, publicPage: true });
      expect(result.issues, `${pathname} public UI health problems`).toEqual([]);
    }

    expect(errors, 'runtime errors across route/layout crawl').toEqual([]);
  });

  test('hash routing, navigation controls and browser history stay in sync', async ({ page }) => {
    for (const screen of LAB_SCREENS) await lab(page, screen);

    await page.goto('/office-team-lab#not-a-real-screen', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.cvOfficeSite')).toHaveAttribute('data-screen', 'today');

    await lab(page, 'today');
    const command = page.locator('.cvSiteTopbar nav button').filter({ hasText: /^Command$/ }).first();
    await command.scrollIntoViewIfNeeded();
    await command.click();
    await expect(page.locator('.cvOfficeSite')).toHaveAttribute('data-screen', 'command');
    expect(new URL(page.url()).hash).toBe('#command');

    const work = page.locator('.cvSiteTopbar nav button').filter({ hasText: /^Work$/ }).first();
    await work.scrollIntoViewIfNeeded();
    await work.click();
    await expect(page.locator('.cvOfficeSite')).toHaveAttribute('data-screen', 'work');
    await page.goBack();
    await expect(page.locator('.cvOfficeSite')).toHaveAttribute('data-screen', 'command');
    await page.goForward();
    await expect(page.locator('.cvOfficeSite')).toHaveAttribute('data-screen', 'work');
  });

  test('every non-current screen button produces a real outcome', async ({ page }) => {
    test.setTimeout(240_000);
    const failures = [];
    let checked = 0;

    for (const screen of INTERACTIVE_SCREENS) {
      await lab(page, screen);
      const descriptors = (await actionDescriptors(page)).slice(0, 20);
      for (const descriptor of descriptors) {
        const result = await clickOutcome(page, screen, descriptor);
        if (result.skipped) continue;
        checked += 1;
        if (!result.outcome) {
          failures.push(`${screen}: "${descriptor.label}" silently did nothing${result.clickError ? `; click error=${result.clickError.slice(0, 180)}` : ''}`);
        }
      }
    }

    expect(checked, 'the gauntlet should exercise a broad set of real controls').toBeGreaterThan(35);
    expect(failures, 'buttons without navigation, state, request, download, chooser, popup or dialog outcomes').toEqual([]);
  });

  test('Command handoff, editable slip and approval trail work together', async ({ page }) => {
    await lab(page, 'messages');
    const prepare = page.getByRole('button', { name: /Prepare Command card/i }).first();
    await expect(prepare).toBeVisible();
    await prepare.click();
    await expect(page.getByText(/prepared-only Command item/i).first()).toBeVisible();

    await lab(page, 'command');
    const open = page.getByRole('button', { name: /Open slip/i }).first();
    await expect(open).toBeVisible();
    await open.click();
    const slip = page.locator('.cvCommandSlip').first();
    await expect(slip).toBeVisible();
    const field = slip.locator('input, textarea').first();
    await field.fill('Full UI logic test owner correction');
    const primary = slip.locator('footer button.primary').first();
    await expect(primary).toBeVisible();
    await primary.click();
    await expect(page.getByText(/recorded|approval trail|Nothing was sent, synced, charged or changed/i).first()).toBeVisible();

    await lab(page, 'activity');
    await expect(page.getByText(/Owner approval trail/i)).toBeVisible();
    await expect(page.getByText(/Full UI logic test owner correction|Owner reviewed|recorded/i).first()).toBeVisible();
  });

  test('API failures show truthful states without blank screens or stuck controls', async ({ page }, testInfo) => {
    await page.unroute('**/api/**');
    await page.route('**/api/**', async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      if (pathname === '/api/auth/me') {
        await route.fulfill(json({ success: true, user: PLATFORM_OWNER, ...PLATFORM_OWNER }));
        return;
      }
      await route.fulfill(json({ success: false, detail: 'Deliberate UI failure-state test' }, 503));
    });

    for (const screen of ['work', 'clients', 'messages', 'integrations', 'settings']) {
      await lab(page, screen);
      await page.waitForTimeout(500);
      const result = await health(page, { mobile: /mobile/i.test(testInfo.project.name) });
      expect(result.issues.filter((item) => /blank|busy/.test(item)), `${screen} should remain usable after API failure`).toEqual([]);
      const body = await page.locator('body').innerText();
      expect(body, `${screen} should explain or safely survive unavailable data`).toMatch(/unavailable|not confirmed|nothing|empty|try|Command|Churvox|No /i);
    }
  });
});
