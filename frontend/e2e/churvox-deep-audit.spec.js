const fs = require("fs");
const path = require("path");
const { test, expect } = require("@playwright/test");

const CRASH_PATTERNS = [
  "application error",
  "something went wrong",
  "cannot read properties",
  "undefined is not an object",
  "failed to compile",
  "module not found",
  "syntax error",
  "uncaught runtime error",
  "minified react error",
];

const AI_PATHS = ["/ai-queue", "/operator/ai-queue", "/dashboard", "/operator", "/ai"];
const OWNER_PATHS = ["/dashboard", "/ai-queue", "/jobs", "/clients", "/quotes", "/invoices", "/team", "/settings"];
const AI_HINTS = ["Scan business now", "Approve the work AI prepared", "AI Queue", "AI Operator", "AI Intelligence", "Prepare briefing"];
const DRAWER_HINTS = ["Exact changes", "Priority", "Confidence", "Risk", "Approve", "Reject"];

function attachErrorCollectors(page) {
  const errors = { consoleErrors: [], pageErrors: [], requestFailures: [], response500s: [] };
  const ignoreConsole = /(favicon|resizeobserver|manifest)/i;
  const ignoreRequest = /(favicon|analytics|chrome-extension)/i;

  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text() || "";
    if (ignoreConsole.test(text)) return;
    errors.consoleErrors.push(text);
  });

  page.on("pageerror", (err) => {
    errors.pageErrors.push(String(err));
  });

  page.on("requestfailed", (request) => {
    const url = request.url();
    if (ignoreRequest.test(url)) return;
    const failure = request.failure();
    errors.requestFailures.push({ url, errorText: failure?.errorText || "unknown" });
  });

  page.on("response", (response) => {
    if (response.status() >= 500) {
      const url = response.url();
      if (ignoreRequest.test(url)) return;
      errors.response500s.push({ url, status: response.status() });
    }
  });

  return errors;
}

async function assertHealthy(page, label, errors) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(1500);
  const bodyText = (await page.locator("body").innerText()).trim();
  expect(bodyText.length, `${label} body should not be blank`).toBeGreaterThan(0);

  const lower = bodyText.toLowerCase();
  for (const pattern of CRASH_PATTERNS) {
    expect(lower.includes(pattern), `${label} contains crash text: ${pattern}`).toBeFalsy();
  }

  expect(errors.pageErrors.length, `${label} runtime errors: ${JSON.stringify(errors.pageErrors)}`).toBe(0);
  expect(errors.response500s.length, `${label} 500 responses: ${JSON.stringify(errors.response500s)}`).toBe(0);
}

async function writeJson(file, data) {
  await fs.promises.mkdir(path.dirname(file), { recursive: true });
  await fs.promises.writeFile(file, JSON.stringify(data, null, 2));
}

async function fillFirstVisible(page, selectors, value) {
  for (const selector of selectors) {
    const item = page.locator(selector).first();
    if ((await item.count()) && (await item.isVisible().catch(() => false))) {
      await item.fill(value);
      return true;
    }
  }
  return false;
}

async function clickFirstVisible(page, selectors) {
  for (const selector of selectors) {
    const item = page.locator(selector).first();
    if ((await item.count()) && (await item.isVisible().catch(() => false))) {
      await item.click();
      return true;
    }
  }
  return false;
}


test("public audit", async ({ page }, testInfo) => {
  const errors = attachErrorCollectors(page);
  const routes = ["/", "/login", "/plans"];
  const results = [];

  for (const route of routes) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await assertHealthy(page, `Public ${route}`, errors);
    const bodyText = (await page.locator("body").innerText()).trim();
    const shot = `test-results/${testInfo.project.name}-public-${route.replace(/\//g, "_") || "home"}.png`;
    await page.screenshot({ path: shot, fullPage: true });
    results.push({ route, finalUrl: page.url(), textLength: bodyText.length, screenshot: shot });
  }

  const out = {
    project: testInfo.project.name,
    baseURL: BASE,
    auditedAt: new Date().toISOString(),
    results,
    errors,
  };
  await writeJson(path.join(testInfo.config.rootDir, "test-results", `${testInfo.project.name}-public-audit.json`), out);
});

test("owner + AI deep audit", async ({ page }, testInfo) => {
  const email = process.env.CHURVOX_TEST_EMAIL;
  const password = process.env.CHURVOX_TEST_PASSWORD;
  test.skip(!(email && password), "Skipping owner audit because CHURVOX_TEST_EMAIL or CHURVOX_TEST_PASSWORD is missing.");

  const errors = attachErrorCollectors(page);
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);

  const emailFilled = await fillFirstVisible(page, [
    'input[type="email"]',
    'input[name="email"]',
    'input[placeholder*="email" i]',
    'input[autocomplete="email"]',
  ], email);

  const passwordFilled = await fillFirstVisible(page, [
    'input[type="password"]',
    'input[name="password"]',
    'input[placeholder*="password" i]',
    'input[autocomplete="current-password"]',
  ], password);

  expect(emailFilled, "Email input should be found").toBeTruthy();
  expect(passwordFilled, "Password input should be found").toBeTruthy();

  const submitted = await clickFirstVisible(page, [
    'button[type="submit"]',
    'button:has-text("Log in")',
    'button:has-text("Login")',
    'button:has-text("Sign in")',
    'button:has-text("Continue")',
  ]);

  expect(submitted, "Login button should be found").toBeTruthy();
  await page.waitForTimeout(4000);

  const ownerResults = [];
  for (const route of OWNER_PATHS) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await assertHealthy(page, `Owner ${route}`, errors);
    const bodyText = (await page.locator("body").innerText()).trim();
    const shot = `test-results/${testInfo.project.name}-owner-${route.replace(/\//g, "_")}.png`;
    await page.screenshot({ path: shot, fullPage: true });
    ownerResults.push({ route, finalUrl: page.url(), textLength: bodyText.length, screenshot: shot });
  }

  let aiFound = null;
  for (const route of AI_PATHS) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    const bodyText = await page.locator("body").innerText();
    if (AI_HINTS.some((hint) => bodyText.toLowerCase().includes(hint.toLowerCase()))) {
      aiFound = route;
      break;
    }
  }
  expect(aiFound, "Could not find AI Operator area after login").toBeTruthy();

  const aiArea = { route: aiFound, scanClicked: false, drawerDetected: false };
  const scanButton = page.getByRole("button", { name: /scan business now/i });
  if (await scanButton.isVisible().catch(() => false)) {
    await scanButton.click();
    aiArea.scanClicked = true;
    await page.waitForTimeout(3000);
  }

  const reviewButton = page.getByRole("button", { name: /review|details|open/i }).first();
  if (await reviewButton.isVisible().catch(() => false)) {
    await reviewButton.click();
    await page.waitForTimeout(1500);
  }

  const aiBody = await page.locator("body").innerText();
  aiArea.drawerDetected = DRAWER_HINTS.some((hint) => aiBody.toLowerCase().includes(hint.toLowerCase()));
  const aiShot = `test-results/${testInfo.project.name}-ai-area.png`;
  await page.screenshot({ path: aiShot, fullPage: true });
  aiArea.screenshot = aiShot;

  let askAiStatus = "not-visible";
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  const askInput = page.locator("textarea, input").filter({ hasText: /what should i do first today\?/i }).first();
  const genericAskInput = page.locator("textarea, input").first();
  const askButton = page.getByRole("button", { name: /ask ai|ask/i }).first();
  if (await askButton.isVisible().catch(() => false)) {
    const targetInput = (await askInput.count()) > 0 ? askInput : genericAskInput;
    if (await targetInput.isVisible().catch(() => false)) {
      await targetInput.fill("What should I do first today?");
      await askButton.click();
      askAiStatus = "submitted";
      await page.waitForTimeout(1500);
    }
  }

  const ownerOut = {
    project: testInfo.project.name,
    baseURL: BASE,
    auditedAt: new Date().toISOString(),
    ownerResults,
    aiArea,
    askAiStatus,
    errors,
  };
  const root = path.join(testInfo.config.rootDir, "test-results");
  await writeJson(path.join(root, `${testInfo.project.name}-owner-audit.json`), ownerOut);

  const md = `# ${testInfo.project.name} owner audit summary\n\n- AI area route: ${aiArea.route}\n- AI drawer detected: ${aiArea.drawerDetected}\n- Ask AI status: ${askAiStatus}\n- Console errors: ${errors.consoleErrors.length}\n- Page errors: ${errors.pageErrors.length}\n- Request failures: ${errors.requestFailures.length}\n- 500 responses: ${errors.response500s.length}\n`;
  await fs.promises.writeFile(path.join(root, `${testInfo.project.name}-audit-summary.md`), md);
});
