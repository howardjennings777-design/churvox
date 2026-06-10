import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ChurvoxLogo } from "@/components/ChurvoxLogo";
import "./AuthPublicCommand.css";

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await forgotPassword(email);
    if (result.success) setSuccess(true);
    else setError(result.error);
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

      <section className="wh-auth-wrap">
        <form className="wh-auth-form" onSubmit={handleSubmit}>
          <p className="wh-auth-kicker">Password recovery</p>
          <h1 className="wh-auth-title">Get back to the command floor.</h1>
          <p className="wh-auth-sub">Enter your email and Churvox will send a secure reset link if an account exists.</p>

          {success ? (
            <>
              <p className="wh-auth-error" style={{ background: "rgba(43,189,145,.12)", borderColor: "rgba(43,189,145,.24)", color: "#0d765f" }}>Reset link sent. Check your email shortly.</p>
              <Link to="/login" className="wh-auth-submit" style={{ textDecoration: "none" }}>Back to login</Link>
            </>
          ) : (
            <>
              {error && <p className="wh-auth-error">{error}</p>}
              <label className="wh-auth-label">
                Email
                <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="wh-auth-input" required data-testid="forgot-password-email-input" />
              </label>
              <button className="wh-auth-submit" type="submit" disabled={loading} data-testid="forgot-password-submit-button">
                {loading ? "Sending…" : "Send reset link"}
              </button>
              <p className="wh-auth-sub"><Link to="/login" data-testid="back-to-login-link">Back to login</Link></p>
            </>
          )}
        </form>

        
      </section>
    </main>
  );
}
