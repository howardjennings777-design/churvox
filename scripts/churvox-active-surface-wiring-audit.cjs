#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const frontend = path.join(root, 'frontend', 'src');
const failures = [];
const checked = [];

function walk(target) {
  if (!fs.existsSync(target)) return [];
  const stat = fs.statSync(target);
  if (stat.isFile()) return /\.(?:js|jsx)$/.test(target) && !/\.bak(?:_|\.|$)/i.test(target) ? [target] : [];
  return fs.readdirSync(target, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === 'node_modules' || entry.name.startsWith('.') || /before-|option[A-Z]|legacy/i.test(entry.name)) return [];
    return walk(path.join(target, entry.name));
  });
}

function firstExisting(...values) {
  return values.find((value) => fs.existsSync(value));
}

function component(relativeBase) {
  const base = path.join(frontend, relativeBase);
  return firstExisting(base, `${base}.js`, `${base}.jsx`);
}

function openings(text, tag) {
  const found = [];
  const needle = `<${tag}`;
  let cursor = 0;
  while (cursor < text.length) {
    const start = text.indexOf(needle, cursor);
    if (start < 0) break;
    const boundary = text[start + needle.length];
    if (boundary && !/[\s/>]/.test(boundary)) {
      cursor = start + needle.length;
      continue;
    }
    let quote = '';
    let braces = 0;
    let index = start + needle.length;
    for (; index < text.length; index += 1) {
      const char = text[index];
      const previous = text[index - 1];
      if (quote) {
        if (char === quote && previous !== '\\') quote = '';
        continue;
      }
      if (char === '"' || char === "'" || char === '`') { quote = char; continue; }
      if (char === '{') { braces += 1; continue; }
      if (char === '}') { braces = Math.max(0, braces - 1); continue; }
      if (char === '>' && braces === 0) break;
    }
    found.push({ start, text: text.slice(start, Math.min(index + 1, text.length)) });
    cursor = Math.max(index + 1, start + needle.length);
  }
  return found;
}

function lineAt(text, index) {
  return text.slice(0, index).split('\n').length;
}

function relative(file) {
  return path.relative(root, file).replace(/\\/g, '/');
}

function fail(file, text, index, message, snippet = '') {
  failures.push(`${relative(file)}:${lineAt(text, index)} ${message}${snippet ? ` — ${snippet.replace(/\s+/g, ' ').slice(0, 180)}` : ''}`);
}

const routedComponents = [
  'App.js',
  'StandalonePlansRoute',
  'churvox-fresh/FreshApp',
  'churvox-office-lab/OfficeTeamLab',
  'churvox-office-lab/OfficeTeamWorkerRoute',
  'pages/AppOwnerPage',
  'pages/ChurvoxHQPage',
  'pages/PaidLaunchHQSystem',
  'pages/AdminUsagePage',
  'pages/admin/PlatformUnlock',
  'pages/admin/QAAuditorPage',
  'components/admin/PlatformAdminRoute',
  'pages/auth/LoginPage',
  'pages/auth/PwaLaunchPage',
  'pages/auth/SignupPage',
  'pages/auth/VerifyEmailPage',
  'pages/auth/InviteSetupPage',
  'pages/auth/ForgotPasswordPage',
  'pages/auth/ResetPasswordPage',
  'pages/marketing/ExecutiveHomePage',
  'pages/marketing/ExecutivePricingPage',
  'pages/marketing/ExecutiveFeaturesPage',
  'pages/marketing/PublicDemoPage',
  'pages/marketing/IndustryPage',
  'pages/marketing/ExecutiveContactPage',
  'pages/marketing/PublicTrustPages',
  'pages/marketing/ChurvoxPublicShell',
  'pages/public/PublicRequestPage',
  'pages/public/PublicQuotePage',
  'pages/public/PublicInvoicePage',
  'pages/public/PublicClientPortalPage',
  'pages/public/PublicProofPackPage',
  'pages/legal/PrivacyPage',
  'pages/legal/TermsPage',
  'pages/legal/PrivacyPolicyPage',
  'pages/legal/TermsOfServicePage',
  'pages/legal/AccountDeletionPage',
  'pages/BillingReturnPage',
  'churvox-site-next/HQConnected',
  'churvox-site-next/PublicSiteConnected',
  'churvox-site-next/hqLiveData',
].map(component).filter(Boolean);

const targets = [
  ...routedComponents,
  path.join(frontend, 'churvox-studio'),
];

const files = Array.from(new Set(targets.flatMap(walk))).filter((file) => !/\.bak(?:_|\.|$)/i.test(file));
let buttons = 0;
let anchors = 0;
let forms = 0;

function bridgeHandled(file, text, opening) {
  const name = relative(file);
  const nearby = text.slice(opening.start, opening.start + 520);
  if (/data-stripe-live-action|data-stripe-live-plan/.test(opening.text)) return true;
  if (name.endsWith('frontend/src/churvox-studio/StudioPages.jsx') && /Active sessions|Export business data|Delete account/.test(nearby)) return true;
  return false;
}

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  checked.push(relative(file));

  for (const opening of openings(text, 'button')) {
    buttons += 1;
    const tag = opening.text;
    const handled = /\bon(?:Click|MouseDown|PointerDown|KeyDown|TouchStart)\s*=|\btype\s*=\s*["'](?:submit|reset)["']|\bformAction\s*=|\bdisabled(?:\s*=|\s|>)|\.\.\./.test(tag)
      || bridgeHandled(file, text, opening);
    if (!handled) fail(file, text, opening.start, 'active button has no click, keyboard, submit, reset, form-action, disabled or verified release-bridge contract', tag);
    if (/onClick\s*=\s*\{\s*(?:undefined|null|false)\s*\}/.test(tag)) fail(file, text, opening.start, 'active button has an empty handler', tag);
    if (/onClick[^>]*(?:TODO|FIXME|console\.log)/i.test(tag)) fail(file, text, opening.start, 'active button still contains build-only click logic', tag);
  }

  for (const opening of openings(text, 'a')) {
    anchors += 1;
    const tag = opening.text;
    if (!/\bhref\s*=/.test(tag)) fail(file, text, opening.start, 'active anchor has no href', tag);
    const literal = tag.match(/\bhref\s*=\s*["']([^"']*)["']/)?.[1];
    if (literal !== undefined && (!literal.trim() || literal.trim() === '#' || /^javascript:/i.test(literal.trim()))) {
      fail(file, text, opening.start, 'active anchor has a dead href', tag);
    }
    if (/\btarget\s*=\s*["']_blank["']/.test(tag) && !/\brel\s*=\s*["'][^"']*(?:noopener|noreferrer)/.test(tag)) {
      fail(file, text, opening.start, 'target=_blank is missing noopener/noreferrer', tag);
    }
  }

  for (const opening of openings(text, 'form')) {
    forms += 1;
    if (!/\bonSubmit\s*=|\baction\s*=/.test(opening.text)) fail(file, text, opening.start, 'active form has no submit handler or action', opening.text);
  }

  for (const match of text.matchAll(/(?:href|to)\s*=\s*["'](?:javascript:|#)["']/gi)) {
    fail(file, text, match.index || 0, 'active navigation has a dead destination', match[0]);
  }
  for (const match of text.matchAll(/\b(?:alert|prompt)\s*\(/g)) {
    fail(file, text, match.index || 0, 'browser alert/prompt is used instead of product UI', match[0]);
  }
}

const appFile = path.join(frontend, 'App.js');
const app = fs.readFileSync(appFile, 'utf8');
for (const route of [
  '/', '/product', '/features', '/demo', '/pricing', '/request', '/contact', '/login', '/signup',
  '/dashboard', '/plans', '/worker/today', '/worker/jobs', '/worker/messages', '/admin', '/platform',
  '/billing/success', '/legal/privacy', '/legal/terms', '/delete-account',
]) {
  if (!app.includes(`path="${route}"`)) failures.push(`frontend/src/App.js is missing the active route ${route}`);
}

const officeBridgeFile = path.join(frontend, 'churvox-office-lab', 'OfficeTeamLab.jsx');
const officeBridge = fs.readFileSync(officeBridgeFile, 'utf8');
if (!officeBridge.includes("if (props.appMode === 'owner') return <FreshApp />")) failures.push('Active owner route no longer resolves to FreshApp.');

const plansFile = path.join(frontend, 'churvox-studio', 'StudioPlansRelease.jsx');
const plans = fs.readFileSync(plansFile, 'utf8');
for (const endpoint of [
  '/billing/subscription-status', '/plan/usage', '/billing/addons', '/billing/create-checkout-session',
  '/billing/create-addon-checkout-session', '/billing/confirm-addon-checkout', '/billing/create-portal-session',
]) {
  if (!plans.includes(endpoint)) failures.push(`Plans wiring is missing ${endpoint}`);
}

const hqFile = path.join(frontend, 'pages', 'PaidLaunchHQSystem.jsx');
const hq = fs.readFileSync(hqFile, 'utf8');
for (const endpoint of [
  '/api/admin/owner/paid-launch-report', '/api/admin/owner-overview', '/api/admin/owner/growth-report',
  '/api/admin/owner/connection', '/api/admin/owner/plan-report', '/api/admin/owner/control-log',
  '/api/admin/owner/testers', '/api/admin/owner/control-access', '/api/admin/owner/tester-intake',
]) {
  if (!hq.includes(endpoint)) failures.push(`HQ wiring is missing ${endpoint}`);
}

const workerFile = path.join(frontend, 'churvox-office-lab', 'OfficeTeamWorkerRoute.jsx');
const worker = fs.readFileSync(workerFile, 'utf8');
for (const endpoint of ['/worker/field-slip', '/worker/jobs/${encodeURIComponent(jobId)}/${endpoint}']) {
  if (!worker.includes(endpoint)) failures.push(`Worker wiring is missing ${endpoint}`);
}

const generatorFile = path.join(root, 'frontend', 'scripts', 'generate-public-search-pages.cjs');
const generator = fs.readFileSync(generatorFile, 'utf8');
for (const route of ['/product', '/features', '/demo', '/pricing', '/about', '/security', '/support', '/contact', '/signup', '/login', '/legal/privacy', '/legal/terms']) {
  if (!generator.includes(`route: '${route}'`)) failures.push(`Public search-page generator is missing ${route}`);
}

const startFile = path.join(root, 'frontend', 'scripts', 'start-production.cjs');
const start = fs.readFileSync(startFile, 'utf8');
if (!start.includes("require('./generate-public-search-pages.cjs')") || !start.includes("require('../server.cjs')")) {
  failures.push('Production startup no longer repairs public route pages before starting the server.');
}

if (files.length < 30) failures.push(`Active surface audit found too few source files (${files.length}).`);
if (buttons < 100) failures.push(`Active surface audit found too few buttons (${buttons}).`);
if (anchors < 12) failures.push(`Active surface audit found too few anchors (${anchors}).`);
if (forms < 6) failures.push(`Active surface audit found too few forms (${forms}).`);

console.log(`CHURVOX ACTIVE SURFACE WIRING AUDIT: ${checked.length} files, ${buttons} buttons, ${anchors} anchors, ${forms} forms`);
if (failures.length) {
  console.error(`CHURVOX ACTIVE SURFACE WIRING AUDIT FAILED (${failures.length})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('CHURVOX ACTIVE SURFACE WIRING AUDIT PASSED');
