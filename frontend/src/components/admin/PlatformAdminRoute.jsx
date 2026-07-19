import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const HQ_DEPLOY_MARKER = "churvox-hq-owner-access-post-payment-20260719-v1";
const PLATFORM_OWNER_EMAILS = new Set([
  "hello@churvox.com",
  "howardjennings77@gmail.com",
  "howardjennings777@gmail.com",
]);

function emailOf(user = {}) {
  return String(user?.email || user?.user_email || user?.owner_email || "").trim().toLowerCase();
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

  // Keep HQ limited to the three verified Churvox owner identities. The
  // backend canonicalises these same accounts to the protected platform owner
  // before any HQ endpoint is allowed to read data.
  if (!PLATFORM_OWNER_EMAILS.has(emailOf(user))) {
    return <Navigate to="/login?next=%2Fadmin" replace state={{ from: location }} />;
  }

  return children ? children : <Outlet />;
}
