// CHURVOX_INVOICE_STATUS_BACKLINKS_STABLE_20260601
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Layout from "../../components/Layout";
import { useApi } from "../../hooks/useApi";
import { PremiumPage, PremiumHero, PremiumCard, PremiumButton } from "../../components/premium";
import { ArrowLeft, CheckCircle, Copy, CreditCard, Eye, Receipt, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { loadBusinessSettings } from "../../lib/businessSettings";

function n(value) { const num = Number(value || 0); return Number.isFinite(num) ? num : 0; }
function money(value) { return n(value).toLocaleString("en-NZ", { style: "currency", currency: "NZD" }); }
function date(value) { if (!value) return "Not set"; try { return new Date(value).toLocaleDateString("en-NZ"); } catch { return String(value); } }
function invoiceRecord(payload) { const data = payload?.data ?? payload; return data?.invoice || data?.item || data?.record || data || {}; }
function statusClass(status) {
  const s = String(status || "draft").toLowerCase();
  if (s === "paid") return "bg-green-100 text-green-800 border-green-200";
  if (s === "partially_paid") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (["overdue", "void", "cancelled"].includes(s)) return "bg-red-100 text-red-800 border-red-200";
  if (["sent", "approved"].includes(s)) return "bg-blue-100 text-blue-800 border-blue-200";
  return "bg-amber-100 text-amber-800 border-amber-200";
}
function safeRows(invoice) {
  const raw = invoice?.line_items || invoice?.items || [];
  if (Array.isArray(raw) && raw.length) return raw;
  return [{ description: invoice?.description || "Service work completed", quantity: 1, unit_price: invoice?.subtotal || invoice?.total || 0, amount: invoice?.subtotal || invoice?.total || 0 }];
}
function sourceJobId(invoice) { return String(invoice?.job_id || invoice?.linked_job_id || ""); }
function sourceQuoteId(invoice) { return String(invoice?.quote_id || invoice?.linked_quote_id || ""); }
function mailtoUrl(invoice, biz) {
  const to = invoice.customer_email || invoice.client_email || "";
  const subject = `Invoice ${invoice.invoice_number || "from Churvox"}`;
  const body = `Hi ${invoice.customer_name || "there"},\n\nYour invoice ${invoice.invoice_number || ""} is ready.\n\nTotal: ${money(invoice.total)}\nAmount due: ${money(invoice.amount_due || invoice.balance_due || invoice.total)}\nDue: ${date(invoice.due_date)}\n\n${invoice.payment_link ? `Pay here: ${invoice.payment_link}\n\n` : ""}${biz.bank_account_name || biz.bank_account_number ? `Payment details:\n${biz.bank_account_name || ""}\n${biz.bank_account_number || ""}\n\n` : ""}Thanks,\n${biz.business_name || "Churvox"}`;
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const api = useApi();
  const [invoice, setInvoice] = useState(null);
  const [busy, setBusy] = useState("");

  const loadInvoice = useCallback(async () => {
    const res = await api.get(`/invoices/${encodeURIComponent(id)}`);
    if (res.success) setInvoice(invoiceRecord(res));
    else {
      toast.error(res.error || "Invoice not found");
      navigate("/invoices");
    }
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
      invoice_amount_due: n(nextInvoice.amount_due || nextInvoice.balance_due),
      invoice_amount_paid: n(nextInvoice.amount_paid),
      invoice_synced_at: linkedAt,
    };
    const calls = [];
    if (jobId) calls.push(api.patch(`/jobs/${encodeURIComponent(jobId)}`, common));
    if (quoteId) calls.push(api.patch(`/quotes/${encodeURIComponent(quoteId)}`, common));
    if (calls.length) await Promise.allSettled(calls);
  }

  async function patchInvoice(label, payload, message = "Invoice updated") {
    setBusy(label);
    const nextPayload = { ...payload, updated_at: new Date().toISOString() };
    const res = await api.patch(`/invoices/${encodeURIComponent(id)}`, nextPayload);
    if (res.success) {
      const nextInvoice = { ...(invoice || {}), ...nextPayload };
      await syncSourceRecords(nextInvoice);
      setBusy("");
      toast.success(message);
      await loadInvoice();
      return true;
    }
    setBusy("");
    toast.error(res.error || "Action failed");
    return false;
  }

  async function approveInvoice() {
    await patchInvoice("approve", { status: "approved", approved_at: new Date().toISOString() }, "Invoice approved");
  }

  async function sendInvoice() {
    const biz = invoice?.business_snapshot || loadBusinessSettings();
    if (!invoice?.customer_email && !invoice?.client_email) return toast.error("Add a customer email before sending");
    window.location.href = mailtoUrl(invoice, biz);
    await patchInvoice("send", { status: "sent", sent_at: new Date().toISOString(), sent_via: "external_email_client" }, "Email opened and invoice marked sent");
  }

  async function markPaid() {
    const total = n(invoice?.total || invoice?.amount);
    const amount = invoice?.amount_due || invoice?.balance_due || Math.max(0, total - n(invoice?.amount_paid));
    const payment = { amount, note: "Marked paid by owner", recorded_at: new Date().toISOString() };
    await patchInvoice("paid", { status: "paid", amount_paid: total, amount_due: 0, balance_due: 0, paid_at: new Date().toISOString(), payment_history: [...(invoice?.payment_history || []), payment] }, "Invoice marked paid");
  }

  async function markPartial() {
    const raw = window.prompt("Payment amount received?");
    if (!raw) return;
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount <= 0) return toast.error("Enter a valid payment amount");
    const paid = n(invoice?.amount_paid) + amount;
    const total = n(invoice?.total || invoice?.amount);
    const due = Math.max(0, total - paid);
    const payment = { amount, note: "Partial payment recorded", recorded_at: new Date().toISOString() };
    await patchInvoice("partial", { status: due <= 0 ? "paid" : "partially_paid", amount_paid: paid, amount_due: due, balance_due: due, payment_history: [...(invoice?.payment_history || []), payment] }, "Payment recorded");
  }

  async function voidInvoice() {
    const reason = window.prompt("Reason for voiding this invoice?", "Voided by owner");
    if (reason === null) return;
    await patchInvoice("void", { status: "void", void_reason: reason, voided_at: new Date().toISOString() }, "Invoice voided");
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

  return <Layout><PremiumPage maxWidth={1080}>
    <button onClick={() => navigate("/invoices")} className="mb-3 flex items-center gap-2 text-sm font-black text-slate-300 hover:text-white"><ArrowLeft size={16} /> Back to invoices</button>
    <PremiumHero eyebrow="FULL SCREEN INVOICE SLIP" title={invoice.invoice_number || "Invoice"} subtitle={`${invoice.customer_name || "Customer"} • ${money(invoice.total)} • due ${date(invoice.due_date)}`} icon={<Receipt className="h-6 w-6" />} actions={<span className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${statusClass(status)}`}>{status.replace("_", " ")}</span>} />

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
          <section className="ml-auto mt-5 max-w-sm space-y-2 text-sm"><div className="flex justify-between"><span>Subtotal</span><b>{money(invoice.subtotal)}</b></div><div className="flex justify-between"><span>Discount</span><b>{money(invoice.discount_amount)}</b></div><div className="flex justify-between"><span>GST ({invoice.gst_rate || 15}%)</span><b>{money(invoice.gst_amount || invoice.tax_amount)}</b></div><div className="flex justify-between border-t border-[#e6eef9] pt-2 text-lg"><span>Total</span><b>{money(invoice.total)}</b></div><div className="flex justify-between"><span>Paid</span><b>{money(invoice.amount_paid)}</b></div><div className="flex justify-between rounded-2xl bg-[#ecfdf5] p-3 text-lg text-[#166534]"><span>Amount due</span><b>{money(invoice.amount_due || invoice.balance_due)}</b></div></section>
          {(biz.bank_account_name || biz.bank_account_number || invoice.payment_link) ? <footer className="mt-6 rounded-2xl bg-[#0d1b34] p-4 text-white"><p className="text-xs font-black uppercase opacity-70">Payment details</p>{biz.bank_account_name ? <p className="font-bold">{biz.bank_account_name}</p> : null}{biz.bank_account_number ? <p className="font-mono">{biz.bank_account_number}</p> : null}{invoice.payment_link ? <a className="mt-2 inline-block rounded-full bg-white px-4 py-2 text-sm font-black text-[#0d1b34]" href={invoice.payment_link} target="_blank" rel="noreferrer">Open payment link</a> : null}</footer> : null}
        </article>
      </PremiumCard>
      <aside className="space-y-4"><PremiumCard title="Owner actions"><div className="grid gap-3">{status === "draft" ? <PremiumButton onClick={approveInvoice} disabled={busy === "approve"}><CheckCircle size={16} className="mr-2" /> Approve invoice</PremiumButton> : null}{["draft", "approved"].includes(status) ? <PremiumButton onClick={sendInvoice} disabled={busy === "send"}><Send size={16} className="mr-2" /> Open email + mark sent</PremiumButton> : null}{!["paid", "void", "cancelled"].includes(status) ? <PremiumButton variant="success" onClick={markPaid} disabled={busy === "paid"}><CreditCard size={16} className="mr-2" /> Mark paid</PremiumButton> : null}{!["paid", "void", "cancelled"].includes(status) ? <PremiumButton variant="secondary" onClick={markPartial} disabled={busy === "partial"}>Record partial payment</PremiumButton> : null}{publicLink ? <a href={publicLink} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-700 px-4 py-3 text-sm font-black text-slate-100"><Eye size={16} /> View public invoice</a> : null}{publicLink ? <button type="button" onClick={copyPublicLink} className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-700 px-4 py-3 text-sm font-black text-slate-100"><Copy size={16} /> Copy public link</button> : null}<Link to={`/invoices/${id}/edit`} className="inline-flex items-center justify-center rounded-full bg-white px-4 py-3 text-sm font-black text-slate-950">Edit invoice</Link>{!["paid", "void"].includes(status) ? <button type="button" onClick={voidInvoice} className="inline-flex items-center justify-center gap-2 rounded-full bg-red-500/10 px-4 py-3 text-sm font-black text-red-200"><Trash2 size={16} /> Void invoice</button> : null}</div></PremiumCard><PremiumCard title="Payment history">{Array.isArray(invoice.payment_history) && invoice.payment_history.length ? <div className="space-y-2">{invoice.payment_history.map((payment, index) => <div key={index} className="rounded-2xl bg-slate-950/60 p-3 text-sm"><b className="text-white">{money(payment.amount)}</b><p className="text-slate-300">{payment.note}</p><small className="text-slate-400">{date(payment.recorded_at)}</small></div>)}</div> : <p className="text-sm font-semibold text-slate-300">No payments recorded yet.</p>}</PremiumCard></aside>
    </section>
  </PremiumPage></Layout>;
}
