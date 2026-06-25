const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

function readFreshSource(filename) {
  const roots = [process.cwd(), path.join(process.cwd(), 'frontend'), path.join(process.cwd(), '..'), path.join(process.cwd(), '..', 'frontend')];

  for (const root of roots) {
    const candidates = [
      path.join(root, 'src', 'churvox-fresh', filename),
      path.join(root, 'frontend', 'src', 'churvox-fresh', filename),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) return fs.readFileSync(candidate, 'utf8');
    }
  }

  throw new Error(`Unable to find frontend/src/churvox-fresh/${filename} from ${process.cwd()}`);
}

function readFrontendSource(filename) {
  const roots = [process.cwd(), path.join(process.cwd(), 'frontend'), path.join(process.cwd(), '..'), path.join(process.cwd(), '..', 'frontend')];

  for (const root of roots) {
    const candidates = [
      path.join(root, 'src', filename),
      path.join(root, 'frontend', 'src', filename),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) return fs.readFileSync(candidate, 'utf8');
    }
  }

  throw new Error(`Unable to find frontend/src/${filename} from ${process.cwd()}`);
}

function readPublicSource(filename) {
  const roots = [process.cwd(), path.join(process.cwd(), 'frontend'), path.join(process.cwd(), '..'), path.join(process.cwd(), '..', 'frontend')];

  for (const root of roots) {
    const candidates = [
      path.join(root, 'public', filename),
      path.join(root, 'frontend', 'public', filename),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) return fs.readFileSync(candidate, 'utf8');
    }
  }

  throw new Error(`Unable to find frontend/public/${filename} from ${process.cwd()}`);
}

function readBackendSource(filename) {
  const roots = [process.cwd(), path.join(process.cwd(), '..'), path.join(process.cwd(), '..', '..')];

  for (const root of roots) {
    const candidates = [
      path.join(root, 'backend', filename),
      path.join(root, 'frontend', '..', 'backend', filename),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) return fs.readFileSync(candidate, 'utf8');
    }
  }

  throw new Error(`Unable to find backend/${filename} from ${process.cwd()}`);
}

test.describe('Churvox logic contracts', () => {
  test('Command approval cards keep concrete job facts visible', () => {
    const source = readFreshSource('FreshCommand.jsx');

    expect(source).toContain('APPROVAL_DETAIL_FIELDS');
    expect(source).toContain('approvalDetailRows');
    expect(source).toContain('selectedApprovalDetails');
    expect(source).toContain('freshCommandApprovalDetails');

    for (const label of ['Customer', 'Job', 'Address', 'Price', 'Billing', 'Date', 'Worker', 'Recurring']) {
      expect(source, `Command should keep ${label} as a first-class approval fact`).toContain(`label: "${label}"`);
    }

    expect(source).toMatch(/fixed_price|amount|job_price|quoted_price|invoice_total|quote_total/);
    expect(source).toMatch(/billing_type|pricing_type|invoice_type|charge_type|rate_type/);
    expect(source).toMatch(/recurring_frequency|repeat_frequency|recurring_rule|next_visit_date/);
    expect(source).toMatch(/price\s*(?:\/|or)\s*amount/i);
    expect(source).toMatch(/recurring yes\/no/i);
  });

  test('Owner side navigation keeps the selected section obvious', () => {
    const app = readFreshSource('FreshApp.jsx');
    const styles = readFreshSource('freshOwnerShellFinal.css');

    expect(app).toContain('function syncPageHash');
    expect(app).toContain('window.addEventListener("hashchange", applyHashRoute)');
    expect(app).toContain('window.history.replaceState');
    expect(app).toContain('<FreshShell active={page} onNavigate={navigate}>');

    expect(styles).toContain('CHURVOX_SIDE_NAV_ACTIVE_STATE_20260624');
    expect(styles).toMatch(/\.freshSide\s+\.freshNav\s+button\.active/);
    expect(styles).toMatch(/background:\s*linear-gradient/);
    expect(styles).toMatch(/button\.active::before/);
  });

  test('Notification bell has a real clear action that hides old items', () => {
    const bell = readFreshSource('FreshNotificationBell.jsx');

    expect(bell).toContain('CLEAR_BEFORE_KEY');
    expect(bell).toContain('function getStoredClearBefore');
    expect(bell).toContain('function shouldShowItem');
    expect(bell).toContain('async function clearNotifications');
    expect(bell).toContain('window.localStorage.setItem(CLEAR_BEFORE_KEY, String(clearPoint))');
    expect(bell).toContain('setItems([])');
    expect(bell).toContain('title="Clear notifications"');
    expect(bell).toContain('<Trash2 size={16} />');
  });

  test('Command approval executor updates real records, not just the slip status', () => {
    const source = readBackendSource('ai_operator_routes.py');

    expect(source).toContain('async def _execute');
    expect(source).toMatch(/result = await _execute\(db, business_id, current_user, action\)/);
    expect(source).toMatch(/"status": "approved"[\s\S]*"result": result/);

    for (const actionKey of [
      'assign_worker_to_job',
      'fix_job_blocker',
      'fix_client_record',
      'approve_quote_action',
      'approve_money_action',
      'accept_worker_update',
      'approve_time_review',
    ]) {
      expect(source, `${actionKey} should stay wired into the approval executor`).toContain(`action_key == "${actionKey}"`);
    }

    expect(source).toContain('db.jobs.update_one');
    expect(source).toContain('db.clients.update_one');
    expect(source).toContain('db.quotes.update_one');
    expect(source).toContain('db.invoices.update_one');
    expect(source).toContain('db.xero_sync_queue.insert_one');
    expect(source).toContain('db.field_activity_events.insert_one');
  });

  test('AI review feed keeps generic non-approvals out of Command Open', () => {
    const source = readBackendSource('churvox_ai_operator_routes.py');

    expect(source).toContain('GENERIC_REVIEW_PHRASES');
    expect(source).toContain('"ai prepared admin work"');
    expect(source).toContain('"needs_clarification"');
    expect(source).toContain('def is_approval_ready');
    expect(source).toContain('item["preparedForApproval"] = is_approval_ready(item)');
    expect(source).toContain('item["status"] = "needs_preparation"');
    expect(source).toMatch(/if item\.get\("preparedForApproval"\):\s*\n\s*items\.append\(item\)/);
  });

  test('CSV import stays on setup record pages only', () => {
    const clients = readFreshSource('FreshClients.jsx');
    const team = readFreshSource('FreshTeam.jsx');
    const importer = readFreshSource('FreshCsvImportButton.jsx');
    const backend = readBackendSource('server.py');

    expect(backend).toContain('@api_router.post("/clients/import-csv")');
    expect(backend).toContain('@api_router.post("/team/import-csv")');

    expect(clients).toContain('FreshCsvImportButton');
    expect(clients).toContain('endpoint="/clients/import-csv"');
    expect(clients).toContain('Import clients CSV');

    expect(team).toContain('FreshCsvImportButton');
    expect(team).toContain('endpoint="/team/import-csv"');
    expect(team).toContain('Import team CSV');

    expect(importer).toContain('accept=".csv,text/csv"');
    expect(importer).toContain('data-churvox-csv-import={endpoint}');
    expect(importer).toContain('formData.append("file", file)');

    for (const filename of ['FreshJobs.jsx', 'FreshQuotes.jsx', 'FreshInvoices.jsx', 'FreshCommand.jsx']) {
      expect(readFreshSource(filename), `${filename} should stay a clean record or approval page, not a CSV import surface`).not.toContain('import-csv');
    }
  });

  test('Team modal stays closable during human audit sweeps', () => {
    const team = readFreshSource('FreshTeam.jsx');

    expect(team).toContain('freshPopupBackdrop freshModalBackdrop');
    expect(team).toContain('aria-modal="true"');
    expect(team).toContain('aria-label="Add person"');
    expect(team).toContain('if (event.key === "Escape") setAddOpen(false)');
    expect(team).toContain('onClick={() => setAddOpen(false)}>Close</button>');
  });

  test('Public help widget stays off app routes so it cannot cover controls', () => {
    const help = readFrontendSource('components/ChurvoxHelpWidget.jsx');

    expect(help).toContain('APP_ROUTE_PREFIXES');
    for (const route of ['/dashboard', '/jobs', '/clients', '/quotes', '/invoices', '/team', '/calendar', '/payroll', '/worker']) {
      expect(help).toContain(`"${route}"`);
    }
    expect(help).toContain('APP_ROUTE_PREFIXES.some');
    expect(help).toContain('return false;');
  });

  test('Accounting UI does not show MYOB wording', () => {
    const xero = readFreshSource('FreshXero.jsx');

    expect(xero).toContain('Accounting CSV');
    expect(xero).toContain('accounting CSV');
    expect(xero).not.toContain('MYOB');
    expect(xero).not.toContain('MYOB CSV');
  });

  test('Command auto review routes unfinished work into Command', () => {
    const hook = readBackendSource('churvox_stripe_no_card.py');
    const source = readBackendSource('churvox_command_auto_review_routes.py');

    expect(hook).toContain('install_command_auto_review_defaults');
    expect(hook).toContain('install_from_ai_router(self, router, original');
    expect(hook).toContain('_churvox_command_auto_review_hook');
    expect(hook).toContain('install_command_auto_review_defaults()');

    expect(source).toContain('AUTO_COMMAND_REVIEW_20260625');
    expect(source).toContain('async def ensure_auto_command_items');
    expect(source).toContain('"Command Auto Review"');
    expect(source).toContain('"draft_invoice_from_job"');
    expect(source).toContain('"prepare_invoice_followups"');
    expect(source).toContain('"find_records"');
    expect(source).toContain('"Customer"');
    expect(source).toContain('"Price"');
    expect(source).toContain('"Recurring"');

    for (const issue of [
      'completed_job_needs_invoice',
      'blocked_job_needs_decision',
      'doing_job_needs_followup',
      'unfinished_job_needs_worker',
      'unfinished_job_needs_review',
      'invoice_needs_followup',
      'quote_needs_followup',
    ]) {
      expect(source, `${issue} should stay routed to Command`).toContain(issue);
    }
  });

  test('Public marketing leads with the Command approval promise', () => {
    const home = readFrontendSource('pages/marketing/ExecutiveHomePage.jsx');
    const features = readFrontendSource('pages/marketing/ExecutiveFeaturesPage.jsx');
    const pricing = readFrontendSource('pages/marketing/ExecutivePricingPage.jsx');
    const styles = readFrontendSource('pages/marketing/SimplePublicStrong.css');
    const index = readPublicSource('index.html');

    expect(home).toContain('Churvox does the admin. You approve.');
    expect(home).toContain('Traditional field-service tools');
    expect(home).toContain('What Command prepares');
    expect(home).toContain('Clean record pages. One approval desk.');
    expect(home).toContain('simplePreviewQueue');
    expect(home).toContain('Draft invoice ready');
    expect(home).toContain('Owner approval first');
    expect(home).not.toContain('Jobber-style');

    expect(styles).toContain('CHURVOX_PUBLIC_COMMAND_VISUAL_POLISH_20260625');
    expect(styles).toContain('.simpleHeroStats');
    expect(styles).toContain('.simplePreviewActions');
    expect(styles).toMatch(/\.simpleHero>\.simpleCommandMock/);

    expect(features).toContain('The job app keeps records. Command moves the admin forward.');
    expect(features).toContain('Command cards');
    expect(pricing).toContain('Pick how much admin Churvox should prepare for approval.');
    expect(pricing).toContain('Command approval desk for prepared admin');

    expect(index).toContain('Churvox does the admin. You approve.');
    expect(index).not.toContain('AI Operator Command Desk');
  });
});
