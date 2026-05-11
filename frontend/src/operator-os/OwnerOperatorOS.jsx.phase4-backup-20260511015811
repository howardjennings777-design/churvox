import React, { useMemo, useState } from "react";
import "./operator-phase3.css";

const ACTIONS = [
  {
    id: "assign-job",
    title: "Assign the next job",
    meta: "Dispatch recommendation",
    type: "dispatch",
    primary: "Approve assignment",
    summary:
      "Churvox checks worker availability, area, workload, skills, job history, and schedule conflicts before recommending who should take the next job.",
    details: [
      "Best worker match: free today and close to the job area.",
      "No schedule clash detected from today’s run sheet.",
      "Owner approval is required before the job is assigned.",
      "After backend wiring, this action will assign the worker automatically.",
    ],
    result: "Assignment approved. Phase 4 will wire this to the real assign-worker endpoint.",
  },
  {
    id: "invoice-draft",
    title: "Create invoice draft",
    meta: "Completed work",
    type: "money",
    primary: "Create draft",
    summary:
      "Churvox prepares an editable invoice draft using the completed job, client, service notes, photos, address, and pricing context.",
    details: [
      "Draft description should be created from the completed job details.",
      "Owner can edit before sending.",
      "Worker pricing stays hidden from worker-facing screens.",
      "After backend wiring, this action will create the real draft invoice.",
    ],
    result: "Invoice draft prepared locally. Phase 4 will wire this to the real invoice endpoint.",
  },
  {
    id: "quote-followup",
    title: "Send quote follow-up",
    meta: "Sales follow-up",
    type: "followups",
    primary: "Prepare message",
    summary:
      "Churvox drafts a friendly follow-up message for open quotes so the owner can approve before anything is sent.",
    details: [
      "Message is approval-first.",
      "Nothing is sent automatically.",
      "Owner can review, edit, then send.",
      "After backend wiring, this action will use the real quote follow-up flow.",
    ],
    result: "Follow-up message prepared. Phase 4 will wire this to quote actions.",
  },
];

const STAT_DETAILS = {
  unassigned: {
    title: "Unassigned jobs",
    meta: "Dispatch",
    body:
      "This should show jobs without a worker and suggest the best available worker based on location, workload, skills, and schedule conflicts.",
    items: ["Show unassigned jobs", "Recommend worker", "Owner approves", "System assigns"],
  },
  completed: {
    title: "Completed jobs",
    meta: "Invoicing",
    body:
      "This should show completed jobs that are ready for invoice drafts. The owner should not need to retype job details.",
    items: ["Read completed job", "Generate invoice description", "Prepare draft invoice", "Owner approves"],
  },
  invoices: {
    title: "Open invoices",
    meta: "Cashflow",
    body:
      "This should show invoices that need payment follow-up and prepare reminder messages for approval.",
    items: ["Find overdue invoices", "Draft reminder", "Owner approves", "Send through real channel"],
  },
  quotes: {
    title: "Open quotes",
    meta: "Sales",
    body:
      "This should show open quotes that need follow-up and help convert them into accepted work.",
    items: ["Find old open quotes", "Draft follow-up", "Owner approves", "Convert to job when accepted"],
  },
};

const workerMatches = [
  {
    name: "Best worker match",
    reason: "Free today, close to job area, suitable job history",
    confidence: "92%",
  },
  {
    name: "Backup worker",
    reason: "Available later today, no schedule clash detected",
    confidence: "78%",
  },
];

const runSheet = [
  {
    id: "job-1",
    title: "Unassigned lawn service",
    client: "ECB Property Maintenance",
    area: "Lower Hutt",
    risk: "Needs worker",
  },
  {
    id: "job-2",
    title: "Completed job ready for invoice",
    client: "Rental owner follow-up",
    area: "Naenae",
    risk: "Money waiting",
  },
];

function DetailModal({ item, onClose, onApprove }) {
  if (!item) return null;

  return (
    <div className="op-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="op-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="op-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="op-modal-head">
          <div>
            <p className="op-kicker">{item.meta || "Details"}</p>
            <h2 id="op-modal-title">{item.title}</h2>
          </div>
          <button type="button" className="op-icon-btn" onClick={onClose} aria-label="Close details">
            ×
          </button>
        </div>

        <p className="op-modal-body">{item.summary || item.body}</p>

        {item.items ? (
          <div className="op-modal-steps">
            {item.items.map((step, index) => (
              <div className="op-step" key={step}>
                <b>{index + 1}</b>
                <span>{step}</span>
              </div>
            ))}
          </div>
        ) : null}

        {item.details ? (
          <div className="op-modal-list">
            {item.details.map((detail) => (
              <div key={detail} className="op-modal-list-row">
                <span />
                <p>{detail}</p>
              </div>
            ))}
          </div>
        ) : null}

        <div className="op-modal-actions">
          <button type="button" className="op-btn op-btn-soft" onClick={onClose}>
            Close
          </button>
          {item.primary ? (
            <button type="button" className="op-btn op-btn-primary" onClick={() => onApprove(item)}>
              {item.primary}
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function Toast({ message }) {
  if (!message) return null;
  return <div className="op-toast">{message}</div>;
}

function StatCard({ id, label, value, text, tone, onOpen }) {
  return (
    <button className={`op-stat op-stat-${tone}`} type="button" onClick={() => onOpen(STAT_DETAILS[id])}>
      <span className="op-stat-top">
        <strong>{value}</strong>
        <span>{label}</span>
      </span>
      <small>{text}</small>
      <em>Tap for details</em>
    </button>
  );
}

function ActionCard({ action, onOpen, approved }) {
  return (
    <article className={`op-action-card ${approved ? "is-approved" : ""}`}>
      <div>
        <p className="op-card-kicker">{approved ? "Approved" : action.meta}</p>
        <h3>{action.title}</h3>
        <p>{approved ? action.result : action.summary}</p>
      </div>
      <div className="op-card-actions">
        <button type="button" className="op-btn op-btn-soft" onClick={() => onOpen(action)}>
          Details
        </button>
        <button type="button" className="op-btn op-btn-primary" onClick={() => onOpen(action)}>
          {approved ? "Review" : action.primary}
        </button>
      </div>
    </article>
  );
}

export default function AIControlRoomPage() {
  const [mode, setMode] = useState("today");
  const [modal, setModal] = useState(null);
  const [approved, setApproved] = useState({});
  const [toast, setToast] = useState("");

  const visibleActions = useMemo(() => {
    if (mode === "today") return ACTIONS;
    return ACTIONS.filter((action) => action.type === mode);
  }, [mode]);

  const command = useMemo(() => {
    const approvedCount = Object.keys(approved).length;
    return {
      safeMoves: ACTIONS.length - approvedCount,
      urgent: 1,
      revenue: "$0",
      approvedCount,
    };
  }, [approved]);

  function approveAction(action) {
    setApproved((current) => ({ ...current, [action.id]: true }));
    setModal(null);
    setToast(action.result || "Action approved.");
    window.setTimeout(() => setToast(""), 3200);
  }

  function approveAllSafeMoves() {
    const next = {};
    ACTIONS.forEach((action) => {
      next[action.id] = true;
    });
    setApproved(next);
    setToast("Safe moves approved locally. Real endpoint wiring comes next.");
    window.setTimeout(() => setToast(""), 3200);
  }

  return (
    <main className="op-page">
      <Toast message={toast} />

      <section className="op-hero">
        <div className="op-hero-copy">
          <p className="op-kicker">Churvox Operator</p>
          <h1>Today’s work, decisions, and follow-ups in one place.</h1>
          <p>
            Churvox prepares the admin work. You review the details, approve the safe moves,
            and stay in control.
          </p>
          <div className="op-hero-actions">
            <button type="button" className="op-btn op-btn-primary" onClick={approveAllSafeMoves}>
              Approve safe moves
            </button>
            <button
              type="button"
              className="op-btn op-btn-dark"
              onClick={() =>
                setModal({
                  title: "Prepare today",
                  meta: "Daily command",
                  body:
                    "This view should run the daily check, find urgent work, prepare assignments, draft invoice actions, and surface follow-ups.",
                  items: ["Check jobs", "Check crew", "Check invoices", "Check quotes", "Prepare approval queue"],
                })
              }
            >
              Prepare today
            </button>
          </div>
        </div>

        <div className="op-command-panel">
          <div className="op-command-head">
            <span>Command status</span>
            <strong>{command.safeMoves === 0 ? "Clear" : "Ready"}</strong>
          </div>
          <div className="op-command-grid">
            <button type="button" onClick={() => setMode("today")}>
              <strong>{command.safeMoves}</strong>
              <span>safe moves</span>
            </button>
            <button type="button" onClick={() => setMode("dispatch")}>
              <strong>{command.urgent}</strong>
              <span>urgent item</span>
            </button>
            <button type="button" onClick={() => setMode("money")}>
              <strong>{command.revenue}</strong>
              <span>ready revenue</span>
            </button>
          </div>
          <p>
            This page now opens details in-page, gives clear approval feedback, and is ready for real backend wiring.
          </p>
        </div>
      </section>

      <section className="op-tabs" aria-label="Operator modes">
        <button className={mode === "today" ? "active" : ""} onClick={() => setMode("today")} type="button">
          Today
        </button>
        <button className={mode === "dispatch" ? "active" : ""} onClick={() => setMode("dispatch")} type="button">
          Dispatch
        </button>
        <button className={mode === "money" ? "active" : ""} onClick={() => setMode("money")} type="button">
          Money
        </button>
        <button className={mode === "followups" ? "active" : ""} onClick={() => setMode("followups")} type="button">
          Follow-ups
        </button>
      </section>

      <section className="op-stats">
        <StatCard id="unassigned" value="0" label="Unassigned jobs" text="AI can recommend the best worker match." tone="red" onOpen={setModal} />
        <StatCard id="completed" value="0" label="Completed jobs" text="Prepare draft invoices and descriptions." tone="green" onOpen={setModal} />
        <StatCard id="invoices" value="0" label="Open invoices" text="Prepare payment reminder queue." tone="blue" onOpen={setModal} />
        <StatCard id="quotes" value="0" label="Open quotes" text="Prepare quote follow-up messages." tone="amber" onOpen={setModal} />
      </section>

      <section className="op-layout">
        <div className="op-left">
          <div className="op-section-head">
            <div>
              <p className="op-kicker">Approval queue</p>
              <h2>AI-prepared actions</h2>
            </div>
            <button
              type="button"
              className="op-btn op-btn-soft"
              onClick={() =>
                setModal({
                  title: "Approval history",
                  meta: "Operator log",
                  body: "Approved actions will appear here once the backend approval log is wired in.",
                  items: Object.keys(approved).length
                    ? ACTIONS.filter((action) => approved[action.id]).map((action) => action.title)
                    : ["No approved actions yet"],
                })
              }
            >
              View history
            </button>
          </div>

          {visibleActions.map((action) => (
            <ActionCard
              key={action.id}
              action={action}
              approved={approved[action.id]}
              onOpen={setModal}
            />
          ))}
        </div>

        <aside className="op-right">
          <div className="op-mini-panel">
            <p className="op-kicker">Crew match</p>
            <h2>Best worker options</h2>
            <div className="op-worker-list">
              {workerMatches.map((worker) => (
                <button
                  className="op-worker"
                  key={worker.name}
                  type="button"
                  onClick={() =>
                    setModal({
                      title: worker.name,
                      meta: "Crew match",
                      body: worker.reason,
                      items: ["Availability checked", "Area checked", "Workload checked", `Confidence: ${worker.confidence}`],
                    })
                  }
                >
                  <div>
                    <strong>{worker.name}</strong>
                    <span>{worker.reason}</span>
                  </div>
                  <b>{worker.confidence}</b>
                </button>
              ))}
            </div>
          </div>

          <div className="op-mini-panel">
            <p className="op-kicker">Run sheet</p>
            <h2>Today’s focus</h2>
            <div className="op-job-list">
              {runSheet.map((job) => (
                <button
                  className="op-job"
                  type="button"
                  key={job.id}
                  onClick={() =>
                    setModal({
                      title: job.title,
                      meta: job.risk,
                      body: `${job.client} · ${job.area}`,
                      items: ["Open job details", "Check assigned worker", "Check invoice readiness", "Prepare next action"],
                    })
                  }
                >
                  <span>
                    <strong>{job.title}</strong>
                    <small>{job.client} · {job.area}</small>
                  </span>
                  <em>{job.risk}</em>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </section>

      <DetailModal item={modal} onClose={() => setModal(null)} onApprove={approveAction} />
    </main>
  );
}
