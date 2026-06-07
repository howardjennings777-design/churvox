import React from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";

const card = "cv-board-dark-card rounded-[30px] border border-white/10 bg-slate-950 p-5 text-white shadow-[0_22px_62px_rgba(2,6,23,.24)]";
const first = (...values) => values.find((value) => value !== undefined && value !== null && String(value).trim() !== "") || "";
const num = (value) => Number(String(value || 0).replace(/[^0-9.-]/g, "")) || 0;
const idOf = (item) => {
  const raw = first(item?.id, item?._id, item?.job_id, item?.invoice_id, item?.quote_id, item?.worker_id, "");
  if (typeof raw === "object") return String(raw.$oid || raw.oid || raw.id || raw._id || "");
  return String(raw || "").replace("[object Object]", "");
};
const list = (res, keys = []) => {
  const data = res?.data ?? res;
  if (Array.isArray(data)) return data;
  for (const key of [...keys, "jobs", "invoices", "quotes", "workers", "team", "users", "clients", "customers", "items", "data"]) if (Array.isArray(data?.[key])) return data[key];
  return [];
};
const statusOf = (item) => String(first(item?.status, item?.job_status, item?.invoice_status, item?.quote_status, "")).toLowerCase();
const done = (job) => statusOf(job).includes("complete") || statusOf(job).includes("done") || job?.completed || job?.completed_at;
const cancelled = (item) => statusOf(item).includes("cancel");
const amountOf = (item) => num(first(item?.total, item?.amount_due, item?.balance_due, item?.amount, item?.price, item?.fixed_price, item?.subtotal, item?.quote_total, item?.invoice_total, 0));
const clientOf = (item) => first(item?.client_name, item?.customer_name, item?.client?.name, item?.name, "");
const jobTitle = (job) => first(job?.title, job?.job_title, job?.job_name, job?.service_type, job?.job_type, "Untitled job");
const invoiceTitle = (invoice) => first(invoice?.invoice_number, invoice?.number, invoice?.title, "Invoice");
const quoteTitle = (quote) => first(quote?.quote_number, quote?.number, quote?.title, "Quote");
const workerName = (worker) => first(worker?.name, worker?.full_name, worker?.display_name, worker?.email, "Unnamed worker");
const roleOf = (worker) => String(first(worker?.role, worker?.account_type, "worker")).toLowerCase();
const fieldWorkers = (workers) => workers.filter((worker) => roleOf(worker).includes("worker") || roleOf(worker).includes("field") || roleOf(worker).includes("manager"));
const assignedWorkerId = (job) => String(first(job?.assigned_worker_id, job?.worker_id, job?.assigned_to_id, ""));
const assignedWorkerName = (job) => String(first(job?.assigned_worker_name, job?.worker_name, job?.assignee_name, job?.assigned_to_name, job?.assigned_to, "")).toLowerCase();
const workerLoad = (worker, jobs) => {
  const wid = idOf(worker);
  const name = workerName(worker).toLowerCase();
  return jobs.filter((job) => !done(job) && !cancelled(job) && ((wid && assignedWorkerId(job) === wid) || (name && assignedWorkerName(job) === name))).length;
};
const pickWorker = (job, workers, jobs) => [...fieldWorkers(workers)].sort((a, b) => workerLoad(a, jobs) - workerLoad(b, jobs))[0] || null;
const isOverdue = (invoice) => {
  const s = statusOf(invoice);
  if (s.includes("paid") || cancelled(invoice)) return false;
  if (s.includes("overdue")) return true;
  const due = first(invoice?.due_date, invoice?.due_at, invoice?.date_due, invoice?.payment_due);
  if (!due) return false;
  const date = new Date(due);
  return !Number.isNaN(date.getTime()) && date.getTime() < Date.now();
};
const appendNote = (oldNote, label, note) => `${oldNote ? `${oldNote}\n\n` : ""}${label} ${new Date().toLocaleDateString("en-NZ")}: ${note || "Reviewed by owner"}`.trim();

const AREAS = {
  jobs: { label: "Jobs", title: "Jobs workhorse", href: "/jobs-board", tone: "#facc15", text: "Price, schedule, assign, invoice and fix job admin from Command." },
  invoices: { label: "Invoices", title: "Money workhorse", href: "/invoices-board", tone: "#34d399", text: "Review, edit, approve, decline and follow up invoice admin." },
  quotes: { label: "Quotes", title: "Quotes workhorse", href: "/quotes-board", tone: "#22d3ee", text: "Follow up quotes, edit scope, approve or convert accepted work." },
  crew: { label: "Crew", title: "Crew dispatch workhorse", href: "/dispatch-board", tone: "#fb923c", text: "Assign crew, change worker, check conflicts and dispatch clearly." },
};

const GROUPS = {
  jobs: [
    { title: "Job", fields: [["job_title", "Job title"], ["status", "Status"], ["client_name", "Client"], ["customer_phone", "Phone"], ["customer_email", "Email"], ["address", "Address"]] },
    { title: "Schedule & crew", fields: [["scheduled_date", "Date"], ["scheduled_time", "Time"], ["assigned_worker", "Worker"], ["owner_note", "Owner note", true]] },
    { title: "Pricing & invoice", fields: [["pricing_type", "Pricing type"], ["job_price", "Job price"], ["hourly_rate", "Hourly rate"], ["extras", "Extras"], ["invoice_description", "Invoice description", true]] },
    { title: "Proof & notes", fields: [["job_notes", "Job notes", true], ["worker_notes", "Worker notes", true]] },
  ],
  invoices: [
    { title: "Invoice", fields: [["invoice_title", "Invoice"], ["status", "Status"], ["client_name", "Client"], ["linked_job", "Linked job"], ["customer_email", "Email"], ["customer_phone", "Phone"]] },
    { title: "Money", fields: [["amount", "Amount"], ["gst", "GST / tax"], ["issue_date", "Issue date"], ["due_date", "Due date"]] },
    { title: "Wording", fields: [["invoice_description", "Invoice description", true], ["invoice_message", "Message / follow-up", true], ["payment_note", "Payment note", true], ["internal_note", "Internal note", true]] },
  ],
  quotes: [
    { title: "Quote", fields: [["quote_title", "Quote"], ["status", "Status"], ["client_name", "Client"], ["customer_email", "Email"], ["customer_phone", "Phone"], ["quote_value", "Value"]] },
    { title: "Scope", fields: [["valid_until", "Valid until"], ["preferred_start", "Preferred start"], ["scope", "Scope/details", true]] },
    { title: "Action", fields: [["message", "Follow-up message", true], ["convert_note", "Convert-to-job note", true], ["internal_note", "Internal note", true]] },
  ],
  crew: [
    { title: "Job", fields: [["job_title", "Job"], ["status", "Status"], ["client_name", "Client"], ["customer_phone", "Phone"], ["address", "Address"], ["scheduled_date", "Date"], ["scheduled_time", "Time"]] },
    { title: "Worker decision", fields: [["worker_id", "Worker ID"], ["worker_name", "Worker name"], ["workers_checked", "Workers checked"], ["workload_reason", "Why this worker", true]] },
    { title: "Dispatch", fields: [["schedule_conflict", "Conflict warning", true], ["dispatch_note", "Dispatch note", true], ["owner_note", "Owner note", true]] },
  ],
};

function blankAction(area) {
  const base = { area, type: "workspace", title: AREAS[area].title, found: "Nothing needs approval right now.", prepared: "The full workspace is open so you can still add, fix or prepare work from Command.", outcome: "No approval is needed unless you create or edit something.", form: {} };
  GROUPS[area].forEach((group) => group.fields.forEach(([key]) => { base.form[key] = ""; }));
  if (area === "jobs") Object.assign(base.form, { status: "draft", pricing_type: "fixed price" });
  if (area === "invoices") Object.assign(base.form, { status: "draft" });
  if (area === "quotes") Object.assign(base.form, { status: "draft" });
  if (area === "crew") Object.assign(base.form, { status: "unassigned" });
  return base;
}

function buildActions({ jobs, invoices, quotes, workers }) {
  const actions = [];
  const invoicedJobs = new Set(invoices.map((invoice) => String(first(invoice.job_id, invoice.linked_job_id, invoice.jobId, ""))).filter(Boolean));

  jobs.filter((job) => !done(job) && !cancelled(job) && !first(job.assigned_worker_id, job.worker_id, job.assigned_to, job.assigned_worker_name)).slice(0, 8).forEach((job) => {
    const worker = pickWorker(job, workers, jobs);
    actions.push({
      id: `crew-${idOf(job)}`, area: "crew", type: "assign_job", title: "Assign crew to job", approveLabel: "Approve assignment", declineLabel: "Decline assignment",
      found: "Unassigned job found.", prepared: worker ? `Churvox picked ${workerName(worker)} as the recommended worker.` : "Churvox could not pick a worker yet.", outcome: "Approving assigns this worker to the job.",
      form: { job_id: idOf(job), job_title: jobTitle(job), status: first(job.status, "unassigned"), client_name: clientOf(job), customer_phone: first(job.customer_phone, job.client_phone, job.phone), address: first(job.address, job.site_address, job.location), scheduled_date: first(job.scheduled_date, job.date, job.scheduled_at), scheduled_time: first(job.scheduled_time, job.time, job.start_time), worker_id: worker ? idOf(worker) : "", worker_name: worker ? workerName(worker) : "", workers_checked: `${fieldWorkers(workers).length} field worker record${fieldWorkers(workers).length === 1 ? "" : "s"} checked`, workload_reason: worker ? `${workerName(worker)} has ${workerLoad(worker, jobs)} open job${workerLoad(worker, jobs) === 1 ? "" : "s"}.` : "Pick a worker before approval.", schedule_conflict: "Backend conflict warning still needs final wiring. Confirm schedule before approval.", dispatch_note: first(job.dispatch_note, job.notes, "Ready to dispatch"), owner_note: "" },
    });
  });

  jobs.filter((job) => done(job) && !invoicedJobs.has(idOf(job))).slice(0, 8).forEach((job) => {
    const price = amountOf(job);
    actions.push({
      id: `job-invoice-${idOf(job)}`, area: "jobs", type: "draft_invoice", title: "Create invoice from completed job", approveLabel: "Approve draft invoice", declineLabel: "Decline invoice draft",
      found: "Completed job is not invoiced yet.", prepared: price ? "Churvox prepared an invoice draft from the job." : "Churvox found the invoice is blocked because price is missing.", outcome: "Approving creates a draft invoice. It does not send it.",
      form: { job_id: idOf(job), client_id: first(job.client_id, job.customer_id), job_title: jobTitle(job), status: first(job.status, "completed"), client_name: clientOf(job), customer_phone: first(job.customer_phone, job.client_phone, job.phone), customer_email: first(job.customer_email, job.client_email, job.email), address: first(job.address, job.site_address, job.location), scheduled_date: first(job.scheduled_date, job.date, job.scheduled_at), scheduled_time: first(job.scheduled_time, job.time, job.start_time), assigned_worker: first(job.assigned_worker_name, job.worker_name, job.assigned_to), pricing_type: first(job.pricing_type, job.price_type, price ? "fixed price" : "missing price"), job_price: price || "", hourly_rate: first(job.hourly_rate, job.rate), extras: first(job.extras, job.extra_charges), invoice_description: first(job.invoice_description, job.description, job.notes, `${jobTitle(job)} completed`), job_notes: first(job.notes, job.internal_notes), worker_notes: first(job.worker_notes, job.completion_note), owner_note: price ? "Ready for owner approval." : "Add price first." },
    });
  });

  invoices.filter((invoice) => statusOf(invoice) === "draft" || isOverdue(invoice)).slice(0, 10).forEach((invoice) => {
    const overdue = isOverdue(invoice);
    actions.push({
      id: `invoice-${idOf(invoice)}`, area: "invoices", type: overdue ? "invoice_follow_up" : "send_invoice", title: overdue ? "Follow up overdue invoice" : "Review draft invoice", approveLabel: overdue ? "Approve follow-up" : "Approve mark sent", declineLabel: overdue ? "Decline follow-up" : "Decline send",
      found: overdue ? "Overdue invoice needs owner decision." : "Draft invoice is waiting for review.", prepared: overdue ? "Churvox prepared an editable payment follow-up." : "Churvox prepared invoice send review fields.", outcome: overdue ? "Approving saves the follow-up note. It does not send automatically." : "Approving marks the invoice as sent.",
      form: { invoice_id: idOf(invoice), invoice_title: invoiceTitle(invoice), status: first(invoice.status, overdue ? "overdue" : "draft"), client_name: clientOf(invoice), customer_email: first(invoice.customer_email, invoice.client_email, invoice.email), customer_phone: first(invoice.customer_phone, invoice.client_phone, invoice.phone), linked_job: first(invoice.job_id, invoice.linked_job_id), amount: amountOf(invoice), gst: first(invoice.gst, invoice.tax, invoice.gst_amount, "Use GST setting"), issue_date: first(invoice.issue_date, invoice.created_at), due_date: first(invoice.due_date, invoice.date_due), invoice_description: first(invoice.description, invoice.invoice_description), invoice_message: overdue ? `Friendly reminder for ${clientOf(invoice) || "the customer"} about ${invoiceTitle(invoice)}.` : first(invoice.message, invoice.notes, "Invoice reviewed and ready to send"), payment_note: overdue ? "Owner approval before sending anything." : first(invoice.payment_note), internal_note: first(invoice.internal_note, invoice.notes) },
    });
  });

  quotes.filter((quote) => (statusOf(quote) === "sent" || statusOf(quote).includes("accept")) && !first(quote.converted_job_id, quote.job_id, quote.linked_job_id)).slice(0, 10).forEach((quote) => {
    const accepted = statusOf(quote).includes("accept");
    actions.push({
      id: `quote-${idOf(quote)}`, area: "quotes", type: accepted ? "quote_convert" : "quote_follow_up", title: accepted ? "Convert accepted quote" : "Follow up quote", approveLabel: accepted ? "Approve convert to job" : "Approve follow-up", declineLabel: accepted ? "Decline conversion" : "Decline follow-up",
      found: accepted ? "Accepted quote has not become a job." : "Sent quote has not converted yet.", prepared: accepted ? "Churvox prepared a convert-to-job decision." : "Churvox prepared an editable quote follow-up.", outcome: accepted ? "Approving creates a job from this quote." : "Approving saves the follow-up note. It does not send automatically.",
      form: { quote_id: idOf(quote), quote_title: quoteTitle(quote), status: first(quote.status, accepted ? "accepted" : "sent"), client_name: clientOf(quote), customer_email: first(quote.customer_email, quote.client_email, quote.email), customer_phone: first(quote.customer_phone, quote.client_phone, quote.phone), quote_value: amountOf(quote), valid_until: first(quote.valid_until, quote.expiry_date, quote.expires_at), preferred_start: first(quote.preferred_start, quote.start_date), scope: first(quote.scope, quote.description, quote.job_description), message: `Hi ${clientOf(quote) || "there"}, just checking whether you had any questions about your quote.`, convert_note: "Create job from accepted quote", internal_note: first(quote.notes) },
    });
  });

  return actions;
}

function validate(action, form) {
  if (!action || action.type === "workspace") return "";
  if (action.type === "assign_job" && !first(form.job_id)) return "Job is missing.";
  if (action.type === "assign_job" && !first(form.worker_id)) return "Pick a worker first.";
  if (action.type === "draft_invoice" && !first(form.job_id)) return "Job is missing.";
  if (action.type === "draft_invoice" && num(form.job_price) <= 0) return "Add job price first.";
  if ((action.type === "send_invoice" || action.type === "invoice_follow_up") && !first(form.invoice_id)) return "Invoice is missing.";
  if (action.type === "invoice_follow_up" && !first(form.invoice_message)) return "Add follow-up message first.";
  if ((action.type === "quote_follow_up" || action.type === "quote_convert") && !first(form.quote_id)) return "Quote is missing.";
  if (action.type === "quote_follow_up" && !first(form.message)) return "Add follow-up message first.";
  return "";
}

function Field({ label, value, onChange, long }) {
  const cls = "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-950";
  return <label className={long ? "rounded-2xl border border-slate-200 bg-white p-3 md:col-span-2" : "rounded-2xl border border-slate-200 bg-white p-3"}><span className="text-[10px] font-black uppercase tracking-[.14em] text-orange-700">{label}</span>{long ? <textarea value={value || ""} onChange={(event) => onChange(event.target.value)} className={`${cls} min-h-[86px]`} /> : <input value={value || ""} onChange={(event) => onChange(event.target.value)} className={cls} />}</label>;
}
function Metric({ label, value, text, tone }) {
  return <article className={`${card} relative overflow-hidden pl-7`}><span className="absolute left-0 top-0 h-full w-2" style={{ background: `linear-gradient(180deg, ${tone}, #facc15, #22d3ee)` }} /><div className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">{label}</div><div className="mt-2 text-4xl font-black tracking-[-.07em] text-white">{value}</div><p className="mt-2 text-sm font-bold leading-6 text-slate-300">{text}</p></article>;
}
function WorkBox({ area, actions, onOpen }) {
  const cfg = AREAS[area];
  return <section className={`${card} relative flex min-h-[340px] flex-col overflow-hidden pl-7`}><span className="absolute left-0 top-0 h-full w-2" style={{ background: `linear-gradient(180deg, ${cfg.tone}, #facc15, #22d3ee)` }} /><div className="flex items-start justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">{cfg.label}</div><h2 className="mt-2 text-3xl font-black tracking-[-.06em] text-white">{cfg.title}</h2></div><span className="rounded-full bg-white/10 px-3 py-1 text-sm font-black text-white ring-1 ring-white/10">{actions.length}</span></div><p className="mt-3 text-sm font-bold leading-6 text-slate-300">{cfg.text}</p><button type="button" onClick={() => onOpen(area, actions[0])} className="mt-5 rounded-[22px] border border-white/10 bg-white/[0.06] p-4 text-left text-sm font-black leading-6 text-slate-300 hover:bg-white/[0.09]"><span className="mb-2 block text-[10px] uppercase tracking-[.16em] text-amber-200">Open workhorse slip</span>{actions.length ? `${actions.length} prepared decision${actions.length === 1 ? "" : "s"}: approve, decline or edit.` : "No approval waiting, but this still opens a full workhorse slip."}<span className="mt-4 inline-flex rounded-2xl bg-amber-300 px-4 py-2 text-sm font-black text-slate-950">Open slip</span></button></section>;
}

function DecisionCard({ action, form }) {
  const missing = validate(action, form);
  return <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-slate-950 px-3 py-1 text-[10px] font-black uppercase tracking-[.16em] text-white">AI decision</span><span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[.16em] ${missing ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>{action.type === "workspace" ? "Workspace" : missing ? "Needs fix" : "Ready"}</span></div><h2 className="mt-4 text-3xl font-black tracking-[-.06em] text-slate-950">{action.title}</h2><div className="mt-4 grid gap-3 text-sm font-black leading-6 text-slate-700 md:grid-cols-3"><p className="rounded-2xl bg-slate-50 p-3"><b className="block text-[10px] uppercase tracking-[.14em] text-cyan-700">Found</b>{action.found}</p><p className="rounded-2xl bg-slate-50 p-3"><b className="block text-[10px] uppercase tracking-[.14em] text-amber-700">Prepared</b>{action.prepared}</p><p className={`rounded-2xl p-3 ${missing ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-900"}`}><b className="block text-[10px] uppercase tracking-[.14em]">Owner needs</b>{action.type === "workspace" ? "Use this slip to create or fix work." : missing || "Approve or decline this prepared work."}</p></div></section>;
}

function Workspace({ open, onClose, onApprove, onDecline, onSave, busy }) {
  const action = open.action || blankAction(open.area);
  const cfg = AREAS[open.area];
  const [form, setForm] = React.useState(action.form || {});
  React.useEffect(() => setForm(action.form || {}), [action]);
  const missing = validate(action, form);
  const canApprove = action.type !== "workspace" && !missing;
  return <div className="fixed inset-0 z-[2147483647] overflow-y-auto bg-slate-950/90 p-4 backdrop-blur-xl lg:pl-[286px]"><section className="mx-auto max-w-[1680px] overflow-hidden rounded-[34px] bg-[#f7f3ea] shadow-2xl"><header className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 text-white"><span className="absolute left-0 top-0 h-full w-2" style={{ background: `linear-gradient(180deg, ${cfg.tone}, #facc15, #22d3ee)` }} /><div className="flex items-start justify-between gap-4 pl-2"><div><div className="inline-flex rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.18em] text-amber-200">{cfg.label} approval workhorse</div><h1 className="mt-3 text-5xl font-black tracking-[-.08em] text-white md:text-7xl">{action.title}</h1><p className="mt-3 max-w-5xl text-sm font-bold leading-6 text-slate-300">Clear owner decision: edit the fields, then approve or decline. The full page is backup only.</p></div><button type="button" onClick={onClose} className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950">Close</button></div></header><main className="grid gap-5 bg-[#f7f3ea] p-5 xl:grid-cols-[minmax(0,1fr)_360px]"><section className="space-y-5"><DecisionCard action={action} form={form} />{GROUPS[open.area].map((group) => <section key={group.title} className="rounded-[26px] border border-slate-200 bg-white p-5"><div className="mb-4 text-[10px] font-black uppercase tracking-[.18em] text-cyan-700">{group.title}</div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{group.fields.map(([key, label, long]) => <Field key={key} label={label} long={long} value={form[key]} onChange={(value) => setForm((prev) => ({ ...prev, [key]: value }))} />)}</div></section>)}</section><aside className="sticky top-5 self-start rounded-[28px] border border-slate-200 bg-white p-5"><div className="text-[10px] font-black uppercase tracking-[.18em] text-orange-700">Owner controls</div><h2 className="mt-2 text-3xl font-black tracking-[-.06em] text-slate-950">Approve or decline.</h2><p className="mt-2 text-sm font-bold leading-6 text-slate-600">{action.outcome}</p>{action.type !== "workspace" ? <div className={`mt-4 rounded-2xl p-3 text-sm font-black leading-6 ${missing ? "border border-red-200 bg-red-50 text-red-800" : "border border-emerald-200 bg-emerald-50 text-emerald-900"}`}>{missing || "Ready for owner approval."}</div> : <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-black leading-6 text-slate-700">No prepared approval waiting. Use this slip to add or fix work.</div>}<div className="mt-5 grid gap-3"><button type="button" onClick={() => onSave(action, form)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-950">Save edits</button>{action.type !== "workspace" ? <button type="button" disabled={busy || !canApprove} onClick={() => onApprove(action, form)} className="rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-50">{busy ? "Approving…" : action.approveLabel || "Approve"}</button> : null}{action.type !== "workspace" ? <button type="button" disabled={busy} onClick={() => onDecline(action)} className="rounded-2xl bg-red-100 px-4 py-3 text-sm font-black text-red-800">{action.declineLabel || "Decline"}</button> : null}<Link to={cfg.href} onClick={onClose} className="rounded-2xl bg-white px-4 py-3 text-center text-sm font-black text-slate-950 ring-1 ring-slate-200">Open full records</Link>{open.area === "jobs" ? <Link to="/jobs/new" onClick={onClose} className="rounded-2xl bg-amber-300 px-4 py-3 text-center text-sm font-black text-slate-950">Create new job</Link> : null}<button type="button" onClick={onClose} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white">Back to Command</button></div></aside></main></section></div>;
}

export default function CommandDeskOperatorPageV2() {
  const { get, post, patch } = useApi();
  const [data, setData] = React.useState({ jobs: [], invoices: [], quotes: [], workers: [], clients: [] });
  const [actions, setActions] = React.useState([]);
  const [declined, setDeclined] = React.useState([]);
  const [open, setOpen] = React.useState(null);
  const [busy, setBusy] = React.useState(false);

  const refresh = React.useCallback(async () => {
    setBusy(true);
    try {
      const [jobsRes, invoicesRes, quotesRes, workersRes, clientsRes] = await Promise.allSettled([get("/jobs"), get("/invoices"), get("/quotes"), get("/team/workers"), get("/clients")]);
      const next = { jobs: jobsRes.status === "fulfilled" ? list(jobsRes.value, ["jobs"]) : [], invoices: invoicesRes.status === "fulfilled" ? list(invoicesRes.value, ["invoices"]) : [], quotes: quotesRes.status === "fulfilled" ? list(quotesRes.value, ["quotes"]) : [], workers: workersRes.status === "fulfilled" ? list(workersRes.value, ["workers", "team", "users"]) : [], clients: clientsRes.status === "fulfilled" ? list(clientsRes.value, ["clients", "customers"]) : [] };
      setData(next);
      setActions(buildActions(next));
    } finally { setBusy(false); }
  }, [get]);
  React.useEffect(() => { refresh(); }, [refresh]);

  async function approve(action, form) {
    const missing = validate(action, form);
    if (missing) return toast.error(missing);
    setBusy(true);
    try {
      let res = { success: true };
      if (action.type === "assign_job") res = await post(`/jobs/${encodeURIComponent(form.job_id)}/assign`, { worker_id: form.worker_id });
      if (action.type === "draft_invoice") res = await post("/invoices", { job_id: form.job_id, client_id: form.client_id || undefined, customer_name: form.client_name, customer_email: form.customer_email || undefined, subtotal: num(form.job_price), description: form.invoice_description });
      if (action.type === "send_invoice") res = await patch(`/invoices/${encodeURIComponent(form.invoice_id)}`, { status: "sent", notes: form.invoice_message || form.internal_note });
      if (action.type === "invoice_follow_up") res = await patch(`/invoices/${encodeURIComponent(form.invoice_id)}`, { notes: appendNote(form.internal_note, "Follow-up prepared", form.invoice_message) });
      if (action.type === "quote_follow_up") res = await patch(`/quotes/${encodeURIComponent(form.quote_id)}`, { notes: appendNote(form.internal_note, "Follow-up prepared", form.message) });
      if (action.type === "quote_convert") res = await post(`/quotes/${encodeURIComponent(form.quote_id)}/convert`, {});
      if (!res?.success) throw new Error(res?.error || "Approval failed");
      toast.success("Approved and applied");
      setOpen(null);
      await refresh();
    } catch (error) { toast.error(error?.message || "Approval failed"); }
    finally { setBusy(false); }
  }

  async function saveEdits(action, form) {
    if (action.type === "workspace") return toast.success("Edits kept in this slip. Create or open the full record when ready.");
    try {
      let res = { success: true };
      if ((action.area === "jobs" || action.area === "crew") && form.job_id) res = await patch(`/jobs/${encodeURIComponent(form.job_id)}`, { ...form });
      if (action.area === "invoices" && form.invoice_id) res = await patch(`/invoices/${encodeURIComponent(form.invoice_id)}`, { ...form });
      if (action.area === "quotes" && form.quote_id) res = await patch(`/quotes/${encodeURIComponent(form.quote_id)}`, { ...form });
      if (!res?.success) throw new Error(res?.error || "Save failed");
      toast.success("Edits saved");
      await refresh();
    } catch (error) { toast.error(error?.message || "Could not save edits"); }
  }

  function decline(action) {
    setDeclined((old) => [...old, action.id]);
    setOpen(null);
    toast.success("Declined and removed from this Command view");
  }

  const liveActions = actions.filter((action) => !declined.includes(action.id));
  const grouped = { jobs: liveActions.filter((a) => a.area === "jobs"), invoices: liveActions.filter((a) => a.area === "invoices"), quotes: liveActions.filter((a) => a.area === "quotes"), crew: liveActions.filter((a) => a.area === "crew") };
  const next = liveActions[0];
  const openWorkspace = (area, action) => setOpen({ area, action: action || null });

  return <main className="cv-command-board-offwhite fixed inset-0 z-[2147483000] overflow-y-auto text-slate-950" data-industrial-simple-page="command" data-command-canvas data-marker="CHURVOX_COMMAND_WORKHORSE_FINAL_20260608"><section className="mx-auto max-w-7xl p-4 pb-28 md:p-6 xl:p-8"><section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]"><section className={`${card} p-6 md:p-8`}><span className="inline-flex rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[.22em] text-amber-300">Command Board</span><h1 className="mt-5 max-w-4xl text-5xl font-black leading-[.9] tracking-[-.08em] text-white md:text-7xl">Churvox did the admin. You approve.</h1><p className="mt-4 max-w-3xl text-sm font-bold leading-7 text-slate-300 md:text-base">Each box opens a clear workhorse slip: AI decision, editable details, approve, decline, save or fix.</p><div className="mt-6 flex flex-wrap gap-3"><button type="button" onClick={refresh} disabled={busy} className="rounded-2xl bg-amber-300 px-5 py-3 text-sm font-black text-slate-950 disabled:opacity-60">{busy ? "Checking…" : "Refresh AI work"}</button>{next ? <button type="button" onClick={() => openWorkspace(next.area, next)} className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white">Open next decision</button> : null}<Link to="/jobs/new" className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white no-underline">Create job</Link></div></section><section className={card}><div className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">AI priority</div><h2 className="mt-2 text-3xl font-black tracking-[-.06em] text-white">{liveActions.length ? `${liveActions.length} decisions` : "All clear"}</h2><p className="mt-3 text-sm font-bold leading-6 text-slate-300">{next ? next.found : "No approval waiting. Workhorse slips still open for adding or fixing work."}</p></section></section><section className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4"><Metric label="Jobs" value={data.jobs.length} text="Jobs checked." tone="#facc15" /><Metric label="Invoices" value={data.invoices.length} text="Invoices checked." tone="#34d399" /><Metric label="Quotes" value={data.quotes.length} text="Quotes checked." tone="#22d3ee" /><Metric label="Decisions" value={liveActions.length} text="Approve or decline." tone="#fb923c" /></section><section className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4"><WorkBox area="jobs" actions={grouped.jobs} onOpen={openWorkspace} /><WorkBox area="invoices" actions={grouped.invoices} onOpen={openWorkspace} /><WorkBox area="quotes" actions={grouped.quotes} onOpen={openWorkspace} /><WorkBox area="crew" actions={grouped.crew} onOpen={openWorkspace} /></section></section>{open ? <Workspace open={open} onClose={() => setOpen(null)} onApprove={approve} onDecline={decline} onSave={saveEdits} busy={busy} /> : null}</main>;
}
