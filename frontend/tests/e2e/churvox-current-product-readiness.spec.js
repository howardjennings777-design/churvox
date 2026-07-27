const { test, expect } = require('@playwright/test');

const OWNER_EMAIL = String(process.env.CHURVOX_OWNER_EMAIL || '').trim().toLowerCase();
const OWNER_PASSWORD = process.env.CHURVOX_OWNER_PASSWORD || '';

async function authenticateOwner(page) {
  if (!OWNER_EMAIL || !OWNER_PASSWORD) throw new Error('CHURVOX_OWNER_EMAIL and CHURVOX_OWNER_PASSWORD are required.');

  await page.goto('/login?app=1', { waitUntil: 'domcontentloaded' });
  const email = page.locator('input[type="email"]').first();
  const password = page.locator('input[type="password"]').first();
  const submit = page.getByRole('button', { name: /Open Churvox|Checking access|Preparing secure entry/i }).first();

  await expect(email).toBeVisible({ timeout: 25_000 });
  await expect(submit).toBeEnabled({ timeout: 25_000 });
  await email.fill(OWNER_EMAIL);
  await password.fill(OWNER_PASSWORD);
  await submit.click();

  await expect.poll(async () => page.evaluate(() => ({
    path: window.location.pathname,
    authenticated: window.__CHURVOX_AUTH_STATE__?.authenticated === true,
    state: window.__CHURVOX_AUTH_STATE__?.status || '',
  })), {
    timeout: 60_000,
    intervals: [500, 1000, 2000],
    message: 'Owner login never produced an authenticated session or left /login.',
  }).toMatchObject({ authenticated: true });

  const session = await page.evaluate(async () => {
    const token = localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('access_token') || '';
    const response = await fetch('/api/auth/me', {
      cache: 'no-store',
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const text = await response.text();
    let body = {};
    try { body = JSON.parse(text || '{}'); } catch { body = { text }; }
    return { ok: response.ok, status: response.status, body };
  });
  expect(session.ok, `Authenticated /api/auth/me returned ${session.status}: ${JSON.stringify(session.body).slice(0, 500)}`).toBeTruthy();
}

async function openOwner(page, hash = '') {
  await page.goto(`/dashboard${hash ? `#${hash}` : ''}`, { waitUntil: 'domcontentloaded' });
  const shell = page.locator('main[data-churvox-layout="fresh-studio"]');
  await expect(shell).toBeVisible({ timeout: 30_000 });
  await expect(shell).not.toContainText(/Something went wrong|Application error|ChunkLoadError|Loading chunk failed/i);
  return shell;
}

async function assertPlanPrices(page) {
  await page.goto('/dashboard#plans', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.cvReleasePlansRoot')).toBeVisible({ timeout: 30_000 });
  const prices = page.locator('.cvReleasePlansGrid .cvReleasePlanPrice');
  await expect(prices).toHaveCount(4);
  const metrics = await prices.evaluateAll((nodes) => nodes.map((node) => {
    const rect = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    return {
      text: String(node.textContent || '').replace(/\s+/g, ' ').trim(),
      visible: rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none' && Number(style.opacity || 1) > 0,
      clipped: node.scrollWidth > node.clientWidth + 4,
      width: rect.width,
      scrollWidth: node.scrollWidth,
      clientWidth: node.clientWidth,
    };
  }));

  expect(metrics.every((item) => item.visible), `Every plan price must be visible: ${JSON.stringify(metrics)}`).toBeTruthy();
  expect(metrics.every((item) => !item.clipped), `No plan price may be clipped: ${JSON.stringify(metrics)}`).toBeTruthy();
  expect(metrics.every((item) => /\/month \+ GST/i.test(item.text)), `Every price must state /month + GST: ${JSON.stringify(metrics)}`).toBeTruthy();
  expect(metrics.some((item) => /299/.test(item.text)), 'Command price NZ$299 must be readable.').toBeTruthy();
}

async function assertCurrentHq(page) {
  await page.goto('/admin', { waitUntil: 'domcontentloaded' });
  const hq = page.locator('main#CHURVOX_HQ_SYSTEM.hqOne');
  await expect(hq).toBeVisible({ timeout: 30_000 });
  for (const tab of ['Overview', 'Users', 'Businesses', 'Billing', 'Testers', 'Visitors', 'Activity', 'System']) {
    await expect(hq.getByRole('button', { name: tab, exact: true })).toBeVisible();
  }
  await expect(page.locator('[data-live-hq="true"]')).toHaveCount(0);
  await expect(hq).not.toContainText(/Your live Churvox control room|Connected to live HQ controls/i);
}

test.describe('Current Churvox product readiness', () => {
  test.setTimeout(240_000);

  test('owner login, navigation, pricing and HQ work on the current desktop and mobile product', async ({ page }, testInfo) => {
    await authenticateOwner(page);
    await openOwner(page);

    const mobile = /mobile/i.test(testInfo.project.name);
    if (mobile) {
      const dock = page.locator('.cvsMobileDock');
      await expect(dock).toBeVisible();
      for (const label of ['Today', 'Jobs', 'Command', 'Messages', 'More']) {
        await expect(dock.getByRole('button', { name: label, exact: true })).toBeVisible();
      }
      for (const label of ['Jobs', 'Command', 'Messages']) {
        await dock.getByRole('button', { name: label, exact: true }).click();
        await expect(page.locator('main[data-churvox-layout="fresh-studio"]')).toBeVisible();
      }
      await dock.getByRole('button', { name: 'More', exact: true }).click();
      const more = page.getByRole('dialog', { name: 'More Churvox areas' });
      await expect(more).toBeVisible();
      for (const label of ['Clients', 'Money', 'Team', 'Settings', 'Plans', 'Help']) {
        await expect(more.getByRole('button', { name: label, exact: true })).toBeVisible();
      }
    } else {
      const nav = page.getByRole('navigation', { name: 'Main Churvox navigation' });
      await expect(nav).toBeVisible();
      for (const label of ['Today', 'Jobs', 'Clients', 'Money', 'Team', 'Messages', 'Command']) {
        const button = nav.getByRole('button', { name: label, exact: true });
        await expect(button).toBeVisible();
        await button.click();
        await expect(page.locator('main[data-churvox-layout="fresh-studio"]')).toBeVisible();
      }
    }

    await assertPlanPrices(page);
    await assertCurrentHq(page);
  });
});
