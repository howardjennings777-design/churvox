#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const failures = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function requireAll(name, source, values) {
  const missing = values.filter((value) => !source.includes(value));
  if (missing.length) failures.push(`${name} is missing: ${missing.join(', ')}`);
}

const wrapper = read('frontend/src/churvox-office-lab/OfficeTeamLab.jsx');
const shell = read('frontend/src/pages/marketing/ChurvoxPublicShell.jsx');
const pricing = read('frontend/src/pages/marketing/ExecutivePricingPage.jsx');
const touchCss = read('frontend/src/pages/marketing/ChurvoxPublicTouchTargets.css');
const loginCss = read('frontend/src/pages/auth/ChurvoxLoginPolish.css');
const settings = read('frontend/src/churvox-office-lab/OfficeTeamSiteSettings.jsx');
const safeControls = read('frontend/src/churvox-office-lab/OfficeTeamSafeControls.jsx');
const ownerTruth = read('frontend/tests/e2e/churvox-owner-no-fake-data.spec.js');
const publicTruth = read('frontend/tests/e2e/churvox-public-honesty-and-function.spec.js');

requireAll('Office Team route normaliser', wrapper, [
  "['team', 'office-team']",
  'function normaliseOfficeHash()',
  'window.history.replaceState(',
  "window.addEventListener('hashchange', handleRoute)",
  "window.addEventListener('popstate', handleRoute)",
  'key: routeVersion',
]);

requireAll('public shell touch-target import', shell, [
  'import "./ChurvoxPublicTouchTargets.css";',
]);

requireAll('pricing contact action', pricing, [
  'href="mailto:hello@churvox.com"',
  'Email hello@churvox.com',
]);

requireAll('desktop public footer targets', touchCss, [
  '.cp26Footer nav a {',
  'min-height: 28px',
  'padding: 5px 6px',
]);

requireAll('mobile public touch targets', touchCss, [
  '@media (max-width: 560px)',
  '.cp26NavLinks a',
  '.cp26NavActions .cp26Button',
  '.cp26Footer nav a',
  '.cp26ContactGrid a',
  'min-height: 44px',
  'touch-action: manipulation',
]);

requireAll('mobile signup and shared auth targets', touchCss, [
  '.cvPublicAuth .cvPublicAuthBottom',
  '.cvPublicAuth .cvPublicAuthBottom a',
  'min-height: 44px',
  'touch-action: manipulation',
]);

requireAll('mobile login recovery and trial targets', loginCss, [
  '@media (max-width: 760px)',
  '.cvChurvoxLogin .cvPublicAuthBottom a',
  'min-height: 44px',
  'touch-action: manipulation',
]);

requireAll('settings selector accessibility', settings, [
  'aria-label="Industry profile"',
  'aria-label="Work style"',
]);

requireAll('prepared-only Command handoff confirmation', safeControls, [
  'created a prepared-only Command item',
  'createOfficeTeamLocalCommand',
]);

if (!/OWNER_SCREENS\s*=\s*\[[^\]]*['"]team['"]/s.test(ownerTruth)) {
  failures.push('owner truth browser test no longer covers the team screen');
}
if (!publicTruth.includes('const mobile = /mobile/i.test(testInfo.project.name)')) {
  failures.push('public truth browser test no longer checks mobile control sizes');
}
if (/\btest\.(?:skip|only)\b|\bdescribe\.only\b/.test(`${ownerTruth}\n${publicTruth}`)) {
  failures.push('truth browser tests contain skipped or focused cases');
}

if (failures.length) {
  console.error(`Route/touch regression audit failed: ${failures.length} issue(s).`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Route/touch regression audit passed. Team routing, labelled settings, prepared-only Command handoff, desktop footer links and 44px mobile public/auth controls are protected.');
