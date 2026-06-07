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
function amountOf(item) { return money(first(item?.total, item?.amount_due, item?.balance_due, item?.amount, item?.price, item?.subtotal, item?.invoice_total, item?.quote_total, 0)); }
function appendNote(existing, label, note) { return `${existing ? `${existing}\n\n` : ""}${label} ${new Date().toLocaleDateString("en-NZ")}: ${note || "Reviewed by owner"}`.trim(); }
function relatedHref(action, form) {
  if (action?.href) return action.href;
  if (action?.type === "assign_job" || action?.type === "draft_invoice") return form?.job_id ? `/jobs/${form.job_id}` : "/jobs-board";
  if (action?.type === "send_invoice" || action?.type === "invoice_follow_up") return form?.invoice_id ? `/invoices/${form.invoice_id}` : "/invoices-board";
  if (action?.type === "quote_follow_up" || action?.type === "quote_convert") return form?.quote_id ? `/quotes/${form.quote_id}` : "/quotes-board";
  return "/dashboard";
}
function areaFor(action) {
  if (action?.type === "summary") return action?.box || "summary";
  if (action?.type === "assign_job") return "crew";
  if (action?.type === "draft_invoice") return "job";
  if (action?.type?.startsWith("invoice") || action?.type === "send_invoice") return "invoice";
  if (action?.type?.startsWith("quote")) return "quote";
  return "job";
}
function blocker(action) {
  if (action?.type === "summary") return "No approval needed right now. Churvox checked this box and there is nothing waiting.";
  if (action?.ready) return "";
  if (action?.type === "assign_job") return "A worker is missing. Pick or create a worker before approving.";
  if (action?.type === "draft_invoice") return "Job price is missing. Add the price here before approving the draft invoice.";
  return "This slip needs one or more required details before approval.";
}
function summarySlip({ label, title, href, empty }) {
  return {
    id: `summary-${label}`,
    box: label.toLowerCase(),
    type: "summary",
    title,
    summary: empty,
    ready: false,
    href,
    form: { checked_area: label, result: empty, next_step: "Nothing to approve right now" },
    found: `I checked ${label.toLowerCase()} records.`,
    prepared: empty,
    outcome: "No approval is needed from this box right now.",
  };
}
function attachMeta(action) {
  const map = {
    assign_job: {
      found: "I found an unassigned job that needs a crew decision.",
      prepared: "I checked available crew and prepared a recommended worker assignment.",
      outcome: "Approving assigns the selected worker to the job.",
    },
    draft_invoice: {
      found: "I found a completed job that has not been invoiced.",
      prepared: "I prepared a draft invoice using the job, client, description and price fields.",
      outcome: "Approving creates a draft invoice. It does not send it to the customer yet.",
    },
    send_invoice: {
      found: "I found a draft invoice waiting for owner review.",
      prepared: "I prepared the send-status update so it can move out of draft.",
      outcome: "Approving marks the invoice as sent. It does not charge the customer.",
    },
    invoice_follow_up: {
      found: "I found an invoice that needs payment follow-up.",
      prepared: "I drafted a follow-up note you can edit before saving.",
      outcome: "Approving saves the follow-up note on the invoice. It does not auto-send SMS or email.",
    },
    quote_follow_up: {
      found: "I found a sent quote that has not converted yet.",
      prepared: "I drafted a quote follow-up note you can edit.",
      outcome: "Approving saves the follow-up note on the quote. It does not auto-send SMS or email.",
    },
    quote_convert: {
      found: "I found an accepted quote that has not become a job yet.",
      prepared: "I prepared the quote-to-job conversion step.",
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
    actions.push(attachMeta({
      id: `assign-${idOf(job)}`,
      box: "crew",
      type: "assign_job",
      title: "Assign crew to job",
      summary: worker ? `${workerName(worker)} looks like the best fit from current load.` : "No suitable worker found yet.",
      ready: Boolean(idOf(job) && worker && idOf(worker)),
      form: {
        job_id: idOf(job),
        job_title: titleOf(job),
        client_name: clientOf(job),
        address: first(job.address, job.site_address, job.location, "No address saved"),
        recommended_worker_id: worker ? idOf(worker) : "",
        recommended_worker: worker ? workerName(worker) : "",
        reason: worker ? `${workerName(worker)} has the lightest current open-job load.` : "No worker is available in team records yet.",
        dispatch_note: first(job.dispatch_note, job.notes, "Prepared for crew dispatch review"),
      },
    }));
  });
  jobs.filter((job) => isDone(job) && !invoicedJobs.has(idOf(job))).slice(0, 8).forEach((job) => {
    const amount = amountOf(job);
    actions.push(attachMeta({
      id: `invoice-job-${idOf(job)}`,
      box: "jobs",
      type: "draft_invoice",
      title: "Create invoice from completed job",
      summary: amount ? "Completed job is ready to invoice." : "Completed job needs a price before invoice draft.",
      ready: Boolean(idOf(job) && amount > 0),
      form: {
        job_id: idOf(job),
        job_title: titleOf(job),
        client_id: first(job.client_id, job.customer_id),
        client_name: clientOf(job),
        customer_email: first(job.customer_email, job.client_email, job.email),
        job_price: amount,
        invoice_description: first(job.invoice_description, job.description, job.notes, `${titleOf(job)} completed`),
        proof_note: first(job.completion_note, job.notes, "Job marked completed and ready for owner invoice review"),
      },
    }));
  });
  invoices.filter((invoice) => statusOf(invoice) === "draft").slice(0, 6).forEach((invoice) => {
    actions.push(attachMeta({
      id: `send-invoice-${idOf(invoice)}`,
      box: "invoices",
      type: "send_invoice",
      title: "Review draft invoice",
      summary: "Draft invoice is ready for owner review.",
      ready: Boolean(idOf(invoice)),
      form: {
        invoice_id: idOf(invoice),
        invoice_title: invoiceTitle(invoice),
        client_name: clientOf(invoice),
        amount: amountOf(invoice),
        due_date: first(invoice.due_date, invoice.date_due, "No due date saved"),
        customer_email: first(invoice.customer_email, invoice.client_email, invoice.email),
        invoice_message: first(invoice.message, invoice.notes, "Invoice reviewed and ready to send"),
      },
    }));
  });
  invoices.filter(isOverdue).slice(0, 6).forEach((invoice) => {
    actions.push(attachMeta({
      id: `follow-invoice-${idOf(invoice)}`,
      box: "invoices",
      type: "invoice_follow_up",
      title: "Prepare invoice follow-up",
      summary: "Overdue invoice needs follow-up.",
      ready: Boolean(idOf(invoice)),
      form: {
        invoice_id: idOf(invoice),
        invoice_title: invoiceTitle(invoice),
        client_name: clientOf(invoice),
        amount_due: amountOf(invoice),
        due_date: first(invoice.due_date, invoice.date_due, "No due date saved"),
        existing_notes: first(invoice.notes, ""),
        message: `Friendly reminder for ${clientOf(invoice)} about ${invoiceTitle(invoice)}.`,
      },
    }));
  });
  quotes.filter((quote) => statusOf(quote) === "sent" && !first(quote.converted_job_id, quote.job_id, quote.linked_job_id)).slice(0, 6).forEach((quote) => {
    actions.push(attachMeta({
      id: `follow-quote-${idOf(quote)}`,
      box: "quotes",
      type: "quote_follow_up",
      title: "Follow up quote",
      summary: "Sent quote is ready for a follow-up note.",
      ready: Boolean(idOf(quote)),
      form: {
        quote_id: idOf(quote),
        quote_title: quoteTitle(quote),
        client_name: clientOf(quote),
        quote_value: amountOf(quote),
        existing_notes: first(quote.notes, ""),
        message: `Hi ${clientOf(quote)}, just checking whether you had any questions about your quote.`,
      },
    }));
  });
  quotes.filter((quote) => statusOf(quote).includes("accept") && !first(quote.converted_job_id, quote.job_id, quote.linked_job_id)).slice(0, 6).forEach((quote) => {
    actions.push(attachMeta({
      id: `convert-quote-${idOf(quote)}`,
      box: "quotes",
      type: "quote_convert",
      title: "Convert accepted quote to job",
      summary: "Accepted quote can become a job.",
      ready: Boolean(idOf(quote)),
      form: {
        quote_id: idOf(quote),
        quote_title: quoteTitle(quote),
        client_name: clientOf(quote),
        quote_value: amountOf(quote),
        job_note: "Create job from accepted quote",
      },
    }));
  });
  return actions.filter((action) => action.id && !action.id.endsWith("-"));
}

function Pill({ children, good }) { return <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[.14em] ${good ? "bg-emerald-300 text-slate-950" : "bg-amber-300 text-slate-950"}`}>{children}</span>; }
function Metric({ label, value, text, tone }) { return <article className={`${darkCard} relative overflow-hidden pl-7`}><span className="absolute left-0 top-0 h-full w-2" style={{ background: `linear-gradient(180deg, ${tone}, #facc15, #22d3ee)` }} /><div className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">{label}</div><div className="mt-2 text-4xl font-black tracking-[-.07em] text-white">{value}</div><p className="mt-2 text-sm font-bold leading-6 text-slate-300">{text}</p></article>; }
function ActionCard({ action, onOpen }) { return <button type="button" onClick={() => onOpen(action)} className="rounded-[22px] border border-white/10 bg-white/[0.06] p-4 text-left text-white hover:bg-white/[0.09]"><div className="flex items-start justify-between gap-3"><h3 className="text-lg font-black tracking-[-.04em] text-white">{action.title}</h3><Pill good={action.ready}>{action.ready ? "Ready" : "Fix"}</Pill></div><div className="mt-3 grid gap-2 text-sm font-bold leading-6 text-slate-300"><p><b className="text-cyan-200">AI found:</b> {action.found}</p><p><b className="text-amber-200">AI prepared:</b> {action.prepared}</p>{!action.ready ? <p className="text-red-200"><b>Need you to fix:</b> {blocker(action)}</p> : null}</div><div className="mt-4 inline-flex rounded-2xl bg-amber-300 px-4 py-2 text-sm font-black text-slate-950">Open editable slip</div></button>; }
function WorkBox({ label, title, count, text, href, tone, actions, empty, onOpen }) {
  const fallback = summarySlip({ label, title, href, empty });
  const openBox = () => onOpen(actions[0] || fallback);
  return <section className={`${darkCard} relative flex min-h-[340px] flex-col overflow-hidden pl-7`}><span className="absolute left-0 top-0 h-full w-2" style={{ background: `linear-gradient(180deg, ${tone}, #facc15, #22d3ee)` }} /><div className="flex items-start justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">{label}</div><h2 className="mt-2 text-3xl font-black tracking-[-.06em] text-white">{title}</h2></div><span className="rounded-full bg-white/10 px-3 py-1 text-sm font-black text-white ring-1 ring-white/10">{count}</span></div><p className="mt-3 text-sm font-bold leading-6 text-slate-300">{text}</p><button type="button" onClick={openBox} className="mt-5 rounded-[22px] border border-white/10 bg-white/[0.06] p-4 text-left text-sm font-black leading-6 text-slate-300 hover:bg-white/[0.09]">{actions.length ? <><span className="mb-2 block text-[10px] uppercase tracking-[.16em] text-amber-200">Tap to review prepared work</span>{actions.length} editable slip{actions.length === 1 ? "" : "s"} waiting. Open the first one here, then approve, edit, or fix missing info inside the slip.</> : <><span className="mb-2 block text-[10px] uppercase tracking-[.16em] text-emerald-200">AI checked</span>{empty}</>}<span className="mt-4 inline-flex rounded-2xl bg-amber-300 px-4 py-2 text-sm font-black text-slate-950">Open slip</span></button><div className="mt-4 grid gap-3">{actions.length ? actions.slice(0, 2).map((action) => <ActionCard key={action.id} action={action} onOpen={onOpen} />) : null}</div></section>;
}
function Field({ label, value, onChange, long = false, disabled = false }) {
  const inputClass = "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-950 disabled:bg-slate-100";
  return <label className={long ? "rounded-2xl border border-slate-200 bg-white p-3 md:col-span-2" : "rounded-2xl border border-slate-200 bg-white p-3"}><span className="text-[10px] font-black uppercase tracking-[.14em] text-orange-700">{label}</span>{long ? <textarea disabled={disabled} value={value || ""} onChange={(event) => onChange(event.target.value)} className={`${inputClass} min-h-[92px]`} /> : <input disabled={disabled} value={value || ""} onChange={(event) => onChange(event.target.value)} className={inputClass} />}</label>;
}
function Fact({ label, value }) { return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3"><div className="text-[10px] font-black uppercase tracking-[.14em] text-slate-500">{label}</div><div className="mt-1 break-words text-sm font-black text-slate-950">{value || "Not saved"}</div></div>; }
function SlipHeader({ badge, title, action, onClose }) { return <header className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 text-white"><span className="absolute left-0 top-0 h-full w-2 bg-gradient-to-b from-cyan-300 via-amber-300 to-orange-400" /><div className="flex items-start justify-between gap-4 pl-2"><div><div className="inline-flex rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.18em] text-amber-200">{badge}</div><h1 className="mt-3 text-4xl font-black tracking-[-.07em] text-white md:text-6xl">{title}</h1><div className="mt-4 grid gap-2 text-sm font-bold leading-6 text-slate-300"><p><b className="text-white">AI checked:</b> live Churvox records for this area.</p><p><b className="text-white">AI found:</b> {action.found}</p><p><b className="text-white">AI prepared:</b> {action.prepared}</p></div></div><button type="button" onClick={onClose} className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950">Close</button></div></header>; }
function ApprovalPanel({ action, form, href, busy, onApprove, onClose, approveLabel, blockedLabel }) {
  const isSummary = action.type === "summary";
  return <aside className="rounded-[28px] border border-slate-200 bg-white p-5"><div className="text-[10px] font-black uppercase tracking-[.18em] text-orange-700">Owner decision</div><h2 className="mt-2 text-3xl font-black tracking-[-.06em] text-slate-950">{isSummary ? "Nothing waiting." : "Yup, approve or edit."}</h2><p className="mt-2 text-sm font-bold leading-6 text-slate-600">{action.outcome}</p>{!action.ready ? <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-black leading-6 text-red-800"><span className="block text-[10px] uppercase tracking-[.14em]">Need you to fix</span>{blocker(action)}</div> : null}<div className="mt-5 grid gap-3">{!isSummary ? <button type="button" disabled={busy || !action.ready} onClick={() => onApprove(action, form)} className="rounded-2xl bg-orange-400 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-50">{busy ? "Applying…" : action.ready ? approveLabel : blockedLabel}</button> : null}<Link to={href} onClick={onClose} className="rounded-2xl bg-white px-4 py-3 text-center text-sm font-black text-slate-950 ring-1 ring-slate-200">Open full record</Link><button type="button" onClick={onClose} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white">Back to Command Board</button></div></aside>;
}
function JobSlip({ action, form, setForm, href, busy, onApprove, onClose }) { return <><SlipHeader badge="Job AI slip" title={action.title} action={action} onClose={onClose} /><main className="grid gap-5 bg-[#f7f3ea] p-5 md:grid-cols-[1fr_320px]"><section className="rounded-[28px] border border-slate-200 bg-white p-5"><div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-700">Job review</div><div className="mt-4 grid gap-3 md:grid-cols-2"><Fact label="Job" value={form.job_title} /><Fact label="Client" value={form.client_name} /><Fact label="Job ID" value={form.job_id} /><Fact label="Proof / note" value={form.proof_note} /><Field label="Job price" value={form.job_price} onChange={(value) => setForm((p) => ({ ...p, job_price: value, subtotal: value }))} /><Field label="Customer email" value={form.customer_email} onChange={(value) => setForm((p) => ({ ...p, customer_email: value }))} /><Field label="Invoice description" long value={form.invoice_description || form.description} onChange={(value) => setForm((p) => ({ ...p, invoice_description: value, description: value }))} /></div><div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-black leading-6 text-amber-950">This job slip is where you approve the admin Churvox prepared from a completed job. Fix the price or description here instead of hunting through pages.</div></section><ApprovalPanel action={action} form={{ ...form, subtotal: money(form.job_price), description: form.invoice_description || form.description }} href={href} busy={busy} onApprove={onApprove} onClose={onClose} approveLabel="Yup, create draft invoice" blockedLabel="Fix job price first" /></main></>; }
function InvoiceSlip({ action, form, setForm, href, busy, onApprove, onClose }) { const followUp = action.type === "invoice_follow_up"; return <><SlipHeader badge="Invoice AI slip" title={action.title} action={action} onClose={onClose} /><main className="grid gap-5 bg-[#f7f3ea] p-5 md:grid-cols-[1fr_320px]"><section className="rounded-[28px] border border-slate-200 bg-white p-5"><div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-700">Money review</div><div className="mt-4 grid gap-3 md:grid-cols-2"><Fact label="Invoice" value={form.invoice_title} /><Fact label="Client" value={form.client_name} /><Field label="Amount" value={form.amount || form.amount_due} onChange={(value) => setForm((p) => ({ ...p, amount: value, amount_due: value }))} /><Field label="Due date" value={form.due_date} onChange={(value) => setForm((p) => ({ ...p, due_date: value }))} /><Field label="Customer email" value={form.customer_email} onChange={(value) => setForm((p) => ({ ...p, customer_email: value }))} /><Field label={followUp ? "Follow-up message" : "Invoice message"} long value={form.message || form.invoice_message} onChange={(value) => setForm((p) => ({ ...p, message: value, invoice_message: value }))} /></div><div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-black leading-6 text-amber-950">This invoice slip keeps money decisions in Command. Review the amount, due date and note before approving.</div></section><ApprovalPanel action={action} form={form} href={href} busy={busy} onApprove={onApprove} onClose={onClose} approveLabel={followUp ? "Yup, save follow-up" : "Yup, mark sent"} blockedLabel="Fix invoice details first" /></main></>; }
function QuoteSlip({ action, form, setForm, href, busy, onApprove, onClose }) { const convert = action.type === "quote_convert"; return <><SlipHeader badge="Quote AI slip" title={action.title} action={action} onClose={onClose} /><main className="grid gap-5 bg-[#f7f3ea] p-5 md:grid-cols-[1fr_320px]"><section className="rounded-[28px] border border-slate-200 bg-white p-5"><div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-700">Quote review</div><div className="mt-4 grid gap-3 md:grid-cols-2"><Fact label="Quote" value={form.quote_title} /><Fact label="Client" value={form.client_name} /><Field label="Quote value" value={form.quote_value || form.value} onChange={(value) => setForm((p) => ({ ...p, quote_value: value, value }))} /><Field label={convert ? "Job note" : "Follow-up message"} long value={form.job_note || form.message} onChange={(value) => setForm((p) => ({ ...p, job_note: value, message: value }))} /></div><div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-black leading-6 text-amber-950">This quote slip shows whether Churvox prepared a follow-up or a convert-to-job action.</div></section><ApprovalPanel action={action} form={form} href={href} busy={busy} onApprove={onApprove} onClose={onClose} approveLabel={convert ? "Yup, convert to job" : "Yup, save follow-up"} blockedLabel="Fix quote details first" /></main></>; }
function CrewSlip({ action, form, setForm, href, busy, onApprove, onClose }) { return <><SlipHeader badge="Crew Dispatch AI slip" title={action.title} action={action} onClose={onClose} /><main className="grid gap-5 bg-[#f7f3ea] p-5 md:grid-cols-[1fr_320px]"><section className="rounded-[28px] border border-slate-200 bg-white p-5"><div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-700">Dispatch decision</div><div className="mt-4 grid gap-3 md:grid-cols-2"><Fact label="Job" value={form.job_title} /><Fact label="Client" value={form.client_name} /><Fact label="Address" value={form.address} /><Field label="Recommended worker ID" value={form.recommended_worker_id || form.worker_id} onChange={(value) => setForm((p) => ({ ...p, recommended_worker_id: value, worker_id: value }))} /><Field label="Recommended worker" value={form.recommended_worker || form.worker_name} onChange={(value) => setForm((p) => ({ ...p, recommended_worker: value, worker_name: value }))} /><Field label="AI reason" long value={form.reason} onChange={(value) => setForm((p) => ({ ...p, reason: value }))} /><Field label="Dispatch note" long value={form.dispatch_note} onChange={(value) => setForm((p) => ({ ...p, dispatch_note: value }))} /></div><div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-black leading-6 text-amber-950">This dispatch slip should become the place to check area, workload and conflicts. For now it keeps the assignment editable and approval-first.</div></section><ApprovalPanel action={action} form={{ ...form, worker_id: form.recommended_worker_id || form.worker_id }} href={href} busy={busy} onApprove={onApprove} onClose={onClose} approveLabel="Yup, assign worker" blockedLabel="Pick worker first" /></main></>; }
function SummarySlip({ action, form, setForm, href, onClose }) { return <><SlipHeader badge="Checked summary" title={action.title} action={action} onClose={onClose} /><main className="grid gap-5 bg-[#f7f3ea] p-5 md:grid-cols-[1fr_300px]"><section className="rounded-[28px] border border-slate-200 bg-white p-5"><div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-700">Nothing waiting</div><div className="mt-4 grid gap-3 md:grid-cols-2"><Field disabled label="Checked area" value={form.checked_area} onChange={() => {}} /><Field disabled label="Result" value={form.result} onChange={() => {}} /><Field disabled long label="Next step" value={form.next_step} onChange={() => {}} /></div><div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-black leading-6 text-emerald-950">Churvox checked this box. Nothing needs your approval here right now.</div></section><aside className="rounded-[28px] border border-slate-200 bg-white p-5"><div className="text-[10px] font-black uppercase tracking-[.18em] text-orange-700">Review controls</div><h2 className="mt-2 text-3xl font-black tracking-[-.06em] text-slate-950">No action needed.</h2><p className="mt-2 text-sm font-bold leading-6 text-slate-600">You can go back to Command or open the full records if you want to inspect them.</p><div className="mt-5 grid gap-3"><Link to={href} onClick={onClose} className="rounded-2xl bg-white px-4 py-3 text-center text-sm font-black text-slate-950 ring-1 ring-slate-200">Open full records</Link><button type="button" onClick={onClose} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white">Back to Command Board</button></div></aside></main></>; }
function CommandSlip({ action, onClose, onApprove, busy }) {
  const [form, setForm] = React.useState(action?.form || {});
  React.useEffect(() => setForm(action?.form || {}), [action]);
  if (!action) return null;
  const href = relatedHref(action, form);
  const area = areaFor(action);
  return <div className="fixed inset-0 z-[2147483647] overflow-y-auto bg-slate-950/90 p-4 backdrop-blur-xl lg:pl-[286px]"><section className="mx-auto max-w-5xl overflow-hidden rounded-[34px] bg-[#f7f3ea] shadow-2xl">
    {action.type === "summary" ? <SummarySlip action={action} form={form} setForm={setForm} href={href} onClose={onClose} /> : null}
    {area === "job" ? <JobSlip action={action} form={form} setForm={setForm} href={href} busy={busy} onApprove={onApprove} onClose={onClose} /> : null}
    {area === "invoice" ? <InvoiceSlip action={action} form={form} setForm={setForm} href={href} busy={busy} onApprove={onApprove} onClose={onClose} /> : null}
    {area === "quote" ? <QuoteSlip action={action} form={form} setForm={setForm} href={href} busy={busy} onApprove={onApprove} onClose={onClose} /> : null}
    {area === "crew" ? <CrewSlip action={action} form={form} setForm={setForm} href={href} busy={busy} onApprove={onApprove} onClose={onClose} /> : null}
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
      if (action.type === "assign_job") res = await post(`/jobs/${encodeURIComponent(form.job_id)}/assign`, { worker_id: form.worker_id || form.recommended_worker_id });
      if (action.type === "draft_invoice") res = await post("/invoices", { job_id: form.job_id, client_id: form.client_id || undefined, customer_name: form.customer_name || form.client_name, customer_email: form.customer_email || undefined, subtotal: money(form.subtotal || form.job_price), description: form.description || form.invoice_description });
      if (action.type === "send_invoice") res = await patch(`/invoices/${encodeURIComponent(form.invoice_id)}`, { status: "sent", notes: form.invoice_message || form.message });
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
  const next = actions.find((action) => action.ready) || actions[0];
  return <main className="cv-command-board-offwhite fixed inset-0 z-[2147483000] overflow-y-auto text-slate-950" data-industrial-simple-page="command" data-command-canvas data-marker="CHURVOX_COMMAND_SPECIALIST_SLIPS_20260608"><section className="mx-auto max-w-7xl p-4 pb-28 md:p-6 xl:p-8"><section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]"><section className={`${darkCard} p-6 md:p-8`}><span className="inline-flex rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[.22em] text-amber-300">Command Board</span><h1 className="mt-5 max-w-4xl text-5xl font-black leading-[.9] tracking-[-.08em] text-white md:text-7xl">Churvox did the admin. You approve.</h1><p className="mt-4 max-w-3xl text-sm font-bold leading-7 text-slate-300 md:text-base">Specialist AI slips for jobs, invoices, quotes and crew. Each one is editable and shows what Churvox checked, found, prepared, and needs from you.</p><div className="mt-6 flex flex-wrap gap-3"><button type="button" onClick={refresh} disabled={busy} className="rounded-2xl bg-amber-300 px-5 py-3 text-sm font-black text-slate-950 disabled:opacity-60">{busy ? "Checking…" : "Refresh AI work"}</button>{next ? <button type="button" onClick={() => setOpen(next)} className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white">Open next slip</button> : null}<Link to="/jobs/new" className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white no-underline">Create job</Link></div></section><section className={darkCard}><div className="flex items-start justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">AI priority</div><h2 className="mt-2 text-3xl font-black tracking-[-.06em] text-white">{ready ? `${ready} ready` : needs ? `${needs} need details` : "All clear"}</h2></div><Pill good={!needs}>{ready ? "Next" : "OK"}</Pill></div><p className="mt-3 text-sm font-bold leading-6 text-slate-300">{next ? next.summary : "No admin needs approval right now. I checked jobs, money, quotes and crew."}</p>{next ? <button type="button" onClick={() => setOpen(next)} className="mt-5 w-full rounded-2xl bg-amber-300 px-5 py-3 text-sm font-black text-slate-950">Review prepared slip</button> : null}</section></section><section className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4"><Metric label="Jobs" value={data.jobs.length} text="Jobs checked." tone="#facc15" /><Metric label="Invoices" value={data.invoices.length} text="Invoices checked." tone="#34d399" /><Metric label="Quotes" value={data.quotes.length} text="Quotes checked." tone="#22d3ee" /><Metric label="Approvals" value={actions.length} text="Prepared slips." tone="#fb923c" /></section><section className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4"><WorkBox label="Jobs" title="Jobs I prepared" count={jobActions.length} text="Completed jobs, missing prices and job admin prepared for review." href="/jobs-board" tone="#facc15" actions={jobActions} empty="No job admin actions right now." onOpen={setOpen} /><WorkBox label="Invoices" title="Money I prepared" count={invoiceActions.length} text="Draft, overdue and ready-to-send invoice actions." href="/invoices-board" tone="#34d399" actions={invoiceActions} empty="No invoice actions right now." onOpen={setOpen} /><WorkBox label="Quotes" title="Quotes I prepared" count={quoteActions.length} text="Quote follow-ups and accepted quotes to convert." href="/quotes-board" tone="#22d3ee" actions={quoteActions} empty="No quote actions right now." onOpen={setOpen} /><WorkBox label="Crew" title="Crew I prepared" count={crewActions.length} text="Unassigned jobs and worker assignment suggestions." href="/dispatch-board" tone="#fb923c" actions={crewActions} empty="No crew actions right now." onOpen={setOpen} /></section></section>{open ? <CommandSlip action={open} onClose={() => setOpen(null)} onApprove={approve} busy={busy} /> : null}</main>;
}
