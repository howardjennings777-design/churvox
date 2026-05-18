import React, { useMemo, useState } from "react";
import "./ChurvoxAIShell.css";

const queue = [
  {
    id: "invoice",
    signal: "READY",
    title: "Invoice prepared",
    client: "ECB Property Maintenance",
    value: "$430.00",
    time: "now",
    severity: "ready",
    instruction: "Approve sending after checking worker evidence and customer email.",
    evidence: ["Completed job detected", "Worker photo attached", "Time captured", "Customer email present"],
  },
  {
    id: "dispatch",
    signal: "BLOCKED",
    title: "Crew assignment missing",
    client: "Northside Lawns",
    value: "Today",
    time: "urgent",
    severity: "blocked",
    instruction: "Pick an available worker before the job window starts.",
    evidence: ["Address saved", "Client active", "No worker assigned", "Conflict warning armed"],
  },
  {
    id: "quote",
    signal: "DRAFT",
    title: "Quote follow-up staged",
    client: "Rental Owner Group",
    value: "$1,280.00",
    time: "4d",
    severity: "draft",
    instruction: "Approve the prepared follow-up or edit before sending.",
    evidence: ["Quote still open", "No customer reply", "Follow-up copy drafted", "Contact channel ready"],
  },
];

const plans = [
  ["Start", "$39", "Solo operator", "Jobs, clients, basic admin queue, owner approval."],
  ["Crew", "$89", "Small team", "Worker flow, team assignment, notes, photos, evidence."],
  ["Operator", "$149", "AI admin engine", "AI Operator Actions, invoice prep, quote follow-ups, approval queue."],
  ["Command", "$299", "Growing operation", "MYOB included, payroll workspace, advanced roles, higher capacity."],
];

const legal = [
  ["Privacy Policy", "Churvox stores business, client, job, worker, quote, invoice, and approval data so the owner can run admin from one place."],
  ["Terms of Service", "Churvox prepares actions, but the owner or authorised user remains responsible for final approval and business decisions."],
  ["Refund / Cancellation Policy", "Subscriptions can be cancelled according to the plan terms. Refunds are reviewed based on billing status, service availability, and usage."],
  ["Data / Security Note", "Churvox is designed around business isolation, role-based access, and approval-first AI workflows."],
];

function routeTo(path) {
  window.location.href = path;
}

export default function ChurvoxAIShell({ initialView = "console", authedMode = false }) {
  const [view, setView] = useState(initialView || "console");
  const [activeId, setActiveId] = useState(queue[0].id);
  const [log, setLog] = useState([]);
  const [notice, setNotice] = useState("AI operator online. Final moves require owner approval.");

  const active = useMemo(() => queue.find((item) => item.id === activeId) || queue[0], [activeId]);
  const blocked = queue.filter((item) => item.severity === "blocked").length;
  const ready = queue.filter((item) => item.severity !== "blocked").length;

  function openView(next) {
    setView(next);
    const map = {
      console: authedMode ? "/dashboard" : "/",
      plans: "/plans",
      legal: "/legal",
      contact: "/contact",
    };
    const path = map[next] || "/";
    if (window.location.pathname !== path) window.history.pushState({}, "", path);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function approve() {
    if (active.severity === "blocked") {
      setNotice(`Blocked: ${active.title}. Fix the blocker before approval.`);
      return;
    }

    const stamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setLog((items) => [{ stamp, text: `${active.title} cleared for ${active.client}` }, ...items].slice(0, 6));
    setNotice(`Approved: ${active.title}. Churvox would now run that prepared admin move.`);
  }

  function copyEmail() {
    navigator.clipboard?.writeText("hello@churvox.com");
    setNotice("Copied hello@churvox.com");
  }

  return (
    <div className="cx-terminal">
      <header className="cx-terminal-top">
        <button className="cx-logo-lockup" type="button" onClick={() => openView("console")}>
          <img src="/churvox-operator-mark.svg" alt="" />
          <span>
            <b>CHURVOX</b>
            <small>OPERATOR CONSOLE</small>
          </span>
        </button>

        <nav className="cx-terminal-nav">
          <button onClick={() => openView("console")}>Console</button>
          <button onClick={() => openView("plans")}>Plans</button>
          <button onClick={() => openView("legal")}>Legal</button>
          <button onClick={() => openView("contact")}>Contact</button>
          <button className="cx-nav-hot" onClick={() => routeTo("/login")}>Login</button>
        </nav>
      </header>

      {view === "console" && (
        <main className="cx-console">
          <section className="cx-command-hero">
            <div className="cx-hero-left">
              <p className="cx-eyebrow">AI RUNS THE ADMIN / OWNER CLEARS THE FINAL MOVE</p>
              <h1>Not a dashboard. A command console for trade business admin.</h1>
              <p>
                Work enters Churvox. AI stages the admin. You see the command, the evidence,
                the blocker, and the final approval move.
              </p>
              <div className="cx-hero-actions">
                <button className="cx-lime-button" onClick={() => routeTo(authedMode ? "/dashboard" : "/signup")}>
                  {authedMode ? "Open command queue" : "Start Churvox"}
                </button>
                <button className="cx-wire-button" onClick={() => openView("plans")}>View plans</button>
              </div>
            </div>

            <div className="cx-ai-strip">
              <div><span>AI</span><b>ONLINE</b></div>
              <div><span>QUEUE</span><b>{queue.length}</b></div>
              <div><span>READY</span><b>{ready}</b></div>
              <div className={blocked ? "danger" : ""}><span>BLOCKERS</span><b>{blocked}</b></div>
            </div>
          </section>

          <section className="cx-operator-frame">
            <aside className="cx-queue-rail">
              <div className="cx-section-title">
                <span>01</span>
                <b>Command Queue</b>
              </div>

              {queue.map((item) => (
                <button
                  key={item.id}
                  className={`cx-queue-row ${item.id === active.id ? "active" : ""} ${item.severity}`}
                  onClick={() => {
                    setActiveId(item.id);
                    setNotice(`Loaded command: ${item.title}`);
                  }}
                >
                  <span>{item.signal}</span>
                  <b>{item.title}</b>
                  <small>{item.client}</small>
                </button>
              ))}
            </aside>

            <section className="cx-active-command">
              <div className="cx-section-title">
                <span>02</span>
                <b>Active Command</b>
              </div>

              <div className={`cx-command-signal ${active.severity}`}>{active.signal}</div>
              <h2>{active.title}</h2>

              <div className="cx-command-matrix">
                <div><span>Client</span><b>{active.client}</b></div>
                <div><span>Value / Timing</span><b>{active.value}</b></div>
                <div><span>Age</span><b>{active.time}</b></div>
              </div>

              <p className="cx-instruction">{active.instruction}</p>

              <div className="cx-action-row">
                <button className="cx-approve-button" onClick={approve}>Approve move</button>
                <button className="cx-wire-button" onClick={() => setNotice(`Review mode opened for ${active.title}`)}>
                  Review evidence
                </button>
              </div>
            </section>

            <aside className="cx-evidence-panel">
              <div className="cx-section-title">
                <span>03</span>
                <b>Evidence Panel</b>
              </div>

              <ul>
                {active.evidence.map((item) => <li key={item}>{item}</li>)}
              </ul>

              <div className="cx-system-message">{notice}</div>
            </aside>

            <section className="cx-approval-dock">
              <div className="cx-section-title">
                <span>04</span>
                <b>Approval Dock</b>
              </div>

              {log.length === 0 ? (
                <p>No approvals cleared in this session.</p>
              ) : (
                <div className="cx-log-list">
                  {log.map((item, index) => (
                    <div key={`${item.stamp}-${index}`}>
                      <span>{item.stamp}</span>
                      <b>{item.text}</b>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </section>
        </main>
      )}

      {view === "plans" && (
        <main className="cx-page">
          <p className="cx-eyebrow">PRICING / OPERATOR CAPACITY</p>
          <h1>Choose how much admin you want Churvox to prepare.</h1>

          <div className="cx-price-grid">
            {plans.map(([name, price, label, text]) => (
              <article className={name === "Operator" ? "cx-price-row featured" : "cx-price-row"} key={name}>
                <span>{label}</span>
                <h2>{name}</h2>
                <strong>{price}<small>/month + GST</small></strong>
                <p>{text}</p>
                <button onClick={() => routeTo("/signup")}>{name === "Operator" ? "Start Operator" : `Choose ${name}`}</button>
              </article>
            ))}
          </div>

          <div className="cx-wide-note">
            <b>Command Growth Pack — $99/month + GST</b>
            <span>Add 50 more active team members plus extra job capacity, AI Operator Actions, automation runs, and admin/payroll capacity.</span>
          </div>
        </main>
      )}

      {view === "legal" && (
        <main className="cx-page">
          <p className="cx-eyebrow">LEGAL / TRUST</p>
          <h1>Approval-first AI business admin.</h1>

          <div className="cx-legal-lines">
            {legal.map(([title, text]) => (
              <section key={title}>
                <h2>{title}</h2>
                <p>{text}</p>
              </section>
            ))}
          </div>
        </main>
      )}

      {view === "contact" && (
        <main className="cx-page cx-contact">
          <p className="cx-eyebrow">CONTACT / SUPPORT</p>
          <h1>Talk to Churvox.</h1>
          <p>For support, sales, billing, setup, security, or account questions.</p>

          <div className="cx-contact-line">
            <span>CONTACT CHANNEL</span>
            <b>hello@churvox.com</b>
            <div>
              <button className="cx-approve-button" onClick={() => { window.location.href = "mailto:hello@churvox.com"; }}>Email now</button>
              <button className="cx-wire-button" onClick={copyEmail}>Copy email</button>
            </div>
          </div>
        </main>
      )}

      <footer className="cx-terminal-footer">
        <span>© Churvox</span>
        <button onClick={() => openView("legal")}>Privacy / Terms</button>
        <button onClick={() => openView("contact")}>hello@churvox.com</button>
      </footer>
    </div>
  );
}
