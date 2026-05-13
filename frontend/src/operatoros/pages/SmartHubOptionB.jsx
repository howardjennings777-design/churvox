
import { clientOf, moneyOf, titleOf } from "../api";
import "./SmartHubOptionB.css";

function countMoney(items) {
  return (items || []).reduce((sum, item) => sum + Number(item.total || item.amount || item.price || item.balance_due || 0), 0);
}

function Kpi({ label, value, note }) {
  return (
    <article className="vision-signal">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function ActionCard({ title, body, meta, onClick }) {
  return (
    <button className="vision-approval" onClick={onClick}>
      <span>AI OPERATOR</span>
      <h3>{title}</h3>
      <p>{body}</p>
      <div><button type="button">Review</button><button type="button">Approve</button></div>
      <small>{meta}</small>
    </button>
  );
}

export default function SmartHubOptionB({ data = {}, onNav, onCreate }) {
  const jobs = data.jobs || [];
  const invoices = data.invoices || [];
  const quotes = data.quotes || [];
  const workers = data.workers || [];
  const unassigned = data.unassignedJobs || [];
  const completed = data.completedJobs || [];
  const overdue = data.overdueInvoices || [];
  const openQuotes = data.openQuotes || [];

  const actions = [
    {
      title: "Assign worker",
      body: unassigned[0]
        ? `AI found ${titleOf(unassigned[0], "a job")} without a worker and can prepare the assignment.`
        : "No urgent unassigned job found. Churvox is watching dispatch.",
      meta: unassigned[0] ? clientOf(unassigned[0]) : "Dispatch clear",
      nav: "jobs",
    },
    {
      title: "Draft invoice ready",
      body: completed[0]
        ? `Completed work for ${clientOf(completed[0])} is ready for proof-to-paid review.`
        : "Completed jobs will appear here when they are ready to invoice.",
      meta: completed[0] ? moneyOf(completed[0]) : "Proof-to-paid clear",
      nav: "proof",
    },
    {
      title: "Invoice reminder",
      body: overdue[0]
        ? `AI can draft a friendly follow-up for ${clientOf(overdue[0])}.`
        : "No overdue invoice needs urgent follow-up right now.",
      meta: overdue[0] ? moneyOf(overdue[0]) : "Cashflow clear",
      nav: "invoices",
    },
    {
      title: "Quote follow-up",
      body: openQuotes[0]
        ? `AI can prepare a quote follow-up for ${clientOf(openQuotes[0])}.`
        : "Open quote follow-ups will appear here.",
      meta: openQuotes[0] ? titleOf(openQuotes[0], "Quote") : "Pipeline clear",
      nav: "quotes",
    },
  ];

  return (
    <main className="vision-page">
      <section className="vision-stage">
        <div className="vision-copy">
          <div className="vision-brand-pill">
            <img src="/brand/churvox-holo-c.svg" alt="" />
            <span>CHURVOX AI OPERATOR</span>
          </div>
          <p>SMART HUB</p>
          <h1>AI runs the admin.<span>You approve.</span></h1>
          <strong>
            A cleaner command centre for today’s jobs, crew, invoices, proof and follow-ups.
            Churvox prepares the next move and keeps the owner in control.
          </strong>

          <div className="vision-actions">
            <button type="button" onClick={() => onCreate?.("jobs")}>New Job</button>
            <button type="button" onClick={() => onNav?.("queue")}>Open AI Work Queue</button>
            <button type="button" onClick={() => onNav?.("proof")}>Proof-to-Paid</button>
          </div>
        </div>

        <div className="vision-command-orb">
          <div className="vision-core-card">
            <img src="/brand/churvox-holo-c.svg" alt="" />
            <strong>{data.aiActions?.length || 0}</strong>
            <span>AI actions ready</span>
          </div>
          <div className="vision-floating-card card-top"><small>DISPATCH</small><b>{unassigned.length} need crew</b></div>
          <div className="vision-floating-card card-left"><small>CASHFLOW</small><b>{moneyOf({ total: countMoney(invoices) })}</b></div>
          <div className="vision-floating-card card-right"><small>PROOF</small><b>{completed.length} completed</b></div>
        </div>
      </section>

      {data.notice ? <section className="vision-notice">{data.notice}</section> : null}

      <section className="vision-signals">
        <Kpi label="Jobs" value={jobs.length} note="total records" />
        <Kpi label="Completed" value={completed.length} note="ready for review" />
        <Kpi label="Outstanding" value={moneyOf({ total: countMoney(invoices) })} note="invoice value" />
        <Kpi label="Quotes" value={quotes.length} note="pipeline" />
      </section>

      <section className="vision-workbench">
        <article className="vision-panel">
          <header>
            <div>
              <p>AI OPERATOR</p>
              <h2>Approval queue</h2>
              <span>AI prepares the work. You review and approve.</span>
            </div>
            <button type="button" onClick={() => onNav?.("queue")}>View all</button>
          </header>

          <div className="vision-list">
            {actions.map((action) => (
              <ActionCard
                key={action.title}
                title={action.title}
                body={action.body}
                meta={action.meta}
                onClick={() => onNav?.(action.nav)}
              />
            ))}
          </div>
        </article>

        <article className="vision-panel">
          <header>
            <div>
              <p>TODAY / RUN SHEET</p>
              <h2>Work moving today</h2>
              <span>Jobs and crew stay easy to scan.</span>
            </div>
            <button type="button" onClick={() => onNav?.("jobs")}>Open jobs</button>
          </header>

          <div className="vision-feed">
            {(jobs.slice(0, 5)).map((job, index) => (
              <button className="vision-feed-row" key={job.id || job._id || index} onClick={() => onNav?.("jobs")}>
                <div>
                  <strong>{titleOf(job, `Job ${index + 1}`)}</strong>
                  <span>{clientOf(job)} · {job.address || job.site_address || "No address set"}</span>
                </div>
                <b>{job.status || job.job_status || "Open"}</b>
              </button>
            ))}

            {!jobs.length ? <div className="vision-empty">No jobs yet. Create a job and Churvox will start preparing the admin.</div> : null}
          </div>
        </article>
      </section>

      <section className="vision-workbench">
        <article className="vision-panel">
          <header>
            <div>
              <p>CREW & DISPATCH</p>
              <h2>Who can take work?</h2>
              <span>Keep worker workload and dispatch context visible.</span>
            </div>
            <button type="button" onClick={() => onNav?.("crew")}>View crew</button>
          </header>

          <div className="vision-feed">
            {workers.slice(0, 5).map((worker, index) => (
              <button className="vision-feed-row" key={worker.id || worker._id || index} onClick={() => onNav?.("crew")}>
                <div>
                  <strong>{titleOf(worker, `Worker ${index + 1}`)}</strong>
                  <span>{worker.role || "Worker"} · {worker.region || "No region set"}</span>
                </div>
                <b>{worker.status || "Available"}</b>
              </button>
            ))}
            {!workers.length ? <div className="vision-empty">No workers yet. Add or import crew to unlock stronger AI dispatch.</div> : null}
          </div>
        </article>

        <article className="vision-panel">
          <header>
            <div>
              <p>CASHFLOW</p>
              <h2>Proof to paid</h2>
              <span>Completed work becomes invoice-ready faster.</span>
            </div>
            <button type="button" onClick={() => onNav?.("invoices")}>Open invoices</button>
          </header>

          <div className="vision-feed">
            {invoices.slice(0, 5).map((invoice, index) => (
              <button className="vision-feed-row" key={invoice.id || invoice._id || index} onClick={() => onNav?.("invoices")}>
                <div>
                  <strong>{titleOf(invoice, `Invoice ${index + 1}`)}</strong>
                  <span>{clientOf(invoice)} · {invoice.status || "Draft"}</span>
                </div>
                <b>{moneyOf(invoice)}</b>
              </button>
            ))}
            {!invoices.length ? <div className="vision-empty">No invoices yet. Draft invoices will appear here.</div> : null}
          </div>
        </article>
      </section>
    </main>
  );
}
