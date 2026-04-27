const { defineConfig, devices } = require('@playwright/test');

const baseURL = process.env.CHURVOX_AUDIT_URL || 'https://www.churvox.com';

module.exports = defineConfig({
  testDir: './tests/true-audit',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-deep-report', open: 'never' }],
  ],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ignoreHTTPSErrors: true,
  },
  projects: [
    { name: 'true-desktop-chrome', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
    { name: 'true-mobile-chrome', use: { ...devices['Pixel 5'] } },
  ],
});
