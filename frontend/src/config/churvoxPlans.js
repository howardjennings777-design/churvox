// Churvox locked pricing config.
// Keep backend plan keys as solo, team, pro, enterprise.
// Customer-facing names are Start, Crew, Operator, Command.

export const PLAN_KEYS = {
  START: "solo",
  CREW: "team",
  OPERATOR: "pro",
  COMMAND: "enterprise"
};

export const PLAN_ALIASES = {
  start: "solo",
  solo: "solo",
  crew: "team",
  team: "team",
  operator: "pro",
  pro: "pro",
  command: "enterprise",
  enterprise: "enterprise"
};

export const COUNTRY_OPTIONS = [
  {
    code: "NZ",
    label: "New Zealand",
    currency: "NZD",
    symbol: "NZ$",
    taxLabel: "+ GST"
  },
  {
    code: "AU",
    label: "Australia",
    currency: "AUD",
    symbol: "A$",
    taxLabel: "+ GST"
  },
  {
    code: "US",
    label: "United States",
    currency: "USD",
    symbol: "US$",
    taxLabel: ""
  },
  {
    code: "UK",
    label: "United Kingdom",
    currency: "GBP",
    symbol: "GBP",
    taxLabel: "+ VAT"
  }
];

export const PLAN_PRICING = {
  solo: {
    key: "solo",
    code: "start",
    name: "Start",
    price: 39,
    monthly: 39,
    interval: "month",
    tagline: "For solo operators getting organised.",
    description: "Simple jobs, clients, quotes and invoices for one-person trade or service businesses.",
    cta: "Start free trial",
    popular: false,
    features: [
      "Jobs and clients",
      "Quotes and invoices",
      "Basic scheduling",
      "Basic AI admin help",
      "Up to 20 active clients"
    ]
  },
  team: {
    key: "team",
    code: "crew",
    name: "Crew",
    price: 89,
    monthly: 89,
    interval: "month",
    tagline: "For small crews that need control.",
    description: "Run jobs, team assignments, clients, quotes and invoices from one workspace.",
    cta: "Start free trial",
    popular: false,
    features: [
      "Everything in Start",
      "Team workflow",
      "Worker assignments",
      "Time tracking",
      "Up to 30 active clients"
    ]
  },
  pro: {
    key: "pro",
    code: "operator",
    name: "Operator",
    price: 149,
    monthly: 149,
    interval: "month",
    tagline: "Churvox does the admin. You approve.",
    description: "For growing teams that want AI Operator Actions prepared for owner approval.",
    cta: "Start free trial",
    popular: true,
    badge: "Most Popular",
    features: [
      "Everything in Crew",
      "AI Operator Actions",
      "Approval queue",
      "Advanced job admin",
      "Xero add-on available",
      "Up to 40 active clients"
    ]
  },
  enterprise: {
    key: "enterprise",
    code: "command",
    name: "Command",
    price: 299,
    monthly: 299,
    interval: "month",
    tagline: "Full command centre for larger teams.",
    description: "Advanced control, roles, payroll workspace, Xero support and priority support.",
    cta: "Start free trial",
    popular: false,
    features: [
      "Everything in Operator",
      "Up to 50 active clients",
      "Up to 50 active team members",
      "Xero support",
      "Payroll workspace",
      "Advanced roles",
      "Reports and exports",
      "Priority support"
    ],
    addonNote: "SMS credits and Command Growth Packs can be added when needed."
  }
};

export const CHURVOX_PLANS = [
  PLAN_PRICING.solo,
  PLAN_PRICING.team,
  PLAN_PRICING.pro,
  PLAN_PRICING.enterprise
];

export const PLANS = CHURVOX_PLANS;

export const COMMAND_ADDONS = [
  "SMS credits can be added when needed.",
  "Command Growth Packs can be added as your team grows."
];

export const PLAN_LIMITS = {
  solo: {
    clients: 20,
    teamMembers: 1
  },
  team: {
    clients: 30,
    teamMembers: 10
  },
  pro: {
    clients: 40,
    teamMembers: 25
  },
  enterprise: {
    clients: 50,
    teamMembers: 50
  }
};

export const GROWTH_PACK = {
  name: "Command Growth Pack",
  price: 99,
  monthly: 99,
  addsTeamMembers: 50,
  description: "Add more crew, more jobs and more AI Operator capacity as your business grows."
};

export const XERO_ADDON = {
  name: "Xero add-on",
  price: 39,
  monthly: 39,
  description: "Optional Xero support for Operator. Included with Command."
};

export function normalizePlanKey(planKey) {
  const key = String(planKey || "solo").toLowerCase();
  return PLAN_ALIASES[key] || "solo";
}

export function getPlanConfig(planKey) {
  const key = normalizePlanKey(planKey);
  return PLAN_PRICING[key] || PLAN_PRICING.solo;
}

export function getPlanName(planKey) {
  return getPlanConfig(planKey).name;
}

export function getPlanPrice(planKey) {
  return getPlanConfig(planKey).monthly;
}

export function getCountryConfig(countryCode) {
  const code = String(countryCode || "NZ").toUpperCase();
  return COUNTRY_OPTIONS.find((country) => country.code === code) || COUNTRY_OPTIONS[0];
}

export function formatPlanPrice(planKey, countryCode) {
  const plan = getPlanConfig(planKey);
  const country = getCountryConfig(countryCode);
  const tax = country.taxLabel ? " " + country.taxLabel : "";
  return country.symbol + plan.monthly + "/month" + tax;
}

export default {
  PLAN_KEYS,
  PLAN_ALIASES,
  COUNTRY_OPTIONS,
  PLAN_PRICING,
  CHURVOX_PLANS,
  PLANS,
  COMMAND_ADDONS,
  PLAN_LIMITS,
  GROWTH_PACK,
  XERO_ADDON,
  normalizePlanKey,
  getPlanConfig,
  getPlanName,
  getPlanPrice,
  getCountryConfig,
  formatPlanPrice
};
