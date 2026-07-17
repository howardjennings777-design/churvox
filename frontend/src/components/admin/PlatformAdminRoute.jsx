import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const PLATFORM_OWNER_EMAILS = new Set([
  "hello@churvox.com",
  "howardjennings77@gmail.com",
  "howardjennings777@gmail.com",
]);
const PLATFORM_OWNER_ROLES = new Set([
  "platform_owner",
  "platform_admin",
  "super_admin",
  "superadmin",
]);

function normaliseRole(value) {
  return String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function isPlatformOwnerUser(user = {}) {
  const userEmail = String(user?.email || user?.user_email || user?.owner_email || "").trim().toLowerCase();
  const role = normaliseRole(user?.role || user?.user_role || user?.account_type);
  const ownerFlag = Boolean(
    user?.is_platform_owner
    || user?.is_platform_admin
    || user?.is_super_admin
    || user?.is_admin,
  );
  return PLATFORM_OWNER_EMAILS.has(userEmail) || PLATFORM_OWNER_ROLES.has(role) || ownerFlag;
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
