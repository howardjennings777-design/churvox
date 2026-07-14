const { test, expect } = require('@playwright/test');

const OWNER = {
  id: 'signature-owner',
  email: 'hello@churvox.com',
  role: 'owner',
  user_role: 'owner',
  email_verified: true,
  has_app_access: true,
  subscription_status: 'active',
  plan: 'command',
  business_id: 'signature-business',
};

function json(body, status = 200) {
  return { status, contentType: 'application/json', body: JSON.stringify(body) };
}

async function installSignatureApi(page, commandPosts) {
  const jobs = [
    {
      id: 'job-done-1',
      title: 'Smith lawn and hedge',
      client_name: 'Smith Family',
      worker_name: 'Cam',
      status: 'completed',
      completed_at: '2026-07-14T01:00:00Z',
      completion_photos: ['one', 'two'],
      checklist: [{ done: true }, { done: true }],
      actual_hours: 3,
      estimated_hours: 2.5,
      price: 220,
      extra_amount: 25,
      labour_cost: 80,
      notes: 'Hedge waste removed and gate shut.',
      recurrence: 'fortnightly',
      next_service_date: '2026-07-28',
    },
    {
      id: 'job-done-2',
      title: 'Workshop clean',
      client_name: 'Westside Workshop',
      worker_name: 'Aroha',
      status: 'completed',
      completed_at: '2026-07-13T02:00:00Z',
      completion_photos: [],
      checklist: [{ done: true }, { done: false }],
      actual_hours: 4,
      estimated_hours: 4,
      price: 320,
    },
  ];
  const invoices = [
    { id: 'invoice-1', job_id: 'job-done-1', invoice_number: 'INV-1', customer_name: 'Smith Family', status: 'draft', total: 245, amount_due: 245, due_date: '2026-07-21' },
    { id: 'invoice-2', invoice_number: 'INV-2', customer_name: 'Late Client', status: 'overdue', total: 410, amount_due: 410, due_date: '2026-07-01' },
  ];

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    const method = request.method();

    if (pathname === '/api/auth/me') return route.fulfill(json({ success: true, user: OWNER, ...OWNER }));
    if (pathname === '/api/jobs') return route.fulfill(json({ success: true, jobs }));
    if (pathname === '/api/invoices') return route.fulfill(json({ success: true, invoices }));
    if (pathname === '/api/quotes') return route.fulfill(json({ success: true, quotes: [{ id: 'quote-1', customer_name: 'Harbour View', status: 'viewed', total: 650 }] }));
    if (pathname === '/api/payroll/summary') return route.fulfill(json({ success: true, gross_total: 500, payroll: [] }));
    if (/\/api\/command\/(?:slips|audit|events)$/.test(pathname) && method === 'GET') return route.fulfill(json({ success: true, slips: [], audit: [], events: [] }));
    if (pathname === '/api/command/scan') return route.fulfill(json({ success: true, slips: [], existing: [], created_count: 0, existing_count: 0 }));
    if (pathname === '/api/command/slips' && method === 'POST') {
      const payload = request.postDataJSON();
      commandPosts.push(payload);
      return route.fulfill(json({ success: true, slip: { id: `signature-slip-${commandPosts.length}`, ...payload }, safety: 'Nothing was sent, synced, charged or changed.' }));
    }
    return route.fulfill(json({ success: true, data: [], items: [], rows: [] }));
  });
}

async function openScreen(page, screen) {
  await page.goto(`/office-team-lab#${screen}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.cvOfficeSite')).toHaveAttribute('data-screen', screen);
}

test.describe('Churvox signature workflows', () => {
  test('Job Done and Money Radar prepare truthful backend Command slips', async ({ page }) => {
    const commandPosts = [];
    await installSignatureApi(page, commandPosts);

    await openScreen(page, 'jobdone');
    await expect(page.getByRole('heading', { name: 'Job Done', exact: true })).toBeVisible();
    await expect(page.getByText('Smith lawn and hedge', { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/proof, time, extras, invoice readiness/i)).toBeVisible();
    await page.getByRole('button', { name: 'Prepare Job Done card' }).click();
    await expect(page.getByText(/Job Done is waiting in Command/i)).toBeVisible();
    expect(commandPosts).toHaveLength(1);
    expect(commandPosts[0].source_type).toBe('job_done_closeout');
    expect(commandPosts[0].payload.prepared_only).toBe(true);
    expect(commandPosts[0].payload.no_auto_send).toBe(true);
    expect(commandPosts[0].payload.no_auto_payroll).toBe(true);
    expect(commandPosts[0].payload.prepared_form.job).toBe('Smith lawn and hedge');

    await openScreen(page, 'money');
    await expect(page.getByRole('heading', { name: 'Money Radar', exact: true })).toBeVisible();
    await expect(page.getByText(/Waiting for admin/i)).toBeVisible();
    await expect(page.getByText(/Worker costs/i).first()).toBeVisible();
    await page.getByRole('button', { name: 'Prepare Money Radar review' }).click();
    await expect(page.getByText(/Money Radar is waiting in Command/i)).toBeVisible();
    expect(commandPosts).toHaveLength(2);
    expect(commandPosts[1].source_type).toBe('money_radar_review');
    expect(commandPosts[1].payload.prepared_only).toBe(true);
    expect(commandPosts[1].payload.no_auto_mark_paid).toBe(true);
    expect(commandPosts[1].payload.no_auto_tax).toBe(true);
    expect(commandPosts[1].payload.prepared_form.expected_next_30_days).toMatch(/\$/);
  });
});
