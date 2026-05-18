import React, { useMemo, useState } from "react";
import "./ChurvoxAIShell.css";

const plans = [
  {
    name: "Start",
    price: "$39",
    tag: "For solo operators",
    detail: "Basic work capture, clients, jobs, simple approvals.",
    includes: ["Clients + jobs", "Simple invoice prep", "Owner approval flow", "Core mobile access"],
  },
  {
    name: "Crew",
    price: "$89",
    tag: "For small teams",
    detail: "Team workflow, assignments, worker updates, and job evidence.",
    includes: ["Team members", "Worker job flow", "Photos + notes", "Queue-based admin"],
  },
  {
    name: "Operator",
    price: "$149",
    tag: "Most popular",
    detail: "AI Operator Actions help prepare admin before the owner approves.",
    includes: ["AI Operator Actions", "Invoice + quote prep", "Approval queue", "MYOB add-on available"],
    featured: true,
  },
  {
    name: "Command",
    price: "$299",
    tag: "For growing trade teams",
    detail: "Advanced roles, MYOB included, payroll workspace, and higher capacity.",
    includes: ["MYOB included", "Payroll workspace", "Advanced roles", "Higher job capacity"],
  },
];

const commands = [
  {
    id: "invoice",
    label: "Invoice ready",
    urgency: "APPROVE",
    title: "AI prepared an invoice from a completed job",
    client: "ECB Property Maintenance",
    value: "$430.00",
    ownerMove: "Review the evidence, edit if needed, then approve sending.",
    evidence: ["Job marked complete", "Worker photo attached", "Time captured", "Client email detected"],
    blocker: null,
  },
  {
    id: "quote",
    label: "Quote follow-up",
    urgency: "SEND",
    title: "AI found a quote that needs a follow-up",
    client: "Rental Owner Group",
    value: "$1,280.00",
    ownerMove: "Approve the drafted follow-up message or open the quote first.",
    evidence: ["Quote is 4 days old", "No response yet", "Customer contact available", "Draft message ready"],
    blocker: null,
  },
  {
    id: "job",
    label: "Job blocked",
    urgency: "BLOCKER",
    title: "A scheduled job is missing the final worker assignment",
    client: "Northside Lawns",
    value: "Today",
    ownerMove: "Choose a worker before the day starts.",
    evidence: ["Job has address", "Client is active", "No assigned worker", "Schedule conflict warning enabled"],
    blocker: "No worker assigned",
  },
];

const legalSections = [
  {
    title: "Privacy Policy",
    body:
      "Churvox stores business data so owners can manage jobs, clients, quotes, invoices, team actions, and approval workflows. Customer, worker, and business information should only be used for the work purpose it was collected for.",
  },
  {
    title: "Terms of Service",
    body:
      "Churvox helps prepare business admin, but the owner or authorised user remains responsible for checking and approving final actions before anything is sent, charged, exported, or relied on.",
  },
  {
    title: "Refund / Cancellation Policy",
    body:
      "Subscriptions can be cancelled according to the plan billing terms. Refunds are reviewed based on billing status, usage, and whether the service was available during the paid period.",
  },
  {
    title: "Data / Security Note",
    body:
      "Churvox is designed around role-based access, business isolation, and approval-first workflows. Sensitive actions should stay controlled by authorised owner/admin roles.",
  },
];

function goTo(path) {
  window.location.href = path;
}

export default function ChurvoxAIShell({ initialView = "console", authedMode = false }) {
  const [view, setView] = useState(initialView || "console");
  const [activeCommandId, setActiveCommandId] = useState(commands[0].id);
  const [approvalLog, setApprovalLog] = useState([]);
  const [notice, setNotice] = useState("AI Operator online. Owner approval required for final moves.");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const activeCommand = useMemo(
    () => commands.find((command) => command.id === activeCommandId) || commands[0],
    [activeCommandId]
  );

  const status = useMemo(() => {
    const blockers = commands.filter((command) => command.blocker).length;
    return {
      queued: commands.length,
      ready: commands.length - blockers,
      blockers,
      approved: approvalLog.length,
    };
  }, [approvalLog.length]);

  function openView(nextView) {
    setView(nextView);
    setMobileNavOpen(false);

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

  function approveActiveCommand() {
    if (activeCommand.blocker) {
      setNotice(`Blocked: ${activeCommand.blocker}. Fix this before approval.`);
      return;
    }

    const item = {
      id: `${activeCommand.id}-${Date.now()}`,
      text: `${activeCommand.label} cleared for ${activeCommand.client}`,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setApprovalLog((current) => [item, ...current].slice(0, 5));
    setNotice(`Approved: ${activeCommand.label}. Churvox would now run the prepared admin move.`);
  }

  function copyContact() {
    navigator.clipboard?.writeText("hello@churvox.com");
    setNotice("Copied hello@churvox.com");
  }

  return (
    <div className="cx-operator-site">
      <header className="cx-topbar">
        <button className="cx-brand" onClick={() => openView("console")} aria-label="Open Churvox console">
          <img src="/churvox-operator-mark.svg" alt="" />
          <span>
            <strong>CHURVOX</strong>
            <small>OPERATOR CONSOLE</small>
          </span>
        </button>

        <button className="cx-menu-button" onClick={() => setMobileNavOpen((open) => !open)}>
          MENU
        </button>

        <nav className={mobileNavOpen ? "cx-nav cx-nav-open" : "cx-nav"}>
          <button onClick={() => openView("console")}>Console</button>
          <button onClick={() => openView("plans")}>Plans</button>
          <button onClick={() => openView("legal")}>Legal</button>
          <button onClick={() => openView("contact")}>Contact</button>
          <button className="cx-nav-login" onClick={() => goTo("/login")}>Login</button>
        </nav>
      </header>

      <main>
        {view === "console" && (
          <>
            <section className="cx-hero">
              <div className="cx-hero-copy">
                <p className="cx-kicker">AI RUNS THE ADMIN. OWNER CLEARS THE FINAL MOVE.</p>
                <h1>One command console for jobs, invoices, quotes, crew, and approvals.</h1>
                <p>
                  Churvox is built for trade and service owners who do not want another busy dashboard.
                  Work comes in. Churvox prepares the admin. You approve the move.
                </p>
                <div className="cx-hero-actions">
                  <button className="cx-primary-action" onClick={() => goTo(authedMode ? "/dashboard" : "/signup")}>{authedMode ? "Open Command Queue" : "Start Churvox"}</button>
                  <button className="cx-secondary-action" onClick={() => openView("plans")}>View pricing</button>
                </div>
              </div>

              <aside className="cx-status-bar" aria-label="AI status bar">
                <div>
                  <span>AI STATUS</span>
                  <strong>ONLINE</strong>
                </div>
                <div>
                  <span>COMMANDS</span>
                  <strong>{status.queued}</strong>
                </div>
                <div>
                  <span>READY</span>
                  <strong>{status.ready}</strong>
                </div>
                <div className={status.blockers ? "cx-danger" : ""}>
                  <span>BLOCKERS</span>
                  <strong>{status.blockers}</strong>
                </div>
              </aside>
            </section>

            <section className="cx-console-grid" aria-label="Operator console">
              <div className="cx-panel cx-queue">
                <div className="cx-panel-head">
                  <span>01</span>
                  <h2>Command Queue</h2>
                </div>

                {commands.map((command) => (
                  <button
                    key={command.id}
                    className={command.id === activeCommand.id ? "cx-command cx-command-active" : "cx-command"}
                    onClick={() => {
                      setActiveCommandId(command.id);
                      setNotice(`Opened: ${command.label}`);
                    }}
                  >
                    <span className={command.blocker ? "cx-command-urgency cx-command-blocker" : "cx-command-urgency"}>
                      {command.urgency}
                    </span>
                    <strong>{command.label}</strong>
                    <small>{command.client}</small>
                  </button>
                ))}
              </div>

              <div className="cx-panel cx-active-command">
                <div className="cx-panel-head">
                  <span>02</span>
                  <h2>Active Command</h2>
                </div>

                <p className="cx-command-type">{activeCommand.urgency}</p>
                <h3>{activeCommand.title}</h3>

                <dl className="cx-command-facts">
                  <div>
                    <dt>Client</dt>
                    <dd>{activeCommand.client}</dd>
                  </div>
                  <div>
                    <dt>Value / Timing</dt>
                    <dd>{activeCommand.value}</dd>
                  </div>
                  <div>
                    <dt>Owner move</dt>
                    <dd>{activeCommand.ownerMove}</dd>
                  </div>
                </dl>

                {activeCommand.blocker && (
                  <div className="cx-blocker">
                    <strong>BLOCKER:</strong> {activeCommand.blocker}
                  </div>
                )}

                <div className="cx-command-actions">
                  <button className="cx-approve-action" onClick={approveActiveCommand}>Approve move</button>
                  <button className="cx-secondary-action" onClick={() => setNotice(`Review opened for ${activeCommand.label}`)}>
                    Review details
                  </button>
                </div>
              </div>

              <div className="cx-panel cx-evidence">
                <div className="cx-panel-head">
                  <span>03</span>
                  <h2>Evidence Panel</h2>
                </div>

                <ul>
                  {activeCommand.evidence.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>

                <div className="cx-notice-line">{notice}</div>
              </div>

              <div className="cx-panel cx-approval-dock">
                <div className="cx-panel-head">
                  <span>04</span>
                  <h2>Approval Dock</h2>
                </div>

                {approvalLog.length === 0 ? (
                  <p className="cx-empty">No moves cleared yet. Approvals will appear here.</p>
                ) : (
                  <ul>
                    {approvalLog.map((item) => (
                      <li key={item.id}>
                        <strong>{item.time}</strong>
                        <span>{item.text}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            <section className="cx-proof-strip">
              <div>
                <strong>Jobs</strong>
                <span>Captured, assigned, tracked.</span>
              </div>
              <div>
                <strong>Invoices</strong>
                <span>Prepared from job evidence.</span>
              </div>
              <div>
                <strong>Quotes</strong>
                <span>Follow-ups ready to approve.</span>
              </div>
              <div>
                <strong>Workers</strong>
                <span>Field updates feed admin.</span>
              </div>
            </section>
          </>
        )}

        {view === "plans" && (
          <section className="cx-page-section">
            <p className="cx-kicker">PRICING</p>
            <h1>Pick the level of Operator capacity your business needs.</h1>
            <div className="cx-plan-grid">
              {plans.map((plan) => (
                <article className={plan.featured ? "cx-plan cx-plan-featured" : "cx-plan"} key={plan.name}>
                  <span>{plan.tag}</span>
                  <h2>{plan.name}</h2>
                  <p className="cx-price">{plan.price}<small>/month + GST</small></p>
                  <p>{plan.detail}</p>
                  <ul>
                    {plan.includes.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                  <button onClick={() => goTo("/signup")}>{plan.featured ? "Start Operator" : `Choose ${plan.name}`}</button>
                </article>
              ))}
            </div>

            <div className="cx-command-pack">
              <strong>Command Growth Pack — $99/month + GST</strong>
              <span>Add 50 more active team members plus extra job capacity, AI Operator Actions, automation runs, and admin/payroll capacity.</span>
            </div>
          </section>
        )}

        {view === "legal" && (
          <section className="cx-page-section">
            <p className="cx-kicker">LEGAL + TRUST</p>
            <h1>Clear rules for an approval-first AI business console.</h1>

            <div className="cx-legal-stack">
              {legalSections.map((section) => (
                <article className="cx-legal-row" key={section.title}>
                  <h2>{section.title}</h2>
                  <p>{section.body}</p>
                </article>
              ))}
            </div>

            <div className="cx-owner-note">
              <strong>Important owner responsibility:</strong>
              <span> Churvox can prepare admin actions, but the owner or authorised user remains responsible for final approval.</span>
            </div>
          </section>
        )}

        {view === "contact" && (
          <section className="cx-page-section cx-contact-section">
            <p className="cx-kicker">CONTACT</p>
            <h1>Talk to Churvox.</h1>
            <p>For support, sales, security, billing, or account questions, contact the Churvox team.</p>

            <div className="cx-contact-terminal">
              <span>CONTACT CHANNEL</span>
              <strong>hello@churvox.com</strong>
              <div>
                <button className="cx-approve-action" onClick={() => window.location.href = "mailto:hello@churvox.com"}>
                  Email now
                </button>
                <button className="cx-secondary-action" onClick={copyContact}>
                  Copy email
                </button>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="cx-footer">
        <span>© Churvox</span>
        <button onClick={() => openView("legal")}>Privacy / Terms</button>
        <button onClick={() => openView("contact")}>hello@churvox.com</button>
      </footer>
    </div>
  );
}
