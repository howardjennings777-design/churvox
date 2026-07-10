#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const failures = [];
const checks = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function expect(name, ok, detail) {
  checks.push({ name, ok: Boolean(ok), detail });
}

const app = read('frontend/src/App.js');
const shell = read('frontend/src/pages/marketing/ChurvoxPublicShell.jsx');
const css = read('frontend/src/pages/marketing/ChurvoxPublic2026.css');
const home = read('frontend/src/pages/marketing/ExecutiveHomePage.jsx');
const product = read('frontend/src/pages/marketing/ExecutiveFeaturesPage.jsx');
const pricing = read('frontend/src/pages/marketing/ExecutivePricingPage.jsx');
const contact = read('frontend/src/pages/marketing/ExecutiveContactPage.jsx');
const demo = read('frontend/src/pages/marketing/PublicDemoPage.jsx');

const publicPages = [
  ['home', home, 'CHURVOX_PUBLIC_ADMIN_ENGINE_20260710'],
  ['product', product, 'CHURVOX_PUBLIC_PRODUCT_20260710'],
  ['pricing', pricing, 'CHURVOX_PUBLIC_PRICING_20260710'],
  ['contact', contact, 'CHURVOX_PUBLIC_CONTACT_20260710'],
  ['demo', demo, 'CHURVOX_PUBLIC_DEMO_20260710'],
];

expect(
  'public routes still point at the rebuilt pages',
  [
    'const HomePage = React.lazy(() => import("./pages/marketing/ExecutiveHomePage"))',
    'const PricingPage = React.lazy(() => import("./pages/marketing/ExecutivePricingPage"))',
    'const FeaturesPage = React.lazy(() => import("./pages/marketing/ExecutiveFeaturesPage"))',
    'const PublicDemoPage = React.lazy(() => import("./pages/marketing/PublicDemoPage"))',
    'const ContactPage = React.lazy(() => import("./pages/marketing/ExecutiveContactPage"))',
    '<Route path="/" element={<HomePage />} />',
    '<Route path="/product" element={<FeaturesPage />} />',
    '<Route path="/pricing" element={<PricingPage />} />',
    '<Route path="/demo" element={<PublicDemoPage />} />',
    '<Route path="/contact" element={<ContactPage />} />',
  ].every((value) => app.includes(value)),
  'Home, Product, Pricing, Demo and Contact must remain connected to the public router',
);

expect(
  'shared public shell exposes the complete navigation and Command preview',
  [
    'export function PublicNav',
    'export function PublicFooter',
    'export function CommandPreview',
    'Sample workspace',
    'Nothing sends, syncs or charges until the owner approves.',
    'Start free trial',
    'Log in',
  ].every((value) => shell.includes(value)),
  'The public shell must contain navigation, owner-control wording and a clearly labelled sample workspace',
);

for (const [name, source, marker] of publicPages) {
  expect(
    `${name} uses the new public design`,
    source.includes('className="cp26Site"')
      && source.includes(marker)
      && source.includes('PublicNav')
      && source.includes('PublicFooter')
      && !source.includes('./SimplePublic.css'),
    `${name} must use the cp26 shell and must not import the retired SimplePublic stylesheet`,
  );
}

expect(
  'homepage expresses the actual Churvox promise',
  home.includes('Your hidden office team.')
    && home.includes('You approve what matters.')
    && home.includes('Eight strong roles. One simple owner experience.')
    && home.includes('No hidden pricing change.'),
  'The homepage must describe the hidden office engine, owner approval and unchanged pricing honestly',
);

expect(
  'pricing remains driven by live plan configuration',
  pricing.includes('CHURVOX_PLANS')
    && pricing.includes('pricePlanForCountry')
    && pricing.includes('addonPriceForCountry')
    && pricing.includes('pricingNotesForCountry')
    && !pricing.includes('const plans = ['),
  'The rebuilt pricing page must not hard-code a second source of truth',
);

expect(
  'demo labels sample records and keeps anchor targets real',
  demo.includes('This page uses clearly labelled sample records.')
    && demo.includes('function Panel({ title, eyebrow, children, className = "", id })')
    && demo.includes('id={id}')
    && demo.includes('id="command-demo"')
    && demo.includes('href="#command-demo"'),
  'The public demo must identify fake records as samples and keep the Jump to Command link wired',
);

expect(
  'public CSS contains premium desktop and mobile systems',
  [
    '.cp26Topbar',
    '.cp26Hero',
    '.cp26CommandPreview',
    '.cp26RoleStrip',
    '.cp26PlanGrid',
    '.cp26Closing',
    '@media (max-width: 1120px)',
    '@media (max-width: 820px)',
    '@media (max-width: 560px)',
  ].every((value) => css.includes(value)),
  'The public design must retain responsive navigation, hero, Command, pricing and closing layouts',
);

expect(
  'public pages avoid unsafe or dishonest action wording',
  !/auto-send|auto-charge|auto-sync/i.test(`${home}\n${product}\n${pricing}\n${contact}\n${demo}`.replace(/No auto-send|No auto-charge|No auto-sync/gi, ''))
    && !/guaranteed|zero bugs|fully automatic/i.test(`${home}\n${product}\n${pricing}\n${contact}\n${demo}`),
  'Public copy must not promise unsafe automation or impossible guarantees',
);

for (const check of checks) {
  console.log(`${check.ok ? '✓' : '✗'} ${check.name}${check.ok ? '' : ` — ${check.detail}`}`);
  if (!check.ok) failures.push(`${check.name}: ${check.detail}`);
}

if (failures.length) {
  console.error(`\nPublic site audit failed: ${failures.length} issue(s).`);
  process.exit(1);
}

console.log(`\nPublic site audit passed: ${checks.length} checks across Home, Product, Pricing, Demo and Contact.`);
