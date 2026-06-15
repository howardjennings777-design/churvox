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

const pageStyle = {
  minHeight: "100vh",
  width: "100%",
  background:
    "radial-gradient(circle at 12% 0%, rgba(249,115,22,.38), transparent 30rem), radial-gradient(circle at 86% 8%, rgba(251,146,60,.22), transparent 22rem), linear-gradient(135deg, #111827 0%, #1f2937 48%, #3b2414 100%)",
  color: "#f9fafb",
};

const shellStyle = {
  width: "min(1120px, calc(100% - 32px))",
  margin: "0 auto",
  minHeight: "calc(100vh - 112px)",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 18,
  alignItems: "stretch",
  padding: "10px 0 34px",
};

const cardStyle = {
  display: "grid",
  alignContent: "center",
  gap: 14,
  borderRadius: 30,
  border: "1px solid rgba(249,115,22,.30)",
  background:
    "radial-gradient(circle at 15% 15%, rgba(249,115,22,.24), transparent 32%), linear-gradient(135deg, rgba(17,24,39,.97), rgba(31,41,55,.94) 56%, rgba(67,36,18,.90))",
  boxShadow: "0 32px 90px rgba(0,0,0,.38)",
  padding: "clamp(24px, 4vw, 46px)",
  color: "#f9fafb",
};

const panelStyle = {
  ...cardStyle,
  minHeight: 360,
  justifyContent: "end",
};

const submitStyle = {
  minHeight: 54,
  borderRadius: 999,
  border: 0,
  padding: "0 18px",
  fontSize: 16,
  fontWeight: 1000,
  cursor: "pointer",
  background: "#f97316",
  color: "#111827",
  WebkitTextFillColor: "#111827",
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
    if (!isRestoredCheckout) return undefined;

    if (user) {
      navigate("/plans", { replace: true });
      return undefined;
    }

    const timer = window.setTimeout(() => {
      navigate("/plans", { replace: true });
    }, 900);

    return () => window.clearTimeout(timer);
  }, [isRestoredCheckout, navigate, user]);

  useEffect(() => {
    if (!user || isRestoredCheckout) return;
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
    <main className="cvPublicAuth" style={pageStyle}>
      <Nav />
      <section className="cvPublicAuthShell" style={shellStyle}>
        <form className="cvPublicAuthCard" style={cardStyle} onSubmit={handleSubmit}>
          <p className="cvPublicAuthKicker" style={{ margin: 0, color: "#fed7aa", fontWeight: 1000, letterSpacing: ".18em", textTransform: "uppercase" }}>Welcome back</p>
          <h1 style={{ margin: 0, color: "#fff", fontSize: "clamp(42px, 5vw, 70px)", lineHeight: ".92", letterSpacing: "-.075em" }}>Sign in to Churvox</h1>
          <p className="cvPublicAuthIntro" style={{ margin: 0, color: "#e5e7eb", fontWeight: 760, lineHeight: 1.55 }}>Open your job desk, keep work moving, and approve the admin Churvox prepared.</p>

          {isRestoredCheckout && (
            <p className="cvPublicAuthIntro" style={{ margin: 0, color: "#fed7aa", fontWeight: 850, lineHeight: 1.45 }}>Restoring checkout. Sending you back to plans now.</p>
          )}

          {error && <div className="cvPublicAuthError">{error}</div>}

          <label style={{ display: "grid", gap: 7, color: "#f9fafb", fontWeight: 950 }}>
            Email
            <input
              style={{ ...inputStyle, minHeight: 54, borderRadius: 16, border: "2px solid rgba(249,115,22,.26)", padding: "0 14px", fontSize: 17, fontWeight: 800 }}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@business.co.nz"
              autoComplete="email"
            />
          </label>

          <label style={{ display: "grid", gap: 7, color: "#f9fafb", fontWeight: 950 }}>
            Password
            <div className="password-row" style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}>
              <input
                style={{ ...inputStyle, minHeight: 54, borderRadius: 16, border: "2px solid rgba(249,115,22,.26)", padding: "0 14px", fontSize: 17, fontWeight: 800 }}
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

          <button className="cvPublicAuthSubmit" style={submitStyle} type="submit" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign in"}
          </button>

          <div className="cvPublicAuthBottom" style={{ color: "#e5e7eb", fontWeight: 850 }}>
            <Link to="/forgot-password" style={{ color: "#fed7aa", fontWeight: 1000 }}>Forgot password?</Link>
            {" · "}
            <Link to="/signup" style={{ color: "#fed7aa", fontWeight: 1000 }}>Create account</Link>
          </div>
        </form>

        <aside className="cvPublicAuthPanel" style={panelStyle}>
          <p style={{ margin: "0 0 12px", color: "#fed7aa", fontWeight: 1000, letterSpacing: ".18em", textTransform: "uppercase" }}>Churvox job admin</p>
          <h2 style={{ margin: "0 0 20px", color: "#fff", fontSize: "clamp(38px, 5vw, 68px)", lineHeight: ".92", letterSpacing: "-.075em" }}>Job → Invoice → Paid → Synced.</h2>
          <ul style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 10 }}>
            <li>Keep the business moving from one desk.</li>
            <li>Churvox prepares the admin.</li>
            <li>You stay in control and approve what goes out.</li>
          </ul>
        </aside>
      </section>
    </main>
  );
}
