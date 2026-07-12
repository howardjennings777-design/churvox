#!/usr/bin/env node
const fs = require('fs');
const guard = fs.readFileSync('frontend/src/churvox-office-lab/OfficeTeamOwnerScreenGuard.jsx', 'utf8');
const logout = fs.readFileSync('frontend/src/runtime/churvoxVisibleLogoutRuntime.js', 'utf8');
const css = fs.readFileSync('frontend/src/churvox-office-lab/OfficeTeamVisualRepair.css', 'utf8');
const app = fs.readFileSync('frontend/src/App.js', 'utf8');
const checks = [
  ['guard starts from verified snapshot', guard.includes('React.useState(() => !active || Boolean(user))')],
  ['guard ignores refresh loading when user exists', guard.includes('if (!active || !user)') && !guard.includes('if (!active || loading || !user)')],
  ['guard loading requires missing user or readiness', guard.includes('if (active && (!user || !ready))')],
  ['floating logout hides on guard screen', logout.includes(".cvAuthLoading, .cvOwnerScreenGuardLoading")],
  ['desktop owner navigation is at least 44px', css.includes('.cvOwnerReady .cvOwnerUtilityNav button') && css.includes('min-height: 44px')],
  ['final visual fingerprint exists', app.includes('churvox-owner-visual-repair-20260713f')],
];
for (const [name, pass] of checks) {
  console.log(`${pass ? 'PASS' : 'FAIL'} — ${name}`);
  if (!pass) process.exitCode = 1;
}
