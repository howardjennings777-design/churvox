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
const canonicalizer = read('frontend/scripts/canonicalize-public-static-paths.cjs');
const server = read('frontend/server.cjs');
const blueprint = read('render.yaml');
const sitemap = read('frontend/public/sitemap.xml');

expect(
  frontendPackage.scripts?.start === 'node scripts/start-production.cjs',
  'frontend start must run the production startup wrapper instead of bypassing route generation',
);
expect(
  String(frontendPackage.scripts?.build || '').includes('generate-public-search-pages.cjs')
    && String(frontendPackage.scripts?.build || '').includes('strengthen-public-search-pages.cjs')
    && frontendPackage.scripts?.postbuild === 'node scripts/canonicalize-public-static-paths.cjs',
  'frontend build must generate, strengthen and canonicalize route-specific public HTML',
);
expect(
  startup.includes("require('./generate-public-search-pages.cjs')")
    && startup.includes("require('./strengthen-public-search-pages.cjs')")
    && startup.includes("require('./canonicalize-public-static-paths.cjs')")
    && startup.includes("require('../server.cjs')"),
  'production startup must regenerate, strengthen, canonicalize and then serve public pages',
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
  [
    "'/product'",
    "'/pricing'",
    "'/demo'",
    "'/legal/privacy'",
    "'/legal/terms'",
    "'/refunds-cancellations'",
    "'/privacy/': '/legal/privacy/'",
    "'/terms/': '/legal/terms/'",
  ].every((token) => canonicalizer.includes(token)),
  'static canonicalizer must use live trailing-slash resources and preserve primary legal canonicals',
);
expect(
  blueprint.includes('name: grassley-frontend')
    && blueprint.includes('runtime: static')
    && blueprint.indexOf('source: /product') < blueprint.indexOf('source: /*')
    && blueprint.indexOf('source: /pricing') < blueprint.indexOf('source: /*')
    && blueprint.indexOf('source: /demo') < blueprint.indexOf('source: /*')
    && blueprint.includes('destination: /product/index.html')
    && blueprint.includes('destination: /pricing/index.html')
    && blueprint.includes('destination: /demo/index.html'),
  'Render Blueprint must put exact public routes before the SPA catch-all',
);
expect(
  sitemap.includes('https://www.churvox.com/product/')
    && sitemap.includes('https://www.churvox.com/pricing/')
    && sitemap.includes('https://www.churvox.com/demo/')
    && sitemap.includes('https://www.churvox.com/legal/privacy/')
    && sitemap.includes('https://www.churvox.com/legal/terms/'),
  'sitemap must point search engines to the live route-specific static resources',
);
expect(
  server.includes('fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()')
    && server.includes('filePath = path.join(filePath, "index.html")'),
  'frontend server must serve generated route directories before the React fallback',
);

try {
  parseableNodeScript(startup);
  parseableNodeScript(strengthener);
  parseableNodeScript(canonicalizer);
} catch (error) {
  failures.push(`public production scripts must parse: ${error.message}`);
}

if (failures.length) {
  for (const failure of failures) console.error(`✗ ${failure}`);
  console.error(`\nPublic production route contract failed: ${failures.length} issue(s).`);
  process.exit(1);
}

console.log('✓ frontend build and start generate route-specific public HTML');
console.log('✓ post-build canonical URLs match Render static directory resources');
console.log('✓ Render Blueprint places exact public routes before the SPA fallback');
console.log('✓ sitemap points at the live route-specific pages');
console.log('✓ route content includes product, pricing, demo, trust and legal fallbacks');
console.log('\nPublic production route contract passed.');
