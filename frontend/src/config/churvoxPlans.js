// CHURVOX_LOCKED_PLAN_TIERS_20260608
// Single source of truth for Churvox pricing and tier inclusions.
// Backend billing keys stay as: solo, team, pro, enterprise.
// Customer-facing plan names are: Start, Crew, Operator, Command.

export const PLAN_KEYS = {
  START: "solo",
  CREW: "team",
  OPERATOR: "pro",
  COMMAND: "enterprise",
};

export const XERO_ADDON = {
  key: "xero_addon",
  name: "Xero add-on",
  price: "$39",
  period: "/month + GST",
  headline: "Approval-first Xero sync",
  description: "Add Xero sync to Operator or Command. Churvox prepares the accounting action and the owner approves before anything syncs.",
  includes: [
    "Xero invoice sync direction",
    "Approval-first accounting actions",
    "Customer/invoice matching support",
    "Accounting status visibility",
  ],
};

export const CHURVOX_PLANS = [
  {
    key: "solo",
    name: "Start",
    price: "$39",
    period: "/month + GST",
    tag: "Owner plan",
    featured: false,
    clientLimit: 20,
    teamLimit: 1,
    summary: "For solo owners who need the basics in one place.",
    blurb: "Jobs, clients, quotes and invoices for a one-person trade business.",
    bestFor: "Best for owner-operators starting clean.",
    limits: ["Up to 20 active clients", "Owner-only access", "Jobs, clients, quotes and invoices", "No worker accounts"],
    includes: ["Up to 20 active clients", "Jobs, clients, quotes and invoices", "Job photos and time tracking", "Simple Command Board", "Mobile/PWA access"],
    notIncluded: ["Worker accounts", "AI Operator approval queue", "Xero add-on", "Payroll workspace"],
  },
  {
    key: "team",
    name: "Crew",
    price: "$89",
    period: "/month + GST",
    tag: "Small crew",
    featured: false,
    clientLimit: 30,
    teamLimit: "Small crew",
    summary: "For owners who need workers organised.",
    blurb: "Assign jobs, see worker updates and keep crew work visible.",
    bestFor: "Best when workers are out doing jobs.",
    limits: ["Up to 30 active clients", "Worker accounts", "Job assignment", "No accounting add-on"],
    includes: ["Everything in Start", "Worker accounts and job views", "Assign jobs to workers", "Worker status updates", "Worker photo upload", "Team notes and job notes"],
    notIncluded: ["AI Operator approval queue", "Xero add-on", "Payroll workspace", "Advanced office roles"],
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
    summary: "For owners who want Churvox preparing admin.",
    blurb: "Churvox prepares invoices, reminders, quote follow-ups and job actions for approval.",
    bestFor: "Best when admin is slowing the owner down.",
    limits: ["Up to 40 active clients", "AI Operator Actions", "Owner approval queue", "Xero add-on available"],
    includes: ["Everything in Crew", "AI Operator Actions", "Owner approval queue", "Invoice description drafts", "Quote follow-up drafts", "Invoice reminder drafts", "Worker assignment suggestions", "Xero add-on available"],
    notIncluded: ["Payroll workspace", "Command Growth Packs", "Priority support"],
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
    summary: "For larger teams that need full control.",
    blurb: "Payroll, advanced roles, reports, Xero add-on support and higher capacity in one command centre.",
    bestFor: "Best for admin-heavy teams with office or payroll staff.",
    limits: ["Up to 50 active clients", "Up to 50 active team members", "Xero add-on available", "Payroll workspace"],
    includes: ["Everything in Operator", "Up to 50 active clients", "Up to 50 active team members", "Xero add-on support", "Payroll workspace", "Advanced roles", "Reports and exports", "Priority support"],
    notIncluded: ["SMS credits are separate", "Command Growth Packs are separate"],
  },
];

export const APP_PLANS = CHURVOX_PLANS.map((plan) => ({ ...plan }));
export const MARKETING_PLANS = CHURVOX_PLANS.map((plan) => ({ ...plan }));

export const QUICK_PRICING_NOTES = [
  "Prices exclude GST.",
  "SMS credits are separate and coming soon.",
  "Operator and Command can add Xero for $39/month + GST.",
  "Command includes up to 50 active team members.",
  "Command Growth Pack adds 50 active team members.",
];

export const COMMAND_GROWTH_PACK = {
  key: "command_growth_pack",
  name: "Command Growth Pack",
  price: "$99",
  period: "/month + GST",
  headline: "+50 active team members",
  description: "Add more crew, jobs and AI Operator capacity as the business grows.",
  includes: [
    "Command includes 50 active team members",
    "Each Growth Pack adds 50 more active team members",
    "Extra job and AI Operator capacity",
    "Extra admin and payroll capacity",
    "Inactive staff do not count as billable",
  ],
};

export const BILLING_ADDONS = [XERO_ADDON, COMMAND_GROWTH_PACK];

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

export const PLAN_RANKS = { none: 0, solo: 1, team: 2, pro: 3, enterprise: 4 };

export function planRank(key) {
  return PLAN_RANKS[String(key || "none").toLowerCase()] || 0;
}

export function hasPlanAtLeast(currentPlan, requiredPlan) {
  return planRank(currentPlan) >= planRank(requiredPlan);
}

export function requiredPlanLabel(requiredPlan) {
  return nicePlanName(requiredPlan) || "a higher plan";
}
