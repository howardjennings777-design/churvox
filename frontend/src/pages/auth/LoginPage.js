import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { normalizeRole, getDefaultRoute } from "@/lib/roles";
import { ChurvoxLogo } from "../../components/ChurvoxLogo";
import "./AuthPublicCommand.css";

const getPostLoginPath = (payload = {}) => {
  const user = payload?.user || payload || {};
  const email = String(user?.email || payload?.email || "").trim().toLowerCase();
  const isPlatformOwner = email === "hello@churvox.com" || user?.is_platform_owner === true || user?.is_admin === true;
  if (isPlatformOwner) return "/admin";
  return getDefaultRoute(normalizeRole(user?.role || payload?.role));
};

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const r = await login(email, password);
      if (r?.token) navigate(getPostLoginPath(r));
      else setError("Login failed. Please try again.");
    } catch (err) {
      setError(err?.response?.data?.detail || "Invalid email or password.");
    }
    setLoading(false);
  };

  return (
    <main className="wh-auth">
      <header className="wh-auth-nav">
        <Link to="/"><ChurvoxLogo /></Link>
        <nav className="wh-auth-links">
          <Link to="/">Home</Link>
          <Link to="/features">Features</Link>
          <Link to="/pricing">Pricing</Link>
        </nav>
        <Link to="/signup" className="px-btn px-btn--primary">Start free</Link>
      </header>

      <section className="wh-auth-wrap">
        <form className="wh-auth-form" onSubmit={handleSubmit} data-testid="login-form">
          <p className="wh-auth-kicker">Owner approval access</p>
          <h1 className="wh-auth-title">Sign in to the command floor.</h1>
          <p className="wh-auth-sub">
            Open prepared admin, review the money desk, and approve the next move Churvox has lined up.
          </p>

          {error && <p className="wh-auth-error">{error}</p>}

          <label className="wh-auth-label">
            Email
            <input className="wh-auth-input" data-testid="login-email-input" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          </label>

          <label className="wh-auth-label">
            Password
            <input className="wh-auth-input" data-testid="login-password-input" value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
          </label>

          <button className="wh-auth-submit" data-testid="login-submit-button" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <p className="wh-auth-sub">
            <Link to="/forgot-password" data-testid="forgot-password-link">Forgot password?</Link>
          </p>
        </form>

        <aside className="wh-auth-panel">
          <p className="wh-auth-kicker">Churvox AI Operator</p>
          <h2>The admin is prepared before you arrive.</h2>
          <p>
            Jobs, quotes, invoices, workers, missing info and money follow-ups become clear owner decisions — not another messy dashboard wall.
          </p>
        </aside>
      </section>
    </main>
  );
}
