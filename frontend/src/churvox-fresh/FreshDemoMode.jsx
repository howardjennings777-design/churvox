import React from "react";

const DEMO_KEY = "churvox:fresh-demo-mode:v1";
const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const demoSlips = [
  {
    group: "AI Operator",
    title: "Quote follow-up ready",
    info: "Upper Hutt lead · $190 quote",
    urgency: "High",
    found: "Garden reset quote has not been accepted after 2 days.",
    prepared: "Polite follow-up message ready for owner approval.",
    why: "This job may be lost if nobody follows up today.",
    owner: "Approve / edit / ignore.",
    area: "Demo Mode",
    page: "demo",
  },
  {
    group: "AI Operator",
    title: "Invoice may be missing extra",
    info: "Belmont lawn reset · possible $45",
    urgency: "High",
    found: "Worker note says hedge trim was completed but invoice has no extra line.",
    prepared: "Add $45 hedge trim line before invoice is sent.",
    why: "Churvox catches unbilled work.",
    owner: "Approve / edit / ignore.",
    area: "Demo Mode",
    page: "demo",
  },
  {
    group: "Worker",
    title: "Worker has not acknowledged job",
    info: "Naenae repair · today",
    urgency: "Medium",
    found: "Assigned worker has not acknowledged the job.",
    prepared: "Reminder message ready.",
    why: "Owner should know before the customer is disappointed.",
    owner: "Send reminder / reassign / ignore.",
    area: "Demo Mode",
    page: "demo",
  },
];

function loadDemo(onNavigate, setLoaded) {
  try {
    const slips = demoSlips.map((slip, index) => ({
      ...slip,
      id: `demo-slip-${Date.now()}-${index}`,
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }));

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify(slips));
    window.localStorage.setItem(DEMO_KEY, JSON.stringify({ loaded: true, loadedAt: new Date().toISOString() }));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "demo-load" } }));
    setLoaded(true);
  } catch {
    // Preview still works without storage.
  }

  onNavigate?.("command");
}

function clearDemo(setLoaded) {
  try {
    window.localStorage.removeItem(COMMAND_INBOX_KEY);
    window.localStorage.removeItem(DEMO_KEY);
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "demo-clear" } }));
  } catch {
    // Preview still works without storage.
  }

  setLoaded(false);
}

export default function FreshDemoMode({ onNavigate }) {
  const [loaded, setLoaded] = React.useState(() => {
    try {
      return Boolean(window.localStorage.getItem(DEMO_KEY));
    } catch {
      return false;
    }
  });

  const examples = [
    ["Demo business", "Hutt Valley Lawns"],
    ["Client examples", "Belmont Customer, Upper Hutt Lead, Naenae Property"],
    ["AI examples", "Quote follow-up, invoice checker, worker reminder"],
    ["Launch purpose", "Let a user understand Churvox in 2 minutes"],
  ];

  return (
    <section className="freshDemoPage">
      <div className="freshDemoHero">
        <div>
          <span>Demo Mode</span>
          <h1>Let users feel Churvox without setting everything up first</h1>
          <p>A serious SaaS demo should be one click: load realistic work, open Command, approve actions, then reset clean.</p>
        </div>

        <div className="freshDemoStats">
          <div><b>{loaded ? "On" : "Off"}</b><small>preview mode</small></div>
          <div><b>3</b><small>AI slips</small></div>
          <div><b>2 min</b><small>first value</small></div>
          <div><b>Reset</b><small>safe testing</small></div>
        </div>
      </div>

      <div className="freshDemoGrid">
        <article className="freshDemoPanel">
          <header>
            <span>Fast demo</span>
            <h2>Load a real-feeling business</h2>
            <p>This gives a new user something useful to approve straight away, instead of staring at an empty app.</p>
          </header>

          <div className="freshDemoButtons">
            <button type="button" onClick={() => loadDemo(onNavigate, setLoaded)}>Load demo and open Command</button>
            <button type="button" onClick={() => clearDemo(setLoaded)}>Clear demo data</button>
            <button type="button" onClick={() => onNavigate?.("smart")}>Open Dashboard</button>
            <button type="button" onClick={() => onNavigate?.("launchpack")}>Open Launch Pack</button>
          </div>
        </article>

        <article className="freshDemoPanel">
          <header>
            <span>What loads</span>
            <h2>Demo story</h2>
            <p>The demo should show why Churvox is different: AI finds admin, prepares work, owner approves.</p>
          </header>

          <div className="freshDemoExamples">
            {examples.map(([label, value]) => (
              <section key={label}>
                <b>{label}</b>
                <p>{value}</p>
              </section>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
