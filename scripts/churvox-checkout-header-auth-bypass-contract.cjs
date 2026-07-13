const fs = require('fs');
const source = fs.readFileSync('backend/churvox_checkout_token_session_guard.py', 'utf8');

const headerIndex = source.indexOf('has_header_auth = authorization.lower().startswith("bearer ")');
const passIndex = source.indexOf('if has_header_auth or has_cookie_auth:');
const bodyIndex = source.indexOf('chunks = []');
const checks = [
  ['guard version updated', source.includes('churvox-checkout-token-session-guard-20260713i')],
  ['Bearer header is detected', headerIndex >= 0],
  ['auth cookies are detected', source.includes('has_cookie_auth = any') && source.includes('"access_token="') && source.includes('"session="')],
  ['authenticated requests pass through', passIndex >= 0 && source.includes('return await self.app(scope, receive, send)')],
  ['pass-through happens before body consumption', headerIndex < passIndex && passIndex < bodyIndex],
  ['legacy body-token flow remains', source.includes('token = _extract_token(body, headers.get("content-type", ""))')],
  ['revoked body tokens still rejected', source.includes('password_revoked') && source.includes('logged_out') && source.includes('Session expired. Sign in again before changing billing.')],
  ['checkout path coverage remains', source.includes('/api/billing/create-checkout-session') && source.includes('/api/billing/create-addon-checkout-session')],
];

let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
console.log('CHECKOUT_HEADER_AUTH_BYPASS_CONTRACT_PASS');
