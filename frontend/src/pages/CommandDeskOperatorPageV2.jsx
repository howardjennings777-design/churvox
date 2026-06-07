import React from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";

const card = "rounded-[30px] border border-white/10 bg-slate-950 p-5 text-white shadow-[0_22px_62px_rgba(2,6,23,.24)]";
const first = (...values) => values.find((value) => value !== undefined && value !== null && String(value).trim() !== "") || "";
const money = (value) => Number(String(value || 0).replace(/[^0-9.-]/g, "")) || 0;
const cleanId = (value) => {
  if (!value) return "";
  if (typeof value === "object") return String(value.$oid || value.oid || value.id || value._id || "");
  const text = String(value || "");
  return text === "[object Object]" ? "" : text;
};
const idOf = (item) => cleanId(first(item?.id, item?._id, item?.job_id, item?.invoice_id, item?.quote_id, item?.client_id, item?.worker_id, ""));
const listFrom = (res, keys = []) => {
  const data = res?.data ?? res;
  if (Array.isArray(data)) return data;
  for (const key of [...keys, "jobs", "invoices", "quotes", "workers", "team", "users", "clients", "customers", "items", "data"]) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
};
const statusOf = (item) => String(first(item?.status, item?.job_status, item?.invoice_status, item?.quote_status, "")).toLowerCase();
const isDone = (job) => statusOf(job).includes("complete") || statusOf(job).includes("done") || job?.completed || job?.completed_at;
const isCancelled = (item) => statusOf(item).includes("cancel");
const amountOf = (item) => money(first(item?.total, item?.amount_due, item?.balance_due, item?.amount, item?.price, item?.fixed_price, item?.subtotal, item?.invoice_total, item?.quote_total, 0));
const clientOf = (item) => first(item?.client_name, item?.customer_name, item?.client?.name, item?.name, "");
const titleOf = (job) => first(job?.title, job?.job_title, job?.job_name, job?.service_type, job?.job_type, "Untitled job");
const invoiceTitle = (invoice) => first(invoice?.invoice_number, invoice?.number, invoice?.title, "Invoice");
const quoteTitle = (quote) => first(quote?.quote_number, quote?.number, quote?.title, "Quote");
const workerName = (worker) => first(worker?.name, worker?.full_name, worker?.display_name, worker?.email, "Unnamed worker");
const workerRole = (worker) => String(first(worker?.role, worker?.account_type, "worker")).toLowerCase();
const fieldWorkers = (workers) => workers.filter((worker) => workerRole(worker).includes("worker") || workerRole(worker).includes("field") || workerRole(worker).includes("manager"));
const assignedWorkerId = (job) => cleanId(first(job?.assigned_worker_id, job?.worker_id, job?.assigned_to_id, ""));
const assignedWorkerName = (job) => String(first(job?.assigned_worker_name, job?.worker_name, job?.assignee_name, job?.assigned_to_name, job?.assigned_to, "")).toLowerCase();
const workerLoad = (worker, jobs) => {
  const wid = idOf(worker);
  const name = workerName(worker).toLowerCase();
  return jobs.filter((job) => !isDone(job) && !isCancelled(job) && ((wid && assignedWorkerId(job) === wid) || (name && assignedWorkerName(job) === name))).length;
};
const pickWorker = (job, workers, jobs) => [...fieldWorkers(workers)].sort((a, b) => workerLoad(a, jobs) - workerLoad(b, jobs))[0] || null;
const isOverdue = (invoice) => {
  const status = statusOf(invoice);
  if (status.includes("paid") || isCancelled(invoice)) return false;
  if (status.includes("overdue")) return true;
  const due = first(invoice?.due_date, invoice?.due_at, invoice?.date_due, invoice?.payment_due);
  if (!due) return false;
  const date = new Date(due);
  return !Number.isNaN(date.getTime()) && date.getTime() < Date.now();
};
const addNote = (oldNote, label, note) => `${oldNote ? `${oldNote}\n\n` : ""}${label} ${new Date().toLocaleDateString("en-NZ")}: ${note || "Reviewed by owner"}`.trim();

const BOXES = [
  { key: "approvals", label: "Approvals", title: "Owner approvals", text: "All AI-prepared work waiting for yes or no.", tone: "#facc15", href: "/dashboard" },
  { key: "crew", label: "Crew", title: "Crew decisions", text: "Worker assignment suggestions and dispatch checks.", tone: "#fb923c", href: "/dispatch-board" },
  { key: "money", label: "Money", title: "Invoice decisions", text: "Draft invoices, overdue invoices and money follow-ups.", tone: "#34d399", href: "/invoices-board" },
  { key: "jobs", label: "Jobs", title: "Jobs needing info", text: "Missing price, client, address, schedule or invoice source.", tone: "#f97316", href: "/jobs-board" },
  { key: "quotes", label: "Quotes", title: "Quote decisions", text: "Follow-ups, accepted quotes and quote-to-job actions.", tone: "#22d3ee", href: "/quotes-board" },
  { key: "clients", label: "Clients", title: "Client follow-ups", text: "Missing contact details or customer/admin follow-up.", tone: "#a78bfa", href: "/clients-board" },
  { key: "workers", label: "Workers", title: "Worker updates", text: "Completed jobs, worker notes, photos and proof checks.", tone: "#60a5fa", href: "/team-board" },
  { key: "payroll", label: "Payroll", title: "Time review", text: "Timesheet and time-log checks for payroll review.", tone: "#f43f5e", href: "/payroll-board" },
  { key: "setup", label: "Setup", title: "Setup issues", text: "Business, team, client, GST and admin setup gaps.", tone: "#14b8a6", href: "/settings-board" },
];
const boxByKey = Object.fromEntries(BOXES.map((box) => [box.key, box]));

function makeAction({ box, type, title, found, prepared, reason, approveLabel, declineLabel, href, form, fields, approval, save }) {
  const id = `${type}-${first(form?.job_id, form?.invoice_id, form?.quote_id, form?.client_id, form?.worker_id, title, Math.random())}`;
  return { id, box, type, title, found, prepared, reason, approveLabel, declineLabel, href: href || boxByKey[box]?.href || "/dashboard", form: form || {}, fields: fields || [], approval: approval || "Approve this prepared work.", save };
}

function buildActions({ jobs, invoices, quotes, workers, clients }) {
  const actions = [];
  const invoicedJobs = new Set(invoices.map((invoice) => cleanId(first(invoice.job_id, invoice.linked_job_id, invoice.jobId, ""))).filter(Boolean));

  jobs.filter((job) => !isDone(job) && !isCancelled(job) && !first(job.assigned_worker_id, job.worker_id, job.assigned_to, job.assigned_worker_name)).slice(0, 8).forEach((job) => {
    const worker = pickWorker(job, workers, jobs);
    actions.push(makeAction({
      box: "crew",
      type: "assign_job",
      title: `Assign ${worker ? workerName(worker) : "a worker"} to ${titleOf(job)}`,
      found: "This job has no worker assigned.",
      prepared: worker ? `Churvox recommends ${workerName(worker)}.` : "Churvox needs you to pick a worker.",
      reason: worker ? `${workerName(worker)} has ${workerLoad(worker, jobs)} open job${workerLoad(worker, jobs) === 1 ? "" : "s"} and is available in team records.` : "No worker could be safely picked from current records.",
      approveLabel: "Approve assignment",
      declineLabel: "Decline assignment",
      approval: "Approving assigns the selected worker to this job.",
      href: "/dispatch-board",
      form: { job_id: idOf(job), job_title: titleOf(job), client_name: clientOf(job), address: first(job.address, job.site_address, job.location), scheduled_time: first(job.scheduled_time, job.time, job.start_time, job.scheduled_at), worker_id: worker ? idOf(worker) : "", worker_name: worker ? workerName(worker) : "", dispatch_note: first(job.dispatch_note, job.notes, "Ready to dispatch") },
      fields: [["worker_name", "Worker"], ["worker_id", "Worker ID"], ["scheduled_time", "Time"], ["dispatch_note", "Dispatch note", "textarea"]],
    }));
  });

  jobs.filter((job) => isDone(job) && !invoicedJobs.has(idOf(job))).slice(0, 8).forEach((job) => {
    const price = amountOf(job);
    actions.push(makeAction({
      box: price > 0 ? "money" : "jobs",
      type: price > 0 ? "draft_invoice" : "missing_price_invoice",
      title: price > 0 ? `Draft invoice ready for ${titleOf(job)}` : `Add price to invoice ${titleOf(job)}`,
      found: "Completed job has not been invoiced.",
      prepared: price > 0 ? `Churvox prepared a draft invoice for $${price}.` : "Churvox found the job is blocked because price is missing.",
      reason: "Job is complete, notes were checked, and invoice wording is ready for owner review.",
      approveLabel: price > 0 ? "Approve draft invoice" : "Save price + create draft",
      declineLabel: "Decline invoice draft",
      approval: "Approving creates a draft invoice only. It does not send it to the customer.",
      href: "/jobs-board",
      form: { job_id: idOf(job), client_id: cleanId(first(job.client_id, job.customer_id)), job_title: titleOf(job), client_name: clientOf(job), customer_email: first(job.customer_email, job.client_email, job.email), job_price: price || "", due_date: "", invoice_description: first(job.invoice_description, job.description, job.notes, `${titleOf(job)} completed`), owner_note: price > 0 ? "Ready for approval." : "Add price first." },
      fields: [["job_price", "Price"], ["due_date", "Due date"], ["invoice_description", "Invoice wording", "textarea"], ["owner_note", "Owner note", "textarea"]],
    }));
  });

  jobs.filter((job) => !isCancelled(job) && (!clientOf(job) || !first(job.address, job.site_address, job.location))).slice(0, 6).forEach((job) => {
    actions.push(makeAction({
      box: "jobs",
      type: "fix_job_info",
      title: `Fix missing job info: ${titleOf(job)}`,
      found: !clientOf(job) ? "This job is missing a client name." : "This job is missing a job address.",
      prepared: "Churvox opened the exact missing fields so this job can move forward.",
      reason: "Jobs need client and site details before dispatch, invoice or reminders work properly.",
      approveLabel: "Approve saved job info",
      declineLabel: "Decline fix",
      approval: "Approving saves the edited job information.",
      href: "/jobs-board",
      form: { job_id: idOf(job), job_title: titleOf(job), client_name: clientOf(job), address: first(job.address, job.site_address, job.location), customer_phone: first(job.customer_phone, job.client_phone, job.phone), owner_note: "" },
      fields: [["client_name", "Client"], ["address", "Address"], ["customer_phone", "Phone"], ["owner_note", "Owner note", "textarea"]],
    }));
  });

  invoices.filter((invoice) => statusOf(invoice) === "draft" || isOverdue(invoice)).slice(0, 10).forEach((invoice) => {
    const overdue = isOverdue(invoice);
    actions.push(makeAction({
      box: "money",
      type: overdue ? "invoice_follow_up" : "send_invoice",
      title: overdue ? `Follow up ${invoiceTitle(invoice)}` : `Approve ${invoiceTitle(invoice)}`,
      found: overdue ? "Invoice is overdue or past its due date." : "Draft invoice is waiting for owner review.",
      prepared: overdue ? "Churvox prepared a payment follow-up note." : "Churvox prepared the invoice to move from draft to sent.",
      reason: overdue ? "Payment follow-up should be approved before anything is sent or logged." : "The invoice can be marked sent after you check amount, due date and wording.",
      approveLabel: overdue ? "Approve follow-up" : "Approve invoice",
      declineLabel: overdue ? "Decline follow-up" : "Decline invoice",
      approval: overdue ? "Approving saves the follow-up note. It does not auto-send SMS or email." : "Approving marks the invoice as sent. It does not charge the customer.",
      href: "/invoices-board",
      form: { invoice_id: idOf(invoice), invoice_title: invoiceTitle(invoice), client_name: clientOf(invoice), amount: amountOf(invoice), due_date: first(invoice.due_date, invoice.date_due), invoice_message: overdue ? `Friendly reminder for ${clientOf(invoice) || "the customer"} about ${invoiceTitle(invoice)}.` : first(invoice.message, invoice.notes, "Invoice reviewed and ready to send"), internal_note: first(invoice.internal_note, invoice.notes) },
      fields: [["amount", "Amount"], ["due_date", "Due date"], ["invoice_message", overdue ? "Follow-up note" : "Invoice message", "textarea"], ["internal_note", "Internal note", "textarea"]],
    }));
  });

  quotes.filter((quote) => (statusOf(quote) === "sent" || statusOf(quote).includes("accept")) && !first(quote.converted_job_id, quote.job_id, quote.linked_job_id)).slice(0, 10).forEach((quote) => {
    const accepted = statusOf(quote).includes("accept");
    actions.push(makeAction({
      box: "quotes",
      type: accepted ? "quote_convert" : "quote_follow_up",
      title: accepted ? `Convert ${quoteTitle(quote)} to job` : `Follow up ${quoteTitle(quote)}`,
      found: accepted ? "Accepted quote has not been turned into a job." : "Sent quote has not converted yet.",
      prepared: accepted ? "Churvox prepared a quote-to-job decision." : "Churvox prepared a simple customer follow-up.",
      reason: accepted ? "Accepted quote should become a scheduled job so work does not get lost." : "Quote follow-up can help convert work without the owner hunting through quotes.",
      approveLabel: accepted ? "Approve convert to job" : "Approve follow-up",
      declineLabel: accepted ? "Decline conversion" : "Decline follow-up",
      approval: accepted ? "Approving creates a job from this quote." : "Approving saves the follow-up note. It does not auto-send SMS or email.",
      href: "/quotes-board",
      form: { quote_id: idOf(quote), quote_title: quoteTitle(quote), client_name: clientOf(quote), quote_value: amountOf(quote), message: `Hi ${clientOf(quote) || "there"}, just checking whether you had any questions about your quote.`, convert_note: "Create job from accepted quote", scope: first(quote.scope, quote.description, quote.job_description) },
      fields: [["quote_value", "Value"], ["message", "Follow-up message", "textarea"], ["convert_note", "Convert note", "textarea"], ["scope", "Scope", "textarea"]],
    }));
  });

  clients.filter((client) => !first(client.phone, client.customer_phone, client.mobile, client.email, client.customer_email)).slice(0, 8).forEach((client) => {
    actions.push(makeAction({
      box: "clients",
      type: "client_missing_contact",
      title: `Fix client contact: ${clientOf(client) || "Unnamed client"}`,
      found: "Client is missing phone or email.",
      prepared: "Churvox opened the missing contact fields so reminders and invoices work later.",
      reason: "Client contact details are needed for reminders, invoice follow-ups and job communication.",
      approveLabel: "Approve client update",
      declineLabel: "Decline client fix",
      approval: "Approving saves the client contact update.",
      href: "/clients-board",
      form: { client_id: idOf(client), client_name: clientOf(client), customer_phone: first(client.phone, client.customer_phone, client.mobile), customer_email: first(client.email, client.customer_email), client_note: first(client.notes) },
      fields: [["client_name", "Client"], ["customer_phone", "Phone"], ["customer_email", "Email"], ["client_note", "Client note", "textarea"]],
    }));
  });

  jobs.filter((job) => isDone(job) && first(job.worker_notes, job.completion_note, job.photos_count, Array.isArray(job.photos) ? job.photos.length : "")).slice(0, 6).forEach((job) => {
    actions.push(makeAction({
      box: "workers",
      type: "worker_completion_review",
      title: `Review worker update: ${titleOf(job)}`,
      found: "Worker completion update is ready for owner review.",
      prepared: "Churvox surfaced worker notes/photos so they can feed invoice wording or proof.",
      reason: "Worker updates should be checked before invoice/customer follow-up.",
      approveLabel: "Approve worker update",
      declineLabel: "Decline update",
      approval: "Approving saves the review note on the job.",
      href: "/team-board",
      form: { job_id: idOf(job), job_title: titleOf(job), worker_name: first(job.worker_name, job.assigned_worker_name), worker_notes: first(job.worker_notes, job.completion_note), proof_summary: first(job.photos_count, Array.isArray(job.photos) ? `${job.photos.length} photo${job.photos.length === 1 ? "" : "s"}` : "Photos not checked"), owner_note: "Worker update reviewed." },
      fields: [["worker_name", "Worker"], ["proof_summary", "Proof"], ["worker_notes", "Worker notes", "textarea"], ["owner_note", "Owner note", "textarea"]],
    }));
  });

  if (workers.length === 0) {
    actions.push(makeAction({ box: "setup", type: "setup_workers", title: "Add first worker", found: "No workers found in team records.", prepared: "Churvox flagged setup because crew dispatch cannot work without workers.", reason: "Dispatch suggestions need real worker records.", approveLabel: "Open team setup", declineLabel: "Ignore for now", approval: "Use Team to add workers. No record is changed from this slip.", href: "/team-board", form: { setup_note: "Add first worker so Crew Dispatch can suggest assignments." }, fields: [["setup_note", "Setup note", "textarea"]] }));
  }
  if (clients.length === 0) {
    actions.push(makeAction({ box: "setup", type: "setup_clients", title: "Add or import clients", found: "No clients found.", prepared: "Churvox flagged setup because jobs, invoices and reminders need clients.", reason: "Client records are the base of job admin.", approveLabel: "Open clients", declineLabel: "Ignore for now", approval: "Use Clients to add or import customers. No record is changed from this slip.", href: "/clients-board", form: { setup_note: "Add or import clients so AI admin can prepare useful work." }, fields: [["setup_note", "Setup note", "textarea"]] }));
  }

  return actions;
}

function validate(action, form) {
  if (!action) return "No action selected.";
  if (["setup_workers", "setup_clients"].includes(action.type)) return "";
  if (action.type === "assign_job" && !first(form.worker_id, form.worker_name)) return "Pick or enter a worker before approving.";
  if (["draft_invoice", "missing_price_invoice"].includes(action.type) && money(form.job_price) <= 0) return "Add the job price before approving.";
  if (action.type === "send_invoice" && money(form.amount) <= 0) return "Check invoice amount before approving.";
  if (action.type === "invoice_follow_up" && !first(form.invoice_message)) return "Add the follow-up note first.";
  if (action.type === "quote_follow_up" && !first(form.message)) return "Add the quote follow-up message first.";
  if (action.type === "client_missing_contact" && !first(form.customer_phone, form.customer_email)) return "Add phone or email first.";
  return "";
}

function Field({ field, form, setForm }) {
  const [key, label, type] = field;
  const common = "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[15px] font-black text-slate-950 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200";
  return <label className={type === "textarea" ? "md:col-span-2" : ""}><span className="block text-[11px] font-black uppercase tracking-[.15em] text-orange-700">{label}</span>{type === "textarea" ? <textarea value={form[key] || ""} onChange={(event) => setForm((old) => ({ ...old, [key]: event.target.value }))} className={`${common} min-h-[92px] resize-y`} /> : <input value={form[key] || ""} onChange={(event) => setForm((old) => ({ ...old, [key]: event.target.value }))} className={common} />}</label>;
}
function Badge({ children, tone = "dark" }) {
  const map = { dark: "bg-slate-950 text-white", green: "bg-emerald-100 text-emerald-800", red: "bg-red-100 text-red-800", amber: "bg-amber-100 text-amber-900" };
  return <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[.14em] ${map[tone]}`}>{children}</span>;
}
function Metric({ label, value, text, tone }) {
  return <article className={`${card} relative overflow-hidden pl-7`}><span className="absolute left-0 top-0 h-full w-2" style={{ background: `linear-gradient(180deg, ${tone}, #facc15, #22d3ee)` }} /><div className="text-[11px] font-black uppercase tracking-[.2em] text-amber-300">{label}</div><div className="mt-2 text-4xl font-black tracking-[-.07em] text-white">{value}</div><p className="mt-2 text-sm font-bold leading-6 text-slate-300">{text}</p></article>;
}
function CommandBox({ box, actions, onOpen }) {
  return <button type="button" onClick={() => onOpen(box.key, actions[0] || null)} className="group relative min-h-[235px] overflow-hidden rounded-[30px] border border-white/10 bg-slate-950 p-5 text-left text-white shadow-[0_22px_62px_rgba(2,6,23,.20)] transition hover:-translate-y-1 hover:shadow-[0_30px_80px_rgba(2,6,23,.28)]"><span className="absolute left-0 top-0 h-full w-2" style={{ background: `linear-gradient(180deg, ${box.tone}, #facc15, #22d3ee)` }} /><div className="flex items-start justify-between gap-3"><div><div className="text-[11px] font-black uppercase tracking-[.2em] text-amber-300">{box.label}</div><h3 className="mt-2 text-2xl font-black tracking-[-.05em] text-white">{box.title}</h3></div><span className="rounded-full bg-white/10 px-3 py-1 text-sm font-black ring-1 ring-white/10">{actions.length}</span></div><p className="mt-3 text-sm font-bold leading-6 text-slate-300">{box.text}</p><div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-sm font-black leading-6 text-slate-200">{actions.length ? `${actions[0].title}. Tap to approve, decline or edit.` : "All clear. Tap to see what Churvox checked."}</div><span className="mt-4 inline-flex rounded-2xl bg-amber-300 px-4 py-2 text-sm font-black text-slate-950">Open slip</span></button>;
}
function EmptySlip({ box, onClose }) {
  return <section className="cv-slip-shell"><header className="cv-slip-head"><div><Badge tone="green">All clear</Badge><h1>{box.title}</h1><p>Churvox checked this area. Nothing needs approval right now.</p></div><button onClick={onClose}>Close</button></header><main className="cv-slip-empty"><section><h2>No owner decision waiting.</h2><p>{box.text}</p><div className="cv-proof-grid"><div><b>Checked</b><span>Live records in this area</span></div><div><b>Prepared</b><span>No approval slip needed</span></div><div><b>Next</b><span>Add records or open the full page if needed</span></div></div></section><aside><Link to={box.href} onClick={onClose}>Open full records</Link><button onClick={onClose}>Back to Command</button></aside></main></section>;
}
function ApprovalSlip({ box, action, onClose, onApprove, onDecline, onSave, busy }) {
  const [form, setForm] = React.useState(action.form || {});
  React.useEffect(() => setForm(action.form || {}), [action]);
  const missing = validate(action, form);
  return <section className="cv-slip-shell"><header className="cv-slip-head"><div><Badge tone={missing ? "amber" : "green"}>{missing ? "Needs fix" : "Ready"}</Badge><h1>{action.title}</h1><p>One AI-prepared decision. Edit only what matters, then approve or decline.</p></div><button onClick={onClose}>Close</button></header><main className="cv-slip-main"><section className="cv-slip-left"><article className="cv-decision-card"><div className="cv-decision-top"><Badge>AI decision</Badge><Badge tone={missing ? "red" : "green"}>{missing || "Ready to approve"}</Badge></div><h2>{action.title}</h2><div className="cv-ai-grid"><div><b>AI found</b><p>{action.found}</p></div><div><b>AI prepared</b><p>{action.prepared}</p></div><div><b>Why</b><p>{action.reason}</p></div></div></article><article className="cv-edit-card"><div className="cv-section-title">Editable details for this decision</div><div className="cv-field-grid">{action.fields.map((field) => <Field key={field[0]} field={field} form={form} setForm={setForm} />)}</div></article></section><aside className="cv-control-card"><div className="cv-section-title">Owner controls</div><h2>Approve or decline</h2><p>{action.approval}</p>{missing ? <div className="cv-warning">{missing}</div> : <div className="cv-ready">Ready for owner approval.</div>}<button className="cv-save" onClick={() => onSave(action, form)} disabled={busy}>Save edit</button><button className="cv-approve" onClick={() => onApprove(action, form)} disabled={busy || Boolean(missing)}>{busy ? "Approving…" : action.approveLabel || "Approve"}</button><button className="cv-decline" onClick={() => onDecline(action)} disabled={busy}>{action.declineLabel || "Decline"}</button><Link to={action.href || box.href} onClick={onClose}>Open full record</Link><button className="cv-back" onClick={onClose}>Back to Command</button></aside></main></section>;
}
function CommandSlip({ open, actions, onClose, onApprove, onDecline, onSave, busy }) {
  if (!open) return null;
  const box = boxByKey[open.box] || boxByKey.approvals;
  const action = open.action || actions.find((item) => open.box === "approvals" ? true : item.box === open.box);
  return <div className="cv-slip-overlay">{action ? <ApprovalSlip box={box} action={action} onClose={onClose} onApprove={onApprove} onDecline={onDecline} onSave={onSave} busy={busy} /> : <EmptySlip box={box} onClose={onClose} />}</div>;
}

function CommandCss() {
  return <style>{`
    .cv-command-final { background: radial-gradient(circle at 12% 0%, rgba(251,146,60,.10), transparent 34%), radial-gradient(circle at 88% 0%, rgba(34,211,238,.09), transparent 32%), #f7f3ea; }
    .cv-slip-overlay { position: fixed; inset: 0; z-index: 2147483647; background: rgba(2,6,23,.90); backdrop-filter: blur(18px); padding: 16px 20px 16px 286px; display: flex; justify-content: center; align-items: stretch; overflow: hidden; }
    .cv-slip-shell { width: min(1580px, calc(100vw - 322px)); max-height: calc(100vh - 32px); display: grid; grid-template-rows: auto minmax(0,1fr); overflow: hidden; border-radius: 34px; background: #f7f3ea; box-shadow: 0 38px 120px rgba(0,0,0,.45); }
    .cv-slip-head { background: linear-gradient(135deg, #111827, #050914); color: white; padding: 22px 28px; display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; border-left: 8px solid #fb923c; }
    .cv-slip-head h1 { margin: 10px 0 6px; color: white; font-size: clamp(38px, 4vw, 70px); line-height: .88; letter-spacing: -.075em; font-weight: 1000; }
    .cv-slip-head p { margin: 0; color: #dbeafe; font-size: 15px; line-height: 1.45; font-weight: 800; max-width: 850px; }
    .cv-slip-head button { background: white; color: #0f172a; border: 0; border-radius: 18px; padding: 12px 18px; font-weight: 1000; }
    .cv-slip-main { min-height: 0; display: grid; grid-template-columns: minmax(0,1fr) 330px; gap: 16px; padding: 16px; overflow: hidden; }
    .cv-slip-left { min-height: 0; overflow-y: auto; display: grid; grid-template-columns: minmax(320px,.9fr) minmax(420px,1.15fr); gap: 14px; align-content: start; padding-right: 4px; }
    .cv-decision-card, .cv-edit-card, .cv-control-card, .cv-slip-empty section, .cv-slip-empty aside { background: white; border: 1px solid rgba(15,23,42,.12); border-radius: 26px; padding: 18px; color: #0f172a; box-shadow: 0 16px 44px rgba(15,23,42,.08); }
    .cv-decision-top { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .cv-decision-card h2, .cv-control-card h2, .cv-slip-empty h2 { color: #0f172a; font-size: 34px; line-height: .95; letter-spacing: -.06em; font-weight: 1000; margin: 16px 0; }
    .cv-ai-grid { display: grid; gap: 10px; }
    .cv-ai-grid div, .cv-proof-grid div { background: #f8fafc; border: 1px solid rgba(15,23,42,.10); border-radius: 18px; padding: 14px; }
    .cv-ai-grid b, .cv-proof-grid b, .cv-section-title { display: block; color: #c2410c; font-size: 11px; text-transform: uppercase; letter-spacing: .15em; font-weight: 1000; margin-bottom: 6px; }
    .cv-ai-grid p, .cv-proof-grid span, .cv-control-card p, .cv-slip-empty p { color: #334155; font-size: 15px; line-height: 1.5; font-weight: 800; margin: 0; }
    .cv-field-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 12px; margin-top: 14px; }
    .cv-control-card { position: sticky; top: 0; align-self: start; max-height: 100%; overflow-y: auto; display: grid; gap: 10px; }
    .cv-warning, .cv-ready { border-radius: 18px; padding: 12px 14px; font-size: 14px; line-height: 1.45; font-weight: 1000; }
    .cv-warning { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
    .cv-ready { background: #dcfce7; color: #065f46; border: 1px solid #bbf7d0; }
    .cv-control-card button, .cv-control-card a, .cv-slip-empty aside button, .cv-slip-empty aside a { display: block; width: 100%; min-height: 48px; border-radius: 16px; border: 0; padding: 13px 15px; text-align: center; text-decoration: none; font-size: 15px; font-weight: 1000; }
    .cv-save { background: #fff7ed; color: #9a3412; border: 1px solid #fed7aa !important; }
    .cv-approve { background: #34d399; color: #020617; }
    .cv-approve:disabled { opacity: .45; }
    .cv-decline { background: #fee2e2; color: #991b1b; }
    .cv-control-card a, .cv-slip-empty aside a { background: white; color: #0f172a; border: 1px solid #e2e8f0; }
    .cv-back, .cv-slip-empty aside button { background: #0f172a; color: white; }
    .cv-slip-empty { min-height: 0; display: grid; grid-template-columns: minmax(0,1fr) 320px; gap: 16px; padding: 16px; overflow: hidden; }
    .cv-proof-grid { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 12px; margin-top: 16px; }
    @media (max-width: 1200px) { .cv-slip-overlay { padding: 12px; } .cv-slip-shell { width: 100%; } .cv-slip-main, .cv-slip-empty { grid-template-columns: 1fr; overflow-y: auto; } .cv-slip-left { grid-template-columns: 1fr; overflow: visible; } .cv-control-card { position: static; } }
    @media (max-width: 760px) { .cv-slip-head h1 { font-size: 38px; } .cv-field-grid, .cv-proof-grid { grid-template-columns: 1fr; } }
  `}</style>;
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
      const next = {
        jobs: jobsRes.status === "fulfilled" ? listFrom(jobsRes.value, ["jobs"]) : [],
        invoices: invoicesRes.status === "fulfilled" ? listFrom(invoicesRes.value, ["invoices"]) : [],
        quotes: quotesRes.status === "fulfilled" ? listFrom(quotesRes.value, ["quotes"]) : [],
        workers: workersRes.status === "fulfilled" ? listFrom(workersRes.value, ["workers", "team", "users"]) : [],
        clients: clientsRes.status === "fulfilled" ? listFrom(clientsRes.value, ["clients", "customers"]) : [],
      };
      setData(next);
      setActions(buildActions(next));
    } finally {
      setBusy(false);
    }
  }, [get]);

  React.useEffect(() => { refresh(); }, [refresh]);

  async function approve(action, form) {
    const missing = validate(action, form);
    if (missing) return toast.error(missing);
    setBusy(true);
    try {
      let result = { success: true };
      if (action.type === "assign_job") result = await post(`/jobs/${encodeURIComponent(form.job_id)}/assign`, { worker_id: form.worker_id, worker_name: form.worker_name, dispatch_note: form.dispatch_note });
      if (["draft_invoice", "missing_price_invoice"].includes(action.type)) result = await post("/invoices", { job_id: form.job_id, client_id: form.client_id || undefined, customer_name: form.client_name, customer_email: form.customer_email || undefined, subtotal: money(form.job_price), description: form.invoice_description, due_date: form.due_date || undefined });
      if (action.type === "fix_job_info") result = await patch(`/jobs/${encodeURIComponent(form.job_id)}`, { client_name: form.client_name, address: form.address, customer_phone: form.customer_phone, owner_note: form.owner_note });
      if (action.type === "send_invoice") result = await patch(`/invoices/${encodeURIComponent(form.invoice_id)}`, { status: "sent", amount: money(form.amount), due_date: form.due_date, notes: form.invoice_message || form.internal_note });
      if (action.type === "invoice_follow_up") result = await patch(`/invoices/${encodeURIComponent(form.invoice_id)}`, { notes: addNote(form.internal_note, "Follow-up prepared", form.invoice_message) });
      if (action.type === "quote_follow_up") result = await patch(`/quotes/${encodeURIComponent(form.quote_id)}`, { notes: addNote(form.internal_note, "Follow-up prepared", form.message) });
      if (action.type === "quote_convert") result = await post(`/quotes/${encodeURIComponent(form.quote_id)}/convert`, {});
      if (action.type === "client_missing_contact") result = await patch(`/clients/${encodeURIComponent(form.client_id)}`, { name: form.client_name, phone: form.customer_phone, email: form.customer_email, notes: form.client_note });
      if (action.type === "worker_completion_review") result = await patch(`/jobs/${encodeURIComponent(form.job_id)}`, { owner_note: form.owner_note, worker_reviewed: true });
      if (!["assign_job", "draft_invoice", "missing_price_invoice", "fix_job_info", "send_invoice", "invoice_follow_up", "quote_follow_up", "quote_convert", "client_missing_contact", "worker_completion_review"].includes(action.type)) result = { success: true };
      if (!result?.success) throw new Error(result?.error || "Approval failed");
      toast.success("Approved and applied");
      setOpen(null);
      await refresh();
    } catch (error) {
      toast.error(error?.message || "Approval failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(action, form) {
    try {
      let result = { success: true };
      if (["assign_job", "draft_invoice", "missing_price_invoice", "fix_job_info", "worker_completion_review"].includes(action.type) && form.job_id) result = await patch(`/jobs/${encodeURIComponent(form.job_id)}`, { ...form });
      if (["send_invoice", "invoice_follow_up"].includes(action.type) && form.invoice_id) result = await patch(`/invoices/${encodeURIComponent(form.invoice_id)}`, { ...form });
      if (["quote_follow_up", "quote_convert"].includes(action.type) && form.quote_id) result = await patch(`/quotes/${encodeURIComponent(form.quote_id)}`, { ...form });
      if (action.type === "client_missing_contact" && form.client_id) result = await patch(`/clients/${encodeURIComponent(form.client_id)}`, { name: form.client_name, phone: form.customer_phone, email: form.customer_email, notes: form.client_note });
      if (!result?.success) throw new Error(result?.error || "Save failed");
      toast.success("Edits saved");
      await refresh();
    } catch (error) {
      toast.error(error?.message || "Could not save edits");
    }
  }

  function decline(action) {
    setDeclined((old) => Array.from(new Set([...old, action.id])));
    setOpen(null);
    toast.success("Declined and removed from this Command view");
  }

  const liveActions = actions.filter((action) => !declined.includes(action.id));
  const actionsForBox = (key) => key === "approvals" ? liveActions : liveActions.filter((action) => action.box === key);
  const next = liveActions[0] || null;

  return <main className="cv-command-final fixed inset-0 z-[2147483000] overflow-y-auto text-slate-950" data-industrial-simple-page="command" data-command-canvas data-marker="CHURVOX_COMMAND_APPROVAL_DESK_FINAL_20260608"><CommandCss /><section className="mx-auto max-w-7xl p-4 pb-28 md:p-6 xl:p-8"><section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]"><section className={`${card} p-6 md:p-8`}><span className="inline-flex rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-[11px] font-black uppercase tracking-[.22em] text-amber-300">AI approval desk</span><h1 className="mt-5 max-w-4xl text-5xl font-black leading-[.9] tracking-[-.08em] text-white md:text-7xl">Churvox did the admin. You approve.</h1><p className="mt-4 max-w-3xl text-base font-bold leading-7 text-slate-300">No hunting. Each box opens one focused AI-prepared decision with readable wording, editable details, Approve and Decline.</p><div className="mt-6 flex flex-wrap gap-3"><button type="button" onClick={refresh} disabled={busy} className="rounded-2xl bg-amber-300 px-5 py-3 text-sm font-black text-slate-950 disabled:opacity-60">{busy ? "Checking…" : "Refresh AI work"}</button>{next ? <button type="button" onClick={() => setOpen({ box: next.box, action: next })} className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white">Open next approval</button> : null}<Link to="/jobs/new" className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white no-underline">Add job</Link></div></section><section className={card}><div className="text-[11px] font-black uppercase tracking-[.2em] text-amber-300">Right now</div><h2 className="mt-2 text-4xl font-black tracking-[-.06em] text-white">{liveActions.length ? `${liveActions.length} decisions` : "All clear"}</h2><p className="mt-3 text-sm font-bold leading-6 text-slate-300">{next ? `${next.title}. ${next.prepared}` : "No approval waiting. Boxes still show what Churvox checks."}</p>{next ? <button type="button" onClick={() => setOpen({ box: next.box, action: next })} className="mt-5 w-full rounded-2xl bg-emerald-300 px-5 py-3 text-sm font-black text-slate-950">Review approval slip</button> : null}</section></section><section className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4"><Metric label="Jobs" value={data.jobs.length} text="Jobs checked." tone="#facc15" /><Metric label="Invoices" value={data.invoices.length} text="Invoices checked." tone="#34d399" /><Metric label="Quotes" value={data.quotes.length} text="Quotes checked." tone="#22d3ee" /><Metric label="Approvals" value={liveActions.length} text="Approve or decline." tone="#fb923c" /></section><section className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{BOXES.map((box) => <CommandBox key={box.key} box={box} actions={actionsForBox(box.key)} onOpen={(boxKey, action) => setOpen({ box: boxKey, action })} />)}</section></section><CommandSlip open={open} actions={liveActions} onClose={() => setOpen(null)} onApprove={approve} onDecline={decline} onSave={saveEdit} busy={busy} /></main>;
}
