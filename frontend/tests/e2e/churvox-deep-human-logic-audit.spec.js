const { test, expect } = require('@playwright/test');

const OWNER_EMAIL = process.env.CHURVOX_OWNER_EMAIL || process.env.CHURVOX_E2E_EMAIL || '';
const OWNER_PASSWORD = process.env.CHURVOX_OWNER_PASSWORD || process.env.CHURVOX_E2E_PASSWORD || '';
const MUTATE = process.env.CHURVOX_E2E_MUTATE === '1';
const API_BASE = (process.env.PLAYWRIGHT_API_BASE || 'https://grassley-backend.onrender.com').replace(/\/+$/, '');

const ownerAreas = [
  { label: 'Smart Hub', url: '/dashboard#dashboard' },
  { label: 'Command', url: '/dashboard#command' },
  { label: 'Jobs', url: '/dashboard#jobs' },
  { label: 'Clients', url: '/dashboard#clients' },
  { label: 'Quotes', url: '/dashboard#quotes' },
  { label: 'Invoices', url: '/dashboard#invoices' },
  { label: 'Team', url: '/dashboard#team' },
  { label: 'Messages', url: '/dashboard#messages' },
  { label: 'Payroll', url: '/dashboard#payroll' },
  { label: 'Settings', url: '/dashboard#settings' },
  { label: 'Plans', url: '/plans' },
  { label: 'Support', url: '/dashboard#support' },
];

const createFlows = [
  {
    label: 'client',
    newUrl: '/clients/new',
    listUrl: '/dashboard#clients',
    tokenPrefix: 'Deep Logic Client',
    fields: [
      [['name', 'client', 'customer'], value => value.name],
      [['email'], value => value.email],
      [['phone', 'mobile'], value => value.phone],
      [['address', 'service address'], value => value.address],
      [['notes'], value => value.note],
    ],
  },
  {
    label: 'job',
    newUrl: '/jobs/new',
    listUrl: '/dashboard#jobs',
    tokenPrefix: 'Deep Logic Job',
    fields: [
      [['title', 'job', 'name'], value => value.name],
      [['client', 'customer'], value => value.clientName],
      [['address', 'service address'], value => value.address],
      [['price', 'amount', 'total'], () => '95'],
      [['notes', 'description', 'instructions'], value => value.note],
    ],
  },
  {
    label: 'quote',
    newUrl: '/quotes/new',
    listUrl: '/dashboard#quotes',
    tokenPrefix: 'Deep Logic Quote',
    fields: [
      [['client', 'customer', 'name'], value => value.clientName],
      [['address', 'service address'], value => value.address],
      [['price', 'amount', 'total'], () => '145'],
      [['description', 'notes', 'service'], value => value.note],
    ],
  },
  {
    label: 'invoice',
    newUrl: '/invoices/new',
    listUrl: '/dashboard#invoices',
    tokenPrefix: 'Deep Logic Invoice',
    fields: [
      [['client', 'customer', 'name'], value => value.clientName],
      [['address', 'service address'], value => value.address],
      [['price', 'amount', 'total'], () => '95'],
      [['description', 'notes', 'service'], value => value.note],
    ],
  },
];

function apiUrl(url) {
  return `${API_BASE}${url.startsWith('/api') ? url : `/api${url}`}`;
}

function stamp() {
  return new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
}

function hasPlaceholderCredentials() {
  const email = String(OWNER_EMAIL || '').trim().toLowerCase();
  const password = String(OWNER_PASSWORD || '').trim().toLowerCase();
  return email === 'your-owner-email' || password === 'your-owner-password' || email === 'owner-email' || password === 'owner-password';
}

function tokenFrom(data = {}) {
  return data?.token || data?.access_token || data?.auth_token || data?.user?.token || data?.user?.access_token || '';
}

function userFrom(data = {}) {
  return data?.user || data?.data?.user || data?.data || data || {};
}

function safeJsonText(value) {
  return JSON.stringify(value || {}, (key, item) => /password|token|secret/i.test(key) ? '[hidden]' : item).slice(0, 1200);
}

async function waitHuman(page) {
  if (page.isClosed()) return;
  await page.waitForLoadState('domcontentloaded').catch(() => null);
  await page.waitForLoadState('networkidle', { timeout: 1800 }).catch(() => null);
  await page.waitForTimeout(300).catch(() => null);
}

async function bodyText(page) {
  return (await page.locator('body').innerText({ timeout: 12000 }).catch(() => '')).replace(/\s+/g, ' ').trim();
}

async function watchErrors(page, errors) {
  page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() !== 'error') return;
    if (/favicon|manifest|ResizeObserver|AbortError|net::ERR_ABORTED|401|403|404|Failed to fetch/i.test(text)) return;
    errors.push(`console: ${text.slice(0, 900)}`);
  });
  page.on('response', response => {
    const url = response.url();
    if (response.status() >= 500 && /churvox|grassley|onrender|localhost|127\.0\.0\.1/i.test(url)) {
      errors.push(`http ${response.status()}: ${url}`);
    }
  });
}

async function fillAny(page, names, value) {
  for (const name of names) {
    const locators = [
      page.getByLabel(new RegExp(name, 'i')).first(),
      page.getByPlaceholder(new RegExp(name, 'i')).first(),
      page.locator(`input[name*="${name}" i], textarea[name*="${name}" i]`).first(),
      page.locator(`input[id*="${name}" i], textarea[id*="${name}" i]`).first(),
    ];

    for (const locator of locators) {
      if (!(await locator.isVisible().catch(() => false))) continue;
      await locator.fill(String(value)).catch(async () => {
        await locator.click({ force: true }).catch(() => null);
        await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A').catch(() => null);
        await page.keyboard.type(String(value)).catch(() => null);
      });
      return true;
    }
  }
  return false;
}

async function clickAny(page, names) {
  for (const name of names) {
    const byRole = page.getByRole('button', { name }).first();
    if (await byRole.isVisible().catch(() => false)) {
      await byRole.scrollIntoViewIfNeeded().catch(() => null);
      await byRole.click({ timeout: 8000 }).catch(() => null);
      await waitHuman(page);
      return true;
    }

    const byText = page.getByText(name, { exact: false }).first();
    if (await byText.isVisible().catch(() => false)) {
      await byText.scrollIntoViewIfNeeded().catch(() => null);
      await byText.click({ timeout: 8000 }).catch(() => null);
      await waitHuman(page);
      return true;
    }
  }
  return false;
}

async function login(page) {
  if (!OWNER_EMAIL || !OWNER_PASSWORD) {
    throw new Error('Missing CHURVOX_OWNER_EMAIL/CHURVOX_OWNER_PASSWORD or CHURVOX_E2E_EMAIL/CHURVOX_E2E_PASSWORD. Deep logic tests must fail instead of skipping.');
  }
  if (hasPlaceholderCredentials()) {
    throw new Error('Replace your-owner-email and your-owner-password with the real Churvox owner login before running the deep logic audit.');
  }

  const email = String(OWNER_EMAIL).trim().toLowerCase();
  const response = await page.request.post(apiUrl('/api/auth/login'), {
    data: { email, password: OWNER_PASSWORD },
    timeout: 20000,
  });
  const payload = await response.json().catch(async () => ({ text: await response.text().catch(() => '') }));

  if (!response.ok() || payload?.success === false) {
    throw new Error(`API login failed before page audit. status=${response.status()} body=${safeJsonText(payload)}`);
  }

  const token = tokenFrom(payload);
  const user = userFrom(payload);
  const returnedEmail = String(user?.email || payload?.email || '').trim().toLowerCase();
  if (returnedEmail && returnedEmail !== email) {
    throw new Error(`API login returned a different user: ${returnedEmail}`);
  }

  await page.goto('/');
  await waitHuman(page);
  await page.evaluate(({ nextToken }) => {
    if (nextToken) window.localStorage.setItem('token', nextToken);
  }, { nextToken: token });

  await page.goto('/dashboard');
  await page.waitForURL(/dashboard|plans|setup|guide|worker|admin/i, { timeout: 40000 }).catch(() => null);
  await waitHuman(page);

  const text = await bodyText(page);
  const storedToken = await page.evaluate(() => window.localStorage.getItem('token') || '').catch(() => '');
  expect(text, `login should render Churvox app text. URL=${page.url()}`).toMatch(/Churvox|Command|Plan|Dashboard|Job|Client|Smart/i);
  expect(storedToken || !/\/login(?:$|[?#])/i.test(page.url()), `login should leave login page. URL=${page.url()} BODY=${text.slice(0, 600)}`).toBeTruthy();
}

async function assertPageHealth(page, label) {
  const result = await page.evaluate(() => {
    const issues = [];
    const body = document.body;
    const visibleText = (body?.innerText || '').trim().replace(/\s+/g, ' ');
    const viewportWidth = document.documentElement.clientWidth;
    const scrollWidth = Math.max(document.documentElement.scrollWidth, body?.scrollWidth || 0);
    if (scrollWidth - viewportWidth > 12) issues.push(`horizontal overflow ${scrollWidth - viewportWidth}px`);
    if (visibleText.length < 40) issues.push('not enough visible text');

    const controls = [...document.querySelectorAll('button, a[href], input, textarea, select, [role="button"], summary')]
      .filter(el => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return rect.width > 1 && rect.height > 1 && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || '1') > 0.04;
      });

    controls.forEach((el, index) => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      const labelText = (el.innerText || el.textContent || el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.getAttribute('name') || el.getAttribute('title') || '').trim().replace(/\s+/g, ' ');
      if (!labelText && !['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) issues.push(`unlabelled control ${index + 1}`);
      if (rect.width < 14 || rect.height < 14) issues.push(`tiny control ${labelText || el.tagName} ${Math.round(rect.width)}x${Math.round(rect.height)}`);
      if (style.pointerEvents === 'none') issues.push(`pointer-events none ${labelText || el.tagName}`);
    });

    return { textLength: visibleText.length, controlCount: controls.length, issues: issues.slice(0, 80) };
  });

  expect(result.issues, `${label} health issues`).toEqual([]);
  expect(result.textLength, `${label} visible text`).toBeGreaterThan(40);
}

async function assertControlsActionable(page, label) {
  const controls = await page.evaluate(() => {
    return [...document.querySelectorAll('button, a[href], [role="button"], summary')]
      .map((el, index) => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        const visible = rect.width > 1 && rect.height > 1 && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || '1') > 0.04;
        if (!visible) return null;
        const labelText = (el.innerText || el.textContent || el.getAttribute('aria-label') || el.getAttribute('title') || '').trim().replace(/\s+/g, ' ');
        const id = `deep-logic-control-${index}`;
        el.setAttribute('data-deep-logic-control', id);
        return { id, label: labelText, disabled: Boolean(el.disabled || el.getAttribute('aria-disabled') === 'true') };
      })
      .filter(Boolean)
      .slice(0, 80);
  });

  const failures = [];
  for (const control of controls) {
    if (control.disabled) continue;
    if (/log out|logout|delete|remove|archive|trash|disconnect|revoke|checkout|stripe|pay now|send invoice|send quote|send email|send sms/i.test(control.label)) continue;
    const locator = page.locator(`[data-deep-logic-control="${control.id}"]`).first();
    await locator.scrollIntoViewIfNeeded().catch(() => null);
    await locator.click({ trial: true, timeout: 3000 }).catch(error => failures.push(`${control.label || control.id}: ${error.message}`));
  }

  expect(failures, `${label} controls should be physically clickable`).toEqual([]);
}

async function openAndFindToken(page, url, token) {
  await page.goto(url);
  await waitHuman(page);

  let text = await bodyText(page);
  if (text.includes(token)) return true;

  const search = page.locator('input[type="search"], input[placeholder*="search" i], input[name*="search" i]').first();
  if (await search.isVisible().catch(() => false)) {
    await search.fill(token).catch(() => null);
    await page.waitForTimeout(700);
    text = await bodyText(page);
    if (text.includes(token)) return true;
  }

  return false;
}

async function saveRecord(page) {
  return clickAny(page, [/save/i, /create/i, /add/i, /done/i, /submit/i, /finish/i]);
}

async function createAndVerify(page, flow, value) {
  await page.goto(flow.newUrl);
  await waitHuman(page);
  await assertPageHealth(page, `${flow.label} create page`);

  const filled = [];
  for (const [names, resolver] of flow.fields) {
    const ok = await fillAny(page, names, resolver(value));
    if (ok) filled.push(names[0]);
  }

  expect(filled.length, `${flow.label} create form should accept enough fields. Filled: ${filled.join(', ')}`).toBeGreaterThanOrEqual(2);

  const clickedSave = await saveRecord(page);
  expect(clickedSave, `${flow.label} create form should have a save/create/add button`).toBeTruthy();
  await waitHuman(page);

  const afterSaveText = await bodyText(page);
  expect(afterSaveText, `${flow.label} save should keep Churvox app alive`).toMatch(/Churvox|saved|created|draft|Job|Client|Quote|Invoice|Command/i);
  expect(afterSaveText, `${flow.label} should show the created token after save`).toContain(value.primaryToken);

  await page.goto('/dashboard#command');
  await waitHuman(page);
  await assertPageHealth(page, 'Command after create flow');

  const persisted = await openAndFindToken(page, flow.listUrl, value.primaryToken);
  expect(persisted, `${flow.label} should still be visible after leaving and reopening ${flow.listUrl}`).toBeTruthy();
}

test.describe('Churvox deep human logic audit', () => {
  test.setTimeout(240000);

  test('boss pages are readable and every visible safe control is actionable', async ({ page }) => {
    const errors = [];
    await watchErrors(page, errors);
    await login(page);

    for (const area of ownerAreas) {
      await page.goto(area.url);
      await waitHuman(page);
      await assertPageHealth(page, area.label);
      await assertControlsActionable(page, area.label);
    }

    expect(errors).toEqual([]);
  });

  test('boss can add real records and the pages keep the saved information', async ({ page }) => {
    if (!MUTATE) {
      throw new Error('Missing CHURVOX_E2E_MUTATE=1. Deep logic record tests must create safe test records or fail instead of skipping.');
    }

    const errors = [];
    await watchErrors(page, errors);
    await login(page);

    const id = stamp();
    const value = {
      id,
      clientName: `Deep Logic Client ${id}`,
      name: '',
      primaryToken: '',
      email: `deep-logic-${id}@example.com`,
      phone: '0210000000',
      address: `${id} Deep Logic Street, Wellington`,
      note: `Deep logic audit safe record ${id}. Do not send.`,
    };

    for (const flow of createFlows) {
      value.name = `${flow.tokenPrefix} ${id}`;
      value.primaryToken = value.name;
      if (flow.label === 'client') value.clientName = value.name;
      await createAndVerify(page, flow, value);
    }

    expect(errors).toEqual([]);
  });
});
