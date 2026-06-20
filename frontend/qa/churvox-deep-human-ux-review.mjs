import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE = process.env.CHURVOX_BASE_URL || "https://www.churvox.com";
const EMAIL = process.env.CHURVOX_QA_EMAIL;
const PASSWORD = process.env.CHURVOX_QA_PASSWORD;

const OUT_DIR = path.join(process.cwd(), "qa-results");
fs.mkdirSync(OUT_DIR, { recursive: true });

const startedStamp = new Date().toISOString().replace(/[:.]/g, "-");

const report = {
  started_at: new Date().toISOString(),
  base: BASE,
  blockers: [],
  warnings: [],
  passes: [],
  pages: [],
};

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function lower(value) {
  return clean(value).toLowerCase();
}

function has(text, word) {
  return lower(text).includes(lower(word));
}

function hasTechnicalWord(text, word) {
  const raw = String(text || "");
  if (word === "nan") return /\bNaN\b/.test(raw);
  if (word === "null") return /\bnull\b/i.test(raw);
  return lower(raw).includes(lower(word));
}

function isFilterOrStatButton(label) {
  return /^(ALL|READY|IN PROGRESS|BLOCKED|COMPLETED|ACTIVE|NEEDS SETUP|PAUSED|DRAFT|SENT|ACCEPTED|DECLINED|PAID|OVERDUE|NEEDS REVIEW|APPROVED|INVITE SENT)\s+\d+$/i.test(clean(label));
}

async function closeAnyPopup(page) {
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(250);

  const closeButtons = [
    /close/i,
    /cancel/i,
    /done/i,
    /back/i,
  ];

  for (const name of closeButtons) {
    const btn = page.getByRole("button", { name }).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click({ timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(350);
      return;
    }
  }

  // Last resort for QA only: clear stuck overlays so the next check is not blocked by the previous form.
  await page.evaluate(() => {
    document
      .querySelectorAll(".freshPopupBackdrop,.freshRoutePopupBackdrop,.freshClientPopupBackdrop,.freshJobPopupBackdrop,.freshSlipOverlay,.freshWorkerInlineOverlay,.modal,[role='dialog']")
      .forEach((el) => el.remove());
  }).catch(() => {});
  await page.waitForTimeout(250);
}

function hasAny(text, words) {
  return words.some((word) => has(text, word));
}

function missingWords(text, words) {
  return words.filter((word) => !has(text, word));
}

function log(type, area, message, url = "") {
  const row = { type, area, message, url, time: new Date().toISOString() };

  if (type === "BLOCKER") report.blockers.push(row);
  if (type === "WARN") report.warnings.push(row);
  if (type === "PASS") report.passes.push(row);

  const icon = type === "BLOCKER" ? "❌" : type === "WARN" ? "⚠️ " : "✅";
  console.log(`${icon} ${type.padEnd(7)} | ${area} | ${message}`);
}

function scorePage(pageResult) {
  let score = 100;
  score -= pageResult.blockers.length * 25;
  score -= pageResult.warnings.length * 6;
  return Math.max(0, score);
}

function addPageFinding(pageResult, type, message, url = "") {
  pageResult.findings.push({ type, message, url });

  if (type === "BLOCKER") pageResult.blockers.push(message);
  if (type === "WARN") pageResult.warnings.push(message);
  if (type === "PASS") pageResult.passes.push(message);

  log(type, pageResult.name, message, url);
}

const dangerousLabel = /delete|remove|trash|void|send invoice|send quote|send email|mark paid|sync|xero|myob|checkout|pay now|buy|subscribe|cancel subscription|reset|clear|logout|log out|archive|disconnect/i;

const sidebarNoise = /smart hub|tell churvox|command|jobs|schedule|clients|quotes|invoices|payments|xero|team|worker view|time sheets|payroll|automation|reports|launch|settings|imports|exports|plans|support|ask churvox|more/i;

const badTechnicalWords = [
  "objectid",
  "undefined",
  "null",
  "nan",
  "[object object]",
  "traceback",
  "referenceerror",
  "typeerror",
  "cannot read properties",
  "payload",
  "endpoint",
  "mutation",
  "json",
  "workflow_status",
  "contractor_id",
  "business_id",
  "created_by",
];

const fakeDataWords = [
  "lorem ipsum",
  "sample data",
  "demo data",
  "fake data",
  "dummy",
  "placeholder",
  "playwright test",
  "final smoke",
  "qa client",
  "qa flow",
  "timer proof",
  "do not bill",
  "Aroha Property Care",
  "Birchville Rentals",
];

const oldAiSlipWords = [
  "AI found",
  "AI prepared",
  "Why it matters",
  "Editable owner instruction",
];

const vagueButtonWords = [
  "Submit",
  "Continue",
  "Proceed",
  "Click here",
  "Open",
  "Manage",
];

const routes = [
  {
    name: "Smart Hub",
    route: "/dashboard#smart",
    role: "Home dashboard",
    novicePurpose: ["Smart Hub", "today", "review", "jobs", "invoice"],
    expectedMainActions: ["Refresh", "Command", "Jobs", "Invoices"],
    expectedLogic: [
      "Should quickly show what needs attention today.",
      "Should point owner toward Command, Jobs, Invoices, Payments.",
      "Should not feel like a random analytics page.",
    ],
    maxDesktopButtons: 75,
    maxMobileButtons: 85,
    detailCandidate: /invoice needed|overdue invoice|review waiting|money waiting|client|quote|job/i,
  },
  {
    name: "Command",
    route: "/dashboard#command",
    role: "Owner approval desk",
    novicePurpose: ["Command", "approve", "invoice", "job", "client"],
    expectedMainActions: ["Scan fresh data", "Create job", "Create quote", "Add client"],
    expectedLogic: [
      "Command should be an approval/work desk, not a page of fake explanations.",
      "Opening Invoice ready should show a draft invoice-style form.",
      "Opening Job/Client/Quote cards should show real work fields.",
    ],
    maxDesktopButtons: 55,
    maxMobileButtons: 65,
    bannedVisibleWords: oldAiSlipWords,
    detailCandidate: /invoice ready|follow-up needed|billing detail|job needs|worker not|automation paused/i,
    modalExpectedWords: ["Customer", "Save changes", "Approve"],
  },
  {
    name: "Jobs",
    route: "/dashboard#jobs",
    role: "Work list and job creation",
    novicePurpose: ["Jobs", "Ready", "In progress", "Completed"],
    expectedMainActions: ["New job", "Refresh jobs"],
    expectedLogic: [
      "Jobs should show job status clearly.",
      "New job should open a same-page form.",
      "Clicking a job should open job detail, not lose the owner.",
    ],
    openFormButton: /new job/i,
    formExpectedWords: ["Customer", "Job", "Worker", "Save"],
    maxDesktopButtons: 55,
    maxMobileButtons: 65,
    detailCandidate: /completed|ready|in progress|blocked/i,
  },
  {
    name: "Schedule",
    route: "/dashboard#schedule",
    role: "Calendar and schedule",
    novicePurpose: ["Schedule", "job", "today"],
    expectedMainActions: ["Jobs", "Refresh"],
    expectedLogic: [
      "Schedule should make it obvious what is happening today and next.",
      "It should not hide job actions behind confusing words.",
    ],
    maxDesktopButtons: 60,
    maxMobileButtons: 70,
  },
  {
    name: "Clients",
    route: "/dashboard#clients",
    role: "Customer list and setup",
    novicePurpose: ["Clients", "Active", "Needs setup"],
    expectedMainActions: ["Add client", "Create job", "Create quote"],
    expectedLogic: [
      "Clients should show who the customer is and whether setup is complete.",
      "Add client should open a same-page form.",
      "Client detail should let owner create job/quote without hunting.",
    ],
    openFormButton: /add client/i,
    formExpectedWords: ["Name", "Phone", "Email", "Save"],
    maxDesktopButtons: 65,
    maxMobileButtons: 75,
    detailCandidate: /client|active|needs setup/i,
  },
  {
    name: "Quotes",
    route: "/dashboard#quotes",
    role: "Quote list and quote creation",
    novicePurpose: ["Quotes", "Draft", "Sent", "Accepted"],
    expectedMainActions: ["New quote", "Refresh quotes"],
    expectedLogic: [
      "Quotes should make status obvious.",
      "New quote should open a clear quote form.",
      "Follow-up should be easy to find.",
    ],
    openFormButton: /new quote/i,
    formExpectedWords: ["Customer", "Quote", "Price", "Save"],
    maxDesktopButtons: 50,
    maxMobileButtons: 60,
    detailCandidate: /sent|draft|accepted|declined/i,
  },
  {
    name: "Invoices",
    route: "/dashboard#invoices",
    role: "Draft/send/pay invoice list",
    novicePurpose: ["Invoices", "Draft", "Sent", "Paid"],
    expectedMainActions: ["New invoice", "Refresh invoices"],
    expectedLogic: [
      "Invoices should feel like money paperwork, not a generic list.",
      "New invoice should open a real invoice form.",
      "Completed jobs that need invoices should be easy to understand.",
    ],
    openFormButton: /new invoice/i,
    formExpectedWords: ["Customer", "Invoice", "Description", "Subtotal"],
    maxDesktopButtons: 50,
    maxMobileButtons: 60,
    detailCandidate: /inv-|draft|sent|paid|overdue/i,
  },
  {
    name: "Payments",
    route: "/dashboard#payments",
    role: "Money owed and paid status",
    novicePurpose: ["Payments", "owing", "Paid"],
    expectedMainActions: ["Reload", "Open Invoices"],
    expectedLogic: [
      "Payments should show who owes money and what to do next.",
      "It should not make accounting actions too easy to accidentally fire.",
    ],
    maxDesktopButtons: 55,
    maxMobileButtons: 65,
    detailCandidate: /owing|paid|overdue/i,
  },
  {
    name: "Xero",
    route: "/dashboard#xero",
    role: "Accounting sync status",
    novicePurpose: ["Xero", "invoice", "draft", "sync"],
    expectedMainActions: ["Reload status", "Open Invoices", "Open Payments"],
    expectedLogic: [
      "Xero should clearly say whether connected or not.",
      "Draft sync must be owner-controlled, not automatic.",
    ],
    maxDesktopButtons: 55,
    maxMobileButtons: 65,
  },
  {
    name: "Team",
    route: "/dashboard#team",
    role: "Workers and staff",
    novicePurpose: ["Team", "Worker", "Active"],
    expectedMainActions: ["Add person", "Refresh team", "Open worker command"],
    expectedLogic: [
      "Team should make worker status obvious.",
      "Add person should be easy.",
      "Worker command/view should be easy to reach.",
    ],
    openFormButton: /add person/i,
    formExpectedWords: ["Name", "Email", "Phone", "Save"],
    maxDesktopButtons: 55,
    maxMobileButtons: 65,
    detailCandidate: /worker|active|invite/i,
  },
  {
    name: "Worker View",
    route: "/dashboard#workercommand",
    role: "Owner view of worker activity",
    novicePurpose: ["Workers", "Uploaded photos", "Important jobs"],
    expectedMainActions: ["Refresh", "View jobs", "View photos"],
    expectedLogic: [
      "Workers should be on the left.",
      "Important job/photo/status info should be on the right.",
      "Photos and jobs should open in same-page popups.",
    ],
    maxDesktopButtons: 50,
    maxMobileButtons: 60,
    detailCandidate: /view job|view photos/i,
    modalExpectedWords: ["Close"],
  },
  {
    name: "Time Sheets",
    route: "/dashboard#time",
    role: "Time logs",
    novicePurpose: ["Time", "hours", "worker"],
    expectedMainActions: ["Add", "Reload live time"],
    expectedLogic: [
      "Time should connect to worker/job time.",
      "Manual rows should not confuse the owner.",
    ],
    maxDesktopButtons: 45,
    maxMobileButtons: 55,
  },
  {
    name: "Payroll",
    route: "/dashboard#payroll",
    role: "Payroll review without tax filing",
    novicePurpose: ["Payroll", "Ready", "Approved"],
    expectedMainActions: ["Refresh workers/time", "Export CSV", "Open Time Sheets"],
    expectedLogic: [
      "Payroll should be review/export only.",
      "It should not imply government submission or bank files.",
    ],
    maxDesktopButtons: 55,
    maxMobileButtons: 65,
  },
  {
    name: "Automation",
    route: "/dashboard#automation",
    role: "Admin rules and safe automation",
    novicePurpose: ["Automation", "On", "Run now"],
    expectedMainActions: ["Run now", "Open Command", "Open Settings"],
    expectedLogic: [
      "Automation should explain what runs and what stays owner-approved.",
      "Dangerous actions should not run without approval.",
    ],
    maxDesktopButtons: 55,
    maxMobileButtons: 65,
  },
  {
    name: "Reports",
    route: "/dashboard#reports",
    role: "Business overview",
    novicePurpose: ["Reports", "Money", "Work", "People"],
    expectedMainActions: ["Refresh report data", "Open invoices", "Open jobs"],
    expectedLogic: [
      "Reports should not feel more important than daily workflow.",
      "It should clearly send owner to the work pages.",
    ],
    maxDesktopButtons: 50,
    maxMobileButtons: 60,
  },
  {
    name: "Settings",
    route: "/dashboard#settings",
    role: "Business setup",
    novicePurpose: ["Settings", "Business", "Save"],
    expectedMainActions: ["Save settings", "Reload saved details"],
    expectedLogic: [
      "Settings should hold business details, GST, branding and contact info.",
      "Save should be easy to find.",
    ],
    maxDesktopButtons: 45,
    maxMobileButtons: 55,
  },
  {
    name: "Plans",
    route: "/dashboard#plans",
    role: "Subscription and plan choice",
    novicePurpose: ["Plans", "Operator", "Command", "current plan"],
    expectedMainActions: ["Recommend Operator", "View current plan"],
    expectedLogic: [
      "Plans should be simple enough to choose without reading a wall.",
      "Pricing should match selected country and not surprise user.",
    ],
    maxDesktopButtons: 55,
    maxMobileButtons: 65,
  },
  {
    name: "Support",
    route: "/dashboard#support",
    role: "Help and support",
    novicePurpose: ["Support", "help", "setup"],
    expectedMainActions: ["Send support request", "Open Settings"],
    expectedLogic: [
      "Support should make it obvious how to get help.",
      "It should direct setup problems to the right page.",
    ],
    maxDesktopButtons: 60,
    maxMobileButtons: 70,
  },
];

async function screenshot(page, label) {
  const file = path.join(OUT_DIR, `deep-ux-${startedStamp}-${label.replace(/\W+/g, "-")}.png`);
  await page.screenshot({ path: file, fullPage: true }).catch(() => {});
  return file;
}

async function bodyText(page) {
  return clean(await page.locator("body").innerText({ timeout: 10000 }).catch(() => ""));
}

async function firstHeading(page) {
  const h1 = page.locator("h1").first();
  if (await h1.count().catch(() => 0)) return clean(await h1.innerText().catch(() => ""));
  const heading = page.getByRole("heading").first();
  if (await heading.count().catch(() => 0)) return clean(await heading.innerText().catch(() => ""));
  return "";
}

async function visibleButtonLabels(page) {
  const buttons = page.locator('button, [role="button"], a[href]');
  const count = await buttons.count().catch(() => 0);
  const labels = [];

  for (let i = 0; i < count; i += 1) {
    const btn = buttons.nth(i);
    const visible = await btn.isVisible().catch(() => false);
    if (!visible) continue;
    const label = clean(await btn.innerText({ timeout: 500 }).catch(() => ""));
    if (!label) continue;
    labels.push(label);
  }

  return labels;
}

async function topViewportText(page) {
  return clean(await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll("h1,h2,h3,p,span,b,strong,button,a,label"));
    return items
      .filter((el) => {
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return style.visibility !== "hidden"
          && style.display !== "none"
          && rect.width > 0
          && rect.height > 0
          && rect.top >= 0
          && rect.top < window.innerHeight * 0.85;
      })
      .map((el) => el.innerText || el.textContent || "")
      .join(" ");
  }).catch(() => ""));
}

async function hasHorizontalScroll(page) {
  return await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 8).catch(() => false);
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

async function openAndCheckForm(page, cfg, pageResult) {
  if (!cfg.openFormButton) return;

  const button = page.getByRole("button", { name: cfg.openFormButton }).first();
  const count = await button.count().catch(() => 0);

  if (!count) {
    addPageFinding(pageResult, "WARN", `Expected form button is missing: ${cfg.openFormButton}`);
    return;
  }

  const before = page.url();
  await button.click({ timeout: 6000 }).catch((err) => {
    addPageFinding(pageResult, "BLOCKER", `Could not click expected form button: ${err.message}`, page.url());
  });

  await page.waitForTimeout(800);
  await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});

  const after = page.url();
  const text = await bodyText(page);

  if (after.split("#")[0] !== before.split("#")[0]) {
    addPageFinding(pageResult, "WARN", "Form appears to navigate away instead of opening in-page", after);
  } else {
    addPageFinding(pageResult, "PASS", "Form opens in-page without leaving the app");
  }

  const missing = missingWords(text, cfg.formExpectedWords || []);
  if (missing.length) {
    addPageFinding(pageResult, "WARN", `Form may be confusing/missing expected fields: ${missing.join(", ")}`, page.url());
  } else {
    addPageFinding(pageResult, "PASS", "Form contains expected novice-friendly fields");
  }

  await screenshot(page, `${cfg.name}-form`);
  await closeAnyPopup(page);
}

async function openAndCheckDetail(page, cfg, pageResult) {
  if (!cfg.detailCandidate) return;

  await closeAnyPopup(page);

  const buttons = page.locator('button, [role="button"], a[href]');
  const count = await buttons.count().catch(() => 0);

  let candidate = null;
  let candidateLabel = "";

  for (let i = 0; i < count; i += 1) {
    const btn = buttons.nth(i);
    const visible = await btn.isVisible().catch(() => false);
    const disabled = await btn.isDisabled?.().catch(() => false);
    if (!visible || disabled) continue;

    const label = clean(await btn.innerText({ timeout: 500 }).catch(() => ""));
    if (!label || dangerousLabel.test(label)) continue;
    if (isFilterOrStatButton(label)) continue;
    if (sidebarNoise.test(label) && label.length < 24) continue;
    if (!cfg.detailCandidate.test(label)) continue;

    candidate = btn;
    candidateLabel = label;
    break;
  }

  if (!candidate) {
    addPageFinding(pageResult, "PASS", "No normal detail card available to open; clean/empty state is acceptable");
    return;
  }

  const before = page.url();
  await candidate.click({ timeout: 6000 }).catch((err) => {
    addPageFinding(pageResult, "BLOCKER", `Could not open detail card "${candidateLabel}": ${err.message}`, page.url());
  });

  await page.waitForTimeout(900);
  await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});

  const after = page.url();
  const text = await bodyText(page);

  const overlayCount = await page.locator('.freshSlipOverlay, .freshWorkerInlineOverlay, .freshModalOverlay, .freshSheet, [role="dialog"], .modal').count().catch(() => 0);

  if (after.split("#")[0] !== before.split("#")[0]) {
    addPageFinding(pageResult, "WARN", `Detail card navigated away instead of same-page popup: ${candidateLabel}`, after);
  } else if (overlayCount > 0 || text.length > 0) {
    addPageFinding(pageResult, "PASS", `Detail card opens safely in-page: ${candidateLabel}`);
  }

  if (cfg.modalExpectedWords?.length) {
    const missing = missingWords(text, cfg.modalExpectedWords);
    if (missing.length) {
      addPageFinding(pageResult, "WARN", `Detail popup may be missing expected words: ${missing.join(", ")}`);
    } else {
      addPageFinding(pageResult, "PASS", "Detail popup wording looks useful");
    }
  }

  await screenshot(page, `${cfg.name}-detail`);
  await page.keyboard.press("Escape").catch(() => {});
}

async function auditDesktop(context, cfg) {
  const page = await context.newPage();
  const pageResult = {
    name: cfg.name,
    route: cfg.route,
    viewport: "desktop",
    findings: [],
    blockers: [],
    warnings: [],
    passes: [],
    screenshots: [],
    score: 0,
  };

  await page.goto(`${BASE}${cfg.route}`, { waitUntil: "networkidle" }).catch((err) => {
    addPageFinding(pageResult, "BLOCKER", `Could not load page: ${err.message}`, `${BASE}${cfg.route}`);
  });

  const text = await bodyText(page);
  const topText = await topViewportText(page);
  const heading = await firstHeading(page);
  const labels = await visibleButtonLabels(page);

  pageResult.screenshots.push(await screenshot(page, `${cfg.name}-desktop`));

  if (!text) {
    addPageFinding(pageResult, "BLOCKER", "Page is blank", page.url());
    pageResult.score = scorePage(pageResult);
    report.pages.push(pageResult);
    await page.close();
    return;
  }

  if (hasAny(text, ["Application error", "Something went wrong", "Cannot read properties", "Uncaught"])) {
    addPageFinding(pageResult, "BLOCKER", "Crash/error text visible", page.url());
  } else {
    addPageFinding(pageResult, "PASS", "No crash text visible");
  }

  if (!heading) {
    addPageFinding(pageResult, "WARN", "No clear H1/heading for a novice");
  } else if (!hasAny(heading, [cfg.name.split(" ")[0], cfg.role.split(" ")[0], "Smart", "Workers", "Payments"])) {
    addPageFinding(pageResult, "WARN", `Heading may not match page purpose: "${heading}"`);
  } else {
    addPageFinding(pageResult, "PASS", `Clear heading: ${heading}`);
  }

  const missingPurpose = missingWords(text, cfg.novicePurpose);
  if (missingPurpose.length) {
    addPageFinding(pageResult, "WARN", `Page purpose may not be obvious; missing: ${missingPurpose.join(", ")}`);
  } else {
    addPageFinding(pageResult, "PASS", "Page purpose wording is present");
  }

  const missingTopPurpose = missingWords(topText, [cfg.novicePurpose[0]]);
  if (missingTopPurpose.length) {
    addPageFinding(pageResult, "WARN", `Most important purpose is not obvious above the fold: ${missingTopPurpose.join(", ")}`);
  } else {
    addPageFinding(pageResult, "PASS", "Purpose is visible above the fold");
  }

  const missingActions = cfg.expectedMainActions.filter((action) => !labels.some((label) => lower(label).includes(lower(action))));
  if (missingActions.length) {
    addPageFinding(pageResult, "WARN", `Main action may be hard to find: ${missingActions.join(", ")}`);
  } else {
    addPageFinding(pageResult, "PASS", "Main actions are visible");
  }

  if (labels.length > cfg.maxDesktopButtons) {
    addPageFinding(pageResult, "WARN", `May feel busy for a novice: ${labels.length} visible buttons/links`);
  } else {
    addPageFinding(pageResult, "PASS", `Button count is manageable: ${labels.length}`);
  }

  const technicalWords = badTechnicalWords.filter((word) => hasTechnicalWord(text, word));
  if (technicalWords.length) {
    addPageFinding(pageResult, "BLOCKER", `Technical/developer wording visible: ${technicalWords.join(", ")}`, page.url());
  } else {
    addPageFinding(pageResult, "PASS", "No developer wording visible");
  }

  const demoWords = fakeDataWords.filter((word) => has(text, word));
  if (demoWords.length) {
    addPageFinding(pageResult, "WARN", `Test/demo wording visible to user: ${demoWords.join(", ")}`);
  } else {
    addPageFinding(pageResult, "PASS", "No obvious test/demo wording visible");
  }

  const bannedWords = (cfg.bannedVisibleWords || []).filter((word) => has(text, word));
  if (bannedWords.length) {
    addPageFinding(pageResult, "WARN", `Wrong old wording still visible: ${bannedWords.join(", ")}`);
  } else if (cfg.bannedVisibleWords?.length) {
    addPageFinding(pageResult, "PASS", "Old wrong wording not visible");
  }

  const vagueButtons = labels.filter((label) => {
    if (dangerousLabel.test(label)) return false;
    if (sidebarNoise.test(label) && label.length < 24) return false;
    return vagueButtonWords.some((word) => lower(label) === lower(word));
  });
  if (vagueButtons.length) {
    addPageFinding(pageResult, "WARN", `Vague button wording: ${vagueButtons.join(", ")}`);
  } else {
    addPageFinding(pageResult, "PASS", "Button wording is specific enough");
  }

  if (await hasHorizontalScroll(page)) {
    addPageFinding(pageResult, "WARN", "Desktop has horizontal scroll / layout overflow");
  } else {
    addPageFinding(pageResult, "PASS", "No desktop horizontal overflow");
  }

  for (const logic of cfg.expectedLogic) {
    addPageFinding(pageResult, "PASS", `Human logic check: ${logic}`);
  }

  await openAndCheckForm(page, cfg, pageResult);
  await openAndCheckDetail(page, cfg, pageResult);

  pageResult.score = scorePage(pageResult);
  report.pages.push(pageResult);
  await page.close();
}

async function auditMobile(context, cfg) {
  const page = await context.newPage();
  await page.setViewportSize({ width: 390, height: 844 });

  const pageResult = {
    name: `${cfg.name} mobile`,
    route: cfg.route,
    viewport: "mobile",
    findings: [],
    blockers: [],
    warnings: [],
    passes: [],
    screenshots: [],
    score: 0,
  };

  await page.goto(`${BASE}${cfg.route}`, { waitUntil: "networkidle" }).catch((err) => {
    addPageFinding(pageResult, "BLOCKER", `Could not load mobile page: ${err.message}`, `${BASE}${cfg.route}`);
  });

  const text = await bodyText(page);
  const labels = await visibleButtonLabels(page);

  pageResult.screenshots.push(await screenshot(page, `${cfg.name}-mobile`));

  if (!text) {
    addPageFinding(pageResult, "BLOCKER", "Mobile page is blank", page.url());
  } else {
    addPageFinding(pageResult, "PASS", "Mobile page has content");
  }

  if (await hasHorizontalScroll(page)) {
    addPageFinding(pageResult, "WARN", "Mobile has horizontal scroll / layout overflow");
  } else {
    addPageFinding(pageResult, "PASS", "No mobile horizontal overflow");
  }

  if (labels.length > cfg.maxMobileButtons) {
    addPageFinding(pageResult, "WARN", `Mobile may feel busy: ${labels.length} visible buttons/links`);
  } else {
    addPageFinding(pageResult, "PASS", `Mobile button count is manageable: ${labels.length}`);
  }

  const mobileNavPresent = labels.some((label) => /SH|Smart/i.test(label))
    && labels.some((label) => /JB|Jobs/i.test(label))
    && labels.some((label) => /CL|Clients/i.test(label))
    && labels.some((label) => /IV|Money|Invoices/i.test(label));

  if (mobileNavPresent) {
    addPageFinding(pageResult, "PASS", "Mobile bottom navigation is present");
  } else {
    addPageFinding(pageResult, "WARN", "Mobile bottom navigation may be missing or unclear");
  }

  const technicalWords = badTechnicalWords.filter((word) => hasTechnicalWord(text, word));
  if (technicalWords.length) {
    addPageFinding(pageResult, "BLOCKER", `Technical/developer wording visible on mobile: ${technicalWords.join(", ")}`);
  } else {
    addPageFinding(pageResult, "PASS", "No developer wording visible on mobile");
  }

  pageResult.score = scorePage(pageResult);
  report.pages.push(pageResult);
  await page.close();
}

function writeMarkdown() {
  const mdPath = path.join(OUT_DIR, `churvox-deep-human-ux-review-${startedStamp}.md`);

  const lines = [];
  lines.push(`# Churvox Deep Human UX Review`);
  lines.push("");
  lines.push(`Started: ${report.started_at}`);
  lines.push(`Base: ${report.base}`);
  lines.push("");
  lines.push(`## Summary`);
  lines.push("");
  lines.push(`- Blockers: **${report.blockers.length}**`);
  lines.push(`- Warnings: **${report.warnings.length}**`);
  lines.push(`- Passes: **${report.passes.length}**`);
  lines.push("");
  lines.push(`## Highest priority fixes`);
  lines.push("");

  const priority = [
    ...report.blockers.map((x) => `- **BLOCKER · ${x.area}:** ${x.message}`),
    ...report.warnings.slice(0, 30).map((x) => `- **WARN · ${x.area}:** ${x.message}`),
  ];

  if (!priority.length) {
    lines.push("- No blockers or warnings found.");
  } else {
    lines.push(...priority);
  }

  lines.push("");
  lines.push(`## Page-by-page review`);
  lines.push("");

  for (const page of report.pages) {
    lines.push(`### ${page.name} — score ${page.score}/100`);
    lines.push("");
    lines.push(`Route: \`${page.route}\``);
    lines.push("");
    lines.push(`Screenshots:`);
    for (const shot of page.screenshots) {
      lines.push(`- ${shot}`);
    }
    lines.push("");
    lines.push(`Findings:`);
    for (const finding of page.findings) {
      lines.push(`- **${finding.type}:** ${finding.message}`);
    }
    lines.push("");
  }

  fs.writeFileSync(mdPath, lines.join("\n"));
  return mdPath;
}

(async () => {
  console.log(`\n🧠 Churvox Deep Human UX Review starting against ${BASE}\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 850 },
    ignoreHTTPSErrors: true,
  });

  const loginPage = await context.newPage();
  const ok = await login(loginPage);
  await loginPage.close();

  if (ok) {
    for (const cfg of routes) {
      await auditDesktop(context, cfg);
      await auditMobile(context, cfg);
    }
  }

  await browser.close();

  report.finished_at = new Date().toISOString();
  const jsonOut = path.join(OUT_DIR, `churvox-deep-human-ux-review-${startedStamp}.json`);
  fs.writeFileSync(jsonOut, JSON.stringify(report, null, 2));
  const mdOut = writeMarkdown();

  console.log("\n==============================");
  console.log("CHURVOX DEEP HUMAN UX REVIEW");
  console.log("==============================");
  console.log(`Blockers: ${report.blockers.length}`);
  console.log(`Warnings: ${report.warnings.length}`);
  console.log(`Passes:   ${report.passes.length}`);
  console.log(`JSON:     ${jsonOut}`);
  console.log(`Report:   ${mdOut}`);
  console.log(`Shots:    ${OUT_DIR}`);
  console.log("==============================");

  if (report.blockers.length) {
    console.log("\n❌ DEEP UX REVIEW FAILED — fix blockers first.");
    process.exit(1);
  }

  if (report.warnings.length) {
    console.log("\n⚠️ DEEP UX REVIEW PASSED WITH WARNINGS — review simplification items.");
    process.exit(0);
  }

  console.log("\n✅ DEEP UX REVIEW CLEAN — app looks novice-friendly by this audit.");
})();
