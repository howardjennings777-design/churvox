import React from "react";
import { Link } from "react-router-dom";
import { Nav, Footer } from "./ExecutiveHomePage";
import "./SimplePublic.css";

const features = [
  ["Command approval", "Unfinished jobs, draft invoices, invoice follow-ups and open quotes move to one owner approval desk."],
  ["Today’s Plan", "See the work that is planned and ready, separate from admin that still needs a decision."],
  ["Jobs and clients", "Keep customer details, work notes, photos, prices and job history together."],
  ["Quotes and invoices", "Create quotes and invoices from the job information already in the system."],
  ["Worker flow", "Workers get a simple job view while the owner keeps control of the business."],
  ["Accounting handoff", "Export or draft-sync accounting where available without auto-sending, tax filing or payout files."],
];

const flow = [
  ["1", "Work enters Churvox", "Add the client, work, price, notes, worker and schedule."],
  ["2", "Records stay clean", "Jobs, clients, quotes, invoices and team pages stay focused on facts."],
  ["3", "Command finds the admin", "Completed work, blocked jobs, unpaid invoices and open quotes become review cards."],
  ["4", "Owner approves", "Review price, customer, recurring status and job facts before anything important moves."],
  ["5", "Admin moves forward", "Invoice, follow-up, record update or accounting handoff proceeds only after approval."],
];

const commandCards = [
  ["Completed job", "Prepare a draft invoice from the job facts."],
  ["Unpaid invoice", "Prepare a follow-up without sending it automatically."],
  ["Open quote", "Surface the next decision before the opportunity goes cold."],
  ["Blocked job", "Bring the blocker to Command instead of hiding it in the job list."],
];

export default function ExecutiveFeaturesPage() {
  return (
    <main className="simplePublic" data-version="CHURVOX_FEATURES_COMMAND_APPROVAL_20260625">
      <Nav />
      <section className="simpleHero">
        <div>
          <span className="simpleKicker">How it works</span>
          <h1>The job app keeps records. Command moves the admin forward.</h1>
          <p className="simpleLead">
            Churvox connects jobs, clients, workers, quotes, invoices, payment checks and accounting handoff in one owner-controlled workflow.
          </p>
          <div className="simpleActions">
            <Link to="/signup" className="simpleBtn simplePrimary">Start 14-day trial</Link>
            <Link to="/pricing" className="simpleBtn simpleGhost">View pricing</Link>
          </div>
        </div>
        <aside className="simpleCard">
          <h2>Churvox does the admin. You approve.</h2>
          <p>
            Finished work, follow-ups and blocked admin land in Command with the facts visible before approval.
          </p>
        </aside>
      </section>

      <section className="simpleBand">
        <h2>The workflow.</h2>
        <div className="simpleTimeline">
          {flow.map(([num, title, text]) => (
            <article key={title}>
              <i>{num}</i>
              <b>{title}</b>
              <span>{text}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="simpleBand simpleInsideBand">
        <div>
          <span className="simpleSectionLabel">Command cards</span>
          <h2>What Churvox prepares for approval.</h2>
          <p className="simpleLead">
            Command is built for the unfinished doing and follow-up work that normally gets missed when the owner is busy.
          </p>
        </div>
        <div className="simpleProductShowcase">
          {commandCards.map(([title, text]) => (
            <article key={title}>
              <div>
                <small>Needs approval</small>
                <b>{title}</b>
              </div>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="simpleBand">
        <h2>Tools that support real service work.</h2>
        <p className="simpleLead">
          Built for businesses where the work happens outside, on-site, across messages, workers, customers and invoices.
        </p>
        <div className="simpleGrid">
          {features.map(([title, text]) => <article key={title}><b>{title}</b><span>{text}</span></article>)}
        </div>
      </section>

      <section className="simpleBand simpleCtaBand">
        <h2>Less chasing. More control.</h2>
        <p className="simpleLead">
          Churvox does not replace the owner. It gives the owner a clearer desk to approve, send, follow up and keep moving.
        </p>
        <div className="simpleActions">
          <Link to="/signup" className="simpleBtn simplePrimary">Start 14-day trial</Link>
          <Link to="/pricing" className="simpleBtn simpleGhost">Choose a plan</Link>
        </div>
      </section>
      <Footer />
    </main>
  );
}
