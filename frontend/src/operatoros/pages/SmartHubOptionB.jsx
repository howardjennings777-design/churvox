
import { clientOf, moneyOf, titleOf } from "../api";
import "./SmartHubOptionB.css";

function total(items) {
  return (items || []).reduce((sum, item) => sum + Number(item.total || item.amount || item.price || item.balance_due || 0), 0);
}

function Kpi({ label, value, note }) {
  return <article className="vision-signal"><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

function Approval({ title, body, meta, onClick }) {
  return (
    <article className="vision-approval">
      <span>AI OPERATOR</span>
      <h3>{title}</h3>
      <p>{body}</p>
      <div className="op-drawer-actions">
        <button type="button" onClick={onClick}>Review</button>
        <button type="button" className="approve" onClick={onClick}>Approve</button>
      </div>
      <small>{meta}</small>
    </article>
  );
}

export default function SmartHubOptionB({ data = {}, onNav, onCreate }) {
  const jobs = data.jobs || [];
  const invoices = data.invoices || [];
  const quotes = data.quotes || [];
  const workers = data.workers || [];
  const completed = data.completedJobs || [];
  const unassigned = data.unassignedJobs || [];
  const overdue = data.overdueInvoices || [];
  const openQuotes = data.openQuotes || [];

  const approvals = [
    {
      title: "Assign worker",
      body: unassigned[0] ? `AI can prepare a worker assignment for ${titleOf(unassigned[0], "this job")}.` : "No urgent unassigned job found.",
      meta: unassigned[0] ? clientOf(unassigned[0]) : "Dispatch clear",
      nav: "jobs",
    },
    {
      title: "Draft invoice ready",
      body: completed[0] ? `Completed work for ${clientOf(completed[0])} is ready for proof-to-paid review.` : "Completed jobs will appear here.",
      meta: completed[0] ? moneyOf(completed[0]) : "Proof clear",
      nav: "proof",
    },
    {
      title: "Invoice reminder",
      body: overdue[0] ? `AI can draft a friendly payment follow-up for ${clientOf(overdue[0])}.` : "No overdue invoice needs urgent follow-up.",
      meta: overdue[0] ? moneyOf(overdue[0]) : "Cashflow clear",
      nav: "invoices",
    },
    {
      title: "Quote follow-up",
      body: openQuotes[0] ? `AI can prepare a follow-up for ${clientOf(openQuotes[0])}.` : "Open quote follow-ups will appear here.",
      meta: openQuotes[0] ? titleOf(openQuotes[0], "Quote") : "Pipeline clear",
      nav: "quotes",
    },
  ];

  return (
    <main className="vision-page">
      <section className="vision-stage">
        <div className="vision-copy">
          <p>SMART HUB</p>
          <h1>AI runs the admin.<span>You approve.</span></h1>
          <strong>
            A cleaner command centre for jobs, crew, invoices, proof and follow-ups.
            Churvox prepares the next move and keeps you in control.
          </strong>

          <div className="vision-actions">
            <button type="button" onClick={() => onCreate?.("jobs")}>New Job</button>
            <button type="button" onClick={() => onNav?.("queue")}>AI Work Queue</button>
            <button type="button" onClick={() => onNav?.("proof")}>Proof-to-Paid</button>
          </div>
        </div>

        <aside className="vision-command-card">
          <p className="cvx-kicker">TODAY</p>
          <h2>{data.aiActions?.length || 0} AI actions ready</h2>
          <div className="vision-list">
            {approvals.slice(0, 3).map((item) => (
              <button key={item.title} onClick={() => onNav?.(item.nav)}>
                <strong>{item.title}</strong>
                <span>{item.body}</span>
              </button>
            ))}
          </div>
        </aside>
      </section>

      <section className="vision-signals">
        <Kpi label="Revenue" value={moneyOf({ total: total(invoices) })} note="invoice value" />
        <Kpi label="Jobs" value={jobs.length} note="total jobs" />
        <Kpi label="Completed" value={completed.length} note="ready for review" />
        <Kpi label="Quotes" value={quotes.length} note="pipeline" />
      </section>

      <section className="vision-workbench">
        <article className="vision-panel">
          <header>
            <div>
              <p>AI OPERATOR</p>
              <h2>Approval queue</h2>
              <span>Review prepared actions before anything happens.</span>
            </div>
            <button type="button" onClick={() => onNav?.("queue")}>View all</button>
          </header>

          <div className="vision-list">
            {approvals.map((item) => (
              <Approval key={item.title} {...item} onClick={() => onNav?.(item.nav)} />
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
            {jobs.slice(0, 5).map((job, index) => (
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
              <span>Keep worker workload and dispatch visible.</span>
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
