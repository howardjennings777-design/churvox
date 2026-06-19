const { test, expect } = require("@playwright/test");

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "https://www.churvox.com";
const OWNER_EMAIL = process.env.CHURVOX_OWNER_EMAIL || "";
const OWNER_PASSWORD = process.env.CHURVOX_OWNER_PASSWORD || "";
const WORKER_EMAIL = process.env.CHURVOX_WORKER_EMAIL || "";
const WORKER_PASSWORD = process.env.CHURVOX_WORKER_PASSWORD || "";
const stamp = Date.now();
const qa = {
  client: `QA Client ${stamp}`,
  email: `qa${stamp}@test.com`,
  phone: "0211112222",
  address: "12 Main Road Lower Hutt",
  job: `QA lawn mowing ${stamp}`,
  help: `QA worker help test ${stamp}`,
};

test.setTimeout(420000);

test.use({ viewport: { width: 390, height: 844 } });

function need(value, name) {
  if (!value) throw new Error(`Missing env value: ${name}`);
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function textOf(page) {
  return page.locator("body").innerText({ timeout: 10000 }).catch(() => "");
}

async function assertHealthy(page, label) {
  await page.waitForLoadState("domcontentloaded", { timeout: 20000 }).catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(600);
  const text = await textOf(page);
  expect(text.trim().length, `${label}: page should not be blank/black`).toBeGreaterThan(20);
  expect(text, `${label}: should not show a React/build crash`).not.toMatch(/uncaught|runtime error|failed to compile|syntaxerror|cannot read properties|undefined is not an object/i);
}

async function firstVisible(page, selectors, timeout = 1600) {
  for (const selector of selectors) {
    const loc = page.locator(selector).first();
    try {
      await loc.waitFor({ state: "visible", timeout });
      return loc;
    } catch (_) {}
  }
  return null;
}

async function clickByText(page, texts, timeout = 2200) {
  const list = Array.isArray(texts) ? texts : [texts];
  for (const raw of list) {
    const text = escapeRegex(raw);
    const exactButton = page.getByRole("button", { name: new RegExp(`^${text}$`, "i") }).first();
    try { await exactButton.waitFor({ state: "visible", timeout }); await exactButton.click(); return true; } catch (_) {}
    const button = page.getByRole("button", { name: new RegExp(text, "i") }).first();
    try { await button.waitFor({ state: "visible", timeout }); await button.click(); return true; } catch (_) {}
    const link = page.getByRole("link", { name: new RegExp(text, "i") }).first();
    try { await link.waitFor({ state: "visible", timeout }); await link.click(); return true; } catch (_) {}
    const any = page.locator(`text=${raw}`).first();
    try { await any.waitFor({ state: "visible", timeout }); await any.click(); return true; } catch (_) {}
  }
  return false;
}

async function fillFirst(page, selectors, value, timeout = 1600) {
  const loc = await firstVisible(page, selectors, timeout);
  if (!loc) return false;
  await loc.fill(String(value));
  return true;
}

async function fillByLabelish(page, label, value) {
  const safe = escapeRegex(label);
  const candidates = [
    page.getByLabel(new RegExp(safe, "i")).first(),
    page.locator(`label:has-text("${label}") input`).first(),
    page.locator(`label:has-text("${label}") textarea`).first(),
    page.locator(`[placeholder*="${label}" i]`).first(),
    page.locator(`[name*="${label}" i]`).first(),
  ];
  for (const loc of candidates) {
    try { await loc.waitFor({ state: "visible", timeout: 900 }); await loc.fill(String(value)); return true; } catch (_) {}
  }
  return false;
}

async function login(page, email, password, label) {
  await test.step(`${label}: login`, async () => {
    await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
    await assertHealthy(page, `${label} login page`);

    const emailOk = await fillFirst(page, [
      'input[type="email"]',
      'input[name="email"]',
      'input[name="username"]',
      'input[placeholder*="email" i]',
      'input[placeholder*="username" i]',
      'input[autocomplete="username"]',
      'input:not([type="password"])'
    ], email, 4000);
    expect(emailOk, `${label}: email/username field visible`).toBeTruthy();

    const passOk = await fillFirst(page, [
      'input[type="password"]',
      'input[name="password"]',
      'input[placeholder*="password" i]',
      'input[autocomplete="current-password"]'
    ], password, 4000);
    expect(passOk, `${label}: password field visible`).toBeTruthy();

    const clicked = await clickByText(page, ["Log in", "Login", "Sign in", "Continue"], 4000);
    expect(clicked, `${label}: login button clicked`).toBeTruthy();

    await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1800);
    await expect(page.locator('input[type="password"]'), `${label}: should leave login screen`).toHaveCount(0, { timeout: 18000 });
    await assertHealthy(page, `${label} after login`);
  });
}

async function nav(page, name, aliases = []) {
  await test.step(`open ${name}`, async () => {
    const ok = await clickByText(page, [name, ...aliases], 2600);
    expect(ok, `Could not open ${name}`).toBeTruthy();
    await assertHealthy(page, name);
  });
}

async function closeModal(page) {
  await page.keyboard.press("Escape").catch(() => {});
  await clickByText(page, ["Cancel", "Close", "Done", "Back"], 800).catch(() => {});
}

async function visibleButtonReport(page, label) {
  const data = await page.locator("button:visible, a:visible").evaluateAll((nodes) => nodes.slice(0, 80).map((node) => {
    const rect = node.getBoundingClientRect();
    return { text: (node.innerText || node.getAttribute("aria-label") || node.title || "").trim(), x: rect.x, y: rect.y, w: rect.width, h: rect.height };
  })).catch(() => []);
  for (const item of data) {
    if (!item.text) continue;
    expect(item.w, `${label}: visible control '${item.text}' should have width`).toBeGreaterThan(8);
    expect(item.h, `${label}: visible control '${item.text}' should have height`).toBeGreaterThan(8);
  }
}

async function tryCreateClient(page) {
  await nav(page, "Clients");
  const add = await clickByText(page, ["Add Client", "Add client", "New Client", "New client", "Create Client", "Create client"], 3500);
  expect(add, "Add Client should open").toBeTruthy();
  await page.waitForTimeout(800);

  await fillByLabelish(page, "Name", qa.client).catch(() => {});
  await fillByLabelish(page, "Phone", qa.phone).catch(() => {});
  await fillByLabelish(page, "Email", qa.email).catch(() => {});
  await fillByLabelish(page, "Address", qa.address).catch(() => {});
  await fillFirst(page, ['input[placeholder*="name" i]', 'input[name*="name" i]'], qa.client, 700).catch(() => {});
  await fillFirst(page, ['input[placeholder*="phone" i]', 'input[name*="phone" i]'], qa.phone, 700).catch(() => {});
  await fillFirst(page, ['input[placeholder*="email" i]', 'input[name*="email" i]'], qa.email, 700).catch(() => {});
  await fillFirst(page, ['input[placeholder*="address" i]', 'textarea[placeholder*="address" i]', 'input[name*="address" i]'], qa.address, 700).catch(() => {});

  const save = await clickByText(page, ["Save", "Create", "Add client", "Save client"], 3500);
  expect(save, "Client save/create should be clickable").toBeTruthy();
  await assertHealthy(page, "after client save");
}

async function tryCreateJob(page) {
  await nav(page, "Jobs");
  const add = await clickByText(page, ["Add Job", "Add job", "New Job", "New job", "Create Job", "Create job"], 3500);
  expect(add, "Add Job should open").toBeTruthy();
  await page.waitForTimeout(800);

  await fillByLabelish(page, "Job", qa.job).catch(() => {});
  await fillByLabelish(page, "Title", qa.job).catch(() => {});
  await fillByLabelish(page, "Client", qa.client).catch(() => {});
  await fillByLabelish(page, "Address", qa.address).catch(() => {});
  await fillByLabelish(page, "Price", "85").catch(() => {});
  await fillFirst(page, ['input[placeholder*="job" i]', 'input[name*="job" i]', 'input[placeholder*="title" i]'], qa.job, 700).catch(() => {});
  await fillFirst(page, ['input[placeholder*="client" i]', 'input[name*="client" i]'], qa.client, 700).catch(() => {});
  await fillFirst(page, ['input[placeholder*="address" i]', 'textarea[placeholder*="address" i]', 'input[name*="address" i]'], qa.address, 700).catch(() => {});
  await fillFirst(page, ['input[placeholder*="price" i]', 'input[name*="price" i]', 'input[type="number"]'], "85", 700).catch(() => {});
  await fillFirst(page, ['input[type="date"]'], new Date(Date.now() + 86400000).toISOString().slice(0, 10), 700).catch(() => {});
  await fillFirst(page, ['input[type="time"]'], "15:00", 700).catch(() => {});

  const save = await clickByText(page, ["Save", "Create", "Add job", "Save job", "Create job"], 3500);
  expect(save, "Job save/create should be clickable").toBeTruthy();
  await assertHealthy(page, "after job save");
}

async function tryAskJob(page) {
  await test.step("Ask bar can open/create job flow", async () => {
    await nav(page, "Today");
    const askInput = await firstVisible(page, ['input[placeholder*="open jobs" i]', 'input[placeholder*="add client" i]', '.freshGlobalAsk input'], 2500);
    expect(askInput, "Ask bar input should exist").toBeTruthy();
    await askInput.fill(`Add a lawn mowing job for ${qa.client} at ${qa.address} tomorrow 3pm, phone ${qa.phone}, $85, fortnightly`);
    const ok = await clickByText(page, ["Ask Churvox", "Ask", "Go"], 2500);
    expect(ok, "Ask submit should click").toBeTruthy();
    await assertHealthy(page, "after Ask Churvox submit");
    await closeModal(page);
  });
}

async function tryOpenAndMaybeCreate(page, section, buttonAliases, fillCallback) {
  await nav(page, section);
  await visibleButtonReport(page, section);
  const text = await textOf(page);
  expect(text, `${section} should have relevant content`).toMatch(new RegExp(section.slice(0, 5), "i"));
  const clicked = await clickByText(page, buttonAliases, 1600);
  if (clicked) {
    await page.waitForTimeout(700);
    await fillCallback?.();
    await assertHealthy(page, `${section} action opened`);
    await closeModal(page);
  }
}

test.describe.serial("Churvox long live Playwright QA", () => {
  test("01 owner login and full app navigation", async ({ page }) => {
    need(OWNER_EMAIL, "CHURVOX_OWNER_EMAIL");
    need(OWNER_PASSWORD, "CHURVOX_OWNER_PASSWORD");
    await login(page, OWNER_EMAIL, OWNER_PASSWORD, "owner");

    await nav(page, "Today");
    await nav(page, "Jobs");
    await nav(page, "Clients");
    await nav(page, "Money");
    await nav(page, "More");
    await nav(page, "Settings");
    await nav(page, "Team");
    await nav(page, "Payroll");
    await nav(page, "Reports");
    await nav(page, "Support");

    await visibleButtonReport(page, "owner app");
  });

  test("02 owner creates client, job and checks Ask Churvox", async ({ page }) => {
    await login(page, OWNER_EMAIL, OWNER_PASSWORD, "owner");
    await tryCreateClient(page);
    await tryCreateJob(page);
    await tryAskJob(page);
  });

  test("03 owner money, invoice, quote, payments, payroll and settings smoke", async ({ page }) => {
    await login(page, OWNER_EMAIL, OWNER_PASSWORD, "owner");

    await nav(page, "Money");
    const moneyText = await textOf(page);
    expect(moneyText, "Money page should include invoice/payment words").toMatch(/invoice|quote|payment|money|paid|unpaid/i);
    await clickByText(page, ["Create invoice", "New invoice", "Add invoice", "Invoice", "Invoices"], 1800).catch(() => {});
    await assertHealthy(page, "invoice action");
    await closeModal(page);

    await tryOpenAndMaybeCreate(page, "Quotes", ["Create quote", "New quote", "Add quote", "Quote", "Quotes"], async () => {
      await fillFirst(page, ['input[placeholder*="client" i]', 'input[name*="client" i]'], qa.client, 500).catch(() => {});
      await fillFirst(page, ['input[placeholder*="price" i]', 'input[type="number"]'], "85", 500).catch(() => {});
    }).catch(async () => { await assertHealthy(page, "quotes fallback"); });

    await nav(page, "Payments");
    await nav(page, "Payroll");
    await nav(page, "Settings");
    await nav(page, "Support");
    await visibleButtonReport(page, "owner money/settings");
  });

  test("04 worker login, contact office, bottom nav and job actions", async ({ page }) => {
    need(WORKER_EMAIL, "CHURVOX_WORKER_EMAIL");
    need(WORKER_PASSWORD, "CHURVOX_WORKER_PASSWORD");
    await login(page, WORKER_EMAIL, WORKER_PASSWORD, "worker");
    await page.goto(`${BASE_URL}/worker/jobs`, { waitUntil: "domcontentloaded" });
    await assertHealthy(page, "worker jobs");

    await expect(page.locator("body")).toContainText(/My Day|Worker app|Contact office/i, { timeout: 15000 });
    await visibleButtonReport(page, "worker jobs");

    const contact = await clickByText(page, ["Contact office", "Help", "Office"], 3500);
    expect(contact, "Contact office should open").toBeTruthy();
    const textarea = page.locator("textarea").first();
    await expect(textarea, "contact office textarea visible").toBeVisible({ timeout: 10000 });
    await expect(textarea, "contact office message should start blank").toHaveValue("");
    await textarea.fill(qa.help);
    const send = await clickByText(page, ["Send help request", "Send"], 3500);
    expect(send, "Send help request should click").toBeTruthy();
    await assertHealthy(page, "after worker help send");

    await clickByText(page, ["Today", "Jobs"], 1800).catch(() => {});
    await assertHealthy(page, "worker nav today/jobs");
    await clickByText(page, ["Settings"], 1800).catch(() => {});
    await assertHealthy(page, "worker settings nav");
    await page.goto(`${BASE_URL}/worker/jobs`, { waitUntil: "domcontentloaded" });
    await assertHealthy(page, "worker jobs return");

    const openJob = await clickByText(page, ["Open job", "Open", "Acknowledge", "Start", "Resume", "Directions"], 1800);
    if (openJob) await assertHealthy(page, "worker job action/open");
  });

  test("05 owner can see Command / worker message area after worker help", async ({ page }) => {
    await login(page, OWNER_EMAIL, OWNER_PASSWORD, "owner");
    await nav(page, "Command");
    await assertHealthy(page, "owner command");
    const body = await textOf(page);
    expect(body, "Command should include worker/help/admin action wording").toMatch(/worker|message|command|approve|help|office/i);
  });
});
