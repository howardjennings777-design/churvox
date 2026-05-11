import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./proofToPaidPage.css";

const API_BASE = (() => {
  const raw =
    process.env.REACT_APP_API_URL ||
    process.env.REACT_APP_BACKEND_URL ||
    process.env.VITE_BACKEND_URL ||
    "https://grassley-backend.onrender.com";
  const clean = String(raw).replace(/\/+$/, "");
  return clean.endsWith("/api") ? clean : `${clean}/api`;
})();

function token() {
  try {
    return localStorage.getItem("token") || localStorage.getItem("authToken") || localStorage.getItem("access_token") || "";
  } catch {
    return "";
  }
}

async function api(path, options = {}) {
  const headers = { Accept: "application/json", ...(options.headers || {}) };
  const t = token();
  if (t) headers.Authorization = `Bearer ${t}`;
  if (options.body && !(options.body instanceof FormData)) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_BASE}/${String(path).replace(/^\/+/, "")}`, {
    method: options.method || "GET",
    credentials: "include",
    headers,
    body: options.body && !(options.body instanceof FormData) ? JSON.stringify(options.body) : options.body,
  });

  const text = await res.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!res.ok) throw new Error(payload?.detail || payload?.message || payload?.error || `${path} failed`);
  return payload;
}

function arrayFrom(payload, keys = []) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  for (const key of keys) if (Array.isArray(payload[key])) return payload[key];
  for (const key of ["items", "data", "results"]) if (Array.isArray(payload[key])) return payload[key];
  return Object.values(payload).find(Array.isArray) || [];
}

function idOf(row) {
  return row?.id || row?._id || row?.job_id || row?.invoice_id || "";
}

function statusOf(row) {
  return String(row?.status || row?.job_status || "").toLowerCase();
}

function titleOf(row, fallback) {
  return row?.title || row?.job_title || row?.client_name || row?.customer_name || row?.name || fallback;
}

function moneyValue(row) {
  const value = Number(row?.total || row?.amount || row?.price || row?.job_price || row?.subtotal || 0);
  return Number.isFinite(value) ? value : 0;
}

function money(row) {
  const value = moneyValue(row);
  if (!value) return "$0";
  return new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 }).format(value);
}

function proofText(job) {
  return (
    job.ai_summary ||
    job.completion_summary ||
    job.ai_invoice_description ||
    job.invoice_description_draft ||
    job.worker_completion_notes ||
    job.completion_notes ||
    job.worker_notes ||
    job.notes ||
    "Completed work reviewed and ready for invoice draft."
  );
}

function photos(job) {
  const raw = job.photos || job.job_photos || job.proof_photos || job.completion_photos || [];
  if (!Array.isArray(raw)) return [];
  return raw.map((p) => (typeof p === "string" ? p : p?.url || p?.src || p?.path)).filter(Boolean);
}

function saveFallback(row) {
  try {
    const key = "churvox_proof_to_paid_fallback";
    const existing = JSON.parse(localStorage.getItem(key) || "[]");
    localStorage.setItem(key, JSON.stringify([{ ...row, local_only: true, created_at: new Date().toISOString() }, ...existing].slice(0, 80)));
  } catch {}
}

export default function ProofToPaidPage() {
  const [jobs, setJobs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [selected, setSelected] = useState(null);
  const [draft, setDraft] = useState({});
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setNotice("");
    const calls = await Promise.allSettled([api("/jobs"), api("/invoices")]);
    setJobs(calls[0].status === "fulfilled" ? arrayFrom(calls[0].value, ["jobs"]) : []);
    setInvoices(calls[1].status === "fulfilled" ? arrayFrom(calls[1].value, ["invoices"]) : []);
    if (calls.some((c) => c.status === "rejected")) setNotice("Some data could not load. Showing what Churvox can access.");
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const ready = useMemo(() => {
    const invoicedJobIds = new Set(invoices.map((i) => String(i.job_id || i.source_job_id || i.linked_job_id || "")).filter(Boolean));
    return jobs
      .filter((j) => ["completed", "done", "closed"].includes(statusOf(j)))
      .filter((j) => !invoicedJobIds.has(String(idOf(j))))
      .slice(0, 30);
  }, [jobs, invoices]);

  const stats = {
    ready: ready.length,
    proof: ready.filter((j) => photos(j).length || proofText(j)).length,
    amount: ready.reduce((sum, j) => sum + moneyValue(j), 0),
  };

  function open(job) {
    const amount = moneyValue(job);
    const description = proofText(job);
    setSelected(job);
    setDraft({
      job_id: idOf(job),
      client_id: job.client_id || job.customer_id || "",
      client_name: job.client_name || job.customer_name || "Client",
      customer_email: job.customer_email || job.client_email || "",
      description,
      amount,
    });
    setNotice("");
  }

  function update(field, value) {
    setDraft((d) => ({ ...d, [field]: value }));
  }

  async function createInvoiceDraft() {
    if (!selected || busy) return;
    setBusy(true);
    setNotice("");

    const amount = Number(draft.amount || 0);
    const body = {
      job_id: draft.job_id,
      source_job_id: draft.job_id,
      client_id: draft.client_id,
      customer_id: draft.client_id,
      client_name: draft.client_name,
      customer_name: draft.client_name,
      customer_email: draft.customer_email,
      description: draft.description,
      amount,
      subtotal: amount,
      total: amount,
      status: "draft",
      source: "proof_to_paid_page",
      created_by_ai: true,
    };

    let ok = false;
    let lastError = "";
    for (const path of ["/invoices", "/invoices/create"]) {
      try {
        await api(path, { method: "POST", body });
        ok = true;
        break;
      } catch (e) {
        lastError = e.message;
      }
    }

    if (ok) {
      setNotice("Draft invoice created from completed job proof.");
      setSelected(null);
      await load();
    } else {
      saveFallback({ type: "draft_invoice", payload: body, error: lastError });
      setNotice("Backend did not create the invoice yet. Draft saved locally for owner review.");
    }

    setBusy(false);
  }

  return (
    <main className="proof-page">
      <section className="proof-hero">
        <div>
          <p>PROOF TO PAID</p>
          <h1>Turn completed work into invoice drafts.</h1>
          <span>
            Workers finish the job. Churvox gathers the proof, prepares the invoice wording,
            and gives the owner one clear approval step before billing.
          </span>
        </div>
        <button type="button" onClick={load} disabled={loading}>{loading ? "Refreshing..." : "Refresh completed jobs"}</button>
      </section>

      {notice ? <section className="proof-notice">{notice}</section> : null}

      <section className="proof-stats">
        <article><b>{stats.ready}</b><small>Ready to invoice</small></article>
        <article><b>{stats.proof}</b><small>With notes/proof</small></article>
        <article><b>{new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 }).format(stats.amount)}</b><small>Possible draft value</small></article>
      </section>

      <section className="proof-board">
        <header>
          <div>
            <p>OWNER REVIEW</p>
            <h2>Completed jobs waiting for invoice draft</h2>
          </div>
          <Link to="/invoices">Open invoices</Link>
        </header>

        {!ready.length ? (
          <div className="proof-empty">
            <strong>No completed jobs waiting.</strong>
            <small>When workers complete jobs without invoices, they will appear here.</small>
          </div>
        ) : (
          <div className="proof-list">
            {ready.map((job) => (
              <article className="proof-card" key={idOf(job)}>
                <div>
                  <span>Completed job</span>
                  <strong>{titleOf(job, "Completed job")}</strong>
                  <p>{proofText(job)}</p>
                  <small>{job.client_name || job.customer_name || "Client"} · {job.address || job.site_address || "Address not set"} · {money(job)}</small>
                </div>
                <button type="button" onClick={() => open(job)}>Review invoice draft</button>
              </article>
            ))}
          </div>
        )}
      </section>

      {selected ? (
        <div className="proof-drawer-backdrop" onClick={() => !busy && setSelected(null)}>
          <section className="proof-drawer" onClick={(e) => e.stopPropagation()}>
            <header>
              <div>
                <p>INVOICE DRAFT REVIEW</p>
                <h2>{titleOf(selected, "Completed job")}</h2>
                <span>Nothing is sent to the customer. This creates an editable draft invoice only.</span>
              </div>
              <button type="button" onClick={() => setSelected(null)} disabled={busy}>×</button>
            </header>

            <div className="proof-editor">
              <label>
                Client
                <input value={draft.client_name || ""} onChange={(e) => update("client_name", e.target.value)} />
              </label>
              <label>
                Amount
                <input type="number" min="0" step="0.01" value={draft.amount || ""} onChange={(e) => update("amount", e.target.value)} />
              </label>
              <label>
                Invoice wording
                <textarea value={draft.description || ""} onChange={(e) => update("description", e.target.value)} />
              </label>

              <section className="proof-proof-box">
                <strong>Job proof</strong>
                <p>{proofText(selected)}</p>
                <small>{photos(selected).length} proof photo{photos(selected).length === 1 ? "" : "s"} attached</small>
              </section>

              {photos(selected).length ? (
                <div className="proof-photo-grid">
                  {photos(selected).slice(0, 6).map((src, index) => (
                    <img src={src} alt={`Job proof ${index + 1}`} key={`${src}-${index}`} />
                  ))}
                </div>
              ) : null}
            </div>

            <footer>
              <button type="button" onClick={() => setSelected(null)} disabled={busy}>Cancel</button>
              <Link to={`/jobs/${idOf(selected)}`}>Open job</Link>
              <button className="primary" type="button" onClick={createInvoiceDraft} disabled={busy}>
                {busy ? "Creating..." : "Create draft invoice"}
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </main>
  );
}
