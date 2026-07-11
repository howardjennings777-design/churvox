import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import API_BASE from "../../lib/apiBase";
import { saveBusinessSettings } from "../../lib/businessSettings";
import { Nav } from "../marketing/ExecutiveHomePage";
import { COUNTRY_OPTIONS, detectCountryCode, normalizeCountry } from "../../config/churvoxPlans";
import { getIndustry, industryOptions, normalizeIndustry } from "../../config/churvoxIndustrySystem";
import "./AuthPublicCommand.css";

const FIRST_SETUP_KEY = "churvox_first_setup_pending";
const PLAN_REQUIRED_KEY = "churvox_plan_choice_required";
const BUSINESS_REQUIRED_KEY = "churvox_business_profile_required";
const BILLING_PLAN_KEY = "churvox:billing-plan";

const PLAN_ALIASES = {
  start: "start",
  solo: "start",
  crew: "crew",
  team: "crew",
  operator: "operator",
  pro: "operator",
  command: "command",
  enterprise: "command",
};

function queryParams() {
  try { return new URLSearchParams(window.location.search || ""); } catch { return new URLSearchParams(); }
}

function isTesterSignup() {
  const params = queryParams();
  return params.get("tester") === "1" || params.get("tester") === "true" || params.get("free_tester") === "1";
}

function queryEmail() {
  return String(queryParams().get("email") || "").trim().toLowerCase();
}

function queryIndustry() {
  const params = queryParams();
  return normalizeIndustry(params.get("industry") || params.get("business_type") || params.get("trade") || "");
}

function normalizePlanChoice(value) {
  return PLAN_ALIASES[String(value || "").trim().toLowerCase()] || "operator";
}

function initialPlanChoice() {
  const params = queryParams();
  try {
    return normalizePlanChoice(params.get("plan") || params.get("selected_plan") || window.localStorage.getItem(BILLING_PLAN_KEY) || "operator");
  } catch {
    return normalizePlanChoice(params.get("plan") || params.get("selected_plan") || "operator");
  }
}

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

async function refreshCurrentUser(token) {
  try {
    const response = await fetch(`${API_BASE}/api/auth/me`, {
      credentials: "include",
      headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    return await response.json().catch(() => ({}));
  } catch {
    return {};
  }
}

export default function SignupPage() {
  const navigate = useNavigate();
  const { register, checkAuth } = useAuth();
  const testerSignup = isTesterSignup();
  const testerEmail = queryEmail();
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
  const [industry, setIndustry] = useState(queryIndustry);
  const [selectedPlan] = useState(initialPlanChoice);

  const selectedIndustry = getIndustry(industry);
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
    const industryMode = normalizeIndustry(data.get("industry") || industry);
    const industryProfile = getIndustry(industryMode);
    const planChoice = normalizePlanChoice(selectedPlan);

    if (!name) return setError("Enter your full name.");
    if (!email) return setError("Enter your email.");
    if (testerSignup && testerEmail && email !== testerEmail) return setError(`Use the tester email ${testerEmail} so Churvox can unlock the tester access.`);
    if (password !== confirmPassword) return setError("Passwords do not match.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");

    setLoading(true);
    try {
      const result = await register({
        name,
        email,
        password,
        business_name: businessName || null,
        billing_country: billingCountry,
        country: billingCountry,
        trade_industry_type: industryMode,
        industry_mode: industryMode,
        business_type: industryProfile.title,
        selected_plan: planChoice,
        plan_choice: planChoice,
      });
      if (!result?.token) return setError("Registration failed. Please try again.");

      try {
        localStorage.setItem(FIRST_SETUP_KEY, "true");
        localStorage.removeItem("churvox_first_setup_seen");
        localStorage.removeItem("churvox:fresh-demo-mode:v1");
        localStorage.removeItem("churvox:fresh-command-inbox:v1");
        localStorage.removeItem("churvox:fresh-jobs:v1");
        localStorage.setItem("churvox:billing-country", billingCountry);
        localStorage.setItem(BILLING_PLAN_KEY, planChoice);
        localStorage.setItem("churvox:industry-mode", industryMode);
        saveBusinessSettings({
          business_name: businessName || "",
          email,
          country: billingCountry,
          trade_industry_type: industryMode,
          industry_mode: industryMode,
          default_job_types: industryProfile.services || [],
        });
      } catch {}

      sendWelcomeEmail(result.token);

      if (testerSignup) {
        const me = await refreshCurrentUser(result.token);
        try { await checkAuth?.(); } catch {}
        if (me?.has_app_access || me?.free_tester_access || me?.subscription_status === "tester_free" || me?.user?.has_app_access || me?.user?.free_tester_access) {
          try {
            localStorage.removeItem(PLAN_REQUIRED_KEY);
            localStorage.setItem(BUSINESS_REQUIRED_KEY, "true");
          } catch {}
          navigate(`/setup-guide?first_setup=1&tester=1&business_profile=1&industry=${encodeURIComponent(industryMode)}&next=dashboard`, { replace: true });
          return;
        }
        try { localStorage.removeItem(PLAN_REQUIRED_KEY); } catch {}
        navigate(`/contact?tester_signup=1&industry=${encodeURIComponent(industryMode)}`, { replace: true });
        return;
      }

      try {
        localStorage.setItem(PLAN_REQUIRED_KEY, "true");
        localStorage.removeItem(BUSINESS_REQUIRED_KEY);
      } catch {}
      navigate(`/plans?first_setup=1&must_choose_plan=1&country=${encodeURIComponent(billingCountry)}&industry=${encodeURIComponent(industryMode)}&plan=${encodeURIComponent(planChoice)}`, { replace: true });
    } catch (err) {
      setError(err?.response?.data?.detail || err?.response?.data?.message || err?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="cvPublicAuth" data-version="CHURVOX_PUBLIC_SIGNUP_INDUSTRY_PLAN_PATH_20260712">
      <Nav />
      <section className="cvPublicAuthShell cvPublicSignupShell">
        <form className="cvPublicAuthCard" onSubmit={handleSubmit}>
          <p className="cvPublicAuthKicker">{testerSignup ? "Tester access" : "Start trial"}</p>
          <h1>{testerSignup ? "Create your tester account." : "Create your Churvox account."}</h1>
          <p className="cvPublicAuthIntro">
            {testerSignup ? "Use the email you were invited with. Pick the business type so Churvox opens with the right wording and setup." : "Create the account, choose Start, Crew, Operator or Command, then Churvox adapts setup and app wording to the business type."}
          </p>

          {error ? <p className="cvPublicAuthError">{error}</p> : null}

          <div className="cvPublicFormGrid">
            <label>
              Full name
              <input ref={attachInput} onInput={handleInput} onFocus={handleInput} className="cvPublicNativeInput" name="name" autoComplete="name" placeholder="Your name" required />
            </label>
            <label>
              Email
              <input ref={attachInput} onInput={handleInput} onFocus={handleInput} className="cvPublicNativeInput" name="email" type="email" autoComplete="email" placeholder="you@business.co.nz" defaultValue={testerEmail} readOnly={Boolean(testerSignup && testerEmail)} required />
            </label>
            <label>
              Business name
              <input ref={attachInput} onInput={handleInput} onFocus={handleInput} className="cvPublicNativeInput" name="business_name" autoComplete="organization" placeholder="Business name" />
            </label>
            <label>
              Business type
              <select className="cvPublicNativeInput" name="industry" value={industry} onChange={(event) => setIndustry(normalizeIndustry(event.target.value))}>
                {industryOptions(true).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
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

          <p className="cvPublicAuthIntro"><b>{selectedIndustry.title}</b>: {selectedIndustry.intro}</p>
          {!testerSignup ? <p className="cvPublicAuthIntro"><b>Selected plan:</b> {selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)}. You can still change it on the plans screen before Stripe checkout.</p> : null}
          <button className="cvPublicAuthSubmit" type="submit" disabled={loading}>{loading ? "Creating account..." : testerSignup ? "Create tester account" : "Create account and choose plan"}</button>
          <p className="cvPublicAuthBottom">Already have an account? <Link to="/login">Sign in</Link></p>
        </form>

        <aside className="cvPublicAuthPanel">
          <p>{testerSignup ? "Tester path" : "Trial path"}</p>
          <h2>{testerSignup ? "Tester access skips Stripe, not setup logic." : "The whole app follows the business type you choose."}</h2>
          <ul>
            {testerSignup ? (
              <>
                <li>Use the invited tester email.</li>
                <li>Pick the real business type.</li>
                <li>No Stripe checkout or plan picking for testers.</li>
                <li>Churvox opens setup with the right industry mode.</li>
              </>
            ) : (
              <>
                <li>Create the account first.</li>
                <li>Choose Start, Crew, Operator or Command.</li>
                <li>Stripe starts the 14-day trial for the selected plan.</li>
                <li>Then Churvox opens with matching service options and wording.</li>
              </>
            )}
          </ul>
        </aside>
      </section>
    </main>
  );
}
