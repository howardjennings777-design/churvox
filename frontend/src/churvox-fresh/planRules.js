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

export const CHURVOX_EIGHTEEN_FEATURES = [
  { id: "command_approval_desk", name: "Command Approval Desk", promise: "One owner desk for what Churvox found, prepared and needs approved." },
  { id: "ai_operator_actions", name: "AI Operator Actions", promise: "AI prepares real admin actions. The owner approves, edits or declines." },
  { id: "job_story_timeline", name: "Job Story Timeline", promise: "Request to quote to job to proof to invoice to payment to accounting sync." },
  { id: "whats_missing_engine", name: "What's Missing? Engine", promise: "Find missing job, client, invoice, worker and sync details before they become problems." },
  { id: "one_tap_admin_recovery", name: "One-Tap Admin Recovery", promise: "Group the admin mess so the owner can clear it in controlled batches." },
  { id: "admin_debt_counter", name: "Admin Debt Counter", promise: "Show invoices not created, unpaid money, missing proof and follow-ups building up." },
  { id: "owner_control_score", name: "Owner Control Score", promise: "A simple percentage showing how under-control the business admin is." },
  { id: "worker_proof_pack", name: "Worker Proof Pack", promise: "Time, notes, worker, photos and address bundled for proof and trust." },
  { id: "invoice_confidence_check", name: "Invoice Confidence Check", promise: "Check missing address, missing proof, low pricing and time-vs-invoice mismatch before save/send." },
  { id: "customer_follow_up_brain", name: "Customer Follow-Up Brain", promise: "Detect quotes, invoices, reviews and regular customers that need attention." },
  { id: "setup_coach", name: "Setup Coach", promise: "Guide new businesses through logo, GST, clients, workers, invoice terms and accounting." },
  { id: "quiet_mode", name: "Quiet Mode for Owners", promise: "Only alert urgently; move normal admin into Command." },
  { id: "approval_memory", name: "Approval Memory", promise: "Safely remember owner preferences while staying approval-only." },
  { id: "done_properly_checklist", name: "Done Properly Checklist", promise: "Industry-aware job completion checks for lawn care, cleaning, trades and services." },
  { id: "business_family_roles", name: "Business Family Roles", promise: "Safe helper roles for family-business admin without risky access." },
  { id: "worker_time_approval", name: "Worker Time Approval", promise: "Review and approve worker time before payroll or invoice checks." },
  { id: "xero_approval_sync", name: "Accounting Approval Sync", promise: "Draft Accounting sync only. Owner approval required." },
  { id: "core_job_management", name: "Core Job Management", promise: "Clients, jobs, repeat work, quotes, invoices and settings still work cleanly." },
];

export const FEATURE_RULES = {
  planday: { area: "Smart Hub", open: "start", reason: "Every plan gets the daily owner cockpit for jobs, admin, priorities and follow-ups." },
  intelligence: { area: "Churvox Intelligence", open: "start", reason: "Every paid plan gets Money Left Behind, Job Truth Receipt, Promise Memory and Voice-to-Business." },
  workerproofcoach: { area: "Worker Proof Coach", open: "crew", reason: "Crew adds trade-aware proof coaching inside the worker flow." },
  weekexplain: { area: "Explain My Week", open: "operator", reason: "Operator adds deeper owner analysis with record-level evidence." },
  approvalbudget: { area: "Approval Budget", open: "operator", reason: "Operator lets owners control what interrupts them and what waits for a batch." },
  scenarios: { area: "What Happens If?", open: "command", reason: "Command adds safe business simulations without changing live records." },
  intelligence: { area: "Churvox Intelligence", open: "start", reason: "Every paid plan gets Money Left Behind, Job Truth Receipt, Promise Memory and Voice-to-Business." },
  workerproofcoach: { area: "Worker Proof Coach", open: "crew", reason: "Crew adds trade-aware proof coaching inside the worker flow." },
  weekexplain: { area: "Explain My Week", open: "operator", reason: "Operator adds deeper owner analysis with record-level evidence." },
  approvalbudget: { area: "Approval Budget", open: "operator", reason: "Operator lets owners control what interrupts them and what waits for a batch." },
  scenarios: { area: "What Happens If?", open: "command", reason: "Command adds safe business simulations without changing live records." },
  jobs: { area: "Jobs", open: "start", reason: "Core job workflow, including repeat work, is included from Start." },
  recurring: { area: "Repeat jobs inside Jobs", open: "start", reason: "Repeat work lives inside Jobs so the main navigation stays simple." },
  clients: { area: "Clients", open: "start", reason: "Customer records are included from Start." },
  quotes: { area: "Quotes", open: "start", reason: "Quotes are included from Start." },
  invoices: { area: "Invoices", open: "start", reason: "Invoices are included from Start." },
  settings: { area: "Settings", open: "start", reason: "Business setup must stay open." },
  plans: { area: "Plans", open: "start", reason: "Plan and billing controls must stay open." },
  support: { area: "Help", open: "start", reason: "Help must stay open." },
  launchcontrol: { area: "Setup Coach", open: "start", reason: "Setup Coach helps every plan finish business setup." },
  leads: { area: "Requests", open: "start", reason: "New job requests are part of the core job flow." },
  messages: { area: "Messages", open: "crew", reason: "Crew unlocks team/customer message control." },
  team: { area: "Team", open: "crew", reason: "Crew unlocks team workspace and worker management." },
  workercommand: { area: "Worker View", open: "crew", reason: "Crew unlocks worker proof and worker access." },
  time: { area: "Time Approval", open: "crew", reason: "Crew unlocks worker time capture and approval." },
  portal: { area: "Proof Packs", open: "crew", reason: "Crew unlocks proof packs and customer-ready proof links." },
  command: { area: "Command", open: "operator", reason: "Operator unlocks the Command Approval System." },
  payments: { area: "Admin Debt", open: "operator", reason: "Operator unlocks smarter unpaid, follow-up and admin debt work." },
  automation: { area: "Follow-Ups", open: "operator", reason: "Operator unlocks AI-prepared follow-ups and admin actions." },
  payroll: { area: "Payroll", open: "operator", reason: "Operator unlocks payroll summaries from approved worker time." },
  reports: { area: "Control Score", open: "command", reason: "Command unlocks deeper owner control reporting." },
  imports: { area: "Imports", open: "command", reason: "Command unlocks heavier migration and back-office controls." },
  exports: { area: "Exports", open: "command", reason: "Command unlocks deeper export and back-office controls." },
  xero: { area: "Accounting Sync", open: "command", addon: "accounting_sync", reason: "Accounting Sync opens with Command or the Accounting Sync Add-on. Draft invoice sync only. Owner approval required." },
};

export const PLAN_FEATURE_MATRIX = [
  { area: "Jobs, repeat work, clients, quotes, invoices", start: "Included", crew: "Included", operator: "Included", command: "Included" },
  { area: "Settings, plans and help", start: "Included", crew: "Included", operator: "Included", command: "Included" },
  { area: "Money Left Behind, Job Truth Receipt, Promise Memory and Voice-to-Business", start: "Included", crew: "Included", operator: "Included", command: "Included" },
  { area: "Worker Proof Coach", start: "Locked", crew: "Included", operator: "Included", command: "Included" },
  { area: "Explain My Week and Approval Budget", start: "Locked", crew: "Locked", operator: "Included", command: "Included" },
  { area: "What Happens If? simulations", start: "Locked", crew: "Locked", operator: "Locked", command: "Included" },
  { area: "Money Left Behind, Job Truth Receipt, Promise Memory and Voice-to-Business", start: "Included", crew: "Included", operator: "Included", command: "Included" },
  { area: "Worker Proof Coach", start: "Locked", crew: "Included", operator: "Included", command: "Included" },
  { area: "Explain My Week and Approval Budget", start: "Locked", crew: "Locked", operator: "Included", command: "Included" },
  { area: "What Happens If? simulations", start: "Locked", crew: "Locked", operator: "Locked", command: "Included" },
  { area: "Messages", start: "Locked", crew: "Included", operator: "Included", command: "Included" },
  { area: "Team and worker view", start: "Locked", crew: "Included", operator: "Included", command: "Included" },
  { area: "Worker proof, photos and time", start: "Locked", crew: "Included", operator: "Included", command: "Included" },
  { area: "Payroll summaries", start: "Locked", crew: "Locked", operator: "Included", command: "Included" },
  { area: "AI prepared admin", start: "Locked", crew: "Locked", operator: "Included", command: "Included" },
  { area: "Command Approval System", start: "Locked", crew: "Locked", operator: "Included", command: "Full" },
  { area: "Approval Memory", start: "Locked", crew: "Locked", operator: "Included", command: "Advanced" },
  { area: "Xero sync", start: "$39 add-on", crew: "$39 add-on", operator: "$39 add-on", command: "Included" },
  { area: "Command Growth Pack", start: "Locked", crew: "Locked", operator: "Locked", command: "Available" },
];

const SUPPORT_ITEMS = [["settings", "SG", "Settings"], ["plans", "PL", "Plans"], ["support", "HP", "Help"]];

const START_GROUPS = [
  { title: "Home", items: [["planday", "PD", "Smart Hub"]] },
  { title: "Work", items: [["jobs", "JB", "Jobs"], ["clients", "CL", "Clients"]] },
  { title: "Money", items: [["quotes", "QT", "Quotes"], ["invoices", "IV", "Invoices"]] },
  { title: "Support", items: SUPPORT_ITEMS },
];

const CREW_GROUPS = [
  { title: "Home", items: [["planday", "PD", "Smart Hub"], ["messages", "MS", "Messages"]] },
  { title: "Work", items: [["jobs", "JB", "Jobs"], ["clients", "CL", "Clients"], ["team", "TM", "Team"], ["workercommand", "WV", "Worker View"]] },
  { title: "Money", items: [["quotes", "QT", "Quotes"], ["invoices", "IV", "Invoices"]] },
  { title: "Support", items: SUPPORT_ITEMS },
];

const OPERATOR_GROUPS = [
  { title: "Home", items: [["planday", "PD", "Smart Hub"], ["command", "CM", "Command"], ["messages", "MS", "Messages"]] },
  { title: "Work", items: [["jobs", "JB", "Jobs"], ["clients", "CL", "Clients"], ["team", "TM", "Team"], ["workercommand", "WV", "Worker View"]] },
  { title: "Money", items: [["quotes", "QT", "Quotes"], ["invoices", "IV", "Invoices"]] },
  { title: "Support", items: SUPPORT_ITEMS },
];

const COMMAND_GROUPS = [
  { title: "Home", items: [["planday", "PD", "Smart Hub"], ["command", "CM", "Command"], ["messages", "MS", "Messages"]] },
  { title: "Work", items: [["jobs", "JB", "Jobs"], ["clients", "CL", "Clients"], ["team", "TM", "Team"], ["workercommand", "WV", "Worker View"]] },
  { title: "Money", items: [["quotes", "QT", "Quotes"], ["invoices", "IV", "Invoices"], ["xero", "AC", "Xero Sync"]] },
  { title: "Support", items: SUPPORT_ITEMS },
];

const MORE_ITEMS_BY_PLAN = {
  start: [["launchcontrol", "SC", "Setup Coach"]],
  crew: [["time", "TA", "Time Approval"], ["portal", "PT", "Proof Packs"], ["launchcontrol", "SC", "Setup Coach"]],
  operator: [["payments", "AD", "Admin Debt"], ["automation", "FU", "Follow-Ups"], ["payroll", "PR", "Payroll"], ["time", "TA", "Time Approval"], ["portal", "PT", "Proof Packs"], ["launchcontrol", "SC", "Setup Coach"]],
  command: [["payments", "AD", "Admin Debt"], ["reports", "CS", "Control Score"], ["automation", "FU", "Follow-Ups"], ["payroll", "PR", "Payroll"], ["time", "TA", "Time Approval"], ["portal", "PT", "Proof Packs"], ["imports", "IM", "Imports"], ["exports", "EX", "Exports"], ["launchcontrol", "SC", "Setup Coach"]],
};

export const SIDEBAR_GROUPS_BY_PLAN = { start: START_GROUPS, crew: CREW_GROUPS, operator: OPERATOR_GROUPS, command: COMMAND_GROUPS };
export const SIDEBAR_ALL_GROUPS = [...START_GROUPS, ...CREW_GROUPS, ...OPERATOR_GROUPS, ...COMMAND_GROUPS];
export const SIDEBAR_ALL_MORE_GROUP = { title: "More tools", items: [["launchcontrol", "SC", "Setup Coach"], ["imports", "IM", "Imports"], ["exports", "EX", "Exports"]] };
export const SIDEBAR_GROUPS = SIDEBAR_ALL_GROUPS;
export const SIDEBAR_MORE_GROUP = SIDEBAR_ALL_MORE_GROUP;
export const MOBILE_ITEMS = [["planday", "PD", "Smart Hub"], ["jobs", "JB", "Jobs"], ["command", "CM", "Command"], ["invoices", "$", "Money"], ["more", "+", "More"]];
export const MOBILE_MORE_ORDER = ["messages", "clients", "quotes", "xero", "team", "workercommand", "settings", "plans", "support", "payments", "automation", "time", "portal", "payroll", "reports", "launchcontrol", "imports", "exports"];

function cloneGroups(groups) { return groups.map((group) => ({ ...group, items: group.items.map((item) => [...item]) })); }
function uniqueKeys(items) { const seen = new Set(); return items.filter(([key]) => { if (seen.has(key)) return false; seen.add(key); return true; }); }
function flagFrom(value) { if (value === true || value === 1) return true; const text = String(value || "").toLowerCase(); return ["true", "yes", "active", "enabled", "1", "on"].includes(text); }
function authenticatedUser(user) { return Boolean(user?.id || user?._id || user?.email); }
function addAccountingIfActive(groups, plan, user) { if (plan === "command" || !hasAccountingSync(user)) return groups; const next = cloneGroups(groups); const moneyGroup = next.find((group) => group.title === "Money") || next[next.length - 1]; if (moneyGroup && !moneyGroup.items.some(([key]) => key === "xero")) moneyGroup.items.push(["xero", "AC", "Accounting Sync"]); return next; }

export function normalizePlan(value) { const key = String(value || "").trim().toLowerCase(); return PLAN_ALIASES[key] || ""; }
export function planRank(plan) { const clean = normalizePlan(plan) || "start"; const index = PLAN_ORDER.indexOf(clean); return index >= 0 ? index : 0; }
export function planMeets(plan, minimum) { return planRank(plan) >= planRank(minimum); }
export function planFromUser(user) { return normalizePlan(user?.ui_plan || user?.current_plan || user?.plan || user?.subscription_plan || user?.billing_plan || user?.tier || user?.plan_name || user?.business?.plan || user?.business?.ui_plan || user?.business?.subscription_plan); }
export function readCachedPlan() { try { return normalizePlan(window.localStorage.getItem("churvox:stable-current-plan:v1")); } catch { return ""; } }
export function readPlanOverride() { try { return normalizePlan(window.localStorage.getItem("churvox:plan-override")); } catch { return ""; } }
export function currentPlanForUser(user) { return planFromUser(user) || readCachedPlan() || readPlanOverride() || "start"; }
export function hasAccountingSync(user) { const sources = [user?.accounting_sync, user?.accountingSync, user?.accounting_sync_addon, user?.accountingSyncAddon, user?.xero_enabled, user?.addons?.accounting_sync, user?.addons?.accountingSync, user?.business?.accounting_sync, user?.business?.accountingSync, user?.business?.addons?.accounting_sync, user?.business?.addons?.accountingSync, user?.features?.accounting_sync, user?.features?.accountingSync]; if (sources.some(flagFrom)) return true; if (authenticatedUser(user)) return false; try { return flagFrom(window.localStorage.getItem("churvox:addon:accounting_sync")); } catch { return false; } }
export function sidebarGroupsForPlan(plan, user = null) { const clean = normalizePlan(plan) || "start"; const groups = SIDEBAR_GROUPS_BY_PLAN[clean] || START_GROUPS; return addAccountingIfActive(cloneGroups(groups), clean, user); }
export function sidebarGroupsForUser(user) { return sidebarGroupsForPlan(currentPlanForUser(user), user); }
export function sidebarMoreItemsForPlan(plan) { const clean = normalizePlan(plan) || "start"; return uniqueKeys((MORE_ITEMS_BY_PLAN[clean] || MORE_ITEMS_BY_PLAN.start).map((item) => [...item])); }
export function sidebarMoreItemsForUser(user) { return sidebarMoreItemsForPlan(currentPlanForUser(user)); }
export function mobileItemsForUser(user) { const plan = currentPlanForUser(user); const items = [["planday", "PD", "Smart Hub"], ["jobs", "JB", "Jobs"]]; if (planMeets(plan, "operator")) items.push(["command", "CM", "Command"]); else items.push(["invoices", "$", "Money"]); items.push(["more", "+", "More"]); return uniqueKeys(items).map((item) => [...item]); }
export function mobileMoreOrderForUser(user) { const primary = new Set(mobileItemsForUser(user).map(([key]) => key)); const allowed = uniqueKeys([...sidebarGroupsForUser(user).flatMap((group) => group.items), ...sidebarMoreItemsForUser(user)]).map(([key]) => key); return MOBILE_MORE_ORDER.filter((key) => allowed.includes(key) && !primary.has(key)); }
export function commandGrowthPacks(user) { const raw = user?.command_growth_packs || user?.growth_packs || user?.addons?.command_growth_pack || user?.business?.command_growth_packs || user?.business?.growth_packs || 0; const count = Number(raw); if (Number.isFinite(count) && count > 0) return count; if (authenticatedUser(user)) return 0; try { const cached = Number(window.localStorage.getItem("churvox:addon:command_growth_pack") || 0); return Number.isFinite(cached) && cached > 0 ? cached : 0; } catch { return 0; } }
export function activeTeamMemberLimit(user) { const plan = currentPlanForUser(user); if (plan === "start") return 1; if (plan === "crew") return 5; if (plan === "operator") return 15; if (plan !== "command") return 1; return 50 + commandGrowthPacks(user) * 50; }
export function ruleForPage(page) { const key = String(page || "").toLowerCase(); const aliases = { today: "planday", dashboard: "planday", smart: "planday", hub: "planday", schedule: "planday", calendar: "planday", dispatch: "planday", routes: "planday", todayswork: "planday", worktoday: "planday", askchurvox: "command", aioperatorstudio: "command", quickcreateai: "command", followupwriter: "command", quoteai: "command", invoicecheck: "command", workerbrief: "command", worker: "workercommand", workers: "workercommand", proofpack: "portal", clientportal: "portal", customerportal: "portal", accounting: "xero", accountingsync: "xero", accounting_sync: "xero", sync: "xero", xero: "xero", recurring: "jobs" }; return FEATURE_RULES[aliases[key] || key] || { area: page || "This area", open: "start", reason: "Included in the owner workspace." }; }
export function accessForPage(page, user) { const plan = currentPlanForUser(user); const rule = ruleForPage(page); const includedByPlan = planMeets(plan, rule.open); if (rule.addon === "accounting_sync") { const addonActive = hasAccountingSync(user); const allowed = includedByPlan || addonActive; return { allowed, plan, rule, requiredPlan: rule.open, addonRequired: !includedByPlan, addonActive, title: allowed ? `${rule.area} open` : `${ACCOUNTING_ADDON_NAME} required`, message: allowed ? rule.reason : `${rule.area} opens with Command or the ${ACCOUNTING_ADDON_NAME} (${ACCOUNTING_ADDON_PRICE}).` }; } return { allowed: includedByPlan, plan, rule, requiredPlan: rule.open, addonRequired: false, addonActive: false, title: includedByPlan ? `${rule.area} open` : `${PLAN_LABELS[rule.open]} required`, message: includedByPlan ? rule.reason : `${rule.area} opens on ${PLAN_LABELS[rule.open]} or above.` }; }
