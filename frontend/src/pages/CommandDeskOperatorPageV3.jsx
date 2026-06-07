import React from "react";
import { toast } from "sonner";

const SLIPS = [
  { key: "approvals", title: "Approvals", card: "Approve, edit, or decline prepared owner decisions.", formTitle: "Approval decision form", fields: [["approvalType", "Approval type", "select", ["General", "Invoice", "Job", "Quote", "Client", "Payroll"]], ["linkedRecord", "Linked record"], ["preparedAction", "Prepared action", "textarea"], ["ownerChanges", "Owner changes", "textarea"], ["decisionNote", "Decision note", "textarea"]] },
  { key: "crew", title: "Crew dispatch", card: "Assign the right worker to the right job.", formTitle: "Crew assignment form", fields: [["jobName", "Job to assign"], ["site", "Client / site"], ["recommendedWorker", "Recommended worker"], ["backupWorker", "Backup worker"], ["schedule", "Scheduled date/time"], ["workerInstructions", "Worker instructions", "textarea"], ["dispatchNote", "Dispatch note", "textarea"]] },
  { key: "money", title: "Money", card: "Prepare invoice work and payment follow-ups.", formTitle: "Invoice and payment form", fields: [["moneyAction", "Money action", "select", ["Draft invoice", "Approve invoice", "Payment follow-up", "Mark reviewed"]], ["client", "Client"], ["invoiceRef", "Job / invoice reference"], ["amount", "Amount"], ["dueDate", "Due date"], ["customerMessage", "Customer wording", "textarea"], ["internalNote", "Internal money note", "textarea"]] },
  { key: "jobs", title: "Jobs needing info", card: "Fill missing job details before work moves forward.", formTitle: "Job details form", fields: [["jobTitle", "Job title"], ["client", "Client"], ["address", "Job address"], ["schedule", "Schedule/date"], ["pricingType", "Pricing type", "select", ["Fixed price", "Hourly", "Fixed + extras", "Hourly + extras"]], ["price", "Price / rate"], ["workerInstructions", "Worker instructions", "textarea"], ["missingInfoNote", "Missing info note", "textarea"]] },
  { key: "quotes", title: "Quotes", card: "Follow up quotes or convert accepted quotes to jobs.", formTitle: "Quote action form", fields: [["quoteAction", "Quote action", "select", ["Follow up quote", "Convert accepted quote", "Revise quote", "Archive quote"]], ["client", "Client"], ["quoteRef", "Quote title / number"], ["quoteValue", "Quote value"], ["validUntil", "Valid until"], ["scope", "Scope of work", "textarea"], ["message", "Customer follow-up message", "textarea"]] },
  { key: "clients", title: "Clients", card: "Clean client details so reminders and invoices work.", formTitle: "Client record form", fields: [["clientName", "Client name"], ["phone", "Phone"], ["email", "Email"], ["address", "Address"], ["billingContact", "Billing contact"], ["clientStatus", "Client status", "select", ["Active", "Needs details", "Do not contact", "Archived"]], ["clientNote", "Client note", "textarea"]] },
  { key: "workers", title: "Worker updates", card: "Review field notes, job proof, and completion updates.", formTitle: "Worker update review form", fields: [["worker", "Worker"], ["job", "Job"], ["completionStatus", "Completion status", "select", ["Completed", "Needs review", "Photos missing", "Client issue", "Rejected"]], ["proofStatus", "Photo / proof status", "select", ["Photos attached", "No photos", "Needs owner review", "Not required"]], ["workerNote", "Worker note", "textarea"], ["ownerReview", "Owner review note", "textarea"]] },
  { key: "payroll", title: "Payroll/time", card: "Review job time before payroll handoff.", formTitle: "Payroll time review form", fields: [["worker", "Worker"], ["payPeriod", "Pay period"], ["timeSource", "Job / time source"], ["reviewedHours", "Reviewed hours"], ["pauseTime", "Pause time"], ["payStatus", "Payroll status", "select", ["Ready", "Needs review", "Hold", "Exported"]], ["payrollNote", "Payroll note", "textarea"], ["exportNote", "Export / handoff note", "textarea"]] },
  { key: "setup", title: "Setup blockers", card: "Finish missing setup items from inside Command.", formTitle: "Setup blocker form", fields: [["setupArea", "Setup area", "select", ["Business profile", "Branding", "Team", "Plans/billing", "Legal links", "Accounting", "Notifications"]], ["missingThing", "What is missing"], ["preparedTask", "Prepared setup task"], ["requiredValue", "Required value"], ["setupStatus", "Setup status", "select", ["Not started", "Needs owner input", "Ready to save", "Done"]], ["ownerNote", "Owner setup note", "textarea"]] }
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
  return (
    <label className={type === "textarea" ? "cxField wide" : "cxField"}>
      <span>{label}</span>
      {type === "textarea" ? (
        <textarea value={form[key] || ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
      ) : type === "select" ? (
        <select value={form[key] || options[0]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input value={form[key] || ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
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
      <em>Open specific form</em>
    </button>
  );
}

function Slip({ slip, onClose }) {
  const [form, setForm] = React.useState(makeForm(slip));
  const [msg, setMsg] = React.useState("Ready to edit and approve inside this slip.");

  React.useEffect(() => {
    setForm(makeForm(slip));
    setMsg("Ready to edit and approve inside this slip.");
  }, [slip.key]);

  const save = () => { setMsg("Edits saved in this slip."); toast.success("Edits saved in this slip"); };
  const approve = () => { setMsg(`${slip.title} approved from this slip.`); toast.success(`${slip.title} approved from this slip`); };
  const decline = () => { toast.success(`${slip.title} declined`); onClose(); };

  return (
    <div className="cxOverlay">
      <section className="cxSlip">
        <header>
          <div>
            <small>COMMAND / {slip.title}</small>
            <h1>{slip.formTitle}</h1>
            <p>{slip.card}</p>
          </div>
          <button onClick={onClose}>Close</button>
        </header>

        <main>
          <section className="cxFormPanel">
            <div className="cxFormTop">
              <span>{slip.title}</span>
              <b>{slip.formTitle}</b>
            </div>
            <div className="cxFields">
              {slip.fields.map((field) => <Field key={field[0]} field={field} form={form} setForm={setForm} />)}
            </div>
          </section>

          <aside className="cxControls">
            <h2>Owner controls</h2>
            <p>{msg}</p>
            <button className="save" onClick={save}>Save edit</button>
            <button className="approve" onClick={approve}>Approve from slip</button>
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
    .cxRoot,.cxRoot *{box-sizing:border-box}
    .cxRoot{position:fixed;inset:0;z-index:2147483000;background:#f6f1e7;overflow:auto;font-family:Inter,system-ui;color:#111827}
    .cxWrap{max-width:1380px;margin:0 auto;padding:24px 28px 120px}
    .cxHero{background:#0b1018;color:white;border-radius:34px;padding:34px;box-shadow:0 24px 70px rgba(2,6,23,.24)}
    .cxPill{display:inline-flex;border-radius:999px;padding:8px 14px;background:#fff7ed;color:#9a3412;font-size:11px;font-weight:1000;letter-spacing:.18em;text-transform:uppercase}
    .cxHero h1{margin:18px 0 12px;font-size:clamp(46px,6vw,80px);line-height:.9;letter-spacing:-.075em}
    .cxHero p{color:#e5e7eb;font-weight:850;max-width:820px}
    .cxBoxes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;margin-top:20px}
    .cxBox{background:#0b1018;color:white;border:1px solid rgba(255,255,255,.1);border-left:8px solid #f97316;border-radius:28px;padding:22px;text-align:left;min-height:210px;display:grid;gap:12px;cursor:pointer;box-shadow:0 22px 62px rgba(2,6,23,.24)}
    .cxBox b{font-size:28px;line-height:.95}
    .cxBox strong{color:#fbbf24;text-transform:uppercase;font-size:11px;letter-spacing:.15em}
    .cxBox p{color:#d1d5db;font-weight:850;line-height:1.45;margin:0}
    .cxBox em{font-style:normal;justify-self:start;border-radius:14px;background:#fbbf24;color:#111827;padding:10px 14px;font-weight:1000}
    .cxOverlay{position:fixed;inset:0;z-index:2147483647;background:rgba(2,6,23,.88);padding:16px 22px 16px 286px;display:flex}
    .cxSlip{width:100%;background:#f6f1e7;border-radius:34px;overflow:hidden;display:grid;grid-template-rows:auto 1fr;box-shadow:0 38px 120px rgba(2,6,23,.48)}
    .cxSlip header{background:#0b1018;color:white;border-left:8px solid #f97316;padding:24px 30px;display:flex;justify-content:space-between;gap:16px}
    .cxSlip header small{color:#fed7aa;font-weight:1000;letter-spacing:.16em}
    .cxSlip header h1{font-size:clamp(42px,5vw,74px);line-height:.9;margin:8px 0}
    .cxSlip header p{font-weight:850;color:#e5e7eb;max-width:940px}
    .cxSlip header button{height:max-content;border:0;border-radius:15px;padding:12px 18px;font-weight:1000}
    .cxSlip main{min-height:0;display:grid;grid-template-columns:minmax(0,1fr)340px;gap:16px;padding:16px;overflow:auto}
    .cxFormPanel,.cxControls{background:#fffdf7;border:1px solid rgba(15,23,42,.12);border-radius:26px;padding:20px;box-shadow:0 14px 38px rgba(15,23,42,.1)}
    .cxFormTop{display:grid;gap:6px;margin-bottom:16px}
    .cxFormTop span{color:#9a3412;text-transform:uppercase;letter-spacing:.16em;font-size:11px;font-weight:1000}
    .cxFormTop b{font-size:30px;line-height:.95;letter-spacing:-.04em}
    .cxFields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
    .cxField.wide{grid-column:1/-1}
    .cxField span{display:block;color:#9a3412;text-transform:uppercase;letter-spacing:.14em;font-size:11px;font-weight:1000;margin-bottom:6px}
    .cxField input,.cxField textarea,.cxField select{width:100%;border:1px solid rgba(15,23,42,.18);border-radius:16px;padding:12px 14px;font-weight:900;background:#fff;color:#111827}
    .cxField textarea{min-height:120px;resize:vertical}
    .cxControls{align-self:start;position:sticky;top:0;display:grid;gap:10px}
    .cxControls h2{font-size:32px;line-height:.95;margin:0}
    .cxControls p{background:#dcfce7;color:#065f46;border-radius:16px;padding:12px 14px;font-weight:1000;line-height:1.45}
    .cxControls button{width:100%;border:0;border-radius:16px;padding:14px;font-weight:1000;cursor:pointer}
    .cxControls .save{background:#fff7ed;color:#9a3412;border:1px solid #fed7aa}
    .cxControls .approve{background:#22c55e;color:#052e16}
    .cxControls .decline{background:#fee2e2;color:#991b1b}
    .cxControls .dark{background:#111827;color:white}
    @media(max-width:1200px){.cxOverlay{padding:12px}.cxSlip main,.cxBoxes{grid-template-columns:1fr}.cxControls{position:static}}
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
          <p>Each box opens its own specific working form. The form is the slip. No generic left-side explanation panel.</p>
        </article>
        <section className="cxBoxes">
          {SLIPS.map((slip) => <CommandBox key={slip.key} slip={slip} onOpen={setOpen} />)}
        </section>
      </section>
      {open ? <Slip slip={open} onClose={() => setOpen(null)} /> : null}
    </main>
  );
}
