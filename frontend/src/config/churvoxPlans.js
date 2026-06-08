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

export const COUNTRY_OPTIONS = [
  { code: "NZ", label: "New Zealand", currency: "NZD", symbol: "NZ$", tax: "+ GST" },
  { code: "AU", label: "Australia", currency: "AUD", symbol: "A$", tax: "+ GST" },
  { code: "US", label: "United States", currency: "USD", symbol: "US$", tax: "plus applicable tax" },
  { code: "UK", label: "United Kingdom", currency: "GBP", symbol: "£", tax: "+ VAT" },
];

export const COUNTRY_PRICING = {
  NZ: { solo: 39, team: 89, pro: 149, enterprise: 299, xero_addon: 39, command_growth_pack: 99, sms_100: 10, sms_500: 45, sms_1000: 80 },
  AU: { solo: 39, team: 89, pro: 149, enterprise: 299, xero_addon: 39, command_growth_pack: 99, sms_100: 10, sms_500: 45, sms_1000: 80 },
  US: { solo: 29, team: 69, pro: 119, enterprise: 239, xero_addon: 29, command_growth_pack: 79, sms_100: 8, sms_500: 35, sms_1000: 65 },
  UK: { solo: 29, team: 69, pro: 119, enterprise: 239, xero_addon: 29, command_growth_pack: 79, sms_100: 8, sms_500: 35, sms_1000: 65 },
};

export function normaliseCountry(value) {
  const code = String(value || "NZ").trim().toUpperCase();
  return COUNTRY_OPTIONS.some((item) => item.code === code) ? code : "NZ";
}

export function getCountryMeta(country) {
  return COUNTRY_OPTIONS.find((item) => item.code === normaliseCountry(country)) || COUNTRY_OPTIONS[0];
}

export function formatCountryPrice(country, amount) {
  const meta = getCountryMeta(country);
  return `${meta.symbol}${amount}`;
}

export function countryPeriod(country) {
  return `/month ${getCountryMeta(country).tax}`;
}

export function pricePlanForCountry(plan, country) {
  const code = normaliseCountry(country);
  const amount = COUNTRY_PRICING[code]?.[plan.key] ?? COUNTRY_PRICING.NZ[plan.key];
  return { ...plan, price: formatCountryPrice(code, amount), period: countryPeriod(code), amount, country: code };
}

export function addonPriceForCountry(addon, country) {
  const code = normaliseCountry(country);
  const amount = COUNTRY_PRICING[code]?.[addon.key] ?? COUNTRY_PRICING.NZ[addon.key];
  return { ...addon, price: formatCountryPrice(code, amount), period: countryPeriod(code), amount, country: code };
}

export function pricingNotesForCountry(country) {
  const meta = getCountryMeta(country);
  if (meta.code === "US") {
    return [
      "Prices are shown in USD before applicable sales tax.",
      "SMS credits are separate and coming soon.",
      `Operator and Command can add Xero for ${formatCountryPrice(meta.code, COUNTRY_PRICING[meta.code].xero_addon)}/month ${meta.tax}.\`,
      "Command includes up to 50 active team members.",
      "Command Growth Pack adds 50 active team members.",
    ];
  }
  return [
    `Prices are shown in ${meta.currency} ${meta.tax}.`,
    "SMS credits are separate and coming soon.",
    `Operator and Command can add Xero for ${formatCountryPrice(meta.code, COUNTRY_PRICING[meta.code].xero_addon)}/month ${meta.tax}.\`,
    "Command includes up to 50 active team members.",
    "Command Growth Pack adds 50 active team members.",
  ];
}

export const XERO_ADDON = {
  key: "xero_addon",
  name: "Xero add-on",
  price: "NZ$39",
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
    price: "NZ$39",
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
    price: "NZ$89",
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
    price: "NZ$149",
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
    price: "NZ$299",
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

export const QUICK_PRICING_NOTES = pricingNotesForCountry("NZ");

export const COMMAND_GROWTH_PACK = {
  key: "command_growth_pack",
  name: "Command Growth Pack",
  price: "NZ$99",
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
  { key: "sms_100", credits: "100", price: "NZ$10", note: "Light reminders and small follow-up runs." },
  { key: "sms_500", credits: "500", price: "NZ$45", note: "Best for active crews using reminders regularly." },
  { key: "sms_1000", credits: "1,000", price: "NZ$80", note: "Lowest cost per credit for busy operators." },
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
