const fs = require("fs");
const path = require("path");

const FRONTEND = process.env.CHURVOX_FRONTEND_URL || "https://www.churvox.com";
const EMAIL = process.env.CHURVOX_TEST_EMAIL || "hello@churvox.com";
const PASSWORD = process.env.CHURVOX_TEST_PASSWORD || "TempPass123!";

const routes = [
  { name: "dashboard", path: "/dashboard", expect: ["Smart", "Hub", "Work", "Operator", "Dashboard"] },
  { name: "clients", path: "/clients", expect: ["Client", "Clients"] },
  { name: "jobs", path: "/jobs", expect: ["Job", "Jobs"] },
  { name: "quotes", path: "/quotes", expect: ["Quote", "Quotes"] },
  { name: "invoices", path: "/invoices", expect: ["Invoice", "Invoices"] },
  { name: "team", path: "/team", expect: ["Team", "Worker", "Staff"] },
  { name: "plans", path: "/plans", expect: ["Plan", "Plans", "Operator", "Command"] },
  { name: "settings", path: "/settings", expect: ["Settings", "Business"] },
  { name: "automation", path: "/automation", expect: ["Automation", "Rule"] },
  { name: "payroll", path: "/payroll", expect: ["Payroll", "Timesheet", "Pay"] },
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function safeName(value) {
  return String(value).replace(/[^a-z0-9_-]+/gi, "-").toLowerCase();
}

async function main() {
  let chromium;
  try {
    ({ chromium } = require("playwright"));
  } catch (error) {
    console.error("PLAYWRIGHT_NOT_INSTALLED", error.message);
    process.exit(2);
  }

  const screenshotDir = path.join("audits", "screenshots", "phase172-final-visual");
  ensureDir(screenshotDir);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
  });

  const results = [];
  const findings = [];

  page.on("console", (msg) => {
    const text = msg.text() || "";
    if (
      /Failed to load resource|Refused to apply style|CORS policy|Uncaught|TypeError|ReferenceError|SyntaxError/i.test(text)
    ) {
      findings.push({
        severity: /Refused to apply style|CORS policy|Uncaught|TypeError|ReferenceError|SyntaxError/i.test(text) ? "HIGH" : "MED",
        title: "Browser console issue",
        detail: text.slice(0, 500),
      });
    }
  });

  page.on("pageerror", (error) => {
    findings.push({
      severity: "HIGH",
      title: "Browser page error",
      detail: String(error.message || error).slice(0, 500),
    });
  });

  async function screenshot(label) {
    const file = path.join(screenshotDir, `${safeName(label)}.png`);
    await page.screenshot({ path: file, fullPage: true });
    return file;
  }

  try {
    await page.goto(`${FRONTEND}/login`, { waitUntil: "networkidle", timeout: 45000 });
    await screenshot("01-login");

    const emailInput =
      (await page.$('input[type="email"]')) ||
      (await page.$('input[name="email"]')) ||
      (await page.$('input[placeholder*="email" i]'));

    const passwordInput =
      (await page.$('input[type="password"]')) ||
      (await page.$('input[name="password"]')) ||
      (await page.$('input[placeholder*="password" i]'));

    if (!emailInput || !passwordInput) {
      throw new Error("Login inputs not found on /login");
    }

    await emailInput.fill(EMAIL);
    await passwordInput.fill(PASSWORD);

    const submit =
      (await page.$('button[type="submit"]')) ||
      (await page.$('button:has-text("Login")')) ||
      (await page.$('button:has-text("Sign in")')) ||
      (await page.$('button:has-text("Log in")'));

    if (!submit) {
      throw new Error("Login submit button not found");
    }

    await Promise.all([
      page.waitForLoadState("networkidle", { timeout: 45000 }).catch(() => {}),
      submit.click(),
    ]);

    await page.waitForTimeout(2500);

    const afterLoginUrl = page.url();
    const afterLoginText = (await page.locator("body").innerText({ timeout: 10000 }).catch(() => "")).trim();

    const loginOk =
      !/login/i.test(new URL(afterLoginUrl).pathname) ||
      /dashboard|smart hub|operator|client|job|invoice|quote/i.test(afterLoginText);

    results.push({
      name: "Owner login visual",
      ok: loginOk,
      url: afterLoginUrl,
      detail: loginOk ? "Logged in / app content visible" : "Still appears to be on login",
      screenshot: await screenshot("02-after-login"),
    });

    if (!loginOk) {
      findings.push({
        severity: "HIGH",
        title: "Visual login failed",
        detail: `After submit URL: ${afterLoginUrl}. Body: ${afterLoginText.slice(0, 500)}`,
      });
    }

    for (const route of routes) {
      const url = `${FRONTEND}${route.path}`;
      await page.goto(url, { waitUntil: "networkidle", timeout: 45000 }).catch(async (error) => {
        findings.push({
          severity: "HIGH",
          title: `Route navigation failed: ${route.path}`,
          detail: String(error.message || error).slice(0, 500),
        });
      });

      await page.waitForTimeout(1200);

      const bodyText = (await page.locator("body").innerText({ timeout: 10000 }).catch(() => "")).trim();
      const shot = await screenshot(`route-${route.name}`);

      const hasExpected = route.expect.some((word) => bodyText.toLowerCase().includes(word.toLowerCase()));
      const blank = bodyText.length < 40;
      const broken = /something went wrong|application error|cannot read properties|network error|failed to fetch/i.test(bodyText);

      const ok = hasExpected && !blank && !broken;

      results.push({
        name: `Route ${route.path}`,
        ok,
        url: page.url(),
        detail: ok ? "Expected page content visible" : `Expected words not found or page looks broken. Body preview: ${bodyText.slice(0, 300)}`,
        screenshot: shot,
      });

      if (!ok) {
        findings.push({
          severity: "HIGH",
          title: `Visual route check failed: ${route.path}`,
          detail: `URL: ${page.url()}. Body preview: ${bodyText.slice(0, 700)}. Screenshot: ${shot}`,
        });
      }
    }
  } finally {
    await browser.close();
  }

  const high = findings.filter((f) => f.severity === "HIGH").length;
  const med = findings.filter((f) => f.severity === "MED").length;
  const low = findings.filter((f) => f.severity === "LOW").length;
  const generated = new Date().toISOString();

  const lines = [];
  lines.push("# Churvox Final Logged-In Visual Browser Check");
  lines.push("");
  lines.push(`Generated: ${generated}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- HIGH: ${high}`);
  lines.push(`- MED: ${med}`);
  lines.push(`- LOW: ${low}`);
  lines.push(`- Frontend: ${FRONTEND}`);
  lines.push(`- Screenshots: \`${screenshotDir}\``);
  lines.push("");
  lines.push("## Checks");
  lines.push("");
  for (const r of results) {
    lines.push(`- ${r.ok ? "✅" : "❌"} **${r.name}** — ${r.detail} — ${r.url} — \`${r.screenshot}\``);
  }
  lines.push("");
  lines.push("## Findings");
  lines.push("");
  if (findings.length) {
    findings.forEach((f, index) => {
      lines.push(`### ${index + 1}. [${f.severity}] ${f.title}`);
      lines.push("");
      lines.push(f.detail);
      lines.push("");
    });
  } else {
    lines.push("No logged-in visual browser blockers found.");
    lines.push("");
  }
  lines.push("## Notes");
  lines.push("");
  lines.push("- This test logs in as the owner and opens the main launch pages.");
  lines.push("- It catches blank screens, obvious browser errors, CSS MIME/CORS-style console failures, and missing page content.");
  lines.push("- It does not manually judge design quality; check screenshots for final visual taste.");
  lines.push("");

  const report = lines.join("\n");
  ensureDir("audits");
  fs.writeFileSync("audits/churvox_final_visual_browser_check_latest.md", report);
  const stamp = generated.replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "_");
  fs.writeFileSync(`audits/churvox_final_visual_browser_check_${stamp}.md`, report);

  console.log(report);

  if (high > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
