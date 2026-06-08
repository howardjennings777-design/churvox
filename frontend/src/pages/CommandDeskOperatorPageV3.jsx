import React from "react";
import { toast } from "sonner";

const INVOICE_DELIVERY_OPTIONS = [
  "Churvox internal",
  "Xero",
  "Draft only",
  "Manual external",
  "MYOB staged/later (inactive)"
];

function deliveryDetails(method) {
  const key = String(method || "").toLowerCase();
  if (key.includes("xero")) {
    return {
      handle: "Xero handles it after owner approval and connection.",
      email: "Churvox does not email this invoice.",
      xero: "Invoice is staged for Xero sync. If Xero is not connected, it waits for connection.",
      draft: "Not draft-only.",
      sent: "Nothing is sent to the customer from Churvox."
    };
  }
  if (key.includes("myob")) {
    return {
      handle: "MYOB is staged for later only.",
      email: "Churvox does not email this invoice.",
      xero: "Not staged for Xero.",
      draft: "Approved as a staged MYOB-later item.",
      sent: "Nothing is sent. No active MYOB wording or fake sync."
    };
  }
  if (key.includes("draft")) {
    return {
      handle: "Owner approves the draft only.",
      email: "Churvox does not email this invoice.",
      xero: "Not staged for Xero.",
      draft: "Draft is approved and kept for later.",
      sent: "Nothing is sent or synced."
    };
  }
  if (key.includes("manual") || key.includes("external")) {
    return {
      handle: "Owner marks this as handled outside Churvox.",
      email: "Churvox does not email this invoice.",
      xero: "Not staged for Xero.",
      draft: "Not draft-only.",
      sent: "Nothing is sent by Churvox."
    };
  }
  return {
    handle: "Churvox handles the invoice send path after owner approval.",
    email: "Churvox may email the customer only after approval.",
    xero: "Not staged for Xero.",
    draft: "Not draft-only.",
    sent: "Handled by Churvox internal invoice delivery."
  };
}

const SLIPS = [
  {
    key: "approvals",
    title: "Approvals",
    card: "Master queue for owner decisions prepared by Churvox.",
    formTitle: "Approval decision",
    found: "Churvox found work that should not happen without owner approval.",
    prepared: "A clear decision with the linked record, owner changes and approval note.",
    why: "This keeps the AI Operator approval-first and stops silent changes.",
    risk: "High-risk actions must show source, record and outcome before approval.",
    after: "The prepared action is accepted, declined, or sent back for editing.",
    approveLabel: "Approve decision",
    fields: [
      ["approvalSource", "Approval source", "select", ["Money", "Crew", "Quote", "Job", "Client", "Worker update", "Payroll", "Setup"]],
      ["linkedRecord", "Linked record"],
      ["riskLevel", "Risk level", "select", ["Normal", "Important", "Urgent", "High risk"]],
      ["dueStatus", "Due / urgency"],
      ["preparedAction", "Prepared action", "textarea"],
      ["ownerChanges", "Owner changes before approval", "textarea"],
      ["decisionNote", "Decision note", "textarea"]
    ]
  },
  {
    key: "crew",
    title: "Crew dispatch",
    card: "Approve the recommended worker, schedule and dispatch note.",
    formTitle: "Crew assignment",
    found: "A job needs a worker, schedule, or clearer dispatch instructions.",
    prepared: "A recommended worker, backup option and message for the field crew.",
    why: "The owner should see why a worker is recommended before assigning the job.",
    risk: "Check workload, travel area and schedule conflict before approval.",
    after: "The worker is assigned and the dispatch note is ready for notification.",
    approveLabel: "Approve assignment",
    fields: [
      ["jobName", "Job to assign"],
      ["clientSite", "Client / site"],
      ["jobAddress", "Job address"],
      ["recommendedWorker", "Recommended worker"],
      ["matchReason", "Why this worker", "textarea"],
      ["workerWorkload", "Worker workload today"],
      ["backupWorker", "Backup worker"],
      ["schedule", "Scheduled date/time"],
      ["conflictWarning", "Conflict / warning", "textarea"],
      ["dispatchNote", "Worker dispatch note", "textarea"]
    ]
  },
  {
    key: "money",
    title: "Money",
    card: "Approve invoice drafts, delivery method, Xero staging and money reviews.",
    formTitle: "Money action",
    found: "A money item needs owner approval before sending, following up, staging for Xero, or marking reviewed.",
    prepared: "The amount, due date, customer wording, delivery method and accounting status are ready to review.",
    why: "Money actions should be checked before customers see them, Xero is staged, or records change.",
    risk: "Check the selected delivery method. No silent customer email, no fake Xero sync, and no active MYOB wording.",
    after: "The invoice is handled exactly by the selected delivery method.",
    approveLabel: "Approve money action",
    fields: [
      ["moneyAction", "Money action", "select", ["Draft invoice", "Approve invoice", "Payment follow-up", "Mark paid reviewed", "Accounting review"]],
      ["deliveryMethod", "Invoice delivery method", "select", INVOICE_DELIVERY_OPTIONS],
      ["client", "Client"],
      ["clientEmail", "Client email"],
      ["invoiceRef", "Invoice / job reference"],
      ["amount", "Amount"],
      ["gstStatus", "GST status", "select", ["GST included", "GST excluded", "No GST", "Needs check"]],
      ["dueDate", "Due date"],
      ["contactWarning", "Contact / amount warning"],
      ["accountingStatus", "Accounting status", "select", ["Not synced", "Xero staged", "Waiting for Xero connection", "Draft only - nothing sent", "Manual external - nothing sent", "MYOB later - inactive", "Needs review"]],
      ["customerMessage", "Customer wording", "textarea"],
      ["internalNote", "Internal money note", "textarea"]
    ]
  },
  {
    key: "jobs",
    title: "Jobs needing info",
    card: "Fix the job blocker before dispatch, reminders or invoices move.",
    formTitle: "Job blocker fix",
    found: "A job is missing information or has a blocker that stops the next step.",
    prepared: "The missing fields, pricing, worker notes and owner-only note are ready to review.",
    why: "Clean job details feed dispatch, reminders, invoices, payroll and worker instructions.",
    risk: "Do not show owner-only pricing or internal notes to workers.",
    after: "The job becomes ready for scheduling, assignment or invoice preparation.",
    approveLabel: "Save job fix",
    fields: [
      ["jobTitle", "Job title"],
      ["client", "Client"],
      ["clientContact", "Client phone / email"],
      ["address", "Job address"],
      ["jobType", "Job type / trade"],
      ["priority", "Priority", "select", ["Normal", "High", "Urgent"]],
      ["schedule", "Schedule/date"],
      ["repeatType", "Recurring", "select", ["One-off", "Weekly", "Fortnightly", "Monthly", "Custom"]],
      ["assignedWorker", "Assigned worker"],
      ["pricingType", "Pricing type", "select", ["Fixed price", "Hourly", "Fixed + extras", "Hourly + extras", "Needs price"]],
      ["price", "Price / rate"],
      ["missingChecklist", "Missing info checklist", "textarea"],
      ["workerInstructions", "Worker-visible instructions", "textarea"],
      ["ownerOnlyNote", "Owner-only note", "textarea"]
    ]
  },
  {
    key: "quotes",
    title: "Quotes",
    card: "Approve quote follow-ups, revisions or quote-to-job actions.",
    formTitle: "Quote action",
    found: "A quote needs follow-up, revision, expiry review or conversion to a job.",
    prepared: "The quote value, scope, assumptions and customer message are ready to approve.",
    why: "Quotes should not sit untouched when they can become work or need a clear response.",
    risk: "Check scope, exclusions, expiry and client contact before sending anything.",
    after: "The quote action is saved, followed up, revised or ready to convert into a job.",
    approveLabel: "Approve quote action",
    fields: [
      ["quoteAction", "Quote action", "select", ["Follow up quote", "Convert accepted quote", "Revise quote", "Archive quote"]],
      ["client", "Client"],
      ["quoteRef", "Quote title / number"],
      ["quoteStatus", "Quote status", "select", ["Draft", "Sent", "Accepted", "Declined", "Expired"]],
      ["quoteValue", "Quote value"],
      ["gstStatus", "GST status", "select", ["GST included", "GST excluded", "No GST", "Needs check"]],
      ["validUntil", "Valid until"],
      ["contactWarning", "Client contact warning"],
      ["scope", "Scope of work", "textarea"],
      ["exclusions", "Exclusions / assumptions", "textarea"],
      ["message", "Customer follow-up message", "textarea"]
    ]
  },
  {
    key: "clients",
    title: "Clients",
    card: "Approve client contact fixes and next customer action.",
    formTitle: "Client record fix",
    found: "A client record needs details before jobs, quotes, invoices or reminders work properly.",
    prepared: "Contact details, site notes, billing contact and next action are ready to review.",
    why: "Clean client data stops failed reminders, invoice issues and wrong job details.",
    risk: "Missing phone/email can block reminders and follow-ups.",
    after: "The client record is ready for job, quote, invoice and reminder workflows.",
    approveLabel: "Save client fix",
    fields: [
      ["clientName", "Client name"],
      ["phone", "Phone"],
      ["email", "Email"],
      ["preferredContact", "Preferred contact", "select", ["Phone", "Email", "SMS later", "No preference"]],
      ["address", "Main address"],
      ["billingContact", "Billing contact"],
      ["clientStatus", "Client status", "select", ["Active", "Needs details", "Do not contact", "Archived"]],
      ["reminderStatus", "Reminder status", "select", ["Ready", "Missing contact", "Coming soon", "Do not remind"]],
      ["siteNotes", "Property / access notes", "textarea"],
      ["lastJobNextAction", "Last job / next action", "textarea"],
      ["clientNote", "Client note", "textarea"]
    ]
  },
  {
    key: "workers",
    title: "Worker updates",
    card: "Accept field updates, proof, notes and completion issues.",
    formTitle: "Worker update review",
    found: "A field update needs owner review before invoice, payroll or follow-up work continues.",
    prepared: "Worker note, proof status, timing and owner review note are ready to accept or reject.",
    why: "Worker updates are the bridge between job completion, invoice preparation and payroll review.",
    risk: "Check missing photos, client issues, time issues and site verification before accepting.",
    after: "The update is accepted and can feed invoice preparation or payroll review.",
    approveLabel: "Accept worker update",
    fields: [
      ["worker", "Worker"],
      ["job", "Job"],
      ["completionStatus", "Completion status", "select", ["Completed", "Needs review", "Photos missing", "Client issue", "Rejected"]],
      ["proofStatus", "Photo / proof status", "select", ["Photos attached", "No photos", "Needs owner review", "Not required"]],
      ["timeStarted", "Started time"],
      ["timeCompleted", "Completed time"],
      ["siteCheck", "Owner-side site check", "select", ["Not checked", "On site", "Near site", "Away from site", "GPS missing"]],
      ["issueFlag", "Issue flag", "select", ["None", "Client issue", "Pricing issue", "Photo missing", "Time issue", "Needs call"]],
      ["workerNote", "Worker note", "textarea"],
      ["ownerReview", "Owner review note", "textarea"]
    ]
  },
  {
    key: "payroll",
    title: "Payroll/time",
    card: "Approve reviewed time before payroll handoff.",
    formTitle: "Payroll time review",
    found: "A worker time record needs review before payroll export or handoff.",
    prepared: "Reviewed hours, pause time, hold reason and export note are ready for payroll approval.",
    why: "Payroll needs clean time records separate from normal job admin.",
    risk: "Hold anything with missing start/finish, strange pause time or disputed hours.",
    after: "The time is marked ready, held for review, or prepared for export/handoff.",
    approveLabel: "Approve time review",
    fields: [
      ["worker", "Worker"],
      ["payPeriod", "Pay period"],
      ["jobSource", "Job / time source"],
      ["startTime", "Start time"],
      ["finishTime", "Finish time"],
      ["totalTime", "Total time"],
      ["pauseTime", "Pause time"],
      ["reviewedHours", "Reviewed hours"],
      ["payStatus", "Payroll status", "select", ["Ready", "Needs review", "Hold", "Exported"]],
      ["holdReason", "Hold reason", "textarea"],
      ["payrollNote", "Payroll note", "textarea"],
      ["exportNote", "Export / handoff note", "textarea"]
    ]
  },
  {
    key: "setup",
    title: "Setup blockers",
    card: "Approve setup fixes that unblock launch or customer use.",
    formTitle: "Setup blocker fix",
    found: "A setup item is missing or unfinished and may block launch readiness.",
    prepared: "The missing item, required value, prepared fix and owner note are ready to review.",
    why: "Setup blockers should be clear, not hidden inside random settings pages.",
    risk: "Some setup items can block signups, billing, support, legal links or customer trust.",
    after: "The setup item is saved as fixed, left for later, or ignored for now.",
    approveLabel: "Save setup fix",
    fields: [
      ["setupArea", "Setup area", "select", ["Business profile", "Branding", "Team", "Plans/billing", "Legal links", "Accounting", "Notifications", "PWA install"]],
      ["missingThing", "What is missing"],
      ["launchImpact", "Why it blocks launch", "textarea"],
      ["preparedTask", "Prepared setup task"],
      ["requiredValue", "Required value"],
      ["setupStatus", "Setup status", "select", ["Not started", "Needs owner input", "Ready to save", "Done", "Ignore for now"]],
      ["ownerNote", "Owner setup note", "textarea"]
    ]
  }
];

function makeForm(slip) {
  const out = {};
  slip.fields.forEach(([key, label, type, options]) => {
    out[key] = type === "select" ? options[0] : "";
  });
  return out;
}

function Field({ field, form, setForm }) {
  const [key, label, type, options = []] = field;
  const update = (value) => setForm({ ...form, [key]: value });
  return (
    <label className={type === "textarea" ? "cxField wide" : "cxField"}>
      <span>{label}</span>
      {type === "textarea" ? (
        <textarea value={form[key] || ""} onChange={(e) => update(e.target.value)} />
      ) : type === "select" ? (
        <select value={form[key] || options[0]} onChange={(e) => update(e.target.value)}>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input value={form[key] || ""} onChange={(e) => update(e.target.value)} />
      )}
    </label>
  );
}

function CommandBox({ slip, onOpen }) {
  return (
    <button className="cxBox" onClick={() => onOpen(slip)}>
      <b>{slip.title}</b>
      <strong>{slip.formTitle}</strong>
      <p>{slip.card}</p>
      <em>Open prepared action</em>
    </button>
  );
}

function ContextCard({ label, children, tone = "dark" }) {
  return <div className={`cxContextCard ${tone}`}><b>{label}</b><span>{children}</span></div>;
}

function MoneyDeliverySummary({ form }) {
  const details = deliveryDetails(form.deliveryMethod);
  return (
    <section className="cxDeliverySummary">
      <div>
        <small>Invoice delivery</small>
        <strong>{form.deliveryMethod || "Churvox internal"}</strong>
      </div>
      <ul>
        <li><b>Who handles it:</b> {details.handle}</li>
        <li><b>Email:</b> {details.email}</li>
        <li><b>Xero:</b> {details.xero}</li>
        <li><b>Draft:</b> {details.draft}</li>
        <li><b>Send/sync result:</b> {details.sent}</li>
      </ul>
    </section>
  );
}

function Slip({ slip, onClose }) {
  const [form, setForm] = React.useState(makeForm(slip));
  const [msg, setMsg] = React.useState("Ready to edit and approve inside this Command slip.");

  React.useEffect(() => {
    setForm(makeForm(slip));
    setMsg("Ready to edit and approve inside this Command slip.");
  }, [slip.key]);

  const save = () => { setMsg("Edits saved in this slip."); toast.success("Edits saved in this slip"); };
  const approve = () => {
    const delivery = slip.key === "money" ? ` Delivery: ${form.deliveryMethod || "Churvox internal"}.` : "";
    setMsg(`${slip.title} approved from this slip.${delivery}`);
    toast.success(`${slip.title} approved from this slip`);
  };
  const decline = () => { toast.success(`${slip.title} declined`); onClose(); };

  return (
    <div className="cxOverlay">
      <section className="cxSlip">
        <header>
          <div>
            <small>COMMAND / {slip.title}</small>
            <h1>{slip.title}</h1>
            <p>{slip.formTitle} — {slip.card}</p>
          </div>
          <button onClick={onClose}>Close</button>
        </header>

        <main>
          <section className="cxFormPanel">
            <div className="cxFormTop">
              <span>{slip.formTitle}</span>
            </div>
            {slip.key === "money" ? <MoneyDeliverySummary form={form} /> : null}
            <div className="cxContextGrid">
              <ContextCard label="AI found">{slip.found}</ContextCard>
              <ContextCard label="AI prepared">{slip.prepared}</ContextCard>
              <ContextCard label="Why it matters">{slip.why}</ContextCard>
              <ContextCard label="Risk / warning" tone="warn">{slip.risk}</ContextCard>
              <ContextCard label="After approval" tone="ok">{slip.after}</ContextCard>
            </div>
            <div className="cxFields">
              {slip.fields.map((field) => <Field key={field[0]} field={field} form={form} setForm={setForm} />)}
            </div>
          </section>

          <aside className="cxControls">
            <h2>Owner controls</h2>
            <p>{msg}</p>
            {slip.key === "money" ? (
              <div className="cxMiniDelivery">
                <b>Selected delivery</b>
                <span>{form.deliveryMethod || "Churvox internal"}</span>
                <em>{deliveryDetails(form.deliveryMethod).sent}</em>
              </div>
            ) : null}
            <button className="save" onClick={save}>Save edit</button>
            <button className="approve" onClick={approve}>{slip.approveLabel}</button>
            <button className="decline" onClick={decline}>Decline</button>
            <button className="dark" onClick={onClose}>Back to Command</button>
          </aside>
        </main>
      </section>
    </div>
  );
}

function Style() {
  return <style>{`
    .cxRoot,.cxRoot *{box-sizing:border-box;color-scheme:light;opacity:1;text-shadow:none}
    .cxRoot{position:fixed;inset:0;z-index:2147483000;background:#f6f1e7;overflow:auto;font-family:Inter,system-ui;color:#111827}
    .cxWrap{max-width:1380px;margin:0 auto;padding:24px 28px 120px}
    .cxHero{background:#0b1018;color:#ffffff;border-radius:34px;padding:34px;box-shadow:0 24px 70px rgba(2,6,23,.24)}
    .cxPill{display:inline-flex;border-radius:999px;padding:8px 14px;background:#fff7ed;color:#7c2d12;font-size:11px;font-weight:1000;letter-spacing:.14em;text-transform:uppercase}
    .cxHero h1{margin:18px 0 12px;font-size:clamp(42px,5.4vw,72px);line-height:.92;letter-spacing:-.055em;color:#ffffff;user-select:none}
    .cxHero p{color:#f8fafc;font-weight:900;max-width:820px}
    .cxBoxes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;margin-top:20px}
    .cxBox{background:#0b1018;color:#ffffff;border:1px solid rgba(255,255,255,.14);border-left:8px solid #f97316;border-radius:28px;padding:22px;text-align:left;min-height:224px;display:grid;gap:12px;cursor:pointer;box-shadow:0 22px 62px rgba(2,6,23,.24)}
    .cxBox b{font-size:28px;line-height:.95;color:#ffffff}
    .cxBox strong{color:#fbbf24;text-transform:uppercase;font-size:11px;letter-spacing:.12em;font-weight:1000}
    .cxBox p{color:#f1f5f9;font-weight:900;line-height:1.45;margin:0}
    .cxBox em{font-style:normal;justify-self:start;border-radius:14px;background:#fbbf24;color:#111827;padding:10px 14px;font-weight:1000}
    .cxOverlay{position:fixed;inset:0;z-index:2147483647;background:rgba(2,6,23,.90);padding:16px 22px 16px 286px;display:flex}
    .cxSlip{width:100%;background:#f7efe3;border-radius:34px;overflow:hidden;display:grid;grid-template-rows:auto 1fr;box-shadow:0 38px 120px rgba(2,6,23,.50)}
    .cxSlip header{background:#0b1018;color:#ffffff;border-left:8px solid #f97316;padding:20px 28px;display:flex;justify-content:space-between;gap:16px}
    .cxSlip header small{color:#fed7aa;font-weight:1000;letter-spacing:.14em;user-select:none}
    .cxSlip header h1{font-size:clamp(30px,3.4vw,48px);line-height:.98;margin:8px 0;color:#ffffff;letter-spacing:-.035em;max-width:980px;overflow-wrap:anywhere;user-select:none}
    .cxSlip header p{font-weight:900;color:#f8fafc;max-width:940px;margin:0}
    .cxSlip header button{height:max-content;border:0;border-radius:15px;padding:12px 18px;font-weight:1000;background:#ffffff;color:#111827}
    .cxSlip main{min-height:0;display:grid;grid-template-columns:minmax(0,1fr)340px;gap:16px;padding:16px;overflow:auto}
    .cxFormPanel,.cxControls{background:#fffaf0;border:1px solid rgba(15,23,42,.20);border-radius:26px;padding:20px;box-shadow:0 14px 38px rgba(15,23,42,.12);color:#111827}
    .cxFormTop{display:flex;align-items:center;margin-bottom:14px;min-height:0}
    .cxFormTop span{display:inline-flex;background:#111827;color:#fbbf24;border-radius:999px;padding:7px 12px;text-transform:uppercase;letter-spacing:.12em;font-size:11px;font-weight:1000;user-select:none}
    .cxDeliverySummary{background:#0b1018;border-left:6px solid #f97316;border-radius:24px;padding:18px;margin:0 0 16px;color:#ffffff;display:grid;grid-template-columns:220px minmax(0,1fr);gap:16px;align-items:start}
    .cxDeliverySummary small{display:block;color:#fed7aa;text-transform:uppercase;letter-spacing:.13em;font-weight:1000;font-size:10px;margin-bottom:6px}
    .cxDeliverySummary strong{display:block;color:#ffffff;font-size:24px;line-height:1;font-weight:1000}
    .cxDeliverySummary ul{margin:0;padding:0;display:grid;gap:7px;list-style:none}
    .cxDeliverySummary li{color:#f8fafc;font-weight:900;line-height:1.35}
    .cxDeliverySummary li b{color:#fbbf24}
    .cxMiniDelivery{background:#0b1018;color:#ffffff;border-radius:18px;border-left:5px solid #f97316;padding:13px 14px;display:grid;gap:5px}
    .cxMiniDelivery b{color:#fbbf24;text-transform:uppercase;letter-spacing:.12em;font-size:10px}
    .cxMiniDelivery span{color:#ffffff;font-weight:1000}
    .cxMiniDelivery em{color:#f8fafc;font-style:normal;font-weight:900;line-height:1.35}
    .cxContextGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:16px}
    .cxContextCard{border-radius:18px;background:#111827;color:#ffffff;padding:13px 14px;border-left:5px solid #f97316}
    .cxContextCard.warn{background:#451a03;border-left-color:#f59e0b}
    .cxContextCard.ok{background:#052e16;border-left-color:#22c55e;grid-column:1/-1}
    .cxContextCard b{display:block;color:#fbbf24;text-transform:uppercase;letter-spacing:.12em;font-size:10px;font-weight:1000;margin-bottom:6px}
    .cxContextCard span{display:block;color:#f8fafc;font-size:13px;font-weight:900;line-height:1.42}
    .cxFields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
    .cxField.wide{grid-column:1/-1}
    .cxField span{display:block;color:#431407;text-transform:uppercase;letter-spacing:.11em;font-size:12px;font-weight:1000;margin-bottom:7px;user-select:none}
    .cxField input,.cxField textarea,.cxField select{width:100%;border:2px solid #d6b98f;border-radius:16px;padding:13px 15px;font-size:16px;font-weight:900;background:#fffdf7!important;background-color:#fffdf7!important;background-image:linear-gradient(#fffdf7,#fffdf7)!important;color:#0f172a!important;-webkit-text-fill-color:#0f172a!important;caret-color:#0f172a;opacity:1!important;outline:none;box-shadow:0 2px 0 rgba(15,23,42,.06), inset 0 0 0 9999px rgba(255,253,247,1)!important;filter:none!important}
    .cxField input:focus,.cxField textarea:focus,.cxField select:focus{border-color:#f97316;background:#ffffff!important;background-color:#ffffff!important;background-image:linear-gradient(#ffffff,#ffffff)!important;box-shadow:0 0 0 4px rgba(249,115,22,.18), inset 0 0 0 9999px rgba(255,255,255,1)!important}
    .cxField textarea{min-height:116px;resize:vertical}
    .cxField option{background:#ffffff;color:#0f172a}
    .cxField input::placeholder,.cxField textarea::placeholder{color:#7c2d12!important;opacity:.65!important;-webkit-text-fill-color:#7c2d12!important}
    .cxField input:-webkit-autofill,.cxField textarea:-webkit-autofill,.cxField select:-webkit-autofill{-webkit-box-shadow:0 0 0 1000px #fffdf7 inset!important;-webkit-text-fill-color:#0f172a!important}
    .cxControls{align-self:start;position:sticky;top:0;display:grid;gap:10px}
    .cxControls h2{font-size:30px;line-height:.95;margin:0;color:#111827;user-select:none}
    .cxControls p{background:#14532d;color:#ffffff;border-radius:16px;padding:12px 14px;font-weight:1000;line-height:1.45}
    .cxControls button{width:100%;border:0;border-radius:16px;padding:14px;font-weight:1000;font-size:16px;letter-spacing:0;cursor:pointer;color:#111827!important}
    .cxControls .save{background:#ffedd5;color:#7c2d12!important;border:2px solid #fed7aa}
    .cxControls .approve{background:#16a34a;color:#052e16!important;border:2px solid #15803d}
    .cxControls .decline{background:#fecaca;color:#7f1d1d!important;border:2px solid #fca5a5}
    .cxControls .dark{background:#111827;color:#ffffff!important}
    @media(max-width:1200px){.cxOverlay{padding:12px}.cxSlip main,.cxBoxes,.cxContextGrid,.cxDeliverySummary{grid-template-columns:1fr}.cxControls{position:static}}
  `}</style>;
}

export default function CommandDeskOperatorPageV3() {
  const [open, setOpen] = React.useState(null);
  return (
    <main className="cxRoot">
      <Style />
      <section className="cxWrap">
        <article className="cxHero">
          <span className="cxPill">AI approval desk</span>
          <h1>Churvox did the admin. You approve.</h1>
          <p>Each Command box opens a prepared action slip: what Churvox found, what it prepared, why it matters, the risk, and what happens after approval.</p>
        </article>
        <section className="cxBoxes">
          {SLIPS.map((slip) => <CommandBox key={slip.key} slip={slip} onOpen={setOpen} />)}
        </section>
      </section>
      {open ? <Slip slip={open} onClose={() => setOpen(null)} /> : null}
    </main>
  );
}
