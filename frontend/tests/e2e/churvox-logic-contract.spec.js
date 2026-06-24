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
});
