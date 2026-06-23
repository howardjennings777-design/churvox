export const PLAN_ORDER = ["start", "crew", "operator", "command"];

export const PLAN_ALIASES = {
  solo: "start",
  start: "start",
  team: "crew",
  crew: "crew",
  pro: "operator",
  operator: "operator",
  enterprise: "command",
  command: "command",
};

export const PLAN_LABELS = {
  start: "Start",
  crew: "Crew",
  operator: "Operator",
  command: "Command",
};

export const ACCOUNTING_ADDON_NAME = "Accounting Sync Add-on";
export const ACCOUNTING_ADDON_PRICE = "$39/month + GST";
export const GROWTH_PACK_NAME = "Command Growth Pack";
export const GROWTH_PACK_PRICE = "$99/month + GST";

export const FEATURE_RULES = {
  planday: { area: "Plan My Day", open: "start", reason: "Every plan needs one daily owner cockpit for jobs, admin, priorities and follow-ups." },
  jobs: { area: "Jobs", open: "start", reason: "Core job workflow is included from Start." },
  clients: { area: "Clients", open: "start", reason: "Customer records are included from Start." },
  quotes: { area: "Quotes", open: "start", reason: "Quotes are included from Start." },
  invoices: { area: "Invoices", open: "start", reason: "Invoices are included from Start." },
  payments: { area: "Payments", open: "start", reason: "Payment visibility is included from Start." },
  settings: { area: "Settings", open: "start", reason: "Business setup must stay open." },
  plans: { area: "Plans", open: "start", reason: "Plan and billing controls must stay open." },
  support: { area: "Support", open: "start", reason: "Support must stay open." },
  imports: { area: "Imports", open: "start", reason: "Owner data import stays open." },
  exports: { area: "Exports", open: "start", reason: "Owner data export stays open." },

  team: { area: "Team", open: "crew", reason: "Crew plan unlocks workers and team setup." },
  workercommand: { area: "Worker View", open: "crew", reason: "Crew plan unlocks worker access." },
  time: { area: "Time Sheets", open: "crew", reason: "Crew plan unlocks worker time capture." },

  command: { area: "Command", open: "operator", reason: "Operator unlocks the approval desk where Churvox prepares admin and the owner approves." },
  askchurvox: { area: "Tell Churvox", open: "operator", reason: "Operator unlocks AI Operator Actions." },
  automation: { area: "Automation", open: "crew", reason: "Crew gets basic automation. Operator and Command get stronger automation." },
  reports: { area: "Reports", open: "start", reason: "Start gets basic reports. Higher plans unlock deeper views." },

  payroll: { area: "Payroll", open: "command", reason: "Payroll workspace is included in Command only. Churvox never files tax or creates payment files." },

  xero: {
    area: "Xero",
    open: "command",
    addon: "accounting_sync",
    reason: "Xero opens with Command or the Accounting Sync Add-on. Draft invoice sync only. Owner approval required.",
  },
};

export const PLAN_FEATURE_MATRIX = [
  { area: "Plan My Day", start: "Open", crew: "Open", operator: "Open", command: "Open" },
  { area: "Jobs / Clients / Quotes / Invoices", start: "Open", crew: "Open", operator: "Open", command: "Open" },
  { area: "Payments", start: "Open", crew: "Open", operator: "Open", command: "Open" },
  { area: "Team", start: "Locked", crew: "Open", operator: "Open", command: "Open" },
  { area: "Worker View", start: "Locked", crew: "Open", operator: "Open", command: "Open" },
  { area: "Time Sheets", start: "Locked", crew: "Open", operator: "Open", command: "Open" },
  { area: "Command approval desk", start: "Locked", crew: "Locked", operator: "Open", command: "Open" },
  { area: "AI Operator Actions", start: "Locked", crew: "Locked", operator: "Open", command: "Higher limits" },
  { area: "Automation", start: "Locked", crew: "Basic", operator: "Open", command: "Advanced" },
  { area: "Reports", start: "Basic", crew: "Basic", operator: "Better", command: "Full" },
  { area: "Payroll", start: "Locked", crew: "Locked", operator: "Locked", command: "Open" },
  { area: "Xero / MYOB", start: "Add-on", crew: "Add-on", operator: "Add-on", command: "Included one sync" },
  { area: "Accounting Sync Add-on", start: "$39 + GST", crew: "$39 + GST", operator: "$39 + GST", command: "Included" },
  { area: "Command Growth Pack", start: "Not available", crew: "Not available", operator: "Not available", command: "$99 + GST per 50 active team members" },
];

export function normalizePlan(value) {
  const key = String(value || "").trim().toLowerCase();
  return PLAN_ALIASES[key] || "";
}

export function planRank(plan) {
  const clean = normalizePlan(plan) || "start";
  const index = PLAN_ORDER.indexOf(clean);
  return index >= 0 ? index : 0;
}

export function planMeets(plan, minimum) {
  return planRank(plan) >= planRank(minimum);
}

export function planFromUser(user) {
  return normalizePlan(
    user?.ui_plan ||
    user?.current_plan ||
    user?.plan ||
    user?.subscription_plan ||
    user?.billing_plan ||
    user?.tier ||
    user?.plan_name ||
    user?.business?.plan ||
    user?.business?.ui_plan ||
    user?.business?.subscription_plan
  );
}

export function readCachedPlan() {
  try {
    return normalizePlan(window.localStorage.getItem("churvox:stable-current-plan:v1"));
  } catch {
    return "";
  }
}

export function readPlanOverride() {
  try {
    return normalizePlan(window.localStorage.getItem("churvox:plan-override"));
  } catch {
    return "";
  }
}

export function currentPlanForUser(user) {
  return readPlanOverride() || planFromUser(user) || readCachedPlan() || "start";
}

function flagFrom(value) {
  if (value === true) return true;
  if (value === 1) return true;
  const text = String(value || "").toLowerCase();
  return ["true", "yes", "active", "enabled", "1", "on"].includes(text);
}

export function hasAccountingSync(user) {
  const sources = [
    user?.accounting_sync,
    user?.accountingSync,
    user?.accounting_sync_addon,
    user?.accountingSyncAddon,
    user?.xero_enabled,
    user?.myob_enabled,
    user?.addons?.accounting_sync,
    user?.addons?.accountingSync,
    user?.business?.accounting_sync,
    user?.business?.accountingSync,
    user?.business?.addons?.accounting_sync,
    user?.business?.addons?.accountingSync,
    user?.features?.accounting_sync,
    user?.features?.accountingSync,
  ];

  if (sources.some(flagFrom)) return true;

  try {
    return flagFrom(window.localStorage.getItem("churvox:addon:accounting_sync"));
  } catch {
    return false;
  }
}

export function commandGrowthPacks(user) {
  const raw =
    user?.command_growth_packs ||
    user?.growth_packs ||
    user?.addons?.command_growth_pack ||
    user?.business?.command_growth_packs ||
    user?.business?.growth_packs ||
    0;

  const count = Number(raw);
  return Number.isFinite(count) && count > 0 ? count : 0;
}

export function activeTeamMemberLimit(user) {
  const plan = currentPlanForUser(user);
  if (plan !== "command") return plan === "crew" ? 5 : plan === "operator" ? 15 : 1;
  return 50 + commandGrowthPacks(user) * 50;
}

export function ruleForPage(page) {
  const key = String(page || "").toLowerCase();
  const aliases = {
    today: "planday",
    dashboard: "planday",
    smart: "planday",
    hub: "planday",
    schedule: "planday",
    calendar: "planday",
    dispatch: "planday",
    todayswork: "planday",
    worktoday: "planday",
    worker: "workercommand",
    workers: "workercommand",
    xero: "xero",
    myob: "xero",
  };

  return FEATURE_RULES[aliases[key] || key] || { area: page || "This area", open: "start", reason: "Included in the owner workspace." };
}

export function accessForPage(page, user) {
  const plan = currentPlanForUser(user);
  const rule = ruleForPage(page);
  const includedByPlan = planMeets(plan, rule.open);

  if (rule.addon === "accounting_sync") {
    const addonActive = hasAccountingSync(user);
    const allowed = includedByPlan || addonActive;
    return {
      allowed,
      plan,
      rule,
      requiredPlan: rule.open,
      addonRequired: !includedByPlan,
      addonActive,
      title: allowed ? `${rule.area} open` : `${ACCOUNTING_ADDON_NAME} required`,
      message: allowed ? rule.reason : `${rule.area} opens with Command or the ${ACCOUNTING_ADDON_NAME} (${ACCOUNTING_ADDON_PRICE}).`,
    };
  }

  return {
    allowed: includedByPlan,
    plan,
    rule,
    requiredPlan: rule.open,
    addonRequired: false,
    addonActive: false,
    title: includedByPlan ? `${rule.area} open` : `${PLAN_LABELS[rule.open]} required`,
    message: includedByPlan ? rule.reason : `${rule.area} opens on ${PLAN_LABELS[rule.open]} or above.`,
  };
}
