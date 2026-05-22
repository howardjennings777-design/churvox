import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import MarketingShell from "../../components/marketing/MarketingShell";

const items = [
  ["Invoice drafted", "Completed job, proof and price checked", "Approve"],
  ["Worker suggested", "Unassigned job matched to available crew", "Review"],
  ["Follow-up written", "Customer message ready for approval", "Review"],
  ["Missing price found", "Blocked invoice surfaced before it is forgotten", "Fix"],
];

function Button({ to, children, primary }) {
  return <Link to={to} className={primary ? "ao-btn primary" : "ao-btn"}>{children}</Link>;
}

export default function AutonomousOfficeLanding() {
  useEffect(() => { document.title = "Churvox — Autonomous office for trade businesses"; }, []);
  return (
    <MarketingShell>
      <main className="ao-page">
        <section className="ao-hero">
          <div className="ao-copy">
            <p className="ao-kicker">Autonomous office for trade businesses</p>
            <h1>Stop chasing admin. Churvox runs the office.</h1>
            <p>Churvox prepares invoices, quote follow-ups, worker actions, job checks, missing-info fixes and customer admin, then puts the important decisions in front of you for approval.</p>
            <div className="ao-actions"><Button to="/signup" primary>Start free</Button><Button to="/login">Log in</Button><Button to="/features">See how it works</Button></div>
          </div>
          <aside className="ao-desk">
            <div className="ao-desk-top"><strong>Today prepared for approval</strong><span>Owner desk</span></div>
            <div className="ao-list">{items.map(([a,b,c], i) => <div className={i === 0 ? "ao-row active" : "ao-row"} key={a}><small>{String(i+1).padStart(2,"0")}</small><div><b>{a}</b><p>{b}</p></div><em>{c}</em></div>)}</div>
            <div className="ao-decision"><small>Owner decision required</small><h2>Approve prepared invoice draft</h2><p>Churvox checked the work and prepared the next move. Review the Work Slip, then approve or edit.</p><button type="button">Review Work Slip</button></div>
          </aside>
        </section>
        <section className="ao-dark"><div><p className="ao-kicker">The heart of Churvox</p><h2>You should not have to chase the admin.</h2><p>Jobs finish, workers add proof, customers need follow-ups and invoices need sending. Churvox turns that noise into owner decisions.</p></div><div className="ao-card-grid"><article><h3>It watches the work</h3><p>Jobs, quotes, invoices, proof and worker updates feed one office desk.</p></article><article><h3>It prepares the admin</h3><p>Drafts, reminders, assignments and fixes are lined up before you chase them.</p></article><article><h3>You approve the moves</h3><p>The owner stays in control of customer, money and office actions.</p></article></div></section>
        <section className="ao-section"><p className="ao-kicker">Not another dashboard</p><h2>Most job apps make you find the work. Churvox brings the work to you.</h2><p>Open the office desk and see what needs approval, what is blocking work, who needs assigning, what can be invoiced and what customers need follow-up.</p><div className="ao-tiles"><article><span>01</span><h3>Prepared for approval</h3><p>Drafts, reminders, invoices and worker moves ready to review.</p></article><article><span>02</span><h3>Needs fixing</h3><p>Missing prices, unassigned jobs and incomplete details surfaced fast.</p></article><article><span>03</span><h3>Money desk</h3><p>Completed work, draft invoices and balances stay visible.</p></article></div></section>
        <section className="ao-final"><div><p className="ao-kicker">The whole point</p><h2>Churvox prepares it. You approve it.</h2></div><Button to="/signup" primary>Start free</Button></section>
      </main>
    </MarketingShell>
  );
}
