export const PRODUCT_PROMISE = "Churvox does the admin. The owner checks and approves.";

export const OWNER_AREAS = Object.freeze([
  { id: "today", label: "Today", purpose: "Owner briefing, field state, money and the few decisions that matter now." },
  { id: "command", label: "Command", purpose: "The single approval desk for prepared actions." },
  { id: "work", label: "Work", purpose: "Jobs, visits, recurring work, schedule and dispatch." },
  { id: "clients", label: "Clients", purpose: "Customer, property, asset and service memory." },
  { id: "money", label: "Money", purpose: "Quotes, deposits, invoices, costing and accounting handoff." },
  { id: "messages", label: "Messages", purpose: "Connected customer and worker communication." },
  { id: "team", label: "Team", purpose: "People, access, workload, licences and payroll review." },
  { id: "reports", label: "Reports", purpose: "Profit, capacity, admin debt, promise risk and business health." },
  { id: "settings", label: "Settings", purpose: "Business rules, templates, integrations, plans, security and help." },
]);

export const OFFICE_DESKS = Object.freeze([
  {
    id: "office-manager",
    name: "Office Manager",
    mission: "Ranks the day and combines related issues into the smallest useful owner decision set.",
    prepares: ["daily briefing", "priority queue", "owner handoff"],
    never: ["send", "charge", "sync", "change records without approval"],
  },
  {
    id: "reception",
    name: "Reception Desk",
    mission: "Turns enquiries into complete quote, booking or job drafts.",
    prepares: ["request summary", "quote draft", "booking plan", "missing-information request"],
    never: ["confirm a customer promise without authority", "book over a clash"],
  },
  {
    id: "scheduling",
    name: "Scheduling Desk",
    mission: "Checks capacity, travel, skills, recurrence, leave and clashes.",
    prepares: ["schedule plan", "reassignment option", "capacity warning"],
    never: ["move a committed visit without approval"],
  },
  {
    id: "job-control",
    name: "Job Control Desk",
    mission: "Watches assignments, acknowledgements, progress, issues and completion.",
    prepares: ["worker follow-up", "late-job warning", "scope-change slip"],
    never: ["complete a job without trusted completion evidence"],
  },
  {
    id: "quality",
    name: "Quality Desk",
    mission: "Checks proof, checklists, signatures, notes and extras before close-out.",
    prepares: ["proof request", "completion review", "rework warning"],
    never: ["hide missing proof", "approve its own exception"],
  },
  {
    id: "admin",
    name: "Admin Desk",
    mission: "Prepares replies, reminders, follow-ups and client-memory suggestions.",
    prepares: ["customer reply", "worker reply", "follow-up", "memory suggestion"],
    never: ["send blindly", "overwrite client memory without approval"],
  },
  {
    id: "money",
    name: "Money Desk",
    mission: "Prepares quotes, invoices, deposits, overdue follow-ups and costing checks.",
    prepares: ["quote", "invoice", "deposit request", "overdue follow-up", "margin warning"],
    never: ["mark money paid without trusted confirmation", "charge a card without approval"],
  },
  {
    id: "accounting",
    name: "Accounting Desk",
    mission: "Checks tax settings, export readiness, duplicate risk and sync safety.",
    prepares: ["accounting review", "export pack", "sync request"],
    never: ["file tax", "change an external ledger without approval"],
  },
  {
    id: "payroll",
    name: "Payroll Desk",
    mission: "Prepares hours review and highlights missing or unusual time.",
    prepares: ["hours review", "timer correction request", "payroll export"],
    never: ["pay staff", "submit payroll", "create bank payout files"],
  },
  {
    id: "guard",
    name: "Churvox Guard",
    mission: "Protects promises, proof, schedule, margin and execution reliability across every desk.",
    prepares: ["risk warning", "missing-step slip", "process rule suggestion", "safe retry"],
    never: ["silence a failed action", "treat uncertainty as success"],
  },
]);

export const COMMAND_SLIP_REQUIRED_FIELDS = Object.freeze([
  "title",
  "desk",
  "priority",
  "whyItMatters",
  "recordsChecked",
  "preparedAction",
  "confidence",
  "missingInformation",
  "customerImpact",
  "workerImpact",
  "moneyImpact",
  "recommendedAction",
  "availableDecisions",
  "idempotencyKey",
  "auditReference",
]);

export const OWNER_APPROVAL_ACTIONS = Object.freeze([
  "approve",
  "edit",
  "ask",
  "park",
  "reject",
]);

export const JOB_STATES = Object.freeze([
  "draft",
  "ready_to_schedule",
  "scheduled",
  "assigned",
  "acknowledged",
  "travelling",
  "in_progress",
  "paused",
  "needs_help",
  "completion_submitted",
  "quality_check",
  "completed",
  "invoiced",
  "archived",
  "cancelled",
]);

export const QUOTE_STATES = Object.freeze([
  "draft",
  "owner_review",
  "ready_to_send",
  "sent",
  "viewed",
  "changes_requested",
  "approved",
  "deposit_due",
  "deposit_paid",
  "converted",
  "declined",
  "expired",
]);

export const INVOICE_STATES = Object.freeze([
  "draft",
  "owner_review",
  "ready_to_send",
  "sent",
  "viewed",
  "part_paid",
  "paid",
  "overdue",
  "disputed",
  "credited",
  "void",
]);

export const RELEASE_GATES = Object.freeze({
  product: [
    "request-to-payment flow",
    "recurrence creates the next visit exactly once",
    "worker-owner message loop",
    "proof-to-invoice",
    "Command executes exactly once and audits the result",
    "secure customer links",
    "plan entitlements match billing",
  ],
  safety: [
    "tenant isolation",
    "role and permission enforcement",
    "destructive actions fail closed",
    "external actions require approval",
    "webhook and sync verification",
    "backup restore rehearsal",
  ],
  experience: [
    "desktop owner flow",
    "mobile owner essentials",
    "iPhone worker flow",
    "Android worker flow",
    "offline worker flow",
    "accessibility",
    "no dead buttons or misleading success states",
  ],
  commercial: [
    "signup and verification",
    "trial and checkout",
    "plan activation and current-plan truth",
    "email delivery",
    "public pages and legal pages",
    "account deletion",
  ],
  cutover: [
    "migration rehearsal",
    "rollback rehearsal",
    "monitoring and alerting",
    "owner approval",
  ],
});

export function validateCommandSlip(slip) {
  const missing = COMMAND_SLIP_REQUIRED_FIELDS.filter((field) => {
    const value = slip?.[field];
    return value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
  });
  return { valid: missing.length === 0, missing };
}
