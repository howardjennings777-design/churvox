import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  approveAiAction,
  loadAiOperatorQueue,
  prepareTodayWithAi,
  runAiDailyCheck,
} from "../../lib/aiOperator";
import V2Shell from "../components/V2Shell";
import "../styles/v2.css";

const workspaces = [
  ["Jobs", "/jobs", "Live run sheet"],
  ["Dispatch", "/dispatch", "Crew coverage"],
  ["Clients", "/clients", "Customer workspace"],
  ["Quotes", "/quotes", "Sales pipeline"],
  ["Invoices", "/invoices", "Cashflow"],
  ["Team", "/team", "Crew and roles"],
  ["Payroll", "/payroll", "Approved hours"],
  ["Automation", "/automation", "Rules & triggers"],
  ["Reports", "/reports", "Business insights"],
];

function money(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number <= 0) return "$0";
  if (number >= 1000) return `$${(number / 1000).toFixed(1)}k`;
  return `$${Math.round(number)}`;
}

function Empty({ title, copy }) {
  return (
    <div className="v2-empty">
      <b>{title}</b>
      <span>{copy}</span>
    </div>
  );
}

function Card({ eyebrow, title, count, children, action, onAction }) {
  return (
    <article className="v2-card">
      <div className="v2-card-head">
        <div>
          <p>{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        {typeof count !== "undefined" ? <strong>{count}</strong> : action ? <button type="button" className="v2-button ghost" onClick={onAction}>{action} →</button> : null}
      </div>
      {children}
    </article>
  );
}

function ActionRow({ action, busy, onOpen, onApprove }) {
  return (
    <div className="v2-row">
      <button type="button" onClick={onOpen} className="v2-button ghost" style= textAlign: "left", justifyContent: "flex-start" >
        <span>
          <b>{action.title || "Prepared action"}</b>
          <span>{action.summary || action.reason || "Ready for owner review."}</span>
        </span>
      </button>
      <button type="button" className="v2-button" onClick={onApprove}>{busy ? "Running…" : "Approve"}</button>
    </div>
  );
}

function Modal({ action, busy, onClose, onApprove }) {
  if (!action) return null;
  return (
    <div className="ai-modal-backdrop" onClick={onClose}>
      <section className="ai-modal" onClick={(event) => event.stopPropagation()}>
        <button className="ai-modal-close" type="button" onClick={onClose}>×</button>
        <p className="ai-modal-eyebrow">Prepared action · {action.module || "business"}</p>
        <h2>{action.title || "Prepared action"}</h2>
        <p className="ai-modal-summary">{action.summary || "This is ready for owner review."}</p>
        <div className="ai-modal-reason"><b>Why this is recommended</b><span>{action.reason || "Churvox prepared this based on current workspace data."}</span></div>
        <div className="ai-modal-preview"><b>Preview</b><span>{action.preview_text || "Review, approve, or close this item."}</span></div>
        <footer><button onClick={onClose}>Not now</button><button className="primary" onClick={onApprove}>{busy ? "Running…" : "Approve and run"}</button></footer>
      </section>
    </div>
  );
}

export default function V2SmartHubPage() {
  const navigate = useNavigate();
  const [actions, setActions] = useState([]);
  const [selectedAction, setSelectedAction] = useState(null);
  const [busyActionId, setBusyActionId] = useState("");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("Checking workspace…");

  const pending = useMemo(() => actions.filter((action) => ["pending", "edited", "needs_review", undefined].includes(action.status)), [actions]);
  const dispatchActions = pending.filter((action) => action.module === "dispatch" || action.action_type === "assign_worker_to_job");
  const invoiceActions = pending.filter((action) => action.module === "invoices");
  const proofActions = pending.filter((action) => String(action.action_type || "").includes("proof"));

  const summary = useMemo(() => ({
    decisions: pending.length,
    crew: dispatchActions.length,
    payments: invoiceActions.reduce((sum, action) => sum + Number(action?.suggested_payload?.total || action?.suggested_payload?.amount || 0), 0),
    proofs: proofActions.length,
  }), [pending.length, dispatchActions.length, invoiceActions, proofActions.length]);

  const load = async () => {
    setLoading(true);
    const result = await loadAiOperatorQueue();
    const next = result.actions || [];
    setActions(next);
    setStatus(result.ok ? (next.length ? `${next.length} decisions ready` : "Everything is clear") : "Workspace check unavailable");
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const refresh = async () => {
    setLoading(true);
    setStatus("Refreshing workspace…");
    const result = await runAiDailyCheck();
    const next = result.actions || [];
    setActions(next);
    setStatus(result.ok ? (next.length ? `${next.length} decisions ready` : "Everything is clear") : "Refresh failed");
    setLoading(false);
  };

  const prepareToday = async () => {
    setLoading(true);
    setStatus("Preparing today…");
    const result = await prepareTodayWithAi();
    const next = result.actions || [];
    setActions(next);
    setStatus(result.ok ? (next.length ? "Today is ready for review" : "Today is clear") : "Could not prepare today");
    setLoading(false);
  };

  const approve = async (action) => {
    if (!action) return;
    setBusyActionId(action.id);
    const result = await approveAiAction(action);
    if (result.ok) {
      setActions((current) => current.filter((item) => item.id !== action.id));
      setStatus(result.data?.message || "Action completed");
      setSelectedAction(null);
    } else {
      setStatus(result.message || "Action failed");
    }
    setBusyActionId("");
  };

  const first = pending[0];

  return (
    <V2Shell status={status}>
      <div className="v2-page">
        <div className="v2-topbar">
          <span className="v2-live-pill">{status}</span>
          <div className="v2-top-actions">
            <button type="button" className="v2-button secondary" onClick={() => navigate("/notifications")}>Alerts {summary.decisions ? `(${summary.decisions})` : ""}</button>
            <button type="button" className="v2-button secondary" onClick={() => navigate("/settings")}>Settings</button>
          </div>
        </div>

        <section className="v2-hero">
          <div className="v2-hero-copy">
            <p className="v2-eyebrow">Today’s control room</p>
            <h1>Smart Hub</h1>
            <p>One clean view of the work that matters today. Churvox checks jobs, payments, proofs and owner decisions in the background.</p>
            <div className="v2-hero-actions">
              <button type="button" className="v2-button" onClick={prepareToday}>Prepare today</button>
              <button type="button" className="v2-button secondary" onClick={() => first ? setSelectedAction(first) : refresh()}>{first ? "Review decisions" : "Refresh checks"}</button>
            </div>
          </div>
          <aside className="v2-hero-side">
            <small>Owner decisions</small>
            <b>{loading ? "…" : summary.decisions}</b>
            <span>{summary.decisions ? "Waiting for review" : "All clear right now"}</span>
            <button type="button" className="v2-button" onClick={refresh}>Refresh now</button>
          </aside>
        </section>

        <section className="v2-stats">
          <button type="button" className="v2-stat" onClick={() => first && setSelectedAction(first)}><b>{summary.decisions}</b><span>Decisions</span><small>{summary.decisions ? "Needs review" : "All clear"}</small></button>
          <button type="button" className="v2-stat" data-tone="amber" onClick={() => navigate("/dispatch")}><b>{summary.crew}</b><span>Crew needed</span><small>{summary.crew ? "Dispatch review" : "Covered"}</small></button>
          <button type="button" className="v2-stat" data-tone="green" onClick={() => navigate("/invoices")}><b>{money(summary.payments)}</b><span>Payments</span><small>{summary.payments ? "Ready to chase" : "Clear"}</small></button>
          <button type="button" className="v2-stat" onClick={() => navigate("/proof-to-paid")}><b>{summary.proofs}</b><span>Job proofs</span><small>{summary.proofs ? "Needs review" : "Clear"}</small></button>
        </section>

        <section className="v2-grid">
          <Card eyebrow="Review queue" title="Needs your decision" count={summary.decisions}>
            {loading ? <Empty title="Checking workspace" copy="Refreshing jobs, invoices, proofs and follow-ups." /> : pending.length ? pending.slice(0, 5).map((action) => <ActionRow key={action.id} action={action} busy={busyActionId === action.id} onOpen={() => setSelectedAction(action)} onApprove={() => approve(action)} />) : <Empty title="All clear" copy="Nothing needs your decision right now." />}
          </Card>

          <Card eyebrow="Dispatch" title="Crew and job checks" action="Open dispatch" onAction={() => navigate("/dispatch")}>
            {dispatchActions.length ? dispatchActions.slice(0, 4).map((action) => (
              <button key={action.id} type="button" className="v2-row" onClick={() => setSelectedAction(action)}><span><b>{action.title}</b><span>{action.summary || "Dispatch review ready."}</span></span><em>Review</em></button>
            )) : <Empty title="All covered" copy="No unassigned or conflicting jobs need attention." />}
          </Card>

          <div className="v2-stack">
            <article className="v2-card v2-mini"><p className="v2-eyebrow">Cashflow</p><h3>{money(summary.payments)}</h3><span>Invoice follow-ups ready to check.</span><button type="button" className="v2-button ghost" onClick={() => navigate("/invoices")}>Open invoices →</button></article>
            <article className="v2-card v2-mini"><p className="v2-eyebrow">Proofs</p><h3>{summary.proofs}</h3><span>Completion proof packs.</span><button type="button" className="v2-button ghost" onClick={() => navigate("/proof-to-paid")}>Open proofs →</button></article>
          </div>

          <article className="v2-card v2-workspaces">
            <div className="v2-card-head"><div><p>Owner workspaces</p><h2>Open what you need</h2></div></div>
            <div className="v2-workspace-grid">
              {workspaces.map(([name, path, copy]) => <button className="v2-workspace-tile" type="button" onClick={() => navigate(path)} key={path}><b>{name}</b><span>{copy}</span></button>)}
            </div>
          </article>
        </section>
      </div>
      <Modal action={selectedAction} busy={busyActionId === selectedAction?.id} onClose={() => setSelectedAction(null)} onApprove={() => approve(selectedAction)} />
    </V2Shell>
  );
}
