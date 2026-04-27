const { defineConfig, devices } = require('@playwright/test');

const baseURL = process.env.CHURVOX_AUDIT_URL || 'https://www.churvox.com';

module.exports = defineConfig({
  testDir: './tests/deep-audit',
  timeout: 90_000,
  expect: { timeout: 12_000 },
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
    { name: 'deep-desktop-chrome', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
    { name: 'deep-mobile-chrome', use: { ...devices['Pixel 5'] } },
  ],
});
