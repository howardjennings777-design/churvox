import React, { useMemo, useState } from "react";
import "./ChurvoxAIShell.css";

const moves = [
  {
    id: "arrival",
    type: "WORK ARRIVED",
    title: "A job lands. Churvox starts building the admin around it.",
    object: "New hedge job",
    prepared: "Client file, job record, schedule warning, worker suggestion, approval move",
    ownerMove: "Assign worker",
    accent: "violet",
    proof: ["Client matched", "Address checked", "Schedule window detected", "Worker suggestion prepared"],
  },
  {
    id: "finish",
    type: "WORK FINISHED",
    title: "The worker finishes. Churvox shapes the invoice before you ask.",
    object: "ECB Property Maintenance",
    prepared: "Invoice wording, job evidence, photos, time, customer email, owner approval",
    ownerMove: "$430 invoice ready",
    accent: "fire",
    proof: ["Job completed", "Worker photo attached", "Time captured", "Invoice draft prepared"],
  },
  {
    id: "money",
    type: "MONEY WAITING",
    title: "A quote goes quiet. Churvox puts the chase-up in front of you.",
    object: "Rental Owner Group",
    prepared: "Follow-up message, quote context, customer link, send approval",
    ownerMove: "Send follow-up",
    accent: "green",
    proof: ["Quote still open", "No reply detected", "Message drafted", "Contact ready"],
  },
];

const features = [
  ["Jobs", "Create work once and let Churvox carry the admin trail forward."],
  ["Crew", "Worker updates, notes, time, and photos land where the owner can act."],
  ["Invoices", "Completed work becomes a draft invoice with evidence attached."],
  ["Quotes", "Open quotes get follow-up moves before they go cold."],
  ["Clients", "Customer history, job records, and billing context stay connected."],
  ["Approvals", "AI prepares the move. The owner stays in charge of final action."],
];

const plans = [
  ["Start", "$39", "Solo operator", "Clients, jobs, simple admin queue, and owner approvals."],
  ["Crew", "$89", "Small team", "Worker flow, team assignment, photos, notes, and evidence."],
  ["Operator", "$149", "AI admin engine", "AI Operator Actions, invoice prep, quote follow-ups, and approval queue."],
  ["Command", "$299", "Growing operation", "MYOB included, payroll workspace, advanced roles, and higher capacity."],
];

const legal = [
  ["Privacy Policy", "Churvox stores business, client, job, worker, quote, invoice, and approval data so owners can run admin from one place."],
  ["Terms of Service", "Churvox prepares actions, but the owner or authorised user remains responsible for final approval and business decisions."],
  ["Refund / Cancellation Policy", "Subscriptions can be cancelled according to plan terms. Refunds are reviewed based on billing status, availability, and usage."],
  ["Data / Security Note", "Churvox is designed around business isolation, role-based access, and approval-first AI workflows."],
];

function routeTo(path) {
  window.location.href = path;
}

export default function ChurvoxAIShell({ initialView = "home", authedMode = false }) {
  const [view, setView] = useState(initialView || "home");
  const [activeId, setActiveId] = useState("finish");
  const [notice, setNotice] = useState("Churvox has turned the work into an owner-ready move.");
  const [cleared, setCleared] = useState([]);

  const active = useMemo(() => moves.find((move) => move.id === activeId) || moves[1], [activeId]);

  function openView(nextView) {
    setView(nextView);

    const paths = {
      home: authedMode ? "/dashboard" : "/",
      how: "/how-it-works",
      features: "/features",
      plans: "/plans",
      legal: "/legal",
      contact: "/contact",
    };

    const nextPath = paths[nextView] || "/";
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, "", nextPath);
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function clearMove() {
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setCleared((items) => [{ time, text: `${active.ownerMove} cleared` }, ...items].slice(0, 4));
    setNotice(`Cleared: ${active.ownerMove}. Churvox would now complete that admin action.`);
  }

  function copyEmail() {
    navigator.clipboard?.writeText("hello@churvox.com");
    setNotice("Copied hello@churvox.com");
  }

  return (
    <div className="chx">
      <header className="chx-top">
        <button className="chx-brand" type="button" onClick={() => openView("home")}>
          <img src="/churvox-operator-mark.svg" alt="" />
          <span>
            <strong>CHURVOX</strong>
            <small>COMMAND HOUSE</small>
          </span>
        </button>

        <nav className="chx-nav">
          <button onClick={() => openView("home")}>Home</button>
          <button onClick={() => openView("how")}>How</button>
          <button onClick={() => openView("features")}>Features</button>
          <button onClick={() => openView("plans")}>Plans</button>
          <button onClick={() => openView("contact")}>Contact</button>
          <button className="login" onClick={() => routeTo("/login")}>Login</button>
        </nav>
      </header>

      {view === "home" && (
        <main className="chx-home">
          <section className="chx-hero">
            <div className="chx-hero-copy">
              <p className="chx-kicker">ONE PLACE TO RUN THE MOVES</p>
              <h1>Drop the work in. Churvox turns it into the next business move.</h1>
              <p className="chx-sub">
                Jobs, crew updates, quotes, invoices, photos, time, reminders, and approvals stop living in separate places.
                Churvox pulls them into one command house so the owner only has to clear what matters.
              </p>

              <div className="chx-dropzone">
                <span>Business input</span>
                <strong>“Job finished. Photos uploaded. Customer needs invoice.”</strong>
                <em>Churvox builds: invoice draft → evidence → message → owner approval.</em>
              </div>

              <div className="chx-actions">
                <button className="primary" onClick={() => routeTo(authedMode ? "/dashboard" : "/signup")}>
                  {authedMode ? "Open command house" : "Start Churvox"}
                </button>
                <button className="secondary" onClick={() => openView("how")}>See the flow</button>
              </div>
            </div>

            <aside className="chx-power-panel">
              <div className="chx-power-head">
                <span>LIVE COMMAND HOUSE</span>
                <b>Today’s business moves</b>
              </div>

              {moves.map((move) => (
                <button
                  key={move.id}
                  className={move.id === active.id ? `chx-live-move active ${move.accent}` : `chx-live-move ${move.accent}`}
                  onClick={() => {
                    setActiveId(move.id);
                    setNotice(`Loaded: ${move.ownerMove}`);
                  }}
                >
                  <small>{move.type}</small>
                  <strong>{move.ownerMove}</strong>
                  <span>{move.object}</span>
                </button>
              ))}
            </aside>
          </section>

          <section className="chx-stage">
            <div className="chx-stage-main">
              <div className="chx-section-title">
                <span>CHURVOX BUILT THIS</span>
                <b>Owner-ready move</b>
              </div>

              <article className={`chx-current ${active.accent}`}>
                <small>{active.type}</small>
                <h2>{active.title}</h2>
                <p>{active.prepared}</p>

                <div className="chx-facts">
                  <div>
                    <span>Object</span>
                    <strong>{active.object}</strong>
                  </div>
                  <div>
                    <span>Owner move</span>
                    <strong>{active.ownerMove}</strong>
                  </div>
                </div>

                <div className="chx-actions">
                  <button className="approve" onClick={clearMove}>Clear move</button>
                  <button className="secondary" onClick={() => setNotice(`Review opened for ${active.ownerMove}`)}>Review first</button>
                </div>
              </article>
            </div>

            <aside className="chx-evidence">
              <div className="chx-section-title">
                <span>WHY IT IS READY</span>
                <b>Evidence</b>
              </div>

              <ul>
                {active.proof.map((item) => <li key={item}>{item}</li>)}
              </ul>

              <div className="chx-note">{notice}</div>
            </aside>

            <section className="chx-cleared">
              <div className="chx-section-title">
                <span>CLEARED BY OWNER</span>
                <b>Final moves</b>
              </div>

              {cleared.length === 0 ? (
                <p>No moves cleared yet. This is where owner approvals land.</p>
              ) : (
                <div className="chx-log">
                  {cleared.map((item, index) => (
                    <div key={`${item.time}-${index}`}>
                      <span>{item.time}</span>
                      <strong>{item.text}</strong>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </section>

          <section className="chx-big-line">
            <div>
              <span>THE POINT</span>
              <h2>You should not need to jump around to know what to do next.</h2>
            </div>
            <div className="chx-stack">
              {["Jobs", "Crew", "Quotes", "Invoices", "Photos", "Time", "Clients", "Approvals"].map((item) => (
                <b key={item}>{item}</b>
              ))}
            </div>
          </section>
        </main>
      )}

      {view === "how" && (
        <main className="chx-page">
          <p className="chx-kicker">HOW IT WORKS</p>
          <h1>The business goes in messy. Churvox returns the next move.</h1>

          <section className="chx-steps">
            <article>
              <span>01</span>
              <h2>Capture work</h2>
              <p>Jobs, notes, photos, time, quotes, invoices, and worker updates all become business inputs.</p>
            </article>
            <article>
              <span>02</span>
              <h2>Churvox prepares</h2>
              <p>The system connects records, evidence, pricing context, customer details, and the next admin action.</p>
            </article>
            <article>
              <span>03</span>
              <h2>Owner clears</h2>
              <p>Nothing important happens blindly. The owner approves final sends, invoices, and key business moves.</p>
            </article>
          </section>
        </main>
      )}

      {view === "features" && (
        <main className="chx-page">
          <p className="chx-kicker">FEATURES</p>
          <h1>The command house for trade and service admin.</h1>

          <section className="chx-feature-grid">
            {features.map(([title, text]) => (
              <article key={title}>
                <h2>{title}</h2>
                <p>{text}</p>
              </article>
            ))}
          </section>
        </main>
      )}

      {view === "plans" && (
        <main className="chx-page">
          <p className="chx-kicker">PRICING</p>
          <h1>Choose the level of command your business needs.</h1>

          <section className="chx-plans">
            {plans.map(([name, price, label, text]) => (
              <article className={name === "Operator" ? "featured" : ""} key={name}>
                <span>{label}</span>
                <h2>{name}</h2>
                <strong>{price}<small>/month + GST</small></strong>
                <p>{text}</p>
                <button onClick={() => routeTo("/signup")}>{name === "Operator" ? "Start Operator" : `Choose ${name}`}</button>
              </article>
            ))}
          </section>

          <div className="chx-wide">
            <b>Command Growth Pack — $99/month + GST</b>
            <span>Add 50 more active team members plus extra job capacity, AI Operator Actions, automation runs, and admin/payroll capacity.</span>
          </div>
        </main>
      )}

      {view === "legal" && (
        <main className="chx-page">
          <p className="chx-kicker">LEGAL / TRUST</p>
          <h1>Approval-first AI business admin.</h1>

          <section className="chx-legal">
            {legal.map(([title, text]) => (
              <article key={title}>
                <h2>{title}</h2>
                <p>{text}</p>
              </article>
            ))}
          </section>
        </main>
      )}

      {view === "contact" && (
        <main className="chx-page chx-contact">
          <p className="chx-kicker">CONTACT</p>
          <h1>Talk to Churvox.</h1>
          <p>For support, sales, billing, setup, security, or account questions.</p>

          <div className="chx-contact-box">
            <span>CONTACT CHANNEL</span>
            <strong>hello@churvox.com</strong>
            <div>
              <button className="approve" onClick={() => { window.location.href = "mailto:hello@churvox.com"; }}>Email now</button>
              <button className="secondary" onClick={copyEmail}>Copy email</button>
            </div>
          </div>
        </main>
      )}

      <footer className="chx-footer">
        <span>© Churvox</span>
        <button onClick={() => openView("legal")}>Privacy / Terms</button>
        <button onClick={() => openView("contact")}>hello@churvox.com</button>
      </footer>
    </div>
  );
}
