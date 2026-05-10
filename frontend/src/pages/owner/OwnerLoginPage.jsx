import React, { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom"
import { Link } from "react-router-dom";

const OWNER_EMAIL = "hello@churvox.com";

function getBackendBase() {
  const fromEnv =
    (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_BACKEND_URL)
      ? import.meta.env.VITE_BACKEND_URL
      : "";
  return fromEnv ? fromEnv.replace(/\/$/, "") : "";
}

function getOwnerSession() {
  try {
    return JSON.parse(localStorage.getItem("owner_portal_session") || "null");
  } catch {
    return null;
  }
}

function setOwnerSession(data) {
  localStorage.setItem("owner_portal_session", JSON.stringify(data));
}

export default function OwnerLoginPage() {
  const navigate = useNavigate();
  const existing = getOwnerSession();
  const backendBase = useMemo(() => getBackendBase(), []);
  const [email, setEmail] = useState(OWNER_EMAIL);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (existing?.is_owner) {
    return <Navigate to="/owner/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const loginRes = await fetch(`${backendBase}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const loginData = await loginRes.json().catch(() => ({}));

      if (!loginRes.ok) {
        throw new Error(loginData.detail || "Login failed");
      }

      const meRes = await fetch(`${backendBase}/api/auth/me`, {
        method: "GET",
        credentials: "include",
      });

      const meData = await meRes.json().catch(() => ({}));

      if (!meRes.ok) {
        throw new Error("Could not verify owner account");
      }

      const meEmail = String(meData.email || "").toLowerCase();
      const isOwner =
        meEmail === OWNER_EMAIL ||
        meData.is_admin === true ||
        meData.is_owner === true ||
        meData.role === "admin" ||
        meData.role === "owner" ||
        meData.role === "platform_owner";

      if (!isOwner) {
        throw new Error("This account is not allowed into the owner dashboard");
      }

      setOwnerSession({
        is_owner: true,
        email: meEmail,
        user: meData,
        logged_in_at: new Date().toISOString(),
      });

      navigate("/owner/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Could not log in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <h1 className="text-3xl font-bold mb-2">Owner Login</h1>
        <p className="text-slate-600 mb-6">Use your owner account to open the platform dashboard.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-2 text-slate-600">Email</label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-2 text-slate-600">Password</label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold hover:bg-blue-500 disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Open Owner Dashboard"}
          </button>
        </form>

<div style= marginTop: "12px", textAlign: "center" >
  <a
    href="/owner"
    style=
      display: "inline-block",
      padding: "10px 14px",
      borderRadius: "12px",
      border: "1px solid #cbd5e1",
      background: "#fff",
      color: "#0f172a",
      textDecoration: "none",
      fontWeight: 600
    
  >
    Open Owner Page
  </a>
</div>

      </div>
    </div>
  );
}
