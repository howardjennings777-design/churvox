import React from "react";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";

const NAV = ["AI Guide", "Command", "Jobs", "Clients", "Quotes", "Invoices", "Messages", "Team", "Payroll", "Workers", "Xero", "Settings", "Plans", "Support"];
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
  commanddesk: "command",
  quickcreateai: "command",
  automation: "command",
  planday: "jobs",
  recurring: "jobs",
  photos: "jobs",
  job: "jobs",
  client: "clients",
  documents: "clients",
  quoteai: "quotes",
  invoicecheck: "invoices",
  payments: "invoices",
  messages: "messages",
  message: "messages",
  inbox: "messages",
  time: "payroll",
  payroll: "payroll",
  dispatch: "workers",
  routes: "workers",
  areas: "workers",
  worker: "workers",
  workers: "workers",
  accounting: "xero",
  sync: "xero",
  integrations: "xero",
  reports: "invoices",
  profit: "invoices",
  expenses: "invoices",
  launchcontrol: "settings",
  security: "settings",
  support: "support",
  help: "support",
};

const subtitles = {
  aiguide: "Daily control, setup help, and the shortest path to running today.",
  command: "The owner approval desk: open the slip, edit the filled form, approve or park.",
  jobs: "A real job board: schedule, worker, price, recurrence, proof and notes.",
  clients: "Customer memory: details, access notes, price history and every related job.",
  quotes: "Quote pipeline with follow-up and conversion decisions prepared for approval.",
  invoices: "Money control: draft, due, overdue, paid and owner-approved accounting sync.",
  messages: "Worker and customer messages with drafted replies ready for owner approval.",
  team: "Staff records, roles, access, worker app state and payroll readiness.",
  payroll: "Timesheets and worker slips for owner review. No tax filing or payout files.",
  workers: "Live worker view with GPS, job status, proof, messages and slips.",
  xero: "Accounting guardrails: draft sync only and owner-approved actions.",
  settings: "Business controls, branding, GST, exports and account rules.",
  plans: "Locked Churvox pricing and add-ons.",
  support: "Support, setup help and practical guides.",
};

const seed = {
  jobs: [],
  clients: [],
  workers: [],
  quotes: [],
  invoices: [],
  messages: [],
  command: [],
};

const optionSets = {
  status: ["assigned", "acknowledged", "in_progress", "proof_ready", "completed", "needs_check", "quote_draft"],
  quoteStatus: ["Draft", "Sent", "Viewed", "Accepted", "Converted", "Parked"],
  invoiceStatus: ["Draft", "Due today", "Overdue", "Paid", "Parked"],
  recurring: ["One-off", "Weekly", "Fortnightly", "Monthly", "Custom"],
  billing: ["Fixed price", "Hourly", "Fixed + extras", "Hourly + extras", "Package price", "Quote required"],
  service: ["Lawn mowing", "Hedge trimming", "Property tidy", "Cleaning", "Painting", "Repair", "Quote visit", "Other"],
  role: ["Owner", "Manager", "Worker", "Subcontractor", "Payroll only"],
  access: ["Full access", "Jobs only", "Worker app", "Payroll review", "No access"],
  ownerAction: ["Approve", "Save edit", "Park"],
};

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

function pageFromLocation() {
  if (typeof window === "undefined") return "aiguide";
  const path = window.location.pathname.replace(/^\/+/, "").split("/")[0].toLowerCase();
  const hash = window.location.hash.replace(/^#/, "").toLowerCase();
  const raw = hash || path;
  return aliases[raw] || (NAV.map(keyOf).includes(raw) ? raw : "aiguide");
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
  const raw = record?.id || record?._id || record?.job_id || record?.client_id || record?.invoice_id || record?.quote_id || record?.message_id || record?.user_id || "";
  if (typeof raw === "object") return String(raw.$oid || raw.oid || raw.id || raw._id || "");
  return String(raw || "");
}

function textOf(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
  }
  return "";
}

function money(value) {
  return Number(value || 0).toLocaleString("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 });
}

function uniqueOptions(values, fallback) {
  const seen = new Set();
  const out = [];
  [...(values || []), ...(fallback || [])].forEach((value) => {
    const label = String(value || "").trim();
    if (!label || seen.has(label.toLowerCase())) return;
    seen.add(label.toLowerCase());
    out.push(label);
  });
  return out.length ? out : fallback;
}

function fallbackFrom(list, index) {
  return Array.isArray(list) && list.length ? list[index % list.length] : {};
}

function useOsData() {
  const api = useApi();
  const [data, setData] = React.useState({ ...seed, xero: { connected: false, tenant_name: "" } });

  React.useEffect(() => {
    let alive = true;

    async function load() {
      const responses = await Promise.allSettled([
        api.get("/jobs"),
        api.get("/clients"),
        api.get("/team"),
        api.get("/quotes"),
        api.get("/invoices"),
        api.get("/messages"),
        api.get("/ai/actions"),
        api.get("/xero/status"),
      ]);

      if (!alive) return;

      const jobs = listFrom(responses[0]?.value, "jobs").map((job, index) => {
        const fallback = fallbackFrom(seed.jobs, index);
        return {
          ...fallback,
          ...job,
          id: idOf(job) || `job-${index}`,
          title: textOf(job.title, job.job_title, job.job_name, job.description, fallback.title, "Untitled job"),
          client: textOf(job.client_name, job.customer_name, job.client?.name, fallback.client, "No client selected"),
          worker: textOf(job.assigned_worker_name, job.worker_name, job.worker?.name, fallback.worker, "Unassigned"),
          status: textOf(job.status, job.job_status, job.stage, fallback.status, "assigned"),
          date: textOf(job.scheduled_date, job.date, job.start_date, fallback.date),
          time: textOf(job.scheduled_time, job.start_time, job.time, fallback.time),
          price: Number(job.price ?? job.amount ?? job.total ?? fallback.price ?? 0),
          issue: textOf(job.issue, job.problem, job.needs_attention, fallback.issue),
          address: textOf(job.address, job.site_address, job.client?.address, fallback.address),
          service: textOf(job.service, job.service_type, fallback.service, "Other"),
          recurring: textOf(job.recurring, job.frequency, fallback.recurring, "One-off"),
          billing: textOf(job.billing, job.billing_type, fallback.billing, "Fixed price"),
          duration: textOf(job.duration, job.estimated_duration, fallback.duration),
          proof: textOf(job.proof, job.photo_status, fallback.proof),
          notes: textOf(job.notes, job.description, fallback.notes),
        };
      });

      const clients = listFrom(responses[1]?.value, "clients").map((client, index) => {
        const fallback = fallbackFrom(seed.clients, index);
        return {
          ...fallback,
          ...client,
          id: idOf(client) || `client-${index}`,
          name: textOf(client.name, client.client_name, client.customer_name, fallback.name, "Unnamed client"),
          address: textOf(client.address, client.site_address, fallback.address),
          service: textOf(client.service, client.preferred_service, fallback.service),
          price: textOf(client.price, client.saved_price, fallback.price),
          schedule: textOf(client.schedule, client.preferred_schedule, fallback.schedule),
          phone: textOf(client.phone, client.mobile, fallback.phone),
          email: textOf(client.email, fallback.email),
          notes: textOf(client.notes, client.access_notes, fallback.notes),
        };
      });

      const workers = listFrom(responses[2]?.value, "team").map((worker, index) => {
        const fallback = fallbackFrom(seed.workers, index);
        return {
          ...fallback,
          ...worker,
          id: idOf(worker) || `worker-${index}`,
          name: textOf(worker.name, worker.full_name, worker.email, fallback.name, "Unnamed worker"),
          email: textOf(worker.email, fallback.email),
          phone: textOf(worker.phone, worker.mobile, fallback.phone),
          role: textOf(worker.role, worker.access, fallback.role, "Worker"),
          access: textOf(worker.access, worker.role, fallback.access, "Worker app"),
          status: textOf(worker.status, worker.clock_status, fallback.status, "Not clocked in"),
          job: textOf(worker.current_job, worker.job_title, fallback.job, "No job assigned"),
          app: textOf(worker.app_status, worker.invite_status, fallback.app, "Not invited"),
          payroll: textOf(worker.payroll_status, fallback.payroll, "No payroll review"),
          gps: textOf(worker.gps, worker.location, fallback.gps),
          timesheet: textOf(worker.timesheet, worker.hours_today, fallback.timesheet),
          proof: textOf(worker.proof, worker.photo_status, fallback.proof),
          messages: textOf(worker.messages, worker.message_status, fallback.messages),
          start: textOf(worker.start, worker.clock_in, worker.start_time, fallback.start),
          end: textOf(worker.end, worker.clock_out, worker.end_time, fallback.end),
          slip: textOf(worker.slip, worker.pay_slip_status, fallback.slip),
          notes: textOf(worker.notes, fallback.notes),
        };
      });

      const quotes = listFrom(responses[3]?.value, "quotes").map((quote, index) => {
        const fallback = fallbackFrom(seed.quotes, index);
        return {
          ...fallback,
          ...quote,
          id: idOf(quote) || `quote-${index}`,
          title: textOf(quote.title, quote.quote_title, quote.description, fallback.title, "Untitled quote"),
          client: textOf(quote.client_name, quote.customer_name, quote.client?.name, fallback.client, "No client selected"),
          amount: Number(quote.amount ?? quote.total ?? quote.price ?? fallback.amount ?? 0),
          status: textOf(quote.status, fallback.status, "Draft"),
          scope: textOf(quote.scope, quote.description, fallback.scope),
          terms: textOf(quote.terms, fallback.terms),
          prepared: textOf(quote.prepared, quote.source, fallback.prepared),
          followUp: textOf(quote.follow_up, quote.followUp, fallback.followUp),
          next: textOf(quote.next_step, quote.next, fallback.next),
        };
      });

      const invoices = listFrom(responses[4]?.value, "invoices").map((invoice, index) => {
        const fallback = fallbackFrom(seed.invoices, index);
        return {
          ...fallback,
          ...invoice,
          id: idOf(invoice) || `invoice-${index}`,
          number: textOf(invoice.number, invoice.invoice_number, fallback.number, `Invoice ${index + 1}`),
          client: textOf(invoice.client_name, invoice.customer_name, invoice.client?.name, fallback.client, "No client selected"),
          job: textOf(invoice.job_title, invoice.job, fallback.job),
          amount: Number(invoice.amount ?? invoice.total ?? fallback.amount ?? 0),
          due: textOf(invoice.due_date, invoice.due, fallback.due),
          status: textOf(invoice.status, fallback.status, "Draft"),
          sync: textOf(invoice.sync, invoice.accounting_status, invoice.xero_status, fallback.sync, "Not synced"),
          line: textOf(invoice.line_item, invoice.description, fallback.line),
          evidence: textOf(invoice.evidence, invoice.proof, fallback.evidence),
        };
      });

      const messages = listFrom(responses[5]?.value, "messages").map((message, index) => {
        const fallback = fallbackFrom(seed.messages, index);
        return {
          ...fallback,
          ...message,
          id: idOf(message) || `message-${index}`,
          from: textOf(message.from, message.sender, message.source, fallback.from, "Unknown"),
          subject: textOf(message.subject, message.title, fallback.subject, "Message"),
          detail: textOf(message.detail, message.body, message.message, fallback.detail),
          draft: textOf(message.draft, message.drafted_reply, fallback.draft),
          history: textOf(message.history, message.created_at, fallback.history),
          client: textOf(message.client_name, message.client, fallback.client),
          job: textOf(message.job_title, message.job, fallback.job),
          priority: textOf(message.priority, fallback.priority),
          channel: textOf(message.channel, fallback.channel),
        };
      });

      const command = listFrom(responses[6]?.value, "actions").map((item, index) => {
        const fallback = fallbackFrom(seed.command, index);
        return {
          ...fallback,
          ...item,
          id: idOf(item) || `command-${index}`,
          type: textOf(item.type, item.kind, item.action_type, fallback.type, "Approval"),
          title: textOf(item.title, item.record_title, item.summary, fallback.title, "Approval item"),
          status: textOf(item.status, item.state, fallback.status, "Waiting"),
          owner: textOf(item.owner, item.recommended_action, item.action, fallback.owner, "Approve"),
          client: textOf(item.client, item.client_name, item.customer_name, fallback.client),
          amount: Number(item.amount ?? item.total ?? fallback.amount ?? 0),
          filled: textOf(item.filled, item.summary, item.what_churvox_filled, fallback.filled),
          evidence: textOf(item.evidence, item.proof, item.evidence_checked, fallback.evidence),
          check: textOf(item.check, item.owner_check, fallback.check),
        };
      });

      const xeroRaw = responses[7]?.value?.data?.data || responses[7]?.value?.data || responses[7]?.value || {};
      setData((current) => ({
        jobs: jobs.length ? jobs : current.jobs,
        clients: clients.length ? clients : current.clients,
        workers: workers.length ? workers : current.workers,
        quotes: quotes.length ? quotes : current.quotes,
        invoices: invoices.length ? invoices : current.invoices,
        messages: messages.length ? messages : current.messages,
        command: command.length ? command : current.command,
        xero: {
          connected: Boolean(xeroRaw.connected || xeroRaw.xero_connected),
          tenant_name: textOf(xeroRaw.tenant_name, xeroRaw.tenantName, ""),
        },
      }));
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

function Row({ title, meta, tone = "green", tag, onClick, action = "Open" }) {
  return (
    <button type="button" className={`cocRow ${tone}`} onClick={onClick}>
      <i />
      <span>
        <b>{title || "Untitled"}</b>
        <small>{meta || "Open record"}</small>
      </span>
      {tag ? <em>{tag}</em> : <strong>{action}</strong>}
    </button>
  );
}

function Panel({ title, tone = "green", className = "", children, eyebrow }) {
  return (
    <section className={`cocPanel ${tone} ${className}`}>
      <header className="panelHead">
        {eyebrow ? <small>{eyebrow}</small> : null}
        <h2>{title}</h2>
      </header>
      {children}
    </section>
  );
}

function Field({ name, label, value, textarea = false, type = "text", options, readOnly = false, onChange }) {
  const fieldName = name || label;
  const common = { name: fieldName, readOnly, disabled: readOnly, onChange };
  if (options) {
    const opts = uniqueOptions([value], options);
    return (
      <label className="cocField">
        <span>{label}</span>
        <select {...common} value={value ?? ""}>
          {opts.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </label>
    );
  }
  const Tag = textarea ? "textarea" : "input";
  return (
    <label className="cocField">
      <span>{label}</span>
      <Tag {...common} type={textarea ? undefined : type} step={type === "number" ? "0.01" : undefined} value={value ?? ""} rows={textarea ? 4 : undefined} />
    </label>
  );
}

function Stat({ label, value, tone = "green" }) {
  return <span className={`miniStat ${tone}`}><b>{value}</b><small>{label}</small></span>;
}

function EmptyState({ title = "Nothing here yet", detail = "When real records exist, they will show here." }) {
  return <div className="emptyState"><b>{title}</b><p>{detail}</p></div>;
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

function blankRecord(kind, data) {
  const client = data.clients[0] || {};
  const worker = data.workers[0] || {};
  if (kind === "client") return { __new: true, type: "Client", name: "", phone: "", email: "", address: "", service: "", price: "", schedule: "One-off", notes: "" };
  if (kind === "quote") return { __new: true, type: "Quote", title: "", client: client.name || "", amount: 0, status: "Draft", scope: "", prepared: "From Churvox", terms: "Valid for 14 days", followUp: "", next: "Prepare for owner approval" };
  if (kind === "invoice") return { __new: true, type: "Invoice", number: "", client: client.name || "", job: "", amount: 0, due: "", status: "Draft", sync: "Not synced", line: "", evidence: "" };
  if (kind === "worker") return { __new: true, type: "Worker", name: "", role: "Worker", access: "Worker app", status: "Not invited", job: "", app: "Not invited", payroll: "No payroll review", gps: "", timesheet: "", proof: "", messages: "", start: "", end: "", slip: "", notes: "" };
  if (kind === "message") return { __new: true, type: "Message", from: "", channel: "Internal", client: client.name || "", job: "", subject: "", priority: "Normal", history: "", detail: "", draft: "" };
  return { __new: true, type: "Job", title: "", client: client.name || "", address: client.address || "", service: client.service || "Other", worker: worker.name || "Unassigned", date: "", time: "", duration: "", price: client.price || 0, billing: "Fixed price", recurring: "One-off", status: "assigned", proof: "", issue: "", notes: "" };
}

function detailFor(selected, data = seed) {
  const kind = String(selected?.type || "").toLowerCase();
  const clientOptions = uniqueOptions(data.clients.map((client) => client.name), ["No client selected"]);
  const workerOptions = uniqueOptions(data.workers.map((worker) => worker.name), ["Unassigned"]);

  if (kind.includes("client")) {
    return {
      title: selected.__new ? "New client form" : "Client form",
      note: "Edit contact details, saved service memory, price memory and history.",
      client: true,
      fields: [
        ["Name", selected.name],
        ["Phone", selected.phone],
        ["Email", selected.email],
        ["Address", selected.address],
        ["Preferred service", selected.service, false, "text", optionSets.service],
        ["Saved price", selected.price],
        ["Preferred schedule", selected.schedule || "One-off", false, "text", optionSets.recurring],
        ["Access notes", selected.notes, true],
        ["Churvox memory", selected.__new ? "Create this client once, then Churvox can reuse service notes, prices and access details." : `Use ${selected.price || "saved price"} for ${selected.service || "next service"}. Keep notes visible before each job.`, true, "text", null, true],
      ],
    };
  }

  if (kind.includes("worker") || kind.includes("timesheet")) {
    return {
      title: selected.__new ? "New worker form" : "Worker day slip",
      note: "Edit worker details, app access, clock times, GPS, proof, messages, timesheet and slip status.",
      worker: true,
      fields: [
        ["Worker", selected.name],
        ["Email", selected.email],
        ["Phone", selected.phone],
        ["Role/access", selected.role, false, "text", optionSets.role],
        ["Access", selected.access || selected.role, false, "text", optionSets.access],
        ["Clock status", selected.status],
        ["Current job", selected.job],
        ["GPS/location", selected.gps],
        ["Clock in", selected.start],
        ["Clock out", selected.end || ""],
        ["Break", selected.break || ""],
        ["Proof/photos", selected.proof],
        ["Worker messages", selected.messages],
        ["Timesheet", selected.timesheet],
        ["Slip/payroll status", selected.slip || selected.payroll],
        ["Worker app", selected.app],
        ["Day notes", selected.notes, true],
      ],
    };
  }

  if (kind.includes("invoice")) {
    return {
      title: selected.__new ? "New invoice draft" : "Invoice form",
      note: "Review money, line items, due date and accounting sync state. Sending and sync approval stay in Command.",
      invoice: true,
      fields: [
        ["Invoice", selected.number],
        ["Client", selected.client, false, "text", clientOptions],
        ["Job", selected.job],
        ["Amount", selected.amount, false, "number"],
        ["Due date", selected.due, false, "date"],
        ["Status", selected.status || "Draft", false, "text", optionSets.invoiceStatus],
        ["Xero/MYOB status", selected.sync || "Not synced"],
        ["Line item", selected.line],
        ["Evidence", selected.evidence, true],
        ["Approval", "Sending/sync approval happens in Command.", false, "text", null, true],
      ],
    };
  }

  if (kind.includes("quote")) {
    return {
      title: selected.__new ? "New quote draft" : "Quote form",
      note: "Edit price, scope and follow-up. Sending and conversion approval stay in Command.",
      quote: true,
      fields: [
        ["Quote", selected.title],
        ["Client", selected.client, false, "text", clientOptions],
        ["Amount", selected.amount, false, "number"],
        ["Status", selected.status || "Draft", false, "text", optionSets.quoteStatus],
        ["Scope", selected.scope, true],
        ["Prepared from", selected.prepared],
        ["Terms", selected.terms],
        ["Follow-up", selected.followUp],
        ["Next step", selected.next || "Waiting in Command", false, "text", null, true],
      ],
    };
  }

  if (kind.includes("message")) {
    return {
      title: selected.__new ? "New message note" : "Message thread",
      note: "Read the thread and edit the drafted reply. Sending approval stays in Command.",
      message: true,
      fields: [
        ["From", selected.from],
        ["Channel", selected.channel],
        ["Client", selected.client, false, "text", clientOptions],
        ["Job", selected.job],
        ["Subject", selected.subject],
        ["Priority", selected.priority],
        ["History", selected.history],
        ["Message", selected.detail, true],
        ["Drafted reply", selected.draft, true],
        ["Sending", "Waiting in Command", false, "text", null, true],
      ],
    };
  }

  if (kind.includes("person") || kind.includes("team")) {
    return {
      title: selected.__new ? "New person form" : "Person form",
      note: "Edit staff details, role, access, payroll review and worker app state.",
      person: true,
      fields: [
        ["Name", selected.name],
        ["Email", selected.email],
        ["Phone", selected.phone],
        ["Role", selected.role, false, "text", optionSets.role],
        ["Access", selected.access || selected.role, false, "text", optionSets.access],
        ["Worker app", selected.app],
        ["Current job", selected.job],
        ["Payroll review", selected.payroll],
        ["Timesheet", selected.timesheet],
        ["Notes", selected.notes, true],
      ],
    };
  }

  if (kind.includes("command") || kind.includes("approval")) {
    return {
      title: "Approval slip",
      note: "Check what Churvox filled, edit if needed, then approve or park it.",
      approval: true,
      fields: [
        ["Approval type", selected.type],
        ["Record", selected.title],
        ["Client", selected.client],
        ["Amount", selected.amount ? selected.amount : "Not money related"],
        ["Prepared status", selected.status],
        ["Recommended action", selected.owner || "Approve", false, "text", optionSets.ownerAction],
        ["What Churvox filled", selected.filled, true],
        ["Evidence checked", selected.evidence, true],
        ["Owner check", selected.check, true],
        ["Edit notes", "", true],
      ],
    };
  }

  return {
    title: selected.__new ? "New job form" : "Editable job form",
    note: "Edit the job like a real record: service, price, date, time, worker, status and repeat schedule.",
    job: true,
    fields: [
      ["Job name", selected.title],
      ["Client", selected.client, false, "text", clientOptions],
      ["Site address", selected.address],
      ["Service", selected.service || "Other", false, "text", optionSets.service],
      ["Assigned worker", selected.worker || "Unassigned", false, "text", workerOptions],
      ["Scheduled date", selected.date, false, "date"],
      ["Start time", selected.time, false, "time"],
      ["Estimated duration", selected.duration],
      ["Price NZD", selected.price, false, "number"],
      ["Billing type", selected.billing || "Fixed price", false, "text", optionSets.billing],
      ["Frequency", selected.recurring || "One-off", false, "text", optionSets.recurring],
      ["Status", selected.status || "assigned", false, "text", optionSets.status],
      ["Proof/photos", selected.proof],
      ["Issue status", selected.issue ? `Waiting in Command: ${selected.issue}` : "No issue", false, "text", null, true],
      ["Job notes", selected.notes, true],
    ],
  };
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
    invoice_number: getField(fields, "Invoice"),
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
    email: getField(fields, "Email"),
    phone: getField(fields, "Phone"),
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
    payroll_status: getField(fields, "Slip/payroll status", "Payroll review"),
    app_status: getField(fields, "Worker app"),
    notes: getField(fields, "Day notes", "Notes"),
  };
  if (mode === "message") return {
    from: getField(fields, "From"),
    channel: getField(fields, "Channel"),
    client_name: getField(fields, "Client"),
    job_title: getField(fields, "Job"),
    subject: getField(fields, "Subject"),
    priority: getField(fields, "Priority"),
    history: getField(fields, "History"),
    message: getField(fields, "Message"),
    drafted_reply: getField(fields, "Drafted reply"),
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

function Drawer({ selected, onClose, api, data }) {
  const detail = selected ? detailFor(selected, data) : null;
  const [values, setValues] = React.useState({});
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState("");

  React.useEffect(() => {
    if (!selected) return;
    const next = {};
    detailFor(selected, data).fields.forEach(([label, value]) => { next[label] = value ?? ""; });
    setValues(next);
    setNotice("");
  }, [selected, data]);

  if (!selected || !detail) return null;

  const mode = detailMode(detail);
  const id = idOf(selected);
  const isNew = Boolean(selected.__new || !id);
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
        setNotice(action === "park" ? "Parked in Command." : action === "edit" ? "Edited and saved in Command." : "Approved in Command.");
      } else if (mode === "job") {
        await firstGood(isNew
          ? [() => api.post("/jobs", payload), () => api.post("/jobs/create", payload), () => api.post("/command/execute-approved", { kind: "job", item: { type: "Created job", fields: values, payload } })]
          : [() => api.patch(`/jobs/${id}`, payload), () => api.patch(`/jobs/${id}/field-update`, payload), () => api.post("/command/execute-approved", { kind: "job", item: { type: "Saved job edit", fields: values, payload } })]);
        setNotice(isNew ? "Job created." : "Job saved.");
      } else if (mode === "client") {
        await firstGood(isNew
          ? [() => api.post("/clients", payload), () => api.post("/clients/create", payload), () => api.post("/command/execute-approved", { kind: "client", item: { type: "Created client", fields: values, payload } })]
          : [() => api.patch(`/clients/${id}`, payload), () => api.put(`/clients/${id}`, payload), () => api.post("/command/execute-approved", { kind: "client", item: { type: "Saved client edit", fields: values, payload } })]);
        setNotice(isNew ? "Client created." : "Client saved.");
      } else if (mode === "invoice") {
        await firstGood(isNew
          ? [() => api.post("/invoices", payload), () => api.post("/invoices/create", payload), () => api.post("/command/execute-approved", { kind: "invoice", item: { type: "Created invoice draft", fields: values, payload } })]
          : [() => api.patch(`/invoices/${id}`, payload), () => api.put(`/invoices/${id}`, payload), () => api.post("/command/execute-approved", { kind: "invoice", item: { ...selected, fields: values, payload } })]);
        setNotice(isNew ? "Invoice draft created. Sending/sync still waits in Command." : "Invoice saved. Sending/sync still waits in Command.");
      } else if (mode === "quote") {
        await firstGood(isNew
          ? [() => api.post("/quotes", payload), () => api.post("/quotes/create", payload), () => api.post("/command/execute-approved", { kind: "quote", item: { type: "Created quote draft", fields: values, payload } })]
          : [() => api.patch(`/quotes/${id}`, payload), () => api.put(`/quotes/${id}`, payload), () => api.post("/command/execute-approved", { kind: "quote", item: { ...selected, fields: values, payload } })]);
        setNotice(isNew ? "Quote draft created. Sending still waits in Command." : "Quote saved. Sending still waits in Command.");
      } else if (mode === "worker" || mode === "person") {
        await firstGood(isNew
          ? [() => api.post("/team/workers", payload), () => api.post("/team", payload), () => api.post("/workers", payload), () => api.post("/command/execute-approved", { kind: "internal_record", item: { type: "Created worker/person", fields: values, payload } })]
          : [() => api.patch(`/team/workers/${id}`, payload), () => api.patch(`/team/${id}`, payload), () => api.post("/command/execute-approved", { kind: "internal_record", item: { type: "Saved worker edit", fields: values, payload } })]);
        setNotice(isNew ? "Worker/person created." : "Worker/person saved.");
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

  return (
    <aside className={`cocDrawer ${detail.approval ? "approvalSlip" : ""} ${detail.job ? "jobSlip" : ""}`}>
      <button type="button" className="closeDrawer" onClick={onClose}>Close</button>
      <em>{selected.__new ? "New record" : selected.type || "Record"}</em>
      <h2>{detail.title}</h2>
      <p>{detail.note}</p>
      <div className="drawerGrid">
        {detail.fields.map(([label, value, textarea, type, options, readOnly]) => (
          <Field key={label} name={label} label={label} value={values[label] ?? value ?? ""} textarea={textarea} type={type} options={options} readOnly={readOnly || busy} onChange={change} />
        ))}
      </div>
      {notice ? <p className="drawerNotice">{notice}</p> : null}
      <div className="approvalActions">
        {detail.approval ? (
          <>
            <button type="button" className="action" disabled={busy} onClick={() => save("approve")}>Approve</button>
            <button type="button" className="action dark" disabled={busy} onClick={() => save("edit")}>Save edit</button>
            <button type="button" className="action quiet" disabled={busy} onClick={() => save("park")}>Park</button>
          </>
        ) : (
          <>
            <button type="button" className="action" disabled={busy} onClick={() => save("save")}>{isNew ? "Create record" : "Save"}</button>
            <button type="button" className="action dark" disabled={busy} onClick={() => save("save_refresh")}>{isNew ? "Create and refresh" : "Save and refresh"}</button>
            <button type="button" className="action quiet" onClick={onClose}>Close</button>
          </>
        )}
      </div>
    </aside>
  );
}

function WeekStrip({ jobs, workers, approvals, moneyDue }) {
  return (
    <div className="dayControl">
      <div className="cocWeek">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => <button key={day} type="button" className={index === 0 ? "active" : ""}>{day}</button>)}</div>
      <div className="miniStats">
        <Stat label="jobs" value={jobs} />
        <Stat label="working" value={workers} tone="blue" />
        <Stat label="waiting" value={approvals} tone="amber" />
        <Stat label="due" value={moneyDue} tone="coral" />
      </div>
    </div>
  );
}

function Today({ data, open }) {
  const due = data.invoices.filter((invoice) => /due|draft|ready/i.test(`${invoice.status} ${invoice.sync}`)).reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
  const issues = data.jobs.filter((job) => job.issue);
  const activeWorkers = data.workers.filter((worker) => !/clocked out/i.test(worker.status));
  return (
    <div className="cocPage today workbenchPage">
      <Panel title="Today run sheet" className="heroPanel wide" eyebrow="Owner view">
        <WeekStrip jobs={data.jobs.length} workers={activeWorkers.length} approvals={data.command.length} moneyDue={money(due)} />
        <div className="heroCopy">
          <h3>Run the day from here.</h3>
          <p>Open the job, check the worker, approve the admin, and keep moving.</p>
        </div>
      </Panel>
      <Panel title="Jobs today" tone="blue" className="tall">
        <div className="scrollList">
          {data.jobs.length ? data.jobs.slice(0, 7).map((job) => <Row key={job.id} title={`${job.time || "Any time"} · ${job.title}`} meta={`${job.client} · ${job.worker} · ${job.status}`} tone="blue" tag={money(job.price)} onClick={() => open("Job", job)} />) : <EmptyState title="No jobs yet" detail="Create a job and it will appear on today's run sheet." />}
        </div>
      </Panel>
      <Panel title="Owner checks" tone="coral">
        <div className="scrollList compact">
          {data.command.length ? data.command.slice(0, 5).map((item) => <Row key={item.id} title={item.type} meta={item.title} tone="coral" action="Slip" onClick={() => open("Command item", item)} />) : <EmptyState title="Command is clear" detail="Nothing needs owner approval right now." />}
        </div>
      </Panel>
      <Panel title="People working" tone="green">
        <div className="scrollList compact">
          {activeWorkers.length ? activeWorkers.slice(0, 5).map((worker) => <Row key={worker.id} title={worker.name} meta={`${worker.status} · ${worker.job} · GPS ${worker.gps || "not set"}`} tone="green" onClick={() => open("Worker", worker)} />) : <EmptyState title="No one clocked in" detail="Worker status appears here once staff use the worker app." />}
        </div>
      </Panel>
      <Panel title="Problems today" tone="red" className="wide">
        {issues.length ? <div className="proofGrid">{issues.slice(0, 4).map((job) => <Row key={job.id} title={job.title} meta={`In Command: ${job.issue}`} tone="red" action="Fix" onClick={() => open("Job", job)} />)}</div> : <EmptyState title="No problems showing" detail="Issues, mismatches and worker notes will surface here." />}
      </Panel>
    </div>
  );
}

function Command({ data, open, api }) {
  const [activeId, setActiveId] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState("");
  const active = data.command.find((item) => idOf(item) === activeId) || data.command[0] || {
    type: "No admin waiting",
    title: "Command is clear",
    status: "Clear",
    owner: "None",
    client: "",
    amount: 0,
    filled: "No real approvals are waiting.",
    evidence: "Churvox is showing live records only.",
    check: "Run admin sweep if you want Churvox to check for missing admin.",
  };

  async function runSweep() {
    setBusy(true);
    setNotice("");
    try {
      const result = await api.post("/command/recovery-sweep", { source: "owner_command_real_workbench" });
      if (result?.success === false) setNotice(result.error || "Sweep could not run.");
      else setNotice(`Sweep complete. ${result?.data?.created || result?.created || 0} admin item(s) prepared.`);
      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated"));
    } catch (error) {
      setNotice(error?.message || "Sweep could not run.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="cocPage command commandDesk">
      <Panel title="Approval queue" tone="coral" className="queuePanel" eyebrow="Click any slip">
        <button type="button" className="action dark fullButton" disabled={busy} onClick={runSweep}>{busy ? "Checking admin..." : "Run admin sweep"}</button>
        <div className="scrollList">
          {data.command.length ? data.command.slice(0, 8).map((item) => (
            <Row key={item.id} title={item.type} meta={`${item.title} · ${item.status}`} tone="coral" action="Open" onClick={() => { setActiveId(idOf(item)); open("Command item", item); }} />
          )) : <EmptyState title="No approvals waiting" detail="Run sweep to let Churvox check for missed admin." />}
        </div>
        {notice ? <p className="drawerNotice">{notice}</p> : null}
      </Panel>

      <Panel title="Working approval slip" tone="blue" className="wide slipPreview" eyebrow="Prepared by Churvox">
        <div className="slipTop">
          <span>{active.status}</span>
          <strong>{active.type}</strong>
          <button type="button" className="action" disabled={!data.command.length} onClick={() => data.command.length && open("Command item", active)}>Open full slip</button>
        </div>
        <div className="formGrid">
          <Field label="Record" value={active.title} readOnly />
          <Field label="Client" value={active.client} readOnly />
          <Field label="Amount" value={active.amount ? money(active.amount) : "Not money related"} readOnly />
          <Field label="Recommended action" value={active.owner || "Approve"} readOnly />
          <Field label="What Churvox filled" value={active.filled} textarea readOnly />
          <Field label="Evidence checked" value={active.evidence} textarea readOnly />
          <Field label="Owner check" value={active.check} textarea readOnly />
        </div>
      </Panel>

      <Panel title="Owner decision" tone="amber">
        <div className="decisionBox">
          <b>Open the slip, make changes, then approve or park.</b>
          <p>Command is the only place where approval actions happen.</p>
          <button type="button" className="action" disabled={!data.command.length} onClick={() => data.command.length && open("Command item", active)}>Approve / Edit / Park</button>
        </div>
      </Panel>
    </div>
  );
}

function Jobs({ data, open }) {
  const today = data.jobs.slice(0, 8);
  const next = today[0] || null;
  const issues = data.jobs.filter((job) => job.issue);
  return (
    <div className="cocPage jobsPage workbenchPage">
      <div className="toolbar">
        <button type="button" onClick={() => open("Job", blankRecord("job", data))}>+ Add Job</button>
        <button type="button" onClick={() => open("Job", { ...blankRecord("job", data), recurring: "Weekly" })}>Recurring Job</button>
        <button type="button" onClick={() => open("Worker", data.workers[0] || blankRecord("worker", data))}>Dispatch Board</button>
      </div>
      <Panel title="Job schedule" tone="blue" className="queuePanel tall">
        <div className="scrollList">
          {today.length ? today.map((job) => <Row key={job.id} title={`${job.date || "No date"} · ${job.time || "No time"}`} meta={`${job.title} · ${job.client} · ${job.worker}`} tone="blue" tag={money(job.price)} onClick={() => open("Job", job)} />) : <EmptyState title="No jobs yet" detail="Add a job with client, date, time, worker and price." />}
        </div>
      </Panel>
      <Panel title="Selected job form" tone="green" className="wide">
        {next ? (
          <>
            <div className="recordHeader">
              <span>{next.status}</span>
              <h3>{next.title}</h3>
              <button type="button" className="action" onClick={() => open("Job", next)}>Edit job</button>
            </div>
            <div className="formGrid">
              <Field label="Client" value={next.client} readOnly />
              <Field label="Worker" value={next.worker} readOnly />
              <Field label="Date" value={next.date} readOnly />
              <Field label="Time" value={next.time} readOnly />
              <Field label="Service" value={next.service} readOnly />
              <Field label="Price" value={money(next.price)} readOnly />
              <Field label="Frequency" value={next.recurring} readOnly />
              <Field label="Notes" value={next.notes} textarea readOnly />
            </div>
          </>
        ) : <EmptyState title="Create your first job" detail="The full job form opens with client, worker, date, price and recurrence." />}
      </Panel>
      <Panel title="Needs Command" tone="red">
        <div className="scrollList compact">
          {issues.length ? issues.slice(0, 5).map((job) => <Row key={job.id} title={job.title} meta={job.issue} tone="red" action="Open" onClick={() => open("Job", job)} />) : <EmptyState title="No job issues" detail="Anything that needs approval will be sent to Command." />}
        </div>
      </Panel>
    </div>
  );
}

function Clients({ data, open }) {
  const client = data.clients[0] || null;
  const clientJobs = data.jobs.filter((job) => job.client === client?.name);
  const clientQuotes = data.quotes.filter((quote) => quote.client === client?.name);
  const clientInvoices = data.invoices.filter((invoice) => invoice.client === client?.name);
  return (
    <div className="cocPage clientsPage workbenchPage">
      <div className="toolbar">
        <button type="button" onClick={() => open("Client", blankRecord("client", data))}>+ Add Client</button>
        <button type="button" onClick={() => open("Client", blankRecord("client", data))}>CSV Import</button>
        <button type="button" onClick={() => open("Client", client || blankRecord("client", data))}>Export / Edit</button>
      </div>
      <Panel title="Client list" tone="blue" className="queuePanel tall">
        <div className="scrollList">
          {data.clients.length ? data.clients.slice(0, 10).map((item) => <Row key={item.id} title={item.name} meta={`${item.address || "No address"} · ${item.service || "service not set"}`} tag={item.price || "Open"} tone="blue" onClick={() => open("Client", item)} />) : <EmptyState title="No clients yet" detail="Add a client or import a CSV." />}
        </div>
      </Panel>
      <Panel title="Client working record" tone="green" className="wide">
        {client ? (
          <>
            <div className="recordHeader">
              <span>{client.service || "Client"}</span>
              <h3>{client.name}</h3>
              <button type="button" className="action" onClick={() => open("Client", client)}>Edit client</button>
            </div>
            <div className="miniStats">
              <Stat label="jobs" value={client.jobs || clientJobs.length || 0} />
              <Stat label="quotes" value={client.quotes || clientQuotes.length || 0} tone="amber" />
              <Stat label="invoices" value={client.invoices || clientInvoices.length || 0} tone="coral" />
            </div>
            <div className="formGrid">
              <Field label="Phone" value={client.phone} readOnly />
              <Field label="Email" value={client.email} readOnly />
              <Field label="Address" value={client.address} readOnly />
              <Field label="Preferred schedule" value={client.schedule || "Not set"} readOnly />
              <Field label="Service memory" value={client.service} readOnly />
              <Field label="Price memory" value={client.price} readOnly />
              <Field label="Access notes" value={client.notes} textarea readOnly />
            </div>
          </>
        ) : <EmptyState title="No client selected" detail="Add or import clients, then open a record to edit." />}
      </Panel>
      <Panel title="History" tone="amber">
        <div className="scrollList compact">
          {(clientJobs.length || clientQuotes.length || clientInvoices.length) ? (
            <>
              {clientJobs.slice(0, 3).map((job) => <Row key={job.id} title={job.title} meta={`${job.date} · ${job.status}`} tone="amber" onClick={() => open("Job", job)} />)}
              {clientQuotes.slice(0, 2).map((quote) => <Row key={quote.id} title={quote.title} meta={`${quote.status} · ${money(quote.amount)}`} tone="amber" onClick={() => open("Quote", quote)} />)}
              {clientInvoices.slice(0, 2).map((invoice) => <Row key={invoice.id} title={invoice.number} meta={`${invoice.status} · ${money(invoice.amount)}`} tone="amber" onClick={() => open("Invoice", invoice)} />)}
            </>
          ) : <EmptyState title="No history yet" detail="Jobs, quotes and invoices for the selected client will show here." />}
        </div>
      </Panel>
    </div>
  );
}

function Workers({ data, open }) {
  const active = data.workers.filter((worker) => !/clocked out/i.test(worker.status)).length;
  const proofReady = data.workers.filter((worker) => /proof|photo/i.test(`${worker.status} ${worker.proof}`)).length;
  const needsReview = data.workers.filter((worker) => /review|pending|mismatch|check/i.test(`${worker.payroll} ${worker.slip}`)).length;
  return (
    <div className="cocPage workersPage workbenchPage">
      <Panel title="GPS map" tone="blue" className="wide mapPanel" eyebrow="Worker locations">
        <div className="map big googleMapShell"><GoogleMap query={routeQuery(data)} label="Worker GPS Google Maps" /></div>
      </Panel>
      <Panel title="Worker day" tone="green">
        <div className="miniStats">
          <Stat label="active" value={active} tone="blue" />
          <Stat label="proof" value={proofReady} tone="coral" />
          <Stat label="review" value={needsReview} tone="amber" />
        </div>
        <button type="button" className="action fullButton" onClick={() => open("Worker", blankRecord("worker", data))}>+ Add Worker</button>
      </Panel>
      <Panel title="Workers" className="full">
        <div className="workerGrid">
          {data.workers.length ? data.workers.slice(0, 8).map((worker) => (
            <button key={worker.id} type="button" className="workTile" onClick={() => open("Worker", worker)}>
              <b>{worker.name}</b>
              <small>{worker.status} · {worker.job}</small>
              <span>GPS {worker.gps || "not set"} · {worker.start || "not clocked"} to {worker.end || "now"}</span>
              <em>{worker.proof || "No proof yet"}</em>
              <i>{worker.timesheet || "No time"} · {worker.slip || worker.payroll}</i>
            </button>
          )) : <EmptyState title="No workers yet" detail="Add staff or subcontractors, then track jobs and slips here." />}
        </div>
      </Panel>
    </div>
  );
}

function Quotes({ data, open }) {
  const stages = ["Draft", "Sent", "Viewed", "Accepted"];
  const total = data.quotes.reduce((sum, quote) => sum + Number(quote.amount || 0), 0);
  const followUps = data.quotes.filter((quote) => /ready|tomorrow|follow|convert/i.test(`${quote.followUp} ${quote.next}`));
  return (
    <div className="cocPage quotesPage workbenchPage">
      <div className="toolbar">
        <button type="button" onClick={() => open("Quote", blankRecord("quote", data))}>+ New Quote</button>
        <button type="button" onClick={() => followUps[0] && open("Quote", followUps[0])}>Follow-ups</button>
        <button type="button" onClick={() => open("Job", blankRecord("job", data))}>Accepted to Job</button>
      </div>
      <Panel title="Quote pipeline" tone="amber" className="wide">
        <div className="miniStats">
          {stages.map((stage) => <Stat key={stage} label={stage.toLowerCase()} value={data.quotes.filter((quote) => String(quote.status).toLowerCase().includes(stage.toLowerCase())).length} tone={stage === "Draft" ? "amber" : stage === "Accepted" ? "coral" : "blue"} />)}
          <Stat label="value" value={money(total)} tone="green" />
        </div>
        <div className="pipeline">
          {stages.map((stage) => {
            const items = data.quotes.filter((quote) => String(quote.status).toLowerCase().includes(stage.toLowerCase())).slice(0, 3);
            return <div key={stage}><b>{stage}</b>{items.length ? items.map((quote) => <Row key={quote.id} title={quote.title} meta={`${quote.client} · ${money(quote.amount)}`} tone="amber" onClick={() => open("Quote", quote)} />) : <span>No records</span>}</div>;
          })}
        </div>
      </Panel>
      <Panel title="Ready next" tone="coral">
        <div className="scrollList compact">
          {followUps.length ? followUps.slice(0, 5).map((quote) => <Row key={quote.id} title={quote.title} meta={`${quote.client} · ${quote.followUp || quote.next}`} tone="coral" onClick={() => open("Quote", quote)} />) : <EmptyState title="No follow-ups waiting" detail="Churvox will prepare follow-ups here." />}
        </div>
      </Panel>
      <Panel title="Quote records" tone="blue" className="wide">
        <div className="workCards">
          {data.quotes.length ? data.quotes.slice(0, 8).map((quote) => <button key={quote.id} type="button" className="workTile" onClick={() => open("Quote", quote)}><b>{quote.title}</b><small>{quote.client} · {quote.status}</small><span>{quote.scope || "Scope ready"}</span><em>{money(quote.amount)}</em><i>{quote.next || quote.followUp || "Open quote"}</i></button>) : <EmptyState title="No quotes yet" detail="Create quote drafts and send decisions through Command." />}
        </div>
      </Panel>
    </div>
  );
}

function Invoices({ data, open }) {
  const totals = [
    ["Draft", data.invoices.filter((i) => /draft/i.test(i.status)).reduce((s, i) => s + Number(i.amount || 0), 0)],
    ["Due today", data.invoices.filter((i) => /due/i.test(i.status)).reduce((s, i) => s + Number(i.amount || 0), 0)],
    ["Overdue", data.invoices.filter((i) => /overdue/i.test(i.status)).reduce((s, i) => s + Number(i.amount || 0), 0)],
    ["Paid", data.invoices.filter((i) => /paid/i.test(i.status)).reduce((s, i) => s + Number(i.amount || 0), 0)],
  ];
  return (
    <div className="cocPage invoicesPage workbenchPage">
      <div className="toolbar">
        <button type="button" onClick={() => open("Invoice", blankRecord("invoice", data))}>+ New Invoice Draft</button>
        <button type="button" onClick={() => data.invoices[0] && open("Invoice", data.invoices[0])}>Review Drafts</button>
        <button type="button" onClick={() => data.invoices[0] && open("Invoice", data.invoices[0])}>Sync Queue</button>
      </div>
      <Panel title="Money state" tone="amber" className="full">
        <div className="moneyStrip">{totals.map(([label, value]) => <span key={label}><b>{money(value)}</b><small>{label}</small></span>)}</div>
      </Panel>
      <Panel title="Invoice ledger" tone="blue" className="wide">
        <div className="ledgerList">
          {data.invoices.length ? data.invoices.slice(0, 10).map((invoice) => <button key={invoice.id} type="button" className="ledgerRow" onClick={() => open("Invoice", invoice)}><b>{invoice.number}</b><span>{invoice.client}</span><span>{invoice.status}</span><span>{money(invoice.amount)}</span><em>{invoice.sync}</em></button>) : <EmptyState title="No invoices yet" detail="Draft invoices appear here before sending or sync approval." />}
        </div>
      </Panel>
      <Panel title="Sync + proof" tone="coral">
        <div className="scrollList compact">
          {data.invoices.length ? data.invoices.slice(0, 5).map((invoice) => <Row key={invoice.id} title={invoice.job || invoice.number} meta={`${invoice.evidence || "record ready"} · ${invoice.sync}`} tone="coral" onClick={() => open("Invoice", invoice)} />) : <EmptyState title="No sync queue" detail="Accounting sync stays draft-only and owner-approved." />}
        </div>
      </Panel>
    </div>
  );
}

function Messages({ data, open }) {
  const msg = data.messages[0] || EMPTY_MESSAGE;
  const workerMessages = data.messages.filter((message) => /worker/i.test(message.from || message.type || message.source));
  const customerMessages = data.messages.filter((message) => /customer|client/i.test(message.from || message.type || message.source));
  return (
    <div className="cocPage messagesPage workbenchPage">
      <div className="toolbar">
        <button type="button" onClick={() => open("Message", blankRecord("message", data))}>+ Message Note</button>
        <button type="button" onClick={() => msg && open("Message", msg)}>Open Draft Reply</button>
      </div>
      <Panel title="Worker messages" tone="coral">
        <div className="scrollList compact">
          {workerMessages.length ? workerMessages.slice(0, 6).map((message) => <Row key={message.id} title={message.subject || "Worker message"} meta={`${message.client || "Client"} · ${message.priority || "Waiting owner review"}`} tone="coral" onClick={() => open("Message", message)} />) : <EmptyState title="No worker messages" detail="Worker app messages and proof notes appear here." />}
        </div>
      </Panel>
      <Panel title="Customer messages" tone="blue">
        <div className="scrollList compact">
          {customerMessages.length ? customerMessages.slice(0, 6).map((message) => <Row key={message.id} title={message.subject || "Customer message"} meta={`${message.client || "Customer"} · ${message.priority || "No detail"}`} tone="blue" onClick={() => open("Message", message)} />) : <EmptyState title="No customer messages" detail="Customer messages appear here when connected." />}
        </div>
      </Panel>
      <Panel title="Opened thread" tone="green" className="wide">
        <div className="bubble">
          <b>{msg.subject}</b>
          <p>{msg.detail}</p>
          <small>{msg.client} · {msg.job} · {msg.history}</small>
        </div>
      </Panel>
      <Panel title="Churvox drafted reply" className="wide">
        <div className="bubble draft">
          <p>{msg.draft}</p>
          <small>Reply is prepared here. Sending approval happens in Command.</small>
          <button type="button" className="action" onClick={() => open("Message", msg)}>Edit reply</button>
        </div>
      </Panel>
    </div>
  );
}

function Team({ data, open }) {
  const active = data.workers.filter((worker) => /active|invited/i.test(worker.app)).length;
  const payroll = data.workers.filter((worker) => /ready|review/i.test(worker.payroll)).length;
  const selected = data.workers[0] || EMPTY_WORKER;
  return (
    <div className="cocPage teamPage workbenchPage">
      <div className="toolbar">
        <button type="button" onClick={() => open("Person", blankRecord("worker", data))}>+ Add Staff</button>
        <button type="button" onClick={() => selected && open("Person", selected)}>Roles</button>
        <button type="button" onClick={() => selected && open("Timesheet", selected)}>Payroll Review</button>
      </div>
      <Panel title="Team pulse" tone="blue" className="wide">
        <div className="miniStats">
          <Stat label="staff" value={data.workers.length} tone="blue" />
          <Stat label="app active" value={active} />
          <Stat label="payroll" value={payroll} tone="amber" />
          <Stat label="roles" value={data.workers.length ? "live" : "empty"} tone="coral" />
        </div>
      </Panel>
      <Panel title="Staff records" tone="green" className="wide">
        <div className="workerGrid">
          {data.workers.length ? data.workers.map((worker) => <button key={worker.id} type="button" className="workTile" onClick={() => open("Person", worker)}><b>{worker.name}</b><small>{worker.role} · {worker.app}</small><span>{worker.job} · {worker.gps}</span><em>{worker.payroll}</em><i>{worker.timesheet} · {worker.slip}</i></button>) : <EmptyState title="No staff yet" detail="Add workers and subcontractors here." />}
        </div>
      </Panel>
      <Panel title="Payroll review" tone="amber">
        <div className="scrollList compact">
          {data.workers.length ? data.workers.map((worker) => <Row key={worker.id} title={worker.name} meta={`${worker.timesheet} · ${worker.payroll}`} tone="amber" onClick={() => open("Timesheet", worker)} />) : <EmptyState title="No payroll review" detail="Timesheets and slips appear after worker activity." />}
        </div>
      </Panel>
    </div>
  );
}

function Xero({ data, open }) {
  const ready = data.invoices.filter((invoice) => /draft|ready|command|not synced/i.test(`${invoice.status} ${invoice.sync}`));
  return (
    <div className="cocPage xeroPage workbenchPage">
      <Panel title="Connection" className="full heroPanel">
        <h3>{data.xero.connected ? `Connected: ${data.xero.tenant_name || "Xero"}` : "Not connected yet"}</h3>
        <div className="guardrailStrip">
          <span>Draft sync only</span>
          <span>Owner approved</span>
          <span>No tax filing</span>
          <span>No payout files</span>
        </div>
      </Panel>
      <Panel title="Ready to sync" tone="blue" className="wide">
        <div className="scrollList">
          {ready.length ? ready.slice(0, 7).map((invoice) => <Row key={invoice.id} title={invoice.number} meta={`${invoice.client} · ${invoice.sync} · approval decision in Command`} tone="blue" tag={money(invoice.amount)} onClick={() => open("Invoice", invoice)} />) : <EmptyState title="No invoices ready" detail="Draft invoices ready for owner-approved sync will show here." />}
        </div>
      </Panel>
      <Panel title="Guardrails" tone="coral">
        {["No automatic invoice sending", "No tax filing", "No bank payout files", "Only mark paid after accounting refresh confirms paid"].map((rule) => <Row key={rule} title={rule} meta="locked" tone="coral" action="Locked" />)}
      </Panel>
    </div>
  );
}

function Settings({ user }) {
  const businessName = textOf(user?.business_name, user?.company_name, user?.business?.name, user?.name, "Not set");
  const email = textOf(user?.business_email, user?.company_email, user?.email, "Not set");
  const gst = textOf(user?.gst_rate, user?.business?.gst_rate, user?.tax_rate, "Not set");
  const country = textOf(user?.country, user?.business?.country, "New Zealand");
  const logo = (user?.business_logo || user?.logo_url || user?.business?.logo_url) ? "Uploaded" : "Not uploaded";
  const notifications = user?.notifications_enabled === false ? "Off" : "On";
  return (
    <div className="cocPage settingsPage workbenchPage">
      <Panel title="Business controls" tone="green" className="wide">
        <div className="formGrid">
          <Field label="Business name" value={businessName} readOnly />
          <Field label="Logo" value={logo} readOnly />
          <Field label="Email" value={email} readOnly />
          <Field label="GST" value={gst} readOnly />
          <Field label="Country" value={country} readOnly />
          <Field label="Notifications" value={notifications} readOnly />
        </div>
      </Panel>
      <Panel title="Rules + exports" tone="blue" className="wide">
        <div className="settingsGrid">{["Worker app rules", "CSV defaults", "Security", "Data export", "Billing controls", "Business branding"].map((rule) => <Row key={rule} title={rule} meta="control" tone="blue" action="Open" />)}</div>
      </Panel>
    </div>
  );
}

function Plans() {
  const plans = [
    ["Start", "$39", "Jobs, clients, quotes and invoices."],
    ["Crew", "$89", "Worker app and team records."],
    ["Operator", "$149", "Most Popular. Churvox prepares admin."],
    ["Command", "$299", "Full approval OS and accounting sync option."],
  ];
  return (
    <div className="cocPage plansPage">
      <Panel title="Plans" tone="amber" className="full">
        <div className="planList">{plans.map(([name, price, detail]) => <div key={name} className={name === "Operator" ? "popular" : ""}><b>{name}</b><strong>{price}</strong><small>/month + GST</small><p>{detail}</p>{name === "Operator" ? <em>Most Popular</em> : null}</div>)}</div>
      </Panel>
      <Panel title="Add-ons" tone="blue" className="full"><p>Command Growth Pack $99/month + GST | Accounting Sync Add-on $39/month + GST for non-Command tiers.</p></Panel>
    </div>
  );
}

function Support() {
  return (
    <div className="cocPage supportPage">
      <Panel title="Contact" tone="coral" className="full"><h3>hello@churvox.com</h3><button className="action">New ticket</button></Panel>
      <Panel title="Open support">{["Setup help", "CSV import", "Worker app", "Billing"].map((item) => <Row key={item} title={item} meta="ticket" />)}</Panel>
      <Panel title="Short guides" tone="blue" className="wide">{["Add client", "Approve in Command", "Import CSV", "Xero guardrails"].map((item) => <Row key={item} title={item} meta="guide" tone="blue" />)}</Panel>
    </div>
  );
}

function AiGuide({ data, open }) {
  return (
    <div className="cocPage aiGuidePage workbenchPage">
      <Panel title="Churvox control room" tone="blue" className="heroPanel wide">
        <h3>Churvox does the admin. You approve.</h3>
        <p>Run today, open real records, and use Command only when an owner decision is needed.</p>
        <div className="guardrailStrip">
          <span>Less thinking</span>
          <span>Fewer clicks</span>
          <span>Owner approval</span>
          <span>Worker proof</span>
        </div>
      </Panel>
      <Panel title="Start here" tone="amber">
        <Row title="Add your first client" meta="Client memory starts here" tone="amber" onClick={() => open("Client", blankRecord("client", data))} />
        <Row title="Create your first job" meta="Job, price, date, worker and recurrence" tone="amber" onClick={() => open("Job", blankRecord("job", data))} />
        <Row title="Review in Command" meta="Approve, edit or park only inside Command" tone="amber" onClick={() => data.command[0] && open("Command item", data.command[0])} />
      </Panel>
      <Panel title="Live areas" tone="green" className="wide">
        <div className="miniStats">
          <Stat label="jobs" value={data.jobs.length} />
          <Stat label="clients" value={data.clients.length} tone="blue" />
          <Stat label="quotes" value={data.quotes.length} tone="amber" />
          <Stat label="invoices" value={data.invoices.length} tone="coral" />
          <Stat label="approvals" value={data.command.length} tone="red" />
        </div>
      </Panel>
      <Panel title="Launch guardrails" tone="coral" className="wide">{["No automatic invoice sending", "No tax filing", "No bank payout files", "Only mark paid after accounting refresh confirms paid"].map((rule) => <Row key={rule} title={rule} meta="locked" tone="coral" action="Locked" />)}</Panel>
    </div>
  );
}

function Page({ page, data, open, api, user }) {
  if (page === "aiguide") return <AiGuide data={data} open={open} />;
  if (page === "today") return <Today data={data} open={open} />;
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
.churvoxOptionC,.churvoxOptionC *{box-sizing:border-box}
.churvoxOptionC{--ink:#121715;--muted:#64716b;--line:rgba(18,23,21,.12);--paper:#f5f3ef;--card:#fffdfa;--orange:#f97316;--orange2:#ffb15c;--green:#1f7a4d;--blue:#2563eb;--amber:#b7791f;--red:#dc2626;min-height:100vh;width:100%;max-width:100vw;overflow-x:hidden;background:radial-gradient(circle at top left,rgba(249,115,22,.12),transparent 36%),linear-gradient(180deg,#fffaf4 0%,#f3f0ea 52%,#ebe8e1 100%);color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.churvoxOptionC button,.churvoxOptionC input,.churvoxOptionC textarea,.churvoxOptionC select{font:inherit}
.cocBar{position:sticky;top:0;z-index:30;display:grid;grid-template-columns:minmax(170px,230px) minmax(0,1fr) auto;gap:18px;align-items:center;padding:18px 24px;background:linear-gradient(135deg,#101513 0%,#1b1f1c 45%,#3a1d0a 72%,#f97316 140%);color:white;box-shadow:0 22px 55px rgba(16,21,19,.22);overflow:hidden}
.cocBar:before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(135deg,rgba(255,255,255,.08) 0 1px,transparent 1px 14px);opacity:.32;pointer-events:none}
.cocBar>*{position:relative;z-index:1}
.brand{display:flex;align-items:center;gap:10px;min-width:0}
.brand i{width:34px;height:34px;border-radius:12px;background:linear-gradient(135deg,#f97316,#ffcc80);box-shadow:0 10px 25px rgba(249,115,22,.4)}
.brand b{font-size:20px;font-weight:1000;letter-spacing:-.04em}
.brand small{display:block;color:#ffd7b0;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.08em}
.title,.brand,.owner{min-width:0}
.title h1{margin:0;font-size:26px;line-height:1;font-weight:1000;letter-spacing:-.05em}
.title p{margin:5px 0 0;color:rgba(255,255,255,.78);font-size:13px;font-weight:750}
.owner{display:none!important}
.cocNav{position:sticky;top:70px;z-index:25;display:flex;gap:8px;align-items:center;max-width:100%;overflow-x:auto;padding:10px 18px;background:rgba(255,250,244,.92);backdrop-filter:blur(16px);border-bottom:1px solid var(--line)}
.cocNav button{flex:0 0 auto;border:1px solid transparent;border-radius:999px;padding:10px 14px;background:transparent;color:#3f4a45;font-size:13px;font-weight:950;cursor:pointer}
.cocNav button.active{background:#101513;color:#fff;box-shadow:0 9px 20px rgba(16,21,19,.18)}
.launchNavProof{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}
.workspace{min-width:0;max-width:100%;overflow-x:hidden;padding:18px;min-height:calc(100vh - 134px)}
.cocPage{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:14px;min-width:0;max-width:100%}
.cocPanel{grid-column:span 4;position:relative;min-height:160px;padding:16px;border:1px solid rgba(18,23,21,.10);border-radius:24px;background:rgba(255,253,250,.88);box-shadow:0 18px 40px rgba(18,23,21,.08);overflow:hidden}
.cocPanel:before{content:"";position:absolute;inset:0 0 auto 0;height:4px;background:linear-gradient(90deg,var(--green),transparent);opacity:.8}
.cocPanel.blue:before{background:linear-gradient(90deg,var(--blue),transparent)}
.cocPanel.amber:before{background:linear-gradient(90deg,var(--amber),transparent)}
.cocPanel.coral:before,.cocPanel.red:before{background:linear-gradient(90deg,var(--orange),var(--red),transparent)}
.cocPanel.dark:before{background:linear-gradient(90deg,#101513,var(--orange),transparent)}
.cocPanel.wide{grid-column:span 8}
.cocPanel.full{grid-column:1/-1}
.cocPanel.tall{min-height:430px}
.panelHead{display:grid;gap:2px;margin:0 0 12px}
.panelHead small{color:var(--orange);font-size:11px;font-weight:1000;text-transform:uppercase;letter-spacing:.08em}
.panelHead h2{margin:0;font-size:18px;font-weight:1000;letter-spacing:-.035em}
.heroPanel{background:linear-gradient(135deg,#fffdfa,#fff2e4)}
.heroPanel h3{margin:0 0 6px;font-size:26px;letter-spacing:-.05em}
.heroPanel p{margin:0;color:var(--muted);font-weight:750}
.heroCopy{margin-top:14px;padding-top:14px;border-top:1px solid var(--line)}
.toolbar{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:8px}
.toolbar button,.action{border:0;border-radius:999px;padding:10px 14px;background:linear-gradient(135deg,#f97316,#ffb15c);color:#1b1108;font-weight:1000;cursor:pointer;box-shadow:0 10px 24px rgba(249,115,22,.25)}
.toolbar button:nth-child(2),.action.dark{background:#101513;color:white;box-shadow:0 10px 24px rgba(16,21,19,.2)}
.toolbar button:nth-child(3),.action.quiet{background:#fff;border:1px solid var(--line);color:#151c19;box-shadow:none}
button:disabled{opacity:.45;cursor:not-allowed}
.fullButton{width:100%;justify-content:center;margin-bottom:10px}
.scrollList{display:grid;gap:9px;max-height:520px;overflow:auto;padding-right:4px}
.scrollList.compact{max-height:340px}
.cocRow{display:grid;grid-template-columns:12px minmax(0,1fr) auto;gap:10px;align-items:center;width:100%;min-height:58px;border:1px solid rgba(18,23,21,.1);border-radius:16px;padding:10px;background:#fff;color:var(--ink);text-align:left;cursor:pointer;box-shadow:0 10px 24px rgba(18,23,21,.045)}
.cocRow:hover{border-color:rgba(249,115,22,.45);transform:translateY(-1px)}
.cocRow i{width:10px;height:10px;border-radius:50%;background:var(--green)}
.cocRow.blue i{background:var(--blue)}.cocRow.amber i{background:var(--amber)}.cocRow.coral i,.cocRow.red i{background:var(--orange)}
.cocRow b,.cocRow small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cocRow b{font-size:13px;font-weight:1000}.cocRow small{margin-top:2px;color:var(--muted);font-size:12px;font-weight:800}
.cocRow em,.cocRow strong{font-style:normal;border-radius:999px;padding:6px 9px;background:#f2f0ea;color:#3f4a45;font-size:11px;font-weight:1000;white-space:nowrap}
.miniStats{display:flex;flex-wrap:wrap;gap:8px}.miniStat{display:grid;min-width:96px;border-radius:16px;padding:12px;background:#f0f4ef;color:#151c19}.miniStat b{font-size:22px;line-height:1;font-weight:1000}.miniStat small{margin-top:5px;color:var(--muted);font-size:11px;font-weight:900;text-transform:uppercase}
.miniStat.blue{background:#eef4ff}.miniStat.amber{background:#fff7e5}.miniStat.coral,.miniStat.red{background:#fff0e9}
.dayControl{display:grid;gap:14px}.cocWeek{display:flex;flex-wrap:wrap;gap:7px}.cocWeek button{border:1px solid var(--line);border-radius:12px;background:#fff;padding:10px 12px;font-weight:1000}.cocWeek .active{background:#101513;color:#fff}
.formGrid,.drawerGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.cocField{display:grid;gap:6px}.cocField span{color:#53605a;font-size:11px;font-weight:1000;text-transform:uppercase;letter-spacing:.05em}
.cocField input,.cocField textarea,.cocField select{width:100%;min-height:44px;border:1px solid rgba(18,23,21,.13);border-radius:14px;padding:10px 11px;background:#fff;color:#151c19;font-weight:850}
.cocField textarea{min-height:104px;resize:vertical}.cocField input:disabled,.cocField textarea:disabled,.cocField select:disabled{background:#f6f4ef;color:#45504a}
.drawerGrid .cocField:nth-last-child(1),.drawerGrid .cocField:nth-last-child(2),.formGrid .cocField:has(textarea),.drawerGrid .cocField:has(textarea){grid-column:1/-1}
.cocDrawer{position:fixed;z-index:60;right:18px;top:104px;bottom:18px;width:min(760px,calc(100vw - 36px));overflow:auto;padding:22px;border:1px solid rgba(18,23,21,.14);border-radius:28px;background:#fffdfa;box-shadow:0 30px 90px rgba(16,21,19,.28)}
.cocDrawer.approvalSlip{background:linear-gradient(180deg,#fffdfa,#fff3e6)}
.closeDrawer{position:absolute;right:16px;top:16px;border:1px solid var(--line);border-radius:999px;background:#fff;padding:8px 12px;font-weight:1000;cursor:pointer}
.cocDrawer>em{display:inline-flex;margin-bottom:8px;border-radius:999px;padding:6px 10px;background:#101513;color:#fff;font-style:normal;font-size:11px;font-weight:1000;text-transform:uppercase}
.cocDrawer h2{margin:0 50px 4px 0;font-size:28px;font-weight:1000;letter-spacing:-.05em}.cocDrawer p{margin:0 0 14px;color:var(--muted);font-weight:750}
.approvalActions{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px;padding-top:14px;border-top:1px solid var(--line)}
.drawerNotice{border-radius:14px;padding:10px 12px;background:#fff7e5;color:#6d4210;font-weight:900}
.recordHeader,.slipTop{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}.recordHeader h3,.slipTop strong{margin:0;font-size:24px;font-weight:1000;letter-spacing:-.04em}.recordHeader span,.slipTop span{border-radius:999px;padding:7px 10px;background:#eef2ed;color:#3f4a45;font-size:11px;font-weight:1000;text-transform:uppercase}
.decisionBox{display:grid;gap:10px}.decisionBox b{font-size:18px}.decisionBox p{margin:0;color:var(--muted);font-weight:800}
.emptyState{border:1px dashed rgba(18,23,21,.18);border-radius:16px;padding:16px;background:rgba(255,255,255,.6)}.emptyState b{display:block;font-weight:1000}.emptyState p{margin:6px 0 0;color:var(--muted);font-weight:750}
.proofGrid,.settingsGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.workerGrid,.workCards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.workTile{display:grid;gap:6px;min-height:124px;border:1px solid rgba(18,23,21,.12);border-radius:18px;padding:13px;background:#fff;color:#151c19;text-align:left;cursor:pointer;box-shadow:0 12px 26px rgba(18,23,21,.05)}
.workTile b{font-size:15px;font-weight:1000}.workTile small,.workTile span{color:var(--muted);font-size:12px;font-weight:850}.workTile em,.workTile i{justify-self:start;border-radius:999px;padding:5px 8px;background:#f2f0ea;color:#3f4a45;font-size:11px;font-style:normal;font-weight:1000}
.pipeline{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:12px}.pipeline>div{display:grid;gap:8px;align-content:start;min-height:170px;border:1px solid var(--line);border-radius:18px;padding:10px;background:rgba(255,255,255,.55)}.pipeline>div>b{font-weight:1000}.pipeline>div>span{color:var(--muted);font-size:12px;font-weight:850}
.ledgerList{display:grid;gap:8px}.ledgerRow{display:grid;grid-template-columns:110px 1fr 110px 100px 170px;gap:10px;align-items:center;border:1px solid rgba(18,23,21,.12);border-radius:14px;padding:11px 12px;background:#fff;color:#151c19;text-align:left;cursor:pointer}.ledgerRow b{font-weight:1000}.ledgerRow span,.ledgerRow em{overflow:hidden;color:var(--muted);font-size:12px;font-style:normal;font-weight:850;text-overflow:ellipsis;white-space:nowrap}
.moneyStrip{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.moneyStrip span{display:grid;border-radius:18px;padding:14px;background:#fff}.moneyStrip b{font-size:22px;font-weight:1000}.moneyStrip small{color:var(--muted);font-weight:900;text-transform:uppercase}
.map{position:relative;overflow:hidden}.googleMapShell{min-height:330px;border-radius:22px;background:#eef2ed}.googleMap{position:absolute;inset:0;border-radius:inherit;overflow:hidden;background:#eef2ed}.googleMap iframe{position:absolute;inset:0;width:100%;height:100%;border:0}.googleMap a{position:absolute;right:12px;bottom:12px;border-radius:999px;padding:8px 11px;background:#101513;color:#fff;font-size:11px;font-weight:1000;text-decoration:none;box-shadow:0 10px 22px rgba(16,21,19,.2)}
.bubble{border-radius:20px;padding:16px;background:#fff;border:1px solid var(--line)}.bubble.draft{background:#fff4e8}.bubble b{display:block;margin-bottom:8px}.bubble p{margin:0 0 8px;color:#222;font-weight:750}.bubble small{display:block;color:var(--muted);font-weight:850}.bubble .action{margin-top:12px}
.guardrailStrip{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}.guardrailStrip span{border-radius:999px;padding:8px 10px;background:#101513;color:#fff;font-size:11px;font-weight:1000;text-transform:uppercase}
.planList{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.planList>div{display:grid;gap:6px;border:1px solid var(--line);border-radius:20px;padding:16px;background:#fff}.planList b{font-size:18px;font-weight:1000}.planList strong{font-size:30px;letter-spacing:-.05em}.planList small{color:var(--muted);font-weight:900}.planList p{margin:0;color:var(--muted);font-weight:750}.planList em{justify-self:start;border-radius:999px;padding:6px 9px;background:#101513;color:#fff;font-style:normal;font-size:11px;font-weight:1000}.planList .popular{outline:2px solid var(--orange)}
@media(max-width:1100px){.cocPanel,.cocPanel.wide{grid-column:span 6}.pipeline{grid-template-columns:repeat(2,minmax(0,1fr))}.planList{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:860px){.cocBar{grid-template-columns:1fr;padding:14px}.cocNav{top:96px}.workspace{padding:12px}.cocPanel,.cocPanel.wide,.cocPanel.full{grid-column:1/-1}.formGrid,.drawerGrid,.workerGrid,.workCards,.proofGrid,.settingsGrid,.pipeline,.moneyStrip,.planList{grid-template-columns:1fr}.ledgerRow{grid-template-columns:1fr}.cocDrawer{top:84px;right:8px;bottom:8px;width:calc(100vw - 16px);border-radius:22px}.title h1{font-size:23px}}
`;

export default function FreshApp() {
  const { user } = useAuth();
  const api = useApi();
  const data = useOsData();
  const [page, setPage] = React.useState(pageFromLocation);
  const [selected, setSelected] = React.useState(null);
  const title = NAV.find((item) => keyOf(item) === page) || "AI Guide";
  const subtitle = subtitles[page] || subtitles.aiguide;

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
  const open = (type, item) => item && setSelected({ ...item, type });

  const launchNav = ["AI Guide", "Command", "Jobs", "Clients", "Quotes", "Invoices", "Messages", "Team", "Payroll", "Xero", "Settings", "Support"];

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
      <Drawer selected={selected} onClose={() => setSelected(null)} api={api} data={data} />
    </main>
  );
}
