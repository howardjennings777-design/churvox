
import { useState } from "react";
import { API_BASE } from "../api";
import { clearChurvoxAuth } from "../logout";
import "./ForcedLoginPage.css";

function saveLogin(payload, email) {
  const data = payload?.data || payload || {};
  const token =
    data.access_token ||
    data.token ||
    data.jwt ||
    data.auth_token ||
    data?.user?.token ||
    "";

  const user = data.user || data.profile || data.account || { email, role: "owner" };
  const role = user.role || data.role || "owner";

  try {
    if (token) {
      localStorage.setItem("token", token);
      localStorage.setItem("authToken", token);
      localStorage.setItem("access_token", token);
    }

    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("churvox_user", JSON.stringify(user));
    localStorage.setItem("role", role);
    localStorage.setItem("churvox_role", role);
    localStorage.setItem("email", email);
    localStorage.removeItem("churvox_force_login");
    localStorage.removeItem("churvox_logged_out");
  } catch {}
}

function safeReturnPath() {
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("return_to") || "/dashboard";

    if (!raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
    if (raw.startsWith("/login") || raw.startsWith("/signup") || raw.startsWith("/register")) return "/dashboard";

    return raw;
  } catch {
    return "/dashboard";
  }
}

async function postLogin(email, password) {
  const paths = ["/auth/login", "/owner/login", "/admin/login"];

  let lastError = "Login failed.";

  for (const path of paths) {
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const text = await res.text();
      let payload = null;

      try {
        payload = text ? JSON.parse(text) : null;
      } catch {
        payload = text;
      }

      if (res.ok) return payload;

      lastError =
        payload?.detail ||
        payload?.message ||
        payload?.error ||
        lastError;
    } catch (err) {
      lastError = err.message || lastError;
    }
  }

  throw new Error(lastError);
}

export default function ForcedLoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setError("");

    const email = form.email.trim().toLowerCase();

    try {
      const payload = await postLogin(email, form.password);
      saveLogin(payload, email);
      window.location.replace(safeReturnPath());
    } catch (err) {
      setError(err.message || "Could not sign in. Please check your email and password.");
    } finally {
      setBusy(false);
    }
  }

  function update(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  return (
    <main className="force-login-page">
      <section className="force-login-shell">
        <div className="force-login-copy">
          <a className="force-login-brand" href="/">
            <span><img src="/brand/churvox-holo-c.svg" alt="" /></span>
            <div>
              <strong>CHURVOX</strong>
              <small>AI TRADE OPERATOR</small>
            </div>
          </a>

          <p>AI COMMAND CENTRE FOR TRADE BUSINESS</p>
          <h1>Sign in to your AI command centre.</h1>
          <span>
            Jobs, crew, invoices, proof and follow-ups stay organised in one calm owner-approved workspace.
          </span>

          <div className="force-login-pills">
            <b>Approval-first AI</b>
            <b>Smart Hub</b>
            <b>Proof-to-Paid</b>
          </div>
        </div>

        <form className="force-login-card" onSubmit={submit}>
          <img src="/brand/churvox-holo-c.svg" alt="" />
          <p>Welcome back</p>
          <h2>Sign in</h2>
          <span>Enter your Churvox account details.</span>

          {error ? <div className="force-login-error">{error}</div> : null}

          <label>
            <small>Email</small>
            <input
              type="email"
              value={form.email}
              onChange={(event) => update("email", event.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <label>
            <small>Password</small>
            <input
              type="password"
              value={form.password}
              onChange={(event) => update("password", event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          <button type="submit" disabled={busy}>
            {busy ? "Signing in..." : "Sign in"}
          </button>

          <footer>
            <a href="/signup">Start free trial</a>
            <a href="mailto:hello@churvox.com">Email support</a>
          </footer>
        </form>
      </section>
    </main>
  );
}
