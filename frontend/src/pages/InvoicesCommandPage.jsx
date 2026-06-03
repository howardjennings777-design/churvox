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

const sampleInvoices = [
  { id: "sample-i1", invoice_number: "INV-2041", client_name: "Green Street Rentals", status: "draft", total: 680, amount_due: 680, created_at: "Today", description: "Draft invoice prepared from completed work." },
  { id: "sample-i2", invoice_number: "INV-2040", client_name: "Sarah Williams", status: "sent", total: 420, amount_due: 420, created_at: "Yesterday", description: "Sent invoice waiting on payment." },
  { id: "sample-i3", invoice_number: "INV-2039", client_name: "ECB Property Maintenance", status: "overdue", total: 1850, amount_due: 1850, created_at: "Last week", description: "Overdue invoice needs a polite payment reminder." },
  { id: "sample-i4", invoice_number: "INV-2038", client_name: "Wilson Family", status: "paid", total: 310, amount_due: 0, amount_paid: 310, created_at: "Last week", description: "Paid invoice record." },
];

function isActivePath(pathname, href) {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/overview";
  if (href === "/dispatch") return pathname === "/dispatch" || pathname === "/dispatch-board";
  if (href === "/money-desk") return pathname === "/money-desk" || pathname === "/money";
  if (href === "/invoices") return pathname === "/invoices" || pathname.startsWith("/invoices/");
  return pathname === href || pathname.startsWith(`${href}/`);
}

function arr(value) {
  const data = value?.data ?? value;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.invoices)) return data.invoices;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function idOf(record) {
  const raw = record?.id || record?._id || record?.invoice_id || "";
  if (typeof raw === "object" && raw?.$oid) return raw.$oid;
  return String(raw || "");
}

function money(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n.toLocaleString("en-NZ", { style: "currency", currency: "NZD" }) : "$0.00";
}

function invoiceTitle(invoice) {
  return invoice?.invoice_number || invoice?.title || invoice?.description || "Invoice";
}

function clientName(invoice) {
  return invoice?.client_name || invoice?.customer_name || invoice?.client?.name || "No client linked";
}

function invoiceTotal(invoice) {
  return invoice?.total || invoice?.amount || invoice?.subtotal || invoice?.invoice_total || 0;
}

function amountDue(invoice) {
  const raw = invoice?.amount_due ?? invoice?.balance_due ?? invoice?.balance ?? invoice?.outstanding ?? invoiceTotal(invoice);
  return Number(raw || 0);
}


function invoiceBlob(invoice) {
  try {
    return JSON.stringify(invoice || {});
  } catch {
    return `${invoice?.invoice_number || ""} ${invoice?.client_name || ""} ${invoice?.customer_name || ""} ${invoice?.description || ""}`;
  }
}

function isLaunchAuditInvoice(invoice) {
  const blob = invoiceBlob(invoice);
  return [
    /PW E2E/i,
    /PW Invoice/i,
    /Playwright/i,
    /Deep Audit/i,
    /test reflect/i,
    /Test Client/i,
    /TEST Phase/i,
    /pw-e2e-/i,
    /audit@example\.com/i,
    /workflow audit/i,
    /2026\d{8,}/i,
  ].some((pattern) => pattern.test(blob));
}

function cleanInvoiceNumber(invoice) {
  const number = invoice?.invoice_number || invoice?.number || "";
  if (!number || /2026\d{8,}/i.test(String(number))) return "Invoice";
  return String(number).replace(/\s+2026\d{8,}/gi, "").trim();
}

function cleanInvoiceClient(invoice) {
  const name = clientName(invoice);
  if (/PW E2E|PW Client|PW Invoice|Playwright|Deep Audit|TEST Phase|Test Client/i.test(name)) return "Client";
  return String(name || "No client linked").replace(/\s+2026\d{8,}/gi, "").trim() || "No client linked";
}

function cleanInvoiceDescription(invoice) {
  const description = invoice?.description || invoice?.notes || "";
  if (!description || /No description/i.test(description)) return "No description added yet";
  if (/PW E2E|Playwright|workflow audit|Deep Audit|test reflect/i.test(description)) return "Invoice prepared from completed work.";
  return String(description).replace(/\s+2026\d{8,}/gi, "").trim();
}

function statusOf(invoice) {
  return String(invoice?.status || invoice?.payment_status || "draft").toLowerCase().replaceAll(" ", "_");
}

function isPaid(invoice) {
  const status = statusOf(invoice);
  return ["paid", "complete", "completed"].includes(status) || (amountDue(invoice) <= 0 && Number(invoice?.amount_paid || 0) > 0);
}

function prettyStatus(status, invoice) {
  if (invoice && isPaid(invoice)) return "Paid";
  return String(status || "draft").replaceAll("_", " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function statusStyle(status, invoice) {
  if (isPaid(invoice)) return "border-emerald-300/40 bg-emerald-400/15 text-emerald-100";
  if (["sent", "issued", "emailed"].includes(status)) return "border-cyan-300/40 bg-cyan-300/15 text-cyan-100";
  if (["overdue", "late", "unpaid"].includes(status)) return "border-red-300/40 bg-red-400/15 text-red-100";
  if (["draft", "new", "pending"].includes(status)) return "border-amber-300/50 bg-amber-300/18 text-amber-100";
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

function InvoiceCard({ invoice, onOpen }) {
  const status = statusOf(invoice);
  const id = idOf(invoice);
  return (
    <article className="rounded-[22px] border border-white/10 bg-white/[0.035] p-4 text-white shadow-[0_14px_38px_rgba(15,23,42,0.12)] transition hover:-translate-y-0.5 hover:border-cyan-300/40 hover:bg-white/[0.06]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/70">{cleanInvoiceNumber(invoice)}</span>
          <h3 className="mt-1 text-lg font-black tracking-[-0.04em] text-white">{cleanInvoiceClient(invoice)}</h3>
        </div>
        <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${statusStyle(status, invoice)}`}>{prettyStatus(status, invoice)}</span>
      </div>
      <div className="mt-3 space-y-1 text-sm font-bold text-slate-200">
        <div>{cleanInvoiceDescription(invoice)}</div>
        <div className="text-slate-300/80">Draft total: {money(invoiceTotal(invoice))}</div>
        <div className="text-slate-300/80">Amount due: {money(amountDue(invoice))}</div>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={() => onOpen(invoice)} className="rounded-xl border border-cyan-300/40 bg-cyan-300/10 px-4 py-2 text-sm font-black text-cyan-100 hover:bg-cyan-300/20">Review invoice</button>
        {id && !id.startsWith("sample-") ? <Link to={`/invoices/${id}`} className="hidden rounded-xl bg-cyan-300 px-4 py-2 text-sm font-black text-slate-950 shadow-lg shadow-cyan-300/20 hover:bg-cyan-200"><span className="hidden">Review invoice</span></Link> : <Link to="/invoices/new" className="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-black text-slate-950 shadow-lg shadow-cyan-300/20 hover:bg-cyan-200">Create invoice</Link>}
      </div>
    </article>
  );
}

function InvoiceSlip({ invoice, onClose }) {
  if (!invoice) return null;

  const id = idOf(invoice);
  const status = statusOf(invoice);
  const paid = isPaid(invoice);

  const rows = [
    ["Invoice", invoiceTitle(invoice)],
    ["Client", clientName(invoice)],
    ["Status", paid ? "Paid" : prettyStatus(status)],
    ["Draft total", money(invoiceTotal(invoice))],
    ["Amount due", money(amountDue(invoice))],
    ["Description", invoice?.description || invoice?.notes || "No description added yet"],
    ["Created", invoice?.created_at],
    ["Invoice ID", id],
  ].filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "");

  return (
    <div className="fixed inset-0 z-[2147483647] h-[100dvh] w-screen overflow-hidden bg-[#0f1722] text-slate-950" role="dialog" aria-modal="true">
      <section className="flex h-[100dvh] w-screen flex-col overflow-hidden bg-[#0f1722]">
        <header className="shrink-0 border-b border-white/10 bg-[#0f1722] px-5 py-5 text-white md:px-9 md:py-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">
                Invoice review
              </div>

              <h1 className="mt-3 text-4xl font-black leading-[0.9] tracking-[-0.075em] text-white md:text-6xl">
                {invoiceTitle(invoice)}
              </h1>

              <p className="mt-3 max-w-5xl text-sm font-bold leading-6 text-slate-300">
                {clientName(invoice)} · {money(invoiceTotal(invoice))}. Review the invoice, payment status, amount due and notes before opening the record.
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
                  {paid ? "This invoice is paid." : status === "overdue" ? "This invoice needs follow-up." : status === "draft" ? "Review the draft before sending." : "Watch payment status and follow up if needed."}
                </h2>

                <p className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-black leading-6 text-blue-950">
                  Review drafts, send ready invoices, follow up overdue money, and track what has been paid.
                </p>
              </section>

              <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)]">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-600">
                  Invoice details
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {rows.map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</div>
                      <div className="mt-2 whitespace-pre-wrap break-words text-sm font-black leading-6 text-slate-950">{String(value)}</div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[30px] border border-amber-200 bg-amber-50 p-5">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">
                  Owner rule
                </div>
                <p className="mt-3 text-sm font-black leading-6 text-amber-950">
                  Do not send reminders, mark paid, sync accounting, or change invoice status without owner approval.
                </p>
              </section>

              <CommandSlipEverything
                record={invoice}
                context="Invoice review"
              />
            </div>

            <aside className="rounded-[30px] border border-white/10 bg-[#0f1722] p-5 text-white shadow-[0_18px_55px_rgba(15,23,42,0.18)] xl:sticky xl:top-0 xl:h-fit">
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-200">
                Invoice actions
              </div>

              <h2 className="mt-2 text-3xl font-black tracking-[-0.05em] text-white">
                Review first.
              </h2>

              <div className="mt-5 rounded-2xl bg-white/10 p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">Status</div>
                <div className="mt-2 text-sm font-black text-white">{paid ? "Paid" : prettyStatus(status)}</div>
              </div>

              <div className="mt-3 rounded-2xl bg-white/10 p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">Amount due</div>
                <div className="mt-2 text-sm font-black text-white">{money(amountDue(invoice))}</div>
              </div>

              <div className="mt-5 grid gap-3">
                {id && !id.startsWith("sample-") ? (
                  <Link to={`/invoices/${id}`} className="rounded-2xl bg-cyan-300 px-5 py-3 text-center text-sm font-black text-slate-950 shadow-lg shadow-cyan-300/20 hover:bg-cyan-200">
                    Open invoice record
                  </Link>
                ) : (
                  <Link to="/invoices/new" className="rounded-2xl bg-cyan-300 px-5 py-3 text-center text-sm font-black text-slate-950 shadow-lg shadow-cyan-300/20 hover:bg-cyan-200">
                    Create invoice
                  </Link>
                )}

                <Link to="/money-desk" className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-center text-sm font-black text-white hover:bg-white/15">
                  Open money desk
                </Link>

                <button type="button" onClick={onClose} className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white hover:bg-white/15">
                  Back to invoices
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
    red: "border-red-400/30 bg-[#331515] text-red-100",
  };

  return (
    <div className={`rounded-[22px] border p-4 shadow-[0_14px_38px_rgba(15,23,42,0.14)] ${styles[tone] || styles.dark}`}>
      <div className="text-[10px] font-black uppercase tracking-[0.16em] opacity-80">{label}</div>
      <div className="mt-3 text-3xl font-black tracking-[-0.06em]">{value}</div>
    </div>
  );
}

function InvoicesCommandContent() {
  const { get } = useApi();
  const [invoices, setInvoices] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [activeInvoice, setActiveInvoice] = React.useState(null);

  React.useEffect(() => {
    let alive = true;
    async function loadInvoices() {
      setLoading(true);
      const res = await get("/invoices");
      if (!alive) return;
      if (res?.success) {
        setInvoices(arr(res));
        setError("");
      } else {
        setError(res?.error || "Could not load invoices");
        setInvoices([]);
      }
      setLoading(false);
    }
    loadInvoices();
    return () => { alive = false; };
  }, [get]);

  const visibleInvoices = invoices.filter((invoice) => !isLaunchAuditInvoice(invoice));
  const list = visibleInvoices.length ? visibleInvoices : sampleInvoices;
  const counts = React.useMemo(() => {
    const total = list.length;
    const draft = list.filter((invoice) => ["draft", "new", "pending"].includes(statusOf(invoice))).length;
    const sent = list.filter((invoice) => ["sent", "issued", "emailed"].includes(statusOf(invoice))).length;
    const overdue = list.filter((invoice) => ["overdue", "late", "unpaid"].includes(statusOf(invoice))).length;
    const paid = list.filter(isPaid).length;
    const due = list.reduce((sum, invoice) => sum + (isPaid(invoice) ? 0 : amountDue(invoice)), 0);
    return { total, draft, sent, overdue, paid, due };
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
                  <span className="inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">Invoices</span>
                  <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[0.92] tracking-[-0.075em] text-white md:text-6xl">Turn completed work into money ready to collect.</h1>
                  <p className="mt-5 max-w-2xl text-sm font-semibold leading-6 text-slate-300 md:text-base">Review drafts, send ready invoices, follow up overdue money, and track what has been paid.</p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link to="/money-desk" className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white hover:bg-white/15">Open money desk</Link>
                    <Link to="/invoices/new" className="rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-cyan-300/20 hover:bg-cyan-200">Create invoice</Link>
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-[30px] border border-slate-900 bg-slate-950 p-5 text-white shadow-[0_18px_55px_rgba(15,23,42,0.16)]">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">Invoice health</div>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.055em] text-white">What needs attention</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <StatCard label="Drafts to review" value={counts.draft} tone="amber" />
                <StatCard label="Overdue" value={counts.overdue} tone="red" />
                <StatCard label="Outstanding" value={money(counts.due)} tone="cyan" />
              </div>
            </div>
          </section>

          <section className="mt-5 grid gap-4 md:grid-cols-4">
            <StatCard label="Total invoices" value={counts.total} tone="dark" />
            <StatCard label="Sent" value={counts.sent} tone="cyan" />
            <StatCard label="Overdue" value={counts.overdue} tone="red" />
            <StatCard label="Paid invoices" value={counts.paid} tone="green" />
          </section>

          <section className="mt-5 rounded-[28px] border border-slate-900 bg-slate-950 p-5 text-white shadow-[0_18px_55px_rgba(15,23,42,0.16)]">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">Invoice list</div><h2 className="mt-2 text-3xl font-black tracking-[-0.06em] text-white">Open invoices</h2></div>{loading && <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-slate-200">Loading…</span>}{error && <span className="rounded-full bg-amber-300/15 px-3 py-1 text-xs font-black text-amber-100">Showing sample layout</span>}</div>
            <div className="grid gap-4 xl:grid-cols-2">
              {list.map((invoice) => <InvoiceCard key={idOf(invoice) || cleanInvoiceNumber(invoice)} invoice={invoice} onOpen={setActiveInvoice} />)}
            </div>
          </section>
        </section>
      </div>
      <InvoiceSlip invoice={activeInvoice} onClose={() => setActiveInvoice(null)} />
    </main>
  );
}

export default function InvoicesCommandPage() {
  if (typeof document === "undefined") return <InvoicesCommandContent />;
  return createPortal(<InvoicesCommandContent />, document.body);
}
