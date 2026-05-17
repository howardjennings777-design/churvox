const fs = require("fs");
const path = require("path");
const { chromium } = require("@playwright/test");

const BASE_URL = process.env.CHURVOX_AUDIT_URL || "https://www.churvox.com";

const ROUTES = [
  ["/", "public-home"],
  ["/login", "login"],
  ["/dashboard", "dashboard"],
  ["/jobs", "work"],
  ["/clients", "clients"],
  ["/team", "crew"],
  ["/quotes", "quotes"],
  ["/invoices", "invoices"],
  ["/proof", "proof-pay"],
  ["/payroll", "payroll"],
  ["/plans", "plans"],
  ["/settings", "settings"],
];

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 950 },
  { name: "small-laptop", width: 1180, height: 820 },
  { name: "mobile", width: 390, height: 844 },
];

const outDir = path.resolve("visual-audit");
const shotDir = path.join(outDir, "screenshots");
fs.mkdirSync(shotDir, { recursive: true });

function safeName(value) {
  return value.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
}

async function tryLogin(page) {
  const email = process.env.CHURVOX_TEST_EMAIL || "";
  const password = process.env.CHURVOX_TEST_PASSWORD || "";
  const requireLogin = process.env.CHURVOX_AUDIT_REQUIRE_LOGIN === "1";

  if (!email || !password) {
    return {
      attempted: false,
      ok: false,
      required: requireLogin,
      reason: "No CHURVOX_TEST_EMAIL/CHURVOX_TEST_PASSWORD supplied.",
    };
  }

  async function isLoggedIn() {
    await page.goto(`${BASE_URL}/dashboard?logged-audit-check=${Date.now()}`, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    }).catch(() => {});
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1400);

    const url = page.url();
    const authInputs = await page.locator('input[type="email"], input[type="password"]').count().catch(() => 99);
    const authText = await page.locator("body").innerText({ timeout: 3000 }).catch(() => "");

    const looksLikeLogin =
      /\/login|\/signup/i.test(url) ||
      authInputs >= 2 ||
      /start free trial|open command desk|login|log in|sign up/i.test(authText.slice(0, 2500));

    const looksLikeApp =
      /dashboard|jobs|clients|team|quotes|invoices|proof|payroll|plans|settings/i.test(url) &&
      /dashboard|work|clients|crew|quotes|invoices|proof|payroll|settings|approval|command/i.test(authText.toLowerCase());

    return {
      ok: looksLikeApp && !looksLikeLogin,
      url,
      authInputs,
      text: authText.slice(0, 500).replace(/\s+/g, " "),
    };
  }

  async function storeToken(token, extra = {}) {
    await page.goto(`${BASE_URL}/?token-store=${Date.now()}`, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    }).catch(() => {});

    await page.evaluate(({ token, extra }) => {
      try {
        const keys = [
          "token",
          "authToken",
          "access_token",
          "churvox_token",
          "churvox_auth_token",
        ];

        keys.forEach((key) => localStorage.setItem(key, token));

        localStorage.setItem("churvox_user", JSON.stringify(extra.user || extra));
        localStorage.setItem("churvox_role", extra.role || extra.user?.role || "owner");
        localStorage.setItem("churvox_plan", extra.plan || extra.user?.plan || "operator");
        localStorage.setItem("churvox_plan_status", extra.plan_status || "trialing");
      } catch (err) {
        console.warn("Token store failed", err);
      }
    }, { token, extra });
  }

  async function tryDirectBackendLogin() {
    const endpoints = [
      "/api/auth/login",
      "/api/owner/login",
      "/api/admin/login",
      "/auth/login",
      "/owner/login",
      "/admin/login",
    ];

    const backendBases = [
      process.env.CHURVOX_BACKEND_URL || "",
      "https://grassley-backend.onrender.com",
      BASE_URL,
    ].filter(Boolean);

    const payloads = [
      { email, password },
      { username: email, password },
      { email_address: email, password },
    ];

    const attempts = [];

    for (const base of backendBases) {
      for (const endpoint of endpoints) {
        for (const payload of payloads) {
          const url = `${base.replace(/\/$/, "")}${endpoint}`;

          try {
            const response = await page.request.post(url, {
              data: payload,
              headers: { "Content-Type": "application/json" },
              timeout: 15000,
            });

            const status = response.status();
            const raw = await response.text().catch(() => "");
            let json = {};
            try {
              json = raw ? JSON.parse(raw) : {};
            } catch {
              json = {};
            }

            const token =
              json.access_token ||
              json.token ||
              json.jwt ||
              json.id_token ||
              json.data?.access_token ||
              json.data?.token ||
              json.user?.token;

            attempts.push({ url, status, hasToken: Boolean(token), body: raw.slice(0, 180) });

            if (response.ok() && token) {
              await storeToken(token, json);
              return {
                ok: true,
                method: "backend",
                url,
                status,
                token: true,
              };
            }
          } catch (err) {
            attempts.push({ url, error: String(err.message || err).slice(0, 160) });
          }
        }
      }
    }

    return {
      ok: false,
      method: "backend",
      attempts: attempts.slice(-12),
    };
  }

  async function tryUiLogin() {
    try {
      await page.goto(`${BASE_URL}/login?audit-login=${Date.now()}`, {
        waitUntil: "domcontentloaded",
        timeout: 45000,
      }).catch(() => {});
      await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(1000);

      const loginSwitch = page.locator(
        'button:has-text("Login"), button:has-text("Log in"), button:has-text("Already have"), a:has-text("Login"), a:has-text("Log in")'
      ).first();

      if (await loginSwitch.count().catch(() => 0)) {
        await loginSwitch.click({ timeout: 2500 }).catch(() => {});
        await page.waitForTimeout(500);
      }

      const emailInput = page.locator('input[type="email"], input[name*="email" i], input[placeholder*="email" i]').first();
      const passInput = page.locator('input[type="password"], input[name*="password" i], input[placeholder*="password" i]').first();

      await emailInput.waitFor({ timeout: 8000 });
      await passInput.waitFor({ timeout: 8000 });

      await emailInput.fill(email);
      await passInput.fill(password);

      const submit = page.locator(
        'button:has-text("Open Command Desk"), button:has-text("Login"), button:has-text("Log in"), button[type="submit"]'
      ).first();

      await submit.click();
      await page.waitForLoadState("networkidle", { timeout: 12000 }).catch(() => {});
      await page.waitForTimeout(1800);

      const check = await isLoggedIn();
      return {
        ok: check.ok,
        method: "ui",
        check,
      };
    } catch (err) {
      return {
        ok: false,
        method: "ui",
        error: String(err.message || err).slice(0, 240),
      };
    }
  }

  try {
    const ui = await tryUiLogin();
    if (ui.ok) {
      return {
        attempted: true,
        ok: true,
        required: requireLogin,
        reason: "Logged in through UI.",
        method: ui.method,
      };
    }

    const backend = await tryDirectBackendLogin();
    if (backend.ok) {
      const check = await isLoggedIn();
      if (check.ok) {
        return {
          attempted: true,
          ok: true,
          required: requireLogin,
          reason: `Logged in through backend endpoint ${backend.url}.`,
          method: backend.method,
        };
      }

      return {
        attempted: true,
        ok: false,
        required: requireLogin,
        reason: `Backend returned token, but dashboard still did not open. URL: ${check.url}. Text: ${check.text}`,
        ui,
        backend,
      };
    }

    const finalCheck = await isLoggedIn();

    return {
      attempted: true,
      ok: false,
      required: requireLogin,
      reason: `Login did not stick. URL: ${finalCheck.url}. Text: ${finalCheck.text}`,
      ui,
      backend,
    };
  } catch (err) {
    return {
      attempted: true,
      ok: false,
      required: requireLogin,
      reason: String(err.message || err).slice(0, 300),
    };
  }
}

async function runChecks(page, route, viewportName) {
  return await page.evaluate(({ route, viewportName }) => {
    const isVisible = (el) => {
      const style = window.getComputedStyle(el);
      const box = el.getBoundingClientRect();
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity) !== 0 &&
        box.width > 2 &&
        box.height > 2 &&
        box.bottom >= 0 &&
        box.right >= 0 &&
        box.top <= window.innerHeight * 3
      );
    };

    const text = (el) => (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim();

    const problems = [];
    const warnings = [];

    const protectedRoute = !["/", "/login"].includes(route);
    const authInputs = document.querySelectorAll('input[type="email"], input[type="password"]').length;
    const authButtons = Array.from(document.querySelectorAll("button, a"))
      .map((el) => (el.innerText || el.textContent || "").trim().toLowerCase())
      .filter((txt) => txt.includes("login") || txt.includes("log in") || txt.includes("open command desk") || txt.includes("start free trial")).length;

    if (protectedRoute && (location.pathname.includes("login") || authInputs >= 2 || authButtons >= 2)) {
      problems.push({
        type: "not-logged-in",
        detail: "Protected route is showing login/auth UI instead of the real logged-in page.",
      });
    }

    const pageWidthOverflow = document.documentElement.scrollWidth - window.innerWidth;
    if (pageWidthOverflow > 3) {
      problems.push({
        type: "horizontal-page-overflow",
        detail: `Page is ${Math.round(pageWidthOverflow)}px wider than viewport.`,
      });
    }

    const selectors = [
      "h1", "h2", "h3", "p", "span", "strong", "small", "button", "a",
      ".cs-hero", ".cs-stat", ".cs-command-cards article", ".cs-desk", ".cs-workspace",
      ".cs-approval-row", ".cs-row", ".cs-empty", ".cs-plan-addons button", ".cs-sms-packs button",
      ".om-sales-hero-copy", ".om-sales-command-card", ".om-sales-auth"
    ];

    const seen = new Set();
    const els = [];
    selectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        if (!seen.has(el) && isVisible(el)) {
          seen.add(el);
          els.push(el);
        }
      });
    });

    for (const el of els) {
      const box = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      const label = `${el.tagName.toLowerCase()}${el.className ? "." + String(el.className).replace(/\s+/g, ".") : ""}`;
      const value = text(el).slice(0, 120);

      const hasText = value.length > 0;
      const clippedX = el.scrollWidth > el.clientWidth + 3;
      const clippedY = el.scrollHeight > el.clientHeight + 3;
      const overflowHidden = ["hidden", "clip", "auto", "scroll"].includes(style.overflow) ||
        ["hidden", "clip", "auto", "scroll"].includes(style.overflowX) ||
        ["hidden", "clip", "auto", "scroll"].includes(style.overflowY);

      if (hasText && overflowHidden && (clippedX || clippedY)) {
        problems.push({
          type: "text-clipping",
          selector: label,
          text: value,
          detail: `scroll ${el.scrollWidth}x${el.scrollHeight}, client ${el.clientWidth}x${el.clientHeight}`,
        });
      }

      if (hasText && box.width < 38 && value.length > 8) {
        problems.push({
          type: "text-squeezed-too-narrow",
          selector: label,
          text: value,
          detail: `${Math.round(box.width)}px wide`,
        });
      }

      if (el.matches("button, a, .cs-view") && hasText && (box.width < 84 || box.height < 32)) {
        warnings.push({
          type: "small-tap-target",
          selector: label,
          text: value,
          detail: `${Math.round(box.width)}x${Math.round(box.height)}px`,
        });
      }

      if (el.matches(".cs-plan-addons button, .cs-sms-packs button") && box.height > 210) {
        problems.push({
          type: "plan-sms-card-too-tall",
          selector: label,
          text: value,
          detail: `${Math.round(box.height)}px tall`,
        });
      }

      if (el.matches(".cs-stat") && (box.height > 135 || box.width > 230)) {
        problems.push({
          type: "stat-card-too-big",
          selector: label,
          text: value,
          detail: `${Math.round(box.width)}x${Math.round(box.height)}px`,
        });
      }
    }

    const hero = document.querySelector(".cs-hero");
    if (hero && isVisible(hero)) {
      const h = hero.getBoundingClientRect().height;
      const limit = viewportName === "mobile" ? 520 : 300;
      if (h > limit) {
        problems.push({
          type: "hero-too-tall",
          selector: ".cs-hero",
          detail: `${Math.round(h)}px tall, target under ${limit}px`,
        });
      }
    }

    const statBoxes = Array.from(document.querySelectorAll(".cs-stat")).filter(isVisible);
    const headings = Array.from(document.querySelectorAll(".cs-hero h1, .cs-hero p")).filter(isVisible);
    for (const a of statBoxes) {
      const ab = a.getBoundingClientRect();
      for (const b of headings) {
        const bb = b.getBoundingClientRect();
        const overlap = !(ab.right < bb.left || ab.left > bb.right || ab.bottom < bb.top || ab.top > bb.bottom);
        if (overlap) {
          problems.push({
            type: "hero-stat-overlap",
            selector: ".cs-stat overlaps hero text",
            text: text(b).slice(0, 80),
            detail: `stat ${Math.round(ab.left)},${Math.round(ab.top)},${Math.round(ab.width)}x${Math.round(ab.height)} overlaps text ${Math.round(bb.left)},${Math.round(bb.top)},${Math.round(bb.width)}x${Math.round(bb.height)}`,
          });
        }
      }
    }

    const colorTargets = Array.from(document.querySelectorAll(
      ".cs-hero, .cs-hero *, .cs-desk, .cs-desk *, .cs-workspace, .cs-workspace *, .cs-row, .cs-row *, .cs-approval-row, .cs-approval-row *, .cs-plan-addons, .cs-plan-addons *, .cs-sms-packs, .cs-sms-packs *"
    )).filter(isVisible).slice(0, 700);

    for (const el of colorTargets) {
      const value = text(el);
      if (!value) continue;
      const style = window.getComputedStyle(el);
      const color = style.color;
      const bg = style.backgroundColor;
      const label = `${el.tagName.toLowerCase()}${el.className ? "." + String(el.className).replace(/\s+/g, ".") : ""}`;
      const onDarkParent = !!el.closest(".cs-hero, .om-nav");
      const onCreamParent = !!el.closest(".cs-desk, .cs-workspace, .cs-flow, .cs-row, .cs-approval-row, .cs-empty, .cs-plan-addons, .cs-sms-packs");

      if (onDarkParent && /rgb\(13, 11, 10\)|rgb\(23, 18, 15\)/.test(color)) {
        problems.push({
          type: "black-text-on-dark-area",
          selector: label,
          text: value.slice(0, 100),
          detail: `color ${color}, background ${bg}`,
        });
      }

      if (onCreamParent && /rgb\(255, 248, 239\)|rgb\(251, 244, 234\)/.test(color)) {
        problems.push({
          type: "cream-text-on-cream-area",
          selector: label,
          text: value.slice(0, 100),
          detail: `color ${color}, background ${bg}`,
        });
      }
    }

    return {
      route,
      viewportName,
      url: location.href,
      pageTitle: document.title,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      scroll: {
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
      },
      counts: {
        checkedElements: els.length,
        problems: problems.length,
        warnings: warnings.length,
      },
      problems: problems.slice(0, 120),
      warnings: warnings.slice(0, 80),
    };
  }, { route, viewportName });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();

  const loginPage = await context.newPage();
  await loginPage.goto(`${BASE_URL}/login?audit-login=${Date.now()}`, { waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => {});
  const loginResult = await tryLogin(loginPage);

  if (process.env.CHURVOX_AUDIT_REQUIRE_LOGIN === "1" && !loginResult.ok) {
    await loginPage.screenshot({
      path: path.join(shotDir, "login-failed.png"),
      fullPage: true,
    }).catch(() => {});
    await browser.close();

    const failReport = {
      generatedAt: new Date().toISOString(),
      baseUrl: BASE_URL,
      login: loginResult,
      totalProblems: 1,
      routes: [],
    };

    fs.writeFileSync(path.join(outDir, "visual-wording-audit.json"), JSON.stringify(failReport, null, 2));
    fs.writeFileSync(
      path.join(outDir, "visual-wording-audit.md"),
      [
        "# Churvox visual wording / fit audit",
        "",
        "❌ Login required but failed.",
        "",
        `Reason: ${loginResult.reason}`,
        "",
        "Screenshot: screenshots/login-failed.png",
        "",
      ].join("\n")
    );

    console.log("LOGIN REQUIRED BUT FAILED ❌");
    console.log(loginResult.reason);
    console.log(`Report: ${path.join(outDir, "visual-wording-audit.md")}`);
    process.exit(3);
  }

  await loginPage.close();

  const results = [];
  let totalProblems = 0;

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    for (const [route, name] of ROUTES) {
      const url = `${BASE_URL}${route}?visual-audit=${Date.now()}`;
      console.log(`Auditing ${viewport.name} ${route}`);

      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 }).catch((err) => {
        console.log(`Navigation warning for ${route}: ${err.message}`);
      });

      await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(1200);

      const shotName = `${viewport.name}-${safeName(name)}.png`;
      await page.screenshot({
        path: path.join(shotDir, shotName),
        fullPage: true,
      }).catch((err) => {
        console.log(`Screenshot warning ${shotName}: ${err.message}`);
      });

      const audit = await runChecks(page, route, viewport.name);
      audit.screenshot = `screenshots/${shotName}`;
      audit.login = loginResult;
      totalProblems += audit.problems.length;
      results.push(audit);
    }
  }

  await browser.close();

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    login: loginResult,
    totalProblems,
    routes: results,
  };

  fs.writeFileSync(path.join(outDir, "visual-wording-audit.json"), JSON.stringify(report, null, 2));

  const lines = [];
  lines.push(`# Churvox visual wording / fit audit`);
  lines.push(``);
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Base URL: ${BASE_URL}`);
  lines.push(`Login attempted: ${loginResult.attempted}`);
  lines.push(`Login ok: ${loginResult.ok}`);
  lines.push(`Total problems: ${totalProblems}`);
  lines.push(``);
  for (const item of results) {
    const icon = item.problems.length ? "❌" : "✅";
    lines.push(`## ${icon} ${item.viewportName} ${item.route}`);
    lines.push(`Screenshot: ${item.screenshot}`);
    lines.push(`Problems: ${item.problems.length}`);
    lines.push(`Warnings: ${item.warnings.length}`);
    if (item.problems.length) {
      for (const problem of item.problems.slice(0, 12)) {
        lines.push(`- **${problem.type}** ${problem.selector || ""} — ${problem.detail || ""}${problem.text ? ` — "${problem.text}"` : ""}`);
      }
    }
    lines.push(``);
  }

  fs.writeFileSync(path.join(outDir, "visual-wording-audit.md"), lines.join("\n"));

  console.log("");
  console.log("===== VISUAL AUDIT COMPLETE =====");
  console.log(`Report: ${path.join(outDir, "visual-wording-audit.md")}`);
  console.log(`JSON: ${path.join(outDir, "visual-wording-audit.json")}`);
  console.log(`Screenshots: ${shotDir}`);
  console.log(`Total problems: ${totalProblems}`);

  if (totalProblems > 0) {
    process.exitCode = 2;
  }
})();
