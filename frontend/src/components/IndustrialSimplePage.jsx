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

const tileStyle = {
  background: "linear-gradient(135deg, #111827, #070d16)",
  color: "#ffffff",
  boxShadow: "0 18px 46px rgba(2,6,23,.26), inset 0 1px 0 rgba(255,255,255,.06)",
};

const tapeColors = ["#fb923c", "#22d3ee", "#34d399", "#facc15", "#a78bfa", "#f43f5e"];

const configs = {
  command: {
    endpoint: null,
    kicker: "Command Board",
    title: "Churvox does the admin. You approve.",
    subtitle: "One place to see what needs doing, what Churvox prepared, and which exact job, invoice or quote needs your decision.",
    create: "/jobs/new",
    createLabel: "Create job",
    detail: () => "/dashboard",
    samples: [
      { title: "Review today’s work", status: "ready", href: "/jobs" },
      { title: "Check invoices", status: "approval ready", href: "/invoices" },
      { title: "Assign open jobs", status: "needs action", href: "/crew-map" },
    ],
  },
  notifications: { endpoint: "/notifications", kicker: "Notifications", title: "Notifications that need action.", subtitle: "See job updates, approvals and alerts without leaving the Command Desk.", create: "/dashboard", createLabel: "Command Board", detail: (x) => x.href || x.url || "/dashboard", samples: [{ title: "Worker completed a job", status: "new", href: "/jobs" }] },
  jobs: { endpoint: "/jobs", kicker: "Jobs", title: "Keep every job moving.", subtitle: "See what needs assigning, what is in progress, and what is ready for review or invoice.", create: "/jobs/new", createLabel: "Create job", detail: (x) => `/jobs/${idOf(x)}`, samples: [{ title: "Rental lawn service", client_name: "Green Street Rentals", status: "in_progress" }, { title: "Hedge trim", client_name: "Sarah Williams", status: "assigned" }] },
  clients: { endpoint: "/clients", kicker: "Clients", title: "Clients, jobs and history together.", subtitle: "Keep customer details, addresses and job history in one simple command view.", create: "/clients/new", createLabel: "Add client", detail: (x) => `/clients/${idOf(x)}`, samples: [{ name: "Green Street Rentals", email: "owner@example.com", status: "ready" }] },
  quotes: { endpoint: "/quotes", kicker: "Quotes", title: "Quotes ready to win.", subtitle: "Track draft quotes, sent quotes and follow-ups in one command view.", create: "/quotes/new", createLabel: "Create quote", detail: (x) => `/quotes/${idOf(x)}`, samples: [{ title: "Rental tidy quote", client_name: "ECB Property Maintenance", status: "draft" }] },
  invoices: { endpoint: "/invoices", kicker: "Invoices", title: "Invoices ready to send.", subtitle: "Review drafts, sent invoices and payment follow-ups before anything leaves Churvox.", create: "/invoices/new", createLabel: "Create invoice", detail: (x) => `/invoices/${idOf(x)}`, samples: [{ title: "Invoice draft", client_name: "Green Street Rentals", status: "draft" }] },
  team: { endpoint: "/team/workers", kicker: "Team", title: "Crew command centre.", subtitle: "Review workers, roles and who is ready for today’s work.", create: "/team", createLabel: "Manage team", detail: () => "/team", samples: [{ name: "Mike", role: "worker", status: "active" }] },
  reports: { endpoint: null, kicker: "Reports", title: "Reports without the mess.", subtitle: "Use this workspace for payroll summaries, job totals and owner handoff reports.", create: "/payroll", createLabel: "Open payroll", detail: () => "/reports", samples: [{ title: "Payroll summary", status: "ready" }] },
  plans: { endpoint: null, kicker: "Plans", title: "Choose the command level.", subtitle: "Start simple, then move up when you need more AI Operator capacity, crew control and admin power.", create: "/plans", createLabel: "Current plans", detail: () => "/plans", samples: [{ title: "Start", status: "$39 + GST" }, { title: "Crew", status: "$89 + GST" }, { title: "Operator", status: "$149 + GST" }, { title: "Command", status: "$299 + GST" }] },
  settings: { endpoint: null, kicker: "Settings", title: "Business settings.", subtitle: "Keep business details, plan controls and system preferences tidy.", create: "/plans", createLabel: "View plans", detail: () => "/settings", samples: [{ title: "Business profile", status: "ready" }] },
  support: { endpoint: null, kicker: "Support", title: "Support and help.", subtitle: "Find help, legal pages and launch support notes.", create: "/dashboard", createLabel: "Back to command", detail: () => "/support", samples: [{ title: "Help centre", status: "ready" }] },
  crewMap: { endpoint: "/jobs", kicker: "Crew Map", title: "Crew map and active work.", subtitle: "See active jobs and where the next assignment needs attention.", create: "/jobs/new", createLabel: "Create job", detail: (x) => `/jobs/${idOf(x)}`, samples: [{ title: "Active job tracking", client_name: "Site work", status: "active" }] },
};

const emptySlips = {
  approvals: [
    slipItem("Daily admin check complete", "AI checked jobs, invoices, quotes and crew capacity.", "ready", "Command", "/dashboard", { Reason: "Nothing urgent is blocked right now." }),
    slipItem("Next best action", "Create a job, invoice or quote so Churvox has live admin to prepare.", "next", "Command", "/jobs/new", { Reason: "New records create useful approval slips." }),
  ],
  invoices: [
    slipItem("Invoice queue checked", "No invoice is waiting for approval right now.", "clear", "Invoice", "/invoices", { Next: "Completed jobs will appear here as draft invoices." }),
    slipItem("Payment follow-ups", "Overdue invoice reminders stay approval-first before sending.", "watching", "Invoice", "/invoices", { Rule: "Nothing is sent without owner approval." }),
  ],
  person: [
    slipItem("No active worker on a job", "Assign a worker when the next job is ready to go.", "checked", "Crew", "/team", { Next: "Worker assignment slips appear when jobs need people." }),
  ],
  jobs: [
    slipItem("No blocked jobs found", "Jobs needing assignment, invoice or owner check will appear here.", "clear", "Job", "/jobs", { Next: "Create or assign a job." }),
  ],
  crew: [
    slipItem("Crew capacity checked", "No busy crew issue is showing right now.", "ready", "Crew", "/team", { Next: "Invite crew or assign jobs to build availability data." }),
  ],
  quotes: [
    slipItem("Quote follow-ups checked", "No quote follow-up is waiting right now.", "clear", "Quote", "/quotes", { Next: "Create a quote and Churvox will prepare the follow-up." }),
  ],
  completed: [
    slipItem("Completed work checked", "No completed job is waiting for invoice right now.", "clear", "Job", "/jobs", { Next: "Completed jobs will appear here for draft invoice review." }),
  ],
};

function listFrom(res) {
  const data = res?.data ?? res;
  if (Array.isArray(data)) return data;
  for (const key of ["notifications", "alerts", "actions", "slips", "jobs", "quotes", "invoices", "clients", "customers", "workers", "team", "items", "results", "data"]) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

function first(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== "") || "";
}
function lc(value) { return String(value || "").toLowerCase(); }
function idOf(item) {
  const raw = item?.id || item?._id || item?.client_id || item?.customer_id || item?.job_id || item?.quote_id || item?.invoice_id || item?.user_id || "";
  return typeof raw === "object" && raw?.$oid ? raw.$oid : String(raw || "");
}
function titleOf(item) { return first(item?.title, item?.message, item?.body, item?.job_title, item?.job_name, item?.quote_number, item?.invoice_number, item?.name, item?.full_name, item?.client_name, item?.customer_name, "Open record"); }
function metaOf(item) { return [item?.client_name || item?.customer_name, item?.email || item?.phone, item?.address || item?.site_address || item?.street_address, item?.role].filter(Boolean).join(" · "); }
function statusOf(item) { return String(first(item?.status, item?.type, item?.job_status, item?.quote_status, item?.invoice_status, "ready")).replaceAll("_", " "); }
function money(value) { const num = Number(value || 0); return Number.isFinite(num) && num > 0 ? `$${num.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "$0"; }
function workerName(job) { return first(job?.assigned_worker_name, job?.worker_name, job?.assignee_name, job?.assigned_to_name, job?.assignedWorkerName, job?.worker?.name, job?.assigned_worker?.name, job?.assigned_to, job?.employee_name, job?.staff_name, "Unassigned"); }
function isToday(job) { const raw = first(job?.scheduled_at, job?.scheduled_date, job?.date, job?.start_time, job?.job_date); if (!raw) return false; const date = new Date(raw); return !Number.isNaN(date.getTime()) && date.toDateString() === new Date().toDateString(); }
function isActiveJob(job) { const status = lc(statusOf(job)); return status.includes("progress") || status.includes("started") || status.includes("active") || status.includes("on site") || status.includes("timer"); }
function isCompleted(job) { const status = lc(statusOf(job)); return status.includes("complete") || status.includes("finished") || status.includes("done"); }
function isCancelled(job) { const status = lc(statusOf(job)); return status.includes("cancel") || status.includes("archiv"); }
function invoiceAmount(invoice) { return Number(first(invoice?.total, invoice?.amount_due, invoice?.amount, invoice?.subtotal, invoice?.price, 0)) || 0; }

function slipItem(title, meta, status, kind = "Slip", pagePath = "/dashboard", details = {}, raw = null) {
  return {
    id: `${kind}-${title}-${meta}`,
    title,
    meta,
    status,
    kind,
    pagePath,
    details,
    raw,
  };
}

function jobSlip(job, reason = "Review this job") {
  return slipItem(
    titleOf(job),
    [workerName(job), metaOf(job)].filter(Boolean).join(" · ") || reason,
    statusOf(job),
    "Job",
    idOf(job) ? `/jobs/${idOf(job)}` : "/jobs",
    {
      Client: first(job?.client_name, job?.customer_name, "Not saved"),
      Worker: workerName(job),
      Address: first(job?.address, job?.site_address, job?.street_address, "Not saved"),
      Scheduled: first(job?.scheduled_date, job?.scheduled_at, job?.date, "Not set"),
      Price: money(first(job?.price, job?.total, job?.amount, 0)),
      Reason: reason,
    },
    job,
  );
}

function invoiceSlip(invoice, reason = "Review this invoice") {
  return slipItem(
    titleOf(invoice),
    [first(invoice?.client_name, invoice?.customer_name), money(invoiceAmount(invoice))].filter(Boolean).join(" · ") || reason,
    statusOf(invoice),
    "Invoice",
    idOf(invoice) ? `/invoices/${idOf(invoice)}` : "/invoices",
    {
      Client: first(invoice?.client_name, invoice?.customer_name, "Not saved"),
      Amount: money(invoiceAmount(invoice)),
      Status: statusOf(invoice),
      Due: first(invoice?.due_date, invoice?.date_due, "Not set"),
      Reason: reason,
    },
    invoice,
  );
}

function quoteSlip(quote, reason = "Review this quote") {
  return slipItem(
    titleOf(quote),
    [first(quote?.client_name, quote?.customer_name), money(first(quote?.total, quote?.price, quote?.amount, 0))].filter(Boolean).join(" · ") || reason,
    statusOf(quote),
    "Quote",
    idOf(quote) ? `/quotes/${idOf(quote)}` : "/quotes",
    {
      Client: first(quote?.client_name, quote?.customer_name, "Not saved"),
      Amount: money(first(quote?.total, quote?.price, quote?.amount, 0)),
      Status: statusOf(quote),
      Reason: reason,
    },
    quote,
  );
}

function workerSlip(worker, reason = "Review this worker") {
  return slipItem(
    titleOf(worker),
    first(worker?.role, worker?.email, worker?.phone, reason),
    statusOf(worker),
    "Crew",
    "/team",
    {
      Role: first(worker?.role, "Worker"),
      Email: first(worker?.email, "Not saved"),
      Phone: first(worker?.phone, "Not saved"),
      Reason: reason,
    },
    worker,
  );
}

function SecurityTape({ color = "#fb923c" }) {
  return <span aria-hidden="true" className="absolute left-0 top-0 h-full w-2.5 rounded-l-[26px]" style={{ background: `repeating-linear-gradient(135deg, ${color} 0 10px, rgba(255,255,255,.30) 10px 15px, ${color} 15px 25px)`, boxShadow: `0 0 18px ${color}66` }} />;
}

function CommandLine({ item, onOpen }) {
  return (
    <button type="button" onClick={() => onOpen(item)} className="w-full rounded-2xl border border-white/10 bg-white/10 p-3 text-left transition hover:border-cyan-300/40 hover:bg-white/15 active:scale-[0.99]">
      <div className="truncate text-sm font-black leading-5 text-white">{item.title}</div>
      {item.meta ? <div className="mt-1 line-clamp-2 text-xs font-bold leading-5 text-slate-300">{item.meta}</div> : null}
      <div className="mt-2 inline-flex rounded-full bg-white/10 px-2 py-1 text-[10px] font-black uppercase tracking-[.12em] text-amber-300">{item.status || "prepared"}</div>
    </button>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
      <div className="text-[10px] font-black uppercase tracking-[.16em] text-amber-300">{label}</div>
      <div className="mt-2 text-sm font-black leading-6 text-white">{String(value || "Not saved")}</div>
    </div>
  );
}

function FullscreenSlip({ item, mode, approved, onClose, onApprove, onMode }) {
  const [draft, setDraft] = React.useState("");
  React.useEffect(() => {
    if (!item) return;
    const detailText = Object.entries(item.details || {}).map(([key, value]) => `${key}: ${value}`).join("\n");
    setDraft(`${item.title}\n${item.meta || ""}\n${detailText}`.trim());
  }, [item]);
  if (!item) return null;
  const isEdit = mode === "edit";
  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-950/92 p-3 text-white backdrop-blur-xl md:p-6" role="dialog" aria-modal="true">
      <div className="mx-auto flex min-h-[calc(100vh-24px)] max-w-6xl flex-col overflow-hidden rounded-[34px] border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-2xl md:min-h-[calc(100vh-48px)]">
        <header className="flex items-start justify-between gap-4 border-b border-white/10 p-5 md:p-7">
          <div>
            <div className="inline-flex rounded-full bg-amber-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">Full-screen slip</div>
            <div className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">{item.kind}</div>
            <h2 className="mt-2 text-4xl font-black leading-[0.95] tracking-[-0.07em] text-white md:text-6xl">{item.title}</h2>
            <p className="mt-4 max-w-3xl text-sm font-bold leading-6 text-slate-300 md:text-base">{item.meta || "Churvox prepared this exact item for owner approval."}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950">Close</button>
        </header>

        <div className="grid flex-1 gap-5 p-5 md:grid-cols-[1.15fr_.85fr] md:p-7">
          <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">Churvox prepared this exact item</div>
            {isEdit ? (
              <>
                <textarea value={draft} onChange={(event) => setDraft(event.target.value)} className="mt-4 min-h-[330px] w-full rounded-3xl border border-white/10 bg-slate-950/70 p-4 text-sm font-bold leading-6 text-white outline-none" />
                <button type="button" onClick={() => onMode("details")} className="mt-4 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950">Save edit in slip</button>
              </>
            ) : (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {Object.entries(item.details || {}).map(([label, value]) => <DetailRow key={label} label={label} value={value} />)}
              </div>
            )}
          </section>

          
        </div>
      </div>
    </div>
  );
}

function CommandTile({ label, title, count, text, color, to, actionLabel = "Open page", items = [], children, className = "" }) {
  const [selectedSlip, setSelectedSlip] = React.useState(null);
  const [mode, setMode] = React.useState("details");
  const [approvedIds, setApprovedIds] = React.useState({});
  const openSlip = (item, nextMode = "details") => { setSelectedSlip(item); setMode(nextMode); };
  const selectedId = selectedSlip?.id || selectedSlip?.title || "current";
  const approved = Boolean(approvedIds[selectedId]);
  const cardSlip = slipItem(title, text || "Churvox prepared this area for review.", "prepared", label, to, { Summary: text || "Open each item line for exact details." });
  return (
    <>
      <div data-cv-command-tile="true" className={`cv-command-tile relative min-h-[220px] overflow-hidden rounded-[28px] border border-white/10 p-4 pl-7 text-white no-underline ${className}`} style={tileStyle}>
        <SecurityTape color={color} />
        <div className="flex min-h-full flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">{label}</div>
              <h2 className="mt-1 text-[1.35rem] font-black leading-[1.05] tracking-[-0.05em] text-white md:text-2xl">{title}</h2>
            </div>
            {count !== undefined ? <div className="shrink-0 rounded-2xl bg-emerald-400/15 px-3 py-1.5 text-2xl font-black text-white ring-1 ring-emerald-300/25">{count}</div> : null}
          </div>
          {text ? <p className="text-xs font-bold leading-5 text-slate-300 md:text-sm">{text}</p> : null}
          {items.length ? <div className="grid gap-2">{items.slice(0, 3).map((item, index) => <CommandLine key={`${item.id || item.title}-${index}`} item={item} onOpen={openSlip} />)}</div> : null}
          {children}
          <div className="mt-auto flex flex-wrap gap-2 pt-2">
            <button type="button" onClick={() => openSlip(items[0] || cardSlip, "details")} className="rounded-xl bg-emerald-300 px-3 py-2 text-xs font-black text-slate-950">Approve</button>
            <button type="button" onClick={() => openSlip(items[0] || cardSlip, "edit")} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-black text-white ring-1 ring-white/10">Edit</button>
            <button type="button" onClick={() => openSlip(items[0] || cardSlip, "details")} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-black text-white ring-1 ring-white/10">View details</button>
            {to ? <Link to={to} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-950 no-underline">{actionLabel}</Link> : null}
          </div>
        </div>
      </div>
      <FullscreenSlip
        item={selectedSlip}
        mode={mode}
        approved={approved}
        onMode={setMode}
        onClose={() => setSelectedSlip(null)}
        onApprove={() => setApprovedIds((prev) => ({ ...prev, [selectedId]: true }))}
      />
    </>
  );
}

function RecordBox({ item, config, index }) {
  return (
    <Link data-cv-command-tile="true" to={config.detail(item)} className="cv-command-tile relative block min-h-[132px] overflow-hidden rounded-[28px] border border-white/10 p-4 pl-7 text-white no-underline" style={tileStyle}>
      <SecurityTape color={tapeColors[Math.abs(index + 3) % tapeColors.length]} />
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">{statusOf(item)}</div>
      <h3 className="mt-2 text-xl font-black tracking-[-0.05em] text-white">{titleOf(item)}</h3>
      <p className="mt-2 text-sm font-bold leading-5 text-slate-300">{metaOf(item) || "Open the record for full details."}</p>
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
  const followQuotes = quotes.filter((quote) => ["sent", "follow", "pending", "draft"].some((term) => lc(statusOf(quote)).includes(term)));
  const availableWorkers = workers.filter((worker) => !lc(statusOf(worker)).includes("busy") && !lc(statusOf(worker)).includes("inactive"));
  const activePersonJob = activeJobs[0] || jobs.find((job) => workerName(job) !== "Unassigned" && !isCompleted(job) && !isCancelled(job));
  const prepared = [];
  aiActions.slice(0, 3).forEach((action) => prepared.push(slipItem(titleOf(action), action?.summary || action?.reason || "AI prepared this action for owner approval.", statusOf(action), "AI Action", "/ai-operator", { Reason: action?.summary || action?.reason || "Owner approval required." }, action)));
  unassignedJobs.slice(0, 2).forEach((job) => prepared.push(jobSlip(job, "This job needs a worker assigned.")));
  completedReadyInvoice.slice(0, 2).forEach((job) => prepared.push(jobSlip(job, "Completed work looks ready to invoice.")));
  overdueInvoices.slice(0, 2).forEach((invoice) => prepared.push(invoiceSlip(invoice, "This invoice may need a payment reminder.")));
  followQuotes.slice(0, 2).forEach((quote) => prepared.push(quoteSlip(quote, "This quote may need a follow-up.")));
  return { todayJobs, activeJobs, unassignedJobs, completedReadyInvoice, draftInvoices, readyInvoices, overdueInvoices, paidInvoices, outstanding, overdueTotal, followQuotes, availableWorkers, activePersonJob, prepared };
}

function MoneySnapshotTile({ data }) {
  const hasMoney = data.outstanding > 0 || data.overdueTotal > 0 || data.paidInvoices.length > 0;
  const items = [
    slipItem("Outstanding", money(data.outstanding), hasMoney ? "unpaid" : "clear", "Invoice", "/invoices", { Amount: money(data.outstanding), Reason: "Total unpaid invoice amount." }),
    slipItem("Overdue", money(data.overdueTotal), data.overdueTotal > 0 ? "chase" : "clear", "Invoice", "/invoices", { Amount: money(data.overdueTotal), Reason: "Invoices that may need follow-up." }),
    slipItem("Paid invoices", String(data.paidInvoices.length), "paid", "Invoice", "/invoices", { Count: data.paidInvoices.length, Reason: "Paid invoices found." }),
  ];
  return <CommandTile label="Cash flow" title="Money snapshot" count={hasMoney ? money(data.outstanding) : "OK"} text={hasMoney ? `${money(data.overdueTotal)} overdue. ${data.paidInvoices.length} paid invoice${data.paidInvoices.length === 1 ? "" : "s"} found.` : "AI checked cash flow. No unpaid or overdue invoice total is showing right now."} color="#f43f5e" to="/money-desk" actionLabel="Open money desk" items={items} />;
}

function CommandLayout({ config, items, dashboard, open }) {
  const data = makeCommandData(dashboard);
  const person = data.activePersonJob;
  const jobList = data.todayJobs.length ? data.todayJobs : items;
  const jobItems = jobList.slice(0, 3).map((job) => jobSlip(job, "Review this job from Command."));
  const invoiceItems = [...data.overdueInvoices, ...data.readyInvoices, ...data.draftInvoices].slice(0, 3).map((invoice) => invoiceSlip(invoice, "Review this invoice from Command."));
  const personItems = person ? [jobSlip(person, "This worker/job is active or assigned.")] : data.unassignedJobs.slice(0, 2).map((job) => jobSlip(job, "This job has no person assigned."));
  const jobActionItems = [...data.unassignedJobs.map((job) => jobSlip(job, "Assign a worker to this job.")), ...data.completedReadyInvoice.map((job) => jobSlip(job, "Create a draft invoice for this completed job."))].slice(0, 3);
  const crewItems = data.availableWorkers.slice(0, 3).map((worker) => workerSlip(worker, "Crew capacity item."));
  const quoteItems = data.followQuotes.slice(0, 3).map((quote) => quoteSlip(quote, "Follow up this quote."));
  const completedItems = data.completedReadyInvoice.slice(0, 3).map((job) => jobSlip(job, "Completed work not billed yet."));
  const approvalItems = data.prepared.length ? data.prepared.slice(0, 3) : emptySlips.approvals;
  const invoiceCount = data.readyInvoices.length + data.draftInvoices.length + data.overdueInvoices.length;
  const actionCount = data.unassignedJobs.length + data.completedReadyInvoice.length;
  return (
    <main className={industrialPageShell} data-industrial-simple-page="command" data-command-canvas>
      <section className={`${industrialContentLane} space-y-5`}>
        <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,.75fr)]">
          <div className="grid gap-5">
            <div data-cv-command-tile="true" className="cv-command-tile relative h-fit overflow-hidden rounded-[30px] border border-white/10 p-5 pl-8 text-white md:p-6 md:pl-9" style={tileStyle}>
              <SecurityTape color="#fb923c" />
              <span className={industrialChip}>{config.kicker}</span>
              <h1 className="mt-4 max-w-4xl text-4xl font-black leading-[0.92] tracking-[-0.075em] text-white md:text-6xl">{config.title}</h1>
              <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-slate-300 md:text-base">{config.subtitle}</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link to="/ai-operator" className={`rounded-2xl px-5 py-3 text-sm font-black ${industrialAction}`}>Review AI actions</Link>
                <Link to="/jobs/new" className={`rounded-2xl px-5 py-3 text-sm font-black ${industrialGhost}`}>Create job</Link>
              </div>
            </div>
            <MoneySnapshotTile data={data} />
          </div>
          <CommandTile label="AI Priority" title="What needs approval" count={data.prepared.length || "OK"} text={data.prepared.length ? "AI grouped the exact admin items needing owner attention. Tap a line to open its full-screen slip." : "AI checked jobs, invoices, quotes and crew. No urgent approval is waiting right now."} color="#22d3ee" to="/ai-operator" actionLabel="Open approvals" items={approvalItems} className="xl:min-h-full" />
        </section>

        <section className="grid gap-5 xl:grid-cols-3">
          <CommandTile label="Today’s jobs" title="Jobs happening today" count={data.todayJobs.length || open || "OK"} text={data.todayJobs.length ? "Tap a job line to open that exact job slip." : "AI checked today’s jobs. Tap a job line to open its full-screen slip."} color="#facc15" to="/jobs" actionLabel="Open jobs" items={jobItems.length ? jobItems : emptySlips.jobs} />
          <CommandTile label="Invoices" title="Money waiting" count={invoiceCount || "OK"} text={invoiceCount ? "Tap an invoice line to approve or edit that exact invoice slip." : "AI checked invoices. No money is waiting for owner action right now."} color="#34d399" to="/invoices" actionLabel="Open invoices" items={invoiceItems.length ? invoiceItems : emptySlips.invoices} />
          <CommandTile label="Person on job" title="Who is working now" count={person ? 1 : data.unassignedJobs.length || "OK"} text={person ? "Tap the line to review that exact worker/job slip." : "AI checked active jobs. No current person is marked on-site right now."} color="#a78bfa" to="/crew-map" actionLabel="Open crew" items={personItems.length ? personItems : emptySlips.person} />
        </section>

        <section className="grid gap-5 xl:grid-cols-3">
          <CommandTile label="Jobs needing action" title="Fix these jobs" count={actionCount || "OK"} text={actionCount ? "Tap a job line to open that exact job slip." : "AI checked for blocked jobs. No job is currently waiting on assignment or invoice action."} color="#fb923c" to="/jobs" actionLabel="Open job list" items={jobActionItems.length ? jobActionItems : emptySlips.jobs} />
          <CommandTile label="Crew" title="Capacity check" count={data.availableWorkers.length || "OK"} text={data.availableWorkers.length ? `${data.activeJobs.length} active. ${data.availableWorkers.length} available or not marked busy.` : "AI checked crew capacity. Add workers or assign jobs to build live availability."} color="#22d3ee" to="/team" actionLabel="Open team" items={crewItems.length ? crewItems : emptySlips.crew} />
          <CommandTile label="Quotes" title="Follow-ups to win" count={data.followQuotes.length || "OK"} text={data.followQuotes.length ? "Tap a quote line to open that exact quote slip." : "AI checked quotes. No follow-up is waiting right now."} color="#facc15" to="/quotes" actionLabel="Open quotes" items={quoteItems.length ? quoteItems : emptySlips.quotes} />
        </section>

        <section className="grid gap-5 xl:grid-cols-1">
          <CommandTile label="Ready for invoice" title="Completed work not billed" count={data.completedReadyInvoice.length || "OK"} text={data.completedReadyInvoice.length ? "Tap a completed job to approve or edit its draft invoice slip." : "AI checked completed work. Nothing is waiting to invoice right now."} color="#34d399" to="/invoices/new" actionLabel="Create invoice" items={completedItems.length ? completedItems : emptySlips.completed} />
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
        const [jobsRes, invoicesRes, quotesRes, workersRes, aiRes] = await Promise.allSettled([get("/jobs"), get("/invoices"), get("/quotes"), get("/team/workers"), get("/ai/operator/slips")]);
        if (!alive) return;
        const jobs = jobsRes.status === "fulfilled" ? listFrom(jobsRes.value) : [];
        const invoices = invoicesRes.status === "fulfilled" ? listFrom(invoicesRes.value) : [];
        const quotes = quotesRes.status === "fulfilled" ? listFrom(quotesRes.value) : [];
        const workers = workersRes.status === "fulfilled" ? listFrom(workersRes.value) : [];
        const aiActions = aiRes.status === "fulfilled" ? listFrom(aiRes.value) : [];
        setDashboard({ jobs, invoices, quotes, workers, aiActions });
        setItems(jobs.length ? jobs : config.samples || []);
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

  if (kind === "command") return <CommandLayout config={config} items={items} dashboard={dashboard} loading={loading} open={open} ready={ready} needs={needs} />;

  return (
    <main className={industrialPageShell} data-industrial-simple-page={kind} data-command-canvas>
      <section className={industrialContentLane}>
        <section className="grid gap-5 xl:grid-cols-[1fr_390px]">
          <div className={`rounded-[30px] ${industrialPanel} p-6 md:p-8`}>
            <span className={industrialChip}>{config.kicker}</span>
            <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[0.92] tracking-[-0.075em] text-white md:text-6xl">{config.title}</h1>
            <p className="mt-5 max-w-2xl text-sm font-semibold leading-6 text-slate-300 md:text-base">{config.subtitle}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to={config.create} className={`rounded-2xl px-5 py-3 text-sm font-black ${industrialAction}`}>{config.createLabel}</Link>
              <Link to="/dashboard" className={`rounded-2xl px-5 py-3 text-sm font-black ${industrialGhost}`}>Command Board</Link>
            </div>
          </div>
          <div className={`rounded-[30px] ${industrialPanel} p-5`}>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">Health</div>
            <div className="mt-5 grid gap-3">
              <div className={`rounded-[22px] ${industrialPanel} p-4`}><div className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">Open</div><div className="mt-3 text-3xl font-black tracking-[-0.06em] text-white">{open}</div></div>
              <div className={`rounded-[22px] ${industrialPanel} p-4`}><div className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">Ready</div><div className="mt-3 text-3xl font-black tracking-[-0.06em] text-white">{ready}</div></div>
              <div className={`rounded-[22px] ${industrialPanel} p-4`}><div className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">Needs review</div><div className="mt-3 text-3xl font-black tracking-[-0.06em] text-white">{needs}</div></div>
            </div>
          </div>
        </section>
        <section className={`mt-5 rounded-[28px] ${industrialPanel} p-5`}>
          <div className="mb-5 flex items-end justify-between gap-4"><div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">Records</div><h2 className="mt-2 text-3xl font-black tracking-[-0.06em] text-white">Open {config.kicker}</h2></div>{loading && <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-slate-300">Loading…</span>}</div>
          <div className="grid gap-4 xl:grid-cols-2">{items.map((item, index) => <RecordBox key={idOf(item) || index} item={item} config={config} index={index} />)}</div>
        </section>
      </section>
    </main>
  );
}
