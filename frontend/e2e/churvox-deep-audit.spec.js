const { test, expect } = require("@playwright/test");
const fs = require("fs");
const path = require("path");

const BASE_URL = process.env.CHURVOX_BASE_URL || "https://www.churvox.com";
const EMAIL = process.env.CHURVOX_TEST_EMAIL || "";
const PASSWORD = process.env.CHURVOX_TEST_PASSWORD || "";

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function saveJson(name, data) {
  const dir = path.join(process.cwd(), "test-results");
  ensureDir(dir);
  fs.writeFileSync(path.join(dir, name), JSON.stringify(data, null, 2));
}

function saveText(name, data) {
  const dir = path.join(process.cwd(), "test-results");
  ensureDir(dir);
  fs.writeFileSync(path.join(dir, name), data);
}

function isBadConsoleMessage(message) {
  const text = message.text();

  if (message.type() !== "error") return false;

  const ignored = [
    "favicon",
    "ResizeObserver loop",
    "Failed to load resource: the server responded with a status of 404",
    "Manifest: Line",
  ];

  return !ignored.some((item) => text.includes(item));
}

async function attachAuditCollectors(page, bucket) {
  page.on("console", (message) => {
    if (isBadConsoleMessage(message)) {
      bucket.consoleErrors.push({
        type: message.type(),
        text: message.text(),
        location: message.location(),
      });
    }
  });

  page.on("pageerror", (error) => {
    bucket.pageErrors.push(error.message || String(error));
  });

  page.on("requestfailed", (request) => {
    const url = request.url();

    if (
      url.includes("favicon") ||
      url.includes("chrome-extension") ||
      url.includes("google-analytics")
    ) {
      return;
    }

    bucket.requestFailures.push({
      url,
      method: request.method(),
      failure: request.failure()?.errorText || "request failed",
    });
  });

  page.on("response", (response) => {
    const status = response.status();
    const url = response.url();

    if (status >= 500) {
      bucket.serverErrors.push({
        url,
        status,
      });
    }
  });
}

async function waitForApp(page) {
  await page.waitForLoadState("domcontentloaded", { timeout: 30000 });
  await page.waitForTimeout(1200);
}

async function pageLooksBroken(page) {
  const bodyText = (await page.locator("body").innerText().catch(() => "")).toLowerCase();
  const bodyHtml = await page.locator("body").innerHTML().catch(() => "");

  const badText = [
    "application error",
    "something went wrong",
    "uncaught runtime error",
    "cannot read properties",
    "undefined is not an object",
    "failed to compile",
    "module not found",
    "syntax error",
    "network error",
    "white screen",
  ];

  return {
    blank: bodyHtml.trim().length < 150,
    badTextFound: badText.filter((text) => bodyText.includes(text)),
    bodyTextSample: bodyText.slice(0, 500),
  };
}

async function fillFirstVisible(page, selectors, value) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if ((await locator.count()) && (await locator.isVisible().catch(() => false))) {
      await locator.fill(value);
      return true;
    }
  }
  return false;
}

async function clickFirstVisible(page, selectors) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if ((await locator.count()) && (await locator.isVisible().catch(() => false))) {
      await locator.click();
      return true;
    }
  }
  return false;
}

async function login(page, audit) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await waitForApp(page);

  const emailOk = await fillFirstVisible(page, [
    'input[type="email"]',
    'input[name="email"]',
    'input[placeholder*="email" i]',
    'input[autocomplete="email"]',
  ], EMAIL);

  const passwordOk = await fillFirstVisible(page, [
    'input[type="password"]',
    'input[name="password"]',
    'input[placeholder*="password" i]',
    'input[autocomplete="current-password"]',
  ], PASSWORD);

  if (!emailOk || !passwordOk) {
    throw new Error("Login form fields not found.");
  }

  await clickFirstVisible(page, [
    'button[type="submit"]',
    'button:has-text("Log in")',
    'button:has-text("Login")',
    'button:has-text("Sign in")',
    'button:has-text("Continue")',
  ]);

  await page.waitForTimeout(3500);
  await page.waitForLoadState("domcontentloaded").catch(() => {});

  const currentUrl = page.url();
  const bodyText = await page.locator("body").innerText().catch(() => "");

  audit.login = {
    currentUrl,
    bodyTextSample: bodyText.slice(0, 400),
  };

  if (currentUrl.includes("/login") && /invalid|wrong|error|failed/i.test(bodyText)) {
    throw new Error("Login appears to have failed.");
  }
}

async function collectInternalLinks(page) {
  const links = await page.locator("a[href]").evaluateAll((nodes) =>
    nodes
      .map((node) => node.href)
      .filter(Boolean)
  ).catch(() => []);

  const base = new URL(BASE_URL);
  const clean = new Set();

  for (const href of links) {
    try {
      const url = new URL(href);

      if (url.origin !== base.origin) continue;
      if (url.pathname.includes("logout")) continue;
      if (url.pathname.includes("mailto:")) continue;
      if (url.pathname.includes("tel:")) continue;

      clean.add(url.pathname + url.search);
    } catch {}
  }

  [
    "/dashboard",
    "/operator",
    "/ai",
    "/ai-queue",
    "/jobs",
    "/clients",
    "/quotes",
    "/invoices",
    "/team",
    "/settings",
    "/plans",
  ].forEach((path) => clean.add(path));

  return [...clean].slice(0, 80);
}

test.describe("Churvox deep audit", () => {
  test("public pages load without obvious crashes", async ({ page }, testInfo) => {
    const audit = {
      baseUrl: BASE_URL,
      project: testInfo.project.name,
      pages: [],
      consoleErrors: [],
      pageErrors: [],
      requestFailures: [],
      serverErrors: [],
    };

    await attachAuditCollectors(page, audit);

    const publicPages = ["/", "/login", "/plans", "/privacy", "/terms"];

    for (const route of publicPages) {
      const url = `${BASE_URL}${route}`;
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
      await waitForApp(page);

      const broken = await pageLooksBroken(page);
      await page.screenshot({
        path: `test-results/${testInfo.project.name}-public-${route.replace(/\W+/g, "_") || "home"}.png`,
        fullPage: true,
      }).catch(() => {});

      audit.pages.push({
        route,
        url: page.url(),
        title: await page.title().catch(() => ""),
        broken,
      });

      expect(broken.blank, `${route} should not be blank`).toBeFalsy();
      expect(broken.badTextFound, `${route} should not show crash text`).toEqual([]);
    }

    saveJson(`${testInfo.project.name}-public-audit.json`, audit);

    expect(audit.pageErrors, "No public page runtime errors").toEqual([]);
    expect(audit.serverErrors, "No public 500 responses").toEqual([]);
  });

  test("authenticated owner app crawl and AI Operator audit", async ({ page }, testInfo) => {
    test.skip(!EMAIL || !PASSWORD, "Set CHURVOX_TEST_EMAIL and CHURVOX_TEST_PASSWORD for logged-in audit.");

    const audit = {
      baseUrl: BASE_URL,
      project: testInfo.project.name,
      login: null,
      pages: [],
      ai: {
        foundQueue: false,
        scanClicked: false,
        detailDrawerOpened: false,
        askAiChecked: false,
        notes: [],
      },
      consoleErrors: [],
      pageErrors: [],
      requestFailures: [],
      serverErrors: [],
    };

    await attachAuditCollectors(page, audit);
    await login(page, audit);

    const links = await collectInternalLinks(page);

    for (const route of links) {
      const url = `${BASE_URL}${route}`;

      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
        await waitForApp(page);

        const broken = await pageLooksBroken(page);
        const bodyText = await page.locator("body").innerText().catch(() => "");

        await page.screenshot({
          path: `test-results/${testInfo.project.name}-auth-${route.replace(/\W+/g, "_") || "home"}.png`,
          fullPage: true,
        }).catch(() => {});

        audit.pages.push({
          route,
          url: page.url(),
          title: await page.title().catch(() => ""),
          hasSidebarWords: /smart hub|jobs|clients|quotes|invoices|team|settings|ai/i.test(bodyText),
          broken,
        });

        expect(broken.blank, `${route} should not be blank`).toBeFalsy();
        expect(broken.badTextFound, `${route} should not show crash text`).toEqual([]);
      } catch (error) {
        audit.pages.push({
          route,
          error: error.message,
        });
      }
    }

    const aiCandidateRoutes = [
      "/ai-queue",
      "/operator/ai-queue",
      "/operatoros/ai-queue",
      "/dashboard",
      "/operator",
      "/ai",
    ];

    for (const route of aiCandidateRoutes) {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => null);
      await waitForApp(page).catch(() => null);

      const text = await page.locator("body").innerText().catch(() => "");

      if (/scan business now|approve the work ai prepared|ai queue|ai operator/i.test(text)) {
        audit.ai.foundQueue = true;

        const scanButton = page.getByRole("button", { name: /scan business now/i }).first();
        if ((await scanButton.count()) && (await scanButton.isVisible().catch(() => false))) {
          await scanButton.click();
          audit.ai.scanClicked = true;
          await page.waitForTimeout(4000);
        }

        const reviewButton = page.getByRole("button", { name: /review|details|open/i }).first();
        if ((await reviewButton.count()) && (await reviewButton.isVisible().catch(() => false))) {
          await reviewButton.click();
          await page.waitForTimeout(1000);

          const drawerText = await page.locator("body").innerText().catch(() => "");
          audit.ai.detailDrawerOpened = /exact changes|priority|confidence|risk|approve|reject/i.test(drawerText);
        }

        await page.screenshot({
          path: `test-results/${testInfo.project.name}-ai-operator-audit.png`,
          fullPage: true,
        }).catch(() => {});

        break;
      }
    }

    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => null);
    await waitForApp(page).catch(() => null);

    const askInput = page.locator('input[placeholder*="Who owes" i], input[placeholder*="business" i], input[placeholder*="What should" i]').first();
    if ((await askInput.count()) && (await askInput.isVisible().catch(() => false))) {
      await askInput.fill("What should I do first today?");
      const askButton = page.getByRole("button", { name: /ask ai|ask/i }).first();
      if ((await askButton.count()) && (await askButton.isVisible().catch(() => false))) {
        await askButton.click();
        await page.waitForTimeout(3000);
        audit.ai.askAiChecked = true;
      }
    }

    saveJson(`${testInfo.project.name}-authenticated-audit.json`, audit);

    const markdown = [
      `# Churvox Playwright Deep Audit`,
      ``,
      `Base URL: ${BASE_URL}`,
      `Project: ${testInfo.project.name}`,
      ``,
      `## AI Operator`,
      `- Found queue: ${audit.ai.foundQueue}`,
      `- Scan clicked: ${audit.ai.scanClicked}`,
      `- Detail drawer opened: ${audit.ai.detailDrawerOpened}`,
      `- Ask AI checked: ${audit.ai.askAiChecked}`,
      ``,
      `## Errors`,
      `- Console errors: ${audit.consoleErrors.length}`,
      `- Page errors: ${audit.pageErrors.length}`,
      `- Request failures: ${audit.requestFailures.length}`,
      `- Server errors: ${audit.serverErrors.length}`,
      ``,
      `## Pages crawled`,
      ...audit.pages.map((page) => `- ${page.route}: ${page.error ? `ERROR ${page.error}` : "loaded"}`),
      ``,
    ].join("\n");

    saveText(`${testInfo.project.name}-audit-summary.md`, markdown);

    expect(audit.pageErrors, "No authenticated runtime errors").toEqual([]);
    expect(audit.serverErrors, "No authenticated 500 responses").toEqual([]);
    expect(audit.ai.foundQueue, "AI Queue / Operator area should be findable").toBeTruthy();
  });
});
