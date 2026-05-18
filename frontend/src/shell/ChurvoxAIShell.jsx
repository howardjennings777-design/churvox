import React, { useMemo, useState } from "react";
import "./ChurvoxAIShell.css";

const commands = [
  {
    id: "invoice",
    status: "AI ACTION READY",
    type: "INVOICE",
    title: "Invoice prepared from completed job",
    short: "Invoice prepared",
    client: "ECB Property Maintenance",
    amount: "$430.00",
    blocker: false,
    instruction: "Owner approves the prepared invoice. Churvox sends it with the job evidence attached.",
    evidence: ["Completed job detected", "Worker photo attached", "Time captured", "Customer email present"],
  },
  {
    id: "dispatch",
    status: "BLOCKER",
    type: "DISPATCH",
    title: "Crew assignment missing",
    short: "Assign crew",
    client: "Northside Lawns",
    amount: "Today",
    blocker: true,
    instruction: "Choose a worker before the job window starts. Churvox will not clear this command until assigned.",
    evidence: ["Address saved", "Client active", "No worker assigned", "Conflict warning armed"],
  },
  {
    id: "quote",
    status: "DRAFT READY",
    type: "QUOTE",
    title: "Quote follow-up staged",
    short: "Follow up quote",
    client: "Rental Owner Group",
    amount: "$1,280.00",
    blocker: false,
    instruction: "Owner approves or edits the follow-up message before Churvox sends anything.",
    evidence: ["Quote still open", "No customer reply", "Follow-up copy drafted", "Contact channel ready"],
  },
];

const plans = [
  ["Start", "$39", "Solo operator", "Jobs, clients, basic admin queue, and owner approval."],
  ["Crew", "$89", "Small team", "Worker flow, team assignment, notes, photos, and evidence."],
  ["Operator", "$149", "AI admin engine", "AI Operator Actions, invoice prep, quote follow-ups, and approval queue."],
  ["Command", "$299", "Growing operation", "MYOB included, payroll workspace, advanced roles, and higher capacity."],
];

const legal = [
  ["Privacy Policy", "Churvox stores business, client, job, worker, quote, invoice, and approval data so the owner can run admin from one place."],
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
  const [notice, setNotice] = useState("AI Operator online. Final business moves require owner approval.");
  const [approvals, setApprovals] = useState([]);

  const active = useMemo(() => commands.find((item) => item.id === activeId) || commands[0], [activeId]);
  const blockers = commands.filter((item) => item.blocker).length;
  const ready = commands.length - blockers;

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
    if (active.blocker) {
      setNotice(`BLOCKED: ${active.short} needs fixing before approval.`);
      return;
    }

    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setApprovals((items) => [{ time, text: `${active.short} cleared for ${active.client}` }, ...items].slice(0, 5));
    setNotice(`APPROVED: ${active.short}. Churvox would now run the prepared admin move.`);
  }

  function copyEmail() {
    navigator.clipboard?.writeText("hello@churvox.com");
    setNotice("Copied hello@churvox.com");
  }

  return (
    <div className="cxop">
      <header className="cxop-topbar">
        <button className="cxop-brand" type="button" onClick={() => openView("console")}>
          <img src="/churvox-operator-mark.svg" alt="" />
          <span>
            <strong>CHURVOX</strong>
            <small>OPERATOR CONSOLE</small>
          </span>
        </button>

        <nav className="cxop-nav">
          <button onClick={() => openView("console")}>Console</button>
          <button onClick={() => openView("plans")}>Plans</button>
          <button onClick={() => openView("legal")}>Legal</button>
          <button onClick={() => openView("contact")}>Contact</button>
          <button className="cxop-login" onClick={() => routeTo("/login")}>Login</button>
        </nav>
      </header>

      {view === "console" && (
        <main className="cxop-console">
          <section className="cxop-intro">
            <div>
              <p>AI RUNS THE ADMIN / OWNER CLEARS THE FINAL MOVE</p>
              <h1>Every job becomes a command.</h1>
            </div>
            <div>
              <span>Not another dashboard. Churvox turns work into prepared admin moves: invoices, quotes, dispatch, evidence, and approvals.</span>
            </div>
          </section>

          <section className="cxop-machine">
            <aside className="cxop-status-column">
              <div className="cxop-status-cell online">
                <span>AI</span>
                <strong>ONLINE</strong>
              </div>
              <div className="cxop-status-cell">
                <span>QUEUE</span>
                <strong>{commands.length}</strong>
              </div>
              <div className="cxop-status-cell">
                <span>READY</span>
                <strong>{ready}</strong>
              </div>
              <div className="cxop-status-cell danger">
                <span>BLOCKERS</span>
                <strong>{blockers}</strong>
              </div>
            </aside>

            <aside className="cxop-queue">
              <div className="cxop-label"><b>01</b><span>Command Queue</span></div>
              {commands.map((item) => (
                <button
                  key={item.id}
                  className={item.id === active.id ? `cxop-command active ${item.blocker ? "blocked" : ""}` : `cxop-command ${item.blocker ? "blocked" : ""}`}
                  onClick={() => {
                    setActiveId(item.id);
                    setNotice(`Loaded command: ${item.short}`);
                  }}
                >
                  <small>{item.type}</small>
                  <strong>{item.short}</strong>
                  <span>{item.client}</span>
                </button>
              ))}
            </aside>

            <section className="cxop-core">
              <div className="cxop-label"><b>02</b><span>Active Command</span></div>

              <div className={active.blocker ? "cxop-chip danger" : "cxop-chip"}>{active.status}</div>
              <h2>{active.title}</h2>

              <div className="cxop-command-grid">
                <div>
                  <span>Client</span>
                  <strong>{active.client}</strong>
                </div>
                <div>
                  <span>Value / Time</span>
                  <strong>{active.amount}</strong>
                </div>
                <div>
                  <span>Final move</span>
                  <strong>{active.blocker ? "Fix blocker" : "Owner approval"}</strong>
                </div>
              </div>

              <p>{active.instruction}</p>

              <div className="cxop-actions">
                <button className="cxop-approve" onClick={approveActive}>Approve move</button>
                <button className="cxop-outline" onClick={() => setNotice(`Evidence review opened for ${active.short}`)}>
                  Review evidence
                </button>
              </div>
            </section>

            <aside className="cxop-evidence">
              <div className="cxop-label"><b>03</b><span>Evidence Panel</span></div>
              <ul>
                {active.evidence.map((item) => <li key={item}>{item}</li>)}
              </ul>
              <div className="cxop-system">{notice}</div>
            </aside>

            <section className="cxop-dock">
              <div className="cxop-label"><b>04</b><span>Approval Dock</span></div>
              {approvals.length === 0 ? (
                <p>No commands cleared yet. Owner approvals will land here.</p>
              ) : (
                <div className="cxop-approval-log">
                  {approvals.map((item, index) => (
                    <div key={`${item.time}-${index}`}>
                      <span>{item.time}</span>
                      <strong>{item.text}</strong>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </section>
        </main>
      )}

      {view === "plans" && (
        <main className="cxop-page">
          <p className="cxop-page-kicker">PRICING / OPERATOR CAPACITY</p>
          <h1>Choose how much admin you want Churvox to prepare.</h1>

          <section className="cxop-plans">
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

          <div className="cxop-wide">
            <b>Command Growth Pack — $99/month + GST</b>
            <span>Add 50 more active team members plus extra job capacity, AI Operator Actions, automation runs, and admin/payroll capacity.</span>
          </div>
        </main>
      )}

      {view === "legal" && (
        <main className="cxop-page">
          <p className="cxop-page-kicker">LEGAL / TRUST</p>
          <h1>Approval-first AI business admin.</h1>
          <section className="cxop-legal">
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
        <main className="cxop-page cxop-contact">
          <p className="cxop-page-kicker">CONTACT / SUPPORT</p>
          <h1>Talk to Churvox.</h1>
          <p>For support, sales, billing, setup, security, or account questions.</p>

          <div className="cxop-contact-box">
            <span>CONTACT CHANNEL</span>
            <strong>hello@churvox.com</strong>
            <div>
              <button className="cxop-approve" onClick={() => { window.location.href = "mailto:hello@churvox.com"; }}>Email now</button>
              <button className="cxop-outline" onClick={copyEmail}>Copy email</button>
            </div>
          </div>
        </main>
      )}

      <footer className="cxop-footer">
        <span>© Churvox</span>
        <button onClick={() => openView("legal")}>Privacy / Terms</button>
        <button onClick={() => openView("contact")}>hello@churvox.com</button>
      </footer>
    </div>
  );
}
