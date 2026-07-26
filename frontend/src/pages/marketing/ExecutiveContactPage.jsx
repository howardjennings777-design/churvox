import React from "react";
import { Link } from "react-router-dom";
import { PublicNav, PublicFooter } from "./ChurvoxPublicShell";

const channels = [
  ["01", "Product and trial help", "Tell us what business you run, what admin is slowing you down and what you want to test.", "mailto:hello@churvox.com?subject=Churvox%20trial%20help", "Email trial support"],
  ["02", "Tester access", "Include the invited email address and the step where setup stopped.", "mailto:hello@churvox.com?subject=Churvox%20tester%20access", "Email tester support"],
  ["03", "Technical issue", "Send the page address, what you clicked, what happened and a screenshot when useful.", "mailto:hello@churvox.com?subject=Churvox%20technical%20issue", "Report an issue"],
];

const routes = [
  ["Product demo", "/demo", "See how Churvox handles a job without signing in."],
  ["Pricing", "/pricing", "Compare plans, team limits and included features."],
  ["Start trial", "/signup?plan=operator", "Create an owner account with no card upfront."],
  ["Log in", "/login", "Open your Churvox account."],
];

export default function ExecutiveContactPage() {
  return (
    <main className="cp26Site cpWorld cpWorldContact" data-room="contact" data-version="CHURVOX_PUBLIC_WORLD_CONTACT_20260724">
      <PublicNav active="/contact" />
      <section className="cpWorldHero">
        <div className="cpWorldLead">
          <span className="cpWorldRouteCode">Contact Churvox</span>
          <h1>Tell us what you need help with.</h1>
          <p>For setup questions, tester access, product fit or a technical problem, tell us the business, the page and what you expected. Email only. No forced sales call.</p>
          <div className="cpWorldActions">
            <a className="cp26Button" href="mailto:hello@churvox.com">Email hello@churvox.com</a>
            <Link className="cp26Button cp26ButtonGhost" to="/demo">View product demo</Link>
          </div>
          <div className="cpWorldFacts"><span>Email support</span><span>Business context first</span><span>Never send passwords or full card details</span></div>
        </div>
        <aside className="cpRadioRoom">
          <header><span>Direct contact</span><b>hello@churvox.com</b></header>
          <div className="cpRadioWave">{Array.from({ length: 7 }).map((_, index) => <i key={index} />)}</div>
          <div className="cpRadioInbox">
            <article><i /><b>Trial question</b><span>Tell us about the business</span></article>
            <article><i /><b>Tester access</b><span>Include the invited email</span></article>
            <article><i /><b>Technical problem</b><span>Include page + screenshot</span></article>
          </div>
        </aside>
      </section>

      <section className="cpWorldSection">
        <header className="cpWorldSectionHead"><span>Choose a topic</span><h2>A useful first message gets you a useful answer.</h2></header>
        <div className="cpContactChannels">{channels.map(([number, title, text, href, label]) => <article className="cpContactChannel" key={title}><b>{number}</b><div><h3>{title}</h3><p>{text}</p></div><a href={href}>{label}</a></article>)}</div>
      </section>

      <section className="cpWorldSection cpRecordRiver">
        <header className="cpWorldSectionHead"><span>Useful links</span><h2>Go straight to the page you need.</h2></header>
        <div className="cpQuickDirectory">{routes.map(([title, to, text], index) => <Link to={to} key={title}><em>Link 0{index + 1}</em><b>{title}</b><span>{text}</span></Link>)}</div>
      </section>

      <section className="cpWorldClosing">
        <div><span>Still deciding?</span><h2>Start with the product demo.</h2><p>The demo answers most product questions. Email us about anything that still does not make sense.</p></div>
        <div><Link className="cp26Button" to="/demo">Open demo</Link><a className="cp26Button cp26ButtonGhost" href="mailto:hello@churvox.com">Email Churvox</a></div>
      </section>
      <PublicFooter />
    </main>
  );
}
