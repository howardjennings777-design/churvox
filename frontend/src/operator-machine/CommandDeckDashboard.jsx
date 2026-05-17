import React from "react";
import "./CommandDeckDashboard.css";

function clean(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value).replace(/\s+/g, " ").trim() || fallback;
}

function textFor(item = {}) {
  return [item.kind, item.eyebrow, item.title, item.need, item.prepared, item.detail].map(clean).join(" ");
}

function riskFor(item = {}) {
  const text = textFor(item).toLowerCase();

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
    return { label: "High Risk", tone: "high" };
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
    return { label: "Medium", tone: "medium" };
  }

  return { label: "Low Risk", tone: "low" };
}

function reasonFor(item = {}) {
  const prepared = clean(item.prepared);
  if (prepared) return prepared;

  const need = clean(item.need);
  if (need) return need;

  return "AI prepared this for owner review.";
}

function rowTitle(item = {}) {
  const title = clean(item.title, "Approval slip");
  const kind = clean(item.kind).toLowerCase();

  if (kind.includes("invoice") && !title.toLowerCase().includes("invoice")) return `Invoice — ${title}`;
  if (kind.includes("quote") && !title.toLowerCase().includes("quote")) return `Quote follow-up — ${title}`;
  if (kind.includes("dispatch") && !title.toLowerCase().includes("crew")) return `Crew suggestion — ${title}`;
  if (kind.includes("proof") && !title.toLowerCase().includes("proof")) return `Worker update — ${title}`;

  return title;
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
    const text = textFor(item).toLowerCase();
    return text.includes("invoice") || text.includes("payment") || text.includes("proof") || text.includes("cashflow");
  }).length;

  const crewActive = approvals.filter((item) => {
    const text = textFor(item).toLowerCase();
    return text.includes("worker") || text.includes("crew") || text.includes("dispatch") || text.includes("assign");
  }).length;

  const metrics = [
    { label: "Plan", value: planName || "Command", icon: "⌖" },
    { label: "New Inputs", value: inputCount, icon: "▱" },
    { label: "Prepared", value: processingCount + approvals.length, icon: "▤" },
    { label: "Approvals", value: approvals.length, icon: "◇" },
  ];

  const summary = [
    {
      label: "Ready for approval",
      value: approvals.length,
      body: "AI-prepared items waiting for your decision.",
      icon: "▣",
    },
    {
      label: "Ready to invoice",
      value: readyToInvoice,
      body: "Work completed and ready to be invoiced.",
      icon: "▤",
    },
    {
      label: "Crew active today",
      value: crewActive,
      body: "On-site, en route, or finishing up strong.",
      icon: "♟",
    },
  ];

  const flow = [
    { label: "Jobs", icon: "▣" },
    { label: "Crew", icon: "♟" },
    { label: "Proof", icon: "▧" },
    { label: "Invoice", icon: "$" },
    { label: "Payment", icon: "▰" },
  ];

  return (
    <section className="cdx-shot" data-phase="PHASE_204_EXACT_COMPACT_COMMAND_DECK">
      <header className="cdx-shot-hero">
        <section className="cdx-shot-copy">
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

        <section className="cdx-shot-metrics" aria-label="Dashboard metrics">
          {metrics.map((metric) => (
            <article key={metric.label}>
              <i>{metric.icon}</i>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </article>
          ))}
        </section>
      </header>

      <section className="cdx-shot-summary" aria-label="Important items">
        {summary.map((card) => (
          <article key={card.label}>
            <i>{card.icon}</i>
            <div>
              <strong>{card.value}</strong>
              <span>{card.label}</span>
              <p>{card.body}</p>
            </div>
            <b>›</b>
          </article>
        ))}
      </section>

      <section className="cdx-shot-desk">
        <header>
          <i>☑</i>
          <div>
            <h2>Approval Desk</h2>
            <p>Review the admin Churvox prepared, approve it, or edit before it goes out.</p>
          </div>
        </header>

        <section className="cdx-shot-table">
          {rows.length ? rows.map((item) => {
            const risk = riskFor(item);

            return (
              <article className="cdx-shot-row" key={item.id || item.title}>
                <span>{clean(item.eyebrow || item.kind, "Approval")}</span>
                <strong>{rowTitle(item)}</strong>
                <p>{reasonFor(item)}</p>
                <b className={`cdx-shot-risk ${risk.tone}`}>{risk.label}</b>
                <button type="button" onClick={() => onOpenSlip(item)}>
                  Open Approval Slip <em>›</em>
                </button>
              </article>
            );
          }) : (
            <section className="cdx-shot-empty">
              <strong>No approvals waiting.</strong>
              <p>When work comes in, Churvox prepares the admin and places clean approval slips here.</p>
            </section>
          )}

          {hiddenApprovalCount > 0 ? (
            <button type="button" className="cdx-shot-view" onClick={() => setShowAllApprovals(true)}>
              View all {approvals.length} approvals
            </button>
          ) : null}

          {showAllApprovals && approvals.length > 5 ? (
            <button type="button" className="cdx-shot-view ghost" onClick={() => setShowAllApprovals(false)}>
              Show top 5 only
            </button>
          ) : null}
        </section>
      </section>

      <section className="cdx-shot-flow">
        <article>
          <i>◉</i>
          <div>
            <strong>AI is watching</strong>
            <p>Every job. Every detail. Every time.</p>
          </div>
        </article>

        <div>
          {flow.map((step, index) => (
            <React.Fragment key={step.label}>
              <span><i>{step.icon}</i>{step.label}</span>
              {index < flow.length - 1 ? <b>›</b> : null}
            </React.Fragment>
          ))}
        </div>
      </section>
    </section>
  );
}
