import React, { useCallback, useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { Download, RefreshCw } from "lucide-react";
import { useApi } from "../hooks/useApi";

const PERIOD_OPTIONS = ["all", "this_week", "last_week", "this_month", "last_month"];

const statusTone = (status) => {
  const s = String(status || "pending").toLowerCase();
  if (s === "approved") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (s === "rejected") return "bg-red-50 text-red-700 border-red-200";
  if (s === "submitted") return "bg-blue-50 text-blue-700 border-blue-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
};

export default function TimesheetsPage() {
  const { get, post } = useApi();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState({});
  const [timesheets, setTimesheets] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [worker, setWorker] = useState("all");
  const [period, setPeriod] = useState("all");
  const [selectedDetails, setSelectedDetails] = useState({});
  const [busy, setBusy] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true); setError("");
    const q = period && period !== "all" ? `?pay_period=${encodeURIComponent(period)}` : "";
    const [sumRes, listRes] = await Promise.allSettled([get(`/timesheets/summary${q}`), get(`/timesheets${q}`)]);
    const sum = sumRes.status === "fulfilled" && sumRes.value?.success ? sumRes.value.data : null;
    const list = listRes.status === "fulfilled" && listRes.value?.success ? listRes.value.data : null;
    if (!sum && !list) setError("Unable to load payroll data. Please retry.");
    const rawList = Array.isArray(list) ? list : Array.isArray(list?.timesheets) ? list.timesheets : Array.isArray(list?.data) ? list.data : [];
    setSummary(sum || {});
    setTimesheets(rawList);
    setLastUpdated(new Date());
    setLoading(false);
  }, [get, period]);

  useEffect(() => { loadData(); }, [loadData]);

  const workers = useMemo(() => [...new Set(timesheets.map((t) => t.worker_email || t.worker_name).filter(Boolean))], [timesheets]);
  const payPeriods = useMemo(() => [...new Set(timesheets.map((t) => t.pay_period).filter(Boolean))], [timesheets]);

  const filtered = useMemo(() => timesheets.filter((t) => {
    const text = `${t.worker_name || ""} ${t.worker_email || ""}`.toLowerCase();
    const searchMatch = !search || text.includes(search.toLowerCase());
    const statusMatch = status === "all" || String(t.status || "pending").toLowerCase() === status;
    const workerMatch = worker === "all" || (t.worker_email || t.worker_name) === worker;
    const periodMatch = period === "all" || t.pay_period === period || !PERIOD_OPTIONS.includes(period);
    return searchMatch && statusMatch && workerMatch && periodMatch;
  }), [timesheets, search, status, worker, period]);

  const mutate = async (id, action) => {
    if (!window.confirm(`${action === "approve" ? "Approve" : "Reject"} this timesheet?`)) return;
    let reason = "";
    if (action === "reject") reason = window.prompt("Reason (optional):", "") || "";
    setBusy((s) => ({ ...s, [id + action]: true }));
    const res = await post(`/timesheets/${id}/${action}`, action === "reject" ? { reason } : {});
    setBusy((s) => ({ ...s, [id + action]: false }));
    if (!res?.success) return setError(res?.error || `Failed to ${action} timesheet.`);
    await loadData();
  };

  const exportCsv = async () => {
    const res = await get("/payroll/export.csv", { responseType: "blob" });
    if (!res?.success) {
      const msg = String(res?.error || "Export failed");
      setError(msg.includes("403") ? "Payroll export requires payroll/admin access." : msg);
      return;
    }
    const blob = new Blob([res.data], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "churvox-payroll-export.csv"; a.click(); URL.revokeObjectURL(url);
  };

  return <Layout><div className="cx-page space-y-5">
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-bold text-slate-950">Payroll / Timesheets</h1><p className="text-slate-700">Review approved hours and export payroll summaries for handoff.</p></div>
      <div className="flex flex-wrap gap-2"><span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">Export / review only</span><button onClick={loadData} className="cx-button-secondary"><RefreshCw className="mr-2 h-4 w-4"/>Refresh</button><button onClick={exportCsv} className="cx-button-primary"><Download className="mr-2 h-4 w-4"/>Export CSV</button></div></div>
      <p className="mt-2 text-xs text-slate-600">Last updated: {lastUpdated ? lastUpdated.toLocaleString() : "-"}</p>
    </section>
    <section className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800"><p className="font-bold">Payroll is review and export only.</p><p>Churvox does not submit tax, file government returns, or run bank payouts.</p><p>Approval changes are manual and role-protected.</p></section>
    <section className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-7">{[
      ["Total hours", summary.total_hours ?? 0],["Approved hours", summary.approved_hours ?? 0],["Pending timesheets", summary.pending_timesheets ?? 0],["Rejected timesheets", summary.rejected_timesheets ?? 0],["Workers", summary.worker_count ?? workers.length],["Gross pay est.", summary.gross_pay ?? "-"],["Export status", summary.export_only === false ? "restricted" : "ready"]
    ].map(([k,v]) => <div key={k} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs text-slate-600">{k}</p><p className="text-xl font-black text-slate-950">{v}</p></div>)}</section>
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm grid grid-cols-1 gap-3 md:grid-cols-5"><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search worker" className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900" />
      <select value={status} onChange={(e)=>setStatus(e.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm"><option value="all">All statuses</option><option value="pending">pending</option><option value="submitted">submitted</option><option value="approved">approved</option><option value="rejected">rejected</option></select>
      <select value={worker} onChange={(e)=>setWorker(e.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm"><option value="all">All workers</option>{workers.map((w)=><option key={w} value={w}>{w}</option>)}</select>
      <select value={period} onChange={(e)=>setPeriod(e.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm"><option value="all">All periods</option><option value="this_week">This week</option><option value="last_week">Last week</option><option value="this_month">This month</option><option value="last_month">Last month</option>{payPeriods.map((p)=><option key={p} value={p}>{p}</option>)}</select>
      <button onClick={loadData} className="cx-button-secondary">Retry</button></section>
    {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-red-700">{error}</div> : null}
    <section className="space-y-3">{loading ? <div className="rounded-2xl border border-slate-200 bg-white p-5">Loading timesheets…</div> : filtered.length === 0 ? <div className="rounded-2xl border border-slate-200 bg-white p-5">No timesheets yet.</div> : filtered.map((t)=>{const id=t.id||t.timesheet_id||t.entry_id; const open=selectedDetails[id]; return <article key={id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold text-slate-950">{t.worker_name || "Worker"}</p><p className="text-sm text-slate-700">{t.worker_email || "-"}</p><p className="text-xs text-slate-600">Period: {t.pay_period || "-"} • Created: {t.created_at || t.submitted_at || "-"}</p></div><span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusTone(t.status)}`}>{t.status || "pending"}</span></div><div className="mt-2 text-sm text-slate-800">Hours: {t.total_hours ?? t.net_hours ?? 0} • Approved: {t.approved_hours ?? 0} • Gross: {t.gross_pay ?? "-"}</div><p className="mt-1 text-sm text-slate-700">{t.notes || "No notes."}</p><div className="mt-3 flex flex-wrap gap-2"><button disabled={!!busy[id+"approve"]} onClick={()=>mutate(id,"approve")} className="cx-button-primary">Approve</button><button disabled={!!busy[id+"reject"]} onClick={()=>mutate(id,"reject")} className="cx-button-secondary">Reject</button><button onClick={()=>setSelectedDetails((s)=>({...s,[id]:!s[id]}))} className="cx-button-secondary">{open?"Hide":"View"} details</button></div>{open ? <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">{t.daily_breakdown || t.entries ? <pre className="overflow-x-auto text-xs">{JSON.stringify(t.daily_breakdown || t.entries, null, 2)}</pre> : "No detailed entries recorded."}<p className="mt-2">Approved by: {t.approved_by || "-"} at {t.approved_at || "-"}</p><p>Rejection reason: {t.rejection_reason || "-"}</p></div> : null}</article>;})}</section>
  </div></Layout>;
}
