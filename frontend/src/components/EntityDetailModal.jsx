import React from "react";
import { X, Sparkles, ShieldCheck, Clock3, MapPin, UserCheck, Briefcase } from "lucide-react";

const HIDDEN_KEYS = new Set([
  "id",
  "_id",
  "business_id",
  "client_id",
  "created_at",
  "updated_at",
  "deleted_at",
  "internal_id",
  "owner_id",
]);

const SAFE_FALLBACK_KEYS = ["title", "name", "status", "description", "amount", "total", "date", "due_date"];

const badgeTone = (status = "") => {
  const s = String(status).toLowerCase();
  if (["accepted", "paid", "completed", "active", "assigned"].some((x) => s.includes(x))) return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (["declined", "cancelled", "overdue", "failed"].some((x) => s.includes(x))) return "bg-rose-100 text-rose-700 border-rose-200";
  if (["sent", "pending", "draft", "scheduled"].some((x) => s.includes(x))) return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
};

const money = (v) => (v === null || v === undefined || v === "" ? "—" : `$${Number(v || 0).toFixed(2)}`);
const clean = (v, fallback = "—") => (v === null || v === undefined || v === "" ? fallback : String(v));
const formatDate = (v) => {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleDateString();
  } catch (_err) {
    return "—";
  }
};

function inferType(item = {}) {
  if (item.invoice_number || item.payment_link || item.amount_due !== undefined) return "invoice";
  if (item.quote_number || item.valid_until) return "quote";
  if (item.job_type || item.assigned_worker_name || item.schedule || item.service_type || item.scheduled_date) return "job";
  if (item.role || item.region || item.invite_status || item.worker_name) return "worker";
  if (item.phone || item.client_name || item.unpaid_balance !== undefined) return "client";
  return "unknown";
}

function Section({ title, icon, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
      <div className="mb-3 flex items-center gap-2">
        {icon ? <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-700">{icon}</span> : null}
        <h4 className="text-sm font-black uppercase tracking-[0.08em] text-slate-900">{title}</h4>
      </div>
      <div className="space-y-2 text-sm text-slate-700">{children}</div>
    </section>
  );
}

function Row({ k, v }) {
  return (
    <p className="flex flex-wrap items-baseline gap-1.5 rounded-xl bg-slate-50 px-3 py-2">
      <span className="text-xs font-black uppercase tracking-[0.07em] text-slate-500">{k}</span>
      <span className="font-semibold text-slate-900">{v}</span>
    </p>
  );
}

function GenericActions({ onClose }) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <button type="button" onClick={onClose} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-lg hover:bg-slate-800">
        Close
      </button>
    </div>
  );
}

function FallbackBody({ item }) {
  const keys = SAFE_FALLBACK_KEYS.filter((k) => item?.[k] !== undefined && item?.[k] !== null && item?.[k] !== "");
  return (
    <Section title="Details" icon={<Briefcase className="h-4 w-4" />}>
      {keys.length ? keys.map((k) => <Row key={k} k={k.replace(/_/g, " ")} v={clean(item[k])} />) : <p>No safe fields available.</p>}
    </Section>
  );
}

function AiAutomationSection({ type, status, mode = "auto" }) {
  const isJob = type === "job";
  const heading = isJob ? "AI job operator" : "AI next action";
  const statusLine = isJob
    ? "Auto queued for crew matching and admin follow-up."
    : "Safe actions are prepared automatically and risky actions move to review.";

  return (
    <section className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-4 shadow-[0_12px_32px_rgba(37,99,235,0.08)]">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/25">
          <Sparkles className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-black uppercase tracking-[0.08em] text-blue-900">{heading}</h4>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-emerald-700">
              {mode === "review" ? "Review only if flagged" : "Automatic"}
            </span>
          </div>
          <div className="mt-3 grid gap-2 text-sm font-semibold text-slate-800">
            <p className="rounded-xl bg-white/80 px-3 py-2">AI checked this {type} and found status: <strong>{status}</strong>.</p>
            <p className="rounded-xl bg-white/80 px-3 py-2">{statusLine}</p>
            <p className="rounded-xl bg-white/80 px-3 py-2">Owner review only appears when AI flags risk, missing info, customer-impacting sends, payroll, pricing or accounting changes.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function EntityDetailModal({ open, onClose, title, item, actions, entityType }) {
  if (!open || !item) return null;

  const type = entityType || inferType(item);
  const status = clean(item.status || item.job_status || item.workflow_status, "draft");
  const headerTitle = title || item.title || item.name || item.client_name || "Details";
  const safeExtras = Array.isArray(item.extras) ? item.extras.join(", ") : typeof item.extras === "string" ? item.extras : "—";

  return (
    <div className="fixed inset-0 z-[120]">
      <button type="button" className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} aria-label="Close details" />
      <div className="absolute inset-x-3 bottom-3 top-6 overflow-hidden rounded-3xl border border-white/60 bg-slate-50 shadow-2xl md:inset-auto md:left-1/2 md:top-1/2 md:max-h-[88vh] md:w-[min(900px,94vw)] md:-translate-x-1/2 md:-translate-y-1/2">
        <div className="border-b border-slate-200 bg-gradient-to-br from-white via-blue-50 to-slate-100 px-5 py-4 md:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-blue-200 bg-white px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.1em] text-blue-700">
                  {type} details
                </span>
                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.08em] ${badgeTone(status)}`}>{status}</span>
              </div>
              <h3 className="text-xl font-black leading-tight tracking-[-0.04em] text-slate-950 md:text-2xl">{headerTitle}</h3>
              <p className="mt-1 text-sm font-semibold text-slate-600">AI keeps safe work moving automatically. Owner review is only for flagged items.</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-2xl border border-slate-200 bg-white p-2 text-slate-500 shadow-sm hover:bg-slate-100 hover:text-slate-900">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="max-h-[calc(88vh-150px)] overflow-y-auto px-5 py-5 md:px-6">
          <div className="space-y-4">
            {type === "quote" ? (
              <>
                <Section title="Customer" icon={<UserCheck className="h-4 w-4" />}>
                  <Row k="Name" v={clean(item.client_name || item.customer_name || item.name)} />
                  <Row k="Email" v={clean(item.client_email || item.email)} />
                  <Row k="Address" v={clean(item.client_address || item.address)} />
                </Section>
                <Section title="Work" icon={<Briefcase className="h-4 w-4" />}>
                  <Row k="Job type" v={clean(item.job_type || item.service_type)} />
                  <Row k="Description" v={clean(item.description || item.job_description)} />
                  <Row k="Pricing type" v={clean(item.pricing_type || "Fixed")} />
                  <Row k="Price" v={money(item.price || item.total || item.amount)} />
                  <Row k="Extras" v={safeExtras} />
                </Section>
                <AiAutomationSection type="quote" status={status} />
              </>
            ) : null}

            {type === "invoice" ? (
              <>
                <Section title="Invoice" icon={<Briefcase className="h-4 w-4" />}>
                  <Row k="Invoice number" v={clean(item.invoice_number || item.number)} />
                  <Row k="Customer" v={clean(item.client_name || item.customer_name)} />
                  <Row k="Total" v={money(item.total || item.amount)} />
                  <Row k="Amount due" v={money(item.amount_due || item.balance_due)} />
                  <Row k="Payment link" v={clean(item.public_payment_link || item.payment_link)} />
                  <Row k="MYOB" v={clean(item.myob_status || "Not synced")} />
                </Section>
                <AiAutomationSection type="invoice" status={status} />
              </>
            ) : null}

            {type === "job" ? (
              <>
                <Section title="Job" icon={<Briefcase className="h-4 w-4" />}>
                  <Row k="Title" v={clean(item.title || item.name)} />
                  <Row k="Client" v={clean(item.client_name || item.customer_name)} />
                  <Row k="Address" v={clean(item.address)} />
                  <Row k="Assigned worker" v={clean(item.worker_name || item.assigned_worker_name)} />
                  <Row k="Schedule" v={clean(item.schedule || item.scheduled_for || item.scheduled_date)} />
                  <Row k="Worker notes/photos" v={clean(item.worker_notes || item.photos ? "Available" : "—")} />
                  <Row k="Completion pack" v={clean(item.completion_pack || (["completed", "complete"].includes(String(status).toLowerCase()) ? "Ready" : "Pending"))} />
                </Section>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <MapPin className="h-4 w-4 text-blue-700" />
                    <p className="mt-2 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Site</p>
                    <p className="mt-1 text-sm font-bold text-slate-900">{clean(item.address)}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <Clock3 className="h-4 w-4 text-blue-700" />
                    <p className="mt-2 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Schedule</p>
                    <p className="mt-1 text-sm font-bold text-slate-900">{clean(item.schedule || item.scheduled_for || item.scheduled_date)}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <ShieldCheck className="h-4 w-4 text-blue-700" />
                    <p className="mt-2 text-xs font-black uppercase tracking-[0.08em] text-slate-500">AI state</p>
                    <p className="mt-1 text-sm font-bold text-slate-900">Auto queued</p>
                  </div>
                </div>
                <AiAutomationSection type="job" status={status} />
              </>
            ) : null}

            {type === "client" ? (
              <>
                <Section title="Client" icon={<UserCheck className="h-4 w-4" />}>
                  <Row k="Name" v={clean(item.client_name || item.name)} />
                  <Row k="Phone" v={clean(item.phone)} />
                  <Row k="Email" v={clean(item.email)} />
                  <Row k="Address" v={clean(item.address)} />
                  <Row k="Notes" v={clean(item.notes)} />
                  <Row k="Unpaid balance" v={money(item.unpaid_balance || item.balance_due)} />
                </Section>
                <Section title="Timeline" icon={<Clock3 className="h-4 w-4" />}>
                  <p>{clean(item.timeline_summary || "Jobs, quotes, and invoices timeline available from activity feed.")}</p>
                </Section>
                <AiAutomationSection type="client" status={status} />
              </>
            ) : null}

            {type === "worker" ? (
              <>
                <Section title="Worker" icon={<UserCheck className="h-4 w-4" />}>
                  <Row k="Name" v={clean(item.worker_name || item.name)} />
                  <Row k="Contact" v={clean(item.phone || item.email)} />
                  <Row k="Role" v={clean(item.role)} />
                  <Row k="Status" v={status} />
                  <Row k="Region" v={clean(item.region)} />
                  <Row k="Assigned jobs" v={clean(item.assigned_jobs_count ?? item.assigned_jobs ?? "—")} />
                  <Row k="Invite" v={clean(item.invite_status || "active")} />
                </Section>
                <AiAutomationSection type="worker" status={status} />
              </>
            ) : null}

            {type === "unknown" ? (
              <FallbackBody item={Object.fromEntries(Object.entries(item).filter(([k, v]) => !HIDDEN_KEYS.has(k) && typeof v !== "object" && v !== "" && v !== null && v !== undefined))} />
            ) : null}
          </div>
        </div>

        <div className="border-t border-slate-200 bg-white px-5 py-4 md:px-6">
          {actions || <GenericActions onClose={onClose} />}
        </div>
      </div>
    </div>
  );
}
