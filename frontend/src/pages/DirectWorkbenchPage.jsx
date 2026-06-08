import React from "react";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";

const PAGES = {
  jobs: { title: "Jobs", eyebrow: "Job workbench", promise: "Create, edit, price and prepare jobs from this page. No extra review slip.", button: "Save job", endpoint: "/jobs", fields: [["title", "Job title"], ["client_name", "Client"], ["address", "Job address"], ["scheduled_date", "Schedule/date"], ["assigned_worker_name", "Worker"], ["pricing_type", "Pricing type", "select", ["Fixed price", "Hourly", "Fixed + extras", "Hourly + extras"]], ["price", "Price / rate"], ["notes", "Job notes / worker instructions", "textarea"]], queue: ["Missing price", "Unassigned jobs", "Upcoming jobs", "Completed jobs ready to invoice"] },
  dispatch: { title: "Crew dispatch", eyebrow: "Dispatch workbench", promise: "Assign work, set the schedule and prepare the worker note in one view.", button: "Assign / save dispatch", endpoint: "/jobs", fields: [["job_id", "Existing job ID"], ["job_title", "Job title"], ["client_site", "Client / site"], ["worker_name", "Worker"], ["worker_id", "Worker ID"], ["backup_worker", "Backup worker"], ["scheduled_time", "Scheduled date/time"], ["dispatch_note", "Dispatch note", "textarea"]], queue: ["Unassigned jobs", "Worker workload", "Schedule conflicts", "Ready to dispatch"] },
  clients: { title: "Clients", eyebrow: "Client workbench", promise: "Add or clean customer records and prepare the next job or quote from one page.", button: "Save client", endpoint: "/clients", fields: [["name", "Client name"], ["phone", "Phone"], ["email", "Email"], ["address", "Address"], ["billing_contact", "Billing contact"], ["status", "Client status", "select", ["Active", "Needs details", "Do not contact", "Archived"]], ["notes", "Client notes", "textarea"]], queue: ["Missing phone/email", "New job for client", "Quote needed", "Invoice follow-up"] },
  quotes: { title: "Quotes", eyebrow: "Quote workbench", promise: "Prepare quote scope, value and follow-up wording without opening another page.", button: "Save quote", endpoint: "/quotes", fields: [["customer_name", "Client"], ["title", "Quote title"], ["total", "Quote value"], ["valid_until", "Valid until"], ["status", "Quote status", "select", ["draft", "sent", "accepted", "declined"]], ["scope", "Scope of work", "textarea"], ["message", "Customer follow-up message", "textarea"]], queue: ["Draft quotes", "Sent quotes", "Accepted quotes", "Follow-ups"] },
  invoices: { title: "Invoices", eyebrow: "Invoice workbench", promise: "Prepare invoice amounts, due dates and follow-up wording in one place.", button: "Save invoice", endpoint: "/invoices", fields: [["customer_name", "Client"], ["job_reference", "Job / invoice reference"], ["subtotal", "Amount"], ["due_date", "Due date"], ["status", "Invoice status", "select", ["draft", "sent", "paid", "overdue", "cancelled"]], ["description", "Invoice wording", "textarea"], ["follow_up", "Payment follow-up wording", "textarea"]], queue: ["Draft invoices", "Completed jobs to invoice", "Overdue follow-ups", "Paid/reviewed"] },
  team: { title: "Team", eyebrow: "Team workbench", promise: "Add workers, set roles and prepare invite/access notes from one page.", button: "Save worker", endpoint: "/team/workers", fields: [["name", "Worker name"], ["email", "Email"], ["phone", "Phone"], ["role", "Role", "select", ["worker", "manager", "office_admin", "payroll"]], ["invite_status", "Invite status", "select", ["Ready to invite", "Invite sent", "Needs email", "Paused"]], ["access_note", "Access / role note", "textarea"], ["invite_message", "Invite message", "textarea"]], queue: ["Workers", "Invite needed", "Role checks", "Access notes"] },
  payroll: { title: "Payroll/time", eyebrow: "Payroll workbench", promise: "Review time, pause time and payroll notes without mixing it with job admin.", button: "Save payroll review", endpoint: "/jobs", fields: [["job_id", "Job ID"], ["worker_name", "Worker"], ["pay_period", "Pay period"], ["reviewed_hours", "Reviewed hours"], ["pause_time", "Pause time"], ["pay_status", "Payroll status", "select", ["Ready", "Needs review", "Hold", "Exported"]], ["payroll_note", "Payroll note", "textarea"], ["export_note", "Export / handoff note", "textarea"]], queue: ["Timesheets", "Completed job time", "Needs review", "Ready for export"] }
};

function blankForm(page) {
  return Object.fromEntries(page.fields.map(([key, label, type, options]) => [key, type === "select" ? options[0] : ""]));
}

function Field({ field, form, setForm }) {
  const [key, label, type, options = []] = field;
  const value = form[key] || "";
  const update = (next) => setForm((old) => ({ ...old, [key]: next }));
  return <label className={type === "textarea" ? "dwField wide" : "dwField"}><span>{label}</span>{type === "textarea" ? <textarea value={value} onChange={(e) => update(e.target.value)} /> : type === "select" ? <select value={value || options[0]} onChange={(e) => update(e.target.value)}>{options.map((item) => <option key={item} value={item}>{item}</option>)}</select> : <input value={value} onChange={(e) => update(e.target.value)} />}</label>;
}

function Style() {
  return <style>{`.dwRoot,.dwRoot *{box-sizing:border-box;color-scheme:light;opacity:1;text-shadow:none}.dwRoot{min-height:100vh;background:#f6f1e7;color:#111827;font-family:Inter,system-ui}.dwWrap{max-width:1480px;margin:0 auto;padding:24px 28px 120px}.dwHero,.dwQueue,.dwForm,.dwControls{box-shadow:0 18px 46px rgba(2,6,23,.14)}.dwHero{background:#0b1018;color:#ffffff;border-left:8px solid #f97316;border-radius:34px;padding:30px}.dwHero span{display:inline-flex;border-radius:999px;background:#fff7ed;color:#7c2d12;padding:8px 14px;font-size:11px;font-weight:1000;letter-spacing:.14em;text-transform:uppercase}.dwHero h1{margin:16px 0 8px;font-size:clamp(42px,5.5vw,76px);line-height:.9;letter-spacing:-.07em;color:#ffffff}.dwHero p{max-width:820px;color:#f8fafc;font-weight:900}.dwGrid{display:grid;grid-template-columns:minmax(0,1fr)340px;gap:18px;margin-top:18px}.dwForm,.dwControls,.dwQueue{background:#fffaf0!important;color:#111827!important;border:1px solid rgba(15,23,42,.18);border-radius:30px;padding:22px}.dwFormHead{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:18px}.dwFormHead small{display:block;color:#7c2d12!important;font-size:11px;font-weight:1000;letter-spacing:.14em;text-transform:uppercase}.dwFormHead h2{margin:6px 0 0;color:#111827!important;font-size:34px;line-height:.95;letter-spacing:-.05em}.dwFields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.dwField.wide{grid-column:1/-1}.dwField span{display:block;color:#431407!important;text-transform:uppercase;letter-spacing:.11em;font-size:12px;font-weight:1000;margin-bottom:7px}.dwField input,.dwField textarea,.dwField select{width:100%;border:2px solid rgba(15,23,42,.35)!important;border-radius:16px;padding:13px 15px;font-size:16px;font-weight:900;background:#ffffff!important;color:#0f172a!important;-webkit-text-fill-color:#0f172a!important;outline:none;box-shadow:0 1px 0 rgba(15,23,42,.08)}.dwField input::placeholder,.dwField textarea::placeholder{color:#475569!important;-webkit-text-fill-color:#475569!important}.dwField textarea{min-height:120px;resize:vertical}.dwField select option{background:#ffffff!important;color:#0f172a!important}.dwField input:focus,.dwField textarea:focus,.dwField select:focus{border-color:#f97316!important;box-shadow:0 0 0 4px rgba(249,115,22,.16)}.dwSide{display:grid;gap:18px;align-content:start}.dwControls{display:grid;gap:10px;position:sticky;top:18px}.dwControls h2,.dwQueue h2{font-size:30px;line-height:.95;margin:0;color:#111827!important}.dwControls p{background:#14532d!important;color:#ffffff!important;border-radius:16px;padding:12px 14px;font-weight:1000;line-height:1.45}.dwControls button{border:0;border-radius:16px;padding:14px;font-size:16px;font-weight:1000;cursor:pointer}.dwSave{background:#ffedd5!important;color:#7c2d12!important;border:2px solid #fed7aa!important}.dwApprove{background:#16a34a!important;color:#052e16!important;border:2px solid #15803d!important}.dwClear{background:#111827!important;color:#ffffff!important}.dwQueue ul{list-style:none;margin:16px 0 0;padding:0;display:grid;gap:10px}.dwQueue li{border-radius:16px;background:#111827!important;color:#ffffff!important;padding:13px 14px;font-size:14px;font-weight:1000}.dwQueue li:before{content:'•';color:#fbbf24;margin-right:8px}@media(max-width:1200px){.dwGrid{grid-template-columns:1fr}.dwControls{position:static}.dwFields{grid-template-columns:1fr}.dwWrap{padding:16px 16px 110px}}`}</style>;
}

export default function DirectWorkbenchPage({ type }) {
  const api = useApi();
  const page = PAGES[type] || PAGES.jobs;
  const [form, setForm] = React.useState(() => blankForm(page));
  const [message, setMessage] = React.useState("Ready to work here. No extra tap needed.");

  React.useEffect(() => {
    setForm(blankForm(page));
    setMessage("Ready to work here. No extra tap needed.");
  }, [type]);

  async function save() {
    try {
      localStorage.setItem(`churvox_direct_workbench_${type}`, JSON.stringify(form));
      setMessage(`${page.title} draft saved on this page.`);
      toast.success(`${page.title} saved`);
    } catch {
      toast.error("Could not save draft");
    }
  }

  async function approve() {
    try {
      let res = { success: true };
      if (type === "dispatch" && form.job_id) res = await api.post(`/jobs/${encodeURIComponent(form.job_id)}/assign`, { worker_name: form.worker_name, worker_id: form.worker_id, dispatch_note: form.dispatch_note, scheduled_time: form.scheduled_time });
      else if (type === "payroll" && form.job_id) res = await api.patch(`/jobs/${encodeURIComponent(form.job_id)}`, { reviewed_hours: form.reviewed_hours, pause_time: form.pause_time, payroll_note: form.payroll_note, payroll_reviewed: true });
      else if (["jobs", "clients", "quotes", "invoices", "team"].includes(type)) res = await api.post(page.endpoint, form);
      if (res?.success === false) throw new Error(res?.error || "Save failed");
      localStorage.setItem(`churvox_direct_workbench_${type}`, JSON.stringify(form));
      setMessage(`${page.title} approved from this page.`);
      toast.success(`${page.title} approved`);
    } catch (error) {
      toast.error(error?.message || "Could not approve this work");
    }
  }

  function clear() {
    setForm(blankForm(page));
    setMessage("Cleared. Ready for the next item.");
  }

  return <main className="dwRoot" data-direct-workbench={type}><Style /><section className="dwWrap"><article className="dwHero"><span>{page.eyebrow}</span><h1>{page.title}</h1><p>{page.promise}</p></article><section className="dwGrid"><section className="dwForm"><div className="dwFormHead"><div><small>Direct working form</small><h2>{page.title} editor</h2></div></div><div className="dwFields">{page.fields.map((field) => <Field key={field[0]} field={field} form={form} setForm={setForm} />)}</div></section><aside className="dwSide"><section className="dwControls"><h2>Owner controls</h2><p>{message}</p><button className="dwSave" onClick={save}>Save edit</button><button className="dwApprove" onClick={approve}>{page.button}</button><button className="dwClear" onClick={clear}>Clear / next item</button></section><section className="dwQueue"><h2>On this page</h2><ul>{page.queue.map((item) => <li key={item}>{item}</li>)}</ul></section></aside></section></section></main>;
}
