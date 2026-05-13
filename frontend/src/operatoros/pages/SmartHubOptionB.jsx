import { buildAiActions } from "./aiActions";
import { computeOperatorCommandCore } from "./aiCommandCore";
import { clientOf, moneyOf, statusOf, titleOf } from "../api";
import "./SmartHubOptionB.css";

function safeList(value) {
  return Array.isArray(value) ? value : [];
}

function first(value) {
  const list = safeList(value);
  return list.length ? list[0] : null;
}

function amountOf(item) {
  const raw = item?.total ?? item?.amount ?? item?.price ?? item?.job_price ?? item?.balance_due ?? 0;
  const number = Number(String(raw).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(number) ? number : 0;
}

function money(value) {
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function totalMoney(items) {
  return safeList(items).reduce((sum, item) => sum + amountOf(item), 0);
}

function ItemList({ items, empty, onOpen }) {
  const shown = safeList(items).slice(0, 4);

  if (!shown.length) {
    return <div className="ob-empty">{empty}</div>;
  }

  return (
    <div className="ob-list">
      {shown.map((item, index) => (
        <button
          type="button"
          key={item.id || item._id || `${titleOf(item, "item")}-${index}`}
          onClick={onOpen}
        >
          <strong>{titleOf(item, `Item ${index + 1}`)}</strong>
          <span>
            {[clientOf(item), moneyOf(item)].filter((part) => part && part !== "—").join(" · ") ||
              statusOf(item)}
          </span>
        </button>
      ))}
    </div>
  );
}

function Panel({ eyebrow, title, subtitle, action, children }) {
  return (
    <section className="ob-panel">
      <header>
        <div>
          <p>{eyebrow}</p>
          <h2>{title}</h2>
          {subtitle ? <span>{subtitle}</span> : null}
        </div>
        {action ? (
          <button type="button" onClick={action.onClick}>
            {action.label}
          </button>
        ) : null}
      </header>
      {children}
    </section>
  );
}

export default function SmartHubOptionB({ data = {}, onNav, onCreate }) {
  const commandCore = computeOperatorCommandCore(data);
  const actions = safeList(commandCore.actions?.length ? commandCore.actions : buildAiActions(data));
  const bestAction = first(actions);

  const unassignedJobs = safeList(data.unassignedJobs);
  const activeJobs = safeList(data.activeJobs);
  const completedJobs = safeList(data.completedJobs);
  const unpaidInvoices = safeList(data.unpaidInvoices);
  const openQuotes = safeList(data.openQuotes);
  const workers = safeList(data.workers);
  const clients = safeList(data.clients);

  const cashWaiting = totalMoney(unpaidInvoices);

  const metrics = [
    {
      label: "Needs crew",
      value: unassignedJobs.length,
      text: "Jobs AI can help dispatch",
      nav: "jobs",
    },
    {
      label: "Active jobs",
      value: activeJobs.length,
      text: "Assigned or in progress",
      nav: "jobs",
    },
    {
      label: "Proof-to-paid",
      value: completedJobs.length,
      text: "Completed work to review",
      nav: "proof",
    },
    {
      label: "Cash actions",
      value: money(cashWaiting),
      text: "Unpaid invoice value",
      nav: "invoices",
    },
  ];

  const setupIssues = [
    data.currentPlan === "none" ? "Choose a plan" : "",
    !clients.length ? "Add or import clients" : "",
    !workers.length ? "Add crew" : "",
    Number(data.smsBalance || 0) <= 10 ? "SMS credits low" : "",
    !data.myobConnected && ["pro", "enterprise"].includes(String(data.currentPlan || "").toLowerCase())
      ? "Connect MYOB"
      : "",
  ].filter(Boolean);

  return (
    <main className="ob-page">
      <section className="ob-hero">
        <div className="ob-hero-copy">
          <p>CHURVOX AI OPERATOR OS</p>
          <h1>
            AI prepares the admin.
            <span>You approve the work.</span>
          </h1>
          <strong>
            Jobs, crew, proof, invoices and follow-ups are organised into owner-approved next moves.
          </strong>

          <div className="ob-actions">
            <button type="button" onClick={() => onNav?.("queue")}>
              Open AI Work Queue
            </button>
            <button type="button" onClick={() => onCreate?.("jobs")}>
              Create job
            </button>
            <button type="button" onClick={() => onNav?.("import")}>
              Import CSV
            </button>
            <button type="button" onClick={() => onNav?.("system")}>
              System Centre
            </button>
          </div>
        </div>

        <aside className="ob-hero-card">
          <img src="/brand/churvox-holo-c.svg" alt="" />
          <b>{actions.length}</b>
          <span>prepared actions</span>
        </aside>
      </section>

      {data.notice ? <section className="ob-notice">{data.notice}</section> : null}

      <section className="ob-metrics">
        {metrics.map((metric) => (
          <button type="button" key={metric.label} onClick={() => onNav?.(metric.nav)}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <small>{metric.text}</small>
          </button>
        ))}
      </section>

      <section className="ob-grid">
        <Panel
          eyebrow="AI NEXT BEST MOVE"
          title={bestAction?.title || "No urgent move waiting"}
          subtitle={bestAction?.subtitle || "Churvox is watching the business."}
          action={{ label: "Open queue", onClick: () => onNav?.("queue") }}
        >
          {bestAction ? (
            <article className="ob-action-card">
              <span>{bestAction.type || "Prepared action"}</span>
              <p>{bestAction.description || bestAction.body || "AI prepared this action for owner approval."}</p>
              <div>
                <button type="button" onClick={() => onNav?.("queue")}>Review</button>
                <button type="button" onClick={() => onNav?.("queue")}>Approve</button>
              </div>
            </article>
          ) : (
            <div className="ob-empty">No approvals waiting right now.</div>
          )}
        </Panel>

        <Panel
          eyebrow="CASHFLOW OVERVIEW"
          title={money(cashWaiting)}
          subtitle={`${unpaidInvoices.length} unpaid invoice action${unpaidInvoices.length === 1 ? "" : "s"} ready for review.`}
          action={{ label: "Open invoices", onClick: () => onNav?.("invoices") }}
        >
          <ItemList items={unpaidInvoices} empty="No invoices to chase." onOpen={() => onNav?.("invoices")} />
        </Panel>

        <Panel
          eyebrow="TODAY'S RUN SHEET"
          title={String(activeJobs.length)}
          subtitle="Jobs assigned or in progress."
          action={{ label: "Open jobs", onClick: () => onNav?.("jobs") }}
        >
          <ItemList items={activeJobs} empty="No active jobs today." onOpen={() => onNav?.("jobs")} />
        </Panel>

        <Panel
          eyebrow="PROOF TO PAID"
          title={String(completedJobs.length)}
          subtitle="Completed work ready for invoice review."
          action={{ label: "Open proof", onClick: () => onNav?.("proof") }}
        >
          <ItemList items={completedJobs} empty="No completed jobs waiting." onOpen={() => onNav?.("proof")} />
        </Panel>

        <Panel
          eyebrow="CREW WATCH"
          title={String(workers.length)}
          subtitle="Workers and admin users in this business."
          action={{ label: "Open crew", onClick: () => onNav?.("crew") }}
        >
          <ItemList items={workers} empty="No crew added yet." onOpen={() => onNav?.("crew")} />
        </Panel>

        <Panel
          eyebrow="QUOTE FOLLOW-UPS"
          title={String(openQuotes.length)}
          subtitle="Open quotes that may need follow-up."
          action={{ label: "Open quotes", onClick: () => onNav?.("quotes") }}
        >
          <ItemList items={openQuotes} empty="No quote follow-ups." onOpen={() => onNav?.("quotes")} />
        </Panel>

        <Panel
          eyebrow="SETUP HEALTH"
          title={setupIssues.length ? `${setupIssues.length} thing${setupIssues.length === 1 ? "" : "s"}` : "Ready"}
          subtitle="Keep the command centre launch-ready."
          action={{ label: "Open system", onClick: () => onNav?.("system") }}
        >
          <div className="ob-chip-list">
            {(setupIssues.length ? setupIssues : ["Setup looks good"]).map((issue) => (
              <button type="button" key={issue} onClick={() => onNav?.("system")}>
                {issue}
              </button>
            ))}
          </div>
        </Panel>
      </section>
    </main>
  );
}
