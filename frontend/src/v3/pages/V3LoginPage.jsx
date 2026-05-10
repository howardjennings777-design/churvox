import churvoxLogoIcon from "../assets/churvox-logo-icon.svg";
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getDefaultRoute } from "../../lib/roles";
import V3Brand from "../components/V3Brand";
import "../styles/v3.css";

export default function V3LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await login(email.trim(), password);
      const user = result?.user || result;
      const lower = String(user?.email || email).toLowerCase();
      const isPlatform = lower === "hello@churvox.com" || user?.is_platform_owner || user?.is_admin;
      navigate(isPlatform ? "/admin" : getDefaultRoute(user?.role), { replace: true });
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Could not log in. Check your details and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="v3-login">
      <section className="v3-login-brand">
        <div>
          <V3Brand />
          <h1>The trade business control room.</h1>
          <p>Jobs, invoices, crew, follow-ups and owner approvals built around real worksite flow, not messy office software.</p>
          <div className="v3-login-chips">
            <span>Live run sheet</span>
            <span>Crew control</span>
            <span>Cashflow</span>
            <span>Automation</span>
          </div>
        </div>
      </section>

      <section className="v3-login-panel">
        <form className="v3-login-card" onSubmit={submit}>
          <V3Brand />
          <div>
            <h2>Log in</h2>
            <p>Open your <img className="churvox-logo-force" src={churvoxLogoIcon} alt="Churvox" /> Churvox Trade OS workspace.</p>
          </div>

          {error && <div className="v3-error">{error}</div>}

          <label>Email</label>
          <div className="v3-field">
            <Mail size={17} />
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@business.com" autoComplete="email" required />
          </div>

          <label>Password</label>
          <div className="v3-field">
            <Lock size={17} />
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" autoComplete="current-password" required />
          </div>

          <button className="v3-button" disabled={loading} type="submit">
            {loading ? "Logging in…" : "Log in"} <ArrowRight size={17} />
          </button>

          <div className="v3-links">
            <Link to="/forgot-password">Forgot password?</Link>
            <Link to="/signup">Create account</Link>
          </div>
        </form>
      </section>
    </main>
  );
}
