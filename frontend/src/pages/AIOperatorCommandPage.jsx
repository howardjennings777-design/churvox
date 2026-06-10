import React from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";
import CommandSlipEverything from "../components/CommandSlipEverything";

const navGroups = [
  { title: "Command", items: [["Command Board", "/dashboard", "CB"], ["AI Operator", "/ai-operator", "AI"], ["Notifications", "/notifications", "NT"]] },
  { title: "Work", items: [["Jobs", "/jobs", "JB"], ["Dispatch", "/dispatch", "DP"], ["Clients", "/clients", "CL"], ["Quotes", "/quotes", "QT"], ["Invoices", "/invoices", "IV"], ["Money Desk", "/money-desk", "$"]] },
  { title: "Crew & Admin", items: [["Team", "/team", "TM"], ["Crew Ops", "/crew-ops", "CO"], ["Payroll", "/payroll", "PR"], ["Reports", "/reports", "RP"]] },
  { title: "System", items: [["Setup", "/onboarding", "SU"], ["Trade Presets", "/trade-presets", "TP"], ["Automation", "/automation", "AU"], ["Integrations", "/integrations", "IN"], ["Operator Tools", "/operator-tools", "OT"], ["Plans", "/plans", "PL"], ["Billing", "/billing-confidence", "BI"], ["Settings", "/settings", "ST"], ["Support", "/support", "?"]] },
];

const sampleActions = [
  { action_key: "sample-a1", title: "Create draft invoice", action_type: "invoice", record_type: "job", record_id: "", risk_level: "medium", summary: "Completed job has photos and time checked. Invoice wording is prepared for owner review.", editable_payload: { description: "Lawn service completed with photos attached", amount: 680 } },
  { action_key: "sample-a2", title: "Assign best worker", action_type: "dispatch", record_type: "job", record_id: "", risk_level: "low", summary: "Worker match prepared using region, workload and schedule checks.", editable_payload: { worker: "Jo", reason: "Available and closest region" } },
  { action_key: "sample-a3", title: "Send quote follow-up", action_type: "message", record_type: "quote", record_id: "", risk_level: "medium", summary: "A sent quote is quiet. A polite customer follow-up is ready for review.", editable_payload: { message: "Just checking whether you had any questions about the quote." } },
  { action_key: "sample-a4", title: "Prepare overdue reminder", action_type: "message", record_type: "invoice", record_id: "", risk_level: "high", summary: "Invoice is overdue. Reminder wording is prepared for approval.", editable_payload: { tone: "firm but polite" } },
];

const panel = "rounded-[26px] border border-cyan-300/15 bg-slate-900/70 shadow-[0_22px_70px_rgba(0,0,0,0.22)] backdrop-blur-xl";
const innerPanel = "rounded-2xl border border-cyan-300/15 bg-white/[0.06]";
const titleText = "text-white";
const mutedText = "text-slate-300";
const kickerText = "text-cyan-300";

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
  if (["high", "critical"].includes(risk)) return "border-red-400/35 bg-red-500/12 text-red-200";
  if (["medium", "warning"].includes(risk)) return "border-amber-300/35 bg-amber-400/12 text-amber-100";
  return "border-emerald-300/35 bg-emerald-400/12 text-emerald-100";
}

function riskCardStyle(risk) {
  if (risk === "high") return "border-red-400/30 bg-red-500/10 text-red-100";
  if (risk === "medium") return "border-amber-300/30 bg-amber-400/10 text-amber-100";
  return "border-cyan-300/20 bg-cyan-300/10 text-cyan-100";
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
    
  );
}

function ActionCard({ action, onOpen, onApprove, onReject, busy }) {
  const id = idOf(action);
  const risk = riskOf(action);
  return (
    <article className={`${panel} p-4 transition hover:-translate-y-0.5 hover:border-cyan-300/30`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className={`text-[10px] font-black uppercase tracking-[0.18em] ${kickerText}`}>{pretty(typeOf(action))}</span>
          <h3 className={`mt-1 text-lg font-black tracking-[-0.04em] ${titleText}`}>{titleOf(action)}</h3>
        </div>
        <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${riskStyle(risk)}`}>{pretty(risk)}</span>
      </div>
      <p className={`mt-3 text-sm font-bold leading-6 ${mutedText}`}>{summaryOf(action)}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={() => onOpen(action)} className="rounded-xl border border-cyan-300/20 bg-white/5 px-4 py-2 text-sm font-black text-cyan-100 hover:bg-white/10">Review slip</button>
        <Link to={linkFor(action)} className="rounded-xl border border-cyan-300/20 bg-white/5 px-4 py-2 text-sm font-black text-cyan-100 hover:bg-white/10">Open record</Link>
        {!id.startsWith("sample-") ? <button type="button" disabled={busy === `approve-${id}`} onClick={() => onApprove(action)} className="rounded-xl bg-gradient-to-r from-cyan-300 to-emerald-300 px-4 py-2 text-sm font-black text-slate-950 shadow-lg shadow-cyan-500/20 disabled:opacity-60">Approve</button> : null}
        {!id.startsWith("sample-") ? <button type="button" disabled={busy === `reject-${id}`} onClick={() => onReject(action)} className="rounded-xl border border-red-300/25 bg-red-500/10 px-4 py-2 text-sm font-black text-red-100 disabled:opacity-60">Reject</button> : null}
      </div>
    </article>
  );
}

function OperatorSlip({ action, onClose, onApprove, onReject, busy }) {
  if (!action) return null;
  const id = idOf(action);
  const payload = action?.editable_payload || action?.payload || {};
  return (
    <div className="fixed inset-0 z-[2147483647] bg-slate-950/75 p-3 backdrop-blur-sm md:p-7" role="dialog" aria-modal="true">
      <div className="ml-auto flex h-full max-w-[720px] flex-col overflow-hidden rounded-[34px] border border-cyan-300/20 bg-slate-950 shadow-[0_35px_120px_rgba(0,0,0,0.50)]">
        <header className="relative overflow-hidden border-b border-cyan-300/15 bg-slate-950 p-6 text-white md:p-7">
          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4"><div><div className="inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">AI Operator Work Slip</div><h2 className="mt-4 text-3xl font-black leading-[0.95] tracking-[-0.07em] md:text-5xl">{titleOf(action)}</h2></div><button type="button" onClick={onClose} className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-black text-white hover:bg-white/15">Close</button></div>
          <p className="relative mt-5 max-w-xl text-sm font-semibold leading-6 text-slate-300">{pretty(typeOf(action))} · {pretty(riskOf(action))} risk</p>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto bg-slate-950 p-5 md:p-6">
          <section className={`${panel} p-5`}><div className={`text-[10px] font-black uppercase tracking-[0.18em] ${kickerText}`}>Prepared by Churvox</div><p className="mt-3 text-lg font-black tracking-[-0.035em] text-white">{summaryOf(action)}</p><div className="mt-4 rounded-2xl border border-cyan-300/15 bg-cyan-300/10 p-4 text-sm font-bold leading-6 text-cyan-100">Approval-first: Churvox prepares the admin, and the owner checks the action before it runs.</div></section>
          <section className={`${panel} mt-4 p-5`}><div className={`text-[10px] font-black uppercase tracking-[0.18em] ${kickerText}`}>Prepared payload</div><pre className="mt-4 max-h-[280px] overflow-auto rounded-2xl border border-cyan-300/15 bg-slate-950 p-4 text-xs font-bold leading-6 text-slate-100">{JSON.stringify(payload, null, 2)}</pre></section>
          <section className="mt-4 rounded-[26px] border border-amber-300/25 bg-amber-400/10 p-5 shadow-sm"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">Guardrail</div><p className="mt-2 text-sm font-bold leading-6 text-amber-100">Sensitive customer, payroll, pricing and finance actions should always be reviewed by the owner first.</p></section>
        
              <CommandSlipEverything
                record={action}
                context="OperatorSlip"
              />
</main>
        <footer className="flex flex-wrap gap-3 border-t border-cyan-300/15 bg-slate-950 p-5">
          <Link to={linkFor(action)} className="rounded-2xl border border-cyan-300/20 bg-white/5 px-5 py-3 text-sm font-black text-cyan-100 hover:bg-white/10">Open record</Link>
          {!id.startsWith("sample-") ? <button type="button" disabled={busy === `approve-${id}`} onClick={() => onApprove(action)} className="rounded-2xl bg-gradient-to-r from-cyan-300 to-emerald-300 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-cyan-500/20 disabled:opacity-60">Approve action</button> : null}
          {!id.startsWith("sample-") ? <button type="button" disabled={busy === `reject-${id}`} onClick={() => onReject(action)} className="rounded-2xl border border-red-300/25 bg-red-500/10 px-5 py-3 text-sm font-black text-red-100 disabled:opacity-60">Reject</button> : null}
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
    <main className="fixed inset-0 z-[2147483000] overflow-y-auto bg-[#07111f] text-slate-100">
      <div className="flex min-h-screen"><Sidebar />
        <section className="min-w-0 flex-1 p-4 pb-28 md:p-6 md:pb-28 xl:p-8 xl:pb-28">
          <header className={`${panel} mb-5 flex flex-wrap items-center justify-between gap-4 px-5 py-4`}><div><div className={`text-[10px] font-black uppercase tracking-[0.2em] ${kickerText}`}>AI Operator</div><div className={`text-sm font-bold ${mutedText}`}>Prepared admin actions waiting for owner approval.</div></div><div className="flex flex-wrap gap-3"><button type="button" onClick={loadOperator} className="rounded-2xl border border-cyan-300/20 bg-white/5 px-4 py-2 text-sm font-black text-cyan-100 hover:bg-white/10">Refresh</button><Link to="/dashboard" className="rounded-2xl bg-gradient-to-r from-cyan-300 to-emerald-300 px-4 py-2 text-sm font-black text-slate-950 shadow-lg shadow-cyan-500/20">Command Board</Link></div></header>
          <section className="grid gap-5 xl:grid-cols-[1fr_430px]"><div className="overflow-hidden rounded-[30px] border border-cyan-300/20 bg-slate-950 shadow-[0_26px_80px_rgba(0,0,0,0.25)]"><div className="relative p-6 md:p-8"><div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" /><div className="relative"><span className="inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">AI Operator</span><h1 className="mt-5 max-w-3xl text-4xl font-black leading-[0.92] tracking-[-0.075em] text-white md:text-6xl">Churvox prepares. You approve.</h1><p className="mt-5 max-w-2xl text-sm font-semibold leading-6 text-slate-300 md:text-base">The AI Operator finds business admin, prepares the next action, and puts it in a clear approval queue before anything important happens.</p></div></div></div><div className={`${panel} p-5`}><div className={`text-[10px] font-black uppercase tracking-[0.2em] ${kickerText}`}>Approval health</div><h2 className="mt-2 text-2xl font-black tracking-[-0.055em] text-white">What needs attention</h2><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1"><div className={`rounded-2xl border p-4 ${riskCardStyle("high")}`}><div className="text-2xl font-black">{counts.high}</div><div className="text-xs font-black uppercase tracking-[0.14em]">High risk</div></div><div className={`rounded-2xl border p-4 ${riskCardStyle("medium")}`}><div className="text-2xl font-black">{counts.medium}</div><div className="text-xs font-black uppercase tracking-[0.14em]">Medium risk</div></div><div className={`rounded-2xl border p-4 ${riskCardStyle("pending")}`}><div className="text-2xl font-black">{counts.pending}</div><div className="text-xs font-black uppercase tracking-[0.14em]">Pending actions</div></div></div></div></section>
          <section className="mt-5 grid gap-4 md:grid-cols-4"><div className={`${innerPanel} p-4`}><div className={`text-[10px] font-black uppercase tracking-[0.16em] ${kickerText}`}>Pending</div><div className="mt-3 text-3xl font-black tracking-[-0.06em] text-white">{counts.pending}</div></div><div className="rounded-[22px] border border-red-400/30 bg-red-500/10 p-4"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-red-200">High risk</div><div className="mt-3 text-3xl font-black tracking-[-0.06em] text-red-100">{counts.high}</div></div><div className="rounded-[22px] border border-emerald-300/30 bg-emerald-400/10 p-4"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200">Approved</div><div className="mt-3 text-3xl font-black tracking-[-0.06em] text-emerald-100">{counts.approved}</div></div><div className={`${innerPanel} p-4`}><div className={`text-[10px] font-black uppercase tracking-[0.16em] ${kickerText}`}>Rejected</div><div className="mt-3 text-3xl font-black tracking-[-0.06em] text-white">{counts.rejected}</div></div></section>
          <section className={`${panel} mt-5 p-5`}><div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><div className={`text-[10px] font-black uppercase tracking-[0.2em] ${kickerText}`}>Approval queue</div><h2 className="mt-2 text-3xl font-black tracking-[-0.06em] text-white">AI-prepared actions</h2></div>{loading && <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-black text-cyan-100">Loading…</span>}</div><div className="grid gap-4 xl:grid-cols-2">{list.map((action) => <ActionCard key={idOf(action) || titleOf(action)} action={action} onOpen={setActiveAction} onApprove={approve} onReject={reject} busy={busy} />)}</div></section>
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
