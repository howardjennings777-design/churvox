const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./e2e",
  timeout: 90000,
  expect: {
    timeout: 12000,
  },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["json", { outputFile: "test-results/playwright-audit-results.json" }],
  ],
  use: {
    baseURL: process.env.CHURVOX_BASE_URL || "https://www.churvox.com",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    viewport: { width: 1440, height: 1000 },
  },
  projects: [
    {
      name: "desktop-chrome",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chrome",
      use: {
        ...devices["Pixel 7"],
        viewport: { width: 412, height: 915 },
      },
    },
  ],
});
