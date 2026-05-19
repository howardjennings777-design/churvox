import React, { useMemo, useState } from "react";
import "./ChurvoxAIShell.css";

const signals = [
  {
    id: "work",
    tag: "WORK RADAR",
    title: "Work enters once",
    short: "New work detected",
    text: "Jobs, notes, photos, time, quotes, customers, and worker updates enter one command layer instead of getting scattered.",
    prepared: "Job file + next action ready",
    colour: "sky",
    proof: ["Client context built", "Job details captured", "Schedule checked", "Next action detected"],
  },
  {
    id: "ai",
    tag: "AI ENGINE",
    title: "Churvox builds the admin",
    short: "Admin move prepared",
    text: "Churvox turns field activity into invoice drafts, quote follow-ups, worker assignment moves, evidence packs, and blocker alerts.",
    prepared: "Invoice / quote / assignment move staged",
    colour: "amber",
    proof: ["Evidence attached", "Message drafted", "Invoice wording prepared", "Owner approval required"],
  },
  {
    id: "approve",
    tag: "APPROVAL STACK",
    title: "Owner clears the move",
    short: "Ready for approval",
    text: "The owner stays in control of final sends, invoices, quote follow-ups, worker assignment, customer messages, and key business changes.",
    prepared: "Final move ready",
    colour: "mint",
    proof: ["Owner review ready", "Action protected", "Decision logged", "Business record updated"],
  },
  {
    id: "blocker",
    tag: "BLOCKER WATCH",
    title: "Problems surface early",
    short: "Needs owner check",
    text: "Missing workers, incomplete customer records, schedule conflicts, and risky admin gaps get stopped before they waste the day.",
    prepared: "Blocker opened",
    colour: "red",
    proof: ["Missing detail found", "Risk flagged", "Action paused", "Owner check required"],
  },
];

const features = [
  ["AI Command Desk", "See jobs, quotes, invoices, crew updates, blockers, and approvals from one operating layer."],
  ["Job Control", "Create work, assign it, track status, and keep the admin trail connected from start to finish."],
  ["Worker Evidence", "Photos, notes, time, and completion updates feed the owner’s approval stack."],
  ["Invoice Prep", "Completed work can become an invoice-ready move with context and evidence attached."],
  ["Quote Follow-ups", "Open quotes are surfaced with prepared follow-ups before money gets missed."],
  ["Owner Approval", "Churvox prepares the admin. The owner clears the final move."],
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
  const [activeId, setActiveId] = useState("ai");
  const [notice, setNotice] = useState("Mission Control online. Churvox has prepared the next business move.");
  const [cleared, setCleared] = useState([]);

  const active = useMemo(() => signals.find((item) => item.id === activeId) || signals[1], [activeId]);

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
    if (active.colour === "red") {
      setNotice("Blocker opened. Fix the missing detail before Churvox clears this move.");
      return;
    }

    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setCleared((items) => [{ time, text: active.prepared }, ...items].slice(0, 5));
    setNotice(`Cleared: ${active.prepared}. Churvox would now complete that prepared business action.`);
  }

  function copyEmail() {
    navigator.clipboard?.writeText("hello@churvox.com");
    setNotice("Copied hello@churvox.com");
  }

  return (
    <div className="mission">
      <header className="mission-top">
        <button className="mission-brand" type="button" onClick={() => openView("home")}>
          <img src="/churvox-operator-mark.svg" alt="" />
          <span>
            <strong>CHURVOX</strong>
            <small>MISSION CONTROL</small>
          </span>
        </button>

        <nav className="mission-nav">
          <button onClick={() => openView("home")}>Home</button>
          <button onClick={() => openView("how")}>How</button>
          <button onClick={() => openView("features")}>Features</button>
          <button onClick={() => openView("plans")}>Plans</button>
          <button onClick={() => openView("contact")}>Contact</button>
          <button className="login" onClick={() => routeTo("/login")}>Login</button>
        </nav>
      </header>

      {view === "home" && (
        <main className="mission-home">
          <section className="mission-hero">
            <div className="mission-copy">
              <p className="mission-kicker">WORK RADAR / AI ENGINE / OWNER APPROVAL</p>
              <h1>Run the whole business from one control layer.</h1>
              <p className="mission-sub">
                Churvox pulls jobs, crew updates, photos, time, quotes, invoices, clients, blockers, and approvals into one powerful place.
                Work goes in, Churvox sorts the admin, and the owner clears the final move.
              </p>

              <div className="mission-input">
                <span>LIVE BUSINESS INPUT</span>
                <strong>Worker finished work • photos uploaded • invoice needed</strong>
                <em>Churvox prepares invoice move, evidence, customer message, and owner approval.</em>
              </div>

              <div className="mission-actions">
                <button className="primary" onClick={() => routeTo(authedMode ? "/dashboard" : "/signup")}>
                  {authedMode ? "Open Mission Control" : "Start Churvox"}
                </button>
                <button className="secondary" onClick={() => openView("how")}>See the system</button>
              </div>
            </div>

            <aside className="mission-orbit">
              <div className="orbit-visual">
                <div className="orbit-ring one" />
                <div className="orbit-ring two" />
                <div className="orbit-ring three" />
                <div className="orbit-core">
                  <span>AI</span>
                  <strong>CONTROL</strong>
                </div>
              </div>

              <div className="mission-signal-stack">
                {signals.map((item) => (
                  <button
                    key={item.id}
                    className={item.id === active.id ? `mission-signal active ${item.colour}` : `mission-signal ${item.colour}`}
                    onClick={() => {
                      setActiveId(item.id);
                      setNotice(`Loaded: ${item.prepared}`);
                    }}
                  >
                    <small>{item.tag}</small>
                    <b>{item.short}</b>
                    <span>{item.prepared}</span>
                  </button>
                ))}
              </div>
            </aside>
          </section>

          <section className="mission-flow">
            <article>
              <span>01</span>
              <h2>Work comes in</h2>
              <p>Jobs, notes, photos, time, customers, quotes, invoices, and worker updates land once.</p>
            </article>
            <article className="active">
              <span>02</span>
              <h2>Churvox sorts it</h2>
              <p>AI prepares the next admin move, connects the evidence, and catches blockers.</p>
            </article>
            <article>
              <span>03</span>
              <h2>Owner approves</h2>
              <p>You clear sends, invoices, quote follow-ups, worker assignments, and key changes.</p>
            </article>
          </section>

          <section className="mission-console">
            <div className="mission-active">
              <div className="mission-section-head">
                <span>ACTIVE SYSTEM</span>
                <b>{active.tag}</b>
              </div>

              <article className={`mission-move ${active.colour}`}>
                <small>{active.tag}</small>
                <h2>{active.title}</h2>
                <p>{active.text}</p>

                <div className="mission-result">
                  <span>Prepared owner move</span>
                  <strong>{active.prepared}</strong>
                </div>

                <div className="mission-actions">
                  <button className="approve" onClick={clearMove}>
                    {active.colour === "red" ? "Open blocker" : "Clear move"}
                  </button>
                  <button className="secondary dark" onClick={() => setNotice(`Review opened for ${active.prepared}`)}>Review first</button>
                </div>
              </article>
            </div>

            <aside className="mission-evidence">
              <div className="mission-section-head">
                <span>EVIDENCE</span>
                <b>Why it is ready</b>
              </div>

              <ul>
                {active.proof.map((item) => <li key={item}>{item}</li>)}
              </ul>

              <div className="mission-note">{notice}</div>
            </aside>

            <section className="mission-log">
              <div className="mission-section-head">
                <span>APPROVAL LOG</span>
                <b>Owner-cleared moves</b>
              </div>

              {cleared.length === 0 ? (
                <p>No cleared moves yet. Owner approvals appear here as the business gets sorted.</p>
              ) : (
                <div className="log-list">
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

          <section className="mission-banner">
            <div>
              <p className="mission-kicker">THE POINT</p>
              <h2>No more hunting through five screens to know what needs doing next.</h2>
            </div>
            <div className="mission-tags">
              {["Jobs", "Crew", "Photos", "Time", "Quotes", "Invoices", "Clients", "Approvals"].map((item) => <b key={item}>{item}</b>)}
            </div>
          </section>
        </main>
      )}

      {view === "how" && (
        <main className="mission-page">
          <p className="mission-kicker">HOW IT WORKS</p>
          <h1>Churvox turns daily business activity into owner-ready moves.</h1>

          <section className="mission-cards three">
            <article>
              <span>01</span>
              <h2>Capture work</h2>
              <p>Jobs, notes, photos, time, quotes, customer updates, and worker actions enter the control layer.</p>
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
        <main className="mission-page">
          <p className="mission-kicker">FEATURES</p>
          <h1>The AI command layer for trade and service businesses.</h1>

          <section className="mission-cards feature">
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
        <main className="mission-page">
          <p className="mission-kicker">PRICING</p>
          <h1>Choose how much admin you want Churvox to prepare.</h1>

          <section className="mission-plans">
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

          <div className="mission-wide">
            <b>Command Growth Pack — $99/month + GST</b>
            <span>Add 50 more active team members plus extra job capacity, AI Operator Actions, automation runs, and admin/payroll capacity.</span>
          </div>
        </main>
      )}

      {view === "legal" && (
        <main className="mission-page">
          <p className="mission-kicker">LEGAL / TRUST</p>
          <h1>Approval-first AI business admin.</h1>

          <section className="mission-legal">
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
        <main className="mission-page mission-contact">
          <p className="mission-kicker">CONTACT</p>
          <h1>Talk to Churvox.</h1>
          <p>For support, sales, billing, setup, security, or account questions.</p>

          <div className="mission-contact-box">
            <span>CONTACT CHANNEL</span>
            <strong>hello@churvox.com</strong>
            <div>
              <button className="approve" onClick={() => { window.location.href = "mailto:hello@churvox.com"; }}>Email now</button>
              <button className="secondary dark" onClick={copyEmail}>Copy email</button>
            </div>
          </div>
        </main>
      )}

      <footer className="mission-footer">
        <span>© Churvox</span>
        <button onClick={() => openView("legal")}>Privacy / Terms</button>
        <button onClick={() => openView("contact")}>hello@churvox.com</button>
      </footer>
    </div>
  );
}
