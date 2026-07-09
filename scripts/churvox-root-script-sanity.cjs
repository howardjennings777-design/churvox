#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const rootPackagePath = path.resolve(__dirname, '..', 'package.json');
const frontendPackagePath = path.resolve(__dirname, '..', 'frontend', 'package.json');
const requiredRootScripts = ['build', 'test:office-lab', 'test:rebuild:routes', 'test:readiness', 'test:live-command'];

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

if (rootScripts['test:readiness'] !== 'node scripts/churvox-readiness-sweep.cjs') {
  console.error(`Root script test:readiness must run scripts/churvox-readiness-sweep.cjs. Found: ${rootScripts['test:readiness']}`);
  process.exit(1);
}

if (rootScripts['test:live-command'] !== 'node scripts/churvox-live-command-smoke.cjs') {
  console.error(`Root script test:live-command must run scripts/churvox-live-command-smoke.cjs. Found: ${rootScripts['test:live-command']}`);
  process.exit(1);
}

console.log('Root script sanity passed. Office lab, route safety, readiness and live Command smoke tests are available from the repo root.');
