import React, { useEffect, useMemo, useState } from "react";
import { Camera, CheckCircle2, Clock, Home, LogOut, MapPinned, Navigation, RefreshCw, ShieldCheck, StickyNote, Timer, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { get, post } from "../../lib/api";
import "../styles/v4.css";
import "../styles/v4-worker.css";

const lower = (v) => String(v || "").toLowerCase();
const list = (payload) => Array.isArray(payload?.data) ? payload.data : Array.isArray(payload?.data?.jobs) ? payload.data.jobs : Array.isArray(payload?.jobs) ? payload.jobs : Array.isArray(payload) ? payload : [];
const idOf = (j) => j?.id || j?._id || j?.job_id;
const titleOf = (j) => j?.title || j?.job_title || j?.service_type || j?.service || "Job";
const clientOf = (j) => j?.client_name || j?.customer_name || j?.client?.name || j?.customer?.name || "Client not set";
const addressOf = (j) => j?.address || j?.site_address || j?.job_address || j?.property_address || j?.location || "Address not set";
const statusOf = (j) => lower(j?.status || j?.job_status || "assigned").replace(/\s+/g,"_");
function when(j){ const d = new Date(j?.scheduled_at || j?.scheduledAt || j?.start_time || j?.due_date || j?.created_at || ""); return Number.isNaN(d.getTime()) ? "Today" : d.toLocaleString([], { weekday:"short", month:"short", day:"numeric", hour:"numeric", minute:"2-digit" }); }
function mapUrl(address){ return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`; }
function label(s){ return {assigned:"Assigned",acknowledged:"Acknowledged",on_the_way:"On the way",in_progress:"In progress",paused:"Paused",completed:"Completed"}[s] || s || "Assigned"; }
function cls(s){ if(s==="completed")return"good"; if(s==="in_progress")return"blue"; if(s==="paused")return"warn"; return"neutral"; }

function Detail({ job, onClose, onAction, busy }){
  if(!job)return null;
  const s=statusOf(job);
  const id=idOf(job);
  return <div className="v4-modal-backdrop" onClick={onClose}><section className="v4-modal v4-worker-modal" onClick={(e)=>e.stopPropagation()}><header className="v4-modal-head"><div><span>Worker job</span><h2>{titleOf(job)}</h2></div><button onClick={onClose}><X size={18}/></button></header><div className="v4-worker-job-meta"><div><small>Client</small><b>{clientOf(job)}</b></div><div><small>When</small><b>{when(job)}</b></div><div><small>Status</small><b>{label(s)}</b></div></div><div className="v4-worker-address"><MapPinned size={22}/><div><small>Site</small><b>{addressOf(job)}</b></div></div><p className="v4-modal-copy">{job?.instructions || job?.description || job?.scope || job?.notes || "No instructions added yet."}</p><footer className="v4-worker-actions"><a className="v4-btn secondary" href={mapUrl(addressOf(job))} target="_blank" rel="noreferrer"><Navigation size={18}/> Navigate</a>{s==="assigned"?<button className="v4-btn secondary" disabled={busy} onClick={()=>onAction(job,"acknowledge")}><ShieldCheck size={18}/> Acknowledge</button>:null}{["assigned","acknowledged","on_the_way","paused"].includes(s)?<button className="v4-btn primary" disabled={busy} onClick={()=>onAction(job,s==="paused"?"resume":"start")}><Timer size={18}/> {s==="paused"?"Resume":"Start"}</button>:null}{s==="in_progress"?<button className="v4-btn secondary" disabled={busy} onClick={()=>onAction(job,"pause")}><Clock size={18}/> Pause</button>:null}{s!=="completed"?<button className="v4-btn dark" disabled={busy} onClick={()=>onAction(job,"complete")}><CheckCircle2 size={18}/> Complete</button>:null}<button className="v4-btn secondary" disabled><Camera size={18}/> Photos</button><button className="v4-btn secondary" disabled><StickyNote size={18}/> Note</button></footer></section></div>;
}

export default function V4WorkerPage(){
  const navigate=useNavigate();
  const { user, logout } = useAuth();
  const [jobs,setJobs]=useState([]); const [loading,setLoading]=useState(true); const [notice,setNotice]=useState(""); const [selected,setSelected]=useState(null); const [busy,setBusy]=useState(false);
  async function load(){ setLoading(true); const res=await get("/worker/jobs"); const items=list(res); if(!items.length){ const fallback=await get("/jobs"); setJobs(list(fallback)); } else setJobs(items); setLoading(false); }
  useEffect(()=>{load();},[]);
  const active=useMemo(()=>jobs.filter(j=>!["completed","cancelled"].includes(statusOf(j))),[jobs]);
  const completed=useMemo(()=>jobs.filter(j=>statusOf(j)==="completed"),[jobs]);
  const next=active[0];
  async function action(job, actionName){ const id=idOf(job); if(!id)return; setBusy(true); setNotice("Saving worker action…"); const status={acknowledge:"acknowledged",start:"in_progress",resume:"in_progress",pause:"paused",complete:"completed"}[actionName]; const paths=[`/jobs/${id}/${actionName}`,`/worker/jobs/${id}/${actionName}`,`/jobs/${id}/status`]; let ok=false; for(const p of paths){ const r=await post(p,{status,action:actionName,source:"v4_worker",timestamp:new Date().toISOString()}); if(r.ok){ok=true;break;} } setNotice(ok?"Saved. Office can see the update.":"Could not save yet. Try again."); await load(); setBusy(false); if(ok && actionName==="complete") setSelected(null); }
  async function signOut(){ await logout(); navigate("/login",{replace:true}); }
  return <main className="v4-worker"><header className="v4-worker-hero"><div><span>Churvox Worker</span><h1>Field app, same premium system.</h1><p>See the next job, navigate, start, pause, complete and keep the office updated without owner clutter.</p></div><button onClick={signOut}><LogOut size={18}/> Log out</button></header>{notice?<div className="v4-worker-notice">{notice}</div>:null}<section className="v4-worker-grid"><article className="v4-worker-next"><small>Next job</small>{loading?<b>Loading…</b>:next?<><b>{titleOf(next)}</b><span>{clientOf(next)} · {when(next)}</span><button className="v4-btn primary" onClick={()=>setSelected(next)}>Open job</button></>:<><b>No active jobs</b><span>Assigned jobs will appear here.</span></>}</article><article><small>Today</small><b>{active.length}</b><span>Active jobs</span></article><article><small>Completed</small><b>{completed.length}</b><span>Finished jobs</span></article></section><section className="v4-worker-list"><div><h2>Jobs</h2><button onClick={load}><RefreshCw size={16}/> Refresh</button></div>{jobs.length?jobs.map(j=><button key={idOf(j)||titleOf(j)} onClick={()=>setSelected(j)}><div><b>{titleOf(j)}</b><span>{clientOf(j)} · {addressOf(j)}</span></div><span className={`v4-status ${cls(statusOf(j))}`}>{label(statusOf(j))}</span></button>):<div className="v4-empty"><Home size={28}/><b>No jobs loaded</b><span>Refresh or check assigned work.</span></div>}</section><nav className="v4-worker-dock"><button onClick={()=>setSelected(next)} disabled={!next}>Next Job</button><button onClick={load}>Refresh</button><button onClick={signOut}>Log out</button></nav><Detail job={selected} onClose={()=>setSelected(null)} onAction={action} busy={busy}/></main>;
}
