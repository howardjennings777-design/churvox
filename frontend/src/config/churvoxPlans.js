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
    summary: "For owner-operators who want the basics organised.",
    blurb: "For solo tradies who want jobs, clients, quotes and invoices in one simple place.",
    bestFor: "Best for one-person trade and service businesses.",
    limits: [
      "Up to 20 active clients",
      "Jobs, clients, quotes and invoices in one place",
      "Job photos and time tracking",
      "Basic Smart Hub overview",
      "Owner-only access",
      "Basic admin suggestions",
      "MYOB not included",
      "Payroll not included",
    ],
    includes: [
      "Up to 20 active clients",
      "Create, schedule and complete jobs",
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
    summary: "For owners with workers on jobs.",
    blurb: "For crews that need job assignment, worker updates, photos, notes and team visibility.",
    bestFor: "Best for small crews that need clear job assignment.",
    limits: [
      "Up to 30 active clients",
      "Everything in Start",
      "Add workers and assign jobs",
      "Worker app and job view",
      "Job assignment and worker workflow",
      "Worker photo upload",
      "Basic schedule conflict warnings",
      "MYOB not included",
    ],
    includes: [
      "Everything in Start",
      "Worker accounts and job views",
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
    summary: "For busy owners who want admin prepared for approval.",
    blurb: "For owners who want Churvox to prepare invoices, reminders, follow-ups and job actions before they approve.",
    bestFor: "Best for owners who want Churvox preparing the daily admin.",
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
      "Urgent job and admin alerts",
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
    summary: "For larger teams that need the full command centre.",
    blurb: "For larger operators that need MYOB included, payroll workspace, advanced roles, reports and higher limits.",
    bestFor: "Best for bigger teams, office admin and payroll-heavy businesses.",
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
