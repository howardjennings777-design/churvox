import React from "react";

const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const examples = [
  "Create a job for John next Friday at 9 for lawn mowing $65",
  "Follow up the unpaid invoice for Belmont Customer",
  "Check if any invoices are missing extras",
  "Plan my day and tell me what to do first",
  "Find clients that need rebooking",
];

function analyse(text) {
  const lower = text.toLowerCase();

  if (lower.includes("invoice") && (lower.includes("missing") || lower.includes("extra") || lower.includes("check"))) {
    return {
      action: "Invoice check",
      page: "invoicecheck",
      found: "User asked Churvox to check invoices for missing extras.",
      prepared: "Open AI Invoice Checker and prepare review cards.",
      why: "This can catch unbilled work before invoices are sent.",
      urgency: "High",
    };
  }

  if (lower.includes("follow") || lower.includes("unpaid") || lower.includes("reminder")) {
    return {
      action: "Follow-up message",
      page: "followupwriter",
      found: "User asked Churvox to chase a quote, invoice or customer.",
      prepared: "Open AI Follow-up Writer and prepare an editable message.",
      why: "This keeps money and repeat work moving without awkward typing.",
      urgency: "High",
    };
  }

  if (lower.includes("plan") || lower.includes("day") || lower.includes("first")) {
    return {
      action: "Plan my day",
      page: "planday",
      found: "User asked Churvox to plan the day.",
      prepared: "Open AI Plan My Day with route order and next actions.",
      why: "Users should know what to do first without hunting through pages.",
      urgency: "Medium",
    };
  }

  if (lower.includes("rebook") || lower.includes("client") || lower.includes("customer")) {
    return {
      action: "Customer memory",
      page: "customermemory",
      found: "User asked about customers or rebooking.",
      prepared: "Open AI Customer Memory and show risks/opportunities.",
      why: "Repeat customers are easier to save than new customers.",
      urgency: "Medium",
    };
  }

  return {
    action: "Quick create",
    page: "quickcreateai",
    found: "User typed a rough job or quote instruction.",
    prepared: "Open AI Quick Create and structure it into clean work.",
    why: "This removes form friction and makes Churvox feel fast.",
    urgency: "High",
  };
}

function sendToCommand(result, text, onNavigate) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `ask-churvox-${Date.now()}`,
      group: "Ask Churvox",
      title: result.action,
      info: "Natural language command",
      urgency: result.urgency,
      found: `${result.found} User typed: ${text}`,
      prepared: result.prepared,
      why: result.why,
      owner: "Approve, edit, open area, or ignore.",
      area: "Ask Churvox",
      page: "askchurvox",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 70)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "ask-churvox" } }));
  } catch {
    // Preview keeps working without storage.
  }

  onNavigate?.("command");
}

export default function FreshAskChurvox({ onNavigate }) {
  const [text, setText] = React.useState(examples[0]);
  const result = analyse(text);

  return (
    <section className="freshAskPage">
      <div className="freshAskHero">
        <div>
          <span>Ask Churvox</span>
          <h1>One box for users who do not want to hunt</h1>
          <p>The user types what they want in normal words. Churvox decides the best area, prepares the action, and keeps owner approval in Command.</p>
        </div>

        <div className="freshAskStats">
          <div><b>1</b><small>simple box</small></div>
          <div><b>{result.action}</b><small>detected</small></div>
          <div><b>{result.urgency}</b><small>urgency</small></div>
          <div><b>Approve</b><small>control</small></div>
        </div>
      </div>

      <div className="freshAskGrid">
        <article className="freshAskPanel">
          <header>
            <span>Natural command</span>
            <h2>Type like normal</h2>
            <p>This is what makes the app smoother than normal job software.</p>
          </header>

          <textarea value={text} onChange={(event) => setText(event.target.value)} />

          <div className="freshAskExamples">
            {examples.map((example) => (
              <button type="button" key={example} onClick={() => setText(example)}>
                {example}
              </button>
            ))}
          </div>
        </article>

        <article className="freshAskPanel">
          <header>
            <span>Churvox prepared</span>
            <h2>{result.action}</h2>
            <p>{result.why}</p>
          </header>

          <div className="freshAskResult">
            <section>
              <b>AI found</b>
              <p>{result.found}</p>
            </section>
            <section>
              <b>AI prepared</b>
              <p>{result.prepared}</p>
            </section>
            <section>
              <b>Owner controls</b>
              <p>Approve, edit, open area, or ignore.</p>
            </section>
          </div>

          <div className="freshAskButtons">
            <button type="button" onClick={() => sendToCommand(result, text, onNavigate)}>Send to Command</button>
            <button type="button" onClick={() => onNavigate?.(result.page)}>Open best area</button>
            <button type="button" onClick={() => onNavigate?.("smart")}>Open Smart Hub</button>
            <button type="button" onClick={() => onNavigate?.("aioperator")}>Open AI Operator</button>
          </div>
        </article>
      </div>
    </section>
  );
}
