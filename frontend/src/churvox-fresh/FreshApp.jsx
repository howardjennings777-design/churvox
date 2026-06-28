import React from "react";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";

const NAV = ["Today", "Command", "Jobs", "Clients", "Workers", "Quotes", "Invoices", "Messages", "Team", "Xero", "Settings", "Plans", "Help"];
const keyOf = (value) => String(value || "").toLowerCase().replace(/\s+/g, "");
const aliases = { "": "today", dashboard: "today", smart: "today", hub: "today", support: "help", guide: "help", payroll: "team", worker: "workers", accounting: "xero", sync: "xero" };

const subtitles = {
  today: "Jobs, workers, money, messages and problems for today.",
  command: "The only approval desk: approve, edit or park.",
  jobs: "Dispatch, recurring work, job forms, proof and status.",
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
    { id: "j1", title: "Naenae lawn reset", client: "Mere H.", worker: "Howard", status: "In progress", time: "8:00", proof: "2 photos", recurring: "Fortnightly", issue: "" },
    { id: "j2", title: "Petone unit cleanup", client: "Petone Units", worker: "Alex", status: "Assigned", time: "10:30", proof: "No proof yet", recurring: "One-off", issue: "" },
    { id: "j3", title: "Belmont hedge trim", client: "Belmont Villas", worker: "Sam", status: "Proof ready", time: "12:00", proof: "3 photos + note", recurring: "Monthly", issue: "" },
    { id: "j4", title: "Wainui quote visit", client: "Wainui School", worker: "Howard", status: "Quote draft", time: "2:00", proof: "Site notes", recurring: "One-off", issue: "quote approval" },
    { id: "j5", title: "Birchville tidy", client: "Birchville Dairy", worker: "Alex", status: "Needs check", time: "4:00", proof: "Worker message", recurring: "Weekly", issue: "extra green waste" },
  ],
  clients: [
    { id: "c1", name: "Mere H.", phone: "027 000 000", email: "mere@example.com", address: "Naenae", notes: "Gate code saved. Likes Friday mornings.", service: "Fortnightly lawns", price: "$65 regular", jobs: 5, quotes: 2, invoices: 4 },
    { id: "c2", name: "Belmont Villas", phone: "04 000 000", email: "office@example.com", address: "Belmont", notes: "Send photos after every visit.", service: "Hedge and lawn care", price: "$420 package", jobs: 8, quotes: 1, invoices: 7 },
    { id: "c3", name: "Naenae Dairy", phone: "022 000 000", email: "dairy@example.com", address: "Naenae", notes: "Back entry access.", service: "Monthly tidy", price: "$120", jobs: 3, quotes: 0, invoices: 3 },
    { id: "c4", name: "Petone Units", phone: "021 000 000", email: "units@example.com", address: "Petone", notes: "Confirm arrival with tenants.", service: "Cleanup", price: "$180", jobs: 2, quotes: 1, invoices: 1 },
    { id: "c5", name: "Wainui School", phone: "04 111 111", email: "admin@example.com", address: "Wainuiomata", notes: "Needs quote approval first.", service: "Grounds quote", price: "Quote required", jobs: 1, quotes: 1, invoices: 0 },
  ],
  workers: [
    { id: "w1", name: "Howard", role: "Owner", status: "Clocked in", job: "Naenae lawn reset", app: "Active", payroll: "Ready", gps: "Naenae", timesheet: "7.5h" },
    { id: "w2", name: "Alex", role: "Worker", status: "Driving", job: "Petone unit cleanup", app: "Active", payroll: "Review", gps: "Petone", timesheet: "6.0h" },
    { id: "w3", name: "Sam", role: "Worker", status: "Proof upload", job: "Belmont hedge trim", app: "Active", payroll: "Ready", gps: "Belmont", timesheet: "5.5h" },
    { id: "w4", name: "Tui", role: "Subcontractor", status: "Clocked out", job: "Yard", app: "Invited", payroll: "Pending", gps: "Yard", timesheet: "0h" },
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
    { id: "i5", number: "INV-1033", client: "Wainui School", status: "Ready", amount: 1180, sync: "MYOB ready" },
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
      const jobs = listFrom(responses[0].value, "jobs").map((job, index) => ({ id: idOf(job) || `job-${index}`, title: textOf(job.title, job.job_title, job.job_name, job.description, seed.jobs[index % seed.jobs.length]?.title), client: textOf(job.client_name, job.customer_name, job.client?.name, seed.jobs[index % seed.jobs.length]?.client), worker: textOf(job.assigned_worker_name, job.worker_name, job.worker?.name, seed.jobs[index % seed.jobs.length]?.worker), status: textOf(job.status, job.job_status, job.stage, seed.jobs[index % seed.jobs.length]?.status), time: textOf(job.scheduled_time, job.start_time, job.time, seed.jobs[index % seed.jobs.length]?.time), proof: Array.isArray(job.photos) && job.photos.length ? `${job.photos.length} photos` : textOf(job.proof, job.worker_notes, seed.jobs[index % seed.jobs.length]?.proof), recurring: job.is_recurring || job.recurring_frequency ? textOf(job.recurring_frequency, "Recurring") : textOf(job.recurring, seed.jobs[index % seed.jobs.length]?.recurring), issue: textOf(job.issue, job.problem, job.needs_attention, seed.jobs[index % seed.jobs.length]?.issue) }));
      const clients = listFrom(responses[1].value, "clients").map((client, index) => ({ id: idOf(client) || `client-${index}`, name: textOf(client.name, client.client_name, client.customer_name, seed.clients[index % seed.clients.length]?.name), phone: textOf(client.phone, client.mobile, seed.clients[index % seed.clients.length]?.phone), email: textOf(client.email, seed.clients[index % seed.clients.length]?.email), address: textOf(client.address, seed.clients[index % seed.clients.length]?.address), notes: textOf(client.notes, client.note, seed.clients[index % seed.clients.length]?.notes), service: textOf(client.service_memory, client.preferred_service, seed.clients[index % seed.clients.length]?.service), price: textOf(client.price_memory, client.default_price, seed.clients[index % seed.clients.length]?.price), jobs: Number(client.job_count || client.jobs || seed.clients[index % seed.clients.length]?.jobs || 0), quotes: Number(client.quote_count || client.quotes || seed.clients[index % seed.clients.length]?.quotes || 0), invoices: Number(client.invoice_count || client.invoices || seed.clients[index % seed.clients.length]?.invoices || 0) }));
      const workers = listFrom(responses[2].value, "team").map((worker, index) => { const fallback = seed.workers[index % seed.workers.length]; return { id: idOf(worker) || `worker-${index}`, name: textOf(worker.name, worker.full_name, worker.email, fallback.name), role: textOf(worker.role, worker.access, fallback.role), status: textOf(worker.status, worker.clock_status, fallback.status), job: textOf(worker.current_job, worker.job_title, fallback.job), app: textOf(worker.app_status, worker.invite_status, fallback.app), payroll: textOf(worker.payroll_status, fallback.payroll), gps: textOf(worker.gps, worker.location, fallback.gps), timesheet: textOf(worker.timesheet, worker.hours_today, fallback.timesheet) }; });
      const quotes = listFrom(responses[3].value, "quotes").map((quote, index) => ({ id: idOf(quote) || `quote-${index}`, title: textOf(quote.title, quote.description, seed.quotes[index % seed.quotes.length]?.title), client: textOf(quote.client_name, quote.customer_name, seed.quotes[index % seed.quotes.length]?.client), status: textOf(quote.status, quote.stage, seed.quotes[index % seed.quotes.length]?.status), amount: Number(quote.amount || quote.total || quote.price || seed.quotes[index % seed.quotes.length]?.amount || 0), followUp: textOf(quote.follow_up_status, quote.followUp, seed.quotes[index % seed.quotes.length]?.followUp) }));
      const invoices = listFrom(responses[4].value, "invoices").map((invoice, index) => ({ id: idOf(invoice) || `invoice-${index}`, number: textOf(invoice.invoice_number, invoice.number, seed.invoices[index % seed.invoices.length]?.number), client: textOf(invoice.client_name, invoice.customer_name, seed.invoices[index % seed.invoices.length]?.client), status: textOf(invoice.status, invoice.stage, seed.invoices[index % seed.invoices.length]?.status), amount: Number(invoice.amount || invoice.total || seed.invoices[index % seed.invoices.length]?.amount || 0), sync: textOf(invoice.xero_sync_status, invoice.myob_sync_status, invoice.sync_status, seed.invoices[index % seed.invoices.length]?.sync) }));
      const messages = listFrom(responses[5].value, "messages").map((message, index) => ({ id: idOf(message) || `message-${index}`, from: textOf(message.from, message.type, "Message"), subject: textOf(message.subject, message.title, message.message, seed.messages[index % seed.messages.length]?.subject), detail: textOf(message.detail, message.body, message.message, seed.messages[index % seed.messages.length]?.detail), draft: textOf(message.draft, message.reply, seed.messages[index % seed.messages.length]?.draft), history: textOf(message.history, message.thread_count, seed.messages[index % seed.messages.length]?.history) }));
      const command = listFrom(responses[6].value, "actions").map((item, index) => { const fallback = seed.command[index % seed.command.length]; return { id: idOf(item) || `command-${index}`, type: textOf(item.type, item.kind, fallback.type), title: textOf(item.title, item.subject, item.description, fallback.title), status: textOf(item.status, item.stage, fallback.status), owner: textOf(item.owner_action, item.action, fallback.owner), client: textOf(item.client_name, item.client, fallback.client), amount: Number(item.amount || item.total || fallback.amount || 0), filled: textOf(item.filled, item.summary, item.description, fallback.filled), evidence: textOf(item.evidence, item.source_note, fallback.evidence), check: textOf(item.check, item.next_step, fallback.check) }; });
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

function Field({ label, value, textarea = false, readOnly = true }) {
  const Tag = textarea ? "textarea" : "input";
  return <label className="cocField"><span>{label}</span><Tag value={value || ""} readOnly={readOnly} rows={textarea ? 4 : undefined} onChange={() => {}} /></label>;
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
  const places = data.clients.map((client) => client.address).filter(Boolean).slice(0, 4);
  return places.length ? `${places.join(" ")} Lower Hutt Wellington New Zealand` : "Lower Hutt Wellington New Zealand";
}

function detailFor(selected) {
  const kind = String(selected?.type || "").toLowerCase();
  if (kind.includes("client")) return { title: "Client form", note: "Edit the customer details, saved memory and history from this slip.", fields: [["Name", selected.name], ["Phone", selected.phone], ["Email", selected.email], ["Address", selected.address], ["Service memory", selected.service], ["Price memory", selected.price], ["History", `${selected.jobs || 0} jobs / ${selected.quotes || 0} quotes / ${selected.invoices || 0} invoices`], ["Notes", selected.notes, true]] };
  if (kind.includes("worker") || kind.includes("timesheet")) return { title: "Worker day form", note: "Shows the worker, their current job, GPS, proof and pay review in one place.", fields: [["Worker", selected.name], ["Role/access", selected.role], ["Clock status", selected.status], ["Current job", selected.job], ["GPS/location", selected.gps], ["Worker app", selected.app], ["Timesheet", selected.timesheet], ["Payroll/slip status", selected.payroll]] };
  if (kind.includes("invoice")) return { title: "Invoice form", note: "Review money, status and accounting sync state. Sync approval still happens in Command.", fields: [["Invoice", selected.number], ["Client", selected.client], ["Amount", money(selected.amount)], ["Status", selected.status], ["Xero/MYOB status", selected.sync], ["Approval", selected.sync?.includes("Command") ? "Waiting in Command" : "No approval button here"]] };
  if (kind.includes("quote")) return { title: "Quote form", note: "Quote details, status and follow-up. Final send approval still happens in Command.", fields: [["Quote", selected.title], ["Client", selected.client], ["Amount", money(selected.amount)], ["Status", selected.status], ["Follow-up", selected.followUp], ["Convert to job", selected.status === "Accepted" ? "Ready" : "Not yet"]] };
  if (kind.includes("message")) return { title: "Message thread", note: "Shows the thread and the Churvox drafted reply. Sending approval still happens in Command.", fields: [["From", selected.from], ["Subject", selected.subject], ["History", selected.history], ["Message", selected.detail, true], ["Drafted reply", selected.draft, true]] };
  if (kind.includes("command") || kind.includes("approval")) return { title: "Approval slip", note: "Check what Churvox filled, edit if needed, then approve or park it.", approval: true, fields: [["Approval type", selected.type], ["Record", selected.title], ["Client", selected.client], ["Amount", selected.amount ? money(selected.amount) : "Not money related"], ["Prepared status", selected.status], ["Recommended action", selected.owner], ["What Churvox filled", selected.filled, true], ["Evidence checked", selected.evidence, true], ["Owner check", selected.check, true], ["Edit notes", "", true, false]] };
  return { title: "Job form", note: "Job detail, assigned worker, status, proof and any issue that needs Command.", fields: [["Job", selected.title], ["Client", selected.client], ["Assigned worker", selected.worker], ["Time", selected.time], ["Status", selected.status], ["Recurring", selected.recurring], ["Proof/photos", selected.proof], ["Problem", selected.issue || "None"]] };
}

function Drawer({ selected, onClose }) {
  if (!selected) return null;
  const detail = detailFor(selected);
  return <aside className={`cocDrawer ${detail.approval ? "approvalSlip" : ""}`}><button type="button" onClick={onClose}>Close</button><em>{selected.type || "Record"}</em><h2>{detail.title}</h2><p>{detail.note}</p><div>{detail.fields.map(([label, value, textarea, readOnly]) => <Field key={label} label={label} value={value} textarea={textarea} readOnly={readOnly !== false} />)}</div>{detail.approval ? <div className="approvalActions"><button type="button" className="action">Approve</button><button type="button" className="action dark">Edit form</button><button type="button" className="action quiet">Park</button></div> : null}</aside>;
}

function WeekStrip({ jobs, workers, approvals, moneyDue }) {
  return <div className="dayControl"><div className="cocWeek">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => <button key={day} type="button" className={index === 0 ? "active" : ""}>{day}</button>)}</div><div className="miniStats"><Stat label="jobs" value={jobs} /><Stat label="working" value={workers} tone="blue" /><Stat label="waiting" value={approvals} tone="amber" /><Stat label="due" value={moneyDue} tone="coral" /></div></div>;
}

function Today({ data, open }) {
  const due = data.invoices.filter((invoice) => /due|draft|ready/i.test(`${invoice.status} ${invoice.sync}`)).reduce((sum, invoice) => sum + invoice.amount, 0);
  const issues = data.jobs.filter((job) => job.issue);
  return <div className="cocPage today"><Panel title="Today Control" className="wide"><WeekStrip jobs={data.jobs.length} workers={data.workers.filter((worker) => !/clocked out/i.test(worker.status)).length} approvals={data.command.length} moneyDue={money(due)} /></Panel><Panel title="Next Owner Check" tone="amber"><h3>{data.command[0]?.type || "Nothing waiting"}</h3><p>{data.command[0]?.title || "No approval required right now."}</p><span className="chip amber">open in Command</span></Panel><Panel title="Jobs Today" className="wide"><div className="scroll">{data.jobs.slice(0, 5).map((job) => <Row key={job.id} title={`${job.time} ${job.title}`} meta={`${job.client} - ${job.worker} - ${job.status}`} onClick={() => open("Job", job)} />)}</div></Panel><Panel title="Money Due Today" tone="amber"><strong className="money">{money(due)}</strong><span className="chip amber">{data.invoices.filter((invoice) => /due/i.test(invoice.status)).length} due today</span><div className="scroll tight">{data.invoices.filter((invoice) => /due|overdue|ready/i.test(invoice.status)).slice(0, 3).map((invoice) => <Row key={invoice.id} title={invoice.number} meta={`${invoice.client} - ${invoice.status}`} tone="amber" onClick={() => open("Invoice", invoice)} />)}</div></Panel><Panel title="Who Is Working" tone="blue"><div className="scroll">{data.workers.slice(0, 5).map((worker) => <Row key={worker.id} title={`${worker.name}: ${worker.status}`} meta={`${worker.job} - GPS ${worker.gps}`} tone="blue" onClick={() => open("Worker", worker)} />)}</div></Panel><Panel title="Messages / Photos" tone="coral">{data.messages.slice(0, 3).map((message) => <span key={message.id} className="chip coral" onClick={() => open("Message", message)}>{message.subject}</span>)}<span className="chip coral">proof photos ready</span></Panel><Panel title="Problems Today" tone="red">{issues.length ? issues.slice(0, 5).map((job) => <span key={job.id} className="chip red" onClick={() => open("Job problem", job)}>{job.issue}</span>) : <p>No job problems right now.</p>}</Panel><Panel title="Approvals Waiting" tone="amber" className="wide">{data.command.slice(0, 5).map((item) => <Row key={item.id} title={item.type} meta={item.title} tone="amber" onClick={() => open("Command item", item)} />)}</Panel></div>;
}

function Command({ data, open }) {
  const selected = data.command[0] || seed.command[0];
  return <div className="cocPage command"><Panel title="Waiting For Approval" tone="coral"><div className="scroll">{data.command.slice(0, 5).map((item) => <Row key={item.id} title={item.type} meta={`${item.title} - ${item.status}`} tone="coral" onClick={() => open("Command item", item)} />)}</div></Panel><Panel title="Filled Approval Form" tone="blue" className="wide"><h3>{selected.type}</h3><p>Churvox prepared this from job records, client memory, messages, time, photos and accounting state. The owner only checks the filled record.</p><div className="formGrid"><Field label="Record" value={selected.title} /><Field label="Client" value={selected.client} /><Field label="Prepared status" value={selected.status} /><Field label="Recommended action" value={selected.owner} /><Field label="What Churvox filled" value={selected.filled} textarea /><Field label="Evidence checked" value={selected.evidence} textarea /></div></Panel><Panel title="Owner Actions" tone="amber"><div className="ownerActions"><button className="action">Approve</button><button className="action dark">Edit</button><button className="action quiet">Park</button></div><p>Command remains the approval desk.</p></Panel></div>;
}

function Jobs({ data, open }) {
  const q = routeQuery(data);
  return <div className="cocPage"><div className="toolbar"><button type="button">+ Add Job</button><button type="button">Recurring</button><button type="button">Dispatch Board</button></div><Panel title="Google Maps Dispatch" className="wide"><div className="map googleMapShell"><GoogleMap query={q} label="Jobs dispatch Google Maps" /></div><Row title="Run A: 4 jobs" meta="assigned worker and route" /><Row title="Run B: 3 jobs" meta="assigned worker and route" /><Row title="Recurring inside Jobs" meta="weekly / fortnightly / monthly" /></Panel><Panel title="Job List + Status" tone="blue" className="wide"><table><tbody>{data.jobs.slice(0, 5).map((job) => <tr key={job.id} onClick={() => open("Job", job)}><td>{job.title}</td><td>{job.status}</td><td>{job.worker}</td><td>{job.proof}</td></tr>)}</tbody></table><div className="formGrid"><Field label="Client" value={data.jobs[0]?.client} /><Field label="Assigned worker" value={data.jobs[0]?.worker} /><Field label="Job status" value={data.jobs[0]?.status} /><Field label="Time / proof / photos" value={`${data.jobs[0]?.time || ""} - ${data.jobs[0]?.proof || ""}`} /></div></Panel><Panel title="Problems Become Command Items" tone="red">{data.jobs.filter((job) => job.issue).slice(0, 5).map((job) => <Row key={job.id} title={job.title} meta={job.issue} tone="red" onClick={() => open("Job problem", job)} />)}</Panel></div>;
}

function Clients({ data, open }) {
  const client = data.clients[0];
  return <div className="cocPage"><div className="toolbar"><button type="button">+ Add Client</button><button type="button">CSV Import</button><button type="button">Export</button></div><Panel title="Client List" tone="blue"><div className="scroll">{data.clients.slice(0, 5).map((item) => <Row key={item.id} title={item.name} meta={item.address} tone="blue" onClick={() => open("Client", item)} />)}</div></Panel><Panel title="Editable Client Form" tone="coral" className="wide"><div className="formGrid"><Field label="Name" value={client?.name} /><Field label="Phone" value={client?.phone} /><Field label="Email" value={client?.email} /><Field label="Address" value={client?.address} /><Field label="Notes" value={client?.notes} textarea /><Field label="Service memory" value={client?.service} /><Field label="Price memory" value={client?.price} /></div></Panel><Panel title="Job / Quote / Invoice History" tone="amber"><span className="chip amber">{client?.jobs || 0} jobs</span><span className="chip amber">{client?.quotes || 0} quotes</span><span className="chip amber">{client?.invoices || 0} invoices</span></Panel></div>;
}

function Workers({ data, open }) {
  const q = `${data.workers.map((worker) => worker.gps).filter(Boolean).join(" ")} Lower Hutt Wellington New Zealand`;
  return <div className="cocPage"><Panel title="Google Maps GPS" tone="blue" className="wide"><div className="map big googleMapShell"><GoogleMap query={q} label="Worker GPS Google Maps" /></div></Panel><Panel title="Clocked In + Current Job">{data.workers.slice(0, 4).map((worker) => <Row key={worker.id} title={worker.name} meta={`${worker.status} - ${worker.job}`} tag={worker.gps} onClick={() => open("Worker", worker)} />)}</Panel><Panel title="Proof / Photos / Worker Messages" tone="coral" className="wide"><div className="proofGrid">{["3 photos ready", "2 worker messages", "GPS trail", "1 proof check"].map((item) => <Row key={item} title={item} meta="from worker app" tone="coral" />)}</div></Panel><Panel title="Timesheets / Slips" tone="amber">{data.workers.slice(0, 4).map((worker) => <Row key={worker.id} title={worker.name} meta={`${worker.timesheet} - ${worker.payroll}`} tone="amber" onClick={() => open("Timesheet", worker)} />)}</Panel></div>;
}

function Quotes({ data, open }) {
  const stages = ["Draft", "Sent", "Viewed", "Accepted"];
  return <div className="cocPage four">{stages.map((stage, index) => <Panel key={stage} title={stage} tone={["amber", "blue", "green", "coral"][index]}><strong className="count">{data.quotes.filter((quote) => quote.status.toLowerCase().includes(stage.toLowerCase())).length || 0}</strong><div className="scroll">{data.quotes.filter((quote) => quote.status.toLowerCase().includes(stage.toLowerCase())).slice(0, 5).map((quote) => <Row key={quote.id} title={quote.title} meta={`${quote.client} / ${money(quote.amount)}`} tone={["amber", "blue", "green", "coral"][index]} onClick={() => open("Quote", quote)} />)}</div></Panel>)}<Panel title="Follow-Up Ready" tone="coral" className="full"><p>Churvox prepares the next message. Sending approval still happens in Command.</p></Panel></div>;
}

function Invoices({ data, open }) {
  const totals = [["Draft", data.invoices.filter((i) => /draft/i.test(i.status)).reduce((s, i) => s + i.amount, 0)], ["Due today", data.invoices.filter((i) => /due/i.test(i.status)).reduce((s, i) => s + i.amount, 0)], ["Overdue", data.invoices.filter((i) => /overdue/i.test(i.status)).reduce((s, i) => s + i.amount, 0)], ["Paid", data.invoices.filter((i) => /paid/i.test(i.status)).reduce((s, i) => s + i.amount, 0)]];
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
.churvoxOptionC,.churvoxOptionC *{box-sizing:border-box}.churvoxOptionC{min-height:100vh;display:grid;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.churvoxOptionC button,.churvoxOptionC input,.churvoxOptionC textarea{font:inherit}.cocBar{display:grid}.brand{display:flex;align-items:center}.brand i{display:block}.title,.brand,.owner{min-width:0}.title h1,.title p{margin:0}.owner span,.owner b,.cocRow b,.cocRow small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.cocNav{display:flex}.workspace{min-width:0}.cocPage{display:grid}.toolbar{display:flex;flex-wrap:wrap}.cocPanel{position:relative}.scroll{display:grid;overflow:auto}.scroll.tight{max-height:150px}.cocRow{display:grid;align-items:center;border:0;cursor:pointer}.cocRow i{display:block;border-radius:50%}.cocRow em{font-style:normal}.cocWeek,.pulse,.proofGrid,.moneyStrip,.miniStats,.ownerActions,.approvalActions{display:flex;flex-wrap:wrap}.ownerActions,.approvalActions{gap:8px}.approvalActions{grid-column:1/-1;margin-top:16px;padding-top:14px;border-top:1px solid rgba(16,21,19,.12)}.approvalActions .action{min-height:42px;min-width:118px}.dayControl{display:grid;gap:12px}.miniStats{gap:8px}.miniStat{display:grid;min-width:92px;border-radius:12px;padding:10px 12px;background:#eef2ed;color:#151c19}.miniStat b{font-size:20px;line-height:1}.miniStat small{font-size:11px;font-weight:900;color:#5e6b65}.chip{display:inline-flex;align-items:center;cursor:pointer}.map{position:relative;overflow:hidden}.googleMapShell{min-height:290px}.googleMap{position:absolute;inset:0;border-radius:inherit;overflow:hidden;background:#eef2ed}.googleMap iframe{position:absolute;inset:0;width:100%;height:100%;border:0}.googleMap a{position:absolute;right:10px;bottom:10px;border-radius:999px;padding:7px 10px;background:#101513;color:#fff;font-size:11px;font-weight:950;text-decoration:none;box-shadow:0 10px 22px rgba(16,21,19,.2)}table{width:100%}.formGrid{display:grid}.cocField{display:grid}.cocField input,.cocField textarea{width:100%}.cocDrawer{position:fixed}.cocDrawer>div{display:grid}
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
