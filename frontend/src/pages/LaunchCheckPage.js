import React, { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useApi } from "../hooks/useApi";
import { Button } from "../components/ui/button";

const checklist = ["login","Smart Hub","create client","create job","assign worker","worker job flow","quote","invoice","follow-ups","automation","payroll/timesheets","customer portal"];

export default function LaunchCheckPage(){
  const { get } = useApi();
  const [data,setData] = useState(null);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState("");
  const load = useCallback(async()=>{
    setLoading(true); setError("");
    const res = await get('/launch-check');
    if(res?.success){ setData(res); } else { setError(res?.error || 'Failed to load launch check'); }
    setLoading(false);
  },[get]);
  useEffect(()=>{load();},[load]);
  return <div className="min-h-screen bg-slate-950 text-white p-4 md:p-6"><div className="mx-auto max-w-5xl space-y-4"><div className="rounded-3xl border border-white/10 bg-white/5 p-5"><div className="flex items-center justify-between"><h1 className="text-3xl font-black">Launch Check</h1><Button onClick={load}><RefreshCw className={`h-4 w-4 mr-2 ${loading?'animate-spin':''}`} />Refresh</Button></div></div>{error?<div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4">{error}</div>:null}{loading?<div>Loading…</div>:null}{data?.checks?<div className="grid md:grid-cols-3 gap-3">{data.checks.map((c)=><div key={c.key} className={`rounded-2xl p-4 border ${c.pass?'border-emerald-300/30 bg-emerald-500/10':'border-amber-300/30 bg-amber-500/10'}`}><p className="font-bold">{c.label}</p><p className="text-sm">{c.pass?'PASS':'CHECK'}</p></div>)}</div>:null}{data?.data?<div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">{Object.entries(data.data).map(([k,v])=><div key={k} className="flex justify-between border-b border-white/10 py-1"><span>{k}</span><span>{String(v)}</span></div>)}</div>:null}<div className="rounded-2xl border border-white/10 bg-white/5 p-4"><h2 className="font-black mb-2">What to test next</h2><ul className="grid md:grid-cols-2 gap-1 text-sm">{checklist.map((c)=><li key={c}>• {c}</li>)}</ul></div></div></div>
}
