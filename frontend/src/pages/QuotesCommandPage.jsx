import React from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { useApi } from "../hooks/useApi";

const navGroups = [
  { title: "Command", items: [["Command Board", "/dashboard", "CB"], ["AI Operator", "/ai-operator", "AI"], ["Approvals", "/ai-operator/approvals", "OK"], ["Notifications", "/notifications", "NT"]] },
  { title: "Work", items: [["Jobs", "/jobs", "JB"], ["Dispatch", "/dispatch", "DP"], ["Clients", "/clients", "CL"], ["Quotes", "/quotes", "QT"], ["Invoices", "/invoices", "IV"], ["Money Desk", "/money-desk", "$"]] },
  { title: "Crew & Admin", items: [["Team", "/team", "TM"], ["Crew Ops", "/crew-ops", "CO"], ["Payroll", "/payroll", "PR"], ["Reports", "/reports", "RP"]] },
  { title: "System", items: [["Setup", "/onboarding", "SU"], ["Trade Presets", "/trade-presets", "TP"], ["Automation", "/automation", "AU"], ["Integrations", "/integrations", "IN"], ["Operator Tools", "/operator-tools", "OT"], ["Plans", "/plans", "PL"], ["Billing", "/billing-confidence", "BI"], ["Settings", "/settings", "ST"], ["Support", "/support", "?"]] },
];

const sampleQuotes = [
  { id: "sample-q1", quote_number: "QT-1041", client_name: "Green Street Rentals", title: "Rental lawn care package", status: "draft", total: 680, created_at: "Today", description: "Draft quote ready for owner review before sending." },
  { id: "sample-q2", quote_number: "QT-1040", client_name: "Sarah Williams", title: "Hedge trim and green waste", status: "sent", total: 420, created_at: "Yesterday", description: "Sent quote waiting on customer answer." },
  { id: "sample-q3", quote_number: "QT-1039", client_name: "ECB Property Maintenance", title: "Property maintenance run", status: "accepted", total: 1850, created_at: "This week", description: "Accepted quote can move toward job creation or invoice planning." },
  { id: "sample-q4", quote_number: "QT-1038", client_name: "Wilson Family", title: "Garden tidy quote", status: "follow_up", total: 310, created_at: "Last week", description: "Quiet quote may need a polite follow-up." },
];

function isActivePath(pathname, href) {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/overview";
  if (href === "/dispatch") return pathname === "/dispatch" || pathname === "/dispatch-board";
  if (href === "/money-desk") return pathname === "/money-desk" || pathname === "/money";
  if (href === "/quotes") return pathname === "/quotes" || pathname.startsWith("/quotes/");
  return pathname === href || pathname.startsWith(`${href}/`);
}

function arr(value) {
  const data = value?.data ?? value;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.quotes)) return data.quotes;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function idOf(record) {
  const raw = record?.id || record?._id || record?.quote_id || "";
  if (typeof raw === "object" && raw?.$oid) return raw.$oid;
  return String(raw || "");
}

function money(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n.toLocaleString("en-NZ", { style: "currency", currency: "NZD" }) : "$0.00";
}

function quoteTitle(quote) {
  return quote?.title || quote?.quote_title || quote?.service_type || quote?.description || quote?.quote_number || "Untitled quote";
}

function clientName(quote) {
  return quote?.client_name || quote?.customer_name || quote?.client?.name || "No client saved";
}

function quoteAmount(quote) {
  return quote?.total || quote?.amount || quote?.subtotal || quote?.price || 0;
}

function statusOf(quote) {
  return String(quote?.status || quote?.quote_status || "draft").toLowerCase().replaceAll(" ", "_");
}

function prettyStatus(status) {
  return String(status || "draft").replaceAll("_", " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function statusStyle(status) {
  if (["accepted", "approved", "won"].includes(status)) return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (["sent", "emailed", "issued"].includes(status)) return "border-blue-200 bg-blue-50 text-blue-800";
  if (["follow_up", "overdue", "pending"].includes(status)) return "border-amber-200 bg-amber-50 text-amber-800";
  if (["declined", "lost", "rejected"].includes(status)) return "border-red-200 bg-red-50 text-red-800";
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function Sidebar() {
  const { pathname } = useLocation();
  return (
    <aside className="hidden w-[292px] shrink-0 overflow-y-auto border-r border-slate-800 bg-[#0f1722] p-4 text-white lg:block">
      <div className="mb-6 flex items-center gap-3 px-1">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-500 text-lg font-black text-slate-950">C</div>
        <div><div className="text-sm font-black tracking-[-0.03em]">CHURVOX</div><div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Command Desk</div></div>
      </div>
      <div className="space-y-5">
        {navGroups.map((group) => (
          <section key={group.title}>
            <div className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{group.title}</div>
            <nav className="space-y-1">
              {group.items.map(([label, href, icon]) => {
                const active = isActivePath(pathname, href);
                return (
                  <Link key={href} to={href} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-black ${active ? "bg-white text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}>
                    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-xl text-[10px] font-black ${active ? "bg-slate-950 text-white" : "bg-white/10 text-cyan-200"}`}>{icon}</span>
                    <span className="truncate">{label}</span>
                  </Link>
                );
              })}
            </nav>
          </section>
        ))}
      </div>
    </aside>
  );
}

function QuoteCard({ quote, onOpen }) {
  const status = statusOf(quote);
  const id = idOf(quote);
  return (
    <article className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{quote?.quote_number || quote?.created_at || "Quote"}</span>
          <h3 className="mt-1 text-lg font-black tracking-[-0.04em] text-slate-950">{quoteTitle(quote)}</h3>
        </div>
        <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${statusStyle(status)}`}>{prettyStatus(status)}</span>
      </div>
      <div className="mt-3 space-y-1 text-sm font-bold text-slate-600">
        <div>{clientName(quote)}</div>
        <div className="text-slate-400">{quote?.description || quote?.scope || "No quote description saved"}</div>
        <div className="text-slate-500">Value: {money(quoteAmount(quote))}</div>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={() => onOpen(quote)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-black text-slate-800 hover:bg-slate-50">Review slip</button>
        {id && !id.startsWith("sample-") ? <Link to={`/quotes/${id}`} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700" style={{ display: 'none' }}><span style={{ display: "none" }}>Review slip</span></Link> : <Link to="/quotes/new" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">Create real quote</Link>}
      </div>
    </article>
  );
}

function QuoteSlip({ quote, onClose }) {
  if (!quote) return null;
  const id = idOf(quote);
  const status = statusOf(quote);
  return (
    <div className="fixed inset-0 z-[2147483647] h-[100dvh] w-screen overflow-hidden bg-[#f5f7f1] text-slate-950" role="dialog" aria-modal="true">
      <div className="flex h-[100dvh] w-screen flex-col overflow-hidden bg-[#f5f7f1]">
        <header className="relative overflow-hidden border-b border-slate-800 bg-slate-950 p-6 text-white md:p-7">
          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">FULL SCREEN QUOTE SLIP</div>
              <h2 className="mt-4 text-3xl font-black leading-[0.95] tracking-[-0.07em] md:text-5xl">{quoteTitle(quote)}</h2>
            </div>
            <button type="button" onClick={onClose} className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-black text-white hover:bg-white/15">Close</button>
          </div>
          <p className="relative mt-5 max-w-xl text-sm font-semibold leading-6 text-slate-300">{clientName(quote)} · {money(quoteAmount(quote))}</p>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto bg-[#f4f6f8] p-5 md:p-6">
          <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">What needs attention</div>
            <p className="mt-3 text-lg font-black tracking-[-0.035em] text-slate-950">Status: {prettyStatus(status)}</p>
            <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-bold leading-6 text-blue-950">{status === "accepted" ? "This quote is accepted. It can move into job or invoice flow." : status === "sent" ? "This quote has been sent. Watch for reply or prepare a follow-up." : status === "follow_up" ? "This quote may need a polite customer nudge." : "Review the quote details before sending it to the customer."}</div>
          </section>
          <section className="mt-4 rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Quote details</div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Client</div><div className="mt-1 text-sm font-black text-slate-950">{clientName(quote)}</div></div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Value</div><div className="mt-1 text-sm font-black text-slate-950">{money(quoteAmount(quote))}</div></div>
            </div>
            <p className="mt-4 text-sm font-bold leading-6 text-slate-600">{quote?.description || quote?.scope || quote?.notes || "No description saved for this quote yet."}</p>
          </section>
        </main>

        <footer className="flex flex-wrap gap-3 border-t border-slate-200 bg-white p-5">
          {id && !id.startsWith("sample-") ? <Link to={`/quotes/${id}`} className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">Open quote record</Link> : <Link to="/quotes/new" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">Create real quote</Link>}
          <Link to="/quotes/new" className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800 hover:bg-slate-50">New quote</Link>
        </footer>
      </div>
    </div>
  );
}

function QuotesCommandContent() {
  const { get } = useApi();
  const [quotes, setQuotes] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [activeQuote, setActiveQuote] = React.useState(null);

  React.useEffect(() => {
    let alive = true;
    async function loadQuotes() {
      setLoading(true);
      const res = await get("/quotes");
      if (!alive) return;
      if (res?.success) {
        setQuotes(arr(res));
        setError("");
      } else {
        setError(res?.error || "Could not load quotes");
        setQuotes([]);
      }
      setLoading(false);
    }
    loadQuotes();
    return () => { alive = false; };
  }, [get]);

  const list = quotes.length ? quotes : sampleQuotes;
  const counts = React.useMemo(() => {
    const total = list.length;
    const draft = list.filter((quote) => ["draft", "new"].includes(statusOf(quote))).length;
    const sent = list.filter((quote) => ["sent", "emailed", "issued"].includes(statusOf(quote))).length;
    const accepted = list.filter((quote) => ["accepted", "approved", "won"].includes(statusOf(quote))).length;
    const value = list.reduce((sum, quote) => sum + Number(quoteAmount(quote) || 0), 0);
    return { total, draft, sent, accepted, value };
  }, [list]);

  return (
    <main className="fixed inset-0 z-[2147483000] overflow-y-auto bg-[#eef1f4] text-slate-950">
      <div className="flex min-h-screen">
        <Sidebar />
        <section className="min-w-0 flex-1 p-4 pb-28 md:p-6 md:pb-28 xl:p-8 xl:pb-28">
          <header className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]">
            <div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Quotes Command</div><div className="text-sm font-bold text-slate-500">See draft quotes, sent quotes, accepted quotes and follow-up work.</div></div>
            <div className="flex flex-wrap gap-3"><Link to="/clients" className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-800 hover:bg-slate-50">Clients</Link><Link to="/quotes/new" className="rounded-2xl bg-amber-500 px-4 py-2 text-sm font-black text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400">Create quote</Link></div>
          </header>

          <section className="grid gap-5 xl:grid-cols-[1fr_430px]">
            <div className="overflow-hidden rounded-[30px] border border-slate-900 bg-slate-950 shadow-[0_26px_80px_rgba(15,23,42,0.20)]">
              <div className="relative p-6 md:p-8">
                <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />
                <div className="relative">
                  <span className="inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">Quotes Command</span>
                  <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[0.92] tracking-[-0.075em] text-white md:text-6xl">Quotes should turn into work, not sit forgotten.</h1>
                  <p className="mt-5 max-w-2xl text-sm font-semibold leading-6 text-slate-300 md:text-base">Churvox keeps quote records visible so the owner can review drafts, chase sent quotes and move accepted quotes forward.</p>
                </div>
              </div>
            </div>
            <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)]">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Quote health</div>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.055em] text-slate-950">What needs attention</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="text-2xl font-black text-slate-900">{counts.draft}</div><div className="text-xs font-black uppercase tracking-[0.14em] text-slate-600">Drafts to review</div></div>
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4"><div className="text-2xl font-black text-blue-800">{counts.sent}</div><div className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">Sent quotes</div></div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><div className="text-2xl font-black text-emerald-800">{counts.accepted}</div><div className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">Accepted</div></div>
              </div>
            </div>
          </section>

          <section className="mt-5 grid gap-4 md:grid-cols-4">
            <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Total quotes</div><div className="mt-3 text-3xl font-black tracking-[-0.06em]">{counts.total}</div></div>
            <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Drafts</div><div className="mt-3 text-3xl font-black tracking-[-0.06em] text-slate-950">{counts.draft}</div></div>
            <div className="rounded-[22px] border border-blue-200 bg-blue-50 p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-700">Sent</div><div className="mt-3 text-3xl font-black tracking-[-0.06em] text-blue-900">{counts.sent}</div></div>
            <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">Value</div><div className="mt-3 text-3xl font-black tracking-[-0.06em] text-emerald-900">{money(counts.value)}</div></div>
          </section>

          <section className="mt-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)]">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600">Quote list</div><h2 className="mt-2 text-3xl font-black tracking-[-0.06em] text-slate-950">Open quotes</h2></div>{loading && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">Loading…</span>}{error && <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">Showing sample layout</span>}</div>
            <div className="grid gap-4 xl:grid-cols-2">
              {list.map((quote) => <QuoteCard key={idOf(quote) || quoteTitle(quote)} quote={quote} onOpen={setActiveQuote} />)}
            </div>
          </section>
        </section>
      </div>
      <QuoteSlip quote={activeQuote} onClose={() => setActiveQuote(null)} />
    </main>
  );
}

export default function QuotesCommandPage() {
  if (typeof document === "undefined") return <QuotesCommandContent />;
  return createPortal(<QuotesCommandContent />, document.body);
}
