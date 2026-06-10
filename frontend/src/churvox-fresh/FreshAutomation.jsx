import React from "react";

const AUTOMATION_KEY = "churvox:fresh-automation-rules:v1";
const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const defaults = [
  {
    id: "auto-quote-followup",
    name: "Quote follow-up",
    trigger: "Quote sent for more than 5 days",
    action: "Prepare follow-up for owner approval",
    status: "On",
    lastRun: "Not run yet",
    risk: "Recover work without annoying the customer.",
  },
  {
    id: "auto-overdue-invoice",
    name: "Overdue invoice check",
    trigger: "Invoice becomes overdue",
    action: "Prepare reminder for owner approval",
    status: "On",
    lastRun: "Not run yet",
    risk: "Protect cashflow but keep owner in control.",
  },
  {
    id: "auto-blocked-job",
    name: "Blocked job alert",
    trigger: "Job is marked blocked",
    action: "Send access/setup issue to Command",
    status: "On",
    lastRun: "Not run yet",
    risk: "Avoid sending workers to jobs that cannot be done.",
  },
  {
    id: "auto-client-setup",
    name: "Client setup check",
    trigger: "Billing email or setup details missing",
    action: "Create owner setup task",
    status: "On",
    lastRun: "Not run yet",
    risk: "Stop bad invoices before they happen.",
  },
  {
    id: "auto-payroll-review",
    name: "Payroll review",
    trigger: "Hours or adjustment needs review",
    action: "Prepare payroll review slip",
    status: "Off",
    lastRun: "Not run yet",
    risk: "Payroll is CSV only. No tax or bank files.",
  },
];

function readRules() {
  try {
    if (typeof window === "undefined") return defaults;

    const saved = window.localStorage.getItem(AUTOMATION_KEY);
    if (!saved) return defaults;

    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : defaults;
  } catch {
    return defaults;
  }
}

function saveRules(rules) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(AUTOMATION_KEY, JSON.stringify(rules));
      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "automation" } }));
    }
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

function sendRuleToCommand(rule) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `automation-${rule.id}-${Date.now()}`,
      group: "Automation",
      title: rule.name,
      info: `${rule.trigger} · ${rule.action}`,
      urgency: rule.status === "On" ? "Ready to review" : "Rule is off",
      found: `Automation rule triggered: ${rule.trigger}.`,
      prepared: rule.action,
      why: rule.risk,
      owner: "Approve, edit, ignore or open the matching area.",
      area: "Automation",
      page: "automation",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 20)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "automation-command" } }));
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

export default function FreshAutomation({ onNavigate }) {
  const [rules, setRules] = React.useState(readRules);
  const [selectedId, setSelectedId] = React.useState(() => readRules()[0]?.id || "");
  const selected = rules.find((rule) => rule.id === selectedId) || rules[0];

  const onCount = rules.filter((rule) => rule.status === "On").length;
  const offCount = rules.filter((rule) => rule.status === "Off").length;

  function updateRule(id, patch) {
    setRules((current) => {
      const next = current.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule));
      saveRules(next);
      return next;
    });
  }

  function toggleRule(rule) {
    updateRule(rule.id, { status: rule.status === "On" ? "Off" : "On" });
  }

  function runRule(rule) {
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    updateRule(rule.id, { lastRun: now });
    sendRuleToCommand(rule);
    onNavigate?.("command");
  }

  function resetRules() {
    saveRules(defaults);
    setRules(defaults);
    setSelectedId(defaults[0]?.id || "");
  }

  return (
    <section className="freshAutomationPage">
      <div className="freshAutomationHero">
        <div>
          <span>Automation preview</span>
          <h1>Rules that ask first</h1>
          <p>Churvox can find admin work automatically, but the owner still approves customer-facing or money actions.</p>
        </div>

        <div className="freshAutomationStats">
          <div><b>{rules.length}</b><small>rules</small></div>
          <div><b>{onCount}</b><small>on</small></div>
          <div><b>{offCount}</b><small>off</small></div>
        </div>
      </div>

      <div className="freshAutomationLayout">
        <aside className="freshAutomationList">
          <header>
            <div>
              <b>Automation rules</b>
              <span>Frontend preview only</span>
            </div>
            <button type="button" onClick={resetRules}>Reset</button>
          </header>

          {rules.map((rule) => (
            <button
              type="button"
              key={rule.id}
              className={selected?.id === rule.id ? "active" : ""}
              onClick={() => setSelectedId(rule.id)}
            >
              <b>{rule.name}</b>
              <span>{rule.trigger}</span>
              <small>{rule.status} · Last run: {rule.lastRun}</small>
            </button>
          ))}
        </aside>

        {selected && (
          <article className="freshAutomationDetail">
            <div className="freshAutomationHead">
              <div>
                <span>{selected.status}</span>
                <h2>{selected.name}</h2>
                <p>{selected.risk}</p>
              </div>

              <div className="freshAutomationHeadActions">
                <button type="button" onClick={() => toggleRule(selected)}>
                  Turn {selected.status === "On" ? "off" : "on"}
                </button>
                <button type="button" onClick={() => runRule(selected)}>
                  Run now
                </button>
              </div>
            </div>

            <div className="freshAutomationCards">
              <section>
                <span>Trigger</span>
                <b>{selected.trigger}</b>
                <p>This is what Churvox watches for in the background.</p>
              </section>

              <section>
                <span>Action</span>
                <b>{selected.action}</b>
                <p>The action goes to Command first, not straight to the customer.</p>
              </section>

              <section>
                <span>Owner control</span>
                <b>Approve before it acts</b>
                <p>Approve, edit, decline or save for later.</p>
              </section>
            </div>

            <div className="freshAutomationFooter">
              <button type="button" onClick={() => onNavigate?.("command")}>Open Command</button>
              <button type="button" onClick={() => onNavigate?.("settings")}>Open Settings</button>
              <button type="button" onClick={() => onNavigate?.("reports")}>Open Reports</button>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
