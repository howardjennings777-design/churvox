import React from "react";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
import "./productApp.css";

const NAV = [
  ["today", "Today"],
  ["command", "Command"],
  ["jobs", "Jobs"],
  ["clients", "Clients"],
  ["quotes", "Quotes"],
  ["invoices", "Invoices"],
  ["messages", "Messages"],
  ["team", "Team"],
  ["payroll", "Payroll"],
  ["workers", "Workers"],
  ["xero", "Xero"],
  ["settings", "Settings"],
  ["plans", "Plans"],
  ["support", "Support"],
];

const PAGE_COPY = {
  today: ["Run the day without chasing admin.", "Jobs, workers, money, messages and owner checks in one clean control room."],
  command: ["Approve, edit or park. Nothing else.", "Command is the only place for owner decisions. Other pages are record workspaces."],
  jobs: ["Jobs are the run sheet.", "Schedule, worker, price, repeat, proof and job notes are handled here."],
  clients: ["Clients are memory.", "Contact details, site notes, access, prices and linked history stay together."],
  quotes: ["Quotes are a pipeline.", "Drafts, follow-ups, accepted quotes and convert-to-job work are easy to see."],
  invoices: ["Invoices are money control.", "Draft, due, overdue, paid and accounting status are separated clearly."],
  messages: ["Messages become actions.", "Worker notes and client replies can be drafted, then approved in Command."],
  team: ["Team is access and people.", "Staff, subcontractors, roles, app state and job visibility live here."],
  payroll: ["Payroll is review only.", "Timesheets and slips are reviewed here. No tax filing. No payout files."],
  workers: ["Workers show the field.", "GPS, proof, live job status, worker messages and slips are visible here."],
  xero: ["Accounting stays guarded.", "Draft sync only. Owner-approved. No tax filing or payout files."],
  settings: ["Business controls without clutter.", "Branding, GST, worker rules, exports and security controls live here."],
  plans: ["Locked Churvox pricing.", "Plans stay clear, consistent and matched to checkout."],
  support: ["Help when the owner needs it.", "Setup help, guides and contact details are kept practical."],
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
  commandAction: ["Approve", "Save edit", "Park"],
};

const currency = new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 });

function keyOf(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function pageFromUrl() {
  if (typeof window === "undefined") return "today";
  const raw = (window.location.hash || window.location.pathname.split("/")[1] || "").replace(/^#/, "");
  const key = keyOf(raw);
  const aliases = {
    "": "today",
    dashboard: "today",
    aiguide: "today",
    guide: "today",
    setupassistant: "today",
    firstrun: "today",
    smart: "today",
    hub: "today",
    help: "support",
    inbox: "messages",
    message: "messages",
    time: "payroll",
    dispatch: "workers",
    routes: "workers",
    calendar: "workers",
    schedule: "workers",
    map: "workers",
    accounting: "xero",
    sync: "xero",
    reports: "invoices",
  };
  const navKeys = NAV.map(([id]) => id);
  return aliases[key] || (navKeys.includes(key) ? key : "today");
}

function pick(obj, ...keys) {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
  }
  return "";
}

function listFrom(payload, key) {
  const data = payload?.data?.data ?? payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (key && Array.isArray(data?.[key])) return data[key];
  for (const name of ["items", "records", "results", "jobs", "clients", "quotes", "invoices", "workers", "team", "messages", "actions", "data"]) {
    if (Array.isArray(data?.[name])) return data[name];
  }
  return [];
}

function idOf(record) {
  const raw = record?.id || record?._id || record?.job_id || record?.client_id || record?.quote_id || record?.invoice_id || record?.message_id || record?.user_id || "";
  if (typeof raw === "object") return String(raw.$oid || raw.oid || raw.id || raw._id || "");
  return String(raw || "");
}

function money(value) {
  return currency.format(Number(value || 0));
}

function unique(values, fallback = []) {
  const seen = new Set();
  const out = [];
  [...values, ...fallback].forEach((value) => {
    const label = String(value || "").trim();
    if (!label || seen.has(label.toLowerCase())) return;
    seen.add(label.toLowerCase());
    out.push(label);
  });
  return out.length ? out : fallback;
}

function normaliseStatus(value) {
  const raw = String(value || "").toLowerCase();
  if (/complete|done|paid/.test(raw)) return "Completed";
  if (/progress|active|started/.test(raw)) return "In progress";
  if (/block|issue|hold|missing|check/.test(raw)) return "Needs check";
  return value || "Ready";
}

function normalise(rows, type) {
  return rows.map((row, index) => {
    const id = idOf(row) || `${type}-${index}`;
    if (type === "jobs") return {
      ...row,
      id,
      type: "job",
      title: pick(row, "title", "job_title", "job_name", "name", "description") || `Job ${index + 1}`,
      client: pick(row, "client_name", "customer_name", "client") || "No client",
      worker: pick(row, "assigned_worker_name", "worker_name", "worker") || "Unassigned",
      status: normaliseStatus(row.status || row.job_status),
      date: pick(row, "scheduled_date", "date", "start_date"),
      time: pick(row, "scheduled_time", "start_time", "time"),
      price: Number(row.price ?? row.amount ?? row.total ?? 0),
      address: pick(row, "address", "site_address"),
      service: pick(row, "service", "service_type") || "Other",
      recurring: pick(row, "recurring", "frequency") || "One-off",
      billing: pick(row, "billing", "billing_type") || "Fixed price",
      proof: pick(row, "proof", "photo_status"),
      notes: pick(row, "notes", "description"),
      issue: pick(row, "issue", "problem", "needs_attention"),
    };
    if (type === "clients") return {
      ...row,
      id,
      type: "client",
      name: pick(row, "name", "client_name", "customer_name") || `Client ${index + 1}`,
      phone: pick(row, "phone", "mobile"),
      email: pick(row, "email"),
      address: pick(row, "address", "site_address"),
      service: pick(row, "service", "preferred_service"),
      price: pick(row, "price", "saved_price"),
      schedule: pick(row, "schedule", "preferred_schedule"),
      notes: pick(row, "notes", "access_notes"),
    };
    if (type === "workers") return {
      ...row,
      id,
      type: "worker",
      name: pick(row, "name", "full_name", "email") || `Worker ${index + 1}`,
      email: pick(row, "email"),
      phone: pick(row, "phone", "mobile"),
      role: pick(row, "role") || "Worker",
      access: pick(row, "access", "role") || "Worker app",
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
    if (type === "quotes") return {
      ...row,
      id,
      type: "quote",
      title: pick(row, "title", "quote_title", "description") || `Quote ${index + 1}`,
      client: pick(row, "client_name", "customer_name", "client") || "No client",
      amount: Number(row.amount ?? row.total ?? row.price ?? 0),
      status: pick(row, "status") || "Draft",
      scope: pick(row, "scope", "description"),
      terms: pick(row, "terms"),
      followUp: pick(row, "follow_up", "followUp"),
      next: pick(row, "next_step", "next"),
    };
    if (type === "invoices") return {
      ...row,
      id,
      type: "invoice",
      number: pick(row, "number", "invoice_number") || `Invoice ${index + 1}`,
      client: pick(row, "client_name", "customer_name", "client") || "No client",
      job: pick(row, "job_title", "job"),
      amount: Number(row.amount ?? row.total ?? 0),
      due: pick(row, "due_date", "due"),
      status: pick(row, "status") || "Draft",
      sync: pick(row, "sync", "accounting_status", "xero_status") || "Not synced",
      line: pick(row, "line_item", "description"),
      evidence: pick(row, "evidence", "proof"),
    };
    if (type === "messages") return {
      ...row,
      id,
      type: "message",
      from: pick(row, "from", "sender", "source") || "Unknown",
      subject: pick(row, "subject", "title") || "Message",
      detail: pick(row, "detail", "body", "message"),
      draft: pick(row, "draft", "drafted_reply"),
      client: pick(row, "client_name", "client"),
      job: pick(row, "job_title", "job"),
      priority: pick(row, "priority") || "Normal",
      channel: pick(row, "channel") || "Internal",
    };
    return {
      ...row,
      id,
      type: "approval",
      approvalType: pick(row, "type", "kind", "action_type") || "Approval",
      title: pick(row, "title", "record_title", "summary") || "Approval item",
      status: pick(row, "status", "state") || "Waiting",
      owner: pick(row, "owner", "recommended_action", "action") || "Approve",
      client: pick(row, "client", "client_name", "customer_name"),
      amount: Number(row.amount ?? row.total ?? 0),
      filled: pick(row, "filled", "summary", "what_churvox_filled"),
      evidence: pick(row, "evidence", "proof", "evidence_checked"),
      check: pick(row, "check", "owner_check"),
    };
  });
}

function useProductData() {
  const api = useApi();
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState({ jobs: [], clients: [], workers: [], quotes: [], invoices: [], messages: [], command: [], xero: {} });

  React.useEffect(() => {
    let mounted = true;
    async function load() {
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
      if (!mounted) return;
      const xero = results[7]?.value?.data?.data || results[7]?.value?.data || results[7]?.value || {};
      setData({
        jobs: normalise(listFrom(results[0]?.value, "jobs"), "jobs"),
        clients: normalise(listFrom(results[1]?.value, "clients"), "clients"),
        workers: normalise(listFrom(results[2]?.value, "team"), "workers"),
        quotes: normalise(listFrom(results[3]?.value, "quotes"), "quotes"),
        invoices: normalise(listFrom(results[4]?.value, "invoices"), "invoices"),
        messages: normalise(listFrom(results[5]?.value, "messages"), "messages"),
        command: normalise(listFrom(results[6]?.value, "actions"), "command"),
        xero: { connected: Boolean(xero.connected || xero.xero_connected), tenant_name: pick(xero, "tenant_name", "tenantName") },
      });
      setLoading(false);
    }
    load();
    window.addEventListener("churvox:fresh-data-updated", load);
    return () => {
      mounted = false;
      window.removeEventListener("churvox:fresh-data-updated", load);
    };
  }, [api]);

  return { api, data, loading };
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

function titleOf(record) {
  if (!record) return "No record selected";
  return record.name || record.number || record.subject || record.approvalType || record.title || "New record";
}

function fields(record, data) {
  if (!record) return [];
  const clientOptions = unique(data.clients.map((client) => client.name), [record.client, "No client selected"]);
  const workerOptions = unique(data.workers.map((worker) => worker.name), [record.worker, "Unassigned"]);
  if (record.type === "approval") return [["Approval type", record.approvalType], ["Record", record.title], ["Client", record.client], ["Amount", record.amount || "Not money related"], ["Recommended action", record.owner, "select", OPTIONS.commandAction], ["What Churvox filled", record.filled, "textarea"], ["Evidence checked", record.evidence, "textarea"], ["Owner check", record.check, "textarea"]];
  if (record.type === "client") return [["Name", record.name], ["Phone", record.phone], ["Email", record.email, "email"], ["Address", record.address], ["Preferred service", record.service, "select", OPTIONS.service], ["Saved price", record.price], ["Preferred schedule", record.schedule || "One-off", "select", OPTIONS.recurring], ["Access notes", record.notes, "textarea"]];
  if (record.type === "quote") return [["Quote", record.title], ["Client", record.client, "select", clientOptions], ["Amount", record.amount, "number"], ["Status", record.status, "select", OPTIONS.quoteStatus], ["Scope", record.scope, "textarea"], ["Terms", record.terms], ["Follow-up", record.followUp], ["Next step", record.next]];
  if (record.type === "invoice") return [["Invoice", record.number], ["Client", record.client, "select", clientOptions], ["Job", record.job], ["Amount", record.amount, "number"], ["Due date", record.due, "date"], ["Status", record.status, "select", OPTIONS.invoiceStatus], ["Xero/MYOB status", record.sync], ["Line item", record.line], ["Evidence", record.evidence, "textarea"]];
  if (record.type === "worker") return [["Name", record.name], ["Email", record.email, "email"], ["Phone", record.phone], ["Role", record.role, "select", OPTIONS.role], ["Access", record.access, "select", OPTIONS.access], ["Clock status", record.status], ["Current job", record.job], ["GPS/location", record.gps], ["Proof/photos", record.proof], ["Worker messages", record.messages, "textarea"], ["Timesheet", record.timesheet], ["Slip/payroll status", record.payroll], ["Worker app", record.app], ["Notes", record.notes, "textarea"]];
  if (record.type === "message") return [["From", record.from], ["Channel", record.channel], ["Client", record.client, "select", clientOptions], ["Job", record.job], ["Subject", record.subject], ["Priority", record.priority], ["Message", record.detail, "textarea"], ["Drafted reply", record.draft, "textarea"]];
  return [["Job name", record.title], ["Client", record.client, "select", clientOptions], ["Site address", record.address], ["Service", record.service, "select", OPTIONS.service], ["Assigned worker", record.worker, "select", workerOptions], ["Scheduled date", record.date, "date"], ["Start time", record.time, "time"], ["Price NZD", record.price, "number"], ["Billing type", record.billing, "select", OPTIONS.billing], ["Frequency", record.recurring, "select", OPTIONS.recurring], ["Status", record.status, "select", OPTIONS.jobStatus], ["Proof/photos", record.proof], ["Job notes", record.notes, "textarea"]];
}

function payloadFor(type, values) {
  const get = (...names) => {
    for (const name of names) {
      const key = Object.keys(values).find((candidate) => candidate.toLowerCase() === name.toLowerCase());
      if (key && String(values[key] ?? "").trim()) return values[key];
    }
    return "";
  };
  if (type === "client") return { name: get("Name"), phone: get("Phone"), email: get("Email"), address: get("Address"), service: get("Preferred service"), price: get("Saved price"), schedule: get("Preferred schedule"), notes: get("Access notes") };
  if (type === "quote") return { title: get("Quote"), client_name: get("Client"), amount: get("Amount"), status: get("Status"), scope: get("Scope"), terms: get("Terms"), follow_up: get("Follow-up"), next_step: get("Next step") };
  if (type === "invoice") return { invoice_number: get("Invoice"), client_name: get("Client"), job_title: get("Job"), amount: get("Amount"), due_date: get("Due date"), status: get("Status"), accounting_status: get("Xero/MYOB status"), line_item: get("Line item"), evidence: get("Evidence") };
  if (type === "worker") return { name: get("Name"), email: get("Email"), phone: get("Phone"), role: get("Role"), access: get("Access"), status: get("Clock status"), current_job: get("Current job"), gps: get("GPS/location"), proof: get("Proof/photos"), messages: get("Worker messages"), timesheet: get("Timesheet"), payroll_status: get("Slip/payroll status"), app_status: get("Worker app"), notes: get("Notes") };
  if (type === "message") return { from: get("From"), channel: get("Channel"), client_name: get("Client"), job_title: get("Job"), subject: get("Subject"), priority: get("Priority"), message: get("Message"), drafted_reply: get("Drafted reply") };
  return { title: get("Job name"), client_name: get("Client"), address: get("Site address"), service: get("Service"), assigned_worker_name: get("Assigned worker"), scheduled_date: get("Scheduled date"), scheduled_time: get("Start time"), price: get("Price NZD"), billing: get("Billing type"), recurring: get("Frequency"), status: get("Status"), proof: get("Proof/photos"), notes: get("Job notes") };
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

function Header({ page, user, go }) {
  const [headline, subhead] = PAGE_COPY[page] || PAGE_COPY.today;
  const title = NAV.find(([id]) => id === page)?.[1] || "Today";
  return (
    <>
      <header className="cvxTop">
        <button type="button" className="cvxBrand" onClick={() => go("today")}><i /><span><b>Churvox</b><small>does the admin</small></span></button>
        <div className="cvxTitle"><h1>{title}</h1><p>{subhead || headline}</p></div>
        <div className="cvxAccount"><small>Owner view</small><b>{user?.business_name || user?.company_name || user?.name || "Boss"}</b></div>
      </header>
      <nav className="cvxNav">{NAV.map(([id, label]) => <button key={id} type="button" className={page === id ? "active" : ""} onClick={() => go(id)}>{label}</button>)}</nav>
    </>
  );
}

function Hero({ page, data }) {
  const [headline, subhead] = PAGE_COPY[page] || PAGE_COPY.today;
  const chips = {
    today: [[data.jobs.length, "jobs"], [data.command.length, "checks"], [money(data.invoices.reduce((sum, item) => sum + item.amount, 0)), "invoice value"]],
    command: [[data.command.length, "waiting"], ["owner", "approval"], ["draft", "guarded"]],
    jobs: [[data.jobs.length, "jobs"], [data.jobs.filter((job) => job.recurring !== "One-off").length, "recurring"], [data.jobs.filter((job) => job.issue).length, "needs check"]],
    clients: [[data.clients.length, "clients"], ["CSV", "import/export"], ["memory", "site notes"]],
    quotes: [[data.quotes.length, "quotes"], [money(data.quotes.reduce((sum, item) => sum + item.amount, 0)), "value"], ["follow-up", "prepared"]],
    invoices: [[money(data.invoices.reduce((sum, item) => sum + item.amount, 0)), "ledger"], [data.invoices.filter((item) => /overdue/i.test(item.status)).length, "overdue"], ["draft", "sync only"]],
    payroll: [[data.workers.length, "workers"], ["CSV", "export"], ["no", "payout files"]],
    workers: [[data.workers.length, "workers"], [data.workers.filter((item) => !/not clocked|clocked out/i.test(item.status)).length, "active"], ["GPS", "map"]],
    xero: [[data.xero.connected ? "connected" : "not connected", "status"], ["owner", "approved"], ["draft", "sync only"]],
  }[page] || [["ready", "workspace"], ["records", "editable"], ["safe", "guarded"]];
  return <section className="cvxHero"><div><small>{page}</small><h2>{headline}</h2><p>{subhead}</p></div><div className="cvxHeroChips">{chips.map(([a, b]) => <span key={b}><b>{a}</b><small>{b}</small></span>)}</div></section>;
}

function Panel({ title, children, className = "", action = null }) {
  return <section className={`cvxPanel ${className}`}><header className="cvxPanelHead"><h3>{title}</h3>{action}</header>{children}</section>;
}

function Toolbar({ children }) {
  return <div className="cvxToolbar">{children}</div>;
}

function Empty({ title = "Nothing here yet", text = "Add a record and it will show here." }) {
  return <div className="cvxEmpty"><b>{title}</b><p>{text}</p></div>;
}

function Row({ title, meta, tag, tone = "", onClick, action = "Open" }) {
  return <button type="button" className={`cvxRow ${tone}`} onClick={onClick}><i /><span><b>{title}</b><small>{meta}</small></span><em>{tag || action}</em></button>;
}

function Kpis({ items }) {
  return <div className="cvxKpis">{items.map(([label, value, tone]) => <span key={label} className={tone || ""}><b>{value}</b><small>{label}</small></span>)}</div>;
}

function Field({ label, value, type = "text", options, onChange, readOnly }) {
  const common = { name: label, value: value ?? "", disabled: readOnly, readOnly, onChange };
  if (type === "textarea") return <label className="cvxField wide"><span>{label}</span><textarea {...common} rows={4} /></label>;
  if (options) return <label className="cvxField"><span>{label}</span><select {...common}>{unique([value], options).map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
  return <label className="cvxField"><span>{label}</span><input {...common} type={type} step={type === "number" ? "0.01" : undefined} /></label>;
}

function Preview({ record, data, open }) {
  if (!record) return <Empty title="No record selected" text="Open a row to see the working form." />;
  return <div className="cvxPreviewForm"><div className="cvxRecordTop"><span>{record.type}</span><h3>{titleOf(record)}</h3><button type="button" onClick={() => open(record)}>Open form</button></div><div className="cvxFormGrid readonly">{fields(record, data).slice(0, 8).map(([label, value, type, options]) => <Field key={label} label={label} value={value} type={type} options={options} readOnly />)}</div></div>;
}

function Drawer({ record, data, api, onClose }) {
  const [values, setValues] = React.useState({});
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState("");

  React.useEffect(() => {
    if (!record) return;
    const next = {};
    fields(record, data).forEach(([label, value]) => { next[label] = value ?? ""; });
    setValues(next);
    setNotice("");
  }, [record, data]);

  if (!record) return null;

  const type = record.type;
  const isNew = record.__new || !idOf(record);
  const isApproval = type === "approval";
  const change = (event) => setValues((current) => ({ ...current, [event.target.name]: event.target.value }));

  async function save(action = "save") {
    setBusy(true);
    setNotice("");
    const payload = payloadFor(type, values);
    const id = idOf(record);
    try {
      if (isApproval) await firstGood([() => api.post(`/command/approvals/${encodeURIComponent(id || record.title || "approval")}/execute`, { action_id: id, kind: "command_record", item: { ...record, fields: values, action } }), () => api.post("/command/execute-approved", { kind: "command_record", item: { ...record, fields: values, action } })]);
      else if (type === "job") await firstGood(isNew ? [() => api.post("/jobs", payload), () => api.post("/jobs/create", payload)] : [() => api.patch(`/jobs/${id}`, payload), () => api.patch(`/jobs/${id}/field-update`, payload)]);
      else if (type === "client") await firstGood(isNew ? [() => api.post("/clients", payload), () => api.post("/clients/create", payload)] : [() => api.patch(`/clients/${id}`, payload), () => api.put(`/clients/${id}`, payload)]);
      else if (type === "quote") await firstGood(isNew ? [() => api.post("/quotes", payload), () => api.post("/quotes/create", payload)] : [() => api.patch(`/quotes/${id}`, payload), () => api.put(`/quotes/${id}`, payload)]);
      else if (type === "invoice") await firstGood(isNew ? [() => api.post("/invoices", payload), () => api.post("/invoices/create", payload)] : [() => api.patch(`/invoices/${id}`, payload), () => api.put(`/invoices/${id}`, payload)]);
      else if (type === "worker") await firstGood(isNew ? [() => api.post("/team/workers", payload), () => api.post("/team", payload), () => api.post("/workers", payload)] : [() => api.patch(`/team/workers/${id}`, payload), () => api.patch(`/team/${id}`, payload)]);
      else if (type === "message") await firstGood([() => api.post("/messages", payload), () => api.post("/command/execute-approved", { kind: "message", item: { ...record, fields: values, payload } })]);
      setNotice(isApproval ? (action === "park" ? "Parked in Command." : action === "edit" ? "Edited and saved in Command." : "Approved in Command.") : (isNew ? "Record created." : "Record saved."));
      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated"));
    } catch (error) {
      setNotice(error?.message || "Could not save yet.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="cvxDrawerLayer">
      <aside className={`cvxDrawer ${isApproval ? "approval" : ""}`}>
        <button type="button" className="cvxDrawerClose" onClick={onClose}>Close</button>
        <small>{isNew ? "New record" : type}</small>
        <h2>{isApproval ? "Approval slip" : titleOf(record)}</h2>
        <p>{isApproval ? "Check what Churvox filled, edit if needed, then approve or park." : "This is the working form. Save records here; risky decisions stay in Command."}</p>
        <div className="cvxFormGrid">{fields(record, data).map(([label, value, type, options]) => <Field key={label} label={label} value={values[label] ?? value ?? ""} type={type} options={options} readOnly={busy} onChange={change} />)}</div>
        {notice ? <p className="cvxNotice">{notice}</p> : null}
        <div className="cvxDrawerActions">
          {isApproval ? <><button type="button" className="good" disabled={busy} onClick={() => save("approve")}>Approve</button><button type="button" disabled={busy} onClick={() => save("edit")}>Save edit</button><button type="button" className="quiet" disabled={busy} onClick={() => save("park")}>Park</button></> : <><button type="button" className="good" disabled={busy} onClick={() => save("save")}>{isNew ? "Create record" : "Save record"}</button><button type="button" disabled={busy} onClick={() => save("refresh")}>Save and refresh</button><button type="button" className="quiet" onClick={onClose}>Close</button></>}
        </div>
      </aside>
    </div>
  );
}

function TodayPage({ data, open, go }) {
  const invoiceValue = data.invoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  return <><Hero page="today" data={data} /><Kpis items={[["Jobs", data.jobs.length], ["Workers", data.workers.length, "blue"], ["Approvals", data.command.length, "red"], ["Invoice value", money(invoiceValue), "orange"]]} /><Panel title="Run sheet" className="span8" action={<button type="button" onClick={() => open(blank("job", data))}>Add job</button>}><div className="cvxList">{data.jobs.length ? data.jobs.slice(0, 6).map((job) => <Row key={job.id} title={`${job.time || "Any time"} · ${job.title}`} meta={`${job.client} · ${job.worker} · ${job.status}`} tag={money(job.price)} onClick={() => open(job)} />) : <Empty title="No jobs yet" text="Create jobs with client, worker, date, price and repeat rules." />}</div></Panel><Panel title="Owner checks" className="span4" action={<button type="button" onClick={() => go("command")}>Command</button>}><div className="cvxList compact">{data.command.length ? data.command.slice(0, 5).map((item) => <Row key={item.id} title={item.approvalType} meta={item.title} tone="red" action="Slip" onClick={() => open(item)} />) : <Empty title="Command is clear" />}</div></Panel><Panel title="People working" className="span4"><div className="cvxList compact">{data.workers.length ? data.workers.slice(0, 5).map((worker) => <Row key={worker.id} title={worker.name} meta={`${worker.status} · ${worker.job}`} tone="blue" onClick={() => open(worker)} />) : <Empty title="No workers yet" />}</div></Panel><Panel title="Messages" className="span4"><div className="cvxList compact">{data.messages.length ? data.messages.slice(0, 4).map((message) => <Row key={message.id} title={message.subject} meta={`${message.from} · ${message.priority}`} onClick={() => open(message)} />) : <Empty title="No messages" />}</div></Panel><Panel title="Money today" className="span4"><div className="cvxMoney"><b>{money(invoiceValue)}</b><span>Draft, due and ready invoice value. Sending and sync stay in Command.</span></div></Panel></>;
}

function CommandPage({ data, open }) {
  return <><Hero page="command" data={data} /><Panel title="Prepared approval queue" className="span7"><div className="cvxList">{data.command.length ? data.command.slice(0, 8).map((item) => <Row key={item.id} title={item.approvalType} meta={`${item.title} · ${item.status}`} tone="red" action="Open slip" onClick={() => open(item)} />) : <Empty title="No approvals waiting" text="Quotes, invoices, client issues and job checks will appear here." />}</div></Panel><Panel title="Working slip" className="span5 dark"><Preview record={data.command[0]} data={data} open={open} /></Panel><Panel title="Command rule" className="span12"><div className="cvxRule"><b>Only Command has approval actions.</b><span>Jobs, Clients, Workers, Quotes and Invoices are clean record workspaces. Risky sends, syncs, price changes and unclear decisions come here.</span></div></Panel></>;
}

function JobsPage({ data, open }) {
  const recurring = data.jobs.filter((job) => job.recurring !== "One-off");
  const issues = data.jobs.filter((job) => job.issue || /needs check/i.test(job.status));
  return <><Hero page="jobs" data={data} /><Toolbar><button type="button" onClick={() => open(blank("job", data))}>Add job</button><button type="button" onClick={() => open({ ...blank("job", data), recurring: "Weekly" })}>Recurring job</button><button type="button" onClick={() => open(data.workers[0] || blank("worker", data))}>Assign worker</button></Toolbar><Panel title="Run sheet" className="span6"><div className="cvxList">{data.jobs.length ? data.jobs.slice(0, 8).map((job) => <Row key={job.id} title={`${job.date || "No date"} · ${job.time || "No time"}`} meta={`${job.title} · ${job.client} · ${job.worker}`} tag={money(job.price)} onClick={() => open(job)} />) : <Empty title="No jobs yet" />}</div></Panel><Panel title="Job form" className="span6"><Preview record={data.jobs[0]} data={data} open={open} /></Panel><Panel title="Recurring work" className="span6"><div className="cvxList compact">{recurring.length ? recurring.slice(0, 5).map((job) => <Row key={job.id} title={job.title} meta={`${job.recurring} · ${job.client}`} onClick={() => open(job)} />) : <Empty title="No recurring jobs" text="Weekly, fortnightly and monthly work lives inside Jobs." />}</div></Panel><Panel title="Needs Command" className="span6"><div className="cvxList compact">{issues.length ? issues.slice(0, 5).map((job) => <Row key={job.id} title={job.title} meta={job.issue || job.status} tone="red" onClick={() => open(job)} />) : <Empty title="No job issues" />}</div></Panel></>;
}

function ClientsPage({ data, open }) {
  const selected = data.clients[0];
  const linked = selected ? [...data.jobs.filter((item) => item.client === selected.name), ...data.quotes.filter((item) => item.client === selected.name), ...data.invoices.filter((item) => item.client === selected.name)] : [];
  return <><Hero page="clients" data={data} /><Toolbar><button type="button" onClick={() => open(blank("client", data))}>Add client</button><button type="button">CSV import</button><button type="button">Export clients</button></Toolbar><Panel title="Client list" className="span5"><div className="cvxList">{data.clients.length ? data.clients.slice(0, 10).map((client) => <Row key={client.id} title={client.name} meta={`${client.address || "No address"} · ${client.service || "No service"}`} tag={client.price || "Open"} onClick={() => open(client)} />) : <Empty title="No clients yet" text="Add clients or import a CSV." />}</div></Panel><Panel title="Client file" className="span7"><Preview record={selected} data={data} open={open} /></Panel><Panel title="Linked history" className="span12"><div className="cvxHistory">{linked.length ? linked.slice(0, 8).map((item) => <Row key={`${item.type}-${item.id}`} title={titleOf(item)} meta={item.status || item.client || "Record"} tag={item.amount ? money(item.amount) : item.price || "Open"} onClick={() => open(item)} />) : <Empty title="No linked history yet" text="Jobs, quotes and invoices for this client will show here." />}</div></Panel></>;
}

function QuotesPage({ data, open }) {
  const stages = ["Draft", "Ready", "Sent", "Accepted"];
  return <><Hero page="quotes" data={data} /><Toolbar><button type="button" onClick={() => open(blank("quote", data))}>New quote</button><button type="button" onClick={() => open(data.quotes[0] || blank("quote", data))}>Follow up</button><button type="button" onClick={() => open(blank("job", data))}>Create job</button></Toolbar><section className="cvxPipeline span12">{stages.map((stage) => <div key={stage}><h3>{stage}</h3>{data.quotes.filter((quote) => String(quote.status).toLowerCase().includes(stage.toLowerCase())).slice(0, 4).map((quote) => <Row key={quote.id} title={quote.title} meta={`${quote.client} · ${money(quote.amount)}`} onClick={() => open(quote)} />)}{!data.quotes.some((quote) => String(quote.status).toLowerCase().includes(stage.toLowerCase())) ? <small>No records</small> : null}</div>)}</section><Panel title="Quote builder" className="span7"><Preview record={data.quotes[0]} data={data} open={open} /></Panel><Panel title="Quote memory" className="span5"><div className="cvxRule"><b>Won/lost notes, pricing and accepted scope reuse.</b><span>Future jobs should not need the owner to retype the same scope, price or service notes.</span></div></Panel></>;
}

function InvoicesPage({ data, open }) {
  const draft = data.invoices.filter((invoice) => /draft/i.test(invoice.status)).reduce((sum, item) => sum + item.amount, 0);
  const overdue = data.invoices.filter((invoice) => /overdue/i.test(invoice.status)).length;
  return <><Hero page="invoices" data={data} /><Kpis items={[["Draft value", money(draft)], ["Overdue", overdue, "red"], ["Paid", data.invoices.filter((invoice) => /paid/i.test(invoice.status)).length, "blue"], ["Guard", "draft sync", "orange"]]} /><Toolbar><button type="button" onClick={() => open(blank("invoice", data))}>New invoice draft</button><button type="button" onClick={() => open(data.invoices[0] || blank("invoice", data))}>Review draft</button><button type="button" onClick={() => open(data.command[0])}>Open Command</button></Toolbar><Panel title="Invoice ledger" className="span8"><div className="cvxList">{data.invoices.length ? data.invoices.slice(0, 10).map((invoice) => <Row key={invoice.id} title={invoice.number} meta={`${invoice.client} · ${invoice.status} · ${invoice.sync}`} tag={money(invoice.amount)} onClick={() => open(invoice)} />) : <Empty title="No invoices yet" />}</div></Panel><Panel title="Accounting guardrails" className="span4 dark"><div className="cvxRule"><b>Draft sync only.</b><span>No automatic invoice sending. No tax filing. No bank payout files. Only mark paid after accounting refresh confirms paid.</span></div></Panel></>;
}

function MessagesPage({ data, open }) {
  return <><Hero page="messages" data={data} /><Toolbar><button type="button" onClick={() => open(blank("message", data))}>Message note</button><button type="button" onClick={() => open(data.messages[0] || blank("message", data))}>Open draft reply</button></Toolbar><Panel title="Worker messages" className="span4"><div className="cvxList compact">{data.messages.filter((message) => /worker/i.test(`${message.from} ${message.channel}`)).slice(0, 6).map((message) => <Row key={message.id} title={message.subject} meta={`${message.from} · ${message.priority}`} onClick={() => open(message)} />)}<Empty title="No worker messages" /></div></Panel><Panel title="Customer messages" className="span4"><div className="cvxList compact">{data.messages.filter((message) => /customer|client/i.test(`${message.from} ${message.channel}`)).slice(0, 6).map((message) => <Row key={message.id} title={message.subject} meta={`${message.client} · ${message.priority}`} onClick={() => open(message)} />)}<Empty title="No customer messages" /></div></Panel><Panel title="Drafted reply" className="span4"><Preview record={data.messages[0]} data={data} open={open} /></Panel></>;
}

function TeamPage({ data, open }) {
  return <><Hero page="team" data={data} /><Toolbar><button type="button" onClick={() => open(blank("worker", data))}>Add staff</button><button type="button" onClick={() => open(data.workers[0] || blank("worker", data))}>Roles/access</button></Toolbar><Panel title="Staff records" className="span8"><div className="cvxTiles">{data.workers.length ? data.workers.map((worker) => <button key={worker.id} type="button" onClick={() => open(worker)}><b>{worker.name}</b><small>{worker.role} · {worker.app}</small><span>{worker.job}</span><em>{worker.payroll}</em></button>) : <Empty title="No staff yet" />}</div></Panel><Panel title="Payroll review" className="span4"><div className="cvxList compact">{data.workers.length ? data.workers.map((worker) => <Row key={worker.id} title={worker.name} meta={`${worker.timesheet || "No time"} · ${worker.payroll}`} onClick={() => open(worker)} />) : <Empty title="No payroll review" />}</div></Panel></>;
}

function PayrollPage({ data, open }) {
  return <><Hero page="payroll" data={data} /><Panel title="Timesheet queue" className="span8"><div className="cvxList">{data.workers.length ? data.workers.map((worker) => <Row key={worker.id} title={worker.name} meta={`${worker.timesheet || "No time"} · ${worker.payroll}`} tag="Review" onClick={() => open(worker)} />) : <Empty title="No workers yet" />}</div></Panel><Panel title="Payroll guardrail" className="span4 dark"><div className="cvxRule"><b>Review only.</b><span>Churvox can prepare payroll review records and CSVs. It must not submit tax or create bank payout files.</span></div></Panel></>;
}

function WorkersPage({ data, open }) {
  const query = data.workers.map((worker) => worker.gps).filter(Boolean).join(" ") || "Lower Hutt Wellington New Zealand";
  return <><Hero page="workers" data={data} /><Panel title="GPS map" className="span8"><div className="cvxMap"><iframe title="Worker GPS" src={`https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`} loading="lazy" /></div></Panel><Panel title="Worker status" className="span4"><div className="cvxList compact">{data.workers.length ? data.workers.slice(0, 8).map((worker) => <Row key={worker.id} title={worker.name} meta={`${worker.status} · ${worker.job}`} tone="blue" onClick={() => open(worker)} />) : <Empty title="No workers yet" />}</div></Panel><Panel title="Proof and slips" className="span12"><div className="cvxTiles">{data.workers.length ? data.workers.map((worker) => <button key={worker.id} type="button" onClick={() => open(worker)}><b>{worker.name}</b><small>{worker.proof || "No proof yet"}</small><span>{worker.messages || "No worker message"}</span><em>{worker.timesheet || "No time"}</em></button>) : <Empty title="No proof yet" />}</div></Panel></>;
}

function XeroPage({ data, open }) {
  const ready = data.invoices.filter((invoice) => /draft|ready|not synced|command/i.test(`${invoice.status} ${invoice.sync}`));
  return <><Hero page="xero" data={data} /><Panel title="Connection" className="span4"><div className="cvxMoney"><b>{data.xero.connected ? "Connected" : "Not connected"}</b><span>{data.xero.tenant_name || "Xero/MYOB status will show here."}</span></div></Panel><Panel title="Ready to sync" className="span8"><div className="cvxList">{ready.length ? ready.map((invoice) => <Row key={invoice.id} title={invoice.number} meta={`${invoice.client} · ${invoice.sync}`} tag={money(invoice.amount)} onClick={() => open(invoice)} />) : <Empty title="No sync queue" />}</div></Panel><Panel title="Guardrails" className="span12 dark"><div className="cvxRule"><b>Locked accounting safety.</b><span>No automatic invoice sending. No tax filing. No bank payout files. Only mark paid after accounting refresh confirms paid.</span></div></Panel></>;
}

function SettingsPage({ user }) {
  return <><Hero page="settings" data={{ jobs: [], clients: [], workers: [], quotes: [], invoices: [], messages: [], command: [], xero: {} }} /><Panel title="Business profile" className="span8"><div className="cvxFormGrid readonly"><Field label="Business name" value={pick(user, "business_name", "company_name", "name") || "Not set"} readOnly /><Field label="Email" value={pick(user, "business_email", "company_email", "email") || "Not set"} readOnly /><Field label="GST" value={pick(user, "gst_rate", "tax_rate") || "Not set"} readOnly /><Field label="Country" value={pick(user, "country") || "New Zealand"} readOnly /></div></Panel><Panel title="Controls" className="span4"><div className="cvxTiles">{["Business branding", "GST", "Security", "Worker app rules", "CSV exports", "Delete account"].map((item) => <button key={item} type="button"><b>{item}</b><small>Control</small><span>Clean owner setting.</span><em>Open</em></button>)}</div></Panel></>;
}

function PlansPage() {
  const plans = [["Start", "$39", "Jobs, clients, quotes and invoices."], ["Crew", "$89", "Worker app and team records."], ["Operator", "$149", "Most Popular. Churvox prepares admin."], ["Command", "$299", "Full approval OS and accounting sync option."]];
  return <><Hero page="plans" data={{ jobs: [], clients: [], workers: [], quotes: [], invoices: [], messages: [], command: [], xero: {} }} /><section className="cvxPlans span12">{plans.map(([name, price, detail]) => <article key={name} className={name === "Operator" ? "popular" : ""}><b>{name}</b><strong>{price}</strong><small>/month + GST</small><p>{detail}</p>{name === "Operator" ? <em>Most Popular</em> : null}</article>)}</section><Panel title="Add-ons" className="span12"><p className="cvxPlain">Command Growth Pack $99/month + GST. Accounting Sync Add-on $39/month + GST for non-Command tiers.</p></Panel></>;
}

function SupportPage() {
  return <><Hero page="support" data={{ jobs: [], clients: [], workers: [], quotes: [], invoices: [], messages: [], command: [], xero: {} }} /><Panel title="Contact" className="span4"><h3>hello@churvox.com</h3><p className="cvxPlain">Use this for setup help, beta feedback and support.</p></Panel><Panel title="Guides" className="span8"><div className="cvxTiles">{["Setup help", "CSV import", "Worker app", "Billing", "Xero guardrails", "Approve in Command"].map((item) => <button key={item} type="button"><b>{item}</b><small>Guide</small><span>Short practical help.</span><em>Open</em></button>)}</div></Panel></>;
}

function Page({ page, data, user, open, go }) {
  if (page === "today") return <TodayPage data={data} open={open} go={go} />;
  if (page === "command") return <CommandPage data={data} open={open} />;
  if (page === "jobs") return <JobsPage data={data} open={open} />;
  if (page === "clients") return <ClientsPage data={data} open={open} />;
  if (page === "quotes") return <QuotesPage data={data} open={open} />;
  if (page === "invoices") return <InvoicesPage data={data} open={open} />;
  if (page === "messages") return <MessagesPage data={data} open={open} />;
  if (page === "team") return <TeamPage data={data} open={open} />;
  if (page === "payroll") return <PayrollPage data={data} open={open} />;
  if (page === "workers") return <WorkersPage data={data} open={open} />;
  if (page === "xero") return <XeroPage data={data} open={open} />;
  if (page === "settings") return <SettingsPage user={user} />;
  if (page === "plans") return <PlansPage />;
  return <SupportPage />;
}

export default function ProductAppV2() {
  const { user } = useAuth();
  const { api, data, loading } = useProductData();
  const [page, setPage] = React.useState(pageFromUrl);
  const [selected, setSelected] = React.useState(null);

  React.useEffect(() => {
    const sync = () => setPage(pageFromUrl());
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);

  const go = (nextPage) => {
    setPage(nextPage);
    setSelected(null);
    if (typeof window !== "undefined") window.history.replaceState({}, "", `/dashboard#${nextPage}`);
  };

  return (
    <main className="cvxProduct" data-product-version="v2">
      <Header page={page} user={user} go={go} />
      <section className="cvxWorkspace"><div className="cvxPage">{loading ? <Hero page="today" data={data} /> : <Page page={page} data={data} user={user} open={setSelected} go={go} />}</div></section>
      <Drawer record={selected} data={data} api={api} onClose={() => setSelected(null)} />
    </main>
  );
}
