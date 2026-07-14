import { accessForPage, currentPlanForUser } from "../churvox-fresh/planRules";

export const OWNER_SCREEN_FEATURE = Object.freeze({
  today: "planday",
  intelligence: "intelligence",
  golive: "golive",
  command: "command",
  work: "jobs",
  schedule: "planday",
  clients: "clients",
  messages: "messages",
  worker: "workercommand",
  quotes: "quotes",
  invoices: "invoices",
  money: "payments",
  staff: "team",
  payroll: "payroll",
  team: "launchcontrol",
  playbooks: "launchcontrol",
  integrations: "xero",
  activity: "command",
  automation: "automation",
  branding: "settings",
  settings: "settings",
  plans: "plans",
  help: "support",
  readiness: "launchcontrol",
  safety: "support",
});

const OWNER_SCREEN_ALIASES = Object.freeze({
  "": "today",
  dashboard: "today",
  home: "today",
  hub: "today",
  "smart-hub": "today",
  intelligence: "intelligence",
  insights: "intelligence",
  brain: "intelligence",
  golive: "golive",
  onboarding: "golive",
  imports: "golive",
  portability: "golive",
  trust: "golive",
  cockpit: "command",
  command: "command",
  "command-board": "command",
  jobs: "work",
  job: "work",
  work: "work",
  recurring: "work",
  calendar: "schedule",
  schedule: "schedule",
  clients: "clients",
  customers: "clients",
  messages: "messages",
  inbox: "messages",
  workers: "worker",
  worker: "worker",
  dispatch: "worker",
  quotes: "quotes",
  invoices: "invoices",
  reports: "invoices",
  money: "money",
  accounting: "money",
  accountant: "money",
  xero: "integrations",
  staff: "staff",
  payroll: "payroll",
  "office-team": "team",
  team: "team",
  playbooks: "playbooks",
  integrations: "integrations",
  activity: "activity",
  automation: "automation",
  branding: "branding",
  settings: "settings",
  plans: "plans",
  billing: "plans",
  support: "help",
  help: "help",
  readiness: "readiness",
  safety: "safety",
});

export function canonicalOwnerScreen(value) {
  const raw = String(value || "").replace(/^#/, "").trim().toLowerCase();
  return OWNER_SCREEN_ALIASES[raw] || "today";
}

export function featureForOwnerScreen(screen) {
  return OWNER_SCREEN_FEATURE[canonicalOwnerScreen(screen)] || "planday";
}

export function accessForOwnerScreen(screen, user) {
  const canonical = canonicalOwnerScreen(screen);
  return { ...accessForPage(featureForOwnerScreen(canonical), user), screen: canonical };
}

export function ownerScreenAllowed(screen, user) {
  return accessForOwnerScreen(screen, user).allowed === true;
}

export function safeOwnerScreen(screen, user, fallback = "plans") {
  const canonical = canonicalOwnerScreen(screen);
  return ownerScreenAllowed(canonical, user) ? canonical : canonicalOwnerScreen(fallback);
}

export function ownerPlan(user) {
  return currentPlanForUser(user);
}

export function filterOwnerItems(items, user) {
  return (Array.isArray(items) ? items : []).filter(([screen]) => ownerScreenAllowed(screen, user));
}
