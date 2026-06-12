import React from "react";
import { Link } from "react-router-dom";
import { Nav, Footer } from "./ExecutiveHomePage";
import "./SimplePublic.css";

const features = [
  ["Guided setup", "Churvox shows the first steps: business details, first client, first job and first invoice."],
  ["Jobs and clients", "Keep customer details, work notes, photos, prices and job history together."],
  ["Quotes and invoices", "Create quotes and invoices from the job information already in the system."],
  ["Command approval", "Churvox prepares admin actions. You review, edit or approve them."],
  ["Worker flow", "Workers get a simple job view while the owner keeps control of the business."],
  ["Payroll workspace", "Review approved time and worker summaries without sending anything to government or banks."],
];

export default function ExecutiveFeaturesPage() {
  return (
    <main className="simplePublic" data-version="CHURVOX_FEATURES_COPY_20260612">
      <Nav />
      <section className="simpleHero">
        <div>
          <span className="simpleKicker">How it works</span>
          <h1>Know what needs doing next.</h1>
          <p className="simpleLead">
            Churvox keeps job admin from turning into a mess. It shows the next useful step, prepares it, and leaves the final call with you.
          </p>
          <div className="simpleActions">
            <Link to="/signup" className="simpleBtn simplePrimary">Start free</Link>
            <Link to="/login" className="simpleBtn simpleGhost">Log in</Link>
          </div>
        </div>
        <aside className="simpleCard">
          <h2>The Churvox flow</h2>
          <ol>
            <li>1. Add the work</li>
            <li>2. Churvox prepares the admin</li>
            <li>3. You review it</li>
            <li>4. You approve it</li>
            <li>5. The next step moves</li>
          </ol>
        </aside>
      </section>
      <section className="simpleBand">
        <h2>Tools that support real service work.</h2>
        <div className="simpleGrid">
          {features.map(([title, text]) => <article key={title}><b>{title}</b><span>{text}</span></article>)}
        </div>
      </section>
      <Footer />
    </main>
  );
}
