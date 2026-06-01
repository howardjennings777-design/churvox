import React from "react";

const approvals = [
  {
    label: "Invoice ready",
    text: "Completed job, proof photos and invoice wording prepared.",
  },
  {
    label: "Quote follow-up",
    text: "Customer message drafted and ready for approval.",
  },
  {
    label: "Assign worker",
    text: "Best available crew member suggested with reason.",
  },
];

const problems = [
  "Invoices get forgotten after busy days.",
  "Photos and notes end up buried in messages.",
  "Quotes go quiet because nobody has time to chase them.",
  "Owners are left guessing the next admin step.",
];

const features = [
  {
    title: "Jobs",
    text: "Create, assign and review field work without losing the admin trail.",
  },
  {
    title: "Client Workbench",
    text: "Keep customer details, job history, quotes and invoices connected.",
  },
  {
    title: "Invoice Forge",
    text: "Prepare draft invoices from completed jobs, notes, photos and pricing.",
  },
  {
    title: "Quote Press",
    text: "Create quotes and prepare follow-up messages before they go cold.",
  },
  {
    title: "Crew",
    text: "Give workers a simple job view while owners keep the full picture.",
  },
  {
    title: "AI Operator",
    text: "Churvox prepares the next admin action. You stay in control.",
  },
];

export default function ChurvoxPublicSite() {
  return (
    <main className="cv-public-site">
      <style>{`
        :root {
          --cv-ink: #111827;
          --cv-muted: #5f6675;
          --cv-soft: #f4f6f3;
          --cv-line: rgba(17, 24, 39, 0.1);
          --cv-green: #10d46f;
          --cv-blue: #35b8ff;
          --cv-dark: #081324;
          --cv-dark-2: #0d1b32;
        }

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: var(--cv-soft);
        }

        .cv-public-site {
          width: 100vw;
          min-height: 100vh;
          margin-left: calc(50% - 50vw);
          margin-right: calc(50% - 50vw);
          overflow-x: hidden;
          background:
            radial-gradient(circle at 12% 12%, rgba(16, 212, 111, 0.12), transparent 24rem),
            radial-gradient(circle at 88% 12%, rgba(53, 184, 255, 0.12), transparent 26rem),
            #f5f7f2;
          color: var(--cv-ink);
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .cv-wrap {
          width: min(100% - 40px, 1240px);
          margin: 0 auto;
        }

        .cv-nav {
          position: sticky;
          top: 0;
          z-index: 20;
          padding: 18px 0 10px;
          backdrop-filter: blur(18px);
        }

        .cv-nav-inner {
          width: min(100% - 40px, 1240px);
          margin: 0 auto;
          min-height: 54px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          border: 1px solid var(--cv-line);
          background: rgba(255, 255, 255, 0.72);
          border-radius: 999px;
          padding: 9px 12px 9px 16px;
          box-shadow: 0 18px 50px rgba(15, 23, 42, 0.08);
        }

        .cv-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: var(--cv-ink);
          min-width: fit-content;
        }

        .cv-mark {
          width: 34px;
          height: 34px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          color: white;
          font-weight: 900;
          background: linear-gradient(135deg, var(--cv-blue), var(--cv-green));
          box-shadow: 0 10px 25px rgba(16, 212, 111, 0.24);
        }

        .cv-brand strong {
          display: block;
          font-size: 16px;
          line-height: 1;
        }

        .cv-brand span {
          display: block;
          font-size: 11px;
          color: var(--cv-muted);
          margin-top: 3px;
        }

        .cv-links {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 18px;
          font-size: 13px;
          font-weight: 700;
        }

        .cv-links a {
          color: var(--cv-ink);
          text-decoration: none;
        }

        .cv-pill-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 42px;
          padding: 0 18px;
          border-radius: 999px;
          border: 0;
          background: var(--cv-green);
          color: #062014 !important;
          font-size: 13px;
          font-weight: 900;
          text-decoration: none;
          box-shadow: 0 16px 35px rgba(16, 212, 111, 0.24);
        }

        .cv-hero {
          min-height: calc(100svh - 86px);
          display: grid;
          align-items: center;
          padding: 28px 0 56px;
        }

        .cv-hero-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(360px, 0.85fr);
          gap: 34px;
          align-items: stretch;
        }

        .cv-copy,
        .cv-operator-card,
        .cv-panel {
          border: 1px solid var(--cv-line);
          border-radius: 34px;
          background: rgba(255, 255, 255, 0.78);
          box-shadow: 0 26px 80px rgba(15, 23, 42, 0.08);
        }

        .cv-copy {
          padding: clamp(32px, 5vw, 70px);
          display: flex;
          flex-direction: column;
          justify-content: center;
          min-height: 560px;
        }

        .cv-eyebrow {
          width: fit-content;
          margin: 0 0 20px;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(16, 212, 111, 0.12);
          color: #087944;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .cv-copy h1 {
          margin: 0;
          max-width: 790px;
          font-size: clamp(58px, 8.5vw, 112px);
          letter-spacing: -0.085em;
          line-height: 0.9;
        }

        .cv-copy h1 span {
          display: block;
        }

        .cv-copy p {
          max-width: 680px;
          margin: 24px 0 0;
          color: #303847;
          font-size: clamp(16px, 1.35vw, 20px);
          line-height: 1.55;
          font-weight: 650;
        }

        .cv-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: center;
          margin-top: 28px;
        }

        .cv-secondary-button {
          display: inline-flex;
          min-height: 42px;
          align-items: center;
          justify-content: center;
          padding: 0 18px;
          border-radius: 999px;
          border: 1px solid var(--cv-line);
          background: rgba(255,255,255,0.75);
          color: var(--cv-ink);
          text-decoration: none;
          font-size: 13px;
          font-weight: 900;
        }

        .cv-proof-row {
          display: flex;
          flex-wrap: wrap;
          gap: 10px 18px;
          margin-top: 24px;
          color: #596171;
          font-size: 12px;
          font-weight: 800;
        }

        .cv-operator-card {
          min-height: 560px;
          padding: 24px;
          background:
            linear-gradient(145deg, rgba(8, 19, 36, 0.94), rgba(13, 27, 50, 0.98)),
            radial-gradient(circle at 80% 10%, rgba(53,184,255,0.24), transparent 18rem);
          color: white;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .cv-screen {
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 28px;
          background: rgba(255,255,255,0.07);
          padding: 22px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.12);
        }

        .cv-screen small {
          display: block;
          color: var(--cv-blue);
          font-weight: 950;
          letter-spacing: 0.11em;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .cv-screen h2 {
          margin: 0;
          max-width: 360px;
          font-size: clamp(42px, 5vw, 70px);
          line-height: 0.9;
          letter-spacing: -0.065em;
        }

        .cv-screen p {
          margin: 12px 0 22px;
          color: rgba(255,255,255,0.72);
          font-weight: 800;
        }

        .cv-approval-list {
          display: grid;
          gap: 10px;
        }

        .cv-approval-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 12px;
          align-items: center;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 18px;
          background: rgba(255,255,255,0.06);
          padding: 13px 14px;
        }

        .cv-approval-row strong {
          display: block;
          color: var(--cv-blue);
          font-size: 11px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-bottom: 5px;
        }

        .cv-approval-row span {
          display: block;
          color: white;
          font-size: 13px;
          font-weight: 850;
          line-height: 1.3;
        }

        .cv-approve {
          border: 0;
          border-radius: 999px;
          padding: 10px 13px;
          background: var(--cv-green);
          color: #062014;
          font-size: 12px;
          font-weight: 950;
        }

        .cv-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 14px;
        }

        .cv-tags span {
          border-radius: 999px;
          background: rgba(255,255,255,0.09);
          color: rgba(255,255,255,0.88);
          padding: 8px 10px;
          font-size: 12px;
          font-weight: 850;
        }

        .cv-section {
          padding: 42px 0;
        }

        .cv-panel {
          padding: clamp(28px, 4vw, 54px);
        }

        .cv-split {
          display: grid;
          grid-template-columns: minmax(0, 0.85fr) minmax(340px, 1fr);
          gap: 26px;
          align-items: start;
        }

        .cv-section h2 {
          margin: 0;
          max-width: 720px;
          font-size: clamp(42px, 6vw, 82px);
          line-height: 0.9;
          letter-spacing: -0.07em;
        }

        .cv-section p {
          margin: 14px 0 0;
          color: var(--cv-muted);
          font-size: 16px;
          line-height: 1.55;
          font-weight: 650;
        }

        .cv-problem-grid,
        .cv-feature-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .cv-mini-card,
        .cv-feature-card {
          min-height: 0;
          border: 1px solid var(--cv-line);
          border-radius: 20px;
          background: rgba(255,255,255,0.68);
          padding: 18px;
        }

        .cv-mini-card {
          font-size: 15px;
          line-height: 1.35;
          font-weight: 900;
        }

        .cv-feature-card strong {
          display: block;
          margin-bottom: 8px;
          font-size: 18px;
          letter-spacing: -0.025em;
        }

        .cv-feature-card span {
          display: block;
          color: var(--cv-muted);
          font-size: 14px;
          line-height: 1.45;
          font-weight: 650;
        }

        .cv-command-panel {
          min-height: 52vh;
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(320px, 0.8fr);
          gap: 32px;
          align-items: center;
          border-radius: 34px;
          padding: clamp(32px, 5vw, 68px);
          color: white;
          background:
            linear-gradient(135deg, rgba(8,19,36,0.96), rgba(13,27,50,0.98)),
            radial-gradient(circle at 85% 10%, rgba(53,184,255,0.26), transparent 22rem);
          box-shadow: 0 30px 90px rgba(8, 19, 36, 0.22);
        }

        .cv-command-panel h2 {
          color: white;
        }

        .cv-command-panel p {
          max-width: 700px;
          color: rgba(255,255,255,0.76);
        }

        .cv-command-list {
          display: grid;
          gap: 10px;
        }

        .cv-command-list div {
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 16px;
          background: rgba(255,255,255,0.07);
          padding: 14px 16px;
          color: white;
          font-size: 14px;
          font-weight: 900;
        }

        .cv-final {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 24px;
          align-items: center;
          margin-bottom: 34px;
        }

        .cv-final h2 {
          max-width: 860px;
        }

        .cv-footer {
          padding: 24px 0 40px;
          color: #7a8190;
          font-size: 13px;
          font-weight: 700;
        }

        @media (max-width: 900px) {
          .cv-links a:not(.cv-pill-button) {
            display: none;
          }

          .cv-hero-grid,
          .cv-split,
          .cv-command-panel,
          .cv-final {
            grid-template-columns: 1fr;
          }

          .cv-copy,
          .cv-operator-card {
            min-height: auto;
          }

          .cv-copy h1 {
            font-size: clamp(48px, 16vw, 74px);
          }

          .cv-problem-grid,
          .cv-feature-grid {
            grid-template-columns: 1fr;
          }

          .cv-wrap,
          .cv-nav-inner {
            width: min(100% - 24px, 1240px);
          }
        }
      `}</style>

      <header className="cv-nav">
        <div className="cv-nav-inner">
          <a className="cv-brand" href="/">
            <div className="cv-mark">C</div>
            <div>
              <strong>Churvox</strong>
              <span>AI admin for trade owners</span>
            </div>
          </a>

          <nav className="cv-links">
            <a href="#inside">Inside</a>
            <a href="#features">Features</a>
            <a href="/plans">Plan</a>
            <a href="#command">Command</a>
            <a href="/login">Log in</a>
            <a className="cv-pill-button" href="/plans">Start free</a>
          </nav>
        </div>
      </header>

      <section className="cv-hero">
        <div className="cv-wrap cv-hero-grid">
          <div className="cv-copy">
            <div className="cv-eyebrow">Built for trade and service owners</div>
            <h1>
              <span>Churvox does</span>
              <span>the admin.</span>
              <span>You approve.</span>
            </h1>
            <p>
              Keep jobs, clients, crew, quotes, invoices and proof of work in one place.
              The AI Operator prepares the next admin action so you are not chasing it after hours.
            </p>

            <div className="cv-actions">
              <a className="cv-pill-button" href="/plans">Start free</a>
              <a className="cv-secondary-button" href="/plans">See pricing</a>
            </div>

            <div className="cv-proof-row">
              <span>No card trial</span>
              <span>Approval-first AI</span>
              <span>Built for mobile crews</span>
              <span>MYOB ready on higher plans</span>
            </div>
          </div>

          <aside className="cv-operator-card" aria-label="AI Operator approval preview">
            <div className="cv-screen">
              <small>AI Operator</small>
              <h2>Ready for approval</h2>
              <p>Three actions prepared from today’s work.</p>

              <div className="cv-approval-list">
                {approvals.map((item) => (
                  <div className="cv-approval-row" key={item.label}>
                    <div>
                      <strong>{item.label}</strong>
                      <span>{item.text}</span>
                    </div>
                    <button className="cv-approve" type="button">Approve</button>
                  </div>
                ))}
              </div>

              <div className="cv-tags">
                <span>Jobs</span>
                <span>Invoice Forge</span>
                <span>Quote Press</span>
                <span>Crew</span>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="cv-section" id="features">
        <div className="cv-wrap cv-panel cv-split">
          <div>
            <div className="cv-eyebrow">The gap Churvox fixes</div>
            <h2>Most job apps track work. Churvox helps finish the admin after it.</h2>
            <p>
              Owners should not need to remember every invoice, chase every quote,
              hunt for photos or work out who should do the next job.
            </p>
          </div>

          <div className="cv-problem-grid">
            {problems.map((item) => (
              <div className="cv-mini-card" key={item}>{item}</div>
            ))}
          </div>
        </div>
      </section>

      <section className="cv-section">
        <div className="cv-wrap cv-panel cv-split">
          <div>
            <div className="cv-eyebrow">What you get</div>
            <h2>Everything the owner needs to keep the day moving.</h2>
            <p>
              Churvox keeps the workflow simple: jobs in, crew assigned,
              proof captured, admin prepared, owner approves.
            </p>
          </div>

          <div className="cv-feature-grid">
            {features.map((feature) => (
              <div className="cv-feature-card" key={feature.title}>
                <strong>{feature.title}</strong>
                <span>{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="cv-section" id="inside">
        <div className="cv-wrap cv-command-panel">
          <div>
            <div className="cv-eyebrow">Inside the app</div>
            <h2>The public site stays simple. The logged-in app becomes your Command Room.</h2>
            <p>
              Jobs, invoices, dispatch, money, crew workload and AI-prepared actions stay focused
              when it is time to run the business.
            </p>
          </div>

          <div className="cv-command-list">
            <div>Command Room</div>
            <div>Invoice ready</div>
            <div>Quote follow-up ready</div>
            <div>Worker assignment prepared</div>
            <div>Payment chase drafted</div>
          </div>
        </div>
      </section>

      <section className="cv-section" id="command">
        <div className="cv-wrap cv-panel cv-final">
          <div>
            <div className="cv-eyebrow">Simple promise</div>
            <h2>Churvox prepares the admin. You stay in control.</h2>
            <p>
              Start with jobs and clients. Grow into AI Operator actions, crew workflow,
              invoices, quotes, payroll workspace and MYOB sync when ready.
            </p>
          </div>

          <a className="cv-pill-button" href="/plans">Start free</a>
        </div>
      </section>

      <footer className="cv-wrap cv-footer">
        <strong>Churvox</strong>
        <span> — The AI admin command centre for trade and service owners.</span>
      </footer>
    </main>
  );
}
