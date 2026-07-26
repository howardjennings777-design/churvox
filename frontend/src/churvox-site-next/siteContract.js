export const CHURVOX_PROMISE = "Churvox does the admin. The owner checks and approves.";

export const SURFACES = [
  { key: "public", label: "Public website", href: "/new-command-lab?surface=public" },
  { key: "owner", label: "Owner Office OS", href: "/new-command-lab" },
  { key: "hq", label: "Churvox HQ", href: "/new-command-lab?surface=hq" },
];

export const PUBLIC_PAGES = [
  { key: "home", label: "Home", purpose: "Explain the background office and move the right owner into a useful first step." },
  { key: "product", label: "Product", purpose: "Show the complete request-to-payment operating loop without feature-list clutter." },
  { key: "pricing", label: "Pricing", purpose: "Keep the locked plans clear, honest and easy to compare." },
  { key: "industries", label: "Industries", purpose: "Translate one Churvox operating model into the language of each service business." },
  { key: "demo", label: "Demo", purpose: "Prove the owner-control workflow with clearly labelled sample records." },
  { key: "security", label: "Trust", purpose: "Explain approval, isolation, audit, privacy, recovery and data ownership." },
  { key: "support", label: "Support", purpose: "Give owners a direct path to setup, migration, billing and product help." },
  { key: "contact", label: "Contact", purpose: "Keep sales and support email-first and low pressure." },
];

export const PLANS = [
  {
    name: "Start",
    price: "$39",
    suffix: "/month + GST",
    fit: "Solo service businesses getting jobs, clients, quotes and invoices under control.",
    features: ["Clients and properties", "Jobs and recurring work", "Quotes and invoices", "Owner Today view"],
  },
  {
    name: "Crew",
    price: "$89",
    suffix: "/month + GST",
    fit: "Businesses adding workers, field updates and simple team coordination.",
    features: ["Everything in Start", "Worker access", "Time and proof", "Team coordination"],
  },
  {
    name: "Operator",
    price: "$149",
    suffix: "/month + GST",
    fit: "Busy owners who want prepared admin and the Command approval desk.",
    features: ["Everything in Crew", "Command approvals", "Background office desks", "Churvox Guard"],
    featured: true,
  },
  {
    name: "Command",
    price: "$299",
    suffix: "/month + GST",
    fit: "Larger operations needing deeper controls, payroll review and more active-team capacity.",
    features: ["Everything in Operator", "50 active team members", "Payroll review", "Deeper reporting and controls"],
  },
];

export const ADDONS = [
  {
    name: "Command Growth Pack",
    price: "$99",
    suffix: "/month + GST",
    purpose: "Adds 50 active team members and extra capacity without counting inactive or former staff.",
  },
];

export const OFFICE_DESKS = [
  ["Reception", "Turns requests and messages into complete client, quote or booking drafts."],
  ["Scheduling", "Checks availability, recurrence, duration, skills, travel and clashes."],
  ["Job Control", "Watches assigned work, delays, issues, acknowledgements and completion."],
  ["Quality", "Checks proof, checklist, notes, extras and customer requirements."],
  ["Money", "Prepares quotes, invoice drafts, payment follow-ups and profitability checks."],
  ["Client Memory", "Keeps access, preferences, pricing, promises and history attached to the relationship."],
  ["Operations", "Finds repeated problems, capacity gaps and process improvements."],
  ["Churvox Guard", "Protects promises, proof, margin, permissions and execution reliability."],
];

export const INDUSTRIES = [
  ["Lawn care", "Recurring runs, weather changes, photos and fast invoicing."],
  ["Landscaping", "Stages, variations, materials, labour and progress billing."],
  ["Cleaning", "Access details, checklists, recurring visits and proof."],
  ["Property maintenance", "Mixed work, tenant access, approvals and return visits."],
  ["Handyman", "Callouts, time, parts, variations and follow-up."],
  ["Painting", "Quotes, stages, colour notes, proof and progress invoices."],
  ["Plumbing", "Urgent work, parts, safety notes and customer updates."],
  ["Electrical", "Job scope, compliance notes, variations and proof."],
  ["Pest control", "Treatment history, recurrence, property notes and reminders."],
  ["Hair and beauty", "Appointments, preferences, rebooking and deposits."],
];

export const CUSTOMER_PAGES = [
  ["request", "Request work", "A simple customer request enters Reception without silently changing the schedule."],
  ["quote", "Approve quote", "The customer can review scope, price and terms before accepting."],
  ["invoice", "View invoice", "The customer sees the approved invoice and verified payment status."],
  ["portal", "Client portal", "Upcoming work, history, documents and change requests stay in one place."],
  ["proof", "Proof pack", "Photos, checklist, notes and sign-off show what was completed."],
];

export const HQ_AREAS = [
  ["Command", "Platform decisions, incidents and exceptions needing the Churvox owner."],
  ["Businesses", "Accounts, plans, access, setup progress and business health."],
  ["Billing", "Verified subscriptions, trials, failed payments, refunds and MRR truth."],
  ["Testers", "Applications, invitations, access windows, feedback and tester outcomes."],
  ["Support", "Issues, replies, product feedback and owner follow-up."],
  ["Incidents", "Errors, failed actions, queues, integrations and recovery state."],
  ["Releases", "Build checks, staging evidence, migration readiness and cutover gates."],
  ["Data", "Exports, deletion, retention, privacy controls and audit evidence."],
];

export const WHOLE_SITE_RELEASE_GATES = [
  "Every public route has a clear purpose, title, description and useful no-JavaScript fallback.",
  "Pricing comes from the locked plan source and cannot drift between public, signup, billing or HQ.",
  "Customer-facing pages never expose another business or allow an unverified financial state change.",
  "Owner, worker, customer and HQ roles are isolated and tested on desktop and mobile.",
  "Command approvals, external actions and retries remain idempotent and fully audited.",
  "Migration has preview, duplicate checks, rollback rehearsal and verified record counts.",
  "Staging passes build, browser, accessibility, security, billing and real-business workflow gates before cutover.",
];
