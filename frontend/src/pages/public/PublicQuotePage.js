// CHURVOX_PUBLIC_QUOTE_TEMPLATE_20260528
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { API_BASE } from "@/lib/apiBase";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import "./PublicDocumentTemplate.css";

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
      setQuote(data);
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

  if (loading) return <div className="cpd-shell"><div className="cpd-document"><div className="cpd-body">Loading quote...</div></div></div>;
  if (!quote) return <div className="cpd-shell"><div className="cpd-document"><div className="cpd-body">Quote not found.</div></div></div>;

  const quoteNumber = quote.quote_number || quote.number || "Quote";
  const customer = quote.customer_name || quote.client_name || "Customer";
  const description = quote.job_description || quote.description || quote.notes || "Quoted work prepared for review.";
  const total = Number(quote.price || quote.total || quote.amount || 0);
  const status = quote.status || "draft";

  return (
    <main className="cpd-shell" data-version="CHURVOX_PUBLIC_QUOTE_TEMPLATE_20260528">
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
          <aside className="cpd-status"><small>Status</small><b>{status}</b><p>Prepared through Churvox.</p></aside>
        </header>
        <section className="cpd-body">
          <div className="cpd-grid">
            <div className="cpd-card"><small>Prepared for</small><h2>{customer}</h2><p>{quote.address || quote.email || quote.customer_email || "Customer details saved by the business."}</p></div>
            <div className="cpd-card"><small>Scope</small><h2>Work quoted</h2><p>{description}</p></div>
          </div>
          <table className="cpd-line-table"><thead><tr><th>Item</th><th>Total</th></tr></thead><tbody><tr><td>{description}</td><td>{formatCurrency(total)}</td></tr></tbody></table>
          <div className="cpd-total-card"><small>Quote total</small><h2>{formatCurrency(total)}</h2><p>Approve or decline this quote using the action bar above.</p></div>
        </section>
        <footer className="cpd-footer"><b>Churvox</b><span>Quote prepared. Customer reviews. Owner stays in control.</span></footer>
      </article>
    </main>
  );
}
