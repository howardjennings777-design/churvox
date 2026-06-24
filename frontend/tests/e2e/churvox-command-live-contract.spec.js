const { test, expect } = require('@playwright/test');

const OWNER_EMAIL = process.env.CHURVOX_OWNER_EMAIL || process.env.CHURVOX_E2E_EMAIL || process.env.E2E_EMAIL || '';
const OWNER_PASSWORD = process.env.CHURVOX_OWNER_PASSWORD || process.env.CHURVOX_E2E_PASSWORD || process.env.E2E_PASSWORD || '';

async function waitStable(page) {
  await page.waitForLoadState('domcontentloaded').catch(() => null);
  await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => null);
  await page.waitForTimeout(400);
}

async function fillAny(page, names, value) {
  for (const name of names) {
    const byLabel = page.getByLabel(new RegExp(name, 'i')).first();
    if (await byLabel.isVisible().catch(() => false)) {
      await byLabel.fill(String(value));
      return true;
    }

    const byPlaceholder = page.getByPlaceholder(new RegExp(name, 'i')).first();
    if (await byPlaceholder.isVisible().catch(() => false)) {
      await byPlaceholder.fill(String(value));
      return true;
    }

    const byName = page.locator(`input[name*="${name}" i], textarea[name*="${name}" i]`).first();
    if (await byName.isVisible().catch(() => false)) {
      await byName.fill(String(value));
      return true;
    }
  }
  return false;
}

async function login(page) {
  test.skip(!OWNER_EMAIL || !OWNER_PASSWORD, 'Set CHURVOX_OWNER_EMAIL and CHURVOX_OWNER_PASSWORD.');

  await page.goto('/login');
  await waitStable(page);
  await fillAny(page, ['email'], OWNER_EMAIL);
  await fillAny(page, ['password'], OWNER_PASSWORD);

  const submit = page.locator('form button[type="submit"], button[type="submit"]').first();
  if (await submit.isVisible().catch(() => false)) await submit.click();
  else await page.getByRole('button', { name: /sign in|log in|login/i }).first().click();

  await page.waitForURL(/dashboard|setup|guide|plans|admin/i, { timeout: 40000 }).catch(() => null);
  await waitStable(page);

  const body = await page.locator('body').innerText({ timeout: 10000 }).catch(() => '');
  expect(body, `owner login should land in the app. URL=${page.url()} BODY=${body.slice(0, 500)}`).toMatch(/Churvox|Plan My Day|Ready for approval|Jobs|Clients|Command/i);
}

function asItems(payload) {
  const data = payload && payload.data !== undefined ? payload.data : payload;
  if (Array.isArray(data)) return data;
  for (const key of ['items', 'review_items', 'results', 'actions']) {
    if (Array.isArray(data && data[key])) return data[key];
  }
  return [];
}

function linkedRecordId(item) {
  const form = item && typeof item.form === 'object' ? item.form : {};
  const payload = item && typeof item.payload === 'object' ? item.payload : {};
  const details = item && typeof item.details === 'object' ? item.details : {};
  return item.recordId || item.record_id || form.recordId || form.jobId || form.clientId || form.quoteId || form.invoiceId || payload.recordId || details.recordId || '';
}

function actionKey(item) {
  return String(item.actionKey || item.action_key || item.action || item.type || '').trim();
}

function isAllowedLocalApproval(item) {
  return ['approve_prepared_action', 'fix_setup_blocker'].includes(actionKey(item));
}

test.describe('Command live review route contract', () => {
  test('review items route exists and approval-ready items are linked to real work', async ({ page }) => {
    await login(page);

    const responsePromise = page.waitForResponse((res) => res.url().includes('/api/ai-review-items'), { timeout: 40000 });
    await page.goto('/dashboard#command');
    const response = await responsePromise;
    expect([200, 204], `Command review route should be live, got ${response.status()}`).toContain(response.status());

    const payload = response.status() === 204 ? { items: [] } : await response.json().catch(() => ({}));
    const items = asItems(payload);
    expect(Array.isArray(items), 'review route should return an item array shape').toBeTruthy();

    const approvalReady = items.filter((item) => {
      const status = String(item.status || 'open').toLowerCase();
      const prepared = item.preparedForApproval !== false;
      return prepared && ['open', 'pending', 'ready', 'waiting'].some((value) => status.includes(value));
    });

    for (const item of approvalReady) {
      const key = actionKey(item);
      const recordId = linkedRecordId(item);
      expect(Boolean(recordId || isAllowedLocalApproval(item)), `approval item must link to a record or allowed setup action. key=${key} title=${item.title || item.summary || ''}`).toBeTruthy();
    }

    const body = await page.locator('body').innerText({ timeout: 10000 });
    expect(body).toMatch(/Ready for approval|Your approval queue|Check for work|Only clear, ready-to-approve work appears in Open/i);
  });
});
