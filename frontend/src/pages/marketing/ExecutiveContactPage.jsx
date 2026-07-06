import React from "react";
import { Link } from "react-router-dom";
import { Nav, Footer } from "./ExecutiveHomePage";
import "./SimplePublic.css";

const contactCards = [
  ["Email", "hello@churvox.com", "Setup help, tester access, demo questions or trial support."],
  ["Demo", "churvox.com/demo", "Use this when you want to show Churvox without a login."],
  ["Request", "churvox.com/request", "Use this when a customer needs to send job details in cleanly."],
];

export default function ExecutiveContactPage() {
  return (
    <main className="publicSite cv2Site publicPageSlim" data-version="CHURVOX_CONTACT_COPY_20260706">
      <Nav />

      <section className="publicHero publicHeroCompact slimHero">
        <div className="publicHeroCopy">
          <span className="publicKicker">Contact</span>
          <h1>Need Churvox help? Email us.</h1>
          <p>Tell us what you run, what you want to test, or what is blocking you. Keep it simple and we will point you the right way.</p>
          <div className="publicActions">
            <a className="publicPrimary" href="mailto:hello@churvox.com">Email hello@churvox.com</a>
            <Link to="/demo" className="publicSecondary">See the demo</Link>
          </div>
        </div>
        <aside className="publicFeaturePanel slimPanel">
          <small>Best email</small>
          <b>hello@churvox.com</b>
          <span>For setup, trial, tester or demo support.</span>
        </aside>
      </section>

      <section className="publicBand slimBand">
        <div className="publicSectionHead compactHead">
          <span className="publicKicker">Useful links</span>
          <h2>Go straight to the right place.</h2>
        </div>
        <div className="publicCardGrid slimGrid">
          {contactCards.map(([title, action, text]) => (
            <article key={title}>
              <b>{title}</b>
              <span>{action}</span>
              <span>{text}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="publicBand publicCta slimCta">
        <div>
          <span className="publicKicker">Next</span>
          <h2>See the demo before you email.</h2>
        </div>
        <div className="publicActions">
          <Link to="/demo" className="publicPrimary">See the demo</Link>
          <Link to="/signup" className="publicSecondary">Start trial</Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
