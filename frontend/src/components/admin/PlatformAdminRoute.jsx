import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const HQ_DEPLOY_MARKER = "churvox-hq-owner-access-post-payment-20260720-v2";
const PLATFORM_OWNER_EMAILS = new Set([
  "hello@churvox.com",
  "howardjennings77@gmail.com",
  "howardjennings777@gmail.com",
]);
const PLATFORM_OWNER_ROLES = new Set(["platform_owner", "platform-owner", "platformowner"]);

function emailOf(user = {}) {
  return String(user?.email || user?.user_email || user?.owner_email || "").trim().toLowerCase();
}

function roleOf(user = {}) {
  return String(user?.role || user?.user_role || user?.account_role || user?.type || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function hasPlatformOwnerAccess(user = {}) {
  return PLATFORM_OWNER_EMAILS.has(emailOf(user)) || PLATFORM_OWNER_ROLES.has(roleOf(user));
}

export default function PlatformAdminRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  React.useEffect(() => {
    if (typeof window !== "undefined") window.__CHURVOX_HQ_DEPLOY_MARKER__ = HQ_DEPLOY_MARKER;
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-white">
        Loading admin access...
      </div>
    );
  }

  // The backend canonicalises verified Churvox owner accounts to the
  // platform_owner role. Keep the known owner-email fallback for older sessions,
  // but never grant HQ access from a normal business-owner role alone.
  if (!hasPlatformOwnerAccess(user)) {
    return <Navigate to="/login?next=%2Fadmin" replace state={{ from: location }} />;
  }

  return children ? children : <Outlet />;
}
