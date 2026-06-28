import React from "react";
import "./churvoxOS.css";

const NAV = [
  { key: "hub", label: "Smart Hub", code: "SH", group: "Run" },
  { key: "command", label: "Command", code: "CM", group: "Run", count: 5 },
  { key: "jobs", label: "Jobs", code: "JB", group: "Work" },
  { key: "clients", label: "Clients", code: "CL", group: "Work" },
  { key: "workers", label: "Workers", code: "WK", group: "Work" },
  { key: "quotes", label: "Quotes", code: "QT", group: "Money" },
  { key: "invoices", label: "Invoices", code: "IV", group: "Money" },
  { key: "messages", label: "Messages", code: "MS", group: "Admin", count: 2 },
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

const attentionFlow = [
  { label: "Real work added", count: 8, rows: [["8:41", "New job added", "Bathroom Reno - Smith"], ["9:12", "Client called", "Leaking tap - Watson"], ["9:47", "Quote created", "Deck repair - Jones"], ["10:03", "Job updated", "Roof restore - Taylor"]] },
  { label: "Admin prepared", count: 12, rows: [["ready", "Job costing prepared", "Bathroom Reno - Smith"], ["ready", "Quote prepared", "Deck repair - Jones"], ["ready", "Invoice prepared", "Electrical work - Patel"], ["ready", "Client message prepared", "Site update - Anderson"]] },
  { label: "Sent to Command", count: 5, rows: [["queued", "Quote - deck repair", "$2,850.00"], ["queued", "Invoice - electrical work", "$1,650.00"], ["queued", "Job update - roof restore", "Worker note"], ["queued", "Recurring invoice", "3 clients"]] },
];

const dispatchRows = [
  ["#1047", "Bathroom Reno", "Smith, John", "JD + AC", "On site", "Monthly", "3/5", "2h 15m"],
  ["#1046", "Roof Restore", "Taylor, Mark", "LW + RH", "On site", "-", "2/4", "1h 40m"],
  ["#1045", "Electrical Work", "Patel, Ravi", "DC", "En route", "Quarterly", "1/3", "1h 05m"],
  ["#1044", "Deck Repair", "Jones, Claire", "JS + TM", "Scheduled", "-", "0/0", "-"],
  ["#1043", "Garden Retain Wall", "Brown, Chris", "SB + MW", "Scheduled", "Monthly", "0/0", "-"],
];

const commandItems = [
  { type: "Quote", title: "Deck repair quote", detail: "Prepared from client memory, site note and material allowance.", amount: "$2,850.00" },
  { type: "Invoice", title: "Electrical work invoice", detail: "Worker proof and time are attached. Draft is ready.", amount: "$1,650.00" },
  { type: "Message", title: "Site update for Anderson", detail: "Short client reply drafted from the job note.", amount: "10:15 am" },
  { type: "Team", title: "Roof restore worker gap", detail: "Churvox found the best available worker for tomorrow.", amount: "Tomorrow" },
  { type: "Xero", title: "Draft sync batch", detail: "Seven owner-cleared invoices are ready for draft sync only.", amount: "7 drafts" },
];

const clientRows = [["Smith, John", "VIP", "6 jobs", "$18,760"], ["Jones, Claire", "Follow-up", "3 jobs", "$7,320"], ["Patel, Ravi", "Active", "2 jobs", "$4,950"], ["Taylor, Mark", "Proof", "5 jobs", "$12,400"], ["Brown, Chris", "Recurring", "1 job", "$1,850"]];
const moneyRows = [["Quotes", "3", "$5,850.00"], ["Invoices", "4", "$7,210.00"], ["Credit notes", "0", "$0.00"], ["Bills", "1", "$1,280.00"]];
const preparedMessages = [["Site update - Anderson", "Client", "10:15 am"], ["Quote follow up - Jones", "Client", "9:42 am"], ["Invoice ready - Patel", "Client", "9:30 am"], ["Job reminder - Smith", "Client", "9:05 am"], ["Team huddle - All staff", "Team", "8:50 am"]];
const teamRows = [["Michael", "Jobs", "Clients", "Money", "Xero", "Cmd"], ["Jade", "Jobs", "Clients", "Money", "Xero", "Cmd"], ["Luke", "Jobs", "Clients", "-", "-", "-"], ["Alicia", "Jobs", "Clients", "Money", "-", "-"], ["Tom", "Jobs", "-", "-", "-", "-"]];
const workerMarkers = [["RH", "Roof restore", "On site", "1h 40m", "2 proof"], ["JS", "Deck repair", "En route", "18 min", "0 proof"], ["DC", "Electrical work", "On site", "1h 05m", "1 proof"], ["SB", "Garden wall", "Scheduled", "2:00 pm", "0 proof"]];
const jobLanes = [["Intake", "New real-world work", ["Leaking tap - Watson", "Deck repair - Jones", "Garden reset - Brown"]], ["Dispatch", "Worker, route, time", ["Roof restore - Taylor", "Bathroom Reno - Smith", "Commercial clean - Kauri"]], ["Recurring", "Lives inside Jobs", ["Monthly hedge run", "Fortnightly lawns", "Quarterly electrical check"]], ["Proof", "Photos and notes", ["Patel invoice proof", "Smith progress photos", "Taylor time change"]], ["Admin prepared", "Goes to Command", ["Quote ready", "Invoice ready", "Message ready"]]];
const quoteLanes = [["Draft", "Deck repair - Jones", "Bathroom Reno - Smith"], ["Sent", "Retaining wall - Brown"], ["Viewed", "Commercial clean - Kauri"], ["Follow-up ready", "Naenae tidy - Lee"], ["Accepted", "Monthly garden - Clark"]];
const invoiceRows = [["Ready to draft", "Electrical work - Patel", "$1,650.00", "Proof attached"], ["Waiting proof", "Roof restore - Taylor", "$980.00", "2 photos missing"], ["Sent", "Belmont reset", "$190.00", "Viewed"], ["Overdue", "Upper Hutt garden", "$120.00", "Reminder prepared"], ["Sync-ready", "June lawn run", "$430.00", "Draft sync only"]];
const planRows = [
  { name: "Start", price: "$39/month + GST", tag: "Records", text: "Jobs, clients, quotes, invoices and recurring jobs for an owner starting clean." },
  { name: "Crew", price: "$89/month + GST", tag: "Field", text: "Worker view, proof, team messages and field records for a small crew." },
  { name: "Operator", price: "$149/month + GST", tag: "Most Popular", text: "Churvox prepares admin actions, follow-ups and owner attention items." },
  { name: "Command", price: "$299/month + GST", tag: "Approval OS", text: "Full approval desk, payroll review, higher capacity and accounting sync option." },
];
const featureMatrix = [["Recurring inside Jobs", "Included", "Included", "Included", "Included"], ["Worker proof", "Owner records", "Included", "Included", "Included"], ["Prepared admin", "Manual", "Prompts", "Included", "Included"], ["Command desk", "View only", "View only", "Core", "Full"], ["Payroll review", "-", "-", "Review", "Included"], ["Accounting Sync Add-on", "$39/month + GST", "$39/month + GST", "$39/month + GST", "Included option"], ["Command Growth Pack", "-", "-", "-", "$99/month + GST"]];

function normalise(value) {
  const key = String(value || "").replace(/^#/, "").replace(/^\//, "").trim().toLowerCase();
  return ALIASES[key] || (NAV.some((item) => item.key === key) ? key : "hub");
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

function Sidebar({ page, onNavigate }) {
  const groups = NAV.reduce((acc, item) => { acc[item.group] = acc[item.group] || []; acc[item.group].push(item); return acc; }, {});
  return <aside className="osSidebar">
    <div className="osBrand"><div className="osLogo">C</div><div><strong>churvox</strong><span>Owner admin OS</span></div></div>
    <button className="osQuickAdd" type="button"><span>+</span>Add real-world work</button>
    {Object.entries(groups).map(([group, items]) => <nav className="osNavGroup" aria-label={group} key={group}><p>{group}</p>{items.map((item) => <button className={page === item.key ? "active" : ""} key={item.key} onClick={() => onNavigate(item.key)} type="button"><span className="navCode">{item.code}</span><span className="navLabel">{item.label}</span>{item.count ? <span className="navCount">{item.count}</span> : null}</button>)}</nav>)}
    <div className="osSystemCard"><b>All systems normal</b><span>Last sync: 2 min ago</span></div>
  </aside>;
}

function Topbar({ page }) {
  const current = NAV.find((item) => item.key === page) || NAV[0];
  return <header className="osTopbar"><div><span>Churvox OS</span><strong>{current.label}</strong></div><div className="osSearch"><span>Ask Churvox</span><input placeholder="Add a job, find unpaid work, check worker proof..." /></div><div className="osOwner"><span>G'day</span><b>Owner</b></div></header>;
}

function CommandDock({ onNavigate }) {
  return <aside className="commandDock"><div className="dockCore"><span className="kicker">Command approval desk</span><strong>5</strong><p>waiting for owner</p><div className="dockBeacon" aria-hidden="true"><span /><span /><span /></div><button type="button" onClick={() => onNavigate("command")}>Open Command</button></div><div className="dockList"><b>One approval place: Command</b>{[["Quotes", "2"], ["Invoices", "2"], ["Messages", "1"]].map(([label, value]) => <p key={label}><span>{label}</span><strong>{value}</strong></p>)}<p className="dockTotal"><span>Total waiting</span><strong>5</strong></p></div></aside>;
}

function OSFrame({ page, navigate, children, dock = true }) {
  return <div className="churvoxOS"><Sidebar page={page} onNavigate={navigate} /><main className={dock ? "osWorkspace hasDock" : "osWorkspace"}><Topbar page={page} /><div className="osSurface">{children}</div></main>{dock ? <CommandDock onNavigate={navigate} /> : null}</div>;
}

function HubPage({ onNavigate }) {
  return <section className="hubPage"><div className="attentionPanel"><header><div><span className="kicker">Smart Hub</span><h1>Owner attention today.</h1></div><span className="livePill">Live</span></header><div className="flowBoard">{attentionFlow.map((lane) => <article key={lane.label}><h2>{lane.label}<span>{lane.count}</span></h2>{lane.rows.map(([time, action, item]) => <p key={`${action}-${item}`}><small>{time}</small><b>{action}</b><span>{item}</span></p>)}</article>)}</div><div className="rulesStrip"><span>One approval place: Command</span><span>No auto-send</span><span>Draft sync only</span><span>Recurring inside Jobs</span></div></div><div className="dispatchPanel"><header><div><span className="kicker">Live dispatch board</span><h2>Field work Churvox is watching.</h2></div><button type="button" onClick={() => onNavigate("jobs")}>Open Jobs</button></header><table><thead><tr><th>Job</th><th>Client</th><th>Worker</th><th>Status</th><th>Recurring</th><th>Proof</th><th>Time</th></tr></thead><tbody>{dispatchRows.map(([job, title, client, worker, status, recurring, proof, time]) => <tr key={job}><td><b>{job}</b><span>{title}</span></td><td>{client}</td><td>{worker}</td><td><span className={`status ${status.toLowerCase().replace(" ", "-")}`}>{status}</span></td><td>{recurring}</td><td>{proof}</td><td>{time}</td></tr>)}</tbody></table></div><div className="mapPanel"><header><span className="kicker">GPS map</span><b>Workers and proof</b></header><div className="fakeMap">{workerMarkers.map(([initials], index) => <span className={`pin pin${index + 1}`} key={initials}>{initials}</span>)}</div></div><BottomConsole onNavigate={onNavigate} /></section>;
}

function BottomConsole({ onNavigate }) {
  return <div className="bottomConsole"><article className="clientMemory"><header><span className="kicker">Clients memory</span><button type="button" onClick={() => onNavigate("clients")}>Open</button></header>{clientRows.map(([name, tag, jobs, value]) => <p key={name}><b>{name}</b><span>{tag}</span><small>{jobs}</small><strong>{value}</strong></p>)}</article><article className="moneyDesk"><header><span className="kicker">Money desk</span><button type="button" onClick={() => onNavigate("invoices")}>Open</button></header>{moneyRows.map(([name, count, value]) => <p key={name}><b>{name}</b><span>{count}</span><strong>{value}</strong></p>)}<div className="agingBars"><span style={{ width: "78%" }}>0-30</span><span style={{ width: "46%" }}>31-60</span><span style={{ width: "28%" }}>61+</span></div></article><article className="messagePrep"><header><span className="kicker">Prepared messages</span><button type="button" onClick={() => onNavigate("messages")}>Open</button></header>{preparedMessages.map(([subject, type, time]) => <p key={subject}><b>{subject}</b><span>{type}</span><small>{time}</small></p>)}</article><article className="teamMatrixMini"><header><span className="kicker">Team access matrix</span><button type="button" onClick={() => onNavigate("team")}>Open</button></header>{teamRows.map((row) => <p key={row[0]}>{row.map((cell, index) => <span className={cell === "-" ? "off" : ""} key={`${row[0]}-${cell}-${index}`}>{cell}</span>)}</p>)}</article><article className="xeroGuard"><header><span className="kicker">Xero draft sync guardrails</span><button type="button" onClick={() => onNavigate("xero")}>Open</button></header>{[["Draft invoices", "7", "$12,430"], ["Draft bills", "2", "$1,860"], ["Contacts to sync", "3", "Ready"], ["Items to sync", "6", "Ready"]].map(([name, count, value]) => <p key={name}><b>{name}</b><span>{count}</span><strong>{value}</strong></p>)}</article></div>;
}

function CommandPage() {
  const [selected, setSelected] = React.useState(commandItems[0]);
  return <section className="commandPage"><aside className="commandQueue"><span className="kicker">Command</span><h1>Approve the prepared admin.</h1><div className="queueStats"><b>Open 5</b><span>Edited 0</span><span>Parked 1</span></div>{commandItems.map((item) => <button className={selected.title === item.title ? "selected" : ""} key={item.title} onClick={() => setSelected(item)} type="button"><small>{item.type}</small><strong>{item.title}</strong><span>{item.detail}</span></button>)}</aside><article className="decisionSlip"><header><span className="kicker">Prepared by Churvox</span><h2>{selected.title}</h2><strong>{selected.amount}</strong></header><div className="filledForm"><label>Client / source<b>{selected.type === "Xero" ? "Owner-cleared invoice batch" : "Linked job and client memory"}</b></label><label>What Churvox found<b>{selected.detail}</b></label><label>Guardrail<b>No auto-send. Owner approval happens here only.</b></label><label>Owner note<textarea defaultValue="Looks right. Keep wording short and practical." /></label></div><div className="commandActions"><button type="button">Approve</button><button type="button">Edit</button><button type="button">Park</button></div></article><aside className="evidenceRail"><h3>Evidence</h3><p>Everything the owner needs is attached before a decision: job history, proof, price memory, worker time and sync guardrails.</p>{[["Job proof", "Photos 3/5, notes attached"], ["Price memory", "Matched previous work and line items"], ["Safety", "No tax filing, no payout files, no hidden sends"]].map(([title, text]) => <div key={title}><b>{title}</b><span>{text}</span></div>)}</aside></section>;
}

function JobsPage({ onNavigate }) {
  return <section className="jobsPage"><header className="pageStatement"><span className="kicker">Jobs</span><h1>Dispatch board, recurring engine and proof trail in one place.</h1><p>Jobs are where real-world work gets added. Churvox prepares the admin and sends owner decisions to Command.</p></header><div className="jobMachine">{jobLanes.map(([title, note, rows]) => <article key={title}><header><b>{title}</b><span>{note}</span></header>{rows.map((row) => <p key={row}><strong>{row}</strong><small>{title === "Recurring" ? "Next instance watched inside Jobs" : "Background admin watching"}</small></p>)}</article>)}</div><div className="jobWorkbench"><article><span className="kicker">Selected work order</span><h2>Bathroom Reno - Smith</h2><dl>{[["Worker", "JD + AC"], ["Proof", "3/5 photos"], ["Time", "2h 15m on site"], ["Recurring", "Monthly check enabled"]].map(([term, value]) => <div key={term}><dt>{term}</dt><dd>{value}</dd></div>)}</dl></article><aside><h3>Admin prepared from this job</h3><p>Quote, invoice, message and worker-gap decisions are prepared here, then reviewed in Command.</p><button type="button" onClick={() => onNavigate("command")}>Open Command queue</button></aside></div></section>;
}

function ClientsPage() {
  return <section className="clientsPage"><aside className="clientIndex"><span className="kicker">Customer memory</span><h1>Client dossier.</h1><input placeholder="Search client, address, phone or note" />{clientRows.map(([name, tag, jobs, value]) => <button className={name === "Jones, Claire" ? "active" : ""} key={name} type="button"><b>{name}</b><span>{tag} - {jobs} - {value}</span></button>)}</aside><article className="clientDossier"><header><span className="kicker">Selected client</span><h2>Jones, Claire</h2><p>Deck repair quote is prepared. Follow-up wording is waiting for Command.</p></header><div className="dossierGrid">{[["Service memory", "Prefers concise texts and photos after work."], ["Price memory", "Last outdoor work: $2,420 with timber allowance."], ["Open admin", "Quote follow-up prepared, not sent."], ["Risk check", "No unpaid invoices. Address confirmed."]].map(([title, text]) => <div key={title}><b>{title}</b><span>{text}</span></div>)}</div></article><aside className="clientTimeline"><h3>Working trail</h3>{["Client called", "Quote created", "Site note added", "Follow-up prepared"].map((item) => <p key={item}>{item}</p>)}</aside></section>;
}

function WorkersPage() {
  return <section className="workersPage"><div className="fieldMap"><header><span className="kicker">Workers</span><h1>Live field, GPS and proof command view.</h1></header><div className="mapCanvas">{workerMarkers.map(([initials, job, status, time], index) => <button className={`mapWorker w${index + 1}`} key={initials} type="button"><b>{initials}</b><span>{job}</span><small>{status} - {time}</small></button>)}</div></div><aside className="proofStack"><span className="kicker">Proof pack</span><h2>Photos, notes, time and GPS feed Command.</h2>{workerMarkers.map(([initials, job, status, time, proof]) => <p key={initials}><b>{initials}</b><span>{job}</span><small>{status} - {time} - {proof}</small></p>)}</aside></section>;
}

function QuotesPage({ onNavigate }) {
  return <section className="quotesPage"><header className="pageStatement"><span className="kicker">Quotes</span><h1>Offer pipeline without approval clutter.</h1><p>Quotes move from draft to follow-up. Churvox prepares the next step, then owner decisions happen in Command.</p></header><div className="offerTrack">{quoteLanes.map(([lane, ...items]) => <article key={lane}><b>{lane}</b>{items.map((item) => <p key={item}><span>{item}</span><small>{lane === "Follow-up ready" ? "Prepared for Command" : "Watched by Churvox"}</small></p>)}</article>)}</div><aside className="pipelinePrep"><h2>Prepared quote work</h2><p>Client memory, pricing notes and follow-up wording are collected before anything goes out.</p><button type="button" onClick={() => onNavigate("command")}>Open Command queue</button></aside></section>;
}

function InvoicesPage({ onNavigate }) {
  return <section className="invoicesPage"><header className="moneyHeader"><span className="kicker">Invoices</span><h1>Money desk.</h1><p>Invoices show proof, payment state and sync readiness. Sending and sync decisions stay in Command.</p></header><div className="invoiceLedger">{invoiceRows.map(([stage, name, amount, note]) => <article key={`${stage}-${name}`}><span>{stage}</span><b>{name}</b><strong>{amount}</strong><small>{note}</small></article>)}</div><aside className="moneyControl"><h2>Prepared, not sent.</h2><p>Churvox can prepare line items, proof checks and reminders, but the owner uses Command for the decision.</p><button type="button" onClick={() => onNavigate("command")}>Open Command queue</button></aside></section>;
}

function MessagesPage({ onNavigate }) {
  return <section className="messagesPage"><header className="messageHeader"><span className="kicker">Messages</span><h1>Prepared replies, not another inbox.</h1><p>Churvox drafts useful replies from job context. Nothing leaves from here.</p></header><div className="replyBoard">{preparedMessages.map(([subject, type, time]) => <article key={subject}><span>{type}</span><b>{subject}</b><p>Short reply prepared from job/client history and waiting in Command.</p><small>{time}</small></article>)}</div><aside className="messageGuard"><h2>Nothing sends without owner approval.</h2><button type="button" onClick={() => onNavigate("command")}>Open Command queue</button></aside></section>;
}

function TeamPage() {
  const rows = [["Michael", "Owner", "Ready", "Full", "Full", "Review", "Sync"], ["Jade", "Admin", "Off", "Full", "Full", "Review", "Draft"], ["Luke", "Field", "Ready", "Assigned", "-", "-", "-"], ["Alicia", "Admin", "Off", "Full", "Full", "-", "-"], ["Tom", "Apprentice", "Invite pending", "Assigned", "-", "-", "-"]];
  return <section className="teamPage"><header className="pageStatement"><span className="kicker">Team</span><h1>Access, payroll review and worker app readiness.</h1><p>Team is a matrix, not a people-card wall. Each row shows what the person can do.</p></header><table className="teamMatrix"><thead><tr><th>Person</th><th>Role</th><th>Worker app</th><th>Jobs</th><th>Clients</th><th>Payroll</th><th>Xero</th></tr></thead><tbody>{rows.map((row) => <tr key={row[0]}>{row.map((cell) => <td key={`${row[0]}-${cell}`}>{cell}</td>)}</tr>)}</tbody></table><aside className="teamRail"><h2>Admin gaps Churvox watches</h2><p>Missing invite, worker app access, payroll changes and role risks are surfaced as owner attention.</p></aside></section>;
}

function XeroPage() {
  const rules = [["Draft invoice sync only", "No automatic invoice sending."], ["Payment refresh", "Only mark paid after accounting confirms paid."], ["No tax filing", "Churvox does not submit to government."], ["No payout files", "No bank payout files are created."], ["Owner approval", "Command remains the decision point."], ["Exports", "CSV and bookkeeper packs stay available."]];
  return <section className="xeroPage"><div className="xeroStatement"><span className="kicker">Xero</span><h1>Draft sync guardrails.</h1><p>Churvox prepares accounting sync safely: draft invoices only, owner approval first, and paid status only after refresh confirms it.</p></div><div className="guardrailGrid">{rules.map(([title, text]) => <article key={title}><b>{title}</b><p>{text}</p></article>)}</div></section>;
}

function ControlPage({ title, subtitle, items }) {
  return <section className="controlPage"><header className="controlHeader"><span className="kicker">Control</span><h1>{title}</h1><p>{subtitle}</p></header><div className="controlGrid">{items.map(([name, text]) => <article key={name}><b>{name}</b><p>{text}</p><button type="button">Open</button></article>)}</div></section>;
}

function SettingsPage() { return <ControlPage title="Settings" subtitle="Business controls grouped by what the owner actually needs." items={[["Business identity", "Logo, name, email, phone, address and customer-facing details."], ["Invoice defaults", "GST rate, due dates, numbering and wording."], ["Approval rules", "What Churvox may prepare and what must always wait in Command."], ["Imports and exports", "Clients, team, invoices and accounting files."], ["Account safety", "Password, sessions, delete account and data controls."], ["Notifications", "Owner prompts, worker alerts and quiet hours."]]} />; }
function HelpPage() { return <ControlPage title="Help" subtitle="Fast paths for setup, workers, accounting and launch checks." items={[["Setup check", "Find missing business, team, invoice and worker setup."], ["Launch checklist", "Owner, worker, quote, invoice and sync readiness."], ["Worker guide", "How workers acknowledge jobs, record time and add proof."], ["Accounting guide", "Draft sync, exports and payment status guardrails."], ["Contact support", "Use hello@churvox.com when something blocks launch."], ["Tester readiness", "A short path for getting early testers through the app."]]} />; }

function PlansPage() {
  return <section className="plansPage"><header className="plansHeader"><span className="kicker">Plans</span><h1>Simple tiers. Clear admin power.</h1><p>Pricing stays fixed. Each tier shows what actually unlocks.</p></header><div className="planCards">{planRows.map((plan) => <article className={plan.name === "Operator" ? "popular" : ""} key={plan.name}><span>{plan.tag}</span><h2>{plan.name}</h2><strong>{plan.price}</strong><p>{plan.text}</p></article>)}</div><div className="planMatrix"><table><thead><tr><th>Feature</th><th>Start</th><th>Crew</th><th>Operator</th><th>Command</th></tr></thead><tbody>{featureMatrix.map((row) => <tr key={row[0]}>{row.map((cell) => <td key={`${row[0]}-${cell}`}>{cell}</td>)}</tr>)}</tbody></table></div></section>;
}

function Page({ page, onNavigate }) {
  if (page === "command") return <CommandPage />;
  if (page === "jobs") return <JobsPage onNavigate={onNavigate} />;
  if (page === "clients") return <ClientsPage />;
  if (page === "workers") return <WorkersPage />;
  if (page === "quotes") return <QuotesPage onNavigate={onNavigate} />;
  if (page === "invoices") return <InvoicesPage onNavigate={onNavigate} />;
  if (page === "messages") return <MessagesPage onNavigate={onNavigate} />;
  if (page === "team") return <TeamPage />;
  if (page === "xero") return <XeroPage />;
  if (page === "settings") return <SettingsPage />;
  if (page === "plans") return <PlansPage />;
  if (page === "help") return <HelpPage />;
  return <HubPage onNavigate={onNavigate} />;
}

export default function ChurvoxOSApp() {
  const [page, navigate] = useRoute();
  return <OSFrame page={page} navigate={navigate} dock={page !== "command"}><Page page={page} onNavigate={navigate} /></OSFrame>;
}
