import React from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";
import { industrialAction, industrialChip, industrialContentLane, industrialGhost, industrialPageShell } from "../components/industrialCommandTheme";

const tileStyle = {
  background: "linear-gradient(135deg, #111827, #070d16)",
  color: "#ffffff",
  boxShadow: "0 18px 46px rgba(2,6,23,.26), inset 0 1px 0 rgba(255,255,255,.06)",
};

const first = (...values) => values.find((value) => value !== undefined && value !== null && String(value).trim() !== "") || "";
function normalizeId(value) {
  if (!value) return "";
  if (typeof value === "object") return String(value.$oid || value.oid || value.id || value._id || "");
  const text = String(value || "");
  return text === "[object Object]" ? "" : text;
}
const idOf = (item) => normalizeId(item?.id || item?._id || item?.quote_id || "");
const convertedJobId = (item) => normalizeId(item?.converted_job_id || item?.job_id || item?.linked_job_id || "");
const rawStatus = (item) => String(first(item?.status, item?.quote_status, "draft")).toLowerCase();
const statusOf = (item) => String(first(item?.status, item?.quote_status, "draft")).replaceAll("_", " ");
const titleOf = (item) => first(item?.title, item?.quote_title, item?.quote_number, item?.number, item?.job_title, "Untitled quote");
const clientOf = (item) => first(item?.client_name, item?.customer_name, item?.client?.name, item?.customer?.name, "No client saved");
const amountOf = (item) => Number(first(item?.total, item?.amount, item?.price, item?.subtotal, item?.quote_total, 0)) || 0;
const isDraft = (item) => rawStatus(item) === "draft";
const isSent = (item) => rawStatus(item) === "sent";
const isAccepted = (item) => rawStatus(item) === "accepted";
const isDeclined = (item) => rawStatus(item) === "declined";
const needsFollowUp = (item) => isSent(item);

function listFrom(res) {
  const data = res?.data ?? res;
  if (Array.isArray(data)) return data;
  for (const key of ["quotes", "items", "results", "data"]) if (Array.isArray(data?.[key])) return data[key];
  return [];
}
function numberValue(value) {
  const num = Number(String(value || 0).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(num) ? num : 0;
}
function money(value) {
  const num = Number(value || 0);
  return Number.isFinite(num) && num > 0 ? num.toLocaleString("en-NZ", { style: "currency", currency: "NZD" }) : "$0.00";
}
function formatDate(value) {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
function statusClass(item) {
  if (isAccepted(item)) return "bg-emerald-300 text-slate-950";
  if (isDeclined(item)) return "bg-red-300 text-slate-950";
  if (isSent(item)) return "bg-cyan-300 text-slate-950";
  if (isDraft(item)) return "bg-amber-300 text-slate-950";
  return "bg-white/10 text-white ring-1 ring-white/10";
}
function detailsFor(item) {
  return {
    Client: clientOf(item),
    Status: statusOf(item),
    Amount: money(amountOf(item)),
    "Valid until": formatDate(first(item?.valid_until, item?.expires_at, item?.expiry_date)),
    Address: first(item?.address, item?.site_address, item?.street_address, "Not saved"),
    "Linked job": convertedJobId(item) || "Not converted yet",
    Notes: first(item?.notes, item?.description, item?.quote_notes, "No notes saved"),
  };
}
function SecurityTape({ color = "#facc15" }) {
  return <span aria-hidden="true" className="absolute left-0 top-0 h-full w-2.5 rounded-l-[26px]" style={{ background: `repeating-linear-gradient(135deg, ${color} 0 10px, rgba(255,255,255,.30) 10px 15px, ${color} 15px 25px)`, boxShadow: `0 0 18px ${color}66` }} />;
}
function MetricCard({ label, value, text, color }) {
  return <article className="relative overflow-hidden rounded-[28px] border border-white/10 p-5 pl-7 text-white" style={tileStyle}><SecurityTape color={color} /><div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">{label}</div><div className="mt-3 text-4xl font-black tracking-[-0.07em] text-white">{value}</div><p className="mt-2 text-sm font-bold leading-6 text-slate-300">{text}</p></article>;
}
function DetailRow({ label, value }) {
  return <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4"><div className="text-[10px] font-black uppercase tracking-[.16em] text-amber-300">{label}</div><div className="mt-2 break-words text-sm font-black leading-6 text-white">{String(value || "Not saved")}</div></div>;
}
function Field({ label, value, onChange }) {
  return <label className="grid gap-2 rounded-2xl border border-white/10 bg-slate-950/45 p-4"><span className="text-[10px] font-black uppercase tracking-[.16em] text-amber-300">{label}</span><input value={value || ""} onChange={(event) => onChange(event.target.value)} className="rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm font-bold text-white outline-none focus:border-amber-300" /></label>;
}
function TextArea({ label, value, onChange }) {
  return <label className="grid gap-2 rounded-2xl border border-white/10 bg-slate-950/45 p-4"><span className="text-[10px] font-black uppercase tracking-[.16em] text-amber-300">{label}</span><textarea rows={4} value={value || ""} onChange={(event) => onChange(event.target.value)} className="rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm font-bold text-white outline-none focus:border-amber-300" /></label>;
}

function QuoteSlip({ quote, busy, onClose, onRefresh, api }) {
  const [form, setForm] = React.useState({ notes: "", price: "", follow_up: "" });
  const details = React.useMemo(() => detailsFor(quote || {}), [quote]);

  React.useEffect(() => {
    if (!quote) return;
    setForm({
      notes: first(quote?.notes, quote?.description, ""),
      price: first(quote?.price, quote?.total, quote?.amount, ""),
      follow_up: `Hi ${clientOf(quote)}, just checking whether you had any questions about your quote ${first(quote?.quote_number, quote?.number, "")}.`,
    });
  }, [quote]);

  if (!quote) return null;
  const quoteId = idOf(quote);
  const jobId = convertedJobId(quote);
  const locked = isAccepted(quote) || isDeclined(quote) || Boolean(jobId);

  async function run(label, fn) {
    try {
      const res = await fn();
      if (res?.success === false) throw new Error(res?.error || `${label} failed`);
      toast.success(label);
      await onRefresh();
      onClose();
    } catch (error) {
      toast.error(error?.message || `${label} failed`);
    }
  }

  async function convertQuote() {
    return api.post(`/quotes/${quoteId}/convert`, {});
  }

  return <div className="fixed inset-0 z-[2147483600] overflow-y-auto bg-slate-950/92 p-3 text-white backdrop-blur-xl md:p-6" role="dialog" aria-modal="true">
    <div className="mx-auto flex min-h-[calc(100vh-24px)] max-w-6xl flex-col overflow-hidden rounded-[34px] border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-2xl md:min-h-[calc(100vh-48px)]">
      <header className="flex items-start justify-between gap-4 border-b border-white/10 p-5 md:p-7">
        <div>
          <div className="inline-flex rounded-full bg-amber-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">Quote action slip</div>
          <h2 className="mt-3 text-4xl font-black leading-[0.95] tracking-[-0.07em] text-white md:text-6xl">{titleOf(quote)}</h2>
          <p className="mt-4 max-w-3xl text-sm font-bold leading-6 text-slate-300 md:text-base">{clientOf(quote)} · {money(amountOf(quote))} · {statusOf(quote)}</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950">Close</button>
      </header>

      <div className="grid flex-1 gap-5 p-5 md:grid-cols-[1.15fr_.85fr] md:p-7">
        <section className="space-y-5">
          <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">Review this exact quote</div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">{Object.entries(details).map(([label, value]) => <DetailRow key={label} label={label} value={value} />)}</div>
          </section>
          <section className="grid gap-3 md:grid-cols-2"><TextArea label="Quote notes" value={form.notes} onChange={(value) => setForm((p) => ({ ...p, notes: value }))} /><div className="grid gap-3"><Field label="Quote price" value={form.price} onChange={(value) => setForm((p) => ({ ...p, price: value }))} /><TextArea label="Follow-up wording" value={form.follow_up} onChange={(value) => setForm((p) => ({ ...p, follow_up: value }))} /></div></section>
        </section>

        <aside className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">Real quote actions</div>
          <p className="mt-3 text-sm font-bold leading-6 text-slate-300">Actions use supported quote states only: draft, sent, accepted, declined. Convert uses the real backend quote-to-job endpoint.</p>
          <div className="mt-5 grid gap-3">
            <button type="button" disabled={busy || !quoteId || locked} onClick={() => run("Quote saved", () => api.patch(`/quotes/${quoteId}`, { notes: form.notes || null, price: numberValue(form.price) }))} className="rounded-2xl bg-emerald-300 px-5 py-4 text-sm font-black text-slate-950 disabled:opacity-50">Save notes/price</button>
            <button type="button" disabled={busy || !quoteId || locked || !isDraft(quote)} onClick={() => run("Quote marked sent", () => api.post(`/quotes/${quoteId}/send`, {}))} className="rounded-2xl bg-cyan-300 px-5 py-4 text-sm font-black text-slate-950 disabled:opacity-50">Mark sent</button>
            <button type="button" disabled={busy || !quoteId || locked} onClick={() => run("Follow-up note saved", () => api.patch(`/quotes/${quoteId}`, { notes: `${form.notes ? `${form.notes}\n\n` : ""}Follow-up prepared ${new Date().toLocaleDateString("en-NZ")}: ${form.follow_up}` }))} className="rounded-2xl bg-amber-300 px-5 py-4 text-sm font-black text-slate-950 disabled:opacity-50">Save follow-up note</button>
            <button type="button" disabled={busy || !quoteId || locked} onClick={() => run("Quote marked accepted", () => api.patch(`/quotes/${quoteId}`, { status: "accepted" }))} className="rounded-2xl bg-emerald-400 px-5 py-4 text-sm font-black text-slate-950 disabled:opacity-50">Mark accepted</button>
            <button type="button" disabled={busy || !quoteId || locked} onClick={() => run("Quote marked declined", () => api.patch(`/quotes/${quoteId}`, { status: "declined", notes: `${form.notes ? `${form.notes}\n\n` : ""}Declined from quote slip ${new Date().toLocaleDateString("en-NZ")}` }))} className="rounded-2xl bg-red-300 px-5 py-4 text-sm font-black text-red-950 disabled:opacity-50">Mark declined</button>
            <button type="button" disabled={busy || !quoteId || isDeclined(quote) || Boolean(jobId)} onClick={() => run("Job created from quote", convertQuote)} className="rounded-2xl bg-orange-400 px-5 py-4 text-sm font-black text-slate-950 disabled:opacity-50">Convert to job</button>
            {quoteId ? <Link to={`/quotes/${quoteId}`} onClick={onClose} className="rounded-2xl bg-white px-5 py-4 text-center text-sm font-black text-slate-950 no-underline">Open full quote page</Link> : null}
            {jobId ? <Link to={`/jobs/${jobId}`} onClick={onClose} className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 text-center text-sm font-black text-white no-underline">Open linked job</Link> : null}
            <button type="button" onClick={onClose} className="rounded-2xl bg-white/10 px-5 py-4 text-sm font-black text-white ring-1 ring-white/10">Back to quotes</button>
          </div>
        </aside>
      </div>
    </div>
  </div>;
}

function QuoteRow({ quote, onOpen }) {
  const tape = isAccepted(quote) ? "#34d399" : isDeclined(quote) ? "#f43f5e" : needsFollowUp(quote) ? "#facc15" : "#22d3ee";
  return <button type="button" onClick={() => onOpen(quote)} className="relative w-full overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.06] p-4 pl-7 text-left text-white transition hover:border-cyan-300/40 hover:bg-white/[0.09] active:scale-[0.99]"><SecurityTape color={tape} /><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-xl font-black tracking-[-0.05em] text-white">{titleOf(quote)}</h3><p className="mt-1 line-clamp-1 text-sm font-bold leading-6 text-slate-300">{clientOf(quote)} · {money(amountOf(quote))} · valid until {formatDate(first(quote?.valid_until, quote?.expires_at, quote?.expiry_date))}</p></div><span className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${statusClass(quote)}`}>{statusOf(quote)}</span></div></button>;
}

export default function QuotesCommandPage() {
  const api = useApi();
  const { get } = api;
  const [quotes, setQuotes] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [selectedQuote, setSelectedQuote] = React.useState(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await get("/quotes");
      setQuotes(listFrom(res));
    } catch (error) {
      console.warn("Quotes page load failed", error);
      setQuotes([]);
    } finally {
      setLoading(false);
    }
  }, [get]);

  React.useEffect(() => { load(); }, [load]);
  async function refreshFromSlip() { setBusy(true); try { await load(); } finally { setBusy(false); } }

  const draftQuotes = quotes.filter(isDraft);
  const followUps = quotes.filter(needsFollowUp);
  const accepted = quotes.filter(isAccepted);
  const declined = quotes.filter(isDeclined);

  return <main className={industrialPageShell} data-industrial-simple-page="quotes" data-command-canvas>
    <section className={`${industrialContentLane} space-y-5`}>
      <section className="relative overflow-hidden rounded-[30px] border border-white/10 p-5 pl-8 text-white md:p-7 md:pl-9" style={tileStyle}>
        <SecurityTape color="#facc15" />
        <span className={industrialChip}>Quotes</span>
        <h1 className="mt-4 max-w-4xl text-4xl font-black leading-[0.92] tracking-[-0.075em] text-white md:text-6xl">Quotes ready to send, follow up, or become jobs.</h1>
        <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-slate-300 md:text-base">Tap a quote to open a real action slip. Save notes, mark sent, record acceptance/decline, or convert the quote into a job.</p>
        <div className="mt-5 flex flex-wrap gap-3"><Link to="/quotes/new" className={`rounded-2xl px-5 py-3 text-sm font-black ${industrialAction}`}>Create quote</Link><button type="button" onClick={load} className={`rounded-2xl px-5 py-3 text-sm font-black ${industrialGhost}`}>Refresh quotes</button><Link to="/dashboard" className={`rounded-2xl px-5 py-3 text-sm font-black ${industrialGhost}`}>Command Board</Link></div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4"><MetricCard label="Drafts" value={draftQuotes.length} text="Quotes waiting for owner review." color="#facc15" /><MetricCard label="Follow ups" value={followUps.length} text="Sent quotes needing customer follow-up." color="#22d3ee" /><MetricCard label="Accepted" value={accepted.length} text="Quotes accepted or converted to jobs." color="#34d399" /><MetricCard label="Declined" value={declined.length} text="Quotes marked declined." color="#f43f5e" /></section>

      <section className="rounded-[30px] border border-white/10 p-5 text-white md:p-6" style={tileStyle}>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">Quote list</div><h2 className="mt-2 text-3xl font-black tracking-[-0.06em] text-white">Tap a quote to review it</h2></div>{loading ? <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-slate-300">Loading…</span> : <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-slate-300">{quotes.length} quotes</span>}</div>
        {quotes.length ? <div className="grid gap-3">{quotes.map((quote, index) => <QuoteRow key={idOf(quote) || `${titleOf(quote)}-${index}`} quote={quote} onOpen={setSelectedQuote} />)}</div> : <div className="rounded-[26px] border border-white/10 bg-white/[0.06] p-5"><h3 className="text-2xl font-black tracking-[-0.05em] text-white">No quotes showing yet.</h3><p className="mt-2 text-sm font-bold leading-6 text-slate-300">Create a quote and Churvox can turn it into a job when approved.</p><Link to="/quotes/new" className={`mt-4 inline-flex rounded-2xl px-5 py-3 text-sm font-black no-underline ${industrialAction}`}>Create quote</Link></div>}
      </section>
    </section>
    <QuoteSlip quote={selectedQuote} busy={busy} onClose={() => setSelectedQuote(null)} onRefresh={refreshFromSlip} api={api} />
  </main>;
}
