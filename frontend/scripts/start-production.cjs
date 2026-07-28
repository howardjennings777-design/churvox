#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const frontendRoot = path.resolve(__dirname, '..');
const buildIndex = path.join(frontendRoot, 'build', 'index.html');

if (!fs.existsSync(buildIndex)) {
  console.error('CHURVOX_STARTUP_BUILD_MISSING: frontend/build/index.html was not found.');
  process.exit(1);
}

try {
  require('./generate-public-search-pages.cjs');
  require('./strengthen-public-search-pages.cjs');
  require('./canonicalize-public-static-paths.cjs');
  console.log('CHURVOX_STARTUP_PUBLIC_ROUTES_READY');
} catch (error) {
  console.error('CHURVOX_STARTUP_PUBLIC_ROUTE_REPAIR_FAILED', error);
  process.exit(1);
}

require('../server.cjs');
