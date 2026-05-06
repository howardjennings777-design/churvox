import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { ChurvoxLogo } from "../components/ChurvoxLogo";
import { get, post } from "../lib/api";
import "../styles/aiControlRoomTopPlayer.css";

const list = (v) => Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : Array.isArray(v?.items) ? v.items : Array.isArray(v?.results) ? v.results : Array.isArray(v?.actions) ? v.actions : Array.isArray(v?.messages) ? v.messages : [];
const low = (v) => String(v || "").toLowerCase();
const money = (v) => `$${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const rid = (r) => r?.id || r?._id || r?.job_id || r?.invoice_id || r?.quote_id || r?.email;
const rtitle = (r, f = "Record") => r?.title || r?.job_title || r?.name || r?.client_name || r?.customer_name || r?.description || r?.email || f;
const client = (r) => r?.client_name || r?.customer_name || r?.client || r?.address || r?.email || "Client";
const assigned = (j) => j?.assigned_worker_name || j?.worker_name || j?.assigned_worker || "Unassigned";
const hasWorker = (j) => Boolean(j?.worker_id || j?.assigned_worker_id || j?.assigned_worker || j?.assigned_worker_name || j?.worker_name);
const embed = (route) => route?.includes("embedded=") ? route : `${route || "/dashboard"}${route?.includes("?") ? "&" : "?"}embedded=1`;

const sampleJobs = [
  { job_number: "J-1056", client_name: "Smith Residence", worker_name: "Jake R.", status: "In Progress", region: "Northbridge", scheduled_time: "Today 2:30pm" },
  { job_number: "J-1047", client_name: "Wilson Plumbing", status: "Needs Crew", region: "Fremantle", scheduled_time: "Today 11:00am" },
  { job_number: "J-1042", client_name: "Taylor Electrical", worker_name: "Levi B.", status: "Scheduled", region: "Osborne Park", scheduled_time: "Tomorrow 9:00am" },
  { job_number: "J-1038", client_name: "Brown Renovation", worker_name: "Mia L.", status: "In Progress", region: "South Perth", scheduled_time: "Today 4:00pm" },
  { job_number: "J-1031", client_name: "Davis Property", worker_name: "Chris D.", status: "Completed", region: "Cottesloe", scheduled_time: "Today 8:45am" },
];

const workspaces = [
  ["Jobs", "View and manage all jobs", "/jobs?embedded=1", "▣", "blue"],
  ["Clients", "Manage clients and contacts", "/clients?embedded=1", "♙", "purple"],
  ["Quotes", "Create quotes and follow ups", "/quotes?embedded=1", "▤", "green"],
  ["Invoices", "Create invoices and manage payments", "/invoices?embedded=1", "$", "blue"],
  ["Dispatch", "Assign jobs and plan the day", "/dispatch?embedded=1", "▦", "orange"],
  ["Team", "Invite workers and manage roles", "/team?embedded=1", "♙", "purple"],
  ["Automation", "Rules and alerts to save time", "/automation?embedded=1", "⚙", "green"],
  ["SMS Credits", "Buy SMS Credits", "/sms?embedded=1", "☵", "orange", true],
  ["Settings", "Business setup and integrations", "/settings?embedded=1", "⚙", "slate"],
];

export default function AIControlRoomTopPlayerPage() {
  const navigate = useNavigate();
  const [data, setData] = useState({ jobs: [], invoices: [], quotes: [], workers: [], approvals: [], sms: [] });
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [modal, setModal] = useState(null);
  const [workspace, setWorkspace] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [jobs, invoices, quotes, workers, approvals, sms] = await Promise.all([
      get("/jobs").catch(() => null), get("/invoices").catch(() => null), get("/quotes").catch(() => null),
      get("/team/workers").catch(() => null), get("/ai-operator/actions").catch(() => get("/command-hub/actions").catch(() => null)), get("/sms/history?limit=10").catch(() => null)
    ]);
    setData({ jobs: list(jobs), invoices: list(invoices), quotes: list(quotes), workers: list(workers), approvals: list(approvals?.data?.actions || approvals), sms: list(sms?.data?.messages || sms) });
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const v = useMemo(() => {
    const active = data.jobs.filter(j => !["completed", "cancelled", "closed", "done"].includes(low(j.status)));
    const crew = active.filter(j => !hasWorker(j));
    const proof = data.jobs.filter(j => ["completed", "done"].includes(low(j.status)));
    const invoices = data.invoices.filter(i => ["open", "sent", "overdue", "unpaid", "pending", "pending_payment", "draft"].includes(low(i.status)));
    const quotes = data.quotes.filter(q => ["sent", "pending", "draft"].includes(low(q.status)));
    const cash = invoices.reduce((t, i) => t + Number(i.balance_due || i.balance || i.total || i.amount || 0), 0);
    return { active, crew, proof, invoices, quotes, followups: [...invoices, ...quotes], cash, workers: data.workers.filter(w => low(w.status) !== "inactive") };
  }, [data]);

  const openWorkspace = (title, route) => setWorkspace({ title, route: embed(route) });
  const openAction = (key, title, route) => setModal({ key, title, route: embed(route) });
  const runAi = async () => { setNotice("Refreshing AI plan…"); await post("/smart-hub/scan", {}).catch(() => null); await load(); setNotice("AI plan refreshed. Review the prepared actions or open a workspace."); };

  const stats = [
    ["Approvals", data.approvals.length, "Owner sign-off", "approvals", "/ai-operator/approvals?embedded=1"],
    ["Jobs needing crew", v.crew.length, "Jobs to assign", "crew", "/dispatch?embedded=1"],
    ["Money waiting", money(v.cash), "Invoices to chase", "money", "/invoices?embedded=1"],
    ["Follow-ups", v.followups.length, "Messages to send", "followups", "/sms?embedded=1"],
    ["Proof to review", v.proof.length, "Jobs to review", "proof", "/proof-to-paid?embedded=1"],
  ];

  return <Layout smartHubMode><main className="tp-shell">
    <section className="tp-hero">
      <div className="tp-hero-copy"><ChurvoxLogo size="sm"/><div className="tp-kicker">Good morning</div><h1>AI Control Room</h1><p>Your AI co-pilot is ready. Here’s what needs your attention today.</p><div className="tp-readiness"><span/>AI Readiness <b>High</b></div></div>
      <div className="tp-action-strip"><p>What would you like to do?</p><button className="tp-big-action tp-big-action--primary" onClick={runAi}><span>✦</span><b>Run AI Plan</b><em>→</em></button><button className="tp-big-action" onClick={() => openAction("approvals", "Review approvals", "/ai-operator/approvals?embedded=1")}><span>✓</span><b>Review approvals</b><em>{data.approvals.length}</em></button><button className="tp-big-action" onClick={() => navigate("/ai-operator/settings")}><span>⚙</span><b>Operator settings</b><em>→</em></button></div>
      <div className="tp-live"><div className="tp-live-title"><span/>Live Control Centre <b>›</b></div><p>All systems operational</p><button onClick={() => openAction("jobs", "Live jobs", "/jobs?embedded=1")}><span>Jobs in progress</span><b>{v.active.length}</b></button><button onClick={() => openAction("crew", "Jobs needing crew", "/dispatch?embedded=1")}><span>Jobs needing crew</span><b>{v.crew.length}</b></button><button onClick={() => openAction("approvals", "Approvals", "/ai-operator/approvals?embedded=1")}><span>Approvals</span><b>{data.approvals.length}</b></button><button onClick={() => openAction("money", "Money waiting", "/invoices?embedded=1")}><span>Money waiting</span><b>{money(v.cash)}</b></button></div>
    </section>
    {notice && <div className="tp-notice">{notice}</div>}{loading && <div className="tp-notice">Loading live Churvox data…</div>}
    <section className="tp-body-grid">
      <aside className="tp-card tp-priority"><div className="tp-card-head"><h2>Priority Queue</h2><span>5</span></div>{[["Approval needed", `${data.approvals.length} actions awaiting owner sign-off`, "now", "approvals"],["Jobs need crew", `${v.crew.length} jobs unassigned`, "15m", "crew"],["Follow-up due", `${v.followups.length} messages pending`, "35m", "followups"],["Invoices overdue", `${v.invoices.length} invoices • ${money(v.cash)}`, "1h", "money"],["Proofs to review", `${v.proof.length} submissions`, "2h", "proof"]].map(([a,b,c,k]) => <button key={a} className="tp-priority-row" onClick={() => openAction(k, a, actionRoute(k))}><i>●</i><span><b>{a}</b><small>{b}</small></span><em>{c}</em></button>)}<button className="tp-text-link" onClick={() => openAction("approvals", "Priority Queue", "/ai-operator/approvals?embedded=1")}>View all priorities →</button></aside>
      <section className="tp-card tp-jobs-board"><div className="tp-card-head"><h2>Live Jobs Board</h2><button onClick={() => openWorkspace("Jobs", "/jobs?embedded=1")}>View all jobs →</button></div><div className="tp-job-stats"><span><b>{v.active.length}</b>In Progress</span><span><b>{v.crew.length}</b>Needs Crew</span><span><b>{v.followups.length}</b>Follow-ups</span><span><b>{v.proof.length}</b>Completed Today</span></div><div className="tp-table"><div className="tp-table-head"><span>Job</span><span>Client</span><span>Status</span><span>Next Step</span><span>ETA</span></div>{(v.active.length ? v.active.slice(0,5) : sampleJobs).map((job, i) => <button key={rid(job)||i} className="tp-table-row" onClick={() => openWorkspace(rtitle(job, "Job"), rid(job) ? `/jobs/${rid(job)}?embedded=1` : "/jobs?embedded=1")}><span><b>{job.job_number || job.number || `J-${1056 - i}`}</b><small>{job.region || job.location || "Local"}</small></span><span><b>{client(job)}</b><small>{assigned(job)}</small></span><span><i className={`tp-status tp-status--${tone(job.status)}`}>{job.status || (i===1?"Needs Crew":"In Progress")}</i></span><span>{hasWorker(job)?"Check progress":"Assign technician"}</span><span>{job.scheduled_time || job.due_time || "Today"}</span></button>)}</div><button className="tp-board-link" onClick={() => openWorkspace("Dispatch", "/dispatch?embedded=1")}>Open dispatch board →</button></section>
      <aside className="tp-insights"><Insight title="Cash Flow" value={money(v.cash)} text={`${v.invoices.length} invoices to chase`} action="View" onClick={() => openAction("money", "Cash Flow", "/invoices?embedded=1")}/><Insight title="Proofs Pending" value={String(v.proof.length)} text="submissions waiting review" action="View proofs" onClick={() => openAction("proof", "Proofs Pending", "/proof-to-paid?embedded=1")} ring/><Insight title="Follow-ups" value={String(v.followups.length)} text="client replies awaiting response" action="Open inbox" onClick={() => openAction("followups", "Follow-ups", "/sms?embedded=1")}/><div className="tp-sms-card"><div className="tp-hot">HOT</div><h3>SMS Credits</h3><strong>12,540</strong><p>credits remaining</p><div className="tp-gauge"><span>78%</span></div><button onClick={() => openWorkspace("SMS Credits", "/sms?embedded=1")}>Buy SMS Credits →</button></div></aside>
    </section>
    <section className="tp-lower-grid"><div className="tp-card tp-recs"><div className="tp-card-head"><h2>AI Recommendations</h2></div><p>Smart actions tailored for your business.</p><div className="tp-recs-grid"><Rec title="Rebalance workloads" text={`${v.workers.length || 3} workers active today.`} onClick={() => openAction("crew", "Rebalance workloads", "/dispatch?embedded=1")}/><Rec title="Chase high-value invoices" text={`${v.invoices.length} invoices need attention.`} onClick={() => openAction("money", "Chase invoices", "/invoices?embedded=1")}/><Rec title="Fill tomorrow’s gaps" text={`${v.crew.length} jobs can be assigned.`} onClick={() => openAction("jobs", "Fill schedule gaps", "/jobs?embedded=1")}/></div></div><div className="tp-card tp-workspaces"><div className="tp-card-head"><h2>Owner Workspaces</h2></div><p>Jump into the tools you use most.</p><div className="tp-workspace-grid">{workspaces.map(([name,text,route,icon,colour,hot]) => <button key={name} className={`tp-workspace tp-workspace--${colour} ${hot?"tp-workspace--hot":""}`} onClick={() => openWorkspace(name, route)}>{hot && <em>HOT</em>}<span>{icon}</span><b>{name}</b><small>{hot?"12,540 credits remaining":text}</small>{hot && <strong>Buy SMS Credits →</strong>}</button>)}</div></div></section>
    <ActionModal modal={modal} close={() => setModal(null)} openWorkspace={openWorkspace}/><WorkspaceModal workspace={workspace} close={() => setWorkspace(null)}/>
  </main></Layout>;
}

function Insight({ title, value, text, action, onClick, ring }) { return <button className="tp-insight" onClick={onClick}><div><h3>{title}</h3><strong>{value}</strong><p>{text}</p></div>{ring ? <i className="tp-ring">{value}</i> : <span className="tp-line"/>}<b>{action} →</b></button>; }
function Rec({ title, text, onClick }) { return <button className="tp-rec" onClick={onClick}><span>✦</span><b>{title}</b><small>{text}</small><em>Review</em></button>; }
function ActionModal({ modal, close, openWorkspace }) { const [draft,setDraft]=useState(""); useEffect(()=>{ if(modal) setDraft(defaultDraft(modal.key)); },[modal]); if(!modal)return null; return <div className="tp-modal-backdrop" onClick={close}><div className="tp-modal" onClick={e=>e.stopPropagation()}><div className="tp-modal-head"><div><h2>{modal.title}</h2><p>Edit the owner action, then open the real workspace.</p></div><button onClick={close}>×</button></div><label>AI-prepared draft</label><textarea value={draft} onChange={e=>setDraft(e.target.value)}/><div className="tp-modal-grid"><label>Decision<select><option>Review later</option><option>Prepare action</option><option>Owner approved</option></select></label><label>Tone<select><option>Friendly</option><option>Professional</option><option>Direct</option></select></label></div><div className="tp-modal-actions"><button onClick={()=>setDraft(defaultDraft(modal.key))}>Prepare draft</button><button onClick={()=>navigator.clipboard?.writeText(draft)}>Copy draft</button><button onClick={()=>openWorkspace(modal.title, modal.route)}>Open workspace</button><button onClick={close}>Close</button></div></div></div>; }
function WorkspaceModal({ workspace, close }) { if(!workspace)return null; return <div className="tp-modal-backdrop tp-workspace-backdrop" onClick={close}><div className="tp-workspace-modal" onClick={e=>e.stopPropagation()}><div><h2>{workspace.title}</h2><button onClick={close}>×</button></div><iframe title={workspace.title} src={workspace.route}/></div></div>; }
function actionRoute(key){ return {approvals:"/ai-operator/approvals?embedded=1",crew:"/dispatch?embedded=1",money:"/invoices?embedded=1",followups:"/sms?embedded=1",proof:"/proof-to-paid?embedded=1",jobs:"/jobs?embedded=1"}[key] || "/dashboard?embedded=1"; }
function tone(status){ const s=low(status); if(s.includes("crew"))return"orange"; if(s.includes("complete")||s.includes("paid"))return"green"; if(s.includes("schedule"))return"purple"; return"blue"; }
function defaultDraft(key){ if(key==="crew")return"Recommended action: assign unassigned jobs to the best available worker. Check location, workload and schedule conflicts before approving."; if(key==="money")return"Hi there, just a friendly reminder that an invoice is still awaiting payment. Let me know if you need it resent."; if(key==="followups")return"Prepare customer follow-up messages for quotes, invoices or job updates. Owner approval required before sending."; if(key==="proof")return"Review completed job proof, photos and notes. Approve the proof pack before preparing the invoice."; if(key==="approvals")return"Review AI-prepared actions. Check details before approving."; return"Review this workspace and apply the next owner-approved action."; }
