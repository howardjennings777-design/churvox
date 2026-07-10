#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const officeRoot = path.join(root, 'frontend', 'src', 'churvox-office-lab');
const failures = [];
const checks = [];

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(?:js|jsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function relative(file) {
  return path.relative(root, file).replace(/\\/g, '/');
}

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function openings(text, tag) {
  const values = [];
  const needle = `<${tag}`;
  let cursor = 0;
  while (cursor < text.length) {
    const start = text.indexOf(needle, cursor);
    if (start < 0) break;
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
    values.push({ start, end: Math.min(index + 1, text.length), text: text.slice(start, Math.min(index + 1, text.length)) });
    cursor = Math.max(index + 1, start + needle.length);
  }
  return values;
}

function lineAt(text, index) {
  return text.slice(0, index).split('\n').length;
}

function fail(file, text, index, message, snippet = '') {
  failures.push(`${relative(file)}:${lineAt(text, index)} ${message}${snippet ? ` — ${snippet.replace(/\s+/g, ' ').slice(0, 180)}` : ''}`);
}

function pass(name, detail) {
  checks.push({ name, detail });
}

const files = [
  ...walk(officeRoot),
  path.join(root, 'frontend', 'src', 'App.js'),
  path.join(root, 'frontend', 'src', 'pages', 'auth', 'LoginPage.js'),
].filter((file) => fs.existsSync(file));

let buttonCount = 0;
let linkCount = 0;
let formCount = 0;

for (const file of files) {
  const text = read(file);

  for (const opening of openings(text, 'button')) {
    buttonCount += 1;
    const tag = opening.text;
    const handled = /\bonClick\s*=/.test(tag)
      || /\btype\s*=\s*["']submit["']/.test(tag)
      || /\bformAction\s*=/.test(tag)
      || /\bdisabled(?:\s*=|\s|>)/.test(tag);
    if (!handled) fail(file, text, opening.start, 'button has no click, submit, form action or disabled contract', tag);
    if (/onClick\s*=\s*\{\s*(?:undefined|null|false)\s*\}/.test(tag)) fail(file, text, opening.start, 'button click handler is empty', tag);
    if (/onClick\s*=\s*\{\s*\(?.*?\)?\s*=>\s*\{\s*\}\s*\}/.test(tag)) fail(file, text, opening.start, 'button click handler is a no-op', tag);
    if (/onClick[^>]*(?:TODO|FIXME|console\.log)/i.test(tag)) fail(file, text, opening.start, 'button handler contains build-only logic', tag);
  }

  for (const opening of openings(text, 'a')) {
    linkCount += 1;
    const tag = opening.text;
    const hrefMatch = tag.match(/\bhref\s*=\s*(?:["']([^"']*)["']|\{\s*["']([^"']*)["']\s*\})/);
    const href = hrefMatch ? (hrefMatch[1] ?? hrefMatch[2] ?? '') : null;
    if (!/\bhref\s*=/.test(tag)) fail(file, text, opening.start, 'anchor has no href', tag);
    if (href !== null && (!href.trim() || href.trim() === '#' || /^javascript:/i.test(href.trim()))) fail(file, text, opening.start, 'anchor has an invalid or dead href', tag);
    if (/\btarget\s*=\s*["']_blank["']/.test(tag) && !/\brel\s*=\s*["'][^"']*(?:noopener|noreferrer)/.test(tag)) {
      fail(file, text, opening.start, 'target=_blank link is missing noopener/noreferrer', tag);
    }
  }

  for (const opening of openings(text, 'form')) {
    formCount += 1;
    if (!/\bonSubmit\s*=|\baction\s*=/.test(opening.text)) fail(file, text, opening.start, 'form has no submit handler or action', opening.text);
  }

  const ids = new Map();
  for (const match of text.matchAll(/\bid\s*=\s*["']([^"']+)["']/g)) {
    const id = match[1];
    if (ids.has(id)) fail(file, text, match.index || 0, `duplicate static id "${id}"`, match[0]);
    ids.set(id, match.index || 0);
  }

  for (const match of text.matchAll(/(?:href|to)\s*=\s*["'](?:javascript:|#)["']/gi)) {
    fail(file, text, match.index || 0, 'dead navigation destination', match[0]);
  }

  for (const match of text.matchAll(/window\.location\.(?:href|hash)\s*=\s*["']\s*["']/g)) {
    fail(file, text, match.index || 0, 'navigation assigns an empty destination', match[0]);
  }

  for (const match of text.matchAll(/\b(?:alert|prompt)\s*\(/g)) {
    fail(file, text, match.index || 0, 'browser alert/prompt used instead of product UI', match[0]);
  }
}

const siteFile = path.join(officeRoot, 'OfficeTeamLabSite.jsx');
const site = read(siteFile);
const requiredScreens = [
  'today', 'command', 'work', 'schedule', 'clients', 'messages', 'worker', 'quotes', 'invoices', 'money',
  'staff', 'payroll', 'team', 'playbooks', 'integrations', 'activity', 'automation', 'branding', 'settings',
  'plans', 'help', 'readiness', 'safety',
];
for (const screen of requiredScreens) {
  if (!new RegExp(`\\["${screen}"\\s*,`).test(site)) fail(siteFile, site, 0, `screen registry is missing ${screen}`);
  if (screen !== 'today' && !site.includes(`screen === "${screen}"`)) fail(siteFile, site, 0, `ScreenRouter is missing ${screen}`);
}
for (const match of site.matchAll(/:\s*["']([a-z-]+)["']/g)) {
  const target = match[1];
  if (['starter', 'command-unavailable', 'skip', 'command-audit-unavailable', 'command'].includes(target)) continue;
  if (match.index > site.indexOf('const screenAliases') && match.index < site.indexOf('const departments') && !requiredScreens.includes(target)) {
    fail(siteFile, site, match.index || 0, `screen alias points to unknown screen ${target}`, match[0]);
  }
}

const workspaceFiles = [
  'OfficeTeamJobsWorkspace.jsx',
  'OfficeTeamClientsWorkspace.jsx',
  'OfficeTeamWorkerPhoneView.jsx',
  'OfficeTeamQuotesWorkspace.jsx',
  'OfficeTeamInvoicesWorkspace.jsx',
];
for (const name of workspaceFiles) {
  const file = path.join(officeRoot, name);
  const text = read(file);
  if (/<main\b/.test(text)) fail(file, text, text.indexOf('<main'), 'workspace nests a second main landmark inside the app shell');
  if (!/OfficeTeamSafeControls/.test(text)) fail(file, text, 0, 'workspace is missing the safe action handoff');
}

const commandApiFile = path.join(officeRoot, 'OfficeTeamCommandApi.js');
const commandApi = read(commandApiFile);
for (const required of [
  'if (!response.ok || body?.success === false)',
  'credentials: "include"',
  'no_auto_send: true',
  'no_auto_sync: true',
  'no_auto_charge: true',
  'no_auto_record_change: true',
]) {
  if (!commandApi.includes(required)) fail(commandApiFile, commandApi, 0, `Command API safety contract is missing: ${required}`);
}

const maintenanceFile = path.join(root, 'frontend', 'src', 'lib', 'maintenanceMode.js');
const maintenance = read(maintenanceFile);
if (!/export const OWNER_MAINTENANCE_MODE\s*=\s*false\s*;/.test(maintenance)) {
  fail(maintenanceFile, maintenance, 0, 'owner launch is still blocked by maintenance mode');
}
const loginFile = path.join(root, 'frontend', 'src', 'pages', 'auth', 'LoginPage.js');
const login = read(loginFile);
for (const required of ['type="email"', 'type={showPassword ? "text" : "password"}', 'type="submit"', 'onSubmit={handleSubmit}']) {
  if (!login.includes(required)) fail(loginFile, login, 0, `real owner login form contract is missing: ${required}`);
}
const appFile = path.join(root, 'frontend', 'src', 'App.js');
const app = read(appFile);
if (!app.includes('<Route path="/login" element={<LoginPage />} />')) fail(appFile, app, 0, 'public login route is missing');
if (!app.includes('<Route path="/dashboard" element={<FreshBusinessRoute><OwnerOfficeApp /></FreshBusinessRoute>} />')) {
  fail(appFile, app, 0, 'owner dashboard is no longer protected by the authenticated business route');
}

const gauntletFile = path.join(root, 'frontend', 'tests', 'e2e', 'churvox-full-ui-logic-buttons.spec.js');
const gauntlet = read(gauntletFile);
try {
  new Function(gauntlet);
} catch (error) {
  fail(gauntletFile, gauntlet, 0, `browser gauntlet has invalid JavaScript: ${error.message}`);
}
for (const required of [
  "const LAB_SCREENS = [",
  "const PUBLIC_PAGES = ['/', '/pricing', '/contact', '/login']",
  "page.locator('.cvSiteScreen button:visible')",
  'silently did nothing',
  'Command handoff, editable slip and approval trail work together',
  'API failures show truthful states without blank screens or stuck controls',
  "test.setTimeout(240_000)",
  "source: 'human-mimic-intelligence-v3'",
]) {
  if (!gauntlet.includes(required)) fail(gauntletFile, gauntlet, 0, `browser gauntlet contract is missing: ${required}`);
}
if (/\btest\.(?:skip|only)\b|\bdescribe\.only\b/.test(gauntlet)) fail(gauntletFile, gauntlet, 0, 'browser gauntlet contains skipped or focused tests');
if (/https:\/\/www\.churvox\.com|CHURVOX_E2E_MUTATE/.test(gauntlet)) fail(gauntletFile, gauntlet, 0, 'local UI gauntlet must not mutate or depend on the live site');

const rootPackageFile = path.join(root, 'package.json');
const frontendPackageFile = path.join(root, 'frontend', 'package.json');
const rootPackage = JSON.parse(read(rootPackageFile));
const frontendPackage = JSON.parse(read(frontendPackageFile));
const rootScripts = rootPackage.scripts || {};
const frontendScripts = frontendPackage.scripts || {};
if (rootScripts['test:ui:logic'] !== 'node scripts/churvox-ui-logic-audit.cjs') fail(rootPackageFile, read(rootPackageFile), 0, 'root UI logic script is not wired correctly');
if (rootScripts['test:prelive:full'] !== 'npm run test:readiness && npm run test:ui:full') fail(rootPackageFile, read(rootPackageFile), 0, 'full pre-live command must run readiness before the browser gauntlet');
for (const name of ['test:ui:full', 'test:ui:desktop', 'test:ui:mobile']) {
  const value = String(frontendScripts[name] || '');
  if (!value.includes('churvox-full-ui-logic-buttons.spec.js') || !value.includes('PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000')) {
    fail(frontendPackageFile, read(frontendPackageFile), 0, `${name} must run the local full UI gauntlet`);
  }
}

if (buttonCount < 80) failures.push(`Expected a broad UI button surface; found only ${buttonCount} buttons.`);
if (linkCount < 2) failures.push(`Expected useful links in the owner UI; found only ${linkCount}.`);
pass('button wiring scanned', `${buttonCount} buttons`);
pass('link destinations scanned', `${linkCount} anchors`);
pass('form contracts scanned', `${formCount} forms`);
pass('screen routing checked', `${requiredScreens.length} registered screens`);
pass('core workspace landmarks checked', `${workspaceFiles.length} workspaces`);
pass('launch access checked', 'maintenance off, login form present, authenticated dashboard retained');
pass('browser gauntlet contract checked', 'desktop, mobile, public pages, click outcomes and failure states');

for (const check of checks) console.log(`✓ ${check.name} (${check.detail})`);
if (failures.length) {
  console.error(`\nUI logic audit failed: ${failures.length} issue(s).`);
  for (const item of failures) console.error(`- ${item}`);
  process.exit(1);
}
console.log(`\nUI logic audit passed. ${buttonCount} buttons, ${linkCount} links, ${formCount} forms and ${requiredScreens.length} routes were checked.`);
