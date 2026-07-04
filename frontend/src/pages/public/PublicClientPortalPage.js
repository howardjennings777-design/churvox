// CHURVOX_PUBLIC_CLIENT_PORTAL_POLISH_20260611
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
// removed broken css import

const API_BASE = (process.env.REACT_APP_BACKEND_URL || process.env.VITE_BACKEND_URL || "").replace(/\/$/, "");

function first(...values) {
  return values.find((value) => String(value ?? "").trim()) || "";
}

function niceDate(value) {
  if (!value) return "Not set";
  try {
    return new Date(value).toLocaleDateString("en-NZ");
  } catch {
    return String(value);
  }
}

function statusLabel(value) {
  const raw = String(value || "waiting").replace(/_/g, " ");
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export default function PublicClientPortalPage() {
  const { token } = useParams();
  const [portal, setPortal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const loadPortal = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/public/client-portal/${token}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || data?.error || "Unable to load client portal");
      setPortal(data?.portal || data?.data || data);
    } catch (err) {
      toast.error(err?.message || "Unable to load client portal");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortal();
  }, [token]);

  const approve = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/public/client-portal/${token}/approve-work`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        throw new Error(data?.detail || data?.error || "Could not approve completed work");
      }
      toast.success("Completed work approved");
      setNotice("Completed work approved.");
      await loadPortal();
    } catch (err) {
      toast.error(err?.message || "Could not approve completed work");
    } finally {
      setSaving(false);
    }
  };

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setNotice("Portal link copied.");
    } catch {
      setNotice(window.location.href);
    }
  }

  const photos = useMemo(() => {
    const raw = portal?.photos || portal?.proof_photos || portal?.images || [];
    return Array.isArray(raw) ? raw : [];
  }, [portal]);

  if (loading) {
    return <div className="cpd-shell"><div className="cpd-document"><div className="cpd-body">Loading client portal...</div></div></div>;
  }

  if (!portal) {
    return <div className="cpd-shell"><div className="cpd-document"><div className="cpd-body">Client portal not found.</div></div></div>;
  }

  const customer = first(portal.customer_name, portal.client_name, portal.name, "Customer");
  const business = portal.business_snapshot || portal.business || {};
  const businessName = first(business.business_name, portal.business_name, "Churvox");
  const status = statusLabel(portal.status || portal.work_status || portal.approval_status);
  const summary = first(
    portal.ai_summary,
    portal.summary,
    portal.work_summary,
    portal.description,
    "The completed work summary will appear here when the business shares it."
  );
  const jobTitle = first(portal.job_title, portal.title, portal.service_title, "Completed work");
  const address = first(portal.address, portal.service_address, portal.site_address, "Service address saved by the business.");
  const completedAt = first(portal.completed_at, portal.completed_date, portal.updated_at, portal.created_at);

  return (
    <main className="cpd-shell" data-version="CHURVOX_PUBLIC_CLIENT_PORTAL_POLISH_20260611">
      <section className="cpd-actions">
        <b>{businessName} client portal</b>
        <button type="button" onClick={() => window.print()}>Print / PDF</button>
        <button type="button" onClick={copyLink}>Copy link</button>
        <button type="button" disabled={saving || String(portal.status || "").toLowerCase().includes("approved")} onClick={approve}>
          {saving ? "Approving..." : "Approve completed work"}
        </button>
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
              <p>{completedAt ? `Updated ${niceDate(completedAt)}` : "Waiting for business update."}</p>
            </div>
            <div className="cpd-card">
              <small>Site</small>
              <h2>{customer}</h2>
              <p>{address}</p>
            </div>
          </div>

          <div className="cpd-card" style={{ marginBottom: 18 }}>
            <small>Work completed summary</small>
            <h2>What was done</h2>
            <p>{summary}</p>
          </div>

          <div className="cpd-card" style={{ marginBottom: 18 }}>
            <small>Photo proof</small>
            <h2>{photos.length ? `${photos.length} photo${photos.length === 1 ? "" : "s"} attached` : "No photos attached yet"}</h2>
            {photos.length ? (
              <div className="cpd-photo-grid">
                {photos.map((photo, index) => {
                  const src = typeof photo === "string" ? photo : photo?.url || photo?.src || photo?.data_url || "";
                  return src ? <img key={`${src}-${index}`} src={src} alt={`Proof ${index + 1}`} /> : null;
                })}
              </div>
            ) : (
              <p>Photos will appear here when the worker or business adds them.</p>
            )}
          </div>

          <div className="cpd-total-card">
            <small>Approval</small>
            <h2>{status}</h2>
            <p>Approve completed work when the summary and proof look right. The business stays in control of invoices and follow-up.</p>
            <button className="cpd-primary-action" type="button" disabled={saving || String(portal.status || "").toLowerCase().includes("approved")} onClick={approve}>
              {saving ? "Approving..." : "Approve completed work"}
            </button>
          </div>
        </section>

        <footer className="cpd-footer"><b>Churvox</b><span>Work completed. Proof shared. Customer approves.</span></footer>
      </article>
    </main>
  );
}
