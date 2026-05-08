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
  const [operatorMessage, setOperatorMessage] = useState("Checking your live workspace...");
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
      ["Jobs needing crew", String(dispatch), "orange"],
      ["Money waiting", formatMoney(moneyWaiting), "green"],
      ["Review items", String(pending), "blue"],
      ["Proofs pending", String(proofs), "purple"],
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
            ? "Work is prepared and waiting for review."
            : "No owner review needed right now."
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
    setOperatorMessage("Checking jobs, invoices, quotes and dispatch...");
    const result = await runAiDailyCheck();
    setActions(result.actions || []);
    setOperatorMessage(
      result.ok
        ? result.actions?.length
          ? "Workspace refreshed. Items are waiting for review."
          : "Workspace refreshed. Nothing needs review right now."
        : "Refresh failed. No placeholder actions were created."
    );
    setLoading(false);
  };

  const preparePlan = async () => {
    setLoading(true);
    setOperatorMessage("Preparing today’s workspace...");
    const result = await prepareTodayWithAi();
    setActions(result.actions || []);
    setOperatorMessage(
      result.ok
        ? result.actions?.length
          ? "Today’s workspace is ready for review."
          : "Today’s workspace is clear. Nothing needs review."
        : "Could not prepare today’s workspace. No placeholder actions were created."
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
    setAskAnswer("Checking your live business data...");
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
          <div className="pcx-header-top"><span><i /> {operatorMessage}</span><nav><button onClick={() => goTo("/notifications")}>Alerts <b>{pendingActions.length}</b></button><button onClick={() => setAskOpen(true)}>Ask Churvox</button><button onClick={() => goTo("/settings")}>Business workspace ▾</button></nav></div>
          <section className="pcx-header-grid">
            <div className="pcx-hero-copy"><p>Good morning</p><h1>Smart Hub</h1><span>Churvox keeps the day moving in the background. You only see work here when something needs a decision.</span><div><button onClick={preparePlan}>Refresh today’s plan →</button><button onClick={() => firstAction && setSelectedAction(firstAction)} disabled={!firstAction}>Open review queue</button></div></div>
            <div className="pcx-radar"><b>{pendingActions.length}</b><span>Review items</span><em>{loading ? "Checking live workspace" : pendingActions.length ? "Ready for owner review" : "Nothing urgent found"}</em><button onClick={refreshOperator}>Refresh now</button></div>
            <div className="pcx-live"><p><i /> Business pulse</p>{metrics.map(([label, value, tone]) => <button key={label} onClick={() => firstAction && setSelectedAction(firstAction)}><span>{label}</span><b className={tone}>{value}</b><em>›</em></button>)}</div>
          </section>
        </header>

        <section className="pcx-metrics">{metrics.map(([label, value, tone]) => <button key={label} onClick={() => firstAction && setSelectedAction(firstAction)}><b className={tone}>{value}</b><span>{label}</span><small>{firstAction ? "View detail" : "No action"}</small></button>)}</section>

        <section className="pcx-grid">
          <article className="pcx-card pcx-approvals">
            <Head eyebrow="Review queue" title="Owner decisions" badge={String(pendingActions.length)} />
            {loading ? <EmptyState title="Checking workspace" copy="Churvox is checking jobs, invoices, quotes, workers and dispatch." /> : actions.length ? actions.map((action) => <AiApprovalCard key={action.id} action={action} busy={busyActionId === action.id} onOpen={() => setSelectedAction(action)} onApprove={() => approveAction(action)} />) : <EmptyState title="Nothing waiting" copy="There are no prepared owner decisions from your live data right now." />}
          </article>
          <article className="pcx-card pcx-jobs">
            <Head eyebrow="Live jobs" title="Dispatch signals" link="Open dispatch →" onLink={() => goTo("/dispatch")} />
            {actions.filter((a) => a.module === "dispatch").length ? actions.filter((a) => a.module === "dispatch").map((action) => <button className="pcx-job" key={action.id} onClick={() => setSelectedAction(action)}><b>{action.target_record_id || "Job"}</b><span>{action.title}</span><mark className="needs-crew">Ready</mark><span>{action.summary}</span><em>Review</em></button>) : <EmptyState title="No dispatch issues" copy="No unassigned or conflicted jobs need owner review right now." />}
          </article>
          <aside className="pcx-rail"><Mini title="Cash Flow" value={metrics[1][1]} copy="Invoice work prepared from live data" action="Open invoices" onClick={() => invoiceAction ? setSelectedAction(invoiceAction) : goTo("/invoices")} /><Mini title="Proofs Pending" value={metrics[3][1]} copy="Job proof items waiting for review" action="Open proofs" onClick={() => proofAction ? setSelectedAction(proofAction) : goTo("/jobs")} /><div className="pcx-sms"><em>LIVE</em><p>Messages</p><h3>{actions.filter((a) => ["create_quote_followup", "create_invoice_reminder", "prepare_customer_message"].includes(a.action_type)).length}</h3><span>drafts ready</span><div><b>Review</b><small>before send</small></div><button onClick={() => askAi("Prepare customer messages from real business data")}>Prepare messages →</button></div></aside>
          <article className="pcx-card pcx-ask"><Head eyebrow="Ask your business" title="Ask Churvox" /><div className="pcx-prompts"><button onClick={() => askAi("Who should I assign next?")}>Who should I assign next?</button><button onClick={() => askAi("Which invoices should I chase first?")}>Which invoices should I chase first?</button><button onClick={() => askAi("Draft customer messages for today")}>Draft customer messages for today</button></div><div className="pcx-input"><input value={askQuestion} onChange={(e) => setAskQuestion(e.target.value)} placeholder="Ask Churvox what to prepare..." /><button onClick={() => askAi()}>Ask →</button></div></article>
          <article className="pcx-card pcx-work"><Head eyebrow="Owner workspaces" title="Command tools" /> <div>{workspaces.map(([w, path]) => <button key={w} onClick={() => goTo(path)}><i>▦</i><b>{w}</b><small>{w === "Automation" ? "Rules & triggers" : w === "Reports" ? "Business insights" : "Open workspace"}</small></button>)}</div></article>
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
