const fs = require("fs");
const path = require("path");

let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  console.error("Playwright is not installed. Runtime browser audit cannot run.");
  process.exit(1);
}

function findRoot() {
  const candidates = [
    process.cwd(),
    path.resolve(process.cwd(), ".."),
    path.resolve(__dirname, "..", ".."),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, "frontend"))) return candidate;
  }

  return path.resolve(__dirname, "..", "..");
}

const root = findRoot();
const baseUrl = process.env.CHURVOX_AUDIT_URL || "http://127.0.0.1:4297";
const email = process.env.CHURVOX_TEST_EMAIL || "";
const password = process.env.CHURVOX_TEST_PASSWORD || "";
const screenshots = path.join(root, "business-ready-audit", "screenshots");
const reportPath = path.join(root, "BUSINESS_READY_AUDIT.md");
const jsonPath = path.join(root, "BUSINESS_READY_RUNTIME.json");

fs.mkdirSync(screenshots, { recursive: true });

const blockers = [];
const warnings = [];
const passes = [];
const apiErrors = [];
const consoleErrors = [];

function blocker(area, msg) {
  blockers.push({ area, msg });
}

function warning(area, msg) {
  warnings.push({ area, msg });
}

function pass(area, msg) {
  passes.push({ area, msg });
}

async function screenshot(page, name) {
  const safe = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  await page.screenshot({ path: path.join(screenshots, `${safe}.png`), fullPage: true }).catch(() => {});
}

async function bodyText(page) {
  return await page.locator("body").innerText({ timeout: 10000 }).catch(() => "");
}

async function clickByText(page, label) {
  const patterns = [
    new RegExp(`^${label}$`, "i"),
    new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
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

async function checkVisibleText(page, area) {
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
      blocker(area, `Bad visible text: ${phrase}`);
    }
  }

  if (text.trim().length < 120) {
    warning(area, "Very little text on page; possible blank/failed route.");
  }
}

async function checkOverflow(page, area) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    return Math.max(doc.scrollWidth - doc.clientWidth, body.scrollWidth - body.clientWidth);
  }).catch(() => 0);

  if (overflow > 30) warning(area, `Horizontal overflow ${overflow}px.`);
  else pass(area, "No major horizontal overflow.");
}

async function login(page) {
  if (!email || !password) {
    blocker("login", "Set CHURVOX_TEST_EMAIL and CHURVOX_TEST_PASSWORD before runtime audit.");
    return false;
  }

  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(1000);

  const emailInput = page.locator('input[type="email"], input[name*="email" i], input[placeholder*="email" i]').first();
  const passInput = page.locator('input[type="password"], input[name*="password" i], input[placeholder*="password" i]').first();

  if (!(await emailInput.count()) || !(await passInput.count())) {
    blocker("login", "Could not find login email/password inputs.");
    await screenshot(page, "login-inputs-missing");
    return false;
  }

  await emailInput.fill(email);
  await passInput.fill(password);

  const clicked =
    await clickByText(page, "Log in") ||
    await clickByText(page, "Login") ||
    await clickByText(page, "Open Command Desk") ||
    await clickByText(page, "Enter Command Desk") ||
    await clickByText(page, "Sign in");

  if (!clicked) {
    const submit = page.locator('button[type="submit"]').first();
    if (await submit.count()) await submit.click();
    else {
      blocker("login", "Could not find login submit button.");
      await screenshot(page, "login-submit-missing");
      return false;
    }
  }

  await page.waitForTimeout(7000);
  const text = await bodyText(page);

  if (/password/i.test(text) && /email/i.test(text) && !/dashboard|command desk|work|clients/i.test(text)) {
    blocker("login", "Login did not stick.");
    await screenshot(page, "login-did-not-stick");
    return false;
  }

  pass("login", "Login appears to stick.");
  await screenshot(page, "logged-in-dashboard");
  return true;
}

async function testNav(page, label) {
  const clicked = await clickByText(page, label);

  if (!clicked) {
    blocker("navigation", `Could not click ${label}.`);
    return;
  }

  await page.waitForTimeout(2000);
  await checkVisibleText(page, label);
  await checkOverflow(page, label);
  await screenshot(page, `nav-${label}`);
  pass("navigation", `${label} opens.`);
}

async function testQuickAction(page, label, fillValues) {
  await page.goto(`${baseUrl}/dashboard`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(1500);

  const clicked = await clickByText(page, label);
  if (!clicked) {
    blocker("quick action", `Could not open ${label}.`);
    return;
  }

  await page.waitForTimeout(1000);
  const modal = page.locator(".cs-quick-action-modal").first();

  if (!(await modal.count())) {
    blocker("quick action", `${label} did not open quick-action modal.`);
    await screenshot(page, `${label}-modal-missing`);
    return;
  }

  const inputs = modal.locator("input");
  const textareas = modal.locator("textarea");

  for (let i = 0; i < Math.min(fillValues.inputs.length, await inputs.count()); i += 1) {
    await inputs.nth(i).fill(fillValues.inputs[i]);
  }

  for (let i = 0; i < Math.min(fillValues.textareas.length, await textareas.count()); i += 1) {
    await textareas.nth(i).fill(fillValues.textareas[i]);
  }

  const beforeApiErrors = apiErrors.length;

  const saveClicked =
    await modal.getByRole("button", { name: /save and let ai prepare/i }).click({ timeout: 5000 }).then(() => true).catch(() => false) ||
    await modal.getByRole("button", { name: /save/i }).click({ timeout: 5000 }).then(() => true).catch(() => false);

  if (!saveClicked) {
    blocker("quick action", `${label} save button not found.`);
    await screenshot(page, `${label}-save-missing`);
    return;
  }

  await page.waitForTimeout(7000);
  const text = await bodyText(page);

  if (apiErrors.length > beforeApiErrors) {
    blocker("quick action", `${label} caused API error: ${apiErrors.slice(beforeApiErrors).join(" | ")}`);
  }

  if (/backend quick-create|still needs fixing|Saved on screen|Quick create failed/i.test(text)) {
    blocker("quick action", `${label} showed fake/fallback/error wording.`);
  }

  if (/added|saved|prepared|client|work/i.test(text)) {
    pass("quick action", `${label} submitted and app responded.`);
  } else {
    warning("quick action", `${label} response unclear.`);
  }

  await screenshot(page, `quick-${label}`);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

  page.on("console", (msg) => {
    const text = msg.text();

    if (/beforeinstallpromptevent\.preventDefault/i.test(text)) return;

    if (/ReferenceError|TypeError|Churvox UI crash|is not defined|cannot read/i.test(text)) {
      consoleErrors.push(text);
      blocker("console", text);
    }
  });

  page.on("pageerror", (err) => {
    consoleErrors.push(err.message);
    blocker("page crash", err.message);
  });

  page.on("response", async (response) => {
    const url = response.url();
    const status = response.status();

    if (url.includes("/api/") && status >= 400) {
      const line = `${status} ${url}`;
      apiErrors.push(line);

      if (/quick-create/i.test(url)) blocker("backend", `Quick-create API failed: ${line}`);
      else warning("backend", `API returned ${line}`);
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
      textareas: [`Business-ready audit client ${id}. Safe to delete.`],
    });

    await testQuickAction(page, "Add work", {
      inputs: [
        `Audit Work ${id}`,
        `Audit Client ${id}`,
        `1 Audit Street`,
        `Audit Area`,
        `15`,
      ],
      textareas: [`Business-ready audit work ${id}. Safe to delete.`],
    });
  }

  await browser.close();

  const result = {
    generated_at: new Date().toISOString(),
    baseUrl,
    blockers,
    warnings,
    passes,
    apiErrors,
    consoleErrors,
    summary: {
      blockers: blockers.length,
      warnings: warnings.length,
      passes: passes.length,
    },
  };

  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2));

  const existing = fs.existsSync(reportPath) ? fs.readFileSync(reportPath, "utf8") : "# Churvox Business-Ready Audit\n";

  const md = [
    "",
    "---",
    "",
    "# Runtime Browser Audit",
    "",
    `Generated: ${result.generated_at}`,
    "",
    blockers.length
      ? `❌ **RUNTIME NOT READY** — ${blockers.length} blocker(s).`
      : "✅ **RUNTIME CHECK FOUND NO BLOCKERS**.",
    "",
    "## Runtime blockers",
    "",
    blockers.length ? blockers.map((x, i) => `${i + 1}. **${x.area}** — ${x.msg}`).join("\n") : "None.",
    "",
    "## Runtime warnings",
    "",
    warnings.length ? warnings.map((x, i) => `${i + 1}. **${x.area}** — ${x.msg}`).join("\n") : "None.",
    "",
    "## Runtime passes",
    "",
    passes.map((x, i) => `${i + 1}. **${x.area}** — ${x.msg}`).join("\n"),
    "",
    "## Screenshots",
    "",
    "`business-ready-audit/screenshots`",
    "",
  ].join("\n");

  fs.writeFileSync(reportPath, existing + md);
  console.log(md);

  if (blockers.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
