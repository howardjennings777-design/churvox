import React from "react";
import { clean, firstGood, titleOf } from "./controlBoardData";

const OPTIONS = {
  service: ["Lawn mowing", "Landscaping", "Cleaning", "Handyman", "Painting", "Plumbing", "Electrical", "Pest control", "Other"],
  jobStatus: ["assigned", "acknowledged", "in_progress", "completed", "needs_check"],
  recurring: ["One-off", "Weekly", "Fortnightly", "Monthly", "Custom"],
  billing: ["Fixed price", "Hourly", "Fixed + extras", "Hourly + extras", "Quote required"],
  quoteStatus: ["Draft", "Ready", "Sent", "Viewed", "Accepted", "Converted", "Parked"],
  invoiceStatus: ["Draft", "Due", "Overdue", "Paid", "Parked"],
  role: ["Owner", "Manager", "Worker", "Subcontractor", "Payroll only"],
  access: ["Full access", "Jobs only", "Worker app", "Payroll review", "No access"],
  priority: ["Low", "Normal", "High", "Urgent"],
};

function first(data, type) {
  if (type === "job") return data.jobs[0] || {};
  if (type === "client") return data.clients[0] || {};
  if (type === "worker") return data.workers[0] || {};
  return {};
}

export function blankRecord(type, data) {
  const client = first(data, "client");
  const worker = first(data, "worker");
  if (type === "client") return { __new: true, type, name: "", phone: "", email: "", address: "", service: "", price: "", schedule: "One-off", notes: "" };
  if (type === "quote") return { __new: true, type, title: "", client: client.name || "", amount: 0, status: "Draft", scope: "", terms: "Valid for 14 days", followUp: "", next: "Prepare for Command" };
  if (type === "invoice") return { __new: true, type, number: "", client: client.name || "", job: "", amount: 0, due: "", status: "Draft", sync: "Not synced", line: "", evidence: "" };
  if (type === "worker") return { __new: true, type, name: "", email: "", phone: "", role: "Worker", access: "Worker app", status: "Not invited", job: "", app: "Not invited", gps: "", timesheet: "", proof: "", messages: "", payroll: "No payroll review", notes: "" };
  if (type === "message") return { __new: true, type, from: "", channel: "Internal", client: client.name || "", job: "", subject: "", priority: "Normal", detail: "", draft: "" };
  return { __new: true, type: "job", title: "", client: client.name || "", address: client.address || "", service: "Other", worker: worker.name || "Unassigned", date: "", time: "", price: 0, billing: "Fixed price", recurring: "One-off", status: "assigned", proof: "", notes: "" };
}

function unique(values, fallback = []) {
  const seen = new Set();
  return [...values, ...fallback].filter((value) => {
    const label = clean(value);
    const key = label.toLowerCase();
    if (!label || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function field(name, key, type = "text", options = null, wide = false) {
  return { name, key, type, options, wide };
}

function fieldsFor(record, data) {
  const clients = unique(data.clients.map((item) => item.name), [record.client, "No client selected"]);
  const workers = unique(data.workers.map((item) => item.name), [record.worker, "Unassigned"]);
  if (record.type === "approval") return [field("Approval type", "approvalType"), field("Record", "title"), field("Client", "client"), field("Amount", "amount", "number"), field("Recommended action", "recommended", "select", ["Approve", "Save edit", "Park"]), field("What happened", "reason", "textarea", null, true), field("What Churvox prepared", "prepared", "textarea", null, true), field("Evidence checked", "evidence", "textarea", null, true)];
  if (record.type === "client") return [field("Name", "name"), field("Phone", "phone"), field("Email", "email", "email"), field("Address", "address"), field("Preferred service", "service", "select", OPTIONS.service), field("Saved price", "price"), field("Preferred schedule", "schedule", "select", OPTIONS.recurring), field("Access notes", "notes", "textarea", null, true)];
  if (record.type === "quote") return [field("Quote", "title"), field("Client", "client", "select", clients), field("Amount", "amount", "number"), field("Status", "status", "select", OPTIONS.quoteStatus), field("Scope", "scope", "textarea", null, true), field("Terms", "terms"), field("Follow-up", "followUp"), field("Next step", "next")];
  if (record.type === "invoice") return [field("Invoice", "number"), field("Client", "client", "select", clients), field("Job", "job"), field("Amount", "amount", "number"), field("Due date", "due", "date"), field("Status", "status", "select", OPTIONS.invoiceStatus), field("Accounting status", "sync"), field("Line item", "line"), field("Evidence", "evidence", "textarea", null, true)];
  if (record.type === "worker") return [field("Name", "name"), field("Email", "email", "email"), field("Phone", "phone"), field("Role", "role", "select", OPTIONS.role), field("Access", "access", "select", OPTIONS.access), field("Clock status", "status"), field("Current job", "job"), field("GPS/location", "gps"), field("Proof/photos", "proof"), field("Worker messages", "messages", "textarea", null, true), field("Timesheet", "timesheet"), field("Payroll status", "payroll"), field("Worker app", "app"), field("Notes", "notes", "textarea", null, true)];
  if (record.type === "message") return [field("From", "from"), field("Channel", "channel"), field("Client", "client", "select", clients), field("Job", "job"), field("Subject", "subject"), field("Priority", "priority", "select", OPTIONS.priority), field("Message", "detail", "textarea", null, true), field("Drafted reply", "draft", "textarea", null, true)];
  return [field("Job name", "title"), field("Client", "client", "select", clients), field("Site address", "address"), field("Service", "service", "select", OPTIONS.service), field("Assigned worker", "worker", "select", workers), field("Scheduled date", "date", "date"), field("Start time", "time", "time"), field("Price NZD", "price", "number"), field("Billing type", "billing", "select", OPTIONS.billing), field("Frequency", "recurring", "select", OPTIONS.recurring), field("Status", "status", "select", OPTIONS.jobStatus), field("Proof/photos", "proof"), field("Job notes", "notes", "textarea", null, true)];
}

function payloadFor(record, values) {
  if (record.type === "client") return { name: values.name, phone: values.phone, email: values.email, address: values.address, service: values.service, price: values.price, schedule: values.schedule, notes: values.notes };
  if (record.type === "quote") return { title: values.title, client_name: values.client, amount: values.amount, status: values.status, scope: values.scope, terms: values.terms, follow_up: values.followUp, next_step: values.next };
  if (record.type === "invoice") return { invoice_number: values.number, client_name: values.client, job_title: values.job, amount: values.amount, due_date: values.due, status: values.status, accounting_status: values.sync, line_item: values.line, evidence: values.evidence };
  if (record.type === "worker") return { name: values.name, email: values.email, phone: values.phone, role: values.role, access: values.access, status: values.status, current_job: values.job, gps: values.gps, proof: values.proof, messages: values.messages, timesheet: values.timesheet, payroll_status: values.payroll, app_status: values.app, notes: values.notes };
  if (record.type === "message") return { from: values.from, channel: values.channel, client_name: values.client, job_title: values.job, subject: values.subject, priority: values.priority, message: values.detail, drafted_reply: values.draft };
  return { title: values.title, client_name: values.client, address: values.address, service: values.service, assigned_worker_name: values.worker, scheduled_date: values.date, scheduled_time: values.time, price: values.price, billing: values.billing, recurring: values.recurring, status: values.status, proof: values.proof, notes: values.notes };
}

async function saveRecord(api, record, values, action) {
  const id = record.id;
  if (record.type === "approval") {
    return firstGood([
      () => api.post(`/command/approvals/${encodeURIComponent(id || record.title || "approval")}/execute`, { action_id: id, kind: "command_record", action, item: { ...record, fields: values } }),
      () => api.post("/command/execute-approved", { kind: "command_record", action, item: { ...record, fields: values } }),
    ]);
  }
  const payload = payloadFor(record, values);
  const isNew = record.__new || !id;
  if (record.type === "job") return firstGood(isNew ? [() => api.post("/jobs", payload), () => api.post("/jobs/create", payload)] : [() => api.patch(`/jobs/${id}`, payload), () => api.patch(`/jobs/${id}/field-update`, payload)]);
  if (record.type === "client") return firstGood(isNew ? [() => api.post("/clients", payload), () => api.post("/clients/create", payload)] : [() => api.patch(`/clients/${id}`, payload), () => api.put(`/clients/${id}`, payload)]);
  if (record.type === "quote") return firstGood(isNew ? [() => api.post("/quotes", payload), () => api.post("/quotes/create", payload)] : [() => api.patch(`/quotes/${id}`, payload), () => api.put(`/quotes/${id}`, payload)]);
  if (record.type === "invoice") return firstGood(isNew ? [() => api.post("/invoices", payload), () => api.post("/invoices/create", payload)] : [() => api.patch(`/invoices/${id}`, payload), () => api.put(`/invoices/${id}`, payload)]);
  if (record.type === "worker") return firstGood(isNew ? [() => api.post("/team/workers", payload), () => api.post("/team", payload), () => api.post("/workers", payload)] : [() => api.patch(`/team/workers/${id}`, payload), () => api.patch(`/team/${id}`, payload)]);
  return firstGood([() => api.post("/messages", payload), () => api.post("/command/execute-approved", { kind: "message", item: { ...record, payload } })]);
}

function Input({ def, value, onChange, disabled }) {
  const common = { name: def.key, value: value ?? "", disabled, onChange };
  return <label className={`cv7Field ${def.wide ? "wide" : ""}`}><span>{def.name}</span>{def.type === "textarea" ? <textarea {...common} rows={4} /> : def.options ? <select {...common}>{unique([value], def.options).map((option) => <option value={option} key={option}>{option}</option>)}</select> : <input {...common} type={def.type || "text"} step={def.type === "number" ? "0.01" : undefined} />}</label>;
}

export default function ControlBoardEditor({ record, data, api, refresh, close, notify }) {
  const [values, setValues] = React.useState({});
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => { if (record) setValues({ ...record }); }, [record]);
  if (!record) return null;

  const isApproval = record.type === "approval";
  const submit = async (action = "save") => {
    setBusy(true);
    try {
      await saveRecord(api, record, values, action);
      await refresh();
      notify({ tone: "good", title: isApproval ? "Command updated" : record.__new ? "Created" : "Saved", text: isApproval ? `Decision ${action === "approve" ? "approved" : action === "park" ? "parked" : "updated"}.` : `${titleOf(values)} is up to date.` });
      close();
    } catch (error) {
      notify({ tone: "bad", title: "Could not save", text: error?.message || "Check the details and try again." });
    } finally { setBusy(false); }
  };

  return <div className="cv7ModalLayer" role="dialog" aria-modal="true" aria-label={`${record.__new ? "Create" : "Edit"} ${record.type}`}>
    <section className={`cv7Editor ${isApproval ? "approval" : ""}`}>
      <header><div><small>{record.__new ? "New record" : isApproval ? "Owner decision" : record.type}</small><h2>{record.__new ? `Create ${record.type}` : titleOf(record)}</h2><p>{isApproval ? "See the reason, evidence, prepared result and exact consequence before deciding." : "Everything connected to this record stays in one workspace."}</p></div><button type="button" onClick={close}>Close</button></header>
      <div className="cv7EditorForm">{fieldsFor(record, data).map((def) => <Input key={def.key} def={def} value={values[def.key]} disabled={busy} onChange={(event) => setValues((current) => ({ ...current, [event.target.name]: event.target.value }))} />)}</div>
      <footer>{isApproval ? <><button type="button" className="primary" disabled={busy} onClick={() => submit("approve")}>Approve</button><button type="button" disabled={busy} onClick={() => submit("edit")}>Save edit</button><button type="button" className="quiet" disabled={busy} onClick={() => submit("park")}>Park</button></> : <><button type="button" className="primary" disabled={busy} onClick={() => submit("save")}>{record.__new ? "Create record" : "Save changes"}</button><button type="button" className="quiet" onClick={close}>Cancel</button></>}</footer>
    </section>
  </div>;
}
