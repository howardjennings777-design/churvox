import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Nav } from "../marketing/ExecutiveHomePage";
import "./AuthPublicCommand.css";

const inputStyle = {
  color: "#000000",
  WebkitTextFillColor: "#000000",
  caretColor: "#000000",
  backgroundColor: "#ffffff",
};

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      const result = await forgotPassword(email.trim().toLowerCase());
      if (result.success) setSuccess(true);
      else setError(result.error || "Could not accept the reset request. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="cvPublicAuth" data-version="CHURVOX_FORGOT_PASSWORD_PAID_LAUNCH_20260712">
      <Nav />
      <section className="cvPublicAuthShell">
        <form className="cvPublicAuthCard" onSubmit={handleSubmit}>
          <p className="cvPublicAuthKicker">Password recovery</p>
          <h1>Get back into Churvox.</h1>
          <p className="cvPublicAuthIntro">Enter your email. If a Churvox account exists, a secure reset link will be sent.</p>

          {success ? (
            <>
              <p className="cvPublicAuthSuccess" role="status" data-testid="forgot-password-success">
                Request accepted. If that email belongs to a Churvox account, check its inbox and spam folder for the reset link.
              </p>
              <Link to="/login" className="cvPublicAuthSubmit" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>Back to login</Link>
            </>
          ) : (
            <>
              {error ? <p className="cvPublicAuthError" role="alert">{error}</p> : null}
              <label>
                Email
                <input
                  style={inputStyle}
                  type="email"
                  placeholder="you@business.co.nz"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck="false"
                  inputMode="email"
                  required
                  disabled={loading}
                  data-testid="forgot-password-email-input"
                />
              </label>
              <button className="cvPublicAuthSubmit" type="submit" disabled={loading} data-testid="forgot-password-submit-button">
                {loading ? "Sending..." : "Send reset link"}
              </button>
              <p className="cvPublicAuthBottom">Remembered it? <Link to="/login" data-testid="back-to-login-link">Back to login</Link></p>
            </>
          )}
        </form>

        <aside className="cvPublicAuthPanel">
          <p>Secure account access</p>
          <h2>Reset your password and get back to work.</h2>
          <ul>
            <li>Account existence is never shown here</li>
            <li>Reset links expire and can be used once</li>
            <li>Older sessions are signed out after reset</li>
          </ul>
        </aside>
      </section>
    </main>
  );
}
