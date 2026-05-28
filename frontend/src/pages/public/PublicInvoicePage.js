// CHURVOX_PUBLIC_INVOICE_TEMPLATE_20260528
// CHURVOX_PUBLIC_DOCUMENT_IMPORT_SAFETY_20260528
// CHURVOX_PUBLIC_DOCUMENT_LINE_ITEMS_TOTALS_20260529
// CHURVOX_PUBLIC_DOCUMENT_TOTAL_FALLBACK_HARDENING_20260529
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

function first(...values) {
  return values.find((value) => String(value ?? "").trim()) || "";
}

function firstPositive(...values) {
  for (const value of values) {
    const n = moneyNumber(value);
    if (n > 0) return n;
  }
  return moneyNumber(first(...values));
}

function lineDescription(line, fallback) {
  return first(line.description, line.name, line.item, line.title, fallback);
}

function lineQty(line) {
  return moneyNumber(first(line.quantity, line.qty, 1)) || 1;
}

function lineRate(line) {
  const directRate = first(line.rate, line.unit_price, line.price);
  if (String(directRate).trim()) return moneyNumber(directRate);
  return lineQty(line) ? lineAmount(line) / lineQty(line) : 0;
}

function lineAmount(line) {
  const direct = first(line.amount, line.total, line.line_total);
  if (String(direct).trim()) return moneyNumber(direct);
  return lineQty(line) * moneyNumber(first(line.rate, line.unit_price, line.price));
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
    return [{ description: first(invoice.description, invoice.invoice_description, invoice.notes, "Service work completed."), quantity: 1, rate: firstPositive(invoice.subtotal, invoice.amount, invoice.price, invoice.total) }];
  }, [invoice]);

  if (loading) return <div className="cpd-shell"><div className="cpd-document"><div className="cpd-body">Loading invoice...</div></div></div>;
  if (!invoice) return <div className="cpd-shell"><div className="cpd-document"><div className="cpd-body">Invoice not found.</div></div></div>;

  const invoiceNumber = invoice.invoice_number || invoice.number || "Invoice";
  const customer = invoice.customer_name || invoice.client_name || "Customer";
  const description = invoice.description || invoice.invoice_description || invoice.notes || "Service work completed.";
  const rowSubtotal = rows.reduce((sum, row) => sum + lineAmount(row), 0);
  const subtotal = firstPositive(invoice.subtotal, rowSubtotal);
  const gstRate = firstPositive(invoice.gst_rate, invoice.tax_rate, 15);
  const gstAmount = firstPositive(invoice.gst_amount, invoice.tax_amount, subtotal * (gstRate / 100));
  const total = firstPositive(invoice.total, invoice.amount, subtotal + gstAmount);
  const status = invoice.status || "draft";
  const paymentLink = invoice.payment_link || invoice.payment_url || invoice.stripe_payment_url || "";
  const paymentDetails = invoice.payment_details || invoice.payment_instructions || invoice.bank_details || "";
  const publicNotes = invoice.public_notes || invoice.customer_notes || invoice.notes || "";

  return (
    <main className="cpd-shell" data-version="CHURVOX_PUBLIC_DOCUMENT_TOTAL_FALLBACK_HARDENING_20260529 CHURVOX_PUBLIC_DOCUMENT_LINE_ITEMS_TOTALS_20260529">
      <section className="cpd-actions">
        <b>Churvox invoice</b>
        <button type="button" onClick={() => window.print()}>Print / PDF</button>
        <button type="button" onClick={copyLink}>Copy link</button>
        {paymentLink ? <a href={paymentLink} target="_blank" rel="noreferrer">Pay now</a> : null}
        {notice ? <span>{notice}</span> : null}
      </section>

      <article className="cpd-document">
        <header className="cpd-head"><div><small>Invoice</small><h1>{invoiceNumber}</h1><p>{customer}</p></div><aside className="cpd-status"><small>Status</small><b>{status}</b><p>Prepared through Churvox.</p></aside></header>
        <section className="cpd-body">
          <div className="cpd-grid"><div className="cpd-card"><small>Bill to</small><h2>{customer}</h2><p>{invoice.email || invoice.customer_email || invoice.address || "Customer details saved by the business."}</p></div><div className="cpd-card"><small>Description</small><h2>Work completed</h2><p>{description}</p></div></div>
          <table className="cpd-line-table"><thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Total</th></tr></thead><tbody>{rows.map((line, index) => <tr key={index}><td>{lineDescription(line, description)}</td><td>{lineQty(line)}</td><td>{formatCurrency(lineRate(line))}</td><td>{formatCurrency(lineAmount(line))}</td></tr>)}</tbody></table>
          <div className="cpd-total-card"><small>Total due</small><div className="cpd-total-lines"><span>Subtotal</span><b>{formatCurrency(subtotal)}</b><span>GST ({gstRate}%)</span><b>{formatCurrency(gstAmount)}</b></div><h2>{formatCurrency(total)}</h2><p>{paymentLink ? "Use Pay now to complete payment securely." : paymentDetails || "Payment details are provided by the business."}</p>{paymentDetails ? <p className="cpd-payment-note">{paymentDetails}</p> : null}{publicNotes && publicNotes !== description ? <p className="cpd-payment-note">{publicNotes}</p> : null}{paymentLink ? <a className="cpd-primary-action" href={paymentLink} target="_blank" rel="noreferrer">Pay now</a> : null}</div>
        </section>
        <footer className="cpd-footer"><b>Churvox</b><span>Work completed. Admin prepared. Owner approved.</span></footer>
      </article>
    </main>
  );
}
