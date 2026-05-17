import React from "react";
import "./CommandDeckDashboard.css";

function clean(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value).replace(/\s+/g, " ").trim() || fallback;
}

function includesAny(value, words) {
  const text = clean(value).toLowerCase();
  return words.some((word) => text.includes(word));
}

function slipText(item = {}) {
  return [
    item.kind,
    item.eyebrow,
    item.title,
    item.need,
    item.prepared,
    item.detail,
  ].map(clean).join(" ");
}

function riskFor(item = {}) {
  const text = slipText(item).toLowerCase();

  if (
    includesAny(text, [
      "missing",
      "overdue",
      "failed",
      "blocked",
      "risk",
      "no email",
      "no phone",
      "amount",
    ])
  ) {
    return { label: "High", tone: "high" };
  }

  if (
    includesAny(text, [
      "quote",
      "follow",
      "payment",
      "reminder",
      "worker",
      "dispatch",
      "proof",
    ])
  ) {
    return { label: "Medium", tone: "medium" };
  }

  return { label: "Low", tone: "low" };
}

function reasonFor(item = {}) {
  const prepared = clean(item.prepared);
  if (prepared) return prepared;

  const need = clean(item.need);
  if (need) return need;

  return "Churvox prepared this for owner review.";
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
  const inputCount = machine?.input?.length || 0;
  const processingCount = machine?.processing?.length || 0;
  const approvals = machine?.approval || [];
  const rows = visibleApprovals?.length ? visibleApprovals : approvals.slice(0, 5);

  const preparedCount = processingCount + approvals.length;

  const readyToInvoice = approvals.filter((item) => {
    const text = slipText(item).toLowerCase();
    return (
      text.includes("invoice") ||
      text.includes("cashflow") ||
      text.includes("payment") ||
      text.includes("proof")
    );
  }).length;

  const crewActive = approvals.filter((item) => {
    const text = slipText(item).toLowerCase();
    return (
      text.includes("worker") ||
      text.includes("crew") ||
      text.includes("dispatch") ||
      text.includes("assign")
    );
  }).length;

  const metrics = [
    { label: "Plan", value: planName || "Command", icon: "⌁" },
    { label: "Inputs", value: inputCount, icon: "＋" },
    { label: "Prepared", value: preparedCount, icon: "▧" },
    { label: "Approvals", value: approvals.length, icon: "◇" },
  ];

  const cards = [
    {
      label: "Ready for approval",
      value: approvals.length,
      body: "Owner-ready admin prepared by Churvox.",
      icon: "✓",
      tone: "approval",
    },
    {
      label: "Ready to invoice",
      value: readyToInvoice,
      body: "Completed work and payment actions ready to review.",
      icon: "▧",
      tone: "invoice",
    },
    {
      label: "Crew active today",
      value: crewActive,
      body: "Worker updates, job proof and dispatch checks.",
      icon: "◌",
      tone: "crew",
    },
  ];

  const flow = ["Jobs", "Crew", "Proof", "Invoice", "Payment"];

  return (
    <section className="cdx-page" data-phase="PHASE_203_ISOLATED_COMMAND_DECK">
      <header className="cdx-hero">
        <section className="cdx-hero-copy">
          <span>Churvox Command Deck</span>
          <h1>
            Churvox prepares the admin.
            <mark>You approve the next move.</mark>
          </h1>
          <p>
            Jobs, proof, quotes, invoices, reminders and worker updates are checked in the background.
            The owner only sees what needs approval.
          </p>
        </section>

        <section className="cdx-hero-metrics" aria-label="Command Deck metrics">
          {metrics.map((metric) => (
            <article key={metric.label}>
              <i>{metric.icon}</i>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </article>
          ))}
        </section>
      </header>

      <section className="cdx-cards" aria-label="Important dashboard cards">
        {cards.map((card) => (
          <article className={`cdx-card ${card.tone}`} key={card.label}>
            <i>{card.icon}</i>
            <div>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <p>{card.body}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="cdx-desk">
        <header>
          <div>
            <span>Open by default</span>
            <h2>Approval Desk</h2>
            <p>Review what Churvox prepared, approve it, or edit before it goes out.</p>
          </div>

          <strong>{approvals.length}</strong>

          {approvals.length > 5 ? (
            <button type="button" onClick={() => setShowAllApprovals(!showAllApprovals)}>
              {showAllApprovals ? "Show Top 5" : "View All"}
            </button>
          ) : null}
        </header>

        <div className="cdx-table">
          {rows.length ? rows.map((item) => {
            const risk = riskFor(item);

            return (
              <article className="cdx-row" key={item.id || item.title}>
                <span>{clean(item.eyebrow || item.kind, "Approval")}</span>

                <div>
                  <strong>{clean(item.title, "Approval slip")}</strong>
                  <p>{reasonFor(item)}</p>
                </div>

                <b className={`cdx-risk ${risk.tone}`}>{risk.label}</b>

                <button type="button" onClick={() => onOpenSlip(item)}>
                  Open Approval Slip
                </button>

                <i>⋮</i>
              </article>
            );
          }) : (
            <section className="cdx-empty">
              <strong>No approvals waiting.</strong>
              <p>When work comes in, Churvox will prepare the admin and place clean approval slips here.</p>
            </section>
          )}

          {hiddenApprovalCount > 0 ? (
            <button type="button" className="cdx-view-all" onClick={() => setShowAllApprovals(true)}>
              View all {approvals.length} approvals
            </button>
          ) : null}

          {showAllApprovals && approvals.length > 5 ? (
            <button type="button" className="cdx-view-all ghost" onClick={() => setShowAllApprovals(false)}>
              Show top 5 only
            </button>
          ) : null}
        </div>
      </section>

      <section className="cdx-flow">
        <article>
          <i>◉</i>
          <div>
            <strong>AI is watching</strong>
            <p>Every job. Every proof item. Every admin step.</p>
          </div>
        </article>

        <div>
          {flow.map((step, index) => (
            <React.Fragment key={step}>
              <span>{step}</span>
              {index < flow.length - 1 ? <b>›</b> : null}
            </React.Fragment>
          ))}
        </div>
      </section>
    </section>
  );
}
