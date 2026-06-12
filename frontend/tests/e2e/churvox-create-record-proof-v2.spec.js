const { test, expect } = require('@playwright/test');

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'https://www.churvox.com';
const EMAIL = process.env.CHURVOX_E2E_EMAIL || '';
const PASS = process.env.CHURVOX_E2E_PASSWORD || '';
const MUTATE = process.env.CHURVOX_E2E_MUTATE === '1';

function url(path) { return new URL(path, BASE).toString(); }
function stamp() { return new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14); }
async function wait(page) { await page.waitForLoadState('domcontentloaded'); await page.waitForTimeout(900); }

async function clickAny(page, patterns) {
  for (const pattern of patterns) {
    const button = page.getByRole('button', { name: pattern }).first();
    if ((await button.count().catch(() => 0)) && (await button.isVisible().catch(() => false))) { await button.click(); return true; }
    const text = page.getByText(pattern, { exact: false }).first();
    if ((await text.count().catch(() => 0)) && (await text.isVisible().catch(() => false))) { await text.click(); return true; }
  }
  return false;
}

async function setValue(control, value) {
  const tag = await control.evaluate((el) => el.tagName.toLowerCase()).catch(() => '');
  if (tag === 'select') {
    const exact = await control.selectOption({ label: value }).catch(() => []);
    if (Array.isArray(exact) && exact.length) return true;
    const fallback = await control.evaluate((el) => [...el.options].find((o) => o.value && !/select|choose/i.test(o.textContent || ''))?.value || '').catch(() => '');
    if (fallback) {
      const picked = await control.selectOption(fallback).catch(() => []);
      return Array.isArray(picked) && picked.length > 0;
    }
    return false;
  }
  await control.fill(value).catch(async () => {
    await control.click().catch(() => null);
    await control.page().keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
    await control.page().keyboard.type(value);
  });
  return true;
}

async function fillAny(page, labels, value) {
  for (const label of Array.isArray(labels) ? labels : [labels]) {
    const byLabel = page.getByLabel(new RegExp(label, 'i')).first();
    if ((await byLabel.count().catch(() => 0)) && (await byLabel.isVisible().catch(() => false))) return setValue(byLabel, value);
    const byPlaceholder = page.getByPlaceholder(new RegExp(label, 'i')).first();
    if ((await byPlaceholder.count().catch(() => 0)) && (await byPlaceholder.isVisible().catch(() => false))) return setValue(byPlaceholder, value);
  }
  return false;
}

async function login(page) {
  test.skip(!EMAIL || !PASS, 'Set CHURVOX_E2E_EMAIL and CHURVOX_E2E_PASSWORD.');
  await page.goto(url('/login'));
  await wait(page);
  expect(await fillAny(page, 'email', EMAIL), 'email field').toBeTruthy();
  expect(await fillAny(page, 'password', PASS), 'password field').toBeTruthy();
  expect(await clickAny(page, [/sign in/i, /log in/i, /login/i]), 'login button').toBeTruthy();
  await page.waitForURL(/dashboard|plans|setup|guide|#/i, { timeout: 30000 }).catch(() => null);
  await wait(page);
  await expect(page.locator('body')).toContainText(/Churvox|Command|Smart|Dashboard|Plan|Owner/i);
}

async function save(page, label) {
  expect(await clickAny(page, [/save/i, /create/i, /add/i, /submit/i]), `${label} save button`).toBeTruthy();
  await wait(page);
}

async function searchList(page, section, text) {
  await page.goto(url(`/dashboard#${section}`));
  await wait(page);
  const search = page.locator('input[type="search"], input[placeholder*="Search" i], input[placeholder*="Find" i]').first();
  if ((await search.count().catch(() => 0)) && (await search.isVisible().catch(() => false))) {
    await search.fill(text);
    await page.waitForTimeout(900);
  }
  await expect(page.locator('body'), `${text} must appear on ${section}`).toContainText(text, { timeout: 15000 });
}

test('proof v2: created records are saved and visible in lists', async ({ page }, testInfo) => {
  test.skip(/mobile/i.test(testInfo.project.name || ''), 'Desktop only proof test.');
  test.skip(!MUTATE, 'Set CHURVOX_E2E_MUTATE=1 to create live proof records.');

  const id = stamp();
  const client = `PW Proof Client ${id}`;
  const job = `PW Proof Job ${id}`;
  const quote = `PW Proof Quote ${id}`;
  const invoice = `PW Proof Invoice ${id}`;
  const address = `1 Proof Street ${id}`;

  console.log(JSON.stringify({ client, job, quote, invoice }, null, 2));

  await login(page);

  await page.goto(url('/clients/new'));
  await wait(page);
  expect(await fillAny(page, ['name', 'client', 'customer'], client), 'client name field').toBeTruthy();
  await fillAny(page, 'email', `pw-proof-${id}@example.com`);
  await fillAny(page, 'phone', '0210000000');
  await fillAny(page, 'address', address);
  await save(page, 'client');
  await searchList(page, 'clients', client);

  await page.goto(url('/jobs/new'));
  await wait(page);
  expect(await fillAny(page, ['title', 'job', 'name'], job), 'job title field').toBeTruthy();
  await fillAny(page, ['client', 'customer'], client);
  await fillAny(page, 'address', address);
  await fillAny(page, ['price', 'amount'], '85');
  await fillAny(page, ['description', 'notes', 'service'], `Notes for ${job}`);
  await save(page, 'job');
  await searchList(page, 'jobs', job);

  await page.goto(url('/quotes/new'));
  await wait(page);
  await fillAny(page, ['client', 'customer'], client);
  await fillAny(page, ['amount', 'price', 'total'], '120');
  expect(await fillAny(page, ['description', 'notes', 'service'], quote), 'quote description field').toBeTruthy();
  await save(page, 'quote');
  await searchList(page, 'quotes', quote);

  await page.goto(url('/invoices/new'));
  await wait(page);
  await fillAny(page, ['client', 'customer'], client);
  await fillAny(page, ['amount', 'price', 'total'], '85');
  expect(await fillAny(page, ['description', 'notes', 'service'], invoice), 'invoice description field').toBeTruthy();
  await save(page, 'invoice');
  await searchList(page, 'invoices', invoice);
});
