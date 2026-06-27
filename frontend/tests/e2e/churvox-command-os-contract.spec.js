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

test.describe('Churvox Command operating system', () => {
  test('Command is a rebuilt approval page with a filled form and wired controls', () => {
    const app = readFreshSource('FreshApp.jsx');
    const command = readFreshSource('FreshCommand.jsx');
    const styles = readFreshSource('freshCommandPreviewFix.css');

    expect(app).toContain('import "./freshCommandPreviewFix.css";');
    expect(command).toContain('COMMAND_REPLACED_APPROVAL_PAGE_MARKER_20260627');
    expect(command).not.toContain('FreshCommandOperatingSystem');

    for (const wiredFunction of [
      'loadReview',
      'approveSelected',
      'approveOrPrepareSelected',
      'saveSelected',
      'ignoreSelected',
      'archiveDuplicateApprovals',
      'prepareNotes',
      'checkForWork',
      'openSelectedRecord',
    ]) {
      expect(command, `${wiredFunction} should stay wired`).toContain(wiredFunction);
    }

    for (const apiCall of [
      '/ai-review-items?limit=200',
      '/approve',
      '/ignore',
      '/tell-churvox/prepare',
    ]) {
      expect(command, `${apiCall} should stay wired`).toContain(apiCall);
    }

    for (const className of [
      'freshCommandRebuild',
      'freshCommandRebuildHero',
      'freshCommandStatsRow',
      'freshCommandStatusStrip',
      'freshCommandBoard',
      'freshCommandQueuePanel',
      'freshCommandQueueList',
      'freshCommandFormPanel',
      'freshCommandFilledForm',
      'freshCommandOwnerEdit',
      'freshCommandFormActions',
      'freshCommandSidePanel',
    ]) {
      expect(command, `${className} should be rendered`).toContain(className);
      expect(styles, `${className} should be styled`).toContain(className);
    }

    for (const visibleText of [
      'Ready for approval',
      'Churvox does the admin. You check the filled form and approve it.',
      'Approval queue',
      'Owner control',
      'Recent decisions',
      'Customer',
      'Job',
      'Address',
      'Price',
      'Billing',
      'Date',
      'Worker',
      'Recurring',
      'Action',
      'Approve form',
      'Save edit',
      'Park for now',
      'Open record',
      'Check for work',
      'Refresh',
    ]) {
      expect(command, `${visibleText} should stay visible`).toContain(visibleText);
    }

    for (const removedCopy of [
      'Proof checked',
      'What happens if I approve?',
      'Decision trail',
      'Business Health / view-only intelligence',
      'No-clutter rule',
      'Get stronger proof',
      'Review prepared form',
      'Hide prepared form',
    ]) {
      expect(command, `${removedCopy} should not return`).not.toContain(removedCopy);
    }

    expect(styles).toContain('CHURVOX_COMMAND_REBUILT_APPROVAL_PAGE_20260627');
    expect(styles).not.toContain('.freshCommandStablePage > .freshHero');
    expect(styles).not.toContain('display: none !important');
    expect(styles).toContain('grid-template-columns: minmax(300px, .9fr) minmax(480px, 1.45fr) minmax(290px, .82fr)');
    expect(styles).toContain('height: clamp(520px, calc(100vh - 300px), 660px)');
    expect(styles).toContain('grid-template-rows: auto auto minmax(0, 1fr)');
    expect(styles).toContain('overflow-y: auto');
    expect(styles).toContain('overflow-wrap: anywhere');
  });
});
