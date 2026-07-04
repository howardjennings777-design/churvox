import React from "react";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
// removed broken css import
// removed broken css import
// removed broken css import
// removed broken css import
// removed broken css import

const COMMAND_STATE_KEY = "churvox.os.command.state.v5";

const NAV = [
  ["hub", "Smart Hub", "SH", "Run"],
  ["command", "Command", "CM", "Run"],
  ["jobs", "Jobs", "JB", "Work"],
  ["clients", "Clients", "CL", "Work"],
  ["workers", "Workers", "WK", "Work"],
  ["quotes", "Quotes", "QT", "Money"],
  ["invoices", "Invoices", "IV", "Money"],
  ["messages", "Messages", "MS", "Admin"],
  ["team", "Team", "TM", "Admin"],
  ["xero", "Xero", "XR", "Admin"],
  ["settings", "Settings", "ST", "Control"],
  ["plans", "Plans", "PL", "Control"],
  ["help", "Help", "HP", "Control"],
].map(([key, label, code, group]) => ({ key, label, code, group }));

const ALIASES = {
  "": "hub",
  dashboard: "hub",
  smart: "hub",
  home: "hub",
  today: "hub",
  command: "command",
  jobs: "jobs",
  calendar: "jobs",
  schedule: "jobs",
  recurring: "jobs",
  clients: "clients",
  workers: "workers",
  worker: "workers",
  quotes: "quotes",
  invoices: "invoices",
  messages: "messages",
  team: "team",
  payroll: "team",
  xero: "xero",
  accounting: "xero",
  settings: "settings",
  plans: "plans",
  help: "help",
};

const EMPTY = {
  jobs: [],
  clients: [],
  workers: [],
  quotes: [],
  invoices: [],
  messages: [],
  team: [],
  actions: [],
  requests: [],
  xero: {},
};

const planRows = [
  ["Start", "$39/month + GST", "Records", "Jobs, clients, quotes, invoices and recurring jobs for an owner starting clean."],
  ["Crew", "$89/month + GST", "Field", "Worker view, proof, team messages and field records for a small crew."],
  ["Operator", "$149/month + GST", "Most Popular", "Churvox prepares admin actions, follow-ups and owner attention items."],
  ["Command", "$299/month + GST", "Approval OS", "Full approval desk, payroll review, higher capacity and accounting sync option."],
];

function routeKey(value) {
  const key = String(value || "").replace(/^#/, "").replace(/^\//, "").trim().toLowerCase();
  return ALIASES[key] || (NAV.some((item) => item.key === key) ? key : "hub");
}

function idOf(record) {
  const raw = record?.id || record?._id || record?.job_id || record?.client_id || record?.quote_id || record?.invoice_id || record?.worker_id || record?.user_id || "";
  if (typeof raw === "object") return String(raw.$oid || raw.oid || raw.id || raw._id || "");
  return String(raw || "");
}

function firstText(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
  }
  return "";
}

function unwrap(result) {
  const payload = result?.data ?? result;
  return payload?.data ?? payload;
}

function listFrom(result, key) {
  const payload = unwrap(result);
  if (Array.isArray(payload)) return payload;
  if (key && Array.isArray(payload?.[key])) return payload[key];
  for (const name of ["items", "records", "results", "jobs", "clients", "quotes", "invoices", "workers", "notifications", "actions", "requests", "data"]) {
    if (Array.isArray(payload?.[name])) return payload[name];
  }
  return [];
}

function money(value) {
  const number = Number(value || 0);
  return number ? number.toLocaleString("en-NZ", { style: "currency", currency: "NZD" }) : "Ready to check";
}

function statusOf(record, fallback = "Watching") {
  const text = firstText(record?.status, record?.job_status, record?.workflow_status, record?.stage, fallback);
  return text.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function clientName(record) {
  return firstText(record?.client_name, record?.customer_name, record?.name, record?.client?.name, record?.customer?.name, "Client not linked yet");
}

function titleOf(record, fallback = "Prepared admin") {
  return firstText(record?.title, record?.job_title, record?.job_name, record?.description, record?.subject, record?.service_needed, fallback);
}

function secondsLabel(seconds) {
  const total = Number(seconds || 0);
  if (!total) return "No time recorded yet";
  const hours = Math.floor(total / 3600);
  const mins = Math.round((total % 3600) / 60);
  return `${hours ? `${hours}h ` : ""}${mins}m`.trim();
}

function proofOf(record) {
  const photos = Array.isArray(record?.photos) ? record.photos.length : Array.isArray(record?.proof_photos) ? record.proof_photos.length : 0;
  const notes = firstText(record?.worker_notes, record?.completion_notes, record?.proof_note, record?.worker_message);
  if (!photos && !notes) return "Proof waiting";
  return `${photos} photo${photos === 1 ? "" : "s"}${notes ? " + worker note" : ""}`;
}

function formatJson(value) {
  if (!value) return "No extra detail saved.";
  if (typeof value === "string") return value;
  try { return JSON.stringify(value, null, 2); } catch { return String(value); }
}

function useRoute() {
  const [page, setPage] = React.useState(() => routeKey(typeof window === "undefined" ? "hub" : window.location.hash || window.localStorage.getItem("churvox.os.page")));
  const navigate = React.useCallback((next) => {
    const target = routeKey(next);
    setPage(target);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("churvox.os.page", target);
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${target}`);
    }
  }, []);
  React.useEffect(() => {
    const onHash = () => setPage(routeKey(window.location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return [page, navigate];
}

function useCommandState() {
  const [state, setState] = React.useState(() => {
    if (typeof window === "undefined") return {};
    try { return JSON.parse(window.localStorage.getItem(COMMAND_STATE_KEY) || "{}"); } catch { return {}; }
  });
  React.useEffect(() => {
    try { window.localStorage.setItem(COMMAND_STATE_KEY, JSON.stringify(state)); } catch {}
  }, [state]);
  return [state, setState];
}

function useLiveData(api) {
  const [data, setData] = React.useState(EMPTY);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const reload = React.useCallback(async () => {
    setLoading(true);
    setError("");
    const calls = [
      ["jobs", "/jobs"],
      ["clients", "/clients"],
      ["quotes", "/quotes"],
      ["invoices", "/invoices"],
      ["team", "/team/workers"],
      ["live", "/worker/live-status"],
      ["messages", "/notifications"],
      ["actions", "/ai/actions"],
      ["requests", "/customer-requests"],
      ["xero", "/xero/status"],
    ];
    const results = await Promise.allSettled(calls.map(([, endpoint]) => api.get(endpoint)));
    const bag = Object.fromEntries(calls.map(([key], index) => [key, results[index]]));
    const value = (key) => bag[key]?.status === "fulfilled" && bag[key].value?.success !== false ? bag[key].value : null;
    const failed = calls.filter(([key]) => !value(key)).map(([key]) => key);

    const jobs = listFrom(value("jobs"), "jobs").map((job) => ({
      raw: job,
      id: idOf(job),
      title: titleOf(job, "Untitled job"),
      client: clientName(job),
      worker: firstText(job.assigned_worker_name, job.worker_name, job.assigned_to_name, job.worker?.name, "Unassigned"),
      status: statusOf(job, "Intake"),
      recurring: job.is_recurring || job.recurring_frequency || job.recurrence_pattern ? firstText(job.recurring_frequency, job.recurrence_pattern, "Recurring") : "One-off",
      proof: proofOf(job),
      time: secondsLabel(job.total_time_seconds || job.timer_total_seconds || job.shift_seconds),
      adminReady: Boolean(job.invoice_ready || job.owner_approval_required || job.message_ready),
      updated: firstText(job.updated_at, job.created_at, job.scheduled_date),
    }));

    const invoices = listFrom(value("invoices"), "invoices").map((invoice) => ({
      raw: invoice,
      id: idOf(invoice),
      title: titleOf(invoice, firstText(invoice.invoice_number, `Invoice - ${clientName(invoice)}`)),
      client: clientName(invoice),
      status: statusOf(invoice, "Draft"),
      amount: Number(invoice.amount || invoice.total || invoice.subtotal || 0),
      note: firstText(invoice.notes, invoice.xero_sync_status, invoice.myob_sync_status, "Draft details ready to check."),
    }));

    const quotes = listFrom(value("quotes"), "quotes").map((quote) => ({
      raw: quote,
      id: idOf(quote),
      title: titleOf(quote, `Quote - ${clientName(quote)}`),
      client: clientName(quote),
      status: statusOf(quote, "Draft"),
      amount: Number(quote.amount || quote.total || quote.price || 0),
      note: firstText(quote.notes, quote.detail, quote.description, "Quote wording and pricing ready to check."),
    }));

    const clients = listFrom(value("clients"), "clients").map((client) => ({
      raw: client,
      id: idOf(client),
      name: clientName(client),
      email: firstText(client.email),
      phone: firstText(client.phone, client.mobile),
      address: firstText(client.address),
      note: firstText(client.notes, client.note, client.address, "No client notes saved yet."),
      jobs: jobs.filter((job) => job.client === clientName(client)).length,
      value: invoices.filter((invoice) => invoice.client === clientName(client)).reduce((sum, invoice) => sum + invoice.amount, 0),
    }));

    const teamRows = listFrom(value("team"), "workers");
    const liveRows = listFrom(value("live"), "workers");
    const liveByKey = new Map(liveRows.map((row) => [String(row.worker_id || row.id || row.email || row.worker_email || ""), row]));
    const workers = (liveRows.length ? liveRows : teamRows).map((worker, index) => {
      const key = String(worker.worker_id || worker.id || worker._id || worker.email || worker.worker_email || "");
      const live = liveByKey.get(key) || worker;
      const name = firstText(worker.name, worker.full_name, worker.worker_name, live.worker_name, worker.email, `Worker ${index + 1}`);
      const lat = Number(live.last_lat || live.gps_lat || live.latitude || worker.last_lat || worker.gps_lat || worker.latitude || 0);
      const lng = Number(live.last_lng || live.gps_lng || live.longitude || worker.last_lng || worker.gps_lng || worker.longitude || 0);
      return {
        raw: worker,
        live,
        id: idOf(worker) || idOf(live) || `worker-${index}`,
        name,
        initials: name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
        status: firstText(live.live_status, live.clock_status, worker.status, "Waiting"),
        job: firstText(live.current_job_title, worker.current_job, "No active job"),
        proof: firstText(live.proof_status, worker.proof, "Proof waiting"),
        time: secondsLabel(live.shift_seconds || live.total_shift_seconds || worker.payroll_seconds),
        lat,
        lng,
        hasGps: Boolean(lat && lng),
        gpsLabel: firstText(live.gps_label, live.last_gps_label, worker.gps_label, lat && lng ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : "GPS permission waiting"),
      };
    });

    const team = teamRows.map((member, index) => ({
      raw: member,
      id: idOf(member) || `team-${index}`,
      person: firstText(member.name, member.full_name, member.email, `Team ${index + 1}`),
      role: firstText(member.role, "Worker"),
      workerApp: firstText(member.worker_app_status, member.status, member.active ? "Ready" : "Invite pending"),
      jobs: firstText(member.jobs_access, member.assigned_job_count, "Assigned"),
      payroll: firstText(member.payroll_status, member.payroll_hours ? "Review" : "-"),
    }));

    const messages = listFrom(value("messages"), "notifications").map((message) => ({
      raw: message,
      id: idOf(message),
      title: titleOf(message, "Message"),
      detail: firstText(message.message, message.body, message.summary, "Message ready to check."),
      audience: firstText(message.audience, message.source, message.type, "Owner"),
      status: message.read || message.is_read ? "Read" : "Prepared",
    }));

    setData({ jobs, clients, quotes, invoices, workers, team, messages, actions: listFrom(value("actions"), "actions"), requests: listFrom(value("requests"), "requests"), xero: unwrap(value("xero")) || {} });
    if (failed.length) setError(`Some modules did not load yet: ${failed.join(", ")}.`);
    setLoading(false);
  }, [api]);

  React.useEffect(() => { reload(); }, [reload]);
  return { data, loading, error, reload };
}

function commandStateFor(state, id) {
  return state[id] || { state: "open", edited: false, note: "" };
}

function needsCommand(status) {
  return /draft|ready|prepared|pending|review|overdue|sync|unread|open/i.test(status || "");
}

function actionSlip(action) {
  const kind = firstText(action.recordType, action.record_type, action.type, "Action");
  const title = firstText(action.title, action.actionKey, `${kind} ready for review`);
  const detail = firstText(action.ownerAuditNote, action.afterApproval, action.detail, action.summary, "Churvox prepared this admin action from a real saved record.");
  return {
    id: `action:${idOf(action)}`,
    actionId: idOf(action),
    type: kind,
    title,
    amount: firstText(action.notifyMode, action.status, "Ready for owner"),
    source: firstText(action.source, "AI actions"),
    prepared: detail,
    used: firstText(action.recordType, action.record_type, "Saved Churvox record"),
    filled: formatJson(action.fieldPatch || action.payload || action.afterApproval || action.ownerAuditNote || detail),
    guardrail: "Internal only until owner approves in Command.",
    evidence: ["Real AI action record", "Owner approval required", "Stored in Command queue"],
  };
}

function quoteSlip(quote) {
  return {
    id: `quote:${quote.id}`,
    sourceType: "quote",
    sourceId: quote.id,
    type: "Quote",
    title: quote.title,
    amount: money(quote.amount),
    source: "Quotes",
    prepared: quote.note,
    used: `${quote.client} / pricing and job notes`,
    filled: `Quote: ${quote.title}\nClient: ${quote.client}\nAmount: ${money(quote.amount)}\nStatus: ${quote.status}\nNotes: ${quote.note}`,
    guardrail: "Quote is prepared only. It does not send from Quotes.",
    evidence: ["Quote record loaded", "Client and price memory attached", "Owner decision happens here"],
  };
}

function invoiceSlip(invoice) {
  return {
    id: `invoice:${invoice.id}`,
    sourceType: "invoice",
    sourceId: invoice.id,
    type: "Invoice",
    title: invoice.title,
    amount: money(invoice.amount),
    source: "Invoices",
    prepared: invoice.note,
    used: `${invoice.client} / job proof and invoice lines`,
    filled: `Invoice: ${invoice.title}\nClient: ${invoice.client}\nAmount: ${money(invoice.amount)}\nStatus: ${invoice.status}\nNote: ${invoice.note}`,
    guardrail: "Prepared, not sent. Accounting sync still waits for owner approval.",
    evidence: ["Invoice record loaded", "Proof and line items checked", "No tax or payout files"],
  };
}

function messageSlip(message) {
  return {
    id: `message:${message.id}`,
    sourceType: "message",
    sourceId: message.id,
    type: "Message",
    title: message.title,
    amount: message.audience,
    source: "Messages",
    prepared: message.detail,
    used: firstText(message.audience, "Message context"),
    filled: `To: ${message.audience}\nSubject: ${message.title}\nPrepared reply:\n${message.detail}`,
    guardrail: "Nothing sends from Messages. Owner approves here.",
    evidence: ["Real message/notification", "Prepared reply visible", "No auto-send"],
  };
}

function requestSlip(request) {
  return {
    id: `request:${idOf(request)}`,
    sourceType: "request",
    sourceId: idOf(request),
    type: "Request",
    title: firstText(request.service_needed, request.title, "Customer request"),
    amount: firstText(request.urgency, request.status, "New"),
    source: "Customer requests",
    prepared: firstText(request.message, request.customer_name, "New customer request ready to turn into work."),
    used: firstText(request.customer_name, request.email, request.phone, "Customer request form"),
    filled: formatJson(request),
    guardrail: "Churvox does not create or send anything until owner clears it.",
    evidence: ["Customer request saved", "Owner review required", "Can become real work after approval"],
  };
}

function buildQueue(data, state) {
  const queue = [];
  data.actions.filter((action) => !/approved|declined|done/i.test(action.status || "")).forEach((action) => queue.push(actionSlip(action)));
  data.quotes.filter((quote) => needsCommand(quote.status)).forEach((quote) => queue.push(quoteSlip(quote)));
  data.invoices.filter((invoice) => needsCommand(invoice.status)).forEach((invoice) => queue.push(invoiceSlip(invoice)));
  data.messages.filter((message) => needsCommand(message.status)).forEach((message) => queue.push(messageSlip(message)));
  data.requests.forEach((request) => queue.push(requestSlip(request)));
  return queue.map((item) => ({ ...item, ...commandStateFor(state, item.id) })).filter((item) => item.state !== "approved");
}

function Sidebar({ page, navigate, summary, data, loading, error }) {
  const groups = NAV.reduce((acc, item) => {
    acc[item.group] = acc[item.group] || [];
    acc[item.group].push(item);
    return acc;
  }, {});
  return <aside className="osSidebar">
    <div className="osBrand"><div className="osLogo">C</div><div><strong>churvox</strong><span>Owner admin OS</span></div></div>
    {Object.entries(groups).map(([group, items]) => <div className="osNavGroup" key={group}><p>{group}</p>{items.map((item) => <button className={page === item.key ? "active" : ""} key={item.key} onClick={() => navigate(item.key)} type="button"><span className="navCode">{item.code}</span><span className="navLabel">{item.label}</span>{item.key === "command" && summary.open ? <span className="navCount">{summary.open}</span> : item.key === "messages" && data.messages.length ? <span className="navCount">{data.messages.length}</span> : null}</button>)}</div>)}
    <div className="osSystemCard"><b>{loading ? "Loading live records" : "Live records loaded"}</b><span>{data.jobs.length} jobs / {data.clients.length} clients / {data.workers.filter((worker) => worker.hasGps).length} GPS pings</span>{error ? <span>{error}</span> : null}</div>
  </aside>;
}

function Topbar({ page, navigate, addWork, busy }) {
  const [text, setText] = React.useState("");
  const label = NAV.find((item) => item.key === page)?.label || "Smart Hub";
  return <header className="osTopbar"><div><span>Churvox OS</span><strong>{label}</strong></div><form className="osSearch" onSubmit={(event) => { event.preventDefault(); if (text.trim()) { addWork(text.trim()); setText(""); } }}><span>Add real work</span><input value={text} onChange={(event) => setText(event.target.value)} placeholder="Leaking tap for Watson, quote follow-up, invoice proof..." /><button disabled={busy} type="submit">Add work</button></form><button className="ownerPill" onClick={() => navigate("command")} type="button"><span>G'day</span><b>Owner</b></button></header>;
}

function Empty({ title, text }) {
  return <div className="realEmpty"><b>{title}</b><span>{text}</span></div>;
}

function CommandPage({ queue, summary, approve, busy }) {
  const [selectedId, setSelectedId] = React.useState("");
  React.useEffect(() => { if ((!selectedId || !queue.some((item) => item.id === selectedId)) && queue[0]) setSelectedId(queue[0].id); }, [queue, selectedId]);
  const selected = queue.find((item) => item.id === selectedId) || queue[0];
  const [note, setNote] = React.useState("");
  React.useEffect(() => { setNote(selected?.note || "Looks right. Keep wording short and practical."); }, [selected?.id]);

  if (!selected) return <section className="commandPage properCommand emptyCommand"><aside className="commandQueue"><span className="kicker">Command</span><h1>Approve the prepared admin.</h1><Empty title="Nothing waiting" text="When Churvox prepares a quote, invoice, reply, client action or sync decision, the filled slip appears here." /></aside></section>;

  return <section className="commandPage properCommand">
    <aside className="commandQueue"><span className="kicker">Command</span><h1>Approve the prepared admin.</h1><div className="queueStats"><b>Open {summary.open}</b><span>Edited {summary.edited}</span><span>Parked {summary.parked}</span><span>Approved {summary.approved}</span></div>{queue.map((item) => <button className={`${selected.id === item.id ? "selected" : ""} ${item.state}`} key={item.id} onClick={() => setSelectedId(item.id)} type="button"><small>{item.type}</small><strong>{item.title}</strong><span>{item.prepared}</span><em className="sourceState">{item.edited ? "Edited" : item.state}</em></button>)}</aside>
    <article className="decisionSlip realSlip"><header><span className="kicker">Prepared by Churvox</span><h2>{selected.title}</h2><strong>{selected.amount}</strong></header><div className="ownerCheckStrip"><b>This is the admin Churvox prepared.</b><span>Check it, edit the owner note if needed, then approve here only.</span></div><div className="realFilledForm"><label><span>Real source</span><b>{selected.source}</b></label><label><span>What Churvox prepared</span><b>{selected.prepared}</b></label><label><span>What Churvox used</span><b>{selected.used}</b></label><label><span>Guardrail</span><b>{selected.guardrail}</b></label><label className="filledPreview"><span>Filled slip</span><pre>{selected.filled}</pre></label><label className="ownerNote"><span>Owner note / edit</span><textarea value={note} onChange={(event) => setNote(event.target.value)} /></label></div><div className="commandActions stickyActions"><button disabled={busy} onClick={() => approve(selected, "approved", note)} type="button">Approve</button><button disabled={busy} onClick={() => approve(selected, "open", note, true)} type="button">Save edit</button><button disabled={busy} onClick={() => approve(selected, "parked", note)} type="button">Park</button></div></article>
    <aside className="evidenceRail"><h3>Evidence</h3><p>The slip is built from real Churvox records. This is the one place the owner decides.</p>{selected.evidence.map((item) => <div key={item}><b>{item}</b><span>{selected.type} evidence connected to this approval item.</span></div>)}</aside>
  </section>;
}

function MapBox({ workers }) {
  const gpsWorkers = workers.filter((worker) => worker.hasGps);
  const center = gpsWorkers[0] || { lat: -41.2128, lng: 174.9083 };
  const lat = Number(center.lat || -41.2128);
  const lng = Number(center.lng || 174.9083);
  const bbox = `${lng - 0.05}%2C${lat - 0.035}%2C${lng + 0.05}%2C${lat + 0.035}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;
  return <div className="realMap"><iframe title="Worker GPS map" src={src} loading="lazy" />{gpsWorkers.map((worker, index) => <button className="realMapPin" style={{ left: `${18 + (index % 4) * 20}%`, top: `${20 + (index % 3) * 22}%` }} key={worker.id} type="button"><b>{worker.initials}</b><span>{worker.name}</span><small>{worker.gpsLabel}</small></button>)}{!gpsWorkers.length ? <div className="mapNotice"><b>Map ready.</b><span>Worker pins appear when the worker app sends real GPS lat/lng.</span></div> : null}</div>;
}

function HubPage({ data, navigate, summary, loading, error }) {
  const activity = [
    ...data.jobs.slice(0, 4).map((job) => [job.updated || "now", "Job", `${job.title} - ${job.status}`]),
    ...data.quotes.slice(0, 3).map((quote) => ["", "Quote", `${quote.title} - ${quote.status}`]),
    ...data.invoices.slice(0, 3).map((invoice) => ["", "Invoice", `${invoice.title} - ${invoice.status}`]),
  ].slice(0, 8);
  return <section className="hubPage properHub"><article className="attentionPanel"><header><div><span className="kicker">Smart Hub</span><h1>Owner attention today.</h1></div><span className="livePill">Live</span></header>{loading ? <Empty title="Loading live work" text="Pulling jobs, clients, admin actions, invoices and worker proof." /> : error ? <Empty title="Some modules need attention" text={error} /> : null}<div className="flowBoard"><article><h2>Real work added <span>{data.jobs.length}</span></h2>{activity.map((row, index) => <p key={`${row[1]}-${index}`}><small>{row[0]}</small><b>{row[1]}</b><span>{row[2]}</span></p>)}</article><article><h2>Admin prepared <span>{summary.open}</span></h2>{summary.queue.slice(0, 5).map((item) => <p key={item.id}><small>{item.type}</small><b>{item.title}</b><span>{item.amount}</span></p>)}</article><article><h2>Sent to Command <span>{summary.open}</span></h2><p><small>Rule</small><b>One approval place</b><span>Command only</span></p><p><small>Guard</small><b>No auto-send</b><span>Owner approves</span></p></article></div></article><article className="mapPanel"><header><span className="kicker">Workers and proof</span><b>{data.workers.filter((worker) => worker.hasGps).length} live GPS ping(s)</b></header><MapBox workers={data.workers} /></article><article className="dispatchPanel"><header><div><span className="kicker">Live dispatch board</span><h2>Field work Churvox is watching.</h2></div><button onClick={() => navigate("jobs")} type="button">Open Jobs</button></header><table><thead><tr><th>Job</th><th>Client</th><th>Worker</th><th>Status</th><th>Recurring</th><th>Proof</th><th>Time</th></tr></thead><tbody>{data.jobs.slice(0, 8).map((job) => <tr key={job.id}><td><b>#{job.id || "new"}</b><span>{job.title}</span></td><td>{job.client}</td><td>{job.worker}</td><td><span className="status">{job.status}</span></td><td>{job.recurring}</td><td>{job.proof}</td><td>{job.time}</td></tr>)}</tbody></table>{!data.jobs.length ? <Empty title="No jobs yet" text="Add real work or import jobs to start the admin engine." /> : null}</article></section>;
}

function JobsPage({ data, navigate }) {
  const lanes = ["Intake", "Dispatch", "Recurring", "Proof", "Admin prepared"];
  const inLane = (job, lane) => lane === "Recurring" ? job.recurring !== "One-off" : lane === "Proof" ? !/waiting/i.test(job.proof) : lane === "Admin prepared" ? job.adminReady : lane === "Dispatch" ? /assigned|progress|site|on job|scheduled/i.test(job.status) : !job.adminReady;
  return <section className="jobsPage"><header className="pageStatement"><span className="kicker">Jobs</span><h1>Dispatch board, recurring engine and proof trail in one place.</h1><p>Real work lives here. Churvox prepares admin in the background and sends decisions to Command.</p></header><div className="jobMachine">{lanes.map((lane) => <article key={lane}><header><b>{lane}</b><span>{lane === "Recurring" ? "Recurring lives here" : lane === "Admin prepared" ? "Sent to Command" : "Watched by Churvox"}</span></header>{data.jobs.filter((job) => inLane(job, lane)).slice(0, 6).map((job) => <p key={`${lane}-${job.id}`}><strong>{job.title} - {job.client}</strong><small>{job.status} / {job.proof}</small></p>)}{!data.jobs.filter((job) => inLane(job, lane)).length ? <Empty title="Empty lane" text="No real records here yet." /> : null}</article>)}</div><div className="jobWorkbench"><article><span className="kicker">Selected work order</span>{data.jobs[0] ? <><h2>{data.jobs[0].title} - {data.jobs[0].client}</h2><dl><div><dt>Worker</dt><dd>{data.jobs[0].worker}</dd></div><div><dt>Proof</dt><dd>{data.jobs[0].proof}</dd></div><div><dt>Time</dt><dd>{data.jobs[0].time}</dd></div><div><dt>Recurring</dt><dd>{data.jobs[0].recurring}</dd></div></dl></> : <Empty title="No selected job" text="Create the first real job." />}</article><aside><h3>Admin prepared from this job</h3><p>Quote, invoice, message and worker-gap decisions are reviewed in Command.</p><button onClick={() => navigate("command")} type="button">Open Command queue</button></aside></div></section>;
}

function WorkersPage({ data }) {
  return <section className="workersPage properWorkers"><div className="fieldMap"><header><span className="kicker">Workers</span><h1>Live field, GPS and proof command view.</h1></header><MapBox workers={data.workers} /></div><aside className="proofStack"><span className="kicker">Proof pack</span><h2>Photos, notes, time and GPS feed Command.</h2>{data.workers.map((worker) => <p key={worker.id}><b>{worker.initials} {worker.name}</b><span>{worker.job}</span><small>{worker.status} - {worker.time} - {worker.hasGps ? worker.gpsLabel : "GPS permission waiting"}</small></p>)}{!data.workers.length ? <Empty title="No workers" text="Add workers so GPS, proof and live status can appear." /> : null}</aside></section>;
}

function ClientsPage({ data }) {
  const [selectedId, setSelectedId] = React.useState("");
  React.useEffect(() => { if (!selectedId && data.clients[0]) setSelectedId(data.clients[0].id); }, [data.clients, selectedId]);
  const selected = data.clients.find((client) => client.id === selectedId) || data.clients[0];
  return <section className="clientsPage"><aside className="clientIndex"><span className="kicker">Customer memory</span><h1>Client dossier.</h1>{data.clients.map((client) => <button className={client.id === selected?.id ? "active" : ""} key={client.id} onClick={() => setSelectedId(client.id)} type="button"><b>{client.name}</b><span>{client.jobs} jobs - {money(client.value)}</span></button>)}{!data.clients.length ? <Empty title="No clients" text="Add or import clients to build real customer memory." /> : null}</aside><article className="clientDossier"><header><span className="kicker">Selected client</span>{selected ? <><h2>{selected.name}</h2><p>{selected.note}</p></> : null}</header>{selected ? <div className="dossierGrid"><div><b>Contact</b><span>{selected.email || "No email"} / {selected.phone || "No phone"}</span></div><div><b>Address</b><span>{selected.address || "No address saved"}</span></div><div><b>Service memory</b><span>{selected.note}</span></div><div><b>Price memory</b><span>{money(selected.value)} recorded</span></div></div> : <Empty title="No selected client" text="No client record exists yet." />}</article><aside className="clientTimeline"><h3>Working trail</h3>{data.jobs.filter((job) => selected && job.client === selected.name).slice(0, 8).map((job) => <p key={job.id}>{job.title} / {job.status}</p>)}</aside></section>;
}

function SimpleBoard({ title, kicker, subtitle, items, render, cta, onCta }) {
  return <section className="messagesPage simpleRealPage"><header className="messageHeader"><span className="kicker">{kicker}</span><h1>{title}</h1><p>{subtitle}</p></header><div className="replyBoard">{items.map(render)}{!items.length ? <Empty title="Nothing here yet" text="Real records will show here when they exist." /> : null}</div>{cta ? <aside className="messageGuard"><h2>{cta}</h2><button type="button" onClick={onCta}>Open Command queue</button></aside> : null}</section>;
}

function XeroPage({ data }) {
  const connected = Boolean(data.xero.connected || data.xero.xero_connected || data.xero.tenant_name);
  const rows = [["Connection", connected ? `Connected${data.xero.tenant_name ? ` to ${data.xero.tenant_name}` : ""}` : "Not connected"], ["Draft invoice sync only", "No automatic invoice sending."], ["Payment refresh", "Only mark paid after accounting confirms paid."], ["No tax filing", "Churvox does not submit to government."], ["No payout files", "No bank payout files are created."], ["Owner approval", "Command remains the decision point."]];
  return <section className="xeroPage"><div className="xeroStatement"><span className="kicker">Xero</span><h1>Draft sync guardrails.</h1><p>Accounting status is live from the backend. Command decides what moves.</p></div><div className="guardrailGrid">{rows.map(([title, text]) => <article key={title}><b>{title}</b><p>{text}</p></article>)}</div></section>;
}

function ControlPage({ title, subtitle, items }) {
  return <section className="controlPage"><header className="controlHeader"><span className="kicker">Control</span><h1>{title}</h1><p>{subtitle}</p></header><div className="controlGrid">{items.map(([name, text]) => <article key={name}><b>{name}</b><p>{text}</p></article>)}</div></section>;
}

function PlansPage() {
  return <section className="plansPage"><header className="plansHeader"><span className="kicker">Plans</span><h1>Simple tiers. Clear admin power.</h1><p>Pricing stays fixed. Your public Stripe pricing remains the source of truth.</p></header><div className="planCards">{planRows.map(([name, price, tag, text]) => <article className={name === "Operator" ? "popular" : ""} key={name}><span>{tag}</span><h2>{name}</h2><strong>{price}</strong><p>{text}</p></article>)}</div><div className="planMatrix"><table><thead><tr><th>Feature</th><th>Start</th><th>Crew</th><th>Operator</th><th>Command</th></tr></thead><tbody>{[["Recurring inside Jobs", "Included", "Included", "Included", "Included"], ["Worker proof", "Owner records", "Included", "Included", "Included"], ["Prepared admin", "Manual", "Prompts", "Included", "Included"], ["Command desk", "View only", "View only", "Core", "Full"], ["Accounting Sync Add-on", "$39/month + GST", "$39/month + GST", "$39/month + GST", "Included option"], ["Command Growth Pack", "-", "-", "-", "$99/month + GST"]].map((row) => <tr key={row[0]}>{row.map((cell) => <td key={`${row[0]}-${cell}`}>{cell}</td>)}</tr>)}</tbody></table></div></section>;
}

export default function ChurvoxOSProper() {
  const api = useApi();
  const { user } = useAuth();
  const [page, navigate] = useRoute();
  const [commandState, setCommandState] = useCommandState();
  const { data, loading, error, reload } = useLiveData(api);
  const queue = React.useMemo(() => buildQueue(data, commandState), [data, commandState]);
  const summary = React.useMemo(() => ({ open: queue.filter((item) => item.state !== "parked").length, edited: queue.filter((item) => item.edited).length, parked: queue.filter((item) => item.state === "parked").length, approved: Object.values(commandState).filter((item) => item.state === "approved").length, queue }), [queue, commandState]);
  const [busy, setBusy] = React.useState(false);
  const [addBusy, setAddBusy] = React.useState(false);

  const addWork = React.useCallback(async (title) => {
    setAddBusy(true);
    try {
      await api.post("/jobs", { title, job_type: "other", customer_name: "To confirm", address: "To confirm", scheduled_date: new Date().toISOString(), notes: "Added from Churvox OS. Confirm client, address, worker and price before sending anything." });
      await reload();
      navigate("jobs");
    } finally {
      setAddBusy(false);
    }
  }, [api, reload, navigate]);

  const approve = React.useCallback(async (item, state, note, edited = false) => {
    setBusy(true);
    try {
      if (state === "approved") {
        if (item.actionId) await api.post(`/ai/actions/${item.actionId}/approve`, { note });
        else if (item.sourceType === "quote") await api.post(`/quotes/${item.sourceId}/send`, { note });
        else if (item.sourceType === "invoice") await api.patch(`/invoices/${item.sourceId}`, { status: "sent", notes: note || item.prepared });
        else if (item.sourceType === "request") await api.patch(`/customer-requests/${item.sourceId}`, { status: "Owner approved", owner_note: note });
      }
      if (state === "parked" && item.actionId) await api.post(`/ai/actions/${item.actionId}/decline`, { note: note || "Parked by owner" });
      setCommandState((current) => ({ ...current, [item.id]: { state, note, edited: edited || current[item.id]?.edited || false, updated_at: new Date().toISOString() } }));
      await reload();
    } catch (err) {
      setCommandState((current) => ({ ...current, [item.id]: { state: "open", note: err?.message || "Backend action failed. Check the slip and try again.", edited: true, updated_at: new Date().toISOString() } }));
    } finally {
      setBusy(false);
    }
  }, [api, reload, setCommandState]);

  let content = null;
  if (page === "command") content = <CommandPage queue={queue} summary={summary} approve={approve} busy={busy} />;
  else if (page === "jobs") content = <JobsPage data={data} navigate={navigate} />;
  else if (page === "clients") content = <ClientsPage data={data} />;
  else if (page === "workers") content = <WorkersPage data={data} />;
  else if (page === "quotes") content = <SimpleBoard kicker="Quotes" title="Offer pipeline without approval clutter." subtitle="Quotes stay here as work-in-progress. Prepared decisions move to Command." items={data.quotes} onCta={() => navigate("command")} cta="Prepared quote work goes to Command." render={(quote) => <article key={quote.id}><span>{quote.status}</span><b>{quote.title}</b><p>{quote.note}</p><small>{money(quote.amount)}</small></article>} />;
  else if (page === "invoices") content = <SimpleBoard kicker="Invoices" title="Money desk." subtitle="Invoices show proof, status and sync readiness. Sending and sync approvals stay in Command." items={data.invoices} onCta={() => navigate("command")} cta="Prepared, not sent." render={(invoice) => <article key={invoice.id}><span>{invoice.status}</span><b>{invoice.title}</b><p>{invoice.note}</p><small>{money(invoice.amount)}</small></article>} />;
  else if (page === "messages") content = <SimpleBoard kicker="Messages" title="Prepared replies, not another inbox." subtitle="Replies are drafted from real context. Nothing sends from here." items={data.messages} onCta={() => navigate("command")} cta="Nothing sends without owner approval." render={(message) => <article key={message.id}><span>{message.audience}</span><b>{message.title}</b><p>{message.detail}</p><small>{message.status}</small></article>} />;
  else if (page === "team") content = <ControlPage title="Access, payroll review and worker app readiness." subtitle="Team rows come from real worker records." items={data.team.length ? data.team.map((row) => [row.person, `${row.role} / worker app ${row.workerApp} / payroll ${row.payroll}`]) : [["No team rows", "Add workers so access, payroll review and worker app readiness can be checked."]]} />;
  else if (page === "xero") content = <XeroPage data={data} />;
  else if (page === "settings") content = <ControlPage title="Settings" subtitle="Business controls grouped by what the owner actually needs." items={[["Business identity", user?.business_name || user?.email || "Current account loaded."], ["Invoice defaults", "GST rate, due dates, numbering and wording."], ["Approval rules", "Command is the one approval place."], ["Notifications", "Owner prompts, worker alerts and quiet hours."], ["Imports", "Clients, jobs, invoices and team records should create real backend rows."]]} />;
  else if (page === "plans") content = <PlansPage />;
  else if (page === "help") content = <ControlPage title="Help" subtitle="Fast paths for setup, workers, accounting and launch checks." items={[["Setup check", "Create one client, one job, one worker and one invoice."], ["Worker guide", "Workers acknowledge jobs, record time, send GPS and add proof."], ["Accounting guide", "Draft sync only, no tax filing and no payout files."], ["Support", "Use hello@churvox.com when something blocks launch."]]} />;
  else content = <HubPage data={data} navigate={navigate} summary={summary} loading={loading} error={error} />;

  return <main className="churvoxOS realChurvoxOS"><Sidebar page={page} navigate={navigate} summary={summary} data={data} loading={loading} error={error} /><section className="osWorkspace"><Topbar page={page} navigate={navigate} addWork={addWork} busy={addBusy} /><div className="osSurface">{content}</div></section><aside className="commandDock"><div className="dockCore darkDock"><span className="kicker">Command approval desk</span><strong>{summary.open}</strong><p>waiting for owner</p><button onClick={() => navigate("command")} type="button">Open Command</button><div className="ownerDecisionNote">Owner decisions live here.</div></div><div className="dockList"><b>One approval place: Command</b><p><span>Quotes</span><strong>{queue.filter((item) => item.type.toLowerCase().includes("quote")).length}</strong></p><p><span>Invoices</span><strong>{queue.filter((item) => item.type.toLowerCase().includes("invoice")).length}</strong></p><p><span>Messages</span><strong>{queue.filter((item) => item.type.toLowerCase().includes("message")).length}</strong></p><p className="dockTotal"><span>Total waiting</span><strong>{summary.open}</strong></p></div></aside></main>;
}
