// CHURVOX_PUBLIC_PROOF_PACK_PAGE_20260528
// CHURVOX_PUBLIC_PROOF_PACK_ACTIONS_20260528
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import "./PublicProofPackPage.css";

const API_BASE = process.env.REACT_APP_BACKEND_URL || process.env.VITE_BACKEND_URL || "https://grassley-backend.onrender.com";
const cleanBase = (base) => String(base || "").replace(/\/+$/, "");

function money(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return "";
  return `$${n.toLocaleString("en-NZ", { maximumFractionDigits: 2 })}`;
}

export default function PublicProofPackPage() {
  const { token } = useParams();
  const [state, setState] = useState({ loading: true, error: "", pack: null });
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await fetch(`${cleanBase(API_BASE)}/api/public/proof/${encodeURIComponent(token || "")}`, { credentials: "include" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data?.success === false) throw new Error(data?.detail || data?.message || "Proof pack not found");
        if (alive) setState({ loading: false, error: "", pack: data.proof_pack || data.pack || data.item || data });
      } catch (err) {
        if (alive) setState({ loading: false, error: err?.message || "Could not load proof pack", pack: null });
      }
    }
    load();
    return () => { alive = false; };
  }, [token]);

  const pack = state.pack || {};
  const photos = useMemo(() => {
    const raw = Array.isArray(pack.photos) ? pack.photos : [];
    return raw.map((p) => typeof p === "string" ? { url: p } : (p || {})).filter((p) => p.url || p.photo_url || p.src);
  }, [pack.photos]);

  async function copyProofLink() {
    const href = window.location.href;
    try {
      await navigator.clipboard.writeText(href);
      setNotice("Proof link copied.");
    } catch {
      setNotice(href);
    }
  }

  if (state.loading) return <main className="cpp-shell"><section className="cpp-card"><p>Loading proof pack...</p></section></main>;
  if (state.error) return <main className="cpp-shell"><section className="cpp-card"><h1>Proof pack unavailable</h1><p>{state.error}</p></section></main>;

  return (
    <main className="cpp-shell" data-version="CHURVOX_PUBLIC_PROOF_PACK_PAGE_20260528 CHURVOX_PUBLIC_PROOF_PACK_ACTIONS_20260528">
      <section className="cpp-actions-bar">
        <b>Customer proof pack</b>
        <button type="button" onClick={() => window.print()}>Print / PDF</button>
        <button type="button" onClick={copyProofLink}>Copy link</button>
        {notice ? <span>{notice}</span> : null}
      </section>
      <section className="cpp-hero">
        <div><p>CHURVOX CUSTOMER PROOF PACK</p><h1>{pack.job_title || pack.title || "Completed work"}</h1><span>{pack.customer_name || "Customer"} · Review completed work, notes, photos and invoice details.</span></div>
        
      </section>
      <section className="cpp-grid">
        <article className="cpp-card cpp-summary"><small>Work summary</small><h2>What was completed</h2><p>{pack.ai_summary || pack.owner_message || "The work has been completed and prepared for customer review."}</p></article>
        <article className="cpp-card"><small>Customer message</small><h2>Message</h2><p>{pack.owner_message || "Thanks — the job has been completed. Please review the proof and contact us if anything needs attention."}</p></article>
        <article className="cpp-card"><small>Linked records</small><h2>Invoice / quote</h2><p>{pack.invoice_id ? `Invoice linked: ${pack.invoice_id}` : pack.quote_id ? `Quote linked: ${pack.quote_id}` : "No invoice or quote linked yet."}</p>{pack.total ? <strong>{money(pack.total)}</strong> : null}</article>
      </section>
      <section className="cpp-card cpp-photos"><small>Optional proof photos</small><h2>Photos</h2>{photos.length ? <div className="cpp-photo-grid">{photos.map((photo, index) => { const url = photo.url || photo.photo_url || photo.src; return <img key={`${url}-${index}`} src={url} alt={`Proof ${index + 1}`} />; })}</div> : <p>No photos were attached to this proof pack.</p>}</section>
      <footer className="cpp-footer"><b>Churvox</b><span>Work completed. Admin prepared. Owner approved.</span></footer>
    </main>
  );
}
