import React, { useMemo, useState } from "react";
import "./ChurvoxAIShell.css";

const deskItems = [
  {
    id: "job",
    lane: "JOB",
    title: "New lawn service booked",
    client: "Northside Lawns",
    state: "Needs crew",
    tone: "amber",
    ai: "Churvox found the client, checked the address, and staged worker assignment.",
    evidence: ["Client found", "Address ready", "Schedule checked", "Worker needed"],
  },
  {
    id: "invoice",
    lane: "INVOICE",
    title: "Invoice ready from completed work",
    client: "ECB Property Maintenance",
    state: "$430 ready",
    tone: "green",
    ai: "Churvox used the completed job, time, notes, and photo evidence to prepare the invoice.",
    evidence: ["Job complete", "Photo attached", "Time captured", "Customer email ready"],
  },
  {
    id: "quote",
    lane: "QUOTE",
    title: "Quote follow-up waiting",
    client: "Rental Owner Group",
    state: "4 days old",
    tone: "blue",
    ai: "Churvox spotted the open quote and drafted a follow-up message for approval.",
    evidence: ["Quote open", "No reply yet", "Message drafted", "Contact ready"],
  },
  {
    id: "crew",
    lane: "CREW",
    title: "Worker update received",
    client: "Today’s route",
    state: "Photo + note",
    tone: "cream",
    ai: "Churvox pulled the field update into the admin queue so nothing gets lost.",
    evidence: ["Worker note", "Job photo", "Status updated", "Owner review ready"],
  },
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

export default function ChurvoxAIShell({ initialView = "console", authedMode = false }) {
  const [view, setView] = useState(initialView || "console");
  const [activeId, setActiveId] = useState("invoice");
  const [notice, setNotice] = useState("Churvox is preparing today’s admin. Owner approval stays final.");
  const [approved, setApproved] = useState([]);

  const active = useMemo(() => deskItems.find((item) => item.id === activeId) || deskItems[1], [activeId]);

  function openView(nextView) {
    setView(nextView);

    const pathMap = {
      console: authedMode ? "/dashboard" : "/",
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

  function approveActive() {
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setApproved((items) => [{ time, text: `${active.lane} cleared for ${active.client}` }, ...items].slice(0, 4));
    setNotice(`Approved: ${active.title}. Churvox would now run the prepared admin move.`);
  }

  function copyEmail() {
    navigator.clipboard?.writeText("hello@churvox.com");
    setNotice("Copied hello@churvox.com");
  }

  return (
    <div className="cxdesk">
      <header className="cxdesk-top">
        <button className="cxdesk-brand" type="button" onClick={() => openView("console")}>
          <img src="/churvox-operator-mark.svg" alt="" />
          <span>
            <strong>CHURVOX</strong>
            <small>BUSINESS COMMAND DESK</small>
          </span>
        </button>

        <nav className="cxdesk-nav">
          <button onClick={() => openView("console")}>Command Desk</button>
          <button onClick={() => openView("plans")}>Plans</button>
          <button onClick={() => openView("legal")}>Legal</button>
          <button onClick={() => openView("contact")}>Contact</button>
          <button className="hot" onClick={() => routeTo("/login")}>Login</button>
        </nav>
      </header>

      {view === "console" && (
        <main className="cxdesk-main">
          <section className="cxdesk-hero">
            <div className="cxdesk-hero-copy">
              <p>AI RUNS THE ADMIN. YOU APPROVE THE MOVE.</p>
              <h1>You should not have to jump around apps to sort your business out.</h1>
              <span>
                Churvox turns jobs, workers, quotes, invoices, notes, and photos into one clear command desk.
                The admin is prepared in front of you. You just clear the final move.
              </span>

              <div className="cxdesk-actions">
                <button className="primary" onClick={() => routeTo(authedMode ? "/dashboard" : "/signup")}>
                  {authedMode ? "Open command desk" : "Start Churvox"}
                </button>
                <button className="ghost" onClick={() => openView("plans")}>See plans</button>
              </div>
            </div>

            <div className="cxdesk-promise">
              <div><b>1</b><span>Work comes in</span></div>
              <div><b>2</b><span>Churvox prepares admin</span></div>
              <div><b>3</b><span>Owner approves</span></div>
            </div>
          </section>

          <section className="cxdesk-workbench">
            <div className="cxdesk-left">
              <div className="cxdesk-panel-title">
                <span>LIVE WORK</span>
                <b>Everything that needs action</b>
              </div>

              <div className="cxdesk-lanes">
                {deskItems.map((item) => (
                  <button
                    key={item.id}
                    className={item.id === active.id ? `cxdesk-lane active ${item.tone}` : `cxdesk-lane ${item.tone}`}
                    onClick={() => {
                      setActiveId(item.id);
                      setNotice(`Loaded: ${item.title}`);
                    }}
                  >
                    <small>{item.lane}</small>
                    <strong>{item.title}</strong>
                    <span>{item.client}</span>
                    <em>{item.state}</em>
                  </button>
                ))}
              </div>
            </div>

            <div className="cxdesk-center">
              <div className="cxdesk-panel-title">
                <span>AI PREPARED</span>
                <b>Current move</b>
              </div>

              <div className={`cxdesk-active ${active.tone}`}>
                <small>{active.lane}</small>
                <h2>{active.title}</h2>

                <div className="cxdesk-facts">
                  <div>
                    <span>Client</span>
                    <b>{active.client}</b>
                  </div>
                  <div>
                    <span>Status</span>
                    <b>{active.state}</b>
                  </div>
                </div>

                <p>{active.ai}</p>

                <div className="cxdesk-buttons">
                  <button className="approve" onClick={approveActive}>Approve move</button>
                  <button className="review" onClick={() => setNotice(`Opened review for ${active.title}`)}>Review first</button>
                </div>
              </div>
            </div>

            <aside className="cxdesk-right">
              <div className="cxdesk-panel-title">
                <span>EVIDENCE</span>
                <b>Why Churvox staged it</b>
              </div>

              <ul className="cxdesk-evidence">
                {active.evidence.map((item) => <li key={item}>{item}</li>)}
              </ul>

              <div className="cxdesk-note">{notice}</div>
            </aside>

            <section className="cxdesk-bottom">
              <div className="cxdesk-panel-title">
                <span>APPROVAL DOCK</span>
                <b>Owner-cleared moves</b>
              </div>

              {approved.length === 0 ? (
                <p>No moves cleared yet. Approvals will appear here.</p>
              ) : (
                <div className="cxdesk-log">
                  {approved.map((item, index) => (
                    <div key={`${item.time}-${index}`}>
                      <span>{item.time}</span>
                      <b>{item.text}</b>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </section>

          <section className="cxdesk-strip">
            <div>
              <b>Jobs</b>
              <span>Create, assign, track, complete.</span>
            </div>
            <div>
              <b>Workers</b>
              <span>Notes and photos feed the admin queue.</span>
            </div>
            <div>
              <b>Invoices</b>
              <span>Prepared from completed work.</span>
            </div>
            <div>
              <b>Quotes</b>
              <span>Follow-ups staged before money is lost.</span>
            </div>
          </section>
        </main>
      )}

      {view === "plans" && (
        <main className="cxdesk-page">
          <p className="page-kicker">PRICING</p>
          <h1>Choose how much admin you want Churvox to prepare.</h1>

          <section className="cxdesk-plans">
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

          <div className="cxdesk-wide">
            <b>Command Growth Pack — $99/month + GST</b>
            <span>Add 50 more active team members plus extra job capacity, AI Operator Actions, automation runs, and admin/payroll capacity.</span>
          </div>
        </main>
      )}

      {view === "legal" && (
        <main className="cxdesk-page">
          <p className="page-kicker">LEGAL / TRUST</p>
          <h1>Approval-first AI business admin.</h1>

          <section className="cxdesk-legal">
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
        <main className="cxdesk-page cxdesk-contact">
          <p className="page-kicker">CONTACT</p>
          <h1>Talk to Churvox.</h1>
          <p>For support, sales, billing, setup, security, or account questions.</p>

          <div className="cxdesk-contact-box">
            <span>CONTACT CHANNEL</span>
            <strong>hello@churvox.com</strong>
            <div>
              <button className="approve" onClick={() => { window.location.href = "mailto:hello@churvox.com"; }}>Email now</button>
              <button className="review" onClick={copyEmail}>Copy email</button>
            </div>
          </div>
        </main>
      )}

      <footer className="cxdesk-footer">
        <span>© Churvox</span>
        <button onClick={() => openView("legal")}>Privacy / Terms</button>
        <button onClick={() => openView("contact")}>hello@churvox.com</button>
      </footer>
    </div>
  );
}
