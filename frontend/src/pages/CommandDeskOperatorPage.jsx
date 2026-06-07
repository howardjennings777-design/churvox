import React from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";

const panel = {
  background: "linear-gradient(135deg, #111827, #070d16)",
  color: "#fff",
  boxShadow: "0 22px 62px rgba(2,6,23,.24), inset 0 1px 0 rgba(255,255,255,.06)",
};

function first(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== "") || "";
}

function listFrom(res, keys = []) {
  const data = res?.data ?? res;
  if (Array.isArray(data)) return data;
  for (const key of [...keys, "data", "items", "results", "jobs", "invoices", "quotes", "workers", "team", "users"]) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

function idOf(item) {
  const raw = item?.id || item?._id || item?.job_id || item?.invoice_id || item?.quote_id || item?.worker_id || "";
  return typeof raw === "object" && raw?.$oid ? raw.$oid : String(raw || "");
}

function money(value) {
  const n = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) && n > 0 ? n.toLocaleString("en-NZ", { style: "currency", currency: "NZD" }) : "";
}

function numberValue(value) {
  const n = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function statusOf(item) {
  return String(first(item?.status, item?.job_status, item?.invoice_status, item?.quote_status, "")).toLowerCase();
}

function isDone(job) {
  const status = statusOf(job);
  return status.includes("complete") || status.includes("done") || job?.completed === true || Boolean(job?.completed_at);
}

function isPaid(invoice) {
  return statusOf(invoice).includes("paid");
}

function isDraft(invoice) {
  return statusOf(invoice).includes("draft");
}

function isSent(item) {
  return statusOf(item).includes("sent");
}

function isOverdue(invoice) {
  if (isPaid(invoice)) return false;
  if (statusOf(invoice).includes("overdue")) return true;
  const due = first(invoice?.due_date, invoice?.due_at);
  if (!due) return false;
  const date = new Date(due);
  return !Number.isNaN(date.getTime()) && date.getTime() < Date.now();
}

function isUnassigned(job) {
  if (isDone(job)) return false;
  return !first(job?.assigned_worker_id, job?.worker_id, job?.assigned_to, job?.assigned_worker_name, job?.worker_name);
}

function titleOf(job) {
  return first(job?.title, job?.job_title, job?.service_type, job?.job_type, "Untitled job");
}

function clientOf(item) {
  return first(item?.client_name, item?.customer_name, item?.client?.name, item?.name, "No client saved");
}

function workerName(worker) {
  return first(worker?.name, worker?.full_name, worker?.display_name, worker?.email, "Unnamed worker");
}

function isFieldWorker(worker) {
  const role = String(first(worker?.role, worker?.account_type, "worker")).toLowerCase();
  return role.includes("worker") || role.includes("field") || role.includes("manager");
}

function pickWorker(job, workers) {
  const area = String(first(job?.region, job?.area, job?.suburb, "")).toLowerCase();
  const field = workers.filter(isFieldWorker);
  return [...field].sort((a, b) => {
    const aArea = String(first(a?.region, a?.area, a?.suburb, "")).toLowerCase() === area ? -2 : 0;
    const bArea = String(first(b?.region, b?.area, b?.suburb, "")).toLowerCase() === area ? -2 : 0;
    const aLoad = Number(first(a?.assigned_jobs_count, a?.open_jobs, 0)) || 0;
    const bLoad = Number(first(b?.assigned_jobs_count, b?.open_jobs, 0)) || 0;
    return (aArea + aLoad) - (bArea + bLoad);
  })[0] || null;
}

function makeActions({ jobs, invoices, quotes, workers }) {
  const actions = [];
  const invoicedJobs = new Set(invoices.map((invoice) => String(first(invoice.job_id, invoice.jobId, ""))).filter(Boolean));

  jobs.filter(isUnassigned).slice(0, 8).forEach((job) => {
    const worker = pickWorker(job, workers);
    actions.push({
      id: `assign-${idOf(job)}`,
      type: "assign_job",
      title: "Assign job",
      summary: worker ? `${workerName(worker)} looks like the best fit for this job.` : "Select a worker before approving this assignment.",
      ready: Boolean(idOf(job) && worker && idOf(worker)),
      form: { job_id: idOf(job), job_title: titleOf(job), client_name: clientOf(job), worker_id: worker ? idOf(worker) : "", worker_name: worker ? workerName(worker) : "", address: first(job.address, job.site_address) },
    });
  });

  jobs.filter((job) => isDone(job) && !invoicedJobs.has(idOf(job))).slice(0, 8).forEach((job) => {
    actions.push({
      id: `invoice-job-${idOf(job)}`,
      type: "draft_invoice",
      title: "Create draft invoice",
      summary: "Completed job is ready to become a draft invoice.",
      ready: Boolean(idOf(job) && first(job.price, job.total, job.subtotal)),
      form: { job_id: idOf(job), client_id: first(job.client_id, job.customer_id), client_name: clientOf(job), customer_name: clientOf(job), customer_email: first(job.customer_email, job.client_email, job.email), subtotal: first(job.price, job.total, job.subtotal), description: first(job.invoice_description, job.description, job.notes, `${titleOf(job)} completed`) },
    });
  });

  invoices.filter(isDraft).slice(0, 6).forEach((invoice) => {
    actions.push({
      id: `send-invoice-${idOf(invoice)}`,
      type: "send_invoice",
      title: "Send draft invoice",
      summary: "Draft invoice is ready to send after review.",
      ready: Boolean(idOf(invoice)),
      form: { invoice_id: idOf(invoice), invoice_number: first(invoice.invoice_number, invoice.number), client_name: clientOf(invoice), customer_email: first(invoice.customer_email, invoice.client_email, invoice.email), total: first(invoice.total, invoice.amount_due, invoice.subtotal) },
    });
  });

  invoices.filter(isOverdue).slice(0, 6).forEach((invoice) => {
    actions.push({
      id: `follow-invoice-${idOf(invoice)}`,
      type: "invoice_follow_up",
      title: "Review overdue invoice",
      summary: "Invoice needs follow-up. Review the wording first.",
      ready: Boolean(idOf(invoice)),
      form: { invoice_id: idOf(invoice), invoice_number: first(invoice.invoice_number, invoice.number), client_name: clientOf(invoice), amount_due: first(invoice.amount_due, invoice.total), message: `Friendly reminder for ${clientOf(invoice)} about invoice ${first(invoice.invoice_number, "")}.` },
    });
  });

  quotes.filter((quote) => isSent(quote) && !quote.converted_job_id).slice(0, 6).forEach((quote) => {
    actions.push({
      id: `follow-quote-${idOf(quote)}`,
      type: "quote_follow_up",
      title: "Follow up quote",
      summary: "Sent quote is ready for a polite follow-up.",
      ready: Boolean(idOf(quote)),
      form: { quote_id: idOf(quote), quote_number: first(quote.quote_number, quote.number), client_name: clientOf(quote), message: `Hi ${clientOf(quote)}, just checking whether you had any questions about your quote.` },
    });
  });

  quotes.filter((quote) => statusOf(quote).includes("accept") && !quote.converted_job_id).slice(0, 6).forEach((quote) => {
    actions.push({
      id: `convert-quote-${idOf(quote)}`,
      type: "quote_convert",
      title: "Convert quote to job",
      summary: "Accepted quote can become a job.",
      ready: Boolean(idOf(quote)),
      form: { quote_id: idOf(quote), quote_number: first(quote.quote_number, quote.number), client_name: clientOf(quote), total: first(quote.total, quote.price) },
    });
  });

  return actions;
}

function Pill({ children, good }) {
  return <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[.14em] ${good ? "bg-emerald-300 text-slate-950" : "bg-amber-300 text-slate-950"}`}>{children}</span>;
}

function Metric({ label, value, text }) {
  return <article className="rounded-[28px] border border-white/10 p-5 text-white" style={panel}><div className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">{label}</div><div className="mt-2 text-4xl font-black tracking-[-.07em]">{value}</div><p className="mt-2 text-sm font-bold leading-6 text-slate-300">{text}</p></article>;
}

function Slip({ action, onClose, onApprove }) {
  const [form, setForm] = React.useState(action?.form || {});
  React.useEffect(() => setForm(action?.form || {}), [action]);
  if (!action) return null;
  const ready = action.ready && Object.values(form).some(Boolean);
  const fields = Object.keys(form).filter((key) => !["id"].includes(key));
  return <div className="fixed inset-0 z-[2147483647] overflow-y-auto bg-slate-950/88 p-3 backdrop-blur md:p-6"><section className="mx-auto max-w-6xl overflow-hidden rounded-[34px] bg-[#f7f3ea] shadow-2xl"><header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white p-5 md:p-7"><div><div className="inline-flex rounded-full bg-orange-100 px-3 py-1 text-[10px] font-black uppercase tracking-[.18em] text-orange-700">Approval slip</div><h1 className="mt-3 text-4xl font-black tracking-[-.07em] text-slate-950 md:text-6xl">{action.title}</h1><p className="mt-3 text-sm font-bold leading-6 text-slate-600">{action.summary}</p></div><button type="button" onClick={onClose} className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white">Close</button></header><main className="grid gap-5 p-5 md:grid-cols-[1fr_340px]"><section className="rounded-[28px] border border-slate-200 bg-white p-5"><div className="text-[10px] font-black uppercase tracking-[.18em] text-blue-600">Review and edit</div><div className="mt-4 grid gap-3 md:grid-cols-2">{fields.map((key) => <label key={key} className="rounded-2xl border border-slate-200 bg-slate-50 p-3"><span className="text-[10px] font-black uppercase tracking-[.14em] text-slate-500">{key.replaceAll("_", " ")}</span><input value={form[key] || ""} onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-950" /></label>)}</div></section><aside className="rounded-[28px] border border-slate-200 bg-white p-5"><div className="text-[10px] font-black uppercase tracking-[.18em] text-orange-600">Owner action</div><h2 className="mt-2 text-3xl font-black tracking-[-.06em] text-slate-950">Approve when right.</h2><p className="mt-2 text-sm font-bold leading-6 text-slate-600">Churvox prepares. You approve. This action will use the real app endpoint where available.</p><div className="mt-5 grid gap-3"><button type="button" onClick={() => onApprove(action, form)} disabled={!ready} className="rounded-2xl bg-orange-400 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-50">Approve action</button><button type="button" onClick={onClose} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white">Back</button></div></aside></main></section></div>;
}

export default function CommandDeskOperatorPage() {
  const { get, post, patch } = useApi();
  const [data, setData] = React.useState({ jobs: [], invoices: [], quotes: [], workers: [] });
  const [actions, setActions] = React.useState([]);
  const [open, setOpen] = React.useState(null);
  const [busy, setBusy] = React.useState(false);

  const refresh = React.useCallback(async () => {
    setBusy(true);
    try {
      const [jobsRes, invoicesRes, quotesRes, workersRes] = await Promise.allSettled([get("/jobs"), get("/invoices"), get("/quotes"), get("/team/workers")]);
      const next = {
        jobs: jobsRes.status === "fulfilled" ? listFrom(jobsRes.value, ["jobs"]) : [],
        invoices: invoicesRes.status === "fulfilled" ? listFrom(invoicesRes.value, ["invoices"]) : [],
        quotes: quotesRes.status === "fulfilled" ? listFrom(quotesRes.value, ["quotes"]) : [],
        workers: workersRes.status === "fulfilled" ? listFrom(workersRes.value, ["workers", "team", "users"]) : [],
      };
      setData(next);
      setActions(makeActions(next));
    } finally {
      setBusy(false);
    }
  }, [get]);

  React.useEffect(() => { refresh(); }, [refresh]);

  async function approve(action, form) {
    setBusy(true);
    try {
      let res = { success: true };
      if (action.type === "assign_job") res = await post(`/jobs/${form.job_id}/assign`, { worker_id: form.worker_id });
      if (action.type === "draft_invoice") res = await post("/invoices", { job_id: form.job_id, client_id: form.client_id || undefined, customer_name: form.customer_name || form.client_name, customer_email: form.customer_email || undefined, subtotal: numberValue(form.subtotal), description: form.description });
      if (action.type === "send_invoice") res = await post(`/invoices/${form.invoice_id}/send`, {});
      if (action.type === "invoice_follow_up") res = await patch(`/invoices/${form.invoice_id}`, { last_follow_up_at: new Date().toISOString(), follow_up_message: form.message });
      if (action.type === "quote_follow_up") res = await patch(`/quotes/${form.quote_id}`, { last_follow_up_at: new Date().toISOString(), follow_up_message: form.message });
      if (action.type === "quote_convert") res = await post(`/quotes/${form.quote_id}/convert`, {});
      if (!res?.success) throw new Error(res?.error || "Approval failed");
      toast.success("Approved and applied");
      setOpen(null);
      await refresh();
    } catch (error) {
      toast.error(error?.message || "Approval failed");
    } finally {
      setBusy(false);
    }
  }

  const ready = actions.filter((a) => a.ready).length;
  const needs = actions.length - ready;

  return <main className="fixed inset-0 z-[2147483000] overflow-y-auto bg-[#f7f3ea] text-slate-950" data-industrial-simple-page="command" data-command-canvas><section className="mx-auto max-w-7xl p-4 pb-28 md:p-6 xl:p-8"><section className="grid gap-5 xl:grid-cols-[1fr_360px]"><section className="rounded-[30px] border border-white/10 p-6 text-white md:p-8" style={panel}><span className="inline-flex rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[.22em] text-amber-300">Command Board</span><h1 className="mt-5 max-w-4xl text-5xl font-black leading-[.9] tracking-[-.08em] text-white md:text-7xl">Churvox does the admin. You approve.</h1><p className="mt-4 max-w-3xl text-sm font-bold leading-7 text-slate-300 md:text-base">This board now checks real jobs, invoices, quotes and team records, then prepares approval-first slips.</p><div className="mt-6 flex flex-wrap gap-3"><button type="button" onClick={refresh} disabled={busy} className="rounded-2xl bg-amber-300 px-5 py-3 text-sm font-black text-slate-950 disabled:opacity-60">{busy ? "Checking…" : "Review AI actions"}</button><Link to="/jobs/new" className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white no-underline">Create job</Link></div></section><section className="rounded-[30px] border border-white/10 p-5 text-white" style={panel}><div className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">AI priority</div><h2 className="mt-2 text-3xl font-black tracking-[-.06em] text-white">{ready ? `${ready} ready` : needs ? `${needs} need details` : "All clear"}</h2><p className="mt-3 text-sm font-bold leading-6 text-slate-300">Every action opens a slip first. Nothing is assigned, sent, created or converted without approval.</p></section></section><section className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4"><Metric label="Jobs" value={data.jobs.length} text="Jobs checked." /><Metric label="Invoices" value={data.invoices.length} text="Invoices checked." /><Metric label="Quotes" value={data.quotes.length} text="Quotes checked." /><Metric label="Approvals" value={actions.length} text="Prepared slips." /></section><section className="mt-5 rounded-[30px] border border-white/10 p-5 text-white" style={panel}><div className="flex flex-wrap items-end justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">Approval queue</div><h2 className="mt-2 text-3xl font-black tracking-[-.06em] text-white">Prepared actions</h2></div><div className="text-sm font-bold text-slate-300">Tap a card to review the slip.</div></div>{actions.length ? <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{actions.map((action) => <button key={action.id} type="button" onClick={() => setOpen(action)} className="rounded-[24px] border border-white/10 bg-white/[0.06] p-4 text-left text-white hover:bg-white/[0.09]"><div className="flex items-start justify-between gap-3"><h3 className="text-xl font-black tracking-[-.05em] text-white">{action.title}</h3><Pill good={action.ready}>{action.ready ? "Ready" : "Needs details"}</Pill></div><p className="mt-2 text-sm font-bold leading-6 text-slate-300">{action.summary}</p><div className="mt-3 text-xs font-black uppercase tracking-[.14em] text-amber-300">{action.type.replaceAll("_", " ")}</div></button>)}</div> : <div className="mt-5 rounded-2xl border border-emerald-300/25 bg-emerald-300/10 p-5 text-sm font-black text-emerald-100">No approval actions right now.</div>}</section><div className="mt-5 flex flex-wrap gap-3"><Link to="/jobs-board" className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-950 no-underline">Open jobs</Link><Link to="/dispatch-board" className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-950 no-underline">Crew Dispatch</Link><Link to="/invoices-board" className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-950 no-underline">Invoices</Link></div></section>{open ? <Slip action={open} onClose={() => setOpen(null)} onApprove={approve} /> : null}</main>;
}
