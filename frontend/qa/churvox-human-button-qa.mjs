import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE = process.env.CHURVOX_BASE_URL || "https://www.churvox.com";
const EMAIL = process.env.CHURVOX_QA_EMAIL;
const PASSWORD = process.env.CHURVOX_QA_PASSWORD;

const OUT_DIR = path.join(process.cwd(), "qa-results");
fs.mkdirSync(OUT_DIR, { recursive: true });

const report = {
  started_at: new Date().toISOString(),
  base: BASE,
  blockers: [],
  warnings: [],
  passes: [],
  skipped: [],
};

function log(type, area, message, url = "") {
  const row = { type, area, message, url, time: new Date().toISOString() };
  if (type === "BLOCKER") report.blockers.push(row);
  if (type === "WARN") report.warnings.push(row);
  if (type === "PASS") report.passes.push(row);
  if (type === "SKIP") report.skipped.push(row);

  const icon = type === "BLOCKER" ? "❌" : type === "WARN" ? "⚠️ " : type === "SKIP" ? "⏭️ " : "✅";
  console.log(`${icon} ${type.padEnd(7)} | ${area} | ${message}`);
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function isDangerousButton(label) {
  return /delete|remove|trash|void|send invoice|send quote|send email|mark paid|sync|xero|myob|checkout|pay now|buy|subscribe|cancel subscription|reset|clear|logout|log out|archive|decline invite|disconnect/i.test(label);
}

function isNoise(label) {
  return !label || label.length > 120;
}

async function safeText(locator) {
  try {
    return cleanText(await locator.innerText({ timeout: 1000 }));
  } catch {
    try {
      return cleanText(await locator.getAttribute("aria-label"));
    } catch {
      return "";
    }
  }
}

async function closeOverlays(page) {
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(250);

  const closeNames = [/close/i, /cancel/i, /done/i, /back/i, /dismiss/i];
  for (const name of closeNames) {
    const btn = page.getByRole("button", { name }).first();
    const count = await btn.count().catch(() => 0);
    if (!count) continue;
    const visible = await btn.isVisible().catch(() => false);
    if (!visible) continue;
    await btn.click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(300);
    return;
  }
}

async function pageHealthy(page, area) {
  const body = cleanText(await page.locator("body").innerText({ timeout: 8000 }).catch(() => ""));
  if (!body) {
    log("BLOCKER", area, "Page went blank", page.url());
    return false;
  }
  if (/application error|something went wrong|cannot read properties|uncaught referenceerror|uncaught typeerror/i.test(body)) {
    log("BLOCKER", area, `Crash text found: ${body.slice(0, 180)}`, page.url());
    return false;
  }
  if (page.url().includes("/login") && !area.includes("login")) {
    log("BLOCKER", area, "Button sent user back to login", page.url());
    return false;
  }
  return true;
}

async function login(page) {
  if (!EMAIL || !PASSWORD) {
    log("BLOCKER", "setup", "Missing CHURVOX_QA_EMAIL or CHURVOX_QA_PASSWORD");
    return false;
  }

  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);

  const submit = page.locator('form button[type="submit"], form .cvPublicAuthSubmit').first();
  await Promise.all([
    page.waitForResponse((res) => res.url().includes("/api/auth/login"), { timeout: 15000 }).catch(() => null),
    submit.click({ timeout: 8000 }),
  ]);

  await page.waitForFunction(() => !window.location.pathname.includes("/login"), null, { timeout: 15000 }).catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});

  if (page.url().includes("/login")) {
    log("BLOCKER", "login", "Login did not leave login page", page.url());
    return false;
  }

  log("PASS", "login", `Logged in to ${page.url()}`);
  return true;
}

const routes = [
  ["/dashboard#smart", "Smart Hub"],
  ["/dashboard#command", "Command"],
  ["/dashboard#jobs", "Jobs"],
  ["/dashboard#clients", "Clients"],
  ["/dashboard#quotes", "Quotes"],
  ["/dashboard#invoices", "Invoices"],
  ["/dashboard#payments", "Payments"],
  ["/dashboard#xero", "Xero"],
  ["/dashboard#team", "Team"],
  ["/dashboard#workercommand", "Worker View"],
  ["/dashboard#time", "Time Sheets"],
  ["/dashboard#payroll", "Payroll"],
  ["/dashboard#automation", "Automation"],
  ["/dashboard#reports", "Reports"],
  ["/dashboard#settings", "Settings"],
  ["/dashboard#plans", "Plans"],
  ["/dashboard#support", "Support"],
];

async function collectButtons(page) {
  const buttons = page.locator('button, [role="button"], a[href]');
  const count = await buttons.count().catch(() => 0);
  const items = [];

  for (let i = 0; i < count; i += 1) {
    const loc = buttons.nth(i);
    const visible = await loc.isVisible().catch(() => false);
    if (!visible) continue;

    const label = await safeText(loc);
    if (isNoise(label)) continue;

    const disabled = await loc.isDisabled?.().catch(() => false);
    items.push({ index: i, label, disabled });
  }

  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.label}-${item.index}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function auditRoute(context, route, routeName) {
  const page = await context.newPage();
  const consoleErrors = [];
  const badResponses = [];

  page.on("console", (msg) => {
    const text = msg.text();
    if (/platform\/visit|Access to fetch/i.test(text)) return;
    if (msg.type() === "error" && !/401|favicon|ResizeObserver|manifest/i.test(text)) {
      consoleErrors.push(text);
    }
  });

  page.on("response", (res) => {
    const url = res.url();
    const status = res.status();
    if (status >= 500) badResponses.push(`${status} ${url}`);
    if (status >= 400 && status !== 401 && /\/api\/|onrender|grassley-backend/i.test(url)) {
      badResponses.push(`${status} ${url}`);
    }
  });

  await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" }).catch((err) => {
    log("BLOCKER", routeName, `Could not load route: ${err.message}`, `${BASE}${route}`);
  });

  if (!(await pageHealthy(page, `${routeName} load`))) {
    await page.screenshot({ path: path.join(OUT_DIR, `button-audit-${routeName.replace(/\W+/g, "-")}-load.png`), fullPage: true }).catch(() => {});
    await page.close();
    return;
  }

  const buttons = await collectButtons(page);
  log("PASS", routeName, `Found ${buttons.length} visible buttons/links`);

  await page.close();

  for (let n = 0; n < buttons.length; n += 1) {
    const { index, label, disabled } = buttons[n];

    if (disabled) {
      log("SKIP", routeName, `Skipped disabled button: ${label}`);
      continue;
    }

    if (isDangerousButton(label)) {
      log("SKIP", routeName, `Skipped dangerous/action button: ${label}`);
      continue;
    }

    const clickPage = await context.newPage();
    const localErrors = [];
    const localBadResponses = [];

    clickPage.on("console", (msg) => {
      const text = msg.text();
      if (/platform\/visit|Access to fetch|Failed to load resource: net::ERR_FAILED/i.test(text)) return;
      if (msg.type() === "error" && !/401|favicon|ResizeObserver|manifest/i.test(text)) {
        localErrors.push(text);
      }
    });

    clickPage.on("response", (res) => {
      const url = res.url();
      const status = res.status();
      if (status >= 500) localBadResponses.push(`${status} ${url}`);
      if (status >= 400 && status !== 401 && /\/api\/|onrender|grassley-backend/i.test(url)) {
        localBadResponses.push(`${status} ${url}`);
      }
    });

    try {
      await clickPage.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
      await closeOverlays(clickPage);

      const loc = clickPage.locator('button, [role="button"], a[href]').nth(index);
      const visible = await loc.isVisible().catch(() => false);

      if (!visible) {
        log("SKIP", routeName, `Skipped dynamic button that moved/disappeared: ${label}`);
        await clickPage.close();
        continue;
      }

      const enabled = !(await loc.isDisabled?.().catch(() => false));
      if (!enabled) {
        log("SKIP", routeName, `Skipped disabled button: ${label}`);
        await clickPage.close();
        continue;
      }

      await loc.scrollIntoViewIfNeeded().catch(() => {});
      await loc.click({ timeout: 6000 }).catch(async (err) => {
        throw new Error(`Click failed for "${label}": ${err.message}`);
      });

      await clickPage.waitForTimeout(900);
      await clickPage.waitForLoadState("networkidle", { timeout: 6000 }).catch(() => {});
      await closeOverlays(clickPage);

      const healthy = await pageHealthy(clickPage, `${routeName} button "${label}"`);

      if (localBadResponses.length) {
        log("WARN", routeName, `Button "${label}" caused API/network warning: ${localBadResponses[0]}`, clickPage.url());
      } else if (localErrors.length) {
        log("WARN", routeName, `Button "${label}" caused console warning: ${localErrors[0].slice(0, 180)}`, clickPage.url());
      } else if (healthy) {
        log("PASS", routeName, `Button works: ${label}`);
      }
    } catch (err) {
      const file = `button-audit-${routeName.replace(/\W+/g, "-")}-${String(n).padStart(2, "0")}.png`;
      await clickPage.screenshot({ path: path.join(OUT_DIR, file), fullPage: true }).catch(() => {});
      log("BLOCKER", routeName, err.message, clickPage.url());
    } finally {
      await clickPage.close().catch(() => {});
    }
  }
}

(async () => {
  console.log(`\n🚀 Churvox Human Button QA starting against ${BASE}\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 850 },
    ignoreHTTPSErrors: true,
  });

  const loginPage = await context.newPage();
  const ok = await login(loginPage);
  await loginPage.close();

  if (ok) {
    for (const [route, name] of routes) {
      await auditRoute(context, route, name);
    }
  }

  await browser.close();

  report.finished_at = new Date().toISOString();
  const out = path.join(OUT_DIR, `churvox-human-button-qa-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  fs.writeFileSync(out, JSON.stringify(report, null, 2));

  console.log("\n==============================");
  console.log("CHURVOX HUMAN BUTTON QA RESULT");
  console.log("==============================");
  console.log(`Blockers: ${report.blockers.length}`);
  console.log(`Warnings: ${report.warnings.length}`);
  console.log(`Passes:   ${report.passes.length}`);
  console.log(`Skipped:  ${report.skipped.length}`);
  console.log(`Report:   ${out}`);
  console.log(`Shots:    ${OUT_DIR}`);
  console.log("==============================");

  if (report.blockers.length) {
    console.log("\n❌ BUTTON QA FAILED — paste blockers above.");
    process.exit(1);
  }

  if (report.warnings.length) {
    console.log("\n⚠️ BUTTON QA PASSED WITH WARNINGS — review warning buttons.");
    process.exit(0);
  }

  console.log("\n✅ BUTTON QA CLEAN — safe visible buttons passed.");
})();
