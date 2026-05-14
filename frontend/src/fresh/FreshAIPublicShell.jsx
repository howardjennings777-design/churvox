import React, { useState } from "react";
import "./FreshAIPublicShell.css";

const API_BASE = (() => {
  const raw =
    process.env.REACT_APP_API_URL ||
    process.env.REACT_APP_BACKEND_URL ||
    process.env.VITE_BACKEND_URL ||
    "https://grassley-backend.onrender.com";
  const clean = String(raw).replace(/\/+$/, "");
  return clean.endsWith("/api") ? clean : `${clean}/api`;
})();

async function postAuth(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }

  if (!res.ok) {
    throw new Error(data.detail || data.message || data.error || "Could not sign in");
  }

  return data;
}

function saveSession(payload) {
  const data = payload?.data || payload || {};
  const token =
    data.access_token ||
    data.token ||
    data.authToken ||
    data.jwt ||
    data?.user?.token ||
    "";

  if (token) {
    localStorage.setItem("token", token);
    localStorage.setItem("authToken", token);
    localStorage.setItem("access_token", token);
  }

  const user = data.user || data.account || data.profile || {};
  if (user && typeof user === "object") {
    localStorage.setItem("churvox_user", JSON.stringify(user));
    if (user.name) localStorage.setItem("churvox_owner_name", user.name);
    if (user.email) localStorage.setItem("churvox_email", user.email);
    if (user.role) localStorage.setItem("churvox_role", user.role);
  }
}

export default function FreshAIPublicShell() {
  const [mode, setMode] = useState("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    business_name: "",
    email: "",
    password: "",
  });

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const payload =
        mode === "signup"
          ? await postAuth("/auth/register", {
              name: form.name,
              business_name: form.business_name,
              email: form.email,
              password: form.password,
            })
          : await postAuth("/auth/login", {
              email: form.email,
              password: form.password,
            });

      saveSession(payload);
      window.location.href = "/dashboard";
    } catch (err) {
      setError(err.message || "Could not open Churvox");
    } finally {
      setBusy(false);
    }
  }

  const aiCards = [
    ["Unassigned job found", "AI checks area, workload and worker fit.", "Approve worker"],
    ["Invoice draft ready", "Job notes, proof and pricing are prepared.", "Review invoice"],
    ["Quote follow-up", "AI drafts a customer follow-up before it goes cold.", "Approve send"],
    ["Overdue payment", "Reminder is written and waiting for approval.", "Review reminder"],
  ];

  const features = [
    "Smart Hub",
    "AI Work Queue",
    "Jobs",
    "Clients",
    "Team",
    "Quotes",
    "Invoices",
    "Worker App",
  ];

  return (
    <main className="ai-public-shell">
      <div className="ai-blur ai-blur-a" />
      <div className="ai-blur ai-blur-b" />
      <div className="ai-grid-noise" />

      <header className="ai-topbar">
        <a className="ai-brand" href="#top" aria-label="Churvox home">
          <span className="ai-logo-mark">
            <i />
            <i />
            <i />
          </span>
          <span>
            <b>Churvox</b>
            <small>AI Operator OS</small>
          </span>
        </a>

        <nav className="ai-nav">
          <a href="#operator">AI Operator</a>
          <a href="#features">Features</a>
          <a href="#login">Login</a>
        </nav>
      </header>

      <section className="ai-hero" id="top">
        <div className="ai-hero-copy">
          <p className="ai-pill">
            <span />
            Built for trade and service owners
          </p>

          <h1>
            AI runs the admin.
            <strong>You approve the work.</strong>
          </h1>

          <p className="ai-copy">
            Churvox is a calm command centre for jobs, workers, quotes, invoices and follow-ups.
            It finds what needs doing, prepares the action, and gives the owner one simple queue to approve.
          </p>

          <div className="ai-cta-row">
            <a className="ai-main-cta" href="#login">Open Churvox</a>
            <a className="ai-ghost-cta" href="#operator">See how AI helps</a>
          </div>

          <div className="ai-metrics">
            <article>
              <b>24/7</b>
              <span>AI checks</span>
            </article>
            <article>
              <b>1 queue</b>
              <span>Owner approvals</span>
            </article>
            <article>
              <b>Less admin</b>
              <span>More control</span>
            </article>
          </div>
        </div>

        <aside className="ai-auth-card" id="login">
          <div className="ai-auth-head">
            <div>
              <span>Secure workspace</span>
              <h2>{mode === "login" ? "Login" : "Create account"}</h2>
            </div>
            <div className="ai-auth-orb" />
          </div>

          {error ? <div className="ai-error">{error}</div> : null}

          <form onSubmit={submit} className="ai-form">
            {mode === "signup" && (
              <>
                <label>
                  Your name
                  <input value={form.name} onChange={(e) => update("name", e.target.value)} />
                </label>
                <label>
                  Business name
                  <input value={form.business_name} onChange={(e) => update("business_name", e.target.value)} />
                </label>
              </>
            )}

            <label>
              Email
              <input type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} />
            </label>

            <label>
              Password
              <input type="password" required value={form.password} onChange={(e) => update("password", e.target.value)} />
            </label>

            <button disabled={busy}>
              {busy ? "Opening..." : mode === "login" ? "Open command centre" : "Create account"}
            </button>
          </form>

          <button
            type="button"
            className="ai-switch"
            onClick={() => {
              setError("");
              setMode(mode === "login" ? "signup" : "login");
            }}
          >
            {mode === "login" ? "Create a new Churvox account" : "I already have an account"}
          </button>
        </aside>
      </section>

      <section className="ai-operator" id="operator">
        <div className="ai-section-title">
          <span>AI Operator</span>
          <h2>Not another messy dashboard. A queue of work AI has prepared for you.</h2>
        </div>

        <div className="ai-approval-board">
          {aiCards.map(([title, body, action]) => (
            <article className="ai-approval-card" key={title}>
              <div className="ai-card-status">Ready for approval</div>
              <h3>{title}</h3>
              <p>{body}</p>
              <button type="button">{action}</button>
            </article>
          ))}
        </div>
      </section>

      <section className="ai-steps">
        {[
          ["1", "Work comes in", "Jobs, clients, workers, time, quotes and invoices stay connected."],
          ["2", "AI checks the business", "It finds missing workers, unpaid invoices, quote follow-ups and completed work."],
          ["3", "AI prepares actions", "Draft invoices, reminders and worker recommendations are prepared."],
          ["4", "Owner approves", "Nothing important is sent or changed until you approve it."],
        ].map(([num, title, body]) => (
          <article key={num}>
            <b>{num}</b>
            <h3>{title}</h3>
            <p>{body}</p>
          </article>
        ))}
      </section>

      <section className="ai-features" id="features">
        <div>
          <span>Inside Churvox</span>
          <h2>Everything runs from one simple AI-powered workspace.</h2>
        </div>

        <div className="ai-feature-list">
          {features.map((feature) => (
            <article key={feature}>{feature}</article>
          ))}
        </div>
      </section>
    </main>
  );
}
