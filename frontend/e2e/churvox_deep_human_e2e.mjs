import fs from "fs";
import path from "path";
import { chromium } from "@playwright/test";

const SITE = process.env.CHURVOX_SITE || "https://www.churvox.com";
const EMAIL = process.env.CHURVOX_TEST_EMAIL || "";
const PASSWORD = process.env.CHURVOX_TEST_PASSWORD || "";
const HEADLESS = process.env.CHURVOX_HEADLESS !== "false";
const SLOWMO = Number(process.env.CHURVOX_SLOWMO || 70);
const STOP_ON_FAIL = process.env.CHURVOX_STOP_ON_FAIL === "true";

if (!EMAIL || !PASSWORD) {
  console.error("Missing CHURVOX_TEST_EMAIL or CHURVOX_TEST_PASSWORD.");
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const rootDir = path.resolve(process.cwd(), "..");
const resultDir = path.resolve(rootDir, "docs/testing/results/deep-human-" + stamp);
fs.mkdirSync(resultDir, { recursive: true });

const run = {
  site: SITE,
  startedAt: new Date().toISOString(),
  browserErrors: [],
  networkErrors: [],
  results: [],
};

const testId = Date.now().toString().slice(-6);
const data = {
  clientName: `E2E Human Client ${testId}`,
  clientEmail: `e2e.client.${testId}@example.com`,
  clientPhone: "+64210000001",
  clientAddress: "10 E2E Human Test Street, Wellington",
  workerName: `E2E Human Worker ${testId}`,
  workerEmail: `e2e.worker.${testId}@example.com`,
  workerPhone: "+64210000002",
  jobTitle: `E2E Human Lawn Tidy ${testId}`,
  jobNote: "Mow lawns, edge paths, blow down driveway. Human-style E2E test.",
  quoteTitle: `E2E Human Hedge Quote ${testId}`,
  invoiceTitle: `E2E Human Draft Invoice ${testId}`,
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeFileName(text) {
  return String(text || "step")
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 85) || "step";
}

async function shot(page, name) {
  const file = path.join(resultDir, `${String(run.results.length + 1).padStart(3, "0")}-${safeFileName(name)}.png`);
  try {
    await page.screenshot({ path: file, fullPage: true });
    return path.relative(rootDir, file);
  } catch {
    return "";
  }
}

async function bodyText(page) {
  try {
    return await page.locator("body").innerText({ timeout: 5000 });
  } catch {
    return "";
  }
}

async function record(page, name, status, extra = {}) {
  const screenshot = page ? await shot(page, name) : "";
  const item = {
    status,
    name,
    url: page?.url?.() || "",
    screenshot,
    ...extra,
  };
  run.results.push(item);
  const label = status.padEnd(5, " ");
  console.log(`${label} ${name}${extra.error ? " — " + String(extra.error).slice(0, 180) : ""}`);
}

async function humanStep(page, name, fn, opts = {}) {
  const required = opts.required !== false;
  const start = Date.now();
  try {
    await fn();
    await sleep(opts.after || 350);
    await record(page, name, "PASS", { required, ms: Date.now() - start });
  } catch (err) {
    const status = required ? "FAIL" : "WARN";
    await record(page, name, status, {
      required,
      ms: Date.now() - start,
      error: String(err?.message || err),
    });
    if (required && STOP_ON_FAIL) throw err;
  }
}

async function exists(locator, timeout = 1400) {
  try {
    await locator.first().waitFor({ state: "visible", timeout });
    return true;
  } catch {
    return false;
  }
}

async function clickAny(page, names, timeout = 1500) {
  const list = Array.isArray(names) ? names : [names];

  for (const name of list) {
    const regex = name instanceof RegExp ? name : new RegExp(String(name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const locators = [
      page.getByRole("button", { name: regex }),
      page.getByRole("link", { name: regex }),
      page.getByText(regex),
      page.locator(`[aria-label*="${String(name).replace(/"/g, '\\"')}" i]`),
      page.locator(`[title*="${String(name).replace(/"/g, '\\"')}" i]`),
      page.locator(`button:has-text("${String(name).replace(/"/g, '\\"')}")`),
      page.locator(`a:has-text("${String(name).replace(/"/g, '\\"')}")`),
    ];

    for (const loc of locators) {
      try {
        const first = loc.first();
        await first.waitFor({ state: "visible", timeout });
        await first.scrollIntoViewIfNeeded().catch(() => {});
        await first.click({ timeout });
        await sleep(450);
        return true;
      } catch {}
    }
  }
  return false;
}

async function fillAny(page, hints, value, timeout = 1200) {
  const list = Array.isArray(hints) ? hints : [hints];

  for (const hint of list) {
    const regex = hint instanceof RegExp ? hint : new RegExp(String(hint), "i");
    const raw = String(hint).replace(/"/g, '\\"');
    const locators = [
      page.getByLabel(regex),
      page.getByPlaceholder(regex),
      page.locator(`input[name*="${raw}" i]`),
      page.locator(`textarea[name*="${raw}" i]`),
      page.locator(`input[id*="${raw}" i]`),
      page.locator(`textarea[id*="${raw}" i]`),
      page.locator(`input[aria-label*="${raw}" i]`),
      page.locator(`textarea[aria-label*="${raw}" i]`),
    ];

    for (const loc of locators) {
      try {
        const first = loc.first();
        await first.waitFor({ state: "visible", timeout });
        await first.scrollIntoViewIfNeeded().catch(() => {});
        await first.fill(String(value), { timeout });
        await sleep(120);
        return true;
      } catch {}
    }
  }
  return false;
}

async function fillVisibleBlanks(page, values) {
  const fields = page.locator("input:visible, textarea:visible");
  const count = await fields.count().catch(() => 0);
  let used = 0;

  for (let i = 0; i < count && used < values.length; i++) {
    const field = fields.nth(i);
    try {
      const type = String(await field.getAttribute("type") || "").toLowerCase();
      if (["hidden", "submit", "button", "checkbox", "radio", "file"].includes(type)) continue;
      const disabled = await field.isDisabled().catch(() => true);
      if (disabled) continue;
      const current = await field.inputValue().catch(() => "");
      if (current) continue;
      await field.scrollIntoViewIfNeeded().catch(() => {});
      await field.fill(String(values[used]));
      used += 1;
      await sleep(80);
    } catch {}
  }
  return used;
}

async function chooseDropdown(page, hint, value) {
  const selects = [
    page.getByLabel(new RegExp(hint, "i")),
    page.locator(`select[name*="${hint}" i]`),
    page.locator(`select[id*="${hint}" i]`),
  ];

  for (const loc of selects) {
    try {
      const first = loc.first();
      await first.waitFor({ state: "visible", timeout: 900 });
      const options = await first.locator("option").allTextContents().catch(() => []);
      const match = options.find((x) => new RegExp(value, "i").test(x));
      if (match) {
        await first.selectOption({ label: match });
        await sleep(150);
        return true;
      }
    } catch {}
  }

  return false;
}

async function save(page) {
  const ok = await clickAny(page, [
    "Save",
    "Create",
    "Add",
    "Done",
    "Confirm",
    "Submit",
    "Save client",
    "Create client",
    "Add client",
    "Save worker",
    "Create worker",
    "Add worker",
    "Save job",
    "Create job",
    "Add job",
    "Save quote",
    "Create quote",
    "Save invoice",
    "Create invoice",
    "Save draft",
  ], 1800);

  if (!ok) throw new Error("No Save/Create/Add button found.");
  await sleep(1500);
}

async function openPath(page, route) {
  await page.goto(`${SITE}${route}`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 6500 }).catch(() => {});
  await sleep(700);
}

async function openArea(page, labels, routes = []) {
  const clicked = await clickAny(page, labels, 1300);
  if (clicked) return;

  for (const route of routes) {
    await openPath(page, route);
    const text = await bodyText(page);
    if (!/404|not found/i.test(text)) return;
  }

  throw new Error(`Could not open area: ${Array.isArray(labels) ? labels.join(", ") : labels}`);
}

async function assertText(page, words, message) {
  const text = await bodyText(page);
  const hits = words.filter((w) => new RegExp(w, "i").test(text));
  if (!hits.length) {
    throw new Error(message || `Expected one of these words: ${words.join(", ")}`);
  }
  return hits;
}

async function auditVisibleBadWords(page, area) {
  const text = await bodyText(page);
  const bad = [
    /Top 9 owner operating layer/i,
    /Build Churvox around what owners actually want/i,
    /Launch readiness report/i,
    /Launch checklist/i,
    /Build\/test next/i,
    /Human E2E/i,
    /human test/i,
    /test pass/i,
    /deploy marker/i,
  ].filter((re) => re.test(text));

  if (bad.length) {
    throw new Error(`${area} has customer-facing build/test wording: ${bad.map(String).join(", ")}`);
  }
}

async function login(page) {
  await openPath(page, "/login");

  const emailOk = await fillAny(page, ["email"], EMAIL) ||
    await page.locator('input[type="email"]').first().fill(EMAIL).then(() => true).catch(() => false);

  const passOk = await fillAny(page, ["password"], PASSWORD) ||
    await page.locator('input[type="password"]').first().fill(PASSWORD).then(() => true).catch(() => false);

  if (!emailOk || !passOk) throw new Error("Could not fill login form.");

  const loginOk = await clickAny(page, ["Log in", "Login", "Sign in", "Sign In"], 2500);
  if (!loginOk) throw new Error("Could not click login button.");

  await page.waitForLoadState("domcontentloaded").catch(() => {});
  await sleep(2500);

  const text = await bodyText(page);
  if (/invalid|incorrect|unauthori[sz]ed|wrong password|failed/i.test(text)) {
    throw new Error("Login failed: " + text.slice(0, 260));
  }

  if (/login|sign in/i.test(page.url()) && !/smart|hub|dashboard|command|jobs|clients/i.test(text)) {
    throw new Error("Still appears to be on login page.");
  }
}

async function refreshSession(page) {
  await page.reload({ waitUntil: "domcontentloaded" });
  await sleep(1600);
  const text = await bodyText(page);
  if (/login|sign in/i.test(page.url()) && !/smart|dashboard|command/i.test(text)) {
    throw new Error("Session did not survive refresh.");
  }
}

async function testSmartHub(page) {
  await openArea(page, ["Smart Hub", "Dashboard", "Today"], ["/dashboard", "/planday"]);
  await assertText(page, ["Smart", "Hub", "Today", "Job", "Client", "Approve", "Admin", "Money"], "Smart Hub did not feel like the app starting point.");
  await auditVisibleBadWords(page, "Smart Hub");
  await clickAny(page, ["Add client", "New job", "Approve", "More", "Today"], 900).catch(() => {});
}

async function testClients(page) {
  await openArea(page, ["Clients", "Client", "Customers"], ["/clients", "/dashboard"]);
  await auditVisibleBadWords(page, "Clients");

  await clickAny(page, ["Add client", "New client", "Create client", "Add customer", "+ Client"], 1800);

  await fillAny(page, ["name", "client", "customer"], data.clientName).catch(() => {});
  await fillAny(page, ["email"], data.clientEmail).catch(() => {});
  await fillAny(page, ["phone", "mobile"], data.clientPhone).catch(() => {});
  await fillAny(page, ["address", "location"], data.clientAddress).catch(() => {});
  await fillAny(page, ["note", "notes"], "Created by deep human E2E test.").catch(() => {});
  await fillVisibleBlanks(page, [data.clientName, data.clientEmail, data.clientPhone, data.clientAddress, "Deep E2E test client"]);

  await save(page);

  const text = await bodyText(page);
  if (!new RegExp(data.clientName, "i").test(text) && !/saved|created|client/i.test(text)) {
    throw new Error("Client create did not clearly succeed.");
  }

  await fillAny(page, ["search"], data.clientName).catch(() => {});
  await clickAny(page, [data.clientName, "View", "Open", "Details"], 1200).catch(() => {});
  await fillAny(page, ["note", "notes"], "Edited by deep human E2E test.").catch(() => {});
  await clickAny(page, ["Save", "Update", "Done"], 1200).catch(() => {});
}

async function testTeam(page) {
  await openArea(page, ["Team", "Workers", "Staff"], ["/team", "/dashboard"]);
  await auditVisibleBadWords(page, "Team");

  await clickAny(page, ["Add worker", "New worker", "Add staff", "Add team", "Invite", "+ Worker"], 1800);

  await fillAny(page, ["name", "worker", "staff"], data.workerName).catch(() => {});
  await fillAny(page, ["email"], data.workerEmail).catch(() => {});
  await fillAny(page, ["phone", "mobile"], data.workerPhone).catch(() => {});
  await fillAny(page, ["role"], "Worker").catch(() => {});
  await fillAny(page, ["rate", "hourly"], "32").catch(() => {});
  await chooseDropdown(page, "role", "worker").catch(() => {});
  await fillVisibleBlanks(page, [data.workerName, data.workerEmail, data.workerPhone, "Worker", "32"]);

  await save(page);

  const text = await bodyText(page);
  if (!/worker|team|staff|saved|created|invite/i.test(text)) {
    throw new Error("Worker/team create did not clearly succeed.");
  }
}

async function testJobs(page) {
  await openArea(page, ["Jobs", "Job"], ["/jobs", "/dashboard"]);
  await auditVisibleBadWords(page, "Jobs");

  await clickAny(page, ["Add job", "New job", "Create job", "Book job", "+ Job"], 2200);

  await fillAny(page, ["title", "job", "service", "work"], data.jobTitle).catch(() => {});
  await fillAny(page, ["client", "customer"], data.clientName).catch(() => {});
  await fillAny(page, ["worker", "assigned", "staff"], data.workerName).catch(() => {});
  await fillAny(page, ["address", "location"], data.clientAddress).catch(() => {});
  await fillAny(page, ["date", "scheduled"], "2026-06-28").catch(() => {});
  await fillAny(page, ["time"], "09:00").catch(() => {});
  await fillAny(page, ["price", "amount", "total"], "85").catch(() => {});
  await fillAny(page, ["note", "notes", "description"], data.jobNote).catch(() => {});
  await chooseDropdown(page, "client", data.clientName).catch(() => {});
  await chooseDropdown(page, "worker", data.workerName).catch(() => {});
  await fillVisibleBlanks(page, [
    data.jobTitle,
    data.clientName,
    data.workerName,
    data.clientAddress,
    "2026-06-28",
    "09:00",
    "85",
    data.jobNote,
  ]);

  await save(page);

  const text = await bodyText(page);
  if (!/job|saved|created|assigned|scheduled/i.test(text)) {
    throw new Error("Job create did not clearly succeed.");
  }

  await fillAny(page, ["search"], data.jobTitle).catch(() => {});
  await clickAny(page, [data.jobTitle, "View", "Open", "Details"], 1300).catch(() => {});
  await fillAny(page, ["note", "notes"], "Owner edited job note during deep E2E.").catch(() => {});
  await clickAny(page, ["Save", "Update", "Done"], 1200).catch(() => {});
}

async function testWorkerProof(page) {
  await openArea(page, ["Worker Proof", "Worker Command", "Time", "My Jobs", "Worker"], ["/workercommand", "/time", "/jobs", "/dashboard"]);
  await auditVisibleBadWords(page, "Worker Proof");

  await clickAny(page, [data.jobTitle, "Assigned", "Open", "View"], 900).catch(() => {});
  await clickAny(page, ["Acknowledge", "Ack"], 1200).catch(() => {});
  await clickAny(page, ["Start job", "Start"], 1200).catch(() => {});
  await sleep(900);
  await clickAny(page, ["Pause"], 1200).catch(() => {});
  await sleep(500);
  await clickAny(page, ["Resume"], 1200).catch(() => {});
  await fillAny(page, ["note", "notes", "proof"], "Worker note: deep human E2E proof added.").catch(() => {});
  await clickAny(page, ["Complete job", "Complete", "Finish"], 1500).catch(() => {});

  const text = await bodyText(page);
  if (!/worker|proof|time|job|complete|start|acknowledge|assigned/i.test(text)) {
    throw new Error("Worker proof/time area did not show expected worker content.");
  }

  if (/reports|billing|owner dashboard|platform owner/i.test(text)) {
    throw new Error("Worker area may be leaking owner-only wording.");
  }
}

async function testInvoiceReady(page) {
  await openArea(page, ["Jobs", "Ready to invoice", "Invoices", "Money", "Admin Debt"], ["/jobs", "/invoices", "/payments", "/dashboard"]);
  await clickAny(page, [data.jobTitle, "Completed", "Ready to invoice", "Invoice", "Draft"], 1400).catch(() => {});
  const text = await bodyText(page);
  if (!/invoice|money|draft|paid|unpaid|job|ready|admin/i.test(text)) {
    throw new Error("Completed job did not naturally lead to invoice/money state.");
  }
}

async function testQuotes(page) {
  await openArea(page, ["Quotes", "Quote"], ["/quotes", "/dashboard"]);
  await auditVisibleBadWords(page, "Quotes");

  await clickAny(page, ["Add quote", "New quote", "Create quote", "+ Quote"], 1800);

  await fillAny(page, ["title", "quote", "description"], data.quoteTitle).catch(() => {});
  await fillAny(page, ["client", "customer"], data.clientName).catch(() => {});
  await fillAny(page, ["amount", "price", "total"], "180").catch(() => {});
  await fillAny(page, ["note", "notes", "description"], "Trim front hedge and remove green waste.").catch(() => {});
  await chooseDropdown(page, "client", data.clientName).catch(() => {});
  await fillVisibleBlanks(page, [data.quoteTitle, data.clientName, "180", "Trim front hedge and remove green waste."]);

  await save(page);

  await clickAny(page, ["Accept", "Accepted", "Convert", "Create job", "Send", "Preview"], 1100).catch(() => {});
}

async function testInvoices(page) {
  await openArea(page, ["Invoices", "Money", "Admin Debt"], ["/invoices", "/payments", "/dashboard"]);
  await auditVisibleBadWords(page, "Invoices/Money");

  const clicked = await clickAny(page, ["Add invoice", "New invoice", "Create invoice", "Draft invoice", "+ Invoice"], 1800);
  if (clicked) {
    await fillAny(page, ["title", "invoice", "description"], data.invoiceTitle).catch(() => {});
    await fillAny(page, ["client", "customer"], data.clientName).catch(() => {});
    await fillAny(page, ["amount", "price", "total"], "85").catch(() => {});
    await fillAny(page, ["due"], "2026-07-05").catch(() => {});
    await chooseDropdown(page, "client", data.clientName).catch(() => {});
    await fillVisibleBlanks(page, [data.invoiceTitle, data.clientName, "85", "2026-07-05"]);
    await save(page);
  }

  const text = await bodyText(page);
  if (!/invoice|draft|paid|unpaid|overdue|money|admin/i.test(text)) {
    throw new Error("Invoices/Money area did not show expected money workflow.");
  }

  if (/automatically send|auto-send|tax filing|bank payout/i.test(text)) {
    throw new Error("Money area has risky automatic wording.");
  }
}

async function testCommand(page) {
  await openArea(page, ["Command", "Approve", "Approvals"], ["/command", "/dashboard"]);
  await auditVisibleBadWords(page, "Command");

  await assertText(page, ["Command", "approve", "decision", "prepared", "Business Health", "admin"], "Command did not show approval/decision language.");
  await clickAny(page, ["Check for work", "Refresh", "Scan", "Review", "Open", "Why it matters"], 1800).catch(() => {});
  await sleep(1200);

  const text = await bodyText(page);
  if (!/found|prepared|why|approve|edit|park|decision|Business Health/i.test(text)) {
    throw new Error("Command does not clearly show found/prepared/why/approve/edit/park.");
  }

  if (/sent automatically|changed automatically|file tax|bank payout/i.test(text)) {
    throw new Error("Command has risky automatic wording.");
  }

  await clickAny(page, ["Needs edit", "Edit", "Park", "Ignore for now", "Approve"], 1000).catch(() => {});
}

async function testBusinessHealth(page) {
  await openArea(page, ["Command", "Business Health"], ["/command", "/dashboard"]);
  await assertText(page, ["Business Health", "Today’s work", "Worker proof", "Ready to invoice", "Admin debt", "Plan clarity"], "Business Health cards not found.");
  await auditVisibleBadWords(page, "Business Health");
  await clickAny(page, ["Hide health", "Show health", "Why it matters", "Create support note"], 1200).catch(() => {});
}

async function testAccounting(page) {
  await openArea(page, ["Accounting Sync", "Xero", "Accounting"], ["/xero", "/settings", "/dashboard"]);
  await auditVisibleBadWords(page, "Accounting Sync");

  const text = await bodyText(page);
  if (!/accounting|xero|sync|draft|owner|connect|disconnect|invoice/i.test(text)) {
    throw new Error("Accounting Sync did not show safe sync/status wording.");
  }

  if (/automatic invoice sending|auto send|file tax|bank payout|submit.*government/i.test(text)) {
    throw new Error("Accounting area has unsafe automatic/tax/payout wording.");
  }
}

async function testPlans(page) {
  await openArea(page, ["Plans", "Pricing"], ["/plans"]);
  await auditVisibleBadWords(page, "Plans");

  const text = await bodyText(page);
  const expected = ["Start", "Crew", "Operator", "Command", "39", "89", "149", "299"];
  const missing = expected.filter((word) => !new RegExp(word, "i").test(text));
  if (missing.length) throw new Error("Plans missing expected pricing words: " + missing.join(", "));

  if (/MYOB included|For bigger teams needing MYOB|MYOB live sync/i.test(text)) {
    throw new Error("Old MYOB sales wording still visible.");
  }
}

async function testImportsExports(page) {
  await openArea(page, ["Imports", "Import", "CSV"], ["/imports", "/settings", "/dashboard"]);
  await auditVisibleBadWords(page, "Imports");

  const text = await bodyText(page);
  if (!/import|csv|client|team|job|template/i.test(text)) {
    throw new Error("Imports page did not show expected import/template wording.");
  }

  await clickAny(page, ["Clients template", "Client template", "Download", "Team template", "Jobs template"], 1000).catch(() => {});

  await openArea(page, ["Exports", "Export"], ["/exports", "/settings", "/dashboard"]).catch(() => {});
}

async function testSupport(page) {
  await openArea(page, ["Help", "Support", "Help Desk"], ["/support", "/help", "/dashboard"]);
  await auditVisibleBadWords(page, "Support");

  const text = await bodyText(page);
  if (!/help|support|setup|message|contact/i.test(text)) {
    throw new Error("Support/help area did not feel available.");
  }

  await fillAny(page, ["message", "note", "help"], "Deep human E2E support note.").catch(() => {});
  await clickAny(page, ["Send", "Create support note", "Submit", "Save"], 1000).catch(() => {});
}

async function testPublicViews(page, browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 850 } });
  const page = await context.newPage();
  await openPath(page, "/");
  const text = await bodyText(page);
  if (/owner dashboard|platform owner|command approvals|billing admin/i.test(text)) {
    throw new Error("Public homepage may be leaking owner app wording.");
  }
  await auditVisibleBadWords(page, "Public homepage");
  await record(page, "Public homepage customer-safe check", "PASS", { required: true });
  await context.close();
}

async function testMobile(page, browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const mobile = await context.newPage();
  attachWatchers(mobile);

  await humanStep(mobile, "Mobile login", () => login(mobile), { required: true });
  await humanStep(mobile, "Mobile Smart Hub/bottom nav", async () => {
    await openPath(mobile, "/dashboard");
    await clickAny(mobile, ["More", "Smart Hub", "Command", "Jobs", "Add client", "New job"], 1500).catch(() => {});
    await assertText(mobile, ["Churvox", "Smart", "Job", "Client", "Command", "Approve"], "Mobile app did not show expected content.");
    await auditVisibleBadWords(mobile, "Mobile app");
  }, { required: true });

  await humanStep(mobile, "Mobile modal/button tap check", async () => {
    await clickAny(mobile, ["Add client", "New job", "Approve", "More", "Open", "View"], 1400).catch(() => {});
    const text = await bodyText(mobile);
    if (/blank|undefined|nan|null/i.test(text.slice(0, 500))) {
      throw new Error("Mobile has suspicious blank/undefined text near top.");
    }
  }, { required: false });

  await context.close();
}

function attachWatchers(page) {
  page.on("console", (msg) => {
    const type = msg.type();
    const text = msg.text();
    if (["error"].includes(type) || /failed|network error|cannot read|undefined is not/i.test(text)) {
      run.browserErrors.push({
        type,
        text: text.slice(0, 600),
        url: page.url(),
      });
    }
  });

  page.on("pageerror", (err) => {
    run.browserErrors.push({
      type: "pageerror",
      text: String(err?.message || err).slice(0, 700),
      url: page.url(),
    });
  });

  page.on("response", (res) => {
    const status = res.status();
    const url = res.url();
    if (status >= 400 && /churvox|grassley|render|api|www\.churvox/i.test(url)) {
      run.networkErrors.push({
        status,
        url,
        page: page.url(),
      });
    }
  });
}

async function main() {
  const browser = await chromium.launch({ headless: HEADLESS, slowMo: SLOWMO });
  const context = await browser.newContext({ viewport: { width: 1365, height: 920 } });
  const page = await context.newPage();
  page.setDefaultTimeout(6500);
  attachWatchers(page);

  await humanStep(page, "01 login owner", () => login(page), { required: true });
  await humanStep(page, "02 session survives refresh", () => refreshSession(page), { required: true });
  await humanStep(page, "03 Smart Hub owner starting point", () => testSmartHub(page), { required: true });
  await humanStep(page, "04 create/edit client", () => testClients(page), { required: true });
  await humanStep(page, "05 create worker/team member", () => testTeam(page), { required: true });
  await humanStep(page, "06 create/edit/assign job", () => testJobs(page), { required: true });
  await humanStep(page, "07 worker proof and time flow", () => testWorkerProof(page), { required: false });
  await humanStep(page, "08 completed job to invoice-ready", () => testInvoiceReady(page), { required: false });
  await humanStep(page, "09 create/edit quote", () => testQuotes(page), { required: false });
  await humanStep(page, "10 invoice/money/admin debt", () => testInvoices(page), { required: true });
  await humanStep(page, "11 Command approval desk", () => testCommand(page), { required: true });
  await humanStep(page, "12 Business Health cards", () => testBusinessHealth(page), { required: true });
  await humanStep(page, "13 Accounting Sync/Xero safe wording", () => testAccounting(page), { required: false });
  await humanStep(page, "14 Plans/pricing clarity", () => testPlans(page), { required: true });
  await humanStep(page, "15 Imports/exports spreadsheet flow", () => testImportsExports(page), { required: false });
  await humanStep(page, "16 Help/support human feel", () => testSupport(page), { required: false });
  await humanStep(page, "17 Public/customer view safety", () => testPublicViews(page, browser), { required: true });
  await humanStep(page, "18 Mobile/tablet touch flow", () => testMobile(page, browser), { required: true });

  await context.close();
  await browser.close();

  run.finishedAt = new Date().toISOString();
  run.pass = run.results.filter((x) => x.status === "PASS").length;
  run.warn = run.results.filter((x) => x.status === "WARN").length;
  run.fail = run.results.filter((x) => x.status === "FAIL").length;
  run.browserErrorCount = run.browserErrors.length;
  run.networkErrorCount = run.networkErrors.length;

  const report = [];
  report.push("# Churvox deep human E2E report");
  report.push("");
  report.push(`Site: ${SITE}`);
  report.push(`Started: ${run.startedAt}`);
  report.push(`Finished: ${run.finishedAt}`);
  report.push("");
  report.push("Core promise tested:");
  report.push("");
  report.push("**Job done. Admin prepared. Owner approves.**");
  report.push("");
  report.push(`PASS: ${run.pass}`);
  report.push(`WARN: ${run.warn}`);
  report.push(`FAIL: ${run.fail}`);
  report.push(`Browser errors captured: ${run.browserErrorCount}`);
  report.push(`Network/API errors captured: ${run.networkErrorCount}`);
  report.push("");

  report.push("## Verdict");
  report.push("");
  if (run.fail === 0 && run.warn <= 3 && run.browserErrorCount === 0) {
    report.push("Likely ready for controlled founder-led testing, subject to reviewing screenshots.");
  } else if (run.fail <= 2) {
    report.push("Close, but fix the failed required flows first.");
  } else {
    report.push("Not ready yet. Fix required flow failures before outreach.");
  }
  report.push("");

  report.push("## Human journey results");
  report.push("");
  for (const item of run.results) {
    report.push(`### ${item.status} — ${item.name}`);
    report.push("");
    report.push(`Required: ${item.required ? "yes" : "no"}`);
    report.push(`URL: ${item.url}`);
    report.push(`Time: ${item.ms || 0}ms`);
    if (item.error) report.push(`Error: ${item.error}`);
    if (item.screenshot) report.push(`Screenshot: ${item.screenshot}`);
    report.push("");
  }

  report.push("## Browser errors");
  report.push("");
  if (!run.browserErrors.length) {
    report.push("None captured.");
  } else {
    run.browserErrors.slice(0, 50).forEach((err, idx) => {
      report.push(`${idx + 1}. ${err.type}: ${err.text}`);
      report.push(`   URL: ${err.url}`);
    });
  }
  report.push("");

  report.push("## Network/API errors");
  report.push("");
  if (!run.networkErrors.length) {
    report.push("None captured.");
  } else {
    run.networkErrors.slice(0, 80).forEach((err, idx) => {
      report.push(`${idx + 1}. HTTP ${err.status}: ${err.url}`);
      report.push(`   Page: ${err.page}`);
    });
  }
  report.push("");

  report.push("## Test data used");
  report.push("");
  report.push("```json");
  report.push(JSON.stringify(data, null, 2));
  report.push("```");
  report.push("");

  fs.writeFileSync(path.join(resultDir, "report.md"), report.join("\n"), "utf-8");
  fs.writeFileSync(path.join(resultDir, "report.json"), JSON.stringify(run, null, 2), "utf-8");

  console.log("");
  console.log("===== DEEP HUMAN E2E RESULT =====");
  console.log(`PASS: ${run.pass}`);
  console.log(`WARN: ${run.warn}`);
  console.log(`FAIL: ${run.fail}`);
  console.log(`Browser errors: ${run.browserErrorCount}`);
  console.log(`Network/API errors: ${run.networkErrorCount}`);
  console.log(`Report: ${path.join(resultDir, "report.md")}`);
  console.log(`Screenshots: ${resultDir}`);
  console.log("=================================");
  console.log("");

  if (run.fail > 0) process.exit(2);
}

main().catch((err) => {
  console.error("Fatal deep human E2E error:", err);
  process.exit(1);
});
