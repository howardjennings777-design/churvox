import React, { useCallback, useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import {
  BadgeCheck,
  CalendarRange,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  Download,
  FileClock,
  Lock,
  Settings,
  ShieldCheck,
  Sparkles,
  Unlock,
  UserCircle2,
  UsersRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";
import { formatCurrency } from "../lib/utils";

const DISCLAIMER = "Churvox prepares payroll for review and handoff. Tax filing, government submission, and bank payments are handled outside Churvox.";
const FREQUENCY_OPTIONS = ["weekly", "fortnightly", "monthly", "custom"];

function safeFilePart(value) {
  return String(value || "pay-run").trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-_]/g, "");
}

function statusBadge(status) {
  const s = String(status || "open").toLowerCase();
  if (s === "exported") return "cx-status-badge cx-status-badge--green";
  if (s === "locked") return "cx-status-badge cx-status-badge--amber";
  if (s === "pending_review") return "cx-status-badge cx-status-badge--amber";
  if (s === "needs_rate" || s === "missing_tax_config" || s === "rejected") return "cx-status-badge cx-status-badge--red";
  return "cx-status-badge cx-status-badge--blue";
}

export default function PayrollPage() {
  const { get, post, del, loading, error } = useApi();
  const [periods, setPeriods] = useState([]);
  const [activePeriodId, setActivePeriodId] = useState("");
  const [summary, setSummary] = useState(null);
  const [timesheets, setTimesheets] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [settings, setSettings] = useState({ payroll_method: "manual", rate_mode: "manual_rate", default_rate: 0, default_pay_frequency: "fortnightly" });
  const [workerDetails, setWorkerDetails] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [initializing, setInitializing] = useState(true);
  const [showCreateRun, setShowCreateRun] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedTimesheetIds, setSelectedTimesheetIds] = useState([]);
  const [newRun, setNewRun] = useState({ name: "", start_date: "", end_date: "", pay_date: "", pay_frequency: "fortnightly", notes: "" });
  const [adjustmentForm, setAdjustmentForm] = useState({ worker_id: "", type: "allowance", label: "", amount: "", taxable: false, notes: "" });

  const withAction = async (key, fn) => {
    setActionLoading((s) => ({ ...s, [key]: true }));
    try {
      return await fn();
    } finally {
      setActionLoading((s) => ({ ...s, [key]: false }));
    }
  };

  const loadPeriodData = useCallback(async (periodId) => {
    if (!periodId) {
      setSummary(null);
      setTimesheets([]);
      setAdjustments([]);
      return;
    }
    const [summaryRes, timesheetsRes, adjustmentRes] = await Promise.all([
      get(`/payroll/summary?period_id=${periodId}`),
      get(`/payroll/timesheets?period_id=${periodId}`),
      get(`/payroll/adjustments?period_id=${periodId}`),
    ]);
    setSummary(summaryRes?.success ? summaryRes.data : null);
    setTimesheets(timesheetsRes?.success ? (timesheetsRes.data?.timesheets || []) : []);
    setAdjustments(adjustmentRes?.success ? (adjustmentRes.data?.adjustments || []) : []);
    setSelectedTimesheetIds([]);
  }, [get]);

  const loadInitial = useCallback(async () => {
    setInitializing(true);
    const [periodRes, workerRes, settingsRes] = await Promise.all([
      get("/payroll/periods"),
      get("/payroll/workers"),
      get("/payroll/settings"),
    ]);
    const loadedPeriods = periodRes?.success ? (periodRes.data?.pay_periods || []) : [];
    const loadedWorkers = workerRes?.success ? (workerRes.data?.workers || []) : [];
    const loadedSettings = settingsRes?.success ? settingsRes.data : {};
    setPeriods(loadedPeriods);
    setWorkers(loadedWorkers);
    setSettings({
      payroll_method: loadedSettings?.payroll_method || "manual",
      rate_mode: loadedSettings?.rate_mode || "manual_rate",
      default_rate: Number(loadedSettings?.default_hourly_rate ?? loadedSettings?.default_tax_rate ?? 0),
      default_pay_frequency: loadedSettings?.default_pay_frequency || "fortnightly",
      notes: loadedSettings?.notes || DISCLAIMER,
    });

    const nextId = loadedPeriods[0]?.id || "";
    setActivePeriodId((current) => current || nextId);
    if (nextId) await loadPeriodData(nextId);
    setInitializing(false);
  }, [get, loadPeriodData]);

  useEffect(() => { loadInitial(); }, [loadInitial]);
  useEffect(() => { if (activePeriodId) loadPeriodData(activePeriodId); }, [activePeriodId, loadPeriodData]);

  const activePeriod = useMemo(() => periods.find((p) => p.id === activePeriodId) || null, [periods, activePeriodId]);
  const workerSummaries = summary?.worker_summaries || [];
  const pendingTimesheets = timesheets.filter((t) => String(t.status || "").toLowerCase() === "pending");
  const readOnly = ["locked", "exported"].includes(String(activePeriod?.status || "").toLowerCase());
  const adjustmentsTotal = Number(summary?.adjustments_total || adjustments.reduce((sum, item) => sum + Number(item?.amount || 0), 0));
  const selectedPending = pendingTimesheets.filter((t) => selectedTimesheetIds.includes(t.entry_id));

  const workflowStep = useMemo(() => {
    if (!activePeriod) return 1;
    if (activePeriod?.status === "exported") return 5;
    if (activePeriod?.status === "locked") return 4;
    if ((summary?.pending_review_count || pendingTimesheets.length) > 0) return 2;
    return 3;
  }, [activePeriod, summary, pendingTimesheets.length]);

  const statCards = [
    { label: "Current pay run", value: activePeriod?.name || "None", help: activePeriod ? `${activePeriod.start_date} → ${activePeriod.end_date}` : "Create your first pay run", icon: CalendarRange, tint: "bg-blue-50" },
    { label: "Approved hours", value: Number(summary?.approved_hours || 0), help: "Hours approved for payment", icon: Clock3, tint: "bg-emerald-50" },
    { label: "Pending review", value: Number(summary?.pending_review_count || pendingTimesheets.length), help: "Timesheets waiting approval", icon: FileClock, tint: "bg-amber-50" },
    { label: "Workers included", value: Number(summary?.workers_included || workerSummaries.length), help: "Workers in this pay run", icon: UsersRound, tint: "bg-blue-50" },
    { label: "Adjustments total", value: formatCurrency(adjustmentsTotal), help: "Allowances, deductions, and bonuses", icon: CircleDollarSign, tint: "bg-blue-50" },
    { label: "Export status", value: String(activePeriod?.export_status || "not_exported").replaceAll("_", " "), help: activePeriod?.exported_at ? `Last export ${String(activePeriod.exported_at).slice(0, 19)}` : "Ready for handoff", icon: ClipboardCheck, tint: "bg-cyan-50" },
    { label: "Locked status", value: readOnly ? "Locked" : "Open", help: readOnly ? "Edits disabled" : "Edits allowed", icon: ShieldCheck, tint: readOnly ? "bg-blue-50" : "bg-emerald-50" },
  ];

  const downloadCsv = async (path, filename, label) => {
    if (!activePeriodId) return;
    await withAction(`export-${label}`, async () => {
      const res = await get(path, { responseType: "blob" });
      if (!res?.success) return toast.error(res?.error || `Failed to export ${label}`);
      const blob = new Blob([res.data], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`${label} downloaded`);
    });
  };

  const createPayRun = async () => {
    if (!newRun.name || !newRun.start_date || !newRun.end_date || !newRun.pay_date) return toast.error("Name, start date, end date, and pay date are required.");
    if (newRun.end_date <= newRun.start_date) return toast.error("End date must be after start date.");
    await withAction("create-run", async () => {
      const res = await post("/payroll/periods", newRun);
      if (!res?.success) return toast.error(res?.error || "Failed to create pay run");
      const id = res.data?.id;
      setShowCreateRun(false);
      setNewRun({ name: "", start_date: "", end_date: "", pay_date: "", pay_frequency: settings.default_pay_frequency || "fortnightly", notes: "" });
      await loadInitial();
      if (id) {
        setActivePeriodId(id);
        await loadPeriodData(id);
      }
      toast.success("Pay run created");
    });
  };

  const openWorkerDetails = async (workerId) => withAction(`worker-${workerId}`, async () => {
    const res = await get(`/payroll/workers/${workerId}?period_id=${activePeriodId}`);
    if (!res?.success) return toast.error(res?.error || "Failed to load worker details");
    setWorkerDetails(res.data);
  });

  const approveOne = async (entryId) => withAction(`approve-${entryId}`, async () => {
    const res = await post(`/payroll/timesheets/${entryId}/approve`, {});
    if (!res?.success) return toast.error(res?.error || "Approval failed");
    toast.success("Timesheet approved");
    await loadPeriodData(activePeriodId);
  });

  const rejectOne = async (entryId, note = "Rejected in payroll review") => withAction(`reject-${entryId}`, async () => {
    const res = await post(`/payroll/timesheets/${entryId}/reject`, { notes: note });
    if (!res?.success) return toast.error(res?.error || "Reject failed");
    toast.success("Timesheet moved to review");
    await loadPeriodData(activePeriodId);
  });

  const approveSelected = async () => {
    if (!selectedPending.length) return toast.error("Select at least one pending timesheet.");
    await withAction("approve-selected", async () => {
      const res = await post("/payroll/timesheets/bulk-approve", { entry_ids: selectedPending.map((x) => x.entry_id) });
      if (!res?.success) return toast.error(res?.error || "Bulk approval failed");
      toast.success(`Approved ${res.data?.updated || 0} entries`);
      await loadPeriodData(activePeriodId);
    });
  };

  const bulkApproveAll = async () => withAction("bulk-approve-all", async () => {
    const res = await post(`/payroll/periods/${activePeriodId}/bulk-approve`, {});
    if (!res?.success) return toast.error(res?.error || "Bulk approval failed");
    toast.success(res.data?.message || "Pending entries approved");
    await loadPeriodData(activePeriodId);
  });

  const lockRun = async () => withAction("lock-run", async () => {
    const res = await post(`/payroll/periods/${activePeriodId}/lock`, {});
    if (!res?.success) return toast.error(res?.error || "Failed to lock run");
    toast.success("Pay run locked");
    await loadInitial();
  });

  const unlockRun = async () => withAction("unlock-run", async () => {
    const res = await post(`/payroll/periods/${activePeriodId}/unlock`, {});
    if (!res?.success) return toast.error(res?.error || "Failed to unlock run");
    toast.success("Pay run unlocked");
    await loadInitial();
  });

  const markExported = async () => withAction("mark-exported", async () => {
    const res = await post(`/payroll/periods/${activePeriodId}/mark-exported`, {});
    if (!res?.success) return toast.error(res?.error || "Failed to mark exported");
    toast.success("Run marked as exported");
    await loadInitial();
  });

  const addAdjustment = async () => {
    if (!activePeriodId || !adjustmentForm.worker_id || !adjustmentForm.label || adjustmentForm.amount === "") return toast.error("Worker, label, and amount are required");
    await withAction("add-adjustment", async () => {
      const res = await post("/payroll/adjustments", { ...adjustmentForm, period_id: activePeriodId, amount: Number(adjustmentForm.amount || 0) });
      if (!res?.success) return toast.error(res?.error || "Failed to add adjustment");
      toast.success("Adjustment added");
      setAdjustmentForm({ worker_id: "", type: "allowance", label: "", amount: "", taxable: false, notes: "" });
      await loadPeriodData(activePeriodId);
    });
  };

  const deleteAdjustment = async (adjustmentId) => withAction(`delete-adjustment-${adjustmentId}`, async () => {
    const res = await del(`/payroll/adjustments/${adjustmentId}`);
    if (!res?.success) return toast.error(res?.error || "Failed to remove adjustment");
    toast.success("Adjustment removed");
    await loadPeriodData(activePeriodId);
  });

  const saveSettings = async () => withAction("save-settings", async () => {
    const res = await post("/payroll/settings", {
      payroll_method: settings.payroll_method,
      rate_mode: settings.rate_mode,
      default_rate: Number(settings.default_rate || 0),
      default_pay_frequency: settings.default_pay_frequency,
      notes: settings.notes || DISCLAIMER,
    });
    if (!res?.success) return toast.error(res?.error || "Settings save failed");
    toast.success("Payroll settings saved");
    setShowSettings(false);
    await loadInitial();
  });

  const workerOptions = workerSummaries.length ? workerSummaries.map((w) => ({ id: w.worker_id, name: w.name || w.worker_name || "Worker" })) : workers.map((w) => ({ id: w.id, name: w.name || "Worker" }));
  const payRunPart = safeFilePart(activePeriod?.name || activePeriodId);

  return (
    <Layout>
      <div className="cx-page space-y-6" >
        <section className="rounded-3xl border border-border bg-gradient-to-br from-white via-[#f6f9ff] to-[#eef6ff] p-6 shadow-[0_10px_30px_rgba(16,24,40,0.08)]">
          <h1 className="cx-page-title">Payroll Command Centre</h1>
          <p className="cx-page-subtitle">Review timesheets, approve hours, prepare pay runs, and export clean payroll summaries.</p>
          <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700"><Sparkles size={14} />{DISCLAIMER}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="cx-button-primary" onClick={() => setShowCreateRun(true)}>Create pay run</button>
            <button className="cx-button-secondary" onClick={() => document.getElementById("export-centre")?.scrollIntoView({ behavior: "smooth" })}>Export centre</button>
            <button className="cx-button-secondary" onClick={() => setShowSettings(true)}><Settings size={14} className="mr-2" />Payroll settings</button>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className={`rounded-2xl border border-border p-4 shadow-sm ${card.tint}`}>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">{card.label}</p>
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-blue-700"><Icon size={15} /></span>
                </div>
                <p className="mt-2 text-xl font-bold capitalize text-slate-900">{card.value}</p>
                <p className="text-xs text-slate-500">{card.help}</p>
              </div>
            );
          })}
        </section>

        <section className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">Payroll workflow</p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-5">
            {["Create pay run", "Review timesheets", "Add adjustments", "Lock pay run", "Export payroll"].map((step, idx) => (
              <div key={step} className={`rounded-xl border p-3 text-sm ${workflowStep >= idx + 1 ? "border-blue-500 bg-blue-50 text-blue-800" : "border-border bg-slate-50 text-slate-500"}`}>
                <p className="text-xs">Step {idx + 1}</p>
                <p className="font-semibold">{step}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Active pay run</h2>
          {!periods.length ? (
            <div className="mt-3 rounded-xl border border-dashed border-border bg-slate-50 p-5 text-center">
              <p className="font-semibold text-slate-900">No pay run created yet.</p>
              <p className="text-sm text-slate-500">Create a pay run to begin reviewing tracked worker hours.</p>
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
              {periods.map((p) => (
                <button key={p.id} className={`rounded-xl border p-4 text-left ${activePeriodId === p.id ? "border-blue-500 bg-blue-50" : "border-border bg-slate-50"}`} onClick={() => setActivePeriodId(p.id)}>
                  <p className="font-semibold text-slate-900">{p.name}</p>
                  <p className="text-xs text-slate-500">{p.start_date} → {p.end_date} · Pay date {p.pay_date}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className={statusBadge(p.status)}>{p.status || "open"}</span>
                    <span className="text-xs text-slate-500">Workers {Number(summary?.workers_included || 0)}</span>
                    <span className="text-xs text-slate-500">Pending {Number(summary?.pending_review_count || 0)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-slate-900">Timesheet review queue</h2>
            <div className="flex flex-wrap gap-2">
              <button className="cx-button-secondary" disabled={!activePeriodId || readOnly || !selectedPending.length || actionLoading["approve-selected"]} onClick={approveSelected}>Approve selected</button>
              <button className="cx-button-secondary" disabled={!activePeriodId || readOnly || !pendingTimesheets.length || actionLoading["bulk-approve-all"]} onClick={bulkApproveAll}>Bulk approve</button>
            </div>
          </div>
          {!timesheets.length ? (
            <div className="mt-3 rounded-xl border border-dashed border-border bg-slate-50 p-5 text-center">
              <p className="font-semibold text-slate-900">No timesheets awaiting review.</p>
              <p className="text-sm text-slate-500">Tracked worker time will appear here once jobs are started and completed.</p>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {timesheets.map((t) => (
                <div key={t.entry_id} className="rounded-xl border border-border bg-slate-50 p-3">
                  <div className="grid grid-cols-1 gap-2 lg:grid-cols-10 text-sm">
                    <label className="lg:col-span-1"><input type="checkbox" disabled={readOnly || t.status !== "pending"} checked={selectedTimesheetIds.includes(t.entry_id)} onChange={(e) => setSelectedTimesheetIds((prev) => e.target.checked ? [...prev, t.entry_id] : prev.filter((id) => id !== t.entry_id))} /></label>
                    <p className="lg:col-span-2"><b>Worker:</b> {t.worker_name || "Worker"}</p>
                    <p className="lg:col-span-2"><b>Job:</b> {t.job_title || "Job"}</p>
                    <p><b>Date:</b> {t.date || "—"}</p>
                    <p><b>Start:</b> {t.started_at ? String(t.started_at).slice(11, 16) : "—"}</p>
                    <p><b>End:</b> {t.ended_at ? String(t.ended_at).slice(11, 16) : "—"}</p>
                    <p><b>Break:</b> {Number(t.paused_minutes || 0)}m</p>
                    <p><b>Net:</b> {Number(t.net_hours || 0)}h</p>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className={statusBadge(t.status)}>{t.status || "pending"}</span>
                    <button className="cx-button-secondary" disabled={readOnly || t.status !== "pending" || actionLoading[`approve-${t.entry_id}`]} onClick={() => approveOne(t.entry_id)}>Approve</button>
                    <button className="cx-button-secondary" disabled={readOnly || t.status !== "pending" || actionLoading[`reject-${t.entry_id}`]} onClick={() => rejectOne(t.entry_id)}>Reject</button>
                    <button className="cx-button-secondary" disabled={readOnly || t.status !== "pending"} onClick={() => rejectOne(t.entry_id, "Needs review")}>Mark needs review</button>
                    <button className="cx-button-secondary" disabled={!t.job_id} onClick={() => { window.location.href = `/jobs/${t.job_id}`; }}>Open related job</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Worker pay summaries</h2>
          {!activePeriodId ? <p className="mt-2 text-sm text-slate-500">Create/select a pay run to load worker summaries.</p> : null}
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            {workerSummaries.map((w) => (
              <div key={w.worker_id} className="rounded-xl border border-border bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><UserCircle2 size={18} className="text-blue-700" /><p className="font-semibold text-slate-900">{w.name || w.worker_name || "Worker"}</p></div>
                  <span className={statusBadge(w.status)}>{w.status || "ready"}</span>
                </div>
                <p className="text-sm text-slate-500">{w.role || "worker"}</p>
                <div className="mt-2 grid grid-cols-2 gap-1 text-sm">
                  <p>Approved: {Number(w.approved_hours || 0)}h</p>
                  <p>Pending: {Number(w.pending_hours || 0)}h</p>
                  <p>Jobs: {Number(w.jobs_worked || 0)}</p>
                  <p>Adjustments: {formatCurrency(w.adjustments_total || 0)}</p>
                  <p className="col-span-2">Estimated gross: {formatCurrency(w.gross_pay || 0)}</p>
                </div>
                <button className="cx-button-secondary mt-3" onClick={() => openWorkerDetails(w.worker_id)}>View details</button>
              </div>
            ))}
          </div>
          {!!activePeriodId && !workerSummaries.length ? <p className="mt-3 text-sm text-slate-500">No workers or timesheets found for this pay run yet.</p> : null}
        </section>

        <section className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Adjustments & allowances</h2>
          {readOnly ? <p className="mt-2 text-sm text-amber-700">This pay run is locked. Unlock or create a new pay run to edit adjustments.</p> : null}
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            <select className="cx-input" value={adjustmentForm.worker_id} onChange={(e) => setAdjustmentForm((v) => ({ ...v, worker_id: e.target.value }))} disabled={!activePeriodId || readOnly}><option value="">Worker</option>{workerOptions.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select>
            <select className="cx-input" value={adjustmentForm.type} onChange={(e) => setAdjustmentForm((v) => ({ ...v, type: e.target.value }))} disabled={!activePeriodId || readOnly}><option value="allowance">allowance</option><option value="deduction">deduction</option><option value="bonus">bonus</option><option value="reimbursement">reimbursement</option><option value="correction">correction</option></select>
            <input className="cx-input" placeholder="Label" value={adjustmentForm.label} onChange={(e) => setAdjustmentForm((v) => ({ ...v, label: e.target.value }))} disabled={!activePeriodId || readOnly} />
            <input className="cx-input" type="number" placeholder="Amount" value={adjustmentForm.amount} onChange={(e) => setAdjustmentForm((v) => ({ ...v, amount: e.target.value }))} disabled={!activePeriodId || readOnly} />
            <input className="cx-input" placeholder="Notes (optional)" value={adjustmentForm.notes} onChange={(e) => setAdjustmentForm((v) => ({ ...v, notes: e.target.value }))} disabled={!activePeriodId || readOnly} />
            <label className="text-sm text-slate-700 flex items-center gap-2"><input type="checkbox" checked={adjustmentForm.taxable} onChange={(e) => setAdjustmentForm((v) => ({ ...v, taxable: e.target.checked }))} disabled={!activePeriodId || readOnly} />Taxable</label>
          </div>
          <button className="cx-button-primary mt-3" onClick={addAdjustment} disabled={!activePeriodId || readOnly || actionLoading["add-adjustment"]}>{actionLoading["add-adjustment"] ? "Saving..." : "Add adjustment"}</button>
          <div className="mt-3 space-y-2">
            {adjustments.map((a) => (
              <div key={a.id} className="rounded-xl border border-border bg-slate-50 p-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                <p>{a.worker_name || a.worker_id} · {a.type} · {a.label} · {formatCurrency(a.amount || 0)} · {a.taxable ? "Taxable" : "Non-taxable"} · {String(a.created_at || "").slice(0, 10)}</p>
                <button className="cx-button-secondary" disabled={readOnly || actionLoading[`delete-adjustment-${a.id}`]} onClick={() => deleteAdjustment(a.id)}>Remove adjustment</button>
              </div>
            ))}
            {!adjustments.length ? <p className="text-sm text-slate-500">No adjustments added for this pay run.</p> : null}
          </div>
        </section>

        <section id="export-centre" className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Export centre</h2>
          <p className="text-sm text-slate-500">Use these exports for your accountant, bookkeeper, or payroll system.</p>
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
            <button className="cx-button-secondary justify-center" disabled={!activePeriodId} onClick={() => downloadCsv(`/payroll/periods/${activePeriodId}/export/payroll-summary.csv`, `churvox-payroll-summary-${payRunPart}.csv`, "Payroll summary CSV")}><Download size={14} className="mr-2" />Payroll summary CSV</button>
            <button className="cx-button-secondary justify-center" disabled={!activePeriodId} onClick={() => downloadCsv(`/payroll/periods/${activePeriodId}/export/timesheets.csv`, `churvox-timesheets-${payRunPart}.csv`, "Timesheet detail CSV")}><Download size={14} className="mr-2" />Timesheet detail CSV</button>
            <button className="cx-button-secondary justify-center" disabled={!activePeriodId} onClick={() => downloadCsv(`/payroll/periods/${activePeriodId}/export/worker-pay.csv`, `churvox-worker-pay-${payRunPart}.csv`, "Worker pay summary CSV")}><Download size={14} className="mr-2" />Worker pay summary CSV</button>
            <button className="cx-button-secondary justify-center" disabled={!activePeriodId} onClick={() => downloadCsv(`/payroll/periods/${activePeriodId}/export/adjustments.csv`, `churvox-adjustments-${payRunPart}.csv`, "Adjustments CSV")}><Download size={14} className="mr-2" />Adjustments CSV</button>
            <button className="cx-button-secondary justify-center" disabled={!activePeriodId} onClick={() => downloadCsv(`/payroll/periods/${activePeriodId}/export/payslip-draft.csv`, `churvox-payslip-draft-${payRunPart}.csv`, "Payslip draft CSV")}><Download size={14} className="mr-2" />Payslip draft CSV</button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="cx-button-secondary" disabled={!activePeriodId || readOnly || actionLoading["lock-run"]} onClick={lockRun}><Lock size={14} className="mr-2" />Lock pay run</button>
            <button className="cx-button-secondary" disabled={!activePeriodId || !readOnly || actionLoading["unlock-run"]} onClick={unlockRun}><Unlock size={14} className="mr-2" />Unlock pay run</button>
            <button className="cx-button-secondary" disabled={!activePeriodId || actionLoading["mark-exported"]} onClick={markExported}><CheckCircle2 size={14} className="mr-2" />Mark exported</button>
          </div>
        </section>

        {showCreateRun && (
          <div className="fixed inset-0 z-50 bg-black/30 p-3">
            <div className="mx-auto max-w-xl rounded-2xl border bg-white p-5 shadow-xl">
              <div className="flex items-center justify-between"><h3 className="text-lg font-semibold">Create pay run</h3><button className="cx-button-secondary" onClick={() => setShowCreateRun(false)}><X size={14} className="mr-1" />Close</button></div>
              <div className="mt-3 grid grid-cols-1 gap-3">
                <input className="cx-input" placeholder="Pay run name" value={newRun.name} onChange={(e) => setNewRun((s) => ({ ...s, name: e.target.value }))} />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <input className="cx-input" type="date" value={newRun.start_date} onChange={(e) => setNewRun((s) => ({ ...s, start_date: e.target.value }))} />
                  <input className="cx-input" type="date" value={newRun.end_date} onChange={(e) => setNewRun((s) => ({ ...s, end_date: e.target.value }))} />
                  <input className="cx-input" type="date" value={newRun.pay_date} onChange={(e) => setNewRun((s) => ({ ...s, pay_date: e.target.value }))} />
                </div>
                <select className="cx-input" value={newRun.pay_frequency} onChange={(e) => setNewRun((s) => ({ ...s, pay_frequency: e.target.value }))}>{FREQUENCY_OPTIONS.map((x) => <option key={x} value={x}>{x}</option>)}</select>
                <textarea className="cx-input" placeholder="Optional notes" value={newRun.notes} onChange={(e) => setNewRun((s) => ({ ...s, notes: e.target.value }))} rows={3} />
              </div>
              <button className="cx-button-primary mt-4" onClick={createPayRun} disabled={actionLoading["create-run"]}>{actionLoading["create-run"] ? "Creating..." : "Create pay run"}</button>
            </div>
          </div>
        )}

        {showSettings && (
          <div className="fixed inset-0 z-50 bg-black/30 p-3">
            <div className="mx-auto max-w-xl rounded-2xl border bg-white p-5 shadow-xl">
              <div className="flex items-center justify-between"><h3 className="text-lg font-semibold">Advanced payroll settings</h3><button className="cx-button-secondary" onClick={() => setShowSettings(false)}><X size={14} className="mr-1" />Close</button></div>
              <div className="mt-3 grid grid-cols-1 gap-3">
                <select className="cx-input" value={settings.payroll_method} onChange={(e) => setSettings((s) => ({ ...s, payroll_method: e.target.value }))}><option value="manual">manual</option><option value="export_only">export only</option></select>
                <select className="cx-input" value={settings.rate_mode} onChange={(e) => setSettings((s) => ({ ...s, rate_mode: e.target.value }))}><option value="manual_rate">manual rate</option><option value="worker_profile_rate">worker profile rate</option><option value="job_rate">job rate</option></select>
                <input className="cx-input" type="number" value={settings.default_rate} onChange={(e) => setSettings((s) => ({ ...s, default_rate: Number(e.target.value || 0) }))} placeholder="Default hourly rate" />
                <select className="cx-input" value={settings.default_pay_frequency || "fortnightly"} onChange={(e) => setSettings((s) => ({ ...s, default_pay_frequency: e.target.value }))}>{FREQUENCY_OPTIONS.map((x) => <option key={x} value={x}>{x}</option>)}</select>
                <input className="cx-input" disabled value="Overtime rule placeholder (disabled in V1)" />
                <p className="text-xs text-slate-500">Tax filing is handled outside Churvox in V1.</p>
              </div>
              <button className="cx-button-primary mt-4" onClick={saveSettings} disabled={actionLoading["save-settings"]}>{actionLoading["save-settings"] ? "Saving..." : "Save settings"}</button>
            </div>
          </div>
        )}

        {workerDetails && (
          <div className="fixed inset-0 z-50 bg-black/30 p-3">
            <div className="mx-auto h-full max-w-3xl overflow-y-auto rounded-2xl border bg-white p-5 shadow-xl">
              <div className="flex items-center justify-between"><h3 className="text-lg font-semibold">Worker payroll details</h3><button className="cx-button-secondary" onClick={() => setWorkerDetails(null)}><X size={14} className="mr-1" />Close</button></div>
              <div className="mt-3 rounded-xl border border-border bg-slate-50 p-3 text-sm">
                <p className="font-semibold">{workerDetails.worker?.name} · {workerDetails.worker?.role}</p>
                <p>Approved: {Number(workerDetails.approved_hours || 0)}h · Pending: {Number(workerDetails.pending_hours || 0)}h · Jobs worked: {Number(workerDetails.jobs_worked || 0)}</p>
              </div>
              <div className="mt-3 rounded-xl border border-border bg-slate-50 p-3 text-sm">
                <p className="font-semibold">Adjustments</p>
                {(workerDetails.adjustments || []).map((a) => <p key={a.id}>{a.label} · {a.type} · {formatCurrency(a.amount || 0)}</p>)}
                {!(workerDetails.adjustments || []).length ? <p className="text-slate-500">No adjustments.</p> : null}
              </div>
              <div className="mt-3 rounded-xl border border-border bg-slate-50 p-3 text-sm">
                <p className="font-semibold">Timesheet entries</p>
                {(workerDetails.timesheet_entries || []).map((t) => <p key={t.entry_id}>{t.date || "—"} · {t.job_title || "Job"} · {Number(t.net_hours || 0)}h · {t.status}</p>)}
                {!(workerDetails.timesheet_entries || []).length ? <p className="text-slate-500">No entries.</p> : null}
              </div>
              <div className="mt-3 rounded-xl border border-border bg-slate-50 p-3 text-sm">
                <p className="font-semibold">Export row preview</p>
                <p>{workerDetails.worker?.name || "Worker"},{Number(workerDetails.approved_hours || 0)},{Number(workerDetails.pending_hours || 0)},{Number(workerDetails.jobs_worked || 0)}</p>
              </div>
            </div>
          </div>
        )}

        {error && <div className="cx-error-state">{error}</div>}
        {(loading || initializing) && <div className="cx-loading-state">Loading payroll...</div>}
      </div>
    </Layout>
  );
}
