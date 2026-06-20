import React from "react";
import { useApi } from "../hooks/useApi";
import QuoteCreateForm from "../components/forms/QuoteCreateForm";
import { hideDemoRecords } from "./freshDemoRecords";
import "./freshRoutePopups.css";

const filters = ["All", "Draft", "Sent", "Accepted", "Declined"];

function listFrom(payload) {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.quotes)) return data.quotes;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.quotes)) return data.data.quotes;
  return [];
}

function idOf(value, fallback) {
  const raw = value?.id || value?._id || value?.quote_id || value?.quote_number || fallback;
  if (typeof raw === "object") return raw.$oid || raw.id || raw._id || fallback;
  return String(raw || fallback);
}

function statusOf(value) {
  const text = String(value || "draft").toLowerCase();
  if (text.includes("accept")) return "Accepted";
  if (text.includes("declin")) return "Declined";
  if (text.includes("sent")) return "Sent";
  return "Draft";
}

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function dateScore(quote) {
  const raw = quote?.created_at || quote?.createdAt || quote?.updated_at || quote?.updatedAt || "";
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeQuote(quote, index) {
  const id = idOf(quote, `quote-${index}`);
  const status = statusOf(quote?.status);
  const amount = Number(quote?.price ?? quote?.amount ?? quote?.total ?? 0) || 0;

  return {
    ...quote,
    id,
    title: quote?.title || quote?.job_description || quote?.description || quote?.quote_number || id,
    client: quote?.client_name || quote?.customer_name || quote?.client || "No client linked",
    status,
    amount,
    age: quote?.created_at ? `Created ${new Date(quote.created_at).toLocaleDateString()}` : "Real quote",
    followUp: status === "Sent" ? "Follow-up watch" : status === "Accepted" ? "Ready to convert to job" : "Owner review",
    note: quote?.notes || quote?.note || "No notes yet",
    lines: Array.isArray(quote?.lines)
      ? quote.lines
      : [quote?.job_description || quote?.description || quote?.notes || "Quote item"],
    sortTime: dateScore(quote),
  };
}

export default function FreshQuotes({ onNavigate }) {
  const { get } = useApi();
  const [quotes, setQuotes] = React.useState([]);
  const [selectedId, setSelectedId] = React.useState("");
  const [filter, setFilter] = React.useState("All");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [quotePopupOpen, setQuotePopupOpen] = React.useState(false);

  const visibleQuotes = filter === "All" ? quotes : quotes.filter((quote) => quote.status === filter);
  const selected = quotes.find((quote) => quote.id === selectedId) || visibleQuotes[0] || quotes[0];
  const sentTotal = quotes.filter((quote) => quote.status === "Sent").reduce((sum, quote) => sum + quote.amount, 0);
  const acceptedTotal = quotes.filter((quote) => quote.status === "Accepted").reduce((sum, quote) => sum + quote.amount, 0);

  const loadQuotes = React.useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await get("/quotes", { timeout: 25000 });

    if (!res.success) {
      setQuotes([]);
      setSelectedId("");
      setError(res.error || "Could not load real quotes");
      setLoading(false);
      return;
    }

    const nextQuotes = hideDemoRecords(listFrom(res.data))
      .map(normalizeQuote)
      .sort((a, b) => b.sortTime - a.sortTime || String(b.id).localeCompare(String(a.id)));

    setQuotes(nextQuotes);
    setSelectedId((current) => nextQuotes.some((quote) => quote.id === current) ? current : nextQuotes[0]?.id || "");
    setLoading(false);
  }, [get]);

  React.useEffect(() => {
    loadQuotes();
  }, [loadQuotes]);

  React.useEffect(() => {
    const onFreshDataUpdated = () => loadQuotes();
    window.addEventListener("churvox:fresh-data-updated", onFreshDataUpdated);
    return () => window.removeEventListener("churvox:fresh-data-updated", onFreshDataUpdated);
  }, [loadQuotes]);

  function openQuotePopup() {
    setQuotePopupOpen(true);
  }

  return (
    <section>
      <header className="freshHero">
        <span>Churvox fresh · Quotes</span>
        <h1>Quotes</h1>
        <p>Real quote records from your business account. New quotes should appear here after save.</p>
      </header>

      <section className="freshCommandPulse">
        <aside className="freshCard">
          <h2>{loading && quotes.length === 0 ? "…" : money(sentTotal)}</h2>
          <p>Sent quote value</p>
        </aside>
        <aside className="freshCard">
          <h2>{loading && quotes.length === 0 ? "…" : money(acceptedTotal)}</h2>
          <p>Accepted value</p>
        </aside>
        <aside className="freshCard">
          <h2>{loading && quotes.length === 0 ? "…" : quotes.length}</h2>
          <p>Total quotes</p>
        </aside>
      </section>

      {error ? (
        <section className="freshCard freshItem need">
          <b>Could not load quotes</b>
          <span>{error}</span>
          <button type="button" className="freshPrimary" onClick={loadQuotes}>Retry</button>
        </section>
      ) : null}

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

          {loading && quotes.length === 0 ? (
            <div className="freshItem">
              <b>Loading real quotes…</b>
              <span>Checking your business account.</span>
            </div>
          ) : visibleQuotes.map((quote) => (
            <button
              type="button"
              className={`freshItem ${selected?.id === quote.id ? "active" : ""} ${quote.status === "Sent" ? "need" : ""}`}
              key={quote.id}
              onClick={() => setSelectedId(quote.id)}
            >
              <b>{quote.title}</b>
              <span>{quote.client} · {quote.status} · {money(quote.amount)}</span>
            </button>
          ))}

          {loading && quotes.length > 0 ? (
            <div className="freshItem">
              <b>Refreshing quotes…</b>
              <span>Showing saved quotes while Churvox refreshes.</span>
            </div>
          ) : null}

          {!loading && visibleQuotes.length === 0 ? (
            <div className="freshItem">
              <b>No quotes</b>
              <span>Create your first real quote to start the workflow.</span>
            </div>
          ) : null}
        </aside>

        <section className="freshCard">
          <h2>{selected?.title || "Select quote"}</h2>

          {selected ? (
            <>
              <div className="freshMiniGrid">
                <div><span>Quote</span><b>{selected.id}</b></div>
                <div><span>Status</span><b>{selected.status}</b></div>
                <div><span>Client</span><b>{selected.client}</b></div>
                <div><span>Amount</span><b>{money(selected.amount)}</b></div>
              </div>

              <div className={`freshQuoteStatus ${selected.status.toLowerCase()}`}>
                <b>{selected.age}</b>
                <span>{selected.followUp}</span>
              </div>

              <div className="freshQuoteLines">
                {selected.lines.map((line, index) => (
                  <div key={`${selected.id}-${index}`}>
                    <span>{String(line)}</span>
                  </div>
                ))}
              </div>

              <label className="freshField">
                <span>Owner quote note</span>
                <textarea value={selected.note} readOnly />
              </label>
            </>
          ) : (
            <div className="freshItem">
              <b>No quote selected</b>
              <span>Create a quote to see the connected detail record.</span>
            </div>
          )}
        </section>

        <aside className="freshCard">
          <h2>Owner actions</h2>
          <div className="freshActions">
            <button className="freshPrimary" type="button" onClick={openQuotePopup}>New quote</button>
            <button className="freshPrimary" type="button" onClick={loadQuotes}>Refresh quotes</button>
            <button className="freshGhost" type="button" onClick={() => onNavigate?.("command")}>Send follow-up to Command</button>
          </div>
        </aside>
      </section>
      {quotePopupOpen ? (
        <div className="freshRoutePopupBackdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setQuotePopupOpen(false); }}>
          <section className="freshCard freshRoutePopupCard">
            <button className="freshRoutePopupClose" type="button" onClick={() => setQuotePopupOpen(false)}>×</button>
            <header className="freshHero freshRoutePopupHero">
              <span>New quote</span>
              <h1>Create quote</h1>
              <p>Add the real quote here without leaving the Quotes area.</p>
            </header>
            <QuoteCreateForm
              submitLabel="Create quote"
              onCancel={() => setQuotePopupOpen(false)}
              onSuccess={() => {
                setQuotePopupOpen(false);
                loadQuotes();
                try { window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "quote-created" } })); } catch {}
              }}
            />
          </section>
        </div>
      ) : null}

    </section>
  );
}
