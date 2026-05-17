import React from "react";
import "./CommandDeckDashboard.css";

function clean(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value).replace(/\s+/g, " ").trim() || fallback;
}

function slipText(item = {}) {
  return [item.kind, item.eyebrow, item.title, item.need, item.prepared, item.detail].map(clean).join(" ");
}

function riskFor(item = {}) {
  const text = slipText(item).toLowerCase();

  if (
    text.includes("missing") ||
    text.includes("blocked") ||
    text.includes("failed") ||
    text.includes("overdue") ||
    text.includes("risk") ||
    text.includes("amount") ||
    text.includes("no email") ||
    text.includes("no phone")
  ) {
    return { label: "HIGH RISK", tone: "high" };
  }

  if (
    text.includes("quote") ||
    text.includes("follow") ||
    text.includes("payment") ||
    text.includes("reminder") ||
    text.includes("dispatch") ||
    text.includes("worker") ||
    text.includes("crew")
  ) {
    return { label: "MEDIUM", tone: "medium" };
  }

  return { label: "LOW RISK", tone: "low" };
}

function reasonFor(item = {}) {
  return clean(item.prepared) || clean(item.need) || "AI prepared this for owner review.";
}

function titleFor(item = {}) {
  const title = clean(item.title, "Approval slip");
  const kind = clean(item.kind).toLowerCase();

  if (kind.includes("invoice") && !title.toLowerCase().includes("invoice")) return `Invoice ${title}`;
  if (kind.includes("quote") && !title.toLowerCase().includes("follow")) return `Follow up — ${title}`;
  if (kind.includes("proof") && !title.toLowerCase().includes("update")) return `Update — ${title}`;
  if (kind.includes("dispatch") && !title.toLowerCase().includes("crew")) return `Crew suggestion — ${title}`;

  return title;
}

function Icon({ type }) {
  return <i className={`cd207-icon ${type}`} aria-hidden="true" />;
}

export default function CommandDeckDashboard({
  machine,
  planName,
  visibleApprovals,
  hiddenApprovalCount,
  showAllApprovals,
  setShowAllApprovals,
  onOpenSlip,
}) {
  const approvals = machine?.approval || [];
  const rows = visibleApprovals?.length ? visibleApprovals : approvals.slice(0, 5);
  const inputCount = machine?.input?.length || 0;
  const processingCount = machine?.processing?.length || 0;

  const readyToInvoice = approvals.filter((item) => {
    const text = slipText(item).toLowerCase();
    return text.includes("invoice") || text.includes("payment") || text.includes("proof") || text.includes("cashflow");
  }).length;

  const crewActive = approvals.filter((item) => {
    const text = slipText(item).toLowerCase();
    return text.includes("worker") || text.includes("crew") || text.includes("dispatch") || text.includes("assign");
  }).length;

  const metrics = [
    { label: "Plan", value: planName || "Command", icon: "target" },
    { label: "New Inputs", value: inputCount, icon: "tray" },
    { label: "Prepared", value: processingCount + approvals.length, icon: "document" },
    { label: "Approvals", value: approvals.length, icon: "shield" },
  ];

  const summary = [
    {
      label: "Ready for approval",
      value: approvals.length,
      body: "AI-prepared items waiting for your decision.",
      icon: "briefcase",
    },
    {
      label: "Ready to invoice",
      value: readyToInvoice,
      body: "Work completed and ready to be invoiced.",
      icon: "money",
    },
    {
      label: "Crew active today",
      value: crewActive,
      body: "On-site, en route, or finishing up strong.",
      icon: "crew",
    },
  ];

  const flow = [
    { label: "Jobs", icon: "briefcase" },
    { label: "Crew", icon: "crew" },
    { label: "Proof", icon: "photo" },
    { label: "Invoice", icon: "money" },
    { label: "Payment", icon: "card" },
  ];

  return (
    <section className="cd207-page" data-phase="PHASE_207_EXACT_COMMAND_DECK_REBUILD">
      <header className="cd207-hero">
        <section className="cd207-copy">
          <span>Command Deck</span>
          <h1>
            Churvox prepares the admin.
            <mark>You approve the next move.</mark>
          </h1>
          <p>
            Jobs, proof, quotes, invoices, reminders and worker updates are handled in the background.
            You only see what needs approval.
          </p>
        </section>

        <section className="cd207-metrics" aria-label="Dashboard metrics">
          {metrics.map((metric) => (
            <article key={metric.label}>
              <Icon type={metric.icon} />
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </article>
          ))}
        </section>
      </header>

      <section className="cd207-summary" aria-label="Important dashboard cards">
        {summary.map((card) => (
          <article key={card.label}>
            <Icon type={card.icon} />
            <div>
              <strong>{card.value}</strong>
              <span>{card.label}</span>
              <p>{card.body}</p>
            </div>
            <b>›</b>
          </article>
        ))}
      </section>

      <section className="cd207-desk">
        <header>
          <Icon type="clipboard" />
          <h2>Approval Desk</h2>
          <i />
          <p>Review the admin Churvox prepared, approve it, or edit before it goes out.</p>
        </header>

        <section className="cd207-table">
          {rows.length ? rows.map((item) => {
            const risk = riskFor(item);

            return (
              <article className="cd207-row" key={item.id || item.title}>
                <span>{clean(item.eyebrow || item.kind, "Approval")}</span>
                <strong>{titleFor(item)}</strong>
                <p>{reasonFor(item)}</p>
                <b className={`cd207-risk ${risk.tone}`}>{risk.label}</b>
                <button type="button" onClick={() => onOpenSlip(item)}>
                  Open Approval Slip <em>›</em>
                </button>
              </article>
            );
          }) : (
            <section className="cd207-empty">
              <strong>No approvals waiting.</strong>
              <p>When work comes in, Churvox prepares the admin and places clean approval slips here.</p>
            </section>
          )}

          {hiddenApprovalCount > 0 ? (
            <button type="button" className="cd207-view" onClick={() => setShowAllApprovals(true)}>
              View all {approvals.length} approvals
            </button>
          ) : null}

          {showAllApprovals && approvals.length > 5 ? (
            <button type="button" className="cd207-view ghost" onClick={() => setShowAllApprovals(false)}>
              Show top 5 only
            </button>
          ) : null}
        </section>
      </section>

      <section className="cd207-flow">
        <article>
          <Icon type="eye" />
          <div>
            <strong>AI is watching</strong>
            <p>Every job. Every detail. Every time.</p>
          </div>
        </article>

        <div>
          {flow.map((step, index) => (
            <React.Fragment key={step.label}>
              <span><Icon type={step.icon} />{step.label}</span>
              {index < flow.length - 1 ? <b>›</b> : null}
            </React.Fragment>
          ))}
        </div>
      </section>
    </section>
  );
}
