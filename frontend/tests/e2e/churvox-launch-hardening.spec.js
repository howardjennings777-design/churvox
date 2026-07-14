const { test, expect } = require('@playwright/test');

function json(body, status = 200) {
  return { status, contentType: 'application/json', body: JSON.stringify(body) };
}

function owner(plan = 'command') {
  return { id: `owner-golive-${plan}`, business_id: `business-golive-${plan}`, email: `owner-${plan}@churvox.test`, role: 'owner', plan, current_plan: plan, subscription_status: 'active', has_app_access: true, email_verified: true };
}

const trustFeatures = [
  ['offline_worker_sync', 'Offline Worker Sync', 'crew'],
  ['onboarding_imports', 'Ten-minute onboarding and imports', 'start'],
  ['golden_journey', 'Golden Journey reliability', 'start'],
  ['permissions_security', 'Permissions and security', 'start'],
  ['customer_portal', 'Customer portal', 'start'],
  ['recovery_undo', 'Recovery and undo', 'start'],
  ['portability_pack', 'Business Portability Pack', 'start'],
  ['evidence_outcomes', 'Evidence Drawer and measured outcomes', 'start'],
];

function rank(plan) { return ['start', 'crew', 'operator', 'command'].indexOf(plan); }

function summary(plan) {
  return {
    success: true,
    build: 'churvox-go-live-trust-v1-20260714',
    plan,
    features: trustFeatures.map(([key, label, minimum_plan]) => ({ key, label, minimum_plan, available: rank(plan) >= rank(minimum_plan) })),
    journey: { ready: false, complete_count: 5, required_count: 8, steps: [
      { key: 'business_ready', label: 'Business settings', complete: true, screen: 'settings', required: true },
      { key: 'first_client', label: 'First real client', complete: true, screen: 'clients', required: true },
      { key: 'first_job', label: 'First real job', complete: true, screen: 'work', required: true },
      { key: 'worker_ready', label: 'Worker ready', complete: plan === 'start', screen: 'worker', required: plan !== 'start' },
      { key: 'job_completed', label: 'Job completed', complete: true, screen: 'work', required: true },
      { key: 'truth_receipt', label: 'Job Truth Receipt', complete: true, screen: 'intelligence', required: true },
      { key: 'invoice_prepared', label: 'Invoice prepared', complete: false, screen: 'invoices', required: true },
      { key: 'returned', label: 'Returned on another day', complete: false, screen: 'today', required: true },
    ] },
    permissions: { team_role_management_available: rank(plan) >= rank('crew'), custom_overrides_available: rank(plan) >= rank('operator'), policies: [
      { role: 'owner', label: 'Owner', actions: ['business.manage', 'permissions.manage'], custom: false },
      { role: 'worker', label: 'Worker', actions: ['assigned_jobs.read', 'assigned_jobs.update', 'proof.add'], custom: false },
    ] },
    security: { role: 'owner', server_enforced_permissions: true, business_scoped_requests: true, backup_status: 'not_confirmed', backup_message: 'Churvox does not claim a successful backup until the hosting backup can be verified.', data_export_available: true },
    imports: [],
    recovery: [{ id: 'receipt-1', title: 'Import clients', reversible: true, status: 'available', before: { record_count: 0 }, after: { record_count: 2 } }],
    portals: [{ id: 'portal-1', public_token: 'customer-portal-token-123456789', customer_name: 'Jane Smith', job_title: 'Garden tidy', status: 'active' }],
    portability: { record_count: 42, collection_counts: { clients: 12, jobs: 20, invoices: 10 }, download_ready: true },
    evidence: { outcomes: { money_recovered: { found: 840, prepared: 530, invoiced: 530, paid: 310, definition: 'Only linked records are counted.' }, promise_performance: { active_promises: 4, receipts_with_promises: 2, truth_receipts: 5, definition: 'Promises carried onto truth receipts.' }, evidence_rules: ['Every number names its source records.', 'Missing values are not guessed.'] }, findings: [] },
    safety: 'Owner controlled.',
  };
}

async function installApi(page, plan, calls) {
  const account = owner(plan);
  await page.addInitScript((value) => {
    window.localStorage.setItem('token', 'go-live-token');
    window.localStorage.setItem('churvox:stable-current-plan:v1', value.plan);
  }, account);
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const method = request.method();
    let body = null;
    try { body = request.postDataJSON(); } catch {}
    calls.push({ path, method, body });
    if (/\/api\/auth\/(?:me|check|session)$/.test(path)) return route.fulfill(json({ success: true, user: account, ...account }));
    if (path === '/api/launch-hardening/summary') return route.fulfill(json(summary(plan)));
    if (path === '/api/launch-hardening/journey/checkpoint') return route.fulfill(json({ success: true, journey: summary(plan).journey }));
    if (path === '/api/launch-hardening/imports/preview') return route.fulfill(json({ success: true, preview: { preview_id: 'preview-1', kind: body.kind, status: 'preview', row_count: 2, ready_count: 2, needs_review_count: 0, rows: [{ row_number: 2, identity: 'one', ready: true, mapped: { name: 'Jane Smith' }, mapping: { name: 'customer' } }, { row_number: 3, identity: 'two', ready: true, mapped: { name: 'Tom Wilson' }, mapping: { name: 'customer' } }] } }));
    if (path === '/api/launch-hardening/imports/commit') return route.fulfill(json({ success: true, batch: { preview_id: 'preview-1', kind: 'clients', status: 'committed', inserted_count: 2 }, receipt: { id: 'receipt-new', title: 'Import clients', reversible: true, status: 'available' } }));
    if (path === '/api/launch-hardening/permissions') return route.fulfill(json({ success: true, permissions: summary(plan).permissions, receipt: { id: 'permissions-receipt', reversible: true, status: 'available' } }));
    if (path === '/api/launch-hardening/portal-links' && method === 'POST') return route.fulfill(json({ success: true, portal: { id: 'portal-new', public_token: 'portal-token-new-1234567890', customer_name: body.customer_name, job_title: body.job_title, status: 'active' }, url: '/client/portal-token-new-1234567890', receipt: { id: 'portal-receipt', reversible: true, status: 'available' } }));
    if (/^\/api\/launch-hardening\/recovery\/[^/]+\/undo$/.test(path)) {
      const receiptId = decodeURIComponent(path.split('/').at(-2));
      const known = summary(plan).recovery.find((item) => item.id === receiptId) || { id: receiptId, title: 'Reversible owner action', reversible: true, before: {}, after: {} };
      return route.fulfill(json({ success: true, receipt: { ...known, status: 'undone', reversible: false } }));
    }
    if (/\/api\/command\//.test(path)) return route.fulfill(json({ success: true, slips: [], events: [], audit: [] }));
    return route.fulfill(json({ success: true, rows: [], items: [], records: [] }));
  });
}

async function openGoLive(page) {
  await page.goto('/dashboard#golive', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 2500 }).catch(() => null);
  await expect(page.locator('.cvOfficeSite')).toHaveAttribute('data-screen', 'golive');
  await expect(page.locator('[data-go-live-trust="v1"]')).toBeVisible();
}

test.describe('Churvox Go Live and Trust final hardening', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  });

  test('owner can preview and approve a reversible import without blind writes', async ({ page }) => {
    const calls = [];
    await installApi(page, 'command', calls);
    await openGoLive(page);
    for (const [, label] of trustFeatures) await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Bring My Business In' }).click();
    await page.getByRole('button', { name: 'Preview without importing' }).click();
    await expect(page.getByText('2 ready · 0 review')).toBeVisible();
    expect(calls.find((call) => call.path.endsWith('/imports/preview')).body.preview_only).toBe(true);
    await page.getByRole('button', { name: 'Approve 2 ready rows' }).click();
    await expect(page.getByRole('status')).toContainText('2 records imported');
    expect(calls.find((call) => call.path.endsWith('/imports/commit')).body.approved).toBe(true);
  });

  test('trust controls and measured outcomes are visible without invented savings', async ({ page }) => {
    const calls = [];
    await installApi(page, 'start', calls);
    await openGoLive(page);
    await page.getByRole('button', { name: 'Permissions & security' }).click();
    await expect(page.getByText('Server enforced')).toBeVisible();
    await expect(page.getByText('Not claimed')).toBeVisible();
    await page.getByRole('button', { name: 'Measured outcomes' }).click();
    await expect(page.getByText('$840.00')).toBeVisible();
    await expect(page.getByText('$310.00')).toBeVisible();
    await expect(page.getByText('Only linked records are counted.')).toBeVisible();
    await page.getByRole('button', { name: 'Offline worker sync' }).click();
    await expect(page.getByRole('heading', { name: 'Offline worker tools begin at Crew' })).toBeVisible();
  });

  test('portal creation and recovery stay owner-controlled', async ({ page }) => {
    const calls = [];
    await installApi(page, 'operator', calls);
    await openGoLive(page);
    await page.getByRole('button', { name: 'Customer portal' }).click();
    await page.getByLabel('Job ID').fill('job-22');
    await page.getByLabel('Customer').fill('Aroha Property');
    await page.getByLabel('Work title').fill('Lawn service');
    await page.getByRole('button', { name: 'Create secure portal link' }).click();
    await expect(page.getByRole('status')).toContainText('Nothing was emailed automatically');
    const portalCall = calls.find((call) => call.path === '/api/launch-hardening/portal-links' && call.method === 'POST');
    expect(portalCall.body.owner_review_only).toBe(true);
    await page.getByRole('button', { name: 'Recovery & undo' }).click();
    await page.getByRole('button', { name: 'Undo safely' }).first().click();
    await expect(page.getByRole('status')).toContainText('was undone');
  });
});
