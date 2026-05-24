import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ChurvoxLogo } from "../../components/ChurvoxLogo";
import "./AuthPublicCommand.css";

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
    if (formData.password !== formData.confirmPassword) return setError("Passwords do not match");
    if (formData.password.length < 6) return setError("Password must be at least 6 characters");
    setLoading(true);
    try {
      const result = await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        business_name: formData.business_name || null,
      });
      if (result?.token) navigate("/plans");
      else setError("Registration failed. Please try again.");
    } catch (err) {
      setError(err?.response?.data?.detail || "Registration failed. Please try again.");
    }
    setLoading(false);
  };

  return (
    <main className="wh-auth">
      <header className="wh-auth-nav">
        <Link to="/"><ChurvoxLogo /></Link>
        <nav className="wh-auth-links">
          <Link to="/">Home</Link>
          <Link to="/features">Features</Link>
          <Link to="/pricing">Pricing</Link>
          <Link to="/login">Log in</Link>
        </nav>
      </header>

      <section className="wh-auth-wrap is-signup">
        <aside className="wh-auth-panel">
          <p className="wh-auth-kicker">Start the command system</p>
          <h2>Turn the business into prepared owner decisions.</h2>
          <p>
            Create the account, choose a plan, then Churvox starts organising jobs, workers, quotes, invoices and money follow-ups into approval-first admin.
          </p>
        </aside>

        <form className="wh-auth-form" onSubmit={handleSubmit}>
          <p className="wh-auth-kicker">Create account</p>
          <h1 className="wh-auth-title">Build your Churvox command floor.</h1>

          {error && <p className="wh-auth-error">{error}</p>}

          <label className="wh-auth-label">
            Full name
            <input className="wh-auth-input" name="name" value={formData.name} onChange={handleChange} required data-testid="signup-name-input" />
          </label>

          <label className="wh-auth-label">
            Email
            <input className="wh-auth-input" name="email" type="email" value={formData.email} onChange={handleChange} required data-testid="signup-email-input" />
          </label>

          <label className="wh-auth-label">
            Business name
            <input className="wh-auth-input" name="business_name" value={formData.business_name} onChange={handleChange} data-testid="signup-business-input" />
          </label>

          <label className="wh-auth-label">
            Password
            <input className="wh-auth-input" name="password" type="password" value={formData.password} onChange={handleChange} required data-testid="signup-password-input" />
          </label>

          <label className="wh-auth-label">
            Confirm password
            <input className="wh-auth-input" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} required data-testid="signup-confirm-password-input" />
          </label>

          <button className="wh-auth-submit" type="submit" disabled={loading} data-testid="signup-submit-button">
            {loading ? "Creating account…" : "Create account"}
          </button>

          <p className="wh-auth-sub">
            Already have an account? <Link to="/login" data-testid="login-link">Sign in</Link>
          </p>
        </form>
      </section>
    </main>
  );
}
