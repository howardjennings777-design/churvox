import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ChurvoxLogo } from "@/components/ChurvoxLogo";
import "./AuthPublicCommand.css";

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
    const t = searchParams.get("token");
    if (t) setToken(t);
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!token) { setError("Reset token is required"); return; }
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    const result = await resetPassword(token, password);
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
          <p className="wh-auth-kicker">Reset access</p>
          <h1 className="wh-auth-title">Set a new password.</h1>
          <p className="wh-auth-sub">Choose a strong password, then return to the Churvox Command Floor.</p>

          {success ? (
            <>
              <p className="wh-auth-error" style={{ background: "rgba(43,189,145,.12)", borderColor: "rgba(43,189,145,.24)", color: "#0d765f" }} data-testid="reset-password-success">Password reset successful. You can now sign in.</p>
              <Link to="/login" className="wh-auth-submit" style={{ textDecoration: "none" }} data-testid="go-to-login-button">Go to login</Link>
            </>
          ) : (
            <>
              {error && <p className="wh-auth-error" data-testid="reset-password-error">{error}</p>}
              {!searchParams.get("token") && (
                <label className="wh-auth-label">
                  Reset token
                  <input type="text" placeholder="Paste your reset token" value={token} onChange={(e) => setToken(e.target.value)} className="wh-auth-input" required data-testid="reset-token-input" />
                </label>
              )}
              <label className="wh-auth-label">
                New password
                <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="wh-auth-input" required data-testid="reset-new-password-input" />
              </label>
              <label className="wh-auth-label">
                Confirm password
                <input type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="wh-auth-input" required data-testid="reset-confirm-password-input" />
              </label>
              <button className="wh-auth-submit" type="submit" disabled={loading} data-testid="reset-password-submit-button">
                {loading ? "Resetting…" : "Reset password"}
              </button>
              <p className="wh-auth-sub"><Link to="/login" data-testid="back-to-login-link">Back to login</Link></p>
            </>
          )}
        </form>

        <aside className="wh-auth-panel">
          <p className="wh-auth-kicker">Secure owner flow</p>
          <h2>Fresh password. Same command floor.</h2>
          <p>Return to the daily operating screen where jobs, crew, invoices, risks and owner approvals stay organised.</p>
        </aside>
      </section>
    </main>
  );
}
