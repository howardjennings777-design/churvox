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
        body: "Worker proof is in. Churvox can prepare the invoice draft and hold it for approval.",
        nav: "proof",
        cta: "Review proof",
      }
    : unassignedJobs[0]
    ? {
        tag: "Dispatch",
        title: `Match the right worker to ${titleOf(unassignedJobs[0], "unassigned job")}`,
        body: "AI checks area, workload, availability and job type before suggesting a worker.",
        nav: "queue",
        cta: "Open match",
      }
    : unpaidInvoices[0]
    ? {
        tag: "Cashflow",
        title: `Prepare payment follow-up for ${titleOf(unpaidInvoices[0], "unpaid invoice")}`,
        body: "A customer reminder can be drafted now. Nothing sends without your approval.",
        nav: "invoices",
        cta: "Open invoice",
      }
    : openQuotes[0]
    ? {
        tag: "Sales follow-up",
        title: `Follow up ${titleOf(openQuotes[0], "open quote")}`,
        body: "A short follow-up is ready while the job is still warm.",
        nav: "quotes",
        cta: "Open quote",
      }
    : {
        tag: "All clear",
        title: "No urgent owner approval waiting",
        body: "The AI operator is still scanning jobs, proof, cashflow, quotes and crew changes.",
        nav: "queue",
        cta: "Open queue",
      };

  return {
    jobs,
    workers,
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
    <button type="button" className="vision-signal" onClick={onClick}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{text}</small>
    </button>
  );
}

function FeedRow({ title, meta, status }) {
  return (
    <article className="vision-feed-row">
      <div>
        <strong>{title}</strong>
        <span>{meta}</span>
      </div>
      <b>{status}</b>
    </article>
  );
}

function Panel({ eyebrow, title, subtitle, action, onClick, children }) {
  return (
    <section className="vision-panel">
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
  if (!shown.length) return <div className="vision-empty">{empty}</div>;

  return (
    <div className="vision-list">
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
    ["Jobs", model.jobs.length, "tracked by the operator", "jobs"],
    ["Crew", model.workers.length, "watched for dispatch", "crew"],
    ["Cash", money(model.cashWaiting), "waiting for action", "invoices"],
    ["Approvals", model.approvals, "ready for owner", "queue"],
  ];

  return (
    <main className="vision-page" data-smart-hub="cinematic-ai-command-centre">
      <section className="vision-stage">
        <div className="vision-gridline" />
        <div className="vision-glow vision-glow-one" />
        <div className="vision-glow vision-glow-two" />

        <div className="vision-copy">
          <div className="vision-brand-pill">
            <img src="/brand/churvox-holo-c.svg" alt="" />
            <span>CHURVOX AI OPERATOR</span>
          </div>

          <p>COMMAND CENTRE</p>
          <h1>
            AI runs the admin layer.
            <span>You stay in control.</span>
          </h1>
          <strong>
            Churvox scans jobs, crew, proof photos, quotes, invoices and follow-ups, then turns the mess into clear owner-approved moves.
          </strong>

          <div className="vision-actions">
            <button type="button" onClick={() => onNav?.("queue")}>Open AI Work Queue</button>
            <button type="button" onClick={() => onCreate?.("jobs")}>Create Job</button>
            <button type="button" onClick={() => onNav?.("proof")}>Proof to Paid</button>
          </div>
        </div>

        <aside className="vision-command-orb">
          <div className="vision-ring ring-one" />
          <div className="vision-ring ring-two" />
          <div className="vision-ring ring-three" />

          <div className="vision-core-card">
            <img src="/brand/churvox-holo-c.svg" alt="" />
            <strong>{model.approvals}</strong>
            <span>owner approvals prepared</span>
          </div>

          <div className="vision-floating-card card-top">
            <small>AI OPERATOR</small>
            <b>Live scan active</b>
          </div>
          <div className="vision-floating-card card-left">
            <small>DISPATCH</small>
            <b>{model.unassignedJobs.length} need crew</b>
          </div>
          <div className="vision-floating-card card-right">
            <small>CASHFLOW</small>
            <b>{money(model.cashWaiting)}</b>
          </div>
        </aside>
      </section>

      {data.notice ? <section className="vision-notice">{data.notice}</section> : null}

      <section className="vision-signals">
        {signals.map(([label, value, text, nav]) => (
          <SignalCard key={label} label={label} value={value} text={text} onClick={() => onNav?.(nav)} />
        ))}
      </section>

      <section className="vision-workbench">
        <Panel
          eyebrow="AI NEXT BEST MOVE"
          title={model.nextMove.title}
          subtitle={model.nextMove.body}
          action={model.nextMove.cta}
          onClick={() => onNav?.(model.nextMove.nav)}
        >
          <article className="vision-approval">
            <span>{model.nextMove.tag}</span>
            <h3>Prepared. Explained. Waiting for approval.</h3>
            <p>No customer message, worker assignment, invoice send, payment action, payroll change or MYOB sync happens without owner approval.</p>
            <div>
              <button type="button" onClick={() => onNav?.("queue")}>Review details</button>
              <button type="button" onClick={() => onNav?.(model.nextMove.nav)}>Open action</button>
            </div>
          </article>
        </Panel>

        <Panel
          eyebrow="LIVE OPERATOR FEED"
          title="What AI is watching"
          subtitle="A cleaner command feed instead of a busy dashboard."
        >
          <div className="vision-feed">
            <FeedRow title="Invoice draft" meta="Completed job proof checked" status="Ready" />
            <FeedRow title="Worker match" meta="Area and workload scanned" status="Match" />
            <FeedRow title="Quote recovery" meta="Follow-up can be drafted" status="Draft" />
            <FeedRow title="Cashflow" meta="Unpaid invoices monitored" status="Watch" />
          </div>
        </Panel>

        <Panel
          eyebrow="PROOF TO PAID"
          title={`${model.completedJobs.length} completed`}
          subtitle="Completed work ready for proof review and invoice preparation."
          action="Open proof"
          onClick={() => onNav?.("proof")}
        >
          <ItemList items={model.completedJobs} empty="No completed jobs waiting for invoice prep." onOpen={() => onNav?.("proof")} />
        </Panel>

        <Panel
          eyebrow="DISPATCH CONTROL"
          title={`${model.unassignedJobs.length} need crew`}
          subtitle="AI can match workers by area, workload, availability and job type."
          action="Open jobs"
          onClick={() => onNav?.("jobs")}
        >
          <ItemList items={model.unassignedJobs} empty="No unassigned jobs right now." onOpen={() => onNav?.("jobs")} />
        </Panel>

        <Panel
          eyebrow="CASHFLOW RADAR"
          title={money(model.cashWaiting)}
          subtitle={`${model.unpaidInvoices.length} unpaid invoice action${model.unpaidInvoices.length === 1 ? "" : "s"} waiting.`}
          action="Open invoices"
          onClick={() => onNav?.("invoices")}
        >
          <ItemList items={model.unpaidInvoices} empty="No unpaid invoices need action." onOpen={() => onNav?.("invoices")} />
        </Panel>

        <Panel
          eyebrow="QUOTE RECOVERY"
          title={`${model.openQuotes.length} quotes`}
          subtitle="Open quotes that can be followed up from the approval queue."
          action="Open quotes"
          onClick={() => onNav?.("quotes")}
        >
          <ItemList items={model.openQuotes} empty="No quote follow-ups waiting." onOpen={() => onNav?.("quotes")} />
        </Panel>
      </section>
    </main>
  );
}
