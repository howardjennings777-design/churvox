import React from "react";
import "./churvoxOS.css";
import "./churvoxOSReadablePills.css";
import "./churvoxOSWiring.css";

const STORAGE_KEY = "churvox.os.admin.state.v3";

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

const INITIAL_DATA = {
  jobs: [
    { id: "1047", title: "Bathroom Reno", client: "Smith, John", worker: "JD + AC", status: "On site", recurring: "Monthly", proof: "3/5", time: "2h 15m", lane: "Dispatch", admin: "Invoice and site message prepared" },
    { id: "1046", title: "Roof Restore", client: "Taylor, Mark", worker: "LW + RH", status: "On site", recurring: "-", proof: "2/4", time: "1h 40m", lane: "Dispatch", admin: "Worker note watched" },
    { id: "1045", title: "Electrical Work", client: "Patel, Ravi", worker: "DC", status: "En route", recurring: "Quarterly", proof: "1/3", time: "1h 05m", lane: "Proof", admin: "Invoice proof ready" },
    { id: "1044", title: "Deck Repair", client: "Jones, Claire", worker: "JS + TM", status: "Scheduled", recurring: "-", proof: "0/0", time: "-", lane: "Intake", admin: "Quote prepared" },
    { id: "1043", title: "Garden Retain Wall", client: "Brown, Chris", worker: "SB + MW", status: "Scheduled", recurring: "Monthly", proof: "0/0", time: "-", lane: "Recurring", admin: "Next visit watched" },
  ],
  clients: [
    { id: "client-smith", name: "Smith, John", tag: "VIP", jobs: 6, value: 18760, note: "Prefers concise texts and photos after work." },
    { id: "client-jones", name: "Jones, Claire", tag: "Follow-up", jobs: 3, value: 7320, note: "Deck repair quote prepared. Follow-up waiting in Command." },
    { id: "client-patel", name: "Patel, Ravi", tag: "Active", jobs: 2, value: 4950, note: "Invoice proof attached." },
    { id: "client-taylor", name: "Taylor, Mark", tag: "Proof", jobs: 5, value: 12400, note: "Two photos missing from roof restore." },
    { id: "client-brown", name: "Brown, Chris", tag: "Recurring", jobs: 1, value: 1850, note: "Monthly garden and wall check watched." },
  ],
  workers: [
    { id: "worker-rh", initials: "RH", name: "Ravi H", job: "Roof restore", status: "On site", time: "1h 40m", proof: "2 proof", x: 16, y: 20 },
    { id: "worker-js", initials: "JS", name: "Jo S", job: "Deck repair", status: "En route", time: "18 min", proof: "0 proof", x: 70, y: 24 },
    { id: "worker-dc", initials: "DC", name: "Dev C", job: "Electrical work", status: "On site", time: "1h 05m", proof: "1 proof", x: 48, y: 48 },
    { id: "worker-sb", initials: "SB", name: "Sam B", job: "Garden wall", status: "Scheduled", time: "2:00 pm", proof: "0 proof", x: 25, y: 72 },
  ],
  quotes: [
    { id: "quote-deck", title: "Deck repair - Jones", client: "Jones, Claire", stage: "Follow-up ready", amount: 2850, detail: "Prepared from client memory, site note and material allowance." },
    { id: "quote-bathroom", title: "Bathroom Reno - Smith", client: "Smith, John", stage: "Draft", amount: 4200, detail: "Background pricing watched by Churvox." },
    { id: "quote-retain", title: "Retaining wall - Brown", client: "Brown, Chris", stage: "Sent", amount: 1850, detail: "Watched by Churvox." },
    { id: "quote-clean", title: "Commercial clean - Kauri", client: "Kauri", stage: "Viewed", amount: 980, detail: "Watched by Churvox." },
    { id: "quote-lee", title: "Naenae tidy - Lee", client: "Lee", stage: "Follow-up ready", amount: 320, detail: "Follow-up wording prepared from quote history." },
  ],
  invoices: [
    { id: "invoice-patel", stage: "Ready to draft", name: "Electrical work - Patel", client: "Patel, Ravi", amount: 1650, note: "Proof attached" },
    { id: "invoice-taylor", stage: "Waiting proof", name: "Roof restore - Taylor", client: "Taylor, Mark", amount: 980, note: "2 photos missing" },
    { id: "invoice-belmont", stage: "Sent", name: "Belmont reset", client: "Belmont", amount: 190, note: "Viewed" },
    { id: "invoice-upper", stage: "Overdue", name: "Upper Hutt garden", client: "Upper Hutt", amount: 120, note: "Reminder prepared" },
    { id: "invoice-june", stage: "Sync-ready", name: "June lawn run", client: "June run", amount: 430, note: "Draft sync only" },
  ],
  messages: [
    { id: "message-anderson", subject: "Site update - Anderson", audience: "Client", time: "10:15 am", detail: "Short reply prepared from job note.", status: "Prepared" },
    { id: "message-jones", subject: "Quote follow up - Jones", audience: "Client", time: "9:42 am", detail: "Short follow-up prepared from quote history.", status: "Prepared" },
    { id: "message-patel", subject: "Invoice ready - Patel", audience: "Client", time: "9:30 am", detail: "Invoice ready message prepared.", status: "Prepared" },
    { id: "message-smith", subject: "Job reminder - Smith", audience: "Client", time: "9:05 am", detail: "Reminder prepared from schedule.", status: "Watching" },
    { id: "message-team", subject: "Team huddle - All staff", audience: "Team", time: "8:50 am", detail: "Team update drafted from today jobs.", status: "Watching" },
  ],
  team: [
    { id: "team-michael", person: "Michael", role: "Owner", workerApp: "Ready", jobs: "Full", clients: "Full", payroll: "Review", xero: "Sync" },
    { id: "team-jade", person: "Jade", role: "Admin", workerApp: "Off", jobs: "Full", clients: "Full", payroll: "Review", xero: "Draft" },
    { id: "team-luke", person: "Luke", role: "Field", workerApp: "Ready", jobs: "Assigned", clients: "-", payroll: "-", xero: "-" },
    { id: "team-alicia", person: "Alicia", role: "Admin", workerApp: "Off", jobs: "Full", clients: "Full", payroll: "-", xero: "-" },
    { id: "team-tom", person: "Tom", role: "Apprentice", workerApp: "Invite pending", jobs: "Assigned", clients: "-", payroll: "-", xero: "-" },
  ],
  xero: { id: "xero-draft-batch", draftInvoices: 7, draftBills: 2, contacts: 3, items: 6, status: "Ready for Command" },
  approvals: {},
  activity: [
    { id: "a1", time: "8:41", action: "New job added", item: "Bathroom Reno - Smith" },
    { id: "a2", time: "9:12", action: "Client called", item: "Leaking tap - Watson" },
    { id: "a3", time: "9:47", action: "Quote created", item: "Deck repair - Jones" },
    { id: "a4", time: "10:03", action: "Job updated", item: "Roof restore - Taylor" },
  ],
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

function currency(value) {
  return Number(value || 0).toLocaleString("en-NZ", { style: "currency", currency: "NZD" });
}

function normalise(value) {
  const key = String(value || "").replace(/^#/, "").replace(/^\//, "").trim().toLowerCase();
  return ALIASES[key] || (NAV.some((item) => item.key === key) ? key : "hub");
}

function stateFor(data, id) {
  return data.approvals?.[id] || { state: "open", edited: false, note: "Looks right. Keep wording short and practical." };
}

function buildCommandQueue(data) {
  const items = [];
  data.quotes.filter((quote) => quote.stage === "Follow-up ready").forEach((quote) => items.push({
    id: `quote:${quote.id}`, sourceType: "quote", sourceId: quote.id, type: "Quote", title: quote.title, detail: quote.detail, amount: currency(quote.amount), evidence: ["Quote lines prepared", "Client price memory attached", "Nothing sent from Quotes"], source: "Quote pipeline",
  }));
  data.invoices.filter((invoice) => ["Ready to draft", "Overdue", "Sync-ready"].includes(invoice.stage)).forEach((invoice) => items.push({
    id: `invoice:${invoice.id}`, sourceType: "invoice", sourceId: invoice.id, type: "Invoice", title: invoice.name, detail: `${invoice.note}. Owner decision remains in Command.`, amount: currency(invoice.amount), evidence: ["Proof and time checked", "Draft only until owner clears", "No automatic sending"], source: "Money desk",
  }));
  data.messages.filter((message) => message.status === "Prepared").forEach((message) => items.push({
    id: `message:${message.id}`, sourceType: "message", sourceId: message.id, type: "Message", title: message.subject, detail: message.detail, amount: message.time, evidence: ["Job context attached", "Client memory attached", "Nothing sends from Messages"], source: "Prepared replies",
  }));
  data.team.filter((member) => member.workerApp !== "Ready" || member.payroll === "Review").forEach((member) => items.push({
    id: `team:${member.id}`, sourceType: "team", sourceId: member.id, type: "Team", title: `${member.person} access review`, detail: `${member.role} access, worker app and payroll status need owner attention.`, amount: member.workerApp, evidence: ["Role matrix attached", "Payroll review checked", "No access change without owner"], source: "Team matrix",
  }));
  if (data.xero.status === "Ready for Command") {
    items.push({ id: "xero:xero-draft-batch", sourceType: "xero", sourceId: "xero-draft-batch", type: "Xero", title: "Draft sync batch", detail: `${data.xero.draftInvoices} owner-cleared invoices are ready for draft sync only.`, amount: `${data.xero.draftInvoices} drafts`, evidence: ["Draft invoice sync only", "No tax filing", "No bank payout files"], source: "Xero guardrails" });
  }
  return items.map((item) => ({ ...item, ...stateFor(data, item.id) })).filter((item) => item.state !== "approved");
}

function summarizeCommand(data) {
  const queue = buildCommandQueue(data);
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

function useOSData() {
  const [data, setData] = React.useState(() => {
    if (typeof window === "undefined") return INITIAL_DATA;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      return stored ? { ...INITIAL_DATA, ...JSON.parse(stored) } : INITIAL_DATA;
    } catch {
      return INITIAL_DATA;
    }
  });
  React.useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);
  return [data, setData];
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

function Sidebar({ page, onNavigate, summary, data }) {
  const nav = NAV.map((item) => {
    if (item.key === "command") return { ...item, count: summary.open };
    if (item.key === "messages") return { ...item, count: data.messages.filter((message) => message.status === "Prepared").length };
    return item;
  });
  const groups = nav.reduce((acc, item) => { acc[item.group] = acc[item.group] || []; acc[item.group].push(item); return acc; }, {});
  return <aside className="osSidebar">
    <div className="osBrand"><div className="osLogo">C</div><div><strong>churvox</strong><span>Owner admin OS</span></div></div>
    {Object.entries(groups).map(([group, items]) => <nav className="osNavGroup" aria-label={group} key={group}><p>{group}</p>{items.map((item) => <button className={page === item.key ? "active" : ""} key={item.key} onClick={() => onNavigate(item.key)} type="button"><span className="navCode">{item.code}</span><span className="navLabel">{item.label}</span>{item.count ? <span className="navCount">{item.count}</span> : null}</button>)}</nav>)}
    <div className="osSystemCard"><b>All systems normal</b><span>Local admin state saved</span></div>
  </aside>;
}

function Topbar({ page, onAddWork }) {
  const [text, setText] = React.useState("");
  const current = NAV.find((item) => item.key === page) || NAV[0];
  const submit = () => {
    const value = text.trim();
    if (!value) return;
    onAddWork(value);
    setText("");
  };
  return <header className="osTopbar"><div><span>Churvox OS</span><strong>{current.label}</strong></div><div className="osSearch"><span>Ask Churvox</span><input value={text} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") submit(); }} placeholder="Add a job, import clients, find unpaid work..." /><button type="button" onClick={submit}>Add work</button></div><div className="osOwner"><span>G'day</span><b>Owner</b></div></header>;
}

function CommandDock({ onNavigate, summary }) {
  return <aside className="commandDock"><div className="dockCore darkDock"><span className="kicker">Command approval desk</span><strong>{summary.open}</strong><p>waiting for owner</p><div className="dockBeacon" aria-hidden="true"><span /><span /><span /></div><button type="button" onClick={() => onNavigate("command")}>Open Command</button></div><div className="dockList darkDock"><b>Owner decisions live here</b>{["Quote", "Invoice", "Message"].map((label) => <p key={label}><span>{label}s</span><strong>{summary.byType[label] || 0}</strong></p>)}<p className="dockTotal"><span>Total waiting</span><strong>{summary.open}</strong></p></div></aside>;
}

function OSFrame({ page, navigate, data, summary, addWork, children, dock = true }) {
  return <div className="churvoxOS"><Sidebar page={page} onNavigate={navigate} summary={summary} data={data} /><main className={dock ? "osWorkspace hasDock" : "osWorkspace"}><Topbar page={page} onAddWork={addWork} /><div className="osSurface">{children}</div></main>{dock ? <CommandDock onNavigate={navigate} summary={summary} /> : null}</div>;
}

function CsvTools({ type, label, rows, columns, onImport, status }) {
  return <div className="csvTools"><button type="button" onClick={() => downloadCsv(`churvox-${type}.csv`, columns, rows)}>Export {label} CSV</button><label className="csvImportLabel">Import {label} CSV<input accept=".csv,text/csv" type="file" onChange={(event) => { const file = event.target.files?.[0]; if (file) onImport(type, file); event.target.value = ""; }} /></label>{status ? <p className="csvStatus">{status}</p> : null}</div>;
}

function HubPage({ data, summary, onNavigate }) {
  const adminRows = summary.queue.slice(0, 4);
  return <section className="hubPage"><div className="attentionPanel"><header><div><span className="kicker">Smart Hub</span><h1>Owner attention today.</h1></div><span className="livePill">Live</span></header><div className="flowBoard"><article><h2>Real work added<span>{data.jobs.length}</span></h2>{data.activity.slice(0, 4).map((item) => <p key={item.id}><small>{item.time}</small><b>{item.action}</b><span>{item.item}</span></p>)}</article><article><h2>Admin prepared<span>{summary.queue.length}</span></h2>{adminRows.map((item) => <p key={item.id}><small>ready</small><b>{item.type}</b><span>{item.title}</span></p>)}</article><article><h2>Sent to Command<span>{summary.open}</span></h2>{summary.queue.filter((item) => item.state !== "parked").slice(0, 4).map((item) => <p key={item.id}><small>queued</small><b>{item.type}</b><span>{item.amount}</span></p>)}</article></div><div className="rulesStrip"><span>One approval place: Command</span><span>No auto-send</span><span>Draft sync only</span><span>Recurring inside Jobs</span></div></div><DispatchPanel jobs={data.jobs} onNavigate={onNavigate} /><MapPanel workers={data.workers} /><BottomConsole data={data} onNavigate={onNavigate} /></section>;
}

function DispatchPanel({ jobs, onNavigate }) {
  return <div className="dispatchPanel"><header><div><span className="kicker">Live dispatch board</span><h2>Field work Churvox is watching.</h2></div><button type="button" onClick={() => onNavigate("jobs")}>Open Jobs</button></header><table><thead><tr><th>Job</th><th>Client</th><th>Worker</th><th>Status</th><th>Recurring</th><th>Proof</th><th>Time</th></tr></thead><tbody>{jobs.map((job) => <tr key={job.id}><td><b>#{job.id}</b><span>{job.title}</span></td><td>{job.client}</td><td>{job.worker}</td><td><span className={`status ${job.status.toLowerCase().replace(" ", "-")}`}>{job.status}</span></td><td>{job.recurring}</td><td>{job.proof}</td><td>{job.time}</td></tr>)}</tbody></table></div>;
}

function MapPanel({ workers }) {
  return <div className="mapPanel"><header><span className="kicker">GPS map</span><b>Workers and proof</b></header><div className="fakeMap">{workers.map((worker, index) => <span className={`pin pin${(index % 4) + 1}`} key={worker.id}>{worker.initials}</span>)}</div></div>;
}

function BottomConsole({ data, onNavigate }) {
  return <div className="bottomConsole"><article className="clientMemory"><header><span className="kicker">Clients memory</span><button type="button" onClick={() => onNavigate("clients")}>Open</button></header>{data.clients.slice(0, 5).map((client) => <p key={client.id}><b>{client.name}</b><span>{client.tag}</span><small>{client.jobs} jobs</small><strong>{currency(client.value)}</strong></p>)}</article><article className="moneyDesk"><header><span className="kicker">Money desk</span><button type="button" onClick={() => onNavigate("invoices")}>Open</button></header>{[["Quotes", data.quotes.length, data.quotes.reduce((sum, quote) => sum + Number(quote.amount || 0), 0)], ["Invoices", data.invoices.length, data.invoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0)]].map(([name, count, value]) => <p key={name}><b>{name}</b><span>{count}</span><strong>{currency(value)}</strong></p>)}<div className="agingBars"><span style={{ width: "78%" }}>0-30</span><span style={{ width: "46%" }}>31-60</span><span style={{ width: "28%" }}>61+</span></div></article><article className="messagePrep"><header><span className="kicker">Prepared messages</span><button type="button" onClick={() => onNavigate("messages")}>Open</button></header>{data.messages.slice(0, 5).map((message) => <p key={message.id}><b>{message.subject}</b><span>{message.audience}</span><small>{message.time}</small></p>)}</article><article className="teamMatrixMini"><header><span className="kicker">Team access matrix</span><button type="button" onClick={() => onNavigate("team")}>Open</button></header>{data.team.slice(0, 5).map((member) => <p key={member.id}><span>{member.person}</span><span>{member.jobs}</span><span>{member.clients}</span><span className={member.payroll === "-" ? "off" : ""}>{member.payroll}</span><span className={member.xero === "-" ? "off" : ""}>{member.xero}</span><span>{member.workerApp}</span></p>)}</article><article className="xeroGuard"><header><span className="kicker">Xero draft sync guardrails</span><button type="button" onClick={() => onNavigate("xero")}>Open</button></header>{[["Draft invoices", data.xero.draftInvoices, "$12,430"], ["Draft bills", data.xero.draftBills, "$1,860"], ["Contacts to sync", data.xero.contacts, "Ready"], ["Items to sync", data.xero.items, "Ready"]].map(([name, count, value]) => <p key={name}><b>{name}</b><span>{count}</span><strong>{value}</strong></p>)}</article></div>;
}

function CommandPage({ data, summary, setApproval }) {
  const [selectedId, setSelectedId] = React.useState(summary.queue[0]?.id || "");
  const selected = summary.queue.find((item) => item.id === selectedId) || summary.queue[0];
  const [note, setNote] = React.useState(selected?.note || "");
  React.useEffect(() => { setNote(selected?.note || "Looks right. Keep wording short and practical."); }, [selected?.id, selected?.note]);
  if (!selected) return <section className="commandPage"><aside className="commandQueue"><span className="kicker">Command</span><h1>Approval desk clear.</h1><p className="emptyState">Nothing needs the owner right now. Work can keep flowing in the background.</p></aside></section>;
  const approvedCount = Object.values(data.approvals || {}).filter((item) => item.state === "approved").length;
  return <section className="commandPage"><aside className="commandQueue"><span className="kicker">Command</span><h1>Approve the prepared admin.</h1><div className="queueStats"><b>Open {summary.open}</b><span>Edited {summary.edited}</span><span className="parkedCount">Parked {summary.parked}</span><span className="approvedCount">Approved {approvedCount}</span></div>{summary.queue.map((item) => <button className={`${selected.id === item.id ? "selected" : ""} ${item.state}`} key={item.id} onClick={() => setSelectedId(item.id)} type="button"><small>{item.type}</small><strong>{item.title}</strong><span>{item.detail}</span><em className={`sourceState ${item.state}`}>{item.edited ? "Edited" : item.state}</em></button>)}</aside><article className="decisionSlip"><header><span className="kicker">Prepared by Churvox</span><h2>{selected.title}</h2><strong>{selected.amount}</strong></header><div className="filledForm"><label>Client / source<b>{selected.source}</b></label><label>What Churvox found<b>{selected.detail}</b></label><label>Guardrail<b>No auto-send. Owner approval happens here only.</b></label><label>Owner note<textarea value={note} onChange={(event) => setNote(event.target.value)} /></label></div><div className="commandActions"><button type="button" onClick={() => setApproval(selected, "approved", note)}>Approve</button><button type="button" onClick={() => setApproval(selected, "open", note, true)}>Save edit</button><button type="button" onClick={() => setApproval(selected, "parked", note)}>Park</button></div></article><aside className="evidenceRail"><h3>Evidence</h3><p>Everything the owner needs is attached before a decision.</p>{selected.evidence.map((text) => <div key={text}><b>{text}</b><span>{selected.type} evidence connected to this approval item.</span></div>)}</aside></section>;
}

function JobsPage({ data, onNavigate, csvStatus, onImport }) {
  const lanes = ["Intake", "Dispatch", "Recurring", "Proof", "Admin prepared"];
  return <section className="jobsPage"><header className="pageStatement"><span className="kicker">Jobs</span><h1>Dispatch board, recurring engine and proof trail in one place.</h1><p>Jobs are where real-world work gets added. Churvox prepares the admin and sends owner decisions to Command.</p><CsvTools type="jobs" label="jobs" rows={data.jobs} columns={[{ key: "id", label: "id" }, { key: "title", label: "title" }, { key: "client", label: "client" }, { key: "worker", label: "worker" }, { key: "status", label: "status" }, { key: "recurring", label: "recurring" }, { key: "proof", label: "proof" }, { key: "time", label: "time" }]} onImport={onImport} status={csvStatus.jobs} /></header><div className="jobMachine">{lanes.map((lane) => <article key={lane}><header><b>{lane}</b><span>{lane === "Recurring" ? "Lives inside Jobs" : lane === "Admin prepared" ? "Goes to Command" : "Background admin watching"}</span></header>{data.jobs.filter((job) => lane === "Admin prepared" ? job.admin !== "" : job.lane === lane).slice(0, 4).map((job) => <p key={`${lane}-${job.id}`}><strong>{job.title} - {job.client}</strong><small>{lane === "Admin prepared" ? job.admin : "Background admin watching"}</small></p>)}</article>)}</div><div className="jobWorkbench"><article><span className="kicker">Selected work order</span><h2>{data.jobs[0]?.title} - {data.jobs[0]?.client}</h2><dl>{[["Worker", data.jobs[0]?.worker], ["Proof", data.jobs[0]?.proof], ["Time", data.jobs[0]?.time], ["Recurring", data.jobs[0]?.recurring]].map(([term, value]) => <div key={term}><dt>{term}</dt><dd>{value}</dd></div>)}</dl></article><aside><h3>Admin prepared from this job</h3><p>Quote, invoice, message and worker-gap decisions are prepared here, then reviewed in Command.</p><button type="button" onClick={() => onNavigate("command")}>Open Command queue</button></aside></div></section>;
}

function ClientsPage({ data, csvStatus, onImport }) {
  const [selectedId, setSelectedId] = React.useState(data.clients[1]?.id || data.clients[0]?.id);
  const selected = data.clients.find((client) => client.id === selectedId) || data.clients[0];
  return <section className="clientsPage"><aside className="clientIndex"><span className="kicker">Customer memory</span><h1>Client dossier.</h1><input placeholder="Search client, address, phone or note" />{data.clients.map((client) => <button className={client.id === selected?.id ? "active" : ""} key={client.id} onClick={() => setSelectedId(client.id)} type="button"><b>{client.name}</b><span>{client.tag} - {client.jobs} jobs - {currency(client.value)}</span></button>)}</aside><article className="clientDossier"><header><span className="kicker">Selected client</span><h2>{selected?.name}</h2><p>{selected?.note}</p><CsvTools type="clients" label="clients" rows={data.clients} columns={[{ key: "name", label: "name" }, { key: "tag", label: "tag" }, { key: "jobs", label: "jobs" }, { key: "value", label: "value" }, { key: "note", label: "note" }]} onImport={onImport} status={csvStatus.clients} /></header><div className="dossierGrid">{[["Service memory", selected?.note], ["Price memory", `Lifetime value ${currency(selected?.value)}`], ["Open admin", "Prepared decisions wait in Command."], ["Risk check", "No send or sync happens from this page."]].map(([title, text]) => <div key={title}><b>{title}</b><span>{text}</span></div>)}</div></article><aside className="clientTimeline"><h3>Working trail</h3>{["Client called", "Quote created", "Site note added", "Follow-up prepared"].map((item) => <p key={item}>{item}</p>)}</aside></section>;
}

function WorkersPage({ data }) {
  return <section className="workersPage"><div className="fieldMap"><header><span className="kicker">Workers</span><h1>Live field, GPS and proof command view.</h1></header><div className="mapCanvas">{data.workers.map((worker) => <button className="mapWorker" style={{ left: `${worker.x}%`, top: `${worker.y}%` }} key={worker.id} type="button"><b>{worker.initials}</b><span>{worker.job}</span><small>{worker.status} - {worker.time}</small></button>)}</div></div><aside className="proofStack"><span className="kicker">Proof pack</span><h2>Photos, notes, time and GPS feed Command.</h2>{data.workers.map((worker) => <p key={worker.id}><b>{worker.initials}</b><span>{worker.job}</span><small>{worker.status} - {worker.time} - {worker.proof}</small></p>)}</aside></section>;
}

function QuotesPage({ data, onNavigate }) {
  const lanes = ["Draft", "Sent", "Viewed", "Follow-up ready", "Accepted"];
  return <section className="quotesPage"><header className="pageStatement"><span className="kicker">Quotes</span><h1>Offer pipeline without approval clutter.</h1><p>Quotes move from draft to follow-up. Churvox prepares the next step, then owner decisions happen in Command.</p></header><div className="offerTrack">{lanes.map((lane) => <article key={lane}><b>{lane}</b>{data.quotes.filter((quote) => quote.stage === lane).map((quote) => <p key={quote.id}><span>{quote.title}</span><small>{lane === "Follow-up ready" ? "Prepared for Command" : "Watched by Churvox"}</small></p>)}</article>)}</div><aside className="pipelinePrep"><h2>Prepared quote work</h2><p>Client memory, pricing notes and follow-up wording are collected before anything goes out.</p><button type="button" onClick={() => onNavigate("command")}>Open Command queue</button></aside></section>;
}

function InvoicesPage({ data, onNavigate, csvStatus, onImport }) {
  return <section className="invoicesPage"><header className="moneyHeader"><span className="kicker">Invoices</span><h1>Money desk.</h1><p>Invoices show proof, payment state and sync readiness. Sending and sync decisions stay in Command.</p><CsvTools type="invoices" label="invoices" rows={data.invoices} columns={[{ key: "stage", label: "stage" }, { key: "name", label: "name" }, { key: "client", label: "client" }, { key: "amount", label: "amount" }, { key: "note", label: "note" }]} onImport={onImport} status={csvStatus.invoices} /></header><div className="invoiceLedger">{data.invoices.map((invoice) => <article key={invoice.id}><span>{invoice.stage}</span><b>{invoice.name}</b><strong>{currency(invoice.amount)}</strong><small>{invoice.note}</small></article>)}</div><aside className="moneyControl"><h2>Prepared, not sent.</h2><p>Churvox can prepare line items, proof checks and reminders, but the owner uses Command for the decision.</p><button type="button" onClick={() => onNavigate("command")}>Open Command queue</button></aside></section>;
}

function MessagesPage({ data, onNavigate }) {
  return <section className="messagesPage"><header className="messageHeader"><span className="kicker">Messages</span><h1>Prepared replies, not another inbox.</h1><p>Churvox drafts useful replies from job context. Nothing leaves from here.</p></header><div className="replyBoard">{data.messages.map((message) => <article key={message.id}><span>{message.audience}</span><b>{message.subject}</b><p>{message.detail} {message.status === "Prepared" ? "Waiting in Command." : "Watched by Churvox."}</p><small>{message.time}</small></article>)}</div><aside className="messageGuard"><h2>Nothing sends without owner approval.</h2><button type="button" onClick={() => onNavigate("command")}>Open Command queue</button></aside></section>;
}

function TeamPage({ data, csvStatus, onImport }) {
  return <section className="teamPage"><header className="pageStatement"><span className="kicker">Team</span><h1>Access, payroll review and worker app readiness.</h1><p>Team is a matrix, not a people-card wall. Each row shows what the person can do.</p><CsvTools type="team" label="team" rows={data.team} columns={[{ key: "person", label: "person" }, { key: "role", label: "role" }, { key: "workerApp", label: "worker_app" }, { key: "jobs", label: "jobs" }, { key: "clients", label: "clients" }, { key: "payroll", label: "payroll" }, { key: "xero", label: "xero" }]} onImport={onImport} status={csvStatus.team} /></header><table className="teamMatrix"><thead><tr><th>Person</th><th>Role</th><th>Worker app</th><th>Jobs</th><th>Clients</th><th>Payroll</th><th>Xero</th></tr></thead><tbody>{data.team.map((row) => <tr key={row.id}><td>{row.person}</td><td>{row.role}</td><td>{row.workerApp}</td><td>{row.jobs}</td><td>{row.clients}</td><td>{row.payroll}</td><td>{row.xero}</td></tr>)}</tbody></table><aside className="teamRail"><h2>Admin gaps Churvox watches</h2><p>Missing invite, worker app access, payroll changes and role risks are surfaced as owner attention.</p></aside></section>;
}

function XeroPage({ data }) {
  const rules = [["Draft invoice sync only", "No automatic invoice sending."], ["Payment refresh", "Only mark paid after accounting confirms paid."], ["No tax filing", "Churvox does not submit to government."], ["No payout files", "No bank payout files are created."], ["Owner approval", "Command remains the decision point."], ["Exports", "CSV and bookkeeper packs stay available."]];
  return <section className="xeroPage"><div className="xeroStatement"><span className="kicker">Xero</span><h1>Draft sync guardrails.</h1><p>{data.xero.draftInvoices} draft invoices, {data.xero.contacts} contacts and {data.xero.items} items are prepared. Command decides what moves.</p></div><div className="guardrailGrid">{rules.map(([title, text]) => <article key={title}><b>{title}</b><p>{text}</p></article>)}</div></section>;
}

function ControlPage({ title, subtitle, children, items }) {
  return <section className="controlPage"><header className="controlHeader"><span className="kicker">Control</span><h1>{title}</h1><p>{subtitle}</p>{children}</header><div className="controlGrid">{items.map(([name, text]) => <article key={name}><b>{name}</b><p>{text}</p><button type="button">Open</button></article>)}</div></section>;
}

function SettingsPage({ data, csvStatus, onImport, resetData }) {
  return <ControlPage title="Settings" subtitle="Business controls grouped by what the owner actually needs." items={[["Business identity", "Logo, name, email, phone, address and customer-facing details."], ["Invoice defaults", "GST rate, due dates, numbering and wording."], ["Approval rules", "What Churvox may prepare and what must always wait in Command."], ["Account safety", "Password, sessions, delete account and data controls."], ["Notifications", "Owner prompts, worker alerts and quiet hours."]]}> <CsvTools type="clients" label="clients" rows={data.clients} columns={[{ key: "name", label: "name" }, { key: "tag", label: "tag" }, { key: "jobs", label: "jobs" }, { key: "value", label: "value" }, { key: "note", label: "note" }]} onImport={onImport} status={csvStatus.clients} /><CsvTools type="team" label="team" rows={data.team} columns={[{ key: "person", label: "person" }, { key: "role", label: "role" }, { key: "workerApp", label: "worker_app" }, { key: "jobs", label: "jobs" }, { key: "clients", label: "clients" }, { key: "payroll", label: "payroll" }, { key: "xero", label: "xero" }]} onImport={onImport} status={csvStatus.team} /><button className="resetOsButton" type="button" onClick={resetData}>Reset OS demo state</button></ControlPage>;
}

function HelpPage() { return <ControlPage title="Help" subtitle="Fast paths for setup, workers, accounting and launch checks." items={[["Setup check", "Find missing business, team, invoice and worker setup."], ["Launch checklist", "Owner, worker, quote, invoice and sync readiness."], ["Worker guide", "How workers acknowledge jobs, record time and add proof."], ["Accounting guide", "Draft sync, exports and payment status guardrails."], ["Contact support", "Use hello@churvox.com when something blocks launch."], ["Tester readiness", "A short path for getting early testers through the app."]]} />; }

function PlansPage() {
  return <section className="plansPage"><header className="plansHeader"><span className="kicker">Plans</span><h1>Simple tiers. Clear admin power.</h1><p>Pricing stays fixed. Each tier shows what actually unlocks.</p></header><div className="planCards">{planRows.map((plan) => <article className={plan.name === "Operator" ? "popular" : ""} key={plan.name}><span>{plan.tag}</span><h2>{plan.name}</h2><strong>{plan.price}</strong><p>{plan.text}</p></article>)}</div><div className="planMatrix"><table><thead><tr><th>Feature</th><th>Start</th><th>Crew</th><th>Operator</th><th>Command</th></tr></thead><tbody>{featureMatrix.map((row) => <tr key={row[0]}>{row.map((cell) => <td key={`${row[0]}-${cell}`}>{cell}</td>)}</tr>)}</tbody></table></div></section>;
}

function Page({ page, data, summary, setApproval, onNavigate, csvStatus, onImport, resetData }) {
  if (page === "command") return <CommandPage data={data} summary={summary} setApproval={setApproval} />;
  if (page === "jobs") return <JobsPage data={data} onNavigate={onNavigate} csvStatus={csvStatus} onImport={onImport} />;
  if (page === "clients") return <ClientsPage data={data} csvStatus={csvStatus} onImport={onImport} />;
  if (page === "workers") return <WorkersPage data={data} />;
  if (page === "quotes") return <QuotesPage data={data} onNavigate={onNavigate} />;
  if (page === "invoices") return <InvoicesPage data={data} onNavigate={onNavigate} csvStatus={csvStatus} onImport={onImport} />;
  if (page === "messages") return <MessagesPage data={data} onNavigate={onNavigate} />;
  if (page === "team") return <TeamPage data={data} csvStatus={csvStatus} onImport={onImport} />;
  if (page === "xero") return <XeroPage data={data} />;
  if (page === "settings") return <SettingsPage data={data} csvStatus={csvStatus} onImport={onImport} resetData={resetData} />;
  if (page === "plans") return <PlansPage />;
  if (page === "help") return <HelpPage />;
  return <HubPage data={data} summary={summary} onNavigate={onNavigate} />;
}

export default function ChurvoxOSApp() {
  const [page, navigate] = useRoute();
  const [data, setData] = useOSData();
  const [csvStatus, setCsvStatus] = React.useState({});
  const summary = React.useMemo(() => summarizeCommand(data), [data]);

  const addWork = React.useCallback((text) => {
    setData((current) => {
      const nextId = String(1048 + current.jobs.length);
      const job = { id: nextId, title: text, client: "New client", worker: "Unassigned", status: "Intake", recurring: "-", proof: "0/0", time: "-", lane: "Intake", admin: "Background admin watching" };
      const activity = [{ id: `a-${Date.now()}`, time: "now", action: "New job added", item: text }, ...current.activity].slice(0, 8);
      return { ...current, jobs: [job, ...current.jobs], activity };
    });
    navigate("hub");
  }, [navigate]);

  const setApproval = React.useCallback((item, state, note, edited = false) => {
    setData((current) => {
      const approvals = { ...current.approvals, [item.id]: { state, note, edited: edited || current.approvals?.[item.id]?.edited || false } };
      const next = { ...current, approvals };
      if (state !== "approved") return next;
      if (item.sourceType === "quote") next.quotes = current.quotes.map((quote) => quote.id === item.sourceId ? { ...quote, stage: "Accepted", detail: `${quote.detail} Owner approved in Command.` } : quote);
      if (item.sourceType === "invoice") next.invoices = current.invoices.map((invoice) => invoice.id === item.sourceId ? { ...invoice, stage: invoice.stage === "Sync-ready" ? "Draft synced" : "Owner cleared", note: `${invoice.note} - approved in Command` } : invoice);
      if (item.sourceType === "message") next.messages = current.messages.map((message) => message.id === item.sourceId ? { ...message, status: "Approved" } : message);
      if (item.sourceType === "team") next.team = current.team.map((member) => member.id === item.sourceId ? { ...member, workerApp: member.workerApp === "Ready" ? member.workerApp : "Invite approved", payroll: member.payroll === "Review" ? "Approved" : member.payroll } : member);
      if (item.sourceType === "xero") next.xero = { ...current.xero, status: "Draft sync approved" };
      return next;
    });
  }, []);

  const importCsv = React.useCallback((type, file) => {
    const reader = new FileReader();
    reader.onload = () => {
      const rows = parseCsv(String(reader.result || ""));
      setData((current) => {
        if (type === "clients") {
          const clients = rows.map((row, index) => ({ id: `client-import-${Date.now()}-${index}`, name: row.name || row.client || "Imported client", tag: row.tag || row.status || "Imported", jobs: Number(row.jobs || 0), value: Number(String(row.value || row.amount || 0).replace(/[^0-9.-]/g, "")), note: row.note || row.notes || "Imported from CSV." }));
          return { ...current, clients: [...clients, ...current.clients] };
        }
        if (type === "jobs") {
          const jobs = rows.map((row, index) => ({ id: row.id || `csv-${Date.now()}-${index}`, title: row.title || row.job || "Imported job", client: row.client || "Imported client", worker: row.worker || "Unassigned", status: row.status || "Intake", recurring: row.recurring || "-", proof: row.proof || "0/0", time: row.time || "-", lane: row.lane || "Intake", admin: row.admin || "Background admin watching" }));
          return { ...current, jobs: [...jobs, ...current.jobs] };
        }
        if (type === "invoices") {
          const invoices = rows.map((row, index) => ({ id: `invoice-import-${Date.now()}-${index}`, stage: row.stage || "Ready to draft", name: row.name || row.invoice || "Imported invoice", client: row.client || "Imported client", amount: Number(String(row.amount || 0).replace(/[^0-9.-]/g, "")), note: row.note || "Imported from CSV" }));
          return { ...current, invoices: [...invoices, ...current.invoices] };
        }
        if (type === "team") {
          const team = rows.map((row, index) => ({ id: `team-import-${Date.now()}-${index}`, person: row.person || row.name || "Imported person", role: row.role || "Field", workerApp: row.worker_app || row.workerapp || "Invite pending", jobs: row.jobs || "Assigned", clients: row.clients || "-", payroll: row.payroll || "Review", xero: row.xero || "-" }));
          return { ...current, team: [...team, ...current.team] };
        }
        return current;
      });
      setCsvStatus((current) => ({ ...current, [type]: `${rows.length} ${type} rows imported. Command will surface anything that needs approval.` }));
    };
    reader.readAsText(file);
  }, []);

  const resetData = React.useCallback(() => {
    setData(INITIAL_DATA);
    setCsvStatus({});
  }, []);

  return <OSFrame page={page} navigate={navigate} data={data} summary={summary} addWork={addWork} dock={page !== "command"}><Page page={page} data={data} summary={summary} setApproval={setApproval} onNavigate={navigate} csvStatus={csvStatus} onImport={importCsv} resetData={resetData} /></OSFrame>;
}
