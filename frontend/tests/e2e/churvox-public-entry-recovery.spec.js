const { test, expect } = require('@playwright/test');

const ENTRY_ROUTES = ['/', '/features', '/pricing', '/login', '/signup'];

function json(body, status = 200) {
  return { status, contentType: 'application/json', body: JSON.stringify(body) };
}

async function installSafeApi(page) {
  await page.route('**/api/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (/\/auth\/(?:me|check|session)/i.test(pathname)) {
      await route.fulfill(json({ success: false, user: null }, 401));
      return;
    }
    await route.fulfill(json({ success: true, data: [], items: [], records: [] }));
  });
}

async function settle(page) {
  await page.waitForLoadState('domcontentloaded').catch(() => null);
  await page.waitForLoadState('networkidle', { timeout: 1600 }).catch(() => null);
  await page.waitForTimeout(250);
}

function watchFatalRuntime(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (/favicon|manifest|401|404|net::ERR_ABORTED/i.test(text)) return;
    errors.push(text);
  });
  return errors;
}

test.describe('Churvox public entry and stale-chunk recovery', () => {
  test.beforeEach(async ({ page }) => {
    await installSafeApi(page);
  });

  test('primary public and auth entry routes render on desktop and mobile', async ({ page }) => {
    const errors = watchFatalRuntime(page);

    for (const pathname of ENTRY_ROUTES) {
      await page.goto(pathname, { waitUntil: 'domcontentloaded' });
      await settle(page);

      const result = await page.evaluate(() => {
        const body = document.body;
        const text = String(body?.innerText || '').replace(/\s+/g, ' ').trim();
        const overflow = Math.max(document.documentElement.scrollWidth, body?.scrollWidth || 0) - document.documentElement.clientWidth;
        return { text, overflow };
      });

      expect(result.text.length, `${pathname} should contain useful visible content`).toBeGreaterThan(40);
      expect(result.text, `${pathname} should not strand a visitor on an error page`).not.toMatch(/Something went wrong loading this page|Loading chunk .+ failed/i);
      expect(result.overflow, `${pathname} should fit the viewport`).toBeLessThanOrEqual(14);
      await expect(page.locator('[data-testid="churvox-error-boundary"]')).toHaveCount(0);
    }

    expect(errors, 'normal public entry should have no fatal runtime errors').toEqual([]);
  });

  test('signup fields keep entered text readable', async ({ page }) => {
    await page.goto('/signup', { waitUntil: 'domcontentloaded' });
    await settle(page);

    const name = page.locator('input[name="name"]');
    await expect(name).toBeVisible();
    await name.fill('Readable Test Name');
    await expect(name).toHaveValue('Readable Test Name');

    const styles = await name.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        color: style.color,
        webkitTextFillColor: style.webkitTextFillColor,
        backgroundColor: style.backgroundColor,
        fontSize: Number.parseFloat(style.fontSize || '0'),
        opacity: Number.parseFloat(style.opacity || '0'),
      };
    });

    expect(styles.color).toMatch(/rgb\(0,\s*0,\s*0\)/);
    expect(styles.webkitTextFillColor).toMatch(/rgb\(0,\s*0,\s*0\)/);
    expect(styles.backgroundColor).toMatch(/rgb\(255,\s*255,\s*255\)/);
    expect(styles.fontSize).toBeGreaterThanOrEqual(16);
    expect(styles.opacity).toBe(1);
  });

  test('one stale lazy chunk is recovered without losing the requested page', async ({ page }) => {
    let blockedChunk = false;
    const recoveryUrls = new Set();

    page.on('framenavigated', (frame) => {
      if (frame !== page.mainFrame()) return;
      try {
        const url = new URL(frame.url());
        if (url.searchParams.has('cv_reload')) recoveryUrls.add(url.href);
      } catch {}
    });

    await page.route('**/static/js/*.chunk.js', async (route) => {
      if (!blockedChunk) {
        blockedChunk = true;
        await route.abort('failed');
        return;
      }
      await route.continue();
    });

    await page.goto('/signup', { waitUntil: 'domcontentloaded' });

    await expect.poll(() => {
      try {
        return new URL(page.url()).searchParams.has('cv_reload');
      } catch {
        return false;
      }
    }, { timeout: 30_000, message: 'the stale-chunk recovery should refresh the same route once' }).toBe(true);

    await expect(page.getByRole('heading', { name: /Create your Churvox account/i })).toBeVisible({ timeout: 30_000 });
    await expect(page).toHaveURL(/\/signup\?.*cv_reload=/);
    await expect(page.locator('[data-testid="churvox-error-boundary"]')).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText(/Loading chunk .+ failed|Something went wrong loading this page/i);

    const stableUrl = page.url();
    await page.waitForTimeout(1500);

    expect(blockedChunk).toBe(true);
    expect(recoveryUrls.size).toBe(1);
    expect(page.url()).toBe(stableUrl);
  });
});
