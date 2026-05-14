import { useMemo, useState } from "react";
import "./newos.css";

const nav = [
  ["hub", "Smart Hub"],
  ["ai", "AI Work Queue"],
  ["jobs", "Jobs"],
  ["clients", "Clients"],
  ["quotes", "Quotes"],
  ["invoices", "Invoices"],
  ["proof", "Proof-to-Paid"],
  ["crew", "Crew"],
  ["payroll", "Payroll"],
  ["system", "System"],
];

const routeMap = {
  "/dashboard": "hub",
  "/smart-hub": "hub",
  "/ai-approvals": "ai",
  "/ai-work-queue": "ai",
  "/jobs": "jobs",
  "/clients": "clients",
  "/quotes": "quotes",
  "/invoices": "invoices",
  "/proof-to-paid": "proof",
  "/team": "crew",
  "/crew": "crew",
  "/payroll": "payroll",
  "/system-centre": "system",
  "/settings": "system",
};

const pathMap = {
  hub: "/dashboard",
  ai: "/ai-approvals",
  jobs: "/jobs",
  clients: "/clients",
  quotes: "/quotes",
  invoices: "/invoices",
  proof: "/proof-to-paid",
  crew: "/team",
  payroll: "/payroll",
  system: "/system-centre",
};

const jobs = [
  { title: "Kitchen Renovation", client: "Acme Property", time: "8:00 am", status: "In Progress" },
  { title: "SewerGuard Upgrade", client: "Greenview Maintenance", time: "10:30 am", status: "Scheduled" },
  { title: "Pool pump repair", client: "Blue Lagoon Pools", time: "1:00 pm", status: "Scheduled" },
  { title: "Fence repair", client: "Westside Carpentry", time: "2:30 pm", status: "Assigned" },
];

const clients = [
  { name: "Acme Property", note: "3 active jobs", status: "Active" },
  { name: "Blue Lagoon Pools", note: "Quote follow-up due", status: "Follow-up" },
  { name: "Greenview Maintenance", note: "Invoice ready", status: "Ready" },
  { name: "Westside Carpentry", note: "Recent work completed", status: "Active" },
];

const crew = [
  { name: "James Carter", trade: "Plumber", status: "On Site" },
  { name: "Maria Santos", trade: "Electrician", status: "On Site" },
  { name: "Liam Brown", trade: "Carpenter", status: "En Route" },
  { name: "Noah Davis", trade: "Apprentice", status: "Available" },
];

const quotes = [
  { title: "Quote #1207", client: "Blue Lagoon Pools", value: "$3,450", status: "Sent" },
  { title: "Quote #1208", client: "Acme Property", value: "$8,900", status: "Draft" },
  { title: "Quote #1209", client: "Westside Carpentry", value: "$1,250", status: "Follow-up" },
];

const invoices = [
  { title: "INV-1042", client: "Greenview Maintenance", value: "$2,850", status: "Draft" },
  { title: "INV-1041", client: "Acme Property", value: "$1,250", status: "Overdue" },
  { title: "INV-1040", client: "Blue Lagoon Pools", value: "$4,600", status: "Paid" },
];

const aiActions = [
  { title: "Assign worker", body: "James Carter is closest and has matching experience.", action: "Review assignment" },
  { title: "Draft invoice ready", body: "Completed job proof has been turned into an invoice draft.", action: "Review invoice" },
  { title: "Invoice reminder", body: "Friendly payment reminder prepared for owner approval.", action: "Review message" },
  { title: "Quote follow-up", body: "Quote has been open for 3 days. Follow-up drafted.", action: "Review follow-up" },
];

function initials(name) {
  return String(name || "CV").split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase();
}

function Pill({ children }) {
  const value = String(children || "").toLowerCase();
  const tone = value.includes("paid") || value.includes("ready") || value.includes("active") || value.includes("available") ? "good" :
    value.includes("overdue") || value.includes("follow") ? "warn" : "";
  return <span className={`nvx-pill ${tone}`}>{children}</span>;
}

function Stat({ label, value, note }) {
  return (
    <article className="nvx-stat">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function Row({ avatar, title, note, status }) {
  return (
    <button className="nvx-row" type="button">
      <span className="nvx-avatar">{avatar || initials(title)}</span>
      <span>
        <strong>{title}</strong>
        <small>{note}</small>
      </span>
      <Pill>{status}</Pill>
    </button>
  );
}

function Hero({ kicker, title, subtitle, children }) {
  return (
    <section className="nvx-hero">
      <div>
        <p>{kicker}</p>
        <h1>{title}</h1>
        <span>{subtitle}</span>
      </div>
      <aside>{children}</aside>
    </section>
  );
}

function Panel({ kicker, title, subtitle, children, action }) {
  return (
    <section className="nvx-panel">
      <header>
        <div>
          <p>{kicker}</p>
          <h2>{title}</h2>
          {subtitle ? <span>{subtitle}</span> : null}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function SmartHub({ setPage }) {
  return (
    <main className="nvx-page">
      <Hero kicker="Smart Hub" title="AI runs the admin. You approve." subtitle="A clean command centre for jobs, crew, invoices, proof and follow-ups.">
        <p>AI Operator</p>
        <strong>{aiActions.length} actions ready</strong>
        <small>Prepared for owner approval.</small>
        <div className="nvx-actions">
          <button className="primary" onClick={() => setPage("jobs")}>New Job</button>
          <button onClick={() => setPage("ai")}>Open AI Queue</button>
        </div>
      </Hero>

      <section className="nvx-stats">
        <Stat label="Revenue MTD" value="$126k" note="+18.4%" />
        <Stat label="Jobs Completed" value="28" note="+12%" />
        <Stat label="Outstanding" value="$43k" note="Needs follow-up" />
        <Stat label="Quotes Sent" value="17" note="Pipeline moving" />
      </section>

      <section className="nvx-ai-grid">
        {aiActions.map((item) => (
          <article className="nvx-ai-card" key={item.title}>
            <span>AI Operator</span>
            <strong>{item.title}</strong>
            <small>{item.body}</small>
            <button>{item.action}</button>
          </article>
        ))}
      </section>

      <section className="nvx-split">
        <Panel kicker="Today / Run Sheet" title="Work moving today" action={<button onClick={() => setPage("jobs")}>Open jobs</button>}>
          <div className="nvx-list">
            {jobs.map((job) => <Row key={job.title} avatar={job.time} title={job.title} note={job.client} status={job.status} />)}
          </div>
        </Panel>

        <Panel kicker="Crew & Dispatch" title="Who can take work?" action={<button onClick={() => setPage("crew")}>Open crew</button>}>
          <div className="nvx-list">
            {crew.map((worker) => <Row key={worker.name} title={worker.name} note={worker.trade} status={worker.status} />)}
          </div>
        </Panel>
      </section>
    </main>
  );
}

function Jobs({ setPage }) {
  return (
    <main className="nvx-page">
      <Hero kicker="Jobs" title="Dispatch board." subtitle="A proper run sheet view, not an old table.">
        <p>Dispatch AI</p>
        <strong>{jobs.length} jobs today</strong>
        <small>Assignments stay owner-approved.</small>
        <div className="nvx-actions"><button className="primary">Create Job</button><button onClick={() => setPage("ai")}>AI Assign</button></div>
      </Hero>

      <section className="nvx-board">
        {["Scheduled", "In Progress", "Completed"].map((column) => (
          <article className="nvx-column" key={column}>
            <span>Jobs</span>
            <h3>{column}</h3>
            {jobs.map((job) => <Row key={`${column}-${job.title}`} avatar={job.time} title={job.title} note={job.client} status={column === "Completed" ? "Ready" : job.status} />)}
          </article>
        ))}
      </section>
    </main>
  );
}

function Clients({ setPage }) {
  return (
    <main className="nvx-page">
      <Hero kicker="Clients" title="Client relationship centre." subtitle="Customers, follow-ups and repeat work in one clean CRM-style space.">
        <p>Client AI</p>
        <strong>{clients.length} clients</strong>
        <small>Follow-ups are prepared, not auto-sent.</small>
        <div className="nvx-actions"><button className="primary">Add Client</button><button>Import CSV</button></div>
      </Hero>

      <section className="nvx-split">
        <Panel kicker="Client List" title="Customer records">
          <div className="nvx-list">{clients.map((client) => <Row key={client.name} title={client.name} note={client.note} status={client.status} />)}</div>
        </Panel>
        <Panel kicker="AI Prepared" title="Relationship actions">
          <div className="nvx-card-grid">
            {["Draft follow-up", "Prepare next job", "Check unpaid invoices", "Review recent work"].map((x) => (
              <article className="nvx-mini" key={x}><span>Client AI</span><strong>{x}</strong><small>Owner approval required.</small></article>
            ))}
          </div>
        </Panel>
      </section>
    </main>
  );
}

function Quotes({ setPage }) {
  return (
    <main className="nvx-page">
      <Hero kicker="Quotes" title="Quote pipeline." subtitle="Draft, send and follow up quotes in a clear sales board.">
        <p>Quote AI</p>
        <strong>{quotes.length} quotes active</strong>
        <small>Follow-ups drafted for approval.</small>
        <div className="nvx-actions"><button className="primary">Create Quote</button><button onClick={() => setPage("ai")}>Review follow-ups</button></div>
      </Hero>

      <section className="nvx-board">
        {["Draft", "Sent", "Approved"].map((stage) => (
          <article className="nvx-column" key={stage}>
            <span>Pipeline</span>
            <h3>{stage}</h3>
            {quotes.map((quote) => <Row key={`${stage}-${quote.title}`} title={quote.title} note={`${quote.client} · ${quote.value}`} status={stage} />)}
          </article>
        ))}
      </section>
    </main>
  );
}

function Invoices({ setPage }) {
  return (
    <main className="nvx-page">
      <Hero kicker="Invoices" title="Cashflow workspace." subtitle="Invoice list and preview together, with AI reminders ready for approval.">
        <p>Cashflow AI</p>
        <strong>$8,700</strong>
        <small>Draft to paid workflow.</small>
        <div className="nvx-actions"><button className="primary">Create Invoice</button><button onClick={() => setPage("proof")}>Proof-to-Paid</button></div>
      </Hero>

      <section className="nvx-split">
        <Panel kicker="Invoice List" title="Open invoices">
          <div className="nvx-list">{invoices.map((invoice) => <Row key={invoice.title} title={invoice.title} note={`${invoice.client} · ${invoice.value}`} status={invoice.status} />)}</div>
        </Panel>
        <section className="nvx-invoice-preview">
          <p>Preview</p>
          <h2>INV-1042</h2>
          <span>Greenview Maintenance</span>
          <strong>$2,850</strong>
          <div className="nvx-actions"><button>Preview</button><button>Edit</button><button className="primary">Send</button></div>
        </section>
      </section>
    </main>
  );
}

function Proof({ setPage }) {
  return (
    <main className="nvx-page">
      <Hero kicker="Proof-to-Paid" title="Completed work to invoice-ready." subtitle="Proof, photos and job notes become draft invoices for approval.">
        <p>AI Drafting</p>
        <strong>3 jobs ready</strong>
        <small>No invoice sends without approval.</small>
      </Hero>

      <section className="nvx-board">
        {["Completed", "AI Draft", "Approve & Send"].map((stage) => (
          <article className="nvx-column" key={stage}>
            <span>Step</span>
            <h3>{stage}</h3>
            {jobs.slice(0, 3).map((job) => <Row key={`${stage}-${job.title}`} title={job.title} note={job.client} status={stage === "AI Draft" ? "Ready" : "Open"} />)}
          </article>
        ))}
      </section>
    </main>
  );
}

function Crew({ setPage }) {
  return (
    <main className="nvx-page">
      <Hero kicker="Crew" title="Crew availability board." subtitle="See who is available, on site and best matched to each job.">
        <p>AI Matching</p>
        <strong>4 crew online</strong>
        <small>Assignments stay owner-approved.</small>
      </Hero>

      <section className="nvx-split">
        <Panel kicker="Crew List" title="Team availability">
          <div className="nvx-list">{crew.map((worker) => <Row key={worker.name} title={worker.name} note={worker.trade} status={worker.status} />)}</div>
        </Panel>
        <Panel kicker="Dispatch Rules" title="AI matching logic">
          <div className="nvx-card-grid">
            {["Closest worker", "Least loaded", "Right experience", "No conflict"].map((x) => <article className="nvx-mini" key={x}><span>Match</span><strong>{x}</strong><small>Used for recommendations.</small></article>)}
          </div>
        </Panel>
      </section>
    </main>
  );
}

function SimplePage({ page, setPage }) {
  const map = {
    ai: ["AI Work Queue", "Prepared actions. Owner approval.", "Review, edit, approve or reject AI-prepared work."],
    payroll: ["Payroll", "Payroll review centre.", "Approved hours and export-ready summaries."],
    system: ["System", "Plans, billing and integrations.", "Owner-safe controls for billing, SMS, MYOB and settings."],
  };
  const [kicker, title, subtitle] = map[page] || map.system;
  return (
    <main className="nvx-page">
      <Hero kicker={kicker} title={title} subtitle={subtitle}>
        <p>Owner Guardrails</p>
        <strong>Approval-first</strong>
        <small>No risky changes without approval.</small>
      </Hero>
      <section className="nvx-card-grid four">
        {["Review", "Prepare", "Approve", "Export"].map((x) => <article className="nvx-mini" key={x}><span>{kicker}</span><strong>{x}</strong><small>Clean workflow card.</small></article>)}
      </section>
    </main>
  );
}

export default function ChurvoxNewShell() {
  const initial = routeMap[window.location.pathname.replace(/\/+$/, "")] || "hub";
  const [page, setPageRaw] = useState(initial);

  function setPage(next) {
    setPageRaw(next);
    window.history.pushState({}, "", pathMap[next] || "/dashboard");
  }

  const Page = useMemo(() => {
    if (page === "hub") return SmartHub;
    if (page === "jobs") return Jobs;
    if (page === "clients") return Clients;
    if (page === "quotes") return Quotes;
    if (page === "invoices") return Invoices;
    if (page === "proof") return Proof;
    if (page === "crew") return Crew;
    return SimplePage;
  }, [page]);

  return (
    <div className="nvx-shell">
      <aside className="nvx-sidebar">
        <button className="nvx-brand" onClick={() => setPage("hub")}>
          <span><img src="/brand/churvox-holo-c.svg" alt="" /></span>
          <b>Churvox<small>AI Operator OS</small></b>
        </button>

        <nav>
          {nav.map(([key, label]) => (
            <button key={key} className={page === key ? "active" : ""} onClick={() => setPage(key)}>
              {label}
            </button>
          ))}
        </nav>

        <section className="nvx-side-card">
          <p>AI OPERATOR</p>
          <strong>{aiActions.length} actions ready</strong>
          <span>AI prepares the admin. You approve.</span>
        </section>
      </aside>

      <main className="nvx-main">
        <header className="nvx-topbar">
          <div><strong>Owner workspace</strong><span>New clean shell · backend wiring next</span></div>
          <input placeholder="Search anything..." />
          <div><button className="primary" onClick={() => setPage("jobs")}>New Job</button></div>
        </header>

        <Page page={page} setPage={setPage} />
      </main>
    </div>
  );
}
