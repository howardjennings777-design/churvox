// Churvox Role System — single source of truth

export const ROLES = {
  OWNER: "owner",
  MANAGER: "manager",
  OFFICE_ADMIN: "office_admin",
  WORKER: "worker",
  PAYROLL: "payroll",
};

const ROLE_ALIASES = {
  owner: "owner",
  admin: "owner",
  employer: "owner",
  manager: "manager",
  office_admin: "office_admin",
  officeadmin: "office_admin",
  "office admin": "office_admin",
  worker: "worker",
  payroll: "payroll",
};

export function normalizeRole(raw) {
  if (!raw) return ROLES.WORKER;
  const key = String(raw).trim().toLowerCase().replace(/[\s_-]+/g, "_");
  return ROLE_ALIASES[key] || ROLE_ALIASES[key.replace(/_/g, "")] || ROLES.WORKER;
}

// Access matrices
const ROUTE_ACCESS = {
  // Business management routes
  overview:   ["owner", "manager", "office_admin"],
  dashboard:  ["owner", "manager", "office_admin"],
  jobs:       ["owner", "manager", "office_admin"],
  calendar:   ["owner", "manager", "office_admin"],
  clients:    ["owner", "manager", "office_admin"],
  quotes:     ["owner", "manager", "office_admin"],
  invoices:   ["owner", "manager", "office_admin"],
  team:       ["owner", "manager"],
  sms:        ["owner", "manager"],
  reports:    ["owner", "manager", "office_admin", "payroll"],
  integrations:["owner", "manager", "office_admin"],
  proof_to_paid:["owner", "manager", "office_admin"],
  // Owner-only
  plans:      ["owner"],
  settings:   ["owner", "manager", "office_admin"],
  billing:    ["owner"],
  // Worker
  worker_jobs:     ["worker"],
  worker_settings: ["worker"],
  // Payroll
  payroll:    ["owner", "manager", "payroll"],
};

export function canAccess(role, route) {
  const normalized = normalizeRole(role);
  const allowed = ROUTE_ACCESS[route];
  if (!allowed) return false;
  return allowed.includes(normalized);
}

export function isBusinessRole(role) {
  const r = normalizeRole(role);
  return r === "owner" || r === "manager" || r === "office_admin";
}

export function isOwner(role) {
  return normalizeRole(role) === "owner";
}

export function isWorkerRole(role) {
  return normalizeRole(role) === "worker";
}

export function isPayrollRole(role) {
  return normalizeRole(role) === "payroll";
}

export function getDefaultRoute(role) {
  const r = normalizeRole(role);
  if (r === "worker") return "/worker/jobs";
  if (r === "payroll") return "/payroll";
  return "/dashboard";
}

export const INVITE_ROLES = [
  { value: "manager", label: "Manager" },
  { value: "office_admin", label: "Office Admin" },
  { value: "worker", label: "Worker" },
  { value: "payroll", label: "Payroll" },
];
