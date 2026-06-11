import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const PLATFORM_OWNER_EMAILS = [
  "hello@churvox.com",
  "howardjennings77@gmail.com",
];

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

  const userEmail = (user?.email || "").toLowerCase();
  const role = String(user?.role || "").toLowerCase();

  const isAllowed =
    PLATFORM_OWNER_EMAILS.includes(userEmail) ||
    role === "platform_owner" ||
    user?.is_platform_owner === true;

  if (!isAllowed) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children ? children : <Outlet />;
}
