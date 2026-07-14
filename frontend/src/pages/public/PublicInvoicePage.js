import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import API_BASE from "../../lib/apiBase";
import "./PublicDocumentTemplate.css";

function moneyNumber(value) {
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function hasValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function currencyCode(invoice = {}, business = {}) {
  const raw = String(invoice.currency || invoice.currency_code || business.currency || business.currency_code || "NZD").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(raw) ? raw : "NZD";
}

function formatCurrency(value, currency = "NZD") {
  try {
    return moneyNumber(value).toLocaleString("en-NZ", { style: "currency", currency });
  } catch {
    return `${currency} ${moneyNumber(value).toFixed(2)}`;
  }
}

function date(value) {
  if (!value) return "Not set";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleDateString("en-NZ");
}

function first(...values) {
  return values.find((value) => hasValue(value)) ?? "";
}

function lineAmount(line = {}) {
  const direct = first(line.amount, line.total, line.line_total);
  if (hasValue(direct)) return moneyNumber(direct);
  return (moneyNumber(first(line.quantity, line.qty, 1)) || 1) * moneyNumber(first(line.unit_price, line.rate, line.price));
}

function safePaymentUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const parsed = new URL(raw, window.location.origin);
    return ["https:", "http:"].includes(parsed.protocol) ? parsed.href : "";
  } catch {
    return "";
  }
}

function Unavailable({ message }) {
  return (
    <main className="cpd-shell">
      <article className="cpd-document">
        <section className="cpd-body">
          <small>Churvox invoice</small>
          <h1>Invoice unavailable</h1>
          <p>{message}</p>
          <p><a href="mailto:hello@churvox.com?subject=Churvox%20invoice%20link" style={{ display: "inline-flex", alignItems: "center", minHeight: 28, padding: "2px 4px" }}>Contact Churvox support</a> if the business has confirmed this link should still work.</p>
        </section>
      </article>
    </main>
  );
}

export default function PublicInvoicePage() {
  const { token } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError("");
      if (!token) {
        setError("This invoice link is missing its secure token.");
        setLoading(false);
        return;
      }
      try {
        const response = await fetch(`${API_BASE}/api/public/invoice/${encodeURIComponent(token)}`, { headers: { Accept: "application/json" } });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data?.success === false) throw new Error(data?.detail || data?.message || "Unable to load invoice");
        const record = data?.invoice || data?.data?.invoice || data?.data || data;
        if (!record || typeof record !== "object") throw new Error("The invoice record was not returned.");
        if (alive) setInvoice(record);
      } catch (requestError) {
        if (!alive) return;
        const message = requestError?.message || "Unable to load invoice";
        setError(message);
        toast.error(message);
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => { alive = false; };
  }, [token]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setNotice("Invoice link copied.");
    } catch {
      setNotice("Copy the current browser address to share this invoice.");
    }
  }

  const rows = useMemo(() => {
    const raw = invoice?.line_items || invoice?.items || invoice?.lines || [];
    if (Array.isArray(raw) && raw.length) return raw;
    if (!invoice) return [];
    const amount = first(invoice.subtotal, invoice.amount, invoice.price, invoice.total);
    return [{ description: first(invoice.description, invoice.invoice_description, invoice.notes, "Service work completed."), quantity: 1, unit_price: amount, amount }];
  }, [invoice]);

  if (loading) return <main className="cpd-shell"><article className="cpd-document"><section className="cpd-body">Loading invoice…</section></article></main>;
  if (error || !invoice) return <Unavailable message={error || "The invoice was not found or is no longer available."} />;

  const business = invoice.business_snapshot || invoice.business || {};
  const currency = currencyCode(invoice, business);
  const invoiceNumber = invoice.invoice_number || invoice.number || "Invoice";
  const customer = invoice.customer_name || invoice.client_name || "Customer";
  const subtotal = hasValue(invoice.subtotal) ? moneyNumber(invoice.subtotal) : rows.reduce((sum, row) => sum + lineAmount(row), 0);
  const gstRate = hasValue(invoice.gst_rate) ? moneyNumber(invoice.gst_rate) : hasValue(invoice.tax_rate) ? moneyNumber(invoice.tax_rate) : currency === "NZD" ? 15 : 0;
  const gstAmount = hasValue(invoice.gst_amount)
    ? moneyNumber(invoice.gst_amount)
    : hasValue(invoice.tax_amount)
      ? moneyNumber(invoice.tax_amount)
      : subtotal * (gstRate / 100);
  const total = hasValue(invoice.total) ? moneyNumber(invoice.total) : hasValue(invoice.amount) ? moneyNumber(invoice.amount) : subtotal + gstAmount;
  const amountPaid = moneyNumber(invoice.amount_paid);
  const amountDue = hasValue(invoice.amount_due)
    ? Math.max(0, moneyNumber(invoice.amount_due))
    : hasValue(invoice.balance_due)
      ? Math.max(0, moneyNumber(invoice.balance_due))
      : Math.max(0, total - amountPaid);
  const rawStatus = String(invoice.status || invoice.payment_status || "sent").trim().toLowerCase();
  const paid = amountDue <= 0 || ["paid", "settled", "complete", "completed"].includes(rawStatus);
  const paymentLink = paid ? "" : safePaymentUrl(invoice.payment_link || invoice.payment_url || invoice.stripe_payment_url);
  const paymentDetails = invoice.payment_details || invoice.payment_instructions || invoice.bank_details || "";
  const bankDetails = [business.bank_account_name, business.bank_account_number].filter(Boolean).join(" — ");
  const publicNotes = invoice.public_notes || invoice.customer_notes || invoice.notes || "";

  return (
    <main className="cpd-shell" data-version="CHURVOX_PUBLIC_INVOICE_PAID_LAUNCH_20260712">
      <section className="cpd-actions">
        <b>{business.business_name || "Churvox invoice"}</b>
        <button type="button" onClick={() => window.print()}>Print / PDF</button>
        <button type="button" onClick={copyLink}>Copy link</button>
        {paymentLink ? <a href={paymentLink} target="_blank" rel="noopener noreferrer">Pay securely</a> : null}
        {paid ? <span>Paid</span> : null}
        {notice ? <span>{notice}</span> : null}
      </section>

      <article className="cpd-document">
        <header className="cpd-head">
          <div>
            {business.logo_base64 ? <img src={business.logo_base64} alt="Business logo" style={{ maxWidth: 150, maxHeight: 70, objectFit: "contain", marginBottom: 12 }} /> : null}
            <small>Invoice · {paid ? "Paid" : "Payment due"}</small>
            <h1>{invoiceNumber}</h1>
            <p>{business.business_name || "Business invoice"}</p>
            <p>{business.business_address || ""}</p>
            {business.gst_number ? <p>GST: {business.gst_number}</p> : null}
            {business.nzbn ? <p>NZBN: {business.nzbn}</p> : null}
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
              <p>Issued {date(invoice.issued_at || invoice.created_at)}</p>
              {invoice.due_date ? <p>Due {date(invoice.due_date)}</p> : null}
            </div>
          </div>

          {invoice.description ? <div className="cpd-card" style={{ marginBottom: 18 }}><small>Description</small><p>{invoice.description}</p></div> : null}

          <table className="cpd-line-table">
            <thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Total</th></tr></thead>
            <tbody>
              {rows.map((line, index) => (
                <tr key={`${line.id || line.description || "line"}-${index}`}>
                  <td>{line.description || line.name || "Service work"}</td>
                  <td>{line.quantity || line.qty || 1}</td>
                  <td>{formatCurrency(line.unit_price || line.rate || line.price, currency)}</td>
                  <td>{formatCurrency(lineAmount(line), currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="cpd-total-card">
            <small>{paid ? "Payment complete" : "Amount due"}</small>
            <div className="cpd-total-lines">
              <span>Subtotal</span><b>{formatCurrency(subtotal, currency)}</b>
              {moneyNumber(invoice.discount_amount) ? <><span>Discount</span><b>-{formatCurrency(Math.abs(moneyNumber(invoice.discount_amount)), currency)}</b></> : null}
              {gstRate || gstAmount ? <><span>{currency === "NZD" ? "GST" : "Tax"} ({gstRate}%)</span><b>{formatCurrency(gstAmount, currency)}</b></> : null}
              <span>Paid</span><b>{formatCurrency(paid ? Math.max(amountPaid, total) : amountPaid, currency)}</b>
            </div>
            <h2>{formatCurrency(amountDue, currency)}</h2>
            <p>{paid ? "This invoice is recorded as paid. No payment is required." : paymentLink ? "Use Pay securely to complete payment through the business payment provider." : paymentDetails || bankDetails || "Payment details are provided by the business."}</p>
            {!paid && bankDetails ? <p className="cpd-payment-note">{bankDetails}</p> : null}
            {publicNotes ? <p className="cpd-payment-note">{publicNotes}</p> : null}
            {paymentLink ? <a className="cpd-primary-action" href={paymentLink} target="_blank" rel="noopener noreferrer">Pay securely</a> : null}
          </div>
        </section>

        <footer className="cpd-footer"><b>Churvox</b><span>Work completed. Invoice prepared and approved by the business.</span></footer>
      </article>
    </main>
  );
}
