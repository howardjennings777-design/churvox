import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const PLATFORM_OWNER_EMAIL = "hello@churvox.com";

function isPlatformOwner(user) {
  const email = String(user?.email || "").trim().toLowerCase();
  return email === PLATFORM_OWNER_EMAIL;
}

export default function PlatformAdminRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-sm font-black shadow-2xl">
          Loading owner command…
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!isPlatformOwner(user)) return <Navigate to="/dashboard" replace />;

  return children;
}
