const { test, expect } = require('@playwright/test');

function json(body, status = 200) {
  return { status, contentType: 'application/json', body: JSON.stringify(body) };
}

test('homepage tester popup carries campaign attribution into the application request', async ({ page }) => {
  let submitted = null;

  await page.addInitScript(() => {
    const nativeSetTimeout = window.setTimeout.bind(window);
    window.setTimeout = (callback, delay, ...args) => nativeSetTimeout(callback, Number(delay) >= 30000 ? 30 : delay, ...args);
  });

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;

    if (pathname === '/api/public/tester-applications' && request.method() === 'POST') {
      submitted = request.postDataJSON();
      return route.fulfill(json({ success: true, application_id: 'attribution-test' }));
    }
    if (/\/auth\/(?:me|check|session)$/i.test(pathname)) {
      return route.fulfill(json({ success: false, user: null }, 401));
    }
    if (pathname === '/api/platform/visit') return route.fulfill(json({ ok: true }));
    return route.fulfill(json({ success: true, data: [], items: [], records: [] }));
  });

  await page.goto('/?utm_source=facebook&utm_medium=social&utm_campaign=founding_10&utm_content=homepage_launch');

  const dialog = page.getByRole('dialog', { name: /Apply for a tester place/i });
  await expect(dialog).toBeVisible();
  await dialog.getByPlaceholder('Your name').fill('Aroha Tester');
  await dialog.getByPlaceholder('Business name').fill('Aroha Lawn Care');
  await dialog.locator('select[name="trade"]').selectOption({ label: 'Lawn care' });
  await dialog.locator('select[name="team_size"]').selectOption('2-5');
  await dialog.getByPlaceholder('you@business.co.nz').fill('aroha@example.test');
  await dialog.getByRole('button', { name: 'Apply for a tester place' }).click();

  await expect.poll(() => submitted).not.toBeNull();
  expect(submitted).toMatchObject({
    name: 'Aroha Tester',
    business_name: 'Aroha Lawn Care',
    email: 'aroha@example.test',
    source: 'founding_10_homepage_popup',
    utm_source: 'facebook',
    utm_medium: 'social',
    utm_campaign: 'founding_10',
    utm_content: 'homepage_launch',
  });
  expect(submitted.landing_path).toContain('/?utm_source=facebook');
  expect(typeof submitted.locale).toBe('string');
  await expect(dialog.getByText('Your application is in.')).toBeVisible();
});
