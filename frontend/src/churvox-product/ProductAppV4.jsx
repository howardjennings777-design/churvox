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
  for (const key of ["items", "records", "results", "data", "jobs", "workers", "team", "invoices", "messages", "actions"]) {
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

function normalise(payloads) {
  const jobs = rowsFrom(payloads.jobs, "jobs").map((row, index) => ({
    id: clean(row?.id || row?._id || `job-${index}`),
    title: pick(row, "title", "job_title", "job_name", "name", "description") || `Job ${index + 1}`,
    client: pick(row, "client_name", "customer_name", "client"),
    worker: pick(row, "assigned_worker_name", "worker_name", "worker"),
    status: clean(row?.status || row?.job_status || "Ready"),
    issue: clean(pick(row, "issue", "problem", "needs_attention")),
    price: Number(pick(row, "price", "amount", "total") || 0),
  }));

  const workers = rowsFrom(payloads.workers, "team").map((row, index) => ({
    id: clean(row?.id || row?._id || `worker-${index}`),
    name: pick(row, "name", "full_name", "display_name", "email") || `Worker ${index + 1}`,
    status: clean(pick(row, "status", "clock_status", "app_status") || "Not clocked in"),
  }));

  const invoices = rowsFrom(payloads.invoices, "invoices").map((row, index) => ({
    id: clean(row?.id || row?._id || `invoice-${index}`),
    number: pick(row, "number", "invoice_number") || `Invoice ${index + 1}`,
    client: pick(row, "client_name", "customer_name", "client"),
    job: pick(row, "job_title", "job"),
    amount: Number(pick(row, "amount", "total", "price") || 0),
    status: clean(row?.status || "Draft"),
  }));

  const messages = rowsFrom(payloads.messages, "messages").map((row, index) => ({
    id: clean(row?.id || row?._id || `message-${index}`),
    subject: pick(row, "subject", "title") || "Message",
    from: pick(row, "from", "sender", "source") || "Message",
    client: pick(row, "client_name", "client"),
    detail: clean(pick(row, "detail", "body", "message")),
  }));

  const command = rowsFrom(payloads.command, "actions").map((row, index) => ({
    id: clean(row?.id || row?._id || row?.action_id || `action-${index}`),
    title: pick(row, "title", "record_title", "summary") || "Prepared owner decision",
    type: pick(row, "type", "kind", "action_type") || "Owner check",
    amount: Number(pick(row, "amount", "total") || 0),
  }));

  return { jobs, workers, invoices, messages, command };
}

function useLiveOffice(enabled) {
  const api = useApi();
  const [loading, setLoading] = React.useState(Boolean(enabled));
  const [data, setData] = React.useState({ jobs: [], workers: [], invoices: [], messages: [], command: [] });

  const refresh = React.useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const results = await Promise.allSettled([
      api.get("/jobs"),
      api.get("/team"),
      api.get("/invoices"),
      api.get("/messages"),
      api.get("/ai/actions"),
    ]);
    setData(normalise({
      jobs: results[0]?.value,
      workers: results[1]?.value,
      invoices: results[2]?.value,
      messages: results[3]?.value,
      command: results[4]?.value,
    }));
    setLoading(false);
  }, [api, enabled]);

  React.useEffect(() => {
    refresh();
    window.addEventListener("churvox:data-refresh", refresh);
    return () => window.removeEventListener("churvox:data-refresh", refresh);
  }, [refresh]);

  return { data, loading };
}

function pageNow() {
  if (typeof window === "undefined") return "today";
  return clean(window.location.hash.replace(/^#/, "")).toLowerCase() || "today";
}

function go(page) {
  if (typeof window === "undefined") return;
  window.history.pushState({}, "", page === "today" ? "/dashboard" : `/dashboard#${page}`);
  window.dispatchEvent(new Event("hashchange"));
}

function buildSignals(data) {
  const issues = data.jobs.filter((job) => job.issue || /issue|hold|missing|late|needs|check|unassigned/i.test(`${job.status} ${job.issue} ${job.worker}`));
  const overdue = data.invoices.filter((invoice) => /overdue|late/i.test(invoice.status));
  const completed = data.jobs.filter((job) => /complete|done/i.test(job.status));
  const activeWorkers = data.workers.filter((worker) => !/not clocked|inactive|not invited|offline/i.test(worker.status));
  const promises = data.messages.filter((message) => /\b(today|tomorrow|tonight|before|call|send|return|quote|follow up|follow-up)\b/i.test(`${message.subject} ${message.detail}`));
  const unbilled = completed.filter((job) => !data.invoices.some((invoice) => {
    const invoiceText = `${invoice.job} ${invoice.client}`.toLowerCase();
    return (job.title && invoiceText.includes(job.title.toLowerCase())) || (job.client && invoiceText.includes(job.client.toLowerCase()));
  }));
  const invoiceValue = data.invoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  const pressure = Math.min(100, data.command.length * 18 + issues.length * 14 + overdue.length * 12 + promises.length * 4);

  let best = {
    title: "The office is calm",
    reason: "No urgent owner decision is visible in the live records.",
    page: "today",
    label: "View today",
    tone: "calm",
  };

  if (data.command[0]) {
    best = {
      title: `Review ${data.command[0].type}`,
      reason: `${data.command[0].title}${data.command[0].amount ? ` · ${money(data.command[0].amount)}` : ""}. It is prepared and waiting for you.`,
      page: "command",
      label: "Open Command",
      tone: "decision",
    };
  } else if (issues[0]) {
    best = {
      title: `Protect ${issues[0].title}`,
      reason: `${issues[0].issue || issues[0].status || "This job needs checking"}. Check the ripple before the day moves on.`,
      page: "jobs",
      label: "Open jobs",
      tone: "risk",
    };
  } else if (overdue[0]) {
    best = {
      title: `Recover ${money(overdue[0].amount)}`,
      reason: `${overdue[0].number} for ${overdue[0].client || "a client"} is marked overdue.`,
      page: "invoices",
      label: "Open invoices",
      tone: "money",
    };
  } else if (unbilled[0]) {
    best = {
      title: "Check unbilled work",
      reason: `${unbilled[0].title} is complete and no matching invoice was found.`,
      page: "invoices",
      label: "Check missed money",
      tone: "money",
    };
  }

  return { issues, overdue, completed, activeWorkers, promises, unbilled, invoiceValue, pressure, best };
}

const DESKS = [
  { id: "bookings", label: "Bookings", page: "jobs", note: "Requests, timing and recurring work" },
  { id: "field", label: "Field", page: "workers", note: "Workers, progress and proof" },
  { id: "clients", label: "Clients", page: "clients", note: "History, promises and follow-ups" },
  { id: "money", label: "Money", page: "invoices", note: "Invoices, overdue work and revenue" },
  { id: "quality", label: "Quality", page: "jobs", note: "Completion, proof and exceptions" },
  { id: "owner", label: "Owner", page: "command", note: "Approve, edit or park" },
];

function deskCount(id, data, signals) {
  if (id === "bookings") return data.jobs.length;
  if (id === "field") return signals.activeWorkers.length;
  if (id === "clients") return signals.promises.length;
  if (id === "money") return signals.overdue.length + signals.unbilled.length;
  if (id === "quality") return signals.issues.length;
  return data.command.length;
}

function answerFor(raw, data, signals) {
  const prompt = clean(raw).toLowerCase();
  if (!prompt) return null;

  if (/fix today|sort today|recovery|sick|rain|breakdown|running late/.test(prompt)) {
    return {
      kicker: "Recovery pack",
      title: signals.issues.length ? `${signals.issues.length} job exception${signals.issues.length === 1 ? "" : "s"} need a recovery check` : "No live disruption is visible",
      lines: [
        `${signals.activeWorkers.length} active worker${signals.activeWorkers.length === 1 ? "" : "s"} are visible.`,
        `${signals.promises.length} client promise${signals.promises.length === 1 ? "" : "s"} may need protecting.`,
        "Churvox would prepare reassignment options, affected messages and the money impact as one Command pack.",
      ],
      page: signals.issues.length ? "jobs" : "today",
      action: signals.issues.length ? "Inspect affected jobs" : "View today",
      footer: "Nothing has been changed or sent.",
    };
  }

  if (/missed money|unbilled|ghost work|extra work/.test(prompt)) {
    return {
      kicker: "Missed money",
      title: signals.unbilled.length ? `${signals.unbilled.length} completed job${signals.unbilled.length === 1 ? "" : "s"} may be unbilled` : "No obvious unbilled completed jobs found",
      lines: signals.unbilled.length
        ? signals.unbilled.slice(0, 4).map((job) => `${job.title}${job.client ? ` · ${job.client}` : ""}${job.price ? ` · ${money(job.price)}` : ""}`)
        : ["Churvox compared completed jobs with the current invoice records."],
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
        : [`Current invoice value is ${money(signals.invoiceValue)}.`],
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
    const scheduledValue = data.jobs.reduce((sum, job) => sum + job.price, 0);
    return {
      kicker: "Ripple preview",
      title: `${data.jobs.length} job${data.jobs.length === 1 ? "" : "s"} would be checked before a move`,
      lines: [
        `${money(scheduledValue)} of job value is visible in the current set.`,
        `${signals.activeWorkers.length} active worker${signals.activeWorkers.length === 1 ? "" : "s"} and ${signals.promises.length} client promise${signals.promises.length === 1 ? "" : "s"} could be touched.`,
        "Churvox would compare load, promises, travel and invoice timing before preparing options.",
      ],
      page: "jobs",
      action: "Open run sheet",
      footer: "Ripple Preview explains consequences before the owner approves a move.",
    };
  }

  return {
    kicker: "One best move",
    title: signals.best.title,
    lines: [
      signals.best.reason,
      `${data.command.length} Command item${data.command.length === 1 ? "" : "s"}, ${signals.issues.length} job exception${signals.issues.length === 1 ? "" : "s"}, ${signals.overdue.length} overdue invoice${signals.overdue.length === 1 ? "" : "s"}.`,
    ],
    page: signals.best.page,
    action: signals.best.label,
    footer: "Churvox ranks the move; the owner remains in control.",
  };
}

function OfficeModal({ data, signals, close }) {
  return <div className="cv4Layer" role="dialog" aria-modal="true" aria-label="Churvox live office">
    <section className="cv4Twin">
      <header className="cv4TwinHead">
        <div><small>Live Office Twin</small><h2>Your whole business, working as one office.</h2><p>Every desk is driven by live Churvox records.</p></div>
        <button type="button" onClick={close}>Close office</button>
      </header>
      <div className="cv4Floor">
        <div className="cv4Brain"><span /><small>Churvox office brain</small><b>{signals.pressure ? `${signals.pressure}% pressure` : "Office calm"}</b><p>{signals.best.title}</p></div>
        {DESKS.map((desk, index) => <button key={desk.id} type="button" className={`cv4Desk desk-${index + 1}`} onClick={() => { go(desk.page); close(); }}>
          <i /><small>{desk.label} desk</small><b>{deskCount(desk.id, data, signals)}</b><p>{desk.note}</p><em>Open desk</em>
        </button>)}
        <div className="cv4OwnerSeat"><span /><b>Owner</b><small>Only real decisions reach this desk</small></div>
      </div>
      <footer className="cv4TwinFooter">
        <span><b>{data.jobs.length}</b> jobs connected</span>
        <span><b>{signals.activeWorkers.length}</b> workers active</span>
        <span><b>{signals.promises.length}</b> promises watched</span>
        <span><b>{signals.unbilled.length}</b> money checks</span>
        <span><b>{data.command.length}</b> decisions</span>
      </footer>
    </section>
  </div>;
}

function HandoverModal({ data, signals, close }) {
  return <div className="cv4Layer" role="dialog" aria-modal="true" aria-label="Churvox office handover">
    <section className="cv4Handover">
      <header><div><small>Live office handover</small><h2>Here is what the business needs now.</h2></div><button type="button" onClick={close}>Close</button></header>
      <div className={`cv4Best ${signals.best.tone}`}><small>One best move</small><h3>{signals.best.title}</h3><p>{signals.best.reason}</p><button type="button" onClick={() => { go(signals.best.page); close(); }}>{signals.best.label}</button></div>
      <div className="cv4HandoverGrid">
        <article><small>Work</small><b>{data.jobs.length}</b><p>{signals.completed.length} complete · {signals.issues.length} need checking</p></article>
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

function TellModal({ data, signals, close }) {
  const [prompt, setPrompt] = React.useState("");
  const [answer, setAnswer] = React.useState(null);
  const ask = (value = prompt) => {
    setPrompt(value);
    setAnswer(answerFor(value, data, signals));
  };

  return <div className="cv4Layer alignRight" role="dialog" aria-modal="true" aria-label="Tell Churvox">
    <aside className="cv4Tell">
      <header><div><small>Tell Churvox</small><h2>Ask the whole office.</h2><p>Churvox checks connected records and prepares the next move. Nothing executes here.</p></div><button type="button" onClick={close}>Close</button></header>
      <div className="cv4Prompt"><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Try: Sam is sick tomorrow. Sort it out." rows={3} /><button type="button" onClick={() => ask()}>Prepare answer</button></div>
      <div className="cv4Quick">{["What needs me?", "Fix today", "Show missed money", "What promises have we made?", "Show overdue invoices", "What happens if I move tomorrow?"].map((item) => <button type="button" key={item} onClick={() => ask(item)}>{item}</button>)}</div>
      {answer ? <section className="cv4Answer"><small>{answer.kicker}</small><h3>{answer.title}</h3><div>{answer.lines.map((line, index) => <p key={`${line}-${index}`}>{line}</p>)}</div><button type="button" onClick={() => { go(answer.page); close(); }}>{answer.action}</button><footer>{answer.footer}</footer></section> : <section className="cv4Answer empty"><span className="cv4Pulse" /><h3>The office is listening.</h3><p>Ask about work, people, money, promises or a disruption.</p></section>}
    </aside>
  </div>;
}

export default function ProductAppV4() {
  const { user } = useAuth();
  const { data, loading } = useLiveOffice(Boolean(user));
  const signals = React.useMemo(() => buildSignals(data), [data]);
  const [page, setPage] = React.useState(pageNow);
  const [officeOpen, setOfficeOpen] = React.useState(false);
  const [handoverOpen, setHandoverOpen] = React.useState(false);
  const [tellOpen, setTellOpen] = React.useState(false);

  React.useEffect(() => {
    const sync = () => setPage(pageNow());
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);

  return <div className="cv4Experience" data-version="CHURVOX_LIVE_OFFICE_TWIN_20260724">
    <div className="cv4Backdrop" aria-hidden="true"><span className="room a" /><span className="room b" /><span className="room c" /><span className="corridor" /></div>
    <ProductAppV3 />
    <div className="cv4Dock" aria-label="Churvox live office controls">
      <button type="button" className="cv4OfficeButton" onClick={() => setOfficeOpen(true)}><span className={loading ? "loading" : signals.pressure > 55 ? "busy" : ""} /><b>Live office</b><small>{loading ? "Connecting records" : `${signals.pressure}% pressure · ${data.command.length} decisions`}</small></button>
      <button type="button" className={`cv4Move ${signals.best.tone}`} onClick={() => setHandoverOpen(true)}><small>One best move</small><b>{signals.best.title}</b><span>{signals.best.reason}</span></button>
      <div className="cv4DeskStrip">{DESKS.map((desk) => <button key={desk.id} type="button" className={page === desk.page ? "active" : ""} onClick={() => go(desk.page)} title={desk.note}><span>{deskCount(desk.id, data, signals)}</span><b>{desk.label}</b></button>)}</div>
      <button type="button" className="cv4TellButton" onClick={() => setTellOpen(true)}><span>+</span><b>Tell Churvox</b></button>
    </div>
    {officeOpen ? <OfficeModal data={data} signals={signals} close={() => setOfficeOpen(false)} /> : null}
    {handoverOpen ? <HandoverModal data={data} signals={signals} close={() => setHandoverOpen(false)} /> : null}
    {tellOpen ? <TellModal data={data} signals={signals} close={() => setTellOpen(false)} /> : null}
  </div>;
}
