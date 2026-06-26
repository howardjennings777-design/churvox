import React from "react";
import "./freshPayrollCompact.css";

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
    risk: "Payroll is CSV only. No tax or payment files.",
  },
];

const emptyRule = {
  name: "",
  trigger: "",
  action: "Prepare owner approval slip",
  status: "On",
  risk: "Owner approves before anything is sent or changed.",
};

function readRules() {
  try {
    if (typeof window === "undefined") return defaults;
    const saved = window.localStorage.getItem(AUTOMATION_KEY);
    if (!saved) return defaults;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) && parsed.length ? parsed : defaults;
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

function readCommandInbox() {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function sendRuleToCommand(rule) {
  try {
    const slip = {
      id: `automation-${rule.id}-${Date.now()}`,
      group: "Automation",
      title: rule.name,
      info: `${rule.trigger} · ${rule.action}`,
      urgency: rule.status === "On" ? "Ready to review" : "Rule is off",
      found: `Automation rule checked: ${rule.trigger}.`,
      prepared: rule.action,
      why: rule.risk,
      owner: "Approve, edit, ignore or open the matching area. No customer or money action runs without approval.",
      area: "Automation",
      page: "automation",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...readCommandInbox()].slice(0, 30)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "automation-command" } }));
    return true;
  } catch {
    return false;
  }
}

export default function FreshAutomation({ onNavigate }) {
  const [rules, setRules] = React.useState(readRules);
  const [selectedId, setSelectedId] = React.useState(() => readRules()[0]?.id || "");
  const [draft, setDraft] = React.useState(emptyRule);
  const [statusMessage, setStatusMessage] = React.useState("");
  const selected = rules.find((rule) => rule.id === selectedId) || rules[0];

  const onCount = rules.filter((rule) => rule.status === "On").length;
  const offCount = rules.filter((rule) => rule.status === "Off").length;

  React.useEffect(() => {
    if (!selected && rules.length) setSelectedId(rules[0].id);
  }, [rules, selected]);

  function persist(next) {
    setRules(next);
    saveRules(next);
  }

  function updateRule(id, patch) {
    persist(rules.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)));
  }

  function toggleRule(rule) {
    updateRule(rule.id, { status: rule.status === "On" ? "Off" : "On" });
    setStatusMessage(`${rule.name} turned ${rule.status === "On" ? "off" : "on"}.`);
  }

  function runRule(rule) {
    if (!rule) return;
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    updateRule(rule.id, { lastRun: now });
    const ok = sendRuleToCommand(rule);
    setStatusMessage(ok ? `${rule.name} prepared in Command for owner approval.` : "Could not add this automation to Command.");
    if (ok) onNavigate?.("command");
  }

  function addRule() {
    const name = draft.name.trim();
    const trigger = draft.trigger.trim();
    const action = draft.action.trim();
    if (!name || !trigger || !action) {
      setStatusMessage("Add a rule name, trigger and action first.");
      return;
    }
    const nextRule = { ...draft, id: `auto-custom-${Date.now()}`, name, trigger, action, lastRun: "Not run yet" };
    persist([nextRule, ...rules]);
    setSelectedId(nextRule.id);
    setDraft(emptyRule);
    setStatusMessage("Automation rule added. It will prepare work for Command approval, not act by itself.");
  }

  function deleteRule(rule) {
    if (!rule) return;
    const next = rules.filter((item) => item.id !== rule.id);
    persist(next.length ? next : defaults);
    setSelectedId((next.length ? next : defaults)[0]?.id || "");
    setStatusMessage(`${rule.name} removed.`);
  }

  function resetRules() {
    persist(defaults);
    setSelectedId(defaults[0]?.id || "");
    setStatusMessage("Automation rules reset to launch defaults.");
  }

  return (
    <section className="freshAutomationPage freshPayrollCompactPage" data-owner-approved-automation="20260626">
      <div className="freshAutomationHero">
        <div>
          <span>Owner-approved rules</span>
          <h1>Automation</h1>
          <p>Set simple rules for follow-ups, blocked jobs and admin checks. Churvox prepares the action; the owner approves it in Command.</p>
        </div>

        <div className="freshAutomationStats">
          <div><b>{rules.length}</b><small>rules</small></div>
          <div><b>{onCount}</b><small>on</small></div>
          <div><b>{offCount}</b><small>off</small></div>
        </div>
      </div>

      {statusMessage ? <section className="freshItem"><b>Automation status</b><span>{statusMessage}</span></section> : null}

      <div className="freshAutomationLayout">
        <aside className="freshAutomationList">
          <header>
            <div>
              <b>Automation rules</b>
              <span>Owner-approved actions only</span>
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
                  Run to Command
                </button>
              </div>
            </div>

            <div className="freshAutomationCards">
              <section>
                <span>Trigger</span>
                <b>{selected.trigger}</b>
                <p>This is what Churvox checks before preparing an owner approval slip.</p>
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

            <div className="freshAutomationCards">
              <section>
                <span>Edit selected rule</span>
                <label className="freshField"><span>Name</span><input value={selected.name} onChange={(event) => updateRule(selected.id, { name: event.target.value })} /></label>
                <label className="freshField"><span>Trigger</span><input value={selected.trigger} onChange={(event) => updateRule(selected.id, { trigger: event.target.value })} /></label>
                <label className="freshField"><span>Action</span><input value={selected.action} onChange={(event) => updateRule(selected.id, { action: event.target.value })} /></label>
                <label className="freshField"><span>Why / guardrail</span><textarea value={selected.risk} onChange={(event) => updateRule(selected.id, { risk: event.target.value })} /></label>
              </section>
            </div>

            <div className="freshAutomationFooter">
              <button type="button" onClick={() => onNavigate?.("command")}>Open Command</button>
              <button type="button" onClick={() => onNavigate?.("settings")}>Open Settings</button>
              <button type="button" onClick={() => onNavigate?.("reports")}>Open Reports</button>
              <button type="button" onClick={() => deleteRule(selected)}>Delete rule</button>
            </div>
          </article>
        )}
      </div>

      <section className="freshGrid two" style={{ marginTop: 14 }}>
        <section className="freshCard">
          <h2>Add owner-approved automation</h2>
          <label className="freshField"><span>Rule name</span><input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Materials reminder" /></label>
          <label className="freshField"><span>Trigger</span><input value={draft.trigger} onChange={(event) => setDraft((current) => ({ ...current, trigger: event.target.value }))} placeholder="Job starts tomorrow and materials are missing" /></label>
          <label className="freshField"><span>Action</span><input value={draft.action} onChange={(event) => setDraft((current) => ({ ...current, action: event.target.value }))} placeholder="Prepare reminder for owner approval" /></label>
          <label className="freshField"><span>Guardrail</span><textarea value={draft.risk} onChange={(event) => setDraft((current) => ({ ...current, risk: event.target.value }))} /></label>
          <div className="freshActions"><button type="button" className="freshPrimary" onClick={addRule}>Add rule</button><button type="button" className="freshGhost" onClick={() => setDraft(emptyRule)}>Clear</button></div>
        </section>
        <aside className="freshCard">
          <h2>Launch guardrails</h2>
          <div className="freshItem need"><b>No silent sending</b><span>Customer reminders go to Command first.</span></div>
          <div className="freshItem need"><b>No payroll payment files</b><span>Payroll stays review and export only.</span></div>
          <div className="freshItem"><b>No accounting surprises</b><span>Invoice/payment sync stays owner-controlled.</span></div>
        </aside>
      </section>
    </section>
  );
}
