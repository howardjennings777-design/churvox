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

function rememberSmartHubAction(action) {
  try {
    sessionStorage.setItem(
      "churvox_smart_hub_last_action",
      JSON.stringify({ ...action, created_at: new Date().toISOString() })
    );
  } catch {}
}

function useCommandModel(data = {}) {
  const jobs = safeList(data.jobs);
  const workers = safeList(data.workers || data.team);
  const invoices = safeList(data.invoices);
  const quotes = safeList(data.quotes);
  const aiActions = safeList(data.aiActions);

  const activeJobs = safeList(data.activeJobs).length
    ? safeList(data.activeJobs)
    : jobs.filter((job) => ["assigned", "acknowledged", "in_progress", "paused"].includes(statusSlug(job)));

  const unassignedJobs = safeList(data.unassignedJobs).length
    ? safeList(data.unassignedJobs)
    : jobs.filter((job) => !job.assigned_worker_id && !job.worker_id && !job.assigned_to && !job.assigned_worker_name && !job.worker_name);

  const completedJobs = safeList(data.completedJobs).length
    ? safeList(data.completedJobs)
    : jobs.filter((job) => ["completed", "done", "closed"].includes(statusSlug(job)));

  const unpaidInvoices = safeList(data.unpaidInvoices).length
    ? safeList(data.unpaidInvoices)
    : invoices.filter((invoice) => !["paid", "cancelled", "void"].includes(statusSlug(invoice)));

  const openQuotes = safeList(data.openQuotes).length
    ? safeList(data.openQuotes)
    : quotes.filter((quote) => ["sent", "pending", "open", "draft", "waiting"].includes(statusSlug(quote)));

  const cashWaiting = unpaidInvoices.reduce((sum, invoice) => sum + amountOf(invoice), 0);
  const approvals = aiActions.length || unassignedJobs.length + unpaidInvoices.length + openQuotes.length + completedJobs.length;

  const nextMove = aiActions[0]
    ? {
        tag: aiActions[0].type || aiActions[0].category || "AI work queue",
        title: aiActions[0].title || "Review the next AI-prepared action",
        body: aiActions[0].summary || aiActions[0].description || "AI has prepared work for owner review and approval.",
        nav: "queue",
        cta: "Review action",
        context: { source: "ai_action", id: aiActions[0].id || aiActions[0]._id || "" },
      }
    : completedJobs[0]
    ? {
        tag: "Proof to paid",
        title: `Turn ${titleOf(completedJobs[0], "completed job")} into a draft invoice`,
        body: "Worker proof is in. Churvox can prepare the invoice draft and hold it for approval.",
        nav: "proof",
        cta: "Review proof",
        context: { source: "completed_job", id: completedJobs[0].id || completedJobs[0]._id || "" },
      }
    : unassignedJobs[0]
    ? {
        tag: "Dispatch",
        title: `Match the right worker to ${titleOf(unassignedJobs[0], "unassigned job")}`,
        body: "AI checks area, workload, availability and job type before suggesting a worker.",
        nav: "queue",
        cta: "Open match",
        context: { source: "unassigned_job", id: unassignedJobs[0].id || unassignedJobs[0]._id || "" },
      }
    : unpaidInvoices[0]
    ? {
        tag: "Cashflow",
        title: `Prepare payment follow-up for ${titleOf(unpaidInvoices[0], "unpaid invoice")}`,
        body: "A customer reminder can be drafted now. Nothing sends without your approval.",
        nav: "invoices",
        cta: "Open invoice",
        context: { source: "unpaid_invoice", id: unpaidInvoices[0].id || unpaidInvoices[0]._id || "" },
      }
    : openQuotes[0]
    ? {
        tag: "Sales follow-up",
        title: `Follow up ${titleOf(openQuotes[0], "open quote")}`,
        body: "A short follow-up is ready while the job is still warm.",
        nav: "quotes",
        cta: "Open quote",
        context: { source: "open_quote", id: openQuotes[0].id || openQuotes[0]._id || "" },
      }
    : {
        tag: "All clear",
        title: "No urgent owner approval waiting",
        body: "The AI operator is still scanning jobs, proof, cashflow, quotes and crew changes.",
        nav: "queue",
        cta: "Open queue",
        context: { source: "clear" },
      };

  return {
    jobs,
    workers,
    invoices,
    quotes,
    aiActions,
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

function FeedRow({ title, meta, status, onClick }) {
  return (
    <button type="button" className="vision-feed-row" onClick={onClick}>
      <div>
        <strong>{title}</strong>
        <span>{meta}</span>
      </div>
      <b>{status}</b>
    </button>
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
        <button type="button" key={item.id || item._id || index} onClick={() => onOpen?.(item)}>
          <strong>{titleOf(item, `Item ${index + 1}`)}</strong>
          <span>{clientOf(item)} · {amountOf(item) ? money(amountOf(item)) : statusSlug(item) || "Ready"}</span>
        </button>
      ))}
    </div>
  );
}

export default function SmartHubOptionB({ data = {}, onNav, onCreate }) {
  const model = useCommandModel(data);

  function go(nav, context = {}) {
    rememberSmartHubAction({ nav, ...context });
    onNav?.(nav);
  }

  function create(type, context = {}) {
    rememberSmartHubAction({ create: type, ...context });
    onCreate?.(type);
  }

  const signals = [
    ["Jobs", model.jobs.length, "tracked by the operator", "jobs", { source: "signal_jobs" }],
    ["Crew", model.workers.length, "watched for dispatch", "crew", { source: "signal_crew" }],
    ["Cash", money(model.cashWaiting), "waiting for action", "invoices", { source: "signal_cash" }],
    ["Approvals", model.approvals, "ready for owner", "queue", { source: "signal_approvals" }],
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
            <button type="button" onClick={() => go("queue", { source: "hero_queue" })}>Open AI Work Queue</button>
            <button type="button" onClick={() => create("jobs", { source: "hero_create_job" })}>Create Job</button>
            <button type="button" onClick={() => go("proof", { source: "hero_proof_to_paid" })}>Proof to Paid</button>
          </div>
        </div>

        <aside className="vision-command-orb">
          <div className="vision-ring ring-one" />
          <div className="vision-ring ring-two" />
          <div className="vision-ring ring-three" />

          <button type="button" className="vision-core-card" onClick={() => go("queue", { source: "orb_core" })}>
            <img src="/brand/churvox-holo-c.svg" alt="" />
            <strong>{model.approvals}</strong>
            <span>owner approvals prepared</span>
          </button>

          <button type="button" className="vision-floating-card card-top" onClick={() => go("queue", { source: "orb_ai_operator" })}>
            <small>AI OPERATOR</small>
            <b>Live scan active</b>
          </button>

          <button type="button" className="vision-floating-card card-left" onClick={() => go("jobs", { source: "orb_dispatch" })}>
            <small>DISPATCH</small>
            <b>{model.unassignedJobs.length} need crew</b>
          </button>

          <button type="button" className="vision-floating-card card-right" onClick={() => go("invoices", { source: "orb_cashflow" })}>
            <small>CASHFLOW</small>
            <b>{money(model.cashWaiting)}</b>
          </button>
        </aside>
      </section>

      {data.notice ? <section className="vision-notice">{data.notice}</section> : null}

      <section className="vision-signals">
        {signals.map(([label, value, text, nav, context]) => (
          <SignalCard key={label} label={label} value={value} text={text} onClick={() => go(nav, context)} />
        ))}
      </section>

      <section className="vision-workbench">
        <Panel
          eyebrow="AI NEXT BEST MOVE"
          title={model.nextMove.title}
          subtitle={model.nextMove.body}
          action={model.nextMove.cta}
          onClick={() => go(model.nextMove.nav, model.nextMove.context)}
        >
          <article className="vision-approval">
            <span>{model.nextMove.tag}</span>
            <h3>Prepared. Explained. Waiting for approval.</h3>
            <p>No customer message, worker assignment, invoice send, payment action, payroll change or MYOB sync happens without owner approval.</p>
            <div>
              <button type="button" onClick={() => go("queue", { source: "next_move_review", ...model.nextMove.context })}>Review details</button>
              <button type="button" onClick={() => go(model.nextMove.nav, { source: "next_move_open", ...model.nextMove.context })}>Open action</button>
            </div>
          </article>
        </Panel>

        <Panel
          eyebrow="LIVE OPERATOR FEED"
          title="What AI is watching"
          subtitle="Tap a feed row to open the real workspace."
        >
          <div className="vision-feed">
            <FeedRow title="Invoice draft" meta={`${model.completedJobs.length} completed job${model.completedJobs.length === 1 ? "" : "s"} ready`} status="Proof" onClick={() => go("proof", { source: "feed_invoice_draft" })} />
            <FeedRow title="Worker match" meta={`${model.unassignedJobs.length} job${model.unassignedJobs.length === 1 ? "" : "s"} need crew`} status="Dispatch" onClick={() => go("queue", { source: "feed_worker_match" })} />
            <FeedRow title="Quote recovery" meta={`${model.openQuotes.length} quote${model.openQuotes.length === 1 ? "" : "s"} can be followed up`} status="Quotes" onClick={() => go("quotes", { source: "feed_quote_recovery" })} />
            <FeedRow title="Cashflow" meta={`${model.unpaidInvoices.length} unpaid invoice action${model.unpaidInvoices.length === 1 ? "" : "s"}`} status="Cash" onClick={() => go("invoices", { source: "feed_cashflow" })} />
          </div>
        </Panel>

        <Panel
          eyebrow="PROOF TO PAID"
          title={`${model.completedJobs.length} completed`}
          subtitle="Completed work ready for proof review and invoice preparation."
          action="Open proof"
          onClick={() => go("proof", { source: "panel_proof" })}
        >
          <ItemList items={model.completedJobs} empty="No completed jobs waiting for invoice prep." onOpen={(item) => go("proof", { source: "proof_item", id: item.id || item._id || "" })} />
        </Panel>

        <Panel
          eyebrow="DISPATCH CONTROL"
          title={`${model.unassignedJobs.length} need crew`}
          subtitle="AI can match workers by area, workload, availability and job type."
          action="Open jobs"
          onClick={() => go("jobs", { source: "panel_dispatch" })}
        >
          <ItemList items={model.unassignedJobs} empty="No unassigned jobs right now." onOpen={(item) => go("jobs", { source: "dispatch_item", id: item.id || item._id || "" })} />
        </Panel>

        <Panel
          eyebrow="CASHFLOW RADAR"
          title={money(model.cashWaiting)}
          subtitle={`${model.unpaidInvoices.length} unpaid invoice action${model.unpaidInvoices.length === 1 ? "" : "s"} waiting.`}
          action="Open invoices"
          onClick={() => go("invoices", { source: "panel_cashflow" })}
        >
          <ItemList items={model.unpaidInvoices} empty="No unpaid invoices need action." onOpen={(item) => go("invoices", { source: "invoice_item", id: item.id || item._id || "" })} />
        </Panel>

        <Panel
          eyebrow="QUOTE RECOVERY"
          title={`${model.openQuotes.length} quotes`}
          subtitle="Open quotes that can be followed up from the approval queue."
          action="Open quotes"
          onClick={() => go("quotes", { source: "panel_quotes" })}
        >
          <ItemList items={model.openQuotes} empty="No quote follow-ups waiting." onOpen={(item) => go("quotes", { source: "quote_item", id: item.id || item._id || "" })} />
        </Panel>
      </section>
    </main>
  );
}
