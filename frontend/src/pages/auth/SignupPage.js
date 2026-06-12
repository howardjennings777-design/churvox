import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { saveBusinessSettings } from "../../lib/businessSettings";
import { Nav } from "../marketing/ExecutiveHomePage";
import "./AuthPublicCommand.css";

const FIRST_SETUP_KEY = "churvox_first_setup_pending";

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

export default function SignupPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const attachInput = (el) => {
    lockInputText(el);
  };

  const handleInput = (e) => {
    lockInputText(e.currentTarget);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const form = e.currentTarget;
    const data = new FormData(form);

    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim().toLowerCase();
    const businessName = String(data.get("business_name") || "").trim();
    const password = String(data.get("password") || "");
    const confirmPassword = String(data.get("confirmPassword") || "");

    if (!name) {
      setError("Enter your full name.");
      return;
    }

    if (!email) {
      setError("Enter your email.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const result = await register({
        name,
        email,
        password,
        business_name: businessName || null,
      });

      if (!result?.token) {
        setError("Registration failed. Please try again.");
        return;
      }

      try {
        localStorage.setItem(FIRST_SETUP_KEY, "true");
        localStorage.removeItem("churvox_first_setup_seen");
        localStorage.removeItem("churvox:fresh-demo-mode:v1");
        localStorage.removeItem("churvox:fresh-command-inbox:v1");
        localStorage.removeItem("churvox:fresh-jobs:v1");

        saveBusinessSettings({
          business_name: businessName || "",
          email,
        });
      } catch {}

      navigate("/guide?first_setup=1", { replace: true });
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          err?.response?.data?.message ||
          err?.message ||
          "Registration failed. Please try again."
      );
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
          <p className="cvPublicAuthIntro">
            Set up your business, then choose your plan. 14-day free trial, no card required.
          </p>

          {error ? <p className="cvPublicAuthError">{error}</p> : null}

          <label>
            Full name
            <input
              ref={attachInput}
              onInput={handleInput}
              onFocus={handleInput}
              className="cvPublicNativeInput"
              name="name"
              autoComplete="name"
              placeholder="Your name"
              required
            />
          </label>

          <label>
            Email
            <input
              ref={attachInput}
              onInput={handleInput}
              onFocus={handleInput}
              className="cvPublicNativeInput"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
          </label>

          <label>
            Business name
            <input
              ref={attachInput}
              onInput={handleInput}
              onFocus={handleInput}
              className="cvPublicNativeInput"
              name="business_name"
              autoComplete="organization"
              placeholder="Business name"
            />
          </label>

          <label>
            Password
            <input
              ref={attachInput}
              onInput={handleInput}
              onFocus={handleInput}
              className="cvPublicNativeInput"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="Password"
              required
            />
          </label>

          <label>
            Confirm password
            <input
              ref={attachInput}
              onInput={handleInput}
              onFocus={handleInput}
              className="cvPublicNativeInput"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Confirm password"
              required
            />
          </label>

          <button className="cvPublicAuthSubmit" type="submit" disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </button>

          <p className="cvPublicAuthBottom">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </form>

        <aside className="cvPublicAuthPanel">
          <p>Churvox does the admin. You approve.</p>
          <h2>One proper signup flow for service businesses.</h2>
          <ul>
            <li>Jobs, clients, quotes and invoices in one place</li>
            <li>AI-prepared admin for owner approval</li>
            <li>14-day free trial, no card required</li>
          </ul>
        </aside>
      </section>
    </main>
  );
}
