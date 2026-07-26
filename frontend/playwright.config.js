const { defineConfig, devices } = require('@playwright/test');

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'https://www.churvox.com';
const useExternalSite = /^https?:\/\//i.test(baseURL) && !/127\.0\.0\.1|localhost/i.test(baseURL);
const storageState = process.env.PLAYWRIGHT_STORAGE_STATE || undefined;
const skipWebServer = /^(1|true|yes)$/i.test(process.env.PLAYWRIGHT_SKIP_WEB_SERVER || '');
const webServerCommand = process.env.PLAYWRIGHT_WEB_SERVER_COMMAND || 'npm run build && npx serve -s build -l 3000';

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
  ],
  use: {
    baseURL,
    storageState,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 45_000,
    ignoreHTTPSErrors: true,
    serviceWorkers: 'block',
  },
  webServer: useExternalSite || skipWebServer ? undefined : {
    command: webServerCommand,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 180_000,
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 920 } } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'], viewport: { width: 412, height: 915 } } },
  ],
});
