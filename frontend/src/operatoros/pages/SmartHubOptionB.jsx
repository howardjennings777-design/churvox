import "./SmartHubOptionB.css";

function safeList(value) {
  return Array.isArray(value) ? value : [];
}

function statusSlug(item) {
  return String(item?.status || item?.job_status || item?.payment_status || item?.quote_status || "").toLowerCase().replace(/\s+/g, "_");
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

function titleOf(item, fallback = "Item") {
  return item?.title || item?.name || item?.client_name || item?.customer_name || item?.invoice_number || item?.quote_number || fallback;
}

function clientOf(item) {
  return item?.client_name || item?.customer_name || item?.client || item?.customer || "Client";
}

function useDashboardModel(data = {}) {
  const jobs = safeList(data.jobs);
  const workers = safeList(data.workers || data.team);
  const clients = safeList(data.clients);
  const invoices = safeList(data.invoices);
  const quotes = safeList(data.quotes);

  const activeJobs = safeList(data.activeJobs).length
    ? safeList(data.activeJobs)
    : jobs.filter((job) => ["assigned", "acknowledged", "in_progress", "paused"].includes(statusSlug(job)));

  const unassignedJobs = safeList(data.unassignedJobs).length
    ? safeList(data.unassignedJobs)
    : jobs.filter((job) => !job.assigned_worker_id && !job.worker_id && !job.assigned_to);

  const completedJobs = safeList(data.completedJobs).length
    ? safeList(data.completedJobs)
    : jobs.filter((job) => ["completed", "done", "closed"].includes(statusSlug(job)));

  const unpaidInvoices = safeList(data.unpaidInvoices).length
    ? safeList(data.unpaidInvoices)
    : invoices.filter((invoice) => !["paid", "cancelled", "void"].includes(statusSlug(invoice)));

  const openQuotes = safeList(data.openQuotes).length
    ? safeList(data.openQuotes)
    : quotes.filter((quote) => ["sent", "pending", "open", "draft"].includes(statusSlug(quote)));

  const cashWaiting = unpaidInvoices.reduce((sum, invoice) => sum + amountOf(invoice), 0);
  const preparedActions = unassignedJobs.length + unpaidInvoices.length + openQuotes.length + completedJobs.length;

  const bestMove = completedJobs[0]
    ? {
        label: "Create invoice draft",
        title: `Create draft invoice from ${titleOf(completedJobs[0], "completed job")}`,
        body: "AI has proof, job details and customer context ready. Review the invoice draft before sending.",
        nav: "proof",
        button: "Review proof"
      }
    : unassignedJobs[0]
    ? {
        label: "Dispatch job",
        title: `Assign crew to ${titleOf(unassignedJobs[0], "unassigned job")}`,
        body: "AI can match the best worker by availability, workload, area and job type. Owner approval happens first.",
        nav: "queue",
        button: "Open match"
      }
    : unpaidInvoices[0]
    ? {
        label: "Recover cashflow",
        title: `Follow up ${titleOf(unpaidInvoices[0], "unpaid invoice")}`,
        body: "AI can prepare a polite payment reminder. Nothing is sent until you approve it.",
        nav: "invoices",
        button: "Open invoice"
      }
    : openQuotes[0]
    ? {
        label: "Win more work",
        title: `Follow up ${titleOf(openQuotes[0], "open quote")}`,
        body: "AI can draft a quick follow-up while the job is still fresh in the customer’s mind.",
        nav: "quotes",
        button: "Open quote"
      }
    : {
        label: "All clear",
        title: "No urgent owner approval waiting",
        body: "Churvox is still watching jobs, proof, invoices, quotes and crew changes in the background.",
        nav: "queue",
        button: "Open queue"
      };

  return {
    jobs,
    workers,
    clients,
    invoices,
    quotes,
    activeJobs,
    unassignedJobs,
    completedJobs,
    unpaidInvoices,
    openQuotes,
    cashWaiting,
    preparedActions,
    bestMove,
  };
}

function MiniRow({ title, meta, action }) {
  return (
    <article className="cx-mini-row">
      <div>
        <strong>{title}</strong>
        <span>{meta}</span>
      </div>
      <b>{action}</b>
    </article>
  );
}

function SmartStat({ label, value, text, onClick }) {
  return (
    <button type="button" className="cx-stat" onClick={onClick}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{text}</small>
    </button>
  );
}

function WorkPanel({ eyebrow, title, subtitle, button, onClick, children }) {
  return (
    <section className="cx-panel">
      <header>
        <div>
          <p>{eyebrow}</p>
          <h2>{title}</h2>
          {subtitle ? <span>{subtitle}</span> : null}
        </div>
        {button ? <button type="button" onClick={onClick}>{button}</button> : null}
      </header>
      {children}
    </section>
  );
}

function ListBlock({ items, empty, onOpen }) {
  const shown = safeList(items).slice(0, 4);
  if (!shown.length) return <div className="cx-empty">{empty}</div>;

  return (
    <div className="cx-list">
      {shown.map((item, index) => (
        <button type="button" key={item.id || item._id || index} onClick={onOpen}>
          <strong>{titleOf(item, `Item ${index + 1}`)}</strong>
          <span>{clientOf(item)} · {money(amountOf(item))}</span>
        </button>
      ))}
    </div>
  );
}

export default function SmartHubOptionB({ data = {}, onNav, onCreate }) {
  const model = useDashboardModel(data);

  const stats = [
    ["Jobs", model.jobs.length, "Every job in one live command view", "jobs"],
    ["Crew", model.workers.length, "Workers, availability and dispatch", "crew"],
    ["Invoices", money(model.cashWaiting), "Unpaid value ready for action", "invoices"],
    ["Actions", model.preparedActions, "AI-prepared owner approvals", "queue"],
  ];

  return (
    <main className="cx-page" data-option-b="10-10-smart-hub">
      <section className="cx-hero">
        <div className="cx-hero-copy">
          <p>BUILD 10/10 · CHURVOX OPTION B</p>
          <h1>
            The AI operator for trade businesses.
            <span>You approve. It runs the admin.</span>
          </h1>
          <strong>
            Churvox watches jobs, crew, clients, proof photos, quotes, invoices and follow-ups — then prepares the next move for owner approval.
          </strong>

          <div className="cx-hero-actions">
            <button type="button" onClick={() => onNav?.("queue")}>Open AI Work Queue</button>
            <button type="button" onClick={() => onCreate?.("jobs")}>Create Job</button>
            <button type="button" onClick={() => onNav?.("invoices")}>Review Cashflow</button>
          </div>
        </div>

        <aside className="cx-product-preview">
          <div className="cx-mini-sidebar">
            <div className="cx-mini-logo"><img src="/brand/churvox-holo-c.svg" alt="" /><b>CHURVOX</b></div>
            { ["Smart Hub", "AI Work Queue", "Jobs", "Crew", "Quotes", "Invoices", "Payments"].map((item, index) => (
              <span key={item} className={index === 0 ? "active" : ""}>{item}</span>
            )) }
          </div>

          <div className="cx-mini-main">
            <div className="cx-mini-top"><small>AI Operator</small><b>Online & working</b></div>
            <div className="cx-mini-status">
              <span>{model.preparedActions}</span>
              <small>owner approvals ready</small>
            </div>
            <MiniRow title="Create invoice draft" meta="Completed job → proof reviewed" action="Ready" />
            <MiniRow title="Assign worker" meta="Best fit by area + workload" action="Match" />
            <MiniRow title="Quote follow-up" meta="Draft message prepared" action="Approve" />
          </div>
        </aside>
      </section>

      {data.notice ? <section className="cx-notice">{data.notice}</section> : null}

      <section className="cx-stats">
        {stats.map(([label, value, text, nav]) => (
          <SmartStat key={label} label={label} value={value} text={text} onClick={() => onNav?.(nav)} />
        ))}
      </section>

      <section className="cx-grid">
        <WorkPanel
          eyebrow="AI NEXT BEST MOVE"
          title={model.bestMove.title}
          subtitle={model.bestMove.body}
          button={model.bestMove.button}
          onClick={() => onNav?.(model.bestMove.nav)}
        >
          <article className="cx-approval-card">
            <span>{model.bestMove.label}</span>
            <h3>AI prepared this action for owner approval.</h3>
            <p>Guardrail: no customer message, invoice send, worker assignment, payment action, payroll change or MYOB sync happens without approval.</p>
            <div>
              <button type="button" onClick={() => onNav?.("queue")}>Review</button>
              <button type="button" onClick={() => onNav?.(model.bestMove.nav)}>Approve path</button>
            </div>
          </article>
        </WorkPanel>

        <WorkPanel
          eyebrow="CASHFLOW"
          title={money(model.cashWaiting)}
          subtitle={`${model.unpaidInvoices.length} unpaid invoice action${model.unpaidInvoices.length === 1 ? "" : "s"} ready.`}
          button="Open invoices"
          onClick={() => onNav?.("invoices")}
        >
          <ListBlock items={model.unpaidInvoices} empty="No unpaid invoices to chase." onOpen={() => onNav?.("invoices")} />
        </WorkPanel>

        <WorkPanel
          eyebrow="PROOF TO PAID"
          title={`${model.completedJobs.length} completed`}
          subtitle="Completed jobs ready for proof review and invoice prep."
          button="Open proof"
          onClick={() => onNav?.("proof")}
        >
          <ListBlock items={model.completedJobs} empty="No completed jobs waiting for invoice prep." onOpen={() => onNav?.("proof")} />
        </WorkPanel>

        <WorkPanel
          eyebrow="DISPATCH"
          title={`${model.unassignedJobs.length} need crew`}
          subtitle="AI can recommend workers by area, workload and job type."
          button="Open jobs"
          onClick={() => onNav?.("jobs")}
        >
          <ListBlock items={model.unassignedJobs} empty="No unassigned jobs right now." onOpen={() => onNav?.("jobs")} />
        </WorkPanel>

        <WorkPanel
          eyebrow="QUOTE FOLLOW-UP"
          title={`${model.openQuotes.length} quotes`}
          subtitle="Open quotes that AI can draft follow-ups for."
          button="Open quotes"
          onClick={() => onNav?.("quotes")}
        >
          <ListBlock items={model.openQuotes} empty="No quote follow-ups waiting." onOpen={() => onNav?.("quotes")} />
        </WorkPanel>

        <WorkPanel
          eyebrow="CREW CONTROL"
          title={`${model.workers.length} people`}
          subtitle="Crew, office, payroll and manager visibility."
          button="Open crew"
          onClick={() => onNav?.("crew")}
        >
          <ListBlock items={model.workers} empty="No crew loaded yet." onOpen={() => onNav?.("crew")} />
        </WorkPanel>
      </section>
    </main>
  );
}
