import { chromium, devices } from "playwright";
import fs from "fs";
import path from "path";

const BASE_URL = process.env.CHURVOX_BASE_URL || "https://www.churvox.com";
const OWNER_EMAIL = process.env.CHURVOX_QA_EMAIL || "";
const OWNER_PASSWORD = process.env.CHURVOX_QA_PASSWORD || "";
const WORKER_EMAIL = process.env.CHURVOX_WORKER_EMAIL || "";
const WORKER_PASSWORD = process.env.CHURVOX_WORKER_PASSWORD || "";
const STAMP = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
const OUT = path.resolve(process.cwd(), "qa-results");
fs.mkdirSync(OUT, { recursive: true });

const report = {
  startedAt: new Date().toISOString(),
  baseUrl: BASE_URL,
  blockers: [],
  warnings: [],
  passes: [],
  screenshots: [],
};

const PUBLIC_ROUTES = [
  "/",
  "/features",
  "/pricing",
  "/login",
  "/signup",
  "/forgot-password",
  "/privacy",
  "/terms",
  "/account-deletion",
];

const OWNER_ROUTES = [
  "/dashboard",
  "/plans",
  "/guide",
  "/command-board",
  "/clients-board",
  "/jobs-board",
  "/quotes-board",
  "/invoices-board",
  "/dispatch-board",
  "/team-board",
  "/payroll-board",
  "/settings-board",
  "/support-board",
  "/offline-sync",
];

const FORM_ROUTES = [
  "/clients/new",
  "/jobs/new",
  "/quotes/new",
  "/invoices/new",
];

const WORKER_ROUTES = [
  "/worker/jobs",
  "/worker/ops",
  "/worker/settings",
];

const BAD_TEXT = [
  /Something went wrong loading this page/i,
  /Cannot access .+ before initialization/i,
  /ReferenceError/i,
  /TypeError/i,
  /Minified React error/i,
  /Application error/i,
  /white screen/i,
];

const UNSAFE_CLICK = /(delete|remove|trash|archive|clear|void|refund|send|email|sms|pay now|checkout|stripe|cancel subscription|logout|log out|sign out|mark paid|sync now|import|export|disconnect|reset|permanently)/i;

function urlFor(route) {
  return route.startsWith("http") ? route : new URL(route, BASE_URL).href;
}

function clean(s) {
  return String(s || "").replace(/\s+/g, " ").trim();
}

function safeFileName(s) {
  return clean(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "shot";
}

function add(severity, area, message, url = "") {
  const item = {
    severity,
    area,
    message: clean(message),
    url,
    at: new Date().toISOString(),
  };

  if (severity === "BLOCKER") {
    report.blockers.push(item);
    console.log(`❌ BLOCKER | ${area} | ${item.message}`);
  } else if (severity === "WARN") {
    report.warnings.push(item);
    console.log(`⚠️  WARN    | ${area} | ${item.message}`);
  } else {
    report.passes.push(item);
    console.log(`✅ PASS    | ${area} | ${item.message}`);
  }
}

async function screenshot(page, area) {
  try {
    const file = path.join(OUT, `${Date.now()}-${safeFileName(area)}.png`);
    await page.screenshot({ path: file, fullPage: true });
    report.screenshots.push(file);
  } catch {}
}

async function settle(page) {
  await page.waitForLoadState("domcontentloaded", { timeout: 15000 }).catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(500);
}

function watch(page, area) {
  page.on("pageerror", (err) => {
    add("BLOCKER", `${area} page error`, err.message, page.url());
  });

  page.on("console", (msg) => {
    const text = msg.text();
    if (msg.type() === "error" && !/favicon|ResizeObserver|manifest/i.test(text)) {
      add("WARN", `${area} console`, text, page.url());
    }
  });

  page.on("response", (res) => {
    const status = res.status();
    const u = res.url();

    if (/\.png|\.jpg|\.jpeg|\.svg|\.webp|\.ico|\.css|\.js|fonts\.|google|stripe/i.test(u)) return;

    if (status >= 500) {
      add("BLOCKER", `${area} network`, `${status} ${u}`, page.url());
    } else if (status >= 400 && /\/api\/|grassley-backend|onrender/i.test(u)) {
      add("WARN", `${area} API`, `${status} ${u}`, page.url());
    }
  });
}

async function bodyText(page) {
  return await page.locator("body").innerText({ timeout: 6000 }).catch(() => "");
}

async function health(page, area) {
  const text = await bodyText(page);
  const short = clean(text).slice(0, 900);

  if (!clean(text)) {
    add("BLOCKER", area, "Blank page / no readable body text", page.url());
    await screenshot(page, area);
    return text;
  }

  for (const rx of BAD_TEXT) {
    if (rx.test(text)) {
      add("BLOCKER", area, `Crash text found: ${rx}`, page.url());
      await screenshot(page, area);
      return text;
    }
  }

  if (/Network Error/i.test(text)) {
    add("WARN", area, "Visible Network Error text found on page", page.url());
    await screenshot(page, area);
  }

  add("PASS", area, `Loaded: ${short.slice(0, 140)}`, page.url());
  return text;
}

async function gotoCheck(page, route, area) {
  await page.goto(urlFor(route), { waitUntil: "domcontentloaded", timeout: 30000 }).catch((err) => {
    add("BLOCKER", area, `Could not open ${route}: ${err.message}`, route);
  });

  await settle(page);
  return await health(page, area);
}

async function visible(locator) {
  return await locator.isVisible({ timeout: 800 }).catch(() => false);
}

async function fillFirst(page, selectors, value) {
  for (const sel of selectors) {
    const loc = page.locator(sel).first();
    if ((await loc.count().catch(() => 0)) && (await visible(loc))) {
      await loc.fill(value, { timeout: 5000 }).catch(() => {});
      return true;
    }
  }
  return false;
}

async function fillLabel(page, labels, value) {
  for (const label of labels) {
    const loc = page.getByLabel(label).first();
    if ((await loc.count().catch(() => 0)) && (await visible(loc))) {
      await loc.fill(value, { timeout: 5000 }).catch(() => {});
      return true;
    }
  }

  for (const label of labels) {
    const loc = page.getByPlaceholder(label).first();
    if ((await loc.count().catch(() => 0)) && (await visible(loc))) {
      await loc.fill(value, { timeout: 5000 }).catch(() => {});
      return true;
    }
  }

  return false;
}

async function clickFirst(page, names, area = "click") {
  const roles = ["button", "link"];

  for (const role of roles) {
    for (const name of names) {
      const loc = page.getByRole(role, { name }).first();
      if ((await loc.count().catch(() => 0)) && (await visible(loc))) {
        await loc.scrollIntoViewIfNeeded().catch(() => {});
        await loc.click({ timeout: 7000 });
        add("PASS", area, `Clicked ${role}: ${name}`, page.url());
        return true;
      }
    }
  }

  return false;
}

async function closeOverlays(page) {
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(200);

  for (const name of [/close/i, /done/i, /back/i]) {
    const btn = page.getByRole("button", { name }).first();
    if ((await btn.count().catch(() => 0)) && (await visible(btn))) {
      await btn.click({ timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(200);
      return;
    }
  }
}

async function login(page, email, password, roleName) {
  if (!email || !password) {
    add("WARN", `${roleName} login`, "No credentials supplied, protected feature QA will be skipped");
    return false;
  }

  await gotoCheck(page, "/login", `${roleName} login page`);

  await fillLabel(page, [/email/i], email);
  await fillLabel(page, [/password/i], password);
  await fillFirst(page, [
    'input[type="email"]',
    'input[name*="email" i]',
    'input[placeholder*="email" i]',
  ], email);
  await fillFirst(page, [
    'input[type="password"]',
    'input[name*="password" i]',
    'input[placeholder*="password" i]',
  ], password);

  const submitButton = page.locator('form button[type="submit"], form .cvPublicAuthSubmit').first();
  const hasSubmitButton = await submitButton.count().catch(() => 0);
  if (!hasSubmitButton) {
    add("BLOCKER", `${roleName} login`, "Could not find login form submit button", page.url());
    await screenshot(page, `${roleName}-login-no-button`);
    return false;
  }

  await Promise.all([
    page.waitForResponse((res) => res.url().includes("/api/auth/login"), { timeout: 15000 }).catch(() => null),
    submitButton.click({ timeout: 7000 }),
  ]);

  await page.waitForFunction(
    () => !window.location.pathname.includes("/login"),
    null,
    { timeout: 15000 }
  ).catch(() => {});

  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1000);

  const text = await health(page, `${roleName} after login`);

  if (page.url().includes("/login") && /password|email|login|sign in/i.test(text)) {
    add("BLOCKER", `${roleName} login`, "Login did not leave login page. Check credentials, email verification, or auth redirect.", page.url());
    await screenshot(page, `${roleName}-login-stuck`);
    return false;
  }

  return true;
}

async function selectFirstOptions(page) {
  const selects = page.locator("select");
  const count = await selects.count().catch(() => 0);

  for (let i = 0; i < count; i++) {
    const sel = selects.nth(i);
    if (!(await visible(sel))) continue;

    const options = await sel.locator("option").evaluateAll((opts) =>
      opts.map((o) => ({ value: o.value, text: o.textContent || "" }))
    ).catch(() => []);

    const pick = options.find((o) => o.value && !/select|choose|pick/i.test(o.text));
    if (pick) {
      await sel.selectOption(pick.value).catch(() => {});
    }
  }
}

async function createClient(page) {
  const name = `QA Client ${STAMP}`;
  await gotoCheck(page, "/clients/new", "create client page");

  await fillLabel(page, [/client name/i, /customer name/i, /^name$/i, /business name/i], name);
  await fillLabel(page, [/email/i], `qa.client.${STAMP}@example.com`);
  await fillLabel(page, [/phone/i, /mobile/i], `021${STAMP.slice(-7)}`);
  await fillLabel(page, [/address/i, /street/i], "1 Test Street, Lower Hutt");
  await fillLabel(page, [/notes/i], "QA launch test client created by Playwright.");

  await fillFirst(page, ['input[name*="name" i]'], name);
  await fillFirst(page, ['input[type="email"]'], `qa.client.${STAMP}@example.com`);

  const clicked = await clickFirst(page, [/save/i, /create/i, /add client/i, /submit/i], "create client submit");
  if (!clicked) {
    add("BLOCKER", "create client", "Could not find save/create button");
    await screenshot(page, "create-client-no-submit");
    return name;
  }

  await settle(page);
  const text = await health(page, "create client result");

  if (/required|missing|failed|error/i.test(text) && !text.includes(name)) {
    add("WARN", "create client", "Form may not have saved. Page shows required/missing/error text.", page.url());
    await screenshot(page, "create-client-warning");
  } else {
    add("PASS", "create client", `Attempted test client: ${name}`, page.url());
  }

  return name;
}

async function createJob(page, clientName) {
  const title = `QA Job ${STAMP}`;
  await gotoCheck(page, "/jobs/new", "create job page");

  await fillLabel(page, [/job title/i, /title/i, /service/i, /job name/i], title);
  await fillLabel(page, [/client/i, /customer/i], clientName);
  await fillLabel(page, [/address/i, /location/i, /site/i], "1 Test Street, Lower Hutt");
  await fillLabel(page, [/description/i, /notes/i, /details/i], "QA launch test job created by Playwright.");
  await fillFirst(page, ['input[type="date"]'], new Date().toISOString().slice(0, 10));
  await fillFirst(page, ['input[type="time"]'], "09:00");
  await selectFirstOptions(page);

  const clicked = await clickFirst(page, [/save/i, /create/i, /add job/i, /submit/i], "create job submit");
  if (!clicked) {
    add("BLOCKER", "create job", "Could not find save/create job button");
    await screenshot(page, "create-job-no-submit");
    return title;
  }

  await settle(page);
  const text = await health(page, "create job result");

  if (/required|missing|failed|error/i.test(text) && !text.includes(title)) {
    add("WARN", "create job", "Form may not have saved. Page shows required/missing/error text.", page.url());
    await screenshot(page, "create-job-warning");
  } else {
    add("PASS", "create job", `Attempted test job: ${title}`, page.url());
  }

  return title;
}

async function formSmoke(page, route) {
  await gotoCheck(page, route, `form route ${route}`);
  await selectFirstOptions(page);
  await closeOverlays(page);
}

async function auditSafeButtons(page, route, area, limit = 20) {
  await gotoCheck(page, route, `${area} open`);
  const seen = new Set();

  for (let round = 0; round < limit; round++) {
    await settle(page);

    const all = page.locator('button:not([disabled]), a[href], [role="button"]:not([aria-disabled="true"])');
    const count = Math.min(await all.count().catch(() => 0), 100);

    let picked = null;
    let label = "";

    for (let i = 0; i < count; i++) {
      const el = all.nth(i);
      if (!(await visible(el))) continue;

      const raw = await el.evaluate((node) => {
        return (
          node.innerText ||
          node.getAttribute("aria-label") ||
          node.getAttribute("title") ||
          node.getAttribute("href") ||
          ""
        );
      }).catch(() => "");

      label = clean(raw);
      const key = label.toLowerCase();

      if (!label || seen.has(key) || label.length > 110) continue;
      if (UNSAFE_CLICK.test(label)) continue;

      seen.add(key);
      picked = el;
      break;
    }

    if (!picked) break;

    const before = page.url();

    try {
      await picked.scrollIntoViewIfNeeded().catch(() => {});
      await picked.click({ timeout: 5000 });
      add("PASS", `${area} button`, `Clicked safe control: ${label}`, before);
    } catch (err) {
      add("WARN", `${area} button`, `Could not click "${label}": ${err.message}`, before);
      continue;
    }

    await settle(page);
    await health(page, `${area} after clicking ${label}`);
    await closeOverlays(page);

    const now = page.url();
    const baseNow = now.split("#")[0].split("?")[0];
    const baseRoute = urlFor(route).split("#")[0].split("?")[0];

    if (baseNow !== baseRoute && !now.includes("/login")) {
      await page.goto(urlFor(route), { waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => {});
      await settle(page);
    }
  }

  add("PASS", `${area} buttons`, `Safe visible controls tested: ${seen.size}`, page.url());
}

async function checkLogicText(page) {
  await gotoCheck(page, "/pricing", "pricing logic");
  let text = await bodyText(page);

  for (const wanted of ["Start", "Crew", "Operator", "Command"]) {
    if (!text.includes(wanted)) {
      add("WARN", "pricing logic", `Pricing page missing plan name: ${wanted}`, page.url());
    }
  }

  if (!/14.?day|free trial|no card/i.test(text)) {
    add("WARN", "pricing logic", "Pricing page may be missing clear 14-day free trial/no-card wording", page.url());
  }

  await gotoCheck(page, "/dashboard", "dashboard logic");
  text = await bodyText(page);

  if (!/Smart Hub/i.test(text)) {
    add("WARN", "dashboard logic", "Dashboard may not clearly say Smart Hub", page.url());
  }

  const workerCards = ["CLOCKED IN", "ON JOB", "GAP TIME", "LAST GPS"];
  const upper = text.toUpperCase();
  const missing = workerCards.filter((x) => !upper.includes(x));
  if (missing.length) {
    add("WARN", "boss worker view logic", `Could not see worker time cards on dashboard: ${missing.join(", ")}`, page.url());
  } else {
    add("PASS", "boss worker view logic", "Worker time cards found: CLOCKED IN, ON JOB, GAP TIME, LAST GPS", page.url());
  }
}

async function workerActionFlow(page) {
  await gotoCheck(page, "/worker/jobs", "worker jobs phone page");

  const text = await bodyText(page);
  if (/login|sign in/i.test(text) && page.url().includes("/login")) {
    add("BLOCKER", "worker jobs", "Worker route redirected to login even after worker login attempt", page.url());
    return;
  }

  await clickFirst(page, [/view/i, /details/i, /open/i, /job/i], "worker open job").catch(() => {});
  await settle(page);
  await health(page, "worker job detail");

  const actions = [
    /acknowledge/i,
    /^start$/i,
    /start job/i,
    /pause/i,
    /resume/i,
    /finish/i,
    /complete/i,
  ];

  for (const action of actions) {
    const btn = page.getByRole("button", { name: action }).first();
    if ((await btn.count().catch(() => 0)) && (await visible(btn))) {
      await btn.click({ timeout: 7000 }).catch((err) => {
        add("BLOCKER", "worker action", `Failed clicking ${action}: ${err.message}`, page.url());
      });
      await settle(page);
      await health(page, `worker action ${action}`);
    }
  }
}

async function run() {
  console.log(`\n🚀 Churvox Human Launch QA starting against ${BASE_URL}\n`);

  const browser = await chromium.launch({ headless: true });

  const desktop = await browser.newContext({
    viewport: { width: 1440, height: 950 },
    ignoreHTTPSErrors: true,
  });
  const desktopPage = await desktop.newPage();
  watch(desktopPage, "desktop");

  for (const route of PUBLIC_ROUTES) {
    await gotoCheck(desktopPage, route, `public desktop ${route}`);
  }

  const phonePublic = await browser.newContext({
    ...devices["iPhone 13"],
    ignoreHTTPSErrors: true,
  });
  const phonePublicPage = await phonePublic.newPage();
  watch(phonePublicPage, "phone public");

  for (const route of ["/", "/pricing", "/login", "/signup", "/worker/jobs"]) {
    await gotoCheck(phonePublicPage, route, `public phone ${route}`);
  }

  await phonePublic.close();

  const ownerOk = await login(desktopPage, OWNER_EMAIL, OWNER_PASSWORD, "owner");

  if (ownerOk) {
    for (const route of OWNER_ROUTES) {
      await gotoCheck(desktopPage, route, `owner route ${route}`);
      await auditSafeButtons(desktopPage, route, `owner ${route}`, 16);
    }

    for (const route of FORM_ROUTES) {
      await formSmoke(desktopPage, route);
    }

    const clientName = await createClient(desktopPage);
    await createJob(desktopPage, clientName);
    await checkLogicText(desktopPage);

    const ownerPhone = await browser.newContext({
      ...devices["iPhone 13"],
      ignoreHTTPSErrors: true,
    });
    const ownerPhonePage = await ownerPhone.newPage();
    watch(ownerPhonePage, "owner phone");

    const ownerPhoneOk = await login(ownerPhonePage, OWNER_EMAIL, OWNER_PASSWORD, "owner phone");
    if (ownerPhoneOk) {
      for (const route of ["/dashboard", "/jobs-board", "/clients-board", "/team-board", "/payroll-board", "/settings-board"]) {
        await gotoCheck(ownerPhonePage, route, `owner phone ${route}`);
        await auditSafeButtons(ownerPhonePage, route, `owner phone ${route}`, 10);
      }
    }

    await ownerPhone.close();
  }

  if (WORKER_EMAIL && WORKER_PASSWORD) {
    const workerPhone = await browser.newContext({
      ...devices["iPhone 13"],
      ignoreHTTPSErrors: true,
    });
    const workerPage = await workerPhone.newPage();
    watch(workerPage, "worker phone");

    const workerOk = await login(workerPage, WORKER_EMAIL, WORKER_PASSWORD, "worker");
    if (workerOk) {
      for (const route of WORKER_ROUTES) {
        await gotoCheck(workerPage, route, `worker phone ${route}`);
        await auditSafeButtons(workerPage, route, `worker phone ${route}`, 12);
      }

      await workerActionFlow(workerPage);
    }

    await workerPhone.close();
  } else {
    add("WARN", "worker full flow", "No worker test login supplied, so acknowledge/start/pause/resume/finish could not be fully tested.");
  }

  await desktop.close();
  await browser.close();

  const reportPath = path.join(OUT, `churvox-human-launch-qa-${STAMP}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log("\n==============================");
  console.log("CHURVOX HUMAN LAUNCH QA RESULT");
  console.log("==============================");
  console.log(`Blockers: ${report.blockers.length}`);
  console.log(`Warnings: ${report.warnings.length}`);
  console.log(`Passes:   ${report.passes.length}`);
  console.log(`Report:   ${reportPath}`);
  console.log(`Shots:    ${OUT}`);
  console.log("==============================\n");

  if (report.blockers.length) {
    console.log("❌ NOT LAUNCHABLE YET — paste the blockers above.");
    process.exitCode = 1;
  } else if (report.warnings.length) {
    console.log("⚠️  POSSIBLY LAUNCHABLE — no hard crashes found, but warnings need review.");
  } else {
    console.log("✅ LAUNCHABLE FROM THIS PLAYWRIGHT RUN — no blockers or warnings found.");
  }
}

run().catch((err) => {
  console.error("QA runner crashed:", err);
  process.exitCode = 1;
});
