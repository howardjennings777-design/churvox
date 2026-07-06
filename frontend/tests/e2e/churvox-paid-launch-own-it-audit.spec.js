const { test, expect } = require('@playwright/test');

const OWNER_EMAIL = process.env.CHURVOX_OWNER_EMAIL || process.env.CHURVOX_E2E_OWNER_EMAIL || '';
const OWNER_PASSWORD = process.env.CHURVOX_OWNER_PASSWORD || process.env.CHURVOX_E2E_OWNER_PASSWORD || '';
const WORKER_EMAIL = process.env.CHURVOX_WORKER_EMAIL || process.env.CHURVOX_E2E_WORKER_EMAIL || '';
const WORKER_PASSWORD = process.env.CHURVOX_WORKER_PASSWORD || process.env.CHURVOX_E2E_WORKER_PASSWORD || '';
const RUN_MUTATION = /^(1|true|yes)$/i.test(process.env.CHURVOX_E2E_MUTATE || '');

const ownerPages = ['today', 'command', 'jobs', 'clients', 'workers', 'messages', 'quotes', 'invoices', 'team', 'payroll', 'xero', 'settings', 'plans', 'support'];
const publicRoutes = ['/', '/features', '/pricing', '/contact', '/security', '/support', '/login', '/signup'];
const fatalPattern = /Something went wrong|Application error|Cannot read properties|undefined is not an object|Minified React error|ChunkLoadError|Script error|Loading chunk failed/i;
const loginPagePattern = /WELCOME BACK|Sign in to Command|Email Password Show Sign in|Forgot password/i;
const ownerAppPattern = /Today|Command|Jobs|Clients|Workers|Quotes|Invoices|Settings|Plans|Churvox/i;
const credentialPlaceholderPattern = /YOUR_REAL_PASSWORD_HERE|YOUR REAL PASSWORD HERE|PUT_REAL_PASSWORD_HERE|PASTE_YOUR_PASSWORD_HERE|REPLACE_WITH_REAL_PASSWORD/i;

async function gotoFast(page, route) {
  await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(async () => {
    await page.evaluate((target) => { window.location.href = target; }, route).catch(() => null);
  });
  await page.waitForTimeout(650);
}

async function text(page) {
  return (await page.locator('body').innerText({ timeout: 8000 }).catch(() => '')).replace(/\s+/g, ' ').trim();
}

async function assertHealthy(page, label) {
  const body = await text(page);
  expect(body.length, `${label} should render useful text`).toBeGreaterThan(50);
  expect(body, `${label} should not show fatal UI`).not.toMatch(fatalPattern);
  expect(body, `${label} should not show raw placeholders`).not.toMatch(/lorem ipsum|placeholder text|sample data/i);
  return body;
}

async function assertOwnerApp(page, label) {
  const body = await assertHealthy(page, label);
  expect(body, `${label} is still on login/public page. Check CHURVOX_OWNER_PASSWORD and active plan access.`).not.toMatch(loginPagePattern);
  expect(body, `${label} should render the owner app`).toMatch(ownerAppPattern);
  return body;
}

async function tryFillLocator(locator, value) {
  const count = await locator.count().catch(() => 0);
  for (let i = 0; i < count; i += 1) {
    const item = locator.nth(i);
    if (!(await item.isVisible().catch(() => false))) continue;
    if (!(await item.isEnabled().catch(() => false))) continue;
    await item.scrollIntoViewIfNeeded().catch(() => null);
    try {
      await item.fill(String(value), { timeout: 2500 });
      return true;
    } catch {
      try {
        await item.click({ force: true });
        await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
        await page.keyboard.type(String(value));
        return true;
      } catch {}
    }
  }
  return false;
}

async function fillAny(page, name, value) {
  const exact = new RegExp(`^${name}$`, 'i');
  const loose = new RegExp(name, 'i');
  const locators = [
    page.getByLabel(exact),
    page.getByPlaceholder(exact),
    page.locator(`input[aria-label="${name}" i], textarea[aria-label="${name}" i], select[aria-label="${name}" i]`),
    page.locator(`input[name="${name}" i], textarea[name="${name}" i], select[name="${name}" i]`),
    page.getByLabel(loose),
    page.getByPlaceholder(loose),
    page.locator(`input[name*="${name}" i], textarea[name*="${name}" i], select[name*="${name}" i]`),
    page.locator(`input[id*="${name}" i], textarea[id*="${name}" i], select[id*="${name}" i]`),
  ];
  for (const locator of locators) {
    if (await tryFillLocator(locator, value)) return true;
  }
  return false;
}

async function clickLike(page, matcher) {
  const candidates = [
    page.getByRole('button', { name: matcher }).first(),
    page.getByRole('link', { name: matcher }).first(),
    page.locator('button, a, input[type="submit"]').filter({ hasText: matcher }).first(),
  ];
  for (const locator of candidates) {
    if (await locator.isVisible().catch(() => false)) {
      await locator.click();
      await page.waitForTimeout(350);
      return true;
    }
  }
  return false;
}

async function login(page, email, password) {
  await gotoFast(page, '/login');
  await fillAny(page, 'email', email);
  await fillAny(page, 'password', password);
  const clicked = await clickLike(page, /sign in|log in|login/i);
  if (!clicked) await page.locator('form button[type="submit"], button[type="submit"], input[type="submit"]').first().click();
  await page.waitForLoadState('domcontentloaded').catch(() => null);
  await page.waitForTimeout(1400);
}

async function ownerLogin(page) {
  test.skip(!OWNER_EMAIL || !OWNER_PASSWORD, 'Owner credentials not supplied.');
  expect(OWNER_PASSWORD, 'Replace CHURVOX_OWNER_PASSWORD with the real password in your terminal, not a placeholder.').not.toMatch(credentialPlaceholderPattern);

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await login(page, OWNER_EMAIL, OWNER_PASSWORD);
    await gotoFast(page, '/dashboard');
    await page.waitForTimeout(900 * attempt);
    const body = await text(page);
    if (!loginPagePattern.test(body) && ownerAppPattern.test(body)) return;
    if (attempt < 3) await page.waitForTimeout(650);
  }

  await gotoFast(page, '/dashboard');
  await assertOwnerApp(page, 'owner login');
}

async function mobileNoOverflow(page, route) {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoFast(page, route);
  const result = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const sw = Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0);
    const copy = (document.body?.innerText || '').replace(/\s+/g, ' ').trim();
    return { overflow: sw - vw, copy };
  });
  expect(result.copy.length, `${route} mobile should render`).toBeGreaterThan(50);
  expect(result.copy, `${route} mobile should not crash`).not.toMatch(fatalPattern);
  expect(result.overflow, `${route} should fit mobile width`).toBeLessThanOrEqual(18);
}

async function visibleButtonTexts(page) {
  return page.locator('button:visible').evaluateAll((buttons) => buttons.map((button) => (button.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean));
}

test.describe('Churvox paid launch owner-level audit', () => {
  test('public launch routes are clean, trusted and not broken', async ({ page }) => {
    for (const route of publicRoutes) {
      await gotoFast(page, route);
      const body = await assertHealthy(page, route);
      expect(body).toMatch(/Churvox|admin|approve|jobs|workers|quotes|invoices|pricing|contact|login|sign/i);
      expect(body).not.toMatch(/Jobber|Tradify|ServiceM8|Fergus|Simpro/i);
    }
  });

  test('mobile launch routes fit phone width', async ({ page }) => {
    for (const route of ['/', '/pricing', '/contact', '/signup', '/worker/today']) {
      await mobileNoOverflow(page, route);
    }
  });

  test('owner app pages keep distinct page contracts and no duplicate setup coach', async ({ page }) => {
    await ownerLogin(page);

    const contracts = {
      today: /Owner control room|Run sheet|Checks|Messages|Money/i,
      command: /Approval desk|Filled slips|Owner decision|Park unclear/i,
      jobs: /Job truth board|Client|Site|Worker|Time|Price|Proof/i,
      clients: /Client memory|Contact|Site notes|Usual work|Next job/i,
      workers: /Field team|Current job|Status|Map|Proof|Problem/i,
      quotes: /Quote builder|Client|Scope|Follow-up|Convert/i,
      invoices: /Money desk|Completed work|Amount|Review|Draft/i,
    };

    for (const pageId of ownerPages) {
      await gotoFast(page, pageId === 'today' ? '/dashboard' : `/dashboard#${pageId}`);
      const body = await assertOwnerApp(page, pageId);
      const setupCount = await page.locator('[data-churvox-setup-coach], .cvxSetupCoach').count();
      expect(setupCount, `${pageId} should not show setup coach overlay`).toBe(0);
      if (contracts[pageId]) expect(body, `${pageId} should show its page contract`).toMatch(contracts[pageId]);
    }
  });

  test('Command is the only place with approval decision controls', async ({ page }) => {
    await ownerLogin(page);

    for (const pageId of ownerPages.filter((item) => item !== 'command')) {
      await gotoFast(page, pageId === 'today' ? '/dashboard' : `/dashboard#${pageId}`);
      await assertOwnerApp(page, pageId);
      const buttons = (await visibleButtonTexts(page)).join(' | ');
      expect(buttons, `${pageId} should not expose approve/park controls`).not.toMatch(/(^|\|)\s*(Approve|Park)\s*(\||$)/i);
    }

    await gotoFast(page, '/dashboard#command');
    const command = await assertOwnerApp(page, 'command');
    expect(command).toMatch(/Approve|Edit|Park|Approval|Command/i);
  });

  test('Workers page has one clean GPS map panel and no raw worker pin block', async ({ page }) => {
    await ownerLogin(page);
    await gotoFast(page, '/dashboard#workers');
    const body = await assertOwnerApp(page, 'workers');
    expect(body).toMatch(/GPS map|Worker status|Proof|messages|slips/i);
    const extraPins = await page.locator('[data-churvox-worker-pin-map]').count();
    expect(extraPins, 'worker pin should update GPS panel, not create an extra map block').toBe(0);
    await page.waitForSelector('iframe[title*="Worker"], iframe[title*="GPS"], .cvxMap iframe', { timeout: 4500 }).catch(() => null);
    const visibleMaps = await page.locator('iframe[title*="Worker"], iframe[title*="GPS"], .cvxMap iframe').count();
    expect(visibleMaps, 'Workers page should have a map iframe').toBeGreaterThan(0);
  });

  test('owner forms open for the records a paid tester will touch', async ({ page }) => {
    await ownerLogin(page);

    for (const [pageId, openText, expected] of [
      ['jobs', /Add job|Job form|Run sheet/i, /Job name|Client|Site address|Assigned worker|Scheduled date|Price/i],
      ['clients', /Add client|Client list|Client file/i, /Name|Phone|Email|Address|Preferred service|Saved price/i],
      ['workers', /Add worker|Worker status/i, /Name|Email|Phone|Role|Access|GPS|Current job/i],
      ['quotes', /New quote|Quote builder/i, /Quote|Client|Amount|Status|Scope|Follow-up/i],
      ['invoices', /New invoice draft|Invoice form/i, /Invoice|Client|Job|Amount|Due date|Status/i],
    ]) {
      await gotoFast(page, `/dashboard#${pageId}`);
      await assertOwnerApp(page, pageId);
      await page.waitForTimeout(900);
      const opened = await clickLike(page, openText);
      expect(opened, `${pageId} should open a form`).toBeTruthy();
      await page.waitForTimeout(500);
      const body = await assertOwnerApp(page, `${pageId} form`);
      expect(body, `${pageId} form should include real fields`).toMatch(expected);
      await clickLike(page, /^Close$/i);
    }
  });

  test('worker app has the simple field flow paid testers need', async ({ page }) => {
    await gotoFast(page, '/worker/today');
    let body = await assertHealthy(page, 'worker today');
    expect(body).toMatch(/Today|Jobs|Messages|Help|Do the job|Capture proof|Command|open|payable/i);

    await mobileNoOverflow(page, '/worker/today');

    test.skip(!WORKER_EMAIL || !WORKER_PASSWORD, 'Worker credentials not supplied for logged-in worker flow.');
    expect(WORKER_PASSWORD, 'Replace CHURVOX_WORKER_PASSWORD with the real worker password in your terminal, not a placeholder.').not.toMatch(credentialPlaceholderPattern);
    await login(page, WORKER_EMAIL, WORKER_PASSWORD);
    await gotoFast(page, '/worker/jobs');
    body = await assertHealthy(page, 'worker jobs');
    expect(body).toMatch(/Jobs|View job|Customer|Status|Proof|Address|Directions|No open jobs/i);

    const opened = await clickLike(page, /View job|Open job/i);
    if (opened) {
      body = await assertHealthy(page, 'worker job detail');
      expect(body).toMatch(/Acknowledge|Start job|issue|proof|Finish job|Message/i);
      expect(body).not.toMatch(/Approve|Park|owner cockpit/i);
    }
  });

  test('guardrail wording remains safe on sensitive product areas', async ({ page }) => {
    await ownerLogin(page);

    for (const route of ['/dashboard#xero', '/dashboard#payroll', '/dashboard#invoices', '/dashboard#command']) {
      await gotoFast(page, route);
      const body = await assertOwnerApp(page, route);
      if (route.includes('xero')) expect(body).toMatch(/Draft sync only|Owner-approved|No automatic/i);
      if (route.includes('payroll')) expect(body).toMatch(/review only|Export/i);
      if (route.includes('invoices')) expect(body).toMatch(/draft|review|sync/i);
      if (route.includes('command')) expect(body).toMatch(/Approve|edit|park|owner/i);
    }
  });

  test('mutating happy path can create launch records when explicitly enabled', async ({ page }) => {
    test.skip(!RUN_MUTATION, 'Mutation test disabled. Set CHURVOX_E2E_MUTATE=1 to create real test records.');
    await ownerLogin(page);

    const stamp = Date.now();
    const client = `Paid Launch Client ${stamp}`;
    const worker = `Paid Launch Worker ${stamp}`;
    const job = `Paid Launch Job ${stamp}`;

    await gotoFast(page, '/dashboard#clients');
    await clickLike(page, /Add client/i);
    await fillAny(page, 'Name', client);
    await fillAny(page, 'Phone', '0210000000');
    await fillAny(page, 'Email', `client-${stamp}@example.com`);
    await fillAny(page, 'Address', '25 Eastern Hutt Road, Lower Hutt');
    await clickLike(page, /Create record|Save record/i);
    await page.waitForTimeout(1000);
    expect(await text(page)).toMatch(new RegExp(client, 'i'));

    await gotoFast(page, '/dashboard#team');
    await clickLike(page, /Invite worker|Add worker/i);
    await fillAny(page, 'Name', worker);
    await fillAny(page, 'Email', `worker-${stamp}@example.com`);
    await fillAny(page, 'Phone', '0211111111');
    await fillAny(page, 'GPS', '-41.2008283,174.9502376');
    await clickLike(page, /Create record|Save record/i);
    await page.waitForTimeout(1000);
    expect(await text(page)).toMatch(new RegExp(worker, 'i'));

    await gotoFast(page, '/dashboard#jobs');
    await clickLike(page, /Add job/i);
    await fillAny(page, 'Job name', job);
    await fillAny(page, 'Client', client);
    await fillAny(page, 'Site address', '25 Eastern Hutt Road, Lower Hutt');
    await fillAny(page, 'Price', '149');
    await clickLike(page, /Create record|Save record/i);
    await page.waitForTimeout(1000);
    expect(await text(page)).toMatch(new RegExp(job, 'i'));
  });
});
