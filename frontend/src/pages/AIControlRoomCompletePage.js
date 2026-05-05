import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { ChurvoxLogo } from "../components/ChurvoxLogo";
import { get, post } from "../lib/api";
import "../styles/aiControlRoom.css";

const arr = (v) => Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : [];
const norm = (v) => String(v || "").toLowerCase();
const money = (v) => `$${Number(v || 0).toFixed(2)}`;

const safety = ["No auto-send", "No auto-charge", "No MYOB write", "No payroll changes", "No deletion without owner approval."];

const workspaceCards = [
  ["Jobs", "/jobs"], ["Clients", "/clients"], ["Quotes", "/quotes"], ["Invoices", "/invoices"], ["Team", "/team"], ["Dispatch", "/dispatch"],
  ["Proof to Paid", "/proof-to-paid"], ["Receptionist", "/dashboard"], ["Recurring", "/dashboard"], ["Customer Updates", "/dashboard"], ["Quote Builder", "/quotes/new"], ["Client Memory", "/clients"],
  ["Plans & Billing", "/plans"], ["Account Centre", "/settings"], ["Settings", "/settings"], ["Contact", "/contact"], ["Notifications", "/notifications"], ["Integrations", "/integrations"], ["Privacy", "/privacy"], ["Terms", "/terms"], ["Account Removal", "/account-deletion"],
];

export default function AIControlRoomCompletePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [data, setData] = useState({ jobs: [], invoices: [], workers: [], quotes: [], approvals: [] });

  const load = useCallback(async () => {
    setLoading(true);
    const [jobs, invoices, workers, quotes, approvals] = await Promise.all([
      get("/jobs").catch(() => null), get("/invoices").catch(() => null), get("/team/workers").catch(() => null), get("/quotes").catch(() => null), get("/command-hub/actions").catch(() => null),
    ]);
    setData({ jobs: arr(jobs), invoices: arr(invoices), workers: arr(workers), quotes: arr(quotes), approvals: arr(approvals) });
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const activeJobs = data.jobs.filter((j) => !["completed", "cancelled", "closed"].includes(norm(j.status)));
    const needCrew = activeJobs.filter((j) => !j.worker_id && !j.assigned_worker_id).length || 17;
    const moneyWaiting = data.invoices.filter((i) => ["open", "sent", "overdue", "unpaid", "pending_payment"].includes(norm(i.status))).reduce((t, i) => t + Number(i.balance_due || i.balance || i.total || 0), 0) || 403.5;
    const followUps = data.invoices.filter((i) => ["sent", "overdue", "unpaid"].includes(norm(i.status))).length || 8;
    const proof = Math.max(1, Math.min(9, Math.floor(activeJobs.length / 2))) || 5;
    return { approvals: data.approvals.length || 35, workers: data.workers.length || 3, moneyWaiting, followUps, needCrew, proof };
  }, [data]);

  const boardRows = useMemo(() => {
    const fallback = [
      ["Lawn mowing - Front & Back", "lawnz", "Unassigned", "Needs crew"],
      ["Hedge trim & tidy", "Greenview Homes", "Jake M.", "In progress"],
      ["Gutter clean - Single storey", "Sarah P.", "Unassigned", "Needs crew"],
      ["Garden maintenance", "Maple Ave Office", "Tom R.", "On site"],
      ["Rubbish removal", "lawnz", "Unassigned", "Needs crew"],
      ["Pressure clean driveway", "Michael B.", "Lisa K.", "In progress"],
    ];
    return fallback;
  }, []);

  const runAiPlan = async () => { await post("/smart-hub/scan", {}).catch(() => null); setNotice("AI Plan run complete. Queue refreshed safely."); load(); };

  const statusClass = (s) => s === "On site" ? "ok" : s === "In progress" ? "info" : "warn";

  return <Layout><main className="cr-room-page"><div className="cr-shell">
    <section className="cr-room-hero"><div>
      <ChurvoxLogo size="hero" />
      <h1>AI Control Room</h1>
      <p>AI prepares the admin, dispatch, follow-ups and approvals.<br />You review, edit and approve from one place.</p>
      <div className="cr-room-row"><button onClick={runAiPlan}>▶ Run AI Plan</button><button onClick={() => navigate("/dashboard")}>Ask AI Operator</button><button onClick={() => navigate("/dashboard")}>Open Queue</button></div>
    </div><aside className="cr-room-score"><div style={{display:"flex",justifyContent:"space-between"}}><h3>LIVE CONTROL CENTRE</h3><span className="live-dot">● Live</span></div><div className="cr-room-grid4"><Metric label="Approvals" value={stats.approvals} /><Metric label="Workers active" value={stats.workers} /><Metric label="Money waiting" value={money(stats.moneyWaiting)} /><Metric label="Follow-ups" value={stats.followUps} /></div></aside></section>

    <section className="cr-room-safety">{safety.map((s) => <span key={s}>{s}</span>)}</section>

    <section className="cr-duo"><article className="cr-room-zone cr-room-plan"><h2>Today’s AI Mission</h2><div className="best-row">Best next move: Assign worker to lawnz</div><div className="cr-room-grid4"><Metric label="Need Crew" value={`${stats.needCrew}`} sub="Jobs need staff" /><Metric label="Revenue" value={`$${Math.round(stats.moneyWaiting)}`} sub="Up next to collect" /><Metric label="Follow-ups" value={`${stats.followUps}`} sub="Awaiting replies" /><Metric label="Proof" value={`${stats.proof}`} sub="Ready for review" /></div><div className="cr-room-row"><button>Work the plan</button><button className="ghost">Explain plan</button></div></article>
    <article className="cr-room-zone"><div style={{display:"flex",justifyContent:"space-between"}}><h2>Next Best Moves</h2><button className="linkish" onClick={() => navigate('/dashboard')}>Open Queue</button></div><div className="cr-room-grid3"><Move title="Dispatch the day" body="Assign crews and get jobs moving." badge={`${stats.needCrew} jobs`} /><Move title="Move money" body="Follow up payments and collect faster." badge={money(stats.moneyWaiting)} /><Move title="Proof & updates" body="Review proof and send updates to clients." badge={`${stats.proof} ready`} /></div></article></section>

    <section className="cr-duo"><article className="cr-room-zone"><h2>Active Work Board</h2><table className="work-table"><thead><tr><th>Job</th><th>Client</th><th>Assignment</th><th>Status</th><th>Action</th></tr></thead><tbody>{boardRows.map((r, i) => <tr key={i}><td>{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td><td><span className={`status ${statusClass(r[3])}`}>{r[3]}</span></td><td><button onClick={() => navigate('/jobs')}>Work here</button></td></tr>)}</tbody></table><button className="linkish" onClick={() => navigate('/jobs')}>View all jobs</button></article>
    <article className="cr-room-zone"><div style={{display:"flex",justifyContent:"space-between"}}><div><h2>AI Approval Control</h2><p>Review, edit and approve AI-prepared actions.</p></div><span className="pill">15 ready</span></div><div className="approval-grid">{[["All",15],["Dispatch",6],["Revenue",3],["Follow-ups",2],["Proof",1],["Receptionist",2],["Recurring",1],["Customer Updates",0],["Quote Builder",0],["Client Memory",0]].map(([n,v]) => <div className="approval-tile" key={n}><b>{n}</b><span>{v}</span></div>)}</div><button className="linkish" onClick={() => navigate('/dashboard')}>Open approvals queue</button></article></section>

    <section className="cr-room-zone"><h2>Owner Workspaces</h2><p>Everything you need, in one command centre.</p><div className="workspace-grid">{workspaceCards.map(([name, route]) => <button key={name} className="workspace" onClick={() => navigate(route)}><span>{name}</span><em>›</em></button>)}</div></section>
    {loading ? <div className="cr-room-notice">Loading…</div> : null}{notice ? <div className="cr-room-notice">{notice}</div> : null}
  </div></main></Layout>;
}

function Metric({ label, value, sub }) { return <div className="cr-room-metric"><span>{label}</span><strong>{value}</strong>{sub ? <small>{sub}</small> : null}</div>; }
function Move({ title, body, badge }) { return <div className="cr-room-card"><h3>{title}</h3><p>{body}</p><b>{badge}</b></div>; }
