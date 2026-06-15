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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await forgotPassword(email.trim().toLowerCase());
      if (result.success) setSuccess(true);
      else setError(result.error || "Could not send reset link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="cvPublicAuth">
      <Nav />

      <section className="cvPublicAuthShell">
        <form className="cvPublicAuthCard" onSubmit={handleSubmit}>
          <p className="cvPublicAuthKicker">Password recovery</p>
          <h1>Get back into Churvox.</h1>
          <p className="cvPublicAuthIntro">
            Enter your email and Churvox will send a secure reset link if an account exists.
          </p>

          {success ? (
            <>
              <p className="cvPublicAuthError" style={{ background: "rgba(43,189,145,.14)", borderColor: "rgba(43,189,145,.28)", color: "#bbf7d0", WebkitTextFillColor: "#bbf7d0" }}>
                Reset link sent. Check your email shortly.
              </p>
              <Link to="/login" className="cvPublicAuthSubmit" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
                Back to login
              </Link>
            </>
          ) : (
            <>
              {error ? <p className="cvPublicAuthError">{error}</p> : null}

              <label>
                Email
                <input
                  style={inputStyle}
                  type="email"
                  placeholder="hello@churvox.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  data-testid="forgot-password-email-input"
                />
              </label>

              <button className="cvPublicAuthSubmit" type="submit" disabled={loading} data-testid="forgot-password-submit-button">
                {loading ? "Sending..." : "Send reset link"}
              </button>

              <p className="cvPublicAuthBottom">
                Remembered it? <Link to="/login" data-testid="back-to-login-link">Back to login</Link>
              </p>
            </>
          )}
        </form>

        <aside className="cvPublicAuthPanel">
          <p>Secure account access</p>
          <h2>Reset your password and get back to work.</h2>
          <ul>
            <li>Secure reset link sent to your email</li>
            <li>No account details shown on this page</li>
            <li>Return straight to your Churvox workspace</li>
          </ul>
        </aside>
      </section>
    </main>
  );
}
