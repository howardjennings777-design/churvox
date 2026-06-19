// Churvox pricing config.
// Backend plan keys stay: solo, team, pro, enterprise.
// Public plan names: Start, Crew, Operator, Command.

export const DEFAULT_COUNTRY = "NZ";
export const COUNTRY_PRICE_OVERRIDES = {
  NZ: { solo: 39, team: 89, pro: 149, enterprise: 299, accounting_sync: 39, growth_pack: 99 },
  AU: { solo: 39, team: 89, pro: 149, enterprise: 299, accounting_sync: 39, growth_pack: 99 },
  US: { solo: 29, team: 69, pro: 119, enterprise: 249, accounting_sync: 29, growth_pack: 79 },
  UK: { solo: 29, team: 69, pro: 119, enterprise: 249, accounting_sync: 29, growth_pack: 79 },
};

export function detectCountryCode() {
  try {
    const saved = window.localStorage.getItem("churvox:billing-country");
    if (saved) return normalizeCountry(saved);
  } catch {}

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (/auckland|chatham/i.test(tz)) return "NZ";
    if (/sydney|melbourne|brisbane|perth|adelaide|hobart|darwin/i.test(tz)) return "AU";
    if (/london|belfast|guernsey|jersey|isle_of_man/i.test(tz)) return "UK";
    if (/america\//i.test(tz)) return "US";
  } catch {}

  try {
    const locale = String(navigator.language || navigator.userLanguage || "").toUpperCase();
    if (locale.includes("-NZ")) return "NZ";
    if (locale.includes("-AU")) return "AU";
    if (locale.includes("-GB") || locale.includes("-UK")) return "UK";
    if (locale.includes("-US")) return "US";
  } catch {}

  return DEFAULT_COUNTRY;
}

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
  { code: "NZ", label: "New Zealand", currency: "NZD", symbol: "$", taxLabel: "+ GST", taxInclusiveLabel: "incl. GST", taxRate: 0.15 },
  { code: "AU", label: "Australia", currency: "AUD", symbol: "A$", taxLabel: "+ GST", taxInclusiveLabel: "incl. GST", taxRate: 0.10 },
  { code: "US", label: "United States", currency: "USD", symbol: "US$", taxLabel: "", taxInclusiveLabel: "", taxRate: 0 },
  { code: "UK", label: "United Kingdom", currency: "GBP", symbol: "£", taxLabel: "+ VAT", taxInclusiveLabel: "incl. VAT", taxRate: 0.20 }
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
    summary: "Solo operators getting organised.",
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
      "Accounting Sync Add-on available",
      "Up to 20 active clients"
    ],
    features: [
      "Jobs and clients",
      "Quotes and invoices",
      "Basic scheduling",
      "Basic AI admin help",
      "Accounting Sync Add-on available",
      "Up to 20 active clients"
    ]
  },
  team: {
    key: "team",
    code: "crew",
    tag: "Crew",
    name: "Crew",
    summary: "Small crews that need control.",
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
      "Accounting Sync Add-on available",
      "Up to 30 active clients"
    ],
    features: [
      "Everything in Start",
      "Team workflow",
      "Worker assignments",
      "Time tracking",
      "Accounting Sync Add-on available",
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
      "Accounting Sync Add-on available",
      "Up to 40 active clients"
    ],
    features: [
      "Everything in Crew",
      "AI Operator Actions",
      "Approval queue",
      "Advanced job admin",
      "Accounting Sync Add-on available",
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
    description: "Advanced control, roles, payroll workspace, one accounting sync option, and priority support.",
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
      "Accounting sync included: Xero or MYOB",
      "Payroll workspace",
      "Advanced roles",
      "Reports and exports",
      "Priority support"
    ],
    features: [
      "Everything in Operator",
      "Up to 50 active clients",
      "Up to 50 active team members",
      "Accounting sync included: Xero or MYOB",
      "Payroll workspace",
      "Advanced roles",
      "Reports and exports",
      "Priority support"
    ],
    addonNote: "SMS credits and Command Growth Packs can be added when needed. One accounting sync option is included."
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
  description: "Add more crew, more jobs and more AI Operator capacity as your business grows.",
  includes: [
    "50 more active team members",
    "Extra job capacity",
    "Extra AI Operator Actions",
    "Extra automation runs",
    "Extra admin and payroll capacity"
  ]
};

export const COMMAND_GROWTH_PACK = GROWTH_PACK;
export const COMMAND_GROWTH_PACK_ADDON = GROWTH_PACK;
export const GROWTH_PACK_ADDON = GROWTH_PACK;

export const ACCOUNTING_SYNC_ADDON = {
  key: "xero_addon",
  code: "xero_addon",
  name: "Accounting Sync Add-on",
  tag: "Accounting Sync",
  price: 39,
  monthly: 39,
  period: "month",
  interval: "month",
  description: "Optional Xero or MYOB sync where available. Included with Command."
};

export const XERO_ADDON = ACCOUNTING_SYNC_ADDON;
export const MYOB_ADDON = ACCOUNTING_SYNC_ADDON;
export const ADDONS = [GROWTH_PACK, ACCOUNTING_SYNC_ADDON];

export const SMS_PACKS = [
  { key: "sms_100", credits: 100, price: "$10", note: "Coming soon" },
  { key: "sms_500", credits: 500, price: "$45", note: "Coming soon" },
  { key: "sms_1000", credits: 1000, price: "$80", note: "Coming soon" }
];

export const COMMAND_ADDONS = [
  "SMS credits can be added when needed.",
  "Command Growth Packs can be added as your team grows.",
  "One accounting sync option is included with Command."
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

export function taxInclusiveAmount(amount, countryCode) {
  const country = getCountryMeta(countryCode);
  const value = Number(amount || 0);
  return value + value * Number(country.taxRate || 0);
}

export function formatTaxInclusivePrice(amount, countryCode) {
  const country = getCountryMeta(countryCode);
  if (!country.taxLabel || !country.taxRate) return "";
  return formatCurrency(taxInclusiveAmount(amount, countryCode), countryCode) + "/month " + (country.taxInclusiveLabel || "incl. tax");
}

export function pricePlanForCountry(planOrKey, countryCode) {
  const plan = typeof planOrKey === "object" && planOrKey !== null
    ? planOrKey
    : getPlanConfig(planOrKey);

  const country = getCountryMeta(countryCode);
  const overrides = COUNTRY_PRICE_OVERRIDES[country.code] || COUNTRY_PRICE_OVERRIDES[DEFAULT_COUNTRY] || {};
  const monthly = Number(overrides[plan.key] ?? plan.monthly ?? plan.price ?? 0);
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
    formattedPrice: priceLabel,
    taxInclusiveLabel: formatTaxInclusivePrice(monthly, country.code)
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
    } else if (lower.includes("xero") || lower.includes("myob") || lower.includes("accounting")) {
      addon = ACCOUNTING_SYNC_ADDON;
    } else {
      addon = { name: key || "Add-on", price: 0, monthly: 0, period: "month", interval: "month", description: "" };
    }
  }

  const overrides = COUNTRY_PRICE_OVERRIDES[country.code] || COUNTRY_PRICE_OVERRIDES[DEFAULT_COUNTRY] || {};
  const addonPriceKey = lower.includes("growth") ? "growth_pack" : "accounting_sync";
  const monthly = Number(overrides[addonPriceKey] ?? addon.monthly ?? addon.price ?? 0);
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
    formattedPrice: priceLabel,
    taxInclusiveLabel: formatTaxInclusivePrice(monthly, country.code)
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
    country.taxLabel ? "Prices shown exclude " + country.taxLabel.replace("+ ", "") + ". Tax is added at checkout. Tax-inclusive totals are shown for clarity." : "Local taxes may apply where applicable.",
    "Accounting Sync, SMS credits and Command Growth Packs can be added when needed."
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

export const MARKETING_PLANS = CHURVOX_PLANS.map((plan) => pricePlanForCountry(plan, DEFAULT_COUNTRY));
export const MARKETING_PLAN_LIST = MARKETING_PLANS;
export const MARKETING_PLAN_KEYS = PLAN_ORDER;
export const MARKETING_PLAN_NAMES = PLAN_NAMES;

export const APP_PLANS = CHURVOX_PLANS.map((plan) => {
  const country = getCountryMeta(DEFAULT_COUNTRY);
  const overrides = COUNTRY_PRICE_OVERRIDES[country.code] || COUNTRY_PRICE_OVERRIDES[DEFAULT_COUNTRY] || {};
  const monthly = Number(overrides[plan.key] ?? plan.monthly ?? plan.price ?? 0);
  const limits = PLAN_LIMITS[plan.key] || {};
  return {
    ...plan,
    price: "$" + monthly,
    period: "/month + GST",
    inclGst: formatTaxInclusivePrice(monthly, DEFAULT_COUNTRY),
    blurb: plan.description || plan.summary || plan.tagline,
    bestFor: plan.summary || plan.tagline || "",
    clientLimit: limits.clients,
    teamLimit: limits.teamMembers,
    limits: plan.features || plan.includes || []
  };
});

export const QUICK_PRICING_NOTES = [
  "14-day free trial. No card required.",
  "Prices shown exclude GST. GST is added at checkout. GST-inclusive totals are shown for clarity.",
  "Accounting Sync, SMS credits and Command Growth Packs can be added when needed."
];

export const QUICK_PLAN_NOTES = QUICK_PRICING_NOTES;
export const QUICK_BILLING_NOTES = QUICK_PRICING_NOTES;

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
  ACCOUNTING_SYNC_ADDON,
  XERO_ADDON,
  MYOB_ADDON,
  ADDONS,
  SMS_PACKS,
  PLAN_NAMES,
  PLAN_DISPLAY_NAMES,
  PLAN_PRICES,
  MARKETING_PLANS,
  MARKETING_PLAN_LIST,
  MARKETING_PLAN_KEYS,
  MARKETING_PLAN_NAMES,
  APP_PLANS,
  QUICK_PRICING_NOTES,
  QUICK_PLAN_NOTES,
  QUICK_BILLING_NOTES,
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
  taxInclusiveAmount,
  formatTaxInclusivePrice,
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
