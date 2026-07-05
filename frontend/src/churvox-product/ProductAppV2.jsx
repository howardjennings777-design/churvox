import React from "react";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
import "./productApp.css";

const NAV = [
  ["today", "Today", "Today"],
  ["command", "Command", "Owner checks"],
  ["jobs", "Jobs", "Run sheet"],
  ["clients", "Clients", "Client files"],
  ["workers", "Workers", "Field view"],
  ["messages", "Messages", "Replies"],
  ["quotes", "Quotes", "Pipeline"],
  ["invoices", "Invoices", "Money"],
  ["team", "Team", "Access"],
  ["payroll", "Payroll", "Review"],
  ["xero", "Xero", "Draft sync"],
  ["settings", "Settings", "Business"],
  ["plans", "Plans", "Billing"],
  ["support", "Support", "Help"],
];

const COPY = {
  today: ["Run today from one calm screen.", "Jobs moving, workers active, money due, messages and owner checks are grouped so the owner does not chase admin."],
  command: ["Churvox does the admin. You approve.", "Command is the approval desk. Approve, edit or park lives here only."],
  jobs: ["Jobs are the live run sheet.", "Create, edit, schedule and repeat work with price, worker, date, time, proof and notes in one form."],
  clients: ["Clients are the business memory.", "Contact details, site notes, service history, prices and CSV imports stay together."],
  workers: ["Workers show what is happening outside.", "See job status, GPS/location notes, proof, messages, timesheets and simple worker app state."],
  messages: ["Messages become clear next steps.", "Worker notes and client replies stay connected to the job, client or approval they belong to."],
  quotes: ["Quotes move through a clean pipeline.", "Draft, ready, sent, accepted and converted quotes are easy to review without hunting."],
  invoices: ["Invoices stay controlled.", "Drafts, due money, overdue invoices and safe accounting status are separated clearly."],
  team: ["Team is people and access.", "Staff, subcontractors, roles, worker access and invite status live in one tidy area."],
  payroll: ["Payroll is review only.", "Timesheets and payroll notes can be reviewed and exported. No tax filing. No bank payout files."],
  xero: ["Accounting handoff stays guarded.", "Draft sync only. Owner-approved. No automatic sending, no tax filing and no payout files."],
  settings: ["Business controls without clutter.", "Branding, GST, worker rules, exports, security and account controls stay practical."],
  plans: ["Pricing stays locked and clear.", "Start, Crew, Operator and Command stay matched to checkout, with add-ons shown separately."],
  support: ["Help that gets the owner unstuck.", "Setup help, guides and contact details are simple and easy to find."],
};

const OPTIONS = {
  jobStatus: ["assigned", "acknowledged", "in_progress", "proof_ready", "completed", "needs_check"],
  recurring: ["One-off", "Weekly", "Fortnightly", "Monthly", "Custom"],
  billing: ["Fixed price", "Hourly", "Fixed + extras", "Hourly + extras", "Quote required"],
  service: ["Lawn mowing", "Hedge trimming", "Property tidy", "Cleaning", "Painting", "Repair", "Quote visit", "Other"],
  quoteStatus: ["Draft", "Ready", "Sent", "Viewed", "Accepted", "Converted", "Parked"],
  invoiceStatus: ["Draft", "Due today", "Overdue", "Paid", "Parked"],
  role: ["Owner", "Manager", "Worker", "Subcontractor", "Payroll only"],
  access: ["Full access", "Jobs only", "Worker app", "Payroll review", "No access"],
  priority: ["Low", "Normal", "High", "Urgent"],
  commandAction: ["Approve", "Save edit", "Park"],
};

const PLAN_CARDS = [
  { name: "Start", code: "start", backendKey: "solo", price: 39, note: "Core jobs, clients, quotes and invoices.", fit: "Owner getting organised." },
  { name: "Crew", code: "crew", backendKey: "team", price: 89, note: "Worker flow, team records, proof and handover.", fit: "Small crews." },
  { name: "Operator", code: "operator", backendKey: "pro", price: 149, note: "Prepared admin with owner approval in Command.", fit: "Busy owner.", popular: true },
  { name: "Command", code: "command", backendKey: "enterprise", price: 299, note: "Full approval desk, payroll review and accounting handoff.", fit: "Larger operation." },
];

const ADDONS = [
  { name: "Command Growth Pack", code: "command_growth_pack", addonKey: "command_growth_pack", backendKey: "enterprise", price: 99, note: "Adds 50 active team members and extra operating capacity." },
  { name: "Accounting Sync Add-on", code: "accounting_sync_addon", addonKey: "xero_addon", backendKey: "team", price: 39, note: "Optional draft invoice sync for non-Command tiers where available." },
];

const currency = new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 });

function money(value) {
  return currency.format(Number(value || 0));
}

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function keyOf(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function pageFromUrl() {
  if (typeof window === "undefined") return "today";
  const path = window.location.pathname || "";
  const hash = (window.location.hash || "").replace(/^#/, "").split("?")[0];
  const raw = hash || path.split("/")[1] || "today";
  const key = keyOf(raw);
  const aliases = {
    "": "today",
    dashboard: "today",
    overview: "today",
    smarthub: "today",
    smart: "today",
    hub: "today",
    help: "support",
    supportboard: "support",
    inbox: "messages",
    message: "messages",
    time: "payroll",
    payrollboard: "payroll",
    dispatch: "workers",
    schedule: "workers",
    calendar: "workers",
    map: "workers",
    accounting: "xero",
    sync: "xero",
    reports: "invoices",
    plans: "plans",
  };
  const ids = NAV.map(([id]) => id);
  return aliases[key] || (ids.includes(key) ? key : "today");
}

function pick(obj, ...keys) {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== undefined && value !== null && clean(value)) return clean(value);
  }
  return "";
}

function numberPick(obj, ...keys) {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== undefined && value !== null && value !== "") return Number(value || 0);
  }
  return 0;
}

function unwrap(payload) {
  return payload?.data?.data ?? payload?.data ?? payload;
}

function listFrom(payload, preferredKey) {
  const data = unwrap(payload);
  if (Array.isArray(data)) return data;
  if (preferredKey && Array.isArray(data?.[preferredKey])) return data[preferredKey];
  if (preferredKey && Array.isArray(data?.data?.[preferredKey])) return data.data[preferredKey];
  const names = ["items", "records", "results", "jobs", "clients", "quotes", "invoices", "workers", "team", "messages", "notifications", "actions", "data"];
  for (const name of names) {
    if (Array.isArray(data?.[name])) return data[name];
  }
  return [];
}

function idOf(record) {
  const raw = record?.id || record?._id || record?.job_id || record?.client_id || record?.quote_id || record?.invoice_id || record?.message_id || record?.user_id || "";
  if (typeof raw === "object") return clean(raw.$oid || raw.oid || raw.id || raw._id || "");
  return clean(raw);
}

function unique(values, fallback = []) {
  const seen = new Set();
  const output = [];
  [...values, ...fallback].forEach((value) => {
    const label = clean(value);
    const key = label.toLowerCase();
    if (!label || seen.has(key)) return;
    seen.add(key);
    output.push(label);
  });
  return output.length ? output : fallback;
}

function statusLabel(value) {
  const raw = clean(value).toLowerCase();
  if (/complete|done|paid/.test(raw)) return "Completed";
  if (/progress|started|active/.test(raw)) return "In progress";
  if (/issue|hold|missing|check|blocked/.test(raw)) return "Needs check";
  if (/ack/.test(raw)) return "Acknowledged";
  return clean(value) || "Ready";
}

function normalize(rows, type) {
  return rows.map((row, index) => {
    const id = idOf(row) || `${type}-${index}`;
    if (type === "jobs") {
      return {
        ...row,
        id,
        type: "job",
        title: pick(row, "title", "job_title", "job_name", "name", "description") || `Job ${index + 1}`,
        client: pick(row, "client_name", "customer_name", "client") || "No client",
        worker: pick(row, "assigned_worker_name", "worker_name", "worker") || "Unassigned",
        status: statusLabel(row.status || row.job_status),
        date: pick(row, "scheduled_date", "date", "start_date"),
        time: pick(row, "scheduled_time", "start_time", "time"),
        price: numberPick(row, "price", "amount", "total"),
        address: pick(row, "address", "site_address"),
        service: pick(row, "service", "service_type") || "Other",
        recurring: pick(row, "recurring", "frequency", "repeat") || "One-off",
        billing: pick(row, "billing", "billing_type") || "Fixed price",
        proof: pick(row, "proof", "photo_status"),
        notes: pick(row, "notes", "description"),
        issue: pick(row, "issue", "problem", "needs_attention"),
      };
    }
    if (type === "clients") {
      return {
        ...row,
        id,
        type: "client",
        name: pick(row, "name", "client_name", "customer_name") || `Client ${index + 1}`,
        phone: pick(row, "phone", "mobile"),
        email: pick(row, "email"),
        address: pick(row, "address", "site_address"),
        service: pick(row, "service", "preferred_service"),
        price: pick(row, "price", "saved_price"),
        schedule: pick(row, "schedule", "preferred_schedule", "recurring") || "One-off",
        notes: pick(row, "notes", "access_notes"),
      };
    }
    if (type === "workers") {
      return {
        ...row,
        id,
        type: "worker",
        name: pick(row, "name", "full_name", "display_name", "email") || `Worker ${index + 1}`,
        email: pick(row, "email"),
        phone: pick(row, "phone", "mobile"),
        role: pick(row, "role") || "Worker",
        access: pick(row, "access", "access_level") || "Worker app",
        status: pick(row, "status", "clock_status") || "Not clocked in",
        job: pick(row, "current_job", "job_title") || "No job assigned",
        app: pick(row, "app_status", "invite_status") || "Not invited",
        payroll: pick(row, "payroll_status") || "No payroll review",
        gps: pick(row, "gps", "location"),
        timesheet: pick(row, "timesheet", "hours_today"),
        proof: pick(row, "proof", "photo_status"),
        messages: pick(row, "messages", "message_status"),
        notes: pick(row, "notes"),
      };
    }
    if (type === "quotes") {
      return {
        ...row,
        id,
        type: "quote",
        title: pick(row, "title", "quote_title", "description") || `Quote ${index + 1}`,
        client: pick(row, "client_name", "customer_name", "client") || "No client",
        amount: numberPick(row, "amount", "total", "price"),
        status: pick(row, "status") || "Draft",
        scope: pick(row, "scope", "description"),
        terms: pick(row, "terms") || "Valid for 14 days",
        followUp: pick(row, "follow_up", "followUp"),
        next: pick(row, "next_step", "next") || "Review and send from Command",
      };
    }
    if (type === "invoices") {
      return {
        ...row,
        id,
        type: "invoice",
        number: pick(row, "number", "invoice_number") || `Invoice ${index + 1}`,
        client: pick(row, "client_name", "customer_name", "client") || "No client",
        job: pick(row, "job_title", "job"),
        amount: numberPick(row, "amount", "total"),
        due: pick(row, "due_date", "due"),
        status: pick(row, "status") || "Draft",
        sync: pick(row, "sync", "accounting_status", "xero_status") || "Not synced",
        line: pick(row, "line_item", "description"),
        evidence: pick(row, "evidence", "proof"),
      };
    }
    if (type === "messages") {
      return {
        ...row,
        id,
        type: "message",
        from: pick(row, "from", "sender", "source") || "Unknown",
        subject: pick(row, "subject", "title") || "Message",
        detail: pick(row, "detail", "body", "message"),
        draft: pick(row, "draft", "drafted_reply", "reply"),
        client: pick(row, "client_name", "client"),
        job: pick(row, "job_title", "job"),
        priority: pick(row, "priority") || "Normal",
        channel: pick(row, "channel") || "Internal",
      };
    }
    return {
      ...row,
      id,
      type: "approval",
      approvalType: pick(row, "type", "kind", "action_type") || "Owner check",
      title: pick(row, "title", "record_title", "summary") || "Prepared admin item",
      status: pick(row, "status", "state") || "Waiting",
      owner: pick(row, "owner", "recommended_action", "action") || "Approve",
      client: pick(row, "client", "client_name", "customer_name"),
      amount: numberPick(row, "amount", "total"),
      filled: pick(row, "filled", "summary", "what_churvox_filled") || "Prepared from live records.",
      evidence: pick(row, "evidence", "proof", "evidence_checked") || "Record details checked.",
      check: pick(row, "check", "owner_check") || "Approve, edit or park.",
    };
  });
}

function titleOf(record) {
  if (!record) return "No record selected";
  return record.name || record.number || record.subject || record.approvalType || record.title || "New record";
}

function blank(type, data) {
  const client = data.clients[0] || {};
  const worker = data.workers[0] || {};
  if (type === "client") return { __new: true, type, name: "", phone: "", email: "", address: "", service: "", price: "", schedule: "One-off", notes: "" };
  if (type === "quote") return { __new: true, type, title: "", client: client.name || "", amount: 0, status: "Draft", scope: "", terms: "Valid for 14 days", followUp: "", next: "Prepare for owner approval" };
  if (type === "invoice") return { __new: true, type, number: "", client: client.name || "", job: "", amount: 0, due: "", status: "Draft", sync: "Not synced", line: "", evidence: "" };
  if (type === "worker") return { __new: true, type, name: "", email: "", phone: "", role: "Worker", access: "Worker app", status: "Not invited", job: "", app: "Not invited", payroll: "No payroll review", gps: "", timesheet: "", proof: "", messages: "", notes: "" };
  if (type === "message") return { __new: true, type, from: "", channel: "Internal", client: client.name || "", job: "", subject: "", priority: "Normal", detail: "", draft: "" };
  return { __new: true, type: "job", title: "", client: client.name || "", address: client.address || "", service: client.service || "Other", worker: worker.name || "Unassigned", date: "", time: "", price: 0, billing: "Fixed price", recurring: "One-off", status: "assigned", proof: "", notes: "" };
}

function fieldDefs(record, data) {
  if (!record) return [];
  const clientOptions = unique(data.clients.map((client) => client.name), [record.client, "No client selected"]);
  const workerOptions = unique(data.workers.map((worker) => worker.name), [record.worker, "Unassigned"]);
  const field = (name, value, type = "text", options = null, wide = false) => ({ name, value: value ?? "", type, options, wide });

  if (record.type === "approval") return [
    field("Approval type", record.approvalType),
    field("Record", record.title),
    field("Client", record.client),
    field("Amount", record.amount || "Not money related"),
    field("Recommended action", record.owner, "select", OPTIONS.commandAction),
    field("What Churvox filled", record.filled, "textarea", null, true),
    field("Evidence checked", record.evidence, "textarea", null, true),
    field("Owner check", record.check, "textarea", null, true),
  ];
  if (record.type === "client") return [
    field("Name", record.name),
    field("Phone", record.phone),
    field("Email", record.email, "email"),
    field("Address", record.address),
    field("Preferred service", record.service, "select", OPTIONS.service),
    field("Saved price", record.price),
    field("Preferred schedule", record.schedule || "One-off", "select", OPTIONS.recurring),
    field("Access notes", record.notes, "textarea", null, true),
  ];
  if (record.type === "quote") return [
    field("Quote", record.title),
    field("Client", record.client, "select", clientOptions),
    field("Amount", record.amount, "number"),
    field("Status", record.status, "select", OPTIONS.quoteStatus),
    field("Scope", record.scope, "textarea", null, true),
    field("Terms", record.terms),
    field("Follow-up", record.followUp),
    field("Next step", record.next),
  ];
  if (record.type === "invoice") return [
    field("Invoice", record.number),
    field("Client", record.client, "select", clientOptions),
    field("Job", record.job),
    field("Amount", record.amount, "number"),
    field("Due date", record.due, "date"),
    field("Status", record.status, "select", OPTIONS.invoiceStatus),
    field("Xero/MYOB status", record.sync),
    field("Line item", record.line),
    field("Evidence", record.evidence, "textarea", null, true),
  ];
  if (record.type === "worker") return [
    field("Name", record.name),
    field("Email", record.email, "email"),
    field("Phone", record.phone),
    field("Role", record.role, "select", OPTIONS.role),
    field("Access", record.access, "select", OPTIONS.access),
    field("Clock status", record.status),
    field("Current job", record.job),
    field("GPS/location", record.gps),
    field("Proof/photos", record.proof),
    field("Worker messages", record.messages, "textarea", null, true),
    field("Timesheet", record.timesheet),
    field("Slip/payroll status", record.payroll),
    field("Worker app", record.app),
    field("Notes", record.notes, "textarea", null, true),
  ];
  if (record.type === "message") return [
    field("From", record.from),
    field("Channel", record.channel),
    field("Client", record.client, "select", clientOptions),
    field("Job", record.job),
    field("Subject", record.subject),
    field("Priority", record.priority, "select", OPTIONS.priority),
    field("Message", record.detail, "textarea", null, true),
    field("Drafted reply", record.draft, "textarea", null, true),
  ];
  return [
    field("Job name", record.title),
    field("Client", record.client, "select", clientOptions),
    field("Site address", record.address),
    field("Service", record.service, "select", OPTIONS.service),
    field("Assigned worker", record.worker, "select", workerOptions),
    field("Scheduled date", record.date, "date"),
    field("Start time", record.time, "time"),
    field("Price NZD", record.price, "number"),
    field("Billing type", record.billing, "select", OPTIONS.billing),
    field("Frequency", record.recurring, "select", OPTIONS.recurring),
    field("Status", record.status, "select", OPTIONS.jobStatus),
    field("Proof/photos", record.proof),
    field("Job notes", record.notes, "textarea", null, true),
  ];
}

function valueFor(values, ...labels) {
  for (const label of labels) {
    const key = Object.keys(values).find((candidate) => candidate.toLowerCase() === label.toLowerCase());
    if (key && values[key] !== undefined && values[key] !== null) return values[key];
  }
  return "";
}

function payloadFor(type, values) {
  if (type === "client") return { name: valueFor(values, "Name"), phone: valueFor(values, "Phone"), email: valueFor(values, "Email"), address: valueFor(values, "Address"), service: valueFor(values, "Preferred service"), price: valueFor(values, "Saved price"), schedule: valueFor(values, "Preferred schedule"), notes: valueFor(values, "Access notes") };
  if (type === "quote") return { title: valueFor(values, "Quote"), client_name: valueFor(values, "Client"), amount: valueFor(values, "Amount"), status: valueFor(values, "Status"), scope: valueFor(values, "Scope"), terms: valueFor(values, "Terms"), follow_up: valueFor(values, "Follow-up"), next_step: valueFor(values, "Next step") };
  if (type === "invoice") return { invoice_number: valueFor(values, "Invoice"), client_name: valueFor(values, "Client"), job_title: valueFor(values, "Job"), amount: valueFor(values, "Amount"), due_date: valueFor(values, "Due date"), status: valueFor(values, "Status"), accounting_status: valueFor(values, "Xero/MYOB status"), line_item: valueFor(values, "Line item"), evidence: valueFor(values, "Evidence") };
  if (type === "worker") return { name: valueFor(values, "Name"), email: valueFor(values, "Email"), phone: valueFor(values, "Phone"), role: valueFor(values, "Role"), access: valueFor(values, "Access"), status: valueFor(values, "Clock status"), current_job: valueFor(values, "Current job"), gps: valueFor(values, "GPS/location"), proof: valueFor(values, "Proof/photos"), messages: valueFor(values, "Worker messages"), timesheet: valueFor(values, "Timesheet"), payroll_status: valueFor(values, "Slip/payroll status"), app_status: valueFor(values, "Worker app"), notes: valueFor(values, "Notes") };
  if (type === "message") return { from: valueFor(values, "From"), channel: valueFor(values, "Channel"), client_name: valueFor(values, "Client"), job_title: valueFor(values, "Job"), subject: valueFor(values, "Subject"), priority: valueFor(values, "Priority"), message: valueFor(values, "Message"), drafted_reply: valueFor(values, "Drafted reply") };
  return { title: valueFor(values, "Job name"), client_name: valueFor(values, "Client"), address: valueFor(values, "Site address"), service: valueFor(values, "Service"), assigned_worker_name: valueFor(values, "Assigned worker"), scheduled_date: valueFor(values, "Scheduled date"), scheduled_time: valueFor(values, "Start time"), price: valueFor(values, "Price NZD"), billing: valueFor(values, "Billing type"), recurring: valueFor(values, "Frequency"), status: valueFor(values, "Status"), proof: valueFor(values, "Proof/photos"), notes: valueFor(values, "Job notes") };
}

async function firstGood(calls) {
  let last = "";
  for (const call of calls) {
    try {
      const result = await call();
      if (result?.success !== false) return result;
      last = result?.error || result?.data?.detail || last;
    } catch (error) {
      last = error?.message || last;
    }
  }
  throw new Error(last || "Could not save");
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadCsv(filename, rows, columns) {
  const lines = [columns.map(([label]) => csvEscape(label)).join(",")];
  rows.forEach((row) => {
    lines.push(columns.map(([, key]) => csvEscape(row[key])).join(","));
  });
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (quoted && char === '"' && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (!quoted && char === ",") {
      row.push(cell);
      cell = "";
    } else if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell);
      if (row.some((item) => clean(item))) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some((item) => clean(item))) rows.push(row);
  if (rows.length < 2) return [];
  const headers = rows[0].map((item) => keyOf(item));
  return rows.slice(1).map((cells) => {
    const item = {};
    headers.forEach((header, index) => { item[header] = clean(cells[index]); });
    return item;
  });
}

function useProductData() {
  const api = useApi();
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState({ jobs: [], clients: [], workers: [], quotes: [], invoices: [], messages: [], command: [], xero: {} });

  const load = React.useCallback(async () => {
    setLoading(true);
    const results = await Promise.allSettled([
      api.get("/jobs"),
      api.get("/clients"),
      api.get("/team"),
      api.get("/quotes"),
      api.get("/invoices"),
      api.get("/messages"),
      api.get("/ai/actions"),
      api.get("/xero/status"),
    ]);
    const xero = unwrap(results[7]?.value) || {};
    setData({
      jobs: normalize(listFrom(results[0]?.value, "jobs"), "jobs"),
      clients: normalize(listFrom(results[1]?.value, "clients"), "clients"),
      workers: normalize(listFrom(results[2]?.value, "team"), "workers"),
      quotes: normalize(listFrom(results[3]?.value, "quotes"), "quotes"),
      invoices: normalize(listFrom(results[4]?.value, "invoices"), "invoices"),
      messages: normalize(listFrom(results[5]?.value, "messages"), "messages"),
      command: normalize(listFrom(results[6]?.value, "actions"), "command"),
      xero: {
        connected: Boolean(xero.connected || xero.xero_connected),
        tenant_name: pick(xero, "tenant_name", "tenantName", "organisation_name"),
      },
    });
    setLoading(false);
  }, [api]);

  React.useEffect(() => {
    let mounted = true;
    const guardedLoad = async () => {
      if (!mounted) return;
      await load();
    };
    guardedLoad();
    window.addEventListener("churvox:data-refresh", guardedLoad);
    return () => {
      mounted = false;
      window.removeEventListener("churvox:data-refresh", guardedLoad);
    };
  }, [load]);

  return { api, data, loading, refresh: load };
}

function Header({ page, user, go }) {
  const [headline, subhead] = COPY[page] || COPY.today;
  return (
    <header className="cvxTop">
      <button type="button" className="cvxBrand" onClick={() => go("today")} aria-label="Go to Today">
        <span className="cvxBrandMark">C</span>
        <span><b>Churvox</b><small>does the admin</small></span>
      </button>
      <div className="cvxTitle">
        <small>Owner workspace</small>
        <h1>{NAV.find(([id]) => id === page)?.[1] || "Today"}</h1>
        <p>{headline} {subhead}</p>
      </div>
      <div className="cvxAccount">
        <small>Business</small>
        <b>{user?.business_name || user?.company_name || user?.name || user?.email || "Owner"}</b>
      </div>
    </header>
  );
}

function Navigation({ page, go }) {
  return (
    <nav className="cvxNav" aria-label="Churvox workspace">
      {NAV.map(([id, label, hint]) => (
        <button key={id} type="button" className={page === id ? "active" : ""} onClick={() => go(id)}>
          <b>{label}</b>
          <small>{hint}</small>
        </button>
      ))}
    </nav>
  );
}

function Hero({ page, data }) {
  const [headline, subhead] = COPY[page] || COPY.today;
  const invoiceValue = data.invoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  const chips = {
    today: [[data.jobs.length, "jobs"], [data.workers.length, "workers"], [data.command.length, "checks"], [money(invoiceValue), "invoice value"]],
    command: [[data.command.length, "waiting"], ["Owner", "approval"], ["Edit", "then approve"], ["Park", "if unsure"]],
    jobs: [[data.jobs.length, "jobs"], [data.jobs.filter((job) => job.recurring !== "One-off").length, "recurring"], [data.jobs.filter((job) => job.issue).length, "needs check"], ["Form", "editable"]],
    clients: [[data.clients.length, "clients"], ["CSV", "import/export"], ["Notes", "site memory"], ["History", "linked"]],
    workers: [[data.workers.length, "workers"], [data.workers.filter((worker) => !/not clocked|clocked out/i.test(worker.status)).length, "active"], ["GPS", "field notes"], ["Proof", "photos"]],
    invoices: [[money(invoiceValue), "ledger"], [data.invoices.filter((invoice) => /overdue/i.test(invoice.status)).length, "overdue"], ["Draft", "sync only"], ["Paid", "confirmed only"]],
    xero: [[data.xero.connected ? "Connected" : "Not connected", "status"], ["Draft", "sync only"], ["Owner", "approved"], ["Safe", "guardrails"]],
  }[page] || [["Ready", "workspace"], ["Records", "editable"], ["Command", "decisions"], ["Clean", "layout"]];

  return (
    <section className="cvxHero">
      <div>
        <small>{page}</small>
        <h2>{headline}</h2>
        <p>{subhead}</p>
      </div>
      <div className="cvxHeroChips">
        {chips.map(([value, label]) => <span key={label}><b>{value}</b><small>{label}</small></span>)}
      </div>
    </section>
  );
}

function Panel({ title, children, className = "", action = null }) {
  return (
    <section className={`cvxPanel ${className}`}>
      <header className="cvxPanelHead">
        <h3>{title}</h3>
        {action}
      </header>
      {children}
    </section>
  );
}

function Toolbar({ children }) {
  return <div className="cvxToolbar">{children}</div>;
}

function Empty({ title = "Nothing here yet", text = "Records will appear here once they exist." }) {
  return <div className="cvxEmpty"><b>{title}</b><span>{text}</span></div>;
}

function Row({ title, meta, tag, tone = "", onClick, action = "Open" }) {
  return (
    <button type="button" className={`cvxRow ${tone}`} onClick={onClick}>
      <i />
      <span><b>{title}</b><small>{meta}</small></span>
      <em>{tag || action}</em>
    </button>
  );
}

function Kpis({ items }) {
  return <div className="cvxKpis">{items.map(([label, value, tone]) => <span key={label} className={tone || ""}><b>{value}</b><small>{label}</small></span>)}</div>;
}

function Field({ def, value, onChange, readOnly = false }) {
  const common = { name: def.name, value: value ?? "", disabled: readOnly, readOnly, onChange };
  if (def.type === "textarea") return <label className={`cvxField ${def.wide ? "wide" : ""}`}><span>{def.name}</span><textarea {...common} rows={4} /></label>;
  if (def.options) return <label className={`cvxField ${def.wide ? "wide" : ""}`}><span>{def.name}</span><select {...common}>{unique([value], def.options).map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
  return <label className={`cvxField ${def.wide ? "wide" : ""}`}><span>{def.name}</span><input {...common} type={def.type || "text"} step={def.type === "number" ? "0.01" : undefined} /></label>;
}

function Preview({ record, data, open }) {
  if (!record) return <Empty title="No record selected" text="Open a row to see the proper filled form." />;
  return (
    <div className="cvxPreviewForm">
      <div className="cvxRecordTop">
        <span>{record.type}</span>
        <h3>{titleOf(record)}</h3>
        <button type="button" onClick={() => open(record)}>Open form</button>
      </div>
      <div className="cvxFormGrid readonly">
        {fieldDefs(record, data).slice(0, 8).map((def) => <Field key={def.name} def={def} value={def.value} readOnly />)}
      </div>
    </div>
  );
}

function Notice({ notice, clear }) {
  if (!notice) return null;
  return <div className={`cvxToast ${notice.tone || ""}`}><b>{notice.title}</b><span>{notice.text}</span><button type="button" onClick={clear}>Close</button></div>;
}

function Drawer({ record, data, api, onClose, refresh, notify }) {
  const [values, setValues] = React.useState({});
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!record) return;
    const next = {};
    fieldDefs(record, data).forEach((def) => { next[def.name] = def.value ?? ""; });
    setValues(next);
  }, [record, data]);

  if (!record) return null;

  const type = record.type;
  const id = idOf(record);
  const isNew = record.__new || !id;
  const isApproval = type === "approval";
  const defs = fieldDefs(record, data);
  const change = (event) => setValues((current) => ({ ...current, [event.target.name]: event.target.value }));

  async function save(action = "save") {
    setBusy(true);
    try {
      const payload = payloadFor(type, values);
      if (isApproval) {
        await firstGood([
          () => api.post(`/command/approvals/${encodeURIComponent(id || record.title || "approval")}/execute`, { action_id: id, kind: "command_record", item: { ...record, fields: values, action } }),
          () => api.post("/command/execute-approved", { kind: "command_record", item: { ...record, fields: values, action } }),
        ]);
      } else if (type === "job") {
        await firstGood(isNew ? [() => api.post("/jobs", payload), () => api.post("/jobs/create", payload)] : [() => api.patch(`/jobs/${id}`, payload), () => api.patch(`/jobs/${id}/field-update`, payload)]);
      } else if (type === "client") {
        await firstGood(isNew ? [() => api.post("/clients", payload), () => api.post("/clients/create", payload)] : [() => api.patch(`/clients/${id}`, payload), () => api.put(`/clients/${id}`, payload)]);
      } else if (type === "quote") {
        await firstGood(isNew ? [() => api.post("/quotes", payload), () => api.post("/quotes/create", payload)] : [() => api.patch(`/quotes/${id}`, payload), () => api.put(`/quotes/${id}`, payload)]);
      } else if (type === "invoice") {
        await firstGood(isNew ? [() => api.post("/invoices", payload), () => api.post("/invoices/create", payload)] : [() => api.patch(`/invoices/${id}`, payload), () => api.put(`/invoices/${id}`, payload)]);
      } else if (type === "worker") {
        await firstGood(isNew ? [() => api.post("/team/workers", payload), () => api.post("/team", payload), () => api.post("/workers", payload)] : [() => api.patch(`/team/workers/${id}`, payload), () => api.patch(`/team/${id}`, payload)]);
      } else if (type === "message") {
        await firstGood([() => api.post("/messages", payload), () => api.post("/command/execute-approved", { kind: "message", item: { ...record, fields: values, payload } })]);
      }
      await refresh();
      notify({ title: isApproval ? "Command updated" : isNew ? "Record created" : "Record saved", text: isApproval ? `${action === "park" ? "Parked" : action === "edit" ? "Edited" : "Approved"} in Command.` : "The workspace has refreshed.", tone: "good" });
      onClose();
    } catch (error) {
      notify({ title: "Could not save", text: error?.message || "Please check the fields and try again.", tone: "bad" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="cvxDrawerLayer">
      <aside className={`cvxDrawer ${isApproval ? "approval" : ""}`}>
        <button type="button" className="cvxDrawerClose" onClick={onClose}>Close</button>
        <small>{isNew ? "New record" : isApproval ? "Command slip" : type}</small>
        <h2>{isApproval ? "Approval slip" : titleOf(record)}</h2>
        <p>{isApproval ? "Check what Churvox prepared, edit if needed, then approve or park." : "This is the proper working form. Save records here; risky decisions stay in Command."}</p>
        <div className="cvxFormGrid">
          {defs.map((def) => <Field key={def.name} def={def} value={values[def.name]} readOnly={busy} onChange={change} />)}
        </div>
        <div className="cvxDrawerActions">
          {isApproval ? (
            <>
              <button type="button" className="good" disabled={busy} onClick={() => save("approve")}>Approve</button>
              <button type="button" disabled={busy} onClick={() => save("edit")}>Save edit</button>
              <button type="button" className="quiet" disabled={busy} onClick={() => save("park")}>Park</button>
            </>
          ) : (
            <>
              <button type="button" className="good" disabled={busy} onClick={() => save("save")}>{isNew ? "Create record" : "Save record"}</button>
              <button type="button" disabled={busy} onClick={refresh}>Refresh data</button>
              <button type="button" className="quiet" onClick={onClose}>Close</button>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

function TodayPage({ data, open, go }) {
  const invoiceValue = data.invoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  return (
    <>
      <Hero page="today" data={data} />
      <Kpis items={[["Jobs today", data.jobs.length], ["Workers", data.workers.length, "blue"], ["Command checks", data.command.length, "red"], ["Invoice value", money(invoiceValue), "orange"]]} />
      <Panel title="Run sheet" className="span8" action={<button type="button" onClick={() => open(blank("job", data))}>Add job</button>}>
        <div className="cvxList">{data.jobs.length ? data.jobs.slice(0, 6).map((job) => <Row key={job.id} title={`${job.time || "Any time"} · ${job.title}`} meta={`${job.client} · ${job.worker} · ${job.status}`} tag={money(job.price)} onClick={() => open(job)} />) : <Empty title="No jobs yet" text="Create a job with client, worker, date, price and repeat rules." />}</div>
      </Panel>
      <Panel title="Owner checks" className="span4" action={<button type="button" onClick={() => go("command")}>View Command</button>}>
        <div className="cvxList compact">{data.command.length ? data.command.slice(0, 5).map((item) => <Row key={item.id} title={item.approvalType} meta={item.title} tone="red" action="Slip" onClick={() => open(item)} />) : <Empty title="Command is clear" />}</div>
      </Panel>
      <Panel title="People working" className="span4">
        <div className="cvxList compact">{data.workers.length ? data.workers.slice(0, 5).map((worker) => <Row key={worker.id} title={worker.name} meta={`${worker.status} · ${worker.job}`} tone="blue" onClick={() => open(worker)} />) : <Empty title="No workers yet" />}</div>
      </Panel>
      <Panel title="Messages" className="span4">
        <div className="cvxList compact">{data.messages.length ? data.messages.slice(0, 4).map((message) => <Row key={message.id} title={message.subject} meta={`${message.from} · ${message.priority}`} onClick={() => open(message)} />) : <Empty title="No messages" />}</div>
      </Panel>
      <Panel title="Money today" className="span4">
        <div className="cvxMoney"><b>{money(invoiceValue)}</b><span>Draft, due and ready invoice value. Sending and sync decisions stay owner-approved.</span></div>
      </Panel>
    </>
  );
}

function CommandPage({ data, open }) {
  return (
    <>
      <Hero page="command" data={data} />
      <Panel title="Prepared approval queue" className="span7">
        <div className="cvxList">{data.command.length ? data.command.slice(0, 8).map((item) => <Row key={item.id} title={item.approvalType} meta={`${item.title} · ${item.status}`} tone="red" action="Open slip" onClick={() => open(item)} />) : <Empty title="No approvals waiting" text="Quotes, invoices, replies, job issues and accounting handoff will appear here when the owner needs to decide." />}</div>
      </Panel>
      <Panel title="Working slip" className="span5 dark">
        <Preview record={data.command[0]} data={data} open={open} />
      </Panel>
      <Panel title="Command rule" className="span12">
        <div className="cvxRule"><b>Approve, edit and park only live in Command.</b><span>Other pages are clean workspaces for records and details. Anything risky, unclear or ready to send comes here first.</span></div>
      </Panel>
    </>
  );
}

function JobsPage({ data, open }) {
  const recurring = data.jobs.filter((job) => job.recurring !== "One-off");
  const issues = data.jobs.filter((job) => job.issue || /needs check/i.test(job.status));
  return (
    <>
      <Hero page="jobs" data={data} />
      <Toolbar>
        <button type="button" onClick={() => open(blank("job", data))}>Add job</button>
        <button type="button" onClick={() => open({ ...blank("job", data), recurring: "Weekly" })}>Recurring job</button>
        <button type="button" onClick={() => open(data.workers[0] || blank("worker", data))}>Assign worker</button>
        <button type="button" onClick={() => downloadCsv("churvox-jobs.csv", data.jobs, [["Job", "title"], ["Client", "client"], ["Worker", "worker"], ["Date", "date"], ["Time", "time"], ["Price", "price"], ["Status", "status"]])}>Export jobs</button>
      </Toolbar>
      <Panel title="Run sheet" className="span6">
        <div className="cvxList">{data.jobs.length ? data.jobs.slice(0, 10).map((job) => <Row key={job.id} title={`${job.date || "No date"} · ${job.time || "No time"}`} meta={`${job.title} · ${job.client} · ${job.worker}`} tag={money(job.price)} onClick={() => open(job)} />) : <Empty title="No jobs yet" />}</div>
      </Panel>
      <Panel title="Job form" className="span6"><Preview record={data.jobs[0]} data={data} open={open} /></Panel>
      <Panel title="Recurring work" className="span6">
        <div className="cvxList compact">{recurring.length ? recurring.slice(0, 6).map((job) => <Row key={job.id} title={job.title} meta={`${job.recurring} · ${job.client}`} onClick={() => open(job)} />) : <Empty title="No recurring jobs" text="Weekly, fortnightly and monthly work lives inside Jobs." />}</div>
      </Panel>
      <Panel title="Needs owner check" className="span6">
        <div className="cvxList compact">{issues.length ? issues.slice(0, 6).map((job) => <Row key={job.id} title={job.title} meta={job.issue || job.status} tone="red" onClick={() => open(job)} />) : <Empty title="No job issues" />}</div>
      </Panel>
    </>
  );
}

function ClientsPage({ data, open, api, refresh, notify }) {
  const inputRef = React.useRef(null);
  const selected = data.clients[0];
  const linked = selected ? [...data.jobs.filter((item) => item.client === selected.name), ...data.quotes.filter((item) => item.client === selected.name), ...data.invoices.filter((item) => item.client === selected.name)] : [];

  async function importCsv(file) {
    if (!file) return;
    const text = await file.text();
    const rows = parseCsv(text);
    let count = 0;
    for (const row of rows) {
      const payload = {
        name: row.name || row.client || row.clientname || row.customer || row.customername || "",
        phone: row.phone || row.mobile || "",
        email: row.email || "",
        address: row.address || row.siteaddress || "",
        service: row.service || row.preferredservice || "",
        price: row.price || row.savedprice || "",
        schedule: row.schedule || row.recurrence || row.recurring || "One-off",
        notes: row.notes || row.accessnotes || "",
      };
      if (!payload.name) continue;
      const result = await api.post("/clients", payload);
      if (result?.success !== false) count += 1;
    }
    await refresh();
    notify({ title: "CSV import finished", text: `${count} client${count === 1 ? "" : "s"} imported.`, tone: "good" });
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <>
      <Hero page="clients" data={data} />
      <Toolbar>
        <button type="button" onClick={() => open(blank("client", data))}>Add client</button>
        <button type="button" onClick={() => inputRef.current?.click()}>CSV import</button>
        <button type="button" onClick={() => downloadCsv("churvox-clients.csv", data.clients, [["Name", "name"], ["Phone", "phone"], ["Email", "email"], ["Address", "address"], ["Service", "service"], ["Price", "price"], ["Schedule", "schedule"], ["Notes", "notes"]])}>Export clients</button>
        <input ref={inputRef} className="cvxHiddenFile" type="file" accept=".csv,text/csv" onChange={(event) => importCsv(event.target.files?.[0])} />
      </Toolbar>
      <Panel title="Client list" className="span5">
        <div className="cvxList">{data.clients.length ? data.clients.slice(0, 12).map((client) => <Row key={client.id} title={client.name} meta={`${client.address || "No address"} · ${client.service || "No service"}`} tag={client.price || "Open"} onClick={() => open(client)} />) : <Empty title="No clients yet" text="Add clients or import a CSV." />}</div>
      </Panel>
      <Panel title="Client file" className="span7"><Preview record={selected} data={data} open={open} /></Panel>
      <Panel title="Linked history" className="span12">
        <div className="cvxHistory">{linked.length ? linked.slice(0, 10).map((item) => <Row key={`${item.type}-${item.id}`} title={titleOf(item)} meta={item.status || item.client || "Record"} tag={item.amount ? money(item.amount) : item.price || "Open"} onClick={() => open(item)} />) : <Empty title="No linked history yet" text="Jobs, quotes and invoices for this client will show here." />}</div>
      </Panel>
    </>
  );
}

function WorkersPage({ data, open }) {
  const query = data.workers.map((worker) => worker.gps).filter(Boolean).join(" ") || "Auckland New Zealand";
  return (
    <>
      <Hero page="workers" data={data} />
      <Panel title="GPS map" className="span8">
        <div className="cvxMap"><iframe title="Worker GPS" src={`https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`} loading="lazy" /></div>
      </Panel>
      <Panel title="Worker status" className="span4">
        <div className="cvxList compact">{data.workers.length ? data.workers.slice(0, 8).map((worker) => <Row key={worker.id} title={worker.name} meta={`${worker.status} · ${worker.job}`} tone="blue" onClick={() => open(worker)} />) : <Empty title="No workers yet" />}</div>
      </Panel>
      <Panel title="Proof and slips" className="span12">
        <div className="cvxTiles">{data.workers.length ? data.workers.map((worker) => <button key={worker.id} type="button" onClick={() => open(worker)}><b>{worker.name}</b><small>{worker.proof || "No proof yet"}</small><span>{worker.messages || "No worker message"}</span><em>{worker.timesheet || "No time"}</em></button>) : <Empty title="No proof yet" />}</div>
      </Panel>
    </>
  );
}

function MessagesPage({ data, open }) {
  const workerMessages = data.messages.filter((message) => /worker|internal/i.test(`${message.from} ${message.channel}`));
  const clientMessages = data.messages.filter((message) => /customer|client/i.test(`${message.from} ${message.channel}`));
  return (
    <>
      <Hero page="messages" data={data} />
      <Toolbar>
        <button type="button" onClick={() => open(blank("message", data))}>New message note</button>
        <button type="button" onClick={() => open(data.messages[0] || blank("message", data))}>Open drafted reply</button>
      </Toolbar>
      <Panel title="Worker messages" className="span4">
        <div className="cvxList compact">{workerMessages.length ? workerMessages.slice(0, 6).map((message) => <Row key={message.id} title={message.subject} meta={`${message.from} · ${message.priority}`} onClick={() => open(message)} />) : <Empty title="No worker messages" />}</div>
      </Panel>
      <Panel title="Client messages" className="span4">
        <div className="cvxList compact">{clientMessages.length ? clientMessages.slice(0, 6).map((message) => <Row key={message.id} title={message.subject} meta={`${message.client || message.from} · ${message.priority}`} onClick={() => open(message)} />) : <Empty title="No client messages" />}</div>
      </Panel>
      <Panel title="Drafted reply" className="span4"><Preview record={data.messages[0]} data={data} open={open} /></Panel>
    </>
  );
}

function QuotesPage({ data, open }) {
  const stages = ["Draft", "Ready", "Sent", "Accepted"];
  return (
    <>
      <Hero page="quotes" data={data} />
      <Toolbar>
        <button type="button" onClick={() => open(blank("quote", data))}>New quote</button>
        <button type="button" onClick={() => open(data.quotes[0] || blank("quote", data))}>Follow up</button>
        <button type="button" onClick={() => open(blank("job", data))}>Create job from quote</button>
      </Toolbar>
      <section className="cvxPipeline span12">
        {stages.map((stage) => {
          const rows = data.quotes.filter((quote) => String(quote.status).toLowerCase().includes(stage.toLowerCase()));
          return <div key={stage}><h3>{stage}</h3>{rows.length ? rows.slice(0, 4).map((quote) => <Row key={quote.id} title={quote.title} meta={`${quote.client} · ${money(quote.amount)}`} onClick={() => open(quote)} />) : <small>No records</small>}</div>;
        })}
      </section>
      <Panel title="Quote builder" className="span7"><Preview record={data.quotes[0]} data={data} open={open} /></Panel>
      <Panel title="Quote memory" className="span5"><div className="cvxRule"><b>Scope, price and follow-up stay together.</b><span>Accepted quote detail can become job detail without retyping the same admin.</span></div></Panel>
    </>
  );
}

function InvoicesPage({ data, open }) {
  const draft = data.invoices.filter((invoice) => /draft/i.test(invoice.status)).reduce((sum, item) => sum + item.amount, 0);
  const overdue = data.invoices.filter((invoice) => /overdue/i.test(invoice.status)).length;
  return (
    <>
      <Hero page="invoices" data={data} />
      <Kpis items={[["Draft value", money(draft)], ["Overdue", overdue, "red"], ["Paid", data.invoices.filter((invoice) => /paid/i.test(invoice.status)).length, "blue"], ["Guard", "Draft sync", "orange"]]} />
      <Toolbar>
        <button type="button" onClick={() => open(blank("invoice", data))}>New invoice draft</button>
        <button type="button" onClick={() => open(data.invoices[0] || blank("invoice", data))}>Review draft</button>
        <button type="button" onClick={() => downloadCsv("churvox-invoices.csv", data.invoices, [["Invoice", "number"], ["Client", "client"], ["Job", "job"], ["Amount", "amount"], ["Due", "due"], ["Status", "status"], ["Sync", "sync"]])}>Export invoices</button>
      </Toolbar>
      <Panel title="Invoice ledger" className="span8">
        <div className="cvxList">{data.invoices.length ? data.invoices.slice(0, 10).map((invoice) => <Row key={invoice.id} title={invoice.number} meta={`${invoice.client} · ${invoice.status} · ${invoice.sync}`} tag={money(invoice.amount)} onClick={() => open(invoice)} />) : <Empty title="No invoices yet" />}</div>
      </Panel>
      <Panel title="Accounting guardrails" className="span4 dark">
        <div className="cvxRule"><b>Draft sync only.</b><span>No automatic invoice sending. No tax filing. No bank payout files. Only mark paid after accounting refresh confirms paid.</span></div>
      </Panel>
    </>
  );
}

function TeamPage({ data, open }) {
  return (
    <>
      <Hero page="team" data={data} />
      <Toolbar>
        <button type="button" onClick={() => open(blank("worker", data))}>Add staff</button>
        <button type="button" onClick={() => open(data.workers[0] || blank("worker", data))}>Roles/access</button>
        <button type="button" onClick={() => downloadCsv("churvox-team.csv", data.workers, [["Name", "name"], ["Email", "email"], ["Phone", "phone"], ["Role", "role"], ["Access", "access"], ["Worker app", "app"]])}>Export team</button>
      </Toolbar>
      <Panel title="Staff records" className="span8">
        <div className="cvxTiles">{data.workers.length ? data.workers.map((worker) => <button key={worker.id} type="button" onClick={() => open(worker)}><b>{worker.name}</b><small>{worker.role} · {worker.app}</small><span>{worker.job}</span><em>{worker.payroll}</em></button>) : <Empty title="No staff yet" />}</div>
      </Panel>
      <Panel title="Payroll review" className="span4">
        <div className="cvxList compact">{data.workers.length ? data.workers.map((worker) => <Row key={worker.id} title={worker.name} meta={`${worker.timesheet || "No time"} · ${worker.payroll}`} onClick={() => open(worker)} />) : <Empty title="No payroll review" />}</div>
      </Panel>
    </>
  );
}

function PayrollPage({ data, open }) {
  return (
    <>
      <Hero page="payroll" data={data} />
      <Toolbar>
        <button type="button" onClick={() => downloadCsv("churvox-payroll-review.csv", data.workers, [["Worker", "name"], ["Timesheet", "timesheet"], ["Payroll status", "payroll"], ["Clock", "status"], ["Notes", "notes"]])}>Export payroll CSV</button>
      </Toolbar>
      <Panel title="Timesheet queue" className="span8">
        <div className="cvxList">{data.workers.length ? data.workers.map((worker) => <Row key={worker.id} title={worker.name} meta={`${worker.timesheet || "No time"} · ${worker.payroll}`} tag="Review" onClick={() => open(worker)} />) : <Empty title="No workers yet" />}</div>
      </Panel>
      <Panel title="Payroll guardrail" className="span4 dark">
        <div className="cvxRule"><b>Review only.</b><span>Churvox can prepare payroll review records and CSVs. It must not submit tax or create bank payout files.</span></div>
      </Panel>
    </>
  );
}

function XeroPage({ data, api, refresh, notify, open }) {
  const ready = data.invoices.filter((invoice) => /draft|ready|not synced|command/i.test(`${invoice.status} ${invoice.sync}`));

  async function disconnect() {
    const result = await api.post("/xero/disconnect", {});
    await refresh();
    notify(result?.success === false ? { title: "Xero disconnect failed", text: result.error || "Please try again.", tone: "bad" } : { title: "Xero disconnected", text: "Accounting handoff is now disconnected.", tone: "good" });
  }

  return (
    <>
      <Hero page="xero" data={data} />
      <Toolbar>
        <button type="button" onClick={() => { window.location.href = "/api/xero/connect/start"; }}>Connect Xero</button>
        <button type="button" onClick={disconnect}>Disconnect</button>
        <button type="button" onClick={refresh}>Refresh status</button>
      </Toolbar>
      <Panel title="Connection" className="span4">
        <div className="cvxMoney"><b>{data.xero.connected ? "Connected" : "Not connected"}</b><span>{data.xero.tenant_name || "Xero/MYOB status will show here."}</span></div>
      </Panel>
      <Panel title="Ready to sync" className="span8">
        <div className="cvxList">{ready.length ? ready.map((invoice) => <Row key={invoice.id} title={invoice.number} meta={`${invoice.client} · ${invoice.sync}`} tag={money(invoice.amount)} onClick={() => open(invoice)} />) : <Empty title="No sync queue" />}</div>
      </Panel>
      <Panel title="Guardrails" className="span12 dark">
        <div className="cvxRule"><b>Locked accounting safety.</b><span>Draft sync only, owner-approved. No automatic invoice sending, no tax filing, no bank payout files, and paid status only after accounting refresh confirms paid.</span></div>
      </Panel>
    </>
  );
}

function SettingsPage({ user, notify }) {
  const controls = ["Business branding", "GST", "Security", "Worker app rules", "CSV exports", "Delete account"];
  return (
    <>
      <Hero page="settings" data={{ jobs: [], clients: [], workers: [], quotes: [], invoices: [], messages: [], command: [], xero: {} }} />
      <Panel title="Business profile" className="span8">
        <div className="cvxFormGrid readonly">
          <Field def={{ name: "Business name", value: pick(user, "business_name", "company_name", "name") || "Not set" }} value={pick(user, "business_name", "company_name", "name") || "Not set"} readOnly />
          <Field def={{ name: "Email", value: pick(user, "business_email", "company_email", "email") || "Not set", type: "email" }} value={pick(user, "business_email", "company_email", "email") || "Not set"} readOnly />
          <Field def={{ name: "GST", value: pick(user, "gst_rate", "tax_rate") || "Not set" }} value={pick(user, "gst_rate", "tax_rate") || "Not set"} readOnly />
          <Field def={{ name: "Country", value: pick(user, "country") || "New Zealand" }} value={pick(user, "country") || "New Zealand"} readOnly />
        </div>
      </Panel>
      <Panel title="Controls" className="span4">
        <div className="cvxTiles">{controls.map((item) => <button key={item} type="button" onClick={() => notify({ title: item, text: "This control is kept in the clean Settings workspace.", tone: "good" })}><b>{item}</b><small>Control</small><span>Owner setting.</span><em>Open</em></button>)}</div>
      </Panel>
    </>
  );
}

function PlansPage({ api, notify }) {
  async function startCheckout(item, isAddon = false) {
    const payload = {
      plan: item.backendKey,
      plan_key: item.code,
      selected_plan: item.code,
      tier: item.backendKey,
      item_type: isAddon ? "addon" : "plan",
      addon: isAddon ? item.addonKey : undefined,
      addon_key: isAddon ? item.addonKey : undefined,
      plan_name: item.name,
      country: "NZ",
      billing_country: "NZ",
      currency: "NZD",
      billing_interval: "monthly",
      success_url: `${window.location.origin}/dashboard#plans?checkout=success&plan=${encodeURIComponent(item.code)}`,
      cancel_url: `${window.location.origin}/plans?checkout=cancelled&plan=${encodeURIComponent(item.code)}`,
    };
    const endpoints = isAddon ? ["/billing/addon/checkout", "/stripe/addon/checkout", "/billing/checkout", "/stripe/checkout", "/checkout/session", "/create-checkout-session"] : ["/billing/checkout", "/stripe/checkout", "/subscriptions/checkout", "/checkout/session", "/create-checkout-session"];
    try {
      const result = await firstGood(endpoints.map((endpoint) => () => api.post(endpoint, payload)));
      const body = result?.data || {};
      const url = body.url || body.checkout_url || body.session_url || body.checkoutSession?.url || body.data?.url;
      if (!url) throw new Error("Checkout URL missing");
      window.location.assign(url);
    } catch (error) {
      notify({ title: "Checkout is wired but blocked", text: error?.message || "The backend did not return a Stripe checkout URL.", tone: "bad" });
    }
  }

  return (
    <>
      <Hero page="plans" data={{ jobs: [], clients: [], workers: [], quotes: [], invoices: [], messages: [], command: [], xero: {} }} />
      <section className="cvxPlans span12">
        {PLAN_CARDS.map((plan) => (
          <article key={plan.name} className={plan.popular ? "popular" : ""}>
            {plan.popular ? <em>Most Popular</em> : null}
            <b>{plan.name}</b>
            <strong>${plan.price}</strong>
            <small>/month + GST</small>
            <p>{plan.note}</p>
            <span>{plan.fit}</span>
            <button type="button" onClick={() => startCheckout(plan)}>Start trial</button>
          </article>
        ))}
      </section>
      <section className="cvxAddons span12">
        {ADDONS.map((addon) => (
          <article key={addon.name}>
            <b>{addon.name}</b>
            <strong>${addon.price}</strong>
            <small>/month + GST</small>
            <p>{addon.note}</p>
            <button type="button" onClick={() => startCheckout(addon, true)}>Add to plan</button>
          </article>
        ))}
      </section>
    </>
  );
}

function SupportPage() {
  const guides = ["Setup help", "CSV import", "Worker app", "Billing", "Xero guardrails", "Approve in Command"];
  return (
    <>
      <Hero page="support" data={{ jobs: [], clients: [], workers: [], quotes: [], invoices: [], messages: [], command: [], xero: {} }} />
      <Panel title="Contact" className="span4">
        <h3>hello@churvox.com</h3>
        <p className="cvxPlain">Use this for setup help, beta feedback and support.</p>
      </Panel>
      <Panel title="Guides" className="span8">
        <div className="cvxTiles">{guides.map((item) => <button key={item} type="button"><b>{item}</b><small>Guide</small><span>Short practical help.</span><em>Open</em></button>)}</div>
      </Panel>
    </>
  );
}

function Page({ page, data, user, open, go, api, refresh, notify }) {
  if (page === "today") return <TodayPage data={data} open={open} go={go} />;
  if (page === "command") return <CommandPage data={data} open={open} />;
  if (page === "jobs") return <JobsPage data={data} open={open} />;
  if (page === "clients") return <ClientsPage data={data} open={open} api={api} refresh={refresh} notify={notify} />;
  if (page === "workers") return <WorkersPage data={data} open={open} />;
  if (page === "messages") return <MessagesPage data={data} open={open} />;
  if (page === "quotes") return <QuotesPage data={data} open={open} />;
  if (page === "invoices") return <InvoicesPage data={data} open={open} />;
  if (page === "team") return <TeamPage data={data} open={open} />;
  if (page === "payroll") return <PayrollPage data={data} open={open} />;
  if (page === "xero") return <XeroPage data={data} api={api} refresh={refresh} notify={notify} open={open} />;
  if (page === "settings") return <SettingsPage user={user} notify={notify} />;
  if (page === "plans") return <PlansPage api={api} notify={notify} />;
  return <SupportPage />;
}

export default function ProductAppV2() {
  const { user } = useAuth();
  const { api, data, loading, refresh } = useProductData();
  const [page, setPage] = React.useState(pageFromUrl);
  const [selected, setSelected] = React.useState(null);
  const [notice, setNotice] = React.useState(null);

  React.useEffect(() => {
    const sync = () => setPage(pageFromUrl());
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);

  React.useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(null), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const go = (nextPage) => {
    setPage(nextPage);
    setSelected(null);
    if (typeof window !== "undefined") window.history.replaceState({}, "", `/dashboard#${nextPage}`);
  };

  return (
    <main className="cvxProduct" data-product-version="v3">
      <Header page={page} user={user} go={go} />
      <Navigation page={page} go={go} />
      <section className="cvxWorkspace">
        <div className="cvxPage">
          {loading ? (
            <>
              <Hero page="today" data={data} />
              <Panel title="Loading workspace" className="span12"><Empty title="Loading Churvox" text="Getting the live business records." /></Panel>
            </>
          ) : (
            <Page page={page} data={data} user={user} open={setSelected} go={go} api={api} refresh={refresh} notify={setNotice} />
          )}
        </div>
      </section>
      <Drawer record={selected} data={data} api={api} onClose={() => setSelected(null)} refresh={refresh} notify={setNotice} />
      <Notice notice={notice} clear={() => setNotice(null)} />
    </main>
  );
}
