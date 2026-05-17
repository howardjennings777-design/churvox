const fs = require("fs");
const path = require("path");

let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  console.error("Playwright is not installed. Run: npm --prefix frontend install --legacy-peer-deps");
  process.exit(1);
}

const ROOT = process.cwd();
const BASE_URL = process.env.CHURVOX_AUDIT_URL || "http://127.0.0.1:4298";
const EMAIL = process.env.CHURVOX_TEST_EMAIL || "";
const PASSWORD = process.env.CHURVOX_TEST_PASSWORD || "";
const SHOTS = path.join(ROOT, "business-ready-audit", "screenshots");
const REPORT = path.join(ROOT, "BUSINESS_RUNTIME_LITE_REPORT.md");

fs.mkdirSync(SHOTS, { recursive: true });

const blockers = [];
const warnings = [];
const passes = [];

function addBlocker(area, msg) {
  blockers.push({ area, msg });
  console.log(`❌ BLOCKER [${area}]: ${msg}`);
}

function addWarning(area, msg) {
  warnings.push({ area, msg });
  console.log(`⚠️ WARNING [${area}]: ${msg}`);
}

function addPass(area, msg) {
  passes.push({ area, msg });
  console.log(`✅ PASS [${area}]: ${msg}`);
}

async function shot(page, name) {
  const safe = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  await page.screenshot({ path: path.join(SHOTS, `${safe}.png`), fullPage: true }).catch(() => {});
}

async function bodyText(page) {
  return page.locator("body").innerText({ timeout: 10000 }).catch(() => "");
}

async function clickText(page, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`^${escaped}$`, "i"),
    new RegExp(escaped, "i"),
  ];

  for (const pattern of patterns) {
    const button = page.getByRole("button", { name: pattern }).first();
    if (await button.count()) {
      await button.click({ timeout: 5000 });
      return true;
    }

    const link = page.getByRole("link", { name: pattern }).first();
    if (await link.count()) {
      await link.click({ timeout: 5000 });
      return true;
    }

    const text = page.getByText(pattern).first();
    if (await text.count()) {
      await text.click({ timeout: 5000 });
      return true;
    }
  }

  return false;
}

async function checkBadText(page, area) {
  const text = await bodyText(page);
  const bad = [
    "undefined",
    "NaN",
    "[object Object]",
    "Quick create failed",
    "backend quick-create",
    "still needs fixing",
    "Saved on screen",
    "not implemented",
    "lorem ipsum",
  ];

  for (const phrase of bad) {
    if (text.toLowerCase().includes(phrase.toLowerCase())) {
      addBlocker(area, `Bad visible text found: ${phrase}`);
    }
  }

  if (text.trim().length < 120) {
    addWarning(area, "Page has very little text; possible blank route.");
  }
}

async function checkOverflow(page, area) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    return Math.max(doc.scrollWidth - doc.clientWidth, body.scrollWidth - body.clientWidth);
  }).catch(() => 0);

  if (overflow > 30) {
    addWarning(area, `Horizontal overflow: ${overflow}px`);
  } else {
    addPass(area, "No major horizontal overflow.");
  }
}

async function login(page) {
  if (!EMAIL || !PASSWORD) {
    addBlocker("login", "CHURVOX_TEST_EMAIL and CHURVOX_TEST_PASSWORD are required.");
    return false;
  }

  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle", timeout: 60000 }).catch(async () => {
    await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 60000 });
  });

  await page.waitForTimeout(1000);

  const emailInput = page.locator('input[type="email"], input[name*="email" i], input[placeholder*="email" i]').first();
  const passInput = page.locator('input[type="password"], input[name*="password" i], input[placeholder*="password" i]').first();

  if (!(await emailInput.count()) || !(await passInput.count())) {
    addBlocker("login", "Could not find email/password inputs.");
    await shot(page, "login-inputs-missing");
    return false;
  }

  await emailInput.fill(EMAIL);
  await passInput.fill(PASSWORD);

  const clicked =
    await clickText(page, "Log in") ||
    await clickText(page, "Login") ||
    await clickText(page, "Open Command Desk") ||
    await clickText(page, "Enter Command Desk") ||
    await clickText(page, "Sign in");

  if (!clicked) {
    const submit = page.locator('button[type="submit"]').first();
    if (await submit.count()) {
      await submit.click();
    } else {
      addBlocker("login", "Could not find login submit button.");
      await shot(page, "login-submit-missing");
      return false;
    }
  }

  await page.waitForTimeout(7000);

  const text = await bodyText(page);

  if (/password/i.test(text) && /email/i.test(text) && !/dashboard|command desk|work|clients/i.test(text)) {
    addBlocker("login", "Login did not stick.");
    await shot(page, "login-did-not-stick");
    return false;
  }

  addPass("login", "Login appears to stick.");
  await shot(page, "logged-in");
  return true;
}

async function testNav(page, label) {
  const clicked = await clickText(page, label);

  if (!clicked) {
    addBlocker("navigation", `Could not click: ${label}`);
    await shot(page, `nav-${label}-missing`);
    return;
  }

  await page.waitForTimeout(2000);
  await checkBadText(page, label);
  await checkOverflow(page, label);
  await shot(page, `nav-${label}`);
  addPass("navigation", `${label} opened.`);
}

async function testQuickAction(page, label, values) {
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(1500);

  const clicked = await clickText(page, label);

  if (!clicked) {
    addBlocker("quick action", `Could not open: ${label}`);
    await shot(page, `quick-${label}-missing`);
    return;
  }

  await page.waitForTimeout(1000);

  const modal = page.locator(".cs-quick-action-modal").first();

  if (!(await modal.count())) {
    addBlocker("quick action", `${label} modal did not open.`);
    await shot(page, `quick-${label}-modal-missing`);
    return;
  }

  const inputs = modal.locator("input");
  const textareas = modal.locator("textarea");

  for (let i = 0; i < Math.min(values.inputs.length, await inputs.count()); i += 1) {
    await inputs.nth(i).fill(values.inputs[i]);
  }

  for (let i = 0; i < Math.min(values.textareas.length, await textareas.count()); i += 1) {
    await textareas.nth(i).fill(values.textareas[i]);
  }

  const beforeBlockers = blockers.length;

  const saveButton = modal.getByRole("button", { name: /save and let ai prepare|save/i }).first();

  if (!(await saveButton.count())) {
    addBlocker("quick action", `${label} save button missing.`);
    await shot(page, `quick-${label}-save-missing`);
    return;
  }

  await saveButton.click({ timeout: 5000 });
  await page.waitForTimeout(7000);

  await checkBadText(page, `quick ${label}`);
  await shot(page, `quick-${label}`);

  if (blockers.length === beforeBlockers) {
    addPass("quick action", `${label} submitted without visible blocker.`);
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

  page.on("console", (msg) => {
    const text = msg.text();

    if (/beforeinstallpromptevent\.preventDefault/i.test(text)) return;

    if (/ReferenceError|TypeError|Churvox UI crash|is not defined|cannot read/i.test(text)) {
      addBlocker("console", text);
    }
  });

  page.on("pageerror", (err) => {
    addBlocker("page crash", err.message);
  });

  page.on("response", async (response) => {
    const url = response.url();
    const status = response.status();

    if (url.includes("/api/") && status >= 400) {
      if (/quick-create/i.test(url)) {
        addBlocker("backend", `Quick-create API failed: ${status} ${url}`);
      } else {
        addWarning("backend", `API returned ${status}: ${url}`);
      }
    }
  });

  const loggedIn = await login(page);

  if (loggedIn) {
    for (const label of ["Dashboard", "Work", "Clients", "Crew", "Quotes", "Invoices", "Proof & Pay", "Payroll", "Plans", "Settings"]) {
      await testNav(page, label);
    }

    const id = Date.now().toString().slice(-6);

    await testQuickAction(page, "Add client", {
      inputs: [
        `Audit Client ${id}`,
        `audit${id}@churvox.test`,
        `020000${id}`,
        `1 Audit Street`,
        `Audit Area`,
      ],
      textareas: [`Runtime audit client ${id}. Safe to delete.`],
    });

    await testQuickAction(page, "Add work", {
      inputs: [
        `Audit Work ${id}`,
        `Audit Client ${id}`,
        `1 Audit Street`,
        `Audit Area`,
        `15`,
      ],
      textareas: [`Runtime audit work ${id}. Safe to delete.`],
    });
  }

  await browser.close();

  const md = [
    "# Churvox Business Runtime Lite Audit",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    blockers.length
      ? `❌ **NOT READY** — ${blockers.length} blocker(s).`
      : "✅ **RUNTIME CHECK FOUND NO BLOCKERS**.",
    "",
    "## Blockers",
    "",
    blockers.length ? blockers.map((x, i) => `${i + 1}. **${x.area}** — ${x.msg}`).join("\n") : "None.",
    "",
    "## Warnings",
    "",
    warnings.length ? warnings.map((x, i) => `${i + 1}. **${x.area}** — ${x.msg}`).join("\n") : "None.",
    "",
    "## Passes",
    "",
    passes.map((x, i) => `${i + 1}. **${x.area}** — ${x.msg}`).join("\n"),
    "",
  ].join("\n");

  fs.writeFileSync(REPORT, md);

  console.log(md);

  if (blockers.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
