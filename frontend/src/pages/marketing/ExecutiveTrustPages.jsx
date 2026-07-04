import React from "react";
import { Link } from "react-router-dom";
import { Nav, Footer } from "./ExecutiveHomePage";
// removed broken css import
// removed broken css import

const guardrails = [
  ["Owner approval", "Churvox prepares admin, but the owner approves, edits or parks important actions in Command."],
  ["Accounting safety", "Draft sync only where available. No tax filing, no automatic invoice sending and no payout files."],
  ["Worker simplicity", "Workers see assigned work, directions, notes and job actions. Customer records and pricing decisions stay with the owner."],
  ["Clear setup", "The trial starts simple: set business details, add clients, add jobs, invite workers and check Command."],
];

function TrustPage({ kicker, title, text, cards, cta = true }) {
  return (
    <main className="publicSite" data-version="CHURVOX_PUBLIC_TRUST_FRESH_20260705">
      <Nav />
      <section className="publicHero publicHeroCompact">
        <div className="publicHeroCopy">
          <span className="publicKicker">{kicker}</span>
          <h1>{title}</h1>
          <p>{text}</p>
          {cta ? (
            <div className="publicActions">
              <Link to="/signup" className="publicPrimary">Start 14-day trial</Link>
              <Link to="/pricing" className="publicSecondary">View plans</Link>
            </div>
          ) : null}
        </div>
        <aside className="publicFeaturePanel">
          <small>Core promise</small>
          <b>Churvox does the admin. You approve.</b>
          <span>Simple screens for the business, with important decisions kept in Command.</span>
        </aside>
      </section>
      <section className="publicBand">
        <div className="publicSectionHead">
          <span className="publicKicker">Details</span>
          <h2>What this means in practice.</h2>
        </div>
        <div className="publicCardGrid">
          {cards.map(([cardTitle, cardText]) => (
            <article key={cardTitle}>
              <b>{cardTitle}</b>
              <span>{cardText}</span>
            </article>
          ))}
        </div>
      </section>
      <section className="publicBand publicDarkBand">
        <div>
          <span className="publicKicker">Guardrails</span>
          <h2>Useful control without risky automation.</h2>
        </div>
        <div className="publicCardGrid">
          {guardrails.map(([cardTitle, cardText]) => (
            <article key={cardTitle}>
              <b>{cardTitle}</b>
              <span>{cardText}</span>
            </article>
          ))}
        </div>
      </section>
      <section className="publicBand publicCta">
        <div>
          <span className="publicKicker">Next step</span>
          <h2>Try Churvox with real jobs, clients and worker flow.</h2>
        </div>
        <div className="publicActions">
          <Link to="/signup" className="publicPrimary">Start 14-day trial</Link>
          <Link to="/features" className="publicSecondary">See workflow</Link>
        </div>
      </section>
      <Footer />
    </main>
  );
}

export function AboutPage() {
  return (
    <TrustPage
      kicker="About Churvox"
      title="Built for service businesses that need less admin chasing."
      text="Churvox is made for owners running jobs, workers, customers, quotes and invoices at the same time. The point is simple: keep the business moving, prepare the admin and let the owner approve important decisions from one place."
      cards={[
        ["Who it helps", "Trades, property services, cleaning, lawn care, landscaping, pest control, handyman work and mobile service teams."],
        ["Why it exists", "Owners should not need to hunt through messages, notes, invoices and worker updates just to know what needs a decision."],
        ["What makes it different", "Command is the approval desk. Churvox prepares the next admin move, then the owner checks it."],
        ["How to start", "Use the trial, add a few clients and jobs, invite a worker, then check what Command prepares."],
      ]}
    />
  );
}

export function SecurityPage() {
  return (
    <TrustPage
      kicker="Security and control"
      title="Churvox keeps control with the business owner."
      text="Churvox is designed so important business actions are visible before they move. Admin can be prepared, but owner approval stays central."
      cards={[
        ["Owner-approved actions", "Sending invoices, parking decisions and accounting handoff stay controlled by the owner."],
        ["Worker access", "Workers see assigned job details, directions, notes and finish flow. They do not manage customer records or accounting."],
        ["Accounting guardrails", "Draft sync only where available. Churvox does not file tax, create payout files or automatically send invoices."],
        ["Clear records", "Jobs, clients, quotes, invoices, messages and worker updates stay tied to the relevant record where possible."],
      ]}
    />
  );
}

export function ContactPage() {
  return (
    <TrustPage
      kicker="Contact"
      title="Need help setting up Churvox?"
      text="Send a message and include what type of business you run, how many workers you have and what you want Churvox to help clean up first."
      cta={false}
      cards={[
        ["Email", "hello@churvox.com"],
        ["Best first question", "Tell us whether you need help with jobs, clients, workers, quotes, invoices, payments or accounting sync."],
        ["Beta/testing", "Selected testers may be offered extended access while Churvox is being polished."],
        ["Setup help", "Start with business details, clients, jobs and the worker app. Then Command can start showing useful owner checks."],
      ]}
    />
  );
}

export function RefundsCancellationsPage() {
  return (
    <TrustPage
      kicker="Refunds and cancellations"
      title="Keep billing simple and clear."
      text="Churvox pricing is monthly. The trial is designed to let a business check whether the workflow fits before committing."
      cards={[
        ["Trial", "The public offer is a 14-day trial with no card upfront where available."],
        ["Cancel", "A business should be able to stop using Churvox without losing control of its own business records."],
        ["Billing questions", "Email hello@churvox.com if a charge, plan or access issue needs checking."],
        ["Accounting sync", "Accounting sync features stay owner-approved and guarded. Draft sync only where available."],
      ]}
    />
  );
}
