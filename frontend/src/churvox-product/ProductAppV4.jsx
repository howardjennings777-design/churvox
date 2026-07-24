import React from "react";
import ProductAppV3 from "./ProductAppV3";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
import "./productAppV4.css";

const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
const unwrap = (payload) => payload?.data?.data ?? payload?.data ?? payload;
const money = (value) => new Intl.NumberFormat("en-NZ", {
  style: "currency",
  currency: "NZD",
  maximumFractionDigits: 0,
}).format(Number(value || 0));

function rowsFrom(payload, preferred) {
  const data = unwrap(payload);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[preferred])) return data[preferred];
  for (const key of ["items", "records", "results", "data", "jobs", "clients", "workers", "team", "quotes", "invoices", "messages", "actions", "notifications"]) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

function pick(row, ...keys) {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && clean(value)) return value;
  }
  return "";
}

function idOf(row, fallback) {
  const raw = row?.id || row?._id || row?.job_id || row?.invoice_id || row?.message_id || row?.action_id || fallback;
  return typeof raw === "object" ? clean(raw.$oid || raw.oid || raw.id || raw._id || fallback) : clean(raw || fallback);
}

function normalise(payloads) {
  const jobs = rowsFrom(payloads.jobs, "jobs").map((row, index) => ({
    ...row,
    id: idOf(row, `job-${index}`),
    title: pick(row, "title", "job_title", "job_name", "name", "description") || `Job ${index + 1}`,
    client: pick(row, "client_name", "customer_name", "client"),
    worker: pick(row, "assigned_worker_name", "worker_name", "worker"),
    status: clean(row.status || row.job_status || "Ready"),
    date: clean(pick(row, "scheduled_date", "date", "start_date")),
    time: clean(pick(row, "scheduled_time", "start_time", "time")),
    price: Number(pick(row, "price", "amount", "total") || 0),
    issue: clean(pick(row, "issue", "problem", "needs_attention")),
  }));

  const workers = rowsFrom(payloads.workers, "team").map((row, index) => ({
    ...row,
    id: idOf(row, `worker-${index}`),
    name: pick(row, "name", "full_name", "display_name", "email") || `Worker ${index + 1}`,
    status: clean(pick(row, "status", "clock_status", "app_status") || "Not clocked in"),
    job: clean(pick(row, "current_job", "job_title")),
  }));

  const invoices = rowsFrom(payloads.invoices, "invoices").map((row, index) => ({
    ...row,
    id: idOf(row, `invoice-${index}`),
    number: pick(row, "number", "invoice_number") || `Invoice ${index + 1}`,
    client: pick(row, "client_name", "customer_name", "client"),
    job: pick(row, "job_title", "job"),
    amount: Number(pick(row, "amount", "total", "price") || 0),
    status: clean(row.status || "Draft"),
    due: clean(pick(row, "due_date", "due")),
  }));

  const quotes = rowsFrom(payloads.quotes, "quotes").map((row, index) => ({
    ...row,
    id: idOf(row, `quote-${index}`),
    title: pick(row, "title", "quote_title", "description") || `Quote ${index + 1}`,
    client: pick(row, "client_name", "customer_name", "client"),
    amount: Number(pick(row, "amount", "total", "price") || 0),
    status: clean(row.status || "Draft"),
  }));

  const messages = rowsFrom(payloads.messages, "messages").map((row, index) => ({
    ...row,
    id: idOf(row, `message-${index}`),
    from: pick(row, "from", "sender", "source") || "Message",
    subject: pick(row, "subject", "title") || "Message",
    detail: clean(pick(row, "detail", "body", "message")),
    draft: clean(pick(row, "draft", "drafted_reply", "reply")),
    client: pick(row, "client_name", "client"),
  }));

  const command = rowsFrom(payloads.command, "actions").map((row, index) => ({
    ...row,
    id: idOf(row, `action-${index}`),
    title: pick(row, "title", "record_title", "summary") || "Prepared owner decision",
    type: pick(row, "type", "kind", "action_type") || "Owner check",
    status: clean(pick(row, "status", "state") || "Waiting"),
    amount: Number(pick(row, "amount", "total") || 0),
  }));

  return { jobs, workers, invoices, quotes, messages, command };
}

function useLiveOffice(enabled) {
  const api = useApi();
  const [state, setState] = React.useState({
    loading: Boolean(enabled),
    data: { jobs: [], workers: [], invoices: [], quotes: [], messages: [], command: [] },
  });

  const refresh = React.useCallback(async () => {
    if (!enabled) {
      setState((current) => ({ ...current, loading: false }));
      return;
    }
    setState((current) => ({ ...current, loading: true }));
    const results = await Promise.allSettled([
      api.get("/jobs"),
      api.get("/team"),
      api.get("/invoices"),
      api.get("/quotes"),
      api.get("/messages"),
      api.get("/ai/actions"),
    ]);
    setState({
      loading: false,
      data: normalise({
        jobs: results[0]?.value,
        workers: results[1]?.value,
        invoices: results[2]?.value,
        quotes: results[3]?.value,
        messages: results[4]?.value,
        command: results[5]?.value,
      }),
    });
  }, [api, enabled]);

  React.useEffect(() => {
    refresh();
    window.addEventListener("churvox:data-refresh", refresh);
    return () => window.removeEventListener("churvox:data-refresh", refresh);
  }, [refresh]);

  return { ...state, refresh };
}

function currentPage() {
  if (typeof window === "undefined") return "today";
  const hash = clean(window.location.hash.replace(/^#/, "")).toLowerCase();
  return hash || "today";
}

function go(page) {
  if (typeof window === "undefined") return;
  window.history.pushState({}, "", page === "today" ? "/dashboard" : `/dashboard#${page}`);
  window.dispatchEvent(new Event("hashchange"));
}

function signalFrom(data) {
  const jobIssues = data.jobs.filter((job) => job.issue || /issue|hold|missing|late|needs|check|unassigned/i.test(`${job.status} ${job.issue} ${job.worker}`));
  const overdue = data.invoices.filter((invoice) => /overdue|late/i.test(invoice.status));
  const completed = data.jobs.filter((job) => /complete|done/i.test(job.status));
  const activeWorkers = data.workers.filter((worker) => !/not clocked|inactive|not invited|offline/i.test(worker.status));
  const promises = data.messages.filter((message) => /\b(today|tomorrow|tonight|before|by\s+\d|call|send|return|quote|follow up|follow-up)\b/i.test(`${message.subject} ${message.detail}`));
  const unbilled = completed.filter((job) => !data.invoices.some((invoice) => {
    const jobKey = `${job.title} ${job.client}`.toLowerCase();
    const invoiceKey = `${invoice.job} ${invoice.client}`.toLowerCase();
    return Boolean(jobKey.trim()) && (invoiceKey.includes(job.title.toLowerCase()) || (job.client && invoiceKey.includes(job.client.toLowerCase())));
  }));
  const invoiceValue = data.invoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  const pressure = Math.min(100, data.command.length * 16 + jobIssues.length * 13 + overdue.length * 12 + promises.length * 5);

  let bestMove = {
    title: "The office is calm",
    reason: "No urgent owner decision is visible in the live records.",
    page: "today",
    label: "View today",
    tone: "calm",
  };
  if (data.command[0]) {
    bestMove = {
      title: `Review ${data.command[0].type}`,
      reason: `${data.command[0].title}${data.command[0].amount ? ` · ${money(data.command[0].amount)}` : ""}. This is already prepared and waiting for the owner.",
      page: "command",
      label: "Open Command",
      tone: "decision",
    };
  } else if (jobIssues[0]) {
    bestMove = {
      title: `Protect ${jobIssues[0].title}`,
      reason: `${jobIssues[0].issue || jobIssues[0].status || "This job needs checking"}. Check the ripple before the day moves on.",
      page: "jobs",
      label: "Open job board",
      tone: "risk",
    };
  } else if (overdue[0]) {
    bestMove = {
      title: `Recover ${money(overdue[0].amount)}`,
      reason: `${overdue[0].number} for ${overdue[0].client || "a client"} is marked overdue. Prepare a follow-up before more work stacks up.",
      page: "invoices",
      label: "Open invoices",
      tone: "money",
    };
  } else if (unbilled[0]) {
    bestMove = {
      title: `Check unbilled work`,
      reason: `${unbilled[0].title} is complete and no matching invoice was found in the live records.",
      page: "invoices",
      label: "Check missed money",
      tone: "money",
    };
  }

  return { jobIssues, overdue, completed, activeWorkers, promises, unbilled, invoiceValue, pressure, bestMove };
}

const OFFICE_DESKS = [
  { id: "bookings", label: "Bookings desk", page: "jobs", note: "Requests, timing and recurring work" },
  { id: "field", label: "Field desk", page: "workers", note: "Workers, progress and proof" },
  { id: "clients", label: "Client desk", page: "clients", note: "History, promises and follow-ups" },
  { id: "money", label: "Money desk", page: "invoices", note: "Quotes, invoices and missed revenue" },
  { id: "quality", label: "Quality desk", page: "jobs", note: "Completion, photos and exceptions" },
  { id: "command", label: "Owner desk", page: "command", note: "Approve, edit or park" },
];

function deskCount(id, data, signals) {
  if (id === "bookings") return data.jobs.length;
  if (id === "field") return signals.activeWorkers.length;
  if (id === "clients") return signals.promises.length;
  if (id === "money") return signals.overdue.length + signals.unbilled.length;
  if (id === "quality") return signals.jobIssues.length;
  return data.command.length;
}

function makeAnswer(raw, data, signals) {
  const prompt = clean(raw).toLowerCase();
  if (!prompt) return null;

  if (/fix today|sort today|recovery|sick|rain|breakdown|running late/.test(prompt)) {
    const affected = signals.jobIssues.length || data.jobs.filter((job) => /assigned|ready|scheduled/i.test(job.status)).length;
    return {
      kicker: "Recovery pack",
      title: affected ? `${affected} job${affected === 1 ? "" : "s"} need a recovery check` : "Today is not showing a live disruption",
      lines: [
        `${signals.activeWorkers.length} worker${signals.activeWorkers.length === 1 ? "" : "s"} currently look active in the live records.`,
        `${signals.jobIssues.length} job exception${signals.jobIssues.length === 1 ? "" : "s"} and ${signals.promises.length} client promise${signals.promises.length === 1 ? "" : "s"} need protecting.`,
        "Churvox would prepare reassignment options, affected client messages and the money impact as one Command pack.",
      ],
      page: signals.jobIssues.length ? "jobs" : "today",
      action: signals.jobIssues.length ? "Inspect affected jobs" : "View today",
      footer: "Nothing has been changed or sent.",
    };
  }

  if (/missed money|unbilled|ghost work|extra work/.test(prompt)) {
    return {
      kicker: "Missed money",
      title: signals.unbilled.length ? `${signals.unbilled.length} completed job${signals.unbilled.length === 1 ? "" : "s"} may be unbilled` : "No obvious unbilled completed jobs found",
      lines: signals.unbilled.length
        ? signals.unbilled.slice(0, 4).map((job) => `${job.title}${job.client ? ` · ${job.client}` : ""}${job.price ? ` · ${money(job.price)}` : ""}`)
        : ["Churvox compared completed jobs with the current invoice records.", "Extra time, materials and message-based variations still need deeper record-level checks."],
      page: "invoices",
      action: "Open money desk",
      footer: "This is a live-record warning, not an automatic charge.",
    };
  }

  if (/overdue|late invoice|who owes/.test(prompt)) {
    return {
      kicker: "Payment follow-up",
      title: signals.overdue.length ? `${signals.overdue.length} overdue invoice${signals.overdue.length === 1 ? "" : "s"}` : "No invoices are marked overdue",
      lines: signals.overdue.length
        ? signals.overdue.slice(0, 5).map((invoice) => `${invoice.number} · ${invoice.client || "Client"} · ${money(invoice.amount)}`)
        : [`Current invoice value is ${money(signals.invoiceValue)}.`, "Churvox will keep sending and payment actions owner-controlled."],
      page: "invoices",
      action: "Open invoices",
      footer: "Any reminder would be drafted for approval first.",
    };
  }

  if (/promise|what did we say|commitment/.test(prompt)) {
    return {
      kicker: "Promise Guard",
      title: signals.promises.length ? `${signals.promises.length} message${signals.promises.length === 1 ? "" : "s"} may contain a promise` : "No obvious promise wording found",
      lines: signals.promises.length
        ? signals.promises.slice(0, 5).map((message) => `${message.subject} · ${message.client || message.from}`)
        : ["Churvox checked current message text for dates, callbacks, quotes and follow-up commitments."],
      page: "messages",
      action: "Open messages",
      footer: "Promise Guard surfaces commitments; the owner decides what happens next.",
    };
  }

  if (/move|reschedule|tomorrow|ripple|what happens if/.test(prompt)) {
    const scheduled = data.jobs.filter((job) => job.date || job.time).slice(0, 6);
    const value = scheduled.reduce((sum, job) => sum + job.price, 0);
    return {
      kicker: "Ripple preview",
      title: `${scheduled.length} scheduled job${scheduled.length === 1 ? "" : "s"} would need checking`,
      lines: [
        `${money(value)} of scheduled job value is visible in the affected set.`,
        `${signals.activeWorkers.length} active worker${signals.activeWorkers.length === 1 ? "" : "s"} and ${signals.promises.length} client promise${signals.promises.length === 1 ? "" : "s"} could be touched.`,
        "Churvox would compare worker load, client commitments, travel and invoice timing before preparing options.",
      ],
      page: "jobs",
      action: "Open run sheet",
      footer: "Ripple Preview explains consequences before the owner approves a move.",
    };
  }

  if (/what needs me|priority|best move|where do i start|what now/.test(prompt)) {
    return {
      kicker: "One best move",
      title: signals.bestMove.title,
      lines: [signals.bestMove.reason, `${data.command.length} Command item${data.command.length === 1 ? "" : "s"}, ${signals.jobIssues.length} job exception${signals.jobIssues.length === 1 ? "" : "s"}, ${signals.overdue.length} overdue invoice${signals.overdue.length === 1 ? "" : "s"}.`],
      page: signals.bestMove.page,
      action: signals.bestMove.label,
      footer: "Churvox ranks the move; the owner remains in control.",
    };
  }

  const matches = [
    ...data.jobs.filter((item) => `${item.title} ${item.client} ${item.worker}`.toLowerCase().includes(prompt)),
    ...data.invoices.filter((item) => `${item.number} ${item.client} ${item.job}`.toLowerCase().includes(prompt)),
    ...data.messages.filter((item) => `${item.subject} ${item.client} ${item.from}`.toLowerCase().includes(prompt)),
  ];
  return {
    kicker: "Office search",
    title: matches.length ? `${matches.length} connected record${matches.length === 1 ? "" : "s"} found` : "Churvox understands the request but needs a clearer record",
    lines: matches.length
      ? matches.slice(0, 5).map((item) => item.title || item.number || item.subject || "Record")
      : ["Try: What needs me?", "Try: Fix today", "Try: Show missed money", "Try: What promises have we made?"],
    page: matches.some((item) => item.number) ? "invoices" : matches.some((item) => item.subject) ? "messages" : "today",
    action: matches.length ? "Open connected area" : "Return to Today",
    footer: "Nothing is executed from the conversation without owner approval.",
  };
}

function OfficeTwin({ data, signals, close }) {
  return <div className="cv4Layer" role="dialog" aria-modal="true" aria-label="Churvox live office">
    <section className="cv4Twin">
      <header className="cv4TwinHead">
        <div><small>Live Office Twin</small><h2>Your whole business, working as one office.</h2><p>Every desk below is driven by live Churvox records. Click a department to enter its workspace.</p></div>
        <button type="button" onClick={close}>Close office</button>
      </header>
      <div className="cv4Floor">
        <div className="cv4FloorGlow" aria-hidden="true" />
        <div className="cv4Brain">
          <span className="cv4BrainRing" /><span className="cv4BrainRing second" />
          <small>Churvox office brain</small>
          <b>{signals.pressure ? `${signals.pressure}% pressure` : "Office calm"}</b>
          <p>{signals.bestMove.title}</p>
        </div>
        {OFFICE_DESKS.map((desk, index) => <button key={desk.id} type="button" className={`cv4Desk desk-${index + 1}`} onClick={() => { go(desk.page); close(); }}>
          <span className="cv4DeskLamp" /><small>{desk.label}</small><b>{deskCount(desk.id, data, signals)}</b><p>{desk.note}</p><em>Open desk</em>
        </button>)}
        <div className="cv4OwnerSeat"><span /><b>Owner</b><small>Only decisions reach this desk</small></div>
      </div>
      <footer className="cv4TwinFooter">
        <span><b>{data.jobs.length}</b> jobs connected</span>
        <span><b>{signals.activeWorkers.length}</b> workers active</span>
        <span><b>{signals.promises.length}</b> promises watched</span>
        <span><b>{signals.unbilled.length}</b> missed-money checks</span>
        <span><b>{data.command.length}</b> owner decisions</span>
      </footer>
    </section>
  </div>;
}

function Handover({ data, signals, close }) {
  return <div className="cv4Layer" role="dialog" aria-modal="true" aria-label="Churvox office handover">
    <section className="cv4Handover">
      <header><div><small>Live office handover</small><h2>Here is what the business needs now.</h2></div><button type="button" onClick={close}>Close</button></header>
      <div className={`cv4Best ${signals.bestMove.tone}`}>
        <small>One best move</small><h3>{signals.bestMove.title}</h3><p>{signals.bestMove.reason}</p><button type="button" onClick={() => { go(signals.bestMove.page); close(); }}>{signals.bestMove.label}</button>
      </div>
      <div className="cv4HandoverGrid">
        <article><small>Work</small><b>{data.jobs.length}</b><p>{signals.completed.length} complete · {signals.jobIssues.length} need checking</p></article>
        <article><small>Field</small><b>{signals.activeWorkers.length}</b><p>active from {data.workers.length} worker records</p></article>
        <article><small>Money</small><b>{money(signals.invoiceValue)}</b><p>{signals.overdue.length} overdue · {signals.unbilled.length} possible unbilled</p></article>
        <article><small>Promises</small><b>{signals.promises.length}</b><p>messages may contain a commitment</p></article>
        <article><small>Command</small><b>{data.command.length}</b><p>prepared decisions waiting for the owner</p></article>
        <article><small>Office load</small><b>{signals.pressure}%</b><p>based on visible exceptions and decisions</p></article>
      </div>
      <footer>Live records only. Churvox has not sent, moved, charged or changed anything.</footer>
    </section>
  </div>;
}

function TellChurvox({ data, signals, close }) {
  const [prompt, setPrompt] = React.useState("");
  const [answer, setAnswer] = React.useState(null);
  const ask = (value = prompt) => {
    setPrompt(value);
    setAnswer(makeAnswer(value, data, signals));
  };
  return <div className="cv4Layer alignRight" role="dialog" aria-modal="true" aria-label="Tell Churvox">
    <aside className="cv4Tell">
      <header><div><small>Tell Churvox</small><h2>Ask the whole office.</h2><p>Churvox checks the connected records and prepares the next move. Nothing executes here.</p></div><button type="button" onClick={close}>Close</button></header>
      <div className="cv4Prompt">
        <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Try: Sam is sick tomorrow. Sort it out." rows={3} />
        <button type="button" onClick={() => ask()}>Prepare answer</button>
      </div>
      <div className="cv4Quick">
        {["What needs me?", "Fix today", "Show missed money", "What promises have we made?", "Show overdue invoices", "What happens if I move tomorrow?"]
          .map((item) => <button type="button" key={item} onClick={() => ask(item)}>{item}</button>)}
      </div>
      {answer ? <section className="cv4Answer">
        <small>{answer.kicker}</small><h3>{answer.title}</h3>
        <div>{answer.lines.map((line, index) => <p key={`${line}-${index}`}>{line}</p>)}</div>
        <button type="button" onClick={() => { go(answer.page); close(); }}>{answer.action}</button>
        <footer>{answer.footer}</footer>
      </section> : <section className="cv4Answer empty"><span className="cv4Pulse" /><h3>The office is listening.</h3><p>Ask about work, people, money, promises or a disruption.</p></section>}
    </aside>
  </div>;
}

export default function ProductAppV4() {
  const { user } = useAuth();
  const { data, loading } = useLiveOffice(Boolean(user));
  const signals = React.useMemo(() => signalFrom(data), [data]);
  const [page, setPage] = React.useState(currentPage);
  const [officeOpen, setOfficeOpen] = React.useState(false);
  const [handoverOpen, setHandoverOpen] = React.useState(false);
  const [tellOpen, setTellOpen] = React.useState(false);

  React.useEffect(() => {
    const sync = () => setPage(currentPage());
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);

  return <div className="cv4Experience" data-version="CHURVOX_LIVE_OFFICE_TWIN_20260724">
    <div className="cv4Backdrop" aria-hidden="true">
      <span className="room room-a" /><span className="room room-b" /><span className="room room-c" />
      <span className="corridor" /><span className="window window-a" /><span className="window window-b" />
    </div>
    <ProductAppV3 />
    <div className="cv4Dock" aria-label="Churvox live office controls">
      <button type="button" className="cv4OfficeButton" onClick={() => setOfficeOpen(true)}>
        <span className={loading ? "loading" : signals.pressure > 55 ? "busy" : ""} />
        <b>Live office</b><small>{loading ? "Connecting records" : `${signals.pressure}% pressure · ${data.command.length} decisions`}</small>
      </button>
      <button type="button" className={`cv4Move ${signals.bestMove.tone}`} onClick={() => setHandoverOpen(true)}>
        <small>One best move</small><b>{signals.bestMove.title}</b><span>{signals.bestMove.reason}</span>
      </button>
      <div className="cv4DeskStrip">
        {OFFICE_DESKS.map((desk) => <button key={desk.id} type="button" className={page === desk.page ? "active" : ""} onClick={() => go(desk.page)} title={desk.note}>
          <span>{deskCount(desk.id, data, signals)}</span><b>{desk.label.replace(" desk", "")}</b>
        </button>)}
      </div>
      <button type="button" className="cv4TellButton" onClick={() => setTellOpen(true)}><span>+</span><b>Tell Churvox</b></button>
    </div>
    {officeOpen ? <OfficeTwin data={data} signals={signals} close={() => setOfficeOpen(false)} /> : null}
    {handoverOpen ? <Handover data={data} signals={signals} close={() => setHandoverOpen(false)} /> : null}
    {tellOpen ? <TellChurvox data={data} signals={signals} close={() => setTellOpen(false)} /> : null}
  </div>;
}
