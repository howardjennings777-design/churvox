import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../../hooks/useApi";
import { toast } from "sonner";
import {
  Sparkles,
  RefreshCw,
  Settings as SettingsIcon,
  Users,
  FileText,
  Receipt,
  AlertTriangle,
  CalendarClock,
  MessageSquare,
  BadgeDollarSign,
  ShieldCheck,
  ChevronRight,
  CheckCircle2,
  XCircle,
} from "lucide-react";

const safeArray = (v) => (Array.isArray(v) ? v : []);
const money = (v) => `$${Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

function UrgentTile({ icon, label, value, sub, link, urgent, onClick }) {
  const Wrapper = link ? Link : "button";
  const props = link ? { to: link } : { type: "button", onClick };
  return (
    <Wrapper
      {...props}
      className={`text-left rounded-xl border bg-white p-3 transition hover:shadow-[0_2px_8px_rgba(15,23,42,0.06)] ${
        urgent ? "border-[#fecaca] bg-[#fef2f2]" : "border-[#dde6f3]"
      }`}
    >
      <div className="flex items-start gap-2">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${urgent ? "bg-white text-[#dc2626]" : "bg-[#eff6ff] text-[#155EEF]"}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94a3b8]">{label}</p>
          <p className={`mt-0.5 text-lg font-bold leading-tight ${urgent ? "text-[#b91c1c]" : "text-[#0d1b34]"}`}>{value}</p>
          {sub ? <p className="mt-0.5 text-[11px] text-[#5b6c87]">{sub}</p> : null}
        </div>
      </div>
    </Wrapper>
  );
}

function QuickActionCard({ action, onApprove, onReject, onOpen }) {
  const risk = String(action.risk || action.risk_level || "medium").toLowerCase();
  const riskColor = risk === "high" ? "text-[#dc2626]" : risk === "low" ? "text-[#0d9488]" : "text-[#d97706]";
  return (
    <div className="rounded-xl border border-[#dde6f3] bg-white p-3">
      <div className="flex items-start gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eff6ff] text-[#155EEF]">
          <Sparkles className="h-4 w-4" />
        </div>
        <button
          type="button"
          onClick={() => onOpen(action)}
          className="text-left flex-1 min-w-0"
        >
          <p className="text-sm font-semibold text-[#0d1b34] truncate">{action.title || "AI action"}</p>
          <p className="mt-0.5 text-xs text-[#5b6c87] line-clamp-2">{action.reason || action.subtitle || "Prepared for approval."}</p>
          <p className={`mt-1 text-[11px] font-semibold uppercase ${riskColor}`}>{risk} risk</p>
        </button>
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onApprove(action)}
          className="inline-flex items-center gap-1 rounded-md bg-[#155EEF] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#0c4ad9]"
        >
          <CheckCircle2 className="h-3 w-3" /> Approve
        </button>
        <button
          type="button"
          onClick={() => onReject(action)}
          className="inline-flex items-center gap-1 rounded-md border border-[#cbd5e1] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#475569] hover:bg-slate-50"
        >
          <XCircle className="h-3 w-3" /> Reject
        </button>
      </div>
    </div>
  );
}

export default function CommandCentreStrip() {
  const { get, post } = useApi();
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [openAction, setOpenAction] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await get("/ai-operator/command-snapshot");
    if (res.success) setSnapshot(res.data || {});
    setLoading(false);
  }, [get]);

  useEffect(() => { load(); }, [load]);

  const runScan = async () => {
    setScanning(true);
    const res = await post("/smart-hub/scan", {});
    setScanning(false);
    if (res.success) {
      toast.success(`AI scan complete${res.data?.created ? ` (${res.data.created} new actions)` : ""}`);
      load();
    } else {
      toast.error(res.error || "Scan failed");
    }
  };

  const approve = async (action) => {
    const id = action.id || action._id;
    if (!id) return;
    const res = await post(`/ai-operator/actions/${id}/approve`, {});
    if (res.success) {
      toast.success("Approved");
      load();
    } else {
      toast.error(res.error || "Approve failed");
    }
  };

  const reject = async (action) => {
    const id = action.id || action._id;
    if (!id) return;
    const res = await post(`/ai-operator/actions/${id}/reject`, {});
    if (res.success) {
      toast.success("Rejected");
      load();
    } else {
      toast.error(res.error || "Reject failed");
    }
  };

  const urgent = snapshot?.urgent || {};
  const approvals = snapshot?.approvals || {};
  const items = safeArray(approvals.items);
  const nextBest = snapshot?.next_best_move;

  const tiles = useMemo(() => {
    return [
      { key: "approvals", icon: <Sparkles className="h-4 w-4" />, label: "AI approvals", value: approvals.total_pending || 0, sub: "Awaiting your sign-off", link: "/ai-operator/approvals", urgent: (approvals.total_pending || 0) > 0 },
      { key: "unassigned", icon: <Users className="h-4 w-4" />, label: "Unassigned jobs", value: urgent.unassigned_jobs || 0, sub: "Need a crew", link: "/dispatch", urgent: (urgent.unassigned_jobs || 0) > 0 },
      { key: "to_invoice", icon: <FileText className="h-4 w-4" />, label: "Ready to invoice", value: urgent.completed_no_invoice || 0, sub: "Completed jobs", link: "/proof-to-paid", urgent: (urgent.completed_no_invoice || 0) > 0 },
      { key: "overdue", icon: <Receipt className="h-4 w-4" />, label: "Overdue invoices", value: urgent.overdue_invoices || 0, sub: money(urgent.open_invoices_total || 0) + " open", link: "/invoices", urgent: (urgent.overdue_invoices || 0) > 0 },
      { key: "quotes", icon: <BadgeDollarSign className="h-4 w-4" />, label: "Open quotes", value: urgent.open_quotes || 0, sub: "Awaiting client reply", link: "/quotes" },
      { key: "timesheets", icon: <CalendarClock className="h-4 w-4" />, label: "Pending timesheets", value: urgent.pending_timesheets || 0, sub: "Need approval", link: "/payroll" },
      { key: "sms", icon: <MessageSquare className="h-4 w-4" />, label: "SMS credits", value: urgent.sms_credits || 0, sub: urgent.low_sms_credits ? "Low — top up soon" : "Available", link: "/sms", urgent: !!urgent.low_sms_credits },
      { key: "myob", icon: <ShieldCheck className="h-4 w-4" />, label: "MYOB", value: urgent.myob_connected ? "Live" : "Setup", sub: urgent.myob_connected ? "Connected" : "Connect to sync", link: "/integrations", urgent: !urgent.myob_connected },
    ];
  }, [urgent, approvals]);

  return (
    <section className="rounded-3xl border border-[#dde6f3] bg-white p-4 sm:p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#155EEF]" />
            <h2 className="text-base font-bold text-[#0d1b34]">Command centre</h2>
          </div>
          <p className="mt-1 text-sm text-[#5b6c87]">
            {loading ? "Loading live business state…" : (nextBest || "All clear.")}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            to="/ai-operator/settings"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#cbd5e1] bg-white px-3 py-1.5 text-sm font-semibold text-[#475569] hover:bg-slate-50"
          >
            <SettingsIcon className="h-4 w-4" /> Settings
          </Link>
          <button
            type="button"
            onClick={runScan}
            disabled={scanning}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#155EEF] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#0c4ad9] disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${scanning ? "animate-spin" : ""}`} /> {scanning ? "Scanning…" : "Run AI Plan"}
          </button>
        </div>
      </div>

      {/* Urgent tiles */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {tiles.map((t) => (
          <UrgentTile key={t.key} {...t} />
        ))}
      </div>

      {/* AI approvals quick view */}
      {items.length > 0 ? (
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-[#0d1b34]">Top AI-prepared actions</h3>
            <Link to="/ai-operator/approvals" className="inline-flex items-center gap-1 text-xs font-semibold text-[#155EEF] hover:underline">
              Open queue <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {items.slice(0, 6).map((a) => (
              <QuickActionCard
                key={a.id || a._id}
                action={a}
                onApprove={approve}
                onReject={reject}
                onOpen={setOpenAction}
              />
            ))}
          </div>
        </div>
      ) : (
        !loading ? (
          <div className="mt-5 rounded-xl border border-dashed border-[#cbd5e1] bg-[#fbfdff] p-5 text-center">
            <AlertTriangle className="mx-auto h-5 w-5 text-[#94a3b8]" />
            <p className="mt-2 text-sm font-semibold text-[#0d1b34]">No AI actions ready right now</p>
            <p className="mt-1 text-xs text-[#5b6c87]">Click "Run AI Plan" to scan your business and prepare next actions.</p>
          </div>
        ) : null
      )}

      {/* Detail modal */}
      {openAction ? (
        <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-slate-950/45 p-0 sm:p-4" role="dialog" aria-modal="true" onClick={() => setOpenAction(null)}>
          <div className="bg-white w-full max-w-lg max-h-[86vh] overflow-hidden rounded-t-3xl sm:rounded-3xl border border-[#d8e3f3] shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 border-b border-[#d8e3f3] bg-[#f7faff] px-4 py-3">
              <div className="min-w-0">
                <h3 className="text-base font-bold text-[#0d1b34] truncate">{openAction.title}</h3>
                <p className="mt-0.5 text-xs text-[#5b6c87]">AI prepared. Approval-first.</p>
              </div>
              <button onClick={() => setOpenAction(null)} className="rounded-md p-1.5 text-[#5b6c87] hover:bg-white">×</button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 text-sm">
              <p className="text-[#172033]">{openAction.reason || openAction.owner_facing_explanation || "AI prepared this action."}</p>
              {openAction.recommendation ? <p className="text-[#475569] text-xs"><strong>Recommendation:</strong> {openAction.recommendation}</p> : null}
              {openAction.generated_message ? (
                <div className="rounded-lg border border-[#dde6f3] bg-[#f7faff] p-3 text-xs text-[#172033]">
                  <p className="font-semibold mb-1">Drafted message</p>
                  <pre className="whitespace-pre-wrap font-sans">{openAction.generated_message}</pre>
                </div>
              ) : null}
            </div>
            <div className="border-t border-[#d8e3f3] bg-white px-4 py-3 flex justify-end gap-2">
              <button onClick={() => setOpenAction(null)} className="rounded-md border border-[#cbd5e1] bg-white px-3 py-1.5 text-xs font-semibold text-[#475569] hover:bg-slate-50">Close</button>
              <button onClick={() => { reject(openAction); setOpenAction(null); }} className="rounded-md border border-[#cbd5e1] bg-white px-3 py-1.5 text-xs font-semibold text-[#475569] hover:bg-slate-50">Reject</button>
              <button onClick={() => { approve(openAction); setOpenAction(null); }} className="rounded-md bg-[#155EEF] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0c4ad9]">Approve</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
