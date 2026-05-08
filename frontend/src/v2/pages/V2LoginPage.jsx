import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getDefaultRoute } from "../../lib/roles";
import { ChurvoxLogo } from "../../components/ChurvoxLogo";
import "../styles/v2.css";

export default function V2LoginPage() {
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
    <main className="v2-login">
      <section className="v2-login-brand">
        <div>
          <ChurvoxLogo size="lg" dark />
          <h1>Run the day from one command centre.</h1>
          <p>Jobs, invoices, crew, client follow-ups and owner approvals — prepared in the background, reviewed when it matters.</p>
          <div className="v2-login-chips"><span>AI Operator</span><span>Live run sheet</span><span>Cashflow</span><span>Team workflow</span></div>
        </div>
      </section>
      <section className="v2-login-panel">
        <form className="v2-login-card" onSubmit={submit}>
          <ChurvoxLogo size="md" />
          <div><h2>Welcome back</h2><p>Log in to your Churvox workspace.</p></div>
          {error && <div className="v2-login-error">{error}</div>}
          <label>Email</label>
          <div className="v2-login-field"><Mail size={17} /><input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@business.com" autoComplete="email" required /></div>
          <label>Password</label>
          <div className="v2-login-field"><Lock size={17} /><input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" autoComplete="current-password" required /></div>
          <button className="v2-button v2-login-submit" disabled={loading} type="submit">{loading ? "Logging in…" : "Log in"}<ArrowRight size={17} /></button>
          <div className="v2-login-links"><Link to="/forgot-password">Forgot password?</Link><Link to="/signup">Create account</Link></div>
        </form>
      </section>
    </main>
  );
}
