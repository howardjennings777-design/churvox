import React from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";

const darkCard = "cv-board-dark-card rounded-[30px] border border-white/10 bg-slate-950 p-5 text-white shadow-[0_22px_62px_rgba(2,6,23,.24)]";
const first = (...values) => values.find((value) => value !== undefined && value !== null && String(value).trim() !== "") || "";
const money = (value) => Number(String(value || 0).replace(/[^0-9.-]/g, "")) || 0;

function normalizeId(value) {
  if (!value) return "";
  if (typeof value === "object") return String(value.$oid || value.oid || value.id || value._id || "");
  const text = String(value || "");
  return text === "[object Object]" ? "" : text;
}
function idOf(item) { return normalizeId(item?.id || item?._id || item?.job_id || item?.invoice_id || item?.quote_id || item?.worker_id || item?.user_id || ""); }
function statusOf(item) { return String(first(item?.status, item?.job_status, item?.invoice_status, item?.quote_status, "")).toLowerCase(); }
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
function titleOf(job) { return first(job?.title, job?.job_title, job?.job_name, job?.service_type, job?.job_type, "Untitled job"); }
function invoiceTitle(invoice) { return first(invoice?.invoice_number, invoice?.number, invoice?.title, "Invoice"); }
function quoteTitle(quote) { return first(quote?.quote_number, quote?.title, quote?.job_description, "Quote"); }
function clientOf(item) { return first(item?.client_name, item?.customer_name, item?.client?.name, item?.name, "No client saved"); }
function workerName(worker) { return first(worker?.name, worker?.full_name, worker?.display_name, worker?.email, "Unnamed worker"); }
function roleOf(worker) { return String(first(worker?.role, worker?.account_type, "worker")).toLowerCase(); }
function fieldWorkers(workers) { return workers.filter((worker) => roleOf(worker).includes("worker") || roleOf(worker).includes("field") || roleOf(worker).includes("manager")); }
function assignedWorkerId(job) { return normalizeId(first(job?.assigned_worker_id, job?.worker_id, job?.assigned_to_id, "")); }
function assignedWorkerName(job) { return String(first(job?.assigned_worker_name, job?.worker_name, job?.assignee_name, job?.assigned_to_name, job?.assigned_to, "")).toLowerCase(); }
function workerLoad(worker, jobs) {
  const wid = idOf(worker);
  const name = workerName(worker).toLowerCase();
  return jobs.filter((job) => !isDone(job) && !isCancelled(job) && ((wid && assignedWorkerId(job) === wid) || (name && assignedWorkerName(job) === name))).length;
}
function pickWorker(job, workers, jobs) { return [...fieldWorkers(workers)].sort((a, b) => workerLoad(a, jobs) - workerLoad(b, jobs))[0] || null; }
function amountOf(item) { return money(first(item?.total, item?.amount_due, item?.balance_due, item?.amount, item?.price, item?.fixed_price, item?.subtotal, item?.invoice_total, item?.quote_total, 0)); }
function appendNote(existing, label, note) { return `${existing ? `${existing}\n\n` : ""}${label} ${new Date().toLocaleDateString("en-NZ")}: ${note || "Reviewed by owner"}`.trim(); }
function relatedHref(action, form) {
  if (action?.href) return action.href;
  if (action?.type === "assign_job" || action?.type === "draft_invoice") return form?.job_id ? `/jobs/${form.job_id}` : "/jobs-board";
  if (action?.type === "send_invoice" || action?.type === "invoice_follow_up") return form?.invoice_id ? `/invoices/${form.invoice_id}` : "/invoices-board";
  if (action?.type === "quote_follow_up" || action?.type === "quote_convert") return form?.quote_id ? `/quotes/${form.quote_id}` : "/quotes-board";
  return "/dashboard";
}
function actionArea(action) {
  if (action?.type === "summary") return "summary";
  if (action?.type === "assign_job") return "crew";
  if (action?.type === "draft_invoice") return "job";
  if (action?.type === "send_invoice" || action?.type === "invoice_follow_up") return "invoice";
  if (action?.type === "quote_follow_up" || action?.type === "quote_convert") return "quote";
  return "job";
}
function blocker(action, form = action?.form || {}) {
  if (action?.type === "summary") return "No approval needed right now. Churvox checked this area and nothing is waiting.";
  if (action?.type === "assign_job" && !first(form.worker_id, form.recommended_worker_id)) return "Pick a worker before approving.";
  if (action?.type === "draft_invoice" && money(first(form.job_price, form.subtotal, form.amount)) <= 0) return "Add a job price before creating the invoice draft.";
  if (action?.type === "send_invoice" && !form.invoice_id) return "Invoice ID is missing.";
  if ((action?.type === "invoice_follow_up" || action?.type === "quote_follow_up") && !first(form.message, form.invoice_message)) return "Add a message or note before saving the follow-up.";
  if (action?.type === "quote_convert" && !form.quote_id) return "Quote ID is missing.";
  return "";
}
function isReady(action, form = action?.form || {}) { return !blocker(action, form); }
function summarySlip({ label, title, href, empty }) {
  return {
    id: `summary-${label}`,
    box: label.toLowerCase(),
    type: "summary",
    title,
    summary: empty,
    ready: false,
    href,
    form: {
      checked_area: label,
      result: empty,
      checked_jobs: "Unassigned work, completed jobs, missing job price",
      checked_money: "Draft invoices, overdue invoices, unpaid follow-ups",
      checked_quotes: "Sent quotes, accepted quotes, stale follow-ups",
      checked_crew: "Crew availability, assignment gaps, workload warning",
      next_step: "Nothing to approve right now",
    },
    found: `I checked ${label.toLowerCase()} records and did not find owner work waiting in this box.`,
    prepared: "No approval slip was needed, so I prepared this checked summary instead.",
    outcome: "No action is required unless you want to inspect the full records.",
  };
}
function attachMeta(action) {
  const map = {
    assign_job: {
      found: "An unassigned job needs a crew decision.",
      prepared: "I checked crew records and prepared a recommended assignment with editable dispatch notes.",
      outcome: "Approving assigns the selected worker to the job.",
    },
    draft_invoice: {
      found: "A completed job is not invoiced yet.",
      prepared: "I prepared a draft invoice workspace with price, description and customer details editable before approval.",
      outcome: "Approving creates a draft invoice. It does not send it to the customer yet.",
    },
    send_invoice: {
      found: "A draft invoice is waiting for owner review.",
      prepared: "I prepared invoice status, amount, due date and message fields so you can check before marking sent.",
      outcome: "Approving marks the invoice as sent. It does not charge the customer.",
    },
    invoice_follow_up: {
      found: "An invoice needs payment follow-up.",
      prepared: "I drafted a follow-up note with invoice amount, due date and customer context editable inside the slip.",
      outcome: "Approving saves the follow-up note on the invoice. It does not auto-send SMS or email.",
    },
    quote_follow_up: {
      found: "A sent quote has not converted yet.",
      prepared: "I drafted a follow-up note and kept quote value, scope and client context editable.",
      outcome: "Approving saves the follow-up note on the quote. It does not auto-send SMS or email.",
    },
    quote_convert: {
      found: "An accepted quote has not become a job yet.",
      prepared: "I prepared a quote-to-job workspace so you can review scope and notes before converting.",
      outcome: "Approving creates a job from the accepted quote.",
    },
  };
  return { ...action, ...(map[action.type] || {}) };
}
function makeActions({ jobs, invoices, quotes, workers }) {
  const actions = [];
  const invoicedJobs = new Set(invoices.map((invoice) => String(first(invoice.job_id, invoice.jobId, invoice.linked_job_id, ""))).filter(Boolean));

  jobs.filter(isUnassigned).slice(0, 8).forEach((job) => {
    const worker = pickWorker(job, workers, jobs);
    const form = {
      job_id: idOf(job),
      job_title: titleOf(job),
      status: first(job.status, job.job_status, "unassigned"),
      client_name: clientOf(job),
      customer_email: first(job.customer_email, job.client_email, job.email),
      customer_phone: first(job.customer_phone, job.client_phone, job.phone),
      address: first(job.address, job.site_address, job.location, "No address saved"),
      scheduled_date: first(job.scheduled_date, job.date, job.start_date, job.scheduled_at),
      scheduled_time: first(job.scheduled_time, job.time, job.start_time),
      worker_id: worker ? idOf(worker) : "",
      worker_name: worker ? workerName(worker) : "",
      other_worker_note: `${fieldWorkers(workers).length} field worker record${fieldWorkers(workers).length === 1 ? "" : "s"} checked`,
      schedule_conflict: "No conflict check wired yet — owner should confirm timing before approval.",
      workload_reason: worker ? `${workerName(worker)} has ${workerLoad(worker, jobs)} open job${workerLoad(worker, jobs) === 1 ? "" : "s"}.` : "No available worker found.",
      dispatch_note: first(job.dispatch_note, job.notes, "Prepared for crew dispatch review"),
      owner_note: first(job.owner_note, ""),
    };
    actions.push(attachMeta({ id: `assign-${idOf(job)}`, box: "crew", type: "assign_job", title: "Assign crew to job", summary: worker ? `${workerName(worker)} looks like the best fit from current load.` : "No suitable worker found yet.", ready: isReady({ type: "assign_job", form }, form), form }));
  });

  jobs.filter((job) => isDone(job) && !invoicedJobs.has(idOf(job))).slice(0, 8).forEach((job) => {
    const amount = amountOf(job);
    const form = {
      job_id: idOf(job),
      job_title: titleOf(job),
      status: first(job.status, job.job_status, "completed"),
      client_id: first(job.client_id, job.customer_id),
      client_name: clientOf(job),
      customer_email: first(job.customer_email, job.client_email, job.email),
      customer_phone: first(job.customer_phone, job.client_phone, job.phone),
      address: first(job.address, job.site_address, job.location),
      scheduled_date: first(job.scheduled_date, job.date, job.start_date, job.scheduled_at),
      assigned_worker: first(job.assigned_worker_name, job.worker_name, job.assigned_to),
      pricing_type: first(job.pricing_type, job.price_type, amount ? "fixed price" : "missing price"),
      job_price: amount,
      hourly_rate: first(job.hourly_rate, job.rate),
      extras: first(job.extras, job.extra_charges, ""),
      total_time: first(job.total_time, job.net_time, job.duration, "Not recorded"),
      photos_count: first(job.photos_count, Array.isArray(job.photos) ? job.photos.length : "Not checked"),
      job_notes: first(job.notes, job.internal_notes, ""),
      worker_notes: first(job.worker_notes, job.completion_note, ""),
      invoice_description: first(job.invoice_description, job.description, job.notes, `${titleOf(job)} completed`),
      approval_note: "Review price and invoice wording before creating the draft invoice.",
    };
    actions.push(attachMeta({ id: `invoice-job-${idOf(job)}`, box: "jobs", type: "draft_invoice", title: "Create invoice from completed job", summary: amount ? "Completed job is ready to invoice." : "Completed job needs a price before invoice draft.", ready: isReady({ type: "draft_invoice", form }, form), form }));
  });

  invoices.filter((invoice) => statusOf(invoice) === "draft").slice(0, 6).forEach((invoice) => {
    const form = {
      invoice_id: idOf(invoice),
      invoice_title: invoiceTitle(invoice),
      status: first(invoice.status, "draft"),
      job_id: first(invoice.job_id, invoice.linked_job_id),
      client_name: clientOf(invoice),
      customer_email: first(invoice.customer_email, invoice.client_email, invoice.email),
      customer_phone: first(invoice.customer_phone, invoice.client_phone, invoice.phone),
      amount: amountOf(invoice),
      gst: first(invoice.gst, invoice.tax, invoice.gst_amount, "Use business GST setting"),
      issue_date: first(invoice.issue_date, invoice.created_at, "Today"),
      due_date: first(invoice.due_date, invoice.date_due, "No due date saved"),
      invoice_description: first(invoice.description, invoice.invoice_description, invoice.notes, ""),
      invoice_message: first(invoice.message, invoice.notes, "Invoice reviewed and ready to send"),
      payment_note: first(invoice.payment_note, ""),
      internal_note: first(invoice.internal_note, invoice.notes, ""),
    };
    actions.push(attachMeta({ id: `send-invoice-${idOf(invoice)}`, box: "invoices", type: "send_invoice", title: "Review draft invoice", summary: "Draft invoice is ready for owner review.", ready: isReady({ type: "send_invoice", form }, form), form }));
  });

  invoices.filter(isOverdue).slice(0, 6).forEach((invoice) => {
    const form = {
      invoice_id: idOf(invoice),
      invoice_title: invoiceTitle(invoice),
      status: first(invoice.status, "overdue"),
      job_id: first(invoice.job_id, invoice.linked_job_id),
      client_name: clientOf(invoice),
      customer_email: first(invoice.customer_email, invoice.client_email, invoice.email),
      customer_phone: first(invoice.customer_phone, invoice.client_phone, invoice.phone),
      amount_due: amountOf(invoice),
      gst: first(invoice.gst, invoice.tax, invoice.gst_amount, "Use business GST setting"),
      issue_date: first(invoice.issue_date, invoice.created_at, ""),
      due_date: first(invoice.due_date, invoice.date_due, "No due date saved"),
      invoice_description: first(invoice.description, invoice.invoice_description, ""),
      existing_notes: first(invoice.notes, ""),
      message: `Friendly reminder for ${clientOf(invoice)} about ${invoiceTitle(invoice)}.`,
      payment_note: "Owner approval required before sending any customer message.",
    };
    actions.push(attachMeta({ id: `follow-invoice-${idOf(invoice)}`, box: "invoices", type: "invoice_follow_up", title: "Prepare invoice follow-up", summary: "Overdue invoice needs follow-up.", ready: isReady({ type: "invoice_follow_up", form }, form), form }));
  });

  quotes.filter((quote) => statusOf(quote) === "sent" && !first(quote.converted_job_id, quote.job_id, quote.linked_job_id)).slice(0, 6).forEach((quote) => {
    const form = {
      quote_id: idOf(quote),
      quote_title: quoteTitle(quote),
      status: first(quote.status, "sent"),
      client_name: clientOf(quote),
      customer_email: first(quote.customer_email, quote.client_email, quote.email),
      customer_phone: first(quote.customer_phone, quote.client_phone, quote.phone),
      quote_value: amountOf(quote),
      valid_until: first(quote.valid_until, quote.expiry_date, quote.expires_at, "Not set"),
      scope: first(quote.scope, quote.description, quote.job_description, ""),
      existing_notes: first(quote.notes, ""),
      message: `Hi ${clientOf(quote)}, just checking whether you had any questions about your quote.`,
      internal_note: "Follow-up prepared by Churvox. Owner approves before sending anything.",
    };
    actions.push(attachMeta({ id: `follow-quote-${idOf(quote)}`, box: "quotes", type: "quote_follow_up", title: "Follow up quote", summary: "Sent quote is ready for a follow-up note.", ready: isReady({ type: "quote_follow_up", form }, form), form }));
  });

  quotes.filter((quote) => statusOf(quote).includes("accept") && !first(quote.converted_job_id, quote.job_id, quote.linked_job_id)).slice(0, 6).forEach((quote) => {
    const form = {
      quote_id: idOf(quote),
      quote_title: quoteTitle(quote),
      status: first(quote.status, "accepted"),
      client_name: clientOf(quote),
      customer_email: first(quote.customer_email, quote.client_email, quote.email),
      customer_phone: first(quote.customer_phone, quote.client_phone, quote.phone),
      quote_value: amountOf(quote),
      scope: first(quote.scope, quote.description, quote.job_description, ""),
      preferred_start: first(quote.preferred_start, quote.start_date, ""),
      job_note: "Create job from accepted quote",
      internal_note: "Accepted quote found. Owner approval creates the job.",
    };
    actions.push(attachMeta({ id: `convert-quote-${idOf(quote)}`, box: "quotes", type: "quote_convert", title: "Convert accepted quote to job", summary: "Accepted quote can become a job.", ready: isReady({ type: "quote_convert", form }, form), form }));
  });

  return actions.filter((action) => action.id && !action.id.endsWith("-"));
}

function Pill({ children, good }) {
  return <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[.14em] ${good ? "bg-emerald-300 text-slate-950" : "bg-amber-300 text-slate-950"}`}>{children}</span>;
}
function Metric({ label, value, text, tone }) {
  return <article className={`${darkCard} relative overflow-hidden pl-7`}><span className="absolute left-0 top-0 h-full w-2" style={{ background: `linear-gradient(180deg, ${tone}, #facc15, #22d3ee)` }} /><div className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">{label}</div><div className="mt-2 text-4xl font-black tracking-[-.07em] text-white">{value}</div><p className="mt-2 text-sm font-bold leading-6 text-slate-300">{text}</p></article>;
}
function ActionCard({ action, onOpen }) {
  return <button type="button" onClick={() => onOpen(action)} className="rounded-[22px] border border-white/10 bg-white/[0.06] p-4 text-left text-white hover:bg-white/[0.09]"><div className="flex items-start justify-between gap-3"><h3 className="text-lg font-black tracking-[-.04em] text-white">{action.title}</h3><Pill good={action.ready}>Editable</Pill></div><div className="mt-3 grid gap-2 text-sm font-bold leading-6 text-slate-300"><p><b className="text-cyan-200">AI found:</b> {action.found}</p><p><b className="text-amber-200">AI prepared:</b> {action.prepared}</p>{!action.ready ? <p className="text-red-200"><b>Need you to fix:</b> {blocker(action)}</p> : null}</div><div className="mt-4 inline-flex rounded-2xl bg-amber-300 px-4 py-2 text-sm font-black text-slate-950">Open mini workspace</div></button>;
}
function WorkBox({ label, title, count, text, href, tone, actions, empty, onOpen }) {
  const fallback = summarySlip({ label, title, href, empty });
  const openBox = () => onOpen(actions[0] || fallback);
  return <section className={`${darkCard} relative flex min-h-[340px] flex-col overflow-hidden pl-7`}><span className="absolute left-0 top-0 h-full w-2" style={{ background: `linear-gradient(180deg, ${tone}, #facc15, #22d3ee)` }} /><div className="flex items-start justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">{label}</div><h2 className="mt-2 text-3xl font-black tracking-[-.06em] text-white">{title}</h2></div><span className="rounded-full bg-white/10 px-3 py-1 text-sm font-black text-white ring-1 ring-white/10">{count}</span></div><p className="mt-3 text-sm font-bold leading-6 text-slate-300">{text}</p><button type="button" onClick={openBox} className="mt-5 rounded-[22px] border border-white/10 bg-white/[0.06] p-4 text-left text-sm font-black leading-6 text-slate-300 hover:bg-white/[0.09]">{actions.length ? <><span className="mb-2 block text-[10px] uppercase tracking-[.16em] text-amber-200">Tap to work from Command</span>{actions.length} mini workspace{actions.length === 1 ? "" : "s"} ready. Edit, fix missing info and approve from the slip.</> : <><span className="mb-2 block text-[10px] uppercase tracking-[.16em] text-emerald-200">AI checked</span>{empty}</>}<span className="mt-4 inline-flex rounded-2xl bg-amber-300 px-4 py-2 text-sm font-black text-slate-950">Open slip workspace</span></button><div className="mt-4 grid gap-3">{actions.length ? actions.slice(0, 2).map((action) => <ActionCard key={action.id} action={action} onOpen={onOpen} />) : null}</div></section>;
}
function Field({ label, value, onChange, long = false, disabled = false, type = "text" }) {
  const inputClass = "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-950 disabled:bg-slate-100";
  return <label className={long ? "rounded-2xl border border-slate-200 bg-white p-3 md:col-span-2" : "rounded-2xl border border-slate-200 bg-white p-3"}><span className="text-[10px] font-black uppercase tracking-[.14em] text-orange-700">{label}</span>{long ? <textarea disabled={disabled} value={value || ""} onChange={(event) => onChange(event.target.value)} className={`${inputClass} min-h-[92px]`} /> : <input type={type} disabled={disabled} value={value || ""} onChange={(event) => onChange(event.target.value)} className={inputClass} />}</label>;
}
function SelectField({ label, value, onChange, options = [] }) {
  return <label className="rounded-2xl border border-slate-200 bg-white p-3"><span className="text-[10px] font-black uppercase tracking-[.14em] text-orange-700">{label}</span><select value={value || ""} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-950">{options.map((option) => <option key={option} value={option}>{option || "Not set"}</option>)}</select></label>;
}
function Fact({ label, value }) {
  return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3"><div className="text-[10px] font-black uppercase tracking-[.14em] text-slate-500">{label}</div><div className="mt-1 break-words text-sm font-black text-slate-950">{value || "Not saved"}</div></div>;
}
function SlipHeader({ badge, title, action, onClose }) {
  return <header className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 text-white"><span className="absolute left-0 top-0 h-full w-2 bg-gradient-to-b from-cyan-300 via-amber-300 to-orange-400" /><div className="flex items-start justify-between gap-4 pl-2"><div><div className="inline-flex rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.18em] text-amber-200">{badge}</div><h1 className="mt-3 text-4xl font-black tracking-[-.07em] text-white md:text-6xl">{title}</h1><div className="mt-4 grid gap-2 text-sm font-bold leading-6 text-slate-300"><p><b className="text-white">AI checked:</b> live Churvox records for this area.</p><p><b className="text-white">AI found:</b> {action.found}</p><p><b className="text-white">AI prepared:</b> {action.prepared}</p></div></div><button type="button" onClick={onClose} className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950">Close</button></div></header>;
}
function WorkspaceShell({ action, form, href, busy, onApprove, onClose, onLocalSave, approveLabel, blockedLabel, children }) {
  const isSummary = action.type === "summary";
  const missing = blocker(action, form);
  const ready = !missing && !isSummary;
  return <main className="grid gap-5 bg-[#f7f3ea] p-5 xl:grid-cols-[minmax(0,1fr)_340px]"><section className="rounded-[28px] border border-slate-200 bg-white p-5">{children}<div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-black leading-6 text-amber-950">This slip is the workspace. Edit what needs fixing here first, then approve when it is right. Full page is only a backup.</div></section><aside className="rounded-[28px] border border-slate-200 bg-white p-5"><div className="text-[10px] font-black uppercase tracking-[.18em] text-orange-700">Owner decision</div><h2 className="mt-2 text-3xl font-black tracking-[-.06em] text-slate-950">{isSummary ? "Nothing waiting." : "Yup, approve or fix."}</h2><p className="mt-2 text-sm font-bold leading-6 text-slate-600">{action.outcome}</p>{missing ? <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-black leading-6 text-red-800"><span className="block text-[10px] uppercase tracking-[.14em]">Need you to fix</span>{missing}</div> : <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-black leading-6 text-emerald-950">Ready for owner approval.</div>}<div className="mt-5 grid gap-3">{!isSummary ? <button type="button" onClick={onLocalSave} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-950">Save edits in slip</button> : null}{!isSummary ? <button type="button" disabled={busy || !ready} onClick={() => onApprove(action, form)} className="rounded-2xl bg-orange-400 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-50">{busy ? "Applying…" : ready ? approveLabel : blockedLabel}</button> : null}<Link to={href} onClick={onClose} className="rounded-2xl bg-white px-4 py-3 text-center text-sm font-black text-slate-950 ring-1 ring-slate-200">Open full record</Link><button type="button" onClick={onClose} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white">Back to Command Board</button></div></aside></main>;
}
function JobSlip({ action, form, setForm, href, busy, onApprove, onClose, onLocalSave }) {
  return <><SlipHeader badge="Job mini workspace" title={action.title} action={action} onClose={onClose} /><WorkspaceShell action={action} form={form} href={href} busy={busy} onApprove={onApprove} onClose={onClose} onLocalSave={onLocalSave} approveLabel="Yup, create draft invoice" blockedLabel="Fix job price first"><div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-700">Job workspace</div><div className="mt-4 grid gap-3 md:grid-cols-2"><Field label="Job title" value={form.job_title} onChange={(v) => setForm((p) => ({ ...p, job_title: v }))} /><SelectField label="Status" value={form.status} onChange={(v) => setForm((p) => ({ ...p, status: v }))} options={["completed", "in progress", "assigned", "paused", "cancelled"]} /><Field label="Client" value={form.client_name} onChange={(v) => setForm((p) => ({ ...p, client_name: v }))} /><Field label="Customer email" value={form.customer_email} onChange={(v) => setForm((p) => ({ ...p, customer_email: v }))} /><Field label="Customer phone" value={form.customer_phone} onChange={(v) => setForm((p) => ({ ...p, customer_phone: v }))} /><Field label="Address" value={form.address} onChange={(v) => setForm((p) => ({ ...p, address: v }))} /><Field label="Scheduled date" value={form.scheduled_date} onChange={(v) => setForm((p) => ({ ...p, scheduled_date: v }))} /><Field label="Assigned worker" value={form.assigned_worker} onChange={(v) => setForm((p) => ({ ...p, assigned_worker: v }))} /><SelectField label="Pricing type" value={form.pricing_type} onChange={(v) => setForm((p) => ({ ...p, pricing_type: v }))} options={["fixed price", "hourly", "fixed + extras", "hourly + extras", "missing price"]} /><Field label="Job price" value={form.job_price} onChange={(v) => setForm((p) => ({ ...p, job_price: v, subtotal: v }))} /><Field label="Hourly rate" value={form.hourly_rate} onChange={(v) => setForm((p) => ({ ...p, hourly_rate: v }))} /><Field label="Extras" value={form.extras} onChange={(v) => setForm((p) => ({ ...p, extras: v }))} /><Fact label="Time summary" value={form.total_time} /><Fact label="Photos checked" value={form.photos_count} /><Field label="Job notes" long value={form.job_notes} onChange={(v) => setForm((p) => ({ ...p, job_notes: v }))} /><Field label="Worker notes" long value={form.worker_notes} onChange={(v) => setForm((p) => ({ ...p, worker_notes: v }))} /><Field label="Invoice description" long value={form.invoice_description || form.description} onChange={(v) => setForm((p) => ({ ...p, invoice_description: v, description: v }))} /><Field label="Owner approval note" long value={form.approval_note} onChange={(v) => setForm((p) => ({ ...p, approval_note: v }))} /></div></WorkspaceShell></>;
}
function InvoiceSlip({ action, form, setForm, href, busy, onApprove, onClose, onLocalSave }) {
  const followUp = action.type === "invoice_follow_up";
  return <><SlipHeader badge="Invoice mini workspace" title={action.title} action={action} onClose={onClose} /><WorkspaceShell action={action} form={form} href={href} busy={busy} onApprove={onApprove} onClose={onClose} onLocalSave={onLocalSave} approveLabel={followUp ? "Yup, save follow-up" : "Yup, mark sent"} blockedLabel="Fix invoice details first"><div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-700">Money workspace</div><div className="mt-4 grid gap-3 md:grid-cols-2"><Field label="Invoice" value={form.invoice_title} onChange={(v) => setForm((p) => ({ ...p, invoice_title: v }))} /><SelectField label="Status" value={form.status} onChange={(v) => setForm((p) => ({ ...p, status: v }))} options={["draft", "sent", "viewed", "paid", "overdue", "cancelled"]} /><Field label="Client" value={form.client_name} onChange={(v) => setForm((p) => ({ ...p, client_name: v }))} /><Field label="Customer email" value={form.customer_email} onChange={(v) => setForm((p) => ({ ...p, customer_email: v }))} /><Field label="Customer phone" value={form.customer_phone} onChange={(v) => setForm((p) => ({ ...p, customer_phone: v }))} /><Field label="Job ID" value={form.job_id} onChange={(v) => setForm((p) => ({ ...p, job_id: v }))} /><Field label="Amount" value={form.amount || form.amount_due} onChange={(v) => setForm((p) => ({ ...p, amount: v, amount_due: v }))} /><Field label="GST / tax" value={form.gst} onChange={(v) => setForm((p) => ({ ...p, gst: v }))} /><Field label="Issue date" value={form.issue_date} onChange={(v) => setForm((p) => ({ ...p, issue_date: v }))} /><Field label="Due date" value={form.due_date} onChange={(v) => setForm((p) => ({ ...p, due_date: v }))} /><Field label="Invoice description" long value={form.invoice_description} onChange={(v) => setForm((p) => ({ ...p, invoice_description: v }))} /><Field label={followUp ? "Follow-up message" : "Invoice message"} long value={form.message || form.invoice_message} onChange={(v) => setForm((p) => ({ ...p, message: v, invoice_message: v }))} /><Field label="Payment note" long value={form.payment_note} onChange={(v) => setForm((p) => ({ ...p, payment_note: v }))} /><Field label="Internal note" long value={form.internal_note || form.existing_notes} onChange={(v) => setForm((p) => ({ ...p, internal_note: v, existing_notes: v }))} /></div></WorkspaceShell></>;
}
function QuoteSlip({ action, form, setForm, href, busy, onApprove, onClose, onLocalSave }) {
  const convert = action.type === "quote_convert";
  return <><SlipHeader badge="Quote mini workspace" title={action.title} action={action} onClose={onClose} /><WorkspaceShell action={action} form={form} href={href} busy={busy} onApprove={onApprove} onClose={onClose} onLocalSave={onLocalSave} approveLabel={convert ? "Yup, convert to job" : "Yup, save follow-up"} blockedLabel="Fix quote details first"><div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-700">Quote workspace</div><div className="mt-4 grid gap-3 md:grid-cols-2"><Field label="Quote" value={form.quote_title} onChange={(v) => setForm((p) => ({ ...p, quote_title: v }))} /><SelectField label="Status" value={form.status} onChange={(v) => setForm((p) => ({ ...p, status: v }))} options={["draft", "sent", "accepted", "declined", "expired"]} /><Field label="Client" value={form.client_name} onChange={(v) => setForm((p) => ({ ...p, client_name: v }))} /><Field label="Customer email" value={form.customer_email} onChange={(v) => setForm((p) => ({ ...p, customer_email: v }))} /><Field label="Customer phone" value={form.customer_phone} onChange={(v) => setForm((p) => ({ ...p, customer_phone: v }))} /><Field label="Quote value" value={form.quote_value || form.value} onChange={(v) => setForm((p) => ({ ...p, quote_value: v, value: v }))} /><Field label="Valid until" value={form.valid_until} onChange={(v) => setForm((p) => ({ ...p, valid_until: v }))} /><Field label="Preferred start" value={form.preferred_start} onChange={(v) => setForm((p) => ({ ...p, preferred_start: v }))} /><Field label="Scope / details" long value={form.scope} onChange={(v) => setForm((p) => ({ ...p, scope: v }))} /><Field label={convert ? "Convert-to-job note" : "Follow-up message"} long value={form.job_note || form.message} onChange={(v) => setForm((p) => ({ ...p, job_note: v, message: v }))} /><Field label="Internal note" long value={form.internal_note || form.existing_notes} onChange={(v) => setForm((p) => ({ ...p, internal_note: v, existing_notes: v }))} /></div></WorkspaceShell></>;
}
function CrewSlip({ action, form, setForm, href, busy, onApprove, onClose, onLocalSave }) {
  return <><SlipHeader badge="Crew dispatch mini workspace" title={action.title} action={action} onClose={onClose} /><WorkspaceShell action={action} form={form} href={href} busy={busy} onApprove={onApprove} onClose={onClose} onLocalSave={onLocalSave} approveLabel="Yup, assign worker" blockedLabel="Pick worker first"><div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-700">Crew dispatch workspace</div><div className="mt-4 grid gap-3 md:grid-cols-2"><Field label="Job" value={form.job_title} onChange={(v) => setForm((p) => ({ ...p, job_title: v }))} /><SelectField label="Status" value={form.status} onChange={(v) => setForm((p) => ({ ...p, status: v }))} options={["unassigned", "assigned", "in progress", "paused", "completed"]} /><Field label="Client" value={form.client_name} onChange={(v) => setForm((p) => ({ ...p, client_name: v }))} /><Field label="Customer phone" value={form.customer_phone} onChange={(v) => setForm((p) => ({ ...p, customer_phone: v }))} /><Field label="Address" value={form.address} onChange={(v) => setForm((p) => ({ ...p, address: v }))} /><Field label="Scheduled date" value={form.scheduled_date} onChange={(v) => setForm((p) => ({ ...p, scheduled_date: v }))} /><Field label="Scheduled time" value={form.scheduled_time} onChange={(v) => setForm((p) => ({ ...p, scheduled_time: v }))} /><Field label="Worker ID" value={form.worker_id || form.recommended_worker_id} onChange={(v) => setForm((p) => ({ ...p, worker_id: v, recommended_worker_id: v }))} /><Field label="Worker name" value={form.worker_name || form.recommended_worker} onChange={(v) => setForm((p) => ({ ...p, worker_name: v, recommended_worker: v }))} /><Fact label="Other workers checked" value={form.other_worker_note} /><Field label="Schedule conflict warning" long value={form.schedule_conflict} onChange={(v) => setForm((p) => ({ ...p, schedule_conflict: v }))} /><Field label="Workload / area reason" long value={form.workload_reason || form.reason} onChange={(v) => setForm((p) => ({ ...p, workload_reason: v, reason: v }))} /><Field label="Dispatch note" long value={form.dispatch_note} onChange={(v) => setForm((p) => ({ ...p, dispatch_note: v }))} /><Field label="Owner note" long value={form.owner_note} onChange={(v) => setForm((p) => ({ ...p, owner_note: v }))} /></div></WorkspaceShell></>;
}
function SummarySlip({ action, form, setForm, href, onClose }) {
  return <><SlipHeader badge="Checked summary" title={action.title} action={action} onClose={onClose} /><main className="grid gap-5 bg-[#f7f3ea] p-5 xl:grid-cols-[minmax(0,1fr)_320px]"><section className="rounded-[28px] border border-slate-200 bg-white p-5"><div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-700">AI checked this area</div><div className="mt-4 grid gap-3 md:grid-cols-2"><Field disabled label="Checked area" value={form.checked_area} onChange={() => {}} /><Field disabled label="Result" value={form.result} onChange={() => {}} /><Field disabled label="Jobs checked" value={form.checked_jobs} onChange={() => {}} /><Field disabled label="Money checked" value={form.checked_money} onChange={() => {}} /><Field disabled label="Quotes checked" value={form.checked_quotes} onChange={() => {}} /><Field disabled label="Crew checked" value={form.checked_crew} onChange={() => {}} /><Field disabled long label="Next step" value={form.next_step} onChange={() => {}} /></div></section><aside className="rounded-[28px] border border-slate-200 bg-white p-5"><div className="text-[10px] font-black uppercase tracking-[.18em] text-orange-700">Review controls</div><h2 className="mt-2 text-3xl font-black tracking-[-.06em] text-slate-950">No action needed.</h2><p className="mt-2 text-sm font-bold leading-6 text-slate-600">Nothing is waiting in this box. You can still open the full records if you want.</p><div className="mt-5 grid gap-3"><Link to={href} onClick={onClose} className="rounded-2xl bg-white px-4 py-3 text-center text-sm font-black text-slate-950 ring-1 ring-slate-200">Open full records</Link><button type="button" onClick={onClose} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white">Back to Command Board</button></div></aside></main></>;
}
function CommandSlip({ action, onClose, onApprove, busy }) {
  const [form, setForm] = React.useState(action?.form || {});
  React.useEffect(() => setForm(action?.form || {}), [action]);
  if (!action) return null;
  const href = relatedHref(action, form);
  const area = actionArea(action);
  const saveLocal = () => toast.success("Edits kept in this slip. Approve when ready.");
  return <div className="fixed inset-0 z-[2147483647] overflow-y-auto bg-slate-950/90 p-4 backdrop-blur-xl lg:pl-[286px]"><section className="mx-auto max-w-6xl overflow-hidden rounded-[34px] bg-[#f7f3ea] shadow-2xl">
    {area === "summary" ? <SummarySlip action={action} form={form} setForm={setForm} href={href} onClose={onClose} /> : null}
    {area === "job" ? <JobSlip action={action} form={form} setForm={setForm} href={href} busy={busy} onApprove={onApprove} onClose={onClose} onLocalSave={saveLocal} /> : null}
    {area === "invoice" ? <InvoiceSlip action={action} form={form} setForm={setForm} href={href} busy={busy} onApprove={onApprove} onClose={onClose} onLocalSave={saveLocal} /> : null}
    {area === "quote" ? <QuoteSlip action={action} form={form} setForm={setForm} href={href} busy={busy} onApprove={onApprove} onClose={onClose} onLocalSave={saveLocal} /> : null}
    {area === "crew" ? <CrewSlip action={action} form={form} setForm={setForm} href={href} busy={busy} onApprove={onApprove} onClose={onClose} onLocalSave={saveLocal} /> : null}
  </section></div>;
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
      const next = {
        jobs: jobsRes.status === "fulfilled" ? listFrom(jobsRes.value, ["jobs"]) : [],
        invoices: invoicesRes.status === "fulfilled" ? listFrom(invoicesRes.value, ["invoices"]) : [],
        quotes: quotesRes.status === "fulfilled" ? listFrom(quotesRes.value, ["quotes"]) : [],
        workers: workersRes.status === "fulfilled" ? listFrom(workersRes.value, ["workers", "team", "users"]) : [],
        clients: clientsRes.status === "fulfilled" ? listFrom(clientsRes.value, ["clients", "customers"]) : [],
      };
      setData(next);
      setActions(makeActions(next));
    } finally { setBusy(false); }
  }, [get]);
  React.useEffect(() => { refresh(); }, [refresh]);
  async function approve(action, form) {
    const missing = blocker(action, form);
    if (missing) return toast.error(missing);
    setBusy(true);
    try {
      let res = { success: true };
      if (action.type === "assign_job") res = await post(`/jobs/${encodeURIComponent(form.job_id)}/assign`, { worker_id: form.worker_id || form.recommended_worker_id });
      if (action.type === "draft_invoice") res = await post("/invoices", { job_id: form.job_id, client_id: form.client_id || undefined, customer_name: form.customer_name || form.client_name, customer_email: form.customer_email || undefined, subtotal: money(form.subtotal || form.job_price), description: form.description || form.invoice_description });
      if (action.type === "send_invoice") res = await patch(`/invoices/${encodeURIComponent(form.invoice_id)}`, { status: "sent", notes: form.invoice_message || form.message || form.internal_note });
      if (action.type === "invoice_follow_up") res = await patch(`/invoices/${encodeURIComponent(form.invoice_id)}`, { notes: appendNote(form.existing_notes || form.internal_note, "Follow-up prepared", form.message) });
      if (action.type === "quote_follow_up") res = await patch(`/quotes/${encodeURIComponent(form.quote_id)}`, { notes: appendNote(form.existing_notes || form.internal_note, "Follow-up prepared", form.message) });
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
  const ready = actions.filter((action) => isReady(action, action.form)).length;
  const needs = actions.length - ready;
  const next = actions.find((action) => isReady(action, action.form)) || actions[0];
  return <main className="cv-command-board-offwhite fixed inset-0 z-[2147483000] overflow-y-auto text-slate-950" data-industrial-simple-page="command" data-command-canvas data-marker="CHURVOX_COMMAND_FULL_EDITABLE_SLIPS_20260608"><section className="mx-auto max-w-7xl p-4 pb-28 md:p-6 xl:p-8"><section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]"><section className={`${darkCard} p-6 md:p-8`}><span className="inline-flex rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[.22em] text-amber-300">Command Board</span><h1 className="mt-5 max-w-4xl text-5xl font-black leading-[.9] tracking-[-.08em] text-white md:text-7xl">Churvox prepared the admin. You approve.</h1><p className="mt-4 max-w-3xl text-sm font-bold leading-7 text-slate-300 md:text-base">Full editable mini workspaces for jobs, invoices, quotes and crew. Fix missing info in the slip, approve when ready, and stop hunting around the app.</p><div className="mt-6 flex flex-wrap gap-3"><button type="button" onClick={refresh} disabled={busy} className="rounded-2xl bg-amber-300 px-5 py-3 text-sm font-black text-slate-950 disabled:opacity-60">{busy ? "Checking…" : "Refresh AI work"}</button>{next ? <button type="button" onClick={() => setOpen(next)} className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white">Open next workspace</button> : null}<Link to="/jobs/new" className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white no-underline">Create job</Link></div></section><section className={darkCard}><div className="flex items-start justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">AI priority</div><h2 className="mt-2 text-3xl font-black tracking-[-.06em] text-white">{ready ? `${ready} ready` : needs ? `${needs} need details` : "All clear"}</h2></div><Pill good={!needs}>{ready ? "Next" : "OK"}</Pill></div><p className="mt-3 text-sm font-bold leading-6 text-slate-300">{next ? next.summary : "No admin needs approval right now. I checked jobs, money, quotes and crew."}</p>{next ? <button type="button" onClick={() => setOpen(next)} className="mt-5 w-full rounded-2xl bg-amber-300 px-5 py-3 text-sm font-black text-slate-950">Review editable slip</button> : null}</section></section><section className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4"><Metric label="Jobs" value={data.jobs.length} text="Jobs checked." tone="#facc15" /><Metric label="Invoices" value={data.invoices.length} text="Invoices checked." tone="#34d399" /><Metric label="Quotes" value={data.quotes.length} text="Quotes checked." tone="#22d3ee" /><Metric label="Approvals" value={actions.length} text="Prepared slips." tone="#fb923c" /></section><section className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4"><WorkBox label="Jobs" title="Jobs I prepared" count={jobActions.length} text="Completed jobs, missing prices, job notes and invoice drafts." href="/jobs-board" tone="#facc15" actions={jobActions} empty="No job admin actions right now." onOpen={setOpen} /><WorkBox label="Invoices" title="Money I prepared" count={invoiceActions.length} text="Draft, overdue, due dates, GST and follow-up notes." href="/invoices-board" tone="#34d399" actions={invoiceActions} empty="No invoice actions right now." onOpen={setOpen} /><WorkBox label="Quotes" title="Quotes I prepared" count={quoteActions.length} text="Quote follow-ups, values, scopes and convert-to-job actions." href="/quotes-board" tone="#22d3ee" actions={quoteActions} empty="No quote actions right now." onOpen={setOpen} /><WorkBox label="Crew" title="Crew I prepared" count={crewActions.length} text="Worker assignment, schedule, conflict and dispatch notes." href="/dispatch-board" tone="#fb923c" actions={crewActions} empty="No crew actions right now." onOpen={setOpen} /></section></section>{open ? <CommandSlip action={open} onClose={() => setOpen(null)} onApprove={approve} busy={busy} /> : null}</main>;
}
