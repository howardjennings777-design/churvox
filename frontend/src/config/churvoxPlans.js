export const PLAN_KEYS = {
  START: "solo",
  CREW: "team",
  OPERATOR: "pro",
  COMMAND: "enterprise",
};

export const COUNTRY_OPTIONS = [
  { code: "NZ", label: "New Zealand", currency: "NZD", symbol: "NZD", tax: "+ GST" },
  { code: "AU", label: "Australia", currency: "AUD", symbol: "AUD", tax: "+ GST" },
  { code: "US", label: "United States", currency: "USD", symbol: "USD", tax: "" },
  { code: "UK", label: "United Kingdom", currency: "GBP", symbol: "GBP", tax: "+ VAT" },
];

export const PLAN_PRICING = {
  solo: { name: "Start", monthly