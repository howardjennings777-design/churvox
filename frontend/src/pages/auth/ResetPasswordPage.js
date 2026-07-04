import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Nav } from "../marketing/ExecutiveHomePage";
// removed broken css import

const inputStyle = {
  color: "#000000",
  WebkitTextFillColor: "#000000",
  caretColor: "#000000",
  backgroundColor: "#ffffff",
};

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const { resetPassword } = useAuth();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const nextToken = searchParams.get("token");
    if (nextToken) setToken(nextToken);
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Reset link is missing or expired. Please request a new password reset email.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const result = await resetPassword(token, password);
      if (result.success) setSuccess(true);
      else setError(result.error || "Could not reset password. Please request a new reset link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="cvPublicAuth">
      <Nav />

      <section className="cvPublicAuthShell">
        <form className="cvPublicAuthCard" onSubmit={handleSubmit}>
          <p className="cvPublicAuthKicker">Reset access</p>
          <h1>Set a new password.</h1>
          <p className="cvPublicAuthIntro">
            Choose a strong password, then sign back in to Churvox.
          </p>

          {success ? (
            <>
              <p
                className="cvPublicAuthError"
                style={{ background: "rgba(43,189,145,.14)", borderColor: "rgba(43,189,145,.28)", color: "#bbf7d0", WebkitTextFillColor: "#bbf7d0" }}
                data-testid="reset-password-success"
              >
                Password reset successful. You can now sign in.
              </p>
              <Link
                to="/login"
                className="cvPublicAuthSubmit"
                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}
                data-testid="go-to-login-button"
              >
                Go to login
              </Link>
            </>
          ) : (
            <>
              {error ? <p className="cvPublicAuthError" data-testid="reset-password-error">{error}</p> : null}

              {!searchParams.get("token") ? (
                <label>
                  Reset token
                  <input
                    style={inputStyle}
                    type="text"
                    placeholder="Paste your reset token"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    required
                    data-testid="reset-token-input"
                  />
                </label>
              ) : null}

              <label>
                New password
                <input
                  style={inputStyle}
                  type="password"
                  placeholder="New password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  data-testid="reset-new-password-input"
                />
              </label>

              <label>
                Confirm password
                <input
                  style={inputStyle}
                  type="password"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  data-testid="reset-confirm-password-input"
                />
              </label>

              <button className="cvPublicAuthSubmit" type="submit" disabled={loading} data-testid="reset-password-submit-button">
                {loading ? "Resetting..." : "Reset password"}
              </button>

              <p className="cvPublicAuthBottom">
                Remembered it? <Link to="/login" data-testid="back-to-login-link">Back to login</Link>
              </p>
            </>
          )}
        </form>

        <aside className="cvPublicAuthPanel">
          <p>Secure account access</p>
          <h2>Create a strong password and return to work.</h2>
          <ul>
            <li>Use at least 8 characters</li>
            <li>Keep this password private</li>
            <li>Sign back in when the reset is complete</li>
          </ul>
        </aside>
      </section>
    </main>
  );
}
