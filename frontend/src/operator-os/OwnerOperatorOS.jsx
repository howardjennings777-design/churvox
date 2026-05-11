import React, { useMemo, useState } from "react";
import "./operator-phase2.css";

const sampleJobs = [
  {
    id: "job-1",
    title: "Unassigned lawn service",
    client: "ECB Property Maintenance",
    area: "Lower Hutt",
    time: "Today",
    risk: "Needs worker",
  },
  {
    id: "job-2",
    title: "Completed job ready for invoice",
    client: "Rental owner follow-up",
    area: "Naenae",
    time: "This morning",
    risk: "Money waiting",
  },
];

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

function StatCard({ label, value, text, tone = "blue" }) {
  return (
    <button className={`op-stat op-stat-${tone}`} type="button">
      <span className="op-stat-top">
        <strong>{value}</strong>
        <span>{label}</span>
      </span>
      <small>{text}</small>
    </button>
  );
}

function ActionCard({ title, meta, children, primary = "Review" }) {
  return (
    <article className="op-action-card">
      <div>
        <p className="op-card-kicker">{meta}</p>
        <h3>{title}</h3>
        <p>{children}</p>
      </div>
      <div className="op-card-actions">
        <button type="button" className="op-btn op-btn-soft">Details</button>
        <button type="button" className="op-btn op-btn-primary">{primary}</button>
      </div>
    </article>
  );
}

export default function AIControlRoomPage() {
  const [mode, setMode] = useState("today");

  const command = useMemo(() => {
    return {
      safeMoves: 4,
      urgent: 1,
      revenue: "$0",
      confidence: "Ready",
    };
  }, []);

  return (
    <main className="op-page">
      <section className="op-hero">
        <div className="op-hero-copy">
          <p className="op-kicker">Churvox Operator</p>
          <h1>Today’s work, decisions, and follow-ups in one place.</h1>
          <p>
            Churvox prepares the admin work. You review the details, approve the safe moves,
            and stay in control.
          </p>
          <div className="op-hero-actions">
            <button type="button" className="op-btn op-btn-primary">Approve safe moves</button>
            <button type="button" className="op-btn op-btn-dark">Prepare today</button>
          </div>
        </div>

        <div className="op-command-panel">
          <div className="op-command-head">
            <span>Command status</span>
            <strong>{command.confidence}</strong>
          </div>
          <div className="op-command-grid">
            <div>
              <strong>{command.safeMoves}</strong>
              <span>safe moves</span>
            </div>
            <div>
              <strong>{command.urgent}</strong>
              <span>urgent item</span>
            </div>
            <div>
              <strong>{command.revenue}</strong>
              <span>ready revenue</span>
            </div>
          </div>
          <p>
            Connect this panel to live AI approvals in the next phase. For now, the layout is fixed
            and ready for real wiring.
          </p>
        </div>
      </section>

      <section className="op-tabs" aria-label="Operator modes">
        <button className={mode === "today" ? "active" : ""} onClick={() => setMode("today")} type="button">Today</button>
        <button className={mode === "dispatch" ? "active" : ""} onClick={() => setMode("dispatch")} type="button">Dispatch</button>
        <button className={mode === "money" ? "active" : ""} onClick={() => setMode("money")} type="button">Money</button>
        <button className={mode === "followups" ? "active" : ""} onClick={() => setMode("followups")} type="button">Follow-ups</button>
      </section>

      <section className="op-stats">
        <StatCard value="0" label="Unassigned jobs" text="AI can recommend the best worker match." tone="red" />
        <StatCard value="0" label="Completed jobs" text="Prepare draft invoices and descriptions." tone="green" />
        <StatCard value="0" label="Open invoices" text="Prepare payment reminder queue." tone="blue" />
        <StatCard value="0" label="Open quotes" text="Prepare quote follow-up messages." tone="amber" />
      </section>

      <section className="op-layout">
        <div className="op-left">
          <div className="op-section-head">
            <div>
              <p className="op-kicker">Approval queue</p>
              <h2>AI-prepared actions</h2>
            </div>
            <button type="button" className="op-btn op-btn-soft">View history</button>
          </div>

          <ActionCard title="Assign the next job" meta="Dispatch recommendation" primary="Approve">
            Worker match should consider availability, area, workload, skills, and schedule clashes before assigning.
          </ActionCard>

          <ActionCard title="Create invoice draft" meta="Completed work" primary="Create draft">
            Use the completed job notes, photos, client, address, and job pricing to prepare an editable invoice draft.
          </ActionCard>

          <ActionCard title="Send quote follow-up" meta="Sales follow-up" primary="Prepare message">
            Draft a friendly quote follow-up for owner approval before anything is sent to the customer.
          </ActionCard>
        </div>

        <aside className="op-right">
          <div className="op-mini-panel">
            <p className="op-kicker">Crew match</p>
            <h2>Best worker options</h2>
            <div className="op-worker-list">
              {workerMatches.map((worker) => (
                <div className="op-worker" key={worker.name}>
                  <div>
                    <strong>{worker.name}</strong>
                    <span>{worker.reason}</span>
                  </div>
                  <b>{worker.confidence}</b>
                </div>
              ))}
            </div>
          </div>

          <div className="op-mini-panel">
            <p className="op-kicker">Run sheet</p>
            <h2>Today’s focus</h2>
            <div className="op-job-list">
              {sampleJobs.map((job) => (
                <button className="op-job" type="button" key={job.id}>
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
    </main>
  );
}
