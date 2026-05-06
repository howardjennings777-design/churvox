import React from "react";
import { X } from "lucide-react";

const HIDDEN_KEYS = new Set([
  "id", "_id", "business_id", "client_id", "created_at", "updated_at", "deleted_at", "internal_id", "owner_id",
]);

const SAFE_FALLBACK_KEYS = ["title", "name", "status", "description", "amount", "total", "date", "due_date"];

const badgeTone = (status = "") => {
  const s = String(status).toLowerCase();
  if (["accepted", "paid", "completed", "active"].some((x) => s.includes(x))) return "bg-emerald-100 text-emerald-700";
  if (["declined", "cancelled", "overdue"].some((x) => s.includes(x))) return "bg-rose-100 text-rose-700";
  if (["sent", "pending", "draft"].some((x) => s.includes(x))) return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-700";
};

const money = (v) => (v === null || v === undefined || v === "" ? "—" : `$${Number(v || 0).toFixed(2)}`);
const clean = (v, fallback = "—") => (v === null || v === undefined || v === "" ? fallback : String(v));
const formatDate = (v) => (v ? new Date(v).toLocaleDateString() : "—");

function inferType(item = {}) {
  if (item.invoice_number || item.payment_link || item.amount_due !== undefined) return "invoice";
  if (item.quote_number || item.valid_until) return "quote";
  if (item.job_type || item.assigned_worker_name || item.schedule || item.service_type) return "job";
  if (item.role || item.region || item.invite_status || item.worker_name) return "worker";
  if (item.phone || item.client_name || item.unpaid_balance !== undefined) return "client";
  return "unknown";
}

function Section({ title, children }) { return <section className="rounded-xl border border-slate-200 bg-white p-4"><h4 className="text-sm font-semibold text-slate-900">{title}</h4><div className="mt-2 space-y-2 text-sm text-slate-700">{children}</div></section>; }
function Row({ k, v }) { return <p><span className="font-medium text-slate-900">{k}: </span>{v}</p>; }

function GenericActions({ onClose }) {
  return <div className="flex flex-wrap gap-2"><button type="button" onClick={onClose} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white">Close</button></div>;
}

function FallbackBody({ item }) {
  const keys = SAFE_FALLBACK_KEYS.filter((k) => item?.[k] !== undefined && item?.[k] !== null && item?.[k] !== "");
  return <Section title="Details">{keys.length ? keys.map((k) => <Row key={k} k={k.replace(/_/g, " ")} v={clean(item[k])} />) : <p>No safe fields available.</p>}</Section>;
}

export default function EntityDetailModal({ open, onClose, title, item, actions, entityType }) {
  if (!open || !item) return null;
  const type = entityType || inferType(item);

  const status = clean(item.status, "draft");
  const headerTitle = title || item.title || item.name || item.client_name || "Details";

  const safeExtras = Array.isArray(item.extras) ? item.extras.join(", ") : typeof item.extras === "string" ? item.extras : "—";

  return <div className="fixed inset-0 z-[120]">
    <button type="button" className="absolute inset-0 bg-slate-950/45" onClick={onClose} aria-label="Close details" />
    <div className="absolute inset-x-0 bottom-0 top-6 rounded-t-2xl bg-slate-50 shadow-2xl md:inset-auto md:left-1/2 md:top-1/2 md:max-h-[88vh] md:w-[min(920px,95vw)] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:px-6"><div><h3 className="text-lg font-semibold text-slate-900">{headerTitle}</h3><div className="mt-1 flex items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeTone(status)}`}>{status}</span>{type === "quote" ? <span className="text-sm font-semibold text-slate-900">{money(item.total || item.price || item.amount)}</span> : null}{item.valid_until ? <span className="text-xs text-slate-500">Valid until {formatDate(item.valid_until)}</span> : null}</div></div><button type="button" onClick={onClose} className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"><X className="h-5 w-5" /></button></div>
      <div className="max-h-[calc(88vh-138px)] overflow-y-auto px-4 py-4 md:px-6"><div className="space-y-3">
        {type === "quote" ? <><Section title="Customer"><Row k="Name" v={clean(item.client_name || item.customer_name || item.name)} /><Row k="Email" v={clean(item.client_email || item.email)} /><Row k="Address" v={clean(item.client_address || item.address)} /></Section><Section title="Work"><Row k="Job type" v={clean(item.job_type || item.service_type)} /><Row k="Description" v={clean(item.description || item.job_description)} /><Row k="Pricing type" v={clean(item.pricing_type || "Fixed")} /><Row k="Price" v={money(item.price || item.total || item.amount)} /><Row k="Extras" v={safeExtras} /></Section><Section title="AI Quote Assistant"><p>Auto-check ON</p><p>Last scan: Just now</p><p>AI checked this quote.</p><p>AI found it is {status}.</p><p>AI checked this record and prepared a review summary.</p><p>Recommended action: {status === "draft" ? "review/send quote" : status === "sent" ? "prepare follow-up" : status === "accepted" ? "convert to job or invoice" : "review reason/follow-up"}.</p><p>Approval needed before sending.</p></Section></> : null}
        {type === "invoice" ? <><Section title="Invoice"><Row k="Invoice number" v={clean(item.invoice_number || item.number)} /><Row k="Customer" v={clean(item.client_name || item.customer_name)} /><Row k="Total" v={money(item.total || item.amount)} /><Row k="Amount due" v={money(item.amount_due || item.balance_due)} /><Row k="Payment link" v={clean(item.public_payment_link || item.payment_link)} /><Row k="MYOB" v={clean(item.myob_status || "Not synced")} /></Section><Section title="AI Payment Assistant"><p>AI checked this invoice.</p><p>AI found payment status is {status}.</p><p>AI checked this record and prepared a review summary.</p><p>Approval needed before sending.</p></Section></> : null}
        {type === "job" ? <><Section title="Job"><Row k="Title" v={clean(item.title || item.name)} /><Row k="Client" v={clean(item.client_name)} /><Row k="Address" v={clean(item.address)} /><Row k="Assigned worker" v={clean(item.worker_name || item.assigned_worker_name)} /><Row k="Schedule" v={clean(item.schedule || item.scheduled_for)} /><Row k="Worker notes/photos" v={clean(item.worker_notes || item.photos ? "Available" : "—")} /><Row k="Completion pack" v={clean(item.completion_pack || (["completed", "complete"].includes(String(status).toLowerCase()) ? "Ready" : "Pending"))} /></Section><Section title="AI Next Action"><p>AI checked this job.</p><p>AI found it is {status}.</p><p>AI checked this record and prepared a review summary.</p><p>Approval needed before sending.</p></Section></> : null}
        {type === "client" ? <><Section title="Client"><Row k="Name" v={clean(item.client_name || item.name)} /><Row k="Phone" v={clean(item.phone)} /><Row k="Email" v={clean(item.email)} /><Row k="Address" v={clean(item.address)} /><Row k="Notes" v={clean(item.notes)} /><Row k="Unpaid balance" v={money(item.unpaid_balance || item.balance_due)} /></Section><Section title="Timeline"><p>{clean(item.timeline_summary || "Jobs, quotes, and invoices timeline available from activity feed.")}</p></Section><Section title="AI Next Action"><p>AI checked this client account.</p><p>AI found current balance and open workflow.</p><p>AI checked this record and prepared a review summary.</p><p>Approval needed before sending.</p></Section></> : null}
        {type === "worker" ? <><Section title="Worker"><Row k="Name" v={clean(item.worker_name || item.name)} /><Row k="Contact" v={clean(item.phone || item.email)} /><Row k="Role" v={clean(item.role)} /><Row k="Status" v={status} /><Row k="Region" v={clean(item.region)} /><Row k="Assigned jobs" v={clean(item.assigned_jobs_count ?? item.assigned_jobs ?? "—")} /><Row k="Invite" v={clean(item.invite_status || "active")} /></Section><Section title="AI Worker Recommendation"><p>AI checked this worker profile.</p><p>AI found availability and role fit.</p><p>AI checked this record and prepared a review summary.</p><p>Approval needed before sending.</p></Section></> : null}
        {type === "unknown" ? <FallbackBody item={Object.fromEntries(Object.entries(item).filter(([k, v]) => !HIDDEN_KEYS.has(k) && typeof v !== "object" && v !== "" && v !== null && v !== undefined))} /> : null}
      </div></div>
      <div className="border-t border-slate-200 bg-white px-4 py-3 md:px-6">{actions || <GenericActions onClose={onClose} />}</div>
    </div>
  </div>;
}
