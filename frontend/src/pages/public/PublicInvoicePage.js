// CHURVOX_AREA4_PUBLIC_BUSINESS_GRADE_INVOICE_20260531
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import "./PublicDocumentTemplate.css";

const API_BASE = (process.env.REACT_APP_BACKEND_URL || process.env.VITE_BACKEND_URL || "https://grassley-backend.onrender.com").replace(/\/$/, "");

function moneyNumber(value) {
  const n = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function formatCurrency(value) {
  return moneyNumber(value).toLocaleString("en-NZ", { style: "currency", currency: "NZD" });
}

function date(value) {
  if (!value) return "Not set";
  try { return new Date(value).toLocaleDateString("en-NZ"); } catch { return String(value); }
}

function first(...values) {
  return values.find((value) => String(value ?? "").trim()) || "";
}

function lineAmount(line) {
  const direct = first(line.amount, line.total, line.line_total);
  if (String(direct).trim()) return moneyNumber(direct);
  return (moneyNumber(first(line.quantity, line.qty, 1)) || 1) * moneyNumber(first(line.unit_price, line.rate, line.price));
}

export default function PublicInvoicePage() {
  const { token } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/public/invoice/${token}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.detail || "Unable to load invoice");
        setInvoice(data?.invoice || data?.data || data);
      } catch (err) {
        toast.error(err.message || "Unable to load invoice");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setNotice("Invoice link copied.");
    } catch {
      setNotice(window.location.href);
    }
  }

  const rows = useMemo(() => {
    const raw = invoice?.line_items || invoice?.items || invoice?.lines || [];
    if (Array.isArray(raw) && raw.length) return raw;
    if (!invoice) return [];
    return [{ description: first(invoice.description, invoice.invoice_description, invoice.notes, "Service work completed."), quantity: 1, unit_price: first(invoice.subtotal, invoice.amount, invoice.price, invoice.total), amount: first(invoice.subtotal, invoice.amount, invoice.price, invoice.total) }];
  }, [invoice]);

  if (loading) return <div className="cpd-shell"><div className="cpd-document"><div className="cpd-body">Loading invoice...</div></div></div>;
  if (!invoice) return <div className="cpd-shell"><div className="cpd-document"><div className="cpd-body">Invoice not found.</div></div></div>;

  const biz = invoice.business_snapshot || invoice.business || {};
  const invoiceNumber = invoice.invoice_number || invoice.number || "Invoice";
  const customer = invoice.customer_name || invoice.client_name || "Customer";
  const subtotal = moneyNumber(invoice.subtotal) || rows.reduce((sum, row) => sum + lineAmount(row), 0);
  const gstRate = moneyNumber(invoice.gst_rate || invoice.tax_rate || 15);
  const gstAmount = moneyNumber(invoice.gst_amount || invoice.tax_amount || subtotal * (gstRate / 100));
  const total = moneyNumber(invoice.total || invoice.amount || subtotal + gstAmount);
  const amountDue = moneyNumber(invoice.amount_due || invoice.balance_due || Math.max(0, total - moneyNumber(invoice.amount_paid)));
  const paymentLink = invoice.payment_link || invoice.payment_url || invoice.stripe_payment_url || "";
  const paymentDetails = invoice.payment_details || invoice.payment_instructions || invoice.bank_details || "";
  const bankDetails = [biz.bank_account_name, biz.bank_account_number].filter(Boolean).join(" — ");
  const publicNotes = invoice.public_notes || invoice.customer_notes || invoice.notes || "";
  const status = invoice.status || "draft";

  return (
    <main className="cpd-shell" data-version="CHURVOX_AREA4_PUBLIC_BUSINESS_GRADE_INVOICE_20260531">
      <section className="cpd-actions">
        <b>{biz.business_name || "Churvox invoice"}</b>
        <button type="button" onClick={() => window.print()}>Print / PDF</button>
        <button type="button" onClick={copyLink}>Copy link</button>
        {paymentLink ? <a href={paymentLink} target="_blank" rel="noreferrer">Pay now</a> : null}
        {notice ? <span>{notice}</span> : null}
      </section>

      <article className="cpd-document">
        <header className="cpd-head">
          <div>
            {biz.logo_base64 ? <img src={biz.logo_base64} alt="Business logo" style={{ maxWidth: 150, maxHeight: 70, objectFit: "contain", marginBottom: 12 }} /> : null}
            <small>Invoice</small>
            <h1>{invoiceNumber}</h1>
            <p>{biz.business_name || "Business invoice"}</p>
            <p>{biz.business_address || ""}</p>
            {biz.gst_number ? <p>GST: {biz.gst_number}</p> : null}
            {biz.nzbn ? <p>NZBN: {biz.nzbn}</p> : null}
          </div>
          
        </header>

        <section className="cpd-body">
          <div className="cpd-grid">
            <div className="cpd-card">
              <small>Bill to</small>
              <h2>{customer}</h2>
              <p>{invoice.customer_email || invoice.email || ""}</p>
              <p>{invoice.customer_phone || ""}</p>
              <p>{invoice.billing_address || invoice.address || "Customer details saved by the business."}</p>
            </div>
            <div className="cpd-card">
              <small>Job / payment terms</small>
              <h2>{invoice.site_address || invoice.address || "Service work"}</h2>
              <p>{invoice.payment_terms || "Payment terms provided by the business."}</p>
              <p>Issued {date(invoice.created_at)}</p>
            </div>
          </div>

          {invoice.description ? <div className="cpd-card" style={{ marginBottom: 18 }}><small>Description</small><p>{invoice.description}</p></div> : null}

          <table className="cpd-line-table">
            <thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Total</th></tr></thead>
            <tbody>
              {rows.map((line, index) => (
                <tr key={index}>
                  <td>{line.description || line.name || "Service work"}</td>
                  <td>{line.quantity || line.qty || 1}</td>
                  <td>{formatCurrency(line.unit_price || line.rate || line.price)}</td>
                  <td>{formatCurrency(lineAmount(line))}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="cpd-total-card">
            <small>Amount due</small>
            <div className="cpd-total-lines">
              <span>Subtotal</span><b>{formatCurrency(subtotal)}</b>
              <span>Discount</span><b>{formatCurrency(invoice.discount_amount)}</b>
              <span>GST ({gstRate}%)</span><b>{formatCurrency(gstAmount)}</b>
              <span>Paid</span><b>{formatCurrency(invoice.amount_paid)}</b>
            </div>
            <h2>{formatCurrency(amountDue || total)}</h2>
            <p>{paymentLink ? "Use Pay now to complete payment securely." : paymentDetails || bankDetails || "Payment details are provided by the business."}</p>
            {bankDetails ? <p className="cpd-payment-note">{bankDetails}</p> : null}
            {publicNotes ? <p className="cpd-payment-note">{publicNotes}</p> : null}
            {paymentLink ? <a className="cpd-primary-action" href={paymentLink} target="_blank" rel="noreferrer">Pay now</a> : null}
          </div>
        </section>

        <footer className="cpd-footer"><b>Churvox</b><span>Work completed. Admin prepared. Owner approved.</span></footer>
      </article>
    </main>
  );
}
