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
const index = read('frontend/src/index.js');
const shell = read('frontend/src/pages/marketing/ChurvoxPublicShell.jsx');
const css = read('frontend/src/pages/marketing/ChurvoxPublic2026.css');
const home = read('frontend/src/pages/marketing/ExecutiveHomePage.jsx');
const product = read('frontend/src/pages/marketing/ExecutiveFeaturesPage.jsx');
const pricing = read('frontend/src/pages/marketing/ExecutivePricingPage.jsx');
const contact = read('frontend/src/pages/marketing/ExecutiveContactPage.jsx');
const demo = read('frontend/src/pages/marketing/PublicDemoPage.jsx');
const industry = read('frontend/src/pages/marketing/IndustryPage.jsx');
const request = read('frontend/src/pages/public/PublicRequestPage.js');
const frontendPackage = JSON.parse(read('frontend/package.json'));
const browserTest = read('frontend/tests/e2e/churvox-public-honesty-and-function.spec.js');

const publicPages = [
  ['home', home, 'CHURVOX_PUBLIC_ADMIN_ENGINE_20260710'],
  ['product', product, 'CHURVOX_PUBLIC_PRODUCT_20260710'],
  ['pricing', pricing, 'CHURVOX_PUBLIC_PRICING_20260710'],
  ['contact', contact, 'CHURVOX_PUBLIC_CONTACT_20260710'],
  ['demo', demo, 'CHURVOX_PUBLIC_DEMO_20260710'],
  ['industry', industry, 'CHURVOX_PUBLIC_INDUSTRY_20260710'],
];

expect(
  'public routes remain connected to real React pages',
  [
    'const HomePage = React.lazy(() => import("./pages/marketing/ExecutiveHomePage"))',
    'const PricingPage = React.lazy(() => import("./pages/marketing/ExecutivePricingPage"))',
    'const FeaturesPage = React.lazy(() => import("./pages/marketing/ExecutiveFeaturesPage"))',
    'const PublicDemoPage = React.lazy(() => import("./pages/marketing/PublicDemoPage"))',
    'const IndustryPage = React.lazy(() => import("./pages/marketing/IndustryPage"))',
    'const ContactPage = React.lazy(() => import("./pages/marketing/ExecutiveContactPage"))',
    'const PublicRequestPage = React.lazy(() => import("./pages/public/PublicRequestPage"))',
    '<Route path="/" element={<HomePage />} />',
    '<Route path="/product" element={<FeaturesPage />} />',
    '<Route path="/features" element={<FeaturesPage />} />',
    '<Route path="/industries/:slug" element={<IndustryPage />} />',
    '<Route path="/demo" element={<PublicDemoPage />} />',
    '<Route path="/pricing" element={<PricingPage />} />',
    '<Route path="/request" element={<PublicRequestPage />} />',
    '<Route path="/contact" element={<ContactPage />} />',
    '<Route path="/login" element={<LoginPage />} />',
    '<Route path="/legal/privacy" element={<PrivacyPolicyPage />} />',
    '<Route path="/legal/terms" element={<TermsOfServicePage />} />',
  ].every((value) => app.includes(value)),
  'Marketing, request, login and legal pages must remain reachable from the router',
);

expect(
  'shared public shell exposes real navigation and explicit example labelling',
  [
    'export function PublicNav',
    'export function PublicFooter',
    'export function CommandPreview',
    'Example workspace · sample data only',
    '3 example decisions',
    'Preview only. Nothing is sent, synced, charged or changed from this example.',
    'to="/legal/privacy"',
    'to="/legal/terms"',
    'Start free trial',
    'Log in',
  ].every((value) => shell.includes(value))
    && !shell.includes('Belmont Villas')
    && !shell.includes('/privacy-policy')
    && !shell.includes('/terms-of-service'),
  'The shell must label example records and link only to routes that exist',
);

for (const [name, source, marker] of publicPages) {
  expect(
    `${name} uses the rebuilt public design`,
    source.includes('className="cp26Site"')
      && source.includes(marker)
      && source.includes('PublicNav')
      && source.includes('PublicFooter')
      && !source.includes('./SimplePublic.css'),
    `${name} must use the cp26 shell and not the retired SimplePublic stylesheet`,
  );
}

expect(
  'homepage expresses the real product without a duplicate price source',
  home.includes('Your hidden office team.')
    && home.includes('You approve what matters.')
    && home.includes('Eight strong roles. One simple owner experience.')
    && home.includes('CHURVOX_PLANS')
    && home.includes('pricePlanForCountry')
    && home.includes('Prices below come from the same plan configuration used by checkout.')
    && !home.includes('const plans = [')
    && !/\["Start",\s*"\$39/.test(home),
  'Homepage prices must come from the shared live plan configuration',
);

expect(
  'pricing remains driven by live plan configuration',
  pricing.includes('CHURVOX_PLANS')
    && pricing.includes('pricePlanForCountry')
    && pricing.includes('addonPriceForCountry')
    && pricing.includes('pricingNotesForCountry')
    && !pricing.includes('const plans = ['),
  'The pricing page must not hard-code a second source of truth',
);

expect(
  'demo and industry examples are clearly identified',
  demo.includes('This page uses clearly labelled sample records.')
    && demo.includes('Sample business')
    && demo.includes('Nothing from this sample is copied into the account.')
    && demo.includes('function Panel({ title, eyebrow, children, className = "", id })')
    && demo.includes('id={id}')
    && demo.includes('id="command-demo"')
    && demo.includes('href="#command-demo"')
    && industry.includes('These are configuration examples, not customer endorsements or usage claims.')
    && industry.includes('Demo names, amounts and jobs are examples.'),
  'All invented names, records and amounts must be presented only as labelled examples',
);

expect(
  'public request form validates and performs a real API submission',
  request.includes('if (!clean(form.customer_name)) throw new Error("Please add your name.")')
    && request.includes('if (!clean(form.customer_phone) && !clean(form.customer_email))')
    && request.includes('if (!clean(form.service_needed))')
    && request.includes('fetch(apiUrl("/public/customer-request")')
    && request.includes('method: "POST"')
    && request.includes('if (!res.ok || data?.success === false)')
    && request.includes('setSent(true)'),
  'Request page must validate required facts, POST them and show success only after an OK response',
);

expect(
  'visible pages are not altered by hidden copy or fallback UI runtimes',
  [
    'churvoxForbiddenExampleScrubRuntime',
    'churvoxKiwiCopyGuard',
    'churvoxSetupCoachKillRuntime',
    'churvoxPaidLaunchSurfaceRuntime',
    'churvoxExactFormLabelsRuntime',
    'churvoxSiteCopyPolishRuntime',
  ].every((value) => !index.includes(value))
    && index.includes('Visible page copy, forms and records must come from React components and live APIs.'),
  'Public and owner UI must not be rewritten or fabricated by delayed DOM mutation scripts',
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
  'public pages avoid unsupported marketing claims',
  !/trusted by\s+\d|five[- ]star|5[- ]star|guaranteed results?|zero bugs?|fully automatic|live customer data|real customer activity|thousands of customers/i.test(
    `${home}\n${product}\n${pricing}\n${contact}\n${demo}\n${industry}`,
  ),
  'Public copy must not invent adoption, reviews, live activity or impossible guarantees',
);

expect(
  'full public browser test is wired into desktop and mobile launch gates',
  ['test:ui:full', 'test:ui:desktop', 'test:ui:mobile'].every((name) => {
    const command = String(frontendPackage.scripts?.[name] || '');
    return command.includes('churvox-full-ui-logic-buttons.spec.js')
      && command.includes('churvox-public-honesty-and-function.spec.js');
  }),
  'Every full UI gate must run both owner-app and complete public-site browser tests',
);

let browserSyntaxOk = true;
try { new Function(browserTest); } catch { browserSyntaxOk = false; }
expect(
  'public browser test covers routes, links, examples, delayed runtimes and real request submission',
  browserSyntaxOk
    && browserTest.includes("const PUBLIC_ROUTES = [")
    && browserTest.includes("'/industries/lawn-care'")
    && browserTest.includes("'/legal/privacy'")
    && browserTest.includes("'/quote/test-token'")
    && browserTest.includes('all visible internal marketing links resolve to real pages')
    && browserTest.includes('public request form validates and sends a real payload')
    && browserTest.includes('OLD_RUNTIME_SELECTORS')
    && !/\btest\.(?:skip|only)\b|\bdescribe\.only\b/.test(browserTest),
  'The complete public test must not be skipped, focused or limited to a few landing pages',
);

for (const check of checks) {
  console.log(`${check.ok ? '✓' : '✗'} ${check.name}${check.ok ? '' : ` — ${check.detail}`}`);
  if (!check.ok) failures.push(`${check.name}: ${check.detail}`);
}

if (failures.length) {
  console.error(`\nPublic site audit failed: ${failures.length} issue(s).`);
  process.exit(1);
}

console.log(`\nPublic site audit passed: ${checks.length} checks across routes, pricing, forms, examples, claims and browser coverage.`);
