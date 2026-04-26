import React, { useCallback, useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { Download, Lock, CheckCircle2, Plus, Printer, Settings } from "lucide-react";
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

export default function PayrollPage() {
  const { get, post, patch, del, loading, error } = useApi();
  const [periods, setPeriods] = useState([]);
  const [activePeriodId, setActivePeriodId] = useState("");
  const [summary, setSummary] = useState(null);
  const [timesheets, setTimesheets] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [settings, setSettings] = useState(null);
  const [payslip, setPayslip] = useState(null);
  const [newPeriod, setNewPeriod] = useState({ name: "", start_date: "", end_date: "", pay_date: "" });
  const [adjustmentForm, setAdjustmentForm] = useState({ worker_id: "", type: "allowance", label: "", amount: "", taxable: false, notes: "" });

  const fetchWorkspace = useCallback(async () => {
    const [periodRes, workerRes, settingsRes] = await Promise.all([
      get("/payroll/pay-periods"),
      get("/payroll/workers"),
      get("/payroll/settings"),
    ]);
    const loadedPeriods = periodRes?.success ? (periodRes.data?.pay_periods || []) : [];
    setPeriods(loadedPeriods);
    setWorkers(workerRes?.success ? (workerRes.data?.workers || []) : []);
    setSettings(settingsRes?.success ? settingsRes.data : null);
    if (!activePeriodId && loadedPeriods.length) {
      setActivePeriodId(loadedPeriods[0].id);
    }
  }, [get, activePeriodId]);

  const fetchPeriodData = useCallback(async (periodId) => {
    if (!periodId) return;
    const [summaryRes, timesheetsRes, adjustmentsRes] = await Promise.all([
      get(`/payroll/pay-periods/${periodId}/summary`),
      get(`/payroll/timesheets?period_id=${periodId}`),
      get(`/payroll/pay-periods/${periodId}/adjustments`),
    ]);
    setSummary(summaryRes?.success ? summaryRes.data : null);
    setTimesheets(timesheetsRes?.success ? (timesheetsRes.data?.timesheets || []) : []);
    setAdjustments(adjustmentsRes?.success ? (adjustmentsRes.data?.adjustments || []) : []);
  }, [get]);

  useEffect(() => { fetchWorkspace(); }, [fetchWorkspace]);
  useEffect(() => { fetchPeriodData(activePeriodId); }, [activePeriodId, fetchPeriodData]);

  const activePeriod = useMemo(() => periods.find((p) => p.id === activePeriodId) || null, [periods, activePeriodId]);
  const readOnly = ["locked", "exported"].includes(String(activePeriod?.status || ""));

  const downloadCsv = async (path, filename) => {
    const res = await get(path, { responseType: "blob" });
    if (!res?.success) return;
    const blob = new Blob([res.data], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const createPeriod = async () => {
    const res = await post("/payroll/pay-periods", newPeriod);
    if (res?.success) {
      await fetchWorkspace();
      setNewPeriod({ name: "", start_date: "", end_date: "", pay_date: "" });
    }
  };

  const approveEntry = async (entryId) => { await post(`/payroll/timesheets/${entryId}/approve`, {}); fetchPeriodData(activePeriodId); };
  const rejectEntry = async (entryId) => { await post(`/payroll/timesheets/${entryId}/reject`, { notes: "Rejected in payroll review" }); fetchPeriodData(activePeriodId); };
  const bulkApprove = async () => {
    const pendingIds = timesheets.filter((x) => x.status === "pending").map((x) => x.entry_id);
    await post("/payroll/timesheets/bulk-approve", { entry_ids: pendingIds });
    fetchPeriodData(activePeriodId);
  };

  const createAdjustment = async () => {
    await post(`/payroll/pay-periods/${activePeriodId}/adjustments`, { ...adjustmentForm, amount: Number(adjustmentForm.amount || 0) });
    setAdjustmentForm({ worker_id: "", type: "allowance", label: "", amount: "", taxable: false, notes: "" });
    fetchPeriodData(activePeriodId);
  };

  const openPayslip = async (workerId) => {
    const res = await get(`/payroll/pay-periods/${activePeriodId}/workers/${workerId}/payslip`);
    if (res?.success) setPayslip(res.data);
  };

  return (
    <Layout>
      <div className="cx-page" style={{ background: "#f6f3ee" }}>
        <div className="cx-page-hero" style={{ background: "#fff" }}>
          <h1 className="cx-page-title">Payroll</h1>
          <p className="cx-page-subtitle">Review timesheets, calculate payroll, prepare payslips, and export clean summaries.</p>
          <p className="text-sm text-[#155EEF] mt-2">{DISCLAIMER}</p>
          <div className="cx-toolbar mt-3">
            <button className="cx-button-secondary" disabled={!activePeriodId} onClick={() => downloadCsv(`/payroll/pay-periods/${activePeriodId}/export.csv`, "payroll.csv")}><Download size={14} className="mr-2" />Export Payroll CSV</button>
            <button className="cx-button-secondary" disabled={!activePeriodId} onClick={() => downloadCsv(`/payroll/pay-periods/${activePeriodId}/timesheets.csv`, "timesheets.csv")}><Download size={14} className="mr-2" />Export Timesheets CSV</button>
            <button className="cx-button-secondary" disabled={!activePeriodId} onClick={() => downloadCsv(`/payroll/pay-periods/${activePeriodId}/payslips.csv`, "payslips.csv")}><Download size={14} className="mr-2" />Export Payslips CSV</button>
            <button className="cx-button-primary" onClick={createPeriod}><Plus size={14} className="mr-2" />Create Pay Period</button>
            <button className="cx-button-secondary" disabled={!activePeriodId || readOnly} onClick={() => post(`/payroll/pay-periods/${activePeriodId}/lock`, {}).then(() => fetchWorkspace())}><Lock size={14} className="mr-2" />Lock Period</button>
            <button className="cx-button-secondary" disabled={!activePeriodId || activePeriod?.status === "exported"} onClick={() => post(`/payroll/pay-periods/${activePeriodId}/mark-exported`, {}).then(() => fetchWorkspace())}><CheckCircle2 size={14} className="mr-2" />Mark Exported</button>
          </div>
        </div>

        <section className="cx-panel p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <select value={activePeriodId} onChange={(e) => setActivePeriodId(e.target.value)} className="cx-input md:col-span-2">
              <option value="">Select pay period</option>
              {periods.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.start_date} to {p.end_date})</option>)}
            </select>
            <input className="cx-input" placeholder="Name" value={newPeriod.name} onChange={(e) => setNewPeriod((v) => ({ ...v, name: e.target.value }))} />
            <input className="cx-input" type="date" value={newPeriod.start_date} onChange={(e) => setNewPeriod((v) => ({ ...v, start_date: e.target.value }))} />
            <input className="cx-input" type="date" value={newPeriod.end_date} onChange={(e) => setNewPeriod((v) => ({ ...v, end_date: e.target.value }))} />
          </div>
          {activePeriod && <span className={badge(activePeriod.status)}>{activePeriod.status}</span>}
        </section>

        {summary && (
          <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="cx-stat-card"><p>Approved hours</p><p>{summary.total_approved_hours}</p></div>
            <div className="cx-stat-card"><p>Pending hours</p><p>{summary.total_pending_hours}</p></div>
            <div className="cx-stat-card"><p>Workers included</p><p>{summary.total_workers}</p></div>
            <div className="cx-stat-card"><p>Gross payroll</p><p>{formatCurrency(summary.total_gross_pay)}</p></div>
            <div className="cx-stat-card"><p>Net pay estimate</p><p>{formatCurrency(summary.total_net_pay_estimate)}</p></div>
          </section>
        )}

        <section className="cx-panel p-4">
          <div className="flex items-center justify-between"><h2>Timesheet review</h2><button className="cx-button-primary" disabled={readOnly} onClick={bulkApprove}>Bulk approve</button></div>
          <div className="space-y-2 mt-3">
            {timesheets.map((t) => (
              <div key={t.entry_id} className="rounded-xl border p-3 bg-white flex flex-wrap gap-3 items-center justify-between">
                <div>
                  <p className="font-semibold">{t.worker_name || "Worker"} — {t.job_title}</p>
                  <p className="text-sm text-[#667085]">{t.date} • {t.net_hours}h • {t.client_name || "No client"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={badge(t.status)}>{t.status}</span>
                  <button className="cx-button-secondary" disabled={readOnly} onClick={() => approveEntry(t.entry_id)}>Approve</button>
                  <button className="cx-button-secondary" disabled={readOnly} onClick={() => rejectEntry(t.entry_id)}>Reject</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="cx-panel p-4">
          <h2>Worker pay summaries</h2>
          <div className="space-y-3 mt-3">
            {(summary?.worker_summaries || []).map((w) => (
              <div key={w.worker_id} className="rounded-xl border p-3 bg-white">
                <div className="flex items-center justify-between"><p className="font-semibold">{w.worker_name}</p><span className={badge(w.status)}>{w.status}</span></div>
                <p className="text-sm text-[#667085]">{w.pay_type} • {w.approved_hours}h • Gross {formatCurrency(w.gross_pay)} • Net {formatCurrency(w.net_pay_estimate)}</p>
                <div className="mt-2 flex gap-2">
                  <button className="cx-button-secondary" onClick={() => openPayslip(w.worker_id)}>View payslip</button>
                  <button className="cx-button-secondary" disabled={readOnly} onClick={() => patch(`/payroll/workers/${w.worker_id}/pay-settings`, { hourly_rate: Number(prompt("Hourly rate", w.hourly_rate) || w.hourly_rate) }).then(() => fetchWorkspace())}>Edit pay settings</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="cx-panel p-4">
          <div className="flex items-center gap-2"><Settings size={16} /><h2>Payroll settings</h2></div>
          {settings && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-2">
              <input className="cx-input" value={settings.country || ""} onChange={(e) => setSettings((s) => ({ ...s, country: e.target.value }))} placeholder="country" />
              <select className="cx-input" value={settings.tax_mode || "manual_rate"} onChange={(e) => setSettings((s) => ({ ...s, tax_mode: e.target.value }))}><option value="manual_rate">manual_rate</option><option value="tax_code_table">tax_code_table</option><option value="no_tax">no_tax</option></select>
              <input className="cx-input" type="number" step="0.001" value={settings.default_tax_rate || 0} onChange={(e) => setSettings((s) => ({ ...s, default_tax_rate: Number(e.target.value || 0) }))} />
              <button className="cx-button-primary" onClick={() => patch("/payroll/settings", settings)}>Save settings</button>
            </div>
          )}
        </section>

        <section className="cx-panel p-4">
          <h2>Adjustments</h2>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-2 mt-2">
            <select className="cx-input" value={adjustmentForm.worker_id} onChange={(e) => setAdjustmentForm((v) => ({ ...v, worker_id: e.target.value }))}><option value="">Worker</option>{workers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select>
            <select className="cx-input" value={adjustmentForm.type} onChange={(e) => setAdjustmentForm((v) => ({ ...v, type: e.target.value }))}><option>allowance</option><option>reimbursement</option><option>bonus</option><option>deduction</option><option>correction</option><option>other</option></select>
            <input className="cx-input" placeholder="Label" value={adjustmentForm.label} onChange={(e) => setAdjustmentForm((v) => ({ ...v, label: e.target.value }))} />
            <input className="cx-input" placeholder="Amount" type="number" value={adjustmentForm.amount} onChange={(e) => setAdjustmentForm((v) => ({ ...v, amount: e.target.value }))} />
            <label className="text-sm"><input type="checkbox" checked={adjustmentForm.taxable} onChange={(e) => setAdjustmentForm((v) => ({ ...v, taxable: e.target.checked }))} /> Taxable</label>
            <button className="cx-button-primary" disabled={readOnly || !activePeriodId} onClick={createAdjustment}>Add adjustment</button>
          </div>
          <div className="mt-2 space-y-2">{adjustments.map((a) => <div key={a.id} className="rounded border p-2 bg-white flex justify-between"><span>{a.label} ({a.type}) {formatCurrency(a.amount)}</span><button className="cx-button-secondary" disabled={readOnly} onClick={() => del(`/payroll/adjustments/${a.id}`).then(() => fetchPeriodData(activePeriodId))}>Delete</button></div>)}</div>
        </section>

        {payslip && (
          <section className="cx-panel p-4">
            <div className="flex items-center justify-between"><h2>Payslip preview</h2><button className="cx-button-primary" onClick={() => window.print()}><Printer size={14} className="mr-2" />Print</button></div>
            <p>{payslip.business_name}</p><p>{payslip.worker_name} ({payslip.worker_email})</p><p>Gross: {formatCurrency(payslip.gross_pay)} | Tax: {formatCurrency(payslip.employee_tax)} | Net: {formatCurrency(payslip.net_pay_estimate)}</p>
            <p className="text-sm text-[#155EEF] mt-2">{payslip.disclaimer || DISCLAIMER}</p>
          </section>
        )}

        {error && <div className="cx-error-state">{error}</div>}
        {loading && <div className="cx-loading-state">Loading payroll…</div>}
      </div>
    </Layout>
  );
}
