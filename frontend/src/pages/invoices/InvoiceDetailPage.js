import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Layout from "../../components/Layout";
import { useApi } from "../../hooks/useApi";
import { PremiumPage, PremiumHero, PremiumCard, PremiumButton } from "../../components/premium";
import { ArrowLeft, CheckCircle, Copy, CreditCard, Eye, Receipt, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";

function n(value) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num : 0;
}

function money(value) {
  return n(value).toLocaleString("en-NZ", { style: "currency", currency: "NZD" });
}

function date(value) {
  if (!value) return "Not set";
  try { return new Date(value).toLocaleDateString("en-NZ"); } catch { return String(value); }
}

function statusClass(status) {
  const s = String(status || "draft").toLowerCase();
  if (s === "paid") return "bg-green-100 text-green-800 border-green-200";
  if (s === "partially_paid") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (s === "overdue" || s === "void" || s === "cancelled") return "bg-red-100 text-red-800 border-red-200";
  if (s === "sent" || s === "approved") return "bg-blue-100 text-blue-800 border-blue-200";
  return "bg-amber-100 text-amber-800 border-amber-200";
}

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const api = useApi();
  const [invoice, setInvoice] = useState(null);
  const [busy, setBusy] = useState("");

  const loadInvoice = useCallback(async () => {
    const res = await api.get(`/invoices/${id}`);
    if (res.success) setInvoice(res.data?.invoice || res.data);
    else {
      toast.error(res.error || "Invoice not found");
      navigate("/invoices");
    }
  }, [id, navigate]);

  useEffect(() => { loadInvoice(); }, [loadInvoice]);

  const rows = useMemo(() => {
    const raw = invoice?.line_items || invoice?.items || [];
    if (Array.isArray(raw) && raw.length) return raw;
    if (!invoice) return [];
    return [{ description: invoice.description || "Service work completed", quantity: 1, unit_price: invoice.subtotal || invoice.total || 0, amount: invoice.subtotal || invoice.total || 0 }];
  }, [invoice]);

  async function run(label, fn) {
    setBusy(label);
    const res = await fn();
    setBusy("");
    if (res.success) {
      setInvoice(res.data?.invoice || res.data);
      toast.success("Invoice updated");
      await loadInvoice();
    } else {
      toast.error(res.error || "Action failed");
    }
  }

  async function sendInvoice() {
    await run("send", () => api.post(`/invoices/${id}/send`));
  }

  async function approveInvoice() {
    await run("approve", () => api.post(`/invoices/${id}/approve`));
  }

  async function markPaid() {
    const amount = invoice?.amount_due || invoice?.balance_due || Math.max(0, n(invoice?.total) - n(invoice?.amount_paid));
    await run("paid", () => api.post(`/invoices/${id}/partial-payment`, { amount, note: "Marked paid by owner" }));
  }

  async function markPartial() {
    const raw = window.prompt("Payment amount received?");
    if (!raw) return;
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount <= 0) return toast.error("Enter a valid payment amount");
    await run("partial", () => api.post(`/invoices/${id}/partial-payment`, { amount, note: "Partial payment recorded" }));
  }

  async function voidInvoice() {
    const reason = window.prompt("Reason for voiding this invoice?", "Voided by owner");
    if (reason === null) return;
    await run("void", () => api.post(`/invoices/${id}/void`, { reason }));
  }

  async function copyPublicLink() {
    const link = invoice?.public_invoice_url || (invoice?.public_token ? `${window.location.origin}/public/invoice/${invoice.public_token}` : "");
    if (!link) return toast.error("No public link yet");
    await navigator.clipboard.writeText(link);
    toast.success("Public invoice link copied");
  }

  if (!invoice) {
    return <Layout><PremiumPage><PremiumCard><div className="p-10 text-center font-bold text-[#5b6c87]">Loading invoice…</div></PremiumCard></PremiumPage></Layout>;
  }

  const biz = invoice.business_snapshot || {};
  const publicLink = invoice.public_invoice_url || (invoice.public_token ? `/public/invoice/${invoice.public_token}` : "");
  const status = String(invoice.status || "draft").toLowerCase();

  return (
    <Layout>
      <PremiumPage maxWidth={1080}>
        <button onClick={() => navigate("/invoices")} className="flex items-center gap-2 text-sm font-black text-[#5b6c87] hover:text-[#0d1b34]">
          <ArrowLeft size={16} /> Back to invoices
        </button>

        <PremiumHero
          eyebrow="Invoice Work Slip"
          title={invoice.invoice_number || "Invoice"}
          subtitle={`${invoice.customer_name || "Customer"} • ${money(invoice.total)} • due ${date(invoice.due_date)}`}
          icon={<Receipt className="h-6 w-6" />}
          actions={<span className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${statusClass(status)}`}>{status.replace("_", " ")}</span>}
        />

        <section className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <PremiumCard>
            <article className="rounded-3xl bg-white p-6 text-[#0d1b34] shadow-sm" data-testid="business-grade-invoice-preview">
              <header className="flex justify-between gap-5 border-b border-[#e6eef9] pb-5">
                <div>
                  {biz.logo_base64 ? <img src={biz.logo_base64} alt="Business logo" className="mb-3 max-h-16 max-w-40 object-contain" /> : <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-[#0d1b34] text-white font-black">CV</div>}
                  <h2 className="text-2xl font-black">{biz.business_name || "Business"}</h2>
                  <p className="text-sm text-[#5b6c87]">{biz.business_address || ""}</p>
                  <p className="text-sm text-[#5b6c87]">{biz.email || ""} {biz.phone ? `• ${biz.phone}` : ""}</p>
                  {biz.gst_number ? <p className="text-xs font-bold text-[#5b6c87]">GST: {biz.gst_number}</p> : null}
                  {biz.nzbn ? <p className="text-xs font-bold text-[#5b6c87]">NZBN: {biz.nzbn}</p> : null}
                </div>
                <div className="text-right">
                  <p className="text-xs font-black uppercase text-[#5b6c87]">Invoice</p>
                  <h1 className="text-3xl font-black">{invoice.invoice_number}</h1>
                  <p className="mt-2 text-sm text-[#5b6c87]">Issued {date(invoice.created_at)}</p>
                  <p className="text-sm text-[#5b6c87]">Due {date(invoice.due_date)}</p>
                </div>
              </header>

              <section className="grid grid-cols-1 md:grid-cols-2 gap-4 py-5">
                <div className="rounded-2xl bg-[#f6faff] p-4">
                  <p className="text-xs font-black uppercase text-[#5b6c87]">Bill to</p>
                  <h3 className="mt-1 font-black">{invoice.customer_name}</h3>
                  <p className="text-sm text-[#5b6c87]">{invoice.customer_email}</p>
                  <p className="text-sm text-[#5b6c87]">{invoice.customer_phone}</p>
                  <p className="text-sm text-[#5b6c87]">{invoice.billing_address || invoice.address}</p>
                </div>
                <div className="rounded-2xl bg-[#f6faff] p-4">
                  <p className="text-xs font-black uppercase text-[#5b6c87]">Job / payment</p>
                  <p className="text-sm text-[#0d1b34]">{invoice.site_address || invoice.address || "No site address saved"}</p>
                  <p className="mt-2 text-sm text-[#5b6c87]">{invoice.payment_terms || "Payment terms not set"}</p>
                  {invoice.job_id || invoice.linked_job_id ? <Link className="mt-2 inline-block text-sm font-black text-[#2563eb]" to={`/jobs/${invoice.job_id || invoice.linked_job_id}`}>Open linked job</Link> : null}
                </div>
              </section>

              {invoice.description ? <p className="mb-4 rounded-2xl bg-[#fff7ed] p-4 text-sm font-semibold text-[#7c2d12]">{invoice.description}</p> : null}

              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e6eef9] text-left text-xs uppercase text-[#5b6c87]">
                    <th className="py-2">Item</th>
                    <th className="py-2 text-right">Qty</th>
                    <th className="py-2 text-right">Rate</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={index} className="border-b border-[#edf3fb]">
                      <td className="py-3 font-bold">{row.description}</td>
                      <td className="py-3 text-right">{row.quantity || 1}</td>
                      <td className="py-3 text-right">{money(row.unit_price || row.rate)}</td>
                      <td className="py-3 text-right font-black">{money(row.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <section className="ml-auto mt-5 max-w-sm space-y-2 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><b>{money(invoice.subtotal)}</b></div>
                <div className="flex justify-between"><span>Discount</span><b>{money(invoice.discount_amount)}</b></div>
                <div className="flex justify-between"><span>GST ({invoice.gst_rate || 15}%)</span><b>{money(invoice.gst_amount)}</b></div>
                <div className="flex justify-between border-t border-[#e6eef9] pt-2 text-lg"><span>Total</span><b>{money(invoice.total)}</b></div>
                <div className="flex justify-between"><span>Paid</span><b>{money(invoice.amount_paid)}</b></div>
                <div className="flex justify-between rounded-2xl bg-[#ecfdf5] p-3 text-lg text-[#166534]"><span>Amount due</span><b>{money(invoice.amount_due || invoice.balance_due)}</b></div>
              </section>

              {(biz.bank_account_name || biz.bank_account_number || invoice.payment_link) && (
                <footer className="mt-6 rounded-2xl bg-[#0d1b34] p-4 text-white">
                  <p className="text-xs font-black uppercase opacity-70">Payment details</p>
                  {biz.bank_account_name ? <p className="font-bold">{biz.bank_account_name}</p> : null}
                  {biz.bank_account_number ? <p className="font-mono">{biz.bank_account_number}</p> : null}
                  {invoice.payment_link ? <a className="mt-2 inline-block rounded-full bg-white px-4 py-2 text-sm font-black text-[#0d1b34]" href={invoice.payment_link} target="_blank" rel="noreferrer">Open payment link</a> : null}
                </footer>
              )}
            </article>
          </PremiumCard>

          <aside className="space-y-4">
            <PremiumCard title="Owner actions">
              <div className="grid gap-3">
                {status === "draft" ? <PremiumButton onClick={approveInvoice} disabled={busy === "approve"}><CheckCircle size={16} className="mr-2" /> Approve invoice</PremiumButton> : null}
                {["draft", "approved"].includes(status) ? <PremiumButton onClick={sendInvoice} disabled={busy === "send"}><Send size={16} className="mr-2" /> Send invoice</PremiumButton> : null}
                {!["paid", "void", "cancelled"].includes(status) ? <PremiumButton variant="success" onClick={markPaid} disabled={busy === "paid"}><CreditCard size={16} className="mr-2" /> Mark paid</PremiumButton> : null}
                {!["paid", "void", "cancelled"].includes(status) ? <PremiumButton variant="secondary" onClick={markPartial} disabled={busy === "partial"}>Record partial payment</PremiumButton> : null}
                {publicLink ? <a href={publicLink} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full border border-[#d8e3f3] px-4 py-3 text-sm font-black text-[#0d1b34]"><Eye size={16} /> View public invoice</a> : null}
                {publicLink ? <button type="button" onClick={copyPublicLink} className="inline-flex items-center justify-center gap-2 rounded-full border border-[#d8e3f3] px-4 py-3 text-sm font-black text-[#0d1b34]"><Copy size={16} /> Copy public link</button> : null}
                <Link to={`/invoices/${id}/edit`} className="inline-flex items-center justify-center rounded-full bg-[#0d1b34] px-4 py-3 text-sm font-black text-white">Edit invoice</Link>
                {!["paid", "void"].includes(status) ? <button type="button" onClick={voidInvoice} className="inline-flex items-center justify-center gap-2 rounded-full bg-red-50 px-4 py-3 text-sm font-black text-red-700"><Trash2 size={16} /> Void invoice</button> : null}
              </div>
            </PremiumCard>

            <PremiumCard title="Payment history">
              {Array.isArray(invoice.payment_history) && invoice.payment_history.length ? (
                <div className="space-y-2">
                  {invoice.payment_history.map((payment, index) => (
                    <div key={index} className="rounded-2xl bg-[#f6faff] p-3 text-sm">
                      <b className="text-[#0d1b34]">{money(payment.amount)}</b>
                      <p className="text-[#5b6c87]">{payment.note}</p>
                      <small className="text-[#7d8ba3]">{date(payment.recorded_at)}</small>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm font-semibold text-[#5b6c87]">No payments recorded yet.</p>
              )}
            </PremiumCard>
          </aside>
        </section>
      </PremiumPage>
    </Layout>
  );
}
