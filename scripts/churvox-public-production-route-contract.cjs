#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const failures = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function parseableNodeScript(source) {
  const withoutShebang = String(source || '').replace(/^#![^\n]*\n/, '');
  new Function(withoutShebang);
}

const frontendPackage = JSON.parse(read('frontend/package.json'));
const startup = read('frontend/scripts/start-production.cjs');
const strengthener = read('frontend/scripts/strengthen-public-search-pages.cjs');
const server = read('frontend/server.cjs');

expect(
  frontendPackage.scripts?.start === 'node scripts/start-production.cjs',
  'frontend start must run the production startup wrapper instead of bypassing route generation',
);
expect(
  String(frontendPackage.scripts?.build || '').includes('generate-public-search-pages.cjs')
    && String(frontendPackage.scripts?.build || '').includes('strengthen-public-search-pages.cjs'),
  'frontend build must generate and strengthen route-specific public HTML',
);
expect(
  startup.includes("require('./generate-public-search-pages.cjs')")
    && startup.includes("require('./strengthen-public-search-pages.cjs')")
    && startup.includes("require('../server.cjs')"),
  'production startup must regenerate, strengthen and then serve public pages',
);
expect(
  [
    "'/product'",
    "'/pricing'",
    "'/demo'",
    "'/about'",
    "'/security'",
    "'/legal/privacy'",
    "'/privacy'",
    "'/legal/terms'",
    "'/terms'",
    "'/refunds-cancellations'",
    'data-churvox-public-static',
    'data-churvox-structured-data',
    'Built in New Zealand',
    'Churvox does not sell personal information',
    'NZ$299/month + GST',
  ].every((token) => strengthener.includes(token)),
  'public strengthener must cover product, pricing, demo, trust and legal routes with truthful static content',
);
expect(
  server.includes('fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()')
    && server.includes('filePath = path.join(filePath, "index.html")'),
  'frontend server must serve generated route directories before the React fallback',
);

try {
  parseableNodeScript(startup);
  parseableNodeScript(strengthener);
} catch (error) {
  failures.push(`public production scripts must parse: ${error.message}`);
}

if (failures.length) {
  for (const failure of failures) console.error(`✗ ${failure}`);
  console.error(`\nPublic production route contract failed: ${failures.length} issue(s).`);
  process.exit(1);
}

console.log('✓ frontend start regenerates route-specific public HTML');
console.log('✓ build includes route generation and legal/trust strengthening');
console.log('✓ route content includes product, pricing, demo, trust and legal fallbacks');
console.log('✓ server serves generated route directories before the React fallback');
console.log('\nPublic production route contract passed.');
