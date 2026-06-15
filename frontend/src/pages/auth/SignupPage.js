import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import API_BASE from "../../lib/apiBase";
import { saveBusinessSettings } from "../../lib/businessSettings";
import { Nav } from "../marketing/ExecutiveHomePage";
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
  el.style.setProperty("font-size", "17px", "important");
  el.style.setProperty("font-weight", "800", "important");
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

    if (!name) return setError("Enter your full name.");
    if (!email) return setError("Enter your email.");
    if (password !== confirmPassword) return setError("Passwords do not match.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");

    setLoading(true);
    try {
      const result = await register({ name, email, password, business_name: businessName || null });
      if (!result?.token) return setError("Registration failed. Please try again.");

      try {
        localStorage.setItem(FIRST_SETUP_KEY, "true");
        localStorage.setItem(PLAN_REQUIRED_KEY, "true");
        localStorage.removeItem("churvox_first_setup_seen");
        localStorage.removeItem("churvox:fresh-demo-mode:v1");
        localStorage.removeItem("churvox:fresh-command-inbox:v1");
        localStorage.removeItem("churvox:fresh-jobs:v1");
        saveBusinessSettings({ business_name: businessName || "", email });
      } catch {}

      sendWelcomeEmail(result.token);
      navigate("/plans?first_setup=1&must_choose_plan=1", { replace: true });
    } catch (err) {
      setError(err?.response?.data?.detail || err?.response?.data?.message || err?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="cvPublicAuth">
      <Nav />
      <section className="cvPublicAuthShell">
        <form className="cvPublicAuthCard" onSubmit={handleSubmit}>
          <p className="cvPublicAuthKicker">Create account</p>
          <h1>Start your Churvox trial.</h1>
          <p className="cvPublicAuthIntro">Create your account first, then choose a plan and add card details in Stripe to start the 14-day trial.</p>
          {error ? <p className="cvPublicAuthError">{error}</p> : null}
          <label>Full name<input ref={attachInput} onInput={handleInput} onFocus={handleInput} className="cvPublicNativeInput" name="name" autoComplete="name" placeholder="Your name" required /></label>
          <label>Email<input ref={attachInput} onInput={handleInput} onFocus={handleInput} className="cvPublicNativeInput" name="email" type="email" autoComplete="email" placeholder="hello@churvox.com" required /></label>
          <label>Business name<input ref={attachInput} onInput={handleInput} onFocus={handleInput} className="cvPublicNativeInput" name="business_name" autoComplete="organization" placeholder="Business name" /></label>
          <label>Password<input ref={attachInput} onInput={handleInput} onFocus={handleInput} className="cvPublicNativeInput" name="password" type="password" autoComplete="new-password" placeholder="Password" required /></label>
          <label>Confirm password<input ref={attachInput} onInput={handleInput} onFocus={handleInput} className="cvPublicNativeInput" name="confirmPassword" type="password" autoComplete="new-password" placeholder="Confirm password" required /></label>
          <button className="cvPublicAuthSubmit" type="submit" disabled={loading}>{loading ? "Creating account..." : "Create account and choose plan"}</button>
          <p className="cvPublicAuthBottom">Already have an account? <Link to="/login">Sign in</Link></p>
        </form>
        <aside className="cvPublicAuthPanel"><p>Choose your plan after signup</p><h2>Pick Start, Crew, Operator or Command before entering the app.</h2><ul><li>14-day Stripe trial with card details</li><li>Your plan controls which features are available</li><li>After choosing, Churvox opens the setup guide</li></ul></aside>
      </section>
    </main>
  );
}
