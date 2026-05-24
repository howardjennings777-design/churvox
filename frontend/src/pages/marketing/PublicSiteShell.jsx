import React from "react";
import { Link, NavLink } from "react-router-dom";
import { ChurvoxLogo } from "../../components/ChurvoxLogo";
import "./NewPublicSite.css";

export const plans = [
  {
    name: "Start",
    price: "$39",
    tag: "Owner-operator",
    line: "A clean work desk for getting jobs, customers and invoices out of your head.",
    bestFor: "Solo operators who want control without admin chaos.",
    included: ["Jobs, clients, quotes and invoices", "Starter AI admin prep", "Simple owner approval flow", "Core mobile access"],
  },
  {
    name: "Crew",
    price: "$89",
    tag: "Small team",
    line: "Run the field and office from one place without messages going missing.",
    bestFor: "Small crews that need job assignment and worker updates.",
    included: ["Team workflow", "Worker job app", "Proof photos and notes", "More job and client capacity"],
  },
  {
    name: "Operator",
    price: "$149",
    tag: "Most popular",
    line: "The Churvox sweet spot. AI prepares admin moves so the owner approves.",
    bestFor: "Trade businesses that want Churvox to prepare the admin every day.",
    included: ["AI Operator Actions", "Approval queue", "Automation workflows", "MYOB add-on available +$39"],
    featured: true,
  },
  {
    name: "Command",
    price: "$299",
    tag: "Full desk",
    line: "A bigger operating desk for higher volume, stronger roles and money workflows.",
    bestFor: "Growing teams that want the full Churvox command setup.",
    included: ["MYOB included", "Payroll workspace", "Advanced roles", "Higher limits and priority support"],
  },
];

export const featureGroups = [
  {
    eyebrow: "Work intake",
    title: "Jobs stop floating around in texts, calls and memory.",
    body: "Create jobs, assign the crew, attach proof, track status and keep every next move connected.",
    points: ["Job cards", "Crew assignment", "Worker updates", "Proof photos"],
  },
  {
    eyebrow: "AI admin prep",
    title: "Churvox turns messy work into prepared decisions.",
    body: "Instead of staring at blank forms, owners get clear work slips with the next admin move ready to review.",
    points: ["Invoice drafts", "Quote follow-ups", "Customer reminders", "Owner approval"],
  },
  {
    eyebrow: "Money desk",
    title: "Completed work has a path to quote, invoice and paid.",
    body: "Keep client details, job notes, photos, pricing and invoice context connected so money work does not fall behind.",
    points: ["Quotes", "Invoices", "MYOB-ready flow", "Payment follow-up"],
  },
  {
    eyebrow: "Crew control",
    title: "The field gets simple tools. The owner gets the full picture.",
    body: "Workers see what they need. Owners see job movement, proof, issues and what needs approving.",
    points: ["Worker app", "Roles", "Payroll review", "Mobile first"],
  },
];

export function PublicSiteShell({ children, page = "home" }) {
  return (
    <main className={`cvx-site cvx-site--${page}`}>
      <header className="cvx-nav">
        <Link to="/" className="cvx-brand" aria-label="Churvox home">
          <ChurvoxLogo />
          <span>Churvox</span>
        </Link>

        <nav className="cvx-nav-links" aria-label="Public navigation">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/features">Features</NavLink>
          <NavLink to="/pricing">Pricing</NavLink>
        </nav>

        <div className="cvx-nav-actions">
          <Link to="/login" className="cvx-link-button">Log in</Link>
          <Link to="/signup" className="cvx-button cvx-button--dark">Start free</Link>
        </div>
      </header>

      {children}

      <footer className="cvx-footer">
        <div>
          <div className="cvx-footer-brand">
            <ChurvoxLogo />
            <strong>Churvox</strong>
          </div>
          <p>AI office operator software for trade and service businesses.</p>
        </div>

        <div className="cvx-footer-grid">
          <Link to="/features">Features</Link>
          <Link to="/pricing">Pricing</Link>
          <Link to="/login">Log in</Link>
          <Link to="/signup">Start free</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
        </div>
      </footer>
    </main>
  );
}

export function ApprovalDock() {
  const slips = [
    ["Invoice ready", "Job completed, proof photos attached, customer details checked.", "Approve invoice"],
    ["Quote follow-up", "A quote has been waiting. Churvox prepared the next message.", "Review message"],
    ["Crew gap", "A job needs assigning. Best worker match has been prepared.", "Assign worker"],
  ];

  return (
    <div className="cvx-approval-dock" aria-label="Churvox approval dock preview">
      <div className="cvx-dock-top">
        <span className="cvx-dot" />
        <span className="cvx-dot" />
        <span className="cvx-dot" />
        <strong>Today’s approval desk</strong>
        <em>AI prepared</em>
      </div>

      <div className="cvx-dock-main">
        <div className="cvx-dock-score">
          <span>Next best move</span>
          <strong>Send invoice</strong>
          <p>Churvox found completed work that is ready to bill.</p>
        </div>

        <div className="cvx-slip-stack">
          {slips.map(([title, body, action], index) => (
            <article key={title} className="cvx-slip" style={{ "--delay": `${index * 70}ms` }}>
              <div>
                <strong>{title}</strong>
                <p>{body}</p>
              </div>
              <span>{action}</span>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

export function FlowStrip() {
  return (
    <section className="cvx-flow-strip" aria-label="How Churvox works">
      {[
        ["1", "Work comes in", "Jobs, messages, photos, quotes and invoices land in one operating flow."],
        ["2", "Churvox prepares", "AI turns the messy admin into clear work slips with the next action ready."],
        ["3", "Owner approves", "You review, edit if needed, approve and keep the business moving."],
      ].map(([num, title, text]) => (
        <article key={title}>
          <span>{num}</span>
          <h3>{title}</h3>
          <p>{text}</p>
        </article>
      ))}
    </section>
  );
}

export function FeatureRibbon({ items }) {
  return (
    <div className="cvx-ribbon">
      {items.map((item) => <span key={item}>{item}</span>)}
    </div>
  );
}
