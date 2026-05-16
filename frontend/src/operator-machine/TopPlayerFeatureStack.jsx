import React, { useEffect, useState } from "react";
import "./TopPlayerFeatureStack.css";

const API_BASE = (() => {
  const raw =
    process.env.REACT_APP_API_URL ||
    process.env.REACT_APP_BACKEND_URL ||
    process.env.VITE_BACKEND_URL ||
    "https://grassley-backend.onrender.com";
  const clean = String(raw).replace(/\/+$/, "");
  return clean.endsWith("/api") ? clean : `${clean}/api`;
})();

function readToken() {
  try {
    return (
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("access_token") ||
      ""
    );
  } catch {
    return "";
  }
}

async function api(path, method = "GET", body) {
  const token = readToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(method === "GET" ? {} : { body: JSON.stringify(body || {}) }),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload.detail || payload.message || payload.error || `${path} failed`);
  }
  return payload;
}

const FEATURE_CARDS = [
  {
    key: "customer_command",
    title: "Customer Command Link",
    label: "Portal 2.0",
    body: "One customer link for proof, quotes, invoices, payment notes, messages, book-again and referrals.",
    endpoint: "/top-player/customer-command-links",
    method: "POST",
    cta: "Create sample link",
    metric: "customer_command_links",
  },
  {
    key: "growth_loop",
    title: "Growth Loop",
    label: "Reviews + referrals",
    body: "After completed work, Churvox prepares review, referral and book-again drafts for owner approval.",
    endpoint: "/top-player/growth-loop/prepare",
    method: "POST",
    cta: "Prepare growth drafts",
    metric: "growth_loop_ready",
  },
  {
    key: "dispatch",
    title: "AI Dispatch Commander",
    label: "Crew matching",
    body: "Ranks workers by area, skill fit, workload and availability before the owner approves dispatch.",
    endpoint: "/top-player/dispatch-commander/plan",
    method: "POST",
    cta: "Build dispatch plan",
    metric: "dispatch_needed",
  },
  {
    key: "margin",
    title: "AI Margin Guard",
    label: "Profit protection",
    body: "Flags underpriced jobs and quotes before they are sent or turned into invoices.",
    endpoint: "/top-player/margin-guard/suggestions",
    method: "GET",
    cta: "Check margins",
    metric: "margin_warnings",
  },
  {
    key: "work_packs",
    title: "AI Work Packs",
    label: "Smart checklists",
    body: "Creates trade-specific checklists, proof photo requirements, materials capture and sign-off rules.",
    endpoint: "/top-player/work-packs/templates",
    method: "GET",
    cta: "View templates",
    metric: "work_packs_prepared",
  },
];

export default function TopPlayerFeatureStack() {
  const [summary, setSummary] = useState(null);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [latest, setLatest] = useState(null);

  async function load() {
    try {
      const payload = await api("/top-player/summary");
      setSummary(payload.summary || {});
    } catch (err) {
      setMessage(err.message || "Feature stack is syncing.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function runFeature(card) {
    setBusy(card.key);
    setMessage("");

    try {
      const body = card.key === "customer_command"
        ? { source_type: "client", title: "Customer Command Link" }
        : {};

      const payload = await api(card.endpoint, card.method, body);
      setLatest({ card, payload });
      setMessage(payload.message || `${card.title} checked.`);
      await load();
    } catch (err) {
      setMessage(err.message || `${card.title} could not run yet.`);
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="om-top-player-stack" data-phase="TOP_PLAYER_FEATURE_STACK">
      <header>
        <div>
          <span>Top-player stack</span>
          <h2>Churvox is not just matching the big apps. It is making the admin smarter.</h2>
          <p>
            These modules turn normal job-management features into an approval-first AI machine:
            customer portal, growth loop, dispatch, margin guard and smart work packs.
          </p>
        </div>

        <aside>
          <b>{summary?.dispatch_needed ?? 0}<small>dispatch</small></b>
          <b>{summary?.growth_loop_ready ?? 0}<small>growth</small></b>
          <b>{summary?.margin_warnings ?? 0}<small>margin</small></b>
        </aside>
      </header>

      <div className="om-top-player-grid">
        {FEATURE_CARDS.map((card) => (
          <article key={card.key}>
            <span>{card.label}</span>
            <strong>{card.title}</strong>
            <p>{card.body}</p>

            <footer>
              <b>{summary?.[card.metric] ?? 0}</b>
              <button type="button" disabled={busy === card.key} onClick={() => runFeature(card)}>
                {busy === card.key ? "Working..." : card.cta}
              </button>
            </footer>
          </article>
        ))}
      </div>

      {message ? <p className="om-top-player-message">{message}</p> : null}

      {latest ? (
        <section className="om-top-player-result">
          <span>Latest output</span>
          <strong>{latest.card.title}</strong>
          <pre>{JSON.stringify(latest.payload, null, 2).slice(0, 1600)}</pre>
        </section>
      ) : null}
    </section>
  );
}
