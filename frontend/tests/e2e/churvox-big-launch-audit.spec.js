const { test, expect } = require('@playwright/test');

const OWNER_EMAIL = process.env.CHURVOX_OWNER_EMAIL || process.env.CHURVOX_E2E_EMAIL || process.env.CHURVOX_E2E_OWNER_EMAIL || process.env.E2E_EMAIL || '';
const OWNER_PASSWORD = process.env.CHURVOX_OWNER_PASSWORD || process.env.CHURVOX_E2E_PASSWORD || process.env.CHURVOX_E2E_OWNER_PASSWORD || process.env.E2E_PASSWORD || '';
const WORKER_EMAIL = process.env.CHURVOX_WORKER_EMAIL || process.env.CHURVOX_E2E_WORKER_EMAIL || process.env.E2E_WORKER_EMAIL || '';
const WORKER_PASSWORD = process.env.CHURVOX_WORKER_PASSWORD || process.env.CHURVOX_E2E_WORKER_PASSWORD || process.env.E2E_WORKER_PASSWORD || '';

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

async function anyVisibleText(page, text) {
  return page.evaluate((needle) => {
    const wanted = String(needle || '').toLowerCase();
    const els = [...document.querySelectorAll('body *')];
    return els.some((el) => {
      const value = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
      if (!value.includes(wanted)) return false;
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity || '1') < 0.08) return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 1 && rect.height > 1;
    });
  }, text);
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
  for (const name of [/sign in/i, /log in/i, /login/i]) {
    const button = page.getByRole('button', { name }).first();
    if (await button.count().catch(() => 0) && await button.isVisible().catch(() => false)) {
      await button.click();
      return;
    }
  }
  await page.keyboard.press('Enter');
}

async function login(page, email, password) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await waitStable(page);
  await fillByLabelOrPlaceholder(page, 'email', email);
  await fillByLabelOrPlaceholder(page, 'password', password);
  await clickLogin(page);
  await page.waitForURL(/dashboard|worker|plans|guide|setup|command|#/i, { timeout: 30000 }).catch(() => null);
  await waitStable(page);
}

test.describe('Churvox full launch public audit', () => {
  for (const route of publicRoutes) {
    test(`public page is readable and launch-clean: ${route}`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await expectBasics(page, route);
    });
  }
});

test.describe('Churvox full launch owner audit', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!OWNER_EMAIL || !OWNER_PASSWORD, 'Set CHURVOX_OWNER_EMAIL and CHURVOX_OWNER_PASSWORD.');
    await login(page, OWNER_EMAIL, OWNER_PASSWORD);
  });

  for (const hash of ownerHashes) {
    test(`owner area opens and is launch-clean: ${hash}`, async ({ page }) => {
      await page.goto(`/dashboard#${hash}`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('body')).toContainText(/Churvox|Command|Job|Client|Quote|Invoice|Payroll|Xero|Support|Settings/i);
      await expectBasics(page, `dashboard#${hash}`);
    });
  }

  test('sidebar keeps full launch feature navigation', async ({ page, isMobile }) => {
    await page.goto('/dashboard#command');
    await waitStable(page);
    if (isMobile) {
      await page.getByRole('button', { name: /more/i }).click().catch(() => null);
      await waitStable(page);
    }
    const required = ['AI Guide', 'Command', 'Jobs', 'Clients', 'Quotes', 'Invoices', 'Team', 'Payroll', 'Xero', 'Settings', 'Support'];
    const missing = [];
    for (const item of required) {
      const found = await anyVisibleText(page, item);
      if (!found) missing.push(item);
    }
    expect(missing, 'missing launch nav items').toEqual([]);
  });
});

test.describe('Churvox full launch worker audit', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!WORKER_EMAIL || !WORKER_PASSWORD, 'Set CHURVOX_WORKER_EMAIL and CHURVOX_WORKER_PASSWORD.');
    await login(page, WORKER_EMAIL, WORKER_PASSWORD);
  });

  test('worker jobs page is launch-clean and worker-scoped', async ({ page }) => {
    await page.goto('/worker/jobs', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toContainText(/Today|Work|Job|Waiting|Assigned|Refresh/i);
    await expectBasics(page, 'worker jobs');
    await expect(page.locator('body')).not.toContainText(/Owner workspace|Platform Admin|Billing|Reports/i);
  });

  test('worker job detail has real field controls when a job is assigned', async ({ page }) => {
    await page.goto('/worker/jobs', { waitUntil: 'domcontentloaded' });
    await waitStable(page);
    const firstJob = page.locator('a[href^="/worker/jobs/"]').first();
    test.skip(!(await firstJob.count().catch(() => 0)), 'No assigned worker job available for detail audit.');
    await firstJob.click();
    await waitStable(page);
    await expect(page.locator('body')).toContainText(/Job checklist|Work timer|Job notes|Photos|Finish job/i);
    await expectBasics(page, 'worker job detail');
  });
});
