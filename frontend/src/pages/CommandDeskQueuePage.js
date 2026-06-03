import React from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";

const navGroups = [
  { title: "Command", items: [["Command Board", "/dashboard", "CB"], ["AI Operator", "/ai-operator", "AI"], ["Notifications", "/notifications", "NT"]] },
  { title: "Work", items: [["Jobs", "/jobs", "JB"], ["Assign Jobs", "/dispatch", "DP"], ["Crew Map", "/crew-map", "MP"], ["Clients", "/clients", "CL"], ["Quotes", "/quotes", "QT"], ["Invoices", "/invoices", "IV"], ["Money Desk", "/money-desk", "$" ]] },
  { title: "Crew & Admin", items: [["Team", "/team", "TM"], ["Payroll", "/payroll", "PR"], ["Reports", "/reports", "RP"]] },
  { title: "System", items: [["Plans", "/plans", "PL"], ["Billing", "/billing-confidence", "BI"], ["Settings", "/settings", "ST"], ["Support", "/support", "?"]] },
];

const fieldLabels = {
  client_name: "Client",
  customer_name: "Customer",
  customer_email: "Email",
  client_email: "Email",
  job_title: "Job",
  job_address: "Address",
  worker_id: "Worker",
  worker_name: "Worker",
  total: "Total",
  amount_due: "Amount due",
  message: "Message",
  description: "Description",
};

const lanes = [
  { key: "needs", title: "Needs details", text: "Fix missing info before approval.", panel: "bg-violet-950 border-violet-300/30", card: "bg-violet-900/40 border-violet-300/20", pill: "bg-violet-300 text-violet-950" },
  { key: "assign", title: "Assign jobs", text: "Worker and dispatch approvals.", panel: "bg-amber-950 border-amber-300/30", card: "bg-amber-900/40 border-amber-300/20", pill: "bg-amber-300 text-amber-950" },
  { key: "invoice", title: "Invoices to send", text: "Drafts and invoice send approvals.", panel: "bg-emerald-950 border-emerald-300/30", card: "bg-emerald-900/40 border-emerald-300/20", pill: "bg-emerald-300 text-emerald-950" },
  { key: "quote", title: "Quote follow-ups", text: "Open quote follow-up messages.", panel: "bg-cyan-950 border-cyan-300/30", card: "bg-cyan-900/40 border-cyan-300/20", pill: "bg-cyan-300 text-cyan-950" },
  { key: "payment", title: "Payment reminders", text: "Overdue and payment chase approvals.", panel: "bg-rose-950 border-rose-300/30", card: "bg-rose-900/40 border-rose-300/20", pill: "bg-rose-300 text-rose-950" },
  { key: "job", title: "Job actions", text: "Job review and next-step approvals.", panel: "bg-blue-950 border-blue-300/30", card: "bg-blue-900/40 border-blue-300/20", pill: "bg-blue-300 text-blue-950" },
];

function isActivePath(pathname, href) {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/overview";
  if (href === "/dispatch") return pathname === "/dispatch" || pathname === "/dispatch-board";
  if (href === "/money-desk") return pathname === "/money-desk" || pathname === "/money";
  return pathname === href || pathname.startsWith(`${href}/`);
}

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
  if (Array.isArray(value)) return value.map(clean).filter(Boolean).join(" · ");
  if (typeof value === "object") return Object.keys(value).length ? JSON.stringify(value, null, 2) : "";
  return String(value);
}

function first(...values) {
  for (const value of values) if (has(value)) return value;
  return "";
}

function money(value) {
  const raw = clean(value);
  const n = Number(raw.replace(/[^0-9.-]/g, ""));
  return raw && Number.isFinite(n) ? n.toLocaleString("en-NZ", { style: "currency", currency: "NZD" }) : raw;
}

function label(key) {
  return fieldLabels[key] || String(key || "").replaceAll("_", " ");
}

function typeOf(action) {
  return String(action?.action_type || action?.type || "").replaceAll("-", "_").toLowerCase();
}

function getPayload(action) {
  return { ...(action?.payload || {}), ...(action?.draft_payload || {}) };
}

function required(type) {
  const value = String(type || "");
  if (value.includes("assign") || value.includes("worker")) return ["job_title", "job_address", "worker_id"];
  if (value.includes("send_invoice")) return ["customer_name", "customer_email", "total"];
  if (value.includes("invoice")) return ["client_name", "total", "description"];
  if (value.includes("payment") || value.includes("reminder")) return ["customer_name", "customer_email", "amount_due", "message"];
  if (value.includes("quote")) return ["customer_name", "customer_email", "message"];
  return [];
}

function typeLabel(type) {
  const value = String(type || "");
  if (value.includes("assign") || value.includes("worker")) return "Job assignment";
  if (value.includes("payment") || value.includes("reminder")) return "Payment reminder";
  if (value.includes("quote")) return "Quote follow-up";
  if (value.includes("invoice")) return value.includes("send") ? "Send invoice" : "Invoice approval";
  if (value.includes("job")) return "Job action";
  return "Prepared action";
}

function titleFor(type, action) {
  if (type.includes("assign") || type.includes("worker")) return "Assign job";
  if (type.includes("payment") || type.includes("reminder")) return "Send payment reminder";
  if (type.includes("quote")) return "Follow up quote";
  if (type.includes("invoice")) return type.includes("send") ? "Send invoice" : "Review invoice";
  if (type.includes("job")) return "Review job action";
  return action?.title || "Prepared action";
}

function laneFor(item) {
  if (!item.ready) return "needs";
  const type = item.type;
  if (type.includes("assign") || type.includes("worker")) return "assign";
  if (type.includes("payment") || type.includes("reminder")) return "payment";
  if (type.includes("quote")) return "quote";
  if (type.includes("invoice")) return "invoice";
  return "job";
}

function normalise(action) {
  const type = typeOf(action);
  const raw = getPayload(action);
  const form = {
    ...raw,
    action_type: type,
    job_title: first(raw.job_title, raw.job_name, raw.service_type),
    job_address: first(raw.job_address, raw.site_address, raw.address, raw.client_address),
    client_name: first(raw.client_name, raw.customer_name),
    customer_name: first(raw.customer_name, raw.client_name),
    customer_email: first(raw.customer_email, raw.client_email, raw.email),
    worker_id: first(raw.worker_id, raw.recommended_worker_id, raw.assigned_worker_id),
    worker_name: first(raw.worker_name, raw.recommended_worker_name, raw.assigned_worker_name),
    total: first(raw.total, raw.amount_due, raw.amount, raw.subtotal, raw.price, raw.quote_amount),
    amount_due: first(raw.amount_due, raw.total, raw.amount),
    description: first(raw.description, raw.invoice_description, raw.quote_description, raw.job_description, raw.message),
    message: first(raw.message, raw.email_body, raw.follow_up_message, raw.sms_message),
  };
  const missing = required(type).filter((key) => !has(form[key]));
  const item = {
    id: String(action?.id || action?._id || action?.action_id || ""),
    type,
    form,
    ready: missing.length === 0,
    missing,
    title: titleFor(type, action),
    meta: [first(form.client_name, form.customer_name), form.job_title, form.worker_name && type.includes("worker") ? `Worker: ${form.worker_name}` : "", money(form.total)].filter(Boolean).join(" · "),
    summary: action?.summary || action?.reason || "Churvox prepared this for owner approval.",
  };
  item.lane = laneFor(item);
  return item;
}

function isTest(item) {
  return /PW E2E|Playwright|Deep Audit|TEST Phase|pw-e2e-|audit@example\.com|QT-ADB/i.test(JSON.stringify(item));
}

function dedupe(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = [item.lane, item.type, item.title, item.meta, item.summary].join("|").toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function Sidebar() {
  const { pathname } = useLocation();
  return (
    <aside className="hidden h-full w-[252px] shrink-0 overflow-y-auto bg-[#0f1722] p-4 text-white lg:block">
      <div className="mb-5 flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-2xl bg-cyan-400 text-sm font-black text-slate-950">C</div>
        <div>
          <div className="text-xs font-black tracking-[0.03em]">CHURVOX</div>
          <div className="text-[8px] font-black uppercase tracking-[.18em] text-slate-400">Command Desk</div>
        </div>
      </div>
      <div className="space-y-4">
        {navGroups.map((group) => (
          <section key={group.title}>
            <div className="mb-2 px-2 text-[9px] font-black uppercase tracking-[.18em] text-slate-500">{group.title}</div>
            <nav className="grid gap-1">
              {group.items.map(([name, href, icon]) => {
                const active = isActivePath(pathname, href);
                return (
                  <Link key={href} to={href} className={`flex min-h-[34px] items-center gap-2.5 rounded-2xl px-2.5 py-2 text-xs font-black ${active ? "bg-cyan-300 text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}>
                    <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-xl text-[8px] font-black ${active ? "bg-slate-950 text-white" : "bg-white/10 text-cyan-200"}`}>{icon}</span>
                    <span className="truncate">{name}</span>
                  </Link>
                );
              })}
            </nav>
          </section>
        ))}
      </div>
    </aside>
  );
}

function ActionCard({ item, lane, setOpen }) {
  return (
    <button onClick={() => setOpen(item)} className={`rounded-[22px] border p-4 text-left text-white transition hover:-translate-y-0.5 ${lane.card}`}>
      <div className="flex items-start justify-between gap-3">
        <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[.16em] ${lane.pill}`}>{item.ready ? lane.key : "Needs details"}</span>
        <span className="text-[10px] font-black uppercase tracking-[.14em] text-white/55">{typeLabel(item.type)}</span>
      </div>
      <h3 className="mt-3 text-xl font-black leading-tight tracking-[-.04em]">{item.title}</h3>
      {item.meta ? <div className="mt-2 text-sm font-black leading-5 text-white/75">{item.meta}</div> : null}
      <p className="mt-3 text-sm font-bold leading-6 text-white/72">{item.ready ? item.summary : `Missing: ${item.missing.map(label).join(", ")}`}</p>
      <div className="mt-4 inline-flex rounded-xl bg-white/14 px-4 py-2 text-sm font-black text-white ring-1 ring-white/12">Open slip</div>
    </button>
  );
}

function Lane({ lane, items, setOpen }) {
  return (
    <section className={`flex h-[430px] min-h-[430px] flex-col overflow-hidden rounded-[30px] border p-5 text-white shadow-[0_20px_58px_rgba(15,23,42,.16)] ${lane.panel}`}>
      <div className="flex shrink-0 items-start justify-between gap-3">
        <div>
          <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[.16em] ${lane.pill}`}>{lane.key}</span>
          <h2 className="mt-3 text-3xl font-black tracking-[-.06em]">{lane.title}</h2>
          <p className="mt-1 text-sm font-bold leading-6 text-white/70">{lane.text}</p>
        </div>
        <div className="rounded-2xl bg-white/12 px-4 py-3 text-2xl font-black">{items.length}</div>
      </div>
      <div className="mt-5 grid min-h-0 flex-1 gap-3 overflow-y-auto pr-1">
        {items.slice(0, 12).map((item) => <ActionCard key={item.id || `${item.title}-${item.meta}`} item={item} lane={lane} setOpen={setOpen} />)}
        {!items.length ? <div className="rounded-2xl border border-white/10 bg-white/8 p-4 text-sm font-black text-white/55">Nothing waiting here.</div> : null}
      </div>
    </section>
  );
}

function Modal({ item, onClose, onChanged }) {
  const { post, patch } = useApi();
  const [busy, setBusy] = React.useState(false);
  if (!item) return null;
  const form = item.form || {};

  async function approve() {
    if (!item.ready) {
      toast.error(`Missing: ${item.missing.map(label).join(", ")}`);
      return;
    }
    setBusy(true);
    try {
      await patch(`/ai/operator/slips/${item.id}`, form);
      const res = await post(`/ai/operator/actions/${item.id}/approve-send-final`, form);
      if (res?.success === false || res?.data?.success === false) throw new Error(res?.error || res?.data?.error || "Approval failed");
      toast.success(res?.data?.message || "Approved");
      await onChanged();
      onClose();
    } catch (error) {
      toast.error(error?.message || "Approval failed");
    } finally {
      setBusy(false);
    }
  }

  const rows = [
    ["Client", first(form.client_name, form.customer_name)],
    ["Email", first(form.customer_email, form.client_email, form.email)],
    ["Job", form.job_title],
    ["Address", form.job_address],
    ["Worker", first(form.worker_name, form.worker_id)],
    ["Amount", money(form.total || form.amount_due)],
    ["Message", first(form.message, form.email_body, form.follow_up_message, form.description)],
  ];

  return (
    <div className="fixed inset-0 z-[2147483647] bg-[#0f1722]/90 p-3 backdrop-blur">
      <div className="mx-auto flex h-full max-w-5xl flex-col overflow-hidden rounded-[34px] bg-[#f5f7f1]">
        <header className="bg-[#0f1722] p-6 text-white">
          <div className="flex justify-between gap-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-200">Approval slip</div>
              <h1 className="mt-2 text-4xl font-black tracking-[-.06em]">{item.title}</h1>
              <p className="mt-2 text-sm font-bold text-slate-300">Review before anything is sent, assigned or changed.</p>
            </div>
            <button onClick={onClose} className="h-fit rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white">Close</button>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className={`rounded-[24px] border p-4 ${item.ready ? "border-emerald-200 bg-emerald-50" : "border-amber-300 bg-amber-50"}`}>
            <div className="text-sm font-black">{item.ready ? "Ready to approve" : `Missing: ${item.missing.map(label).join(", ")}`}</div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {rows.map(([name, value]) => (
              <div key={name} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-[10px] font-black uppercase tracking-[.14em] text-slate-500">{name}</div>
                <div className="mt-2 whitespace-pre-wrap break-words text-sm font-black text-slate-950">{clean(value) || "Not found"}</div>
              </div>
            ))}
          </div>
        </main>
        <footer className="flex justify-end gap-3 border-t border-slate-200 bg-white p-4">
          <button onClick={onClose} className="rounded-2xl border px-5 py-3 text-sm font-black">Back</button>
          <button disabled={busy || !item.ready} onClick={approve} className="rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 disabled:opacity-50">{busy ? "Running…" : "Approve action"}</button>
        </footer>
      </div>
    </div>
  );
}

function CommandDeskQueueContent() {
  const { get, post } = useApi();
  const [items, setItems] = React.useState([]);
  const [report, setReport] = React.useState(null);
  const [summary, setSummary] = React.useState(null);
  const [open, setOpen] = React.useState(null);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    const res = await get("/ai/operator/slips");
    const rows = Array.isArray(res?.data?.data) ? res.data.data : Array.isArray(res?.data?.actions) ? res.data.actions : [];
    setItems(dedupe(rows.map(normalise)).filter((item) => !isTest(item)));
    setReport(res?.data?.report || null);
    setSummary(res?.data?.summary || null);
  }, [get]);

  React.useEffect(() => { load(); }, [load]);

  async function rebuild() {
    setBusy(true);
    try {
      const res = await post("/ai/operator/rebuild-slips", {});
      const rows = Array.isArray(res?.data?.actions) ? res.data.actions : [];
      setItems(dedupe(rows.map(normalise)).filter((item) => !isTest(item)));
      setReport(res?.data?.report || null);
      setSummary(res?.data?.summary || null);
      toast.success("Approval queue refreshed");
    } catch (error) {
      toast.error(error?.message || "Could not refresh queue");
    } finally {
      setBusy(false);
    }
  }

  async function repair() {
    setBusy(true);
    try {
      await post("/ai/operator/repair-completed-jobs", {});
      await load();
      toast.success("Completed jobs checked");
    } catch (error) {
      toast.error(error?.message || "Could not check completed jobs");
    } finally {
      setBusy(false);
    }
  }

  const grouped = Object.fromEntries(lanes.map((lane) => [lane.key, items.filter((item) => item.lane === lane.key)]));
  const ready = items.filter((item) => item.ready).length;
  const needs = items.length - ready;

  return (
    <main className="fixed inset-0 z-[2147483600] overflow-hidden bg-[#f5f7f1] text-slate-950" data-version="DASHBOARD_PORTAL_LOCKED_SIDEBAR_20260604">
      <div className="flex h-full min-h-0">
        <Sidebar />
        <section className="h-full min-w-0 flex-1 overflow-y-auto overscroll-contain p-5 lg:p-8">
          <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
            <div className="rounded-[30px] bg-[#0f1722] p-6 text-white shadow-[0_26px_80px_rgba(15,23,42,.20)] md:p-8">
              <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.2em] text-cyan-200">Command Board</span>
              <h1 className="mt-4 max-w-4xl text-4xl font-black leading-[.95] tracking-[-.07em] lg:text-6xl">Today’s admin is ready to review.</h1>
              <p className="mt-4 max-w-3xl text-sm font-bold leading-6 text-slate-300 md:text-base">Review each coloured lane before anything is sent, assigned or changed.</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button onClick={repair} disabled={busy} className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-xs font-black uppercase tracking-[.14em] text-white">{busy ? "Checking…" : "Check completed jobs"}</button>
                <button onClick={rebuild} disabled={busy} className="rounded-2xl bg-cyan-300 px-5 py-3 text-xs font-black uppercase tracking-[.14em] text-slate-950">{busy ? "Refreshing…" : "Refresh approval queue"}</button>
              </div>
            </div>
            <aside className="rounded-[30px] border border-slate-200 bg-white p-5">
              <div className="text-[10px] font-black uppercase tracking-[.2em] text-blue-600">Approval queue</div>
              <h2 className="mt-2 text-3xl font-black tracking-[-.06em]">Review next</h2>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-600">Churvox split the work into separate approval boxes.</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {[[ready, "ready", "bg-emerald-950"], [needs, "need details", "bg-amber-950"], [items.length, "total", "bg-cyan-950"], [lanes.filter((lane) => (grouped[lane.key] || []).length).length, "active lanes", "bg-slate-950"]].map(([value, name, colour]) => (
                  <div key={name} className={`rounded-2xl p-4 text-white ${colour}`}>
                    <div className="text-3xl font-black">{value}</div>
                    <div className="text-xs font-black uppercase tracking-[.14em] opacity-75">{name}</div>
                  </div>
                ))}
              </div>
            </aside>
          </section>

          {summary ? (
            <section className="mt-5 rounded-[28px] border border-slate-200 bg-white p-5">
              <div className="text-[10px] font-black uppercase tracking-[.2em] text-blue-600">Today’s review</div>
              <h2 className="mt-2 text-3xl font-black tracking-[-.06em]">What needs approval</h2>
              <p className="mt-2 text-sm font-bold text-slate-600">{clean(summary.headline) || "Churvox checked your business and prepared the next actions."}</p>
            </section>
          ) : null}

          {report ? (
            <section className="mt-5 rounded-[28px] border border-slate-200 bg-white p-5">
              <div className="text-[10px] font-black uppercase tracking-[.2em] text-slate-500">Records checked</div>
              <h2 className="mt-2 text-2xl font-black tracking-[-.05em]">Churvox reviewed these records</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                {[[report.jobs_found, "jobs"], [report.quotes_found, "quotes"], [report.invoices_found, "invoices"], [report.slips_created, "actions prepared"]].map(([value, name]) => (
                  <div key={name} className="rounded-2xl bg-slate-950 p-4 text-white">
                    <div className="text-3xl font-black">{value ?? 0}</div>
                    <div className="text-xs font-black uppercase tracking-[.14em] opacity-75">{name}</div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="mt-5">
            <div className="mb-4">
              <div className="text-[10px] font-black uppercase tracking-[.2em] text-blue-600">Approval lanes</div>
              <h2 className="mt-2 text-3xl font-black tracking-[-.06em]">Prepared actions</h2>
            </div>
            <div className="grid items-start gap-5 xl:grid-cols-2">
              {lanes.map((lane) => <Lane key={lane.key} lane={lane} items={grouped[lane.key] || []} setOpen={setOpen} />)}
            </div>
            {!items.length ? <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-black text-amber-900">No prepared actions yet. Refresh the approval queue to check completed jobs, invoices and quote follow-ups.</div> : null}
          </section>
        </section>
      </div>
      {open ? <Modal item={open} onClose={() => setOpen(null)} onChanged={load} /> : null}
    </main>
  );
}

export default function CommandDeskQueuePage() {
  React.useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  if (typeof document === "undefined") return <CommandDeskQueueContent />;
  return createPortal(<CommandDeskQueueContent />, document.body);
}
