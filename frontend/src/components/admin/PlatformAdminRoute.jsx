import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const PLATFORM_OWNER_EMAILS = new Set([
  "hello@churvox.com",
  "howardjennings77@gmail.com",
  "howardjennings777@gmail.com",
]);

function isPlatformOwnerUser(user = {}) {
  const userEmail = String(user?.email || "").trim().toLowerCase();
  const role = String(user?.role || user?.user_role || user?.account_type || "").trim().toLowerCase().replace(/[-\s]+/g, "_");
  return PLATFORM_OWNER_EMAILS.has(userEmail)
    || ["platform_owner", "platform_admin", "super_admin", "superadmin"].includes(role)
    || user?.is_platform_owner === true
    || user?.is_platform_admin === true
    || user?.is_super_admin === true;
}

export default function PlatformAdminRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-white">
        Loading admin access...
      </div>
    );
  }

  if (!isPlatformOwnerUser(user)) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children ? children : <Outlet />;
}
