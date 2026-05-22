import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { normalizeRole, getDefaultRoute } from "../../lib/roles";

const getPostLoginPath = (payload = {}) => {
  const user = payload?.user || payload || {};
  const email = String(user?.email || payload?.email || "").trim().toLowerCase();
  const isPlatformOwner = email === "hello@churvox.com" || user?.is_platform_owner === true || user?.is_admin === true;
  if (isPlatformOwner) return "/admin";
  return getDefaultRoute(normalizeRole(user?.role || payload?.role));
};

export default function HomeInlineLogin() {
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
    <section className="home-login-panel" id="home-login" aria-label="Log in to Churvox">
      <div className="home-login-copy">
        <p className="home-kicker">Already using Churvox?</p>
        <h2>Log in from the front page.</h2>
        <p>Open your operator desk without leaving the website.</p>
      </div>

      <form className="home-login-form" onSubmit={handleSubmit} data-testid="home-login-form">
        {error ? <div className="home-login-error" data-testid="home-login-error"><AlertCircle size={17} /><span>{error}</span></div> : null}
        <label>
          <span>Email</span>
          <div className="home-login-field"><Mail size={17} /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required data-testid="home-login-email-input" /></div>
        </label>
        <label>
          <span>Password</span>
          <div className="home-login-field"><Lock size={17} /><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required data-testid="home-login-password-input" /></div>
        </label>
        <button type="submit" disabled={loading} data-testid="home-login-submit-button">
          {loading ? <Loader2 size={17} className="home-login-spin" /> : null}
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <style>{`
        .home-login-panel{display:grid;grid-template-columns:minmax(0,.8fr) minmax(420px,1.2fr);gap:22px;align-items:center;background:#101114;color:#fbf8f1;margin:0 clamp(18px,4vw,64px) clamp(44px,6vw,70px);padding:clamp(24px,3vw,34px);border-radius:14px;box-shadow:0 24px 70px rgba(16,17,20,.18);scroll-margin-top:90px}.home-login-copy h2{font-family:Outfit,Inter,sans-serif;font-size:clamp(30px,4vw,54px);line-height:.94;letter-spacing:-.055em;margin:0;color:#fbf8f1}.home-login-copy p:not(.home-kicker){color:rgba(251,248,241,.68);line-height:1.5;margin:12px 0 0}.home-login-form{display:grid;grid-template-columns:1fr 1fr auto;gap:12px;align-items:end}.home-login-form label{display:grid;gap:7px}.home-login-form label>span{font-size:12px;font-weight:900;color:rgba(251,248,241,.74)}.home-login-field{height:50px;display:flex;align-items:center;gap:10px;background:#fbf8f1;border:1px solid #cdc3b3;border-radius:9px;padding:0 12px}.home-login-field svg{color:#78808a}.home-login-field input{border:0;outline:0;background:transparent;width:100%;height:100%;font-size:14px;color:#101114}.home-login-field:focus-within{border-color:#c58a2b;box-shadow:0 0 0 4px rgba(197,138,43,.14)}.home-login-form button{height:50px;border:0;border-radius:9px;background:#fbf8f1;color:#101114;font-weight:900;padding:0 20px;display:inline-flex;align-items:center;justify-content:center;gap:9px;cursor:pointer;white-space:nowrap}.home-login-form button:disabled{opacity:.7;cursor:not-allowed}.home-login-error{grid-column:1/-1;display:flex;align-items:center;gap:9px;background:#fff0ed;border:1px solid #e6b5ad;color:#9f2418;border-radius:9px;padding:11px 12px;font-weight:800;font-size:13px}.home-login-spin{animation:home-login-spin 1s linear infinite}@keyframes home-login-spin{to{transform:rotate(360deg)}}@media(max-width:980px){.home-login-panel{grid-template-columns:1fr}.home-login-form{grid-template-columns:1fr 1fr}}@media(max-width:640px){.home-login-panel{margin-left:14px;margin-right:14px;padding:20px}.home-login-form{grid-template-columns:1fr}.home-login-form button{width:100%}}
      `}</style>
    </section>
  );
}
