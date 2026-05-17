const { spawn } = require("child_process");

async function main() {
  let chromium;
  try {
    ({ chromium } = require("playwright"));
  } catch {
    console.log("Playwright not installed in this environment, skipping runtime probe.");
    return;
  }

  const baseUrl = process.env.CHURVOX_AUDIT_URL || "http://127.0.0.1:4173";
  const email = process.env.CHURVOX_TEST_EMAIL || "";
  const password = process.env.CHURVOX_TEST_PASSWORD || "";

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

  const errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    const text = message.text();
    if (/ReferenceError|TypeError|UI crash|cannot read/i.test(text)) errors.push(`console: ${text}`);
  });

  await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 45000 });

  if (email && password) {
    const emailInput = page.locator('input[type="email"], input[name*="email" i], input[placeholder*="email" i]').first();
    const passInput = page.locator('input[type="password"], input[name*="password" i], input[placeholder*="password" i]').first();

    if (await emailInput.count() && await passInput.count()) {
      await emailInput.fill(email);
      await passInput.fill(password);

      const loginButton = page.getByRole("button", { name: /log in|login|open|enter|command/i }).first();
      if (await loginButton.count()) await loginButton.click();

      await page.waitForTimeout(5000);
    } else {
      console.log("Could not find login inputs. Runtime probe will still scan visible buttons.");
    }
  } else {
    console.log("CHURVOX_TEST_EMAIL/PASSWORD not set. Runtime probe will scan current visible page only.");
  }

  const labels = [
    /command desk/i,
    /work/i,
    /clients/i,
    /crew/i,
    /quotes/i,
    /invoices/i,
    /proof/i,
    /payroll/i,
    /plans/i,
    /settings/i,
    /add work/i,
    /add client/i,
    /create quote/i,
    /create invoice/i,
    /approval/i,
    /open/i,
  ];

  for (const label of labels) {
    const button = page.getByRole("button", { name: label }).first();
    if (!(await button.count())) continue;

    try {
      await button.click({ timeout: 3000 });
      await page.waitForTimeout(650);

      const close = page.getByRole("button", { name: /×|close|back/i }).first();
      if (await close.count()) {
        await close.click({ timeout: 2000 }).catch(() => {});
        await page.waitForTimeout(250);
      }
    } catch (err) {
      errors.push(`click ${label}: ${err.message}`);
    }
  }

  await browser.close();

  if (errors.length) {
    console.error("RUNTIME BUTTON PROBE FOUND PROBLEMS:");
    for (const error of errors.slice(0, 50)) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }

  console.log("Runtime button probe passed ✅");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
