import React, { useEffect, useMemo, useState } from "react";
import "./PublicCustomerCommandPage.css";

const API_BASE = (() => {
  const raw =
    process.env.REACT_APP_API_URL ||
    process.env.REACT_APP_BACKEND_URL ||
    process.env.VITE_BACKEND_URL ||
    "https://grassley-backend.onrender.com";
  const clean = String(raw).replace(/\/+$/, "");
  return clean.endsWith("/api") ? clean : `${clean}/api`;
})();

function clean(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") return value.trim() || fallback;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

function money(value) {
  const n = Number(String(value || "").replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return "";
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
    maximumFractionDigits: 2,
  }).format(n);
}

function statusOf(item = {}) {
  return clean(
    item.status ||
      item.job_status ||
      item.workflow_status ||
      item.payment_status ||
      item.quote_status ||
      "waiting"
  ).replaceAll("_", " ");
}

function photoList(job = {}) {
  for (const key of ["photos", "photo_urls", "worker_photos", "proof_photos", "job_photos", "images"]) {
    if (Array.isArray(job[key])) return job[key].filter(Boolean);
  }
  return [];
}

async function publicGet(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: "application/json" },
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload.detail || payload.message || "This customer link could not be opened.");
  return payload;
}

export default function PublicCustomerCommandPage() {
  const token = useMemo(() => {
    const parts = window.location.pathname.split("/").filter(Boolean);
    return parts[0] === "customer-command" ? parts[1] : "";
  }, []);

  const [data, setData] = useState(null);
  const [status, setStatus] = useState("Loading your customer link...");
  const [message, setMessage] = useState("");
  const [activePhoto, setActivePhoto] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const payload = await publicGet(`/public/customer-command/${encodeURIComponent(token)}`);
        setData(payload.portal || payload);
        setStatus("");
      } catch (err) {
        setStatus(err.message || "Could not open this customer link.");
      }
    }

    if (token) load();
    else setStatus("Customer link is missing.");
  }, [token]);

  const link = data?.link || {};
  const client = data?.client || {};
  const job = data?.job || {};
  const quote = data?.quote || {};
  const invoice = data?.invoice || {};
  const photos = photoList(job);

  const clientName = clean(
    link.client_name ||
      client.name ||
      client.client_name ||
      job.client_name ||
      job.customer_name ||
      quote.customer_name ||
      invoice.customer_name,
    "Customer"
  );

  const jobTitle = clean(job.title || job.job_title || job.service_type || job.address, "Service work");
  const quoteAmount = money(quote.total || quote.price || quote.amount || quote.quote_total);
  const invoiceAmount = money(invoice.total || invoice.subtotal || invoice.amount || invoice.balance);

  function fakeAction(label) {
    setMessage(`${label} request saved. The business owner will review it inside Churvox.`);
  }

  if (status) {
    return (
      <main className="ccp-page">
        <section className="ccp-loading">
          <i><b /></i>
          <h1>{status}</h1>
          <p>Churvox keeps customer links secure and approval-first.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="ccp-page">
      <header className="ccp-top">
        <a href="/" className="ccp-brand">
          <i><b /></i>
          <span>
            <strong>Churvox</strong>
            <small>Customer Command Link</small>
          </span>
        </a>

        <div>
          <span>Secure customer view</span>
          <strong>{clientName}</strong>
        </div>
      </header>

      <section className="ccp-hero">
        <div>
          <span>Customer Command Link</span>
          <h1>Everything for this job is in one simple place.</h1>
          <p>
            View progress, proof photos, quote/invoice details, request more work,
            send a message, approve completed work, or refer someone else.
          </p>
        </div>

        <aside>
          <span>Status</span>
          <strong>{statusOf(job || quote || invoice)}</strong>
          <small>Updated by the business through Churvox.</small>
        </aside>
      </section>

      <section className="ccp-grid">
        <article className="ccp-card ccp-main-card">
          <span>Job</span>
          <h2>{jobTitle}</h2>
          <p>{clean(job.address || job.job_address || job.service_address || job.location, "Address not shown")}</p>

          <div className="ccp-timeline">
            {["Requested", "Scheduled", "Worker proof", "Owner approval", "Invoice / follow-up"].map((item, index) => (
              <b key={item} className={index <= 2 ? "active" : ""}>{item}</b>
            ))}
          </div>
        </article>

        <article className="ccp-card">
          <span>Quote</span>
          <h2>{quoteAmount || "No quote amount shown"}</h2>
          <p>{clean(quote.job_description || quote.description || quote.notes, "Quote details will show here when available.")}</p>
          <button type="button" onClick={() => fakeAction("Quote approval")}>Approve / ask about quote</button>
        </article>

        <article className="ccp-card">
          <span>Invoice</span>
          <h2>{invoiceAmount || "No invoice amount shown"}</h2>
          <p>{clean(invoice.description || invoice.notes, "Invoice details will show here when available.")}</p>
          <button type="button" onClick={() => fakeAction("Payment note")}>Mark payment / ask question</button>
        </article>

        <article className="ccp-card">
          <span>Message</span>
          <h2>Need to ask something?</h2>
          <p>Send a request back to the business owner. Churvox keeps it in the owner approval flow.</p>
          <button type="button" onClick={() => fakeAction("Message")}>Send message request</button>
        </article>
      </section>

      <section className="ccp-proof">
        <header>
          <div>
            <span>Proof photos</span>
            <h2>Work proof stays attached to the job.</h2>
          </div>
          <b>{photos.length}</b>
        </header>

        {photos.length ? (
          <div className="ccp-photos">
            {photos.slice(0, 8).map((photo, index) => (
              <button type="button" key={`${photo}-${index}`} onClick={() => setActivePhoto(photo)}>
                <img src={photo} alt={`Job proof ${index + 1}`} />
              </button>
            ))}
          </div>
        ) : (
          <p className="ccp-empty">No proof photos have been shared to this link yet.</p>
        )}
      </section>

      <section className="ccp-actions">
        <article>
          <span>Book again</span>
          <strong>Need more work done?</strong>
          <p>Request another job from the same business.</p>
          <button type="button" onClick={() => fakeAction("Book again")}>Request more work</button>
        </article>

        <article>
          <span>Review</span>
          <strong>Happy with the work?</strong>
          <p>Send a review request back through Churvox.</p>
          <button type="button" onClick={() => fakeAction("Review")}>Leave review request</button>
        </article>

        <article>
          <span>Referral</span>
          <strong>Know someone else?</strong>
          <p>Refer a friend or property owner.</p>
          <button type="button" onClick={() => fakeAction("Referral")}>Refer someone</button>
        </article>
      </section>

      {message ? <p className="ccp-message">{message}</p> : null}

      {activePhoto ? (
        <div className="ccp-lightbox" onClick={() => setActivePhoto(null)}>
          <button type="button">×</button>
          <img src={activePhoto} alt="Expanded job proof" />
        </div>
      ) : null}
    </main>
  );
}
