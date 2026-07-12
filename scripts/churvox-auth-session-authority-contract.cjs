#!/usr/bin/env node
const fs = require('fs');
const auth = fs.readFileSync('frontend/src/context/AuthContext.js', 'utf8');
const app = fs.readFileSync('frontend/src/App.js', 'utf8');
const checks = [
  ['authoritative access flag', auth.includes('if (user.has_app_access === true) return true;')],
  ['explicit false remains a lock', auth.includes('user.has_app_access === false')],
  ['owner grace is bounded', auth.includes('const BUSINESS_OFFLINE_GRACE_MS = 1000 * 60 * 15;')],
  ['owner fallback is transient only', auth.includes('if (transient && businessSession && offlineBusinessSnapshot(businessSession))')],
  ['401 and 403 clear session', auth.includes('if (status === 401 || status === 403) clearStoredAuth({ clearPlanState: true });')],
  ['new frontend fingerprint', app.includes('churvox-auth-session-authority-20260713d')],
];
for (const [name, pass] of checks) {
  console.log(`${pass ? 'PASS' : 'FAIL'} — ${name}`);
  if (!pass) process.exitCode = 1;
}
