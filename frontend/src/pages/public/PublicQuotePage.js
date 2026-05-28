// CHURVOX_PUBLIC_QUOTE_TEMPLATE_20260528
// CHURVOX_PUBLIC_DOCUMENT_IMPORT_SAFETY_20260528
// CHURVOX_PUBLIC_DOCUMENT_LINE_ITEMS_TOTALS_20260529
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

function lineDescription(line, fallback) {
  return first(line.description, line.name, line.item, line.title, fallback);
}

function lineQty(line) {
  return moneyNumber(first(line.quantity, line.qty, 1)) || 1;
}

function lineRate(line) {
  return moneyNumber(first(line.rate, line.unit_price, line.price, line.amount));
}

function lineAmount(line) {
  const direct = first(line.amount, line.total, line.line_total);
  if (String(direct).trim()) return moneyNumber(direct);
  return lineQty(line) * lineRate(line);
}

export default function PublicQuotePage() {
  const { token } = useParams();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const loadQuote = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/public/quote/${token}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || "Unable to load quote");
      setQuote(data?.quote || data?.data || data);
    } catch (err) {
      toast.error(err.message || "Unable to load quote");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadQuote(); }, [token]);

  const updateStatus = async (next) => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/public/quote/${token}/${next}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.detail || data?.error || `Failed to ${next}`);
      toast.success(`Quote ${next}ed`);
      await loadQuote();
    } catch (err) {
      toast.error(err.message || `Failed to ${next} quote`);
    } finally {
      setSaving(false);
    }
  };

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setNotice("Quote link copied.");
    } catch {
      setNotice(window.location.href);
    }
  }

  const rows = useMemo(() => {
    const raw = quote?.line_items || quote?.items || quote?.lines || [];
    if (Array.isArray(raw) && raw.length) return raw;
    if (!quote) return [];
    return [{ description: first(quote.job_description, quote.description, quote.notes, "Quoted work prepared for review."), quantity: 1, rate: moneyNumber(first(quote.price, quote.total, quote.amount)) }];
  }, [quote]);

  if (loading) return <div className="cpd-shell"><div className="cpd-document"><div className="cpd-body">Loading quote...</div></div></div>;
  if (!quote) return <div className="cpd-shell"><div className="cpd-document"><div className="cpd-body">Quote not found.</div></div></div>;

  const quoteNumber = quote.quote_number || quote.number || "Quote";
  const customer = quote.customer_name || quote.client_name || "Customer";
  const description = quote.job_description || quote.description || quote.notes || "Quoted work prepared for review.";
  const subtotal = moneyNumber(first(quote.subtotal, rows.reduce((sum, row) => sum + lineAmount(row), 0)));
  const total = moneyNumber(first(quote.price, quote.total, quote.amount, subtotal));
  const status = quote.status || "draft";
  const validUntil = quote.valid_until || quote.expiry_date || quote.expires_at || "";
  const publicNotes = quote.public_notes || quote.customer_notes || quote.notes || "";

  return (
    <main className="cpd-shell" data-version="CHURVOX_PUBLIC_QUOTE_TEMPLATE_20260528 CHURVOX_PUBLIC_DOCUMENT_IMPORT_SAFETY_20260528 CHURVOX_PUBLIC_DOCUMENT_LINE_ITEMS_TOTALS_20260529">
      <section className="cpd-actions">
        <b>Churvox quote</b>
        <button type="button" onClick={() => window.print()}>Print / PDF</button>
        <button type="button" onClick={copyLink}>Copy link</button>
        <button type="button" disabled={saving || status === "accepted"} onClick={() => updateStatus("accept")}>Accept quote</button>
        <button type="button" disabled={saving || status === "declined"} onClick={() => updateStatus("decline")}>Decline quote</button>
        {notice ? <span>{notice}</span> : null}
      </section>
      <article className="cpd-document">
        <header className="cpd-head">
          <div><small>Quote</small><h1>{quoteNumber}</h1><p>{customer}</p></div>
          <aside className="cpd-status"><small>Status</small><b>{status}</b><p>{validUntil ? `Valid until ${String(validUntil).split("T")[0]}` : "Prepared through Churvox."}</p></aside>
        </header>
        <section className="cpd-body">
          <div className="cpd-grid">
            <div className="cpd-card"><small>Prepared for</small><h2>{customer}</h2><p>{quote.address || quote.email || quote.customer_email || "Customer details saved by the business."}</p></div>
            <div className="cpd-card"><small>Scope</small><h2>Work quoted</h2><p>{description}</p></div>
          </div>
          <table className="cpd-line-table"><thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Total</th></tr></thead><tbody>{rows.map((line, index) => <tr key={index}><td>{lineDescription(line, description)}</td><td>{lineQty(line)}</td><td>{formatCurrency(lineRate(line))}</td><td>{formatCurrency(lineAmount(line))}</td></tr>)}</tbody></table>
          <div className="cpd-total-card"><small>Quote total</small><div className="cpd-total-lines"><span>Subtotal</span><b>{formatCurrency(subtotal)}</b></div><h2>{formatCurrency(total)}</h2><p>{publicNotes && publicNotes !== description ? publicNotes : "Approve or decline this quote using the action bar above."}</p></div>
        </section>
        <footer className="cpd-footer"><b>Churvox</b><span>Quote prepared. Customer reviews. Owner stays in control.</span></footer>
      </article>
    </main>
  );
}
