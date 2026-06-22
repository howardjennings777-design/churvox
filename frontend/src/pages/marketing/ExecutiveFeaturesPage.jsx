import React from "react";
import { Link } from "react-router-dom";
import { Nav, Footer } from "./ExecutiveHomePage";
import "./SimplePublic.css";

const features = [
  ["Smart Hub", "See what needs attention across jobs, invoices, customers, payments and admin."],
  ["Jobs and clients", "Keep customer details, work notes, photos, prices and job history together."],
  ["Quotes and invoices", "Create quotes and invoices from the job information already in the system."],
  ["Command approval", "Churvox prepares admin actions. You review, edit or approve them before they move."],
  ["Worker flow", "Workers get a simple job view while the owner keeps control of the business."],
  ["Accounting handoff", "Export or draft-sync accounting where available without auto-sending, tax filing or payout files."],
];

const flow = [
  ["1", "Job created", "Add the client, work, price, notes and schedule."],
  ["2", "Work completed", "Track time, notes, photos and what still needs attention."],
  ["3", "Invoice prepared", "Turn job details into an invoice with less retyping."],
  ["4", "Owner approves", "Review what Churvox prepared before anything important moves."],
  ["5", "Paid and synced", "Check payment status and hand off to Xero/MYOB where available."],
];

export default function ExecutiveFeaturesPage() {
  return (
    <main className="simplePublic" data-version="CHURVOX_FEATURES_STRONGER_20260622">
      <Nav />
      <section className="simpleHero">
        <div>
          <span className="simpleKicker">How it works</span>
          <h1>Churvox connects the work to the admin that follows it.</h1>
          <p className="simpleLead">
            Jobs, clients, workers, quotes, invoices, payment checks and accounting handoff all sit in one owner-controlled workflow.
          </p>
          <div className="simpleActions">
            <Link to="/signup" className="simpleBtn simplePrimary">Start 14-day trial</Link>
            <Link to="/pricing" className="simpleBtn simpleGhost">View pricing</Link>
          </div>
        </div>
        <aside className="simpleCard">
          <h2>Job → Invoice → Paid → Synced.</h2>
          <p>
            That is the simple Churvox promise. The app keeps the next step visible and keeps the owner in charge.
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
