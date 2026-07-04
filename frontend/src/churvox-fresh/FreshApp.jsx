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
        return { ...fallback, ...job, id: idOf(job) || `job-${index}`, title: textOf(job.title, job.job_title, job.job_name, job.description, fallback.title), client: textOf(job.client_name, job.customer_name, fallback.client), address: textOf(job.address, job.location, fallback.address), service: textOf(job.service, fallback.service), status: textOf(job.status, fallback.status), worker: textOf(job.assigned_worker_name, job.worker, fallback.worker), date: textOf(job.scheduled_date, fallback.date), time: textOf(job.scheduled_time, fallback.time), price: Number(job.price || fallback.price || 0), photos: Number(job.proof_count || job.photo_count || fallback.photos || 0), notes: textOf(job.notes, job.description, fallback.notes), issue: job.needs_check || job.issue };
      });
      const clients = listFrom(responses[1].value, "clients").map((client, index) => {
        const fallback = fallbackFrom(seed.clients, index);
        return { ...fallback, ...client, id: idOf(client) || `client-${index}`, name: textOf(client.name, client.client_name, client.customer_name, fallback.name) };
      });
      const workers = listFrom(responses[2].value, "team").map((worker, index) => { const fallback = seed.workers[index % Math.max(seed.workers.length, 1)] || {}; return { ...fallback, ...worker, id: idOf(worker) || `worker-${index}`, name: textOf(worker.name, worker.full_name, worker.user_name, fallback.name), role: textOf(worker.role, fallback.role), status: textOf(worker.clock_status, worker.status, fallback.status), job: textOf(worker.current_job, fallback.job), gps: textOf(worker.gps_location, worker.gps, fallback.gps), timesheet: textOf(worker.timesheet, worker.hours, fallback.timesheet), proof: textOf(worker.proof_count, worker.photos, fallback.proof), payroll: textOf(worker.payroll_status, fallback.payroll), slip: textOf(worker.slip_status, fallback.slip), messages: textOf(worker.message_count, fallback.messages) }; });
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
      setData((current) => ({ jobs: jobs.length ? jobs : current.jobs, clients: clients.length ? clients : current.clients, workers: workers.length ? workers : current.workers, quotes: quotes.length ? quotes : current.quotes, invoices: invoices.length ? invoices : current.invoices, messages: messages.length ? messages : current.messages, command: command.length ? command : current.command, xero: { connected: xeroRaw.connected || false, tenant_name: xeroRaw.tenant_name || "" } }));
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
  if (kind.includes("client")) return { title: "Client form", note: "Edit contact details, saved service memory, price memory and history.", client: true, fields: [["Name", selected.name], ["Phone", selected.phone], ["Email", selected.email], ["Address", selected.address], ["Preferred service", selected.service], ["Saved price", selected.price], ["Preferred schedule", selected.schedule], ["Access notes", selected.notes]] };
  if (kind.includes("worker") || kind.includes("timesheet")) return { title: "Worker day slip", note: "Edit the worker day: clock times, current job, GPS, proof, messages, timesheet and slip status.", worker: true, fields: [["Worker", selected.name], ["Role/access", selected.role], ["Clock status", selected.status], ["Current job", selected.job], ["GPS/location", selected.gps], ["Clock in", selected.start], ["Clock out", selected.end], ["Proof/photos", selected.proof], ["Worker messages", selected.messages], ["Timesheet", selected.timesheet], ["Day notes", selected.notes], ["Slip", selected.slip]] };
  if (kind.includes("invoice")) return { title: "Invoice form", note: "Review money, line items, due date and accounting sync state. Sync approval stays in Command.", invoice: true, fields: [["Invoice", selected.title], ["Client", selected.client], ["Job", selected.job], ["Amount", selected.amount], ["Due date", selected.due_date], ["Status", selected.status], ["Xero/MYOB status", selected.accounting_status], ["Line item", selected.line_item], ["Evidence", selected.evidence]] };
  if (kind.includes("quote")) return { title: "Quote form", note: "Quote details, price, scope and follow-up. Sending approval stays in Command.", quote: true, fields: [["Quote", selected.title], ["Client", selected.client], ["Amount", selected.amount], ["Status", selected.status], ["Scope", selected.scope], ["Terms", selected.terms], ["Follow-up", selected.follow_up], ["Next step", selected.next_step]] };
  if (kind.includes("message")) return { title: "Message thread", note: "Thread plus Churvox drafted reply. Sending approval stays in Command.", message: true, fields: [["From", selected.from], ["Subject", selected.subject], ["Channel", selected.channel], ["Priority", selected.priority], ["Detail", selected.detail], ["Draft reply", selected.draft], ["History", selected.history]] };
  if (kind.includes("person") || kind.includes("team")) return { title: "Person form", note: "Edit staff details, role, access, payroll review and worker app state.", person: true, fields: [["Name", selected.name], ["Role", selected.role], ["Access", selected.access], ["Payroll review", selected.payroll], ["Status", selected.status], ["Messages", selected.messages]] };
  if (kind.includes("command") || kind.includes("approval")) return { title: "Approval slip", note: "Check what Churvox filled, edit if needed, then approve or park it.", approval: true, fields: [["Type", selected.type], ["Title", selected.title], ["Client", selected.client], ["Amount", selected.amount], ["Notes", selected.notes], ["Evidence", selected.evidence]] };
  return { title: "Editable job form", note: "Edit the job like a real record: service, price, date, time, worker, status and repeat schedule.", job: true, fields: [["Job name", selected.title], ["Client", selected.client], ["Site address", selected.address], ["Service", selected.service], ["Price NZD", selected.price], ["Billing type", selected.billing], ["Assigned worker", selected.worker], ["Scheduled date", selected.date], ["Start time", selected.time], ["Estimated duration", selected.duration], ["Status", selected.status], ["Frequency", selected.recurring], ["Proof/photos", selected.photos], ["Job notes", selected.notes]] };
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
        await firstGood([() => api.patch(`/jobs/${id}`, payload), () => api.patch(`/jobs/${id}/field-update`, payload), () => api.post("/command/execute-approved", { kind: "command_record", item: { ...selected, fields: values, action: "save" } })]);
        setNotice("Job saved.");
      } else if (mode === "client") {
        await firstGood([() => api.patch(`/clients/${id}`, payload), () => api.put(`/clients/${id}`, payload), () => api.post("/command/execute-approved", { kind: "command_record", item: { type: "client", ...selected, fields: values, action: "save" } })]);
        setNotice("Client saved.");
      } else if (mode === "invoice") {
        await firstGood([() => api.patch(`/invoices/${id}`, payload), () => api.put(`/invoices/${id}`, payload), () => api.post("/command/execute-approved", { kind: "invoice", item: { ...selected, fields: values, action: "save" } })]);
        setNotice("Invoice saved. Sending/sync still waits in Command.");
      } else if (mode === "quote") {
        await firstGood([() => api.patch(`/quotes/${id}`, payload), () => api.put(`/quotes/${id}`, payload), () => api.post("/command/execute-approved", { kind: "quote", item: { ...selected, fields: values, action: "save" } })]);
        setNotice("Quote saved. Sending still waits in Command.");
      } else if (mode === "worker" || mode === "person") {
        await firstGood([() => api.patch(`/team/workers/${id}`, payload), () => api.patch(`/team/${id}`, payload), () => api.post("/command/execute-approved", { kind: "internal_record", item: { type: "worker", ...selected, fields: values, action: "save" } })]);
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
    <div>{detail.fields.map(([label, value, textarea, type, options, readOnly]) => <Field key={label} name={label} label={label} value={values[label] ?? value ?? ""} textarea={textarea} type={type} options={options} readOnly={readOnly} onChange={change} />)}</div>
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
  return <div className="dayControl"><div className="cocWeek">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => <button key={day} type="button" className={index === 0 ? "active" : ""}>{day}</button>)}</div><div className="cocStats"><Stat label="jobs" value={jobs} /><Stat label="crew" value={workers} /><Stat label="waiting" value={approvals} /><Stat label="money due" value={money(moneyDue)} tone="amber" /></div></div>;
}

function Today({ data, open }) {
  const due = data.invoices.filter((invoice) => /due|draft|ready/i.test(`${invoice.status} ${invoice.sync}`)).reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
  const issues = data.jobs.filter((job) => job.issue);
  return <div className="cocPage today"><Panel title="Today Control" className="wide"><WeekStrip jobs={data.jobs.length} workers={data.workers.filter((worker) => !/clocked out/i.test(worker.status)).length} approvals={data.command.length} moneyDue={due} /></Panel><Panel title="Issues" tone={issues.length ? "red" : "green"} className="wide"><div className="cocRows">{issues.length ? issues.map((job) => <Row key={job.id} title={job.title} meta={job.client} onClick={() => open("job", job)} />) : <span>No issues today</span>}</div></Panel><Panel title="Waiting approvals" tone="coral" className="wide"><div className="cocRows">{data.command.slice(0, 5).map((item) => <Row key={item.id} title={item.title} meta={item.client} onClick={() => open("approval", item)} />)}</div></Panel></div>;
}

function Command({ data, open, api }) {
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState("");
  const selected = data.command[0] || { type: "No admin waiting", title: "Command is clear", status: "Clear", owner: "None", client: "", amount: 0, filled: "No real approvals are waiting.", evidence: "Check today, jobs or clients to see what Churvox prepares." };

  async function runSweep() {
    setBusy(true);
    setNotice("");
    const result = await api.post("/command/recovery-sweep", { source: "owner_command_paid_launch" });
    if (result?.success === false) setNotice(result.error || "Sweep could not run.");
    else setNotice(`Sweep complete. ${result?.data?.created || result?.created || 0} admin item(s) prepared.`);
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated"));
    setBusy(false);
  }

  return <div className="cocPage command"><Panel title="Waiting For Approval" tone="coral"><button type="button" className="action dark" disabled={busy} onClick={runSweep}>{busy ? "Checking admin items..." : "Check for new approvals"}</button></Panel><Panel title="Approval slip" className={selected.type?.includes("No admin") ? "empty" : ""}><div className="cocRows"><Row title={selected.title} meta={selected.client} tone={selected.status === "urgent" ? "red" : "green"} onClick={() => open("approval", selected)} /></div></Panel>{notice ? <Panel title="Result">{notice}</Panel> : null}</div>;
}

function Jobs({ data, open }) {
  return <div className="cocPage jobsPage"><div className="toolbar"><button type="button">+ Add Job</button><button type="button">Recurring</button><button type="button">Dispatch Board</button></div><Panel title="Active jobs" className="full"><div className="cocRows">{data.jobs.slice(0, 10).map((job) => <Row key={job.id} title={job.title} meta={job.client} onClick={() => open("job", job)} />)}</div></Panel></div>;
}

function Clients({ data, open }) {
  const client = data.clients[0] || null;
  const clientJobs = data.jobs.filter((job) => job.client === client?.name);
  const clientQuotes = data.quotes.filter((quote) => quote.client === client?.name);
  const clientInvoices = data.invoices.filter((invoice) => invoice.client === client?.name);
  const nextJob = clientJobs[0] || data.jobs[0];
  const lastInvoice = clientInvoices[0] || data.invoices[0];
  const lastQuote = clientQuotes[0] || data.quotes[0];
  return <div className="cocPage clientsPage"><div className="toolbar"><button type="button">+ Add Client</button><button type="button">CSV Import</button><button type="button">Export</button></div><Panel title="Client list" className="full"><div className="cocRows">{data.clients.slice(0, 8).map((c) => <Row key={c.id} title={c.name} meta={`${data.jobs.filter((job) => job.client === c.name).length} jobs`} onClick={() => open("client", c)} />)}</div></Panel></div>;
}

function Workers({ data, open }) {
  const active = data.workers.filter((worker) => !/clocked out/i.test(worker.status)).length;
  const proofReady = data.workers.filter((worker) => /proof|photo/i.test(`${worker.status} ${worker.proof}`)).length;
  const needsReview = data.workers.filter((worker) => /review|pending|mismatch|check/i.test(`${worker.payroll} ${worker.slip}`)).length;
  return <div className="cocPage workersPage"><Panel title="Google Maps GPS" tone="blue" className="wide"><div className="map big googleMapShell"><GoogleMap query={routeQuery(data)} label="Worker locations" /></div></Panel><Panel title="Crew status" className="wide"><div className="miniStats"><Stat label="active now" value={active} tone="green" /><Stat label="proof ready" value={proofReady} tone="amber" /><Stat label="needs review" value={needsReview} tone="red" /></div></Panel><Panel title="Team" className="full"><div className="cocRows">{data.workers.slice(0, 8).map((worker) => <Row key={worker.id} title={worker.name} meta={worker.status} onClick={() => open("worker", worker)} />)}</div></Panel></div>;
}

function Quotes({ data, open }) {
  const stages = ["Draft", "Sent", "Viewed", "Accepted"];
  const total = data.quotes.reduce((sum, quote) => sum + Number(quote.amount || 0), 0);
  const followUps = data.quotes.filter((quote) => /ready|tomorrow|follow|convert/i.test(`${quote.followUp} ${quote.next}`));
  return <div className="cocPage quotesPage"><div className="toolbar"><button type="button">+ New Quote</button><button type="button">Follow-ups</button><button type="button">Accepted to Jobs</button></div><Panel title="Quote pipeline" className="full"><div className="cocRows"><Stat label="total value" value={money(total)} tone="green" /><Stat label="follow-ups" value={followUps.length} tone="amber" /></div></Panel><Panel title="Quotes" className="full"><div className="cocRows">{data.quotes.slice(0, 8).map((quote) => <Row key={quote.id} title={quote.title} meta={`${quote.client || "No client"} — ${money(quote.amount)}`} onClick={() => open("quote", quote)} />)}</div></Panel></div>;
}

function Invoices({ data, open }) {
  const totals = [["Draft", data.invoices.filter((i) => /draft/i.test(i.status)).reduce((s, i) => s + Number(i.amount || 0), 0)], ["Due today", data.invoices.filter((i) => /due/i.test(i.status)).reduce((s, i) => s + Number(i.amount || 0), 0)], ["Overdue", data.invoices.filter((i) => /overdue/i.test(i.status)).reduce((s, i) => s + Number(i.amount || 0), 0)], ["Paid", data.invoices.filter((i) => /paid/i.test(i.status)).reduce((s, i) => s + Number(i.amount || 0), 0)]];
  return <div className="cocPage invoicesPage"><Panel title="Money State" tone="amber" className="full"><div className="moneyStrip">{totals.map(([label, value]) => <span key={label}><b>{money(value)}</b><small>{label}</small></span>)}</div></Panel><Panel title="Invoices" className="full"><div className="cocRows">{data.invoices.slice(0, 8).map((invoice) => <Row key={invoice.id} title={invoice.title || `Invoice from ${invoice.client}`} meta={`${money(invoice.amount)} — ${invoice.status}`} onClick={() => open("invoice", invoice)} />)}</div></Panel></div>;
}

function Messages({ data, open }) {
  const msg = data.messages[0] || EMPTY_MESSAGE;
  const workerMessages = data.messages.filter((message) => /worker/i.test(message.from || message.type || message.source));
  const customerMessages = data.messages.filter((message) => /customer|client/i.test(message.from || message.type || message.source));
  return <div className="cocPage messagesPage"><Panel title="Worker Messages" tone="coral">{workerMessages.length ? workerMessages.slice(0, 5).map((message) => <Row key={message.id} title={message.subject} meta={message.from} onClick={() => open("message", message)} />) : <span>No worker messages yet</span>}</Panel><Panel title="Customer Messages" tone="coral">{customerMessages.length ? customerMessages.slice(0, 5).map((message) => <Row key={message.id} title={message.subject} meta={message.from} onClick={() => open("message", message)} />) : <span>No customer messages yet</span>}</Panel></div>;
}

function Team({ data, open }) {
  const active = data.workers.filter((worker) => /active/i.test(worker.app)).length;
  const payroll = data.workers.filter((worker) => /ready|review/i.test(worker.payroll)).length;
  const selected = data.workers[0] || EMPTY_WORKER;
  return <div className="cocPage teamPage"><Panel title="Team Pulse" tone="blue" className="wide compactPanel"><div className="miniStats"><Stat label="staff" value={data.workers.length} tone="blue" /><Stat label="app active" value={active} tone="green" /><Stat label="payroll review" value={payroll} tone="amber" /></div></Panel><Panel title="Staff" className="full"><div className="cocRows">{data.workers.slice(0, 8).map((worker) => <Row key={worker.id} title={worker.name} meta={worker.role} onClick={() => open("person", worker)} />)}</div></Panel></div>;
}

function Xero({ data, open }) {
  const ready = data.invoices.filter((invoice) => /draft|ready|command/i.test(`${invoice.status} ${invoice.sync}`));
  return <div className="cocPage"><Panel title="Connection" className="full"><h3>{data.xero.connected ? `Connected: ${data.xero.tenant_name || "Xero"}` : "Not connected yet"}</h3><span className="small">{ready.length} invoice(s) ready to sync</span></Panel></div>;
}

function Settings({ user }) {
  const businessName = textOf(user?.business_name, user?.company_name, user?.business?.name, user?.name, "Not set");
  const email = textOf(user?.business_email, user?.company_email, user?.email, "Not set");
  const gst = textOf(user?.gst_rate, user?.business?.gst_rate, user?.tax_rate, "Not set");
  const country = textOf(user?.country, user?.business?.country, "Not set");
  const logo = user?.business_logo || user?.logo_url || user?.business?.logo_url ? "Uploaded" : "Not uploaded";
  const notifications = user?.notifications_enabled === false ? "Off" : "On";
  return <div className="cocPage"><Panel title="Business Controls" tone="dark" className="wide"><div className="formGrid"><Field label="Business name" value={businessName} /><Field label="Logo" value={logo} /><Field label="Email" value={email} /><Field label="GST rate" value={gst} /><Field label="Country" value={country} /><Field label="Notifications" value={notifications} /></div></Panel></div>;
}

function Plans() {
  const plans = [["Start", "$39", "Jobs, clients, quotes and invoices."], ["Crew", "$89", "Worker app and team records."], ["Operator", "$149", "Most Popular. Churvox prepares admin."], ["Command", "$299", "Full admin engine for multi-site service businesses."]];
  return <div className="cocPage"><Panel title="Plans" tone="amber" className="full"><div className="planList">{plans.map(([name, price, detail]) => <div key={name} className={name === "Operator" ? "highlight" : ""}><b>{name}</b><em>{price}</em><span>{detail}</span></div>)}</div></Panel></div>;
}

function Support() {
  return <div className="cocPage supportPage"><Panel title="Contact" tone="coral" className="full"><h3>hello@churvox.com</h3><button className="action">New ticket</button></Panel><Panel title="Operations" tone="blue" className="full"><h3>Support Hours</h3><span>Monday–Friday, 8am–5pm NZST</span></Panel></div>;
}

function AiGuide() {
  return <div className="cocPage aiGuidePage"><Panel title="AI Guide" tone="blue" className="wide"><h3>Churvox does the admin. You approve.</h3><p>Use Command for approval decisions, Jobs for job records, Clients for relationship memory, Team for crew management and Xero for accounting.</p></Panel></div>;
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
.churvoxOptionC,.churvoxOptionC *{box-sizing:border-box}.churvoxOptionC{width:100%;max-width:100vw;min-height:100vh;display:grid;overflow-x:hidden;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;font-size:14px;line-height:1.5;color:#0f172a;background:#f8fafc;grid-template-columns:auto 1fr;grid-template-rows:auto 1fr;gap:0}.churvoxOptionC>header{grid-column:1/3;grid-row:1;display:flex;align-items:center;gap:32px;background:white;border-bottom:1px solid #e2e8f0;padding:12px 24px;box-shadow:0 1px 2px rgba(0,0,0,0.05)}.churvoxOptionC>nav{grid-column:1;grid-row:2;display:flex;flex-direction:column;width:180px;background:white;border-right:1px solid #e2e8f0;padding:12px;gap:2px;overflow-y:auto}.churvoxOptionC>section{grid-column:2;grid-row:2;padding:24px;overflow-y:auto;display:flex;flex-direction:column;gap:16px}.launchNavProof{display:none}.cocBar{flex:1;display:flex;gap:32px;align-items:center;justify-content:space-between}.cocBar .brand{display:flex;align-items:center;gap:8px;font-weight:700;font-size:16px}.cocBar .brand i{width:24px;height:24px;background:#0f172a;border-radius:4px}.cocBar .title{flex:1}.cocBar .title h1{font-size:20px;font-weight:700;margin:0}.cocBar .title p{font-size:12px;color:#64748b;margin:0}.cocBar .owner{text-align:right}.cocBar .owner span{font-size:12px;color:#64748b}.cocBar .owner b{display:block;font-size:14px}.cocNav{gap:6px !important}.cocNav button{width:100%;text-align:left;padding:8px 12px;border:none;background:transparent;border-radius:6px;cursor:pointer;font-size:13px;font-weight:500;color:#475569;transition:all 0.2s}.cocNav button:hover{background:#f1f5f9;color:#334155}.cocNav button.active{background:#3b82f6;color:white}.cocPanel{display:flex;flex-direction:column;gap:12px;border:1px solid #e2e8f0;border-radius:8px;padding:16px;background:white;box-shadow:0 1px 2px rgba(0,0,0,0.05)}.cocPanel h2{font-size:14px;font-weight:700;margin:0;color:#1e293b}.cocPanel.empty{opacity:0.5}.cocPanel.green{border-left:4px solid #10b981}.cocPanel.blue{border-left:4px solid #3b82f6}.cocPanel.amber{border-left:4px solid #f59e0b}.cocPanel.red{border-left:4px solid #ef4444}.cocPanel.coral{border-left:4px solid #ff6b6b}.cocPanel.dark{border-left:4px solid #475569}.cocPanel.wide{grid-column:1/3}.cocPanel.full{grid-column:1/3}.cocRows{display:flex;flex-direction:column;gap:8px}.cocRow{width:100%;padding:8px 12px;border:none;background:#f8fafc;border-radius:4px;cursor:pointer;text-align:left;display:flex;align-items:center;gap:8px;transition:all 0.2s;font-size:13px}.cocRow i{width:20px;height:20px;background:#cbd5e1;border-radius:3px;flex-shrink:0}.cocRow span{flex:1;display:flex;flex-direction:column;gap:2px}.cocRow b{font-weight:600;color:#0f172a}.cocRow small{font-size:11px;color:#64748b}.cocRow em{font-size:11px;background:#e0e7ff;color:#4338ca;padding:2px 6px;border-radius:3px;flex-shrink:0}.cocRow:hover{background:#e2e8f0}.cocRow.green{background:#ecfdf5}.cocRow.green i{background:#10b981}.cocRow.blue{background:#eff6ff}.cocRow.blue i{background:#3b82f6}.cocRow.amber{background:#fffbeb}.cocRow.amber i{background:#f59e0b}.cocRow.red{background:#fef2f2}.cocRow.red i{background:#ef4444}.cocRow.coral{background:#fff5f5}.cocRow.coral i{background:#ff6b6b}.cocRow.dark{background:#f8fafc}.cocRow.dark i{background:#64748b}.miniStat{display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 12px;border-radius:4px;background:#f8fafc;font-size:12px}.miniStat b{font-size:18px;font-weight:700}.miniStat.green{background:#ecfdf5;color:#047857}.miniStat.blue{background:#eff6ff;color:#0369a1}.miniStat.amber{background:#fffbeb;color:#b45309}.miniStat.red{background:#fef2f2;color:#991b1b}.miniStats{display:flex;gap:12px;justify-content:space-around;flex-wrap:wrap}.dayControl{display:flex;gap:16px;align-items:center}.cocWeek{display:flex;gap:6px}.cocWeek button{width:32px;height:32px;padding:0;border-radius:4px;border:1px solid #e2e8f0;background:white;cursor:pointer;font-weight:600;font-size:11px;color:#64748b;transition:all 0.2s}.cocWeek button:hover{background:#f1f5f9}.cocWeek button.active{background:#3b82f6;color:white;border-color:#3b82f6}.cocStats{display:flex;gap:12px}.formGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.cocField{display:flex;flex-direction:column;gap:6px;font-size:12px}.cocField span{font-weight:600;color:#475569}.cocField input,.cocField select,.cocField textarea{padding:6px 8px;border:1px solid #e2e8f0;border-radius:4px;font-size:12px;font-family:inherit}.googleMapShell{width:100%;min-height:300px}.googleMap{width:100%;border-radius:4px;overflow:hidden;position:relative}.googleMap iframe{width:100%;height:300px;border:none}.googleMap a{position:absolute;bottom:8px;right:8px;padding:4px 8px;background:white;border-radius:3px;text-decoration:none;font-size:11px;color:#0369a1;box-shadow:0 1px 2px rgba(0,0,0,0.1)}.approvalActions{display:flex;gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid #e2e8f0}.approvalActions .action{flex:1;padding:8px 12px;border:none;border-radius:4px;cursor:pointer;font-weight:600;font-size:12px;transition:all 0.2s;background:#3b82f6;color:white}.approvalActions .action:hover{background:#2563eb}.approvalActions .action.dark{background:#475569;color:white}.approvalActions .action.dark:hover{background:#334155}.approvalActions .action.quiet{background:#e2e8f0;color:#475569}.approvalActions .action.quiet:hover{background:#cbd5e1}.approvalActions .action:disabled{opacity:0.5;cursor:not-allowed}.cocDrawer{position:fixed;right:0;top:0;width:360px;height:100vh;background:white;border-left:1px solid #e2e8f0;box-shadow:-4px 0 6px rgba(0,0,0,0.1);overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;z-index:1000;transform:translateX(0);transition:transform 0.3s}.cocDrawer>button{align-self:flex-end;padding:4px 8px;border:none;background:#e2e8f0;border-radius:3px;cursor:pointer;font-size:11px;color:#475569}.cocDrawer em{font-size:11px;color:#64748b;text-transform:uppercase;font-weight:600}.cocDrawer h2{font-size:14px;font-weight:700;margin:0}.cocDrawer p{font-size:12px;color:#475569;margin:0}.drawerNotice{padding:8px;background:#ecfdf5;color:#047857;border-radius:4px;font-size:12px}.moneyStrip{display:flex;gap:12px;justify-content:space-between}.moneyStrip span{flex:1;text-align:center;padding:12px;border-radius:4px;background:#fffbeb}.moneyStrip b{display:block;font-size:16px;font-weight:700;color:#92400e}.moneyStrip small{display:block;font-size:11px;color:#b45309;margin-top:4px}.planList{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.planList>div{padding:12px;border:1px solid #e2e8f0;border-radius:4px;text-align:center}.planList>div.highlight{background:#eff6ff;border-color:#3b82f6}.planList b{display:block;font-weight:700;margin-bottom:4px}.planList em{display:block;font-size:16px;font-weight:700;color:#3b82f6;margin-bottom:4px}.planList span{display:block;font-size:12px;color:#64748b}
`;

export default function FreshApp() {
  const { user } = useAuth();
  const api = useApi();
  const data = useOsData();
  const [page, setPage] = React.useState(() => pageFromLocation());
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
