import React from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";

const labels = {
  action_type: "Action type",
  job_id: "Job ID",
  quote_id: "Quote ID",
  invoice_id: "Invoice ID",
  client_id: "Client ID",
  worker_id: "Worker",
  job_title: "Job",
  job_name: "Job",
  service_type: "Service",
  status: "Status",
  job_status: "Job status",
  quote_status: "Quote status",
  invoice_status: "Invoice status",
  client_name: "Client",
  customer_name: "Customer",
  customer_email: "Email",
  client_email: "Email",
  email: "Email",
  phone: "Phone",
  job_address: "Job address",
  site_address: "Site address",
  address: "Address",
  scheduled_time: "Scheduled",
  scheduled_at: "Scheduled",
  worker_name: "Worker",
  assigned_worker_name: "Assigned worker",
  recommended_worker_name: "Recommended worker",
  subtotal: "Subtotal",
  price: "Price",
  gst: "GST",
  total: "Total",
  amount: "Amount",
  amount_due: "Amount due",
  quote_number: "Quote number",
  invoice_number: "Invoice number",
  due_date: "Due date",
  days_overdue: "Days overdue",
  description: "Description",
  invoice_description: "Invoice description",
  quote_description: "Quote description",
  job_description: "Job description",
  message: "Message",
  email_subject: "Email subject",
  email_body: "Email body",
  follow_up_message: "Follow-up message",
};

const hiddenFields = new Set(["business_id", "related_id", "related_entity_id", "source", "created_at", "updated_at", "checks", "source_records"]);

function has(value) {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return String(value).trim() !== "";
}

function clean(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.length ? JSON.stringify(value, null, 2) : "";
  if (typeof value === "object") return Object.keys(value).length ? JSON.stringify(value, null, 2) : "";
  return String(value);
}

function first(...values) {
  for (const value of values) if (has(value)) return value;
  return "";
}

function money(value) {
  const raw = clean(value);
  if (!raw) return "";
  const n = Number(String(raw).replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(n)) return raw;
  return n.toLocaleString("en-NZ", { style: "currency", currency: "NZD" });
}

function labelFor(key) {
  return labels[key] || String(key || "").replaceAll("_", " ");
}

function getId(action) {
  return String(action?.id || action?._id || action?.action_id || "");
}

function getType(action) {
  return String(action?.action_type || action?.type || "prepared_action").replaceAll("-", "_").toLowerCase();
}

function getPayload(action) {
  return { ...(action?.payload || {}), ...(action?.draft_payload || {}) };
}

function typeLabel(type) {
  const value = String(type || "").toLowerCase();
  if (value.includes("assign") || value.includes("worker")) return "Job assignment";
  if (value.includes("invoice_draft") || value.includes("create_invoice")) return "Draft invoice";
  if (value.includes("send_invoice")) return "Send invoice";
  if (value.includes("invoice") || value.includes("payment") || value.includes("reminder")) return "Invoice follow-up";
  if (value.includes("quote")) return "Quote follow-up";
  if (value.includes("job")) return "Job action";
  return "Prepared action";
}

function approveText(type) {
  const value = String(type || "").toLowerCase();
  if (value.includes("assign") || value.includes("worker")) return "Approve assignment";
  if (value.includes("invoice_draft") || value.includes("create_invoice")) return "Approve draft";
  if (value.includes("send_invoice")) return "Approve sending";
  if (value.includes("quote")) return "Approve follow-up";
  return "Approve action";
}

function requiredFields(type) {
  const value = String(type || "").toLowerCase();
  if (value.includes("assign") || value.includes("worker")) return ["job_id", "job_title", "client_name", "worker_id"];
  if (value.includes("invoice_draft") || value.includes("create_invoice")) return ["job_id", "client_name", "subtotal", "description"];
  if (value.includes("send_invoice")) return ["invoice_id", "customer_email", "total"];
  if (value.includes("invoice") || value.includes("payment") || value.includes("reminder")) return ["invoice_id", "customer_email", "amount_due", "message"];
  if (value.includes("quote")) return ["quote_id", "customer_email", "message"];
  if (value.includes("job")) return ["job_id", "job_title", "client_name"];
  return ["action_type"];
}

function actionTitle(action, form, type) {
  const fallback = action.title || "Prepared action";
  const client = first(form.client_name, form.customer_name, form.name);
  const invoice = first(form.invoice_number, form.invoice_id);
  if (String(type).includes("assign")) return "Assign job";
  if (String(type).includes("send_invoice")) return "Send invoice";
  if (String(type).includes("invoice")) return invoice ? `Review invoice ${invoice}` : "Review invoice";
  if (String(type).includes("quote")) return client ? "Follow up quote" : "Review quote";
  if (String(type).includes("job")) return "Review job action";
  return fallback;
}

function actionSummary(action, form, type, missing) {
  if (missing.length) return `Needs details first: ${missing.map(labelFor).join(", ")}.`;
  const value = String(type || "").toLowerCase();
  if (value.includes("assign") || value.includes("worker")) return "Churvox prepared a worker assignment for approval.";
  if (value.includes("send_invoice")) return "Invoice is ready to review before sending.";
  if (value.includes("invoice")) return "Churvox prepared the next invoice step.";
  if (value.includes("quote")) return "Churvox prepared a quote follow-up.";
  return action.summary || "Churvox prepared this from your business records.";
}

function normalize(action) {
  const type = getType(action);
  const raw = getPayload(action);
  const form = {
    ...raw,
    action_type: type,
    job_id: first(raw.job_id, type.includes("job") || type.includes("worker") || type.includes("invoice_draft") ? action.related_entity_id : ""),
    quote_id: first(raw.quote_id, type.includes("quote") ? action.related_entity_id : ""),
    invoice_id: first(raw.invoice_id, type.includes("invoice") && !type.includes("draft") ? action.related_entity_id : ""),
    client_name: first(raw.client_name, raw.customer_name),
    customer_name: first(raw.customer_name, raw.client_name),
    customer_email: first(raw.customer_email, raw.client_email, raw.email),
    total: first(raw.total, raw.amount_due, raw.amount, raw.subtotal, raw.price, raw.quote_amount),
    amount_due: first(raw.amount_due, raw.total, raw.amount),
    description: first(raw.description, raw.invoice_description, raw.quote_description, raw.job_description, raw.message),
  };
  const missing = requiredFields(type).filter((key) => !has(form[key]));
  const meta = [first(form.client_name, form.customer_name), money(first(form.total, form.amount_due, form.amount)), first(form.job_title, form.invoice_number, form.quote_number)].filter(Boolean).join(" · ");
  return { id: getId(action), type, ready: missing.length === 0, missing, title: actionTitle(action, form, type), meta, summary: actionSummary(action, form, type, missing), form };
}

function isLaunchAuditAction(item) {
  const blob = JSON.stringify(item || {});
  return [/PW E2E/i, /Playwright/i, /Deep Audit/i, /test reflect/i, /Test Client/i, /pw-e2e-/i, /audit@example\.com/i].some((pattern) => pattern.test(blob));
}

function editableKeys(form = {}, type = "", missing = []) {
  const value = String(type || "").toLowerCase();
  const important = ["client_name", "customer_name", "customer_email", "phone", "job_id", "job_title", "job_address", "worker_id", "worker_name", "invoice_id", "invoice_number", "quote_id", "quote_number", "subtotal", "gst", "total", "amount_due", "description", "message", "email_subject", "email_body", "due_date", "status"];
  const byType = value.includes("worker") || value.includes("assign") ? ["worker_id", "worker_name", "job_id", "job_title", "job_address"] : value.includes("invoice") ? ["invoice_id", "invoice_number", "customer_email", "amount_due", "total", "message", "description"] : value.includes("quote") ? ["quote_id", "quote_number", "customer_email", "message"] : [];
  const existing = Object.keys(form).filter((key) => !hiddenFields.has(key) && typeof form[key] !== "object");
  return [...new Set([...missing, ...byType, ...important, ...existing])].filter((key) => key && !hiddenFields.has(key));
}

const tileStyle = {
  background: "linear-gradient(135deg, #111827, #070d16)",
  color: "#fff",
  boxShadow: "0 22px 62px rgba(2,6,23,.24), inset 0 1px 0 rgba(255,255,255,.06)",
};

function Tape({ color = "#fb923c" }) {
  return <span aria-hidden="true" className="absolute left-0 top-0 h-full w-2 rounded-l-[30px]" style={{ background: `linear-gradient(180deg, ${color}, #facc15, #22d3ee)`, boxShadow: `0 0 18px ${color}66` }} />;
}

function DarkPanel({ children, color = "#fb923c", className = "" }) {
  return <section className={`relative overflow-hidden rounded-[30px] border border-white/10 p-5 pl-8 text-white ${className}`} style={tileStyle}><Tape color={color} />{children}</section>;
}

function Pill({ children, tone = "amber" }) {
  const cls = tone === "green" ? "bg-emerald-300 text-slate-950" : tone === "blue" ? "bg-cyan-300 text-slate-950" : tone === "red" ? "bg-red-300 text-slate-950" : tone === "slate" ? "bg-white/10 text-white ring-1 ring-white/10" : "bg-amber-300 text-slate-950";
  return <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[.14em] ${cls}`}>{children}</span>;
}

function StatCard({ label, value, copy, color = "#22d3ee", tone = "blue" }) {
  return <DarkPanel color={color} className="min-h-[150px]"><div className="flex items-start justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">{label}</div><div className="mt-3 text-4xl font-black tracking-[-.07em] text-white">{value}</div></div><Pill tone={tone}>OK</Pill></div><p className="mt-3 text-sm font-bold leading-6 text-slate-300">{copy}</p></DarkPanel>;
}

function ActionCard({ item, onOpen }) {
  return (
    <button type="button" onClick={() => onOpen(item)} className="relative overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.06] p-4 pl-7 text-left text-white transition hover:border-cyan-300/40 hover:bg-white/[0.09] active:scale-[.99]">
      <Tape color={item.ready ? "#34d399" : "#facc15"} />
      <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="text-[10px] font-black uppercase tracking-[.18em] text-amber-300">{typeLabel(item.type)}</div><h3 className="mt-2 truncate text-xl font-black tracking-[-.05em] text-white">{item.title}</h3>{item.meta ? <p className="mt-1 truncate text-sm font-black text-slate-300">{item.meta}</p> : null}</div><Pill tone={item.ready ? "green" : "amber"}>{item.ready ? "Ready" : "Needs details"}</Pill></div>
      <p className="mt-3 line-clamp-2 text-sm font-bold leading-6 text-slate-300">{item.summary}</p>
      <div className="mt-4 inline-flex rounded-2xl bg-amber-300 px-4 py-2 text-sm font-black text-slate-950">Review slip</div>
    </button>
  );
}

function Field({ name, form, setForm }) {
  const value = clean(form[name]);
  const big = ["message", "description", "invoice_description", "quote_description", "job_description", "email_body", "follow_up_message"].includes(name);
  return (
    <label className={`rounded-2xl border p-3 ${value ? "border-slate-200 bg-white" : "border-amber-200 bg-amber-50"}`}>
      <span className={`text-[10px] font-black uppercase tracking-[.14em] ${value ? "text-slate-500" : "text-amber-700"}`}>{value ? labelFor(name) : `Missing ${labelFor(name)}`}</span>
      {big ? <textarea rows={4} value={value} onChange={(event) => setForm((prev) => ({ ...prev, [name]: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold outline-none focus:border-orange-300" /> : <input value={value} onChange={(event) => setForm((prev) => ({ ...prev, [name]: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold outline-none focus:border-orange-300" />}
    </label>
  );
}

function Detail({ label, value, warn }) {
  return <div className={`rounded-2xl border p-4 ${warn ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"}`}><div className={`text-[10px] font-black uppercase tracking-[.14em] ${warn ? "text-amber-700" : "text-slate-500"}`}>{label}</div><div className="mt-2 whitespace-pre-wrap break-words text-sm font-black leading-6 text-slate-950">{clean(value) || "Not found"}</div></div>;
}

function SlipModal({ item, onClose, onChanged }) {
  const { patch, post } = useApi();
  const [form, setForm] = React.useState({ ...(item?.form || {}) });
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("");

  React.useEffect(() => { setForm({ ...(item?.form || {}) }); setMessage(""); }, [item?.id]);
  if (!item) return null;

  const type = String(item.type || form.action_type || "").toLowerCase();
  const missing = requiredFields(type).filter((key) => !has(form[key]));
  const ready = missing.length === 0;
  const keys = editableKeys(form, type, missing);
  const total = first(form.total, form.amount_due, form.amount, form.price, form.subtotal, form.quote_amount);
  const clientName = first(form.client_name, form.customer_name, form.name);
  const clientEmail = first(form.customer_email, form.client_email, form.email);
  const jobTitle = first(form.job_title, form.job_name, form.service_type);
  const workerName = first(form.worker_name, form.assigned_worker_name, form.recommended_worker_name, form.worker_id);

  async function saveOnly() {
    setBusy(true); setMessage("");
    try {
      const res = await patch(`/ai/operator/slips/${item.id}`, form);
      if (res?.success === false || res?.data?.success === false) throw new Error(res?.error || res?.data?.error || "Could not save slip");
      toast.success("Slip saved");
      setMessage("Saved. These details will be used when approved.");
      if (onChanged) await onChanged();
    } catch (error) { toast.error(error?.message || "Could not save slip"); setMessage(error?.message || "Could not save slip"); }
    finally { setBusy(false); }
  }

  async function approveNow() {
    if (!ready) { const names = missing.map(labelFor).join(", "); toast.error(`Missing: ${names}`); setMessage(`Missing before approval: ${names}`); return; }
    setBusy(true); setMessage("");
    try {
      const saveRes = await patch(`/ai/operator/slips/${item.id}`, form);
      if (saveRes?.success === false || saveRes?.data?.success === false) throw new Error(saveRes?.error || saveRes?.data?.error || "Could not save slip before approval");
      const runRes = await post(`/ai/operator/actions/${item.id}/approve-send-final`, form);
      if (runRes?.success === false || runRes?.data?.success === false) throw new Error(runRes?.error || runRes?.data?.error || "Approval failed");
      toast.success(runRes?.data?.message || "Approved");
      if (onChanged) await onChanged();
      onClose();
    } catch (error) { toast.error(error?.message || "Approval failed"); setMessage(error?.message || "Approval failed. Check the details and try again."); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-[2147483647] overflow-y-auto bg-slate-950/86 p-3 text-slate-950 backdrop-blur-sm md:p-6" role="dialog" aria-modal="true">
      <section className="mx-auto min-h-[calc(100dvh-24px)] max-w-6xl overflow-hidden rounded-[34px] border border-white/10 bg-[#f7f3ea] shadow-2xl md:min-h-[calc(100dvh-48px)]">
        <header className="border-b border-slate-200 bg-white p-5 md:p-7"><div className="flex items-start justify-between gap-4"><div><div className="inline-flex rounded-full bg-orange-100 px-3 py-1 text-[10px] font-black uppercase tracking-[.18em] text-orange-700">Approval slip</div><h1 className="mt-3 text-4xl font-black leading-[.95] tracking-[-.07em] text-slate-950 md:text-6xl">{item.title || typeLabel(type)}</h1><p className="mt-3 max-w-3xl text-sm font-bold leading-6 text-slate-600">Review, edit, save, then approve when it looks right.</p></div><button type="button" onClick={onClose} className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white">Close</button></div></header>
        <main className="grid gap-5 p-4 md:p-6 xl:grid-cols-[minmax(0,1fr)_360px]"><div className="space-y-5"><section className={`rounded-[28px] border p-5 ${ready ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}><div className={`text-[10px] font-black uppercase tracking-[.18em] ${ready ? "text-emerald-700" : "text-amber-700"}`}>{ready ? "Ready to approve" : "Needs details"}</div><h2 className="mt-2 text-3xl font-black tracking-[-.06em]">{ready ? "Everything needed is filled." : "Fill missing details before approval."}</h2>{!ready ? <div className="mt-4 flex flex-wrap gap-2">{missing.map((key) => <span key={key} className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-black text-amber-900">Missing {labelFor(key)}</span>)}</div> : null}</section><section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_12px_34px_rgba(15,23,42,.055)]"><div className="text-[10px] font-black uppercase tracking-[.18em] text-blue-600">Main details</div><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Detail label="Client" value={clientName} warn={!clientName} /><Detail label="Email" value={clientEmail} warn={(type.includes("send") || type.includes("quote") || type.includes("invoice")) && !clientEmail} /><Detail label="Amount" value={money(total)} warn={(type.includes("invoice") || type.includes("quote")) && !total} /><Detail label="Job" value={jobTitle} /><Detail label="Worker" value={workerName} warn={(type.includes("assign") || type.includes("worker")) && !workerName} /><Detail label="Action" value={typeLabel(type)} /></div></section><section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_12px_34px_rgba(15,23,42,.055)]"><div className="text-[10px] font-black uppercase tracking-[.18em] text-blue-600">Edit before approval</div><p className="mt-2 text-sm font-bold text-slate-600">Fix anything wrong here. Saved values are used when approved.</p><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{keys.map((key) => <Field key={key} name={key} form={form} setForm={setForm} />)}</div></section></div></main>
      </section>
    </div>
  );
}

export default function CommandDeskQueuePage() {
  const { get, post } = useApi();
  const [items, setItems] = React.useState([]);
  const [report, setReport] = React.useState(null);
  const [summary, setSummary] = React.useState(null);
  const [open, setOpen] = React.useState(null);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    const res = await get("/ai/operator/slips");
    const rows = Array.isArray(res?.data?.data) ? res.data.data : Array.isArray(res?.data?.actions) ? res.data.actions : [];
    setItems(rows.map(normalize));
    setReport(res?.data?.report || null);
    setSummary(res?.data?.summary || null);
  }, [get]);

  React.useEffect(() => { load(); }, [load]);

  async function rebuild() {
    setBusy(true);
    try {
      const res = await post("/ai/operator/rebuild-slips", {});
      if (res?.success) {
        const rows = Array.isArray(res?.data?.actions) ? res.data.actions : [];
        setItems(rows.map(normalize));
        setReport(res?.data?.report || null);
        setSummary(res?.data?.summary || null);
        toast.success(`Refreshed ${rows.length} action${rows.length === 1 ? "" : "s"}`);
      } else toast.error(res?.error || "Could not refresh approval queue");
    } finally { setBusy(false); }
  }

  async function repairCompletedJobs() {
    setBusy(true);
    try {
      const res = await post("/ai/operator/repair-completed-jobs", {});
      const ok = res?.success && res?.data?.success !== false;
      if (ok) { toast.success(res?.data?.message || res?.message || "Completed jobs checked"); await load(); }
      else toast.error(res?.data?.error || res?.error || "Could not check completed jobs");
    } catch (error) { toast.error(error?.message || "Could not check completed jobs"); }
    finally { setBusy(false); }
  }

  const visibleItems = items.filter((item) => !isLaunchAuditAction(item));
  const ready = visibleItems.filter((item) => item.ready);
  const needs = visibleItems.filter((item) => !item.ready);
  const visibleSummaryItems = Array.isArray(summary?.items) ? summary.items : [];
  const jobsFound = report?.jobs_found ?? 0;
  const invoicesFound = report?.invoices_found ?? 0;
  const quotesFound = report?.quotes_found ?? 0;

  return (
    <main className="fixed inset-0 z-[2147483000] overflow-y-auto bg-[#f7f3ea] text-slate-950" data-industrial-simple-page="command" data-command-canvas>
      <section className="mx-auto max-w-7xl p-4 pb-28 md:p-6 xl:p-8">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <DarkPanel className="min-h-[245px] p-6 pl-9 md:p-8 md:pl-10">
            <span className="inline-flex rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[.22em] text-amber-300">Command Board</span>
            <h1 className="mt-5 max-w-4xl text-5xl font-black leading-[.9] tracking-[-.08em] text-white md:text-7xl">Churvox does the admin. You approve.</h1>
            <p className="mt-4 max-w-3xl text-sm font-bold leading-7 text-slate-300 md:text-base">One place to see what needs doing, what Churvox prepared, and which exact job, invoice or quote needs your decision.</p>
            <div className="mt-6 flex flex-wrap gap-3"><button type="button" onClick={rebuild} disabled={busy} className="rounded-2xl bg-amber-300 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-amber-500/20 disabled:opacity-60">{busy ? "Refreshing…" : "Review AI actions"}</button><Link to="/jobs/new" className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white no-underline">Create job</Link></div>
          </DarkPanel>

          <DarkPanel color="#22d3ee" className="min-h-[245px]">
            <div className="flex items-start justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">AI priority</div><h2 className="mt-2 text-3xl font-black tracking-[-.06em] text-white">What needs approval</h2></div><Pill tone={ready.length ? "amber" : "green"}>{ready.length ? "Next" : "OK"}</Pill></div>
            <p className="mt-3 text-sm font-bold leading-6 text-slate-300">{ready.length ? `${ready.length} action${ready.length === 1 ? "" : "s"} ready for owner approval.` : needs.length ? `${needs.length} action${needs.length === 1 ? "" : "s"} need details.` : "No urgent approval waiting right now."}</p>
            <div className="mt-5 grid gap-3"><div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"><div className="text-sm font-black text-white">Daily admin check</div><div className="mt-1 text-xs font-bold leading-5 text-slate-300">Jobs, invoices, quotes and crew capacity checked.</div></div><div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"><div className="text-sm font-black text-white">Next best action</div><div className="mt-1 text-xs font-bold leading-5 text-slate-300">Review prepared actions or create the next job.</div></div></div>
          </DarkPanel>
        </section>

        <section className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Today’s jobs" value={jobsFound} copy="Jobs checked by the AI Operator." color="#facc15" tone="amber" />
          <StatCard label="Invoices" value={invoicesFound} copy="Invoice records checked for approval work." color="#34d399" tone="green" />
          <StatCard label="Quotes" value={quotesFound} copy="Quote records checked for follow-up." color="#22d3ee" tone="blue" />
          <StatCard label="Approvals" value={visibleItems.length} copy="Prepared admin slips waiting in Churvox." color="#fb923c" tone={visibleItems.length ? "amber" : "green"} />
        </section>

        {summary ? <section className="mt-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_12px_34px_rgba(15,23,42,.055)]"><div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-600">Today’s review</div><h2 className="mt-2 text-3xl font-black tracking-[-.06em] text-slate-950">What needs approval</h2><p className="mt-2 text-sm font-bold text-slate-600">{summary.headline || "Churvox checked your business and prepared the next admin actions."}</p>{visibleSummaryItems.length ? <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-5">{visibleSummaryItems.map((summaryItem) => <div key={summaryItem} className="rounded-2xl bg-slate-50 p-3 text-sm font-black text-slate-800">{summaryItem}</div>)}</div> : null}</section> : null}

        <section className="mt-5 rounded-[30px] border border-white/10 p-5 text-white shadow-[0_22px_62px_rgba(2,6,23,.22)]" style={tileStyle}><div className="flex flex-wrap items-end justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">Approval queue</div><h2 className="mt-2 text-3xl font-black tracking-[-.06em] text-white">Prepared actions</h2></div><div className="text-sm font-bold text-slate-300">Tap a card to open its slip.</div></div>{visibleItems.length ? <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visibleItems.slice(0, 24).map((item) => <ActionCard key={item.id || item.title} item={item} onOpen={setOpen} />)}</div> : <div className="mt-5 rounded-2xl border border-amber-300/25 bg-amber-300/10 p-5 text-sm font-black text-amber-100">No prepared actions yet. Tap Review AI actions to check completed jobs, invoices and quote follow-ups.</div>}</section>

        <div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={repairCompletedJobs} disabled={busy} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-950 disabled:opacity-60">{busy ? "Checking…" : "Check completed jobs"}</button><Link to="/jobs" className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-950 no-underline">Open jobs</Link><Link to="/crew-map" className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-950 no-underline">Crew Dispatch</Link></div>
      </section>
      {open ? <SlipModal item={open} onClose={() => setOpen(null)} onChanged={load} /> : null}
    </main>
  );
}
