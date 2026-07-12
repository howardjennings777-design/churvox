#!/usr/bin/env node
const fs = require('fs');

const auth = fs.readFileSync('frontend/src/context/AuthContext.js', 'utf8');
const app = fs.readFileSync('frontend/src/App.js', 'utf8');
const index = fs.readFileSync('frontend/src/index.js', 'utf8');
const guard = fs.readFileSync('frontend/src/runtime/churvoxProtectedFetchAuthGuardRuntime.js', 'utf8');

const checks = [
  ['cached profile is not initial live user', auth.includes('const [user, setUser] = useState(null);')],
  ['auth state is published', auth.includes('publishAuthState("checking")') && auth.includes('publishAuthState("authenticated"') && auth.includes('publishAuthState("anonymous")')],
  ['axios default auth header is maintained', auth.includes('axios.defaults.headers.common.Authorization') && auth.includes('setAxiosAuthToken(requestToken)')],
  ['protected axios 401 expires session', auth.includes('axios.interceptors.response.use') && auth.includes('churvox-auth-expired')],
  ['owner route blocks during all auth loading', (app.match(/if \(loading\) return <Spinner \/>;/g) || []).length >= 3],
  ['old cached-user loading bypass removed', !app.includes('if (loading && !user) return <Spinner />;')],
  ['owner and worker runtimes require auth', index.includes("!isOwnerApp || !protectedAuthReady()") && index.includes("!path.startsWith('/worker') || !protectedAuthReady()")],
  ['runtime reloads after auth state', index.includes("window.addEventListener('churvox-auth-state', checkRuntimeLoads)")],
  ['protected fetch guard imported before app', index.indexOf("churvoxProtectedFetchAuthGuardRuntime") < index.indexOf("import App from './App'" )],
  ['fetch guard waits for auth', guard.includes('waitForAuth') && guard.includes("status !== 'authenticated'")],
  ['fetch guard ignores auth/me and login', guard.includes("'/api/auth/me'") && guard.includes("'/api/auth/login'")],
  ['fetch guard emits one expiry event', guard.includes('__CHURVOX_LAST_AUTH_EXPIRED_EVENT__') && guard.includes("new Event('churvox-auth-expired')")],
  ['new deployment fingerprint present', app.includes('churvox-auth-401-storm-repair-20260713b')],
];

let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
console.log(`AUTH_401_STORM_CONTRACT_PASS ${checks.length}`);
