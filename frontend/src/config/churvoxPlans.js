// CHURVOX_LOCKED_PLAN_TIERS_20260608
// Backend billing keys stay as: solo, team, pro, enterprise.
// Customer-facing plan names are: Start, Crew, Operator, Command.

export const PLAN_KEYS = { START: "solo", CREW: "team", OPERATOR: "pro", COMMAND: "enterprise" };

export const COUNTRY_OPTIONS = [
  { code: "NZ", label: "New Zealand", currency: "NZD", symbol: "NZ$", tax: "+ GST" },
  { code: "AU", label: "Australia