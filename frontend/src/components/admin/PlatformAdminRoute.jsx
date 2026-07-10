import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const PLATFORM_OWNER_EMAIL = "howardjennings77@gmail.com";

function isPlatformOwnerUser(user = {}) {
  const userEmail = String(user?.email || "").trim().toLowerCase();
  return userEmail === PLATFORM_OWNER_EMAIL;
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
