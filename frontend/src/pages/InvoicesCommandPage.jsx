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
  return invoice?.client_name || invoice?.customer_name || invoice?.client?.name || "No client saved";
}

function invoiceTotal(invoice) {
  return invoice?.total || invoice?.amount || invoice?.subtotal || invoice?.invoice_total || 0;
}

function amountDue(invoice) {
  const raw = invoice?.amount_due ?? invoice?.balance_due ?? invoice?.balance ?? invoice?.outstanding ?? invoiceTotal(invoice);
  return Number(raw || 0);
}

function statusOf(invoice) {
  return String(invoice?.status || invoice?.payment_status || "draft").toLowerCase().replaceAll(" ", "_");
}

function isPaid(invoice) {
  const status = statusOf(invoice);
  return ["paid", "complete", "completed"].includes(status) || (amountDue(invoice) <= 0 && Number(invoice?.amount_paid || 0) > 0);
}

function prettyStatus(status) {
  return String(status || "draft").replaceAll("_", " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function statusStyle(status, invoice) {
  if (isPaid(invoice)) return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (["sent", "issued", "emailed"].includes(status)) return "border-blue-200 bg-blue-50 text-blue-800";
  if (["overdue", "late", "unpaid"].includes(status)) return "border-red-200 bg-red-50 text-red-800";
  if (["draft", "new", "pending"].includes(status)) return "border-amber-200 bg-amber-50 text-amber-800";
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

function InvoiceCard({ invoice, onOpen }) {
  const status = statusOf(invoice);
  const id = idOf(invoice);
  return (
    <article className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{invoice?.invoice_number || invoice?.created_at || "Invoice"}</span>
          <h3 className="mt-1 text-lg font-black tracking-[-0.04em] text-slate-950">{clientName(invoice)}</h3>
        </div>
        <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${statusStyle(status, invoice)}`}>{isPaid(invoice) ? "Paid" : prettyStatus(status)}</span>
      </div>
      <div className="mt-3 space-y-1 text-sm font-bold text-slate-600">
        <div>{invoice?.description || invoice?.notes || "No invoice description saved"}</div>
        <div className="text-slate-500">Total: {money(invoiceTotal(invoice))}</div>
        <div className="text-slate-500">Due: {money(amountDue(invoice))}</div>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={() => onOpen(invoice)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-black text-slate-800 hover:bg-slate-50">Review slip</button>
        {id && !id.startsWith("sample-") ? <Link to={`/invoices/${id}`} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700" style={{ display: 'none' }}><span style={{ display: "none" }}>Review slip</span></Link> : <Link to="/invoices/new" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">Create real invoice</Link>}
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
    ["Total", money(invoiceTotal(invoice))],
    ["Due", money(amountDue(invoice))],
    ["Description", invoice?.description || invoice?.notes || "No description saved"],
    ["Created", invoice?.created_at],
    ["Invoice ID", id],
  ].filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "");

  return (
    <div className="fixed inset-0 z-[2147483647] h-[100dvh] w-screen overflow-hidden bg-[#f5f7f1] text-slate-950" role="dialog" aria-modal="true">
      <section className="flex h-[100dvh] w-screen flex-col overflow-hidden">
        <header className="shrink-0 border-b border-slate-800 bg-[#0f1722] px-4 py-4 text-white md:px-8 md:py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-200">
                FULL SCREEN INVOICE SLIP
              </div>

              <h1 className="mt-2 text-3xl font-black leading-none tracking-[-0.06em] md:text-5xl">
                {invoiceTitle(invoice)}
              </h1>

              <p className="mt-3 max-w-5xl text-sm font-bold leading-6 text-slate-300">
                {clientName(invoice)} · {money(invoiceTotal(invoice))}. Review the invoice, payment status, amount due and notes without leaving the page.
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

        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="grid min-h-full w-full xl:grid-cols-[minmax(0,1fr)_390px]">
            <div className="space-y-5 p-4 md:p-6 xl:p-8">
              <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)]">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-600">
                  What needs attention
                </div>

                <h2 className="mt-3 text-3xl font-black tracking-[-0.06em] text-slate-950">
                  {paid ? "This invoice is paid." : status === "overdue" ? "This invoice needs follow-up." : status === "draft" ? "Review the draft before sending." : "Watch payment status and follow up if needed."}
                </h2>

                <p className="mt-4 max-w-4xl text-sm font-bold leading-6 text-slate-600">
                  Completed work should turn into paid money. Use this slip to check the invoice details before opening the record.
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
            </div>

            <aside className="border-t border-slate-800 bg-[#0f1722] p-4 text-white md:p-6 xl:border-l xl:border-t-0">
              <section className="xl:sticky xl:top-6">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-200">
                  Invoice actions
                </div>

                <h2 className="mt-2 text-3xl font-black tracking-[-0.05em]">
                  Review first.
                </h2>

                <div className="mt-5 rounded-2xl bg-white/10 p-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">Status</div>
                  <div className="mt-2 text-sm font-black">{paid ? "Paid" : prettyStatus(status)}</div>
                </div>

                <div className="mt-5 rounded-2xl bg-white/10 p-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">Amount due</div>
                  <div className="mt-2 text-sm font-black">{money(amountDue(invoice))}</div>
                </div>

                <div className="mt-5 grid gap-3">
                  {id && !id.startsWith("sample-") ? (
                    <Link to={`/invoices/${id}`} className="rounded-2xl bg-cyan-300 px-5 py-3 text-center text-sm font-black text-slate-950 shadow-lg shadow-cyan-300/20 hover:bg-cyan-200">
                      Open invoice record
                    </Link>
                  ) : (
                    <Link to="/invoices/new" className="rounded-2xl bg-cyan-300 px-5 py-3 text-center text-sm font-black text-slate-950 shadow-lg shadow-cyan-300/20 hover:bg-cyan-200">
                      Create real invoice
                    </Link>
                  )}

                  <Link to="/money-desk" className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-center text-sm font-black text-white hover:bg-white/15">
                    Open money desk
                  </Link>

                  <button type="button" onClick={onClose} className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white hover:bg-white/15">
                    Back to invoices
                  </button>
                </div>
              </section>
            </aside>
          </div>
        </main>
      </section>
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

  const list = invoices.length ? invoices : sampleInvoices;
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
    <main className="fixed inset-0 z-[2147483000] overflow-y-auto bg-[#eef1f4] text-slate-950">
      <div className="flex min-h-screen">
        <Sidebar />
        <section className="min-w-0 flex-1 p-4 pb-28 md:p-6 md:pb-28 xl:p-8 xl:pb-28">
          <header className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]">
            <div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Invoices Command</div><div className="text-sm font-bold text-slate-500">Review drafts, sent invoices, overdue money and paid records.</div></div>
            <div className="flex flex-wrap gap-3"><Link to="/money-desk" className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-800 hover:bg-slate-50">Money Desk</Link><Link to="/invoices/new" className="rounded-2xl bg-amber-500 px-4 py-2 text-sm font-black text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400">Create invoice</Link></div>
          </header>

          <section className="grid gap-5 xl:grid-cols-[1fr_430px]">
            <div className="overflow-hidden rounded-[30px] border border-slate-900 bg-slate-950 shadow-[0_26px_80px_rgba(15,23,42,0.20)]">
              <div className="relative p-6 md:p-8">
                <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />
                <div className="relative">
                  <span className="inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">Invoices Command</span>
                  <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[0.92] tracking-[-0.075em] text-white md:text-6xl">Completed work should turn into paid money.</h1>
                  <p className="mt-5 max-w-2xl text-sm font-semibold leading-6 text-slate-300 md:text-base">Churvox keeps drafts, sent invoices, overdue reminders and paid records visible so cash does not sit forgotten.</p>
                </div>
              </div>
            </div>
            <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)]">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Money health</div>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.055em] text-slate-950">What needs attention</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><div className="text-2xl font-black text-amber-800">{counts.draft}</div><div className="text-xs font-black uppercase tracking-[0.14em] text-amber-700">Drafts to review</div></div>
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4"><div className="text-2xl font-black text-red-800">{counts.overdue}</div><div className="text-xs font-black uppercase tracking-[0.14em] text-red-700">Overdue</div></div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><div className="text-2xl font-black text-emerald-800">{money(counts.due)}</div><div className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">Outstanding</div></div>
              </div>
            </div>
          </section>

          <section className="mt-5 grid gap-4 md:grid-cols-4">
            <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Total invoices</div><div className="mt-3 text-3xl font-black tracking-[-0.06em]">{counts.total}</div></div>
            <div className="rounded-[22px] border border-blue-200 bg-blue-50 p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-700">Sent</div><div className="mt-3 text-3xl font-black tracking-[-0.06em] text-blue-900">{counts.sent}</div></div>
            <div className="rounded-[22px] border border-red-200 bg-red-50 p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-red-700">Overdue</div><div className="mt-3 text-3xl font-black tracking-[-0.06em] text-red-900">{counts.overdue}</div></div>
            <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">Paid</div><div className="mt-3 text-3xl font-black tracking-[-0.06em] text-emerald-900">{counts.paid}</div></div>
          </section>

          <section className="mt-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)]">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600">Invoice list</div><h2 className="mt-2 text-3xl font-black tracking-[-0.06em] text-slate-950">Open invoices</h2></div>{loading && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">Loading…</span>}{error && <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">Showing sample layout</span>}</div>
            <div className="grid gap-4 xl:grid-cols-2">
              {list.map((invoice) => <InvoiceCard key={idOf(invoice) || invoiceTitle(invoice)} invoice={invoice} onOpen={setActiveInvoice} />)}
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
