import React, { useCallback, useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { CheckCircle2, Clock3, Download, Lock, Save, ShieldCheck, Unlock, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";
import { formatCurrency } from "../lib/utils";

function badge(status) {
  const s = String(status || "open").toLowerCase();
  if (s === "exported") return "cx-status-badge cx-status-badge--green";
  if (s === "locked" || s === "pending") return "cx-status-badge cx-status-badge--amber";
  if (s === "rejected" || s === "needs_rate") return "cx-status-badge cx-status-badge--red";
  return "cx-status-badge cx-status-badge--blue";
}

function filePart(value) {
  return String(value || "timesheets").trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-_]/g, "");
}

function workerId(worker) {
  return worker?.worker_id || worker?.id || worker?.user_id || worker?._id || worker?.email || worker?.name;
}

function workerName(worker) {
  return worker?.name || worker?.worker_name || worker?.email || "Worker";
}

function rateKey(worker, index) {
  return `${workerId(worker) || workerName(worker) || "worker"}-${index}`;
}

export default function TimesheetsPage() {
  const { get, post } = useApi();
  const [periods, setPeriods] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [periodId, setPeriodId] = useState("");
  const [summary, setSummary] = useState(null);
  const [timesheets, setTimesheets] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [savedRates, setSavedRates] = useState({});
  const [dirtyRates, setDirtyRates] = useState({});
  const [busy, setBusy] = useState({});
  const [loading, setLoading] = useState(true);

  const activePeriod = useMemo(() => periods.find((p) => p.id === periodId) || null, [periods, periodId]);
  const workerSummaries = summary?.worker_summaries || [];
  const rateWorkers = workerSummaries.length ? workerSummaries : workers;
  const pending = timesheets.filter((t) => String(t.status || "").toLowerCase() === "pending");
  const readOnly = ["locked", "exported"].includes(String(activePeriod?.status || "").toLowerCase());
  const exportPart = filePart(activePeriod?.name || periodId);

  const run = async (key, fn) => {
    setBusy((s) => ({ ...s, [key]: true }));
    try { return await fn(); } finally { setBusy((s) => ({ ...s, [key]: false })); }
  };

  const loadPeriod = useCallback(async (id) => {
    if (!id) return;
    const [summaryRes, timesheetRes] = await Promise.all([
      get(`/payroll/summary?period_id=${id}`),
      get(`/payroll/timesheets?period_id=${id}`),
    ]);
    setSummary(summaryRes?.success ? summaryRes.data : null);
    setTimesheets(timesheetRes?.success ? timesheetRes.data?.timesheets || [] : []);
  }, [get]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [periodRes, workerRes] = await Promise.all([
      get("/payroll/periods"),
      get("/payroll/workers"),
    ]);
    const loadedPeriods = periodRes?.success ? periodRes.data?.pay_periods || [] : [];
    const loadedWorkers = workerRes?.success ? workerRes.data?.workers || [] : [];
    setPeriods(loadedPeriods);
    setWorkers(loadedWorkers);
    const next = periodId || loadedPeriods[0]?.id || "";
    if (next) {
      setPeriodId(next);
      await loadPeriod(next);
    }
    setLoading(false);
  }, [get, loadPeriod, periodId]);

  useEffect(() => { loadAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (periodId) loadPeriod(periodId); }, [periodId, loadPeriod]);

  useEffect(() => {
    if (!rateWorkers.length) return;
    setDrafts((current) => {
      const next = { ...current };
      rateWorkers.forEach((worker, index) => {
        const key = rateKey(worker, index);
        if (!key || next[key]) return;
        next[key] = {
          hourly_rate: String(worker.hourly_rate ?? worker.pay_rate ?? worker.payroll_rate ?? worker.rate ?? ""),
          pay_type: worker.pay_type || "hourly",
          notes: worker.payroll_notes || worker.rate_notes || "",
        };
      });
      return next;
    });
  }, [rateWorkers]);

  const updateDraft = (worker, index, field, value) => {
    const key = rateKey(worker, index);
    if (!key) return;
    setDrafts((current) => ({
      ...current,
      [key]: { hourly_rate: "", pay_type: "hourly", notes: "", ...(current[key] || {}), [field]: value },
    }));
    setDirtyRates((current) => ({ ...current, [key]: true }));
    setSavedRates((current) => ({ ...current, [key]: false }));
  };

  const saveRate = async (worker, index) => {
    const id = workerId(worker);
    const key = rateKey(worker, index);
    if (!id) return toast.error("Worker not found");
    const draft = drafts[key] || {};
    const rate = Number(draft.hourly_rate || 0);
    if (Number.isNaN(rate) || rate < 0) return toast.error("Enter a valid worker rate");
    await run(`rate-${key}`, async () => {
      const res = await post(`/payroll/workers/${id}/rate`, {
        hourly_rate: rate,
        pay_type: draft.pay_type || "hourly",
        payroll_notes: draft.notes || "",
      });
      if (!res?.success) return toast.error(res?.error || "Could not save worker rate");
      setSavedRates((current) => ({ ...current, [key]: true }));
      setDirtyRates((current) => ({ ...current, [key]: false }));
      toast.success(`${workerName(worker)} rate saved`);
      await loadAll();
    });
  };

  const approveEntry = async (id) => run(`approve-${id}`, async () => {
    const res = await post(`/payroll/timesheets/${id}/approve`, {});
    if (!res?.success) return toast.error(res?.error || "Approval failed");
    toast.success("Timesheet approved");
    await loadPeriod(periodId);
  });

  const approveAll = async () => run("approve-all", async () => {
    const res = await post(`/payroll/periods/${periodId}/bulk-approve`, {});
    if (!res?.success) return toast.error(res?.error || "Approval failed");
    toast.success("Pending timesheets approved");
    await loadPeriod(periodId);
  });

  const lockOrUnlock = async () => run("lock", async () => {
    const action = readOnly ? "unlock" : "lock";
    const res = await post(`/payroll/periods/${periodId}/${action}`, {});
    if (!res?.success) return toast.error(res?.error || `Could not ${action} period`);
    toast.success(readOnly ? "Timesheet period unlocked" : "Timesheet period locked");
    await loadAll();
  });

  const markExported = async () => run("exported", async () => {
    const res = await post(`/payroll/periods/${periodId}/mark-exported`, {});
    if (!res?.success) return toast.error(res?.error || "Could not mark exported");
    toast.success("Timesheets marked exported");
    await loadAll();
  });

  const downloadCsv = async (path, filename, label) => {
    if (!periodId) return toast.error("Select a timesheet period first");
    await run(label, async () => {
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

  return (
    <Layout>
      <div className="cx-page space-y-6">
        <section className="rounded-3xl border border-border bg-gradient-to-br from-white via-[#f6f9ff] to-[#eef6ff] p-6 shadow-[0_10px_30px_rgba(16,24,40,0.08)]">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Timesheet control centre</p>
          <h1 className="cx-page-title mt-2">Timesheets & Pay Export</h1>
          <p className="cx-page-subtitle max-w-4xl">Approve worker time, set internal worker rates, lock clean periods, and export payroll-ready files for your external payroll provider, accountant, or bookkeeper.</p>
          <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800">Churvox handles timesheets, internal rates, labour estimates and exports only. Final PAYE, KiwiSaver, leave, payslips, IRD filing and payments stay external.</div>
        </section>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-border bg-white p-4 shadow-sm"><p className="text-xs font-semibold uppercase text-slate-500">Active period</p><p className="mt-2 text-2xl font-black text-slate-950">{activePeriod?.name || "None"}</p></div>
          <div className="rounded-2xl border border-border bg-white p-4 shadow-sm"><p className="text-xs font-semibold uppercase text-slate-500">Approved hours</p><p className="mt-2 text-2xl font-black text-slate-950">{Number(summary?.approved_hours || 0).toFixed(2)}</p></div>
          <div className="rounded-2xl border border-border bg-white p-4 shadow-sm"><p className="text-xs font-semibold uppercase text-slate-500">Needs review</p><p className="mt-2 text-2xl font-black text-slate-950">{Number(summary?.pending_review_count || pending.length)}</p></div>
          <div className="rounded-2xl border border-border bg-white p-4 shadow-sm"><p className="text-xs font-semibold uppercase text-slate-500">Workers</p><p className="mt-2 text-2xl font-black text-slate-950">{Number(summary?.workers_included || rateWorkers.length)}</p></div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.4fr]">
          <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold text-slate-950">Timesheet periods</h2><span className={badge(activePeriod?.status)}>{activePeriod?.status || "open"}</span></div>
            <div className="mt-3 space-y-2">
              {loading && <p className="text-sm text-slate-500">Loading periods...</p>}
              {!loading && !periods.length && <div className="rounded-xl border border-dashed border-border bg-slate-50 p-4 text-sm text-slate-500">No timesheet periods found yet.</div>}
              {periods.map((period) => <button key={period.id} type="button" onClick={() => setPeriodId(period.id)} className={`w-full rounded-xl border p-3 text-left ${periodId === period.id ? "border-blue-500 bg-blue-50" : "border-border bg-slate-50"}`}><p className="font-bold text-slate-950">{period.name}</p><p className="text-xs text-slate-500">{period.start_date} → {period.end_date}</p></button>)}
            </div>
            <div className="mt-4 flex flex-wrap gap-2"><button className="cx-button-secondary" disabled={!periodId || busy.lock} onClick={lockOrUnlock}>{readOnly ? <Unlock size={14} className="mr-2" /> : <Lock size={14} className="mr-2" />}{readOnly ? "Unlock" : "Lock period"}</button><button className="cx-button-secondary" disabled={!periodId || busy.exported} onClick={markExported}><ShieldCheck size={14} className="mr-2" />Mark exported</button></div>
          </div>

          <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-950">Approval queue</h2><p className="text-sm text-slate-500">Review worker time before export.</p></div><button className="cx-button-secondary" disabled={!periodId || readOnly || !pending.length || busy["approve-all"]} onClick={approveAll}>Approve all pending</button></div>
            <div className="mt-3 space-y-2">{!timesheets.length && <div className="rounded-xl border border-dashed border-border bg-slate-50 p-4 text-sm text-slate-500">No timesheets found for this period.</div>}{timesheets.map((entry) => <div key={entry.entry_id} className="rounded-xl border border-border bg-slate-50 p-3"><div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-5"><p><b>Worker:</b> {entry.worker_name || "Worker"}</p><p><b>Job:</b> {entry.job_title || "Job"}</p><p><b>Date:</b> {entry.date || "—"}</p><p><b>Net:</b> {Number(entry.net_hours || 0).toFixed(2)}h</p><p><span className={badge(entry.status)}>{entry.status || "pending"}</span></p></div><button className="cx-button-secondary mt-2" disabled={readOnly || entry.status !== "pending" || busy[`approve-${entry.entry_id}`]} onClick={() => approveEntry(entry.entry_id)}><CheckCircle2 size={14} className="mr-2" />Approve</button></div>)}</div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-950">Worker rates</h2><p className="text-sm text-slate-500">Set internal worker cost rates for labour estimates and exports. Workers do not see this page.</p></div><span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-black text-blue-700"><UsersRound size={14} /> Internal only</span></div>
          <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
            {!rateWorkers.length && <p className="text-sm text-slate-500">No workers found yet. Invite workers from Team first.</p>}
            {rateWorkers.map((worker, index) => {
              const id = workerId(worker);
              const key = rateKey(worker, index);
              const draft = drafts[key] || { hourly_rate: "", pay_type: "hourly", notes: "" };
              const rate = Number(draft.hourly_rate || 0);
              const approved = Number(worker.approved_hours || 0);
              const saving = busy[`rate-${key}`];
              const saved = savedRates[key] && !dirtyRates[key];
              return <div key={key} className={`rounded-2xl border bg-slate-50/70 p-4 transition-all ${saved ? "border-emerald-200 ring-2 ring-emerald-100" : "border-slate-200"}`}><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-black text-slate-950">{workerName(worker)}</p><p className="text-xs text-slate-500">Approved: {approved.toFixed(2)}h · Estimate: {formatCurrency(approved * (Number.isNaN(rate) ? 0 : rate))}</p></div><div className="flex flex-col items-end gap-1"><span className={rate > 0 ? "cx-status-badge cx-status-badge--green" : "cx-status-badge cx-status-badge--amber"}>{rate > 0 ? "Rate set" : "Needs rate"}</span>{saved && <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-black text-emerald-700"><CheckCircle2 size={12} /> Saved</span>}</div></div><div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3"><label className="text-sm font-bold text-slate-700">Hourly rate<input type="number" min="0" step="0.01" value={draft.hourly_rate} onChange={(e) => updateDraft(worker, index, "hourly_rate", e.target.value)} placeholder="0.00" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" /></label><label className="text-sm font-bold text-slate-700">Type<select value={draft.pay_type || "hourly"} onChange={(e) => updateDraft(worker, index, "pay_type", e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"><option value="hourly">Hourly</option><option value="salary">Salary</option><option value="contractor">Contractor</option></select></label><div className="flex items-end"><button type="button" className={`w-full justify-center ${saved ? "cx-button-secondary" : "cx-button-primary"}`} disabled={!id || saving} onClick={() => saveRate(worker, index)}><Save size={14} className="mr-2" />{saving ? "Saving..." : saved ? "Saved" : "Save rate"}</button></div></div><label className="mt-3 block text-sm font-bold text-slate-700">Rate notes<input type="text" value={draft.notes} onChange={(e) => updateDraft(worker, index, "notes", e.target.value)} placeholder="Optional note for accountant/bookkeeper" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" /></label></div>;
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-white p-4 shadow-sm"><h2 className="text-lg font-bold text-slate-950">Export centre</h2><p className="text-sm text-slate-500">Download clean files for your payroll provider, accountant, or bookkeeper.</p><div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3"><button className="cx-button-secondary justify-center" disabled={!periodId} onClick={() => downloadCsv(`/payroll/periods/${periodId}/export/payroll-summary.csv`, `churvox-timesheet-summary-${exportPart}.csv`, "Timesheet summary")}><Download size={14} className="mr-2" />Summary CSV</button><button className="cx-button-secondary justify-center" disabled={!periodId} onClick={() => downloadCsv(`/payroll/periods/${periodId}/export/timesheets.csv`, `churvox-timesheets-${exportPart}.csv`, "Timesheet detail")}><Download size={14} className="mr-2" />Detailed timesheets CSV</button><button className="cx-button-secondary justify-center" disabled={!periodId} onClick={() => downloadCsv(`/payroll/periods/${periodId}/export/worker-pay.csv`, `churvox-worker-hours-${exportPart}.csv`, "Worker hours summary")}><Download size={14} className="mr-2" />Worker hours CSV</button></div></section>
      </div>
    </Layout>
  );
}
