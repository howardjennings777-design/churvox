import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Layout from "@/components/Layout";
import {
  Download,
  Lock,
  CheckCircle2,
  Plus,
  Settings,
  X,
  CalendarRange,
  Clock3,
  ClipboardCheck,
  UsersRound,
  CircleDollarSign,
  Sparkles,
  FileClock,
  UserCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";
import { formatCurrency } from "../lib/utils";

const DISCLAIMER = "Payroll calculations are prepared for review. Government filing and bank payments are handled outside Churvox.";

function badge(status) {
  const s = String(status || "open").toLowerCase();
  if (s === "exported") return "cx-status-badge cx-status-badge--green";
  if (s === "locked") return "cx-status-badge cx-status-badge--amber";
  if (s === "review") return "cx-status-badge cx-status-badge--blue";
  return "cx-status-badge cx-status-badge--blue";
}

function safeFilePart(value) {
  return String(value || "period").trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-_]/g, "");
}

export default function PayrollPage() {
  const { get, post, patch, del, loading, error } = useApi();
  const [periods, setPeriods] = useState([]);
  const [activePeriodId, setActivePeriodId] = useState("");
  const [summary, setSummary] = useState(null);
  const [timesheets, setTimesheets] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [settingsForm, setSettingsForm] = useState({ payroll_method: "", rate_mode: "manual_rate", default_rate: 0 });
  const [workerDetails, setWorkerDetails] = useState(null);
  const [periodFilter, setPeriodFilter] = useState("");
  const [initializing, setInitializing] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [newPeriod, setNewPeriod] = useState({ name: "", start_date: "", end_date: "", pay_date: "" });
  const [createPeriodError, setCreatePeriodError] = useState("");
  const [adjustmentForm, setAdjustmentForm] = useState({ worker_id: "", type: "allowance", label: "", amount: "", taxable: false, notes: "" });
  const createPeriodPanelRef = useRef(null);
  const periodNameInputRef = useRef(null);

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
  }, [get]);

  const loadInitial = useCallback(async () => {
    setInitializing(true);
    const [periodRes, workerRes, settingsRes] = await Promise.all([
      get("/payroll/periods"),
      get("/payroll/workers"),
      get("/payroll/settings"),
    ]);

    const loadedPeriods = periodRes?.success ? (periodRes.data?.pay_periods || []) : [];
    setPeriods(loadedPeriods);
    setWorkers(workerRes?.success ? (workerRes.data?.workers || []) : []);

    const loadedSettings = settingsRes?.success ? settingsRes.data : {};
    setSettingsForm({
      payroll_method: loadedSettings?.country || "",
      rate_mode: loadedSettings?.tax_mode || "manual_rate",
      default_rate: Number(loadedSettings?.default_tax_rate || 0),
    });

    const nextPeriodId = loadedPeriods[0]?.id || "";
    setActivePeriodId((current) => current || nextPeriodId);
    if (nextPeriodId) {
      await loadPeriodData(nextPeriodId);
    } else {
      setSummary(null);
      setTimesheets([]);
      setAdjustments([]);
    }
    setInitializing(false);
  }, [get, loadPeriodData]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    if (activePeriodId) {
      loadPeriodData(activePeriodId);
    }
  }, [activePeriodId, loadPeriodData]);

  const activePeriod = useMemo(() => periods.find((p) => p.id === activePeriodId) || null, [periods, activePeriodId]);
  const filteredPeriods = useMemo(() => {
    const q = String(periodFilter || "").toLowerCase().trim();
    if (!q) return periods;
    return periods.filter((p) => `${p.name || ""} ${p.start_date || ""} ${p.end_date || ""}`.toLowerCase().includes(q));
  }, [periods, periodFilter]);

  const workerSummaries = summary?.worker_summaries || [];
  const pendingTimesheets = timesheets.filter((t) => String(t.status || "").toLowerCase() === "pending");
  const readOnly = ["locked", "exported"].includes(String(activePeriod?.status || "").toLowerCase());
  const adjustmentsTotal = Number(summary?.adjustments_total || adjustments.reduce((sum, item) => sum + Number(item?.amount || 0), 0));
  const statusClass = String(activePeriod?.status || "open").toLowerCase() === "exported"
    ? "text-[#067647] bg-[#ECFDF3] border-[#ABEFC6]"
    : "text-[#B54708] bg-[#FFFAEB] border-[#FEC84B]";

  const statCards = [
    {
      label: "Current pay period",
      value: activePeriod?.name || "No active period",
      icon: CalendarRange,
      tint: "bg-[#EEF4FF] border-[#C7D7FE]",
      chip: "bg-[#DCE8FF] text-[#1849A9]",
    },
    {
      label: "Approved hours",
      value: Number(summary?.approved_hours || 0),
      icon: Clock3,
      tint: "bg-[#ECFDF3] border-[#ABEFC6]",
      chip: "bg-[#D1FADF] text-[#067647]",
    },
    {
      label: "Pending review",
      value: Number(summary?.pending_review_count || pendingTimesheets.length),
      icon: FileClock,
      tint: "bg-[#FFFAEB] border-[#FEC84B]",
      chip: "bg-[#FEF0C7] text-[#B54708]",
    },
    {
      label: "Workers included",
      value: Number(summary?.workers_included || workerSummaries.length || 0),
      icon: UsersRound,
      tint: "bg-[#F5F8FF] border-[#D0DDF7]",
      chip: "bg-[#E4EAF7] text-[#364152]",
    },
    {
      label: "Export status",
      value: summary?.export_status || activePeriod?.export_status || "not_exported",
      icon: ClipboardCheck,
      tint: "bg-white border-[#D0D5DD]",
      chip: `border ${statusClass}`,
    },
    {
      label: "Adjustments total",
      value: formatCurrency(adjustmentsTotal),
      icon: CircleDollarSign,
      tint: "bg-[#F8FAFC] border-[#D5DFF2]",
      chip: "bg-[#EAF0FF] text-[#344054]",
    },
  ];

  const downloadCsv = async (path, typeLabel) => {
    if (!activePeriodId) {
      toast.error("Select a pay period before exporting.");
      return;
    }
    await withAction(`export-${typeLabel}`, async () => {
      const res = await get(path, { responseType: "blob" });
      if (!res?.success) {
        toast.error(`Failed to export ${typeLabel} CSV`);
        return;
      }
      const blob = new Blob([res.data], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const filePart = safeFilePart(activePeriod?.name || activePeriodId);
      a.href = url;
      a.download = `churvox-${typeLabel}-${filePart}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${typeLabel} CSV downloaded`);
    });
  };

  const createPeriod = async () => {
    if (!newPeriod.name || !newPeriod.start_date || !newPeriod.end_date || !newPeriod.pay_date) {
      setCreatePeriodError("Please enter a period name, start date, end date, and pay date.");
      return;
    }
    setCreatePeriodError("");
    if (newPeriod.start_date > newPeriod.end_date) {
      toast.error("Start date must be on or before end date");
      return;
    }
    await withAction("create-period", async () => {
      const res = await post("/payroll/periods", newPeriod);
      if (!res?.success) {
        toast.error(res?.error || "Failed to create pay period");
        return;
      }
      const createdId = res.data?.id;
      setNewPeriod({ name: "", start_date: "", end_date: "", pay_date: "" });
      await loadInitial();
      if (createdId) {
        setActivePeriodId(createdId);
        await loadPeriodData(createdId);
      }
      toast.success("Pay period created.");
    });
  };

  const focusCreatePeriodForm = () => {
    createPeriodPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    periodNameInputRef.current?.focus();
  };

  const approveEntry = async (entryId) => {
    await withAction(`approve-${entryId}`, async () => {
      const res = await post(`/payroll/timesheets/${entryId}/approve`, {});
      if (res?.success) {
        toast.success("Timesheet approved");
        await loadPeriodData(activePeriodId);
      } else {
        toast.error(res?.error || "Failed to approve timesheet");
      }
    });
  };

  const rejectEntry = async (entryId) => {
    await withAction(`reject-${entryId}`, async () => {
      const res = await post(`/payroll/timesheets/${entryId}/reject`, { notes: "Rejected in payroll review" });
      if (res?.success) {
        toast.success("Timesheet rejected");
        await loadPeriodData(activePeriodId);
      } else {
        toast.error(res?.error || "Failed to reject timesheet");
      }
    });
  };

  const bulkApprove = async () => {
    if (!activePeriodId) return;
    await withAction("bulk-approve", async () => {
      const res = await post(`/payroll/periods/${activePeriodId}/bulk-approve`, {});
      if (res?.success) {
        toast.success(res?.data?.message || "Pending timesheets approved");
        await loadPeriodData(activePeriodId);
      } else {
        toast.error(res?.error || "Bulk approve failed");
      }
    });
  };

  const lockPeriod = async () => {
    if (!activePeriodId) return;
    await withAction("lock-period", async () => {
      const res = await post(`/payroll/periods/${activePeriodId}/lock`, {});
      if (res?.success) {
        toast.success("Pay period locked");
        await loadInitial();
      } else {
        toast.error(res?.error || "Failed to lock period");
      }
    });
  };

  const markExported = async () => {
    if (!activePeriodId) return;
    await withAction("mark-exported", async () => {
      const res = await post(`/payroll/periods/${activePeriodId}/mark-exported`, {});
      if (res?.success) {
        toast.success("Period marked as exported");
        await loadInitial();
      } else {
        toast.error(res?.error || "Failed to mark period exported");
      }
    });
  };

  const createAdjustment = async () => {
    if (!activePeriodId) {
      toast.error("Select a pay period first");
      return;
    }
    if (!adjustmentForm.worker_id || !adjustmentForm.label || adjustmentForm.amount === "") {
      toast.error("Worker, label, and amount are required");
      return;
    }
    await withAction("create-adjustment", async () => {
      const res = await post("/payroll/adjustments", {
        ...adjustmentForm,
        period_id: activePeriodId,
        amount: Number(adjustmentForm.amount || 0),
      });
      if (res?.success) {
        setAdjustmentForm({ worker_id: "", type: "allowance", label: "", amount: "", taxable: false, notes: "" });
        toast.success("Adjustment added");
        await loadPeriodData(activePeriodId);
      } else {
        toast.error(res?.error || "Failed to add adjustment");
      }
    });
  };

  const openWorkerDetails = async (workerId) => {
    if (!activePeriodId) return;
    await withAction(`worker-${workerId}`, async () => {
      const res = await get(`/payroll/workers/${workerId}?period_id=${activePeriodId}`);
      if (res?.success) {
        setWorkerDetails(res.data);
      } else {
        toast.error(res?.error || "Failed to load worker details");
      }
    });
  };

  const saveSettings = async () => {
    await withAction("save-settings", async () => {
      const res = await post("/payroll/settings", {
        payroll_method: settingsForm.payroll_method,
        rate_mode: settingsForm.rate_mode,
        default_rate: Number(settingsForm.default_rate || 0),
      });
      if (res?.success) {
        toast.success("Payroll settings saved");
      } else {
        toast.error(res?.error || "Failed to save settings");
      }
    });
  };

  const workerOptions = workerSummaries.length
    ? workerSummaries.map((w) => ({ id: w.worker_id, name: w.name || w.worker_name || "Worker" }))
    : workers.map((w) => ({ id: w.id, name: w.name || "Worker" }));

  return (
    <Layout>
      <div className="cx-page space-y-6" style={{ background: "#f8f4ed" }}>
        <div className="cx-page-hero flex flex-col gap-5 rounded-3xl border border-[#E7DDCF] bg-gradient-to-br from-[#FFFDF8] via-[#FFF8EE] to-[#F7EFE3] p-6 shadow-[0_10px_30px_rgba(16,24,40,0.08)] lg:flex-row lg:items-start lg:justify-between lg:p-7">
          <div>
            <h1 className="cx-page-title">Payroll</h1>
            <p className="cx-page-subtitle">Review timesheets, calculate payroll, prepare payslips, and export clean summaries.</p>
            <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#B2CCFF] bg-[#EFF4FF] px-4 py-2 text-sm text-[#155EEF]">
              <Sparkles size={14} />
              {DISCLAIMER}
            </p>
          </div>
          <div className="w-full lg:w-auto lg:pt-1">
            <button className="cx-button-primary w-full lg:w-auto" onClick={focusCreatePeriodForm}>
              <Plus size={14} className="mr-2" />Create Pay Period
            </button>
          </div>
        </div>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className={`rounded-2xl border p-4 shadow-[0_8px_18px_rgba(16,24,40,0.06)] ${card.tint}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#475467]">{card.label}</p>
                  <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${card.chip}`}>
                    <Icon size={15} />
                  </span>
                </div>
                <p className="mt-3 text-2xl font-bold capitalize tracking-tight text-[#0F172A]">{card.value}</p>
              </div>
            );
          })}
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="cx-panel rounded-2xl border border-[#D6DDEB] bg-white p-5 shadow-[0_8px_22px_rgba(16,24,40,0.06)] xl:col-span-2">
            <h2 className="text-lg font-semibold text-[#0F172A]">Select pay period</h2>
            <p className="mt-1 text-sm text-[#667085]">Choose an existing period, then set up dates for a new period when needed.</p>
            {!activePeriodId && (
              <div className="mt-4 rounded-xl border border-dashed border-[#D0D5DD] bg-[#F8FAFC] p-4">
                <p className="text-base font-semibold text-[#0F172A]">No active pay period</p>
                <p className="mt-1 text-sm text-[#667085]">Create a pay period to start reviewing timesheets, worker hours, adjustments, and exports.</p>
              </div>
            )}
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="space-y-3 rounded-xl border border-[#E4E7EC] bg-[#FCFCFD] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#475467]">Find and select</p>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#475467]">Search pay periods</label>
                <input className="cx-input" placeholder="Filter by period name or date range" value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)} />
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#475467]">Pay period</label>
                <select value={activePeriodId} onChange={(e) => setActivePeriodId(e.target.value)} className="cx-input">
                  {!periods.length ? (
                    <option value="">No pay periods yet</option>
                  ) : (
                    <option value="">Select pay period</option>
                  )}
                  {filteredPeriods.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.start_date} to {p.end_date})</option>)}
                </select>
              </div>
              <div ref={createPeriodPanelRef} className="space-y-3 rounded-xl border border-[#E4E7EC] bg-[#FCFCFD] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#475467]">Create period dates</p>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#475467]">Period name</label>
                <input
                  ref={periodNameInputRef}
                  className="cx-input"
                  placeholder="Fortnightly payroll"
                  value={newPeriod.name}
                  onChange={(e) => {
                    setNewPeriod((v) => ({ ...v, name: e.target.value }));
                    if (createPeriodError) setCreatePeriodError("");
                  }}
                />
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#475467]">Pay date</label>
                <input className="cx-input" type="date" value={newPeriod.pay_date} onChange={(e) => {
                  setNewPeriod((v) => ({ ...v, pay_date: e.target.value }));
                  if (createPeriodError) setCreatePeriodError("");
                }} />
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#475467]">Start date</label>
                <input className="cx-input" type="date" value={newPeriod.start_date} onChange={(e) => {
                  setNewPeriod((v) => ({ ...v, start_date: e.target.value }));
                  if (createPeriodError) setCreatePeriodError("");
                }} />
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#475467]">End date</label>
                <input className="cx-input" type="date" value={newPeriod.end_date} onChange={(e) => {
                  setNewPeriod((v) => ({ ...v, end_date: e.target.value }));
                  if (createPeriodError) setCreatePeriodError("");
                }} />
                {createPeriodError && <p className="text-sm font-medium text-[#B42318]">{createPeriodError}</p>}
                <button className="cx-button-primary w-full justify-center" onClick={createPeriod} disabled={actionLoading["create-period"]}>
                  <Plus size={14} className="mr-2" />{actionLoading["create-period"] ? "Creating..." : "Create Pay Period"}
                </button>
              </div>
            </div>
            {activePeriod && <span className={`mt-4 inline-flex ${badge(activePeriod.status)}`}>{activePeriod.status}</span>}
          </div>

          <div className="space-y-4">
            <div className="cx-panel rounded-2xl border border-[#D6DDEB] bg-white p-4 shadow-[0_8px_22px_rgba(16,24,40,0.06)]">
              <h3 className="text-base font-semibold text-[#0F172A]">Review actions</h3>
              <p className="mt-1 text-sm text-[#667085]">Approve pending entries, then secure the period when complete.</p>
              {!activePeriodId && <p className="mt-2 text-sm text-[#667085]">Create or select a pay period first.</p>}
              <div className="mt-4 space-y-2">
                <button className="cx-button-primary w-full justify-center" disabled={!activePeriodId || readOnly || actionLoading["bulk-approve"]} onClick={bulkApprove}>Bulk approve</button>
                <button className="cx-button-secondary w-full justify-center" disabled={!activePeriodId || readOnly || actionLoading["lock-period"]} onClick={lockPeriod}><Lock size={14} className="mr-2" />Lock Period</button>
                <button className="cx-button-secondary w-full justify-center" disabled={!activePeriodId || activePeriod?.status === "exported" || actionLoading["mark-exported"]} onClick={markExported}><CheckCircle2 size={14} className="mr-2" />Mark Exported</button>
              </div>
            </div>
            <div className="cx-panel rounded-2xl border border-[#D6DDEB] bg-white p-4 shadow-[0_8px_22px_rgba(16,24,40,0.06)]">
              <h3 className="text-base font-semibold text-[#0F172A]">Export actions</h3>
              <p className="mt-1 text-sm text-[#667085]">Download final files for payroll handoff once review is complete.</p>
              {!activePeriodId && <p className="mt-2 text-sm text-[#667085]">Create or select a pay period first.</p>}
              <div className="mt-4 space-y-2">
                <button className="cx-button-secondary w-full justify-center" disabled={!activePeriodId} onClick={() => downloadCsv(`/payroll/periods/${activePeriodId}/export/payroll.csv`, "payroll")}><Download size={14} className="mr-2" />Export Payroll CSV</button>
                <button className="cx-button-secondary w-full justify-center" disabled={!activePeriodId} onClick={() => downloadCsv(`/payroll/periods/${activePeriodId}/export/timesheets.csv`, "timesheets")}><Download size={14} className="mr-2" />Export Timesheets CSV</button>
                <button className="cx-button-secondary w-full justify-center" disabled={!activePeriodId} onClick={() => downloadCsv(`/payroll/periods/${activePeriodId}/export/payslips.csv`, "payslips")}><Download size={14} className="mr-2" />Export Payslips CSV</button>
              </div>
            </div>
          </div>
        </section>

        <section className="cx-panel rounded-2xl border border-[#D6DDEB] bg-white p-4 shadow-[0_8px_22px_rgba(16,24,40,0.06)]">
          <div className="flex items-center justify-between"><h2>Timesheet review</h2></div>
          {!timesheets.length ? (
            <div className="mt-3 rounded-2xl border border-dashed border-[#D0D5DD] bg-[#F8FAFC] p-6 text-center">
              <span className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#EAF0FF] text-[#155EEF]"><ClipboardCheck size={18} /></span>
              <p className="mt-3 text-lg font-semibold text-[#0F172A]">No timesheets awaiting review</p>
              <p className="mt-1 text-sm text-[#667085]">Tracked worker time will appear here for approval.</p>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {timesheets.map((t) => (
                <div key={t.entry_id} className="rounded-xl border p-3 bg-white flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2 lg:grid-cols-5 lg:gap-3">
                    <p><span className="font-semibold text-[#0F172A]">Worker:</span> {t.worker_name || "Worker"}</p>
                    <p><span className="font-semibold text-[#0F172A]">Job:</span> {t.job_title || "Unassigned"}</p>
                    <p><span className="font-semibold text-[#0F172A]">Date:</span> {t.date || "—"}</p>
                    <p><span className="font-semibold text-[#0F172A]">Hours:</span> {Number(t.net_hours || 0)}</p>
                    <p><span className="font-semibold text-[#0F172A]">Status:</span> <span className={`${badge(t.status)} ml-1`}>{t.status || "pending"}</span></p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="cx-button-secondary" disabled={readOnly || actionLoading[`approve-${t.entry_id}`]} onClick={() => approveEntry(t.entry_id)}>Approve</button>
                    <button className="cx-button-secondary" disabled={readOnly || actionLoading[`reject-${t.entry_id}`]} onClick={() => rejectEntry(t.entry_id)}>Reject</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="cx-panel rounded-2xl border border-[#D6DDEB] bg-white p-4 shadow-[0_8px_22px_rgba(16,24,40,0.06)]">
          <h2>Worker pay summaries</h2>
          {!activePeriodId ? (
            <div className="mt-3 rounded-2xl border border-dashed border-[#D0D5DD] bg-[#FCFCFD] p-6 text-center text-sm text-[#667085]">Create or select a pay period to view worker payroll summaries.</div>
          ) : !workerSummaries.length ? (
            <div className="mt-3 rounded-2xl border border-dashed border-[#D0D5DD] bg-[#FCFCFD] p-6 text-center text-sm text-[#667085]">No workers or timesheets found for this period yet.</div>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              {workerSummaries.map((w) => (
                <div key={w.worker_id} className="rounded-2xl border border-[#D8DEE9] bg-gradient-to-br from-white to-[#F8FAFF] p-4 shadow-[0_8px_24px_rgba(16,24,40,0.06)]">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#EEF4FF] text-[#155EEF]"><UserCircle2 size={16} /></span>
                      <div>
                        <p className="font-semibold text-[#0F172A]">{w.name || w.worker_name || "Worker"}</p>
                        <p className="text-sm text-[#667085]">{w.role || w.pay_type || "Team member"}</p>
                      </div>
                    </div>
                    <span className={badge(w.status)}>{w.status || "review"}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <p><span className="font-medium text-[#0F172A]">Approved:</span> {Number(w.approved_hours || 0)}h</p>
                    <p><span className="font-medium text-[#0F172A]">Pending:</span> {Number(w.pending_hours || 0)}h</p>
                    <p><span className="font-medium text-[#0F172A]">Jobs worked:</span> {Number(w.jobs_worked || 0)}</p>
                    <p><span className="font-medium text-[#0F172A]">Gross:</span> {formatCurrency(w.gross_pay || 0)}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="cx-button-secondary" onClick={() => openWorkerDetails(w.worker_id)}>View details</button>
                    <button className="cx-button-secondary" disabled={readOnly} onClick={() => patch(`/payroll/workers/${w.worker_id}/pay-settings`, { hourly_rate: Number(prompt("Hourly rate", w.hourly_rate) || w.hourly_rate) }).then(loadInitial)}>Edit pay settings</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="cx-panel rounded-2xl border border-[#D6DDEB] bg-white p-4 shadow-[0_8px_22px_rgba(16,24,40,0.06)]">
          <h2>Adjustments</h2>
          {!activePeriodId && <p className="mt-2 text-sm text-[#667085]">Create or select a pay period first.</p>}
          <div className="mt-3 rounded-xl border bg-[#FCFCFD] p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#475467]">Worker</label>
                <select className="cx-input" value={adjustmentForm.worker_id} onChange={(e) => setAdjustmentForm((v) => ({ ...v, worker_id: e.target.value }))}>
                  <option value="">Select worker</option>
                  {workerOptions.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#475467]">Type</label>
                <select className="cx-input" value={adjustmentForm.type} onChange={(e) => setAdjustmentForm((v) => ({ ...v, type: e.target.value }))}><option>allowance</option><option>reimbursement</option><option>bonus</option><option>deduction</option><option>correction</option><option>other</option></select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#475467]">Label</label>
                <input className="cx-input" placeholder="Travel allowance" value={adjustmentForm.label} onChange={(e) => setAdjustmentForm((v) => ({ ...v, label: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#475467]">Amount</label>
                <input className="cx-input" placeholder="0.00" type="number" value={adjustmentForm.amount} onChange={(e) => setAdjustmentForm((v) => ({ ...v, amount: e.target.value }))} />
              </div>
              <div className="flex items-center pt-5">
                <label className="text-sm text-[#344054]"><input className="mr-2" type="checkbox" checked={adjustmentForm.taxable} onChange={(e) => setAdjustmentForm((v) => ({ ...v, taxable: e.target.checked }))} />Taxable</label>
              </div>
              <div className="flex items-end">
                <button className="cx-button-primary w-full" disabled={readOnly || !activePeriodId || actionLoading["create-adjustment"]} onClick={createAdjustment}>Add adjustment</button>
              </div>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {adjustments.map((a) => (
              <div key={a.id} className="rounded-xl border p-3 bg-white flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-[#344054]">{a.label || "Adjustment"} ({a.type || "other"}) · {formatCurrency(a.amount || 0)}</p>
                <button className="cx-button-secondary" disabled={readOnly} onClick={() => del(`/payroll/adjustments/${a.id}`).then(() => loadPeriodData(activePeriodId))}>Delete</button>
              </div>
            ))}
            {!adjustments.length && <p className="text-sm text-[#667085]">No adjustments added for this pay period yet.</p>}
          </div>
        </section>

        <section className="cx-panel rounded-2xl border border-[#D6DDEB] bg-white p-4 shadow-[0_8px_22px_rgba(16,24,40,0.06)]">
          <details>
            <summary className="flex cursor-pointer items-center gap-2 font-semibold text-[#0F172A]"><Settings size={16} />Advanced payroll settings</summary>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#475467]">Payroll method</label>
                <input className="cx-input" value={settingsForm.payroll_method || ""} onChange={(e) => setSettingsForm((s) => ({ ...s, payroll_method: e.target.value }))} placeholder="Country / payroll method" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#475467]">Rate mode</label>
                <select className="cx-input" value={settingsForm.rate_mode || "manual_rate"} onChange={(e) => setSettingsForm((s) => ({ ...s, rate_mode: e.target.value }))}><option value="manual_rate">manual_rate</option><option value="tax_code_table">tax_code_table</option><option value="no_tax">no_tax</option></select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#475467]">Default rate</label>
                <input className="cx-input" type="number" step="0.001" value={settingsForm.default_rate || 0} onChange={(e) => setSettingsForm((s) => ({ ...s, default_rate: Number(e.target.value || 0) }))} />
              </div>
              <div className="flex items-end">
                <button className="cx-button-primary w-full" onClick={saveSettings} disabled={actionLoading["save-settings"]}>{actionLoading["save-settings"] ? "Saving..." : "Save settings"}</button>
              </div>
            </div>
          </details>
        </section>

        {workerDetails && (
          <div className="fixed inset-0 z-50 bg-black/30 p-3 md:p-6">
            <div className="mx-auto h-full max-w-3xl overflow-y-auto rounded-2xl border bg-white p-5 shadow-xl">
              <div className="flex items-center justify-between">
                <h2>Worker payroll details</h2>
                <button className="cx-button-secondary" onClick={() => setWorkerDetails(null)}><X size={14} className="mr-2" />Close</button>
              </div>
              <div className="mt-3 rounded-xl border bg-[#FCFCFD] p-3 text-sm text-[#344054]">
                <p className="font-semibold text-[#0F172A]">{workerDetails.worker?.name || "Worker"} · {workerDetails.worker?.role || "worker"}</p>
                <p className="mt-1">Approved: {Number(workerDetails.approved_hours || 0)}h · Pending: {Number(workerDetails.pending_hours || 0)}h · Jobs: {Number(workerDetails.jobs_worked || 0)}</p>
              </div>
              <div className="mt-4 space-y-2">
                {(workerDetails.timesheet_entries || []).map((t) => (
                  <div key={t.entry_id} className="rounded-lg border p-3 text-sm">
                    <p className="font-medium">{t.job_title || "Job"} · {t.date || "—"}</p>
                    <p className="text-[#667085]">{Number(t.net_hours || 0)}h · {t.status || "pending"}</p>
                  </div>
                ))}
                {!(workerDetails.timesheet_entries || []).length && <p className="text-sm text-[#667085]">No timesheet entries for this worker in this period.</p>}
              </div>
            </div>
          </div>
        )}

        {error && <div className="cx-error-state">{error}</div>}
        {(loading || initializing) && <div className="cx-loading-state">Loading payroll…</div>}
      </div>
    </Layout>
  );
}
