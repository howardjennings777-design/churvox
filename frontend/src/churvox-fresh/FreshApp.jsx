import React from "react";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";

const NAV = ["Today", "Command", "Jobs", "Clients", "Workers", "Quotes", "Invoices", "Messages", "Team", "Xero", "Settings", "Plans", "Help"];
const keyOf = (value) => String(value || "").toLowerCase().replace(/\s+/g, "");
const aliases = { "": "today", dashboard: "today", smart: "today", hub: "today", support: "help", guide: "help", payroll: "team", worker: "workers", accounting: "xero", sync: "xero" };

const subtitles = {
  today: "Jobs, workers, money, messages and problems for today.",
  command: "The only approval desk: approve, edit or park.",
  jobs: "Job cards, editable job forms, recurring, proof and status.",
  clients: "Client list, editable forms, service memory and history.",
  workers: "Clock-ins, GPS, current jobs, proof and timesheets.",
  quotes: "Drafts, sent quotes, viewed quotes, accepted quotes and follow-up.",
  invoices: "Drafts, due today, overdue, paid and sync-ready invoices.",
  messages: "Worker messages, customer messages, drafted replies and history.",
  team: "Staff, roles, access, payroll review and worker app status.",
  xero: "Draft sync only, no tax filing, no payout files.",
  settings: "Real business controls without clutter.",
  plans: "Locked Churvox pricing and add-ons.",
  help: "Support, setup help and short guides.",
};

const seed = {
  jobs: [
    { id: "j1", title: "Naenae lawn reset", client: "Mere H.", worker: "Howard", status: "in_progress", date: "2026-06-29", time: "08:00", price: 65, service: "Lawn mowing", billing: "Fixed price", duration: "1.5 hours", proof: "2 photos", recurring: "Fortnightly", address: "Naenae", notes: "Front and back lawn, send photos after finish.", issue: "" },
    { id: "j2", title: "Petone unit cleanup", client: "Petone Units", worker: "Alex", status: "assigned", date: "2026-06-29", time: "10:30", price: 180, service: "Cleanup", billing: "Fixed + extras", duration: "2 hours", proof: "No proof yet", recurring: "One-off", address: "Petone", notes: "Confirm arrival with tenants.", issue: "" },
    { id: "j3", title: "Belmont hedge trim", client: "Belmont Villas", worker: "Sam", status: "proof_ready", date: "2026-06-29", time: "12:00", price: 420, service: "Hedge trimming", billing: "Package price", duration: "3 hours", proof: "3 photos + note", recurring: "Monthly", address: "Belmont", notes: "Package price saved. Photos required.", issue: "" },
    { id: "j4", title: "Wainui quote visit", client: "Wainui School", worker: "Howard", status: "quote_draft", date: "2026-06-29", time: "14:00", price: 0, service: "Quote visit", billing: "Quote required", duration: "45 minutes", proof: "Site notes", recurring: "One-off", address: "Wainuiomata", notes: "Quote approval required.", issue: "quote approval" },
    { id: "j5", title: "Birchville tidy", client: "Birchville Dairy", worker: "Alex", status: "needs_check", date: "2026-06-29", time: "16:00", price: 120, service: "Property tidy", billing: "Hourly + extras", duration: "2 hours", proof: "Worker message", recurring: "Weekly", address: "Birchville", notes: "Extra green waste reported by worker.", issue: "extra green waste" },
  ],
  clients: [
    { id: "c1", name: "Mere H.", phone: "027 000 000", email: "mere@example.com", address: "Naenae", notes: "Gate code saved. Likes Friday mornings.", service: "Fortnightly lawns", price: "$65 regular", schedule: "Friday morning", jobs: 5, quotes: 2, invoices: 4 },
    { id: "c2", name: "Belmont Villas", phone: "04 000 000", email: "office@example.com", address: "Belmont", notes: "Send photos after every visit.", service: "Hedge and lawn care", price: "$420 package", schedule: "Monthly", jobs: 8, quotes: 1, invoices: 7 },
    { id: "c3", name: "Naenae Dairy", phone: "022 000 000", email: "dairy@example.com", address: "Naenae", notes: "Back entry access.", service: "Monthly tidy", price: "$120", schedule: "Monthly", jobs: 3, quotes: 0, invoices: 3 },
    { id: "c4", name: "Petone Units", phone: "021 000 000", email: "units@example.com", address: "Petone", notes: "Confirm arrival with tenants.", service: "Cleanup", price: "$180", schedule: "As needed", jobs: 2, quotes: 1, invoices: 1 },
  ],
  workers: [
    { id: "w1", name: "Howard", role: "Owner", status: "Clocked in", job: "Naenae lawn reset", app: "Active", payroll: "Ready", gps: "Naenae", timesheet: "7.5h", start: "07:45", end: "", break: "30 min", proof: "2 photos uploaded", messages: "No unread messages", slip: "Slip ready", notes: "On site. Photos required before completion." },
    { id: "w2", name: "Alex", role: "Worker", status: "Driving", job: "Petone unit cleanup", app: "Active", payroll: "Review", gps: "Petone", timesheet: "6.0h", start: "08:10", end: "", break: "20 min", proof: "No proof yet", messages: "1 worker message", slip: "Needs time check", notes: "Driving to next job. Confirm clock-out." },
    { id: "w3", name: "Sam", role: "Worker", status: "Proof upload", job: "Belmont hedge trim", app: "Active", payroll: "Ready", gps: "Belmont", timesheet: "5.5h", start: "08:30", end: "14:05", break: "30 min", proof: "3 photos + note", messages: "Proof note uploaded", slip: "Slip ready", notes: "Proof uploaded for owner review." },
    { id: "w4", name: "Tui", role: "Subcontractor", status: "Clocked out", job: "Yard", app: "Invited", payroll: "Pending", gps: "Yard", timesheet: "0h", start: "", end: "", break: "", proof: "No proof", messages: "Invite pending", slip: "Not ready", notes: "Worker app invite still pending." },
  ],
  quotes: [
    { id: "q1", title: "Fence repair", client: "Mere H.", status: "Draft", amount: 620, followUp: "ready" },
    { id: "q2", title: "Grounds tidy", client: "Wainui School", status: "Sent", amount: 1180, followUp: "tomorrow" },
    { id: "q3", title: "Hedge package", client: "Belmont Villas", status: "Viewed", amount: 420, followUp: "ready" },
    { id: "q4", title: "Cleanup", client: "Petone Units", status: "Accepted", amount: 180, followUp: "convert to job" },
  ],
  invoices: [
    { id: "i1", number: "INV-1042", client: "Belmont Villas", status: "Draft", amount: 420, sync: "Command approval" },
    { id: "i2", number: "INV-1041", client: "Petone Units", status: "Due today", amount: 180, sync: "Xero ready" },
    { id: "i3", number: "INV-1038", client: "Naenae Dairy", status: "Overdue", amount: 120, sync: "Not synced" },
    { id: "i4", number: "INV-1034", client: "Mere H.", status: "Paid", amount: 65, sync: "Synced" },
  ],
  messages: [
    { id: "m1", from: "Worker", subject: "Gate locked", detail: "Worker needs customer reply.", draft: "Hi Mere, the gate looks locked. Can you confirm access?", history: "2 replies" },
    { id: "m2", from: "Customer", subject: "Friday request", detail: "Customer wants Friday morning.", draft: "Friday morning works. I have kept your arrival window.", history: "4 replies" },
    { id: "m3", from: "Worker", subject: "Extra green waste", detail: "Extra charge may be needed.", draft: "There is extra green waste on site. I can add it to the job if approved.", history: "1 note" },
  ],
  command: [
    { id: "a1", type: "Invoice ready", title: "Belmont hedge trim", status: "Filled invoice", owner: "Approve", client: "Belmont Villas", amount: 420, filled: "Draft invoice prepared from completed hedge trim, proof photos and saved package price.", evidence: "Job marked proof ready. 3 photos uploaded. Client price memory: $420 package.", check: "Confirm photos and price, then approve draft invoice creation." },
    { id: "a2", type: "Quote ready", title: "Fence repair", status: "Filled quote", owner: "Edit", client: "Mere H.", amount: 620, filled: "Quote drafted from site notes and client history.", evidence: "Customer asked for fence repair. Prior client record is active. Follow-up ready.", check: "Edit scope or price before sending." },
    { id: "a3", type: "Message ready", title: "Friday request", status: "Draft reply", owner: "Approve", client: "Mere H.", amount: 0, filled: "Reply drafted to confirm Friday morning arrival window.", evidence: "Customer requested Friday. Client prefers Friday mornings.", check: "Approve to send reply, or edit wording." },
    { id: "a4", type: "Client/job issue", title: "Extra green waste", status: "Needs call", owner: "Park", client: "Birchville Dairy", amount: 0, filled: "Issue captured from worker message and linked to today job.", evidence: "Worker flagged extra green waste from site.", check: "Park for later, or edit job/invoice note." },
    { id: "a5", type: "Timesheet/proof/slip issue", title: "Alex clock-out", status: "Mismatch", owner: "Edit", client: "Petone Units", amount: 0, filled: "Timesheet mismatch detected against job status and worker clock-out.", evidence: "Worker status driving, payroll review required, job still assigned.", check: "Edit time or park until worker confirms." },
  ],
};

const optionSets = {
  status: ["assigned", "acknowledged", "in_progress", "proof_ready", "completed", "needs_check", "quote_draft"],
  recurring: ["One-off", "Weekly", "Fortnightly", "Monthly", "Custom"],
  billing: ["Fixed price", "Hourly", "Fixed + extras", "Hourly + extras", "Package price", "Quote required"],
  service: ["Lawn mowing", "Hedge trimming", "Property tidy", "Cleanup", "Quote visit", "Other"],
  worker: ["Howard", "Alex", "Sam", "Tui"],
  client: ["Mere H.", "Belmont Villas", "Naenae Dairy", "Petone Units", "Wainui School", "Birchville Dairy"],
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

function useOsData() {
  const api = useApi();
  const [data, setData] = React.useState({ ...seed, xero: { connected: false, tenant_name: "" } });

  React.useEffect(() => {
    let alive = true;
    async function load() {
      const responses = await Promise.allSettled([api.get("/jobs"), api.get("/clients"), api.get("/team"), api.get("/quotes"), api.get("/invoices"), api.get("/messages"), api.get("/ai/actions"), api.get("/xero/status")]);
      if (!alive) return;
      const jobs = listFrom(responses[0].value, "jobs").map((job, index) => {
        const fallback = seed.jobs[index % seed.jobs.length];
        return {
          id: idOf(job) || `job-${index}`,
          title: textOf(job.title, job.job_title, job.job_name, job.description, fallback.title),
          client: textOf(job.client_name, job.customer_name, job.client?.name, fallback.client),
          worker: textOf(job.assigned_worker_name, job.worker_name, job.worker?.name, fallback.worker),
          status: textOf(job.status, job.job_status, job.stage, fallback.status),
          date: textOf(job.scheduled_date, job.date, fallback.date),
          time: textOf(job.scheduled_time, job.start_time, job.time, fallback.time),
          price: Number(job.price ?? job.amount ?? job.total ?? fallback.price ?? 0),
          service: textOf(job.service, job.service_type, job.job_type, fallback.service),
          billing: textOf(job.billing_type, job.pricing_type, job.price_type, fallback.billing),
          duration: textOf(job.estimated_duration, job.duration, job.expected_time, fallback.duration),
          proof: Array.isArray(job.photos) && job.photos.length ? `${job.photos.length} photos` : textOf(job.proof, job.worker_notes, fallback.proof),
          recurring: job.is_recurring || job.recurring_frequency ? textOf(job.recurring_frequency, "Recurring") : textOf(job.recurring, fallback.recurring),
          address: textOf(job.address, job.site_address, fallback.address),
          notes: textOf(job.notes, job.worker_notes, fallback.notes),
          issue: textOf(job.issue, job.problem, job.needs_attention, fallback.issue),
        };
      });
      const clients = listFrom(responses[1].value, "clients").map((client, index) => ({ ...seed.clients[index % seed.clients.length], ...client, id: idOf(client) || `client-${index}`, name: textOf(client.name, client.client_name, client.customer_name, seed.clients[index % seed.clients.length]?.name) }));
      const workers = listFrom(responses[2].value, "team").map((worker, index) => {
        const fallback = seed.workers[index % seed.workers.length];
        return {
          ...fallback,
          ...worker,
          id: idOf(worker) || `worker-${index}`,
          name: textOf(worker.name, worker.full_name, worker.email, fallback.name),
          role: textOf(worker.role, worker.access, fallback.role),
          status: textOf(worker.status, worker.clock_status, fallback.status),
          job: textOf(worker.current_job, worker.job_title, fallback.job),
          app: textOf(worker.app_status, worker.invite_status, fallback.app),
          payroll: textOf(worker.payroll_status, fallback.payroll),
          gps: textOf(worker.gps, worker.location, fallback.gps),
          timesheet: textOf(worker.timesheet, worker.hours_today, fallback.timesheet),
          proof: textOf(worker.proof, worker.photo_status, fallback.proof),
          messages: textOf(worker.messages, worker.message_status, fallback.messages),
          start: textOf(worker.start, worker.clock_in, worker.start_time, fallback.start),
          end: textOf(worker.end, worker.clock_out, worker.end_time, fallback.end),
          slip: textOf(worker.slip, worker.pay_slip_status, fallback.slip),
        };
      });
      const quotes = listFrom(responses[3].value, "quotes").map((quote, index) => ({ ...seed.quotes[index % seed.quotes.length], ...quote, id: idOf(quote) || `quote-${index}` }));
      const invoices = listFrom(responses[4].value, "invoices").map((invoice, index) => ({ ...seed.invoices[index % seed.invoices.length], ...invoice, id: idOf(invoice) || `invoice-${index}` }));
      const messages = listFrom(responses[5].value, "messages").map((message, index) => ({ ...seed.messages[index % seed.messages.length], ...message, id: idOf(message) || `message-${index}` }));
      const command = listFrom(responses[6].value, "actions").map((item, index) => ({ ...seed.command[index % seed.command.length], ...item, id: idOf(item) || `command-${index}` }));
      const xeroRaw = responses[7].value?.data?.data || responses[7].value?.data || {};
      setData((current) => ({ jobs: jobs.length ? jobs : current.jobs, clients: clients.length ? clients : current.clients, workers: workers.length ? workers : current.workers, quotes: quotes.length ? quotes : current.quotes, invoices: invoices.length ? invoices : current.invoices, messages: messages.length ? messages : current.messages, command: command.length ? command : current.command, xero: { connected: Boolean(xeroRaw.connected || xeroRaw.xero_connected), tenant_name: textOf(xeroRaw.tenant_name, xeroRaw.tenantName, "") } }));
    }
    load();
    return () => { alive = false; };
  }, [api]);

  return data;
}

function Row({ title, meta, tone = "green", tag, onClick }) {
  return <button type="button" className={`cocRow ${tone}`} onClick={onClick}><i /><span><b>{title}</b><small>{meta}</small></span>{tag ? <em>{tag}</em> : null}</button>;
}

function Panel({ title, tone = "green", className = "", children }) {
  return <section className={`cocPanel ${tone} ${className}`}><h2>{title}</h2>{children}</section>;
}

function Field({ label, value, textarea = false, type = "text", options, readOnly = false }) {
  if (options) {
    return <label className="cocField"><span>{label}</span><select defaultValue={value ?? ""}>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
  }
  const Tag = textarea ? "textarea" : "input";
  return <label className="cocField"><span>{label}</span><Tag type={textarea ? undefined : type} step={type === "number" ? "0.01" : undefined} defaultValue={value ?? ""} readOnly={readOnly} rows={textarea ? 4 : undefined} /></label>;
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
  if (kind.includes("worker") || kind.includes("timesheet")) return { title: "Worker day slip", note: "Edit the worker day: clock times, current job, GPS, proof, messages, timesheet and slip status.", worker: true, fields: [["Worker", selected.name], ["Role/access", selected.role], ["Clock status", selected.status], ["Current job", selected.job], ["GPS/location", selected.gps], ["Clock in", selected.start], ["Clock out", selected.end || "Still working"], ["Break", selected.break || "Not set"], ["Proof/photos", selected.proof], ["Worker messages", selected.messages], ["Timesheet", selected.timesheet], ["Slip/payroll status", selected.slip || selected.payroll], ["Worker app", selected.app], ["Day notes", selected.notes, true]] };
  if (kind.includes("invoice")) return { title: "Invoice form", note: "Review money, status and accounting sync state.", fields: [["Invoice", selected.number], ["Client", selected.client], ["Amount", selected.amount, false, "number"], ["Status", selected.status], ["Xero/MYOB status", selected.sync], ["Approval", selected.sync?.includes("Command") ? "Waiting in Command" : "No approval button here", false, "text", null, true]] };
  if (kind.includes("quote")) return { title: "Quote form", note: "Quote details, status and follow-up.", fields: [["Quote", selected.title], ["Client", selected.client], ["Amount", selected.amount, false, "number"], ["Status", selected.status], ["Follow-up", selected.followUp], ["Convert to job", selected.status === "Accepted" ? "Ready" : "Not yet", false, "text", null, true]] };
  if (kind.includes("message")) return { title: "Message thread", note: "Thread plus Churvox drafted reply. Sending approval stays in Command.", fields: [["From", selected.from], ["Subject", selected.subject], ["History", selected.history], ["Message", selected.detail, true], ["Drafted reply", selected.draft, true]] };
  if (kind.includes("command") || kind.includes("approval")) return { title: "Approval slip", note: "Check what Churvox filled, edit if needed, then approve or park it.", approval: true, fields: [["Approval type", selected.type], ["Record", selected.title], ["Client", selected.client], ["Amount", selected.amount ? selected.amount : "Not money related"], ["Prepared status", selected.status], ["Recommended action", selected.owner, false, "text", ["Approve", "Edit", "Park"]], ["What Churvox filled", selected.filled, true], ["Evidence checked", selected.evidence, true], ["Owner check", selected.check, true], ["Edit notes", "", true]] };
  return { title: "Editable job form", note: "Edit the job like a real record: service, price, date, time, worker, status and repeat schedule.", job: true, fields: [["Job name", selected.title], ["Client", selected.client, false, "text", optionSets.client], ["Site address", selected.address], ["Service", selected.service, false, "text", optionSets.service], ["Assigned worker", selected.worker, false, "text", optionSets.worker], ["Scheduled date", selected.date, false, "date"], ["Start time", selected.time, false, "time"], ["Estimated duration", selected.duration], ["Price NZD", selected.price, false, "number"], ["Billing type", selected.billing, false, "text", optionSets.billing], ["Frequency", selected.recurring, false, "text", optionSets.recurring], ["Status", selected.status, false, "text", optionSets.status], ["Proof/photos", selected.proof], ["Issue status", selected.issue ? `Waiting in Command: ${selected.issue}` : "No issue", false, "text", null, true], ["Job notes", selected.notes, true]] };
}

function Drawer({ selected, onClose }) {
  if (!selected) return null;
  const detail = detailFor(selected);
  return <aside className={`cocDrawer ${detail.approval ? "approvalSlip" : ""} ${detail.job ? "jobSlip" : ""}`}><button type="button" onClick={onClose}>Close</button><em>{selected.type || "Record"}</em><h2>{detail.title}</h2><p>{detail.note}</p><div>{detail.fields.map(([label, value, textarea, type, options, readOnly]) => <Field key={label} label={label} value={value} textarea={textarea} type={type} options={options} readOnly={readOnly} />)}</div>{detail.approval ? <div className="approvalActions"><button type="button" className="action">Approve</button><button type="button" className="action dark">Edit form</button><button type="button" className="action quiet">Park</button></div> : null}{detail.job ? <div className="approvalActions"><button type="button" className="action">Save job</button><button type="button" className="action dark">Create quote</button><button type="button" className="action quiet">Close</button></div> : null}{detail.client ? <div className="approvalActions"><button type="button" className="action">Save client</button><button type="button" className="action dark">Add job</button><button type="button" className="action quiet">New quote</button></div> : null}{detail.worker ? <div className="approvalActions"><button type="button" className="action">Save day</button><button type="button" className="action dark">Message worker</button><button type="button" className="action quiet">Open timesheet</button></div> : null}</aside>;
}

function WeekStrip({ jobs, workers, approvals, moneyDue }) {
  return <div className="dayControl"><div className="cocWeek">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => <button key={day} type="button" className={index === 0 ? "active" : ""}>{day}</button>)}</div><div className="miniStats"><Stat label="jobs" value={jobs} /><Stat label="working" value={workers} tone="blue" /><Stat label="waiting" value={approvals} tone="amber" /><Stat label="due" value={moneyDue} tone="coral" /></div></div>;
}

function Today({ data, open }) {
  const due = data.invoices.filter((invoice) => /due|draft|ready/i.test(`${invoice.status} ${invoice.sync}`)).reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
  const issues = data.jobs.filter((job) => job.issue);
  return <div className="cocPage today"><Panel title="Today Control" className="wide"><WeekStrip jobs={data.jobs.length} workers={data.workers.filter((worker) => !/clocked out/i.test(worker.status)).length} approvals={data.command.length} moneyDue={money(due)} /></Panel><Panel title="Next Owner Check" tone="amber"><h3>{data.command[0]?.type || "Nothing waiting"}</h3><p>{data.command[0]?.title || "No approval required right now."}</p><span className="chip amber">open in Command</span></Panel><Panel title="Jobs Today" className="wide"><div className="scroll">{data.jobs.slice(0, 5).map((job) => <Row key={job.id} title={`${job.time} ${job.title}`} meta={`${job.client} - ${job.worker} - ${job.status}`} onClick={() => open("Job", job)} />)}</div></Panel><Panel title="Money Due Today" tone="amber"><strong className="money">{money(due)}</strong><span className="chip amber">{data.invoices.filter((invoice) => /due/i.test(invoice.status)).length} due today</span></Panel><Panel title="Who Is Working" tone="blue"><div className="scroll">{data.workers.slice(0, 5).map((worker) => <Row key={worker.id} title={`${worker.name}: ${worker.status}`} meta={`${worker.job} - GPS ${worker.gps}`} tone="blue" onClick={() => open("Worker", worker)} />)}</div></Panel><Panel title="Messages / Photos" tone="coral">{data.messages.slice(0, 3).map((message) => <span key={message.id} className="chip coral" onClick={() => open("Message", message)}>{message.subject}</span>)}<span className="chip coral">proof photos ready</span></Panel><Panel title="Problems Today" tone="red">{issues.length ? issues.slice(0, 5).map((job) => <span key={job.id} className="chip red" onClick={() => open("Job", job)}>In Command: {job.issue}</span>) : <p>No job problems right now.</p>}</Panel><Panel title="Approvals Waiting" tone="amber" className="wide">{data.command.slice(0, 5).map((item) => <Row key={item.id} title={item.type} meta={item.title} tone="amber" onClick={() => open("Command item", item)} />)}</Panel></div>;
}

function Command({ data, open }) {
  const selected = data.command[0] || seed.command[0];
  return <div className="cocPage command"><Panel title="Waiting For Approval" tone="coral"><div className="scroll">{data.command.slice(0, 5).map((item) => <Row key={item.id} title={item.type} meta={`${item.title} - ${item.status}`} tone="coral" onClick={() => open("Command item", item)} />)}</div></Panel><Panel title="Filled Approval Form" tone="blue" className="wide"><h3>{selected.type}</h3><p>Churvox prepared this from job records, client memory, messages, time, photos and accounting state.</p><div className="formGrid"><Field label="Record" value={selected.title} /><Field label="Client" value={selected.client} /><Field label="Prepared status" value={selected.status} /><Field label="Recommended action" value={selected.owner} options={["Approve", "Edit", "Park"]} /><Field label="What Churvox filled" value={selected.filled} textarea /><Field label="Evidence checked" value={selected.evidence} textarea /></div></Panel><Panel title="Owner Actions" tone="amber"><div className="ownerActions"><button className="action">Approve</button><button className="action dark">Edit</button><button className="action quiet">Park</button></div><p>Command remains the approval desk.</p></Panel></div>;
}

function Jobs({ data, open }) {
  return <div className="cocPage jobsPage"><div className="toolbar"><button type="button">+ Add Job</button><button type="button">Recurring</button><button type="button">Dispatch Board</button></div><Panel title="Jobs" tone="blue" className="full jobBoard"><div className="jobCards">{data.jobs.slice(0, 8).map((job) => <button key={job.id} type="button" className="jobCard" onClick={() => open("Job", job)}><b>{job.title}</b><small>{job.client} - {job.worker}</small><span>{job.date} at {job.time} - {job.recurring}</span><em>{money(job.price)}</em><i>{job.issue ? `In Command: ${job.issue}` : job.status}</i></button>)}</div></Panel></div>;
}

function Clients({ data, open }) {
  const client = data.clients[0] || seed.clients[0];
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
  return <div className="cocPage four">{stages.map((stage, index) => <Panel key={stage} title={stage} tone={["amber", "blue", "green", "coral"][index]}><strong className="count">{data.quotes.filter((quote) => String(quote.status).toLowerCase().includes(stage.toLowerCase())).length || 0}</strong><div className="scroll">{data.quotes.filter((quote) => String(quote.status).toLowerCase().includes(stage.toLowerCase())).slice(0, 5).map((quote) => <Row key={quote.id} title={quote.title} meta={`${quote.client} / ${money(quote.amount)}`} tone={["amber", "blue", "green", "coral"][index]} onClick={() => open("Quote", quote)} />)}</div></Panel>)}<Panel title="Follow-Up Ready" tone="coral" className="full"><p>Churvox prepares the next message. Sending approval still happens in Command.</p></Panel></div>;
}

function Invoices({ data, open }) {
  const totals = [["Draft", data.invoices.filter((i) => /draft/i.test(i.status)).reduce((s, i) => s + Number(i.amount || 0), 0)], ["Due today", data.invoices.filter((i) => /due/i.test(i.status)).reduce((s, i) => s + Number(i.amount || 0), 0)], ["Overdue", data.invoices.filter((i) => /overdue/i.test(i.status)).reduce((s, i) => s + Number(i.amount || 0), 0)], ["Paid", data.invoices.filter((i) => /paid/i.test(i.status)).reduce((s, i) => s + Number(i.amount || 0), 0)]];
  return <div className="cocPage"><Panel title="Drafts / Due / Overdue / Paid" tone="amber" className="full"><div className="moneyStrip">{totals.map(([label, value]) => <span key={label}><b>{money(value)}</b><small>{label}</small></span>)}</div></Panel><Panel title="Invoice Ledger + Xero/MYOB Status" tone="blue" className="full"><table><tbody>{data.invoices.slice(0, 5).map((invoice) => <tr key={invoice.id} onClick={() => open("Invoice", invoice)}><td>{invoice.number}</td><td>{invoice.client}</td><td>{invoice.status}</td><td>{invoice.sync}</td></tr>)}</tbody></table><p>Approval and sync decisions stay in Command.</p></Panel></div>;
}

function Messages({ data, open }) {
  const msg = data.messages[0];
  return <div className="cocPage"><Panel title="Worker Messages" tone="coral">{data.messages.filter((message) => /worker/i.test(message.from)).slice(0, 5).map((message) => <Row key={message.id} title={message.subject} meta={message.detail} tone="coral" onClick={() => open("Worker message", message)} />)}</Panel><Panel title="Customer Messages" tone="blue">{data.messages.filter((message) => /customer/i.test(message.from)).slice(0, 5).map((message) => <Row key={message.id} title={message.subject} meta={message.detail} tone="blue" onClick={() => open("Customer message", message)} />)}</Panel><Panel title="Opened Thread" tone="blue"><div className="bubble">{msg?.detail}</div><span className="chip green">{msg?.history}</span></Panel><Panel title="Churvox Drafted Reply" className="wide"><p>{msg?.draft}</p><p>Reply is prepared here. Sending approval happens in Command.</p></Panel></div>;
}

function Team({ data, open }) {
  return <div className="cocPage"><Panel title="Team Pulse" tone="blue" className="full"><div className="pulse"><span>{data.workers.length} staff</span><span>roles/access live</span><span>payroll review</span><span>worker app status</span></div></Panel><Panel title="Staff List" tone="blue">{data.workers.map((worker) => <Row key={worker.id} title={worker.name} meta={`${worker.role} - ${worker.app}`} tone="blue" onClick={() => open("Person", worker)} />)}</Panel><Panel title="Editable Person Form" tone="coral" className="wide"><div className="formGrid"><Field label="Name" value={data.workers[0]?.name} /><Field label="Role/access" value={data.workers[0]?.role} /><Field label="Payroll review" value={data.workers[0]?.payroll} /><Field label="Worker app" value={data.workers[0]?.app} /></div></Panel></div>;
}

function Xero({ data, open }) {
  const ready = data.invoices.filter((invoice) => /draft|ready|command/i.test(`${invoice.status} ${invoice.sync}`));
  return <div className="cocPage"><Panel title="Connection" className="full"><h3>{data.xero.connected ? `Connected: ${data.xero.tenant_name || "Xero"}` : "Not connected yet"}</h3><span className="chip green">draft sync only</span></Panel><Panel title="Guardrails" tone="coral">{["No tax filing", "No payout files", "Owner-approved sync only", "Draft invoices only"].map((rule) => <Row key={rule} title={rule} meta="locked" tone="coral" />)}</Panel><Panel title="Ready To Sync" tone="blue" className="wide">{ready.slice(0, 5).map((invoice) => <Row key={invoice.id} title={invoice.number} meta={`${invoice.sync} - approval decision in Command`} tone="blue" onClick={() => open("Invoice", invoice)} />)}</Panel></div>;
}

function Settings() {
  return <div className="cocPage"><Panel title="Business Controls" tone="dark" className="wide"><div className="formGrid"><Field label="Business name" value="Churvox business" /><Field label="Logo" value="Uploaded" /><Field label="Email" value="hello@churvox.com" /><Field label="GST" value="15%" /><Field label="Country" value="New Zealand" /><Field label="Notifications" value="On" /></div></Panel><Panel title="Rules + Exports" tone="blue">{["Worker app rules", "CSV defaults", "Security", "Data export", "Billing controls"].map((rule) => <Row key={rule} title={rule} meta="control" tone="blue" />)}</Panel></div>;
}

function Plans() {
  const plans = [["Start", "$39", "Jobs, clients, quotes and invoices."], ["Crew", "$89", "Worker app and team records."], ["Operator", "$149", "Most Popular. Churvox prepares admin."], ["Command", "$299", "Full approval OS and accounting sync option."]];
  return <div className="cocPage"><Panel title="Plans" tone="amber" className="full"><div className="planList">{plans.map(([name, price, detail]) => <div key={name} className={name === "Operator" ? "popular" : ""}><b>{name}</b><strong>{price}</strong><small>/month + GST</small><p>{detail}</p>{name === "Operator" ? <em>Most Popular</em> : null}</div>)}</div></Panel><Panel title="Add-ons" tone="blue" className="full"><p>Command Growth Pack $99/month + GST | Accounting Sync Add-on $39/month + GST for non-Command tiers.</p></Panel></div>;
}

function Help() {
  return <div className="cocPage"><Panel title="Contact" tone="coral" className="full"><h3>hello@churvox.com</h3><button className="action">New ticket</button></Panel><Panel title="Open Help">{["Setup help", "CSV import", "Worker app", "Billing"].map((item) => <Row key={item} title={item} meta="ticket" />)}</Panel><Panel title="Short Guides" tone="blue" className="wide">{["Add client", "Approve in Command", "Import CSV", "Xero guardrails"].map((item) => <Row key={item} title={item} meta="guide" tone="blue" />)}</Panel></div>;
}

function Page({ page, data, open }) {
  if (page === "today") return <Today data={data} open={open} />;
  if (page === "command") return <Command data={data} open={open} />;
  if (page === "jobs") return <Jobs data={data} open={open} />;
  if (page === "clients") return <Clients data={data} open={open} />;
  if (page === "workers") return <Workers data={data} open={open} />;
  if (page === "quotes") return <Quotes data={data} open={open} />;
  if (page === "invoices") return <Invoices data={data} open={open} />;
  if (page === "messages") return <Messages data={data} open={open} />;
  if (page === "team") return <Team data={data} open={open} />;
  if (page === "xero") return <Xero data={data} open={open} />;
  if (page === "settings") return <Settings />;
  if (page === "plans") return <Plans />;
  return <Help />;
}

const baseCss = `
.churvoxOptionC,.churvoxOptionC *{box-sizing:border-box}.churvoxOptionC{min-height:100vh;display:grid;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.churvoxOptionC button,.churvoxOptionC input,.churvoxOptionC textarea,.churvoxOptionC select{font:inherit}.cocBar{display:grid}.brand{display:flex;align-items:center}.brand i{display:block}.title,.brand,.owner{min-width:0}.title h1,.title p{margin:0}.owner span,.owner b,.cocRow b,.cocRow small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.cocNav{display:flex}.workspace{min-width:0}.cocPage{display:grid}.toolbar{display:flex;flex-wrap:wrap}.cocPanel{position:relative}.scroll{display:grid;overflow:auto}.scroll.tight{max-height:150px}.cocRow{display:grid;align-items:center;border:0;cursor:pointer}.cocRow i{display:block;border-radius:50%}.cocRow em{font-style:normal}.cocWeek,.pulse,.proofGrid,.moneyStrip,.miniStats,.ownerActions,.approvalActions{display:flex;flex-wrap:wrap}.ownerActions,.approvalActions{gap:8px}.approvalActions{grid-column:1/-1;margin-top:16px;padding-top:14px;border-top:1px solid rgba(16,21,19,.12)}.approvalActions .action{min-height:42px;min-width:118px}.dayControl{display:grid;gap:12px}.miniStats{gap:8px}.miniStat{display:grid;min-width:92px;border-radius:12px;padding:10px 12px;background:#eef2ed;color:#151c19}.miniStat b{font-size:20px;line-height:1}.miniStat small{font-size:11px;font-weight:900;color:#5e6b65}.chip{display:inline-flex;align-items:center;cursor:pointer}.map{position:relative;overflow:hidden}.googleMapShell{min-height:290px}.googleMap{position:absolute;inset:0;border-radius:inherit;overflow:hidden;background:#eef2ed}.googleMap iframe{position:absolute;inset:0;width:100%;height:100%;border:0}.googleMap a{position:absolute;right:10px;bottom:10px;border-radius:999px;padding:7px 10px;background:#101513;color:#fff;font-size:11px;font-weight:950;text-decoration:none;box-shadow:0 10px 22px rgba(16,21,19,.2)}table{width:100%}.formGrid{display:grid}.cocField{display:grid}.cocField input,.cocField textarea,.cocField select{width:100%;min-height:42px;border:1px solid rgba(16,21,19,.12);border-radius:12px;padding:9px 10px;background:#fff;color:#151c19;font-weight:850}.cocField textarea{min-height:96px;resize:vertical}.cocDrawer{position:fixed}.cocDrawer>div{display:grid}.jobCards,.workerCards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.jobCard,.workerCard{display:grid;gap:5px;min-height:118px;border:1px solid rgba(16,21,19,.12);border-radius:14px;padding:12px;background:#fff;color:#151c19;text-align:left;cursor:pointer;box-shadow:0 10px 22px rgba(16,21,19,.05)}.jobCard b,.workerCard b{font-size:14px}.jobCard small,.jobCard span,.workerCard small,.workerCard span{color:#5e6b65;font-size:12px;font-weight:850}.jobCard em,.workerCard em{font-style:normal;font-weight:950}.jobCard i,.workerCard i{justify-self:start;border-radius:999px;padding:5px 8px;background:#eef2ed;color:#5e6b65;font-size:11px;font-style:normal;font-weight:950}.jobSlip .cocField:has(textarea),.cocDrawer .cocField:has(textarea){grid-column:1/-1}.clientsPage .wide .miniStats,.workersPage .miniStats{margin-bottom:12px}.clientsPage .proofGrid,.workersPage .proofGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}@media(max-width:860px){.jobCards,.workerCards{grid-template-columns:1fr}.clientsPage .proofGrid,.workersPage .proofGrid{grid-template-columns:1fr}}
`;

export default function FreshApp() {
  const { user } = useAuth();
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
    if (typeof window !== "undefined") window.history.replaceState({}, "", key === "today" ? "/dashboard" : `/dashboard#${key}`);
  };
  const open = (type, item) => setSelected({ ...item, type });

  return <main className="churvoxOptionC"><style>{baseCss}</style><header className="cocBar"><div className="brand"><i /><b>Churvox</b><small>does the admin</small></div><div className="title"><h1>{title}</h1><p>{subtitle}</p></div><div className="owner"><span>Owner checks</span><b>{user?.business_name || user?.name || "Boss view"}</b></div></header><nav className="cocNav" aria-label="Churvox OS navigation">{NAV.map((item) => { const key = keyOf(item); return <button key={key} type="button" className={page === key ? "active" : ""} onClick={() => go(key)}>{item}</button>; })}</nav><section className="workspace"><Page page={page} data={data} open={open} /></section><Drawer selected={selected} onClose={() => setSelected(null)} /></main>;
}
