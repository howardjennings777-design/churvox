import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { saveBusinessSettings } from "../../lib/businessSettings";
import "./AuthPublicCommand.css";

const FIRST_SETUP_KEY = "churvox_first_setup_pending";

const inputStyle = {
  color: "#000000",
  WebkitTextFillColor: "#000000",
  caretColor: "#000000",
  backgroundColor: "#ffffff",
};

export default function SignupPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    business_name: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setFormData((current) => ({ ...current, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const cleanEmail = formData.email.trim().toLowerCase();

    if (!formData.name.trim()) {
      setError("Enter your full name.");
      return;
    }

    if (!cleanEmail) {
      setError("Enter your email.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const result = await register({
        name: formData.name.trim(),
        email: cleanEmail,
        password: formData.password,
        business_name: formData.business_name.trim() || null,
      });

      if (!result?.token) {
        setError("Registration failed. Please try again.");
        return;
      }

      try {
        localStorage.setItem(FIRST_SETUP_KEY, "true");
        saveBusinessSettings({
          business_name: formData.business_name.trim() || "",
          email: cleanEmail,
        });
      } catch {}

      navigate("/plans?first_setup=1", { replace: true });
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
      <header className="cvPublicAuthNav">
        <Link to="/" className="cvPublicAuthBrand">Churvox</Link>

        <nav className="cvPublicAuthNavLinks">
          <Link to="/">Home</Link>
          <Link to="/features">Features</Link>
          <Link to="/pricing">Pricing</Link>
          <Link to="/login">Log in</Link>
        </nav>
      </header>

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
              style={inputStyle}
              name="name"
              value={formData.name}
              onChange={handleChange}
              autoComplete="name"
              placeholder="Your name"
              required
            />
          </label>

          <label>
            Email
            <input
              style={inputStyle}
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
          </label>

          <label>
            Business name
            <input
              style={inputStyle}
              name="business_name"
              value={formData.business_name}
              onChange={handleChange}
              autoComplete="organization"
              placeholder="Business name"
            />
          </label>

          <label>
            Password
            <input
              style={inputStyle}
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              autoComplete="new-password"
              placeholder="Password"
              required
            />
          </label>

          <label>
            Confirm password
            <input
              style={inputStyle}
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
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
          <h2>One proper public signup flow for real customers.</h2>
          <ul>
            <li>Readable fields on mobile and desktop</li>
            <li>Proper public navigation</li>
            <li>Goes straight into first setup after signup</li>
          </ul>
        </aside>
      </section>
    </main>
  );
}
