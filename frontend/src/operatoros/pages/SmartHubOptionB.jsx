const C = {
  bg: "#f5f8fb",
  card: "#ffffff",
  soft: "#f8fbfd",
  softBlue: "#eef8fc",
  line: "#dbe7ee",
  ink: "#101828",
  text: "#233044",
  muted: "#66788a",
  faint: "#91a3b4",
  teal: "#0797b8",
  teal2: "#06b6d4",
  green: "#16a34a",
  amber: "#d97706",
  red: "#dc2626",
  shadow: "0 10px 28px rgba(15,23,42,.055)",
  shadowBig: "0 22px 64px rgba(15,23,42,.075)",
};

const S = {
  page: {
    display: "grid",
    gap: 16,
  },
  shellCard: {
    background: "rgba(255,255,255,.96)",
    border: `1px solid ${C.line}`,
    boxShadow: C.shadow,
  },
  header: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 22,
    padding: "4px 0 0",
  },
  titleRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 18,
  },
  title: {
    margin: 0,
    color: C.ink,
    fontSize: 34,
    lineHeight: 1,
    letterSpacing: "-.055em",
  },
  subtitle: {
    marginTop: 5,
    color: C.muted,
    fontSize: 14,
  },
  kpis: {
    display: "grid",
    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
    gap: 12,
  },
  kpi: {
    minHeight: 116,
    display: "grid",
    gap: 8,
    padding: 18,
    borderRadius: 22,
    background: "#fff",
    border: `1px solid ${C.line}`,
    boxShadow: C.shadow,
  },
  section: {
    display: "grid",
    gap: 14,
    padding: 20,
    borderRadius: 26,
    background: "#fff",
    border: `1px solid ${C.line}`,
    boxShadow: C.shadow,
  },
  sectionHead: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 14,
  },
  kicker: {
    margin: 0,
    color: C.teal,
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: ".12em",
    textTransform: "uppercase",
  },
  sectionTitle: {
    margin: "4px 0 0",
    color: C.ink,
    fontSize: 22,
    lineHeight: 1,
    letterSpacing: "-.04em",
  },
  grid4: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 12,
  },
  aiCard: {
    minHeight: 190,
    display: "grid",
    gap: 10,
    padding: 16,
    borderRadius: 20,
    background: C.soft,
    border: `1px solid ${C.line}`,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    background: "#e5f7fc",
    color: C.teal,
    fontWeight: 900,
    fontSize: 13,
  },
  btn: {
    minHeight: 38,
    borderRadius: 999,
    border: `1px solid ${C.line}`,
    background: "#fff",
    color: C.teal,
    fontWeight: 850,
    padding: "0 14px",
    cursor: "pointer",
  },
  primaryBtn: {
    minHeight: 38,
    borderRadius: 999,
    border: 0,
    background: `linear-gradient(135deg, ${C.teal}, ${C.teal2})`,
    color: "#fff",
    fontWeight: 850,
    padding: "0 14px",
    cursor: "pointer",
    boxShadow: "0 14px 32px rgba(8,145,178,.18)",
  },
  bottomGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
  },
  list: {
    display: "grid",
    gap: 8,
  },
  row: {
    minHeight: 56,
    display: "grid",
    gridTemplateColumns: "90px 1fr auto",
    gap: 12,
    alignItems: "center",
    padding: "10px 12px",
    borderRadius: 16,
    background: C.soft,
    border: `1px solid ${C.line}`,
  },
  crewRow: {
    minHeight: 56,
    display: "grid",
    gridTemplateColumns: "44px 1fr auto",
    gap: 12,
    alignItems: "center",
    padding: "10px 12px",
    borderRadius: 16,
    background: C.soft,
    border: `1px solid ${C.line}`,
  },
  pill: {
    minHeight: 26,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 10px",
    borderRadius: 999,
    background: "#ecfeff",
    color: C.teal,
    border: "1px solid #bae6fd",
    fontSize: 12,
    fontWeight: 850,
    whiteSpace: "nowrap",
  },
  goodPill: {
    background: "#dcfce7",
    color: "#15803d",
    border: "1px solid #bbf7d0",
  },
  warnPill: {
    background: "#fef3c7",
    color: "#b45309",
    border: "1px solid #fde68a",
  },
};

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function num(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function money(value) {
  return `$${num(value).toLocaleString()}`;
}

function titleOf(item, fallback) {
  return item?.title || item?.name || item?.job_name || item?.invoice_number || item?.quote_number || fallback;
}

function clientOf(item) {
  return item?.client_name || item?.customer_name || item?.company_name || item?.client?.name || "No client set";
}

function initials(name) {
  const parts = String(name || "Worker").trim().split(/\s+/);
  return ((parts[0]?.[0] || "W") + (parts[1]?.[0] || "")).toUpperCase();
}

function statusStyle(value) {
  const s = String(value || "").toLowerCase();
  if (["completed", "paid", "active", "available", "on site", "ready"].includes(s)) return { ...S.pill, ...S.goodPill };
  if (["overdue", "late", "low"].includes(s)) return { ...S.pill, ...S.warnPill };
  return S.pill;
}

function KPI({ label, value, change, down }) {
  return (
    <article style={S.kpi}>
      <span style={{ color: C.muted, fontSize: 13, fontWeight: 750 }}>{label}</span>
      <strong style={{ color: C.ink, fontSize: 30, letterSpacing: "-.055em" }}>{value}</strong>
      <small style={{ color: down ? C.red : C.green, fontWeight: 850 }}>{change}</small>
    </article>
  );
}

function AiCard({ title, body, name, value, action, initialsText, onClick }) {
  return (
    <article style={S.aiCard}>
      <span style={{ color: C.teal, fontSize: 12, fontWeight: 900, textTransform: "uppercase" }}>{title}</span>
      <strong style={{ color: C.ink, fontSize: 16 }}>{body}</strong>

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 4 }}>
        <div style={S.avatar}>{initialsText || initials(name)}</div>
        <div>
          <strong style={{ display: "block", color: C.ink, fontSize: 14 }}>{name}</strong>
          <small style={{ color: C.muted }}>{value}</small>
        </div>
      </div>

      <button type="button" style={S.btn} onClick={onClick}>
        {action}
      </button>
    </article>
  );
}

export default function SmartHubOptionB({ data = {}, onNav, onCreate }) {
  const jobs = asArray(data.jobs);
  const workers = asArray(data.workers);
  const invoices = asArray(data.invoices);
  const quotes = asArray(data.quotes);
  const completedJobs = jobs.filter((job) => String(job.status || job.job_status || "").toLowerCase().includes("complete"));
  const outstanding = invoices.reduce((sum, inv) => sum + num(inv.balance_due || inv.total || inv.amount || inv.price), 0);
  const revenue = invoices.reduce((sum, inv) => sum + num(inv.total || inv.amount || inv.price), 0);
  const acceptedQuotes = quotes.filter((quote) => String(quote.status || "").toLowerCase().includes("accept")).length;
  const conversion = quotes.length ? Math.round((acceptedQuotes / quotes.length) * 100) : 64;

  const firstJob = jobs[0] || {};
  const firstInvoice = invoices[0] || {};
  const firstQuote = quotes[0] || {};
  const firstWorker = workers[0] || {};

  return (
    <main style={S.page}>
      <section style={S.header}>
        <div style={S.titleRow}>
          <div>
            <h1 style={S.title}>Smart Hub</h1>
            <div style={S.subtitle}>Your business at a glance.</div>
          </div>

          <button type="button" style={S.primaryBtn} onClick={() => onCreate?.("jobs")}>
            + New Job
          </button>
        </div>

        <div style={S.kpis}>
          <KPI label="Revenue MTD" value={money(revenue || 126430)} change="+18.4% vs last month" />
          <KPI label="Jobs Completed" value={completedJobs.length || 28} change="+12% vs last month" />
          <KPI label="Outstanding" value={money(outstanding || 43780)} change="-4.3% vs last month" down />
          <KPI label="Quotes Sent" value={quotes.length || 17} change="+8% vs last month" />
          <KPI label="Conversion Rate" value={`${conversion}%`} change="+6% vs last month" />
        </div>
      </section>

      <section style={S.section}>
        <header style={S.sectionHead}>
          <div>
            <p style={S.kicker}>AI Operator</p>
            <h2 style={S.sectionTitle}>AI is handling the admin. Review and approve.</h2>
          </div>
          <button type="button" style={S.btn} onClick={() => onNav?.("queue")}>
            View all
          </button>
        </header>

        <div style={S.grid4}>
          <AiCard
            title="Assign Worker"
            body="AI recommends assigning this job."
            name={firstWorker.name || firstWorker.full_name || "James Carter"}
            value={titleOf(firstJob, "Job #1047")}
            action="Review Assignment"
            onClick={() => onNav?.("jobs")}
          />
          <AiCard
            title="Invoice Reminder"
            body="AI drafted a friendly reminder."
            name={clientOf(firstInvoice) || "Acme Plumbing"}
            value={money(firstInvoice.total || firstInvoice.amount || 1250)}
            action="Review Message"
            initialsText="AP"
            onClick={() => onNav?.("invoices")}
          />
          <AiCard
            title="Draft Invoice Ready"
            body="AI prepared a draft invoice."
            name={titleOf(firstJob, "Job #1042")}
            value={money(firstInvoice.total || firstInvoice.amount || 2850)}
            action="Review Invoice"
            initialsText="DI"
            onClick={() => onNav?.("proof")}
          />
          <AiCard
            title="Quote Follow-up"
            body="AI suggests following up this quote."
            name={clientOf(firstQuote) || "Blue Lagoon Pools"}
            value="Sent 3 days ago"
            action="Review Follow-up"
            initialsText="BL"
            onClick={() => onNav?.("quotes")}
          />
        </div>
      </section>

      <section style={S.bottomGrid}>
        <article style={S.section}>
          <header style={S.sectionHead}>
            <div>
              <p style={S.kicker}>Today / Run Sheet</p>
              <h2 style={S.sectionTitle}>Work moving today</h2>
            </div>
            <button type="button" style={S.btn} onClick={() => onNav?.("jobs")}>
              View full run sheet
            </button>
          </header>

          <div style={S.list}>
            {(jobs.length ? jobs : [
              { title: "Job #1047", client_name: "Kitchen Renovation", status: "In Progress" },
              { title: "Job #1048", client_name: "SewerGuard Upgrade", status: "Scheduled" },
              { title: "Job #1049", client_name: "Blue Lagoon Pools", status: "Scheduled" },
              { title: "Job #1050", client_name: "Westside Carpentry", status: "Scheduled" },
            ]).slice(0, 5).map((job, index) => (
              <button key={job.id || job._id || index} style={S.row} onClick={() => onNav?.("jobs")}>
                <span style={{ color: C.muted, fontWeight: 800 }}>{index === 0 ? "8:00 am" : index === 1 ? "10:30 am" : index === 2 ? "1:00 pm" : "2:30 pm"}</span>
                <div>
                  <strong style={{ display: "block", color: C.ink }}>{titleOf(job, `Job #${1047 + index}`)}</strong>
                  <small style={{ color: C.muted }}>{clientOf(job)}</small>
                </div>
                <span style={statusStyle(job.status || job.job_status || "Scheduled")}>{job.status || job.job_status || "Scheduled"}</span>
              </button>
            ))}
          </div>
        </article>

        <article style={S.section}>
          <header style={S.sectionHead}>
            <div>
              <p style={S.kicker}>Crew & Dispatch Overview</p>
              <h2 style={S.sectionTitle}>Who can take work?</h2>
            </div>
            <button type="button" style={S.btn} onClick={() => onNav?.("crew")}>
              View all crew
            </button>
          </header>

          <div style={S.list}>
            {(workers.length ? workers : [
              { name: "James Carter", role: "Plumber", status: "On Site" },
              { name: "Maria Santos", role: "Electrician", status: "On Site" },
              { name: "Liam Brown", role: "Carpenter", status: "En Route" },
              { name: "Noah Davis", role: "Apprentice", status: "Available" },
            ]).slice(0, 5).map((worker, index) => {
              const name = worker.name || worker.full_name || worker.email || `Worker ${index + 1}`;
              return (
                <button key={worker.id || worker._id || index} style={S.crewRow} onClick={() => onNav?.("crew")}>
                  <span style={S.avatar}>{initials(name)}</span>
                  <div>
                    <strong style={{ display: "block", color: C.ink }}>{name}</strong>
                    <small style={{ color: C.muted }}>{worker.role || "Worker"}</small>
                  </div>
                  <span style={statusStyle(worker.status || "Available")}>{worker.status || "Available"}</span>
                </button>
              );
            })}
          </div>
        </article>
      </section>
    </main>
  );
}
