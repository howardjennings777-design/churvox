#!/usr/bin/env node
const fs = require('fs');
const read = (path) => fs.readFileSync(path, 'utf8');
const app = read('frontend/src/App.js');
const shell = read('frontend/src/churvox-office-lab/OfficeTeamLabSite.jsx');
const nav = read('frontend/src/churvox-office-lab/OfficeTeamOwnerNavigation.jsx');
const logout = read('frontend/src/runtime/churvoxVisibleLogoutRuntime.js');
const css = read('frontend/src/churvox-office-lab/OfficeTeamVisualRepair.css');
const usage = read('backend/churvox_plan_usage_routes.py');
const guard = read('backend/churvox_plan_usage_guard_patch.py');
const checks = [
  ['loading screen is identifiable', app.includes('cvAuthLoading min-h-screen')],
  ['verified snapshot renders during refresh', (app.match(/if \(loading && !user\) return <Spinner \/>;/g) || []).length >= 2],
  ['visual deployment fingerprint exists', app.includes('churvox-owner-visual-repair-20260713e')],
  ['native logout is marked', shell.includes('data-churvox-native-logout="true"')],
  ['final repair stylesheet is imported', shell.includes('OfficeTeamVisualRepair.css')],
  ['mobile utility links live in More', nav.includes('cvOwnerMoreUtility') && nav.includes('Account and help')],
  ['floating logout yields to native control', logout.includes('if (nativeLogout || authenticating)')],
  ['quick intake contrast is explicit', css.includes('.cvBrainIntake h3') && css.includes('#fff8ed')],
  ['quote stages are height bounded', css.includes('max-height: 440px') && css.includes('overflow-y: auto')],
  ['mobile plans use a compact carousel', css.includes('scroll-snap-type: x mandatory')],
  ['controls meet touch target', css.includes('.cvSafeControlButtons button') && css.includes('min-height: 44px')],
  ['plan usage route uses Starlette request injection', usage.includes('request: StarletteRequest') && !usage.includes('request: Request')],
  ['plan usage guard uses Starlette request injection', guard.includes('request: StarletteRequest') && !guard.includes('request: Request')],
];
for (const [name, pass] of checks) {
  console.log(`${pass ? 'PASS' : 'FAIL'} — ${name}`);
  if (!pass) process.exitCode = 1;
}
