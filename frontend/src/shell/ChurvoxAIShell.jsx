import React, { useMemo, useState } from "react";
import "./ChurvoxAIShell.css";

const moves = [
  {
    id: "job",
    step: "WORK IN",
    title: "New work enters",
    line: "A job, quote, worker note, photo, or client request lands once.",
    output: "Job file ready",
    accent: "cyan",
    evidence: ["Client matched", "Address saved", "Schedule window checked", "Next action detected"],
  },
  {
    id: "sort",
    step: "AI SORTS",
    title: "Churvox builds the admin",
    line: "The system prepares the invoice, follow-up, assignment, evidence, or blocker.",
    output: "Admin move prepared",
    accent: "orange",
    evidence: ["Job context connected", "Evidence attached", "Message drafted", "Owner approval required"],
  },
  {
    id: "approve",
    step: "OWNER APPROVES",
    title: "You clear the move",
    line: "The owner stays in control of final sends, invoices, assignments, and changes.",
    output: "Ready to approve",
    accent: "green",
    evidence: ["Owner review ready", "Decision logged", "Action protected", "Record updated"],
  },
  {
    id: "block",
    step: "BLOCKER",
    title: "Problems get stopped",
    line: "Missing crew, incomplete client details, or schedule clashes are surfaced before they cost time.",
    output: "Needs owner check",
    accent: "red",
    evidence: ["Missing detail found", "Risk flagged", "Action paused", "Owner check needed"],
  },
];

const features = [
  ["Jobs", "Create, assign, schedule, track, and complete work without losing the admin trail."],
  ["Crew", "Worker notes, photos, time, and status updates flow into the owner command desk."],
  ["Invoices", "Completed work becomes an invoice-ready move with evidence attached."],
  ["Quotes", "Open quotes are surfaced with prepared follow-ups before they go cold."],
  ["Clients", "Customer records, job history, billing context, and contact details stay connected."],
  ["Approvals", "Churvox prepares the business move. The owner clears the final action."],
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
  const [activeId, setActiveId] = useState("sort");
  const [notice, setNotice] = useState("Churvox has forged the next admin move. Owner approval stays final.");
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
    if (active.accent === "red") {
      setNotice("Blocker opened. Fix the missing detail before Churvox clears this move.");
      return;
    }

    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setCleared((items) => [{ time, text: active.output }, ...items].slice(0, 4));
    setNotice(`Cleared: ${active.output}. Churvox would now complete that prepared business action.`);
  }

  function copyEmail() {
    navigator.clipboard?.writeText("hello@churvox.com");
    setNotice("Copied hello@churvox.com");
  }

  return (
    <div className="forge">
      <header className="forge-top">
        <button className="forge-brand" type="button" onClick={() => openView("home")}>
          <img src="/churvox-operator-mark.svg" alt="" />
          <span>
            <strong>CHURVOX</strong>
            <small>COMMAND FORGE</small>
          </span>
        </button>

        <nav className="forge-nav">
          <button onClick={() => openView("home")}>Home</button>
          <button onClick={() => openView("how")}>How</button>
          <button onClick={() => openView("features")}>Features</button>
          <button onClick={() => openView("plans")}>Plans</button>
          <button onClick={() => openView("contact")}>Contact</button>
          <button className="login" onClick={() => routeTo("/login")}>Login</button>
        </nav>
      </header>

      {view === "home" && (
        <main className="forge-home">
          <section className="forge-hero">
            <div className="forge-hero-left">
              <p className="forge-kicker">WORK IN / AI SORTS / OWNER APPROVES</p>
              <h1>Your business sorted from one command desk.</h1>
              <p className="forge-sub">
                Churvox takes jobs, crew updates, photos, time, quotes, invoices, clients, blockers, and approvals
                and forges them into the next clear business move.
              </p>

              <div className="forge-input">
                <span>LIVE WORK INPUT</span>
                <strong>Worker finished job • photos uploaded • invoice needed</strong>
                <em>Churvox prepares: invoice move, evidence, customer message, approval log.</em>
              </div>

              <div className="forge-actions">
                <button className="primary" onClick={() => routeTo(authedMode ? "/dashboard" : "/signup")}>
                  {authedMode ? "Open command desk" : "Start Churvox"}
                </button>
                <button className="secondary" onClick={() => openView("how")}>See how it works</button>
              </div>
            </div>

            <aside className="forge-hero-right">
              <div className="forge-core-title">
                <span>COMMAND CORE</span>
                <strong>Today’s prepared moves</strong>
              </div>

              {moves.map((move) => (
                <button
                  key={move.id}
                  className={move.id === active.id ? `forge-signal active ${move.accent}` : `forge-signal ${move.accent}`}
                  onClick={() => {
                    setActiveId(move.id);
                    setNotice(`Loaded: ${move.output}`);
                  }}
                >
                  <small>{move.step}</small>
                  <b>{move.output}</b>
                  <em>{move.title}</em>
                </button>
              ))}
            </aside>
          </section>

          <section className="forge-flow">
            <div>
              <span>01</span>
              <h2>Work comes in</h2>
              <p>Jobs, notes, photos, worker updates, quotes, invoices, and customer requests enter once.</p>
            </div>
            <div className="hot">
              <span>02</span>
              <h2>Churvox sorts it</h2>
              <p>AI prepares the admin, connects evidence, stages owner moves, and catches blockers.</p>
            </div>
            <div>
              <span>03</span>
              <h2>Owner approves</h2>
              <p>You clear invoices, sends, assignments, follow-ups, and important business changes.</p>
            </div>
          </section>

          <section className="forge-desk">
            <div className="forge-active">
              <div className="forge-section-head">
                <span>ACTIVE MOVE</span>
                <b>{active.step}</b>
              </div>

              <article className={`forge-move ${active.accent}`}>
                <small>{active.step}</small>
                <h2>{active.title}</h2>
                <p>{active.line}</p>

                <div className="forge-output">
                  <span>Prepared owner move</span>
                  <strong>{active.output}</strong>
                </div>

                <div className="forge-actions">
                  <button className="approve" onClick={clearMove}>
                    {active.accent === "red" ? "Open blocker" : "Approve move"}
                  </button>
                  <button className="secondary" onClick={() => setNotice(`Review opened for ${active.output}`)}>Review first</button>
                </div>
              </article>
            </div>

            <aside className="forge-proof">
              <div className="forge-section-head">
                <span>EVIDENCE</span>
                <b>Why it is ready</b>
              </div>

              <ul>
                {active.evidence.map((item) => <li key={item}>{item}</li>)}
              </ul>

              <div className="forge-note">{notice}</div>
            </aside>

            <section className="forge-log">
              <div className="forge-section-head">
                <span>APPROVAL LOG</span>
                <b>Owner-cleared moves</b>
              </div>

              {cleared.length === 0 ? (
                <p>No approvals cleared yet. Owner decisions appear here.</p>
              ) : (
                <div className="forge-log-list">
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

          <section className="forge-statement">
            <div>
              <p className="forge-kicker">THE POINT</p>
              <h2>You should not need five screens open to know what needs doing next.</h2>
            </div>
            <div className="forge-tags">
              {["Jobs", "Crew", "Photos", "Time", "Quotes", "Invoices", "Clients", "Approvals"].map((item) => <b key={item}>{item}</b>)}
            </div>
          </section>
        </main>
      )}

      {view === "how" && (
        <main className="forge-page">
          <p className="forge-kicker">HOW IT WORKS</p>
          <h1>Work enters messy. Churvox returns the next move.</h1>

          <section className="forge-cards three">
            <article>
              <span>01</span>
              <h2>Capture work</h2>
              <p>Jobs, notes, photos, time, quotes, customer updates, and worker actions enter the desk.</p>
            </article>
            <article>
              <span>02</span>
              <h2>AI prepares</h2>
              <p>Churvox connects records, builds admin, catches blockers, and stages the next move.</p>
            </article>
            <article>
              <span>03</span>
              <h2>Owner clears</h2>
              <p>The owner approves sends, invoices, assignments, quote follow-ups, and important changes.</p>
            </article>
          </section>
        </main>
      )}

      {view === "features" && (
        <main className="forge-page">
          <p className="forge-kicker">FEATURES</p>
          <h1>The command desk for trade and service admin.</h1>

          <section className="forge-cards feature">
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
        <main className="forge-page">
          <p className="forge-kicker">PRICING</p>
          <h1>Choose how much admin you want Churvox to prepare.</h1>

          <section className="forge-plans">
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

          <div className="forge-wide">
            <b>Command Growth Pack — $99/month + GST</b>
            <span>Add 50 more active team members plus extra job capacity, AI Operator Actions, automation runs, and admin/payroll capacity.</span>
          </div>
        </main>
      )}

      {view === "legal" && (
        <main className="forge-page">
          <p className="forge-kicker">LEGAL / TRUST</p>
          <h1>Approval-first AI business admin.</h1>

          <section className="forge-legal">
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
        <main className="forge-page forge-contact">
          <p className="forge-kicker">CONTACT</p>
          <h1>Talk to Churvox.</h1>
          <p>For support, sales, billing, setup, security, or account questions.</p>

          <div className="forge-contact-box">
            <span>CONTACT CHANNEL</span>
            <strong>hello@churvox.com</strong>
            <div>
              <button className="approve" onClick={() => { window.location.href = "mailto:hello@churvox.com"; }}>Email now</button>
              <button className="secondary" onClick={copyEmail}>Copy email</button>
            </div>
          </div>
        </main>
      )}

      <footer className="forge-footer">
        <span>© Churvox</span>
        <button onClick={() => openView("legal")}>Privacy / Terms</button>
        <button onClick={() => openView("contact")}>hello@churvox.com</button>
      </footer>
    </div>
  );
}
