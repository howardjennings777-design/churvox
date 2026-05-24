import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { useApi } from "../hooks/useApi";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  Sparkles,
  Filter,
  ShieldCheck,
  Clock,
  AlertTriangle,
  Settings,
  ChevronRight,
  X,
} from "lucide-react";
import "./AIOperatorApprovalsCommand.css";

const safeArray = (v) => (Array.isArray(v) ? v : []);

const RISK_COLOR = {
  high: "cx-status-badge cx-status-badge--red",
  medium: "cx-status-badge cx-status-badge--amber",
  low: "cx-status-badge cx-status-badge--blue",
};

const STATUS_COLOR = {
  pending: "cx-status-badge cx-status-badge--blue",
  approved: "cx-status-badge cx-status-badge--green",
  edited: "cx-status-badge cx-status-badge--amber",
  rejected: "cx-status-badge cx-status-badge--red",
  dismissed: "cx-status-badge cx-status-badge--slate",
  completed: "cx-status-badge cx-status-badge--green",
};

const GROUP_LABELS = {
  dispatch: "Dispatch",
  revenue: "Revenue",
  follow_ups: "Follow-ups",
  proof: "Proof & updates",
  receptionist: "Receptionist",
  recurring: "Recurring",
  customer_updates: "Customer Updates",
  client_memory: "Client Memory",
  general: "General",
  completed: "Completed",
};

function formatTime(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch (_e) {
    return iso;
  }
}

function ActionCard({ action, selected, onToggleSelect, onApprove, onReject, onOpen }) {
  const status = String(action.status || "pending").toLowerCase();
  const risk = String(action.risk || action.risk_level || "medium").toLowerCase();
  const reasonText = action.reason || action.subtitle || action.owner_facing_explanation || "AI prepared this action.";
  const isPending = status === "pending" || status === "edited";

  return (
    <div className="rounded-2xl border border-[#dde6f3] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:shadow-[0_4px_12px_rgba(15,23,42,0.06)] transition">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(action.id || action._id)}
          className="mt-1 h-4 w-4 rounded border-[#cbd5e1] text-[#155EEF] focus:ring-[#155EEF]"
          aria-label={`Select ${action.title}`}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <button
              type="button"
              onClick={() => onOpen(action)}
              className="text-left flex-1 min-w-0"
            >
              <h3 className="text-sm font-semibold text-[#0d1b34] truncate">{action.title || "Untitled action"}</h3>
              <p className="mt-1 text-xs text-[#5b6c87] line-clamp-2">{reasonText}</p>
            </button>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className={RISK_COLOR[risk] || RISK_COLOR.medium}>{risk}</span>
              <span className={STATUS_COLOR[status] || STATUS_COLOR.pending}>{status}</span>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[#94a3b8]">
            <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {formatTime(action.created_at)}</span>
            {action.action_type ? <span>· {String(action.action_type).replace(/_/g, " ")}</span> : null}
            {action.related_type ? <span>· {action.related_type}</span> : null}
          </div>
          {isPending ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onApprove(action)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#155EEF] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0c4ad9]"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Approve
              </button>
              <button
                type="button"
                onClick={() => onReject(action)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#cbd5e1] bg-white px-3 py-1.5 text-xs font-semibold text-[#475569] hover:bg-slate-50"
              >
                <XCircle className="h-3.5 w-3.5" /> Reject
              </button>
              <button
                type="button"
                onClick={() => onOpen(action)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#cbd5e1] bg-white px-3 py-1.5 text-xs font-semibold text-[#475569] hover:bg-slate-50"
              >
                Review details <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="mt-3 text-[11px] text-[#94a3b8]">
              No further action required.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailModal({ action, onClose, onApprove, onReject }) {
  if (!action) return null;
  const status = String(action.status || "pending").toLowerCase();
  const isPending = status === "pending" || status === "edited";
  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-slate-950/45 p-0 sm:p-4" role="dialog" aria-modal="true">
      <div className="bg-white w-full max-w-2xl max-h-[90vh] sm:max-h-[86vh] overflow-hidden rounded-t-3xl sm:rounded-3xl border border-[#d8e3f3] shadow-2xl flex flex-col">
        <div className="flex items-start justify-between gap-3 border-b border-[#d8e3f3] bg-[#f7faff] px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-[#0d1b34] truncate">{action.title || "Action detail"}</h2>
            <p className="mt-1 text-xs text-[#5b6c87]">Approval-first. AI prepares, you approve before execution.</p>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-[#5b6c87] hover:bg-white" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          <div className="rounded-xl border border-[#dde6f3] bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">Why AI suggested this</p>
            <p className="mt-1 text-sm text-[#172033]">{action.reason || action.owner_facing_explanation || "AI identified this as a useful next action."}</p>
          </div>
          {action.what_happens ? (
            <div className="rounded-xl border border-[#dde6f3] bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">What happens on approval</p>
              <p className="mt-1 text-sm text-[#172033]">{action.what_happens}</p>
            </div>
          ) : null}
          {action.recommendation ? (
            <div className="rounded-xl border border-[#dde6f3] bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">Recommendation</p>
              <p className="mt-1 text-sm text-[#172033]">{action.recommendation}</p>
            </div>
          ) : null}
          {action.generated_message ? (
            <div className="rounded-xl border border-[#dde6f3] bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">Drafted message</p>
              <pre className="mt-1 whitespace-pre-wrap text-sm text-[#172033] font-sans">{action.generated_message}</pre>
            </div>
          ) : null}
          {action.data_used ? (
            <div className="rounded-xl border border-[#dde6f3] bg-[#f7faff] p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">Source</p>
              <p className="mt-1 text-xs text-[#475569]">{action.data_used}</p>
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-3 text-xs text-[#475569]">
            <div><span className="font-semibold text-[#0d1b34]">Type:</span> {String(action.action_type || "—").replace(/_/g, " ")}</div>
            <div><span className="font-semibold text-[#0d1b34]">Risk:</span> {action.risk || action.risk_level || "medium"}</div>
            <div><span className="font-semibold text-[#0d1b34]">Status:</span> {status}</div>
            <div><span className="font-semibold text-[#0d1b34]">Created:</span> {formatTime(action.created_at)}</div>
          </div>
        </div>
        <div className="border-t border-[#d8e3f3] bg-white px-5 py-3 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-[#cbd5e1] bg-white px-4 py-2 text-sm font-semibold text-[#475569] hover:bg-slate-50">Close</button>
          {isPending ? (
            <>
              <button onClick={() => onReject(action)} className="rounded-lg border border-[#cbd5e1] bg-white px-4 py-2 text-sm font-semibold text-[#475569] hover:bg-slate-50">Reject</button>
              <button onClick={() => onApprove(action)} className="rounded-lg bg-[#155EEF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0c4ad9]">Approve & execute</button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function AIOperatorApprovalsPage() {
  const { get, post } = useApi();
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [filter, setFilter] = useState("pending");
  const [groupFilter, setGroupFilter] = useState("all");
  const [selected, setSelected] = useState(new Set());
  const [openAction, setOpenAction] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await get("/ai-operator/actions");
    if (res.success) setActions(safeArray(res.data?.actions));
    setLoading(false);
  }, [get]);

  useEffect(() => { load(); }, [load]);

  const groups = useMemo(() => {
    const set = new Set();
    actions.forEach((a) => set.add(String(a.group || "general")));
    return Array.from(set).sort();
  }, [actions]);

  const filtered = useMemo(() => {
    let list = actions;
    if (filter === "pending") list = list.filter((a) => ["pending", "edited"].includes(String(a.status || "").toLowerCase()));
    else if (filter === "completed") list = list.filter((a) => ["completed", "approved", "rejected", "dismissed"].includes(String(a.status || "").toLowerCase()));
    if (groupFilter !== "all") list = list.filter((a) => String(a.group || "general") === groupFilter);
    return list;
  }, [actions, filter, groupFilter]);

  const counts = useMemo(() => {
    const pending = actions.filter((a) => ["pending", "edited"].includes(String(a.status || "").toLowerCase())).length;
    const high = actions.filter((a) => String(a.risk || a.risk_level || "").toLowerCase() === "high" && ["pending", "edited"].includes(String(a.status || "").toLowerCase())).length;
    const completed = actions.filter((a) => ["completed", "approved"].includes(String(a.status || "").toLowerCase())).length;
    return { pending, high, completed };
  }, [actions]);

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelected(new Set(filtered.map((a) => a.id || a._id).filter(Boolean)));
  };

  const clearSelection = () => setSelected(new Set());

  const runScan = async () => {
    setScanning(true);
    const res = await post("/smart-hub/scan", {});
    setScanning(false);
    if (res.success) {
      toast.success("AI scan complete");
      load();
    } else {
      toast.error(res.error || "Scan failed");
    }
  };

  const approveOne = async (action) => {
    if (!action) return;
    const id = action.id || action._id;
    setBusy(true);
    const res = await post(`/ai-operator/actions/${id}/approve`, {});
    setBusy(false);
    if (res.success) {
      toast.success("Action approved");
      setOpenAction(null);
      load();
    } else {
      toast.error(res.error || "Failed to approve");
    }
  };

  const rejectOne = async (action) => {
    if (!action) return;
    const id = action.id || action._id;
    setBusy(true);
    const res = await post(`/ai-operator/actions/${id}/reject`, {});
    setBusy(false);
    if (res.success) {
      toast.success("Action rejected");
      setOpenAction(null);
      load();
    } else {
      toast.error(res.error || "Failed to reject");
    }
  };

  const bulkApprove = async () => {
    if (selected.size === 0) return;
    setBusy(true);
    const res = await post("/ai-operator/actions/bulk-approve", { action_ids: Array.from(selected) });
    setBusy(false);
    if (res.success) {
      toast.success(`Approved ${res.data?.succeeded || 0} of ${res.data?.processed || 0}`);
      clearSelection();
      load();
    } else {
      toast.error(res.error || "Bulk approve failed");
    }
  };

  const bulkReject = async () => {
    if (selected.size === 0) return;
    setBusy(true);
    const res = await post("/ai-operator/actions/bulk-reject", { action_ids: Array.from(selected) });
    setBusy(false);
    if (res.success) {
      toast.success(`Rejected ${res.data?.succeeded || 0}`);
      clearSelection();
      load();
    } else {
      toast.error(res.error || "Bulk reject failed");
    }
  };

  return (
    <Layout>
      <div className="cx-page ai-approvals-command" data-version="CHURVOX_AI_APPROVALS_COMMAND_20260525">
        <div className="cx-page-hero">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="cx-page-title flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-[#155EEF]" /> AI Approvals Queue
              </h1>
              <p className="cx-page-subtitle mt-1">
                AI prepares actions across your business. You approve, edit or reject — nothing executes without your sign-off (or your explicit auto-run setting).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/ai-operator/settings"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#cbd5e1] bg-white px-3 py-2 text-sm font-semibold text-[#475569] hover:bg-slate-50"
              >
                <Settings className="h-4 w-4" /> Operator settings
              </Link>
              <button
                type="button"
                onClick={runScan}
                disabled={scanning}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#155EEF] px-3 py-2 text-sm font-semibold text-white hover:bg-[#0c4ad9] disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${scanning ? "animate-spin" : ""}`} /> {scanning ? "Scanning…" : "Run AI scan"}
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="cx-stat-card">
              <p className="text-xs uppercase tracking-wide text-[#94a3b8]">Pending</p>
              <p className="mt-1 text-2xl font-bold text-[#0d1b34]">{counts.pending}</p>
            </div>
            <div className="cx-stat-card">
              <p className="text-xs uppercase tracking-wide text-[#94a3b8]">High risk</p>
              <p className="mt-1 text-2xl font-bold text-[#dc2626]">{counts.high}</p>
            </div>
            <div className="cx-stat-card">
              <p className="text-xs uppercase tracking-wide text-[#94a3b8]">Completed today</p>
              <p className="mt-1 text-2xl font-bold text-[#15803d]">{counts.completed}</p>
            </div>
            <div className="cx-stat-card">
              <p className="text-xs uppercase tracking-wide text-[#94a3b8]">Total tracked</p>
              <p className="mt-1 text-2xl font-bold text-[#0d1b34]">{actions.length}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-[#dde6f3] bg-white p-0.5 text-sm">
            {["pending", "completed", "all"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-md font-semibold capitalize ${filter === f ? "bg-[#155EEF] text-white" : "text-[#475569] hover:bg-slate-50"}`}
              >
                {f}
              </button>
            ))}
          </div>
          {groups.length > 0 ? (
            <div className="inline-flex items-center gap-1 rounded-lg border border-[#dde6f3] bg-white px-2 py-1 text-sm">
              <Filter className="h-3.5 w-3.5 text-[#94a3b8]" />
              <select
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
                className="bg-transparent text-sm text-[#475569] focus:outline-none"
              >
                <option value="all">All categories</option>
                {groups.map((g) => (
                  <option key={g} value={g}>{GROUP_LABELS[g] || g}</option>
                ))}
              </select>
            </div>
          ) : null}
          {selected.size > 0 ? (
            <div className="ml-auto inline-flex items-center gap-2 rounded-lg border border-[#155EEF] bg-[#eff5ff] px-3 py-1.5 text-sm">
              <span className="font-semibold text-[#0c4ad9]">{selected.size} selected</span>
              <button onClick={clearSelection} className="text-xs text-[#475569] hover:underline">clear</button>
              <button
                onClick={bulkApprove}
                disabled={busy}
                className="inline-flex items-center gap-1 rounded-md bg-[#155EEF] px-2 py-1 text-xs font-semibold text-white hover:bg-[#0c4ad9] disabled:opacity-60"
              >
                <CheckCircle2 className="h-3 w-3" /> Approve all
              </button>
              <button
                onClick={bulkReject}
                disabled={busy}
                className="inline-flex items-center gap-1 rounded-md border border-[#cbd5e1] bg-white px-2 py-1 text-xs font-semibold text-[#475569] hover:bg-slate-50 disabled:opacity-60"
              >
                <XCircle className="h-3 w-3" /> Reject all
              </button>
            </div>
          ) : (
            filtered.length > 0 ? (
              <button
                onClick={selectAllVisible}
                className="ml-auto text-xs font-semibold text-[#155EEF] hover:underline"
              >
                Select all visible
              </button>
            ) : null
          )}
        </div>

        <div className="mt-3 flex items-start gap-2 rounded-xl border border-[#bfdbfe] bg-[#eff6ff] p-3 text-xs text-[#1e3a8a]">
          <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            <p className="font-semibold">Approval-first by default.</p>
            <p className="mt-0.5 opacity-90">No auto-charge. No MYOB writes. No payroll changes. No deletes. Auto-send is OFF unless explicitly enabled in <Link to="/ai-operator/settings" className="underline">Operator Settings</Link>.</p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {loading ? (
            <div className="cx-loading-state">Loading AI actions…</div>
          ) : filtered.length === 0 ? (
            <div className="cx-empty-state-inline">
              <AlertTriangle className="mx-auto h-6 w-6 text-[#94a3b8]" />
              <p className="mt-2 text-sm font-semibold text-[#0d1b34]">No {filter === "all" ? "" : filter} actions right now.</p>
              <p className="mt-1 text-xs text-[#5b6c87]">Click "Run AI scan" to scan your business state and prepare actions.</p>
            </div>
          ) : (
            filtered.map((a) => (
              <ActionCard
                key={a.id || a._id}
                action={a}
                selected={selected.has(a.id || a._id)}
                onToggleSelect={toggleSelect}
                onApprove={approveOne}
                onReject={rejectOne}
                onOpen={setOpenAction}
              />
            ))
          )}
        </div>
      </div>
      <DetailModal action={openAction} onClose={() => setOpenAction(null)} onApprove={approveOne} onReject={rejectOne} />
    </Layout>
  );
}
