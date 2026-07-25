import React from "react";
import { useApi } from "../hooks/useApi";
import { publishControlBoardHealth } from "./controlBoardHealthStore";

export const SUPPORT_EMAIL = "hello@churvox.com";

export const PLANS = [
  { name: "Start", price: 39, code: "start", note: "Jobs, clients, quotes and invoices kept tidy.", items: ["Today", "Clients", "Work", "Quotes", "Invoices", "Settings"] },
  { name: "Crew", price: 89, code: "crew", note: "Adds worker flow, team records, messages and proof.", items: ["Everything in Start", "Workers", "Team", "Messages", "Proof capture"] },
  { name: "Operator", price: 149, code: "operator", popular: true, note: "Prepared admin with owner approval in Command.", items: ["Everything in Crew", "Command", "Prepared quotes", "Prepared invoices", "Drafted replies"] },
  { name: "Command", price: 299, code: "command", note: "Full approval desk, payroll review and guarded accounting handoff.", items: ["Everything in Operator", "Payroll review", "Accounting handoff", "Deeper controls"] },
];

export const ADDONS = [
  { name: "Command Growth Pack", price: 99, stripe: "Command Growth Pack", note: "Adds 50 active team members and extra capacity." },
  { name: "Accounting Sync Add-on", price: 39, stripe: "Accounting Sync Add-on", note: "Optional draft invoice sync for non-Command tiers." },
];

export const PLAN_RANK = { none: 0, start: 1, crew: 2, operator: 3, command: 4 };
export const PLAN_NAME = { none: "No active plan", start: "Start", crew: "Crew", operator: "Operator", command: "Command" };

export const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
export const keyOf = (value) => clean(value).toLowerCase().replace(/[^a-z0-9]/g, "");
export const money = (value) => new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 }).format(Number(value || 0));
export const titleOf = (record) => record?.name || record?.number || record?.subject || record?.approvalType || record?.title || "Record";
const unwrap = (payload) => payload?.data?.data ?? payload?.data ?? payload;
const pick = (row, ...keys) => keys.map((key) => row?.[key]).find((value) => value !== undefined && value !== null && clean(value)) || "";
const numberPick = (row, ...keys) => Number(keys.map((key) => row?.[key]).find((value) => value !== undefined && value !== null && value !== "") || 0);

function valueList(value) {
  if (Array.isArray(value)) return value.map(keyOf);
  if (value && typeof value === "object") return Object.keys(value).filter((key) => value[key]).map(keyOf);
  return clean(value) ? [keyOf(value)] : [];
}

function normalizePlan(value) {
  const key = keyOf(value);
  if (["command", "enterprise"].includes(key)) return "command";
  if (["operator", "pro", "professional"].includes(key)) return "operator";
  if (["crew", "team"].includes(key)) return "crew";
  if (["start", "solo", "starter", "basic"].includes(key)) return "start";
  return "none";
}

function hasAccountingAddon(user) {
  const values = [
    ...valueList(user?.addons), ...valueList(user?.add_ons), ...valueList(user?.features), ...valueList(user?.enabled_features),
    keyOf(user?.addon), keyOf(user?.addon_key), keyOf(user?.accounting_sync), keyOf(user?.xero_addon), keyOf(user?.has_accounting_sync), keyOf(user?.xero_connected),
  ].filter(Boolean).join(" ");
  return /accounting|xero|myob|sync|true|enabled/.test(values);
}

export function createAccess(user = {}) {
  const ownerEmail = clean(user?.email).toLowerCase();
  const admin = ownerEmail === "hello@churvox.com" || ownerEmail === "howardjennings777@gmail.com" || user?.is_platform_owner === true || user?.is_admin === true || ["platform_owner", "platform-admin", "platform_admin"].includes(clean(user?.role).toLowerCase());
  const planKey = admin ? "command" : normalizePlan(user.plan || user.plan_key || user.selected_plan || user.tier || user.subscription_plan || user?.business?.plan);
  const accounting = admin || planKey === "command" || hasAccountingAddon(user);
  const rank = PLAN_RANK[planKey] || 0;
  const can = (feature) => {
    const needs = { today: 1, work: 1, clients: 1, money: 1, settings: 1, messages: 2, team: 2, command: 3, payroll: 4 };
    if (feature === "accounting") return accounting;
    if (["plans", "help"].includes(feature)) return true;
    return rank >= (needs[feature] || 1);
  };
  return { planKey, planName: PLAN_NAME[planKey], rank, accounting, can };
}

function rowsFrom(payload, key) {
  const data = unwrap(payload);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[key])) return data[key];
  for (const name of ["items", "records", "results", "data", "jobs", "clients", "workers", "team", "quotes", "invoices", "messages", "actions", "notifications", "slips"]) {
    if (Array.isArray(data?.[name])) return data[name];
  }
  return [];
}

function idOf(row, fallback) {
  const raw = row?.id || row?._id || row?.job_id || row?.client_id || row?.quote_id || row?.invoice_id || row?.user_id || row?.message_id || fallback;
  return typeof raw === "object" ? clean(raw.$oid || raw.oid || raw.id || raw._id || fallback) : clean(raw);
}

function updatedAt(row) {
  return pick(row, "updated_at", "updatedAt", "modified_at", "modifiedAt", "created_at", "createdAt", "date");
}

function statusLabel(value) {
  const raw = clean(value).toLowerCase();
  if (/complete|done|paid/.test(raw)) return "Completed";
  if (/progress|start|active|working/.test(raw)) return "In progress";
  if (/issue|hold|missing|check|block|late|overdue/.test(raw)) return "Needs check";
  if (/ack/.test(raw)) return "Acknowledged";
  return clean(value) || "Ready";
}

function normalize(rows, type) {
  return rows.map((row, index) => {
    const id = idOf(row, `${type}-${index}`);
    const base = { ...row, id, updatedAt: updatedAt(row) };
    if (type === "jobs") return { ...base, type: "job", title: pick(row, "title", "job_title", "job_name", "name", "description") || `Job ${index + 1}`, client: pick(row, "client_name", "customer_name", "client") || "No client", worker: pick(row, "assigned_worker_name", "worker_name", "worker") || "Unassigned", status: statusLabel(row.status || row.job_status), date: pick(row, "scheduled_date", "date", "start_date"), time: pick(row, "scheduled_time", "start_time", "time"), price: numberPick(row, "price", "amount", "total"), address: pick(row, "address", "site_address"), service: pick(row, "service", "service_type") || "Other", recurring: pick(row, "recurring", "recurring_frequency", "frequency", "repeat") || "One-off", billing: pick(row, "billing", "billing_type") || "Fixed price", proof: pick(row, "proof", "photo_status", "completion_photos"), notes: pick(row, "notes", "description", "completion_note"), issue: pick(row, "issue", "problem", "needs_attention"), timerStatus: pick(row, "timer_status"), timer_running: Boolean(row.timer_running), timeSeconds: numberPick(row, "total_time_seconds", "time_seconds", "time_spent_seconds"), invoiceId: pick(row, "invoice_id", "linked_invoice_id"), nextRecurringJobId: pick(row, "next_generated_job_id") };
    if (type === "clients") return { ...base, type: "client", name: pick(row, "name", "client_name", "customer_name") || `Client ${index + 1}`, phone: pick(row, "phone", "mobile"), email: pick(row, "email"), address: pick(row, "address", "site_address"), service: pick(row, "service", "preferred_service"), price: pick(row, "price", "saved_price"), schedule: pick(row, "schedule", "preferred_schedule", "recurring") || "One-off", notes: pick(row, "notes", "access_notes") };
    if (type === "workers") return { ...base, type: "worker", name: pick(row, "name", "full_name", "display_name", "email") || `Worker ${index + 1}`, email: pick(row, "email"), phone: pick(row, "phone", "mobile"), role: pick(row, "role") || "Worker", access: pick(row, "access", "access_level") || "Worker app", status: pick(row, "status", "clock_status") || "Not clocked in", job: pick(row, "current_job", "job_title") || "No job assigned", app: pick(row, "app_status", "invite_status") || "Not invited", gps: pick(row, "gps", "location"), timesheet: pick(row, "timesheet", "hours_today"), proof: pick(row, "proof", "photo_status"), messages: pick(row, "messages", "message_status"), payroll: pick(row, "payroll_status") || "No payroll review", payFrequency: pick(row, "pay_frequency") || "Fortnightly", hourlyRate: numberPick(row, "hourly_rate", "rate"), approvedHours: numberPick(row, "approved_hours"), notes: pick(row, "notes") };
    if (type === "quotes") return { ...base, type: "quote", title: pick(row, "title", "quote_title", "quote_number", "description") || `Quote ${index + 1}`, client: pick(row, "client_name", "customer_name", "client") || "No client", clientEmail: pick(row, "customer_email", "client_email", "email"), amount: numberPick(row, "amount", "total", "price"), status: pick(row, "status") || "Draft", scope: pick(row, "scope", "description", "job_description"), terms: pick(row, "terms") || "Valid for 14 days", followUp: pick(row, "follow_up", "followUp"), next: pick(row, "next_step", "next") || "Review in Command", convertedJobId: pick(row, "converted_job_id", "job_id", "linked_job_id") };
    if (type === "invoices") return { ...base, type: "invoice", number: pick(row, "number", "invoice_number") || `Invoice ${index + 1}`, client: pick(row, "client_name", "customer_name", "client") || "No client", clientEmail: pick(row, "customer_email", "client_email", "email"), job: pick(row, "job_title", "job"), amount: numberPick(row, "amount", "total", "subtotal"), due: pick(row, "due_date", "due"), status: pick(row, "status") || "Draft", sync: pick(row, "sync", "accounting_status", "xero_status") || "Not synced", line: pick(row, "line_item", "description"), paymentLink: pick(row, "payment_link", "public_invoice_url"), evidence: pick(row, "evidence", "proof"), notes: pick(row, "notes") };
    if (type === "messages") return { ...base, type: "message", from: pick(row, "from", "sender", "source") || "Unknown", to: pick(row, "to", "recipient"), subject: pick(row, "subject", "title") || "Message", detail: pick(row, "detail", "body", "message"), draft: pick(row, "draft", "drafted_reply", "reply"), client: pick(row, "client_name", "client"), job: pick(row, "job_title", "job"), priority: pick(row, "priority") || "Normal", channel: pick(row, "channel") || "Internal" };
    return { ...base, type: "approval", approvalType: pick(row, "type", "kind", "action_type") || "Owner check", title: pick(row, "title", "record_title", "summary") || "Prepared admin item", status: pick(row, "status", "state") || "Waiting", client: pick(row, "client", "client_name", "customer_name"), amount: numberPick(row, "amount", "total"), recommended: pick(row, "owner", "recommended_action", "action") || "Approve", prepared: pick(row, "prepared", "filled", "summary", "message", "detail", "found", "what_churvox_filled") || "Prepared from live records.", evidence: pick(row, "evidence", "proof", "found") || "Record details checked.", reason: pick(row, "reason", "check", "owner_check", "summary", "message", "detail", "found") || "An owner decision is required." };
  });
}

const SOURCES = [
  ["Work", "jobs"],
  ["Clients", "clients"],
  ["Team", "team"],
  ["Quotes", "quotes"],
  ["Invoices", "invoices"],
  ["Messages", "messages"],
  ["Command", "actions"],
];

function sourceFailure(result, label) {
  if (!result || result.status === "rejected") return { source: label, message: result?.reason?.message || "Connection failed" };
  if (result.value?.success === false) return { source: label, message: clean(result.value?.error || result.value?.data?.detail || result.value?.message) || "Could not load" };
  return null;
}

function resultOkay(result) {
  return Boolean(result?.status === "fulfilled" && result.value?.success !== false);
}

function ownerReviewRows(payload) {
  return rowsFrom(payload, "messages")
    .filter((row) => {
      const signal = [
        row?.type, row?.kind, row?.event_type, row?.action_type, row?.status, row?.state,
        row?.route, row?.office_route, row?.title, row?.subject, row?.summary, row?.message, row?.detail,
      ].map(clean).join(" ").toLowerCase();
      return /worker_problem|waiting_owner|needs_owner|owner review|owner_review|dashboard#command|reported an issue|extra work/.test(signal);
    })
    .map((row) => ({ ...row, status: "waiting_owner_review", state: "waiting_owner_review", __commandOwnerReview: true }));
}

function commandSlipRows(payload) {
  return rowsFrom(payload, "slips").map((row) => {
    const workerText = clean(row?.summary || row?.found || row?.payload?.text || row?.details?.slip?.text || row?.details?.slip?.summary);
    const currentStatus = clean(row?.status || row?.state).toLowerCase();
    return {
      ...row,
      ...(workerText ? { summary: workerText, reason: workerText } : {}),
      status: /open|waiting|pending|review|ready/.test(currentStatus) ? "waiting_owner_review" : (row?.status || row?.state || "waiting_owner_review"),
      state: /open|waiting|pending|review|ready/.test(currentStatus) ? "waiting_owner_review" : (row?.state || row?.status || "waiting_owner_review"),
      __commandSlip: true,
    };
  });
}

function mergeCommandRows(...groups) {
  const seen = new Set();
  const merged = [];
  groups.flat().forEach((row, index) => {
    if (!row || typeof row !== "object") return;
    const body = pick(row, "summary", "message", "detail", "prepared", "title", "found");
    const key = clean(row.id || row._id || row.action_id || row.message_id || row.notification_id || row.source_id)
      || `${pick(row, "type", "kind", "action_type")}:${pick(row, "job_id", "record_id")}:${body}`
      || `command-${index}`;
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(row);
  });
  return merged;
}

export function useControlBoardData(enabled) {
  const api = useApi();
  const refreshRun = React.useRef(0);
  const [loading, setLoading] = React.useState(Boolean(enabled));
  const [failures, setFailures] = React.useState([]);
  const [data, setData] = React.useState({ jobs: [], clients: [], workers: [], quotes: [], invoices: [], messages: [], command: [], xero: {} });

  const refresh = React.useCallback(async () => {
    const run = ++refreshRun.current;
    if (!enabled) {
      setLoading(false);
      setFailures([]);
      publishControlBoardHealth([]);
      return;
    }
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        api.get("/jobs"), api.get("/clients"), api.get("/team"), api.get("/quotes"), api.get("/invoices"), api.get("/messages"), api.get("/ai/actions"), api.get("/command/slips"), api.get("/xero/status"),
      ]);
      if (run !== refreshRun.current) return;

      const messagesOkay = resultOkay(results[5]);
      const actionOkay = resultOkay(results[6]);
      const slipsOkay = resultOkay(results[7]);
      const messageCommandRows = messagesOkay ? ownerReviewRows(results[5].value) : [];
      const actionCommandRows = actionOkay ? rowsFrom(results[6].value, "actions") : [];
      const liveCommandSlipRows = slipsOkay ? commandSlipRows(results[7].value) : [];
      const commandRows = mergeCommandRows(liveCommandSlipRows, actionCommandRows, messageCommandRows);

      const issues = SOURCES.map(([label], index) => sourceFailure(results[index], label))
        .filter(Boolean)
        .filter((issue) => issue.source !== "Command" || (!messagesOkay && !slipsOkay));
      const failed = new Set(issues.map((item) => item.source));
      setFailures(issues);
      publishControlBoardHealth(issues);
      setData((current) => {
        const xeroResult = results[8];
        const xeroOkay = resultOkay(xeroResult);
        const xero = xeroOkay ? (unwrap(xeroResult.value) || {}) : current.xero;
        return {
          jobs: failed.has("Work") ? current.jobs : normalize(rowsFrom(results[0]?.value, "jobs"), "jobs"),
          clients: failed.has("Clients") ? current.clients : normalize(rowsFrom(results[1]?.value, "clients"), "clients"),
          workers: failed.has("Team") ? current.workers : normalize(rowsFrom(results[2]?.value, "team"), "workers"),
          quotes: failed.has("Quotes") ? current.quotes : normalize(rowsFrom(results[3]?.value, "quotes"), "quotes"),
          invoices: failed.has("Invoices") ? current.invoices : normalize(rowsFrom(results[4]?.value, "invoices"), "invoices"),
          messages: failed.has("Messages") ? current.messages : normalize(rowsFrom(results[5]?.value, "messages"), "messages"),
          command: (messagesOkay || actionOkay || slipsOkay) ? normalize(commandRows, "command") : current.command,
          xero: xeroOkay ? { connected: Boolean(xero.connected || xero.xero_connected), tenant: pick(xero, "tenant_name", "tenantName", "organisation_name"), status: pick(xero, "status") } : current.xero,
        };
      });
    } finally {
      if (run === refreshRun.current) setLoading(false);
    }
  }, [api, enabled]);

  React.useEffect(() => {
    refresh();
    window.addEventListener("churvox:data-refresh", refresh);
    window.addEventListener("hashchange", refresh);
    return () => {
      window.removeEventListener("churvox:data-refresh", refresh);
      window.removeEventListener("hashchange", refresh);
    };
  }, [refresh]);

  return { api, data, loading, failures, refresh };
}

export async function firstGood(calls) {
  let last = "";
  for (const call of calls) {
    try {
      const result = await call();
      if (result?.success !== false) return result;
      last = result?.error || result?.data?.detail || result?.message || last;
    } catch (error) {
      last = error?.response?.data?.detail || error?.message || last;
    }
  }
  throw new Error(last || "Could not save");
}

export function buildSearchIndex(data) {
  return [
    ...data.clients.map((item) => ({ ...item, area: "Clients", search: `${item.name} ${item.email} ${item.phone} ${item.address} ${item.notes}` })),
    ...data.jobs.map((item) => ({ ...item, area: "Work", search: `${item.title} ${item.client} ${item.worker} ${item.address} ${item.status}` })),
    ...data.quotes.map((item) => ({ ...item, area: "Money", search: `${item.title} ${item.client} ${item.status} ${item.scope}` })),
    ...data.invoices.map((item) => ({ ...item, area: "Money", search: `${item.number} ${item.client} ${item.status} ${item.job}` })),
    ...data.workers.map((item) => ({ ...item, area: "Team", search: `${item.name} ${item.email} ${item.role} ${item.status} ${item.job}` })),
    ...data.messages.map((item) => ({ ...item, area: "Messages", search: `${item.subject} ${item.from} ${item.client} ${item.job} ${item.detail}` })),
  ];
}

export function recordDate(record) {
  const date = record?.updatedAt ? new Date(record.updatedAt) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

export function downloadCsv(filename, rows, columns) {
  const esc = (value) => { const text = String(value ?? ""); return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text; };
  const lines = [columns.map(([label]) => esc(label)).join(",")];
  rows.forEach((row) => lines.push(columns.map(([, key]) => esc(row[key])).join(",")));
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
