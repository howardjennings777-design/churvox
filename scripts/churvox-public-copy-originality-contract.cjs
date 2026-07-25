#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const PUBLIC_COPY_FILES = [
  'frontend/public/index.html',
  'frontend/src/pages/marketing/ExecutiveHomePage.jsx',
  'frontend/src/pages/marketing/ExecutiveFeaturesPage.jsx',
  'frontend/src/pages/marketing/ExecutivePricingPage.jsx',
  'frontend/src/pages/marketing/ChurvoxPublicShell.jsx',
  'frontend/src/pages/marketing/PublicDemoPage.jsx',
  'frontend/src/pages/marketing/IndustryPage.jsx',
  'frontend/scripts/generate-public-search-pages.cjs',
];

const COMPETITOR_NAMES = [
  'servicem8',
  'tradify',
  'fergus',
  'simpro',
  'jobber',
  'housecall pro',
  'servicetitan',
  'aroflo',
  'workiz',
  'fieldpulse',
  'kickserv',
  'mhelpdesk',
  'servicemax',
];

const TEMPLATE_RESIDUE = [
  'lorem ipsum',
  '[insert company',
  '[insert product',
  '[insert headline',
  'replace this text',
  'your company name here',
  'example product name',
];

const REQUIRED_PRODUCT_SIGNALS = [
  { label: 'Churvox preparation promise', pattern: /churvox prepares/i },
  { label: 'owner control language', pattern: /owner(?:-|\s)(?:controlled|approval)/i },
  { label: '14-day public trial', pattern: /14-day trial/i },
  { label: 'no-card trial', pattern: /no card/i },
  { label: 'no silent sending', pattern: /nothing auto-sends|nothing (?:important )?sends(?:, charges, syncs or changes)? without (?:owner )?approval|nothing sends without you/i },
];

function fail(message) {
  console.error(`ORIGINALITY CONTRACT FAILED: ${message}`);
  process.exitCode = 1;
}

function readPublicFile(relativePath) {
  const absolutePath = path.join(ROOT, relativePath);
  if (!fs.existsSync(absolutePath)) {
    fail(`Missing required public-copy file: ${relativePath}`);
    return '';
  }
  return fs.readFileSync(absolutePath, 'utf8');
}

function normaliseVisibleText(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\{[^}]+\}/g, ' ')
    .replace(/&[a-z0-9#]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

const files = new Map(PUBLIC_COPY_FILES.map((file) => [file, readPublicFile(file)]));
const combined = [...files.values()].join('\n').toLowerCase();

for (const competitor of COMPETITOR_NAMES) {
  if (combined.includes(competitor)) {
    fail(`Public copy contains competitor name “${competitor}”. Describe Churvox directly instead of comparing or borrowing.`);
  }
}

for (const residue of TEMPLATE_RESIDUE) {
  if (combined.includes(residue)) {
    fail(`Public copy contains unfinished template residue: “${residue}”.`);
  }
}

for (const signal of REQUIRED_PRODUCT_SIGNALS) {
  if (!signal.pattern.test(combined)) {
    fail(`Public copy lost the required ${signal.label}.`);
  }
}

const headlineFiles = [
  'frontend/src/pages/marketing/ExecutiveHomePage.jsx',
  'frontend/src/pages/marketing/ExecutiveFeaturesPage.jsx',
  'frontend/src/pages/marketing/ExecutivePricingPage.jsx',
];

const headlineOwners = new Map();
for (const file of headlineFiles) {
  const source = files.get(file) || '';
  const matches = [...source.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)];
  if (matches.length !== 1) {
    fail(`${file} must contain exactly one public H1; found ${matches.length}.`);
    continue;
  }

  const headline = normaliseVisibleText(matches[0][1]);
  if (headline.length < 12) {
    fail(`${file} has an empty or overly short H1.`);
    continue;
  }

  if (headlineOwners.has(headline)) {
    fail(`Duplicate public H1 found in ${headlineOwners.get(headline)} and ${file}: “${headline}”.`);
  } else {
    headlineOwners.set(headline, file);
  }
}

const home = files.get('frontend/src/pages/marketing/ExecutiveHomePage.jsx') || '';
const distinctiveHomeLines = [
  /your business moves/i,
  /churvox sees the whole move/i,
  /one connected signal/i,
  /prepared does not mean automatic/i,
];

for (const pattern of distinctiveHomeLines) {
  if (!pattern.test(home)) {
    fail(`The homepage lost a distinctive Churvox line required by ${pattern}.`);
  }
}

if (process.exitCode) process.exit(process.exitCode);

console.log('CHURVOX PUBLIC COPY ORIGINALITY CONTRACT PASSED');
console.log(`Checked ${PUBLIC_COPY_FILES.length} public-copy sources, ${COMPETITOR_NAMES.length} competitor-name exclusions and ${headlineOwners.size} unique page headlines.`);
