import React from "react";

const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const opportunities = [
  {
    id: "up-1",
    client: "Belmont Customer",
    current: "Fortnightly lawn mow",
    offer: "Seasonal hedge + green waste package",
    value: 120,
    urgency: "Medium",
    found: "Customer often asks about tidy edges and hedge touch-ups.",
    prepared: "Soft package offer after next good job.",
    message: "Since we’re already doing the lawns, I can also add a seasonal hedge tidy and green waste option if that helps keep everything under control.",
    page: "customermemory",
  },
  {
    id: "up-2",
    client: "Upper Hutt Lead",
    current: "One-off garden reset quote",
    offer: "Reset now + monthly maintenance",
    value: 260,
    urgency: "High",
    found: "Overgrown reset customer is likely to need ongoing maintenance.",
    prepared: "Offer staged reset and monthly plan.",
    message: "We can do the reset first, then keep it under control with a simple monthly maintenance visit if you’d like.",
    page: "quoteai",
  },
  {
    id: "up-3",
    client: "Naenae Property",
    current: "Small handyman repair",
    offer: "Property maintenance check",
    value: 145,
    urgency: "Low",
    found: "Customer pays on time and likes clear updates.",
    prepared: "Offer a small maintenance check, not a hard sell.",
    message: "If helpful, I can also do a quick maintenance check next time and point out anything small before it becomes a bigger job.",
    page: "clients",
  },
];

function money(value) {
  return `$${Number(value || 0).toLocaleString("en-NZ")}`;
}

function sendUpsellToCommand(item, onNavigate) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `upsell-finder-${item.id}-${Date.now()}`,
      group: "AI Upsell Finder",
      title: `Package opportunity: ${item.client}`,
      info: `${item.offer} · ${money(item.value)}`,
      urgency: item.urgency,
      found: item.found,
      prepared: item.message,
      why: "The best upsell is helpful, timely and based on real customer history.",
      owner: "Approve message, edit, open client, or ignore.",
      area: "Upsell Finder",
      page: "upsellfinder",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 130)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "upsell-finder" } }));
  } catch {
    // Preview keeps working without storage.
  }

  onNavigate?.("command");
}

export default function FreshUpsellFinder({ onNavigate }) {
  const [sent, setSent] = React.useState({});
  const total = opportunities.reduce((sum, item) => sum + item.value, 0);

  return (
    <section className="freshOwnerAiPage">
      <div className="freshOwnerAiHero">
        <div>
          <span>AI Upsell / Package Finder</span>
          <h1>Find helpful extra work without being pushy</h1>
          <p>Churvox looks at customer history and job patterns, then suggests soft package offers that make sense.</p>
        </div>

        <div className="freshOwnerAiStats">
          <div><b>{opportunities.length}</b><small>opportunities</small></div>
          <div><b>{money(total)}</b><small>possible value</small></div>
          <div><b>{Object.keys(sent).length}</b><small>prepared</small></div>
          <div><b>Soft</b><small>not pushy</small></div>
        </div>
      </div>

      <div className="freshOwnerAiGrid">
        {opportunities.map((item) => (
          <article key={item.id} className={sent[item.id] ? "freshOwnerAiCard done" : "freshOwnerAiCard"}>
            <header>
              <span>{item.urgency}</span>
              <h2>{item.client}</h2>
              <small>{item.current}</small>
            </header>

            <p><strong>Opportunity:</strong> {item.offer} · {money(item.value)}</p>
            <p><strong>AI found:</strong> {item.found}</p>
            <p><strong>Message:</strong> {item.message}</p>

            <div className="freshOwnerAiButtons">
              <button type="button" onClick={() => { setSent({ ...sent, [item.id]: true }); sendUpsellToCommand(item, onNavigate); }}>
                Send to Command
              </button>
              <button type="button" onClick={() => onNavigate?.(item.page)}>Open area</button>
              <button type="button" onClick={() => setSent({ ...sent, [item.id]: true })}>
                {sent[item.id] ? "Prepared" : "Mark prepared"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
