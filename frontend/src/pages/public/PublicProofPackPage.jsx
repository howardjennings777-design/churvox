import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import API_BASE from "../../lib/apiBase";
import "./PublicProofPackPage.css";

function moneyNumber(value) {
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function currencyCode(pack = {}) {
  const raw = String(pack.currency || pack.currency_code || pack?.business?.currency || "NZD").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(raw) ? raw : "NZD";
}

function money(value, currency = "NZD") {
  const amount = moneyNumber(value);
  if (!Number.isFinite(amount) || amount <= 0) return "";
  try {
    return amount.toLocaleString("en-NZ", { style: "currency", currency, maximumFractionDigits: 2 });
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function safeImageUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.startsWith("data:image/")) return raw;
  try {
    const parsed = new URL(raw, window.location.origin);
    return ["https:", "http:", "blob:"].includes(parsed.protocol) ? parsed.href : "";
  } catch {
    return "";
  }
}

function Unavailable({ message }) {
  return (
    <main className="cpp-shell">
      <section className="cpp-card">
        <small>Churvox proof pack</small>
        <h1>Proof pack unavailable</h1>
        <p>{message}</p>
        <p>Ask the business to resend the proof link, or <a href="mailto:hello@churvox.com?subject=Churvox%20proof%20pack" style={{ display: "inline-flex", alignItems: "center", minHeight: 28, padding: "2px 4px" }}>contact Churvox support</a>.</p>
      </section>
    </main>
  );
}

export default function PublicProofPackPage() {
  const { token } = useParams();
  const [state, setState] = useState({ loading: true, error: "", pack: null });
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!token) {
        setState({ loading: false, error: "This proof link is missing its secure token.", pack: null });
        return;
      }
      try {
        const response = await fetch(`${API_BASE}/api/public/proof/${encodeURIComponent(token)}`, { headers: { Accept: "application/json" } });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data?.success === false) throw new Error(data?.detail || data?.message || "Proof pack not found");
        const pack = data?.proof_pack || data?.data?.proof_pack || data?.pack || data?.item || data?.data || data;
        if (!pack || typeof pack !== "object") throw new Error("The proof pack record was not returned.");
        if (alive) setState({ loading: false, error: "", pack });
      } catch (error) {
        if (alive) setState({ loading: false, error: error?.message || "Could not load proof pack", pack: null });
      }
    }

    load();
    return () => { alive = false; };
  }, [token]);

  const pack = state.pack || {};
  const photos = useMemo(() => {
    const raw = Array.isArray(pack.photos) ? pack.photos : Array.isArray(pack.proof_photos) ? pack.proof_photos : [];
    return raw.map((photo) => {
      const value = typeof photo === "string" ? photo : photo?.url || photo?.photo_url || photo?.src || photo?.data_url;
      return safeImageUrl(value);
    }).filter(Boolean);
  }, [pack.photos, pack.proof_photos]);

  async function copyProofLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setNotice("Proof link copied.");
    } catch {
      setNotice("Copy the current browser address to share this proof pack.");
    }
  }

  if (state.loading) return <main className="cpp-shell"><section className="cpp-card"><p>Loading proof pack…</p></section></main>;
  if (state.error || !state.pack) return <Unavailable message={state.error || "The proof pack was not found or is no longer available."} />;

  const currency = currencyCode(pack);
  const business = pack.business_snapshot || pack.business || {};
  const businessName = business.business_name || pack.business_name || "The business";
  const approvedSummary = pack.customer_summary || pack.public_summary || pack.owner_summary || pack.work_summary || pack.summary || (pack.summary_approved === true ? pack.ai_summary : "") || "The business has marked the work complete and shared this proof for review.";
  const customerMessage = pack.customer_message || pack.public_message || pack.owner_message || "Thanks — the work has been completed. Review the summary and customer-visible proof, then contact the business if anything needs attention.";
  const linkedRecord = pack.invoice_id || pack.invoice_number
    ? "Invoice attached to the business record"
    : pack.quote_id || pack.quote_number
      ? "Quote attached to the business record"
      : "No customer document is attached to this proof pack.";

  return (
    <main className="cpp-shell" data-version="CHURVOX_PUBLIC_PROOF_PACK_PAID_LAUNCH_20260712">
      <section className="cpp-actions-bar">
        <b>{businessName} proof pack</b>
        <button type="button" onClick={() => window.print()}>Print / PDF</button>
        <button type="button" onClick={copyProofLink}>Copy link</button>
        {notice ? <span>{notice}</span> : null}
      </section>

      <section className="cpp-hero">
        <div>
          <p>Customer proof pack</p>
          <h1>{pack.job_title || pack.title || "Completed work"}</h1>
          <span>{pack.customer_name || pack.client_name || "Customer"} · Review the business-approved summary, notes and customer-visible photos.</span>
        </div>
      </section>

      <section className="cpp-grid">
        <article className="cpp-card cpp-summary"><small>Business-approved work summary</small><h2>What was completed</h2><p>{approvedSummary}</p></article>
        <article className="cpp-card"><small>Customer message</small><h2>Message from {businessName}</h2><p>{customerMessage}</p></article>
        <article className="cpp-card"><small>Linked customer document</small><h2>Invoice / quote</h2><p>{linkedRecord}</p>{pack.total ? <strong>{money(pack.total, currency)}</strong> : null}</article>
      </section>

      <section className="cpp-card cpp-photos">
        <small>Customer-visible proof photos</small>
        <h2>{photos.length ? `${photos.length} photo${photos.length === 1 ? "" : "s"}` : "No photos attached"}</h2>
        {photos.length ? <div className="cpp-photo-grid">{photos.map((url, index) => <img key={`${url}-${index}`} src={url} alt={`Work proof ${index + 1}`} loading="lazy" />)}</div> : <p>The business has not attached customer-visible photos to this proof pack.</p>}
      </section>

      <footer className="cpp-footer"><b>Churvox</b><span>Business-approved work summary and proof shared for customer review.</span></footer>
    </main>
  );
}
