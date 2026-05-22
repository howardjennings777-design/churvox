import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Mail, Lock, User, Building2, AlertCircle, Loader2 } from "lucide-react";
import { ChurvoxLogo } from "@/components/ChurvoxLogo";

export default function SignupPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({ name: "", email: "", password: "", confirmPassword: "", business_name: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (formData.password !== formData.confirmPassword) { setError("Passwords do not match"); return; }
    if (formData.password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      const result = await register({ name: formData.name, email: formData.email, password: formData.password, business_name: formData.business_name || null });
      if (result?.token) navigate("/plans");
      else setError("Registration failed. Please try again.");
    } catch (err) {
      setError(err?.response?.data?.detail || "Registration failed. Please try again.");
    }
    setLoading(false);
  };

  return (
    <main className="signup-site">
      <header className="signup-nav">
        <Link to="/" className="signup-logo"><ChurvoxLogo /></Link>
        <nav><Link to="/features">Features</Link><Link to="/pricing">Pricing</Link><Link to="/login" className="nav-cta">Log in</Link></nav>
      </header>

      <section className="signup-stage">
        <div className="signup-copy">
          <p className="signup-kicker">Start your AI front desk</p>
          <h1>Set up the admin engine once. Let Churvox prepare the work.</h1>
          <p>Jobs, quotes, invoices, worker actions, follow-ups and missing details come back to one owner approval desk.</p>
          <div className="signup-proof">
            <div><b>Churvox prepares</b><span>Invoice drafts, quote follow-ups, worker actions and customer/admin messages.</span></div>
            <div><b>You approve</b><span>No blind sending, no pricing changes, no syncs without owner control.</span></div>
            <div><b>The business moves</b><span>Workers get clarity, clients get clean docs, money stays visible.</span></div>
          </div>
        </div>

        <form className="signup-card" onSubmit={handleSubmit}>
          <p className="signup-kicker dark">Create account</p>
          <h2>Start free</h2>
          <p className="card-sub">Create your Churvox account in under a minute.</p>

          {error ? <div className="signup-error" data-testid="signup-error"><AlertCircle size={18} /><span>{error}</span></div> : null}

          <label><span>Full name</span><div className="signup-field"><User size={18} /><input name="name" value={formData.name} onChange={handleChange} placeholder="John Smith" required data-testid="signup-name-input" /></div></label>
          <label><span>Email</span><div className="signup-field"><Mail size={18} /><input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="you@example.com" required data-testid="signup-email-input" /></div></label>
          <label><span>Business name</span><div className="signup-field"><Building2 size={18} /><input name="business_name" value={formData.business_name} onChange={handleChange} placeholder="Smith Plumbing" data-testid="signup-business-input" /></div></label>
          <div className="signup-two">
            <label><span>Password</span><div className="signup-field"><Lock size={18} /><input name="password" type="password" value={formData.password} onChange={handleChange} placeholder="••••••••" required data-testid="signup-password-input" /></div></label>
            <label><span>Confirm</span><div className="signup-field"><Lock size={18} /><input name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••" required data-testid="signup-confirm-password-input" /></div></label>
          </div>

          <button className="signup-submit" type="submit" disabled={loading} data-testid="signup-submit-button">{loading ? <Loader2 size={18} className="signup-spin" /> : null}{loading ? "Creating account…" : "Create account"}</button>

          <p className="signin-line">Already have an account? <Link to="/login" data-testid="login-link">Sign in</Link></p>
          <p className="terms-line">By creating an account, you agree to our <Link to="/terms" data-testid="signup-terms-link">Terms</Link> and <Link to="/privacy" data-testid="signup-privacy-link">Privacy Policy</Link>.</p>
        </form>
      </section>

      <style>{`
        .signup-site{min-height:100vh;background:#e8e2d6;color:#101114;font-family:Inter,system-ui,sans-serif}.signup-nav{height:74px;background:#101114;color:#fbf8f1;display:flex;align-items:center;justify-content:space-between;padding:0 clamp(16px,4vw,64px);box-shadow:0 18px 50px rgba(16,17,20,.22)}.signup-logo{display:flex;filter:invert(1) grayscale(1) brightness(2)}.signup-nav nav{display:flex;align-items:center;gap:8px}.signup-nav a{color:rgba(251,248,241,.72);text-decoration:none;font-weight:800;font-size:14px;padding:10px 12px;border-radius:8px}.signup-nav a:hover{background:#242830;color:#fbf8f1}.signup-nav .nav-cta{background:#fbf8f1;color:#101114}.signup-stage{min-height:calc(100vh - 74px);display:grid;grid-template-columns:minmax(0,.92fr) minmax(430px,.62fr);gap:clamp(28px,5vw,76px);align-items:center;padding:clamp(34px,6vw,84px) clamp(16px,4vw,64px);background:linear-gradient(135deg,#101114 0%,#242830 50%,#e8e2d6 50%,#f3eee5 100%)}.signup-copy{color:#fbf8f1;max-width:820px}.signup-kicker{text-transform:uppercase;letter-spacing:.14em;font-size:12px;font-weight:900;color:#caa46d;margin:0 0 16px}.signup-kicker.dark{color:#9b8059}.signup-copy h1{font-family:Outfit,Inter,sans-serif;font-size:clamp(48px,6.5vw,92px);line-height:.9;letter-spacing:-.07em;margin:0;color:#fbf8f1}.signup-copy>p{font-size:clamp(17px,1.5vw,21px);line-height:1.55;color:rgba(251,248,241,.76);max-width:690px;margin:24px 0 0}.signup-proof{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:rgba(251,248,241,.18);border:1px solid rgba(251,248,241,.18);margin-top:34px}.signup-proof div{background:rgba(16,17,20,.44);padding:18px}.signup-proof b{display:block;color:#fbf8f1;font-size:14px}.signup-proof span{display:block;color:rgba(251,248,241,.62);font-size:12.5px;line-height:1.45;margin-top:6px}.signup-card{background:#fbf8f1;border:1px solid #cdc3b3;border-radius:14px;padding:clamp(24px,3vw,34px);box-shadow:0 40px 110px rgba(16,17,20,.22);display:grid;gap:15px}.signup-card h2{font-family:Outfit,Inter,sans-serif;font-size:42px;line-height:.95;letter-spacing:-.055em;margin:0;color:#101114}.card-sub{color:#5f6670;margin:-6px 0 4px}.signup-error{display:flex;gap:10px;align-items:center;background:#fff0ed;border:1px solid #e6b5ad;color:#9f2418;border-radius:10px;padding:12px 13px;font-weight:800;font-size:13px}.signup-card label{display:grid;gap:7px}.signup-card label>span{font-size:13px;font-weight:900;color:#242830}.signup-field{height:50px;display:flex;align-items:center;gap:11px;background:#fff;border:1px solid #cdc3b3;border-radius:10px;padding:0 14px}.signup-field svg{color:#78808a}.signup-field input{border:0;outline:0;background:transparent;width:100%;height:100%;font-size:15px;color:#101114}.signup-field:focus-within{border-color:#101114;box-shadow:0 0 0 4px rgba(16,17,20,.08)}.signup-two{display:grid;grid-template-columns:1fr 1fr;gap:12px}.signup-submit{height:54px;border:0;border-radius:10px;background:#101114;color:#fbf8f1;font-weight:900;font-size:15px;display:inline-flex;align-items:center;justify-content:center;gap:10px;cursor:pointer;box-shadow:0 16px 36px rgba(16,17,20,.18)}.signup-submit:disabled{opacity:.72;cursor:not-allowed}.signup-spin{animation:signup-spin 1s linear infinite}@keyframes signup-spin{to{transform:rotate(360deg)}}.signin-line,.terms-line{text-align:center;color:#5f6670;margin:0}.signin-line a,.terms-line a{color:#101114;font-weight:900;text-decoration:none}.terms-line{font-size:12px;line-height:1.45;color:#78808a}@media(max-width:980px){.signup-stage{grid-template-columns:1fr;background:linear-gradient(180deg,#101114 0%,#242830 50%,#e8e2d6 50%,#f3eee5 100%)}.signup-card{max-width:560px;width:100%;justify-self:center}.signup-proof{grid-template-columns:1fr}}@media(max-width:620px){.signup-nav{height:66px;padding:0 14px}.signup-nav a:not(.nav-cta){display:none}.signup-stage{padding:30px 14px}.signup-copy h1{font-size:44px}.signup-copy>p{font-size:16px}.signup-two{grid-template-columns:1fr}.signup-card{padding:22px}.signup-card h2{font-size:34px}}
      `}</style>
    </main>
  );
}
