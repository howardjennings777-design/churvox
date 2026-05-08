import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  approveAiAction,
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
const workspaceLinks = nav.slice(1);

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
  const [statusMessage, setStatusMessage] = useState("Checking your workspace...");
  const [busyActionId, setBusyActionId] = useState("");
  const [loading, setLoading] = useState(true);

  const goTo = (path) => path && navigate(path);

  const pendingActions = useMemo(
    () => actions.filter((action) => (action.status || "pending") === "pending"),
    [actions]
  );

  const dashboard = useMemo(() => {
    const decisions = pendingActions.length;
    const crew = pendingActions.filter((a) => a.module === "dispatch" || a.action_type === "assign_worker_to_job").length;
    const proofs = pendingActions.filter((a) => String(a.action_type || "").includes("proof")).length;
    const payments = pendingActions
      .filter((a) => a.module === "invoices")
      .reduce((sum, action) => sum + Number(action?.suggested_payload?.total || action?.suggested_payload?.amount || 0), 0);

    return { decisions, crew, proofs, payments };
  }, [pendingActions]);

  const stats = [
    { label: "Decisions", value: dashboard.decisions, tone: "blue", copy: dashboard.decisions ? "Needs review" : "All clear", path: null },
    { label: "Crew needed", value: dashboard.crew, tone: "orange", copy: dashboard.crew ? "Dispatch review" : "Covered", path: "/dispatch" },
    { label: "Payments", value: formatMoney(dashboard.payments), tone: "green", copy: dashboard.payments ? "Ready to chase" : "Clear", path: "/invoices" },
    { label: "Job proofs", value: dashboard.proofs, tone: "purple", copy: dashboard.proofs ? "Needs review" : "Clear", path: "/proof-to-paid" },
  ];

  useEffect(() => {
    let alive = true;
    setLoading(true);
    loadAiOperatorQueue().then((result) => {
      if (!alive) return;
      const nextActions = result.actions || [];
      setActions(nextActions);
      setStatusMessage(
        result.ok
          ? nextActions.length
            ? "You have work ready to review."
            : "Everything is up to date."
          : "Workspace check is unavailable."
      );
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const refreshDashboard = async () => {
    setLoading(true);
    setStatusMessage("Refreshing your workspace...");
    const result = await runAiDailyCheck();
    const nextActions = result.actions || [];
    setActions(nextActions);
    setStatusMessage(
      result.ok
        ? nextActions.length
          ? "Dashboard refreshed. Decisions are ready."
          : "Dashboard refreshed. Everything is clear."
        : "Refresh failed. Try again shortly."
    );
    setLoading(false);
  };

  const prepareToday = async () => {
    setLoading(true);
    setStatusMessage("Updating today’s run sheet...");
    const result = await prepareTodayWithAi();
    const nextActions = result.actions || [];
    setActions(nextActions);
    setStatusMessage(
      result.ok
        ? nextActions.length
          ? "Today’s run sheet is ready for review."
          : "Today’s run sheet is clear."
        : "Could not update today’s run sheet."
    );
    setLoading(false);
  };

  const approveAction = async (action) => {
    if (!action) return;
    setBusyActionId(action.id);
    const result = await approveAiAction(action);
    if (result.ok) {
      setActions((current) => current.filter((item) => item.id !== action.id));
      setStatusMessage(result.data?.message || "Action approved and completed.");
    } else {
      setStatusMessage(result.message || "Could not complete this action.");
    }
    setBusyActionId("");
    setSelectedAction(null);
  };

  const firstAction = pendingActions[0] || null;
  const dispatchActions = pendingActions.filter((a) => a.module === "dispatch" || a.action_type === "assign_worker_to_job");
  const invoiceActions = pendingActions.filter((a) => a.module === "invoices");
  const proofActions = pendingActions.filter((a) => String(a.action_type || "").includes("proof"));

  return (
    <main className="pcx-shell smart-hub-v5">
      <aside className="pcx-sidebar">
        <button className="pcx-logo" onClick={() => goTo("/dashboard")} aria-label="Go to Smart Hub">
          <img src="/churvox-logo.svg" alt="Churvox" />
        </button>
        <nav>
          {nav.map(([item, path], index) => (
            <button
              key={item}
              onClick={() => goTo(path)}
              className={location.pathname === path || (path === "/dashboard" && location.pathname === "/overview") ? "active" : ""}
            >
              <i>{navIcons[index] || "•"}</i>{item}
            </button>
          ))}
        </nav>
        <button className="pcx-owner" onClick={() => goTo("/settings")}>
          <i /><div><b>Business owner</b><small>Live workspace</small></div><span>⌄</span>
        </button>
      </aside>

      <section className="pcx-main sh-main">
        <header className="sh-topbar">
          <span className={`sh-live-dot ${dashboard.decisions ? "needs" : "clear"}`}>{statusMessage}</span>
          <div>
            <button onClick={() => goTo("/notifications")}>Alerts <b>{dashboard.decisions}</b></button>
            <button onClick={() => goTo("/settings")}>Settings</button>
          </div>
        </header>

        <section className="sh-hero">
          <div className="sh-hero-copy">
            <p>Today’s control room</p>
            <h1>Smart Hub</h1>
            <span>One clean view of the work that matters today. Jobs, payments, proofs, and owner decisions are checked in the background.</span>
            <div>
              <button onClick={prepareToday}>Refresh dashboard</button>
              <button className="secondary" onClick={() => firstAction && setSelectedAction(firstAction)} disabled={!firstAction}>Review decisions</button>
            </div>
          </div>

          <div className="sh-decision-card">
            <small>Owner decisions</small>
            <b>{dashboard.decisions}</b>
            <span>{loading ? "Checking..." : dashboard.decisions ? "Ready for review" : "All clear"}</span>
            <button onClick={refreshDashboard}>Refresh now</button>
          </div>
        </section>

        <section className="sh-stats">
          {stats.map((stat) => (
            <button key={stat.label} className={`sh-stat sh-stat--${stat.tone}`} onClick={() => stat.path ? goTo(stat.path) : firstAction && setSelectedAction(firstAction)}>
              <b>{stat.value}</b>
              <span>{stat.label}</span>
              <small>{stat.copy}</small>
            </button>
          ))}
        </section>

        <section className="sh-grid">
          <DashboardPanel eyebrow="Review queue" title="Needs your decision" count={dashboard.decisions}>
            {loading ? (
              <EmptyState title="Checking workspace" copy="Refreshing your jobs, invoices, proofs and customer follow-ups." />
            ) : pendingActions.length ? (
              pendingActions.slice(0, 5).map((action) => (
                <ActionRow key={action.id} action={action} busy={busyActionId === action.id} onOpen={() => setSelectedAction(action)} onApprove={() => approveAction(action)} />
              ))
            ) : (
              <EmptyState title="All clear" copy="Nothing needs your decision right now." />
            )}
          </DashboardPanel>

          <DashboardPanel eyebrow="Dispatch" title="Crew and job checks" action="Open dispatch" onAction={() => goTo("/dispatch")}>
            {dispatchActions.length ? dispatchActions.slice(0, 4).map((action) => (
              <SignalRow key={action.id} title={action.title} copy={action.summary} status="Review" onClick={() => setSelectedAction(action)} />
            )) : <EmptyState title="All covered" copy="No unassigned or conflicting jobs need attention." />}
          </DashboardPanel>

          <div className="sh-side-stack">
            <Mini title="Payments" value={formatMoney(dashboard.payments)} copy="Invoice follow-ups ready to check" action="Open invoices" onClick={() => invoiceActions[0] ? setSelectedAction(invoiceActions[0]) : goTo("/invoices")} />
            <Mini title="Job proofs" value={dashboard.proofs} copy="Completion photos and proof packs" action="Open proofs" onClick={() => proofActions[0] ? setSelectedAction(proofActions[0]) : goTo("/proof-to-paid")} />
          </div>

          <article className="sh-workspaces">
            <div className="sh-panel-head"><p>Owner workspaces</p><h2>Open what you need</h2></div>
            <div>
              {workspaceLinks.map(([name, path]) => (
                <button key={name} onClick={() => goTo(path)}>
                  <i>▦</i><b>{name}</b><small>{name === "Automation" ? "Rules & triggers" : name === "Reports" ? "Business insights" : "Open workspace"}</small>
                </button>
              ))}
            </div>
          </article>
        </section>
      </section>

      {selectedAction && <ActionModal action={selectedAction} busy={busyActionId === selectedAction.id} onClose={() => setSelectedAction(null)} onApprove={() => approveAction(selectedAction)} />}
    </main>
  );
}

function DashboardPanel({ eyebrow, title, count, action, onAction, children }) {
  return (
    <article className="sh-panel">
      <div className="sh-panel-head">
        <div><p>{eyebrow}</p><h2>{title}</h2></div>
        {typeof count !== "undefined" ? <b>{count}</b> : action ? <button onClick={onAction}>{action} →</button> : null}
      </div>
      {children}
    </article>
  );
}

function ActionRow({ action, busy, onOpen, onApprove }) {
  return (
    <div className="sh-action-row">
      <button onClick={onOpen}><b>{action.title}</b><span>{action.summary}</span></button>
      <button className="primary" onClick={onApprove}>{busy ? "Running..." : "Approve"}</button>
    </div>
  );
}

function SignalRow({ title, copy, status, onClick }) {
  return (
    <button className="sh-signal-row" onClick={onClick}>
      <b>{title}</b><span>{copy}</span><em>{status}</em>
    </button>
  );
}

function Mini({ title, value, copy, action, onClick }) {
  return (
    <div className="sh-mini">
      <p>{title}</p><h3>{value}</h3><span>{copy}</span><button onClick={onClick}>{action} →</button>
    </div>
  );
}

function EmptyState({ title, copy }) {
  return <div className="sh-empty"><b>{title}</b><span>{copy}</span></div>;
}

function ActionModal({ action, busy, onClose, onApprove }) {
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
