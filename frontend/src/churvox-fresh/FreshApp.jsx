import React from "react";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";

const NAV = ["AI Guide", "Command", "Jobs", "Clients", "Quotes", "Invoices", "Team", "Payroll", "Workers", "Xero", "Settings", "Plans", "Support"];
const keyOf = (value) => String(value || "").toLowerCase().replace(/\s+/g, "");
const aliases = {
  dashboard: "aiguide",
  today: "aiguide",
  smart: "aiguide",
  hub: "aiguide",
  setup: "aiguide",
  guide: "aiguide",
  ai: "aiguide",
  recurring: "jobs",
  schedule: "jobs",
  calendar: "jobs",
  dispatch: "workers",
  routes: "workers",
  worker: "workers",
  people: "team",
  staff: "team",
  time: "payroll",
  timesheets: "payroll",
  payments: "invoices",
  accounting: "xero",
  sync: "xero",
  billing: "plans",
  help: "support",
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
const plans = [
  ["Start", "$39", "Jobs, clients, quotes and invoices."],
  ["Crew", "$89", "Worker app and team records."],
  ["Operator", "$149", "Most Popular. Churvox prepares admin."],
  ["Command", "$299", "Full approval OS and accounting sync option."],
];
const addOns = ["Command Growth Pack $99/month + GST", "Accounting Sync Add-on $39/month + GST for non-Command tiers"];

function pageFromLocation() {
  if (typeof window === "undefined") return "aiguide";
  const path = window.location.pathname.replace(/^\/+/, "").split("/")[0].toLowerCase();
  const hash = window.location.hash.replace(/^#/, "").toLowerCase();
  const raw = hash || path;
  return aliases[raw] || (NAV.map(keyOf).includes(raw) ? raw : "aiguide");
}
function textOf(...values) {
  for (const value of values) if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
  return "";
}
function idOf(record, fallback) {
  const raw = record?.id || record?._id || record?.job_id || record?.client_id || record?.invoice_id || record?.quote_id || record?.user_id || fallback;
  if (typeof raw === "object") return String(raw.$oid || raw.oid || raw.id || raw._id || fallback);
  return String(raw || fallback);
}
function money(value) {
  const numeric = Number(String(value || "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(numeric) && numeric ? numeric.toLocaleString("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 }) : "$0";
}
function listFrom(payload, key) {
  const data = payload?.data?.data || payload?.data || payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[key])) return data[key];
  for (const name of ["items", "records", "results", "jobs", "clients", "quotes", "invoices", "workers", "team", "messages", "actions"]) {
    if (Array.isArray(data?.[name])) return data[name];
  }
  return [];
}
function useLegacyData() {
  const api = useApi();
  const [data, setData] = React.useState({ jobs: [], clients: [], workers: [], quotes: [], invoices: [], messages: [], command: [], xero: {} });
  React.useEffect(() => {
    let alive = true;
    async function load() {
      const res = await Promise.allSettled([api.get("/jobs"), api.get("/clients"), api.get("/team"), api.get("/quotes"), api.get("/invoices"), api.get("/messages"), api.get("/ai/actions"), api.get("/xero/status")]);
      if (!alive) return;
      const jobs = listFrom(res[0].value, "jobs").map((job, i) => ({ ...job, type: "Job", id: idOf(job, `job-${i}`), title: textOf(job.title, job.job_title, job.job_name, job.description, `Job ${i + 1}`), client: textOf(job.client_name, job.customer_name, job.client?.name, "No client"), worker: textOf(job.assigned_worker_name, job.worker_name, job.worker?.name, "Unassigned"), date: textOf(job.scheduled_date, job.date, "No date"), time: textOf(job.scheduled_time, job.time, job.start_time, ""), price: job.price ?? job.amount ?? job.total ?? 0, status: textOf(job.status, job.job_status, "assigned"), issue: textOf(job.issue, job.problem, job.needs_attention, ""), notes: textOf(job.notes, job.note, "") }));
      const clients = listFrom(res[1].value, "clients").map((client, i) => ({ ...client, type: "Client", id: idOf(client, `client-${i}`), name: textOf(client.name, client.client_name, client.customer_name, `Client ${i + 1}`), address: textOf(client.address, client.site_address, client.suburb, ""), service: textOf(client.service, client.preferred_service, "service saved"), price: textOf(client.price, client.default_price, client.saved_price, ""), notes: textOf(client.notes, client.note, "") }));
      const workers = listFrom(res[2].value, "team").map((worker, i) => ({ ...worker, type: "Worker", id: idOf(worker, `worker-${i}`), name: textOf(worker.name, worker.full_name, worker.email, `Worker ${i + 1}`), role: textOf(worker.role, "Worker"), status: textOf(worker.status, worker.clock_status, "No clock status"), job: textOf(worker.current_job, worker.job_title, "No job assigned"), gps: textOf(worker.gps, worker.location, "No GPS yet"), proof: textOf(worker.proof, worker.photo_status, "No proof yet"), payroll: textOf(worker.payroll_status, worker.payroll, "Review"), timesheet: textOf(worker.timesheet, worker.hours_today, "0h") }));
      const quotes = listFrom(res[3].value, "quotes").map((quote, i) => ({ ...quote, type: "Quote", id: idOf(quote, `quote-${i}`), title: textOf(quote.title, quote.quote_number, `Quote ${i + 1}`), client: textOf(quote.client_name, quote.customer_name, quote.client?.name, "No client"), status: textOf(quote.status, "Draft"), amount: quote.amount ?? quote.total ?? quote.price ?? 0, scope: textOf(quote.scope, quote.description, quote.notes, "Scope ready") }));
      const invoices = listFrom(res[4].value, "invoices").map((invoice, i) => ({ ...invoice, type: "Invoice", id: idOf(invoice, `invoice-${i}`), number: textOf(invoice.invoice_number, invoice.number, invoice.title, `Invoice ${i + 1}`), client: textOf(invoice.client_name, invoice.customer_name, invoice.client?.name, "No client"), status: textOf(invoice.status, "Draft"), amount: invoice.amount ?? invoice.total ?? invoice.price ?? 0, sync: textOf(invoice.accounting_status, invoice.sync, invoice.xero_status, "Draft sync only"), evidence: textOf(invoice.evidence, invoice.proof, "Owner review") }));
      const messages = listFrom(res[5].value, "messages").map((message, i) => ({ ...message, type: "Message", id: idOf(message, `message-${i}`), subject: textOf(message.subject, message.title, `Message ${i + 1}`), detail: textOf(message.detail, message.message, message.body, "Message ready"), client: textOf(message.client_name, message.client, "Business"), from: textOf(message.from, message.source, "Churvox") }));
      const command = listFrom(res[6].value, "actions").map((item, i) => ({ ...item, type: textOf(item.type, item.kind, "Approval"), id: idOf(item, `command-${i}`), title: textOf(item.title, item.summary, item.label, "Prepared admin item"), status: textOf(item.status, "Waiting"), client: textOf(item.client, item.client_name, item.payload?.client_name, "Business"), owner: textOf(item.owner, item.recommended_action, "Approve"), filled: textOf(item.filled, item.summary, item.description, "Prepared for owner review") }));
      const xero = res[7].value?.data?.data || res[7].value?.data || {};
      setData({
        jobs,
        clients,
        workers,
        quotes,
        invoices,
        messages,
        command: command.length ? command : messages.filter((m) => /waiting|unread|draft/i.test(`${m.status} ${m.subject}`)),
        xero: { connected: Boolean(xero.connected || xero.xero_connected), tenant_name: textOf(xero.tenant_name, xero.tenantName, "") },
      });
    }
    load();
    window.addEventListener("churvox:fresh-data-updated", load);
    return () => { alive = false; window.removeEventListener("churvox:fresh-data-updated", load); };
  }, [api]);
  return data;
}
function Panel({ title, tone = "green", className = "", children }) {
  return <section className={`cocPanel ${tone} ${className}`}><h2>{title}</h2>{children}</section>;
}
function Row({ title, meta, tag, tone = "green", onClick }) {
  return <button type="button" className={`cocRow ${tone}`} onClick={onClick}><i /><span><b>{title}</b><small>{meta}</small></span>{tag ? <em>{tag}</em> : null}</button>;
}
function Stat({ label, value, tone = "green" }) {
  return <span className={`miniStat ${tone}`}><b>{value}</b><small>{label}</small></span>;
}
function Field({ label, value, textarea, options }) {
  if (options) return <label className="cocField"><span>{label}</span><select defaultValue={value || ""}>{options.map((o) => <option key={o}>{o}</option>)}</select></label>;
  const Tag = textarea ? "textarea" : "input";
  return <label className="cocField"><span>{label}</span><Tag defaultValue={value || ""} rows={textarea ? 4 : undefined} /></label>;
}
function GoogleMap({ query }) {
  const q = query || "Lower Hutt Wellington New Zealand";
  return <div className="googleMap"><iframe title="Worker GPS Google Maps" src={`https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" /><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`} target="_blank" rel="noreferrer">Open in Google Maps</a></div>;
}
function Drawer({ selected, onClose }) {
  if (!selected) return null;
  return <aside className="cocDrawer"><button type="button" onClick={onClose}>Close</button><em>{selected.type || "Record"}</em><h2>{selected.title || selected.name || selected.number || selected.subject}</h2><p>Edit the record here. Owner approval stays in Command.</p><div>
    {Object.entries(selected).filter(([key, value]) => ["string", "number"].includes(typeof value) && !["id", "_id", "type"].includes(key)).slice(0, 12).map(([key, value]) => <Field key={key} label={key} value={value} textarea={String(value).length > 80} />)}
  </div><div className="approvalActions"><button className="action">Save</button><button className="action dark">Save and refresh</button><button className="action quiet" onClick={onClose}>Close</button></div></aside>;
}
function AiGuide({ data, open }) {
  const due = data.invoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
  return <div className="cocPage today"><Panel title="Today Control" className="wide"><div className="miniStats"><Stat label="jobs" value={data.jobs.length} /><Stat label="workers" value={data.workers.length} tone="blue" /><Stat label="waiting" value={data.command.length} tone="amber" /><Stat label="due" value={money(due)} tone="coral" /></div></Panel><Panel title="Next Owner Check" tone="amber"><h3>{data.command[0]?.title || "Nothing waiting"}</h3><p>{data.command[0]?.filled || "No approval required right now."}</p><span className="chip amber">open in Command</span></Panel><Panel title="Jobs Today" className="wide"><div className="scroll">{data.jobs.slice(0, 5).map((job) => <Row key={job.id} title={`${job.time} ${job.title}`} meta={`${job.client} - ${job.worker} - ${job.status}`} onClick={() => open(job)} />)}</div></Panel><Panel title="Messages / Photos" tone="coral">{data.messages.slice(0, 4).map((message) => <Row key={message.id} title={message.subject} meta={message.detail} tone="coral" onClick={() => open(message)} />)}</Panel><Panel title="Launch Guardrails" tone="coral" className="wide">{["No automatic invoice sending", "No tax filing", "No bank payout files", "Only mark paid after accounting refresh confirms paid"].map((rule) => <Row key={rule} title={rule} meta="locked" tone="coral" />)}</Panel></div>;
}
function Command({ data, open }) {
  const selected = data.command[0] || { type: "Clear", title: "Command is clear", status: "Clear", owner: "None", filled: "No approvals waiting." };
  return <div className="cocPage command"><Panel title="Waiting For Approval" tone="coral"><div className="scroll">{data.command.length ? data.command.slice(0, 5).map((item) => <Row key={item.id} title={item.type} meta={`${item.title} - ${item.status}`} tone="coral" onClick={() => open(item)} />) : <p>No approvals waiting.</p>}</div></Panel><Panel title="Filled Approval Form" tone="blue" className="wide"><h3>{selected.type}</h3><p>Churvox prepared this from job records, client memory, messages, time, photos and accounting state.</p><div className="formGrid"><Field label="Record" value={selected.title} /><Field label="Client" value={selected.client} /><Field label="Prepared status" value={selected.status} /><Field label="Recommended action" value={selected.owner} options={["Approve", "Edit", "Park"]} /><Field label="What Churvox filled" value={selected.filled} textarea /></div></Panel><Panel title="Owner Actions" tone="amber"><div className="ownerActions"><button className="action">Open approval</button><button className="action dark">Sweep</button><button className="action quiet">Park inside slip</button></div><p>Command remains the approval desk.</p></Panel></div>;
}
function Jobs({ data, open }) {
  return <div className="cocPage jobsPage"><div className="toolbar"><button type="button">+ Add Job</button><button type="button">Recurring</button><button type="button">Dispatch Board</button></div><Panel title="Jobs" tone="blue" className="full jobBoard"><div className="jobCards">{data.jobs.slice(0, 10).map((job) => <button key={job.id} type="button" className="jobCard" onClick={() => open(job)}><b>{job.title}</b><small>{job.client} - {job.worker}</small><span>{job.date} at {job.time}</span><em>{money(job.price)}</em><i>{job.issue ? `In Command: ${job.issue}` : job.status}</i></button>)}</div></Panel></div>;
}
function Clients({ data, open }) {
  const client = data.clients[0] || {};
  return <div className="cocPage clientsPage"><div className="toolbar"><button type="button">+ Add Client</button><button type="button">CSV Import</button><button type="button">Export</button></div><Panel title="Client List" tone="blue"><div className="scroll">{data.clients.slice(0, 8).map((item) => <Row key={item.id} title={item.name} meta={`${item.address} - ${item.service}`} tag={item.price} tone="blue" onClick={() => open(item)} />)}</div></Panel><Panel title="Selected Client Record" tone="coral" className="wide"><div className="formGrid"><Field label="Name" value={client.name} /><Field label="Phone" value={client.phone} /><Field label="Email" value={client.email} /><Field label="Address" value={client.address} /><Field label="Notes / access" value={client.notes} textarea /><Field label="Service memory" value={client.service} /><Field label="Price memory" value={client.price} /></div></Panel><Panel title="Service + Price Memory" tone="amber"><Row title={client.service || "No service saved"} meta="default service for new jobs" tone="amber" /><Row title={client.price || "No price saved"} meta="saved pricing memory" tone="amber" /></Panel><Panel title="Job / Quote / Invoice History" tone="blue" className="wide"><div className="proofGrid"><Row title="Jobs" meta="Client job history" tone="blue" /><Row title="Quotes" meta="Client quote history" tone="blue" /><Row title="Invoices" meta="Client invoice history" tone="blue" /></div></Panel></div>;
}
function Workers({ data, open }) {
  const query = data.workers.map((worker) => worker.gps).filter(Boolean).slice(0, 4).join(" ") || "Lower Hutt Wellington New Zealand";
  return <div className="cocPage workersPage"><Panel title="Google Maps GPS" tone="blue" className="wide"><div className="map big googleMapShell"><GoogleMap query={query} /></div></Panel><Panel title="Worker Day Summary" tone="blue"><div className="miniStats"><Stat label="active" value={data.workers.length} tone="blue" /><Stat label="proof" value={data.workers.filter((w) => /proof|photo/i.test(w.proof)).length} tone="coral" /><Stat label="review" value={data.workers.filter((w) => /review/i.test(w.payroll)).length} tone="amber" /></div></Panel><Panel title="Worker Cards" className="full"><div className="workerCards">{data.workers.slice(0, 8).map((worker) => <button key={worker.id} type="button" className="workerCard" onClick={() => open(worker)}><b>{worker.name}</b><small>{worker.status} - {worker.job}</small><span>GPS {worker.gps}</span><em>{worker.proof}</em><i>{worker.timesheet} - {worker.payroll}</i></button>)}</div></Panel><Panel title="Timesheets / Slips" tone="amber">{data.workers.slice(0, 5).map((worker) => <Row key={worker.id} title={worker.name} meta={`${worker.timesheet} - ${worker.payroll}`} tone="amber" onClick={() => open(worker)} />)}</Panel></div>;
}
function Quotes({ data, open }) {
  return <div className="cocPage quotesPage"><div className="toolbar"><button type="button">+ New Quote</button><button type="button">Follow-ups</button><button type="button">Accepted to Jobs</button></div><Panel title="Quote Pipeline" tone="amber" className="wide"><div className="workCards">{data.quotes.slice(0, 8).map((quote) => <button key={quote.id} type="button" className="workCard" onClick={() => open(quote)}><b>{quote.title}</b><small>{quote.client} - {quote.status}</small><span>{quote.scope}</span><em>{money(quote.amount)}</em></button>)}</div></Panel><Panel title="Ready Next" tone="coral"><p>Churvox prepares follow-up. Sending still waits in Command.</p></Panel></div>;
}
function Invoices({ data, open }) {
  return <div className="cocPage invoicesPage"><Panel title="Money State" tone="amber" className="full"><div className="moneyStrip"><span><b>{money(data.invoices.reduce((s, i) => s + Number(i.amount || 0), 0))}</b><small>total</small></span><span><b>{data.invoices.filter((i) => /draft/i.test(i.status)).length}</b><small>drafts</small></span><span><b>{data.invoices.filter((i) => /paid/i.test(i.status)).length}</b><small>paid</small></span></div></Panel><Panel title="Invoice Ledger" tone="blue" className="wide"><div className="ledgerList">{data.invoices.slice(0, 10).map((invoice) => <button key={invoice.id} type="button" className="ledgerRow" onClick={() => open(invoice)}><b>{invoice.number}</b><span>{invoice.client}</span><span>{invoice.status}</span><span>{money(invoice.amount)}</span><em>{invoice.sync}</em></button>)}</div></Panel><Panel title="Sync + Proof" tone="coral"><p>Approval and sync decisions stay in Command.</p></Panel></div>;
}
function Team({ data, open }) {
  return <div className="cocPage teamPage"><Panel title="Team Pulse" tone="blue" className="wide"><div className="miniStats"><Stat label="staff" value={data.workers.length} tone="blue" /><Stat label="payroll" value={data.workers.filter((w) => /review/i.test(w.payroll)).length} tone="amber" /></div></Panel><Panel title="Staff Cards" tone="blue" className="wide"><div className="workerCards">{data.workers.map((worker) => <button key={worker.id} type="button" className="workerCard" onClick={() => open(worker)}><b>{worker.name}</b><small>{worker.role}</small><span>{worker.job}</span><em>{worker.payroll}</em></button>)}</div></Panel><Panel title="Roles + Access" tone="coral"><p>Owner, worker, subcontractor and payroll permissions.</p></Panel></div>;
}
function Payroll({ data, open }) {
  return <div className="cocPage teamPage"><Panel title="Payroll Review" tone="amber" className="wide"><div className="scroll">{data.workers.map((worker) => <Row key={worker.id} title={worker.name} meta={`${worker.timesheet} - ${worker.payroll}`} tone="amber" onClick={() => open(worker)} />)}</div></Panel><Panel title="Rules" tone="coral"><p>No tax filing. No bank payout files. Review/export only.</p></Panel></div>;
}
function Xero({ data, open }) {
  return <div className="cocPage"><Panel title="Connection" className="full"><h3>{data.xero.connected ? `Connected: ${data.xero.tenant_name || "Xero"}` : "Not connected yet"}</h3><span className="chip green">draft sync only</span></Panel><Panel title="Guardrails" tone="coral">{["No tax filing", "No payout files", "Owner-approved sync only", "Draft invoices only"].map((rule) => <Row key={rule} title={rule} meta="locked" tone="coral" />)}</Panel><Panel title="Ready To Sync" tone="blue" className="wide">{data.invoices.slice(0, 5).map((invoice) => <Row key={invoice.id} title={invoice.number} meta={`${invoice.sync} - approval decision in Command`} tone="blue" onClick={() => open(invoice)} />)}</Panel></div>;
}
function Settings({ user }) {
  return <div className="cocPage"><Panel title="Business Controls" tone="dark" className="wide"><div className="formGrid"><Field label="Business name" value={user?.business_name || user?.name || "Not set"} /><Field label="Email" value={user?.email || "Not set"} /><Field label="GST" value={user?.gst_rate || "Not set"} /><Field label="Country" value={user?.country || "Not set"} /></div></Panel><Panel title="Rules + Exports" tone="blue">{["Worker app rules", "CSV defaults", "Security", "Data export", "Billing controls"].map((rule) => <Row key={rule} title={rule} meta="control" tone="blue" />)}</Panel></div>;
}
function Plans() {
  return <div className="cocPage"><Panel title="Plans" tone="amber" className="full"><div className="planList">{plans.map(([name, price, detail]) => <div key={name} className={name === "Operator" ? "popular" : ""}><b>{name}</b><strong>{price}</strong><small>/month + GST</small><p>{detail}</p>{name === "Operator" ? <em>Most Popular</em> : null}</div>)}</div></Panel><Panel title="Add-ons" tone="blue" className="full">{addOns.map((item) => <Row key={item} title={item} meta="locked pricing" tone="blue" />)}</Panel></div>;
}
function Support() {
  return <div className="cocPage supportPage"><Panel title="Contact" tone="coral" className="full"><h3>hello@churvox.com</h3><button className="action">New ticket</button></Panel><Panel title="Open Support">{["Setup help", "CSV import", "Worker app", "Billing"].map((item) => <Row key={item} title={item} meta="ticket" />)}</Panel></div>;
}
function Page({ page, data, open, user }) {
  if (page === "aiguide") return <AiGuide data={data} open={open} />;
  if (page === "command") return <Command data={data} open={open} />;
  if (page === "jobs") return <Jobs data={data} open={open} />;
  if (page === "clients") return <Clients data={data} open={open} />;
  if (page === "quotes") return <Quotes data={data} open={open} />;
  if (page === "invoices") return <Invoices data={data} open={open} />;
  if (page === "team") return <Team data={data} open={open} />;
  if (page === "payroll") return <Payroll data={data} open={open} />;
  if (page === "workers") return <Workers data={data} open={open} />;
  if (page === "xero") return <Xero data={data} open={open} />;
  if (page === "settings") return <Settings user={user} />;
  if (page === "plans") return <Plans />;
  return <Support />;
}
const baseCss = `
.churvoxOptionC,.churvoxOptionC *{box-sizing:border-box}.churvoxOptionC{width:100%;min-height:100vh;overflow-x:hidden;background:#eef2ed;color:#151c19;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:18px}.churvoxOptionC button,.churvoxOptionC input,.churvoxOptionC textarea,.churvoxOptionC select{font:inherit}.cocBar{display:grid;grid-template-columns:auto 1fr auto;gap:18px;align-items:center;border-radius:28px;background:linear-gradient(135deg,#101513,#1b2823 70%,#f0642f);padding:18px 20px;color:#fff;box-shadow:0 24px 60px rgba(16,21,19,.22)}.brand{display:flex;align-items:center;gap:10px}.brand i{display:block;width:46px;height:46px;border-radius:16px;background:#f0642f;box-shadow:0 14px 30px rgba(240,100,47,.3)}.brand b{display:block;font-size:20px;letter-spacing:-.05em}.brand small{display:block;color:#dce6e0;font-weight:900}.title h1{margin:0;font-size:clamp(38px,4vw,58px);letter-spacing:-.09em;line-height:.9}.title p{margin:4px 0 0;color:#e1ebe5;font-weight:900}.owner{display:none!important}.cocNav{display:flex;gap:9px;overflow-x:auto;padding:12px 2px}.cocNav button{border:1px solid rgba(16,21,19,.14);border-radius:999px;background:#fff;color:#151c19;padding:10px 14px;font-weight:950;cursor:pointer;box-shadow:0 8px 20px rgba(16,21,19,.08)}.cocNav button.active{background:#f0642f;color:#fff}.workspace{min-width:0;max-width:100%;overflow-x:hidden}.cocPage{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;min-width:0;max-width:100%}.toolbar{grid-column:1/-1;display:flex;gap:8px;flex-wrap:wrap}.toolbar button,.action{border:0;border-radius:999px;background:#f0642f;color:#fff;padding:10px 14px;font-weight:950;cursor:pointer}.action.dark{background:#101513}.action.quiet{background:#eef2ed;color:#151c19}.cocPanel{position:relative;min-height:180px;border:1px solid rgba(16,21,19,.1);border-radius:24px;background:#fff;padding:16px;box-shadow:0 16px 36px rgba(16,21,19,.08)}.cocPanel h2{margin:-16px -16px 14px;padding:14px 16px;border-radius:24px 24px 0 0;background:linear-gradient(90deg,#f0642f 0 7px,transparent 7px),linear-gradient(135deg,#101513,#1b2823);color:#fff;font-size:24px;letter-spacing:-.06em}.cocPanel.wide{grid-column:span 2}.cocPanel.full{grid-column:1/-1}.scroll{display:grid;gap:8px;max-height:420px;overflow:auto;padding-right:4px}.cocRow{display:grid;grid-template-columns:10px minmax(0,1fr) auto;gap:10px;align-items:center;border:1px solid rgba(16,21,19,.08);border-radius:15px;background:#f4f7f2;padding:11px;color:#151c19;text-align:left;cursor:pointer}.cocRow i{width:10px;height:10px;border-radius:50%;background:#f0642f}.cocRow b,.cocRow small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.cocRow small{color:#5e6b65;font-weight:850}.cocRow em{font-style:normal;color:#b94b24;font-weight:950}.miniStats{display:flex;flex-wrap:wrap;gap:8px}.miniStat{display:grid;min-width:110px;border-radius:16px;padding:12px;background:#eef2ed}.miniStat b{font-size:24px;line-height:1}.miniStat small{font-size:11px;font-weight:900;color:#5e6b65}.chip{display:inline-flex;border-radius:999px;background:#eef2ed;color:#151c19;padding:8px 10px;font-weight:950}.chip.amber,.amber .chip{background:#fff3db}.chip.coral,.coral .chip{background:#ffe8df}.formGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.cocField{display:grid;gap:5px;font-weight:900;color:#33413b}.cocField input,.cocField textarea,.cocField select{width:100%;min-height:42px;border:1px solid rgba(16,21,19,.12);border-radius:12px;padding:9px 10px;background:#fff;color:#151c19;font-weight:850}.cocField textarea{min-height:96px;resize:vertical}.googleMapShell{min-height:330px}.googleMap{position:relative;height:100%;min-height:330px;border-radius:18px;overflow:hidden;background:#eef2ed}.googleMap iframe{position:absolute;inset:0;width:100%;height:100%;border:0}.googleMap a{position:absolute;right:10px;bottom:10px;border-radius:999px;padding:7px 10px;background:#101513;color:#fff;font-size:11px;font-weight:950;text-decoration:none}.jobCards,.workerCards,.workCards{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px}.jobCard,.workerCard,.workCard{display:grid;gap:5px;min-height:118px;border:1px solid rgba(16,21,19,.12);border-radius:16px;padding:13px;background:#f7faf4;color:#151c19;text-align:left;cursor:pointer}.jobCard small,.jobCard span,.workerCard small,.workerCard span,.workCard small,.workCard span{color:#5e6b65;font-size:12px;font-weight:850}.jobCard em,.workerCard em,.workCard em{font-style:normal;font-weight:950;color:#b94b24}.jobCard i,.workerCard i{justify-self:start;border-radius:999px;padding:5px 8px;background:#eef2ed;color:#5e6b65;font-size:11px;font-style:normal;font-weight:950}.ledgerList{display:grid;gap:8px}.ledgerRow{display:grid;grid-template-columns:110px 1fr 110px 100px 170px;gap:10px;align-items:center;border:1px solid rgba(16,21,19,.12);border-radius:12px;padding:10px 12px;background:#f7faf4;color:#151c19;text-align:left;cursor:pointer}.ledgerRow span,.ledgerRow em{overflow:hidden;color:#5e6b65;font-size:12px;font-style:normal;font-weight:850;text-overflow:ellipsis;white-space:nowrap}.proofGrid,.moneyStrip,.ownerActions,.approvalActions{display:flex;flex-wrap:wrap;gap:8px}.planList{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px}.planList>div{position:relative;min-height:220px;border:1px solid rgba(16,21,19,.1);border-radius:20px;background:#f7faf4;padding:18px}.planList>div.popular{background:#101513;color:#fff;box-shadow:0 24px 60px rgba(16,21,19,.22)}.planList b{display:block;font-size:18px}.planList strong{display:block;margin:14px 0 4px;font-size:44px;letter-spacing:-.08em}.planList small{color:#6b756f;font-weight:900}.planList .popular small,.planList .popular p{color:#e7eee9}.planList em{position:absolute;right:14px;top:14px;border-radius:999px;background:#f0642f;color:#fff;padding:6px 10px;font-style:normal;font-weight:950}.cocDrawer{position:fixed;inset:16px 16px 16px auto;z-index:90;width:min(560px,calc(100vw - 32px));overflow:auto;border-radius:28px;background:#fff;box-shadow:0 40px 120px rgba(16,21,19,.45);padding:18px}.cocDrawer>button{float:right;border:0;border-radius:999px;background:#eef2ed;padding:8px 12px;font-weight:950}.cocDrawer h2{font-size:34px;letter-spacing:-.07em}.cocDrawer>div{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.cocDrawer .cocField:has(textarea){grid-column:1/-1}.approvalActions{margin-top:16px;padding-top:14px;border-top:1px solid rgba(16,21,19,.12)}@media(max-width:900px){.churvoxOptionC{padding:10px}.cocBar{grid-template-columns:1fr}.cocPage{grid-template-columns:1fr}.cocPanel.wide,.cocPanel.full{grid-column:1/-1}.formGrid,.cocDrawer>div{grid-template-columns:1fr}.ledgerRow{grid-template-columns:1fr}.cocDrawer{inset:auto 10px 10px 10px;width:auto;max-height:88vh}.title h1{font-size:40px}}
`;

export default function FreshApp() {
  const { user } = useAuth();
  const data = useLegacyData();
  const [page, setPage] = React.useState(pageFromLocation);
  const [selected, setSelected] = React.useState(null);
  const title = NAV.find((item) => keyOf(item) === page) || "AI Guide";
  const subtitle = subtitles[page] || subtitles.aiguide;
  React.useEffect(() => {
    const sync = () => setPage(pageFromLocation());
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => { window.removeEventListener("hashchange", sync); window.removeEventListener("popstate", sync); };
  }, []);
  const go = (next) => {
    setPage(next);
    setSelected(null);
    if (typeof window !== "undefined") window.history.replaceState({}, "", next === "aiguide" ? "/dashboard#setupassistant" : `/dashboard#${next}`);
  };
  return <main className="churvoxOptionC"><style>{baseCss}</style><header className="cocBar"><div className="brand"><i /><span><b>Churvox</b><small>does the admin</small></span></div><div className="title"><h1>{title}</h1><p>{subtitle}</p></div><div className="owner"><span>Owner checks</span><b>{user?.business_name || user?.name || "Boss view"}</b></div></header><nav className="cocNav" aria-label="Churvox OS navigation">{NAV.map((item) => { const key = keyOf(item); return <button key={key} type="button" className={page === key ? "active" : ""} onClick={() => go(key)}>{item}</button>; })}</nav><section className="workspace"><Page page={page} data={data} open={setSelected} user={user} /></section><Drawer selected={selected} onClose={() => setSelected(null)} /></main>;
}
