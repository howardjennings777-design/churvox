#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const FRONTEND = path.resolve(__dirname, '..');
const BUILD = path.join(FRONTEND, 'build');
const SITE = 'https://www.churvox.com';
const CONTACT = 'hello@churvox.com';
const UPDATED = '28 July 2026';

const routePages = {
  '/product': {
    eyebrow: 'Connected job management',
    heading: 'One workflow from client request to owner-approved invoice.',
    intro: 'Churvox keeps jobs, clients, workers, messages, quotes, invoices and proof connected. Routine admin is prepared from the real record, while important decisions remain with the owner.',
    sections: [
      ['Jobs and recurring work', 'Keep one-off jobs, recurring visits, dates, addresses, access notes, pricing and job history together.'],
      ['Workers and field proof', 'Assignments, acknowledgements, time, notes, photos and completion proof return from the worker experience.'],
      ['Quotes and invoices', 'Prepare quotes and invoices from connected client and job information, then review before sending.'],
      ['Command approval desk', 'Important messages, money steps and record changes wait for deliberate owner review.'],
      ['Accounting and exports', 'Owner-approved accounting sync and practical exports help keep bookkeepers and business records aligned.'],
      ['Mobile and desktop', 'Workers get focused mobile tools while owners keep the fuller business workspace on desktop.'],
    ],
    primaryHref: '/demo',
    primaryLabel: 'See the guided demo',
  },
  '/pricing': {
    eyebrow: 'Clear NZ pricing',
    heading: 'Choose the level of admin and capacity the business needs.',
    intro: 'Every plan includes the core client, job, quote and invoice workflow. Prices are in New Zealand dollars and exclude GST. The trial is 14 days with no card required upfront.',
    sections: [
      ['Start — NZ$39/month + GST', '1 active team member, 250 clients, 50 jobs per month and 25 prepared actions per month.'],
      ['Crew — NZ$89/month + GST', '5 active team members, 1,000 clients, 150 jobs per month and 100 prepared actions per month.'],
      ['Operator — NZ$149/month + GST', '15 active team members, 3,000 clients, 500 jobs per month and 500 prepared actions per month.'],
      ['Command — NZ$299/month + GST', '50 active team members, 10,000 clients, 1,500 jobs per month, 2,000 prepared actions and the full owner approval desk.'],
      ['Accounting Sync — NZ$39/month + GST', 'Available as an add-on for Start, Crew and Operator; included in Command.'],
      ['Command Growth Pack — NZ$99/month + GST', 'Adds 50 active team members, 1,500 jobs per month and 1,000 prepared actions per month to Command.'],
    ],
    primaryHref: '/signup?plan=operator',
    primaryLabel: 'Start the 14-day trial',
  },
  '/demo': {
    eyebrow: 'Interactive product walkthrough',
    heading: 'Follow one service job from request to owner approval.',
    intro: 'The demo uses clearly labelled sample records. It shows how Churvox captures the job, returns worker updates and proof, prepares the next admin step and keeps the final decision with the owner.',
    sections: [
      ['1. Request captured', 'Client, service, address, timing and notes begin in one connected record.'],
      ['2. Work planned', 'The owner checks the job, assignment and timing before the worker sees it.'],
      ['3. Worker update', 'Acknowledgement, progress, time, notes and proof return from the field.'],
      ['4. Admin prepared', 'Churvox prepares the relevant message, quote, invoice or follow-up from the record.'],
      ['5. Owner reviews', 'The owner can approve, edit or park the prepared action.'],
      ['6. Nothing real changes', 'The public demo does not send, charge, sync or save anything to an account.'],
    ],
    primaryHref: '/demo',
    primaryLabel: 'Open the interactive demo',
  },
  '/about': {
    eyebrow: 'Built in New Zealand',
    heading: 'Job management built around real service work and owner control.',
    intro: 'Churvox is designed for service businesses that need less double handling without handing important decisions to invisible automation.',
    sections: [
      ['Service-business focus', 'Designed around clients, jobs, workers, visits, proof, quotes, invoices and repeat work.'],
      ['Connected records', 'Information stays tied to the right client and job instead of being scattered across messages and spreadsheets.'],
      ['Prepared admin', 'Churvox prepares routine next steps from the record rather than pretending they have already happened.'],
      ['Owner approval', 'Important sends, money steps and record changes remain visible and deliberate.'],
      ['NZ and Australia focus', 'The public experience uses local pricing and business language while remaining available worldwide.'],
      ['Honest early-stage product', 'Examples are labelled as examples. Churvox does not publish invented reviews, customer counts or unsupported guarantees.'],
    ],
    primaryHref: '/contact',
    primaryLabel: 'Contact Churvox',
  },
  '/security': {
    eyebrow: 'Security and control',
    heading: 'Clear account, business and approval boundaries.',
    intro: 'Churvox combines authenticated access, business-scoped records, owner-controlled actions and responsible third-party services. No online system can promise absolute security, so reporting and response paths remain visible.',
    sections: [
      ['Authenticated access', 'Owner, office, payroll and worker areas use authenticated and role-aware routes.'],
      ['Business isolation', 'Records are filtered using the authenticated business context.'],
      ['Payment handling', 'Stripe handles card entry; Churvox does not need to store full card numbers.'],
      ['Owner approval guardrails', 'Important external sends, charges, accounting actions and record changes are designed to require deliberate approval.'],
      ['Data responsibility', 'Businesses remain responsible for user access, lawful data entry, strong passwords and correctly sharing public links.'],
      ['Report a concern', `Send the affected page, account email and concern to ${CONTACT}. Do not email passwords or full card details.`],
    ],
    primaryHref: `mailto:${CONTACT}?subject=Churvox%20security%20question`,
    primaryLabel: 'Email a security question',
  },
  '/legal/privacy': {
    eyebrow: 'Privacy and data',
    heading: 'Privacy Policy',
    intro: `Last updated ${UPDATED}. This policy explains how Churvox handles information across the website, owner app, worker app, public customer links and support channels.`,
    sections: [
      ['1. Who this policy covers', 'Business owners, office users, workers, invited testers, customers opening public links, website visitors and people contacting Churvox. Businesses are responsible for information they enter and for having authority to use it.'],
      ['2. Information collected', 'Names, contact and business details, login and role information, jobs, addresses, messages, notes, quotes, invoices, payment status, worker time, checklists, photos, proof, device details, security events, feature usage, error logs and subscription status may be collected.'],
      ['3. Public customer links', 'Tokenised quote, invoice, proof and client-portal links may be viewed by anyone holding the valid link. Recipients should not forward them unless authorised.'],
      ['4. How information is used', 'To create and secure accounts, provide job-management features, prepare owner-reviewed admin, operate subscriptions, send transactional messages, provide support, investigate faults, prevent misuse and improve reliability. Churvox does not sell personal information.'],
      ['5. Service providers and integrations', 'Hosting, database, authentication, email, payment, analytics, monitoring and support providers process information needed for their service. Connected accounting providers receive information only when authorised by the business.'],
      ['6. Security and business separation', 'Authentication, role-aware access, business identifiers, secure transport and operational logging are used to protect information. No online service can guarantee absolute security.'],
      ['7. Retention and deletion', 'Information is retained while needed for the service, security, support, legal or tax obligations, billing, disputes and fraud prevention. Authenticated owners can request account deletion, subject to records that must lawfully be retained.'],
      ['8. Access, correction and complaints', `People may request access or correction subject to law and identity verification. Email ${CONTACT} with the account email, information involved and requested action.`],
      ['9. Cookies and local storage', 'Cookies and browser storage support login sessions, security, selected plan and region, setup progress, preferences and essential product operation. Limited analytics may be used for reliability and public-site usage.'],
      ['10. Changes and contact', `Material changes will be dated on this page. Privacy questions can be sent to ${CONTACT}.`],
    ],
    primaryHref: `mailto:${CONTACT}?subject=Churvox%20privacy%20request`,
    primaryLabel: 'Email a privacy request',
  },
  '/privacy': { aliasOf: '/legal/privacy', canonical: '/legal/privacy' },
  '/legal/terms': {
    eyebrow: 'Service terms',
    heading: 'Terms of Service',
    intro: `Last updated ${UPDATED}. These terms govern the Churvox website, owner app, worker app, public customer links, subscriptions, trials and connected services.`,
    sections: [
      ['1. The service', 'Churvox provides job-management and business-admin tools including jobs, clients, workers, schedules, messages, quotes, invoices, proof, owner review and optional integrations. Features may be improved, restricted or retired as the service develops.'],
      ['2. Accounts and authority', 'Users must provide accurate information, protect login credentials, remove old access and have authority to act for the business. Accounts must not be shared or used to access another business.'],
      ['3. Business and customer data', 'The business remains responsible for client, worker, job, message, quote, invoice, photo and note information entered into Churvox and for having a lawful basis to use it.'],
      ['4. Prepared admin and owner approval', 'Churvox may organise records and prepare drafts or suggested actions. The business remains responsible for checking dates, amounts, tax treatment, client details, worker time, compliance and the final action.'],
      ['5. Quotes and invoices', 'Quotes and invoices are issued by the business, not by Churvox as a party to the work. Quote acceptance records approval to proceed but does not automatically take payment.'],
      ['6. Plans, trials and cancellation', 'Current price, trial length, currency and tax are shown before checkout. Stripe handles card entry. Subscriptions may renew unless cancelled. Cancellation does not automatically create a refund for a completed billing period.'],
      ['7. Workers and payroll review', 'Businesses remain responsible for employment, contractor, wage, break, leave, tax and record-keeping obligations. Churvox does not submit payroll to government agencies or create bank payout files.'],
      ['8. Accounting and integrations', 'The business must check invoices, tax codes, payments and accounting records. Churvox does not provide legal, tax or accounting advice and does not file tax returns.'],
      ['9. Acceptable use', 'Users must not act unlawfully, impersonate others, send spam, upload malicious code, bypass access controls, scrape private records, abuse public links or interfere with the service.'],
      ['10. Availability and backups', 'Uninterrupted or error-free operation is not guaranteed. Businesses should keep exports or copies of records they are legally required to retain.'],
      ['11. Suspension and termination', 'Access may be restricted for non-payment, security risk, misuse, unlawful activity or material breach. Some records may remain where required for billing, disputes, fraud prevention, tax, security or law.'],
      ['12. Liability and governing law', `Mandatory rights are not excluded. These terms are governed by New Zealand law, subject to any mandatory jurisdiction that applies. Questions can be sent to ${CONTACT}.`],
    ],
    primaryHref: `mailto:${CONTACT}?subject=Churvox%20terms%20question`,
    primaryLabel: 'Email a terms question',
  },
  '/terms': { aliasOf: '/legal/terms', canonical: '/legal/terms' },
  '/refunds-cancellations': {
    eyebrow: 'Billing policy',
    heading: 'Refunds and cancellations in plain language.',
    intro: `Use the account email when contacting ${CONTACT} so the correct Stripe and Churvox billing records can be checked. Never send full card details.`,
    sections: [
      ['Trial', 'The trial length, selected plan, renewal price, currency and tax are shown before checkout is completed.'],
      ['Cancellation', 'Cancel future renewal through available billing controls or contact Churvox from the account email before the next renewal.'],
      ['Access after cancellation', 'Unless stated otherwise, paid access normally continues until the end of the already-paid billing period.'],
      ['Refund review', 'Cancellation does not automatically refund a completed billing period. Requests are reviewed against the billing record, timing, access, circumstances and applicable law.'],
      ['Checkout abandoned', 'Leaving Stripe before successful completion should not activate or change a subscription.'],
      ['Incorrect or duplicate charge', `Contact ${CONTACT} promptly with the date, amount, business name and account email. Do not send passwords or full card details.`],
    ],
    primaryHref: `mailto:${CONTACT}?subject=Churvox%20billing%20or%20cancellation`,
    primaryLabel: 'Email billing support',
  },
};

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function resolvedPage(route, seen = new Set()) {
  const page = routePages[route];
  if (!page) throw new Error(`Unknown public route ${route}`);
  if (!page.aliasOf) return page;
  if (seen.has(route)) throw new Error(`Circular public route alias ${route}`);
  seen.add(route);
  return { ...resolvedPage(page.aliasOf, seen), canonical: page.canonical || page.aliasOf };
}

function staticMarkup(route, page) {
  const sections = page.sections.map(([title, text]) => `
        <article><h2>${escapeHtml(title)}</h2><p>${escapeHtml(text)}</p></article>`).join('');
  const primaryHref = page.primaryHref || '/signup?plan=operator';
  const primaryLabel = page.primaryLabel || 'Start the 14-day trial';

  return `<noscript data-churvox-public-static="${escapeHtml(route)}">
    <style>
      .cvLaunchPage{min-height:100vh;background:#f7f3ea;color:#111827;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.6}.cvLaunchPage *{box-sizing:border-box}.cvLaunchNav{background:linear-gradient(110deg,#080d16,#111827 62%,#3b1d0a);padding:20px clamp(20px,6vw,72px)}.cvLaunchNav>div{max-width:1160px;margin:auto;display:flex;align-items:center;justify-content:space-between;gap:22px;flex-wrap:wrap}.cvLaunchNav a{color:#e2e8f0;text-decoration:none;font-weight:850;margin-right:16px}.cvLaunchNav .brand{color:#fff;font-size:22px;font-weight:950}.cvLaunchHero{max-width:1160px;margin:auto;padding:68px 22px 48px}.cvLaunchHero small{color:#c2410c;font-weight:950;letter-spacing:.12em;text-transform:uppercase}.cvLaunchHero h1{max-width:940px;margin:14px 0 22px;font-size:clamp(40px,7vw,76px);line-height:.98;letter-spacing:-.055em}.cvLaunchHero>p{max-width:880px;font-size:19px;font-weight:650;color:#334155}.cvLaunchActions{display:flex;gap:12px;flex-wrap:wrap;margin-top:28px}.cvLaunchActions a{display:inline-flex;padding:14px 20px;border-radius:12px;background:#f97316;color:#111827;font-weight:950;text-decoration:none}.cvLaunchActions a:last-child{background:#fff;border:1px solid #cbd5e1}.cvLaunchGrid{max-width:1160px;margin:0 auto 64px;padding:0 22px;display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:14px}.cvLaunchGrid article{background:#fff;border:1px solid #d8dee8;border-radius:16px;padding:22px}.cvLaunchGrid h2{margin:0 0 8px;font-size:19px}.cvLaunchGrid p{margin:0;color:#475569}.cvLaunchFoot{border-top:1px solid #d8dee8;background:#fff;padding:30px 22px}.cvLaunchFoot>div{max-width:1160px;margin:auto}.cvLaunchFoot nav{margin-top:10px}.cvLaunchFoot a{color:#9a3412;font-weight:850;margin-right:14px}
    </style>
    <main class="cvLaunchPage">
      <header class="cvLaunchNav"><div><a class="brand" href="/">Churvox</a><nav aria-label="Public navigation"><a href="/product">Product</a><a href="/pricing">Pricing</a><a href="/demo">Demo</a><a href="/about">About</a><a href="/security">Security</a><a href="/login">Log in</a></nav></div></header>
      <section class="cvLaunchHero"><small>${escapeHtml(page.eyebrow)}</small><h1>${escapeHtml(page.heading)}</h1><p>${escapeHtml(page.intro)}</p><div class="cvLaunchActions"><a href="${escapeHtml(primaryHref)}">${escapeHtml(primaryLabel)}</a><a href="/signup?plan=operator">Start 14-day trial</a></div></section>
      <section class="cvLaunchGrid">${sections}
      </section>
      <footer class="cvLaunchFoot"><div><strong>Churvox · Built in New Zealand · Available worldwide</strong><div>${escapeHtml(CONTACT)} · Owner-controlled job admin for service businesses.</div><nav><a href="/legal/privacy">Privacy</a><a href="/legal/terms">Terms</a><a href="/refunds-cancellations">Cancellations</a><a href="/support">Support</a></nav></div></footer>
    </main>
  </noscript>`;
}

function structuredData(route, page) {
  const canonicalPath = page.canonical || route;
  const graph = [
    {
      '@type': 'Organization',
      '@id': `${SITE}/#organization`,
      name: 'Churvox',
      url: SITE,
      email: CONTACT,
      areaServed: ['New Zealand', 'Australia', 'Worldwide'],
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${SITE}/#software`,
      name: 'Churvox',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      url: `${SITE}${canonicalPath}`,
      description: page.intro,
      publisher: { '@id': `${SITE}/#organization` },
      offers: route === '/pricing' ? [
        { '@type': 'Offer', name: 'Start', price: '39', priceCurrency: 'NZD' },
        { '@type': 'Offer', name: 'Crew', price: '89', priceCurrency: 'NZD' },
        { '@type': 'Offer', name: 'Operator', price: '149', priceCurrency: 'NZD' },
        { '@type': 'Offer', name: 'Command', price: '299', priceCurrency: 'NZD' },
      ] : undefined,
    },
  ];
  return `<script type="application/ld+json" data-churvox-structured-data>${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })}</script>`;
}

function patchRoute(route) {
  const page = resolvedPage(route);
  const outputDir = path.join(BUILD, ...route.split('/').filter(Boolean));
  const filePath = path.join(outputDir, 'index.html');
  if (!fs.existsSync(filePath)) throw new Error(`Generated public route missing: ${route}`);

  let html = fs.readFileSync(filePath, 'utf8');
  const fallback = staticMarkup(route, page);
  const structured = structuredData(route, page);

  if (/<noscript\b[\s\S]*?<\/noscript>/i.test(html)) {
    html = html.replace(/<noscript\b[\s\S]*?<\/noscript>/i, fallback);
  } else {
    html = html.replace(/<body([^>]*)>/i, `<body$1>${fallback}`);
  }

  if (html.includes('data-churvox-structured-data')) {
    html = html.replace(/<script type="application\/ld\+json" data-churvox-structured-data>[\s\S]*?<\/script>/i, structured);
  } else {
    html = html.replace('</head>', `  ${structured}\n</head>`);
  }

  fs.writeFileSync(filePath, html, 'utf8');
}

if (!fs.existsSync(BUILD)) {
  console.error('Public launch strengthening needs frontend/build. Run it after the React build.');
  process.exit(1);
}

for (const route of Object.keys(routePages)) patchRoute(route);
console.log(`CHURVOX PUBLIC LAUNCH PAGES STRENGTHENED (${Object.keys(routePages).length} routes)`);
