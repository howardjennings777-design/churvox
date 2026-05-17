const fs = require("fs");
const path = require("path");

let chromium;
try {
  ({ chromium } = require("playwright"));
} catch (err) {
  console.log("❌ Playwright cannot be loaded from frontend.");
  console.log(err.message);
  process.exit(1);
}

const EMAIL = process.env.CHURVOX_TEST_EMAIL || "";
const PASSWORD = process.env.CHURVOX_TEST_PASSWORD || "";
const SITE = "https://www.churvox.com";
const BACKEND = "https://grassley-backend.onrender.com";
const OUT = "/workspaces/churvox/LOGIN_DIAGNOSIS_REPORT.md";
const SHOT_DIR = "/workspaces/churvox/business-ready-audit/screenshots";

fs.mkdirSync(SHOT_DIR, { recursive: true });
fs.writeFileSync(OUT, "# Churvox Live Login Diagnosis\n\n");

function line(text = "") {
  fs.appendFileSync(OUT, text + "\n");
  console.log(text);
}

function short(text) {
  return String(text || "").replace(/\s+/g, " ").slice(0, 700);
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(SHOT_DIR, `${name}.png`), fullPage: true }).catch(() => {});
}

async function tryBackendLogin(endpoint) {
  try {
    const res = await fetch(`${BACKEND}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });

    const text = await res.text();
    return { endpoint, status: res.status, ok: res.ok, body: short(text) };
  } catch (err) {
    return { endpoint, status: "FETCH_ERROR", ok: false, body: err.message };
  }
}

(async () => {
  line(`Generated: ${new Date().toISOString()}`);
  line(`Email: ${EMAIL}`);
  line(`Password length: ${PASSWORD.length}`);
  line("");

  if (!EMAIL || !PASSWORD) {
    line("❌ STOP: email or password was not passed into Node.");
    process.exit(0);
  }

  line("## 1. Direct backend login endpoint checks");
  for (const endpoint of ["/api/auth/login", "/api/login", "/api/owner/login", "/api/admin/login", "/auth/login"]) {
    const result = await tryBackendLogin(endpoint);
    line(`- ${endpoint}: ${result.status} ${result.ok ? "✅" : "❌"}`);
    line(`  ${result.body}`);
  }

  line("");
  line("## 2. Browser UI login check");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

  const apiHits = [];
  const consoleHits = [];

  page.on("response", async (res) => {
    const url = res.url();
    const status = res.status();

    if (url.includes("/api/") || url.includes("grassley-backend")) {
      let body = "";
      if (status >= 400) body = await res.text().then(short).catch(() => "");
      apiHits.push(`${status} ${url}${body ? ` — ${body}` : ""}`);
    }
  });

  page.on("console", (msg) => {
    const text = msg.text();
    if (/ReferenceError|TypeError|UI crash|failed|error|unauthorized|forbidden/i.test(text)) consoleHits.push(text);
  });

  await page.goto(`${SITE}/login?login-diagnosis=${Date.now()}`, { waitUntil: "networkidle", timeout: 60000 });
  await shot(page, "login-diagnosis-before");

  const emailInput = page.locator('input[type="email"], input[name*="email" i], input[placeholder*="email" i]').first();
  const passInput = page.locator('input[type="password"], input[name*="password" i], input[placeholder*="password" i]').first();

  line(`Email input count: ${await emailInput.count().catch(() => 0)}`);
  line(`Password input count: ${await passInput.count().catch(() => 0)}`);

  if (!(await emailInput.count()) || !(await passInput.count())) {
    line("❌ Login inputs not found.");
    await shot(page, "login-diagnosis-inputs-missing");
    await browser.close();
    process.exit(0);
  }

  await emailInput.fill(EMAIL);
  await passInput.fill(PASSWORD);

  const form = passInput.locator("xpath=ancestor::form[1]");
  if (await form.count()) {
    line("Submitting the actual login form.");
    await form.evaluate((node) => {
      if (node.requestSubmit) node.requestSubmit();
      else node.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
  } else {
    line("No form found; pressing Enter in password field.");
    await passInput.press("Enter");
  }

  await page.waitForTimeout(8000);
  await shot(page, "login-diagnosis-after");

  const finalUrl = page.url();
  const body = await page.locator("body").innerText({ timeout: 5000 }).catch(() => "");
  const authInputCount = await page.locator('input[type="email"], input[type="password"]').count().catch(() => -1);

  const storage = await page.evaluate(() => {
    const out = {};
    for (const key of Object.keys(localStorage)) {
      const value = localStorage.getItem(key) || "";
      out[key] = value.length > 120 ? `${value.slice(0, 60)}...len=${value.length}` : value;
    }
    return out;
  }).catch(() => ({}));

  const cookies = await page.context().cookies().catch(() => []);

  line("");
  line("## 3. Browser result");
  line(`Final URL: ${finalUrl}`);
  line(`Auth input count after login: ${authInputCount}`);
  line(`Body preview: ${short(body)}`);
  line("");
  line("LocalStorage keys:");
  line(JSON.stringify(storage, null, 2));
  line("");
  line("Cookie names:");
  line(cookies.map((cookie) => `${cookie.name}@${cookie.domain}`).join(", ") || "None");
  line("");

  line("API hits:");
  if (apiHits.length) for (const hit of apiHits) line(`- ${hit}`);
  else line("- No API hits captured.");

  line("");
  line("Console hits:");
  if (consoleHits.length) for (const hit of consoleHits) line(`- ${hit}`);
  else line("- None.");

  const stillLogin =
    /\/login|\/signup/i.test(finalUrl) ||
    authInputCount >= 2 ||
    (/log in|login|password|email/i.test(body.slice(0, 1500)) && !/dashboard|command desk|work|clients/i.test(body));

  line("");
  if (stillLogin) line("❌ VERDICT: Login did not stick.");
  else line("✅ VERDICT: Login appears to stick.");

  await browser.close();
})();
