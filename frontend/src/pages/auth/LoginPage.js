import React, { useState } from "react";
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
    result?.token ||
      result?.access_token ||
      result?.auth_token ||
      result?.user?.token ||
      result?.user?.access_token ||
      user?.email ||
      user?.id ||
      user?._id ||
      user?.role
  );
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

      if (!loginLooksValid(result)) {
        setError("Invalid email or password.");
        return;
      }

      const resultEmail = String(result?.user?.email || result?.email || "").trim().toLowerCase();

      if (!resultEmail || resultEmail !== cleanEmail) {
        setError("Login session mismatch. Please try again.");
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
    <>
      <Nav />
      <main className="auth-public-wrap">
        <section className="auth-public-card">
          <div className="auth-public-copy">
            <p className="auth-eyebrow">Welcome back</p>
            <h1>Sign in to Churvox</h1>
            <p>Open your job desk, keep work moving, and approve the admin Churvox prepared.</p>
          </div>

          <form className="auth-public-form" onSubmit={handleSubmit}>
            {error && <div className="auth-error">{error}</div>}

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
                <button type="button" onClick={() => setShowPassword((v) => !v)}>
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>

            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </button>

            <div className="auth-links">
              <Link to="/forgot-password">Forgot password?</Link>
              <Link to="/signup">Create account</Link>
            </div>
          </form>
        </section>
      </main>
    </>
  );
}
