import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  approveAiAction,
  askBusinessAi,
  loadAiOperatorQueue,
  prepareTodayWithAi,
  runAiDailyCheck,
} from "../lib/aiOperator";

const nav = [
  ["Smart Hub", "/dashboard"],
  ["Jobs", "/jobs"],
  ["Dispatch", "/dispatch"],
  ["Clients", "/clients"],
  ["Job Proofs", "/proof-to-paid"],
  ["Quotes", "/quotes"],
  ["Invoices", "/invoices"],
  ["Team", "/team"],
  ["Payroll", "/payroll"],
  ["Automation", "/automation"],
  ["Reports", "/reports"],
  ["Messages", "/sms"],
  ["Integrations", "/integrations"],
  ["Billing", "/plans"],
  ["Settings", "/settings"],
];
const navIcons = ["✦", "◇", "⌘", "♙", "▣", "▤", "▥", "♙", "$", "⚡", "▧", "◌", "⛓", "◫", "⚙"];
const workspaces = nav.slice(1);

const formatMoney = (value) => {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number <= 0) return "$0";
  if (number >= 1000) return `$${(number / 1000).toFixed(1)}k`;
  return `$${number.toFixed(0)}`;
};

export default function SmartHubHardReset() {
  const navigate = useNavigate();
  const location = useLocation();
  const [actions, setActions] = useState([]);
  const [selectedAction, setSelectedAction] = useState(null);
  const [operatorMessage, setOperatorMessage] = useState("Checking your workspace...");
  const [busyActionId, setBusyActionId] = useState("");
  const [askOpen, setAskOpen] = useState(false);
  const [askQuestion, setAskQuestion] = useState("");
  const [askAnswer, setAskAnswer] = useState("");
  const [loading, setLoading] = useState(true);

  const goTo = (path) => {
    if (!path) return;
    navigate(path);
  };

  const pendingActions = useMemo(
    () => actions.filter((action) => (action.status || "pending") === "pending"),
    [actions]
  );

  const metrics = useMemo(() => {
    const pending = pendingActions.length;
    const dispatch = pendingActions.filter((a) => a.module === "dispatch" || a.action_type === "assign_worker_to_job").length;
    const proofs = pendingActions.filter((a) => String(a.action_type || "").includes("proof")).length;
    const moneyWaiting = pendingActions
      .filter((a) => a.module === "invoices")
      .reduce((sum, action) => sum + Number(action?.suggested_payload?.total || action?.suggested_payload?.amount || 0), 0);

    return [
      ["Crew needed", String(dispatch), "orange"],
      ["Payments to chase", formatMoney(moneyWaiting), "green"],
      ["Decisions", String(pending), "blue"],
      ["Job proofs", String(proofs), "purple"],
    ];
  }, [pendingActions]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    loadAiOperatorQueue().then((result) => {
      if (!alive) return;
      setActions(result.actions || []);
      setOperatorMessage(
        result.ok
          ? result.actions?.length
            ? "Work is ready for review."
            : "Everything is up to date."
          : "Workspace check is unavailable. No placeholder data is shown."
      );
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const refreshOperator = async () => {
    setLoading(true);
    setOperatorMessage("Checking jobs, payments, quotes and dispatch...");
    const result = await runAiDailyCheck();
    setActions(result.actions || []);
    setOperatorMessage(
      result.ok
        ? result.actions?.length
          ? "Workspace refreshed. Decisions are ready."
          : "Workspace refreshed. Everything is clear."
        : "Refresh failed. No placeholder actions were created."
    );
    setLoading(false);
  };

  const preparePlan = async () => {
    setLoading(true);
    setOperatorMessage("Updating today’s plan...");
    const result = await prepareTodayWithAi();
    setActions(result.actions || []);
    setOperatorMessage(
      result.ok
        ? result.actions?.length
          ? "Today’s plan is ready for review."
          : "Today’s plan is clear."
        : "Could not update today’s plan. No placeholder actions were created."
    );
    setLoading(false);
  };

  const approveAction = async (action) => {
    if (!action) return;
    setBusyActionId(action.id);
    const result = await approveAiAction(action);
    if (result.ok) {
      setActions((current) => current.filter((item) => item.id !== action.id));
      setOperatorMessage(result.data?.message || `${action.title} approved and completed.`);
    } else {
      setOperatorMessage(result.message || "Could not complete this action. Nothing was marked complete.");
    }
    setBusyActionId("");
    setSelectedAction(null);
  };

  const askAi = async (question) => {
    const finalQuestion = question || askQuestion;
    if (!finalQuestion) return;
    setAskOpen(true);
    setAskQuestion(finalQuestion);
    setAskAnswer("Checking your business data...");
    const result = await askBusinessAi(finalQuestion);
    setAskAnswer(result.answer || "No live answer was returned.");
  };

  const firstAction = pendingActions[0] || actions[0] || null;
  const invoiceAction = actions.find((a) => a.module === "invoices") || null;
  const proofAction = actions.find((a) => String(a.action_type || "").includes("proof")) || null;

  return (
    <main className="pcx-shell">
      <aside className="pcx-sidebar">
        <button className="pcx-logo" onClick={() => goTo("/dashboard")} aria-label="Go to Smart Hub"><img src="/churvox-logo.svg" alt="Churvox" /></button>
        <nav>{nav.map(([item, path], index) => <button key={item} onClick={() => goTo(path)} className={location.pathname === path || (path === "/dashboard" && location.pathname === "/overview") ? "active" : ""}><i>{navIcons[index] || "•"}</i>{item}</button>)}</nav>
        <button className="pcx-owner" onClick={() => goTo("/settings")}><i /><div><b>Business owner</b><small>Live workspace</small></div><span>⌄</span></button>
      </aside>

      <section className="pcx-main">
        <header className="pcx-header">
          <div className="pcx-header-top"><span><i /> {operatorMessage}</span><nav><button onClick={() => goTo("/notifications")}>Alerts <b>{pendingActions.length}</b></button><button onClick={() => goTo("/settings")}>Business workspace ▾</button></nav></div>
          <section className="pcx-header-grid">
            <div className="pcx-hero-copy"><p>Today</p><h1>Smart Hub</h1><span>Today’s jobs, payments and customer work are checked in the background. You only see something here when it needs your decision.</span><div><button onClick={preparePlan}>Update today →</button><button onClick={() => firstAction && setSelectedAction(firstAction)} disabled={!firstAction}>Review decisions</button></div></div>
            <div className="pcx-radar"><b>{pendingActions.length}</b><span>Decisions</span><em>{loading ? "Checking workspace" : pendingActions.length ? "Ready for review" : "All clear"}</em><button onClick={refreshOperator}>Update now</button></div>
            <div className="pcx-live"><p><i /> Business pulse</p>{metrics.map(([label, value, tone]) => <button key={label} onClick={() => firstAction && setSelectedAction(firstAction)}><span>{label}</span><b className={tone}>{value}</b><em>›</em></button>)}</div>
          </section>
        </header>

        <section className="pcx-metrics">{metrics.map(([label, value, tone]) => <button key={label} onClick={() => firstAction && setSelectedAction(firstAction)}><b className={tone}>{value}</b><span>{label}</span><small>{firstAction ? "Open" : "Clear"}</small></button>)}</section>

        <section className="pcx-grid">
          <article className="pcx-card pcx-approvals">
            <Head eyebrow="Review queue" title="Needs your decision" badge={String(pendingActions.length)} />
            {loading ? <EmptyState title="Checking workspace" copy="Churvox is checking jobs, invoices, quotes, workers and dispatch." /> : actions.length ? actions.map((action) => <AiApprovalCard key={action.id} action={action} busy={busyActionId === action.id} onOpen={() => setSelectedAction(action)} onApprove={() => approveAction(action)} />) : <EmptyState title="All clear" copy="No job, payment, proof or customer decision needs you right now." />}
          </article>
          <article className="pcx-card pcx-jobs">
            <Head eyebrow="Dispatch" title="Job signals" link="Open dispatch →" onLink={() => goTo("/dispatch")} />
            {actions.filter((a) => a.module === "dispatch").length ? actions.filter((a) => a.module === "dispatch").map((action) => <button className="pcx-job" key={action.id} onClick={() => setSelectedAction(action)}><b>{action.target_record_id || "Job"}</b><span>{action.title}</span><mark className="needs-crew">Ready</mark><span>{action.summary}</span><em>Review</em></button>) : <EmptyState title="All clear" copy="No unassigned or clashing jobs need attention right now." />}
          </article>
          <aside className="pcx-rail"><Mini title="Payments" value={metrics[1][1]} copy="Invoice follow-ups ready to check" action="Open invoices" onClick={() => invoiceAction ? setSelectedAction(invoiceAction) : goTo("/invoices")} /><Mini title="Job proofs" value={metrics[3][1]} copy="Completion photos and proof packs" action="Open proofs" onClick={() => proofAction ? setSelectedAction(proofAction) : goTo("/proof-to-paid")} /><div className="pcx-sms"><em>LIVE</em><p>Customer drafts</p><h3>{actions.filter((a) => ["create_quote_followup", "create_invoice_reminder", "prepare_customer_message"].includes(a.action_type)).length}</h3><span>ready to check</span><div><b>Review</b><small>before send</small></div><button onClick={() => askAi("Prepare customer messages from real business data")}>Prepare drafts →</button></div></aside>
          <article className="pcx-card pcx-work pcx-work--wide"><Head eyebrow="Owner workspaces" title="Command tools" /> <div>{workspaces.map(([w, path]) => <button key={w} onClick={() => goTo(path)}><i>▦</i><b>{w}</b><small>{w === "Automation" ? "Rules & triggers" : w === "Reports" ? "Business insights" : "Open workspace"}</small></button>)}</div></article>
        </section>
      </section>

      {selectedAction && <AiActionModal action={selectedAction} busy={busyActionId === selectedAction.id} onClose={() => setSelectedAction(null)} onApprove={() => approveAction(selectedAction)} />}
      {askOpen && <AskAiModal question={askQuestion} answer={askAnswer} onQuestion={setAskQuestion} onAsk={askAi} onClose={() => setAskOpen(false)} />}
    </main>
  );
}

function Head({ eyebrow, title, badge, link, onLink }) { return <div className="pcx-head"><div><p>{eyebrow}</p><h2>{title}</h2></div>{badge ? <b>{badge}</b> : link ? <button onClick={onLink}>{link}</button> : null}</div>; }
function Mini({ title, value, copy, action, onClick }) { return <div className="pcx-mini"><p>{title}</p><h3>{value}</h3><span>{copy}</span><button onClick={onClick} disabled={!onClick}>{action} →</button></div>; }
function EmptyState({ title, copy }) { return <div className="pcx-empty"><b>{title}</b><span>{copy}</span></div>; }

function AiApprovalCard({ action, busy, onOpen, onApprove }) {
  const done = action.status === "completed" || action.status === "approved";
  return (
    <div className={`pcx-approval ${done ? "done" : ""}`}>
      <i>{done ? "✓" : "✦"}</i>
      <div onClick={onOpen} role="button" tabIndex={0}><b>{action.title}</b><span>{action.summary}</span></div>
      <button onClick={done ? onOpen : onApprove}>{busy ? "Running..." : done ? "View" : action.action_type === "create_invoice_draft" ? "Draft invoice" : action.action_type === "create_quote_followup" ? "Review" : "Approve"}</button>
    </div>
  );
}

function AiActionModal({ action, busy, onClose, onApprove }) {
  return (
    <div className="ai-modal-backdrop" onClick={onClose}>
      <section className="ai-modal" onClick={(e) => e.stopPropagation()}>
        <button className="ai-modal-close" onClick={onClose}>×</button>
        <p className="ai-modal-eyebrow">Prepared action • {action.module}</p>
        <h2>{action.title}</h2>
        <p className="ai-modal-summary">{action.summary}</p>
        <div className="ai-modal-reason"><b>Why this is recommended</b><span>{action.reason}</span></div>
        <div className="ai-modal-grid"><span><b>{action.confidence || 0}%</b>Confidence</span><span><b>{action.risk_level || "review"}</b>Risk level</span><span><b>{action.target_record_id || "—"}</b>Target</span></div>
        <div className="ai-modal-preview"><b>Preview</b><span>{action.preview_text || "This action is ready for owner review."}</span></div>
        <footer><button onClick={onClose}>Not now</button><button className="primary" onClick={onApprove}>{busy ? "Running..." : "Approve and run"}</button></footer>
      </section>
    </div>
  );
}

function AskAiModal({ question, answer, onQuestion, onAsk, onClose }) {
  return (
    <div className="ai-modal-backdrop" onClick={onClose}>
      <section className="ai-modal" onClick={(e) => e.stopPropagation()}>
        <button className="ai-modal-close" onClick={onClose}>×</button>
        <p className="ai-modal-eyebrow">Ask your business</p>
        <h2>Ask Churvox</h2>
        <div className="ai-modal-input"><input value={question} onChange={(e) => onQuestion(e.target.value)} placeholder="Ask what to prepare next..." /><button onClick={() => onAsk(question)}>Ask</button></div>
        {answer && <div className="ai-modal-preview"><b>Response</b><span>{answer}</span></div>}
      </section>
    </div>
  );
}
