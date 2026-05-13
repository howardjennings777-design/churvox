import { useState } from "react";
import { API_BASE } from "../api";
import "./PublicSignupPage.css";

function saveAuth(payload, email, businessName) {
  const data = payload?.data || payload || {};
  const token =
    data.access_token ||
    data.token ||
    data.jwt ||
    data.auth_token ||
    data?.user?.token ||
    "";

  const user = data.user || data.profile || {
    email,
    business_name: businessName,
    role: "owner",
  };

  try {
    if (token) {
      localStorage.setItem("token", token);
      localStorage.setItem("authToken", token);
      localStorage.setItem("access_token", token);
    }

    localStorage.setItem("churvox_user", JSON.stringify(user));
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("churvox_role", "owner");
    localStorage.setItem("role", "owner");
    localStorage.setItem("email", email);
    localStorage.setItem("churvox_owner_name", businessName || email || "Owner");
  } catch {}
}

async function postJson(path, body) {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("access_token") ||
    "";

  const res = await fetch(`${API_BASE}/${String(path).replace(/^\/+/, "")}`, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let payload = null;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!res.ok) {
    throw new Error(payload?.detail || payload?.message || payload?.error || `${path} failed`);
  }

  return payload;
}

export default function PublicSignupPage() {
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
    if (busy) return;

    setBusy(true);
    setError("");

    const email = form.email.trim().toLowerCase();
    const businessName = form.business_name.trim();
    const payload = {
      name: form.name.trim() || businessName || email,
      full_name: form.name.trim() || businessName || email,
      business_name: businessName,
      company_name: businessName,
      email,
      password: form.password,
      role: "owner",
      account_type: "owner",
      plan: "trial",
      source: "public_trial_signup",
    };

    try {
      const registerResult = await postJson("/auth/register", payload);
      saveAuth(registerResult, email, businessName);

      try {
        await postJson("/billing/start-trial", { plan: "team", source: "public_signup" });
      } catch {
        // Trial can still be started later from Plans if the backend needs plan confirmation.
      }

      window.location.href = "/dashboard";
    } catch (err) {
      setError(err.message || "Could not create your trial account. Please check the details and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="signup-screen">
      <section className="signup-shell">
        <a className="signup-brand" href="/" aria-label="Back to Churvox home">
          <span><img src="/brand/churvox-holo-c.svg" alt="" /></span>
          <strong>CHURVOX</strong>
          <small>AI Trade Operator</small>
        </a>

        <div className="signup-grid">
          <section className="signup-copy">
            <p>START YOUR CHURVOX TRIAL</p>
            <h1>
              Give your business an AI command centre.
              <span>Start without the admin mess.</span>
            </h1>
            <p className="signup-lead">
              Create your owner account and let Churvox prepare jobs, crew actions,
              quote follow-ups, invoice review, proof photos and daily admin from one place.
            </p>

            <div className="signup-sales">
              <article>
                <strong>AI prepares the work</strong>
                <span>Dispatch, invoices, proof review and follow-ups appear in one approval queue.</span>
              </article>
              <article>
                <strong>You stay in control</strong>
                <span>Nothing important is sent, assigned, charged or synced without owner approval.</span>
              </article>
              <article>
                <strong>Built for trade crews</strong>
                <span>Field jobs, worker proof, client history and billing readiness stay connected.</span>
              </article>
            </div>
          </section>

          <section className="signup-card">
            <div className="signup-card-head">
              <p>FREE TRIAL</p>
              <h2>Create your owner account</h2>
              <span>No messy setup. Start with your business details.</span>
            </div>

            {error ? <div className="signup-error">{error}</div> : null}

            <form onSubmit={submit}>
              <label>
                <span>Your name</span>
                <input
                  value={form.name}
                  onChange={(event) => update("name", event.target.value)}
                  placeholder="Howard"
                  autoComplete="name"
                />
              </label>

              <label>
                <span>Business name</span>
                <input
                  value={form.business_name}
                  onChange={(event) => update("business_name", event.target.value)}
                  placeholder="Your business"
                  autoComplete="organization"
                  required
                />
              </label>

              <label>
                <span>Email</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => update("email", event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </label>

              <label>
                <span>Password</span>
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) => update("password", event.target.value)}
                  placeholder="Create a password"
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
              </label>

              <button type="submit" disabled={busy}>
                {busy ? "Creating your trial..." : "Start free trial"}
              </button>
            </form>

            <footer>
              Already have an account? <a href="/login">Sign in</a>
            </footer>
          </section>
        </div>
      </section>
    </main>
  );
}
