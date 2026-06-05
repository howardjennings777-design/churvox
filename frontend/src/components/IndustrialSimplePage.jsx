import React from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import {
  industrialAction,
  industrialChip,
  industrialContentLane,
  industrialGhost,
  industrialPageShell,
  industrialPanel,
} from "./industrialCommandTheme";

const configs = {
  command: { endpoint: null, title: "Churvox does the admin. You approve.", kicker: "Command Board", subtitle: "One place to see what needs doing, what AI prepared, who is on a job, and what button to press next.", create: "/jobs/new", createLabel: "Create job", detail: (x) => x.href || "/dashboard", samples: [{ title: "Review today’s work", status: "ready", href: "/jobs" }, { title: "Check invoices", status: "approval ready", href: "/invoices" }, { title: "Assign open jobs", status: "needs action", href: "/crew-map" }] },
  notifications: { endpoint: "/notifications", title: "Notifications that need action.", kicker: "Notifications", subtitle: "See job updates, approvals, alerts and owner actions without leaving the Command Desk.", create: "/dashboard", createLabel: "Command Board", detail: (x) => x.href || x.url || "/dashboard", samples: [{ title: "Worker completed a job", status: "new", href: "/jobs" }, { title: "Invoice ready for review", status: "approval", href: "/invoices" }, { title: "Job needs assigning", status: "attention", href: "/crew-map" }] },
  jobs: { endpoint: "/jobs", title: "Keep every job moving.", kicker: "Jobs", subtitle: "See what needs assigning, what is in progress, and what is ready for review or invoice.", create: "/jobs/new", createLabel: "Create job", detail: (x) => `/jobs/${idOf(x)}`, samples: [{ title: "Rental lawn service", client_name: "Green Street Rentals", status: "in_progress" }, { title: "Hedge trim", client_name: "Sarah Williams", status: "assigned" }] },
  clients: { endpoint: "/clients", title: "Clients, jobs and history together.", kicker: "Clients", subtitle: "Keep customer details, addresses and job history in one simple command view.", create: "/clients/new", createLabel: "Add client", detail: (x) => `/clients/${idOf(x)}`, samples: [{ name: "Green Street Rentals", email: "owner@example.com", status: "ready" }, { name: "Sarah Williams", email: "sarah@example.com", status: "ready" }] },
  quotes: { endpoint: "/quotes", title: "Quotes ready to win.", kicker: "Quotes", subtitle: "Track draft quotes, sent quotes and follow-ups in one command view.", create: "/quotes/new", createLabel: "Create quote", detail: (x) => `/quotes/${idOf(x)}`, samples: [{ title: "Rental tidy quote", client_name: "ECB Property Maintenance", status: "draft" }] },
  invoices: { endpoint: "/invoices", title: "Invoices ready to send.", kicker: "Invoices", subtitle: "Review drafts, sent invoices and payment follow-ups before anything leaves Churvox.", create: "/invoices/new", createLabel: "Create invoice", detail: (x) => `/invoices/${idOf(x)}`, samples: [{ title: "Invoice draft", client_name: "Green Street Rentals", status: "draft" }] },
  team: { endpoint: "/team/workers", title: "Crew command centre.", kicker: "Team", subtitle: "Review workers, roles and who is ready for today’s work.", create: "/team", createLabel: "Manage team", detail: () => "/team", samples: [{ name: "Mike", role: "worker", status: "active" }, { name: "Tane", role: "manager", status: "active" }] },
  reports: { endpoint: null, title: "Reports without the mess.", kicker: "Reports", subtitle: "Use this workspace for payroll summaries, job totals and owner handoff reports.", create: "/payroll", createLabel: "Open payroll", detail: () => "/reports", samples: [{ title: "Payroll summary", status: "ready" }, { title: "Job activity", status: "ready" }] },
  plans: { endpoint: null, title: "Choose the command level.", kicker: "Plans", subtitle: "Start simple, then move up when you need more AI Operator capacity, crew control and admin power.", create: "/plans", createLabel: "Current plans", detail: () => "/plans", samples: [{ title: "Start", status: "$39 + GST" }, { title: "Crew", status: "$89 + GST" }, { title: "Operator", status: "$149 + GST" }, { title: "Command", status: "$299 + GST" }] },
  settings: { endpoint: null, title: "Business settings.", kicker: "Settings", subtitle: "Keep business details, plan controls and system preferences tidy.", create: "/plans", createLabel: "View plans", detail: () => "/settings", samples: [{ title: "Business profile", status: "ready" }, { title: "Plan and billing", status: "ready" }] },
  support: { endpoint: null, title: "Support and help.", kicker: "Support", subtitle: "Find help, legal pages and launch support notes.", create: "/dashboard", createLabel: "Back to command", detail: () => "/support", samples: [{ title: "Help centre", status: "ready" }, { title: "Legal links", status: "ready" }] },
  crewMap: { endpoint: "/jobs", title: "Crew map and active work.", kicker: "Crew Map", subtitle: "See active jobs and where the next assignment needs attention.", create: "/jobs/new", createLabel: "Create job", detail: (x) => `/jobs/${idOf(x)}`, samples: [{ title: "Active job tracking", client_name: "Site work", status: "active" }] },
};

const tapeColors = ["#fb923c", "#22d3ee", "#34d399", "#facc15", "#a78bfa", "#f43f5e"];
const tapeFor = (index = 0) => tapeColors[Math.abs(index) % tapeColors.length];

function SecurityTape({ color = "#fb923c" }) {
  return (
    <span
      aria-hidden="true"
      className="absolute left-0 top-0 h-full w-2.5 rounded-l-[30px]"
      style={{
        background: `repeating-linear-gradient(135deg, ${color} 0 10px, rgba(255,255,255,.30) 10px 15px, ${color} 15px 25px)`,
        boxShadow: `0 0 22px ${color}66`,
      }}
    />
  );
}

function listFrom(res) {
  const data = res?.data ?? res;
  if (Array.isArray(data)) return data;
  for (const key of ["notifications", "alerts", "actions", "slips", "jobs", "quotes", "invoices", "clients", "customers", "workers", "team", "items", "results", "data"]) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

function idOf(item) {
  const raw = item?.id || item?._id || item?.client_id || item?.customer_id || item?.job_id || item?.quote_id || item?.invoice_id || item?.user_id || "";
  return typeof raw === "object" && raw?.$oid ? raw.$oid : String(raw || "");
}

function titleOf(item) {
  return item?.title || item?.message || item?.body || item?.job_title || item?.job_name || item?.quote_number || item?.invoice_number || item?.name || item?.full_name || item?.client_name || item?.customer_name || "Open record";
}

function metaOf(item) {
  return [item?.client_name || item?.customer_name || item?.email || item?.phone, item?.address || item?.site_address || item?.street_address, item?.role].filter(Boolean).join(" · ");
}

function statusOf(item) {
  return String(item?.status || item?.type || item?.job_status || item?.quote_status || item?.invoice_status || "ready").replaceAll("_", " ");
}

function lc(value) {
  return String(value || "").toLowerCase();
}

function asMoney(value) {
  const num = Number(value || 0);
  if (!Number.isFinite(num) || num <= 0) return "$0";
  return `$${num.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function first(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== "") || "";
}

function workerName(job) {
  const worker = first(
    job?.assigned_worker_name,
    job?.worker_name,
    job?.assignee_name,
    job?.assigned_to_name,
    job?.assignedWorkerName,
    job?.worker?.name,
    job?.assigned_worker?.name,
    job?.assigned_to,
    job?.employee_name,
    job?.staff_name
  );
  return worker || "Unassigned";
}

function isToday(job) {
  const raw = first(job?.scheduled_at, job?.scheduled_date, job?.date, job?.start_time, job?.job_date);
  if (!raw) return false;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return date.toDateString() === now.toDateString();
}

function isActiveJob(job) {
  const status = lc(statusOf(job));
  return status.includes("progress") || status.includes("started") || status.includes("active") || status.includes("on site") || status.includes("timer");
}

function isCompleted(job) {
  const status = lc(statusOf(job));
  return status.includes("complete") || status.includes("finished") || status.includes("done");
}

function isCancelled(job) {
  const status = lc(statusOf(job));
  return status.includes("cancel") || status.includes("archiv");
}

function invoiceAmount(invoice) {
  return Number(first(invoice?.total, invoice?.amount_due, invoice?.amount, invoice?.subtotal, invoice?.price, 0)) || 0;
}

function SimpleLine({ title, meta, status }) {
  return (
    <div className="rounded-2xl bg-white/10 p-3">
      <div className="text-sm font-black leading-5 text-white">{title}</div>
      {meta ? <div className="mt-1 text-xs font-bold leading-5 text-slate-300">{meta}</div> : null}
      {status ? <div className="mt-2 inline-flex rounded-full bg-white/10 px-2 py-1 text-[10px] font-black uppercase tracking-[.12em] text-amber-300">{status}</div> : null}
    </div>
  );
}

function CommandTile({ label, title, count, text, color, to, actionLabel = "Open", items = [], children }) {
  const body = (
    <>
      <SecurityTape color={color} />
      <div className="flex min-h-full flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">{label}</div>
            <h2 className="mt-2 text-2xl font-black leading-tight tracking-[-0.055em] text-white">{title}</h2>
          </div>
          {count !== undefined ? <div className="rounded-2xl bg-white/10 px-4 py-2 text-3xl font-black text-white">{count}</div> : null}
        </div>
        {text ? <p className="text-sm font-bold leading-6 text-slate-300">{text}</p> : null}
        {items.length ? <div className="grid gap-2">{items.slice(0, 4).map((item, index) => <SimpleLine key={`${item.title || item}-${index}`} {...item} />)}</div> : null}
        {children}
        {to ? <div className="mt-auto inline-flex w-fit rounded-2xl bg-white px-4 py-2 text-sm font-black text-slate-950">{actionLabel}</div> : null}
      </div>
    </>
  );

  const className = "relative min-h-[260px] overflow-hidden rounded-[30px] border border-white/10 bg-[#0f1722] p-5 pl-8 text-white shadow-[0_20px_60px_rgba(2,6,23,.30)]";
  if (!to) return <div className={className}>{body}</div>;
  return <Link to={to} className={`${className} no-underline transition hover:-translate-y-0.5 hover:border-white/20`}>{body}</Link>;
}

function RecordBox({ item, config, index }) {
  return (
    <Link to={config.detail(item)} className="relative block min-h-[145px] overflow-hidden rounded-[30px] border border-white/10 bg-[#0f1722] p-5 pl-8 text-white no-underline shadow-[0_20px_60px_rgba(2,6,23,.30)]">
      <SecurityTape color={tapeFor(index + 3)} />
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">{statusOf(item)}</div>
      <h3 className="mt-2 text-2xl font-black tracking-[-0.05em] text-white">{titleOf(item)}</h3>
      <p className="mt-2 text-sm font-bold leading-6 text-slate-300">{metaOf(item) || "Open the record for full details."}</p>
    </Link>
  );
}

function makeCommandData({ jobs, invoices, quotes, workers, aiActions }) {
  const todayJobs = jobs.filter(isToday);
  const activeJobs = jobs.filter(isActiveJob);
  const unassignedJobs = jobs.filter((job) => workerName(job) === "Unassigned" && !isCompleted(job) && !isCancelled(job));
  const completedReadyInvoice = jobs.filter((job) => isCompleted(job) && !first(job?.invoice_id, job?.invoice_number, job?.invoice_status));

  const draftInvoices = invoices.filter((invoice) => lc(statusOf(invoice)).includes("draft"));
  const readyInvoices = invoices.filter((invoice) => lc(statusOf(invoice)).includes("ready") || lc(statusOf(invoice)).includes("review"));
  const overdueInvoices = invoices.filter((invoice) => lc(statusOf(invoice)).includes("overdue") || Number(invoice?.days_overdue || 0) > 0);
  const paidInvoices = invoices.filter((invoice) => lc(statusOf(invoice)).includes("paid"));
  const outstanding = invoices.filter((invoice) => !lc(statusOf(invoice)).includes("paid")).reduce((sum, invoice) => sum + invoiceAmount(invoice), 0);
  const overdueTotal = overdueInvoices.reduce((sum, invoice) => sum + invoiceAmount(invoice), 0);

  const followQuotes = quotes.filter((quote) => {
    const status = lc(statusOf(quote));
    return status.includes("sent") || status.includes("follow") || status.includes("pending") || status.includes("draft");
  });

  const availableWorkers = workers.filter((worker) => !lc(statusOf(worker)).includes("busy") && !lc(statusOf(worker)).includes("inactive"));
  const activePersonJob = activeJobs[0] || jobs.find((job) => workerName(job) !== "Unassigned" && !isCompleted(job) && !isCancelled(job));

  const prepared = [];
  aiActions.slice(0, 3).forEach((action) => prepared.push({ title: titleOf(action), meta: action?.summary || action?.reason || "AI prepared this action for owner approval.", status: statusOf(action) }));
  unassignedJobs.slice(0, 2).forEach((job) => prepared.push({ title: `Assign worker: ${titleOf(job)}`, meta: metaOf(job) || "AI found a job with no assigned person.", status: "needs owner approval" }));
  completedReadyInvoice.slice(0, 2).forEach((job) => prepared.push({ title: `Create invoice: ${titleOf(job)}`, meta: metaOf(job) || "Completed work is ready to invoice.", status: "invoice ready" }));
  overdueInvoices.slice(0, 2).forEach((invoice) => prepared.push({ title: `Send reminder: ${titleOf(invoice)}`, meta: `${asMoney(invoiceAmount(invoice))} outstanding`, status: "overdue" }));
  followQuotes.slice(0, 2).forEach((quote) => prepared.push({ title: `Follow up quote: ${titleOf(quote)}`, meta: metaOf(quote) || "Quote needs a customer follow-up.", status: "follow-up" }));

  return {
    todayJobs,
    activeJobs,
    unassignedJobs,
    completedReadyInvoice,
    draftInvoices,
    readyInvoices,
    overdueInvoices,
    paidInvoices,
    outstanding,
    overdueTotal,
    followQuotes,
    availableWorkers,
    activePersonJob,
    prepared,
  };
}

function CommandLayout({ config, items, dashboard, loading, open, ready, needs }) {
  const data = makeCommandData(dashboard);
  const person = data.activePersonJob;
  const personItems = person
    ? [{ title: workerName(person), meta: `${titleOf(person)}${metaOf(person) ? ` · ${metaOf(person)}` : ""}`, status: statusOf(person) }]
    : data.unassignedJobs.slice(0, 2).map((job) => ({ title: "No person assigned", meta: titleOf(job), status: "assign now" }));

  return (
    <main className={industrialPageShell} data-industrial-simple-page="command" data-command-canvas>
      <section className={`${industrialContentLane} space-y-6`}>
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[#0f1722] p-6 pl-8 text-white shadow-[0_24px_76px_rgba(2,6,23,.34)] md:p-8 md:pl-10">
            <SecurityTape color="#fb923c" />
            <span className={industrialChip}>{config.kicker}</span>
            <h1 className="mt-5 max-w-4xl text-4xl font-black leading-[0.92] tracking-[-0.075em] text-white md:text-6xl">{config.title}</h1>
            <p className="mt-5 max-w-3xl text-sm font-semibold leading-6 text-slate-300 md:text-base">{config.subtitle}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/ai-operator" className={`rounded-2xl px-5 py-3 text-sm font-black ${industrialAction}`}>Review AI actions</Link>
              <Link to="/jobs/new" className={`rounded-2xl px-5 py-3 text-sm font-black ${industrialGhost}`}>Create job</Link>
            </div>
          </div>

          <CommandTile
            label="AI Priority"
            title="What needs approval"
            count={data.prepared.length || needs}
            text="AI has grouped the work that needs owner attention. Check these first."
            color="#22d3ee"
            to="/ai-operator"
            actionLabel="Open approvals"
            items={data.prepared.slice(0, 3)}
          />
        </section>

        <section className="grid gap-5 xl:grid-cols-3">
          <CommandTile label="Today’s jobs" title="Jobs happening today" count={data.todayJobs.length || open} text="See what is scheduled, started, finished, or stuck today." color="#facc15" to="/jobs" actionLabel="Open jobs" items={(data.todayJobs.length ? data.todayJobs : items).slice(0, 3).map((job) => ({ title: titleOf(job), meta: `${workerName(job)}${metaOf(job) ? ` · ${metaOf(job)}` : ""}`, status: statusOf(job) }))} />
          <CommandTile label="Invoices" title="Money waiting" count={data.readyInvoices.length + data.draftInvoices.length + data.overdueInvoices.length} text={`${data.readyInvoices.length} ready, ${data.draftInvoices.length} draft, ${data.overdueInvoices.length} overdue.`} color="#34d399" to="/invoices" actionLabel="Open invoices" items={[...data.overdueInvoices, ...data.readyInvoices, ...data.draftInvoices].slice(0, 3).map((invoice) => ({ title: titleOf(invoice), meta: asMoney(invoiceAmount(invoice)), status: statusOf(invoice) }))} />
          <CommandTile label="Person on job" title="Who is working now" count={person ? 1 : data.unassignedJobs.length} text={person ? "Someone is currently assigned/on a job." : "No current person found on a job. Assign these next."} color="#a78bfa" to="/crew-map" actionLabel="Open crew" items={personItems} />
        </section>

        <section className="grid gap-5 xl:grid-cols-3">
          <CommandTile label="Jobs needing action" title="Fix these jobs" count={data.unassignedJobs.length + data.completedReadyInvoice.length} text="Jobs Churvox found that need an assignment, invoice, or owner check." color="#fb923c" to="/jobs" actionLabel="Open job list" items={[...data.unassignedJobs.map((job) => ({ title: `Assign: ${titleOf(job)}`, meta: metaOf(job) || "No worker assigned", status: statusOf(job) })), ...data.completedReadyInvoice.map((job) => ({ title: `Invoice: ${titleOf(job)}`, meta: metaOf(job) || "Completed work", status: "ready to invoice" }))].slice(0, 4)} />
          <CommandTile label="Crew" title="Capacity check" count={data.availableWorkers.length} text={`${data.activeJobs.length} job${data.activeJobs.length === 1 ? "" : "s"} active. ${data.availableWorkers.length} worker${data.availableWorkers.length === 1 ? "" : "s"} available or not marked busy.`} color="#22d3ee" to="/team" actionLabel="Open team" items={data.availableWorkers.slice(0, 3).map((worker) => ({ title: titleOf(worker), meta: first(worker?.role, worker?.email, worker?.phone, "Crew member"), status: statusOf(worker) }))} />
          <CommandTile label="Quotes" title="Follow-ups to win" count={data.followQuotes.length} text="Quotes that may need a follow-up before they go cold." color="#facc15" to="/quotes" actionLabel="Open quotes" items={data.followQuotes.slice(0, 4).map((quote) => ({ title: titleOf(quote), meta: metaOf(quote) || first(quote?.customer_name, quote?.client_name, "Customer follow-up"), status: statusOf(quote) }))} />
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <CommandTile label="Ready for invoice" title="Completed work not billed" count={data.completedReadyInvoice.length} text="Completed jobs Churvox found that look ready to turn into draft invoices." color="#34d399" to="/invoices/new" actionLabel="Create invoice" items={data.completedReadyInvoice.slice(0, 4).map((job) => ({ title: titleOf(job), meta: `${workerName(job)}${metaOf(job) ? ` · ${metaOf(job)}` : ""}`, status: "draft invoice needed" }))} />
          <CommandTile label="Cash flow" title="Money snapshot" count={asMoney(data.outstanding)} text={`${asMoney(data.overdueTotal)} overdue. ${data.paidInvoices.length} paid invoice${data.paidInvoices.length === 1 ? "" : "s"} found.`} color="#f43f5e" to="/money-desk" actionLabel="Open money desk">
            <div className="grid gap-2 sm:grid-cols-3">
              <SimpleLine title={asMoney(data.outstanding)} meta="Outstanding" status="unpaid" />
              <SimpleLine title={asMoney(data.overdueTotal)} meta="Overdue" status="chase" />
              <SimpleLine title={String(data.paidInvoices.length)} meta="Paid invoices" status="paid" />
            </div>
          </CommandTile>
        </section>
      </section>
    </main>
  );
}

export default function IndustrialSimplePage({ kind }) {
  const config = configs[kind] || configs.jobs;
  const { get } = useApi();
  const [items, setItems] = React.useState(config.samples || []);
  const [loading, setLoading] = React.useState(Boolean(config.endpoint || kind === "command"));
  const [dashboard, setDashboard] = React.useState({ jobs: [], invoices: [], quotes: [], workers: [], aiActions: [] });

  React.useEffect(() => {
    let alive = true;
    async function load() {
      if (kind === "command") {
        setLoading(true);
        const [jobsRes, invoicesRes, quotesRes, workersRes, aiRes] = await Promise.allSettled([
          get("/jobs"),
          get("/invoices"),
          get("/quotes"),
          get("/team/workers"),
          get("/ai/operator/slips"),
        ]);
        if (!alive) return;
        const jobs = jobsRes.status === "fulfilled" ? listFrom(jobsRes.value) : [];
        const invoices = invoicesRes.status === "fulfilled" ? listFrom(invoicesRes.value) : [];
        const quotes = quotesRes.status === "fulfilled" ? listFrom(quotesRes.value) : [];
        const workers = workersRes.status === "fulfilled" ? listFrom(workersRes.value) : [];
        const aiActions = aiRes.status === "fulfilled" ? listFrom(aiRes.value) : [];
        const fallback = config.samples || [];
        setDashboard({ jobs, invoices, quotes, workers, aiActions });
        setItems(jobs.length ? jobs : fallback);
        setLoading(false);
        return;
      }

      if (!config.endpoint) return;
      setLoading(true);
      const res = await get(config.endpoint);
      if (!alive) return;
      const rows = res?.success ? listFrom(res) : [];
      setItems(rows.length ? rows : config.samples || []);
      setLoading(false);
    }
    load();
    return () => { alive = false; };
  }, [config.endpoint, config.samples, get, kind]);

  const open = items.length;
  const ready = items.filter((item) => /ready|sent|active|assigned|progress|approval/i.test(statusOf(item))).length;
  const needs = Math.max(open - ready, 0);

  if (kind === "command") {
    return <CommandLayout config={config} items={items} dashboard={dashboard} loading={loading} open={open} ready={ready} needs={needs} />;
  }

  return (
    <main className={industrialPageShell} data-industrial-simple-page={kind} data-command-canvas>
      <section className={industrialContentLane}>
        <section className="grid gap-5 xl:grid-cols-[1fr_390px]">
          <div className={`rounded-[30px] ${industrialPanel} p-6 md:p-8`}>
            <span className={industrialChip}>{config.kicker}</span>
            <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[0.92] tracking-[-0.075em] text-white md:text-6xl">{config.title}</h1>
            <p className="mt-5 max-w-2xl text-sm font-semibold leading-6 text-slate-300 md:text-base">{config.subtitle}</p>
            <div className="mt-5 flex flex-wrap gap-3"><Link to={config.create} className={`rounded-2xl px-5 py-3 text-sm font-black ${industrialAction}`}>{config.createLabel}</Link><Link to="/dashboard" className={`rounded-2xl px-5 py-3 text-sm font-black ${industrialGhost}`}>Command Board</Link></div>
          </div>
          <div className={`rounded-[30px] ${industrialPanel} p-5`}><div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">Health</div><div className="mt-5 grid gap-3"><div className={`rounded-[22px] ${industrialPanel} p-4`}><div className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">Open</div><div className="mt-3 text-3xl font-black tracking-[-0.06em] text-white">{open}</div></div><div className={`rounded-[22px] ${industrialPanel} p-4`}><div className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">Ready</div><div className="mt-3 text-3xl font-black tracking-[-0.06em] text-white">{ready}</div></div><div className={`rounded-[22px] ${industrialPanel} p-4`}><div className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">Needs review</div><div className="mt-3 text-3xl font-black tracking-[-0.06em] text-white">{needs}</div></div></div></div>
        </section>
        <section className={`mt-5 rounded-[28px] ${industrialPanel} p-5`}>
          <div className="mb-5 flex items-end justify-between gap-4"><div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">Records</div><h2 className="mt-2 text-3xl font-black tracking-[-0.06em] text-white">Open {config.kicker}</h2></div>{loading && <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-slate-300">Loading…</span>}</div>
          <div className="grid gap-4 xl:grid-cols-2">
            {items.map((item, index) => <RecordBox key={idOf(item) || index} item={item} config={config} index={index} />)}
          </div>
        </section>
      </section>
    </main>
  );
}
