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

// Keep this matrix aligned with frontend/src/App.js route guards and Layout.js nav.
const ROUTE_ACCESS = {
  smart_hub: ["owner", "manager", "office_admin"],
  overview: ["owner", "manager", "office_admin"],
  dashboard: ["owner", "manager", "office_admin"],
  jobs: ["owner", "manager", "office_admin"],
  schedule: ["owner", "manager", "office_admin"],
  calendar: ["owner", "manager", "office_admin"],
  clients: ["owner", "manager", "office_admin"],
  quotes: ["owner", "manager", "office_admin"],
  invoices: ["owner", "manager", "office_admin"],
  follow_ups: ["owner", "manager", "office_admin"],
  team: ["owner", "manager"],
  sms: ["owner", "manager", "office_admin"],
  reports: ["owner", "manager", "office_admin"],
  integrations: ["owner", "manager", "office_admin"],
  automation: ["owner", "manager"],
  automation_runs: ["owner", "manager"],
  plans: ["owner"],
  settings: ["owner", "manager", "office_admin"],
  billing: ["owner"],
  worker_jobs: ["worker"],
  worker_settings: ["worker"],
  payroll: ["owner", "manager", "payroll"],
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
  if (typeof window !== "undefined" && window.location?.pathname === "/ai-assistant") {
    if (r === "worker") return "/worker/jobs";
    if (r === "payroll") return "/timesheets";
    return "/smart-hub";
  }
  if (r === "worker") return "/worker/jobs";
  if (r === "payroll") return "/timesheets";
  return "/smart-hub";
}

export const INVITE_ROLES = [
  { value: "manager", label: "Manager" },
  { value: "office_admin", label: "Office Admin" },
  { value: "worker", label: "Worker" },
  { value: "payroll", label: "Timesheets" },
];
