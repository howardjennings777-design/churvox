import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import API_BASE from "../../lib/apiBase";
import "./PublicDocumentTemplate.css";

function hasValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function first(...values) {
  return values.find((value) => hasValue(value)) ?? "";
}

function niceDate(value) {
  if (!value) return "Not set";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleDateString("en-NZ");
}

function statusLabel(value) {
  const raw = String(value || "waiting").replace(/_/g, " ").trim();
  return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : "Waiting";
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
    <main className="cpd-shell">
      <article className="cpd-document">
        <section className="cpd-body">
          <small>Churvox client portal</small>
          <h1>Client portal unavailable</h1>
          <p>{message}</p>
          <p>Ask the business to resend the portal link, or <a href="mailto:hello@churvox.com?subject=Churvox%20client%20portal" style={{ display: "inline-flex", alignItems: "center", minHeight: 28, padding: "2px 4px" }}>contact Churvox support</a>.</p>
        </section>
      </article>
    </main>
  );
}

export default function PublicClientPortalPage() {
  const { token } = useParams();
  const [portal, setPortal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const loadPortal = useCallback(async () => {
    setLoading(true);
    setError("");
    if (!token) {
      setError("This client portal link is missing its secure token.");
      setLoading(false);
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/api/public/client-portal/${encodeURIComponent(token)}`, { headers: { Accept: "application/json" } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.success === false) throw new Error(data?.detail || data?.message || data?.error || "Unable to load client portal");
      const record = data?.portal || data?.data?.portal || data?.data || data;
      if (!record || typeof record !== "object") throw new Error("The client portal record was not returned.");
      setPortal(record);
    } catch (requestError) {
      const message = requestError?.message || "Unable to load client portal";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadPortal(); }, [loadPortal]);

  const approvalStatus = String(portal?.approval_status || portal?.customer_approval_status || portal?.status || "").trim().toLowerCase();
  const approved = approvalStatus.includes("approved") || approvalStatus === "accepted";
  const completed = ["completed", "complete", "ready_for_approval", "awaiting_customer_approval", "approved", "accepted"].includes(String(portal?.work_status || portal?.job_status || portal?.status || "").trim().toLowerCase());

  const approve = async () => {
    if (saving || approved || !completed || !token) return;
    setSaving(true);
    setNotice("");
    try {
      const response = await fetch(`${API_BASE}/api/public/client-portal/${encodeURIComponent(token)}/approve-work`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ approved: true, confirmation: "customer_approved_completed_work" }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.success === false) throw new Error(data?.detail || data?.message || data?.error || "Could not approve completed work");
      setNotice("Completed work approved. The business has been notified.");
      toast.success("Completed work approved");
      await loadPortal();
    } catch (requestError) {
      const message = requestError?.message || "Could not approve completed work";
      setNotice(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setNotice("Portal link copied.");
    } catch {
      setNotice("Copy the current browser address to share this portal.");
    }
  }

  const photos = useMemo(() => {
    const raw = portal?.photos || portal?.proof_photos || portal?.images || [];
    return (Array.isArray(raw) ? raw : []).map((photo) => {
      const value = typeof photo === "string" ? photo : photo?.url || photo?.src || photo?.data_url || photo?.photo_url;
      return safeImageUrl(value);
    }).filter(Boolean);
  }, [portal]);

  if (loading) return <main className="cpd-shell"><article className="cpd-document"><section className="cpd-body">Loading client portal…</section></article></main>;
  if (error || !portal) return <Unavailable message={error || "The client portal was not found or is no longer available."} />;

  const customer = first(portal.customer_name, portal.client_name, portal.name, "Customer");
  const business = portal.business_snapshot || portal.business || {};
  const businessName = first(business.business_name, portal.business_name, "The business");
  const workStatus = portal.work_status || portal.job_status || portal.status || "waiting";
  const status = approved ? "Approved" : statusLabel(workStatus);
  const approvedSummary = first(
    portal.customer_summary,
    portal.public_summary,
    portal.owner_summary,
    portal.work_summary,
    portal.summary,
    portal.description,
    portal.summary_approved === true ? portal.ai_summary : "",
    "The completed work summary will appear here when the business shares it."
  );
  const jobTitle = first(portal.job_title, portal.title, portal.service_title, "Completed work");
  const address = first(portal.address, portal.service_address, portal.site_address, "Service address saved by the business.");
  const completedAt = first(portal.completed_at, portal.completed_date, portal.updated_at, portal.created_at);
  const canApprove = completed && !approved;

  return (
    <main className="cpd-shell" data-version="CHURVOX_PUBLIC_CLIENT_PORTAL_PAID_LAUNCH_20260712">
      <section className="cpd-actions">
        <b>{businessName} client portal</b>
        <button type="button" onClick={() => window.print()}>Print / PDF</button>
        <button type="button" onClick={copyLink}>Copy link</button>
        {canApprove ? <button type="button" disabled={saving} onClick={approve}>{saving ? "Approving…" : "Approve completed work"}</button> : null}
        {approved ? <span>Approved</span> : null}
        {notice ? <span>{notice}</span> : null}
      </section>

      <article className="cpd-document">
        <header className="cpd-head">
          <div>
            {business.logo_base64 ? <img src={business.logo_base64} alt="Business logo" style={{ maxWidth: 150, maxHeight: 70, objectFit: "contain", marginBottom: 12 }} /> : null}
            <small>Client portal</small>
            <h1>{jobTitle}</h1>
            <p>{customer}</p>
          </div>
        </header>

        <section className="cpd-body">
          <div className="cpd-grid">
            <div className="cpd-card">
              <small>Status</small>
              <h2>{status}</h2>
              <p>{completedAt ? `Updated ${niceDate(completedAt)}` : "Waiting for a business update."}</p>
            </div>
            <div className="cpd-card">
              <small>Site</small>
              <h2>{customer}</h2>
              <p>{address}</p>
            </div>
          </div>

          <div className="cpd-card" style={{ marginBottom: 18 }}>
            <small>Business-approved work summary</small>
            <h2>What was done</h2>
            <p>{approvedSummary}</p>
          </div>

          <div className="cpd-card" style={{ marginBottom: 18 }}>
            <small>Photo proof</small>
            <h2>{photos.length ? `${photos.length} photo${photos.length === 1 ? "" : "s"} attached` : "No photos attached"}</h2>
            {photos.length ? <div className="cpd-photo-grid">{photos.map((src, index) => <img key={`${src}-${index}`} src={src} alt={`Work proof ${index + 1}`} loading="lazy" />)}</div> : <p>The business has not attached customer-visible photos to this portal.</p>}
          </div>

          <div className="cpd-total-card">
            <small>Customer approval</small>
            <h2>{approved ? "Approved" : completed ? "Ready for your review" : "Not ready for approval"}</h2>
            <p>{approved ? "Your approval has been recorded. Contact the business directly if anything needs to be corrected." : completed ? "Approve only when the work summary and customer-visible proof look right. This does not charge you or automatically send an invoice." : "The business has not marked this work ready for approval yet."}</p>
            {canApprove ? <button className="cpd-primary-action" type="button" disabled={saving} onClick={approve}>{saving ? "Approving…" : "Approve completed work"}</button> : null}
          </div>
        </section>

        <footer className="cpd-footer"><b>Churvox</b><span>Business-approved summary and proof shared for customer review.</span></footer>
      </article>
    </main>
  );
}
