import { clean, firstGood, titleOf } from "../churvox-product/controlBoardData";

export const PRIMARY_NAV = [
  { id: "today", label: "Today", area: "today" },
  { id: "jobs", label: "Jobs", area: "work" },
  { id: "clients", label: "Clients", area: "clients" },
  { id: "money", label: "Money", area: "money" },
  { id: "crew", label: "Team", area: "team" },
  { id: "messages", label: "Messages", area: "messages" },
  { id: "command", label: "Command", area: "command" },
];

export const AREA_PAGES = {
  today: ["today"],
  work: ["jobs", "schedule", "recurring"],
  clients: ["clients"],
  money: ["money", "quotes", "invoices", "accounting"],
  team: ["crew", "field", "timesheets", "access"],
  messages: ["messages"],
  command: ["command", "parked", "completed"],
  utility: ["settings", "plans", "support"],
};

const KNOWN_PAGES = new Set(Object.values(AREA_PAGES).flat());

export const AREA_TABS = {
  work: [["jobs", "Dispatch"], ["schedule", "Week"], ["recurring", "Repeat work"]],
  money: [["money", "Pulse"], ["quotes", "Quotes"], ["invoices", "Invoices"], ["accounting", "Accounting"]],
  team: [["crew", "People"], ["field", "Live field"], ["timesheets", "Time"], ["access", "Access"]],
  command: [["command", "Waiting"], ["parked", "Parked"], ["completed", "History"]],
};

const ROUTE_ALIASES = {
  dashboard: "today",
  smart: "today",
  smarthub: "today",
  work: "jobs",
  job: "jobs",
  calendar: "schedule",
  workers: "crew",
  worker: "crew",
  team: "crew",
  payroll: "timesheets",
  integrations: "accounting",
  xero: "accounting",
  help: "support",
  guide: "support",
  setup: "support",
};

export function pageFromLocation() {
  if (typeof window === "undefined") return "today";
  const path = clean((window.location.pathname || "").split("/")[1]).toLowerCase();
  const hash = clean((window.location.hash || "").replace(/^#/, "").split("?")[0]).toLowerCase();
  const candidate = ROUTE_ALIASES[hash] || hash || ROUTE_ALIASES[path] || path || "today";
  return KNOWN_PAGES.has(candidate) ? candidate : "today";
}

export function areaForPage(page) {
  return Object.entries(AREA_PAGES).find(([, pages]) => pages.includes(page))?.[0] || "today";
}

export function dateLabel(value, options = {}) {
  if (!value) return options.empty || "Date needed";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-NZ", options.long
    ? { weekday: "long", day: "numeric", month: "long" }
    : { weekday: "short", day: "numeric", month: "short" });
}

export function timeLabel(value) {
  if (!value) return "Any time";
  const text = String(value);
  if (!/^\d{1,2}:\d{2}/.test(text)) return text;
  const [hour, minute] = text.split(":");
  const date = new Date();
  date.setHours(Number(hour), Number(minute), 0, 0);
  return date.toLocaleTimeString("en-NZ", { hour: "numeric", minute: "2-digit" });
}

export function toneFor(value) {
  const raw = clean(value).toLowerCase();
  if (/complete|paid|accepted|connected|active|approved|ready/.test(raw)) return "good";
  if (/issue|check|late|overdue|urgent|blocked|unassigned|failed/.test(raw)) return "danger";
  if (/progress|acknowledged|sent|viewed|working|travel|live/.test(raw)) return "live";
  if (/park|pause|draft|offline|waiting/.test(raw)) return "quiet";
  return "neutral";
}

export function initials(value) {
  return clean(value).split(" ").filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "CV";
}

export function recordTitle(record) {
  return titleOf(record);
}

const OPTIONS = {
  service: ["Lawn mowing", "Landscaping", "Cleaning", "Handyman", "Painting", "Plumbing", "Electrical", "Pest control", "Other"],
  jobStatus: ["assigned", "acknowledged", "in_progress", "completed", "needs_check"],
  recurring: ["One-off", "Weekly", "Fortnightly", "Monthly", "Custom"],
  billing: ["Fixed price", "Hourly", "Fixed + extras", "Hourly + extras", "Quote required"],
  quoteStatus: ["Draft", "Ready", "Sent", "Viewed", "Accepted", "Converted", "Declined", "Parked"],
  invoiceStatus: ["Draft", "Due", "Sent", "Viewed", "Overdue", "Paid", "Cancelled", "Parked"],
  role: ["Owner", "Manager", "Worker", "Subcontractor", "Payroll only"],
  access: ["Full access", "Jobs only", "Worker app", "Payroll review", "No access"],
  priority: ["Low", "Normal", "High", "Urgent"],
  payFrequency: ["Weekly", "Fortnightly", "Monthly"],
  channel: ["Internal", "Worker app", "Email", "SMS (Coming soon)"],
};

function first(data, key) {
  return data?.[key]?.[0] || {};
}

export function blankRecord(type, data = {}) {
  const client = first(data, "clients");
  const worker = first(data, "workers");
  if (type === "client") return { __new: true, type, name: "", phone: "", email: "", address: "", service: "", price: "", schedule: "One-off", notes: "" };
  if (type === "quote") return { __new: true, type, title: "", client: client.name || "", clientEmail: client.email || "", amount: 0, status: "Draft", scope: "", terms: "Valid for 14 days", followUp: "", next: "Prepare for Command" };
  if (type === "invoice") return { __new: true, type, number: "", client: client.name || "", clientEmail: client.email || "", job: "", amount: 0, due: "", status: "Draft", sync: "Not synced", line: "", paymentLink: "", evidence: "", notes: "" };
  if (type === "worker") return { __new: true, type, name: "", email: "", phone: "", role: "Worker", access: "Worker app", status: "Not invited", job: "", app: "Not invited", gps: "", timesheet: "", proof: "", messages: "", payroll: "No payroll review", payFrequency: "Fortnightly", hourlyRate: "", approvedHours: "", notes: "" };
  if (type === "message") return { __new: true, type, from: "Owner", to: "", channel: "Internal", client: client.name || "", job: "", subject: "", priority: "Normal", detail: "", draft: "" };
  return { __new: true, type: "job", title: "", client: client.name || "", address: client.address || "", service: "Other", worker: worker.name || "Unassigned", date: "", time: "", price: 0, billing: "Fixed price", recurring: "One-off", status: "assigned", proof: "", extrasTotal: 0, completionNote: "", notes: "" };
}

function unique(values, fallback = []) {
  const seen = new Set();
  return [...values, ...fallback].filter((value) => {
    const label = clean(value);
    const key = label.toLowerCase();
    if (!label || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function field(label, key, type = "text", options = null, span = 1) {
  return { label, key, type, options, span };
}

export function fieldsFor(record, data) {
  const clients = unique((data.clients || []).map((item) => item.name), [record.client, "No client selected"]);
  const workers = unique((data.workers || []).map((item) => item.name), [record.worker, "Unassigned"]);
  if (record.type === "approval") return [field("Approval type", "approvalType"), field("Record", "title"), field("Client", "client"), field("Amount", "amount", "number"), field("Recommended action", "recommended", "select", ["Approve", "Save edit", "Park"]), field("What happened", "reason", "textarea", null, 2), field("What Churvox prepared", "prepared", "textarea", null, 2), field("Evidence checked", "evidence", "textarea", null, 2)];
  if (record.type === "client") return [field("Name", "name"), field("Phone", "phone"), field("Email", "email", "email"), field("Address", "address"), field("Preferred service", "service", "select", OPTIONS.service), field("Saved price", "price"), field("Preferred schedule", "schedule", "select", OPTIONS.recurring), field("Access notes", "notes", "textarea", null, 2)];
  if (record.type === "quote") return [field("Quote", "title"), field("Client", "client", "select", clients), field("Client email", "clientEmail", "email"), field("Amount", "amount", "number"), field("Status", "status", "select", OPTIONS.quoteStatus), field("Follow-up date", "followUp", "date"), field("Scope", "scope", "textarea", null, 2), field("Terms", "terms", "text", null, 2), field("Next step", "next", "text", null, 2)];
  if (record.type === "invoice") return [field("Invoice", "number"), field("Client", "client", "select", clients), field("Client email", "clientEmail", "email"), field("Job", "job"), field("Amount", "amount", "number"), field("Due date", "due", "date"), field("Status", "status", "select", OPTIONS.invoiceStatus), field("Accounting status", "sync"), field("Line item", "line", "text", null, 2), field("Payment link", "paymentLink", "text", null, 2), field("Evidence", "evidence", "textarea", null, 2), field("Invoice notes", "notes", "textarea", null, 2)];
  if (record.type === "worker") return [field("Name", "name"), field("Email", "email", "email"), field("Phone", "phone"), field("Role", "role", "select", OPTIONS.role), field("Access", "access", "select", OPTIONS.access), field("Clock status", "status"), field("Current job", "job"), field("GPS / location", "gps"), field("Proof / photos", "proof"), field("Timesheet", "timesheet"), field("Pay frequency", "payFrequency", "select", OPTIONS.payFrequency), field("Hourly rate", "hourlyRate", "number"), field("Approved hours", "approvedHours", "number"), field("Payroll status", "payroll"), field("Worker app", "app"), field("Worker messages", "messages", "textarea", null, 2), field("Notes", "notes", "textarea", null, 2)];
  if (record.type === "message") return [field("From", "from"), field("To", "to"), field("Channel", "channel", "select", OPTIONS.channel), field("Client", "client", "select", clients), field("Job", "job"), field("Priority", "priority", "select", OPTIONS.priority), field("Subject", "subject", "text", null, 2), field("Message", "detail", "textarea", null, 2), field("Prepared reply", "draft", "textarea", null, 2)];
  return [field("Job name", "title"), field("Client", "client", "select", clients), field("Site address", "address", "text", null, 2), field("Service", "service", "select", OPTIONS.service), field("Assigned worker", "worker", "select", workers), field("Scheduled date", "date", "date"), field("Start time", "time", "time"), field("Price NZD", "price", "number"), field("Billing type", "billing", "select", OPTIONS.billing), field("Frequency", "recurring", "select", OPTIONS.recurring), field("Status", "status", "select", OPTIONS.jobStatus), field("Proof / photos", "proof", "text", null, 2), field("Extras total", "extrasTotal", "number"), field("Completion note", "completionNote", "textarea", null, 2), field("Job notes", "notes", "textarea", null, 2)];
}

function payloadFor(record, values) {
  if (record.type === "client") return { name: values.name, phone: values.phone, email: values.email, address: values.address, service: values.service, price: values.price, schedule: values.schedule, notes: values.notes };
  if (record.type === "quote") return { title: values.title, client_name: values.client, customer_email: values.clientEmail, amount: values.amount, status: values.status, scope: values.scope, terms: values.terms, follow_up: values.followUp, next_step: values.next };
  if (record.type === "invoice") return { invoice_number: values.number, client_name: values.client, customer_email: values.clientEmail, job_title: values.job, amount: values.amount, due_date: values.due, status: values.status, accounting_status: values.sync, line_item: values.line, payment_link: values.paymentLink, evidence: values.evidence, notes: values.notes };
  if (record.type === "worker") return { name: values.name, email: values.email, phone: values.phone, role: values.role, access: values.access, status: values.status, current_job: values.job, gps: values.gps, proof: values.proof, messages: values.messages, timesheet: values.timesheet, pay_frequency: values.payFrequency, hourly_rate: values.hourlyRate, approved_hours: values.approvedHours, payroll_status: values.payroll, app_status: values.app, notes: values.notes };
  if (record.type === "message") return { from: values.from, to: values.to, channel: values.channel, client_name: values.client, job_title: values.job, subject: values.subject, priority: values.priority, message: values.detail, drafted_reply: values.draft };
  return { title: values.title, client_name: values.client, address: values.address, service: values.service, assigned_worker_name: values.worker, scheduled_date: values.date, scheduled_time: values.time, price: values.price, billing: values.billing, recurring: values.recurring, recurring_frequency: values.recurring, is_recurring: values.recurring && values.recurring !== "One-off", status: values.status, proof: values.proof, extras_total: values.extrasTotal, completion_note: values.completionNote, notes: values.notes };
}

export async function saveRecord(api, record, values, action = "save") {
  const id = clean(record.id || record._id);
  if (record.type === "approval") {
    return firstGood([
      () => api.post(`/command/approvals/${encodeURIComponent(id || record.title || "approval")}/execute`, { action_id: id, kind: "command_record", action, item: { ...record, fields: values } }),
      () => api.post("/command/execute-approved", { kind: "command_record", action, item: { ...record, fields: values } }),
    ]);
  }
  const payload = payloadFor(record, values);
  const isNew = record.__new || !id;
  if (record.type === "job") return firstGood(isNew ? [() => api.post("/jobs", payload), () => api.post("/jobs/create", payload)] : [() => api.patch(`/jobs/${id}`, payload), () => api.patch(`/jobs/${id}/field-update`, payload)]);
  if (record.type === "client") return firstGood(isNew ? [() => api.post("/clients", payload), () => api.post("/clients/create", payload)] : [() => api.patch(`/clients/${id}`, payload), () => api.put(`/clients/${id}`, payload)]);
  if (record.type === "quote") return firstGood(isNew ? [() => api.post("/quotes", payload), () => api.post("/quotes/create", payload)] : [() => api.patch(`/quotes/${id}`, payload), () => api.put(`/quotes/${id}`, payload)]);
  if (record.type === "invoice") return firstGood(isNew ? [() => api.post("/invoices", payload), () => api.post("/invoices/create", payload)] : [() => api.patch(`/invoices/${id}`, payload), () => api.put(`/invoices/${id}`, payload)]);
  if (record.type === "worker") return firstGood(isNew ? [() => api.post("/team/workers", payload), () => api.post("/team", payload), () => api.post("/workers", payload)] : [() => api.patch(`/team/workers/${id}`, payload), () => api.patch(`/team/${id}`, payload)]);
  return firstGood([() => api.post("/messages", payload), () => api.post("/command/execute-approved", { kind: "message", item: { ...record, payload } })]);
}
