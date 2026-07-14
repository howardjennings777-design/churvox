const { test, expect } = require('@playwright/test');

function json(body, status = 200) {
  return { status, contentType: 'application/json', body: JSON.stringify(body) };
}

function owner(plan = 'command') {
  return {
    id: `owner-intelligence-${plan}`,
    business_id: `business-intelligence-${plan}`,
    email: `owner-${plan}@churvox.test`,
    role: 'owner',
    plan,
    current_plan: plan,
    subscription_status: 'active',
    has_app_access: true,
    email_verified: true,
    stripe_customer_id: `cus_${plan}_intelligence`,
  };
}

const features = [
  ['money_left_behind', 'Money Left Behind', 'start'],
  ['job_truth_receipt', 'Job Truth Receipt', 'start'],
  ['promise_memory', 'Promise Memory', 'start'],
  ['voice_to_business', 'Voice-to-Business', 'start'],
  ['worker_proof_coach', 'Worker Proof Coach', 'crew'],
  ['explain_my_week', 'Explain My Week', 'operator'],
  ['approval_budget', 'Approval Budget', 'operator'],
  ['what_if', 'What Happens If?', 'command'],
];

function rank(plan) {
  return ['start', 'crew', 'operator', 'command'].indexOf(plan);
}

function summaryFor(plan) {
  return {
    success: true,
    plan,
    features: features.map(([key, label, minimum_plan]) => ({ key, label, minimum_plan, available: rank(plan) >= rank(minimum_plan), current_plan: plan })),
    money_left_behind: {
      source: 'structured-records', potential_total: 840, overdue_total: 310, finding_count: 2,
      findings: [
        { id: 'finding-job-1', kind: 'completed_not_invoiced', record_id: 'job-1', record_collection: 'jobs', title: 'Johnson lawn service', amount: 530, reason: 'Completed work has no linked invoice.', recommended_action: 'Prepare invoice review' },
        { id: 'finding-invoice-1', kind: 'overdue_invoice', record_id: 'invoice-1', record_collection: 'invoices', title: 'Invoice INV-12', amount: 310, reason: 'An invoice is overdue and still unpaid.', recommended_action: 'Prepare payment follow-up' },
      ],
    },
    job_truth_receipts: [{ id: 'receipt-1', job_id: 'job-1', job_title: 'Johnson lawn service', proof: { count: 4 }, worker_time: { hours: 2.75 }, extras: { amount: 35 }, invoice: { status: 'draft', amount: 530 }, closeout: { status: 'owner_review' }, promised: ['Text before arrival'], source_revision: 'revision-1' }],
    promise_memory: { items: [{ id: 'promise-1', client_name: 'Johnson family', text: 'Text before arrival', category: 'access', active: true }] },
    worker_proof_coach: { industry: 'lawn care', needs_proof: 1, items: [{ job_id: 'job-2', job_title: 'Hedge trim', check: { ready: false, missing_count: 2, missing: [{ label: 'Show edges and tidy-up' }, { label: 'Confirm gates and access were left secure' }] } }] },
    explain_my_week: { metrics: { completed_jobs: 8, invoice_value: 4200, money_checks: 2, missing_proof: 1, time_overruns: 1, open_quotes: 3 }, statements: [{ title: '8 jobs were completed', detail: 'Recorded invoice value for the week is $4,200.00.', evidence_ids: ['job-1'], level: 'good' }, { title: '$840.00 may still need owner action', detail: 'Two structured money checks are waiting.', evidence_ids: ['finding-job-1'], level: 'attention' }] },
    approval_budget: { settings: { money_interrupt_amount: 1000, missing_proof: 'today', open_timer: 'today', routine_batch: 'evening' }, counts: { now: 1, today: 1, batch: 3 }, buckets: { now: [], today: [], batch: [] } },
    what_if: { baseline: { job_count: 20, revenue: 10000, worker_cost: 3500, average_job_hours: 2, next_week_jobs: 8 }, ready: true },
    safety: 'Prepared only.',
  };
}

async function installApi(page, plan, calls) {
  const account = owner(plan);
  await page.addInitScript((value) => {
    window.localStorage.setItem('token', 'owner-intelligence-token');
    window.localStorage.setItem('churvox:stable-current-plan:v1', value.plan);
  }, account);

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();
    let body = null;
    try { body = request.postDataJSON(); } catch {}
    calls.push({ path, method, body });

    if (/\/api\/auth\/(?:me|check|session)$/.test(path)) return route.fulfill(json({ success: true, user: account, ...account }));
    if (path === '/api/owner-intelligence/summary') return route.fulfill(json(summaryFor(plan)));
    if (path === '/api/owner-intelligence/money-left-behind/finding-job-1/prepare' && method === 'POST') return route.fulfill(json({ success: true, existing: false, draft: { id: 'draft-money-1', source_id: 'finding-job-1' } }));
    if (path === '/api/owner-intelligence/promise-memory' && method === 'POST') return route.fulfill(json({ success: true, promise: { id: 'promise-new', client_name: body.client_name, client_id: body.client_id, text: body.text, category: body.category, active: true } }));
    if (path === '/api/owner-intelligence/voice-to-business' && method === 'POST') return route.fulfill(json({ success: true, draft: { id: 'voice-1', intent: 'job_draft', client_hint: 'John', service: body.text, date_hint: 'next thursday', estimated_hours: 2, amount: 180, owner_review_required: true, no_auto_send: true } }));
    if (path === '/api/owner-intelligence/approval-budget' && method === 'POST') return route.fulfill(json({ success: true, settings: body, counts: { now: 1, today: 1, batch: 3 }, buckets: { now: [], today: [], batch: [] } }));
    if (path === '/api/owner-intelligence/what-if' && method === 'POST') return route.fulfill(json({ success: true, scenario: body.scenario, baseline: summaryFor(plan).what_if.baseline, projected: { revenue: 10800 }, impact: { revenue_delta: 800, percent: Number(body.percent) }, assumptions: ['Same number and mix of jobs.'], owner_review_required: true, no_records_changed: true }));
    if (/\/api\/command\/(?:slips|events|audit)/.test(path)) return route.fulfill(json({ success: true, slips: [], events: [], audit: [] }));
    if (/\/api\/command\/(?:scan|human-mimic-marker)/.test(path)) return route.fulfill(json({ success: true, slips: [], roles: new Array(8).fill('role') }));
    return route.fulfill(json({ success: true, data: [], rows: [], items: [], records: [] }));
  });
}

async function openIntelligence(page) {
  await page.goto('/dashboard#intelligence', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 2500 }).catch(() => null);
  await expect(page.locator('.cvOfficeSite')).toHaveAttribute('data-screen', 'intelligence');
  await expect(page.locator('[data-churvox-intelligence="v1"]')).toBeVisible();
}

test.describe('Churvox Intelligence eight-feature product', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  });

  test('Command owner can use all eight tools and every write stays prepared-only', async ({ page }) => {
    const calls = [];
    await installApi(page, 'command', calls);
    await openIntelligence(page);

    for (const [, label] of features) await expect(page.getByRole('tab', { name: new RegExp(label) })).toBeVisible();
    await expect(page.locator('.cvIntelHero')).toContainText('8');

    await page.getByRole('tab', { name: /Money Left Behind/ }).click();
    await expect(page.locator('[data-intelligence-feature="money-left-behind"]')).toContainText('$840.00');
    await page.getByRole('button', { name: 'Prepare invoice review' }).click();
    await expect(page.getByRole('status')).toContainText('prepared for owner review');
    const moneyCall = calls.find((item) => item.path.endsWith('/finding-job-1/prepare'));
    expect(moneyCall.body.owner_review_only).toBe(true);
    expect(moneyCall.body.prepared_only).toBe(true);

    await page.getByRole('tab', { name: /Job Truth Receipt/ }).click();
    await expect(page.locator('[data-intelligence-feature="job-truth-receipt"]')).toContainText('Johnson lawn service');
    await expect(page.locator('[data-intelligence-feature="job-truth-receipt"]')).toContainText('2.75 hrs');

    await page.getByRole('tab', { name: /Promise Memory/ }).click();
    const promise = page.locator('[data-intelligence-feature="promise-memory"]');
    await promise.getByPlaceholder('Client name').fill('Aroha Property');
    await promise.getByPlaceholder('Linked client ID').fill('client-22');
    await promise.getByPlaceholder(/Never arrive/).fill('Never arrive before 9am.');
    await promise.getByRole('button', { name: 'Save promise' }).click();
    await expect(promise).toContainText('Never arrive before 9am.');

    await page.getByRole('tab', { name: /Voice-to-Business/ }).click();
    const voice = page.locator('[data-intelligence-feature="voice-to-business"]');
    await voice.getByPlaceholder(/Book John/).fill('Book John next Thursday for lawn mowing, two hours, $180, do not send it.');
    await voice.getByRole('button', { name: 'Prepare business draft' }).click();
    await expect(voice).toContainText('job draft');
    await expect(voice).toContainText('$180.00');

    await page.getByRole('tab', { name: /Worker Proof Coach/ }).click();
    await expect(page.locator('[data-intelligence-feature="worker-proof-coach"]')).toContainText('1 job');
    await expect(page.locator('[data-intelligence-feature="worker-proof-coach"]')).toContainText('Confirm gates');

    await page.getByRole('tab', { name: /Explain My Week/ }).click();
    await expect(page.locator('[data-intelligence-feature="explain-my-week"]')).toContainText('Evidence: job-1');

    await page.getByRole('tab', { name: /Approval Budget/ }).click();
    const budget = page.locator('[data-intelligence-feature="approval-budget"]');
    await budget.getByLabel('Interrupt me for money above').fill('1500');
    await budget.getByRole('button', { name: 'Save attention rules' }).click();
    const budgetCall = calls.find((item) => item.path === '/api/owner-intelligence/approval-budget' && item.method === 'POST');
    expect(Number(budgetCall.body.money_interrupt_amount)).toBe(1500);
    expect(budgetCall.body.owner_review_only).toBe(true);

    await page.getByRole('tab', { name: /What Happens If/ }).click();
    const simulator = page.locator('[data-intelligence-feature="what-if"]');
    await simulator.getByRole('button', { name: 'Run safe simulation' }).click();
    await expect(simulator).toContainText('No records changed');
    const whatIfCall = calls.find((item) => item.path === '/api/owner-intelligence/what-if');
    expect(whatIfCall.body.simulation_only).toBe(true);
    expect(whatIfCall.body.no_records_changed).toBe(true);
  });

  test('Start gets the four core tools and sees honest tier locks for the rest', async ({ page }) => {
    const calls = [];
    await installApi(page, 'start', calls);
    await openIntelligence(page);

    for (const label of ['Money Left Behind', 'Job Truth Receipt', 'Promise Memory', 'Voice-to-Business']) {
      await page.getByRole('tab', { name: new RegExp(label) }).click();
      await expect(page.locator('[data-feature-locked]')).toHaveCount(0);
    }

    for (const [key, label, minimum] of features.filter((item) => item[2] !== 'start')) {
      await page.getByRole('tab', { name: new RegExp(label) }).click();
      const locked = page.locator(`[data-feature-locked="${key}"]`);
      await expect(locked).toBeVisible();
      await expect(locked).toContainText(`Available from ${minimum.charAt(0).toUpperCase() + minimum.slice(1)}`);
    }

    expect(calls.some((item) => item.path === '/api/owner-intelligence/what-if')).toBe(false);
  });
});
