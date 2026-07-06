import React from "react";
import { Link } from "react-router-dom";
import { Nav, Footer } from "./ExecutiveHomePage";
import "./SimplePublic.css";

const contactCards = [
  ["General contact", "hello@churvox.com", "Questions, demos, setup help or early access."],
  ["Product help", "Use Help inside Churvox", "Logged-in owners can use the Help area so requests stay tied to the account."],
  ["Customer requests", "Request form", "Send work requests into Churvox for owner review before quoting or booking."],
];

export default function ExecutiveContactPage() {
  return (
    <main className="publicSite" data-version="CHURVOX_PUBLIC_CONTACT_20260706">
      <Nav />

      <section className="publicHero publicHeroCompact">
        <div className="publicHeroCopy">
          <span className="publicKicker">Contact Churvox</span>
          <h1>Need help or want to talk through Churvox?</h1>
          <p>
            Email Churvox directly or use the request form if you are sending work to a business using Churvox. Nothing is booked automatically without owner review.
          </p>
          <div className="publicActions">
            <a className="publicPrimary" href="mailto:hello@churvox.com">Email hello@churvox.com</a>
            <Link to="/request" className="publicSecondary">Open request form</Link>
          </div>
        </div>
        <aside className="publicFeaturePanel">
          <small>Owner-approved</small>
          <b>Churvox keeps the owner in control.</b>
          <span>Requests, quotes, invoices and accounting handoff are reviewed before important action happens.</span>
        </aside>
      </section>

      <section className="publicBand">
        <div className="publicSectionHead">
          <span className="publicKicker">Contact options</span>
          <h2>Choose the right way to reach us.</h2>
        </div>
        <div className="publicCardGrid">
          {contactCards.map(([title, action, text]) => (
            <article key={title}>
              <b>{title}</b>
              <span>{action}</span>
              <span>{text}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="publicBand publicCta">
        <div>
          <span className="publicKicker">Start clean</span>
          <h2>Try Churvox with the 14-day trial.</h2>
        </div>
        <div className="publicActions">
          <Link to="/signup" className="publicPrimary">Start 14-day trial</Link>
          <Link to="/pricing" className="publicSecondary">View pricing</Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
