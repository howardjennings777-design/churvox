import React from "react";
import { Link, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";

const NAV = [
  ["Command Board", "/dashboard", "CB"],
  ["Jobs", "/jobs", "JB"],
  ["Dispatch", "/dispatch", "DP"],
  ["Crew Map", "/crew-map", "MP"],
  ["Clients", "/clients", "CL"],
  ["Quotes", "/quotes", "QT"],
  ["Invoices", "/invoices", "IV"],
  ["Team", "/team", "TM"],
  ["Plans", "/plans", "PL"],
  ["Settings", "/settings", "ST"],
  ["Support", "/support", "?"],
];

const FIELD_LABELS = {
  client_name: "Client",
  customer_name: "Client",
  customer_email: "Customer email",
  client_phone: "Phone",
  client_address: "Client address",
  client_history: "Client history",
  job_title: "Job",
  job_address: "Job address",
  scheduled_time: "Scheduled",
  worker_id: "Worker to assign",
  recommended_worker_name: "AI recommended worker",
  conflict_check: "Why this worker",
  available_workers: "Available workers",
  worker_name: "Worker",
  worker_note: "Worker notes",
  time_worked: "Time worked",
  proof_summary: "Proof / photos",
  price: "Job price",
  subtotal: "Subtotal",
  gst_rate: "GST rate",
  quote_number: "Quote number",
  quote_amount: "Quote amount",
  invoice_number: "Invoice number",
  total: "Invoice total",
  amount_due: "Amount due",
  due_date: "Due date",
  days_overdue: "Days overdue",
  description: "Description",
  message: "Message to send",
  job_id: "Job ID",
  quote_id: "Quote ID",
  invoice_id: "Invoice ID",
};

const FIELD_ORDER = [
  "client_name", "customer_name", "customer_email", "client_phone", "client_address", "client_history",
  "job_title", "job_address", "scheduled_time", "worker_id", "recommended_worker_name", "conflict_check",
  "worker_name", "worker_note", "time_worked", "proof_summary", "price", "subtotal", "gst_rate",
  "quote_number", "quote_amount", "invoice_number", "total", "amount_due", "due_date", "days_overdue",
  "description", "message", "job_id", "quote_id", "invoice_id",
];

const HIDDEN_FIELDS = new Set(["business_id", "related_entity_id", "related_id", "source", "net_minutes", "photo_count"]);

function value(...items) {
  return items.find((item) => item !== undefined && item !== null && String(item).trim() !== "") || "";
}

function actionId(action) {
  return String(action?.id || action?._id || action?.action_id || "");
}

function actionType(action) {
  return String(action?.action_type || action?.type || "").replaceAll("-", "_").toLowerCase();
}

function payload(action) {
  return { ...(action?.payload || {}), ...(action?.draft_payload || {}) };
}

function slipName(type) {
  if (type === "assign_worker") return "Assign worker";
  if (type === "create_invoice_draft" || type.includes("invoice_draft")) return "Draft invoice";
  if (type === "send_invoice") return "Send invoice";
  if (type === "invoice_reminder") return "Payment reminder";
  if (type === "quote_follow_up" || type.includes("quote")) return "Quote follow-up";
  if (type === "job_review" || type.includes("job_review")) return "Job review";
  return "Unknown slip";
}

function approveText(type) {
  if (type === "assign_worker") return "Approve assignment";
  if (type === "create_invoice_draft" || type.includes("invoice_draft")) return "Create draft invoice";
  if (type === "send_invoice") return "Email invoice";
  if (type === "invoice_reminder") return "Send reminder";
  if (type === "quote_follow_up" || type.includes("quote")) return "Send follow-up";
  if (type === "job_review" || type.includes("job_review")) return "Approve job review";
  return "Approve";
}

function outcome(type) {
  if (type === "assign_worker") return "Churvox assigns the selected worker to the job and logs the decision.";
  if (type === "create_invoice_draft" || type.includes("invoice_draft")) return "Churvox creates a draft invoice only. It does not email the customer from this step.";
  if (type === "send_invoice") return "Churvox emails the invoice link to the customer.";
  if (type === "invoice_reminder") return "Churvox emails the payment reminder to the customer.";
  if (type === "quote_follow_up" || type.includes("quote")) return "Churvox emails the quote follow-up to the customer.";
  if (type === "job_review" || type.includes("job_review")) return "Churvox approves the completed job review and moves the time toward payroll review.";
  return "Unknown action. Churvox will not run it from this page.";
}

function requiredFields(type) {
  if (type === "assign_worker") return ["job_id", "job_title", "client_name", "job_address", "worker_id"];
  if (type === "create_invoice_draft" || type.includes("invoice_draft")) return ["job_id", "job_title", "client_name", "subtotal", "description"];
  if (type === "send_invoice") return ["invoice_id", "invoice_number", "customer_name", "customer_email", "total"];
  if (type === "invoice_reminder") return ["invoice_id", "invoice_number", "customer_name", "customer_email", "amount_due", "message"];
  if (type === "quote_follow_up" || type.includes("quote")) return ["quote_id", "quote_number", "customer_name", "customer_email", "message"];
  if (type === "job_review" || type.includes("job_review")) return ["job_id", "job_title", "client_name", "worker_name"];
  return ["__known_type_required__"];
}

function normaliseAction(raw) {
  const type = actionType(raw);
  const p = payload(raw);
  const form = {
    ...p,
    job_id: value(p.job_id, type.includes("job") || type.includes("worker") || type.includes("invoice_draft") ? raw?.related_entity_id : ""),
    quote_id: value(p.quote_id, type.includes("quote") ? raw?.related_entity_id : ""),
    invoice_id: value(p.invoice_id, type.includes("invoice") && !type.includes("draft") ? raw?.related_entity_id : ""),
    client_name: value(p.client_name, p.customer_name),
    customer_name: value(p.customer_name, p.client_name),
    total: value(p.total, p.amount, p.subtotal, p.price),
    amount_due: value(p.amount_due, p.total, p.amount),
    description: value(p.description, p.invoice_description, p.worker_note),
  };
  const missing = requiredFields(type).filter((key) => !value(form[key]));
  const known = !requiredFields(type).includes("__known_type_required__");
  if (!known || missing.length) return null;
  return {
    id: actionId(raw),
    type,
    title: raw?.title || slipName(type),
    summary: raw?.summary || `${slipName(type)} prepared from connected records.`,
    checks: raw?.checks || ["Client record pulled", "Related record pulled", "Required fields checked", "Owner approval required"],
    form,
    raw,
  };
}

function displayFields(form) {
  const keys = [];
  FIELD_ORDER.forEach((key) => {
    if (!HIDDEN_FIELDS.has(key) && value(form[key])) keys.push(key);
  });
  Object.keys(form || {}).forEach((key) => {
    if (!keys.includes(key) && !HIDDEN_FIELDS.has(key) && value(form[key]) && typeof form[key] !== "object") keys.push(key);
  });
  return keys;
}

function Sidebar() {
  const { pathname } = useLocation();
  return (
    <aside className="hidden w-[292px] shrink-0 overflow-y-auto border-r border-slate-800 bg-[#0f1722] p-4 text-white lg:block">
      <div className="mb-6 flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-400 font-black text-slate-950">C</div>
        <div><div className="text-sm font-black">CHURVOX</div><div className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">Command Desk</div></div>
      </div>
      <nav className="space-y-1">
        {NAV.map(([label, href, icon]) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return <Link key={href} to={href} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-black ${active ? "bg-cyan-300 text-slate-950" : "text-slate-300 hover:bg-white/10"}`}><span className="grid h-7 w-7 place-items-center rounded-xl bg-white/10 text-[10px] font-black">{icon}</span>{label}</Link>;
        })}
      </nav>
    </aside>
  );
}

function Field({ name, form, setForm }) {
  const label = FIELD_LABELS[name] || name.replaceAll("_", " ");
  if (name === "worker_id" && Array.isArray(form.available_workers) && form.available_workers.length) {
    return (
      <label className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <span className="text-[10px] font-black uppercase tracking-[.14em] text-slate-500">{label}</span>
        <select value={form.worker_id || ""} onChange={(e) => setForm((prev) => ({ ...prev, worker_id: e.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900">
          {form.available_workers.map((worker) => <option key={worker.id || worker.email || worker.name} value={worker.id || worker.email}>{[worker.name, worker.region, worker.reason].filter(Boolean).join(" · ")}</option>)}
        </select>
      </label>
    );
  }
  const big = ["message", "description", "worker_note", "client_history", "conflict_check"].includes(name);
  return (
    <label className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <span className="text-[10px] font-black uppercase tracking-[.14em] text-slate-500">{label}</span>
      {big ? <textarea rows={name === "message" || name === "description" ? 5 : 3} value={form[name] || ""} onChange={(e) => setForm((prev) => ({ ...prev, [name]: e.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900" /> : <input value={form[name] || ""} onChange={(e) => setForm((prev) => ({ ...prev, [name]: e.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900" />}
    </label>
  );
}

function Slip({ action, close, done }) {
  const { post } = useApi();
  const [form, setForm] = React.useState(action.form);
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => setForm(action.form), [action]);
  const missing = requiredFields(action.type).filter((key) => !value(form[key]));
  const approve = async () => {
    if (missing.length) {
      toast.error(`Missing: ${missing.map((key) => FIELD_LABELS[key] || key).join(", ")}`);
      return;
    }
    setBusy(true);
    const res = await post(`/ai/operator/actions/${action.id}/execute`, form);
    setBusy(false);
    if (res?.success) {
      toast.success("Approved — Churvox executed it");
      done(action.id);
      close();
    } else {
      toast.error(res?.error || "Could not approve");
    }
  };
  return (
    <div className="fixed inset-0 z-[2147483647] overflow-y-auto bg-[#f5f7f1] p-4 text-slate-950">
      <div className="mx-auto max-w-6xl">
        <header className="rounded-[28px] bg-[#0f1722] p-6 text-white">
          <div className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-200">{missing.length ? "Needs details" : "Ready to approve"}</div>
          <h1 className="mt-2 text-4xl font-black tracking-[-.06em]">{slipName(action.type)}</h1>
          <p className="mt-2 max-w-4xl text-sm font-bold text-slate-300">{action.summary}</p>
        </header>
        <main className="mt-4 grid gap-4 xl:grid-cols-[1fr_340px]">
          <section className="space-y-4">
            <div className={`rounded-[24px] border p-5 ${missing.length ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
              <h2 className="text-2xl font-black">{missing.length ? "Do not approve yet" : "Looks ready — check then approve"}</h2>
              <p className="mt-2 text-sm font-bold text-slate-700">{missing.length ? `Missing: ${missing.map((key) => FIELD_LABELS[key] || key).join(", ")}` : "Required details are filled. Check customer, job, amount, worker and wording."}</p>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-white p-5">
              <h2 className="text-xl font-black">Everything Churvox pulled</h2>
              <p className="mt-1 text-sm font-bold text-slate-500">Only real slips with connected data appear here. No empty generic approvals.</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">{displayFields(form).map((name) => <Field key={name} name={name} form={form} setForm={setForm} />)}</div>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-white p-5">
              <h2 className="text-xl font-black">Checks</h2>
              <div className="mt-3 grid gap-2 md:grid-cols-2">{action.checks.map((check) => <div key={check} className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-bold">✓ {check}</div>)}</div>
            </div>
          </section>
          <aside className="space-y-4">
            <div className="rounded-[24px] bg-[#143658] p-5 text-white">
              <div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-200">When you approve</div>
              <p className="mt-3 text-sm font-bold leading-6 text-slate-200">{outcome(action.type)}</p>
              <button onClick={approve} disabled={busy || missing.length} className="mt-5 w-full rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 disabled:opacity-40">{busy ? "Executing…" : approveText(action.type)}</button>
              <button onClick={close} className="mt-3 w-full rounded-2xl border border-white/15 px-5 py-3 text-sm font-black">Close</button>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}

export default function CommandDeskSafePage() {
  const { get, post } = useApi();
  const [actions, setActions] = React.useState([]);
  const [hiddenCount, setHiddenCount] = React.useState(0);
  const [selected, setSelected] = React.useState(null);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    const res = await get("/ai/operator/approval-items-safe");
    const rows = Array.isArray(res?.data?.data) ? res.data.data : Array.isArray(res?.data?.actions) ? res.data.actions : [];
    const prepared = rows.map(normaliseAction).filter(Boolean);
    setActions(prepared);
    setHiddenCount(Number(res?.data?.blocked_count || rows.length - prepared.length || 0));
  }, [get]);

  React.useEffect(() => { load(); }, [load]);

  const scan = async () => {
    setBusy(true);
    let res = await post("/ai/operator/scan-deep", {});
    if (!res?.success) res = await post("/ai/operator/scan", {});
    setBusy(false);
    if (res?.success) {
      toast.success("Deep AI scan complete");
      await load();
    } else {
      toast.error(res?.error || "AI scan failed");
    }
  };

  return (
    <main className="fixed inset-0 z-[2147483000] overflow-y-auto bg-[#f5f7f1] text-slate-950">
      <div className="flex min-h-screen">
        <Sidebar />
        <section className="min-w-0 flex-1 p-5 lg:p-8">
          <header className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-slate-200 bg-white px-5 py-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[.2em] text-slate-500">Command Board · Safe slips v2</div>
              <p className="text-sm font-bold text-slate-500">Empty/generic AI slips are removed. Only slips with real connected data can be opened.</p>
              {hiddenCount ? <p className="mt-1 text-xs font-black text-amber-700">{hiddenCount} unsafe or old slip{hiddenCount === 1 ? "" : "s"} hidden.</p> : null}
            </div>
            <button onClick={scan} disabled={busy} className="rounded-full bg-emerald-500 px-5 py-3 text-xs font-black uppercase tracking-[.14em] text-white disabled:opacity-60">{busy ? "Scanning…" : "Run deep AI scan"}</button>
          </header>
          <section className="grid gap-5 xl:grid-cols-[1fr_420px]">
            <div className="rounded-[28px] bg-slate-950 p-6 text-white">
              <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.2em] text-cyan-200">No guessing approvals</span>
              <h1 className="mt-4 max-w-3xl text-4xl font-black leading-[.95] tracking-[-.07em] lg:text-5xl">No real data, no slip.</h1>
              <p className="mt-4 max-w-2xl text-sm font-bold leading-6 text-slate-300">Churvox must pull the client, record, amount, worker or message needed before the owner can approve anything.</p>
            </div>
            <aside className="rounded-[28px] border border-slate-200 bg-white p-5">
              <div className="flex justify-between"><h2 className="text-2xl font-black">Approval-ready slips</h2><span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">{actions.length}</span></div>
              <div className="mt-4 space-y-3">{actions.length ? actions.slice(0, 4).map((action) => <button key={action.id || action.title} onClick={() => setSelected(action)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left hover:bg-blue-50"><div className="text-sm font-black">{slipName(action.type)}</div><div className="mt-1 text-xs font-bold text-slate-500">{action.summary}</div></button>) : <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-black text-amber-900">No approval-ready slips. Run deep scan, or add missing customer/job/quote/invoice info first.</div>}</div>
            </aside>
          </section>
          <section className="mt-5 rounded-[28px] border border-slate-200 bg-white p-5">
            <h2 className="text-3xl font-black tracking-[-.06em]">Prepared slips</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">{actions.slice(0, 4).map((action) => <button key={action.id || action.title} onClick={() => setSelected(action)} className="rounded-[22px] border border-slate-200 p-4 text-left hover:border-blue-300"><div className="text-[10px] font-black uppercase tracking-[.18em] text-blue-600">{slipName(action.type)}</div><div className="mt-2 text-lg font-black">{action.title}</div><p className="mt-2 text-sm font-bold text-slate-600">{action.summary}</p><div className="mt-3 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white">Check full slip</div></button>)}</div>
          </section>
        </section>
      </div>
      {selected ? <Slip action={selected} close={() => setSelected(null)} done={(doneId) => setActions((prev) => prev.filter((action) => action.id !== doneId))} /> : null}
    </main>
  );
}
