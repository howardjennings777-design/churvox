const fs = require('fs');
const path = require('path');

const FRONTEND = path.resolve(__dirname, '..');
const REPO = path.resolve(FRONTEND, '..');
const OUTPUT_DIR = path.join(FRONTEND, 'public', '__churvox');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'release.json');

function exists(base, relativePath) {
  return fs.existsSync(path.join(base, relativePath));
}

function readText(base, relativePath) {
  const filePath = path.join(base, relativePath);
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8').trim() : '';
}

function clean(value, fallback = '') {
  const result = String(value || '').replace(/\s+/g, ' ').trim();
  return result || fallback;
}

const packageJson = JSON.parse(readText(FRONTEND, 'package.json') || '{}');
const releaseMarker = readText(FRONTEND, 'public/render-deploy-marker.txt');
const generatedAt = new Date().toISOString();

const metadata = {
  schema_version: 'churvox-release-v1',
  generated_at: generatedAt,
  git_commit: clean(process.env.RENDER_GIT_COMMIT || process.env.GITHUB_SHA, 'local'),
  git_branch: clean(process.env.RENDER_GIT_BRANCH || process.env.GITHUB_REF_NAME, 'local'),
  repository: clean(process.env.RENDER_GIT_REPO_SLUG, 'howardjennings777-design/churvox'),
  service: {
    name: clean(process.env.RENDER_SERVICE_NAME, 'local-frontend'),
    type: clean(process.env.RENDER_SERVICE_TYPE, 'local'),
    external_hostname: clean(process.env.RENDER_EXTERNAL_HOSTNAME),
  },
  frontend_version: clean(packageJson.version, 'unknown'),
  release_marker: releaseMarker,
  safeguards: {
    public_trial_days: 14,
    selected_tester_days: 30,
    automatic_access_grant: false,
    automatic_social_publish: false,
    automatic_customer_contact: false,
    owner_approval_required: true,
  },
  features: {
    tester_page: exists(FRONTEND, 'public/testers/index.html'),
    tester_campaign_attribution: exists(FRONTEND, 'src/runtime/churvoxTesterApplicationAttributionRuntime.js'),
    hq_tester_application_inbox: exists(FRONTEND, 'src/pages/admin/TesterApplicationsInbox.jsx'),
    hq_promotion_centre: exists(FRONTEND, 'src/pages/admin/ChurvoxPromotionCentre.jsx'),
    tester_backend_intake: exists(REPO, 'backend/churvox_public_tester_application_patch.py'),
    public_sitemap: exists(FRONTEND, 'public/sitemap.xml'),
    first_party_api_proxy: exists(FRONTEND, 'server.cjs'),
  },
};

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.writeFileSync(OUTPUT_FILE, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
console.log(`CHURVOX RELEASE METADATA WRITTEN ${path.relative(REPO, OUTPUT_FILE)} ${metadata.git_commit}`);
