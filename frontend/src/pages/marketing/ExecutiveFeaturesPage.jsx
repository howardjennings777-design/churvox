import React from "react";
import { Link } from "react-router-dom";
import { Nav, Footer } from "./ExecutiveHomePage";
import "./SimplePublic.css";

const features = [
  ["AI Setup Guide", "New users are shown what to do first: business details, first client, first job, first invoice and Command approval."],
  ["Jobs and clients", "Keep customer details, work notes, photos, prices and job history together."],
  ["Quotes and invoices", "Prepare quotes, follow-ups and invoices from the real work already in the system."],
  ["Command approval", "Churvox prepares admin actions. The owner approves, edits, snoozes or ignores."],
  ["Worker flow", "Workers get a simple job view while the owner keeps control of the business."],
  ["Payroll workspace", "Approved time and worker summaries stay ready for payroll review without government submission or bank files."],
];

export default function ExecutiveFeaturesPage() {
  return (
    <main className="simplePublic" data-version="CHURVOX_SIMPLE_FEATURES_20260611">
      <Nav />
      <section className="simpleHero">
        <div>
          <span className="simpleKicker">How it works</span>
          <h1>Simple tools, guided by AI.</h1>
          <p className="simpleLead">
            Churvox is not another messy admin maze. It shows the owner what needs doing, prepares the next action and keeps approval in your hands.
          </p>
          <div className="simpleActions">
            <Link to="/signup" className="simpleBtn simplePrimary">Start free</Link>
            <Link to="/login" className="simpleBtn simpleGhost">Log in</Link>
          </div>
        </div>
        <aside className="simpleCard">
          <h2>The Churvox flow</h2>
          <ol>
            <li>1. Work comes in</li>
            <li>2. Churvox prepares admin</li>
            <li>3. Owner reviews</li>
            <li>4. Owner approves</li>
            <li>5. The next step moves</li>
          </ol>
        </aside>
      </section>
      <section className="simpleBand">
        <h2>Everything points to the next useful step.</h2>
        <div className="simpleGrid">
          {features.map(([title, text]) => <article key={title}><b>{title}</b><span>{text}</span></article>)}
        </div>
      </section>
      <Footer />
    </main>
  );
}
