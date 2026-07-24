import React from "react";
import { useAuth } from "../context/AuthContext";
import API_BASE from "../lib/apiBase";
import ControlBoardEditor, { blankRecord } from "./ControlBoardEditor";
import {
  ADDONS,
  PLANS,
  SUPPORT_EMAIL,
  buildSearchIndex,
  clean,
  createAccess,
  downloadCsv,
  firstGood,
  money,
  recordDate,
  titleOf,
  useControlBoardData,
} from "./controlBoardData";
import "./productAppV7.css";

const AREAS = [
  { id: "today", label: "Today", page: "today", pages: ["today"] },
  { id: "work", label: "Work", page: "jobs", pages: ["jobs", "schedule", "recurring"] },
  { id: "clients", label: "Clients", page: "clients", pages: ["clients"] },
  { id: "money", label: "Money", page: "money", pages: ["money", "quotes", "invoices", "accounting"] },
  { id: "team", label: "Team", page: "crew", pages: ["crew", "field", "timesheets", "access"] },
  { id: "messages", label: "Messages", page: "messages", pages: ["messages"] },
  { id: "command", label: "Command", page: "command", pages: ["command", "parked", "completed"] },
];

const SUBTABS = {
  work: [["jobs", "Jobs"], ["schedule", "Schedule"], ["recurring", "Recurring"]],
  money: [["money", "Overview"], ["quotes", "Quotes"], ["invoices", "Invoices"], ["accounting", "Accounting"]],
  team: [["crew", "Crew"], ["field", "Field activity"], ["timesheets", "Timesheets"], ["access", "Access"]],
  command: [["command", "Waiting"], ["parked", "Parked"], ["completed", "Completed"]],
};

const ROUTE_ALIASES = {
  dashboard: "today", smarthub: "today", work: "jobs", job: "jobs", calendar: "schedule", workers: "crew", worker: "crew", team: "crew", payroll: "timesheets", xero: "accounting", help: "support", guide: "support", setup: "support",
};

function routeFromLocation() {
  if (typeof window === "undefined") return "today";
  const path = clean((window.location.pathname || "").split("/")[1]).toLowerCase();
  const hash = clean((window.location.hash || "").replace(/^#/, "").split("?")[0]).toLowerCase();
  return ROUTE_ALIASES[hash] || hash || ROUTE_ALIASES[path] || path || "today";
}

function areaFor(page) {
  return AREAS.find((area) => area.pages.includes(page))?.id || (page === "settings" || page === "plans" || page === "support" ? "utility" : "today");
}

function useRoute(access) {
  const [page, setPage] = React.useState(routeFromLocation);
  React.useEffect(() => {
    const sync = () => setPage(routeFromLocation());
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => { window.removeEventListener("hashchange", sync); window.removeEventListener("popstate", sync); };
  }, []);

  const go = React.useCallback((next) => {
    const area = areaFor(next);
    const allowed = area === "utility" ? access.can(next === "support" ? "help" : next) : access.can(area);
    const safe = allowed ? next : "plans";
    window.history.pushState({}, "", `/dashboard${safe === "today" ? "" : `#${safe}`}`);
    setPage(safe);
    window.dispatchEvent(new Event("hashchange"));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [access]);
  return [page, go];
}

function isToday(value) {
  if (!value) return false;
  const date = new Date(value);
  const now = new Date();
  if (Number.isNaN(date.getTime())) return false;
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
}

function dateLabel(value) {
  if (!value) return "Date needed";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-NZ", { weekday: "short", day: "numeric", month: "short" });
}

function toneFor(value) {
  const raw = clean(value).toLowerCase();
  if (/complete|paid|accepted|connected|active/.test(raw)) return "good";
  if (/issue|check|late|overdue|urgent|blocked|unassigned/.test(raw)) return "bad";
  if (/progress|acknowledged|sent|viewed|working|travel/.test(raw)) return "live";
  return "quiet";
}

function Button({ children, className = "", ...props }) {
  return <button type="button" className={`cv7Button ${className}`} {...props}>{children}</button>;
}

function Empty({ title, text, action, onAction }) {
  return <div className="cv7Empty"><span aria-hidden="true" /><div><b>{title}</b><p>{text}</p>{action ? <button type="button" onClick={onAction}>{action}</button> : null}</div></div>;
}

function Status({ children, tone }) {
  return <span className={`cv7Status ${tone || toneFor(children)}`}><i />{children}</span>;
}

function Metric({ label, value, note, onClick, tone = "" }) {
  const Tag = onClick ? "button" : "div";
  return <Tag type={onClick ? "button" : undefined} onClick={onClick} className={`cv7Metric ${tone}`}><small>{label}</small><b>{value}</b>{note ? <span>{note}</span> : null}</Tag>;
}

function RecordRow({ record, title, meta, value, onClick }) {
  return <button type="button" className="cv7RecordRow" onClick={onClick}><span className={`cv7RecordDot ${toneFor(record?.status || record?.priority || record?.issue)}`} /><div><b>{title}</b><small>{meta}</small></div>{value ? <strong>{value}</strong> : <em>Open</em>}</button>;
}

function Header({ page, go, access, user, logout, create, search, notifications, notificationCount }) {
  const [profileOpen, setProfileOpen] = React.useState(false);
  const area = areaFor(page);
  const name = user?.business_name || user?.company_name || user?.name || user?.email || "Owner";
  const initials = clean(name).split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "CV";
  const visibleAreas = AREAS.filter((item) => access.can(item.id));

  return <header className="cv7Header">
    <div className="cv7HeaderTop">
      <button type="button" className="cv7Brand" onClick={() => go("today")}><span>CV</span><b>Churvox<small>Control Board</small></b></button>
      <nav className="cv7MainNav" aria-label="Churvox main navigation">{visibleAreas.map((item) => <button type="button" key={item.id} className={area === item.id ? "active" : ""} onClick={() => go(item.page)}>{item.label}</button>)}</nav>
      <div className="cv7HeaderActions">
        <button type="button" className="cv7IconButton" onClick={search} aria-label="Search"><span>⌕</span><small>Search</small></button>
        <button type="button" className="cv7IconButton" onClick={notifications} aria-label="Notifications"><span>●</span><small>Updates</small>{notificationCount ? <em>{notificationCount}</em> : null}</button>
        <button type="button" className="cv7Create" onClick={create}>+ Create</button>
        <div className="cv7ProfileWrap"><button type="button" className="cv7Profile" onClick={() => setProfileOpen((value) => !value)}>{initials}</button>{profileOpen ? <div className="cv7ProfileMenu"><small>{access.planName} plan</small><b>{name}</b><span>{user?.email || "Owner account"}</span>{access.can("settings") ? <button type="button" onClick={() => { setProfileOpen(false); go("settings"); }}>Business settings</button> : null}<button type="button" onClick={() => { setProfileOpen(false); go("plans"); }}>Plans and billing</button><button type="button" onClick={() => { setProfileOpen(false); go("support"); }}>Help</button><button type="button" className="logout" onClick={async () => { await logout(); window.location.assign("/login"); }}>Log out</button></div> : null}</div>
      </div>
    </div>
    {SUBTABS[area] ? <nav className="cv7SubNav" aria-label={`${area} navigation`}>{SUBTABS[area].filter(([id]) => id !== "accounting" || access.accounting).map(([id, label]) => <button type="button" key={id} className={page === id ? "active" : ""} onClick={() => go(id)}>{label}</button>)}</nav> : null}
  </header>;
}

function BusinessFlow({ data, go }) {
  const stages = [
    ["Quotes", data.quotes.filter((item) => !/accepted|converted|declined/i.test(item.status)).length, "quotes"],
    ["Accepted", data.quotes.filter((item) => /accepted|converted/i.test(item.status)).length, "quotes"],
    ["Scheduled", data.jobs.filter((item) => item.date && !/complete/i.test(item.status)).length, "jobs"],
    ["In progress", data.jobs.filter((item) => /progress|acknowledged/i.test(item.status)).length, "jobs"],
    ["Completed", data.jobs.filter((item) => /complete/i.test(item.status)).length, "jobs"],
    ["Invoiced", data.invoices.filter((item) => !/paid/i.test(item.status)).length, "invoices"],
    ["Paid", data.invoices.filter((item) => /paid/i.test(item.status)).length, "invoices"],
  ];
  return <section className="cv7Flow"><header><div><small>Business flow</small><h3>Where work is moving—and where it is stuck</h3></div></header><div>{stages.map(([label, count, page], index) => <React.Fragment key={label}><button type="button" onClick={() => go(page)}><small>{label}</small><b>{count}</b></button>{index < stages.length - 1 ? <span aria-hidden="true">→</span> : null}</React.Fragment>)}</div></section>;
}

function TodayPage({ data, go, open, create, lastVisit }) {
  const active = data.workers.filter((item) => !/offline|not clocked|inactive|not invited/i.test(item.status)).length;
  const complete = data.jobs.filter((item) => /complete/i.test(item.status)).length;
  const overdue = data.invoices.filter((item) => /overdue/i.test(item.status));
  const jobIssues = data.jobs.filter((item) => item.issue || /needs check|late|unassigned/i.test(`${item.status} ${item.worker}`));
  const urgentMessages = data.messages.filter((item) => /urgent|high/i.test(item.priority));
  const attention = [...data.command, ...jobIssues, ...overdue, ...urgentMessages];
  const todayJobs = data.jobs.filter((item) => isToday(item.date));
  const timeline = (todayJobs.length ? todayJobs : data.jobs).slice().sort((a, b) => `${a.date || "9999"} ${a.time || "99"}`.localeCompare(`${b.date || "9999"} ${b.time || "99"}`)).slice(0, 9);
  const invoiceOutstanding = data.invoices.filter((item) => !/paid/i.test(item.status)).reduce((sum, item) => sum + item.amount, 0);
  const changes = [...data.jobs, ...data.quotes, ...data.invoices, ...data.messages, ...data.workers].filter((item) => { const date = recordDate(item); return date && lastVisit && date > lastVisit; }).sort((a, b) => (recordDate(b)?.getTime() || 0) - (recordDate(a)?.getTime() || 0));
  const healthy = attention.length === 0;

  return <>
    <section className={`cv7ControlStatus ${healthy ? "healthy" : "attention"}`}>
      <div><small>{new Date().toLocaleDateString("en-NZ", { weekday: "long", day: "numeric", month: "long" })}</small><h1>{healthy ? "Business under control." : `${attention.length} thing${attention.length === 1 ? "" : "s"} need you.`}</h1><p>{healthy ? "The day is moving and no urgent owner decision is visible." : "Churvox has pulled the exceptions together. Start with the first one, not the whole business."}</p></div>
      <div className="cv7ControlMetrics"><Metric label="Work today" value={todayJobs.length || data.jobs.length} note="Open run sheet" onClick={() => go("jobs")} /><Metric label="Field active" value={active} note={`${data.workers.length} connected`} onClick={() => go("field")} /><Metric label="Owner checks" value={data.command.length} note="Waiting in Command" tone={data.command.length ? "warn" : ""} onClick={() => go("command")} /><Metric label="Outstanding" value={money(invoiceOutstanding)} note={`${overdue.length} overdue`} tone={overdue.length ? "warn" : ""} onClick={() => go("invoices")} /></div>
    </section>

    <section className="cv7TodayGrid">
      <article className="cv7Timeline"><header><div><small>Live day</small><h2>{todayJobs.length ? "Today’s run sheet" : "Next work on the board"}</h2></div><Button onClick={() => create("job")}>Add job</Button></header>{timeline.length ? <div className="cv7TimelineRows">{timeline.map((job) => <button type="button" key={job.id} onClick={() => open(job)}><time><b>{job.time || "Any time"}</b><small>{dateLabel(job.date)}</small></time><span className={`track ${toneFor(job.status)}`}><i /></span><div><b>{job.title}</b><small>{job.client} · {job.worker}</small></div><Status>{job.status}</Status><strong>{money(job.price)}</strong></button>)}</div> : <Empty title="No work is booked" text="Add the first real job and the day will build itself around it." action="Create a job" onAction={() => create("job")} />}</article>

      <aside className="cv7Needs"><header><div><small>Needs you</small><h2>{attention.length ? `${attention.length} clear next move${attention.length === 1 ? "" : "s"}` : "Nothing urgent"}</h2></div></header>{attention.length ? <div>{attention.slice(0, 7).map((item) => <RecordRow key={`${item.type}-${item.id}`} record={item} title={titleOf(item)} meta={item.reason || item.issue || item.status || item.priority || "Owner check"} value={item.amount ? money(item.amount) : "Review"} onClick={() => item.type === "approval" ? open(item) : open(item)} />)}</div> : <Empty title="The control rail is clear" text="Only genuine exceptions and prepared decisions will appear here." />}</aside>
    </section>

    <section className="cv7LowerGrid">
      <article className="cv7Changes"><header><div><small>Since your last visit</small><h3>{lastVisit ? "What changed while you were away" : "First visit on this device"}</h3></div></header>{changes.length ? changes.slice(0, 6).map((item) => <RecordRow key={`${item.type}-${item.id}`} record={item} title={titleOf(item)} meta={`${item.type} · ${item.status || item.client || item.from || "updated"}`} onClick={() => open(item)} />) : <Empty title={lastVisit ? "No recorded changes" : "Live changes will collect here"} text={lastVisit ? "Nothing with a reliable update time has changed since your previous visit." : "Churvox will show jobs, payments, replies and field updates when they are recorded."} />}</article>
      <BusinessFlow data={data} go={go} />
    </section>
  </>;
}

function WorkPage({ page, data, open, create }) {
  const [filter, setFilter] = React.useState("all");
  const filtered = data.jobs.filter((job) => {
    if (filter === "today") return isToday(job.date);
    if (filter === "unassigned") return /unassigned/i.test(job.worker);
    if (filter === "attention") return job.issue || /check|late/i.test(job.status);
    if (filter === "completed") return /complete/i.test(job.status);
    return true;
  });
  const recurring = data.jobs.filter((job) => job.recurring && job.recurring !== "One-off");

  if (page === "schedule") {
    const workers = data.workers.length ? data.workers : [{ id: "unassigned", name: "Unassigned" }];
    return <section className="cv7PageRoom"><header className="cv7PageTitle"><div><small>Work · Schedule</small><h1>See the week by worker, not by clutter.</h1></div><Button className="primary" onClick={() => create("job")}>Add booking</Button></header><div className="cv7WorkerLanes">{workers.map((worker) => { const jobs = data.jobs.filter((job) => job.worker === worker.name || (worker.id === "unassigned" && /unassigned/i.test(job.worker))); return <article key={worker.id}><header><span>{worker.name.slice(0, 2).toUpperCase()}</span><div><b>{worker.name}</b><small>{jobs.length} booked</small></div></header><div>{jobs.length ? jobs.slice(0, 8).map((job) => <button type="button" key={job.id} onClick={() => open(job)}><time>{dateLabel(job.date)} · {job.time || "Any time"}</time><b>{job.title}</b><small>{job.client}</small><Status>{job.status}</Status></button>) : <p>No assigned work</p>}</div></article>; })}</div></section>;
  }

  if (page === "recurring") return <section className="cv7PageRoom"><header className="cv7PageTitle"><div><small>Work · Recurring</small><h1>Repeat work stays visible and predictable.</h1></div><Button className="primary" onClick={() => open({ ...blankRecord("job", data), recurring: "Weekly" })}>Add recurring job</Button></header><div className="cv7DataTable"><div className="head"><span>Job</span><span>Client</span><span>Frequency</span><span>Next date</span><span>Worker</span><span>Status</span></div>{recurring.length ? recurring.map((job) => <button type="button" key={job.id} onClick={() => open(job)}><b>{job.title}</b><span>{job.client}</span><span>{job.recurring}</span><span>{dateLabel(job.date)}</span><span>{job.worker}</span><Status>{job.status}</Status></button>) : <Empty title="No recurring work" text="Weekly, fortnightly, monthly and custom work belongs here inside Work." action="Add recurring job" onAction={() => open({ ...blankRecord("job", data), recurring: "Weekly" })} />}</div></section>;

  return <section className="cv7PageRoom"><header className="cv7PageTitle"><div><small>Work · Jobs</small><h1>Booked, assigned, moving and at risk.</h1></div><div><Button onClick={() => downloadCsv("churvox-jobs.csv", data.jobs, [["Job", "title"], ["Client", "client"], ["Worker", "worker"], ["Date", "date"], ["Time", "time"], ["Price", "price"], ["Status", "status"]])}>Export</Button><Button className="primary" onClick={() => create("job")}>Add job</Button></div></header><div className="cv7FilterBar">{[["all", "All"], ["today", "Today"], ["unassigned", "Unassigned"], ["attention", "Needs attention"], ["completed", "Completed"]].map(([id, label]) => <button type="button" key={id} className={filter === id ? "active" : ""} onClick={() => setFilter(id)}>{label}<span>{id === "all" ? data.jobs.length : data.jobs.filter((job) => id === "today" ? isToday(job.date) : id === "unassigned" ? /unassigned/i.test(job.worker) : id === "attention" ? job.issue || /check|late/i.test(job.status) : /complete/i.test(job.status)).length}</span></button>)}</div><div className="cv7DataTable jobs"><div className="head"><span>When</span><span>Job and client</span><span>Worker</span><span>Status</span><span>Value</span></div>{filtered.length ? filtered.map((job) => <button type="button" key={job.id} onClick={() => open(job)}><span><b>{job.time || "Any time"}</b><small>{dateLabel(job.date)}</small></span><span><b>{job.title}</b><small>{job.client} · {job.address || "No address"}</small></span><span>{job.worker}</span><Status>{job.status}</Status><strong>{money(job.price)}</strong></button>) : <Empty title="No jobs match this view" text="Change the filter or create a new job." action="Add job" onAction={() => create("job")} />}</div></section>;
}

function ClientsPage({ data, open, create, api, refresh, notify }) {
  const [query, setQuery] = React.useState("");
  const [selectedId, setSelectedId] = React.useState(data.clients[0]?.id || "");
  const inputRef = React.useRef(null);
  React.useEffect(() => { if (!selectedId && data.clients[0]) setSelectedId(data.clients[0].id); }, [data.clients, selectedId]);
  const clients = data.clients.filter((item) => `${item.name} ${item.email} ${item.phone} ${item.address}`.toLowerCase().includes(query.toLowerCase()));
  const selected = data.clients.find((item) => item.id === selectedId) || clients[0];
  const linked = selected ? [...data.jobs.filter((item) => item.client === selected.name), ...data.quotes.filter((item) => item.client === selected.name), ...data.invoices.filter((item) => item.client === selected.name), ...data.messages.filter((item) => item.client === selected.name)].sort((a, b) => (recordDate(b)?.getTime() || 0) - (recordDate(a)?.getTime() || 0)) : [];

  async function importCsv(file) {
    if (!file) return;
    try {
      const lines = (await file.text()).split(/\r?\n/).filter((line) => clean(line));
      const headers = lines.shift().split(",").map((item) => item.trim().toLowerCase().replace(/[^a-z0-9]/g, ""));
      let count = 0;
      for (const line of lines) {
        const cells = line.split(",");
        const row = headers.reduce((result, header, index) => ({ ...result, [header]: clean(cells[index]) }), {});
        const payload = { name: row.name || row.client || row.clientname || row.customer || "", phone: row.phone || row.mobile || "", email: row.email || "", address: row.address || row.siteaddress || "", service: row.service || row.preferredservice || "", price: row.price || row.savedprice || "", schedule: row.schedule || row.recurrence || "One-off", notes: row.notes || row.accessnotes || "" };
        if (!payload.name) continue;
        await firstGood([() => api.post("/clients", payload), () => api.post("/clients/create", payload)]);
        count += 1;
      }
      await refresh();
      notify({ tone: "good", title: "Client import complete", text: `${count} client${count === 1 ? "" : "s"} added.` });
    } catch (error) { notify({ tone: "bad", title: "Import failed", text: error?.message || "Check the CSV and try again." }); }
    if (inputRef.current) inputRef.current.value = "";
  }

  return <section className="cv7PageRoom"><header className="cv7PageTitle"><div><small>Clients</small><h1>Open a customer and see the whole relationship.</h1></div><div><Button onClick={() => inputRef.current?.click()}>Import CSV</Button><Button onClick={() => downloadCsv("churvox-clients.csv", data.clients, [["Name", "name"], ["Phone", "phone"], ["Email", "email"], ["Address", "address"], ["Service", "service"], ["Price", "price"], ["Schedule", "schedule"], ["Notes", "notes"]])}>Export</Button><Button className="primary" onClick={() => create("client")}>Add client</Button><input ref={inputRef} hidden type="file" accept=".csv,text/csv" onChange={(event) => importCsv(event.target.files?.[0])} /></div></header><div className="cv7ClientRoom"><aside><label><span>Search clients</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, phone, address…" /></label><div>{clients.length ? clients.map((client) => <button type="button" key={client.id} className={selected?.id === client.id ? "active" : ""} onClick={() => setSelectedId(client.id)}><b>{client.name}</b><small>{client.address || client.email || "No contact detail"}</small><span>{client.service || "No service"}</span></button>) : <Empty title="No clients found" text="Try another search or add a client." action="Add client" onAction={() => create("client")} />}</div></aside><main>{selected ? <><header><div><small>Client file</small><h2>{selected.name}</h2><p>{selected.address || "No site address"}</p></div><Button onClick={() => open(selected)}>Edit client</Button></header><div className="cv7ClientFacts"><span><small>Phone</small><b>{selected.phone || "Not added"}</b></span><span><small>Email</small><b>{selected.email || "Not added"}</b></span><span><small>Preferred service</small><b>{selected.service || "Not set"}</b></span><span><small>Saved price</small><b>{selected.price || "Open pricing"}</b></span><span><small>Schedule</small><b>{selected.schedule || "One-off"}</b></span><span><small>Access notes</small><b>{selected.notes || "No access notes"}</b></span></div><section className="cv7Activity"><header><small>Activity timeline</small><h3>Work, quotes, invoices and messages</h3></header>{linked.length ? linked.map((item) => <RecordRow key={`${item.type}-${item.id}`} record={item} title={titleOf(item)} meta={`${item.type} · ${item.status || item.from || item.client || "record"}`} value={item.amount ? money(item.amount) : item.price ? money(item.price) : "Open"} onClick={() => open(item)} />) : <Empty title="No linked activity" text="This client’s jobs, quotes, invoices and messages will collect here." />}</section></> : <Empty title="No client selected" text="Choose a client or add the first one." action="Add client" onAction={() => create("client")} />}</main></div></section>;
}

function MoneyPage({ page, data, open, create, access }) {
  const outstanding = data.invoices.filter((item) => !/paid/i.test(item.status)).reduce((sum, item) => sum + item.amount, 0);
  const overdue = data.invoices.filter((item) => /overdue/i.test(item.status));
  const paid = data.invoices.filter((item) => /paid/i.test(item.status)).reduce((sum, item) => sum + item.amount, 0);
  const draftQuotes = data.quotes.filter((item) => /draft|ready/i.test(item.status)).reduce((sum, item) => sum + item.amount, 0);

  if (page === "quotes") return <section className="cv7PageRoom"><header className="cv7PageTitle"><div><small>Money · Quotes</small><h1>Every quote by stage, value and next move.</h1></div><Button className="primary" onClick={() => create("quote")}>New quote</Button></header><div className="cv7Pipeline">{["Draft", "Ready", "Sent", "Viewed", "Accepted", "Converted"].map((stage) => { const rows = data.quotes.filter((item) => clean(item.status).toLowerCase().includes(stage.toLowerCase())); return <article key={stage}><header><b>{stage}</b><span>{rows.length}</span></header><div>{rows.length ? rows.map((quote) => <button type="button" key={quote.id} onClick={() => open(quote)}><b>{quote.title}</b><small>{quote.client}</small><strong>{money(quote.amount)}</strong></button>) : <p>No quotes</p>}</div></article>; })}</div></section>;

  if (page === "invoices") return <section className="cv7PageRoom"><header className="cv7PageTitle"><div><small>Money · Invoices</small><h1>Drafted, due, overdue and paid.</h1></div><div><Button onClick={() => downloadCsv("churvox-invoices.csv", data.invoices, [["Invoice", "number"], ["Client", "client"], ["Amount", "amount"], ["Due", "due"], ["Status", "status"], ["Sync", "sync"]])}>Export</Button><Button className="primary" onClick={() => create("invoice")}>New invoice</Button></div></header><div className="cv7DataTable invoices"><div className="head"><span>Invoice</span><span>Client and job</span><span>Due</span><span>Status</span><span>Accounting</span><span>Amount</span></div>{data.invoices.length ? data.invoices.map((invoice) => <button type="button" key={invoice.id} onClick={() => open(invoice)}><b>{invoice.number}</b><span><b>{invoice.client}</b><small>{invoice.job || "No linked job"}</small></span><span>{invoice.due || "Not set"}</span><Status>{invoice.status}</Status><span>{invoice.sync}</span><strong>{money(invoice.amount)}</strong></button>) : <Empty title="No invoices" text="Create a draft from completed work when it is ready." action="New invoice" onAction={() => create("invoice")} />}</div></section>;

  if (page === "accounting") return <section className="cv7PageRoom"><header className="cv7PageTitle"><div><small>Money · Accounting</small><h1>Connection, drafts and guardrails in one view.</h1></div>{access.accounting ? <Button className="primary" onClick={() => window.location.assign(`${String(API_BASE || "").replace(/\/$/, "")}/api/xero/connect/start`)}>{data.xero.connected ? "Reconnect Xero" : "Connect Xero"}</Button> : null}</header>{access.accounting ? <div className="cv7AccountingRoom"><article><small>Connection status</small><h2>{data.xero.connected ? "Connected" : "Not connected"}</h2><p>{data.xero.tenant || "Connect accounting when the business is ready."}</p><Status tone={data.xero.connected ? "good" : "quiet"}>{data.xero.connected ? "Draft sync ready" : "Owner setup required"}</Status></article><article><small>Ready drafts</small><h2>{data.invoices.filter((item) => /draft/i.test(item.status)).length}</h2><p>Only approved draft invoices move to accounting.</p></article><article><small>Safety rules</small><ul><li>No automatic invoice sending</li><li>No tax filing</li><li>No bank payout files</li><li>Paid status waits for accounting refresh</li></ul></article></div> : <Empty title="Accounting is not included" text="Command or the Accounting Sync Add-on unlocks guarded draft invoice sync." />}</section>;

  return <section className="cv7PageRoom"><header className="cv7PageTitle"><div><small>Money · Overview</small><h1>See where the money is before opening a record.</h1></div></header><div className="cv7MoneyPulse"><Metric label="Quotes being prepared" value={money(draftQuotes)} note={`${data.quotes.filter((item) => /draft|ready/i.test(item.status)).length} quotes`} onClick={() => window.location.hash = "quotes"} /><Metric label="Outstanding invoices" value={money(outstanding)} note={`${data.invoices.filter((item) => !/paid/i.test(item.status)).length} invoices`} onClick={() => window.location.hash = "invoices"} /><Metric label="Overdue" value={money(overdue.reduce((sum, item) => sum + item.amount, 0))} note={`${overdue.length} need attention`} tone={overdue.length ? "warn" : ""} onClick={() => window.location.hash = "invoices"} /><Metric label="Paid" value={money(paid)} note="Recorded as paid" onClick={() => window.location.hash = "invoices"} /></div><div className="cv7MoneyGrid"><article><header><small>Quotes needing movement</small><h3>Next sales actions</h3></header>{data.quotes.length ? data.quotes.slice(0, 7).map((quote) => <RecordRow key={quote.id} record={quote} title={quote.title} meta={`${quote.client} · ${quote.status}`} value={money(quote.amount)} onClick={() => open(quote)} />) : <Empty title="No quotes" text="Create a quote when a client asks for work." action="New quote" onAction={() => create("quote")} />}</article><article><header><small>Invoices needing movement</small><h3>Next money actions</h3></header>{data.invoices.length ? data.invoices.filter((item) => !/paid/i.test(item.status)).slice(0, 7).map((invoice) => <RecordRow key={invoice.id} record={invoice} title={invoice.number} meta={`${invoice.client} · ${invoice.status}`} value={money(invoice.amount)} onClick={() => open(invoice)} />) : <Empty title="No outstanding invoices" text="Draft invoices will show here before they are sent." action="New invoice" onAction={() => create("invoice")} />}</article></div></section>;
}

function TeamPage({ page, data, open, create }) {
  if (page === "field") {
    const groups = [["Working", /working|progress|active/i], ["Travelling", /travel/i], ["Finished", /finished|complete|done/i], ["Needs help", /help|issue|check|late/i], ["Offline", /offline|not clocked|inactive/i]];
    return <section className="cv7PageRoom"><header className="cv7PageTitle"><div><small>Team · Field activity</small><h1>Know what is happening outside the office.</h1></div></header><div className="cv7FieldBoard">{groups.map(([label, match]) => { const workers = data.workers.filter((item) => match.test(`${item.status} ${item.messages}`)); return <article key={label}><header><b>{label}</b><span>{workers.length}</span></header>{workers.length ? workers.map((worker) => <button type="button" key={worker.id} onClick={() => open(worker)}><span>{worker.name.slice(0, 2).toUpperCase()}</span><div><b>{worker.name}</b><small>{worker.job}</small></div><Status>{worker.status}</Status></button>) : <p>No workers</p>}</article>; })}</div></section>;
  }
  if (page === "timesheets") return <section className="cv7PageRoom"><header className="cv7PageTitle"><div><small>Team · Timesheets</small><h1>Review recorded time without filing taxes or paying banks.</h1></div><Button onClick={() => downloadCsv("churvox-timesheet-review.csv", data.workers, [["Worker", "name"], ["Timesheet", "timesheet"], ["Payroll status", "payroll"]])}>Export review</Button></header><div className="cv7DataTable"><div className="head"><span>Worker</span><span>Recorded time</span><span>Current job</span><span>Review status</span><span>Action</span></div>{data.workers.length ? data.workers.map((worker) => <button type="button" key={worker.id} onClick={() => open(worker)}><b>{worker.name}</b><span>{worker.timesheet || "No time recorded"}</span><span>{worker.job}</span><Status>{worker.payroll}</Status><em>Review</em></button>) : <Empty title="No workers" text="Add team members before reviewing timesheets." action="Add worker" onAction={() => create("worker")} />}</div></section>;
  if (page === "access") return <section className="cv7PageRoom"><header className="cv7PageTitle"><div><small>Team · Access</small><h1>Everyone sees only what their role needs.</h1></div><Button className="primary" onClick={() => create("worker")}>Invite person</Button></header><div className="cv7DataTable"><div className="head"><span>Person</span><span>Role</span><span>Access</span><span>Worker app</span><span>Status</span></div>{data.workers.length ? data.workers.map((worker) => <button type="button" key={worker.id} onClick={() => open(worker)}><b>{worker.name}</b><span>{worker.role}</span><span>{worker.access}</span><span>{worker.app}</span><Status>{worker.status}</Status></button>) : <Empty title="No team access" text="Invite the first worker or office person." action="Invite person" onAction={() => create("worker")} />}</div></section>;
  return <section className="cv7PageRoom"><header className="cv7PageTitle"><div><small>Team · Crew</small><h1>People, current work and access at a glance.</h1></div><div><Button onClick={() => downloadCsv("churvox-team.csv", data.workers, [["Name", "name"], ["Email", "email"], ["Role", "role"], ["Status", "status"], ["Job", "job"], ["Access", "access"]])}>Export</Button><Button className="primary" onClick={() => create("worker")}>Add worker</Button></div></header><div className="cv7CrewGrid">{data.workers.length ? data.workers.map((worker) => <button type="button" key={worker.id} onClick={() => open(worker)}><header><span>{worker.name.slice(0, 2).toUpperCase()}</span><div><b>{worker.name}</b><small>{worker.role}</small></div><Status>{worker.status}</Status></header><dl><div><dt>Current work</dt><dd>{worker.job}</dd></div><div><dt>Access</dt><dd>{worker.access}</dd></div><div><dt>Last proof</dt><dd>{worker.proof || "No proof yet"}</dd></div><div><dt>Timesheet</dt><dd>{worker.timesheet || "No time"}</dd></div></dl></button>) : <Empty title="No crew connected" text="Add workers and subcontractors to create the live field board." action="Add worker" onAction={() => create("worker")} />}</div></section>;
}

function MessagesPage({ data, open, create }) {
  const [selectedId, setSelectedId] = React.useState(data.messages[0]?.id || "");
  React.useEffect(() => { if (!selectedId && data.messages[0]) setSelectedId(data.messages[0].id); }, [data.messages, selectedId]);
  const selected = data.messages.find((item) => item.id === selectedId) || data.messages[0];
  return <section className="cv7PageRoom"><header className="cv7PageTitle"><div><small>Messages</small><h1>Conversation, context and next action together.</h1></div><Button className="primary" onClick={() => create("message")}>New message note</Button></header><div className="cv7MessageRoom"><aside>{data.messages.length ? data.messages.map((message) => <button type="button" key={message.id} className={selected?.id === message.id ? "active" : ""} onClick={() => setSelectedId(message.id)}><span className={toneFor(message.priority)} /><div><b>{message.subject}</b><small>{message.from} · {message.client || message.job || message.channel}</small></div><Status>{message.priority}</Status></button>) : <Empty title="No messages" text="Worker updates and client replies will collect here with their context." action="Add a message note" onAction={() => create("message")} />}</aside><main>{selected ? <><header><div><small>{selected.channel}</small><h2>{selected.subject}</h2><p>From {selected.from}</p></div><Button onClick={() => open(selected)}>Open record</Button></header><article className="cv7Conversation"><small>Message</small><p>{selected.detail || "No message body was recorded."}</p></article><article className="cv7DraftReply"><small>Prepared reply</small><p>{selected.draft || "No reply has been prepared yet."}</p><Button className="primary" onClick={() => open(selected)}>Review and edit</Button></article><aside className="cv7MessageContext"><small>Connected work</small><span><b>Client</b>{selected.client || "Not linked"}</span><span><b>Job</b>{selected.job || "Not linked"}</span><span><b>Priority</b>{selected.priority}</span></aside></> : null}</main></div></section>;
}

function CommandPage({ page, data, open }) {
  const wanted = page === "parked" ? /park/i : page === "completed" ? /approved|complete|done/i : /waiting|ready|pending|review/i;
  const queue = data.command.filter((item) => wanted.test(item.status || (page === "command" ? "waiting" : "")));
  const [selectedId, setSelectedId] = React.useState(queue[0]?.id || "");
  React.useEffect(() => { if (!queue.some((item) => item.id === selectedId)) setSelectedId(queue[0]?.id || ""); }, [queue, selectedId]);
  const selected = queue.find((item) => item.id === selectedId) || queue[0];
  return <section className="cv7Command"><aside><header><small>Command · {page === "command" ? "Waiting" : page === "parked" ? "Parked" : "Completed"}</small><h2>{queue.length ? `${queue.length} decision${queue.length === 1 ? "" : "s"}` : "The room is clear"}</h2></header>{queue.length ? queue.map((item, index) => <button type="button" key={item.id} className={selected?.id === item.id ? "active" : ""} onClick={() => setSelectedId(item.id)}><span>{String(index + 1).padStart(2, "0")}</span><div><b>{item.approvalType}</b><small>{item.title}</small></div><Status>{item.status}</Status></button>) : <Empty title="Nothing in this queue" text="Only genuine owner decisions appear in Command." />}</aside><main>{selected ? <><header><small>Owner decision</small><h1>{selected.title}</h1><p>{selected.reason}</p></header><div className="cv7DecisionGrid"><span><small>What happened</small><b>{selected.reason}</b></span><span><small>Why it reached you</small><b>{selected.recommended || "Owner approval is required"}</b></span><span><small>What Churvox checked</small><b>{selected.evidence}</b></span><span><small>What Churvox prepared</small><b>{selected.prepared}</b></span></div><div className="cv7DecisionEffect"><small>What approval will do</small><b>{selected.recommended || "Apply the prepared result to the connected record"}</b></div><Button className="primary" onClick={() => open(selected)}>Open decision</Button><footer>Nothing sends, charges, syncs, pays or changes until the owner approves it.</footer></> : <div className="cv7CommandClear"><span /><h1>No owner decision is waiting.</h1><p>Churvox will bring a decision here only when the result needs your judgement.</p></div>}</main></section>;
}

function SettingsPage({ user, api, notify }) {
  const [values, setValues] = React.useState({ business_name: user?.business_name || user?.company_name || "", gst_rate: user?.gst_rate || "15", public_email: user?.public_email || SUPPORT_EMAIL, worker_rule: user?.worker_rule || "simple", brand_tone: user?.brand_tone || "premium-simple" });
  const [busy, setBusy] = React.useState(false);
  const save = async () => { setBusy(true); try { await firstGood([() => api.patch("/business/settings", values), () => api.put("/business/settings", values), () => api.patch("/settings/business", values), () => api.post("/settings/business", values)]); notify({ tone: "good", title: "Settings saved", text: "Business controls are up to date." }); } catch (error) { notify({ tone: "bad", title: "Could not save settings", text: error?.message || "Try again." }); } finally { setBusy(false); } };
  return <section className="cv7PageRoom"><header className="cv7PageTitle"><div><small>Business settings</small><h1>The controls that change how Churvox works.</h1></div><Button className="primary" disabled={busy} onClick={save}>Save settings</Button></header><div className="cv7SettingsGrid"><article><h2>Business profile</h2>{[["Business name", "business_name"], ["GST rate", "gst_rate"], ["Public email", "public_email"]].map(([label, key]) => <label key={key}><span>{label}</span><input value={values[key]} onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))} /></label>)}<label><span>Worker app detail</span><select value={values.worker_rule} onChange={(event) => setValues((current) => ({ ...current, worker_rule: event.target.value }))}><option value="simple">Simple worker app</option><option value="full">Full field detail</option></select></label><label><span>Brand style</span><select value={values.brand_tone} onChange={(event) => setValues((current) => ({ ...current, brand_tone: event.target.value }))}><option value="premium-simple">Premium simple</option><option value="industrial">Industrial</option><option value="clean">Clean</option></select></label></article><article><h2>Where rules belong</h2><div className="cv7RuleList"><span><b>Work</b><small>One-off and recurring jobs, schedule and field proof</small></span><span><b>Money</b><small>Quotes, invoices, reminders and accounting handoff</small></span><span><b>Team</b><small>Roles, access, worker app and timesheet review</small></span><span><b>Command</b><small>Approval rules, parked work and completed decisions</small></span></div></article></div></section>;
}

function PlansPage({ access }) {
  return <section className="cv7PageRoom"><header className="cv7PageTitle"><div><small>Plans and billing</small><h1>See your current access before comparing anything.</h1></div><Status tone="live">Current: {access.planName}</Status></header><div className="cv7Plans">{PLANS.map((plan) => { const current = plan.code === access.planKey; return <article key={plan.name} className={`${plan.popular ? "popular" : ""} ${current ? "current" : ""}`} data-plan-card={!current ? true : undefined} data-stripe-plan={!current ? plan.name : undefined}><header><small>{current ? "Current plan" : plan.popular ? "Most popular" : "Monthly"}</small><h2>{plan.name}</h2><strong>${plan.price}<span>/month + GST</span></strong></header><p>{plan.note}</p><ul>{plan.items.map((item) => <li key={item}>{item}</li>)}</ul>{current ? <button type="button" disabled>Current plan</button> : <button type="button" data-stripe-live-plan={plan.name} data-stripe-live-action="start_trial">Start {plan.name} trial</button>}</article>; })}</div><div className="cv7Addons">{ADDONS.map((addon) => <article key={addon.name} data-plan-card data-stripe-plan={addon.stripe}><div><h3>{addon.name}</h3><p>{addon.note}</p></div><strong>${addon.price}<small>/month + GST</small></strong><button type="button" data-stripe-live-plan={addon.stripe} data-stripe-live-action="add_on">Add option</button></article>)}</div></section>;
}

function SupportPage() {
  return <section className="cv7PageRoom"><header className="cv7PageTitle"><div><small>Help</small><h1>Start with the page, record or decision that is stuck.</h1></div><Button className="primary" onClick={() => window.location.assign(`mailto:${SUPPORT_EMAIL}`)}>Email Churvox</Button></header><div className="cv7Support"><article><small>Best support message</small><h2>Tell us where, what and what you expected.</h2><ol><li>Name the page</li><li>Name the client, job or record</li><li>Say what happened</li><li>Say what should have happened</li></ol></article><article><small>Safe operating route</small><h2>Build around real work.</h2><ol><li>Add or import a client</li><li>Create the first job</li><li>Connect the worker</li><li>Review exceptions in Command</li><li>Export records whenever needed</li></ol></article></div></section>;
}

function SearchOverlay({ data, close, open, go }) {
  const [query, setQuery] = React.useState("");
  const index = React.useMemo(() => buildSearchIndex(data), [data]);
  const results = query ? index.filter((item) => item.search.toLowerCase().includes(query.toLowerCase())).slice(0, 20) : index.slice(0, 12);
  const route = (record) => record.type === "client" ? "clients" : record.type === "job" ? "jobs" : record.type === "quote" ? "quotes" : record.type === "invoice" ? "invoices" : record.type === "worker" ? "crew" : "messages";
  return <div className="cv7Overlay" role="dialog" aria-modal="true" aria-label="Search Churvox"><section className="cv7Search"><header><label><span>Search the whole business</span><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Client, job, invoice, worker…" /></label><button type="button" onClick={close}>Close</button></header><div>{results.length ? results.map((item) => <button type="button" key={`${item.type}-${item.id}`} onClick={() => { close(); go(route(item)); window.setTimeout(() => open(item), 50); }}><span className={toneFor(item.status || item.priority)} /><div><small>{item.area}</small><b>{titleOf(item)}</b><em>{item.client || item.worker || item.email || item.status || item.from || "Record"}</em></div><strong>{item.amount ? money(item.amount) : item.price ? money(item.price) : "Open"}</strong></button>) : <Empty title="No matching records" text="Try a name, address, job, invoice or worker." />}</div></section></div>;
}

function CreateOverlay({ data, access, close, open }) {
  const items = [["job", "Job", "Book, assign and price work"], ["client", "Client", "Create a customer file"], ["quote", "Quote", "Prepare scope and price"], ["invoice", "Invoice", "Create an owner-reviewed draft"], ["worker", "Worker", "Invite crew or a subcontractor"], ["message", "Message note", "Attach communication to work"]].filter(([type]) => !["worker", "message"].includes(type) || access.can("team"));
  return <div className="cv7Overlay" role="dialog" aria-modal="true" aria-label="Create in Churvox"><section className="cv7CreateMenu"><header><div><small>Global create</small><h2>What are you adding?</h2></div><button type="button" onClick={close}>Close</button></header><div>{items.map(([type, label, text]) => <button type="button" key={type} onClick={() => { close(); open(blankRecord(type, data)); }}><span>+</span><div><b>{label}</b><small>{text}</small></div><em>Create</em></button>)}</div></section></div>;
}

function NotificationPanel({ notifications, close, open, go }) {
  const route = (item) => item.type === "approval" ? "command" : item.type === "invoice" ? "invoices" : item.type === "message" ? "messages" : "jobs";
  return <div className="cv7PanelLayer" onClick={close}><aside className="cv7Notifications" onClick={(event) => event.stopPropagation()}><header><div><small>Meaningful updates</small><h2>{notifications.length ? `${notifications.length} need awareness` : "You are caught up"}</h2></div><button type="button" onClick={close}>Close</button></header><div>{notifications.length ? notifications.map((item) => <RecordRow key={`${item.type}-${item.id}`} record={item} title={titleOf(item)} meta={item.reason || item.issue || item.status || item.priority} value="Open" onClick={() => { close(); go(route(item)); window.setTimeout(() => open(item), 50); }} />) : <Empty title="No meaningful updates" text="Payments, replies, late work and owner decisions will appear here." />}</div><footer>Notifications tell you what changed. Command holds decisions that require approval.</footer></aside></div>;
}

function Toast({ notice, clear }) {
  if (!notice) return null;
  return <div className={`cv7Toast ${notice.tone || ""}`}><b>{notice.title}</b><span>{notice.text}</span><button type="button" onClick={clear}>Close</button></div>;
}

function MobileNav({ page, go, access }) {
  const [more, setMore] = React.useState(false);
  const items = [["today", "Today"], ["jobs", "Work"], ["command", "Command"], ["messages", "Messages"]].filter(([id]) => access.can(areaFor(id)));
  return <><nav className="cv7MobileNav">{items.map(([id, label]) => <button type="button" key={id} className={areaFor(page) === areaFor(id) ? "active" : ""} onClick={() => go(id)}>{label}</button>)}<button type="button" onClick={() => setMore(true)}>More</button></nav>{more ? <div className="cv7MobileMore" role="dialog" aria-modal="true"><section><header><h2>Churvox</h2><button type="button" onClick={() => setMore(false)}>Close</button></header>{AREAS.filter((item) => access.can(item.id)).map((item) => <button type="button" key={item.id} onClick={() => { setMore(false); go(item.page); }}>{item.label}</button>)}<button type="button" onClick={() => { setMore(false); go("settings"); }}>Settings</button><button type="button" onClick={() => { setMore(false); go("plans"); }}>Plans</button><button type="button" onClick={() => { setMore(false); go("support"); }}>Help</button></section></div> : null}</>;
}

export default function ProductAppV7() {
  const { user, logout } = useAuth();
  const access = React.useMemo(() => createAccess(user), [user]);
  const { api, data, loading, refresh } = useControlBoardData(Boolean(user));
  const [page, go] = useRoute(access);
  const [record, setRecord] = React.useState(null);
  const [notice, setNotice] = React.useState(null);
  const [overlay, setOverlay] = React.useState("");
  const [lastVisit] = React.useState(() => { const value = window.localStorage.getItem("churvox:last-owner-visit"); const date = value ? new Date(value) : null; return date && !Number.isNaN(date.getTime()) ? date : null; });

  React.useEffect(() => {
    const stamp = () => window.localStorage.setItem("churvox:last-owner-visit", new Date().toISOString());
    window.addEventListener("beforeunload", stamp);
    return () => { stamp(); window.removeEventListener("beforeunload", stamp); };
  }, []);

  const notifications = React.useMemo(() => [
    ...data.command.filter((item) => !/approved|complete|done|park/i.test(item.status)),
    ...data.jobs.filter((item) => item.issue || /needs check|late|unassigned/i.test(`${item.status} ${item.worker}`)),
    ...data.invoices.filter((item) => /overdue/i.test(item.status)),
    ...data.messages.filter((item) => /urgent|high/i.test(item.priority)),
  ].slice(0, 20), [data]);

  let content;
  if (loading) content = <div className="cv7Loading"><span /><b>Loading the Control Board</b><small>Connecting live work, people and money.</small></div>;
  else if (page === "today") content = <TodayPage data={data} go={go} open={setRecord} create={(type) => setRecord(blankRecord(type, data))} lastVisit={lastVisit} />;
  else if (["jobs", "schedule", "recurring"].includes(page)) content = <WorkPage page={page} data={data} open={setRecord} create={(type) => setRecord(blankRecord(type, data))} />;
  else if (page === "clients") content = <ClientsPage data={data} open={setRecord} create={(type) => setRecord(blankRecord(type, data))} api={api} refresh={refresh} notify={setNotice} />;
  else if (["money", "quotes", "invoices", "accounting"].includes(page)) content = <MoneyPage page={page} data={data} open={setRecord} create={(type) => setRecord(blankRecord(type, data))} access={access} />;
  else if (["crew", "field", "timesheets", "access"].includes(page)) content = <TeamPage page={page} data={data} open={setRecord} create={(type) => setRecord(blankRecord(type, data))} />;
  else if (page === "messages") content = <MessagesPage data={data} open={setRecord} create={(type) => setRecord(blankRecord(type, data))} />;
  else if (["command", "parked", "completed"].includes(page)) content = <CommandPage page={page} data={data} open={setRecord} />;
  else if (page === "settings") content = <SettingsPage user={user} api={api} notify={setNotice} />;
  else if (page === "plans") content = <PlansPage access={access} />;
  else content = <SupportPage />;

  return <main className={`cv7Product page-${page}`} data-version="CHURVOX_CONTROL_BOARD_V7_20260725">
    <Header page={page} go={go} access={access} user={user} logout={logout} create={() => setOverlay("create")} search={() => setOverlay("search")} notifications={() => setOverlay("notifications")} notificationCount={notifications.length} />
    <div className="cv7Workspace">{content}</div>
    <MobileNav page={page} go={go} access={access} />
    {overlay === "search" ? <SearchOverlay data={data} close={() => setOverlay("")} open={setRecord} go={go} /> : null}
    {overlay === "create" ? <CreateOverlay data={data} access={access} close={() => setOverlay("")} open={setRecord} /> : null}
    {overlay === "notifications" ? <NotificationPanel notifications={notifications} close={() => setOverlay("")} open={setRecord} go={go} /> : null}
    <ControlBoardEditor record={record} data={data} api={api} refresh={refresh} close={() => setRecord(null)} notify={setNotice} />
    <Toast notice={notice} clear={() => setNotice(null)} />
  </main>;
}
