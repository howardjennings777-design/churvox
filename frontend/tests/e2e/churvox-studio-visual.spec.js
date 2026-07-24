const { test, expect } = require('@playwright/test');

function isoDay(offset = 0) {
  const date = new Date();
  date.setHours(9, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

const owner = {
  id: 'visual-owner',
  email: 'visual-owner@churvox.test',
  role: 'owner',
  business_id: 'visual-business',
  business_name: 'Northline Property Care',
  plan: 'command',
  subscription_plan: 'command',
  subscription_status: 'active',
  stripe_subscription_id: 'sub_visual_studio',
  has_app_access: true,
  email_verified: true,
  gst_rate: '15',
};

const fixtures = {
  jobs: [
    { id: 'job-1', title: 'Quarterly grounds reset', client_name: 'Koru Early Learning', assigned_worker_name: 'Mereana Rangi', status: 'in_progress', scheduled_date: isoDay(0), scheduled_time: '08:00', price: 780, address: '14 Puke Road', service: 'Landscaping', recurring: 'Monthly' },
    { id: 'job-2', title: 'End-of-lease clean', client_name: 'Harbour Property Group', assigned_worker_name: 'Wiremu Kingi', status: 'acknowledged', scheduled_date: isoDay(0), scheduled_time: '09:30', price: 620, address: '82 Victoria Avenue', service: 'Cleaning', recurring: 'One-off' },
    { id: 'job-3', title: 'Fence repair and stain', client_name: 'Aroha Thompson', assigned_worker_name: 'Unassigned', status: 'needs_check', scheduled_date: isoDay(0), scheduled_time: '11:00', price: 940, address: '7 Karaka Street', service: 'Handyman', issue: 'Worker still needed' },
    { id: 'job-4', title: 'Commercial lawn service', client_name: 'Te Awa Medical', assigned_worker_name: 'Hana Poutama', status: 'assigned', scheduled_date: isoDay(1), scheduled_time: '07:30', price: 460, address: '31 Bell Street', service: 'Lawn mowing', recurring: 'Weekly' },
    { id: 'job-5', title: 'Interior repaint', client_name: 'Rimu Apartments', assigned_worker_name: 'Jack Morgan', status: 'completed', scheduled_date: isoDay(-1), scheduled_time: '08:30', price: 2840, address: '19 Rimu Lane', service: 'Painting' },
    { id: 'job-6', title: 'Pest inspection', client_name: 'Matai Foods', assigned_worker_name: 'Mereana Rangi', status: 'assigned', scheduled_date: isoDay(2), scheduled_time: '13:00', price: 330, address: '105 Taupo Quay', service: 'Pest control', recurring: 'Fortnightly' },
  ],
  clients: [
    { id: 'client-1', name: 'Koru Early Learning', phone: '027 555 0101', email: 'office@koru.test', address: '14 Puke Road', service: 'Landscaping', price: '$780', schedule: 'Monthly', notes: 'Gate code 2190. Avoid sleep room between 12–2.' },
    { id: 'client-2', name: 'Harbour Property Group', phone: '021 555 0144', email: 'ops@harbour.test', address: '82 Victoria Avenue', service: 'Cleaning', price: '$620', schedule: 'One-off', notes: 'Collect key from reception.' },
    { id: 'client-3', name: 'Aroha Thompson', phone: '027 555 0198', email: 'aroha@example.test', address: '7 Karaka Street', service: 'Handyman', price: '$940', schedule: 'One-off', notes: 'Dog is friendly and stays inside.' },
    { id: 'client-4', name: 'Te Awa Medical', phone: '06 555 0122', email: 'manager@teawa.test', address: '31 Bell Street', service: 'Lawn mowing', price: '$460', schedule: 'Weekly', notes: 'Before opening hours only.' },
  ],
  team: [
    { id: 'worker-1', name: 'Mereana Rangi', email: 'mereana@northline.test', role: 'Worker', access: 'Worker app', status: 'Working', current_job: 'Quarterly grounds reset', app_status: 'Active', gps: 'Puke Road', timesheet: '6h 20m', proof: '3 photos', payroll_status: 'Ready for review', pay_frequency: 'Fortnightly' },
    { id: 'worker-2', name: 'Wiremu Kingi', email: 'wiremu@northline.test', role: 'Worker', access: 'Worker app', status: 'Travelling', current_job: 'End-of-lease clean', app_status: 'Active', gps: 'Victoria Avenue', timesheet: '4h 55m', proof: '1 photo', payroll_status: 'Ready for review' },
    { id: 'worker-3', name: 'Hana Poutama', email: 'hana@northline.test', role: 'Subcontractor', access: 'Jobs only', status: 'Finished', current_job: 'Commercial lawn service', app_status: 'Active', gps: 'Bell Street', timesheet: '7h 10m', proof: 'Complete', payroll_status: 'Approved' },
    { id: 'worker-4', name: 'Jack Morgan', email: 'jack@northline.test', role: 'Worker', access: 'Worker app', status: 'Needs help', current_job: 'Interior repaint', app_status: 'Active', gps: 'Rimu Lane', timesheet: '5h 40m', proof: 'Missing final room', payroll_status: 'Needs check' },
    { id: 'worker-5', name: 'Tui Edwards', email: 'tui@northline.test', role: 'Manager', access: 'Full access', status: 'Offline', current_job: 'No job assigned', app_status: 'Active', timesheet: 'No time', payroll_status: 'No payroll review' },
  ],
  quotes: [
    { id: 'quote-1', title: 'Q-1042 Grounds restoration', client_name: 'Koru Early Learning', customer_email: 'office@koru.test', amount: 3250, status: 'Ready', scope: 'Restore garden beds, mulch and edge all paths.' },
    { id: 'quote-2', title: 'Q-1041 Fence repair', client_name: 'Aroha Thompson', customer_email: 'aroha@example.test', amount: 940, status: 'Sent', scope: 'Repair posts, replace rails and stain.' },
    { id: 'quote-3', title: 'Q-1039 Medical grounds', client_name: 'Te Awa Medical', customer_email: 'manager@teawa.test', amount: 5520, status: 'Viewed', scope: 'Annual lawn and garden programme.' },
    { id: 'quote-4', title: 'Q-1037 Apartment repaint', client_name: 'Rimu Apartments', amount: 2840, status: 'Accepted', scope: 'Two-bedroom interior repaint.' },
    { id: 'quote-5', title: 'Q-1035 Pest programme', client_name: 'Matai Foods', amount: 1980, status: 'Converted', scope: 'Six scheduled inspections.' },
  ],
  invoices: [
    { id: 'invoice-1', invoice_number: 'INV-2088', client_name: 'Rimu Apartments', job_title: 'Interior repaint', amount: 2840, due_date: isoDay(7), status: 'Draft', accounting_status: 'Not synced' },
    { id: 'invoice-2', invoice_number: 'INV-2087', client_name: 'Harbour Property Group', job_title: 'End-of-lease clean', amount: 620, due_date: isoDay(3), status: 'Sent', accounting_status: 'Ready' },
    { id: 'invoice-3', invoice_number: 'INV-2082', client_name: 'Te Awa Medical', job_title: 'Commercial lawn service', amount: 460, due_date: isoDay(-5), status: 'Overdue', accounting_status: 'Synced' },
    { id: 'invoice-4', invoice_number: 'INV-2079', client_name: 'Koru Early Learning', job_title: 'Monthly grounds', amount: 780, due_date: isoDay(-1), status: 'Paid', accounting_status: 'Synced' },
  ],
  messages: [
    { id: 'message-1', from: 'Aroha Thompson', to: 'Owner', subject: 'Can we move the fence job?', message: 'The timber delivery is arriving later than expected. Could we move the job to Friday morning?', drafted_reply: 'Kia ora Aroha, Friday morning works. I have held the 8:30 slot and will confirm the worker once assigned.', client_name: 'Aroha Thompson', job_title: 'Fence repair and stain', priority: 'High', channel: 'Email' },
    { id: 'message-2', from: 'Jack Morgan', to: 'Owner', subject: 'Need another tin of paint', message: 'The hallway has taken more than expected. I need one more 10L tin to finish today.', drafted_reply: 'Thanks Jack. I have noted the extra material. Hold before purchasing until approved.', client_name: 'Rimu Apartments', job_title: 'Interior repaint', priority: 'Urgent', channel: 'Worker app' },
    { id: 'message-3', from: 'Harbour Property Group', to: 'Owner', subject: 'Key collection confirmed', message: 'Reception will have the apartment key ready from 8:45.', drafted_reply: 'Thanks, the crew has been updated.', client_name: 'Harbour Property Group', job_title: 'End-of-lease clean', priority: 'Normal', channel: 'Email' },
  ],
  actions: [
    { id: 'action-1', type: 'Invoice approval', title: 'Approve INV-2088 before sending', status: 'Ready', client: 'Rimu Apartments', amount: 2840, recommended_action: 'Approve the draft invoice', reason: 'The job is complete and proof is attached.', evidence: 'Completion note, five photos and recorded extras checked.', summary: 'Invoice lines, GST, due date and client email are prepared.' },
    { id: 'action-2', type: 'Timesheet check', title: 'Review Jack’s extra 1h 20m', status: 'Waiting', client: 'Rimu Apartments', recommended_action: 'Approve or edit recorded time', reason: 'Recorded time is longer than the original allowance.', evidence: 'Timer entries and worker note are attached.', summary: 'The adjustment is prepared but not locked.' },
    { id: 'action-3', type: 'Schedule decision', title: 'Move Aroha’s fence job to Friday', status: 'Pending', client: 'Aroha Thompson', recommended_action: 'Move the booking and notify the client', reason: 'The client requested a later date.', evidence: 'Client message is connected to the job.', summary: 'Friday 8:30 is free and a reply is drafted.' },
    { id: 'action-4', type: 'Quote follow-up', title: 'Follow up Q-1039', status: 'Parked', client: 'Te Awa Medical', amount: 5520, recommended_action: 'Send the prepared follow-up', reason: 'The quote was viewed four days ago.', evidence: 'No reply has been recorded.', summary: 'A friendly follow-up is ready.' },
    { id: 'action-5', type: 'Invoice approval', title: 'INV-2079 approved', status: 'Completed', client: 'Koru Early Learning', amount: 780, recommended_action: 'No action required', reason: 'Payment was confirmed.', evidence: 'Accounting status matched.', summary: 'The record is complete.' },
  ],
  xero: { connected: true, xero_connected: true, tenant_name: 'Northline Property Care', status: 'connected' },
};

async function mockStudioApi(page) {
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^.*\/api/, '');
    let body = { success: true };

    if (request.method() === 'GET') {
      if (path === '/auth/me') body = { user: owner };
      else if (path === '/jobs') body = { jobs: fixtures.jobs };
      else if (path === '/clients') body = { clients: fixtures.clients };
      else if (path === '/team/workers' || path === '/team') body = { team: fixtures.team };
      else if (path === '/quotes') body = { quotes: fixtures.quotes };
      else if (path === '/invoices') body = { invoices: fixtures.invoices };
      else if (path === '/approved-notifications' || path === '/messages') body = { messages: fixtures.messages };
      else if (path === '/ai/actions') body = { actions: fixtures.actions };
      else if (path === '/xero/status') body = fixtures.xero;
    }

    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
}

async function openStudio(page) {
  await mockStudioApi(page);
  await page.goto('/dashboard');
  await expect(page.locator('[data-churvox-layout="fresh-studio"]')).toBeVisible();
  await expect(page.locator('.cvsControlBeam')).toBeVisible();
}

const pages = [
  'today', 'jobs', 'schedule', 'recurring', 'clients', 'money', 'quotes', 'invoices',
  'accounting', 'crew', 'field', 'timesheets', 'access', 'messages', 'command',
  'parked', 'completed', 'settings', 'plans', 'support',
];

test('fresh studio desktop visual atlas', async ({ page }, testInfo) => {
  await openStudio(page);
  for (const name of pages) {
    await page.evaluate((next) => {
      window.history.pushState({}, '', next === 'today' ? '/dashboard' : `/dashboard#${next}`);
      window.dispatchEvent(new Event('hashchange'));
      window.scrollTo(0, 0);
    }, name);
    await page.waitForTimeout(180);
    await expect(page.locator(`[data-churvox-layout="fresh-studio"].page-${name}`)).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`desktop-${name}.png`), fullPage: true });
  }
});

test('fresh studio mobile visual atlas', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openStudio(page);
  for (const name of ['today', 'jobs', 'schedule', 'clients', 'money', 'crew', 'messages', 'command', 'settings', 'plans']) {
    await page.evaluate((next) => {
      window.history.pushState({}, '', next === 'today' ? '/dashboard' : `/dashboard#${next}`);
      window.dispatchEvent(new Event('hashchange'));
      window.scrollTo(0, 0);
    }, name);
    await page.waitForTimeout(180);
    await expect(page.locator(`[data-churvox-layout="fresh-studio"].page-${name}`)).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`mobile-${name}.png`), fullPage: true });
  }
});
