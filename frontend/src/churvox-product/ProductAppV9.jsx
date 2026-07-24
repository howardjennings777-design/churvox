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
import "./productAppV9.css";

const AREAS = [
  { id: "today", label: "Today", page: "today", mark: "T" },
  { id: "work", label: "Work", page: "jobs", mark: "W" },
  { id: "clients", label: "Clients", page: "clients", mark: "C" },
  { id: "money", label: "Money", page: "money", mark: "$" },
  { id: "team", label: "Team", page: "crew", mark: "P" },
  { id: "messages", label: "Messages", page: "messages", mark: "M" },
  { id: "command", label: "Command", page: "command", mark: "!" },
];

const AREA_PAGES = {
  today: ["today"],
  work: ["jobs", "schedule", "recurring"],
  clients: ["clients"],
  money: ["money", "quotes", "invoices", "accounting"],
  team: ["crew", "field", "timesheets", "access"],
  messages: ["messages"],
  command: ["command", "parked", "completed"],
};

const SUBTABS = {
  work: [["jobs", "Board"], ["schedule", "Schedule"], ["recurring", "Recurring"]],
  money: [["money", "Overview"], ["quotes", "Quotes"], ["invoices", "Invoices"], ["accounting", "Accounting"]],
  team: [["crew", "Crew"], ["field", "Field"], ["timesheets", "Timesheets"], ["access", "Access"]],
  command: [["command", "Waiting"], ["parked", "Parked"], ["completed", "Completed"]],
};

const ROUTE_ALIASES = {
  dashboard: "today", smarthub: "today", work: "jobs", job: "jobs", calendar: "schedule",
  workers: "crew", worker: "crew", team: "crew", payroll: "timesheets", xero: "accounting",
  help: "support", guide: "support", setup: "support",
};

function routeFromLocation() {
  if (typeof window === "undefined") return "today";
  const path = clean((window.location.pathname || "").split("/")[1]).toLowerCase();
  const hash = clean((window.location.hash || "").replace(/^#/, "").split("?")[0]).toLowerCase();
  return ROUTE_ALIASES[hash] || hash || ROUTE_ALIASES[path] || path || "today";
}

function areaFor(page) {
  return Object.entries(AREA_PAGES).find(([, pages]) => pages.includes(page))?.[0]
    || (["settings", "plans", "support"].includes(page) ? "utility" : "today");
}

function useRoute(access) {
  const [page, setPage] = React.useState(routeFromLocation);
  React.useEffect(() => {
    const sync = () => setPage(routeFromLocation());
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
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
  return !Number.isNaN(date.getTime())
    && date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
}

function dateLabel(value, options = {}) {
  if (!value) return "Date needed";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-NZ", { weekday: "short", day: "numeric", month: "short", ...options });
}

function toneFor(value) {
  const raw = clean(value).toLowerCase();
  if (/complete|paid|accepted|connected|active|approved|ready/.test(raw)) return "good";
  if (/issue|check|late|overdue|urgent|blocked|unassigned|failed/.test(raw)) return "bad";
  if (/progress|acknowledged|sent|viewed|working|travel|due/.test(raw)) return "live";
  return "quiet";
}

function Button({ children, className = "", ...props }) {
  return <button type="button" className={`cv9Button ${className}`} {...props}>{children}</button>;
}

function Status({ children, tone }) {
  return <span className={`cv9Status ${tone || toneFor(children)}`}><i />{children}</span>;
}

function Empty({ title, text, action, onAction }) {
  return <div className="cv9Empty"><span aria-hidden="true" /><div><b>{title}</b><p>{text}</p>{action ? <Button onClick={onAction}>{action}</Button> : null}</div></div>;
}

function CountPill({ children, tone = "" }) {
  return <span className={`cv9Count ${tone}`}>{children}</span>;
}

function PageHeading({ eyebrow, title, text, actions }) {
  return <header className="cv9PageHeading"><div><small>{eyebrow}</small><h1>{title}</h1>{text ? <p>{text}</p> : null}</div>{actions ? <div className="cv9HeadingActions">{actions}</div> : null}</header>;
}

function Metric({ label, value, note, onClick, tone = "" }) {
  const Tag = onClick ? "button" : "div";
  return <Tag type={onClick ? "button" : undefined} className={`cv9Metric ${tone}`} onClick={onClick}><span>{label}</span><b>{value}</b><small>{note}</small></Tag>;
}

function RecordLine({ item, title, meta, value, onClick, action = "Open" }) {
  return <button type="button" className="cv9RecordLine" onClick={onClick}><span className={`cv9RecordMark ${toneFor(item?.status || item?.priority || item?.issue)}`} /><div><b>{title}</b><small>{meta}</small></div>{value ? <strong>{value}</strong> : <em>{action}</em>}</button>;
}

function Rail({ page, go, access, user, logout, notifications }) {
  const area = areaFor(page);
  const [open, setOpen] = React.useState(false);
  const business = user?.business_name || user?.company_name || user?.name || "Churvox";
  const initials = clean(business).split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "CV";
  return <aside className="cv9Rail">
    <button type="button" className="cv9Brand" onClick={() => go("today")}><span>CV</span><div><b>Churvox</b><small>Business control</small></div></button>
    <nav className="cv9RailNav" aria-label="Main navigation">
      {AREAS.filter((item) => access.can(item.id)).map((item) => <button type="button" key={item.id} className={area === item.id ? "active" : ""} onClick={() => go(item.page)}><span>{item.mark}</span><b>{item.label}</b>{item.id === "command" && notifications ? <em>{notifications}</em> : null}</button>)}
    </nav>
    <div className="cv9RailBottom">
      {access.can("settings") ? <button type="button" className={page === "settings" ? "active" : ""} onClick={() => go("settings")}><span>⚙</span><b>Settings</b></button> : null}
      <button type="button" className={page === "plans" ? "active" : ""} onClick={() => go("plans")}><span>▣</span><b>Plans</b></button>
      <button type="button" className={page === "support" ? "active" : ""} onClick={() => go("support")}><span>?</span><b>Help</b></button>
      <div className="cv9AccountWrap">
        <button type="button" className="cv9Account" onClick={() => setOpen((value) => !value)}><span>{initials}</span><div><b>{business}</b><small>{access.planName} plan</small></div></button>
        {open ? <div className="cv9AccountMenu"><b>{user?.email || "Owner account"}</b><button type="button" onClick={() => { setOpen(false); go("settings"); }}>Business settings</button><button type="button" onClick={() => { setOpen(false); go("plans"); }}>Plans and billing</button><button type="button" onClick={async () => { setOpen(false); await logout(); window.location.assign("/login"); }}>Log out</button></div> : null}
      </div>
    </div>
  </aside>;
}

function TopBar({ page, go, search, create, updates, notificationCount }) {
  const area = areaFor(page);
  const title = AREAS.find((item) => item.id === area)?.label || (page === "settings" ? "Settings" : page === "plans" ? "Plans" : "Help");
  const tabs = SUBTABS[area] || [];
  return <header className="cv9TopBar">
    <div className="cv9TopTitle"><small>{new Date().toLocaleDateString("en-NZ", { weekday: "long", day: "numeric", month: "long" })}</small><b>{title}</b></div>
    {tabs.length ? <nav className="cv9TopTabs" aria-label={`${title} views`}>{tabs.map(([id, label]) => <button type="button" key={id} className={page === id ? "active" : ""} onClick={() => go(id)}>{label}</button>)}</nav> : <div className="cv9TopSpacer" />}
    <div className="cv9TopActions"><button type="button" onClick={search} aria-label="Search Churvox">⌕<span>Search</span></button><button type="button" onClick={updates} aria-label="Open updates">●<span>Updates</span>{notificationCount ? <em>{notificationCount}</em> : null}</button><Button className="primary" onClick={create}>+ Create</Button></div>
  </header>;
}

function TodayPage({ data, go, open, create, lastVisit }) {
  const activeWorkers = data.workers.filter((item) => !/offline|not clocked|inactive|not invited/i.test(item.status));
  const overdue = data.invoices.filter((item) => /overdue/i.test(item.status));
  const todayJobs = data.jobs.filter((item) => isToday(item.date));
  const run = (todayJobs.length ? todayJobs : data.jobs).slice().sort((a, b) => `${a.date || "9999"} ${a.time || "99"}`.localeCompare(`${b.date || "9999"} ${b.time || "99"}`)).slice(0, 10);
  const jobIssues = data.jobs.filter((item) => item.issue || /needs check|late|unassigned/i.test(`${item.status} ${item.worker}`));
  const urgentMessages = data.messages.filter((item) => /urgent|high/i.test(item.priority));
  const attention = [...data.command, ...jobIssues, ...overdue, ...urgentMessages];
  const outstanding = data.invoices.filter((item) => !/paid/i.test(item.status)).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const changes = [...data.jobs, ...data.quotes, ...data.invoices, ...data.messages, ...data.workers].filter((item) => { const date = recordDate(item); return date && lastVisit && date > lastVisit; }).sort((a, b) => (recordDate(b)?.getTime() || 0) - (recordDate(a)?.getTime() || 0));

  return <section className="cv9Page cv9Today">
    <PageHeading eyebrow="Owner control room" title={attention.length ? `${attention.length} things need a decision` : "The business is moving"} text="See the day, the crew, the money and the exceptions without opening five different pages." actions={<><Button onClick={() => go("schedule")}>Open schedule</Button><Button className="primary" onClick={() => create("job")}>Add job</Button></>} />
    <div className="cv9PulseStrip"><Metric label="Work today" value={todayJobs.length || data.jobs.length} note="Booked work" onClick={() => go("jobs")} /><Metric label="Crew active" value={activeWorkers.length} note={`${data.workers.length} connected`} onClick={() => go("field")} /><Metric label="Needs owner" value={attention.length} note="Clear next moves" tone={attention.length ? "warn" : ""} onClick={() => go("command")} /><Metric label="Outstanding" value={money(outstanding)} note={`${overdue.length} overdue`} tone={overdue.length ? "warn" : ""} onClick={() => go("money")} /></div>
    <div className="cv9TodayGrid">
      <article className="cv9Panel cv9RunPanel"><header><div><small>Today’s run</small><h2>{todayJobs.length ? "What is happening now" : "Next work on the board"}</h2></div><Button onClick={() => go("jobs")}>See all work</Button></header>{run.length ? <div className="cv9RunList">{run.map((job) => <button type="button" key={job.id} onClick={() => open(job)}><time><b>{job.time || "Any"}</b><small>{dateLabel(job.date)}</small></time><span className={`cv9RunTrack ${toneFor(job.status)}`}><i /></span><div><b>{job.title}</b><small>{job.client} · {job.worker}</small></div><Status>{job.status}</Status><strong>{money(job.price)}</strong></button>)}</div> : <Empty title="No work booked" text="Add the first real job and the day will organise itself around it." action="Create job" onAction={() => create("job")} />}</article>
      <article className="cv9Panel cv9NeedsPanel"><header><div><small>Needs you</small><h2>{attention.length ? "Only the exceptions" : "Nothing urgent"}</h2></div><CountPill tone={attention.length ? "warn" : ""}>{attention.length}</CountPill></header>{attention.length ? attention.slice(0, 7).map((item) => <RecordLine key={`${item.type}-${item.id}`} item={item} title={titleOf(item)} meta={item.reason || item.issue || item.status || item.priority || "Owner check"} value={item.amount ? money(item.amount) : "Review"} onClick={() => open(item)} />) : <Empty title="The owner queue is clear" text="Churvox will bring only genuine decisions here." />}</article>
      <article className="cv9Panel cv9CrewPanel"><header><div><small>Live crew</small><h2>Where people are now</h2></div><Button onClick={() => go("field")}>Open field</Button></header>{data.workers.length ? <div className="cv9CrewList">{data.workers.slice(0, 7).map((worker) => <button type="button" key={worker.id} onClick={() => open(worker)}><span>{worker.name.slice(0, 2).toUpperCase()}</span><div><b>{worker.name}</b><small>{worker.job}</small></div><Status>{worker.status}</Status></button>)}</div> : <Empty title="No crew connected" text="Invite workers to see field activity here." action="Add worker" onAction={() => create("worker")} />}</article>
      <article className="cv9Panel cv9MoneyPanel"><header><div><small>Money moving</small><h2>What is stuck</h2></div><Button onClick={() => go("money")}>Open Money</Button></header><div className="cv9MoneyMini"><span><small>Quotes waiting</small><b>{data.quotes.filter((item) => !/accepted|converted|declined/i.test(item.status)).length}</b></span><span><small>Invoices ready</small><b>{data.invoices.filter((item) => /draft|ready|due/i.test(item.status)).length}</b></span><span><small>Overdue</small><b>{money(overdue.reduce((sum, item) => sum + Number(item.amount || 0), 0))}</b></span></div></article>
      <article className="cv9Panel cv9MessagesPanel"><header><div><small>Messages</small><h2>Waiting for a reply</h2></div><Button onClick={() => go("messages")}>Open inbox</Button></header>{data.messages.length ? data.messages.slice(0, 5).map((message) => <RecordLine key={message.id} item={message} title={message.subject} meta={`${message.from} · ${message.client || message.job || message.channel}`} value={/urgent|high/i.test(message.priority) ? message.priority : "Open"} onClick={() => open(message)} />) : <Empty title="No messages waiting" text="Worker updates and client replies will appear here." />}</article>
      <article className="cv9Panel cv9ChangesPanel"><header><div><small>Since last visit</small><h2>{lastVisit ? "What changed" : "Live changes"}</h2></div></header>{changes.length ? changes.slice(0, 5).map((item) => <RecordLine key={`${item.type}-${item.id}`} item={item} title={titleOf(item)} meta={`${item.type} · ${item.status || item.client || item.from || "updated"}`} onClick={() => open(item)} />) : <Empty title={lastVisit ? "No recorded changes" : "Nothing recorded yet"} text="Payments, replies, field updates and owner decisions will collect here." />}</article>
    </div>
  </section>;
}

const BOARD_STAGES = [
  ["assigned", "Assigned", /assigned|ready/i],
  ["acknowledged", "Acknowledged", /acknowledged/i],
  ["in_progress", "In progress", /progress|working|active/i],
  ["attention", "Needs attention", /check|late|issue|blocked/i],
  ["completed", "Completed", /complete|done/i],
];

function WorkBoard({ jobs, open }) {
  return <div className="cv9Board">{BOARD_STAGES.map(([id, label, match]) => { const rows = jobs.filter((job) => id === "attention" ? job.issue || match.test(job.status) : match.test(job.status)); return <article key={id}><header><b>{label}</b><span>{rows.length}</span></header><div>{rows.length ? rows.map((job) => <button type="button" key={job.id} onClick={() => open(job)}><small>{dateLabel(job.date)} · {job.time || "Any time"}</small><b>{job.title}</b><span>{job.client}</span><span>{job.worker}</span><footer><Status>{job.status}</Status><strong>{money(job.price)}</strong></footer></button>) : <p>No work here</p>}</div></article>; })}</div>;
}

function WeekSchedule({ data, open }) {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 7 }, (_, index) => { const day = new Date(monday); day.setDate(monday.getDate() + index); return day; });
  const key = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return <div className="cv9Schedule"><aside><b>Worker</b>{data.workers.map((worker) => <span key={worker.id}>{worker.name}</span>)}<span>Unassigned</span></aside><div className="cv9ScheduleGrid"><header>{days.map((day) => <div key={key(day)}><small>{day.toLocaleDateString("en-NZ", { weekday: "short" })}</small><b>{day.getDate()}</b></div>)}</header>{[...data.workers, { id: "unassigned", name: "Unassigned" }].map((worker) => <div className="cv9ScheduleRow" key={worker.id}>{days.map((day) => { const jobs = data.jobs.filter((job) => { const jobDate = new Date(job.date); return !Number.isNaN(jobDate.getTime()) && key(jobDate) === key(day) && (worker.id === "unassigned" ? /unassigned/i.test(job.worker) : job.worker === worker.name); }); return <section key={key(day)}>{jobs.map((job) => <button type="button" key={job.id} onClick={() => open(job)}><time>{job.time || "Any"}</time><b>{job.title}</b><small>{job.client}</small></button>)}{!jobs.length ? <button type="button" className="cv9ScheduleAdd" onClick={() => open({ ...blankRecord("job", data), date: key(day), worker: worker.name })}>+</button> : null}</section>; })}</div>)}</div></div>;
}

function WorkPage({ page, data, open, create }) {
  const [view, setView] = React.useState("board");
  const [filter, setFilter] = React.useState("all");
  const jobs = data.jobs.filter((job) => {
    if (filter === "today") return isToday(job.date);
    if (filter === "unassigned") return /unassigned/i.test(job.worker);
    if (filter === "attention") return job.issue || /check|late/i.test(job.status);
    if (filter === "completed") return /complete/i.test(job.status);
    return true;
  });
  const recurring = data.jobs.filter((job) => job.recurring && job.recurring !== "One-off");

  if (page === "schedule") return <section className="cv9Page"><PageHeading eyebrow="Work · Schedule" title="Plan the week without losing the day" text="Workers, unassigned jobs and open spaces are visible in one planning surface." actions={<><Button onClick={() => window.print()}>Print run sheet</Button><Button className="primary" onClick={() => create("job")}>Add booking</Button></>} /><WeekSchedule data={data} open={open} /></section>;
  if (page === "recurring") return <section className="cv9Page"><PageHeading eyebrow="Work · Recurring" title="Repeat work stays predictable" text="Pause, resume and inspect recurring work without hiding it in another product area." actions={<Button className="primary" onClick={() => open({ ...blankRecord("job", data), recurring: "Weekly" })}>Add recurring job</Button>} /><div className="cv9DenseTable recurring"><div className="head"><span>Job</span><span>Client</span><span>Frequency</span><span>Next visit</span><span>Worker</span><span>Status</span></div>{recurring.length ? recurring.map((job) => <button type="button" key={job.id} onClick={() => open(job)}><span><b>{job.title}</b><small>{job.service}</small></span><span>{job.client}</span><span>{job.recurring}</span><span>{dateLabel(job.date)}</span><span>{job.worker}</span><Status>{job.status}</Status></button>) : <Empty title="No recurring work" text="Weekly, fortnightly, monthly and custom work will stay visible here." action="Add recurring job" onAction={() => open({ ...blankRecord("job", data), recurring: "Weekly" })} />}</div></section>;

  return <section className="cv9Page"><PageHeading eyebrow="Work" title="Every job, from booked to finished" text="Switch between a visual board and an office-ready list without leaving Work." actions={<><Button onClick={() => downloadCsv("churvox-jobs.csv", data.jobs, [["Job", "title"], ["Client", "client"], ["Worker", "worker"], ["Date", "date"], ["Time", "time"], ["Price", "price"], ["Status", "status"]])}>Export</Button><Button className="primary" onClick={() => create("job")}>Add job</Button></>} /><div className="cv9WorkControls"><div className="cv9Segmented"><button type="button" className={view === "board" ? "active" : ""} onClick={() => setView("board")}>Board</button><button type="button" className={view === "list" ? "active" : ""} onClick={() => setView("list")}>List</button></div><div className="cv9Filters">{[["all", "All"], ["today", "Today"], ["unassigned", "Unassigned"], ["attention", "Needs attention"], ["completed", "Completed"]].map(([id, label]) => <button type="button" key={id} className={filter === id ? "active" : ""} onClick={() => setFilter(id)}>{label}</button>)}</div></div>{view === "board" ? <WorkBoard jobs={jobs} open={open} /> : <div className="cv9DenseTable jobs"><div className="head"><span>When</span><span>Job and client</span><span>Worker</span><span>Status</span><span>Value</span></div>{jobs.length ? jobs.map((job) => <button type="button" key={job.id} onClick={() => open(job)}><span><b>{job.time || "Any time"}</b><small>{dateLabel(job.date)}</small></span><span><b>{job.title}</b><small>{job.client} · {job.address || "No address"}</small></span><span>{job.worker}</span><Status>{job.status}</Status><strong>{money(job.price)}</strong></button>) : <Empty title="No jobs match this view" text="Change the filter or create a job." action="Add job" onAction={() => create("job")} />}</div>}</section>;
}

function MoneyFlow({ data, go }) {
  const stages = [
    ["Quote prepared", data.quotes.filter((item) => /draft|ready/i.test(item.status)).length, "quotes"],
    ["Sent", data.quotes.filter((item) => /sent|viewed/i.test(item.status)).length, "quotes"],
    ["Accepted", data.quotes.filter((item) => /accepted|converted/i.test(item.status)).length, "quotes"],
    ["Work complete", data.jobs.filter((item) => /complete/i.test(item.status)).length, "jobs"],
    ["Invoice draft", data.invoices.filter((item) => /draft|due/i.test(item.status)).length, "invoices"],
    ["Invoice sent", data.invoices.filter((item) => /sent|viewed|overdue/i.test(item.status)).length, "invoices"],
    ["Paid", data.invoices.filter((item) => /paid/i.test(item.status)).length, "invoices"],
  ];
  return <div className="cv9MoneyFlow">{stages.map(([label, count, target], index) => <React.Fragment key={label}><button type="button" onClick={() => go(target)}><small>{label}</small><b>{count}</b></button>{index < stages.length - 1 ? <span>→</span> : null}</React.Fragment>)}</div>;
}

function MoneyPage({ page, data, open, create, access, go }) {
  const outstanding = data.invoices.filter((item) => !/paid/i.test(item.status)).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const overdue = data.invoices.filter((item) => /overdue/i.test(item.status));
  const paid = data.invoices.filter((item) => /paid/i.test(item.status)).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const quoteValue = data.quotes.filter((item) => !/declined/i.test(item.status)).reduce((sum, item) => sum + Number(item.amount || 0), 0);

  if (page === "quotes") return <section className="cv9Page"><PageHeading eyebrow="Money · Quotes" title="Move every quote forward" text="Draft, sent, accepted and converted work stays in one visible pipeline." actions={<Button className="primary" onClick={() => create("quote")}>New quote</Button>} /><div className="cv9QuotePipeline">{["Draft", "Ready", "Sent", "Viewed", "Accepted", "Converted"].map((stage) => { const rows = data.quotes.filter((item) => clean(item.status).toLowerCase().includes(stage.toLowerCase())); return <article key={stage}><header><b>{stage}</b><span>{rows.length}</span></header><div>{rows.length ? rows.map((quote) => <button type="button" key={quote.id} onClick={() => open(quote)}><b>{quote.title}</b><small>{quote.client}</small><strong>{money(quote.amount)}</strong><em>{quote.next || "Open quote"}</em></button>) : <p>No quotes</p>}</div></article>; })}</div></section>;
  if (page === "invoices") return <section className="cv9Page"><PageHeading eyebrow="Money · Invoices" title="See what is drafted, due, overdue and paid" text="The next money action is visible before the record is opened." actions={<><Button onClick={() => downloadCsv("churvox-invoices.csv", data.invoices, [["Invoice", "number"], ["Client", "client"], ["Amount", "amount"], ["Due", "due"], ["Status", "status"], ["Sync", "sync"]])}>Export</Button><Button className="primary" onClick={() => create("invoice")}>New invoice</Button></>} /><div className="cv9DenseTable invoices"><div className="head"><span>Invoice</span><span>Client and job</span><span>Due</span><span>Status</span><span>Accounting</span><span>Amount</span></div>{data.invoices.length ? data.invoices.map((invoice) => <button type="button" key={invoice.id} onClick={() => open(invoice)}><b>{invoice.number}</b><span><b>{invoice.client}</b><small>{invoice.job || "No linked job"}</small></span><span>{invoice.due || "Not set"}</span><Status>{invoice.status}</Status><span>{invoice.sync}</span><strong>{money(invoice.amount)}</strong></button>) : <Empty title="No invoices" text="Create a draft from completed work when it is ready." action="New invoice" onAction={() => create("invoice")} />}</div></section>;
  if (page === "accounting") return <section className="cv9Page"><PageHeading eyebrow="Money · Accounting" title="Connection and guardrails together" text="Approved drafts move to accounting. Sending, filing and payment remain owner-controlled." actions={access.accounting ? <Button className="primary" onClick={() => window.location.assign(`${String(API_BASE || "").replace(/\/$/, "")}/api/xero/connect/start`)}>{data.xero.connected ? "Reconnect Xero" : "Connect Xero"}</Button> : null} />{access.accounting ? <div className="cv9Accounting"><article><small>Connection</small><h2>{data.xero.connected ? "Connected" : "Not connected"}</h2><p>{data.xero.tenant || "Connect accounting when the business is ready."}</p><Status>{data.xero.connected ? "Draft sync ready" : "Owner setup required"}</Status></article><article><small>Drafts ready</small><h2>{data.invoices.filter((item) => /draft/i.test(item.status)).length}</h2><p>Only owner-approved drafts move to accounting.</p></article><article><small>Safety</small><ul><li>No automatic sending</li><li>No tax filing</li><li>No bank payout files</li><li>Paid status waits for refresh</li></ul></article></div> : <Empty title="Accounting is not included" text="Command or the Accounting Sync Add-on unlocks guarded draft sync." />}</section>;

  const quoteActions = data.quotes.filter((item) => !/accepted|converted|declined/i.test(item.status)).slice(0, 6);
  const invoiceActions = data.invoices.filter((item) => !/paid|cancelled/i.test(item.status)).slice(0, 6);
  return <section className="cv9Page"><PageHeading eyebrow="Money" title="See the whole path from quote to paid" text="Money should feel like one connected flow—not separate quote and invoice rooms." actions={<><Button onClick={() => create("quote")}>New quote</Button><Button className="primary" onClick={() => create("invoice")}>New invoice</Button></>} /><MoneyFlow data={data} go={go} /><div className="cv9MoneySummary"><Metric label="Quote pipeline" value={money(quoteValue)} note={`${data.quotes.length} total quotes`} onClick={() => go("quotes")} /><Metric label="Outstanding" value={money(outstanding)} note={`${data.invoices.filter((item) => !/paid/i.test(item.status)).length} invoices`} onClick={() => go("invoices")} /><Metric label="Overdue" value={money(overdue.reduce((sum, item) => sum + Number(item.amount || 0), 0))} note={`${overdue.length} need action`} tone={overdue.length ? "warn" : ""} onClick={() => go("invoices")} /><Metric label="Paid" value={money(paid)} note="Recorded as paid" onClick={() => go("invoices")} /></div><div className="cv9MoneyColumns"><article className="cv9Panel"><header><div><small>Quotes needing movement</small><h2>Next sales actions</h2></div><Button onClick={() => go("quotes")}>Open quotes</Button></header>{quoteActions.length ? quoteActions.map((quote) => <RecordLine key={quote.id} item={quote} title={quote.title} meta={`${quote.client} · ${quote.status}`} value={money(quote.amount)} onClick={() => open(quote)} />) : <Empty title="No quotes waiting" text="Create a quote when a client asks for work." action="New quote" onAction={() => create("quote")} />}</article><article className="cv9Panel"><header><div><small>Invoices needing movement</small><h2>Next money actions</h2></div><Button onClick={() => go("invoices")}>Open invoices</Button></header>{invoiceActions.length ? invoiceActions.map((invoice) => <RecordLine key={invoice.id} item={invoice} title={invoice.number} meta={`${invoice.client} · ${invoice.status}`} value={money(invoice.amount)} onClick={() => open(invoice)} />) : <Empty title="No invoices waiting" text="Draft invoices will appear here before they are sent." action="New invoice" onAction={() => create("invoice")} />}</article></div></section>;
}

function ClientsPage({ data, open, create }) {
  const [query, setQuery] = React.useState("");
  const [selectedId, setSelectedId] = React.useState(data.clients[0]?.id || "");
  React.useEffect(() => { if (!selectedId && data.clients[0]) setSelectedId(data.clients[0].id); }, [data.clients, selectedId]);
  const rows = data.clients.filter((item) => `${item.name} ${item.email} ${item.phone} ${item.address}`.toLowerCase().includes(query.toLowerCase()));
  const selected = data.clients.find((item) => item.id === selectedId) || rows[0];
  const linked = selected ? [...data.jobs.filter((item) => item.client === selected.name), ...data.quotes.filter((item) => item.client === selected.name), ...data.invoices.filter((item) => item.client === selected.name), ...data.messages.filter((item) => item.client === selected.name)].sort((a, b) => (recordDate(b)?.getTime() || 0) - (recordDate(a)?.getTime() || 0)) : [];
  return <section className="cv9Page"><PageHeading eyebrow="Clients" title="One customer file, every connected record" text="Jobs, quotes, invoices and messages stay together instead of being scattered through the product." actions={<Button className="primary" onClick={() => create("client")}>Add client</Button>} /><div className="cv9SplitRoom"><aside><label><span>Search clients</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, phone, address…" /></label><div>{rows.length ? rows.map((client) => <button type="button" key={client.id} className={selected?.id === client.id ? "active" : ""} onClick={() => setSelectedId(client.id)}><b>{client.name}</b><small>{client.address || client.email || "No contact detail"}</small><span>{client.service || "No service"}</span></button>) : <Empty title="No clients found" text="Try another search or add a client." action="Add client" onAction={() => create("client")} />}</div></aside><main>{selected ? <><header><div><small>Client file</small><h2>{selected.name}</h2><p>{selected.address || "No site address"}</p></div><Button onClick={() => open(selected)}>Edit client</Button></header><div className="cv9Facts"><span><small>Phone</small><b>{selected.phone || "Not added"}</b></span><span><small>Email</small><b>{selected.email || "Not added"}</b></span><span><small>Service</small><b>{selected.service || "Not set"}</b></span><span><small>Saved price</small><b>{selected.price || "Open pricing"}</b></span><span><small>Schedule</small><b>{selected.schedule || "One-off"}</b></span><span><small>Access notes</small><b>{selected.notes || "No access notes"}</b></span></div><section className="cv9Activity"><header><small>Connected activity</small><h3>Work, quotes, invoices and messages</h3></header>{linked.length ? linked.map((item) => <RecordLine key={`${item.type}-${item.id}`} item={item} title={titleOf(item)} meta={`${item.type} · ${item.status || item.from || "record"}`} value={item.amount ? money(item.amount) : item.price ? money(item.price) : "Open"} onClick={() => open(item)} />) : <Empty title="No connected activity" text="This client’s records will collect here." />}</section></> : <Empty title="No client selected" text="Choose a client or add the first one." action="Add client" onAction={() => create("client")} />}</main></div></section>;
}

function TeamPage({ page, data, open, create }) {
  if (page === "timesheets") return <section className="cv9Page"><PageHeading eyebrow="Team · Timesheets" title="Review time before anything is exported" text="Recorded time, current work and approval status remain visible together." actions={<Button onClick={() => downloadCsv("churvox-timesheet-review.csv", data.workers, [["Worker", "name"], ["Timesheet", "timesheet"], ["Payroll status", "payroll"]])}>Export review</Button>} /><div className="cv9DenseTable"><div className="head"><span>Worker</span><span>Recorded time</span><span>Current job</span><span>Review status</span><span>Action</span></div>{data.workers.map((worker) => <button type="button" key={worker.id} onClick={() => open(worker)}><b>{worker.name}</b><span>{worker.timesheet || "No time recorded"}</span><span>{worker.job}</span><Status>{worker.payroll}</Status><em>Review</em></button>)}</div></section>;
  if (page === "access") return <section className="cv9Page"><PageHeading eyebrow="Team · Access" title="Give each person only what they need" text="Worker app, office access and payroll review stay separated." actions={<Button className="primary" onClick={() => create("worker")}>Invite person</Button>} /><div className="cv9DenseTable"><div className="head"><span>Person</span><span>Role</span><span>Access</span><span>Worker app</span><span>Status</span></div>{data.workers.map((worker) => <button type="button" key={worker.id} onClick={() => open(worker)}><b>{worker.name}</b><span>{worker.role}</span><span>{worker.access}</span><span>{worker.app}</span><Status>{worker.status}</Status></button>)}</div></section>;
  const groups = [["Working", /working|progress|active/i], ["Travelling", /travel/i], ["Finished", /finished|complete|done/i], ["Needs help", /help|issue|check|late/i], ["Offline", /offline|not clocked|inactive/i]];
  if (page === "field") return <section className="cv9Page"><PageHeading eyebrow="Team · Field" title="Know what is happening outside the office" text="Current job, location, proof and help signals are visible in one board." /><div className="cv9FieldBoard">{groups.map(([label, match]) => { const workers = data.workers.filter((item) => match.test(`${item.status} ${item.messages}`)); return <article key={label}><header><b>{label}</b><span>{workers.length}</span></header>{workers.length ? workers.map((worker) => <button type="button" key={worker.id} onClick={() => open(worker)}><span>{worker.name.slice(0, 2).toUpperCase()}</span><div><b>{worker.name}</b><small>{worker.job}</small></div><Status>{worker.status}</Status></button>) : <p>No workers</p>}</article>; })}</div></section>;
  return <section className="cv9Page"><PageHeading eyebrow="Team" title="People and live work in one view" text="See the crew, current job, access and proof without opening separate admin screens." actions={<Button className="primary" onClick={() => create("worker")}>Add worker</Button>} /><div className="cv9CrewCards">{data.workers.length ? data.workers.map((worker) => <button type="button" key={worker.id} onClick={() => open(worker)}><header><span>{worker.name.slice(0, 2).toUpperCase()}</span><div><b>{worker.name}</b><small>{worker.role}</small></div><Status>{worker.status}</Status></header><dl><div><dt>Current work</dt><dd>{worker.job}</dd></div><div><dt>Access</dt><dd>{worker.access}</dd></div><div><dt>Last proof</dt><dd>{worker.proof || "No proof yet"}</dd></div><div><dt>Timesheet</dt><dd>{worker.timesheet || "No time"}</dd></div></dl></button>) : <Empty title="No crew connected" text="Add workers and subcontractors to create the live field board." action="Add worker" onAction={() => create("worker")} />}</div></section>;
}

function MessagesPage({ data, open, create }) {
  const [selectedId, setSelectedId] = React.useState(data.messages[0]?.id || "");
  React.useEffect(() => { if (!selectedId && data.messages[0]) setSelectedId(data.messages[0].id); }, [data.messages, selectedId]);
  const selected = data.messages.find((item) => item.id === selectedId) || data.messages[0];
  return <section className="cv9Page"><PageHeading eyebrow="Messages" title="Conversation and connected work together" text="The client, job, priority and prepared reply stay visible in the same workspace." actions={<Button className="primary" onClick={() => create("message")}>New message note</Button>} /><div className="cv9MessageRoom"><aside>{data.messages.length ? data.messages.map((message) => <button type="button" key={message.id} className={selected?.id === message.id ? "active" : ""} onClick={() => setSelectedId(message.id)}><span className={toneFor(message.priority)} /><div><b>{message.subject}</b><small>{message.from} · {message.client || message.job || message.channel}</small></div><Status>{message.priority}</Status></button>) : <Empty title="No messages" text="Worker updates and client replies will collect here." action="Add note" onAction={() => create("message")} />}</aside><main>{selected ? <><header><div><small>{selected.channel}</small><h2>{selected.subject}</h2><p>From {selected.from}</p></div><Button onClick={() => open(selected)}>Open record</Button></header><article><small>Message</small><p>{selected.detail || "No message body was recorded."}</p></article><article className="prepared"><small>Prepared reply</small><p>{selected.draft || "No reply has been prepared yet."}</p><Button className="primary" onClick={() => open(selected)}>Review and edit</Button></article><div className="cv9MessageContext"><span><b>Client</b>{selected.client || "Not linked"}</span><span><b>Job</b>{selected.job || "Not linked"}</span><span><b>Priority</b>{selected.priority}</span></div></> : null}</main></div></section>;
}

function CommandPage({ page, data, open }) {
  const wanted = page === "parked" ? /park/i : page === "completed" ? /approved|complete|done/i : /waiting|ready|pending|review/i;
  const queue = data.command.filter((item) => wanted.test(item.status || (page === "command" ? "waiting" : "")));
  const [selectedId, setSelectedId] = React.useState(queue[0]?.id || "");
  React.useEffect(() => { if (!queue.some((item) => item.id === selectedId)) setSelectedId(queue[0]?.id || ""); }, [queue, selectedId]);
  const selected = queue.find((item) => item.id === selectedId) || queue[0];
  return <section className="cv9Page"><PageHeading eyebrow={`Command · ${page === "command" ? "Waiting" : page === "parked" ? "Parked" : "Completed"}`} title="Only decisions that need the owner" text="Churvox prepares the work, shows the evidence and explains exactly what approval will do." /><div className="cv9CommandRoom"><aside>{queue.length ? queue.map((item, index) => <button type="button" key={item.id} className={selected?.id === item.id ? "active" : ""} onClick={() => setSelectedId(item.id)}><span>{String(index + 1).padStart(2, "0")}</span><div><b>{item.approvalType}</b><small>{item.title}</small></div><Status>{item.status}</Status></button>) : <Empty title="Nothing in this queue" text="Only genuine owner decisions appear here." />}</aside><main>{selected ? <><header><small>Owner decision</small><h2>{selected.title}</h2><p>{selected.reason}</p></header><div className="cv9DecisionGrid"><span><small>What happened</small><b>{selected.reason}</b></span><span><small>Why it reached you</small><b>{selected.recommended || "Owner approval is required"}</b></span><span><small>What Churvox checked</small><b>{selected.evidence}</b></span><span><small>What Churvox prepared</small><b>{selected.prepared}</b></span></div><div className="cv9DecisionEffect"><small>Approval will</small><b>{selected.recommended || "Apply the prepared result to the connected record"}</b></div><Button className="primary" onClick={() => open(selected)}>Open decision</Button><footer>Nothing sends, charges, syncs, pays or changes until the owner approves it.</footer></> : <Empty title="No owner decision is waiting" text="Churvox will bring a decision here only when your judgement is required." />}</main></div></section>;
}

function SettingsPage({ user, api, notify }) {
  const [values, setValues] = React.useState({ business_name: user?.business_name || user?.company_name || "", gst_rate: user?.gst_rate || "15", public_email: user?.public_email || SUPPORT_EMAIL, worker_rule: user?.worker_rule || "simple", brand_tone: user?.brand_tone || "premium-simple" });
  const [busy, setBusy] = React.useState(false);
  const save = async () => { setBusy(true); try { await firstGood([() => api.patch("/business/settings", values), () => api.put("/business/settings", values), () => api.patch("/settings/business", values), () => api.post("/settings/business", values)]); notify({ tone: "good", title: "Settings saved", text: "Business controls are up to date." }); } catch (error) { notify({ tone: "bad", title: "Could not save settings", text: error?.message || "Try again." }); } finally { setBusy(false); } };
  return <section className="cv9Page"><PageHeading eyebrow="Settings" title="Business rules without a maze" text="Keep the controls that change how Churvox works in one clear place." actions={<Button className="primary" disabled={busy} onClick={save}>Save settings</Button>} /><div className="cv9Settings"><article><h2>Business profile</h2>{[["Business name", "business_name"], ["GST rate", "gst_rate"], ["Public email", "public_email"]].map(([label, key]) => <label key={key}><span>{label}</span><input value={values[key]} onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))} /></label>)}<label><span>Worker app detail</span><select value={values.worker_rule} onChange={(event) => setValues((current) => ({ ...current, worker_rule: event.target.value }))}><option value="simple">Simple worker app</option><option value="full">Full field detail</option></select></label><label><span>Brand style</span><select value={values.brand_tone} onChange={(event) => setValues((current) => ({ ...current, brand_tone: event.target.value }))}><option value="premium-simple">Premium simple</option><option value="industrial">Industrial</option><option value="clean">Clean</option></select></label></article><article><h2>Where rules live</h2><div className="cv9RuleList"><span><b>Work</b><small>One-off and recurring jobs, schedule and field proof</small></span><span><b>Money</b><small>Quotes, invoices, reminders and accounting handoff</small></span><span><b>Team</b><small>Roles, access, worker app and timesheet review</small></span><span><b>Command</b><small>Approval rules, parked work and completed decisions</small></span></div></article></div></section>;
}

function PlansPage({ access }) {
  return <section className="cv9Page"><PageHeading eyebrow="Plans and billing" title="See your current access first" text="The product stays honest about what is active before showing upgrade choices." actions={<Status tone="live">Current: {access.planName}</Status>} /><div className="cv9Plans">{PLANS.map((plan) => { const current = plan.code === access.planKey; return <article key={plan.name} className={`${plan.popular ? "popular" : ""} ${current ? "current" : ""}`} data-plan-card={!current ? true : undefined} data-stripe-plan={!current ? plan.name : undefined}><header><small>{current ? "Current plan" : plan.popular ? "Most popular" : "Monthly"}</small><h2>{plan.name}</h2><strong>${plan.price}<span>/month + GST</span></strong></header><p>{plan.note}</p><ul>{plan.items.map((item) => <li key={item}>{item}</li>)}</ul>{current ? <button type="button" disabled>Current plan</button> : <button type="button" data-stripe-live-plan={plan.name} data-stripe-live-action="start_trial">Start {plan.name} trial</button>}</article>; })}</div><div className="cv9Addons">{ADDONS.map((addon) => <article key={addon.name} data-plan-card data-stripe-plan={addon.stripe}><div><h3>{addon.name}</h3><p>{addon.note}</p></div><strong>${addon.price}<small>/month + GST</small></strong><button type="button" data-stripe-live-plan={addon.stripe} data-stripe-live-action="add_on">Add option</button></article>)}</div></section>;
}

function SupportPage() {
  return <section className="cv9Page"><PageHeading eyebrow="Help" title="Get help without leaving the business" text="Keep the answers practical and close to the real workflow." /><div className="cv9Help"><article><h2>Getting started</h2><p>Set up the business, add clients, connect workers and create the first real job.</p></article><article><h2>Running the day</h2><p>Use Today for exceptions, Work for movement and Command for owner decisions.</p></article><article><h2>Money</h2><p>Prepare quotes, convert accepted work, review draft invoices and record payment.</p></article><article><h2>Contact</h2><p>Email {SUPPORT_EMAIL} when something needs a person.</p></article></div></section>;
}

function SearchOverlay({ data, close, open, go }) {
  const [query, setQuery] = React.useState("");
  const results = buildSearchIndex(data).filter((item) => item.search.toLowerCase().includes(query.toLowerCase())).slice(0, 20);
  const route = (item) => item.type === "job" ? "jobs" : item.type === "client" ? "clients" : item.type === "worker" ? "crew" : item.type === "message" ? "messages" : "money";
  return <div className="cv9Overlay" role="dialog" aria-modal="true" aria-label="Search Churvox"><section className="cv9Search"><header><div><small>Global search</small><h2>Find anything in the business</h2></div><button type="button" onClick={close}>Close</button></header><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Client, job, worker, invoice…" />{query ? <div>{results.length ? results.map((item) => <button type="button" key={`${item.type}-${item.id}`} onClick={() => { close(); go(route(item)); window.setTimeout(() => open(item), 40); }}><span>{item.area}</span><div><b>{titleOf(item)}</b><small>{item.client || item.worker || item.status || item.email || "Open record"}</small></div><em>Open</em></button>) : <Empty title="Nothing found" text="Try a client, address, worker, invoice or job name." />}</div> : <Empty title="Search the live business" text="Results come from real connected records." />}</section></div>;
}

function CreateOverlay({ data, access, close, open }) {
  const items = [["job", "Job", "Book, assign and price work"], ["client", "Client", "Create a customer file"], ["quote", "Quote", "Prepare scope and price"], ["invoice", "Invoice", "Create an owner-reviewed draft"], ["worker", "Worker", "Invite crew or a subcontractor"], ["message", "Message note", "Attach communication to work"]].filter(([type]) => !["worker", "message"].includes(type) || access.can("team"));
  return <div className="cv9Overlay" role="dialog" aria-modal="true" aria-label="Create in Churvox"><section className="cv9CreateMenu"><header><div><small>Global create</small><h2>What are you adding?</h2></div><button type="button" onClick={close}>Close</button></header><div>{items.map(([type, label, text]) => <button type="button" key={type} onClick={() => { close(); open(blankRecord(type, data)); }}><span>+</span><div><b>{label}</b><small>{text}</small></div><em>Create</em></button>)}</div></section></div>;
}

function NotificationPanel({ notifications, close, open }) {
  return <div className="cv9PanelLayer" onClick={close}><aside className="cv9Notifications" onClick={(event) => event.stopPropagation()}><header><div><small>Meaningful updates</small><h2>{notifications.length ? `${notifications.length} need awareness` : "You are caught up"}</h2></div><button type="button" onClick={close}>Close</button></header><div>{notifications.length ? notifications.map((item) => <RecordLine key={`${item.type}-${item.id}`} item={item} title={titleOf(item)} meta={item.reason || item.issue || item.status || item.priority} value="Open" onClick={() => { close(); window.setTimeout(() => open(item), 40); }} />) : <Empty title="No meaningful updates" text="Payments, replies, late work and owner decisions will appear here." />}</div><footer>Updates show what changed. Command holds decisions that require approval.</footer></aside></div>;
}

function Toast({ notice, clear }) {
  if (!notice) return null;
  return <div className={`cv9Toast ${notice.tone || ""}`}><b>{notice.title}</b><span>{notice.text}</span><button type="button" onClick={clear}>Close</button></div>;
}

function MobileNav({ page, go, access, logout }) {
  const [more, setMore] = React.useState(false);
  const items = [["today", "Today"], ["jobs", "Work"], ["command", "Command"], ["messages", "Messages"]].filter(([id]) => access.can(areaFor(id)));
  return <><nav className="cv9MobileNav">{items.map(([id, label]) => <button type="button" key={id} className={areaFor(page) === areaFor(id) ? "active" : ""} onClick={() => go(id)}>{label}</button>)}<button type="button" onClick={() => setMore(true)}>More</button></nav>{more ? <div className="cv9MobileMore" role="dialog" aria-modal="true"><section><header><h2>Churvox</h2><button type="button" onClick={() => setMore(false)}>Close</button></header>{AREAS.filter((item) => access.can(item.id)).map((item) => <button type="button" key={item.id} onClick={() => { setMore(false); go(item.page); }}>{item.label}</button>)}<button type="button" onClick={() => { setMore(false); go("settings"); }}>Settings</button><button type="button" onClick={() => { setMore(false); go("plans"); }}>Plans</button><button type="button" onClick={() => { setMore(false); go("support"); }}>Help</button><button type="button" className="logout" onClick={async () => { setMore(false); await logout(); window.location.assign("/login"); }}>Log out</button></section></div> : null}</>;
}

export default function ProductAppV9() {
  const { user, logout } = useAuth();
  const access = React.useMemo(() => createAccess(user), [user]);
  const { api, data, loading, failures, refresh } = useControlBoardData(Boolean(user));
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

  const create = (type) => setRecord(blankRecord(type, data));
  let content;
  if (loading) content = <div className="cv9Loading"><span /><b>Connecting the business</b><small>Loading work, people, money and owner decisions.</small></div>;
  else if (page === "today") content = <TodayPage data={data} go={go} open={setRecord} create={create} lastVisit={lastVisit} />;
  else if (["jobs", "schedule", "recurring"].includes(page)) content = <WorkPage page={page} data={data} open={setRecord} create={create} />;
  else if (page === "clients") content = <ClientsPage data={data} open={setRecord} create={create} />;
  else if (["money", "quotes", "invoices", "accounting"].includes(page)) content = <MoneyPage page={page} data={data} open={setRecord} create={create} access={access} go={go} />;
  else if (["crew", "field", "timesheets", "access"].includes(page)) content = <TeamPage page={page} data={data} open={setRecord} create={create} />;
  else if (page === "messages") content = <MessagesPage data={data} open={setRecord} create={create} />;
  else if (["command", "parked", "completed"].includes(page)) content = <CommandPage page={page} data={data} open={setRecord} />;
  else if (page === "settings") content = <SettingsPage user={user} api={api} notify={setNotice} />;
  else if (page === "plans") content = <PlansPage access={access} />;
  else content = <SupportPage />;

  return <main className={`cv7Product cv9Product cvOwnerReady page-${page}`} data-version="CHURVOX_CONTROL_ROOM_V9_20260725">
    <Rail page={page} go={go} access={access} user={user} logout={logout} notifications={notifications.length} />
    <section className="cv9Main">
      <TopBar page={page} go={go} search={() => setOverlay("search")} create={() => setOverlay("create")} updates={() => setOverlay("notifications")} notificationCount={notifications.length} />
      {failures?.length ? <div className="cv9SourceWarning"><div><b>Some live sources did not refresh</b><span>{failures.map((item) => item.source).join(", ")}. Last reliable records remain visible.</span></div><Button onClick={refresh}>Retry</Button></div> : null}
      <div className="cv9Workspace">{content}</div>
    </section>
    <MobileNav page={page} go={go} access={access} logout={logout} />
    {overlay === "search" ? <SearchOverlay data={data} close={() => setOverlay("")} open={setRecord} go={go} /> : null}
    {overlay === "create" ? <CreateOverlay data={data} access={access} close={() => setOverlay("")} open={setRecord} /> : null}
    {overlay === "notifications" ? <NotificationPanel notifications={notifications} close={() => setOverlay("")} open={setRecord} /> : null}
    <ControlBoardEditor record={record} data={data} api={api} refresh={refresh} close={() => setRecord(null)} notify={setNotice} />
    <Toast notice={notice} clear={() => setNotice(null)} />
  </main>;
}
