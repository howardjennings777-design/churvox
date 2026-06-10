import React from "react";

const quotes = [
  {
    id: 1,
    number: "QT-2041",
    client: "Birchville Rentals",
    job: "Driveway clean",
    status: "Sent",
    amount: "$240.00",
    age: "Sent 6 days ago",
    risk: "Follow-up should go to Command before sending.",
    notes: "Driveway clean, moss treatment and rinse down. Tenant access needs confirmation.",
    lines: ["Driveway clean · $190", "Moss treatment · $35", "GST included · $15"],
  },
  {
    id: 2,
    number: "QT-2042",
    client: "Aroha Property Care",
    job: "Monthly hedge package",
    status: "Draft",
    amount: "$320.00",
    age: "Not sent",
    risk: "Needs owner review before sending.",
    notes: "Monthly hedge trimming, green waste removal and tidy finish.",
    lines: ["Hedge trim · $245", "Green waste · $45", "GST included · $30"],
  },
  {
    id: 3,
    number: "QT-2038",
    client: "Lower Hutt Medical Centre",
    job: "Seasonal garden reset",
    status: "Accepted",
    amount: "$690.00",
    age: "Accepted today",
    risk: "Ready to convert into a job.",
    notes: "Seasonal reset with garden tidy, weed control and green waste.",
    lines: ["Garden reset · $520", "Weed control · $80", "Green waste · $90"],
  },
];

export default function FreshQuotes({ onNavigate }) {
  const [selectedId, setSelectedId] = React.useState(1);
  const selected = quotes.find((quote) => quote.id === selectedId) || quotes[0];

  return (
    <section>
      <header className="freshHero">
        <span>Churvox fresh · Quotes</span>
        <h1>Quotes</h1>
        <p>Quote desk. Draft, send, follow up, and convert accepted work into jobs without losing owner control.</p>
      </header>

      <section className="freshGrid">
        <aside className="freshCard">
          <h2>Quote list</h2>
          <p>Drafts, sent quotes, follow-ups and accepted work.</p>

          {quotes.map((quote) => (
            <button
              type="button"
              key={quote.id}
              className={`freshItem ${quote.status === "Draft" || quote.status === "Sent" ? "need" : ""} ${selected.id === quote.id ? "active" : ""}`}
              style={{ width: "100%", textAlign: "left", cursor: "pointer" }}
              onClick={() => setSelectedId(quote.id)}
            >
              <b>{quote.number} · {quote.amount}</b>
              <span>{quote.client} · {quote.status}</span>
            </button>
          ))}
        </aside>

        <section className="freshCard">
          <h2>{selected.number}</h2>

          <div className="freshTabs">
            <span className="active">Review</span>
            <span>Lines</span>
            <span>Customer</span>
            <span>Follow-up</span>
          </div>

          <label className="freshField">
            <span>Client</span>
            <input value={selected.client} readOnly />
          </label>

          <label className="freshField">
            <span>Work</span>
            <input value={selected.job} readOnly />
          </label>

          <label className="freshField">
            <span>Status</span>
            <input value={selected.status} readOnly />
          </label>

          <label className="freshField">
            <span>Total</span>
            <input value={selected.amount} readOnly />
          </label>

          <label className="freshField">
            <span>Age</span>
            <input value={selected.age} readOnly />
          </label>

          <label className="freshField">
            <span>Quote notes</span>
            <textarea value={selected.notes} readOnly />
          </label>
        </section>

        <aside className="freshCard">
          <h2>Owner actions</h2>
          <p>Quotes should move work forward, but follow-ups still need owner approval.</p>

          <div className={`freshItem ${selected.status === "Accepted" ? "" : "need"}`}>
            <b>Command check</b>
            <span>{selected.risk}</span>
          </div>

          <div className="freshActions">
            <button className="freshPrimary">Save quote</button>
            <button className="freshOrange">Send quote</button>
            <button className="freshDark" onClick={() => onNavigate?.("jobs")}>Convert to job</button>
            <button className="freshGhost" onClick={() => onNavigate?.("command")}>Send follow-up to Command</button>
          </div>

          <div className="freshItem">
            <b>Status flow</b>
            <span>Draft → Sent → Viewed → Accepted → Job</span>
          </div>
        </aside>
      </section>

      <section className="freshGrid two" style={{ marginTop: 14 }}>
        <section className="freshCard">
          <h2>Quote lines</h2>
          {selected.lines.map((line) => (
            <div className="freshItem" key={line}>
              <b>{line}</b>
              <span>Prepared for owner review</span>
            </div>
          ))}
        </section>

        <aside className="freshCard">
          <h2>Quote rules</h2>
          <div className="freshItem need">
            <b>Follow-ups go to Command</b>
            <span>No automatic chasing without owner approval.</span>
          </div>
          <div className="freshItem">
            <b>Accepted quotes become jobs</b>
            <span>Owner can convert the quote into scheduled work.</span>
          </div>
        </aside>
      </section>
    </section>
  );
}
