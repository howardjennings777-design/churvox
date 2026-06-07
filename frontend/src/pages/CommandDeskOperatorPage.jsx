import React from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";

const darkCard = "cv-board-dark-card rounded-[30px] border border-white/10 bg-slate-950 p-5 text-white shadow-[0_22px_62px_rgba(2,6,23,.24)]";

const first = (...values) => values.find((value) => value !== undefined && value !== null && String(value).trim() !== "") || "";
function normalizeId(value) {
  if (!value) return "";
  if (typeof value === "object") return String(value.$oid || value.oid || value.id || value._id || "");
  const text = String(value || "");
  return text === "[object Object]" ? "" : text;
}
const idOf = (item) => normalizeId(item?.id || item?._id || item?.job_id || item?.invoice_id || item?.quote_id || item?.worker_id || item?.user_id || "");
const statusOf = (item) => String(first(item?.status, item?.job_status, item?.invoice_status, item?.quote_status, "")).toLowerCase();
const numberValue = (value) => Number(String(value || 0).replace(/[^0-9.-]/g, "")) || 0;

function listFrom(res, keys = []) {
  const data = res?.data ?? res;
  if (Array.isArray(data)) return data;
  for (const key of [...keys, "data", "items", "results", "jobs", "invoices", "quotes", "workers", "team", "users", "clients", "customers"]) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}
function isDone(job) { const status = statusOf(job); return status.includes("complete") || status.includes("done") || job?.completed === true || Boolean(job?.completed_at); }
function isCancelled(item) { return statusOf(item).includes("cancel"); }
function isOverdue(invoice) {
  const status = statusOf(invoice);
  if (status.includes("paid") || isCancelled(invoice)) return false;
  if (status.includes("overdue")) return true;
  const due = first(invoice?.due_date, invoice?.due_at, invoice?.date_due, invoice?.payment_due);
  if (!due) return false;
  const date = new Date(due);
  return !Number.isNaN(date.getTime()) && date.getTime() < Date.now();
}
function isUnassigned(job) { return !isDone(job) && !isCancelled(job) && !first(job?.assigned_worker_id, job?.worker_id, job?.assigned_to, job?.assigned_worker_name, job?.worker_name); }
function titleOf(job) { return first(job?.title, job?.job_title, job?.service_type, job?.job_type, "Untitled job"); }
function quoteTitle(quote) { return first(quote?.quote_number, quote?.title, quote?.job_description, "Quote"); }
function invoiceTitle(invoice) { return first(invoice?.invoice_number, invoice?.number, invoice?.title, "Invoice"); }
function clientOf(item) { return first(item?.client_name, item?.customer_name, item?.client?.name, item?.name, "No client saved"); }
function workerName(worker) { return first(worker?.name, worker?.full_name, worker?.display_name, worker?.email, "Unnamed worker"); }
function roleOf(worker) { return String(first(worker?.role, worker?.account_type, "worker")).toLowerCase(); }
function fieldWorkers(workers) { return workers.filter((worker) => roleOf(worker).includes("worker") || roleOf(worker).includes("field") || roleOf(worker).includes("manager")); }
function assignedWorkerId(job) { return normalizeId(first(job?.assigned_worker_id, job?.worker_id, job?.assigned_to_id, "")); }
function assignedWorkerName(job) { return String(first(job?.assigned_worker_name, job?.worker_name, job?.assignee_name, job?.assigned_to_name, job?.assigned_to, "")).toLowerCase(); }
function workerLoad(worker, jobs) { const wid = idOf(worker); const name = workerName(worker).toLowerCase(); return jobs.filter((job) => !isDone(job) && !isCancelled(job) && ((wid && assignedWorkerId(job) === wid) || (name && assignedWorkerName(job) === name))).length; }
function pickWorker(job, workers, jobs) { return [...fieldWorkers(workers)].sort((a, b) => workerLoad(a, jobs) - workerLoad(b, jobs))[0] || null; }
function amountOf(item) { return numberValue(first(item?.total, item?.amount_due, item?.balance_due, item?.amount, item?.price, item?.subtotal, item?.invoice_total, item?.quote_total, 0)); }
function relatedHref(action) {
  if (!action) return "/dashboard";
  if (action.type === "assign_job" || action.type === "draft_invoice") return action.form?.job_id ? `/jobs/${action.form.job_id}` : "/jobs-board";
  if (action.type === "send_invoice" || action.type === "invoice_follow_up") return action.form?.invoice_id ? `/invoices/${action.form.invoice_id}` : "/invoices-board";
  if (action.type === "quote_follow_up" || action.type === "quote_convert") return action.form?.quote_id ? `/quotes/${action.form.quote_id}` : "/quotes-board";
  return "/dashboard";
}
function appendNote(existing, label, note) { return `${existing ? `${existing}\n\n` : ""}${label} ${new Date().toLocaleDateString("en-NZ")}: ${note || "Reviewed by owner"}`.trim(); }

function makeActions({ jobs, invoices, quotes, workers }) {
  const actions = [];
  const invoicedJobs = new Set(invoices.map((invoice) => String(first(invoice.job_id, invoice.jobId, invoice.linked_job_id, ""))).filter(Boolean));

  jobs.filter(isUnassigned).slice(0, 8).forEach((job) => {
    const worker = pickWorker(job, workers, jobs);
    actions.push({ id: `assign-${idOf(job)}`, box: "crew", type: "assign_job", title: "Assign job", summary: worker ? `${workerName(worker)} has the lightest current load.` : "Choose a worker before approving.", ready: Boolean(idOf(job) && worker && idOf(worker)), form: { job_id: idOf(job), job_title: titleOf(job), client_name: clientOf(job), worker_id: worker ? idOf(worker) : "", worker_name: worker ? workerName(worker) : "" } });
  });

  jobs.filter((job) => isDone(job) && !invoicedJobs.has(idOf(job))).slice(0, 8).forEach((job) => {
    const amount = amountOf(job);
    actions.push({ id: `invoice-job-${idOf(job)}`, box: "jobs", type: "draft_invoice", title: "Create draft invoice", summary: amount ? "Completed job is ready to invoice." : "Completed job needs an amount before invoice draft.", ready: Boolean(idOf(job) && amount > 0), form: { job_id: idOf(job), client_id: first(job.client_id, job.customer_id), client_name: clientOf(job), customer_name: clientOf(job), customer_email: first(job.customer_email, job.client_email, job.email), subtotal: amount, description: first(job.invoice_description, job.description, job.notes, `${titleOf(job)} completed`) } });
  });

  invoices.filter((invoice) => statusOf(invoice) === "draft").slice(0, 6).forEach((invoice) => {
    actions.push({ id: `send-invoice-${idOf(invoice)}`, box: "invoices", type: "send_invoice", title: "Mark invoice sent", summary: "Draft invoice is ready to mark sent after owner review.", ready: Boolean(idOf(invoice)), form: { invoice_id: idOf(invoice), invoice_title: invoiceTitle(invoice), client_name: clientOf(invoice), customer_email: first(invoice.customer_email, invoice.client_email, invoice.email) } });
  });

  invoices.filter(isOverdue).slice(0, 6).forEach((invoice) => {
    actions.push({ id: `follow-invoice-${idOf(invoice)}`, box: "invoices", type: "invoice_follow_up", title: "Prepare invoice follow-up", summary: "Overdue invoice needs a follow-up note prepared for owner review.", ready: Boolean(idOf(invoice)), form: { invoice_id: idOf(invoice), invoice_title: invoiceTitle(invoice), client_name: clientOf(invoice), existing_notes: first(invoice.notes, ""), message: `Friendly reminder for ${clientOf(invoice)} about ${invoiceTitle(invoice)}.` } });
  });

  quotes.filter((quote) => statusOf(quote) === "sent" && !first(quote.converted_job_id, quote.job_id, quote.linked_job_id)).slice(0, 6).forEach((quote) => {
    actions.push({ id: `follow-quote-${idOf(quote)}`, box: "quotes", type: "quote_follow_up", title: "Prepare quote follow-up", summary: "Sent quote is ready for a polite follow-up note.", ready: Boolean(idOf(quote)), form: { quote_id: idOf(quote), quote_title: quoteTitle(quote), client_name: clientOf(quote), existing_notes: first(quote.notes, ""), message: `Hi ${clientOf(quote)}, just checking whether you had any questions about your quote.` } });
  });

  quotes.filter((quote) => statusOf(quote).includes("accept") && !first(quote.converted_job_id, quote.job_id, quote.linked_job_id)).slice(0, 6).forEach((quote) => {
    actions.push({ id: `convert-quote-${idOf(quote)}`, box: "quotes", type: "quote_convert", title: "Create job from accepted quote", summary: "Accepted quote can become a job using the real quote conversion flow.", ready: Boolean(idOf(quote)), form: { quote_id: idOf(quote), quote_title: quoteTitle(quote), client_name: clientOf(quote), value: amountOf(quote) } });
  });

  return actions.filter((action) => action.id && !action.id.endsWith("-"));
}

function Pill({ children, good }) { return <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[.14em] ${good ? "bg-emerald-300 text-slate-950" : "bg-amber-300 text-slate-950"}`}>{children}</span>; }
function Metric({ label, value, text, tone }) { return <article className={`${darkCard} relative overflow-hidden pl-7`}><span className="absolute left-0 top-0 h-full w-2" style={{ background: `linear-gradient(180deg, ${tone}, #facc15, #22d3ee)` }} /><div className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">{label}</div><div className="mt-2 text-4xl font-black tracking-[-.07em] text-white">{value}</div><p className="mt-2 text-sm font-bold leading-6 text-slate-300">{text}</p></article>; }
function ActionCard({ action, onOpen }) { return <button type="button" onClick={() => onOpen(action)} className="rounded-[22px] border border-white/10 bg-white/[0.06] p-4 text-left text-white hover:bg-white/[0.09]"><div className="flex items-start justify-between gap-3"><h3 className="text-lg font-black tracking-[-.04em] text-white">{action.title}</h3><Pill good={action.ready}>{action.ready ? "Ready" : "Needs details"}</Pill></div><p className="mt-2 text-sm font-bold leading-6 text-slate-300">{action.summary}</p><div className="mt-4 inline-flex rounded-2xl bg-amber-300 px-4 py-2 text-sm font-black text-slate-950">Review slip</div></button>; }
function WorkBox({ label, title, count, text, href, tone, actions, empty, onOpen }) { return <section className={`${darkCard} relative flex min-h-[320px] flex-col overflow-hidden pl-7`}><span className="absolute left-0 top-0 h-full w-2" style={{ background: `linear-gradient(180deg, ${tone}, #facc15, #22d3ee)` }} /><div className="flex items-start justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">{label}</div><h2 className="mt-2 text-3xl font-black tracking-[-.06em] text-white">{title}</h2></div><span className="rounded-full bg-white/10 px-3 py-1 text-sm font-black text-white ring-1 ring-white/10">{count}</span></div><p className="mt-3 text-sm font-bold leading-6 text-slate-300">{text}</p><div className="mt-5 grid gap-3">{actions.length ? actions.slice(0, 3).map((action) => <ActionCard key={action.id} action={action} onOpen={onOpen} />) : <div className="rounded-[22px] border border-white/10 bg-white/[0.06] p-4 text-sm font-black leading-6 text-slate-300">{empty}</div>}</div><div className="mt-auto pt-5"><Link to={href} className="inline-flex rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-black text-white no-underline">Open</Link></div></section>; }

function Slip({ action, onClose, onApprove, busy }) {
  const [form, setForm] = React.useState(action?.form || {});
  React.useEffect(() => setForm(action?.form || {}), [action]);
  if (!action) return null;
  const fields = Object.keys(form);
  const href = relatedHref({ ...action, form });
  return <div className="fixed inset-0 z-[2147483647] overflow-y-auto bg-slate-950/90 p-4"><section className="mx-auto max-w-5xl rounded-[34px] bg-[#f7f3ea] shadow-2xl"><header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white p-6"><div><div className="inline-flex rounded-full bg-orange-100 px-3 py-1 text-[10px] font-black uppercase tracking-[.18em] text-orange-700">Approval slip</div><h1 className="mt-3 text-4xl font-black tracking-[-.07em] text-slate-950">{action.title}</h1><p className="mt-3 text-sm font-bold leading-6 text-slate-600">{action.summary}</p></div><button type="button" onClick={onClose} className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white">Close</button></header><main className="grid gap-5 p-5 md:grid-cols-[1fr_320px]"><section className="rounded-[28px] border border-slate-200 bg-white p-5"><div className="text-[10px] font-black uppercase tracking-[.18em] text-blue-600">Review and edit</div><div className="mt-4 grid gap-3 md:grid-cols-2">{fields.map((key) => <label key={key} className="rounded-2xl border border-slate-200 bg-slate-50 p-3"><span className="text-[10px] font-black uppercase tracking-[.14em] text-slate-500">{key.replaceAll("_", " ")}</span><input value={form[key] || ""} onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-950" /></label>)}</div><div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-black leading-6 text-amber-950">Approval-first rule: this slip either applies a real backend action or saves a prepared note. It does not auto-send customer messages, charge customers, delete data, process payroll, or sync accounting.</div></section><aside className="rounded-[28px] border border-slate-200 bg-white p-5"><div className="text-[10px] font-black uppercase tracking-[.18em] text-orange-600">Owner action</div><h2 className="mt-2 text-3xl font-black tracking-[-.06em] text-slate-950">Approve when right.</h2><p className="mt-2 text-sm font-bold leading-6 text-slate-600">Churvox prepares. You approve.</p>{!action.ready ? <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-black text-red-800">This action needs details before it can run.</div> : null}<div className="mt-5 grid gap-3"><button type="button" disabled={busy || !action.ready} onClick={() => onApprove(action, form)} className="rounded-2xl bg-orange-400 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-50">{busy ? "Applying…" : "Approve action"}</button><Link to={href} onClick={onClose} className="rounded-2xl bg-white px-4 py-3 text-center text-sm font-black text-slate-950 ring-1 ring-slate-200">Open related page</Link><button type="button" onClick={onClose} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white">Back</button></div></aside></main></section></div>;
}

export default function CommandDeskOperatorPage() {
  const { get, post, patch } = useApi();
  const [data, setData] = React.useState({ jobs: [], invoices: [], quotes: [], workers: [], clients: [] });
  const [actions, setActions] = React.useState([]);
  const [open, setOpen] = React.useState(null);
  const [busy, setBusy] = React.useState(false);

  const refresh = React.useCallback(async () => {
    setBusy(true);
    try {
      const [jobsRes, invoicesRes, quotesRes, workersRes, clientsRes] = await Promise.allSettled([get("/jobs"), get("/invoices"), get("/quotes"), get("/team/workers"), get("/clients")]);
      const next = { jobs: jobsRes.status === "fulfilled" ? listFrom(jobsRes.value, ["jobs"]) : [], invoices: invoicesRes.status === "fulfilled" ? listFrom(invoicesRes.value, ["invoices"]) : [], quotes: quotesRes.status === "fulfilled" ? listFrom(quotesRes.value, ["quotes"]) : [], workers: workersRes.status === "fulfilled" ? listFrom(workersRes.value, ["workers", "team", "users"]) : [], clients: clientsRes.status === "fulfilled" ? listFrom(clientsRes.value, ["clients", "customers"]) : [] };
      setData(next);
      setActions(makeActions(next));
    } finally { setBusy(false); }
  }, [get]);

  React.useEffect(() => { refresh(); }, [refresh]);

  async function approve(action, form) {
    if (!action?.ready) return toast.error("This action needs details first");
    setBusy(true);
    try {
      let res = { success: true };
      if (action.type === "assign_job") res = await post(`/jobs/${encodeURIComponent(form.job_id)}/assign`, { worker_id: form.worker_id });
      if (action.type === "draft_invoice") res = await post("/invoices", { job_id: form.job_id, client_id: form.client_id || undefined, customer_name: form.customer_name || form.client_name, customer_email: form.customer_email || undefined, subtotal: numberValue(form.subtotal), description: form.description });
      if (action.type === "send_invoice") res = await patch(`/invoices/${encodeURIComponent(form.invoice_id)}`, { status: "sent" });
      if (action.type === "invoice_follow_up") res = await patch(`/invoices/${encodeURIComponent(form.invoice_id)}`, { notes: appendNote(form.existing_notes, "Follow-up prepared", form.message) });
      if (action.type === "quote_follow_up") res = await patch(`/quotes/${encodeURIComponent(form.quote_id)}`, { notes: appendNote(form.existing_notes, "Follow-up prepared", form.message) });
      if (action.type === "quote_convert") res = await post(`/quotes/${encodeURIComponent(form.quote_id)}/convert`, {});
      if (!res?.success) throw new Error(res?.error || "Approval failed");
      toast.success("Approved and applied");
      setOpen(null);
      await refresh();
    } catch (error) { toast.error(error?.message || "Approval failed"); }
    finally { setBusy(false); }
  }

  const jobActions = actions.filter((action) => action.box === "jobs");
  const invoiceActions = actions.filter((action) => action.box === "invoices");
  const quoteActions = actions.filter((action) => action.box === "quotes");
  const crewActions = actions.filter((action) => action.box === "crew");
  const ready = actions.filter((action) => action.ready).length;
  const needs = actions.length - ready;

  return <main className="cv-command-board-offwhite fixed inset-0 z-[2147483000] overflow-y-auto text-slate-950" data-industrial-simple-page="command" data-command-canvas data-marker="CHURVOX_SMART_HUB_REAL_ACTIONS_20260608"><section className="mx-auto max-w-7xl p-4 pb-28 md:p-6 xl:p-8"><section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]"><section className={`${darkCard} p-6 md:p-8`}><span className="inline-flex rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[.22em] text-amber-300">Command Board</span><h1 className="mt-5 max-w-4xl text-5xl font-black leading-[.9] tracking-[-.08em] text-white md:text-7xl">Churvox does the admin. You approve.</h1><p className="mt-4 max-w-3xl text-sm font-bold leading-7 text-slate-300 md:text-base">Real approval slips for jobs, invoices, quotes and crew. Each approval applies a backend action or saves a prepared note for review.</p><div className="mt-6 flex flex-wrap gap-3"><button type="button" onClick={refresh} disabled={busy} className="rounded-2xl bg-amber-300 px-5 py-3 text-sm font-black text-slate-950 disabled:opacity-60">{busy ? "Checking…" : "Review AI actions"}</button><Link to="/jobs/new" className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white no-underline">Create job</Link><Link to="/support-board" className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white no-underline">Need help?</Link></div></section><section className={darkCard}><div className="flex items-start justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">AI priority</div><h2 className="mt-2 text-3xl font-black tracking-[-.06em] text-white">{ready ? `${ready} ready` : needs ? `${needs} need details` : "All clear"}</h2></div><Pill good={!needs}>{ready ? "Next" : "OK"}</Pill></div><p className="mt-3 text-sm font-bold leading-6 text-slate-300">Nothing is assigned, sent, created, converted or followed up without owner approval.</p></section></section><section className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4"><Metric label="Jobs" value={data.jobs.length} text="Jobs checked." tone="#facc15" /><Metric label="Invoices" value={data.invoices.length} text="Invoices checked." tone="#34d399" /><Metric label="Quotes" value={data.quotes.length} text="Quotes checked." tone="#22d3ee" /><Metric label="Approvals" value={actions.length} text="Prepared slips." tone="#fb923c" /></section><section className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4"><WorkBox label="Jobs" title="Jobs needing admin" count={jobActions.length} text="Completed jobs and job admin prepared for review." href="/jobs-board" tone="#facc15" actions={jobActions} empty="No job admin actions right now." onOpen={setOpen} /><WorkBox label="Invoices" title="Money waiting" count={invoiceActions.length} text="Draft, overdue, and ready-to-send invoice actions." href="/invoices-board" tone="#34d399" actions={invoiceActions} empty="No invoice actions right now." onOpen={setOpen} /><WorkBox label="Quotes" title="Quotes to chase" count={quoteActions.length} text="Quote follow-ups and accepted quotes to convert through the real quote flow." href="/quotes-board" tone="#22d3ee" actions={quoteActions} empty="No quote actions right now." onOpen={setOpen} /><WorkBox label="Crew" title="Crew Dispatch" count={crewActions.length} text="Unassigned jobs and worker assignment suggestions." href="/dispatch-board" tone="#fb923c" actions={crewActions} empty="No crew actions right now." onOpen={setOpen} /></section></section>{open ? <Slip action={open} onClose={() => setOpen(null)} onApprove={approve} busy={busy} /> : null}</main>;
}
