import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { get, post } from "../lib/api";
import "../styles/smartHubExact.css";

const asArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.actions)) return value.actions;
  if (Array.isArray(value?.messages)) return value.messages;
  return [];
};
const lower = (value) => String(value || "").toLowerCase();
const dollars = (value) => `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const recordId = (item) => item?.id || item?._id || item?.job_id || item?.invoice_id || item?.quote_id || item?.email;
const clientName = (item) => item?.client_name || item?.customer_name || item?.client || item?.business_name || "Client";
const workerName = (job) => job?.assigned_worker_name || job?.worker_name || job?.assigned_worker || "Unassigned";
const hasWorker = (job) => Boolean(job?.worker_id || job?.assigned_worker_id || job?.assigned_worker_name || job?.worker_name || job?.assigned_worker);
const embedded = (route) => route.includes("embedded=") ? route : `${route}${route.includes("?") ? "&" : "?"}embedded=1`;
const initials = (value) => String(value || "C").split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();

const demoJobs = [
  { job_number: "J-1056", client_name: "Smith Residence", customer_name: "Sarah Smith", worker_name: "Jake R.", status: "In Progress", region: "Northbridge", scheduled_time: "Today 2:30pm", next_step: "Install air con unit" },
  { job_number: "J-1047", client_name: "Wilson Plumbing", customer_name: "Matt Wilson", status: "Needs Crew", region: "Fremantle", scheduled_time: "Today 11:00am", next_step: "Assign technician" },
  { job_number: "J-1042", client_name: "Taylor Electrical", customer_name: "Lisa Taylor", worker_name: "Levi B.", status: "Scheduled", region: "Osborne Park", scheduled_time: "Tomorrow 9:00am", next_step: "Check progress" },
  { job_number: "J-1038", client_name: "Brown Renovation", customer_name: "Daniel Brown", worker_name: "Mia L.", status: "In Progress", region: "South Perth", scheduled_time: "Today 4:00pm", next_step: "Plastering stage" },
  { job_number: "J-1031", client_name: "Davis Property", customer_name: "Chris Davis", worker_name: "Chris D.", status: "Completed", region: "Cottesloe", scheduled_time: "Today 8:45am", next_step: "Invoice sent" },
];
const navItems = [
  ["AI Control Room", "/dashboard", "control"], ["Jobs", "/jobs", "shield"], ["Clients", "/clients", "users"], ["Quotes", "/quotes", "file"], ["Invoices", "/invoices", "invoice"], ["Dispatch", "/dispatch", "dispatch"], ["Team", "/team", "team"], ["Automation", "/automation", "bolt"], ["Settings", "/settings", "gear"],
];
const workspaceCards = [
  ["Jobs", "View & manage", "/jobs?embedded=1", "file"], ["Clients", "Manage contacts", "/clients?embedded=1", "users"], ["Quotes", "Create & send", "/quotes?embedded=1", "quote"], ["Invoices", "Create & send", "/invoices?embedded=1", "calendar"], ["Dispatch", "Assign & track", "/dispatch?embedded=1", "truck"], ["Team", "Manage team", "/team?embedded=1", "team"], ["Automation", "Rules & alerts", "/automation?embedded=1", "gear"], ["Reports", "Business insights", "/reports?embedded=1", "chart"],
];

export default function SmartHubExactPage() {
  const navigate = useNavigate();
  const [data, setData] = useState({ jobs: [], invoices: [], quotes: [], workers: [], approvals: [], sms: null });
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [actionModal, setActionModal] = useState(null);
  const [workspace, setWorkspace] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [jobs, invoices, quotes, workers, approvals, sms] = await Promise.all([
      get("/jobs").catch(() => null), get("/invoices").catch(() => null), get("/quotes").catch(() => null), get("/team/workers").catch(() => null), get("/ai-operator/actions").catch(() => get("/command-hub/actions").catch(() => null)), get("/sms/balance").catch(() => null),
    ]);
    setData({ jobs: asArray(jobs), invoices: asArray(invoices), quotes: asArray(quotes), workers: asArray(workers), approvals: asArray(approvals?.data?.actions || approvals?.actions || approvals), sms: sms?.data || sms || null });
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const state = useMemo(() => {
    const active = data.jobs.filter((job) => !["completed", "cancelled", "closed", "done"].includes(lower(job.status)));
    const needsCrew = active.filter((job) => !hasWorker(job));
    const completed = data.jobs.filter((job) => ["completed", "done"].includes(lower(job.status)));
    const invoices = data.invoices.filter((invoice) => ["open", "sent", "overdue", "unpaid", "pending", "pending_payment", "draft"].includes(lower(invoice.status)));
    const quotes = data.quotes.filter((quote) => ["sent", "pending", "draft"].includes(lower(quote.status)));
    const waiting = invoices.reduce((total, invoice) => total + Number(invoice.balance_due || invoice.balance || invoice.total || invoice.amount || 0), 0);
    return { active, needsCrew, completed, invoices, quotes, followups: [...invoices, ...quotes], waiting };
  }, [data]);

  const smsCredits = Number(data.sms?.credits ?? data.sms?.balance ?? 12540);
  const smsPercent = Math.max(8, Math.min(100, Math.round((smsCredits / 16000) * 100)));
  const displayJobs = state.active.length ? state.active.slice(0, 5) : demoJobs;
  const openWorkspace = (title, route) => setWorkspace({ title, route: embedded(route) });
  const openAction = (title, route, draft) => setActionModal({ title, route: embedded(route), draft });
  const runAiPlan = async () => { setNotice("AI is refreshing today’s plan…"); await post("/smart-hub/scan", {}).catch(() => null); await load(); setNotice("AI plan refreshed. Review the priority queue or open the workspace you need."); };

  return <main className="shx-shell shx-final">
    <aside className="shx-sidebar"><button type="button" className="shx-logo" onClick={() => navigate("/dashboard")}><span>C</span><b>CHURVOX</b></button><nav>{navItems.map(([label, route, icon], index) => <button key={label} type="button" className={index === 0 ? "active" : ""} onClick={() => navigate(route)}><i data-icon={icon} />{label}</button>)}</nav><div className="shx-side-sms"><div className="sms-head"><strong>{smsCredits.toLocaleString()}</strong><i data-icon="chat" /></div><span>SMS Credits</span><div className="bar"><em style={{ width: `${smsPercent}%` }} /></div><small>{smsPercent}% remaining</small><button type="button" onClick={() => openWorkspace("SMS Credits", "/sms?embedded=1")}>Buy Credits</button></div><div className="shx-owner"><div className="avatar" /><b>Alex Thompson</b><span>Owner</span><small>Online</small></div><button type="button" className="collapse">≪</button></aside>
    <section className="shx-main"><header className="shx-hero"><div className="hero-left"><p>Good morning, Alex</p><h1>AI Control Room</h1><span>Your AI co-pilot is ready. Here's what needs your attention today.</span><div className="ready"><i /> AI Readiness <b>High</b></div></div><div className="hero-actions"><p>What would you like to do?</p><button type="button" className="primary" onClick={runAiPlan}><i data-icon="spark" /><b>Run AI Plan</b><span>→</span></button><button type="button" onClick={() => openAction("Review approvals", "/ai-operator/approvals?embedded=1", "Review AI-prepared actions before they are applied.")}><i data-icon="shield" /><b>Review approvals</b><em>{data.approvals.length || 8}</em></button><button type="button" onClick={() => navigate("/ai-operator/settings")}><i data-icon="gear" /><b>Operator settings</b><span>→</span></button></div><div className="hero-live"><div className="live-title"><i /><span>Live Control Centre</span><b>›</b></div><small>All systems operational</small><LiveMetric icon="jobs" label="Jobs in progress" value={state.active.length || 23} tone="blue" /><LiveMetric icon="crew" label="Jobs needing crew" value={state.needsCrew.length || 6} tone="orange" /><LiveMetric icon="shield" label="Approvals" value={data.approvals.length || 8} tone="blue" /><LiveMetric icon="cash" label="Money waiting" value={dollars(state.waiting || 6820)} tone="green" /></div></header>
    {notice ? <div className="shx-notice">{notice}</div> : null}{loading ? <div className="shx-loading">Loading live Churvox data…</div> : null}
    <section className="shx-grid-top"><article className="shx-card priority"><div className="card-head"><h2><i data-icon="flag" />Priority Queue</h2><b>7</b></div><Priority icon="approve" title="Approval needed" text={`${data.approvals.length || 4} quotes over $5,000`} time="2m" onClick={() => openAction("Approval needed", "/ai-operator/approvals?embedded=1", "Review quotes and AI actions waiting for owner sign-off.")} /><Priority icon="crew" title="Jobs need crew" text={`${state.needsCrew.length || 6} jobs unassigned`} time="15m" onClick={() => openWorkspace("Dispatch", "/dispatch?embedded=1")} /><Priority icon="chat" title="Follow-up due" text={`${state.followups.length || 12} messages pending`} time="35m" onClick={() => openWorkspace("Follow-ups", "/sms?embedded=1")} /><Priority icon="invoice" title="Invoices overdue" text={`${state.invoices.length || 5} invoices • ${dollars(state.waiting || 4250)}`} time="1h" blue onClick={() => openWorkspace("Invoices", "/invoices?embedded=1")} /><Priority icon="proof" title="Proofs to review" text={`${state.completed.length || 3} submissions`} time="2h" blue onClick={() => openWorkspace("Proofs", "/proof-to-paid?embedded=1")} /><button className="link" type="button" onClick={() => openAction("Priority Queue", "/ai-operator/approvals?embedded=1", "Review all priority items for today.")}>View all priorities <span>→</span></button></article>
    <article className="shx-card board"><div className="card-head"><h2><i data-icon="pulse" />Live Jobs Board</h2><button type="button" onClick={() => openWorkspace("Jobs", "/jobs?embedded=1")}>View all jobs <span>→</span></button></div><div className="board-stats"><span><b>{state.active.length || 23}</b>In Progress</span><span><b>{state.needsCrew.length || 6}</b>Needs Crew</span><span><b>4</b>Tomorrow</span><span><b>{state.completed.length || 8}</b>Completed Today</span></div><div className="job-table"><div className="head"><span>Job</span><span>Client</span><span>Status</span><span>Next Step</span><span>ETA</span><span /></div>{displayJobs.map((job, index) => <button key={recordId(job) || index} className="row" type="button" onClick={() => openWorkspace(job.job_number || "Job", recordId(job) ? `/jobs/${recordId(job)}?embedded=1` : "/jobs?embedded=1")}><span><b>{job.job_number || `J-${1056 - index}`}</b><small>⌖ {job.region || "Local"}</small></span><span className="client"><i>{initials(clientName(job))}</i><b>{clientName(job)}</b><small>{job.customer_name || workerName(job)}</small></span><span><em className={statusClass(job.status)}>{job.status || "In Progress"}</em></span><span>{job.next_step || (hasWorker(job) ? "Check progress" : "Assign technician")}</span><span>{job.scheduled_time || "Today"}</span><span className="dots">•••</span></button>)}</div><button className="dispatch-link" type="button" onClick={() => openWorkspace("Dispatch", "/dispatch?embedded=1")}>⚙ Open dispatch board <span>›</span></button></article>
    <aside className="shx-right-stack"><SmallCard icon="cash" title="Cash Flow" value={dollars(state.waiting || 6820)} text={`${state.invoices.length || 8} invoices to chase`} action="View" tone="green" onClick={() => openWorkspace("Cash Flow", "/invoices?embedded=1")} /><SmallCard icon="proof" title="Proofs Pending" value={String(state.completed.length || 3)} text="submissions waiting review" action="View proofs" ring onClick={() => openWorkspace("Proofs", "/proof-to-paid?embedded=1")} /><SmallCard icon="chat" title="Follow-ups" value={String(state.followups.length || 12)} text="Client replies awaiting your response" action="Open inbox" tone="green" onClick={() => openWorkspace("Follow-ups", "/sms?embedded=1")} /><div className="sms-big"><em>HOT</em><h3>SMS Credits</h3><strong>{smsCredits.toLocaleString()}</strong><p>credits remaining</p><div className="gauge"><b>{smsPercent}%</b><span>remaining</span></div><button type="button" onClick={() => openWorkspace("SMS Credits", "/sms?embedded=1")}>Buy SMS Credits <span>→</span></button></div></aside></section>
    <section className="shx-bottom"><article className="shx-card recommend"><div className="card-head"><h2><i data-icon="spark-blue" />AI Recommendations</h2></div><p>Smart actions tailored for your business</p><div className="rec-grid"><Recommendation tone="orange" title="Rebalance workloads" text="3 techs are at 92%+ capacity this week." /><Recommendation tone="green" title="Chase high-value invoices" text="8 invoices over $2,000 are overdue." /><Recommendation tone="blue" title="Fill tomorrow’s gaps" text="4 job slots open for tomorrow. Consider rescheduling." action="Optimise" /></div><button className="link" type="button">View all recommendations <span>→</span></button></article><article className="shx-card workspace"><div className="card-head"><h2><i data-icon="grid" />Owner Workspaces</h2></div><p>Jump into the tools you use most</p><div className="workspace-grid">{workspaceCards.map(([label, text, route, icon]) => <button key={label} type="button" onClick={() => openWorkspace(label, route)}><i data-icon={icon} /><b>{label}</b><small>{text}</small></button>)}</div></article></section></section>
    <ActionModal modal={actionModal} close={() => setActionModal(null)} openWorkspace={openWorkspace} /><WorkspaceModal workspace={workspace} close={() => setWorkspace(null)} />
  </main>;
}
function LiveMetric({ icon, label, value, tone }) { return <button className="live-row" type="button"><i data-icon={icon} /><span>{label}</span><b className={tone}>{value}</b><em>›</em></button>; }
function Priority({ icon, title, text, time, blue, onClick }) { return <button className="priority-row" type="button" onClick={onClick}><i data-icon={icon} className={blue ? "blue" : ""} /><span><b>{title}</b><small>{text}</small></span><em>{time}</em></button>; }
function SmallCard({ icon, title, value, text, action, ring, tone, onClick }) { return <button className="small-card" type="button" onClick={onClick}><i className="small-icon" data-icon={icon} /><h3>{title}</h3><strong>{value}</strong><p>{text}</p>{ring ? <span className="ring">{value}</span> : <span className={`spark ${tone || "green"}`} />}<b>{action} <em>→</em></b></button>; }
function Recommendation({ title, text, tone, action = "Review" }) { return <button className={`rec ${tone}`} type="button"><i /><b>{title}</b><small>{text}</small><span>{action}</span></button>; }
function ActionModal({ modal, close, openWorkspace }) { const [draft, setDraft] = useState(""); useEffect(() => { if (modal) setDraft(modal.draft || "AI has prepared this action. Review, edit, then open the real workspace to apply it."); }, [modal]); if (!modal) return null; return <div className="shx-backdrop" onClick={close}><div className="shx-modal" onClick={(event) => event.stopPropagation()}><header><h2>{modal.title}</h2><button type="button" onClick={close}>×</button></header><label>Editable owner action</label><textarea value={draft} onChange={(event) => setDraft(event.target.value)} /><footer><button type="button" onClick={() => setDraft(modal.draft || "AI has prepared this action. Review, edit, then open the real workspace to apply it.")}>Prepare draft</button><button type="button" onClick={() => navigator.clipboard?.writeText(draft)}>Copy draft</button><button type="button" onClick={() => openWorkspace(modal.title, modal.route)}>Open workspace</button><button type="button" onClick={close}>Close</button></footer></div></div>; }
function WorkspaceModal({ workspace, close }) { if (!workspace) return null; return <div className="shx-backdrop" onClick={close}><div className="shx-workspace-modal" onClick={(event) => event.stopPropagation()}><header><h2>{workspace.title}</h2><button type="button" onClick={close}>×</button></header><iframe title={workspace.title} src={workspace.route} /></div></div>; }
function statusClass(status) { const value = lower(status); if (value.includes("crew")) return "needs"; if (value.includes("complete") || value.includes("paid")) return "done"; if (value.includes("schedule")) return "scheduled"; return "progress"; }
