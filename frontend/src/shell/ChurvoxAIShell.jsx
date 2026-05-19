import React, { useEffect, useMemo, useState } from "react";
import "./ChurvoxAIShell.css";

const pathToView = {
  "/": "home",
  "/dashboard": "home",
  "/app": "home",
  "/how-it-works": "how",
  "/features": "features",
  "/plans": "plans",
  "/legal": "legal",
  "/contact": "contact",
};

const viewToPath = {
  home: "/",
  how: "/how-it-works",
  features: "/features",
  plans: "/plans",
  legal: "/legal",
  contact: "/contact",
};

const moves = [
  {
    id: "job",
    label: "01 / WORK IN",
    title: "New work arrives",
    body: "Jobs, photos, notes, time, quotes, clients and worker updates enter one place.",
    output: "Job file ready",
    tone: "cyan",
    proof: ["Client matched", "Job context built", "Schedule checked", "Next action found"],
  },
  {
    id: "ai",
    label: "02 / AI SORTS",
    title: "Churvox prepares admin",
    body: "Invoices, quote follow-ups, customer updates, crew moves and blockers get prepared automatically.",
    output: "Admin move prepared",
    tone: "orange",
    proof: ["Evidence attached", "Invoice wording drafted", "Message staged", "Owner approval required"],
  },
  {
    id: "owner",
    label: "03 / OWNER APPROVES",
    title: "You clear the move",
    body: "The owner stays in control of final sends, invoices, follow-ups, assignments and key changes.",
    output: "Ready for approval",
    tone: "green",
    proof: ["Decision ready", "Action protected", "Approval logged", "Record updated"],
  },
  {
    id: "blocker",
    label: "BLOCKER WATCH",
    title: "Problems are stopped early",
    body: "Missing staff, incomplete client details or schedule clashes are surfaced before they waste your day.",
    output: "Needs owner check",
    tone: "red",
    proof: ["Missing detail found", "Conflict flagged", "Action paused", "Owner check needed"],
  },
];

const features = [
  ["AI Command Desk", "One place for jobs, quotes, invoices, workers, photos, blockers and approvals."],
  ["Job Control", "Create, assign, schedule, track and complete work with the admin trail connected."],
  ["Worker Evidence", "Photos, notes, time and completion updates feed the owner approval stack."],
  ["Invoice Prep", "Completed work becomes an invoice-ready move with context and evidence."],
  ["Quote Follow-ups", "Open quotes are surfaced with prepared follow-up moves before they go cold."],
  ["Owner Approval", "Churvox prepares the move. You stay in control of the final action."],
];

const plans = [
  ["Start", "$39", "Solo operator", "Clients, jobs, simple admin queue, and owner approvals."],
  ["Crew", "$89", "Small team", "Worker flow, team assignment, photos, notes, and evidence."],
  ["Operator", "$149", "AI admin engine", "AI Operator Actions, invoice prep, quote follow-ups, and approval queue."],
  ["Command", "$299", "Growing operation", "MYOB included, payroll workspace, advanced roles, and higher capacity."],
];

const legal = [
  ["Privacy Policy", "Churvox stores business, client, job, worker, quote, invoice and approval data so owners can run admin from one place."],
  ["Terms of Service", "Churvox prepares actions, but the owner or authorised user remains responsible for final approval and business decisions."],
  ["Refund / Cancellation Policy", "Subscriptions can be cancelled according to plan terms. Refunds are reviewed based on billing status, availability and usage."],
  ["Data / Security Note", "Churvox is designed around business isolation, role-based access and approval-first AI workflows."],
];

function getViewFromPath() {
  const cleanPath = String(window.location.pathname || "/").replace(/\/+$/, "") || "/";
  return pathToView[cleanPath] || "home";
}

function goTo(path) {
  window.location.href = path;
}

export default function ChurvoxAIShell({ authedMode = false }) {
  const [view, setView] = useState(getViewFromPath);
  const [activeId, setActiveId] = useState("ai");
  const [notice, setNotice] = useState("Churvox has prepared the next admin move.");
  const [cleared, setCleared] = useState([]);

  const active = useMemo(() => moves.find((item) => item.id === activeId) || moves[1], [activeId]);

  useEffect(() => {
    const onPopState = () => setView(getViewFromPath());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function openView(nextView) {
    const nextPath = authedMode && nextView === "home" ? "/dashboard" : viewToPath[nextView] || "/";
    setView(nextView);

    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, "", nextPath);
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function clearMove() {
    if (active.tone === "red") {
      setNotice("Blocker opened. Fix the missing detail before Churvox clears this move.");
      return;
    }

    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setCleared((items) => [{ time, text: active.output }, ...items].slice(0, 4));
    setNotice(`Cleared: ${active.output}. Churvox would now complete that prepared admin action.`);
  }

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText("hello@churvox.com");
      setNotice("Copied hello@churvox.com");
    } catch {
      window.location.href = "mailto:hello@churvox.com";
    }
  }

  function startChurvox(planName = "") {
    const suffix = planName ? `?plan=${encodeURIComponent(planName.toLowerCase())}` : "";
    goTo(`/signup${suffix}`);
  }

  return (
    <div className="nexus">
      <header className="nx-top">
        <button className="nx-brand" type="button" onClick={() => openView("home")} aria-label="Open Churvox home">
          <img src="/churvox-operator-mark.svg" alt="" />
          <span>
            <strong>CHURVOX</strong>
            <small>AI OPERATIONS NEXUS</small>
          </span>
        </button>

        <nav className="nx-nav" aria-label="Main navigation">
          <button type="button" className={view === "home" ? "active" : ""} onClick={() => openView("home")}>Home</button>
          <button type="button" className={view === "how" ? "active" : ""} onClick={() => openView("how")}>How</button>
          <button type="button" className={view === "features" ? "active" : ""} onClick={() => openView("features")}>Features</button>
          <button type="button" className={view === "plans" ? "active" : ""} onClick={() => openView("plans")}>Plans</button>
          <button type="button" className={view === "contact" ? "active" : ""} onClick={() => openView("contact")}>Contact</button>
          <button type="button" className="login" onClick={() => goTo("/login")}>Login</button>
        </nav>
      </header>

      {view === "home" && (
        <main className="nx-home">
          <section className="nx-hero">
            <div className="nx-hero-copy">
              <p className="nx-kicker">WORK GOES IN / CHURVOX SORTS / OWNER APPROVES</p>
              <h1>The operating system for trade business admin.</h1>
              <p className="nx-sub">
                Churvox pulls jobs, crew updates, photos, time, quotes, invoices, clients, blockers and approvals into one clear control layer.
                The admin is prepared before it turns into chaos.
              </p>

              <div className="nx-cta-row">
                <button type="button" className="nx-primary" onClick={() => authedMode ? openView("home") : startChurvox()}>
                  {authedMode ? "Open Churvox" : "Start Churvox"}
                </button>
                <button type="button" className="nx-secondary" onClick={() => openView("how")}>See how it works</button>
              </div>
            </div>

            <aside className="nx-live" aria-label="Live admin engine">
              <div className="nx-live-head">
                <span>LIVE ADMIN ENGINE</span>
                <strong>What Churvox is preparing</strong>
              </div>

              {moves.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={item.id === active.id ? `nx-live-item active ${item.tone}` : `nx-live-item ${item.tone}`}
                  onClick={() => {
                    setActiveId(item.id);
                    setNotice(`Loaded: ${item.output}`);
                  }}
                >
                  <small>{item.label}</small>
                  <b>{item.output}</b>
                  <em>{item.title}</em>
                </button>
              ))}
            </aside>
          </section>

          <section className="nx-process">
            <article>
              <span>01</span>
              <h2>Work comes in</h2>
              <p>Jobs, notes, photos, time, worker updates, quotes and client details enter once.</p>
            </article>
            <article className="hot">
              <span>02</span>
              <h2>AI sorts it</h2>
              <p>Churvox prepares invoices, follow-ups, evidence, worker moves and blockers.</p>
            </article>
            <article>
              <span>03</span>
              <h2>You approve</h2>
              <p>The owner clears final sends, invoices, assignments and important changes.</p>
            </article>
          </section>

          <section className="nx-product">
            <div className="nx-active">
              <div className="nx-section-head">
                <span>ACTIVE MOVE</span>
                <b>{active.label}</b>
              </div>

              <article className={`nx-move ${active.tone}`}>
                <small>{active.label}</small>
                <h2>{active.title}</h2>
                <p>{active.body}</p>

                <div className="nx-result">
                  <span>Prepared owner move</span>
                  <strong>{active.output}</strong>
                </div>

                <div className="nx-cta-row">
                  <button type="button" className="nx-approve" onClick={clearMove}>
                    {active.tone === "red" ? "Open blocker" : "Approve move"}
                  </button>
                  <button type="button" className="nx-secondary" onClick={() => setNotice(`Review opened for ${active.output}`)}>Review first</button>
                </div>
              </article>
            </div>

            <aside className="nx-proof">
              <div className="nx-section-head">
                <span>EVIDENCE</span>
                <b>Why it is ready</b>
              </div>

              <ul>
                {active.proof.map((item) => <li key={item}>{item}</li>)}
              </ul>

              <div className="nx-note">{notice}</div>
            </aside>

            <section className="nx-log">
              <div className="nx-section-head">
                <span>APPROVAL LOG</span>
                <b>Owner-cleared moves</b>
              </div>

              {cleared.length === 0 ? (
                <p>No approvals cleared yet. Owner decisions appear here.</p>
              ) : (
                <div className="nx-log-list">
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

          <section className="nx-feature-strip">
            {["Jobs", "Crew", "Photos", "Time", "Quotes", "Invoices", "Clients", "Approvals"].map((item) => (
              <b key={item}>{item}</b>
            ))}
          </section>
        </main>
      )}

      {view === "how" && (
        <main className="nx-page">
          <p className="nx-kicker">HOW IT WORKS</p>
          <h1>Churvox turns daily activity into owner-ready moves.</h1>
          <section className="nx-cards three">
            <article><span>01</span><h2>Capture work</h2><p>Jobs, notes, photos, time, quotes, customer updates and worker actions enter the control layer.</p></article>
            <article><span>02</span><h2>AI prepares</h2><p>Churvox connects records, builds admin, catches blockers and stages the next move.</p></article>
            <article><span>03</span><h2>Owner clears</h2><p>The owner approves sends, invoices, assignments, quote follow-ups and important changes.</p></article>
          </section>
        </main>
      )}

      {view === "features" && (
        <main className="nx-page">
          <p className="nx-kicker">FEATURES</p>
          <h1>Everything needed to run the admin from one command layer.</h1>
          <section className="nx-cards feature">
            {features.map(([title, text]) => <article key={title}><h2>{title}</h2><p>{text}</p></article>)}
          </section>
        </main>
      )}

      {view === "plans" && (
        <main className="nx-page">
          <p className="nx-kicker">PRICING</p>
          <h1>Choose how much admin you want Churvox to prepare.</h1>
          <section className="nx-plans">
            {plans.map(([name, price, label, text]) => (
              <article className={name === "Operator" ? "featured" : ""} key={name}>
                <span>{label}</span>
                <h2>{name}</h2>
                <strong>{price}<small>/month + GST</small></strong>
                <p>{text}</p>
                <button type="button" onClick={() => startChurvox(name)}>
                  {name === "Operator" ? "Start Operator" : `Choose ${name}`}
                </button>
              </article>
            ))}
          </section>
          <div className="nx-wide">
            <b>Command Growth Pack — $99/month + GST</b>
            <span>Add 50 more active team members plus extra job capacity, AI Operator Actions, automation runs and admin/payroll capacity.</span>
          </div>
        </main>
      )}

      {view === "legal" && (
        <main className="nx-page">
          <p className="nx-kicker">LEGAL / TRUST</p>
          <h1>Approval-first AI business admin.</h1>
          <section className="nx-legal">
            {legal.map(([title, text]) => <article key={title}><h2>{title}</h2><p>{text}</p></article>)}
          </section>
        </main>
      )}

      {view === "contact" && (
        <main className="nx-page nx-contact">
          <p className="nx-kicker">CONTACT</p>
          <h1>Talk to Churvox.</h1>
          <p>For support, sales, billing, setup, security or account questions.</p>
          <div className="nx-contact-box">
            <span>CONTACT CHANNEL</span>
            <strong>hello@churvox.com</strong>
            <div>
              <button type="button" className="nx-approve" onClick={() => { window.location.href = "mailto:hello@churvox.com"; }}>Email now</button>
              <button type="button" className="nx-secondary" onClick={copyEmail}>Copy email</button>
            </div>
          </div>
        </main>
      )}

      <footer className="nx-footer">
        <span>© Churvox</span>
        <button type="button" onClick={() => openView("legal")}>Privacy / Terms</button>
        <button type="button" onClick={() => openView("contact")}>hello@churvox.com</button>
      </footer>
    </div>
  );
}
