import React, { useMemo, useState } from "react";
import "./ChurvoxAIShell.css";

const signals = [
  {
    id: "intake",
    tag: "WORK INTAKE",
    title: "New work lands",
    detail: "A job, note, photo, customer message, quote, or worker update enters Churvox once.",
    ai: "Client matched • address checked • schedule scanned • next action detected",
    owner: "Crew assignment ready",
    color: "cyan",
    proof: ["Client record found", "Job context built", "Schedule checked", "Action prepared"],
  },
  {
    id: "invoice",
    tag: "AI PREPARED",
    title: "Admin gets built",
    detail: "Churvox turns completed work, time, photos, job notes, and customer details into admin that is ready to review.",
    ai: "Invoice wording • evidence pack • customer email • approval move",
    owner: "Invoice ready to approve",
    color: "orange",
    proof: ["Work completed", "Evidence attached", "Amount prepared", "Owner approval required"],
  },
  {
    id: "blocker",
    tag: "BLOCKER FOUND",
    title: "Problems get surfaced",
    detail: "Missing crew, schedule clashes, incomplete customer details, and admin risks are pulled forward before they become chaos.",
    ai: "Missing detail • risk flagged • owner review • safe stop",
    owner: "Fix blocker",
    color: "red",
    proof: ["Missing field found", "Conflict checked", "Risk highlighted", "Action stopped"],
  },
  {
    id: "approved",
    tag: "OWNER CONTROL",
    title: "You clear the final move",
    detail: "AI prepares the admin, but the owner stays in control of final sends, invoices, quote follow-ups, and key changes.",
    ai: "Final check • approval log • action cleared • record updated",
    owner: "Move approved",
    color: "green",
    proof: ["Owner reviewed", "Decision saved", "Action logged", "Admin cleared"],
  },
];

const features = [
  ["Command Desk", "One place for jobs, quotes, invoices, workers, clients, evidence, blockers, and approvals."],
  ["AI Operator Actions", "Churvox prepares admin moves from real work activity instead of leaving you to chase it manually."],
  ["Worker Evidence", "Photos, notes, time, and status updates feed the owner’s admin queue."],
  ["Invoice Prep", "Completed work can become a draft invoice move with context and evidence attached."],
  ["Quote Follow-ups", "Open quotes get surfaced with a drafted follow-up before the opportunity goes cold."],
  ["Approval Control", "AI can prepare the move, but the owner clears the final action."],
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
  const [activeId, setActiveId] = useState("invoice");
  const [notice, setNotice] = useState("System ready. Churvox prepared the next business move for owner approval.");
  const [cleared, setCleared] = useState([]);

  const active = useMemo(() => signals.find((signal) => signal.id === activeId) || signals[1], [activeId]);

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
    if (active.color === "red") {
      setNotice("Blocker opened. Owner needs to fix the missing detail before Churvox clears the move.");
      return;
    }

    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setCleared((items) => [{ time, text: active.owner }, ...items].slice(0, 4));
    setNotice(`Cleared: ${active.owner}. Churvox would now complete that prepared business action.`);
  }

  function copyEmail() {
    navigator.clipboard?.writeText("hello@churvox.com");
    setNotice("Copied hello@churvox.com");
  }

  return (
    <div className="sys">
      <header className="sys-top">
        <button className="sys-brand" type="button" onClick={() => openView("home")}>
          <img src="/churvox-operator-mark.svg" alt="" />
          <span>
            <strong>CHURVOX</strong>
            <small>AI BUSINESS COMMAND SYSTEM</small>
          </span>
        </button>

        <nav className="sys-nav">
          <button onClick={() => openView("home")}>Home</button>
          <button onClick={() => openView("how")}>How it works</button>
          <button onClick={() => openView("features")}>Features</button>
          <button onClick={() => openView("plans")}>Plans</button>
          <button onClick={() => openView("contact")}>Contact</button>
          <button className="login" onClick={() => routeTo("/login")}>Login</button>
        </nav>
      </header>

      {view === "home" && (
        <main className="sys-home">
          <section className="sys-hero">
            <div className="sys-hero-main">
              <p className="sys-kicker">WORK IN → AI SORTS → OWNER CLEARS</p>
              <h1>The AI command system for running trade admin from one place.</h1>
              <p className="sys-sub">
                Churvox pulls jobs, crew updates, photos, time, quotes, invoices, clients, blockers, and approvals into one control layer.
                You do not need to jump around to sort the business out.
              </p>

              <div className="sys-input">
                <span>Live business input</span>
                <strong>Worker finished job • photos uploaded • invoice needed</strong>
                <em>Churvox prepares: invoice move, evidence, customer message, approval log.</em>
              </div>

              <div className="sys-actions">
                <button className="primary" onClick={() => routeTo(authedMode ? "/dashboard" : "/signup")}>
                  {authedMode ? "Open command system" : "Start Churvox"}
                </button>
                <button className="secondary" onClick={() => openView("how")}>See the system</button>
              </div>
            </div>

            <aside className="sys-core">
              <div className="sys-core-head">
                <span>CONTROL LAYER</span>
                <strong>Today’s operating signals</strong>
              </div>

              {signals.map((signal) => (
                <button
                  key={signal.id}
                  className={signal.id === active.id ? `sys-signal active ${signal.color}` : `sys-signal ${signal.color}`}
                  onClick={() => {
                    setActiveId(signal.id);
                    setNotice(`Loaded signal: ${signal.owner}`);
                  }}
                >
                  <small>{signal.tag}</small>
                  <b>{signal.owner}</b>
                  <em>{signal.title}</em>
                </button>
              ))}
            </aside>
          </section>

          <section className="sys-map">
            <div className="sys-column">
              <div className="sys-label">01 / WORK IN</div>
              <h2>Everything enters one system.</h2>
              <p>Jobs, notes, photos, worker updates, quotes, time, clients, invoices, and blockers stop living in separate places.</p>
            </div>

            <div className="sys-column middle">
              <div className="sys-label">02 / CHURVOX SORTS</div>
              <h2>AI prepares the admin move.</h2>
              <p>{active.ai}</p>
            </div>

            <div className="sys-column">
              <div className="sys-label">03 / OWNER CLEARS</div>
              <h2>{active.owner}</h2>
              <p>{active.detail}</p>
            </div>
          </section>

          <section className="sys-desk">
            <div className="sys-prepared">
              <div className="sys-section-title">
                <span>ACTIVE SIGNAL</span>
                <b>{active.tag}</b>
              </div>

              <article className={`sys-move ${active.color}`}>
                <small>{active.tag}</small>
                <h2>{active.title}</h2>
                <p>{active.detail}</p>

                <div className="sys-result">
                  <span>Prepared owner move</span>
                  <strong>{active.owner}</strong>
                </div>

                <div className="sys-actions">
                  <button className="approve" onClick={clearMove}>
                    {active.color === "red" ? "Open blocker" : "Clear move"}
                  </button>
                  <button className="secondary" onClick={() => setNotice(`Review opened for ${active.owner}`)}>Review first</button>
                </div>
              </article>
            </div>

            <aside className="sys-evidence">
              <div className="sys-section-title">
                <span>EVIDENCE</span>
                <b>Why it is ready</b>
              </div>

              <ul>
                {active.proof.map((item) => <li key={item}>{item}</li>)}
              </ul>

              <div className="sys-note">{notice}</div>
            </aside>

            <section className="sys-cleared">
              <div className="sys-section-title">
                <span>APPROVAL LOG</span>
                <b>Owner-cleared moves</b>
              </div>

              {cleared.length === 0 ? (
                <p>No owner-cleared moves yet. They appear here as the business gets sorted.</p>
              ) : (
                <div className="sys-log">
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

          <section className="sys-line">
            <div>
              <p className="sys-kicker">THE POINT</p>
              <h2>No more guessing what needs doing next.</h2>
            </div>
            <div className="sys-tags">
              {["Jobs", "Crew", "Photos", "Time", "Quotes", "Invoices", "Clients", "Approvals"].map((item) => (
                <b key={item}>{item}</b>
              ))}
            </div>
          </section>
        </main>
      )}

      {view === "how" && (
        <main className="sys-page">
          <p className="sys-kicker">HOW IT WORKS</p>
          <h1>Churvox turns business activity into owner-ready moves.</h1>

          <section className="sys-steps">
            <article>
              <span>01</span>
              <h2>Work enters</h2>
              <p>Jobs, notes, photos, time, quotes, customer updates, and worker actions enter one business system.</p>
            </article>
            <article>
              <span>02</span>
              <h2>AI sorts</h2>
              <p>Churvox connects records, checks what is missing, prepares admin, and stages the next action.</p>
            </article>
            <article>
              <span>03</span>
              <h2>Owner clears</h2>
              <p>The owner approves final sends, invoices, follow-ups, assignments, and important changes.</p>
            </article>
          </section>
        </main>
      )}

      {view === "features" && (
        <main className="sys-page">
          <p className="sys-kicker">FEATURES</p>
          <h1>One AI command layer for trade and service businesses.</h1>

          <section className="sys-feature-grid">
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
        <main className="sys-page">
          <p className="sys-kicker">PRICING</p>
          <h1>Choose how much admin you want Churvox to prepare.</h1>

          <section className="sys-plans">
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

          <div className="sys-wide">
            <b>Command Growth Pack — $99/month + GST</b>
            <span>Add 50 more active team members plus extra job capacity, AI Operator Actions, automation runs, and admin/payroll capacity.</span>
          </div>
        </main>
      )}

      {view === "legal" && (
        <main className="sys-page">
          <p className="sys-kicker">LEGAL / TRUST</p>
          <h1>Approval-first AI business admin.</h1>

          <section className="sys-legal">
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
        <main className="sys-page sys-contact">
          <p className="sys-kicker">CONTACT</p>
          <h1>Talk to Churvox.</h1>
          <p>For support, sales, billing, setup, security, or account questions.</p>

          <div className="sys-contact-box">
            <span>CONTACT CHANNEL</span>
            <strong>hello@churvox.com</strong>
            <div>
              <button className="approve" onClick={() => { window.location.href = "mailto:hello@churvox.com"; }}>Email now</button>
              <button className="secondary" onClick={copyEmail}>Copy email</button>
            </div>
          </div>
        </main>
      )}

      <footer className="sys-footer">
        <span>© Churvox</span>
        <button onClick={() => openView("legal")}>Privacy / Terms</button>
        <button onClick={() => openView("contact")}>hello@churvox.com</button>
      </footer>
    </div>
  );
}
