import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const OWNER_EMAIL = "hello@churvox.com";

function getBackendBase() {
  const fromEnv = typeof import.meta !== "undefined"
    ? String(import.meta.env?.VITE_BACKEND_URL || "")
    : "";
  return fromEnv.replace(/\/$/, "");
}

function clearOwnerSession() {
  try {
    localStorage.removeItem("owner_portal_session");
  } catch {}
}

function setOwnerSession(user) {
  try {
    localStorage.setItem("owner_portal_session", JSON.stringify({
      email: OWNER_EMAIL,
      verified_at: new Date().toISOString(),
      user,
    }));
  } catch {}
}

function exactOwner(user) {
  return String(user?.email || "").trim().toLowerCase() === OWNER_EMAIL;
}

export default function OwnerLoginPage() {
  const navigate = useNavigate();
  const backendBase = useMemo(() => getBackendBase(), []);
  const [email, setEmail] = useState(OWNER_EMAIL);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function verifyExistingSession() {
      clearOwnerSession();
      try {
        const response = await fetch(`${backendBase}/api/auth/me`, {
          method: "GET",
          credentials: "include",
          headers: { "Cache-Control": "no-store" },
        });
        const user = await response.json().catch(() => ({}));
        if (!cancelled && response.ok && exactOwner(user)) {
          setOwnerSession(user);
          navigate("/owner/dashboard", { replace: true });
          return;
        }
      } catch {}

      if (!cancelled) setCheckingSession(false);
    }

    verifyExistingSession();
    return () => { cancelled = true; };
  }, [backendBase, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    clearOwnerSession();

    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail !== OWNER_EMAIL) {
      setError("This login is restricted to the Churvox platform owner account.");
      setLoading(false);
      return;
    }

    try {
      const loginRes = await fetch(`${backendBase}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: normalizedEmail, password }),
      });
      const loginData = await loginRes.json().catch(() => ({}));
      if (!loginRes.ok) throw new Error(loginData.detail || "Login failed");

      const meRes = await fetch(`${backendBase}/api/auth/me`, {
        method: "GET",
        credentials: "include",
        headers: { "Cache-Control": "no-store" },
      });
      const meData = await meRes.json().catch(() => ({}));
      if (!meRes.ok || !exactOwner(meData)) {
        await fetch(`${backendBase}/api/auth/logout`, {
          method: "POST",
          credentials: "include",
        }).catch(() => {});
        throw new Error("Could not verify the Churvox platform owner account");
      }

      setOwnerSession(meData);
      navigate("/owner/dashboard", { replace: true });
    } catch (err) {
      clearOwnerSession();
      setError(err?.message || "Could not log in");
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-background text-slate-900 flex items-center justify-center px-4">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-lg">
          Verifying secure owner session…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <h1 className="text-3xl font-bold mb-2">Owner Login</h1>
        <p className="text-slate-600 mb-6">Use the Churvox platform owner account.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-2 text-slate-600">Email</label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
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
              onChange={(event) => setPassword(event.target.value)}
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
            className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Open Owner Dashboard"}
          </button>
        </form>
      </div>
    </div>
  );
}
