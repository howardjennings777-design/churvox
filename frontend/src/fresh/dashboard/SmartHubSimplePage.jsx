import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./smartHubSimplePage.css";

const API_BASE = (() => {
  const raw = process.env.REACT_APP_API_URL || process.env.REACT_APP_BACKEND_URL || process.env.VITE_BACKEND_URL || "https://grassley-backend.onrender.com";
  const clean = String(raw).replace(/\/+$/, "");
  return clean.endsWith("/api") ? clean : `${clean}/api`;
})();

function token() {
  try { return localStorage.getItem("token") || localStorage.getItem("authToken") || localStorage.getItem("access_token") || ""; }
  catch { return ""; }
}

async function api(path) {
  const headers = { Accept: "application/json" };
  const t = token();
  if (t) headers.Authorization = `Bearer ${t}`;
  const res = await fetch(`${API_BASE}/${String(path).replace(/^\/+/, "")}`, { credentials: "include", headers });
  const text = await res.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  if (!res.ok) throw new Error(payload?.detail || payload?.message || `${path} failed`);
  return payload;
}

function arr(payload, keys = []) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  for (const k of keys) if (Array.isArray(payload[k])) return payload[k];
  for (const k of ["items", "data", "results"]) if (Array.isArray(payload[k])) return payload[k];
  return Object.values(payload).find(Array.isArray) || [];
}

function status(row) {
  return String(row?.status || row?.job_status || row?.payment_status || row?.quote_status || "").toLowerCase();
}

function title(row, fallback) {
  return row?.title || row?.job_title || row?.name || row?.client_name || row?.customer_name || row?.invoice_number || row?.quote_number || fallback;
}

function id(row) {
  return row?.id || row?._id || row?.job_id || row?.invoice_id || row?.quote_id || title(row, "item");
}

function value(row) {
  const n = Number(row?.total || row?.amount || row?.balance || row?.price || row?.job_price || 0);
  return Number.isFinite(n) ? n : 0;
}

function money(n) {
  return new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 }).format(Number(n || 0));
}

function Card({ count, label, title, text, href, action, tone, items }) {
  return (
    <article className={`simple-card ${tone || ""}`}>
      <div className="simple-count"><b>{count}</b><span>{label}</span></div>
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
        {items?.slice(0, 3).map((x) => <small key={id(x)}>{title(x, "Item")}</small>)}
      </div>
      <Link to={href}>{action}</Link>
    </article>
  );
}

export default function SmartHubSimplePage() {
  const [data, setData] = useState({ loading: true, error: "", jobs: [], invoices: [], quotes: [], clients: [], team: [] });

  async function load() {
    setData((d) => ({ ...d, loading: true, error: "" }));
    const calls = await Promise.allSettled([api("/jobs"), api("/invoices"), api("/quotes"), api("/clients"), api("/team/workers")]);
    setData({
      loading: false,
      error: calls.some((c) => c.status === "rejected") ? "Some live data could not load. Showing what Churvox can access." : "",
      jobs: calls[0].status === "fulfilled" ? arr(calls[0].value, ["jobs"]) : [],
      invoices: calls[1].status === "fulfilled" ? arr(calls[1].value, ["invoices"]) : [],
      quotes: calls[2].status === "fulfilled" ? arr(calls[2].value, ["quotes"]) : [],
      clients: calls[3].status === "fulfilled" ? arr(calls[3].value, ["clients"]) : [],
      team: calls[4].status === "fulfilled" ? arr(calls[4].value, ["workers", "team"]) : [],
    });
  }

  useEffect(() => { load(); }, []);

  const s = useMemo(() => {
    const jobs = data.jobs;
    const invoices = data.invoices;
    const quotes = data.quotes;
    const invoicedJobs = new Set(invoices.map((i) => String(i.job_id || i.source_job_id || i.linked_job_id || "")).filter(Boolean));

    const unassigned = jobs.filter((j) => !["completed", "done", "closed", "cancelled"].includes(status(j))).filter((j) => !(j.assigned_worker_id || j.worker_id || j.assigned_to || j.assigned_worker_name));
    const completed = jobs.filter((j) => ["completed", "done", "closed"].includes(status(j))).filter((j) => !invoicedJobs.has(String(id(j))));
    const openInvoices = invoices.filter((i) => ["open", "sent", "unpaid", "overdue", "partially_paid", "draft"].includes(status(i)));
    const openQuotes = quotes.filter((q) => ["open", "sent", "pending", "waiting", "draft"].includes(status(q)));
    const notes = jobs.filter((j) => j.issue_flag || j.help_flag || j.worker_notes || j.completion_notes || j.worker_completion_notes);
    const invoiced = invoices.reduce((sum, i) => sum + value(i), 0);
    const paid = invoices.filter((i) => ["paid", "complete", "completed"].includes(status(i))).reduce((sum, i) => sum + value(i), 0);
    const activeCrew = data.team.filter((w) => !["inactive", "disabled", "removed"].includes(status(w)));

    return { unassigned, completed, openInvoices, openQuotes, notes, invoiced, paid, outstanding: Math.max(invoiced - paid, 0), activeCrew };
  }, [data]);

  const attention = s.unassigned.length + s.completed.length + s.openInvoices.length + s.openQuotes.length + s.notes.length;

  return (
    <main className="simple-hub">
      <section className="simple-hero">
        <div>
          <p>SMART HUB</p>
          <h1>AI checked the business.</h1>
          <span>{attention ? "These are the things that need attention. Tap a card to go straight there." : "Nothing urgent is waiting. Churvox is still watching the business."}</span>
        </div>
        <aside>
          <b>{data.loading ? "…" : attention}</b>
          <small>things need attention</small>
          <button type="button" onClick={load}>{data.loading ? "Checking..." : "Check again"}</button>
        </aside>
      </section>

      {data.error ? <section className="simple-notice">{data.error}</section> : null}

      <section className="simple-grid">
        <Card tone="blue" count={s.unassigned.length} label="jobs" title="Unassigned work" text="Jobs that need a worker assigned." href="/jobs" action="Open jobs" items={s.unassigned} />
        <Card tone="green" count={s.completed.length} label="jobs" title="Completed work ready to invoice" text="Completed jobs waiting for invoice review." href="/proof-to-paid" action="Open Proof-to-Paid" items={s.completed} />
        <Card tone="amber" count={s.openInvoices.length} label={money(s.outstanding)} title="Money waiting" text="Open or unpaid invoices that may need follow-up." href="/invoices" action="Open invoices" />
        <Card tone="purple" count={s.openQuotes.length} label="quotes" title="Quotes needing follow-up" text="Quotes waiting on customer decisions." href="/quotes" action="Open quotes" />
      </section>

      <section className="simple-health">
        <article>
          <header><p>CASHFLOW</p><Link to="/invoices">Open invoices</Link></header>
          <h2>Money snapshot</h2>
          <div className="simple-stats">
            <span><b>{money(s.invoiced)}</b><small>Total invoiced</small></span>
            <span><b>{money(s.paid)}</b><small>Paid</small></span>
            <span><b>{money(s.outstanding)}</b><small>Outstanding</small></span>
          </div>
        </article>

        <article>
          <header><p>CREW STATUS</p><Link to="/team">Open team</Link></header>
          <h2>Team snapshot</h2>
          <div className="simple-stats">
            <span><b>{data.team.length}</b><small>Total crew</small></span>
            <span><b>{s.activeCrew.length}</b><small>Active</small></span>
            <span><b>{s.unassigned.length}</b><small>Jobs needing crew</small></span>
          </div>
          <div className="simple-crew">
            {s.activeCrew.slice(0, 4).map((w, i) => <small key={id(w) || i}>{title(w, `Worker ${i + 1}`)} · {w.region || w.suburb || status(w) || "active"}</small>)}
          </div>
        </article>
      </section>

      <section className="simple-bottom">
        <article><strong>AI Work Queue</strong><p>Review/edit AI-prepared assignments, invoices and SMS drafts.</p><Link to="/ai-approvals">Open AI Work Queue</Link></article>
        <article><strong>Setup and imports</strong><p>Import clients/workers so Churvox can help properly.</p><Link to="/import">Open Import Centre</Link></article>
      </section>
    </main>
  );
}
