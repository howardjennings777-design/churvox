import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";

const groups = {"Auth":["Login","Logout","Signup","Forgot/reset password"],"Jobs":["Jobs page loads","Create job","Open job detail","Assign worker","Complete job"],"Clients":["Clients page loads","Create client","Open client detail"],"Quotes":["Quotes page loads","Create quote","Open quote detail","Public quote link"],"Invoices":["Invoices page loads","Create invoice","Open invoice detail","Public invoice link","Delete/clear invoice"],"Team":["Invite worker","Update role","Remove worker"],"Worker":["Worker login","Worker jobs","Worker job detail","Photo upload if installed"],"Payroll":["Timesheets","Payroll summaries if installed"],"Smart Hub":["Sidebar visible","AI assistant works","Summary cards readable"],"Automation":["Rules page","Runs page","Template create"],"Reports":["Reports page","CSV export"],"SMS":["SMS page","Draft/send confirm flow"],"MYOB":["Integration panel","Internal invoice still works with MYOB off"],"Mobile":["bottom nav","taps","cards","forms"],"Deploy":["frontend build","backend compile","Render auto-deploy"]};
const KEY="churvox.launch.check.v1";
const routeMap = {
  "Jobs page loads": "/jobs", "Create job": "/jobs/new", "Clients page loads": "/clients", "Quotes page loads": "/quotes", "Create quote": "/quotes/new", "Invoices page loads": "/invoices", "Create invoice": "/invoices/new", "Team": "/team", "Worker jobs": "/worker/jobs", "Timesheets": "/timesheets", "Sidebar visible": "/smart-hub", "Rules page": "/automation", "Runs page": "/automation/runs", "Reports page": "/reports", "SMS page": "/sms", "Integration panel": "/integrations", "Settings": "/settings", "Plans": "/plans"
};

export default function LaunchCheckPage(){
  const [checks,setChecks]=useState(()=>{try{return JSON.parse(localStorage.getItem(KEY)||"{}");}catch{return {}}});
  const commit=(next)=>{setChecks(next);localStorage.setItem(KEY,JSON.stringify(next));};
  const total = useMemo(()=>Object.values(groups).reduce((a,b)=>a+b.length,0),[]);
  const done = Object.values(checks).filter(Boolean).length;
  const pct = Math.round((done/Math.max(total,1))*100);
  const toggle=(id)=>commit({...checks,[id]:!checks[id]});
  const reset=()=>commit({});
  const summary=`Launch checklist: ${done}/${total} complete (${pct}%).`;
  const copy=()=>navigator.clipboard.writeText(summary);
  return <Layout><div className="cx-page space-y-4"><h1 className="text-3xl font-black text-slate-950">Launch Check</h1><p className="text-slate-700">{summary}</p>
  <div className="h-3 w-full rounded-full bg-slate-200 overflow-hidden"><div className="h-full bg-blue-600" style={{width:`${pct}%`}} /></div>
  <div className="flex gap-2"><button onClick={reset} className="rounded-xl bg-white border border-slate-200 px-4 py-2 font-black text-slate-900">Reset checklist</button><button onClick={copy} className="rounded-xl bg-blue-600 px-4 py-2 font-black text-white">Copy test summary</button></div>
  {Object.entries(groups).map(([group,items])=><div key={group} className="rounded-2xl border border-slate-200 bg-white p-4"><h2 className="text-xl font-black text-slate-950">{group}</h2><div className="mt-2 grid md:grid-cols-2 gap-2">{items.map((item)=>{const id=`${group}:${item}`;const route=routeMap[item]||routeMap[group];return <div key={id} className="flex items-center justify-between gap-2"><label className="flex gap-2 text-slate-800"><input type="checkbox" checked={!!checks[id]} onChange={()=>toggle(id)} />{item}</label>{route && <Link to={route} className="text-xs font-semibold text-blue-700">Open</Link>}</div>;})}</div></div>)}
  </div></Layout>;
}
