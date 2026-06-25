const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

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

test.describe('Churvox worker app contracts', () => {
  test('worker job detail is a field companion, not a mini owner dashboard', () => {
    const detail = readFrontendSource('pages/worker/WorkerJobDetailPage.js');

    expect(detail).toContain('WORKER_APP_14_FIELD_FLOW_20260625');
    expect(detail).toContain('WorkerFieldFlow.css');

    for (const required of [
      'On my way',
      'Started',
      'Paused',
      'Need help',
      'Start timer',
      'Customer contact',
      'Hidden by owner',
      'Checklist',
      'Photos and message',
      'Materials',
      'Issue found',
      'Daily wrap-up',
      'offline update',
      'I’ve finished this job',
    ]) {
      expect(detail, `Worker job detail should include ${required}`).toContain(required);
    }

    for (const field of ['worker_checklist', 'materials_used', 'issue_found', 'worker_time_minutes', 'worker_app_flow']) {
      expect(detail, `Completion/update payload should include ${field}`).toContain(field);
    }
  });

  test('worker bottom nav stays focused on worker tasks', () => {
    const nav = readFrontendSource('components/worker/WorkerBottomNav.js');

    for (const label of ['Today', 'Jobs', 'Messages', 'Profile']) {
      expect(nav).toContain(`label: "${label}"`);
    }

    for (const forbidden of ['Command', 'Invoices', 'Quotes', 'Payroll', 'Accounting']) {
      expect(nav).not.toContain(forbidden);
    }
  });
});
