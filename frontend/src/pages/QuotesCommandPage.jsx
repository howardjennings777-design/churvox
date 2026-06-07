import React from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import {
  industrialAction,
  industrialChip,
  industrialContentLane,
  industrialGhost,
  industrialPageShell,
} from "../components/industrialCommandTheme";

const tileStyle = {
  background: "linear-gradient(135deg, #111827, #070d16)",
  color: "#ffffff",
  boxShadow: "0 18px 46px rgba(2,6,23,.26), inset 0 1px 0 rgba(255,255,255,.06)",
};

function first(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== "") || "";
}

function listFrom(res) {
  const data = res?.data ?? res;
  if (Array.isArray(data)) return data;
  for (const key of ["quotes", "items", "results", "data"]) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

function idOf(item) {
  const raw = item?.id || item?._id || item?.quote_id || "";
  return typeof raw === "object" && raw?.$oid ? raw.$oid : String(raw || "");
}

function titleOf(item) {
  return first(item?.title, item?.quote_title, item?.quote_number, item?.number, item?.job_title, "Untitled quote");
}

function clientOf(item) {
  return first(item?.client_name, item?.customer_name, item?.client?.name, item?.customer?.name, "No client saved");
}

function statusOf(item) {
  return String(first(item?.status, item?.quote_status, "draft")).replaceAll("_", " ");
}

function rawStatus(item) {
  return String(first(item?.status, item?.quote_status, "draft")).toLowerCase();
}

function amountOf(item) {
  return Number(first(item?.total, item?.amount, item?.price, item?.subtotal, item?.quote_total, 0)) || 0;
}

function money(value) {
  const num = Number(value || 0);
  return Number.isFinite(num) && num > 0 ? `$${num.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "$0";
}

function formatDate(value) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function isDraft(item) { return rawStatus(item).includes("draft"); }
function isAccepted(item) { const s = rawStatus(item); return s.includes("accept") || s.includes("approved") || s.includes("won"); }
function isClosed(item) { const s = rawStatus(item); return s.includes("decline") || s.includes("lost") || s.includes("expired"); }
function needsFollowUp(item) { const s = rawStatus(item); return s.includes("sent") || s.includes("pending") || s.includes("follow") || s.includes("draft"); }

function statusClass(item) {
  const s = rawStatus(item);
  if (isAccepted(item)) return "bg-emerald-300 text-slate-950";
  if (isClosed(item)) return "bg-red-300 text-slate-950";
  if (s.includes("sent") || s.includes("pending")) return "bg-cyan-300 text-slate-950";
  if (isDraft(item)) return "bg-amber-300 text-slate-950";
  return "bg-white/10 text-white ring-1 ring-white/10";
}

function detailsFor(item) {
  return {
    Client: clientOf(item),
    Status: statusOf(item),
    Amount: money(amountOf(item)),
    ValidUntil: formatDate(first(item?.valid_until, item?.expires_at, item?.expiry_date)),
    Address: first(item?.address, item?.site_address, item?.street_address, "Not saved"),
    Notes: first(item?.notes, item?.description, item?.quote_notes, "No notes saved"),
  };
}

function SecurityTape({ color = "#facc15" }) {
  return <span aria-hidden="true" className="absolute left-0 top-0 h-full w-2.5 rounded-l-[26px]" style={{ background: `repeating-linear-gradient(135deg, ${color} 0 10px, rgba(255,255,255,.30) 10px 15px, ${color} 15px 25px)`, boxShadow: `0 0 18px ${color}66` }} />;
}

function MetricCard({ label, value, text, color }) {
  return (
    <article className="relative overflow-hidden rounded-[28px] border border-white/10 p-5 pl-7 text-white" style={tileStyle}>
      <SecurityTape color={color} />
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">{label}</div>
      <div className="mt-3 text-4xl font-black tracking-[-0.07em] text-white">{value}</div>
      <p className="mt-2 text-sm font-bold leading-6 text-slate-300">{text}</p>
    </article>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
      <div className="text-[10px] font-black uppercase tracking-[.16em] text-amber-300">{label}</div>
      <div className="mt-2 text-sm font-black leading-6 text-white">{String(value || "Not saved")}</div>
    </div>
  );
}

function QuoteSlip({ quote, mode, approved, onClose, onApprove, onMode }) {
  const [draft, setDraft] = React.useState("");
  const details = React.useMemo(() => detailsFor(quote || {}), [quote]);

  React.useEffect(() => {
    if (!quote) return;
    const detailText = Object.entries(details).map(([key, value]) => `${key}: ${value}`).join("\n");
    setDraft(`${titleOf(quote)}\n${detailText}`.trim());
  }, [quote, details]);

  if (!quote) return null;
  const quoteId = idOf(quote);
  const isEdit = mode === "edit";

  return (
    <div className="fixed inset-0 z-[2147483600] overflow-y-auto bg-slate-950/92 p-3 text-white backdrop-blur-xl md:p-6" role="dialog" aria-modal="true">
      <div className="mx-auto flex min-h-[calc(100vh-24px)] max-w-6xl flex-col overflow-hidden rounded-[34px] border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-2xl md:min-h-[calc(100vh-48px)]">
        <header className="flex items-start justify-between gap-4 border-b border-white/10 p-5 md:p-7">
          <div>
            <div className="inline-flex rounded-full bg-amber-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">Quote slip</div>
            <h2 className="mt-3 text-4xl font-black leading-[0.95] tracking-[-0.07em] text-white md:text-6xl">{titleOf(quote)}</h2>
            <p className="mt-4 max-w-3xl text-sm font-bold leading-6 text-slate-300 md:text-base">{clientOf(quote)} · {money(amountOf(quote))} · {statusOf(quote)}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950">Close</button>
        </header>

        <div className="grid flex-1 gap-5 p-5 md:grid-cols-[1.15fr_.85fr] md:p-7">
          <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">Review this exact quote</div>
            {isEdit ? (
              <>
                <textarea value={draft} onChange={(event) => setDraft(event.target.value)} className="mt-4 min-h-[330px] w-full rounded-3xl border border-white/10 bg-slate-950/70 p-4 text-sm font-bold leading-6 text-white outline-none" />
                <button type="button" onClick={() => onMode("details")} className="mt-4 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950">Save edit in slip</button>
              </>
            ) : (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {Object.entries(details).map(([label, value]) => <DetailRow key={label} label={label} value={value} />)}
              </div>
            )}
          </section>

          <aside className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">Owner action</div>
            <p className="mt-3 text-sm font-bold leading-6 text-slate-300">Review the quote here first. Approve or edit the slip, then open the full quote page only when you need the full record.</p>
            {approved ? <div className="mt-4 rounded-3xl border border-emerald-300/25 bg-emerald-300/10 p-4 text-sm font-black text-emerald-100">Approved. This quote slip decision is recorded in this view.</div> : null}
            <div className="mt-5 grid gap-3">
              <button type="button" onClick={onApprove} className="rounded-2xl bg-emerald-300 px-5 py-4 text-sm font-black text-slate-950">Approve slip</button>
              <button type="button" onClick={() => onMode("edit")} className="rounded-2xl bg-white/10 px-5 py-4 text-sm font-black text-white ring-1 ring-white/10">Edit in slip</button>
              {quoteId ? <Link to={`/quotes/${quoteId}`} onClick={onClose} className="rounded-2xl bg-white px-5 py-4 text-center text-sm font-black text-slate-950 no-underline">Open full quote page</Link> : null}
              <button type="button" onClick={onClose} className="rounded-2xl bg-white/10 px-5 py-4 text-sm font-black text-white ring-1 ring-white/10">Back to quotes</button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function QuoteRow({ quote, onOpen }) {
  const tape = isAccepted(quote) ? "#34d399" : isClosed(quote) ? "#f43f5e" : needsFollowUp(quote) ? "#facc15" : "#22d3ee";
  return (
    <button type="button" onClick={() => onOpen(quote)} className="relative w-full overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.06] p-4 pl-7 text-left text-white transition hover:border-cyan-300/40 hover:bg-white/[0.09] active:scale-[0.99]">
      <SecurityTape color={tape} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-xl font-black tracking-[-0.05em] text-white">{titleOf(quote)}</h3>
          <p className="mt-1 line-clamp-1 text-sm font-bold leading-6 text-slate-300">{clientOf(quote)} · {money(amountOf(quote))} · valid until {formatDate(first(quote?.valid_until, quote?.expires_at, quote?.expiry_date))}</p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${statusClass(quote)}`}>{statusOf(quote)}</span>
      </div>
    </button>
  );
}

export default function QuotesCommandPage() {
  const { get } = useApi();
  const [quotes, setQuotes] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedQuote, setSelectedQuote] = React.useState(null);
  const [mode, setMode] = React.useState("details");
  const [approvedIds, setApprovedIds] = React.useState({});

  React.useEffect(() => {
    let alive = true;
    async function loadQuotes() {
      try {
        setLoading(true);
        const res = await get("/quotes");
        if (!alive) return;
        setQuotes(listFrom(res));
      } catch (error) {
        console.warn("Quotes page load failed", error);
        if (alive) setQuotes([]);
      } finally {
        if (alive) setLoading(false);
      }
    }
    loadQuotes();
    return () => { alive = false; };
  }, [get]);

  const draftQuotes = quotes.filter(isDraft);
  const followUps = quotes.filter(needsFollowUp);
  const accepted = quotes.filter(isAccepted);
  const closed = quotes.filter(isClosed);
  const selectedId = selectedQuote ? idOf(selectedQuote) || titleOf(selectedQuote) : "current";

  const openSlip = (quote, nextMode = "details") => {
    setSelectedQuote(quote);
    setMode(nextMode);
  };

  return (
    <main className={industrialPageShell} data-industrial-simple-page="quotes" data-command-canvas>
      <section className={`${industrialContentLane} space-y-5`}>
        <section className="relative overflow-hidden rounded-[30px] border border-white/10 p-5 pl-8 text-white md:p-7 md:pl-9" style={tileStyle}>
          <SecurityTape color="#facc15" />
          <span className={industrialChip}>Quotes</span>
          <h1 className="mt-4 max-w-4xl text-4xl font-black leading-[0.92] tracking-[-0.075em] text-white md:text-6xl">Quotes ready to review, approve, or follow up.</h1>
          <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-slate-300 md:text-base">Tap a quote to open its full-screen slip. Keep review and approval in the slip, then open the full quote page only when you need the full record.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/quotes/new" className={`rounded-2xl px-5 py-3 text-sm font-black ${industrialAction}`}>Create quote</Link>
            <Link to="/dashboard" className={`rounded-2xl px-5 py-3 text-sm font-black ${industrialGhost}`}>Command Board</Link>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Drafts" value={draftQuotes.length} text="Quotes waiting to be checked." color="#facc15" />
          <MetricCard label="Follow up" value={followUps.length} text="Quotes that may need owner attention." color="#fb923c" />
          <MetricCard label="Accepted" value={accepted.length} text="Approved quotes ready for the next step." color="#34d399" />
          <MetricCard label="Closed" value={closed.length} text="Closed, expired, or declined quotes." color="#f43f5e" />
        </section>

        <section className="rounded-[30px] border border-white/10 p-5 text-white md:p-6" style={tileStyle}>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">Quote list</div>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.06em] text-white">Tap a quote to review it</h2>
            </div>
            {loading ? <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-slate-300">Loading…</span> : <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-slate-300">{quotes.length} quotes</span>}
          </div>

          {quotes.length ? (
            <div className="grid gap-3">
              {quotes.map((quote, index) => <QuoteRow key={idOf(quote) || `${titleOf(quote)}-${index}`} quote={quote} onOpen={openSlip} />)}
            </div>
          ) : (
            <div className="rounded-[26px] border border-white/10 bg-white/[0.06] p-5">
              <h3 className="text-2xl font-black tracking-[-0.05em] text-white">No quotes showing yet.</h3>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-300">Create the first quote and Churvox will keep quote review work in this command view.</p>
              <Link to="/quotes/new" className={`mt-4 inline-flex rounded-2xl px-5 py-3 text-sm font-black no-underline ${industrialAction}`}>Create quote</Link>
            </div>
          )}
        </section>
      </section>

      <QuoteSlip
        quote={selectedQuote}
        mode={mode}
        approved={Boolean(approvedIds[selectedId])}
        onMode={setMode}
        onClose={() => setSelectedQuote(null)}
        onApprove={() => setApprovedIds((prev) => ({ ...prev, [selectedId]: true }))}
      />
    </main>
  );
}
