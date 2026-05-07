import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { get, post } from "../lib/api";
import "../styles/smartHubTopPlayerFinal.css";
import "../styles/smartHubPhotoMatch.css";

const arr = (v) => Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : Array.isArray(v?.items) ? v.items : Array.isArray(v?.results) ? v.results : Array.isArray(v?.actions) ? v.actions : [];
const low = (v) => String(v || "").toLowerCase();
const money = (v) => `$${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const key = (x) => x?.id || x?._id || x?.job_id || x?.invoice_id || x?.quote_id || x?.email;
const client = (x) => x?.client_name || x?.customer_name || x?.client || "Client";
const worker = (j) => j?.assigned_worker_name || j?.worker_name || j?.assigned_worker || "Unassigned";
const hasWorker = (j) => Boolean(j?.worker_id || j?.assigned_worker_id || j?.assigned_worker_name || j?.worker_name || j?.assigned_worker);
const embedded = (r) => r.includes("embedded=") ? r : `${r}${r.includes("?") ? "&" : "?"}embedded=1`;
const initials = (v) => String(v || "C").split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();

const demoJobs = [
  { job_number: "J-1056", client_name: "Smith Residence", customer_name: "Sarah Smith", worker_name: "Jake R.", status: "In Progress", region: "Northbridge", scheduled_time: "Today 2:30pm", next_step: "Install air con unit" },
  { job_number: "J-1047", client_name: "Wilson Plumbing", customer_name: "Matt Wilson", status: "Needs Crew", region: "Fremantle", scheduled_time: "Today 11:00am", next_step: "Assign technician" },
  { job_number: "J-1042", client_name: "Taylor Electrical", customer_name: "Lisa Taylor", worker_name: "Levi B.", status: "Scheduled", region: "Osborne Park", scheduled_time: "Tomorrow 9:00am", next_step: "Check progress" },
  { job_number: "J-1038", client_name: "Brown Renovation", customer_name: "Daniel Brown", worker_name: "Mia L.", status: "In Progress", region: "South Perth", scheduled_time: "Today 4:00pm", next_step: "Plastering stage" },
  { job_number: "J-1031", client_name: "Davis Property", customer_name: "Chris Davis", worker_name: "Chris D.", status: "Completed", region: "Cottesloe", scheduled_time: "Today 8:45am", next_step: "Invoice sent" },
];

export default function SmartHubTopPlayerFinal() {
  const navigate = useNavigate();
  const [data, setData] = useState({ jobs: [], invoices: [], quotes: [], workers: [], approvals: [], sms: null });
  const [workspace, setWorkspace] = useState(null);
  const [action, setAction] = useState(null);

  const load = useCallback(async () => {
    const [jobs, invoices, quotes, workers, approvals, sms] = await Promise.all([
      get("/jobs").catch(() => null),
      get("/invoices").catch(() => null),
      get("/quotes").catch(() => null),
      get("/team/workers").catch(() => null),
      get("/ai-operator/actions").catch(() => get("/command-hub/actions").catch(() => null)),
      get("/sms/balance").catch(() => null),
    ]);
    setData({ jobs: arr(jobs), invoices: arr(invoices), quotes: arr(quotes), workers: arr(workers), approvals: arr(approvals?.data?.actions || approvals?.actions || approvals), sms: sms?.data || sms || null });
  }, []);

  useEffect(() => { load(); }, [load]);

  const state = useMemo(() => {
    const active = data.jobs.filter(j => !["completed", "cancelled", "closed", "done"].includes(low(j.status)));
    const crew = active.filter(j => !hasWorker(j));
    const done = data.jobs.filter(j => ["completed", "done"].includes(low(j.status)));
    const invoices = data.invoices.filter(i => ["open", "sent", "overdue", "unpaid", "pending", "pending_payment", "draft"].includes(low(i.status)));
    const quotes = data.quotes.filter(q => ["sent", "pending", "draft"].includes(low(q.status)));
    const waiting = invoices.reduce((t, i) => t + Number(i.balance_due || i.balance || i.total || i.amount || 0), 0);
    return { active, crew, done, invoices, quotes, followups: [...invoices, ...quotes], waiting };
  }, [data]);

  const jobs = state.active.length ? state.active.slice(0, 5) : demoJobs;
  const smsCredits = Number(data.sms?.credits ?? data.sms?.balance ?? 12540);
  const smsPercent = Math.max(8, Math.min(100, Math.round((smsCredits / 16000) * 100)));
  const openWorkspace = (title, route) => setWorkspace({ title, route: embedded(route) });
  const runAi = async () => { await post("/smart-hub/scan", {}).catch(() => null); load(); };

  return (
    <main className="cc-root">
      <aside className="cc-sidebar">
        <button className="cc-brand" onClick={() => navigate("/dashboard")}><span>C</span><b>CHURVOX</b></button>
        <nav className="cc-nav">
          {[["AI Control Room","/dashboard","⚙"],["Jobs","/jobs","⬡"],["Clients","/clients","♙"],["Quotes","/quotes","▤"],["Invoices","/invoices","▣"],["Dispatch","/dispatch","⌘"],["Team","/team","♙"],["Automation","/automation","⚡"],["Settings","/settings","⚙"]].map(([label, route, icon], i) => (
            <button key={label} className={i === 0 ? "active" : ""} onClick={() => navigate(route)}><i>{icon}</i><span>{label}</span></button>
          ))}
        </nav>
        <div className="cc-side-card"><div><strong>{smsCredits.toLocaleString()}</strong><i>☵</i></div><p>SMS Credits</p><span><em style={{ width: `${smsPercent}%` }} /></span><small>{smsPercent}% remaining</small><button onClick={() => openWorkspace("SMS Credits", "/sms?embedded=1")}>Buy Credits</button></div>
        <div className="cc-owner"><i /><b>Alex Thompson</b><span>Owner</span><small>Online</small></div>
      </aside>

      <section className="cc-canvas">
        <section className="cc-hero">
          <div className="cc-intro"><p>Good morning, Alex</p><h1>AI Control Room</h1><span>Your AI co-pilot is ready. Here's what needs your attention today.</span><button><i />AI Readiness <b>High</b></button></div>
          <div className="cc-actions"><p>What would you like to do?</p><button className="primary" onClick={runAi}><i>✦</i><b>Run AI Plan</b><span>→</span></button><button onClick={() => setAction({ title: "Review approvals", route: "/ai-operator/approvals?embedded=1" })}><i>⌑</i><b>Review approvals</b><em>{data.approvals.length || 8}</em></button><button onClick={() => navigate("/ai-operator/settings")}><i>⚙</i><b>Operator settings</b><span>→</span></button></div>
          <div className="cc-live"><div><i /><b>Live Control Centre</b><span>›</span></div><small>All systems operational</small><Metric icon="▦" label="Jobs in progress" value={state.active.length || 23} tone="blue" /><Metric icon="⚙" label="Jobs needing crew" value={state.crew.length || 6} tone="orange" /><Metric icon="⌑" label="Approvals" value={data.approvals.length || 8} tone="blue" /><Metric icon="$" label="Money waiting" value={money(state.waiting || 6820)} tone="green" /></div>
        </section>

        <section className="cc-grid">
          <article className="cc-card cc-queue"><Title title="Priority Queue" icon="⚑" badge="7" />
            <Queue title="Approval needed" text={`${data.approvals.length || 4} quotes over $5,000`} time="2m" />
            <Queue title="Jobs need crew" text={`${state.crew.length || 6} jobs unassigned`} time="15m" />
            <Queue title="Follow-up due" text={`${state.followups.length || 12} messages pending`} time="35m" />
            <Queue blue title="Invoices overdue" text={`${state.invoices.length || 5} invoices • ${money(state.waiting || 4250)}`} time="1h" />
            <Queue blue title="Proofs to review" text={`${state.done.length || 3} submissions`} time="2h" />
            <button className="cc-link" onClick={() => setAction({ title: "Priority Queue", route: "/ai-operator/approvals?embedded=1" })}>View all priorities →</button>
          </article>

          <article className="cc-card cc-board"><Title title="Live Jobs Board" icon="⌁" action={<button onClick={() => openWorkspace("Jobs", "/jobs?embedded=1")}>View all jobs →</button>} />
            <div className="cc-stat-row"><span><b>{state.active.length || 23}</b>In Progress</span><span><b>{state.crew.length || 6}</b>Needs Crew</span><span><b>4</b>Tomorrow</span><span><b>{state.done.length || 8}</b>Completed Today</span></div>
            <div className="cc-table"><div className="head"><span>Job</span><span>Client</span><span>Status</span><span>Next Step</span><span>ETA</span><span /></div>{jobs.map((job, index) => <button key={key(job) || index} className="row" onClick={() => openWorkspace(job.job_number || "Job", key(job) ? `/jobs/${key(job)}?embedded=1` : "/jobs?embedded=1")}><span><b>{job.job_number || `J-${1056 - index}`}</b><small>⌖ {job.region || "Local"}</small></span><span className="person"><i>{initials(client(job))}</i><b>{client(job)}</b><small>{job.customer_name || worker(job)}</small></span><span><em className={statusClass(job.status)}>{job.status || "In Progress"}</em></span><span>{job.next_step || (hasWorker(job) ? "Check progress" : "Assign technician")}</span><span>{job.scheduled_time || "Today"}</span><span>•••</span></button>)}</div>
            <button className="cc-dispatch" onClick={() => openWorkspace("Dispatch", "/dispatch?embedded=1")}>⚙ Open dispatch board ›</button>
          </article>

          <aside className="cc-stack"><Mini title="Cash Flow" value={money(state.waiting || 6820)} text={`${state.invoices.length || 8} invoices to chase`} link="View" /><Mini ring title="Proofs Pending" value={String(state.done.length || 3)} text="submissions waiting review" link="View proofs" /><Mini title="Follow-ups" value={String(state.followups.length || 12)} text="Client replies awaiting your response" link="Open inbox" /><div className="cc-sms"><em>HOT</em><h3>SMS Credits</h3><strong>{smsCredits.toLocaleString()}</strong><p>credits remaining</p><div><b>{smsPercent}%</b><span>remaining</span></div><button onClick={() => openWorkspace("SMS Credits", "/sms?embedded=1")}>Buy SMS Credits →</button></div></aside>
        </section>

        <section className="cc-bottom"><article className="cc-card cc-recs"><Title title="AI Recommendations" icon="✦" /><p>Smart actions tailored for your business</p><div><Rec tone="orange" title="Rebalance workloads" text="3 techs are at 92%+ capacity this week." /><Rec tone="green" title="Chase high-value invoices" text="8 invoices over $2,000 are overdue." /><Rec tone="blue" title="Fill tomorrow’s gaps" text="4 job slots open for tomorrow. Consider rescheduling." action="Optimise" /></div><button className="cc-link">View all recommendations →</button></article>
          <article className="cc-card cc-work"><Title title="Owner Workspaces" icon="▦" /><p>Jump into the tools you use most</p><div>{[["Jobs","View & manage","/jobs?embedded=1"],["Clients","Manage contacts","/clients?embedded=1"],["Quotes","Create & send","/quotes?embedded=1"],["Invoices","Create & send","/invoices?embedded=1"],["Dispatch","Assign & track","/dispatch?embedded=1"],["Team","Manage team","/team?embedded=1"],["Automation","Rules & alerts","/automation?embedded=1"],["Reports","Business insights","/reports?embedded=1"]].map(([a,b,c]) => <button key={a} onClick={() => openWorkspace(a, c)}><i>▦</i><b>{a}</b><small>{b}</small></button>)}</div></article></section>
      </section>

      <ActionModal modal={action} close={() => setAction(null)} openWorkspace={openWorkspace} />
      <WorkspaceModal workspace={workspace} close={() => setWorkspace(null)} />
    </main>
  );
}

function Metric({ icon, label, value, tone }) { return <button><i>{icon}</i><span>{label}</span><b className={tone}>{value}</b><em>›</em></button>; }
function Title({ title, icon, badge, action }) { return <div className="cc-title"><h2><i>{icon}</i>{title}</h2>{badge ? <b>{badge}</b> : action}</div>; }
function Queue({ title, text, time, blue }) { return <button className="cc-q"><i className={blue ? "blue" : ""} /><span><b>{title}</b><small>{text}</small></span><em>{time}</em></button>; }
function Mini({ title, value, text, link, ring }) { return <button className="cc-mini"><h3>{title}</h3><strong>{value}</strong><p>{text}</p>{ring ? <span className="ring">{value}</span> : <span className="curve" />}<b>{link} →</b></button>; }
function Rec({ title, text, tone, action = "Review" }) { return <button className={`cc-rec ${tone}`}><i /><b>{title}</b><small>{text}</small><span>{action}</span></button>; }
function statusClass(status) { const s = low(status); if (s.includes("crew")) return "needs"; if (s.includes("complete")) return "done"; if (s.includes("schedule")) return "scheduled"; return "progress"; }
function ActionModal({ modal, close, openWorkspace }) { if (!modal) return null; return <div className="cc-back" onClick={close}><div className="cc-modal" onClick={(e) => e.stopPropagation()}><header><h2>{modal.title}</h2><button onClick={close}>×</button></header><textarea defaultValue="AI has prepared this action. Review, edit, then open the real workspace to apply it." /><footer><button>Prepare draft</button><button onClick={() => openWorkspace(modal.title, modal.route)}>Open workspace</button><button onClick={close}>Close</button></footer></div></div>; }
function WorkspaceModal({ workspace, close }) { if (!workspace) return null; return <div className="cc-back" onClick={close}><div className="cc-frame" onClick={(e) => e.stopPropagation()}><header><h2>{workspace.title}</h2><button onClick={close}>×</button></header><iframe title={workspace.title} src={workspace.route} /></div></div>; }
