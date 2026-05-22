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
    <main className="login-exec">
      <header className="login-exec-nav">
        <Link to="/" className="login-exec-logo" aria-label="Churvox home"><ChurvoxLogo /></Link>
        <nav>
          <Link to="/features">Features</Link>
          <Link to="/pricing">Pricing</Link>
          <Link to="/signup" className="nav-primary">Start free</Link>
        </nav>
      </header>

      <section className="login-exec-stage">
        <div className="login-form-shell">
          <div className="login-form-head">
            <p>Secure operator login</p>
            <h1>Welcome back.</h1>
            <span>Sign in to open your Churvox front desk.</span>
          </div>

          <form onSubmit={handleSubmit} data-testid="login-form">
            {error ? (
              <div className="login-error" data-testid="login-error"><AlertCircle size={18} /><span>{error}</span></div>
            ) : null}

            <label>
              <span>Email address</span>
              <div className="login-field"><Mail size={18} /><input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required data-testid="login-email-input" /></div>
            </label>

            <label>
              <span className="password-row">Password <Link to="/forgot-password" data-testid="forgot-password-link">Forgot?</Link></span>
              <div className="login-field"><Lock size={18} /><input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required data-testid="login-password-input" /></div>
            </label>

            <button type="submit" disabled={loading} data-testid="login-submit-button">
              {loading ? <Loader2 size={18} className="spin" /> : null}
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <footer>
            <p>No account yet? <Link to="/signup" data-testid="signup-link">Start free</Link></p>
            <div><Link to="/privacy" data-testid="login-privacy-link">Privacy</Link><Link to="/terms" data-testid="login-terms-link">Terms</Link></div>
          </footer>
        </div>

        <aside className="login-preview">
          <div className="preview-bar"><b>Churvox Front Desk</b><span>Owner view</span></div>
          <div className="preview-body">
            <div className="preview-main">
              <small>Operator queue</small>
              <div className="preview-row active"><div><b>Invoice ready for approval</b><p>Completed job · photos attached</p></div><em>Review</em></div>
              <div className="preview-row"><div><b>Worker needs assignment</b><p>Tomorrow · no crew selected</p></div><em>Assign</em></div>
              <div className="preview-row"><div><b>Quote follow-up drafted</b><p>Waiting 4 days · customer not replied</p></div><em>Draft</em></div>
            </div>
            <div className="preview-sheet">
              <small>Work slip</small>
              <h2>Prepared admin, waiting on you.</h2>
              <p>Churvox shows the reason, the facts, and the action before anything leaves the business.</p>
            </div>
          </div>
        </aside>
      </section>

      <style>{`
        .login-exec{min-height:100vh;background:#e8e2d6;color:#101114;font-family:Inter,system-ui,sans-serif}.login-exec-nav{height:74px;background:#101114;color:#fbf8f1;display:flex;align-items:center;justify-content:space-between;padding:0 clamp(16px,4vw,64px);box-shadow:0 18px 50px rgba(16,17,20,.22)}.login-exec-logo{display:flex;filter:invert(1) grayscale(1) brightness(2)}.login-exec-nav nav{display:flex;gap:8px;align-items:center}.login-exec-nav a{color:rgba(251,248,241,.72);text-decoration:none;font-weight:800;font-size:14px;padding:10px 12px;border-radius:8px}.login-exec-nav a:hover{background:#242830;color:#fbf8f1}.login-exec-nav .nav-primary{background:#fbf8f1;color:#101114}.login-exec-stage{min-height:calc(100vh - 74px);display:grid;grid-template-columns:minmax(380px,.42fr) minmax(520px,.58fr);gap:clamp(24px,4vw,58px);align-items:center;padding:clamp(28px,5vw,76px) clamp(16px,4vw,64px);background:linear-gradient(135deg,#101114 0%,#101114 42%,#e8e2d6 42%,#f3eee5 100%)}.login-form-shell{background:#fbf8f1;border:1px solid #cdc3b3;border-radius:12px;padding:clamp(24px,3vw,36px);box-shadow:0 38px 110px rgba(16,17,20,.24);max-width:480px;width:100%;justify-self:end}.login-form-head p,.preview-main small,.preview-sheet small{text-transform:uppercase;letter-spacing:.14em;font-size:11px;font-weight:900;color:#9b8059;margin:0 0 12px}.login-form-head h1{font-family:Outfit,Inter,sans-serif;font-size:clamp(38px,4vw,54px);line-height:.94;letter-spacing:-.06em;margin:0;color:#101114}.login-form-head span{display:block;margin-top:10px;color:#5f6670}.login-form-shell form{display:grid;gap:18px;margin-top:26px}.login-error{display:flex;gap:10px;align-items:center;background:#fff0ed;border:1px solid #e6b5ad;color:#9f2418;border-radius:9px;padding:12px 13px;font-weight:800;font-size:13px}.login-form-shell label{display:grid;gap:8px}.login-form-shell label>span{font-size:13px;font-weight:900;color:#242830}.password-row{display:flex;justify-content:space-between;gap:12px}.password-row a{color:#8a5a1f;text-decoration:none;font-weight:900}.login-field{height:52px;display:flex;align-items:center;gap:11px;background:#fff;border:1px solid #cdc3b3;border-radius:9px;padding:0 14px}.login-field svg{color:#78808a}.login-field input{border:0;outline:0;background:transparent;width:100%;height:100%;font-size:15px;color:#101114}.login-field:focus-within{border-color:#101114;box-shadow:0 0 0 4px rgba(16,17,20,.08)}.login-form-shell button{height:54px;border:0;border-radius:9px;background:#101114;color:#fbf8f1;font-weight:900;font-size:15px;display:flex;align-items:center;justify-content:center;gap:10px;cursor:pointer;box-shadow:0 16px 36px rgba(16,17,20,.18)}.login-form-shell button:disabled{opacity:.72}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.login-form-shell footer{margin-top:22px;text-align:center}.login-form-shell footer p{margin:0;color:#5f6670}.login-form-shell footer a{color:#101114;font-weight:900;text-decoration:none}.login-form-shell footer div{display:flex;justify-content:center;gap:18px;margin-top:16px}.login-form-shell footer div a{color:#78808a;font-size:12px}.login-preview{background:#101114;color:#fbf8f1;border:1px solid #343a44;border-radius:14px;box-shadow:0 44px 120px rgba(16,17,20,.34);padding:14px;min-height:560px}.preview-bar{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #343a44;padding:8px 8px 14px}.preview-bar b{font-size:13px}.preview-bar span{font-size:12px;color:#caa46d;font-weight:900}.preview-body{display:grid;grid-template-columns:1.1fr .9fr;gap:14px;padding-top:14px;height:calc(100% - 43px)}.preview-main,.preview-sheet{background:#181c22;border:1px solid #343a44;border-radius:12px;padding:18px}.preview-row{display:flex;justify-content:space-between;gap:12px;background:#101114;border:1px solid #343a44;border-radius:10px;padding:15px;margin-top:10px}.preview-row.active{border-color:#c58a2b;box-shadow:inset 3px 0 0 #c58a2b}.preview-row b{font-size:14px}.preview-row p{margin:4px 0 0;color:#9aa2ad;font-size:12px}.preview-row em{font-style:normal;font-size:12px;font-weight:900;background:#fbf8f1;color:#101114;border-radius:999px;padding:6px 9px;height:max-content}.preview-sheet h2{font-family:Outfit,Inter,sans-serif;font-size:clamp(32px,3.2vw,48px);line-height:.96;letter-spacing:-.055em;margin:0 0 16px;color:#fbf8f1}.preview-sheet p{color:rgba(251,248,241,.68);line-height:1.55}@media(max-width:980px){.login-exec-stage{grid-template-columns:1fr;background:linear-gradient(180deg,#101114 0%,#101114 36%,#e8e2d6 36%,#f3eee5 100%)}.login-form-shell{justify-self:center}.login-preview{min-height:auto}.preview-body{grid-template-columns:1fr}}@media(max-width:640px){.login-exec-nav{height:66px;padding:0 14px}.login-exec-nav a:not(.nav-primary){display:none}.login-exec-stage{padding:24px 14px}.login-preview{display:none}.login-form-shell{padding:22px}}
      `}</style>
    </main>
  );
}
