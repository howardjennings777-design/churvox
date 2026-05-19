import React, { useMemo, useState } from "react";
import "./ChurvoxAIShell.css";

const moves = [
  {
    id: "job",
    type: "New job",
    title: "Book it once. Churvox starts the admin.",
    client: "Northside Lawns",
    prepared: "Worker suggestion, schedule warning, customer record, job file",
    action: "Assign worker",
    accent: "blue",
    proof: ["Client matched", "Address saved", "Schedule checked", "Worker suggestion ready"],
  },
  {
    id: "invoice",
    type: "Finished work",
    title: "Worker completes the job. Invoice is already shaped.",
    client: "ECB Property Maintenance",
    prepared: "Invoice wording, job evidence, photos, time, customer email",
    action: "$430 invoice ready",
    accent: "coral",
    proof: ["Job completed", "Photo attached", "Time captured", "Invoice text prepared"],
  },
  {
    id: "quote",
    type: "Open quote",
    title: "A quote goes quiet. Churvox prepares the chase-up.",
    client: "Rental Owner Group",
    prepared: "Follow-up message, quote link, customer context, owner approval",
    action: "Send follow-up",
    accent: "teal",
    proof: ["Quote still open", "No reply yet", "Message drafted", "Customer contact ready"],
  },
];

const features = [
  ["Jobs", "Create, schedule, assign, track, and complete work without losing the admin trail."],
  ["Workers", "Field notes, job photos, time, and updates flow back into the owner’s desk."],
  ["Invoices", "Turn completed work into draft invoices that the owner can approve."],
  ["Quotes", "Prepare quotes and follow-ups before opportunities go cold."],
  ["Clients", "Keep customer details, job history, and billing context together."],
  ["Approvals", "AI prepares the move. The owner stays in control of final sends and changes."],
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
  const [notice, setNotice] = useState("Churvox has prepared the next admin move. Owner approval stays final.");
  const [approved, setApproved] = useState([]);

  const active = useMemo(() => moves.find((item) => item.id === activeId) || moves[1], [activeId]);

  function openView(nextView) {
    setView(nextView);

    const pathMap = {
      home: authedMode ? "/dashboard" : "/",
      how: "/how-it-works",
      features: "/features",
      plans: "/plans",
      legal: "/legal",
      contact: "/contact",
    };

    const nextPath = pathMap[nextView] || "/";
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, "", nextPath);
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function approveMove() {
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setApproved((items) => [{ time, text: `${active.action} cleared for ${active.client}` }, ...items].slice(0, 4));
    setNotice(`Approved: ${active.action}. Churvox would now complete that prepared admin move.`);
  }

  function copyEmail() {
    navigator.clipboard?.writeText("hello@churvox.com");
    setNotice("Copied hello@churvox.com");
  }

  return (
    <div className="cxsite">
      <header className="cxsite-top">
        <button className="cxsite-brand" type="button" onClick={() => openView("home")}>
          <img src="/churvox-operator-mark.svg" alt="" />
          <span>
            <strong>CHURVOX</strong>
            <small>ONE DESK FOR THE BUSINESS</small>
          </span>
        </button>

        <nav className="cxsite-nav">
          <button onClick={() => openView("home")}>Home</button>
          <button onClick={() => openView("how")}>How it works</button>
          <button onClick={() => openView("features")}>Features</button>
          <button onClick={() => openView("plans")}>Plans</button>
          <button onClick={() => openView("contact")}>Contact</button>
          <button className="cxsite-login" onClick={() => routeTo("/login")}>Login</button>
        </nav>
      </header>

      {view === "home" && (
        <main className="cxsite-home">
          <section className="cxsite-hero">
            <div className="cxsite-hero-copy">
              <p className="cxsite-kicker">WORK GOES IN. CHURVOX SORTS THE ADMIN. YOU APPROVE.</p>
              <h1>One place to run the business without chasing every piece.</h1>
              <p className="cxsite-sub">
                Churvox brings jobs, workers, quotes, invoices, photos, time, customers, and approvals into one clear desk.
                The next move is prepared for you before the admin gets messy.
              </p>

              <div className="cxsite-input-strip">
                <span>Example work input</span>
                <strong>“Worker finished the hedge job and uploaded photos.”</strong>
                <em>Churvox prepares invoice draft, customer update, job record, evidence, and owner approval.</em>
              </div>

              <div className="cxsite-actions">
                <button className="cxsite-primary" onClick={() => routeTo(authedMode ? "/dashboard" : "/signup")}>
                  {authedMode ? "Open my desk" : "Start Churvox"}
                </button>
                <button className="cxsite-secondary" onClick={() => openView("how")}>See how it works</button>
              </div>
            </div>

            <aside className="cxsite-command-desk">
              <div className="cxsite-desk-head">
                <span>Today’s desk</span>
                <b>Prepared by Churvox</b>
              </div>

              {moves.map((item) => (
                <button
                  key={item.id}
                  className={item.id === active.id ? `cxsite-desk-row active ${item.accent}` : `cxsite-desk-row ${item.accent}`}
                  onClick={() => {
                    setActiveId(item.id);
                    setNotice(`Loaded: ${item.action}`);
                  }}
                >
                  <small>{item.type}</small>
                  <strong>{item.action}</strong>
                  <span>{item.client}</span>
                </button>
              ))}
            </aside>
          </section>

          <section className="cxsite-workbench">
            <div className="cxsite-prepared">
              <div className="cxsite-panel-heading">
                <span>CHURVOX PREPARED</span>
                <b>The next owner move</b>
              </div>

              <article className={`cxsite-move ${active.accent}`}>
                <small>{active.type}</small>
                <h2>{active.title}</h2>
                <p>{active.prepared}</p>

                <div className="cxsite-facts">
                  <div>
                    <span>Client</span>
                    <strong>{active.client}</strong>
                  </div>
                  <div>
                    <span>Owner move</span>
                    <strong>{active.action}</strong>
                  </div>
                </div>

                <div className="cxsite-actions">
                  <button className="cxsite-approve" onClick={approveMove}>Approve move</button>
                  <button className="cxsite-secondary" onClick={() => setNotice(`Review opened for ${active.action}`)}>Review first</button>
                </div>
              </article>
            </div>

            <aside className="cxsite-proof">
              <div className="cxsite-panel-heading">
                <span>WHY IT IS READY</span>
                <b>Evidence</b>
              </div>

              <ul>
                {active.proof.map((item) => <li key={item}>{item}</li>)}
              </ul>

              <div className="cxsite-note">{notice}</div>
            </aside>

            <section className="cxsite-approved">
              <div className="cxsite-panel-heading">
                <span>OWNER APPROVALS</span>
                <b>Cleared moves</b>
              </div>

              {approved.length === 0 ? (
                <p>No approvals cleared yet. They appear here after owner sign-off.</p>
              ) : (
                <div className="cxsite-log">
                  {approved.map((item, index) => (
                    <div key={`${item.time}-${index}`}>
                      <span>{item.time}</span>
                      <strong>{item.text}</strong>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </section>

          <section className="cxsite-no-jump">
            <div>
              <span>Instead of opening five places</span>
              <h2>The work, admin, evidence, and approval sit together.</h2>
            </div>
            <div className="cxsite-pill-grid">
              {["Jobs", "Workers", "Quotes", "Invoices", "Photos", "Time", "Customers", "Approvals"].map((item) => (
                <b key={item}>{item}</b>
              ))}
            </div>
          </section>
        </main>
      )}

      {view === "how" && (
        <main className="cxsite-page">
          <p className="cxsite-kicker">HOW IT WORKS</p>
          <h1>Churvox turns daily work into prepared admin moves.</h1>

          <section className="cxsite-steps">
            <article>
              <span>01</span>
              <h2>Work comes in</h2>
              <p>Create a job, receive a worker update, finish work, upload photos, or prepare a quote.</p>
            </article>
            <article>
              <span>02</span>
              <h2>Churvox sorts it</h2>
              <p>The system connects the client, job, worker evidence, invoice wording, quote follow-up, and next action.</p>
            </article>
            <article>
              <span>03</span>
              <h2>Owner approves</h2>
              <p>You stay in control. Churvox prepares the move, but the owner clears what actually happens.</p>
            </article>
          </section>
        </main>
      )}

      {view === "features" && (
        <main className="cxsite-page">
          <p className="cxsite-kicker">FEATURES</p>
          <h1>Everything a service business needs, shaped around approval.</h1>

          <section className="cxsite-feature-grid">
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
        <main className="cxsite-page">
          <p className="cxsite-kicker">PRICING</p>
          <h1>Choose how much admin you want Churvox to prepare.</h1>

          <section className="cxsite-plans">
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

          <div className="cxsite-wide">
            <b>Command Growth Pack — $99/month + GST</b>
            <span>Add 50 more active team members plus extra job capacity, AI Operator Actions, automation runs, and admin/payroll capacity.</span>
          </div>
        </main>
      )}

      {view === "legal" && (
        <main className="cxsite-page">
          <p className="cxsite-kicker">LEGAL / TRUST</p>
          <h1>Approval-first AI business admin.</h1>

          <section className="cxsite-legal">
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
        <main className="cxsite-page cxsite-contact">
          <p className="cxsite-kicker">CONTACT</p>
          <h1>Talk to Churvox.</h1>
          <p>For support, sales, billing, setup, security, or account questions.</p>

          <div className="cxsite-contact-box">
            <span>CONTACT CHANNEL</span>
            <strong>hello@churvox.com</strong>
            <div>
              <button className="cxsite-approve" onClick={() => { window.location.href = "mailto:hello@churvox.com"; }}>Email now</button>
              <button className="cxsite-secondary" onClick={copyEmail}>Copy email</button>
            </div>
          </div>
        </main>
      )}

      <footer className="cxsite-footer">
        <span>© Churvox</span>
        <button onClick={() => openView("legal")}>Privacy / Terms</button>
        <button onClick={() => openView("contact")}>hello@churvox.com</button>
      </footer>
    </div>
  );
}
