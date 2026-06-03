import React from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import CommandSlipEverything from "../components/CommandSlipEverything";

const navGroups = [
  { title: "Command", items: [["Command Board", "/dashboard", "CB"], ["AI Operator", "/ai-operator", "AI"], ["Approvals", "/ai-operator/approvals", "OK"], ["Notifications", "/notifications", "NT"]] },
  { title: "Work", items: [["Jobs", "/jobs", "JB"], ["Assign Jobs", "/dispatch", "DP"], ["Clients", "/clients", "CL"], ["Quotes", "/quotes", "QT"], ["Invoices", "/invoices", "IV"], ["Money Desk", "/money-desk", "$"]] },
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
  return quote?.client_name || quote?.customer_name || quote?.client?.name || "No client linked";
}

function quoteAmount(quote) {
  return quote?.total || quote?.amount || quote?.subtotal || quote?.price || 0;
}


function quoteBlob(quote) {
  try {
    return JSON.stringify(quote || {});
  } catch {
    return `${quote?.title || ""} ${quote?.client_name || ""} ${quote?.customer_name || ""} ${quote?.description || ""}`;
  }
}

function isLaunchAuditQuote(quote) {
  const blob = quoteBlob(quote);
  return [
    /PW E2E/i,
    /PW E2E Client/i,
    /Playwright/i,
    /Deep Audit/i,
    /test reflect/i,
    /Test Client/i,
    /TEST Phase/i,
    /pw-e2e-/i,
    /audit@example\.com/i,
    /2026\d{8,}/i,
  ].some((pattern) => pattern.test(blob));
}

function cleanQuoteTitle(quote) {
  const title = quoteTitle(quote);
  if (/PW E2E|PW Client|Playwright|Deep Audit|TEST Phase|Test Client/i.test(title)) return "Quote";
  if (/Untitled quote/i.test(title)) return "Draft quote";
  return String(title || "Quote").replace(/\s+2026\d{8,}/gi, "").trim() || "Quote";
}

function cleanQuoteClient(quote) {
  const name = clientName(quote);
  if (/PW E2E|PW Client|Playwright|Deep Audit|TEST Phase|Test Client/i.test(name)) return "Client";
  return String(name || "No client linked").replace(/\s+2026\d{8,}/gi, "").trim() || "No client linked";
}

function cleanQuoteMeta(quote) {
  const number = quote?.quote_number || "";
  if (number && !/2026\d{8,}/i.test(String(number))) return number;
  return "Quote";
}

function cleanQuoteDescription(quote) {
  const description = quote?.description || quote?.scope || "";
  if (!description || /No description/i.test(description)) return "No description added yet";
  return String(description).replace(/\s+2026\d{8,}/gi, "").trim();
}

function statusOf(quote) {
  return String(quote?.status || quote?.quote_status || "draft").toLowerCase().replaceAll(" ", "_");
}

function prettyStatus(status) {
  const value = String(status || "draft").toLowerCase();
  if (["accepted", "approved", "won"].includes(value)) return "Ready to book";
  if (value === "follow_up") return "Follow up";
  return String(status || "draft").replaceAll("_", " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function statusStyle(status) {
  if (["accepted", "approved", "won"].includes(status)) return "border-emerald-300/40 bg-emerald-400/15 text-emerald-100";
  if (["sent", "emailed", "issued"].includes(status)) return "border-cyan-300/40 bg-cyan-300/15 text-cyan-100";
  if (["follow_up", "overdue", "pending"].includes(status)) return "border-amber-300/50 bg-amber-300/18 text-amber-100";
  if (["declined", "lost", "rejected"].includes(status)) return "border-red-300/40 bg-red-400/15 text-red-100";
  return "border-slate-300/30 bg-white/10 text-slate-100";
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
                  <Link key={href} to={href} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-black ${active ? "bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-300/20" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}>
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
    <article className="rounded-[22px] border border-white/10 bg-white/[0.035] p-4 text-white shadow-[0_14px_38px_rgba(15,23,42,0.12)] transition hover:-translate-y-0.5 hover:border-cyan-300/40 hover:bg-white/[0.06]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/70">{cleanQuoteMeta(quote)}</span>
          <h3 className="mt-1 text-lg font-black tracking-[-0.04em] text-white">{cleanQuoteTitle(quote)}</h3>
        </div>
        <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${statusStyle(status)}`}>{prettyStatus(status)}</span>
      </div>
      <div className="mt-3 space-y-1 text-sm font-bold text-slate-200">
        <div>{cleanQuoteClient(quote)}</div>
        <div className="text-slate-300/80">{cleanQuoteDescription(quote)}</div>
        <div className="text-slate-300/80">Quote value: {money(quoteAmount(quote))}</div>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={() => onOpen(quote)} className="rounded-xl border border-cyan-300/40 bg-cyan-300/10 px-4 py-2 text-sm font-black text-cyan-100 hover:bg-cyan-300/20">Review quote</button>
        {id && !id.startsWith("sample-") ? <Link to={`/quotes/${id}`} className="hidden rounded-xl bg-cyan-300 px-4 py-2 text-sm font-black text-slate-950 shadow-lg shadow-cyan-300/20 hover:bg-cyan-200"><span className="hidden">Review quote</span></Link> : <Link to="/quotes/new" className="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-black text-slate-950 shadow-lg shadow-cyan-300/20 hover:bg-cyan-200">Create quote</Link>}
      </div>
    </article>
  );
}

function QuoteSlip({ quote, onClose }) {
  if (!quote) return null;

  const id = idOf(quote);
  const status = statusOf(quote);
  const amount = quoteAmount(quote);
  const customer = clientName(quote);
  const title = quoteTitle(quote);
  const email = quote?.customer_email || quote?.client_email || quote?.email || quote?.client?.email || "";
  const phone = quote?.customer_phone || quote?.client_phone || quote?.phone || quote?.client?.phone || "";
  const address = quote?.job_address || quote?.site_address || quote?.address || quote?.client_address || quote?.client?.address || "";
  const description = quote?.description || quote?.scope || quote?.notes || "No description saved for this quote yet.";

  const needsAttention =
    status === "accepted"
      ? "This quote is ready to move into a job or invoice flow."
      : status === "sent"
        ? "This quote has been sent. Check the customer status and prepare a follow-up if needed."
        : status === "follow_up"
          ? "This quote may need a polite customer follow-up."
          : "Review the quote details before sending it to the customer.";

  const rows = [
    ["Quote", quote?.quote_number || id || "Not saved"],
    ["Client", customer],
    ["Email", email || "Not found"],
    ["Phone", phone || "Not found"],
    ["Address / site", address || "Not found"],
    ["Status", prettyStatus(status)],
    ["Quote value", money(amount)],
    ["Created", quote?.created_at || "Not found"],
    ["Description", description],
  ];

  return (
    <div className="fixed inset-0 z-[2147483647] h-[100dvh] w-screen overflow-hidden bg-[#0f1722] text-slate-950" role="dialog" aria-modal="true">
      <section className="flex h-[100dvh] w-screen flex-col overflow-hidden bg-[#0f1722]">
        <header className="shrink-0 border-b border-white/10 bg-[#0f1722] px-5 py-5 text-white md:px-9 md:py-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">
                Quote review
              </div>

              <h1 className="mt-3 text-4xl font-black leading-[0.9] tracking-[-0.075em] text-white md:text-6xl">
                {title}
              </h1>

              <p className="mt-3 max-w-5xl text-sm font-bold leading-6 text-slate-300">
                {customer} · {money(amount)}. Review the quote, customer, value, status, notes and linked details before opening the record.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white hover:bg-white/20"
            >
              Close
            </button>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto bg-[#f5f7f1] p-4 md:p-7">
          <div className="grid min-h-full w-full gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
            <div className="space-y-5">
              <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)]">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-600">
                  What needs attention
                </div>

                <h2 className="mt-3 text-3xl font-black tracking-[-0.06em] text-slate-950">
                  {status === "draft" ? "Review draft before sending." : prettyStatus(status)}
                </h2>

                <p className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-black leading-6 text-blue-950">
                  {needsAttention}
                </p>
              </section>

              <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)]">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-600">
                  Quote details
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {rows.map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                        {label}
                      </div>
                      <div className="mt-2 whitespace-pre-wrap break-words text-sm font-black leading-6 text-slate-950">
                        {String(value || "Not found")}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <CommandSlipEverything
                record={quote}
                context="Quote review"
              />
            </div>

            <aside className="rounded-[30px] border border-white/10 bg-[#0f1722] p-5 text-white shadow-[0_18px_55px_rgba(15,23,42,0.18)] xl:sticky xl:top-0 xl:h-fit">
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-200">
                Quote actions
              </div>

              <h2 className="mt-2 text-3xl font-black tracking-[-0.05em] text-white">
                Review first.
              </h2>

              <div className="mt-5 rounded-2xl bg-white/10 p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">Status</div>
                <div className="mt-2 text-sm font-black text-white">{prettyStatus(status)}</div>
              </div>

              <div className="mt-3 rounded-2xl bg-white/10 p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">Quote value</div>
                <div className="mt-2 text-sm font-black text-white">{money(amount)}</div>
              </div>

              <div className="mt-3 rounded-2xl bg-white/10 p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">Customer</div>
                <div className="mt-2 text-sm font-black text-white">{customer}</div>
              </div>

              <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-200">Owner rule</div>
                <p className="mt-2 text-xs font-black leading-5 text-amber-50">
                  Do not send the quote, convert it, change pricing, or message the customer without owner approval.
                </p>
              </div>

              <div className="mt-5 grid gap-3">
                {id && !id.startsWith("sample-") ? (
                  <Link
                    to={`/quotes/${id}`}
                    className="rounded-2xl bg-cyan-300 px-5 py-3 text-center text-sm font-black text-slate-950 shadow-lg shadow-cyan-300/20 hover:bg-cyan-200"
                  >
                    Open quote record
                  </Link>
                ) : (
                  <Link
                    to="/quotes/new"
                    className="rounded-2xl bg-cyan-300 px-5 py-3 text-center text-sm font-black text-slate-950 shadow-lg shadow-cyan-300/20 hover:bg-cyan-200"
                  >
                    Create quote
                  </Link>
                )}

                <Link
                  to="/quotes/new"
                  className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-center text-sm font-black text-white hover:bg-white/15"
                >
                  New quote
                </Link>

                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white hover:bg-white/15"
                >
                  Back to quotes
                </button>
              </div>
            </aside>
          </div>
        </main>
      </section>
    </div>
  );
}

function StatCard({ label, value, tone }) {
  const styles = {
    dark: "border-slate-800 bg-[#0f1722] text-white",
    amber: "border-amber-400/35 bg-[#2b2115] text-amber-100",
    cyan: "border-cyan-400/30 bg-[#102a3a] text-cyan-100",
    green: "border-emerald-400/30 bg-[#102d27] text-emerald-100",
  };

  return (
    <div className={`rounded-[22px] border p-4 shadow-[0_14px_38px_rgba(15,23,42,0.14)] ${styles[tone] || styles.dark}`}>
      <div className="text-[10px] font-black uppercase tracking-[0.16em] opacity-80">{label}</div>
      <div className="mt-3 text-3xl font-black tracking-[-0.06em]">{value}</div>
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

  const visibleQuotes = quotes.filter((quote) => !isLaunchAuditQuote(quote));
  const list = visibleQuotes.length ? visibleQuotes : sampleQuotes;
  const counts = React.useMemo(() => {
    const total = list.length;
    const draft = list.filter((quote) => ["draft", "new"].includes(statusOf(quote))).length;
    const sent = list.filter((quote) => ["sent", "emailed", "issued"].includes(statusOf(quote))).length;
    const accepted = list.filter((quote) => ["accepted", "approved", "won"].includes(statusOf(quote))).length;
    const value = list.reduce((sum, quote) => sum + Number(quoteAmount(quote) || 0), 0);
    return { total, draft, sent, accepted, value };
  }, [list]);

  return (
    <main className="fixed inset-0 z-[2147483000] overflow-y-auto bg-[#f5f7f1] text-slate-950">
      <div className="flex min-h-screen">
        <Sidebar />
        <section className="min-w-0 flex-1 p-4 pb-28 md:p-6 md:pb-28 xl:p-8 xl:pb-28">
          <section className="grid gap-5 xl:grid-cols-[1fr_430px]">
            <div className="overflow-hidden rounded-[30px] border border-slate-900 bg-slate-950 shadow-[0_26px_80px_rgba(15,23,42,0.20)]">
              <div className="relative p-6 md:p-8">
                <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl" />
                <div className="relative">
                  <span className="inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">Quotes</span>
                  <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[0.92] tracking-[-0.075em] text-white md:text-6xl">Turn approved quotes into booked work.</h1>
                  <p className="mt-5 max-w-2xl text-sm font-semibold leading-6 text-slate-300 md:text-base">Review drafts, follow up sent quotes, and move approved quotes into jobs.</p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link to="/clients" className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white hover:bg-white/15">View clients</Link>
                    <Link to="/quotes/new" className="rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-cyan-300/20 hover:bg-cyan-200">Create quote</Link>
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-[30px] border border-slate-900 bg-slate-950 p-5 text-white shadow-[0_18px_55px_rgba(15,23,42,0.16)]">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">Quote health</div>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.055em] text-white">What needs attention</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <StatCard label="Drafts to review" value={counts.draft} tone="amber" />
                <StatCard label="Sent quotes" value={counts.sent} tone="cyan" />
                <StatCard label="Ready to book" value={counts.accepted} tone="green" />
              </div>
            </div>
          </section>

          <section className="mt-5 grid gap-4 md:grid-cols-4">
            <StatCard label="Total quotes" value={counts.total} tone="dark" />
            <StatCard label="Drafts" value={counts.draft} tone="amber" />
            <StatCard label="Sent" value={counts.sent} tone="cyan" />
            <StatCard label="Quote value" value={money(counts.value)} tone="green" />
          </section>

          <section className="mt-5 rounded-[28px] border border-slate-900 bg-slate-950 p-5 text-white shadow-[0_18px_55px_rgba(15,23,42,0.16)]">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">Quote list</div><h2 className="mt-2 text-3xl font-black tracking-[-0.06em] text-white">Open quotes</h2></div>{loading && <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-slate-200">Loading…</span>}{error && <span className="rounded-full bg-amber-300/15 px-3 py-1 text-xs font-black text-amber-100">Showing sample layout</span>}</div>
            <div className="grid gap-4 xl:grid-cols-2">
              {list.map((quote) => <QuoteCard key={idOf(quote) || cleanQuoteTitle(quote)} quote={quote} onOpen={setActiveQuote} />)}
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
