import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { normalizeRole, getDefaultRoute } from "@/lib/roles";
import { Nav } from "../marketing/ExecutiveHomePage";
import "./AuthPublicCommand.css";

const inputStyle = {
  color: "#000000",
  WebkitTextFillColor: "#000000",
  caretColor: "#000000",
  backgroundColor: "#ffffff",
};

const getPostLoginPath = (payload = {}) => {
  const user = payload?.user || payload || {};
  const email = String(user?.email || payload?.email || "").trim().toLowerCase();
  const isPlatformOwner =
    email === "hello@churvox.com" ||
    user?.is_platform_owner === true ||
    user?.is_admin === true;

  if (isPlatformOwner) return "/admin";
  return getDefaultRoute(normalizeRole(user?.role || payload?.role));
};

const loginLooksValid = (result = {}) => {
  const user = result?.user || result || {};
  return Boolean(
    result?.success !== false &&
      (result?.token ||
        result?.access_token ||
        result?.auth_token ||
        result?.cookieSession ||
        result?.user?.token ||
        result?.user?.access_token ||
        user?.email ||
        user?.id ||
        user?._id ||
        user?.role ||
        result?.message ||
        result?.detail)
  );
};

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, user, loading, checkAuth } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isRestoredCheckout = (() => {
    try {
      const params = new URLSearchParams(window.location.search || "");
      return params.get("cacheReset") === "restored-checkout";
    } catch {
      return false;
    }
  })();

  useEffect(() => {
    if (isRestoredCheckout && !user && !loading) {
      checkAuth?.();
    }
  }, [checkAuth, isRestoredCheckout, loading, user]);

  useEffect(() => {
    if (!user) return;
    if (isRestoredCheckout) {
      navigate("/plans", { replace: true });
      return;
    }
    navigate(getPostLoginPath(user), { replace: true });
  }, [isRestoredCheckout, navigate, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setError("Enter your email and password.");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const result = await login(cleanEmail, password);

      if (!loginLooksValid(result)) {
        setError("Invalid email or password.");
        return;
      }

      try {
        await checkAuth?.();
      } catch {
        // Login already succeeded. The app shell can refresh again after navigation.
      }

      navigate(isRestoredCheckout ? "/plans" : getPostLoginPath(result), { replace: true });
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          err?.response?.data?.message ||
          err?.message ||
          "Invalid email or password."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="cvPublicAuth">
      <Nav />
      <section className="cvPublicAuthShell">
        <form className="cvPublicAuthCard" onSubmit={handleSubmit}>
          <p className="cvPublicAuthKicker">Welcome back</p>
          <h1>Sign in to Churvox</h1>
          <p className="cvPublicAuthIntro">Open your job desk, keep work moving, and approve the admin Churvox prepared.</p>

          {isRestoredCheckout && (
            <p className="cvPublicAuthIntro">We are restoring your checkout session. Sign in again only if Churvox does not return you to plans automatically.</p>
          )}

          {error && <div className="cvPublicAuthError">{error}</div>}

          <label>
            Email
            <input
              style={inputStyle}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@business.co.nz"
              autoComplete="email"
            />
          </label>

          <label>
            Password
            <div className="password-row">
              <input
                style={inputStyle}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                autoComplete="current-password"
              />
              <button className="cvPublicAuthGhost" type="button" onClick={() => setShowPassword((v) => !v)}>
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          <button className="cvPublicAuthSubmit" type="submit" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign in"}
          </button>

          <div className="cvPublicAuthBottom">
            <Link to="/forgot-password">Forgot password?</Link>
            {" · "}
            <Link to="/signup">Create account</Link>
          </div>
        </form>

        <aside className="cvPublicAuthPanel">
          <p>Churvox job admin</p>
          <h2>Job → Invoice → Paid → Synced.</h2>
          <ul>
            <li>Keep the business moving from one desk.</li>
            <li>Churvox prepares the admin.</li>
            <li>You stay in control and approve what goes out.</li>
          </ul>
        </aside>
      </section>
    </main>
  );
}
