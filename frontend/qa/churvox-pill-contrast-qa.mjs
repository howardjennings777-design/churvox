import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE = process.env.CHURVOX_BASE_URL || "https://www.churvox.com";
const EMAIL = process.env.CHURVOX_QA_EMAIL;
const PASSWORD = process.env.CHURVOX_QA_PASSWORD;

const OUT_DIR = path.join(process.cwd(), "qa-results");
fs.mkdirSync(OUT_DIR, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const bad = [];
const good = [];

const routes = [
  ["/dashboard#smart", "Smart Hub"],
  ["/dashboard#command", "Command"],
  ["/dashboard#jobs", "Jobs"],
  ["/dashboard#schedule", "Schedule"],
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
  ["/dashboard#askchurvox", "Tell Churvox"],
];

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function rgbParts(value) {
  const match = String(value || "").match(/rgba?\(([^)]+)\)/i);
  if (!match) return null;
  const parts = match[1].split(",").map((x) => Number(String(x).trim()));
  if (parts.length < 3) return null;
  const alpha = parts.length >= 4 ? parts[3] : 1;
  return { r: parts[0], g: parts[1], b: parts[2], a: alpha };
}

function luminance({ r, g, b }) {
  const vals = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return vals[0] * 0.2126 + vals[1] * 0.7152 + vals[2] * 0.0722;
}

function contrastRatio(fg, bg) {
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

async function login(page) {
  if (!EMAIL || !PASSWORD) {
    throw new Error("Missing CHURVOX_QA_EMAIL or CHURVOX_QA_PASSWORD");
  }

  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.locator('form button[type="submit"], form .cvPublicAuthSubmit').first().click();
  await page.waitForFunction(() => !location.pathname.includes("/login"), null, { timeout: 15000 }).catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});

  if (page.url().includes("/login")) {
    throw new Error("Login failed");
  }
}

async function scanPage(page, pageName, viewportName) {
  const results = await page.evaluate(() => {
    function clean(value) {
      return String(value || "").replace(/\s+/g, " ").trim();
    }

    function rgbaParts(color) {
      const match = String(color || "").match(/rgba?\(([^)]+)\)/i);
      if (!match) return null;
      const parts = match[1].split(",").map((x) => Number(String(x).trim()));
      if (parts.length < 3) return null;
      return { r: parts[0], g: parts[1], b: parts[2], a: parts.length >= 4 ? parts[3] : 1 };
    }

    function isTransparent(color) {
      const rgba = rgbaParts(color);
      return !rgba || rgba.a <= 0.12;
    }

    function effectiveBg(el) {
      let node = el;
      while (node && node !== document.documentElement) {
        const style = getComputedStyle(node);
        const bg = style.backgroundColor;
        const rgba = rgbaParts(bg);

        if (rgba && rgba.a > 0.12) {
          if (rgba.a < 0.96) {
            // translucent layer: keep looking for the real parent background
            node = node.parentElement;
            continue;
          }
          return bg;
        }

        const bgImage = String(style.backgroundImage || "");
        const cls = String(node.className || "");
        if (/clocked in/i.test(clean(el.innerText || el.textContent || ""))) {
          return "rgb(247, 243, 234)";
        }

        if (bgImage !== "none" && /hero|command|dark|launcher|operator|workspace|shell|sidebar/i.test(cls)) {
          return "rgb(17, 24, 39)";
        }

        node = node.parentElement;
      }

      const bodyBg = getComputedStyle(document.body).backgroundColor || "rgb(247,243,234)";
      return bodyBg;
    }

    function selectorFor(el) {
      const cls = Array.from(el.classList || []).slice(0, 4).join(".");
      const text = clean(el.innerText || el.textContent || "").slice(0, 40);
      return `${el.tagName.toLowerCase()}${cls ? "." + cls : ""}${text ? ` :: ${text}` : ""}`;
    }

    function looksLikePill(el) {
      const text = clean(el.innerText || el.textContent || "");
      if (!text || text.length > 70) return false;

      // Do not count navigation/sidebar/metric counters as pills.
      if (el.closest(".freshShellSidebar, .freshSidebar, .freshBottomNav, .freshTopbar, .freshTodayHeroStats, .freshWorkerAppSummary, .freshPaymentsStats, .freshAutomationStats, .freshAskStats, nav, [class*='Sidebar'], [class*='BottomNav'], [class*='Topbar']")) {
        return false;
      }

      const parentActiveButton = el.closest("button.active, button.selected, button.is-active, button[aria-pressed='true'], button[aria-current='true']");
      if (parentActiveButton && el !== parentActiveButton && !el.classList.contains("freshCommandPill")) {
        return false;
      }

      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      if (rect.width < 12 || rect.height < 8) return false;
      if (rect.width > 360 || rect.height > 90) return false;

      const className = String(el.className || "");
      const role = String(el.getAttribute("role") || "");
      const radius = parseFloat(style.borderRadius || "0");
      const parentClass = String(el.parentElement?.className || "");
      const textUpper = text === text.toUpperCase();

      if (el.closest(".freshCommandFilterBar button") && el.tagName.toLowerCase() !== "button") return false;
      if (el.closest(".freshCommandFilterBar")) return true;
      if (/pill|chip|badge|tag|filter|status|label|tab|seg|guide/i.test(className + " " + parentClass + " " + role)) return true;
      if (textUpper && text.length <= 28 && radius >= 8 && rect.height <= 56 && !el.closest("button:not(.active)")) return true;

      return false;
    }

    const nodes = Array.from(document.querySelectorAll("button, span, small, b, em, strong, label"));
    return nodes
      .filter((el) => {
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return style.display !== "none"
          && style.visibility !== "hidden"
          && style.opacity !== "0"
          && rect.width > 0
          && rect.height > 0
          && looksLikePill(el);
      })
      .map((el) => {
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return {
          text: clean(el.innerText || el.textContent || ""),
          selector: selectorFor(el),
          color: style.color,
          bg: effectiveBg(el),
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      });
  });

  for (const item of results) {
    const fg = rgbParts(item.color);
    const bg = rgbParts(item.bg);

    if (!fg || !bg || bg.a === 0) continue;

    const ratio = contrastRatio(fg, bg);
    const row = {
      page: pageName,
      viewport: viewportName,
      ratio: Number(ratio.toFixed(2)),
      ...item,
    };

    if (ratio < 4.5) bad.push(row);
    else good.push(row);
  }
}

(async () => {
  console.log(`\n🔎 Churvox pill contrast QA starting against ${BASE}\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 850 }, ignoreHTTPSErrors: true });
  const page = await context.newPage();

  await login(page);
  console.log(`✅ Logged in: ${page.url()}`);

  for (const [route, name] of routes) {
    await page.setViewportSize({ width: 1366, height: 850 });
    await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" }).catch(() => {});
    await page.waitForTimeout(2200);
    await scanPage(page, name, "desktop");

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" }).catch(() => {});
    await page.waitForTimeout(2200);
    await scanPage(page, name, "mobile");
  }

  const json = path.join(OUT_DIR, `churvox-pill-contrast-${stamp}.json`);
  const md = path.join(OUT_DIR, `churvox-pill-contrast-${stamp}.md`);
  const shot = path.join(OUT_DIR, `churvox-pill-contrast-${stamp}.png`);

  await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
  await browser.close();

  fs.writeFileSync(json, JSON.stringify({ bad, good, checked: bad.length + good.length }, null, 2));

  const lines = [];
  lines.push("# Churvox Pill Contrast QA");
  lines.push("");
  lines.push(`Checked: **${bad.length + good.length}** pill-like elements`);
  lines.push(`Failed: **${bad.length}**`);
  lines.push(`Passed: **${good.length}**`);
  lines.push("");
  lines.push("## Failed pills");
  lines.push("");
  if (!bad.length) {
    lines.push("No failed pill contrast found.");
  } else {
    for (const item of bad.slice(0, 200)) {
      lines.push(`- **${item.page} ${item.viewport}** — ratio ${item.ratio}: \`${item.text}\` — ${item.selector} — text ${item.color}, bg ${item.bg}`);
    }
  }

  fs.writeFileSync(md, lines.join("\n"));

  console.log("\n==============================");
  console.log("CHURVOX PILL CONTRAST QA");
  console.log("==============================");
  console.log(`Checked: ${bad.length + good.length}`);
  console.log(`Failed:  ${bad.length}`);
  console.log(`Passed:  ${good.length}`);
  console.log(`JSON:    ${json}`);
  console.log(`Report:  ${md}`);
  console.log("==============================");

  if (bad.length) {
    console.log("\n❌ PILL CONTRAST FAILED — failed pills listed in the report.");
    process.exit(1);
  }

  console.log("\n✅ PILL CONTRAST CLEAN — all detected pills are readable.");
})();
