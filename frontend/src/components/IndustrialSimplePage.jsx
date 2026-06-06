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

const tapeColors = ["#fb923c", "#22d3ee", "#34d399", "#facc15", "#a78bfa", "#f43f5e"];
const tileStyle = {
  background: "linear-gradient(135deg, #111827, #070d16)",
  color: "#ffffff",
  boxShadow: "0 18px 46px rgba(2,6,23,.26), inset 0 1px 0 rgba(255,255,255,.06)",
};

const configs = {
  command: { endpoint: null, title: "Churvox does the admin. You approve.", kicker: "Command Board", subtitle: "One place to see what needs doing, what AI prepared, who is on a job, and what button to press next.", create: "/jobs/new", createLabel: "Create job", detail: () => "/dashboard", samples: [{ title: "Review today’s work", status: "ready", href: "/jobs" }, { title: "Check invoices", status: "approval ready", href: "/invoices" }, { title: "Assign open jobs", status: "needs action", href: "/crew-map" }] },
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

const aiCheckedDefaults = {
  approvals: [
    { title: "Daily admin check complete", meta: "AI checked jobs, invoices, quotes and crew capacity.", status: "ready" },
    { title: "No urgent owner approval found", meta: "Nothing is blocked right now. Add work or review records when ready.", status: "clear" },
    { title: "Next best action", meta: "Create a job, add an invoice, or invite crew so Churvox has live work to prepare.", status: "next" },
  ],
  invoices: [
    { title: "Invoice queue checked", meta: "No ready, draft, or overdue invoices found right now.", status: "clear" },
    { title: "Create invoice from job", meta: "When a job is completed, Churvox will prepare the draft invoice here.", status: "prepared" },
    { title: "Payment follow-ups", meta: "Overdue invoice reminders stay approval-first before sending.", status: "owner approval" },
  ],
  person: [
    { title: "No active worker on a job", meta: "Assign a worker when the next job is ready to go.", status: "checked" },
    { title: "Crew status checked", meta: "Churvox will show who is on-site or assigned when jobs are live.", status: "ready" },
  ],
  jobs: [
    { title: "No blocked jobs found", meta: "Jobs needing assignment, invoice, or owner check will appear here.", status: "clear" },
    { title: "Create or assign work", meta: "Add a job and Churvox will prepare the next admin action.", status: "next" },
  ],
  crew: [
    { title: "Crew capacity checked", meta: "No busy crew issues found. Invite or assign workers to build capacity data.", status: "ready" },
    { title: "Worker availability", meta: "Churvox will flag overloaded or unassigned work here.", status: "watching" },
  ],
  quotes: [
    { title: "Quote follow-ups checked", meta: "No quote follow-up is waiting right now.", status: "clear" },
    { title: "Win more work", meta: "Create a quote and Churvox will prepare follow-up reminders.", status: "next" },
  ],
  completed: [
    { title: "Completed work checked", meta: "No completed jobs are waiting for invoice right now.", status: "clear" },
    { title: "Ready when jobs finish", meta: "Completed jobs will appear here for draft invoice review.", status: "watching" },
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

function idOf(item) {
  const raw = item?.id || item?._id || item?.client_id || item?.customer_id || item?.job_id || item?.quote_id || item?.invoice_id || item?.user_id || "";
  return typeof raw === "object" && raw?.$oid ? raw.$oid : String(raw || "");
}

function first(...values) { return values.find((value) => value !== undefined && value !== null && String(value).trim() !== "") || ""; }
function lc(value) { return String(value || "").toLowerCase(); }
function titleOf(item) { return item?.title || item?.message || item?.body || item?.job_title || item?.job_name || item?.quote_number || item?.invoice_number || item?.name || item?.full_name || item?.client_name || item?.customer_name || "Open record"; }
function metaOf(item) { return [item?.client_name || item?.customer_name || item?.email || item?.phone, item?.address || item?.site_address || item?.street_address, item?.role].filter(Boolean).join(" · "); }
function statusOf(item) { return String(item?.status || item?.type || item?.job_status || item?.quote_status || item?.invoice_status || "ready").replaceAll("_", " "); }
function asMoney(value) { const num = Number(value || 0); return Number.isFinite(num) && num > 0 ? `$${num.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "$0"; }
function workerName(job) { return first(job?.assigned_worker_name, job?.worker_name, job?.assignee_name, job?.assigned_to_name, job?.assignedWorkerName, job?.worker?.name, job?.assigned_worker?.name, job?.assigned_to, job?.employee_name, job?.staff_name) || "Unassigned"; }
function isToday(job) { const raw = first(job?.scheduled_at, job?.scheduled_date, job?.date, job?.start_time, job?.job_date); if (!raw) return false; const date = new Date(raw); return !Number.isNaN(date.getTime()) && date.toDateString() === new Date().toDateString(); }
function isActiveJob(job) { const status = lc(statusOf(job)); return status.includes("progress") || status.includes("started") || status.includes("active") || status.includes("on site") || status.includes("timer"); }
function isCompleted(job) { const status = lc(statusOf(job)); return status.includes("complete") || status.includes("finished") || status.includes("done"); }
function isCancelled(job) { const status = lc(statusOf(job)); return status.includes("cancel") || status.includes("archiv"); }
function invoiceAmount(invoice) { return Number(first(invoice?.total, invoice?.amount_due, invoice?.amount, invoice?.subtotal, invoice?.price, 0)) || 0; }
function tapeFor(index = 0) { return tapeColors[Math.abs(index) % tapeColors.length]; }

function SecurityTape({ color = "#fb923c" }) {
  return <span aria-hidden="true" className="absolute left-0 top-0 h-full w-2.5 rounded-l-[26px]" style={{ background: `repeating-linear-gradient(135deg, ${color} 0 10px, rgba(255,255,255,.30) 10px 15px, ${color} 15px 25px)`, boxShadow: `0 0 18px ${color}66` }} />;
}

function SimpleLine({ title, meta, status, onOpen }) {
  const body = <><div className="truncate text-sm font-black leading-5 text-white">{title}</div>{meta ? <div className="mt-1 line-clamp-2 text-xs font-bold leading-5 text-slate-300">{meta}</div> : null}{status ? <div className="mt-2 inline-flex rounded-full bg-white/10 px-2 py-1 text-[10px] font-black uppercase tracking-[.12em] text-amber-300">{status}</div> : null}</>;
  const classes = "w-full rounded-2xl border border-white/10 bg-white/8 p-3 text-left transition hover:border-cyan-300/40 hover:bg-white/12 active:scale-[0.99]";
  if (onOpen) return <button type="button" onClick={onOpen} className={classes}>{body}</button>;
  return <div className={classes}>{body}</div>;
}

function FullscreenSlipModal({ mode, onClose, onApprove, approved, label, title, text, items, editText, to, actionLabel }) {
  if (!mode) return null;
  const detailItems = items.length ? items : [{ title: "No record is blocking this area", meta: "Churvox will show the client, job, invoice, quote, amount, worker and reason here when there is live work.", status: "checked" }];
  const isEdit = mode === "edit";
  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-950/92 p-3 text-white backdrop-blur-xl md:p-6" role="dialog" aria-modal="true">
      <div className="mx-auto flex min-h-[calc(100vh-24px)] max-w-6xl flex-col rounded-[34px] border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-2xl md:min-h-[calc(100vh-48px)]">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5 md:p-7">
          <div>
            <div className="inline-flex rounded-full bg-amber-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">Full screen slip</div>
            <div className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">{label}</div>
            <h2 className="mt-2 text-4xl font-black leading-[0.95] tracking-[-0.07em] text-white md:text-6xl">{title}</h2>
            <p className="mt-4 max-w-3xl text-sm font-bold leading-6 text-slate-300 md:text-base">{text || "Churvox checked this area and prepared the next owner action."}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950">Close</button>
        </div>
        <div className="grid flex-1 gap-5 p-5 md:grid-cols-[1.1fr_.9fr] md:p-7">
          <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">Churvox prepared this</div>
            {isEdit ? <><textarea className="mt-4 min-h-[320px] w-full rounded-3xl border border-white/10 bg-slate-950/70 p-4 text-sm font-bold leading-6 text-white outline-none" defaultValue={editText} /><p className="mt-3 text-xs font-bold leading-5 text-slate-300">Edit the prepared wording/details here. The full record page is only for changing the whole job, client, invoice or quote.</p></> : <div className="mt-4 grid gap-3">{detailItems.slice(0, 6).map((item, index) => <div key={`${item.title || index}-modal-detail`} className="rounded-3xl border border-white/10 bg-slate-950/55 p-4"><div className="flex items-start justify-between gap-3"><div><div className="text-lg font-black text-white">{item.title}</div><div className="mt-1 text-sm font-bold leading-6 text-slate-300">{item.meta || "No extra detail saved yet."}</div></div><div className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-amber-300">{item.status || "prepared"}</div></div></div>)}</div>}
          </section>
          <aside className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">Owner decision</div>
            <p className="mt-3 text-sm font-bold leading-6 text-slate-300">Review what Churvox prepared. Approve it, edit it, or jump to the full page only when you need to change the full record.</p>
            {approved ? <div className="mt-4 rounded-3xl border border-emerald-300/25 bg-emerald-300/10 p-4 text-sm font-black text-emerald-100">Approved. Churvox has recorded this slip approval.</div> : null}
            <div className="mt-5 grid gap-3">
              <button type="button" onClick={onApprove} className="rounded-2xl bg-emerald-300 px-5 py-4 text-sm font-black text-slate-950">Approve slip</button>
              {to ? <Link to={to} onClick={onClose} className="rounded-2xl bg-white px-5 py-4 text-center text-sm font-black text-slate-950 no-underline">{actionLabel}</Link> : null}
              <button type="button" onClick={onClose} className="rounded-2xl bg-white/10 px-5 py-4 text-sm font-black text-white ring-1 ring-white/10">Back to Command</button>
            </div>
            <div className="mt-5 rounded-3xl border border-white/10 p-4"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">How it works</div><p className="mt-2 text-sm font-bold leading-6 text-slate-300">Tap a job, invoice, quote or worker line. Churvox opens this full-screen slip over Command so the approval happens without leaving the page.</p></div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function CommandTile({ label, title, count, text, color, to, actionLabel = "Open page", items = [], children, className = "" }) {
  const visibleItems = items.filter(Boolean);
  const [modalMode, setModalMode] = React.useState(null);
  const [approved, setApproved] = React.useState(false);
  const editText = visibleItems.length ? visibleItems.map((item) => `${item.title}${item.meta ? ` - ${item.meta}` : ""}`).join("\n") : `${title}\n${text || "Churvox checked this area and prepared the next action."}`;
  return <><div data-cv-command-tile="true" className={`cv-command-tile relative min-h-[220px] overflow-hidden rounded-[28px] border border-white/10 p-4 pl-7 text-white no-underline ${className}`} style={tileStyle}><SecurityTape color={color} /><div className="flex min-h-full flex-col gap-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">{label}</div><h2 className="mt-1 text-[1.35rem] font-black leading-[1.05] tracking-[-0.05em] text-white md:text-2xl">{title}</h2></div>{count !== undefined ? <div className="shrink-0 rounded-2xl bg-emerald-400/15 px-3 py-1.5 text-2xl font-black text-white ring-1 ring-emerald-300/25">{approved ? "✓" : count}</div> : null}</div>{text ? <p className="text-xs font-bold leading-5 text-slate-300 md:text-sm">{text}</p> : null}{visibleItems.length ? <div className="grid gap-2">{visibleItems.slice(0, 3).map((item, index) => <SimpleLine key={`${item.title || item}-${index}`} {...item} onOpen={() => setModalMode("details")} />)}</div> : null}{children}{approved ? <div className="rounded-2xl border border-emerald-300/25 bg-emerald-300/10 p-3 text-xs font-black text-emerald-100">Approved. Tap a line or View details to review it again.</div> : null}<div className="mt-auto flex flex-wrap gap-2 pt-2"><button type="button" onClick={() => { setApproved(true); setModalMode("details"); }} className="rounded-xl bg-emerald-300 px-3 py-2 text-xs font-black text-slate-950">Approve</button><button type="button" onClick={() => setModalMode("edit")} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-black text-white ring-1 ring-white/10">Edit</button><button type="button" onClick={() => setModalMode("details")} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-black text-white ring-1 ring-white/10">View details</button>{to ? <Link to={to} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-950 no-underline">{actionLabel}</Link> : null}</div></div></div><FullscreenSlipModal mode={modalMode} onClose={() => setModalMode(null)} onApprove={() => setApproved(true)} approved={approved} label={label} title={title} text={text} items={visibleItems} editText={editText} to={to} actionLabel={actionLabel} /></>;
}

function RecordBox({ item, config, index }) {
  return <Link data-cv-command-tile="true" to={config.detail(item)} className="cv-command-tile relative block min-h-[132px] overflow-hidden rounded-[28px] border border-white/10 p-4 pl-7 text-white no-underline" style={tileStyle}><SecurityTape color={tapeFor(index + 3)} /><div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">{statusOf(item)}</div><h3 className="mt-2 text-xl font-black tracking-[-0.05em] text-white">{titleOf(item)}</h3><p className="mt-2 text-sm font-bold leading-5 text-slate-300">{metaOf(item) || "Open the record for full details."}</p></Link>;
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
  aiActions.slice(0, 3).forEach((action) => prepared.push({ title: titleOf(action), meta: action?.summary || action?.reason || "AI prepared this action for owner approval.", status: statusOf(action) }));
  unassignedJobs.slice(0, 2).forEach((job) => prepared.push({ title: `Assign worker: ${titleOf(job)}`, meta: metaOf(job) || "AI found a job with no assigned person.", status: "owner approval" }));
  completedReadyInvoice.slice(0, 2).forEach((job) => prepared.push({ title: `Create invoice: ${titleOf(job)}`, meta: metaOf(job) || "Completed work is ready to invoice.", status: "invoice ready" }));
  overdueInvoices.slice(0, 2).forEach((invoice) => prepared.push({ title: `Send reminder: ${titleOf(invoice)}`, meta: `${asMoney(invoiceAmount(invoice))} outstanding`, status: "overdue" }));
  followQuotes.slice(0, 2).forEach((quote) => prepared.push({ title: `Follow up quote: ${titleOf(quote)}`, meta: metaOf(quote) || "Quote needs a customer follow-up.", status: "follow-up" }));
  return { todayJobs, activeJobs, unassignedJobs, completedReadyInvoice, draftInvoices, readyInvoices, overdueInvoices, paidInvoices, outstanding, overdueTotal, followQuotes, availableWorkers, activePersonJob, prepared };
}

function MoneySnapshotTile({ data, className = "" }) {
  const hasMoney = data.outstanding > 0 || data.overdueTotal > 0 || data.paidInvoices.length > 0;
  return <CommandTile label="Cash flow" title="Money snapshot" count={hasMoney ? asMoney(data.outstanding) : "OK"} text={hasMoney ? `${asMoney(data.overdueTotal)} overdue. ${data.paidInvoices.length} paid invoice${data.paidInvoices.length === 1 ? "" : "s"} found.` : "AI checked cash flow. No unpaid or overdue invoice total is showing right now."} color="#f43f5e" to="/money-desk" actionLabel="Open money desk" className={className}><div className="grid gap-2 sm:grid-cols-3"><SimpleLine title={asMoney(data.outstanding)} meta="Outstanding" status={hasMoney ? "unpaid" : "clear"} /><SimpleLine title={asMoney(data.overdueTotal)} meta="Overdue" status={data.overdueTotal > 0 ? "chase" : "clear"} /><SimpleLine title={String(data.paidInvoices.length)} meta="Paid invoices" status="paid" /></div></CommandTile>;
}

function CommandLayout({ config, items, dashboard, loading, open }) {
  const data = makeCommandData(dashboard);
  const person = data.activePersonJob;
  const jobList = data.todayJobs.length ? data.todayJobs : items;
  const invoiceRealItems = [...data.overdueInvoices, ...data.readyInvoices, ...data.draftInvoices].slice(0, 3).map((invoice) => ({ title: titleOf(invoice), meta: asMoney(invoiceAmount(invoice)), status: statusOf(invoice) }));
  const personItems = person ? [{ title: workerName(person), meta: `${titleOf(person)}${metaOf(person) ? ` · ${metaOf(person)}` : ""}`, status: statusOf(person) }] : data.unassignedJobs.slice(0, 2).map((job) => ({ title: "No person assigned", meta: titleOf(job), status: "assign now" }));
  const jobActionItems = [...data.unassignedJobs.map((job) => ({ title: `Assign: ${titleOf(job)}`, meta: metaOf(job) || "No worker assigned", status: statusOf(job) })), ...data.completedReadyInvoice.map((job) => ({ title: `Invoice: ${titleOf(job)}`, meta: metaOf(job) || "Completed work", status: "ready to invoice" }))].slice(0, 3);
  const crewItems = data.availableWorkers.slice(0, 3).map((worker) => ({ title: titleOf(worker), meta: first(worker?.role, worker?.email, worker?.phone, "Crew member"), status: statusOf(worker) }));
  const quoteItems = data.followQuotes.slice(0, 3).map((quote) => ({ title: titleOf(quote), meta: metaOf(quote) || first(quote?.customer_name, quote?.client_name, "Customer follow-up"), status: statusOf(quote) }));
  const completedItems = data.completedReadyInvoice.slice(0, 3).map((job) => ({ title: titleOf(job), meta: `${workerName(job)}${metaOf(job) ? ` · ${metaOf(job)}` : ""}`, status: "draft invoice needed" }));
  const approvalItems = data.prepared.length ? data.prepared.slice(0, 3) : aiCheckedDefaults.approvals;
  const invoiceCount = data.readyInvoices.length + data.draftInvoices.length + data.overdueInvoices.length;
  const actionCount = data.unassignedJobs.length + data.completedReadyInvoice.length;
  return <main className={industrialPageShell} data-industrial-simple-page="command" data-command-canvas><section className={`${industrialContentLane} space-y-5`}><section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,.75fr)]"><div className="grid gap-5"><div data-cv-command-tile="true" className="cv-command-tile relative h-fit overflow-hidden rounded-[30px] border border-white/10 p-5 pl-8 text-white md:p-6 md:pl-9" style={tileStyle}><SecurityTape color="#fb923c" /><span className={industrialChip}>{config.kicker}</span><h1 className="mt-4 max-w-4xl text-4xl font-black leading-[0.92] tracking-[-0.075em] text-white md:text-6xl">{config.title}</h1><p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-slate-300 md:text-base">{config.subtitle}</p><div className="mt-5 flex flex-wrap gap-3"><Link to="/ai-operator" className={`rounded-2xl px-5 py-3 text-sm font-black ${industrialAction}`}>Review AI actions</Link><Link to="/jobs/new" className={`rounded-2xl px-5 py-3 text-sm font-black ${industrialGhost}`}>Create job</Link></div></div><MoneySnapshotTile data={data} className="min-h-[170px]" /></div><CommandTile label="AI Priority" title="What needs approval" count={data.prepared.length || "OK"} text={data.prepared.length ? "AI has grouped the admin that needs owner attention. Check these first." : "AI checked jobs, invoices, quotes and crew. No urgent approval is waiting right now."} color="#22d3ee" to="/ai-operator" actionLabel="Open approvals" items={approvalItems} className="xl:min-h-full" /></section><section className="grid gap-5 xl:grid-cols-3"><CommandTile label="Today’s jobs" title="Jobs happening today" count={data.todayJobs.length || open || "OK"} text={data.todayJobs.length ? "Scheduled, started, finished, or stuck today." : "AI checked today’s jobs. Tap a job line to open its full-screen slip."} color="#facc15" to="/jobs" actionLabel="Open jobs" items={jobList.slice(0, 3).map((job) => ({ title: titleOf(job), meta: `${workerName(job)}${metaOf(job) ? ` · ${metaOf(job)}` : ""}`, status: statusOf(job) }))} /><CommandTile label="Invoices" title="Money waiting" count={invoiceCount || "OK"} text={invoiceCount ? `${data.readyInvoices.length} ready, ${data.draftInvoices.length} draft, ${data.overdueInvoices.length} overdue.` : "AI checked invoices. Tap an invoice line to open its full-screen slip."} color="#34d399" to="/invoices" actionLabel="Open invoices" items={invoiceRealItems.length ? invoiceRealItems : aiCheckedDefaults.invoices} /><CommandTile label="Person on job" title="Who is working now" count={person ? 1 : data.unassignedJobs.length || "OK"} text={person ? "A worker is currently assigned or on a live job." : "AI checked active jobs. No current person is marked on-site right now."} color="#a78bfa" to="/crew-map" actionLabel="Open crew" items={personItems.length ? personItems : aiCheckedDefaults.person} /></section><section className="grid gap-5 xl:grid-cols-3"><CommandTile label="Jobs needing action" title="Fix these jobs" count={actionCount || "OK"} text={actionCount ? "Jobs that need an assignment, invoice, or owner check." : "AI checked for blocked jobs. No job is currently waiting on assignment or invoice action."} color="#fb923c" to="/jobs" actionLabel="Open job list" items={jobActionItems.length ? jobActionItems : aiCheckedDefaults.jobs} /><CommandTile label="Crew" title="Capacity check" count={data.availableWorkers.length || "OK"} text={data.availableWorkers.length ? `${data.activeJobs.length} active. ${data.availableWorkers.length} available or not marked busy.` : "AI checked crew capacity. Add workers or assign jobs to build live availability."} color="#22d3ee" to="/team" actionLabel="Open team" items={crewItems.length ? crewItems : aiCheckedDefaults.crew} /><CommandTile label="Quotes" title="Follow-ups to win" count={data.followQuotes.length || "OK"} text={data.followQuotes.length ? "Quotes that may need a follow-up before they go cold." : "AI checked quotes. No follow-up is waiting right now."} color="#facc15" to="/quotes" actionLabel="Open quotes" items={quoteItems.length ? quoteItems : aiCheckedDefaults.quotes} /></section><section className="grid gap-5 xl:grid-cols-1"><CommandTile label="Ready for invoice" title="Completed work not billed" count={data.completedReadyInvoice.length || "OK"} text={data.completedReadyInvoice.length ? "Completed jobs Churvox found that look ready to turn into draft invoices." : "AI checked completed work. Nothing is waiting to invoice right now."} color="#34d399" to="/invoices/new" actionLabel="Create invoice" items={completedItems.length ? completedItems : aiCheckedDefaults.completed} /></section></section></main>;
}

export default function IndustrialSimplePage({ kind }) {
  const config = configs[kind] || configs.jobs;
  const { get } = useApi();
  const [items, setItems] = React.useState(config.samples || []);
  const [loading, setLoading] = React.useState(Boolean(config.endpoint || kind === "command"));
  const [dashboard, setDashboard] = React.useState({ jobs: [], invoices: [], quotes: [], workers: [], aiActions: [] });
  React.useEffect(() => { let alive = true; async function load() { if (kind === "command") { setLoading(true); const [jobsRes, invoicesRes, quotesRes, workersRes, aiRes] = await Promise.allSettled([get("/jobs"), get("/invoices"), get("/quotes"), get("/team/workers"), get("/ai/operator/slips")]); if (!alive) return; const jobs = jobsRes.status === "fulfilled" ? listFrom(jobsRes.value) : []; const invoices = invoicesRes.status === "fulfilled" ? listFrom(invoicesRes.value) : []; const quotes = quotesRes.status === "fulfilled" ? listFrom(quotesRes.value) : []; const workers = workersRes.status === "fulfilled" ? listFrom(workersRes.value) : []; const aiActions = aiRes.status === "fulfilled" ? listFrom(aiRes.value) : []; setDashboard({ jobs, invoices, quotes, workers, aiActions }); setItems(jobs.length ? jobs : config.samples || []); setLoading(false); return; } if (!config.endpoint) return; setLoading(true); const res = await get(config.endpoint); if (!alive) return; const rows = res?.success ? listFrom(res) : []; setItems(rows.length ? rows : config.samples || []); setLoading(false); } load(); return () => { alive = false; }; }, [config.endpoint, config.samples, get, kind]);
  const open = items.length;
  const ready = items.filter((item) => /ready|sent|active|assigned|progress|approval/i.test(statusOf(item))).length;
  const needs = Math.max(open - ready, 0);
  if (kind === "command") return <CommandLayout config={config} items={items} dashboard={dashboard} loading={loading} open={open} ready={ready} needs={needs} />;
  return <main className={industrialPageShell} data-industrial-simple-page={kind} data-command-canvas><section className={industrialContentLane}><section className="grid gap-5 xl:grid-cols-[1fr_390px]"><div className={`rounded-[30px] ${industrialPanel} p-6 md:p-8`}><span className={industrialChip}>{config.kicker}</span><h1 className="mt-5 max-w-3xl text-4xl font-black leading-[0.92] tracking-[-0.075em] text-white md:text-6xl">{config.title}</h1><p className="mt-5 max-w-2xl text-sm font-semibold leading-6 text-slate-300 md:text-base">{config.subtitle}</p><div className="mt-5 flex flex-wrap gap-3"><Link to={config.create} className={`rounded-2xl px-5 py-3 text-sm font-black ${industrialAction}`}>{config.createLabel}</Link><Link to="/dashboard" className={`rounded-2xl px-5 py-3 text-sm font-black ${industrialGhost}`}>Command Board</Link></div></div><div className={`rounded-[30px] ${industrialPanel} p-5`}><div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">Health</div><div className="mt-5 grid gap-3"><div className={`rounded-[22px] ${industrialPanel} p-4`}><div className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">Open</div><div className="mt-3 text-3xl font-black tracking-[-0.06em] text-white">{open}</div></div><div className={`rounded-[22px] ${industrialPanel} p-4`}><div className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">Ready</div><div className="mt-3 text-3xl font-black tracking-[-0.06em] text-white">{ready}</div></div><div className={`rounded-[22px] ${industrialPanel} p-4`}><div className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">Needs review</div><div className="mt-3 text-3xl font-black tracking-[-0.06em] text-white">{needs}</div></div></div></div></section><section className={`mt-5 rounded-[28px] ${industrialPanel} p-5`}><div className="mb-5 flex items-end justify-between gap-4"><div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">Records</div><h2 className="mt-2 text-3xl font-black tracking-[-0.06em] text-white">Open {config.kicker}</h2></div>{loading && <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-slate-300">Loading…</span>}</div><div className="grid gap-4 xl:grid-cols-2">{items.map((item, index) => <RecordBox key={idOf(item) || index} item={item} config={config} index={index} />)}</div></section></section></main>;
}
