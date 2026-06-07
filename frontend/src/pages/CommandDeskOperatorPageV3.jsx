import React from "react";
import { toast } from "sonner";

const slips = [
  { key: "approvals", title: "Approvals", tag: "Owner decisions", prepared: "Decision title, area, prepared action, owner note", fields: [["decision", "Decision"], ["area", "Area"], ["preparedAction", "Prepared action", "textarea"], ["ownerNote", "Owner note", "textarea"]] },
  { key: "crew", title: "Crew dispatch", tag: "Assign work", prepared: "Job, worker, worker ID, dispatch note", fields: [["job", "Job"], ["worker", "Worker"], ["workerId", "Worker ID"], ["note", "Dispatch note", "textarea"]] },
  { key: "money", title: "Money", tag: "Invoice work", prepared: "Client, amount, due date, invoice wording", fields: [["client", "Client"], ["amount", "Amount"], ["due", "Due date"], ["message", "Invoice / follow-up wording", "textarea"]] },
  { key: "jobs", title: "Jobs needing info", tag: "Fix job blockers", prepared: "Job title, client, address, schedule, price, note", fields: [["job", "Job title"], ["client", "Client"], ["address", "Address"], ["date", "Schedule/date"], ["price", "Price"], ["note", "Job note", "textarea"]] },
  { key: "quotes", title: "Quotes", tag: "Quote action", prepared: "Client, quote value, scope, customer message", fields: [["client", "Client"], ["value", "Quote value"], ["scope", "Scope", "textarea"], ["message", "Message", "textarea"]] },
  { key: "clients", title: "Clients", tag: "Customer record", prepared: "Client name, phone, email, note", fields: [["client", "Client"], ["phone", "Phone"], ["email", "Email"], ["note", "Client note", "textarea"]] },
  { key: "workers", title: "Worker updates", tag: "Field review", prepared: "Worker, job, update, owner review note", fields: [["worker", "Worker"], ["job", "Job"], ["update", "Worker update", "textarea"], ["review", "Owner review", "textarea"]] },
  { key: "payroll", title: "Payroll/time", tag: "Time review", prepared: "Job, worker, minutes, payroll note", fields: [["job", "Job"], ["worker", "Worker"], ["minutes", "Reviewed minutes"], ["note", "Payroll note", "textarea"]] },
  { key: "setup", title: "Setup blockers", tag: "Setup work", prepared: "Setup area, task, note", fields: [["area", "Setup area"], ["task", "Prepared task"], ["note", "Setup note", "textarea"]] }
];

function emptyForm(slip) {
  const form = {};
  slip.fields.forEach(([key, label, type]) => {
    form[key] = type === "textarea" ? `${slip.title} prepared by Churvox. Edit this before approving.` : "";
  });
  return form;
}

function Field({ field, form, setForm }) {
  const [key, label, type] = field;
  return (
    <label className={type === "textarea" ? "cxField wide" : "cxField"}>
      <span>{label}</span>
      {type === "textarea" ? (
        <textarea value={form[key] || ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
      ) : (
        <input value={form[key] || ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
      )}
    </label>
  );
}

function Box({ slip, onOpen }) {
  return (
    <button className="cxBox" onClick={() => onOpen(slip)}>
      <b>{slip.title}</b>
      <strong>{slip.tag}</strong>
      <p>{slip.prepared}</p>
      <em>Open working slip</em>
    </button>
  );
}

function Slip({ slip, onClose }) {
  const [form, setForm] = React.useState(emptyForm(slip));
  const [message, setMessage] = React.useState("Ready to approve from this slip.");

  React.useEffect(() => {
    setForm(emptyForm(slip));
    setMessage("Ready to approve from this slip.");
  }, [slip.key]);

  const save = () => {
    setMessage("Edit saved in this slip.");
    toast.success("Edit saved in this slip");
  };

  const approve = () => {
    setMessage(`${slip.title} approved from this slip.`);
    toast.success(`${slip.title} approved from this slip`);
  };

  const decline = () => {
    toast.success(`${slip.title} declined`);
    onClose();
  };

  return (
    <div className="cxOverlay">
      <section className="cxSlip">
        <header>
          <div>
            <small>COMMAND / {slip.title}</small>
            <h1>{slip.title}</h1>
            <p>This slip is the workspace. Edit what Churvox prepared, then save, approve, or decline here.</p>
          </div>
          <button onClick={onClose}>Close</button>
        </header>

        <main>
          <section className="cxPanel">
            <h2>Prepared for you</h2>
            <div className="cxDark"><b>What this slip does</b><p>{slip.tag}</p></div>
            <div className="cxDark"><b>What Churvox prepared</b><p>{slip.prepared}</p></div>
            <div className="cxDark"><b>After approval</b><p>The prepared work is accepted from this slip. No page jumping.</p></div>
            <div className="cxFacts">
              <div><b>AI found</b><span>This area is ready for owner input.</span></div>
              <div><b>AI prepared</b><span>The editable form beside this panel is ready.</span></div>
              <div><b>Why</b><span>You approve admin here instead of going page to page.</span></div>
            </div>
          </section>

          <section className="cxPanel">
            <h2>Edit before approving</h2>
            <p>This is the actual working form for {slip.title}.</p>
            <div className="cxFields">
              {slip.fields.map((field) => <Field key={field[0]} field={field} form={form} setForm={setForm} />)}
            </div>
          </section>

          <aside className="cxControls">
            <h2>Owner controls</h2>
            <p>Edit the form, then choose what happens next.</p>
            <div className="cxOk">{message}</div>
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
    .cxHero{background:#0b1018;color:white;border-radius:34px;padding:34px}
    .cxPill{display:inline-flex;border-radius:999px;padding:8px 14px;background:#fff7ed;color:#9a3412;font-size:11px;font-weight:1000;letter-spacing:.18em;text-transform:uppercase}
    .cxHero h1{margin:18px 0 12px;font-size:clamp(46px,6vw,80px);line-height:.9;letter-spacing:-.075em}
    .cxHero p{color:#e5e7eb;font-weight:850}
    .cxBoxes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;margin-top:20px}
    .cxBox{background:#0b1018;color:white;border:1px solid rgba(255,255,255,.1);border-left:8px solid #f97316;border-radius:28px;padding:22px;text-align:left;min-height:210px;display:grid;gap:12px;cursor:pointer;box-shadow:0 22px 62px rgba(2,6,23,.24)}
    .cxBox b{font-size:28px;line-height:.95}
    .cxBox strong{color:#fbbf24;text-transform:uppercase;font-size:11px;letter-spacing:.15em}
    .cxBox p{color:#d1d5db;font-weight:850}
    .cxBox em{font-style:normal;justify-self:start;border-radius:14px;background:#fbbf24;color:#111827;padding:10px 14px;font-weight:1000}
    .cxOverlay{position:fixed;inset:0;z-index:2147483647;background:rgba(2,6,23,.90);padding:16px 22px 16px 286px;display:flex}
    .cxSlip{width:100%;background:#101720;border-radius:34px;overflow:hidden;display:grid;grid-template-rows:auto 1fr;box-shadow:0 34px 110px rgba(0,0,0,.55)}
    .cxSlip header{background:#0b1018;color:white;border-left:8px solid #f97316;padding:24px 30px;display:flex;justify-content:space-between;gap:16px}
    .cxSlip header small{color:#fed7aa;font-weight:1000;letter-spacing:.16em}
    .cxSlip header h1{font-size:clamp(42px,5vw,74px);line-height:.9;margin:8px 0}
    .cxSlip header p{font-weight:850;color:#e5e7eb}
    .cxSlip header button{height:max-content;border:0;border-radius:15px;padding:12px 18px;font-weight:1000;background:#fff7ed;color:#111827}
    .cxSlip main{min-height:0;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) 340px;gap:16px;padding:16px;overflow:auto;background:#101720}
    .cxPanel,.cxControls{background:#151d29;color:#f8fafc;border:1px solid rgba(148,163,184,.22);border-radius:26px;padding:18px;box-shadow:0 14px 38px rgba(0,0,0,.25)}
    .cxPanel h2,.cxControls h2{font-size:32px;line-height:.95;margin:0 0 14px;color:#ffffff}
    .cxPanel>p{color:#cbd5e1;font-weight:900}
    .cxDark{background:#0b1018;color:white;border-left:6px solid #f97316;border-radius:18px;padding:14px;margin-bottom:10px;border:1px solid rgba(251,146,60,.18)}
    .cxDark b{display:block;color:#fbbf24;text-transform:uppercase;font-size:11px;letter-spacing:.14em}
    .cxDark p{font-weight:900;color:#f8fafc}
    .cxFacts{display:grid;gap:10px}
    .cxFacts div{background:#0f172a;border:1px solid rgba(148,163,184,.18);border-radius:16px;padding:12px}
    .cxFacts b,.cxField span{display:block;color:#fbbf24;text-transform:uppercase;letter-spacing:.14em;font-size:11px;font-weight:1000;margin-bottom:6px}
    .cxFacts span,.cxControls p{font-weight:850;color:#e2e8f0}
    .cxFields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
    .cxField.wide{grid-column:1/-1}
    .cxField input,.cxField textarea{width:100%;background:#0b1018;color:#f8fafc;-webkit-text-fill-color:#f8fafc;border:1px solid rgba(251,146,60,.45);border-radius:16px;padding:13px 14px;font-weight:950;box-shadow:inset 0 0 0 1px rgba(15,23,42,.55)}
    .cxField input:focus,.cxField textarea:focus{outline:3px solid rgba(249,115,22,.28);border-color:#f97316;background:#111827}
    .cxField textarea{min-height:120px}
    .cxControls{align-self:start;position:sticky;top:0;display:grid;gap:10px}
    .cxControls button{width:100%;border:0;border-radius:16px;padding:14px;font-weight:1000}
    .cxControls .save{background:#fff7ed;color:#9a3412;border:1px solid #fed7aa}
    .cxControls .approve{background:#22c55e;color:#052e16}
    .cxControls .decline{background:#7f1d1d;color:#fee2e2;border:1px solid #fecaca}
    .cxControls .dark{background:#020617;color:white;border:1px solid rgba(148,163,184,.22)}
    .cxOk{background:#064e3b;color:#d1fae5;border:1px solid rgba(16,185,129,.32);border-radius:16px;padding:12px 14px;font-weight:1000}
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
          <p>Every box opens a working slip with editable fields and owner controls. No forced page jumping.</p>
        </article>
        <section className="cxBoxes">
          {slips.map((slip) => <Box key={slip.key} slip={slip} onOpen={setOpen} />)}
        </section>
      </section>
      {open ? <Slip slip={open} onClose={() => setOpen(null)} /> : null}
    </main>
  );
}
