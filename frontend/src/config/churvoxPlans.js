// CHURVOX_LOCKED_PLAN_TIERS_20260602
// This is the single source of truth for Churvox pricing and tier inclusions.
// Backend billing keys stay as: solo, team, pro, enterprise.
// Customer-facing plan names are: Start, Crew, Operator, Command.

export const PLAN_KEYS = {
  START: "solo",
  CREW: "team",
  OPERATOR: "pro",
  COMMAND: "enterprise",
};

export const CHURVOX_PLANS = [
  {
    key: "solo",
    name: "Start",
    price: "$39",
    period: "/month + GST",
    tag: "Owner-operator",
    featured: false,
    clientLimit: 20,
    teamLimit: 1,
    summary: "For solo tradies who need to get organised.",
    blurb: "For solo tradies who need jobs, clients, quotes and invoices in one simple place.",
    bestFor: "Best for solo trade and service owners.",
    limits: [
      "Up to 20 active clients",
      "Jobs, clients, quotes and invoices",
      "Job photos and time tracking",
      "Basic Smart Hub overview",
      "Owner-only access",
      "Very limited AI suggestions",
      "MYOB not included",
      "Payroll not included",
    ],
    includes: [
      "Up to 20 active clients",
      "Create, view, schedule and complete jobs",
      "Quotes and draft invoices",
      "Job photos and time tracking",
      "Basic Smart Hub overview",
      "Installable mobile/PWA access",
    ],
    notIncluded: [
      "Worker accounts",
      "Full AI Operator approval queue",
      "MYOB sync",
      "Payroll workspace",
    ],
  },
  {
    key: "team",
    name: "Crew",
    price: "$89",
    period: "/month + GST",
    tag: "Small team",
    featured: false,
    clientLimit: 30,
    teamLimit: "Small crew",
    summary: "For small teams that need job control.",
    blurb: "For small crews that need job assignment, worker updates, photos and team control.",
    bestFor: "Best for owners with workers on jobs.",
    limits: [
      "Up to 30 active clients",
      "Everything in Start",
      "Add workers",
      "Worker app and job view",
      "Job assignment and team workflow",
      "Worker photo upload",
      "Basic schedule conflict warnings",
      "MYOB not included",
    ],
    includes: [
      "Everything in Start",
      "Worker accounts and worker job view",
      "Assign jobs to workers",
      "Worker job status updates",
      "Worker photo upload",
      "Team notes and job notes",
      "Team-focused Smart Hub overview",
    ],
    notIncluded: [
      "Full AI Operator approval queue",
      "MYOB sync",
      "Full payroll workspace",
      "Advanced office/payroll roles",
    ],
  },
  {
    key: "pro",
    name: "Operator",
    price: "$149",
    period: "/month + GST",
    tag: "Most popular",
    featured: true,
    clientLimit: 40,
    teamLimit: "Growing crew",
    summary: "For owners who want Churvox to prepare the admin.",
    blurb: "For owners who want Churvox to prepare invoices, reminders, follow-ups and job actions for approval.",
    bestFor: "Best for busy owners who want Churvox preparing the admin.",
    limits: [
      "Up to 40 active clients",
      "Everything in Crew",
      "AI Operator Actions",
      "Owner approval queue",
      "AI-prepared invoice descriptions",
      "Quote follow-up drafts",
      "Invoice reminder drafts",
      "MYOB add-on available",
    ],
    includes: [
      "Everything in Crew",
      "AI Operator Actions",
      "Owner approval queue",
      "AI-prepared invoice descriptions",
      "Quote follow-up drafts",
      "Invoice reminder drafts",
      "Urgent job and admin action detection",
      "Worker assignment suggestions",
      "Practical automations",
      "MYOB add-on available for $39/month + GST",
    ],
    notIncluded: [
      "MYOB included by default",
      "Full payroll workspace",
      "Command Growth Packs",
      "Priority support",
    ],
  },
  {
    key: "enterprise",
    name: "Command",
    price: "$299",
    period: "/month + GST",
    tag: "Full command",
    featured: false,
    clientLimit: 50,
    teamLimit: 50,
    summary: "For serious trade businesses that want the full command centre.",
    blurb: "For larger operators needing MYOB included, payroll workspace, advanced roles and more control.",
    bestFor: "Best for bigger teams and admin-heavy businesses.",
    limits: [
      "Up to 50 active clients",
      "Up to 50 active team members",
      "Everything in Operator",
      "MYOB included",
      "Payroll workspace",
      "Advanced roles and permissions",
      "Higher AI Operator capacity",
      "Priority support",
    ],
    includes: [
      "Everything in Operator",
      "Up to 50 active clients",
      "Up to 50 active team members",
      "MYOB included",
      "Payroll workspace",
      "Owner, Manager, Worker, Office Admin and Payroll roles",
      "Advanced automations",
      "Higher AI Operator Action limits",
      "Payroll, job, invoice and team reports",
      "Priority support",
    ],
    notIncluded: [
      "SMS credits are separate credit packs",
    ],
  },
];

export const APP_PLANS = CHURVOX_PLANS.map((plan) => ({
  key: plan.key,
  name: plan.name,
  price: plan.price,
  period: plan.period,
  tag: plan.tag,
  summary: plan.summary,
  blurb: plan.blurb,
  bestFor: plan.bestFor,
  clientLimit: plan.clientLimit,
  teamLimit: plan.teamLimit,
  limits: plan.limits,
  includes: plan.includes,
  notIncluded: plan.notIncluded,
  featured: plan.featured,
}));

export const MARKETING_PLANS = CHURVOX_PLANS.map((plan) => ({
  key: plan.key,
  name: plan.name,
  price: plan.price,
  tag: plan.tag,
  summary: plan.summary,
  bestFor: plan.bestFor,
  includes: plan.includes,
  notIncluded: plan.notIncluded,
  featured: plan.featured,
}));

export const QUICK_PRICING_NOTES = [
  "Prices exclude GST.",
  "SMS credits are bought separately when needed.",
  "Operator can add MYOB for $39/month + GST.",
  "Command includes MYOB by default.",
  "Command Growth Pack adds 50 more active team members.",
];

export const COMMAND_GROWTH_PACK = {
  key: "command_growth_pack",
  name: "Command Growth Pack",
  price: "$99",
  period: "/month + GST",
  headline: "+50 active team members",
  description: "Add more crew, more jobs and more AI Operator capacity as your business grows.",
  includes: [
    "Command includes up to 50 active team members",
    "Each Growth Pack adds 50 more active team members",
    "Extra job capacity, AI Operator Actions and automation runs",
    "Extra admin and payroll capacity as the crew grows",
    "Inactive or old staff records should not count as billable",
  ],
};

export const SMS_PACKS = [
  { key: "sms_100", credits: "100", price: "$10", note: "Light reminders and small follow-up runs." },
  { key: "sms_500", credits: "500", price: "$45", note: "Best for active crews using reminders regularly." },
  { key: "sms_1000", credits: "1,000", price: "$80", note: "Lowest cost per credit for busy operators." },
];

export function nicePlanName(key) {
  const plan = CHURVOX_PLANS.find((item) => item.key === String(key || "").toLowerCase());
  if (plan) return plan.name;
  const value = String(key || "");
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
}

export function getPlan(key) {
  return CHURVOX_PLANS.find((item) => item.key === String(key || "").toLowerCase()) || null;
}

export function isOperatorOrAbove(key) {
  return ["pro", "enterprise"].includes(String(key || "").toLowerCase());
}

export function isCommand(key) {
  return String(key || "").toLowerCase() === "enterprise";
}


export const PLAN_RANKS = {
  none: 0,
  solo: 1,
  team: 2,
  pro: 3,
  enterprise: 4,
};

export function planRank(key) {
  return PLAN_RANKS[String(key || "none").toLowerCase()] || 0;
}

export function hasPlanAtLeast(currentPlan, requiredPlan) {
  return planRank(currentPlan) >= planRank(requiredPlan);
}

export function requiredPlanLabel(requiredPlan) {
  return nicePlanName(requiredPlan) || "a higher plan";
}
