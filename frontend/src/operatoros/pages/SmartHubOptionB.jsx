import "./SmartHubOptionB.css";

function safeList(value) {
  return Array.isArray(value) ? value : [];
}

function statusSlug(item) {
  return String(item?.status || item?.job_status || item?.payment_status || item?.quote_status || "")
    .toLowerCase()
    .replace(/\s+/g, "_");
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

function useCommandModel(data = {}) {
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
  const approvals = unassignedJobs.length + unpaidInvoices.length + openQuotes.length + completedJobs.length;

  const nextMove = completedJobs[0]
    ? {
        tag: "Proof to paid",
        title: `Turn ${titleOf(completedJobs[0], "completed job")} into a draft invoice`,
        body: "The worker proof, job notes and client context are ready. Churvox can prepare the invoice draft, then wait for your approval.",
        nav: "proof",
        cta: "Review proof",
      }
    : unassignedJobs[0]
    ? {
        tag: "Dispatch",
        title: `Match the right worker to ${titleOf(unassignedJobs[0], "unassigned job")}`,
        body: "The AI can compare workload, area, availability and job type, then prepare the assignment for you to approve.",
        nav: "queue",
        cta: "Open match",
      }
    : unpaidInvoices[0]
    ? {
        tag: "Cashflow",
        title: `Prepare a payment follow-up for ${titleOf(unpaidInvoices[0], "unpaid invoice")}`,
        body: "Churvox can draft a professional reminder. Nothing is sent until you approve the message.",
        nav: "invoices",
        cta: "Open invoice",
      }
    : openQuotes[0]
    ? {
        tag: "Sales follow-up",
        title: `Follow up ${titleOf(openQuotes[0], "open quote")}`,
        body: "A short follow-up is ready to help win the job while the customer is still warm.",
        nav: "quotes",
        cta: "Open quote",
      }
    : {
        tag: "Command centre clear",
        title: "No urgent owner approval waiting",
        body: "The AI operator is still watching jobs, invoices, proof, quotes, clients and crew updates in the background.",
        nav: "queue",
        cta: "Open queue",
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
    approvals,
    nextMove,
  };
}

function SignalCard({ label, value, text, onClick }) {
  return (
    <button type="button" className="neo-signal" onClick={onClick}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{text}</small>
    </button>
  );
}

function MiniAction({ title, meta, status }) {
  return (
    <article className="neo-mini-action">
      <div>
        <strong>{title}</strong>
        <span>{meta}</span>
      </div>
      <b>{status}</b>
    </article>
  );
}

function CommandPanel({ eyebrow, title, subtitle, action, onClick, children }) {
  return (
    <section className="neo-panel">
      <header>
        <div>
          <p>{eyebrow}</p>
          <h2>{title}</h2>
          {subtitle ? <span>{subtitle}</span> : null}
        </div>
        {action ? <button type="button" onClick={onClick}>{action}</button> : null}
      </header>
      {children}
    </section>
  );
}

function ItemList({ items, empty, onOpen }) {
  const shown = safeList(items).slice(0, 4);
  if (!shown.length) return <div className="neo-empty">{empty}</div>;

  return (
    <div className="neo-list">
      {shown.map((item, index) => (
        <button type="button" key={item.id || item._id || index} onClick={onOpen}>
          <strong>{titleOf(item, `Item ${index + 1}`)}</strong>
          <span>{clientOf(item)} · {amountOf(item) ? money(amountOf(item)) : statusSlug(item) || "Ready"}</span>
        </button>
      ))}
    </div>
  );
}

export default function SmartHubOptionB({ data = {}, onNav, onCreate }) {
  const model = useCommandModel(data);

  const signals = [
    ["Jobs tracked", model.jobs.length, "Live jobs inside the operator", "jobs"],
    ["Crew watched", model.workers.length, "Worker availability and workload", "crew"],
    ["Cash waiting", money(model.cashWaiting), "Unpaid value needing action", "invoices"],
    ["Approvals", model.approvals, "Prepared by AI, approved by owner", "queue"],
  ];

  return (
    <main className="neo-page" data-smart-hub="ai-command-centre">
      <section className="neo-hero">
        <div className="neo-orbit one" />
        <div className="neo-orbit two" />

        <div className="neo-hero-copy">
          <p>CHURVOX AI COMMAND CENTRE</p>
          <h1>
            The business runs from here.
            <span>AI does the admin. You approve.</span>
          </h1>
          <strong>
            Jobs, crew, quotes, invoices, proof photos and follow-ups are pulled into one command view so the owner sees the next move before anything gets missed.
          </strong>

          <div className="neo-actions">
            <button type="button" onClick={() => onNav?.("queue")}>Open AI Work Queue</button>
            <button type="button" onClick={() => onCreate?.("jobs")}>Create Job</button>
            <button type="button" onClick={() => onNav?.("proof")}>Proof to Paid</button>
          </div>
        </div>

        <aside className="neo-product">
          <div className="neo-product-glow" />
          <div className="neo-phone-shell">
            <div className="neo-phone-rail">
              <img src="/brand/churvox-holo-c.svg" alt="" />
              {["Hub", "AI", "Jobs", "Crew", "Cash"].map((item, index) => (
                <span key={item} className={index === 0 ? "active" : ""}>{item}</span>
              ))}
            </div>

            <div className="neo-phone-main">
              <div className="neo-phone-top">
                <small>AI Operator</small>
                <b>Live</b>
              </div>
              <div className="neo-core">
                <img src="/brand/churvox-holo-c.svg" alt="" />
                <strong>{model.approvals}</strong>
                <span>owner approvals ready</span>
              </div>
              <MiniAction title="Invoice draft" meta="Proof ready from completed job" status="Prepared" />
              <MiniAction title="Worker match" meta="Area, workload and job type checked" status="Match" />
              <MiniAction title="Client follow-up" meta="Message drafted, not sent" status="Approve" />
            </div>
          </div>
        </aside>
      </section>

      {data.notice ? <section className="neo-notice">{data.notice}</section> : null}

      <section className="neo-signals">
        {signals.map(([label, value, text, nav]) => (
          <SignalCard key={label} label={label} value={value} text={text} onClick={() => onNav?.(nav)} />
        ))}
      </section>

      <section className="neo-grid">
        <CommandPanel
          eyebrow="AI NEXT MOVE"
          title={model.nextMove.title}
          subtitle={model.nextMove.body}
          action={model.nextMove.cta}
          onClick={() => onNav?.(model.nextMove.nav)}
        >
          <article className="neo-approval-card">
            <span>{model.nextMove.tag}</span>
            <h3>Ready for owner approval</h3>
            <p>Guardrails are locked: no customer send, no worker assignment, no invoice send, no payment action, no payroll change and no MYOB sync without approval.</p>
            <div>
              <button type="button" onClick={() => onNav?.("queue")}>Review details</button>
              <button type="button" onClick={() => onNav?.(model.nextMove.nav)}>Open action</button>
            </div>
          </article>
        </CommandPanel>

        <CommandPanel
          eyebrow="CASHFLOW RADAR"
          title={money(model.cashWaiting)}
          subtitle={`${model.unpaidInvoices.length} unpaid invoice action${model.unpaidInvoices.length === 1 ? "" : "s"} waiting.`}
          action="Open invoices"
          onClick={() => onNav?.("invoices")}
        >
          <ItemList items={model.unpaidInvoices} empty="No unpaid invoices need action." onOpen={() => onNav?.("invoices")} />
        </CommandPanel>

        <CommandPanel
          eyebrow="PROOF TO PAID"
          title={`${model.completedJobs.length} completed`}
          subtitle="Completed work ready for proof review and invoice preparation."
          action="Open proof"
          onClick={() => onNav?.("proof")}
        >
          <ItemList items={model.completedJobs} empty="No completed jobs waiting for invoice prep." onOpen={() => onNav?.("proof")} />
        </CommandPanel>

        <CommandPanel
          eyebrow="DISPATCH CONTROL"
          title={`${model.unassignedJobs.length} need crew`}
          subtitle="AI can match workers by area, workload, availability and job type."
          action="Open jobs"
          onClick={() => onNav?.("jobs")}
        >
          <ItemList items={model.unassignedJobs} empty="No unassigned jobs right now." onOpen={() => onNav?.("jobs")} />
        </CommandPanel>

        <CommandPanel
          eyebrow="QUOTE RECOVERY"
          title={`${model.openQuotes.length} quotes`}
          subtitle="Open quotes that can be followed up from the approval queue."
          action="Open quotes"
          onClick={() => onNav?.("quotes")}
        >
          <ItemList items={model.openQuotes} empty="No quote follow-ups waiting." onOpen={() => onNav?.("quotes")} />
        </CommandPanel>

        <CommandPanel
          eyebrow="CREW INTELLIGENCE"
          title={`${model.workers.length} people`}
          subtitle="Crew, office, payroll and manager visibility in one place."
          action="Open crew"
          onClick={() => onNav?.("crew")}
        >
          <ItemList items={model.workers} empty="No crew loaded yet." onOpen={() => onNav?.("crew")} />
        </CommandPanel>
      </section>
    </main>
  );
}
