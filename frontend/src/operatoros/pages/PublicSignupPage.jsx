
import { useState } from "react";
import { API_BASE } from "../api";
import "./PublicSignupPage.css";

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
    <main className="signup-screen">
      <section className="signup-shell">
        <a className="signup-brand" href="/"><span><img src="/brand/churvox-holo-c.svg" alt="" /></span><strong>CHURVOX</strong><small>AI Trade Operator</small></a>
        <div className="signup-grid">
          <section className="signup-copy">
            <p>START YOUR CHURVOX TRIAL</p>
            <h1>Give your business an AI command centre.</h1>
            <p className="signup-lead">Choose your industry so Churvox can shape the setup around your work. Start with jobs, workers, proof, invoices and AI approval-first admin.</p>
            <div className="signup-sales"><article><strong>14-day trial</strong><span>Try Churvox before committing.</span></article><article><strong>Industry presets</strong><span>Setup wording and next steps match your business type.</span></article><article><strong>Approval-first AI</strong><span>AI prepares work. You approve important actions.</span></article></div>
          </section>
          <section className="signup-card">
            <div className="signup-card-head"><p>FREE TRIAL</p><h2>Create your owner account</h2><span>No messy setup. Start with your business details.</span></div>
            {error ? <div className="signup-error">{error}</div> : null}
            <form onSubmit={submit}>
              <label><span>Your name</span><input value={form.name} onChange={(e) => update("name", e.target.value)} autoComplete="name" /></label>
              <label><span>Business name</span><input value={form.business_name} onChange={(e) => update("business_name", e.target.value)} autoComplete="organization" required /></label>
              <label><span>Business type</span><select value={form.industry} onChange={(e) => update("industry", e.target.value)}>{industries.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              <label><span>Email</span><input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} autoComplete="email" required /></label>
              <label><span>Password</span><input type="password" value={form.password} onChange={(e) => update("password", e.target.value)} autoComplete="new-password" minLength={6} required /></label>
              <button type="submit" disabled={busy}>{busy ? "Creating your trial..." : "Start free trial"}</button>
            </form>
            <footer>Already have an account? <a href="/login">Sign in</a></footer>
          </section>
        </div>
      </section>
    </main>
  );
}
