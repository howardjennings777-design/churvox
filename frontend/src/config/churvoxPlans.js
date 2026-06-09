// Churvox pricing config.
// Backend plan keys stay: solo, team, pro, enterprise.
// Public plan names: Start, Crew, Operator, Command.

export const DEFAULT_COUNTRY = "NZ";

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
  { code: "NZ", label: "New Zealand", currency: "NZD", symbol: "NZ$", taxLabel: "+ GST" },
  { code: "AU", label: "Australia", currency: "AUD", symbol: "A$", taxLabel: "+ GST" },
  { code: "US", label: "United States", currency: "USD", symbol: "US$", taxLabel: "" },
  { code: "UK", label: "United Kingdom", currency: "GBP", symbol: "GBP", taxLabel: "+ VAT" }
];

export const COUNTRIES = COUNTRY_OPTIONS;
export const AVAILABLE_COUNTRIES = COUNTRY_OPTIONS;
export const BILLING_COUNTRIES = COUNTRY_OPTIONS;

export const PLAN_ORDER = ["solo", "team", "pro", "enterprise"];

export const PLAN_PRICING = {
  solo: {
    key: "solo",
    code: "start",
    tag: "Start",
    name: "Start",
    summary: "For solo operators getting organised.",
    tagline: "For solo operators getting organised.",
    description: "Simple jobs, clients, quotes and invoices for one-person trade or service businesses.",
    price: 39,
    monthly: 39,
    period: "month",
    interval: "month",
    cta: "Start free trial",
    popular: false,
    includes: [
      "Jobs and clients",
      "Quotes and invoices",
      "Basic scheduling",
      "Basic AI admin help",
      "Up to 20 active clients"
    ],
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
    tag: "Crew",
    name: "Crew",
    summary: "For small crews that need control.",
    tagline: "For small crews that need control.",
    description: "Run jobs, team assignments, clients, quotes and invoices from one workspace.",
    price: 89,
    monthly: 89,
    period: "month",
    interval: "month",
    cta: "Start free trial",
    popular: false,
    includes: [
      "Everything in Start",
      "Team workflow",
      "Worker assignments",
      "Time tracking",
      "Up to 30 active clients"
    ],
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
    tag: "Operator",
    name: "Operator",
    summary: "Churvox does the admin. You approve.",
    tagline: "Churvox does the admin. You approve.",
    description: "For growing teams that want AI Operator Actions prepared for owner approval.",
    price: 149,
    monthly: 149,
    period: "month",
    interval: "month",
    cta: "Start free trial",
    popular: true,
    badge: "Most Popular",
    includes: [
      "Everything in Crew",
      "AI Operator Actions",
      "Approval queue",
      "Advanced job admin",
      "Xero add-on available",
      "Up to 40 active clients"
    ],
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
    tag: "Command",
    name: "Command",
    summary: "Full command centre for larger teams.",
    tagline: "Full command centre for larger teams.",
    description: "Advanced control, roles, payroll workspace, Xero support and priority support.",
    price: 299,
    monthly: 299,
    period: "month",
    interval: "month",
    cta: "Start free trial",
    popular: false,
    includes: [
      "Everything in Operator",
      "Up to 50 active clients",
      "Up to 50 active team members",
      "Xero support",
      "Payroll workspace",
      "Advanced roles",
      "Reports and exports",
      "Priority support"
    ],
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
export const BASE_PLANS = CHURVOX_PLANS;
export const PLAN_LIST = CHURVOX_PLANS;

export const PLAN_LIMITS = {
  solo: { clients: 20, teamMembers: 1 },
  team: { clients: 30, teamMembers: 10 },
  pro: { clients: 40, teamMembers: 25 },
  enterprise: { clients: 50, teamMembers: 50 }
};

export const PLAN_NAMES = {
  solo: "Start",
  team: "Crew",
  pro: "Operator",
  enterprise: "Command"
};

export const PLAN_DISPLAY_NAMES = PLAN_NAMES;

export const PLAN_PRICES = {
  solo: 39,
  team: 89,
  pro: 149,
  enterprise: 299
};

export const GROWTH_PACK = {
  key: "command_growth_pack",
  code: "command_growth_pack",
  name: "Command Growth Pack",
  tag: "Growth Pack",
  price: 99,
  monthly: 99,
  period: "month",
  interval: "month",
  addsTeamMembers: 50,
  description: "Add more crew, more jobs and more AI Operator capacity as your business grows."
};

export const COMMAND_GROWTH_PACK = GROWTH_PACK;
export const COMMAND_GROWTH_PACK_ADDON = GROWTH_PACK;
export const GROWTH_PACK_ADDON = GROWTH_PACK;

export const XERO_ADDON = {
  key: "xero_addon",
  code: "xero_addon",
  name: "Xero add-on",
  tag: "Xero",
  price: 39,
  monthly: 39,
  period: "month",
  interval: "month",
  description: "Optional Xero support for Operator. Included with Command."
};

export const ADDONS = [GROWTH_PACK, XERO_ADDON];

export const COMMAND_ADDONS = [
  "SMS credits can be added when needed.",
  "Command Growth Packs can be added as your team grows."
];

export function normalizePlanKey(planKey) {
  const key = String(planKey || "solo").trim().toLowerCase();
  return PLAN_ALIASES[key] || "solo";
}

export function normalisePlanKey(planKey) {
  return normalizePlanKey(planKey);
}

export function getPlanConfig(planKey) {
  const key = normalizePlanKey(planKey);
  return PLAN_PRICING[key] || PLAN_PRICING.solo;
}

export function getPlan(planKey) {
  return getPlanConfig(planKey);
}

export function getPlanName(planKey) {
  return getPlanConfig(planKey).name;
}

export function nicePlanName(planKey) {
  return getPlanName(planKey);
}

export function requiredPlanLabel(planKey) {
  return getPlanName(planKey);
}

export function planLabel(planKey) {
  return getPlanName(planKey);
}

export function getPlanPrice(planKey) {
  return getPlanConfig(planKey).monthly;
}

export function planPrice(planKey) {
  return getPlanPrice(planKey);
}

export function planRank(planKey) {
  const key = normalizePlanKey(planKey);
  const index = PLAN_ORDER.indexOf(key);
  return index === -1 ? 0 : index;
}

export function isPlanAtLeast(currentPlan, requiredPlan) {
  return planRank(currentPlan) >= planRank(requiredPlan);
}

export function hasPlanAtLeast(currentPlan, requiredPlan) {
  return isPlanAtLeast(currentPlan, requiredPlan);
}

export function hasRequiredPlan(currentPlan, requiredPlan) {
  return isPlanAtLeast(currentPlan, requiredPlan);
}

export function planHasAccess(currentPlan, requiredPlan) {
  return isPlanAtLeast(currentPlan, requiredPlan);
}

export function canUsePlanFeature(currentPlan, requiredPlan) {
  return isPlanAtLeast(currentPlan, requiredPlan);
}

export function normalizeCountry(countryCode) {
  const code = String(countryCode || DEFAULT_COUNTRY).trim().toUpperCase();
  const aliases = {
    NZ: "NZ",
    NZL: "NZ",
    "NEW ZEALAND": "NZ",
    AU: "AU",
    AUS: "AU",
    AUSTRALIA: "AU",
    US: "US",
    USA: "US",
    "UNITED STATES": "US",
    "UNITED STATES OF AMERICA": "US",
    UK: "UK",
    GB: "UK",
    GBR: "UK",
    "UNITED KINGDOM": "UK"
  };
  return aliases[code] || DEFAULT_COUNTRY;
}

export function normaliseCountry(countryCode) {
  return normalizeCountry(countryCode);
}

export function getCountryConfig(countryCode) {
  const code = normalizeCountry(countryCode);
  return COUNTRY_OPTIONS.find((country) => country.code === code) || COUNTRY_OPTIONS[0];
}

export function getCountryMeta(countryCode) {
  return getCountryConfig(countryCode);
}

export function countryMeta(countryCode) {
  return getCountryMeta(countryCode);
}

export function getCountryLabel(countryCode) {
  return getCountryMeta(countryCode).label;
}

export function getCountrySymbol(countryCode) {
  return getCountryMeta(countryCode).symbol;
}

export function getCountryCurrency(countryCode) {
  return getCountryMeta(countryCode).currency;
}

export function getCountryTaxLabel(countryCode) {
  return getCountryMeta(countryCode).taxLabel || "";
}

export function getCurrencySymbol(countryCode) {
  return getCountrySymbol(countryCode);
}

export function getCurrencyCode(countryCode) {
  return getCountryCurrency(countryCode);
}

export function formatCurrency(amount, countryCode) {
  const country = getCountryMeta(countryCode);
  const value = Number(amount || 0);
  return country.symbol + value.toFixed(value % 1 === 0 ? 0 : 2);
}

export function formatMoney(amount, countryCode) {
  return formatCurrency(amount, countryCode);
}

export function pricePlanForCountry(planOrKey, countryCode) {
  const plan = typeof planOrKey === "object" && planOrKey !== null
    ? planOrKey
    : getPlanConfig(planOrKey);

  const country = getCountryMeta(countryCode);
  const monthly = Number(plan.monthly || plan.price || 0);
  const tax = country.taxLabel ? " " + country.taxLabel : "";
  const priceLabel = country.symbol + monthly + "/month" + tax;

  return {
    ...plan,
    price: monthly,
    monthly,
    period: plan.period || "month",
    interval: plan.interval || "month",
    currency: country.currency,
    symbol: country.symbol,
    taxLabel: country.taxLabel || "",
    countryCode: country.code,
    countryLabel: country.label,
    priceLabel,
    formattedPrice: priceLabel
  };
}

export function getPlanPriceForCountry(planOrKey, countryCode) {
  return pricePlanForCountry(planOrKey, countryCode);
}

export function getPlanPricingForCountry(planOrKey, countryCode) {
  return pricePlanForCountry(planOrKey, countryCode);
}

export function planForCountry(planOrKey, countryCode) {
  return pricePlanForCountry(planOrKey, countryCode);
}

export function addonPriceForCountry(addonOrKey, countryCode) {
  const key = typeof addonOrKey === "string"
    ? addonOrKey
    : String(addonOrKey?.key || addonOrKey?.code || addonOrKey?.name || "");

  const lower = key.toLowerCase();
  const country = getCountryMeta(countryCode);

  let addon = addonOrKey && typeof addonOrKey === "object" ? addonOrKey : null;

  if (!addon) {
    if (lower.includes("growth")) {
      addon = GROWTH_PACK;
    } else if (lower.includes("xero")) {
      addon = XERO_ADDON;
    } else {
      addon = { name: key || "Add-on", price: 0, monthly: 0, period: "month", interval: "month", description: "" };
    }
  }

  const monthly = Number(addon.monthly || addon.price || 0);
  const tax = country.taxLabel ? " " + country.taxLabel : "";
  const priceLabel = country.symbol + monthly + "/month" + tax;

  return {
    ...addon,
    price: monthly,
    monthly,
    period: addon.period || "month",
    interval: addon.interval || "month",
    currency: country.currency,
    symbol: country.symbol,
    taxLabel: country.taxLabel || "",
    countryCode: country.code,
    countryLabel: country.label,
    priceLabel,
    formattedPrice: priceLabel
  };
}

export function getAddonPriceForCountry(addonOrKey, countryCode) {
  return addonPriceForCountry(addonOrKey, countryCode);
}

export function getAddonPricingForCountry(addonOrKey, countryCode) {
  return addonPriceForCountry(addonOrKey, countryCode);
}

export function pricingNotesForCountry(countryCode) {
  const country = getCountryMeta(countryCode);
  return [
    "Prices are monthly and shown in " + country.currency + ".",
    country.taxLabel ? "Tax shown as " + country.taxLabel + " where applicable." : "Local taxes may apply where applicable.",
    "SMS credits and Growth Packs can be added when needed."
  ];
}

export function getPricingNotesForCountry(countryCode) {
  return pricingNotesForCountry(countryCode);
}

export function pricingNotes(countryCode) {
  return pricingNotesForCountry(countryCode);
}

export function formatPlanPrice(planKey, countryCode) {
  const plan = pricePlanForCountry(planKey, countryCode);
  return plan.priceLabel;
}

export default {
  DEFAULT_COUNTRY,
  PLAN_KEYS,
  PLAN_ALIASES,
  COUNTRY_OPTIONS,
  COUNTRIES,
  AVAILABLE_COUNTRIES,
  BILLING_COUNTRIES,
  PLAN_PRICING,
  CHURVOX_PLANS,
  PLANS,
  BASE_PLANS,
  PLAN_LIST,
  PLAN_ORDER,
  PLAN_LIMITS,
  COMMAND_ADDONS,
  GROWTH_PACK,
  COMMAND_GROWTH_PACK,
  COMMAND_GROWTH_PACK_ADDON,
  GROWTH_PACK_ADDON,
  XERO_ADDON,
  ADDONS,
  PLAN_NAMES,
  PLAN_DISPLAY_NAMES,
  PLAN_PRICES,
  normalizePlanKey,
  normalisePlanKey,
  getPlanConfig,
  getPlan,
  getPlanName,
  nicePlanName,
  requiredPlanLabel,
  planLabel,
  getPlanPrice,
  planPrice,
  planRank,
  isPlanAtLeast,
  hasPlanAtLeast,
  hasRequiredPlan,
  planHasAccess,
  canUsePlanFeature,
  normalizeCountry,
  normaliseCountry,
  getCountryConfig,
  getCountryMeta,
  countryMeta,
  getCountryLabel,
  getCountrySymbol,
  getCountryCurrency,
  getCountryTaxLabel,
  getCurrencySymbol,
  getCurrencyCode,
  formatCurrency,
  formatMoney,
  pricePlanForCountry,
  getPlanPriceForCountry,
  getPlanPricingForCountry,
  planForCountry,
  addonPriceForCountry,
  getAddonPriceForCountry,
  getAddonPricingForCountry,
  pricingNotesForCountry,
  getPricingNotesForCountry,
  pricingNotes,
  formatPlanPrice
};
