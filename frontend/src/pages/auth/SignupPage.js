import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import API_BASE from "../../lib/apiBase";
import { saveBusinessSettings } from "../../lib/businessSettings";
import { Nav } from "../marketing/ExecutiveHomePage";
import { COUNTRY_OPTIONS, detectCountryCode, normalizeCountry } from "../../config/churvoxPlans";
import "./AuthPublicCommand.css";

const FIRST_SETUP_KEY = "churvox_first_setup_pending";
const PLAN_REQUIRED_KEY = "churvox_plan_choice_required";

function lockInputText(el) {
  if (!el) return;
  el.style.setProperty("color", "#000000", "important");
  el.style.setProperty("-webkit-text-fill-color", "#000000", "important");
  el.style.setProperty("caret-color", "#000000", "important");
  el.style.setProperty("background", "#ffffff", "important");
  el.style.setProperty("background-color", "#ffffff", "important");
  el.style.setProperty("opacity", "1", "important");
  el.style.setProperty("visibility", "visible", "important");
  el.style.setProperty("filter", "none", "important");
  el.style.setProperty("text-shadow", "none", "important");
  el.style.setProperty("mix-blend-mode", "normal", "important");
  el.style.setProperty("font-size", "16px", "important");
  el.style.setProperty("font-weight", "850", "important");
}

async function sendWelcomeEmail(token) {
  try {
    await fetch(`${API_BASE}/api/lifecycle/welcome`, {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
  } catch {
    // Never block signup because of email.
  }
}

export default function SignupPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [country, setCountry] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search || "");
      return normalizeCountry(params.get("country") || detectCountryCode());
    } catch {
      return detectCountryCode();
    }
  });

  const attachInput = (el) => lockInputText(el);
  const handleInput = (e) => lockInputText(e.currentTarget);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim().toLowerCase();
    const businessName = String(data.get("business_name") || "").trim();
    const password = String(data.get("password") || "");
    const confirmPassword = String(data.get("confirmPassword") || "");
    const billingCountry = normalizeCountry(data.get("country") || country);

    if (!name) return setError("Enter your full name.");
    if (!email) return setError("Enter your email.");
    if (password !== confirmPassword) return setError("Passwords do not match.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");

    setLoading(true);
    try {
      const result = await register({ name, email, password, business_name: businessName || null, billing_country: billingCountry, country: billingCountry });
      if (!result?.token) return setError("Registration failed. Please try again.");

      try {
        localStorage.setItem(FIRST_SETUP_KEY, "true");
        localStorage.setItem(PLAN_REQUIRED_KEY, "true");
        localStorage.removeItem("churvox_first_setup_seen");
        localStorage.removeItem("churvox:fresh-demo-mode:v1");
        localStorage.removeItem("churvox:fresh-command-inbox:v1");
        localStorage.removeItem("churvox:fresh-jobs:v1");
        localStorage.setItem("churvox:billing-country", billingCountry);
        saveBusinessSettings({ business_name: businessName || "", email, country: billingCountry });
      } catch {}

      sendWelcomeEmail(result.token);
      navigate(`/plans?first_setup=1&must_choose_plan=1&country=${encodeURIComponent(billingCountry)}`, { replace: true });
    } catch (err) {
      setError(err?.response?.data?.detail || err?.response?.data?.message || err?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="cvPublicAuth" data-version="CHURVOX_PUBLIC_SIGNUP_MODERN_OS_20260629">
      <Nav />
      <section className="cvPublicAuthShell cvPublicSignupShell">
        <form className="cvPublicAuthCard" onSubmit={handleSubmit}>
          <p className="cvPublicAuthKicker">Start trial</p>
          <h1>Create your Churvox account.</h1>
          <p className="cvPublicAuthIntro">
            Create the account, choose Start, Crew, Operator or Command, then Churvox opens the setup path for your business.
          </p>

          {error ? <p className="cvPublicAuthError">{error}</p> : null}

          <div className="cvPublicFormGrid">
            <label>
              Full name
              <input ref={attachInput} onInput={handleInput} onFocus={handleInput} className="cvPublicNativeInput" name="name" autoComplete="name" placeholder="Your name" required />
            </label>
            <label>
              Email
              <input ref={attachInput} onInput={handleInput} onFocus={handleInput} className="cvPublicNativeInput" name="email" type="email" autoComplete="email" placeholder="you@business.co.nz" required />
            </label>
            <label>
              Business name
              <input ref={attachInput} onInput={handleInput} onFocus={handleInput} className="cvPublicNativeInput" name="business_name" autoComplete="organization" placeholder="Business name" />
            </label>
            <label>
              Country / pricing region
              <select className="cvPublicNativeInput" name="country" value={country} onChange={(event) => setCountry(normalizeCountry(event.target.value))}>
                {COUNTRY_OPTIONS.map((item) => <option key={item.code} value={item.code}>{item.label} - {item.currency}</option>)}
              </select>
            </label>
            <label>
              Password
              <input ref={attachInput} onInput={handleInput} onFocus={handleInput} className="cvPublicNativeInput" name="password" type="password" autoComplete="new-password" placeholder="Password" required />
            </label>
            <label>
              Confirm password
              <input ref={attachInput} onInput={handleInput} onFocus={handleInput} className="cvPublicNativeInput" name="confirmPassword" type="password" autoComplete="new-password" placeholder="Confirm password" required />
            </label>
          </div>

          <button className="cvPublicAuthSubmit" type="submit" disabled={loading}>{loading ? "Creating account..." : "Create account and choose plan"}</button>
          <p className="cvPublicAuthBottom">Already have an account? <Link to="/login">Sign in</Link></p>
        </form>

        <aside className="cvPublicAuthPanel">
          <p>Trial path</p>
          <h2>Start clean. Choose the plan. Then set up the OS.</h2>
          <ul>
            <li>Create the account first.</li>
            <li>Choose Start, Crew, Operator or Command.</li>
            <li>Stripe starts the 14-day trial for the selected plan.</li>
            <li>After checkout, Churvox opens setup and Command.</li>
          </ul>
        </aside>
      </section>
    </main>
  );
}
