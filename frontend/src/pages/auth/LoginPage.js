import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { normalizeRole, getDefaultRoute } from "@/lib/roles";
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
        setError("Login failed. Please try again.");
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
    <main className="cvPublicAuth">
      <header className="cvPublicAuthNav">
        <Link to="/" className="cvPublicAuthBrand">Churvox</Link>

        <nav className="cvPublicAuthNavLinks">
          <Link to="/">Home</Link>
          <Link to="/features">Features</Link>
          <Link to="/pricing">Pricing</Link>
          <Link to="/signup">Start free</Link>
        </nav>
      </header>

      <section className="cvPublicAuthShell">
        <form className="cvPublicAuthCard" onSubmit={handleSubmit}>
          <p className="cvPublicAuthKicker">Owner login</p>
          <h1>Sign in to Churvox.</h1>
          <p className="cvPublicAuthIntro">
            Open your Smart Hub, review prepared admin, and approve the next move.
          </p>

          {error ? <p className="cvPublicAuthError">{error}</p> : null}

          <label>
            Email
            <input
              style={inputStyle}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
          </label>

          <label>
            Password
            <input
              style={inputStyle}
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
            className="cvPublicAuthGhost"
            onClick={() => setShowPassword((v) => !v)}
          >
            {showPassword ? "Hide password" : "Show password"}
          </button>

          <button className="cvPublicAuthSubmit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>

          <p className="cvPublicAuthBottom">
            New here? <Link to="/signup">Create an account</Link>
            {" · "}
            <Link to="/forgot-password">Forgot password?</Link>
          </p>
        </form>

        <aside className="cvPublicAuthPanel">
          <p>Churvox does the admin. You approve.</p>
          <h2>Built for service businesses that need less admin and faster decisions.</h2>
          <ul>
            <li>Jobs, clients, quotes and invoices in one place</li>
            <li>AI-prepared admin for owner approval</li>
            <li>14-day free trial, no card required</li>
          </ul>
        </aside>
      </section>
    </main>
  );
}
