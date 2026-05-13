import { buildAiActions } from "./aiActions";
import { computeOperatorCommandCore } from "./aiCommandCore";
import { clientOf, moneyOf, statusOf, titleOf } from "../api";
import "./SmartHub.css";

function count(list) {
  return Array.isArray(list) ? list.length : 0;
}

function first(list) {
  return Array.isArray(list) && list.length ? list[0] : null;
}

function moneyTotal(list) {
  return (Array.isArray(list) ? list : []).reduce((sum, item) => {
    const raw = item?.total ?? item?.amount ?? item?.price ?? item?.job_price ?? item?.balance_due ?? 0;
    const number = Number(String(raw).replace(/[^0-9.-]/g, ""));
    return sum + (Number.isFinite(number) ? number : 0);
  }, 0);
}

function money(value) {
  return new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 }).format(Number(value || 0));
}

function MiniList({ items = [], empty, onOpen }) {
  const shown = items.slice(0, 4);
  if (!shown.length) return <div className="hub-empty">{empty}</div>;
  return (
    <div className="hub-mini-list">
      {shown.map((item, index) => (
        <button type="button" key={item.id || item._id || index} onClick={onOpen}>
          <strong>{titleOf(item, `Item ${index + 1}`)}</strong>
          <span>{[clientOf(item), moneyOf(item)].filter((x) => x && x !== "—").join(" · ") || statusOf(item)}</span>
        </button>
      ))}
    </div>
  );
}

function Panel({ eyebrow, title, countLabel, children, onOpen }) {
  return (
    <section className="hub-panel">
      <header>
        <div>
          <p>{eyebrow}</p>
          <h2>{title}</h2>
          {countLabel ? <span>{countLabel}</span> : null}
        </div>
        {onOpen ? <button type="button" onClick={onOpen}>Open</button> : null}
      </header>
      {children}
    </section>
  );
}

export default function SmartHub({ data = {}, onNav, onCreate }) {
  const commandCore = computeOperatorCommandCore(data);
  const actions = commandCore.actions?.length ? commandCore.actions : buildAiActions(data);
  const bestAction = first(actions);
  const activeJobs = data.activeJobs || [];
  const completedJobs = data.completedJobs || [];
  const workers = data.workers || [];
  const unpaidInvoices = data.unpaidInvoices || [];
  const openQuotes = data.openQuotes || [];
  const cashWaiting = moneyTotal(unpaidInvoices);

  const metrics = [
    { label: "Needs crew", value: count(data.unassignedJobs || []), text: "Jobs AI can help dispatch", nav: "jobs" },
    { label: "Active jobs", value: count(activeJobs), text: "Assigned or in progress", nav: "jobs" },
    { label: "Proof-to-paid", value: count(completedJobs), text: "Completed work to review", nav: "proof" },
    { label: "Cash actions", value: money(cashWaiting), text: "Unpaid invoice value", nav: "invoices" },
  ];

  const setupIssues = [
    data.currentPlan === "none" ? "Choose a plan" : "",
    !count(data.clients) ? "Add or import clients" : "",
    !count(workers) ? "Add crew" : "",
    Number(data.smsBalance || 0) <= 10 ? "SMS credits low" : "",
    !data.myobConnected && ["pro", "enterprise"].includes(String(data.currentPlan).toLowerCase()) ? "Connect MYOB" : "",
  ].filter(Boolean);

  return (
    <main className="hub-page">
      <section className="hub-hero">
        <div>
          <p>CHURVOX AI OPERATOR OS</p>
          <h1>AI prepares the admin. <span>You approve the work.</span></h1>
          <strong>Jobs, crew, proof, invoices and follow-ups are organised into owner-approved next moves.</strong>
          <div className="hub-actions">
            <button type="button" onClick={() => onNav?.("queue")}>Open AI Work Queue</button>
            <button type="button" onClick={() => onCreate?.("jobs")}>Create job</button>
            <button type="button" onClick={() => onNav?.("import")}>Import CSV</button>
            <button type="button" onClick={() => onNav?.("system")}>System Centre</button>
          </div>
        </div>
        <aside>
          <img src="/brand/churvox-holo-c.svg" alt="" />
          <b>{actions.length}</b>
          <span>prepared actions</span>
        </aside>
      </section>

      {data.notice ? <section className="hub-notice">{data.notice}</section> : null}

      <section className="hub-metrics">
        {metrics.map((metric) => (
          <button type="button" key={metric.label} onClick={() => onNav?.(metric.nav)}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <small>{metric.text}</small>
          </button>
        ))}
      </section>

      <section className="hub-grid">
        <Panel eyebrow="AI NEXT BEST MOVE" title={bestAction?.title || "No urgent move waiting"} countLabel={bestAction?.subtitle || "Churvox is watching the business."} onOpen={() => onNav?.("queue")}>
          {bestAction ? (
            <article className="hub-action-card">
              <span>{bestAction.type || "Prepared action"}</span>
              <p>{bestAction.description || bestAction.body || "AI prepared this action for owner approval."}</p>
              <div>
                <button type="button" onClick={() => onNav?.("queue")}>Review</button>
                <button type="button" onClick={() => onNav?.("queue")}>Approve</button>
              </div>
            </article>
          ) : (
            <div className="hub-empty">No approvals waiting right now.</div>
          )}
        </Panel>

        <Panel eyebrow="CASHFLOW OVERVIEW" title={money(cashWaiting)} countLabel={`${count(unpaidInvoices)} unpaid invoice actions ready for review.`} onOpen={() => onNav?.("invoices")}>
          <MiniList items={unpaidInvoices} empty="No invoices to chase." onOpen={() => onNav?.("invoices")} />
        </Panel>

        <Panel eyebrow="TODAY'S RUN SHEET" title={String(count(activeJobs))} countLabel="Jobs assigned or in progress." onOpen={() => onNav?.("jobs")}>
          <MiniList items={activeJobs} empty="No active jobs today." onOpen={() => onNav?.("jobs")} />
        </Panel>

        <Panel eyebrow="PROOF TO PAID" title={String(count(completedJobs))} countLabel="Completed work ready for invoice review." onOpen={() => onNav?.("proof")}>
          <MiniList items={completedJobs} empty="No completed jobs waiting." onOpen={() => onNav?.("proof")} />
        </Panel>

        <Panel eyebrow="CREW WATCH" title={String(count(workers))} countLabel="Workers and admin users in this business." onOpen={() => onNav?.("crew")}>
          <MiniList items={workers} empty="No crew added yet." onOpen={() => onNav?.("crew")} />
        </Panel>

        <Panel eyebrow="QUOTE FOLLOW-UPS" title={String(count(openQuotes))} countLabel="Open quotes that may need follow-up." onOpen={() => onNav?.("quotes")}>
          <MiniList items={openQuotes} empty="No quote follow-ups." onOpen={() => onNav?.("quotes")} />
        </Panel>

        <Panel eyebrow="SETUP HEALTH" title={setupIssues.length ? `${setupIssues.length} things` : "Ready"} countLabel="Keep the command centre launch-ready." onOpen={() => onNav?.("system")}>
          <div className="hub-chip-list">
            {(setupIssues.length ? setupIssues : ["Setup looks good"]).map((issue) => (
              <button type="button" key={issue} onClick={() => onNav?.("system")}>{issue}</button>
            ))}
          </div>
        </Panel>
      </section>
    </main>
  );
}
