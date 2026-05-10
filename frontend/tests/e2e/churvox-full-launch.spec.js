const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.CHURVOX_BASE_URL || process.env.BASE_URL || 'https://www.churvox.com';
const TEST_EMAIL = process.env.CHURVOX_TEST_EMAIL || process.env.TEST_EMAIL || '';
const TEST_PASSWORD = process.env.CHURVOX_TEST_PASSWORD || process.env.TEST_PASSWORD || '';

const stamp = Date.now();
const clientName = `PW Launch Client ${stamp}`;
const jobTitle = `PW Launch Job ${stamp}`;
const quoteClient = `PW Quote Client ${stamp}`;
const invoiceClient = `PW Invoice Client ${stamp}`;

const dangerousWords = [
  'delete',
  'remove',
  'clear invoice',
  'trash',
  'logout',
  'log out',
  'sign out',
  'pay now',
  'buy',
  'upgrade',
  'send',
  'sms',
  'sync myob',
  'cancel subscription',
  'archive',
];

async function saveShot(page, name) {
  await page.screenshot({ path: `frontend/test-results/${name}.png`, fullPage: true }).catch(() => {});
}

function isDangerous(label = '') {
  const clean = label.toLowerCase().trim();
  return dangerousWords.some((word) => clean.includes(word));
}

async function clickIfVisible(page, locator, name) {
  try {
    if (await locator.first().isVisible({ timeout: 2500 })) {
      await locator.first().click({ timeout: 5000 });
      await page.waitForTimeout(700);
      return true;
    }
  } catch (err) {
    console.log(`SKIP ${name}: ${err.message}`);
  }
  return false;
}

async function closeModal(page) {
  const closeButtons = [
    page.getByRole('button', { name: /^close$/i }),
    page.getByRole('button', { name: /^cancel$/i }),
    page.locator('.v3-modal-backdrop button').filter({ hasText: 'Close' }),
    page.keyboard,
  ];

  for (const btn of closeButtons) {
    try {
      if (btn === page.keyboard) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      } else if (await btn.first().isVisible({ timeout: 700 })) {
        await btn.first().click({ timeout: 1500 });
        await page.waitForTimeout(300);
      }
    } catch {}
  }
}

async function login(page) {
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    throw new Error(`
Missing login env vars.

Before running this test, run:
export CHURVOX_TEST_EMAIL="your-owner-login-email"
export CHURVOX_TEST_PASSWORD="your-password"

Then run:
npm --prefix frontend run test:full
`);
  }

  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
  const passwordInput = page.locator('input[type="password"], input[name="password"], input[placeholder*="password" i]').first();

  await expect(emailInput, 'Email input should be visible').toBeVisible({ timeout: 15000 });
  await emailInput.fill(TEST_EMAIL);
  await passwordInput.fill(TEST_PASSWORD);

  await page.getByRole('button', { name: /log in|login|sign in/i }).first().click();
  await page.waitForURL(/dashboard|v3|plans|worker|admin/i, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2000);
}

async function openWorkspace(page, path) {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await expect(page.locator('body')).toContainText(/Churvox|AI|Owner|Create|Run|Board|Match|Sheet/i, { timeout: 15000 });
}

async function fillModalForm(page, values) {
  for (const [label, value] of Object.entries(values)) {
    const input = page.getByLabel(new RegExp(label, 'i')).first();
    try {
      if (await input.isVisible({ timeout: 1500 })) {
        await input.fill(String(value));
        continue;
      }
    } catch {}

    const fallback = page.locator(`input, textarea`).filter({ has: page.locator(`text=${label}`) }).first();
    try {
      if (await fallback.isVisible({ timeout: 700 })) {
        await fallback.fill(String(value));
      }
    } catch {}
  }
}

async function createViaButton(page, buttonRegex, values, submitRegex, screenshotName) {
  await clickIfVisible(page, page.getByRole('button', { name: buttonRegex }), `open ${buttonRegex}`);
  await page.waitForTimeout(800);

  await fillModalForm(page, values);
  await saveShot(page, screenshotName);

  const submit = page.getByRole('button', { name: submitRegex }).first();
  await expect(submit, `Submit button ${submitRegex} should be visible`).toBeVisible({ timeout: 8000 });
  await submit.click();
  await page.waitForTimeout(2500);
}

async function safeButtonAudit(page, pageName) {
  const buttons = await page.locator('button:visible').evaluateAll((els) =>
    els.map((el, index) => ({
      index,
      text: (el.innerText || el.getAttribute('aria-label') || '').trim(),
      disabled: el.disabled,
    }))
  );

  console.log(`BUTTON AUDIT ${pageName}: ${buttons.length} visible buttons`);

  let clicked = 0;
  let skipped = 0;

  for (let i = 0; i < Math.min(buttons.length, 30); i++) {
    const btn = buttons[i];
    const label = btn.text || `button ${i}`;

    if (!label || btn.disabled || isDangerous(label)) {
      skipped++;
      continue;
    }

    const locator = page.locator('button:visible').nth(i);
    try {
      await locator.click({ timeout: 2500 });
      await page.waitForTimeout(400);
      clicked++;
      await closeModal(page);
    } catch (err) {
      skipped++;
      console.log(`SKIPPED BUTTON ${pageName} / ${label}: ${err.message}`);
    }
  }

  console.log(`BUTTON AUDIT ${pageName}: clicked safe=${clicked}, skipped=${skipped}`);
}

test.describe('Churvox full launch live test', () => {
  test.setTimeout(180000);

  test('owner can use AI Trade OS and create core records', async ({ page }) => {
    page.on('console', (msg) => {
      if (['error', 'warning'].includes(msg.type())) {
        console.log(`BROWSER ${msg.type()}: ${msg.text()}`);
      }
    });

    page.on('pageerror', (err) => {
      console.log(`PAGE ERROR: ${err.message}`);
    });

    await login(page);
    await saveShot(page, '01-after-login');

    await openWorkspace(page, '/dashboard');
    await saveShot(page, '02-dashboard');

    await expect(page.locator('body')).toContainText(/Churvox|AI Trade OS|Owner Decisions|Prepare next moves/i);

    await clickIfVisible(page, page.getByRole('button', { name: /prepare next moves|prepare today|prepare/i }), 'Prepare next moves');
    await page.waitForTimeout(5000);
    await saveShot(page, '03-after-prepare-next-moves');

    await clickIfVisible(page, page.getByText(/Owner Decisions/i), 'Owner Decisions card/text');
    await page.waitForTimeout(800);
    await saveShot(page, '04-owner-decisions-modal');
    await closeModal(page);

    await clickIfVisible(page, page.getByText(/Crew Match/i), 'Crew Match card/text');
    await page.waitForTimeout(800);
    await saveShot(page, '05-crew-match-modal');
    await closeModal(page);

    await clickIfVisible(page, page.getByText(/Proof-to-Paid/i), 'Proof-to-Paid card/text');
    await page.waitForTimeout(800);
    await saveShot(page, '06-proof-to-paid-modal');
    await closeModal(page);

    await openWorkspace(page, '/v3/clients');
    await saveShot(page, '07-clients-before-create');
    await createViaButton(
      page,
      /add client|create client/i,
      {
        'Client name': clientName,
        Email: `pw-client-${stamp}@example.com`,
        Phone: '0210000000',
        Address: '1 Test Street, Wellington',
        Notes: 'Created by Playwright launch test',
      },
      /add client|create client|save/i,
      '08-create-client-modal'
    );
    await expect(page.locator('body')).toContainText(clientName, { timeout: 15000 });
    await saveShot(page, '09-client-created');

    await openWorkspace(page, '/v3/jobs');
    await saveShot(page, '10-jobs-before-create');
    await createViaButton(
      page,
      /create job|new job/i,
      {
        'Job title': jobTitle,
        'Customer name': clientName,
        'Job address': '1 Test Street, Wellington',
        'Job type': 'other',
        Price: '125',
        Notes: 'Created by Playwright launch test',
      },
      /create job|save/i,
      '11-create-job-modal'
    );
    await expect(page.locator('body')).toContainText(jobTitle, { timeout: 15000 });
    await saveShot(page, '12-job-created');

    await clickIfVisible(page, page.getByText(jobTitle), 'open created job detail');
    await page.waitForTimeout(800);
    await saveShot(page, '13-job-detail-modal');
    await closeModal(page);

    await openWorkspace(page, '/v3/quotes');
    await saveShot(page, '14-quotes-before-create');
    await createViaButton(
      page,
      /create quote|new quote/i,
      {
        'Customer name': quoteClient,
        'Customer email': `pw-quote-${stamp}@example.com`,
        Address: '2 Quote Street, Wellington',
        'Job description': 'Playwright quote test work',
        'Quote price': '250',
      },
      /create quote|save/i,
      '15-create-quote-modal'
    );
    await expect(page.locator('body')).toContainText(quoteClient, { timeout: 15000 });
    await saveShot(page, '16-quote-created');

    await openWorkspace(page, '/v3/invoices');
    await saveShot(page, '17-invoices-before-create');
    await createViaButton(
      page,
      /create invoice|new invoice/i,
      {
        'Customer name': invoiceClient,
        'Customer email': `pw-invoice-${stamp}@example.com`,
        Address: '3 Invoice Street, Wellington',
        'Invoice description': 'Playwright invoice test work',
        Subtotal: '300',
      },
      /create invoice|save/i,
      '18-create-invoice-modal'
    );
    await expect(page.locator('body')).toContainText(invoiceClient, { timeout: 15000 });
    await saveShot(page, '19-invoice-created');

    const workspaces = [
      ['/v3/decisions', /Owner Decisions|Prepared|AI/i],
      ['/v3/dispatch', /Crew Match|dispatch|worker/i],
      ['/v3/proof', /Proof-to-Paid|proof|completed/i],
      ['/v3/team', /Crew|worker|team/i],
      ['/v3/rules', /Auto Rules|rules|automation/i],
      ['/v3/messages', /AI Messages|message|draft/i],
      ['/v3/reports', /Reports|completed|money/i],
      ['/v3/settings', /Settings|Business|setup/i],
      ['/v3/plans', /Billing|Plan|SMS|Enterprise/i],
    ];

    for (const [path, expected] of workspaces) {
      await openWorkspace(page, path);
      await expect(page.locator('body')).toContainText(expected, { timeout: 12000 });
      await saveShot(page, `workspace-${path.replaceAll('/', '-')}`);
      await safeButtonAudit(page, path);
    }

    await openWorkspace(page, '/dashboard');
    await safeButtonAudit(page, 'dashboard-final');

    await saveShot(page, '99-final-dashboard');
  });
});
