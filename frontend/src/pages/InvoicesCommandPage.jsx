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
  for (const key of ["invoices", "items", "results", "data"]) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

function idOf(item) {
  const raw = item?.id || item?._id || item?.invoice_id || "";
  return typeof raw === "object" && raw?.$oid ? raw.$oid : String(raw || "");
}

function titleOf(item) {
  return first(item?.title, item?.invoice_title, item?.invoice_number, item?.number, item?.job_title, "Untitled invoice");
}

function clientOf(item) {
  return first(item?.client_name, item?.customer_name, item?.client?.name, item?.customer?.name, "No client saved");
}

function statusOf(item) {
  return String(first(item?.status, item?.invoice_status, "draft")).replaceAll("_", " ");
}

function rawStatus(item) {
  return String(first(item?.status, item?.invoice_status, "draft")).toLowerCase();
}

function amountOf(item) {
  return Number(first(item?.total, item?.amount_due, item?.balance_due, item?.amount, item?.subtotal, item?.invoice_total, 0)) || 0;
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

function isPaid(item) { return rawStatus(item).includes("paid"); }
function isDraft(item) { return rawStatus(item).includes("draft"); }
function isOverdue(item) { return rawStatus(item).includes("overdue") || Number(item?.days_overdue || 0) > 0; }
function isSent(item) { const s = rawStatus(item); return s.includes("sent") || s.includes("viewed") || s.includes("unpaid"); }

function statusClass(item) {
  if (isPaid(item)) return "bg-emerald-300 text-slate-950";
  if (isOverdue(item)) return "bg-red-300 text-slate-950";
  if (isSent(item)) return "bg-cyan-300 text-slate-950";
  if (isDraft(item)) return "bg-amber-300 text-slate-950";
  return "bg-white/10 text-white ring-1 ring-white/10";
}

function detailsFor(item) {
  return {
    Client: clientOf(item),
    Status: statusOf(item),
    Amount: money(amountOf(item)),
    Due: formatDate(first(item?.due_date, item?.date_due, item?.payment_due, item?.expiry_date)),
    Created: formatDate(first(item?.created_at, item?.date, item?.invoice_date)),
    Job: first(item?.job_title, item?.job_name, item?.job_id, "Not linked"),
    Notes: first(item?.notes, item?.description, item?.invoice_notes, "No notes saved"),
  };
}

function SecurityTape({ color = "#34d399" }) {
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

function InvoiceSlip({ invoice, mode, approved, onClose, onApprove, onMode }) {
  const [draft, setDraft] = React.useState("");
  const details = React.useMemo(() => detailsFor(invoice || {}), [invoice]);

  React.useEffect(() => {
    if (!invoice) return;
    const detailText = Object.entries(details).map(([key, value]) => `${key}: ${value}`).join("\n");
    setDraft(`${titleOf(invoice)}\n${detailText}`.trim());
  }, [invoice, details]);

  if (!invoice) return null;
  const invoiceId = idOf(invoice);
  const isEdit = mode === "edit";

  return (
    <div className="fixed inset-0 z-[2147483600] overflow-y-auto bg-slate-950/92 p-3 text-white backdrop-blur-xl md:p-6" role="dialog" aria-modal="true">
      <div className="mx-auto flex min-h-[calc(100vh-24px)] max-w-6xl flex-col overflow-hidden rounded-[34px] border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-2xl md:min-h-[calc(100vh-48px)]">
        <header className="flex items-start justify-between gap-4 border-b border-white/10 p-5 md:p-7">
          <div>
            <div className="inline-flex rounded-full bg-amber-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">Invoice slip</div>
            <h2 className="mt-3 text-4xl font-black leading-[0.95] tracking-[-0.07em] text-white md:text-6xl">{titleOf(invoice)}</h2>
            <p className="mt-4 max-w-3xl text-sm font-bold leading-6 text-slate-300 md:text-base">{clientOf(invoice)} · {money(amountOf(invoice))} · {statusOf(invoice)}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950">Close</button>
        </header>

        <div className="grid flex-1 gap-5 p-5 md:grid-cols-[1.15fr_.85fr] md:p-7">
          <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">Review this exact invoice</div>
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
            <p className="mt-3 text-sm font-bold leading-6 text-slate-300">Review the invoice here first. Approve or edit the slip, then open the full invoice page only when you need the full record.</p>
            {approved ? <div className="mt-4 rounded-3xl border border-emerald-300/25 bg-emerald-300/10 p-4 text-sm font-black text-emerald-100">Approved. This invoice slip decision is recorded in this view.</div> : null}
            <div className="mt-5 grid gap-3">
              <button type="button" onClick={onApprove} className="rounded-2xl bg-emerald-300 px-5 py-4 text-sm font-black text-slate-950">Approve slip</button>
              <button type="button" onClick={() => onMode("edit")} className="rounded-2xl bg-white/10 px-5 py-4 text-sm font-black text-white ring-1 ring-white/10">Edit in slip</button>
              {invoiceId ? <Link to={`/invoices/${invoiceId}`} onClick={onClose} className="rounded-2xl bg-white px-5 py-4 text-center text-sm font-black text-slate-950 no-underline">Open full invoice page</Link> : null}
              <button type="button" onClick={onClose} className="rounded-2xl bg-white/10 px-5 py-4 text-sm font-black text-white ring-1 ring-white/10">Back to invoices</button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function InvoiceRow({ invoice, onOpen }) {
  const tape = isPaid(invoice) ? "#34d399" : isOverdue(invoice) ? "#f43f5e" : isSent(invoice) ? "#22d3ee" : "#facc15";
  return (
    <button type="button" onClick={() => onOpen(invoice)} className="relative w-full overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.06] p-4 pl-7 text-left text-white transition hover:border-cyan-300/40 hover:bg-white/[0.09] active:scale-[0.99]">
      <SecurityTape color={tape} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-xl font-black tracking-[-0.05em] text-white">{titleOf(invoice)}</h3>
          <p className="mt-1 line-clamp-1 text-sm font-bold leading-6 text-slate-300">{clientOf(invoice)} · {money(amountOf(invoice))} · due {formatDate(first(invoice?.due_date, invoice?.date_due, invoice?.payment_due))}</p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${statusClass(invoice)}`}>{statusOf(invoice)}</span>
      </div>
    </button>
  );
}

export default function InvoicesCommandPage() {
  const { get } = useApi();
  const [invoices, setInvoices] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedInvoice, setSelectedInvoice] = React.useState(null);
  const [mode, setMode] = React.useState("details");
  const [approvedIds, setApprovedIds] = React.useState({});

  React.useEffect(() => {
    let alive = true;
    async function loadInvoices() {
      try {
        setLoading(true);
        const res = await get("/invoices");
        if (!alive) return;
        setInvoices(listFrom(res));
      } catch (error) {
        console.warn("Invoices page load failed", error);
        if (alive) setInvoices([]);
      } finally {
        if (alive) setLoading(false);
      }
    }
    loadInvoices();
    return () => { alive = false; };
  }, [get]);

  const draftInvoices = invoices.filter(isDraft);
  const overdueInvoices = invoices.filter(isOverdue);
  const paidInvoices = invoices.filter(isPaid);
  const unpaidInvoices = invoices.filter((invoice) => !isPaid(invoice));
  const unpaidTotal = unpaidInvoices.reduce((sum, invoice) => sum + amountOf(invoice), 0);
  const selectedId = selectedInvoice ? idOf(selectedInvoice) || titleOf(selectedInvoice) : "current";

  const openSlip = (invoice, nextMode = "details") => {
    setSelectedInvoice(invoice);
    setMode(nextMode);
  };

  return (
    <main className={industrialPageShell} data-industrial-simple-page="invoices" data-command-canvas>
      <section className={`${industrialContentLane} space-y-5`}>
        <section className="relative overflow-hidden rounded-[30px] border border-white/10 p-5 pl-8 text-white md:p-7 md:pl-9" style={tileStyle}>
          <SecurityTape color="#34d399" />
          <span className={industrialChip}>Invoices</span>
          <h1 className="mt-4 max-w-4xl text-4xl font-black leading-[0.92] tracking-[-0.075em] text-white md:text-6xl">Invoices ready to review, send, or follow up.</h1>
          <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-slate-300 md:text-base">Tap an invoice to open its full-screen slip. Review and approve first, then open the full invoice page only when you need the full record.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/invoices/new" className={`rounded-2xl px-5 py-3 text-sm font-black ${industrialAction}`}>Create invoice</Link>
            <Link to="/dashboard" className={`rounded-2xl px-5 py-3 text-sm font-black ${industrialGhost}`}>Command Board</Link>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Drafts" value={draftInvoices.length} text="Invoices waiting for owner review." color="#facc15" />
          <MetricCard label="Unpaid" value={money(unpaidTotal)} text="Total invoice value not marked paid." color="#22d3ee" />
          <MetricCard label="Overdue" value={overdueInvoices.length} text="Invoices that may need follow-up." color="#f43f5e" />
          <MetricCard label="Paid" value={paidInvoices.length} text="Invoices marked paid." color="#34d399" />
        </section>

        <section className="rounded-[30px] border border-white/10 p-5 text-white md:p-6" style={tileStyle}>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">Invoice list</div>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.06em] text-white">Tap an invoice to review it</h2>
            </div>
            {loading ? <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-slate-300">Loading…</span> : <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-slate-300">{invoices.length} invoices</span>}
          </div>

          {invoices.length ? (
            <div className="grid gap-3">
              {invoices.map((invoice, index) => <InvoiceRow key={idOf(invoice) || `${titleOf(invoice)}-${index}`} invoice={invoice} onOpen={openSlip} />)}
            </div>
          ) : (
            <div className="rounded-[26px] border border-white/10 bg-white/[0.06] p-5">
              <h3 className="text-2xl font-black tracking-[-0.05em] text-white">No invoices showing yet.</h3>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-300">Create the first invoice and Churvox will keep invoice review and payment follow-up work here.</p>
              <Link to="/invoices/new" className={`mt-4 inline-flex rounded-2xl px-5 py-3 text-sm font-black no-underline ${industrialAction}`}>Create invoice</Link>
            </div>
          )}
        </section>
      </section>

      <InvoiceSlip
        invoice={selectedInvoice}
        mode={mode}
        approved={Boolean(approvedIds[selectedId])}
        onMode={setMode}
        onClose={() => setSelectedInvoice(null)}
        onApprove={() => setApprovedIds((prev) => ({ ...prev, [selectedId]: true }))}
      />
    </main>
  );
}
