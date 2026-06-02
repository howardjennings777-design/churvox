import React from "react";
import { Link, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";

const nav = [
  ["Command Board", "/dashboard", "CB"],
  ["Jobs", "/jobs", "JB"],
  ["Crew Map", "/crew-map", "MP"],
  ["Clients", "/clients", "CL"],
  ["Quotes", "/quotes", "QT"],
  ["Invoices", "/invoices", "IV"],
  ["Team", "/team", "TM"],
  ["Settings", "/settings", "ST"],
  ["Support", "/support", "?"],
];

const labels = {
  job_id: "Job ID",
  quote_id: "Quote ID",
  invoice_id: "Invoice ID",
  job_title: "Job",
  client_name: "Client",
  customer_name: "Customer",
  customer_email: "Customer email",
  client_phone: "Phone",
  client_address: "Client address",
  job_address: "Job address",
  scheduled_time: "Scheduled",
  worker_id: "Worker to assign",
  worker_name: "Worker",
  recommended_worker_name: "AI recommended",
  conflict_check: "Why this worker",
  subtotal: "Amount",
  price: "Price",
  gst_rate: "GST",
  total: "Total",
  amount_due: "Amount due",
  description: "Invoice description",
  message: "Message",
  quote_number: "Quote number",
  quote_amount: "Quote amount",
  invoice_number: "Invoice number",
  due_date: "Due date",
  days_overdue: "Days overdue",
  client_history: "Client history",
  worker_note: "Worker notes",
  time_worked: "Time worked",
  proof_summary: "Proof",
};

const fieldOrder = [
  "client_name", "customer_name", "customer_email", "client_phone", "client_address", "client_history",
  "job_title", "job_address", "scheduled_time", "worker_id", "worker_name", "recommended_worker_name", "conflict_check",
  "quote_number", "quote_amount", "invoice_number", "total", "amount_due", "due_date", "days_overdue",
  "subtotal", "price", "gst_rate", "description", "message", "worker_note", "time_worked", "proof_summary",
  "job_id", "quote_id", "invoice_id",
];

const hidden = new Set(["available_workers", "business_id", "related_id", "related_entity_id", "source", "net_minutes"]);

function has(v) {
  return v !== undefined && v !== null && String(v).trim() !== "";
}

function value(...items) {
  return items.find(has) || "";
}

function getId(action) {
  return String(action?.id || action?._id || action?.action_id || "");
}

function getType(action) {
  return String(action?.action_type || action?.type || "").replaceAll("-", "_").toLowerCase();
}

function getPayload(action) {
  return { ...(action?.payload || {}), ...(action?.draft_payload || {}) };
}

function typeLabel(type) {
  if (type === "assign_worker") return "Assign worker";
  if (type === "create_invoice_draft" || type.includes("invoice_draft")) return "Draft invoice";
  if (type === "send_invoice") return "Send invoice";
  if (type === "invoice_reminder") return "Payment reminder";
  if (type.includes("quote")) return "Quote follow-up";
  if (type.includes("job_review")) return "Job review";
  return "Prepared slip";
}

function approveText(type) {
  if (type === "assign_worker") return "Approve assignment";
  if (type === "create_invoice_draft" || type.includes("invoice_draft")) return "Approve + create draft";
  if (type === "send_invoice") return "Approve + send invoice";
  if (type === "invoice_reminder") return "Approve + send reminder";
  if (type.includes("quote")) return "Approve + send follow-up";
  if (type.includes("job_review")) return "Approve review";
  return "Approve";
}

function outcome(type) {
  if (type === "assign_worker") return "Assigns the selected worker to the job and logs the decision.";
  if (type === "create_invoice_draft" || type.includes("invoice_draft")) return "Creates a draft invoice only. It does not email the customer.";
  if (type === "send_invoice") return "Approves the slip and emails the invoice to the customer.";
  if (type === "invoice_reminder") return "Approves the slip and emails the payment reminder to the customer.";
  if (type.includes("quote")) return "Approves the slip and emails the quote follow-up to the customer.";
  if (type.includes("job_review")) return "Approves the job review and moves time toward payroll review.";
  return "Approval blocked until this slip has a known action.";
}

function required(type) {
  if (type === "assign_worker") return ["job_id", "job_title", "client_name", "job_address", "worker_id"];
  if (type === "create_invoice_draft" || type.includes("invoice_draft")) return ["job_id", "job_title", "client_name", "subtotal", "description"];
  if (type === "send_invoice") return ["invoice_id", "invoice_number", "customer_name", "customer_email", "total"];
  if (type === "invoice_reminder") return ["invoice_id", "invoice_number", "customer_name", "customer_email", "amount_due", "message"];
  if (type.includes("quote")) return ["quote_id", "quote_number", "customer_name", "customer_email", "message"];
  if (type.includes("job_review")) return ["job_id", "job_title", "client_name", "worker_name"];
  return ["action_type"];
}

function normalize(action) {
  const type = getType(action);
  const raw = getPayload(action);
  const form = {
    ...raw,
    action_type: type,
    job_id: value(raw.job_id, (type.includes("job") || type.includes("worker") || type.includes("invoice_draft")) ? action.related_entity_id : ""),
    quote_id: value(raw.quote_id, type.includes("quote") ? action.related_entity_id : ""),
    invoice_id: value(raw.invoice_id, (type.includes("invoice") && !type.includes("draft")) ? action.related_entity_id : ""),
    client_name: value(raw.client_name, raw.customer_name),
    customer_name: value(raw.customer_name, raw.client_name),
    total: value(raw.total, raw.amount, raw.subtotal, raw.price),
    amount_due: value(raw.amount_due, raw.total, raw.amount),
    description: value(raw.description, raw.invoice_description, raw.worker_note),
  };
  const missing = required(type).filter((key) => !has(form[key]));
  return {
    id: getId(action),
    type,
    ready: missing.length === 0,
    missing,
    title: action.title || typeLabel(type),
    summary: action.summary || "Prepared from connected Churvox records.",
    checks: action.checks || ["Client record checked", "Related record checked", "Owner approval required"],
    form,
  };
}

function fieldKeys(form, missing = []) {
  const out = [];
  fieldOrder.forEach((key) => {
    if (!hidden.has(key) && has(form[key])) out.push(key);
  });
  missing.forEach((key) => {
    if (!out.includes(key) && !hidden.has(key)) out.push(key);
  });
  Object.keys(form || {}).forEach((key) => {
    if (!out.includes(key) && !hidden.has(key) && has(form[key]) && typeof form[key] !== "object") out.push(key);
  });
  return out;
}

function Sidebar() {
  const { pathname } = useLocation();
  return (
    <aside className="hidden w-[292px] shrink-0 overflow-y-auto bg-[#0f1722] p-4 text-white lg:block">
      <div className="mb-6 flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-400 font-black text-slate-950">C</div>
        <div>
          <div className="text-sm font-black">CHURVOX</div>
          <div className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">Command Desk</div>
        </div>
      </div>
      <nav className="space-y-1">
        {nav.map(([label, href, icon]) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link key={href} to={href} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-black ${active ? "bg-cyan-300 text-slate-950" : "text-slate-300 hover:bg-white/10"}`}>
              <span className="grid h-7 w-7 place-items-center rounded-xl bg-white/10 text-[10px]">{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

function Field({ name, form, setForm }) {
  const label = labels[name] || name.replaceAll("_", " ");
  if (name === "worker_id" && Array.isArray(form.available_workers) && form.available_workers.length) {
    return (
      <label className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <span className="text-[10px] font-black uppercase tracking-[.14em] text-slate-500">{label}</span>
        <select value={form.worker_id || ""} onChange={(e) => setForm((prev) => ({ ...prev, worker_id: e.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold">
          <option value="">Choose worker</option>
          {form.available_workers.map((worker) => (
            <option key={worker.id || worker.email || worker.name} value={worker.id || worker.email}>
              {[worker.name, worker.region, worker.reason].filter(Boolean).join(" · ")}
            </option>
          ))}
        </select>
      </label>
    );
  }

  const big = ["message", "description", "worker_note", "client_history", "conflict_check"].includes(name);
  return (
    <label className={`rounded-2xl border p-3 ${has(form[name]) ? "border-slate-200 bg-slate-50" : "border-amber-200 bg-amber-50"}`}>
      <span className={`text-[10px] font-black uppercase tracking-[.14em] ${has(form[name]) ? "text-slate-500" : "text-amber-700"}`}>
        {has(form[name]) ? label : `Missing ${label}`}
      </span>
      {big ? (
        <textarea rows={name === "message" || name === "description" ? 5 : 3} value={form[name] || ""} onChange={(e) => setForm((prev) => ({ ...prev, [name]: e.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold" />
      ) : (
        <input value={form[name] || ""} onChange={(e) => setForm((prev) => ({ ...prev, [name]: e.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold" />
      )}
    </label>
  );
}

function SlipModal({ item, onClose, onChanged }) {
  const { patch, post } = useApi();
  const [form, setForm] = React.useState(item.form);
  const [busy, setBusy] = React.useState(false);
  const missing = required(item.type).filter((key) => !has(form[key]));
  const ready = missing.length === 0;

  const save = async () => {
    setBusy(true);
    const res = await patch(`/ai/operator/slips/${item.id}`, form);
    setBusy(false);
    if (res?.success) {
      toast.success("Slip saved");
      onChanged();
      onClose();
    } else {
      toast.error(res?.error || "Could not save slip");
    }
  };

  const approve = async () => {
    const sendTypes = new Set(["send_invoice", "invoice_reminder", "quote_follow_up"]);
    const isSendSlip = sendTypes.has(item.type) || item.type.includes("quote");

    if (!ready) {
      toast.error(`Missing: ${missing.map((key) => labels[key] || key).join(", ")}`);
      return;
    }

    setBusy(true);
    const res = await post(`/ai/operator/actions/${item.id}/approve-send-final`, form);
    setBusy(false);

    const appOk = res?.success && res?.data?.success !== false;

    if (appOk) {
      toast.success(res?.data?.message || (isSendSlip ? "Approved + sent with PDF" : "Approved"));
      onClose();
      await onChanged();
      return;
    }

    toast.error(res?.data?.error || res?.error || (isSendSlip ? "Could not send" : "Could not approve"));
  };

  return (
    <div
      className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-slate-950/65 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[32px] border border-white/40 bg-[#f5f7f1] shadow-2xl">
        <header className="relative rounded-t-[32px] bg-[#0f1722] p-5 pr-16 text-white sm:p-6 sm:pr-20">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-2xl border border-white/15 bg-white/10 text-lg font-black text-white hover:bg-white/20"
            aria-label="Close slip"
          >
            ×
          </button>
          <div className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-200">{ready ? "Ready to approve" : "Needs details"}</div>
          <h1 className="mt-2 text-3xl font-black tracking-[-.06em] sm:text-4xl">{typeLabel(item.type)}</h1>
          <p className="mt-2 text-sm font-bold text-slate-300">{item.summary}</p>
        </header>

        <main className="grid flex-1 gap-4 overflow-y-auto p-4 xl:grid-cols-[1fr_340px]">
          <section className="space-y-4 pb-2">
            <div className={`rounded-[24px] border p-5 ${ready ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
              <h2 className="text-2xl font-black">{ready ? "Looks ready — check then approve" : "Do not approve yet"}</h2>
              <p className="mt-2 text-sm font-bold text-slate-700">
                {ready ? "Required details are filled. Check customer, job, amount, worker and wording before approving." : `Missing: ${missing.map((key) => labels[key] || key).join(", ")}`}
              </p>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-white p-5">
              <h2 className="text-xl font-black">Everything Churvox pulled</h2>
              <p className="mt-1 text-sm font-bold text-slate-500">Fill missing fields here or fix the original client/job/quote/invoice record and rebuild.</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {fieldKeys(form, missing).map((key) => <Field key={key} name={key} form={form} setForm={setForm} />)}
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-white p-5">
              <h2 className="text-xl font-black">Checks</h2>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {item.checks.map((check) => <div key={check} className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-bold">✓ {check}</div>)}
              </div>
            </div>
          </section>

          <aside>
            <div className="rounded-[24px] bg-[#143658] p-5 text-white">
              <div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-200">When you approve</div>
              <p className="mt-3 text-sm font-bold leading-6 text-slate-200">{outcome(item.type)}</p>
              {!ready && <button onClick={save} disabled={busy} className="mt-5 w-full rounded-2xl bg-amber-400 px-5 py-3 text-sm font-black text-slate-950 disabled:opacity-40">{busy ? "Saving…" : "Save details"}</button>}
              <button onClick={approve} disabled={busy || !ready} className="mt-3 w-full rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 disabled:opacity-40">{busy ? (["send_invoice", "invoice_reminder", "quote_follow_up"].includes(item.type) || item.type.includes("quote") ? "Approving + sending…" : "Approving…") : approveText(item.type)}</button>
              <button onClick={onClose} className="mt-3 w-full rounded-2xl border border-white/15 px-5 py-3 text-sm font-black hover:bg-white/10">Close slip</button>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}

export default function CommandDeskQueuePage() {
  const { get, post } = useApi();
  const [items, setItems] = React.useState([]);
  const [report, setReport] = React.useState(null);
  const [open, setOpen] = React.useState(null);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    const res = await get("/ai/operator/slips");
    const rows = Array.isArray(res?.data?.data) ? res.data.data : Array.isArray(res?.data?.actions) ? res.data.actions : [];
    setItems(rows.map(normalize));
    setReport(res?.data?.report || null);
  }, [get]);

  React.useEffect(() => { load(); }, [load]);

  const rebuild = async () => {
    setBusy(true);
    const res = await post("/ai/operator/rebuild-slips", {});
    setBusy(false);
    if (res?.success) {
      const rows = Array.isArray(res?.data?.actions) ? res.data.actions : [];
      setItems(rows.map(normalize));
      setReport(res?.data?.report || null);
      toast.success(`Rebuilt ${rows.length} slip${rows.length === 1 ? "" : "s"}`);
    } else {
      toast.error(res?.error || "Could not rebuild slips");
    }
  };

  const ready = items.filter((item) => item.ready);
  const needs = items.filter((item) => !item.ready);

  return (
    <main className="fixed inset-0 z-[2147483000] overflow-y-auto bg-[#f5f7f1] text-slate-950">
      <div className="flex min-h-screen">
        <Sidebar />
        <section className="min-w-0 flex-1 p-5 lg:p-8">
          <header className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-slate-200 bg-white px-5 py-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[.2em] text-slate-500">Command Board · clean strong slips</div>
              <h1 className="text-3xl font-black tracking-[-.05em]">Real slips only.</h1>
              <p className="text-sm font-bold text-slate-500">One slip system. Old weak AI actions are cleared, then rebuilt from real jobs, clients, quotes and invoices.</p>
            </div>
            <button onClick={rebuild} disabled={busy} className="rounded-full bg-emerald-500 px-5 py-3 text-xs font-black uppercase tracking-[.14em] text-white disabled:opacity-60">
              {busy ? "Rebuilding…" : "Clear old slips + rebuild"}
            </button>
          </header>

          <section className="grid gap-5 xl:grid-cols-[1fr_420px]">
            <div className="rounded-[28px] bg-slate-950 p-6 text-white">
              <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.2em] text-cyan-200">No guessing approvals</span>
              <h1 className="mt-4 max-w-3xl text-4xl font-black leading-[.95] tracking-[-.07em] lg:text-5xl">Churvox prepares. You check. Then approve.</h1>
              <p className="mt-4 max-w-2xl text-sm font-bold leading-6 text-slate-300">A slip must show the client, record, amount, worker or message needed before it can run.</p>
            </div>

            <aside className="rounded-[28px] border border-slate-200 bg-white p-5">
              <h2 className="text-2xl font-black">Queue</h2>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-emerald-50 p-4"><div className="text-3xl font-black text-emerald-700">{ready.length}</div><div className="text-xs font-black">ready</div></div>
                <div className="rounded-2xl bg-amber-50 p-4"><div className="text-3xl font-black text-amber-700">{needs.length}</div><div className="text-xs font-black">needs details</div></div>
              </div>
            </aside>
          </section>

          {report && (
            <section className="mt-5 rounded-[28px] border border-slate-200 bg-white p-5">
              <h2 className="text-2xl font-black">What Churvox can see</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <div className="rounded-2xl bg-slate-50 p-4"><div className="text-3xl font-black">{report.jobs_found ?? 0}</div><div className="text-xs font-black text-slate-500">jobs</div><div className="mt-1 text-[10px] font-black text-blue-600">{report.jobs_scope_mode}</div></div>
                <div className="rounded-2xl bg-slate-50 p-4"><div className="text-3xl font-black">{report.quotes_found ?? 0}</div><div className="text-xs font-black text-slate-500">quotes</div><div className="mt-1 text-[10px] font-black text-blue-600">{report.quotes_scope_mode}</div></div>
                <div className="rounded-2xl bg-slate-50 p-4"><div className="text-3xl font-black">{report.invoices_found ?? 0}</div><div className="text-xs font-black text-slate-500">invoices</div><div className="mt-1 text-[10px] font-black text-blue-600">{report.invoices_scope_mode}</div></div>
                <div className="rounded-2xl bg-slate-50 p-4"><div className="text-3xl font-black">{report.slips_created ?? 0}</div><div className="text-xs font-black text-slate-500">slips created</div></div>
              </div>
            </section>
          )}

          <section className="mt-5 rounded-[28px] border border-slate-200 bg-white p-5">
            <h2 className="text-3xl font-black tracking-[-.06em]">Prepared slips</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {items.slice(0, 12).map((item) => (
                <button key={item.id || item.title} onClick={() => setOpen(item)} className={`rounded-[22px] border p-4 text-left hover:border-blue-300 ${item.ready ? "bg-white" : "border-amber-200 bg-amber-50"}`}>
                  <div className={`text-[10px] font-black uppercase tracking-[.18em] ${item.ready ? "text-blue-600" : "text-amber-700"}`}>
                    {item.ready ? "Ready" : "Needs details"} · {typeLabel(item.type)}
                  </div>
                  <div className="mt-2 text-lg font-black">{item.title}</div>
                  <p className="mt-2 text-sm font-bold text-slate-600">
                    {item.ready ? item.summary : `Missing: ${item.missing.map((key) => labels[key] || key).join(", ")}`}
                  </p>
                  <div className="mt-3 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white">Open slip</div>
                </button>
              ))}
            </div>
            {!items.length && (
              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-black text-amber-900">
                No slips yet. Click rebuild. The “What Churvox can see” box will show whether jobs, quotes or invoices exist.
              </div>
            )}
          </section>
        </section>
      </div>
      {open && <SlipModal item={open} onClose={() => setOpen(null)} onChanged={load} />}
    </main>
  );
}
