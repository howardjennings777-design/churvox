import React from "react";
import { useApi } from "../hooks/useApi";
import QuoteCreateForm from "../components/forms/QuoteCreateForm";
import { hideDemoRecords } from "./freshDemoRecords";
import "./freshRoutePopups.css";
import "./freshJobsPolish.css";

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
    status,
    amount,
    age: quote?.created_at ? `Created ${new Date(quote.created_at).toLocaleDateString()}` : "Real quote",
    followUp: status === "Sent" ? "Follow-up ready to check" : status === "Accepted" ? "Ready to become a job" : "Ready for owner review",
    note: quote?.notes || quote?.note || "No notes yet",
    lines: Array.isArray(quote?.lines) ? quote.lines : [quote?.job_description || quote?.description || quote?.notes || "Quote item"],
    sortTime: dateScore(quote),
  };
}

function quoteOptions(quote) {
  if (!quote) return [];
  const base = quote.amount > 0 ? quote.amount : 100;
  const title = quote.title || "service";
  return [
    { name: "Basic", amount: Math.max(1, Math.round(base * 0.85)), note: `Covers the core ${title} only. Best for price-sensitive customers.` },
    { name: "Recommended", amount: Math.round(base), note: `Best balance. Includes the quoted work plus normal tidy-up/admin allowance.` },
    { name: "Premium", amount: Math.round(base * 1.35), note: `Adds extras, priority finish, stronger tidy-up and more margin for surprises.` },
  ];
}

function optionsText(quote, options) {
  return `Prepare three owner-approved quote options for ${quote.title} for ${quote.client}. Current quote value ${money(quote.amount)}. Options: ${options.map((option) => `${option.name} ${money(option.amount)} - ${option.note}`).join(" | ")}. Owner must review before sending to customer. Do not auto-send.`;
}

const selectedFilterButtonStyle = { background: "#111827", backgroundColor: "#111827", borderColor: "#111827", color: "#ffffff", WebkitTextFillColor: "#ffffff" };
const selectedFilterTextStyle = { color: "#ffffff", WebkitTextFillColor: "#ffffff", opacity: 1 };
const selectedFilterCountStyle = { background: "#f97316", backgroundColor: "#f97316", color: "#ffffff", WebkitTextFillColor: "#ffffff", opacity: 1, borderRadius: "999px" };

export default function FreshQuotes({ onNavigate }) {
  const { get, post } = useApi();
  const [quotes, setQuotes] = React.useState([]);
  const [selectedId, setSelectedId] = React.useState("");
  const [filter, setFilter] = React.useState("All");
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState("");
  const [error, setError] = React.useState("");
  const [quotePopupOpen, setQuotePopupOpen] = React.useState(false);

  const visibleQuotes = filter === "All" ? quotes : quotes.filter((quote) => quote.status === filter);
  const selected = quotes.find((quote) => quote.id === selectedId) || visibleQuotes[0] || quotes[0];
  const options = React.useMemo(() => quoteOptions(selected), [selected]);
  const sentTotal = quotes.filter((quote) => quote.status === "Sent").reduce((sum, quote) => sum + quote.amount, 0);
  const acceptedTotal = quotes.filter((quote) => quote.status === "Accepted").reduce((sum, quote) => sum + quote.amount, 0);

  const loadQuotes = React.useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await get("/quotes", { timeout: 25000 });
    if (!res.success) { setQuotes([]); setSelectedId(""); setError(res.error || "Could not load real quotes"); setLoading(false); return; }
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

  function openQuotePopup() { setQuotePopupOpen(true); }

  async function sendSelectedQuoteToCommand() {
    if (!selected) return;
    setBusy("command");
    try {
      const text = selected.status === "Accepted"
        ? `Prepare owner review to convert accepted quote ${selected.title} for ${selected.client} into a job. Value ${money(selected.amount)}. Owner approval required.`
        : `Prepare owner-approved quote follow-up for ${selected.title} for ${selected.client}. Status ${selected.status}. Value ${money(selected.amount)}. Do not auto-send.`;
      const result = await post("/tell-churvox/prepare", { text }, { timeout: 30000 });
      if (!result?.success) throw new Error(result?.error || "Could not prepare quote for approval.");
      onNavigate?.("command");
    } catch (err) {
      setError(err?.message || "Could not prepare quote for approval.");
    } finally {
      setBusy("");
    }
  }

  async function sendOptionsToCommand() {
    if (!selected) return;
    setBusy("options");
    try {
      const result = await post("/tell-churvox/prepare", { text: optionsText(selected, options) }, { timeout: 30000 });
      if (!result?.success) throw new Error(result?.error || "Could not prepare quote options.");
      onNavigate?.("command");
    } catch (err) {
      setError(err?.message || "Could not prepare quote options.");
    } finally {
      setBusy("");
    }
  }

  function convertSelectedQuoteToJob() {
    if (!selected) return;
    try { window.localStorage.setItem("churvox:selected-quote-for-job", JSON.stringify({ id: selected.id, title: selected.title, client: selected.client, amount: selected.amount, note: selected.note, lines: selected.lines })); } catch {}
    onNavigate?.("jobs");
    window.setTimeout(() => {
      try { window.dispatchEvent(new CustomEvent("churvox:open-job-popup", { detail: { source: "quote", quote: selected, instruction: `Create job from accepted quote: ${selected.title}` } })); } catch {}
    }, 200);
  }

  const filterPillStyle = (active) => active ? selectedFilterButtonStyle : undefined;
  const filterTextStyle = (active) => active ? selectedFilterTextStyle : undefined;
  const filterCountStyle = (active) => active ? selectedFilterCountStyle : undefined;

  return (
    <section className="freshQuotesPage">
      <header className="freshHero"><span>Quotes ready to review</span><h1>Quotes</h1><p>Churvox keeps quote drafts, follow-ups, and accepted work in one place. You approve the next move before anything goes out.</p></header>
      <section className="freshCommandPulse"><aside className="freshCard"><h2>{loading && quotes.length === 0 ? "..." : money(sentTotal)}</h2><p>Sent value to watch</p></aside><aside className="freshCard"><h2>{loading && quotes.length === 0 ? "..." : money(acceptedTotal)}</h2><p>Accepted value ready</p></aside><aside className="freshCard"><h2>{loading && quotes.length === 0 ? "..." : quotes.length}</h2><p>Quotes Churvox found</p></aside></section>
      {error ? <section className="freshCard freshItem need"><b>Could not load quotes</b><span>{error}</span><button type="button" className="freshPrimary" onClick={loadQuotes}>Retry</button></section> : null}
      <section className="freshCommandFilterBar">{filters.map((item) => <button type="button" key={item} className={filter === item ? "active" : ""} style={filterPillStyle(filter === item)} onClick={() => setFilter(item)}><span style={filterTextStyle(filter === item)}>{item}</span><b style={filterCountStyle(filter === item)}>{item === "All" ? quotes.length : quotes.filter((quote) => quote.status === item).length}</b></button>)}</section>

      <section className="freshGrid">
        <aside className="freshCard"><h2>Quote work</h2>{loading && quotes.length === 0 ? <div className="freshItem"><b>Loading real quotes...</b><span>Checking your business account.</span></div> : visibleQuotes.map((quote) => <button type="button" className={`freshItem ${selected?.id === quote.id ? "active" : ""} ${quote.status === "Sent" ? "need" : ""}`} key={quote.id} onClick={() => setSelectedId(quote.id)}><b>{quote.title}</b><span>{quote.client} - {quote.status} - {money(quote.amount)}</span></button>)}{loading && quotes.length > 0 ? <div className="freshItem"><b>Refreshing quotes...</b><span>Showing saved quotes while Churvox refreshes.</span></div> : null}{!loading && visibleQuotes.length === 0 ? <div className="freshItem"><b>No quote work waiting</b><span>When quotes exist, Churvox will show what needs review or follow-up here.</span></div> : null}</aside>

        <section className="freshCard freshQuotesDetailCard">
          <div className="freshJobsDetailHeader"><div><small>Quote Churvox found</small><h2>{selected?.title || "Select quote"}</h2></div>{selected ? <span className={selected.status === "Accepted" ? "ready" : selected.status === "Sent" ? "need" : ""}>{selected.status}</span> : null}</div>
          {selected ? (<>
            <div className="freshMiniGrid freshJobsMiniGrid"><div><span>Quote</span><b>{selected.id}</b></div><div><span>Status</span><b>{selected.status}</b></div><div><span>Client</span><b>{selected.client}</b></div><div><span>Value</span><b>{money(selected.amount)}</b></div></div>
            <section className={`freshQuoteNextBox ${selected.status.toLowerCase()}`}><span>Next owner move</span><b>{selected.followUp}</b><p>{selected.status === "Sent" ? "Churvox has the follow-up ready to review before the customer goes cold." : selected.status === "Accepted" ? "Churvox can turn this accepted quote into job admin once you approve it." : "Review the prepared quote details before sending."}</p></section>
            <section className="freshOptionGrid">{options.map((option) => <article key={option.name} className={option.name === "Recommended" ? "recommended" : ""}><span>{option.name}</span><b>{money(option.amount)}</b><p>{option.note}</p></article>)}</section>
            <section className="freshJobsDetailBox notes"><span>Prepared quote lines</span>{selected.lines.map((line, index) => <p key={`${selected.id}-${index}`}>{String(line)}</p>)}</section>
            <section className="freshJobsDetailBox notes"><span>Owner quote note</span><p>{selected.note}</p></section>
          </>) : <div className="freshEmptyStateBig"><b>No quote selected</b><span>When a quote is ready, Churvox will show the prepared options and the next owner decision here.</span><button type="button" className="freshPrimary" onClick={openQuotePopup}>Prepare quote</button></div>}
        </section>

        <aside className="freshCard freshQuotesActionsCard"><h2>Owner actions</h2><p className="freshJobsActionHint">Approve, adjust, or ask Churvox to prepare the next step. Nothing contacts the customer unless you approve it.</p><div className="freshActions freshJobsActionStack"><button className="freshPrimary" type="button" onClick={openQuotePopup}>Prepare quote</button><button className="freshOrange" type="button" disabled={!selected || selected.status !== "Accepted"} onClick={convertSelectedQuoteToJob}>Prepare job from quote</button><button className="freshDark" type="button" disabled={!selected || busy === "options"} onClick={sendOptionsToCommand}>{busy === "options" ? "Preparing..." : "Prepare quote options"}</button><button className="freshDark" type="button" disabled={!selected || busy === "command"} onClick={sendSelectedQuoteToCommand}>{busy === "command" ? "Preparing..." : "Prepare next move"}</button><button className="freshGhost" type="button" onClick={loadQuotes}>Refresh quotes</button></div></aside>
      </section>

      {quotePopupOpen ? <div className="freshRoutePopupBackdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setQuotePopupOpen(false); }}><section className="freshCard freshRoutePopupCard"><button className="freshRoutePopupClose" type="button" onClick={() => setQuotePopupOpen(false)}>x</button><header className="freshHero freshRoutePopupHero"><span>Prepare quote</span><h1>Quote for review</h1><p>Add the job details Churvox should turn into a quote draft for owner approval.</p></header><QuoteCreateForm submitLabel="Prepare quote" onCancel={() => setQuotePopupOpen(false)} onSuccess={() => { setQuotePopupOpen(false); loadQuotes(); try { window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "quote-created" } })); } catch {} }} /></section></div> : null}
    </section>
  );
}
