import { accessForPage, currentPlanForUser } from "../churvox-fresh/planRules";

export const OWNER_SCREEN_FEATURE = Object.freeze({
  today: "planday",
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

export function featureForOwnerScreen(screen) {
  return OWNER_SCREEN_FEATURE[String(screen || "").trim().toLowerCase()] || "planday";
}

export function accessForOwnerScreen(screen, user) {
  return accessForPage(featureForOwnerScreen(screen), user);
}

export function ownerScreenAllowed(screen, user) {
  return accessForOwnerScreen(screen, user).allowed === true;
}

export function ownerPlan(user) {
  return currentPlanForUser(user);
}

export function filterOwnerItems(items, user) {
  return (Array.isArray(items) ? items : []).filter(([screen]) => ownerScreenAllowed(screen, user));
}
