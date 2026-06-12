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
      <Nav />

      <section className="cvPublicAuthShell">
        <form className="cvPublicAuthCard" onSubmit={handleSubmit}>
          <p className="cvPublicAuthKicker">Owner login</p>
          <h1>Sign in to Churvox.</h1>
          <p className="cvPublicAuthIntro">
            Get back to your jobs, admin and approvals.
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
          <p>Less admin. More jobs done.</p>
          <h2>Your jobs, admin and approvals in one place.</h2>
          <ul>
            <li>Keep jobs, clients, quotes and invoices together</li>
            <li>Review prepared admin before it goes out</li>
            <li>Stay in control of the business</li>
          </ul>
        </aside>
      </section>
    </main>
  );
}
