import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HardHat } from "lucide-react";
import { approveAiAction, loadAiOperatorQueue, prepareTodayWithAi, runAiDailyCheck } from "../../lib/aiOperator";
import V3Shell from "../components/V3Shell";
import "../styles/v3.css";

const workspaces = [
  ["Jobs", "/v3/jobs", "Live run sheet"],
  ["Dispatch", "/v3/dispatch", "Crew coverage"],
  ["Clients", "/v3/clients", "Customer base"],
  ["Quotes", "/v3/quotes", "Sales desk"],
  ["Invoices", "/v3/invoices", "Money board"],
  ["Team", "/v3/team", "Crew control"],
  ["Payroll", "/v3/payroll", "Pay run"],
  ["Rules", "/automation", "Background engine"],
  ["Reports", "/v3/reports", "Owner numbers"],
];

function Empty({ title, copy }) {
  return <div className="v3-empty"><b>{title}</b><span>{copy}</span></div>;
}

function ActionRow({ action, onOpen, onApprove, busy }) {
  return (
    <div className="v3-row">
      <button type="button" onClick={onOpen} className="v3-button ghost" style={{ textAlign: "left", justifyContent: "flex-start" }}>
        <span><b>{action.title || "Prepared action"}</b><span>{action.summary || action.reason || "Ready for owner review."}</span></span>
      </button>
      <button type="button" className="v3-button dark" onClick={onApprove}>{busy ? "Running…" : "Approve"}</button>
    </div>
  );
}

export default function V3SmartHubPage() {
  const navigate = useNavigate();
  const [actions, setActions] = useState([]);
  const [busyActionId, setBusyActionId] = useState("");
  const [loading, setLoading] = useState(true);

  const pending = useMemo(() => actions.filter((a) => ["pending", "edited", "needs_review", undefined].includes(a.status)), [actions]);
  const dispatch = pending.filter((a) => a.module === "dispatch" || a.action_type === "assign_worker_to_job");
  const invoices = pending.filter((a) => a.module === "invoices");
  const proofs = pending.filter((a) => String(a.action_type || "").includes("proof"));

  const load = async () => {
    setLoading(true);
    const result = await loadAiOperatorQueue();
    setActions(result.actions || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const refresh = async () => {
    setLoading(true);
    const result = await runAiDailyCheck();
    setActions(result.actions || []);
    setLoading(false);
  };

  const prepare = async () => {
    setLoading(true);
    const result = await prepareTodayWithAi();
    setActions(result.actions || []);
    setLoading(false);
  };

  const approve = async (action) => {
    if (!action) return;
    setBusyActionId(action.id);
    const result = await approveAiAction(action);
    if (result.ok) setActions((current) => current.filter((item) => item.id !== action.id));
    setBusyActionId("");
  };

  return (
    <V3Shell>
      <div className="v3-page">
        <section className="v3-hero">
          <div className="v3-hero-main">
            <div className="v3-hero-copy">
              <p className="v3-eyebrow">Trade business control room</p>
              <h1>Today’s run.</h1>
              <p>Jobs, crew, money and owner decisions in one worksite-style command centre. Churvox checks the admin in the background.</p>
              <div className="v3-actions">
                <button className="v3-button" onClick={prepare}>Prepare today</button>
                <button className="v3-button secondary" onClick={refresh}>Refresh checks</button>
              </div>
            </div>
          </div>

          <aside className="v3-hero-panel">
            <div className="v3-now-card">
              <div>
                <small>Owner decisions</small>
                <b>{loading ? "…" : pending.length}</b>
                <span>{pending.length ? "Waiting for review" : "All clear right now"}</span>
              </div>
              <button className="v3-button dark" onClick={() => pending[0] ? approve(pending[0]) : refresh()}>{pending[0] ? "Approve first" : "Check again"}</button>
            </div>
            <div className="v3-site-card">
              <div className="v3-site-icon"><HardHat size={25} /></div>
              <div><small>Trade OS</small><b>Field + office synced</b><span>Built for service crews, not spreadsheet admin.</span></div>
            </div>
          </aside>
        </section>

        <section className="v3-metrics">
          <button className="v3-metric" onClick={() => navigate("/ai-approvals")}><b>{pending.length}</b><span>Decisions</span><small>{pending.length ? "Needs review" : "All clear"}</small></button>
          <button className="v3-metric" onClick={() => navigate("/v3/dispatch")}><b>{dispatch.length}</b><span>Crew checks</span><small>{dispatch.length ? "Dispatch ready" : "Covered"}</small></button>
          <button className="v3-metric lime" onClick={() => navigate("/v3/invoices")}><b>{invoices.length}</b><span>Money items</span><small>Drafts and reminders</small></button>
          <button className="v3-metric" onClick={() => navigate("/proof-to-paid")}><b>{proofs.length}</b><span>Proof packs</span><small>Completed work</small></button>
        </section>

        <section className="v3-board">
          <article className="v3-card">
            <div className="v3-card-head"><div><p>Review queue</p><h2>Needs your call</h2></div><strong>{pending.length}</strong></div>
            {loading ? <Empty title="Checking the business" copy="Refreshing prepared work and owner decisions." /> : pending.length ? pending.slice(0, 5).map((action) => <ActionRow key={action.id} action={action} busy={busyActionId === action.id} onOpen={() => navigate("/ai-approvals")} onApprove={() => approve(action)} />) : <Empty title="Nothing waiting" copy="Churvox has no owner decisions waiting right now." />}
          </article>

          <article className="v3-card">
            <div className="v3-card-head"><div><p>Run sheet</p><h2>Workspaces</h2></div></div>
            <div className="v3-workspace-grid">
              {workspaces.slice(0, 6).map(([name, path, copy]) => <button className="v3-workspace" key={path} onClick={() => navigate(path)}><b>{name}</b><span>{copy}</span></button>)}
            </div>
          </article>

          <div className="v3-side-stack">
            <article className="v3-card"><div className="v3-card-head"><div><p>Automation</p><h2>Background</h2></div></div><Empty title="Quiet by default" copy="Only real decisions are surfaced to the owner." /></article>
            <article className="v3-card"><div className="v3-card-head"><div><p>Cashflow</p><h2>Invoices</h2></div></div><button className="v3-button dark" onClick={() => navigate("/v3/invoices")}>Open money board</button></article>
          </div>

          <article className="v3-card v3-workspaces">
            <div className="v3-card-head"><div><p>All areas</p><h2>Open a workspace</h2></div></div>
            <div className="v3-workspace-grid">
              {workspaces.map(([name, path, copy]) => <button className="v3-workspace" key={path} onClick={() => navigate(path)}><b>{name}</b><span>{copy}</span></button>)}
            </div>
          </article>
        </section>
      </div>
    </V3Shell>
  );
}
