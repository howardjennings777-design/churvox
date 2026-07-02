import React from "react";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";

const NAV = ["AI Guide", "Command", "Jobs", "Clients", "Quotes", "Invoices", "Team", "Payroll", "Workers", "Xero", "Settings", "Plans", "Support"];
const keyOf = (value) => String(value || "").toLowerCase().replace(/\s+/g, "");
const aliases = {
  "": "aiguide",
  dashboard: "aiguide",
  smart: "aiguide",
  hub: "aiguide",
  today: "aiguide",
  setup: "aiguide",
  setupassistant: "aiguide",
  firstrun: "aiguide",
  guide: "aiguide",
  ai: "aiguide",
  aioperator: "command",
  quickcreateai: "command",
  planday: "jobs",
  recurring: "jobs",
  dispatch: "workers",
  routes: "workers",
  areas: "workers",
  worker: "workers",
  workers: "workers",
  quoteai: "quotes",
  invoicecheck: "invoices",
  payments: "invoices",
  time: "payroll",
  payroll: "payroll",
  accounting: "xero",
  sync: "xero",
  integrations: "xero",
  reports: "invoices",
  profit: "invoices",
  expenses: "invoices",
  photos: "jobs",
  documents: "clients",
  automation: "command",
  launchcontrol: "settings",
  security: "settings",
  support: "support",
  help: "support"
};

const subtitles = {
  aiguide: "Setup, first jobs, worker app, pricing, billing and owner approval basics.",
  command: "The only approval desk: approve, edit or park.",
  jobs: "Job cards, editable job forms, recurring, proof and status.",
  clients: "Client list, editable forms, service memory and history.",
  quotes: "Drafts, sent quotes, viewed quotes, accepted quotes and follow-up.",
  invoices: "Drafts, due today, overdue, paid and sync-ready invoices.",
  team: "Staff, roles, access and worker app status.",
  payroll: "Timesheets, worker slips and payroll review without tax filing or payout files.",
  workers: "Clock-ins, GPS, current jobs, proof and timesheets.",
  xero: "Draft sync only, no tax filing, no payout files.",
  settings: "Real business controls without clutter.",
  plans: "Locked Churvox pricing and add-ons.",
  support: "Support, setup help and short guides.",
};

const seed = {
  jobs: [],
  clients: [],
  workers: [],
  quotes: [],
  invoices: [],
  messages: [],
  command: [],
}

const optionSets = {
  status: ["assigned", "acknowledged", "in_progress", "proof_ready", "completed", "needs_check", "quote_draft"],
  quoteStatus: ["Draft", "Sent", "Viewed", "Accepted"],
  invoiceStatus: ["Draft", "Due today", "Overdue", "Paid"],
  recurring: ["One-off", "Weekly", "Fortnightly", "Monthly", "Custom"],
  billing: ["Fixed price", "Hourly", "Fixed + extras", "Hourly + extras", "Package price", "Quote required"],
  service: ["Lawn mowing", "Hedge trimming", "Property tidy", "Cleanup", "Quote visit", "Other"],
  worker: ["Unassigned"],
  client: ["No client selected"],
  role: ["Owner", "Manager", "Worker", "Subcontractor", "Payroll only"],
  access: ["Full access", "Jobs only", "Worker app", "Payroll review", "No access"],
};

function pageFromLocation() {
  if (typeof window === "undefined") return "today";
  const path = window.location.pathname.replace(/^\/+/, "").split("/")[0].toLowerCase();
  const hash = window.location.hash.replace(/^#/, "").toLowerCase();
  const raw = hash || path;
  return aliases[raw] || (NAV.map(keyOf).includes(raw) ? raw : "today");
}

function listFrom(payload, key) {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (key && Array.isArray(data?.[key])) return data[key];
  for (const name of [key, "items", "records", "results", "jobs", "clients", "quotes", "invoices", "workers", "team", "messages", "actions"]) {
    if (name && Array.isArray(data?.[name])) return data[name];
  }
  return [];
}

function idOf(record) {
  const raw = record?.id || record?._id || record?.job_id || record?.client_id || record?.invoice_id || record?.quote_id || record?.user_id || "";
  if (typeof raw === "object") return String(raw.$oid || raw.oid || raw.id || raw._id || "");
  return String(raw || "");
}

function textOf(...values) {
  for (const value of values) if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
  return "";
}

function money(value) {
  return Number(value || 0).toLocaleString("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 });
}

function fallbackFrom(list, index) {
  return Array.isArray(list) && list.length ? list[index % list.length] : {};
}

const EMPTY_MESSAGE = {
  id: "empty-message",
  from: "Churvox",
  subject: "No messages yet",
  detail: "Worker and customer messages will appear here when real messages arrive.",
  draft: "No drafted reply waiting.",
  history: "No message history yet.",
  client: "No client selected",
  job: "No job selected",
  priority: "Clear",
  channel: "None",
};

const EMPTY_WORKER = {
  id: "empty-worker",
  name: "No team member yet",
  role: "Not set",
  access: "Not set",
  status: "No worker active",
  job: "No job assigned",
  app: "Not invited",
  payroll: "No payroll review",
  gps: "No GPS yet",
  timesheet: "No time recorded",
  proof: "No proof yet",
  messages: "No worker messages",
  start: "",
  end: "",
  slip: "No slip",
  notes: "",
};

function useOsData() {
  const api = useApi();
  const [data, setData] = React.useState({ ...seed, xero: { connected: false, tenant_name: "" } });

  React.useEffect(() => {
    let alive = true;
    async function load() {
      const responses = await Promise.allSettled([api.get("/jobs"), api.get("/clients"), api.get("/team"), api.get("/quotes"), api.get("/invoices"), api.get("/messages"), api.get("/ai/actions"), api.get("/xero/status")]);
      if (!alive) return;
      const jobs = listFrom(responses[0].value, "jobs").map((job, index) => {
        const fallback = seed.jobs[index % Math.max(seed.jobs.length, 1)] || {};
        return { ...fallback, ...job, id: idOf(job) || `job-${index}`, title: textOf(job.title, job.job_title, job.job_name, job.description, fallback.title), client: textOf(job.client_name, job.customer_name, job.client?.name, fallback.client), worker: textOf(job.assigned_worker_name, job.worker_name, job.worker?.name, fallback.worker), status: textOf(job.status, job.job_status, job.stage, fallback.status), date: textOf(job.scheduled_date, job.date, fallback.date), time: textOf(job.scheduled_time, job.start_time, job.time, fallback.time), price: Number(job.price ?? job.amount ?? job.total ?? fallback.price ?? 0), issue: textOf(job.issue, job.problem, job.needs_attention, fallback.issue) };
      });
      const clients = listFrom(responses[1].value, "clients").map((client, index) => {
        const fallback = fallbackFrom(seed.clients, index);
        return { ...fallback, ...client, id: idOf(client) || `client-${index}`, name: textOf(client.name, client.client_name, client.customer_name, fallback.name) };
      });
      const workers = listFrom(responses[2].value, "team").map((worker, index) => { const fallback = seed.workers[index % Math.max(seed.workers.length, 1)] || {}; return { ...fallback, ...worker, id: idOf(worker) || `worker-${index}`, name: textOf(worker.name, worker.full_name, worker.email, fallback.name), role: textOf(worker.role, worker.access, fallback.role), status: textOf(worker.status, worker.clock_status, fallback.status), job: textOf(worker.current_job, worker.job_title, fallback.job), app: textOf(worker.app_status, worker.invite_status, fallback.app), payroll: textOf(worker.payroll_status, fallback.payroll), gps: textOf(worker.gps, worker.location, fallback.gps), timesheet: textOf(worker.timesheet, worker.hours_today, fallback.timesheet), proof: textOf(worker.proof, worker.photo_status, fallback.proof), messages: textOf(worker.messages, worker.message_status, fallback.messages), start: textOf(worker.start, worker.clock_in, worker.start_time, fallback.start), end: textOf(worker.end, worker.clock_out, worker.end_time, fallback.end), slip: textOf(worker.slip, worker.pay_slip_status, fallback.slip) }; });
      const quotes = listFrom(responses[3].value, "quotes").map((quote, index) => {
        const fallback = fallbackFrom(seed.quotes, index);
        return { ...fallback, ...quote, id: idOf(quote) || `quote-${index}` };
      });
      const invoices = listFrom(responses[4].value, "invoices").map((invoice, index) => {
        const fallback = fallbackFrom(seed.invoices, index);
        return { ...fallback, ...invoice, id: idOf(invoice) || `invoice-${index}` };
      });
      const messages = listFrom(responses[5].value, "messages").map((message, index) => {
        const fallback = fallbackFrom(seed.messages, index);
        return { ...fallback, ...message, id: idOf(message) || `message-${index}` };
      });
      const command = listFrom(responses[6].value, "actions").map((item, index) => {
        const fallback = fallbackFrom(seed.command, index);
        return { ...fallback, ...item, id: idOf(item) || `command-${index}` };
      });
      const xeroRaw = responses[7].value?.data?.data || responses[7].value?.data || {};
      setData((current) => ({ jobs: jobs.length ? jobs : current.jobs, clients: clients.length ? clients : current.clients, workers: workers.length ? workers : current.workers, quotes: quotes.length ? quotes : current.quotes, invoices: invoices.length ? invoices : current.invoices, messages: messages.length ? messages : current.messages, command: command.length ? command : current.command, xero: { connected: Boolean(xeroRaw.connected || xeroRaw.xero_connected), tenant_name: textOf(xeroRaw.tenant_name, xeroRaw.tenantName, "") } }));
    }
    load();
    window.addEventListener("churvox:fresh-data-updated", load);
    return () => {
      alive = false;
      window.removeEventListener("churvox:fresh-data-updated", load);
    };
  }, [api]);

  return data;
}

function Row({ title, meta, tone = "green", tag, onClick }) {
  return <button type="button" className={`cocRow ${tone}`} onClick={onClick}><i /><span><b>{title}</b><small>{meta}</small></span>{tag ? <em>{tag}</em> : null}</button>;
}

function Panel({ title, tone = "green", className = "", children }) {
  return <section className={`cocPanel ${tone} ${className}`}><h2>{title}</h2>{children}</section>;
}

function Field({ name, label, value, textarea = false, type = "text", options, readOnly = false, onChange }) {
  const fieldName = name || label;
  const common = { name: fieldName, readOnly, disabled: readOnly, onChange };
  if (options) return <label className="cocField"><span>{label}</span><select {...common} value={value ?? ""}>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
  const Tag = textarea ? "textarea" : "input";
  return <label className="cocField"><span>{label}</span><Tag {...common} type={textarea ? undefined : type} step={type === "number" ? "0.01" : undefined} value={value ?? ""} rows={textarea ? 4 : undefined} /></label>;
}

function Stat({ label, value, tone = "green" }) {
  return <span className={`miniStat ${tone}`}><b>{value}</b><small>{label}</small></span>;
}

function GoogleMap({ query, label = "Google Maps" }) {
  const q = query || "Lower Hutt Wellington New Zealand";
  const src = `https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed`;
  const search = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  return <div className="googleMap"><iframe title={label} src={src} loading="lazy" referrerPolicy="no-referrer-when-downgrade" /><a href={search} target="_blank" rel="noreferrer">Open in Google Maps</a></div>;
}

function routeQuery(data) {
  const places = data.workers.map((worker) => worker.gps).filter(Boolean).slice(0, 4);
  return places.length ? `${places.join(" ")} Lower Hutt Wellington New Zealand` : "Lower Hutt Wellington New Zealand";
}

function detailFor(selected) {
  const kind = String(selected?.type || "").toLowerCase();
  if (kind.includes("client")) return { title: "Client form", note: "Edit contact details, saved service memory, price memory and history.", client: true, fields: [["Name", selected.name], ["Phone", selected.phone], ["Email", selected.email], ["Address", selected.address], ["Preferred service", selected.service], ["Saved price", selected.price], ["Preferred schedule", selected.schedule || selected.service || "Not set"], ["Access notes", selected.notes, true], ["History", `${selected.jobs || 0} jobs / ${selected.quotes || 0} quotes / ${selected.invoices || 0} invoices`, false, "text", null, true], ["Churvox memory", `Use ${selected.price || "saved price"} for ${selected.service || "next service"}. Keep notes visible before each job.`, true]] };
  if (kind.includes("worker") || kind.includes("timesheet")) return { title: "Worker day slip", note: "Edit the worker day: clock times, current job, GPS, proof, messages, timesheet and slip status.", worker: true, fields: [["Worker", selected.name], ["Role/access", selected.role, false, "text", optionSets.role], ["Clock status", selected.status], ["Current job", selected.job], ["GPS/location", selected.gps], ["Clock in", selected.start], ["Clock out", selected.end || "Still working"], ["Break", selected.break || "Not set"], ["Proof/photos", selected.proof], ["Worker messages", selected.messages], ["Timesheet", selected.timesheet], ["Slip/payroll status", selected.slip || selected.payroll], ["Worker app", selected.app], ["Day notes", selected.notes, true]] };
  if (kind.includes("invoice")) return { title: "Invoice form", note: "Review money, line items, due date and accounting sync state. Sync approval stays in Command.", invoice: true, fields: [["Invoice", selected.number], ["Client", selected.client], ["Job", selected.job], ["Amount", selected.amount, false, "number"], ["Due date", selected.due, false, "date"], ["Status", selected.status, false, "text", optionSets.invoiceStatus], ["Xero/MYOB status", selected.sync], ["Line item", selected.line], ["Evidence", selected.evidence], ["Approval", selected.sync?.includes("Command") ? "Waiting in Command" : "No approval button here", false, "text", null, true]] };
  if (kind.includes("quote")) return { title: "Quote form", note: "Quote details, price, scope and follow-up. Sending approval stays in Command.", quote: true, fields: [["Quote", selected.title], ["Client", selected.client], ["Amount", selected.amount, false, "number"], ["Status", selected.status, false, "text", optionSets.quoteStatus], ["Scope", selected.scope, true], ["Prepared from", selected.prepared], ["Terms", selected.terms], ["Follow-up", selected.followUp], ["Next step", selected.next || "Waiting in Command", false, "text", null, true]] };
  if (kind.includes("message")) return { title: "Message thread", note: "Thread plus Churvox drafted reply. Sending approval stays in Command.", message: true, fields: [["From", selected.from], ["Channel", selected.channel], ["Client", selected.client], ["Job", selected.job], ["Subject", selected.subject], ["Priority", selected.priority], ["History", selected.history], ["Message", selected.detail, true], ["Drafted reply", selected.draft, true], ["Sending", "Waiting in Command", false, "text", null, true]] };
  if (kind.includes("person") || kind.includes("team")) return { title: "Person form", note: "Edit staff details, role, access, payroll review and worker app state.", person: true, fields: [["Name", selected.name], ["Role", selected.role, false, "text", optionSets.role], ["Access", selected.access || selected.role, false, "text", optionSets.access], ["Phone/email", selected.email || selected.phone || "Not set"], ["Worker app", selected.app], ["Current job", selected.job], ["Payroll review", selected.payroll], ["Timesheet", selected.timesheet], ["Notes", selected.notes, true]] };
  if (kind.includes("command") || kind.includes("approval")) return { title: "Approval slip", note: "Check what Churvox filled, edit if needed, then approve or park it.", approval: true, fields: [["Approval type", selected.type], ["Record", selected.title], ["Client", selected.client], ["Amount", selected.amount ? selected.amount : "Not money related"], ["Prepared status", selected.status], ["Recommended action", selected.owner, false, "text", ["Approve", "Edit", "Park"]], ["What Churvox filled", selected.filled, true], ["Evidence checked", selected.evidence, true], ["Owner check", selected.check, true], ["Edit notes", "", true]] };
  return { title: "Editable job form", note: "Edit the job like a real record: service, price, date, time, worker, status and repeat schedule.", job: true, fields: [["Job name", selected.title], ["Client", selected.client, false, "text", optionSets.client], ["Site address", selected.address], ["Service", selected.service, false, "text", optionSets.service], ["Assigned worker", selected.worker, false, "text", optionSets.worker], ["Scheduled date", selected.date, false, "date"], ["Start time", selected.time, false, "time"], ["Estimated duration", selected.duration], ["Price NZD", selected.price, false, "number"], ["Billing type", selected.billing, false, "text", optionSets.billing], ["Frequency", selected.recurring, false, "text", optionSets.recurring], ["Status", selected.status, false, "text", optionSets.status], ["Proof/photos", selected.proof], ["Issue status", selected.issue ? `Waiting in Command: ${selected.issue}` : "No issue", false, "text", null, true], ["Job notes", selected.notes, true]] };
}

function detailMode(detail) {
  if (detail.job) return "job";
  if (detail.client) return "client";
  if (detail.worker) return "worker";
  if (detail.quote) return "quote";
  if (detail.invoice) return "invoice";
  if (detail.message) return "message";
  if (detail.person) return "person";
  if (detail.approval) return "approval";
  return "record";
}

function getField(fields, ...names) {
  for (const name of names) {
    const hit = Object.keys(fields || {}).find((key) => key.toLowerCase() === String(name).toLowerCase());
    if (hit && String(fields[hit] ?? "").trim()) return fields[hit];
  }
  return "";
}

function payloadFor(mode, fields) {
  if (mode === "job") return {
    title: getField(fields, "Job name"),
    client_name: getField(fields, "Client"),
    address: getField(fields, "Site address"),
    service: getField(fields, "Service"),
    assigned_worker_name: getField(fields, "Assigned worker"),
    scheduled_date: getField(fields, "Scheduled date"),
    scheduled_time: getField(fields, "Start time"),
    duration: getField(fields, "Estimated duration"),
    price: getField(fields, "Price NZD"),
    billing: getField(fields, "Billing type"),
    recurring: getField(fields, "Frequency"),
    status: getField(fields, "Status"),
    proof: getField(fields, "Proof/photos"),
    notes: getField(fields, "Job notes"),
  };
  if (mode === "client") return {
    name: getField(fields, "Name"),
    phone: getField(fields, "Phone"),
    email: getField(fields, "Email"),
    address: getField(fields, "Address"),
    service: getField(fields, "Preferred service"),
    price: getField(fields, "Saved price"),
    schedule: getField(fields, "Preferred schedule"),
    notes: getField(fields, "Access notes"),
  };
  if (mode === "invoice") return {
    client_name: getField(fields, "Client"),
    job_title: getField(fields, "Job"),
    amount: getField(fields, "Amount"),
    due_date: getField(fields, "Due date"),
    status: getField(fields, "Status"),
    accounting_status: getField(fields, "Xero/MYOB status"),
    line_item: getField(fields, "Line item"),
    evidence: getField(fields, "Evidence"),
  };
  if (mode === "quote") return {
    title: getField(fields, "Quote"),
    client_name: getField(fields, "Client"),
    amount: getField(fields, "Amount"),
    status: getField(fields, "Status"),
    scope: getField(fields, "Scope"),
    terms: getField(fields, "Terms"),
    follow_up: getField(fields, "Follow-up"),
    next_step: getField(fields, "Next step"),
  };
  if (mode === "worker" || mode === "person") return {
    name: getField(fields, "Worker", "Name"),
    role: getField(fields, "Role/access", "Role"),
    access: getField(fields, "Access"),
    status: getField(fields, "Clock status"),
    current_job: getField(fields, "Current job"),
    gps: getField(fields, "GPS/location"),
    clock_in: getField(fields, "Clock in"),
    clock_out: getField(fields, "Clock out"),
    proof: getField(fields, "Proof/photos"),
    messages: getField(fields, "Worker messages"),
    timesheet: getField(fields, "Timesheet"),
    notes: getField(fields, "Day notes", "Notes"),
  };
  return { fields };
}

async function firstGood(calls) {
  let last = null;
  for (const call of calls) {
    try {
      const res = await call();
      if (res?.success !== false) return res;
      last = res?.error || res?.data?.detail;
    } catch (error) {
      last = error?.message;
    }
  }
  throw new Error(last || "Could not save");
}

function Drawer({ selected, onClose, api }) {
  const detail = selected ? detailFor(selected) : null;
  const [values, setValues] = React.useState({});
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState("");

  React.useEffect(() => {
    if (!selected) return;
    const next = {};
    detailFor(selected).fields.forEach(([label, value]) => { next[label] = value ?? ""; });
    setValues(next);
    setNotice("");
  }, [selected]);

  if (!selected || !detail) return null;

  const mode = detailMode(detail);
  const id = idOf(selected);
  const change = (event) => setValues((current) => ({ ...current, [event.target.name]: event.target.value }));

  async function save(action) {
    setBusy(true);
    setNotice("");
    const payload = payloadFor(mode, values);

    try {
      if (mode === "approval") {
        await firstGood([
          () => api.post(`/command/approvals/${encodeURIComponent(id || selected.id || selected.title || "approval")}/execute`, { action_id: id || selected.id, kind: "command_record", item: { ...selected, fields: values, action } }),
          () => api.post("/command/execute-approved", { kind: "command_record", item: { ...selected, fields: values, action } }),
        ]);
        setNotice(action === "park" ? "Parked in Command." : "Approved in Command.");
      } else if (mode === "job") {
        await firstGood([() => api.patch(`/jobs/${id}`, payload), () => api.patch(`/jobs/${id}/field-update`, payload), () => api.post("/command/execute-approved", { kind: "command_record", item: { type: "Saved job edit", fields: values, payload } })]);
        setNotice("Job saved.");
      } else if (mode === "client") {
        await firstGood([() => api.patch(`/clients/${id}`, payload), () => api.put(`/clients/${id}`, payload), () => api.post("/command/execute-approved", { kind: "command_record", item: { type: "Saved client edit", fields: values, payload } })]);
        setNotice("Client saved.");
      } else if (mode === "invoice") {
        await firstGood([() => api.patch(`/invoices/${id}`, payload), () => api.put(`/invoices/${id}`, payload), () => api.post("/command/execute-approved", { kind: "invoice", item: { ...selected, fields: values, payload } })]);
        setNotice("Invoice saved. Sending/sync still waits in Command.");
      } else if (mode === "quote") {
        await firstGood([() => api.patch(`/quotes/${id}`, payload), () => api.put(`/quotes/${id}`, payload), () => api.post("/command/execute-approved", { kind: "quote", item: { ...selected, fields: values, payload } })]);
        setNotice("Quote saved. Sending still waits in Command.");
      } else if (mode === "worker" || mode === "person") {
        await firstGood([() => api.patch(`/team/workers/${id}`, payload), () => api.patch(`/team/${id}`, payload), () => api.post("/command/execute-approved", { kind: "internal_record", item: { type: "Saved worker edit", fields: values, payload } })]);
        setNotice("Worker/person saved.");
      } else {
        await api.post("/command/execute-approved", { kind: "command_record", item: { type: "Saved admin note", fields: values, payload } });
        setNotice("Saved to Command.");
      }

      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated"));
    } catch (error) {
      setNotice(error?.message || "Could not save yet.");
    } finally {
      setBusy(false);
    }
  }

  return <aside className={`cocDrawer ${detail.approval ? "approvalSlip" : ""} ${detail.job ? "jobSlip" : ""}`}>
    <button type="button" onClick={onClose}>Close</button>
    <em>{selected.type || "Record"}</em>
    <h2>{detail.title}</h2>
    <p>{detail.note}</p>
    <div>{detail.fields.map(([label, value, textarea, type, options, readOnly]) => <Field key={label} name={label} label={label} value={values[label] ?? value ?? ""} textarea={textarea} type={type} options={options} readOnly={readOnly || busy} onChange={change} />)}</div>
    {notice ? <p className="drawerNotice">{notice}</p> : null}
    <div className="approvalActions">
      {detail.approval ? <>
        <button type="button" className="action" disabled={busy} onClick={() => save("approve")}>Approve</button>
        <button type="button" className="action dark" disabled={busy} onClick={() => save("edit")}>Save edit</button>
        <button type="button" className="action quiet" disabled={busy} onClick={() => save("park")}>Park</button>
      </> : <>
        <button type="button" className="action" disabled={busy} onClick={() => save("save")}>Save</button>
        <button type="button" className="action dark" disabled={busy} onClick={() => save("save_refresh")}>Save and refresh</button>
        <button type="button" className="action quiet" onClick={onClose}>Close</button>
      </>}
    </div>
  </aside>;
}

function WeekStrip({ jobs, workers, approvals, moneyDue }) {
  return <div className="dayControl"><div className="cocWeek">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => <button key={day} type="button" className={index === 0 ? "active" : ""}>{day}</button>)}</div><div className="miniStats"><Stat label="jobs" value={jobs} /><Stat label="working" value={workers} tone="blue" /><Stat label="waiting" value={approvals} tone="amber" /><Stat label="due" value={moneyDue} tone="coral" /></div></div>;
}

function Today({ data, open }) {
  const due = data.invoices.filter((invoice) => /due|draft|ready/i.test(`${invoice.status} ${invoice.sync}`)).reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
  const issues = data.jobs.filter((job) => job.issue);
  return <div className="cocPage today"><Panel title="Today Control" className="wide"><WeekStrip jobs={data.jobs.length} workers={data.workers.filter((worker) => !/clocked out/i.test(worker.status)).length} approvals={data.command.length} moneyDue={money(due)} /></Panel><Panel title="Next Owner Check" tone="amber"><h3>{data.command[0]?.type || "Nothing waiting"}</h3><p>{data.command[0]?.title || "No approval required right now."}</p><span className="chip amber">open in Command</span></Panel><Panel title="Jobs Today" className="wide"><div className="scroll">{data.jobs.slice(0, 5).map((job) => <Row key={job.id} title={`${job.time} ${job.title}`} meta={`${job.client} - ${job.worker} - ${job.status}`} onClick={() => open("Job", job)} />)}</div></Panel><Panel title="Money Due Today" tone="amber"><strong className="money">{money(due)}</strong><span className="chip amber">{data.invoices.filter((invoice) => /due/i.test(invoice.status)).length} due today</span></Panel><Panel title="Who Is Working" tone="blue"><div className="scroll">{data.workers.slice(0, 5).map((worker) => <Row key={worker.id} title={`${worker.name}: ${worker.status}`} meta={`${worker.job} - GPS ${worker.gps}`} tone="blue" onClick={() => open("Worker", worker)} />)}</div></Panel><Panel title="Messages / Photos" tone="coral">{data.messages.slice(0, 3).map((message) => <span key={message.id} className="chip coral" onClick={() => open("Message", message)}>{message.subject}</span>)}</Panel><Panel title="Problems Today" tone="red">{issues.length ? issues.slice(0, 5).map((job) => <span key={job.id} className="chip red" onClick={() => open("Job", job)}>In Command: {job.issue}</span>) : <p>No job problems right now.</p>}</Panel><Panel title="Approvals Waiting" tone="amber" className="wide">{data.command.slice(0, 5).map((item) => <Row key={item.id} title={item.type} meta={item.title} tone="amber" onClick={() => open("Command item", item)} />)}</Panel></div>;
}

function Command({ data, open, api }) {
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState("");
  const selected = data.command[0] || { type: "No admin waiting", title: "Command is clear", status: "Clear", owner: "None", client: "", amount: 0, filled: "No real approvals are waiting.", evidence: "Churvox is showing live records only.", check: "Run admin recovery sweep if you want Churvox to check for missing admin." };

  async function runSweep() {
    setBusy(true);
    setNotice("");
    const result = await api.post("/command/recovery-sweep", { source: "owner_command_paid_launch" });
    if (result?.success === false) setNotice(result.error || "Sweep could not run.");
    else setNotice(`Sweep complete. ${result?.data?.created || result?.created || 0} admin item(s) prepared.`);
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated"));
    setBusy(false);
  }

  return <div className="cocPage command"><Panel title="Waiting For Approval" tone="coral"><button type="button" className="action dark" disabled={busy} onClick={runSweep}>{busy ? "Checking admin..." : "Run admin sweep"}</button><div className="scroll">{data.command.length ? data.command.slice(0, 5).map((item) => <Row key={item.id} title={item.type} meta={`${item.title} - ${item.status}`} tone="coral" onClick={() => open("Command item", item)} />) : <p>No approvals waiting. Run the sweep to let Churvox check missing admin.</p>}</div>{notice ? <p className="drawerNotice">{notice}</p> : null}</Panel><Panel title="Filled Approval Form" tone="blue" className="wide"><h3>{selected.type}</h3><p>Churvox prepared this from job records, client memory, messages, time, photos and accounting state.</p><div className="formGrid"><Field label="Record" value={selected.title} /><Field label="Client" value={selected.client} /><Field label="Prepared status" value={selected.status} /><Field label="Recommended action" value={selected.owner} options={["Approve", "Edit", "Park"]} /><Field label="What Churvox filled" value={selected.filled} textarea /><Field label="Evidence checked" value={selected.evidence} textarea /></div></Panel><Panel title="Owner Actions" tone="amber"><div className="ownerActions"><button className="action" disabled={!data.command.length} onClick={() => data.command[0] && open("Command item", data.command[0])}>Open approval</button><button className="action dark" onClick={runSweep}>Sweep</button><button className="action quiet" disabled={!data.command.length}>Park inside slip</button></div><p>Command remains the approval desk.</p></Panel></div>;
}

function Jobs({ data, open }) {
  return <div className="cocPage jobsPage"><div className="toolbar"><button type="button">+ Add Job</button><button type="button">Recurring</button><button type="button">Dispatch Board</button></div><Panel title="Jobs" tone="blue" className="full jobBoard"><div className="jobCards">{data.jobs.slice(0, 8).map((job) => <button key={job.id} type="button" className="jobCard" onClick={() => open("Job", job)}><b>{job.title}</b><small>{job.client} - {job.worker}</small><span>{job.date} at {job.time} - {job.recurring}</span><em>{money(job.price)}</em><i>{job.issue ? `In Command: ${job.issue}` : job.status}</i></button>)}</div></Panel></div>;
}

function Clients({ data, open }) {
  const client = data.clients[0] || null;
  const clientJobs = data.jobs.filter((job) => job.client === client?.name);
  const clientQuotes = data.quotes.filter((quote) => quote.client === client?.name);
  const clientInvoices = data.invoices.filter((invoice) => invoice.client === client?.name);
  const nextJob = clientJobs[0] || data.jobs[0];
  const lastInvoice = clientInvoices[0] || data.invoices[0];
  const lastQuote = clientQuotes[0] || data.quotes[0];
  return <div className="cocPage clientsPage"><div className="toolbar"><button type="button">+ Add Client</button><button type="button">CSV Import</button><button type="button">Export</button></div><Panel title="Client List" tone="blue"><div className="scroll">{data.clients.slice(0, 6).map((item) => <Row key={item.id} title={item.name} meta={`${item.address} - ${item.service || "service saved"}`} tag={item.price} tone="blue" onClick={() => open("Client", item)} />)}</div></Panel><Panel title="Selected Client Record" tone="coral" className="wide"><div className="miniStats"><Stat label="jobs" value={client?.jobs || clientJobs.length || 0} /><Stat label="quotes" value={client?.quotes || clientQuotes.length || 0} tone="amber" /><Stat label="invoices" value={client?.invoices || clientInvoices.length || 0} tone="coral" /></div><div className="formGrid"><Field label="Name" value={client?.name} /><Field label="Phone" value={client?.phone} /><Field label="Email" value={client?.email} /><Field label="Address" value={client?.address} /><Field label="Notes / access" value={client?.notes} textarea /><Field label="Service memory" value={client?.service} /><Field label="Price memory" value={client?.price} /><Field label="Preferred schedule" value={client?.schedule || client?.service || "Not set"} /></div></Panel><Panel title="Service + Price Memory" tone="amber"><Row title={client?.service || "No service saved"} meta="default service for new jobs" tone="amber" onClick={() => open("Client", client)} /><Row title={client?.price || "No price saved"} meta="saved pricing memory" tone="amber" onClick={() => open("Client", client)} /><Row title="Notes ready before job" meta={client?.notes || "No notes saved"} tone="amber" onClick={() => open("Client", client)} /></Panel><Panel title="Job / Quote / Invoice History" tone="blue" className="wide"><div className="proofGrid"><Row title={nextJob?.title || "No job yet"} meta={`${nextJob?.date || "No date"} - ${nextJob?.status || "new"}`} tone="blue" onClick={() => nextJob && open("Job", nextJob)} /><Row title={lastQuote?.title || "No quote yet"} meta={`${lastQuote?.status || "draft"} - ${money(lastQuote?.amount || 0)}`} tone="blue" onClick={() => lastQuote && open("Quote", lastQuote)} /><Row title={lastInvoice?.number || "No invoice yet"} meta={`${lastInvoice?.status || "draft"} - ${money(lastInvoice?.amount || 0)}`} tone="blue" onClick={() => lastInvoice && open("Invoice", lastInvoice)} /></div></Panel></div>;
}

function Workers({ data, open }) {
  const active = data.workers.filter((worker) => !/clocked out/i.test(worker.status)).length;
  const proofReady = data.workers.filter((worker) => /proof|photo/i.test(`${worker.status} ${worker.proof}`)).length;
  const needsReview = data.workers.filter((worker) => /review|pending|mismatch|check/i.test(`${worker.payroll} ${worker.slip}`)).length;
  return <div className="cocPage workersPage"><Panel title="Google Maps GPS" tone="blue" className="wide"><div className="map big googleMapShell"><GoogleMap query={routeQuery(data)} label="Worker GPS Google Maps" /></div></Panel><Panel title="Worker Day Summary" tone="blue"><div className="miniStats"><Stat label="active" value={active} tone="blue" /><Stat label="proof" value={proofReady} tone="coral" /><Stat label="review" value={needsReview} tone="amber" /></div></Panel><Panel title="Worker Cards" className="full"><div className="workerCards">{data.workers.slice(0, 6).map((worker) => <button key={worker.id} type="button" className="workerCard" onClick={() => open("Worker", worker)}><b>{worker.name}</b><small>{worker.status} - {worker.job}</small><span>GPS {worker.gps} - {worker.start || "not clocked"} to {worker.end || "now"}</span><em>{worker.proof}</em><i>{worker.timesheet} - {worker.slip || worker.payroll}</i></button>)}</div></Panel><Panel title="Proof / Photos / Worker Messages" tone="coral" className="wide"><div className="proofGrid">{data.workers.slice(0, 4).map((worker) => <Row key={worker.id} title={`${worker.name}: ${worker.proof}`} meta={worker.messages} tone="coral" onClick={() => open("Worker", worker)} />)}</div></Panel><Panel title="Timesheets / Slips" tone="amber">{data.workers.slice(0, 4).map((worker) => <Row key={worker.id} title={worker.name} meta={`${worker.timesheet} - ${worker.slip || worker.payroll}`} tone="amber" onClick={() => open("Timesheet", worker)} />)}</Panel></div>;
}

function Quotes({ data, open }) {
  const stages = ["Draft", "Sent", "Viewed", "Accepted"];
  const total = data.quotes.reduce((sum, quote) => sum + Number(quote.amount || 0), 0);
  const followUps = data.quotes.filter((quote) => /ready|tomorrow|follow|convert/i.test(`${quote.followUp} ${quote.next}`));
  return <div className="cocPage quotesPage"><div className="toolbar"><button type="button">+ New Quote</button><button type="button">Follow-ups</button><button type="button">Accepted to Jobs</button></div><Panel title="Quote Pipeline" tone="amber" className="wide compactPanel"><div className="miniStats">{stages.map((stage) => <Stat key={stage} label={stage.toLowerCase()} value={data.quotes.filter((quote) => String(quote.status).toLowerCase().includes(stage.toLowerCase())).length} tone={stage === "Draft" ? "amber" : stage === "Accepted" ? "coral" : "blue"} />)}<Stat label="value" value={money(total)} tone="green" /></div><div className="quoteStageGrid">{stages.map((stage) => { const item = data.quotes.find((quote) => String(quote.status).toLowerCase().includes(stage.toLowerCase())); return <Row key={stage} title={stage} meta={item ? `${item.title} - ${item.client}` : "No record waiting"} tone={stage === "Accepted" ? "coral" : "blue"} onClick={() => item && open("Quote", item)} />; })}</div></Panel><Panel title="Ready Next" tone="coral" className="compactPanel"><div className="scroll">{followUps.slice(0, 4).map((quote) => <Row key={quote.id} title={quote.title} meta={`${quote.client} - ${quote.followUp || quote.next}`} tone="coral" onClick={() => open("Quote", quote)} />)}</div><p>Churvox prepares follow-up. Sending still waits in Command.</p></Panel><Panel title="Quote Cards" tone="blue" className="full compactPanel"><div className="workCards">{data.quotes.slice(0, 8).map((quote) => <button key={quote.id} type="button" className="workCard" onClick={() => open("Quote", quote)}><b>{quote.title}</b><small>{quote.client} - {quote.status}</small><span>{quote.scope || "Scope ready"}</span><em>{money(quote.amount)}</em><i>{quote.next || quote.followUp}</i></button>)}</div></Panel></div>;
}

function Invoices({ data, open }) {
  const totals = [["Draft", data.invoices.filter((i) => /draft/i.test(i.status)).reduce((s, i) => s + Number(i.amount || 0), 0)], ["Due today", data.invoices.filter((i) => /due/i.test(i.status)).reduce((s, i) => s + Number(i.amount || 0), 0)], ["Overdue", data.invoices.filter((i) => /overdue/i.test(i.status)).reduce((s, i) => s + Number(i.amount || 0), 0)], ["Paid", data.invoices.filter((i) => /paid/i.test(i.status)).reduce((s, i) => s + Number(i.amount || 0), 0)]];
  return <div className="cocPage invoicesPage"><Panel title="Money State" tone="amber" className="full"><div className="moneyStrip">{totals.map(([label, value]) => <span key={label}><b>{money(value)}</b><small>{label}</small></span>)}</div></Panel><Panel title="Invoice Ledger" tone="blue" className="wide"><div className="ledgerList">{data.invoices.slice(0, 8).map((invoice) => <button key={invoice.id} type="button" className="ledgerRow" onClick={() => open("Invoice", invoice)}><b>{invoice.number}</b><span>{invoice.client}</span><span>{invoice.status}</span><span>{money(invoice.amount)}</span><em>{invoice.sync}</em></button>)}</div></Panel><Panel title="Sync + Proof" tone="coral"><div className="scroll">{data.invoices.slice(0, 5).map((invoice) => <Row key={invoice.id} title={invoice.job || invoice.number} meta={`${invoice.evidence || "record ready"} - ${invoice.sync}`} tone="coral" onClick={() => open("Invoice", invoice)} />)}</div><p>Approval and sync decisions stay in Command.</p></Panel></div>;
}

function Messages({ data, open }) {
  const msg = data.messages[0] || EMPTY_MESSAGE;
  const workerMessages = data.messages.filter((message) => /worker/i.test(message.from || message.type || message.source));
  const customerMessages = data.messages.filter((message) => /customer|client/i.test(message.from || message.type || message.source));
  return <div className="cocPage messagesPage"><Panel title="Worker Messages" tone="coral">{workerMessages.length ? workerMessages.slice(0, 5).map((message) => <Row key={message.id} title={message.subject || message.title || "Worker message"} meta={`${message.client || "Client"} - ${message.priority || message.detail || message.summary || "Waiting owner review"}`} tone="coral" onClick={() => open("Message", message)} />) : <p>No worker messages yet.</p>}</Panel><Panel title="Customer Messages" tone="blue">{customerMessages.length ? customerMessages.slice(0, 5).map((message) => <Row key={message.id} title={message.subject || message.title || "Customer message"} meta={`${message.client || "Customer"} - ${message.priority || message.detail || message.summary || "No detail"}`} tone="blue" onClick={() => open("Message", message)} />) : <p>No customer messages yet.</p>}</Panel><Panel title="Opened Thread" tone="blue"><div className="bubble"><b>{msg.subject}</b><p>{msg.detail}</p><small>{msg.client} - {msg.job} - {msg.history}</small></div></Panel><Panel title="Churvox Drafted Reply" className="wide"><div className="bubble draft"><p>{msg.draft}</p><small>Reply is prepared here. Sending approval happens in Command.</small></div></Panel><Panel title="Message History" tone="amber" className="wide"><div className="proofGrid">{data.messages.length ? data.messages.slice(0, 3).map((message) => <Row key={message.id} title={message.subject || message.title || "Message"} meta={`${message.channel || message.from || "Churvox"} - ${message.history || message.created_at || "recent"}`} tone="amber" onClick={() => open("Message", message)} />) : <p>No message history yet.</p>}</div></Panel></div>;
}

function Team({ data, open }) {
  const active = data.workers.filter((worker) => /active/i.test(worker.app)).length;
  const payroll = data.workers.filter((worker) => /ready|review/i.test(worker.payroll)).length;
  const selected = data.workers[0] || EMPTY_WORKER;
  return <div className="cocPage teamPage"><Panel title="Team Pulse" tone="blue" className="wide compactPanel"><div className="miniStats"><Stat label="staff" value={data.workers.length} tone="blue" /><Stat label="app active" value={active} /><Stat label="payroll" value={payroll} tone="amber" /><Stat label="roles" value={data.workers.length ? "live" : "empty"} tone="coral" /></div><div className="teamQuickGrid">{data.workers.length ? data.workers.slice(0, 4).map((worker) => <Row key={worker.id} title={worker.name} meta={`${worker.role} - ${worker.app} - ${worker.payroll}`} tone="blue" onClick={() => open("Person", worker)} />) : <p>No staff added yet.</p>}</div></Panel><Panel title="Payroll Review" tone="amber" className="compactPanel"><div className="scroll">{data.workers.length ? data.workers.map((worker) => <Row key={worker.id} title={worker.name} meta={`${worker.timesheet} - ${worker.payroll}`} tone="amber" onClick={() => open("Person", worker)} />) : <p>No payroll review waiting.</p>}</div></Panel><Panel title="Staff Cards" tone="blue" className="wide compactPanel"><div className="workerCards">{data.workers.length ? data.workers.map((worker) => <button key={worker.id} type="button" className="workerCard" onClick={() => open("Person", worker)}><b>{worker.name}</b><small>{worker.role} - {worker.app}</small><span>{worker.job} - {worker.gps}</span><em>{worker.payroll}</em><i>{worker.timesheet} - {worker.slip}</i></button>) : <p>No staff cards yet.</p>}</div></Panel><Panel title="Editable Person Form" tone="blue" className="compactPanel"><div className="formGrid compactForm"><Field label="Name" value={selected.name} /><Field label="Role/access" value={selected.role} options={optionSets.role} /><Field label="Payroll review" value={selected.payroll} /><Field label="Worker app" value={selected.app} /><Field label="Current job" value={selected.job} /><Field label="Timesheet" value={selected.timesheet} /></div></Panel><Panel title="Roles + Access" tone="coral"><div className="teamQuickGrid">{data.workers.length ? data.workers.map((worker) => <Row key={worker.id} title={worker.name} meta={`${worker.role} - ${worker.app}`} tone="coral" onClick={() => open("Person", worker)} />) : <p>No roles assigned yet.</p>}</div></Panel></div>;
}

function Xero({ data, open }) {
  const ready = data.invoices.filter((invoice) => /draft|ready|command/i.test(`${invoice.status} ${invoice.sync}`));
  return <div className="cocPage"><Panel title="Connection" className="full"><h3>{data.xero.connected ? `Connected: ${data.xero.tenant_name || "Xero"}` : "Not connected yet"}</h3><span className="chip green">draft sync only</span></Panel><Panel title="Guardrails" tone="coral">{["No tax filing", "No payout files", "Owner-approved sync only", "Draft invoices only"].map((rule) => <Row key={rule} title={rule} meta="locked" tone="coral" />)}</Panel><Panel title="Ready To Sync" tone="blue" className="wide">{ready.slice(0, 5).map((invoice) => <Row key={invoice.id} title={invoice.number} meta={`${invoice.sync} - approval decision in Command`} tone="blue" onClick={() => open("Invoice", invoice)} />)}</Panel></div>;
}

function Settings({ user }) {
  const businessName = textOf(user?.business_name, user?.company_name, user?.business?.name, user?.name, "Not set");
  const email = textOf(user?.business_email, user?.company_email, user?.email, "Not set");
  const gst = textOf(user?.gst_rate, user?.business?.gst_rate, user?.tax_rate, "Not set");
  const country = textOf(user?.country, user?.business?.country, "Not set");
  const logo = user?.business_logo || user?.logo_url || user?.business?.logo_url ? "Uploaded" : "Not uploaded";
  const notifications = user?.notifications_enabled === false ? "Off" : "On";
  return <div className="cocPage"><Panel title="Business Controls" tone="dark" className="wide"><div className="formGrid"><Field label="Business name" value={businessName} /><Field label="Logo" value={logo} /><Field label="Email" value={email} /><Field label="GST" value={gst} /><Field label="Country" value={country} /><Field label="Notifications" value={notifications} /></div><p>These controls show live account values. Use the save drawer or full settings form to update records.</p></Panel><Panel title="Rules + Exports" tone="blue">{["Worker app rules", "CSV defaults", "Security", "Data export", "Billing controls"].map((rule) => <Row key={rule} title={rule} meta="control" tone="blue" />)}</Panel></div>;
}

function Plans() {
  const plans = [["Start", "$39", "Jobs, clients, quotes and invoices."], ["Crew", "$89", "Worker app and team records."], ["Operator", "$149", "Most Popular. Churvox prepares admin."], ["Command", "$299", "Full approval OS and accounting sync option."]];
  return <div className="cocPage"><Panel title="Plans" tone="amber" className="full"><div className="planList">{plans.map(([name, price, detail]) => <div key={name} className={name === "Operator" ? "popular" : ""}><b>{name}</b><strong>{price}</strong><small>/month + GST</small><p>{detail}</p>{name === "Operator" ? <em>Most Popular</em> : null}</div>)}</div></Panel><Panel title="Add-ons" tone="blue" className="full"><p>Command Growth Pack $99/month + GST | Accounting Sync Add-on $39/month + GST for non-Command tiers.</p></Panel></div>;
}

function Support() {
  return <div className="cocPage supportPage"><Panel title="Contact" tone="coral" className="full"><h3>hello@churvox.com</h3><button className="action">New ticket</button></Panel><Panel title="Open Support">{["Setup help", "CSV import", "Worker app", "Billing"].map((item) => <Row key={item} title={item} meta="ticket" />)}</Panel><Panel title="Short Guides" tone="blue" className="wide">{["Add client", "Approve in Command", "Import CSV", "Xero guardrails"].map((item) => <Row key={item} title={item} meta="guide" tone="blue" />)}</Panel></div>;
}

function AiGuide() {
  return <div className="cocPage aiGuidePage"><Panel title="AI Guide" tone="blue" className="wide"><h3>Churvox does the admin. You approve.</h3><p>Use Command for approval decisions, Jobs for job records, Clients for customer memory, Team for people, Payroll for timesheets, Xero for owner-approved draft sync, and Settings for business controls.</p></Panel><Panel title="First setup" tone="amber"><Row title="Add your first client" meta="Client memory starts here" tone="amber" /><Row title="Create your first job" meta="Job, price, date, worker and recurrence" tone="amber" /><Row title="Review in Command" meta="Approve, edit or park only inside Command" tone="amber" /></Panel><Panel title="Launch guardrails" tone="coral" className="wide">{["No automatic invoice sending", "No tax filing", "No bank payout files", "Only mark paid after accounting refresh confirms paid"].map((rule) => <Row key={rule} title={rule} meta="locked" tone="coral" />)}</Panel></div>;
}

function Page({ page, data, open, api, user }) {
  if (page === "aiguide") return <AiGuide />;
  if (page === "today") return <AiGuide />;
  if (page === "command") return <Command data={data} open={open} api={api} />;
  if (page === "jobs") return <Jobs data={data} open={open} />;
  if (page === "clients") return <Clients data={data} open={open} />;
  if (page === "workers") return <Workers data={data} open={open} />;
  if (page === "quotes") return <Quotes data={data} open={open} />;
  if (page === "invoices") return <Invoices data={data} open={open} />;
  if (page === "messages") return <Messages data={data} open={open} />;
  if (page === "team") return <Team data={data} open={open} />;
  if (page === "payroll") return <Team data={data} open={open} />;
  if (page === "xero") return <Xero data={data} open={open} />;
  if (page === "settings") return <Settings user={user} />;
  if (page === "plans") return <Plans />;
  return <Support />;
}

const baseCss = `
.churvoxOptionC,.churvoxOptionC *{box-sizing:border-box}.churvoxOptionC{width:100%;max-width:100vw;min-height:100vh;display:grid;overflow-x:hidden;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.churvoxOptionC button,.churvoxOptionC input,.churvoxOptionC textarea,.churvoxOptionC select{font:inherit}.cocBar{display:grid}.brand{display:flex;align-items:center}.brand i{display:block}.title,.brand,.owner{min-width:0}.title h1,.title p{margin:0}.owner{display:none!important}.owner span,.owner b,.cocRow b,.cocRow small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.cocNav{display:flex}.workspace{min-width:0;max-width:100%;overflow-x:hidden}.cocPage{display:grid;min-width:0;max-width:100%}.toolbar{display:flex;flex-wrap:wrap}.cocPanel{position:relative}.scroll{display:grid;overflow:visible}.scroll.tight{max-height:none}.cocRow{display:grid;align-items:center;border:0;cursor:pointer}.cocRow i{display:block;border-radius:50%}.cocRow em{font-style:normal}.cocWeek,.pulse,.proofGrid,.moneyStrip,.miniStats,.ownerActions,.approvalActions{display:flex;flex-wrap:wrap}.ownerActions,.approvalActions{gap:8px}.approvalActions{grid-column:1/-1;margin-top:16px;padding-top:14px;border-top:1px solid rgba(16,21,19,.12)}.approvalActions .action{min-height:42px;min-width:118px}.dayControl{display:grid;gap:12px}.miniStats{gap:8px}.miniStat{display:grid;min-width:92px;border-radius:12px;padding:10px 12px;background:#eef2ed;color:#151c19}.miniStat b{font-size:20px;line-height:1}.miniStat small{font-size:11px;font-weight:900;color:#5e6b65}.chip{display:inline-flex;align-items:center;cursor:pointer}.map{position:relative;overflow:hidden}.googleMapShell{min-height:290px}.googleMap{position:absolute;inset:0;border-radius:inherit;overflow:hidden;background:#eef2ed}.googleMap iframe{position:absolute;inset:0;width:100%;height:100%;border:0}.googleMap a{position:absolute;right:10px;bottom:10px;border-radius:999px;padding:7px 10px;background:#101513;color:#fff;font-size:11px;font-weight:950;text-decoration:none;box-shadow:0 10px 22px rgba(16,21,19,.2)}table{width:100%}.formGrid{display:grid}.cocField{display:grid}.cocField input,.cocField textarea,.cocField select{width:100%;min-height:42px;border:1px solid rgba(16,21,19,.12);border-radius:12px;padding:9px 10px;background:#fff;color:#151c19;font-weight:850}.cocField textarea{min-height:96px;resize:vertical}.cocDrawer{position:fixed}.cocDrawer>div{display:grid}.jobCards,.workerCards,.workCards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.jobCard,.workerCard,.workCard{display:grid;gap:5px;min-height:118px;border:1px solid rgba(16,21,19,.12);border-radius:14px;padding:12px;background:#fff;color:#151c19;text-align:left;cursor:pointer;box-shadow:0 10px 22px rgba(16,21,19,.05)}.jobCard b,.workerCard b,.workCard b{font-size:14px}.jobCard small,.jobCard span,.workerCard small,.workerCard span,.workCard small,.workCard span{color:#5e6b65;font-size:12px;font-weight:850}.jobCard em,.workerCard em,.workCard em{font-style:normal;font-weight:950}.jobCard i,.workerCard i,.workCard i{justify-self:start;border-radius:999px;padding:5px 8px;background:#eef2ed;color:#5e6b65;font-size:11px;font-style:normal;font-weight:950}.ledgerList{display:grid;gap:8px}.ledgerRow{display:grid;grid-template-columns:110px 1fr 110px 100px 170px;gap:10px;align-items:center;border:1px solid rgba(16,21,19,.12);border-radius:12px;padding:10px 12px;background:#fff;color:#151c19;text-align:left;cursor:pointer}.ledgerRow b{font-weight:950}.ledgerRow span,.ledgerRow em{overflow:hidden;color:#5e6b65;font-size:12px;font-style:normal;font-weight:850;text-overflow:ellipsis;white-space:nowrap}.bubble.draft{background:#fff7ee}.bubble b{display:block;margin-bottom:8px}.bubble p{margin:0 0 8px}.bubble small{color:#5e6b65;font-weight:850}.jobSlip .cocField:has(textarea),.cocDrawer .cocField:has(textarea){grid-column:1/-1}.clientsPage .wide .miniStats,.workersPage .miniStats,.quotesPage .miniStats,.teamPage .miniStats{margin-bottom:12px}.clientsPage .proofGrid,.workersPage .proofGrid,.quotesPage .proofGrid,.messagesPage .proofGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.compactPanel{min-height:0!important}.quotesPage .cocPanel,.teamPage .cocPanel{min-height:0!important}.quotesPage .workCard,.teamPage .workerCard{min-height:94px!important;padding:10px}.quoteStageGrid,.teamQuickGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.quoteStageGrid .cocRow,.teamQuickGrid .cocRow{min-height:46px}.compactForm{gap:8px}.compactForm .cocField input,.compactForm .cocField select{min-height:36px}.compactForm .cocField span{font-size:11px}@media(max-width:860px){.jobCards,.workerCards,.workCards,.quoteStageGrid,.teamQuickGrid{grid-template-columns:1fr}.ledgerRow{grid-template-columns:1fr}.clientsPage .proofGrid,.workersPage .proofGrid,.quotesPage .proofGrid,.messagesPage .proofGrid{grid-template-columns:1fr}}
`;

export default function FreshApp() {
  const { user } = useAuth();
  const api = useApi();
  const data = useOsData();
  const [page, setPage] = React.useState(pageFromLocation);
  const [selected, setSelected] = React.useState(null);
  const title = NAV.find((item) => keyOf(item) === page) || "Today";
  const subtitle = subtitles[page] || subtitles.today;

  React.useEffect(() => {
    const sync = () => setPage(pageFromLocation());
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);

  const go = (key) => {
    setPage(key);
    setSelected(null);
    if (typeof window !== "undefined") window.history.replaceState({}, "", key === "aiguide" ? "/dashboard#setupassistant" : `/dashboard#${key}`);
  };
  const open = (type, item) => setSelected({ ...item, type });

  const launchNav = ["AI Guide", "Command", "Jobs", "Clients", "Quotes", "Invoices", "Team", "Payroll", "Xero", "Settings", "Support"];

  return (
    <main className="churvoxOptionC">
      <style>{baseCss}</style>
      <header className="cocBar">
        <div className="brand"><i /><b>Churvox</b><small>does the admin</small></div>
        <div className="title"><h1>{title}</h1><p>{subtitle}</p></div>
        <div className="owner"><span>Owner checks</span><b>{user?.business_name || user?.name || "Boss view"}</b></div>
      </header>
      <nav className="cocNav" aria-label="Churvox OS navigation">
        {NAV.map((item) => {
          const key = keyOf(item);
          return <button key={key} type="button" className={page === key ? "active" : ""} onClick={() => go(key)}>{item}</button>;
        })}
      </nav>
      <div className="launchNavProof" aria-label="Launch feature navigation">
        {launchNav.map((item) => <span key={item}>{item}</span>)}
      </div>
      <section className="workspace"><Page page={page} data={data} open={open} api={api} user={user} /></section>
      <Drawer selected={selected} onClose={() => setSelected(null)} api={api} />
    </main>
  );
}
