import { createOperatorAction } from "./operatorActions";
export function buildOperatorQueue({ jobs = [], invoices = [], quotes = [] }) {
  const actions = [];
  const unassigned = jobs.filter((j) => !j.assigned_worker_id && !j.worker_id).slice(0, 3);
  unassigned.forEach((j) => actions.push(createOperatorAction({ type: "assign_worker", title: `Assign worker: ${j.title || j.client_name || "Job"}`, summary: "AI found an unassigned job.", reason: "Unassigned jobs risk delays.", risk: "Wrong worker assignment can affect service quality.", confidence_label: "Ready for owner review", source_records: [j.id || j._id].filter(Boolean), recommended_next_step: "Approve dispatch recommendation", execute_mode: "safe_execute", related_workspace: "/jobs", payload: { job_id: j.id || j._id } })));
  const overdue = invoices.filter((i) => String(i.status || "").toLowerCase().includes("overdue")).slice(0, 3);
  overdue.forEach((i) => actions.push(createOperatorAction({ type: "payment_reminder", title: `Payment reminder: ${i.invoice_number || i.id || "Invoice"}`, summary: "AI prepared a reminder draft.", reason: "Overdue invoice detected.", risk: "No reminder is sent automatically.", confidence_label: "Draft only", source_records: [i.id || i._id].filter(Boolean), recommended_next_step: "Review reminder wording", execute_mode: "draft_only", related_workspace: "/invoices" })));
  if (!actions.length && quotes.length) actions.push(createOperatorAction({ type: "quote_followup", title: "Review open quote follow-ups", summary: "AI prepared quote follow-up drafts.", reason: "Open quotes need owner decision.", risk: "No messages sent without approval.", confidence_label: "Needs review", related_workspace: "/quotes", execute_mode: "draft_only" }));
  return actions;
}
