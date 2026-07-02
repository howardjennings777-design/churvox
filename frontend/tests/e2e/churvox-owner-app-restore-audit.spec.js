const { test, expect } = require('@playwright/test');

const OWNER_EMAIL = process.env.CHURVOX_OWNER_EMAIL || process.env.CHURVOX_E2E_OWNER_EMAIL || '';
const OWNER_PASSWORD = process.env.CHURVOX_OWNER_PASSWORD || process.env.CHURVOX_E2E_OWNER_PASSWORD || '';

async function gotoFast(page, route) {
  await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(async () => {
    await page.evaluate((target) => { window.location.href = target; }, route).catch(() => null);
  });
}

async function fillAny(page, name, value) {
  const locators = [
    page.getByLabel(new RegExp(name, 'i')).first(),
    page.getByPlaceholder(new RegExp(name, 'i')).first(),
    page.locator(`input[name*="${name}" i], textarea[name*="${name}" i]`).first(),
  ];
  for (const locator of locators) {
    if (await locator.isVisible().catch(() => false)) {
      await locator.fill(String(value));
      return true;
    }
  }
  return false;
}

async function loginIfAvailable(page) {
  if (!OWNER_EMAIL || !OWNER_PASSWORD) return false;
  await gotoFast(page, '/login');
  await fillAny(page, 'email', OWNER_EMAIL);
  await fillAny(page, 'password', OWNER_PASSWORD);
  const submit = page.locator('form button[type="submit"], button[type="submit"], input[type="submit"]').first();
  if (await submit.isVisible().catch(() => false)) await submit.click();
  else await page.getByRole('button', { name: /sign in|log in|login/i }).first().click();
  await page.waitForLoadState('domcontentloaded').catch(() => null);
  await page.waitForTimeout(1500);
  return true;
}

async function openOwnerShell(page, route = '/dashboard#setupassistant') {
  const loggedIn = await loginIfAvailable(page);
  await gotoFast(page, route);
  await page.waitForTimeout(loggedIn ? 1200 : 900);
  await page.locator('.churvoxOptionC').waitFor({ state: 'attached', timeout: 20000 });
}

async function appShellSnapshot(page) {
  return page.evaluate(() => {
    const shell = document.querySelector('.churvoxOptionC');
    const bar = document.querySelector('.churvoxOptionC .cocBar');
    const nav = document.querySelector('.churvoxOptionC .cocNav');
    const workspace = document.querySelector('.churvoxOptionC .workspace');
    const proof = document.querySelector('.churvoxOptionC .launchNavProof');
    const docks = [...document.querySelectorAll('.xcf10-dock, .xcf10-dock-launch')];
    const navButtons = [...document.querySelectorAll('.churvoxOptionC .cocNav button')];
    const panels = [...document.querySelectorAll('.churvoxOptionC .cocPanel')];
    const rows = [...document.querySelectorAll('.churvoxOptionC .cocRow, .churvoxOptionC .jobCard, .churvoxOptionC .workerCard, .churvoxOptionC .workCard')];

    function styleOf(el) {
      if (!el) return {};
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        display: s.display,
        visibility: s.visibility,
        backgroundColor: s.backgroundColor,
        color: s.color,
        width: r.width,
        height: r.height,
        top: r.top,
        left: r.left,
        borderRadius: s.borderRadius,
        overflowX: s.overflowX,
      };
    }

    const firstButton = navButtons[0];
    const firstButtonStyle = styleOf(firstButton);
    const shellStyle = styleOf(shell);
    const barStyle = styleOf(bar);
    const navStyle = styleOf(nav);
    const workspaceStyle = styleOf(workspace);
    const proofStyle = styleOf(proof);
    const text = (document.body?.innerText || '').replace(/\s+/g, ' ').trim();
    const vw = document.documentElement.clientWidth;
    const sw = Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0);

    return {
      url: location.href,
      text,
      bodyClass: document.body.className,
      shell: Boolean(shell),
      shellStyle,
      bar: Boolean(bar),
      barStyle,
      nav: Boolean(nav),
      navStyle,
      workspace: Boolean(workspace),
      workspaceStyle,
      proofExists: Boolean(proof),
      proofStyle,
      visibleDocks: docks.filter((el) => getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > 0).length,
      navButtonCount: navButtons.length,
      navButtons: navButtons.map((button) => ({ text: button.innerText.trim(), ...styleOf(button) })),
      firstButtonStyle,
      panelCount: panels.length,
      rowCount: rows.length,
      overflow: sw - vw,
    };
  });
}

function expectHealthyOwnerShell(result, label) {
  expect(result.shell, `${label}: .churvoxOptionC should exist`).toBe(true);
  expect(result.bar, `${label}: header bar should exist`).toBe(true);
  expect(result.nav, `${label}: nav should exist`).toBe(true);
  expect(result.workspace, `${label}: workspace should exist`).toBe(true);
  expect(result.text.length, `${label}: app should render useful text`).toBeGreaterThan(120);
  expect(result.text, `${label}: should not show fatal UI`).not.toMatch(/Something went wrong|Application error|Cannot read properties|Minified React error|ChunkLoadError|undefined is not an object/i);

  expect(result.navButtonCount, `${label}: nav should have all main app buttons`).toBeGreaterThanOrEqual(11);
  expect(result.panelCount, `${label}: app should show real cards/panels`).toBeGreaterThanOrEqual(3);
  expect(result.rowCount, `${label}: app should show useful rows/cards`).toBeGreaterThanOrEqual(3);

  expect(result.visibleDocks, `${label}: old audit docks must stay hidden`).toBe(0);
  if (result.proofExists) {
    expect(result.proofStyle.display, `${label}: launch proof rail must not display`).toBe('none');
    expect(result.proofStyle.width, `${label}: launch proof rail must have no width`).toBeLessThanOrEqual(1);
  }

  expect(result.barStyle.height, `${label}: premium header should be visible`).toBeGreaterThanOrEqual(70);
  expect(result.barStyle.width, `${label}: premium header should span page`).toBeGreaterThan(600);
  expect(result.barStyle.backgroundColor, `${label}: header should not be plain white`).not.toBe('rgb(255, 255, 255)');

  expect(result.navStyle.height, `${label}: nav should be a top rail, not a giant circle row`).toBeLessThanOrEqual(90);
  expect(result.firstButtonStyle.height, `${label}: nav buttons should be pill-sized`).toBeLessThanOrEqual(50);
  expect(result.firstButtonStyle.width, `${label}: nav buttons should not be giant circles`).toBeLessThanOrEqual(170);
  expect(result.firstButtonStyle.width, `${label}: nav labels should be readable`).toBeGreaterThan(38);

  expect(result.workspaceStyle.height, `${label}: workspace should be visible`).toBeGreaterThan(260);
  expect(result.overflow, `${label}: page should not horizontally overflow`).toBeLessThanOrEqual(20);
}

test.describe('Churvox owner app restore audit', () => {
  test('owner app shell is restored and audit proof visuals stay hidden', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 920 });
    await openOwnerShell(page, '/dashboard#setupassistant');
    const result = await appShellSnapshot(page);
    expectHealthyOwnerShell(result, 'desktop owner shell');
    expect(result.text).toMatch(/Churvox does the admin|AI Guide|Command|Jobs|Clients|Invoices|Settings|Plans|Support/i);
  });

  test('core owner pages switch without fatal UI or broken shell', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 920 });
    await openOwnerShell(page, '/dashboard#setupassistant');

    for (const name of ['Command', 'Jobs', 'Clients', 'Quotes', 'Invoices', 'Team', 'Payroll', 'Workers', 'Xero', 'Settings', 'Plans', 'Support']) {
      const button = page.locator('.churvoxOptionC .cocNav button', { hasText: new RegExp(`^${name}$`, 'i') }).first();
      await expect(button, `${name} nav button should be visible`).toBeVisible();
      await button.click();
      await page.waitForTimeout(250);
      const result = await appShellSnapshot(page);
      expectHealthyOwnerShell(result, `${name} page`);
      expect(result.text, `${name} page should mention selected page`).toMatch(new RegExp(name.replace('Xero', 'Xero|Draft sync|Guardrails'), 'i'));
    }
  });

  test('mobile owner shell remains readable without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 412, height: 915 });
    await openOwnerShell(page, '/dashboard#setupassistant');
    const result = await appShellSnapshot(page);
    expect(result.shell).toBe(true);
    expect(result.navButtonCount).toBeGreaterThanOrEqual(11);
    expect(result.text.length).toBeGreaterThan(120);
    expect(result.text).not.toMatch(/Something went wrong|Application error|Cannot read properties|Minified React error|ChunkLoadError/i);
    expect(result.visibleDocks).toBe(0);
    if (result.proofExists) expect(result.proofStyle.display).toBe('none');
    expect(result.overflow).toBeLessThanOrEqual(24);
  });
});
