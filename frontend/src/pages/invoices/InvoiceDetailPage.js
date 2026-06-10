// CHURVOX_INVOICE_DETAIL_REAL_ACTIONS_20260607
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Layout from "../../components/Layout";
import { useApi } from "../../hooks/useApi";
import { PremiumPage, PremiumHero, PremiumCard, PremiumButton } from "../../components/premium";
import { ArrowLeft, Copy, CreditCard, Eye, Receipt, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { loadBusinessSettings } from "../../lib/businessSettings";

function n(value) {
  const num = Number(String(value || 0).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(num) ? num : 0;
}
function money(value) { return n(value).toLocaleString("en-NZ", { style: "currency", currency: "NZD" }); }
function date(value) { if (!value) return "Not set"; try { return new Date(value).toLocaleDateString("en-NZ"); } catch { return String(value); } }
function invoiceRecord(payload) { const data = payload?.data ?? payload; return data?.invoice || data?.item || data?.record || data || {}; }
function arr(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.invoices)) return value.invoices;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.results)) return value.results;
  return [];
}
function normalizeId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "object") return normalizeId(value.$oid || value.oid || value.id || value._id || "");
  const text = String(value || "");
  return text === "[object Object]" ? "" : text;
}
function invoiceId(invoice) { return normalizeId(invoice?.id || invoice?._id || invoice?.invoice_id || ""); }
function statusClass(status) {
  const s = String(status || "draft").toLowerCase();
  if (s === "paid") return "bg-green-100 text-green-800 border-green-200";
  if (["overdue", "cancelled"].includes(s)) return "bg-red-100 text-red-800 border-red-200";
  if (s === "sent") return "bg-blue-100 text-blue-800 border-blue-200";
  return "bg-amber-100 text-amber-800 border-amber-200";
}
function safeRows(invoice) {
  const raw = invoice?.line_items || invoice?.items || [];
  if (Array.isArray(raw) && raw.length) return raw;
  return [{ description: invoice?.description || "Service work completed", quantity: 1, unit_price: invoice?.subtotal || invoice?.total || 0, amount: invoice?.subtotal || invoice?.total || 0 }];
}
function sourceJobId(invoice) { return normalizeId(invoice?.job_id || invoice?.linked_job_id || ""); }
function sourceQuoteId(invoice) { return normalizeId(invoice?.quote_id || invoice?.linked_quote_id || ""); }
function amountDue(invoice) { return n(invoice?.amount_due || invoice?.balance_due || invoice?.total || invoice?.amount || invoice?.subtotal); }
function mailtoUrl(invoice, biz) {
  const to = invoice.customer_email || invoice.client_email || "";
  const subject = `Invoice ${invoice.invoice_number || "from Churvox"}`;
  const body = `Hi ${invoice.customer_name || "there"},\n\nYour invoice ${invoice.invoice_number || ""} is ready.\n\nTotal: ${money(invoice.total || invoice.amount || invoice.subtotal)}\nAmount due: ${money(amountDue(invoice))}\nDue: ${date(invoice.due_date)}\n\n${invoice.payment_link ? `Pay here: ${invoice.payment_link}\n\n` : ""}${biz.bank_account_name || biz.bank_account_number ? `Payment details:\n${biz.bank_account_name || ""}\n${biz.bank_account_number || ""}\n\n` : ""}Thanks,\n${biz.business_name || "Churvox"}`;
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const api = useApi();
  const [invoice, setInvoice] = useState(null);
  const [busy, setBusy] = useState("");

  const loadInvoice = useCallback(async () => {
    const direct = await api.get(`/invoices/${encodeURIComponent(id)}`);
    if (direct.success) {
      setInvoice(invoiceRecord(direct));
      return;
    }

    const list = await api.get("/invoices");
    const found = list?.success ? arr(list.data).find((item) => invoiceId(item) === String(id)) : null;
    if (found) {
      setInvoice(found);
      return;
    }

    toast.error(direct.error || "Invoice not found");
    navigate("/invoices-board");
  }, [api, id, navigate]);

  useEffect(() => { loadInvoice(); }, [loadInvoice]);

  const rows = useMemo(() => safeRows(invoice), [invoice]);

  async function syncSourceRecords(nextInvoice) {
    const linkedAt = new Date().toISOString();
    const jobId = sourceJobId(nextInvoice);
    const quoteId = sourceQuoteId(nextInvoice);
    const status = nextInvoice.status || "draft";
    const common = {
      invoice_id: id,
      linked_invoice_id: id,
      invoice_status: status,
      invoice_total: n(nextInvoice.total || nextInvoice.amount),
      invoice_amount_due: amountDue(nextInvoice),
      invoice_synced_at: linkedAt,
    };
    const calls = [];
    if (jobId) calls.push(api.patch(`/jobs/${encodeURIComponent(jobId)}`, common));
    if (quoteId) calls.push(api.patch(`/quotes/${encodeURIComponent(quoteId)}`, common));
    if (calls.length) await Promise.allSettled(calls);
  }

  async function patchInvoice(label, payload, message = "Invoice updated") {
    setBusy(label);
    const res = await api.patch(`/invoices/${encodeURIComponent(id)}`, payload);
    if (res.success) {
      const nextInvoice = { ...(invoice || {}), ...payload };
      await syncSourceRecords(nextInvoice);
      setInvoice(nextInvoice);
      setBusy("");
      toast.success(message);
      await loadInvoice();
      return true;
    }
    setBusy("");
    toast.error(res.error || "Action failed");
    return false;
  }

  async function sendInvoice() {
    const biz = invoice?.business_snapshot || loadBusinessSettings();
    if (!invoice?.customer_email && !invoice?.client_email) return toast.error("Add a customer email before sending");
    window.location.href = mailtoUrl(invoice, biz);
    const note = `Email opened from Churvox on ${new Date().toLocaleDateString("en-NZ")}.`;
    await patchInvoice("send", { status: "sent", notes: invoice?.notes ? `${invoice.notes}\n${note}` : note }, "Email opened and invoice marked sent");
  }

  async function markPaid() {
    const note = `Marked paid by owner on ${new Date().toLocaleDateString("en-NZ")}.`;
    await patchInvoice("paid", { status: "paid", notes: invoice?.notes ? `${invoice.notes}\n${note}` : note }, "Invoice marked paid");
  }

  async function cancelInvoice() {
    const reason = window.prompt("Reason for cancelling this invoice?", "Cancelled by owner");
    if (reason === null) return;
    await patchInvoice("cancelled", { status: "cancelled", notes: invoice?.notes ? `${invoice.notes}\nCancelled: ${reason}` : `Cancelled: ${reason}` }, "Invoice cancelled");
  }

  async function copyPublicLink() {
    const link = invoice?.public_invoice_url || (invoice?.public_token ? `${window.location.origin}/public/invoice/${invoice.public_token}` : "");
    if (!link) return toast.error("No public link yet");
    await navigator.clipboard.writeText(link);
    toast.success("Public invoice link copied");
  }

  if (!invoice) return <Layout><PremiumPage><PremiumCard><div className="p-10 text-center font-bold text-slate-300">Loading invoice…</div></PremiumCard></PremiumPage></Layout>;

  const biz = invoice.business_snapshot || loadBusinessSettings();
  const publicLink = invoice.public_invoice_url || (invoice.public_token ? `/public/invoice/${invoice.public_token}` : "");
  const status = String(invoice.status || "draft").toLowerCase();
  const jobId = sourceJobId(invoice);
  const quoteId = sourceQuoteId(invoice);
  const total = n(invoice.total || invoice.amount || invoice.subtotal);

  return <Layout><PremiumPage maxWidth={1080}>
    <button onClick={() => navigate("/invoices-board")} className="mb-3 flex items-center gap-2 text-sm font-black text-slate-300 hover:text-white"><ArrowLeft size={16} /> Back to Invoices board</button>
    <PremiumHero eyebrow="Invoice review" title={invoice.invoice_number || "Invoice"} subtitle={`${invoice.customer_name || "Customer"} • ${money(total)} • due ${date(invoice.due_date)}`} icon={<Receipt className="h-6 w-6" />} actions={<span className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${statusClass(status)}`}>{status.replace("_", " ")}</span>} />

    <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <PremiumCard>
        <article className="rounded-3xl bg-white p-6 text-[#0d1b34] shadow-sm" data-testid="business-grade-invoice-preview">
          <header className="flex justify-between gap-5 border-b border-[#e6eef9] pb-5">
            <div>{biz.logo_base64 ? <img src={biz.logo_base64} alt="Business logo" className="mb-3 max-h-16 max-w-40 object-contain" /> : <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-[#0d1b34] text-white font-black">CV</div>}<h2 className="text-2xl font-black">{biz.business_name || invoice.business_name || "Business"}</h2><p className="text-sm text-[#5b6c87]">{biz.business_address || invoice.business_address || ""}</p><p className="text-sm text-[#5b6c87]">{biz.email || invoice.business_email || ""} {biz.phone || invoice.business_phone ? `• ${biz.phone || invoice.business_phone}` : ""}</p>{biz.gst_number || invoice.gst_number ? <p className="text-xs font-bold text-[#5b6c87]">GST: {biz.gst_number || invoice.gst_number}</p> : null}</div>
            <div className="text-right"><p className="text-xs font-black uppercase text-[#5b6c87]">Invoice</p><h1 className="text-3xl font-black">{invoice.invoice_number}</h1><p className="mt-2 text-sm text-[#5b6c87]">Issued {date(invoice.created_at)}</p><p className="text-sm text-[#5b6c87]">Due {date(invoice.due_date)}</p></div>
          </header>
          <section className="grid grid-cols-1 gap-4 py-5 md:grid-cols-2"><div className="rounded-2xl bg-[#f6faff] p-4"><p className="text-xs font-black uppercase text-[#5b6c87]">Bill to</p><h3 className="mt-1 font-black">{invoice.customer_name}</h3><p className="text-sm text-[#5b6c87]">{invoice.customer_email}</p><p className="text-sm text-[#5b6c87]">{invoice.customer_phone}</p><p className="text-sm text-[#5b6c87]">{invoice.billing_address || invoice.address}</p></div><div className="rounded-2xl bg-[#f6faff] p-4"><p className="text-xs font-black uppercase text-[#5b6c87]">Linked work</p><p className="text-sm text-[#0d1b34]">{invoice.site_address || invoice.address || "No site address saved"}</p><p className="mt-2 text-sm text-[#5b6c87]">{invoice.payment_terms || "Payment terms not set"}</p>{jobId ? <Link className="mt-2 block text-sm font-black text-[#2563eb]" to={`/jobs/${jobId}`}>Open linked job</Link> : null}{quoteId ? <Link className="mt-1 block text-sm font-black text-[#2563eb]" to={`/quotes/${quoteId}`}>Open linked quote</Link> : null}</div></section>
          {invoice.description ? <p className="mb-4 rounded-2xl bg-[#fff7ed] p-4 text-sm font-semibold text-[#7c2d12]">{invoice.description}</p> : null}
          <table className="w-full text-sm"><thead><tr className="border-b border-[#e6eef9] text-left text-xs uppercase text-[#5b6c87]"><th className="py-2">Item</th><th className="py-2 text-right">Qty</th><th className="py-2 text-right">Rate</th><th className="py-2 text-right">Total</th></tr></thead><tbody>{rows.map((row, index) => <tr key={index} className="border-b border-[#edf3fb]"><td className="py-3 font-bold">{row.description}</td><td className="py-3 text-right">{row.quantity || row.qty || 1}</td><td className="py-3 text-right">{money(row.unit_price || row.rate)}</td><td className="py-3 text-right font-black">{money(row.amount)}</td></tr>)}</tbody></table>
          <section className="ml-auto mt-5 max-w-sm space-y-2 text-sm"><div className="flex justify-between"><span>Subtotal</span><b>{money(invoice.subtotal)}</b></div><div className="flex justify-between"><span>Discount</span><b>{money(invoice.discount_amount)}</b></div><div className="flex justify-between"><span>GST ({invoice.gst_rate || 15}%)</span><b>{money(invoice.gst_amount || invoice.tax_amount)}</b></div><div className="flex justify-between border-t border-[#e6eef9] pt-2 text-lg"><span>Total</span><b>{money(total)}</b></div><div className="flex justify-between rounded-2xl bg-[#ecfdf5] p-3 text-lg text-[#166534]"><span>Amount due</span><b>{money(amountDue(invoice))}</b></div></section>
          {(biz.bank_account_name || biz.bank_account_number || invoice.payment_link) ? <footer className="mt-6 rounded-2xl bg-[#0d1b34] p-4 text-white"><p className="text-xs font-black uppercase opacity-70">Payment details</p>{biz.bank_account_name ? <p className="font-bold">{biz.bank_account_name}</p> : null}{biz.bank_account_number ? <p className="font-mono">{biz.bank_account_number}</p> : null}{invoice.payment_link ? <a className="mt-2 inline-block rounded-full bg-white px-4 py-2 text-sm font-black text-[#0d1b34]" href={invoice.payment_link} target="_blank" rel="noreferrer">Open payment link</a> : null}</footer> : null}
        </article>
      </PremiumCard>
      
    </section>
  </PremiumPage></Layout>;
}
