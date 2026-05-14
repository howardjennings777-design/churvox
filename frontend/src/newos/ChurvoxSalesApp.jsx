import { useEffect, useMemo, useState } from "react";
import "./churvoxSales.css";
import "./churvoxNeuralAi.css";
import "./churvoxHardAi.css";
import "./churvoxFinalIdentity.css";

const NAV = [
  ["dashboard", "Command"],
  ["ai", "Operator Queue"],
  ["jobs", "Jobs"],
  ["clients", "Clients"],
  ["quotes", "Quotes"],
  ["invoices", "Invoices"],
  ["proof", "Proof-to-Paid"],
  ["team", "Team"],
  ["payroll", "Payroll"],
  ["system", "System"],
];

const PATHS = {
  "/": "landing",
  "/login": "login",
  "/signup": "signup",
  "/demo": "landing",
  "/pricing": "landing",
  "/dashboard": "dashboard",
  "/smart-hub": "dashboard",
  "/ai-approvals": "ai",
  "/jobs": "jobs",
  "/clients": "clients",
  "/quotes": "quotes",
  "/invoices": "invoices",
  "/proof-to-paid": "proof",
  "/team": "team",
  "/crew": "team",
  "/payroll": "payroll",
  "/system-centre": "system",
  "/settings": "system",
};

const PAGE_PATHS = {
  landing: "/",
  login: "/login",
  signup: "/signup",
  dashboard: "/dashboard",
  ai: "/ai-approvals",
  jobs: "/jobs",
  clients: "/clients",
  quotes: "/quotes",
  invoices: "/invoices",
  proof: "/proof-to-paid",
  team: "/team",
  payroll: "/payroll",
  system: "/system-centre",
};

const jobs = [
  ["8:00am", "Kitchen renovation", "Acme Property", "In Progress"],
  ["10:30am", "SewerGuard upgrade", "Greenview Maintenance", "Scheduled"],
  ["1:00pm", "Pool pump repair", "Blue Lagoon Pools", "Scheduled"],
  ["2:30pm", "Fence repair", "Westside Carpentry", "Assigned"],
];

const clients = [
  ["AC", "Acme Property", "3 active jobs", "Active"],
  ["BL", "Blue Lagoon Pools", "Quote follow-up due", "Follow-up"],
  ["GM", "Greenview Maintenance", "Invoice ready", "Ready"],
  ["WC", "Westside Carpentry", "Recent work completed", "Active"],
];

const quotes = [
  ["Q1", "Quote #1207", "Blue Lagoon Pools · $3,450", "Sent"],
  ["Q2", "Quote #1208", "Acme Property · $8,900", "Draft"],
  ["Q3", "Quote #1209", "Westside Carpentry · $1,250", "Follow-up"],
];

const invoices = [
  ["I1", "INV-1042", "Greenview Maintenance · $2,850", "Draft"],
  ["I2", "INV-1041", "Acme Property · $1,250", "Overdue"],
  ["I3", "INV-1040", "Blue Lagoon Pools · $4,600", "Paid"],
];

const team = [
  ["JC", "James Carter", "Plumber · On site", "On Site"],
  ["MS", "Maria Santos", "Electrician · On site", "On Site"],
  ["LB", "Liam Brown", "Carpenter · En route", "En Route"],
  ["ND", "Noah Davis", "Apprentice · Available", "Available"],
];

const aiCards = [
  ["Assign Worker", "AI recommends James Carter for the kitchen renovation.", "Review assignment"],
  ["Draft Invoice", "Completed work has been converted into a draft invoice.", "Review invoice"],
  ["Payment Follow-up", "A friendly reminder is ready for owner approval.", "Review message"],
  ["Quote Follow-up", "A quote has been open for 3 days. AI drafted a follow-up.", "Review follow-up"],
];

function getPageFromPath() {
  const clean = window.location.pathname.replace(/\/+$/, "") || "/";
  return PATHS[clean] || "dashboard";
}

function statusTone(value) {
  const text = String(value || "").toLowerCase();
  if (text.includes("paid") || text.includes("active") || text.includes("ready") || text.includes("available") || text.includes("completed")) return "good";
  if (text.includes("overdue") || text.includes("follow") || text.includes("late")) return "warn";
  return "";
}

function Pill({ children }) {
  return <span className={`sx-pill ${statusTone(children)}`}>{children}</span>;
}

function Row({ item }) {
  return (
    <button type="button" className="sx-row">
      <span className="sx-avatar">{item[0]}</span>
      <span>
        <strong>{item[1]}</strong>
        <small>{item[2]}</small>
      </span>
      <Pill>{item[3]}</Pill>
    </button>
  );
}

function Stat({ label, value, note }) {
  return (
    <article className="sx-stat">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function PublicNav({ go }) {
  return (
    <header className="sx-public-nav">
      <button className="sx-brand" onClick={() => go("landing")}>
        <span><img src="/brand/churvox-holo-c.svg" alt="" /></span>
        <b>Churvox<small>AI Operator OS</small></b>
      </button>

      <nav>
        <button onClick={() => go("landing")}>Home</button>
        <button onClick={() => go("landing")}>Product</button>
        <button onClick={() => go("landing")}>Pricing</button>
        <button onClick={() => go("login")}>Login</button>
      </nav>

      <button className="primary" onClick={() => go("signup")}>Start free trial</button>
    </header>
  );
}

function Landing({ go }) {
  return (
    <main className="sx-public">
      <PublicNav go={go} />

      <section className="sx-landing-hero">
        <div>
          <p>CHURVOX AI OPERATOR OS</p>
          <h1>AI operates the business admin. You stay in control.</h1>
          <span>
            An AI operating layer for trade and service businesses. Churvox prepares jobs,
            quotes, invoices, reminders and dispatch actions so the owner only reviews and approves.
          </span>

          <div className="sx-actions">
            <button className="primary" onClick={() => go("signup")}>Start free trial</button>
            <button onClick={() => go("login")}>Open demo workspace</button>
          </div>

          <div className="sx-trust-row">
            <span>Jobs</span>
            <span>Quotes</span>
            <span>Invoices</span>
            <span>Team</span>
            <span>AI approvals</span>
          </div>
        </div>

        <aside className="sx-product-card">
          <div className="sx-product-top">
            <span>AI Command</span>
            <Pill>Live Preview</Pill>
          </div>

          <div className="sx-preview-stats">
            <Stat label="Revenue" value="$126k" note="+18.4%" />
            <Stat label="Jobs" value="28" note="completed" />
          </div>

          <div className="sx-ai-stack">
            {aiCards.slice(0, 3).map((card) => (
              <article key={card[0]}>
                <span>AI Operator</span>
                <strong>{card[0]}</strong>
                <small>{card[1]}</small>
              </article>
            ))}
          </div>
        </aside>
      </section>

      <section className="sx-feature-grid">
        {[
          ["Owner approval-first", "AI prepares work, but does not send, bill, sync or change sensitive data without approval."],
          ["Built for field teams", "Jobs, crew, proof, photos and invoices stay connected in one simple workspace."],
          ["Less admin noise", "Dashboards are action based, not crowded tables that make you hunt for work."],
          ["Proof-to-paid flow", "Completed work becomes an invoice-ready draft with owner review."],
        ].map(([title, body]) => (
          <article key={title}>
            <span>CHURVOX</span>
            <strong>{title}</strong>
            <small>{body}</small>
          </article>
        ))}
      </section>
    </main>
  );
}

function AuthPage({ go, mode }) {
  const signup = mode === "signup";

  return (
    <main className="sx-auth-page">
      <section className="sx-auth-shell">
        <div className="sx-auth-copy">
          <button className="sx-brand" onClick={() => go("landing")}>
            <span><img src="/brand/churvox-holo-c.svg" alt="" /></span>
            <b>Churvox<small>AI Operator OS</small></b>
          </button>

          <p>{signup ? "START FREE TRIAL" : "WELCOME BACK"}</p>
          <h1>{signup ? "Set up the AI command centre." : "Open your command centre."}</h1>
          <span>
            This is the clean new Churvox shell. Backend login and live data wiring comes next,
            page by page, without bringing back the old layout.
          </span>

          <div className="sx-auth-points">
            <b>AI prepares admin</b>
            <b>Owner approves actions</b>
            <b>Jobs to invoices in one flow</b>
          </div>
        </div>

        <form className="sx-auth-card" onSubmit={(event) => { event.preventDefault(); go("dashboard"); }}>
          <p>{signup ? "CREATE WORKSPACE" : "LOGIN"}</p>
          <h2>{signup ? "Start your trial" : "Sign in"}</h2>

          {signup ? <input placeholder="Business name" /> : null}
          <input placeholder="Email address" type="email" />
          <input placeholder="Password" type="password" />

          <button className="primary" type="submit">
            {signup ? "Create workspace" : "Open workspace"}
          </button>

          <button type="button" onClick={() => go(signup ? "login" : "signup")}>
            {signup ? "Already have an account? Login" : "Need an account? Start trial"}
          </button>
        </form>
      </section>
    </main>
  );
}

function AppShell({ page, go }) {
  const [navOpen, setNavOpen] = useState(false);
  const currentLabel = NAV.find(([key]) => key === page)?.[1] || "Command";

  return (
    <div className="sx-app">
      <aside className={`sx-sidebar ${navOpen ? "open" : ""}`}>
        <button className="sx-brand" onClick={() => go("dashboard")}>
          <span><img src="/brand/churvox-holo-c.svg" alt="" /></span>
          <b>Churvox<small>AI Operator OS</small></b>
        </button>

        <nav>
          {[
            ["Command", NAV.slice(0, 2)],
            ["Operations", NAV.slice(2, 8)],
            ["Business", NAV.slice(8)],
          ].map(([group, items]) => (
            <section key={group}>
              <p>{group}</p>
              {items.map(([key, label]) => (
                <button key={key} className={page === key ? "active" : ""} onClick={() => { setNavOpen(false); go(key); }}>
                  {label}
                </button>
              ))}
            </section>
          ))}
        </nav>

        <article className="sx-side-ai">
          <p>AI OPERATOR</p>
          <strong>{aiCards.length} actions ready</strong>
          <span>Prepared for owner approval.</span>
        </article>
      </aside>

      <main className="sx-main">
        <header className="sx-topbar">
          <button className="sx-menu" onClick={() => setNavOpen(!navOpen)}>☰</button>
          <div>
            <strong>{currentLabel}</strong>
            <span>New shell · backend wiring next</span>
          </div>
          <input placeholder="Search jobs, clients, invoices..." />
          <button onClick={() => go("ai")}>Operator Queue</button>
          <button className="primary" onClick={() => go("jobs")}>New Job</button>
        </header>

        <Workspace page={page} go={go} />
      </main>

      <nav className="sx-bottom-nav">
        {NAV.slice(0, 5).map(([key, label]) => (
          <button key={key} className={page === key ? "active" : ""} onClick={() => go(key)}>{label}</button>
        ))}
      </nav>
    </div>
  );
}

function Hero({ kicker, title, subtitle, children }) {
  return (
    <section className="sx-hero">
      <div>
        <p>{kicker}</p>
        <h1>{title}</h1>
        <span>{subtitle}</span>
      </div>
      <aside>{children}</aside>
    </section>
  );
}

function Panel({ kicker, title, children, action }) {
  return (
    <section className="sx-panel">
      <header>
        <div>
          <p>{kicker}</p>
          <h2>{title}</h2>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function Workspace({ page, go }) {
  if (page === "dashboard") return <Dashboard go={go} />;
  if (page === "jobs") return <Jobs go={go} />;
  if (page === "clients") return <Clients go={go} />;
  if (page === "quotes") return <Pipeline go={go} type="quotes" title="Quote pipeline" items={quotes} />;
  if (page === "invoices") return <Invoices go={go} />;
  if (page === "proof") return <Proof go={go} />;
  if (page === "team") return <Team go={go} />;
  return <SimpleWorkspace page={page} go={go} />;
}

function Dashboard({ go }) {
  return (
    <main className="sx-workspace">
      <Hero kicker="SMART HUB" title="AI operates the business admin. You stay in control." subtitle="A live AI command layer for dispatch, clients, invoices, proof and daily decisions.">
        <p>AI OPERATOR</p>
        <strong>{aiCards.length} actions ready</strong>
        <small>Prepared for owner approval.</small>
        <div className="sx-actions compact">
          <button className="primary" onClick={() => go("jobs")}>Run job setup</button>
          <button onClick={() => go("ai")}>Review AI queue</button>
        </div>
      </Hero>

      <section className="sx-stats">
        <Stat label="Revenue MTD" value="$126k" note="+18.4%" />
        <Stat label="Jobs completed" value="28" note="+12%" />
        <Stat label="Outstanding" value="$43k" note="needs follow-up" />
        <Stat label="Quotes sent" value="17" note="pipeline moving" />
      </section>

      <section className="sx-ai-grid">
        {aiCards.map((card) => (
          <article key={card[0]}>
            <span>AI OPERATOR</span>
            <strong>{card[0]}</strong>
            <small>{card[1]}</small>
            <button>{card[2]}</button>
          </article>
        ))}
      </section>

      <section className="sx-split">
        <Panel kicker="TODAY / RUN SHEET" title="Work moving today" action={<button onClick={() => go("jobs")}>Open jobs</button>}>
          <div className="sx-list">{jobs.map((item) => <Row key={item[1]} item={item} />)}</div>
        </Panel>
        <Panel kicker="CREW & DISPATCH" title="Who can take work?" action={<button onClick={() => go("team")}>Open team</button>}>
          <div className="sx-list">{team.map((item) => <Row key={item[1]} item={item} />)}</div>
        </Panel>
      </section>
    </main>
  );
}

function Jobs({ go }) {
  return (
    <main className="sx-workspace">
      <Hero kicker="JOBS" title="Dispatch board." subtitle="A clean board for scheduled, assigned, in-progress and completed work.">
        <p>AI DISPATCH</p>
        <strong>{jobs.length} jobs today</strong>
        <small>Worker recommendations stay approval-first.</small>
      </Hero>

      <section className="sx-board">
        {["Scheduled", "In Progress", "Completed"].map((stage) => (
          <article className="sx-column" key={stage}>
            <span>JOBS</span>
            <h3>{stage}</h3>
            {jobs.map((job) => <Row key={`${stage}-${job[1]}`} item={[job[0], job[1], job[2], stage]} />)}
          </article>
        ))}
      </section>
    </main>
  );
}

function Clients({ go }) {
  return (
    <main className="sx-workspace">
      <Hero kicker="CLIENTS" title="Relationship centre." subtitle="Customers, follow-ups and repeat work in a clean CRM-style workspace.">
        <p>CLIENT AI</p>
        <strong>{clients.length} clients</strong>
        <small>Follow-ups drafted, not auto-sent.</small>
      </Hero>

      <section className="sx-split wide">
        <Panel kicker="CLIENT LIST" title="Customer records">
          <div className="sx-list">{clients.map((item) => <Row key={item[1]} item={item} />)}</div>
        </Panel>
        <Panel kicker="AI PREPARED" title="Relationship actions">
          <div className="sx-mini-grid">
            {["Draft follow-up", "Prepare next job", "Check unpaid invoices", "Review recent work"].map((x) => (
              <article key={x}><span>CLIENT AI</span><strong>{x}</strong><small>Owner approval required.</small></article>
            ))}
          </div>
        </Panel>
      </section>
    </main>
  );
}

function Pipeline({ type, title, items }) {
  return (
    <main className="sx-workspace">
      <Hero kicker={type.toUpperCase()} title={title} subtitle="A visual pipeline instead of old repeated tables.">
        <p>AI FOLLOW-UP</p>
        <strong>{items.length} active</strong>
        <small>Next actions prepared for approval.</small>
      </Hero>

      <section className="sx-board">
        {["Draft", "Sent", "Approved"].map((stage) => (
          <article className="sx-column" key={stage}>
            <span>PIPELINE</span>
            <h3>{stage}</h3>
            {items.map((item) => <Row key={`${stage}-${item[1]}`} item={[item[0], item[1], item[2], stage]} />)}
          </article>
        ))}
      </section>
    </main>
  );
}

function Invoices({ go }) {
  return (
    <main className="sx-workspace">
      <Hero kicker="INVOICES" title="Cashflow workspace." subtitle="Invoice list and preview together, with AI reminders ready for approval.">
        <p>CASHFLOW AI</p>
        <strong>$8,700</strong>
        <small>Draft to paid flow.</small>
      </Hero>

      <section className="sx-split">
        <Panel kicker="INVOICE LIST" title="Open invoices">
          <div className="sx-list">{invoices.map((item) => <Row key={item[1]} item={item} />)}</div>
        </Panel>
        <section className="sx-invoice-preview">
          <p>PREVIEW</p>
          <h2>INV-1042</h2>
          <span>Greenview Maintenance</span>
          <strong>$2,850</strong>
          <div className="sx-actions compact">
            <button>Preview</button>
            <button>Edit</button>
            <button className="primary">Send</button>
          </div>
        </section>
      </section>
    </main>
  );
}

function Proof({ go }) {
  return (
    <main className="sx-workspace">
      <Hero kicker="PROOF-TO-PAID" title="Completed work to invoice-ready." subtitle="Proof, photos and job notes become draft invoices for approval.">
        <p>AI DRAFTING</p>
        <strong>3 jobs ready</strong>
        <small>No invoice sends without owner approval.</small>
      </Hero>

      <section className="sx-board">
        {["Completed", "AI Draft", "Approve & Send"].map((stage) => (
          <article className="sx-column" key={stage}>
            <span>STEP</span>
            <h3>{stage}</h3>
            {jobs.slice(0, 3).map((job) => <Row key={`${stage}-${job[1]}`} item={[job[0], job[1], job[2], stage === "AI Draft" ? "Ready" : "Open"]} />)}
          </article>
        ))}
      </section>
    </main>
  );
}

function Team({ go }) {
  return (
    <main className="sx-workspace">
      <Hero kicker="TEAM" title="Crew availability board." subtitle="See who is available, on site and best matched to new work.">
        <p>AI MATCHING</p>
        <strong>4 crew online</strong>
        <small>Assignments stay approval-first.</small>
      </Hero>

      <section className="sx-split wide">
        <Panel kicker="CREW LIST" title="Team availability">
          <div className="sx-list">{team.map((item) => <Row key={item[1]} item={item} />)}</div>
        </Panel>
        <Panel kicker="DISPATCH RULES" title="AI matching logic">
          <div className="sx-mini-grid">
            {["Closest worker", "Least loaded", "Right experience", "No conflict"].map((x) => (
              <article key={x}><span>MATCH</span><strong>{x}</strong><small>Used for recommendations.</small></article>
            ))}
          </div>
        </Panel>
      </section>
    </main>
  );
}

function SimpleWorkspace({ page }) {
  const copy = {
    ai: ["AI WORK QUEUE", "Prepared actions. Owner approval.", "Review, edit, approve or reject AI-prepared work."],
    payroll: ["PAYROLL", "Payroll review centre.", "Approved hours and export-ready summaries."],
    system: ["SYSTEM", "Plans, billing and integrations.", "Owner-safe controls for billing, SMS, MYOB and settings."],
  }[page] || ["WORKSPACE", "Churvox workspace.", "Clean workflow cards."];

  return (
    <main className="sx-workspace">
      <Hero kicker={copy[0]} title={copy[1]} subtitle={copy[2]}>
        <p>OWNER GUARDRAILS</p>
        <strong>Approval-first</strong>
        <small>No risky action happens silently.</small>
      </Hero>

      <section className="sx-mini-grid four">
        {["Review", "Prepare", "Approve", "Export"].map((x) => (
          <article key={x}><span>{copy[0]}</span><strong>{x}</strong><small>Clean workflow card.</small></article>
        ))}
      </section>
    </main>
  );
}

export default function ChurvoxSalesApp() {
  const [page, setPage] = useState(getPageFromPath);

  useEffect(() => {
    const onPop = () => setPage(getPageFromPath());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const go = (next) => {
    setPage(next);
    window.history.pushState({}, "", PAGE_PATHS[next] || "/dashboard");
  };

  const publicPage = page === "landing" || page === "login" || page === "signup";

  if (page === "landing") return <Landing go={go} />;
  if (page === "login") return <AuthPage go={go} mode="login" />;
  if (page === "signup") return <AuthPage go={go} mode="signup" />;

  return <AppShell page={page} go={go} />;
}
