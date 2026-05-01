import React, { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import { useApi } from "../hooks/useApi";

const TABS = ["today", "tomorrow", "week", "all"];
const COLUMNS = ["unassigned", "scheduled", "in_progress", "paused", "completed", "overdue"];

export default function DispatchBoardPage() {
  const api = useApi();
  const [jobs, setJobs] = useState([]);
  const [filters, setFilters] = useState({ tab: "today", worker: "", status: "", date: "" });
  useEffect(() => { api.get("/dispatch/summary").then((r) => r.success && setJobs(r.data?.data?.jobs || [])); }, []);
  const filtered = useMemo(() => jobs.filter((j) => (!filters.worker || (j.assigned_worker || "") === filters.worker) && (!filters.status || (j.status || "") === filters.status)), [jobs, filters]);
  const byCol = (col) => filtered.filter((j) => (j.dispatch_status || j.status || "unassigned") === col);
  return <Layout><div className="cx-page"><div className="rounded-3xl border bg-white p-6 shadow-sm"><h1 className="text-2xl font-black text-slate-950">Dispatch Board</h1><p className="text-slate-700">Assign, schedule, and track field work from one board.</p>
    <div className="mt-4 flex flex-wrap gap-2">{TABS.map(t => <button key={t} className="rounded-xl border px-3 py-2 text-sm" onClick={() => setFilters((f) => ({ ...f, tab: t }))}>{t}</button>)}</div>
    <div className="mt-4 grid gap-2 md:grid-cols-3"><input placeholder="Filter worker" className="rounded-xl border p-2" onChange={(e)=>setFilters(f=>({...f,worker:e.target.value}))}/><input placeholder="Filter status" className="rounded-xl border p-2" onChange={(e)=>setFilters(f=>({...f,status:e.target.value}))}/><input type="date" className="rounded-xl border p-2" onChange={(e)=>setFilters(f=>({...f,date:e.target.value}))}/></div>
    <div className="mt-6 grid gap-4 lg:grid-cols-3">{COLUMNS.map((col)=><div key={col} className="rounded-3xl border p-3"><h2 className="font-bold text-slate-900 capitalize">{col.replaceAll("_"," ")}</h2>{byCol(col).length===0?<p className="text-sm text-slate-700">No jobs</p>:byCol(col).map((j)=><div key={j.id || j._id} className="mt-2 rounded-2xl border p-3"><p className="font-bold">{j.title || j.type || "Untitled"}</p><p className="text-sm text-slate-700">{j.customer_name} • {j.address}</p><p className="text-sm text-slate-700">{j.scheduled_date || "Unscheduled"} • {j.assigned_worker_name || "Unassigned"}</p><div className="mt-2 flex gap-2"><select className="rounded border p-1 text-xs" onChange={(e)=>api.post(`/dispatch/jobs/${j.id || j._id}/assign`,{worker_id:e.target.value})}><option>Quick assign</option></select><button className="rounded bg-blue-600 px-2 py-1 text-xs font-bold text-white" onClick={()=>api.post(`/dispatch/jobs/${j.id || j._id}/reschedule`,{scheduled_date:filters.date})}>Reschedule</button><a className="rounded border px-2 py-1 text-xs" href={`/jobs/${j.id || j._id}`}>Open job</a></div><p className="mt-1 text-xs text-amber-700">This worker may already have a job around this time.</p></div>)}</div>)}</div></div></div></Layout>;
}
