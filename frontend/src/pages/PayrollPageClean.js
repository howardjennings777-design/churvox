import React, { useCallback, useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { CheckCircle2, Download, Lock, Settings, Unlock, X } from "lucide-react";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";

const DISCLAIMER = "Churvox prepares payroll for review and handoff. Tax filing, government submission, and bank payments are handled outside Churvox.";
const FREQUENCIES = ["weekly", "fortnightly", "monthly", "custom"];
const safeArray = (value) => (Array.isArray(value) ? value : []);
const money = (value) => new Intl.NumberFormat(undefined, { style: "currency", currency: "NZD" }).format(Number(value || 0));
const filePart = (value) => String(value || "pay-run").trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-_]/g, "");

function badgeClass(status) {
  const s = String(status || "open").toLowerCase();
  if (s === "exported") return "cx-status-badge cx-status-badge--green";
  if (s === "locked" || s === "pending_review") return "cx-status-badge cx-status-badge--amber";
  if (["rejected", "needs_rate", "missing_tax_config"].includes(s)) return "cx-status-badge cx-status-badge--red";
  return "cx-status-badge cx-status-badge--blue";
}

function Modal({ title, subtitle, onClose, children, footer }) {
  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/45 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="h-[90vh] w-full overflow-hidden rounded-t-3xl border border-[#d8e3f3] bg-white shadow-2xl sm:h-auto sm:max-h-[86vh] sm:max-w-3xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3 border-b border-[#d8e3f3] bg-[#f7faff] px-4 py-4 sm:px-6">
          <div>
            <h2 className="text-xl font-bold text-[#0d1b34]">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm text-[#5b6c87]">{subtitle}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-[#5b6c87] hover:bg-white hover:text-[#0d1b34]" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <div className="max-h-[calc(90vh-150px)] overflow-y-auto px-4 py-4 sm:max-h-[65vh] sm:px-6">{children}</div>
        {footer ? <div className="flex flex-col-reverse gap-2 border-t border-[#d8e3f3] bg-white px-4 py-3 sm:flex-row sm:justify-end sm:px-6">{footer}</div> : null}
      </div>
    </div>
  );
}

export default function PayrollPageClean() {
  const { get, post, loading } = useApi();
  const [periods, setPeriods] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [activePeriodId, setActivePeriodId] = useState("");
  const [summary, setSummary] = useState(null);
  const [timesheets, setTimesheets] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [workerDetails, setWorkerDetails] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [busy, setBusy] = useState({});
  const [settings, setSettings] = useState({ payroll_method: "manual", rate_mode: "manual_rate", default_rate: 0, default_pay_frequency: "fortnightly", notes: DISCLAIMER });
  const [newRun, setNewRun] = useState({ name: "", start_date: "", end_date: "", pay_date: "", pay_frequency: "fortnightly", notes: "" });

  const activePeriod = useMemo(() => periods.find((p) => String(p.id) === String(activePeriodId)) || null, [periods, activePeriodId]);
  const workerSummaries = safeArray(summary?.worker_summaries);
  const pendingTimesheets = safeArray(timesheets).filter((t) => String(t.status || "").toLowerCase() === "pending");
  const selectedPending = pendingTimesheets.filter((t) => selectedIds.includes(t.entry_id));
  const readOnly = ["locked", "exported"].includes(String(activePeriod?.status || "").toLowerCase());
  const payRunPart = filePart(activePeriod?.name || activePeriodId);

  const withBusy = async (key, fn) => {
    setBusy((s) => ({ ...s, [key]: true }));
    try { return await fn(); } finally { setBusy((s) => ({ ...s, [key]: false })); }
  };

  const loadPeriodData = useCallback(async (periodId) => {
    if (!periodId) { setSummary(null); setTimesheets([]); setSelectedIds([]); return; }
    const [summaryRes, timesheetsRes] = await Promise.all([
      get(`/payroll/summary?period_id=${periodId}`),
      get(`/payroll/timesheets?period_id=${periodId}`),
    ]);
    setSummary(summaryRes?.success ? summaryRes.data : null);
    setTimesheets(timesheetsRes?.success ? safeArray(timesheetsRes.data?.timesheets) : []);
    setSelectedIds([]);
  }, [get]);

  const loadInitial = useCallback(async () => {
    const [periodRes, workerRes, settingsRes] = await Promise.all([get("/payroll/periods"), get("/payroll/workers"), get("/payroll/settings")]);
    const loadedPeriods = periodRes?.success ? safeArray(periodRes.data?.pay_periods) : [];
    setPeriods(loadedPeriods);
    setWorkers(workerRes?.success ? safeArray(workerRes.data?.workers) : []);
    if (settingsRes?.success) {
      setSettings({
        payroll_method: settingsRes.data?.payroll_method || "manual",
        rate_mode: settingsRes.data?.rate_mode || "manual_rate",
        default_rate: Number(settingsRes.data?.default_hourly_rate ?? settingsRes.data?.default_tax_rate ?? 0),
        default_pay_frequency: settingsRes.data?.default_pay_frequency || "fortnightly",
        notes: settingsRes.data?.notes || DISCLAIMER,
      });
    }
    const nextId = loadedPeriods[0]?.id || "";
    setActivePeriodId((current) => current || nextId);
    if (nextId) await loadPeriodData(nextId);
  }, [get, loadPeriodData]);

  useEffect(() => { loadInitial(); }, [loadInitial]);
  useEffect(() => { if (activePeriodId) loadPeriodData(activePeriodId); }, [activePeriodId, loadPeriodData]);

  const approveOne = async (entryId) => withBusy(`approve-${entryId}`, async () => {
    const res = await post(`/payroll/timesheets/${entryId}/approve`, {});
    if (!res?.success) return toast.error(res?.error || "Approval failed");
    toast.success("Timesheet approved");
    await loadPeriodData(activePeriodId);
  });

  const rejectOne = async (entryId) => withBusy(`reject-${entryId}`, async () => {
    const res = await post(`/payroll/timesheets/${entryId}/reject`, { notes: "Needs review" });
    if (!res?.success) return toast.error(res?.error || "Reject failed");
    toast.success("Timesheet moved to review");
    await loadPeriodData(activePeriodId);
  });

  const approveSelected = async () => {
    if (!selectedPending.length) return toast.error("Select at least one pending timesheet.");
    await withBusy("approve-selected", async () => {
      const res = await post("/payroll/timesheets/bulk-approve", { entry_ids: selectedPending.map((x) => x.entry_id) });
      if (!res?.success) return toast.error(res?.error || "Bulk approval failed");
      toast.success(`Approved ${res.data?.updated || selectedPending.length} entries`);
      await loadPeriodData(activePeriodId);
    });
  };

  const bulkApproveAll = async () => withBusy("bulk-approve-all", async () => {
    const res = await post(`/payroll/periods/${activePeriodId}/bulk-approve`, {});
    if (!res?.success) return toast.error(res?.error || "Bulk approval failed");
    toast.success(res.data?.message || "Pending entries approved");
    await loadPeriodData(activePeriodId);
  });

  const createPayRun = async () => {
    if (!newRun.name || !newRun.start_date || !newRun.end_date || !newRun.pay_date) return toast.error("Name, start date, end date, and pay date are required.");
    if (newRun.end_date <= newRun.start_date) return toast.error("End date must be after start date.");
    await withBusy("create-run", async () => {
      const res = await post("/payroll/periods", newRun);
      if (!res?.success) return toast.error(res?.error || "Failed to create pay run");
      setShowCreate(false);
      setNewRun({ name: "", start_date: "", end_date: "", pay_date: "", pay_frequency: settings.default_pay_frequency || "fortnightly", notes: "" });
      await loadInitial();
      toast.success("Pay run created");
    });
  };

  const saveSettings = async () => withBusy("save-settings", async () => {
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

  const downloadCsv = async (path, filename, label) => withBusy(`export-${label}`, async () => {
    if (!activePeriodId) return;
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

  const openWorkerDetails = async (workerId) => withBusy(`worker-${workerId}`, async () => {
    const res = await get(`/payroll/workers/${workerId}?period_id=${activePeriodId}`);
    if (!res?.success) return toast.error(res?.error || "Failed to load worker details");
    setWorkerDetails(res.data);
  });

  const lockRun = async () => withBusy("lock-run", async () => {
    const res = await post(`/payroll/periods/${activePeriodId}/lock`, {});
    if (!res?.success) return toast.error(res?.error || "Failed to lock run");
    toast.success("Pay run locked");
    await loadInitial();
  });

  const unlockRun = async () => withBusy("unlock-run", async () => {
    const res = await post(`/payroll/periods/${activePeriodId}/unlock`, {});
    if (!res?.success) return toast.error(res?.error || "Failed to unlock run");
    toast.success("Pay run unlocked");
    await loadInitial();
  });

  const markExported = async () => withBusy("mark-exported", async () => {
    const res = await post(`/payroll/periods/${activePeriodId}/mark-exported`, {});
    if (!res?.success) return toast.error(res?.error || "Failed to mark exported");
    toast.success("Run marked as exported");
    await loadInitial();
  });

  const stats = [
    ["Current pay run", activePeriod?.name || "None", activePeriod ? `${activePeriod.start_date} → ${activePeriod.end_date}` : "Create your first pay run"],
    ["Approved hours", Number(summary?.approved_hours || 0), "Hours approved for payment"],
    ["Pending review", Number(summary?.pending_review_count || pendingTimesheets.length), "Timesheets waiting approval"],
    ["Workers included", Number(summary?.workers_included || workerSummaries.length), "Workers in this run"],
  ];

  return (
    <Layout>
      <div className="cx-page space-y-6">
        <section className="cx-page-hero">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div><h1 className="cx-page-title">Payroll Command Centre</h1><p className="cx-page-subtitle">Review approved hours, worker summaries, exports, and payroll handoff without leaving the page.</p><p className="mt-3 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700">{DISCLAIMER}</p></div>
            <div className="flex flex-wrap gap-2"><button className="cx-button-primary" onClick={() => setShowCreate(true)}>Create pay run</button><button className="cx-button-secondary" onClick={() => setShowSettings(true)}><Settings size={14} />Payroll settings</button></div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{stats.map(([label, value, help]) => <div key={label} className="rounded-2xl border border-border bg-white p-4 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-600">{label}</p><p className="mt-2 text-xl font-bold capitalize text-slate-900">{value}</p><p className="text-xs text-slate-500">{help}</p></div>)}</section>

        <section className="rounded-2xl border border-border bg-white p-4 shadow-sm"><h2 className="text-lg font-semibold text-slate-900">Active pay run</h2>{!periods.length ? <div className="mt-3 rounded-xl border border-dashed border-border bg-slate-50 p-5 text-center"><p className="font-semibold text-slate-900">No pay run created yet.</p><p className="text-sm text-slate-500">Create a pay run to begin reviewing tracked worker hours.</p></div> : <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">{periods.map((p) => <button key={p.id} className={`rounded-xl border p-4 text-left ${activePeriodId === p.id ? "border-blue-500 bg-blue-50" : "border-border bg-slate-50"}`} onClick={() => setActivePeriodId(p.id)}><p className="font-semibold text-slate-900">{p.name}</p><p className="text-xs text-slate-500">{p.start_date} → {p.end_date} · Pay date {p.pay_date}</p><div className="mt-2"><span className={badgeClass(p.status)}>{p.status || "open"}</span></div></button>)}</div>}</section>

        <section className="rounded-2xl border border-border bg-white p-4 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold text-slate-900">Timesheet review queue</h2><div className="flex flex-wrap gap-2"><button className="cx-button-secondary" disabled={!activePeriodId || readOnly || !selectedPending.length || busy["approve-selected"]} onClick={approveSelected}>Approve selected</button><button className="cx-button-secondary" disabled={!activePeriodId || readOnly || !pendingTimesheets.length || busy["bulk-approve-all"]} onClick={bulkApproveAll}>Bulk approve</button></div></div>{!timesheets.length ? <div className="mt-3 rounded-xl border border-dashed border-border bg-slate-50 p-5 text-center"><p className="font-semibold text-slate-900">No timesheets awaiting review.</p><p className="text-sm text-slate-500">Tracked worker time appears here once jobs are started and completed.</p></div> : <div className="mt-3 space-y-2">{timesheets.map((t) => <div key={t.entry_id} className="rounded-xl border border-border bg-slate-50 p-3"><div className="grid grid-cols-1 gap-2 text-sm lg:grid-cols-10"><label className="lg:col-span-1"><input type="checkbox" disabled={readOnly || t.status !== "pending"} checked={selectedIds.includes(t.entry_id)} onChange={(e) => setSelectedIds((prev) => e.target.checked ? [...prev, t.entry_id] : prev.filter((id) => id !== t.entry_id))} /></label><p className="lg:col-span-2"><b>Worker:</b> {t.worker_name || "Worker"}</p><p className="lg:col-span-2"><b>Job:</b> {t.job_title || "Job"}</p><p><b>Date:</b> {t.date || "—"}</p><p><b>Start:</b> {t.started_at ? String(t.started_at).slice(11, 16) : "—"}</p><p><b>End:</b> {t.ended_at ? String(t.ended_at).slice(11, 16) : "—"}</p><p><b>Break:</b> {Number(t.paused_minutes || 0)}m</p><p><b>Net:</b> {Number(t.net_hours || 0)}h</p></div><div className="mt-2 flex flex-wrap items-center gap-2"><span className={badgeClass(t.status)}>{t.status || "pending"}</span><button className="cx-button-secondary" disabled={readOnly || t.status !== "pending" || busy[`approve-${t.entry_id}`]} onClick={() => approveOne(t.entry_id)}>Approve</button><button className="cx-button-secondary" disabled={readOnly || t.status !== "pending" || busy[`reject-${t.entry_id}`]} onClick={() => rejectOne(t.entry_id)}>Reject</button><button className="cx-button-secondary" disabled={!t.job_id} onClick={() => setSelectedJob(t)}>Open related job</button></div></div>)}</div>}</section>

        <section className="rounded-2xl border border-border bg-white p-4 shadow-sm"><h2 className="text-lg font-semibold text-slate-900">Worker pay summaries</h2><div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">{workerSummaries.map((w) => <div key={w.worker_id} className="rounded-xl border border-border bg-slate-50 p-4"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><p className="font-semibold text-slate-900">{w.name || w.worker_name || "Worker"}</p></div><span className={badgeClass(w.status)}>{w.status || "ready"}</span></div><div className="mt-2 grid grid-cols-2 gap-1 text-sm"><p>Approved: {Number(w.approved_hours || 0)}h</p><p>Pending: {Number(w.pending_hours || 0)}h</p><p>Jobs: {Number(w.jobs_worked || 0)}</p><p>Gross: {money(w.gross_pay || 0)}</p></div><button className="cx-button-secondary mt-3" onClick={() => openWorkerDetails(w.worker_id)}>View details</button></div>)}</div>{!!activePeriodId && !workerSummaries.length ? <p className="mt-3 text-sm text-slate-500">No workers or timesheets found for this pay run yet.</p> : null}</section>

        <section id="export-centre" className="rounded-2xl border border-border bg-white p-4 shadow-sm"><h2 className="text-lg font-semibold text-slate-900">Export centre</h2><p className="text-sm text-slate-500">Use these exports for your accountant, bookkeeper, or payroll system.</p><div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2"><button className="cx-button-secondary justify-center" disabled={!activePeriodId} onClick={() => downloadCsv(`/payroll/periods/${activePeriodId}/export/payroll-summary.csv`, `churvox-payroll-summary-${payRunPart}.csv`, "Payroll summary CSV")}><Download size={14} />Payroll summary CSV</button><button className="cx-button-secondary justify-center" disabled={!activePeriodId} onClick={() => downloadCsv(`/payroll/periods/${activePeriodId}/export/timesheets.csv`, `churvox-timesheets-${payRunPart}.csv`, "Timesheet detail CSV")}><Download size={14} />Timesheet detail CSV</button><button className="cx-button-secondary justify-center" disabled={!activePeriodId} onClick={() => downloadCsv(`/payroll/periods/${activePeriodId}/export/worker-pay.csv`, `churvox-worker-pay-${payRunPart}.csv`, "Worker pay summary CSV")}><Download size={14} />Worker pay summary CSV</button></div><div className="mt-3 flex flex-wrap gap-2"><button className="cx-button-secondary" disabled={!activePeriodId || readOnly || busy["lock-run"]} onClick={lockRun}><Lock size={14} />Lock pay run</button><button className="cx-button-secondary" disabled={!activePeriodId || !readOnly || busy["unlock-run"]} onClick={unlockRun}><Unlock size={14} />Unlock pay run</button><button className="cx-button-secondary" disabled={!activePeriodId || busy["mark-exported"]} onClick={markExported}><CheckCircle2 size={14} />Mark exported</button></div></section>

        {selectedJob && <Modal title={selectedJob.job_title || "Related job"} subtitle={`Worker: ${selectedJob.worker_name || "Worker"}`} onClose={() => setSelectedJob(null)} footer={<><button className="cx-button-secondary" onClick={() => setSelectedJob(null)}>Close</button><a className="cx-button-secondary" href={`/jobs/${selectedJob.job_id}`}>Open full job page</a></>}><div className="rounded-2xl border border-[#d8e3f3] bg-white p-4 text-sm text-[#1a2c4d]"><p><b>Date:</b> {selectedJob.date || "—"}</p><p><b>Start:</b> {selectedJob.started_at ? String(selectedJob.started_at).slice(11, 16) : "—"}</p><p><b>End:</b> {selectedJob.ended_at ? String(selectedJob.ended_at).slice(11, 16) : "—"}</p><p><b>Net hours:</b> {Number(selectedJob.net_hours || 0)}h</p></div></Modal>}

        {workerDetails && <Modal title={workerDetails.name || workerDetails.worker_name || "Worker details"} subtitle="Payroll worker summary" onClose={() => setWorkerDetails(null)} footer={<button className="cx-button-secondary" onClick={() => setWorkerDetails(null)}>Close</button>}><div className="rounded-2xl border border-[#d8e3f3] bg-[#f7faff] p-4 text-sm text-[#1a2c4d]"><p><b>Approved hours:</b> {Number(workerDetails.approved_hours || 0)}</p><p><b>Pending hours:</b> {Number(workerDetails.pending_hours || 0)}</p><p><b>Gross:</b> {money(workerDetails.gross_pay || 0)}</p></div></Modal>}

        {showCreate && <Modal title="Create pay run" subtitle="Start a new payroll review period." onClose={() => setShowCreate(false)} footer={<><button className="cx-button-secondary" onClick={() => setShowCreate(false)}>Cancel</button><button className="cx-button-primary" disabled={busy["create-run"] || loading} onClick={createPayRun}>Create pay run</button></>}><div className="grid grid-cols-1 gap-3"><input className="cx-input" placeholder="Pay run name" value={newRun.name} onChange={(e) => setNewRun((v) => ({ ...v, name: e.target.value }))} /><input className="cx-input" type="date" value={newRun.start_date} onChange={(e) => setNewRun((v) => ({ ...v, start_date: e.target.value }))} /><input className="cx-input" type="date" value={newRun.end_date} onChange={(e) => setNewRun((v) => ({ ...v, end_date: e.target.value }))} /><input className="cx-input" type="date" value={newRun.pay_date} onChange={(e) => setNewRun((v) => ({ ...v, pay_date: e.target.value }))} /><select className="cx-input" value={newRun.pay_frequency} onChange={(e) => setNewRun((v) => ({ ...v, pay_frequency: e.target.value }))}>{FREQUENCIES.map((x) => <option key={x} value={x}>{x}</option>)}</select><textarea className="cx-input min-h-[90px]" placeholder="Notes" value={newRun.notes} onChange={(e) => setNewRun((v) => ({ ...v, notes: e.target.value }))} /></div></Modal>}

        {showSettings && <Modal title="Payroll settings" subtitle="Keep payroll scoped to review, approval and export." onClose={() => setShowSettings(false)} footer={<><button className="cx-button-secondary" onClick={() => setShowSettings(false)}>Cancel</button><button className="cx-button-primary" disabled={busy["save-settings"] || loading} onClick={saveSettings}>Save settings</button></>}><div className="grid grid-cols-1 gap-3"><select className="cx-input" value={settings.payroll_method} onChange={(e) => setSettings((v) => ({ ...v, payroll_method: e.target.value }))}><option value="manual">Manual export / accountant handoff</option><option value="external">External payroll system</option></select><select className="cx-input" value={settings.rate_mode} onChange={(e) => setSettings((v) => ({ ...v, rate_mode: e.target.value }))}><option value="manual_rate">Manual worker rates</option><option value="default_rate">Default hourly rate</option></select><input className="cx-input" type="number" value={settings.default_rate} onChange={(e) => setSettings((v) => ({ ...v, default_rate: e.target.value }))} placeholder="Default hourly rate" /><select className="cx-input" value={settings.default_pay_frequency} onChange={(e) => setSettings((v) => ({ ...v, default_pay_frequency: e.target.value }))}>{FREQUENCIES.map((x) => <option key={x} value={x}>{x}</option>)}</select><textarea className="cx-input min-h-[100px]" value={settings.notes || ""} onChange={(e) => setSettings((v) => ({ ...v, notes: e.target.value }))} /></div></Modal>}
      </div>
    </Layout>
  );
}
