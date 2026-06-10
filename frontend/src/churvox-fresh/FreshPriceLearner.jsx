import React from "react";

const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const priceLessons = [
  {
    id: "price-1",
    job: "Overgrown lawn reset",
    area: "Upper Hutt",
    oldPrice: 190,
    suggestedLow: 229,
    suggestedHigh: 259,
    found: "Similar overgrown resets took 2.4 hours plus green waste.",
    prepared: "Suggest $229–$259 next time, or split into staged work.",
    why: "You have underpriced similar reset jobs before.",
    page: "quoteai",
    urgency: "High",
  },
  {
    id: "price-2",
    job: "Fortnightly lawn mow",
    area: "Belmont",
    oldPrice: 65,
    suggestedLow: 65,
    suggestedHigh: 75,
    found: "Regular mow margin is healthy, but travel time is increasing.",
    prepared: "Keep $65 if nearby jobs are grouped, otherwise move to $75.",
    why: "Good recurring work should stay profitable as route changes.",
    page: "recurring",
    urgency: "Medium",
  },
  {
    id: "price-3",
    job: "Handyman small repair",
    area: "Naenae",
    oldPrice: 120,
    suggestedLow: 145,
    suggestedHigh: 165,
    found: "Materials and setup time are often missed on small repairs.",
    prepared: "Suggest $145–$165 minimum callout with materials separate.",
    why: "Small jobs can quietly lose profit.",
    page: "profitguard",
    urgency: "High",
  },
];

function money(value) {
  return `$${Number(value || 0).toLocaleString("en-NZ")}`;
}

function sendPriceToCommand(item, onNavigate) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `price-learner-${item.id}-${Date.now()}`,
      group: "AI Price Learner",
      title: `Price suggestion: ${item.job}`,
      info: `${item.area} · ${money(item.suggestedLow)}–${money(item.suggestedHigh)}`,
      urgency: item.urgency,
      found: item.found,
      prepared: item.prepared,
      why: item.why,
      owner: "Approve suggestion, edit price, open quote, or ignore.",
      area: "Price Learner",
      page: "pricelearner",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 130)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "price-learner" } }));
  } catch {
    // Preview keeps working without storage.
  }

  onNavigate?.("command");
}

export default function FreshPriceLearner({ onNavigate }) {
  const [done, setDone] = React.useState({});
  const high = priceLessons.filter((item) => item.urgency === "High").length;
  const open = priceLessons.filter((item) => !done[item.id]).length;

  return (
    <section className="freshOwnerAiPage">
      <div className="freshOwnerAiHero">
        <div>
          <span>AI Price Learner</span>
          <h1>Churvox learns what jobs should really cost</h1>
          <p>It uses past job time, travel, materials and profit warnings to suggest smarter pricing before quotes go out.</p>
        </div>

        <div className="freshOwnerAiStats">
          <div><b>{priceLessons.length}</b><small>price lessons</small></div>
          <div><b>{high}</b><small>high risk</small></div>
          <div><b>{open}</b><small>open</small></div>
          <div><b>Range</b><small>suggested</small></div>
        </div>
      </div>

      <div className="freshOwnerAiGrid">
        {priceLessons.map((item) => (
          <article key={item.id} className={done[item.id] ? "freshOwnerAiCard done" : "freshOwnerAiCard"}>
            <header>
              <span>{item.urgency}</span>
              <h2>{item.job}</h2>
              <small>{item.area} · old price {money(item.oldPrice)}</small>
            </header>

            <p><strong>AI found:</strong> {item.found}</p>
            <p><strong>AI prepared:</strong> {item.prepared}</p>
            <p><strong>Suggested range:</strong> {money(item.suggestedLow)}–{money(item.suggestedHigh)}</p>

            <div className="freshOwnerAiButtons">
              <button type="button" onClick={() => sendPriceToCommand(item, onNavigate)}>Send to Command</button>
              <button type="button" onClick={() => onNavigate?.(item.page)}>Open area</button>
              <button type="button" onClick={() => setDone({ ...done, [item.id]: true })}>
                {done[item.id] ? "Saved" : "Save lesson"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
