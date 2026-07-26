const { test, expect } = require('@playwright/test');

function isoDay(offset = 0) {
  const date = new Date();
  date.setHours(9, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

const owner = {
  id: 'mobile-owner',
  email: 'mobile-owner@churvox.test',
  role: 'owner',
  business_id: 'mobile-business',
  business_name: 'Northline Property Care',
  plan: 'command',
  subscription_plan: 'command',
  subscription_status: 'active',
  stripe_subscription_id: 'sub_mobile_audit',
  has_app_access: true,
  email_verified: true,
  gst_rate: '15',
};

const data = {
  jobs: [
    { id: 'job-1', title: 'Quarterly grounds reset', client_name: 'Koru Early Learning', assigned_worker_name: 'Mereana Rangi', status: 'in_progress', scheduled_date: isoDay(0), scheduled_time: '08:00', price: 780, address: '14 Puke Road', recurring: 'Monthly' },
    { id: 'job-2', title: 'Fence repair and stain', client_name: 'Aroha Thompson', assigned_worker_name: 'Unassigned', status: 'needs_check', scheduled_date: isoDay(0), scheduled_time: '11:00', price: 940, address: '7 Karaka Street', issue: 'Worker still needed' },
    { id: 'job-3', title: 'Commercial lawn service', client_name: 'Te Awa Medical', assigned_worker_name: 'Hana Poutama', status: 'assigned', scheduled_date: isoDay(1), scheduled_time: '07:30', price: 460, address: '31 Bell Street', recurring: 'Weekly' },
    { id: 'job-4', title: 'Interior repaint', client_name: 'Rimu Apartments', assigned_worker_name: 'Jack Morgan', status: 'completed', scheduled_date: isoDay(-1), scheduled_time: '08:30', price: 2840, address: '19 Rimu Lane' },
  ],
  clients: [
    { id: 'client-1', name: 'Koru Early Learning', phone: '027 555 0101', email: 'office@koru.test', address: '14 Puke Road', service: 'Landscaping', price: '$780', schedule: 'Monthly', notes: 'Gate code recorded.' },
    { id: 'client-2', name: 'Aroha Thompson', phone: '027 555 0198', email: 'aroha@example.test', address: '7 Karaka Street', service: 'Handyman', price: '$940', schedule: 'One-off', notes: 'Call before arrival.' },
  ],
  team: [
    { id: 'worker-1', name: 'Mereana Rangi', email: 'mereana@northline.test', role: 'Worker', access: 'Worker app', status: 'Working', current_job: 'Quarterly grounds reset', app_status: 'Active', timesheet: '6h 20m', proof: '3 photos', payroll_status: 'Ready for review' },
    { id: 'worker-2', name: 'Hana Poutama', email: 'hana@northline.test', role: 'Subcontractor', access: 'Jobs only', status: 'Finished', current_job: 'Commercial lawn service', app_status: 'Active', timesheet: '7h 10m', proof: 'Complete', payroll_status: 'Approved' },
    { id: 'worker-3', name: 'Jack Morgan', email: 'jack@northline.test', role: 'Worker', access: 'Worker app', status: 'Needs help', current_job: 'Interior repaint', app_status: 'Active', timesheet: '5h 40m', proof: 'Missing final photo', payroll_status: 'Needs check' },
  ],
  quotes: [
    { id: 'quote-1', title: 'Q-1042 Grounds restoration', client_name: 'Koru Early Learning', amount: 3250, status: 'Ready', scope: 'Restore garden beds.' },
    { id: 'quote-2', title: 'Q-1041 Fence repair', client_name: 'Aroha Thompson', amount: 940, status: 'Sent', scope: 'Repair and stain fence.' },
  ],
  invoices: [
    { id: 'invoice-1', invoice_number: 'INV-2088', client_name: 'Rimu Apartments', job_title: 'Interior repaint', amount: 2840, due_date: isoDay(7), status: 'Draft', accounting_status: 'Not synced' },
    { id: 'invoice-2', invoice_number: 'INV-2082', client_name: 'Te Awa Medical', job_title: 'Commercial lawn service', amount: 460, due_date: isoDay(-5), status: 'Overdue', accounting_status: 'Synced' },
  ],
  messages: [
    { id: 'message-1', from: 'Aroha Thompson', to: 'Owner', subject: 'Can we move the fence job?', message: 'Could we move the job to Friday morning?', drafted_reply: 'Friday morning works. I will confirm the worker.', client_name: 'Aroha Thompson', job_title: 'Fence repair and stain', priority: 'High', channel: 'Email' },
  ],
  actions: [
    { id: 'action-1', type: 'Invoice approval', title: 'Approve INV-2088 before sending', status: 'Ready', client: 'Rimu Apartments', amount: 2840, recommended_action: 'Approve the draft invoice', reason: 'The job is complete.', evidence: 'Completion note and photos checked.', summary: 'Invoice is prepared.' },
    { id: 'action-2', type: 'Schedule decision', title: 'Move the fence job to Friday', status: 'Parked', client: 'Aroha Thompson', recommended_action: 'Move the booking', reason: 'Client requested a later date.', evidence: 'Client message attached.', summary: 'Friday is available.' },
    { id: 'action-3', type: 'Invoice approval', title: 'INV-2079 approved', status: 'Completed', client: 'Koru Early Learning', amount: 780, recommended_action: 'No action required', reason: 'Payment confirmed.', evidence: 'Accounting matched.', summary: 'Complete.' },
  ],
  xero: { connected: true, xero_connected: true, tenant_name: 'Northline Property Care', status: 'connected' },
};

async function mockApi(page) {
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^.*\/api/, '');
    let body = { success: true };
    if (request.method() === 'GET') {
      if (path === '/auth/me') body = { user: owner };
      else if (path === '/jobs') body = { jobs: data.jobs };
      else if (path === '/clients') body = { clients: data.clients };
      else if (path === '/team/workers' || path === '/team') body = { team: data.team };
      else if (path === '/quotes') body = { quotes: data.quotes };
      else if (path === '/invoices') body = { invoices: data.invoices };
      else if (path === '/approved-notifications' || path === '/messages') body = { messages: data.messages };
      else if (path === '/ai/actions') body = { actions: data.actions };
      else if (path === '/xero/status') body = data.xero;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
}

const pages = [
  'today', 'jobs', 'schedule', 'recurring', 'clients', 'money', 'quotes', 'invoices',
  'accounting', 'crew', 'field', 'timesheets', 'access', 'messages', 'command',
  'parked', 'completed', 'settings', 'support',
];

const selectors = {
  today: '.cvsToday', jobs: '.cvsDispatchBoard', schedule: '.cvMobileScheduleList', recurring: '.cvsCadenceBoard',
  clients: '.cvsClientCockpit', money: '.cvsMoneyRiver', quotes: '.cvsQuoteRiver', invoices: '.cvsLedger',
  accounting: '.cvsAccountingBridge', crew: '.cvsCrewMatrix', field: '.cvsFieldSignal', timesheets: '.cvsTimeBoard',
  access: '.cvsAccessMatrix', messages: '.cvsConversationDesk', command: '.cvsDecisionTheatre', parked: '.cvsDecisionTheatre',
  completed: '.cvsDecisionTheatre', settings: '.cvsSettingsStudio', support: '.cvsSupportStudio',
};

test('mobile visual atlas covers every owner page', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockApi(page);
  await page.goto('/dashboard');
  await expect(page.locator('[data-churvox-layout="fresh-studio"]')).toBeVisible();

  for (const name of pages) {
    await page.evaluate((next) => {
      window.history.pushState({}, '', next === 'today' ? '/dashboard' : `/dashboard#${next}`);
      window.dispatchEvent(new Event('hashchange'));
      window.scrollTo(0, 0);
    }, name);
    await page.waitForTimeout(350);
    await expect(page.locator(`[data-churvox-layout="fresh-studio"].page-${name}`)).toBeVisible();
    await expect(page.locator(selectors[name]).first()).toBeVisible();
    const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth);
    expect(overflow, `${name} creates page-level horizontal scrolling`).toBeLessThanOrEqual(2);
    if (name === 'schedule') await expect(page.locator('.cvsWeekBoard')).toBeHidden();
    await page.screenshot({ path: testInfo.outputPath(`mobile-every-${name}.png`), fullPage: true });
  }

  await page.goto('/plans');
  await expect(page.locator('.cvStandalonePlansRoute')).toBeVisible();
  const plansOverflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth);
  expect(plansOverflow, 'Plans creates page-level horizontal scrolling').toBeLessThanOrEqual(2);
  await page.screenshot({ path: testInfo.outputPath('mobile-every-plans.png'), fullPage: true });
});
