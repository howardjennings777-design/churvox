import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const PLATFORM_OWNER_EMAILS = [
  "hello@churvox.com",
  "howardjennings77@gmail.com",
  "howardjennings777@gmail.com",
];

function isPlatformOwnerUser(user = {}) {
  const userEmail = String(user?.email || "").trim().toLowerCase();
  const role = String(user?.role || user?.user_role || user?.account_type || user?.type || "").trim().toLowerCase().replace(/[-\s]+/g, "_");
  return Boolean(
    PLATFORM_OWNER_EMAILS.includes(userEmail) ||
      ["platform_owner", "platform_admin", "super_admin", "superadmin", "admin"].includes(role) ||
      user?.is_platform_owner === true ||
      user?.is_platform_admin === true ||
      user?.is_super_admin === true ||
      user?.is_admin === true
  );
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
