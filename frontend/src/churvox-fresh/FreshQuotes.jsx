import React from "react";
import { useApi } from "../hooks/useApi";
import QuoteCreateForm from "../components/forms/QuoteCreateForm";
import { hideDemoRecords } from "./freshDemoRecords";
import "./freshRoutePopups.css";
import "./freshJobsPolish.css";

const filters = ["All", "Draft", "Sent", "Accepted", "Declined"];
const OPEN_QUOTE_MODAL_KEY = "churvox:fresh-open-quote-modal:v1";

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

function moneyNumber(value) {
  const n = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function money(value) {
  return `$${Number(value || 0).toLocaleString("en-NZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function dateScore(quote) {
  const raw = quote?.created_at || quote?.createdAt || quote?.updated_at || quote?.updatedAt || "";
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeQuote(quote, index) {
  const id = idOf(quote, `quote-${index}`);
  const status = statusOf(quote?.status);
  const amount = moneyNumber(quote?.price ?? quote?.amount ?? quote?.total ?? 0);
  return {
    ...quote,
    id,
    title: quote?.title || quote?.job_description || quote?.description || quote?.quote_number || id,
    client: quote?.client_name || quote?.customer_name || quote?.client || "No client linked",
    clientId: quote?.client_id || quote?.customer_id || "",
    address: quote?.address || quote?.site_address || quote?.service_address || "",
    status,
    amount,
    age: quote?.created_at ? `Created ${new Date(quote.created_at).toLocaleDateString()}` : "Saved quote",
    note: quote?.notes || quote?.note || "No notes yet",
    lines: Array.isArray(quote?.lines) ? quote.lines : [quote?.job_description || quote?.description || quote?.notes || "Quote item"],
    sortTime: dateScore(quote),
  };
}

function readQuoteHandoff(raw) {
  if (!raw) return null;
  let payload = raw;
  if (typeof raw === "string") {
    try { payload = JSON.parse(raw); } catch { payload = null; }
  }
  if (!payload || typeof payload !== "object") return null;
  return payload.detail && typeof payload.detail === "object" ? payload.detail : payload;
}

const selectedFilterButtonStyle = { background: "#111827", backgroundColor: "#111827", borderColor: "#111827", color: "#ffffff", WebkitTextFillColor: "#ffffff" };
const selectedFilterTextStyle = { color: "#ffffff", WebkitTextFillColor: "#ffffff", opacity: 1 };
const selectedFilterCountStyle = { background: "#f97316", backgroundColor: "#f97316", color: "#ffffff", WebkitTextFillColor: "#ffffff", opacity: 1, borderRadius: "999px" };

export default function FreshQuotes({ onNavigate }) {
  const { get } = useApi();
  const [quotes, setQuotes] = React.useState([]);
  const [selectedId, setSelectedId] = React.useState("");
  const [filter, setFilter] = React.useState("All");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [quotePopupOpen, setQuotePopupOpen] = React.useState(false);
  const [quoteInitialClient, setQuoteInitialClient] = React.useState(null);

  const visibleQuotes = filter === "All" ? quotes : quotes.filter((quote) => quote.status === filter);
  const selected = quotes.find((quote) => quote.id === selectedId) || visibleQuotes[0] || quotes[0];
  const draftTotal = quotes.filter((quote) => quote.status === "Draft").reduce((sum, quote) => sum + quote.amount, 0);
  const sentTotal = quotes.filter((quote) => quote.status === "Sent").reduce((sum, quote) => sum + quote.amount, 0);
  const acceptedTotal = quotes.filter((quote) => quote.status === "Accepted").reduce((sum, quote) => sum + quote.amount, 0);

  const loadQuotes = React.useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await get("/quotes", { timeout: 25000 });
    if (!res.success) {
      setQuotes([]);
      setSelectedId("");
      setError(res.error || "Could not load quotes");
      setLoading(false);
      return;
    }
    const nextQuotes = hideDemoRecords(listFrom(res.data)).map(normalizeQuote).sort((a, b) => b.sortTime - a.sortTime || String(b.id).localeCompare(String(a.id)));
    setQuotes(nextQuotes);
    setSelectedId((current) => nextQuotes.some((quote) => quote.id === current) ? current : nextQuotes[0]?.id || "");
    setLoading(false);
  }, [get]);

  React.useEffect(() => { loadQuotes(); }, [loadQuotes]);
  React.useEffect(() => {
    const onFreshDataUpdated = () => loadQuotes();
    window.addEventListener("churvox:fresh-data-updated", onFreshDataUpdated);
    return () => window.removeEventListener("churvox:fresh-data-updated", onFreshDataUpdated);
  }, [loadQuotes]);
  React.useEffect(() => {
    const openFromExternal = (event) => openQuotePopup(readQuoteHandoff(event?.detail));
    window.addEventListener("churvox:open-quote-popup", openFromExternal);
    try { const saved = window.localStorage.getItem(OPEN_QUOTE_MODAL_KEY); if (saved) window.setTimeout(() => openQuotePopup(readQuoteHandoff(saved)), 50); } catch {}
    return () => window.removeEventListener("churvox:open-quote-popup", openFromExternal);
  }, []);

  function openQuotePopup(initialClient = null) { setQuoteInitialClient(initialClient || null); setQuotePopupOpen(true); try { window.localStorage.removeItem(OPEN_QUOTE_MODAL_KEY); } catch {} }

  function convertSelectedQuoteToJob() {
    if (!selected) return;
    const draft = { source: "quote", quote_id: selected.id, title: selected.title, job_title: selected.title, client: selected.client, client_name: selected.client, customer_name: selected.client, client_id: selected.clientId || "", address: selected.address || "", price: selected.amount, amount: selected.amount, notes: `Created from accepted quote ${selected.id}. ${selected.note || ""}`.trim() };
    try { window.localStorage.setItem("churvox:selected-quote-for-job", JSON.stringify(draft)); window.localStorage.setItem("churvox:fresh-open-job-modal:v1", JSON.stringify(draft)); } catch {}
    onNavigate?.("jobs");
    window.setTimeout(() => {
      try { window.dispatchEvent(new CustomEvent("churvox:open-job-popup", { detail: draft })); } catch {}
    }, 200);
  }

  const filterPillStyle = (active) => active ? selectedFilterButtonStyle : undefined;
  const filterTextStyle = (active) => active ? selectedFilterTextStyle : undefined;
  const filterCountStyle = (active) => active ? selectedFilterCountStyle : undefined;

  return (
    <section className="freshQuotesPage" data-quote-job-handoff="20260626" data-quote-client-handoff="20260626">
      <header className="freshHero"><span>Quotes</span><h1>Quotes</h1><p>Saved quote records, customer, value, status and line details.</p></header>
      <section className="freshCommandPulse"><aside className="freshCard"><h2>{loading && quotes.length === 0 ? "..." : money(draftTotal)}</h2><p>Draft value</p></aside><aside className="freshCard"><h2>{loading && quotes.length === 0 ? "..." : money(sentTotal)}</h2><p>Sent value</p></aside><aside className="freshCard"><h2>{loading && quotes.length === 0 ? "..." : money(acceptedTotal)}</h2><p>Accepted value</p></aside></section>
      {error ? <section className="freshCard freshItem need"><b>Could not load quotes</b><span>{error}</span><button type="button" className="freshPrimary" onClick={loadQuotes}>Retry</button></section> : null}
      <section className="freshCommandFilterBar">{filters.map((item) => <button type="button" key={item} className={filter === item ? "active" : ""} style={filterPillStyle(filter === item)} onClick={() => setFilter(item)}><span style={filterTextStyle(filter === item)}>{item}</span><b style={filterCountStyle(filter === item)}>{item === "All" ? quotes.length : quotes.filter((quote) => quote.status === item).length}</b></button>)}</section>

      <section className="freshGrid">
        <aside className="freshCard"><h2>Quote list</h2>{loading && quotes.length === 0 ? <div className="freshItem"><b>Loading quotes...</b><span>Checking saved quote records.</span></div> : visibleQuotes.map((quote) => <button type="button" className={`freshItem ${selected?.id === quote.id ? "active" : ""}`} key={quote.id} onClick={() => setSelectedId(quote.id)}><b>{quote.title}</b><span>{quote.client} - {quote.status} - {money(quote.amount)}</span></button>)}{loading && quotes.length > 0 ? <div className="freshItem"><b>Refreshing quotes...</b><span>Showing saved quotes while Churvox refreshes.</span></div> : null}{!loading && visibleQuotes.length === 0 ? <div className="freshItem"><b>No quotes found</b><span>Create a quote or clear the filter.</span></div> : null}</aside>

        <section className="freshCard freshQuotesDetailCard">
          <div className="freshJobsDetailHeader"><div><small>Quote record</small><h2>{selected?.title || "Select quote"}</h2></div>{selected ? <span className={selected.status === "Accepted" ? "ready" : selected.status === "Sent" ? "need" : ""}>{selected.status}</span> : null}</div>
          {selected ? (<>
            <div className="freshMiniGrid freshJobsMiniGrid"><div><span>Quote</span><b>{selected.id}</b></div><div><span>Status</span><b>{selected.status}</b></div><div><span>Client</span><b>{selected.client}</b></div><div><span>Value</span><b>{money(selected.amount)}</b></div></div>
            <section className="freshJobsDetailBox notes"><span>Quote lines</span>{selected.lines.map((line, index) => <p key={`${selected.id}-${index}`}>{String(line)}</p>)}</section>
            <section className="freshJobsDetailBox notes"><span>Quote note</span><p>{selected.note}</p></section>
          </>) : <div className="freshEmptyStateBig"><b>No quote selected</b><span>When quote records exist, details will show here.</span><button type="button" className="freshPrimary" onClick={() => openQuotePopup()}>Create quote</button></div>}
        </section>

        <aside className="freshCard freshQuotesActionsCard"><h2>Quote actions</h2><div className="freshActions freshJobsActionStack"><button className="freshPrimary" type="button" onClick={() => openQuotePopup()}>Create quote</button><button className="freshOrange" type="button" disabled={!selected || selected.status !== "Accepted"} onClick={convertSelectedQuoteToJob}>Create job from quote</button><button className="freshGhost" type="button" onClick={loadQuotes}>Refresh quotes</button></div></aside>
      </section>

      {quotePopupOpen ? <div className="freshRoutePopupBackdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setQuotePopupOpen(false); }}><section className="freshCard freshRoutePopupCard"><button className="freshRoutePopupClose" type="button" onClick={() => setQuotePopupOpen(false)}>x</button><header className="freshHero freshRoutePopupHero"><span>Quote</span><h1>Create quote</h1><p>Add the quote details.</p></header><QuoteCreateForm submitLabel="Save quote" initialClient={quoteInitialClient} onCancel={() => setQuotePopupOpen(false)} onSuccess={() => { setQuotePopupOpen(false); setQuoteInitialClient(null); loadQuotes(); try { window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "quote-created" } })); } catch {} }} /></section></div> : null}
    </section>
  );
}
