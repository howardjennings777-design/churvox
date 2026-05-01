import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { useApi } from "../hooks/useApi";

const asList = (payload, key) => Array.isArray(payload) ? payload : Array.isArray(payload?.[key]) ? payload[key] : Array.isArray(payload?.data) ? payload.data : Array.isArray(payload?.data?.[key]) ? payload.data[key] : [];
const rid = (x) => x?.id || x?._id || "";
const s = (x) => String(x?.status || x?.state || x?.outcome || "queued").toLowerCase();

export default function AutomationRunsPage() {
  const { get, post } = useApi();
  const [runs, setRuns] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const [search, setSearch] = useState(""); const [statusFilter, setStatusFilter] = useState("all");

  const load = useCallback(async ()=>{ setLoading(true); setError(""); const res = await get("/automation/runs?limit=100"); if (!res?.success) setError(res?.error||"Could not load runs."); setRuns(asList(res?.data,"runs")); setLoading(false); }, [get]);
  useEffect(()=>{ load(); }, [load]);

  const filtered = useMemo(()=>runs.filter((r)=>{
    const okStatus = statusFilter === "all" ? true : s(r) === statusFilter;
    const t = `${r.rule_name||""} ${r.trigger||""} ${s(r)} ${r.entity_type||""}`.toLowerCase();
    return okStatus && t.includes(search.toLowerCase());
  }), [runs, search, statusFilter]);

  const counts = useMemo(()=>({total:runs.length,completed:runs.filter(x=>s(x)==="completed").length,failed:runs.filter(x=>s(x)==="failed").length,queued:runs.filter(x=>s(x)==="queued").length,retried:runs.filter(x=>!!x.retry_of_run_id).length}),[runs]);

  const retry = async (runId) => {
    if (!window.confirm("Queue a safe retry for this automation run?")) return;
    const res = await post(`/automation/runs/${runId}/retry`, {});
    if (!res?.success) return setError(res?.error || "Retry failed.");
    await load();
  };

  return <Layout><div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-4">
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex justify-between flex-wrap gap-2"><div><h1 className="text-3xl font-black text-slate-950">Automation Runs</h1><p className="text-slate-700">Review what automation rules attempted and what needs attention.</p></div><div className="flex gap-2"><button onClick={load} className="rounded-xl bg-blue-600 px-4 py-2 text-white font-bold">Refresh</button><Link to="/automation" className="rounded-xl border border-slate-300 px-4 py-2 text-slate-900 font-bold">Back to Automation</Link></div></div></div>
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">{Object.entries({"Total runs":counts.total,Completed:counts.completed,Failed:counts.failed,Queued:counts.queued,Retried:counts.retried}).map(([k,v])=><div key={k} className="rounded-2xl border border-slate-200 bg-white p-3"><p className="text-sm text-slate-700">{k}</p><p className="text-2xl font-black text-slate-950">{v}</p></div>)}</div>
    <div className="rounded-2xl border border-slate-200 bg-white p-3 flex gap-2 flex-wrap"><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search by rule/status/entity" className="flex-1 min-w-[240px] rounded-xl border border-slate-300 px-3 py-2 text-slate-900"/><select value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 text-slate-900"><option value="all">all</option><option value="completed">completed</option><option value="failed">failed</option><option value="queued">queued</option><option value="skipped">skipped</option></select></div>
    {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-red-700 font-semibold">{error}</div>}
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">{loading ? <p className="text-slate-700">Loading automation runs…</p> : filtered.length===0 ? <p className="text-slate-700">No runs yet.</p> : <div className="space-y-3">{filtered.map((r)=><details key={rid(r)} className="rounded-2xl border border-slate-200 p-3"><summary className="cursor-pointer"><span className="font-bold text-slate-950">{r.rule_name||r.template_key||"Rule"}</span> <span className="text-xs text-slate-700">{r.trigger||"-"} · {s(r)}</span></summary><div className="mt-2 text-sm text-slate-800 space-y-1"><p>Started: {r.started_at ? new Date(r.started_at).toLocaleString() : "-"}</p><p>Duration: {r.started_at && r.finished_at ? `${new Date(r.finished_at).getTime()-new Date(r.started_at).getTime()}ms` : "-"}</p><p>Action count: {(r.results||[]).length}</p><p>Entity: {r.job_id?`job:${r.job_id}`:r.quote_id?`quote:${r.quote_id}`:r.invoice_id?`invoice:${r.invoice_id}`:r.notification_id?`notification:${r.notification_id}`:"-"}</p>{r.error&&<p className="text-red-700">Error: {r.error}</p>}{s(r)==="failed"&&<button onClick={()=>retry(rid(r))} className="rounded-xl border border-amber-300 px-3 py-1.5 text-amber-800 font-semibold">Queue safe retry</button>}</div></details>)}</div>}</div>
  </div></Layout>;
}
