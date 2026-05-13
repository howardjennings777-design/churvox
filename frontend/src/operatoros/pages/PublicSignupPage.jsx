import { useState } from "react";
import { API_BASE } from "../api";
import "./ForcedLoginPage.css";

const industries = ["Lawn care","Property maintenance","Cleaning","Landscaping","Handyman","Painting","Plumbing","Electrical","Pest control","Gardening","Other"];

function saveAuth(payload, email, businessName, industry) {
  const data = payload?.data || payload || {};
  const token = data.access_token || data.token || data.jwt || data.auth_token || data?.user?.token || "";
  const user = data.user || data.profile || { email, business_name: businessName, industry, role: "owner" };
  try {
    if (token) {
      localStorage.setItem("token", token);
      localStorage.setItem("authToken", token);
      localStorage.setItem("access_token", token);
    }
    localStorage.setItem("churvox_user", JSON.stringify({ ...user, industry }));
    localStorage.setItem("user", JSON.stringify({ ...user, industry }));
    localStorage.setItem("churvox_role", "owner");
    localStorage.setItem("role", "owner");
    localStorage.setItem("email", email);
    localStorage.setItem("churvox_owner_name", businessName || email || "Owner");
    localStorage.setItem("churvox_industry", industry);
    localStorage.setItem("churvox_show_first_login_guide", "true");
  } catch {}
}

async function postJson(path, body) {
  const res = await fetch(`${API_BASE}/${String(path).replace(/^\/+/, "")}`, {
    method: "POST",
    credentials: "include",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  if (!res.ok) throw new Error(payload?.detail || payload?.message || payload?.error || `${path} failed`);
  return payload;
}

export default function PublicSignupPage() {
  const [form, setForm] = useState({ name: "", business_name: "", industry: "Property maintenance", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  function update(name, value) { setForm((current) => ({ ...current, [name]: value })); }

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const email = form.email.trim().toLowerCase();
    const businessName = form.business_name.trim();
    const industry = form.industry;
    const payload = {
      name: form.name.trim() || businessName || email,
      full_name: form.name.trim() || businessName || email,
      business_name: businessName,
      company_name: businessName,
      industry,
      business_type: industry,
      email,
      password: form.password,
      role: "owner",
      account_type: "owner",
      plan: "trial",
      source: "public_trial_signup",
    };
    try {
      const registerResult = await postJson("/auth/register", payload);
      saveAuth(registerResult, email, businessName, industry);
      try { await postJson("/billing/start-trial", { plan: "team", source: "public_signup", industry }); } catch {}
      window.location.href = "/dashboard";
    } catch (err) {
      setError(err.message || "Could not create your trial account. Please check the details and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="force-login-page">
      <section className="force-login-shell">
        <div className="force-login-copy">
          <a className="force-login-brand" href="/">
            <span><img src="/brand/churvox-holo-c.svg" alt="" /></span>
            <div><strong>CHURVOX</strong><small>AI TRADE OPERATOR</small></div>
          </a>

          <p>START FREE TRIAL</p>
          <h1>Build your AI command centre.</h1>
          <span>
            Set up your business, choose your trade, and let Churvox prepare jobs, crew, invoices, proof and follow-ups for owner approval.
          </span>

          <div className="force-login-pills">
            <b>No card needed</b>
            <b>Approval-first AI</b>
            <b>Built for crews</b>
          </div>

          <div className="force-auth-stats">
            <article><strong>Smart Hub</strong><span>Your daily command centre for jobs, cashflow and approvals.</span></article>
            <article><strong>Proof-to-Paid</strong><span>Turn completed work into invoice-ready admin faster.</span></article>
            <article><strong>Crew workflow</strong><span>Mobile-first jobs, notes, photos and simple worker actions.</span></article>
          </div>
        </div>

        <form className="force-login-card force-signup-card" onSubmit={submit}>
          <img src="/brand/churvox-holo-c.svg" alt="" />
          <p>Trial setup</p>
          <h2>Start free trial</h2>
          <span>Create your owner account and open your Churvox command centre.</span>

          <label><small>Your name</small><input value={form.name} onChange={(e) => update("name", e.target.value)} autoComplete="name" /></label>
          <label><small>Business name</small><input value={form.business_name} onChange={(e) => update("business_name", e.target.value)} autoComplete="organization" required /></label>
          <label><small>Business type</small><select value={form.industry} onChange={(e) => update("industry", e.target.value)}>{industries.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label><small>Email</small><input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} autoComplete="email" required /></label>
          <label><small>Password</small><input type="password" value={form.password} onChange={(e) => update("password", e.target.value)} autoComplete="new-password" minLength={6} required /></label>
          {error ? <p className="force-login-error">{error}</p> : null}
          <button type="submit" disabled={busy}>{busy ? "Creating your trial..." : "Start free trial"}</button>
          <small>Already have an account? <a href="/login">Sign in</a></small>
        </form>
      </section>
    </main>
  );
}
