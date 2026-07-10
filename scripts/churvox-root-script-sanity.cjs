#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const rootPackagePath = path.resolve(__dirname, '..', 'package.json');
const frontendPackagePath = path.resolve(__dirname, '..', 'frontend', 'package.json');
const liveTruthPath = path.resolve(__dirname, 'churvox-live-truth-test.cjs');
const liveHqPath = path.resolve(__dirname, 'churvox-live-hq-real-data.cjs');
const requiredRootScripts = [
  'build', 'test:office-lab', 'test:rebuild:routes', 'test:readiness', 'test:mimic:full', 'test:mimic:chain',
  'test:hq:behavior', 'test:ui:logic', 'test:public', 'test:route-touch', 'test:paid-launch:reality',
  'test:ui:full', 'test:ui:desktop', 'test:ui:mobile', 'test:prelive:full', 'test:paid-launch:full',
  'test:live-command', 'test:truth:live', 'test:hq:reality:live', 'test:hq:live-real',
];

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`Could not read ${filePath}: ${error.message}`);
    process.exit(1);
  }
}

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error(`Could not read ${filePath}: ${error.message}`);
    process.exit(1);
  }
}

const rootPackage = readJson(rootPackagePath);
const frontendPackage = readJson(frontendPackagePath);
const liveTruth = readText(liveTruthPath);
const liveHq = readText(liveHqPath);
const rootScripts = rootPackage.scripts || {};
const frontendScripts = frontendPackage.scripts || {};
const missing = requiredRootScripts.filter((name) => !rootScripts[name]);

if (missing.length) {
  console.error(`Missing root scripts: ${missing.join(', ')}`);
  process.exit(1);
}

for (const name of ['test:office-lab', 'test:rebuild:routes', 'test:ui:full', 'test:ui:desktop', 'test:ui:mobile']) {
  const command = String(rootScripts[name] || '');
  if (!command.includes(`npm --prefix frontend run ${name}`)) {
    console.error(`Root script ${name} must forward to frontend ${name}. Found: ${command}`);
    process.exit(1);
  }
  if (!frontendScripts[name]) {
    console.error(`Frontend script ${name} is missing.`);
    process.exit(1);
  }
}

const readiness = String(rootScripts['test:readiness'] || '');
for (const required of [
  'churvox-root-script-sanity.cjs',
  'churvox-command-python-syntax.cjs',
  'churvox-hq-paid-launch-behavior.cjs',
  'churvox-mimic-full-test.cjs',
  'churvox-mimic-v3-chain-audit.cjs',
  'churvox-ui-logic-audit.cjs',
  'churvox-public-site-audit.cjs',
  'churvox-route-touch-regression-audit.cjs',
  'churvox-paid-launch-reality-audit.cjs',
  'churvox-readiness-sweep.cjs',
  'churvox-command-approval-readiness.cjs',
  'churvox-human-mimic-product-audit.cjs',
  'churvox-vision-audit.cjs',
]) {
  if (!readiness.includes(required)) {
    console.error(`Root test:readiness is missing ${required}. Found: ${readiness}`);
    process.exit(1);
  }
}

const exactScripts = {
  'test:mimic:full': 'node scripts/churvox-mimic-full-test.cjs',
  'test:mimic:chain': 'node scripts/churvox-mimic-v3-chain-audit.cjs',
  'test:hq:behavior': 'node scripts/churvox-hq-paid-launch-behavior.cjs',
  'test:ui:logic': 'node scripts/churvox-ui-logic-audit.cjs',
  'test:public': 'node scripts/churvox-public-site-audit.cjs',
  'test:route-touch': 'node scripts/churvox-route-touch-regression-audit.cjs',
  'test:paid-launch:reality': 'node scripts/churvox-paid-launch-reality-audit.cjs',
  'test:prelive:full': 'npm run test:readiness && npm run test:ui:full',
  'test:paid-launch:full': 'npm run test:prelive:full',
  'test:live-command': 'node scripts/churvox-live-command-smoke.cjs',
  'test:truth:live': 'node scripts/churvox-live-truth-test.cjs',
  'test:hq:reality:live': 'npm --prefix frontend run test:hq:reality:live',
  'test:hq:live-real': 'node scripts/churvox-live-hq-real-data.cjs',
};
for (const [name, expected] of Object.entries(exactScripts)) {
  if (rootScripts[name] !== expected) {
    console.error(`Root ${name} must be ${expected}. Found: ${rootScripts[name]}`);
    process.exit(1);
  }
}

for (const name of ['test:ui:full', 'test:ui:desktop', 'test:ui:mobile']) {
  const command = String(frontendScripts[name] || '');
  for (const spec of [
    'churvox-full-ui-logic-buttons.spec.js',
    'churvox-public-honesty-and-function.spec.js',
    'churvox-owner-no-fake-data.spec.js',
    'churvox-paid-launch-hq-reality.spec.js',
  ]) {
    if (!command.includes(spec)) {
      console.error(`Frontend ${name} is missing ${spec}. Found: ${command}`);
      process.exit(1);
    }
  }
}

for (const required of [
  "path.join(root, 'frontend')",
  "'--config=playwright.config.js'",
  "'https://www.churvox.com'",
  "'tests/e2e/churvox-public-honesty-and-function.spec.js'",
  "'tests/e2e/churvox-owner-no-fake-data.spec.js'",
  "'tests/e2e/churvox-paid-launch-hq-reality.spec.js'",
  "'--workers=1'",
]) {
  if (!liveTruth.includes(required)) {
    console.error(`Live truth launcher is missing ${required}.`);
    process.exit(1);
  }
}
if (liveTruth.includes('npm --prefix frontend exec')) {
  console.error('Live truth launcher must not use npm exec from the repo root because Playwright would miss the frontend config.');
  process.exit(1);
}

for (const required of [
  "'tests/e2e/churvox-hq-live-real-data.spec.js'",
  "'--config=playwright.config.js'",
  "'--project=desktop-chromium'",
  "'https://www.churvox.com'",
  "'https://grassley-backend.onrender.com'",
  'CHURVOX_OWNER_EMAIL',
  'CHURVOX_OWNER_PASSWORD',
]) {
  if (!liveHq.includes(required)) {
    console.error(`Authenticated HQ live launcher is missing ${required}.`);
    process.exit(1);
  }
}

console.log('Root script sanity passed. Mimic behavior, HQ backend billing behavior, public site, route/touch safety, paid-launch HQ reality, authenticated live HQ data, UI logic, desktop/mobile gauntlets, readiness, live truth and live smoke are available from the repo root.');
