#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const rootPackagePath = path.resolve(__dirname, '..', 'package.json');
const frontendPackagePath = path.resolve(__dirname, '..', 'frontend', 'package.json');
const requiredRootScripts = [
  'build', 'test:office-lab', 'test:rebuild:routes', 'test:readiness', 'test:mimic:full', 'test:mimic:chain',
  'test:ui:logic', 'test:public', 'test:ui:full', 'test:ui:desktop', 'test:ui:mobile', 'test:prelive:full', 'test:live-command',
];

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`Could not read ${filePath}: ${error.message}`);
    process.exit(1);
  }
}

const rootPackage = readJson(rootPackagePath);
const frontendPackage = readJson(frontendPackagePath);
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
  'churvox-mimic-full-test.cjs',
  'churvox-mimic-v3-chain-audit.cjs',
  'churvox-ui-logic-audit.cjs',
  'churvox-public-site-audit.cjs',
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

if (rootScripts['test:mimic:full'] !== 'node scripts/churvox-mimic-full-test.cjs') {
  console.error(`Root test:mimic:full must run scripts/churvox-mimic-full-test.cjs. Found: ${rootScripts['test:mimic:full']}`);
  process.exit(1);
}
if (rootScripts['test:mimic:chain'] !== 'node scripts/churvox-mimic-v3-chain-audit.cjs') {
  console.error(`Root test:mimic:chain must run scripts/churvox-mimic-v3-chain-audit.cjs. Found: ${rootScripts['test:mimic:chain']}`);
  process.exit(1);
}
if (rootScripts['test:ui:logic'] !== 'node scripts/churvox-ui-logic-audit.cjs') {
  console.error(`Root test:ui:logic must run scripts/churvox-ui-logic-audit.cjs. Found: ${rootScripts['test:ui:logic']}`);
  process.exit(1);
}
if (rootScripts['test:public'] !== 'node scripts/churvox-public-site-audit.cjs') {
  console.error(`Root test:public must run scripts/churvox-public-site-audit.cjs. Found: ${rootScripts['test:public']}`);
  process.exit(1);
}
if (rootScripts['test:prelive:full'] !== 'npm run test:readiness && npm run test:ui:full') {
  console.error(`Root test:prelive:full must run readiness before the desktop/mobile browser gauntlet. Found: ${rootScripts['test:prelive:full']}`);
  process.exit(1);
}
if (rootScripts['test:live-command'] !== 'node scripts/churvox-live-command-smoke.cjs') {
  console.error(`Root test:live-command must run scripts/churvox-live-command-smoke.cjs. Found: ${rootScripts['test:live-command']}`);
  process.exit(1);
}

console.log('Root script sanity passed. Mimic behavior, public site, UI logic, desktop/mobile button gauntlet, readiness and live smoke are available from the repo root.');
