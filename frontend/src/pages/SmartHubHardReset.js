import React, { useEffect, useMemo, useState } from "react";
import {
  DEMO_AI_ACTIONS,
  approveAiAction,
  askBusinessAi,
  loadAiOperatorQueue,
  prepareTodayWithAi,
  runAiDailyCheck,
} from "../lib/aiOperator";

const nav = ["Smart Hub", "Jobs", "Clients", "Quotes", "Invoices", "Dispatch", "Team", "Automation", "Reports"];

const jobs = [
  ["J-1056", "Smith Residence", "In Progress", "Install air con unit", "Today 2:30pm"],
  ["J-1047", "Wilson Plumbing", "Needs Crew", "Assign technician", "Today 11:00am"],
  ["J-1042", "Taylor Electrical", "Scheduled", "Tomorrow 9:00am", "Tomorrow"],
  ["J-1038", "Brown Renovation", "In Progress", "Plastering stage", "Today 4:00pm"],
];

const metrics = [
  ["Jobs needing crew", "6", "orange"],
  ["Money waiting", "$6.8k", "green"],
  ["Approvals ready", "8", "blue"],
  ["Proofs pending", "3", "purple"],
];

const workspaces = ["Jobs", "Clients", "Quotes", "Invoices", "Dispatch", "Team", "Automation", "Reports"];

export default function SmartHubHardReset() {
  const [actions, setActions] = useState(DEMO_AI_ACTIONS);
  const [selectedAction, setSelectedAction] = useState(null);
  const [operatorMessage, setOperatorMessage] = useState("AI Operator is ready.");
  const [busyActionId, setBusyActionId] = useState("");
  const [askOpen, setAskOpen] = useState(false);
  const [askQuestion, setAskQuestion] = useState("");
  const [askAnswer, setAskAnswer] = useState("");

  const pendingActions = useMemo(
    () => actions.filter((action) => (action.status || "pending") === "pending"),
    [actions]
  );

  useEffect(() => {
    let alive = true;
    loadAiOperatorQueue().then((result) => {
      if (!alive) return;
      setActions(result.actions || DEMO_AI_ACTIONS);
      if (!result.ok && result.message) {
        setOperatorMessage("Live AI endpoint is warming up. Showing prepared operator actions.");
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const refreshOperator = async () => {
    setOperatorMessage("AI is scanning jobs, invoices, quotes and dispatch...");
    const result = await runAiDailyCheck();
    setActions(result.actions || DEMO_AI_ACTIONS);
    setOperatorMessage(result.ok ? "AI scan complete. Actions are ready for approval." : "AI scan fallback loaded. Actions are ready for approval.");
  };

  const preparePlan = async () => {
    setOperatorMessage("AI is preparing today’s owner approval plan...");
    const result = await prepareTodayWithAi();
    setActions(result.actions || DEMO_AI_ACTIONS);
    setOperatorMessage(result.ok ? "Today’s AI plan is ready." : "Prepared plan loaded. Backend execution will attach as endpoints come online.");
  };

  const approveAction = async (action) => {
    setBusyActionId(action.id);
    const result = await approveAiAction(action);
    setActions((current) =>
      current.map((item) =>
        item.id === action.id
          ? {
              ...item,
              status: result.ok ? "completed" : "approved",
              approved_at: new Date().toISOString(),
            }
          : item
      )
    );
    setOperatorMessage(
      result.ok
        ? `${action.title} approved and executed.`
        : `${action.title} approved locally. Backend execution hook is queued.`
    );
    setBusyActionId("");
    setSelectedAction(null);
  };

  const askAi = async (question) => {
    const finalQuestion = question || askQuestion;
    if (!finalQuestion) return;
    setAskOpen(true);
    setAskQuestion(finalQuestion);
    setAskAnswer("AI is preparing the best action...");
    const result = await askBusinessAi(finalQuestion);
    setAskAnswer(result.answer || "AI prepared a recommendation.");
  };

  return (
    <main className="pcx-shell">
      <aside className="pcx-sidebar">
        <div className="pcx-logo"><img src="/churvox-logo.svg" alt="Churvox" /></div>
        <nav>{nav.map((item, index) => <button key={item} className={index === 0 ? "active" : ""}><i>{["✦", "◇", "♙", "▤", "▥", "⌘", "♙", "⚡", "▧"][index]}</i>{item}</button>)}</nav>
        <div className="pcx-owner"><i /><div><b>Alex Thompson</b><small>Owner • Online</small></div><span>⌄</span></div>
      </aside>

      <section className="pcx-main">
        <header className="pcx-header">
          <div className="pcx-header-top"><span><i /> {operatorMessage}</span><nav><button>Alerts <b>3</b></button><button onClick={() => setAskOpen(true)}>Ask AI</button><button>Thompson Trade Services ▾</button></nav></div>
          <section className="pcx-header-grid">
            <div className="pcx-hero-copy"><p>Good morning, Alex</p><h1>AI Command Centre</h1><span>Churvox has prepared today’s admin, dispatch and money actions. You approve — AI does the work.</span><div><button onClick={preparePlan}>Approve today’s plan →</button><button onClick={() => setSelectedAction(pendingActions[0] || actions[0])}>Open action queue</button></div></div>
            <div className="pcx-radar"><b>{pendingActions.length || actions.length}</b><span>AI-prepared actions</span><em>Dispatch • invoices • follow-ups • proofs</em><button onClick={refreshOperator}>Review all</button></div>
            <div className="pcx-live"><p><i /> Live business pulse</p>{metrics.map(([label, value, tone]) => <button key={label} onClick={() => setSelectedAction(pendingActions[0] || actions[0])}><span>{label}</span><b className={tone}>{value}</b><em>›</em></button>)}</div>
          </section>
        </header>

        <section className="pcx-metrics">{metrics.map(([label, value, tone]) => <button key={label} onClick={() => setSelectedAction(pendingActions[0] || actions[0])}><b className={tone}>{value}</b><span>{label}</span><small>View detail</small></button>)}</section>

        <section className="pcx-grid">
          <article className="pcx-card pcx-approvals"><Head eyebrow="AI approval queue" title="Prepared for owner approval" badge={String(pendingActions.length || actions.length)} />{actions.map((action) => <AiApprovalCard key={action.id} action={action} busy={busyActionId === action.id} onOpen={() => setSelectedAction(action)} onApprove={() => approveAction(action)} />)}</article>
          <article className="pcx-card pcx-jobs"><Head eyebrow="Live jobs" title="Today’s field board" link="Open dispatch →" /><div className="pcx-job-head"><span>Job</span><span>Client</span><span>Status</span><span>Next step</span><span>ETA</span></div>{jobs.map(([id, client, status, step, eta]) => <button className="pcx-job" key={id} onClick={() => setSelectedAction(pendingActions.find((a) => a.target_record_id === id) || pendingActions[0] || actions[0])}><b>{id}</b><span>{client}</span><mark className={status.toLowerCase().replace(" ", "-")}>{status}</mark><span>{step}</span><em>{eta}</em></button>)}</article>
          <aside className="pcx-rail"><Mini title="Cash Flow" value="$6,820" copy="8 invoices ready to chase" action="Prepare reminders" onClick={() => setSelectedAction(actions.find((a) => a.module === "invoices") || actions[0])} /><Mini title="Proofs Pending" value="3" copy="Worker submissions waiting review" action="Review proofs" onClick={() => setSelectedAction(actions[0])} /><div className="pcx-sms"><em>HOT</em><p>SMS Credits</p><h3>12,540</h3><span>credits remaining</span><div><b>78%</b><small>remaining</small></div><button onClick={() => askAi("Prepare customer SMS reminders for overdue invoices")}>Buy SMS Credits →</button></div></aside>
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
function Mini({ title, value, copy, action, onClick }) { return <div className="pcx-mini"><p>{title}</p><h3>{value}</h3><span>{copy}</span><button onClick={onClick}>{action} →</button></div>; }

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
        <div className="ai-modal-grid"><span><b>{action.confidence || 80}%</b>Confidence</span><span><b>{action.risk_level || "low"}</b>Risk level</span><span><b>{action.target_record_id || "—"}</b>Target</span></div>
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
