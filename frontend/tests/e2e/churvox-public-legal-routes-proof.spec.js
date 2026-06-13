const { test, expect } = require('@playwright/test');

const ROUTES = [
  { path: '/privacy', heading: /privacy/i, label: 'PRIVACY' },
  { path: '/terms', heading: /terms/i, label: 'TERMS' },
  { path: '/privacy-policy', heading: /privacy/i, label: 'PRIVACY_POLICY' },
  { path: '/terms-of-service', heading: /terms/i, label: 'TERMS_OF_SERVICE' },
  { path: '/account-deletion', heading: /account deletion|delete/i, label: 'ACCOUNT_DELETION' },
];

test('public legal routes render without login proof', async ({ page }) => {
  test.setTimeout(90000);

  for (const route of ROUTES) {
    await page.goto(route.path, { waitUntil: 'domcontentloaded' });

    const currentUrl = page.url();
    const bodyText = await page.locator('body').innerText();

    console.log(`LEGAL_ROUTE_${route.label}_URL=${currentUrl}`);
    console.log(`LEGAL_ROUTE_${route.label}_HAS_TEXT=${route.heading.test(bodyText)}`);
    console.log(`LEGAL_ROUTE_${route.label}_REDIRECTED_TO_LOGIN=${currentUrl.includes('/login')}`);

    expect(currentUrl).toContain(route.path);
    expect(currentUrl).not.toContain('/login');
    expect(bodyText).toMatch(route.heading);
    expect(bodyText.length).toBeGreaterThan(80);
  }

  console.log('PUBLIC_LEGAL_ROUTES_PROOF=passed');
});
