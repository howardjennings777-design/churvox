import churvoxLogoIcon from "../assets/churvox-logo-icon.svg";
import React, { useCallback, useEffect, useMemo, useState } from "react";

const API_ROOT = (() => {
  const raw =
    process.env.REACT_APP_BACKEND_URL ||
    process.env.REACT_APP_API_URL ||
    process.env.VITE_BACKEND_URL ||
    "";

  const clean = String(raw).replace(/\/+$/, "");
  if (!clean) return "/api";
  return clean.endsWith("/api") ? clean : `${clean}/api`;
})();

const emptyState = {
  jobs: [],
  quotes: [],
  invoices: [],
  workers: [],
  approvals: [],
};

const cardStyle = {
  background: "#ffffff",
  border: "1px solid #dbeafe",
  borderRadius: 24,
  boxShadow: "0 20px 60px rgba(15, 23, 42, 0.08)",
};

const buttonStyle = {
  border: 0,
  borderRadius: 999,
  background: "#2563eb",
  color: "#ffffff",
  fontWeight: 800,
  padding: "12px 18px",
  cursor: "pointer",
};

function safeArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.results)) return value.results;
  return [];
}

function readToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("auth_token") ||
    localStorage.getItem("access_token") ||
    ""
  );
}

function niceStatus(value) {
  return String(value || "open")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function money(value) {
  const number = Number(value || 0);
  return number.toLocaleString("en-NZ", {
    style: "currency",
    currency: "NZD",
    maximumFractionDigits: 0,
  });
}

function SmartHubBrainPage() {
  const [data, setData] = useState(emptyState);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const apiFetch = useCallback(async (path, options = {}) => {
    const token = readToken();
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    };

    const response = await fetch(`${API_ROOT}${path}`, {
      credentials: "include",
      ...options,
      headers,
    });

    const text = await response.text();
    let payload = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch (parseError) {
      payload = text;
    }

    if (!response.ok) {
      const detail = payload?.detail || payload?.message || payload?.error || response.statusText;
      throw new Error(detail || "Request failed");
    }

    return payload;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [jobs, quotes, invoices, workers, approvals] = await Promise.all([
        apiFetch("/jobs").catch(() => []),
        apiFetch("/quotes").catch(() => []),
        apiFetch("/invoices").catch(() => []),
        apiFetch("/team/workers").catch(() => []),
        apiFetch("/ai/operator/approvals").catch(() => []),
      ]);

      setData({
        jobs: safeArray(jobs),
        quotes: safeArray(quotes),
        invoices: safeArray(invoices),
        workers: safeArray(workers),
        approvals: safeArray(approvals),
      });
    } catch (loadError) {
      setError(loadError.message || "Smart Hub could not load right now.");
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const openJobs = data.jobs.filter((job) => !["completed", "cancelled", "done"].includes(String(job.status || "").toLowerCase()));
    const unassignedJobs = data.jobs.filter((job) => !job.assigned_worker_id && !job.assigned_worker && !job.worker_id);
    const overdueInvoices = data.invoices.filter((invoice) => {
      const status = String(invoice.status || "").toLowerCase();
      return status !== "paid" && status !== "void" && (invoice.due_date || invoice.dueDate);
    });
    const draftQuotes = data.quotes.filter((quote) => ["draft", "sent", "pending"].includes(String(quote.status || "").toLowerCase()));

    return {
      openJobs: openJobs.length,
      unassignedJobs: unassignedJobs.length,
      overdueInvoices: overdueInvoices.length,
      draftQuotes: draftQuotes.length,
      workersAvailable: data.workers.filter((worker) => String(worker.status || "active").toLowerCase() !== "inactive").length,
      approvals: data.approvals.length,
      invoiceValue: data.invoices.reduce((total, invoice) => total + Number(invoice.total || invoice.amount || invoice.balance || 0), 0),
    };
  }, [data]);

  const priorityItems = useMemo(() => {
    const items = [];

    data.jobs
      .filter((job) => !job.assigned_worker_id && !job.assigned_worker && !job.worker_id)
      .slice(0, 4)
      .forEach((job) => {
        items.push({
          type: "Dispatch",
          title: job.title || job.service || "Unassigned job",
          detail: job.address || job.client_name || "Needs a worker recommendation",
          status: niceStatus(job.status),
        });
      });

    data.invoices
      .filter((invoice) => String(invoice.status || "").toLowerCase() !== "paid")
      .slice(0, 4)
      .forEach((invoice) => {
        items.push({
          type: "Invoice",
          title: invoice.client_name || invoice.customer_name || "Invoice follow-up",
          detail: money(invoice.total || invoice.amount || invoice.balance),
          status: niceStatus(invoice.status),
        });
      });

    data.quotes
      .filter((quote) => ["draft", "sent", "pending"].includes(String(quote.status || "").toLowerCase()))
      .slice(0, 4)
      .forEach((quote) => {
        items.push({
          type: "Quote",
          title: quote.client_name || quote.customer_name || "Quote follow-up",
          detail: quote.description || quote.title || "Ready for owner review",
          status: niceStatus(quote.status),
        });
      });

    return items.slice(0, 8);
  }, [data]);

  const runOperatorAction = async (label, path) => {
    setWorking(label);
    setMessage("");
    setError("");

    try {
      await apiFetch(path, { method: "POST", body: JSON.stringify({ source: "smart_hub_brain" }) });
      setMessage(`${label} completed. Smart Hub has refreshed.`);
      await load();
    } catch (actionError) {
      setError(actionError.message || `${label} failed.`);
    } finally {
      setWorking("");
    }
  };

  return (
    <main style={{ minHeight: "100vh", background: "linear-gradient(135deg, #eef6ff 0%, #f8fbff 45%, #ffffff 100%)", padding: 24 }}>
      <section style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ ...cardStyle, padding: 28, marginBottom: 20, background: "linear-gradient(135deg, #0f172a 0%, #1d4ed8 55%, #38bdf8 100%)", color: "#ffffff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <p style={{ margin: 0, opacity: 0.85, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase" }}><img className="churvox-logo-force" src={churvoxLogoIcon} alt="Churvox" /> Churvox AI Operator</p>
              <h1 style={{ margin: "8px 0", fontSize: "clamp(32px, 5vw, 58px)", lineHeight: 1, fontWeight: 900 }}>Smart Hub Brain</h1>
              <p style={{ margin: 0, maxWidth: 720, fontSize: 17, opacity: 0.92 }}>
                Daily business command centre for jobs, invoices, quotes, workers, and owner approvals.
              </p>
            </div>
            <button type="button" onClick={load} disabled={loading} style={{ ...buttonStyle, background: "#ffffff", color: "#1d4ed8" }}>
              {loading ? "Refreshing..." : "Refresh Hub"}
            </button>
          </div>
        </div>

        {error ? (
          <div style={{ ...cardStyle, padding: 18, marginBottom: 18, borderColor: "#fecaca", background: "#fff1f2", color: "#991b1b", fontWeight: 800 }}>{error}</div>
        ) : null}

        {message ? (
          <div style={{ ...cardStyle, padding: 18, marginBottom: 18, borderColor: "#bbf7d0", background: "#f0fdf4", color: "#166534", fontWeight: 800 }}>{message}</div>
        ) : null}

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 20 }}>
          {[
            ["Open jobs", stats.openJobs],
            ["Unassigned", stats.unassignedJobs],
            ["Invoice follow-ups", stats.overdueInvoices],
            ["Quotes active", stats.draftQuotes],
            ["Workers active", stats.workersAvailable],
            ["Approvals", stats.approvals],
          ].map(([label, value]) => (
            <div key={label} style={{ ...cardStyle, padding: 18 }}>
              <p style={{ margin: 0, color: "#64748b", fontWeight: 800 }}>{label}</p>
              <strong style={{ display: "block", marginTop: 8, color: "#0f172a", fontSize: 34 }}>{value}</strong>
            </div>
          ))}
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.25fr) minmax(320px, 0.75fr)", gap: 18 }}>
          <div style={{ ...cardStyle, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", alignItems: "center", marginBottom: 18 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 26, color: "#0f172a" }}>Priority Queue</h2>
                <p style={{ margin: "6px 0 0", color: "#64748b" }}>The work that needs the owner’s attention first.</p>
              </div>
              <strong style={{ color: "#2563eb" }}>{money(stats.invoiceValue)} invoice value</strong>
            </div>

            {loading ? (
              <p style={{ color: "#64748b", fontWeight: 700 }}>Loading Smart Hub...</p>
            ) : priorityItems.length ? (
              <div style={{ display: "grid", gap: 12 }}>
                {priorityItems.map((item, index) => (
                  <div key={`${item.type}-${index}`} style={{ border: "1px solid #e2e8f0", borderRadius: 18, padding: 16, display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                    <div>
                      <span style={{ color: "#2563eb", fontWeight: 900, fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>{item.type}</span>
                      <h3 style={{ margin: "6px 0", color: "#0f172a", fontSize: 18 }}>{item.title}</h3>
                      <p style={{ margin: 0, color: "#64748b" }}>{item.detail}</p>
                    </div>
                    <span style={{ borderRadius: 999, background: "#eff6ff", color: "#1d4ed8", padding: "8px 12px", fontWeight: 800 }}>{item.status}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ border: "1px dashed #bfdbfe", borderRadius: 18, padding: 24, background: "#f8fbff" }}>
                <h3 style={{ margin: 0, color: "#0f172a" }}>No urgent queue items found.</h3>
                <p style={{ margin: "8px 0 0", color: "#64748b" }}>Run the AI Operator check to prepare recommended actions.</p>
              </div>
            )}
          </div>

          <aside style={{ ...cardStyle, padding: 24 }}>
            <h2 style={{ margin: 0, fontSize: 26, color: "#0f172a" }}>AI Actions</h2>
            <p style={{ color: "#64748b", marginTop: 8 }}>Approval-first actions for daily admin.</p>

            <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
              <button type="button" disabled={Boolean(working)} onClick={() => runOperatorAction("Daily check", "/ai/operator/run-daily-check")} style={buttonStyle}>
                {working === "Daily check" ? "Running..." : "Run Daily Check"}
              </button>
              <button type="button" disabled={Boolean(working)} onClick={() => runOperatorAction("Today prep", "/ai/operator/prepare-today")} style={{ ...buttonStyle, background: "#0f172a" }}>
                {working === "Today prep" ? "Preparing..." : "Prepare Today"}
              </button>
            </div>

            <div style={{ marginTop: 22, borderTop: "1px solid #e2e8f0", paddingTop: 18 }}>
              <h3 style={{ margin: 0, color: "#0f172a" }}>Launch safe mode</h3>
              <p style={{ color: "#64748b", lineHeight: 1.5 }}>
                This page was rebuilt to remove the JSX crash and keep Smart Hub usable while the deeper AI Operator wiring is finished.
              </p>
            </div>
          </aside>
        </section>
      </section>
    </main>
  );
}

export default SmartHubBrainPage;
