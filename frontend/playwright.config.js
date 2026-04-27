const { defineConfig, devices } = require('@playwright/test');

const baseURL = process.env.CHURVOX_AUDIT_URL || 'https://www.churvox.com';

module.exports = defineConfig({
  testDir: './tests/launch-audit',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ignoreHTTPSErrors: true,
  },
  projects: [
    { name: 'desktop-chrome', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
  ],
});
