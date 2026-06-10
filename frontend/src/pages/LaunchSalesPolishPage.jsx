import React from "react";

const actions = [
  "Draft invoice prepared",
  "Quote follow-up written",
  "Best worker suggested",
  "Proof photos linked",
];

const features = [
  ["Jobs", "Create, assign and track jobs from one clean workspace."],
  ["Clients", "Keep customer details, job history, quotes and invoices together."],
  ["Quotes", "Build quotes fast and chase them before they go cold."],
  ["Invoices", "Turn completed work into draft invoices ready to approve."],
  ["Crew", "Give workers a simple job view without exposing owner-only details."],
  ["Payroll", "Review hours, approved time and payroll handoff in one place."],
];

const plans = [
  {
    name: "Start",
    price: "$39",
    line: "For solo operators getting organised.",
    items: ["Jobs", "Clients", "Quotes", "Invoices", "Basic AI help"],
  },
  {
    name: "Crew",
    price: "$89",
    line: "For small teams with workers in the field.",
    items: ["Team workflow", "Worker job view", "Photo proof", "More clients", "Crew-ready admin"],
  },
  {
    name: "Operator",
    price: "$149",
    line: "The main Churvox plan. AI prepares the admin.",
    items: ["AI Operator Actions", "Approval queue", "Smart Hub", "Automation support", "MYOB add-on available"],
    popular: true,
  },
  {
    name: "Command",
    price: "$299",
    line: "For bigger crews needing command-level control.",
    items: ["MYOB included", "Payroll workspace", "Advanced roles", "Higher limits", "Priority support"],
  },
];

export default function ChurvoxPublicSite() {
  return (
    <main className="public-page">
      <style>{`
        :root {
          --ink: #10141f;
          --muted: #596170;
          --line: rgba(16, 20, 31, 0.10);
          --soft: #f5f7f1;
          --green: #16db78;
          --blue: #28b8ff;
          --navy: #081324;
          --navy2: #0c1b33;
        }

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: var(--soft);
        }

        .public-page {
          width: 100vw;
          margin-left: calc(50% - 50vw);
          margin-right: calc(50% - 50vw);
          overflow-x: hidden;
          background:
            radial-gradient(circle at 12% 10%, rgba(22, 219, 120, 0.12), transparent 360px),
            radial-gradient(circle at 88% 8%, rgba(40, 184, 255, 0.10), transparent 380px),
            var(--soft);
          color: var(--ink);
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .wrap {
          width: min(100% - 36px, 1320px);
          margin: 0 auto;
        }

        .nav {
          position: sticky;
          top: 0;
          z-index: 30;
          padding: 14px 0;
          background: rgba(245, 247, 241, 0.82);
          backdrop-filter: blur(18px);
          border-bottom: 1px solid rgba(16, 20, 31, 0.06);
        }

        .nav-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--ink);
          text-decoration: none;
        }

        .logo {
          width: 34px;
          height: 34px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          color: #04140c;
          font-weight: 950;
          background: linear-gradient(135deg, var(--blue), var(--green));
        }

        .brand strong {
          display: block;
          font-size: 16px;
          letter-spacing: -0.03em;
        }

        .brand span {
          display: block;
          margin-top: 2px;
          font-size: 11px;
          color: var(--muted);
          font-weight: 750;
        }

        .links {
          display: flex;
          align-items: center;
          gap: 20px;
          font-size: 13px;
          font-weight: 850;
        }

        .links a {
          color: var(--ink);
          text-decoration: none;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 42px;
          padding: 0 18px;
          border-radius: 999px;
          border: 1px solid transparent;
          background: var(--green);
          color: #03150d !important;
          text-decoration: none;
          font-size: 13px;
          font-weight: 950;
          white-space: nowrap;
          box-shadow: 0 16px 34px rgba(22, 219, 120, 0.22);
        }

        .btn.dark {
          background: var(--ink);
          color: white !important;
          box-shadow: none;
        }

        .btn.ghost {
          background: white;
          color: var(--ink) !important;
          border-color: var(--line);
          box-shadow: none;
        }

        .hero {
          min-height: calc(100svh - 71px);
          display: grid;
          align-items: center;
          padding: 52px 0 68px;
        }

        .hero-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.08fr) minmax(360px, 0.72fr);
          gap: 46px;
          align-items: center;
        }

        .eyebrow {
          width: fit-content;
          margin: 0 0 18px;
          padding: 7px 11px;
          border-radius: 999px;
          background: rgba(22, 219, 120, 0.13);
          color: #087543;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        h1,
        h2,
        h3,
        p {
          margin-top: 0;
        }

        .hero h1 {
          max-width: 980px;
          margin-bottom: 22px;
          font-size: clamp(62px, 9vw, 134px);
          line-height: 0.86;
          letter-spacing: -0.09em;
        }

        .hero h1 span {
          display: block;
        }

        .lead {
          max-width: 780px;
          margin-bottom: 28px;
          color: #2f3746;
          font-size: clamp(17px, 1.55vw, 22px);
          line-height: 1.45;
          font-weight: 680;
        }

        .hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: center;
          margin-bottom: 26px;
        }

        .proof {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .proof span {
          padding: 9px 11px;
          border: 1px solid var(--line);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.62);
          color: #515969;
          font-size: 12px;
          font-weight: 850;
        }

        .operator {
          color: white;
          border-radius: 30px;
          padding: 22px;
          background:
            radial-gradient(circle at 85% 10%, rgba(40, 184, 255, 0.30), transparent 260px),
            linear-gradient(145deg, var(--navy), var(--navy2));
          box-shadow: 0 28px 80px rgba(8, 19, 36, 0.24);
        }

        .operator-top {
          padding: 14px 4px 18px;
        }

        .operator small {
          display: block;
          margin-bottom: 8px;
          color: var(--blue);
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.11em;
          text-transform: uppercase;
        }

        .operator h2 {
          margin-bottom: 8px;
          font-size: clamp(38px, 4.5vw, 62px);
          line-height: 0.9;
          letter-spacing: -0.07em;
        }

        .operator p {
          margin: 0;
          color: rgba(255, 255, 255, 0.70);
          font-size: 14px;
          font-weight: 750;
        }

        .action-list {
          display: grid;
          gap: 8px;
        }

        .action-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 12px;
          align-items: center;
          min-height: 50px;
          padding: 11px 12px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.075);
          border: 1px solid rgba(255, 255, 255, 0.10);
          font-size: 13px;
          font-weight: 850;
        }

        .approve {
          border: 0;
          border-radius: 999px;
          padding: 8px 11px;
          background: var(--green);
          color: #04140c;
          font-size: 12px;
          font-weight: 950;
        }

        .section {
          padding: 72px 0;
          border-top: 1px solid rgba(16, 20, 31, 0.07);
        }

        .section-head {
          display: grid;
          grid-template-columns: minmax(0, 0.95fr) minmax(320px, 0.8fr);
          gap: 40px;
          align-items: end;
          margin-bottom: 30px;
        }

        .section h2 {
          margin-bottom: 0;
          font-size: clamp(42px, 6.6vw, 92px);
          line-height: 0.9;
          letter-spacing: -0.075em;
        }

        .section-text {
          margin-bottom: 0;
          color: var(--muted);
          font-size: 17px;
          line-height: 1.5;
          font-weight: 680;
        }

        .strip {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          border: 1px solid var(--line);
          border-radius: 24px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.64);
        }

        .strip div {
          min-height: 112px;
          padding: 20px;
          border-right: 1px solid var(--line);
        }

        .strip div:last-child {
          border-right: 0;
        }

        .strip strong {
          display: block;
          margin-bottom: 8px;
          font-size: 15px;
          letter-spacing: -0.02em;
        }

        .strip span {
          display: block;
          color: var(--muted);
          font-size: 13px;
          line-height: 1.4;
          font-weight: 650;
        }

        .dark-band {
          padding: 82px 0;
          color: white;
          background:
            radial-gradient(circle at 78% 18%, rgba(40, 184, 255, 0.18), transparent 420px),
            linear-gradient(145deg, var(--navy), var(--navy2));
        }

        .dark-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(360px, 0.8fr);
          gap: 44px;
          align-items: center;
        }

        .dark-band h2 {
          max-width: 900px;
          margin-bottom: 18px;
          font-size: clamp(46px, 7.4vw, 104px);
          line-height: 0.88;
          letter-spacing: -0.08em;
        }

        .dark-band p {
          max-width: 760px;
          margin-bottom: 0;
          color: rgba(255, 255, 255, 0.74);
          font-size: 17px;
          line-height: 1.5;
          font-weight: 680;
        }

        .command-list {
          display: grid;
          gap: 10px;
        }

        .command-list div {
          min-height: 48px;
          display: flex;
          align-items: center;
          padding: 0 16px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.10);
          font-size: 14px;
          font-weight: 900;
        }

        .pricing {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .plan {
          position: relative;
          min-height: 360px;
          display: flex;
          flex-direction: column;
          padding: 22px;
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.72);
          border: 1px solid var(--line);
        }

        .plan.popular {
          background: #10141f;
          color: white;
          border-color: #10141f;
          box-shadow: 0 22px 55px rgba(16, 20, 31, 0.20);
        }

        .tag {
          position: absolute;
          top: 18px;
          right: 18px;
          border-radius: 999px;
          padding: 7px 9px;
          background: var(--green);
          color: #04140c;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .plan h3 {
          margin-bottom: 10px;
          font-size: 26px;
          letter-spacing: -0.045em;
        }

        .price {
          display: flex;
          align-items: baseline;
          gap: 6px;
          margin-bottom: 12px;
        }

        .price strong {
          font-size: 48px;
          line-height: 1;
          letter-spacing: -0.075em;
        }

        .price span {
          color: var(--muted);
          font-size: 13px;
          font-weight: 800;
        }

        .plan.popular .price span,
        .plan.popular .plan-line,
        .plan.popular li {
          color: rgba(255, 255, 255, 0.72);
        }

        .plan-line {
          min-height: 44px;
          color: var(--muted);
          font-size: 14px;
          line-height: 1.35;
          font-weight: 700;
        }

        .plan ul {
          list-style: none;
          padding: 0;
          margin: 18px 0 22px;
          display: grid;
          gap: 9px;
        }

        .plan li {
          color: #4f5767;
          font-size: 13px;
          line-height: 1.35;
          font-weight: 750;
        }

        .plan li:before {
          content: "✓";
          margin-right: 8px;
          color: #0b9b57;
          font-weight: 950;
        }

        .plan.popular li:before {
          color: var(--green);
        }

        .plan .btn {
          margin-top: auto;
          width: 100%;
        }

        .note-row {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-top: 14px;
        }

        .note-row div {
          padding: 16px;
          border-radius: 18px;
          border: 1px solid var(--line);
          background: rgba(255, 255, 255, 0.58);
          color: var(--muted);
          font-size: 13px;
          line-height: 1.4;
          font-weight: 720;
        }

        .final {
          padding: 78px 0 64px;
        }

        .final-inner {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 28px;
          align-items: center;
        }

        .final h2 {
          max-width: 860px;
          margin-bottom: 12px;
          font-size: clamp(42px, 6vw, 82px);
          line-height: 0.9;
          letter-spacing: -0.075em;
        }

        .final p {
          max-width: 750px;
          margin-bottom: 0;
          color: var(--muted);
          font-size: 17px;
          line-height: 1.5;
          font-weight: 680;
        }

        .footer {
          padding: 24px 0 40px;
          border-top: 1px solid rgba(16, 20, 31, 0.07);
          color: #737b8a;
          font-size: 13px;
          font-weight: 750;
        }

        @media (max-width: 1050px) {
          .hero-grid,
          .section-head,
          .dark-grid,
          .final-inner {
            grid-template-columns: 1fr;
          }

          .pricing {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .strip {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .strip div:nth-child(2) {
            border-right: 0;
          }

          .strip div:nth-child(1),
          .strip div:nth-child(2) {
            border-bottom: 1px solid var(--line);
          }
        }

        @media (max-width: 720px) {
          .wrap {
            width: min(100% - 24px, 1320px);
          }

          .links a:not(.btn) {
            display: none;
          }

          .hero {
            min-height: auto;
            padding: 42px 0 54px;
          }

          .hero h1 {
            font-size: clamp(52px, 17vw, 78px);
          }

          .operator {
            border-radius: 24px;
          }

          .section,
          .dark-band,
          .final {
            padding: 54px 0;
          }

          .pricing,
          .strip,
          .note-row {
            grid-template-columns: 1fr;
          }

          .strip div {
            border-right: 0;
            border-bottom: 1px solid var(--line);
          }

          .strip div:last-child {
            border-bottom: 0;
          }
        }
      `}</style>

      <header className="nav">
        <div className="wrap nav-inner">
          <a className="brand" href="/">
            <div className="logo">C</div>
            <div>
              <strong>Churvox</strong>
              <span>AI admin command centre</span>
            </div>
          </a>

          <nav className="links">
            <a href="#features">Features</a>
            <a href="#inside">Inside</a>
            <a href="#pricing">Pricing</a>
            <a href="/login">Log in</a>
            <a className="btn" href="/plans">Start free</a>
          </nav>
        </div>
      </header>

      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <div className="eyebrow">Built for trade and service owners</div>
            <h1>
              <span>Run the job.</span>
              <span>Churvox runs</span>
              <span>the admin.</span>
            </h1>
            <p className="lead">
              Churvox keeps jobs, clients, crew, quotes, invoices and proof of work together.
              The AI Operator prepares the next action. You check it, approve it and move on.
            </p>

            <div className="hero-actions">
              <a className="btn" href="/plans">Start free</a>
              <a className="btn ghost" href="#pricing">See pricing</a>
            </div>

            <div className="proof">
              <span>No-card trial</span>
              <span>Approval-first AI</span>
              <span>Mobile crew workflow</span>
              <span>MYOB ready</span>
            </div>
          </div>

          
        </div>
      </section>

      <section className="section" id="features">
        <div className="wrap">
          <div className="section-head">
            <h2>Less chasing. Less guessing. Less admin after hours.</h2>
            <p className="section-text">
              Most job apps stop at tracking work. Churvox helps turn finished work into the next admin step:
              invoice, quote follow-up, worker assignment, proof, payroll review or customer update.
            </p>
          </div>

          <div className="strip">
            <div><strong>Finish the job</strong><span>Track work, photos, notes and time from one place.</span></div>
            <div><strong>Prepare the admin</strong><span>Churvox drafts the next step instead of leaving it in your head.</span></div>
            <div><strong>Approve the action</strong><span>You stay in control before anything important goes out.</span></div>
            <div><strong>Keep moving</strong><span>Your business has a clear command desk for the day.</span></div>
          </div>
        </div>
      </section>

      <section className="dark-band" id="inside">
        <div className="wrap dark-grid">
          <div>
            <div className="eyebrow">Inside Churvox</div>
            <h2>Your logged-in app becomes the Command Desk.</h2>
            <p>
              Smart Hub shows what needs attention, what Churvox prepared,
              and what button to press next. No messy public-page boxes. No confusing workflow.
            </p>
          </div>

          <div className="command-list">
            <div>Today’s urgent actions</div>
            <div>Draft invoices ready</div>
            <div>Quote follow-ups prepared</div>
            <div>Worker assignment suggestions</div>
            <div>Payroll and time review</div>
            <div>MYOB sync when ready</div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <h2>Built around the real trade workflow.</h2>
            <p className="section-text">
              Jobs come in, crew go out, proof comes back, admin gets prepared,
              and the owner approves the next move.
            </p>
          </div>

          <div className="strip">
            {features.map(([title, text]) => (
              <div key={title}>
                <strong>{title}</strong>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="pricing">
        <div className="wrap">
          <div className="section-head">
            <h2>Simple pricing that grows with the crew.</h2>
            <p className="section-text">
              Start small, then move into AI Operator actions, MYOB, payroll workspace and higher limits
              as the business grows. Prices exclude GST.
            </p>
          </div>

          <div className="pricing">
            {plans.map((plan) => (
              <article className={`plan ${plan.popular ? "popular" : ""}`} key={plan.name}>
                {plan.popular && <div className="tag">Most popular</div>}
                <h3>{plan.name}</h3>
                <div className="price">
                  <strong>{plan.price}</strong>
                  <span>/ month + GST</span>
                </div>
                <p className="plan-line">{plan.line}</p>
                <ul>
                  {plan.items.map((item) => <li key={item}>{item}</li>)}
                </ul>
                <a className={`btn ${plan.popular ? "" : "ghost"}`} href="/plans">Choose {plan.name}</a>
              </article>
            ))}
          </div>

          <div className="note-row">
            <div><strong>Command Growth Pack:</strong> $99/month + GST per extra 50 active team members.</div>
            <div><strong>MYOB:</strong> available on Operator as a $39/month add-on and included with Command.</div>
            <div><strong>SMS:</strong> sold separately as credit packs so owners only buy what they need.</div>
          </div>
        </div>
      </section>

      <section className="final">
        <div className="wrap final-inner">
          <div>
            <h2>Churvox prepares it. You approve it.</h2>
            <p>
              A cleaner way to run jobs, crew and admin without building your day around paperwork.
            </p>
          </div>
          <a className="btn dark" href="/plans">Start free</a>
        </div>
      </section>

      <footer className="footer">
        <div className="wrap">
          <strong>Churvox</strong> — AI admin command centre for trade and service owners.
        </div>
      </footer>
    </main>
  );
}
