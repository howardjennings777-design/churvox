import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const PLATFORM_OWNER_EMAILS = new Set([
  "hello@churvox.com",
  "howardjennings77@gmail.com",
  "howardjennings77@outlook.com",
]);

function isPlatformOwner(user) {
  const email = String(user?.email || "").trim().toLowerCase();
  return Boolean(
    PLATFORM_OWNER_EMAILS.has(email) ||
    user?.is_platform_owner === true ||
    user?.is_admin === true ||
    user?.role === "platform_owner"
  );
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
