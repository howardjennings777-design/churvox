import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { get, post } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import "../styles/smartHubExact.css";

const arr = (v) => Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : Array.isArray(v?.items) ? v.items : Array.isArray(v?.results) ? v.results : Array.isArray(v?.actions) ? v.actions : [];
const lc = (v) => String(v || "").toLowerCase();
const dollars = (v) => `$${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const getId = (x) => x?.id || x?._id || x?.job_id || x?.invoice_id || x?.quote_id || x?.email;
const customer = (x) => x?.client_name || x?.customer_name || x?.client || x?.business_name || "Client";
const hasWorker = (j) => Boolean(j?.worker_id || j?.assigned_worker_id || j?.assigned_worker_name || j?.worker_name || j?.assigned_worker);
const workerName = (j) => j?.assigned_worker_name || j?.worker_name || j?.assigned_worker || "Unassigned";
const emb = (r) => r.includes("embedded=") ? r : `${r}${r.includes("?") ? "&" : "?"}embedded=1`;

const demoJobs = [
  { job_number: "J-1056", client_name: "Smith Residence", customer_name: "Sarah Smith", worker_name: "Jake R.", status: "In Progress", region: "Northbridge", scheduled_time: "Today 2:30pm", next_step: "Install air con unit" },
  { job_number: "J-1047", client_name: "Wilson Plumbing", customer_name: "Matt Wilson", status: "Needs Crew", region: "Fremantle", scheduled_time: "Today 11:00am", next_step: "Assign technician" },
  { job_number: "J-1042", client_name: "Taylor Electrical", customer_name: "Lisa Taylor", worker_name: "Levi B.", status: "Scheduled", region: "Osborne Park", scheduled_time: "Tomorrow 9:00am", next_step: "Check progress" },
  { job_number: "J-1038", client_name: "Brown Renovation", customer_name: "Daniel Brown", worker_name: "Mia L.", status: "In Progress", region: "South Perth", scheduled_time: "Today 4:00pm", next_step: "Plastering stage" },
  { job_number: "J-1031", client_name: "Davis Property", customer_name: "Chris Davis", worker_name: "Chris D.", status: "Completed", region: "Cottesloe", scheduled_time: "Today 8:45am", next_step: "Invoice sent" }
];

const navItems = [["AI Control Room","/dashboard"],["Jobs","/jobs"],["Clients","/clients"],["Quotes","/quotes"],["Invoices","/invoices"],["Dispatch","/dispatch"],["Team","/team"],["Automation","/automation"],["Settings","/settings"]];
const workspaces = [["Jobs","View and manage","/jobs?embedded=1"],["Clients","Manage contacts","/clients?embedded=1"],["Quotes","Create and send","/quotes?embedded=1"],["Invoices","Create and send","/invoices?embedded=1"],["Dispatch","Assign and track","/dispatch?embedded=1"],["Team","Manage team","/team?embedded=1"],["Automation","Rules and alerts","/automation?embedded=1"],["Reports","Business insights","/reports?embedded=1"]];

export default function SmartHubExactPage() {
  const navigate = useNavigate();
  const { user } = useAuth() || {};
  const [data, setData] = useState({ jobs: [], invoices: [], quotes: [], workers: [], approvals: [], sms: null });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  const ownerName = user?.name || user?.first_name || "Alex";
  const businessName = user?.business_name || "Thompson Trade Services";

  const load = useCallback(async () => {
    setLoading(true);
    const [jobs, invoices, quotes, workers, approvals, sms] = await Promise.all([
      get("/jobs").catch(() => null), get("/invoices").catch(() => null), get("/quotes").catch(() => null),
      get("/team/workers").catch(() => null), get("/ai-operator/actions").catch(() => get("/command-hub/actions").catch(() => null)), get("/sms/balance").catch(() => null)
    ]);
    setData({ jobs: arr(jobs), invoices: arr(invoices), quotes: arr(quotes), workers: arr(workers), approvals: arr(approvals?.data?.actions || approvals), sms: sms?.data || sms || null });
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const v = useMemo(() => {
    const active = data.jobs.filter(j => !["completed","cancelled","closed","done"].includes(lc(j.status)));
    const crew = active.filter(j => !hasWorker(j));
    const complete = data.jobs.filter(j => ["completed","done"].includes(lc(j.status)));
    const invoices = data.invoices.filter(i => ["open","sent","overdue","unpaid","pending","pending_payment","draft"].includes(lc(i.status)));
    const quotes = data.quotes.filter(q => ["sent","pending","draft"].includes(lc(q.status)));
    const amount = invoices.reduce((t,i) => t + Number(i.balance_due || i.balance || i.total || i.amount || 0), 0);
    return { active, crew, complete, invoices, quotes, followups: [...invoices, ...quotes], amount };
  }, [data]);

  const smsCredits = Number(data.sms?.credits ?? data.sms?.balance ?? 12540);
  const smsPercent = Math.max(8, Math.min(100, Math.round((smsCredits / 16000) * 100)));
  const boardJobs = v.active.length ? v.active.slice(0, 5) : demoJobs;
  const openWorkspace = (title, route) => setWorkspace({ title, route: emb(route) });
  const runAi = async () => { await post("/smart-hub/scan", {}).catch(() => null); load(); };

  return <Layout smartHubMode><main className="shx-shell">
    <aside className="shx-sidebar"><button className="shx-logo" onClick={() => navigate("/dashboard")}><span>C</span><b>CHURVOX</b></button><nav>{navItems.map(([label, route], i) => <button key={label} className={i === 0 ? "active" : ""} onClick={() => navigate(route)}><i>{iconFor(label)}</i>{label}</button>)}</nav><div className="shx-side-sms"><strong>{smsCredits.toLocaleString()}</strong><span>SMS Credits</span><div><em style={{ width: `${smsPercent}%` }} /></div><small>{smsPercent}% remaining</small><button onClick={() => openWorkspace("SMS Credits", "/sms?embedded=1")}>Buy Credits</button></div><div className="shx-owner"><div className="avatar">{String(ownerName).slice(0,1).toUpperCase()}</div><b>{ownerName}</b><span>Owner</span><small>Online</small></div></aside>
    <section className="shx-main"><header className="shx-hero"><div className="shx-greeting"><p>Good morning, {ownerName.split(" ")[0]}</p><h1>AI Control Room</h1><span>Your AI co-pilot is ready. Here's what needs your attention today.</span><div className="ready"><i /> AI Readiness <b>High</b></div></div><div className="shx-actions"><p>What would you like to do?</p><button className="primary" onClick={runAi}><i>+</i><b>Run AI Plan</b><span>arrow</span></button><button onClick={() => setModal({ title: "Review approvals", route: "/ai-operator/approvals?embedded=1" })}><i>check</i><b>Review approvals</b><em>{data.approvals.length || 8}</em></button><button onClick={() => navigate("/ai-operator/settings")}><i>gear</i><b>Operator settings</b><span>arrow</span></button></div><div className="shx-live"><div className="title"><i /> Live Control Centre <b>{businessName}</b></div><small>All systems operational</small><Metric label="Jobs in progress" value={v.active.length || 23} tone="blue"/><Metric label="Jobs needing crew" value={v.crew.length || 6} tone="orange"/><Metric label="Approvals" value={data.approvals.length || 8} tone="blue"/><Metric label="Money waiting" value={dollars(v.amount || 6820)} tone="green"/></div></header>{loading ? <div className="shx-loading">Loading live Churvox data...</div> : null}<section className="shx-grid-top"><PriorityCard data={data} v={v} setModal={setModal}/><Board jobs={boardJobs} v={v} openWorkspace={openWorkspace}/><RightStack v={v} smsCredits={smsCredits} smsPercent={smsPercent} openWorkspace={openWorkspace}/></section><section className="shx-bottom"><Recommendations/><WorkspaceCard openWorkspace={openWorkspace}/></section></section>
    <ActionModal modal={modal} close={() => setModal(null)} openWorkspace={openWorkspace}/><WorkspaceModal workspace={workspace} close={() => setWorkspace(null)}/>
  </main></Layout>;
}

function iconFor(label){ return {"AI Control Room":"gear",Jobs:"box",Clients:"users",Quotes:"file",Invoices:"bill",Dispatch:"nodes",Team:"team",Automation:"bolt",Settings:"gear"}[label] || "dot"; }
function Metric({ label, value, tone }) { return <button className="live-row"><span>{label}</span><b className={tone}>{value}</b><i>chev</i></button>; }
function PriorityCard({data,v,setModal}){return <article className="shx-card priority"><div className="card-head"><h2><i>flag</i>Priority Queue</h2><b>7</b></div><Priority title="Approval needed" text={`${data.approvals.length || 4} quotes over $5,000`} time="2m"/><Priority title="Jobs need crew" text={`${v.crew.length || 6} jobs unassigned`} time="15m"/><Priority title="Follow-up due" text={`${v.followups.length || 12} messages pending`} time="35m"/><Priority title="Invoices overdue" text={`${v.invoices.length || 5} invoices - ${dollars(v.amount || 4250)}`} time="1h" blue/><Priority title="Proofs to review" text={`${v.complete.length || 3} submissions`} time="2h" blue/><button className="link" onClick={()=>setModal({title:"Priority Queue",route:"/ai-operator/approvals?embedded=1"})}>View all priorities arrow</button></article>}
function Priority({title,text,time,blue}){return <button className="priority-row"><i className={blue?"blue":""}>dot</i><span><b>{title}</b><small>{text}</small></span><em>{time}</em></button>}
function Board({jobs,v,openWorkspace}){return <article className="shx-card board"><div className="card-head"><h2><i>wave</i>Live Jobs Board</h2><button onClick={()=>openWorkspace("Jobs","/jobs?embedded=1")}>View all jobs arrow</button></div><div className="board-stats"><span><b>{v.active.length || 23}</b>In Progress</span><span><b>{v.crew.length || 6}</b>Needs Crew</span><span><b>4</b>Tomorrow</span><span><b>{v.complete.length || 8}</b>Completed Today</span></div><div className="job-table"><div className="head"><span>Job</span><span>Client</span><span>Status</span><span>Next Step</span><span>ETA</span></div>{jobs.map((j,ix)=><button key={getId(j)||ix} className="row" onClick={()=>openWorkspace(j.job_number||"Job",getId(j)?`/jobs/${getId(j)}?embedded=1`:"/jobs?embedded=1")}><span><b>{j.job_number||`J-${1056-ix}`}</b><small>{j.region||"Local"}</small></span><span><b>{customer(j)}</b><small>{j.customer_name||workerName(j)}</small></span><span><em className={statusClass(j.status)}>{j.status||"In Progress"}</em></span><span>{j.next_step||(hasWorker(j)?"Check progress":"Assign technician")}</span><span>{j.scheduled_time||"Today"}</span></button>)}</div><button className="dispatch-link" onClick={()=>openWorkspace("Dispatch","/dispatch?embedded=1")}>Open dispatch board arrow</button></article>}
function RightStack({v,smsCredits,smsPercent,openWorkspace}){return <aside className="shx-right-stack"><Small title="Cash Flow" value={dollars(v.amount || 6820)} text={`${v.invoices.length || 8} invoices to chase`} action="View"/><Small title="Proofs Pending" value={String(v.complete.length || 3)} text="submissions waiting review" action="View proofs" ring/><Small title="Follow-ups" value={String(v.followups.length || 12)} text="Client replies awaiting your response" action="Open inbox"/><div className="sms-big"><em>HOT</em><h3>SMS Credits</h3><strong>{smsCredits.toLocaleString()}</strong><p>credits remaining</p><div className="gauge"><b>{smsPercent}%</b><span>remaining</span></div><button onClick={()=>openWorkspace("SMS Credits","/sms?embedded=1")}>Buy SMS Credits arrow</button></div></aside>}
function Small({title,value,text,action,ring}){return <button className="small-card"><h3>{title}</h3><strong>{value}</strong><p>{text}</p>{ring?<i className="ring">{value}</i>:<i className="spark"/>}<b>{action} arrow</b></button>}
function Recommendations(){return <article className="shx-card recommend"><div className="card-head"><h2><i>spark</i>AI Recommendations</h2></div><p>Smart actions tailored for your business</p><div className="rec-grid"><Rec title="Rebalance workloads" text="3 techs are at 92%+ capacity this week." tone="orange"/><Rec title="Chase high-value invoices" text="8 invoices over $2,000 are overdue." tone="green"/><Rec title="Fill tomorrow's gaps" text="4 job slots open for tomorrow. Consider rescheduling." tone="blue"/></div><button className="link">View all recommendations arrow</button></article>}
function Rec({title,text,tone}){return <button className={`rec ${tone}`}><i>icon</i><b>{title}</b><small>{text}</small><span>Review</span></button>}
function WorkspaceCard({openWorkspace}){return <article className="shx-card workspace"><div className="card-head"><h2><i>grid</i>Owner Workspaces</h2></div><p>Jump into the tools you use most</p><div className="workspace-grid">{workspaces.map(([label,text,route])=><button key={label} onClick={()=>openWorkspace(label,route)}><i>{label.slice(0,1)}</i><b>{label}</b><small>{text}</small></button>)}</div></article>}
function statusClass(status){const s=lc(status); if(s.includes("crew"))return"needs"; if(s.includes("complete"))return"done"; if(s.includes("schedule"))return"scheduled"; return"progress";}
function ActionModal({modal,close,openWorkspace}){const [draft,setDraft]=useState(""); useEffect(()=>{if(modal)setDraft("AI has prepared this action. Review, edit, then open the real workspace to apply it.")},[modal]); if(!modal)return null; return <div className="shx-backdrop" onClick={close}><div className="shx-modal" onClick={e=>e.stopPropagation()}><div><h2>{modal.title}</h2><button onClick={close}>x</button></div><label>Editable owner action</label><textarea value={draft} onChange={e=>setDraft(e.target.value)}/><footer><button onClick={()=>setDraft("AI has prepared this action. Review, edit, then open the real workspace to apply it.")}>Prepare draft</button><button onClick={()=>openWorkspace(modal.title,modal.route)}>Open workspace</button><button onClick={close}>Close</button></footer></div></div>}
function WorkspaceModal({workspace,close}){if(!workspace)return null; return <div className="shx-backdrop" onClick={close}><div className="shx-workspace-modal" onClick={e=>e.stopPropagation()}><header><h2>{workspace.title}</h2><button onClick={close}>x</button></header><iframe title={workspace.title} src={workspace.route}/></div></div>}
