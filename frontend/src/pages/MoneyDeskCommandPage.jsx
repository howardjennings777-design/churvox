import React from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import CommandSlipEverything from "../components/CommandSlipEverything";

function arr(value) {
  const data = value?.data ?? value;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.invoices)) return data.invoices;
  if (Array.isArray(data?.quotes)) return data.quotes;
  if (Array.isArray(data?.jobs)) return data.jobs;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function idOf(record) {
  const raw = record?.id || record?._id || record?.invoice_id || record?.quote_id || record?.job_id || "";
  if (typeof raw === "object" && raw?.$oid) return raw.$oid;
  return String(raw || "");
}

function money(value) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount.toLocaleString("en-NZ", { style: "currency", currency: "NZD" }) : "$0.00";
}

function titleOf(record) {
  return record?.invoice_number || record?.quote_number || record?.title || record?.job_title || record?.description || "Money record";
}

function clientName(record) {
  return record?.client_name || record?.customer_name || record?.client?.name || "No client saved";
}

function valueOf(record) {
  return Number(record?.amount_due ?? record?.balance_due ?? record?.balance ?? record?.total ?? record?.amount ?? record?.price ?? record?.job_price ?? 0);
}

function statusOf(record) {
  return String(record?.status || record?.payment_status || record?.type || "open").toLowerCase().replaceAll(" ", "_");
}

function isPaid(record) {
  const status = statusOf(record);
  return ["paid", "complete", "completed"].includes(status) || (valueOf(record) <= 0 && Number(record?.amount_paid || record?.paid || 0) > 0);
}

function isOverdue(record) {
  return ["overdue", "late", "unpaid"].includes(statusOf(record));
}

function isDraft(record) {
  return ["draft", "ready", "ready_invoice", "completed"].includes(statusOf(record)) || record?.type === "ready_invoice";
}

function pretty(value) {
  return String(value || "").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusStyle(record) {
  const status = statusOf(record);
  if (isPaid(record)) return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (isOverdue(record)) return "border-red-200 bg-red-50 text-red-800";
  if (["sent", "issued"].includes(status)) return "border-blue-200 bg-blue-50 text-blue-800";
  if (isDraft(record) || ["accepted", "ready"].includes(status)) return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function linkFor(record) {
  const id = idOf(record);
  if (!id) return "/invoices";
  const type = String(record?.type || "").toLowerCase();
  if (record?.quote_number || type.includes("quote")) return `/quotes/${id}`;
  if (record?.job_title || record?.job_name || type.includes("job")) return `/jobs/${id}`;
  return `/invoices/${id}`;
}

function MoneyCard({ record, onOpen }) {
  return (
    <article className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{pretty(record?.type || "money item")}</span>
          <h3 className="mt-1 text-lg font-black tracking-[-0.04em] text-slate-950">{titleOf(record)}</h3>
        </div>
        <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${statusStyle(record)}`}>{isPaid(record) ? "Paid" : pretty(statusOf(record))}</span>
      </div>
      <div className="mt-3 space-y-1 text-sm font-bold text-slate-600">
        <div>{clientName(record)}</div>
        <div className="text-slate-400">{record?.description || record?.notes || "No description saved"}</div>
        <div className="text-slate-500">Amount: {money(valueOf(record))}</div>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={() => onOpen(record)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-black text-slate-800 hover:bg-slate-50">Review decision</button>
        <Link to={linkFor(record)} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">Open record</Link>
      </div>
    </article>
  );
}

function MoneySlip({ record, onClose }) {
  if (!record) return null;
  return (
    <div className="fixed inset-0 z-[2147483647] h-[100dvh] w-screen overflow-hidden bg-[#f5f7f1] text-slate-950" role="dialog" aria-modal="true">
      <div className="flex h-[100dvh] w-screen flex-col overflow-hidden bg-[#f5f7f1]">
        <header className="relative overflow-hidden border-b border-slate-800 bg-slate-950 p-6 text-white md:p-7">
          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">Money decision</div>
              <h2 className="mt-4 text-3xl font-black leading-[0.95] tracking-[-0.07em] md:text-5xl">{titleOf(record)}</h2>
            </div>
            <button type="button" onClick={onClose} className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-black text-white hover:bg-white/15">Close</button>
          </div>
          <p className="relative mt-5 max-w-xl text-sm font-semibold leading-6 text-slate-300">{clientName(record)} · {money(valueOf(record))}</p>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto bg-[#f4f6f8] p-5 md:p-6">
          <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">What needs attention</div>
            <p className="mt-3 text-lg font-black tracking-[-0.035em] text-slate-950">Status: {isPaid(record) ? "Paid" : pretty(statusOf(record))}</p>
            <div className={`mt-4 rounded-2xl border p-4 text-sm font-bold leading-6 ${isOverdue(record) ? "border-red-100 bg-red-50 text-red-950" : isPaid(record) ? "border-emerald-100 bg-emerald-50 text-emerald-950" : "border-blue-100 bg-blue-50 text-blue-950"}`}>{isOverdue(record) ? "This may need an owner-approved payment follow-up." : isPaid(record) ? "This payment is already recorded." : "Review the record and approve the next step when it is correct."}</div>
          </section>
          <section className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Client</div><div className="mt-1 text-sm font-black text-slate-950">{clientName(record)}</div></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Amount</div><div className="mt-1 text-sm font-black text-slate-950">{money(valueOf(record))}</div></div>
          </section>
          <CommandSlipEverything record={record} context="MoneySlip" />
        </main>

        <footer className="flex flex-wrap gap-3 border-t border-slate-200 bg-white p-5">
          <Link to={linkFor(record)} className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">Open record</Link>
          <Link to="/invoices" className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800 hover:bg-slate-50">Invoices</Link>
        </footer>
      </div>
    </div>
  );
}

function EmptyMoneyQueue({ error }) {
  return (
    <article className="rounded-[22px] border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
      <h3 className="text-xl font-black tracking-[-0.04em] text-slate-950">{error ? "Money records are unavailable" : "Nothing needs attention"}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 text-slate-600">{error ? "Churvox could not confirm the current records. Nothing was changed. Try again shortly." : "Ready invoices, accepted quotes and payment follow-ups will appear here when they need an owner decision."}</p>
      <div className="mt-5 flex justify-center gap-3"><Link to="/invoices" className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-800">Open invoices</Link><Link to="/invoices/new" className="rounded-2xl bg-amber-500 px-4 py-2 text-sm font-black text-slate-950">Create invoice</Link></div>
    </article>
  );
}

function MoneyDeskCommandContent() {
  const { get } = useApi();
  const [records, setRecords] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [activeRecord, setActiveRecord] = React.useState(null);

  React.useEffect(() => {
    let alive = true;
    async function loadMoney() {
      setLoading(true);
      setError("");
      const [invoicesRes, quotesRes, jobsRes] = await Promise.all([get("/invoices"), get("/quotes"), get("/jobs")]);
      if (!alive) return;
      const next = [];
      if (invoicesRes?.success) next.push(...arr(invoicesRes).map((item) => ({ ...item, type: item.type || "invoice" })));
      else setError(invoicesRes?.error || "Could not confirm the current money records");
      if (quotesRes?.success) next.push(...arr(quotesRes).filter((quote) => ["accepted", "approved", "won"].includes(statusOf(quote))).map((item) => ({ ...item, type: "accepted_quote" })));
      if (jobsRes?.success) next.push(...arr(jobsRes).filter((job) => ["completed", "done", "ready_to_invoice"].includes(statusOf(job))).map((item) => ({ ...item, type: "ready_invoice", amount_due: valueOf(item) })));
      setRecords(next);
      setLoading(false);
    }
    loadMoney();
    return () => { alive = false; };
  }, [get]);

  const counts = React.useMemo(() => {
    const total = records.length;
    const overdue = records.filter(isOverdue).length;
    const ready = records.filter((record) => !isPaid(record) && (isDraft(record) || statusOf(record) === "accepted")).length;
    const paid = records.filter(isPaid).length;
    const due = records.reduce((sum, record) => sum + (isPaid(record) ? 0 : Math.max(valueOf(record), 0)), 0);
    return { total, overdue, ready, paid, due };
  }, [records]);

  return (
    <main className="fixed inset-0 z-[2147483000] overflow-y-auto bg-[#eef1f4] text-slate-950">
      <section className="min-h-screen p-4 pb-28 md:p-6 md:pb-28 xl:p-8 xl:pb-28">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]">
          <div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Money Desk</div><div className="text-sm font-bold text-slate-500">Ready invoices, overdue money, accepted quotes and paid records.</div></div>
          <div className="flex flex-wrap gap-3"><Link to="/invoices" className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-800 hover:bg-slate-50">Invoices</Link><Link to="/invoices/new" className="rounded-2xl bg-amber-500 px-4 py-2 text-sm font-black text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400">Create invoice</Link></div>
        </header>

        <section className="grid gap-5 xl:grid-cols-[1fr_430px]">
          <div className="overflow-hidden rounded-[30px] border border-slate-900 bg-slate-950 shadow-[0_26px_80px_rgba(15,23,42,0.20)]">
            <div className="relative p-6 md:p-8"><div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" /><div className="relative"><span className="inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">Money Desk</span><h1 className="mt-5 max-w-3xl text-4xl font-black leading-[0.92] tracking-[-0.075em] text-white md:text-6xl">Keep cash moving after the job is done.</h1><p className="mt-5 max-w-2xl text-sm font-semibold leading-6 text-slate-300 md:text-base">Churvox puts ready-to-invoice work, overdue payments and accepted quotes in one owner approval workspace.</p></div></div>
          </div>
          <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)]">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Cash health</div><h2 className="mt-2 text-2xl font-black tracking-[-0.055em] text-slate-950">What needs attention</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1"><div className="rounded-2xl border border-red-200 bg-red-50 p-4"><div className="text-2xl font-black text-red-800">{counts.overdue}</div><div className="text-xs font-black uppercase tracking-[0.14em] text-red-700">Overdue</div></div><div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><div className="text-2xl font-black text-amber-800">{counts.ready}</div><div className="text-xs font-black uppercase tracking-[0.14em] text-amber-700">Ready actions</div></div><div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><div className="text-2xl font-black text-emerald-800">{money(counts.due)}</div><div className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">Outstanding</div></div></div>
          </div>
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-4">
          <div className="rounded-[22px] border border-slate-200 bg-white p-4"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Money items</div><div className="mt-3 text-3xl font-black">{counts.total}</div></div>
          <div className="rounded-[22px] border border-red-200 bg-red-50 p-4"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-red-700">Overdue</div><div className="mt-3 text-3xl font-black text-red-900">{counts.overdue}</div></div>
          <div className="rounded-[22px] border border-amber-200 bg-amber-50 p-4"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">Ready</div><div className="mt-3 text-3xl font-black text-amber-900">{counts.ready}</div></div>
          <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 p-4"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">Paid</div><div className="mt-3 text-3xl font-black text-emerald-900">{counts.paid}</div></div>
        </section>

        <section className="mt-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)]">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600">Money queue</div><h2 className="mt-2 text-3xl font-black tracking-[-0.06em] text-slate-950">Open money actions</h2></div>{loading && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">Loading…</span>}</div>
          {records.length ? <div className="grid gap-4 xl:grid-cols-2">{records.map((record) => <MoneyCard key={idOf(record) || titleOf(record)} record={record} onOpen={setActiveRecord} />)}</div> : !loading ? <EmptyMoneyQueue error={error} /> : null}
        </section>
      </section>
      <MoneySlip record={activeRecord} onClose={() => setActiveRecord(null)} />
    </main>
  );
}

export default function MoneyDeskCommandPage() {
  if (typeof document === "undefined") return <MoneyDeskCommandContent />;
  return createPortal(<MoneyDeskCommandContent />, document.body);
}
