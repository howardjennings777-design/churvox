import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { useApi } from "../hooks/useApi";

export default function RoutePlannerPage() {
  const api = useApi();
  const [date, setDate] = useState(""); const [workerId, setWorkerId] = useState(""); const [jobs, setJobs] = useState([]);
  const load = () => api.get(`/route-planner/day?date=${date}&worker_id=${workerId}`).then((r)=>r.success&&setJobs(r.data?.data?.jobs||[]));
  useEffect(() => { if (date || workerId) load(); }, [date, workerId]);
  const move = (i,d) => { const n=[...jobs]; const j=n[i]; n.splice(i,1); n.splice(i+d,0,j); setJobs(n); };
  return <Layout><div className="cx-page"><div className="rounded-3xl border bg-white p-6 shadow-sm"><h1 className="text-2xl font-black text-slate-950">Route Planner</h1><p className="text-slate-700">Plan a worker’s job order for the day.</p><p className="mt-2 text-sm text-slate-700">Advanced route optimisation is not configured. Manual ordering is available.</p><div className="mt-4 grid gap-2 md:grid-cols-3"><input type="date" className="rounded-xl border p-2" value={date} onChange={(e)=>setDate(e.target.value)}/><input className="rounded-xl border p-2" placeholder="Worker ID" value={workerId} onChange={(e)=>setWorkerId(e.target.value)}/><button className="rounded-xl bg-blue-600 px-3 py-2 font-bold text-white" onClick={()=>api.post('/route-planner/sequence',{date,worker_id:workerId,jobs})}>Save sequence</button></div>{jobs.map((j,i)=><div key={j.id || j._id} className="mt-3 rounded-2xl border p-3"><p className="font-bold">{j.title}</p><p className="text-sm text-slate-700">{j.customer_name} • {j.address} • {j.scheduled_date} • {j.status}</p><button className="mr-2 rounded border px-2 py-1 text-xs" disabled={i===0} onClick={()=>move(i,-1)}>Move up</button><button className="rounded border px-2 py-1 text-xs" disabled={i===jobs.length-1} onClick={()=>move(i,1)}>Move down</button></div>)}</div></div></Layout>;
}
