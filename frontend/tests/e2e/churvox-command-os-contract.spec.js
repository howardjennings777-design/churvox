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
  test('Command keeps the owner approval operating system surfaces', () => {
    const app = readFreshSource('FreshApp.jsx');
    const command = readFreshSource('FreshCommand.jsx');
    const os = readFreshSource('FreshCommandOperatingSystem.jsx');
    const topNine = readFreshSource('FreshTopNineOperatingLayer.jsx');
    const styles = readFreshSource('freshCommandOperatingSystem.css');
    const previewStyles = readFreshSource('freshCommandPreviewFix.css');
    const topNineStyles = readFreshSource('freshTopNineOperatingLayer.css');

    expect(app).toContain('import "./freshCommandOperatingSystem.css";');
    expect(app).toContain('import "./freshCommandPreviewFix.css";');
    expect(command).toContain('FreshCommandOperatingSystem');
    expect(os).toContain('COMMAND_OS_MARKER_20260625');
    expect(os).not.toContain('import "./freshCommandOperatingSystem.css";');

    for (const concept of [
      'adminDebtTotal',
      'fixItems',
      'moneyItems',
      'highItems',
      'selectedGaps',
      'buildProofRows',
      'buildDecisionTrail',
      'buildRiskBadge',
      'buildPreparedFormRows',
      'FreshTopNineOperatingLayer',
    ]) {
      expect(os, `${concept} should stay first-class in Command`).toContain(concept);
    }

    for (const marker of [
      'COMMAND_APPROVAL_BRAIN_MARKER_20260626',
      'COMMAND_APPROVAL_QUALITY_GUARD_MARKER_20260626',
      'COMMAND_TAPPABLE_CARDS_MARKER_20260626',
      'COMMAND_FIX_DESK_MARKER_20260626',
      'COMMAND_FIX_DESK_FULL_CONTROLS_MARKER_20260626',
      'COMMAND_FIX_DESK_EMPTY_STATE_MARKER_20260626',
      'COMMAND_FIX_DESK_DECISION_TRAIL_MARKER_20260626',
      'COMMAND_FIX_DESK_RISK_BADGE_MARKER_20260626',
      'COMMAND_FIX_DESK_APPROVE_GUARD_MARKER_20260626',
      'COMMAND_FIX_DESK_FORM_PREVIEW_MARKER_20260626',
    ]) {
      expect(os, `${marker} should keep protecting Command`).toContain(marker);
    }

    for (const label of [
      'Command Fix Desk',
      'Decision-only page',
      'Check for work',
      'Prepare notes',
      'What happens if I approve?',
      'Proof + context',
      'Business Health / view-only intelligence',
      'Business memory',
      'No-clutter rule',
    ]) {
      expect(os, `${label} should stay visible`).toContain(label);
    }

    for (const label of [
      'Business Health',
      'What needs attention across the business',
      'Ready to invoice',
      'Command approvals',
      'Admin debt',
      'Missing information',
      'Admin catch-up',
      'Setup help',
      'Plan clarity',
    ]) {
      expect(topNine, `${label} should stay visible in Business Health`).toContain(label);
    }

    for (const className of [
      'freshCommandOsWrap',
      'freshCommandFixDesk',
      'freshCommandFixHeader',
      'freshCommandDeskToolbar',
      'freshCommandFixGrid',
      'freshCommandFixQueue',
      'freshCommandFixDetail',
      'freshCommandFixProof',
      'freshCommandBusinessHealth',
    ]) {
      expect(styles, `${className} should keep its UI styling`).toContain(className);
    }

    for (const className of [
      'freshTopNineLayer',
      'freshTopNineHeader',
      'freshTopNineGrid',
      'freshTopNineCard',
      'freshTopNinePlaybook',
    ]) {
      expect(topNineStyles, `${className} should keep Business Health styling`).toContain(className);
    }

    expect(topNine).toContain('CHURVOX_BUSINESS_HEALTH_MARKER_20260627');
    expect(topNineStyles).toContain('CHURVOX_BUSINESS_HEALTH_MARKER_20260627');

    expect(styles).toContain('.freshCommandStablePage .freshGrid > .freshJobsListCard');
    expect(styles).toContain('max-height: 430px !important');
    expect(styles).toContain('overflow-y: scroll !important');
    expect(styles).toContain('scrollbar-width: auto !important');
    expect(styles).toContain('display: block !important');
    expect(styles).toContain('overflow-wrap: anywhere');

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

    expect(previewStyles).toContain('CHURVOX_COMMAND_INLINE_PREPARED_FORM_20260626');
    expect(previewStyles).toContain('CHURVOX_COMMAND_APPROVAL_DESK_V1_20260626');
    expect(previewStyles).toContain('.freshCommandInlinePreparedForm');
    expect(previewStyles).toContain('.freshCommandFixHeader > span::after');
    expect(previewStyles).toContain('Command Approval Desk');
    expect(previewStyles).toContain('Churvox does the admin. You approve.');
    expect(previewStyles).toContain('grid-template-columns: repeat(2, minmax(0, 1fr)) !important');
    expect(previewStyles).toContain('overflow-wrap: anywhere');
  });
});
