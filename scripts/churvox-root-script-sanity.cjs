#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const rootPackagePath = path.resolve(__dirname, '..', 'package.json');
const frontendPackagePath = path.resolve(__dirname, '..', 'frontend', 'package.json');
const requiredRootScripts = ['build', 'test:office-lab', 'test:rebuild:routes', 'test:readiness', 'test:mimic:full', 'test:live-command'];

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

for (const name of ['test:office-lab', 'test:rebuild:routes']) {
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
  'churvox-command-python-syntax.cjs',
  'churvox-mimic-full-test.cjs',
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

if (rootScripts['test:live-command'] !== 'node scripts/churvox-live-command-smoke.cjs') {
  console.error(`Root test:live-command must run scripts/churvox-live-command-smoke.cjs. Found: ${rootScripts['test:live-command']}`);
  process.exit(1);
}

console.log('Root script sanity passed. Full mimic, readiness, route safety and live smoke tests are available from the repo root.');
