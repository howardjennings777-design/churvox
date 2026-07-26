const { test, expect } = require('@playwright/test');

const owner = {
  id: 'route-owner',
  email: 'route-owner@churvox.test',
  role: 'owner',
  business_id: 'route-business',
  business_name: 'Route Test Services',
  plan: 'enterprise',
  ui_plan: 'command',
  subscription_plan: 'enterprise',
  subscription_status: 'active',
  stripe_subscription_id: 'sub_route_contract',
  has_app_access: true,
  email_verified: true,
};

const pages = {
  today: ['Today', '.cvsToday'],
  jobs: ['Jobs', '.cvsDispatchBoard, .cvsJobList'],
  schedule: ['Jobs', '.cvsWeekBoard'],
  recurring: ['Jobs', '.cvsCadenceBoard'],
  clients: ['Clients', '.cvsClientCockpit'],
  money: ['Money', '.cvsMoneyRiver'],
  quotes: ['Money', '.cvsQuoteRiver'],
  invoices: ['Money', '.cvsLedger'],
  accounting: ['Money', '.cvsAccountingBridge, .cvsEmpty'],
  crew: ['Team', '.cvsCrewMatrix'],
  field: ['Team', '.cvsFieldSignal'],
  timesheets: ['Team', '.cvsTimeBoard'],
  access: ['Team', '.cvsAccessMatrix'],
  messages: ['Messages', '.cvsConversationDesk'],
  command: ['Command', '.cvsDecisionTheatre'],
  parked: ['Command', '.cvsDecisionTheatre'],
  completed: ['Command', '.cvsDecisionTheatre'],
  settings: ['Settings', '.cvsSettingsStudio'],
  support: ['Help', '.cvsSupportStudio'],
};

const entries = [
  ['/dashboard', 'today'],
  ['/dashboard#today', 'today'],
  ['/dashboard#smart', 'today'],
  ['/dashboard#smarthub', 'today'],
  ['/dashboard#smart-hub', 'today'],
  ['/dashboard#aiguide', 'today'],
  ['/dashboard#ai-guide', 'today'],
  ['/dashboard#unknown-old-page', 'today'],
  ['/dashboard#jobs', 'jobs'],
  ['/dashboard#work', 'jobs'],
  ['/dashboard#job', 'jobs'],
  ['/dashboard#schedule', 'schedule'],
  ['/dashboard#calendar', 'schedule'],
  ['/dashboard#recurring', 'recurring'],
  ['/dashboard#repeat-work', 'recurring'],
  ['/dashboard#clients', 'clients'],
  ['/dashboard#money', 'money'],
  ['/dashboard#pulse', 'money'],
  ['/dashboard#quotes', 'quotes'],
  ['/dashboard#invoices', 'invoices'],
  ['/dashboard#reports', 'invoices'],
  ['/dashboard#accounting', 'accounting'],
  ['/dashboard#xero', 'accounting'],
  ['/dashboard#crew', 'crew'],
  ['/dashboard#workers', 'crew'],
  ['/dashboard#staff', 'crew'],
  ['/dashboard#team', 'crew'],
  ['/dashboard#people', 'crew'],
  ['/dashboard#field', 'field'],
  ['/dashboard#worker', 'field'],
  ['/dashboard#dispatch', 'field'],
  ['/dashboard#crew-map', 'field'],
  ['/dashboard#live-field', 'field'],
  ['/dashboard#timesheets', 'timesheets'],
  ['/dashboard#time', 'timesheets'],
  ['/dashboard#payroll', 'timesheets'],
  ['/dashboard#access', 'access'],
  ['/dashboard#messages', 'messages'],
  ['/dashboard#inbox', 'messages'],
  ['/dashboard#command', 'command'],
  ['/dashboard#command-desk', 'command'],
  ['/dashboard#command-board', 'command'],
  ['/dashboard#parked', 'parked'],
  ['/dashboard#completed', 'completed'],
  ['/dashboard#settings', 'settings'],
  ['/dashboard#support', 'support'],
  ['/dashboard#help', 'support'],
  ['/dashboard#guide', 'support'],
  ['/dashboard#setup', 'support'],
  ['/dashboard#setupassistant', 'support'],
  ['/dashboard#firstrun', 'support'],
  ['/dashboard#onboarding', 'support'],
  ['/smart-hub', 'today'],
  ['/command-board', 'command'],
  ['/operator-tools', 'command'],
  ['/jobs', 'jobs'],
  ['/clients', 'clients'],
  ['/quotes', 'quotes'],
  ['/invoices', 'invoices'],
  ['/reports', 'invoices'],
  ['/team', 'crew'],
  ['/team-board', 'crew'],
  ['/payroll', 'timesheets'],
  ['/payroll-board', 'timesheets'],
  ['/dispatch', 'field'],
  ['/dispatch-board', 'field'],
  ['/dispatch/map', 'field'],
  ['/crew-map', 'field'],
  ['/schedule', 'schedule'],
  ['/calendar', 'schedule'],
  ['/settings', 'settings'],
  ['/settings-board', 'settings'],
  ['/support-board', 'support'],
  ['/offline-sync', 'support'],
  ['/onboarding', 'support'],
];

async function prepare(page) {
  await page.addInitScript((user) => {
    localStorage.setItem('token', 'route-token');
    localStorage.setItem('authToken', 'route-token');
    localStorage.setItem('churvox:stable-current-plan:v1', 'command');
    localStorage.setItem('churvox:billing-country', 'NZ');
    localStorage.setItem('churvox_auth_session_snapshot_v1', JSON.stringify({ at: Date.now(), token: 'route-token', user }));
  }, owner);

  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    let body = { success: true, data: [], items: [] };
    if (/\/api\/auth\/(?:me|check|session)$/.test(path)) body = { success: true, user: owner, ...owner };
    else if (path === '/api/jobs') body = { jobs: [] };
    else if (path === '/api/clients') body = { clients: [] };
    else if (path === '/api/team/workers' || path === '/api/team') body = { team: [] };
    else if (path === '/api/quotes') body = { quotes: [] };
    else if (path === '/api/invoices') body = { invoices: [] };
    else if (path === '/api/messages' || path === '/api/approved-notifications') body = { messages: [] };
    else if (path === '/api/ai/actions') body = { actions: [] };
    else if (path === '/api/xero/status') body = { connected: false, xero_connected: false };
    else if (path === '/api/billing/subscription-status') body = { success: true, plan: 'enterprise', current_plan: 'command', subscription_status: 'active', stripe_subscription_id: 'sub_route_contract', has_app_access: true };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
}

async function assertPage(page, expected, entry) {
  const [area, selector] = pages[expected];
  await expect(page.locator(`[data-churvox-layout="fresh-studio"].page-${expected}`), `${entry} rendered the wrong page`).toBeVisible({ timeout: 12000 });
  await expect(page.locator(selector).first(), `${entry} is missing the ${expected} layout`).toBeVisible({ timeout: 12000 });
  await expect(page.locator('.cvsContextIdentity b'), `${entry} shows the wrong area`).toHaveText(new RegExp(`^${area}$`, 'i'));
  if (expected === 'support') await expect(page.locator('.cvsWorkspace')).toContainText(/Help and support/i);
  else await expect(page.locator('.cvsWorkspace')).not.toContainText(/Help and support/i);
}

test('every current, legacy and redirected owner route opens the intended page', async ({ page }) => {
  test.setTimeout(240000);
  await prepare(page);
  for (const [entry, expected] of entries) {
    await page.goto(entry, { waitUntil: 'domcontentloaded' });
    await assertPage(page, expected, entry);
  }
});

test('Plans uses the standalone billing route from both entries', async ({ page }) => {
  await prepare(page);
  for (const entry of ['/plans?country=NZ', '/dashboard#plans']) {
    await page.goto(entry, { waitUntil: 'domcontentloaded' });
    await expect.poll(() => page.url(), { timeout: 12000 }).toMatch(/\/plans(?:[?#]|$)/i);
    await expect(page.locator('.cvStandalonePlansRoute')).toBeVisible({ timeout: 12000 });
    await expect(page.locator('.cvPlanSelect select')).toHaveValue('NZ');
  }
});
