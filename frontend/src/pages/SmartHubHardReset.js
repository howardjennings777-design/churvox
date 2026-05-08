import React, { useEffect, useMemo, useState } from "react";
import {
  approveAiAction,
  askBusinessAi,
  loadAiOperatorQueue,
  prepareTodayWithAi,
  runAiDailyCheck,
} from "../lib/aiOperator";

const nav = ["Smart Hub", "Jobs", "Clients", "Quotes", "Invoices", "Dispatch", "Team", "Automation", "Reports"];
const workspaces = ["Jobs", "Clients", "Quotes", "Invoices", "Dispatch", "Team", "Automation", "Reports"];

const formatMoney = (value) => {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number <= 0) return "$0";
  if (number >= 1000) return `$${(number / 1000).toFixed(1)}k`;
  return `$${number.toFixed(0)}`;
};

export default function SmartHubHardReset() {
  const [actions, setActions] = useState([]);
  const [selectedAction, setSelectedAction] = useState(null);
  const [operatorMessage, setOperatorMessage] = useState("AI Operator is loading real business data...");
  const [busyActionId, setBusyActionId] = useState("");
  const [askOpen, setAskOpen] = useState(false);
  const [askQuestion, setAskQuestion] = useState("");
  const [askAnswer, setAskAnswer] = useState("");
  const [loading, setLoading] = useState(true);

  const pendingActions = useMemo(
    () => actions.filter((action) => (action.status || "pending") === "pending"),
    [actions]
  );

  const metrics = useMemo(() => {
    const pending = pendingActions.length;
    const dispatch = pendingActions.filter((a) => a.module === "dispatch" || a.action_type === "assign_worker_to_job").length;
    const invoices = pendingActions.filter((a) => a.module === "invoices").length;
    const proofs = pendingActions.filter((a) => String(a.action_type || "").includes("proof")).length;
    const moneyWaiting = pendingActions
      .filter((a) => a.module === "invoices")
      .reduce((sum, action) => sum + Number(action?.suggested_payload?.total || action?.suggested_payload?.amount || 0), 0);

    return [
      ["Jobs needing crew", String(dispatch), "orange"],
      ["Money waiting", formatMoney(moneyWaiting), "green"],
      ["Approvals ready", String(pending), "blue"],
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
            ? "AI Operator found real owner actions."
            : "No real AI actions need owner approval right now."
          : "AI Operator backend is not reachable yet. No fake data is shown."
      );
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const refreshOperator = async () => {
    setLoading(true);
    setOperatorMessage("AI is scanning real jobs, invoices, quotes and dispatch...");
    const result = await runAiDailyCheck();
    setActions(result.actions || []);
    setOperatorMessage(
      result.ok
        ? result.actions?.length
          ? "AI scan complete. Real actions are ready for approval."
          : "AI scan complete. No owner actions found right now."
        : "AI scan failed. No fake actions were created."
    );
    setLoading(false);
  };

  const preparePlan = async () => {
    setLoading(true);
    setOperatorMessage("AI is preparing today’s real owner approval plan...");
    const result = await prepareTodayWithAi();
    setActions(result.actions || []);
    setOperatorMessage(
      result.ok
        ? result.actions?.length
          ? "Today’s real AI plan is ready."
          : "Today’s plan is clear. No real actions need approval."
        : "Could not prepare today’s plan. No fake actions were created."
    );
    setLoading(false);
  };

  const approveAction = async (action) => {
    if (!action) return;
    setBusyActionId(action.id);
    const result = await approveAiAction(action);
    if (result.ok) {
      setActions((current) => current.filter((item) => item.id !== action.id));
      setOperatorMessage(result.data?.message || `${action.title} approved and executed.`);
    } else {
      setOperatorMessage(result.message || "AI approval failed. Nothing fake was marked complete.");
    }
    setBusyActionId("");
    setSelectedAction(null);
  };

  const askAi = async (question) => {
    const finalQuestion = question || askQuestion;
    if (!finalQuestion) return;
    setAskOpen(true);
    setAskQuestion(finalQuestion);
    setAskAnswer("AI is checking real business data...");
    const result = await askBusinessAi(finalQuestion);
    setAskAnswer(result.answer || "No live AI answer was returned.");
  };

  const firstAction = pendingActions[0] || actions[0] || null;
  const invoiceAction = actions.find((a) => a.module === "invoices") || null;
  const proofAction = actions.find((a) => String(a.action_type || "").includes("proof")) || null;

  return (
    <main className="pcx-shell">
      <aside className="pcx-sidebar">
        <div className="pcx-logo"><img src="/churvox-logo.svg" alt="Churvox" /></div>
        <nav>{nav.map((item, index) => <button key={item} className={index === 0 ? "active" : ""}><i>{["✦", "◇", "♙", "▤", "▥", "⌘", "♙", "⚡", "▧"][index]}</i>{item}</button>)}</nav>
        <div className="pcx-owner"><i /><div><b>Business owner</b><small>Live workspace</small></div><span>⌄</span></div>
      </aside>

      <section className="pcx-main">
        <header className="pcx-header">
          <div className="pcx-header-top"><span><i /> {operatorMessage}</span><nav><button>Alerts <b>{pendingActions.length}</b></button><button onClick={() => setAskOpen(true)}>Ask AI</button><button>Business workspace ▾</button></nav></div>
          <section className="pcx-header-grid">
            <div className="pcx-hero-copy"><p>Good morning</p><h1>AI Command Centre</h1><span>Churvox only shows real AI-prepared work from your business data. If there is nothing to approve, it stays clear.</span><div><button onClick={preparePlan}>Prepare today’s real plan →</button><button onClick={() => firstAction && setSelectedAction(firstAction)} disabled={!firstAction}>Open action queue</button></div></div>
            <div className="pcx-radar"><b>{pendingActions.length}</b><span>Real AI actions</span><em>{loading ? "Scanning live business data" : pendingActions.length ? "Ready for owner approval" : "Nothing urgent found"}</em><button onClick={refreshOperator}>Run real scan</button></div>
            <div className="pcx-live"><p><i /> Live business pulse</p>{metrics.map(([label, value, tone]) => <button key={label} onClick={() => firstAction && setSelectedAction(firstAction)}><span>{label}</span><b className={tone}>{value}</b><em>›</em></button>)}</div>
          </section>
        </header>

        <section className="pcx-metrics">{metrics.map(([label, value, tone]) => <button key={label} onClick={() => firstAction && setSelectedAction(firstAction)}><b className={tone}>{value}</b><span>{label}</span><small>{firstAction ? "View detail" : "No action"}</small></button>)}</section>

        <section className="pcx-grid">
          <article className="pcx-card pcx-approvals">
            <Head eyebrow="AI approval queue" title="Real actions only" badge={String(pendingActions.length)} />
            {loading ? <EmptyState title="Scanning business data" copy="AI is checking real jobs, invoices, quotes, workers and dispatch." /> : actions.length ? actions.map((action) => <AiApprovalCard key={action.id} action={action} busy={busyActionId === action.id} onOpen={() => setSelectedAction(action)} onApprove={() => approveAction(action)} />) : <EmptyState title="No real actions yet" copy="There are no AI-prepared owner approvals from your live data right now." />}
          </article>
          <article className="pcx-card pcx-jobs">
            <Head eyebrow="Live jobs" title="AI dispatch signals" link="Run scan →" />
            {actions.filter((a) => a.module === "dispatch").length ? actions.filter((a) => a.module === "dispatch").map((action) => <button className="pcx-job" key={action.id} onClick={() => setSelectedAction(action)}><b>{action.target_record_id || "Job"}</b><span>{action.title}</span><mark className="needs-crew">AI ready</mark><span>{action.summary}</span><em>Review</em></button>) : <EmptyState title="No dispatch actions" copy="AI has not found unassigned or conflicted jobs that need owner approval." />}
          </article>
          <aside className="pcx-rail"><Mini title="Cash Flow" value={metrics[1][1]} copy="Real invoice actions from AI scan" action="Review money" onClick={() => invoiceAction && setSelectedAction(invoiceAction)} /><Mini title="Proofs Pending" value={metrics[3][1]} copy="Real proof actions from AI scan" action="Review proofs" onClick={() => proofAction && setSelectedAction(proofAction)} /><div className="pcx-sms"><em>LIVE</em><p>Messages</p><h3>{actions.filter((a) => ["create_quote_followup", "create_invoice_reminder", "prepare_customer_message"].includes(a.action_type)).length}</h3><span>real drafts ready</span><div><b>AI</b><small>approval first</small></div><button onClick={() => askAi("Prepare customer messages from real business data")}>Prepare messages →</button></div></aside>
          <article className="pcx-card pcx-ask"><Head eyebrow="Ask your business" title="Tell AI what to prepare" /><div className="pcx-prompts"><button onClick={() => askAi("Who should I assign next?")}>Who should I assign next?</button><button onClick={() => askAi("Which invoices should I chase first?")}>Which invoices should I chase first?</button><button onClick={() => askAi("Draft customer messages for today")}>Draft customer messages for today</button></div><div className="pcx-input"><input value={askQuestion} onChange={(e) => setAskQuestion(e.target.value)} placeholder="Ask AI to prepare an action..." /><button onClick={() => askAi()}>Ask AI →</button></div></article>
          <article className="pcx-card pcx-work"><Head eyebrow="Owner workspaces" title="Command tools" /> <div>{workspaces.map(w => <button key={w}><i>▦</i><b>{w}</b><small>{w === "Automation" ? "Rules & AI triggers" : w === "Reports" ? "Business insights" : "Open workspace"}</small></button>)}</div></article>
        </section>
      </section>

      {selectedAction && <AiActionModal action={selectedAction} busy={busyActionId === selectedAction.id} onClose={() => setSelectedAction(null)} onApprove={() => approveAction(selectedAction)} />}
      {askOpen && <AskAiModal question={askQuestion} answer={askAnswer} onQuestion={setAskQuestion} onAsk={askAi} onClose={() => setAskOpen(false)} />}
    </main>
  );
}

function Head({ eyebrow, title, badge, link }) { return <div className="pcx-head"><div><p>{eyebrow}</p><h2>{title}</h2></div>{badge ? <b>{badge}</b> : link ? <button>{link}</button> : null}</div>; }
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
        <p className="ai-modal-eyebrow">AI prepared action • {action.module}</p>
        <h2>{action.title}</h2>
        <p className="ai-modal-summary">{action.summary}</p>
        <div className="ai-modal-reason"><b>Why AI recommends this</b><span>{action.reason}</span></div>
        <div className="ai-modal-grid"><span><b>{action.confidence || 0}%</b>Confidence</span><span><b>{action.risk_level || "review"}</b>Risk level</span><span><b>{action.target_record_id || "—"}</b>Target</span></div>
        <div className="ai-modal-preview"><b>Preview</b><span>{action.preview_text || "AI will prepare this action for owner approval."}</span></div>
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
        <h2>Tell AI what to prepare</h2>
        <div className="ai-modal-input"><input value={question} onChange={(e) => onQuestion(e.target.value)} placeholder="Ask AI what to do next..." /><button onClick={() => onAsk(question)}>Ask AI</button></div>
        {answer && <div className="ai-modal-preview"><b>AI response</b><span>{answer}</span></div>}
      </section>
    </div>
  );
}
