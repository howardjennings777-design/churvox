import React from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";

const first = (...values) => values.find((v) => v !== undefined && v !== null && String(v).trim() !== "") || "";
const money = (value) => Number(String(value || 0).replace(/[^0-9.-]/g, "")) || 0;
const cleanId = (value) => {
  if (!value) return "";
  if (typeof value === "object") return String(value.$oid || value.oid || value.id || value._id || "");
  const text = String(value || "");
  return text === "[object Object]" ? "" : text;
};
const idOf = (item) => cleanId(first(item?.id, item?._id, item?.job_id, item?.invoice_id, item?.quote_id, item?.client_id, item?.worker_id, ""));
const statusOf = (item) => String(first(item?.status, item?.job_status, item?.invoice_status, item?.quote_status, "")).toLowerCase();
const listFrom = (res, keys = []) => {
  const data = res?.data ?? res;
  if (Array.isArray(data)) return data;
  for (const key of [...keys, "jobs", "invoices", "quotes", "clients", "customers", "workers", "team", "users", "items", "data"]) if (Array.isArray(data?.[key])) return data[key];
  return [];
};
const done = (job) => statusOf(job).includes("complete") || statusOf(job).includes("done") || job?.completed || job?.completed_at;
const cancelled = (item) => statusOf(item).includes("cancel");
const amountOf = (item) => money(first(item?.total, item?.amount_due, item?.balance_due, item?.amount, item?.price, item?.fixed_price, item?.subtotal, item?.quote_total, item?.invoice_total, 0));
const clientOf = (item) => first(item?.client_name, item?.customer_name, item?.client?.name, item?.name, "");
const jobTitle = (job) => first(job?.title, job?.job_title, job?.job_name, job?.service_type, job?.job_type, "Untitled job");
const invoiceTitle = (invoice) => first(invoice?.invoice_number, invoice?.number, invoice?.title, "Invoice");
const quoteTitle = (quote) => first(quote?.quote_number, quote?.number, quote?.title, "Quote");
const workerName = (worker) => first(worker?.name, worker?.full_name, worker?.display_name, worker?.email, "Unnamed worker");
const roleOf = (worker) => String(first(worker?.role, worker?.account_type, "worker")).toLowerCase();
const fieldWorkers = (workers) => workers.filter((worker) => roleOf(worker).includes("worker") || roleOf(worker).includes("field") || roleOf(worker).includes("manager"));
const assignedWorkerId = (job) => cleanId(first(job?.assigned_worker_id, job?.worker_id, job?.assigned_to_id, ""));
const assignedWorkerName = (job) => String(first(job?.assigned_worker_name, job?.worker_name, job?.assigned_to_name, job?.assigned_to, "")).toLowerCase();
const workerLoad = (worker, jobs) => {
  const wid = idOf(worker);
  const name = workerName(worker).toLowerCase();
  return jobs.filter((job) => !done(job) && !cancelled(job) && ((wid && assignedWorkerId(job) === wid) || (name && assignedWorkerName(job) === name))).length;
};
const pickWorker = (job, workers, jobs) => [...fieldWorkers(workers)].sort((a, b) => workerLoad(a, jobs) - workerLoad(b, jobs))[0] || null;
const overdue = (invoice) => {
  const s = statusOf(invoice);
  if (s.includes("paid") || cancelled(invoice)) return false;
  if (s.includes("overdue")) return true;
  const due = first(invoice?.due_date, invoice?.date_due, invoice?.payment_due);
  if (!due) return false;
  const d = new Date(due);
  return !Number.isNaN(d.getTime()) && d.getTime() < Date.now();
};
const appendNote = (oldNote, label, note) => `${oldNote ? `${oldNote}\n\n` : ""}${label} ${new Date().toLocaleDateString("en-NZ")}: ${note || "Reviewed by owner"}`.trim();

const BOXES = [
  { key: "approvals", label: "Approvals", title: "Owner approvals", text: "All AI-prepared decisions waiting for yes, change, or no.", href: "/dashboard", tone: "orange" },
  { key: "crew", label: "Crew", title: "Crew decisions", text: "Worker assignments and dispatch choices Churvox prepared.", href: "/dispatch-board", tone: "orange" },
  { key: "money", label: "Money", title: "Money decisions", text: "Invoice drafts, overdue invoices and payment follow-ups.", href: "/invoices-board", tone: "green" },
  { key: "jobs", label: "Jobs", title: "Jobs needing info", text: "Missing price, address, client or schedule before admin can finish.", href: "/jobs-board", tone: "orange" },
  { key: "quotes", label: "Quotes", title: "Quote decisions", text: "Quote follow-ups and accepted quotes ready to become jobs.", href: "/quotes-board", tone: "steel" },
  { key: "clients", label: "Clients", title: "Client setup", text: "Client records, missing contacts and CSV import work.", href: "/clients-board", tone: "steel" },
  { key: "workers", label: "Worker updates", title: "Worker updates", text: "Completion notes, photos and proof that need owner review.", href: "/team-board", tone: "steel" },
  { key: "payroll", label: "Payroll/time", title: "Payroll checks", text: "Timesheet and job-time items that need review.", href: "/payroll-board", tone: "red" },
  { key: "setup", label: "Setup", title: "Setup issues", text: "Business, GST, team and app setup gaps before AI can do more.", href: "/settings-board", tone: "green" },
];
const boxMap = Object.fromEntries(BOXES.map((b) => [b.key, b]));

function makeAction(input) {
  return {
    id: `${input.type}-${first(input.form?.job_id, input.form?.invoice_id, input.form?.quote_id, input.form?.client_id, input.title)}`,
    kind: "approval",
    badge: "Ready to approve",
    ...input,
    detailFields: input.detailFields || [],
    facts: input.facts || [],
    href: input.href || boxMap[input.box]?.href || "/dashboard",
  };
}
function makeSetup(input) {
  return {
    id: `${input.type}-${input.box}`,
    kind: "setup",
    badge: "Needs setup",
    approveLabel: input.approveLabel || "Open setup",
    declineLabel: input.declineLabel || "Ignore for now",
    ...input,
    detailFields: input.detailFields || [],
    facts: input.facts || [],
    href: input.href || boxMap[input.box]?.href || "/settings-board",
  };
}

function buildActions({ jobs, invoices, quotes, clients, workers }) {
  const out = [];
  const invoiceJobIds = new Set(invoices.map((i) => cleanId(first(i.job_id, i.linked_job_id, i.jobId))).filter(Boolean));

  jobs.filter((job) => !done(job) && !cancelled(job) && !first(job.assigned_worker_id, job.worker_id, job.assigned_to, job.assigned_worker_name)).slice(0, 8).forEach((job) => {
    const worker = pickWorker(job, workers, jobs);
    out.push(makeAction({
      box: "crew",
      type: "assign_job",
      title: `Assign ${worker ? workerName(worker) : "worker"} to ${jobTitle(job)}`,
      found: "Job has no worker assigned.",
      prepared: worker ? `Churvox picked ${workerName(worker)} as the recommended worker.` : "Churvox could not safely pick a worker yet.",
      why: worker ? `${workerName(worker)} has ${workerLoad(worker, jobs)} open job${workerLoad(worker, jobs) === 1 ? "" : "s"}.` : "Add or choose a worker before dispatching this job.",
      approveLabel: "Approve assignment",
      declineLabel: "Decline assignment",
      approvalText: "Approving assigns the selected worker to this job.",
      href: "/dispatch-board",
      form: { job_id: idOf(job), job_title: jobTitle(job), client_name: clientOf(job), address: first(job.address, job.site_address, job.location), worker_id: worker ? idOf(worker) : "", worker_name: worker ? workerName(worker) : "", dispatch_note: first(job.dispatch_note, job.notes, "Ready to dispatch") },
      facts: [["Job", jobTitle(job)], ["Client", clientOf(job) || "No client saved"], ["Address", first(job.address, job.site_address, job.location, "No address saved")]],
      detailFields: [["worker_name", "Worker"], ["worker_id", "Worker ID"], ["dispatch_note", "Dispatch note", "textarea"]],
    }));
  });

  jobs.filter((job) => done(job) && !invoiceJobIds.has(idOf(job))).slice(0, 8).forEach((job) => {
    const price = amountOf(job);
    out.push(makeAction({
      box: price > 0 ? "money" : "jobs",
      type: price > 0 ? "draft_invoice" : "missing_price_invoice",
      title: price > 0 ? `Draft invoice ready for ${jobTitle(job)}` : `Price needed for ${jobTitle(job)}`,
      found: "Completed job has not been invoiced.",
      prepared: price > 0 ? `Churvox prepared a draft invoice for $${price}.` : "Churvox found the only blocker: the job price is missing.",
      why: "Once the price and wording are approved, this can become a draft invoice for owner review.",
      approveLabel: price > 0 ? "Approve draft invoice" : "Save price + draft invoice",
      declineLabel: "Decline invoice draft",
      approvalText: "Approving creates a draft invoice only. It does not send it to the customer.",
      href: "/jobs-board",
      form: { job_id: idOf(job), client_id: cleanId(first(job.client_id, job.customer_id)), client_name: clientOf(job), customer_email: first(job.customer_email, job.client_email, job.email), job_price: price || "", invoice_description: first(job.invoice_description, job.description, job.notes, `${jobTitle(job)} completed`) },
      facts: [["Job", jobTitle(job)], ["Client", clientOf(job) || "No client saved"], ["Price", price ? `$${price}` : "Missing"]],
      detailFields: [["job_price", "Price"], ["invoice_description", "Invoice wording", "textarea"]],
    }));
  });

  invoices.filter((invoice) => statusOf(invoice) === "draft" || overdue(invoice)).slice(0, 10).forEach((invoice) => {
    const isLate = overdue(invoice);
    out.push(makeAction({
      box: "money",
      type: isLate ? "invoice_follow_up" : "send_invoice",
      title: isLate ? `Follow up ${invoiceTitle(invoice)}` : `Approve ${invoiceTitle(invoice)}`,
      found: isLate ? "Invoice is overdue or past its due date." : "Draft invoice is waiting for owner review.",
      prepared: isLate ? "Churvox prepared a payment follow-up note." : "Churvox prepared this invoice to move from draft to sent.",
      why: isLate ? "The customer needs a reminder, but owner approval comes first." : "Amount and wording should be checked before marking as sent.",
      approveLabel: isLate ? "Approve follow-up" : "Approve invoice",
      declineLabel: isLate ? "Decline follow-up" : "Decline invoice",
      approvalText: isLate ? "Approving saves the follow-up note. It does not auto-send SMS or email." : "Approving marks the invoice as sent. It does not charge the customer.",
      href: "/invoices-board",
      form: { invoice_id: idOf(invoice), client_name: clientOf(invoice), amount: amountOf(invoice), due_date: first(invoice.due_date, invoice.date_due), invoice_message: isLate ? `Friendly reminder for ${clientOf(invoice) || "the customer"} about ${invoiceTitle(invoice)}.` : first(invoice.message, invoice.notes, "Invoice reviewed and ready to send"), internal_note: first(invoice.internal_note, invoice.notes) },
      facts: [["Invoice", invoiceTitle(invoice)], ["Client", clientOf(invoice) || "No client saved"], ["Amount", amountOf(invoice) ? `$${amountOf(invoice)}` : "Missing"]],
      detailFields: [["amount", "Amount"], ["due_date", "Due date"], ["invoice_message", isLate ? "Follow-up note" : "Invoice message", "textarea"]],
    }));
  });

  quotes.filter((quote) => (statusOf(quote) === "sent" || statusOf(quote).includes("accept")) && !first(quote.converted_job_id, quote.job_id, quote.linked_job_id)).slice(0, 8).forEach((quote) => {
    const accepted = statusOf(quote).includes("accept");
    out.push(makeAction({
      box: "quotes",
      type: accepted ? "quote_convert" : "quote_follow_up",
      title: accepted ? `Convert ${quoteTitle(quote)} to job` : `Follow up ${quoteTitle(quote)}`,
      found: accepted ? "Accepted quote has not been turned into a job." : "Sent quote has not converted yet.",
      prepared: accepted ? "Churvox prepared the quote-to-job decision." : "Churvox prepared a simple follow-up message.",
      why: accepted ? "Accepted work should become a job so it does not get lost." : "Follow-up helps convert work without hunting through quotes.",
      approveLabel: accepted ? "Approve convert to job" : "Approve follow-up",
      declineLabel: accepted ? "Decline conversion" : "Decline follow-up",
      approvalText: accepted ? "Approving creates a job from this quote." : "Approving saves the follow-up note. It does not auto-send SMS or email.",
      href: "/quotes-board",
      form: { quote_id: idOf(quote), quote_value: amountOf(quote), message: `Hi ${clientOf(quote) || "there"}, just checking whether you had any questions about your quote.`, convert_note: "Create job from accepted quote", scope: first(quote.scope, quote.description, quote.job_description) },
      facts: [["Quote", quoteTitle(quote)], ["Client", clientOf(quote) || "No client saved"], ["Value", amountOf(quote) ? `$${amountOf(quote)}` : "Missing"]],
      detailFields: [["quote_value", "Value"], ["message", "Message", "textarea"], ["scope", "Scope", "textarea"]],
    }));
  });

  clients.filter((c) => !first(c.phone, c.customer_phone, c.mobile, c.email, c.customer_email)).slice(0, 8).forEach((c) => {
    out.push(makeAction({
      box: "clients",
      type: "client_missing_contact",
      title: `Fix contact for ${clientOf(c) || "client"}`,
      found: "Client is missing phone or email.",
      prepared: "Churvox opened the exact contact details needed for reminders and invoices.",
      why: "Without phone or email, reminders and follow-ups cannot work properly.",
      approveLabel: "Approve client update",
      declineLabel: "Decline fix",
      approvalText: "Approving saves the client contact update.",
      href: "/clients-board",
      form: { client_id: idOf(c), client_name: clientOf(c), customer_phone: first(c.phone, c.customer_phone, c.mobile), customer_email: first(c.email, c.customer_email), client_note: first(c.notes) },
      facts: [["Client", clientOf(c) || "Unnamed client"], ["Phone", first(c.phone, c.customer_phone, c.mobile, "Missing")], ["Email", first(c.email, c.customer_email, "Missing")]],
      detailFields: [["client_name", "Client"], ["customer_phone", "Phone"], ["customer_email", "Email"], ["client_note", "Client note", "textarea"]],
    }));
  });

  jobs.filter((job) => done(job) && first(job.worker_notes, job.completion_note, job.photos_count, Array.isArray(job.photos) ? job.photos.length : "")).slice(0, 6).forEach((job) => {
    out.push(makeAction({
      box: "workers",
      type: "worker_completion_review",
      title: `Review worker update for ${jobTitle(job)}`,
      found: "Worker completion update is ready for owner review.",
      prepared: "Churvox surfaced worker notes/photos so they can feed proof or invoice wording.",
      why: "Worker proof should be checked before customer follow-up or invoice approval.",
      approveLabel: "Approve worker update",
      declineLabel: "Decline update",
      approvalText: "Approving marks the worker update as reviewed.",
      href: "/team-board",
      form: { job_id: idOf(job), worker_name: first(job.worker_name, job.assigned_worker_name), worker_notes: first(job.worker_notes, job.completion_note), proof_summary: first(job.photos_count, Array.isArray(job.photos) ? `${job.photos.length} photo${job.photos.length === 1 ? "" : "s"}` : "Photos not checked"), owner_note: "Worker update reviewed." },
      facts: [["Job", jobTitle(job)], ["Worker", first(job.worker_name, job.assigned_worker_name, "Not saved")], ["Proof", first(job.photos_count, Array.isArray(job.photos) ? `${job.photos.length} photos` : "Not checked")]],
      detailFields: [["worker_name", "Worker"], ["proof_summary", "Proof"], ["worker_notes", "Worker notes", "textarea"], ["owner_note", "Owner note", "textarea"]],
    }));
  });

  if (clients.length === 0) {
    out.push(makeSetup({
      box: "clients",
      type: "setup_clients",
      title: "Add or import clients",
      found: "No client records were found.",
      prepared: "Churvox prepared the client setup path instead of pretending there is client admin to approve.",
      why: "Clients are needed before AI can prepare reminders, invoices, quotes or job follow-ups.",
      approveLabel: "Open clients",
      declineLabel: "Ignore for now",
      approvalText: "No record changes from this slip. Add clients manually or import CSV from the Clients area.",
      href: "/clients-board",
      facts: [["Missing", "Client records"], ["Next", "Add client or import CSV"], ["Why", "Jobs, invoices and reminders need clients"]],
      detailFields: [["first_client_name", "First client name"], ["client_phone", "Phone"], ["client_email", "Email"], ["setup_note", "Setup note", "textarea"]],
      form: { first_client_name: "", client_phone: "", client_email: "", setup_note: "Add or import clients so AI admin can prepare real work." },
    }));
  }
  if (workers.length === 0) {
    out.push(makeSetup({
      box: "setup",
      type: "setup_workers",
      title: "Add first worker",
      found: "No worker records were found.",
      prepared: "Churvox prepared the team setup step so Crew Dispatch can work.",
      why: "Worker assignment suggestions need real worker records.",
      approveLabel: "Open team",
      declineLabel: "Ignore for now",
      approvalText: "No record changes from this slip. Add workers from the Team area.",
      href: "/team-board",
      facts: [["Missing", "Worker records"], ["Next", "Add worker"], ["Why", "Crew dispatch needs workers"]],
      detailFields: [["worker_name", "Worker name"], ["worker_email", "Worker email"], ["setup_note", "Setup note", "textarea"]],
      form: { worker_name: "", worker_email: "", setup_note: "Add workers so Churvox can suggest assignments." },
    }));
  }
  if (jobs.length === 0) {
    out.push(makeSetup({
      box: "jobs",
      type: "setup_jobs",
      title: "Create first job",
      found: "No jobs were found.",
      prepared: "Churvox prepared the first job setup step.",
      why: "Jobs are the starting point for dispatch, worker updates, invoice drafts and payroll time.",
      approveLabel: "Create job",
      declineLabel: "Ignore for now",
      approvalText: "No record changes from this slip. Open the job form when ready.",
      href: "/jobs/new",
      facts: [["Missing", "Job records"], ["Next", "Create a job"], ["Why", "AI admin needs jobs to prepare work"]],
      detailFields: [["job_title", "Job title"], ["client_name", "Client"], ["setup_note", "Setup note", "textarea"]],
      form: { job_title: "", client_name: "", setup_note: "Create a job so Command can start preparing admin." },
    }));
  }
  return out;
}

function validate(action, form) {
  if (!action || action.kind === "setup") return "";
  if (action.type === "assign_job" && !first(form.worker_id, form.worker_name)) return "Pick or enter a worker first.";
  if (["draft_invoice", "missing_price_invoice"].includes(action.type) && money(form.job_price) <= 0) return "Add the job price first.";
  if (action.type === "send_invoice" && money(form.amount) <= 0) return "Check invoice amount first.";
  if (action.type === "invoice_follow_up" && !first(form.invoice_message)) return "Add the follow-up note first.";
  if (action.type === "quote_follow_up" && !first(form.message)) return "Add the quote message first.";
  if (action.type === "client_missing_contact" && !first(form.customer_phone, form.customer_email)) return "Add phone or email first.";
  return "";
}

function Field({ spec, form, setForm }) {
  const [key, label, type] = spec;
  return <label className={type === "textarea" ? "cv-field wide" : "cv-field"}><span>{label}</span>{type === "textarea" ? <textarea value={form[key] || ""} onChange={(e) => setForm((old) => ({ ...old, [key]: e.target.value }))} /> : <input value={form[key] || ""} onChange={(e) => setForm((old) => ({ ...old, [key]: e.target.value }))} />}</label>;
}
function Badge({ children, tone = "dark" }) { return <span className={`cv-badge ${tone}`}>{children}</span>; }
function Metric({ label, value, text }) { return <article className="cv-metric"><b>{label}</b><strong>{value}</strong><span>{text}</span></article>; }
function CommandBox({ box, actions, onOpen }) {
  const firstAction = actions[0];
  return <button type="button" className={`cv-box ${box.tone}`} onClick={() => onOpen(box.key, firstAction || null)}><div><span>{box.label}</span><strong>{box.title}</strong></div><i>{actions.length}</i><p>{box.text}</p><em>{firstAction ? firstAction.title : "All clear. Tap to see what Churvox checks."}</em><small>Open slip</small></button>;
}
function EmptySlip({ box, onClose }) {
  return <section className="cv-slip"><header><div><Badge tone="green">All clear</Badge><h1>{box.title}</h1><p>Churvox checked this area. There is no owner decision waiting right now.</p></div><button onClick={onClose}>Close</button></header><main className="cv-slip-body empty"><section className="cv-panel"><h2>No work waiting.</h2><div className="cv-facts"><div><b>Checked</b><span>{box.text}</span></div><div><b>Prepared</b><span>No approval slip needed.</span></div><div><b>Next</b><span>Open records if you want to add or inspect items.</span></div></div></section><aside className="cv-controls"><Link to={box.href} onClick={onClose}>Open full records</Link><button className="dark" onClick={onClose}>Back to Command</button></aside></main></section>;
}
function ApprovalSlip({ box, action, onClose, onApprove, onDecline, onSave, busy }) {
  const [form, setForm] = React.useState(action.form || {});
  React.useEffect(() => setForm(action.form || {}), [action]);
  const missing = validate(action, form);
  const setup = action.kind === "setup";
  return <section className="cv-slip"><header><div><Badge tone={setup ? "amber" : missing ? "red" : "green"}>{setup ? "Setup needed" : missing ? "Needs fix" : "Ready"}</Badge><h1>{action.title}</h1><p>{setup ? "This is setup work. Churvox is showing what is missing and where to fix it." : "One AI-prepared decision. Edit only what matters, then approve or decline."}</p></div><button onClick={onClose}>Close</button></header><main className="cv-slip-body"><section className="cv-left"><article className="cv-panel decision"><div className="cv-row"><Badge>AI found</Badge>{!setup ? <Badge tone={missing ? "red" : "green"}>{missing || "Ready to approve"}</Badge> : <Badge tone="amber">No fake approval</Badge>}</div><h2>{action.title}</h2><div className="cv-facts"><div><b>Found</b><span>{action.found}</span></div><div><b>Prepared</b><span>{action.prepared}</span></div><div><b>Why</b><span>{action.why}</span></div>{action.facts.map(([k, v]) => <div key={k}><b>{k}</b><span>{v || "Not saved"}</span></div>)}</div></article><article className="cv-panel"><div className="cv-title">Only edit what matters for this slip</div><div className="cv-fields">{action.detailFields.map((field) => <Field key={field[0]} spec={field} form={form} setForm={setForm} />)}</div></article></section><aside className="cv-controls"><div className="cv-title">Owner controls</div><h2>{setup ? "Do this first" : "Approve or decline"}</h2><p>{action.approvalText}</p>{!setup && (missing ? <div className="cv-warn">{missing}</div> : <div className="cv-ok">Ready for owner approval.</div>)}<button className="save" onClick={() => onSave(action, form)} disabled={busy}>Save edit</button>{setup ? <Link className="approve" to={action.href} onClick={onClose}>{action.approveLabel}</Link> : <button className="approve" onClick={() => onApprove(action, form)} disabled={busy || Boolean(missing)}>{busy ? "Approving…" : action.approveLabel}</button>}<button className="decline" onClick={() => onDecline(action)} disabled={busy}>{action.declineLabel}</button><Link to={action.href || box.href} onClick={onClose}>Open full record</Link><button className="dark" onClick={onClose}>Back to Command</button></aside></main></section>;
}
function Slip({ open, actions, onClose, onApprove, onDecline, onSave, busy }) {
  if (!open) return null;
  const box = boxMap[open.box] || boxMap.approvals;
  const action = open.action || actions.find((a) => open.box === "approvals" ? true : a.box === open.box);
  return <div className="cv-slip-overlay-v3">{action ? <ApprovalSlip box={box} action={action} onClose={onClose} onApprove={onApprove} onDecline={onDecline} onSave={onSave} busy={busy} /> : <EmptySlip box={box} onClose={onClose} />}</div>;
}

function Styles() { return <style>{`
.cv-v3{background:radial-gradient(circle at 10% 0%,rgba(249,115,22,.10),transparent 28%),#f6f1e7;color:#0f172a}.cv-hero,.cv-side,.cv-box,.cv-metric{background:#0b1018;color:white;border:1px solid rgba(255,255,255,.10);box-shadow:0 22px 62px rgba(2,6,23,.24)}.cv-hero{border-radius:32px;padding:34px}.cv-hero h1{font-size:clamp(48px,6vw,86px);line-height:.88;letter-spacing:-.08em;font-weight:1000;margin:18px 0 12px}.cv-hero p,.cv-side p{color:#d1d5db;font-weight:800;line-height:1.55}.cv-pill{display:inline-flex;background:rgba(251,146,60,.13);color:#fbbf24;border:1px solid rgba(251,191,36,.28);border-radius:999px;padding:8px 14px;font-size:11px;font-weight:1000;letter-spacing:.2em;text-transform:uppercase}.cv-side{border-radius:32px;padding:24px}.cv-side h2{font-size:38px;line-height:.95;letter-spacing:-.06em;font-weight:1000;margin:10px 0}.cv-button{border-radius:16px;padding:13px 18px;font-weight:1000;text-decoration:none}.cv-button.orange{background:#f59e0b;color:#111827}.cv-button.dark{background:rgba(255,255,255,.08);color:white;border:1px solid rgba(255,255,255,.14)}.cv-metric{border-radius:26px;padding:20px;display:grid;gap:8px}.cv-metric b{color:#fbbf24;text-transform:uppercase;font-size:11px;letter-spacing:.18em}.cv-metric strong{font-size:42px;line-height:.9}.cv-metric span{color:#d1d5db;font-weight:800}.cv-box{position:relative;min-height:240px;border-radius:30px;padding:22px;text-align:left;display:grid;gap:12px;overflow:hidden}.cv-box:before{content:"";position:absolute;left:0;top:0;bottom:0;width:7px;background:#f97316}.cv-box.green:before{background:#22c55e}.cv-box.steel:before{background:#38bdf8}.cv-box.red:before{background:#f43f5e}.cv-box div{display:grid;gap:8px}.cv-box span{color:#fbbf24;text-transform:uppercase;font-size:11px;letter-spacing:.18em;font-weight:1000}.cv-box strong{font-size:26px;line-height:.95;letter-spacing:-.05em}.cv-box i{position:absolute;right:18px;top:18px;font-style:normal;background:rgba(255,255,255,.10);border-radius:999px;padding:6px 10px;font-weight:1000}.cv-box p{color:#d1d5db;font-weight:800;line-height:1.45}.cv-box em{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.10);border-radius:18px;padding:13px;color:#f8fafc;font-style:normal;font-weight:900;line-height:1.4}.cv-box small{justify-self:start;background:#fbbf24;color:#111827;border-radius:15px;padding:10px 14px;font-weight:1000}.cv-slip-overlay-v3{position:fixed;inset:0;z-index:2147483647;background:rgba(2,6,23,.86);backdrop-filter:blur(10px);padding:16px 20px 16px 286px;display:flex;align-items:stretch;justify-content:center;overflow:hidden}.cv-slip{width:min(1580px,calc(100vw - 320px));max-height:calc(100vh - 32px);background:#f6f1e7;border-radius:34px;overflow:hidden;display:grid;grid-template-rows:auto minmax(0,1fr);box-shadow:0 38px 120px rgba(2,6,23,.46)}.cv-slip header{background:linear-gradient(135deg,#121823,#090d14 62%,#17110d);border-left:8px solid #f97316;color:white;padding:24px 30px;display:flex;justify-content:space-between;gap:16px}.cv-slip header h1{font-size:clamp(42px,4.6vw,76px);line-height:.88;letter-spacing:-.075em;font-weight:1000;margin:10px 0 6px}.cv-slip header p{margin:0;color:#e5e7eb;font-weight:850;line-height:1.45}.cv-slip header button{background:white;color:#111827;border:0;border-radius:16px;padding:12px 18px;font-weight:1000;height:max-content}.cv-slip-body{min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:16px;padding:16px;overflow:hidden}.cv-left{min-height:0;overflow-y:auto;display:grid;grid-template-columns:minmax(340px,.9fr) minmax(430px,1.1fr);gap:14px;align-content:start}.cv-panel,.cv-controls{background:#fffdf7;border:1px solid rgba(15,23,42,.13);border-radius:26px;padding:18px;color:#0f172a;box-shadow:0 14px 38px rgba(15,23,42,.10)}.cv-row{display:flex;gap:8px;flex-wrap:wrap}.cv-badge{display:inline-flex;border-radius:999px;padding:6px 10px;font-size:11px;font-weight:1000;letter-spacing:.14em;text-transform:uppercase;background:#111827;color:white}.cv-badge.green{background:#dcfce7;color:#065f46}.cv-badge.red{background:#fee2e2;color:#991b1b}.cv-badge.amber{background:#fef3c7;color:#92400e}.cv-panel h2,.cv-controls h2{font-size:34px;line-height:.95;letter-spacing:-.06em;font-weight:1000;margin:14px 0;color:#111827}.cv-facts{display:grid;gap:10px}.cv-facts div{background:#f8f3ea;border:1px solid rgba(15,23,42,.11);border-radius:18px;padding:13px}.cv-facts b,.cv-title,.cv-field span{display:block;color:#9a3412;text-transform:uppercase;letter-spacing:.14em;font-size:11px;font-weight:1000;margin-bottom:6px}.cv-facts span,.cv-controls p{color:#273447;font-size:15px;line-height:1.45;font-weight:850}.cv-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.cv-field.wide{grid-column:1/-1}.cv-field input,.cv-field textarea{width:100%;background:#fff;color:#111827;-webkit-text-fill-color:#111827;border:1px solid rgba(15,23,42,.16);border-radius:16px;padding:12px 14px;font-size:15px;font-weight:900;outline:none}.cv-field textarea{min-height:94px;resize:vertical}.cv-controls{align-self:start;position:sticky;top:0;display:grid;gap:10px}.cv-controls button,.cv-controls a{display:block;width:100%;min-height:48px;border-radius:16px;border:0;padding:13px 15px;text-align:center;text-decoration:none;font-size:15px;font-weight:1000}.cv-controls .save{background:#fff7ed;color:#9a3412;border:1px solid #fed7aa}.cv-controls .approve{background:#22c55e;color:#052e16}.cv-controls .approve:disabled{opacity:.55}.cv-controls .decline{background:#fee2e2;color:#991b1b}.cv-controls a:not(.approve){background:white;color:#111827;border:1px solid #e2e8f0}.cv-controls .dark{background:#111827;color:white}.cv-warn,.cv-ok{border-radius:16px;padding:12px 14px;font-weight:1000;line-height:1.45}.cv-warn{background:#fee2e2;color:#991b1b}.cv-ok{background:#dcfce7;color:#065f46}.empty{grid-template-columns:minmax(0,1fr) 320px}.empty .cv-panel{min-height:260px}@media(max-width:1200px){.cv-slip-overlay-v3{padding:12px}.cv-slip{width:100%}.cv-slip-body,.empty{grid-template-columns:1fr;overflow-y:auto}.cv-left{grid-template-columns:1fr;overflow:visible}.cv-controls{position:static}}@media(max-width:760px){.cv-slip header h1{font-size:38px}.cv-fields{grid-template-columns:1fr}.cv-field.wide{grid-column:auto}}
  `}</style>; }

export default function CommandDeskOperatorPageV3() {
  const { get, post, patch } = useApi();
  const [data, setData] = React.useState({ jobs: [], invoices: [], quotes: [], clients: [], workers: [] });
  const [actions, setActions] = React.useState([]);
  const [ignored, setIgnored] = React.useState([]);
  const [open, setOpen] = React.useState(null);
  const [busy, setBusy] = React.useState(false);

  const refresh = React.useCallback(async () => {
    setBusy(true);
    try {
      const [jobsRes, invoicesRes, quotesRes, clientsRes, workersRes] = await Promise.allSettled([get("/jobs"), get("/invoices"), get("/quotes"), get("/clients"), get("/team/workers")]);
      const next = { jobs: jobsRes.status === "fulfilled" ? listFrom(jobsRes.value, ["jobs"]) : [], invoices: invoicesRes.status === "fulfilled" ? listFrom(invoicesRes.value, ["invoices"]) : [], quotes: quotesRes.status === "fulfilled" ? listFrom(quotesRes.value, ["quotes"]) : [], clients: clientsRes.status === "fulfilled" ? listFrom(clientsRes.value, ["clients", "customers"]) : [], workers: workersRes.status === "fulfilled" ? listFrom(workersRes.value, ["workers", "team", "users"]) : [] };
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
      if (action.type === "assign_job") res = await post(`/jobs/${encodeURIComponent(form.job_id)}/assign`, { worker_id: form.worker_id, worker_name: form.worker_name, dispatch_note: form.dispatch_note });
      if (["draft_invoice", "missing_price_invoice"].includes(action.type)) res = await post("/invoices", { job_id: form.job_id, client_id: form.client_id || undefined, customer_name: form.client_name, customer_email: form.customer_email || undefined, subtotal: money(form.job_price), description: form.invoice_description });
      if (action.type === "send_invoice") res = await patch(`/invoices/${encodeURIComponent(form.invoice_id)}`, { status: "sent", amount: money(form.amount), due_date: form.due_date, notes: form.invoice_message });
      if (action.type === "invoice_follow_up") res = await patch(`/invoices/${encodeURIComponent(form.invoice_id)}`, { notes: appendNote(form.internal_note, "Follow-up prepared", form.invoice_message) });
      if (action.type === "quote_follow_up") res = await patch(`/quotes/${encodeURIComponent(form.quote_id)}`, { notes: appendNote(form.internal_note, "Follow-up prepared", form.message) });
      if (action.type === "quote_convert") res = await post(`/quotes/${encodeURIComponent(form.quote_id)}/convert`, {});
      if (action.type === "client_missing_contact") res = await patch(`/clients/${encodeURIComponent(form.client_id)}`, { name: form.client_name, phone: form.customer_phone, email: form.customer_email, notes: form.client_note });
      if (action.type === "worker_completion_review") res = await patch(`/jobs/${encodeURIComponent(form.job_id)}`, { owner_note: form.owner_note, worker_reviewed: true });
      if (!res?.success) throw new Error(res?.error || "Approval failed");
      toast.success("Approved and applied");
      setOpen(null);
      await refresh();
    } catch (e) { toast.error(e?.message || "Approval failed"); }
    finally { setBusy(false); }
  }
  async function save(action, form) {
    if (action.kind === "setup") return toast.success("Saved in this setup slip. Open the full area when ready.");
    try {
      let res = { success: true };
      if (form.job_id) res = await patch(`/jobs/${encodeURIComponent(form.job_id)}`, { ...form });
      if (form.invoice_id) res = await patch(`/invoices/${encodeURIComponent(form.invoice_id)}`, { ...form });
      if (form.quote_id) res = await patch(`/quotes/${encodeURIComponent(form.quote_id)}`, { ...form });
      if (form.client_id) res = await patch(`/clients/${encodeURIComponent(form.client_id)}`, { name: form.client_name, phone: form.customer_phone, email: form.customer_email, notes: form.client_note });
      if (!res?.success) throw new Error(res?.error || "Save failed");
      toast.success("Edits saved");
      await refresh();
    } catch (e) { toast.error(e?.message || "Could not save edits"); }
  }
  function decline(action) {
    setIgnored((old) => Array.from(new Set([...old, action.id])));
    setOpen(null);
    toast.success(action.kind === "setup" ? "Ignored for now" : "Declined and removed from this Command view");
  }

  const live = actions.filter((a) => !ignored.includes(a.id));
  const actionsFor = (box) => box === "approvals" ? live.filter((a) => a.kind === "approval") : live.filter((a) => a.box === box);
  const next = live.find((a) => a.kind === "approval") || live[0];

  return <main className="cv-v3 fixed inset-0 z-[2147483000] overflow-y-auto" data-industrial-simple-page="command" data-command-canvas data-marker="CHURVOX_COMMAND_V3_APPROVAL_DESK"><Styles /><section className="mx-auto max-w-7xl p-4 pb-28 md:p-6 xl:p-8"><section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]"><section className="cv-hero"><span className="cv-pill">AI approval desk</span><h1>Churvox did the admin. You approve.</h1><p>Each box opens one clear AI-prepared slip: what Churvox found, what it prepared, why, the few details that matter, and the owner buttons.</p><div className="mt-6 flex flex-wrap gap-3"><button className="cv-button orange" onClick={refresh} disabled={busy}>{busy ? "Checking…" : "Refresh AI work"}</button>{next ? <button className="cv-button dark" onClick={() => setOpen({ box: next.box, action: next })}>Open next slip</button> : null}<Link className="cv-button dark" to="/jobs/new">Add job</Link></div></section><aside className="cv-side"><span className="cv-pill">Right now</span><h2>{live.filter((a) => a.kind === "approval").length} approvals</h2><p>{next ? `${next.title}. ${next.prepared}` : "No approval waiting. Command still shows setup checks."}</p></aside></section><section className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4"><Metric label="Jobs" value={data.jobs.length} text="Jobs checked" /><Metric label="Invoices" value={data.invoices.length} text="Invoices checked" /><Metric label="Quotes" value={data.quotes.length} text="Quotes checked" /><Metric label="Slips" value={live.length} text="Prepared or setup" /></section><section className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{BOXES.map((box) => <CommandBox key={box.key} box={box} actions={actionsFor(box.key)} onOpen={(boxKey, action) => setOpen({ box: boxKey, action })} />)}</section></section><Slip open={open} actions={live} onClose={() => setOpen(null)} onApprove={approve} onDecline={decline} onSave={save} busy={busy} /></main>;
}
