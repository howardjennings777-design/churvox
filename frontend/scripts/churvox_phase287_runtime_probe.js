let chromium;

try {
  ({ chromium } = require("playwright"));
} catch {
  console.log("Playwright is not installed here. Runtime probe skipped safely.");
  process.exit(0);
}

async function main() {
  const baseUrl = process.env.CHURVOX_AUDIT_URL || "http://127.0.0.1:4287";
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    const text = message.text();
    if (/ReferenceError|TypeError|UI crash|cannot read/i.test(text)) errors.push(text);
  });

  await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 45000 });

  const count = await page.locator("button").count();
  for (let i = 0; i < Math.min(count, 35); i += 1) {
    const button = page.locator("button").nth(i);

    try {
      if (!(await button.isVisible())) continue;
      await button.click({ timeout: 1500 });
      await page.waitForTimeout(180);

      const close = page.getByRole("button", { name: /×|close|back/i }).first();
      if (await close.count()) {
        await close.click({ timeout: 1000 }).catch(() => {});
        await page.waitForTimeout(100);
      }
    } catch {
      // Ignore auth/checkout/network blocked buttons. JS crashes are captured above.
    }
  }

  await browser.close();

  if (errors.length) {
    console.error("Runtime probe found JS problems:");
    for (const error of errors.slice(0, 20)) console.error(`- ${error}`);
    process.exit(1);
  }

  console.log("Runtime probe passed ✅");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
