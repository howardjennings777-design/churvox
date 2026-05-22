import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ChurvoxLogo } from "@/components/ChurvoxLogo";
import { normalizeRole, getDefaultRoute } from "@/lib/roles";

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
      const result = await login(email, password);
      if (result?.token) navigate(getPostLoginPath(result));
      else setError("Login failed. Please try again.");
    } catch (err) {
      setError(err?.response?.data?.detail || "Invalid email or password.");
    }
    setLoading(false);
  };

  return (
    <main className="login-pro">
      <header className="login-pro-nav">
        <Link to="/" className="login-pro-logo"><ChurvoxLogo /></Link>
        <nav>
          <Link to="/features">Features</Link>
          <Link to="/pricing">Pricing</Link>
          <Link to="/signup" className="nav-cta">Start free</Link>
        </nav>
      </header>

      <section className="login-pro-grid">
        <div className="login-pro-copy">
          <p className="eyebrow">Churvox operator access</p>
          <h1>Sign in to your business front desk.</h1>
          <p className="lead">Jobs, quotes, invoices, workers and money all come back to one serious operating desk. Churvox prepares the admin. You approve the action.</p>
          <div className="proof-strip">
            <div><b>Approval-first</b><span>No sends, syncs or customer messages without owner approval.</span></div>
            <div><b>Worker-safe</b><span>Crew see the job, not your pricing, invoices or payroll.</span></div>
            <div><b>Field-ready</b><span>Photos, notes, time and status updates stay connected.</span></div>
          </div>
        </div>

        <form className="login-pro-card" onSubmit={handleSubmit} data-testid="login-form">
          <p className="eyebrow dark">Secure login</p>
          <h2>Welcome back</h2>
          <p className="card-sub">Use your Churvox account to continue.</p>

          {error ? <div className="login-error" data-testid="login-error"><AlertCircle size={18} /><span>{error}</span></div> : null}

          <label>
            <span>Email</span>
            <div className="field"><Mail size={18} /><input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required data-testid="login-email-input" /></div>
          </label>

          <label>
            <span className="label-row">Password <Link to="/forgot-password" data-testid="forgot-password-link">Forgot password?</Link></span>
            <div className="field"><Lock size={18} /><input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required data-testid="login-password-input" /></div>
          </label>

          <button className="submit" type="submit" disabled={loading} data-testid="login-submit-button">{loading ? <Loader2 size={18} className="spin" /> : null}{loading ? "Signing in…" : "Sign in"}</button>

          <p className="signup-line">Don&apos;t have an account? <Link to="/signup" data-testid="signup-link">Start free</Link></p>
          <div className="legal"><Link to="/privacy" data-testid="login-privacy-link">Privacy</Link><Link to="/terms" data-testid="login-terms-link">Terms</Link></div>
        </form>
      </section>

      <style>{`
        .login-pro{min-height:100vh;background:#e8e2d6;color:#101114;font-family:Inter,system-ui,sans-serif}.login-pro-nav{height:74px;background:#101114;color:#fbf8f1;display:flex;align-items:center;justify-content:space-between;padding:0 clamp(16px,4vw,64px);box-shadow:0 18px 50px rgba(16,17,20,.22)}.login-pro-logo{filter:invert(1) grayscale(1) brightness(2);display:flex}.login-pro-nav nav{display:flex;align-items:center;gap:8px}.login-pro-nav a{color:rgba(251,248,241,.72);text-decoration:none;font-weight:800;font-size:14px;padding:10px 12px;border-radius:8px}.login-pro-nav a:hover{background:#242830;color:#fbf8f1}.login-pro-nav .nav-cta{background:#fbf8f1;color:#101114}.login-pro-grid{min-height:calc(100vh - 74px);display:grid;grid-template-columns:minmax(0,1fr) minmax(420px,.58fr);gap:clamp(30px,5vw,82px);align-items:center;padding:clamp(34px,6vw,84px) clamp(16px,4vw,64px);background:linear-gradient(135deg,#101114 0%,#242830 50%,#e8e2d6 50%,#f3eee5 100%)}.login-pro-copy{color:#fbf8f1;max-width:780px}.eyebrow{text-transform:uppercase;letter-spacing:.14em;font-size:12px;font-weight:900;color:#caa46d;margin:0 0 16px}.eyebrow.dark{color:#9b8059}.login-pro-copy h1{font-family:Outfit,Inter,sans-serif;font-size:clamp(50px,7vw,96px);line-height:.9;letter-spacing:-.07em;margin:0;color:#fbf8f1}.lead{font-size:clamp(17px,1.5vw,21px);line-height:1.55;color:rgba(251,248,241,.76);max-width:660px;margin:24px 0 0}.proof-strip{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:rgba(251,248,241,.18);border:1px solid rgba(251,248,241,.18);margin-top:38px}.proof-strip div{background:rgba(16,17,20,.44);padding:18px}.proof-strip b{display:block;color:#fbf8f1;font-size:14px}.proof-strip span{display:block;color:rgba(251,248,241,.62);font-size:12.5px;line-height:1.45;margin-top:6px}.login-pro-card{background:#fbf8f1;border:1px solid #cdc3b3;border-radius:14px;padding:clamp(24px,3vw,34px);box-shadow:0 40px 110px rgba(16,17,20,.22);display:grid;gap:18px}.login-pro-card h2{font-family:Outfit,Inter,sans-serif;font-size:42px;line-height:.95;letter-spacing:-.055em;margin:0;color:#101114}.card-sub{color:#5f6670;margin:-10px 0 4px}.login-error{display:flex;gap:10px;align-items:center;background:#fff0ed;border:1px solid #e6b5ad;color:#9f2418;border-radius:10px;padding:12px 13px;font-weight:800;font-size:13px}.login-pro-card label{display:grid;gap:8px}.login-pro-card label>span{font-size:13px;font-weight:900;color:#242830}.label-row{display:flex;justify-content:space-between;align-items:center;gap:12px}.label-row a{color:#8a5a1f;text-decoration:none;font-size:12.5px;font-weight:900}.field{height:52px;display:flex;align-items:center;gap:11px;background:#fff;border:1px solid #cdc3b3;border-radius:10px;padding:0 14px}.field svg{color:#78808a}.field input{border:0;outline:0;background:transparent;width:100%;height:100%;font-size:15px;color:#101114}.field:focus-within{border-color:#101114;box-shadow:0 0 0 4px rgba(16,17,20,.08)}.submit{height:54px;border:0;border-radius:10px;background:#101114;color:#fbf8f1;font-weight:900;font-size:15px;display:inline-flex;align-items:center;justify-content:center;gap:10px;cursor:pointer;box-shadow:0 16px 36px rgba(16,17,20,.18)}.submit:disabled{opacity:.72;cursor:not-allowed}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.signup-line{text-align:center;color:#5f6670;margin:2px 0 0}.signup-line a,.legal a{color:#101114;font-weight:900;text-decoration:none}.legal{display:flex;justify-content:center;gap:18px}.legal a{color:#78808a;font-size:12px}@media(max-width:980px){.login-pro-grid{grid-template-columns:1fr;background:linear-gradient(180deg,#101114 0%,#242830 52%,#e8e2d6 52%,#f3eee5 100%)}.login-pro-card{max-width:560px;width:100%;justify-self:center}.proof-strip{grid-template-columns:1fr}}@media(max-width:620px){.login-pro-nav{height:66px;padding:0 14px}.login-pro-nav a:not(.nav-cta){display:none}.login-pro-grid{padding:30px 14px}.login-pro-copy h1{font-size:46px}.lead{font-size:16px}.login-pro-card{padding:22px}.login-pro-card h2{font-size:34px}}
      `}</style>
    </main>
  );
}
