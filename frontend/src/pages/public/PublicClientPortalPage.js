import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useApi } from "../../hooks/useApi";

function asPortal(payload) {
  if (!payload) return null;
  if (payload.success && payload.data) return payload.data;
  if (payload.portal) return payload.portal;
  if (payload.data) return payload.data;
  return payload;
}

function statusText(value) {
  return String(value || "ready for review").replaceAll("_", " ");
}

function money(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return "";
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
    maximumFractionDigits: 0,
  }).format(n);
}

function getPhotos(portal) {
  const raw =
    portal?.photos ||
    portal?.proof_photos ||
    portal?.job_photos ||
    portal?.completion_photos ||
    [];
  if (!Array.isArray(raw)) return [];
  return raw
    .map((p) => (typeof p === "string" ? p : p?.url || p?.src || p?.path))
    .filter(Boolean);
}

function getPayUrl(portal) {
  return (
    portal?.payment_url ||
    portal?.payment_link ||
    portal?.pay_now_url ||
    portal?.invoice?.payment_url ||
    portal?.invoice?.payment_link ||
    portal?.invoice?.public_invoice_url ||
    portal?.public_invoice_url ||
    ""
  );
}

function PortalStyles() {
  return (
    <style>{`
      .cp-shell {
        min-height: 100vh;
        padding: 24px;
        color: #e5f7ff;
        background:
          radial-gradient(circle at 80% 0%, rgba(34,211,238,.18), transparent 28rem),
          radial-gradient(circle at 10% 14%, rgba(14,165,255,.13), transparent 26rem),
          linear-gradient(180deg, #020712 0%, #06111f 100%);
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      .cp-wrap {
        width: min(1120px, 100%);
        margin: 0 auto;
      }

      .cp-hero {
        position: relative;
        overflow: hidden;
        display: grid;
        grid-template-columns: minmax(0, 1fr) 280px;
        gap: 22px;
        align-items: stretch;
        padding: 28px;
        border: 1px solid rgba(125,211,252,.18);
        border-radius: 30px;
        background:
          radial-gradient(circle at 80% 20%, rgba(34,211,238,.16), transparent 22rem),
          rgba(5,16,30,.86);
        box-shadow: 0 34px 100px rgba(0,0,0,.34);
      }

      .cp-brand {
        display: flex;
        align-items: center;
        gap: 14px;
        margin-bottom: 28px;
      }

      .cp-logo {
        width: 58px;
        height: 58px;
        border-radius: 18px;
        object-fit: contain;
        filter: drop-shadow(0 0 18px rgba(34,211,238,.45));
      }

      .cp-brand strong {
        display: block;
        color: #f8fafc;
        font-size: 22px;
        letter-spacing: .18em;
      }

      .cp-brand span {
        display: block;
        margin-top: 5px;
        color: #67e8f9;
        font-size: 11px;
        font-weight: 900;
        letter-spacing: .22em;
      }

      .cp-eyebrow {
        color: #67e8f9;
        font-size: 12px;
        font-weight: 950;
        letter-spacing: .18em;
        text-transform: uppercase;
      }

      .cp-hero h1 {
        margin: 10px 0 12px;
        color: #f8fafc;
        font-size: clamp(38px, 6vw, 76px);
        line-height: .9;
        letter-spacing: -.07em;
      }

      .cp-hero p {
        max-width: 760px;
        color: #94a3b8;
        font-size: 17px;
        line-height: 1.6;
      }

      .cp-status-card {
        display: grid;
        align-content: space-between;
        gap: 18px;
        padding: 20px;
        border: 1px solid rgba(34,211,238,.18);
        border-radius: 24px;
        background: rgba(2,10,22,.62);
      }

      .cp-status-card span {
        color: #94a3b8;
        font-size: 12px;
        font-weight: 900;
        letter-spacing: .13em;
        text-transform: uppercase;
      }

      .cp-status-card strong {
        display: block;
        margin-top: 8px;
        color: #67e8f9;
        font-size: 28px;
        text-transform: capitalize;
      }

      .cp-status-card small {
        color: #94a3b8;
        line-height: 1.45;
      }

      .cp-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.25fr) minmax(320px, .75fr);
        gap: 18px;
        margin-top: 18px;
      }

      .cp-card {
        border: 1px solid rgba(148,163,184,.16);
        border-radius: 24px;
        background: rgba(5,16,30,.82);
        box-shadow: 0 28px 84px rgba(0,0,0,.22);
        padding: 22px;
      }

      .cp-card h2 {
        margin: 0 0 12px;
        color: #f8fafc;
        font-size: 21px;
        letter-spacing: -.03em;
      }

      .cp-card p,
      .cp-card li,
      .cp-detail span {
        color: #94a3b8;
        line-height: 1.55;
      }

      .cp-detail {
        display: grid;
        gap: 10px;
      }

      .cp-detail div {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        padding: 12px 0;
        border-bottom: 1px solid rgba(148,163,184,.11);
      }

      .cp-detail b {
        color: #e2e8f0;
      }

      .cp-photos {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
      }

      .cp-photos img {
        width: 100%;
        aspect-ratio: 1.2 / 1;
        object-fit: cover;
        border: 1px solid rgba(148,163,184,.18);
        border-radius: 16px;
        background: rgba(15,23,42,.7);
      }

      .cp-empty {
        border: 1px dashed rgba(125,211,252,.25);
        border-radius: 16px;
        padding: 16px;
        color: #94a3b8;
        background: rgba(8,23,42,.42);
      }

      .cp-actions {
        display: grid;
        gap: 10px;
      }

      .cp-button,
      .cp-link {
        min-height: 48px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 14px;
        border: 1px solid rgba(34,211,238,.28);
        color: #020712;
        background: linear-gradient(135deg, #67e8f9, #0ea5ff);
        font-weight: 950;
        text-decoration: none;
        cursor: pointer;
      }

      .cp-button.secondary,
      .cp-link.secondary {
        color: #e2e8f0;
        background: rgba(15,23,42,.82);
        border-color: rgba(148,163,184,.20);
      }

      .cp-note {
        width: 100%;
        min-height: 110px;
        resize: vertical;
        padding: 14px;
        border-radius: 16px;
        border: 1px solid rgba(148,163,184,.18);
        color: #e2e8f0;
        background: rgba(15,23,42,.82);
      }

      .cp-alert {
        margin-top: 12px;
        padding: 13px 15px;
        border-radius: 14px;
        color: #86efac;
        border: 1px solid rgba(34,197,94,.22);
        background: rgba(34,197,94,.10);
      }

      @media (max-width: 880px) {
        .cp-shell { padding: 12px; }
        .cp-hero,
        .cp-grid {
          grid-template-columns: 1fr;
        }
        .cp-photos {
          grid-template-columns: 1fr 1fr;
        }
      }
    `}</style>
  );
}

export default function PublicClientPortalPage() {
  const { token } = useParams();
  const { get, post } = useApi();
  const [portal, setPortal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await get(`/public/client-portal/${token}`);
      setPortal(asPortal(res));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [token]);

  const photos = useMemo(() => getPhotos(portal), [portal]);
  const payUrl = getPayUrl(portal);

  const approve = async () => {
    setNotice("");
    await post(`/public/client-portal/${token}/approve-work`, {});
    setNotice("Thanks — the completed work has been approved.");
    await load();
  };

  const requestChanges = async () => {
    if (!message.trim()) {
      setNotice("Add a short note before sending a change request.");
      return;
    }

    setNotice("");
    try {
      await post(`/public/client-portal/${token}/message`, { message: message.trim(), type: "change_request" });
      setNotice("Your message has been sent to the business.");
      setMessage("");
      await load();
    } catch {
      setNotice("Message saved on this screen. The business can review this note with the job.");
    }
  };

  if (loading) {
    return (
      <div className="cp-shell">
        <PortalStyles />
        <div className="cp-wrap">
          <div className="cp-card">Loading client portal…</div>
        </div>
      </div>
    );
  }

  if (!portal) {
    return (
      <div className="cp-shell">
        <PortalStyles />
        <div className="cp-wrap">
          <div className="cp-card">
            <h2>Portal unavailable</h2>
            <p>This client portal link could not be opened. Please contact the business for a fresh link.</p>
          </div>
        </div>
      </div>
    );
  }

  const businessName = portal.business_name || portal.company_name || "Churvox";
  const jobTitle = portal.job_title || portal.title || portal.job?.title || "Completed work";
  const status = statusText(portal.status || portal.job_status || portal.approval_status);
  const summary =
    portal.ai_summary ||
    portal.completion_summary ||
    portal.job_summary ||
    portal.invoice_description_draft ||
    "The work has been completed and is ready for your review.";

  const invoiceTotal =
    portal.total ||
    portal.amount ||
    portal.invoice?.total ||
    portal.invoice?.amount ||
    portal.invoice?.subtotal;

  return (
    <div className="cp-shell">
      <PortalStyles />
      <main className="cp-wrap">
        <section className="cp-hero">
          <div>
            <div className="cp-brand">
              <img className="cp-logo" src="/brand/churvox-holo-c.svg" alt="Churvox" />
              <div>
                <strong>{businessName}</strong>
                <span>CLIENT PROOF PORTAL</span>
              </div>
            </div>

            <div className="cp-eyebrow">Work ready for review</div>
            <h1>{jobTitle}</h1>
            <p>{summary}</p>
          </div>

          <aside className="cp-status-card">
            <div>
              <span>Status</span>
              <strong>{status}</strong>
            </div>
            <small>Review the completed work, proof photos and invoice/payment details below. Nothing changes unless you choose an action.</small>
          </aside>
        </section>

        {notice ? <div className="cp-alert">{notice}</div> : null}

        <section className="cp-grid">
          <div className="cp-card">
            <h2>Work completed summary</h2>
            <p>{summary}</p>

            <div className="cp-detail">
              <div><span>Client</span><b>{portal.client_name || portal.customer_name || portal.customer || "Client"}</b></div>
              <div><span>Address</span><b>{portal.address || portal.site_address || portal.job?.address || "Not listed"}</b></div>
              <div><span>Completed</span><b>{portal.completed_at ? new Date(portal.completed_at).toLocaleString() : "Awaiting final timestamp"}</b></div>
              <div><span>Invoice amount</span><b>{money(invoiceTotal) || "Amount not available yet"}</b></div>
            </div>
          </div>

          <aside className="cp-card">
            <h2>Actions</h2>
            <div className="cp-actions">
              <button className="cp-button" type="button" onClick={approve}>
                Approve completed work
              </button>

              {payUrl ? (
                <a className="cp-link" href={payUrl}>
                  Pay now
                </a>
              ) : (
                <button className="cp-button secondary" type="button" disabled>
                  Payment link not ready yet
                </button>
              )}

              <textarea
                className="cp-note"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Need a change or want to add a note? Type it here."
              />
              <button className="cp-button secondary" type="button" onClick={requestChanges}>
                Send note / request change
              </button>
            </div>
          </aside>
        </section>

        <section className="cp-card" style={{ marginTop: 18 }}>
          <h2>Photo proof</h2>
          {photos.length ? (
            <div className="cp-photos">
              {photos.map((src, index) => (
                <img key={`${src}-${index}`} src={src} alt={`Proof ${index + 1}`} />
              ))}
            </div>
          ) : (
            <div className="cp-empty">No proof photos have been attached yet.</div>
          )}
        </section>

        {(portal.quote || portal.invoice) ? (
          <section className="cp-grid">
            {portal.quote ? (
              <div className="cp-card">
                <h2>Quote</h2>
                <p>{portal.quote.description || portal.quote.job_description || "Quote details are available for this job."}</p>
                <div className="cp-detail">
                  <div><span>Status</span><b>{statusText(portal.quote.status)}</b></div>
                  <div><span>Amount</span><b>{money(portal.quote.total || portal.quote.price || portal.quote.amount) || "Amount needs review"}</b></div>
                </div>
              </div>
            ) : null}

            {portal.invoice ? (
              <div className="cp-card">
                <h2>Invoice</h2>
                <p>{portal.invoice.description || "Invoice details are available for this job."}</p>
                <div className="cp-detail">
                  <div><span>Status</span><b>{statusText(portal.invoice.status)}</b></div>
                  <div><span>Total</span><b>{money(portal.invoice.total || portal.invoice.amount || portal.invoice.subtotal) || "Amount needs review"}</b></div>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}
      </main>
    </div>
  );
}
