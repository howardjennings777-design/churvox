import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import MarketingShell from "../../components/marketing/MarketingShell";

function Btn({ to, children, primary }) {
  return <Link className={primary ? "home-btn home-btn-primary" : "home-btn"} to={to}>{children}</Link>;
}

export default function HomePage() {
  useEffect(() => { document.title = "Churvox — Autonomous office for trade businesses"; }, []);
  return (
    <MarketingShell>
      <main className="home-page">
        <section className="home-hero">
          <div className="home-hero-copy">
            <p className="home-kicker">Autonomous office for trade businesses</p>
            <h1>Stop chasing admin. Churvox runs the office.</h1>
            <p className="home-lead">Churvox prepares invoices, quote follow-ups, worker actions, job checks, missing-info fixes and customer admin, then puts the important decisions in front of you for approval.</p>
            <div className="home-actions"><Btn to="/signup" primary>Start free</Btn><Btn to="/login">Log in</Btn><Btn to="/features">See how it works</Btn></div>
          </div>
          <div className="home-console">
            <div className="home-console-top"><span /><b>Today prepared for approval</b><em>Owner desk</em></div>
            <div className="home-console-grid">
              <section className="home-console-main">
                <div className="home-console-label">Churvox already prepared</div>
                <div className="home-queue-row active"><div><strong>Invoice drafted</strong><p>Completed job, notes, pricing and proof checked.</p></div><span>Approve</span></div>
                <div className="home-queue-row"><div><strong>Worker suggested</strong><p>Unassigned job matched to available crew.</p></div><span>Review</span></div>
                <div className="home-queue-row"><div><strong>Quote follow-up written</strong><p>Customer has not replied. Message ready.</p></div><span>Review</span></div>
              </section>
              
            </div>
          </div>
        </section>

        <section className="home-heart">
          <div className="home-heart-copy"><p className="home-kicker">The heart of Churvox</p><h2>You should not have to chase the admin.</h2><p>Jobs finish, workers add notes and photos, customers need follow-ups, invoices need sending, and hours need checking. Churvox turns that noise into owner decisions.</p></div>
          <div className="home-heart-board"><article><span>01</span><strong>It watches the work</strong><p>Jobs, quotes, invoices, proof and worker updates feed the same desk.</p></article><article><span>02</span><strong>It prepares the next move</strong><p>Drafts, reminders, assignments and missing-data fixes are lined up.</p></article><article><span>03</span><strong>You approve what matters</strong><p>No blind sends, pricing changes or syncs without the owner.</p></article></div>
        </section>

        <section className="home-proof"><div><strong>AI prepares</strong><span>Invoices, follow-ups, reminders and checks.</span></div><div><strong>Owner approves</strong><span>You stay in control of important actions.</span></div><div><strong>The business moves</strong><span>Workers, clients and money stay connected.</span></div></section>

        <section className="home-final"><div><p className="home-kicker">The whole point</p><h2>Churvox prepares it. You approve it.</h2><p>Start with your first job. Let Churvox bring the next decision to you.</p></div><div className="home-final-actions"><Btn to="/signup" primary>Start free</Btn><Btn to="/login">Log in</Btn></div></section>
      </main>
    </MarketingShell>
  );
}
