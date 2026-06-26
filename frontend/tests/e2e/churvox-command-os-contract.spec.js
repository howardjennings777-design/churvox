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
  test('Command shows a completed filled form wired to owner approval controls', () => {
    const app = readFreshSource('FreshApp.jsx');
    const command = readFreshSource('FreshCommand.jsx');
    const os = readFreshSource('FreshCommandOperatingSystem.jsx');
    const styles = readFreshSource('freshCommandOperatingSystem.css');
    const previewStyles = readFreshSource('freshCommandPreviewFix.css');

    expect(app).toContain('import "./freshCommandOperatingSystem.css";');
    expect(app).toContain('import "./freshCommandPreviewFix.css";');
    expect(command).toContain('FreshCommandOperatingSystem');
    expect(os).toContain('COMMAND_OS_MARKER_20260625');
    expect(os).toContain('COMMAND_CLEAN_FILLED_FORM_MARKER_20260627');
    expect(os).toContain('COMMAND_FORM_FIRST_MARKER_20260627');
    expect(os).toContain('COMMAND_REAL_COMPLETED_FORM_MARKER_20260627');
    expect(os).not.toContain('import "./freshCommandOperatingSystem.css";');

    for (const concept of [
      'buildFilledFormRows',
      'selectedApprovalDetails',
      'firstValue',
      'findFieldValue',
      'sourcesFor',
      'onApproveFix',
      'onSaveFix',
      'onIgnoreFix',
      'onPrepareNotes',
      'selectedHasConcreteAction',
    ]) {
      expect(os, `${concept} should stay first-class in Command`).toContain(concept);
    }

    for (const label of [
      'Filled approval form',
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
      'Owner note / edit',
      'Record',
    ]) {
      expect(os, `${label} should stay visible`).toContain(label);
    }

    for (const removedCopy of [
      'Proof checked',
      'What happens if I approve?',
      'Decision trail',
      'Business Health / view-only intelligence',
      'No-clutter rule',
      'Get stronger proof',
    ]) {
      expect(os, `${removedCopy} should not return to the filled form`).not.toContain(removedCopy);
    }

    for (const className of [
      'freshCommandCleanDesk',
      'freshCommandFormShell',
      'freshCommandPreparedForm',
      'freshCommandFormTop',
      'freshCommandFilledRows',
      'freshCommandOwnerNote',
      'freshCommandRecordId',
      'freshCommandFormFooter',
      'freshCommandFixActions',
    ]) {
      expect(previewStyles, `${className} should keep its UI styling`).toContain(className);
      expect(os, `${className} should stay wired in the component`).toContain(className);
    }

    expect(previewStyles).toContain('CHURVOX_COMMAND_CLEAN_FILLED_FORM_20260627');
    expect(previewStyles).toContain('.freshCommandStablePage > .freshHero');
    expect(previewStyles).toContain('.freshCommandStablePage > .freshGrid');
    expect(previewStyles).toContain('display: none !important');
    expect(previewStyles).toContain('width: min(100%, 1040px)');
    expect(previewStyles).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))');
    expect(previewStyles).toContain('overflow-wrap: anywhere');

    expect(styles).toContain('.freshCommandStablePage .freshGrid > .freshJobsListCard');
    expect(styles).toContain('max-height: 430px !important');
    expect(styles).toContain('overflow-y: scroll !important');
    expect(styles).toContain('scrollbar-width: auto !important');
    expect(styles).toContain('display: block !important');
    expect(styles).toContain('word-break: break-word');

    expect(command).toContain('function approvalGroupKey');
    expect(command).toContain('function groupCommandRows');
    expect(command).toContain('function duplicateBackendRows');
    expect(command).toContain('const visibleGroups = groupCommandRows(visibleRows)');
    expect(command).toContain('async function archiveDuplicateApprovals');
    expect(command).toContain('Archive ${duplicateRows.length} duplicates');
    expect(command).toContain('Archived as duplicate from grouped Command queue.');
    expect(command).toContain('freshCommandGroupCount');
    expect(command).toContain('freshCommandGroupedMeta');
    expect(styles).toContain('.freshCommandGroupCount');
    expect(styles).toContain('.freshCommandGroupedMeta');
  });
});
