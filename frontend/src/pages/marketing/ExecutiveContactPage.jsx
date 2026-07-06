import React from "react";
import { Link } from "react-router-dom";
import { Nav, Footer } from "./ExecutiveHomePage";
import "./SimplePublic.css";

const contactCards = [
  ["Email", "hello@churvox.com", "Setup help, demos, tester access and trial questions."],
  ["Demo", "churvox.com/demo", "Show the workflow without using a real account."],
  ["Request", "churvox.com/request", "Send work details for owner review."],
];

export default function ExecutiveContactPage() {
  return (
    <main className="publicSite cv2Site publicPageSlim" data-version="CHURVOX_CONTACT_SLIM_20260706">
      <Nav />

      <section className="publicHero publicHeroCompact slimHero">
        <div className="publicHeroCopy">
          <span className="publicKicker">Contact</span>
          <h1>Talk to Churvox.</h1>
          <p>Email us for setup help, trial support, tester access or a walkthrough.</p>
          <div className="publicActions">
            <a className="publicPrimary" href="mailto:hello@churvox.com">Email Churvox</a>
            <Link to="/demo" className="publicSecondary">Open demo</Link>
          </div>
        </div>
        <aside className="publicFeaturePanel slimPanel">
          <small>Best email</small>
          <b>hello@churvox.com</b>
          <span>Tell us what kind of business you run and what you want to test.</span>
        </aside>
      </section>

      <section className="publicBand slimBand">
        <div className="publicSectionHead compactHead">
          <span className="publicKicker">Options</span>
          <h2>Choose the right path.</h2>
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
          <span className="publicKicker">Next step</span>
          <h2>Open the demo or start the trial.</h2>
        </div>
        <div className="publicActions">
          <Link to="/demo" className="publicPrimary">Open demo</Link>
          <Link to="/signup" className="publicSecondary">Start trial</Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
