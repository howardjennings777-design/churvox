#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const FRONTEND = path.resolve(__dirname, '..');
const BUILD = path.join(FRONTEND, 'build');
const BASE_INDEX = path.join(BUILD, 'index.html');
const SITE = 'https://www.churvox.com';

if (!fs.existsSync(BASE_INDEX)) {
  console.error('Public search pages need build/index.html. Run this after the React build.');
  process.exit(1);
}

const publicPages = [
  {
    route: '/product',
    title: 'Churvox product | Job admin prepared for owner approval',
    description: 'See how Churvox connects jobs, clients, workers, quotes and invoices, then returns important decisions to the owner for approval.',
    eyebrow: 'Churvox product',
    heading: 'The admin engine between the work and the owner.',
    intro: 'Churvox keeps the facts on purpose-built work pages, prepares the routine admin behind the scenes and puts only the decisions that need the owner into Command.',
    points: [
      ['Jobs and clients', 'One-off and recurring work, site details, history and notes stay connected.'],
      ['Workers and proof', 'Acknowledgements, progress, time, notes and job proof return from the field.'],
      ['Quotes and invoices', 'Money records are prepared from connected job information for owner review.'],
      ['Command', 'Approve, edit or park important decisions from one owner desk.'],
    ],
  },
  {
    route: '/features',
    title: 'Churvox features | Jobs, workers, quotes, invoices and Command',
    description: 'Explore the Churvox job-management workflow: jobs, clients, workers, proof, quotes, invoices, schedules and owner approvals in Command.',
    eyebrow: 'Connected job-management features',
    heading: 'Real work becomes prepared admin.',
    intro: 'Each Churvox area has a clear job. Work pages hold the facts, the worker view returns field updates and Command holds prepared decisions for the owner.',
    points: [
      ['Today and schedule', 'See the day, upcoming work and anything that needs attention.'],
      ['Jobs and recurring work', 'Keep dates, assignments, notes, proof, pricing and repeat visits together.'],
      ['Quotes and invoices', 'Prepare the next money step from the job record without silently sending it.'],
      ['Owner approval', 'Nothing important sends, charges, syncs or changes records without approval.'],
    ],
  },
  {
    route: '/demo',
    title: 'Churvox demo | See an owner-controlled job workflow',
    description: 'Open the guided Churvox demo and follow a service job from request and worker update through to owner-reviewed admin.',
    eyebrow: 'Guided product demo',
    heading: 'Watch one service job move through Churvox.',
    intro: 'The guided walkthrough uses clearly labelled example records to show how job details, worker updates, proof and a prepared owner decision stay connected.',
    points: [
      ['Job captured', 'Client, service, date, worker and job notes sit in one record.'],
      ['Field update returned', 'Progress, notes, time and proof come back from the worker view.'],
      ['Admin prepared', 'Churvox prepares the relevant reply, quote or invoice step.'],
      ['Owner decides', 'The owner reviews the prepared work before anything real happens.'],
    ],
    primaryHref: '/demo',
    primaryLabel: 'Open the interactive demo',
  },
  {
    route: '/pricing',
    title: 'Churvox pricing | Start, Crew, Operator and Command plans',
    description: 'Compare Churvox plans from $39 to $299 per month plus GST. Every plan starts with a 14-day free trial and no card upfront.',
    eyebrow: 'Churvox pricing',
    heading: 'Pay for the level of admin Churvox handles.',
    intro: 'Choose the plan that matches how much of the business workflow you want connected. Pricing stays clear and every plan begins with a 14-day trial.',
    points: [
      ['Start — $39 + GST', 'Core jobs, clients, quotes and invoices.'],
      ['Crew — $89 + GST', 'Team and worker workflow for growing service businesses.'],
      ['Operator — $149 + GST', 'The most popular plan for deeper prepared admin and owner control.'],
      ['Command — $299 + GST', 'The full owner approval desk and wider operating controls.'],
    ],
  },
  {
    route: '/about',
    title: 'About Churvox | Owner-controlled job admin',
    description: 'Churvox is job-management software for service businesses, built around prepared admin and owner approval.',
    eyebrow: 'About Churvox',
    heading: 'Built to reduce admin without taking control away.',
    intro: 'Churvox connects jobs, clients, workers, quotes and invoices, while the owner keeps control of important messages, money steps and record changes.',
    points: [
      ['Service-business focus', 'Designed for businesses managing real clients, jobs, workers and repeat work.'],
      ['Clear responsibilities', 'Each product area holds the facts needed for that part of the workflow.'],
      ['Owner-controlled', 'Prepared work waits for review instead of happening silently.'],
    ],
  },
  {
    route: '/security',
    title: 'Churvox security | Business data and owner controls',
    description: 'Read how Churvox approaches account access, business data separation, approvals and responsible security reporting.',
    eyebrow: 'Security and control',
    heading: 'Business records stay behind clear access and approval boundaries.',
    intro: 'Churvox separates business data, protects account access and keeps important communication, money and record actions under owner control.',
    points: [
      ['Account protection', 'Verified access and guarded business routes protect the workspace.'],
      ['Business separation', 'Records are scoped to the business they belong to.'],
      ['Approval guardrails', 'Important actions remain prepared until the owner approves them.'],
    ],
  },
  {
    route: '/support',
    title: 'Churvox support | Help for service businesses',
    description: 'Get email-based help with Churvox setup, jobs, workers, quotes, invoices, account access and tester participation.',
    eyebrow: 'Churvox help',
    heading: 'Get practical help by email.',
    intro: 'Churvox support covers setup, product questions, tester access and technical problems. Send the useful detail and we will point you toward the next step.',
    points: [
      ['Setup help', 'Questions about accounts, business details and the first useful workflow.'],
      ['Product help', 'Jobs, workers, quotes, invoices, Command and connected records.'],
      ['Email only', 'Use hello@churvox.com when you need a person to look at the issue.'],
    ],
    primaryHref: 'mailto:hello@churvox.com',
    primaryLabel: 'Email Churvox',
  },
  {
    route: '/contact',
    title: 'Contact Churvox | Product, setup and tester questions',
    description: 'Contact Churvox by email about product fit, setup, selected tester access or a technical problem.',
    eyebrow: 'Contact Churvox',
    heading: 'Tell us what is blocking the business.',
    intro: 'For product fit, setup, tester access or a technical issue, send the useful detail by email. There is no requirement to book a call.',
    points: [
      ['Product fit', 'Tell us the trade, team size and workflow you want to simplify.'],
      ['Tester access', 'Selected service businesses can apply for 30 days of tester access.'],
      ['Technical help', 'Include the page, action and what happened so it can be checked.'],
    ],
    primaryHref: 'mailto:hello@churvox.com',
    primaryLabel: 'Email hello@churvox.com',
  },
  {
    route: '/signup',
    title: 'Start a Churvox trial | 14 days free, no card upfront',
    description: 'Create a Churvox account, verify your email and start a 14-day trial. No card is required upfront.',
    eyebrow: 'Start a Churvox trial',
    heading: 'Create the account, verify the email, then try one real workflow.',
    intro: 'The public trial lasts 14 days and does not require a card upfront. Nothing is sent, charged, synced or changed without owner approval.',
    points: [
      ['Create the owner account', 'Use the email that should control the business workspace.'],
      ['Verify the email', 'Verification protects access before business records are added.'],
      ['Try one useful flow', 'Add a client, create a job and see what Churvox prepares.'],
    ],
    primaryHref: '/signup?plan=operator',
    primaryLabel: 'Start the 14-day trial',
  },
  {
    route: '/login',
    title: 'Log in to Churvox',
    description: 'Sign in to your Churvox owner or worker workspace.',
    eyebrow: 'Churvox account',
    heading: 'Log in to your workspace.',
    intro: 'Access the Churvox workspace for your business. Account pages are not included in public search results.',
    points: [],
    primaryHref: '/login',
    primaryLabel: 'Continue to login',
    robots: 'noindex,nofollow,noarchive',
  },
  {
    route: '/legal/privacy',
    title: 'Churvox privacy policy',
    description: 'Read how Churvox collects, uses, stores and protects personal and business information.',
    eyebrow: 'Churvox legal',
    heading: 'Privacy policy.',
    intro: 'This policy explains how Churvox handles information across the public website, owner workspace and worker experience.',
    points: [],
    primaryHref: '/legal/privacy',
    primaryLabel: 'Read the privacy policy',
  },
  {
    route: '/legal/terms',
    title: 'Churvox terms of service',
    description: 'Read the terms that apply when accessing or using Churvox job-management and business-admin services.',
    eyebrow: 'Churvox legal',
    heading: 'Terms of service.',
    intro: 'These terms explain the rules and responsibilities that apply when a business accesses or uses Churvox.',
    points: [],
    primaryHref: '/legal/terms',
    primaryLabel: 'Read the terms of service',
  },
  {
    route: '/refunds-cancellations',
    title: 'Churvox refunds and cancellations',
    description: 'Read the Churvox policy for subscription cancellations, access through the paid period and refund requests.',
    eyebrow: 'Churvox billing policy',
    heading: 'Refunds and cancellations.',
    intro: 'This page explains how cancellations take effect and how billing or refund questions can be raised with Churvox.',
    points: [],
    primaryHref: '/refunds-cancellations',
    primaryLabel: 'Read the policy',
  },
];

const aliases = [
  { route: '/privacy', canonical: '/legal/privacy', source: '/legal/privacy' },
  { route: '/terms', canonical: '/legal/terms', source: '/legal/terms' },
];

const industries = [
  {
    slug: 'lawn-care',
    title: 'Lawn and garden',
    heading: 'Run recurring outdoor work without losing the details.',
    intro: 'Churvox keeps regular rounds, one-off tidy ups, photos, access notes, worker updates and invoice drafts tied to the right client.',
    points: ['Fortnightly mowing rounds', 'Hedge trim extras', 'Gate and access notes', 'Before and after proof'],
  },
  {
    slug: 'landscaping',
    title: 'Landscaping',
    heading: 'Keep quotes, staged work and extras under owner control.',
    intro: 'For landscaping jobs, Churvox keeps the accepted scope, materials, crew notes, progress proof and invoice decisions together.',
    points: ['Quote-led projects', 'Materials and extras', 'Crew notes', 'Progress photos'],
  },
  {
    slug: 'cleaning',
    title: 'Cleaning',
    heading: 'Make recurring visits, access notes and proof easier to manage.',
    intro: 'Cleaning teams can keep site checklists, key and access notes, cleaner updates, client replies and repeat invoices in one clean record.',
    points: ['Recurring visits', 'Site checklists', 'Access and key notes', 'Cleaner updates'],
  },
  {
    slug: 'property-maintenance',
    title: 'Property maintenance',
    heading: 'Handle mixed jobs, tenants, keys and repeat clients without chaos.',
    intro: 'Churvox keeps tenants, landlords, job notes, photos, workers and money steps connected for property maintenance businesses.',
    points: ['Mixed repair jobs', 'Tenant and landlord notes', 'Keys and access', 'Urgent fixes'],
  },
  {
    slug: 'handyman',
    title: 'Handyman and repairs',
    heading: 'Small jobs still need clean admin.',
    intro: 'Churvox helps handyman businesses keep parts, photos, client approvals, quotes, job notes and invoices from turning into messy messages.',
    points: ['Small repairs', 'Parts notes', 'Client approvals', 'Quick quotes'],
  },
  {
    slug: 'painting',
    title: 'Painting',
    heading: 'Keep scope, rooms, extras and final invoice review together.',
    intro: 'Churvox keeps room and area scope, quote details, progress notes, extras and owner-approved billing in order for painting businesses.',
    points: ['Room and area scope', 'Quote details', 'Progress proof', 'Extras and final invoice checks'],
  },
  {
    slug: 'plumbing-electrical-hvac',
    title: 'Plumbing, electrical and HVAC',
    heading: 'Give urgent field work a safer admin handoff.',
    intro: 'Churvox keeps job details, parts notes, proof, safety notes and owner-controlled customer and accounting handoff clear for technical service work.',
    points: ['Urgent callouts', 'Parts notes', 'Safety notes', 'Owner-controlled handoff'],
  },
  {
    slug: 'pest-control',
    title: 'Pest control',
    heading: 'Track visits, notes and follow-ups cleanly.',
    intro: 'Pest control businesses can use Churvox for scheduled visits, treatment notes, follow-ups, proof and recurring customer reminders.',
    points: ['Scheduled visits', 'Treatment notes', 'Follow-ups', 'Recurring reminders'],
  },
  {
    slug: 'barber-hairdresser',
    title: 'Barber, hair and beauty',
    heading: 'Run appointments, clients, staff and follow-ups without field-service clutter.',
    intro: 'Churvox fits barbers, hairdressers and beauty studios with appointments, client history, services, staff, reminders and invoices.',
    points: ['Appointments and services', 'Client notes', 'Staff roster', 'Follow-up reminders'],
  },
];

for (const industry of industries) {
  publicPages.push({
    route: `/industries/${industry.slug}`,
    title: `${industry.title} job management software | Churvox`,
    description: `${industry.intro} Important communication and money steps remain under owner approval.`,
    eyebrow: `${industry.title} workflow`,
    heading: industry.heading,
    intro: industry.intro,
    points: industry.points.map((point) => [point, `Keep ${point.toLowerCase()} connected to the right client and job.`]),
    primaryHref: `/demo?industry=${encodeURIComponent(industry.slug)}`,
    primaryLabel: `Open the ${industry.title.toLowerCase()} demo`,
  });
}

for (const alias of aliases) {
  const source = publicPages.find((page) => page.route === alias.source);
  publicPages.push({ ...source, route: alias.route, canonical: alias.canonical });
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function replaceMeta(html, selector, replacement) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`<meta\\s+${escapedSelector}\\s+content="[^"]*"\\s*\\/?\\s*>`, 'i');
  return pattern.test(html) ? html.replace(pattern, replacement) : html.replace('</head>', `    ${replacement}\n  </head>`);
}

function fallbackMarkup(page) {
  const points = (page.points || []).map(([title, text]) => `
          <article><h2>${escapeHtml(title)}</h2><p>${escapeHtml(text)}</p></article>`).join('');
  const primaryHref = page.primaryHref || '/signup?plan=operator';
  const primaryLabel = page.primaryLabel || 'Start 14-day trial';

  return `<noscript>
    <style>
      .cvSearchPage{min-height:100vh;background:#f7f3ea;color:#111827;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.55}
      .cvSearchPage *{box-sizing:border-box}.cvSearchNav{background:linear-gradient(110deg,#080d16,#111827 62%,#3b1d0a);padding:20px clamp(20px,6vw,72px)}
      .cvSearchNav div{max-width:1160px;margin:auto;display:flex;align-items:center;justify-content:space-between;gap:24px;flex-wrap:wrap}.cvSearchNav a{color:#e2e8f0;text-decoration:none;font-weight:850;margin-right:16px}.cvSearchNav .brand{color:#fff;font-size:22px;font-weight:950}
      .cvSearchHero{max-width:1160px;margin:auto;padding:72px 22px 52px}.cvSearchHero small{color:#c2410c;font-weight:950;letter-spacing:.12em;text-transform:uppercase}.cvSearchHero h1{max-width:920px;margin:14px 0 22px;font-size:clamp(40px,7vw,76px);line-height:.98;letter-spacing:-.055em}.cvSearchHero>p{max-width:820px;font-size:20px;font-weight:650;color:#334155}
      .cvSearchActions{display:flex;gap:12px;flex-wrap:wrap;margin-top:28px}.cvSearchActions a{display:inline-flex;padding:14px 20px;border-radius:12px;background:#f97316;color:#111827;font-weight:950;text-decoration:none}.cvSearchActions a:last-child{background:#fff;border:1px solid #cbd5e1}
      .cvSearchGrid{max-width:1160px;margin:0 auto 64px;padding:0 22px;display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px}.cvSearchGrid article{background:#fff;border:1px solid #d8dee8;border-radius:16px;padding:22px}.cvSearchGrid h2{margin:0 0 8px;font-size:20px}.cvSearchGrid p{margin:0;color:#475569}
      .cvSearchFoot{border-top:1px solid #d8dee8;background:#fff;padding:30px 22px}.cvSearchFoot div{max-width:1160px;margin:auto;font-weight:800}
    </style>
    <main class="cvSearchPage">
      <header class="cvSearchNav"><div><a class="brand" href="/">Churvox</a><nav aria-label="Public navigation"><a href="/product">Product</a><a href="/pricing">Pricing</a><a href="/demo">Demo</a><a href="/testers/">Become a tester</a><a href="/login">Log in</a></nav></div></header>
      <section class="cvSearchHero">
        <small>${escapeHtml(page.eyebrow)}</small>
        <h1>${escapeHtml(page.heading)}</h1>
        <p>${escapeHtml(page.intro)}</p>
        <div class="cvSearchActions"><a href="${escapeHtml(primaryHref)}">${escapeHtml(primaryLabel)}</a><a href="/testers/">Apply for selected tester access</a></div>
      </section>
      ${points ? `<section class="cvSearchGrid">${points}\n      </section>` : ''}
      <footer class="cvSearchFoot"><div>Churvox · hello@churvox.com · Owner-controlled job admin for service businesses.</div></footer>
    </main>
  </noscript>`;
}

function pageHtml(baseHtml, page) {
  const canonicalPath = page.canonical || page.route;
  const canonical = `${SITE}${canonicalPath === '/' ? '/' : canonicalPath}`;
  const robots = page.robots || 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1';
  let html = baseHtml;

  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(page.title)}</title>`);
  html = replaceMeta(html, 'name="description"', `<meta name="description" content="${escapeHtml(page.description)}" />`);
  html = replaceMeta(html, 'name="robots"', `<meta name="robots" content="${escapeHtml(robots)}" />`);
  html = replaceMeta(html, 'property="og:title"', `<meta property="og:title" content="${escapeHtml(page.title)}" />`);
  html = replaceMeta(html, 'property="og:description"', `<meta property="og:description" content="${escapeHtml(page.description)}" />`);
  html = replaceMeta(html, 'property="og:url"', `<meta property="og:url" content="${escapeHtml(canonical)}" />`);
  html = replaceMeta(html, 'name="twitter:title"', `<meta name="twitter:title" content="${escapeHtml(page.title)}" />`);
  html = replaceMeta(html, 'name="twitter:description"', `<meta name="twitter:description" content="${escapeHtml(page.description)}" />`);
  html = html.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${escapeHtml(canonical)}" />`);
  html = html.replace(/<noscript>[\s\S]*?<\/noscript>/i, fallbackMarkup(page));

  return html;
}

const baseHtml = fs.readFileSync(BASE_INDEX, 'utf8');
const seenTitles = new Set();

for (const page of publicPages) {
  if (!page.route.startsWith('/') || page.route === '/') throw new Error(`Invalid generated route: ${page.route}`);
  if (!page.title || !page.description || !page.heading || !page.intro) throw new Error(`Incomplete search page: ${page.route}`);
  if (!page.canonical && seenTitles.has(page.title)) throw new Error(`Duplicate generated title: ${page.title}`);
  seenTitles.add(page.title);

  const outputDir = path.join(BUILD, ...page.route.split('/').filter(Boolean));
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'index.html'), pageHtml(baseHtml, page), 'utf8');
}

console.log(`CHURVOX PUBLIC SEARCH PAGES GENERATED (${publicPages.length} routes)`);
