import React from "react";

const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const examples = [
  "mow john lawn next friday 9ish $65 front and back take photos",
  "quote sarah upper hutt overgrown lawn hedge green waste maybe 190",
  "book naenae handyman repair tomorrow 2pm $120 bring screws",
];

function guess(text) {
  const lower = text.toLowerCase();
  const price = text.match(/\$?\b(\d{2,5})\b/)?.[1] || "";
  const isQuote = lower.includes("quote");
  const service =
    lower.includes("hedge") ? "Hedge / garden work" :
    lower.includes("handyman") || lower.includes("repair") ? "Handyman repair" :
    lower.includes("clean") ? "Cleaning" :
    "Lawn mowing";

  const client =
    lower.includes("john") ? "John" :
    lower.includes("sarah") ? "Sarah" :
    lower.includes("naenae") ? "Naenae customer" :
    "New customer";

  const area =
    lower.includes("upper hutt") ? "Upper Hutt" :
    lower.includes("naenae") ? "Naenae" :
    lower.includes("belmont") ? "Belmont" :
    "Lower Hutt";

  const time =
    lower.includes("9") ? "9:00 AM" :
    lower.includes("2pm") || lower.includes("2 pm") ? "2:00 PM" :
    "Confirm time";

  const date =
    lower.includes("tomorrow") ? "Tomorrow" :
    lower.includes("friday") ? "Next Friday" :
    "Confirm date";

  return {
    type: isQuote ? "Quote" : "Job",
    client,
    service,
    area,
    date,
    time,
    price: price ? `$${price}` : "Price needed",
    workerBrief: `${service}. ${area}. ${lower.includes("photos") ? "Take before and after photos. " : ""}${lower.includes("green waste") ? "Green waste included. " : ""}${lower.includes("front") ? "Front and back area. " : ""}`.trim(),
    customerMessage: `Hi ${client}, Churvox has prepared your ${isQuote ? "quote" : "booking"} for ${service.toLowerCase()} in ${area}. Proposed time: ${date} at ${time}.`,
    missing: [
      !price && "price",
      date === "Confirm date" && "date",
      time === "Confirm time" && "time",
    ].filter(Boolean),
  };
}

function sendToCommand(parsed, raw, onNavigate) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `quick-create-${Date.now()}`,
      group: "AI Quick Create",
      title: `${parsed.type} ready for owner approval`,
      info: `${parsed.client} · ${parsed.service} · ${parsed.price}`,
      urgency: parsed.missing.length ? "Medium" : "High",
      found: `Raw note: ${raw}`,
      prepared: `${parsed.type}: ${parsed.client}, ${parsed.service}, ${parsed.area}, ${parsed.date}, ${parsed.time}, ${parsed.price}.`,
      why: parsed.missing.length ? `Missing info still needed: ${parsed.missing.join(", ")}.` : "The messy note has been turned into a clean action.",
      owner: "Approve, edit, or open Jobs/Quotes.",
      area: "AI Quick Create",
      page: "quickcreate",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 50)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "quick-create" } }));
  } catch {
    // Preview keeps working without storage.
  }

  onNavigate?.("command");
}

export default function FreshAiQuickCreate({ onNavigate }) {
  const [text, setText] = React.useState(examples[0]);
  const [parsed, setParsed] = React.useState(() => guess(examples[0]));

  function run() {
    setParsed(guess(text));
  }

  return (
    <section className="freshQuickAiPage">
      <div className="freshQuickAiHero">
        <div>
          <span>AI Quick Create</span>
          <h1>Turn messy trade notes into clean work</h1>
          <p>A user should not need to fill ten fields first. They type rough text, Churvox structures it, then sends it to Command for approval.</p>
        </div>

        <div className="freshQuickAiStats">
          <div><b>{parsed.type}</b><small>detected</small></div>
          <div><b>{parsed.price}</b><small>price</small></div>
          <div><b>{parsed.missing.length}</b><small>missing</small></div>
          <div><b>Approve</b><small>owner control</small></div>
        </div>
      </div>

      <div className="freshQuickAiGrid">
        <article className="freshQuickAiPanel">
          <header>
            <span>Messy input</span>
            <h2>Type it like a tradie would</h2>
            <p>This is the smooth feature: no perfect form needed at the start.</p>
          </header>

          <textarea value={text} onChange={(event) => setText(event.target.value)} />

          <div className="freshQuickAiButtons">
            <button type="button" onClick={run}>Analyse note</button>
            <button type="button" onClick={() => setText(examples[0])}>Example job</button>
            <button type="button" onClick={() => setText(examples[1])}>Example quote</button>
            <button type="button" onClick={() => setText(examples[2])}>Example repair</button>
          </div>
        </article>

        <article className="freshQuickAiPanel">
          <header>
            <span>AI prepared</span>
            <h2>{parsed.type} draft</h2>
            <p>Owner stays in control. AI prepares the work, but does not send blindly.</p>
          </header>

          <div className="freshQuickAiResult">
            <section><b>Client</b><p>{parsed.client}</p></section>
            <section><b>Service</b><p>{parsed.service}</p></section>
            <section><b>Area</b><p>{parsed.area}</p></section>
            <section><b>Date / time</b><p>{parsed.date} · {parsed.time}</p></section>
            <section><b>Price</b><p>{parsed.price}</p></section>
            <section><b>Missing</b><p>{parsed.missing.length ? parsed.missing.join(", ") : "Nothing obvious"}</p></section>
          </div>

          <div className="freshQuickAiPrepared">
            <b>Worker brief</b>
            <p>{parsed.workerBrief}</p>
            <b>Customer message</b>
            <p>{parsed.customerMessage}</p>
          </div>

          <div className="freshQuickAiButtons">
            <button type="button" onClick={() => sendToCommand(parsed, text, onNavigate)}>Send to Command</button>
            <button type="button" onClick={() => onNavigate?.("jobs")}>Open Jobs</button>
            <button type="button" onClick={() => onNavigate?.("quotes")}>Open Quotes</button>
          </div>
        </article>
      </div>
    </section>
  );
}
