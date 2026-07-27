#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const failures = [];
const checks = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function check(name, condition, detail) {
  const passed = Boolean(condition);
  checks.push({ name, passed });
  if (!passed) failures.push(`${name}: ${detail}`);
}

const hq = read('frontend/src/pages/ChurvoxHQPage.jsx');
const app = read('frontend/src/App.js');
const adminRoute = read('frontend/src/components/admin/PlatformAdminRoute.jsx');
const apiBase = read('frontend/src/lib/apiBase.js');
const frontendServer = read('frontend/server.cjs');
const serverWrapper = read('backend/server/__init__.py');
const ownerRoutes = read('backend/churvox_hq_owner_access_fix_patch.py');
const connectionRoutes = read('backend/churvox_hq_connection_status_patch.py');
const growthRoutes = read('backend/churvox_hq_growth_report_patch.py');
const testerRoutes = read('backend/churvox_hq_tester_system_patch.py');
const controlRoutes = read('backend/churvox_hq_control_access_final_patch.py');
const ownerCanonical = read('backend/churvox_hq_hello_canonical_patch.py');
const endpointProof = read('frontend/tests/e2e/churvox-hq-endpoint-wiring.spec.js');
const workflow = read('.github/workflows/churvox-paid-launch-gate.yml');

const readPaths = [
  '/api/admin/owner-overview',
  '/api/admin/owner/paid-launch-report',
  '/api/admin/owner/growth-report',
  '/api/admin/owner/testers',
  '/api/admin/owner/plan-report',
  '/api/admin/owner/control-log',
  '/api/admin/owner/connection',
  '/api/admin/owner/retention-email-status',
];

check(
  'the protected /admin route renders the single HQ page',
  app.includes('<Route path="/admin" element={<PlatformAdminRoute><ChurvoxHQPage /></PlatformAdminRoute>} />')
    && adminRoute.includes('PLATFORM_OWNER_EMAILS')
    && adminRoute.includes('platform_owner')
    && adminRoute.includes('/login?next=%2Fadmin'),
  'The production route must stay behind PlatformAdminRoute and resolve directly to ChurvoxHQPage',
);

check(
  'the HQ frontend declares every live owner read and both tester writes',
  readPaths.every((value) => hq.includes(value))
    && hq.includes('/api/admin/owner/tester-intake')
    && hq.includes('/api/admin/owner/control-access'),
  'The HQ page is missing one or more owner backend paths',
);

check(
  'the HQ transport uses owner auth, first-party cookies and no caching',
  hq.includes('credentials: "include"')
    && hq.includes('cache: "no-store"')
    && hq.includes('Authorization: `Bearer ${token}`')
    && hq.includes('Promise.allSettled(ENDPOINTS.map')
    && hq.includes('window.setInterval(() => load(true), 60000)')
    && hq.includes('await load(true)'),
  'Reads and writes must use authenticated live requests and refresh from the backend after mutations',
);

check(
  'production uses the same-origin /api proxy to the Render backend',
  apiBase.includes('return clean(window.location.origin)')
    && apiBase.includes('HQ_READ_PREFIXES')
    && apiBase.includes('credentials: "include"')
    && frontendServer.includes('const DEFAULT_BACKEND_URL = "https://grassley-backend.onrender.com"')
    && frontendServer.includes('if (urlPath === "/api" || urlPath.startsWith("/api/"))')
    && frontendServer.includes('proxyApiRequest(req, res, urlPath)')
    && frontendServer.includes('req.pipe(proxyReq)'),
  'www.churvox.com must forward browser /api calls to the live Render backend without bypassing auth',
);

check(
  'every HQ read has a concrete owner-only backend provider',
  ownerRoutes.includes('/api/admin/owner-overview')
    && ownerRoutes.includes('/api/admin/owner/plan-report')
    && ownerRoutes.includes('/api/admin/owner/control-log')
    && ownerRoutes.includes('/api/admin/owner/retention-email-status')
    && connectionRoutes.includes('/api/admin/owner/connection')
    && connectionRoutes.includes('/api/admin/owner/paid-launch-report')
    && growthRoutes.includes('app.add_api_route("/api/admin/owner/growth-report"')
    && testerRoutes.includes('("GET", "/api/admin/owner/testers", testers_endpoint)')
    && testerRoutes.includes('("POST", "/api/admin/owner/tester-intake", tester_intake)'),
  'One or more frontend read paths do not have a mounted backend route implementation',
);

check(
  'tester grant and revoke are real database mutations behind the owner guard',
  controlRoutes.includes('remove_route(app, "/api/admin/owner/control-access", "POST")')
    && controlRoutes.includes('db.users.update_one')
    && controlRoutes.includes('db.app_owner_testers.update_one')
    && controlRoutes.includes('db.app_owner_control_log.insert_one')
    && controlRoutes.includes('raise HTTPException(status_code=403')
    && testerRoutes.includes('db.app_owner_testers.update_one')
    && testerRoutes.includes('await grant_existing_user')
    && testerRoutes.includes('send_tester_email'),
  'Tester controls must update live users/tester records and remain platform-owner protected',
);

check(
  'the production backend boot installs all HQ route owners',
  [
    'churvox_hq_owner_access_fix_patch',
    'churvox_hq_connection_status_patch',
    'churvox_hq_growth_report_patch',
    'churvox_hq_tester_system_patch',
    'churvox_hq_control_access_final_patch',
    'churvox_hq_hello_canonical_patch',
    'churvox_hq_hello_only_guard_patch',
  ].every((value) => serverWrapper.includes(`'${value}'`)),
  'A route file is present but not installed by the uvicorn server wrapper',
);

check(
  'all verified platform-owner aliases are canonicalised across backend HQ modules',
  ownerCanonical.includes('howardjennings77@gmail.com')
    && ownerCanonical.includes('howardjennings777@gmail.com')
    && ownerCanonical.includes('churvox_hq_connection_status_patch')
    && ownerCanonical.includes('churvox_hq_tester_system_patch')
    && ownerCanonical.includes('churvox_hq_control_access_final_patch')
    && ownerCanonical.includes('return PLATFORM_OWNER_EMAIL if clean in OWNER_EMAILS else clean'),
  'A permitted frontend owner alias could otherwise receive 403 responses from the backend',
);

check(
  'the browser contract proves all eight exact requests use the same-origin proxy and owner token',
  readPaths.every((value) => endpointProof.includes(`'${value}'`))
    && endpointProof.includes('HQ never requested ${path}')
    && endpointProof.includes('bypassed the same-origin frontend API proxy')
    && endpointProof.includes('did not include the platform-owner bearer token')
    && endpointProof.includes("toBe('Bearer hq-wiring-owner-token')")
    && endpointProof.includes("request.path === '/api/admin/owner/tester-intake'")
    && endpointProof.includes("request.path === '/api/admin/owner/control-access'"),
  'The safe browser gate must fail if any live source or tester mutation is not actually requested',
);

check(
  'the paid-launch workflow executes both the static and browser wiring proofs',
  workflow.includes('node scripts/churvox-hq-end-to-end-wiring-audit.cjs')
    && workflow.includes('tests/e2e/churvox-hq-endpoint-wiring.spec.js'),
  'The new wiring proofs must run automatically on every HQ-related pull request and main push',
);

for (const item of checks) console.log(`${item.passed ? '✓' : '✗'} ${item.name}`);
if (failures.length) {
  console.error(`\nChurvox HQ end-to-end wiring audit failed: ${failures.length} issue(s).`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`\nChurvox HQ end-to-end wiring audit passed: ${checks.length} route, proxy, auth, backend and browser contracts checked.`);
