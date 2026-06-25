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
  test('Command includes the seven defensible moat surfaces', () => {
    const command = readFreshSource('FreshCommand.jsx');
    const os = readFreshSource('FreshCommandOperatingSystem.jsx');
    const styles = readFreshSource('freshCommandOperatingSystem.css');

    expect(command).toContain('FreshCommandOperatingSystem');
    expect(os).toContain('COMMAND_OS_MARKER_20260625');

    for (const concept of [
      'adminDebtItems',
      'adminDebtTotal',
      'commandReasoningRows',
      'jobToCashSteps',
      'businessMemorySignals',
      'proofPackRows',
      'commandBriefRows',
      'noClutterRules',
    ]) {
      expect(os, `${concept} should stay first-class in Command`).toContain(concept);
    }

    for (const label of [
      'Admin Debt Meter',
      'Command Reasoning Card',
      'Job-To-Cash Autopilot',
      'Business Memory',
      'Proof Pack',
      "Today's Command Brief",
      'No-Clutter Intelligence',
    ]) {
      expect(os, `${label} should stay visible`).toContain(label);
    }

    for (const className of [
      'freshCommandOperatingSystem',
      'freshCommandDebtMeter',
      'freshCommandReasoningCard',
      'freshCommandJobToCash',
      'freshCommandMemory',
      'freshCommandProofPack',
      'freshCommandBrief',
      'freshCommandNoClutter',
    ]) {
      expect(styles, `${className} should keep its UI styling`).toContain(className);
    }

    expect(styles).toContain('.freshCommandStablePage .freshJobsListCard');
    expect(styles).toContain('max-height: 560px');
    expect(styles).toContain('overflow-y: auto');
    expect(styles).toContain('scrollbar-gutter: stable');
    expect(styles).toContain('overflow-wrap: anywhere');
  });
});
