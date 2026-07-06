import React from "react";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
import API_BASE from "../lib/apiBase";
import "./productApp.css";
import "./productPlanLocks.css";

const NAV = [
  ["today", "Today", "Daily control"],
  ["command", "Command", "Owner approvals"],
  ["jobs", "Jobs", "Run sheet"],
  ["clients", "Clients", "Service memory"],
  ["workers", "Workers", "Field view"],
  ["messages", "Messages", "Replies"],
  ["quotes", "Quotes", "Pipeline"],
  ["invoices", "Invoices", "Money"],
  ["team", "Team", "Access"],
  ["payroll", "Payroll", "Review only"],
  ["xero", "Xero", "Draft sync"],
  ["settings", "Settings", "Business"],
  ["plans", "Plans", "Billing"],
  ["support", "Help", "Support"],
];

const PAGE_COPY = {
  today: ["Run the business without hunting.", "Jobs, workers, messages, money and owner checks sit together so the day is obvious."],
  command: ["Churvox does the admin. You approve.", "Approve, edit and park live here only. Every risky or ready-to-send action comes back to the owner."],
  jobs: ["A real run sheet, not a messy list.", "Create, edit, price, assign, schedule and repeat jobs from one working form."],
  clients: ["The client file is the memory.", "Contact details, site notes, saved pricing, CSV import and job history stay together."],
  workers: ["Know what is happening outside.", "Worker status, GPS notes, proof, messages and timesheet review stay visible without crowding Jobs."],
  messages: ["Messages turn into next steps.", "Worker notes and customer replies keep their client, job and drafted response context."],
  quotes: ["Quotes move cleanly.", "Draft, ready, sent and accepted quotes can be checked and turned into work."],
  invoices: ["Money stays controlled.", "Invoices are drafted and reviewed. Sending and accounting handoff stay owner-approved."],
  team: ["People and access in one place.", "Staff, subcontractors, invites, roles and permissions are simple to manage."],
  payroll: ["Payroll is review only.", "Timesheets can be checked and exported. No tax filing. No bank payout files."],
  xero: ["Safe accounting handoff.", "Draft sync only. Owner-approved. No automatic invoice sending, tax filing or payout files."],
  settings: ["Business controls without clutter.", "Branding, GST, security, exports and account controls stay practical."],
  plans: ["Locked pricing, clear upgrade path.", "Start, Crew, Operator and Command stay matched to checkout."],
  support: ["Help that gets you unstuck.", "Setup steps, safe operating rules and contact details in plain language."],
};

const OPTIONS = {
  jobStatus: ["assigned", "acknowledged", "in_progress", "completed", "needs_check"],
  recurring: ["One-off", "Weekly", "Fortnightly", "Monthly", "Custom"],
  billing: ["Fixed price", "Hourly", "Fixed + extras", "Hourly + extras", "Quote required"],
  service: ["Lawn mowing", "Landscaping", "Cleaning", "Handyman", "Painting", "Plumbing", "Electrical", "Pest control", "Other"],
  quoteStatus: ["Draft", "Ready", "Sent", "Viewed", "Accepted", "Converted", "Parked"],
  invoiceStatus: ["Draft", "Due", "Overdue", "Paid", "Parked"],
  role: ["Owner", "Manager", "Worker", "Subcontractor", "Payroll only"],
  access: ["Full access", "Jobs only", "Worker app", "Payroll review", "No access"],
  priority: ["Low", "Normal", "High", "Urgent"],
};

const PLANS = [
  { name: "Start", price: 39, code: "start", backend: "solo", fit: "Owner getting organised", note: "Jobs, clients, quotes and invoices kept tidy.", items: ["Today", "Clients", "Jobs", "Quotes", "Invoices", "Settings"] },
  { name: "Crew", price: 89, code: "crew", backend: "team", fit: "Small team", note: "Adds worker flow, team records, messages and proof.", items: ["Everything in Start", "Workers", "Team", "Messages", "Proof capture"] },
  { name: "Operator", price: 149, code: "operator", backend: "pro", fit: "Busy owner", note: "Prepared admin with owner approval in Command.", popular: true, items: ["Everything in Crew", "Command", "Prepared quotes", "Prepared invoices", "Drafted replies"] },
  { name: "Command", price: 299, code: "command", backend: "enterprise", fit: "Larger operation", note: "Full approval desk, payroll review and guarded accounting handoff.", items: ["Everything in Operator", "Payroll review", "Accounting handoff", "Deeper controls"] },
];

const ADDONS = [
  { name: "Command Growth Pack", price: 99, stripe: "Command Growth Pack", note: "Adds 50 active team members and extra capacity." },
  { name: "Accounting Sync Add-on", price: 39, stripe: "Accounting Sync Add-on", note: "Optional draft invoice sync for non-Command tiers." },
];

const FEATURE_MIN = {
  today: "start", clients: "start", jobs: "start", quotes: "start", invoices: "start", settings: "start", plans: "none", support: "none",
  workers: "crew", messages: "crew", team: "crew",
  command: "operator",
  payroll: "command",
  xero: "accounting",
};
const PLAN_RANK = { none: 0, start: 1, crew: 2, operator: 3, command: 4 };
const PLAN_NAMES = { none: "No active plan", start: "Start", crew: "Crew", operator: "Operator", command: "Command" };

const money = (value) => new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 }).format(Number(value || 0));
const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
const keyOf = (value) => clean(value).toLowerCase().replace(/[^a-z0-9]/g, "");
const pick = (row, ...keys) => keys.map((key) => row?.[key]).find((value) => value !== undefined && value !== null && clean(value)) || "";
const numberPick = (row, ...keys) => Number(keys.map((key) => row?.[key]).find((value) => value !== undefined && value !== null && value !== "") || 0);
const unwrap = (payload) => payload?.data?.data ?? payload?.data ?? payload;
const apiUrl = (path) => `${String(API_BASE || "").replace(/\/$/, "")}/api${path}`;

function normalizePlan(value) {
  const key = keyOf(value);
  if (["command", "enterprise", "commandplan"].includes(key)) return "command";
  if (["operator", "pro", "professional"].includes(key)) return "operator";
  if (["crew", "team"].includes(key)) return "crew";
  if (["start", "solo", "starter", "basic"].includes(key)) return "start";
  return "none";
}

function valueList(value) {
  if (Array.isArray(value)) return value.map(keyOf);
  if (value && typeof value === "object") return Object.keys(value).filter((key) => value[key]).map(keyOf);
  return clean(value) ? [keyOf(value)] : [];
}

function hasAccountingAddon(user) {
  const values = [
    ...valueList(user?.addons), ...valueList(user?.add_ons), ...valueList(user?.features), ...valueList(user?.enabled_features), ...valueList(user?.subscriptions),
    keyOf(user?.addon), keyOf(user?.addon_key), keyOf(user?.accounting_sync), keyOf(user?.xero_addon), keyOf(user?.has_accounting_sync), keyOf(user?.xero_connected),
  ].filter(Boolean).join(" ");
  return /accounting|xero|myob|sync|true|enabled/.test(values);
}

function createAccess(user) {
  const admin = user?.is_platform_owner === true || user?.is_admin === true;
  const planKey = admin ? "command" : normalizePlan(user?.plan || user?.plan_key || user?.selected_plan || user?.tier || user?.subscription_plan || user?.business?.plan);
  const accounting = admin || planKey === "command" || hasAccountingAddon(user);
  const rank = PLAN_RANK[planKey] || 0;
  const can = (feature) => {
    const need = FEATURE_MIN[feature] || "start";
    if (need === "none") return true;
    if (need === "accounting") return accounting;
    return rank >= (PLAN_RANK[need] || 1);
  };
  const required = (feature) => FEATURE_MIN[feature] === "accounting" ? "Command or Accounting Sync Add-on" : PLAN_NAMES[FEATURE_MIN[feature]] || "Start";
  return { planKey, planName: PLAN_NAMES[planKey], rank, accounting, can, required };
}

function rowsFrom(payload, key) {
  const data = unwrap(payload);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[key])) return data[key];
  for (const name of ["items", "records", "results", "data", "jobs", "clients", "workers", "team", "quotes", "invoices", "messages", "actions", "notifications"]) if (Array.isArray(data?.[name])) return data[name];
  return [];
}

function idOf(row) {
  const raw = row?.id || row?._id || row?.job_id || row?.client_id || row?.quote_id || row?.invoice_id || row?.user_id || row?.message_id || "";
  return typeof raw === "object" ? clean(raw.$oid || raw.oid || raw.id || raw._id) : clean(raw);
}

function statusLabel(value) {
  const raw = clean(value).toLowerCase();
  if (/complete|done|paid/.test(raw)) return "Completed";
  if (/progress|start|active/.test(raw)) return "In progress";
  if (/issue|hold|missing|check|block/.test(raw)) return "Needs check";
  if (/ack/.test(raw)) return "Acknowledged";
  return clean(value) || "Ready";
}

function normalize(rows, type) {
  return rows.map((row, index) => {
    const id = idOf(row) || `${type}-${index}`;
    if (type === "jobs") return { ...row, id, type: "job", title: pick(row, "title", "job_title", "job_name", "name", "description") || `Job ${index + 1}`, client: pick(row, "client_name", "customer_name", "client") || "No client", worker: pick(row, "assigned_worker_name", "worker_name", "worker") || "Unassigned", status: statusLabel(row.status || row.job_status), date: pick(row, "scheduled_date", "date", "start_date"), time: pick(row, "scheduled_time", "start_time", "time"), price: numberPick(row, "price", "amount", "total"), address: pick(row, "address", "site_address"), service: pick(row, "service", "service_type") || "Other", recurring: pick(row, "recurring", "frequency", "repeat") || "One-off", billing: pick(row, "billing", "billing_type") || "Fixed price", proof: pick(row, "proof", "photo_status"), notes: pick(row, "notes", "description"), issue: pick(row, "issue", "problem", "needs_attention") };
    if (type === "clients") return { ...row, id, type: "client", name: pick(row, "name", "client_name", "customer_name") || `Client ${index + 1}`, phone: pick(row, "phone", "mobile"), email: pick(row, "email"), address: pick(row, "address", "site_address"), service: pick(row, "service", "preferred_service"), price: pick(row, "price", "saved_price"), schedule: pick(row, "schedule", "preferred_schedule", "recurring") || "One-off", notes: pick(row, "notes", "access_notes") };
    if (type === "workers") return { ...row, id, type: "worker", name: pick(row, "name", "full_name", "display_name", "email") || `Worker ${index + 1}`, email: pick(row, "email"), phone: pick(row, "phone", "mobile"), role: pick(row, "role") || "Worker", access: pick(row, "access", "access_level") || "Worker app", status: pick(row, "status", "clock_status") || "Not clocked in", job: pick(row, "current_job", "job_title") || "No job assigned", app: pick(row, "app_status", "invite_status") || "Not invited", gps: pick(row, "gps", "location"), timesheet: pick(row, "timesheet", "hours_today"), proof: pick(row, "proof", "photo_status"), messages: pick(row, "messages", "message_status"), payroll: pick(row, "payroll_status") || "No payroll review", notes: pick(row, "notes") };
    if (type === "quotes") return { ...row, id, type: "quote", title: pick(row, "title", "quote_title", "description") || `Quote ${index + 1}`, client: pick(row, "client_name", "customer_name", "client") || "No client", amount: numberPick(row, "amount", "total", "price"), status: pick(row, "status") || "Draft", scope: pick(row, "scope", "description"), terms: pick(row, "terms") || "Valid for 14 days", followUp: pick(row, "follow_up", "followUp"), next: pick(row, "next_step", "next") || "Review in Command" };
    if (type === "invoices") return { ...row, id, type: "invoice", number: pick(row, "number", "invoice_number") || `Invoice ${index + 1}`, client: pick(row, "client_name", "customer_name", "client") || "No client", job: pick(row, "job_title", "job"), amount: numberPick(row, "amount", "total"), due: pick(row, "due_date", "due"), status: pick(row, "status") || "Draft", sync: pick(row, "sync", "accounting_status", "xero_status") || "Not synced", line: pick(row, "line_item", "description"), evidence: pick(row, "evidence", "proof") };
    if (type === "messages") return { ...row, id, type: "message", from: pick(row, "from", "sender", "source") || "Unknown", subject: pick(row, "subject", "title") || "Message", detail: pick(row, "detail", "body", "message"), draft: pick(row, "draft", "drafted_reply", "reply"), client: pick(row, "client_name", "client"), job: pick(row, "job_title", "job"), priority: pick(row, "priority") || "Normal", channel: pick(row, "channel") || "Internal" };
    return { ...row, id, type: "approval", approvalType: pick(row, "type", "kind", "action_type") || "Owner check", title: pick(row, "title", "record_title", "summary") || "Prepared admin item", status: pick(row, "status", "state") || "Waiting", owner: pick(row, "owner", "recommended_action", "action") || "Approve", client: pick(row, "client", "client_name", "customer_name"), amount: numberPick(row, "amount", "total"), filled: pick(row, "filled", "summary", "what_churvox_filled") || "Prepared from live records.", evidence: pick(row, "evidence", "proof") || "Record details checked.", check: pick(row, "check", "owner_check") || "Approve, edit or park." };
  });
}

function pageFromUrl() {
  if (typeof window === "undefined") return "today";
  const path = keyOf((window.location.pathname || "").split("/")[1] || "dashboard");
  const hash = keyOf((window.location.hash || "").replace(/^#/, "").split("?")[0]);
  const aliases = { dashboard: "today", plans: "plans", guide: "support", setup: "support", setupguide: "support", help: "support", supportboard: "support", jobsboard: "jobs", clientsboard: "clients", teamboard: "team", payrollboard: "payroll", invoicesboard: "invoices", quotesboard: "quotes", settingsboard: "settings", smarthub: "today", accounting: "xero", messages: "messages" };
  const wanted = hash || aliases[path] || path;
  return NAV.some(([id]) => id === wanted) ? wanted : "today";
}

function blank(type, data) {
  const client = data.clients[0] || {};
  const worker = data.workers[0] || {};
  if (type === "client") return { __new: true, type, name: "", phone: "", email: "", address: "", service: "", price: "", schedule: "One-off", notes: "" };
  if (type === "quote") return { __new: true, type, title: "", client: client.name || "", amount: 0, status: "Draft", scope: "", terms: "Valid for 14 days", followUp: "", next: "Prepare for Command" };
  if (type === "invoice") return { __new: true, type, number: "", client: client.name || "", job: "", amount: 0, due: "", status: "Draft", sync: "Not synced", line: "", evidence: "" };
  if (type === "worker") return { __new: true, type, name: "", email: "", phone: "", role: "Worker", access: "Worker app", status: "Not invited", job: "", app: "Not invited", gps: "", timesheet: "", proof: "", messages: "", payroll: "No payroll review", notes: "" };
  if (type === "message") return { __new: true, type, from: "", channel: "Internal", client: client.name || "", job: "", subject: "", priority: "Normal", detail: "", draft: "" };
  return { __new: true, type: "job", title: "", client: client.name || "", address: client.address || "", service: "Other", worker: worker.name || "Unassigned", date: "", time: "", price: 0, billing: "Fixed price", recurring: "One-off", status: "assigned", proof: "", notes: "" };
}

function unique(values, fallback = []) {
  const seen = new Set();
  return [...values, ...fallback].filter((item) => { const label = clean(item); const key = label.toLowerCase(); if (!label || seen.has(key)) return false; seen.add(key); return true; });
}
const titleOf = (record) => record?.name || record?.number || record?.subject || record?.approvalType || record?.title || "New record";

function fieldsFor(record, data) {
  if (!record) return [];
  const clientOptions = unique(data.clients.map((client) => client.name), [record.client, "No client selected"]);
  const workerOptions = unique(data.workers.map((worker) => worker.name), [record.worker, "Unassigned"]);
  const field = (name, value, type = "text", options = null, wide = false) => ({ name, value: value ?? "", type, options, wide });
  if (record.type === "approval") return [field("Approval type", record.approvalType), field("Record", record.title), field("Client", record.client), field("Amount", record.amount || "Not money related"), field("Recommended action", record.owner, "select", ["Approve", "Save edit", "Park"]), field("What Churvox filled", record.filled, "textarea", null, true), field("Evidence checked", record.evidence, "textarea", null, true), field("Owner check", record.check, "textarea", null, true)];
  if (record.type === "client") return [field("Name", record.name), field("Phone", record.phone), field("Email", record.email, "email"), field("Address", record.address), field("Preferred service", record.service, "select", OPTIONS.service), field("Saved price", record.price), field("Preferred schedule", record.schedule, "select", OPTIONS.recurring), field("Access notes", record.notes, "textarea", null, true)];
  if (record.type === "quote") return [field("Quote", record.title), field("Client", record.client, "select", clientOptions), field("Amount", record.amount, "number"), field("Status", record.status, "select", OPTIONS.quoteStatus), field("Scope", record.scope, "textarea", null, true), field("Terms", record.terms), field("Follow-up", record.followUp), field("Next step", record.next)];
  if (record.type === "invoice") return [field("Invoice", record.number), field("Client", record.client, "select", clientOptions), field("Job", record.job), field("Amount", record.amount, "number"), field("Due date", record.due, "date"), field("Status", record.status, "select", OPTIONS.invoiceStatus), field("Xero/MYOB status", record.sync), field("Line item", record.line), field("Evidence", record.evidence, "textarea", null, true)];
  if (record.type === "worker") return [field("Name", record.name), field("Email", record.email, "email"), field("Phone", record.phone), field("Role", record.role, "select", OPTIONS.role), field("Access", record.access, "select", OPTIONS.access), field("Clock status", record.status), field("Current job", record.job), field("GPS/location", record.gps), field("Proof/photos", record.proof), field("Worker messages", record.messages, "textarea", null, true), field("Timesheet", record.timesheet), field("Payroll status", record.payroll), field("Worker app", record.app), field("Notes", record.notes, "textarea", null, true)];
  if (record.type === "message") return [field("From", record.from), field("Channel", record.channel), field("Client", record.client, "select", clientOptions), field("Job", record.job), field("Subject", record.subject), field("Priority", record.priority, "select", OPTIONS.priority), field("Message", record.detail, "textarea", null, true), field("Drafted reply", record.draft, "textarea", null, true)];
  return [field("Job name", record.title), field("Client", record.client, "select", clientOptions), field("Site address", record.address), field("Service", record.service, "select", OPTIONS.service), field("Assigned worker", record.worker, "select", workerOptions), field("Scheduled date", record.date, "date"), field("Start time", record.time, "time"), field("Price NZD", record.price, "number"), field("Billing type", record.billing, "select", OPTIONS.billing), field("Frequency", record.recurring, "select", OPTIONS.recurring), field("Status", record.status, "select", OPTIONS.jobStatus), field("Proof/photos", record.proof), field("Job notes", record.notes, "textarea", null, true)];
}

function valueFor(values, ...names) { for (const name of names) { const key = Object.keys(values).find((item) => item.toLowerCase() === name.toLowerCase()); if (key) return values[key]; } return ""; }
function payloadFor(type, values) {
  if (type === "client") return { name: valueFor(values, "Name"), phone: valueFor(values, "Phone"), email: valueFor(values, "Email"), address: valueFor(values, "Address"), service: valueFor(values, "Preferred service"), price: valueFor(values, "Saved price"), schedule: valueFor(values, "Preferred schedule"), notes: valueFor(values, "Access notes") };
  if (type === "quote") return { title: valueFor(values, "Quote"), client_name: valueFor(values, "Client"), amount: valueFor(values, "Amount"), status: valueFor(values, "Status"), scope: valueFor(values, "Scope"), terms: valueFor(values, "Terms"), follow_up: valueFor(values, "Follow-up"), next_step: valueFor(values, "Next step") };
  if (type === "invoice") return { invoice_number: valueFor(values, "Invoice"), client_name: valueFor(values, "Client"), job_title: valueFor(values, "Job"), amount: valueFor(values, "Amount"), due_date: valueFor(values, "Due date"), status: valueFor(values, "Status"), accounting_status: valueFor(values, "Xero/MYOB status"), line_item: valueFor(values, "Line item"), evidence: valueFor(values, "Evidence") };
  if (type === "worker") return { name: valueFor(values, "Name"), email: valueFor(values, "Email"), phone: valueFor(values, "Phone"), role: valueFor(values, "Role"), access: valueFor(values, "Access"), status: valueFor(values, "Clock status"), current_job: valueFor(values, "Current job"), gps: valueFor(values, "GPS/location"), proof: valueFor(values, "Proof/photos"), messages: valueFor(values, "Worker messages"), timesheet: valueFor(values, "Timesheet"), payroll_status: valueFor(values, "Payroll status"), app_status: valueFor(values, "Worker app"), notes: valueFor(values, "Notes") };
  if (type === "message") return { from: valueFor(values, "From"), channel: valueFor(values, "Channel"), client_name: valueFor(values, "Client"), job_title: valueFor(values, "Job"), subject: valueFor(values, "Subject"), priority: valueFor(values, "Priority"), message: valueFor(values, "Message"), drafted_reply: valueFor(values, "Drafted reply") };
  return { title: valueFor(values, "Job name"), client_name: valueFor(values, "Client"), address: valueFor(values, "Site address"), service: valueFor(values, "Service"), assigned_worker_name: valueFor(values, "Assigned worker"), scheduled_date: valueFor(values, "Scheduled date"), scheduled_time: valueFor(values, "Start time"), price: valueFor(values, "Price NZD"), billing: valueFor(values, "Billing type"), recurring: valueFor(values, "Frequency"), status: valueFor(values, "Status"), proof: valueFor(values, "Proof/photos"), notes: valueFor(values, "Job notes") };
}

async function firstGood(calls) {
  let last = "";
  for (const call of calls) {
    try { const result = await call(); if (result?.success !== false) return result; last = result?.error || result?.data?.detail || result?.message || last; } catch (error) { last = error?.message || last; }
  }
  throw new Error(last || "Could not save");
}

function csvEscape(value) { const text = String(value ?? ""); return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text; }
function downloadCsv(filename, rows, columns) {
  const lines = [columns.map(([label]) => csvEscape(label)).join(",")];
  rows.forEach((row) => lines.push(columns.map(([, key]) => csvEscape(row[key])).join(",")));
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
}
function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((line) => clean(line)); if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(keyOf);
  return lines.slice(1).map((line) => { const cells = line.split(","); return headers.reduce((row, header, index) => ({ ...row, [header]: clean(cells[index]) }), {}); });
}

function useProductData(enabled) {
  const api = useApi();
  const [loading, setLoading] = React.useState(Boolean(enabled));
  const [data, setData] = React.useState({ jobs: [], clients: [], workers: [], quotes: [], invoices: [], messages: [], command: [], xero: {} });
  const refresh = React.useCallback(async () => {
    if (!enabled) { setLoading(false); return; }
    setLoading(true);
    const results = await Promise.allSettled([api.get("/jobs"), api.get("/clients"), api.get("/team"), api.get("/quotes"), api.get("/invoices"), api.get("/messages"), api.get("/ai/actions"), api.get("/xero/status")]);
    const xero = unwrap(results[7]?.value) || {};
    setData({ jobs: normalize(rowsFrom(results[0]?.value, "jobs"), "jobs"), clients: normalize(rowsFrom(results[1]?.value, "clients"), "clients"), workers: normalize(rowsFrom(results[2]?.value, "team"), "workers"), quotes: normalize(rowsFrom(results[3]?.value, "quotes"), "quotes"), invoices: normalize(rowsFrom(results[4]?.value, "invoices"), "invoices"), messages: normalize(rowsFrom(results[5]?.value, "messages"), "messages"), command: normalize(rowsFrom(results[6]?.value, "actions"), "command"), xero: { connected: Boolean(xero.connected || xero.xero_connected), tenant: pick(xero, "tenant_name", "tenantName", "organisation_name"), status: pick(xero, "status") } });
    setLoading(false);
  }, [api, enabled]);
  React.useEffect(() => { refresh(); window.addEventListener("churvox:data-refresh", refresh); return () => window.removeEventListener("churvox:data-refresh", refresh); }, [refresh]);
  return { api, data, loading, refresh };
}

function Header({ page, user, go, access }) {
  const [headline, subhead] = PAGE_COPY[page] || PAGE_COPY.today;
  return <header className="cvxTop"><button type="button" className="cvxBrand" onClick={() => go("today")}><span>CV</span><b>Churvox<small>does the admin</small></b></button><div className="cvxTopTitle"><small>Owner command floor</small><h1>{NAV.find(([id]) => id === page)?.[1] || "Today"}</h1><p>{headline} {subhead}</p></div><div className="cvxBusiness"><small>{access.planName}</small><b>{user?.business_name || user?.company_name || user?.name || user?.email || "Owner"}</b></div></header>;
}
function NavBar({ page, go, access }) { return <nav className="cvxNav" aria-label="Churvox sections">{NAV.filter(([id]) => access.can(id)).map(([id, label, hint]) => <button key={id} type="button" className={page === id ? "active" : ""} onClick={() => go(id)}><b>{label}</b><small>{hint}</small></button>)}</nav>; }
function Hero({ page, data, access }) {
  const [headline, subhead] = PAGE_COPY[page] || PAGE_COPY.today; const invoiceValue = data.invoices.reduce((sum, item) => sum + item.amount, 0);
  const chips = { today: [[data.jobs.length, "jobs"], [data.workers.length, "workers"], [access.can("command") ? data.command.length : access.planName, access.can("command") ? "checks" : "plan"], [money(invoiceValue), "invoice value"]], command: [[data.command.length, "waiting"], ["Approve", "inside Command"], ["Edit", "inside Command"], ["Park", "inside Command"]], jobs: [[data.jobs.length, "jobs"], [data.jobs.filter((job) => job.recurring !== "One-off").length, "recurring"], [data.jobs.filter((job) => job.issue || /needs check/i.test(job.status)).length, "needs check"], ["Form", "editable"]], clients: [[data.clients.length, "clients"], ["CSV", "import/export"], ["Notes", "site memory"], ["History", "linked"]], workers: [[data.workers.length, "workers"], [data.workers.filter((worker) => !/not clocked|not invited/i.test(worker.status)).length, "active"], ["GPS", "map"], ["Proof", "photos"]], invoices: [[money(invoiceValue), "ledger"], [data.invoices.filter((item) => /overdue/i.test(item.status)).length, "overdue"], ["Draft", "sync only"], ["Paid", "confirmed"]], xero: [[data.xero.connected ? "Connected" : "Not connected", "status"], ["Draft", "sync only"], ["Owner", "approved"], ["Safe", "guardrails"]], plans: [[access.planName, "current"], ["14-day", "trial"], ["No card", "upfront"], ["Locked", "pricing"]] }[page] || [["Ready", "workspace"], ["Records", "editable"], ["Clean", "layout"], ["Owner", "control"]];
  return <section className="cvxHero"><div><small>{page}</small><h2>{headline}</h2><p>{subhead}</p></div><div className="cvxHeroStats">{chips.map(([value, label]) => <span key={label}><b>{value}</b><small>{label}</small></span>)}</div></section>;
}
function Panel({ title, children, className = "", action = null }) { return <section className={`cvxPanel ${className}`}><header><h3>{title}</h3>{action}</header>{children}</section>; }
function Row({ title, meta, tag, tone = "", onClick, action = "Open" }) { return <button type="button" className={`cvxRow ${tone}`} onClick={onClick}><span className="dot" /><span><b>{title}</b><small>{meta}</small></span><em>{tag || action}</em></button>; }
function Empty({ title = "Nothing here yet", text = "Records will appear here when they exist." }) { return <div className="cvxEmpty"><b>{title}</b><span>{text}</span></div>; }
function Toolbar({ children }) { return <div className="cvxToolbar">{children}</div>; }
function Kpis({ items }) { return <div className="cvxKpis">{items.map(([label, value, tone]) => <span key={label} className={tone || ""}><b>{value}</b><small>{label}</small></span>)}</div>; }
function Field({ def, value, onChange, readOnly }) { const common = { name: def.name, value: value ?? "", disabled: readOnly, readOnly, onChange }; if (def.type === "textarea") return <label className={`cvxField ${def.wide ? "wide" : ""}`}><span>{def.name}</span><textarea {...common} rows={4} /></label>; if (def.options) return <label className={`cvxField ${def.wide ? "wide" : ""}`}><span>{def.name}</span><select {...common}>{unique([value], def.options).map((item) => <option key={item} value={item}>{item}</option>)}</select></label>; return <label className={`cvxField ${def.wide ? "wide" : ""}`}><span>{def.name}</span><input {...common} type={def.type || "text"} step={def.type === "number" ? "0.01" : undefined} /></label>; }
function Preview({ record, data, open }) { if (!record) return <Empty title="No record selected" text="Open a row or create a new record to see the full working form." />; return <div className="cvxPreview"><div className="cvxPreviewTop"><small>{record.type}</small><h3>{titleOf(record)}</h3><button type="button" onClick={() => open(record)}>Open form</button></div><div className="cvxForm readonly">{fieldsFor(record, data).slice(0, 8).map((def) => <Field key={def.name} def={def} value={def.value} readOnly />)}</div></div>; }
function Notice({ notice, clear }) { if (!notice) return null; return <div className={`cvxNotice ${notice.tone || ""}`}><b>{notice.title}</b><span>{notice.text}</span><button type="button" onClick={clear}>Close</button></div>; }

function PlanLockedPage({ page, access, go }) { return <><Hero page="plans" data={{ jobs: [], workers: [], invoices: [], command: [] }} access={access} /><section className="cvxLock span12"><small>Plan locked</small><h2>{NAV.find(([id]) => id === page)?.[1] || "This page"} needs {access.required(page)}.</h2><p>Your current plan is {access.planName}. Churvox only shows and runs the tools included in the current plan, so there are no fake buttons or dead sections.</p><button type="button" onClick={() => go("plans")}>View plans</button></section></>; }

function Drawer({ record, data, api, refresh, close, notify }) {
  const [values, setValues] = React.useState({}); const [busy, setBusy] = React.useState(false);
  React.useEffect(() => { if (!record) return; const next = {}; fieldsFor(record, data).forEach((def) => { next[def.name] = def.value ?? ""; }); setValues(next); }, [record, data]);
  if (!record) return null;
  const type = record.type; const id = idOf(record); const isNew = record.__new || !id; const isApproval = type === "approval"; const change = (event) => setValues((current) => ({ ...current, [event.target.name]: event.target.value }));
  async function save(action = "save") {
    setBusy(true);
    try {
      const payload = payloadFor(type, values);
      if (isApproval) await firstGood([() => api.post(`/command/approvals/${encodeURIComponent(id || record.title || "approval")}/execute`, { action_id: id, kind: "command_record", action, item: { ...record, fields: values } }), () => api.post("/command/execute-approved", { kind: "command_record", action, item: { ...record, fields: values } })]);
      else if (type === "job") await firstGood(isNew ? [() => api.post("/jobs", payload), () => api.post("/jobs/create", payload)] : [() => api.patch(`/jobs/${id}`, payload), () => api.patch(`/jobs/${id}/field-update`, payload)]);
      else if (type === "client") await firstGood(isNew ? [() => api.post("/clients", payload), () => api.post("/clients/create", payload)] : [() => api.patch(`/clients/${id}`, payload), () => api.put(`/clients/${id}`, payload)]);
      else if (type === "quote") await firstGood(isNew ? [() => api.post("/quotes", payload), () => api.post("/quotes/create", payload)] : [() => api.patch(`/quotes/${id}`, payload), () => api.put(`/quotes/${id}`, payload)]);
      else if (type === "invoice") await firstGood(isNew ? [() => api.post("/invoices", payload), () => api.post("/invoices/create", payload)] : [() => api.patch(`/invoices/${id}`, payload), () => api.put(`/invoices/${id}`, payload)]);
      else if (type === "worker") await firstGood(isNew ? [() => api.post("/team/workers", payload), () => api.post("/team", payload), () => api.post("/workers", payload)] : [() => api.patch(`/team/workers/${id}`, payload), () => api.patch(`/team/${id}`, payload)]);
      else if (type === "message") await firstGood([() => api.post("/messages", payload), () => api.post("/command/execute-approved", { kind: "message", item: { ...record, fields: values, payload } })]);
      await refresh(); notify({ title: isApproval ? "Command updated" : isNew ? "Record created" : "Record saved", text: isApproval ? `${action === "park" ? "Parked" : action === "edit" ? "Edited" : "Approved"} in Command.` : "The page has refreshed.", tone: "good" }); close();
    } catch (error) { notify({ title: "Could not save", text: error?.message || "Please check the fields and try again.", tone: "bad" }); } finally { setBusy(false); }
  }
  return <div className="cvxDrawerLayer"><aside className={`cvxDrawer ${isApproval ? "approval" : ""}`}><button type="button" className="cvxClose" onClick={close}>Close</button><small>{isNew ? "New record" : isApproval ? "Command slip" : type}</small><h2>{isApproval ? "Approval slip" : titleOf(record)}</h2><p>{isApproval ? "Check what Churvox prepared, edit if needed, then approve or park." : "Proper working form. Save the record here; approval decisions stay in Command."}</p><div className="cvxForm">{fieldsFor(record, data).map((def) => <Field key={def.name} def={def} value={values[def.name]} readOnly={busy} onChange={change} />)}</div><div className="cvxDrawerActions">{isApproval ? <><button type="button" className="good" disabled={busy} onClick={() => save("approve")}>Approve</button><button type="button" disabled={busy} onClick={() => save("edit")}>Save edit</button><button type="button" className="quiet" disabled={busy} onClick={() => save("park")}>Park</button></> : <><button type="button" className="good" disabled={busy} onClick={() => save("save")}>{isNew ? "Create record" : "Save record"}</button><button type="button" disabled={busy} onClick={refresh}>Refresh</button><button type="button" className="quiet" onClick={close}>Close</button></>}</div></aside></div>;
}

function TodayPage({ data, open, go, access }) { const invoiceValue = data.invoices.reduce((sum, item) => sum + item.amount, 0); return <><Hero page="today" data={data} access={access} /><Kpis items={[["Jobs today", data.jobs.length], ["Workers", data.workers.length, "blue"], [access.can("command") ? "Command checks" : "Current plan", access.can("command") ? data.command.length : access.planName, "red"], ["Invoice value", money(invoiceValue), "orange"]]} /><Panel title="Today run sheet" className="span8" action={<button type="button" onClick={() => open(blank("job", data))}>Add job</button>}><div className="cvxList">{data.jobs.length ? data.jobs.slice(0, 6).map((job) => <Row key={job.id} title={`${job.time || "Any time"} · ${job.title}`} meta={`${job.client} · ${job.worker} · ${job.status}`} tag={money(job.price)} onClick={() => open(job)} />) : <Empty title="No jobs yet" text="Add a job with client, worker, price, date, time and recurrence." />}</div></Panel>{access.can("command") ? <Panel title="Waiting for owner" className="span4" action={<button type="button" onClick={() => go("command")}>Open Command</button>}><div className="cvxList compact">{data.command.length ? data.command.slice(0, 5).map((item) => <Row key={item.id} title={item.approvalType} meta={item.title} tone="red" action="Slip" onClick={() => open(item)} />) : <Empty title="Command is clear" />}</div></Panel> : <Panel title="Your plan" className="span4" action={<button type="button" onClick={() => go("plans")}>View plans</button>}><div className="cvxRule"><b>{access.planName}</b><span>Only included tools show in the top bar. Upgrade when you want workers, Command, payroll or accounting handoff.</span></div></Panel>}<Panel title="People working" className="span4"><div className="cvxList compact">{data.workers.length ? data.workers.slice(0, 5).map((worker) => <Row key={worker.id} title={worker.name} meta={`${worker.status} · ${worker.job}`} tone="blue" onClick={() => open(worker)} />) : <Empty title="No workers yet" />}</div></Panel><Panel title="Messages" className="span4"><div className="cvxList compact">{data.messages.length ? data.messages.slice(0, 4).map((message) => <Row key={message.id} title={message.subject} meta={`${message.from} · ${message.priority}`} onClick={() => open(message)} />) : <Empty title="No messages" />}</div></Panel><Panel title="Money today" className="span4"><div className="cvxMoney"><b>{money(invoiceValue)}</b><span>Draft, due and ready invoice value. Sending and sync decisions stay owner-approved.</span></div></Panel></>; }
function CommandPage({ data, open, access }) { return <><Hero page="command" data={data} access={access} /><Panel title="Approval queue" className="span7"><div className="cvxList">{data.command.length ? data.command.slice(0, 8).map((item) => <Row key={item.id} title={item.approvalType} meta={`${item.title} · ${item.status}`} tone="red" action="Open slip" onClick={() => open(item)} />) : <Empty title="No approvals waiting" text="Quotes, invoices, replies, job issues and accounting handoff appear here when the owner needs to decide." />}</div></Panel><Panel title="Working slip" className="span5 dark"><Preview record={data.command[0]} data={data} open={open} /></Panel><Panel title="Command rule" className="span12"><div className="cvxRule"><b>Approve, edit and park only live in Command.</b><span>Other pages are for clean records. Anything risky, unclear or ready to send comes here first.</span></div></Panel></>; }
function JobsPage({ data, open, access }) { const recurring = data.jobs.filter((job) => job.recurring !== "One-off"); const issues = data.jobs.filter((job) => job.issue || /needs check/i.test(job.status)); return <><Hero page="jobs" data={data} access={access} /><Toolbar><button type="button" onClick={() => open(blank("job", data))}>Add job</button><button type="button" onClick={() => open({ ...blank("job", data), recurring: "Weekly" })}>Recurring job</button>{access.can("workers") ? <button type="button" onClick={() => open(data.workers[0] || blank("worker", data))}>Assign worker</button> : null}<button type="button" onClick={() => downloadCsv("churvox-jobs.csv", data.jobs, [["Job", "title"], ["Client", "client"], ["Worker", "worker"], ["Date", "date"], ["Time", "time"], ["Price", "price"], ["Status", "status"]])}>Export</button></Toolbar><Panel title="Run sheet" className="span6"><div className="cvxList">{data.jobs.length ? data.jobs.slice(0, 10).map((job) => <Row key={job.id} title={`${job.date || "No date"} · ${job.time || "No time"}`} meta={`${job.title} · ${job.client} · ${job.worker}`} tag={money(job.price)} onClick={() => open(job)} />) : <Empty title="No jobs yet" />}</div></Panel><Panel title="Job form" className="span6"><Preview record={data.jobs[0]} data={data} open={open} /></Panel><Panel title="Recurring work" className="span6"><div className="cvxList compact">{recurring.length ? recurring.slice(0, 6).map((job) => <Row key={job.id} title={job.title} meta={`${job.recurring} · ${job.client}`} onClick={() => open(job)} />) : <Empty title="No recurring jobs" text="Weekly, fortnightly, monthly and custom work lives inside Jobs." />}</div></Panel><Panel title="Needs owner check" className="span6"><div className="cvxList compact">{issues.length ? issues.slice(0, 6).map((job) => <Row key={job.id} title={job.title} meta={job.issue || job.status} tone="red" onClick={() => open(job)} />) : <Empty title="No job issues" />}</div></Panel></>; }
function ClientsPage({ data, open, api, refresh, notify, access }) { const inputRef = React.useRef(null); const selected = data.clients[0]; const linked = selected ? [...data.jobs.filter((item) => item.client === selected.name), ...data.quotes.filter((item) => item.client === selected.name), ...data.invoices.filter((item) => item.client === selected.name)] : []; async function importCsv(file) { if (!file) return; const rows = parseCsv(await file.text()); let count = 0; for (const row of rows) { const payload = { name: row.name || row.client || row.clientname || row.customer || row.customername || "", phone: row.phone || row.mobile || "", email: row.email || "", address: row.address || row.siteaddress || "", service: row.service || row.preferredservice || "", price: row.price || row.savedprice || "", schedule: row.schedule || row.recurrence || row.recurring || "One-off", notes: row.notes || row.accessnotes || "" }; if (!payload.name) continue; const result = await api.post("/clients", payload); if (result?.success !== false) count += 1; } await refresh(); notify({ title: "CSV import finished", text: `${count} client${count === 1 ? "" : "s"} imported.`, tone: "good" }); if (inputRef.current) inputRef.current.value = ""; } return <><Hero page="clients" data={data} access={access} /><Toolbar><button type="button" onClick={() => open(blank("client", data))}>Add client</button><button type="button" onClick={() => inputRef.current?.click()}>CSV import</button><button type="button" onClick={() => downloadCsv("churvox-clients.csv", data.clients, [["Name", "name"], ["Phone", "phone"], ["Email", "email"], ["Address", "address"], ["Service", "service"], ["Price", "price"], ["Schedule", "schedule"], ["Notes", "notes"]])}>Export</button><input ref={inputRef} className="cvxHidden" type="file" accept=".csv,text/csv" onChange={(event) => importCsv(event.target.files?.[0])} /></Toolbar><Panel title="Client list" className="span5"><div className="cvxList">{data.clients.length ? data.clients.slice(0, 12).map((client) => <Row key={client.id} title={client.name} meta={`${client.address || "No address"} · ${client.service || "No service"}`} tag={client.price || "Open"} onClick={() => open(client)} />) : <Empty title="No clients yet" text="Add clients or import a CSV." />}</div></Panel><Panel title="Client file" className="span7"><Preview record={selected} data={data} open={open} /></Panel><Panel title="Linked history" className="span12"><div className="cvxHistory">{linked.length ? linked.slice(0, 10).map((item) => <Row key={`${item.type}-${item.id}`} title={titleOf(item)} meta={item.status || item.client || "Record"} tag={item.amount ? money(item.amount) : item.price || "Open"} onClick={() => open(item)} />) : <Empty title="No linked history yet" text="Jobs, quotes and invoices for this client will show here." />}</div></Panel></>; }
function WorkersPage({ data, open, access }) { const query = data.workers.map((worker) => worker.gps || worker.job).filter(Boolean).join(" ") || "Auckland New Zealand"; return <><Hero page="workers" data={data} access={access} /><Panel title="GPS map" className="span8"><div className="cvxMap"><iframe title="Worker GPS" src={`https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`} loading="lazy" /></div></Panel><Panel title="Worker status" className="span4" action={<button type="button" onClick={() => open(blank("worker", data))}>Add worker</button>}><div className="cvxList compact">{data.workers.length ? data.workers.slice(0, 8).map((worker) => <Row key={worker.id} title={worker.name} meta={`${worker.status} · ${worker.job}`} tone="blue" onClick={() => open(worker)} />) : <Empty title="No workers yet" />}</div></Panel><Panel title="Proof, messages and slips" className="span12"><div className="cvxTiles">{data.workers.length ? data.workers.map((worker) => <button key={worker.id} type="button" onClick={() => open(worker)}><b>{worker.name}</b><small>{worker.proof || "No proof yet"}</small><span>{worker.messages || "No worker message"}</span><em>{worker.timesheet || "No time"}</em></button>) : <Empty title="No proof yet" />}</div></Panel></>; }
function MessagesPage({ data, open, access }) { const workerMessages = data.messages.filter((message) => /worker|internal/i.test(`${message.from} ${message.channel}`)); const clientMessages = data.messages.filter((message) => /customer|client/i.test(`${message.from} ${message.channel}`)); return <><Hero page="messages" data={data} access={access} /><Toolbar><button type="button" onClick={() => open(blank("message", data))}>New message note</button><button type="button" onClick={() => open(data.messages[0] || blank("message", data))}>Open drafted reply</button></Toolbar><Panel title="Worker messages" className="span4"><div className="cvxList compact">{workerMessages.length ? workerMessages.slice(0, 6).map((message) => <Row key={message.id} title={message.subject} meta={`${message.from} · ${message.priority}`} onClick={() => open(message)} />) : <Empty title="No worker messages" />}</div></Panel><Panel title="Client messages" className="span4"><div className="cvxList compact">{clientMessages.length ? clientMessages.slice(0, 6).map((message) => <Row key={message.id} title={message.subject} meta={`${message.client || message.from} · ${message.priority}`} onClick={() => open(message)} />) : <Empty title="No client messages" />}</div></Panel><Panel title="Drafted reply" className="span4"><Preview record={data.messages[0]} data={data} open={open} /></Panel></>; }
function QuotesPage({ data, open, access }) { const stages = ["Draft", "Ready", "Sent", "Accepted"]; return <><Hero page="quotes" data={data} access={access} /><Toolbar><button type="button" onClick={() => open(blank("quote", data))}>New quote</button><button type="button" onClick={() => open(data.quotes[0] || blank("quote", data))}>Follow up</button><button type="button" onClick={() => open(blank("job", data))}>Create job from quote</button></Toolbar><section className="cvxPipeline span12">{stages.map((stage) => { const rows = data.quotes.filter((quote) => String(quote.status).toLowerCase().includes(stage.toLowerCase())); return <div key={stage}><h3>{stage}</h3>{rows.length ? rows.slice(0, 4).map((quote) => <Row key={quote.id} title={quote.title} meta={`${quote.client} · ${money(quote.amount)}`} onClick={() => open(quote)} />) : <small>No records</small>}</div>; })}</section><Panel title="Quote builder" className="span7"><Preview record={data.quotes[0]} data={data} open={open} /></Panel><Panel title="Quote memory" className="span5"><div className="cvxRule"><b>Scope, price and follow-up stay together.</b><span>Accepted quote detail can become job detail without retyping the same admin.</span></div></Panel></>; }
function InvoicesPage({ data, open, access }) { const draft = data.invoices.filter((invoice) => /draft/i.test(invoice.status)).reduce((sum, item) => sum + item.amount, 0); const overdue = data.invoices.filter((invoice) => /overdue/i.test(invoice.status)).length; return <><Hero page="invoices" data={data} access={access} /><Kpis items={[["Draft value", money(draft)], ["Overdue", overdue, "red"], ["Paid", data.invoices.filter((invoice) => /paid/i.test(invoice.status)).length, "blue"], ["Guard", "Draft sync", "orange"]]} /><Toolbar><button type="button" onClick={() => open(blank("invoice", data))}>New invoice draft</button><button type="button" onClick={() => downloadCsv("churvox-invoices.csv", data.invoices, [["Invoice", "number"], ["Client", "client"], ["Amount", "amount"], ["Due", "due"], ["Status", "status"], ["Sync", "sync"]])}>Export</button></Toolbar><Panel title="Invoice ledger" className="span7"><div className="cvxList">{data.invoices.length ? data.invoices.slice(0, 10).map((invoice) => <Row key={invoice.id} title={`${invoice.number} · ${invoice.client}`} meta={`${invoice.status} · due ${invoice.due || "not set"} · ${invoice.sync}`} tag={money(invoice.amount)} onClick={() => open(invoice)} />) : <Empty title="No invoices yet" />}</div></Panel><Panel title="Invoice form" className="span5"><Preview record={data.invoices[0]} data={data} open={open} /></Panel></>; }
function TeamPage({ data, open, access }) { return <><Hero page="team" data={data} access={access} /><Toolbar><button type="button" onClick={() => open(blank("worker", data))}>Invite worker</button><button type="button" onClick={() => downloadCsv("churvox-team.csv", data.workers, [["Name", "name"], ["Email", "email"], ["Role", "role"], ["Access", "access"], ["Status", "status"]])}>Export</button></Toolbar><Panel title="Team access" className="span8"><div className="cvxList">{data.workers.length ? data.workers.map((worker) => <Row key={worker.id} title={worker.name} meta={`${worker.role} · ${worker.access} · ${worker.app}`} tone="blue" onClick={() => open(worker)} />) : <Empty title="No team yet" />}</div></Panel><Panel title="Access rule" className="span4"><div className="cvxRule"><b>Workers see worker things.</b><span>Owner pages, pricing and approval decisions stay out of the worker flow.</span></div></Panel></>; }
function PayrollPage({ data, open, access }) { return <><Hero page="payroll" data={data} access={access} /><Toolbar><button type="button" onClick={() => downloadCsv("churvox-payroll-review.csv", data.workers, [["Worker", "name"], ["Timesheet", "timesheet"], ["Payroll status", "payroll"]])}>Export review CSV</button></Toolbar><Panel title="Timesheet review" className="span8"><div className="cvxList">{data.workers.length ? data.workers.map((worker) => <Row key={worker.id} title={worker.name} meta={`${worker.timesheet || "No time"} · ${worker.payroll}`} onClick={() => open(worker)} />) : <Empty title="No payroll records" />}</div></Panel><Panel title="Payroll guardrail" className="span4"><div className="cvxRule"><b>Review only.</b><span>No tax filing. No bank payout files. Export only for the owner or bookkeeper.</span></div></Panel></>; }
function XeroPage({ data, open, access }) { const connect = () => { window.location.assign(apiUrl("/xero/connect/start")); }; const disconnect = async () => { try { await fetch(apiUrl("/xero/disconnect"), { method: "POST", credentials: "include" }); window.dispatchEvent(new Event("churvox:data-refresh")); } catch {} }; return <><Hero page="xero" data={data} access={access} /><Panel title="Accounting status" className="span5" action={<button type="button" onClick={data.xero.connected ? disconnect : connect}>{data.xero.connected ? "Disconnect" : "Connect Xero"}</button>}><div className="cvxAccounting"><b>{data.xero.connected ? "Connected" : "Not connected"}</b><span>{data.xero.tenant || "Connect accounting when ready."}</span><em>Draft invoice sync only</em></div></Panel><Panel title="Ready drafts" className="span7"><div className="cvxList">{data.invoices.length ? data.invoices.slice(0, 8).map((invoice) => <Row key={invoice.id} title={`${invoice.number} · ${invoice.client}`} meta={`${invoice.status} · ${invoice.sync}`} tag={money(invoice.amount)} onClick={() => open(invoice)} />) : <Empty title="No invoice drafts" />}</div></Panel><Panel title="Guardrails" className="span12"><div className="cvxGuardGrid"><span>No automatic invoice sending</span><span>No tax filing</span><span>No bank payout files</span><span>Mark paid only after accounting refresh confirms paid</span></div></Panel></>; }
function SettingsPage({ data, user, api, notify, access }) { const [values, setValues] = React.useState({ business_name: user?.business_name || user?.company_name || "", gst_rate: user?.gst_rate || "15", public_email: user?.public_email || "hello@churvox.com", worker_rule: user?.worker_rule || "simple" }); const [busy, setBusy] = React.useState(false); const change = (event) => setValues((current) => ({ ...current, [event.target.name]: event.target.value })); async function save() { setBusy(true); try { await firstGood([() => api.patch("/business/settings", values), () => api.put("/business/settings", values), () => api.patch("/settings/business", values), () => api.post("/settings/business", values)]); notify({ title: "Settings saved", text: "Business settings were saved to Churvox.", tone: "good" }); } catch (error) { notify({ title: "Could not save settings", text: error?.message || "The backend did not accept the settings update.", tone: "bad" }); } finally { setBusy(false); } } return <><Hero page="settings" data={data} access={access} /><Panel title="Business settings" className="span6" action={<button type="button" disabled={busy} onClick={save}>Save settings</button>}><div className="cvxSettings"><label><span>Business name</span><input name="business_name" value={values.business_name} onChange={change} /></label><label><span>GST rate</span><input name="gst_rate" value={values.gst_rate} onChange={change} /></label><label><span>Public email</span><input name="public_email" value={values.public_email} onChange={change} /></label><label><span>Worker rule</span><select name="worker_rule" value={values.worker_rule} onChange={change}><option value="simple">Simple worker app</option><option value="full">Full field detail</option></select></label></div></Panel><Panel title="Safe controls" className="span6"><div className="cvxRule"><b>Settings stay practical.</b><span>Branding, GST, exports, worker rules and account controls belong here. Approvals still belong in Command.</span></div></Panel></>; }
function PlansPage({ data, access }) { return <><Hero page="plans" data={data} access={access} /><section className="cvxPlanGrid span12">{PLANS.map((plan) => { const current = access.planKey === plan.code; return <article key={plan.name} data-plan-card={!current ? true : undefined} data-stripe-plan={!current ? plan.name : undefined} className={plan.popular ? "popular" : ""}>{plan.popular ? <small>Most Popular</small> : null}<h3>{plan.name}</h3><strong>${plan.price}<em>/month + GST</em></strong><p>{plan.note}</p><ul>{plan.items.map((item) => <li key={item}>{item}</li>)}</ul>{current ? <button type="button" disabled>Current plan</button> : <button type="button" data-stripe-live-plan={plan.name} data-stripe-live-action="start_trial">Start trial</button>}</article>; })}</section><section className="cvxPlanGrid addons span12">{ADDONS.map((addon) => <article key={addon.name} data-plan-card data-stripe-plan={addon.stripe}><h3>{addon.name}</h3><strong>${addon.price}<em>/month + GST</em></strong><p>{addon.note}</p><button type="button" data-stripe-live-plan={addon.stripe} data-stripe-live-action="add_on">Add option</button></article>)}</section></>; }
function SupportPage({ data, go, access }) { return <><Hero page="support" data={data} access={access} /><Panel title="Setup checklist" className="span6"><div className="cvxChecklist"><span>1. Add clients or import CSV</span><span>2. Add workers and access if your plan includes Crew tools</span><span>3. Create recurring jobs inside Jobs</span><span>4. Review important owner decisions in Command if your plan includes it</span></div></Panel><Panel title="Contact" className="span6"><div className="cvxRule"><b>Need help?</b><span>Email hello@churvox.com. Worker problems and customer replies should stay connected to the job; owner decisions stay in Command.</span><button type="button" onClick={() => window.location.assign("mailto:hello@churvox.com")}>Email support</button>{access.can("command") ? <button type="button" onClick={() => go("command")}>Open Command</button> : null}</div></Panel></>; }
function Page({ page, data, open, go, api, refresh, notify, user, access }) { if (!access.can(page)) return <PlanLockedPage page={page} access={access} go={go} />; if (page === "command") return <CommandPage data={data} open={open} access={access} />; if (page === "jobs") return <JobsPage data={data} open={open} access={access} />; if (page === "clients") return <ClientsPage data={data} open={open} api={api} refresh={refresh} notify={notify} access={access} />; if (page === "workers") return <WorkersPage data={data} open={open} access={access} />; if (page === "messages") return <MessagesPage data={data} open={open} access={access} />; if (page === "quotes") return <QuotesPage data={data} open={open} access={access} />; if (page === "invoices") return <InvoicesPage data={data} open={open} access={access} />; if (page === "team") return <TeamPage data={data} open={open} access={access} />; if (page === "payroll") return <PayrollPage data={data} open={open} access={access} />; if (page === "xero") return <XeroPage data={data} open={open} access={access} />; if (page === "settings") return <SettingsPage data={data} user={user} api={api} notify={notify} access={access} />; if (page === "plans") return <PlansPage data={data} access={access} />; if (page === "support") return <SupportPage data={data} go={go} access={access} />; return <TodayPage data={data} open={open} go={go} access={access} />; }

export default function ProductAppV2() {
  const { user } = useAuth();
  const access = React.useMemo(() => createAccess(user), [user]);
  const { api, data, loading, refresh } = useProductData(Boolean(user));
  const [page, setPage] = React.useState(pageFromUrl);
  const [record, setRecord] = React.useState(null);
  const [notice, setNotice] = React.useState(null);
  React.useEffect(() => { const sync = () => setPage(pageFromUrl()); window.addEventListener("hashchange", sync); window.addEventListener("popstate", sync); return () => { window.removeEventListener("hashchange", sync); window.removeEventListener("popstate", sync); }; }, []);
  function go(next) { const safeNext = access.can(next) ? next : "plans"; if (safeNext !== next) setNotice({ title: "Plan locked", text: `${NAV.find(([id]) => id === next)?.[1] || "This page"} needs ${access.required(next)}.`, tone: "bad" }); setPage(safeNext); const base = window.location.pathname === "/plans" && safeNext === "plans" ? "/plans" : "/dashboard"; window.history.pushState({}, "", `${base}${safeNext === "today" ? "" : `#${safeNext}`}`); window.dispatchEvent(new Event("hashchange")); }
  return <main className="cvxProduct" data-version="CHURVOX_PLAN_LOCKED_COMMAND_FLOOR_20260706"><Header page={page} user={user} go={go} access={access} /><NavBar page={page} go={go} access={access} /><section className="cvxWorkspace"><div className="cvxPage">{loading ? <div className="cvxLoading"><b>Loading Churvox</b><span>Getting live business records.</span></div> : <Page page={page} data={data} open={setRecord} go={go} api={api} refresh={refresh} notify={setNotice} user={user} access={access} />}</div></section><Drawer record={record} data={data} api={api} refresh={refresh} close={() => setRecord(null)} notify={setNotice} /><Notice notice={notice} clear={() => setNotice(null)} /></main>;
}
