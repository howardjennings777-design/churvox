import React, { useState } from "react";
import "./FreshAuthShell.css";

const API_BASE = (() => {
  const raw =
    process.env.REACT_APP_API_URL ||
    process.env.REACT_APP_BACKEND_URL ||
    process.env.VITE_BACKEND_URL ||
    "https://grassley-backend.onrender.com";
  const clean = String(raw).replace(/\/+$/, "");
  return clean.endsWith("/api") ? clean : `${clean}/api`;
})();

function saveAuth(payload) {
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

  const user = data.user || data.account || data.profile || data;
  if (user && typeof user === "object") {
    localStorage.setItem("churvox_user", JSON.stringify(user));
    if (user.name) localStorage.setItem("churvox_owner_name", user.name);
    if (user.role) localStorage.setItem("churvox_role", user.role);
    if (user.email) localStorage.setItem("churvox_email", user.email);
  }
}

async function authFetch(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { message: text };
  }

  if (!res.ok) {
    throw new Error(payload.detail || payload.message || payload.error || "Authentication failed");
  }

  return payload;
}

export default function FreshAuthShell() {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    name: "",
    business_name: "",
    email: "",
    password: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function update(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      if (mode === "signup") {
        const payload = await authFetch("/auth/register", {
          name: form.name,
          business_name: form.business_name,
          email: form.email,
          password: form.password,
        });

        saveAuth(payload);
        if (payload?.access_token || payload?.token || payload?.user) {
          window.location.href = "/dashboard";
          return;
        }

        setMode("login");
        setError("Account created. Sign in to open Churvox.");
        return;
      }

      const payload = await authFetch("/auth/login", {
        email: form.email,
        password: form.password,
      });

      saveAuth(payload);
      window.location.href = "/dashboard";
    } catch (err) {
      setError(err.message || "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  const actions = [
    ["Unassigned job found", "AI checks the job, area, crew load and worker fit.", "Ready to approve"],
    ["Invoice draft prepared", "Completed work becomes a draft invoice with notes and proof.", "Review draft"],
    ["Quote follow-up ready", "Open quotes are prepared for customer follow-up.", "Send when approved"],
  ];

  return (
    <main className="cvx-shell">
      <div className="cvx-bg cvx-bg-one" />
      <div className="cvx-bg cvx-bg-two" />
      <div className="cvx-bg cvx-bg-three" />

      <section className="cvx-frame">
        <header className="cvx-header">
          <div className="cvx-brand">
            <div className="cvx-mark" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <div>
              <strong>Churvox</strong>
              <small>AI Operator for service businesses</small>
            </div>
          </div>

          <a href="#login" className="cvx-header-btn">
            Open app
          </a>
        </header>

        <section className="cvx-hero-grid">
          <div className="cvx-hero">
            <div className="cvx-kicker">
              <span />
              AI business operator
            </div>

            <h1>
              AI runs the admin.
              <em>You approve the work.</em>
            </h1>

            <p>
              Churvox is built for trade and service owners who want less admin,
              less chasing, and one calm place to approve what the business needs next.
            </p>

            <div className="cvx-hero-buttons">
              <a href="#login" className="cvx-primary">
                Login to Churvox
              </a>
              <a href="#ai-flow" className="cvx-secondary">
                See the AI flow
              </a>
            </div>

            <div className="cvx-proof-grid">
              <article>
                <strong>Smart Hub</strong>
                <span>Daily command centre</span>
              </article>
              <article>
                <strong>AI Queue</strong>
                <span>Prepared actions</span>
              </article>
              <article>
                <strong>Proof-to-paid</strong>
                <span>Jobs into invoices</span>
              </article>
            </div>
          </div>

          <aside className="cvx-login-wrap" id="login">
            <div className="cvx-login-card">
              <div className="cvx-login-head">
                <div>
                  <span>Secure workspace</span>
                  <h2>{mode === "login" ? "Sign in" : "Create account"}</h2>
                </div>
                <div className="cvx-login-orb" />
              </div>

              {error ? <div className="cvx-error">{error}</div> : null}

              <form onSubmit={submit} className="cvx-form">
                {mode === "signup" ? (
                  <>
                    <label>
                      Your name
                      <input
                        value={form.name}
                        onChange={(event) => update("name", event.target.value)}
                        autoComplete="name"
                      />
                    </label>

                    <label>
                      Business name
                      <input
                        value={form.business_name}
                        onChange={(event) => update("business_name", event.target.value)}
                        autoComplete="organization"
                      />
                    </label>
                  </>
                ) : null}

                <label>
                  Email
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => update("email", event.target.value)}
                    autoComplete="email"
                    required
                  />
                </label>

                <label>
                  Password
                  <input
                    type="password"
                    value={form.password}
                    onChange={(event) => update("password", event.target.value)}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    required
                  />
                </label>

                <button type="submit" disabled={busy}>
                  {busy ? "Opening..." : mode === "login" ? "Open Churvox" : "Create Churvox account"}
                </button>
              </form>

              <button
                type="button"
                className="cvx-mode-switch"
                onClick={() => {
                  setError("");
                  setMode(mode === "login" ? "signup" : "login");
                }}
              >
                {mode === "login" ? "Need an account? Create one" : "Already have an account? Sign in"}
              </button>
            </div>

            <div className="cvx-trust">
              <span>Owner approval first</span>
              <span>Role safe</span>
              <span>Mobile ready</span>
            </div>
          </aside>
        </section>

        <section className="cvx-ai-panel" id="ai-flow">
          <div className="cvx-ai-title">
            <span>How Churvox feels different</span>
            <h2>It does not just tell you what is wrong. It prepares the fix.</h2>
          </div>

          <div className="cvx-action-grid">
            {actions.map(([title, body, status]) => (
              <article key={title} className="cvx-action-card">
                <div className="cvx-action-dot" />
                <h3>{title}</h3>
                <p>{body}</p>
                <button type="button">{status}</button>
              </article>
            ))}
          </div>
        </section>

        <section className="cvx-steps">
          {[
            ["1", "Work comes in", "Jobs, clients, quotes, invoices and worker updates stay connected."],
            ["2", "AI checks the day", "It finds missing assignments, follow-ups, invoice gaps and risks."],
            ["3", "Actions are prepared", "Worker picks, invoice drafts and reminders are prepared for review."],
            ["4", "Owner approves", "Nothing important is sent or changed until the owner approves it."],
          ].map(([num, title, body]) => (
            <article key={num}>
              <b>{num}</b>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
