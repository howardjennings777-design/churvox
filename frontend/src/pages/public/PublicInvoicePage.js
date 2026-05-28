// CHURVOX_PUBLIC_INVOICE_TEMPLATE_20260528
// CHURVOX_PUBLIC_DOCUMENT_IMPORT_SAFETY_20260528
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import "./PublicDocumentTemplate.css";

const API_BASE = (process.env.REACT_APP_BACKEND_URL || process.env.VITE_BACKEND_URL || "https://grassley-backend.onrender.com").replace(/\/$/, "");

function formatCurrency(value) {
  const n = Number(value || 0);
  return n.toLocaleString("en-NZ", { style: "currency", currency: "NZD" });
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
        setInvoice(data);
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

  if (loading) return <div className="cpd-shell"><div className="cpd-document"><div className="cpd-body">Loading invoice...</div></div></div>;
  if (!invoice) return <div className="cpd-shell"><div className="cpd-document"><div className="cpd-body">Invoice not found.</div></div></div>;

  const invoiceNumber = invoice.invoice_number || invoice.number || "Invoice";
  const customer = invoice.customer_name || invoice.client_name || "Customer";
  const description = invoice.description || invoice.invoice_description || invoice.notes || "Service work completed.";
  const total = Number(invoice.total || invoice.amount || invoice.price || 0);
  const status = invoice.status || "draft";
  const paymentLink = invoice.payment_link || invoice.payment_url || invoice.stripe_payment_url || "";

  return (
    <main className="cpd-shell" data-version="CHURVOX_PUBLIC_INVOICE_TEMPLATE_20260528 CHURVOX_PUBLIC_DOCUMENT_IMPORT_SAFETY_20260528">
      <section className="cpd-actions">
        <b>Churvox invoice</b>
        <button type="button" onClick={() => window.print()}>Print / PDF</button>
        <button type="button" onClick={copyLink}>Copy link</button>
        {paymentLink ? <a href={paymentLink} target="_blank" rel="noreferrer">Pay now</a> : null}
        {notice ? <span>{notice}</span> : null}
      </section>

      <article className="cpd-document">
        <header className="cpd-head">
          <div>
            <small>Invoice</small>
            <h1>{invoiceNumber}</h1>
            <p>{customer}</p>
          </div>
          <aside className="cpd-status">
            <small>Status</small>
            <b>{status}</b>
            <p>Prepared through Churvox.</p>
          </aside>
        </header>

        <section className="cpd-body">
          <div className="cpd-grid">
            <div className="cpd-card">
              <small>Bill to</small>
              <h2>{customer}</h2>
              <p>{invoice.email || invoice.customer_email || invoice.address || "Customer details saved by the business."}</p>
            </div>
            <div className="cpd-card">
              <small>Description</small>
              <h2>Work completed</h2>
              <p>{description}</p>
            </div>
          </div>

          <table className="cpd-line-table">
            <thead><tr><th>Item</th><th>Total</th></tr></thead>
            <tbody>
              <tr><td>{description}</td><td>{formatCurrency(total)}</td></tr>
            </tbody>
          </table>

          <div className="cpd-total-card">
            <small>Total due</small>
            <h2>{formatCurrency(total)}</h2>
            <p>{paymentLink ? "Use Pay now to complete payment securely." : "Payment link not set up yet."}</p>
            {paymentLink ? <a className="cpd-primary-action" href={paymentLink} target="_blank" rel="noreferrer">Pay now</a> : null}
          </div>
        </section>

        <footer className="cpd-footer">
          <b>Churvox</b>
          <span>Work completed. Admin prepared. Owner approved.</span>
        </footer>
      </article>
    </main>
  );
}
