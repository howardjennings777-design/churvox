import React, { useMemo, useState } from "react";
import "./ChurvoxAIShell.css";

const coreSignals = [
  {
    id: "intake",
    code: "01",
    label: "WORK IN",
    title: "Work enters once",
    text: "Jobs, notes, photos, time, customer details, quotes, and worker updates land in one command layer.",
    output: "Next action detected",
    accent: "cyan",
    proof: ["Client matched", "Job context built", "Schedule checked", "Admin path opened"],
  },
  {
    id: "ai",
    code: "02",
    label: "AI SORTS",
    title: "Churvox builds the admin",
    text: "The system prepares invoices, quote follow-ups, worker assignment moves, blockers, and evidence packs.",
    output: "Admin move prepared",
    accent: "orange",
    proof: ["Evidence attached", "Message drafted", "Invoice wording staged", "Owner approval required"],
  },
  {
    id: "approve",
    code: "03",
    label: "OWNER CLEARS",
    title: "You approve the move",
    text: "The owner stays in control of final sends, invoice approvals, quote follow-ups, and critical business changes.",
    output: "Ready for approval",
    accent: "green",
    proof: ["Owner review", "Decision logged", "Action protected", "Final move ready"],
  },
  {
    id: "blocker",
    code: "!",
    label: "BLOCKER",
    title: "Missing details get stopped",
    text: "Churvox flags gaps before they become messy admin: no worker, incomplete customer detail, or schedule conflict.",
    output: "Needs owner check",
    accent: "red",
    proof: ["Missing field", "Risk detected", "Action paused", "Owner check required"],
  },
];

const featureBlocks = [
  ["Jobs", "Create, assign, schedule, track, and complete work without losing the admin trail."],
  ["Crew", "Worker notes, photos, time, and completion updates flow into the owner command layer."],
  ["Invoices", "Completed work becomes invoice-ready admin with job context and evidence."],
  ["Quotes", "Open quotes are surfaced with prepared follow-ups before they go cold."],
  ["Clients", "Customer details, history, jobs, and billing context stay connected."],
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
  const [activeId, setActiveId] = useState("ai");
  const [notice, setNotice] = useState("Command Core online. Churvox has prepared the next business move.");
  const [cleared, setCleared] = useState([]);

  const active = useMemo(() => coreSignals.find((item) => item.id === activeId) || coreSignals[1], [activeId]);

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
    setNotice(`Cleared: ${active.output}. Churvox would now run the prepared admin move.`);
  }

  function copyEmail() {
    navigator.clipboard?.writeText("hello@churvox.com");
    setNotice("Copied hello@churvox.com");
  }

  return (
    <div className="core">
      <header className="core-top">
        <button className="core-brand" type="button" onClick={() => openView("home")}>
          <img src="/churvox-operator-mark.svg" alt="" />
          <span>
            <strong>CHURVOX</strong>
            <small>COMMAND CORE</small>
          </span>
        </button>

        <nav className="core-nav">
          <button onClick={() => openView("home")}>Home</button>
          <button onClick={() => openView("how")}>How</button>
          <button onClick={() => openView("features")}>Features</button>
          <button onClick={() => openView("plans")}>Plans</button>
          <button onClick={() => openView("contact")}>Contact</button>
          <button className="login" onClick={() => routeTo("/login")}>Login</button>
        </nav>
      </header>

      {view === "home" && (
        <main className="core-home">
          <section className="core-hero">
            <div className="core-copy">
              <p className="core-kicker">WORK IN / AI SORTS / OWNER CLEARS</p>
              <h1>Your business runs from one command core.</h1>
              <p className="core-sub">
                Churvox pulls jobs, crew updates, photos, time, quotes, invoices, clients, blockers, and approvals into one operating layer.
                You see what needs doing next, why it is ready, and what needs approval.
              </p>

              <div className="core-intake">
                <span>LIVE INPUT</span>
                <strong>Worker finished job • photos uploaded • invoice needed</strong>
                <em>Churvox prepares invoice move, evidence, customer message, and approval log.</em>
              </div>

              <div className="core-actions">
                <button className="primary" onClick={() => routeTo(authedMode ? "/dashboard" : "/signup")}>
                  {authedMode ? "Open Command Core" : "Start Churvox"}
                </button>
                <button className="secondary" onClick={() => openView("how")}>See the flow</button>
              </div>
            </div>

            <aside className="core-orbital">
              <div className="core-orb">
                <div className="ring ring-one" />
                <div className="ring ring-two" />
                <div className="orb-center">
                  <span>AI</span>
                  <strong>CORE</strong>
                </div>
              </div>

              <div className="core-signal-list">
                {coreSignals.map((item) => (
                  <button
                    key={item.id}
                    className={item.id === active.id ? `signal active ${item.accent}` : `signal ${item.accent}`}
                    onClick={() => {
                      setActiveId(item.id);
                      setNotice(`Loaded: ${item.output}`);
                    }}
                  >
                    <small>{item.code}</small>
                    <b>{item.label}</b>
                    <span>{item.output}</span>
                  </button>
                ))}
              </div>
            </aside>
          </section>

          <section className="core-flow">
            <div className="flow-node">
              <span>01</span>
              <h2>Work comes in</h2>
              <p>Jobs, notes, photos, time, worker updates, quotes, invoices, and customers enter Churvox once.</p>
            </div>
            <div className="flow-node hot">
              <span>02</span>
              <h2>Churvox sorts it</h2>
              <p>AI prepares the next admin move, connects the evidence, and catches blockers before they waste your time.</p>
            </div>
            <div className="flow-node">
              <span>03</span>
              <h2>Owner approves</h2>
              <p>You clear the final move. Churvox does not blindly send, invoice, or change key business records.</p>
            </div>
          </section>

          <section className="core-console">
            <div className="core-active">
              <div className="section-head">
                <span>ACTIVE SIGNAL</span>
                <b>{active.label}</b>
              </div>

              <article className={`active-move ${active.accent}`}>
                <small>{active.label}</small>
                <h2>{active.title}</h2>
                <p>{active.text}</p>

                <div className="result-box">
                  <span>Prepared owner move</span>
                  <strong>{active.output}</strong>
                </div>

                <div className="core-actions">
                  <button className="approve" onClick={clearMove}>
                    {active.accent === "red" ? "Open blocker" : "Clear move"}
                  </button>
                  <button className="secondary" onClick={() => setNotice(`Review opened for ${active.output}`)}>Review first</button>
                </div>
              </article>
            </div>

            <aside className="core-evidence">
              <div className="section-head">
                <span>EVIDENCE</span>
                <b>Why it is ready</b>
              </div>

              <ul>
                {active.proof.map((item) => <li key={item}>{item}</li>)}
              </ul>

              <div className="core-note">{notice}</div>
            </aside>

            <section className="core-log">
              <div className="section-head">
                <span>APPROVAL LOG</span>
                <b>Owner-cleared moves</b>
              </div>

              {cleared.length === 0 ? (
                <p>No cleared moves yet. Owner approvals appear here.</p>
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

          <section className="core-statement">
            <div>
              <p className="core-kicker">THE POINT</p>
              <h2>No more hunting through the business to know what needs doing next.</h2>
            </div>
            <div className="core-tags">
              {["Jobs", "Crew", "Photos", "Time", "Quotes", "Invoices", "Clients", "Approvals"].map((item) => <b key={item}>{item}</b>)}
            </div>
          </section>
        </main>
      )}

      {view === "how" && (
        <main className="core-page">
          <p className="core-kicker">HOW IT WORKS</p>
          <h1>Churvox turns business activity into owner-ready moves.</h1>

          <section className="core-steps">
            <article>
              <span>01</span>
              <h2>Work enters</h2>
              <p>Jobs, photos, notes, time, quotes, customer updates, and worker actions enter the command core.</p>
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
        <main className="core-page">
          <p className="core-kicker">FEATURES</p>
          <h1>One AI command layer for trade and service businesses.</h1>

          <section className="core-feature-grid">
            {featureBlocks.map(([title, text]) => (
              <article key={title}>
                <h2>{title}</h2>
                <p>{text}</p>
              </article>
            ))}
          </section>
        </main>
      )}

      {view === "plans" && (
        <main className="core-page">
          <p className="core-kicker">PRICING</p>
          <h1>Choose how much admin you want Churvox to prepare.</h1>

          <section className="core-plans">
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

          <div className="wide-note">
            <b>Command Growth Pack — $99/month + GST</b>
            <span>Add 50 more active team members plus extra job capacity, AI Operator Actions, automation runs, and admin/payroll capacity.</span>
          </div>
        </main>
      )}

      {view === "legal" && (
        <main className="core-page">
          <p className="core-kicker">LEGAL / TRUST</p>
          <h1>Approval-first AI business admin.</h1>

          <section className="core-legal">
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
        <main className="core-page core-contact">
          <p className="core-kicker">CONTACT</p>
          <h1>Talk to Churvox.</h1>
          <p>For support, sales, billing, setup, security, or account questions.</p>

          <div className="contact-box">
            <span>CONTACT CHANNEL</span>
            <strong>hello@churvox.com</strong>
            <div>
              <button className="approve" onClick={() => { window.location.href = "mailto:hello@churvox.com"; }}>Email now</button>
              <button className="secondary" onClick={copyEmail}>Copy email</button>
            </div>
          </div>
        </main>
      )}

      <footer className="core-footer">
        <span>© Churvox</span>
        <button onClick={() => openView("legal")}>Privacy / Terms</button>
        <button onClick={() => openView("contact")}>hello@churvox.com</button>
      </footer>
    </div>
  );
}
