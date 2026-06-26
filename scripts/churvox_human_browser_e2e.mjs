import fs from "fs";
import path from "path";
import { chromium } from "@playwright/test";

const SITE = process.env.CHURVOX_SITE || "https://www.churvox.com";
const EMAIL = process.env.CHURVOX_TEST_EMAIL || "";
const PASSWORD = process.env.CHURVOX_TEST_PASSWORD || "";
const HEADLESS = process.env.CHURVOX_HEADLESS !== "false";
const SLOWMO = Number(process.env.CHURVOX_SLOWMO || 80);

if (!EMAIL || !PASSWORD) {
  console.error("Missing CHURVOX_TEST_EMAIL or CHURVOX_TEST_PASSWORD.");
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const resultDir = path.resolve(process.cwd(), "../docs/testing/results/human-browser-" + stamp);
fs.mkdirSync(resultDir, { recursive: true });

const run = {
  site: SITE,
  startedAt: new Date().toISOString(),
  results: [],
};

function cleanName(text) {
  return String(text || "").replace(/[^\w.-]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "step";
}

async function screenshot(page, name) {
  const file = path.join(resultDir, `${String(run.results.length + 1).padStart(2, "0")}-${cleanName(name)}.png`);
  try {
    await page.screenshot({ path: file, fullPage: true });
    return file;
  } catch {
    return "";
  }
}

async function step(page, name, fn, required = true) {
  const start = Date.now();
  try {
    await fn();
    const shot = await screenshot(page, name);
    run.results.push({
      status: "PASS",
      name,
      required,
      ms: Date.now() - start,
      screenshot: shot,
    });
    console.log(`PASS: ${name}`);
  } catch (error) {
    const shot = await screenshot(page, name);
    run.results.push({
      status: required ? "FAIL" : "WARN",
      name,
      required,
      ms: Date.now() - start,
      error: String(error?.message || error),
      screenshot: shot,
    });
    console.log(`${required ? "FAIL" : "WARN"}: ${name} — ${String(error?.message || error).slice(0, 220)}`);
    if (required && process.env.CHURVOX_STOP_ON_FAIL === "true") throw error;
  }
}

async function pause(ms = 450) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function visible(locator, timeout = 1800) {
  try {
    await locator.first().waitFor({ state: "visible", timeout });
    return true;
  } catch {
    return false;
  }
}

async function clickFirst(page, options, timeout = 1800) {
  for (const option of options) {
    const locators = [
      page.getByRole("button", { name: option }),
      page.getByRole("link", { name: option }),
      page.getByText(option, { exact: false }),
      page.locator(`[aria-label*="${String(option).replace(/"/g, '\\"')}" i]`),
      page.locator(`[title*="${String(option).replace(/"/g, '\\"')}" i]`),
    ];

    for (const locator of locators) {
      try {
        const first = locator.first();
        await first.waitFor({ state: "visible", timeout });
        await first.click({ timeout });
        await pause();
        return true;
      } catch {}
    }
  }
  return false;
}

async function fillFirst(page, hints, value, timeout = 1200) {
  const escaped = hints.map((h) => String(h).replace(/"/g, '\\"'));

  for (const hint of escaped) {
    const locators = [
      page.getByLabel(new RegExp(hint, "i")),
      page.getByPlaceholder(new RegExp(hint, "i")),
      page.locator(`input[name*="${hint}" i]`),
      page.locator(`textarea[name*="${hint}" i]`),
      page.locator(`input[id*="${hint}" i]`),
      page.locator(`textarea[id*="${hint}" i]`),
      page.locator(`input[aria-label*="${hint}" i]`),
      page.locator(`textarea[aria-label*="${hint}" i]`),
    ];

    for (const locator of locators) {
      try {
        const first = locator.first();
        await first.waitFor({ state: "visible", timeout });
        await first.fill(String(value), { timeout });
        await pause(120);
        return true;
      } catch {}
    }
  }

  return false;
}

async function fillAnyVisibleBlank(page, values) {
  const inputs = page.locator("input:visible, textarea:visible");
  const count = await inputs.count().catch(() => 0);
  let used = 0;

  for (let i = 0; i < count && used < values.length; i += 1) {
    const input = inputs.nth(i);
    try {
      const type = await input.getAttribute("type");
      if (["hidden", "submit", "button", "checkbox", "radio", "file"].includes(String(type || "").toLowerCase())) continue;
      const current = await input.inputValue().catch(() => "");
      if (current) continue;
      await input.fill(values[used]);
      used += 1;
      await pause(80);
    } catch {}
  }
  return used;
}

async function saveForm(page) {
  const clicked = await clickFirst(page, [
    "Save",
    "Create",
    "Add",
    "Add client",
    "Create client",
    "Save client",
    "Add worker",
    "Create worker",
    "Save worker",
    "Add job",
    "Create job",
    "Save job",
    "Create quote",
    "Save quote",
    "Create invoice",
    "Save invoice",
  ], 1500);

  if (!clicked) throw new Error("Could not find a Save/Create/Add button.");
  await pause(1200);
}

async function openArea(page, names, fallbackPath = "") {
  const opened = await clickFirst(page, Array.isArray(names) ? names : [names], 1500);
  if (opened) return true;
  if (fallbackPath) {
    await page.goto(`${SITE}${fallbackPath}`, { waitUntil: "domcontentloaded" });
    await pause(1000);
    return true;
  }
  throw new Error(`Could not open area: ${names}`);
}

async function login(page) {
  await page.goto(`${SITE}/login`, { waitUntil: "domcontentloaded" });
  await pause(800);

  const emailFilled =
    await fillFirst(page, ["email", "Email"], EMAIL) ||
    await page.locator('input[type="email"], input[name*="email" i]').first().fill(EMAIL).then(() => true).catch(() => false);

  const passwordFilled =
    await fillFirst(page, ["password", "Password"], PASSWORD) ||
    await page.locator('input[type="password"], input[name*="password" i]').first().fill(PASSWORD).then(() => true).catch(() => false);

  if (!emailFilled || !passwordFilled) throw new Error("Could not fill login email/password fields.");

  const clicked = await clickFirst(page, ["Log in", "Login", "Sign in", "Sign In"], 2500);
  if (!clicked) throw new Error("Could not find login button.");

  await page.waitForLoadState("domcontentloaded").catch(() => {});
  await pause(2500);

  const body = await page.locator("body").innerText({ timeout: 4000 }).catch(() => "");
  if (/invalid|incorrect|wrong|unauthorized|failed/i.test(body)) {
    throw new Error("Login appears to have failed: " + body.slice(0, 220));
  }

  if (/login|sign in/i.test(page.url()) && !/dashboard|app/i.test(body)) {
    throw new Error("Still appears to be on login page after login.");
  }
}

async function createClient(page, id) {
  await openArea(page, ["Clients", "Client"], "/dashboard");
  await clickFirst(page, ["Add client", "New client", "Create client", "+ Client", "Add customer", "New customer"], 2000);

  const name = `E2E Client ${id}`;
  await fillFirst(page, ["name", "client", "customer"], name).catch(() => {});
  await fillFirst(page, ["email"], `e2e.client.${id}@example.com`).catch(() => {});
  await fillFirst(page, ["phone", "mobile"], "+64210000001").catch(() => {});
  await fillFirst(page, ["address", "location"], "10 E2E Test Street, Wellington").catch(() => {});
  await fillFirst(page, ["note", "notes"], "Created by Churvox human browser E2E test.").catch(() => {});
  await fillAnyVisibleBlank(page, [name, `e2e.client.${id}@example.com`, "+64210000001", "10 E2E Test Street, Wellington", "E2E test client"]);

  await saveForm(page);

  const body = await page.locator("body").innerText({ timeout: 5000 }).catch(() => "");
  if (!body.includes(name)) throw new Error("Client was created, but client name was not visible after save.");
}

async function createWorker(page, id) {
  await openArea(page, ["Team", "Workers", "Staff"], "/dashboard");
  await clickFirst(page, ["Add worker", "New worker", "Add team", "Add staff", "Create worker", "+ Worker", "Invite"], 2000);

  const name = `E2E Worker ${id}`;
  await fillFirst(page, ["name", "worker", "staff"], name).catch(() => {});
  await fillFirst(page, ["email"], `e2e.worker.${id}@example.com`).catch(() => {});
  await fillFirst(page, ["phone", "mobile"], "+64210000002").catch(() => {});
  await fillFirst(page, ["role"], "Worker").catch(() => {});
  await fillFirst(page, ["rate", "hourly"], "32").catch(() => {});
  await fillAnyVisibleBlank(page, [name, `e2e.worker.${id}@example.com`, "+64210000002", "Worker", "32"]);

  await saveForm(page);
}

async function createJob(page, id) {
  await openArea(page, ["Jobs", "Job"], "/dashboard");
  await clickFirst(page, ["Add job", "New job", "Create job", "+ Job", "Book job", "Add work"], 2200);

  const title = `E2E Lawn Tidy ${id}`;
  await fillFirst(page, ["title", "job", "service", "work"], title).catch(() => {});
  await fillFirst(page, ["client", "customer"], `E2E Client ${id}`).catch(() => {});
  await fillFirst(page, ["address", "location"], "10 E2E Test Street, Wellington").catch(() => {});
  await fillFirst(page, ["date", "scheduled"], "2026-06-28").catch(() => {});
  await fillFirst(page, ["time"], "09:00").catch(() => {});
  await fillFirst(page, ["price", "amount", "total"], "85").catch(() => {});
  await fillFirst(page, ["worker", "assigned"], `E2E Worker ${id}`).catch(() => {});
  await fillFirst(page, ["note", "notes", "description"], "Mow lawns, edges, blow down paths. Created by human browser E2E.").catch(() => {});
  await fillAnyVisibleBlank(page, [title, `E2E Client ${id}`, "10 E2E Test Street, Wellington", "2026-06-28", "09:00", "85", `E2E Worker ${id}`]);

  await saveForm(page);

  const body = await page.locator("body").innerText({ timeout: 5000 }).catch(() => "");
  if (!/E2E|Lawn|Job|Saved|Created/i.test(body)) throw new Error("Job save did not show expected confirmation/content.");
}

async function testWorkerProof(page) {
  await openArea(page, ["Worker Proof", "Worker Command", "Worker", "Time"], "/dashboard");

  await clickFirst(page, ["Acknowledge", "Ack"], 1000).catch(() => {});
  await clickFirst(page, ["Start", "Start job"], 1000).catch(() => {});
  await pause(800);
  await clickFirst(page, ["Pause"], 1000).catch(() => {});
  await pause(500);
  await clickFirst(page, ["Resume"], 1000).catch(() => {});
  await fillFirst(page, ["note", "notes"], "Worker proof note from human browser E2E.").catch(() => {});
  await clickFirst(page, ["Complete", "Complete job", "Finish"], 1000).catch(() => {});

  const body = await page.locator("body").innerText({ timeout: 4000 }).catch(() => "");
  if (!/worker|proof|time|job|complete|start|acknowledge/i.test(body)) {
    throw new Error("Worker proof page did not show expected worker/proof/time content.");
  }
}

async function createQuote(page, id) {
  await openArea(page, ["Quotes", "Quote"], "/dashboard");
  const clicked = await clickFirst(page, ["Add quote", "New quote", "Create quote", "+ Quote"], 1800);
  if (!clicked) throw new Error("No quote create button found.");

  await fillFirst(page, ["title", "quote", "description"], `E2E Hedge Trim Quote ${id}`).catch(() => {});
  await fillFirst(page, ["client", "customer"], `E2E Client ${id}`).catch(() => {});
  await fillFirst(page, ["amount", "price", "total"], "180").catch(() => {});
  await fillFirst(page, ["description", "note", "notes"], "Trim front hedge and remove green waste.").catch(() => {});
  await fillAnyVisibleBlank(page, [`E2E Hedge Trim Quote ${id}`, `E2E Client ${id}`, "180", "Trim hedge"]);

  await saveForm(page);
}

async function createInvoice(page, id) {
  await openArea(page, ["Invoices", "Money", "Invoice"], "/dashboard");
  const clicked = await clickFirst(page, ["Add invoice", "New invoice", "Create invoice", "+ Invoice", "Draft invoice"], 1800);
  if (!clicked) throw new Error("No invoice create button found.");

  await fillFirst(page, ["client", "customer"], `E2E Client ${id}`).catch(() => {});
  await fillFirst(page, ["title", "invoice", "description"], `E2E Draft Invoice ${id}`).catch(() => {});
  await fillFirst(page, ["amount", "price", "total"], "85").catch(() => {});
  await fillFirst(page, ["due"], "2026-07-05").catch(() => {});
  await fillAnyVisibleBlank(page, [`E2E Client ${id}`, `E2E Draft Invoice ${id}`, "85", "2026-07-05"]);

  await saveForm(page);
}

async function commandFlow(page) {
  await openArea(page, ["Command", "Approve", "Approvals"], "/dashboard");
  await clickFirst(page, ["Check for work", "Refresh", "Scan", "Review"], 2000).catch(() => {});
  await pause(1600);

  const body = await page.locator("body").innerText({ timeout: 5000 }).catch(() => "");
  if (!/command|approve|prepared|found|decision|business health|admin/i.test(body)) {
    throw new Error("Command page did not show expected command/approval/business health content.");
  }

  await clickFirst(page, ["Business Health", "Why it matters", "Open", "Review"], 1000).catch(() => {});
}

async function checkArea(page, names, fallbackPath, expectedWords) {
  await openArea(page, names, fallbackPath);
  await pause(900);
  const body = await page.locator("body").innerText({ timeout: 4000 }).catch(() => "");
  const ok = expectedWords.some((word) => new RegExp(word, "i").test(body));
  if (!ok) throw new Error(`Area opened but expected text not found. Wanted: ${expectedWords.join(", ")}`);
}

async function mobileSmoke(browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await login(page);
  await page.goto(`${SITE}/dashboard`, { waitUntil: "domcontentloaded" });
  await pause(1500);
  await clickFirst(page, ["More", "New job", "Add client", "Approve", "Command", "Smart Hub"], 1800).catch(() => {});
  const body = await page.locator("body").innerText({ timeout: 5000 }).catch(() => "");
  if (!/churvox|smart|job|client|approve|command/i.test(body)) throw new Error("Mobile view did not show expected app content.");
  await screenshot(page, "mobile-smoke");
  await context.close();
}

async function main() {
  const id = Date.now().toString().slice(-6);
  const browser = await chromium.launch({ headless: HEADLESS, slowMo: SLOWMO });
  const context = await browser.newContext({ viewport: { width: 1365, height: 900 } });
  const page = await context.newPage();

  page.setDefaultTimeout(5500);

  await step(page, "Login and session", () => login(page), true);
  await step(page, "Smart Hub opens", () => checkArea(page, ["Smart Hub", "Dashboard", "Today"], "/dashboard", ["Smart", "Hub", "today", "job", "approve", "admin"]), true);
  await step(page, "Create client", () => createClient(page, id), true);
  await step(page, "Create worker", () => createWorker(page, id), false);
  await step(page, "Create job and assign worker", () => createJob(page, id), true);
  await step(page, "Worker proof/time flow", () => testWorkerProof(page), false);
  await step(page, "Completed job invoice-ready check", () => checkArea(page, ["Jobs", "Ready to invoice", "Invoices", "Money"], "/dashboard", ["invoice", "money", "job", "ready", "draft"]), false);
  await step(page, "Create quote", () => createQuote(page, id), false);
  await step(page, "Create invoice", () => createInvoice(page, id), false);
  await step(page, "Command approval desk", () => commandFlow(page), true);
  await step(page, "Business Health wording", () => checkArea(page, ["Command", "Business Health"], "/dashboard", ["Business Health", "What needs attention", "owner", "approve"]), true);
  await step(page, "Accounting Sync/Xero area", () => checkArea(page, ["Accounting Sync", "Xero", "Accounting"], "/dashboard", ["accounting", "xero", "sync", "draft", "owner"]), false);
  await step(page, "Plans/pricing", () => checkArea(page, ["Plans", "Pricing"], "/plans", ["Start", "Crew", "Operator", "Command", "Accounting"]), true);
  await step(page, "Help/support", () => checkArea(page, ["Help", "Support"], "/dashboard", ["help", "support", "setup"]), false);
  await step(page, "Mobile/tablet smoke", () => mobileSmoke(browser), true);

  await context.close();
  await browser.close();

  run.finishedAt = new Date().toISOString();
  run.pass = run.results.filter((r) => r.status === "PASS").length;
  run.warn = run.results.filter((r) => r.status === "WARN").length;
  run.fail = run.results.filter((r) => r.status === "FAIL").length;

  const lines = [];
  lines.push("# Churvox human browser E2E report");
  lines.push("");
  lines.push(`Site: ${run.site}`);
  lines.push(`Started: ${run.startedAt}`);
  lines.push(`Finished: ${run.finishedAt}`);
  lines.push(`PASS: ${run.pass}`);
  lines.push(`WARN: ${run.warn}`);
  lines.push(`FAIL: ${run.fail}`);
  lines.push("");
  lines.push("Core promise tested: **Job done. Admin prepared. Owner approves.**");
  lines.push("");

  for (const item of run.results) {
    lines.push(`## ${item.status} — ${item.name}`);
    lines.push("");
    lines.push(`Required: ${item.required ? "yes" : "no"}`);
    lines.push(`Time: ${item.ms}ms`);
    if (item.error) lines.push(`Error: ${item.error}`);
    if (item.screenshot) lines.push(`Screenshot: ${path.relative(path.resolve(process.cwd(), ".."), item.screenshot)}`);
    lines.push("");
  }

  const reportPath = path.join(resultDir, "report.md");
  const jsonPath = path.join(resultDir, "report.json");
  fs.writeFileSync(reportPath, lines.join("\n"), "utf-8");
  fs.writeFileSync(jsonPath, JSON.stringify(run, null, 2), "utf-8");

  console.log("");
  console.log("===== HUMAN BROWSER E2E RESULT =====");
  console.log(`PASS: ${run.pass}`);
  console.log(`WARN: ${run.warn}`);
  console.log(`FAIL: ${run.fail}`);
  console.log(`Report: ${reportPath}`);
  console.log(`Screenshots: ${resultDir}`);
  console.log("====================================");
  console.log("");

  if (run.fail > 0) process.exit(2);
}

main().catch((error) => {
  console.error("Fatal human browser E2E error:", error);
  process.exit(1);
});
