import React from "react";

const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const examples = [
  "upper hutt overgrown lawn hedge trim green waste maybe 2 hours",
  "belmont regular mow edges blower tidy fortnightly",
  "naenae garden reset weeds hedge and remove rubbish customer price sensitive",
];

function buildQuote(text) {
  const lower = text.toLowerCase();
  const hedge = lower.includes("hedge");
  const greenWaste = lower.includes("green");
  const weeds = lower.includes("weed");
  const reset = lower.includes("reset") || lower.includes("overgrown");
  const regular = lower.includes("regular") || lower.includes("fortnightly");
  const sensitive = lower.includes("price sensitive");

  const area =
    lower.includes("upper hutt") ? "Upper Hutt" :
    lower.includes("belmont") ? "Belmont" :
    lower.includes("naenae") ? "Naenae" :
    "Lower Hutt";

  const lines = [
    { label: reset ? "Overgrown lawn reset" : "Lawn mowing", price: reset ? 120 : 65 },
    hedge ? { label: "Hedge trim", price: 55 } : null,
    weeds ? { label: "Weed tidy", price: 35 } : null,
    greenWaste ? { label: "Green waste handling", price: 25 } : null,
  ].filter(Boolean);

  const total = lines.reduce((sum, item) => sum + item.price, 0);
  const option = sensitive ? "Offer staged option: lawn reset first, hedge later." : "Offer full tidy plus recurring maintenance option.";

  return {
    area,
    lines,
    total,
    terms: "Price includes labour and standard tidy. Extra green waste, hidden rubbish or extra time can be approved before invoicing.",
    message: `Hi, I’ve prepared your quote for ${area}. The total is $${total}. ${option}`,
    followUp: regular ? "Follow up tomorrow and offer fortnightly plan." : "Follow up in 2 days if not accepted.",
    option,
  };
}

function sendQuoteToCommand(quote, raw, onNavigate) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `ai-quote-${Date.now()}`,
      group: "AI Quote Builder",
      title: "Quote ready for owner approval",
      info: `${quote.area} · $${quote.total}`,
      urgency: "High",
      found: `Rough quote note: ${raw}`,
      prepared: quote.lines.map((line) => `${line.label} $${line.price}`).join(" · "),
      why: `${quote.option} Follow-up: ${quote.followUp}`,
      owner: "Approve quote, edit lines, send to customer, or open Quotes.",
      area: "AI Quote Builder",
      page: "quoteai",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 100)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "ai-quote" } }));
  } catch {
    // Preview keeps working without storage.
  }

  onNavigate?.("command");
}

export default function FreshAiQuoteBuilder({ onNavigate }) {
  const [text, setText] = React.useState(examples[0]);
  const quote = buildQuote(text);

  return (
    <section className="freshQuoteAiPage">
      <div className="freshQuoteAiHero">
        <div>
          <span>AI Quote Builder</span>
          <h1>Users type rough work notes. Churvox builds the quote.</h1>
          <p>Line items, price, terms, options and follow-up are prepared for owner approval instead of starting from a blank quote form.</p>
        </div>

        <div className="freshQuoteAiStats">
          <div><b>${quote.total}</b><small>total</small></div>
          <div><b>{quote.lines.length}</b><small>line items</small></div>
          <div><b>{quote.area}</b><small>area</small></div>
          <div><b>Approve</b><small>control</small></div>
        </div>
      </div>

      <div className="freshQuoteAiGrid">
        <article className="freshQuoteAiPanel">
          <header>
            <span>Rough note</span>
            <h2>Quote from plain English</h2>
            <p>This makes quoting feel faster than old job management apps.</p>
          </header>

          <textarea value={text} onChange={(event) => setText(event.target.value)} />

          <div className="freshQuoteAiExamples">
            {examples.map((example) => (
              <button type="button" key={example} onClick={() => setText(example)}>
                {example}
              </button>
            ))}
          </div>
        </article>

        <article className="freshQuoteAiPanel">
          <header>
            <span>AI prepared</span>
            <h2>Quote draft</h2>
            <p>Owner can edit before anything goes to the customer.</p>
          </header>

          <div className="freshQuoteAiLines">
            {quote.lines.map((line) => (
              <section key={line.label}>
                <b>{line.label}</b>
                <strong>${line.price}</strong>
              </section>
            ))}

            <section className="total">
              <b>Total</b>
              <strong>${quote.total}</strong>
            </section>
          </div>

          <div className="freshQuoteAiCopy">
            <b>Terms</b>
            <p>{quote.terms}</p>
            <b>Customer message</b>
            <p>{quote.message}</p>
            <b>Follow-up</b>
            <p>{quote.followUp}</p>
          </div>

          <div className="freshQuoteAiButtons">
            <button type="button" onClick={() => sendQuoteToCommand(quote, text, onNavigate)}>Send to Command</button>
            <button type="button" onClick={() => onNavigate?.("quotes")}>Open Quotes</button>
            <button type="button" onClick={() => onNavigate?.("followupwriter")}>Open Follow-up</button>
          </div>
        </article>
      </div>
    </section>
  );
}
