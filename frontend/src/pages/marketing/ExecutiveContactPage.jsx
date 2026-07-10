import React from "react";
import { Link } from "react-router-dom";
import { PublicNav, PublicFooter, Eyebrow, SectionHeading } from "./ChurvoxPublicShell";

const contactOptions = [
  ["Product and trial help", "Tell us what kind of business you run, what admin is slowing you down and what you want to test.", "mailto:hello@churvox.com?subject=Churvox%20trial%20help", "Email trial support"],
  ["Tester access", "Existing invited testers can ask about setup, trial access or getting the right business profile loaded.", "mailto:hello@churvox.com?subject=Churvox%20tester%20access", "Email tester support"],
  ["Technical issue", "Include the page, what you clicked and what happened. A screenshot is useful when the problem is visual.", "mailto:hello@churvox.com?subject=Churvox%20technical%20issue", "Report an issue"],
];

const usefulRoutes = [
  ["Product demo", "/demo", "View the public product flow without signing in."],
  ["Pricing", "/pricing", "Compare the current Churvox plans and regional prices."],
  ["Start trial", "/signup", "Create an owner account and begin the free trial."],
  ["Log in", "/login", "Open the owner or worker sign-in screen."],
];

export default function ExecutiveContactPage() {
  return (
    <main className="cp26Site" data-version="CHURVOX_PUBLIC_CONTACT_20260710">
      <PublicNav active="/contact" />

      <section className="cp26PageHero">
        <div>
          <Eyebrow>Contact Churvox</Eyebrow>
          <h1>Tell us what is blocking the business.</h1>
          <p>Setup question, tester access, product fit or a technical problem—send the useful detail and we will point you toward the right next step.</p>
          <div className="cp26HeroActions">
            <a className="cp26Button" href="mailto:hello@churvox.com">Email hello@churvox.com</a>
            <Link className="cp26Button cp26ButtonGhost" to="/demo">Open product demo</Link>
          </div>
        </div>
        <div className="cp26HeroPanel">
          <small>Best contact</small>
          <b>hello@churvox.com</b>
          <span>Include your business name, the page involved and the result you expected. That gives us enough context to help properly.</span>
        </div>
      </section>

      <section className="cp26Section">
        <SectionHeading
          eyebrow="Get to the right help"
          title="Choose the reason that best matches."
          text="A clear first message makes support faster and avoids unnecessary back-and-forth."
        />
        <div className="cp26ContactGrid">
          {contactOptions.map(([title, text, href, label]) => (
            <article key={title}>
              <b>{title}</b>
              <span>{text}</span>
              <a href={href}>{label}</a>
            </article>
          ))}
        </div>
      </section>

      <section className="cp26Section cp26SectionDark">
        <SectionHeading
          eyebrow="Useful places"
          title="Go straight to the page you need."
          text="The demo, pricing, signup and login routes remain available without going through support first."
        />
        <div className="cp26AreaGrid">
          {usefulRoutes.map(([title, to, text]) => (
            <article key={title}>
              <b>{title}</b>
              <span>{text}</span>
              <Link className="cp26Button cp26ButtonGhost" to={to}>Open {title.toLowerCase()}</Link>
            </article>
          ))}
        </div>
      </section>

      <section className="cp26Closing">
        <div>
          <Eyebrow light>Not sure where to start?</Eyebrow>
          <h2>Open the demo first, then email the question that remains.</h2>
          <p>You will get a clearer feel for the owner workflow, Command and the purpose-built work pages before deciding what help you need.</p>
        </div>
        <div className="cp26ClosingActions">
          <Link className="cp26Button" to="/demo">Open demo</Link>
          <a className="cp26Button cp26ButtonGhost" href="mailto:hello@churvox.com">Email Churvox</a>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
