import React, { useCallback, useEffect, useMemo, useState } from "react";
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

function first(...values) {
  return values.find((value) => hasValue(value)) ?? "";
}

function firstAmount(...values) {
  for (const value of values) if (hasValue(value)) return moneyNumber(value);
  return 0;
}

function currencyCode(quote = {}, business = {}) {
  const raw = String(quote.currency || quote.currency_code || business.currency || business.currency_code || "NZD").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(raw) ? raw : "NZD";
}

function formatCurrency(value, currency = "NZD") {
  try {
    return moneyNumber(value).toLocaleString("en-NZ", { style: "currency", currency });
  } catch {
    return `${currency} ${moneyNumber(value).toFixed(2)}`;
  }
}

function lineDescription(line = {}, fallback) {
  return first(line.description, line.name, line.item, line.title, fallback);
}

function lineQty(line = {}) {
  return moneyNumber(first(line.quantity, line.qty, 1)) || 1;
}

function lineAmount(line = {}) {
  const direct = first(line.amount, line.total, line.line_total);
  if (hasValue(direct)) return moneyNumber(direct);
  return lineQty(line) * moneyNumber(first(line.rate, line.unit_price, line.price));
}

function lineRate(line = {}) {
  const directRate = first(line.rate, line.unit_price, line.price);
  if (hasValue(directRate)) return moneyNumber(directRate);
  return lineQty(line) ? lineAmount(line) / lineQty(line) : 0;
}

function Unavailable({ message }) {
  return (
    <main className="cpd-shell">
      <article className="cpd-document">
        <section className="cpd-body">
          <small>Churvox quote</small>
          <h1>Quote unavailable</h1>
          <p>{message}</p>
          <p>Ask the business to resend the quote, or <a href="mailto:hello@churvox.com?subject=Churvox%20quote%20link" style={{ display: "inline-flex", alignItems: "center", minHeight: 28, padding: "2px 4px" }}>contact Churvox support</a>.</p>
        </section>
      </article>
    </main>
  );
}

export default function PublicQuotePage() {
  const { token } = useParams();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState("");
  const [notice, setNotice] = useState("");

  const loadQuote = useCallback(async () => {
    setLoading(true);
    setError("");
    if (!token) {
      setError("This quote link is missing its secure token.");
      setLoading(false);
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/api/public/quote/${encodeURIComponent(token)}`, { headers: { Accept: "application/json" } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.success === false) throw new Error(data?.detail || data?.message || "Unable to load quote");
      const record = data?.quote || data?.data?.quote || data?.data || data;
      if (!record || typeof record !== "object") throw new Error("The quote record was not returned.");
      setQuote(record);
    } catch (requestError) {
      const message = requestError?.message || "Unable to load quote";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadQuote(); }, [loadQuote]);

  const updateStatus = async (next) => {
    if (saving || !token) return;
    setSaving(next);
    setNotice("");
    try {
      const response = await fetch(`${API_BASE}/api/public/quote/${encodeURIComponent(token)}/${next}`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: next }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.success === false) throw new Error(data?.detail || data?.message || data?.error || `Failed to ${next} quote`);
      const message = next === "accept" ? "Quote accepted. The business has been notified." : "Quote declined. The business has been notified.";
      setNotice(message);
      toast.success(message);
      await loadQuote();
    } catch (requestError) {
      const message = requestError?.message || `Failed to ${next} quote`;
      setNotice(message);
      toast.error(message);
    } finally {
      setSaving("");
    }
  };

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setNotice("Quote link copied.");
    } catch {
      setNotice("Copy the current browser address to share this quote.");
    }
  }

  const rows = useMemo(() => {
    const raw = quote?.line_items || quote?.items || quote?.lines || [];
    if (Array.isArray(raw) && raw.length) return raw;
    if (!quote) return [];
    return [{ description: first(quote.job_description, quote.description, quote.notes, "Quoted work prepared for review."), quantity: 1, rate: first(quote.price, quote.total, quote.amount, quote.subtotal) }];
  }, [quote]);

  if (loading) return <main className="cpd-shell"><article className="cpd-document"><section className="cpd-body">Loading quote…</section></article></main>;
  if (error || !quote) return <Unavailable message={error || "The quote was not found or is no longer available."} />;

  const quoteNumber = quote.quote_number || quote.number || "Quote";
  const customer = quote.customer_name || quote.client_name || "Customer";
  const business = quote.business_snapshot || quote.business || {};
  const currency = currencyCode(quote, business);
  const businessName = business.business_name || quote.business_name || "Business quote";
  const description = quote.job_description || quote.description || quote.notes || "Quoted work prepared for review.";
  const rowSubtotal = rows.reduce((sum, row) => sum + lineAmount(row), 0);
  const subtotal = firstAmount(quote.subtotal, rowSubtotal);
  const total = firstAmount(quote.total, quote.price, quote.amount, subtotal);
  const rawStatus = String(quote.status || "sent").toLowerCase();
  const accepted = ["accepted", "accept", "approved"].includes(rawStatus);
  const declined = ["declined", "decline", "rejected"].includes(rawStatus);
  const finalStatus = accepted || declined;
  const validUntil = quote.valid_until || quote.expiry_date || quote.expires_at || "";
  const publicNotes = quote.public_notes || quote.customer_notes || quote.notes || "";

  return (
    <main className="cpd-shell cpd-quote-shell" data-version="CHURVOX_PUBLIC_QUOTE_PAID_LAUNCH_20260712">
      <section className="cpd-actions cpd-quote-actions">
        <b>{businessName}</b>
        <button type="button" onClick={() => window.print()}>Print / PDF</button>
        <button type="button" onClick={copyLink}>Copy link</button>
        <button type="button" className="cpd-accept" disabled={Boolean(saving) || finalStatus} onClick={() => updateStatus("accept")}>{accepted ? "Accepted" : saving === "accept" ? "Accepting…" : "Accept quote"}</button>
        <button type="button" className="cpd-decline" disabled={Boolean(saving) || finalStatus} onClick={() => updateStatus("decline")}>{declined ? "Declined" : saving === "decline" ? "Declining…" : "Decline"}</button>
        {notice ? <span>{notice}</span> : null}
      </section>

      <article className="cpd-document cpd-quote-document">
        <header className="cpd-head cpd-quote-head">
          <div>
            {business.logo_base64 ? <img src={business.logo_base64} alt="Business logo" style={{ maxWidth: 150, maxHeight: 70, objectFit: "contain", marginBottom: 12 }} /> : null}
            <small>Quote for review</small>
            <h1>{quoteNumber}</h1>
            <p>{businessName}</p>
            <p>{business.business_address || quote.business_address || ""}</p>
          </div>

          <aside className="cpd-quote-approval-card">
            <span>Status</span>
            <b>{accepted ? "Accepted" : declined ? "Declined" : "Ready for review"}</b>
            <strong>{formatCurrency(total, currency)}</strong>
            <p>{validUntil ? `Valid until ${validUntil}` : finalStatus ? "This response has been recorded." : "Review the quote and choose accept or decline."}</p>
          </aside>
        </header>

        <section className="cpd-body">
          <div className="cpd-grid">
            <div className="cpd-card">
              <small>Prepared for</small>
              <h2>{customer}</h2>
              <p>{quote.address || quote.email || quote.customer_email || "Customer details saved by the business."}</p>
            </div>

            <div className="cpd-card">
              <small>Scope</small>
              <h2>Work quoted</h2>
              <p>{description}</p>
            </div>
          </div>

          <table className="cpd-line-table">
            <thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Total</th></tr></thead>
            <tbody>
              {rows.map((line, index) => (
                <tr key={`${line.id || line.description || "line"}-${index}`}>
                  <td>{lineDescription(line, description)}</td>
                  <td>{lineQty(line)}</td>
                  <td>{formatCurrency(lineRate(line), currency)}</td>
                  <td>{formatCurrency(lineAmount(line), currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="cpd-total-card cpd-quote-total-card">
            <small>Quote total</small>
            <div className="cpd-total-lines"><span>Subtotal</span><b>{formatCurrency(subtotal, currency)}</b></div>
            <h2>{formatCurrency(total, currency)}</h2>
            <p>{publicNotes && publicNotes !== description ? publicNotes : "Accepting this quote records your approval for the business to proceed. It does not take payment automatically."}</p>

            {finalStatus ? <p className="cpd-payment-note">Your response is recorded as {accepted ? "accepted" : "declined"}. Contact the business directly if it needs to change.</p> : (
              <div className="cpd-quote-bottom-actions">
                <button type="button" className="cpd-primary-action cpd-accept" disabled={Boolean(saving)} onClick={() => updateStatus("accept")}>{saving === "accept" ? "Accepting…" : "Accept quote"}</button>
                <button type="button" className="cpd-secondary-action" disabled={Boolean(saving)} onClick={() => updateStatus("decline")}>{saving === "decline" ? "Declining…" : "Decline quote"}</button>
              </div>
            )}
          </div>
        </section>

        <footer className="cpd-footer"><b>Churvox</b><span>Quote prepared by the business. Customer reviews and responds.</span></footer>
      </article>
    </main>
  );
}
