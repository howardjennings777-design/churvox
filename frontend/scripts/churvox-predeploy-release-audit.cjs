const fs = require('fs');
const path = require('path');

const FRONTEND = path.resolve(__dirname, '..');
const REPO = path.resolve(FRONTEND, '..');
const failures = [];
const checks = [];

function read(base, relativePath) {
  const filePath = path.join(base, relativePath);
  if (!fs.existsSync(filePath)) {
    failures.push(`Missing required file: ${path.relative(REPO, filePath)}`);
    return '';
  }
  return fs.readFileSync(filePath, 'utf8');
}

function check(name, condition, detail) {
  if (condition) checks.push(name);
  else failures.push(`${name}: ${detail}`);
}

function hasAll(text, fragments) {
  return fragments.every((fragment) => text.includes(fragment));
}

const buildBootstrap = read(FRONTEND, 'scripts/churvox-worker-proof-singleton-contract.cjs');
const publicIndex = read(FRONTEND, 'public/index.html');
const testerPage = read(FRONTEND, 'public/testers/index.html');
const sitemap = read(FRONTEND, 'public/sitemap.xml');
const frontendEntry = read(FRONTEND, 'src/index.js');
const frontendServer = read(FRONTEND, 'server.cjs');
const currentPlans = read(FRONTEND, 'src/config/churvoxPlans.js');
const marketingPlans = read(FRONTEND, 'src/lib/marketingPlans.js');
const attributionRuntime = read(FRONTEND, 'src/runtime/churvoxTesterApplicationAttributionRuntime.js');
const testerInbox = read(FRONTEND, 'src/pages/admin/TesterApplicationsInbox.jsx');
const promotionCentre = read(FRONTEND, 'src/pages/admin/ChurvoxPromotionCentre.jsx');
const backendPlans = read(REPO, 'backend/app/plan_rules.py');
const testerBackend = read(REPO, 'backend/churvox_public_tester_application_patch.py');

check(
  'Build runs the predeploy audit',
  buildBootstrap.includes('churvox-predeploy-release-audit.cjs'),
  'The first production build contract must run this audit before checking the worker bundle.',
);
check(
  'Build writes release metadata',
  buildBootstrap.includes('write-release-metadata.cjs'),
  'The first production build contract must create the public release fingerprint.',
);

check(
  'Locked public prices are intact',
  hasAll(currentPlans, [
    'NZ: { solo: 39, team: 89, pro: 149, enterprise: 299',
    'price: 39, monthly: 39',
    'price: 89, monthly: 89',
    'price: 149, monthly: 149',
    'price: 299, monthly: 299',
  ]),
  'Start/Crew/Operator/Command must remain 39/89/149/299.',
);
check(
  'Locked team capacity is intact',
  hasAll(currentPlans, [
    'Up to 15 active team members',
    'Up to 50 active team members',
    'addsTeamMembers: 50',
    'price: 99, monthly: 99',
  ]),
  'Operator must include 15, Command 50, and the $99 Growth Pack must add 50.',
);
check(
  'Secondary marketing catalogue matches locked capacity',
  hasAll(marketingPlans, ['Up to 15 active team members', 'Up to 50 active team members'])
    && !marketingPlans.includes('Up to 12 active team members')
    && !marketingPlans.includes('Up to 25 active team members'),
  'Remove stale 12/25-person limits from the secondary public catalogue.',
);
check(
  'Backend plan capacity matches the public product',
  hasAll(backendPlans, [
    '"price": 39',
    '"price": 89',
    '"price": 149',
    '"price": 299',
    '"included_users": 15',
    '"included_users": 50',
    '"extra_user_block_size": 50',
    '"extra_user_block_price": 99',
  ]),
  'Backend pricing and included-user limits must agree with the public plan configuration.',
);

check(
  'Tester landing page is build-ready',
  hasAll(testerPage, ['/api/public/tester-applications', '30-day', 'up to 10']),
  'The static tester page must keep the selected 30-day offer, ten-place limit and real intake endpoint.',
);
check(
  'Tester page is indexed in the sitemap',
  sitemap.includes('https://www.churvox.com/testers/'),
  'Add the tester landing page to sitemap.xml.',
);
check(
  'Useful public fallback remains available',
  hasAll(publicIndex, ['Your business handled. Your decisions waiting.', '/testers/', '/pricing']),
  'The no-JavaScript homepage must still explain the product and link to the tester and pricing pages.',
);

const attributionIndex = frontendEntry.indexOf("./runtime/churvoxTesterApplicationAttributionRuntime");
const popupIndex = frontendEntry.indexOf("./runtime/churvoxFoundingTesterPopupRuntime");
check(
  'Campaign attribution loads before the popup',
  attributionIndex >= 0 && popupIndex > attributionIndex,
  'The attribution guard must be imported before the Founding Tester popup submits.',
);
check(
  'Attribution stays scoped to tester applications',
  hasAll(attributionRuntime, ["const ENDPOINT = '/api/public/tester-applications'", "requestMethod(input, init) !== 'POST'", 'utm_campaign', 'landing_path']),
  'The runtime must only enrich POST requests to the tester intake endpoint.',
);

check(
  'Frontend API proxy remains first-party',
  hasAll(frontendServer, [
    'const DEFAULT_BACKEND_URL = "https://grassley-backend.onrender.com"',
    'urlPath === "/api" || urlPath.startsWith("/api/")',
    'proxyApiRequest(req, res, urlPath)',
  ]),
  'Production browser calls must continue through the same-origin /api proxy.',
);
check(
  'HTML cannot be trapped behind stale cache',
  hasAll(frontendServer, ['no-store, no-cache, must-revalidate, proxy-revalidate', 'if (urlPath.startsWith("/static/"))']),
  'index.html must be non-cacheable and missing static chunks must return a real 404.',
);

check(
  'Tester backend routes are installed',
  hasAll(testerBackend, [
    '("POST", "/api/public/tester-applications", create_application)',
    '("GET", "/api/admin/owner/tester-applications", list_applications)',
    'No access was granted automatically',
  ]),
  'Public intake and owner-only application listing must remain wired without auto-provisioning.',
);
check(
  'HQ application inbox stays view-only',
  hasAll(testerInbox, [
    'const ENDPOINT = "/api/admin/owner/tester-applications"',
    'Churvox HQ · view only',
    'Nothing is sent and no access is granted from this inbox.',
    'Export CSV',
  ]) && !testerInbox.includes('mailto:'),
  'The inbox may search, refresh and export, but it must not contact applicants or grant access.',
);
check(
  'Promotion Centre stays local-only',
  hasAll(promotionCentre, ['never publishes or sends anything', 'navigator.clipboard', 'localStorage']),
  'Promotion tools must only copy approved content and save the local checklist.',
);

if (failures.length) {
  console.error('\nCHURVOX PREDEPLOY RELEASE AUDIT FAILED\n');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`CHURVOX PREDEPLOY RELEASE AUDIT PASSED (${checks.length} checks)`);
checks.forEach((name) => console.log(`- ${name}`));
