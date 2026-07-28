#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const FRONTEND = path.resolve(__dirname, '..');
const BUILD = path.join(FRONTEND, 'build');
const SITE = 'https://www.churvox.com';

const PUBLIC_PATHS = [
  '/product',
  '/features',
  '/pricing',
  '/demo',
  '/about',
  '/security',
  '/support',
  '/contact',
  '/signup',
  '/login',
  '/privacy',
  '/terms',
  '/legal/privacy',
  '/legal/terms',
  '/refunds-cancellations',
  '/industries/new-zealand',
  '/industries/australia',
  '/industries/lawn-care',
  '/industries/landscaping',
  '/industries/cleaning',
  '/industries/property-maintenance',
  '/industries/handyman',
  '/industries/painting',
  '/industries/plumbing-electrical-hvac',
  '/industries/pest-control',
  '/industries/barber-hairdresser',
];

const CANONICAL_ALIASES = {
  '/privacy/': '/legal/privacy/',
  '/terms/': '/legal/terms/',
};

function slashPath(value) {
  const raw = String(value || '');
  if (!raw || raw === '/' || raw.endsWith('/')) return raw;
  return `${raw}/`;
}

function routeForFile(filePath) {
  const relativeDir = path.relative(BUILD, path.dirname(filePath)).split(path.sep).filter(Boolean);
  return relativeDir.length ? `/${relativeDir.join('/')}/` : '/';
}

function replaceKnownPaths(html) {
  let output = html;
  const ordered = [...PUBLIC_PATHS].sort((a, b) => b.length - a.length);
  for (const publicPath of ordered) {
    const slashed = slashPath(publicPath);
    const escaped = publicPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    output = output.replace(new RegExp(`href="${escaped}(?=([?#"]|$))`, 'g'), `href="${slashed}`);
    output = output.replace(new RegExp(`to="${escaped}(?=([?#"]|$))`, 'g'), `to="${slashed}`);
    output = output.replace(new RegExp(`${SITE}${escaped}(?=([?#"<]|$))`, 'g'), `${SITE}${slashed}`);
  }
  return output;
}

function canonicalizeHtml(filePath) {
  let html = fs.readFileSync(filePath, 'utf8');
  const route = routeForFile(filePath);
  if (route !== '/') {
    const canonicalRoute = CANONICAL_ALIASES[route] || route;
    const canonical = `${SITE}${canonicalRoute}`;
    html = html.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?\s*>/i, `<link rel="canonical" href="${canonical}" />`);
    html = html.replace(/<meta\s+property="og:url"\s+content="[^"]*"\s*\/?\s*>/i, `<meta property="og:url" content="${canonical}" />`);
  }
  html = replaceKnownPaths(html);
  fs.writeFileSync(filePath, html, 'utf8');
}

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(fullPath);
    else if (entry.isFile() && entry.name === 'index.html') canonicalizeHtml(fullPath);
  }
}

function canonicalizeSitemap(filePath) {
  if (!fs.existsSync(filePath)) return;
  let xml = fs.readFileSync(filePath, 'utf8');
  for (const publicPath of [...PUBLIC_PATHS].sort((a, b) => b.length - a.length)) {
    const escaped = publicPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    xml = xml.replace(new RegExp(`${SITE}${escaped}(?=<\\/loc>)`, 'g'), `${SITE}${slashPath(publicPath)}`);
  }
  fs.writeFileSync(filePath, xml, 'utf8');
}

if (!fs.existsSync(BUILD)) {
  console.error('CHURVOX_STATIC_CANONICAL_BUILD_MISSING: frontend/build was not found.');
  process.exit(1);
}

walk(BUILD);
canonicalizeSitemap(path.join(BUILD, 'sitemap.xml'));
console.log(`CHURVOX STATIC PUBLIC PATHS CANONICALIZED (${PUBLIC_PATHS.length} routes)`);
