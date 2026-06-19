const { test, expect } = require("@playwright/test");

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "https://www.churvox.com";
const OWNER_EMAIL = process.env.CHURVOX_OWNER_EMAIL || "";
const OWNER_PASSWORD = process.env.CHURVOX_OWNER_PASSWORD || "";
const WORKER_EMAIL = process.env.CHURVOX_WORKER_EMAIL || "";
const WORKER_PASSWORD = process.env.CHURVOX_WORKER_PASSWORD || "";
const stamp = Date.now();

test.setTimeout(240000);

function need(value, name) {
  if (!value) throw new Error(`Missing env value: ${name}`);
}

async function firstVisible(page, selectors, timeout = 1500) {
  for (const selector of selectors) {
    const loc = page.locator(selector).first();
    try {
      await loc.waitFor({ state: "visible", timeout });
      return loc;
    } catch (_) {}
  }
  return null;
}

async function clickByText(page, texts, timeout = 2500) {
  const list = Array.isArray(texts) ? texts : [texts];
  for (const text of list) {
    const exact = page.getByRole("button", { name: new RegExp(`^${text}$`, "i") }).first();
    try { await exact.waitFor({ state: "visible", timeout }); await exact.click(); return true; } catch (_) {}
    const button = page.getByRole("button", { name: new RegExp(text, "i") }).first();
    try { await button.waitFor({ state: "visible", timeout }); await button.click(); return true; } catch (_) {}
    const link = page.getByRole("link", { name: new RegExp(text, "i") }).first();
    try { await link.waitFor({ state: "visible", timeout }); await link.click(); return true; } catch (_) {}
    const any = page.locator(`text=${text}`).first();
    try { await any.waitFor({ state: "visible", timeout }); await any.click(); return true; } catch (_) {}
  }
  return false;
}

async function fillFirst(page, selectors, value, timeout = 2500) {
  const loc = await firstVisible(page, selectors, timeout);
  if (!loc) return false;
  await loc.fill(String(value));
  return true;
}

async function fillByNearbyText(page, labelText, value) {
  const input = page.locator(`label:has-text("${labelText}") input, label:has-text("${labelText}") textarea`).first();
  try { await input.waitFor({ state: "visible", timeout: 1200 }); await input.fill(String(value)); return true; } catch (_) {}
  return false;
}

async function login(page, email, password) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});

  const emailOk = await fillFirst(page, [
    'input[type="email"]',
    'input[name="email"]',
    'input[name="username"]',
    'input[placeholder*="email" i]',
    'input[placeholder*="username" i]',
    'input[autocomplete="username"]',
    'input:not([type="password"])'
  ], email);
  expect(emailOk, "email/username field should be visible on login").toBeTruthy();

  const passOk = await fillFirst(page, [
    'input[type="password"]',
    'input[name="password"]',
    'input[placeholder*="password" i]',
    'input[autocomplete="current-password"]'
  ], password);
  expect(passOk, "password field should be visible on login").toBeTruthy();

  const clicked = await clickByText(page, ["Log in", "Login", "Sign in", "Continue"]);
  expect(clicked, "login button should be clickable").toBeTruthy();

  await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await expect(page.locator('input[type="password"]')).toHaveCount(0, { timeout: 15000 }).catch(async () => {
    const body = await page.locator("body").innerText().catch(() => "");
    throw new Error(`Login did not leave password screen. Page text: ${body.slice(0, 800)}`);
  });
}

async function ensureNoBlackScreen(page, label) {
  const text = await page.locator("body").innerText({ timeout: 10000 }).catch(() => "");
  expect(text.trim().length, `${label} should not be blank/black screen`).toBeGreaterThan(20);
}

async function safeNav(page, text) {
  const clicked = await clickByText(page, text, 1800);
  expect(clicked, `Could not click nav/button: ${text}`).toBeTruthy();
  await page.waitForLoadState("networkidle", { timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(800);
  await ensureNoBlackScreen(page, text);
}

async function closePossibleModal(page) {
  await page.keyboard.press("Escape").catch(() => {});
  await clickByText(page, ["Cancel", "Close"], 800).catch(() => {});
}

test.describe("Churvox live QA", () => {
  test("owner app navigation, client, job and invoice smoke", async ({ page }) => {
    need(OWNER_EMAIL, "CHURVOX_OWNER_EMAIL");
    need(OWNER_PASSWORD, "CHURVOX_OWNER_PASSWORD");

    await login(page, OWNER_EMAIL, OWNER_PASSWORD);
    await ensureNoBlackScreen(page, "owner dashboard");

    await safeNav(page, "Today");
    await safeNav(page, "Jobs");
    await safeNav(page, "Clients");
    await safeNav(page, "Money");
    await safeNav(page, "More");

    await safeNav(page, "Clients");
    const addClientClicked = await clickByText(page, ["Add Client", "Add client", "New Client", "New client", "Create Client", "Create client"]);
    expect(addClientClicked, "Add Client button should open").toBeTruthy();
    await page.waitForTimeout(700);

    const clientName = `QA Client ${stamp}`;
    await fillByNearbyText(page, "Name", clientName).catch(() => {});
    await fillByNearbyText(page, "Phone", "0211112222").catch(() => {});
    await fillByNearbyText(page, "Email", `qa${stamp}@test.com`).catch(() => {});
    await fillByNearbyText(page, "Address", "12 Main Road Lower Hutt").catch(() => {});
    await fillFirst(page, ['input[placeholder*="name" i]', 'input[name*="name" i]'], clientName, 800).catch(() => {});
    await fillFirst(page, ['input[placeholder*="phone" i]', 'input[name*="phone" i]'], "0211112222", 800).catch(() => {});
    await fillFirst(page, ['input[placeholder*="email" i]', 'input[name*="email" i]'], `qa${stamp}@test.com`, 800).catch(() => {});
    await fillFirst(page, ['input[placeholder*="address" i]', 'textarea[placeholder*="address" i]', 'input[name*="address" i]'], "12 Main Road Lower Hutt", 800).catch(() => {});

    const savedClient = await clickByText(page, ["Save", "Create", "Add client", "Save client"]);
    expect(savedClient, "client save/create button should be clickable").toBeTruthy();
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1200);
    await ensureNoBlackScreen(page, "after client save");

    await safeNav(page, "Jobs");
    const addJobClicked = await clickByText(page, ["Add Job", "Add job", "New Job", "New job", "Create Job", "Create job"]);
    expect(addJobClicked, "Add Job button should open").toBeTruthy();
    await page.waitForTimeout(700);

    await fillFirst(page, ['input[placeholder*="job" i]', 'input[name*="job" i]', 'input[placeholder*="title" i]'], `QA mowing ${stamp}`, 1000).catch(() => {});
    await fillFirst(page, ['input[placeholder*="client" i]', 'input[name*="client" i]'], clientName, 1000).catch(() => {});
    await fillFirst(page, ['input[placeholder*="address" i]', 'textarea[placeholder*="address" i]', 'input[name*="address" i]'], "12 Main Road Lower Hutt", 1000).catch(() => {});
    await fillFirst(page, ['input[placeholder*="price" i]', 'input[name*="price" i]', 'input[type="number"]'], "85", 1000).catch(() => {});
    await fillFirst(page, ['input[type="date"]'], new Date(Date.now() + 86400000).toISOString().slice(0, 10), 1000).catch(() => {});
    await fillFirst(page, ['input[type="time"]'], "15:00", 1000).catch(() => {});

    const savedJob = await clickByText(page, ["Save", "Create", "Add job", "Save job", "Create job"]);
    expect(savedJob, "job save/create button should be clickable").toBeTruthy();
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1200);
    await ensureNoBlackScreen(page, "after job save");

    await safeNav(page, "Money");
    const invoiceAreaText = await page.locator("body").innerText().catch(() => "");
    expect(invoiceAreaText, "Money area should contain invoice/payment/quote text").toMatch(/invoice|quote|payment|money|paid|unpaid/i);

    const invoiceOpened = await clickByText(page, ["Create invoice", "New invoice", "Add invoice", "Invoice", "Invoices"], 1800);
    expect(invoiceOpened, "invoice area or invoice button should be clickable").toBeTruthy();
    await page.waitForTimeout(700);
    await ensureNoBlackScreen(page, "invoice area");
    await closePossibleModal(page);
  });

  test("worker app contact office and job list smoke", async ({ page }) => {
    need(WORKER_EMAIL, "CHURVOX_WORKER_EMAIL");
    need(WORKER_PASSWORD, "CHURVOX_WORKER_PASSWORD");

    await login(page, WORKER_EMAIL, WORKER_PASSWORD);
    await page.goto(`${BASE_URL}/worker/jobs`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
    await ensureNoBlackScreen(page, "worker jobs");

    await expect(page.locator("body")).toContainText(/My Day|Worker app|Contact office/i, { timeout: 15000 });

    const contactClicked = await clickByText(page, ["Contact office", "Help", "Office"]);
    expect(contactClicked, "worker Contact office should open").toBeTruthy();
    await page.waitForTimeout(700);

    const textarea = page.locator("textarea").first();
    await expect(textarea, "contact office textarea should be visible").toBeVisible({ timeout: 10000 });
    await expect(textarea, "contact office textarea should start blank").toHaveValue("");
    await textarea.fill(`QA worker help test ${stamp}`);
    await expect(textarea).toHaveValue(`QA worker help test ${stamp}`);

    const sendClicked = await clickByText(page, ["Send help request", "Send"]);
    expect(sendClicked, "send help request button should be clickable").toBeTruthy();
    await page.waitForTimeout(1800);
    await ensureNoBlackScreen(page, "after worker help send");

    const body = await page.locator("body").innerText().catch(() => "");
    expect(body, "worker app should not show owner dashboard after help send").not.toMatch(/Owner workspace|Xero|Payroll reports/i);
  });
});
