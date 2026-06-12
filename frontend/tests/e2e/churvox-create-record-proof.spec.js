const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'https://www.churvox.com';
const EMAIL = process.env.CHURVOX_E2E_EMAIL || process.env.E2E_EMAIL || '';
const PASSWORD = process.env.CHURVOX_E2E_PASSWORD || process.env.E2E_PASSWORD || '';
const MUTATE = process.env.CHURVOX_E2E_MUTATE === '1' || process.env.PLAYWRIGHT_ALLOW_MUTATION === '1';

function absolute(path) {
  return new URL(path, BASE_URL).toString();
}

function stamp() {
  return new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
}

async function stable(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(700);
}

async function clickAny(page, names) {
  for (const name of names) {
    const byRole = page.getByRole('button', { name }).first();
    if ((await byRole.count().catch(() => 0)) && (await byRole.isVisible().catch(() => false))) {
      await byRole.click();
      return true;
    }
    const byText = page.getByText(name, { exact: false }).first();
    if ((await byText.count().catch(() => 0)) && (await byText.isVisible().catch(() => false))) {
      await byText.click();
      return true;
    }
  }
  return false;
}

async function fillAny(page, words, value) {
  for (const word of Array.isArray(words) ? words : [words]) {
    const byLabel = page.getByLabel(new RegExp(word, 'i')).first();
    if ((await byLabel.count().catch(() => 0)) && (await byLabel.isVisible().catch(() => false))) {
      await byLabel.fill(value);
      return true;
    }
    const byPlaceholder = page.getByPlaceholder(new RegExp(word, 'i')).first();
    if ((await byPlaceholder.count().catch(() => 0)) && (await byPlaceholder.isVisible().catch(() => false))) {
      await byPlaceholder.fill(value);
      return true;
    }
  }
  return false;
}

async function trySearch(page, value) {
  const selectors = [
    'input[type="search"]',
    'input[placeholder*="Search" i]',
    'input[placeholder*="Find" i]',
    'input[aria-label*="Search" i]',
  ];
  for (const selector of selectors) {
    const loc = page.locator(selector).first();
    if ((await loc.count().catch(() => 0)) && (await loc.isVisible().catch(() => false))) {
      await loc.fill(value);
      await page.waitForTimeout(600);
      return true;
    }
  }
  return false;
}

async function login(page) {
  test.skip(!EMAIL || !PASSWORD, 'Set CHURVOX_E2E_EMAIL and CHURVOX_E2E_PASSWORD.');
  await page.goto(absolute('/login'));
  await stable(page);
  expect(await fillAny(page, ['email'], EMAIL), 'email field found').toBeTruthy();
  expect(await fillAny(page, ['password'], PASSWORD), 'password field found').toBeTruthy();
  expect(await clickAny(page, [/sign in/i, /log in/i, /login/i]), 'login button clicked').toBeTruthy();
  await page.waitForURL(/dashboard|plans|setup|guide|#/i, { timeout: 30_000 }).catch(() => null);
  await stable(page);
  await expect(page.locator('body')).toContainText(/Churvox|Command|Smart|Dashboard|Plan|Owner/i);
}

async function createClient(page, data) {
  await page.goto(absolute('/clients/new'));
  await stable(page);
  expect(await fillAny(page, ['name', 'client', 'customer'], data.client), 'client name field found').toBeTruthy();
  await fillAny(page, ['email'], data.email);
  await fillAny(page, ['phone'], data.phone);
  await fillAny(page, ['address'], data.address);
  expect(await clickAny(page, [/save/i, /create/i, /add/i]), 'client save clicked').toBeTruthy();
  await stable(page);
}

async function createJob(page, data) {
  await page.goto(absolute('/jobs/new'));
  await stable(page);
  expect(await fillAny(page, ['title', 'job', 'name'], data.job), 'job title field found').toBeTruthy();
  await fillAny(page, ['client', 'customer'], data.client);
  await fillAny(page, ['address'], data.address);
  await fillAny(page, ['price', 'amount'], '85');
  await fillAny(page, ['description', 'notes', 'service'], data.jobNotes);
  expect(await clickAny(page, [/save/i, /create/i, /add/i]), 'job save clicked').toBeTruthy();
  await stable(page);
}

async function createQuote(page, data) {
  await page.goto(absolute('/quotes/new'));
  await stable(page);
  await fillAny(page, ['client', 'customer'], data.client);
  await fillAny(page, ['amount', 'price', 'total'], '120');
  expect(await fillAny(page, ['description', 'notes', 'service'], data.quote), 'quote description field found').toBeTruthy();
  expect(await clickAny(page, [/save/i, /create/i, /add/i]), 'quote save clicked').toBeTruthy();
  await stable(page);
}

async function createInvoice(page, data) {
  await page.goto(absolute('/invoices/new'));
  await stable(page);
  await fillAny(page, ['client', 'customer'], data.client);
  await fillAny(page, ['amount', 'price', 'total'], '85');
  expect(await fillAny(page, ['description', 'notes', 'service'], data.invoice), 'invoice description field found').toBeTruthy();
  expect(await clickAny(page, [/save/i, /create/i, /add/i]), 'invoice save clicked').toBeTruthy();
  await stable(page);
}

async function proveVisible(page, hash, exactText) {
  await page.goto(absolute(`/dashboard#${hash}`));
  await stable(page);
  await trySearch(page, exactText);
  await expect(page.locator('body'), `${exactText} should be visible on ${hash}`).toContainText(exactText, { timeout: 15_000 });
}

test('proof: created client job quote and invoice are actually saved and findable', async ({ page }) => {
  test.skip(!MUTATE, 'Set CHURVOX_E2E_MUTATE=1. This creates real proof records.');
  const id = stamp();
  const data = {
    client: `PW Proof Client ${id}`,
    job: `PW Proof Job ${id}`,
    quote: `PW Proof Quote ${id}`,
    invoice: `PW Proof Invoice ${id}`,
    jobNotes: `PW Proof Job Notes ${id}`,
    email: `pw-proof-${id}@example.com`,
    phone: '0210000000',
    address: `1 Proof Street ${id}`,
  };

  console.log('Creating proof records:', JSON.stringify(data, null, 2));
  await login(page);
  await createClient(page, data);
  await createJob(page, data);
  await createQuote(page, data);
  await createInvoice(page, data);

  await proveVisible(page, 'clients', data.client);
  await proveVisible(page, 'jobs', data.job);
  await proveVisible(page, 'quotes', data.quote);
  await proveVisible(page, 'invoices', data.invoice);

  console.log('Proof records found:', JSON.stringify({ client: data.client, job: data.job, quote: data.quote, invoice: data.invoice }, null, 2));
});
