import React from "react";
import { Navigate } from "react-router-dom";

export default function PlatformAdminRoute({ children }) {
  let hasPlatformAccess = false;
  let user = null;

  try {
    hasPlatformAccess = localStorage.getItem("platform_owner_access") === "true";
  } catch (e) {
    hasPlatformAccess = false;
  }

  try {
    const rawUser =
      localStorage.getItem("user") ||
      sessionStorage.getItem("user");
    user = rawUser ? JSON.parse(rawUser) : null;
  } catch (e) {
    user = null;
  }

  const role = String(
    user?.role ||
    user?.user?.role ||
    ""
  ).toLowerCase();

  const isAllowed =
    hasPlatformAccess ||
    role === "admin" ||
    role === "super_admin" ||
    role === "superadmin";

  if (!isAllowed) {
    return <Navigate to="/platform-unlock" replace />;
  }

  return children;
}
