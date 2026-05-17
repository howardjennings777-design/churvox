const fs = require("fs");
const path = require("path");

function findRoot() {
  const candidates = [
    process.cwd(),
    path.resolve(process.cwd(), ".."),
    path.resolve(__dirname, "..", ".."),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, "frontend", "build")) || fs.existsSync(path.join(candidate, "build"))) {
      return fs.existsSync(path.join(candidate, "frontend")) ? candidate : path.resolve(candidate, "..");
    }
  }

  return path.resolve(__dirname, "..", "..");
}

let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  console.error("Playwright is not installed. Runtime audit cannot run.");
  process.exit(1);
}

const root = findRoot();
const reportPath = path.join(root, "GO_LIVE_AUDIT_REPORT.md");
const jsonPath = path.join(root, "GO_LIVE_AUDIT_RUNTIME.json");
const screenshotDir = path.join(root, "frontend", "visual-audit", "go-live");
fs.mkdirSync(screenshotDir, { recursive: true });

const baseUrl = process.env.CHURVOX_AUDIT_URL || "http://127.0.0.1:4295";
const email = process.env.CHURVOX_TEST_EMAIL || "";
const password = process.env.CHURVOX_TEST_PASSWORD || "";

const blockers = [];
const warnings = [];
const passes = [];
const consoleErrors = [];
const networkErrors = [];

function addBlocker(area, message) {
  blockers.push({ area, message });
}

function addWarning(area, message) {
  warnings.push({ area, message });
}

function addPass(area, message) {
  passes.push({ area, message });
}

async function clickFirst(page, name) {
  const exactButton = page.getByRole("button", { name: new RegExp(`^${name}$`, "i") }).first();
  if (await exactButton.count()) {
    await exactButton.click({ timeout: 5000 });
    return true;
  }

  const exactLink = page.getByRole("link", { name: new RegExp(`^${name}$`, "i") }).first();
  if (await exactLink.count()) {
    await exactLink.click({ timeout: 5000 });
    return true;
  }

  const text = page.getByText(new RegExp(`^${name}$`, "i")).first();
  if (await text.count()) {
    await text.click({ timeout: 5000 });
    return true;
  }

  return false;
}

async function checkBrokenText(page, area) {
  const body = await page.locator("body").innerText({ timeout: 10000 }).catch(() => "");
  const bad = [
    "undefined",
    "NaN",
    "[object Object]",
    "Quick create failed",
    "backend quick-create still needs fixing",
    "Saved on screen",
    "not implemented",
    "lorem ipsum",
  ];

  for (const phrase of bad) {
    if (body.toLowerCase().includes(phrase.toLowerCase())) {
      addBlocker(area, `Bad visible text found: ${phrase}`);
    }
  }

  if (body.length < 80) {
    addWarning(area, "Page has very little visible text; possible blank or failed route.");
  }
}

async function checkOverflow(page, area) {
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    bodyScrollWidth: document.body.scrollWidth,
    bodyClientWidth: document.body.clientWidth,
  }));

  const overflow = Math.max(metrics.scrollWidth - metrics.clientWidth, metrics.bodyScrollWidth - metrics.bodyClientWidth);
  if (overflow > 24) {
    addWarning(area, `Horizontal overflow detected: ${overflow}px`);
  } else {
    addPass(area, "No major horizontal overflow.");
  }
}

async function saveShot(page, name) {
  const safe = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  await page.screenshot({ path: path.join(screenshotDir, `${safe}.png`), fullPage: true }).catch(() => {});
}

async function login(page) {
  if (!email || !password) {
    addBlocker("login", "CHURVOX_TEST_EMAIL and CHURVOX_TEST_PASSWORD are required for go-live runtime audit.");
    return false;
  }

  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle", timeout: 60000 }).catch(async () => {
    await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 60000 });
  });

  const emailInput = page.locator('input[type="email"], input[name*="email" i], input[placeholder*="email" i]').first();
  const passInput = page.locator('input[type="password"], input[name*="password" i], input[placeholder*="password" i]').first();

  if (!(await emailInput.count()) || !(await passInput.count())) {
    addBlocker("login", "Could not find email/password inputs.");
    await saveShot(page, "login-inputs-missing");
    return false;
  }

  await emailInput.fill(email);
  await passInput.fill(password);

  const loginClicked =
    await clickFirst(page, "Log in") ||
    await clickFirst(page, "Login") ||
    await clickFirst(page, "Open Command Desk") ||
    await clickFirst(page, "Enter Command Desk") ||
    await clickFirst(page, "Sign in");

  if (!loginClicked) {
    const submit = page.locator('button[type="submit"]').first();
    if (await submit.count()) {
      await submit.click();
    } else {
      addBlocker("login", "Could not find login submit button.");
      await saveShot(page, "login-button-missing");
      return false;
    }
  }

  await page.waitForTimeout(6000);

  const body = await page.locator("body").innerText().catch(() => "");
  const stillLogin = /password/i.test(body) && /email/i.test(body) && !/dashboard|command desk|work|clients/i.test(body);

  if (stillLogin) {
    addBlocker("login", "Login did not stick; app still looks like login screen.");
    await saveShot(page, "login-failed");
    return false;
  }

  addPass("login", "Login appears to stick.");
  await saveShot(page, "logged-in");
  return true;
}

async function testPage(page, name) {
  const clicked = await clickFirst(page, name);
  if (!clicked) {
    addBlocker("navigation", `Could not click nav item: ${name}`);
    return;
  }

  await page.waitForTimeout(1800);
  await checkBrokenText(page, name);
  await checkOverflow(page, name);
  await saveShot(page, `page-${name}`);
  addPass("navigation", `Opened ${name}`);
}

async function submitQuickAction(page, actionName, values) {
  await page.goto(`${baseUrl}/dashboard`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(1500);

  const clicked = await clickFirst(page, actionName);
  if (!clicked) {
    addBlocker("quick actions", `Could not open quick action: ${actionName}`);
    return;
  }

  await page.waitForTimeout(800);

  const modal = page.locator(".cs-quick-action-modal").first();
  if (!(await modal.count())) {
    addBlocker("quick actions", `Quick action modal did not open: ${actionName}`);
    await saveShot(page, `quick-${actionName}-modal-missing`);
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

  const beforeErrors = networkErrors.length;

  await modal.getByRole("button", { name: /save and let ai prepare/i }).click({ timeout: 5000 });
  await page.waitForTimeout(6000);

  const body = await page.locator("body").innerText().catch(() => "");

  if (networkErrors.length > beforeErrors) {
    addBlocker("quick actions", `${actionName} caused backend/network error: ${networkErrors.slice(beforeErrors).join(" | ")}`);
  }

  if (/saved on screen|backend quick-create|still needs fixing|quick create failed/i.test(body)) {
    addBlocker("quick actions", `${actionName} used fallback/error wording instead of real backend save.`);
  }

  if (/saved|added|prepared|client|work/i.test(body)) {
    addPass("quick actions", `${actionName} submitted and app responded.`);
  } else {
    addWarning("quick actions", `${actionName} submitted but response was unclear.`);
  }

  await saveShot(page, `quick-${actionName}`);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

  page.on("pageerror", (error) => {
    consoleErrors.push(error.message);
    addBlocker("console", `Page error: ${error.message}`);
  });

  page.on("console", (message) => {
    const text = message.text();

    if (/beforeinstallpromptevent\.preventDefault/i.test(text)) {
      return;
    }

    if (/ReferenceError|TypeError|Churvox UI crash|cannot read|is not defined/i.test(text)) {
      consoleErrors.push(text);
      addBlocker("console", text);
    }
  });

  page.on("response", async (response) => {
    const url = response.url();
    const status = response.status();

    if (url.includes("/api/") && status >= 400) {
      const msg = `${status} ${url}`;
      networkErrors.push(msg);

      if (url.includes("/operator/quick-create")) {
        addBlocker("backend", `Quick-create API failed: ${msg}`);
      } else {
        addWarning("backend", `API returned ${msg}`);
      }
    }
  });

  const loggedIn = await login(page);

  if (loggedIn) {
    const pages = ["Dashboard", "Work", "Clients", "Crew", "Quotes", "Invoices", "Proof & Pay", "Payroll", "Plans", "Settings"];

    for (const pageName of pages) {
      await testPage(page, pageName);
    }

    const suffix = Date.now().toString().slice(-6);

    await submitQuickAction(page, "Add client", {
      inputs: [
        `GO LIVE AUDIT CLIENT ${suffix}`,
        `audit${suffix}@churvox.test`,
        `020000${suffix}`,
        `1 Audit Street`,
        `Audit Area`,
      ],
      textareas: [`Go-live audit test client ${suffix}. Safe to delete.`],
    });

    await submitQuickAction(page, "Add work", {
      inputs: [
        `GO LIVE AUDIT WORK ${suffix}`,
        `GO LIVE AUDIT CLIENT ${suffix}`,
        `1 Audit Street`,
        `Audit Area`,
        `10`,
      ],
      textareas: [`Go-live audit test work ${suffix}. Safe to delete.`],
    });
  }

  await browser.close();

  const result = {
    generated_at: new Date().toISOString(),
    baseUrl,
    blockers,
    warnings,
    passes,
    consoleErrors,
    networkErrors,
    summary: {
      blocker_count: blockers.length,
      warning_count: warnings.length,
      pass_count: passes.length,
    },
  };

  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2));

  const existing = fs.existsSync(reportPath) ? fs.readFileSync(reportPath, "utf8") : "# Churvox no-bullshit go-live audit\n";

  const runtimeMd = [
    "",
    "---",
    "",
    "# Runtime browser audit",
    "",
    `Generated: ${result.generated_at}`,
    "",
    blockers.length
      ? `❌ **RUNTIME NOT READY** — ${blockers.length} blocker(s).`
      : "✅ **RUNTIME AUDIT FOUND NO BLOCKERS**.",
    "",
    "## Runtime blockers",
    "",
    blockers.length
      ? blockers.map((item, index) => `${index + 1}. **${item.area}** — ${item.message}`).join("\n")
      : "None.",
    "",
    "## Runtime warnings",
    "",
    warnings.length
      ? warnings.map((item, index) => `${index + 1}. **${item.area}** — ${item.message}`).join("\n")
      : "None.",
    "",
    "## Runtime passes",
    "",
    passes.map((item, index) => `${index + 1}. **${item.area}** — ${item.message}`).join("\n"),
    "",
    "## Screenshots",
    "",
    `Saved to: \`frontend/visual-audit/go-live\``,
    "",
  ].join("\n");

  fs.writeFileSync(reportPath, existing + runtimeMd);

  console.log(runtimeMd);

  if (blockers.length) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
