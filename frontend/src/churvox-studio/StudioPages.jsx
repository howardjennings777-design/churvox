import React from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Download,
  ExternalLink,
  FileText,
  Gauge,
  Mail,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Repeat2,
  Send,
  ShieldCheck,
  Sparkles,
  Upload,
  UserRound,
  Users,
  WalletCards,
  Wrench,
} from "lucide-react";
import API_BASE from "../lib/apiBase";
import {
  ADDONS,
  PLANS,
  SUPPORT_EMAIL,
  clean,
  downloadCsv,
  firstGood,
  money,
  recordDate,
  titleOf,
} from "../churvox-product/controlBoardData";
import { blankRecord, dateLabel, initials, timeLabel, toneFor } from "./studioModel";

export function StatusPill({ value, tone }) {
  return <span className={`cvsStatus ${tone || toneFor(value)}`}><i />{value || "Ready"}</span>;
}

export function EmptyState({ title, text, action, onAction }) {
  return (
    <div className="cvsEmpty">
      <span><Sparkles size={19} /></span>
      <div><b>{title}</b><p>{text}</p>{action ? <button type="button" onClick={onAction}>{action}<ArrowRight size={15} /></button> : null}</div>
    </div>
  );
}

function PageLead({ eyebrow, title, copy, actions }) {
  return (
    <header className="cvsPageLead">
      <div><span className="cvsEyebrow">{eyebrow}</span><h1>{title}</h1>{copy ? <p>{copy}</p> : null}</div>
      {actions ? <div className="cvsPageActions">{actions}</div> : null}
    </header>
  );
}

function StudioButton({ children, icon: Icon = ArrowRight, tone = "", onClick, disabled }) {
  return <button type="button" className={`cvsButton ${tone}`} disabled={disabled} onClick={onClick}><Icon size={16} /><span>{children}</span></button>;
}

function RecordLine({ item, title, meta, value, open }) {
  return (
    <button type="button" className="cvsRecordLine" onClick={() => open(item)}>
      <span className={`cvsSignal ${toneFor(item.status || item.priority || item.issue)}`} />
      <div><b>{title || titleOf(item)}</b><small>{meta || item.status || item.client || "Open record"}</small></div>
      {value ? <strong>{value}</strong> : <ChevronRight size={17} />}
    </button>
  );
}

function countWhere(rows, matcher) {
  return rows.filter((item) => matcher.test(clean(item.status || item.worker || item.priority))).length;
}

function sameDay(value, date) {
  if (!value) return false;
  const left = new Date(value);
  return !Number.isNaN(left.getTime()) && left.getFullYear() === date.getFullYear() && left.getMonth() === date.getMonth() && left.getDate() === date.getDate();
}

function startOfWeek() {
  const now = new Date();
  const day = now.getDay() || 7;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() - day + 1);
  return monday;
}

function weekDays() {
  const monday = startOfWeek();
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return date;
  });
}

export function TodayStudio({ data, go, open, create, lastVisit }) {
  const today = new Date();
  const todayJobs = data.jobs.filter((job) => sameDay(job.date, today));
  const jobs = (todayJobs.length ? todayJobs : data.jobs).slice().sort((a, b) => `${a.date || "9999"} ${a.time || "99"}`.localeCompare(`${b.date || "9999"} ${b.time || "99"}`)).slice(0, 10);
  const activeCrew = data.workers.filter((worker) => !/offline|not clocked|inactive|not invited/i.test(worker.status));
  const ownerChecks = data.command.filter((item) => !/approved|complete|done|park/i.test(item.status));
  const overdue = data.invoices.filter((invoice) => /overdue/i.test(invoice.status));
  const jobIssues = data.jobs.filter((job) => job.issue || /check|late|unassigned/i.test(`${job.status} ${job.worker}`));
  const urgentMessages = data.messages.filter((message) => /urgent|high/i.test(message.priority));
  const attention = [...ownerChecks, ...jobIssues, ...overdue, ...urgentMessages].slice(0, 8);
  const outstanding = data.invoices.filter((invoice) => !/paid/i.test(invoice.status)).reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
  const changes = [...data.jobs, ...data.quotes, ...data.invoices, ...data.messages, ...data.workers]
    .filter((item) => { const date = recordDate(item); return date && lastVisit && date > lastVisit; })
    .sort((a, b) => (recordDate(b)?.getTime() || 0) - (recordDate(a)?.getTime() || 0))
    .slice(0, 6);

  return (
    <div className="cvsToday">
      <section className="cvsMorningStrip">
        <div>
          <span className="cvsEyebrow">{dateLabel(today, { long: true })}</span>
          <h1>{attention.length ? `${attention.length} moves need your judgement.` : "The business is moving cleanly."}</h1>
          <p>{attention.length ? "The exceptions are lined up in order. Everything else keeps moving underneath." : "Work, people and money are connected. Nothing urgent is hiding."}</p>
        </div>
        <div className="cvsMorningNumbers">
          <button type="button" onClick={() => go("jobs")}><small>On the run</small><b>{todayJobs.length || data.jobs.length}</b><span>jobs</span></button>
          <button type="button" onClick={() => go("field")}><small>Field live</small><b>{activeCrew.length}</b><span>people</span></button>
          <button type="button" onClick={() => go("command")} className={ownerChecks.length ? "hot" : ""}><small>Waiting</small><b>{ownerChecks.length}</b><span>decisions</span></button>
          <button type="button" onClick={() => go("invoices")} className={overdue.length ? "hot" : ""}><small>Outstanding</small><b>{money(outstanding)}</b><span>{overdue.length} overdue</span></button>
        </div>
      </section>

      <section className="cvsDayBoard">
        <div className="cvsRunway">
          <header><div><span className="cvsEyebrow">Runway</span><h2>{todayJobs.length ? "Today, in order" : "Next work, in order"}</h2></div><StudioButton icon={Plus} onClick={() => create("job")}>Add work</StudioButton></header>
          <div className="cvsRunwayRows">
            {jobs.length ? jobs.map((job, index) => (
              <button type="button" key={job.id} className="cvsRunwayRow" onClick={() => open(job)}>
                <span className="cvsRunIndex">{String(index + 1).padStart(2, "0")}</span>
                <time><b>{timeLabel(job.time)}</b><small>{dateLabel(job.date)}</small></time>
                <span className={`cvsRunTrack ${toneFor(job.status)}`}><i /></span>
                <div><b>{job.title}</b><small>{job.client} · {job.address || "Address needed"}</small></div>
                <span className="cvsRunWorker">{job.worker}</span>
                <StatusPill value={job.status} />
              </button>
            )) : <EmptyState title="Nothing is booked" text="Create the first real job and the day will organise around it." action="Create a job" onAction={() => create("job")} />}
          </div>
        </div>

        <aside className="cvsDecisionLane">
          <header><span className="cvsEyebrow">Needs you</span><h2>{attention.length ? "Clear the next move" : "No owner block"}</h2></header>
          <div>{attention.length ? attention.map((item, index) => (
            <button type="button" key={`${item.type}-${item.id}-${index}`} onClick={() => open(item)}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div><b>{titleOf(item)}</b><small>{item.reason || item.issue || item.status || item.priority || "Owner review"}</small></div>
              <ChevronRight size={17} />
            </button>
          )) : <EmptyState title="The lane is clear" text="Only genuine decisions and exceptions appear here." />}</div>
          <footer><button type="button" onClick={() => go("command")}>Open Command <ArrowRight size={15} /></button></footer>
        </aside>

        <aside className="cvsCrewRadar">
          <header><span className="cvsEyebrow">Crew radar</span><h2>Live outside</h2></header>
          <div className="cvsRadarCanvas">
            <span className="ring one" /><span className="ring two" /><span className="cross x" /><span className="cross y" />
            {activeCrew.slice(0, 6).map((worker, index) => (
              <button type="button" key={worker.id} style={{ "--x": `${18 + (index * 19) % 68}%`, "--y": `${20 + (index * 27) % 62}%` }} onClick={() => open(worker)}>
                <span>{initials(worker.name)}</span><em>{worker.name}</em>
              </button>
            ))}
            {!activeCrew.length ? <p>No one is active yet.</p> : null}
          </div>
          <div className="cvsCrewRadarList">
            {data.workers.slice(0, 5).map((worker) => <RecordLine key={worker.id} item={worker} title={worker.name} meta={`${worker.status} · ${worker.job}`} open={open} />)}
          </div>
        </aside>
      </section>

      <section className="cvsFlowBand">
        {[
          ["Quote", data.quotes.filter((item) => !/accepted|converted|declined/i.test(item.status)).length, "quotes"],
          ["Accepted", countWhere(data.quotes, /accepted|converted/i), "quotes"],
          ["Scheduled", data.jobs.filter((item) => item.date && !/complete/i.test(item.status)).length, "schedule"],
          ["Working", countWhere(data.jobs, /progress|acknowledged/i), "jobs"],
          ["Completed", countWhere(data.jobs, /complete/i), "jobs"],
          ["Invoiced", data.invoices.filter((item) => !/paid/i.test(item.status)).length, "invoices"],
          ["Paid", countWhere(data.invoices, /paid/i), "invoices"],
        ].map(([label, count, page], index, rows) => (
          <React.Fragment key={label}>
            <button type="button" onClick={() => go(page)}><small>{label}</small><b>{count}</b></button>
            {index < rows.length - 1 ? <span><ArrowRight size={15} /></span> : null}
          </React.Fragment>
        ))}
      </section>

      <section className="cvsTodayFoot">
        <article><header><span className="cvsEyebrow">Since last visit</span><h3>What changed</h3></header>{changes.length ? changes.map((item) => <RecordLine key={`${item.type}-${item.id}`} item={item} meta={`${item.type} · ${item.status || item.client || item.from || "updated"}`} open={open} />) : <EmptyState title={lastVisit ? "No recorded changes" : "First visit on this device"} text={lastVisit ? "Nothing with a reliable update time changed while you were away." : "Updates will collect here as the business moves."} />}</article>
        <article className="cvsMoneyTicker"><header><span className="cvsEyebrow">Money moving</span><h3>Live commercial pulse</h3></header><div><button type="button" onClick={() => go("quotes")}><FileText size={19} /><span><small>Quotes open</small><b>{money(data.quotes.reduce((sum, item) => sum + Number(item.amount || 0), 0))}</b></span></button><button type="button" onClick={() => go("invoices")}><WalletCards size={19} /><span><small>Invoices open</small><b>{money(outstanding)}</b></span></button><button type="button" onClick={() => go("invoices")}><CircleDollarSign size={19} /><span><small>Paid recorded</small><b>{money(data.invoices.filter((item) => /paid/i.test(item.status)).reduce((sum, item) => sum + Number(item.amount || 0), 0))}</b></span></button></div></article>
      </section>
    </div>
  );
}

export function WorkStudio({ page, data, open, create }) {
  const [filter, setFilter] = React.useState("all");
  const filtered = data.jobs.filter((job) => {
    if (filter === "today") return sameDay(job.date, new Date());
    if (filter === "unassigned") return /unassigned/i.test(job.worker);
    if (filter === "attention") return job.issue || /check|late/i.test(job.status);
    if (filter === "completed") return /complete/i.test(job.status);
    return true;
  });

  if (page === "schedule") {
    const days = weekDays();
    const workers = data.workers.length ? data.workers : [{ id: "unassigned", name: "Unassigned" }];
    return (
      <div className="cvsPage">
        <PageLead eyebrow="Work · Week" title="The week as a dispatch wall." copy="People run across rows. Days run across columns. Conflicts are visible before they become phone calls." actions={<StudioButton tone="primary" icon={Plus} onClick={() => create("job")}>Add booking</StudioButton>} />
        <section className="cvsWeekBoard">
          <div className="cvsWeekCorner"><span>Worker</span><small>Capacity</small></div>
          {days.map((day) => <header key={day.toISOString()} className={sameDay(day, new Date()) ? "today" : ""}><small>{day.toLocaleDateString("en-NZ", { weekday: "short" })}</small><b>{day.getDate()}</b></header>)}
          {workers.map((worker) => {
            const workerJobs = data.jobs.filter((job) => job.worker === worker.name || (worker.id === "unassigned" && /unassigned/i.test(job.worker)));
            return <React.Fragment key={worker.id}><aside><span>{initials(worker.name)}</span><div><b>{worker.name}</b><small>{workerJobs.length} booked</small></div></aside>{days.map((day) => { const cell = workerJobs.filter((job) => sameDay(job.date, day)); return <div key={`${worker.id}-${day.toISOString()}`} className="cvsWeekCell">{cell.map((job) => <button type="button" key={job.id} className={toneFor(job.status)} onClick={() => open(job)}><b>{timeLabel(job.time)}</b><span>{job.title}</span><small>{job.client}</small></button>)}</div>; })}</React.Fragment>;
          })}
        </section>
      </div>
    );
  }

  if (page === "recurring") {
    const recurring = data.jobs.filter((job) => job.recurring && job.recurring !== "One-off");
    const groups = ["Weekly", "Fortnightly", "Monthly", "Custom"];
    return (
      <div className="cvsPage">
        <PageLead eyebrow="Work · Repeat work" title="Recurring work should feel dependable, not hidden." copy="Each cadence has its own lane, next visit and owner-visible state." actions={<StudioButton tone="primary" icon={Repeat2} onClick={() => open({ ...blankRecord("job", data), recurring: "Weekly" })}>Add repeat work</StudioButton>} />
        <section className="cvsCadenceBoard">
          {groups.map((group) => { const rows = recurring.filter((job) => clean(job.recurring).toLowerCase().includes(group.toLowerCase())); return <article key={group}><header><div><small>Cadence</small><h2>{group}</h2></div><b>{rows.length}</b></header><div>{rows.length ? rows.map((job) => <button type="button" key={job.id} onClick={() => open(job)}><span className={`cvsSignal ${toneFor(job.status)}`} /><div><b>{job.title}</b><small>{job.client} · next {dateLabel(job.date)}</small></div><em>{job.worker}</em><ChevronRight size={17} /></button>) : <EmptyState title={`No ${group.toLowerCase()} work`} text="This lane will fill when recurring rules are created." />}</div></article>; })}
        </section>
      </div>
    );
  }

  const columns = [
    ["Unassigned", (job) => /unassigned/i.test(job.worker)],
    ["Ready", (job) => !/unassigned/i.test(job.worker) && /assigned|ready|acknowledged/i.test(job.status)],
    ["Moving", (job) => /progress|working|travel/i.test(job.status)],
    ["Done", (job) => /complete/i.test(job.status)],
  ];

  return (
    <div className="cvsPage">
      <PageLead eyebrow="Work · Dispatch" title="Run work from one wall." copy="Scan the whole operation, then open the exact job without leaving the board." actions={<><StudioButton icon={Download} onClick={() => downloadCsv("churvox-jobs.csv", data.jobs, [["Job", "title"], ["Client", "client"], ["Worker", "worker"], ["Date", "date"], ["Time", "time"], ["Price", "price"], ["Status", "status"]])}>Export</StudioButton><StudioButton tone="primary" icon={Plus} onClick={() => create("job")}>Add job</StudioButton></>} />
      <nav className="cvsFilterRail">{[["all", "All"], ["today", "Today"], ["unassigned", "Unassigned"], ["attention", "Needs attention"], ["completed", "Completed"]].map(([id, label]) => <button key={id} type="button" className={filter === id ? "active" : ""} onClick={() => setFilter(id)}>{label}<span>{id === "all" ? data.jobs.length : data.jobs.filter((job) => id === "today" ? sameDay(job.date, new Date()) : id === "unassigned" ? /unassigned/i.test(job.worker) : id === "attention" ? job.issue || /check|late/i.test(job.status) : /complete/i.test(job.status)).length}</span></button>)}</nav>
      {filter === "all" ? <section className="cvsDispatchBoard">{columns.map(([label, match]) => { const rows = data.jobs.filter(match); return <article key={label}><header><div><small>Stage</small><h2>{label}</h2></div><b>{rows.length}</b></header><div>{rows.length ? rows.map((job) => <button type="button" key={job.id} className="cvsJobTicket" onClick={() => open(job)}><span className={`cvsTicketEdge ${toneFor(job.status)}`} /><header><time>{timeLabel(job.time)}</time><StatusPill value={job.status} /></header><h3>{job.title}</h3><p>{job.client}</p><footer><span><MapPin size={14} />{job.address || "Address needed"}</span><span><UserRound size={14} />{job.worker}</span><strong>{money(job.price)}</strong></footer></button>) : <EmptyState title={`No ${label.toLowerCase()} work`} text="Jobs move into this lane automatically as their state changes." />}</div></article>; })}</section> : <section className="cvsJobList"><header><span>When</span><span>Job / client</span><span>Worker</span><span>Status</span><span>Value</span></header>{filtered.length ? filtered.map((job) => <button type="button" key={job.id} onClick={() => open(job)}><time><b>{timeLabel(job.time)}</b><small>{dateLabel(job.date)}</small></time><div><b>{job.title}</b><small>{job.client} · {job.address || "Address needed"}</small></div><span>{job.worker}</span><StatusPill value={job.status} /><strong>{money(job.price)}</strong></button>) : <EmptyState title="No jobs match" text="Change the filter or add the first matching job." action="Add job" onAction={() => create("job")} />}</section>}
    </div>
  );
}

export function ClientsStudio({ data, open, create, api, refresh, notify }) {
  const [query, setQuery] = React.useState("");
  const [selectedId, setSelectedId] = React.useState(data.clients[0]?.id || "");
  const inputRef = React.useRef(null);
  React.useEffect(() => { if (!selectedId && data.clients[0]) setSelectedId(data.clients[0].id); }, [data.clients, selectedId]);
  const clients = data.clients.filter((item) => `${item.name} ${item.email} ${item.phone} ${item.address}`.toLowerCase().includes(query.toLowerCase()));
  const selected = data.clients.find((item) => item.id === selectedId) || clients[0];
  const linked = selected ? [...data.jobs.filter((item) => item.client === selected.name), ...data.quotes.filter((item) => item.client === selected.name), ...data.invoices.filter((item) => item.client === selected.name), ...data.messages.filter((item) => item.client === selected.name)].sort((a, b) => (recordDate(b)?.getTime() || 0) - (recordDate(a)?.getTime() || 0)) : [];

  const importCsv = async (file) => {
    if (!file) return;
    try {
      const form = new FormData();
      form.append("file", file);
      await firstGood([() => api.post("/clients/import", form), () => api.post("/imports/clients", form)]);
      await refresh();
      notify({ tone: "good", title: "Client import complete", text: "The file was checked and imported." });
    } catch (error) {
      notify({ tone: "bad", title: "Import failed", text: error?.message || "Check the CSV and try again." });
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="cvsPage">
      <PageLead eyebrow="Clients" title="A customer cockpit, not a contact list." copy="Open one relationship and see the site, work, money and conversation together." actions={<><StudioButton icon={Upload} onClick={() => inputRef.current?.click()}>Import</StudioButton><StudioButton icon={Download} onClick={() => downloadCsv("churvox-clients.csv", data.clients, [["Name", "name"], ["Phone", "phone"], ["Email", "email"], ["Address", "address"], ["Service", "service"], ["Price", "price"], ["Schedule", "schedule"], ["Notes", "notes"]])}>Export</StudioButton><StudioButton tone="primary" icon={Plus} onClick={() => create("client")}>Add client</StudioButton><input ref={inputRef} hidden type="file" accept=".csv,text/csv" onChange={(event) => importCsv(event.target.files?.[0])} /></>} />
      <section className="cvsClientCockpit">
        <aside className="cvsClientIndex"><label><span>Find a client</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, phone or address" /></label><div>{clients.length ? clients.map((client) => <button type="button" key={client.id} className={selected?.id === client.id ? "active" : ""} onClick={() => setSelectedId(client.id)}><span>{initials(client.name)}</span><div><b>{client.name}</b><small>{client.address || client.email || "Contact details needed"}</small></div><em>{client.service || "No service"}</em></button>) : <EmptyState title="No clients found" text="Try a different search or add the first client." action="Add client" onAction={() => create("client")} />}</div></aside>
        <main className="cvsClientStage">{selected ? <><header><div><span className="cvsClientAvatar">{initials(selected.name)}</span><div><span className="cvsEyebrow">Client relationship</span><h2>{selected.name}</h2><p><MapPin size={15} />{selected.address || "No site address"}</p></div></div><StudioButton onClick={() => open(selected)}>Edit client</StudioButton></header><div className="cvsClientFacts">{[["Phone", selected.phone || "Not added"], ["Email", selected.email || "Not added"], ["Service", selected.service || "Not set"], ["Saved price", selected.price || "Open pricing"], ["Rhythm", selected.schedule || "One-off"], ["Access", selected.notes || "No access notes"]].map(([label, value]) => <span key={label}><small>{label}</small><b>{value}</b></span>)}</div><section className="cvsRelationshipStream"><header><span className="cvsEyebrow">Relationship stream</span><h3>Everything connected to this client</h3></header>{linked.length ? linked.map((item) => <RecordLine key={`${item.type}-${item.id}`} item={item} meta={`${item.type} · ${item.status || item.from || item.client || "record"}`} value={item.amount ? money(item.amount) : item.price ? money(item.price) : "Open"} open={open} />) : <EmptyState title="No connected activity" text="Jobs, quotes, invoices and messages will collect here." />}</section></> : <EmptyState title="No client selected" text="Choose a client or create the first one." action="Add client" onAction={() => create("client")} />}</main>
        <aside className="cvsClientNext"><span className="cvsEyebrow">Next best move</span><h3>{selected ? `Keep ${selected.name} moving` : "Choose a client"}</h3><p>{selected ? "Create work, prepare a quote or start a conversation without losing the relationship context." : "Client actions appear once a relationship is selected."}</p>{selected ? <div><StudioButton icon={Wrench} onClick={() => open({ ...blankRecord("job", data), client: selected.name, address: selected.address || "" })}>Create job</StudioButton><StudioButton icon={FileText} onClick={() => open({ ...blankRecord("quote", data), client: selected.name, clientEmail: selected.email || "" })}>Prepare quote</StudioButton><StudioButton icon={MessageSquare} onClick={() => open({ ...blankRecord("message", data), client: selected.name, to: selected.email || "" })}>Start message</StudioButton></div> : null}</aside>
      </section>
    </div>
  );
}

export function MoneyStudio({ page, data, open, create, access }) {
  const outstanding = data.invoices.filter((item) => !/paid/i.test(item.status)).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const overdue = data.invoices.filter((item) => /overdue/i.test(item.status));
  const paid = data.invoices.filter((item) => /paid/i.test(item.status)).reduce((sum, item) => sum + Number(item.amount || 0), 0);

  if (page === "quotes") {
    const stages = ["Draft", "Ready", "Sent", "Viewed", "Accepted", "Converted"];
    return <div className="cvsPage"><PageLead eyebrow="Money · Quotes" title="A sales river from idea to booked work." copy="The quote stays connected as it moves, instead of disappearing into a table." actions={<StudioButton tone="primary" icon={Plus} onClick={() => create("quote")}>New quote</StudioButton>} /><section className="cvsQuoteRiver">{stages.map((stage, index) => { const rows = data.quotes.filter((item) => clean(item.status).toLowerCase().includes(stage.toLowerCase())); return <React.Fragment key={stage}><article><header><span>{String(index + 1).padStart(2, "0")}</span><div><small>Stage</small><h2>{stage}</h2></div><b>{rows.length}</b></header><div>{rows.length ? rows.map((quote) => <button type="button" key={quote.id} onClick={() => open(quote)}><div><b>{quote.title}</b><small>{quote.client}</small></div><strong>{money(quote.amount)}</strong><ChevronRight size={16} /></button>) : <p>Nothing here</p>}</div></article>{index < stages.length - 1 ? <span className="cvsRiverArrow"><ArrowRight size={18} /></span> : null}</React.Fragment>; })}</section></div>;
  }

  if (page === "invoices") {
    return <div className="cvsPage"><PageLead eyebrow="Money · Invoices" title="A ledger that shows what happens next." copy="Drafts, due dates, accounting state and money are readable in one scan." actions={<><StudioButton icon={Download} onClick={() => downloadCsv("churvox-invoices.csv", data.invoices, [["Invoice", "number"], ["Client", "client"], ["Amount", "amount"], ["Due", "due"], ["Status", "status"], ["Sync", "sync"]])}>Export</StudioButton><StudioButton tone="primary" icon={Plus} onClick={() => create("invoice")}>New invoice</StudioButton></>} /><section className="cvsLedger"><header><span>Invoice</span><span>Client / work</span><span>Due</span><span>State</span><span>Accounting</span><span>Amount</span></header>{data.invoices.length ? data.invoices.map((invoice) => <button type="button" key={invoice.id} onClick={() => open(invoice)}><b>{invoice.number}</b><div><b>{invoice.client}</b><small>{invoice.job || "No linked job"}</small></div><span>{invoice.due || "Not set"}</span><StatusPill value={invoice.status} /><span>{invoice.sync}</span><strong>{money(invoice.amount)}</strong></button>) : <EmptyState title="No invoices" text="Create a draft from completed work when it is ready." action="New invoice" onAction={() => create("invoice")} />}</section></div>;
  }

  if (page === "accounting") {
    return <div className="cvsPage"><PageLead eyebrow="Money · Accounting" title="A guarded bridge, not a black box." copy="See the connection, the drafts ready to move and the rules Churvox will not cross." actions={access.accounting ? <StudioButton tone="primary" icon={ExternalLink} onClick={() => window.location.assign(`${String(API_BASE || "").replace(/\/$/, "")}/api/xero/connect/start`)}>{data.xero.connected ? "Reconnect Xero" : "Connect Xero"}</StudioButton> : null} />{access.accounting ? <section className="cvsAccountingBridge"><article className="connection"><Gauge size={26} /><span className="cvsEyebrow">Connection</span><h2>{data.xero.connected ? "Connected and ready" : "Not connected"}</h2><p>{data.xero.tenant || "Connect when the business is ready to hand off approved drafts."}</p><StatusPill value={data.xero.connected ? "Draft sync ready" : "Owner setup required"} tone={data.xero.connected ? "good" : "quiet"} /></article><article><span className="cvsEyebrow">Waiting drafts</span><strong>{data.invoices.filter((item) => /draft/i.test(item.status)).length}</strong><p>Only approved invoice drafts move across.</p></article><article className="guardrails"><ShieldCheck size={26} /><span className="cvsEyebrow">Hard guardrails</span><ul><li>No automatic sending</li><li>No tax filing</li><li>No bank payout files</li><li>No false paid status</li></ul></article></section> : <EmptyState title="Accounting is not included" text="Command or the Accounting Sync Add-on unlocks guarded draft invoice sync." />}</div>;
  }

  const steps = [
    ["Quote draft", data.quotes.filter((item) => /draft|ready/i.test(item.status)).length, data.quotes.filter((item) => /draft|ready/i.test(item.status)).reduce((sum, item) => sum + Number(item.amount || 0), 0)],
    ["With client", data.quotes.filter((item) => /sent|viewed/i.test(item.status)).length, data.quotes.filter((item) => /sent|viewed/i.test(item.status)).reduce((sum, item) => sum + Number(item.amount || 0), 0)],
    ["Accepted", data.quotes.filter((item) => /accepted|converted/i.test(item.status)).length, data.quotes.filter((item) => /accepted|converted/i.test(item.status)).reduce((sum, item) => sum + Number(item.amount || 0), 0)],
    ["To collect", data.invoices.filter((item) => !/paid|cancel/i.test(item.status)).length, outstanding],
    ["Paid", data.invoices.filter((item) => /paid/i.test(item.status)).length, paid],
  ];

  return <div className="cvsPage"><PageLead eyebrow="Money · Pulse" title="See where value is flowing—and where it is stuck." copy="Quotes and invoices sit on the same commercial line instead of separate dead-end pages." /><section className="cvsMoneyRiver">{steps.map(([label, count, value], index) => <React.Fragment key={label}><button type="button" onClick={() => index < 3 ? window.location.hash = "quotes" : window.location.hash = "invoices"} className={label === "To collect" && overdue.length ? "hot" : ""}><span>{String(index + 1).padStart(2, "0")}</span><small>{label}</small><b>{money(value)}</b><em>{count} records</em></button>{index < steps.length - 1 ? <i><ArrowRight size={18} /></i> : null}</React.Fragment>)}</section><section className="cvsMoneySplit"><article><header><span className="cvsEyebrow">Sales movement</span><h3>Quotes needing a move</h3></header>{data.quotes.length ? data.quotes.slice(0, 7).map((quote) => <RecordLine key={quote.id} item={quote} title={quote.title} meta={`${quote.client} · ${quote.status}`} value={money(quote.amount)} open={open} />) : <EmptyState title="No quotes" text="Prepare a quote when a client asks for work." action="New quote" onAction={() => create("quote")} />}</article><article><header><span className="cvsEyebrow">Collection movement</span><h3>Invoices needing a move</h3></header>{data.invoices.filter((item) => !/paid/i.test(item.status)).length ? data.invoices.filter((item) => !/paid/i.test(item.status)).slice(0, 7).map((invoice) => <RecordLine key={invoice.id} item={invoice} title={invoice.number} meta={`${invoice.client} · ${invoice.status}`} value={money(invoice.amount)} open={open} />) : <EmptyState title="No outstanding invoices" text="Draft invoices appear here before they are sent." action="New invoice" onAction={() => create("invoice")} />}</article></section></div>;
}

export function TeamStudio({ page, data, open, create }) {
  if (page === "field") {
    const groups = [["Working", /working|progress|active/i], ["Travelling", /travel/i], ["Finished", /finished|complete|done/i], ["Needs help", /help|issue|check|late/i], ["Offline", /offline|not clocked|inactive/i]];
    return <div className="cvsPage"><PageLead eyebrow="Team · Live field" title="A field signal board, not a staff list." copy="See who is moving, who is stuck and which job each person carries." /><section className="cvsFieldSignal"><div className="cvsFieldMap"><span className="grid" /><span className="route one" /><span className="route two" />{data.workers.map((worker, index) => <button type="button" key={worker.id} style={{ "--x": `${10 + (index * 23) % 82}%`, "--y": `${12 + (index * 31) % 76}%` }} className={toneFor(worker.status)} onClick={() => open(worker)}><span>{initials(worker.name)}</span><div><b>{worker.name}</b><small>{worker.status}</small></div></button>)}</div><aside>{groups.map(([label, matcher]) => { const rows = data.workers.filter((worker) => matcher.test(`${worker.status} ${worker.messages}`)); return <section key={label}><header><b>{label}</b><span>{rows.length}</span></header>{rows.map((worker) => <RecordLine key={worker.id} item={worker} title={worker.name} meta={worker.job} open={open} />)}</section>; })}</aside></section></div>;
  }

  if (page === "timesheets") {
    return <div className="cvsPage"><PageLead eyebrow="Team · Time" title="Recorded time with a clean approval trail." copy="Review the person, work and pay period without pretending Churvox files tax or pays banks." actions={<StudioButton icon={Download} onClick={() => downloadCsv("churvox-timesheet-review.csv", data.workers, [["Worker", "name"], ["Timesheet", "timesheet"], ["Payroll status", "payroll"]])}>Export review</StudioButton>} /><section className="cvsTimeBoard">{data.workers.length ? data.workers.map((worker) => <button type="button" key={worker.id} onClick={() => open(worker)}><span className="cvsTimeAvatar">{initials(worker.name)}</span><div><b>{worker.name}</b><small>{worker.job}</small></div><span><small>Recorded</small><b>{worker.timesheet || "No time"}</b></span><span><small>Frequency</small><b>{worker.payFrequency || "Fortnightly"}</b></span><StatusPill value={worker.payroll} /><ChevronRight size={18} /></button>) : <EmptyState title="No workers" text="Add team members before reviewing time." action="Add worker" onAction={() => create("worker")} />}</section></div>;
  }

  if (page === "access") {
    return <div className="cvsPage"><PageLead eyebrow="Team · Access" title="Make permissions obvious before they become a problem." copy="Each person has one role, one access level and one clear worker-app state." actions={<StudioButton tone="primary" icon={Plus} onClick={() => create("worker")}>Invite person</StudioButton>} /><section className="cvsAccessMatrix"><header><span>Person</span><span>Role</span><span>Access</span><span>Worker app</span><span>Live state</span></header>{data.workers.length ? data.workers.map((worker) => <button type="button" key={worker.id} onClick={() => open(worker)}><div><span>{initials(worker.name)}</span><b>{worker.name}</b></div><span>{worker.role}</span><span>{worker.access}</span><span>{worker.app}</span><StatusPill value={worker.status} /></button>) : <EmptyState title="No team access" text="Invite the first worker or office person." action="Invite person" onAction={() => create("worker")} />}</section></div>;
  }

  return <div className="cvsPage"><PageLead eyebrow="Team · People" title="A crew matrix built around the work." copy="The person, current job, field signal and access sit together." actions={<><StudioButton icon={Download} onClick={() => downloadCsv("churvox-team.csv", data.workers, [["Name", "name"], ["Email", "email"], ["Role", "role"], ["Status", "status"], ["Job", "job"], ["Access", "access"]])}>Export</StudioButton><StudioButton tone="primary" icon={Plus} onClick={() => create("worker")}>Add worker</StudioButton></>} /><section className="cvsCrewMatrix">{data.workers.length ? data.workers.map((worker) => <button type="button" key={worker.id} onClick={() => open(worker)}><header><span>{initials(worker.name)}</span><div><b>{worker.name}</b><small>{worker.role}</small></div><StatusPill value={worker.status} /></header><div className="cvsCrewJob"><small>Current work</small><b>{worker.job}</b></div><footer><span><small>Access</small><b>{worker.access}</b></span><span><small>Proof</small><b>{worker.proof || "None yet"}</b></span><span><small>Time</small><b>{worker.timesheet || "No time"}</b></span></footer></button>) : <EmptyState title="No crew connected" text="Add workers and subcontractors to create the live field board." action="Add worker" onAction={() => create("worker")} />}</section></div>;
}

export function MessagesStudio({ data, open, create }) {
  const [selectedId, setSelectedId] = React.useState(data.messages[0]?.id || "");
  React.useEffect(() => { if (!selectedId && data.messages[0]) setSelectedId(data.messages[0].id); }, [data.messages, selectedId]);
  const selected = data.messages.find((item) => item.id === selectedId) || data.messages[0];
  return <div className="cvsPage"><PageLead eyebrow="Messages" title="Conversation with the work still attached." copy="The client, job, priority and prepared reply stay visible while you answer." actions={<StudioButton tone="primary" icon={Plus} onClick={() => create("message")}>New message</StudioButton>} /><section className="cvsConversationDesk"><aside><header><span className="cvsEyebrow">Inbox</span><h2>{data.messages.length} conversations</h2></header><div>{data.messages.length ? data.messages.map((message) => <button type="button" key={message.id} className={selected?.id === message.id ? "active" : ""} onClick={() => setSelectedId(message.id)}><span className={`cvsSignal ${toneFor(message.priority)}`} /><div><b>{message.subject}</b><small>{message.from} · {message.client || message.job || message.channel}</small></div><em>{message.priority}</em></button>) : <EmptyState title="No messages" text="Client and worker communication will collect here." />}</div></aside><main>{selected ? <><header><div><span className="cvsEyebrow">{selected.channel}</span><h2>{selected.subject}</h2><p>{selected.from} → {selected.to || "Owner"}</p></div><StatusPill value={selected.priority} /></header><div className="cvsMessageContext"><span><small>Client</small><b>{selected.client || "Not linked"}</b></span><span><small>Job</small><b>{selected.job || "Not linked"}</b></span><span><small>Channel</small><b>{selected.channel}</b></span></div><article className="cvsMessageBubble"><p>{selected.detail || "No message body recorded."}</p></article><article className="cvsPreparedReply"><span className="cvsEyebrow">Prepared reply</span><p>{selected.draft || "Open the conversation to write a reply with the connected record context."}</p><StudioButton tone="primary" icon={Send} onClick={() => open(selected)}>Open & reply</StudioButton></article></> : <EmptyState title="Choose a conversation" text="Message context and replies appear here." />}</main><aside className="cvsConversationContext"><span className="cvsEyebrow">Conversation facts</span>{selected ? <><h3>{selected.client || selected.job || selected.from}</h3><p>Keep the conversation grounded in the same client and work record.</p><button type="button" onClick={() => open(selected)}><MessageSquare size={17} />Open record<ArrowRight size={15} /></button></> : null}</aside></section></div>;
}

export function CommandStudio({ page, data, open }) {
  const wanted = page === "parked" ? /park/i : page === "completed" ? /approved|complete|done/i : /waiting|ready|pending|review/i;
  const queue = data.command.filter((item) => wanted.test(item.status || (page === "command" ? "waiting" : "")));
  const [selectedId, setSelectedId] = React.useState(queue[0]?.id || "");
  React.useEffect(() => { if (!queue.some((item) => item.id === selectedId)) setSelectedId(queue[0]?.id || ""); }, [queue, selectedId]);
  const selected = queue.find((item) => item.id === selectedId) || queue[0];
  return <div className="cvsPage cvsCommandPage"><PageLead eyebrow={`Command · ${page === "command" ? "Waiting" : page === "parked" ? "Parked" : "History"}`} title="A decision theatre, not another inbox." copy="The reason, evidence, prepared result and consequence sit on one stage." /><section className="cvsDecisionTheatre"><aside><header><span className="cvsEyebrow">Decision queue</span><h2>{queue.length ? `${queue.length} waiting` : "Clear"}</h2></header><div>{queue.length ? queue.map((item, index) => <button type="button" key={item.id} className={selected?.id === item.id ? "active" : ""} onClick={() => setSelectedId(item.id)}><span>{String(index + 1).padStart(2, "0")}</span><div><b>{item.approvalType}</b><small>{item.title}</small></div><StatusPill value={item.status} /></button>) : <EmptyState title="Nothing in this queue" text="Only genuine owner decisions belong here." />}</div></aside><main>{selected ? <><header><span className="cvsEyebrow">Owner decision</span><h1>{selected.title}</h1><p>{selected.reason}</p></header><div className="cvsDecisionEvidence"><article><small>What happened</small><b>{selected.reason}</b></article><article><small>Why it reached you</small><b>{selected.recommended || "Owner approval is required"}</b></article><article><small>What was checked</small><b>{selected.evidence}</b></article><article><small>What was prepared</small><b>{selected.prepared}</b></article></div><StudioButton tone="primary" icon={ShieldCheck} onClick={() => open(selected)}>Review decision</StudioButton></> : <div className="cvsCommandClear"><CheckCircle2 size={44} /><h2>No owner decision is waiting.</h2><p>Churvox will bring something here only when judgement is genuinely required.</p></div>}</main><aside className="cvsDecisionConsequence"><span className="cvsEyebrow">Exact effect</span><h3>{selected?.recommended || "No change waiting"}</h3><p>{selected ? "Nothing sends, charges, syncs, pays or changes until the owner acts." : "The business continues without an owner block."}</p><footer><ShieldCheck size={18} />Owner approval remains the final gate.</footer></aside></section></div>;
}

export function SettingsStudio({ user, api, notify }) {
  const [section, setSection] = React.useState("business");
  const [busy, setBusy] = React.useState(false);
  const [values, setValues] = React.useState({ business_name: user?.business_name || user?.company_name || "", public_email: user?.public_email || SUPPORT_EMAIL, phone: user?.business_phone || "", address: user?.business_address || "", gst_rate: user?.gst_rate || "15", timezone: user?.timezone || "Pacific/Auckland", language: user?.language || "English", quote_valid_days: user?.quote_valid_days || "14", invoice_prefix: user?.invoice_prefix || "INV", payment_terms: user?.payment_terms || "14", worker_rule: user?.worker_rule || "simple", reminder_rule: user?.reminder_rule || "owner-review", notification_rule: user?.notification_rule || "meaningful", brand_tone: user?.brand_tone || "industrial-warm" });
  const save = async () => { setBusy(true); try { await firstGood([() => api.patch("/business/settings", values), () => api.put("/business/settings", values), () => api.patch("/settings/business", values), () => api.post("/settings/business", values)]); notify({ tone: "good", title: "Settings saved", text: "Business controls are up to date." }); } catch (error) { notify({ tone: "bad", title: "Could not save settings", text: error?.message || "Try again." }); } finally { setBusy(false); } };
  const groups = [["business", "Business"], ["money", "Money rules"], ["field", "Field app"], ["automation", "Automation"], ["security", "Security"]];
  return <div className="cvsPage"><PageLead eyebrow="Settings" title="Controls organised by the way the business works." copy="No random settings wall. Each rule sits beside the part of Churvox it changes." actions={<StudioButton tone="primary" icon={CheckCircle2} disabled={busy} onClick={save}>{busy ? "Saving…" : "Save settings"}</StudioButton>} /><section className="cvsSettingsStudio"><aside>{groups.map(([id, label]) => <button type="button" key={id} className={section === id ? "active" : ""} onClick={() => setSection(id)}><span>{String(groups.findIndex(([key]) => key === id) + 1).padStart(2, "0")}</span>{label}<ChevronRight size={16} /></button>)}</aside><main>{section === "business" ? <><header><span className="cvsEyebrow">Business identity</span><h2>The details clients and workers see</h2></header><div className="cvsSettingsFields">{[["Business name", "business_name"], ["Public email", "public_email", "email"], ["Phone", "phone"], ["Address", "address"], ["Timezone", "timezone"], ["Language", "language"]].map(([label, key, type]) => <label key={key}><span>{label}</span><input type={type || "text"} value={values[key]} onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))} /></label>)}</div></> : null}{section === "money" ? <><header><span className="cvsEyebrow">Money rules</span><h2>Defaults that keep quotes and invoices consistent</h2></header><div className="cvsSettingsFields">{[["GST rate", "gst_rate", "number"], ["Quote validity (days)", "quote_valid_days", "number"], ["Invoice prefix", "invoice_prefix"], ["Payment terms (days)", "payment_terms", "number"]].map(([label, key, type]) => <label key={key}><span>{label}</span><input type={type || "text"} value={values[key]} onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))} /></label>)}</div></> : null}{section === "field" ? <><header><span className="cvsEyebrow">Field app</span><h2>Keep the worker experience useful and simple</h2></header><div className="cvsSettingsFields"><label><span>Worker app detail</span><select value={values.worker_rule} onChange={(event) => setValues((current) => ({ ...current, worker_rule: event.target.value }))}><option value="simple">Simple field flow</option><option value="full">Full field detail</option></select></label><label><span>Brand direction</span><select value={values.brand_tone} onChange={(event) => setValues((current) => ({ ...current, brand_tone: event.target.value }))}><option value="industrial-warm">Industrial warm</option><option value="clean">Clean</option><option value="bold">Bold</option></select></label></div></> : null}{section === "automation" ? <><header><span className="cvsEyebrow">Automation</span><h2>Prepare work, never hide consequences</h2></header><div className="cvsSettingsFields"><label><span>Reminder rule</span><select value={values.reminder_rule} onChange={(event) => setValues((current) => ({ ...current, reminder_rule: event.target.value }))}><option value="owner-review">Prepare for owner review</option><option value="manual">Manual only</option></select></label><label><span>Notifications</span><select value={values.notification_rule} onChange={(event) => setValues((current) => ({ ...current, notification_rule: event.target.value }))}><option value="meaningful">Meaningful changes only</option><option value="all">All activity</option></select></label></div></> : null}{section === "security" ? <><header><span className="cvsEyebrow">Security</span><h2>Sessions, access and business data</h2></header><div className="cvsSecurityRows"><button type="button"><ShieldCheck size={19} /><span><b>Active sessions</b><small>Review devices using this account</small></span><ChevronRight size={17} /></button><button type="button"><Download size={19} /><span><b>Export business data</b><small>Prepare a complete business archive</small></span><ChevronRight size={17} /></button><button type="button" className="danger"><MoreHorizontal size={19} /><span><b>Delete account</b><small>Permanent owner-controlled removal</small></span><ChevronRight size={17} /></button></div></> : null}</main></section></div>;
}

export function PlansStudio({ access }) {
  return <div className="cvsPage"><PageLead eyebrow="Plans & billing" title="Your current plan first. The comparison second." copy="Pricing stays exactly as set, with clear access and no hidden card requirement." /><section className="cvsPlanCurrent"><span className="cvsEyebrow">Current access</span><h2>{access.planName}</h2><p>14-day trial, no card. Upgrade only when the business needs the next layer.</p></section><section className="cvsPlansStrip">{PLANS.map((plan) => { const current = plan.code === access.planKey; return <article key={plan.name} className={`${plan.popular ? "popular" : ""} ${current ? "current" : ""}`} data-plan-card={!current ? true : undefined} data-stripe-plan={!current ? plan.name : undefined}><header><small>{current ? "Current plan" : plan.popular ? "Most popular" : "Monthly"}</small><h2>{plan.name}</h2><strong>${plan.price}<span>/month + GST</span></strong></header><p>{plan.note}</p><ul>{plan.items.map((item) => <li key={item}><Check size={15} />{item}</li>)}</ul>{current ? <button type="button" disabled>Current plan</button> : <button type="button" data-stripe-live-plan={plan.name} data-stripe-live-action="start_trial">Start {plan.name} trial<ArrowRight size={16} /></button>}</article>; })}</section><section className="cvsAddons">{ADDONS.map((addon) => <article key={addon.name} data-plan-card data-stripe-plan={addon.stripe}><div><span className="cvsEyebrow">Optional capacity</span><h3>{addon.name}</h3><p>{addon.note}</p></div><strong>${addon.price}<small>/month + GST</small></strong><button type="button" data-stripe-live-plan={addon.stripe} data-stripe-live-action="add_on">Add option<ArrowRight size={16} /></button></article>)}</section></div>;
}

export function SupportStudio() {
  return <div className="cvsPage"><PageLead eyebrow="Help" title="Start with the exact place that is stuck." copy="Support should understand the page, record and expected result—not make you retell the whole business." actions={<StudioButton tone="primary" icon={Mail} onClick={() => window.location.assign(`mailto:${SUPPORT_EMAIL}`)}>Email Churvox</StudioButton>} /><section className="cvsSupportStudio"><article><span className="cvsEyebrow">Best support message</span><h2>Give us four useful facts.</h2><ol><li><span>01</span>Name the page</li><li><span>02</span>Name the client, job or record</li><li><span>03</span>Say what happened</li><li><span>04</span>Say what should have happened</li></ol></article><article><span className="cvsEyebrow">Safe operating route</span><h2>Build around real work.</h2><ol><li><span>01</span>Add or import a client</li><li><span>02</span>Create the first job</li><li><span>03</span>Connect the worker</li><li><span>04</span>Review exceptions in Command</li></ol></article><article className="contact"><MessageSquare size={28} /><span className="cvsEyebrow">Direct contact</span><h2>{SUPPORT_EMAIL}</h2><p>Include screenshots and the record name whenever possible.</p></article></section></div>;
}
