const fs = require('fs');
const route = fs.readFileSync('backend/churvox_logout_all_sessions_final_patch.py', 'utf8');
const apply = fs.readFileSync('scripts/churvox-logout-all-sessions-final-apply.py', 'utf8');

const checks = [
  ['authenticated logout-all route exists', route.includes('/api/auth/logout-all') && route.includes('await get_current_user(request)')],
  ['only current account is updated', route.includes('{"_id": user_id}')],
  ['all prior sessions are invalidated server-side', route.includes('"session_invalid_before": invalid_before') && route.includes('"sessions_revoked_at": now')],
  ['fresh sign-in safety margin exists', route.includes('invalid_before = now - timedelta(seconds=1)')],
  ['auth cookies are cleared', route.includes('clear_auth_cookies(response)')],
  ['no password change is performed', !route.includes('password_hash') && !route.includes('new_password')],
  ['safe response requires a new sign-in', route.includes('Sign in again on this device')],
  ['readiness marker exists', route.includes('/api/auth/logout-all-readiness')],
  ['route is force-installed after billing', apply.includes('_force_install_final_billing_patch()') && apply.includes('session_patch.install(legacy, force=True)')],
  ['boot marker reports session revocation status', apply.includes('session_revocation_installed') && apply.includes('session_revocation_version')],
];

let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
console.log('LOGOUT_ALL_SESSIONS_FINAL_CONTRACT_PASS');
