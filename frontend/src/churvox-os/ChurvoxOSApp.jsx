import React from "react";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
import "./churvoxOS.css";
import "./churvoxOSReadablePills.css";
import "./churvoxOSWiring.css";

const STORAGE_KEY = "churvox.os.command.state.v4";

const NAV = [
  { key: "hub", label: "Smart Hub", code: "SH", group: "Run" },
  { key: "command", label: "Command", code: "CM", group: "Run" },
  { key: "jobs", label: "Jobs", code: "JB", group: "Work" },
  { key: "clients", label: "Clients", code: "CL", group: "Work" },
  { key: "workers", label: "Workers", code: "WK", group: "Work" },
  { key: "quotes", label: "Quotes", code: "QT", group: "Money" },
  { key: "invoices", label: "Invoices", code: "IV", group: "Money" },
  { key: "messages", label: "Messages", code: "MS", group: "Admin" },
  { key: "team", label: "Team", code: "TM", group: "Admin" },
  { key: "xero", label: "Xero", code: "XR", group: "Admin" },
  { key: "settings", label: "Settings", code: "ST", group: "Control" },
  { key: "plans", label: "Plans", code: "PL", group: "Control" },
  { key: "help", label: "Help", code: "HP", group: "Control" },
];

const ALIASES = {
  "": "hub", dashboard: "hub", home: "hub", smart: "hub", today: "hub",
  calendar: "jobs", schedule: "jobs", dispatch: "jobs", recurring: "jobs",
  command: "command", askchurvox: "command", automation: "command",
  jobs: "jobs", clients: "clients", workers: "workers", worker: "workers", workerview: "workers",
  quotes: "quotes", invoices: "invoices", messages: "messages", inbox: "messages",
  team: "team", payroll: "team", xero: "xero", accounting: "xero", sync: "xero",
  settings: "settings", plans: "plans", help: "help", support: "help", guide: "help",
};

const EMPTY_DATA = {
  jobs: [],
  clients: [],
  workers: [],
  quotes: [],
  invoices: [],
  messages: [],
  team: [],
  aiActions: [],
  requests: [],
  xero: { connected: false, status: "not_connected" },
  activity: [],
};

const planRows = [
  { name: "Start", price: "$39/month + GST", tag: "Records", text: "Jobs, clients, quotes, invoices and recurring jobs for an owner starting clean." },
  { name: "Crew", price: "$89/month + GST", tag: "Field", text: "Worker view, proof, team messages and field records for a small crew." },
  { name: "Operator", price: "$149/month + GST", tag: "Most Popular", text: "Churvox prepares admin actions, follow-ups and owner attention items." },
  { name: "Command", price: "$299/month + GST", tag: "Approval OS", text: "Full approval desk, payroll review, higher capacity and accounting sync option." },
];

const featureMatrix = [
  ["Recurring inside Jobs", "Included", "Included", "Included", "Included"],
  ["Worker proof", "Owner records", "Included", "Included", "Included"],
  ["Prepared admin", "Manual", "Prompts", "Included", "Included"],
  ["Command desk", "View only", "View only", "Core", "Full"],
  ["Payroll review", "-", "-", "Review", "Included"],
  ["Accounting Sync Add-on", "$39/month + GST", "$39/month + GST", "$39/month + GST", "Included option"],
  ["Command Growth Pack", "-", "-", "-", "$99/month + GST"],
];

function normalise(value) {
  const key = String(value || "").replace(/^#/, "").replace(/^\//, "").trim().toLowerCase();
  return ALIASES[key] || (NAV.some((item) => item.key === key) ? key : "hub");
}

function idOf(record) {
  if (!record) return "";
  const raw = record.id || record._id || record.job_id || record.quote_id || record.invoice_id || record.user_id || "";
  if (typeof raw === "object") return String(raw.$oid || raw.oid || raw.id || raw._id || "");
  return String(raw || "");
}

function textOf(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
  }
  return "";
}

function listFrom(result, key) {
  const payload = result?.data ?? result;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (key && Array.isArray(payload?.[key])) return payload[key];
  for (const name of ["items", "records", "results", "jobs", "clients", "quotes", "invoices", "workers", "notifications", "actions", "requests"]) {
    if (Array.isArray(payload?.[name])) return payload[name];
  }
  return [];
}

function money(value) {
  const number = Number(value || 0);
  return number.toLocaleString("en-NZ", { style: "currency", currency: "NZD" });
}

function amountOf(record) {
  return Number(record?.amount || record?.total || record?.price || record?.subtotal || 0);
}

function dateLabel(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return String(value);
  }
}

function timeAgo(value) {
  if (!value) return "now";
  try {
    const diff = Date.now() - new Date(value).getTime();
    if (diff < 60000) return "now";
    if (diff < 3600000) return `${Math.max(1, Math.round(diff / 60000))}m`;
    if (diff < 86400000) return `${Math.round(diff / 3600000)}h`;
    return dateLabel(value);
  } catch {
    return String(value);
  }
}

function durationLabel(seconds) {
  const total = Number(seconds || 0);
  if (!total) return "-";
  const hours = Math.floor(total / 3600);
  const mins = Math.round((total % 3600) / 60);
  if (hours && mins) return `${hours}h ${mins}m`;
  if (hours) return `${hours}h`;
  return `${mins}m`;
}

function statusText(record, fallback = "Watching") {
  return textOf(record?.status, record?.job_status, record?.workflow_status, record?.stage, fallback).replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function jobTitle(job) {
  return textOf(job?.title, job?.job_title, job?.job_name, job?.description, job?.job_type, "Untitled job");
}

function clientName(record) {
  return textOf(record?.client_name, record?.customer_name, record?.name, record?.client?.name, record?.customer?.name, "No client saved");
}

function workerName(record) {
  return textOf(record?.assigned_worker_name, record?.worker_name, record?.worker?.name, record?.assigned_to_name, record?.assigned_worker_email, "Unassigned");
}

function proofLabel(record) {
  const photos = Array.isArray(record?.photos) ? record.photos.length : Array.isArray(record?.proof_photos) ? record.proof_photos.length : 0;
  const notes = Boolean(record?.worker_notes || record?.completion_notes || record?.proof_note || record?.worker_message);
  if (!photos && !notes) return "No proof yet";
  return `${photos} photo${photos === 1 ? "" : "s"}${notes ? " + note" : ""}`;
}

function recurringLabel(job) {
  if (job?.is_recurring || job?.recurring_frequency || job?.recurrence_pattern) return textOf(job?.recurring_frequency, job?.recurrence_pattern, "Recurring");
  return "One-off";
}

function laneForJob(job) {
  const status = String(job?.status || job?.job_status || "").toLowerCase();
  if (job?.is_recurring || job?.recurring_frequency) return "Recurring";
  if (job?.invoice_ready || job?.owner_approval_required) return "Admin prepared";
  if (Array.isArray(job?.photos) && job.photos.length) return "Proof";
  if (["in_progress", "paused", "acknowledged", "assigned"].includes(status)) return "Dispatch";
  return "Intake";
}

function normaliseJob(job) {
  const id = idOf(job);
  return {
    raw: job,
    id,
    title: jobTitle(job),
    client: clientName(job),
    worker: workerName(job),
    status: statusText(job, "Assigned"),
    recurring: recurringLabel(job),
    proof: proofLabel(job),
    time: durationLabel(job?.total_time_seconds || job?.timer_total_seconds || job?.shift_seconds),
    lane: laneForJob(job),
    admin: job?.invoice_ready || job?.owner_approval_required ? "Ready for Command" : "Watching",
    updated_at: job?.updated_at || job?.created_at || job?.scheduled_date,
  };
}

function normaliseClient(client, jobs = [], invoices = []) {
  const id = idOf(client);
  const relatedJobs = jobs.filter((job) => String(job.raw?.client_id || job.raw?.client || "") === id || job.client === clientName(client));
  const relatedInvoices = invoices.filter((invoice) => invoice.client === clientName(client));
  const value = relatedInvoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
  return {
    raw: client,
    id,
    name: clientName(client),
    tag: textOf(client?.tag, client?.status, relatedJobs.length ? "Active" : "Record"),
    jobs: relatedJobs.length || Number(client?.jobs || client?.job_count || 0),
    value: value || Number(client?.value || client?.lifetime_value || 0),
    note: textOf(client?.notes, client?.note, client?.address, "No notes saved yet."),
    email: textOf(client?.email),
    phone: textOf(client?.phone, client?.mobile),
    address: textOf(client?.address),
  };
}

function normaliseQuote(quote) {
  return {
    raw: quote,
    id: idOf(quote),
    title: textOf(quote?.title, quote?.job_description, quote?.description, `Quote - ${clientName(quote)}`),
    client: clientName(quote),
    stage: statusText(quote, "Draft"),
    amount: amountOf(quote),
    detail: textOf(quote?.notes, quote?.detail, quote?.status, "Quote record loaded from Churvox."),
  };
}

function normaliseInvoice(invoice) {
  return {
    raw: invoice,
    id: idOf(invoice),
    stage: statusText(invoice, "Draft"),
    name: textOf(invoice?.description, invoice?.invoice_number, invoice?.title, `Invoice - ${clientName(invoice)}`),
    client: clientName(invoice),
    amount: amountOf(invoice),
    note: textOf(invoice?.notes, invoice?.myob_sync_status, invoice?.xero_sync_status, "Invoice record loaded from Churvox."),
  };
}

function normaliseWorker(worker, index = 0, live = {}) {
  const name = textOf(worker?.name, worker?.full_name, worker?.worker_name, live?.worker_name, worker?.email, "Worker");
  const initials = name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "WK";
  const lat = Number(live?.last_lat || live?.gps_lat || live?.latitude || worker?.last_lat || worker?.gps_lat || worker?.latitude || 0);
  const lng = Number(live?.last_lng || live?.gps_lng || live?.longitude || worker?.last_lng || worker?.gps_lng || worker?.longitude || 0);
  const hasGps = Boolean(lat && lng);
  return {
    raw: worker,
    live,
    id: idOf(worker) || idOf(live) || `worker-${index}`,
    initials,
    name,
    job: textOf(live?.current_job_title, worker?.current_job, "No active job"),
    status: textOf(live?.live_status, live?.clock_status, worker?.status, worker?.workerApp, "Waiting"),
    time: durationLabel(live?.shift_seconds || live?.total_shift_seconds || worker?.payroll_seconds),
    proof: textOf(live?.proof_status, worker?.proof, "Proof waiting"),
    lat,
    lng,
    hasGps,
    gpsLabel: textOf(live?.gps_label, live?.last_gps_label, worker?.gps_label, "No GPS label"),
    x: 18 + (index % 4) * 19,
    y: 22 + (index % 3) * 20,
  };
}

function normaliseMessage(item) {
  return {
    raw: item,
    id: idOf(item),
    subject: textOf(item?.title, item?.subject, item?.type, "Notification"),
    audience: textOf(item?.audience, item?.source, item?.type, "Owner"),
    time: timeAgo(item?.created_at || item?.updated_at),
    detail: textOf(item?.message, item?.body, item?.summary, "No message body saved."),
    status: item?.read || item?.is_read ? "Read" : "Unread",
  };
}

function normaliseTeam(member, index = 0) {
  return {
    raw: member,
    id: idOf(member) || `team-${index}`,
    person: textOf(member?.name, member?.full_name, member?.email, "Team member"),
    role: textOf(member?.role, "Worker"),
    workerApp: textOf(member?.status, member?.worker_app_status, member?.active ? "Ready" : "Invite pending"),
    jobs: textOf(member?.jobs_access, member?.assigned_job_count, member?.completed_job_count, "Assigned"),
    clients: textOf(member?.clients_access, member?.role === "worker" ? "-" : "Full"),
    payroll: textOf(member?.payroll_status, member?.payroll_hours ? "Review" : "-"),
    xero: textOf(member?.xero_access, "-"),
  };
}

function useRoute() {
  const [page, setPage] = React.useState(() => {
    if (typeof window === "undefined") return "hub";
    return normalise(window.location.hash || window.localStorage?.getItem("churvox.os.page"));
  });
  React.useEffect(() => {
    const onHash = () => setPage(normalise(window.location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const navigate = React.useCallback((next) => {
    const target = normalise(next);
    setPage(target);
    if (typeof window !== "undefined") {
      window.localStorage?.setItem("churvox.os.page", target);
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${target}`);
    }
  }, []);
  return [page, navigate];
}

function useCommandState() {
  const [commandState, setCommandState] = React.useState(() => {
    if (typeof window === "undefined") return {};
    try { return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
  });
  React.useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(commandState)); } catch {}
  }, [commandState]);
  return [commandState, setCommandState];
}

function useRealOSData(api, commandState) {
  const [data, setData] = React.useState(EMPTY_DATA);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    const endpoints = [
      ["jobs", () => api.get("/jobs")],
      ["clients", () => api.get("/clients")],
      ["quotes", () => api.get("/quotes")],
      ["invoices", () => api.get("/invoices")],
      ["team", () => api.get("/team/workers")],
      ["live", () => api.get("/worker/live-status")],
      ["messages", () => api.get("/notifications")],
      ["actions", () => api.get("/ai/actions")],
      ["requests", () => api.get("/customer-requests")],
      ["xero", () => api.get("/xero/status")],
    ];
    const results = await Promise.allSettled(endpoints.map(([, fn]) => fn()));
    const byKey = Object.fromEntries(endpoints.map(([key], index) => [key, results[index]]));
    const ok = (key) => byKey[key]?.status === "fulfilled" && byKey[key].value?.success !== false;
    const value = (key) => ok(key) ? byKey[key].value : null;

    const jobs = listFrom(value("jobs"), "jobs").map(normaliseJob);
    const invoices = listFrom(value("invoices"), "invoices").map(normaliseInvoice);
    const clients = listFrom(value("clients"), "clients").map((client) => normaliseClient(client, jobs, invoices));
    const quotes = listFrom(value("quotes"), "quotes").map(normaliseQuote);
    const teamRows = listFrom(value("team"), "workers");
    const liveRows = listFrom(value("live"), "workers");
    const liveById = new Map(liveRows.map((row) => [String(row.worker_id || row.id || row.email || ""), row]));
    const team = teamRows.map((member, index) => normaliseTeam(member, index));
    const workers = (liveRows.length ? liveRows : teamRows).map((worker, index) => {
      const key = String(worker.worker_id || worker.id || worker._id || worker.email || "");
      return normaliseWorker(worker, index, liveById.get(key) || worker);
    });
    const messages = listFrom(value("messages"), "notifications").map(normaliseMessage);
    const aiActions = listFrom(value("actions"), "actions");
    const requests = listFrom(value("requests"), "requests");
    const xero = value("xero")?.data || { connected: false, status: "not_connected" };

    const activity = [
      ...jobs.slice(0, 5).map((job) => ({ id: `job-${job.id}`, time: timeAgo(job.updated_at), action: "Job", item: `${job.title} - ${job.status}` })),
      ...quotes.slice(0, 3).map((quote) => ({ id: `quote-${quote.id}`, time: "", action: "Quote", item: `${quote.title} - ${quote.stage}` })),
      ...invoices.slice(0, 3).map((invoice) => ({ id: `invoice-${invoice.id}`, time: "", action: "Invoice", item: `${invoice.name} - ${invoice.stage}` })),
      ...messages.slice(0, 3).map((message) => ({ id: `message-${message.id}`, time: message.time, action: "Message", item: message.subject })),
    ].slice(0, 10);

    setData({ jobs, clients, workers, quotes, invoices, messages, team, aiActions, requests, xero, activity });
    const failed = endpoints.filter(([key]) => byKey[key]?.status === "rejected" || byKey[key].value?.success === false).map(([key]) => key);
    if (failed.length) setError(`Some live modules could not load yet: ${failed.join(", ")}.`);
    setLoading(false);
  }, [api]);

  React.useEffect(() => { load(); }, [load]);

  return { data, loading, error, reload: load };
}

function stateFor(commandState, id) {
  return commandState?.[id] || { state: "open", edited: false, note: "" };
}

function shouldQueueStatus(text) {
  const value = String(text || "").toLowerCase();
  return ["draft", "ready", "prepared", "pending", "overdue", "review", "unread", "sync"].some((word) => value.includes(word));
}

function buildCommandQueue(data, commandState) {
  const items = [];
  data.aiActions.filter((action) => !["approved", "declined", "done"].includes(String(action.status || "").toLowerCase())).forEach((action) => items.push({
    id: `action:${idOf(action)}`,
    actionId: idOf(action),
    sourceType: textOf(action.recordType, action.record_type, "action"),
    sourceId: textOf(action.recordId, action.record_id),
    type: textOf(action.type, action.recordType, "Action"),
    title: textOf(action.title, action.actionKey, "Command action"),
    detail: textOf(action.ownerAuditNote, action.afterApproval, action.detail, "Real AI action waiting for owner review."),
    amount: textOf(action.notifyMode, action.status, "Pending"),
    evidence: ["Real AI action record", "Owner approval required", "Stored in Command queue"],
    source: "AI actions",
  }));
  data.quotes.filter((quote) => shouldQueueStatus(quote.stage)).forEach((quote) => items.push({
    id: `quote:${quote.id}`,
    sourceType: "quote",
    sourceId: quote.id,
    type: "Quote",
    title: quote.title,
    detail: quote.detail,
    amount: money(quote.amount),
    evidence: ["Quote record loaded", "No send from Quotes", "Owner decision happens here"],
    source: "Quote pipeline",
  }));
  data.invoices.filter((invoice) => shouldQueueStatus(invoice.stage)).forEach((invoice) => items.push({
    id: `invoice:${invoice.id}`,
    sourceType: "invoice",
    sourceId: invoice.id,
    type: "Invoice",
    title: invoice.name,
    detail: invoice.note,
    amount: money(invoice.amount),
    evidence: ["Invoice record loaded", "Draft/send/sync must be approved", "No tax or payout files"],
    source: "Money desk",
  }));
  data.messages.filter((message) => message.status === "Unread").forEach((message) => items.push({
    id: `message:${message.id}`,
    sourceType: "message",
    sourceId: message.id,
    type: "Message",
    title: message.subject,
    detail: message.detail,
    amount: message.time,
    evidence: ["Real notification", "No reply sent from Messages", "Owner sees it here"],
    source: "Notifications",
  }));
  data.requests.forEach((request) => items.push({
    id: `request:${idOf(request)}`,
    sourceType: "request",
    sourceId: idOf(request),
    type: "Request",
    title: textOf(request.service_needed, request.title, "Customer request"),
    detail: textOf(request.customer_name, request.message, "New customer request waiting for owner review."),
    amount: textOf(request.urgency, request.status, "New"),
    evidence: ["Customer request saved", "No job created automatically", "Owner decision happens here"],
    source: "Customer requests",
  }));
  return items.map((item) => ({ ...item, ...stateFor(commandState, item.id) })).filter((item) => item.state !== "approved");
}

function summarizeCommand(data, commandState) {
  const queue = buildCommandQueue(data, commandState);
  const counts = queue.reduce((acc, item) => {
    if (item.state !== "parked") acc.open += 1;
    acc.byType[item.type] = (acc.byType[item.type] || 0) + (item.state !== "parked" ? 1 : 0);
    if (item.state === "parked") acc.parked += 1;
    if (item.edited) acc.edited += 1;
    return acc;
  }, { open: 0, edited: 0, parked: 0, byType: {} });
  counts.queue = queue;
  return counts;
}

function escapeCsv(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadCsv(name, columns, rows) {
  if (typeof window === "undefined") return;
  const header = columns.map((column) => escapeCsv(column.label)).join(",");
  const body = rows.map((row) => columns.map((column) => escapeCsv(row[column.key])).join(",")).join("\n");
  const blob = new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') { cell += '"'; index += 1; continue; }
    if (char === '"') { quoted = !quoted; continue; }
    if (char === "," && !quoted) { row.push(cell); cell = ""; continue; }
    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell); rows.push(row); row = []; cell = ""; continue;
    }
    cell += char;
  }
  row.push(cell); rows.push(row);
  const [header = [], ...body] = rows.filter((item) => item.some((cellValue) => String(cellValue).trim()));
  const keys = header.map((item) => String(item).trim().toLowerCase().replace(/[^a-z0-9]+/g, "_"));
  return body.map((line) => Object.fromEntries(keys.map((key, index) => [key, String(line[index] || "").trim()])));
}

function EmptyState({ title, text }) {
  return <div className="emptyState"><b>{title}</b><span>{text}</span></div>;
}

function Sidebar({ page, onNavigate, summary, data }) {
  const nav = NAV.map((item) => {
    if (item.key === "command") return { ...item, count: summary.open };
    if (item.key === "messages") return { ...item, count: data.messages.filter((message) => message.status === "Unread").length };
    return item;
  });
  const groups = nav.reduce((acc, item) => { acc[item.group] = acc[item.group] || []; acc[item.group].push(item); return acc; }, {});
  return <aside className="osSidebar">
    <div className="osBrand"><div className="osLogo">C</div><div><strong>churvox</strong><span>Owner admin OS</span></div></div>
    {Object.entries(groups).map(([group, items]) => <nav className="osNavGroup" aria-label={group} key={group}><p>{group}</p>{items.map((item) => <button className={page === item.key ? "active" : ""} key={item.key} onClick={() => onNavigate(item.key)} type="button"><span className="navCode">{item.code}</span><span className="navLabel">{item.label}</span>{item.count ? <span className="navCount">{item.count}</span> : null}</button>)}</nav>)}
    <div className="osSystemCard"><b>Live records loaded</b><span>{data.jobs.length} jobs / {data.clients.length} clients / {data.workers.filter((worker) => worker.hasGps).length} GPS pings</span></div>
  </aside>;
}

function Topbar({ page, onAddWork, saving }) {
  const [text, setText] = React.useState("");
  const current = NAV.find((item) => item.key === page) || NAV[0];
  const submit = () => {
    const value = text.trim();
    if (!value) return;
    onAddWork(value);
    setText("");
  };
  return <header className="osTopbar"><div><span>Churvox OS</span><strong>{current.label}</strong></div><div className="osSearch"><span>Add real work</span><input value={text} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") submit(); }} placeholder="Type the job or request Churvox should create..." /><button type="button" onClick={submit} disabled={saving}>{saving ? "Adding..." : "Add work"}</button></div><div className="osOwner"><span>G'day</span><b>Owner</b></div></header>;
}

function CommandDock({ onNavigate, summary }) {
  return <aside className="commandDock"><div className="dockCore darkDock"><span className="kicker">Command approval desk</span><strong>{summary.open}</strong><p>waiting for owner</p><div className="dockBeacon" aria-hidden="true"><span /><span /><span /></div><button type="button" onClick={() => onNavigate("command")}>Open Command</button></div><div className="dockList darkDock"><b>Owner decisions live here</b>{["Quote", "Invoice", "Message"].map((label) => <p key={label}><span>{label}s</span><strong>{summary.byType[label] || 0}</strong></p>)}<p className="dockTotal"><span>Total waiting</span><strong>{summary.open}</strong></p></div></aside>;
}

function OSFrame({ page, navigate, data, summary, addWork, addBusy, children, dock = true }) {
  return <div className="churvoxOS"><Sidebar page={page} onNavigate={navigate} summary={summary} data={data} /><main className={dock ? "osWorkspace hasDock" : "osWorkspace"}><Topbar page={page} onAddWork={addWork} saving={addBusy} /><div className="osSurface">{children}</div></main>{dock ? <CommandDock onNavigate={navigate} summary={summary} /> : null}</div>;
}

function CsvTools({ type, label, rows, columns, onImport, status }) {
  return <div className="csvTools"><button type="button" onClick={() => downloadCsv(`churvox-${type}.csv`, columns, rows)}>Export {label} CSV</button><label className="csvImportLabel">Import {label} CSV<input accept=".csv,text/csv" type="file" onChange={(event) => { const file = event.target.files?.[0]; if (file) onImport(type, file); event.target.value = ""; }} /></label>{status ? <p className="csvStatus">{status}</p> : null}</div>;
}

function HubPage({ data, summary, onNavigate, loading, error }) {
  const adminRows = summary.queue.slice(0, 4);
  return <section className="hubPage"><div className="attentionPanel"><header><div><span className="kicker">Smart Hub</span><h1>Owner attention today.</h1></div><span className="livePill">Live</span></header>{loading ? <EmptyState title="Loading real business records" text="Churvox is asking the backend for jobs, clients, invoices, workers and Command actions." /> : error ? <EmptyState title="Some modules need attention" text={error} /> : null}<div className="flowBoard"><article><h2>Real work added<span>{data.jobs.length}</span></h2>{data.activity.slice(0, 4).map((item) => <p key={item.id}><small>{item.time}</small><b>{item.action}</b><span>{item.item}</span></p>)}{!data.activity.length ? <EmptyState title="No real work yet" text="Use Add work or import CSV records. Churvox will not invent jobs." /> : null}</article><article><h2>Admin prepared<span>{summary.queue.length}</span></h2>{adminRows.map((item) => <p key={item.id}><small>ready</small><b>{item.type}</b><span>{item.title}</span></p>)}{!adminRows.length ? <EmptyState title="No prepared admin" text="Drafts, unread messages and AI actions will appear here when they exist." /> : null}</article><article><h2>Sent to Command<span>{summary.open}</span></h2>{summary.queue.filter((item) => item.state !== "parked").slice(0, 4).map((item) => <p key={item.id}><small>queued</small><b>{item.type}</b><span>{item.amount}</span></p>)}{!summary.open ? <EmptyState title="Command clear" text="Nothing is waiting for the owner right now." /> : null}</article></div><div className="rulesStrip"><span>One approval place: Command</span><span>No auto-send</span><span>Draft sync only</span><span>Recurring inside Jobs</span></div></div><DispatchPanel jobs={data.jobs} onNavigate={onNavigate} /><MapPanel workers={data.workers} /><BottomConsole data={data} onNavigate={onNavigate} /></section>;
}

function DispatchPanel({ jobs, onNavigate }) {
  return <div className="dispatchPanel"><header><div><span className="kicker">Live dispatch board</span><h2>Field work Churvox is watching.</h2></div><button type="button" onClick={() => onNavigate("jobs")}>Open Jobs</button></header>{jobs.length ? <table><thead><tr><th>Job</th><th>Client</th><th>Worker</th><th>Status</th><th>Recurring</th><th>Proof</th><th>Time</th></tr></thead><tbody>{jobs.map((job) => <tr key={job.id}><td><b>#{job.id.slice(-6)}</b><span>{job.title}</span></td><td>{job.client}</td><td>{job.worker}</td><td><span className={`status ${job.status.toLowerCase().replace(/\s+/g, "-")}`}>{job.status}</span></td><td>{job.recurring}</td><td>{job.proof}</td><td>{job.time}</td></tr>)}</tbody></table> : <EmptyState title="No jobs loaded" text="Add work, import jobs, or create jobs from accepted quotes." />}</div>;
}

function MapPanel({ workers }) {
  const liveWorkers = workers.filter((worker) => worker.hasGps);
  return <div className="mapPanel"><header><span className="kicker">GPS map</span><b>Workers and proof</b></header><div className="fakeMap">{liveWorkers.length ? liveWorkers.map((worker, index) => <span className={`pin pin${(index % 4) + 1}`} key={worker.id} title={`${worker.name} - ${worker.gpsLabel}`}>{worker.initials}</span>) : <EmptyState title="No live GPS pings" text="Worker GPS appears after a worker app sends live status. Churvox is not drawing fake pins." />}</div></div>;
}

function BottomConsole({ data, onNavigate }) {
  return <div className="bottomConsole"><article className="clientMemory"><header><span className="kicker">Clients memory</span><button type="button" onClick={() => onNavigate("clients")}>Open</button></header>{data.clients.slice(0, 5).map((client) => <p key={client.id}><b>{client.name}</b><span>{client.tag}</span><small>{client.jobs} jobs</small><strong>{money(client.value)}</strong></p>)}{!data.clients.length ? <EmptyState title="No clients" text="Import client CSV or add clients from work." /> : null}</article><article className="moneyDesk"><header><span className="kicker">Money desk</span><button type="button" onClick={() => onNavigate("invoices")}>Open</button></header>{[["Quotes", data.quotes.length, data.quotes.reduce((sum, quote) => sum + Number(quote.amount || 0), 0)], ["Invoices", data.invoices.length, data.invoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0)]].map(([name, count, value]) => <p key={name}><b>{name}</b><span>{count}</span><strong>{money(value)}</strong></p>)}</article><article className="messagePrep"><header><span className="kicker">Messages</span><button type="button" onClick={() => onNavigate("messages")}>Open</button></header>{data.messages.slice(0, 5).map((message) => <p key={message.id}><b>{message.subject}</b><span>{message.audience}</span><small>{message.time}</small></p>)}{!data.messages.length ? <EmptyState title="No messages" text="Worker messages and notifications appear here." /> : null}</article><article className="teamMatrixMini"><header><span className="kicker">Team access matrix</span><button type="button" onClick={() => onNavigate("team")}>Open</button></header>{data.team.slice(0, 5).map((member) => <p key={member.id}><span>{member.person}</span><span>{member.jobs}</span><span>{member.clients}</span><span className={member.payroll === "-" ? "off" : ""}>{member.payroll}</span><span className={member.xero === "-" ? "off" : ""}>{member.xero}</span><span>{member.workerApp}</span></p>)}{!data.team.length ? <EmptyState title="No team" text="Add workers before field proof and GPS can go live." /> : null}</article><article className="xeroGuard"><header><span className="kicker">Accounting guardrails</span><button type="button" onClick={() => onNavigate("xero")}>Open</button></header>{[["Connection", data.xero.connected ? 1 : 0, data.xero.connected ? "Connected" : "Not connected"], ["Status", "", data.xero.status || "not connected"], ["Rule", "", "Draft sync only"], ["Owner", "", "Command decides"]].map(([name, count, value]) => <p key={name}><b>{name}</b><span>{count}</span><strong>{value}</strong></p>)}</article></div>;
}

function CommandPage({ data, summary, setApproval, busy }) {
  const [selectedId, setSelectedId] = React.useState(summary.queue[0]?.id || "");
  React.useEffect(() => { if (!summary.queue.find((item) => item.id === selectedId)) setSelectedId(summary.queue[0]?.id || ""); }, [summary.queue, selectedId]);
  const selected = summary.queue.find((item) => item.id === selectedId) || summary.queue[0];
  const [note, setNote] = React.useState(selected?.note || "");
  React.useEffect(() => { setNote(selected?.note || ""); }, [selected?.id, selected?.note]);
  if (!selected) return <section className="commandPage"><aside className="commandQueue"><span className="kicker">Command</span><h1>Approval desk clear.</h1><p className="emptyState">No real records need owner approval right now.</p></aside></section>;
  const approvedCount = Object.values(data.commandState || {}).filter((item) => item.state === "approved").length;
  return <section className="commandPage"><aside className="commandQueue"><span className="kicker">Command</span><h1>Approve the prepared admin.</h1><div className="queueStats"><b>Open {summary.open}</b><span>Edited {summary.edited}</span><span className="parkedCount">Parked {summary.parked}</span><span className="approvedCount">Approved {approvedCount}</span></div>{summary.queue.map((item) => <button className={`${selected.id === item.id ? "selected" : ""} ${item.state}`} key={item.id} onClick={() => setSelectedId(item.id)} type="button"><small>{item.type}</small><strong>{item.title}</strong><span>{item.detail}</span><em className={`sourceState ${item.state}`}>{item.edited ? "Edited" : item.state}</em></button>)}</aside><article className="decisionSlip"><header><span className="kicker">Prepared by Churvox</span><h2>{selected.title}</h2><strong>{selected.amount}</strong></header><div className="filledForm"><label>Real source<b>{selected.source}</b></label><label>What Churvox found<b>{selected.detail}</b></label><label>Guardrail<b>No auto-send. Owner approval happens here only.</b></label><label>Owner note<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional note for this approval" /></label></div><div className="commandActions"><button type="button" disabled={busy} onClick={() => setApproval(selected, "approved", note)}>Approve</button><button type="button" disabled={busy} onClick={() => setApproval(selected, "open", note, true)}>Save edit</button><button type="button" disabled={busy} onClick={() => setApproval(selected, "parked", note)}>Park</button></div></article><aside className="evidenceRail"><h3>Evidence</h3><p>Only real records are listed here. No demo slips.</p>{selected.evidence.map((text) => <div key={text}><b>{text}</b><span>{selected.type} evidence connected to this approval item.</span></div>)}</aside></section>;
}

function JobsPage({ data, onNavigate, csvStatus, onImport }) {
  const lanes = ["Intake", "Dispatch", "Recurring", "Proof", "Admin prepared"];
  return <section className="jobsPage"><header className="pageStatement"><span className="kicker">Jobs</span><h1>Dispatch board, recurring engine and proof trail in one place.</h1><p>Jobs are real records from the backend. Recurring stays here. Owner decisions go to Command.</p><CsvTools type="jobs" label="jobs" rows={data.jobs} columns={[{ key: "id", label: "id" }, { key: "title", label: "title" }, { key: "client", label: "client" }, { key: "worker", label: "worker" }, { key: "status", label: "status" }, { key: "recurring", label: "recurring" }, { key: "proof", label: "proof" }, { key: "time", label: "time" }]} onImport={onImport} status={csvStatus.jobs} /></header><div className="jobMachine">{lanes.map((lane) => <article key={lane}><header><b>{lane}</b><span>{lane === "Recurring" ? "Lives inside Jobs" : lane === "Admin prepared" ? "Goes to Command" : "Real records only"}</span></header>{data.jobs.filter((job) => lane === "Admin prepared" ? job.admin === "Ready for Command" : job.lane === lane).slice(0, 6).map((job) => <p key={`${lane}-${job.id}`}><strong>{job.title} - {job.client}</strong><small>{job.status} / {job.proof}</small></p>)}{!data.jobs.filter((job) => lane === "Admin prepared" ? job.admin === "Ready for Command" : job.lane === lane).length ? <EmptyState title="Empty" text="No real records in this lane." /> : null}</article>)}</div><div className="jobWorkbench"><article><span className="kicker">Selected work order</span>{data.jobs[0] ? <><h2>{data.jobs[0].title} - {data.jobs[0].client}</h2><dl>{[["Worker", data.jobs[0].worker], ["Proof", data.jobs[0].proof], ["Time", data.jobs[0].time], ["Recurring", data.jobs[0].recurring]].map(([term, value]) => <div key={term}><dt>{term}</dt><dd>{value}</dd></div>)}</dl></> : <EmptyState title="No selected job" text="Create or import the first real job." />}</article><aside><h3>Admin prepared from jobs</h3><p>Invoice, message and worker-gap decisions surface in Command when real records are ready.</p><button type="button" onClick={() => onNavigate("command")}>Open Command queue</button></aside></div></section>;
}

function ClientsPage({ data, csvStatus, onImport }) {
  const [selectedId, setSelectedId] = React.useState("");
  React.useEffect(() => { if (!selectedId && data.clients[0]) setSelectedId(data.clients[0].id); }, [data.clients, selectedId]);
  const selected = data.clients.find((client) => client.id === selectedId) || data.clients[0];
  return <section className="clientsPage"><aside className="clientIndex"><span className="kicker">Customer memory</span><h1>Client dossier.</h1><input placeholder="Search client, address, phone or note" readOnly />{data.clients.map((client) => <button className={client.id === selected?.id ? "active" : ""} key={client.id} onClick={() => setSelectedId(client.id)} type="button"><b>{client.name}</b><span>{client.tag} - {client.jobs} jobs - {money(client.value)}</span></button>)}{!data.clients.length ? <EmptyState title="No clients" text="Import client CSV or add clients from real work." /> : null}</aside><article className="clientDossier"><header><span className="kicker">Selected client</span>{selected ? <><h2>{selected.name}</h2><p>{selected.note}</p></> : <EmptyState title="No selected client" text="No client record exists yet." />}<CsvTools type="clients" label="clients" rows={data.clients} columns={[{ key: "name", label: "name" }, { key: "email", label: "email" }, { key: "phone", label: "phone" }, { key: "address", label: "address" }, { key: "note", label: "note" }]} onImport={onImport} status={csvStatus.clients} /></header>{selected ? <div className="dossierGrid">{[["Service memory", selected.note], ["Price memory", `Lifetime value ${money(selected.value)}`], ["Contact", `${selected.email || "No email"} / ${selected.phone || "No phone"}`], ["Risk check", "No send or sync happens from this page."]].map(([title, text]) => <div key={title}><b>{title}</b><span>{text}</span></div>)}</div> : null}</article><aside className="clientTimeline"><h3>Working trail</h3>{data.jobs.filter((job) => selected && job.client === selected.name).slice(0, 8).map((job) => <p key={job.id}>{job.title} / {job.status}</p>)}{selected && !data.jobs.filter((job) => job.client === selected.name).length ? <EmptyState title="No job trail" text="No jobs linked to this client yet." /> : null}</aside></section>;
}

function WorkersPage({ data }) {
  const liveWorkers = data.workers.filter((worker) => worker.hasGps);
  return <section className="workersPage"><div className="fieldMap"><header><span className="kicker">Workers</span><h1>Live field, GPS and proof command view.</h1></header><div className="mapCanvas">{liveWorkers.map((worker) => <button className="mapWorker" style={{ left: `${worker.x}%`, top: `${worker.y}%` }} key={worker.id} type="button"><b>{worker.initials}</b><span>{worker.name}</span><small>{worker.gpsLabel} / {worker.status}</small></button>)}{!liveWorkers.length ? <EmptyState title="No live GPS yet" text="GPS appears here only after worker app live-ping or shift tracking sends location. No pretend worker locations are shown." /> : null}</div></div><aside className="proofStack"><span className="kicker">Proof pack</span><h2>Photos, notes, time and GPS feed Command.</h2>{data.workers.map((worker) => <p key={worker.id}><b>{worker.initials} {worker.name}</b><span>{worker.job}</span><small>{worker.status} - {worker.time} - {worker.hasGps ? worker.gpsLabel : "GPS waiting"}</small></p>)}{!data.workers.length ? <EmptyState title="No workers" text="Add team members before field proof and GPS can be live." /> : null}</aside></section>;
}

function QuotesPage({ data, onNavigate }) {
  const lanes = ["Draft", "Sent", "Viewed", "Follow-Up Ready", "Accepted"];
  return <section className="quotesPage"><header className="pageStatement"><span className="kicker">Quotes</span><h1>Offer pipeline without approval clutter.</h1><p>Quotes are real records. Prepared decisions are surfaced in Command.</p></header><div className="offerTrack">{lanes.map((lane) => <article key={lane}><b>{lane}</b>{data.quotes.filter((quote) => quote.stage.toLowerCase() === lane.toLowerCase()).map((quote) => <p key={quote.id}><span>{quote.title}</span><small>{shouldQueueStatus(quote.stage) ? "Prepared for Command" : "Real quote record"}</small></p>)}{!data.quotes.filter((quote) => quote.stage.toLowerCase() === lane.toLowerCase()).length ? <EmptyState title="Empty" text="No real quote in this stage." /> : null}</article>)}</div><aside className="pipelinePrep"><h2>Prepared quote work</h2><p>Client memory, pricing notes and follow-up wording are collected before anything goes out.</p><button type="button" onClick={() => onNavigate("command")}>Open Command queue</button></aside></section>;
}

function InvoicesPage({ data, onNavigate, csvStatus, onImport }) {
  return <section className="invoicesPage"><header className="moneyHeader"><span className="kicker">Invoices</span><h1>Money desk.</h1><p>Invoices are real records. Sending and sync decisions stay in Command.</p><CsvTools type="invoices" label="invoices" rows={data.invoices} columns={[{ key: "stage", label: "stage" }, { key: "name", label: "name" }, { key: "client", label: "client" }, { key: "amount", label: "amount" }, { key: "note", label: "note" }]} onImport={onImport} status={csvStatus.invoices} /></header><div className="invoiceLedger">{data.invoices.map((invoice) => <article key={invoice.id}><span>{invoice.stage}</span><b>{invoice.name}</b><strong>{money(invoice.amount)}</strong><small>{invoice.note}</small></article>)}{!data.invoices.length ? <EmptyState title="No invoices" text="Create invoices from jobs or import invoice CSV rows." /> : null}</div><aside className="moneyControl"><h2>Prepared, not sent.</h2><p>Churvox can prepare line items, proof checks and reminders, but the owner uses Command for the decision.</p><button type="button" onClick={() => onNavigate("command")}>Open Command queue</button></aside></section>;
}

function MessagesPage({ data, onNavigate }) {
  return <section className="messagesPage"><header className="messageHeader"><span className="kicker">Messages</span><h1>Prepared replies, not another inbox.</h1><p>Messages are real notifications and worker/customer signals. Nothing leaves from here.</p></header><div className="replyBoard">{data.messages.map((message) => <article key={message.id}><span>{message.audience}</span><b>{message.subject}</b><p>{message.detail}</p><small>{message.time} / {message.status}</small></article>)}{!data.messages.length ? <EmptyState title="No messages" text="Worker messages, proof notes and notifications will appear here." /> : null}</div><aside className="messageGuard"><h2>Nothing sends without owner approval.</h2><button type="button" onClick={() => onNavigate("command")}>Open Command queue</button></aside></section>;
}

function TeamPage({ data, csvStatus, onImport }) {
  return <section className="teamPage"><header className="pageStatement"><span className="kicker">Team</span><h1>Access, payroll review and worker app readiness.</h1><p>Team is loaded from real worker records. Each row shows what the person can do.</p><CsvTools type="team" label="team" rows={data.team} columns={[{ key: "person", label: "person" }, { key: "role", label: "role" }, { key: "workerApp", label: "worker_app" }, { key: "jobs", label: "jobs" }, { key: "clients", label: "clients" }, { key: "payroll", label: "payroll" }, { key: "xero", label: "xero" }]} onImport={onImport} status={csvStatus.team} /></header><table className="teamMatrix"><thead><tr><th>Person</th><th>Role</th><th>Worker app</th><th>Jobs</th><th>Clients</th><th>Payroll</th><th>Xero</th></tr></thead><tbody>{data.team.map((row) => <tr key={row.id}><td>{row.person}</td><td>{row.role}</td><td>{row.workerApp}</td><td>{row.jobs}</td><td>{row.clients}</td><td>{row.payroll}</td><td>{row.xero}</td></tr>)}</tbody></table>{!data.team.length ? <EmptyState title="No team rows" text="Add workers or import team CSV." /> : null}<aside className="teamRail"><h2>Admin gaps Churvox watches</h2><p>Missing invite, worker app access, payroll changes and role risks are surfaced as owner attention.</p></aside></section>;
}

function XeroPage({ data }) {
  const rules = [["Connection", data.xero.connected ? "Connected" : "Not connected"], ["Draft invoice sync only", "No automatic invoice sending."], ["Payment refresh", "Only mark paid after accounting confirms paid."], ["No tax filing", "Churvox does not submit to government."], ["No payout files", "No bank payout files are created."], ["Owner approval", "Command remains the decision point."]];
  return <section className="xeroPage"><div className="xeroStatement"><span className="kicker">Xero</span><h1>Draft sync guardrails.</h1><p>Accounting status is loaded from the backend. Command decides what moves.</p></div><div className="guardrailGrid">{rules.map(([title, text]) => <article key={title}><b>{title}</b><p>{text}</p></article>)}</div></section>;
}

function ControlPage({ title, subtitle, children, items }) {
  return <section className="controlPage"><header className="controlHeader"><span className="kicker">Control</span><h1>{title}</h1><p>{subtitle}</p>{children}</header><div className="controlGrid">{items.map(([name, text, action]) => <article key={name}><b>{name}</b><p>{text}</p>{action ? <button type="button" onClick={action}>Open</button> : null}</article>)}</div></section>;
}

function SettingsPage({ data, csvStatus, onImport, user }) {
  return <ControlPage title="Settings" subtitle="Business controls grouped by what the owner actually needs." items={[["Business identity", user?.business_name || user?.email || "Current account loaded."], ["Invoice defaults", "Use the invoice settings and GST controls already connected in the app."], ["Approval rules", "Command is the one approval place. Other pages watch and prepare."], ["Account safety", "Password, sessions, delete account and data controls stay in account settings."], ["Notifications", "Owner prompts, worker alerts and quiet hours are loaded from notifications."]]}> <CsvTools type="clients" label="clients" rows={data.clients} columns={[{ key: "name", label: "name" }, { key: "email", label: "email" }, { key: "phone", label: "phone" }, { key: "address", label: "address" }, { key: "note", label: "note" }]} onImport={onImport} status={csvStatus.clients} /><CsvTools type="team" label="team" rows={data.team} columns={[{ key: "person", label: "person" }, { key: "role", label: "role" }, { key: "workerApp", label: "worker_app" }, { key: "jobs", label: "jobs" }, { key: "clients", label: "clients" }, { key: "payroll", label: "payroll" }, { key: "xero", label: "xero" }]} onImport={onImport} status={csvStatus.team} /></ControlPage>;
}

function HelpPage() { return <ControlPage title="Help" subtitle="Fast paths for setup, workers, accounting and launch checks." items={[["Setup check", "Use Settings, Plans, Team, Jobs and Xero to finish real setup."], ["Worker guide", "Workers acknowledge jobs, record time, send GPS live status and add proof from the worker app."], ["Accounting guide", "Draft sync, exports and payment status guardrails. No tax filing or payout files."], ["Contact support", "Use hello@churvox.com when something blocks launch."], ["Tester readiness", "Create one client, one job, one worker and one invoice before inviting testers."]]} />; }

function PlansPage() {
  return <section className="plansPage"><header className="plansHeader"><span className="kicker">Plans</span><h1>Simple tiers. Clear admin power.</h1><p>Pricing stays fixed. Each tier shows what actually unlocks.</p></header><div className="planCards">{planRows.map((plan) => <article className={plan.name === "Operator" ? "popular" : ""} key={plan.name}><span>{plan.tag}</span><h2>{plan.name}</h2><strong>{plan.price}</strong><p>{plan.text}</p></article>)}</div><div className="planMatrix"><table><thead><tr><th>Feature</th><th>Start</th><th>Crew</th><th>Operator</th><th>Command</th></tr></thead><tbody>{featureMatrix.map((row) => <tr key={row[0]}>{row.map((cell) => <td key={`${row[0]}-${cell}`}>{cell}</td>)}</tr>)}</tbody></table></div></section>;
}

function Page({ page, data, summary, setApproval, commandBusy, onNavigate, csvStatus, onImport, loading, error, user }) {
  if (page === "command") return <CommandPage data={data} summary={summary} setApproval={setApproval} busy={commandBusy} />;
  if (page === "jobs") return <JobsPage data={data} onNavigate={onNavigate} csvStatus={csvStatus} onImport={onImport} />;
  if (page === "clients") return <ClientsPage data={data} csvStatus={csvStatus} onImport={onImport} />;
  if (page === "workers") return <WorkersPage data={data} />;
  if (page === "quotes") return <QuotesPage data={data} onNavigate={onNavigate} />;
  if (page === "invoices") return <InvoicesPage data={data} onNavigate={onNavigate} csvStatus={csvStatus} onImport={onImport} />;
  if (page === "messages") return <MessagesPage data={data} onNavigate={onNavigate} />;
  if (page === "team") return <TeamPage data={data} csvStatus={csvStatus} onImport={onImport} />;
  if (page === "xero") return <XeroPage data={data} />;
  if (page === "settings") return <SettingsPage data={data} csvStatus={csvStatus} onImport={onImport} user={user} />;
  if (page === "plans") return <PlansPage />;
  if (page === "help") return <HelpPage />;
  return <HubPage data={data} summary={summary} onNavigate={onNavigate} loading={loading} error={error} />;
}

export default function ChurvoxOSApp() {
  const api = useApi();
  const { user } = useAuth();
  const [page, navigate] = useRoute();
  const [commandState, setCommandState] = useCommandState();
  const { data: loadedData, loading, error, reload } = useRealOSData(api, commandState);
  const data = React.useMemo(() => ({ ...loadedData, commandState }), [loadedData, commandState]);
  const [csvStatus, setCsvStatus] = React.useState({});
  const [addBusy, setAddBusy] = React.useState(false);
  const [commandBusy, setCommandBusy] = React.useState(false);
  const summary = React.useMemo(() => summarizeCommand(data, commandState), [data, commandState]);

  const addWork = React.useCallback(async (text) => {
    setAddBusy(true);
    try {
      const res = await api.post("/jobs", { title: text, job_type: "other", customer_name: "To confirm", address: "To confirm", scheduled_date: new Date().toISOString(), notes: "Added from Churvox OS. Confirm client, address, worker and price before sending anything." });
      if (res?.success === false) throw new Error(res.error || "Add work failed");
      await reload();
      navigate("jobs");
    } catch (err) {
      setCsvStatus((current) => ({ ...current, jobs: err?.message || "Could not add real work yet." }));
    } finally {
      setAddBusy(false);
    }
  }, [api, reload, navigate]);

  const setApproval = React.useCallback(async (item, state, note, edited = false) => {
    setCommandBusy(true);
    try {
      if (state === "approved") {
        if (item.actionId) await api.post(`/ai/actions/${item.actionId}/approve`, { note });
        else if (item.sourceType === "quote") await api.post(`/quotes/${item.sourceId}/send`, { note });
        else if (item.sourceType === "invoice") await api.patch(`/invoices/${item.sourceId}`, { status: "sent", notes: note || item.detail });
        else if (item.sourceType === "request") await api.patch(`/customer-requests/${item.sourceId}`, { status: "Owner approved", owner_note: note });
      }
      if (state === "parked" && item.actionId) await api.post(`/ai/actions/${item.actionId}/decline`, { note: note || "Parked by owner" });
      setCommandState((current) => ({ ...current, [item.id]: { state, note, edited: edited || current[item.id]?.edited || false, updated_at: new Date().toISOString() } }));
      await reload();
    } catch (err) {
      setCommandState((current) => ({ ...current, [item.id]: { state: "open", note: err?.message || "Backend action failed. Record not changed.", edited: true, updated_at: new Date().toISOString() } }));
    } finally {
      setCommandBusy(false);
    }
  }, [api, reload, setCommandState]);

  const importCsv = React.useCallback((type, file) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const rows = parseCsv(String(reader.result || ""));
      let imported = 0;
      let failed = 0;
      setCsvStatus((current) => ({ ...current, [type]: `Importing ${rows.length} ${type} row(s)...` }));
      for (const row of rows) {
        try {
          if (type === "clients") await api.post("/clients", { name: row.name || row.client || "Imported client", email: row.email || null, phone: row.phone || row.mobile || null, address: row.address || null, notes: row.note || row.notes || null });
          else if (type === "jobs") await api.post("/jobs", { title: row.title || row.job || "Imported job", job_type: row.job_type || "other", customer_name: row.client || row.customer_name || "Imported client", address: row.address || "To confirm", scheduled_date: row.scheduled_date || row.date || new Date().toISOString(), price: Number(String(row.price || row.amount || 0).replace(/[^0-9.-]/g, "")) || 0, notes: row.note || row.notes || "Imported from CSV", is_recurring: /yes|true|weekly|fortnightly|monthly/i.test(row.recurring || ""), recurring_frequency: row.recurring_frequency || (/monthly/i.test(row.recurring || "") ? "monthly" : /fortnight/i.test(row.recurring || "") ? "fortnightly" : /week/i.test(row.recurring || "") ? "weekly" : null) });
          else if (type === "invoices") await api.post("/invoices", { customer_name: row.client || row.customer_name || "Imported client", customer_email: row.email || null, address: row.address || "", description: row.name || row.description || row.invoice || "Imported invoice", subtotal: Number(String(row.amount || row.subtotal || row.total || 0).replace(/[^0-9.-]/g, "")) || 0, notes: row.note || row.notes || "Imported from CSV" });
          else if (type === "team") await api.post("/team/workers", { name: row.person || row.name || "Imported worker", email: row.email || `worker-${Date.now()}-${imported}@example.invalid`, phone: row.phone || null });
          imported += 1;
        } catch {
          failed += 1;
        }
      }
      await reload();
      setCsvStatus((current) => ({ ...current, [type]: `${imported} imported, ${failed} failed. All rows were sent to real backend endpoints.` }));
    };
    reader.readAsText(file);
  }, [api, reload]);

  return <OSFrame page={page} navigate={navigate} data={data} summary={summary} addWork={addWork} addBusy={addBusy} dock={page !== "command"}><Page page={page} data={data} summary={summary} setApproval={setApproval} commandBusy={commandBusy} onNavigate={navigate} csvStatus={csvStatus} onImport={importCsv} loading={loading} error={error} user={user} /></OSFrame>;
}
