import React from "react";

const QUOTE_STORAGE_KEY = "churvox:fresh-quotes:v1";
const JOB_STORAGE_KEY = "churvox:fresh-jobs:v1";

const seedQuotes = [
  {
    id: "QT-2041",
    client: "Birchville Rentals",
    title: "Driveway clean",
    status: "Sent",
    amount: 240,
    age: "Sent 6 days ago",
    followUp: "Follow-up ready for Command",
    note: "Customer has not replied. Churvox should prepare a polite follow-up, but owner approves first.",
    lines: ["Driveway clean · $190", "Water blasting setup · $35", "Green waste handling · $15"],
  },
  {
    id: "QT-2042",
    client: "Aroha Property Care",
    title: "Monthly grounds care",
    status: "Draft",
    amount: 420,
    age: "Draft today",
    followUp: "Not sent yet",
    note: "Draft quote needs owner check before sending.",
    lines: ["Fortnightly lawn care · $240", "Hedge tidy allowance · $120", "Waste allowance · $60"],
  },
  {
    id: "QT-2038",
    client: "Lower Hutt Medical Centre",
    title: "Entry hedge tidy",
    status: "Accepted",
    amount: 180,
    age: "Accepted yesterday",
    followUp: "Ready to convert to job",
    note: "Accepted quote can be converted into a scheduled job.",
    lines: ["Entry hedge trim · $120", "Green waste removal · $60"],
  },
];

const filters = ["All", "Draft", "Sent", "Accepted", "Declined"];

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function readJobs() {
  try {
    if (typeof window === "undefined") return [];

    const saved = window.localStorage.getItem(JOB_STORAGE_KEY);
    if (!saved) return [];

    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeJobs(jobs) {
  try {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(JOB_STORAGE_KEY, JSON.stringify(jobs));
    window.dispatchEvent(
      new CustomEvent("churvox:fresh-data-updated", {
        detail: { type: "job" },
      })
    );
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

function loadQuotes() {
  try {
    if (typeof window === "undefined") return seedQuotes;

    const saved = window.localStorage.getItem(QUOTE_STORAGE_KEY);
    if (!saved) return seedQuotes;

    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : seedQuotes;
  } catch {
    return seedQuotes;
  }
}

export default function FreshQuotes({ onNavigate }) {
  const [quotes, setQuotes] = React.useState(loadQuotes);
  const [selectedId, setSelectedId] = React.useState(quotes[0]?.id || "");
  const [filter, setFilter] = React.useState("All");

  const selected = quotes.find((quote) => quote.id === selectedId) || quotes[0];
  const visibleQuotes = filter === "All" ? quotes : quotes.filter((quote) => quote.status === filter);
  const sentTotal = quotes.filter((quote) => quote.status === "Sent").reduce((sum, quote) => sum + quote.amount, 0);
  const acceptedTotal = quotes.filter((quote) => quote.status === "Accepted").reduce((sum, quote) => sum + quote.amount, 0);

  React.useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(QUOTE_STORAGE_KEY, JSON.stringify(quotes));
      }
    } catch {
      // Fresh preview keeps working without local storage.
    }
  }, [quotes]);

  function updateSelectedQuote(patch) {
    if (!selected) return;

    setQuotes((current) =>
      current.map((quote) =>
        quote.id === selected.id
          ? { ...quote, ...patch }
          : quote
      )
    );
  }

  function resetQuotes() {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(QUOTE_STORAGE_KEY);
      }
    } catch {
      // Ignore preview storage errors.
    }

    setQuotes(seedQuotes);
    setSelectedId(seedQuotes[0].id);
    setFilter("All");
  }

  function convertToJob() {
    if (!selected) return;

    const job = {
      id: `job-${Date.now()}`,
      title: selected.title || "Converted quote job",
      client: selected.client || "New client",
      address: "Confirm service address",
      status: "Ready",
      worker: "Unassigned",
      scheduled: "Not scheduled",
      price: `$${Number(selected.amount || 0).toFixed(0)} quote`,
      notes: `Converted from quote ${selected.id}. ${selected.note || ""}`,
      risk: "Converted from accepted quote. Schedule and assign worker.",
    };

    const currentJobs = readJobs();
    writeJobs([job, ...currentJobs]);

    updateSelectedQuote({
      status: "Accepted",
      followUp: "Converted into job",
      age: "Accepted and converted now",
    });

    onNavigate?.("jobs");
  }

  return (
    <section>
      <header className="freshHero">
        <span>Churvox fresh · Quotes</span>
        <h1>Quotes</h1>
        <p>Draft quotes, send them, follow up missing replies and convert accepted work into jobs.</p>
      </header>

      <section className="freshCommandPulse">
        <aside className="freshCard">
          <h2>{money(sentTotal)}</h2>
          <p>Sent quote value</p>
        </aside>
        <aside className="freshCard">
          <h2>{money(acceptedTotal)}</h2>
          <p>Accepted value</p>
        </aside>
        <aside className="freshCard">
          <h2>{quotes.filter((quote) => quote.status === "Sent").length}</h2>
          <p>Need follow-up watch</p>
        </aside>
      </section>

      <section className="freshCommandFilterBar">
        {filters.map((item) => (
          <button
            type="button"
            key={item}
            className={filter === item ? "active" : ""}
            onClick={() => setFilter(item)}
          >
            <span>{item}</span>
            <b>{item === "All" ? quotes.length : quotes.filter((quote) => quote.status === item).length}</b>
          </button>
        ))}
      </section>

      <section className="freshGrid">
        <aside className="freshCard">
          <h2>Quote list</h2>

          {visibleQuotes.map((quote) => (
            <button
              type="button"
              className={`freshItem ${selected?.id === quote.id ? "active" : ""} ${quote.status === "Sent" ? "need" : ""}`}
              key={quote.id}
              onClick={() => setSelectedId(quote.id)}
            >
              <b>{quote.id}</b>
              <span>{quote.client} · {quote.status} · {money(quote.amount)}</span>
            </button>
          ))}

          {visibleQuotes.length === 0 && (
            <div className="freshItem">
              <b>No quotes</b>
              <span>Change filter or reset preview quotes.</span>
            </div>
          )}
        </aside>

        <section className="freshCard">
          <h2>{selected?.title || "Select quote"}</h2>

          {selected && (
            <>
              <div className="freshMiniGrid">
                <div>
                  <span>Quote</span>
                  <b>{selected.id}</b>
                </div>
                <div>
                  <span>Status</span>
                  <b>{selected.status}</b>
                </div>
                <div>
                  <span>Client</span>
                  <b>{selected.client}</b>
                </div>
                <div>
                  <span>Amount</span>
                  <b>{money(selected.amount)}</b>
                </div>
              </div>

              <div className={`freshQuoteStatus ${selected.status.toLowerCase()}`}>
                <b>{selected.age}</b>
                <span>{selected.followUp}</span>
              </div>

              <div className="freshQuoteLines">
                {selected.lines.map((line) => (
                  <div key={line}>
                    <span>{line}</span>
                  </div>
                ))}
              </div>

              <label className="freshField">
                <span>Quote title</span>
                <input
                  value={selected.title}
                  onChange={(event) => updateSelectedQuote({ title: event.target.value })}
                />
              </label>

              <label className="freshField">
                <span>Quote amount</span>
                <input
                  value={selected.amount}
                  onChange={(event) => updateSelectedQuote({ amount: Number(event.target.value.replace(/[^0-9.]/g, "")) || 0 })}
                />
              </label>

              <label className="freshField">
                <span>Owner quote note</span>
                <textarea
                  value={selected.note}
                  onChange={(event) => updateSelectedQuote({ note: event.target.value })}
                />
              </label>
            </>
          )}
        </section>

        <aside className="freshCard">
          <h2>Owner actions</h2>

          <div className="freshActions">
            <button className="freshPrimary" onClick={() => updateSelectedQuote({ status: "Sent", age: "Sent now", followUp: "Follow-up watch started" })}>
              Send quote
            </button>
            <button className="freshDark" onClick={() => updateSelectedQuote({ status: "Accepted", age: "Accepted now", followUp: "Ready to convert to job" })}>
              Mark accepted
            </button>
            <button className="freshOrange" onClick={convertToJob}>
              Convert to job
            </button>
            <button className="freshGhost" onClick={() => updateSelectedQuote({ status: "Declined", age: "Declined today", followUp: "No follow-up needed" })}>
              Mark declined
            </button>
            <button className="freshGhost" onClick={() => onNavigate?.("command")}>
              Send follow-up to Command
            </button>
            <button className="freshGhost" onClick={resetQuotes}>
              Reset quotes
            </button>
          </div>
        </aside>
      </section>
    </section>
  );
}
