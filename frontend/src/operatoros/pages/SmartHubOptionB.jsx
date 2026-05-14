function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeNumber(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function money(value) {
  return `$${safeNumber(value).toLocaleString()}`;
}

function titleOf(item, fallback) {
  return (
    item?.title ||
    item?.name ||
    item?.job_name ||
    item?.invoice_number ||
    item?.quote_number ||
    item?.client_name ||
    item?.full_name ||
    fallback
  );
}

function clientOf(item) {
  return (
    item?.client_name ||
    item?.client?.name ||
    item?.customer_name ||
    item?.company_name ||
    "No client set"
  );
}

function pillTone(value) {
  const status = String(value || "").toLowerCase();
  if (["paid", "completed", "active", "approved", "ready", "available", "in progress"].includes(status)) return "good";
  if (["overdue", "low", "late", "needs review"].includes(status)) return "warn";
  return "";
}

function Pill({ value }) {
  return <span className={`cx-pill ${pillTone(value)}`}>{value || "Open"}</span>;
}

function Stat({ label, value, note }) {
  return (
    <article className="cx-stat">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function ApprovalCard({ title, body, meta, onOpen }) {
  return (
    <article className="cx-card">
      <span>AI OPERATOR</span>
      <strong>{title}</strong>
      <small>{body}</small>
      <div className="cx-card-actions">
        <button type="button" onClick={onOpen}>Review</button>
        <button type="button" className="approve" onClick={onOpen}>Approve</button>
      </div>
      <small>{meta}</small>
    </article>
  );
}

export default function SmartHubOptionB({ data = {}, onNav, onCreate }) {
  const jobs = asArray(data.jobs);
  const workers = asArray(data.workers);
  const invoices = asArray(data.invoices);
  const quotes = asArray(data.quotes);
  const aiActions = asArray(data.aiActions);
  const overdueInvoices = asArray(data.overdueInvoices);
  const completedJobs = asArray(data.completedJobs);
  const unassignedJobs = asArray(data.unassignedJobs);
  const openQuotes = asArray(data.openQuotes);

  const invoiceValue = invoices.reduce(
    (sum, item) => sum + safeNumber(item.total || item.amount || item.balance_due || item.price),
    0
  );

  const actions = [
    {
      title: "Assign worker",
      body: unassignedJobs[0]
        ? `AI can prepare a worker assignment for ${titleOf(unassignedJobs[0], "this job")}.`
        : "No urgent unassigned job found.",
      meta: unassignedJobs[0] ? clientOf(unassignedJobs[0]) : "Dispatch clear",
      nav: "jobs",
    },
    {
      title: "Draft invoice ready",
      body: completedJobs[0]
        ? `Completed work for ${clientOf(completedJobs[0])} is ready for proof-to-paid review.`
        : "Completed jobs will appear here.",
      meta: completedJobs[0] ? titleOf(completedJobs[0], "Completed job") : "Proof clear",
      nav: "proof",
    },
    {
      title: "Invoice reminder",
      body: overdueInvoices[0]
        ? `AI can draft a payment follow-up for ${clientOf(overdueInvoices[0])}.`
        : "No overdue invoice needs urgent follow-up.",
      meta: overdueInvoices[0] ? money(overdueInvoices[0].total || overdueInvoices[0].amount || overdueInvoices[0].balance_due) : "Cashflow clear",
      nav: "invoices",
    },
    {
      title: "Quote follow-up",
      body: openQuotes[0]
        ? `AI can prepare a follow-up for ${clientOf(openQuotes[0])}.`
        : "Open quote follow-ups will appear here.",
      meta: openQuotes[0] ? titleOf(openQuotes[0], "Quote") : "Pipeline clear",
      nav: "quotes",
    },
  ];

  return (
    <main className="cx-hub">
      <section className="cx-hero">
        <div className="cx-hero-copy">
          <p className="cx-kicker">SMART HUB</p>
          <h1>
            AI runs the admin.
            <span>You approve.</span>
          </h1>
          <strong>
            A cleaner command centre for jobs, crew, invoices, proof and follow-ups.
            Churvox prepares the next move and keeps the owner in control.
          </strong>

          <div className="cx-actions">
            <button type="button" className="primary" onClick={() => onCreate?.("jobs")}>New Job</button>
            <button type="button" onClick={() => onNav?.("queue")}>AI Work Queue</button>
            <button type="button" onClick={() => onNav?.("proof")}>Proof-to-Paid</button>
          </div>

          <div className="cx-stats">
            <Stat label="AI actions" value={aiActions.length} note="ready for review" />
            <Stat label="Jobs" value={jobs.length} note="work on the board" />
            <Stat label="Quotes" value={quotes.length} note="pipeline moving" />
            <Stat label="Invoice value" value={money(invoiceValue)} note="draft to paid" />
          </div>
        </div>

        <aside className="cx-command">
          <p className="cx-kicker">TODAY</p>
          <h2>{actions.filter((a) => !a.body.toLowerCase().startsWith("no ")).length} priority actions</h2>
          <span>Churvox has prepared the next likely admin actions for owner approval.</span>

          <div className="cx-card-list">
            {actions.map((action) => (
              <ApprovalCard
                key={action.title}
                title={action.title}
                body={action.body}
                meta={action.meta}
                onOpen={() => onNav?.(action.nav)}
              />
            ))}
          </div>
        </aside>
      </section>

      <section className="cx-grid">
        <article className="cx-panel">
          <header className="cx-panel-head">
            <div>
              <p>AI OPERATOR</p>
              <h2>Approval queue</h2>
              <span>Review prepared actions before anything happens.</span>
            </div>
            <button type="button" onClick={() => onNav?.("queue")}>View all</button>
          </header>

          <div className="cx-list">
            {actions.map((action) => (
              <button className="cx-row" key={action.title} onClick={() => onNav?.(action.nav)}>
                <div>
                  <strong>{action.title}</strong>
                  <small>{action.body}</small>
                </div>
                <Pill value="Ready" />
              </button>
            ))}
          </div>
        </article>

        <article className="cx-panel">
          <header className="cx-panel-head">
            <div>
              <p>TODAY / RUN SHEET</p>
              <h2>Work moving today</h2>
              <span>Jobs and crew stay easy to scan.</span>
            </div>
            <button type="button" onClick={() => onNav?.("jobs")}>Open jobs</button>
          </header>

          <div className="cx-feed">
            {jobs.slice(0, 5).map((job, index) => (
              <button className="cx-row" key={job.id || job._id || index} onClick={() => onNav?.("jobs")}>
                <div>
                  <strong>{titleOf(job, `Job ${index + 1}`)}</strong>
                  <small>{clientOf(job)} · {job.address || job.site_address || "No address set"}</small>
                </div>
                <Pill value={job.status || job.job_status || "Open"} />
              </button>
            ))}
            {!jobs.length ? <div className="cx-empty">No jobs yet. Create a job and Churvox will start preparing the admin.</div> : null}
          </div>
        </article>
      </section>

      <section className="cx-grid">
        <article className="cx-panel">
          <header className="cx-panel-head">
            <div>
              <p>CREW & DISPATCH</p>
              <h2>Who can take work?</h2>
              <span>Keep worker workload and dispatch visible.</span>
            </div>
            <button type="button" onClick={() => onNav?.("crew")}>View crew</button>
          </header>

          <div className="cx-feed">
            {workers.slice(0, 5).map((worker, index) => (
              <button className="cx-row" key={worker.id || worker._id || index} onClick={() => onNav?.("crew")}>
                <div>
                  <strong>{titleOf(worker, `Worker ${index + 1}`)}</strong>
                  <small>{worker.role || "Worker"} · {worker.region || "No region set"}</small>
                </div>
                <Pill value={worker.status || "Available"} />
              </button>
            ))}
            {!workers.length ? <div className="cx-empty">No workers yet. Add or import crew to unlock stronger AI dispatch.</div> : null}
          </div>
        </article>

        <article className="cx-panel">
          <header className="cx-panel-head">
            <div>
              <p>CASHFLOW</p>
              <h2>Proof to paid</h2>
              <span>Completed work becomes invoice-ready faster.</span>
            </div>
            <button type="button" onClick={() => onNav?.("invoices")}>Open invoices</button>
          </header>

          <div className="cx-feed">
            {invoices.slice(0, 5).map((invoice, index) => (
              <button className="cx-row" key={invoice.id || invoice._id || index} onClick={() => onNav?.("invoices")}>
                <div>
                  <strong>{titleOf(invoice, `Invoice ${index + 1}`)}</strong>
                  <small>{clientOf(invoice)} · {invoice.status || "Draft"}</small>
                </div>
                <Pill value={money(invoice.total || invoice.amount || invoice.balance_due || invoice.price)} />
              </button>
            ))}
            {!invoices.length ? <div className="cx-empty">No invoices yet. Draft invoices will appear here.</div> : null}
          </div>
        </article>
      </section>
    </main>
  );
}
