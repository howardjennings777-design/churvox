const { expect } = require('@playwright/test');

function createErrorMonitor(page, testInfo) {
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (error) => pageErrors.push(String(error && error.stack ? error.stack : error)));
  page.on('requestfailed', (request) => {
    const failure = request.failure();
    failedRequests.push(`${request.method()} ${request.url()} :: ${failure ? failure.errorText : 'unknown failure'}`);
  });

  return {
    async assertHealthy() {
      const body = page.locator('body');
      await expect(body).toBeVisible();
      const bodyText = (await body.innerText()).trim();
      expect(bodyText.length).toBeGreaterThan(0);

      const severe = [...consoleErrors, ...pageErrors].filter((entry) =>
        /(SyntaxError|ReferenceError|TypeError|React|Minified React error|Cannot read properties)/i.test(entry)
      );

      if (consoleErrors.length) {
        await testInfo.attach('console-errors.txt', { body: consoleErrors.join('\n'), contentType: 'text/plain' });
      }
      if (pageErrors.length) {
        await testInfo.attach('page-errors.txt', { body: pageErrors.join('\n'), contentType: 'text/plain' });
      }
      if (failedRequests.length) {
        await testInfo.attach('failed-requests.txt', { body: failedRequests.join('\n'), contentType: 'text/plain' });
      }

      expect(severe, `Severe errors found:\n${severe.join('\n')}`).toEqual([]);
    },
    consoleErrors,
    pageErrors,
    failedRequests,
  };
}

async function loginIfPossible(page) {
  const email = process.env.CHURVOX_TEST_EMAIL;
  const password = process.env.CHURVOX_TEST_PASSWORD;

  await page.goto('/login');
  if (!email || !password) {
    console.log('CHURVOX e2e: missing test credentials. Set CHURVOX_TEST_EMAIL and CHURVOX_TEST_PASSWORD. Running auth-safe checks only.');
    return false;
  }

  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  const passInput = page.locator('input[type="password"], input[name="password"]').first();
  await emailInput.fill(email);
  await passInput.fill(password);
  await page.getByRole('button', { name: /log\s?in|sign\s?in/i }).first().click();
  await page.waitForURL(/dashboard|smart|home|admin/i, { timeout: 20000 });
  return true;
}

module.exports = { createErrorMonitor, loginIfPossible };
