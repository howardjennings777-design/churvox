import React from "react";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";

const STORE_KEY = "churvox_ai_approval_actions_backup_v4";

const INVOICE_DELIVERY_OPTIONS = [
  "Churvox internal",
  "Xero",
  "Draft only",
  "Manual external",
  "MYOB staged/later (inactive)",
];

const SLIPS = [
  {
    key: "money",
    title: "Money",
    card: "Invoice drafts, Xero staging, follow-ups and payment reviews.",
    formTitle: "Invoice approval",
    actionKey: "approve_money_action",
    recordType: "invoice",
    recordLabel: "Invoice / job",
    notifyOptions: ["Internal only", "Notify owner only", "No notification"],
    found: "A money item needs approval before it is sent, staged, followed up, or marked reviewed.",
    prepared: "Amount, due date, customer wording, delivery method and accounting status are ready.",
    why: "Money actions must be checked before a customer sees anything or Xero receives anything.",
    risk: "No silent email, no fake Xero sync, and MYOB stays staged/later only.",
    after: "The invoice is handled only by the selected delivery method.",
    approveLabel: "Approve invoice delivery",
    fields: [
      ["moneyAction", "Money action", "select", ["Draft invoice", "Approve invoice", "Payment follow-up", "Mark paid reviewed", "Accounting review"]],
      ["deliveryMethod", "Invoice delivery method", "select", INVOICE_DELIVERY_OPTIONS],
      ["invoiceType", "Invoice type", "select", ["Job invoice", "Deposit invoice", "Extras", "Time-based", "Adjustment"]],
      ["paymentLinkStatus", "Payment link", "select", ["Not included", "Included", "Coming soon", "Needs setup"]],
      ["client", "Client"],
      ["clientEmail", "Client email"],
      ["invoiceRef", "Invoice / job reference"],
      ["amount", "Amount"],
      ["paymentStatus", "Payment status", "select", ["Unpaid", "Part paid", "Paid", "Overdue", "Needs check"]],
      ["gstStatus", "GST status", "select", ["GST included", "GST excluded", "No GST", "Needs check"]],
      ["dueDate", "Due date"],
      ["accountingStatus", "Accounting status", "select", ["Not synced", "Xero staged", "Waiting for Xero connection", "Draft only - nothing sent", "Manual external - nothing sent", "MYOB later - inactive", "Needs review"]],
      ["customerMessage", "Invoice wording", "textarea"],
      ["internalNote", "Internal money note", "textarea"],
    ],
  },
  {
    key: "crew",
    title: "Crew dispatch",
    card: "Recommended worker, schedule and dispatch note.",
    formTitle: "Crew assignment",
    actionKey: "assign_worker_to_job",
    recordType: "job",
    recordLabel: "Job",
    notifyOptions: ["Internal only", "Notify worker", "Notify worker and owner"],
    found: "A job needs a worker, schedule, or clearer field instructions.",
    prepared: "Worker recommendation, backup option, travel/workload reason and dispatch note.",
    why: "The owner should know why the worker is recommended before assigning the job.",
    risk: "Check conflicts, workload and site area before approval.",
    after: "The worker is assigned and the field note is ready.",
    approveLabel: "Approve assignment",
    fields: [["jobName", "Job to assign"], ["clientSite", "Client / site"], ["jobAddress", "Job address"], ["recommendedWorker", "Recommended worker"], ["matchReason", "Why this worker", "textarea"], ["backupWorker", "Backup worker"], ["schedule", "Scheduled date/time"], ["conflictWarning", "Conflict / warning", "textarea"], ["dispatchNote", "Worker dispatch note", "textarea"]],
  },
  {
    key: "jobs",
    title: "Jobs needing info",
    card: "Missing job details before dispatch, reminders or invoices move.",
    formTitle: "Job blocker fix",
    actionKey: "fix_job_blocker",
    recordType: "job",
    recordLabel: "Job",
    notifyOptions: ["Internal only", "Notify assigned worker", "Notify owner"],
    found: "A job is missing information or has a blocker.",
    prepared: "Missing fields, pricing context, worker notes and owner-only notes.",
    why: "Clean job details feed dispatch, reminders, invoices and payroll.",
    risk: "Owner-only pricing and notes must not show to workers.",
    after: "The job becomes ready for scheduling, assignment or invoice preparation.",
    approveLabel: "Save job fix",
    fields: [["jobTitle", "Job title"], ["client", "Client"], ["address", "Job address"], ["jobType", "Job type / trade"], ["priority", "Priority", "select", ["Normal", "High", "Urgent"]], ["repeatType", "Recurring", "select", ["One-off", "Weekly", "Fortnightly", "Monthly", "Custom"]], ["assignedWorker", "Assigned worker"], ["pricingType", "Pricing type", "select", ["Fixed price", "Hourly", "Fixed + extras", "Hourly + extras", "Needs price"]], ["price", "Price / rate"], ["missingChecklist", "Missing info checklist", "textarea"], ["workerInstructions", "Worker-visible instructions", "textarea"], ["ownerOnlyNote", "Owner-only note", "textarea"]],
  },
  {
    key: "quotes",
    title: "Quotes",
    card: "Quote follow-ups, revisions and quote-to-job actions.",
    formTitle: "Quote action",
    actionKey: "approve_quote_action",
    recordType: "quote",
    recordLabel: "Quote",
    notifyOptions: ["Internal only", "Notify customer after approval", "Convert without notifying"],
    found: "A quote needs follow-up, revision, expiry review or conversion.",
    prepared: "Quote value, scope, assumptions and customer message.",
    why: "Quotes should not sit untouched when they can become work.",
    risk: "Check scope, exclusions, expiry and contact details before sending.",
    after: "The quote action is saved, followed up, revised or ready to convert.",
    approveLabel: "Approve quote action",
    fields: [["quoteAction", "Quote action", "select", ["Follow up quote", "Convert accepted quote", "Revise quote", "Archive quote"]], ["client", "Client"], ["clientEmail", "Client email"], ["quoteRef", "Quote title / number"], ["quoteStatus", "Quote status", "select", ["Draft", "Sent", "Accepted", "Declined", "Expired"]], ["quoteValue", "Quote value"], ["validUntil", "Valid until"], ["scope", "Scope of work", "textarea"], ["message", "Customer follow-up message", "textarea"]],
  },
  {
    key: "clients",
    title: "Clients",
    card: "Client contact fixes and next customer action.",
    formTitle: "Client record fix",
    actionKey: "fix_client_record",
    recordType: "client",
    recordLabel: "Client",
    notifyOptions: ["Internal only", "No notification", "Notify owner"],
    found: "A client record needs details before jobs, quotes, invoices or reminders work.",
    prepared: "Contact details, site notes, billing contact and next action.",
    why: "Clean client data stops failed reminders and invoice issues.",
    risk: "Missing phone/email can block reminders and follow-ups.",
    after: "The client record is ready for job, quote and invoice workflows.",
    approveLabel: "Save client fix",
    fields: [["clientName", "Client name"], ["phone", "Phone"], ["email", "Email"], ["preferredContact", "Preferred contact", "select", ["Phone", "Email", "SMS later", "No preference"]], ["serviceAddress", "Service address"], ["siteNotes", "Property / access notes", "textarea"], ["clientNote", "Client note", "textarea"]],
  },
  {
    key: "setup",
    title: "Setup blockers",
    card: "Setup fixes that unblock launch or customer use.",
    formTitle: "Setup blocker fix",
    actionKey: "fix_setup_blocker",
    recordType: "setup_item",
    recordLabel: "Setup item",
    notifyOptions: ["Internal only", "Notify owner", "Ignore for now"],
    found: "A setup item is missing or unfinished.",
    prepared: "The missing item, required value, prepared fix and owner note.",
    why: "Setup blockers should be clear, not hidden in random settings pages.",
    risk: "Some setup items can block signups, billing, support, legal links or customer trust.",
    after: "The setup item is saved, left for later, or ignored for now.",
    approveLabel: "Save setup fix",
    fields: [["setupArea", "Setup area", "select", ["Business profile", "Branding", "Team", "Plans/billing", "Legal links", "Accounting", "Notifications", "PWA install"]], ["missingThing", "What is missing"], ["launchImpact", "Why it blocks launch", "textarea"], ["preparedTask", "Prepared setup task"], ["requiredValue", "Required value"], ["setupStatus", "Setup status", "select", ["Not started", "Needs owner input", "Ready to save", "Done", "Ignore for now"]], ["ownerNote", "Owner setup note", "textarea"]],
  },
];

function logicFields(slip) {
  return [["recordId", `${slip.recordLabel} ID`], ["notifyMode", "Notify mode", "select", slip.notifyOptions], ["afterApprovalOverride", "After approval override", "textarea"], ["ownerAuditNote", "Owner audit note", "textarea"]];
}

function blank(slip) {
  const out = { actionKey: slip.actionKey, recordType: slip.recordType };
  [...logicFields(slip), ...slip.fields].forEach(([key, label, type, options]) => { out[key] = type === "select" ? options[0] : ""; });
  return out;
}

function readBackup() { try { return JSON.parse(localStorage.getItem(STORE_KEY) || "[]"); } catch { return []; } }
function writeBackup(items) { localStorage.setItem(STORE_KEY, JSON.stringify(items.slice(0, 80))); }
function backupAction(action) { const next = [{ ...action, id: action.id || `local_${Date.now()}`, updated_at: new Date().toISOString(), backup: true }, ...readBackup()].slice(0, 80); writeBackup(next); return next[0]; }
function actionId(action) { return action?.id || action?._id || action?.action_id || ""; }
function normaliseActions(res) { const data = res?.data || res || {}; return Array.isArray(data.actions) ? data.actions : Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : []; }
function makePayload(slip, form, status) { return { status, slipKey: slip.key, title: slip.title, actionKey: slip.actionKey, recordType: slip.recordType, recordId: form.recordId || form.jobId || form.quoteId || form.invoiceId || form.clientId || "", notifyMode: form.notifyMode || "Internal only", afterApproval: form.afterApprovalOverride || slip.after, ownerAuditNote: form.ownerAuditNote || "", form, createdAt: new Date().toISOString() }; }

function deliveryDetails(method) {
  const key = String(method || "").toLowerCase();
  if (key.includes("xero")) return ["Xero staged", "Owner approves it here. If Xero is connected it enters the Xero queue as prepared. If not connected it waits for Xero connection."];
  if (key.includes("myob")) return ["MYOB later only", "Staged for MYOB later. Nothing is sent, synced, or described as active MYOB delivery."];
  if (key.includes("manual") || key.includes("external")) return ["Manual external", "Marked as handled outside Churvox. Churvox sends nothing and stages nothing."];
  if (key.includes("draft")) return ["Draft only", "Approved as a draft only. Nothing is sent, emailed, or synced."];
  return ["Churvox internal", "Approved for Churvox internal handling. No customer email is sent silently from this button."];
}

function invoiceApprovalPayload(form) {
  return { invoice_id: form.recordId || form.invoiceId || "", customer_name: form.client, customer_email: form.clientEmail, job_reference: form.invoiceRef, invoice_type: form.invoiceType, deliveryMethod: form.deliveryMethod, subtotal: form.amount, gst_status: form.gstStatus, payment_link_status: form.paymentLinkStatus, due_date: form.dueDate, description: form.customerMessage, notes: form.internalNote };
}

function Field({ field, form, setForm }) {
  const [key, label, type, options = []] = field;
  const update = (value) => setForm({ ...form, [key]: value });
  return <label className={type === "textarea" ? "cxField wide" : "cxField"}><span>{label}</span>{type === "textarea" ? <textarea value={form[key] || ""} onChange={(e) => update(e.target.value)} /> : type === "select" ? <select value={form[key] || options[0]} onChange={(e) => update(e.target.value)}>{options.map((o) => <option key={o} value={o}>{o}</option>)}</select> : <input value={form[key] || ""} onChange={(e) => update(e.target.value)} />}</label>;
}

function ContextCard({ label, children, tone = "dark" }) { return <div className={`cxContextCard ${tone}`}><b>{label}</b><span>{children}</span></div>; }
function CommandBox({ slip, onOpen }) { return <button className="cxBox" onClick={() => onOpen(slip)}><b>{slip.title}</b><strong>{slip.formTitle}</strong><p>{slip.card}</p><em>Open action</em></button>; }
function MoneyDeliverySummary({ form }) { const [title, text] = deliveryDetails(form.deliveryMethod); return <section className="cxDeliverySummary"><b>{title}</b><span>{text}</span></section>; }

function Slip({ api, slip, onClose, reload }) {
  const [form, setForm] = React.useState(blank(slip));
  const [msg, setMsg] = React.useState("Ready to edit and approve inside this Command slip.");
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => { setForm(blank(slip)); setMsg("Ready to edit and approve inside this Command slip."); }, [slip.key]);
  const routingFields = logicFields(slip);

  async function save() {
    setBusy(true);
    const payload = makePayload(slip, form, "pending");
    try {
      const res = await api.post("/ai/actions", payload);
      if (res?.success === false) throw new Error(res.error || "Backend action save failed");
      setMsg("Prepared action saved to backend approval queue.");
      toast.success("Prepared action saved");
      reload();
    } catch {
      backupAction(payload);
      setMsg("Backend was not ready, so this was saved in the local backup queue.");
      toast.error("Saved locally");
      reload();
    } finally { setBusy(false); }
  }

  async function approve() {
    setBusy(true);
    try {
      if (slip.key === "money") {
        const res = await api.post("/logic/invoice-approval", invoiceApprovalPayload(form), { timeout: 25000 });
        if (res?.success === false || res?.data?.success === false) throw new Error(res?.error || res?.data?.error || "Invoice delivery approval failed");
        const message = res?.data?.message || "Invoice delivery approved.";
        setMsg(message);
        toast.success(message);
        reload();
        return;
      }
      const payload = makePayload(slip, form, "pending");
      const create = await api.post("/ai/actions", payload);
      if (create?.success === false) throw new Error(create.error || "Could not create backend action");
      const created = create?.data?.action || create?.data?.data || create?.data || {};
      const id = actionId(created);
      if (!id) throw new Error("Backend did not return action ID");
      const approved = await api.post(`/ai/actions/${encodeURIComponent(id)}/approve`, {});
      if (approved?.success === false) throw new Error(approved.error || "Approval failed");
      setMsg(`${slip.title} approved through backend action queue.`);
      toast.success(`${slip.title} approved`);
      reload();
    } catch (err) {
      const payload = makePayload(slip, form, "failed");
      backupAction({ ...payload, result: { error: err?.message || "Approval failed" } });
      setMsg(err?.message || "Approval failed. Saved locally.");
      toast.error(err?.message || "Approval failed");
      reload();
    } finally { setBusy(false); }
  }

  async function decline() {
    setBusy(true);
    const payload = makePayload(slip, form, "declined");
    try {
      const create = await api.post("/ai/actions", payload);
      const id = actionId(create?.data?.action || create?.data || {});
      if (id) await api.post(`/ai/actions/${encodeURIComponent(id)}/decline`, { note: form.ownerAuditNote || "Declined from Command" });
      toast.success(`${slip.title} declined`);
      reload();
      onClose();
    } catch {
      backupAction(payload);
      toast.error("Backend decline unavailable — saved locally");
      reload();
      onClose();
    } finally { setBusy(false); }
  }

  return <div className="cxOverlay"><section className="cxSlip"><header><div><small>COMMAND / {slip.title}</small><h1>{slip.title}</h1><p>{slip.formTitle} — {slip.card}</p></div><button onClick={onClose}>Close</button></header><main><section className="cxFormPanel"><div className="cxFormTop"><span>{slip.formTitle}</span></div><div className="cxLogicStrip"><i>Action: {slip.actionKey}</i><i>Record: {slip.recordType}</i><i>{slip.key === "money" ? "Invoice delivery logic" : "Approval queue"}</i></div>{slip.key === "money" ? <MoneyDeliverySummary form={form} /> : null}<div className="cxContextGrid"><ContextCard label="AI found">{slip.found}</ContextCard><ContextCard label="AI prepared">{slip.prepared}</ContextCard><ContextCard label="Why">{slip.why}</ContextCard><ContextCard label="Risk" tone="warn">{slip.risk}</ContextCard><ContextCard label="After approval" tone="ok">{form.afterApprovalOverride || slip.after}</ContextCard></div><div className="cxSectionLabel">Logic-ready details</div><div className="cxFields cxRoutingFields">{routingFields.map((field) => <Field key={field[0]} field={field} form={form} setForm={setForm} />)}</div><div className="cxSectionLabel">Prepared action form</div><div className="cxFields">{slip.fields.map((field) => <Field key={field[0]} field={field} form={form} setForm={setForm} />)}</div></section><aside className="cxControls"><h2>Owner controls</h2><p>{msg}</p>{slip.key === "money" ? <div className="cxMiniDelivery"><b>Selected delivery</b><span>{form.deliveryMethod}</span><em>{deliveryDetails(form.deliveryMethod)[1]}</em></div> : null}<button disabled={busy} className="save" onClick={save}>Save prepared action</button><button disabled={busy} className="approve" onClick={approve}>{busy ? "Approving..." : slip.approveLabel}</button><button disabled={busy} className="decline" onClick={decline}>Decline</button><button className="dark" onClick={onClose}>Back to Command</button></aside></main></section></div>;
}

function Queue({ actions, backendReady, reload }) {
  return <section className="cxQueue"><div><span>{backendReady ? "Backend approval queue" : "Local backup queue"}</span><h2>{actions.length} prepared actions</h2><p>Saved and approved actions show here so the owner can see what Churvox prepared.</p></div>{actions.length ? <div className="cxQueueRows">{actions.slice(0, 8).map((a) => <article key={actionId(a) || a.id || `${a.title}-${a.created_at}`}><b>{a.title}</b><strong>{a.status || "pending"}</strong><p>{a.actionKey || a.action_key} · {a.recordType || a.record_type} · {a.recordId || a.record_id || "No record ID yet"}</p></article>)}</div> : <p className="cxEmpty">No prepared actions yet. Open a Command box, review the form, then save or approve it.</p>}<button onClick={reload}>Refresh queue</button></section>;
}

function Style() { return <style>{`
.cxRoot,.cxRoot *{box-sizing:border-box;color-scheme:light;text-shadow:none}.cxRoot{position:relative;z-index:1;min-height:100svh;width:100%;max-width:100vw;overflow-x:hidden;background:#f6f1e7;color:#111827;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:14px 14px 112px}.cxWrap{width:min(1180px,100%);margin:0 auto}.cxHero,.cxQueue{background:#0b1018;color:#fff;border-radius:28px;padding:22px;border-left:8px solid #f97316;box-shadow:0 18px 52px rgba(2,6,23,.22)}.cxPill,.cxQueue span{display:inline-flex;border-radius:999px;padding:8px 12px;background:#fff7ed;color:#7c2d12;font-size:10px;font-weight:1000;letter-spacing:.14em;text-transform:uppercase}.cxHero h1{margin:16px 0 10px;font-size:clamp(38px,10vw,76px);line-height:.9;letter-spacing:-.06em;color:#fff;max-width:900px}.cxHero p,.cxQueue p{margin:0;color:#f8fafc;font-weight:900;line-height:1.55;max-width:850px}.cxBoxes{display:grid;grid-template-columns:1fr;gap:14px;margin-top:14px}.cxBox{width:100%;background:#0b1018;color:#fff;border:1px solid rgba(255,255,255,.14);border-left:8px solid #f97316;border-radius:24px;padding:18px;text-align:left;min-height:0;display:grid;gap:9px;cursor:pointer;box-shadow:0 16px 44px rgba(2,6,23,.20)}.cxBox b{font-size:clamp(24px,6vw,34px);line-height:.95;color:#fff}.cxBox strong{color:#fbbf24;text-transform:uppercase;font-size:10px;letter-spacing:.12em;font-weight:1000}.cxBox p{color:#f1f5f9;font-weight:900;line-height:1.4;margin:0}.cxBox em{font-style:normal;justify-self:start;border-radius:999px;background:linear-gradient(135deg,#facc15,#fb923c 55%,#22d3ee);color:#111827;padding:10px 14px;font-weight:1000}.cxQueue{margin-top:14px}.cxQueue h2{margin:10px 0 8px;color:#fff;font-size:clamp(26px,6vw,42px);line-height:.95}.cxQueueRows{display:grid;grid-template-columns:1fr;gap:10px;margin-top:14px}.cxQueueRows article{background:#fffaf0;color:#111827;border-radius:18px;padding:14px;border-left:5px solid #f97316}.cxQueueRows b,.cxQueueRows strong{display:block}.cxQueueRows strong{color:#15803d;text-transform:uppercase;font-size:11px;margin-top:5px}.cxQueueRows p{color:#475569;font-size:12px;margin:6px 0 0}.cxQueue button{margin-top:14px;border:0;border-radius:14px;background:#ffedd5;color:#7c2d12;padding:12px 14px;font-weight:1000}.cxEmpty{background:#111827;border-radius:18px;padding:14px}.cxOverlay{position:fixed;inset:0;z-index:2147483647;background:rgba(2,6,23,.88);padding:10px;display:flex;align-items:stretch;overflow:hidden}.cxSlip{width:100%;max-width:1180px;margin:auto;background:#f7efe3;border-radius:24px;overflow:hidden;display:grid;grid-template-rows:auto 1fr;box-shadow:0 32px 110px rgba(2,6,23,.55);max-height:calc(100svh - 20px)}.cxSlip header{background:#0b1018;color:#fff;border-left:8px solid #f97316;padding:18px;display:grid;grid-template-columns:1fr;gap:12px}.cxSlip header small{color:#fed7aa;font-weight:1000;letter-spacing:.14em}.cxSlip header h1{font-size:clamp(30px,9vw,54px);line-height:.94;margin:8px 0;color:#fff;letter-spacing:-.045em}.cxSlip header p{font-weight:900;color:#f8fafc;margin:0}.cxSlip header button{justify-self:start;border:0;border-radius:15px;padding:12px 18px;font-weight:1000;background:#fff;color:#111827}.cxSlip main{min-height:0;display:grid;grid-template-columns:1fr;gap:12px;padding:12px;overflow:auto}.cxFormPanel,.cxControls{background:#fffaf0;border:1px solid rgba(15,23,42,.20);border-radius:22px;padding:16px;box-shadow:0 10px 28px rgba(15,23,42,.10);color:#111827}.cxFormTop{display:flex;align-items:center;margin-bottom:10px}.cxFormTop span{display:inline-flex;background:#111827;color:#fbbf24;border-radius:999px;padding:7px 12px;text-transform:uppercase;letter-spacing:.12em;font-size:10px;font-weight:1000}.cxLogicStrip{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 14px}.cxLogicStrip i{font-style:normal;border-radius:999px;background:#fff7ed;color:#7c2d12;border:1px solid #fed7aa;padding:7px 10px;font-size:10px;font-weight:1000;letter-spacing:.06em;text-transform:uppercase}.cxDeliverySummary,.cxMiniDelivery{background:#0b1018;color:#fff;border-left:7px solid #f97316;border-radius:20px;padding:14px;margin-bottom:14px;display:grid;gap:7px}.cxMiniDelivery{border-left-width:5px;margin:0}.cxDeliverySummary b,.cxMiniDelivery b{color:#fbbf24;text-transform:uppercase;letter-spacing:.12em;font-size:10px}.cxDeliverySummary span,.cxMiniDelivery span,.cxMiniDelivery em{color:#f8fafc;font-style:normal;font-weight:900;line-height:1.4}.cxContextGrid{display:grid;grid-template-columns:1fr;gap:10px;margin-bottom:14px}.cxContextCard{border-radius:16px;background:#111827;color:#fff;padding:12px;border-left:5px solid #f97316}.cxContextCard.warn{background:#451a03;border-left-color:#f59e0b}.cxContextCard.ok{background:#052e16;border-left-color:#22c55e}.cxContextCard b{display:block;color:#fbbf24;text-transform:uppercase;letter-spacing:.12em;font-size:10px;font-weight:1000;margin-bottom:6px}.cxContextCard span{display:block;color:#f8fafc;font-size:13px;font-weight:900;line-height:1.42}.cxSectionLabel{margin:14px 0 8px;color:#431407;text-transform:uppercase;letter-spacing:.13em;font-size:11px;font-weight:1000}.cxFields{display:grid;grid-template-columns:1fr;gap:12px}.cxField span{display:block;color:#431407;text-transform:uppercase;letter-spacing:.10em;font-size:11px;font-weight:1000;margin-bottom:7px}.cxField input,.cxField textarea,.cxField select{width:100%;border:2px solid #d6b98f;border-radius:16px;padding:13px 15px;font-size:16px;font-weight:900;background:#fffdf7!important;color:#0f172a!important;-webkit-text-fill-color:#0f172a!important;outline:none;box-shadow:inset 0 0 0 9999px #fffdf7!important}.cxField textarea{min-height:104px;resize:vertical}.cxControls{display:grid;gap:10px}.cxControls h2{font-size:clamp(26px,7vw,34px);line-height:.95;margin:0;color:#111827}.cxControls p{background:#14532d;color:#fff;border-radius:16px;padding:12px 14px;font-weight:1000;line-height:1.45;margin:0}.cxControls button{width:100%;border:0;border-radius:16px;padding:14px;font-weight:1000;font-size:16px;cursor:pointer}.cxControls .save{background:#ffedd5;color:#7c2d12;border:2px solid #fed7aa}.cxControls .approve{background:#16a34a;color:#052e16;border:2px solid #15803d}.cxControls .decline{background:#fecaca;color:#7f1d1d;border:2px solid #fca5a5}.cxControls .dark{background:#111827;color:#fff}
@media (min-width:700px){.cxRoot{padding:20px 20px 120px}.cxBoxes{grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.cxFields,.cxContextGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.cxField.wide,.cxContextCard.ok{grid-column:1/-1}.cxQueueRows{grid-template-columns:repeat(2,minmax(0,1fr))}.cxSlip header{grid-template-columns:1fr auto}.cxSlip header button{justify-self:end}.cxSlip main{padding:16px;gap:16px}}
@media (min-width:1024px){.cxRoot{padding:24px 24px 130px 310px}.cxBoxes{grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}.cxQueueRows{grid-template-columns:repeat(4,minmax(0,1fr))}.cxSlip main{grid-template-columns:minmax(0,1fr)330px}.cxControls{position:sticky;top:0;align-self:start}.cxOverlay{padding:18px 18px 18px 306px}.cxHero,.cxQueue{border-radius:34px;padding:30px}.cxBox{border-radius:28px;padding:22px;min-height:210px}}
@media (max-width:420px){.cxRoot{padding:10px 10px 104px}.cxHero,.cxQueue{border-radius:24px;padding:18px}.cxBox{border-radius:22px;padding:16px}.cxSlip{border-radius:20px}.cxSlip header,.cxFormPanel,.cxControls{padding:14px}}
`}</style>; }

export default function CommandDeskOperatorPageV6() {
  const api = useApi();
  const [open, setOpen] = React.useState(null);
  const [actions, setActions] = React.useState([]);
  const [backendReady, setBackendReady] = React.useState(true);

  async function reload() {
    try {
      const res = await api.get("/ai/actions", { timeout: 12000 });
      setActions(normaliseActions(res));
      setBackendReady(true);
    } catch {
      setActions(readBackup());
      setBackendReady(false);
    }
  }

  React.useEffect(() => { reload(); }, []);

  return <main className="cxRoot"><Style /><section className="cxWrap"><article className="cxHero"><span className="cxPill">AI approval desk</span><h1>Churvox did the admin. You approve.</h1><p>Each Command box opens a focused slip with what Churvox found, what it prepared, the risk, and the owner controls.</p></article><section className="cxBoxes">{SLIPS.map((slip) => <CommandBox key={slip.key} slip={slip} onOpen={setOpen} />)}</section><Queue actions={actions} backendReady={backendReady} reload={reload} /></section>{open ? <Slip api={api} slip={open} onClose={() => setOpen(null)} reload={reload} /> : null}</main>;
}
