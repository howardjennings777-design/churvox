import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { useApi } from "../hooks/useApi";
export default function SystemHealthPage(){const api=useApi(); const [s,setS]=useState({}); const [events,setEvents]=useState([]);
const load=()=>{api.get('/system-health/summary').then(r=>r.success&&setS(r.data?.data||{})); api.get('/system-health/events').then(r=>r.success&&setEvents(r.data?.data||[]));}; useEffect(load,[]);
return <Layout><div className="cx-page"><div className="rounded-3xl border bg-white p-6 shadow-sm"><h1 className="text-2xl font-black text-slate-950">System Health</h1><p className="text-slate-700">Check app, integration, and automation health.</p><button className="mt-2 rounded-xl bg-blue-600 px-3 py-2 text-white" onClick={load}>Refresh</button><pre className="mt-3 rounded-xl border p-3 text-xs">{JSON.stringify(s,null,2)}</pre><div className="mt-3">{events.map((e,idx)=><div key={idx} className="rounded-xl border p-2 text-sm">{e.message || e.type}</div>)}</div></div></div></Layout>;}
