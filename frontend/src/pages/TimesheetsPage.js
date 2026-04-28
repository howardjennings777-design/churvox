import React, { useCallback, useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { CalendarRange, CheckCircle2, Clock3, Download, FileClock, Lock, ShieldCheck, Unlock, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";
import { formatCurrency } from "../lib/utils";

function statusBadge(status) {
  const value = String(status || "open").toLowerCase();
  if (value === "exported") return "cx-status-badge cx-status-badge--green";
  if (value === "locked" || value === "pending_review") return "cx-status-badge cx-status-badge--amber";
  if (value === "rejected" || value === "needs_rate") return "cx-status-badge cx-status-badge--red";
  return "cx-status-badge cx-status-badge--blue";
}

function safeFilePart(value) {
  return String(value || "timesheets").trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-_]/g, "");
}

export default function TimesheetsPage() {
  const { get, post } = useApi();
  const [periods, setPeriods] = useState([]);
  const [activePeriodId, setActivePeriodId] = useState("");
  const [summary, setSummary] = useState(null);
  const [timesheets, setTimesheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});

  const withAction = async (key, fn) => {
    setActionLoading((state) => ({ ...state, [key]: true }));
    try {
      return await fn();
    } finally {
      setActionLoading((state) => ({ ...state, [key]: false }));
    }
  };

  const loadPeriodData = useCallback(async (periodId) => {
    if (!periodId) {
      setSummary(null);
      setTimesheets([]);
      return;
    }

    const [summaryRes, timesheetsRes] = await Promise.all([
      get(`/payroll/summary?period_id=${periodId}`),
      get(`/payroll/timesheets?period_id=${periodId}`),
    ]);

    setSummary(summaryRes?.success ? summaryRes.data : null);
    setTimesheets(timesheetsRes?.success ? timesheetsRes.data?.timesheets || [] : []);
  }, [get]);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    const periodRes = await get("/payroll/periods");
    const loadedPeriods = periodRes?.success ? periodRes.data?.pay_periods || [] : [];
    setPeriods(loadedPeriods);

    const nextId = loadedPeriods[0]?.id || "";
    setActivePeriodId((current) => current || nextId);
    if (nextId) await loadPeriodData(nextId);
    setLoading(false);
  }, [get, loadPeriodData]);

  useEffect(() => { loadInitial(); }, [loadInitial]);
  useEffect(() => { if (activePeriodId) loadPeriodData(activePeriodId); }, [activePeriodId, loadPeriodData]);

  const activePeriod = useMemo(() => periods.find((period) => period.id === activePeriodId) || null, [periods, activePeriodId]);
  const workerSummaries = summary?.worker_summaries || [];
  const pendingTimesheets = timesheets.filter((entry) => String(entry.status || "").toLowerCase() === "pending");
  const readOnly = ["locked", "exported"].includes(String(activePeriod?.status || "").toLowerCase());
  const exportPart = safeFilePart(activePeriod?.name || activePeriodId);

  const stats = [
    { label: "Active period", value: activePeriod?.name || "None", help: activePeriod ? `${activePeriod.start_date} → ${activePeriod.end_date}` : "Create/select a period", icon: CalendarRange },
    { label: "Approved hours", value: Number(summary?.approved_hours || 0).toFixed(2), help: "Ready to export", icon: Clock3 },
    { label: "Needs review", value: Number(summary?.pending_review_count || pendingTimesheets.length), help: "Approve before export", icon: FileClock },
    { label: "Workers included", value: Number(summary?.workers_included || workerSummaries.length), help: "In this period", icon: UsersRound },
  ];

  const downloadCsv = async (path, filename, label) => {
    if (!activePeriodId) return toast.error("Select a timesheet period first");
    await withAction(label, async () => {
      const res = await get(path, { responseType: "blob" });
      if (!res?.success) return toast.error(res?.error || `Could not export ${label}`);
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

  const approveTimesheet = async (entryId) => withAction(`approve-${entryId}`, async () => {
    const res = await post(`/payroll/timesheets/${entryId}/approve`, {});
    if (!res?.success) return toast.error(res?.error || "Approval failed");
    toast.success("Timesheet approved");
    await loadPeriodData(activePeriodId);
  });

  const approveAllPending = async () => withAction("approve-all", async () => {
    const res = await post(`/payroll/periods/${activePeriodId}/bulk-approve`, {});
    if (!res?.success) return toast.error(res?.error || "Approval failed");
    toast.success("Pending timesheets approved");
    await loadPeriodData(activePeriodId);
  });

  const lockPeriod = async () => withAction("lock-period", async () => {
    const res = await post(`/payroll/periods/${activePeriodId}/lock`, {});
    if (!res?.success) return toast.error(res?.error || "Could not lock period");
    toast.success("Timesheet period locked");
    await loadInitial();
  });

  const unlockPeriod = async () => withAction("unlock-period", async () => {
    const res = await post(`/payroll/periods/${activePeriodId}/unlock`, {});
    if (!res?.success) return toast.error(res?.error || "Could not unlock period");
    toast.success("Timesheet period unlocked");
    await loadInitial();
  });

  const markExported = async () => withAction("mark-exported", async () => {
    const res = await post(`/payroll/periods/${activePeriodId}/mark-exported`, {});
    if (!res?.success) return toast.error(res?.error || "Could not mark exported");
    toast.success("Timesheets marked exported");
    await loadInitial();
  });

  return (
    <Layout>
      <div className="cx-page space-y-6">
        <section className="rounded-3xl border border-border bg-gradient-to-br from-white via-[#f6f9ff] to-[#eef6ff] p-6 shadow-[0_10px_30px_rgba(16,24,40,0.08)]">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Timesheet control centre</p>
          <h1 className="cx-page-title mt-2">Timesheets & Pay Export</h1>
          <p className="cx-page-subtitle max-w-4xl">
            Track job hours, approve worker time, lock clean periods, and export payroll-ready files for MYOB, Xero Payroll, PayHero, iPayroll, PaySauce, Smartly, your accountant, or your bookkeeper.
          </p>
          <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800">
            Churvox handles timesheets and exports only. Final PAYE, KiwiSaver, leave, payslips, IRD filing, and payments stay with your external payroll provider or accountant.
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="rounded-2xl border border-border bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-700"><Icon size={16} /></span>
                </div>
                <p className="mt-2 text-2xl font-black text-slate-950">{card.value}</p>
                <p className="text-xs text-slate-500">{card.help}</p>
              </div>
            );
          })}
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.4fr]">
          <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-950">Timesheet periods</h2>
              <span className={statusBadge(activePeriod?.status)}>{activePeriod?.status || "open"}</span>
            </div>

            <div className="mt-3 space-y-2">
              {loading ? <p className="text-sm text-slate-500">Loading periods...</p> : null}
              {!loading && !periods.length ? (
                <div className="rounded-xl border border-dashed border-border bg-slate-50 p-4 text-sm text-slate-500">
                  No timesheet periods found yet. Once a period exists, approved worker hours will appear here for review and export.
                </div>
              ) : null}
              {periods.map((period) => (
                <button key={period.id} type="button" onClick={() => setActivePeriodId(period.id)} className={`w-full rounded-xl border p-3 text-left ${activePeriodId === period.id ? "border-blue-500 bg-blue-50" : "border-border bg-slate-50"}`}>
                  <p className="font-bold text-slate-950">{period.name}</p>
                  <p className="text-xs text-slate-500">{period.start_date} → {period.end_date} · Export date {period.pay_date}</p>
                </button>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {readOnly ? (
                <button className="cx-button-secondary" disabled={!activePeriodId || actionLoading["unlock-period"]} onClick={unlockPeriod}><Unlock size={14} className="mr-2" />Unlock</button>
              ) : (
                <button className="cx-button-secondary" disabled={!activePeriodId || actionLoading["lock-period"]} onClick={lockPeriod}><Lock size={14} className="mr-2" />Lock period</button>
              )}
              <button className="cx-button-secondary" disabled={!activePeriodId || actionLoading["mark-exported"]} onClick={markExported}><ShieldCheck size={14} className="mr-2" />Mark exported</button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Approval queue</h2>
                <p className="text-sm text-slate-500">Review worker time before exporting to your external payroll system.</p>
              </div>
              <button className="cx-button-secondary" disabled={!activePeriodId || readOnly || !pendingTimesheets.length || actionLoading["approve-all"]} onClick={approveAllPending}>Approve all pending</button>
            </div>

            <div className="mt-3 space-y-2">
              {!timesheets.length ? (
                <div className="rounded-xl border border-dashed border-border bg-slate-50 p-4 text-sm text-slate-500">No timesheets found for this period.</div>
              ) : null}
              {timesheets.map((entry) => (
                <div key={entry.entry_id} className="rounded-xl border border-border bg-slate-50 p-3">
                  <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-5">
                    <p><b>Worker:</b> {entry.worker_name || "Worker"}</p>
                    <p><b>Job:</b> {entry.job_title || "Job"}</p>
                    <p><b>Date:</b> {entry.date || "—"}</p>
                    <p><b>Net:</b> {Number(entry.net_hours || 0).toFixed(2)}h</p>
                    <p><span className={statusBadge(entry.status)}>{entry.status || "pending"}</span></p>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button className="cx-button-secondary" disabled={readOnly || entry.status !== "pending" || actionLoading[`approve-${entry.entry_id}`]} onClick={() => approveTimesheet(entry.entry_id)}>
                      <CheckCircle2 size={14} className="mr-2" />Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">Export centre</h2>
          <p className="text-sm text-slate-500">Download clean files for your payroll provider, accountant, or bookkeeper.</p>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <button className="cx-button-secondary justify-center" disabled={!activePeriodId} onClick={() => downloadCsv(`/payroll/periods/${activePeriodId}/export/payroll-summary.csv`, `churvox-timesheet-summary-${exportPart}.csv`, "Timesheet summary")}><Download size={14} className="mr-2" />Summary CSV</button>
            <button className="cx-button-secondary justify-center" disabled={!activePeriodId} onClick={() => downloadCsv(`/payroll/periods/${activePeriodId}/export/timesheets.csv`, `churvox-timesheets-${exportPart}.csv`, "Timesheet detail")}><Download size={14} className="mr-2" />Detailed timesheets CSV</button>
            <button className="cx-button-secondary justify-center" disabled={!activePeriodId} onClick={() => downloadCsv(`/payroll/periods/${activePeriodId}/export/worker-pay.csv`, `churvox-worker-hours-${exportPart}.csv`, "Worker hours summary")}><Download size={14} className="mr-2" />Worker hours CSV</button>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">Worker hour summaries</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            {workerSummaries.map((worker) => (
              <div key={worker.worker_id || worker.name} className="rounded-xl border border-border bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-bold text-slate-950">{worker.name || worker.worker_name || "Worker"}</p>
                  <span className={statusBadge(worker.status)}>{worker.status || "ready"}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-600">
                  <p>Approved: <b>{Number(worker.approved_hours || 0).toFixed(2)}h</b></p>
                  <p>Pending: <b>{Number(worker.pending_hours || 0).toFixed(2)}h</b></p>
                  <p>Jobs: <b>{Number(worker.jobs_worked || 0)}</b></p>
                  <p>Labour est: <b>{formatCurrency(worker.gross_pay || 0)}</b></p>
                </div>
              </div>
            ))}
            {!workerSummaries.length ? <p className="text-sm text-slate-500">No worker summaries found yet.</p> : null}
          </div>
        </section>
      </div>
    </Layout>
  );
}
