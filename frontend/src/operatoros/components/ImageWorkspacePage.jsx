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

function idOf(item, fallback) {
  return item?.id || item?._id || fallback;
}

function titleOf(item, fallback) {
  return (
    item?.title ||
    item?.name ||
    item?.job_name ||
    item?.client_name ||
    item?.customer_name ||
    item?.company_name ||
    item?.invoice_number ||
    item?.quote_number ||
    item?.full_name ||
    item?.email ||
    fallback
  );
}

function clientOf(item) {
  return (
    item?.client_name ||
    item?.customer_name ||
    item?.company_name ||
    item?.client?.name ||
    item?.name ||
    "No client set"
  );
}

function statusOf(item) {
  return item?.status || item?.job_status || item?.payment_status || item?.quote_status || item?.role || "Open";
}

function valueOf(item) {
  const amount = item?.total || item?.amount || item?.balance_due || item?.price || item?.job_price;
  return amount ? money(amount) : "";
}

function dateOf(item) {
  const raw = item?.scheduled_at || item?.scheduled_date || item?.due_date || item?.created_at || item?.updated_at;
  const date = new Date(raw || "");
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function initials(value) {
  const parts = String(value || "Churvox").trim().split(/\s+/);
  return ((parts[0]?.[0] || "C") + (parts[1]?.[0] || "")).toUpperCase();
}

function toneForStatus(value) {
  const status = String(value || "").toLowerCase();
  if (["paid", "completed", "active", "approved", "ready", "available", "on site", "in progress"].some((x) => status.includes(x))) return "good";
  if (["overdue", "late", "low", "declined", "cancelled", "failed"].some((x) => status.includes(x))) return "warn";
  return "";
}

function Pill({ value }) {
  return <span className={`cx-page-pill ${toneForStatus(value)}`}>{value || "Open"}</span>;
}

function Metric({ label, value, note, tone }) {
  return (
    <article className="cx-page-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small className={tone || ""}>{note}</small>
    </article>
  );
}

function Row({ item, index, onOpen }) {
  const title = titleOf(item, `Record ${index + 1}`);
  const meta = [
    clientOf(item),
    item?.address || item?.site_address || item?.region || item?.email,
    dateOf(item),
    valueOf(item),
  ].filter(Boolean).join(" · ");

  return (
    <button type="button" className="cx-page-row" onClick={() => onOpen?.(item)}>
      <span className="cx-page-avatar">{initials(title)}</span>
      <div>
        <strong>{title}</strong>
        <small>{meta || "Open record"}</small>
      </div>
      <Pill value={statusOf(item)} />
    </button>
  );
}

function Empty({ label }) {
  return (
    <div className="cx-page-empty">
      <strong>No {label.toLowerCase()} yet</strong>
      <span>Add records and Churvox will prepare the next owner-approved action.</span>
    </div>
  );
}

export default function ImageWorkspacePage({
  data = {},
  title = "Workspace",
  kicker = "WORKSPACE",
  subtitle = "Clean owner-approved workspace.",
  items = [],
  type = "records",
  primaryLabel = "Create",
  onPrimary,
  onNav,
}) {
  const list = asArray(items);
  const shown = list.slice(0, 12);
  const totalValue = list.reduce((sum, item) => sum + safeNumber(item?.total || item?.amount || item?.balance_due || item?.price || item?.job_price), 0);
  const readyCount = list.filter((item) => toneForStatus(statusOf(item)) === "good").length;
  const warnCount = list.filter((item) => toneForStatus(statusOf(item)) === "warn").length;
  const recent = shown.slice(0, 4);

  return (
    <main className="cx-page">
      <section className="cx-page-hero">
        <div>
          <p>{kicker}</p>
          <h1>{title}</h1>
          <span>{subtitle}</span>

          <div className="cx-page-actions">
            <button type="button" className="primary" onClick={onPrimary}>+ {primaryLabel}</button>
            <button type="button" onClick={() => onNav?.("queue")}>AI Work Queue</button>
            <button type="button" onClick={() => onNav?.("hub")}>Smart Hub</button>
          </div>
        </div>

        <aside className="cx-page-preview">
          <p>AI OPERATOR</p>
          <h2>{readyCount || data?.aiActions?.length || 0} ready</h2>
          <span>Churvox keeps this page clean and prepares the next action for owner approval.</span>
          <div className="cx-page-mini-list">
            {recent.length ? recent.map((item, index) => (
              <div key={idOf(item, index)} className="cx-page-mini">
                <strong>{titleOf(item, `${type} ${index + 1}`)}</strong>
                <Pill value={statusOf(item)} />
              </div>
            )) : (
              <div className="cx-page-mini">
                <strong>Nothing urgent</strong>
                <Pill value="Ready" />
              </div>
            )}
          </div>
        </aside>
      </section>

      <section className="cx-page-metrics">
        <Metric label="Total records" value={list.length} note={`${type} on file`} />
        <Metric label="Ready" value={readyCount} note="clean actions" tone="good" />
        <Metric label="Needs review" value={warnCount} note="owner check" tone="warn" />
        <Metric label="Value" value={totalValue ? money(totalValue) : "—"} note="tracked value" />
      </section>

      <section className="cx-page-grid">
        <article className="cx-page-panel">
          <header>
            <div>
              <p>{kicker}</p>
              <h2>{title} list</h2>
              <span>Clean rows, easy scanning, detail stays in context.</span>
            </div>
            <button type="button" onClick={onPrimary}>New</button>
          </header>

          <div className="cx-page-list">
            {shown.length ? shown.map((item, index) => (
              <Row key={idOf(item, index)} item={item} index={index} onOpen={() => {}} />
            )) : (
              <Empty label={title} />
            )}
          </div>
        </article>

        <article className="cx-page-panel">
          <header>
            <div>
              <p>AI PREPARED</p>
              <h2>Next best actions</h2>
              <span>Same Smart Hub logic, focused on this page.</span>
            </div>
            <button type="button" onClick={() => onNav?.("queue")}>Review all</button>
          </header>

          <div className="cx-page-card-list">
            <article className="cx-page-action-card">
              <span>CHECK</span>
              <strong>Review latest {type}</strong>
              <small>Churvox keeps the important records surfaced first.</small>
              <button type="button">Review</button>
            </article>

            <article className="cx-page-action-card">
              <span>PREPARE</span>
              <strong>Prepare owner action</strong>
              <small>AI can draft the admin, but owner approval stays required.</small>
              <button type="button">Prepare</button>
            </article>

            <article className="cx-page-action-card">
              <span>OPEN</span>
              <strong>Jump back to Smart Hub</strong>
              <small>Return to the full command centre any time.</small>
              <button type="button" onClick={() => onNav?.("hub")}>Open Smart Hub</button>
            </article>
          </div>
        </article>
      </section>
    </main>
  );
}
