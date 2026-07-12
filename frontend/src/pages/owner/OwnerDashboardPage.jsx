import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PlatformOwnerDashboard from "../admin/PlatformOwnerDashboard";

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

export default function OwnerDashboardPage() {
  const navigate = useNavigate();
  const backendBase = useMemo(() => getBackendBase(), []);
  const [verified, setVerified] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function verifyOwner() {
      clearOwnerSession();
      try {
        const response = await fetch(`${backendBase}/api/auth/me`, {
          method: "GET",
          credentials: "include",
          headers: { "Cache-Control": "no-store" },
        });
        const user = await response.json().catch(() => ({}));
        const email = String(user?.email || "").trim().toLowerCase();
        if (response.ok && email === OWNER_EMAIL) {
          if (!cancelled) {
            setVerified(true);
            setChecking(false);
          }
          return;
        }
      } catch {}

      if (!cancelled) navigate("/owner/login", { replace: true });
    }

    verifyOwner();
    return () => { cancelled = true; };
  }, [backendBase, navigate]);

  const handleLogout = async () => {
    clearOwnerSession();
    try {
      await fetch(`${backendBase}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {}
    navigate("/owner/login", { replace: true });
  };

  if (checking || !verified) {
    return (
      <div className="min-h-screen bg-background text-slate-900 flex items-center justify-center px-4">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-lg">
          Verifying secure owner access…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-slate-900">
      <div className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">Owner Dashboard</h1>
            <p className="text-sm text-slate-600">Platform controls and live stats</p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/admin/usage"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Usage
            </Link>
            <button
              onClick={handleLogout}
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
            >
              Log out
            </button>
          </div>
        </div>
      </div>

      <PlatformOwnerDashboard />
    </div>
  );
}
