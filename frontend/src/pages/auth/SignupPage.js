import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { saveBusinessSettings } from "../../lib/businessSettings";
import { Nav } from "../marketing/ExecutiveHomePage";
import { COUNTRY_OPTIONS, detectCountryCode, normalizeCountry } from "../../config/churvoxPlans";
import { getIndustry, industryOptions, normalizeIndustry } from "../../config/churvoxIndustrySystem";
import "./AuthPublicCommand.css";

const FIRST_SETUP_KEY = "churvox_first_setup_pending";
const PLAN_REQUIRED_KEY = "churvox_plan_choice_required";
const BUSINESS_REQUIRED_KEY = "churvox_business_profile_required";
const BILLING_PLAN_KEY = "churvox:billing-plan";
const LEGAL_VERSION = "2026-07-12";

const PLAN_ALIASES = {
  start: "start", solo: "start",
  crew: "crew", team: "crew",
  operator: "operator", pro: "operator",
  command: "command", enterprise: "command",
};

const PLAN_LABELS = {
  start: "Start",
  crew: "Crew",
  operator: "Operator",
  command: "Command",
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
    return normalizePlanChoice(params.get("plan") || params.get("selected_plan") || localStorage.getItem(BILLING_PLAN_KEY) || "operator");
  } catch {
    return normalizePlanChoice(params.get("plan") || params.get("selected_plan") || "operator");
  }
}

function lockInputText(element) {
  if (!element) return;
  element.style.setProperty("color", "#000000", "important");
  element.style.setProperty("-webkit-text-fill-color", "#000000", "important");
  element.style.setProperty("caret-color", "#000000", "important");
  element.style.setProperty("background", "#ffffff", "important");
  element.style.setProperty("background-color", "#ffffff", "important");
  element.style.setProperty("opacity", "1", "important");
  element.style.setProperty("visibility", "visible", "important");
  element.style.setProperty("filter", "none", "important");
  element.style.setProperty("text-shadow", "none", "important");
  element.style.setProperty("mix-blend-mode", "normal", "important");
  element.style.setProperty("font-size", "16px", "important");
  element.style.setProperty("font-weight", "850", "important");
}

function verificationPath(email, testerSignup, industryMode, planChoice) {
  const params = new URLSearchParams({ pending: "1", email });
  if (testerSignup) params.set("tester", "1");
  if (industryMode) params.set("industry", industryMode);
  if (planChoice) params.set("plan", planChoice);
  return `/verify-email?${params.toString()}`;
}

export default function SignupPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
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
  const attachInput = (element) => lockInputText(element);
  const handleInput = (event) => lockInputText(event.currentTarget);

  async function handleSubmit(event) {
    event.preventDefault();
    if (loading) return;
    setError("");

    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim().toLowerCase();
    const businessName = String(data.get("business_name") || "").trim();
    const password = String(data.get("password") || "");
    const confirmPassword = String(data.get("confirmPassword") || "");
    const billingCountry = normalizeCountry(data.get("country") || country);
    const industryMode = normalizeIndustry(data.get("industry") || industry);
    const industryProfile = getIndustry(industryMode);
    const planChoice = normalizePlanChoice(selectedPlan);
    const acceptedTerms = data.get("termsAccepted") === "yes";

    if (!name) return setError("Enter your full name.");
    if (!email) return setError("Enter your email.");
    if (testerSignup && testerEmail && email !== testerEmail) return setError(`Use the tester email ${testerEmail} so Churvox can match the tester access.`);
    if (password !== confirmPassword) return setError("Passwords do not match.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password.length > 128) return setError("Password must be no more than 128 characters.");
    if (!acceptedTerms) return setError("Agree to the Terms of Service and Privacy Policy to create the account.");

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
        terms_accepted: true,
        terms_version: LEGAL_VERSION,
        privacy_accepted: true,
        privacy_version: LEGAL_VERSION,
      });
      if (!result?.token || !result?.user) throw new Error("Account was created but the secure session could not be confirmed.");

      try {
        localStorage.setItem(FIRST_SETUP_KEY, "true");
        localStorage.removeItem("churvox_first_setup_seen");
        localStorage.removeItem("churvox:fresh-demo-mode:v1");
        localStorage.removeItem("churvox:fresh-command-inbox:v1");
        localStorage.removeItem("churvox:fresh-jobs:v1");
        localStorage.setItem("churvox:billing-country", billingCountry);
        localStorage.setItem(BILLING_PLAN_KEY, planChoice);
        localStorage.setItem("churvox:industry-mode", industryMode);
        localStorage.setItem(PLAN_REQUIRED_KEY, "true");
        if (testerSignup) localStorage.setItem(BUSINESS_REQUIRED_KEY, "true");
        else localStorage.removeItem(BUSINESS_REQUIRED_KEY);
        saveBusinessSettings({
          business_name: businessName,
          email,
          country: billingCountry,
          trade_industry_type: industryMode,
          industry_mode: industryMode,
          default_job_types: industryProfile.services || [],
        });
      } catch {}

      navigate(verificationPath(email, testerSignup, industryMode, planChoice), { replace: true });
    } catch (requestError) {
      const status = requestError?.response?.status;
      const detail = requestError?.response?.data?.detail || requestError?.response?.data?.message || requestError?.message;
      if (status === 409) setError("Account creation is already in progress for this email. Wait a moment, then try signing in.");
      else setError(detail || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="cvPublicAuth cvWorldAccessGate cvWorldSignupGate" data-version="CHURVOX_SIGNUP_VERIFICATION_FIRST_20260712">
      <Nav />
      <section className="cvPublicAuthShell cvPublicSignupShell">
        <form className="cvPublicAuthCard" onSubmit={handleSubmit} noValidate>
          <p className="cvPublicAuthKicker">{testerSignup ? "Tester access" : "Start trial"}</p>
          <h1>{testerSignup ? "Create your tester account." : "Create your Churvox account."}</h1>
          <p className="cvPublicAuthIntro">
            {testerSignup
              ? "Use the email you were invited with. After signup, verify that email before Churvox opens the tester workspace."
              : "Create the account, verify your email, then confirm the plan you want. The 14-day trial does not require a card."}
          </p>

          {error ? <p className="cvPublicAuthError" role="alert" aria-live="assertive">{error}</p> : null}

          <div className="cvPublicFormGrid">
            <label>Full name<input ref={attachInput} onInput={handleInput} onFocus={handleInput} className="cvPublicNativeInput" name="name" autoComplete="name" placeholder="Your name" required disabled={loading} /></label>
            <label>Email<input ref={attachInput} onInput={handleInput} onFocus={handleInput} className="cvPublicNativeInput" name="email" type="email" inputMode="email" autoCapitalize="none" autoCorrect="off" spellCheck="false" autoComplete="email" placeholder="you@business.co.nz" defaultValue={testerEmail} readOnly={Boolean(testerSignup && testerEmail)} required disabled={loading} /></label>
            <label>Business name<input ref={attachInput} onInput={handleInput} onFocus={handleInput} className="cvPublicNativeInput" name="business_name" autoComplete="organization" placeholder="Business name" disabled={loading} /></label>
            <label>Business type<select className="cvPublicNativeInput" name="industry" value={industry} onChange={(event) => setIndustry(normalizeIndustry(event.target.value))} disabled={loading}>{industryOptions(true).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label>Country / pricing region<select className="cvPublicNativeInput" name="country" value={country} onChange={(event) => setCountry(normalizeCountry(event.target.value))} disabled={loading}>{COUNTRY_OPTIONS.map((item) => <option key={item.code} value={item.code}>{item.label} - {item.currency}</option>)}</select></label>
            <label>Password<input ref={attachInput} onInput={handleInput} onFocus={handleInput} className="cvPublicNativeInput" name="password" type="password" autoComplete="new-password" placeholder="8 to 128 characters" minLength={8} maxLength={128} required disabled={loading} /></label>
            <label>Confirm password<input ref={attachInput} onInput={handleInput} onFocus={handleInput} className="cvPublicNativeInput" name="confirmPassword" type="password" autoComplete="new-password" placeholder="Repeat password" minLength={8} maxLength={128} required disabled={loading} /></label>
          </div>

          <p className="cvPublicAuthIntro"><b>{selectedIndustry.title}</b>: {selectedIndustry.intro}</p>
          {!testerSignup ? <p className="cvPublicAuthIntro"><b>Selected plan:</b> {PLAN_LABELS[selectedPlan] || "Operator"}. This is saved as your choice only; no billing starts during signup.</p> : null}

          <label className="cvPublicAuthIntro" style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <input type="checkbox" name="termsAccepted" value="yes" required disabled={loading} style={{ marginTop: 4, width: 18, height: 18, flex: "0 0 auto" }} />
            <span>I agree to the <Link to="/legal/terms" target="_blank" rel="noopener noreferrer">Terms of Service</Link> and acknowledge the <Link to="/legal/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</Link>.</span>
          </label>

          <button className="cvPublicAuthSubmit" type="submit" disabled={loading}>{loading ? "Creating account…" : testerSignup ? "Create tester account" : "Create account"}</button>
          <p className="cvPublicAuthBottom">Already have an account? <Link to="/login">Sign in</Link></p>
        </form>

        <aside className="cvPublicAuthPanel">
          <p>{testerSignup ? "Tester path" : "Trial path"}</p>
          <h2>{testerSignup ? "Tester access skips billing, not verification or setup." : "Verification first. Billing never starts during signup."}</h2>
          <ul>
            <li>Account consent is recorded by the server.</li>
            <li>Email verification is required before app access.</li>
            <li>{testerSignup ? "Invited tester access is matched after verification." : "The 14-day trial does not require a card."}</li>
            <li>Churvox opens with the business type you selected.</li>
          </ul>
        </aside>
      </section>
    </main>
  );
}
