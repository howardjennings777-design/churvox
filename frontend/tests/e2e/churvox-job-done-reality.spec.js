const { test, expect } = require('@playwright/test');

function json(body, status = 200) {
  return { status, contentType: 'application/json', body: JSON.stringify(body) };
}

const owner = {
  id: 'owner-job-done-test',
  business_id: 'business-job-done-test',
  email: 'owner-job-done-test@churvox.test',
  role: 'owner',
  plan: 'operator',
  subscription_status: 'active',
  has_app_access: true,
  stripe_customer_id: 'cus_job_done_test',
};

const closeout = {
  id: '65f000000000000000000001',
  business_id: owner.business_id,
  job_id: '65f000000000000000000011',
  job_collection: 'jobs',
  job_title: 'Henderson hedge trim',
  client_id: '65f000000000000000000021',
  closeout_state: 'needs_owner',
  status: 'open',
  risk_keys: ['extras'],
  risk_count: 1,
  proof: { status: 'ready', count: 4, note: 'Four completion photos are linked by job id.' },
  worker_time: { status: 'ready', hours: 3.25, entry_ids: ['65f000000000000000000031'], note: 'Worker time is linked by job id.' },
  extras: { status: 'review', amount: 35, items: [{ description: 'Green waste' }], note: 'Extra remains editable.' },
  invoice: { status: 'missing', invoice_id: '', amount: 280, note: 'No invoice is linked yet.' },
  recurring: { recurring: true, status: 'ready', next_date: '2026-07-28', note: 'Next date is ready.' },
  source_snapshot: { completed_at: '2026-07-14T04:00:00Z', notes: 'Worker completed the job and attached proof.' },
};

async function installOwnerApi(page, calls) {
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;
    const method = request.method();

    if (/\/auth\/(?:me|check|session)$/i.test(pathname)) {
      await route.fulfill(json({ success: true, user: owner, ...owner }));
      return;
    }
    if (pathname === '/api/job-done/closeouts' && method === 'GET') {
      calls.push({ method, pathname, search: url.search });
      await route.fulfill(json({ success: true, closeouts: [closeout], count: 1, safety: 'Prepared only.' }));
      return;
    }
    if (pathname === `/api/job-done/closeouts/${closeout.id}/prepare` && method === 'POST') {
      const body = request.postDataJSON();
      calls.push({ method, pathname, body });
      await route.fulfill(json({
        success: true,
        existing: false,
        message: 'Job Done is ready in Command.',
        slip: { id: '65f000000000000000000041', source_type: 'job_done', source_id: closeout.id, action_type: 'apply_job_closeout' },
      }));
      return;
    }
    if (pathname === '/api/job-done/money-radar' && method === 'GET') {
      calls.push({ method, pathname });
      await route.fulfill(json({
        success: true,
        metrics: [
          { label: 'Finished, not closed', value: 1, note: 'One persisted closeout waiting' },
          { label: 'Invoice actions', value: 1, note: 'One draft direction waiting' },
          { label: 'Payment risk', value: 0, note: 'No overdue invoices' },
          { label: 'Worker cost checks', value: 0, note: 'Hours linked' },
        ],
        items: [{
          key: `closeout-${closeout.id}`,
          type: 'Earned, not closed',
          title: closeout.job_title,
          amount: 280,
          risk: 'extras',
          next: 'Prepare Job Done closeout',
          closeout_id: closeout.id,
          job_id: closeout.job_id,
          detail: 'Completed work is linked to proof, time, extras and invoice readiness.',
        }],
      }));
      return;
    }
    if (pathname === '/api/job-done/money-radar/prepare' && method === 'POST') {
      const body = request.postDataJSON();
      calls.push({ method, pathname, body });
      await route.fulfill(json({ success: true, existing: true, message: 'Money decision is ready in Command.', slip: { id: '65f000000000000000000041' } }));
      return;
    }
    if (/\/command\/human-mimic-marker/i.test(pathname)) {
      await route.fulfill(json({ success: true, version: 'human-mimic-intelligence-v3', roles: new Array(8).fill('role') }));
      return;
    }
    if (/\/command\/scan/i.test(pathname)) {
      await route.fulfill(json({ success: true, slips: [], existing: [], created_count: 0, existing_count: 0 }));
      return;
    }
    if (/\/command\/(?:slips|events|audit)/i.test(pathname) && method === 'GET') {
      await route.fulfill(json({ success: true, slips: [], events: [], audit: [] }));
      return;
    }

    await route.fulfill(json({
      success: true,
      data: [], items: [], rows: [], records: [], jobs: [], clients: [], workers: [], quotes: [], invoices: [], messages: [],
    }));
  });
}

async function openOwnerScreen(page, screen) {
  await page.goto(`/dashboard#${screen}`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 2000 }).catch(() => null);
  await expect(page.locator('.cvOfficeSite')).toHaveAttribute('data-screen', screen);
}

test.describe('Persisted Job Done reality layer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  });

  test('Jobs reads a stored closeout and prepares its exact id in Command', async ({ page }) => {
    const calls = [];
    await installOwnerApi(page, calls);
    await openOwnerScreen(page, 'work');

    const jobDone = page.locator('.cvJobDone');
    await expect(jobDone).toContainText('persisted Job Done');
    await expect(jobDone).toContainText(closeout.job_title);
    await expect(jobDone).toContainText(closeout.id);
    await expect(jobDone).toContainText('3.25 hrs');
    await expect(jobDone).toContainText('$35.00');
    await expect(jobDone).not.toContainText('preview-smith');

    await jobDone.getByRole('button', { name: 'Prepare full closeout' }).click();
    await expect(jobDone).toContainText('ready in Command for owner approval');

    const prepare = calls.find((item) => item.pathname.endsWith('/prepare') && item.method === 'POST');
    expect(prepare).toBeTruthy();
    expect(prepare.pathname).toBe(`/api/job-done/closeouts/${closeout.id}/prepare`);
    expect(prepare.body.intent).toBe('full_closeout');
    expect(prepare.body.owner_review_only).toBe(true);
  });

  test('Money Radar uses the persisted closeout id and blocks duplicate preparation', async ({ page }) => {
    const calls = [];
    await installOwnerApi(page, calls);
    await openOwnerScreen(page, 'money');

    const radar = page.locator('.cvMoneyRadar');
    await expect(radar).toContainText('Money Radar · persisted');
    await expect(radar).toContainText(closeout.job_title);
    await expect(radar).toContainText('$280.00');

    await radar.getByRole('button', { name: 'Prepare Job Done closeout' }).click();
    await expect(radar).toContainText('already waiting in Command');

    const prepare = calls.find((item) => item.pathname === '/api/job-done/money-radar/prepare');
    expect(prepare).toBeTruthy();
    expect(prepare.body.closeout_id).toBe(closeout.id);
  });
});
