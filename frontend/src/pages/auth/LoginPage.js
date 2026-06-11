import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { normalizeRole, getDefaultRoute } from "@/lib/roles";

const page = {
  minHeight: "100vh",
  background: "#f7f3ea",
  color: "#111827",
  padding: "16px",
  fontFamily: "Inter, Arial, Helvetica, sans-serif",
};

const nav = {
  maxWidth: "980px",
  margin: "0 auto 22px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  padding: "14px 16px",
  borderRadius: "22px",
  background: "#111827",
  border: "1px solid rgba(249,115,22,.35)",
  boxShadow: "0 20px 60px rgba(15,23,42,.18)",
};

const brand = {
  color: "#ffffff",
  WebkitTextFillColor: "#ffffff",
  fontSize: "24px",
  fontWeight: 1000,
  letterSpacing: "-0.05em",
  textDecoration: "none",
};

const navLinks = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap",
};

const navLink = {
  color: "#ffffff",
  WebkitTextFillColor: "#ffffff",
  fontSize: "14px",
  fontWeight: 900,
  textDecoration: "none",
};

const shell = {
  minHeight: "calc(100vh - 105px)",
  display: "grid",
  placeItems: "start center",
};

const card = {
  width: "min(620px, 100%)",
  background: "#ffffff",
  color: "#111827",
  WebkitTextFillColor: "#111827",
  border: "2px solid rgba(15,23,42,.18)",
  borderRadius: "28px",
  padding: "clamp(24px, 5vw, 44px)",
  boxShadow: "0 28px 80px rgba(15,23,42,.16)",
};

const kicker = {
  margin: "0 0 10px",
  color: "#c2410c",
  WebkitTextFillColor: "#c2410c",
  fontSize: "12px",
  fontWeight: 1000,
  letterSpacing: ".16em",
  textTransform: "uppercase",
};

const title = {
  margin: "0 0 14px",
  color: "#071118",
  WebkitTextFillColor: "#071118",
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontSize: "clamp(38px, 8vw, 64px)",
  lineHeight: ".95",
  letterSpacing: "-0.075em",
};

const sub = {
  margin: "0 0 20px",
  color: "#334155",
  WebkitTextFillColor: "#334155",
  fontSize: "16px",
  fontWeight: 750,
  lineHeight: 1.55,
};

const form = {
  display: "grid",
  gap: "14px",
};

const label = {
  display: "grid",
  gap: "7px",
  color: "#111827",
  WebkitTextFillColor: "#111827",
  fontSize: "14px",
  fontWeight: 950,
};

const input = {
  width: "100%",
  minHeight: "54px",
  borderRadius: "16px",
  border: "2px solid rgba(15,23,42,.26)",
  background: "#ffffff",
  color: "#071118",
  WebkitTextFillColor: "#071118",
  padding: "0 14px",
  fontSize: "17px",
  fontWeight: 700,
  outline: "none",
  boxShadow: "0 10px 22px rgba(15,23,42,.07)",
};

const button = {
  width: "100%",
  minHeight: "56px",
  marginTop: "4px",
  border: "0",
  borderRadius: "999px",
  background: "#f97316",
  color: "#111827",
  WebkitTextFillColor: "#111827",
  fontSize: "16px",
  fontWeight: 1000,
  cursor: "pointer",
  boxShadow: "0 18px 44px rgba(249,115,22,.28)",
};

const errorBox = {
  margin: "0",
  border: "2px solid rgba(185,28,28,.24)",
  borderRadius: "16px",
  background: "#fee2e2",
  color: "#991b1b",
  WebkitTextFillColor: "#991b1b",
  padding: "12px 14px",
  fontWeight: 900,
  lineHeight: 1.45,
};

const bottom = {
  margin: "18px 0 0",
  color: "#334155",
  WebkitTextFillColor: "#334155",
  fontSize: "15px",
  fontWeight: 800,
  lineHeight: 1.5,
};

const link = {
  color: "#b45309",
  WebkitTextFillColor: "#b45309",
  fontWeight: 1000,
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

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setError("Enter your email and password.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const result = await login(cleanEmail, password);

      if (!result?.token) {
        setError("Login failed. No login token came back.");
        return;
      }

      navigate(getPostLoginPath(result), { replace: true });
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          err?.response?.data?.message ||
          err?.message ||
          "Invalid email or password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={page} data-version="CHURVOX_CLEAN_LOGIN_20260611">
      <header style={nav}>
        <Link to="/" style={brand}>Churvox</Link>

        <nav style={navLinks}>
          <Link to="/signup/" style={navLink}>Start free</Link>
          <Link to="/forgot-password" style={navLink}>Forgot password</Link>
        </nav>
      </header>

      <section style={shell}>
        <form style={card} onSubmit={handleSubmit} data-testid="login-form">
          <p style={kicker}>Owner login</p>
          <h1 style={title}>Sign in to Churvox.</h1>
          <p style={sub}>
            Open your Smart Hub, review prepared admin, and approve the next move.
          </p>

          {error ? <p style={errorBox}>{error}</p> : null}

          <div style={form}>
            <label style={label}>
              Email
              <input
                style={input}
                data-testid="login-email-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
              />
            </label>

            <label style={label}>
              Password
              <input
                style={input}
                data-testid="login-password-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Password"
                required
              />
            </label>

            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              style={{
                ...button,
                marginTop: 0,
                minHeight: "46px",
                background: "#111827",
                color: "#ffffff",
                WebkitTextFillColor: "#ffffff",
                boxShadow: "none",
              }}
            >
              {showPassword ? "Hide password" : "Show password"}
            </button>

            <button
              style={{
                ...button,
                opacity: loading ? 0.72 : 1,
                cursor: loading ? "wait" : "pointer",
              }}
              data-testid="login-submit-button"
              disabled={loading}
              type="submit"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </div>

          <p style={bottom}>
            New here?{" "}
            <Link to="/signup/" style={link}>
              Create an account
            </Link>
            {" · "}
            <Link to="/forgot-password" style={link} data-testid="forgot-password-link">
              Forgot password?
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}
