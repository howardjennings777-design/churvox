import React from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";

const navGroups = [
  { title: "Command", items: [["Command Board", "/dashboard", "CB"], ["AI Operator", "/ai-operator", "AI"], ["Notifications", "/notifications", "NT"]] },
  { title: "Work", items: [["Jobs", "/jobs", "JB"], ["Dispatch", "/dispatch", "DP"], ["Clients", "/clients", "CL"], ["Quotes", "/quotes", "QT"], ["Invoices", "/invoices", "IV"], ["Money Desk", "/money-desk", "$"]] },
  { title: "Crew & Admin", items: [["Team", "/team", "TM"], ["Crew Ops", "/crew-ops", "CO"], ["Payroll", "/payroll", "PR"], ["Reports", "/reports", "RP"]] },
  { title: "System", items: [["Setup", "/onboarding", "SU"], ["Trade Presets", "/trade-presets", "TP"], ["Automation", "/automation", "AU"], ["Integrations", "/integrations", "IN"], ["Operator Tools", "/operator-tools", "OT"], ["Plans", "/plans", "PL"], ["Billing", "/billing-confidence", "BI"], ["Settings", "/settings", "ST"], ["Support", "/support", "?"]] },
];

const sampleActions = [
  { action_key: "sample-a1", title: "Create draft invoice", action_type: "invoice", record_type: "job", record_id: "", risk_level: "medium", summary: "Completed job has photos and time checked. Invoice wording is prepared for owner review.", editable_payload: { description: "Lawn service completed with photos attached", amount: 680 } },
  { action_key: "sample-a2", title: "Assign best worker", action_type: "dispatch", record_type: "job", record_id: "", risk_level: "low", summary: "Worker match prepared using region, workload and schedule checks.", editable_payload: { worker: "Jo", reason: "Available and closest region" } },
  { action_key: "sample-a3", title: "Send quote follow-up", action_type: "message", record_type: "quote", record_id: "", risk_level: "medium", summary: "A sent quote is quiet. A polite customer follow-up is ready but not sent.", editable_payload: { message: "Just checking whether you had any questions about the quote." } },
  { action_key: "sample-a4", title: "Prepare overdue reminder", action_type: "message", record_type: "invoice", record_id: "", risk_level: "high", summary: "Invoice is overdue. Reminder wording is prepared for approval.", editable_payload: { tone: "firm but polite" } },
];

function isActivePath(pathname, href) {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/overview";
  if (href === "/ai-operator") return pathname === "/ai-operator" || pathname.startsWith("/ai-operator/");
  if (href === "/dispatch") return pathname === "/dispatch" || pathname === "/dispatch-board";
  if (href === "/money-desk") return pathname === "/money-desk" || pathname === "/money";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function arr(value) {
  const data = value?.data ?? value;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.actions)) return data.actions;
  if (Array.isArray(data?.pending_actions)) return data.pending_actions;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function idOf(action) {
  const raw = action?.id || action?._id || action?.action_key || action?.key || "";
  if (typeof raw === "object" && raw?.$oid) return raw.$oid;
  return String(raw || "");
}

function titleOf(action) {
  return action?.title || action?.label || action?.action_type || "AI Operator action";
}

function summaryOf(action) {
  return action?.summary || action?.description || action?.reason || "Churvox prepared this action for owner review.";
}

function riskOf(action) {
  return String(action?.risk_level || action?.risk || "medium").toLowerCase();
}

function typeOf(action) {
  return String(action?.action_type || action?.type || action?.record_type || "action").toLowerCase().replaceAll(" ", "_");
}

function pretty(value) {
  return String(value || "").replaceAll("_", " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function riskStyle(risk) {
  if (["high", "critical"].includes(risk)) return "border-red-200 bg-red-50 text-red-800";
  if (["medium", "warning"].includes(risk)) return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-emerald-200 bg-emerald-50 text-emerald-800";
}

function linkFor(action) {
  const id = action?.record_id || action?.job_id || action?.invoice_id || action?.quote_id || action?.client_id || "";
  const type = String(action?.record_type || action?.action_type || "").toLowerCase();
  if (type.includes("job") && id) return `/jobs/${id}`;
  if (type.includes("invoice") && id) return `/invoices/${id}`;
  if (type.includes("quote") && id) return `/quotes/${id}`;
  if (type.includes("client")) return "/clients";
  if (type.includes("dispatch")) return "/dispatch";
  if (type.includes("payroll")) return "/payroll";
  return "/dashboard";
}

function Sidebar() {
  const { pathname } = useLocation();
  return (
    <aside className="hidden w-[292px] shrink-0 overflow-y-auto border-r border-slate-800 bg-[#0f1722] p-4 text-white lg:block">
      <div className="mb-6 flex items-center gap-3 px-1"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-500 text-lg font-black text-slate-950">C</div><div><div className="text-sm font-black tracking-[-0.03em]">CHURVOX</div><div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Command Desk</div></div></div>
      <div className="space-y-5">
        {navGroups.map((group) => (
          <section key={group.title}><div className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{group.title}</div><nav className="space-y-1">
            {group.items.map(([label, href, icon]) => {
              const active = isActivePath(pathname, href);
              return <Link key={href} to={href} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-black ${active ? "bg-white text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-xl text-[10px] font-black ${active ? "bg-slate-950 text-white" : "bg-white/10 text-cyan-200"}`}>{icon}</span><span className="truncate">{label}</span></Link>;
            })}
          </nav></section>
        ))}
      </div>
    </aside>
  );
}

function ActionCard({ action, onOpen, onApprove, onReject, busy }) {
  const id = idOf(action);
  const risk = riskOf(action);
  return (
    <article className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
      <div className="flex items-start justify-between gap-3">
        <div><span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{pretty(typeOf(action))}</span><h3 className="mt-1 text-lg font-black tracking-[-0.04em] text-slate-950">{titleOf(action)}</h3></div>
        <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${riskStyle(risk)}`}>{pretty(risk)}</span>
      </div>
      <p className="mt-3 text-sm font-bold leading-6 text-slate-600">{summaryOf(action)}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={() => onOpen(action)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-black text-slate-800 hover:bg-slate-50">Open slip</button>
        <Link to={linkFor(action)} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-800 hover:bg-slate-50">Open record</Link>
        {!id.startsWith("sample-") ? <button type="button" disabled={busy === `approve-${id}`} onClick={() => onApprove(action)} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-60">Approve</button> : null}
        {!id.startsWith("sample-") ? <button type="button" disabled={busy === `reject-${id}`} onClick={() => onReject(action)} className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-black text-red-800 hover:bg-red-100 disabled:opacity-60">Reject</button> : null}
      </div>
    </article>
  );
}

function OperatorSlip({ action, onClose, onApprove, onReject, busy }) {
  if (!action) return null;
  const id = idOf(action);
  const payload = action?.editable_payload || action?.payload || {};
  return (
    <div className="fixed inset-0 z-[2147483647] bg-slate-950/65 p-3 backdrop-blur-sm md:p-7" role="dialog" aria-modal="true">
      <div className="ml-auto flex h-full max-w-[720px] flex-col overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-[0_35px_120px_rgba(15,23,42,0.40)]">
        <header className="relative overflow-hidden border-b border-slate-800 bg-slate-950 p-6 text-white md:p-7">
          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4"><div><div className="inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">AI Operator Work Slip</div><h2 className="mt-4 text-3xl font-black leading-[0.95] tracking-[-0.07em] md:text-5xl">{titleOf(action)}</h2></div><button type="button" onClick={onClose} className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-black text-white hover:bg-white/15">Close</button></div>
          <p className="relative mt-5 max-w-xl text-sm font-semibold leading-6 text-slate-300">{pretty(typeOf(action))} · {pretty(riskOf(action))} risk</p>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto bg-[#f4f6f8] p-5 md:p-6">
          <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Prepared by Churvox</div><p className="mt-3 text-lg font-black tracking-[-0.035em] text-slate-950">{summaryOf(action)}</p><div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-bold leading-6 text-blue-950">Approval-first: Churvox prepares the admin, but the owner approves before anything important changes or sends.</div></section>
          <section className="mt-4 rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Prepared payload</div><pre className="mt-4 max-h-[280px] overflow-auto rounded-2xl border border-slate-200 bg-slate-950 p-4 text-xs font-bold leading-6 text-slate-100">{JSON.stringify(payload, null, 2)}</pre></section>
          <section className="mt-4 rounded-[26px] border border-amber-200 bg-amber-50 p-5 shadow-sm"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">Guardrail</div><p className="mt-2 text-sm font-bold leading-6 text-amber-950">Do not auto-send customer messages, change payroll, change pricing, delete records, charge customers or alter accounting records without explicit approval.</p></section>
        </main>
        <footer className="flex flex-wrap gap-3 border-t border-slate-200 bg-white p-5">
          <Link to={linkFor(action)} className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800 hover:bg-slate-50">Open record</Link>
          {!id.startsWith("sample-") ? <button type="button" disabled={busy === `approve-${id}`} onClick={() => onApprove(action)} className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-60">Approve action</button> : null}
          {!id.startsWith("sample-") ? <button type="button" disabled={busy === `reject-${id}`} onClick={() => onReject(action)} className="rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-black text-red-800 hover:bg-red-100 disabled:opacity-60">Reject</button> : null}
        </footer>
      </div>
    </div>
  );
}

function AIOperatorCommandContent() {
  const api = useApi();
  const [operator, setOperator] = React.useState({});
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState("");
  const [activeAction, setActiveAction] = React.useState(null);

  async function loadOperator() {
    setLoading(true);
    const res = await api.get("/ai-operator/actions");
    if (res?.success) setOperator(res.data?.ai_operator || res.data || {});
    else {
      setOperator({});
      toast.error(res?.error || "Could not load AI Operator actions");
    }
    setLoading(false);
  }

  React.useEffect(() => { loadOperator(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function approve(action) {
    const id = idOf(action);
    if (!id) return;
    setBusy(`approve-${id}`);
    const res = await api.post(`/ai-operator/actions/${id}/approve`, { payload: action.editable_payload || action.payload || {} });
    setBusy("");
    if (res?.success) { toast.success("AI action approved"); setActiveAction(null); await loadOperator(); }
    else toast.error(res?.error || "Could not approve action");
  }

  async function reject(action) {
    const id = idOf(action);
    if (!id) return;
    setBusy(`reject-${id}`);
    const res = await api.post(`/ai-operator/actions/${id}/reject`, {});
    setBusy("");
    if (res?.success) { toast.success("AI action rejected"); setActiveAction(null); await loadOperator(); }
    else toast.error(res?.error || "Could not reject action");
  }

  const actions = arr(operator.pending_actions || operator.actions || operator.items);
  const list = actions.length ? actions : sampleActions;
  const approved = arr(operator.approved_actions);
  const rejected = arr(operator.rejected_actions);
  const metrics = operator.metrics || {};
  const counts = React.useMemo(() => {
    const pending = metrics.pending ?? list.length;
    const high = list.filter((action) => ["high", "critical"].includes(riskOf(action))).length;
    const medium = list.filter((action) => riskOf(action) === "medium").length;
    const low = list.filter((action) => riskOf(action) === "low").length;
    return { pending, high, medium, low, approved: metrics.approved ?? approved.length, rejected: metrics.rejected ?? rejected.length };
  }, [list, metrics, approved.length, rejected.length]);

  return (
    <main className="fixed inset-0 z-[2147483000] overflow-y-auto bg-[#eef1f4] text-slate-950">
      <div className="flex min-h-screen"><Sidebar />
        <section className="min-w-0 flex-1 p-4 pb-28 md:p-6 md:pb-28 xl:p-8 xl:pb-28">
          <header className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">AI Operator</div><div className="text-sm font-bold text-slate-500">Prepared admin actions waiting for owner approval.</div></div><div className="flex flex-wrap gap-3"><button type="button" onClick={loadOperator} className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-800 hover:bg-slate-50">Refresh</button><Link to="/dashboard" className="rounded-2xl bg-amber-500 px-4 py-2 text-sm font-black text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400">Command Board</Link></div></header>
          <section className="grid gap-5 xl:grid-cols-[1fr_430px]"><div className="overflow-hidden rounded-[30px] border border-slate-900 bg-slate-950 shadow-[0_26px_80px_rgba(15,23,42,0.20)]"><div className="relative p-6 md:p-8"><div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" /><div className="relative"><span className="inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">AI Operator</span><h1 className="mt-5 max-w-3xl text-4xl font-black leading-[0.92] tracking-[-0.075em] text-white md:text-6xl">Churvox prepares. You approve.</h1><p className="mt-5 max-w-2xl text-sm font-semibold leading-6 text-slate-300 md:text-base">The AI Operator finds business admin, prepares the next action, and puts it in a clear approval queue before anything important happens.</p></div></div></div><div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Approval health</div><h2 className="mt-2 text-2xl font-black tracking-[-0.055em] text-slate-950">What needs attention</h2><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1"><div className="rounded-2xl border border-red-200 bg-red-50 p-4"><div className="text-2xl font-black text-red-800">{counts.high}</div><div className="text-xs font-black uppercase tracking-[0.14em] text-red-700">High risk</div></div><div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><div className="text-2xl font-black text-amber-800">{counts.medium}</div><div className="text-xs font-black uppercase tracking-[0.14em] text-amber-700">Medium risk</div></div><div className="rounded-2xl border border-blue-200 bg-blue-50 p-4"><div className="text-2xl font-black text-blue-800">{counts.pending}</div><div className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">Pending actions</div></div></div></div></section>
          <section className="mt-5 grid gap-4 md:grid-cols-4"><div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Pending</div><div className="mt-3 text-3xl font-black tracking-[-0.06em]">{counts.pending}</div></div><div className="rounded-[22px] border border-red-200 bg-red-50 p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-red-700">High risk</div><div className="mt-3 text-3xl font-black tracking-[-0.06em] text-red-900">{counts.high}</div></div><div className="rounded-[22px] border border-emerald-200 bg-emerald-50 p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">Approved</div><div className="mt-3 text-3xl font-black tracking-[-0.06em] text-emerald-900">{counts.approved}</div></div><div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Rejected</div><div className="mt-3 text-3xl font-black tracking-[-0.06em]">{counts.rejected}</div></div></section>
          <section className="mt-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600">Approval queue</div><h2 className="mt-2 text-3xl font-black tracking-[-0.06em] text-slate-950">AI-prepared actions</h2></div>{loading && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">Loading…</span>}</div><div className="grid gap-4 xl:grid-cols-2">{list.map((action) => <ActionCard key={idOf(action) || titleOf(action)} action={action} onOpen={setActiveAction} onApprove={approve} onReject={reject} busy={busy} />)}</div></section>
        </section>
      </div>
      <OperatorSlip action={activeAction} onClose={() => setActiveAction(null)} onApprove={approve} onReject={reject} busy={busy} />
    </main>
  );
}

export default function AIOperatorCommandPage() {
  if (typeof document === "undefined") return <AIOperatorCommandContent />;
  return createPortal(<AIOperatorCommandContent />, document.body);
}
